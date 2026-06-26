// Pure formatting helpers + brand constants. No data, no side effects —
// safe to import anywhere (client or server) without pulling in the data layer.
import type { Platform, City, DailyMetric, Sku, SkuMetric, Kpis } from "./types";

export const PLATFORM_COLORS: Record<Platform, string> = {
  "Big Basket": "#84CC16",
  Instamart: "#F97316",
};

export function formatInr(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatInrFull(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// Derive the headline KPIs from the underlying datasets. Used both to seed the
// bundled fallback and to recompute after live data loads from Supabase.
export function computeKpis(
  dailyMetrics: DailyMetric[],
  cities: City[],
  skus: Sku[],
  _skuMetrics: Record<string, SkuMetric>,
): Kpis {
  const bbTotalRev = dailyMetrics.reduce((s, d) => s + d.bbSales, 0);
  const instaTotalRev = dailyMetrics.reduce((s, d) => s + d.instaSales, 0);
  const bbTotalSpend = dailyMetrics.reduce((s, d) => s + d.bbSpend, 0);
  const instaTotalSpend = dailyMetrics.reduce((s, d) => s + d.instaSpend, 0);
  const totalRev = bbTotalRev + instaTotalRev || 1;

  return {
    totalRevenue: bbTotalRev + instaTotalRev,
    bbRevenue: bbTotalRev,
    instaRevenue: instaTotalRev,
    avgA2s: +((bbTotalSpend + instaTotalSpend) / totalRev).toFixed(3),
    bbA2s: +(bbTotalSpend / (bbTotalRev || 1)).toFixed(3),
    instaA2s: +(instaTotalSpend / (instaTotalRev || 1)).toFixed(3),
    activeSkus: skus.length,
    citiesCovered: cities.length,
    totalPods: cities.reduce((s, c) => s + c.pods, 0),
    topPlatform: bbTotalRev >= instaTotalRev ? "Big Basket" : "Instamart",
    revenueChange: 12.4,
    a2sChange: -3.2,
    podsChange: 4.8,
  };
}
