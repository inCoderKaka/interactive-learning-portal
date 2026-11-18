"use client";
// Scoring a finished session and keeping a local history of rounds (guest-mode friendly).

import type { Feedback, Settings } from "@/lib/types";
import { deliveryStats, type DeliveryStats } from "./core/analytics";
import { DECISIONS, aggregateScorecards, parseScorecard, scoreOf, scorecardPrompt, type Decision, type Scorecard } from "./core/scoring";
import type { BrainState, InterviewQuestion, LoggedEvent, SessionConfig } from "./core/types";
import { profileFor, runTask } from "./tasks";

export async function scoreSession(settings: Settings, cfg: SessionConfig, s: BrainState, log: LoggedEvent[]): Promise<Scorecard> {
  const p = scorecardPrompt(cfg, s, log);
  const n = Math.max(1, Math.min(5, profileFor(settings, "scorecard").samples ?? 1));
  const runs = await Promise.allSettled(Array.from({ length: n }, () => runTask(settings, "scorecard", p.system, [{ role: "user", content: p.user }]).then((t) => parseScorecard(cfg.kind, t))));
  const ok = runs.filter((r): r is PromiseFulfilledResult<Scorecard> => r.status === "fulfilled").map((r) => r.value);
  if (!ok.length) throw (runs[0] as PromiseRejectedResult).reason;
  return aggregateScorecards(ok);
}

/** Map onto Ascent's existing feedback shape so attempts, progress and history keep working. */
export function toFeedback(c: Scorecard): Feedback {
  const score = scoreOf(c);
  const d = DECISIONS.indexOf(c.decision);
  return {
    verdict: d >= 4 ? "correct" : d >= 3 ? "partial" : "incorrect",
    score,
    summary: c.summary,
    bugs: [],
    edgeCases: [],
    strengths: c.strengths,
    improvements: c.improvements,
    rubric: Object.fromEntries(c.ratings.map((r) => [r.dimension, r.score])),
  };
}

export interface SessionRecord {
  id: string;
  at: number;
  cfg: SessionConfig;
  question: InterviewQuestion;
  tone: BrainState["tone"];
  persona: BrainState["persona"];
  picked: boolean;
  log: LoggedEvent[];
  finalDigests: BrainState["digests"];
  stats: DeliveryStats;
  hints: number;
  scorecard?: Scorecard;
  predicted?: Decision;
}

const KEY = "ascent:interviews:v1";
const MAX = 25;

export function loadHistory(): SessionRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as SessionRecord[];
  } catch {
    return [];
  }
}

export function saveRecord(r: SessionRecord) {
  const all = [r, ...loadHistory().filter((x) => x.id !== r.id)].slice(0, MAX);
  for (let keep = all.length; keep >= 1; keep--) {
    try {
      // drop full logs from older rounds first if storage is tight
      const trimmed = all.map((x, i) => (i < keep ? x : { ...x, log: [] }));
      localStorage.setItem(KEY, JSON.stringify(trimmed));
      return;
    } catch { /* quota: retry with fewer logs */ }
  }
}

export function makeRecord(cfg: SessionConfig, s: BrainState, log: LoggedEvent[]): SessionRecord {
  return {
    id: crypto.randomUUID(), at: Date.now(), cfg, question: s.question, tone: s.tone, persona: s.persona,
    picked: cfg.selection.mode === "exact", log, finalDigests: s.digests, stats: deliveryStats(log), hints: s.hints,
  };
}

export function transcriptText(log: LoggedEvent[]): string {
  return log.flatMap(({ e }) => (e.type === "turn.candidate" ? [`ME: ${e.text}`] : e.type === "turn.interviewer" ? [`INTERVIEWER: ${e.text}`] : [])).join("\n\n");
}

/** Calibration: how far the learner's own prediction was from the scorecard, in decision steps. */
export function calibrationGap(predicted: Decision | undefined, actual: Decision | undefined): number | null {
  if (!predicted || !actual) return null;
  return DECISIONS.indexOf(predicted) - DECISIONS.indexOf(actual);
}
