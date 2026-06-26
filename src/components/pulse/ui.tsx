import { motion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, MapPin, TrendingUp, Award, Sparkles, Settings, Activity, RefreshCw, ArrowUp, ArrowDown,
} from "lucide-react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ───────────────────────── Card ─────────────────────────
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

// ───────────────────────── CountUp ─────────────────────────
export function CountUp({ to, duration = 900, format }: { to: number; duration?: number; format?: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{format ? format(n) : Math.round(n).toLocaleString("en-IN")}</>;
}

// ───────────────────────── PulseDot ─────────────────────────
export function PulseDot({ tone = "good" }: { tone?: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "var(--accent-2)" : tone === "warn" ? "var(--accent)" : "var(--accent-3)";
  return (
    <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
      <span className="pulse-dot absolute inset-0 rounded-full" style={{ background: color, opacity: 0.4 }} />
      <span className="relative h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

// ───────────────────────── Sparkline ─────────────────────────
export function Sparkline({ data, color = "var(--accent)", height = 32 }: { data: number[]; color?: string; height?: number }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const w = 100, h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`spk-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#spk-${color})`} />
    </svg>
  );
}

// ───────────────────────── Delta ─────────────────────────
export function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium mono", positive ? "text-good" : "text-bad")}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

// ───────────────────────── KpiCard ─────────────────────────
export function KpiCard({ label, value, delta, spark, sparkColor, format, prefix }: {
  label: string;
  value: number | string;
  delta?: number;
  spark?: number[];
  sparkColor?: string;
  format?: (n: number) => string;
  prefix?: string;
}) {
  return (
    <Card className="p-4 transition-colors hover:bg-surface-2/50">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-text-dim">{label}</span>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <div className="mt-2 mono text-2xl font-semibold">
        {typeof value === "number" ? <>{prefix}<CountUp to={value} format={format} /></> : value}
      </div>
      {spark && <div className="mt-3 opacity-80"><Sparkline data={spark} color={sparkColor} /></div>}
    </Card>
  );
}

// ───────────────────────── PlatformSplitBar ─────────────────────────
export function PlatformSplitBar({ bb, insta, height = 6 }: { bb: number; insta: number; height?: number }) {
  const total = bb + insta || 1;
  const bbPct = (bb / total) * 100;
  return (
    <div className="flex w-full overflow-hidden rounded-full bg-surface-2" style={{ height }}>
      <div style={{ width: `${bbPct}%`, background: "var(--color-bb)" }} />
      <div style={{ width: `${100 - bbPct}%`, background: "var(--color-instamart)" }} />
    </div>
  );
}

// ───────────────────────── ScoreBadge ─────────────────────────
export function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "good" : score >= 60 ? "warn" : score >= 40 ? "neutral" : "bad";
  const cls =
    tone === "good" ? "border-good/30 bg-good/10 text-good" :
    tone === "warn" ? "border-accent/30 bg-accent/10 text-accent" :
    tone === "neutral" ? "border-border bg-surface-2 text-text-dim" :
    "border-bad/30 bg-bad/10 text-bad";
  return <span className={cn("mono inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold", cls)}>{score}</span>;
}

// ───────────────────────── HealthRing ─────────────────────────
export function HealthRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const color = score >= 75 ? "var(--accent-2)" : score >= 50 ? "var(--accent)" : "var(--accent-3)";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth="4" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center mono text-sm font-semibold">{score}</div>
    </div>
  );
}

// ───────────────────────── Sidebar + TopBar ─────────────────────────
const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/flavours", label: "Flavours", icon: Package },
  { to: "/cities", label: "Cities", icon: MapPin },
  { to: "/efficiency", label: "A2S Efficiency", icon: TrendingUp },
  { to: "/portfolio", label: "Portfolio", icon: Award },
  { to: "/mood-map", label: "Mood Map", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface/40">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="relative">
          <Activity className="h-5 w-5 text-accent" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-base font-semibold">PulseBoard</div>
          <div className="text-[10px] uppercase tracking-widest text-text-dim">MadMix</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-surface-2 text-foreground" : "text-text-dim hover:bg-surface-2/60 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-accent")} />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4 text-[11px] text-text-dim">
        <div className="flex items-center gap-2"><PulseDot tone="good" /> Live · synced 2 min ago</div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur grid grid-cols-7">
      {navItems.map((item) => {
        const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px]", active ? "text-accent" : "text-text-dim")}>
            <Icon className="h-4 w-4" />
            <span className="truncate">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function TopBar({ onRefresh, refreshing }: { onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-bg/80 px-4 md:px-6 backdrop-blur">
      <div className="flex items-center gap-3 min-w-0">
        <div className="md:hidden flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          <span className="font-display font-semibold">PulseBoard</span>
        </div>
        <span className="hidden md:inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-text-dim">Brand:</span>
          <span className="font-medium">MadMix</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-dim mono">
          Apr 01 – Apr 30, 2025
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh Mood Map
        </button>
      </div>
    </header>
  );
}

// ───────────────────────── PageHeader ─────────────────────────
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="mb-6 flex items-end justify-between gap-4 flex-wrap"
    >
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-dim">{subtitle}</p>}
      </div>
      {right}
    </motion.div>
  );
}

// ───────────────────────── StaggerGrid ─────────────────────────
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden" animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.04 } },
      }}
    >
      {children}
    </motion.div>
  );
}
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
    >
      {children}
    </motion.div>
  );
}
