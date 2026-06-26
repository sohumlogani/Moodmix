// PulseBoard shared domain types — single source of truth for the data layer.

export type Platform = "Big Basket" | "Instamart";

export type SkuTag = "Hero" | "Growing" | "Stagnating" | "Needs push";

export interface Sku {
  id: string;
  name: string;
  short: string;
  category: string;
  size: string;
}

export interface SkuMetric {
  revenue: number;
  bbShare: number;
  trend: number;
  cities: number;
  a2s: number;
  health: number;
  tag: SkuTag;
}

export interface City {
  name: string;
  revenue: number;
  bbRev: number;
  instaRev: number;
  pods: number;
  podsPrev: number;
  opportunity: number;
}

export interface DailyMetric {
  date: string; // MM-DD label
  fullDate: string; // YYYY-MM-DD
  bbSales: number;
  bbSpend: number;
  bbA2s: number;
  instaSales: number;
  instaSpend: number;
  instaA2s: number;
}

export interface Kpis {
  totalRevenue: number;
  bbRevenue: number;
  instaRevenue: number;
  avgA2s: number;
  bbA2s: number;
  instaA2s: number;
  activeSkus: number;
  citiesCovered: number;
  totalPods: number;
  topPlatform: Platform;
  revenueChange: number;
  a2sChange: number;
  podsChange: number;
}

export type MoodSource = "trends" | "reddit" | "event";

export interface MoodOpportunity {
  id: number;
  city: string;
  event: string;
  weeks: number;
  date: string;
  sku: string;
  score: number;
  sources: MoodSource[];
  note: string;
}

export interface DemandGap {
  city: string;
  insight: string;
}

export interface SeasonItem {
  season: string;
  window: string;
  sku: string;
  cities: string[];
  leadTime: string;
}

export interface CityBuzz {
  city: string;
  x: number;
  y: number;
  buzz: number;
}

export interface PulseData {
  skus: Sku[];
  skuMetrics: Record<string, SkuMetric>;
  cities: City[];
  dailyMetrics: DailyMetric[];
  kpis: Kpis;
  moodOpportunities: MoodOpportunity[];
  demandGaps: DemandGap[];
  seasonCalendar: SeasonItem[];
  cityBuzz: CityBuzz[];
}
