import type { BrainState, Kind, LoggedEvent, SessionConfig } from "./types.ts";
import { curveballById } from "./curveballs.ts";

export type Decision = "strong_no_hire" | "no_hire" | "leaning_no_hire" | "leaning_hire" | "hire" | "strong_hire";
export const DECISIONS: Decision[] = ["strong_no_hire", "no_hire", "leaning_no_hire", "leaning_hire", "hire", "strong_hire"];
export const DECISION_LABEL: Record<Decision, string> = {
  strong_no_hire: "Strong no hire", no_hire: "No hire", leaning_no_hire: "Leaning no hire", leaning_hire: "Leaning hire", hire: "Hire", strong_hire: "Strong hire",
};

export const DIMENSIONS: Record<Kind, { key: string; label: string; what: string }[]> = {
  coding: [
    { key: "algorithms", label: "Algorithms", what: "chose an efficient approach and knew its complexity" },
    { key: "coding", label: "Coding", what: "wrote correct, clean, idiomatic code without a compiler" },
    { key: "communication", label: "Communication", what: "explained thinking out loud, asked clarifying questions" },
    { key: "problemSolving", label: "Problem solving", what: "broke the problem down, tested, handled edge cases and follow-ups" },
  ],
  hld: [
    { key: "scoping", label: "Scoping", what: "clarified requirements, non-goals and scale with numbers" },
    { key: "design", label: "Design", what: "a coherent architecture that meets the requirements" },
    { key: "depth", label: "Depth", what: "went deep on the hardest parts with correct technical detail" },
    { key: "tradeoffs", label: "Trade-offs", what: "named alternatives and the cost of each choice; handled failure" },
    { key: "communication", label: "Communication", what: "drove the conversation and managed time" },
  ],
  lld: [
    { key: "modeling", label: "Modelling", what: "the right classes, responsibilities and relationships" },
    { key: "principles", label: "Design principles", what: "encapsulation, cohesion, extensibility, sensible patterns" },
    { key: "behaviour", label: "Behaviour", what: "key methods and flows correct, including concurrency and errors" },
    { key: "communication", label: "Communication", what: "clarified use cases and explained choices" },
  ],
  behavioral: [
    { key: "structure", label: "Structure", what: "a clear situation, action and result" },
    { key: "ownership", label: "Ownership", what: "their own contribution, decisions and accountability" },
    { key: "impact", label: "Impact", what: "concrete, measurable outcome" },
    { key: "reflection", label: "Reflection", what: "what they learned and would change" },
  ],
};

export interface Rating { dimension: string; score: number; evidence: { seq: number; quote: string }[]; note: string }
export interface Scorecard {
  decision: Decision;
  level: string; // the level this performance supports
  summary: string;
  ratings: Rating[];
  strengths: string[];
  improvements: string[];
  curveballs: string[]; // how each curveball went
  hintsNote: string;
  samples: number;
}

const clock = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

/** The transcript with sequence numbers and times, so the scorer can cite evidence. */
export function evidenceTranscript(log: LoggedEvent[]): string {
  const lines: string[] = [];
  let lastDigest = "";
  for (const { seq, t, e } of log) {
    if (e.type === "turn.candidate") lines.push(`#${seq} ${clock(t)} CANDIDATE: ${e.text}`);
    else if (e.type === "turn.interviewer") lines.push(`#${seq} ${clock(t)} INTERVIEWER${e.origin !== "reply" ? ` (${e.origin})` : ""}: ${e.text}`);
    else if (e.type === "digest" && e.diff !== lastDigest) { lines.push(`#${seq} ${clock(t)} [${e.surface}] ${e.diff.slice(0, 400)}`); lastDigest = e.diff; }
    else if (e.type === "hint.requested") lines.push(`#${seq} ${clock(t)} [hint requested]`);
    else if (e.type === "curveball.fired") lines.push(`#${seq} ${clock(t)} [curveball: ${curveballById.get(e.id)?.label ?? e.id}]`);
    else if (e.type === "phase.changed") lines.push(`#${seq} ${clock(t)} [phase: ${e.to}]`);
  }
  return lines.join("\n");
}

export function scorecardPrompt(cfg: SessionConfig, s: BrainState, log: LoggedEvent[]): { system: string; user: string } {
  const dims = DIMENSIONS[cfg.kind];
  const fired = s.curveballs.filter((c) => c.fired).map((c) => curveballById.get(c.id)?.scoreNote).filter(Boolean);
  const final = Object.entries(s.digests).map(([k, v]) => `FINAL ${k.toUpperCase()}:\n${v}`).join("\n\n");
  return {
    system: `You write Google hiring-committee interview feedback. Be evidence-based: every rating must cite transcript lines by their #number with a short exact quote. Judge only what happened; do not reward confidence or length. A correct approach that differs from the reference is fine. Rating scale per dimension: 1 poor, 2 borderline, 3 solid hire, 4 exceptional. Hold the ${cfg.level} bar. Hints cost signal in proportion to how much they gave away.`,
    user: `Interview: ${cfg.kind}, ${cfg.minutes} min, interviewer tone ${s.tone}.
Question: ${s.question.statement}
Reference notes (not the only valid answer): ${s.question.reference.slice(0, 2500)}
Hints given: ${s.hints}.
${fired.length ? `Curveballs used:\n- ${fired.join("\n- ")}\n` : ""}
TRANSCRIPT:
${evidenceTranscript(log)}

${final}

Return ONLY JSON:
{"decision":"strong_no_hire"|"no_hire"|"leaning_no_hire"|"leaning_hire"|"hire"|"strong_hire","level":"the level this performance supports, e.g. L4","summary":"3-4 sentences a committee reads first","ratings":[${dims.map((d) => `{"dimension":"${d.key}","score":1-4,"evidence":[{"seq":12,"quote":"..."}],"note":"why (${d.what})"}`).join(",")}],"strengths":["..."],"improvements":["specific and actionable"],"curveballs":["how each curveball went"],"hintsNote":"how hints affected the rating"}`,
  };
}

function parse(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const a = body.indexOf("{"), z = body.lastIndexOf("}");
  if (a < 0 || z < 0) throw new Error("The model did not return JSON. Try again or pick a stronger model for the scorecard.");
  return JSON.parse(body.slice(a, z + 1));
}

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : 0;
};

export function parseScorecard(kind: Kind, text: string): Scorecard {
  const j = parse(text) as Partial<Scorecard> & { ratings?: Partial<Rating>[] };
  const dims = DIMENSIONS[kind];
  const ratings: Rating[] = dims.map((d) => {
    const r = (j.ratings ?? []).find((x) => x?.dimension === d.key);
    return { dimension: d.key, score: Math.max(1, Math.min(4, Math.round(Number(r?.score) || 2))), evidence: (r?.evidence ?? []).filter((x) => x && Number.isFinite(Number(x.seq))).map((x) => ({ seq: Number(x.seq), quote: String(x.quote ?? "") })), note: String(r?.note ?? "") };
  });
  return {
    decision: DECISIONS.includes(j.decision as Decision) ? (j.decision as Decision) : "leaning_no_hire",
    level: String(j.level ?? ""),
    summary: String(j.summary ?? ""),
    ratings,
    strengths: (j.strengths ?? []).map(String),
    improvements: (j.improvements ?? []).map(String),
    curveballs: (j.curveballs ?? []).map(String),
    hintsNote: String(j.hintsNote ?? ""),
    samples: 1,
  };
}

/** Self-consistency: median score per dimension and median decision across samples; text from the sample closest to the median. */
export function aggregateScorecards(cards: Scorecard[]): Scorecard {
  if (cards.length === 1) return cards[0];
  const ratings = cards[0].ratings.map((r, i) => {
    const scores = cards.map((c) => c.ratings[i]?.score ?? r.score);
    const m = Math.round(median(scores));
    const best = cards.map((c) => c.ratings[i]).find((x) => x?.score === m) ?? r;
    return { ...best, score: m };
  });
  const dec = Math.round(median(cards.map((c) => DECISIONS.indexOf(c.decision))));
  const base = cards.find((c) => DECISIONS.indexOf(c.decision) === dec) ?? cards[0];
  return { ...base, decision: DECISIONS[dec], ratings, samples: cards.length };
}

/** 0-100, for Ascent's existing score fields and spaced review. */
export function scoreOf(c: Scorecard): number {
  const avg = c.ratings.reduce((a, r) => a + r.score, 0) / Math.max(1, c.ratings.length);
  return Math.round(((avg - 1) / 3) * 100);
}
