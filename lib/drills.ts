import type { Drill, DrillKind } from "./types";

/* ---------- authoring helpers (content/drills/*.ts) ---------- */
const star = (xs: string[]) => ({ i: xs.findIndex((x) => x.startsWith("*")), xs: xs.map((x) => x.replace(/^\*/, "")) });
/** True or false. */
export const tf = (s: string, t: boolean, why: string): Drill => ({ kind: "tf", s, t, why });
/** Quick pick: mark the right option with a leading "*". */
export const pick = (q: string, options: string[], why: string): Drill => { const { i, xs } = star(options); return { kind: "pick", q, options: xs, answer: i, why }; };
/** Steps in the correct order; the player sees them shuffled. */
export const order = (q: string, steps: string[], why?: string): Drill => ({ kind: "order", q, steps, why });
/** 3–5 pairs; the right column is shuffled. */
export const match = (q: string, pairs: [string, string][], why?: string): Drill => ({ kind: "match", q, pairs, why });
/** Odd one out: mark the odd item with a leading "*". */
export const odd = (q: string, items: string[], why: string): Drill => { const { i, xs } = star(items); return { kind: "odd", q, items: xs, odd: i, why }; };
/** Sentence with one ___ gap; mark the right filler with "*". */
export const blank = (text: string, options: string[], why: string): Drill => { const { i, xs } = star(options); return { kind: "blank", text, options: xs, answer: i, why }; };
/** Spot the bug: code as a template string, `line` is 1-based. */
export const bug = (q: string, code: string, line: number, why: string): Drill => ({ kind: "bug", q, code: code.replace(/^\n/, "").replace(/\n\s*$/, "").split("\n"), line: line - 1, why });
/** Estimate on a slider. `tol` is a fraction (0.25 = within 25%) when `log`, otherwise an absolute distance. */
export const guess = (q: string, o: { min: number; max: number; answer: number; tol: number; unit?: string; log?: boolean }, why: string): Drill => ({ kind: "guess", q, ...o, why });

/* ---------- validation (scripts/audit-content.ts) ---------- */
export function checkDrill(d: Drill): string[] {
  const e: string[] = [];
  const uniq = (xs: string[]) => new Set(xs.map((x) => x.trim().toLowerCase())).size === xs.length;
  switch (d.kind) {
    case "tf": if (!d.s || !d.why) e.push("missing statement or why"); break;
    case "pick":
    case "blank":
      if (d.answer < 0 || d.answer >= d.options.length) e.push("no option marked with *");
      if (d.options.length < 2 || d.options.length > 5) e.push("want 2–5 options");
      if (!uniq(d.options)) e.push("duplicate options");
      if (d.kind === "blank" && (d.text.match(/___/g) ?? []).length !== 1) e.push("text needs exactly one ___");
      break;
    case "order": if (d.steps.length < 3 || d.steps.length > 6) e.push("want 3–6 steps"); if (!uniq(d.steps)) e.push("duplicate steps"); break;
    case "match":
      if (d.pairs.length < 3 || d.pairs.length > 5) e.push("want 3–5 pairs");
      if (!uniq(d.pairs.map((p) => p[0])) || !uniq(d.pairs.map((p) => p[1]))) e.push("duplicate pair sides");
      break;
    case "odd": if (d.odd < 0 || d.odd >= d.items.length) e.push("no item marked with *"); if (d.items.length < 3 || d.items.length > 5) e.push("want 3–5 items"); if (!uniq(d.items)) e.push("duplicate items"); break;
    case "bug": if (d.line < 0 || d.line >= d.code.length) e.push(`line ${d.line + 1} outside the ${d.code.length}-line snippet`); if (d.code.length < 3) e.push("snippet too short"); break;
    case "guess":
      if (!(d.min < d.answer && d.answer < d.max)) e.push("answer must sit strictly inside [min, max]");
      if (d.log && d.min <= 0) e.push("log scale needs min > 0");
      if (d.tol <= 0) e.push("tolerance must be positive");
      break;
  }
  return e;
}

/* ---------- play-time helpers ---------- */
export const KIND_LABEL: Record<DrillKind, string> = { tf: "True or false", pick: "Quick pick", order: "Put in order", match: "Match up", odd: "Odd one out", blank: "Fill the gap", bug: "Spot the bug", guess: "Estimate" };

/** Small deterministic PRNG (mulberry32) so the daily round is the same for everyone on a given day. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
export function shuffle<T>(xs: T[], r: () => number = Math.random): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** A permutation of 0..n-1 that is never the identity (so "order" and "match" never start solved). */
export function derange(n: number, r: () => number = Math.random): number[] {
  const id = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return id;
  for (let k = 0; k < 20; k++) { const p = shuffle(id, r); if (p.some((x, i) => x !== i)) return p; }
  return [...id.slice(1), 0];
}

/** Did the slider guess land within tolerance? */
export function guessOk(d: Extract<Drill, { kind: "guess" }>, v: number) {
  return d.log ? Math.abs(Math.log10(v) - Math.log10(d.answer)) <= Math.log10(1 + d.tol) : Math.abs(v - d.answer) <= d.tol;
}

/** XP for a correct drill, growing with the combo and capped so grinding stays fair. */
export const drillXp = (combo: number) => 2 + Math.min(4, Math.floor(combo / 3));

export const fmtNum = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e12) return `${+(v / 1e12).toPrecision(3)} T`;
  if (a >= 1e9) return `${+(v / 1e9).toPrecision(3)} B`;
  if (a >= 1e6) return `${+(v / 1e6).toPrecision(3)} M`;
  if (a >= 1e4) return `${+(v / 1e3).toPrecision(3)} K`;
  return a >= 100 ? String(Math.round(v)) : String(+v.toPrecision(3));
};
