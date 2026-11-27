/**
 * Builds the video libraries from the channel catalogs:
 *   content/videos/lc.json        LeetCode number → every channel's solution video
 *   content/videos/pages.json     outline page / chapter id → concept videos
 *   content/videos/channels.json  channel table (index used by the two files above)
 *   content/lc-extra.json         every LeetCode problem with a video: where it lives in the outline
 * and writes scripts/videos/report/*.txt listing every title that matched nothing, for the manual pass.
 *
 * Run: node scripts/ts.mjs scripts/videos/build.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CHANNELS } from "./channels";
import { lcIndex, questionsIn } from "./questions";
import { homeOf, type LcRow } from "./rules";
import { BROAD_NO, BROAD_OK, DSA_CONCEPTS, DSA_FALLBACK, HLD_CONCEPTS, HLD_DESIGNS, HLD_SKIP, LLD_ALLOW, LLD_CONCEPTS, LLD_DESIGNS, LLD_SKIP, SKIP, type ConceptRule } from "./concepts";
import { DESIGNS } from "../../content";
import { OVERRIDES } from "./overrides";
import { cfIndex, contestHome, type CfRow } from "./contests";
import { CHAPTER_OF, OUTLINE } from "../../content/outline";
import { TOPICS } from "../../content";

const here = resolve(import.meta.dirname ?? __dirname);
const root = resolve(here, "../..");
const rows: LcRow[] = JSON.parse(readFileSync(resolve(here, "leetcode.json"), "utf8"));
const ix = lcIndex(rows);
const cf = cfIndex(JSON.parse(readFileSync(resolve(here, "codeforces.json"), "utf8")) as CfRow[]);
const RULES: ConceptRule[] = [...DSA_CONCEPTS];
const PAGES = new Set([...Object.keys(OUTLINE), ...Object.keys(CHAPTER_OF), ...TOPICS.map((t) => t.id), ...DESIGNS.map((d) => d.id)]);
/** Product-heavy channels: only strict HLD rules apply, and no design rules. */
const BROAD = new Set(["GoogleCloudTech", "GoogleDevelopers"]);

/** Display title: drop channel tags, emoji and filler so the library reads cleanly. */
export function clean(t: string, channel: string) {
  return t
    .replace(/@\w[\w.-]*/g, "")
    .replace(new RegExp(`\\|\\s*${channel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "")
    .replace(/\|\s*(codestorywithMIK|MIK)\s*$/i, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B50}\u{2B06}\u{2194}-\u{21FF}]/gu, "")
    .replace(/\s*(\|\s*){2,}/g, " | ")
    .replace(/[\s|:-]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 140);
}

/** [id, title, channel index, 1 if embedding is disabled (checked over oEmbed; see noembed.json)] */
type V = [yt: string, title: string, ch: number, noEmbed?: 1];
const NOEMBED = new Set<string>(JSON.parse(readFileSync(resolve(here, "noembed.json"), "utf8")));
const lc: Record<string, V[]> = {};
const pages: Record<string, V[]> = {};
const seen = new Set<string>();
const reportDir = resolve(here, "report");
mkdirSync(reportDir, { recursive: true });
const summary: string[] = [];

CHANNELS.forEach((c, ci) => {
  const lines = readFileSync(resolve(here, "catalog", c.file + ".tsv"), "utf8").split("\n").filter(Boolean);
  const unmatched: string[] = [];
  let nq = 0, nc = 0, nskip = 0;
  for (const line of lines) {
    const [id, raw] = line.split("\t");
    if (!id || !raw || seen.has(id)) continue;
    seen.add(id);
    const title = clean(raw, c.name);
    const v: V = NOEMBED.has(id) ? [id, title, ci, 1] : [id, title, ci];
    const manual = OVERRIDES[id];
    if (manual !== undefined) {
      for (const to of manual) {
        if (/^\d+$/.test(to)) (lc[to] ??= []).push(v);
        else if (PAGES.has(to)) (pages[to] ??= []).push(v);
        else throw new Error(`override ${id} → unknown page ${to}`);
      }
      if (manual.length) nc++; else nskip++;
      continue;
    }
    const qs = c.q || /leet\s*code/i.test(raw) ? questionsIn(raw, ix) : [];
    if (qs.length) {
      for (const q of qs) (lc[q] ??= []).push(v);
      nq++;
      continue;
    }
    if (SKIP.some((re) => re.test(raw))) { nskip++; continue; }
    const contest = contestHome(raw, cf);
    if (contest) { (pages[contest] ??= []).push(v); nc++; continue; }
    let to = [...new Set(RULES.filter(([re]) => re.test(raw)).map(([, t]) => t))];
    if (c.areas.includes("hld") && !HLD_SKIP.test(raw)) {
      const broad = BROAD.has(c.file);
      if (broad && (!BROAD_OK.test(raw) || BROAD_NO.test(raw))) { /* product news or demos: no HLD match */ } else {
      to.push(...HLD_CONCEPTS.filter(([re, , strict]) => (!broad || strict) && re.test(raw)).map(([, t]) => t));
      if (!broad) to.push(...HLD_DESIGNS.filter(([re]) => re.test(raw)).map(([, t]) => t));
      to = [...new Set(to)];
      }
    }
    if (c.areas.includes("lld") && (!LLD_SKIP.test(raw) || LLD_ALLOW.test(raw))) {
      to.push(...LLD_CONCEPTS.filter(([re]) => re.test(raw)).map(([, t]) => t));
      to.push(...LLD_DESIGNS.filter(([re, t]) => re.test(raw) && PAGES.has(t)).map(([, t]) => t));
      to = [...new Set(to)];
    }
    if (!to.length) to = DSA_FALLBACK.filter(([re]) => re.test(raw)).map(([, t]) => t).slice(0, 2);
    if (to.length) {
      for (const t of to) (pages[t] ??= []).push(v);
      nc++;
    } else unmatched.push(`${id}\t${raw}`);
  }
  writeFileSync(resolve(reportDir, `${c.file}.unmatched.tsv`), unmatched.join("\n") + "\n");
  summary.push(`${c.name.padEnd(26)} ${String(lines.length).padStart(5)} uploads · ${String(nq).padStart(4)} problem · ${String(nc).padStart(4)} concept · ${String(nskip).padStart(4)} skipped · ${String(unmatched.length).padStart(4)} unmatched`);
});

// every LeetCode problem with at least one video, and where it lives
const extra: [number, string, string, string, number, string][] = [];
let homeless = 0;
for (const n of Object.keys(lc).map(Number).sort((a, b) => a - b)) {
  const r = ix.byId.get(n)!;
  const home = homeOf(r);
  if (!home) { homeless++; continue; }
  extra.push([n, r[1], r[2], r[3], r[4], home]);
}

const out = (p: string, d: unknown) => writeFileSync(resolve(root, p), JSON.stringify(d) + "\n");
mkdirSync(resolve(root, "content/videos"), { recursive: true });
out("content/videos/lc.json", lc);
out("content/videos/pages.json", pages);
out("content/videos/channels.json", CHANNELS.map((c) => [c.name, c.file, c.hi ? 1 : 0, c.mine ? 1 : 0]));
out("content/lc-extra.json", extra);
summary.push("", `problems with videos: ${Object.keys(lc).length} (${homeless} not DSA: SQL / JS / untagged) · pages with concept videos: ${Object.keys(pages).length}`);
writeFileSync(resolve(reportDir, "summary.txt"), summary.join("\n") + "\n");
console.log(summary.join("\n"));
