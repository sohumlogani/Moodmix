// Mood-Map signal agents — pure core (no server-fn wrapper) so it runs both inside
// the app (via signals.ts) AND as a standalone scheduled job (scripts/run-agents.ts).
// Each collector hits a real API when its key is set, else returns clearly-labelled
// sample data. Real reviews carry a `link` so every one is cross-referenceable.
export type Sentiment = "pos" | "neg" | "neu";

export interface RedditItem { sub: string; title: string; up: number; sentiment: Sentiment; url?: string }
export interface ReviewItem { author: string; rating: number; text: string; city?: string; verdict: "real" | "junk"; issue?: string; link?: string }
export interface TrendItem { query: string; change: number; city?: string }
export interface DiscordItem { server: string; text: string; sentiment: Sentiment }
export interface YouTubeItem { title: string; channel: string; views: string; url?: string }

export interface MoodAgentResult {
  summary: string;
  reddit: RedditItem[];
  reviews: ReviewItem[];
  trends: TrendItem[];
  discord: DiscordItem[];
  youtube: YouTubeItem[];
  live: { reddit: boolean; reviews: boolean; trends: boolean; discord: boolean; youtube: boolean; claude: boolean };
  refreshedAt: string;
}

const UA = "PulseBoard/1.0 (MadMix demand intelligence)";
const QUERIES = ["millet snacks", "jowar bhujia", "healthy snacks india", "madmix"];

export async function runAgents(): Promise<MoodAgentResult> {
  const [reddit, reviews, trends, discord, youtube] = await Promise.all([
    collectReddit(), collectReviews(), collectTrends(), collectDiscord(), collectYouTube(),
  ]);

  const live = {
    reddit: reddit.live, reviews: reviews.live, trends: trends.live,
    discord: discord.live, youtube: youtube.live, claude: false,
  };

  const liveSources = (["reddit", "reviews", "trends", "discord", "youtube"] as const).filter((s) => live[s]);
  let summary = liveSources.length
    ? `Listening live across ${liveSources.join(", ")}.`
    : "Showing sample customer-voice signals — add keys (Reddit, SerpAPI, YouTube, Discord) to go live with real data.";

  let reviewItems = reviews.items;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const hasData = reddit.items.length || reviews.items.length || trends.items.length;
  if (apiKey && hasData) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });
      const prompt = [
        "You are MadMix's customer-voice analyst (Indian millet snacks).",
        "Signals collected:",
        "REDDIT: " + reddit.items.map((r) => `[${r.sub}] ${r.title} (↑${r.up})`).join(" | "),
        "REVIEWS: " + reviews.items.map((r, i) => `#${i} ${r.rating}★ "${r.text}"`).join(" | "),
        "TRENDS: " + trends.items.map((t) => `${t.query} ${t.change >= 0 ? "+" : ""}${t.change}%`).join(" | "),
        "",
        "Return ONLY JSON: {\"summary\":\"one crisp sentence on what customers are enjoying / complaining about\",",
        "\"reviews\":[{\"i\":0,\"verdict\":\"real|junk\",\"issue\":\"short real problem, or why it's junk/extortion\"}]}",
        "A review is 'junk' if it's spam, extortion (e.g. demanding free product to remove it), or contentless. Keep genuine complaints as 'real'.",
      ].join("\n");
      const resp: any = await (client.messages.create as any)({
        model: "claude-opus-4-8", max_tokens: 1200, thinking: { type: "adaptive" },
        messages: [{ role: "user", content: prompt }],
      });
      const text = (resp.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      const parsed = extractJson(text);
      if (parsed?.summary) summary = String(parsed.summary);
      if (Array.isArray(parsed?.reviews)) {
        reviewItems = reviews.items.map((r, i) => {
          const f = parsed.reviews.find((x: any) => x.i === i);
          return f ? { ...r, verdict: f.verdict === "junk" ? "junk" : "real", issue: String(f.issue ?? r.issue ?? "") } : r;
        });
      }
      live.claude = true;
    } catch (err) {
      console.error("Mood agent Claude pass failed:", err);
    }
  }

  return {
    summary, reddit: reddit.items, reviews: reviewItems, trends: trends.items,
    discord: discord.items, youtube: youtube.items, live, refreshedAt: new Date().toISOString(),
  };
}

// ── Reddit (free OAuth client-credentials) ───────────────────
async function collectReddit(): Promise<{ items: RedditItem[]; live: boolean }> {
  const id = process.env.REDDIT_CLIENT_ID, secret = process.env.REDDIT_CLIENT_SECRET;
  if (id && secret) {
    try {
      const tok = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(`${id}:${secret}`), "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body: "grant_type=client_credentials",
      }).then((r) => r.json());
      const token = tok.access_token;
      const items: RedditItem[] = [];
      for (const q of QUERIES.slice(0, 3)) {
        const res = await fetch(`https://oauth.reddit.com/search?q=${encodeURIComponent(q)}&sort=new&limit=4`, {
          headers: { Authorization: `bearer ${token}`, "User-Agent": UA },
        }).then((r) => r.json());
        for (const c of res?.data?.children ?? []) {
          items.push({ sub: "r/" + c.data.subreddit, title: c.data.title, up: c.data.ups ?? 0, sentiment: "neu", url: "https://reddit.com" + c.data.permalink });
        }
      }
      if (items.length) return { items: items.slice(0, 6), live: true };
    } catch (err) { console.error("Reddit collector failed:", err); }
  }
  return { items: SAMPLE_REDDIT, live: false };
}

// ── Google Reviews — real reviews carry a `link` to verify on Google ──
async function collectReviews(): Promise<{ items: ReviewItem[]; live: boolean }> {
  const serp = process.env.SERPAPI_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;

  // Preferred: SerpAPI google_maps_reviews — many reviews, each with a real link.
  if (serp && placeId) {
    try {
      const items: ReviewItem[] = [];
      let pageToken: string | undefined;
      for (let page = 0; page < 3; page++) {
        const url = `https://serpapi.com/search.json?engine=google_maps_reviews&place_id=${placeId}&api_key=${serp}` + (pageToken ? `&next_page_token=${pageToken}` : "");
        const res = await fetch(url).then((r) => r.json());
        for (const r of res?.reviews ?? []) {
          items.push({
            author: r.user?.name ?? "Customer", rating: r.rating ?? 0,
            text: r.snippet ?? r.extracted_snippet?.original ?? "", verdict: "real",
            link: r.link ?? r.user?.link, // permalink to the actual Google review
          });
        }
        pageToken = res?.serpapi_pagination?.next_page_token;
        if (!pageToken) break;
      }
      if (items.length) return { items, live: true };
    } catch (err) { console.error("SerpAPI reviews failed:", err); }
  }

  // Fallback API: Places Details (max 5; uses author profile link).
  if (placesKey && placeId) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${placesKey}`).then((r) => r.json());
      const items: ReviewItem[] = (res?.result?.reviews ?? []).map((r: any) => ({
        author: r.author_name ?? "Customer", rating: r.rating ?? 0, text: r.text ?? "", verdict: "real" as const, link: r.author_url,
      }));
      if (items.length) return { items, live: true };
    } catch (err) { console.error("Places reviews failed:", err); }
  }

  // No real source connected → show sample reviews (clearly labelled in the UI).
  return { items: SAMPLE_REVIEWS, live: false };
}

// Sample review set (used only for the Reviews panel when no real source is wired).
const SAMPLE_REVIEWS: ReviewItem[] = [
  { author: "Aarav S.", rating: 2, text: "Packet arrived stale via Instamart in Bangalore. Taste was off.", city: "Bangalore", verdict: "real", issue: "Freshness on quick-commerce delivery" },
  { author: "anon_482", rating: 1, text: "Give me 5 free packets or this 1-star stays up.", verdict: "junk", issue: "Extortion — flag & report, don't act on it" },
  { author: "Priya M.", rating: 5, text: "Chaat Corner puffs are addictive and guilt-free. Repeat buyer!", city: "Gurgaon", verdict: "real", issue: "Positive — hero SKU" },
  { author: "Rahul K.", rating: 2, text: "Way spicier than described. Not for kids.", city: "Pune", verdict: "real", issue: "Spice level vs labelling" },
  { author: "Neha T.", rating: 3, text: "Good snack but ₹ on Instamart is steep vs MRP.", city: "Mumbai", verdict: "real", issue: "Price perception on Instamart" },
  { author: "Karthik R.", rating: 4, text: "Love the millet base, finally a chips alternative I don't feel bad about.", city: "Bangalore", verdict: "real", issue: "Positive — health positioning" },
  { author: "deals_guru99", rating: 1, text: "FIRST!! follow my page for snack coupons 🔥🔥", verdict: "junk", issue: "Spam — no product feedback" },
  { author: "Sneha P.", rating: 2, text: "Pack was half air, felt like less product for the price.", city: "Hyderabad", verdict: "real", issue: "Fill / pack-size perception" },
  { author: "Imran Q.", rating: 5, text: "BBQ Blast bhujia is unreal, ordered 4 packs already.", city: "Mumbai", verdict: "real", issue: "Positive — BBQ SKU demand" },
  { author: "Divya N.", rating: 3, text: "Tasty but the packet tore easily, bits everywhere.", city: "Chennai", verdict: "real", issue: "Packaging durability" },
  { author: "anon_7781", rating: 1, text: "remove this review and I'll change to 5 star, dm me", verdict: "junk", issue: "Extortion — report to Google" },
  { author: "Vikram S.", rating: 4, text: "Mango raisins are a great office snack. Wish they were on Blinkit too.", city: "Gurgaon", verdict: "real", issue: "Demand for Blinkit availability" },
  { author: "Ananya G.", rating: 2, text: "Delivered melted/soft in the Pune heat. Storage issue?", city: "Pune", verdict: "real", issue: "Heat / storage in transit" },
  { author: "Mohit B.", rating: 5, text: "Cream Onion puffs > every other brand. Don't change the recipe.", city: "Noida", verdict: "real", issue: "Positive — Cream Onion loyalty" },
  { author: "Riya K.", rating: 3, text: "Decent but often out of stock on Instamart near me.", city: "Bangalore", verdict: "real", issue: "Stock-outs on Instamart" },
  { author: "Farhan A.", rating: 4, text: "Good macros, kids love it, just make a less spicy variant.", city: "Hyderabad", verdict: "real", issue: "Request: milder variant" },
];

const SAMPLE_REDDIT: RedditItem[] = [
  { sub: "r/bangalore", title: "Tried MadMix millet puffs — actually solid for a 'healthy' snack", up: 128, sentiment: "pos" },
  { sub: "r/india", title: "Best jowar/millet snacks you've found? Trying to cut junk", up: 342, sentiment: "neu" },
  { sub: "r/pune", title: "Late-night healthy snack runs — what are you ordering?", up: 76, sentiment: "neu" },
  { sub: "r/IndianFood", title: "Switched from fried to baked bhujia, anyone else?", up: 54, sentiment: "pos" },
  { sub: "r/hyderabad", title: "Spicy snack recs that aren't deep-fried?", up: 91, sentiment: "neu" },
];

const SAMPLE_TRENDS: TrendItem[] = [
  { query: "millet snacks", change: 34, city: "Bangalore" },
  { query: "healthy bhujia", change: 22, city: "Hyderabad" },
  { query: "baked snacks", change: 18, city: "Jaipur" },
  { query: "jowar puffs", change: 12 },
];

const SAMPLE_DISCORD: DiscordItem[] = [
  { server: "Fitness India", text: "anyone tried madmix? macros actually look decent for chips", sentiment: "pos" },
  { server: "Bangalore Foodies", text: "millet snack haul — the cream onion one is 🔥", sentiment: "pos" },
  { server: "College Canteen", text: "they stocked madmix puffs in the hostel store now", sentiment: "neu" },
];

const SAMPLE_YOUTUBE: YouTubeItem[] = [
  { title: "I tried every Indian 'healthy' snack so you don't have to", channel: "SnackLab", views: "212k", url: "https://youtube.com" },
  { title: "Millet snacks review — worth the hype?", channel: "FitFoodie", views: "48k", url: "https://youtube.com" },
];

// ── Google Trends (via SerpAPI) ──────────────────────────────
async function collectTrends(): Promise<{ items: TrendItem[]; live: boolean }> {
  const key = process.env.SERPAPI_KEY;
  if (key) {
    try {
      const items: TrendItem[] = [];
      for (const q of QUERIES.slice(0, 4)) {
        const res = await fetch(`https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(q)}&data_type=TIMESERIES&geo=IN&api_key=${key}`).then((r) => r.json());
        const tl = res?.interest_over_time?.timeline_data ?? [];
        if (tl.length >= 2) {
          const last = tl[tl.length - 1]?.values?.[0]?.extracted_value ?? 0;
          const prev = tl[Math.max(0, tl.length - 5)]?.values?.[0]?.extracted_value ?? last;
          items.push({ query: q, change: prev ? Math.round(((last - prev) / prev) * 100) : 0 });
        }
      }
      if (items.length) return { items, live: true };
    } catch (err) { console.error("Trends collector failed:", err); }
  }
  return { items: SAMPLE_TRENDS, live: false };
}

// ── Discord (bot reads a channel) ────────────────────────────
async function collectDiscord(): Promise<{ items: DiscordItem[]; live: boolean }> {
  const token = process.env.DISCORD_BOT_TOKEN, channel = process.env.DISCORD_CHANNEL_ID;
  if (token && channel) {
    try {
      const res = await fetch(`https://discord.com/api/v10/channels/${channel}/messages?limit=8`, {
        headers: { Authorization: `Bot ${token}` },
      }).then((r) => r.json());
      const items: DiscordItem[] = (Array.isArray(res) ? res : [])
        .filter((m: any) => m.content)
        .map((m: any) => ({ server: "#" + (m.channel_id ?? "channel"), text: m.content, sentiment: "neu" as const }));
      if (items.length) return { items: items.slice(0, 5), live: true };
    } catch (err) { console.error("Discord collector failed:", err); }
  }
  return { items: SAMPLE_DISCORD, live: false };
}

// ── YouTube (Data API) ───────────────────────────────────────
async function collectYouTube(): Promise<{ items: YouTubeItem[]; live: boolean }> {
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=4&q=${encodeURIComponent("millet snacks india review")}&key=${key}`).then((r) => r.json());
      const items: YouTubeItem[] = (res?.items ?? []).map((v: any) => ({
        title: v.snippet?.title ?? "", channel: v.snippet?.channelTitle ?? "", views: "—", url: `https://youtube.com/watch?v=${v.id?.videoId}`,
      }));
      if (items.length) return { items, live: true };
    } catch (err) { console.error("YouTube collector failed:", err); }
  }
  return { items: SAMPLE_YOUTUBE, live: false };
}

function extractJson(text: string): any | null {
  try { return JSON.parse(text); } catch {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a === -1 || b === -1) return null;
    try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
  }
}
