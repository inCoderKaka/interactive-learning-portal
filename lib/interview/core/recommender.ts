// Suggests mock interviews from what the learner has done. Deterministic: no AI calls.

import type { Area, Attempt, Item, Progress } from "../../types.ts";
import type { Kind, Level, PoolFilter } from "./types.ts";

export interface MockRecommendation {
  kind: Kind;
  title: string;
  reason: string;
  pool: PoolFilter;
  level?: Level;
  readiness?: boolean;
}

const KIND_AREA: Record<Kind, Area> = { coding: "dsa", hld: "hld", lld: "lld", ml: "ai", mlcode: "ai", behavioral: "craft" };
const KIND_LABEL: Record<Kind, string> = { coding: "Coding", hld: "System design", lld: "Object-oriented design", ml: "ML system design", mlcode: "ML coding", behavioral: "Googleyness" };

export const W = { coverage: 3, weakness: 2.5, lapses: 1.5, miscalibration: 1.5, staleness: 1, repeat: 2 };

interface Input {
  items: Item[];
  progress: Record<string, Progress>;
  attempts: Attempt[];
  areas: Record<Area, boolean>;
  now?: number;
}

function topicTitle(items: Item[], id: string) {
  return items.find((i) => i.kind === "topic" && i.topic === id)?.title ?? id;
}

/** Ranked suggestions; the first is the one to do next. */
export function recommendMocks({ items, progress, attempts, areas, now = Date.now() }: Input, count = 3): MockRecommendation[] {
  const mocks = attempts.filter((a) => a.kind.startsWith("mock:"));
  const out: { score: number; rec: MockRecommendation }[] = [];

  for (const kind of ["coding", "hld", "lld", "ml", "mlcode", "behavioral"] as Kind[]) {
    const area = KIND_AREA[kind];
    if (!areas[area]) continue;
    const inArea = items.filter((i) => i.area === area && i.kind !== "mock");
    const doneTopics = [...new Set(inArea.filter((i) => i.kind === "topic" && progress[i.id]?.status === "done").map((i) => i.topic))];
    const kindMocks = mocks.filter((m) => m.kind === `mock:${kind}`);
    const lastAt = kindMocks[0]?.at ?? 0;
    const days = lastAt ? (now - lastAt) / 86400000 : 30;

    const coverage = kind === "behavioral" ? 0.4 : Math.min(1, doneTopics.length / 4) * (kindMocks.length ? 0.6 : 1);
    const recentScores = kindMocks.slice(0, 3).map((m) => m.score ?? 0);
    const weakness = recentScores.length ? Math.max(0, (70 - recentScores.reduce((a, b) => a + b, 0) / recentScores.length) / 70) : 0;

    const lapsedTopics = new Map<string, number>();
    for (const it of inArea) {
      const p = progress[it.id];
      if (p?.lapses) lapsedTopics.set(it.topic, (lapsedTopics.get(it.topic) ?? 0) + p.lapses);
    }
    const lapses = Math.min(1, [...lapsedTopics.values()].reduce((a, b) => a + b, 0) / 6);

    const calib = inArea.map((it) => progress[it.id]).filter((p): p is Progress => !!p && p.conf !== undefined && p.score !== undefined);
    const miscalibration = calib.length >= 3 ? Math.min(1, calib.reduce((a, p) => a + Math.max(0, (p.conf! - 1) * 25 - p.score!), 0) / calib.length / 40) : 0;
    const staleness = Math.min(1, days / 14);
    const repeat = mocks[0]?.kind === `mock:${kind}` ? 1 : 0;

    if (kind !== "behavioral" && !doneTopics.length && !kindMocks.length) continue;
    const score = W.coverage * coverage + W.weakness * weakness + W.lapses * lapses + W.miscalibration * miscalibration + W.staleness * staleness - W.repeat * repeat;

    const weakTopics = [...lapsedTopics.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 2);
    const poolTopics = weakTopics.length ? [...new Set([...weakTopics, ...doneTopics.slice(-2)])] : doneTopics.slice(-4);
    const reasons: string[] = [];
    if (doneTopics.length && coverage > 0.5) reasons.push(`you finished ${doneTopics.slice(-2).map((t) => topicTitle(items, t)).join(" and ")}${kindMocks.length ? "" : " and have not done this round yet"}`);
    if (weakness > 0.15) reasons.push(`your last ${KIND_LABEL[kind].toLowerCase()} mocks averaged ${Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)}/100`);
    if (weakTopics.length) reasons.push(`spaced review keeps lapsing on ${weakTopics.map((t) => topicTitle(items, t)).join(" and ")}`);
    if (miscalibration > 0.2) reasons.push("your confidence runs ahead of your scores here");
    if (days >= 10 && lastAt) reasons.push(`${Math.round(days)} days since the last one`);
    out.push({
      score,
      rec: {
        kind,
        title: `${KIND_LABEL[kind]} mock`,
        reason: reasons.length ? `Because ${reasons.join("; ")}.` : "A regular round keeps interview conditions familiar.",
        pool: kind === "behavioral" || !poolTopics.length ? {} : { topics: poolTopics, status: ["done", "due", "weak", "unseen"] },
      },
    });
  }

  out.sort((a, b) => b.score - a.score);
  const recs = out.slice(0, count).map((x) => x.rec);

  // readiness mock: two learned topics and one unseen, in the strongest area by coverage
  const dsaDone = [...new Set(items.filter((i) => i.area === "dsa" && i.kind === "topic" && progress[i.id]?.status === "done").map((i) => i.topic))];
  const dsaUnseen = [...new Set(items.filter((i) => i.area === "dsa" && i.kind === "topic" && progress[i.id]?.status !== "done").map((i) => i.topic))];
  if (areas.dsa && dsaDone.length >= 2 && dsaUnseen.length) {
    const pickTopics = [...dsaDone.slice(-2), dsaUnseen[0]];
    recs.push({ kind: "coding", title: "Readiness mock", reason: `Two topics you know (${pickTopics.slice(0, 2).map((t) => topicTitle(items, t)).join(", ")}) and one you have not studied (${topicTitle(items, pickTopics[2])}): real loops do not stay inside what you revised.`, pool: { topics: pickTopics }, readiness: true });
  }
  return recs;
}

/** Day indices (0-based within the plan) for N mocks, denser toward the end. */
export function mockDays(nDays: number, n: number): number[] {
  if (nDays <= 0 || n <= 0) return [];
  const out: number[] = [];
  for (let i = 1; i <= n; i++) {
    const d = Math.min(nDays - 1, Math.round(Math.sqrt(i / n) * (nDays - 1)));
    out.push(out.length && d <= out[out.length - 1] ? Math.min(nDays - 1, out[out.length - 1] + 1) : d);
  }
  return out;
}
