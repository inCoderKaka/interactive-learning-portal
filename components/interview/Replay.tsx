"use client";
// Replay (MI-FB-2): scrub through audio, transcript, whiteboard and code together. "Redo this moment"
// (MI-FB-4) starts a short drill from any interviewer turn.
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Repeat2, Volume2, VolumeX } from "lucide-react";
import { Button, Pill, cn, fmtClock } from "@/components/ui";
import { duration, lastAt, markers, stateAt, type Marker } from "@/lib/interview/core/replay";
import type { SessionRecord } from "@/lib/interview/results";
import type { RoundMedia } from "@/lib/interview/media";

const Board = dynamic(() => import("./ReplayBoard"), { ssr: false, loading: () => <div className="grid h-full place-items-center rounded-xl border border-line text-[13px] text-faint">Loading whiteboard…</div> });

const MARK_COLOR: Record<Marker["kind"], string> = {
  phase: "var(--color-faint)", curveball: "var(--color-hld)", hint: "var(--color-warn)", intervention: "var(--color-bad)", fallback: "var(--color-warn)", rule: "var(--color-lld)", look: "var(--color-accent)",
};

const words = (t: string) => t.trim().split(/\s+/).length;

export function Replay({ record, media, onRedo }: { record: SessionRecord; media?: RoundMedia; onRedo?: (seq: number) => void }) {
  const log = record.log;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioMs, setAudioMs] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState<"board" | "code" | "notes">(record.cfg.kind === "coding" ? "code" : "board");
  const scroller = useRef<HTMLDivElement>(null);
  const offset = media?.audioOffsetMs ?? 0;
  const url = useMemo(() => (media?.audio ? URL.createObjectURL(media.audio) : ""), [media?.audio]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const total = duration(log, audioMs ? audioMs + offset : 0);
  const marks = useMemo(() => markers(log), [log]);
  const turns = useMemo(() => log.flatMap(({ seq, t: at, e }) => (e.type === "turn.candidate" || e.type === "turn.interviewer"
    ? [{ seq, end: at, start: Math.max(0, at - Math.min(20000, (words(e.text) / 2.6) * 1000)), me: e.type === "turn.candidate", text: e.text, origin: e.type === "turn.interviewer" ? e.origin : "" }] : [])), [log]);
  const st = useMemo(() => stateAt(log, t), [log, t]);
  const frames = media?.frames ?? [];
  const frame = frames[lastAt(frames, t)];

  // without audio, a clock drives playback
  useEffect(() => {
    if (!playing || url) return;
    let last = performance.now(), raf = 0;
    const step = (now: number) => {
      setT((x) => { const n = x + (now - last) * speed; if (n >= total) { setPlaying(false); return total; } return n; });
      last = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, url, speed, total]);

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed]);
  useEffect(() => {
    const el = scroller.current?.querySelector(`[data-seq="${st.lastTurnSeq}"]`) as HTMLElement | null;
    if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - scroller.current.clientHeight / 2, behavior: "smooth" });
  }, [st.lastTurnSeq]);

  const seek = (ms: number) => {
    const v = Math.max(0, Math.min(total, ms));
    setT(v);
    const a = audioRef.current;
    if (a) {
      const at = (v - offset) / 1000;
      if (at >= 0 && at <= a.duration) a.currentTime = at;
    }
  };
  const toggle = () => {
    const a = audioRef.current;
    if (a) { if (a.paused) { if (t >= total) seek(0); void a.play(); } else a.pause(); return; }
    if (t >= total) setT(0);
    setPlaying((p) => !p);
  };

  const hasBoard = record.cfg.kind === "hld" || record.cfg.kind === "lld";
  const tabs = ([hasBoard && "board", record.cfg.kind === "coding" && "code", hasBoard && "notes"].filter(Boolean)) as ("board" | "code" | "notes")[];

  return (
    <section className="card overflow-hidden" aria-label="Replay">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <div className="eyebrow">Replay</div>
        {media?.audio ? <Pill className="border-line text-mute"><Volume2 size={12} />{media.interviewerAudio ? "both voices" : "your voice only"}</Pill> : <Pill className="border-line text-faint"><VolumeX size={12} />no recording</Pill>}
        <div className="ml-auto flex items-center gap-1 text-[12px] text-mute">Speed {[1, 1.5, 2].map((x) => <button key={x} onClick={() => setSpeed(x)} aria-pressed={speed === x} className={cn("rounded-md px-1.5 py-0.5", speed === x ? "bg-panel2 text-text" : "hover:text-text")}>{x}×</button>)}</div>
      </div>
      {url && (
        <audio ref={audioRef} src={url} preload="metadata" className="hidden"
          onLoadedMetadata={(e) => setAudioMs(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration * 1000 : 0)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime * 1000 + offset)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      )}
      <div className="flex items-center gap-3 px-5 py-3">
        <Button size="sm" variant="primary" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={14} /> : <Play size={14} />}</Button>
        <span className="num w-24 font-mono text-[12.5px] text-mute">{fmtClock(Math.round(t / 1000))} / {fmtClock(Math.round(total / 1000))}</span>
        <div className="relative flex-1">
          <input type="range" min={0} max={Math.max(1, total)} step={250} value={t} onChange={(e) => seek(+e.target.value)} aria-label="Position in the round" className="w-full accent-[var(--color-accent)]" />
          <div className="pointer-events-none absolute inset-x-0 -bottom-1.5 h-2">
            {marks.filter((m) => m.kind !== "phase").map((m) => <span key={m.seq} title={m.label} className="absolute h-2 w-0.5 rounded" style={{ left: `${(m.t / Math.max(1, total)) * 100}%`, background: MARK_COLOR[m.kind] }} />)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-5 pb-3">
        {marks.map((m) => <button key={m.seq} onClick={() => seek(m.t - 2000)} className="rounded-full border border-line px-2 py-0.5 text-[11.5px] text-mute hover:text-text"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: MARK_COLOR[m.kind] }} />{fmtClock(Math.round(m.t / 1000))} {m.label}</button>)}
      </div>

      <div className="grid gap-4 border-t border-line p-4 xl:grid-cols-[minmax(320px,2fr)_3fr]">
        <div ref={scroller} className="relative h-[460px] space-y-2.5 overflow-y-auto pr-1">
          {turns.map((m) => {
            const past = m.seq <= st.lastTurnSeq;
            return (
              <div key={m.seq} data-seq={m.seq} className={cn("group max-w-[92%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed transition", m.me ? "ml-auto border border-accent/25 bg-accent/10" : "border border-line bg-panel2", !past && "opacity-40", m.seq === st.lastTurnSeq && "ring-1 ring-accent/50")}>
                <div className="mb-0.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                  <button onClick={() => seek(m.start)} className="hover:text-text">{fmtClock(Math.round(m.start / 1000))}</button>
                  {m.me ? "You" : record.persona.name}{m.origin && m.origin !== "reply" && <span className="text-warn">{m.origin}</span>}
                </div>
                {m.text}
                {!m.me && onRedo && <div className="mt-1.5 hidden group-hover:block"><Button size="sm" variant="ghost" onClick={() => onRedo(m.seq)} title="Retry your answer to this, with the same context"><Repeat2 size={13} />Redo this moment</Button></div>}
              </div>
            );
          })}
        </div>
        <div className="flex h-[460px] flex-col">
          {tabs.length > 1 && <div className="mb-2 flex gap-1">{tabs.map((x) => <button key={x} onClick={() => setTab(x)} className={cn("rounded-lg px-3 py-1 text-[12.5px] font-medium", tab === x ? "bg-panel2 text-text" : "text-mute hover:text-text")}>{x === "board" ? "Whiteboard" : x === "code" ? "Code" : "Notes"}</button>)}</div>}
          <div className="min-h-0 flex-1">
            {tab === "board" && (frame ? <Board elements={frame.elements} /> : <pre className="code h-full overflow-auto whitespace-pre-wrap text-[12px]">{st.board || "Nothing drawn yet at this point."}{!frames.length && st.board ? "\n\n(Whiteboard frames were not kept for this round; this is the text the interviewer read.)" : ""}</pre>)}
            {tab === "code" && <pre className="h-full overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-[#f7f7f5] p-4 font-mono text-[12.5px] leading-relaxed text-[#1f1f1f]">{st.code || "No code yet at this point."}</pre>}
            {tab === "notes" && <pre className="code h-full overflow-auto whitespace-pre-wrap text-[12px]">{st.notes || "No notes yet at this point."}</pre>}
          </div>
        </div>
      </div>
    </section>
  );
}
