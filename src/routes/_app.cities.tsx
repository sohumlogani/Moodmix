import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, X, AlertTriangle, PackagePlus, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Card, PageHeader, ScoreBadge, PlatformSplitBar, cn, Delta } from "@/components/pulse/ui";
import { usePulse } from "@/components/pulse/PulseDataProvider";
import { formatInr, formatInrFull } from "@/lib/format";
import { stockRiskSummary, type StockRiskResult } from "@/lib/stockrisk";

export const Route = createFileRoute("/_app/cities")({
  head: () => ({ meta: [{ title: "City Intelligence — MoodMix" }] }),
  component: CitiesPage,
});

type SortKey = "revenue" | "pods" | "perPod" | "opportunity";

function CitiesPage() {
  const { cities } = usePulse();
  const [sort, setSort] = useState<SortKey>("revenue");
  const [desc, setDesc] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const enriched = useMemo(() => cities.map((c) => ({
    ...c,
    perPod: c.revenue / c.pods,
    podsDelta: ((c.pods - c.podsPrev) / c.podsPrev) * 100,
  })), [cities]);

  const sorted = useMemo(() => [...enriched].sort((a, b) => {
    const av = a[sort], bv = b[sort];
    return desc ? bv - av : av - bv;
  }), [enriched, sort, desc]);

  const sel = selected ? enriched.find((c) => c.name === selected) : null;

  const toggle = (k: SortKey) => { if (sort === k) setDesc(!desc); else { setSort(k); setDesc(true); } };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader title="City Intelligence" subtitle={`Distribution health and opportunity ranked across ${cities.length} cities`} />

      <StockRiskCard cities={enriched} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-text-dim border-b border-border">
                  <th className="py-3 px-4">City</th>
                  <Th k="revenue" sort={sort} desc={desc} onClick={toggle}>Revenue</Th>
                  <Th k="pods" sort={sort} desc={desc} onClick={toggle}>PODs</Th>
                  <Th k="perPod" sort={sort} desc={desc} onClick={toggle}>₹/POD</Th>
                  <th className="py-3 px-4">Platform Mix</th>
                  <Th k="opportunity" sort={sort} desc={desc} onClick={toggle}>Opportunity</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c, i) => (
                  <motion.tr
                    key={c.name}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    onClick={() => setSelected(c.name)}
                    className={cn(
                      "border-b border-border/50 cursor-pointer transition-colors hover:bg-surface-2",
                      selected === c.name && "bg-surface-2"
                    )}
                  >
                    <td className="py-3 px-4">{c.name}</td>
                    <td className="py-3 px-4 mono">{formatInr(c.revenue)}</td>
                    <td className="py-3 px-4 mono text-text-dim">{(c.pods / 1000).toFixed(1)}k</td>
                    <td className="py-3 px-4 mono">₹{c.perPod.toFixed(2)}</td>
                    <td className="py-3 px-4 w-40"><PlatformSplitBar bb={c.bbRev} insta={c.instaRev} /></td>
                    <td className="py-3 px-4"><ScoreBadge score={c.opportunity} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div>
          {sel ? <CityDetail city={sel} onClose={() => setSelected(null)} /> : (
            <Card className="p-6 text-center text-sm text-text-dim h-full flex flex-col items-center justify-center min-h-[300px]">
              <div className="mb-2 text-accent text-xs uppercase tracking-wider">Tip</div>
              Click any city in the table to drill in
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StockRiskCard({ cities }: { cities: any[] }) {
  const [res, setRes] = useState<StockRiskResult | null>(null);
  const [loading, setLoading] = useState(true);

  const run = async () => {
    setLoading(true);
    try {
      const input = cities.map((c) => ({
        city: c.name, revenue: c.revenue, pods: c.pods, podsPrev: c.podsPrev,
        perPod: c.perPod, podsDelta: c.podsDelta, opportunity: c.opportunity,
      }));
      setRes(await stockRiskSummary({ data: input }));
    } catch (err) {
      console.error("Stock risk failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const levelCls = (l: string) =>
    l === "high" ? "border-bad/40 bg-bad/10 text-bad" :
    l === "medium" ? "border-accent/40 bg-accent/10 text-accent" :
    "border-good/40 bg-good/10 text-good";

  return (
    <Card className="p-5 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md border border-accent/40 bg-accent/10 p-2"><Sparkles className="h-4 w-4 text-accent" /></div>
          <div>
            <h3 className="font-display text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" />Stock Risk · Replenishment
            </h3>
            <p className="text-xs text-text-dim mt-0.5">AI ranks where demand is outrunning distribution — replenish these first.</p>
          </div>
        </div>
        <button onClick={run} disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-dim transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {loading && !res ? (
        <div className="flex items-center gap-2 text-sm text-text-dim py-2"><Loader2 className="h-4 w-4 animate-spin" />Analysing distribution vs demand…</div>
      ) : res && res.items.length ? (
        <>
          <p className="text-sm leading-relaxed mb-3">{res.headline}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {res.items.map((it) => (
              <div key={it.city} className="rounded-lg border border-border bg-surface/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{it.city}</span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", levelCls(it.level))}>{it.level}</span>
                </div>
                <p className="mt-1.5 text-xs text-text-dim leading-relaxed">{it.reason}</p>
                <div className="mt-2 flex items-start gap-1.5 text-xs text-accent">
                  <PackagePlus className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{it.action}</span>
                </div>
              </div>
            ))}
          </div>
          {res.source === "fallback" && (
            <p className="mt-3 text-[11px] text-text-dim">Heuristic ranking · add ANTHROPIC_API_KEY for Claude-written analysis.</p>
          )}
        </>
      ) : (
        <p className="text-sm text-text-dim">Upload distribution data to see replenishment priorities.</p>
      )}
    </Card>
  );
}

function Th({ children, k, sort, desc, onClick }: any) {
  const active = sort === k;
  return (
    <th onClick={() => onClick(k)} className="py-3 px-4 cursor-pointer select-none hover:text-foreground">
      <span className="inline-flex items-center gap-1">
        {children}
        {active ? (desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}

function CityDetail({ city, onClose }: { city: any; onClose: () => void }) {
  const { skus, skuMetrics } = usePulse();
  const topSkus = [...skus].map((s) => ({ ...s, ...skuMetrics[s.id] })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const recommendation = city.perPod > 1
    ? "Under-distributed: high revenue per POD — expand POD count by 15–20%."
    : city.opportunity > 70
    ? "Buzz outpaces distribution — push Instamart inventory ahead of next 4-week trend."
    : "Balanced. Maintain spend mix and monitor weekly.";

  return (
    <motion.div key={city.name} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <Card className="p-5 sticky top-20">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">City detail</div>
            <h3 className="font-display text-xl font-semibold mt-1">{city.name}</h3>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Mini label="Revenue" value={formatInrFull(city.revenue)} />
          <Mini label="PODs" value={`${(city.pods / 1000).toFixed(1)}k`} />
          <Mini label="₹ / POD" value={`₹${city.perPod.toFixed(2)}`} />
          <Mini label="Opportunity">
            <ScoreBadge score={city.opportunity} />
          </Mini>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-text-dim mb-2">PODs vs last period</div>
          <div className="flex items-center gap-2">
            <Delta value={city.podsDelta} />
            <span className="text-xs text-text-dim mono">{(city.podsPrev / 1000).toFixed(1)}k → {(city.pods / 1000).toFixed(1)}k</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-text-dim mb-2">Platform split</div>
          <PlatformSplitBar bb={city.bbRev} insta={city.instaRev} height={8} />
          <div className="mt-1.5 flex justify-between text-[11px] mono">
            <span className="text-bb">BB {formatInr(city.bbRev)}</span>
            <span style={{ color: "var(--color-instamart)" }}>Insta {formatInr(city.instaRev)}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-text-dim mb-2">Top SKUs in city</div>
          <div className="space-y-1.5">
            {topSkus.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs">
                <span className="truncate">{s.short}</span>
                <span className="mono text-text-dim shrink-0">{formatInr(s.revenue * (city.revenue / 300000))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-md border border-accent/30 bg-accent/5 p-3">
          <div className="text-[10px] uppercase tracking-wider text-accent mb-1">Recommendation</div>
          <p className="text-sm leading-relaxed">{recommendation}</p>
        </div>
      </Card>
    </motion.div>
  );
}

function Mini({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-text-dim">{label}</div>
      <div className="mt-0.5 mono text-base font-semibold">{value ?? children}</div>
    </div>
  );
}
