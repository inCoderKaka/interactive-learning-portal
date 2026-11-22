"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useMediaUrl } from "@/lib/notes/media";
import type { NoteBlock } from "@/lib/notes/types";
import { Md, cn } from "@/components/ui";
import { VoicePlayer } from "./Voice";

export function NoteImage({ media, alt, className, onRemove }: { media: string; alt?: string; className?: string; onRemove?: () => void }) {
  const url = useMediaUrl(media);
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <div className={cn("group relative overflow-hidden rounded-xl border border-line bg-bg", className)}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={alt ?? "Note image"} onClick={() => setZoom(true)} className="block max-h-72 w-full cursor-zoom-in object-contain" />
        ) : <div className="h-24 animate-pulse bg-panel2" />}
        {onRemove && <button aria-label="Remove image" onClick={onRemove} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"><X size={12} /></button>}
      </div>
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {zoom && url && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(false)} className="fixed inset-0 z-[120] grid cursor-zoom-out place-items-center bg-black/85 p-6 backdrop-blur-md">
              <motion.img initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} src={url} alt={alt ?? ""} className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>, document.body)}
    </>
  );
}

/** Read-only rendering of a note's blocks. Images sit in a tidy grid after the text they follow. */
export function NoteBody({ blocks, color, className, math }: { blocks: NoteBlock[]; color: string; className?: string; math?: boolean }) {
  const groups: (NoteBlock | NoteBlock[])[] = [];
  for (const b of blocks) {
    const last = groups[groups.length - 1];
    if (b.t === "image" && Array.isArray(last)) last.push(b);
    else groups.push(b.t === "image" ? [b] : b);
  }
  return (
    <div className={cn("space-y-2.5", className)}>
      {groups.map((g, i) => Array.isArray(g)
        ? <div key={i} className={cn("grid gap-2", g.length > 1 && "grid-cols-2")}>{g.map((b) => b.t === "image" && <NoteImage key={b.id} media={b.media} alt={b.alt} />)}</div>
        : g.t === "text" ? (g.md.trim() ? <Md key={g.id} math={math} className="note-md text-[13.5px] leading-relaxed">{g.md}</Md> : null)
        : g.t === "audio" ? <VoicePlayer key={g.id} media={g.media} dur={g.dur} peaks={g.peaks} color={color} /> : null)}
    </div>
  );
}
