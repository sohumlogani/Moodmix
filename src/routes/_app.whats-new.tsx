import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard, MapPin, TrendingUp, Award, Sparkles, UploadCloud, ArrowRight, Bell,
} from "lucide-react";
import { Card, PageHeader, Stagger, StaggerItem, cn } from "@/components/pulse/ui";
import { usePulse } from "@/components/pulse/PulseDataProvider";
import { computeAlerts } from "@/lib/alerts";

export const Route = createFileRoute("/_app/whats-new")({
  head: () => ({ meta: [{ title: "What's New — MoodMix" }] }),
  component: WhatsNew,
});

const TILES = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Revenue, A2S & KPIs at a glance" },
  { to: "/cities", label: "Stock & Cities", icon: MapPin, desc: "Where to replenish — AI ranked" },
  { to: "/mood-map", label: "Mood Board", icon: Sparkles, desc: "Customer voice + marketing ideas" },
  { to: "/portfolio", label: "Flavours", icon: Award, desc: "How each SKU is performing" },
  { to: "/efficiency", label: "A2S Efficiency", icon: TrendingUp, desc: "Ad spend per rupee, by platform" },
  { to: "/upload", label: "Upload Data", icon: UploadCloud, desc: "Drop a new export → instant refresh" },
] as const;

const toneCls: Record<string, string> = {
  bad: "border-bad/30 bg-bad/5 text-bad",
  warn: "border-accent/30 bg-accent/5 text-accent",
  good: "border-good/30 bg-good/5 text-good",
  info: "border-info/30 bg-info/5 text-info",
};

function WhatsNew() {
  const data = usePulse();
  const alerts = computeAlerts(data);

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <PageHeader
        title="What's New"
        subtitle="Everything that needs your attention, in one place."
      />

      <div>
        <h3 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-text-dim">
          <Bell className="h-4 w-4" />Needs your attention
        </h3>
        <Stagger className="space-y-2.5">
          {alerts.map((a, i) => {
            const Icon = a.icon;
            return (
              <StaggerItem key={i}>
                <Link to={a.to} className="block">
                  <Card className="p-4 card-hover hover:bg-surface-2/50 flex items-center gap-4">
                    <div className={cn("rounded-lg border p-2.5 shrink-0", toneCls[a.tone])}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{a.title}</div>
                      <p className="mt-0.5 text-xs text-text-dim leading-relaxed">{a.detail}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-text-dim shrink-0" />
                  </Card>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>

      <div>
        <h3 className="mb-3 font-display text-base font-semibold text-text-dim">Jump to</h3>
        <Stagger className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <StaggerItem key={t.to}>
                <Link to={t.to} className="block h-full">
                  <motion.div whileHover={{ y: -3 }} className="h-full">
                    <Card className="p-4 h-full transition-colors hover:bg-surface-2/50">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft border border-accent/20">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <div className="mt-3 font-medium text-sm">{t.label}</div>
                      <p className="mt-1 text-xs text-text-dim leading-snug">{t.desc}</p>
                    </Card>
                  </motion.div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </div>
  );
}
