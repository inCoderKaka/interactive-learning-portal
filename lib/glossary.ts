/** Glossary matching (no React): the rehype plugin that marks terms, and lookup. See components/Glossary.tsx. */
import { GLOSSARY, type Gloss } from "@/content/glossary";
import type { Area } from "@/lib/types";

type Index = { re: RegExp; byKey: Map<string, Gloss> };
const cache = new Map<string, Index>();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const keyOf = (s: string) => s.toLowerCase().replace(/[’']/g, "'");

function indexFor(area?: Area): Index {
  const k = area ?? "-";
  if (cache.has(k)) return cache.get(k)!;
  const byKey = new Map<string, Gloss>();
  // an area's own definition wins over a global one with the same spelling
  for (const g of GLOSSARY) if (!g.area || g.area === area) for (const form of [g.t, ...(g.alt ?? [])]) {
    const kk = keyOf(form);
    if (!byKey.has(kk) || g.area) byKey.set(kk, g);
  }
  const forms = [...byKey.keys()].sort((a, b) => b.length - a.length);
  // \b fails next to symbols ("p99", "L4"), so look around for letters and digits instead; optional plural
  const re = new RegExp(`(?<![\\p{L}\\p{N}_-])(${forms.map(esc).join("|")})(?:s|es)?(?![\\p{L}\\p{N}_])`, "giu");
  const idx = { re, byKey };
  cache.set(k, idx);
  return idx;
}

type HNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HNode[] };
const SKIP = new Set(["code", "pre", "a", "dfn", "h1", "h2", "h3", "h4", "h5", "h6", "th", "button", "script", "style", "math", "svg"]);

/** A rehype plugin, made per area. Each term is marked once per block. */
export function rehypeGlossary(area?: Area) {
  const { re, byKey } = indexFor(area);
  return () => (tree: HNode) => {
    const seen = new Set<string>();
    const walk = (node: HNode) => {
      if (!node.children) return;
      const out: HNode[] = [];
      for (const c of node.children) {
        if (c.type === "element") {
          const cls = String((c.properties?.className as string[] | undefined)?.join(" ") ?? "");
          if (!SKIP.has(c.tagName ?? "") && !cls.includes("katex")) walk(c);
          out.push(c);
          continue;
        }
        if (c.type !== "text" || !c.value) { out.push(c); continue; }
        const text = c.value;
        let last = 0, m: RegExpExecArray | null;
        re.lastIndex = 0;
        while ((m = re.exec(text))) {
          const g = byKey.get(keyOf(m[1]));
          // acronyms must match their case ("CAP", not "cap"); words may differ in case
          if (!g || seen.has(g.t) || (/^[A-Z0-9/.-]{2,}$/.test(g.t) && m[1] !== g.t && !g.alt?.includes(m[1]))) continue;
          seen.add(g.t);
          if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
          out.push({ type: "element", tagName: "dfn", properties: { dataK: g.t }, children: [{ type: "text", value: m[0] }] });
          last = m.index + m[0].length;
        }
        if (last === 0) out.push(c);
        else if (last < text.length) out.push({ type: "text", value: text.slice(last) });
      }
      node.children = out;
    };
    walk(tree);
  };
}

export const glossOf = (t: string, area?: Area) => indexFor(area).byKey.get(keyOf(t));

