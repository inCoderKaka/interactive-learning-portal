"use client";
// On-device speech-to-text for privacy mode (MI-X-6): Whisper running in a Web Worker through
// Transformers.js (Apache-2.0), loaded from jsDelivr at a pinned version only when this mode is used.
// Audio never leaves the browser; the model files are downloaded once from Hugging Face and cached.

const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1";

const WORKER = `
import { pipeline, env } from "${TRANSFORMERS}";
env.allowLocalModels = false;
let asr = null;
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "load") {
      asr = await pipeline("automatic-speech-recognition", m.model, {
        device: m.webgpu ? "webgpu" : "wasm",
        dtype: m.webgpu ? "fp32" : "q8",
        progress_callback: (p) => { if (p && p.status === "progress") self.postMessage({ type: "progress", file: p.file, progress: p.progress }); },
      });
      self.postMessage({ type: "ready" });
    } else if (m.type === "run") {
      const out = await asr(m.audio, { chunk_length_s: 30 });
      self.postMessage({ type: "text", id: m.id, text: (Array.isArray(out) ? out[0]?.text : out?.text) || "" });
    }
  } catch (err) {
    self.postMessage({ type: "error", id: m.id, error: String((err && err.message) || err) });
  }
};
`;

export const WHISPER_MODELS = [
  { id: "Xenova/whisper-tiny.en", label: "Whisper tiny (English, ~40 MB, fastest)" },
  { id: "Xenova/whisper-base.en", label: "Whisper base (English, ~80 MB, recommended)" },
  { id: "Xenova/whisper-small.en", label: "Whisper small (English, ~250 MB, most accurate, needs a fast machine)" },
];

export const whisperSupported = () => typeof window !== "undefined" && typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";

export interface WhisperHandle {
  ready: Promise<void>;
  transcribe(pcm16k: Float32Array): Promise<string>;
  close(): void;
}

export function loadWhisper(model: string, onProgress?: (pct: number) => void): WhisperHandle {
  const url = URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" }));
  const w = new Worker(url, { type: "module" });
  let id = 0;
  const pending = new Map<number, { ok: (t: string) => void; bad: (e: Error) => void }>();
  let readyOk!: () => void, readyBad!: (e: Error) => void;
  const ready = new Promise<void>((ok, bad) => { readyOk = ok; readyBad = bad; });
  const files = new Map<string, number>();
  w.onmessage = (e: MessageEvent<{ type: string; id?: number; text?: string; error?: string; file?: string; progress?: number }>) => {
    const m = e.data;
    if (m.type === "ready") { URL.revokeObjectURL(url); readyOk(); }
    else if (m.type === "progress" && m.file) { files.set(m.file, m.progress ?? 0); onProgress?.([...files.values()].reduce((a, b) => a + b, 0) / Math.max(1, files.size)); }
    else if (m.type === "text" && m.id !== undefined) { pending.get(m.id)?.ok(m.text ?? ""); pending.delete(m.id); }
    else if (m.type === "error") {
      const err = new Error(`On-device speech recognition failed: ${m.error}`);
      if (m.id !== undefined && pending.has(m.id)) { pending.get(m.id)!.bad(err); pending.delete(m.id); } else readyBad(err);
    }
  };
  w.onerror = (e) => readyBad(new Error(`Could not start on-device speech recognition: ${e.message}`));
  w.postMessage({ type: "load", model, webgpu: typeof navigator !== "undefined" && "gpu" in navigator });
  return {
    ready,
    transcribe(pcm) {
      const n = ++id;
      return new Promise((ok, bad) => { pending.set(n, { ok, bad }); w.postMessage({ type: "run", id: n, audio: pcm }, [pcm.buffer]); });
    },
    close() { w.terminate(); for (const p of pending.values()) p.bad(new Error("closed")); pending.clear(); },
  };
}

/** Keep a rolling PCM buffer and cut utterances at the VAD's start and end. */
export class UtteranceBuffer {
  private chunks: Int16Array[] = [];
  private pre: Int16Array[] = [];
  private on = false;
  constructor(private preRollChunks = 3) {}
  push(pcm: ArrayBuffer) {
    const c = new Int16Array(pcm);
    if (this.on) this.chunks.push(c);
    else { this.pre.push(c); if (this.pre.length > this.preRollChunks) this.pre.shift(); }
  }
  begin() { if (this.on) return; this.on = true; this.chunks = [...this.pre]; this.pre = []; }
  /** The utterance as 16 kHz float samples, or null if it was too short to be speech. */
  end(minMs = 300): Float32Array | null {
    if (!this.on) return null;
    this.on = false;
    const n = this.chunks.reduce((a, c) => a + c.length, 0);
    const out = new Float32Array(n);
    let o = 0;
    for (const c of this.chunks) for (let i = 0; i < c.length; i++) out[o++] = c[i] / 0x8000;
    this.chunks = [];
    return n >= (minMs / 1000) * 16000 ? out : null;
  }
}
