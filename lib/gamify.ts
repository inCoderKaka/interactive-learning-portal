import type { DayLog, Item, Progress } from "./types";
import { addDays, todayISO } from "./srs";

export const XP = { topic: 40, E: 30, M: 50, H: 80, design: 100, mock: 150, review: 15, quiz: 5 };

export function xpFor(item: Item): number {
  if (item.kind === "topic") return XP.topic;
  if (item.kind === "design") return item.est >= 45 ? XP.design : 50;
  if (item.kind === "mock") return XP.mock;
  return item.est <= 20 ? XP.E : item.est <= 35 ? XP.M : XP.H;
}

export const totalXp = (activity: Record<string, DayLog>) => Object.values(activity).reduce((a, d) => a + (d.xp || 0), 0);

const RANKS = ["Base camp", "Trailhead", "Ridge walker", "Switchback", "Tree line", "Scrambler", "High camp", "Summit push", "Summiteer", "Sherpa"];
export function levelOf(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 120)) + 1;
  const cur = 120 * (level - 1) ** 2;
  const next = 120 * level ** 2;
  return { level, rank: RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 2))], cur, next, pct: (xp - cur) / (next - cur) };
}

export function streakOf(activity: Record<string, DayLog>, today = todayISO()) {
  const active = (d: string) => (activity[d]?.done ?? 0) > 0 || (activity[d]?.min ?? 0) >= 10;
  let cur = 0;
  let d = active(today) ? today : addDays(today, -1);
  while (active(d)) { cur++; d = addDays(d, -1); }
  let best = 0, run = 0;
  const days = Object.keys(activity).filter(active).sort();
  let prev = "";
  for (const day of days) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return { cur, best: Math.max(best, cur), doneToday: active(today) };
}

export interface Badge { id: string; name: string; desc: string; got: boolean }
export function badges(progress: Record<string, Progress>, activity: Record<string, DayLog>, items: Item[]): Badge[] {
  const done = items.filter((i) => progress[i.id]?.status === "done");
  const cnt = (f: (i: Item) => boolean) => done.filter(f).length;
  const s = streakOf(activity);
  const reviews = Object.values(progress).reduce((a, p) => a + (p.reps ?? 0), 0);
  const calibrated = Object.values(progress).filter((p) => p.conf && p.score != null).length;
  return [
    { id: "first", name: "First step", desc: "Complete your first item", got: done.length >= 1 },
    { id: "p10", name: "Ten down", desc: "Solve 10 problems", got: cnt((i) => i.kind === "problem") >= 10 },
    { id: "p50", name: "Half century", desc: "Solve 50 problems", got: cnt((i) => i.kind === "problem") >= 50 },
    { id: "p100", name: "Centurion", desc: "Solve 100 problems", got: cnt((i) => i.kind === "problem") >= 100 },
    { id: "arch", name: "Architect", desc: "Finish 5 system designs", got: cnt((i) => i.kind === "design" && i.area === "hld") >= 5 },
    { id: "oop", name: "Class act", desc: "Finish 5 object-oriented designs", got: cnt((i) => i.kind === "design" && i.area === "lld") >= 5 },
    { id: "story", name: "Storyteller", desc: "Write 4 behavioural answers", got: cnt((i) => i.kind === "design" && i.area === "craft") >= 4 },
    { id: "ai", name: "Prompt whisperer", desc: "Complete 8 AI topics or designs", got: cnt((i) => i.area === "ai") >= 8 },
    { id: "s3", name: "Warm", desc: "3-day streak", got: s.best >= 3 },
    { id: "s7", name: "On fire", desc: "7-day streak", got: s.best >= 7 },
    { id: "s21", name: "Habit formed", desc: "21-day streak", got: s.best >= 21 },
    { id: "rev", name: "Memory keeper", desc: "Complete 25 spaced reviews", got: reviews >= 25 },
    { id: "cal", name: "Know thyself", desc: "Log 15 confidence predictions", got: calibrated >= 15 },
    { id: "mock", name: "Dress rehearsal", desc: "Finish a mock interview", got: Object.keys(progress).some((k) => k.startsWith("mock-") && progress[k].status === "done") },
    { id: "all", name: "Full spectrum", desc: "Complete items in all five areas", got: (["dsa", "hld", "lld", "craft", "ai"] as const).every((a) => cnt((i) => i.area === a) > 0) },
  ];
}
