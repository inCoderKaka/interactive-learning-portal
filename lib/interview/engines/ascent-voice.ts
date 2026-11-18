"use client";
// Ascent Voice: a cascaded pipeline in the browser. Voice activity detection → speech-to-text →
// (the controller's LLM call) → text-to-speech. Works with any provider, including Claude and local.

import { getKeys } from "../providers/keys";
import { getAi } from "../tasks";
import { EnergyVad, openMic, sentences } from "./audio";
import type { Engine, EngineCallbacks, StartOptions } from "./types";

// ---- speech-to-text adapters ----

interface Stt {
  pause(): void;
  resume(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => {
  continuous: boolean; interimResults: boolean; lang: string; maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
  start(): void; stop(): void; abort(): void;
};

function speechRecognition(): SpeechRecognitionCtor | undefined {
  const w = globalThis as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function webSpeechStt(lang: string, onText: (finalText: string, interim: string) => void, onError: (e: Error) => void): Stt {
  const Ctor = speechRecognition();
  if (!Ctor) throw new Error("This browser has no built-in speech recognition. Use Chrome or Edge, or choose OpenAI speech-to-text in Settings → Developer mode.");
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = lang;
  let paused = false, stopped = false, running = false;
  rec.onresult = (e) => {
    let fin = "", interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript;
    }
    onText(fin, interim);
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") onError(new Error("Speech recognition was blocked. Allow microphone access for this site."));
  };
  rec.onend = () => {
    running = false;
    // Chrome ends recognition after a while; keep it alive unless paused
    if (!paused && !stopped) setTimeout(() => { if (!paused && !stopped && !running) { try { rec.start(); running = true; } catch { /* already started */ } } }, 120);
  };
  try { rec.start(); running = true; } catch { /* started */ }
  return {
    pause() { paused = true; try { rec.abort(); } catch { /* idle */ } },
    resume() { paused = false; if (!running) { try { rec.start(); running = true; } catch { /* started */ } } },
    stop() { stopped = true; try { rec.abort(); } catch { /* idle */ } },
  };
}

/** OpenAI transcription of each utterance, gated by the VAD. Better with jargon (key-term prompt). */
function openAiStt(stream: MediaStream, keyterms: string[], onText: (finalText: string, interim: string) => void, onError: (e: Error) => void) {
  const key = getKeys().openai;
  if (!key) throw new Error("Add an OpenAI key in Settings to use OpenAI speech-to-text.");
  let rec: MediaRecorder | null = null, chunks: Blob[] = [], paused = false;
  const begin = () => {
    if (paused || rec) return;
    chunks = [];
    rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "" });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: rec?.mimeType || "audio/webm" });
      rec = null;
      if (blob.size < 2000) return;
      onText("", "…");
      const fd = new FormData();
      fd.append("file", blob, "utterance.webm");
      fd.append("model", "gpt-4o-mini-transcribe");
      fd.append("prompt", `Technical interview. Terms: ${keyterms.slice(0, 50).join(", ")}`);
      try {
        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${key}` }, body: fd });
        if (!res.ok) throw new Error(`Transcription failed: ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
        onText(String((await res.json()).text ?? ""), "");
      } catch (e) { onError(e instanceof Error ? e : new Error(String(e))); }
    };
    rec.start();
  };
  const end = () => { if (rec && rec.state !== "inactive") rec.stop(); };
  return {
    begin, end,
    stt: { pause() { paused = true; end(); }, resume() { paused = false; }, stop() { paused = true; end(); } } as Stt,
  };
}

// ---- text-to-speech adapters ----

interface Tts { speak(chunks: AsyncIterable<string>, signal: AbortSignal, onSentence: (s: string) => void, onFirstAudio: () => void): Promise<string>; cancel(): void }

function pickVoice(name: string, lang: string): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.name === name) ?? voices.find((v) => v.lang === lang && /natural|neural|google|enhanced|premium/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
}

function browserTts(voiceName: string, lang: string, rate: number): Tts {
  return {
    async speak(chunks, signal, onSentence, onFirstAudio) {
      let said = "", first = true;
      for await (const s of sentences(chunks)) {
        if (signal.aborted) break;
        await new Promise<void>((done) => {
          const u = new SpeechSynthesisUtterance(s);
          const v = pickVoice(voiceName, lang);
          if (v) u.voice = v;
          u.lang = lang;
          u.rate = rate;
          u.onstart = () => { if (first) { first = false; onFirstAudio(); } };
          u.onend = u.onerror = () => done();
          signal.addEventListener("abort", () => { speechSynthesis.cancel(); done(); }, { once: true });
          speechSynthesis.speak(u);
        });
        if (signal.aborted) break;
        said += (said ? " " : "") + s;
        onSentence(said);
      }
      return said;
    },
    cancel() { speechSynthesis.cancel(); },
  };
}

function openAiTts(voice: string, rate: number): Tts {
  const key = getKeys().openai;
  if (!key) throw new Error("Add an OpenAI key in Settings to use OpenAI voices.");
  let current: HTMLAudioElement | null = null;
  const fetchAudio = (text: string, signal: AbortSignal) =>
    fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST", signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: voice || "cedar", input: text, speed: rate, response_format: "mp3", instructions: "Speak like a calm, professional software engineer conducting an interview." }),
    }).then(async (r) => { if (!r.ok) throw new Error(`Speech failed: ${r.status}`); return URL.createObjectURL(await r.blob()); });
  return {
    async speak(chunks, signal, onSentence, onFirstAudio) {
      let said = "", first = true;
      const queue: { text: string; url: Promise<string> }[] = [];
      const producer = (async () => { for await (const s of sentences(chunks)) { if (signal.aborted) break; queue.push({ text: s, url: fetchAudio(s, signal) }); } })();
      let done = false;
      producer.finally(() => { done = true; });
      while (!signal.aborted) {
        if (!queue.length) { if (done) break; await new Promise((r) => setTimeout(r, 40)); continue; }
        const item = queue.shift()!;
        const url = await item.url.catch(() => "");
        if (!url || signal.aborted) break;
        await new Promise<void>((ok) => {
          const a = new Audio(url);
          current = a;
          a.onplay = () => { if (first) { first = false; onFirstAudio(); } };
          a.onended = a.onerror = () => ok();
          signal.addEventListener("abort", () => { a.pause(); ok(); }, { once: true });
          a.play().catch(() => ok());
        });
        URL.revokeObjectURL(url);
        if (signal.aborted) break;
        said += (said ? " " : "") + item.text;
        onSentence(said);
      }
      await producer.catch(() => {});
      return said;
    },
    cancel() { current?.pause(); },
  };
}

// ---- the engine ----

export const ascentVoiceEngine: Engine = {
  id: "ascent-voice",
  label: "Ascent Voice",
  unavailable(settings) {
    if (typeof window === "undefined") return "Needs a browser.";
    const sp = getAi(settings).speech;
    if (sp.stt === "webspeech" && !speechRecognition()) return "This browser has no built-in speech recognition (use Chrome or Edge, or switch speech-to-text to OpenAI in developer mode).";
    if ((sp.stt === "openai" || sp.tts === "openai") && !getKeys().openai) return "OpenAI speech is selected in developer mode but no OpenAI key is set.";
    return null;
  },
  async start(opts: StartOptions, cb: EngineCallbacks) {
    const sp = getAi(opts.settings).speech;
    const stream = await openMic();
    let agentSpeaking = false, interruptedAgent = false, muted = false;
    let finalText = "", interim = "", flushTimer: ReturnType<typeof setTimeout> | undefined;
    let speechCtl: AbortController | null = null;
    let speechStartedAt = 0;

    const flush = () => {
      const text = `${finalText} ${interim}`.replace(/\s+/g, " ").trim();
      finalText = ""; interim = "";
      if (text && text !== "…") { cb.candidateTurn(text, interruptedAgent); interruptedAgent = false; }
    };
    const onText = (fin: string, inter: string) => {
      if (muted) return;
      if (fin) finalText += ` ${fin}`;
      interim = inter;
      cb.candidatePartial(`${finalText} ${interim}`.trim());
      // OpenAI STT returns one final per utterance: deliver it now
      if (sp.stt === "openai" && fin) flush();
    };

    let oa: ReturnType<typeof openAiStt> | null = null;
    const stt: Stt = sp.stt === "openai"
      ? (oa = openAiStt(stream, opts.keyterms, onText, (e) => cb.error(e, false))).stt
      : webSpeechStt(sp.lang, onText, (e) => cb.error(e, true));

    const endMs = sp.endOfSpeechMs || opts.endOfSpeechMs;
    const vad = new EnergyVad(stream, {
      startMs: 120,
      endMs,
      onStart: () => {
        if (muted) return;
        speechStartedAt = performance.now();
        clearTimeout(flushTimer);
        if (agentSpeaking) {
          if (!sp.bargeIn) return;
          // sustained speech while the interviewer talks = barge-in
          setTimeout(() => {
            if (vad.speaking && agentSpeaking && performance.now() - speechStartedAt >= sp.bargeInMs) {
              interruptedAgent = true;
              speechCtl?.abort();
              stt.resume();
            }
          }, sp.bargeInMs);
          return;
        }
        cb.candidateSpeaking(true);
        oa?.begin();
      },
      onEnd: () => {
        if (muted || agentSpeaking) return;
        cb.candidateSpeaking(false);
        oa?.end();
        // let the recogniser finalise the last words
        flushTimer = setTimeout(flush, sp.stt === "openai" ? 0 : 350);
      },
    });

    const tts: Tts = sp.tts === "openai" ? openAiTts(opts.voice.voiceId || sp.ttsVoice, opts.voice.rate) : browserTts(opts.voice.voiceId || sp.ttsVoice, sp.lang, opts.voice.rate);
    if (sp.tts === "browser") speechSynthesis.getVoices(); // warm the voice list

    return {
      id: "ascent-voice",
      kind: "pipeline",
      async speak(chunks, signal) {
        const ctl = new AbortController();
        speechCtl = ctl;
        const both = AbortSignal.any([signal, ctl.signal]);
        agentSpeaking = true;
        cb.agentSpeaking(true);
        // the recogniser would transcribe the interviewer's own voice
        stt.pause();
        vad.setEndMs(endMs);
        const t0 = performance.now();
        let text = "";
        try {
          text = await tts.speak(chunks, both, (s) => cb.interviewerPartial(s), () => cb.latency("first_audio", performance.now() - t0));
        } finally {
          agentSpeaking = false;
          cb.agentSpeaking(false);
          speechCtl = null;
          if (!muted) stt.resume();
        }
        return { text, interrupted: ctl.signal.aborted };
      },
      cancelSpeech() { speechCtl?.abort(); tts.cancel(); },
      mute(on) {
        muted = on;
        stream.getAudioTracks().forEach((t) => (t.enabled = !on));
        if (on) { stt.pause(); finalText = ""; interim = ""; cb.candidatePartial(""); } else stt.resume();
      },
      async stop() {
        speechCtl?.abort();
        tts.cancel();
        stt.stop();
        vad.close();
        stream.getTracks().forEach((t) => t.stop());
      },
    };
  },
};
