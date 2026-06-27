// Derives the "needs your attention" feed from the loaded dataset — instant, no AI
// round-trip, so the What's New hub and the open-on-app greeting render immediately.
import { AlertTriangle, Sparkles, TrendingUp, Zap, Search, type LucideIcon } from "lucide-react";
import type { PulseData } from "./types";
import { formatInr } from "./format";

export type AlertRoute = "/cities" | "/mood-map" | "/portfolio" | "/efficiency";

export interface Alert {
  icon: LucideIcon;
  tone: "bad" | "warn" | "good" | "info";
  title: string;
  detail: string;
  to: AlertRoute;
}

export function computeAlerts(d: PulseData): Alert[] {
  const out: Alert[] = [];

  // 1) Under-distribution / stock risk — highest revenue-per-POD.
  const withPerPod = d.cities.filter((c) => c.pods > 0).map((c) => ({ c, perPod: c.revenue / c.pods }));
  const topStock = withPerPod.sort((a, b) => b.perPod - a.perPod)[0];
  if (topStock) {
    out.push({
      icon: AlertTriangle, tone: "bad", to: "/cities",
      title: `${topStock.c.name} is about to run dry`,
      detail: `Revenue/POD ₹${topStock.perPod.toFixed(2)} — demand is outrunning distribution. Replenish first.`,
    });
  }

  // 2) Top collab opportunity.
  const topOpp = [...d.moodOpportunities].sort((a, b) => b.score - a.score)[0];
  if (topOpp) {
    out.push({
      icon: Sparkles, tone: "warn", to: "/mood-map",
      title: `Collab: ${topOpp.event} · ${topOpp.city}`,
      detail: `Score ${topOpp.score}/100 · push ${topOpp.sku} with ${topOpp.weeks}w lead.`,
    });
  }

  // 3) Biggest mover SKU.
  const movers = d.skus.map((s) => ({ s, m: d.skuMetrics[s.id] })).filter((x) => x.m);
  const topMover = movers.sort((a, b) => (b.m.trend) - (a.m.trend))[0];
  if (topMover && topMover.m.trend > 0) {
    out.push({
      icon: TrendingUp, tone: "good", to: "/portfolio",
      title: `${topMover.s.short} is surging`,
      detail: `Up ${topMover.m.trend.toFixed(1)}% · ${formatInr(topMover.m.revenue)} this period.`,
    });
  }

  // 4) A2S overspend watch.
  if (d.kpis.instaA2s >= 0.5) {
    out.push({
      icon: Zap, tone: "warn", to: "/efficiency",
      title: "Instamart A2S is running hot",
      detail: `A2S ${d.kpis.instaA2s.toFixed(2)} — above efficient threshold. Shift budget to Big Basket.`,
    });
  }

  // 5) Search demand gap.
  const gap = d.demandGaps[0];
  if (gap) {
    out.push({
      icon: Search, tone: "info", to: "/mood-map",
      title: `Demand gap in ${gap.city}`,
      detail: gap.insight,
    });
  }

  return out;
}
