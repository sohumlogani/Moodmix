import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Search, MessageCircle, CalendarDays, Sparkles, Radio, MapPin, Star,
  TrendingUp, Hash, Youtube, Flag, ExternalLink, Filter, ShieldCheck, Lock, Megaphone, Copy, Check, Trophy,
} from "lucide-react";
import { Card, PageHeader, cn } from "@/components/pulse/ui";
import { usePulse } from "@/components/pulse/PulseDataProvider";
import { runMoodAgents, type MoodAgentResult } from "@/lib/signals";
import { refreshMoodMap } from "@/lib/moodmap";
import { supabase } from "@/lib/supabase";
import { competitors } from "@/data/mockData";
import type { MoodOpportunity, DemandGap } from "@/lib/types";

export const Route = createFileRoute("/_app/mood-map")({
  head: () => ({ meta: [{ title: "Mood Board — MoodMix" }] }),
  component: MoodMapPage,
});

const EVENT_TYPES = ["Concert", "College fest", "Food festival", "Sports", "Cultural"] as const;
function eventType(name: string): string {
  const n = name.toLowerCase();
  if (/(fest|college|campus)/.test(n)) return "College fest";
  if (/(concert|arena|music|sunburn|gig)/.test(n)) return "Concert";
  if (/(food|millet|culinary|street)/.test(n)) return "Food festival";
  if (/(ipl|match|marathon|sport|watch|cricket)/.test(n)) return "Sports";
  return "Cultural";
}

function MoodMapPage() {
  const { moodOpportunities, demandGaps, seasonCalendar, cityBuzz, skus, skuMetrics, cities } = usePulse();

  const [tab, setTab] = useState<"opportunities" | "sentiment">("opportunities");
  const [agent, setAgent] = useState<MoodAgentResult | null>(null);
  const [opps, setOpps] = useState<MoodOpportunity[]>(moodOpportunities);
  const [gaps, setGaps] = useState<DemandGap[]>(demandGaps);
  const [loading, setLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState("all");
  const [prefs, setPrefs] = useState<string[]>([]);
  const ran = useRef(false);

  const runAll = async () => {
    setLoading(true);
    try {
      const [a, m] = await Promise.all([runMoodAgents(), refreshMoodMap()]);
      setAgent(a);
      setOpps(m.opportunities);
      setGaps(m.demandGaps);
      // Persist the snapshot so it's shared across devices / matches the scheduled job.
      if (supabase) {
        await supabase.from("mood_signals").upsert({ id: 1, data: a, refreshed_at: new Date().toISOString() });
      }
    } catch (err) {
      console.error("Mood agents failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      // Prefer the latest scheduled snapshot if one exists (instant, no re-run).
      if (supabase) {
        const { data } = await supabase.from("mood_signals").select("data").eq("id", 1).maybeSingle();
        if (data?.data) {
          setAgent(data.data as MoodAgentResult);
          refreshMoodMap().then((m) => { setOpps(m.opportunities); setGaps(m.demandGaps); }).catch(() => {});
          return;
        }
      }
      runAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cityOptions = useMemo(() => ["all", ...Array.from(new Set(opps.map((o) => o.city)))], [opps]);
  const filteredOpps = opps.filter(
    (o) => (cityFilter === "all" || o.city === cityFilter) && (prefs.length === 0 || prefs.includes(eventType(o.event))),
  );
  const togglePref = (t: string) => setPrefs((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  // Marketing keywords + Instagram caption ideas — derived from live data, so they
  // refresh every time new data comes in.
  const marketing = useMemo(
    () => buildMarketing(skus, skuMetrics, cities, opps, agent?.trends ?? []),
    [skus, skuMetrics, cities, opps, agent],
  );

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader
        title="Mood Board"
        subtitle="Customer voice → marketing ideas. Reddit · Reviews · Trends · Discord · YouTube."
        right={
          <button onClick={runAll} disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {loading ? "Running agents…" : "Run signal agents"}
          </button>
        }
      />

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-border bg-surface p-1 text-sm">
        {([["opportunities", "Opportunities"], ["sentiment", "Customer Sentiment"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("rounded-md px-4 py-1.5 transition-colors", tab === k ? "bg-accent text-primary-foreground" : "text-text-dim hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {agent && (
        <Card className="p-4 flex items-start gap-3 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
          <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">What customers are saying</div>
            <p className="text-sm mt-0.5 leading-relaxed">{agent.summary}</p>
          </div>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {tab === "opportunities" ? (
          <motion.div key="opps" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <MarketingStudio data={marketing} />
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
                <Filter className="h-3.5 w-3.5 text-text-dim" />
                <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="bg-transparent outline-none">
                  {cityOptions.map((c) => <option key={c} value={c} className="bg-surface">{c === "all" ? "All cities" : c}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-text-dim self-center mr-1">Gaurav's events:</span>
                {EVENT_TYPES.map((t) => (
                  <button key={t} onClick={() => togglePref(t)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors", prefs.includes(t) ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-text-dim hover:text-foreground")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
              <div className="space-y-3">
                <h3 className="font-display text-base font-semibold text-text-dim">
                  City × Event Opportunities {cityFilter !== "all" && `· ${cityFilter}`}
                </h3>
                {filteredOpps.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredOpps.map((o, i) => <OpportunityCard key={o.id} o={o} delay={i * 0.04} />)}
                  </div>
                ) : (
                  <Card className="p-6 text-sm text-text-dim text-center">No opportunities match these filters.</Card>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-base font-semibold text-text-dim flex items-center gap-2"><MapPin className="h-4 w-4" />Live Buzz Map</h3>
                <Card className="p-4"><IndiaMap cityBuzz={cityBuzz} /></Card>
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-text-dim mb-3 flex items-center gap-2"><Search className="h-4 w-4" />Search Demand Gaps</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {gaps.map((g, i) => (
                  <motion.div key={`${g.city}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <Card className="p-4 border-l-2 border-l-accent">
                      <div className="text-xs uppercase tracking-wider text-accent">{g.city}</div>
                      <p className="mt-1.5 text-sm leading-relaxed">{g.insight}</p>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-text-dim mb-3 flex items-center gap-2"><CalendarDays className="h-4 w-4" />Season Calendar</h3>
              <Card className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
                  {seasonCalendar.map((s) => (
                    <div key={s.season} className="p-4">
                      <div className="text-xs uppercase tracking-wider text-accent">{s.season}</div>
                      <div className="mt-1 mono text-xs text-text-dim">{s.window}</div>
                      <div className="mt-3 font-medium text-sm">{s.sku}</div>
                      <div className="mt-1 text-xs text-text-dim">{s.cities.join(" · ")}</div>
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                        <Radio className="h-3 w-3" />{s.leadTime}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SentimentView agent={agent} loading={loading} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Marketing Studio ─────────────────────────
interface Marketing {
  keywords: string[];
  contentKeywords: string[];
  ideas: { title: string; caption: string }[];
  tips: string[];
}

function buildMarketing(skus: any[], skuMetrics: any, cities: any[], opps: any[], trends: { query: string }[]): Marketing {
  const tag = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, "");
  const topSkus = skus.map((s) => ({ ...s, m: skuMetrics[s.id] })).filter((x) => x.m).sort((a, b) => b.m.revenue - a.m.revenue).slice(0, 3);
  const topCity = [...cities].sort((a, b) => b.opportunity - a.opportunity)[0];
  const topOpp = [...opps].sort((a, b) => b.score - a.score)[0];

  const keywords = Array.from(new Set([
    "milletsnacks", "healthysnacking", "guiltfreesnacks", "bakednotfried", "snacksmart",
    ...topSkus.map((s) => tag(s.short)),
    ...(topCity ? [tag(topCity.name) + "eats"] : []),
    ...trends.map((t) => tag(t.query)),
  ].filter(Boolean))).slice(0, 12);

  // Longer-tail content / SEO keywords to target in reels captions, blogs & ad copy.
  const contentKeywords = Array.from(new Set([
    "millet snacks for weight loss", "baked vs fried snacks", "high protein indian snacks",
    "healthy office snacks india", "gluten free snacks online", "jowar snacks benefits",
    "guilt free evening snacks", "diet friendly namkeen",
    ...trends.map((t) => t.query),
  ])).slice(0, 8);

  const ideas: Marketing["ideas"] = [];
  if (topOpp) ideas.push({ title: `Ride ${topOpp.event}`, caption: `${topOpp.city} is buzzing for ${topOpp.event} 🎉 Make ${topOpp.sku} the official snack — millet, baked, made for the crowd. #${tag(topOpp.city)} #milletsnacks` });
  if (topSkus[0]) ideas.push({ title: `Hero spotlight: ${topSkus[0].short}`, caption: `Your guilt-free obsession is back 😍 ${topSkus[0].short} — ${String(topSkus[0].category).toLowerCase()} that loves you back. 60% less fat, 100% flavour. #bakednotfried #healthysnacking` });
  if (topCity) ideas.push({ title: `Geo push: ${topCity.name}`, caption: `${topCity.name}, we see you snacking 👀 Stock up on MadMix before your next order runs out. #${tag(topCity.name)} #snacksmart` });

  // Out-of-the-box, practical plays tied to the top opportunity.
  const e = topOpp?.event ?? "the next big event";
  const c = topOpp?.city ?? topCity?.name ?? "your top city";
  const sku = topOpp?.sku ?? topSkus[0]?.short ?? "your hero SKU";
  const tips = [
    `Exit-gate sampling at ${e}: hand out mini ${sku} packs as people leave — post-event hunger is peak conversion, and each sample carries a 20%-off Instamart QR.`,
    `Geo-fenced Reels ads in a 2 km radius around ${c} venues during ${e}, CTA "order in 10 mins on Instamart" — spend follows the crowd, not the calendar.`,
    `Micro-influencer seeding: ship ${sku} to 20 ${c} food/fitness creators 7-10 days before ${e}; ask for one "what I'm snacking at ${e}" Reel each.`,
    `Limited "${c} ${e} edition" packaging (only for that city/window): scarcity drives UGC and a reason for press + reposts.`,
    `Bundle a "party pack of 3" on quick-commerce timed to the ${e} weekend, and co-merchandise next to cold drinks in the dark-store planogram.`,
    `QR-on-pack "rate this flavour" wheel → free next pack: harvests first-party data and real reviews you actually own.`,
  ];

  return { keywords, contentKeywords, ideas, tips };
}

function MarketingStudio({ data }: { data: Marketing }) {
  return (
    <Card className="p-5 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="rounded-md border border-accent/40 bg-accent/10 p-2"><Megaphone className="h-4 w-4 text-accent" /></div>
        <div>
          <h3 className="font-display text-base font-semibold">Marketing Studio · Instagram</h3>
          <p className="text-xs text-text-dim mt-0.5">AI ad keywords &amp; caption ideas from your live data — updates every refresh.</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-text-dim flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />Ad keywords</span>
          <CopyButton text={data.keywords.map((k) => "#" + k).join(" ")} label="Copy all" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.keywords.map((k) => (
            <span key={k} className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs text-accent">#{k}</span>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-text-dim flex items-center gap-1.5"><Search className="h-3.5 w-3.5" />Content / SEO keywords</span>
          <CopyButton text={data.contentKeywords.join(", ")} label="Copy all" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.contentKeywords.map((k) => (
            <span key={k} className="rounded-full border border-border bg-surface-2/60 px-2.5 py-1 text-xs text-text-dim">{k}</span>
          ))}
        </div>
      </div>

      <div className="text-xs uppercase tracking-wider text-text-dim mb-2">Caption ideas</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {data.ideas.map((idea, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface-2/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{idea.title}</span>
              <CopyButton text={idea.caption} />
            </div>
            <p className="mt-1.5 text-xs text-text-dim leading-relaxed">{idea.caption}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="text-xs uppercase tracking-wider text-accent mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Out-of-the-box plays</div>
        <div className="space-y-1.5">
          {data.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-surface-2/30 p-2.5 text-xs leading-relaxed">
              <span className="mono text-accent shrink-0">{i + 1}.</span>
              <span>{tip}</span>
              <CopyButton text={tip} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* no-op */ }
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] text-text-dim transition-colors hover:text-foreground">
      {done ? <Check className="h-3 w-3 text-good" /> : <Copy className="h-3 w-3" />}{label ?? (done ? "Copied" : "Copy")}
    </button>
  );
}

// ───────────────────────── Competitor Watch ─────────────────────────
function CompetitorWatch() {
  return (
    <Card className="lg:col-span-2 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-base font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-accent" />Competitor Watch</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-text-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-text-dim" />Sample
        </span>
      </div>
      <p className="text-xs text-text-dim mb-3">How MadMix's rivals are being reviewed — a live agent can pull real Google &amp; Amazon reviews per brand.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {competitors.map((c) => (
          <div key={c.brand} className="rounded-lg border border-border bg-surface-2/40 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{c.brand}</span>
              <span className="inline-flex items-center gap-1 text-xs mono"><Star className="h-3 w-3 fill-accent text-accent" />{c.rating}</span>
            </div>
            <div className="text-[11px] text-text-dim mono mt-0.5">{c.reviews.toLocaleString("en-IN")} reviews · {c.sentiment}% positive</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-good" style={{ width: `${c.sentiment}%` }} />
            </div>
            <p className="mt-2 text-xs leading-relaxed"><span className="text-good font-semibold">＋ </span>{c.positive}</p>
            <p className="mt-1 text-xs leading-relaxed"><span className="text-bad font-semibold">－ </span>{c.negative}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ───────────────────────── Sentiment ─────────────────────────
function SentimentView({ agent, loading }: { agent: MoodAgentResult | null; loading: boolean }) {
  if (!agent) {
    return (
      <Card className="p-8 flex items-center gap-3 text-sm text-text-dim">
        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Gathering customer voice across platforms…
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <CompetitorWatch />

      {/* Google Reviews — primary focus, spans both columns */}
      <SourceCard className="lg:col-span-2" icon={Star} title="Google Reviews" accent
        live={agent.live.reviews} empty={agent.reviews.length === 0}
        keyHint="SERPAPI_KEY + GOOGLE_PLACE_ID" note="real Google reviews, each with a verify link">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agent.reviews.map((r, i) => (
            <div key={i} className={cn("rounded-lg border p-3", r.verdict === "junk" ? "border-bad/30 bg-bad/5" : "border-border bg-surface-2/40")}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium">{r.author}{r.city && <span className="text-text-dim text-xs">· {r.city}</span>}</span>
                <Stars n={r.rating} />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-text-dim">"{r.text}"</p>
              {r.verdict === "junk" ? (
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-bad"><ShieldCheck className="h-3.5 w-3.5" />Junk / extortion — kept out of insights</span>
                  <a href={r.link ?? "https://business.google.com/reviews"} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-bad/40 bg-bad/10 px-2 py-0.5 text-[11px] text-bad hover:bg-bad/20">
                    <Flag className="h-3 w-3" />Report to Google
                  </a>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  {r.issue ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">{r.issue}</span>
                  ) : <span />}
                  {r.link && (
                    <a href={r.link} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] text-text-dim hover:text-foreground">
                      <ExternalLink className="h-3 w-3" />Verify on Google
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-text-dim">
          {!agent.live.reviews && <span className="text-accent">Sample reviews shown · add SERPAPI_KEY + GOOGLE_PLACE_ID for real, verifiable ones. </span>}
          Useful negative reviews are kept; only spam/extortion is flagged for reporting (Google removal is owner-initiated — never automatic).
        </p>
      </SourceCard>

      <SourceCard icon={MessageCircle} title="Reddit" live={agent.live.reddit}
        empty={agent.reddit.length === 0} keyHint="REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET" note="live Reddit posts">
        <div className="space-y-2">
          {agent.reddit.map((r, i) => (
            <a key={i} href={r.url ?? "#"} target="_blank" rel="noreferrer"
              className="block rounded-lg border border-border bg-surface-2/40 p-2.5 hover:bg-surface-2/70 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-text-dim">
                <span className="text-accent">{r.sub}</span>
                <span className="mono">↑ {r.up}</span>
              </div>
              <p className="mt-1 text-xs leading-snug">{r.title}</p>
            </a>
          ))}
        </div>
      </SourceCard>

      <SourceCard icon={TrendingUp} title="Google Trends" live={agent.live.trends}
        empty={agent.trends.length === 0} keyHint="SERPAPI_KEY" note="live search-trend data">
        <div className="space-y-2">
          {agent.trends.map((t, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-surface-2/40 p-2.5">
              <span className="text-xs">{t.query}{t.city && <span className="text-text-dim"> · {t.city}</span>}</span>
              <span className={cn("mono text-xs font-semibold", t.change >= 0 ? "text-good" : "text-bad")}>{t.change >= 0 ? "+" : ""}{t.change}%</span>
            </div>
          ))}
        </div>
      </SourceCard>

      <SourceCard icon={Hash} title="Discord" live={agent.live.discord}
        empty={agent.discord.length === 0} keyHint="DISCORD_BOT_TOKEN + DISCORD_CHANNEL_ID" note="live Discord chatter">
        <div className="space-y-2">
          {agent.discord.map((d, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface-2/40 p-2.5">
              <div className="text-[11px] text-accent">{d.server}</div>
              <p className="mt-0.5 text-xs leading-snug">{d.text}</p>
            </div>
          ))}
        </div>
      </SourceCard>

      <SourceCard icon={Youtube} title="YouTube" live={agent.live.youtube}
        empty={agent.youtube.length === 0} keyHint="YOUTUBE_API_KEY" note="live YouTube buzz">
        <div className="space-y-2">
          {agent.youtube.map((v, i) => (
            <a key={i} href={v.url ?? "#"} target="_blank" rel="noreferrer"
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2/40 p-2.5 hover:bg-surface-2/70 transition-colors">
              <span className="min-w-0">
                <p className="text-xs leading-snug truncate">{v.title}</p>
                <span className="text-[11px] text-text-dim">{v.channel} · {v.views} views</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-text-dim shrink-0" />
            </a>
          ))}
        </div>
      </SourceCard>
    </div>
  );
}

function SourceCard({ icon: Icon, title, children, live, accent, className, empty, keyHint, note }: {
  icon: any; title: string; children: React.ReactNode; live?: boolean; accent?: boolean; className?: string;
  empty?: boolean; keyHint?: string; note?: string;
}) {
  return (
    <Card className={cn("p-5", accent && "border-accent/30", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-semibold flex items-center gap-2">
          <Icon className={cn("h-4 w-4", accent ? "text-accent" : "text-text-dim")} />{title}
        </h3>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider", live ? "text-good" : "text-text-dim")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-good pulse-dot" : "bg-text-dim")} />{live ? "Live" : empty ? "Not connected" : "Sample"}
        </span>
      </div>
      {empty ? <ConnectState keyHint={keyHint} note={note} /> : children}
    </Card>
  );
}

function ConnectState({ keyHint, note }: { keyHint?: string; note?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-2/30 p-6 text-center">
      <div className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-text-dim">
        <Lock className="h-4 w-4" />
      </div>
      <p className="mt-3 text-sm">Not connected — nothing invented to show.</p>
      <p className="mt-1 text-xs text-text-dim">
        Add <span className="mono text-accent">{keyHint}</span> to load {note ?? "real data"}. See SETUP §7b.
      </p>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-3 w-3", i <= n ? "fill-accent text-accent" : "text-border")} />)}
    </span>
  );
}

// ───────────────────────── Opportunity ─────────────────────────
function OpportunityCard({ o, delay }: { o: MoodOpportunity; delay: number }) {
  const r = 26, c = 2 * Math.PI * r;
  const dash = (o.score / 100) * c;
  const follow = `https://www.google.com/search?q=${encodeURIComponent(`${o.event} ${o.city} 2026 tickets`)}`;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-4 card-hover hover:bg-surface-2/40 h-full">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
            <svg width={64} height={64} className="-rotate-90">
              <circle cx={32} cy={32} r={r} stroke="var(--surface-2)" strokeWidth="4" fill="none" />
              <circle cx={32} cy={32} r={r} stroke="var(--accent)" strokeWidth="4" fill="none" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="mono text-base font-semibold text-accent leading-none">{o.score}</div>
              <div className="text-[8px] uppercase tracking-wider text-text-dim mt-0.5">Collab</div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-accent">
              <MapPin className="h-3 w-3" />{o.city}<span className="text-text-dim">·</span><span className="text-text-dim mono">{o.date}</span>
            </div>
            <div className="font-medium text-sm mt-1">{o.event}</div>
            <div className="mt-1 text-xs text-text-dim">Push <span className="text-foreground">{o.sku}</span> · {o.weeks}w lead</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {o.sources.includes("trends") && <SourcePill icon={Search} label="Trends" />}
              {o.sources.includes("reddit") && <SourcePill icon={MessageCircle} label="Reddit" />}
              {o.sources.includes("event") && <SourcePill icon={CalendarDays} label="Event" />}
            </div>
          </div>
        </div>
        <div className="mt-3 border-t border-border pt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-text-dim leading-relaxed min-w-0">{o.note}</p>
          <a href={follow} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] text-accent hover:bg-accent/20 shrink-0">
            Follow <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Card>
    </motion.div>
  );
}

function SourcePill({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-text-dim">
      <Icon className="h-2.5 w-2.5" />{label}
    </span>
  );
}

// ───────────────────────── Realistic India map ─────────────────────────
// Accurate-ish city positions in the 0-100 × 0-120 viewBox (lon 68-98E, lat 8-37N).
const CITY_XY: Record<string, [number, number]> = {
  "Delhi NCR": [30.7, 34.8], Gurgaon: [30, 35.6], Noida: [31.3, 35.2], Jaipur: [26, 41.8],
  Ahmedabad: [15.3, 57.9], "Ahmedabad-Gandhinagar": [15.3, 57.9], Mumbai: [16, 74.5], Pune: [19.3, 76.6],
  Hyderabad: [35, 81], Bangalore: [32, 99.4], Chennai: [41, 99.3], Kolkata: [68, 59.6],
  Indore: [26.3, 59.2], "Chandigarh Tricity": [29.3, 26], Surat: [16, 65.4],
};
const INDIA_PATH =
  "M21.7,10.3 L20,20.7 L13.3,37.2 L6.7,41.4 L6.7,53.8 L1.7,55 L6.7,62 L6.7,66.2 L12,70 L16,74.5 L20,91 L23.3,99.3 L28,112 L31.7,119.6 L38,104 L41,99.3 L47,92 L53.3,86.9 L60,76 L63.3,70.3 L68,62 L70,49.7 L72,44 L80,41.4 L90,39.3 L96.7,37.2 L92,33 L84,36 L78,34 L70,36 L66.7,37.2 L55,31 L46.7,29 L40,26.9 L33.3,20.7 L26.7,16.6 Z";

function IndiaMap({ cityBuzz }: { cityBuzz: { city: string; x: number; y: number; buzz: number }[] }) {
  const dots = cityBuzz
    .map((c) => {
      const xy = CITY_XY[c.city];
      return xy ? { city: c.city, x: xy[0], y: xy[1], buzz: c.buzz } : null;
    })
    .filter(Boolean) as { city: string; x: number; y: number; buzz: number }[];

  return (
    <div className="relative aspect-[5/6] w-full">
      <svg viewBox="0 0 100 120" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="indiaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EEF1F6" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
        <path d={INDIA_PATH} fill="url(#indiaFill)" stroke="#CDD3DD" strokeWidth="0.6" strokeLinejoin="round" />
        {dots.map((c) => {
          const size = 1.1 + (c.buzz / 100) * 2.8;
          return (
            <g key={c.city}>
              <circle cx={c.x} cy={c.y} r={size * 1.8} fill="var(--accent)" opacity="0.15" />
              <circle cx={c.x} cy={c.y} r={size} fill="var(--accent)" className="pulse-dot" />
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 right-2 text-[10px] text-text-dim mono">dot size = buzz score</div>
    </div>
  );
}
