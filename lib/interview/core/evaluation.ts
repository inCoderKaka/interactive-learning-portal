// Evaluation runner (MI-DEV-7, AI configuration §6): replay stored transcripts through the scorecard
// task with the current settings and compare with a reference. Pure: metrics only.

import type { InterviewQuestion, LoggedEvent, SessionConfig } from "./types.ts";
import { DECISIONS, type Decision, type Scorecard } from "./scoring.ts";

export interface EvalLabel { decision: Decision; scores: Record<string, number> }

export interface EvalCase {
  id: string;
  title: string;
  source: "built-in" | "my-round";
  cfg: SessionConfig;
  question: InterviewQuestion;
  log: LoggedEvent[];
  hints: number;
  label: EvalLabel;
}

export interface CaseResult {
  id: string;
  title: string;
  expected: EvalLabel;
  got?: Scorecard;
  error?: string;
  ms: number;
  costUsd: number;
}

export interface CaseScore { decisionDelta: number; exact: boolean; withinOne: boolean; mae: number; dims: { dim: string; expected: number; got: number }[] }

export function scoreCase(label: EvalLabel, card: Scorecard): CaseScore {
  const delta = DECISIONS.indexOf(card.decision) - DECISIONS.indexOf(label.decision);
  const dims = Object.entries(label.scores).map(([dim, expected]) => ({ dim, expected, got: card.ratings.find((r) => r.dimension === dim)?.score ?? 0 }));
  const mae = dims.length ? dims.reduce((a, d) => a + Math.abs(d.expected - d.got), 0) / dims.length : 0;
  return { decisionDelta: delta, exact: delta === 0, withinOne: Math.abs(delta) <= 1, mae, dims };
}

export interface EvalSummary { n: number; failed: number; exact: number; withinOne: number; mae: number; bias: number; avgMs: number; costUsd: number }

/** Decision accuracy (exact and within one step), mean absolute rubric error, bias (+ = too generous), cost, latency. */
export function summarise(results: CaseResult[]): EvalSummary {
  const ok = results.filter((r) => r.got);
  const scores = ok.map((r) => scoreCase(r.expected, r.got!));
  const n = ok.length;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    n: results.length, failed: results.length - n,
    exact: n ? scores.filter((s) => s.exact).length / n : 0,
    withinOne: n ? scores.filter((s) => s.withinOne).length / n : 0,
    mae: avg(scores.map((s) => s.mae)),
    bias: avg(scores.map((s) => s.decisionDelta)),
    avgMs: avg(results.map((r) => r.ms)),
    costUsd: results.reduce((a, r) => a + r.costUsd, 0),
  };
}

// ---- interruption judgement (whether the interviewer should speak) ----

export interface InterventionCase { id: string; question: InterviewQuestion; board: string; trigger: string; speak: boolean }
export interface InterventionResult { id: string; expected: boolean; got: boolean | null }

export function interventionMetrics(rs: InterventionResult[]) {
  const ok = rs.filter((r) => r.got !== null);
  const tp = ok.filter((r) => r.expected && r.got).length, fp = ok.filter((r) => !r.expected && r.got).length, fn = ok.filter((r) => r.expected && !r.got).length;
  return { n: rs.length, failed: rs.length - ok.length, precision: tp + fp ? tp / (tp + fp) : 1, recall: tp + fn ? tp / (tp + fn) : 1, accuracy: ok.length ? ok.filter((r) => r.expected === r.got).length / ok.length : 0 };
}
