import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";
import { Card, PageHeader, HealthRing, Stagger, StaggerItem, cn } from "@/components/pulse/ui";
import { usePulse } from "@/components/pulse/PulseDataProvider";
import { formatInr, skuColor } from "@/lib/format";

export const Route = createFileRoute("/_app/portfolio")({
  head: () => ({ meta: [{ title: "Flavours — MoodMix" }] }),
  component: PortfolioPage,
});

type Tag = "All" | "Hero" | "Growing" | "Stagnating" | "Needs push";
const tags: Tag[] = ["All", "Hero", "Growing", "Stagnating", "Needs push"];

function PortfolioPage() {
  const { skus, skuMetrics } = usePulse();
  const [filter, setFilter] = useState<Tag>("All");
  const items = useMemo(() => skus.map((s) => ({ ...s, ...skuMetrics[s.id] })).sort((a, b) => b.health - a.health), [skus, skuMetrics]);
  const filtered = filter === "All" ? items : items.filter((i) => i.tag === filter);
  const colorOf = (id: string) => skuColor(Math.max(0, skus.findIndex((s) => s.id === id)));

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader title="Flavours" subtitle="Every flavour, ranked by health — what's winning and what needs a push." />

      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs border transition-colors",
              filter === t ? "bg-accent text-primary-foreground border-accent" : "border-border bg-surface text-text-dim hover:text-foreground"
            )}
          >{t}</button>
        ))}
      </div>

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((s) => (
          <StaggerItem key={s.id}>
            <Card className="p-4 h-full transition-colors hover:bg-surface-2/50" style={{ borderLeft: `3px solid ${colorOf(s.id)}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-dim">
                    <span className="h-2 w-2 rounded-full" style={{ background: colorOf(s.id) }} />{s.category} · {s.size}
                  </div>
                  <div className="mt-1 font-medium text-sm leading-snug">{s.short}</div>
                </div>
                <HealthRing score={s.health} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <Indicator
                  label="Trend"
                  value={`${s.trend > 0 ? "+" : ""}${s.trend.toFixed(1)}%`}
                  icon={s.trend > 3 ? TrendingUp : s.trend < -3 ? TrendingDown : Minus}
                  tone={s.trend > 3 ? "good" : s.trend < -3 ? "bad" : "neutral"}
                />
                <Indicator label="Cities" value={`${s.cities}`} tone="neutral" />
                <Indicator label="A2S" value={s.a2s.toFixed(2)} tone={s.a2s < 0.4 ? "good" : s.a2s < 0.55 ? "warn" : "bad"} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="mono text-text-dim">{formatInr(s.revenue)}</span>
                <TagBadge tag={s.tag} />
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <UnitEconomics items={items} />
    </div>
  );
}

function Indicator({ label, value, icon: Icon, tone }: { label: string; value: string; icon?: any; tone: "good" | "bad" | "warn" | "neutral" }) {
  const cls =
    tone === "good" ? "text-good" :
    tone === "bad" ? "text-bad" :
    tone === "warn" ? "text-accent" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-surface-2/40 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-text-dim">{label}</div>
      <div className={cn("mono text-xs font-semibold mt-0.5 inline-flex items-center gap-1", cls)}>
        {Icon && <Icon className="h-3 w-3" />}{value}
      </div>
    </div>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const cls =
    tag === "Hero" ? "border-accent/40 bg-accent/10 text-accent" :
    tag === "Growing" ? "border-good/40 bg-good/10 text-good" :
    tag === "Stagnating" ? "border-border bg-surface-2 text-text-dim" :
    "border-bad/40 bg-bad/10 text-bad";
  return <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", cls)}>{tag}</span>;
}

// Dummy cost assumptions to show the true cost of quick-commerce per flavour.
// Tuned to realistic snack economics so most SKUs are healthy and only a few
// (high ad-spend ones) are loss-making.
const COGS_PCT = 0.28;   // cost of goods (ingredients + packaging)
const QCOM_PCT = 0.22;   // platform commission (~16%) + last-mile/handling (~6%)

function UnitEconomics({ items }: { items: any[] }) {
  const rows = items.map((s) => {
    const revenue = s.revenue || 0;
    const adCost = s.a2s * revenue;
    const cogs = COGS_PCT * revenue;
    const qcom = QCOM_PCT * revenue;
    const totalCost = cogs + qcom + adCost;
    const net = revenue - totalCost;
    const burn = revenue ? totalCost / revenue : 0;
    const marginPct = revenue ? (net / revenue) * 100 : 0;
    return { id: s.id, short: s.short, revenue, adCost, cogs, qcom, net, burn, marginPct, profitable: net > 0 };
  }).sort((a, b) => a.marginPct - b.marginPct);
  const losers = rows.filter((r) => !r.profitable);
  const thin = rows.filter((r) => r.profitable && r.burn > 0.92);
  const loss = losers.length;

  const suggestions: string[] = [];
  for (const r of losers) {
    suggestions.push(`${r.short} is loss-making (burn ${r.burn.toFixed(2)}×) — ad spend is the culprit. Cut its A2S to ≤0.40, lean on organic/UGC, or lift MRP ~8-10%. If still red, pause it on the highest-commission platform.`);
  }
  if (thin.length) {
    suggestions.push(`${thin.map((t) => t.short).join(", ")} ${thin.length > 1 ? "are" : "is"} wafer-thin — a small commission renegotiation or COGS saving flips ${thin.length > 1 ? "them" : "it"} to healthy profit.`);
  }
  suggestions.push("Reallocate ad budget away from loss-making SKUs into your top-margin flavours — same spend, better blended margin.");
  suggestions.push("Bundle thin-margin SKUs with hero SKUs (combo packs) to raise average order value and dilute per-unit platform fees.");
  suggestions.push("Once a hero SKU crosses ~5k units/mo on a platform, renegotiate the commission slab — the single biggest lever on quick-commerce margin.");

  return (
    <Card className="p-5">
      <h3 className="font-display text-base font-semibold">Unit Economics · Quick-commerce burn</h3>
      <p className="text-xs text-text-dim mt-0.5">
        What's left per flavour after quick-commerce takes its cut. {loss > 0 ? `${loss} SKU${loss > 1 ? "s are" : " is"} loss-making at these costs.` : "All SKUs profitable at these costs."}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-text-dim border-b border-border">
              <th className="py-2.5 pr-4">Flavour</th>
              <th className="py-2.5 px-3 text-right">Revenue</th>
              <th className="py-2.5 px-3 text-right">COGS</th>
              <th className="py-2.5 px-3 text-right">Q-com cost</th>
              <th className="py-2.5 px-3 text-right">Ad spend</th>
              <th className="py-2.5 px-3 text-right">Net</th>
              <th className="py-2.5 px-3 text-right">Burn</th>
              <th className="py-2.5 pl-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="py-2.5 pr-4">{r.short}</td>
                <td className="py-2.5 px-3 text-right mono">{formatInr(r.revenue)}</td>
                <td className="py-2.5 px-3 text-right mono text-text-dim">{formatInr(r.cogs)}</td>
                <td className="py-2.5 px-3 text-right mono text-text-dim">{formatInr(r.qcom)}</td>
                <td className="py-2.5 px-3 text-right mono text-text-dim">{formatInr(r.adCost)}</td>
                <td className={cn("py-2.5 px-3 text-right mono font-semibold", r.net >= 0 ? "text-good" : "text-bad")}>{r.net >= 0 ? "" : "−"}{formatInr(Math.abs(r.net))}</td>
                <td className={cn("py-2.5 px-3 text-right mono", r.burn > 1 ? "text-bad" : "text-foreground")}>{r.burn.toFixed(2)}×</td>
                <td className="py-2.5 pl-3 text-right">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", r.profitable ? "border-good/40 bg-good/10 text-good" : "border-bad/40 bg-bad/10 text-bad")}>
                    {r.profitable ? "Profit" : "Loss"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-text-dim/70 leading-relaxed">
        Dummy assumptions — COGS ≈ {Math.round(COGS_PCT * 100)}% of revenue, quick-commerce commission + last-mile ≈ {Math.round(QCOM_PCT * 100)}%, ad spend = each SKU's A2S. Burn = total cost ÷ revenue (above 1.00× = burning cash). Replace with the owner's real costs when available.
      </p>

      <div className="mt-5 border-t border-border pt-4">
        <h4 className="font-display text-sm font-semibold flex items-center gap-2 mb-2"><Lightbulb className="h-4 w-4 text-accent" />Suggestions</h4>
        <div className="space-y-1.5">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-surface-2/40 p-2.5 text-xs leading-relaxed">
              <span className="text-accent shrink-0">•</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
