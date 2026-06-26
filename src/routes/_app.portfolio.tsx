import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, PageHeader, HealthRing, Stagger, StaggerItem, cn } from "@/components/pulse/ui";
import { usePulse } from "@/components/pulse/PulseDataProvider";
import { formatInr } from "@/lib/format";

export const Route = createFileRoute("/_app/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio Scorecard — PulseBoard" }] }),
  component: PortfolioPage,
});

type Tag = "All" | "Hero" | "Growing" | "Stagnating" | "Needs push";
const tags: Tag[] = ["All", "Hero", "Growing", "Stagnating", "Needs push"];

function PortfolioPage() {
  const { skus, skuMetrics } = usePulse();
  const [filter, setFilter] = useState<Tag>("All");
  const items = useMemo(() => skus.map((s) => ({ ...s, ...skuMetrics[s.id] })).sort((a, b) => b.health - a.health), [skus, skuMetrics]);
  const filtered = filter === "All" ? items : items.filter((i) => i.tag === filter);

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader title="SKU Portfolio Scorecard" subtitle="Health = revenue trend × distribution breadth × A2S efficiency" />

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
            <Card className="p-4 h-full transition-colors hover:bg-surface-2/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-text-dim">{s.category} · {s.size}</div>
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
