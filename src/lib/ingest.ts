// Ingestion + recompute engine. Turns uploaded rows into raw records, then rolls
// raw records up into the dashboard's metric tables (skus, sku_metrics, cities,
// daily_metrics). This is the "calculation engine" — every metric is derived here.
import { supabase } from "./supabase";
import {
  toNumber, normalisePlatform, slugifySku, toIsoDate,
  type DatasetType,
} from "./parse";
import type { ParsedWorkbook } from "./madmix-parser";
import type { SkuTag } from "./types";

const BB = "Big Basket";
const INSTA = "Instamart";

async function insertChunked(table: string, rows: Record<string, unknown>[]) {
  if (!supabase || !rows.length) return;
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + 1000));
    if (error) throw error;
  }
}

// One-click import of the full MadMix workbook (all three sheets), then recompute.
export async function importWorkbook(
  parsed: ParsedWorkbook,
  fileName: string,
  userId: string,
): Promise<{ sales: number; spends: number; pods: number; uploadId: string }> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: up, error: upErr } = await supabase
    .from("uploads")
    .insert({ uploaded_by: userId, file_name: fileName, status: "processing" })
    .select("id")
    .single();
  if (upErr) throw upErr;
  const uploadId = up.id as string;

  await insertChunked("sales_records", parsed.sales.map((s) => ({
    upload_id: uploadId, platform: s.platform, city: s.city,
    sku_name: s.sku_name, sku_id: s.sku_id, revenue: s.revenue, period: s.period,
  })));
  await insertChunked("spend_records", parsed.spends.map((s) => ({
    upload_id: uploadId, platform: s.platform, day: s.day, spend: s.spend, sales: s.sales, a2s: s.a2s,
  })));
  await insertChunked("pod_records", parsed.pods.map((p) => ({
    upload_id: uploadId, platform: p.platform, city: p.city, pod_count: p.pod_count, period: p.period,
  })));

  await supabase.from("uploads").update({ status: "processed" }).eq("id", uploadId);
  return { sales: parsed.sales.length, spends: parsed.spends.length, pods: parsed.pods.length, uploadId };
}

interface ImportArgs {
  type: DatasetType;
  rows: Record<string, string>[];
  mapping: Record<string, string>; // fieldKey -> header
  fileName: string;
  userId: string;
}

export interface ImportResult {
  inserted: number;
  uploadId: string | null;
}

// 1) Insert raw rows for the dataset type, logging the upload.
export async function importDataset({ type, rows, mapping, fileName, userId }: ImportArgs): Promise<ImportResult> {
  if (!supabase) throw new Error("Supabase is not configured");
  const get = (row: Record<string, string>, key: string) => (mapping[key] ? row[mapping[key]] : "");

  // Log the upload first so raw rows can reference it.
  const { data: up, error: upErr } = await supabase
    .from("uploads")
    .insert({ uploaded_by: userId, file_name: fileName, status: "processing" })
    .select("id")
    .single();
  if (upErr) throw upErr;
  const uploadId = up.id as string;

  let payload: Record<string, unknown>[] = [];
  let table = "";

  if (type === "sales") {
    table = "sales_records";
    payload = rows
      .map((r) => {
        const sku_name = get(r, "sku_name");
        return {
          upload_id: uploadId,
          platform: normalisePlatform(get(r, "platform")),
          city: get(r, "city").trim(),
          sku_name,
          sku_id: sku_name ? slugifySku(sku_name) : null,
          revenue: toNumber(get(r, "revenue")),
          units: mapping.units ? toNumber(get(r, "units")) : null,
          period: (get(r, "period") || "P1").trim(),
        };
      })
      .filter((r) => r.sku_name && r.city);
  } else if (type === "spends") {
    table = "spend_records";
    payload = rows
      .map((r) => {
        const day = toIsoDate(get(r, "day"));
        const spend = toNumber(get(r, "spend"));
        const sales = toNumber(get(r, "sales"));
        return {
          upload_id: uploadId,
          platform: normalisePlatform(get(r, "platform")),
          day,
          spend,
          sales,
          a2s: mapping.a2s ? toNumber(get(r, "a2s")) : sales ? +(spend / sales).toFixed(3) : null,
        };
      })
      .filter((r) => r.day);
  } else {
    table = "pod_records";
    payload = rows
      .map((r) => ({
        upload_id: uploadId,
        platform: normalisePlatform(get(r, "platform")),
        city: get(r, "city").trim(),
        pod_count: Math.round(toNumber(get(r, "pod_count"))),
        period: (get(r, "period") || "P1").trim(),
      }))
      .filter((r) => r.city);
  }

  if (payload.length) {
    const { error } = await supabase.from(table).insert(payload);
    if (error) throw error;
  }

  await supabase.from("uploads").update({ status: "processed" }).eq("id", uploadId);
  return { inserted: payload.length, uploadId };
}

// 2) Rebuild the dashboard metric tables from all raw records currently stored.
export async function recompute(): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const [salesRes, spendRes, podRes] = await Promise.all([
    supabase.from("sales_records").select("*"),
    supabase.from("spend_records").select("*"),
    supabase.from("pod_records").select("*"),
  ]);
  const sales = salesRes.data ?? [];
  const spends = spendRes.data ?? [];
  const pods = podRes.data ?? [];

  // ── Platform-level A2S (revenue-weighted) for SKU attribution ──
  const platSpend: Record<string, { spend: number; sales: number }> = {};
  for (const s of spends) {
    const p = platSpend[s.platform] ?? (platSpend[s.platform] = { spend: 0, sales: 0 });
    p.spend += Number(s.spend);
    p.sales += Number(s.sales);
  }
  const platA2s = (p: string) => {
    const r = platSpend[p];
    return r && r.sales ? r.spend / r.sales : 0.4;
  };

  // ── daily_metrics (from spends) ──
  if (spends.length) {
    const byDay: Record<string, any> = {};
    for (const s of spends) {
      const d = byDay[s.day] ?? (byDay[s.day] = { full_date: s.day, label: s.day.slice(5), bb_sales: 0, bb_spend: 0, insta_sales: 0, insta_spend: 0 });
      if (s.platform === BB) { d.bb_sales += Number(s.sales); d.bb_spend += Number(s.spend); }
      else if (s.platform === INSTA) { d.insta_sales += Number(s.sales); d.insta_spend += Number(s.spend); }
    }
    const dailyRows = Object.values(byDay)
      .sort((a: any, b: any) => a.full_date.localeCompare(b.full_date))
      .map((d: any) => ({
        ...d,
        bb_a2s: d.bb_sales ? +(d.bb_spend / d.bb_sales).toFixed(3) : 0,
        insta_a2s: d.insta_sales ? +(d.insta_spend / d.insta_sales).toFixed(3) : 0,
      }));
    await supabase.from("daily_metrics").delete().not("full_date", "is", null);
    if (dailyRows.length) await supabase.from("daily_metrics").insert(dailyRows);
  }

  // ── skus + sku_metrics (from sales) ──
  if (sales.length) {
    const periods = [...new Set(sales.map((s) => s.period))].sort();
    const lastP = periods[periods.length - 1];
    const prevP = periods.length > 1 ? periods[periods.length - 2] : null;

    interface Agg { name: string; rev: number; bbRev: number; cities: Set<string>; lastRev: number; prevRev: number; platRev: Record<string, number>; }
    const bySku: Record<string, Agg> = {};
    for (const s of sales) {
      const id = s.sku_id as string;
      const a = bySku[id] ?? (bySku[id] = { name: s.sku_name, rev: 0, bbRev: 0, cities: new Set(), lastRev: 0, prevRev: 0, platRev: {} });
      const rev = Number(s.revenue);
      a.rev += rev;
      if (s.platform === BB) a.bbRev += rev;
      a.cities.add(s.city);
      a.platRev[s.platform] = (a.platRev[s.platform] ?? 0) + rev;
      if (s.period === lastP) a.lastRev += rev;
      if (prevP && s.period === prevP) a.prevRev += rev;
    }

    const maxCities = Math.max(1, ...Object.values(bySku).map((a) => a.cities.size));
    const skuRows: any[] = [];
    const metricRows: any[] = [];
    for (const [id, a] of Object.entries(bySku)) {
      const trend = prevP && a.prevRev ? +(((a.lastRev - a.prevRev) / a.prevRev) * 100).toFixed(1) : 0;
      const a2s = a.rev
        ? +(Object.entries(a.platRev).reduce((sum, [p, r]) => sum + r * platA2s(p), 0) / a.rev).toFixed(3)
        : 0.4;
      const trendScore = clamp(((trend + 20) / 50) * 100, 0, 100);
      const cityScore = (a.cities.size / maxCities) * 100;
      const a2sScore = clamp(((0.6 - a2s) / 0.3) * 100, 0, 100);
      const health = Math.round(0.4 * trendScore + 0.3 * cityScore + 0.3 * a2sScore);
      skuRows.push({ id, name: a.name, short: shorten(a.name), category: categoryOf(a.name), size: "" });
      metricRows.push({
        sku_id: id, revenue: Math.round(a.rev), bb_share: a.rev ? +(a.bbRev / a.rev).toFixed(2) : 0,
        trend, cities: a.cities.size, a2s, health, tag: tagOf(health) as SkuTag,
      });
    }

    const keepIds = Object.keys(bySku);
    await supabase.from("sku_metrics").delete().not("sku_id", "in", `(${sqlList(keepIds)})`);
    await supabase.from("skus").delete().not("id", "in", `(${sqlList(keepIds)})`);
    if (skuRows.length) await supabase.from("skus").upsert(skuRows);
    if (metricRows.length) await supabase.from("sku_metrics").upsert(metricRows);
  }

  // ── cities (revenue from sales, pods from pod_records) ──
  if (sales.length || pods.length) {
    const cityMap: Record<string, { revenue: number; bbRev: number; instaRev: number; pods: number; podsPrev: number }> = {};
    const city = (name: string) => cityMap[name] ?? (cityMap[name] = { revenue: 0, bbRev: 0, instaRev: 0, pods: 0, podsPrev: 0 });
    for (const s of sales) {
      const c = city(s.city);
      const rev = Number(s.revenue);
      c.revenue += rev;
      if (s.platform === BB) c.bbRev += rev;
      else if (s.platform === INSTA) c.instaRev += rev;
    }
    // Core q-commerce only for the city dashboard (Amazon's long tail of towns
    // stays in pod_records for stock analysis but would swamp the city view).
    const corePods = pods.filter((p) => p.platform === BB || p.platform === INSTA);
    if (corePods.length) {
      const podPeriods = [...new Set(corePods.map((p) => p.period))].sort();
      const lastP = podPeriods[podPeriods.length - 1];
      const prevP = podPeriods.length > 1 ? podPeriods[podPeriods.length - 2] : null;
      for (const p of corePods) {
        const c = city(p.city);
        if (p.period === lastP) c.pods += Number(p.pod_count);
        if (prevP && p.period === prevP) c.podsPrev += Number(p.pod_count);
      }
      for (const c of Object.values(cityMap)) if (!c.podsPrev) c.podsPrev = c.pods;
    }

    // Opportunity = normalised revenue-per-POD (or revenue rank if no pods).
    const entries = Object.entries(cityMap);
    const perPod = entries.map(([, c]) => (c.pods ? c.revenue / c.pods : c.revenue));
    const min = Math.min(...perPod), max = Math.max(...perPod);
    const cityRows = entries.map(([name, c], i) => ({
      name,
      revenue: Math.round(c.revenue),
      bb_rev: Math.round(c.bbRev),
      insta_rev: Math.round(c.instaRev),
      pods: Math.round(c.pods),
      pods_prev: Math.round(c.podsPrev),
      opportunity: max > min ? Math.round(((perPod[i] - min) / (max - min)) * 100) : 50,
    }));
    const names = entries.map(([n]) => n);
    await supabase.from("cities").delete().not("name", "in", `(${sqlList(names)})`);
    if (cityRows.length) await supabase.from("cities").upsert(cityRows);
  }
}

// ── helpers ──
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function tagOf(health: number): string {
  return health >= 85 ? "Hero" : health >= 70 ? "Growing" : health >= 50 ? "Stagnating" : "Needs push";
}
function categoryOf(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("puff")) return "Puffs";
  if (n.includes("bhujia")) return "Bhujia";
  if (n.includes("raisin")) return "Raisins";
  return "Snack";
}
function shorten(name: string): string {
  return name.replace(/quinoa |jowar |millet |sorghum |baked |flavoured /gi, "").trim();
}
function sqlList(ids: string[]): string {
  if (!ids.length) return "''";
  return ids.map((id) => `"${String(id).replace(/"/g, "")}"`).join(",");
}
