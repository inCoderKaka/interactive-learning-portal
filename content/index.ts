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
import { DESIGN_REFS, LC, PROBLEM_VIDEO, TOPIC_REFS } from "./refs";
import type { Extra } from "./h";
import { CARDS } from "./cards";
import { AI_REFS, aiDesigns, aiTopics } from "./ai";
import { OUTLINE, CHAPTER_OF } from "./outline";
import { HLD_OVERVIEWS } from "./deep/hld/overviews";
import DEEP_META from "./deep/meta.json";
import LC_EXTRA from "./lc-extra.json";

export const AREAS: { id: Area; name: string; short: string; tag: string; color: string }[] = [
  { id: "dsa", name: "Data Structures & Algorithms", short: "DSA", tag: "Coding rounds", color: "var(--color-dsa)" },
  { id: "hld", name: "System Design (HLD)", short: "HLD", tag: "Design round", color: "var(--color-hld)" },
  { id: "lld", name: "Object-Oriented Design (LLD)", short: "LLD", tag: "Design & code quality", color: "var(--color-lld)" },
  { id: "craft", name: "Interview Craft", short: "Craft", tag: "Loop, bias, behavioural", color: "var(--color-craft)" },
  { id: "ai", name: "AI & Large Language Models", short: "AI", tag: "LLMs, RAG, agents, MCP", color: "var(--color-ai)" },
];
export const areaOf = (id: Area) => AREAS.find((a) => a.id === id)!;

const EXTRA: Record<string, Extra> = { ...dsaExtra, ...designExtra };

function withExtra(t: Topic): Topic {
  if (HLD_OVERVIEWS[t.id]) return { ...t, lesson: HLD_OVERVIEWS[t.id], prereq: [...new Set([...(t.prereq ?? []), ...(EXTRA[t.id]?.pre ?? [])])] };
  const x = EXTRA[t.id];
  if (!x) return t;
  return {
    ...t,
    lesson: x.deep ? `${t.lesson}\n\n## Variations, depth and bar raisers\n\n${x.deep}` : t.lesson,
    prereq: [...new Set([...(t.prereq ?? []), ...(x.pre ?? [])])],
  };
}

function assemble(): Topic[] {
  const out = [...topics1, ...topics2, ...topics3, ...hldTopics, ...lldTopics, ...craftTopics, ...aiTopics];
  for (const { after, topic } of [...dsaNewTopics, ...designNewTopics]) {
    const i = out.findIndex((t) => t.id === after);
    out.splice(i < 0 ? out.length : i + 1, 0, topic);
  }
  return out.map(withExtra).map((t) => ({ ...t, cards: CARDS[t.id] ?? [], refs: TOPIC_REFS[t.id] ?? AI_REFS[t.id] }));
}

/** Chapters: the original topics. Galaxy, progress and catalogs work on these. */
export const TOPICS: Topic[] = assemble();

type Meta = { file: string; blurb: string; problems?: number[]; prereq?: string[]; widgets?: string[] };
const META = DEEP_META as Record<string, Meta>;

/** Subtopic pages, in outline order, for every subtopic whose body is written. */
export const SUBTOPICS: Topic[] = TOPICS.flatMap((ch) =>
  (OUTLINE[ch.id] ?? []).flatMap(([id, title, tier, est]) => {
    const d = META[id];
    if (!d) return [];
    // the body (lesson, revise sheet, doubts, quiz…) loads on demand: see lib/deep.ts
    const t: Topic = {
      id, area: ch.area, title, tier, est, chapter: ch.id, deepFile: d.file,
      blurb: d.blurb, signals: [], lesson: "", revise: "", doubts: [], pitfalls: [], quiz: [],
      widgets: d.widgets, prereq: d.prereq, featured: d.problems, cards: [],
    };
    return [t];
  }),
);
/** Written subtopics of each chapter. */
export const subsOf = (chapter: string) => SUBTOPICS.filter((s) => s.chapter === chapter);
/** Reading order of every page (chapter overview, then its subtopics), used for previous / next. */
export const PAGE_ORDER: Topic[] = TOPICS.flatMap((ch) => [ch, ...subsOf(ch.id)]);
const topicIds = new Set(TOPICS.map((t) => t.id));
/** Direct LeetCode link when the slug is known, otherwise a search by number (imported problems). */
export function lcLink(lc: number): { url: string; premium: boolean } {
  const hit = LC[lc];
  return hit ? { url: `https://leetcode.com/problems/${hit[0]}/`, premium: !!hit[1] } : { url: `https://leetcode.com/problemset/?search=${lc}`, premium: false };
}

function withLinks(p: Problem): Problem {
  if (!p.lc) return p;
  const v = PROBLEM_VIDEO[p.lc];
  return { ...p, ...lcLink(p.lc), video: v && { kind: "video", title: `${p.title}: walkthrough`, by: v[1], url: `https://www.youtube.com/watch?v=${v[0]}`, yt: v[0] } };
}

/** Which subtopic a LeetCode problem is featured on: written bodies first, then the video pipeline's placement. */
const PLACED = new Map((LC_EXTRA as [number, string, string, string, number, string][]).map((r) => [r[0], r[5]]));
const RAW_PROBLEMS = [...problems1, ...problems2, ...problems3, ...extraProblems];
const CURATED_CHAPTER = new Map(RAW_PROBLEMS.filter((p) => p.lc).map((p) => [p.lc!, p.topic]));
const homeChapter = (lc: number) => { const pl = PLACED.get(lc); return CURATED_CHAPTER.get(lc) ?? (pl ? CHAPTER_OF[pl] ?? pl : undefined); };
// a page claims a problem only within the problem's own chapter; mentions elsewhere do not move it
const FEATURED = new Map<number, string>();
for (const [id, d] of Object.entries(DEEP_META as Record<string, { problems?: number[] }>)) for (const n of d.problems ?? []) if (!FEATURED.has(n) && homeChapter(n) === CHAPTER_OF[id]) FEATURED.set(n, id);
function subOf(p: Problem): string | undefined {
  if (!p.lc) return undefined;
  const s = FEATURED.get(p.lc) ?? PLACED.get(p.lc);
  return s && CHAPTER_OF[s] === p.topic ? s : undefined;
}

export const PROBLEMS: Problem[] = RAW_PROBLEMS.map(withLinks).map((p) => ({ ...p, sub: subOf(p) }));

/**
 * Video-backed LeetCode pages for every problem a tracked channel has solved that the curated set lacks.
 * Outside the plan until started. The statement is not copied: the page links to LeetCode.
 */
const curated = new Set(PROBLEMS.map((p) => p.lc));
export const EXTRA_PROBLEMS: Problem[] = (LC_EXTRA as [number, string, string, "E" | "M" | "H", number, string][]).flatMap(([lc, slug, title, diff, premium, home]) => {
  if (curated.has(lc)) return [];
  const sub = FEATURED.get(lc) ?? home;
  const chapter = CHAPTER_OF[sub] ?? (topicIds.has(sub) ? sub : undefined);
  if (!chapter) return [];
  return [{
    id: `p-${lc}`, topic: chapter, sub: CHAPTER_OF[sub] ? sub : undefined, title, lc, diff, tier: 3 as const, extra: true, slug,
    statement: "", approaches: [], clarify: [], twists: [], followUps: [], hints: [],
    url: `https://leetcode.com/problems/${slug}/`, premium: !!premium,
  } satisfies Problem];
});
export const DESIGNS: Design[] = [...hldDesigns, ...lldDesigns, ...behavioralPrompts, ...extraDesigns, ...aiDesigns].map((d) => ({ ...d, refs: DESIGN_REFS[d.id] }));

export const topicById = new Map([...TOPICS, ...SUBTOPICS].map((t) => [t.id, t]));
export const problemById = new Map([...PROBLEMS, ...EXTRA_PROBLEMS].map((p) => [p.id, p]));
export const designById = new Map(DESIGNS.map((d) => [d.id, d]));

const DIFF_MIN = { E: 20, M: 35, H: 50 } as const;

export function problemItem(p: Problem): Item {
  return { id: p.id, kind: "problem", area: "dsa", topic: p.topic, title: p.title, tier: p.tier, est: DIFF_MIN[p.diff], href: `/problem/${p.id}` };
}

/** Curriculum order: each chapter, its subtopic pages, then its problems / designs. Extra problems join once started. */
export function buildItems(custom: Problem[] = [], started: Problem[] = []): Item[] {
  const out: Item[] = [];
  for (const t of TOPICS) {
    out.push({ id: `t-${t.id}`, kind: "topic", area: t.area, topic: t.id, title: t.title, tier: t.tier, est: t.est, href: `/learn/${t.id}` });
    for (const s of subsOf(t.id)) out.push({ id: `t-${s.id}`, kind: "topic", area: s.area, topic: t.id, title: s.title, tier: s.tier, est: s.est, href: `/learn/${s.id}` });
    for (const p of started) if (p.topic === t.id) out.push(problemItem(p));
    for (const p of PROBLEMS) if (p.topic === t.id) out.push(problemItem(p));
    for (const p of custom) if (p.topic === t.id) out.push(problemItem(p));
    for (const d of DESIGNS) if (d.topic === t.id) out.push({ id: d.id, kind: "design", area: d.area, topic: t.id, title: d.title, tier: d.tier, est: d.est, href: `/design/${d.id}` });
  }
  return out;
}

export const ITEMS = buildItems();
export const itemById = new Map(ITEMS.map((i) => [i.id, i]));

export const lcIndex = new Map(PROBLEMS.filter((p) => p.lc).map((p) => [p.lc!, p]));
