"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Library } from "lucide-react";
import { useNotes } from "@/lib/notes/store";
import { cn } from "@/components/ui";
import { NoteCard } from "./NoteCard";

/** An article's "Imported notes" section. Not rendered at all when the topic has none. */
export function ImportedNotes({ topicId, color }: { topicId: string; color: string }) {
  const all = useNotes((s) => s.notes);
  const focus = useNotes((s) => s.focus);
  const notes = useMemo(() => Object.values(all).filter((n) => n.kind === "imported" && !n.deleted && n.topic === topicId).sort((a, b) => a.created - b.created || (a.src?.blocks[0] ?? "").localeCompare(b.src?.blocks[0] ?? "", undefined, { numeric: true })), [all, topicId]);
  const [expandAll, setExpandAll] = useState<boolean | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!focus || !notes.some((n) => n.id === focus)) return;
    useNotes.getState().setFocus(null);
    setFlash(focus);
    setTimeout(() => document.querySelector(`[data-note="${focus}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
    setTimeout(() => setFlash(null), 2600);
  }, [focus, notes]);

  if (!notes.length) return null;
  const docs = [...new Set(notes.map((n) => n.src?.doc).filter(Boolean))];
  return (
    <section ref={ref} id="imported-notes" data-read-block data-read-text={`You have ${notes.length} imported note${notes.length > 1 ? "s" : ""} on this topic, from ${docs.join(" and ")}.`} className="card relative overflow-clip p-5 sm:p-6" style={{ borderColor: `color-mix(in srgb, ${color} 26%, var(--color-line))` }}>
      <div className="pointer-events-none absolute -left-24 -top-24 h-60 w-60 rounded-full blur-3xl" style={{ background: `color-mix(in srgb, ${color} 10%, transparent)` }} />
      <div className="relative flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <div className="eyebrow flex items-center gap-1.5" style={{ color }}><FileText size={13} />Imported notes</div>
          <div className="display text-[17px] font-semibold">{notes.length} note{notes.length > 1 ? "s" : ""} from your {docs.length > 1 ? "documents" : "document"}</div>
          <div className="mt-0.5 truncate text-[12.5px] text-faint">{docs.map((d) => `“${d}”`).join(", ")}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[12.5px]">
          <button onClick={() => setExpandAll((e) => !(e ?? notes.length <= 3))} className="h-8 rounded-lg px-2.5 text-mute hover:bg-white/5 hover:text-text">{(expandAll ?? notes.length <= 3) ? "Collapse all" : "Expand all"}</button>
          <Link href={`/notes?topic=${topicId}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-mute hover:text-text"><Library size={13} />All notes</Link>
        </div>
      </div>
      <div className="relative mt-4 space-y-2.5">
        {notes.map((n) => (
          <div key={`${n.id}:${expandAll}`} className={cn("rounded-2xl transition", flash === n.id && "ring-2 ring-offset-2 ring-offset-bg")} style={flash === n.id ? { ["--tw-ring-color" as string]: color } : undefined}>
            <NoteCard n={n} showWhere={false} collapsible defaultOpen={flash === n.id || (expandAll ?? notes.length <= 3)} />
          </div>
        ))}
      </div>
    </section>
  );
}
