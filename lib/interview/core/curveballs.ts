import type { BrainState, CurveballId, InterviewQuestion, Kind, ScheduledCurveball, SessionConfig } from "./types.ts";
import { rng, shuffle } from "./rng.ts";
import { arcBudget } from "./policy.ts";

export interface Curveball {
  id: CurveballId;
  label: string;
  kinds: Kind[];
  /** When in the problem it fits, as a fraction of the problem time. */
  window: [number, number];
  eligible(s: BrainState, q: InterviewQuestion): boolean;
  cue(q: InterviewQuestion): string;
  /** Tells the scorer what this probed. */
  scoreNote: string;
}

const hasWork = (s: BrainState) => s.turns >= 4 || Object.values(s.digests).some((d) => (d ?? "").length > 40);

export const CURVEBALLS: Curveball[] = [
  {
    id: "requirement-change", label: "Requirement change", kinds: ["coding", "hld", "lld"], window: [0.55, 0.8],
    eligible: hasWork,
    cue: (q) => q.kind === "coding"
      ? "Change one constraint of the problem now (for example: the input no longer fits in memory and arrives as a stream, or values can be negative, or it must run in O(1) extra space). State the change plainly and ask how their solution adapts."
      : "Change one requirement now, in a way that stresses their current design: traffic grows 100×, a new region with strict data residency, or a new feature that needs strong consistency. Pick the one that hurts their design most. Ask how it changes.",
    scoreNote: "Requirement change: did the candidate adapt the design rather than restart, and identify what breaks?",
  },
  {
    id: "bad-idea", label: "Bad-idea bait", kinds: ["coding", "hld", "lld"], window: [0.35, 0.65],
    eligible: hasWork,
    cue: (q) => q.kind === "coding"
      ? "Casually suggest a plausible but worse approach (for example brute force with a sort inside a loop, or a recursion that is exponential) as if you like it: 'Couldn't we just…?'. See whether they push back with reasons."
      : "Casually suggest a plausible but flawed design choice as if you favour it (for example a single relational database for everything at this scale, synchronous calls for fan-out, or storing blobs in the database). See whether they push back politely with reasons.",
    scoreNote: "Bad-idea bait: did the candidate push back with reasons instead of agreeing?",
  },
  {
    id: "interviewer-slip", label: "Interviewer slip", kinds: ["coding", "hld"], window: [0.4, 0.7],
    eligible: hasWork,
    cue: (q) => q.kind === "coding"
      ? "Make one confident but wrong technical claim related to their solution (for example 'hash map lookup is O(log n), right?' or a wrong complexity for their loop) and wait. Do not correct yourself unless they do."
      : "Make one confident but wrong technical claim related to their design (for example that a cache makes writes durable, or that consistent hashing removes hot keys) and wait. Do not correct yourself unless they do.",
    scoreNote: "Interviewer slip: did the candidate notice and correct a wrong claim from the interviewer?",
  },
  {
    id: "explain-pm", label: "Explain it to a PM", kinds: ["hld", "lld", "coding"], window: [0.75, 0.92],
    eligible: hasWork,
    cue: () => "Ask them to explain their solution in under two minutes, as they would to a product manager with no engineering background.",
    scoreNote: "Explain to a PM: was the explanation clear, short and free of jargon?",
  },
  {
    id: "time-crunch", label: "Time crunch", kinds: ["hld", "lld", "coding"], window: [0.82, 0.95],
    eligible: hasWork,
    cue: () => "Tell them you are short on time and ask what they would cut or simplify to ship a first version, and what risk that leaves.",
    scoreNote: "Time crunch: did the candidate prioritise sensibly and name the risk they accept?",
  },
  {
    id: "ceiling-probe", label: "Ceiling probe", kinds: ["hld", "coding", "lld"], window: [0.7, 0.9],
    eligible: hasWork,
    cue: () => "Ask one follow-up that is a level above the stated bar (an L6-style question about global scale, failure domains or a hard algorithmic optimisation). Keep going deeper while they keep up.",
    scoreNote: "Ceiling probe: how far above the bar did the candidate get? Report separately; do not penalise.",
  },
  {
    id: "incident", label: "Production incident", kinds: ["hld"], window: [0.75, 0.9],
    eligible: hasWork,
    cue: () => "Say their system is live and p99 latency just tripled during peak traffic. Ask how they would investigate and mitigate, step by step.",
    scoreNote: "Incident: did the candidate mitigate first, use metrics, and find the likely bottleneck in their own design?",
  },
  // Out-of-curriculum replaces the question before the round starts (see questions.ts); it never fires mid-round.
  {
    id: "out-of-curriculum", label: "Out-of-curriculum question", kinds: ["hld", "lld", "coding"], window: [0, 0],
    eligible: () => false, cue: () => "", scoreNote: "Out-of-curriculum question: the candidate had not studied this design.",
  },
];

export const curveballById = new Map(CURVEBALLS.map((c) => [c.id, c]));

const COUNT = { none: 0, occasional: 1, frequent: 2 } as const;

/** Pick curveballs for a session and place each inside its window, in minutes since session start. */
export function scheduleCurveballs(cfg: SessionConfig): ScheduledCurveball[] {
  if (!cfg.arc.curveball || cfg.kind === "behavioral") return [];
  const r = rng(cfg.seed ^ 0xc0ffee);
  const freq = cfg.curveballs.frequency === "random" ? (["none", "occasional", "frequent"] as const)[Math.floor(r() * 3)] : cfg.curveballs.frequency;
  const n = COUNT[freq];
  if (!n) return [];
  const b = arcBudget(cfg);
  const problemStart = b.intro + b.aboutYou;
  const pool = shuffle(r, CURVEBALLS.filter((c) => c.kinds.includes(cfg.kind) && c.window[1] > 0 && !cfg.curveballs.disabled.includes(c.id)));
  // ceiling probe only makes sense when the candidate asked for it or is aiming high
  const picks = pool.filter((c) => c.id !== "ceiling-probe" || cfg.level === "L5" || cfg.level === "L6").slice(0, n);
  return picks
    .map((c) => ({ id: c.id, atMin: Math.round((problemStart + (c.window[0] + r() * (c.window[1] - c.window[0])) * b.problem) * 10) / 10, fired: false }))
    .sort((a, b2) => a.atMin - b2.atMin);
}
