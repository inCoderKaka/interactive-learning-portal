"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square } from "lucide-react";
import { useMediaUrl } from "@/lib/notes/media";
import { cn } from "@/components/ui";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const MAX_SEC = 600;

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

/** Downsample a level trace to n bars in 0..1. */
function bars(levels: number[], n = 56): number[] {
  if (!levels.length) return Array(n).fill(0.08);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i / n) * levels.length), b = Math.max(a + 1, Math.floor(((i + 1) / n) * levels.length));
    out.push(Math.max(...levels.slice(a, b)));
  }
  const peak = Math.max(0.05, ...out);
  return out.map((v) => Math.max(0.06, Math.min(1, v / peak)));
}

/** Records a voice note with a live waveform. No AI: the clip is stored as it is. */
export function VoiceRecorder({ color, onDone, onCancel }: { color: string; onDone: (blob: Blob, dur: number, peaks: number[]) => void; onCancel: () => void }) {
  const [sec, setSec] = useState(0);
  const [live, setLive] = useState<number[]>([]);
  const [err, setErr] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const levels = useRef<number[]>([]);
  const cancelled = useRef(false);

  useEffect(() => {
    let stream: MediaStream | undefined, ctx: AudioContext | undefined, raf = 0, tick: ReturnType<typeof setInterval> | undefined;
    const started = Date.now();
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Float32Array(an.fftSize);
        let last = 0;
        const loop = (t: number) => {
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += v * v;
          const rms = Math.sqrt(sum / buf.length);
          if (t - last > 60) { last = t; levels.current.push(rms); setLive((l) => [...l.slice(-47), rms]); }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        const mime = pickMime();
        const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        const chunks: Blob[] = [];
        r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        r.onstop = () => {
          if (cancelled.current) return;
          const dur = (Date.now() - started) / 1000;
          onDone(new Blob(chunks, { type: (r.mimeType || mime || "audio/webm").split(";")[0] }), dur, bars(levels.current));
        };
        r.start(250);
        rec.current = r;
        tick = setInterval(() => {
          const s = (Date.now() - started) / 1000;
          setSec(s);
          if (s >= MAX_SEC && r.state === "recording") r.stop();
        }, 200);
      } catch (e) {
        setErr(e instanceof Error && e.name === "NotAllowedError" ? "Microphone access was blocked. Allow it in the address bar to record." : "No microphone is available.");
      }
    })();
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tick);
      if (rec.current?.state === "recording") { cancelled.current = true; rec.current.stop(); }
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (err) return <div className="rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-[12px] text-bad">{err} <button className="ml-1 underline" onClick={onCancel}>Close</button></div>;
  const peak = Math.max(0.02, ...live);
  return (
    <div className="flex items-center gap-2.5 rounded-xl border px-2.5 py-2" style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 8%, transparent)` }}>
      <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bad text-white"><span className="absolute inset-0 animate-ping rounded-full bg-bad/50" /><Mic size={13} className="relative" /></span>
      <div className="flex h-7 flex-1 items-center gap-[2px] overflow-hidden">
        {Array.from({ length: 48 }, (_, i) => { const v = live[i - (48 - live.length)] ?? 0; return <span key={i} className="w-[3px] shrink-0 rounded-full transition-[height] duration-75" style={{ height: `${Math.max(8, Math.min(100, (v / peak) * 100))}%`, background: color, opacity: v ? 0.9 : 0.25 }} />; })}
      </div>
      <span className="num w-9 text-right text-[11.5px] text-mute">{fmt(sec)}</span>
      <button onClick={() => { cancelled.current = true; rec.current?.stop(); onCancel(); }} className="text-[11.5px] text-faint hover:text-text">Cancel</button>
      <button aria-label="Stop and save" onClick={() => rec.current?.state === "recording" && rec.current.stop()} className="grid h-7 w-7 place-items-center rounded-full bg-text text-ink transition hover:scale-105"><Square size={11} fill="currentColor" /></button>
    </div>
  );
}

/** Plays a voice note over its stored waveform; click the waveform to seek. */
export function VoicePlayer({ media, dur, peaks, color, compact }: { media: string; dur: number; peaks: number[]; color: string; compact?: boolean }) {
  const url = useMediaUrl(media);
  const el = useRef<HTMLAudioElement>(null);
  const [t, setT] = useState(0);
  const [on, setOn] = useState(false);
  const p = dur ? t / dur : 0;
  return (
    <div className={cn("flex items-center gap-2.5 rounded-xl border border-line bg-bg/60", compact ? "px-2 py-1.5" : "px-2.5 py-2")}>
      <audio ref={el} src={url ?? undefined} preload="metadata" onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onEnded={() => { setOn(false); setT(0); }} onPause={() => setOn(false)} onPlay={() => setOn(true)} />
      <button aria-label={on ? "Pause voice note" : "Play voice note"} disabled={!url} onClick={() => (on ? el.current?.pause() : el.current?.play())}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink transition hover:scale-105 disabled:opacity-40" style={{ background: color }}>
        {on ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="flex h-7 flex-1 cursor-pointer items-center gap-[2px]" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); if (el.current && dur) el.current.currentTime = ((e.clientX - r.left) / r.width) * dur; }}>
        {peaks.map((v, i) => <span key={i} className="min-w-[2px] flex-1 rounded-full" style={{ height: `${Math.max(10, v * 100)}%`, background: i / peaks.length <= p ? color : "var(--color-line)" }} />)}
      </div>
      <span className="num w-9 text-right text-[11.5px] text-mute">{fmt(on || t ? t : dur)}</span>
    </div>
  );
}
