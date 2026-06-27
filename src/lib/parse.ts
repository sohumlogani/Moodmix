// Parses an uploaded CSV/XLSX into rows, and auto-maps its columns to the
// canonical fields PulseBoard understands. Header matching is keyword-based so it
// works across Blinkit / BigBasket / Instamart exports without a fixed schema.
import * as XLSX from "xlsx";

export type DatasetType = "sales" | "spends" | "pods";

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

export async function parseFile(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false, defval: "" });
  if (!matrix.length) return { headers: [], rows: [] };

  // First non-empty row is the header.
  const headerRowIdx = matrix.findIndex((r) => r.some((c) => String(c).trim() !== ""));
  const headers = (matrix[headerRowIdx] ?? []).map((h) => String(h).trim());
  const rows: Record<string, string>[] = [];
  for (let i = headerRowIdx + 1; i < matrix.length; i++) {
    const r = matrix[i];
    if (!r || r.every((c) => String(c).trim() === "")) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, j) => { obj[h] = String(r[j] ?? "").trim(); });
    rows.push(obj);
  }
  return { headers, rows };
}

// Canonical fields per dataset type. `required` drives validation.
export const FIELD_SPECS: Record<DatasetType, { key: string; label: string; required: boolean; keywords: string[] }[]> = {
  sales: [
    { key: "platform", label: "Platform", required: true, keywords: ["platform", "channel", "marketplace", "source"] },
    { key: "city", label: "City", required: true, keywords: ["city", "location", "market", "region", "town"] },
    { key: "sku_name", label: "SKU / Flavour", required: true, keywords: ["sku", "product", "flavour", "flavor", "item", "name", "variant"] },
    { key: "revenue", label: "Revenue", required: true, keywords: ["revenue", "gmv", "net sales", "value", "amount", "sales"] },
    { key: "units", label: "Units (optional)", required: false, keywords: ["units", "qty", "quantity", "orders"] },
    { key: "period", label: "Period (optional)", required: false, keywords: ["period", "week", "month", "date", "cycle"] },
  ],
  spends: [
    { key: "platform", label: "Platform", required: true, keywords: ["platform", "channel", "marketplace", "source"] },
    { key: "day", label: "Date", required: true, keywords: ["date", "day"] },
    { key: "spend", label: "Ad spend", required: true, keywords: ["spend", "ad spend", "marketing", "cost", "ad cost"] },
    { key: "sales", label: "Sales", required: true, keywords: ["sales", "revenue", "gmv", "value"] },
    { key: "a2s", label: "A2S (optional)", required: false, keywords: ["a2s", "acos", "roas", "ratio", "ad to sales"] },
  ],
  pods: [
    { key: "platform", label: "Platform", required: true, keywords: ["platform", "channel", "marketplace", "source"] },
    { key: "city", label: "City", required: true, keywords: ["city", "location", "market", "region"] },
    { key: "pod_count", label: "POD count", required: true, keywords: ["pod", "store", "outlet", "availability", "points", "count", "distribution", "darkstore"] },
    { key: "period", label: "Period (optional)", required: false, keywords: ["period", "week", "month", "date", "cycle"] },
  ],
};

// Best-guess header → field mapping. Returns { fieldKey: headerName }.
export function guessMapping(headers: string[], type: DatasetType): Record<string, string> {
  const specs = FIELD_SPECS[type];
  const used = new Set<string>();
  const map: Record<string, string> = {};
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  for (const spec of specs) {
    let best: { header: string; score: number } | null = null;
    for (const h of headers) {
      if (used.has(h)) continue;
      const nh = norm(h);
      let score = 0;
      for (const kw of spec.keywords) {
        if (nh === kw) score = Math.max(score, 3);
        else if (nh.includes(kw)) score = Math.max(score, 2);
        else if (kw.includes(" ") && kw.split(" ").every((p) => nh.includes(p))) score = Math.max(score, 2);
      }
      if (score > 0 && (!best || score > best.score)) best = { header: h, score };
    }
    if (best) { map[spec.key] = best.header; used.add(best.header); }
  }
  return map;
}

export function toNumber(v: string): number {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Normalise common platform spellings.
export function normalisePlatform(v: string): string {
  const s = (v || "").toLowerCase();
  if (s.includes("big") || s === "bb") return "Big Basket";
  if (s.includes("insta") || s.includes("swiggy")) return "Instamart";
  if (s.includes("blink")) return "Blinkit";
  if (s.includes("zepto")) return "Zepto";
  if (s.includes("amazon")) return "Amazon";
  return v?.trim() || "Unknown";
}

export function slugifySku(name: string): string {
  return "sku-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

// Parse a date cell (handles ISO, dd/mm/yyyy, Excel serials) → YYYY-MM-DD.
export function toIsoDate(v: string): string | null {
  if (!v) return null;
  const s = String(v).trim();
  const serial = Number(s);
  if (Number.isFinite(serial) && serial > 20000 && serial < 60000) {
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(serial) : null;
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString().slice(0, 10);
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? `20${yy}` : yy;
    return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return null;
}
