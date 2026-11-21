"use client";
/** Tiny synthesised sound effects for quick play (no audio files). Quiet by design and only ever after a user action. */
let ctx: AudioContext | null = null;
function tone(freq: number, at: number, dur: number, type: OscillatorType, gain: number) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}
export function sfx(kind: "right" | "wrong" | "combo" | "finish" | "tick", on = true) {
  if (!on || typeof window === "undefined") return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    if (kind === "right") { tone(660, t, 0.12, "sine", 0.06); tone(990, t + 0.07, 0.16, "sine", 0.05); }
    else if (kind === "wrong") { tone(220, t, 0.18, "triangle", 0.06); tone(165, t + 0.09, 0.22, "triangle", 0.05); }
    else if (kind === "combo") [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.06, 0.18, "sine", 0.05));
    else if (kind === "finish") [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.3, "sine", 0.05));
    else tone(1200, t, 0.04, "square", 0.015);
  } catch { /* audio unavailable */ }
}
