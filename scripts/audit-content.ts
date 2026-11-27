/**
 * Content audit: structural checks over every topic, quiz, card, problem, design, reference and drill.
 *   npm run audit          structure only (fast, offline)
 *   npm run audit -- --net also checks every YouTube id against the oEmbed endpoint
 * Exits non-zero on any error; warnings are printed but do not fail.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { DESIGNS, EXTRA_PROBLEMS, PROBLEMS, SUBTOPICS, TOPICS, topicById } from "@/content";
import { OUTLINE } from "@/content/outline";
import { DEEP } from "@/content/deep";
import { parseRevise } from "@/lib/revise-parse";
import { buildMeta } from "./deep-meta";
import { DESIGN_REFS, LC, PROBLEM_VIDEO, TOPIC_REFS } from "@/content/refs";
import { AI_REFS } from "@/content/ai/refs";
import { DRILLS } from "@/content/drills";
import { checkDrill } from "@/lib/drills";
import { AI_WIDGET_IDS } from "@/components/viz/ai-ids";
import { HLD_WIDGET_IDS } from "@/components/viz/sd/ids";
import { ALGOS } from "@/components/viz/algos";

const errors: string[] = [];
const warns: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warns.push(m);
const YT = new Map<string, { where: string[]; title?: string }>();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// widget ids, read from source so the React files don't have to load here
const src = (f: string) => readFileSync(f, "utf8");
const hldBlock = /export const WIDGETS[^{]*\{([^}]*)\}/.exec(src("components/viz/Hld.tsx"))?.[1] ?? "";
const hldIds = [...hldBlock.matchAll(/"?([\w-]+)"?\s*:/g)].map((m) => m[1]);
const WIDGETS = new Set([...Object.keys(ALGOS), ...hldIds, ...AI_WIDGET_IDS, ...HLD_WIDGET_IDS]);

// ---- topics ----
const seen = new Set<string>();
for (const t of TOPICS) {
  const at = `topic ${t.id}`;
  if (seen.has(t.id)) err(`${at}: duplicate id`);
  seen.add(t.id);
  if (!t.title || !t.blurb || !t.lesson) err(`${at}: missing title, blurb or lesson`);
  if (!t.signals.length) warn(`${at}: no "reach for this when" signals`);
  if (!t.pitfalls.length) warn(`${at}: no pitfalls`);
  for (const p of t.prereq ?? []) if (!topicById.has(p)) err(`${at}: prereq "${p}" is not a topic`);
  if (t.viz && !WIDGETS.has(t.viz)) err(`${at}: viz "${t.viz}" is not a registered widget`);
  for (const m of t.lesson.matchAll(/\[\[widget:([\w-]+)\]\]/g)) if (!WIDGETS.has(m[1])) err(`${at}: lesson widget "${m[1]}" is not registered`);
  for (const m of t.lesson.matchAll(/\[\[yt:([\w-]{11})(?:\|[^\]]*)?\]\]/g)) ytUse(m[1], at);
  if (/\$\{/.test(t.lesson)) err(`${at}: lesson contains a literal \${`);
  const qs = new Set<string>();
  t.quiz.forEach((q, i) => {
    const qa = `${at} quiz ${i + 1}`;
    if (q.answer < 0 || q.answer >= q.options.length) err(`${qa}: answer index ${q.answer} out of range (no "*" option?)`);
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) err(`${qa}: duplicate options`);
    if (q.options.length < 2) err(`${qa}: fewer than two options`);
    if (!q.why) warn(`${qa}: no explanation`);
    if (qs.has(norm(q.q))) err(`${qa}: duplicate question`);
    qs.add(norm(q.q));
  });
  if (!t.quiz.length) warn(`${at}: no quiz`);
  const refs = TOPIC_REFS[t.id] ?? AI_REFS[t.id] ?? [];
  if (!refs.length) warn(`${at}: no references`);
  if (!refs.some((r) => r.yt)) warn(`${at}: no video`);
  const featured = refs.filter((r) => r.featured);
  if (featured.length > 1) err(`${at}: ${featured.length} featured refs (want one)`);
  for (const r of refs) if (r.yt) ytUse(r.yt, at, r.title);
  const urls = refs.map((r) => r.url);
  if (new Set(urls).size !== urls.length) err(`${at}: duplicate reference URL`);
  const d = DRILLS[t.id] ?? [];
  if (d.length < 3) warn(`${at}: only ${d.length} quick-play drills`);
  d.forEach((x, i) => { for (const m of checkDrill(x)) err(`${at} drill ${i + 1} (${x.kind}): ${m}`); });
}
for (const id of Object.keys(DRILLS)) if (!topicById.has(id)) err(`drills keyed by unknown topic "${id}"`);
for (const id of Object.keys(TOPIC_REFS)) if (!topicById.has(id)) err(`TOPIC_REFS keyed by unknown topic "${id}"`);
for (const id of Object.keys(AI_REFS)) if (!topicById.has(id)) err(`AI_REFS keyed by unknown topic "${id}"`);

// ---- cards: every front a standalone question, no duplicates across the deck ----
const fronts = new Map<string, string>();
let cardCount = 0;
for (const t of TOPICS) for (const [f, b] of t.cards ?? []) {
  cardCount++;
  const k = norm(f);
  if (fronts.has(k)) err(`card duplicated in ${t.id} and ${fronts.get(k)}: "${f}"`);
  fronts.set(k, t.id);
  if (!b.trim()) err(`card in ${t.id} has an empty back: "${f}"`);
  if (!/[?.:]$/.test(f.trim())) warn(`card in ${t.id} front doesn't end like a question or prompt: "${f}"`);
}

// ---- problems ----
const pids = new Set<string>();
for (const p of PROBLEMS) {
  const at = `problem ${p.id}`;
  if (pids.has(p.id)) err(`${at}: duplicate id`);
  pids.add(p.id);
  if (!topicById.has(p.topic)) err(`${at}: topic "${p.topic}" does not exist`);
  if (!p.approaches.length) err(`${at}: no approaches`);
  for (const a of p.approaches) if (!a.name || !a.idea || !a.time || !a.space) err(`${at}: approach "${a.name}" is missing a field`);
  if (p.lc && !LC[p.lc]) warn(`${at}: LeetCode ${p.lc} has no known slug (falls back to search)`);
  if (!p.hints.length) warn(`${at}: no hints`);
}
for (const [lc, [id]] of Object.entries(PROBLEM_VIDEO)) ytUse(id, `problem video lc ${lc}`);

// ---- designs ----
const dids = new Set<string>();
for (const d of DESIGNS) {
  const at = `design ${d.id}`;
  if (dids.has(d.id)) err(`${at}: duplicate id`);
  dids.add(d.id);
  if (!topicById.has(d.topic)) err(`${at}: topic "${d.topic}" does not exist`);
  if (!d.stages.length) err(`${at}: no stages`);
  for (const r of DESIGN_REFS[d.id] ?? []) if (r.yt) ytUse(r.yt, at, r.title);
  const ids = new Set(d.arch?.nodes.map((n) => n.id));
  for (const e of d.arch?.edges ?? []) if (!ids.has(e.a) || !ids.has(e.b)) err(`${at}: arch edge ${e.a}→${e.b} references a missing node`);
  const boxes = new Set(d.classes?.boxes.map((b) => b.name));
  for (const r of d.classes?.rels ?? []) if (!boxes.has(r.a) || !boxes.has(r.b)) err(`${at}: class relation ${r.a}→${r.b} references a missing box`);
}

// ---- YouTube ids ----
function ytUse(id: string, where: string, title?: string) {
  if (!/^[\w-]{11}$/.test(id)) err(`${where}: "${id}" is not a YouTube id`);
  const u = YT.get(id) ?? { where: [], title };
  u.where.push(where);
  YT.set(id, u);
}

async function net() {
  const out: Record<string, { title: string; author: string } | null> = {};
  const ids = [...YT.keys()];
  let i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < ids.length) {
      const id = ids[i++];
      try {
        const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
        if (!r.ok) { out[id] = null; err(`YouTube ${id} (${YT.get(id)!.where.join(", ")}) returned ${r.status}: removed, private or not embeddable`); continue; }
        const j = await r.json();
        out[id] = { title: j.title, author: j.author_name };
      } catch (e) { warn(`YouTube ${id}: network error ${(e as Error).message}`); }
    }
  }));
  writeFileSync(process.env.YT_OUT ?? "/dev/null", JSON.stringify(out, null, 1));
  return Object.values(out).filter(Boolean).length;
}

// ---- subtopic pages (content/deep) ----
const outlineIds = new Set<string>();
for (const [ch, subs] of Object.entries(OUTLINE)) {
  if (!topicById.has(ch)) err(`outline: chapter "${ch}" is not a topic`);
  for (const [id] of subs) {
    if (outlineIds.has(id) || TOPICS.some((t) => t.id === id)) err(`outline: id "${id}" is duplicated or collides with a chapter`);
    outlineIds.add(id);
  }
}
for (const id of Object.keys(DEEP)) if (!outlineIds.has(id)) err(`deep: "${id}" has a body but is not in the outline`);
const lcKnown = new Set(JSON.parse(readFileSync("scripts/videos/leetcode.json", "utf8")).map((r: [string]) => Number(r[0])));
for (const t of SUBTOPICS) {
  const d = DEEP[t.id], at = `page ${t.id}`;
  if (d.lesson.length < 800) warn(`${at}: lesson is short (${d.lesson.length} chars)`);
  const recall = parseRevise(d.revise).reduce((n, b) => n + (b.kind === "recall" ? b.items.length : 0), 0);
  if (recall < 4) err(`${at}: revise sheet has only ${recall} recall items`);
  if (d.doubts.length < 2) warn(`${at}: only ${d.doubts.length} common doubts`);
  if (!d.notes) warn(`${at}: no cheat-sheet notes`);
  else if (d.notes.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length < 12) warn(`${at}: cheat sheet has under 12 lines`);
  if (!d.quiz.length) err(`${at}: no quiz`);
  d.quiz.forEach((q, i) => { if (q.answer < 0 || q.answer >= q.options.length) err(`${at}: quiz ${i + 1} has no valid answer`); });
  if (d.sources.length < 2) warn(`${at}: fewer than 2 primary sources`);
  for (const w of d.widgets ?? []) if (!WIDGETS.has(w)) err(`${at}: widget "${w}" is not registered`);
  for (const m of d.lesson.matchAll(/\[\[widget:([\w-]+)\]\]/g)) if (!WIDGETS.has(m[1])) err(`${at}: lesson widget "${m[1]}" is not registered`);
  for (const m of d.lesson.matchAll(/\]\(\/learn\/([\w-]+)\)/g)) if (!topicById.has(m[1])) err(`${at}: link to /learn/${m[1]} which is not a page`);
  for (const p of d.prereq ?? []) if (!topicById.has(p)) err(`${at}: prereq "${p}" is not a page`);
  for (const n of d.problems ?? []) if (!lcKnown.has(n)) err(`${at}: LeetCode ${n} does not exist`);
}
for (const p of EXTRA_PROBLEMS) if (!topicById.has(p.topic) || (p.sub && !topicById.has(p.sub))) err(`extra problem ${p.id}: unknown placement ${p.topic}/${p.sub}`);

(async () => {
  const fresh = JSON.stringify(await buildMeta()), stored = JSON.stringify(JSON.parse(readFileSync("content/deep/meta.json", "utf8")));
  if (fresh !== stored) err("content/deep/meta.json is stale: run npm run deep:meta");
  let checked = 0;
  if (process.argv.includes("--net")) checked = await net();
  for (const w of warns) console.log(`warn  ${w}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  const drills = Object.values(DRILLS).reduce((n, d) => n + d.length, 0);
  console.log(`\n${SUBTOPICS.length} subtopic pages (${Object.keys(DEEP).length} written of ${outlineIds.size} outlined), ${EXTRA_PROBLEMS.length} extra problem pages`);
  console.log(`${TOPICS.length} topics, ${TOPICS.reduce((n, t) => n + t.quiz.length, 0)} quiz questions, ${cardCount} cards, ${drills} drills, ${PROBLEMS.length} problems, ${DESIGNS.length} designs, ${YT.size} videos${checked ? ` (${checked} verified online)` : ""}`);
  console.log(`${errors.length} errors, ${warns.length} warnings`);
  process.exit(errors.length ? 1 : 0);
})();
