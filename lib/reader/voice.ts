"use client";
// Two voices for the reader: the browser's own speech synthesis (free, on-device or the browser's online voices)
// and OpenAI's natural voices with the learner's own key. Both report word positions so the page can follow along.

import { getKeys } from "@/lib/interview/providers/keys";

export type Engine = "browser" | "openai";
export interface VoicePrefs { engine: Engine; voice: string; openaiVoice: string; rate: number; pitch: number }
export type Outcome = "end" | "stopped";
export interface Speaking { done: Promise<Outcome>; stop(): void }

export const OPENAI_VOICES = ["marin", "cedar", "coral", "sage", "alloy", "ash", "ballad", "echo", "fable", "nova", "onyx", "shimmer", "verse"];

export const hasSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Voices that sound human come first: browsers mark them "Natural", "Online", "Neural", "Enhanced" or "Premium"; Google's online voices are good too. */
export function voiceScore(v: { name: string; lang: string; localService: boolean }): number {
  let s = 0;
  if (/natural|neural|online|enhanced|premium|siri/i.test(v.name)) s += 4;
  if (/^Google/.test(v.name)) s += 3;
  if (/Samantha|Daniel|Karen|Moira|Ava|Allison|Serena|Aria|Jenny|Guy|Libby|Sonia/i.test(v.name)) s += 2;
  if (v.lang.startsWith("en")) s += 2;
  if (/en[-_](US|GB)/i.test(v.lang)) s += 1;
  if (/compact|eloquence|novelty|zarvox|bells|bubbles|boing|whisper|bad news|good news|trinoids|albert|jester|organ|cellos|superstar|wobble/i.test(v.name)) s -= 8;
  return s;
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!hasSpeech()) return [];
  return [...speechSynthesis.getVoices()].sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

export function pickVoice(name: string): SpeechSynthesisVoice | undefined {
  const all = listVoices();
  return all.find((v) => v.name === name) ?? all.find((v) => v.lang.startsWith("en"));
}

// Chrome drops utterances that get garbage-collected mid-speech; keep them referenced until they finish.
const alive = new Set<SpeechSynthesisUtterance>();

function browserSpeak(text: string, p: VoicePrefs, onWord: (i: number) => void): Speaking {
  let stop = () => {};
  const done = new Promise<Outcome>((resolve) => {
    let settled = false, gotBoundary = false, started = false;
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(p.voice);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
    u.rate = p.rate;
    u.pitch = p.pitch;
    const finish = (o: Outcome) => {
      if (settled) return;
      settled = true;
      clearInterval(watch);
      clearInterval(fake);
      alive.delete(u);
      resolve(o);
    };
    // Some voices never send word boundaries: estimate the position from elapsed time instead.
    const t0 = { at: 0 };
    const cps = 14.5 * p.rate;
    const fake = setInterval(() => {
      if (!started || gotBoundary) return;
      const i = Math.floor(((performance.now() - t0.at) / 1000) * cps);
      if (i < text.length) onWord(i);
    }, 120);
    u.onstart = () => { started = true; t0.at = performance.now(); };
    u.onboundary = (e) => { if (e.name && e.name !== "word") return; gotBoundary = true; onWord(e.charIndex); };
    u.onend = () => finish("end");
    u.onerror = (e) => finish(e.error === "interrupted" || e.error === "canceled" ? "stopped" : "end");
    // Watchdog for the occasional missing onend: speech is over when the engine is idle.
    const born = performance.now();
    const watch = setInterval(() => {
      const idle = !speechSynthesis.speaking && !speechSynthesis.pending;
      if (idle && (started || performance.now() - born > 2500)) finish("end");
    }, 400);
    stop = () => { finish("stopped"); speechSynthesis.cancel(); };
    alive.add(u);
    speechSynthesis.speak(u);
  });
  return { done, stop: () => stop() };
}

const audioCache = new Map<string, Promise<string>>();
const keyOf = (text: string, p: VoicePrefs) => `${p.openaiVoice}|${text}`;

function fetchAudio(text: string, p: VoicePrefs): Promise<string> {
  const k = keyOf(text, p);
  const hit = audioCache.get(k);
  if (hit) return hit;
  const key = getKeys().openai;
  const job = fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: p.openaiVoice || "marin", input: text, response_format: "mp3", instructions: "Read aloud like a warm, engaged teacher walking a student through a technical article. Natural pace, light emphasis on key terms." }),
  }).then(async (r) => { if (!r.ok) throw new Error(`OpenAI speech failed (${r.status})`); return URL.createObjectURL(await r.blob()); });
  job.catch(() => audioCache.delete(k));
  audioCache.set(k, job);
  if (audioCache.size > 40) { const first = audioCache.keys().next().value!; audioCache.get(first)?.then((u) => URL.revokeObjectURL(u)).catch(() => {}); audioCache.delete(first); }
  return job;
}

function openaiSpeak(text: string, p: VoicePrefs, onWord: (i: number) => void, onFail: (e: Error) => void): Speaking {
  let audio: HTMLAudioElement | null = null;
  let stopped = false;
  let resolveOuter: (o: Outcome) => void = () => {};
  const done = new Promise<Outcome>((resolve) => {
    resolveOuter = resolve;
    fetchAudio(text, p).then((url) => {
      if (stopped) return resolve("stopped");
      audio = new Audio(url);
      audio.playbackRate = p.rate;
      audio.ontimeupdate = () => { if (audio && audio.duration) onWord(Math.floor((audio.currentTime / audio.duration) * text.length)); };
      audio.onended = () => resolve("end");
      audio.onerror = () => resolve("end");
      audio.play().catch(() => resolve("end"));
    }).catch((e: Error) => {
      if (stopped) return resolve("stopped");
      onFail(e);
      // fall back to the browser voice for this sentence so reading never stalls
      browserSpeak(text, { ...p, engine: "browser" }, onWord).done.then(resolve);
    });
  });
  return { done, stop: () => { stopped = true; audio?.pause(); resolveOuter("stopped"); } };
}

export function speak(text: string, p: VoicePrefs, onWord: (i: number) => void, onFail: (e: Error) => void = () => {}): Speaking {
  if (p.engine === "openai" && getKeys().openai) return openaiSpeak(text, p, onWord, onFail);
  if (!hasSpeech()) return { done: Promise.resolve("end"), stop() {} };
  return browserSpeak(text, p, onWord);
}

/** Warm the next sentence's audio so natural voices have no gap. */
export function prefetch(text: string, p: VoicePrefs) {
  if (p.engine === "openai" && getKeys().openai && text.trim()) fetchAudio(text, p).catch(() => {});
}

export function cancelAll() {
  if (hasSpeech()) speechSynthesis.cancel();
}
