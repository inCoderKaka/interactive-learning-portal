"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, ClipboardPaste, Code2, FileText, FileUp, Heading, Image as ImageIcon, List, Loader2, Pause, Play, Quote, Redo2, Table, Trash2, Undo2, X, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { aiReady } from "@/lib/ai";
import { getAi } from "@/lib/interview/tasks";
import { areaOf, topicById } from "@/content";
import { ACCEPT, readFile, readPaste } from "@/lib/notes/import/read";
import { parseMarkdown, type ParsedDoc } from "@/lib/notes/import/doc";
import { DEFAULT_CONFIG, initialState, type ImportConfig } from "@/lib/notes/import/pipeline";
import { backgroundRun, cancelRun, deleteRun, estimateFor, loadRuns, pauseRun, redoRun, resumeRun, startRun, undoRun, useImports, type RunRecord } from "@/lib/notes/import/runner";
import { Button, cn } from "@/components/ui";
import { ago } from "../NoteCard";
import { Options, Rail, Ribbon, Trace, contentCount, dur, isBackground, usd } from "./parts";
import { PlanReview } from "./Plan";
import { DraftsReview } from "./Review";

const CONFIG_KEY = "ascent:import-config";
const loadConfig = (): ImportConfig => { try { const c = JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "null"); return c ? { ...DEFAULT_CONFIG, ...c, steps: { ...DEFAULT_CONFIG.steps, ...c.steps }, approvals: { ...DEFAULT_CONFIG.approvals, ...c.approvals }, checkpoints: { ...DEFAULT_CONFIG.checkpoints, ...c.checkpoints }, dev: { tune: c.dev?.tune ?? {}, sections: null }, verifyTopics: "all", enrichTopics: "all" } : DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; } };

const KIND_ICON = { heading: Heading, para: FileText, list: List, code: Code2, table: Table, image: ImageIcon, quote: Quote, rule: FileText };

function Drop({ onDoc }: { onDoc: (d: ParsedDoc, warning?: string) => void }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [paste, setPaste] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const take = async (f: File) => {
    setBusy(true); setErr("");
    try {
      const r = await readFile(f);
      if (!r.md.trim()) { setErr(r.warning ?? "That file has no text we can read."); return; }
      onDoc(parseMarkdown(r.md, r.name), r.warning);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <motion.div onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setOver(false); const f = e.dataTransfer.files[0]; if (f) void take(f); }}
        onClick={() => input.current?.click()} animate={{ scale: over ? 1.01 : 1 }}
        className={cn("relative grid cursor-pointer place-items-center overflow-hidden rounded-3xl border-2 border-dashed px-6 py-14 text-center transition", over ? "border-accent bg-accent/[0.06]" : "border-line bg-panel/40 hover:border-accent/40")}>
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "radial-gradient(420px 200px at 50% 0%, rgb(200 245 71 / 0.09), transparent 70%), radial-gradient(380px 220px at 50% 110%, rgb(183 148 244 / 0.08), transparent 70%)" }} />
        <div className="relative">
          <div className="mx-auto mb-4 flex w-max items-end gap-1.5">
            {[0.55, 0.85, 1, 0.7, 0.45].map((h, i) => <motion.span key={i} className="w-2 rounded-full" style={{ height: 40 * h, background: ["var(--color-dsa)", "var(--color-hld)", "var(--color-accent)", "var(--color-lld)", "var(--color-ai)"][i] }} animate={{ scaleY: busy ? [1, 0.4, 1] : over ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.9, repeat: busy || over ? Infinity : 0, delay: i * 0.08 }} />)}
          </div>
          <div className="display text-xl font-semibold">{busy ? "Reading your document…" : "Drop a document with your notes"}</div>
          <p className="mx-auto mt-1.5 max-w-md text-[13.5px] text-mute">Markdown, text, Word (.docx), PDF or HTML. Every section is filed under the right topic page; nothing is left out.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">{[".md", ".docx", ".pdf", ".txt", ".html", "Google Docs paste"].map((x) => <span key={x} className="rounded-full border border-line px-2.5 py-0.5 text-[11.5px] text-faint">{x}</span>)}</div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[13.5px] font-semibold text-ink"><FileUp size={15} />Choose a file</div>
        </div>
        <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void take(f); e.target.value = ""; }} />
      </motion.div>
      {err && <div className="flex items-start gap-2 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-[13px] text-bad"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{err}</div>}
      <div className="rounded-2xl border border-line bg-panel/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[12px] text-mute"><ClipboardPaste size={13} />Or paste. Copying from Google Docs, Notion or Word keeps headings and lists.</div>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} onPaste={(e) => { const md = readPaste(e.clipboardData); if (md) { e.preventDefault(); setPaste(md); } }} rows={4} placeholder="# Heading&#10;Your notes…" aria-label="Paste notes"
          className="w-full resize-y rounded-xl border border-line bg-bg px-3 py-2 font-mono text-[12.5px] outline-none focus:border-accent/60" />
        {paste.trim() && <div className="mt-2 flex justify-end"><Button size="sm" variant="primary" onClick={() => onDoc(parseMarkdown(paste, paste.match(/^#\s+(.+)$/m)?.[1]?.slice(0, 60) ?? "Pasted notes"))}>Read structure<ArrowRight size={14} /></Button></div>}
      </div>
    </div>
  );
}

function Prepare({ doc, warning, onBack, onStart }: { doc: ParsedDoc; warning?: string; onBack: () => void; onStart: (c: ImportConfig) => void }) {
  const settings = useStore((s) => s.settings);
  const [config, setConfig] = useState<ImportConfig>(loadConfig);
  const [open, setOpen] = useState<string | null>(doc.sections[0]?.id ?? null);
  const est = useMemo(() => estimateFor(initialState("preview", doc, config), config), [doc, config]);
  const ready = aiReady(settings);
  const blocks = contentCount({ doc } as never);
  const kinds = useMemo(() => { const m = new Map<string, number>(); for (const id of doc.order) m.set(doc.blocks[id].kind, (m.get(doc.blocks[id].kind) ?? 0) + 1); return m; }, [doc]);
  const save = (c: ImportConfig) => { setConfig(c); try { localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...c, dev: { tune: c.dev.tune } })); } catch {} };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-4">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-text"><ArrowLeft size={14} />Another document</button>
        <div>
          <div className="eyebrow text-accent">Step 1 · Document structure</div>
          <h2 className="display mt-1 text-2xl font-semibold">{doc.name}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
            <span className="rounded-full bg-panel2 px-2.5 py-0.5">{doc.sections.length} sections</span>
            <span className="rounded-full bg-panel2 px-2.5 py-0.5">{blocks} blocks</span>
            {[...kinds].filter(([k]) => k !== "heading" && k !== "rule").map(([k, n]) => { const I = KIND_ICON[k as keyof typeof KIND_ICON]; return <span key={k} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-mute"><I size={11} />{n} {k === "para" ? "paragraphs" : k === "list" ? "list items" : `${k}${n > 1 ? "s" : ""}`}</span>; })}
          </div>
        </div>
        {(warning || doc.weak) && <div className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-[12.5px] text-warn"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{warning ?? "No headings were found, so the document was cut into sections by length. Mapping still works per section."}</div>}
        <div className="rounded-2xl border border-line bg-panel/50">
          <ul className="max-h-[60vh] divide-y divide-line/60 overflow-y-auto">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <button onClick={() => setOpen(open === s.id ? null : s.id)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left" style={{ paddingLeft: 16 + Math.min(4, s.level - 1) * 14 }}>
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{s.title}</span>
                  <span className="flex shrink-0 gap-0.5">{s.blocks.slice(0, 14).map((b) => { const I = KIND_ICON[doc.blocks[b].kind]; return <I key={b} size={11} className="text-faint" />; })}{s.blocks.length > 14 && <span className="text-[10px] text-faint">+{s.blocks.length - 14}</span>}</span>
                </button>
                <AnimatePresence>{open === s.id && <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden"><div className="mx-4 mb-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-bg p-3 font-mono text-[11.5px] leading-relaxed text-mute">{s.blocks.map((b) => doc.blocks[b].kind === "image" ? `[image${doc.blocks[b].alt ? `: ${doc.blocks[b].alt}` : ""}]` : doc.blocks[b].md).join("\n\n")}</div></motion.div>}</AnimatePresence>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-accent/30 bg-panel/80 p-4">
          <div className="flex items-baseline justify-between"><span className="text-[12px] uppercase tracking-widest text-faint">First estimate</span><span className="num text-[15px] font-semibold">{usd(est.usd[0])}–{usd(est.usd[1])}</span></div>
          <div className="mt-0.5 text-right text-[11.5px] text-faint">about {dur(est.sec[1])} · refined after mapping</div>
          {!ready && <p className="mt-3 text-[12.5px] text-warn">Add an AI key in <Link href="/settings" className="underline">Settings</Link> first. Imports run in your browser with your own key.</p>}
          <Button variant="primary" disabled={!ready} className="mt-3 w-full" onClick={() => onStart(config)}>{isBackground(config) ? <><Zap size={15} />Import in the background</> : <>Start: read and map<ArrowRight size={15} /></>}</Button>
        </div>
        <div className="rounded-2xl border border-line bg-panel/60 p-3"><Options config={config} set={save} estimate={est} /></div>
      </aside>
    </div>
  );
}

function Live({ run }: { run: RunRecord }) {
  const s = run.cp.state;
  const recent = Object.values(s.drafts).slice(-5).reverse();
  const calls = run.calls.slice(-4).reverse();
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-panel/50 p-4"><Ribbon state={s} live /></div>
      <div>
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-widest text-faint">Latest notes</div>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {recent.map((d) => { const tp = d.topic ? topicById.get(d.topic) : undefined; const c = tp ? areaOf(tp.area).color : "var(--color-mute)"; return (
              <motion.div key={d.id} layout initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="relative overflow-hidden rounded-xl border border-line bg-panel/70 py-2.5 pl-4 pr-3">
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: c }} />
                <div className="flex items-center gap-2"><span className="truncate text-[13.5px] font-medium">{d.title}</span><span className="ml-auto shrink-0 text-[11px]" style={{ color: c }}>{tp?.title ?? "General"}</span></div>
                <div className="line-clamp-1 text-[12px] text-faint">{d.md.replace(/\[\[b\d+\]\]/g, "▣").slice(0, 160)}</div>
              </motion.div>); })}
          </AnimatePresence>
          {!recent.length && <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-faint">{s.steps.map?.status === "running" ? "Filing sections under topic pages…" : "Notes will appear here as they are written."}</div>}
        </div>
      </div>
      {!!calls.length && (
        <div>
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-widest text-faint">Activity</div>
          <ul className="space-y-1 text-[12px]">{calls.map((c) => <li key={c.id} className="flex items-center gap-2 text-mute"><span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.error ? "bg-bad" : "bg-ok")} /><span className="truncate">{c.label}</span><span className="num ml-auto shrink-0 text-faint">{(c.ms / 1000).toFixed(1)}s · {usd(c.usd)}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}

function Done({ run }: { run: RunRecord }) {
  const s = run.cp.state;
  const ids = new Set(s.committed ?? []);
  const byTopic = new Map<string, number>();
  for (const d of Object.values(s.drafts)) if (d.accepted && !d.dupOf) byTopic.set(d.topic ?? "general", (byTopic.get(d.topic ?? "general") ?? 0) + 1);
  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow text-ok">Imported</div>
        <h2 className="display mt-1 text-2xl font-semibold">{ids.size} notes added to {byTopic.size} page{byTopic.size === 1 ? "" : "s"}</h2>
        <p className="mt-1 text-[13.5px] text-mute">They sit in an Imported notes section on each topic page, and in your Notes library. Spent {usd(s.usage.usd)} over {s.usage.calls} calls.</p>
      </div>
      {s.ledger && <div className="rounded-2xl border border-line bg-panel/50 p-4"><Ribbon state={s} /></div>}
      <div className="grid gap-2 sm:grid-cols-2">
        {[...byTopic].sort((a, b) => b[1] - a[1]).map(([t, n]) => { const tp = topicById.get(t); const c = tp ? areaOf(tp.area).color : "var(--color-mute)"; return (
          <Link key={t} href={tp ? `/learn/${t}#imported-notes` : "/notes?scope=general"} className="card card-hover flex items-center gap-3 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-[13px] font-semibold" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}>{n}</span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{tp?.title ?? "General / unclassified"}</span><ArrowRight size={14} className="text-faint" />
          </Link>); })}
      </div>
      <div className="flex flex-wrap gap-2">
        {run.undone ? <Button onClick={() => redoRun(run.id)}><Redo2 size={14} />Restore these notes</Button> : <Button variant="danger" onClick={() => undoRun(run.id)}><Undo2 size={14} />Undo this import</Button>}
      </div>
    </div>
  );
}

function RunView({ run, onClose }: { run: RunRecord; onClose: () => void }) {
  const s = run.cp.state;
  const dev = getAi(useStore((x) => x.settings)).devMode;
  const [tab, setTab] = useState<"run" | "trace">("run");
  const payload = run.cp.interrupt?.payload as { kind: "plan" | "review" | "final"; phase?: "first" | "extract" | "verify" | "enrich" } | undefined;
  const est = s.estimate;
  const waiting = run.status === "waiting";
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-text"><ArrowLeft size={14} />All imports</button>
        <div className="rounded-2xl border border-line bg-panel/60 p-4">
          <div className="truncate text-[15px] font-semibold">{run.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[12px]">
            <span className={cn("inline-flex items-center gap-1 font-medium", run.status === "running" ? "text-accent" : run.status === "waiting" ? "text-warn" : run.status === "done" ? "text-ok" : run.status === "failed" ? "text-bad" : "text-mute")}>
              {run.status === "running" && <Loader2 size={11} className="animate-spin" />}{({ running: "Working", waiting: "Waiting for you", paused: "Paused", failed: "Stopped by an error", done: "Done", cancelled: "Cancelled" } as const)[run.status]}
            </span>
            {isBackground(s.config) && run.status !== "done" && <span className="inline-flex items-center gap-1 text-faint"><Zap size={11} />hands-off</span>}
          </div>
          <div className="num mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-bg/60 py-2"><div className="text-[14px] font-semibold">{usd(s.usage.usd)}</div><div className="text-[10.5px] text-faint">{est ? `of ≈${usd(est.usd[1])}` : "spent"}</div></div>
            <div className="rounded-xl bg-bg/60 py-2"><div className="text-[14px] font-semibold">{Math.round((s.usage.inTok + s.usage.outTok) / 1000)}k</div><div className="text-[10.5px] text-faint">tokens</div></div>
            <div className="rounded-xl bg-bg/60 py-2"><div className="text-[14px] font-semibold">{Object.values(s.drafts).filter((d) => d.accepted && !d.dupOf).length}</div><div className="text-[10.5px] text-faint">notes</div></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {run.status === "running" && <Button size="sm" onClick={() => pauseRun(run.id)}><Pause size={13} />Pause</Button>}
            {(run.status === "paused" || run.status === "failed") && <Button size="sm" variant="primary" onClick={() => resumeRun(run.id)}><Play size={13} />{run.status === "failed" ? "Retry" : "Resume"}</Button>}
            {run.status !== "done" && run.status !== "cancelled" && !isBackground(s.config) && <Button size="sm" onClick={() => { backgroundRun(run.id); if (waiting) resumeRun(run.id, {}); }} title="Approve what is pending and switch off every further approval and checkpoint"><Zap size={13} />Hands-off</Button>}
            {run.status !== "done" && run.status !== "cancelled" && <Button size="sm" variant="ghost" onClick={() => cancelRun(run.id)}><X size={13} />Cancel</Button>}
          </div>
          {run.error && <p className="mt-3 rounded-lg bg-bad/10 p-2 text-[12px] text-bad">{run.error}</p>}
        </div>
        <div className="rounded-2xl border border-line bg-panel/40 p-4"><Rail state={s} running={run.status === "running"} /></div>
      </aside>
      <div className="min-w-0">
        {dev && <div className="mb-4 flex gap-1.5">{(["run", "trace"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cn("rounded-full border px-3 py-1 text-[12.5px]", tab === t ? "border-ai/50 bg-ai/10 text-text" : "border-line text-mute")}>{t === "run" ? "Run" : `Calls · ${run.calls.length}`}</button>)}</div>}
        {tab === "trace" && dev ? <Trace runId={run.id} calls={run.calls} />
          : waiting && payload?.kind === "plan" ? <PlanReview key={run.updated} run={run} />
          : waiting && payload?.kind === "review" ? <DraftsReview key={`r${run.cp.step}`} run={run} phase={payload.phase ?? "extract"} />
          : waiting && payload?.kind === "final" ? <DraftsReview key={`f${run.cp.step}`} run={run} phase="final" />
          : run.status === "done" ? <Done run={run} />
          : <Live run={run} />}
      </div>
    </div>
  );
}

function History({ runs, open }: { runs: RunRecord[]; open: (id: string) => void }) {
  if (!runs.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-faint">Your imports</h3>
      <ul className="divide-y divide-line/60 rounded-2xl border border-line bg-panel/40">
        {runs.map((r) => {
          const s = r.cp.state;
          const n = s.committed?.length ?? Object.values(s.drafts).filter((d) => d.accepted && !d.dupOf).length;
          const pct = s.ledger ? Math.round(((s.ledger.covered + s.ledger.skipped) / Math.max(1, s.ledger.total)) * 100) : null;
          return (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => open(r.id)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-[14px] font-medium">{r.name}{r.undone && <span className="ml-2 text-[11px] text-faint">undone</span>}</div>
                <div className="text-[12px] text-faint">{ago(r.created)} · {r.status === "done" ? `${n} notes` : r.status}{pct !== null ? ` · ${pct}% covered` : ""} · {usd(s.usage.usd)}</div>
              </button>
              {r.status === "done" && (r.undone ? <button onClick={() => redoRun(r.id)} className="text-[12px] text-mute hover:text-text">Restore</button> : <button onClick={() => undoRun(r.id)} className="text-[12px] text-mute hover:text-bad">Undo</button>)}
              <button onClick={() => void deleteRun(r.id)} aria-label="Forget this import" title="Forget this import (its notes stay)" className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:text-bad"><Trash2 size={13} /></button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ImportStudio({ runId, setRunId }: { runId: string | null; setRunId: (id: string | null) => void }) {
  const runs = useImports((s) => s.runs);
  const [doc, setDoc] = useState<{ d: ParsedDoc; warning?: string } | null>(null);
  useEffect(() => { void loadRuns(); }, []);
  const run = runId ? runs[runId] : undefined;
  const list = Object.values(runs).sort((a, b) => b.created - a.created);
  if (run) return <RunView run={run} onClose={() => setRunId(null)} />;
  if (doc) return <Prepare doc={doc.d} warning={doc.warning} onBack={() => setDoc(null)} onStart={(c) => { const id = startRun(doc.d, c); setDoc(null); setRunId(id); }} />;
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Drop onDoc={(d, warning) => setDoc({ d, warning })} />
      <div className="grid gap-3 text-[12.5px] text-mute sm:grid-cols-3">
        {[["Faithful", "Your wording, facts and code, cleaned up. Nothing invented; web additions are separate and cited."], ["Complete", "Every block of the document is tracked to a note, a skip you chose, or kept as written."], ["In your control", "Approve the plan, check in at checkpoints, or let it run hands-off. Undo any import."]].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-line bg-panel/40 p-4"><div className="text-[13.5px] font-semibold text-text">{t}</div><p className="mt-1 leading-relaxed">{d}</p></div>
        ))}
      </div>
      <History runs={list} open={setRunId} />
    </div>
  );
}
