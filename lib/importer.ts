import type { Problem } from "./types";
import { lcIndex } from "@/content";

/** heading keyword → topic id; first match wins */
const TOPIC_RULES: [RegExp, string][] = [
  [/eulerian|edge reversal/i, "advanced-graphs"],
  [/disjoint|union.?find/i, "union-find"],
  [/shortest path|dijkstra/i, "shortest-paths"],
  [/topolog/i, "topo-sort"],
  [/bitmask dp|game theory|advanced dp|2 level dfs/i, "dp-advanced"],
  [/bfs|dfs|graph/i, "graph-traversal"],
  [/binary search|rotated|bs on|minimum maximum|max freq|2d matrix/i, "binary-search"],
  [/\bbst\b/i, "bst"],
  [/\blca\b|tree/i, "trees"],
  [/lis\b|longest increasing|house robber|1d dp|\bdp\b|backtracking with memo/i, "dp-1d"],
  [/heap/i, "heap"],
  [/monotonic|\bdq\b|deque/i, "mono-deque"],
  [/sliding window|window/i, "sliding-window"],
  [/linked ?list/i, "linked-list"],
  [/trie/i, "tries"],
  [/stack/i, "stack"],
  [/interval/i, "intervals"],
  [/greedy/i, "greedy"],
  [/backtrack/i, "backtracking"],
  [/string/i, "strings"],
  [/bit/i, "bits"],
];
const topicFor = (text: string) => TOPIC_RULES.find(([re]) => re.test(text))?.[1];

const clean = (s: string) =>
  s
    .replace(/^\[image\d+\]:\s*<data:[^>]*>\s*$/gm, "")
    .replace(/!\[\]\[image\d+\]/g, "")
    .replace(/\\([_*\[\]<>#\-+=!|~`.(){}&])/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export interface ImportResult {
  notes: Record<string, string>;
  custom: Problem[];
  known: string[]; // item ids practised before
  matched: number;
  sections: number;
}

/** Parses a practice-notes markdown file: `# Pattern` sections containing `## [123: Title](url)` problems. */
export function parsePractice(md: string): ImportResult {
  const lines = md.split(/\r?\n/);
  const notes: Record<string, string> = {};
  const custom = new Map<string, Problem>();
  const known = new Set<string>();
  let topic = "graph-traversal";
  let sections = 0, matched = 0;
  let cur: { id: string; body: string[] } | null = null;
  let unsolved = false; // a "to be solved" section lists problems that were never practised

  const flush = () => {
    if (!cur) return;
    const body = clean(cur.body.join("\n"));
    if (body) notes[cur.id] = notes[cur.id] ? `${notes[cur.id]}\n\n---\n\n${body}` : body;
    const c = custom.get(cur.id);
    if (c) {
      const qs = [...body.matchAll(/^- \[[ x]\]\s*[“"]?(.+?)[”"]?\s*$/gm)].map((m) => m[1]).slice(0, 8);
      c.clarify = [...new Set([...c.clarify, ...qs])];
    }
    cur = null;
  };

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      flush();
      sections++;
      topic = topicFor(h1[1]) ?? topic;
      unsolved = /to be solved|not solved|todo|to do\b/i.test(h1[1]);
      continue;
    }
    const prob = line.match(/^#{2,4}\s+\[(?:(\d+)\s*(?:\\?[.:])\s*)?([^\]]+)\]\((https?:[^)]+)\)(.*)$/);
    if (prob) {
      flush();
      const lc = prob[1] ? Number(prob[1]) : undefined;
      const title = clean(prob[2]);
      const existing = lc ? lcIndex.get(lc) : undefined;
      let id: string;
      if (existing) {
        id = existing.id;
        matched++;
      } else {
        id = lc ? `p-${lc}` : `p-x-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
        if (!custom.has(id))
          custom.set(id, {
            id, lc, title, topic: topicFor(title) ?? topic, diff: "M", tier: 3, custom: true,
            statement: `Imported from your practice notes. Original: ${prob[3]}`,
            approaches: [], clarify: [], twists: [], followUps: [], hints: [],
          });
      }
      if (!unsolved) known.add(id);
      cur = { id, body: [] };
      continue;
    }
    if (cur) cur.body.push(line);
  }
  flush();
  return { notes, custom: [...custom.values()], known: [...known], matched, sections };
}
