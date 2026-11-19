"use client";
// Reading order and text geometry for the article reader. Nothing here mutates the page: highlights use the
// CSS Custom Highlight API and the spotlight is an overlay, so React's DOM stays untouched.

import { texToSpeech } from "./speech";

export type BlockKind = "heading" | "prose" | "item" | "code" | "table" | "math" | "image" | "quote" | "custom";
export interface Block { el: HTMLElement; kind: BlockKind }

const MD = ".md";
const CANDIDATES = [
  "[data-read-block]",
  `${MD} p`, `${MD} h1`, `${MD} h2`, `${MD} h3`, `${MD} h4`, `${MD} li`, `${MD} pre`, `${MD} table`, `${MD} blockquote`, `${MD} img`, `${MD} .katex-display`,
].join(",");
const ATOMIC = "pre, table, blockquote, img, [data-read-block], .katex-display";

const meaningful = (el: Element) => (el.textContent ?? "").replace(/\s+/g, "").length > 0 || el.tagName === "IMG";

/** Every readable block inside a scope, in reading order. */
export function collectBlocks(root: Element): Block[] {
  const out: Block[] = [];
  const taken: Element[] = [];
  for (const node of Array.from(root.querySelectorAll<HTMLElement>(CANDIDATES))) {
    if (node.closest("[data-read-skip]")) continue;
    if (!meaningful(node)) continue;
    // a block inside an atomic block (code, table, widget) is read by that block; list items may nest
    const inside = taken.find((t) => t !== node && t.contains(node));
    if (inside && !(node.tagName === "LI" && inside.tagName === "LI") && !(node.matches("[data-read-block]") && !inside.matches(ATOMIC))) continue;
    if (node.tagName === "P" && node.closest("li") && root.contains(node.closest("li"))) continue; // loose lists: the li reads it
    out.push({ el: node, kind: kindOf(node) });
    taken.push(node);
  }
  return out;
}

function kindOf(el: HTMLElement): BlockKind {
  if (el.matches("[data-read-block]")) return el.dataset.readKind === "heading" ? "heading" : "custom";
  const tag = el.tagName;
  if (/^H[1-4]$/.test(tag)) return "heading";
  if (tag === "LI") return "item";
  if (tag === "PRE") return "code";
  if (tag === "TABLE") return "table";
  if (tag === "BLOCKQUOTE") return "quote";
  if (tag === "IMG") return "image";
  if (el.classList.contains("katex-display")) return "math";
  if (tag === "P") {
    const kids = Array.from(el.childNodes).filter((n) => n.nodeType !== 3 || (n.textContent ?? "").trim());
    if (kids.length === 1 && (kids[0] as Element).classList?.contains("katex-display")) return "math";
  }
  return "prose";
}

// ---------- text maps: page text with formulas as atoms, aligned to DOM nodes ----------

const BLOCK_TAGS = new Set(["LI", "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "TR", "UL", "OL", "SECTION", "BLOCKQUOTE", "PRE", "HEADER", "FOOTER", "ASIDE", "DT", "DD"]);

type Piece = { node: Text; s: number; e: number } | { atom: Element; s: number; e: number; spoken: string };
export interface TextMap { text: string; pieces: Piece[]; atoms: Record<string, string> }

/** The readable text of an element, skipping nested lists (read as their own items), buttons and hidden parts. */
export function textMap(el: Element): TextMap {
  const pieces: Piece[] = [];
  const atoms: Record<string, string> = {};
  let text = "";
  const walk = (n: Node) => {
    if (n.nodeType === 3) {
      const t = n.textContent ?? "";
      if (t) { pieces.push({ node: n as Text, s: text.length, e: text.length + t.length }); text += t; }
      return;
    }
    if (n.nodeType !== 1) return;
    const e = n as Element;
    if (e !== el && (e.matches("ul, ol") && el.tagName === "LI")) return;
    if (e.matches("[data-read-skip], button, svg, script, style, [aria-hidden='true']")) return;
    if (e.classList.contains("katex")) {
      const tex = e.querySelector("annotation")?.textContent ?? e.textContent ?? "";
      const key = `⟦${Object.keys(atoms).length}⟧`;
      atoms[key] = texToSpeech(tex) || "a formula";
      pieces.push({ atom: e, s: text.length, e: text.length + key.length, spoken: atoms[key] });
      text += key;
      return;
    }
    if (e.tagName === "BR") { text += " "; return; }
    // block-level children (list items, paragraphs, divs) end a sentence even without a full stop
    const block = e !== el && BLOCK_TAGS.has(e.tagName);
    if (block && text && !/\s$/.test(text)) text += "\n";
    for (const c of Array.from(e.childNodes)) walk(c);
    if (block && text && !/\s$/.test(text)) text += "\n";
  };
  walk(el);
  return { text, pieces, atoms };
}

/** A DOM range for a span of a text map. */
export function rangeOf(map: TextMap, s: number, e: number): Range | null {
  if (e <= s || !map.pieces.length) return null;
  const r = document.createRange();
  const startP = map.pieces.find((p) => p.e > s) ?? map.pieces[0];
  const endP = [...map.pieces].reverse().find((p) => p.s < e) ?? map.pieces.at(-1)!;
  try {
    if ("node" in startP) r.setStart(startP.node, Math.max(0, Math.min(startP.node.length, s - startP.s)));
    else r.setStartBefore(startP.atom);
    if ("node" in endP) r.setEnd(endP.node, Math.max(0, Math.min(endP.node.length, e - endP.s)));
    else r.setEndAfter(endP.atom);
  } catch {
    return null;
  }
  return r;
}

/** Range covering lines [from, to] (1-based) of a code block. */
export function lineRange(pre: Element, from: number, to: number): Range | null {
  const map = textMap(pre);
  const lines = map.text.split("\n");
  let s = 0;
  for (let k = 0; k < from - 1 && k < lines.length; k++) s += lines[k].length + 1;
  let e = s;
  for (let k = from - 1; k < to && k < lines.length; k++) e += lines[k].length + 1;
  return rangeOf(map, s, Math.max(s + 1, e - 1));
}

/** Header cells and body rows of a table element. */
export function tableData(table: Element): { headers: string[]; rows: string[][]; rowEls: Element[] } {
  const clean = (c: Element) => (c.textContent ?? "").replace(/\s+/g, " ").trim();
  const headRow = table.querySelector("thead tr") ?? (table.querySelector("tr th") ? table.querySelector("tr") : null);
  const headers = headRow ? Array.from(headRow.children).map(clean) : [];
  const rowEls = Array.from(table.querySelectorAll("tr")).filter((tr) => tr !== headRow);
  return { headers, rows: rowEls.map((tr) => Array.from(tr.children).map(clean)), rowEls };
}

/** Words on the page for a listening-time estimate. */
export function wordCount(blocks: Block[]): number {
  return blocks.reduce((n, b) => n + ((b.el.textContent ?? "").match(/\S+/g)?.length ?? 0), 0);
}

// ---------- highlights ----------

type HighlightRegistry = { set(name: string, h: unknown): void; delete(name: string): void };
const registry = (): HighlightRegistry | null => (typeof CSS !== "undefined" && "highlights" in CSS ? (CSS as unknown as { highlights: HighlightRegistry }).highlights : null);
const HighlightCtor = (): (new (...r: Range[]) => unknown) | null => (typeof window !== "undefined" && "Highlight" in window ? (window as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight : null);

export function highlight(name: "read-sentence" | "read-word", range: Range | null) {
  const reg = registry(), H = HighlightCtor();
  if (!reg || !H) return;
  if (range) reg.set(name, new H(range));
  else reg.delete(name);
}
export function clearHighlights() {
  highlight("read-sentence", null);
  highlight("read-word", null);
}

/** Bounding box of a spotlight target. */
export function rectOf(t: Element | Range | null | undefined): DOMRect | null {
  if (!t) return null;
  if (t instanceof Range) return t.getBoundingClientRect();
  return (t as Element).isConnected ? t.getBoundingClientRect() : null;
}
