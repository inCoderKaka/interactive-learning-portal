"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowUpRight, Check, ChevronDown, FileText, Globe, Image as ImageIcon, Mic, Pencil, RotateCcw, Sparkles, StickyNote, Trash2, Undo2, Wand2 } from "lucide-react";
import { AREAS, TOPICS, areaOf, topicById } from "@/content";
import { useNotes } from "@/lib/notes/store";
import { pageInfo } from "@/lib/notes/hierarchy";
import { colorHex, type NoteBlock, type PortalNote } from "@/lib/notes/types";
import { Md, cn } from "@/components/ui";
import { NoteBody } from "./NoteBody";

export const ago = (t: number) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const noteTitle = (n: PortalNote) => {
  if (n.title) return n.title;
  const t = n.blocks.find((b) => b.t === "text" && b.md.trim());
  if (t && t.t === "text") return t.md.trim().split("\n")[0].replace(/^#+\s*|[*_`>]/g, "").slice(0, 80);
  return n.blocks.some((b) => b.t === "audio") ? "Voice note" : n.blocks.some((b) => b.t === "image") ? "Image" : "Empty note";
};

export function where(n: PortalNote): { crumbs: string[]; href: string } {
  const t = n.topic ? topicById.get(n.topic) : undefined;
  if (n.kind === "imported") return { crumbs: t ? [areaOf(t.area).short, t.title, "Imported notes"] : ["General", "Unclassified"], href: t ? `/learn/${t.id}#imported-notes` : "/notes" };
  const info = pageInfo(n.page);
  return { crumbs: t ? [areaOf(t.area).short, t.title, ...(info.kind === "article" ? [] : [info.label])] : [info.label], href: n.page };
}

export function KindIcons({ n }: { n: PortalNote }) {
  const has = (t: NoteBlock["t"]) => n.blocks.some((b) => b.t === t && (t !== "text" || (b.t === "text" && b.md.trim())));
  return (
    <span className="flex items-center gap-1 text-faint">
      {n.kind === "imported" ? <FileText size={12} /> : <StickyNote size={12} />}
      {has("audio") && <Mic size={12} />}
      {has("image") && <ImageIcon size={12} />}
      {n.web && <Globe size={12} className="text-hld" />}
    </span>
  );
}

export function VerifyBadge({ v }: { v: PortalNote["verify"] }) {
  if (!v) return null;
  const c = v.state === "ok" ? { color: "var(--color-ok)", Icon: Check, label: "Verified" } : v.state === "fixed" ? { color: "var(--color-hld)", Icon: Wand2, label: "Auto-fixed" } : { color: "var(--color-warn)", Icon: AlertTriangle, label: "Flagged" };
  return <span title={v.issues.join(" · ") || c.label} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium" style={{ color: c.color, background: `color-mix(in srgb, ${c.color} 12%, transparent)` }}><c.Icon size={10} />{c.label}</span>;
}

export function WebAdditions({ web }: { web: NonNullable<PortalNote["web"]> }) {
  return (
    <div className="rounded-xl border border-hld/25 bg-hld/[0.05] p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-hld"><Sparkles size={11} />From the web</div>
      {web.md && <Md className="note-md text-[13px] leading-relaxed">{web.md}</Md>}
      {!!web.corrections?.length && (
        <ul className="mt-2 space-y-1.5">
          {web.corrections.map((c, i) => <li key={i} className="flex gap-2 text-[12.5px] leading-snug"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-warn" /><span><span className="text-mute line-through decoration-warn/60">{c.claim}</span> <span className="text-text">{c.fix}</span></span></li>)}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {web.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border border-line bg-bg/60 px-2 py-0.5 text-[11px] text-mute hover:text-text"><ArrowUpRight size={10} className="shrink-0" /><span className="truncate">{s.title}</span></a>)}
      </div>
    </div>
  );
}

function Editor({ n, onDone }: { n: PortalNote; onDone: () => void }) {
  const patch = useNotes((s) => s.patch);
  const [title, setTitle] = useState(n.title ?? "");
  const [texts, setTexts] = useState<Record<string, string>>(() => Object.fromEntries(n.blocks.filter((b) => b.t === "text").map((b) => [b.id, b.t === "text" ? b.md : ""])));
  const [topic, setTopic] = useState<string>(n.topic ?? "");
  const save = () => {
    patch(n.id, { title: n.kind === "imported" ? title.trim() || undefined : n.title, topic: n.kind === "imported" ? topic || null : n.topic, blocks: n.blocks.map((b) => (b.t === "text" ? { ...b, md: texts[b.id] ?? b.md } : b)) });
    onDone();
  };
  return (
    <div className="space-y-2">
      {n.kind === "imported" && <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Note title" className="h-9 w-full rounded-lg border border-line bg-bg px-3 text-[14px] font-medium outline-none focus:border-accent/60" />}
      {n.blocks.filter((b) => b.t === "text").map((b) => (
        <textarea key={b.id} value={texts[b.id]} onChange={(e) => setTexts((t) => ({ ...t, [b.id]: e.target.value }))} rows={Math.min(14, Math.max(3, (texts[b.id] ?? "").split("\n").length + 1))} aria-label="Note text"
          className="block w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[12.5px] leading-relaxed outline-none focus:border-accent/60" />
      ))}
      {n.kind === "imported" && (
        <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic page" className="h-9 w-full rounded-lg border border-line bg-bg px-2 text-[13px] outline-none">
          <option value="">General / unclassified</option>
          {AREAS.map((a) => <optgroup key={a.id} label={a.name}>{TOPICS.filter((t) => t.area === a.id).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</optgroup>)}
        </select>
      )}
      <div className="flex justify-end gap-2"><button onClick={onDone} className="h-8 rounded-lg px-3 text-[12.5px] text-mute hover:text-text">Cancel</button><button onClick={save} className="h-8 rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-ink">Save</button></div>
    </div>
  );
}

/** One note in the Notes tab or an article's Imported notes section. */
export function NoteCard({ n, showWhere = true, collapsible = false, defaultOpen = true }: { n: PortalNote; showWhere?: boolean; collapsible?: boolean; defaultOpen?: boolean }) {
  const router = useRouter();
  const { remove, restore, setFocus, patch } = useNotes.getState();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const color = colorHex(n.color);
  const w = where(n);
  const go = () => { setFocus(n.id); router.push(w.href); };
  return (
    <motion.article layout="position" data-note={n.id} className={cn("group relative overflow-hidden rounded-2xl border bg-panel/70 transition", n.deleted ? "border-dashed border-line opacity-70" : "border-line hover:border-[#323850]")}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
      <div className="py-3.5 pl-5 pr-4">
        <div className="flex items-start gap-3">
          <button disabled={!collapsible} onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2">
              <KindIcons n={n} />
              {showWhere && <span className="truncate text-[11px] text-faint">{w.crumbs.join(" › ")}</span>}
            </div>
            {(n.title || n.kind === "imported" || (collapsible && !open)) && <h3 className="mt-1 text-[14.5px] font-semibold leading-snug">{noteTitle(n)}</h3>}
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <VerifyBadge v={n.verify} />
            {collapsible && <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Collapse" : "Expand"} className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:text-text"><ChevronDown size={15} className={cn("transition", open && "rotate-180")} /></button>}
          </div>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-2.5 space-y-2.5">
                {editing ? <Editor n={n} onDone={() => setEditing(false)} /> : <NoteBody blocks={n.blocks} color={color} />}
                {!editing && n.web && <WebAdditions web={n.web} />}
                {!editing && n.verify?.state === "fixed" && n.verify.original && (
                  <details className="text-[12px] text-faint"><summary className="cursor-pointer hover:text-mute">What the check changed</summary><div className="mt-1.5 rounded-lg border border-line bg-bg/60 p-2.5 font-mono text-[11.5px] leading-relaxed text-mute whitespace-pre-wrap">{n.verify.original}</div>
                    <button className="mt-1.5 inline-flex items-center gap-1 text-mute hover:text-text" onClick={() => { const first = n.blocks.find((b) => b.t === "text"); if (first) patch(n.id, { blocks: n.blocks.map((b) => (b.id === first.id ? { ...b, md: n.verify!.original! } as NoteBlock : b)), verify: { ...n.verify!, state: "flagged", issues: ["Restored to the imported wording"] } }); }}><Undo2 size={11} />Restore the original wording</button>
                  </details>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
                <span>{n.kind === "imported" && n.src ? `From “${n.src.doc}”${n.src.path.length ? ` · ${n.src.path.join(" › ")}` : ""}` : `Edited ${ago(n.updated)}`}</span>
                <span className="ml-auto flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  {n.deleted ? (
                    <button onClick={() => restore(n.id)} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-mute hover:bg-white/5 hover:text-text"><RotateCcw size={12} />Restore</button>
                  ) : (<>
                    {showWhere && <button onClick={go} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-mute hover:bg-white/5 hover:text-text"><ArrowUpRight size={12} />{n.kind === "sticky" ? "Open on page" : n.topic ? "Open in article" : "Open"}</button>}
                    <button onClick={() => { setOpen(true); setEditing(true); }} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-mute hover:bg-white/5 hover:text-text"><Pencil size={12} />Edit</button>
                    <button onClick={() => remove(n.id)} aria-label="Delete note" className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-mute hover:bg-bad/10 hover:text-bad"><Trash2 size={12} /></button>
                  </>)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

export function NoteLink({ n }: { n: PortalNote }) {
  return <Link href={where(n).href} className="text-accent underline">{noteTitle(n)}</Link>;
}
