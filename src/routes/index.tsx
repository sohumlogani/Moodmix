import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

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
  const navigate = useNavigate();
  const { configured, session, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in → jump straight to the dashboard.
  useEffect(() => {
    if (configured && session) navigate({ to: "/dashboard" });
  }, [configured, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const res = mode === "signin" ? await signIn(email, password) : await signUp(email, password, name);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else if (mode === "signup") {
      setNotice("Account created. If email confirmation is on, check your inbox — otherwise sign in.");
      setMode("signin");
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg flex items-center justify-center px-4">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
      />
      <div
        className="hero-glow pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[60vh] w-[120vw] rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(232,160,61,0.22), transparent 60%)" }}
      />
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
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface/80 backdrop-blur p-8"
      >
        <div className="text-center">
          <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
            <Activity className="h-6 w-6 text-accent" />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">PulseBoard</h1>
          <p className="mt-1 text-sm uppercase tracking-[0.2em] text-accent">MadMix Demand Intelligence</p>
        </div>

        {!configured ? (
          <DemoEntry onEnter={() => navigate({ to: "/dashboard" })} />
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-3">
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  value={name} onChange={(e) => setName(e.target.value)} required
                  placeholder="Brand owner" autoComplete="name"
                  className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent/50"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="owner@madmix.in" autoComplete="email"
                className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent/50"
              />
            </Field>
            <Field label="Password">
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••" autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent/50"
              />
            </Field>

            {error && <p className="text-xs text-bad">{error}</p>}
            {notice && <p className="text-xs text-good">{notice}</p>}

            <button
              type="submit" disabled={busy}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mode === "signin" ? "Sign in" : "Create account"}<ArrowRight className="h-4 w-4" /></>}
            </button>

            <button
              type="button"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}
              className="w-full text-center text-xs text-text-dim hover:text-foreground transition-colors"
            >
              {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
            </button>
          </form>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3 text-[10px] uppercase tracking-wider text-text-dim">
          <div className="rounded-lg border border-border bg-surface-2/60 py-2 text-center">Cross-platform</div>
          <div className="rounded-lg border border-border bg-surface-2/60 py-2 text-center">A2S engine</div>
          <div className="rounded-lg border border-border bg-surface-2/60 py-2 text-center">Mood map</div>
        </div>
      </motion.div>

      {configured && loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/60">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-text-dim">{label}</span>
      {children}
    </label>
  );
}

function DemoEntry({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="mt-6 text-center">
      <p className="text-sm text-text-dim">
        One command centre. Big Basket × Instamart unified. AI mood map signalling tomorrow's opportunities today.
      </p>
      <button
        onClick={onEnter}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]"
      >
        Enter Dashboard
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-3 text-[11px] text-text-dim">
        Running in demo mode. Add Supabase keys to enable sign-in &amp; live data.
      </p>
    </div>
  );
}
