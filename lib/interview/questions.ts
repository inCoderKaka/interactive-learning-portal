"use client";
// Question sources: the curriculum, the learner's imported problems, and AI-generated questions.

import { DESIGNS, PROBLEMS } from "@/content";
import type { Design, Problem, Progress, Settings } from "@/lib/types";
import { isDue, todayISO } from "@/lib/srs";
import type { InterviewQuestion, Kind, PoolFilter, Selection } from "./core/types";
import { rng } from "./core/rng";
import { runTask } from "./tasks";

const AREA: Record<Kind, Design["area"]> = { coding: "dsa", hld: "hld", lld: "lld", ml: "ai", mlcode: "ai", behavioral: "craft" };
/** The interview round a design question is asked in. ML coding questions (d-mlc-*) get the ML coding room. */
export const kindOfDesign = (d: Design): Kind => d.id.startsWith("d-mlc-") ? "mlcode" : d.area === "ai" ? "ml" : d.area === "hld" ? "hld" : d.area === "lld" ? "lld" : "behavioral";

function fromProblem(p: Problem): InterviewQuestion {
  return {
    id: p.id, kind: "coding", title: p.title, topic: p.topic,
    statement: p.statement,
    constraints: "",
    followUps: [...p.twists, ...p.followUps].slice(0, 6),
    redFlags: [],
    reference: [`Clarifying questions a strong candidate asks: ${p.clarify.join(" | ")}`, `Approaches: ${p.approaches.map((a) => `${a.name} (${a.time} time, ${a.space} space): ${a.idea}`).join(" | ")}`, p.hints.length ? `Hint ladder: ${p.hints.join(" → ")}` : ""].filter(Boolean).join("\n"),
    approaches: p.approaches.map((a) => ({ name: a.name, time: a.time, space: a.space })),
    source: p.custom ? "imported" : "curriculum",
  };
}

function fromDesign(d: Design): InterviewQuestion {
  const kind = kindOfDesign(d);
  const est = d.stages.find((s) => s.key === "est")?.model ?? "";
  return {
    id: d.id, kind, title: d.title, topic: d.topic,
    statement: d.prompt,
    constraints: est.replace(/\*\*/g, ""),
    followUps: d.steer.map(([q]) => q.replace(/^'|'$/g, "")),
    redFlags: d.pitfalls,
    reference: [d.stages.map((s) => `${s.title}: ${s.model}`).join("\n"), d.steer.map(([q, a]) => `${q} → ${a}`).join("\n"), d.level ? `Level bar: ${d.level}` : ""].filter(Boolean).join("\n").replace(/\*\*/g, ""),
    source: "curriculum",
  };
}

export function allQuestions(kind: Kind, custom: Problem[]): InterviewQuestion[] {
  if (kind === "coding") return [...PROBLEMS, ...custom.filter((p) => p.approaches.length)].filter((p) => p.diff !== "E").map(fromProblem);
  return DESIGNS.filter((d) => d.area === AREA[kind] && kindOfDesign(d) === kind).map(fromDesign);
}

export function questionById(id: string, custom: Problem[]): InterviewQuestion | undefined {
  const p = PROBLEMS.find((x) => x.id === id) ?? custom.find((x) => x.id === id);
  if (p) return fromProblem(p);
  const d = DESIGNS.find((x) => x.id === id);
  return d && fromDesign(d);
}

function statusOf(p: Progress | undefined): ("unseen" | "due" | "weak" | "done")[] {
  if (!p || p.status !== "done") return ["unseen"];
  const out: ("due" | "weak" | "done")[] = ["done"];
  if (isDue(p, todayISO())) out.push("due");
  if ((p.lapses ?? 0) > 0 || (p.score !== undefined && p.score < 60) || (p.rating !== undefined && p.rating <= 1)) out.push("weak");
  return out;
}

export function filterPool(qs: InterviewQuestion[], f: PoolFilter, progress: Record<string, Progress>): InterviewQuestion[] {
  return qs.filter((q) => {
    if (f.topics?.length && !f.topics.includes(q.topic ?? "")) return false;
    if (f.sources?.length && !f.sources.includes(q.source)) return false;
    if (f.status?.length && !statusOf(progress[q.id]).some((s) => f.status!.includes(s))) return false;
    if (f.tiers?.length) {
      const tier = PROBLEMS.find((p) => p.id === q.id)?.tier ?? DESIGNS.find((d) => d.id === q.id)?.tier;
      if (tier && !f.tiers.includes(tier)) return false;
    }
    return true;
  });
}

export function drawQuestion(kind: Kind, sel: Selection, custom: Problem[], progress: Record<string, Progress>, seed: number): InterviewQuestion | null {
  const all = allQuestions(kind, custom);
  if (sel.mode === "exact") return questionById(sel.questionId, custom) ?? null;
  let pool = sel.mode === "random-pool" ? filterPool(all, sel.pool, progress) : all;
  if (sel.mode === "random-all" && sel.preferUnseen) {
    const fresh = pool.filter((q) => progress[q.id]?.status !== "done");
    if (fresh.length) pool = fresh;
  }
  if (!pool.length) return null;
  return pool[Math.floor(rng(seed)() * pool.length)];
}

/** Out-of-curriculum curveball: a new question not in Ascent's content, validated before use. */
export async function generateQuestion(s: Settings, kind: Kind, level: string, avoid: string[]): Promise<InterviewQuestion> {
  const what = kind === "coding" ? "an algorithmic coding problem (medium or hard), framed as a real-world task, not a LeetCode copy" : kind === "hld" ? "a system design question about a product or system that is not among the usual textbook ones" : kind === "ml" ? "a machine learning or generative-AI system design question about a real product (not the usual feed, ads or RAG textbook ones)" : kind === "mlcode" ? "an ML coding question: implement a model, loss, metric or algorithm from scratch in NumPy or PyTorch, solvable in 30 minutes" : "an object-oriented design question for a small real system";
  const text = await runTask(s, "question.generate",
    "You write fresh Google interview questions. They must be solvable in 35 minutes, unambiguous to the interviewer, and deliberately underspecified to the candidate.",
    [{ role: "user", content: `Write ${what} for the ${level} bar. Avoid these, which the candidate has studied: ${avoid.slice(0, 60).join("; ")}.
Return ONLY JSON: {"title":"short","statement":"what the interviewer says, 1-3 sentences","constraints":"numbers to hold the design to, or empty for coding","followUps":["4 follow-ups, increasing difficulty"],"redFlags":["4 common mistakes"],"reference":"a solid reference answer in 150-300 words: key approach, complexity or architecture, trade-offs"}` }]);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const j = JSON.parse(body.slice(body.indexOf("{"), body.lastIndexOf("}") + 1)) as Partial<InterviewQuestion>;
  if (!j.title || !j.statement || !j.reference) throw new Error("The generated question was incomplete. Try again, or turn off the out-of-curriculum curveball.");
  return {
    id: `gen-${Date.now().toString(36)}`, kind, title: String(j.title), statement: String(j.statement), constraints: String(j.constraints ?? ""),
    followUps: (j.followUps ?? []).map(String).slice(0, 6), redFlags: (j.redFlags ?? []).map(String).slice(0, 6), reference: String(j.reference), source: "ai-generated",
  };
}

/** Vocabulary for speech-recognition boosting and transcript correction. */
export function keyterms(q: InterviewQuestion): string[] {
  const base = ["Redis", "Kafka", "Postgres", "Cassandra", "DynamoDB", "Spanner", "CDN", "load balancer", "sharding", "idempotency", "consistent hashing", "QPS", "p99", "LRU", "BFS", "DFS", "heap", "trie", "hash map", "O(n log n)", "memoization", "dynamic programming"];
  const words = `${q.statement} ${q.reference}`.match(/\b[A-Z][A-Za-z0-9]{2,}\b/g) ?? [];
  return [...new Set([...base, ...words])].slice(0, 80);
}
