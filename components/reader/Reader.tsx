"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Crosshair, Headphones, Loader2, Pause, Play, Redo2, Settings2, SkipBack, SkipForward, Sparkles, Undo2, Volume2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { aiReady } from "@/lib/ai";
import { getKeys } from "@/lib/interview/providers/keys";
import { rectOf } from "@/lib/reader/dom";
import { listenMinutes } from "@/lib/reader/speech";
import { OPENAI_VOICES, hasSpeech, listVoices, voiceScore } from "@/lib/reader/voice";
import { initPrefs, jumpBlock, nextStep, pageStats, pause, prevStep, preview, recenter, resume, setPrefs, skipWait, start, stop, toggle, useReader, type Prefs } from "@/lib/reader/narrator";
import { cn } from "@/components/ui";

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const active = (s: string) => s !== "idle";

// ---------- the scope: marks an article as readable and offers "read from here" ----------

const BLOCK_SEL = "[data-read-block], .md p, .md h1, .md h2, .md h3, .md h4, .md li, .md pre, .md table, .md blockquote, .md .katex-display";

/** Wrap an article so the reader can read it. Hovering a block (or selecting text) offers "Read from here". */
export function ReadScope({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ el: Element; top: number; left: number; touch: boolean } | null>(null);
  const [sel, setSel] = useState<{ el: Element; offset: number; top: number; left: number } | null>(null);
  const status = useReader((s) => s.status);

  const blockAt = (t: EventTarget | null): Element | null => {
    const el = (t as Element | null)?.closest?.(BLOCK_SEL);
    if (!el || !ref.current?.contains(el) || el.closest("[data-read-skip]")) return null;
    // inside a widget or code block, offer the whole block
    return el.parentElement?.closest("[data-read-block], pre, table") ?? el;
  };
  const place = (el: Element, touch: boolean) => {
    const box = ref.current!.getBoundingClientRect(), r = el.getBoundingClientRect();
    setHover({ el, top: r.top - box.top, left: r.left - box.left, touch });
  };

  useEffect(() => {
    const onSel = () => {
      const s = window.getSelection();
      if (!s || s.isCollapsed || !s.rangeCount || !ref.current) { setSel(null); return; }
      const r = s.getRangeAt(0);
      const host = r.startContainer.nodeType === 3 ? r.startContainer.parentElement : (r.startContainer as Element);
      const el = blockAt(host);
      if (!el) { setSel(null); return; }
      // offset of the selection start within the block's text, to start at that sentence
      const pre = document.createRange();
      pre.selectNodeContents(el);
      pre.setEnd(r.startContainer, r.startOffset);
      const box = ref.current.getBoundingClientRect(), rr = r.getBoundingClientRect();
      setSel({ el, offset: pre.toString().length, top: rr.top - box.top - 40, left: Math.max(0, rr.left - box.left + rr.width / 2 - 70) });
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  useEffect(() => {
    if (!hover?.touch) return;
    const t = setTimeout(() => setHover(null), 4000);
    return () => clearTimeout(t);
  }, [hover]);

  const go = (el: Element, offset?: number) => { setHover(null); setSel(null); window.getSelection()?.removeAllRanges(); start(el, offset); };

  return (
    <div ref={ref} data-read-scope className={cn("relative", className)}
      onPointerMove={(e) => { if (e.pointerType !== "mouse") return; const el = blockAt(e.target); if (!el) return; if (el !== hover?.el) place(el, false); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(null); }}
      onPointerUp={(e) => { if (e.pointerType === "mouse") return; const el = blockAt(e.target); if (el) place(el, true); }}>
      {children}
      <AnimatePresence>
        {hover && !sel && (
          <motion.button key="gutter" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.14 }}
            onClick={() => go(hover.el)} aria-label="Read aloud from here" title="Read aloud from here"
            className={cn("group absolute z-20 flex items-center gap-1.5 rounded-full border border-accent/40 bg-panel/95 text-accent shadow-[0_0_24px_-8px_var(--color-accent)] backdrop-blur transition hover:bg-accent hover:text-ink",
              hover.touch ? "h-7 px-2.5 text-[11.5px] font-semibold" : "h-7 w-7 justify-center")}
            style={hover.touch ? { top: Math.max(0, hover.top - 34), left: Math.max(0, hover.left) } : { top: hover.top + 1, left: Math.max(-36, hover.left - 38) }}>
            <Play size={12} fill="currentColor" className="translate-x-px" />{hover.touch && "Read from here"}
            {!hover.touch && <span className="pointer-events-none absolute left-9 whitespace-nowrap rounded-lg border border-line bg-panel px-2 py-1 text-[11px] font-medium text-text opacity-0 shadow-lg transition group-hover:opacity-100">Read from here</span>}
          </motion.button>
        )}
        {sel && (
          <motion.button key="sel" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.preventDefault()} onClick={() => go(sel.el, sel.offset)}
            className="absolute z-30 flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-[12.5px] font-semibold text-ink shadow-[0_8px_30px_-8px_var(--color-accent)]" style={{ top: Math.max(0, sel.top), left: sel.left }}>
            <Headphones size={14} />Read from here
          </motion.button>
        )}
      </AnimatePresence>
      {active(status) && <span className="sr-only" aria-live="polite">{status === "paused" ? "Reading paused" : ""}</span>}
    </div>
  );
}

/** "Listen · 12 min" for the page header; becomes pause / resume while reading. */
export function ListenButton({ className }: { className?: string }) {
  const status = useReader((s) => s.status);
  const rate = useReader((s) => s.prefs.rate);
  const [words, setWords] = useState(0);
  const pathname = usePathname();
  useEffect(() => {
    initPrefs();
    const t = setTimeout(() => setWords(pageStats(document.querySelector("[data-read-scope]")).words), 600);
    return () => clearTimeout(t);
  }, [pathname]);
  if (!hasSpeech() && !getKeys().openai) return null;
  const reading = status === "playing" || status === "loading" || status === "waiting";
  return (
    <button onClick={() => (status === "idle" || status === "done" ? start() : toggle())} aria-label={reading ? "Pause reading" : "Listen to this lesson"}
      className={cn("group inline-flex h-8 items-center gap-2 rounded-full border pl-2.5 pr-3 text-[12.5px] font-medium transition", reading ? "border-accent/50 bg-accent/10 text-accent" : "border-line bg-panel2 text-mute hover:border-accent/40 hover:text-text", className)}>
      {reading ? <Equalizer on /> : status === "paused" ? <Play size={13} fill="currentColor" /> : <Headphones size={14} className="transition group-hover:text-accent" />}
      {reading ? "Pause" : status === "paused" ? "Resume" : "Listen"}
      {!active(status) && words > 0 && <span className="num text-faint">· {listenMinutes(words, rate)} min</span>}
    </button>
  );
}

function Equalizer({ on }: { on: boolean }) {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => <span key={i} className={cn("w-[2.5px] rounded-full bg-current", on ? "animate-eq" : "h-1")} style={on ? { animationDelay: `${i * 0.13}s` } : undefined} />)}
    </span>
  );
}

// ---------- spotlight ----------

function Spotlight() {
  const focus = useReader((s) => s.focus);
  const status = useReader((s) => s.status);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focus || !active(status) || status === "done") { if (box.current) box.current.style.opacity = "0"; return; }
    let raf = 0;
    const tick = () => {
      const r = rectOf(focus);
      const el = box.current;
      if (el) {
        if (!r || (r.width === 0 && r.height === 0)) el.style.opacity = "0";
        else {
          const pad = focus instanceof Range ? 5 : 9;
          el.style.opacity = "1";
          el.style.transform = `translate(${r.left - pad}px, ${r.top - pad}px)`;
          el.style.width = `${r.width + pad * 2}px`;
          el.style.height = `${r.height + pad * 2}px`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [focus, status]);
  return <div ref={box} aria-hidden className="reader-spotlight pointer-events-none fixed left-0 top-0 z-30 opacity-0" />;
}

// ---------- the player ----------

function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-3 py-1.5", disabled && "cursor-not-allowed opacity-50")}>
      <span className="min-w-0"><span className="block text-[13px] text-text">{label}</span>{hint && <span className="block text-[11.5px] leading-snug text-faint">{hint}</span>}</span>
      <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition", on ? "border-accent/60 bg-accent/80" : "border-line bg-panel2")}>
        <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all", on ? "left-[18px] bg-ink" : "left-0.5 bg-mute")} />
      </button>
    </label>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const prefs = useReader((s) => s.prefs);
  const settings = useStore((s) => s.settings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const canAi = aiReady(settings);
  const hasOpenAi = !!getKeys().openai;
  useEffect(() => {
    if (!hasSpeech()) return;
    const load = () => setVoices(listVoices());
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  const groups = useMemo(() => {
    const best = voices.filter((v) => voiceScore(v) >= 6), en = voices.filter((v) => voiceScore(v) < 6 && v.lang.startsWith("en")), other = voices.filter((v) => !v.lang.startsWith("en"));
    return [["Most natural", best], ["English", en], ["Other languages", other]] as const;
  }, [voices]);
  const p = (x: Partial<Prefs>) => setPrefs(x);
  const field = "h-9 w-full rounded-xl border border-line bg-bg px-2.5 text-[13px] outline-none focus:border-accent/50";
  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.16 }}
      className="card absolute bottom-full right-0 mb-2 max-h-[min(70vh,560px)] w-[min(360px,calc(100vw-24px))] overflow-y-auto p-4 shadow-2xl" role="dialog" aria-label="Reader settings">
      <div className="mb-3 flex items-center justify-between"><div className="eyebrow">Reader</div><button onClick={onClose} aria-label="Close settings" className="text-faint hover:text-text"><X size={15} /></button></div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-bg p-1 text-[12.5px]">
          <button onClick={() => p({ engine: "browser" })} className={cn("rounded-lg py-1.5 font-medium transition", prefs.engine === "browser" ? "bg-panel2 text-text" : "text-mute hover:text-text")}>Browser voices</button>
          <button onClick={() => hasOpenAi && p({ engine: "openai" })} disabled={!hasOpenAi} title={hasOpenAi ? "" : "Add an OpenAI key in Settings"} className={cn("rounded-lg py-1.5 font-medium transition disabled:opacity-40", prefs.engine === "openai" ? "bg-panel2 text-text" : "text-mute hover:text-text")}>Natural (OpenAI)</button>
        </div>
        <div className="flex gap-2">
          {prefs.engine === "browser" ? (
            <select className={field} value={prefs.voice} onChange={(e) => p({ voice: e.target.value })} aria-label="Voice">
              <option value="">Best available</option>
              {groups.map(([name, list]) => list.length > 0 && <optgroup key={name} label={name}>{list.map((v) => <option key={v.name + v.lang} value={v.name}>{v.name.replace(/^Microsoft |^Google /, "")} · {v.lang}{v.localService ? "" : " · online"}</option>)}</optgroup>)}
            </select>
          ) : (
            <select className={field} value={prefs.openaiVoice} onChange={(e) => p({ openaiVoice: e.target.value })} aria-label="OpenAI voice">
              {OPENAI_VOICES.map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}
            </select>
          )}
          <button onClick={preview} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-panel2 text-mute hover:text-accent" aria-label="Preview voice" title="Preview voice"><Volume2 size={15} /></button>
        </div>
        {prefs.engine === "openai" && <p className="text-[11.5px] leading-snug text-faint">Uses your OpenAI key from this browser (about $0.015 per minute of speech). Words are highlighted by timing.</p>}

        <div>
          <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-mute">Speed</span><span className="num font-semibold">{prefs.rate.toFixed(2)}×</span></div>
          <input type="range" min={0.5} max={2.5} step={0.05} value={prefs.rate} onChange={(e) => p({ rate: +e.target.value })} className="w-full" aria-label="Speed" />
          <div className="mt-1.5 flex gap-1">{SPEEDS.map((s) => <button key={s} onClick={() => p({ rate: s })} className={cn("num flex-1 rounded-lg border py-1 text-[11.5px] transition", Math.abs(prefs.rate - s) < 0.01 ? "border-accent/50 bg-accent/10 text-accent" : "border-line text-mute hover:text-text")}>{s}×</button>)}</div>
        </div>
        {prefs.engine === "browser" && (
          <div>
            <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-mute">Pitch</span><span className="num font-semibold">{prefs.pitch.toFixed(2)}</span></div>
            <input type="range" min={0.6} max={1.4} step={0.05} value={prefs.pitch} onChange={(e) => p({ pitch: +e.target.value })} className="w-full" aria-label="Pitch" />
          </div>
        )}

        <div className="divide-y divide-line border-t border-line pt-1">
          <Toggle on={prefs.explain && canAi} disabled={!canAi} onChange={(v) => p({ explain: v })} label="Explain code, tables and formulas with AI" hint={canAi ? "Your AI provider talks them through like a person would; cached on this device." : "Add an AI key in Settings to turn this on. Without it, code and tables are read by rules."} />
          <Toggle on={prefs.interact} onChange={(v) => p({ interact: v })} label="Do the interactions" hint="Step through visualisers, move sliders, reveal code, flip flashcards." />
          <Toggle on={prefs.quiz === "wait"} onChange={(v) => p({ quiz: v ? "wait" : "tell" })} label="Wait for my quiz answers" hint="Off: the reader says the answer and why." />
          <Toggle on={prefs.follow} onChange={(v) => p({ follow: v })} label="Follow along" hint="Scroll with the reading position." />
          <Toggle on={prefs.words} onChange={(v) => p({ words: v })} label="Highlight each word" />
        </div>
        <p className="text-[11px] text-faint">Shortcuts: <kbd className="rounded border border-line px-1">Alt</kbd>+<kbd className="rounded border border-line px-1">P</kbd> play or pause · <kbd className="rounded border border-line px-1">Alt</kbd>+<kbd className="rounded border border-line px-1">←</kbd>/<kbd className="rounded border border-line px-1">→</kbd> section · <kbd className="rounded border border-line px-1">Alt</kbd>+<kbd className="rounded border border-line px-1">↓</kbd> skip sentence</p>
      </div>
    </motion.div>
  );
}

function Player() {
  const st = useReader();
  const [open, setOpen] = useState(false);
  const next = useNextTopic();
  const playing = st.status === "playing" || st.status === "loading";
  const pct = st.total ? (st.block + (st.status === "done" ? 1 : 0.4)) / st.total : 0;
  const cycleSpeed = () => { const i = SPEEDS.findIndex((s) => Math.abs(s - st.prefs.rate) < 0.01); setPrefs({ rate: SPEEDS[(i + 1) % SPEEDS.length] }); };
  const btn = "grid h-9 w-9 place-items-center rounded-xl text-mute transition hover:bg-white/[0.06] hover:text-text disabled:opacity-30";
  return (
    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="fixed inset-x-3 bottom-[74px] z-[60] mx-auto max-w-[640px] lg:bottom-6" role="region" aria-label="Article reader">
      <div className="relative">
        <AnimatePresence>{open && <SettingsPanel onClose={() => setOpen(false)} />}</AnimatePresence>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-panel/90 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-line/60"><motion.div className="h-full bg-accent shadow-[0_0_12px_var(--color-accent)]" animate={{ width: `${Math.min(100, pct * 100)}%` }} transition={{ duration: 0.5 }} /></div>
          <div className="flex items-start gap-3 px-4 pb-2 pt-3">
            <div className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl", playing ? "bg-accent/15 text-accent" : "bg-panel2 text-mute")}>
              {st.thinking ? <Loader2 size={16} className="animate-spin" /> : <Equalizer on={st.status === "playing"} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                <span className="truncate">{st.section || "Reading"}</span>
                {st.total > 0 && <span className="num shrink-0 font-medium normal-case tracking-normal">{Math.min(st.block + 1, st.total)}/{st.total}</span>}
                {st.thinking && <span className="flex shrink-0 items-center gap-1 normal-case tracking-normal text-ai"><Sparkles size={11} />thinking it through</span>}
              </div>
              <p className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[13.5px] leading-snug text-text" aria-live="off">
                {st.status === "waiting" ? <span className="text-accent">{st.waitLabel}</span> : st.status === "done" ? "Finished. Nicely done." : st.caption || (st.status === "loading" ? "Getting ready…" : "")}
              </p>
              {st.notice && <p className="mt-0.5 truncate text-[11px] text-warn">{st.notice}</p>}
            </div>
            <div className="relative flex shrink-0 items-center">
              <button onClick={() => setOpen((o) => !o)} aria-label="Reader settings" aria-expanded={open} className={cn(btn, "h-8 w-8", open && "bg-white/[0.06] text-text")}><Settings2 size={16} /></button>
              <button onClick={stop} aria-label="Stop reading" className={cn(btn, "h-8 w-8")}><X size={16} /></button>
            </div>
          </div>
          <div className="flex items-center gap-1 px-3 pb-3">
            <button onClick={() => jumpBlock(-1)} aria-label="Previous section" title="Previous section (Alt+←)" className={btn}><SkipBack size={16} /></button>
            <button onClick={prevStep} aria-label="Previous sentence" title="Previous sentence" className={btn}><Undo2 size={16} /></button>
            {st.status === "done" ? (
              <button onClick={() => start()} aria-label="Read again" className="mx-1 grid h-11 w-11 place-items-center rounded-2xl bg-accent text-ink shadow-[0_0_28px_-6px_var(--color-accent)] transition active:scale-95"><Play size={18} fill="currentColor" className="translate-x-px" /></button>
            ) : (
              <button onClick={toggle} aria-label={playing || st.status === "waiting" ? "Pause" : "Play"} title="Play or pause (Alt+P)" className="mx-1 grid h-11 w-11 place-items-center rounded-2xl bg-accent text-ink shadow-[0_0_28px_-6px_var(--color-accent)] transition active:scale-95">
                {playing || st.status === "waiting" ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="translate-x-px" />}
              </button>
            )}
            <button onClick={nextStep} aria-label={st.status === "waiting" ? "Skip" : "Next sentence"} title="Skip sentence (Alt+↓)" className={btn}><Redo2 size={16} /></button>
            <button onClick={() => jumpBlock(1)} aria-label="Next section" title="Next section (Alt+→)" className={btn}><SkipForward size={16} /></button>
            <div className="ml-auto flex items-center gap-1">
              {st.status === "waiting" && <button onClick={skipWait} className="h-8 rounded-lg border border-line px-2.5 text-[12px] text-mute hover:text-text">Skip</button>}
              {!st.following && active(st.status) && st.status !== "done" && <button onClick={recenter} className="flex h-8 items-center gap-1.5 rounded-lg border border-accent/40 px-2.5 text-[12px] font-medium text-accent hover:bg-accent/10"><Crosshair size={13} /><span className="hidden sm:inline">Follow</span></button>}
              {st.status === "done" && next && <Link href={next.href} className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12px] text-mute hover:text-text">Next: <span className="max-w-[140px] truncate text-text">{next.title}</span></Link>}
              <button onClick={cycleSpeed} aria-label="Change speed" className="num h-8 rounded-lg px-2 text-[12.5px] font-semibold text-mute hover:bg-white/[0.06] hover:text-text">{+st.prefs.rate.toFixed(2)}×</button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** The "next" link a page offers via data-read-next on its scope. */
function useNextTopic() {
  const status = useReader((s) => s.status);
  return useMemo(() => {
    if (status !== "done" || typeof document === "undefined") return null;
    const el = document.querySelector<HTMLElement>("[data-read-next]");
    return el ? { href: el.dataset.readNext!, title: el.dataset.readNextTitle ?? "next" } : null;
  }, [status]);
}

/** Mounted once in the shell: the player, the spotlight, shortcuts, and stopping on navigation. */
export function ReaderRoot() {
  const status = useReader((s) => s.status);
  const pathname = usePathname();
  useEffect(() => { initPrefs(); }, []);
  useEffect(() => () => stop(), [pathname]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      const has = !!document.querySelector("[data-read-scope]");
      if (!has) return;
      if (e.code === "KeyP") { e.preventDefault(); const s = useReader.getState().status; if (s === "idle" || s === "done") start(); else toggle(); }
      else if (!active(useReader.getState().status)) return;
      else if (e.code === "ArrowRight") { e.preventDefault(); jumpBlock(1); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); jumpBlock(-1); }
      else if (e.code === "ArrowDown") { e.preventDefault(); nextStep(); }
      else if (e.code === "ArrowUp") { e.preventDefault(); prevStep(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  // pause when the tab is hidden for a while would surprise people listening in the background, so keep reading
  return (
    <>
      <style>{"::highlight(read-sentence){background-color:rgb(200 245 71 / .075)}::highlight(read-word){background-color:rgb(200 245 71 / .32);color:#fff}"}</style>
      <Spotlight />
      <AnimatePresence>{active(status) && <Player key="player" />}</AnimatePresence>
    </>
  );
}

export { pause, resume };
