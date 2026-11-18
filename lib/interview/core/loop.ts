// Loop day (MI-X-3): 4–5 rounds back to back with independent interviewers (persona, tone and voice
// differ per round), short breaks, and a final committee decision. Pure.

import type { Kind, Level, SessionConfig, Tone } from "./types.ts";
import { DECISIONS, DECISION_LABEL, type Decision, type Scorecard } from "./scoring.ts";
import { fragment, type Overrides } from "./templates.ts";
import { rng, pick } from "./rng.ts";

export interface LoopRound { kind: Kind; minutes: number; title: string }
export interface LoopPlan { id: string; level: Level; rounds: LoopRound[]; breakMin: number }

const R = (kind: Kind, minutes: number, title: string): LoopRound => ({ kind, minutes, title });

/** A Google-style onsite for the level: more design at senior levels, always one Googleyness round. */
export function defaultLoop(level: Level, id: string): LoopPlan {
  const rounds: LoopRound[] =
    level === "L3" ? [R("coding", 45, "Coding 1"), R("coding", 45, "Coding 2"), R("coding", 45, "Coding 3"), R("behavioral", 30, "Googleyness")]
    : level === "L4" ? [R("coding", 45, "Coding 1"), R("coding", 45, "Coding 2"), R("lld", 40, "Object-oriented design"), R("behavioral", 30, "Googleyness")]
    : level === "L5" ? [R("coding", 45, "Coding 1"), R("coding", 45, "Coding 2"), R("hld", 45, "System design"), R("behavioral", 30, "Googleyness and leadership")]
    : [R("coding", 45, "Coding"), R("hld", 45, "System design 1"), R("hld", 45, "System design 2"), R("lld", 40, "Object-oriented design"), R("behavioral", 30, "Leadership")];
  return { id, level, rounds, breakMin: 5 };
}

export const VOICES: Record<"gemini" | "openai", string[]> = {
  gemini: ["Charon", "Kore", "Puck", "Aoede", "Fenrir", "Leda", "Orus", "Zephyr"],
  openai: ["cedar", "marin", "alloy", "ash", "coral", "sage", "verse", "ballad"],
};

const TONES: Tone[] = ["neutral", "neutral", "tough", "guide", "notetaker"];

/** The configuration of round `index`: its own seed, so persona and tone differ, and a different voice. */
export function roundConfig(base: SessionConfig, plan: LoopPlan, index: number, loopSeed: number, voiceProvider?: "gemini" | "openai"): SessionConfig {
  const r = plan.rounds[index];
  const seed = (loopSeed * 31 + index * 7919) >>> 0;
  const tone = base.tone === "surprise" || base.tone === undefined ? pick(rng(seed), TONES) : base.tone;
  const voices = voiceProvider ? VOICES[voiceProvider] : [];
  return {
    ...base, kind: r.kind, minutes: r.minutes, seed, tone, level: plan.level,
    selection: { mode: "random-all", preferUnseen: true },
    arc: { intro: true, aboutYou: index === 0 && r.kind !== "behavioral", curveball: r.kind !== "behavioral", questionsForMe: true },
    voice: { ...base.voice, voiceId: voices.length ? voices[(loopSeed + index) % voices.length] : base.voice.voiceId },
    loop: { id: plan.id, index, total: plan.rounds.length }, mode: "real", redo: undefined,
  };
}

export interface RoundOutcome { title: string; kind: Kind; card?: Scorecard }

/**
 * Deterministic committee rule, close to how hiring committees weigh a packet: the median round sets the
 * starting point, any well-evidenced strong no hire caps the result at no hire, and two or more rounds
 * below leaning hire cap it at leaning no hire.
 */
export function committeeDecision(outcomes: RoundOutcome[]): Decision | null {
  const scored = outcomes.filter((o) => o.card).map((o) => DECISIONS.indexOf(o.card!.decision));
  if (!scored.length) return null;
  const sorted = [...scored].sort((a, b) => a - b);
  let d = sorted[Math.floor((sorted.length - 1) / 2)]; // lower median: committees are conservative
  if (scored.some((x) => x === 0)) d = Math.min(d, 1);
  if (scored.filter((x) => x <= 2).length >= 2) d = Math.min(d, 2);
  return DECISIONS[d];
}

export function committeePrompt(plan: LoopPlan, outcomes: RoundOutcome[], overrides?: Overrides): { system: string; user: string } {
  return {
    system: fragment("committee.system", overrides, { level: plan.level }),
    user: `${outcomes.map((o, i) => o.card ? `ROUND ${i + 1}: ${o.title} (${o.kind})\nDecision: ${DECISION_LABEL[o.card.decision]}; supports ${o.card.level || "?"}\nSummary: ${o.card.summary}\nRatings: ${o.card.ratings.map((r) => `${r.dimension} ${r.score}/4`).join(", ")}\nStrengths: ${o.card.strengths.join("; ")}\nConcerns: ${o.card.improvements.join("; ")}` : `ROUND ${i + 1}: ${o.title} (${o.kind}): no scorecard`).join("\n\n")}\n\nReturn ONLY JSON: {"decision":"strong_no_hire"|"no_hire"|"leaning_no_hire"|"leaning_hire"|"hire"|"strong_hire","level":"the level the loop supports","summary":"3-4 sentences","concerns":["..."],"next":["what to practise before the real loop"]}`,
  };
}

export interface Committee { decision: Decision; level: string; summary: string; concerns: string[]; next: string[]; rule: Decision | null }

export function parseCommittee(text: string, rule: Decision | null): Committee {
  const a = text.indexOf("{"), z = text.lastIndexOf("}");
  const j = (a >= 0 && z > a ? JSON.parse(text.slice(a, z + 1)) : {}) as Partial<Committee>;
  const decision = DECISIONS.includes(j.decision as Decision) ? (j.decision as Decision) : rule ?? "leaning_no_hire";
  return { decision, level: String(j.level ?? ""), summary: String(j.summary ?? ""), concerns: (j.concerns ?? []).map(String), next: (j.next ?? []).map(String), rule };
}
