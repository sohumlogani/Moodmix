// Server-only Mood Map refresh. Synthesises collab opportunities with Claude
// (claude-opus-4-8) from the brand's SKUs + cities. Falls back to a deterministic
// reshuffle of the seed when ANTHROPIC_API_KEY is absent or the call fails, so the
// "Refresh" button always returns something usable.
import { createServerFn } from "@tanstack/react-start";
import { skus, cities, moodMapOpportunities, demandGaps } from "@/data/mockData";
import type { MoodOpportunity, DemandGap, MoodSource } from "@/lib/types";

export interface MoodRefreshResult {
  opportunities: MoodOpportunity[];
  demandGaps: DemandGap[];
  source: "claude" | "fallback";
}

const MODEL = "claude-opus-4-8";

export const refreshMoodMap = createServerFn({ method: "POST" }).handler(
  async (): Promise<MoodRefreshResult> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return fallback();

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });

      const topSkus = skus.slice(0, 8).map((s) => s.short);
      const topCities = cities.slice(0, 10).map((c) => c.name);

      const prompt = [
        "You are PulseBoard's demand-intelligence engine for MadMix, an Indian millet-snack brand.",
        "Synthesise public-signal collaboration opportunities (search trends, Reddit buzz, upcoming events).",
        `Brand SKUs: ${topSkus.join(", ")}.`,
        `Active cities: ${topCities.join(", ")}.`,
        "",
        "Return ONLY valid JSON (no markdown, no prose) of the shape:",
        `{"opportunities":[{"id":1,"city":"","event":"","weeks":4,"date":"Jun 12","sku":"","score":80,"sources":["trends","event"],"note":""}],"demandGaps":[{"city":"","insight":""}]}`,
        "Rules: exactly 6 opportunities and 3 demand gaps. score is 0-100 (audience x flavour-fit x momentum).",
        "sources is a subset of [\"trends\",\"reddit\",\"event\"]. sku must be one of the brand SKUs.",
        "weeks is lead time (1-8). date is a short 'Mon DD' string in the next 60 days. note is one crisp sentence.",
      ].join("\n");

      // Params loosely typed to stay compatible across SDK minor versions.
      const resp: any = await (client.messages.create as any)({
        model: MODEL,
        max_tokens: 2000,
        thinking: { type: "adaptive" },
        messages: [{ role: "user", content: prompt }],
      });

      const text: string = (resp.content ?? [])
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("");

      const parsed = extractJson(text);
      const opportunities = sanitizeOpportunities(parsed?.opportunities);
      const gaps = sanitizeGaps(parsed?.demandGaps);
      if (opportunities.length && gaps.length) {
        return { opportunities, demandGaps: gaps, source: "claude" };
      }
      return fallback();
    } catch (err) {
      console.error("Mood Map Claude refresh failed, using fallback:", err);
      return fallback();
    }
  },
);

// ── Helpers ──────────────────────────────────────────────────
function extractJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

const VALID_SOURCES: MoodSource[] = ["trends", "reddit", "event"];

function sanitizeOpportunities(raw: any): MoodOpportunity[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 6).map((o, i) => ({
    id: i + 1,
    city: String(o?.city ?? ""),
    event: String(o?.event ?? ""),
    weeks: clampInt(o?.weeks, 1, 8),
    date: String(o?.date ?? ""),
    sku: String(o?.sku ?? ""),
    score: clampInt(o?.score, 0, 100),
    sources: Array.isArray(o?.sources)
      ? (o.sources.filter((s: any) => VALID_SOURCES.includes(s)) as MoodSource[])
      : ["trends"],
    note: String(o?.note ?? ""),
  }));
}

function sanitizeGaps(raw: any): DemandGap[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 3).map((g) => ({ city: String(g?.city ?? ""), insight: String(g?.insight ?? "") }));
}

function clampInt(v: any, lo: number, hi: number): number {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

// Deterministic-but-varying reshuffle so refresh feels alive without an API key.
function fallback(): MoodRefreshResult {
  const jitter = (base: number, range: number) =>
    clampInt(base + (Math.random() - 0.5) * range, 0, 100);
  const opportunities = moodMapOpportunities
    .map((o) => ({ ...o, score: jitter(o.score, 12), weeks: clampInt(o.weeks + Math.round((Math.random() - 0.5) * 2), 1, 8) }))
    .sort((a, b) => b.score - a.score)
    .map((o, i) => ({ ...o, id: i + 1 }));
  return { opportunities, demandGaps, source: "fallback" };
}
