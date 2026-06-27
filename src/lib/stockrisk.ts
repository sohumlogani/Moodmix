// Stock-risk / replenishment AI. Looks at month-over-month distribution (PODs) vs
// demand (revenue per POD) to flag cities most likely to run dry, and recommends
// where to push excess stock to hold demand = supply. Claude synthesises; falls
// back to a deterministic ranking when ANTHROPIC_API_KEY is absent.
import { createServerFn } from "@tanstack/react-start";

export interface StockCity {
  city: string;
  revenue: number;
  pods: number;
  podsPrev: number;
  perPod: number;
  podsDelta: number; // % change vs previous period
  opportunity: number;
}

export interface StockRiskItem {
  city: string;
  level: "high" | "medium" | "low";
  reason: string;
  action: string;
}

export interface StockRiskResult {
  headline: string;
  items: StockRiskItem[];
  source: "claude" | "fallback";
}

const MODEL = "claude-opus-4-8";

export const stockRiskSummary = createServerFn({ method: "POST" })
  .validator((cities: StockCity[]) => cities)
  .handler(async ({ data }): Promise<StockRiskResult> => {
    const cities = (data ?? []).filter((c) => c.pods > 0 || c.revenue > 0);
    if (!cities.length) return { headline: "No distribution data yet — upload a workbook.", items: [], source: "fallback" };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return fallback(cities);

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });

      const table = cities
        .map((c) => `${c.city}: revenue ₹${Math.round(c.revenue)}, PODs ${c.pods} (was ${c.podsPrev}, ${c.podsDelta >= 0 ? "+" : ""}${c.podsDelta.toFixed(1)}%), revenue/POD ₹${c.perPod.toFixed(2)}`)
        .join("\n");

      const prompt = [
        "You are PulseBoard's replenishment engine for MadMix (Indian millet snacks on Big Basket + Instamart).",
        "Goal: keep demand = supply. A city is at risk of running dry when revenue-per-POD is high (demand outpacing distribution) AND/OR PODs are shrinking month-over-month.",
        "Here is the latest city distribution vs demand:",
        table,
        "",
        "Return ONLY JSON: {\"headline\":\"one sentence\",\"items\":[{\"city\":\"\",\"level\":\"high|medium|low\",\"reason\":\"why it'll run out\",\"action\":\"specific replenishment, e.g. +20% PODs / push stock\"}]}",
        "Rank the 5 highest-risk cities. Be specific and quantitative; actions should name a stock/POD increase.",
      ].join("\n");

      const resp: any = await (client.messages.create as any)({
        model: MODEL,
        max_tokens: 1500,
        thinking: { type: "adaptive" },
        messages: [{ role: "user", content: prompt }],
      });
      const text: string = (resp.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      const parsed = extractJson(text);
      const items = sanitize(parsed?.items);
      if (items.length) return { headline: String(parsed?.headline ?? defaultHeadline(items)), items, source: "claude" };
      return fallback(cities);
    } catch (err) {
      console.error("Stock-risk Claude call failed, using fallback:", err);
      return fallback(cities);
    }
  });

function fallback(cities: StockCity[]): StockRiskResult {
  const perPods = cities.map((c) => c.perPod);
  const max = Math.max(...perPods, 1);
  const scored = cities
    .map((c) => {
      // High revenue/POD = under-distributed; shrinking PODs add risk.
      const distPressure = c.perPod / max; // 0..1
      const shrink = c.podsDelta < 0 ? Math.min(1, -c.podsDelta / 15) : 0;
      const score = distPressure * 0.7 + shrink * 0.3;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const items: StockRiskItem[] = scored.map(({ c, score }) => {
    const level: StockRiskItem["level"] = score > 0.66 ? "high" : score > 0.4 ? "medium" : "low";
    const shrinking = c.podsDelta < -1;
    const reason = shrinking
      ? `Revenue/POD ₹${c.perPod.toFixed(2)} with distribution down ${Math.abs(c.podsDelta).toFixed(1)}% — demand is outrunning shrinking supply.`
      : `Revenue/POD ₹${c.perPod.toFixed(2)} is well above network median — under-distributed, likely stocking out on hero SKUs.`;
    const bump = level === "high" ? 25 : level === "medium" ? 15 : 10;
    return { city: c.city, level, reason, action: `Push +${bump}% PODs / front-load stock into ${c.city} before next cycle.` };
  });

  return { headline: defaultHeadline(items), items, source: "fallback" };
}

function defaultHeadline(items: StockRiskItem[]): string {
  const high = items.filter((i) => i.level === "high").map((i) => i.city);
  if (high.length) return `${high.join(", ")} ${high.length > 1 ? "are" : "is"} most at risk of running dry — replenish first.`;
  return `${items[0]?.city ?? "Top cities"} need a distribution top-up to keep pace with demand.`;
}

function sanitize(raw: any): StockRiskItem[] {
  if (!Array.isArray(raw)) return [];
  const levels = ["high", "medium", "low"];
  return raw.slice(0, 5).map((i) => ({
    city: String(i?.city ?? ""),
    level: (levels.includes(i?.level) ? i.level : "medium") as StockRiskItem["level"],
    reason: String(i?.reason ?? ""),
    action: String(i?.action ?? ""),
  })).filter((i) => i.city);
}

function extractJson(text: string): any | null {
  try { return JSON.parse(text); } catch {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a === -1 || b === -1) return null;
    try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
  }
}
