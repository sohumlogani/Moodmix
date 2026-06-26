import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Card, PageHeader, cn, Delta } from "@/components/pulse/ui";
import { usePulse } from "@/components/pulse/PulseDataProvider";
import { formatInr, formatInrFull, PLATFORM_COLORS } from "@/lib/format";

export const Route = createFileRoute("/_app/flavours")({
  head: () => ({ meta: [{ title: "Flavours — PulseBoard" }] }),
  component: Flavours,
});

const chartTooltipStyle = {
  background: "#181B21", border: "1px solid #2A2F38", borderRadius: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "#ECEDEF",
};

function Flavours() {
  const { skus, skuMetrics, cities, dailyMetrics } = usePulse();
  const [selected, setSelected] = useState(skus[0].id);
  const [q, setQ] = useState("");
  const filtered = skus.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
  const sku = skus.find((s) => s.id === selected)!;
  const m = skuMetrics[selected];
  const rank = [...skus].map((s) => ({ id: s.id, rev: skuMetrics[s.id].revenue })).sort((a, b) => b.rev - a.rev).findIndex((s) => s.id === selected) + 1;

  // synth trend
  const trend = dailyMetrics.map((d, i) => ({
    date: d.date,
    revenue: Math.round((m.revenue / 30) * (0.7 + Math.sin(i * 0.4) * 0.25 + (i / 30) * (m.trend / 50))),
  }));
  // city breakdown — share by city revenue weights
  const totalCityRev = cities.reduce((s, c) => s + c.revenue, 0);
  const cityBreak = cities.slice(0, 8).map((c) => ({
    city: c.name.split("-")[0],
    revenue: Math.round((c.revenue / totalCityRev) * m.revenue * (0.7 + Math.random() * 0.6)),
  }));

  const pieData = [
    { name: "Big Basket", value: Math.round(m.revenue * m.bbShare) },
    { name: "Instamart", value: Math.round(m.revenue * (1 - m.bbShare)) },
  ];

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader title="Flavour Deep-Dive" subtitle="SKU-level velocity, platform split and cannibalisation signals" />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card className="p-3">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search flavours…"
              className="w-full rounded-md bg-surface-2 border border-border pl-8 pr-3 py-2 text-sm outline-none focus:border-accent/50"
            />
          </div>
          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map((s) => {
              const meta = skuMetrics[s.id];
              const active = s.id === selected;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    "w-full text-left rounded-md px-3 py-2 transition-colors",
                    active ? "bg-accent/10 border border-accent/30" : "border border-transparent hover:bg-surface-2"
                  )}
                >
                  <div className="text-sm truncate">{s.short}</div>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-text-dim mono">
                    <span>{formatInr(meta.revenue)}</span>
                    <Delta value={meta.trend} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <motion.div key={selected} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-text-dim">{sku.category} · {sku.size}</div>
                <h2 className="font-display text-2xl font-semibold mt-1">{sku.name}</h2>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Stat label="Period revenue" value={formatInrFull(m.revenue)} />
                <Stat label="Trend" value={`${m.trend > 0 ? "+" : ""}${m.trend.toFixed(1)}%`} tone={m.trend >= 0 ? "good" : "bad"} />
                <Stat label="Velocity rank" value={`#${rank}`} />
                <Stat label="A2S" value={m.a2s.toFixed(2)} tone={m.a2s < 0.4 ? "good" : m.a2s < 0.55 ? "warn" : "bad"} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-5">
              <h3 className="font-display text-base font-semibold mb-1">Revenue Trend</h3>
              <p className="text-xs text-text-dim mb-4">Daily revenue · last 30 days</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend}>
                  <CartesianGrid stroke="#2A2F38" vertical={false} />
                  <XAxis dataKey="date" stroke="#8B919C" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8B919C" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatInrFull(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <h3 className="font-display text-base font-semibold mb-1">Platform Split</h3>
              <p className="text-xs text-text-dim mb-4">Big Basket vs Instamart</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={i === 0 ? PLATFORM_COLORS["Big Basket"] : PLATFORM_COLORS.Instamart} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatInrFull(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-around text-xs">
                <div><div className="mono font-semibold">{Math.round(m.bbShare * 100)}%</div><div className="text-text-dim">BB</div></div>
                <div><div className="mono font-semibold">{Math.round((1 - m.bbShare) * 100)}%</div><div className="text-text-dim">Insta</div></div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-5">
              <h3 className="font-display text-base font-semibold mb-1">City Breakdown</h3>
              <p className="text-xs text-text-dim mb-4">Revenue contribution by city</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cityBreak} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid stroke="#2A2F38" horizontal={false} />
                  <XAxis type="number" stroke="#8B919C" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="city" stroke="#8B919C" fontSize={10} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatInrFull(v)} />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <h3 className="font-display text-base font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-accent" />Cannibalisation Signal</h3>
              <div className="rounded-md border border-accent/30 bg-accent/5 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-accent">
                  {m.trend > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {m.trend > 0 ? "Rising" : "Falling"}
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  {m.trend > 5
                    ? `${sku.short} rising in Bangalore while Cream Onion Puffs falls — possible cannibalisation within the puffs portfolio.`
                    : m.trend < -5
                    ? `${sku.short} declining in 3 cities while category peers grow — risk of demand shift to competitors.`
                    : `Stable share. No cannibalisation detected across the puffs / bhujia portfolio.`}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Stat label="Cities active" value={`${m.cities}`} />
                <Stat label="Health" value={`${m.health}`} tone={m.health >= 75 ? "good" : m.health >= 50 ? "warn" : "bad"} />
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2 min-w-[100px]">
      <div className="text-[10px] uppercase tracking-wider text-text-dim">{label}</div>
      <div className={cn("mono text-base font-semibold mt-0.5",
        tone === "good" && "text-good", tone === "warn" && "text-accent", tone === "bad" && "text-bad",
      )}>{value}</div>
    </div>
  );
}
