"use client";
// Browser audio helpers shared by the voice engines.

export async function openMic(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot capture the microphone.");
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
}

/**
 * Energy-based voice activity detection with an adaptive noise floor. Good enough for turn-taking and
 * barge-in; the speech recogniser does the real work of finding words.
 */
export class EnergyVad {
  private ctx: AudioContext;
  private an: AnalyserNode;
  private buf: Float32Array<ArrayBuffer>;
  private timer: ReturnType<typeof setInterval> | undefined;
  private floor = 0.01;
  private aboveMs = 0;
  private belowMs = 0;
  speaking = false;
  level = 0;

  constructor(stream: MediaStream, private opts: { startMs: number; endMs: number; onStart: () => void; onEnd: () => void; sensitivity?: number }) {
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaStreamSource(stream);
    this.an = this.ctx.createAnalyser();
    this.an.fftSize = 1024;
    src.connect(this.an);
    this.buf = new Float32Array(new ArrayBuffer(this.an.fftSize * 4));
    const step = 30;
    this.timer = setInterval(() => {
      this.an.getFloatTimeDomainData(this.buf);
      let sum = 0;
      for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
      const rms = Math.sqrt(sum / this.buf.length);
      this.level = rms;
      if (!this.speaking) this.floor = this.floor * 0.97 + Math.min(rms, this.floor * 2) * 0.03;
      const threshold = Math.max(0.012, this.floor * (this.opts.sensitivity ?? 3));
      if (rms > threshold) { this.aboveMs += step; this.belowMs = 0; } else { this.belowMs += step; this.aboveMs = 0; }
      if (!this.speaking && this.aboveMs >= this.opts.startMs) { this.speaking = true; this.opts.onStart(); }
      if (this.speaking && this.belowMs >= this.opts.endMs) { this.speaking = false; this.opts.onEnd(); }
    }, step);
  }

  setEndMs(ms: number) { this.opts.endMs = ms; }

  close() {
    clearInterval(this.timer);
    this.ctx.close().catch(() => {});
  }
}

const WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      this.buf.push(new Float32Array(ch));
      this.n += ch.length;
      if (this.n >= 1600) { // 100 ms at 16 kHz
        const out = new Int16Array(this.n);
        let o = 0;
        for (const b of this.buf) for (let i = 0; i < b.length; i++) { const s = Math.max(-1, Math.min(1, b[i])); out[o++] = s < 0 ? s * 0x8000 : s * 0x7fff; }
        this.port.postMessage(out.buffer, [out.buffer]);
        this.buf = []; this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
`;

/** Captures 16 kHz mono PCM16 chunks from a stream. */
export async function capturePcm16(stream: MediaStream, onChunk: (pcm: ArrayBuffer) => void): Promise<() => void> {
  const ctx = new AudioContext({ sampleRate: 16000 });
  const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "pcm-capture");
  node.port.onmessage = (e) => onChunk(e.data as ArrayBuffer);
  src.connect(node);
  return () => { node.disconnect(); src.disconnect(); ctx.close().catch(() => {}); };
}

/** Gapless playback of PCM16 chunks (e.g. 24 kHz from Gemini Live), with instant stop for barge-in. */
export class PcmPlayer {
  private ctx: AudioContext;
  private at = 0;
  private sources = new Set<AudioBufferSourceNode>();
  onIdle?: () => void;
  onStart?: () => void;

  constructor(private rate = 24000) {
    this.ctx = new AudioContext({ sampleRate: rate });
  }

  get playing() { return this.sources.size > 0; }

  push(pcm: ArrayBuffer) {
    const i16 = new Int16Array(pcm);
    const f = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f[i] = i16[i] / 0x8000;
    const b = this.ctx.createBuffer(1, f.length, this.rate);
    b.copyToChannel(f, 0);
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    if (this.at < now) this.at = now + 0.03;
    if (!this.sources.size) this.onStart?.();
    s.start(this.at);
    this.at += b.duration;
    this.sources.add(s);
    s.onended = () => {
      this.sources.delete(s);
      if (!this.sources.size) this.onIdle?.();
    };
  }

  stop() {
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    this.sources.clear();
    this.at = 0;
  }

  close() {
    this.stop();
    this.ctx.close().catch(() => {});
  }
}

export function b64FromBuffer(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export function bufferFromB64(b64: string): ArrayBuffer {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8.buffer;
}

export const blobToB64 = (b: Blob) => b.arrayBuffer().then(b64FromBuffer);

/** Split a token stream into speakable sentences as soon as each one is complete. */
export async function* sentences(chunks: AsyncIterable<string>): AsyncGenerator<string> {
  let buf = "";
  for await (const c of chunks) {
    buf += c;
    let i: number;
    while ((i = buf.search(/[.!?\u2026]\s/)) >= 0) {
      const s = buf.slice(0, i + 1).trim();
      buf = buf.slice(i + 2);
      if (s) yield s;
    }
  }
  if (buf.trim()) yield buf.trim();
}
