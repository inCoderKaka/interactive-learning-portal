import type { BrainState, EngineId, Kind, Phase, Pressure, SessionConfig } from "./types.ts";

/** How assertive the interviewer is allowed to be, by pressure setting (docs: detailed design §4.2). */
export const PRESSURE: Record<Pressure, { minGapS: number; capPerPhase: number; silenceS: number; timeCalls: number[] }> = {
  relaxed: { minGapS: 90, capPerPhase: 1, silenceS: 75, timeCalls: [5] },
  realistic: { minGapS: 45, capPerPhase: 2, silenceS: 45, timeCalls: [10, 5] },
  high: { minGapS: 25, capPerPhase: 3, silenceS: 25, timeCalls: [15, 10, 5] },
};

/** End-of-speech silence window for voice turn-taking, ms. */
export const END_OF_SPEECH_MS: Record<Pressure, number> = { relaxed: 1000, realistic: 700, high: 500 };

export const THINKING_PAUSE_MS = 90_000;

/** Minutes for each part of the arc. The problem gets whatever remains. */
export function arcBudget(cfg: SessionConfig): { intro: number; aboutYou: number; questions: number; problem: number } {
  const intro = cfg.arc.intro ? 1 : 0;
  const aboutYou = cfg.arc.aboutYou ? (cfg.minutes >= 40 ? 4 : 2) : 0;
  const questions = cfg.arc.questionsForMe ? (cfg.minutes >= 40 ? 5 : 3) : 0;
  return { intro, aboutYou, questions, problem: Math.max(5, cfg.minutes - intro - aboutYou - questions) };
}

/** Stages of the main problem, with a share of its time, used for pacing and time calls. */
export const STAGES: Record<Kind, { key: string; title: string; share: number }[]> = {
  coding: [
    { key: "clarify", title: "clarifying the problem", share: 0.12 },
    { key: "approach", title: "discussing approaches", share: 0.2 },
    { key: "code", title: "writing code", share: 0.4 },
    { key: "test", title: "testing and complexity", share: 0.13 },
    { key: "followup", title: "a follow-up", share: 0.15 },
  ],
  hld: [
    { key: "requirements", title: "requirements", share: 0.14 },
    { key: "estimates", title: "capacity estimates", share: 0.1 },
    { key: "api", title: "API and data model", share: 0.12 },
    { key: "high-level", title: "high-level design", share: 0.24 },
    { key: "deep-dive", title: "deep dives", share: 0.26 },
    { key: "scaling", title: "bottlenecks and scaling", share: 0.14 },
  ],
  lld: [
    { key: "requirements", title: "use cases and requirements", share: 0.12 },
    { key: "entities", title: "core classes and relationships", share: 0.25 },
    { key: "behaviour", title: "core code for the key flows (in the Code tab)", share: 0.38 },
    { key: "extension", title: "extensions, edge cases and thread safety", share: 0.25 },
  ],
  ml: [
    { key: "framing", title: "problem framing, the ML objective and metrics", share: 0.14 },
    { key: "data", title: "data, labels and features", share: 0.16 },
    { key: "model", title: "model choice and training", share: 0.22 },
    { key: "evaluation", title: "offline and online evaluation", share: 0.14 },
    { key: "serving", title: "serving, monitoring and iteration", share: 0.16 },
    { key: "deep-dive", title: "deep dives", share: 0.18 },
  ],
  mlcode: [
    { key: "clarify", title: "clarifying inputs, shapes and the maths", share: 0.1 },
    { key: "approach", title: "the approach and its equations", share: 0.17 },
    { key: "code", title: "writing Python (NumPy or PyTorch) in the Code tab", share: 0.43 },
    { key: "test", title: "testing, numerical stability and complexity", share: 0.15 },
    { key: "followup", title: "a follow-up", share: 0.15 },
  ],
  behavioral: [
    { key: "story", title: "the main story", share: 0.5 },
    { key: "probe", title: "follow-up probes", share: 0.5 },
  ],
};

/** Which stage the clock says the candidate should be in, given minutes spent on the problem. */
export function expectedStage(kind: Kind, problemMin: number, problemBudget: number) {
  let acc = 0;
  for (const st of STAGES[kind]) {
    acc += st.share * problemBudget;
    if (problemMin < acc) return st;
  }
  return STAGES[kind][STAGES[kind].length - 1];
}

const SPEAKABLE: Phase[] = ["about_you", "problem", "curveball"];

/** Hard gates before any unprompted interviewer speech. */
export function canIntervene(cfg: SessionConfig, s: BrainState, nowMs: number): { ok: boolean; reason: string } {
  const p = PRESSURE[cfg.pressure];
  if (!SPEAKABLE.includes(s.phase)) return { ok: false, reason: "phase" };
  if (s.candidateSpeaking) return { ok: false, reason: "candidate speaking" };
  if (nowMs < s.thinkingUntil) return { ok: false, reason: "thinking pause" };
  if (s.lastInterventionAt >= 0 && nowMs - s.lastInterventionAt < p.minGapS * 1000) return { ok: false, reason: "min gap" };
  if (s.interventionsThisPhase >= p.capPerPhase * (s.phase === "problem" ? 3 : 1)) return { ok: false, reason: "phase cap" };
  return { ok: true, reason: "" };
}

/** Silence threshold in ms. Text rounds are slower: typing counts as silence there. */
export function silenceMs(cfg: SessionConfig, engine: EngineId): number {
  return PRESSURE[cfg.pressure].silenceS * 1000 * (engine === "text" ? 3 : 1);
}
