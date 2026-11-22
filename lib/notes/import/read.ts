"use client";
// Turn whatever the learner brings into markdown: .md/.txt as is, .html and rich-text pastes (Google
// Docs, Notion, Word) through a DOM walk, .docx through mammoth, .pdf through pdf.js.

export const ACCEPT = ".md,.markdown,.txt,.html,.htm,.docx,.pdf,text/markdown,text/plain,text/html,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const bold = (el: HTMLElement) => /^(b|strong)$/i.test(el.tagName) || Number(el.style?.fontWeight) >= 600 || el.style?.fontWeight === "bold";
const italic = (el: HTMLElement) => /^(i|em)$/i.test(el.tagName) || el.style?.fontStyle === "italic";
const mono = (el: HTMLElement) => /^(code|kbd|samp|tt)$/i.test(el.tagName) || /mono|courier|consolas/i.test(el.style?.fontFamily ?? "");

function inline(node: Node): string {
  if (node.nodeType === 3) return (node.textContent ?? "").replace(/\s+/g, " ");
  if (node.nodeType !== 1) return "";
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === "br") return "\n";
  if (tag === "img") { const src = el.getAttribute("src"); return src ? `\n\n![${el.getAttribute("alt") ?? ""}](${src})\n\n` : ""; }
  const inner = [...el.childNodes].map(inline).join("");
  if (!inner.trim()) return inner;
  if (tag === "a" && el.getAttribute("href") && !el.getAttribute("href")!.startsWith("#")) return `[${inner.trim()}](${el.getAttribute("href")})`;
  if (mono(el)) return "`" + inner.trim() + "`";
  let out = inner;
  const pad = (s: string, w: string) => { const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!; return m[2] ? `${m[1]}${w}${m[2]}${w}${m[3]}` : s; };
  if (bold(el)) out = pad(out, "**");
  if (italic(el)) out = pad(out, "_");
  return out;
}

function list(el: HTMLElement, depth: number): string {
  const ordered = el.tagName.toLowerCase() === "ol";
  let k = 0;
  return [...el.children].filter((c) => c.tagName.toLowerCase() === "li").map((li) => {
    const own: string[] = [], nested: string[] = [];
    for (const c of li.childNodes) {
      if (c.nodeType === 1 && /^(ul|ol)$/i.test((c as HTMLElement).tagName)) nested.push(list(c as HTMLElement, depth + 1));
      else own.push(c.nodeType === 1 && /^(p|div)$/i.test((c as HTMLElement).tagName) ? inline(c) + " " : inline(c));
    }
    k++;
    const bullet = ordered ? `${k}.` : "-";
    return `${"  ".repeat(depth)}${bullet} ${own.join("").replace(/\s+/g, " ").trim()}${nested.length ? "\n" + nested.join("\n") : ""}`;
  }).join("\n");
}

function table(el: HTMLElement): string {
  const rows = [...el.querySelectorAll("tr")].map((tr) => [...tr.children].map((td) => inline(td).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim()));
  if (!rows.length) return "";
  const w = Math.max(...rows.map((r) => r.length));
  const fill = (r: string[]) => `| ${[...r, ...Array(w - r.length).fill("")].join(" | ")} |`;
  return [fill(rows[0]), `|${" --- |".repeat(w)}`, ...rows.slice(1).map(fill)].join("\n");
}

function blocks(node: Node, out: string[]) {
  for (const c of node.childNodes) {
    if (c.nodeType === 3) { const t = c.textContent?.trim(); if (t) out.push(t); continue; }
    if (c.nodeType !== 1) continue;
    const el = c as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (/^(script|style|meta|link|title|head)$/.test(tag)) continue;
    const h = tag.match(/^h([1-6])$/);
    if (h || el.classList.contains("title")) { const t = inline(el).replace(/\*\*/g, "").trim(); if (t) out.push(`${"#".repeat(h ? Number(h[1]) : 1)} ${t}`); continue; }
    if (tag === "p") { const t = inline(el).trim(); if (t) out.push(t); continue; }
    if (tag === "ul" || tag === "ol") { out.push(list(el, 0)); continue; }
    if (tag === "pre") { out.push("```\n" + (el.textContent ?? "").replace(/\n$/, "") + "\n```"); continue; }
    if (tag === "table") { out.push(table(el)); continue; }
    if (tag === "blockquote") { const inner: string[] = []; blocks(el, inner); out.push(inner.join("\n\n").split("\n").map((l) => `> ${l}`).join("\n")); continue; }
    if (tag === "hr") { out.push("---"); continue; }
    if (tag === "img") { out.push(inline(el).trim()); continue; }
    if (/^(div|section|article|main|body|span|b|font|center|figure)$/.test(tag) && [...el.children].some((k) => /^(p|div|h[1-6]|ul|ol|table|pre|blockquote|img|figure|section)$/i.test(k.tagName))) { blocks(el, out); continue; }
    const t = inline(el).trim();
    if (t) out.push(t);
  }
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: string[] = [];
  blocks(doc.body, out);
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function docxToMarkdown(buf: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
  return htmlToMarkdown(value);
}

/** PDF text with headings guessed from font size. Scanned PDFs have no text layer and return "". */
async function pdfToMarkdown(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerPort) pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  type Line = { y: number; size: number; text: string };
  const pages: Line[][] = [];
  const sizes: number[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const lines: Line[] = [];
    for (const it of tc.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
      if (!("str" in it)) continue;
      const y = Math.round(it.transform[5]), size = Math.round(Math.hypot(it.transform[2], it.transform[3]) * 10) / 10;
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - y) <= 2) { last.text += it.str; last.size = Math.max(last.size, size); }
      else lines.push({ y, size, text: it.str });
      if (it.str.trim()) sizes.push(size);
    }
    pages.push(lines);
  }
  sizes.sort((a, b) => a - b);
  const body = sizes[Math.floor(sizes.length / 2)] ?? 10;
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) out.push(para.join(" ").replace(/\s+/g, " ").trim()); para = []; };
  for (const lines of pages) {
    let prevY: number | null = null;
    for (const l of lines) {
      const t = l.text.trim();
      if (!t) { flush(); continue; }
      const gap = prevY !== null && prevY - l.y > l.size * 1.8;
      prevY = l.y;
      if (l.size >= body * 1.45 && t.length < 120) { flush(); out.push(`# ${t}`); continue; }
      if (l.size >= body * 1.18 && t.length < 120) { flush(); out.push(`## ${t}`); continue; }
      if (/^([•●▪◦\-*]|\d+[.)])\s/.test(t)) { flush(); out.push(t.replace(/^[•●▪◦]\s*/, "- ")); continue; }
      if (gap) flush();
      para.push(t);
    }
    flush();
  }
  return out.join("\n\n");
}

export interface ReadResult { md: string; name: string; kind: "markdown" | "text" | "html" | "docx" | "pdf"; warning?: string }

export async function readFile(f: File): Promise<ReadResult> {
  const name = f.name.replace(/\.[^.]+$/, "");
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "docx") return { md: await docxToMarkdown(await f.arrayBuffer()), name, kind: "docx" };
  if (ext === "pdf" || f.type === "application/pdf") {
    const md = await pdfToMarkdown(await f.arrayBuffer());
    return { md, name, kind: "pdf", warning: md.trim() ? "PDFs carry no real headings: sections were inferred from font sizes. Check the structure before approving." : "This PDF has no text layer (it is probably scanned). Export it as DOCX or copy its text, then paste it here." };
  }
  const text = await f.text();
  if (ext === "html" || ext === "htm" || f.type === "text/html") return { md: htmlToMarkdown(text), name, kind: "html" };
  return { md: text, name, kind: ext === "txt" ? "text" : "markdown" };
}

/** Rich-text paste keeps headings and lists; plain paste falls back to the text. */
export function readPaste(dt: DataTransfer): string {
  const html = dt.getData("text/html");
  if (html && /<(h[1-6]|p|li|ul|ol|table|b|strong)\b/i.test(html)) return htmlToMarkdown(html);
  return dt.getData("text/plain");
}
