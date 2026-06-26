import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { Card, PageHeader, cn } from "@/components/pulse/ui";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — PulseBoard" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [threshold, setThreshold] = useState(0.5);
  const [alerts, setAlerts] = useState({ a2s: true, opportunities: true, podDrops: false });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Settings" subtitle="Platform connections, alert thresholds and role" />

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
            <span className="mono text-accent">{threshold.toFixed(2)}</span>
          </div>
          <input
            type="range" min={0.3} max={0.8} step={0.01}
            value={threshold} onChange={(e) => setThreshold(+e.target.value)}
            className="mt-2 w-full accent-[var(--accent)]"
          />
          <p className="mt-1 text-xs text-text-dim">Trigger a "Watch" alert when daily A2S exceeds this value.</p>
        </div>

        <div className="mt-6 space-y-2">
          <Toggle label="Notify on A2S threshold breach" value={alerts.a2s} onChange={(v) => setAlerts({ ...alerts, a2s: v })} />
          <Toggle label="Notify on new Mood Map opportunities" value={alerts.opportunities} onChange={(v) => setAlerts({ ...alerts, opportunities: v })} />
          <Toggle label="Notify on POD drops > 5%" value={alerts.podDrops} onChange={(v) => setAlerts({ ...alerts, podDrops: v })} />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-display text-base font-semibold mb-4">User</h3>
        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="font-medium">MadMix Brand Owner</div>
            <div className="text-text-dim text-xs mt-0.5">owner@madmix.in</div>
          </div>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent uppercase tracking-wider">Admin</span>
        </div>
      </Card>
    </div>
  );
}

function Conn({ name, status, color }: { name: string; status: "connected" | "soon"; color: string }) {
  return (
    <div className={cn("flex items-center justify-between rounded-md border border-border px-4 py-3", status === "soon" && "opacity-60")}>
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
    <label className="flex items-center justify-between rounded-md border border-border px-4 py-2.5 cursor-pointer hover:bg-surface-2/40 transition-colors">
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
