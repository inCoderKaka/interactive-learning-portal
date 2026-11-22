"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, Pin, Plus } from "lucide-react";
import { useNotes } from "@/lib/notes/store";
import { anchorAt, anchorList, notesRoot, resolveAnchor } from "@/lib/notes/anchor";
import { pageInfo } from "@/lib/notes/hierarchy";
import { colorHex, uid, type Anchor, type NoteBlock, type NoteColor, type PortalNote } from "@/lib/notes/types";
import { cn } from "@/components/ui";
import { StickyNote, filesToBlocks, hasContent } from "./StickyNote";

const HIDE_KEY = "ascent:notes-hidden";
const lastColor = (): NoteColor => { try { return (localStorage.getItem("ascent:note-color") as NoteColor) || "lime"; } catch { return "lime"; } };
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest(".cm-editor, .excalidraw"));

/** Every sticky note of the current page, pinned to its content. Collapsed on every load. */
export function StickyLayer() {
  const path = usePathname();
  const init = useNotes((s) => s.init);
  const all = useNotes((s) => s.notes);
  const focus = useNotes((s) => s.focus);
  const { upsert, remove, setFocus } = useNotes.getState();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [hostW, setHostW] = useState(800);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<PortalNote | null>(null);
  const [placing, setPlacing] = useState(false);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [fileDrag, setFileDrag] = useState(false);
  const [pulse, setPulse] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const dragDepth = useRef(0);
  const disabled = path === "/login" || path === "/notes";

  useEffect(() => init(), [init]);
  useEffect(() => { try { setHidden(localStorage.getItem(HIDE_KEY) === "1"); } catch {} }, []);
  useEffect(() => { setHost(notesRoot()); setOpen(new Set()); setDraft(null); setPlacing(false); }, [path]);

  const notes = useMemo(() => {
    const list = Object.values(all).filter((n) => n.kind === "sticky" && !n.deleted && n.page === path);
    return draft && !list.some((n) => n.id === draft.id) ? [...list, draft] : list;
  }, [all, path, draft]);

  // keep pins on their paragraphs as the page reflows
  const layout = useCallback(() => {
    const root = notesRoot();
    if (!root) return;
    setHostW(root.clientWidth);
    const list = anchorList();
    const next: Record<string, { x: number; y: number }> = {};
    for (const n of notes) {
      if (!n.anchor) continue;
      const p = resolveAnchor(n.anchor, list);
      if (p) next[n.id] = { x: Math.min(Math.max(14, p.x), root.clientWidth - 14), y: Math.max(14, p.y) };
    }
    setPos((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
  }, [notes]);

  useEffect(() => {
    if (!host || disabled) return;
    let raf = 0;
    const soon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); };
    soon();
    const t = setTimeout(soon, 400); // late content (videos, widgets)
    const ro = new ResizeObserver(soon);
    ro.observe(host);
    let mt: ReturnType<typeof setTimeout> | undefined;
    const mo = new MutationObserver((recs) => {
      if (recs.every((r) => (r.target as Element).closest?.("[data-notes-layer]"))) return;
      clearTimeout(mt); mt = setTimeout(soon, 120);
    });
    mo.observe(host, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", soon);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); clearTimeout(mt); ro.disconnect(); mo.disconnect(); window.removeEventListener("resize", soon); };
  }, [host, layout, disabled]);

  // open a note sent from the Notes tab
  useEffect(() => {
    if (!focus || !notes.some((n) => n.id === focus) || !pos[focus]) return;
    const id = focus;
    setFocus(null);
    setHidden(false);
    setOpen((o) => new Set(o).add(id));
    setPulse(id);
    setTimeout(() => setPulse(null), 2400);
    const root = notesRoot();
    if (root) window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY + pos[id].y - window.innerHeight * 0.3, behavior: "smooth" });
  }, [focus, notes, pos, setFocus]);

  const create = useCallback((a: Anchor, blocks?: NoteBlock[]) => {
    const now = Date.now();
    const n: PortalNote = { id: uid(), kind: "sticky", page: path, topic: pageInfo(path).topic, blocks: [{ id: uid(), t: "text", md: "" }, ...(blocks ?? [])], color: lastColor(), anchor: { ...a, fy: Math.max(0, a.fy) }, created: now, updated: now };
    if (blocks?.length) upsert(n); else setDraft(n);
    setHidden(false);
    setOpen(new Set([n.id]));
  }, [path, upsert]);

  const save = (n: PortalNote) => {
    if (draft?.id === n.id) { if (!hasContent(n)) { setDraft(n); return; } setDraft(null); }
    upsert(n);
  };
  const toggle = (n: PortalNote, on: boolean) => {
    setOpen((o) => { const s = new Set(o); if (on) s.add(n.id); else s.delete(n.id); return s; });
    if (!on && draft?.id === n.id) setDraft(null); // closing an untouched new note discards it
  };

  // keyboard: N places a note, Esc cancels or collapses
  useEffect(() => {
    if (disabled) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPlacing(false); return; }
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target)) { e.preventDefault(); setPlacing(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [disabled]);

  // drop an image anywhere on the page, or paste one with nothing focused, to pin it as a note
  useEffect(() => {
    if (disabled) return;
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes("Files");
    const enter = (e: DragEvent) => { if (hasFiles(e) && !typing(e.target)) { dragDepth.current++; setFileDrag(true); } };
    const leave = () => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setFileDrag(false); };
    const over = (e: DragEvent) => { if (hasFiles(e) && !e.defaultPrevented && !typing(e.target)) e.preventDefault(); };
    const drop = async (e: DragEvent) => {
      dragDepth.current = 0; setFileDrag(false);
      if (e.defaultPrevented || !e.dataTransfer?.files.length || typing(e.target)) return;
      const files = [...e.dataTransfer.files].filter((f) => /^(image|audio)\//.test(f.type));
      if (!files.length) return;
      e.preventDefault();
      const a = anchorAt(e.clientX, e.clientY);
      if (a) create(a, await filesToBlocks(files));
    };
    const paste = async (e: ClipboardEvent) => {
      if (typing(e.target) || document.activeElement && document.activeElement !== document.body && typing(document.activeElement)) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      const a = anchorAt(window.innerWidth * 0.62, window.innerHeight * 0.32);
      if (a) create(a, await filesToBlocks(files));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", paste);
    return () => { window.removeEventListener("dragenter", enter); window.removeEventListener("dragleave", leave); window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); window.removeEventListener("paste", paste); };
  }, [disabled, create]);

  if (disabled) return null;
  const count = notes.filter((n) => n.id !== draft?.id).length;

  return (
    <>
      {host && !hidden && createPortal(
        <div data-notes-layer className="pointer-events-none absolute inset-0">
          {notes.map((n) => pos[n.id] && (
            <StickyNote key={n.id} note={n} x={pos[n.id].x} y={pos[n.id].y} hostW={hostW} open={open.has(n.id)} pulse={pulse === n.id}
              onToggle={(on) => toggle(n, on)} onChange={save}
              onDelete={() => { if (draft?.id === n.id) setDraft(null); else remove(n.id); toggle(n, false); }}
              onMove={(a) => (draft?.id === n.id ? setDraft({ ...n, anchor: a }) : upsert({ ...n, anchor: a, updated: Date.now() }))} />
          ))}
        </div>, host)}

      {/* add-note dock */}
      <div data-notes-layer className="fixed bottom-[88px] right-4 z-[55] flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
        <AnimatePresence>
          {count > 0 && (
            <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} onClick={() => setHidden((h) => { try { localStorage.setItem(HIDE_KEY, h ? "0" : "1"); } catch {} return !h; })}
              title={hidden ? "Show the notes on this page" : "Hide the notes on this page"}
              className="flex h-8 items-center gap-1.5 rounded-full border border-line bg-panel/90 px-3 text-[12px] text-mute shadow-lg backdrop-blur hover:text-text">
              {hidden ? <EyeOff size={13} /> : <Eye size={13} />}<span className="num">{count}</span>
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={() => setPlacing((p) => !p)} aria-pressed={placing}
          title="Pin a note anywhere on this page (N). Drop or paste an image to pin it."
          className={cn("group relative grid h-12 w-12 place-items-center rounded-2xl border shadow-[0_12px_30px_-10px_rgba(0,0,0,0.9)] backdrop-blur transition-colors", placing ? "border-accent bg-accent text-ink" : "border-line bg-panel/90 text-text hover:border-accent/50")}>
          <motion.span animate={{ rotate: placing ? 45 : 0 }} className="grid place-items-center">{placing ? <Plus size={20} /> : <Pin size={19} />}</motion.span>
          <span className="pointer-events-none absolute right-[56px] whitespace-nowrap rounded-lg border border-line bg-panel px-2.5 py-1 text-[12px] text-mute opacity-0 shadow-lg transition group-hover:opacity-100">Pin a note <kbd className="ml-1 rounded border border-line px-1 text-[10.5px]">N</kbd></span>
        </motion.button>
      </div>

      {/* placement mode */}
      <AnimatePresence>
        {placing && (
          <motion.div data-notes-layer initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[54] cursor-crosshair bg-[radial-gradient(transparent_60%,rgb(0_0_0/0.35))]"
            onMouseMove={(e) => setGhost({ x: e.clientX, y: e.clientY })} onMouseLeave={() => setGhost(null)}
            onClick={(e) => { const a = anchorAt(e.clientX, e.clientY); setPlacing(false); setGhost(null); if (a) create(a); }}>
            <div className="pointer-events-none absolute left-1/2 top-[72px] -translate-x-1/2 rounded-full border border-accent/40 bg-panel/95 px-4 py-2 text-[13px] text-text shadow-2xl">
              <Pin size={13} className="mr-1.5 inline text-accent" />Click anywhere to pin a note <span className="ml-2 text-faint">Esc to cancel</span>
            </div>
            {ghost && <span className="pointer-events-none absolute h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80" style={{ left: ghost.x, top: ghost.y, background: colorHex(lastColor()), boxShadow: `0 0 0 6px color-mix(in srgb, ${colorHex(lastColor())} 25%, transparent)` }} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* file drop hint */}
      <AnimatePresence>
        {fileDrag && (
          <motion.div data-notes-layer initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-3 z-[54] grid place-items-center rounded-3xl border-2 border-dashed border-accent/50 bg-accent/[0.04]">
            <div className="rounded-2xl border border-line bg-panel/95 px-5 py-3 text-[14px] shadow-2xl"><Pin size={14} className="mr-2 inline text-accent" />Drop to pin it as a note right here</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
