// Loads the full PulseBoard dataset once and shares it across every screen.
// The bundled seed is the initial data, so tab changes are instant (no spinner,
// no flash); live Supabase data swaps in transparently when available.
import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPulseData } from "@/lib/pulse-queries";
import { isSupabaseConfigured } from "@/lib/supabase";
import { bundledSeed } from "@/data/mockData";
import type { PulseData } from "@/lib/types";

interface PulseContextValue {
  data: PulseData;
  live: boolean; // true once data is served from Supabase
  loading: boolean;
}

const PulseContext = createContext<PulseContextValue | null>(null);

export const PULSE_QUERY_KEY = ["pulse-core"] as const;

export function PulseDataProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: PULSE_QUERY_KEY,
    queryFn: fetchPulseData,
    enabled: isSupabaseConfigured,
    initialData: bundledSeed,
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const value: PulseContextValue = {
    data: query.data ?? bundledSeed,
    live: isSupabaseConfigured && query.isSuccess && !query.isPlaceholderData,
    loading: query.isFetching,
  };

  return <PulseContext.Provider value={value}>{children}</PulseContext.Provider>;
}

export function usePulse(): PulseData {
  const ctx = useContext(PulseContext);
  if (!ctx) throw new Error("usePulse must be used within PulseDataProvider");
  return ctx.data;
}

export function usePulseStatus() {
  const ctx = useContext(PulseContext);
  if (!ctx) throw new Error("usePulseStatus must be used within PulseDataProvider");
  return { live: ctx.live, loading: ctx.loading };
}
