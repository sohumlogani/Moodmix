import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react";
import { Card, PageHeader, ScoreBadge, PlatformSplitBar, cn, Delta } from "@/components/pulse/ui";
import { usePulse } from "@/components/pulse/PulseDataProvider";
import { formatInr, formatInrFull } from "@/lib/format";

export const Route = createFileRoute("/_app/cities")({
  head: () => ({ meta: [{ title: "City Intelligence — PulseBoard" }] }),
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
      <PageHeader title="City Intelligence" subtitle="Distribution health and opportunity ranked across 18 cities" />

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
