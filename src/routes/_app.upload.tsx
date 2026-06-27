import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCloud, FileSpreadsheet, Check, AlertTriangle, Download, Loader2, Database, Workflow } from "lucide-react";
import { Card, PageHeader, cn } from "@/components/pulse/ui";
import { PULSE_QUERY_KEY } from "@/components/pulse/PulseDataProvider";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { parseFile, guessMapping, FIELD_SPECS, type DatasetType, type ParsedSheet } from "@/lib/parse";
import { parseMadmixWorkbook, type ParsedWorkbook } from "@/lib/madmix-parser";
import { importDataset, importWorkbook, recompute } from "@/lib/ingest";

export const Route = createFileRoute("/_app/upload")({
  head: () => ({ meta: [{ title: "Upload Centre — MoodMix" }] }),
  component: UploadPage,
});

const TYPES: { key: DatasetType; label: string; hint: string }[] = [
  { key: "sales", label: "SKU Sales", hint: "Revenue by SKU × city × platform" },
  { key: "spends", label: "Sales vs Spends", hint: "Daily ad spend, sales & A2S per platform" },
  { key: "pods", label: "POD Availability", hint: "Distribution points by city × platform" },
];

interface UploadRow { id: string; file_name: string; status: string; created_at: string }

function UploadPage() {
  const { configured, user } = useAuth();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"workbook" | "sheet">("workbook");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const [recent, setRecent] = useState<UploadRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Workbook mode
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  // Single-sheet mode
  const [type, setType] = useState<DatasetType>("sales");
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const [fileName, setFileName] = useState("");
  const specs = FIELD_SPECS[type];

  const loadRecent = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("uploads").select("*").order("created_at", { ascending: false }).limit(8);
    setRecent((data as UploadRow[]) ?? []);
  }, []);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  const handleFile = async (file: File) => {
    setResult(null);
    setFileName(file.name);
    if (mode === "workbook") {
      try {
        setWorkbook(await parseMadmixWorkbook(file));
      } catch {
        setResult({ ok: false, msg: "Couldn't read this as a MadMix workbook. Try Single-sheet mode." });
      }
    } else {
      const sheet = await parseFile(file);
      setParsed(sheet);
      setMapping(guessMapping(sheet.headers, type));
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  useEffect(() => {
    if (parsed) setMapping(guessMapping(parsed.headers, type));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const missingRequired = specs.filter((s) => s.required && !mapping[s.key]).map((s) => s.label);

  const finish = async (msg: string) => {
    await recompute();
    await queryClient.invalidateQueries({ queryKey: PULSE_QUERY_KEY });
    await loadRecent();
    setResult({ ok: true, msg });
    setWorkbook(null);
    setParsed(null);
  };

  const importWorkbookNow = async () => {
    if (!user || !workbook) return;
    setBusy(true); setResult(null);
    try {
      const r = await importWorkbook(workbook, fileName, user.id);
      await finish(`Imported ${r.sales} sales, ${r.spends} spend and ${r.pods} POD rows — all metrics recomputed.`);
    } catch (err: any) {
      setResult({ ok: false, msg: err?.message ?? "Import failed." });
    } finally { setBusy(false); }
  };

  const importSheetNow = async () => {
    if (!user || !parsed) return;
    setBusy(true); setResult(null);
    try {
      const { inserted } = await importDataset({ type, rows: parsed.rows, mapping, fileName, userId: user.id });
      await finish(`Imported ${inserted} rows and recomputed all metrics.`);
    } catch (err: any) {
      setResult({ ok: false, msg: err?.message ?? "Import failed." });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <PageHeader
        title="Upload Centre"
        subtitle="Drop your platform exports — every dashboard metric recomputes automatically"
        right={mode === "sheet" ? <TemplateButton type={type} /> : undefined}
      />

      {!configured && (
        <Card className="p-5 border-accent/30 bg-accent/5 flex items-start gap-3">
          <Database className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Connect Supabase to upload real data</div>
            <p className="text-text-dim mt-1">
              Uploads persist to your database. Add your Supabase keys (see SETUP.md), then sign in to import exports here.
            </p>
          </div>
        </Card>
      )}

      {/* Mode switch */}
      <div className="inline-flex rounded-lg border border-border bg-surface p-1 text-sm">
        {([["workbook", "MadMix workbook"], ["sheet", "Single sheet"]] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResult(null); setWorkbook(null); setParsed(null); }}
            className={cn("rounded-md px-3 py-1.5 transition-colors", mode === m ? "bg-accent text-primary-foreground" : "text-text-dim hover:text-foreground")}
          >{label}</button>
        ))}
      </div>

      {mode === "workbook" ? (
        <p className="text-xs text-text-dim -mt-3">
          One-click import of the full 3-sheet workbook (PODs · SKU Sales · Sales vs Spends) — no column mapping needed.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={cn("rounded-xl border p-4 text-left transition-colors card-hover", type === t.key ? "border-accent/50 bg-accent/5" : "border-border bg-surface hover:bg-surface-2/50")}>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className={cn("h-4 w-4", type === t.key ? "text-accent" : "text-text-dim")} />
                <span className="font-medium text-sm">{t.label}</span>
              </div>
              <p className="mt-1.5 text-xs text-text-dim">{t.hint}</p>
            </button>
          ))}
        </div>
      )}

      <Card
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={cn("p-8 border-dashed transition-colors text-center cursor-pointer", drag ? "border-accent bg-accent/5" : "border-border")}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <UploadCloud className="mx-auto h-8 w-8 text-text-dim" />
        <div className="mt-3 text-sm">
          {fileName ? <span className="text-foreground">{fileName}</span> : <>Drop a <span className="text-accent">{mode === "workbook" ? "MadMix .xlsx" : "CSV / XLSX"}</span> here, or click to browse</>}
        </div>
        <div className="mt-1 text-xs text-text-dim">{mode === "workbook" ? "All three sheets are read automatically" : "First sheet is read · headers auto-detected"}</div>
      </Card>

      {/* Workbook preview */}
      {mode === "workbook" && workbook && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5">
            <h3 className="font-display text-base font-semibold mb-1 flex items-center gap-2"><Workflow className="h-4 w-4 text-accent" />Workbook detected</h3>
            <p className="text-xs text-text-dim mb-4">
              Periods: {workbook.periods.join(" · ") || "—"}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="SKU sales rows" value={workbook.sales.length} />
              <Stat label="Spend rows" value={workbook.spends.length} />
              <Stat label="POD rows" value={workbook.pods.length} />
            </div>
            <button onClick={importWorkbookNow} disabled={!configured || !user || busy || !workbook.sales.length && !workbook.pods.length}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {busy ? "Importing & recomputing…" : "Import & recompute"}
            </button>
          </Card>
        </motion.div>
      )}

      {/* Single-sheet mapping */}
      {mode === "sheet" && parsed && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display text-base font-semibold mb-1">Map columns</h3>
            <p className="text-xs text-text-dim mb-4">{parsed.rows.length} rows · auto-matched. Adjust any that look wrong.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {specs.map((spec) => (
                <label key={spec.key} className="block">
                  <span className="mb-1 flex items-center gap-1.5 text-xs text-text-dim">{spec.label}{spec.required && <span className="text-bad">*</span>}</span>
                  <select value={mapping[spec.key] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [spec.key]: e.target.value }))}
                    className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent/50">
                    <option value="">— not in file —</option>
                    {parsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {missingRequired.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-bad"><AlertTriangle className="h-3.5 w-3.5" /> Map required fields: {missingRequired.join(", ")}</p>
            )}
            <button onClick={importSheetNow} disabled={!configured || !user || busy || missingRequired.length > 0 || !parsed.rows.length}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {busy ? "Importing & recomputing…" : "Import & recompute"}
            </button>
          </Card>
        </motion.div>
      )}

      {result && (
        <Card className={cn("p-4 flex items-center gap-3 text-sm", result.ok ? "border-good/30 bg-good/5" : "border-bad/30 bg-bad/5")}>
          {result.ok ? <Check className="h-4 w-4 text-good" /> : <AlertTriangle className="h-4 w-4 text-bad" />}
          <span>{result.msg}</span>
        </Card>
      )}

      {recent.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display text-base font-semibold mb-3">Recent uploads</h3>
          <div className="space-y-1.5">
            {recent.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-xs border-b border-border/40 py-1.5 last:border-0">
                <span className="flex items-center gap-2 min-w-0"><FileSpreadsheet className="h-3.5 w-3.5 text-text-dim shrink-0" /><span className="truncate">{u.file_name}</span></span>
                <span className="flex items-center gap-3 shrink-0 mono text-text-dim">
                  <span className={cn(u.status === "processed" ? "text-good" : "text-accent")}>{u.status}</span>
                  {new Date(u.created_at).toLocaleDateString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-text-dim">{label}</div>
      <div className="mono text-2xl font-semibold mt-1">{value.toLocaleString("en-IN")}</div>
    </div>
  );
}

function TemplateButton({ type }: { type: DatasetType }) {
  const download = () => {
    const specs = FIELD_SPECS[type];
    const headers = specs.map((s) => s.label.replace(/ \(optional\)/, ""));
    const sample: Record<DatasetType, string[]> = {
      sales: ["Big Basket", "Bangalore", "Chaat Corner Puffs", "78400", "1240", "April"],
      spends: ["Big Basket", "2026-04-30", "2400", "8600", ""],
      pods: ["Big Basket", "Bangalore", "41000", "2026-04-01"],
    };
    const csv = `${headers.join(",")}\n${sample[type].join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pulseboard-${type}-template.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={download}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-dim transition-colors hover:bg-surface-2 hover:text-foreground">
      <Download className="h-3.5 w-3.5" />Download template
    </button>
  );
}
