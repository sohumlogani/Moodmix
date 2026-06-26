import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell,
} from "recharts";
import { Card, KpiCard, PageHeader, Stagger, StaggerItem, ScoreBadge, PlatformSplitBar, cn } from "@/components/pulse/ui";
import { PulseStrip } from "@/components/pulse/PulseStrip";
import { usePulse } from "@/components/pulse/PulseDataProvider";
import { formatInr, formatInrFull, PLATFORM_COLORS } from "@/lib/format";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PulseBoard" }] }),
  component: Dashboard,
});

const chartTooltipStyle = {
  background: "#181B21",
  border: "1px solid #2A2F38",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "JetBrains Mono, monospace",
  color: "#ECEDEF",
};

function Dashboard() {
  const { kpis, dailyMetrics, skus, skuMetrics, cities } = usePulse();
  const topSkus = [...skus]
    .map((s) => ({ ...s, ...skuMetrics[s.id] }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const topCities = [...cities].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const sparkBb = dailyMetrics.map((d) => d.bbSales);
  const sparkInsta = dailyMetrics.map((d) => d.instaSales);

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader
        title="Demand Command Centre"
        subtitle="Big Basket × Instamart · last 30 days · live"
      />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PulseStrip />
      </motion.div>

      <Stagger className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StaggerItem><KpiCard label="Total Revenue" value={kpis.totalRevenue} format={(n) => formatInr(n)} delta={kpis.revenueChange} spark={sparkBb.map((v, i) => v + sparkInsta[i])} sparkColor="var(--accent)" /></StaggerItem>
        <StaggerItem><KpiCard label="Avg A2S" value={kpis.avgA2s} format={(n) => n.toFixed(3)} delta={kpis.a2sChange} spark={dailyMetrics.map((d) => (d.bbSpend + d.instaSpend) / (d.bbSales + d.instaSales))} sparkColor="var(--accent-2)" /></StaggerItem>
        <StaggerItem><KpiCard label="Active SKUs" value={kpis.activeSkus} delta={6.2} spark={[8, 9, 10, 11, 12, 13]} sparkColor="var(--accent-4)" /></StaggerItem>
        <StaggerItem><KpiCard label="Cities Covered" value={kpis.citiesCovered} delta={5.5} spark={[12, 13, 14, 16, 17, 18]} sparkColor="var(--accent-4)" /></StaggerItem>
        <StaggerItem><KpiCard label="Total PODs" value={kpis.totalPods} format={(n) => `${(n / 1000).toFixed(1)}k`} delta={kpis.podsChange} spark={[280, 285, 290, 295, 298, 305].map((x) => x * 1000)} sparkColor="var(--accent-2)" /></StaggerItem>
        <StaggerItem>
          <Card className="p-4 h-full">
            <div className="text-xs uppercase tracking-wider text-text-dim">Top Platform</div>
            <div className="mt-2 mono text-2xl font-semibold">Big Basket</div>
            <div className="mt-3 text-xs text-text-dim mono">
              ₹{(kpis.bbRevenue / 1000).toFixed(1)}k vs ₹{(kpis.instaRevenue / 1000).toFixed(1)}k
            </div>
            <div className="mt-2"><PlatformSplitBar bb={kpis.bbRevenue} insta={kpis.instaRevenue} /></div>
          </Card>
        </StaggerItem>
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-semibold">Revenue by Platform</h3>
              <p className="text-xs text-text-dim mt-0.5">Daily revenue · last 30 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLORS["Big Basket"] }} />Big Basket</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLORS.Instamart }} />Instamart</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyMetrics} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="bbA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PLATFORM_COLORS["Big Basket"]} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={PLATFORM_COLORS["Big Basket"]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="inA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PLATFORM_COLORS.Instamart} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={PLATFORM_COLORS.Instamart} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2A2F38" vertical={false} />
              <XAxis dataKey="date" stroke="#8B919C" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#8B919C" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatInrFull(v)} />
              <Area type="monotone" dataKey="bbSales" stroke={PLATFORM_COLORS["Big Basket"]} fill="url(#bbA)" strokeWidth={2} name="Big Basket" />
              <Area type="monotone" dataKey="instaSales" stroke={PLATFORM_COLORS.Instamart} fill="url(#inA)" strokeWidth={2} name="Instamart" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-display text-base font-semibold mb-1">Top 5 Flavours</h3>
          <p className="text-xs text-text-dim mb-4">By revenue · platform split</p>
          <div className="space-y-3">
            {topSkus.map((s, i) => (
              <div key={s.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    <span className="mono text-text-dim w-4">{i + 1}</span>
                    <span className="truncate">{s.short}</span>
                  </span>
                  <span className="mono shrink-0">{formatInr(s.revenue)}</span>
                </div>
                <PlatformSplitBar bb={s.revenue * s.bbShare} insta={s.revenue * (1 - s.bbShare)} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-semibold">Revenue Velocity</h3>
              <p className="text-xs text-text-dim mt-0.5">Combined daily revenue volume</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyMetrics} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#2A2F38" vertical={false} />
              <XAxis dataKey="date" stroke="#8B919C" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#8B919C" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatInrFull(v)} />
              <Bar dataKey="bbSales" stackId="a" fill={PLATFORM_COLORS["Big Basket"]} radius={[0, 0, 0, 0]} />
              <Bar dataKey="instaSales" stackId="a" fill={PLATFORM_COLORS.Instamart} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="font-display text-base font-semibold mb-1">Top 5 Cities</h3>
          <p className="text-xs text-text-dim mb-4">Ranked by revenue · opportunity</p>
          <div className="space-y-2">
            {topCities.map((c, i) => (
              <div key={c.name} className={cn("flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-surface-2")}>
                <span className="flex items-center gap-3 min-w-0">
                  <span className="mono text-text-dim w-4">{i + 1}</span>
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="mono text-text-dim text-xs">{formatInr(c.revenue)}</span>
                  <ScoreBadge score={c.opportunity} />
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
