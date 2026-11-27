/**
 * Mock-interview checkpoints (req3, 2026-11-27). A full design question unlocks right after the course page that
 * completes its prerequisites. Each such page is a checkpoint: the learner picks any unlocked, unsolved question and
 * does one mock interview; finishing one (with at least one interview path covered end to end) clears the checkpoint.
 * Every question has a tree of paths the interviewer can steer into; coverage accumulates across attempts.
 * Pure functions over content and progress, so they can run anywhere.
 */
import { DESIGNS, TOPICS, subsOf } from "@/content";
import type { Area, Design, PathNode, Progress } from "./types";

/** Interview checkpoints are built for these areas (only questions with prerequisites take part). */
export const CHECKPOINT_AREAS: Area[] = ["hld", "lld"];

/** Every learnable page in course order: chapters without subtopics count as one page. */
export const COURSE: string[] = TOPICS.flatMap((t) => { const subs = subsOf(t.id); return subs.length ? subs.map((s) => s.id) : [t.id]; });
const POS = new Map(COURSE.map((p, i) => [p, i]));
export const coursePos = (page: string) => POS.get(page) ?? -1;

/** Design questions that take part in checkpoints. */
export const INTERVIEWS: Design[] = DESIGNS.filter((d) => CHECKPOINT_AREAS.includes(d.area) && d.prereqs?.length);
export const interviewById = new Map(INTERVIEWS.map((d) => [d.id, d]));

/** The page after which a question unlocks: its prerequisite latest in the course. */
export function unlockPage(d: Design): string {
  return [...(d.prereqs ?? [])].sort((a, b) => coursePos(a) - coursePos(b)).at(-1)!;
}

export interface Checkpoint { id: string; page: string; area: Area; opens: string[] }
/** One checkpoint per page that unlocks at least one question, in course order. */
export const CHECKPOINTS: Checkpoint[] = (() => {
  const by = new Map<string, string[]>();
  for (const d of INTERVIEWS) { const p = unlockPage(d); by.set(p, [...(by.get(p) ?? []), d.id]); }
  return [...by].sort((a, b) => coursePos(a[0]) - coursePos(b[0]))
    .map(([page, opens]) => ({ id: `ck-${page}`, page, area: interviewById.get(opens[0])!.area, opens }));
})();
export const checkpointByPage = new Map(CHECKPOINTS.map((c) => [c.page, c]));
export const checkpointById = new Map(CHECKPOINTS.map((c) => [c.id, c]));

const pageDone = (progress: Record<string, Progress>, page: string) => progress[`t-${page}`]?.status === "done";

/** Prerequisite pages the learner hasn't marked done yet. */
export const missing = (d: Design, progress: Record<string, Progress>) => (d.prereqs ?? []).filter((p) => !pageDone(progress, p));
export const isUnlocked = (d: Design, progress: Record<string, Progress>) => missing(d, progress).length === 0;
export const isSolved = (d: Design, progress: Record<string, Progress>) => progress[d.id]?.status === "done";

/** Questions available at a checkpoint: everything unlocked up to and including its page. */
export function questionsAt(ck: Checkpoint): Design[] {
  const at = coursePos(ck.page);
  return INTERVIEWS.filter((d) => coursePos(unlockPage(d)) <= at);
}

// ───────── paths ─────────

/** Every root-to-leaf chain: one complete way the interview can go. */
export function chains(nodes: PathNode[] = [], prefix: PathNode[] = []): PathNode[][] {
  return nodes.flatMap((n) => (n.children?.length ? chains(n.children, [...prefix, n]) : [[...prefix, n]]));
}
export function allNodes(nodes: PathNode[] = []): PathNode[] {
  return nodes.flatMap((n) => [n, ...allNodes(n.children)]);
}

export interface Coverage { covered: Set<string>; nodes: number; done: number; chains: number; complete: number }
export function coverage(d: Design, progress: Record<string, Progress>): Coverage {
  const covered = new Set(progress[d.id]?.paths ?? []);
  const cs = chains(d.paths);
  return { covered, nodes: allNodes(d.paths).length, done: allNodes(d.paths).filter((n) => covered.has(n.id)).length, chains: cs.length, complete: cs.filter((c) => c.every((n) => covered.has(n.id))).length };
}

/** The chain to steer the next round into: the one with the most unexplored nodes (ties: tree order). */
export function nextChain(d: Design, covered: Set<string>): PathNode[] | null {
  const cs = chains(d.paths);
  if (!cs.length) return null;
  return cs.map((c, i) => ({ c, i, left: c.filter((n) => !covered.has(n.id)).length })).sort((a, b) => b.left - a.left || a.i - b.i)[0].c;
}

/** The interviewer's instruction for one round: which direction to take after the high-level design. */
export function steerText(d: Design, covered: Set<string>): string | undefined {
  const c = nextChain(d, covered);
  if (!c) return undefined;
  const lines = c.map((n, i) => `${"  ".repeat(i)}- ${n.label} (a strong answer covers: ${n.expect})`);
  return `After requirements, estimates and the high-level design, take the interview down this direction, step by step, as naturally as a real interviewer would. Don't announce it; ask each follow-up only after the candidate has answered the previous one.\n${lines.join("\n")}\nOnly if this is fully explored and time remains, probe another direction of your choice.`;
}

/** A compact numbered list of every node, for tagging which ones a transcript covered. */
export function pathsCatalogue(d: Design): string {
  return allNodes(d.paths).map((n) => `${n.id} :: ${n.label}`).join("\n");
}

/** Mock-interview link that remembers where the learner came from, so the debrief can send them back. */
export function mockHref(d: Design, from?: string, ck?: string) {
  const q = new URLSearchParams({ q: d.id });
  if (from) q.set("from", from);
  if (ck) q.set("ck", ck);
  return `/mock?${q}`;
}
