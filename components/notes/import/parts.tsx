"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Check, ChevronDown, CircleDashed, Hand, Loader2, Pause, RotateCcw, SkipForward, Sparkles, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { getAi } from "@/lib/interview/tasks";
import { stepTarget, webAvailable, type CallRecord } from "@/lib/notes/import/llm";
import { callFeedback } from "@/lib/notes/import/runner";
import { PROMPTS, STEPS, backgroundConfig, type AiStep, type BlockState, type Estimate, type ImportConfig, type ImportState, type StepId, type StepState } from "@/lib/notes/import/pipeline";
import { isContent } from "@/lib/notes/import/doc";
import { topicById, areaOf } from "@/content";
import { cn } from "@/components/ui";

export const usd = (v: number) => (v < 0.01 ? `$${v.toFixed(v < 0.001 ? 4 : 3)}` : `$${v.toFixed(2)}`);
export const dur = (s: number) => (s < 60 ? `${Math.max(1, Math.round(s))}s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);

// ---------- pipeline rail ----------

function stepOn(id: StepId, c: ImportConfig): boolean {
  const s = STEPS.find((x) => x.id === id)!;
  if (s.optional) return c.steps[s.optional];
  if (s.gate) return c.approvals[s.gate];
  if (s.checkpoint) return c.checkpoints[s.checkpoint] && (id !== "review2" || c.steps.verify) && (id !== "review3" || c.steps.enrich);
  if (id === "extract") return true;
  return true;
}

export function Rail({ state, running, color = "var(--color-accent)" }: { state: ImportState; running: boolean; color?: string }) {
  const steps = STEPS.filter((s) => !s.checkpoint || stepOn(s.id, state.config) || state.steps[s.id]?.status === "done");
  const doneIdx = steps.reduce((a, s, i) => (["done", "skipped"].includes(state.steps[s.id]?.status ?? "") ? i : a), -1);
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const st: StepState = state.steps[s.id] ?? { status: "pending" };
        const off = !stepOn(s.id, state.config) && st.status === "pending";
        const status = off ? "off" : st.status === "running" && !running ? "paused" : st.status;
        const pct = st.total ? Math.min(1, (st.done ?? 0) / st.total) : 0;
        return (
          <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && (
              <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-[2px] overflow-hidden rounded-full bg-line">
                <motion.span className="absolute inset-x-0 top-0 rounded-full" style={{ background: color }} initial={false} animate={{ height: i < doneIdx || (i === doneIdx && doneIdx >= 0) ? "100%" : status === "running" ? `${pct * 100}%` : "0%" }} transition={{ duration: 0.6 }} />
                {status === "running" && <motion.span className="absolute left-1/2 h-3 w-[4px] -translate-x-1/2 rounded-full blur-[1px]" style={{ background: color }} animate={{ top: ["0%", "100%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />}
              </span>
            )}
            <span className={cn("relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] transition", status === "done" && "border-transparent text-ink", status === "skipped" || status === "off" ? "border-dashed border-line text-faint" : "", status === "pending" && "border-line bg-panel text-faint", status === "failed" && "border-bad/60 bg-bad/15 text-bad")}
              style={status === "done" ? { background: color } : status === "running" || status === "waiting" || status === "paused" ? { borderColor: color, color, background: `color-mix(in srgb, ${color} 12%, var(--color-panel))` } : undefined}>
              {status === "done" ? <Check size={14} strokeWidth={3} /> : status === "running" ? <Loader2 size={14} className="animate-spin" /> : status === "waiting" ? <Hand size={13} /> : status === "paused" ? <Pause size={12} /> : status === "skipped" || status === "off" ? <SkipForward size={12} /> : status === "failed" ? <AlertTriangle size={13} /> : <CircleDashed size={13} />}
              {status === "waiting" && <span className="absolute inset-0 animate-ping rounded-full" style={{ background: `color-mix(in srgb, ${color} 30%, transparent)` }} />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span className={cn("text-[13.5px] font-medium", (status === "off" || status === "skipped") && "text-faint line-through decoration-line", status === "pending" && "text-mute")}>{s.label}</span>
                {status === "waiting" && <span className="rounded-full px-1.5 text-[10.5px] font-semibold text-ink" style={{ background: color }}>Your turn</span>}
                {status === "running" && st.total ? <span className="num text-[11px] text-mute">{st.done ?? 0}/{st.total}</span> : null}
              </div>
              <div className="text-[11.5px] leading-snug text-faint">{status === "off" ? "Turned off" : st.note || s.what}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- coverage ribbon ----------

const RIBBON: Record<BlockState | "pending" | "planned", string> = {
  covered: "var(--color-ok)", weak: "var(--color-warn)", missing: "var(--color-bad)", dropped: "var(--color-lld)", skipped: "transparent", pending: "var(--color-line)", planned: "var(--color-line)",
};

/** One cell per content block, in document order: what happened to every piece of the document. */
export function Ribbon({ state, live = false }: { state: ImportState; live?: boolean }) {
  const [hover, setHover] = useState<string | null>(null);
  const cells = useMemo(() => {
    const covered = new Set(Object.values(state.drafts).filter((d) => d.accepted || d.dupOf).flatMap((d) => d.covers));
    return state.doc.sections.flatMap((sec) => sec.blocks.map((b) => {
      const p = state.plan[sec.id];
      const lb = state.ledger?.byBlock[b];
      const st: BlockState | "pending" | "planned" = p?.skip ? "skipped" : !live && lb ? lb : covered.has(b) ? "covered" : state.dropped[b] ? "dropped" : state.extracted.includes(sec.id) ? (live ? "weak" : "missing") : "pending";
      const area = p?.topic ? topicById.get(p.topic)?.area : undefined;
      return { b, st, sec, tint: area ? areaOf(area).color : "var(--color-mute)" };
    }));
  }, [state, live]);
  const n = cells.length || 1;
  const acc = cells.filter((c) => c.st === "covered" || c.st === "skipped").length;
  const h = hover ? cells.find((c) => c.b === hover) : null;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11.5px]">
        <span className="font-medium uppercase tracking-widest text-faint">Document coverage</span>
        <span className="num text-mute">{Math.round((acc / n) * 100)}% accounted for · {cells.length} blocks</span>
      </div>
      <div className="mt-2 flex h-7 w-full overflow-hidden rounded-lg border border-line bg-bg" onMouseLeave={() => setHover(null)}>
        {cells.map((c) => (
          <span key={c.b} onMouseEnter={() => setHover(c.b)} className="relative h-full min-w-[1px] flex-1 border-r border-bg/70 transition-colors last:border-r-0"
            style={{ background: c.st === "skipped" ? "repeating-linear-gradient(135deg, var(--color-line) 0 2px, transparent 2px 5px)" : c.st === "pending" ? `color-mix(in srgb, ${c.tint} 16%, var(--color-panel))` : RIBBON[c.st], opacity: hover && hover !== c.b ? 0.55 : 1 }} />
        ))}
      </div>
      <div className="mt-1.5 flex min-h-[34px] items-start justify-between gap-4 text-[11.5px]">
        {h ? <span className="line-clamp-2 text-mute"><span className="text-faint">{h.sec.path.join(" › ")} · </span>{state.doc.blocks[h.b].text.slice(0, 160) || state.doc.blocks[h.b].kind}</span>
          : <span className="flex flex-wrap gap-x-3 gap-y-1 text-faint">{([["covered", "In a note"], ["weak", live ? "Being written" : "Partly covered"], ["missing", "Missing"], ["dropped", "Left out by the model"], ["skipped", "Skipped"]] as const).map(([k, l]) => <span key={k} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: k === "skipped" ? "repeating-linear-gradient(135deg, var(--color-mute) 0 1px, transparent 1px 3px)" : RIBBON[k] }} />{l}</span>)}</span>}
      </div>
    </div>
  );
}

// ---------- options ----------

function Toggle({ on, set, disabled, label, sub, cost }: { on: boolean; set: (b: boolean) => void; disabled?: string | false; label: string; sub?: string; cost?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2 transition hover:bg-white/[0.03]", disabled && "cursor-not-allowed opacity-50")} title={disabled || undefined}>
      <button type="button" role="switch" aria-checked={on} disabled={!!disabled} onClick={() => set(!on)} className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition", on ? "border-accent bg-accent" : "border-line bg-panel2")}>
        <motion.span layout className={cn("absolute top-[2px] h-[14px] w-[14px] rounded-full", on ? "right-[2px] bg-ink" : "left-[2px] bg-mute")} />
      </button>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2 text-[13.5px] font-medium">{label}{cost && <span className="num text-[11px] font-normal text-faint">{cost}</span>}</span>
        {(sub || disabled) && <span className="block text-[12px] leading-snug text-faint">{disabled || sub}</span>}
      </span>
    </label>
  );
}

export function isBackground(c: ImportConfig) {
  return !c.approvals.plan && !c.approvals.final && !Object.values(c.checkpoints).some(Boolean);
}

export function Options({ config, set, estimate, compact }: { config: ImportConfig; set: (c: ImportConfig) => void; estimate?: Estimate | null; compact?: boolean }) {
  const settings = useStore((s) => s.settings);
  const dev = getAi(settings).devMode;
  const cost = (step: AiStep) => { const r = estimate?.steps.find((x) => x.step === step); return r ? `≈ ${usd(r.usd)}` : undefined; };
  const st = (k: keyof ImportConfig["steps"], v: boolean) => set({ ...config, steps: { ...config.steps, [k]: v } });
  const ap = (k: keyof ImportConfig["approvals"], v: boolean) => set({ ...config, approvals: { ...config.approvals, [k]: v } });
  const cp = (k: keyof ImportConfig["checkpoints"], v: boolean) => set({ ...config, checkpoints: { ...config.checkpoints, [k]: v } });
  const bg = isBackground(config);
  const enrichProvider = stepTarget(settings, config, "enrich").provider;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-bg p-1">
        {[{ id: false, icon: Hand, t: "Guided", d: "Approve the plan and the result" }, { id: true, icon: Zap, t: "Hands-off", d: "Runs in the background to the end" }].map((m) => (
          <button key={String(m.id)} onClick={() => set(m.id ? backgroundConfig(config) : { ...config, approvals: { plan: true, final: true }, checkpoints: { ...config.checkpoints, firstBatch: true } })}
            className={cn("relative rounded-xl px-3 py-2.5 text-left transition", bg === m.id ? "text-text" : "text-mute hover:text-text")}>
            {bg === m.id && <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-xl border border-accent/40 bg-accent/10" />}
            <span className="relative flex items-center gap-1.5 text-[13.5px] font-semibold"><m.icon size={14} />{m.t}</span>
            <span className="relative block text-[11.5px] text-faint">{m.d}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-widest text-faint">Steps</div>
        <Toggle on={config.steps.skip} set={(v) => st("skip", v)} label="Suggest what to skip" sub="Tables of contents, boilerplate, off-topic text. You confirm each one in the plan." />
        <Toggle on={config.steps.dedup} set={(v) => st("dedup", v)} label="Remove duplicates" sub="Within the document and against your earlier imports. Duplicates are set aside, not deleted." cost={cost("dedup")} />
        {config.steps.dedup && !compact && <div className="ml-11"><Toggle on={config.steps.aiDedup} set={(v) => st("aiDedup", v)} label="Let the model judge near-duplicates" /></div>}
        <Toggle on={config.steps.verify} set={(v) => st("verify", v)} label="Verify every note" sub="Every sentence reads well and says only what your document says." cost={cost("verify")} />
        {config.steps.verify && !compact && <div className="ml-11"><Toggle on={config.steps.autoFix} set={(v) => st("autoFix", v)} label="Fix problems automatically" sub="The original wording is kept, so you can restore it." /></div>}
        <Toggle on={config.steps.enrich} set={(v) => st("enrich", v)} label="Enrich from the web" sub="Cited additions and corrections, kept apart from your own text." cost={cost("enrich")} disabled={!webAvailable(enrichProvider) && "Needs Claude, Gemini or OpenAI: a local host has no web search."} />
        <Toggle on={config.steps.deepCoverage} set={(v) => st("deepCoverage", v)} label="Ask the model what is missing" sub="On top of the block-by-block check, which always runs." cost={cost("coverage")} />
      </div>

      <div>
        <div className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-widest text-faint">Approvals and checkpoints</div>
        <Toggle on={config.approvals.plan} set={(v) => ap("plan", v)} label="Approve the plan" sub="Mapping, skips and the cost estimate, before anything is written." />
        <Toggle on={config.checkpoints.firstBatch} set={(v) => cp("firstBatch", v)} label="Look at the first notes" sub="Pause after the first batch, before the rest are written." />
        {!compact && <>
          <Toggle on={config.checkpoints.afterExtract} set={(v) => cp("afterExtract", v)} label="Checkpoint after writing" />
          <Toggle on={config.checkpoints.afterVerify} set={(v) => cp("afterVerify", v)} disabled={!config.steps.verify && "Verification is off"} label="Checkpoint after verification" />
          <Toggle on={config.checkpoints.afterEnrich} set={(v) => cp("afterEnrich", v)} disabled={!config.steps.enrich && "Enrichment is off"} label="Checkpoint after enrichment" />
        </>}
        <Toggle on={config.approvals.final} set={(v) => ap("final", v)} label="Final review" sub="Otherwise notes are added as soon as they are ready; you can still undo the whole import." />
      </div>
      {dev && <DevTune config={config} set={set} />}
    </div>
  );
}

// ---------- developer mode: per-step tuning ----------

const AI_STEPS: { id: AiStep; label: string }[] = [{ id: "map", label: "Map to topics" }, { id: "extract", label: "Write notes" }, { id: "dedup", label: "Duplicate judge" }, { id: "verify", label: "Verify" }, { id: "enrich", label: "Enrich" }, { id: "coverage", label: "Missing-content check" }];

function DevTune({ config, set }: { config: ImportConfig; set: (c: ImportConfig) => void }) {
  const settings = useStore((s) => s.settings);
  const [open, setOpen] = useState<AiStep | null>(null);
  const tune = (step: AiStep, p: Partial<NonNullable<ImportConfig["dev"]["tune"][AiStep]>>) => set({ ...config, dev: { ...config.dev, tune: { ...config.dev.tune, [step]: { ...config.dev.tune[step], ...p } } } });
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div className="rounded-2xl border border-dashed border-ai/40 bg-ai/[0.04] p-3">
      <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-widest text-ai"><Sparkles size={11} />Developer mode · per-step tuning</div>
      <p className="mt-1 px-1 text-[11.5px] text-faint">Overrides apply to this import only. Defaults come from Settings → AI tasks. Pick sections to run in the plan.</p>
      <div className="mt-2 space-y-1">
        {AI_STEPS.map((s) => {
          const t = config.dev.tune[s.id] ?? {};
          const r = stepTarget(settings, config, s.id);
          const on = open === s.id;
          return (
            <div key={s.id} className="rounded-xl border border-line bg-panel/70">
              <button onClick={() => setOpen(on ? null : s.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px]">
                <span className="font-medium">{s.label}</span>
                <span className="num truncate text-faint">{r.provider} · {r.model || "no model"}{Object.keys(t).length ? " · tuned" : ""}</span>
                <ChevronDown size={14} className={cn("ml-auto shrink-0 text-faint transition", on && "rotate-180")} />
              </button>
              {on && (
                <div className="grid gap-2 border-t border-line p-3 text-[12px] sm:grid-cols-2">
                  <label className="space-y-1"><span className="text-faint">Provider</span>
                    <select value={t.provider ?? ""} onChange={(e) => tune(s.id, { provider: e.target.value as "" })} className="h-8 w-full rounded-lg border border-line bg-bg px-2 outline-none">
                      <option value="">Task default</option><option value="gemini">Gemini</option><option value="claude">Claude</option><option value="openai">OpenAI</option><option value="local">Local host</option>
                    </select></label>
                  <label className="space-y-1"><span className="text-faint">Model</span><input value={t.model ?? ""} placeholder={r.model} onChange={(e) => tune(s.id, { model: e.target.value })} className="h-8 w-full rounded-lg border border-line bg-bg px-2 font-mono outline-none" /></label>
                  <label className="space-y-1"><span className="text-faint">Temperature</span><input type="number" step={0.05} min={0} max={2} value={t.temperature ?? ""} placeholder={String(r.params.temperature ?? "")} onChange={(e) => tune(s.id, { temperature: num(e.target.value) })} className="h-8 w-full rounded-lg border border-line bg-bg px-2 outline-none" /></label>
                  <label className="space-y-1"><span className="text-faint">Max output tokens</span><input type="number" step={256} min={256} value={t.maxOutputTokens ?? ""} placeholder={String(r.params.maxOutputTokens ?? "")} onChange={(e) => tune(s.id, { maxOutputTokens: num(e.target.value) })} className="h-8 w-full rounded-lg border border-line bg-bg px-2 outline-none" /></label>
                  <label className="space-y-1"><span className="text-faint">Reasoning</span>
                    <select value={t.reasoning ?? ""} onChange={(e) => tune(s.id, { reasoning: (e.target.value || undefined) as "low" })} className="h-8 w-full rounded-lg border border-line bg-bg px-2 outline-none"><option value="">Default ({r.params.reasoning ?? "n/a"})</option><option value="off">Off</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
                  <label className="space-y-1"><span className="text-faint">Batch size (chars) · concurrency</span>
                    <span className="flex gap-2"><input type="number" step={500} min={1000} value={t.batchChars ?? ""} placeholder={String(r.batchChars)} onChange={(e) => tune(s.id, { batchChars: num(e.target.value) })} className="h-8 w-full rounded-lg border border-line bg-bg px-2 outline-none" /><input type="number" min={1} max={8} value={t.concurrency ?? ""} placeholder={String(r.concurrency)} onChange={(e) => tune(s.id, { concurrency: num(e.target.value) })} className="h-8 w-20 rounded-lg border border-line bg-bg px-2 outline-none" /></span></label>
                  <label className="space-y-1 sm:col-span-2"><span className="flex items-center justify-between text-faint">System prompt{t.prompt ? <button onClick={() => tune(s.id, { prompt: undefined })} className="inline-flex items-center gap-1 text-mute hover:text-text"><RotateCcw size={11} />Reset</button> : null}</span>
                    <textarea value={t.prompt ?? PROMPTS[s.id]} onChange={(e) => tune(s.id, { prompt: e.target.value === PROMPTS[s.id] ? undefined : e.target.value })} rows={6} className="w-full resize-y rounded-lg border border-line bg-bg px-2.5 py-2 font-mono text-[11.5px] leading-relaxed outline-none" /></label>
                  {r.provider === "local" && <p className="text-[11px] text-faint sm:col-span-2">A local host takes only temperature, top-p, seed, stop and max tokens today; reasoning and JSON mode are not sent, and the reply is validated here.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- developer mode: every call of the run ----------

export function Trace({ runId, calls }: { runId: string; calls: CallRecord[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [step, setStep] = useState<AiStep | "all">("all");
  const list = calls.filter((c) => step === "all" || c.step === step).slice().reverse();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {(["all", ...AI_STEPS.map((s) => s.id)] as const).map((s) => <button key={s} onClick={() => setStep(s)} className={cn("rounded-full border px-2.5 py-0.5 text-[11.5px]", step === s ? "border-ai/60 bg-ai/10 text-ai" : "border-line text-mute")}>{s === "all" ? `All ${calls.length}` : s}</button>)}
      </div>
      {!list.length && <p className="text-[12.5px] text-faint">No calls yet.</p>}
      {list.map((c) => (
        <div key={c.id} className={cn("rounded-xl border bg-panel/60", c.error ? "border-bad/40" : "border-line")}>
          <button onClick={() => setOpen(open === c.id ? null : c.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px]">
            <span className="rounded bg-ai/10 px-1.5 font-mono text-[10.5px] text-ai">{c.step}</span>
            <span className="min-w-0 flex-1 truncate">{c.label}</span>
            <span className="num hidden shrink-0 text-faint sm:inline">{c.model} · {(c.ms / 1000).toFixed(1)}s · {c.inTok}→{c.outTok} tok · {usd(c.usd)}{c.searches ? ` · ${c.searches} searches` : ""}</span>
            {c.error && <AlertTriangle size={13} className="shrink-0 text-bad" />}
          </button>
          {open === c.id && (
            <div className="space-y-2 border-t border-line p-3 text-[11.5px]">
              <div className="num text-faint">{c.provider} · {c.model} · prompt v{c.promptVersion} · {JSON.stringify(c.params)}</div>
              {c.error && <div className="rounded-lg bg-bad/10 p-2 text-bad">{c.error}</div>}
              {[["System", c.system], ["Input", c.user], ["Output", c.output]].map(([k, v]) => (
                <details key={k} open={k === "Output"}><summary className="cursor-pointer text-mute">{k} · {v.length.toLocaleString()} chars</summary><pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-bg p-2.5 font-mono text-[11px] leading-relaxed text-mute">{v}</pre></details>
              ))}
              {!!c.sources?.length && <div className="text-faint">Sources: {c.sources.map((s) => s.url).join(", ")}</div>}
              <textarea defaultValue={c.feedback} onBlur={(e) => e.target.value !== (c.feedback ?? "") && callFeedback(runId, c.id, e.target.value)} placeholder="Your comment on this call (saved with the run)" rows={2} className="w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 outline-none" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export const contentCount = (s: ImportState) => s.doc.order.filter((id) => isContent(s.doc.blocks[id])).length;
