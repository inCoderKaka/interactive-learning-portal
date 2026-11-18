"use client";
// Evaluation runner (MI-DEV-7): replay labelled transcripts through the scorecard task with the current
// settings and compare with the reference; and check the interrupt judge on labelled whiteboard moments.
import { useRef, useState } from "react";
import { FlaskConical, Play, Square } from "lucide-react";
import { Button, Pill, cn } from "@/components/ui";
import type { Settings } from "@/lib/types";
import { initBrain } from "@/lib/interview/core/brain";
import { judgePrompt } from "@/lib/interview/core/prompts";
import { DECISION_LABEL, DIMENSIONS } from "@/lib/interview/core/scoring";
import { interventionMetrics, scoreCase, summarise, type CaseResult, type EvalCase, type InterventionResult } from "@/lib/interview/core/evaluation";
import { EVAL_CASES, INTERVENTION_CASES } from "@/lib/interview/core/eval-cases";
import { totalOf } from "@/lib/interview/core/usage";
import { loadHistory, scoreSession } from "@/lib/interview/results";
import { activePrompts, providerReady, resolved, runTask } from "@/lib/interview/tasks";
import { spendThisMonth } from "@/lib/interview/meter";

function myCases(): EvalCase[] {
  return loadHistory().filter((h) => h.scorecard && h.log.length && !h.cfg.redo && (h.cfg.format ?? "standard") === "standard").slice(0, 20).map((h) => ({
    id: h.id, title: `${h.question.title} (${new Date(h.at).toLocaleDateString()})`, source: "my-round", cfg: h.cfg, question: h.question, log: h.log, hints: h.hints,
    label: { decision: h.scorecard!.decision, scores: Object.fromEntries(h.scorecard!.ratings.map((r) => [r.dimension, r.score])) },
  }));
}

export function EvalRunner({ settings }: { settings: Settings }) {
  const [set, setSet] = useState<"built-in" | "mine">("built-in");
  const [running, setRunning] = useState<"cards" | "judge" | null>(null);
  const [results, setResults] = useState<CaseResult[]>([]);
  const [judge, setJudge] = useState<InterventionResult[]>([]);
  const stopRef = useRef(false);
  const ready = providerReady(settings, settings.provider);
  const prompts = activePrompts(settings);
  const sc = resolved(settings, "scorecard");

  const runCards = async () => {
    const cases = set === "built-in" ? EVAL_CASES : myCases();
    setResults([]); stopRef.current = false; setRunning("cards");
    const out: CaseResult[] = [];
    for (const c of cases) {
      if (stopRef.current) break;
      const cfg = { ...c.cfg, prompts };
      const st = { ...initBrain(cfg, c.question, 0), hints: c.hints, digests: Object.fromEntries(c.log.flatMap(({ e }) => (e.type === "digest" ? [[e.surface, e.full]] : []))) };
      const before = totalOf(spendThisMonth()), t0 = performance.now();
      let r: CaseResult;
      try { r = { id: c.id, title: c.title, expected: c.label, got: await scoreSession(settings, cfg, st, c.log), ms: performance.now() - t0, costUsd: 0 }; }
      catch (e) { r = { id: c.id, title: c.title, expected: c.label, error: e instanceof Error ? e.message : String(e), ms: performance.now() - t0, costUsd: 0 }; }
      r.costUsd = Math.max(0, totalOf(spendThisMonth()) - before);
      out.push(r);
      setResults([...out]);
    }
    setRunning(null);
  };

  const runJudge = async () => {
    setJudge([]); stopRef.current = false; setRunning("judge");
    const out: InterventionResult[] = [];
    for (const c of INTERVENTION_CASES) {
      if (stopRef.current) break;
      const cfg = { ...EVAL_CASES[2].cfg, kind: "hld" as const, prompts };
      const st = { ...initBrain(cfg, c.question, 0), phase: "problem" as const, digests: { whiteboard: c.board } };
      const p = judgePrompt(cfg, st, 20 * 60000, c.trigger);
      let got: boolean | null = null;
      try {
        const t = await runTask(settings, "interviewer.judge", p.system, [{ role: "user", content: p.user }]);
        got = !!(JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)) as { speak?: boolean }).speak;
      } catch { got = null; }
      out.push({ id: c.id, expected: c.speak, got });
      setJudge([...out]);
    }
    setRunning(null);
  };

  const sum = results.length ? summarise(results) : null;
  const jm = judge.length ? interventionMetrics(judge) : null;
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <div className="space-y-3 rounded-xl border border-line bg-panel2 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <FlaskConical size={15} className="text-accent" />
        <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold">Evaluation runner</div><div className="text-[12px] text-mute">Replays labelled rounds through the scorecard task as currently configured ({sc.provider} · {sc.model}, {sc.samples ?? 1} sample{(sc.samples ?? 1) > 1 ? "s" : ""}{prompts ? ", with your prompt overrides" : ""}). Costs your normal AI usage.</div></div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
        {(["built-in", "mine"] as const).map((s) => <button key={s} onClick={() => setSet(s)} aria-pressed={set === s} className={cn("rounded-full border px-3 py-1", set === s ? "border-accent/60 text-accent" : "border-line text-mute")}>{s === "built-in" ? `Reference set (${EVAL_CASES.length})` : "My scored rounds (their scorecards as reference)"}</button>)}
        <Button size="sm" variant="primary" disabled={!ready || !!running} onClick={() => void runCards()}><Play size={13} />Run scorecards</Button>
        <Button size="sm" disabled={!ready || !!running} onClick={() => void runJudge()}><Play size={13} />Run interrupt judge ({INTERVENTION_CASES.length})</Button>
        {running && <Button size="sm" variant="ghost" onClick={() => { stopRef.current = true; }}><Square size={13} />Stop after this case</Button>}
      </div>
      {!ready && <p className="text-[12px] text-warn">Connect an AI provider first.</p>}
      {sum && (
        <div className="grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-6">
          {[["Decision exact", pct(sum.exact)], ["Within one step", pct(sum.withinOne)], ["Rubric error (MAE)", sum.mae.toFixed(2)], ["Bias", `${sum.bias > 0 ? "+" : ""}${sum.bias.toFixed(2)} steps`], ["Avg latency", `${(sum.avgMs / 1000).toFixed(1)} s`], ["Cost", `$${sum.costUsd.toFixed(3)}`]].map(([k, v]) => <div key={k} className="rounded-lg border border-line bg-bg p-2"><div className="text-faint">{k}</div><div className="num font-semibold">{v}</div></div>)}
        </div>
      )}
      {results.length > 0 && (
        <div className="overflow-x-auto"><table className="w-full text-[12.5px]"><thead className="text-left text-faint"><tr><th className="py-1 pr-3 font-medium">Case</th><th className="pr-3 font-medium">Reference</th><th className="pr-3 font-medium">Now</th><th className="pr-3 font-medium">Per dimension (ref → now)</th></tr></thead><tbody>
          {results.map((r) => {
            const s = r.got ? scoreCase(r.expected, r.got) : null;
            const kindDims = DIMENSIONS[(EVAL_CASES.find((c) => c.id === r.id)?.cfg.kind) ?? "coding"];
            return (
              <tr key={r.id} className="border-t border-line/60 align-top">
                <td className="py-1.5 pr-3">{r.title}</td>
                <td className="pr-3">{DECISION_LABEL[r.expected.decision]}</td>
                <td className="pr-3">{r.got ? <span className={cn(s!.exact ? "text-ok" : s!.withinOne ? "text-warn" : "text-bad")}>{DECISION_LABEL[r.got.decision]}</span> : <span className="text-bad" title={r.error}>failed</span>}</td>
                <td className="pr-3 font-mono text-[11.5px] text-mute">{s ? s.dims.map((d) => `${kindDims.find((k) => k.key === d.dim)?.label ?? d.dim} ${d.expected}→${d.got}`).join(" · ") : r.error?.slice(0, 120)}</td>
              </tr>
            );
          })}
        </tbody></table></div>
      )}
      {jm && (
        <div className="space-y-1.5 text-[12.5px]">
          <div className="flex flex-wrap gap-2"><Pill className="border-line text-mute">precision {pct(jm.precision)}</Pill><Pill className="border-line text-mute">recall {pct(jm.recall)}</Pill><Pill className="border-line text-mute">accuracy {pct(jm.accuracy)}</Pill>{jm.failed > 0 && <Pill className="border-bad/40 text-bad">{jm.failed} failed</Pill>}</div>
          <ul className="space-y-0.5 text-mute">{judge.map((j) => <li key={j.id}><span className={cn(j.got === j.expected ? "text-ok" : "text-bad")}>{j.got === null ? "?" : j.got ? "speak" : "silent"}</span> (expected {j.expected ? "speak" : "silent"}) · {j.id}</li>)}</ul>
        </div>
      )}
      <p className="text-[11.5px] text-faint">The reference set is small and synthetic; it catches regressions, not fine calibration. Your own scored rounds compare the current settings with the settings that scored them before.</p>
    </div>
  );
}
