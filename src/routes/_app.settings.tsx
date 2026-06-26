import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Lock, LogOut, Loader2 } from "lucide-react";
import { Card, PageHeader, cn } from "@/components/pulse/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — PulseBoard" }] }),
  component: SettingsPage,
});

interface SettingsState {
  threshold: number;
  a2s: boolean;
  opportunities: boolean;
  podDrops: boolean;
}

const DEFAULTS: SettingsState = { threshold: 0.5, a2s: true, opportunities: true, podDrops: false };

function SettingsPage() {
  const { configured, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState<SettingsState>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load persisted settings for the signed-in user.
  useEffect(() => {
    if (!supabase || !user) return;
    let active = true;
    supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) {
          setS({
            threshold: Number(data.a2s_threshold),
            a2s: data.alert_a2s,
            opportunities: data.alert_opps,
            podDrops: data.alert_pods,
          });
        }
      });
    return () => { active = false; };
  }, [user]);

  const persist = async (next: SettingsState) => {
    if (!supabase || !user) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.from("settings").upsert({
      user_id: user.id,
      a2s_threshold: next.threshold,
      alert_a2s: next.a2s,
      alert_opps: next.opportunities,
      alert_pods: next.podDrops,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  const update = (patch: Partial<SettingsState>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  };

  const name = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "MadMix Brand Owner";
  const email = user?.email || "owner@madmix.in";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Platform connections, alert thresholds and role"
        right={
          configured ? (
            <span className="inline-flex items-center gap-2 text-xs text-text-dim">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5 text-good" /> : null}
              {saving ? "Saving…" : saved ? "Saved" : ""}
            </span>
          ) : undefined
        }
      />

      <Card className="p-5">
        <h3 className="font-display text-base font-semibold mb-4">Platform Connections</h3>
        <div className="space-y-2">
          <Conn name="Big Basket" status="connected" color="#84CC16" />
          <Conn name="Instamart" status="connected" color="#F97316" />
          <Conn name="Blinkit" status="soon" color="#FCD34D" />
          <Conn name="Zepto" status="soon" color="#A78BFA" />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-display text-base font-semibold mb-4">Alert Thresholds</h3>
        <div>
          <div className="flex items-center justify-between text-sm">
            <span>A2S overspend threshold</span>
            <span className="mono text-accent">{s.threshold.toFixed(2)}</span>
          </div>
          <input
            type="range" min={0.3} max={0.8} step={0.01}
            value={s.threshold} onChange={(e) => update({ threshold: +e.target.value })}
            className="mt-2 w-full accent-[var(--accent)]"
          />
          <p className="mt-1 text-xs text-text-dim">Trigger a "Watch" alert when daily A2S exceeds this value.</p>
        </div>

        <div className="mt-6 space-y-2">
          <Toggle label="Notify on A2S threshold breach" value={s.a2s} onChange={(v) => update({ a2s: v })} />
          <Toggle label="Notify on new Mood Map opportunities" value={s.opportunities} onChange={(v) => update({ opportunities: v })} />
          <Toggle label="Notify on POD drops > 5%" value={s.podDrops} onChange={(v) => update({ podDrops: v })} />
        </div>
        {!configured && (
          <p className="mt-4 text-xs text-text-dim">Connect Supabase to persist these settings to your account.</p>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-display text-base font-semibold mb-4">Account</h3>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent uppercase">
              {name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <div className="font-medium truncate">{name}</div>
              <div className="text-text-dim text-xs mt-0.5 truncate">{email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent uppercase tracking-wider">Owner</span>
            {configured && (
              <button
                onClick={async () => { await signOut(); navigate({ to: "/" }); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-dim transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />Sign out
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Conn({ name, status, color }: { name: string; status: "connected" | "soon"; color: string }) {
  return (
    <div className={cn("flex items-center justify-between rounded-lg border border-border px-4 py-3", status === "soon" && "opacity-60")}>
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-sm font-medium">{name}</span>
      </div>
      {status === "connected" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-good/30 bg-good/10 px-2.5 py-0.5 text-xs text-good">
          <Check className="h-3 w-3" />Connected
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs text-text-dim">
          <Lock className="h-3 w-3" />Coming soon
        </span>
      )}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 cursor-pointer hover:bg-surface-2/40 transition-colors">
      <span className="text-sm">{label}</span>
      <button
        type="button" onClick={() => onChange(!value)}
        className={cn("relative h-5 w-9 rounded-full transition-colors", value ? "bg-accent" : "bg-surface-2 border border-border")}
      >
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform", value ? "translate-x-4" : "translate-x-0.5")} />
      </button>
    </label>
  );
}
