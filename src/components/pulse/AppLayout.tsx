import { Outlet, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Bell, X, ArrowRight } from "lucide-react";
import { Sidebar, TopBar, MobileNav } from "./ui";
import { useAuth } from "@/lib/auth";
import { usePulse } from "./PulseDataProvider";
import { computeAlerts, type AlertRoute } from "@/lib/alerts";

export function AppLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const { loading, authed } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Require login (Supabase session, or the owner demo gate) to view the app.
  useEffect(() => {
    if (!loading && !authed) {
      navigate({ to: "/" });
    }
  }, [loading, authed, navigate]);

  // Greet the owner with "What's New" once per session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem("pulse-whatsnew-seen")) setShowNew(true);
  }, []);

  const dismissNew = () => {
    sessionStorage.setItem("pulse-whatsnew-seen", "1");
    setShowNew(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    navigate({ to: "/mood-map" });
    setTimeout(() => setRefreshing(false), 800);
  };

  if (loading || !authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Activity className="h-6 w-6 text-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onRefresh={onRefresh} refreshing={refreshing} />
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {children ?? <Outlet />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileNav />

      <AnimatePresence>
        {showNew && <WhatsNewGreeting onClose={dismissNew} />}
      </AnimatePresence>
    </div>
  );
}

function WhatsNewGreeting({ onClose }: { onClose: () => void }) {
  const data = usePulse();
  const alerts = computeAlerts(data).slice(0, 3);
  const navigate = useNavigate();
  const go = (to: AlertRoute) => { onClose(); navigate({ to }); };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft border border-accent/20">
              <Bell className="h-4 w-4 text-accent" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">What's New</div>
              <div className="text-xs text-text-dim">The headlines since you were last here</div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 space-y-2">
          {alerts.map((a, i) => {
            const Icon = a.icon;
            return (
              <button key={i} onClick={() => go(a.to)}
                className="w-full text-left flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 p-3 transition-colors hover:bg-surface-2">
                <Icon className="h-4 w-4 text-accent shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{a.title}</span>
                  <span className="block text-xs text-text-dim truncate">{a.detail}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-text-dim shrink-0" />
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Link to="/whats-new" onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]">
            See everything <ArrowRight className="h-4 w-4" />
          </Link>
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm text-text-dim hover:text-foreground transition-colors">
            Dismiss
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
