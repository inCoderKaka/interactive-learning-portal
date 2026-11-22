// Text utilities for imports: hashing, duplicate detection and coverage checks. Pure, no I/O.

const STOP = new Set("the a an and or but if then else of to in on at by for with from as is are was were be been being it its this that these those there here into over under than so such not no yes do does did can could should would will just also very more most less least you your we our they their he she his her i me my what which who whom when where why how all any each both few other some own same too only up down out off again further once about against between through during before after above below".split(" "));

/** FNV-1a, 32 bit, hex. Stable across runs, so a re-import of the same text is recognised. */
export function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Lowercase plain text: markdown syntax, links and tokens stripped. */
export function plain(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, " "))
    .replace(/\[\[b\d+\]\]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const norm = (s: string) => plain(s).replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

export function words(s: string): string[] {
  return norm(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w));
}

export function shingles(s: string, k = 3): Set<string> {
  const w = words(s);
  const out = new Set<string>();
  if (w.length < k) { if (w.length) out.add(w.join(" ")); return out; }
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(" "));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Share of the source's content words that the note also contains (0..1). */
export function containment(source: string, note: string): number {
  const src = new Set(words(source));
  if (!src.size) return 1;
  const have = new Set(words(note));
  let hit = 0;
  for (const w of src) if (have.has(w) || have.has(w.replace(/s$/, "")) || have.has(w + "s")) hit++;
  return hit / src.size;
}

export const tokensOf = (chars: number) => Math.ceil(chars / 4);
