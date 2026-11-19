"use client";
// "Explain it like a person would": when an AI provider is set up, the reader asks it how to talk through a code
// block, a table or a formula. Answers are cached on this device, so each block costs one small call, once.

import { useStore } from "@/lib/store";
import { aiReady } from "@/lib/ai";
import { runTask } from "@/lib/interview/tasks";

export interface CodeExplain { intro: string; steps: { from: number; to: number; say: string }[]; outro?: string }
export interface TableExplain { intro: string; rows: { row: number; say: string }[]; outro?: string }
export interface MathExplain { say: string }

const CACHE = "ascent:reader:explain:v1";
const MAX = 250;

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36) + s.length.toString(36);
}
function load(): Record<string, { at: number; v: unknown }> {
  try { return JSON.parse(localStorage.getItem(CACHE) || "{}"); } catch { return {}; }
}
function save(k: string, v: unknown) {
  try {
    const all = load();
    all[k] = { at: Date.now(), v };
    const keys = Object.keys(all);
    if (keys.length > MAX) keys.sort((a, b) => all[a].at - all[b].at).slice(0, keys.length - MAX).forEach((x) => delete all[x]);
    localStorage.setItem(CACHE, JSON.stringify(all));
  } catch { /* storage full or private mode: explanations are just not cached */ }
}

export const explainAvailable = () => aiReady(useStore.getState().settings);

const SYSTEM = `You narrate a technical lesson aloud for a software engineer preparing for Google interviews, like a friendly senior engineer reading over their shoulder.
Write for the ear: plain spoken English, short sentences, no markdown, no bullet characters, no symbols read literally (say "times", "squared", "Q K transpose"), no code syntax unless you are naming an identifier.
Explain what matters and why, the way a good teacher would, not character by character. Be accurate; if something is a simplification, it is fine to say so briefly.
Return ONLY one JSON object, no prose around it.`;

const inflight = new Map<string, Promise<unknown>>();

async function ask<T>(kind: string, body: string, shape: string, context: string, valid: (v: T) => boolean): Promise<T | null> {
  const k = hash(kind + "\n" + body);
  const hit = load()[k];
  if (hit) return hit.v as T;
  if (inflight.has(k)) return inflight.get(k) as Promise<T | null>;
  const s = useStore.getState().settings;
  if (!aiReady(s)) return null;
  const job = (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const prompt = `${context ? `SECTION CONTEXT (what the learner has just read):\n${context.slice(0, 700)}\n\n` : ""}${kind.toUpperCase()} TO NARRATE:\n${body.slice(0, 6000)}\n\n${shape}`;
      const raw = await runTask(s, "reader.explain", SYSTEM, [{ role: "user", content: prompt }], { signal: ctrl.signal });
      clearTimeout(t);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return null;
      const v = JSON.parse(m[0]) as T;
      if (!valid(v)) return null;
      save(k, v);
      return v;
    } catch {
      return null;
    } finally {
      inflight.delete(k);
    }
  })();
  inflight.set(k, job);
  return job;
}

export function explainCode(code: string, lang: string, context: string): Promise<CodeExplain | null> {
  const numbered = code.replace(/\s+$/, "").split("\n").map((l, i) => `${String(i + 1).padStart(3)}| ${l}`).join("\n");
  const n = code.split("\n").length;
  return ask<CodeExplain>("code", `(${lang || "unknown language"}, line numbers on the left)\n${numbered}`,
    `Shape: {"intro":"one sentence: what this code is for","steps":[{"from":1,"to":3,"say":"what these lines do and why, 1 to 3 sentences"}],"outro":"optional one-sentence takeaway or common pitfall"}. Cover the code in order with 2 to 8 steps; line numbers must be between 1 and ${n}; skip boilerplate like imports unless they matter.`,
    context, (v) => typeof v?.intro === "string" && Array.isArray(v.steps) && v.steps.every((x) => typeof x.say === "string" && x.from >= 1 && x.to >= x.from && x.to <= n));
}

export function explainTable(headers: string[], rows: string[][], context: string): Promise<TableExplain | null> {
  const body = [headers.join(" | "), ...rows.map((r, i) => `${i + 1}. ${r.join(" | ")}`)].join("\n");
  return ask<TableExplain>("table", body,
    `Shape: {"intro":"one or two sentences: what the table compares and how to read it","rows":[{"row":1,"say":"the point of this row, 1 or 2 sentences"}],"outro":"the pattern or takeaway to notice"}. Use row numbers from 1 to ${rows.length}; talk about at most 8 rows, choosing the ones that teach something.`,
    context, (v) => typeof v?.intro === "string" && Array.isArray(v.rows) && v.rows.every((x) => typeof x.say === "string" && x.row >= 1 && x.row <= rows.length));
}

export function explainMath(tex: string, context: string): Promise<MathExplain | null> {
  return ask<MathExplain>("formula", tex,
    `Shape: {"say":"first read the formula aloud naturally, then explain in 2 or 3 sentences what each part means and the intuition"}.`,
    context, (v) => typeof v?.say === "string" && v.say.length > 10);
}
