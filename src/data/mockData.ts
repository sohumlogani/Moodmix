// PulseBoard seed data — MadMix demand intelligence.
// This is the canonical dataset: it seeds Supabase (scripts/seed.ts) and acts as
// the offline fallback the app renders instantly before/without a live backend.
import type {
  Sku,
  SkuMetric,
  City,
  DailyMetric,
  MoodOpportunity,
  DemandGap,
  SeasonItem,
  CityBuzz,
  PulseData,
} from "@/lib/types";
import { computeKpis, formatInr, formatInrFull, PLATFORM_COLORS } from "@/lib/format";

// Re-export for backwards compatibility with existing imports.
export type { Platform } from "@/lib/types";
export { formatInr, formatInrFull, PLATFORM_COLORS };

export const skus: Sku[] = [
  { id: "sku-1", name: "Chaat Corner Quinoa Millet Puffs", short: "Chaat Corner Puffs", category: "Puffs", size: "50g" },
  { id: "sku-2", name: "Cream Onion Jowar Millet Puffs", short: "Cream Onion Puffs", category: "Puffs", size: "50g" },
  { id: "sku-3", name: "Masala Masti Jowar Bhujia", short: "Masala Masti Bhujia", category: "Bhujia", size: "125g" },
  { id: "sku-4", name: "Mango Flavoured Raisins", short: "Mango Raisins", category: "Raisins", size: "11g x5" },
  { id: "sku-5", name: "Aloo Sev Millet Bhujia", short: "Aloo Sev Bhujia", category: "Bhujia", size: "135g" },
  { id: "sku-6", name: "BBQ Blast Millet Bhujia", short: "BBQ Blast Bhujia", category: "Bhujia", size: "135g" },
  { id: "sku-7", name: "Flamin' Fun Quinoa Millet Puffs", short: "Flamin' Fun Puffs", category: "Puffs", size: "50g" },
  { id: "sku-8", name: "Lemon Mirchi Millet Bhujia", short: "Lemon Mirchi Bhujia", category: "Bhujia", size: "135g" },
  { id: "sku-9", name: "Paan Raisins", short: "Paan Raisins", category: "Raisins", size: "11g x5" },
  { id: "sku-10", name: "Pudina Picnic Baked Millet Bhujia", short: "Pudina Picnic Bhujia", category: "Bhujia", size: "135g" },
  { id: "sku-11", name: "Tangy Twist Baked Millet Bhujia", short: "Tangy Twist Bhujia", category: "Bhujia", size: "135g" },
  { id: "sku-12", name: "Pizza Party Baked Quinoa Puffs", short: "Pizza Party Puffs", category: "Puffs", size: "50g" },
  { id: "sku-13", name: "Mighty Masala Sorghum Puffs", short: "Mighty Masala Puffs", category: "Puffs", size: "50g" },
];

export const skuMetrics: Record<string, SkuMetric> = {
  "sku-1": { revenue: 78400, bbShare: 0.62, trend: 18.4, cities: 14, a2s: 0.34, health: 92, tag: "Hero" },
  "sku-2": { revenue: 64200, bbShare: 0.71, trend: -6.1, cities: 12, a2s: 0.41, health: 74, tag: "Stagnating" },
  "sku-3": { revenue: 51800, bbShare: 0.66, trend: 11.2, cities: 13, a2s: 0.38, health: 86, tag: "Hero" },
  "sku-4": { revenue: 42300, bbShare: 0.55, trend: 22.7, cities: 10, a2s: 0.29, health: 88, tag: "Growing" },
  "sku-5": { revenue: 31200, bbShare: 0.74, trend: 4.3, cities: 11, a2s: 0.45, health: 71, tag: "Growing" },
  "sku-6": { revenue: 27100, bbShare: 0.69, trend: -2.8, cities: 9, a2s: 0.49, health: 62, tag: "Stagnating" },
  "sku-7": { revenue: 24800, bbShare: 0.58, trend: 9.1, cities: 8, a2s: 0.42, health: 68, tag: "Growing" },
  "sku-8": { revenue: 21400, bbShare: 0.72, trend: 14.5, cities: 7, a2s: 0.36, health: 73, tag: "Growing" },
  "sku-9": { revenue: 18600, bbShare: 0.52, trend: -10.2, cities: 6, a2s: 0.58, health: 48, tag: "Needs push" },
  "sku-10": { revenue: 16200, bbShare: 0.61, trend: 3.7, cities: 7, a2s: 0.51, health: 56, tag: "Stagnating" },
  "sku-11": { revenue: 14800, bbShare: 0.64, trend: 7.9, cities: 6, a2s: 0.47, health: 60, tag: "Growing" },
  "sku-12": { revenue: 9700, bbShare: 0.59, trend: -15.4, cities: 5, a2s: 0.63, health: 38, tag: "Needs push" },
  "sku-13": { revenue: 7200, bbShare: 0.57, trend: -8.6, cities: 4, a2s: 0.71, health: 32, tag: "Needs push" },
};

export const cities: City[] = [
  { name: "Gurgaon", revenue: 58400, bbRev: 41200, instaRev: 17200, pods: 52000, podsPrev: 48500, opportunity: 78 },
  { name: "Hyderabad", revenue: 49100, bbRev: 32800, instaRev: 16300, pods: 43000, podsPrev: 41200, opportunity: 92 },
  { name: "Bangalore", revenue: 47200, bbRev: 30100, instaRev: 17100, pods: 41000, podsPrev: 40000, opportunity: 85 },
  { name: "Mumbai", revenue: 41800, bbRev: 26200, instaRev: 15600, pods: 38500, podsPrev: 37800, opportunity: 71 },
  { name: "Pune", revenue: 36200, bbRev: 24100, instaRev: 12100, pods: 31200, podsPrev: 28900, opportunity: 88 },
  { name: "Chennai", revenue: 28700, bbRev: 19400, instaRev: 9300, pods: 26800, podsPrev: 26100, opportunity: 64 },
  { name: "Ahmedabad-Gandhinagar", revenue: 22400, bbRev: 15600, instaRev: 6800, pods: 21400, podsPrev: 20100, opportunity: 58 },
  { name: "Kolkata", revenue: 19800, bbRev: 14200, instaRev: 5600, pods: 18900, podsPrev: 18200, opportunity: 54 },
  { name: "Noida", revenue: 17200, bbRev: 11800, instaRev: 5400, pods: 15600, podsPrev: 14800, opportunity: 67 },
  { name: "Chandigarh Tricity", revenue: 12400, bbRev: 8900, instaRev: 3500, pods: 11200, podsPrev: 10800, opportunity: 52 },
  { name: "Jaipur", revenue: 10800, bbRev: 7600, instaRev: 3200, pods: 9800, podsPrev: 9100, opportunity: 61 },
  { name: "Indore", revenue: 9100, bbRev: 6800, instaRev: 2300, pods: 8200, podsPrev: 7600, opportunity: 49 },
  { name: "Surat", revenue: 8400, bbRev: 6100, instaRev: 2300, pods: 7800, podsPrev: 7200, opportunity: 44 },
  { name: "Ranchi", revenue: 6200, bbRev: 4800, instaRev: 1400, pods: 5400, podsPrev: 4900, opportunity: 56 },
  { name: "DehraDun", revenue: 5400, bbRev: 4100, instaRev: 1300, pods: 4800, podsPrev: 4400, opportunity: 41 },
  { name: "Mysore", revenue: 4800, bbRev: 3700, instaRev: 1100, pods: 4200, podsPrev: 3900, opportunity: 38 },
  { name: "Mangaluru", revenue: 4100, bbRev: 3200, instaRev: 900, pods: 3700, podsPrev: 3400, opportunity: 35 },
  { name: "Nagpur", revenue: 3600, bbRev: 2800, instaRev: 800, pods: 3300, podsPrev: 3100, opportunity: 32 },
];

// Deterministic 30-day daily series (seeded so the bundled fallback is stable).
const today = new Date("2025-04-30");
function seededRand(seed: number) {
  // Simple LCG — deterministic across runs so charts don't jump on reload.
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const rnd = seededRand(42);

export const dailyMetrics: DailyMetric[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(today);
  d.setDate(d.getDate() - (29 - i));
  const bbSales = 8500 + Math.sin(i * 0.5) * 1800 + (rnd() - 0.5) * 1200;
  const bbSpend = bbSales * (0.28 + Math.sin(i * 0.4) * 0.06 + (rnd() - 0.5) * 0.05);
  const instaSales = 3100 + Math.sin(i * 0.6 + 1) * 700 + (rnd() - 0.5) * 500;
  const instaSpend = instaSales * (0.48 + Math.cos(i * 0.5) * 0.1 + (rnd() - 0.5) * 0.06);
  return {
    date: d.toISOString().slice(5, 10),
    fullDate: d.toISOString().slice(0, 10),
    bbSales: Math.round(bbSales),
    bbSpend: Math.round(bbSpend),
    bbA2s: +(bbSpend / bbSales).toFixed(3),
    instaSales: Math.round(instaSales),
    instaSpend: Math.round(instaSpend),
    instaA2s: +(instaSpend / instaSales).toFixed(3),
  };
});

export const kpis = computeKpis(dailyMetrics, cities, skus, skuMetrics);

export const moodMapOpportunities: MoodOpportunity[] = [
  { id: 1, city: "Bangalore", event: "Millet Food Festival", weeks: 6, date: "Jun 12", sku: "Cream Onion Puffs", score: 88, sources: ["trends", "reddit", "event"], note: "Search interest for 'millet snacks Bangalore' up 34% MoM" },
  { id: 2, city: "Pune", event: "Sunburn Arena College Fest", weeks: 4, date: "May 28", sku: "Chaat Corner Puffs", score: 84, sources: ["trends", "event"], note: "Reddit r/pune buzzing about late-night snack runs" },
  { id: 3, city: "Delhi NCR", event: "Diwali Gifting Season", weeks: 5, date: "Jun 04", sku: "Mango Raisins", score: 81, sources: ["trends", "event"], note: "Healthy gift hamper queries trending in NCR" },
  { id: 4, city: "Hyderabad", event: "IPL Playoff Watch Events", weeks: 2, date: "May 14", sku: "Masala Masti Bhujia", score: 79, sources: ["trends", "reddit"], note: "Spicy snack mentions spiking in r/hyderabad threads" },
  { id: 5, city: "Mumbai", event: "Marathon Expo", weeks: 3, date: "May 21", sku: "Aloo Sev Bhujia", score: 72, sources: ["event", "reddit"], note: "Healthy-snack demand spike near event venues" },
  { id: 6, city: "Chennai", event: "Music Season Concerts", weeks: 7, date: "Jun 19", sku: "Lemon Mirchi Bhujia", score: 68, sources: ["trends", "event"], note: "Regional flavour match — strong cultural fit" },
];

export const demandGaps: DemandGap[] = [
  { city: "Hyderabad", insight: "High search interest for 'millet bhujia', distribution at 60% of Bangalore" },
  { city: "Indore", insight: "Reddit chatter around healthy office snacks, 0 active POD growth" },
  { city: "Jaipur", insight: "Search demand for 'baked snacks' up 22%, current SKU mix skews fried" },
];

export const seasonCalendar: SeasonItem[] = [
  { season: "IPL Season", window: "Now → 4 weeks", sku: "Masala Masti Bhujia", cities: ["Hyderabad", "Mumbai", "Bangalore"], leadTime: "Push now" },
  { season: "Exam Season", window: "2 → 6 weeks", sku: "Mango Raisins", cities: ["Delhi NCR", "Gurgaon", "Noida"], leadTime: "Prep in 1 week" },
  { season: "Monsoon", window: "6 → 12 weeks", sku: "Pudina Picnic Bhujia", cities: ["Mumbai", "Pune", "Bangalore"], leadTime: "Plan now" },
  { season: "Diwali", window: "20 → 28 weeks", sku: "Mango Raisins gift pack", cities: ["All Tier-1"], leadTime: "Source SKU now" },
];

export const cityBuzz: CityBuzz[] = [
  { city: "Gurgaon", x: 38, y: 32, buzz: 62 },
  { city: "Delhi NCR", x: 39, y: 31, buzz: 81 },
  { city: "Noida", x: 40, y: 32, buzz: 58 },
  { city: "Jaipur", x: 32, y: 36, buzz: 47 },
  { city: "Ahmedabad", x: 28, y: 48, buzz: 51 },
  { city: "Mumbai", x: 30, y: 60, buzz: 72 },
  { city: "Pune", x: 33, y: 64, buzz: 84 },
  { city: "Hyderabad", x: 44, y: 68, buzz: 79 },
  { city: "Bangalore", x: 42, y: 80, buzz: 88 },
  { city: "Chennai", x: 50, y: 84, buzz: 68 },
  { city: "Kolkata", x: 64, y: 50, buzz: 44 },
  { city: "Indore", x: 36, y: 48, buzz: 49 },
];

// Assembled fallback the app renders instantly (and the seed script writes to Supabase).
export const bundledSeed: PulseData = {
  skus,
  skuMetrics,
  cities,
  dailyMetrics,
  kpis,
  moodOpportunities: moodMapOpportunities,
  demandGaps,
  seasonCalendar,
  cityBuzz,
};
