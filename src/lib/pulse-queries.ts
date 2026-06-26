// Fetches the full PulseBoard dataset from Supabase and maps snake_case rows
// into the camelCase domain types the UI consumes.
import { supabase } from "./supabase";
import { computeKpis } from "./format";
import type {
  PulseData,
  Sku,
  SkuMetric,
  City,
  DailyMetric,
  MoodOpportunity,
  DemandGap,
  SeasonItem,
  CityBuzz,
  MoodSource,
} from "./types";

export async function fetchPulseData(): Promise<PulseData> {
  if (!supabase) throw new Error("Supabase is not configured");

  const [
    skusRes,
    metricsRes,
    citiesRes,
    dailyRes,
    moodRes,
    gapsRes,
    seasonRes,
    buzzRes,
  ] = await Promise.all([
    supabase.from("skus").select("*"),
    supabase.from("sku_metrics").select("*"),
    supabase.from("cities").select("*").order("revenue", { ascending: false }),
    supabase.from("daily_metrics").select("*").order("full_date", { ascending: true }),
    supabase.from("mood_opportunities").select("*").order("score", { ascending: false }),
    supabase.from("demand_gaps").select("*").order("id", { ascending: true }),
    supabase.from("season_calendar").select("*").order("id", { ascending: true }),
    supabase.from("city_buzz").select("*"),
  ]);

  const firstError =
    skusRes.error || metricsRes.error || citiesRes.error || dailyRes.error;
  if (firstError) throw firstError;
  if (!skusRes.data?.length) throw new Error("No data — has the database been seeded?");

  // Keep SKUs in the canonical order (sku-1, sku-2, …) for stable rankings.
  const skus: Sku[] = (skusRes.data ?? [])
    .map((r) => ({ id: r.id, name: r.name, short: r.short, category: r.category, size: r.size }))
    .sort((a, b) => skuNum(a.id) - skuNum(b.id));

  const skuMetrics: Record<string, SkuMetric> = {};
  for (const r of metricsRes.data ?? []) {
    skuMetrics[r.sku_id] = {
      revenue: Number(r.revenue),
      bbShare: Number(r.bb_share),
      trend: Number(r.trend),
      cities: Number(r.cities),
      a2s: Number(r.a2s),
      health: Number(r.health),
      tag: r.tag,
    };
  }

  const cities: City[] = (citiesRes.data ?? []).map((r) => ({
    name: r.name,
    revenue: Number(r.revenue),
    bbRev: Number(r.bb_rev),
    instaRev: Number(r.insta_rev),
    pods: Number(r.pods),
    podsPrev: Number(r.pods_prev),
    opportunity: Number(r.opportunity),
  }));

  const dailyMetrics: DailyMetric[] = (dailyRes.data ?? []).map((r) => ({
    date: r.label,
    fullDate: r.full_date,
    bbSales: Number(r.bb_sales),
    bbSpend: Number(r.bb_spend),
    bbA2s: Number(r.bb_a2s),
    instaSales: Number(r.insta_sales),
    instaSpend: Number(r.insta_spend),
    instaA2s: Number(r.insta_a2s),
  }));

  const moodOpportunities: MoodOpportunity[] = (moodRes.data ?? []).map((r) => ({
    id: r.id,
    city: r.city,
    event: r.event,
    weeks: Number(r.weeks),
    date: r.event_date ?? "",
    sku: r.sku ?? "",
    score: Number(r.score),
    sources: (r.sources ?? []) as MoodSource[],
    note: r.note ?? "",
  }));

  const demandGaps: DemandGap[] = (gapsRes.data ?? []).map((r) => ({ city: r.city, insight: r.insight }));
  const seasonCalendar: SeasonItem[] = (seasonRes.data ?? []).map((r) => ({
    season: r.season,
    window: r.window,
    sku: r.sku,
    cities: r.cities ?? [],
    leadTime: r.lead_time,
  }));
  const cityBuzz: CityBuzz[] = (buzzRes.data ?? []).map((r) => ({
    city: r.city,
    x: Number(r.x),
    y: Number(r.y),
    buzz: Number(r.buzz),
  }));

  return {
    skus,
    skuMetrics,
    cities,
    dailyMetrics,
    kpis: computeKpis(dailyMetrics, cities, skus, skuMetrics),
    moodOpportunities,
    demandGaps,
    seasonCalendar,
    cityBuzz,
  };
}

function skuNum(id: string): number {
  const n = Number(id.replace(/\D/g, ""));
  return Number.isNaN(n) ? 0 : n;
}
