/**
 * Competitive-programming problem videos (Codeforces, CodeChef, AtCoder) → outline chapters.
 * Codeforces problems are identified by "560E" or by "B. Two Arrays" and placed by their Codeforces tags;
 * other contests are placed only when the title names the technique.
 */
import { norm } from "./questions";

export type CfRow = [contestId: number | undefined, index: string, name: string, tags: string[]];

const CF_TAG_TO: [string, string][] = [
  ["2-sat", "scc"], ["flows", "network-flow"], ["graph matchings", "network-flow"], ["dsu", "dsu-applications"],
  ["shortest paths", "shortest-paths"], ["trees", "trees"], ["graphs", "graph-traversal"], ["dfs and similar", "graph-traversal"],
  ["string suffix structures", "suffix-structures"], ["hashing", "rolling-hash"], ["strings", "strings"],
  ["data structures", "range-queries"], ["bitmasks", "bits"], ["games", "game-dp"], ["probabilities", "randomized"],
  ["geometry", "geometry"], ["combinatorics", "combinatorics"], ["number theory", "gcd-primes"],
  ["dp", "dp-1d"], ["binary search", "binary-search"], ["two pointers", "two-pointers"], ["sortings", "sorting"],
  ["greedy", "greedy"], ["math", "math"], ["constructive algorithms", "arrays-hashing"], ["implementation", "arrays-hashing"], ["brute force", "arrays-hashing"],
];

const TECHNIQUE: [RegExp, string][] = [
  [/binary search/i, "binary-search"], [/dynamic programming|\bdp\b/i, "dp-1d"], [/string processing|strings?\b/i, "strings"],
  [/lucas theorem/i, "combinatorics"], [/graph|cycles?\b/i, "graph-traversal"], [/greedy/i, "greedy"], [/hamming/i, "bits"],
];

export function cfIndex(rows: CfRow[]) {
  const byId = new Map<string, CfRow>(), byName = new Map<string, CfRow>();
  for (const r of rows) {
    if (r[0]) byId.set(`${r[0]}${r[1]}`, r);
    if (!byName.has(norm(r[2]))) byName.set(norm(r[2]), r);
  }
  return { byId, byName };
}

/** Outline target for a contest video, or null when it is not one (or cannot be placed). */
export function contestHome(title: string, ix: ReturnType<typeof cfIndex>): string | null {
  if (!/codeforces|codechef|atcoder|kickstart|spoj|zco|interview ?bit/i.test(title)) return null;
  let row: CfRow | undefined;
  const id = title.match(/codeforces\s*(\d{3,4})\s*-?\s*([A-H]\d?)\b/i);
  if (id) row = ix.byId.get(`${id[1]}${id[2].toUpperCase()}`);
  if (!row) {
    const m = title.match(/prob(?:le|el)m\s*([A-H]\d?)\s*[.:)]?\s*\(?\s*([^|()!]+?)\s*(?:\)|\(|\||!|$)/i) ?? title.match(/[-,]\s*([A-H]\d?)\.\s*([^|()!]+?)\s*(?:\(|\||!|$)/);
    if (m) row = ix.byName.get(norm(m[2])) ?? ix.byName.get(norm(m[2]).replace(/s$/, ""));
  }
  if (row) for (const [tag, to] of CF_TAG_TO) if (row[3].includes(tag)) return to;
  for (const [re, to] of TECHNIQUE) if (re.test(title)) return to;
  return null;
}
