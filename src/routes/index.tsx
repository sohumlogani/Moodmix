import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PulseBoard — MadMix Demand Intelligence" },
      { name: "description", content: "A demand command centre for MadMix across Big Basket and Instamart." },
      { property: "og:title", content: "PulseBoard — MadMix Demand Intelligence" },
      { property: "og:description", content: "Cross-platform demand intelligence and AI mood map for MadMix." },
    ],
  }),
  component: Login,
});

function Login() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg flex items-center justify-center px-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
      />
      {/* Glow */}
      <div
        className="hero-glow pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[60vh] w-[120vw] rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(232,160,61,0.25), transparent 60%)" }}
      />
      {/* Floating pulse dots */}
      {[...Array(8)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-accent/60"
          style={{ left: `${10 + i * 11}%`, top: `${20 + (i % 3) * 22}%` }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.6, 1.2, 0.6] }}
          transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface/80 backdrop-blur p-8 text-center"
      >
        <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
          <Activity className="h-6 w-6 text-accent" />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">PulseBoard</h1>
        <p className="mt-1 text-sm uppercase tracking-[0.2em] text-accent">MadMix Demand Intelligence</p>
        <p className="mt-4 text-sm text-text-dim">
          One command centre. Big Basket × Instamart unified. AI mood map signalling tomorrow's opportunities today.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]"
        >
          Enter Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="mt-6 grid grid-cols-3 gap-3 text-[10px] uppercase tracking-wider text-text-dim">
          <div className="rounded-md border border-border bg-surface-2/60 py-2">Cross-platform</div>
          <div className="rounded-md border border-border bg-surface-2/60 py-2">A2S engine</div>
          <div className="rounded-md border border-border bg-surface-2/60 py-2">Mood map</div>
        </div>
      </motion.div>
    </div>
  );
}
