import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, MapPin, Zap } from "lucide-react";
import { Card, PulseDot, cn } from "./ui";
import { usePulse } from "./PulseDataProvider";

type Signal = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: { dir: "up" | "down"; text: string };
  tone: "good" | "warn" | "bad";
  status: string;
};

function a2sTone(v: number): "good" | "warn" | "bad" {
  return v < 0.4 ? "good" : v < 0.55 ? "warn" : "bad";
}

export function PulseStrip() {
  const { kpis, skus, skuMetrics, cities } = usePulse();

  const topMover = [...skus]
    .map((s) => ({ short: s.short, trend: skuMetrics[s.id]?.trend ?? 0 }))
    .sort((a, b) => b.trend - a.trend)[0];
  const topCity = [...cities].sort((a, b) => b.opportunity - a.opportunity)[0];

  const signals: Signal[] = [
    {
      icon: Zap, label: "Big Basket A2S", value: kpis.bbA2s.toFixed(2),
      tone: a2sTone(kpis.bbA2s), status: a2sTone(kpis.bbA2s) === "good" ? "Healthy" : "Watch",
    },
    {
      icon: Zap, label: "Instamart A2S", value: kpis.instaA2s.toFixed(2),
      tone: a2sTone(kpis.instaA2s), status: a2sTone(kpis.instaA2s) === "good" ? "Healthy" : "Watch",
    },
    {
      icon: ArrowUp, label: "Top mover", value: topMover?.short ?? "—",
      delta: topMover ? { dir: topMover.trend >= 0 ? "up" : "down", text: `${Math.abs(topMover.trend).toFixed(0)}%` } : undefined,
      tone: "good", status: "Surging",
    },
    {
      icon: MapPin, label: "Top opportunity", value: topCity?.name ?? "—",
      tone: "warn", status: "Act now",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
      {/* Radial glow */}
      <div
        className="hero-glow pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[140%] rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(232,160,61,0.25), transparent 60%)" }}
      />
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {signals.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex flex-col gap-2 p-4 md:p-5"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-text-dim">
                  <PulseDot tone={s.tone} />
                  {s.label}
                </span>
                <Icon className="h-3.5 w-3.5 text-text-dim" />
              </div>
              <div className="mono text-xl md:text-2xl font-semibold truncate">{s.value}</div>
              <div className="flex items-center justify-between text-[11px]">
                <span className={cn(
                  "rounded-full px-2 py-0.5 font-medium border",
                  s.tone === "good" && "border-good/30 bg-good/10 text-good",
                  s.tone === "warn" && "border-accent/30 bg-accent/10 text-accent",
                  s.tone === "bad" && "border-bad/30 bg-bad/10 text-bad",
                )}>
                  {s.status}
                </span>
                {s.delta && (
                  <span className={cn("mono inline-flex items-center gap-0.5", s.delta.dir === "up" ? "text-good" : "text-bad")}>
                    {s.delta.dir === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {s.delta.text}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
