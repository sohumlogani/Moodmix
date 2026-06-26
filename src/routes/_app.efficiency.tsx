import { createFileRoute } from "@tanstack/react-router";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { Lightbulb } from "lucide-react";
import { Card, PageHeader, cn } from "@/components/pulse/ui";
import { usePulse } from "@/components/pulse/PulseDataProvider";
import { PLATFORM_COLORS } from "@/lib/format";

export const Route = createFileRoute("/_app/efficiency")({
  head: () => ({ meta: [{ title: "A2S Efficiency — PulseBoard" }] }),
  component: EfficiencyPage,
});

const tooltipStyle = { background: "#181B21", border: "1px solid #2A2F38", borderRadius: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "#ECEDEF" };

function status(a2s: number) {
  if (a2s < 0.4) return { label: "Efficient", tone: "good" } as const;
  if (a2s < 0.55) return { label: "Watch", tone: "warn" } as const;
  return { label: "Overspending", tone: "bad" } as const;
}

function rolling(values: number[], w = 7) {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - w + 1), i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

function EfficiencyPage() {
  const { kpis, dailyMetrics } = usePulse();
  const bbDaily = dailyMetrics.map((d) => d.bbA2s);
  const instaDaily = dailyMetrics.map((d) => d.instaA2s);
  const bbRolling = rolling(bbDaily);
  const instaRolling = rolling(instaDaily);
  const bbStatus = status(kpis.bbA2s);
  const instaStatus = status(kpis.instaA2s);

  const chartData = dailyMetrics.map((d, i) => ({
    date: d.date, "Big Basket": d.bbA2s, Instamart: d.instaA2s, "BB 7d": +bbRolling[i].toFixed(3), "Insta 7d": +instaRolling[i].toFixed(3),
  }));

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader title="A2S Efficiency Engine" subtitle="Ad spend per rupee of revenue, by platform · last 30 days" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlatformCard name="Big Basket" color={PLATFORM_COLORS["Big Basket"]} a2s={kpis.bbA2s} rolling={bbRolling[bbRolling.length - 1]} status={bbStatus} />
        <PlatformCard name="Instamart" color={PLATFORM_COLORS.Instamart} a2s={kpis.instaA2s} rolling={instaRolling[instaRolling.length - 1]} status={instaStatus} />
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-display text-base font-semibold">Daily A2S</h3>
            <p className="text-xs text-text-dim mt-0.5">Threshold line at 0.50 · lower is more efficient</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLORS["Big Basket"] }} />Big Basket</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLORS.Instamart }} />Instamart</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-px w-3 bg-accent" />Threshold</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#2A2F38" vertical={false} />
            <XAxis dataKey="date" stroke="#8B919C" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#8B919C" fontSize={10} tickLine={false} axisLine={false} domain={[0, 1]} />
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine y={0.5} stroke="var(--accent)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="Big Basket" stroke={PLATFORM_COLORS["Big Basket"]} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Instamart" stroke={PLATFORM_COLORS.Instamart} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="BB 7d" stroke={PLATFORM_COLORS["Big Basket"]} strokeWidth={1} strokeDasharray="3 3" dot={false} />
            <Line type="monotone" dataKey="Insta 7d" stroke={PLATFORM_COLORS.Instamart} strokeWidth={1} strokeDasharray="3 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
        <div className="flex items-start gap-4">
          <div className="rounded-md border border-accent/40 bg-accent/10 p-2.5">
            <Lightbulb className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-accent">Budget recommendation</div>
            <p className="mt-1 text-base leading-relaxed">
              Instamart A2S is running at <span className="mono font-semibold">{kpis.instaA2s.toFixed(2)}</span> — above efficient threshold.
              Consider shifting ad budget to Big Basket where every <span className="mono">₹1</span> currently returns
              <span className="mono font-semibold text-good"> ₹{(1 / kpis.bbA2s).toFixed(2)}</span> vs Instamart's <span className="mono"> ₹{(1 / kpis.instaA2s).toFixed(2)}</span>.
            </p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <Pill label="Estimated revenue lift" value="+₹38k / mo" tone="good" />
              <Pill label="Recommended shift" value="₹12k / week" />
              <Pill label="Confidence" value="High · 6w data" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PlatformCard({ name, color, a2s, rolling, status }: { name: string; color: string; a2s: number; rolling: number; status: { label: string; tone: "good" | "warn" | "bad" } }) {
  const toneCls =
    status.tone === "good" ? "border-good/30 bg-good/10 text-good" :
    status.tone === "warn" ? "border-accent/30 bg-accent/10 text-accent" :
    "border-bad/30 bg-bad/10 text-bad";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          <span className="font-medium">{name}</span>
        </span>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", toneCls)}>{status.label}</span>
      </div>
      <div className="mt-4 mono text-5xl font-semibold">{a2s.toFixed(2)}</div>
      <div className="mt-1 text-xs text-text-dim">A2S · ad spend / sales</div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <div>
          <div className="text-text-dim text-[10px] uppercase tracking-wider">7-day rolling</div>
          <div className="mono mt-0.5 font-semibold">{rolling.toFixed(3)}</div>
        </div>
        <div className="text-right">
          <div className="text-text-dim text-[10px] uppercase tracking-wider">₹ back per ₹1 spend</div>
          <div className="mono mt-0.5 font-semibold text-good">₹{(1 / a2s).toFixed(2)}</div>
        </div>
      </div>
    </Card>
  );
}

function Pill({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-text-dim">{label}</div>
      <div className={cn("mono mt-0.5 text-sm font-semibold", tone === "good" && "text-good")}>{value}</div>
    </div>
  );
}
