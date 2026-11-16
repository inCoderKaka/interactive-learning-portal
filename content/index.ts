import type { Area, Design, Item, Problem, Topic } from "@/lib/types";
import { topics1, problems1 } from "./dsa1";
import { topics2, problems2 } from "./dsa2";
import { topics3, problems3 } from "./dsa3";
import { hldTopics } from "./hld-concepts";
import { hldDesigns } from "./hld-problems";
import { lldTopics, lldDesigns } from "./lld";
import { craftTopics, behavioralPrompts } from "./craft";
import { dsaExtra, dsaNewTopics } from "./extra-dsa";
import { designExtra, designNewTopics } from "./extra-design";
import { extraDesigns, extraProblems } from "./extra-exercises";
import type { Extra } from "./h";

export const AREAS: { id: Area; name: string; short: string; tag: string; color: string }[] = [
  { id: "dsa", name: "Data Structures & Algorithms", short: "DSA", tag: "Coding rounds", color: "var(--color-dsa)" },
  { id: "hld", name: "System Design (HLD)", short: "HLD", tag: "Design round", color: "var(--color-hld)" },
  { id: "lld", name: "Object-Oriented Design (LLD)", short: "LLD", tag: "Design & code quality", color: "var(--color-lld)" },
  { id: "craft", name: "Interview Craft", short: "Craft", tag: "Loop, bias, behavioural", color: "var(--color-craft)" },
];
export const areaOf = (id: Area) => AREAS.find((a) => a.id === id)!;

const EXTRA: Record<string, Extra> = { ...dsaExtra, ...designExtra };

function withExtra(t: Topic): Topic {
  const x = EXTRA[t.id];
  if (!x) return t;
  const seen = new Set<string>();
  const cards = [...(t.cards ?? []), ...(x.cards ?? [])].filter(([front]) => !seen.has(front) && !!seen.add(front));
  return {
    ...t,
    lesson: x.deep ? `${t.lesson}\n\n## Variations, depth and bar raisers\n\n${x.deep}` : t.lesson,
    cards,
    prereq: [...new Set([...(t.prereq ?? []), ...(x.pre ?? [])])],
  };
}

function assemble(): Topic[] {
  const out = [...topics1, ...topics2, ...topics3, ...hldTopics, ...lldTopics, ...craftTopics];
  for (const { after, topic } of [...dsaNewTopics, ...designNewTopics]) {
    const i = out.findIndex((t) => t.id === after);
    out.splice(i < 0 ? out.length : i + 1, 0, topic);
  }
  return out.map(withExtra);
}

export const TOPICS: Topic[] = assemble();
export const PROBLEMS: Problem[] = [...problems1, ...problems2, ...problems3, ...extraProblems];
export const DESIGNS: Design[] = [...hldDesigns, ...lldDesigns, ...behavioralPrompts, ...extraDesigns];

export const topicById = new Map(TOPICS.map((t) => [t.id, t]));
export const problemById = new Map(PROBLEMS.map((p) => [p.id, p]));
export const designById = new Map(DESIGNS.map((d) => [d.id, d]));

const DIFF_MIN = { E: 20, M: 35, H: 50 } as const;

export function problemItem(p: Problem): Item {
  return { id: p.id, kind: "problem", area: "dsa", topic: p.topic, title: p.title, tier: p.tier, est: DIFF_MIN[p.diff], href: `/problem/${p.id}` };
}

/** Curriculum order: each topic followed by its problems / designs. */
export function buildItems(custom: Problem[] = []): Item[] {
  const out: Item[] = [];
  for (const t of TOPICS) {
    out.push({ id: `t-${t.id}`, kind: "topic", area: t.area, topic: t.id, title: t.title, tier: t.tier, est: t.est, href: `/learn/${t.id}` });
    for (const p of PROBLEMS) if (p.topic === t.id) out.push(problemItem(p));
    for (const p of custom) if (p.topic === t.id) out.push(problemItem(p));
    for (const d of DESIGNS) if (d.topic === t.id) out.push({ id: d.id, kind: "design", area: d.area, topic: t.id, title: d.title, tier: d.tier, est: d.est, href: `/design/${d.id}` });
  }
  return out;
}

export const ITEMS = buildItems();
export const itemById = new Map(ITEMS.map((i) => [i.id, i]));

export const lcIndex = new Map(PROBLEMS.filter((p) => p.lc).map((p) => [p.lc!, p]));
