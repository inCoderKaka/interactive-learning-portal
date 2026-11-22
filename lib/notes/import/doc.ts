// Step 1 of an import, "Read the document structure": a deterministic parse of markdown into
// numbered blocks and heading-delimited sections. Every later step refers to these block ids, and
// the coverage check accounts for each one, so nothing in the document can silently go missing.

import { fnv, plain } from "./text.ts";

export type BlockKind = "heading" | "para" | "list" | "code" | "table" | "image" | "quote" | "rule";

export interface DocBlock {
  id: string;        // "b12"
  kind: BlockKind;
  md: string;        // the block as markdown, verbatim
  text: string;      // plain text, for matching
  level?: number;    // headings
  lang?: string;     // code
  src?: string;      // images: URL or data URI
  alt?: string;
}

export interface DocSection {
  id: string;        // "s3"
  title: string;
  path: string[];    // heading trail, outermost first
  level: number;
  blocks: string[];  // content block ids (headings excluded)
  chars: number;
  hash: string;
}

export interface ParsedDoc {
  name: string;
  blocks: Record<string, DocBlock>;
  order: string[];
  sections: DocSection[];
  chars: number;
  images: number;
  weak: boolean;     // no usable headings: sections were cut by size
}

/** Blocks the coverage ledger must account for. Headings and rules are structure, not content. */
export const isContent = (b: DocBlock) => b.kind !== "heading" && b.kind !== "rule" && (b.kind === "image" || b.kind === "code" || b.text.replace(/[^\p{L}\p{N}]/gu, "").length >= 2);

const MAX_SECTION = 6000;   // chars; bigger sections are split on block boundaries
const WEAK_CHUNK = 2400;

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+/;

export function parseMarkdown(md: string, name = "Document"): ParsedDoc {
  const src = md.replace(/\r\n?/g, "\n").replace(/ /g, " ");
  // Google Docs exports reference-style images: ![][image1] … [image1]: <data:image/png;base64,…>
  const refs = new Map<string, string>();
  const body = src.replace(/^\[([^\]]+)\]:\s*<?(\S+?)>?\s*$/gm, (_, k: string, v: string) => { refs.set(k.toLowerCase(), v); return ""; });
  const lines = body.split("\n");
  const blocks: Record<string, DocBlock> = {};
  const order: string[] = [];
  let n = 0;
  const push = (b: Omit<DocBlock, "id">) => {
    const id = `b${++n}`;
    blocks[id] = { ...b, id };
    order.push(id);
  };
  const unescape = (s: string) => s.replace(/\\([_*[\]<>#\-+=!|~`.(){}&])/g, "$1");

  let i = 0;
  let lastHeading = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = line.match(/^\s*(```|~~~)\s*([\w+#-]*)/);
    if (fence) {
      const buf = [line];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) buf.push(lines[i++]);
      if (i < lines.length) buf.push(lines[i++]);
      const code = buf.slice(1, -1).join("\n");
      push({ kind: "code", md: buf.join("\n"), text: code, lang: fence[2] || undefined });
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (h) {
      const t = unescape(h[2]).replace(/\*\*|__/g, "").trim();
      lastHeading = h[1].length;
      push({ kind: "heading", md: line, text: t, level: h[1].length });
      i++;
      continue;
    }
    // a short line that is entirely bold reads as a heading in many exported docs
    const pseudo = line.match(/^\s*(?:\*\*|__)([^*_]{2,80})(?:\*\*|__)\s*:?\s*$/);
    if (pseudo && (i + 1 >= lines.length || !lines[i + 1].trim() || !LIST_RE.test(lines[i + 1]))) {
      const level = Math.min(6, Math.max(2, lastHeading + 1));
      push({ kind: "heading", md: line, text: unescape(pseudo[1]).trim(), level });
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { push({ kind: "rule", md: line, text: "" }); i++; continue; }

    const img = line.match(/^\s*!\[([^\]]*)\](?:\(([^)\s]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\])\s*$/);
    if (img) {
      const url = img[2] ?? refs.get((img[3] ?? "").toLowerCase());
      if (url) push({ kind: "image", md: line, text: img[1], src: url, alt: img[1] || undefined });
      i++;
      continue;
    }

    if (/^\s*\|/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) buf.push(lines[i++]);
      push({ kind: "table", md: buf.join("\n"), text: plain(buf.filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).join(" ")) });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++]);
      push({ kind: "quote", md: buf.join("\n"), text: plain(buf.join(" ").replace(/^\s*>\s?/gm, "")) });
      continue;
    }

    const li = line.match(LIST_RE);
    if (li) {
      // one block per top-level item, nested items and continuation lines included
      const indent = li[1].length;
      const buf = [line];
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          const nxt = lines[i + 1];
          if (nxt !== undefined && /^\s+\S/.test(nxt) && (nxt.match(/^\s*/)![0].length > indent)) { buf.push(l); i++; continue; }
          break;
        }
        const m = l.match(LIST_RE);
        if (m && m[1].length <= indent) break;
        if (!m && !/^\s/.test(l)) break;
        buf.push(l);
        i++;
      }
      push({ kind: "list", md: unescape(buf.join("\n")), text: plain(unescape(buf.join(" "))) });
      continue;
    }

    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*(```|~~~)|\s*\||\s*>)/.test(lines[i]) && !LIST_RE.test(lines[i]) && !/^\s*!\[/.test(lines[i])) buf.push(lines[i++]);
    if (!buf.length) { buf.push(lines[i++]); }
    const text = unescape(buf.join("\n"));
    // inline images inside a paragraph are pulled out as their own blocks so they are kept too
    const inline = [...text.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)|!\[([^\]]*)\]\[([^\]]+)\]/g)];
    const rest = text.replace(/!\[[^\]]*\](?:\([^)\s]+\)|\[[^\]]+\])/g, "").trim();
    if (rest) push({ kind: "para", md: rest, text: plain(rest) });
    for (const m of inline) {
      const url = m[2] ?? refs.get((m[4] ?? "").toLowerCase());
      if (url) push({ kind: "image", md: m[0], text: m[1] ?? m[3] ?? "", src: url, alt: (m[1] ?? m[3]) || undefined });
    }
  }

  return { name, blocks, order, ...sectionize(blocks, order, name) };
}

function sectionize(blocks: Record<string, DocBlock>, order: string[], name: string) {
  const sections: (DocSection & { base: string; part: number })[] = [];
  const trail: { level: number; title: string }[] = [];
  const hasHeadings = order.some((id) => blocks[id].kind === "heading");
  const limit = hasHeadings ? MAX_SECTION : WEAK_CHUNK;
  let cur: (DocSection & { base: string; part: number }) | null = null;
  let k = 0;
  const open = (title: string, level: number, part = 1) => {
    const s = { id: `s${++k}`, title: part > 1 ? `${title} (part ${part})` : title, base: title, part, path: trail.map((t) => t.title), level, blocks: [] as string[], chars: 0, hash: "" };
    sections.push(s);
    return s;
  };
  for (const id of order) {
    const b = blocks[id];
    if (b.kind === "heading") {
      const level = b.level ?? 1;
      while (trail.length && trail[trail.length - 1].level >= level) trail.pop();
      trail.push({ level, title: b.text });
      cur = open(b.text, level);
      continue;
    }
    if (!isContent(b)) continue;
    if (!cur) cur = open(hasHeadings ? "Introduction" : name, 1);
    if (cur.chars + b.md.length > limit && cur.blocks.length) cur = open(cur.base, cur.level, cur.part + 1);
    cur.blocks.push(id);
    cur.chars += b.md.length;
  }
  const kept: DocSection[] = sections.filter((s) => s.blocks.length).map((s) => ({ id: s.id, title: s.title, path: s.path.length ? s.path : [s.title], level: s.level, blocks: s.blocks, chars: s.chars, hash: "" }));
  for (const s of kept) s.hash = fnv(s.blocks.map((id) => plain(blocks[id].md)).join("\n"));
  return {
    sections: kept,
    chars: order.reduce((a, id) => a + blocks[id].md.length, 0),
    images: order.filter((id) => blocks[id].kind === "image").length,
    weak: !hasHeadings,
  };
}

/** Content blocks of the whole document. */
export const contentIds = (d: ParsedDoc) => d.sections.flatMap((s) => s.blocks);
