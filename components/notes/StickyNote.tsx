"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus, Mic, Minus, StickyNote as StickyIcon, Trash2, Image as ImageIcon, GripHorizontal } from "lucide-react";
import { compressImage, putMedia } from "@/lib/notes/media";
import { NOTE_COLORS, colorHex, uid, type Anchor, type NoteBlock, type NoteColor, type PortalNote } from "@/lib/notes/types";
import { anchorAt } from "@/lib/notes/anchor";
import { Md, cn } from "@/components/ui";
import { NoteImage } from "./NoteBody";
import { VoicePlayer, VoiceRecorder } from "./Voice";

const CARD_W = 320;

export const hasContent = (n: PortalNote) => n.blocks.some((b) => b.t !== "text" || b.md.trim());

export async function filesToBlocks(files: Iterable<File>): Promise<NoteBlock[]> {
  const out: NoteBlock[] = [];
  for (const f of files) {
    if (f.type.startsWith("image/")) {
      const { blob, w, h } = await compressImage(f);
      out.push({ id: uid(), t: "image", media: await putMedia(blob), w, h, alt: f.name });
    } else if (f.type.startsWith("audio/")) {
      const dur = await new Promise<number>((ok) => { const a = new Audio(URL.createObjectURL(f)); a.onloadedmetadata = () => ok(Number.isFinite(a.duration) ? a.duration : 0); a.onerror = () => ok(0); });
      out.push({ id: uid(), t: "audio", media: await putMedia(f), dur, peaks: Array.from({ length: 56 }, (_, i) => 0.25 + 0.5 * Math.abs(Math.sin(i * 0.7))) });
    }
  }
  return out;
}

const firstLine = (n: PortalNote) => {
  const t = n.blocks.find((b) => b.t === "text" && b.md.trim());
  return t && t.t === "text" ? t.md.trim().split("\n")[0].replace(/^#+\s*|[*_`>]/g, "").slice(0, 90) : "";
};

function TextBlock({ block, editing, setEditing, onChange, color }: { block: Extract<NoteBlock, { t: "text" }>; editing: boolean; setEditing: (b: boolean) => void; onChange: (md: string) => void; color: string }) {
  const [v, setV] = useState(block.md);
  const ta = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { if (!editing) setV(block.md); }, [block.md, editing]);
  useEffect(() => {
    const el = ta.current;
    if (!editing || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);
  useEffect(() => { const el = ta.current; if (el) { el.style.height = "0px"; el.style.height = `${Math.min(320, el.scrollHeight)}px`; } }, [v, editing]);
  const commit = (x: string) => { clearTimeout(timer.current); if (x !== block.md) onChange(x); };
  if (!editing) {
    return (
      <div onClick={() => setEditing(true)} className="min-h-[44px] cursor-text rounded-lg px-1 py-0.5 transition hover:bg-white/[0.03]">
        {v.trim() ? <Md className="note-md text-[13.5px] leading-relaxed">{v}</Md> : <p className="text-[13.5px] text-faint">Write something…</p>}
      </div>
    );
  }
  return (
    <textarea ref={ta} value={v} aria-label="Note text" placeholder="Write a thought, a formula, the bug you made… Markdown works. Paste or drop images."
      onChange={(e) => { const x = e.target.value; setV(x); clearTimeout(timer.current); timer.current = setTimeout(() => onChange(x), 700); }}
      onBlur={() => { commit(v); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); commit(v); setEditing(false); } }}
      className="block w-full resize-none rounded-lg border bg-bg/70 px-2.5 py-2 text-[13.5px] leading-relaxed outline-none placeholder:text-faint"
      style={{ borderColor: `color-mix(in srgb, ${color} 35%, var(--color-line))` }} />
  );
}

export interface StickyProps {
  note: PortalNote;
  x: number;
  y: number;
  hostW: number;
  open: boolean;
  pulse: boolean;
  onToggle: (open: boolean) => void;
  onChange: (n: PortalNote) => void;
  onDelete: () => void;
  onMove: (a: Anchor) => void;
}

export function StickyNote({ note, x, y, hostW, open, pulse, onToggle, onChange, onDelete, onMove }: StickyProps) {
  const color = colorHex(note.color);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState<string | null>(() => (!hasContent(note) ? note.blocks.find((b) => b.t === "text")?.id ?? null : null));
  const [hover, setHover] = useState(false);
  const [dropOver, setDropOver] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const moved = useRef(false);

  const live = useRef(note);
  live.current = note;
  // always build on the latest note: uploads and recordings finish after later edits
  const update = (blocks: NoteBlock[] | ((b: NoteBlock[]) => NoteBlock[]), p: Partial<PortalNote> = {}) => {
    const cur = live.current;
    const next = { ...cur, ...p, blocks: typeof blocks === "function" ? blocks(cur.blocks) : blocks, updated: Date.now() };
    live.current = next;
    onChange(next);
  };
  const addBlocks = async (files: Iterable<File>) => {
    const add = await filesToBlocks(files);
    if (add.length) update((bs) => [...bs, ...add]);
  };

  // drag the pin (collapsed) or the card header (open); a short press without movement toggles
  const startDrag = (e: React.PointerEvent, toggleOnClick: boolean) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    moved.current = false;
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved.current && Math.hypot(dx, dy) < 4) return;
      moved.current = true;
      setDrag({ dx, dy });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      if (moved.current) {
        // the pin's new viewport position = where it was + the drag delta
        const host = document.querySelector("main")!.getBoundingClientRect();
        const a = anchorAt(host.left + x + (ev.clientX - sx), host.top + y + (ev.clientY - sy));
        if (a) onMove({ ...a, fy: Math.max(0, a.fy) });
      } else if (toggleOnClick) onToggle(!open);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const px = x + (drag?.dx ?? 0), py = y + (drag?.dy ?? 0);
  const w = Math.min(CARD_W, hostW - 16);
  const right = px + 22 + w <= hostW;
  const cardLeft = right ? 20 : Math.max(8 - px, -w - 12);
  const kinds = new Set(note.blocks.filter((b) => b.t !== "text" || b.md.trim()).map((b) => b.t));
  const Icon = kinds.has("audio") ? Mic : kinds.has("image") && !kinds.has("text") ? ImageIcon : StickyIcon;
  const peek = firstLine(note);

  return (
    <div className="pointer-events-none absolute" style={{ left: px, top: py, zIndex: open ? 38 : hover ? 37 : 36 }} data-note-id={note.id}>
      {/* the pin */}
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: drag ? 1.15 : 1 }} transition={{ type: "spring", stiffness: 520, damping: 26 }}
        onPointerDown={(e) => startDrag(e, true)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        aria-label={open ? "Collapse note" : `Open note${peek ? `: ${peek}` : ""}`} aria-expanded={open}
        className="pointer-events-auto absolute -left-[13px] -top-[13px] grid h-[26px] w-[26px] cursor-grab touch-none place-items-center rounded-full text-ink active:cursor-grabbing"
        style={{ background: `radial-gradient(circle at 32% 28%, color-mix(in srgb, ${color} 55%, white), ${color} 55%, color-mix(in srgb, ${color} 70%, black))`, boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 22%, transparent), 0 6px 18px -4px color-mix(in srgb, ${color} 70%, transparent)` }}>
        {pulse && <span className="absolute inset-0 animate-ping rounded-full" style={{ background: `color-mix(in srgb, ${color} 55%, transparent)` }} />}
        <Icon size={12} strokeWidth={2.4} className="relative" />
      </motion.button>

      {/* hover peek */}
      <AnimatePresence>
        {hover && !open && !drag && peek && (
          <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="absolute left-[20px] top-[-12px] w-max max-w-[240px] rounded-lg border border-line bg-panel/95 px-2.5 py-1.5 text-[12px] leading-snug text-mute shadow-xl backdrop-blur">{peek}</motion.div>
        )}
      </AnimatePresence>

      {/* the card */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: -4 }} transition={{ type: "spring", stiffness: 420, damping: 32 }}
            style={{ left: cardLeft, top: -18, width: w, transformOrigin: right ? "0 0" : "100% 0", borderColor: `color-mix(in srgb, ${color} ${dropOver ? 70 : 32}%, var(--color-line))` }}
            className="pointer-events-auto absolute overflow-hidden rounded-2xl border bg-panel/95 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            onPaste={(e) => { const fs = [...e.clipboardData.files]; if (fs.some((f) => f.type.startsWith("image/"))) { e.preventDefault(); void addBlocks(fs); } }}
            onDragOver={(e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); e.stopPropagation(); setDropOver(true); } }}
            onDragLeave={() => setDropOver(false)}
            onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); e.stopPropagation(); setDropOver(false); void addBlocks(e.dataTransfer.files); } }}>
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 20%, transparent))` }} />
            <div onPointerDown={(e) => startDrag(e, false)} className="flex cursor-grab touch-none items-center gap-2 px-3 pb-1 pt-2 active:cursor-grabbing">
              <GripHorizontal size={14} className="text-faint" />
              <span className="text-[11px] font-medium uppercase tracking-widest text-faint">Note</span>
              <span className="ml-auto text-[10.5px] text-faint">{new Date(note.updated).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={() => onToggle(false)} aria-label="Collapse note" className="grid h-6 w-6 place-items-center rounded-md text-mute hover:bg-white/5 hover:text-text"><Minus size={14} /></button>
            </div>

            <div className="max-h-[52vh] space-y-2 overflow-y-auto px-3 pb-2">
              {note.blocks.map((b) => b.t === "text"
                ? <TextBlock key={b.id} block={b} color={color} editing={editing === b.id} setEditing={(on) => setEditing(on ? b.id : null)} onChange={(md) => update((bs) => bs.map((x) => (x.id === b.id ? { ...x, md } as NoteBlock : x)))} />
                : b.t === "image"
                  ? <NoteImage key={b.id} media={b.media} alt={b.alt} onRemove={() => update((bs) => bs.filter((x) => x.id !== b.id))} />
                  : <div key={b.id} className="group relative"><VoicePlayer media={b.media} dur={b.dur} peaks={b.peaks} color={color} compact /><button onClick={() => update((bs) => bs.filter((x) => x.id !== b.id))} className="absolute -right-1 -top-1 hidden h-5 w-5 place-items-center rounded-full bg-black/80 text-[10px] text-white group-hover:grid" aria-label="Remove voice note">✕</button></div>)}
              {recording && <VoiceRecorder color={color} onCancel={() => setRecording(false)} onDone={async (blob, dur, peaks) => { setRecording(false); const media = await putMedia(blob); update((bs) => [...bs, { id: uid(), t: "audio", media, dur, peaks }]); }} />}
              {dropOver && <div className="grid h-16 place-items-center rounded-xl border border-dashed text-[12px] text-mute" style={{ borderColor: color }}>Drop to attach</div>}
            </div>

            <div className="flex items-center gap-1 border-t border-line/70 px-2.5 py-2">
              {NOTE_COLORS.map((c) => (
                <button key={c.id} aria-label={`${c.name} note`} onClick={() => { update((bs) => bs, { color: c.id as NoteColor }); try { localStorage.setItem("ascent:note-color", c.id); } catch {} }}
                  className={cn("h-4 w-4 rounded-full transition hover:scale-110", note.color === c.id && "ring-2 ring-offset-2 ring-offset-panel")} style={{ background: c.hex, ["--tw-ring-color" as string]: c.hex }} />
              ))}
              <span className="mx-1 h-4 w-px bg-line" />
              <button onClick={() => file.current?.click()} aria-label="Add image" title="Add image (or paste / drop)" className="grid h-7 w-7 place-items-center rounded-lg text-mute hover:bg-white/5 hover:text-text"><ImagePlus size={15} /></button>
              <button onClick={() => setRecording(true)} disabled={recording} aria-label="Record voice note" title="Record a voice note" className="grid h-7 w-7 place-items-center rounded-lg text-mute hover:bg-white/5 hover:text-text disabled:opacity-40"><Mic size={15} /></button>
              {!note.blocks.some((b) => b.t === "text") && <button onClick={() => { const b: NoteBlock = { id: uid(), t: "text", md: "" }; update((bs) => [b, ...bs]); setEditing(b.id); }} className="rounded-lg px-1.5 text-[11.5px] text-mute hover:text-text">+ text</button>}
              <button onClick={onDelete} aria-label="Delete note" title="Delete note" className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-faint hover:bg-bad/10 hover:text-bad"><Trash2 size={14} /></button>
              <input ref={file} type="file" accept="image/*,audio/*" multiple hidden onChange={(e) => { if (e.target.files) void addBlocks(e.target.files); e.target.value = ""; }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
