/** Matches channel uploads to LeetCode problems by number or exact title. Pure: used by build.ts and its test. */
import type { LcRow } from "./rules";

export const norm = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

const NUM = [
  /leet\s*code\s*(?:problem\s*)?(?:no\.?\s*|number\s*|#\s*|-\s*|:\s*)?(\d{1,4})\b/gi,
  /\bLC\s*[-#:]?\s*(\d{1,4})\b/g,
  /\bQ(?:uestion)?\s*#?\s*(\d{3,4})\b(?=.*leet)/gi,
];

export interface LcIndex { byId: Map<number, LcRow>; byTitle: Map<string, number> }

export function lcIndex(rows: LcRow[]): LcIndex {
  const byId = new Map<number, LcRow>(), byTitle = new Map<string, number>();
  for (const r of rows) {
    const n = Number(r[0]);
    if (!Number.isFinite(n)) continue;
    byId.set(n, r);
    byTitle.set(norm(r[2]), n);
  }
  return { byId, byTitle };
}

/** LeetCode numbers a video solves. Empty when it is not a (recognisable) problem video. */
export function questionsIn(title: string, ix: LcIndex): number[] {
  const out = new Set<number>();
  for (const re of NUM) for (const m of title.matchAll(re)) out.add(Number(m[1]));
  // "Leetcode 3741 and 3740", "Leetcode 3741, 3740"
  const tail = title.match(/leet\s*code\s*#?\s*\d{1,4}((?:\s*(?:,|&|and|\/)\s*\d{1,4})+)/i);
  if (tail) for (const m of tail[1].matchAll(/\d{1,4}/g)) out.add(Number(m[0]));
  // any number whose LeetCode title also appears: "2610. Convert an Array…", "3398, 3399. Smallest Substring…", "🔴 2855. …"
  const flat = ` ${norm(title)} `;
  for (const m of title.matchAll(/(?<![\d.])(\d{1,4})(?![\d])/g)) {
    const r = ix.byId.get(Number(m[1]));
    if (!r) continue;
    const t = norm(r[2]).replace(/\s+(i{1,3}|iv)$/, "");
    if (t.length >= 8 && flat.includes(` ${t}`)) out.add(Number(m[1]));
  }
  if (!out.size) {
    // a whole segment equals a LeetCode title: "Detect Capital -(GOOGLE) : Explanation", "L-20 Decode Ways | DP", "Leetcode Problem , Task Scheduler"
    for (const raw of title.split(/\s+[|\-–—:(,]\s*|\s*[|,(]\s*/)) {
      const seg = norm(raw.replace(/^(l|g|lc)\s*-?\s*\d+\s+/i, ""));
      const n = ix.byTitle.get(seg);
      if (n !== undefined && seg.length >= 6) { out.add(n); break; }
    }
  }
  return [...out].filter((n) => ix.byId.has(n));
}
