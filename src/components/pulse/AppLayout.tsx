import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Sidebar, TopBar, MobileNav } from "./ui";
import { useAuth } from "@/lib/auth";

export function AppLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const { configured, loading, session } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [refreshing, setRefreshing] = useState(false);

  // Gate the app behind auth only when Supabase is configured.
  useEffect(() => {
    if (configured && !loading && !session) {
      navigate({ to: "/" });
    }
  }, [configured, loading, session, navigate]);

  const onRefresh = () => {
    setRefreshing(true);
    navigate({ to: "/mood-map" });
    setTimeout(() => setRefreshing(false), 800);
  };

  if (configured && loading) {
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
    </div>
  );
}
