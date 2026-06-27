import { motion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, MapPin, TrendingUp, Award, Sparkles, Settings, Activity, RefreshCw, ArrowUp, ArrowDown, LogOut, UploadCloud, Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePulseStatus } from "./PulseDataProvider";

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
  { to: "/cities", label: "Cities", icon: MapPin },
  { to: "/efficiency", label: "A2S Efficiency", icon: TrendingUp },
  { to: "/portfolio", label: "Flavours", icon: Award },
  { to: "/mood-map", label: "Mood Board", icon: Sparkles },
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { live } = usePulseStatus();
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface/40">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft border border-accent/20">
          <Activity className="h-4 w-4 text-accent" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-base font-semibold tracking-tight">MoodMix</div>
          <div className="text-[10px] uppercase tracking-widest text-text-dim">MadMix</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4">
        <Link
          to="/whats-new"
          className={cn(
            "group relative mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            pathname === "/whats-new" ? "text-foreground" : "text-text-dim hover:bg-surface-2/50 hover:text-foreground"
          )}
        >
          {pathname === "/whats-new" && (
            <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-surface-2 border border-border" transition={{ type: "spring", stiffness: 480, damping: 38 }} />
          )}
          <Bell className={cn("relative h-4 w-4", pathname === "/whats-new" && "text-accent")} />
          <span className="relative">What's New</span>
          <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
        </Link>
        {navItems.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "text-foreground" : "text-text-dim hover:bg-surface-2/50 hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-surface-2 border border-border"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              )}
              <Icon className={cn("relative h-4 w-4 transition-colors", active && "text-accent")} />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-text-dim">
          <PulseDot tone={live ? "good" : "warn"} />
          {live ? "Live · synced just now" : "Demo data"}
        </div>
        <UserMenu />
      </div>
    </aside>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const name = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Account";
  const handle = async () => {
    await signOut();
    navigate({ to: "/" });
  };
  return (
    <button
      onClick={handle}
      className="mt-1 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs text-text-dim transition-colors hover:bg-surface-2/60 hover:text-foreground"
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent uppercase">
          {name.slice(0, 1)}
        </span>
        <span className="truncate">{name}</span>
      </span>
      <LogOut className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur grid grid-cols-8">
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
  const { live } = usePulseStatus();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-bg/70 px-4 md:px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className="md:hidden flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          <span className="font-display font-semibold">MoodMix</span>
        </div>
        <span className="hidden md:inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-text-dim">Brand:</span>
          <span className="font-medium">MadMix</span>
        </span>
        <span className={cn(
          "hidden lg:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
          live ? "border-good/30 bg-good/10 text-good" : "border-accent/30 bg-accent/10 text-accent"
        )}>
          <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-good" : "bg-accent")} />
          {live ? "Supabase · live" : "Demo mode"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/whats-new" aria-label="What's New" className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-dim transition-colors hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-bg" />
        </Link>
        <div className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-dim mono">
          Apr 01 – Apr 30, 2025
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh Mood Board
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
