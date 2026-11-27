"use client";
import "katex/dist/katex.min.css";
import { AlertTriangle, BookOpen, Lightbulb, MousePointerClick, Newspaper, Quote, Sparkles, Target, type LucideIcon, BookA } from "lucide-react";
import Viz from "@/components/viz";
import { VideoEmbed } from "./References";
import { Md, cn } from "./ui";

/**
 * A lesson body: markdown with optional maths, plus two extensions used by the AI lessons.
 *   :::dyk Optional title        a callout (dyk, story, news, tip, warn, quote, eli5, words, try), closed by a line ":::"
 *   [[widget:attention]]          an interactive widget, inline in the reading flow
 *   [[yt:VIDEOID|Title|Channel]]  a YouTube video that plays in place
 */
type Part = { kind: "md"; body: string } | { kind: "callout"; type: string; title: string; body: string } | { kind: "widget"; id: string } | { kind: "yt"; id: string; title: string; by: string };

export function parseLesson(text: string): Part[] {
  const out: Part[] = [];
  const lines = text.split("\n");
  let buf: string[] = [];
  const flush = () => { const body = buf.join("\n").trim(); if (body) out.push({ kind: "md", body }); buf = []; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const w = /^\s*\[\[widget:([\w-]+)\]\]\s*$/.exec(line);
    if (w) { flush(); out.push({ kind: "widget", id: w[1] }); continue; }
    const y = /^\s*\[\[yt:([\w-]{11})(?:\|([^|\]]*))?(?:\|([^\]]*))?\]\]\s*$/.exec(line);
    if (y) { flush(); out.push({ kind: "yt", id: y[1], title: y[2]?.trim() || "Video", by: y[3]?.trim() || "YouTube" }); continue; }
    const c = /^:::(\w+)\s*(.*)$/.exec(line.trim());
    if (c && c[1] !== "") {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") body.push(lines[i++]);
      out.push({ kind: "callout", type: c[1], title: c[2].trim(), body: body.join("\n").trim() });
      continue;
    }
    buf.push(line);
  }
  flush();
  return out;
}

const CALLOUT: Record<string, { label: string; icon: LucideIcon; color: string; say: (t: string) => string }> = {
  dyk: { label: "Did you know?", icon: Lightbulb, color: "var(--color-warn)", say: () => "Did you know?" },
  story: { label: "Story time", icon: BookOpen, color: "var(--color-ai)", say: (t) => (t ? `Story time. ${t}.` : "Story time.") },
  news: { label: "In the news", icon: Newspaper, color: "var(--color-hld)", say: (t) => (t ? `In the news, ${t}.` : "In the news.") },
  tip: { label: "Interview tip", icon: Target, color: "var(--color-accent)", say: (t) => (t ? `Interview tip: ${t}.` : "Interview tip.") },
  warn: { label: "Gotcha", icon: AlertTriangle, color: "var(--color-bad)", say: (t) => (t ? `Watch out: ${t}.` : "Watch out.") },
  quote: { label: "Quote", icon: Quote, color: "var(--color-craft)", say: (t) => (t ? `A quote from ${t}.` : "A quote.") },
  eli5: { label: "Explain like I'm five", icon: Sparkles, color: "var(--color-craft)", say: () => "Explain like I'm five." },
  words: { label: "Words you'll meet", icon: BookA, color: "var(--color-hld)", say: () => "First, the words you'll meet on this page." },
  try: { label: "Try it", icon: MousePointerClick, color: "var(--color-dsa)", say: (t) => (t ? `Try it: ${t}.` : "Try it.") },
};

function Callout({ type, title, body, math }: { type: string; title: string; body: string; math?: boolean }) {
  const c = CALLOUT[type] ?? CALLOUT.tip;
  const Icon = c.icon;
  return (
    <aside className="relative overflow-hidden rounded-2xl border p-4 pl-5 sm:p-5 sm:pl-6"
      style={{ borderColor: `color-mix(in srgb, ${c.color} 28%, transparent)`, background: `linear-gradient(135deg, color-mix(in srgb, ${c.color} 9%, transparent), transparent 65%)` }}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: c.color }} />
      <div data-read-block data-read-text={c.say(title)} className="eyebrow flex flex-wrap items-center gap-x-1.5 gap-y-0.5" style={{ color: c.color }}>
        <Icon size={13} />{c.label}{title && <span className="font-medium normal-case tracking-normal text-mute">· {title}</span>}
      </div>
      <Md math={math} plain={type === "words"} className={cn("mt-2 text-[14.5px]", type === "quote" && "italic")}>{body}</Md>
    </aside>
  );
}

export function Lesson({ text, math, className }: { text: string; math?: boolean; className?: string }) {
  const parts = parseLesson(text);
  if (parts.length === 1 && parts[0].kind === "md") return <Md math={math} className={className}>{parts[0].body}</Md>;
  return (
    <div className="space-y-6">
      {parts.map((p, i) =>
        p.kind === "md" ? <Md key={i} math={math} className={className}>{p.body}</Md>
          : p.kind === "widget" ? <div key={i} className="-mx-1 sm:-mx-3"><Viz id={p.id} /></div>
          : p.kind === "yt" ? <figure key={i} data-read-block data-read-text={`There's a video here: ${p.title}, by ${p.by}.`} className="mx-auto max-w-2xl"><VideoEmbed r={{ kind: "video", title: p.title, by: p.by, url: `https://www.youtube.com/watch?v=${p.id}`, yt: p.id }} /></figure>
            : <Callout key={i} type={p.type} title={p.title} body={p.body} math={math} />)}
    </div>
  );
}
