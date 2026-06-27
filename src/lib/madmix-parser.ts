// Dedicated parser for the MadMix workbook (the exact format supplied every period).
// Three sheets, each a pivot/wide layout — parsed here into flat raw records.
import * as XLSX from "xlsx";
import { toIsoDate, toNumber, slugifySku } from "./parse";

export interface WorkbookSalesRow { platform: string; city: string; sku_name: string; sku_id: string; revenue: number; period: string }
export interface WorkbookSpendRow { platform: string; day: string; spend: number; sales: number; a2s: number | null }
export interface WorkbookPodRow { platform: string; city: string; pod_count: number; period: string }

export interface ParsedWorkbook {
  sales: WorkbookSalesRow[];
  spends: WorkbookSpendRow[];
  pods: WorkbookPodRow[];
  periods: string[];
}

const PLATFORMS = ["big basket", "instamart", "amazon", "blinkit", "zepto"];

function normPlatform(v: any): string | null {
  const s = String(v ?? "").toLowerCase().trim();
  if (!s) return null;
  if (s.includes("big")) return "Big Basket";
  if (s.includes("insta")) return "Instamart";
  if (s.includes("amazon")) return "Amazon";
  if (s.includes("blink")) return "Blinkit";
  if (s.includes("zepto")) return "Zepto";
  return null;
}

// Merge platform-specific SKU spellings into one canonical flavour id so a product
// sold on both BigBasket and Instamart aggregates correctly (enables platform split).
const STOP = new Set(["madmix", "baked", "millet", "jowar", "quinoa", "sorghum", "g", "gm", "gms", "grams", "gram", "pack", "x5", "x", "flavoured", "flavored"]);
export function canonicalSku(raw: string): { id: string; short: string } {
  const tokens = raw
    .toLowerCase()
    .replace(/[0-9]+/g, " ")
    .split(/[^a-z]+/)
    .filter((t) => t && !STOP.has(t));
  const uniq = [...new Set(tokens)].sort();
  const id = "sku-" + (uniq.join("-") || slugifySku(raw).replace(/^sku-/, ""));
  const short = uniq.map((t) => t[0].toUpperCase() + t.slice(1)).join(" ") || raw;
  return { id, short };
}

export async function parseMadmixWorkbook(file: File): Promise<ParsedWorkbook> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = (name: string) =>
    wb.Sheets[wb.SheetNames.find((n) => n.toLowerCase().includes(name)) ?? ""];

  const sales = parseSkuSales(sheet("sku"));
  const spends = parseSpends(sheet("spend"));
  const pods = parsePods(sheet("pod") || sheet("availab"));

  const periods = [...new Set([...sales.map((s) => s.period), ...pods.map((p) => p.period)])].sort();
  return { sales, spends, pods, periods };
}

// ── PODs Availability ────────────────────────────────────────
// Row 0: period date serials marking each period-block start.
// Row 1: platform labels per column.  Row 2: City/Value pair headers.  Row 3+: data.
function parsePods(ws: XLSX.WorkSheet | undefined): WorkbookPodRow[] {
  if (!ws) return [];
  const m = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false, defval: "" });
  if (m.length < 4) return [];

  const periodStarts: { col: number; label: string }[] = [];
  (m[0] ?? []).forEach((v, c) => {
    const n = Number(v);
    if (Number.isFinite(n) && n > 20000 && n < 60000) periodStarts.push({ col: c, label: toIsoDate(String(v)) ?? `P${periodStarts.length + 1}` });
  });
  if (!periodStarts.length) periodStarts.push({ col: 0, label: "P1" });

  const platformCells: { col: number; platform: string }[] = [];
  (m[1] ?? []).forEach((v, c) => {
    const p = normPlatform(v);
    if (p) platformCells.push({ col: c, platform: p });
  });

  const periodForCol = (c: number) => {
    let best = periodStarts[0];
    for (const ps of periodStarts) if (ps.col <= c) best = ps;
    return best.label;
  };

  const out: WorkbookPodRow[] = [];
  for (const pc of platformCells) {
    const period = periodForCol(pc.col);
    for (let r = 3; r < m.length; r++) {
      const city = String(m[r]?.[pc.col] ?? "").trim();
      const val = toNumber(String(m[r]?.[pc.col + 1] ?? ""));
      if (city && val > 0) out.push({ platform: pc.platform, city, pod_count: Math.round(val), period });
    }
  }
  return out;
}

// ── SKU Level Sales (single period, two platform blocks) ─────
function parseSkuSales(ws: XLSX.WorkSheet | undefined): WorkbookSalesRow[] {
  if (!ws) return [];
  const m = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false, defval: "" });
  if (m.length < 3) return [];

  // Period label from the title row (e.g. "Big Basket - April").
  const title = String(m[0]?.[0] ?? "");
  const period = (title.split("-")[1] ?? "P1").trim() || "P1";

  const out: WorkbookSalesRow[] = [];
  let bbSku = "";
  let inSku = "";
  for (let r = 2; r < m.length; r++) {
    const row = m[r] ?? [];

    // Big Basket block (cols 0-2): forward-filled SKU, city, revenue.
    const bbRaw = String(row[0] ?? "").trim();
    if (bbRaw) bbSku = bbRaw;
    const bbCity = String(row[1] ?? "").trim();
    const bbRev = toNumber(String(row[2] ?? ""));
    if (bbSku && bbCity && bbRev > 0) {
      const c = canonicalSku(bbSku);
      out.push({ platform: "Big Basket", city: bbCity, sku_name: bbSku, sku_id: c.id, revenue: bbRev, period });
    }

    // Instamart block (cols 3-4): grouped — "madmix…" rows are SKU headers, else city rows.
    const c3 = String(row[3] ?? "").trim();
    if (c3) {
      if (/^madmix/i.test(c3)) {
        inSku = c3; // group header (subtotal in col4 — skip)
      } else if (inSku) {
        const inRev = toNumber(String(row[4] ?? ""));
        if (inRev > 0) {
          const c = canonicalSku(inSku);
          out.push({ platform: "Instamart", city: c3, sku_name: inSku, sku_id: c.id, revenue: inRev, period });
        }
      }
    }
  }
  return out;
}

// ── Sales vs Spends (daily) ──────────────────────────────────
// Row 0: totals.  Row 1: platform labels.  Row 2: Spends/Sales/A2S headers.  Row 3+: data.
function parseSpends(ws: XLSX.WorkSheet | undefined): WorkbookSpendRow[] {
  if (!ws) return [];
  const m = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false, defval: "" });
  const out: WorkbookSpendRow[] = [];
  for (let r = 3; r < m.length; r++) {
    const row = m[r] ?? [];
    const day = toIsoDate(String(row[0] ?? ""));
    if (!day) continue;
    const bbSpend = toNumber(String(row[1] ?? "")), bbSales = toNumber(String(row[2] ?? ""));
    const inSpend = toNumber(String(row[4] ?? "")), inSales = toNumber(String(row[5] ?? ""));
    if (bbSales || bbSpend) out.push({ platform: "Big Basket", day, spend: bbSpend, sales: bbSales, a2s: bbSales ? +(bbSpend / bbSales).toFixed(3) : null });
    if (inSales || inSpend) out.push({ platform: "Instamart", day, spend: inSpend, sales: inSales, a2s: inSales ? +(inSpend / inSales).toFixed(3) : null });
  }
  return out;
}
