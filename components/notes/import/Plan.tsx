"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Ban, Check, ChevronDown, Clock, Coins, Eye, EyeOff, Filter } from "lucide-react";
import { AREAS, TOPICS, areaOf, topicById } from "@/content";
import { useStore } from "@/lib/store";
import { getAi } from "@/lib/interview/tasks";
import { estimateFor, resumeRun, type RunRecord } from "@/lib/notes/import/runner";
import type { ImportConfig, SectionPlan } from "@/lib/notes/import/pipeline";
import { Button, cn } from "@/components/ui";
import { Options, dur, usd } from "./parts";

const STEP_NAME: Record<string, string> = { map: "Map to topics", extract: "Write notes", dedup: "Duplicate judge", verify: "Verify", enrich: "Enrich from the web", coverage: "Missing-content check" };

export function TopicSelect({ value, onChange, className }: { value: string | null; onChange: (v: string | null) => void; className?: string }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} aria-label="Topic page" className={cn("h-8 min-w-0 rounded-lg border border-line bg-bg px-2 text-[12.5px] outline-none focus:border-accent/60", className)}>
      <option value="">General / unclassified</option>
      {AREAS.map((a) => <optgroup key={a.id} label={a.name}>{TOPICS.filter((t) => t.area === a.id).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</optgroup>)}
    </select>
  );
}

function Scope({ label, value, topics, set }: { label: string; value: "all" | string[]; topics: string[]; set: (v: "all" | string[]) => void }) {
  const on = (t: string) => value === "all" || value.includes(t);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]"><span className="font-medium text-mute">{label}</span><button onClick={() => set(value === "all" ? [] : "all")} className="text-faint hover:text-text">{value === "all" ? "Choose pages" : "All pages"}</button></div>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((t) => {
          const tp = topicById.get(t);
          const c = tp ? areaOf(tp.area).color : "var(--color-mute)";
          return <button key={t} onClick={() => { const cur = value === "all" ? topics : value; set(on(t) ? cur.filter((x) => x !== t) : [...cur, t]); }}
            className={cn("rounded-full border px-2.5 py-0.5 text-[11.5px] transition", on(t) ? "text-text" : "border-line text-faint")} style={on(t) ? { borderColor: `color-mix(in srgb, ${c} 50%, transparent)`, background: `color-mix(in srgb, ${c} 12%, transparent)` } : undefined}>{tp?.title ?? "General"}</button>;
        })}
      </div>
    </div>
  );
}

export function PlanReview({ run }: { run: RunRecord }) {
  const s = run.cp.state;
  const dev = getAi(useStore((x) => x.settings)).devMode;
  const [plan, setPlan] = useState<Record<string, SectionPlan>>(s.plan);
  const [config, setConfig] = useState<ImportConfig>(s.config);
  const [filter, setFilter] = useState<"all" | "low" | "skip" | "general">("all");
  const [peek, setPeek] = useState<string | null>(null);
  const [showOpts, setShowOpts] = useState(false);
  const est = useMemo(() => estimateFor({ ...s, plan }, config), [s, plan, config]);
  const edit = (id: string, p: Partial<SectionPlan>) => setPlan((x) => ({ ...x, [id]: { ...x[id], ...p, edited: true } }));
  const live = s.doc.sections.filter((x) => !plan[x.id]?.skip);
  const topics = [...new Set(live.map((x) => plan[x.id]?.topic ?? "general"))];
  const byTopic = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of live) m.set(plan[x.id]?.topic ?? "general", (m.get(plan[x.id]?.topic ?? "general") ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [live, plan]);
  const rows = s.doc.sections.filter((x) => {
    const p = plan[x.id];
    return filter === "all" || (filter === "low" && !p.skip && p.topic && p.conf < 0.6) || (filter === "skip" && p.skip) || (filter === "general" && !p.skip && !p.topic);
  });
  const sel = config.dev.sections;
  const toggleSel = (id: string) => setConfig((c) => { const cur = c.dev.sections ?? s.doc.sections.map((x) => x.id); const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; return { ...c, dev: { ...c.dev, sections: next.length === s.doc.sections.length ? null : next } }; });

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow text-accent">Approve the plan</div>
        <h2 className="display mt-1 text-2xl font-semibold">{live.length} sections to {byTopic.filter(([t]) => t !== "general").length} pages{byTopic.some(([t]) => t === "general") ? " and General" : ""}</h2>
        <p className="mt-1 text-[13.5px] text-mute">Check where each section goes. Nothing is written until you approve, and nothing is spent beyond the mapping so far ({usd(s.usage.usd)}).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-panel/70 p-4"><div className="flex items-center gap-1.5 text-[11.5px] uppercase tracking-widest text-faint"><Coins size={12} />Estimated cost</div><div className="num mt-1 text-xl font-semibold">{usd(est.usd[0])}–{usd(est.usd[1])}</div><div className="text-[11.5px] text-faint">{Math.round(est.tokens / 1000).toLocaleString()}k tokens</div></div>
        <div className="rounded-2xl border border-line bg-panel/70 p-4"><div className="flex items-center gap-1.5 text-[11.5px] uppercase tracking-widest text-faint"><Clock size={12} />Estimated time</div><div className="num mt-1 text-xl font-semibold">{dur(est.sec[0])}–{dur(est.sec[1])}</div><div className="text-[11.5px] text-faint">Runs in the background; keep studying</div></div>
        <div className="rounded-2xl border border-line bg-panel/70 p-4"><div className="text-[11.5px] uppercase tracking-widest text-faint">Pages</div>
          <div className="mt-1.5 flex flex-wrap gap-1">{byTopic.slice(0, 8).map(([t, n]) => { const tp = topicById.get(t); return <span key={t} className="rounded-full px-2 py-0.5 text-[11px]" style={{ color: tp ? areaOf(tp.area).color : "var(--color-mute)", background: `color-mix(in srgb, ${tp ? areaOf(tp.area).color : "var(--color-mute)"} 12%, transparent)` }}>{tp?.title ?? "General"} · {n}</span>; })}{byTopic.length > 8 && <span className="text-[11px] text-faint">+{byTopic.length - 8}</span>}</div>
        </div>
      </div>

      <details className="group rounded-2xl border border-line bg-panel/50">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] text-mute"><ChevronDown size={14} className="transition group-open:rotate-180" />Cost by step</summary>
        <div className="overflow-x-auto px-4 pb-3">
          <table className="w-full min-w-[520px] text-[12.5px]"><thead><tr className="text-left text-[11px] uppercase tracking-widest text-faint"><th className="py-1.5 font-medium">Step</th><th className="font-medium">Model</th><th className="text-right font-medium">Calls</th><th className="text-right font-medium">Tokens in → out</th><th className="text-right font-medium">Cost</th><th className="text-right font-medium">Time</th></tr></thead>
            <tbody>{est.steps.map((r) => <tr key={r.step} className="border-t border-line/60"><td className="py-1.5">{STEP_NAME[r.step]}</td><td className="num text-faint">{r.provider} · {r.model}</td><td className="num text-right">{r.calls}</td><td className="num text-right text-mute">{(r.inTok / 1000).toFixed(1)}k → {(r.outTok / 1000).toFixed(1)}k{r.searches ? ` · ${r.searches} searches` : ""}</td><td className="num text-right">{usd(r.usd)}</td><td className="num text-right text-mute">{dur(r.sec)}</td></tr>)}</tbody>
          </table>
          <p className="mt-2 text-[11.5px] text-faint">Approximate list prices; your provider bills you directly. Local hosts cost nothing here.</p>
        </div>
      </details>

      <div className="rounded-2xl border border-line bg-panel/50">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <Filter size={13} className="text-faint" />
          {([["all", `All ${s.doc.sections.length}`], ["low", "Unsure"], ["general", "General"], ["skip", "Skipped"]] as const).map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={cn("rounded-full px-2.5 py-0.5 text-[12px]", filter === k ? "bg-panel2 text-text" : "text-mute hover:text-text")}>{l}</button>)}
          {dev && <span className="ml-auto text-[11.5px] text-ai">{sel ? `${sel.length} selected to run` : "Developer: tick sections to run only those"}</span>}
        </div>
        <ul className="max-h-[56vh] divide-y divide-line/60 overflow-y-auto">
          {rows.map((x) => {
            const p = plan[x.id];
            const tp = p.topic ? topicById.get(p.topic) : undefined;
            const c = tp ? areaOf(tp.area).color : "var(--color-mute)";
            return (
              <li key={x.id} className={cn("px-4 py-2.5 transition", p.skip && "opacity-55")}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {dev && <input type="checkbox" checked={!sel || sel.includes(x.id)} onChange={() => toggleSel(x.id)} aria-label={`Run ${x.title}`} className="accent-[var(--color-ai)]" />}
                  <button onClick={() => setPeek(peek === x.id ? null : x.id)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-[11px] text-faint">{x.path.slice(0, -1).join(" › ") || " "}</div>
                    <div className="flex items-center gap-2 text-[13.5px] font-medium"><span className="truncate">{x.title}</span><span className="num shrink-0 text-[11px] font-normal text-faint">{x.blocks.length} blocks</span>{peek === x.id ? <EyeOff size={12} className="shrink-0 text-faint" /> : <Eye size={12} className="shrink-0 text-faint" />}</div>
                  </button>
                  {!p.skip && (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-line" title={`${Math.round(p.conf * 100)}% confident${p.reason ? `: ${p.reason}` : ""}`}><span className="block h-full rounded-full" style={{ width: `${Math.max(6, p.conf * 100)}%`, background: p.conf >= 0.6 ? c : "var(--color-warn)" }} /></span>
                      <TopicSelect value={p.topic} onChange={(v) => edit(x.id, { topic: v, conf: 1, reason: "Chosen by you" })} className="w-[190px]" />
                    </span>
                  )}
                  <button onClick={() => edit(x.id, { skip: p.skip ? null : { kind: "user", why: "Skipped by you", by: "user" } })} title={p.skip ? `Skipped: ${p.skip.why}. Click to include.` : "Skip this section"}
                    className={cn("inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[12px]", p.skip ? "border-warn/40 bg-warn/10 text-warn" : "border-line text-faint hover:text-text")}>
                    {p.skip ? <><Ban size={12} />Skipped</> : <><Check size={12} />Include</>}
                  </button>
                </div>
                {(p.skip || p.alt || (p.reason && p.conf < 0.6)) && (
                  <div className="mt-1 flex flex-wrap gap-x-3 text-[11.5px] text-faint">
                    {p.skip && <span className="text-warn/90">{p.skip.why}{p.skip.by === "ai" ? " (suggested)" : ""}</span>}
                    {!p.skip && p.reason && p.conf < 0.6 && <span>{p.reason}</span>}
                    {!p.skip && p.alt && <button onClick={() => edit(x.id, { topic: p.alt, alt: p.topic })} className="hover:text-text">Or: {topicById.get(p.alt)?.title} →</button>}
                  </div>
                )}
                {peek === x.id && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-bg p-3 font-mono text-[11.5px] leading-relaxed text-mute">{x.blocks.map((b) => s.doc.blocks[b].kind === "image" ? `[image${s.doc.blocks[b].alt ? `: ${s.doc.blocks[b].alt}` : ""}]` : s.doc.blocks[b].md).join("\n\n")}</motion.div>}
              </li>
            );
          })}
          {!rows.length && <li className="px-4 py-6 text-center text-[13px] text-faint">Nothing here.</li>}
        </ul>
      </div>

      {(config.steps.verify || config.steps.enrich) && topics.length > 1 && (
        <div className="space-y-3 rounded-2xl border border-line bg-panel/50 p-4">
          {config.steps.verify && <Scope label="Verify notes on" value={config.verifyTopics} topics={topics} set={(v) => setConfig({ ...config, verifyTopics: v })} />}
          {config.steps.enrich && <Scope label="Enrich notes on" value={config.enrichTopics} topics={topics} set={(v) => setConfig({ ...config, enrichTopics: v })} />}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-panel/50">
        <button onClick={() => setShowOpts((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] text-mute"><ChevronDown size={14} className={cn("transition", showOpts && "rotate-180")} />Steps, approvals and checkpoints</button>
        {showOpts && <div className="px-2 pb-3"><Options config={config} set={setConfig} estimate={est} /></div>}
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-panel/95 p-3 shadow-2xl backdrop-blur">
        <span className="text-[12.5px] text-mute">{live.length} sections · {usd(est.usd[0])}–{usd(est.usd[1])} · about {dur(est.sec[1])}</span>
        <Button variant="primary" className="ml-auto" onClick={() => resumeRun(run.id, { plan, config })}>Approve and write notes<ArrowRight size={15} /></Button>
      </div>
    </div>
  );
}
