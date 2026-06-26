import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search, MessageCircle, CalendarDays, Sparkles, Radio, MapPin } from "lucide-react";
import { Card, PageHeader, cn } from "@/components/pulse/ui";
import { usePulse, PULSE_QUERY_KEY } from "@/components/pulse/PulseDataProvider";
import { refreshMoodMap } from "@/lib/moodmap";
import { supabase } from "@/lib/supabase";
import type { MoodOpportunity, DemandGap } from "@/lib/types";

export const Route = createFileRoute("/_app/mood-map")({
  head: () => ({ meta: [{ title: "Mood Map — PulseBoard" }] }),
  component: MoodMapPage,
});

const stages = [
  "Scanning Google Trends…",
  "Reading r/india, r/bangalore, r/pune…",
  "Cross-referencing event calendars…",
  "Synthesising collab signals with Claude…",
  "Ranking opportunities…",
];

function MoodMapPage() {
  const { moodOpportunities, demandGaps, seasonCalendar } = usePulse();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [version, setVersion] = useState(0);
  const [override, setOverride] = useState<{ opportunities: MoodOpportunity[]; gaps: DemandGap[] } | null>(null);
  const intro = useRef(false);

  const opportunities = override?.opportunities ?? moodOpportunities;
  const gaps = override?.gaps ?? demandGaps;

  // Runs the animated scan. When `live`, hits the Claude-backed server function
  // and persists results to Supabase; otherwise it's a quick visual reveal.
  const runScan = async (live: boolean) => {
    setLoading(true);
    setStageIdx(0);
    const ivl = setInterval(() => setStageIdx((s) => Math.min(s + 1, stages.length - 1)), 360);
    const minDelay = new Promise((r) => setTimeout(r, live ? 1200 : 1600));

    try {
      if (live) {
        const [res] = await Promise.all([refreshMoodMap(), minDelay]);
        setOverride({ opportunities: res.opportunities, gaps: res.demandGaps });
        await persist(res.opportunities, res.demandGaps);
        queryClient.invalidateQueries({ queryKey: PULSE_QUERY_KEY });
      } else {
        await minDelay;
      }
    } catch (err) {
      console.error("Mood Map refresh failed:", err);
    } finally {
      clearInterval(ivl);
      setLoading(false);
      setVersion((v) => v + 1);
    }
  };

  const persist = async (opps: MoodOpportunity[], dg: DemandGap[]) => {
    if (!supabase) return;
    try {
      await supabase.from("mood_opportunities").upsert(
        opps.map((o) => ({
          id: o.id, city: o.city, event: o.event, weeks: o.weeks, event_date: o.date,
          sku: o.sku, score: o.score, sources: o.sources, note: o.note, refreshed_at: new Date().toISOString(),
        })),
      );
      await supabase.from("demand_gaps").upsert(dg.map((g, i) => ({ id: i + 1, city: g.city, insight: g.insight })));
    } catch (err) {
      console.error("Persisting mood map failed:", err);
    }
  };

  useEffect(() => {
    if (intro.current) return;
    intro.current = true;
    runScan(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <PageHeader
        title="Mood Map"
        subtitle="Public signal intelligence — search, social, events — turned into collab opportunities"
        right={
          <button
            onClick={() => runScan(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {loading ? "Scanning…" : "Refresh Mood Map"}
          </button>
        }
      />

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="p-8">
              <div className="flex items-center gap-3 text-accent">
                <Sparkles className="h-5 w-5 animate-pulse" />
                <span className="font-display text-lg">Scanning public signal layer</span>
              </div>
              <div className="mt-6 space-y-2 max-w-md">
                {stages.map((s, i) => (
                  <div key={i} className={cn("flex items-center gap-2 text-sm transition-opacity", i <= stageIdx ? "opacity-100" : "opacity-30")}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", i < stageIdx ? "bg-good" : i === stageIdx ? "bg-accent animate-pulse" : "bg-text-dim")} />
                    <span className={cn(i === stageIdx && "text-accent")}>{s}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-32 rounded-md border border-border bg-surface-2/40 animate-pulse" />
                ))}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div key={`done-${version}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
              <div className="space-y-3">
                <h3 className="font-display text-base font-semibold text-text-dim">City × Event Opportunities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {opportunities.map((o, i) => (
                    <OpportunityCard key={o.id} o={o} delay={i * 0.05} />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-base font-semibold text-text-dim flex items-center gap-2"><MapPin className="h-4 w-4" />Live Buzz Map</h3>
                <Card className="p-4">
                  <IndiaMap />
                </Card>
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-text-dim mb-3 flex items-center gap-2"><Search className="h-4 w-4" />Search Demand Gaps</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {gaps.map((g, i) => (
                  <motion.div key={`${g.city}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Card className="p-4 border-l-2 border-l-accent">
                      <div className="text-xs uppercase tracking-wider text-accent">{g.city}</div>
                      <p className="mt-1.5 text-sm leading-relaxed">{g.insight}</p>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-text-dim mb-3 flex items-center gap-2"><CalendarDays className="h-4 w-4" />Season Calendar</h3>
              <Card className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
                  {seasonCalendar.map((s) => (
                    <div key={s.season} className="p-4">
                      <div className="text-xs uppercase tracking-wider text-accent">{s.season}</div>
                      <div className="mt-1 mono text-xs text-text-dim">{s.window}</div>
                      <div className="mt-3 font-medium text-sm">{s.sku}</div>
                      <div className="mt-1 text-xs text-text-dim">{s.cities.join(" · ")}</div>
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                        <Radio className="h-3 w-3" />{s.leadTime}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OpportunityCard({ o, delay }: { o: MoodOpportunity; delay: number }) {
  const r = 26, c = 2 * Math.PI * r;
  const dash = (o.score / 100) * c;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-4 card-hover hover:bg-surface-2/40 h-full">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
            <svg width={64} height={64} className="-rotate-90">
              <circle cx={32} cy={32} r={r} stroke="var(--surface-2)" strokeWidth="4" fill="none" />
              <circle cx={32} cy={32} r={r} stroke="var(--accent)" strokeWidth="4" fill="none" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="mono text-base font-semibold text-accent leading-none">{o.score}</div>
              <div className="text-[8px] uppercase tracking-wider text-text-dim mt-0.5">Collab</div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-accent">
              <MapPin className="h-3 w-3" />{o.city}
              <span className="text-text-dim">·</span>
              <span className="text-text-dim mono">{o.date}</span>
            </div>
            <div className="font-medium text-sm mt-1">{o.event}</div>
            <div className="mt-1 text-xs text-text-dim">
              Push <span className="text-foreground">{o.sku}</span> · {o.weeks}w lead
            </div>
            <div className="mt-2 flex items-center gap-2">
              {o.sources.includes("trends") && <SourcePill icon={Search} label="Trends" />}
              {o.sources.includes("reddit") && <SourcePill icon={MessageCircle} label="Reddit" />}
              {o.sources.includes("event") && <SourcePill icon={CalendarDays} label="Event" />}
            </div>
          </div>
        </div>
        <div className="mt-3 border-t border-border pt-3 text-xs text-text-dim leading-relaxed">{o.note}</div>
      </Card>
    </motion.div>
  );
}

function SourcePill({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-text-dim">
      <Icon className="h-2.5 w-2.5" />{label}
    </span>
  );
}

function IndiaMap() {
  const { cityBuzz } = usePulse();
  return (
    <div className="relative aspect-[5/6] w-full">
      <svg viewBox="0 0 100 120" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="indiaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#21252D" />
            <stop offset="100%" stopColor="#181B21" />
          </linearGradient>
        </defs>
        <path
          d="M 35 12 L 50 8 L 62 14 L 72 22 L 70 36 L 78 48 L 72 60 L 65 70 L 60 82 L 52 92 L 46 100 L 40 92 L 36 82 L 30 72 L 24 62 L 22 50 L 26 38 L 28 26 Z"
          fill="url(#indiaFill)" stroke="#2A2F38" strokeWidth="0.5"
        />
        {cityBuzz.map((c) => {
          const size = 1.2 + (c.buzz / 100) * 3.2;
          return (
            <g key={c.city}>
              <circle cx={c.x} cy={c.y} r={size * 1.6} fill="var(--accent)" opacity="0.18" />
              <circle cx={c.x} cy={c.y} r={size} fill="var(--accent)" className="pulse-dot" />
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 right-2 text-[10px] text-text-dim mono">dot size = buzz score</div>
    </div>
  );
}
