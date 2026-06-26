import { Outlet, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Sidebar, TopBar, MobileNav } from "./ui";

export function AppLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      navigate({ to: "/mood-map" });
    }, 1600);
  };
  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onRefresh={onRefresh} refreshing={refreshing} />
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
          {children ?? <Outlet />}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
