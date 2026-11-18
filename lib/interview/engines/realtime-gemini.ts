"use client";
// Gemini Live (speech-to-speech) from the browser with the learner's own Gemini key.
// Protocol: BidiGenerateContent over WebSocket. Handles GoAway and session resumption so rounds can
// outlast a single connection (docs: architecture §4.3, verification V2).

import { getKeys } from "../providers/keys";
import { listModels } from "../providers/llm";
import { getAi } from "../tasks";
import { EnergyVad, PcmPlayer, b64FromBuffer, blobToB64, bufferFromB64, capturePcm16, openMic } from "./audio";
import type { Engine, EngineCallbacks, StartOptions } from "./types";

const WS = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

let modelCache: string[] | null = null;
async function pickModel(opts: StartOptions, wanted: string): Promise<string> {
  try {
    modelCache ??= await listModels(opts.settings, "gemini", "realtime");
  } catch {
    return wanted;
  }
  if (!modelCache.length || modelCache.includes(wanted)) return wanted;
  return modelCache.find((m) => /native-audio/.test(m)) ?? modelCache.find((m) => /live/.test(m)) ?? modelCache[0];
}

export const geminiLiveEngine: Engine = {
  id: "realtime",
  label: "Realtime voice (Gemini Live)",
  unavailable: () => (getKeys().gemini ? null : "Needs a Gemini API key (Settings → AI reviewer)."),
  async start(opts: StartOptions, cb: EngineCallbacks) {
    const key = getKeys().gemini;
    const rt = getAi(opts.settings).realtime;
    const model = await pickModel(opts, rt.geminiModel);
    const stream = await openMic();
    const player = new PcmPlayer(24000);
    let ws: WebSocket | null = null, handle: string | undefined, closed = false, muted = false, ready = false;
    let inText = "", outText = "", agentSpeaking = false, awaitingAt = 0, instructions = opts.instructions;
    let stopCapture: (() => void) | null = null;

    player.onStart = () => { agentSpeaking = true; cb.agentSpeaking(true); if (awaitingAt) { cb.latency("first_audio", performance.now() - awaitingAt); awaitingAt = 0; } };
    player.onIdle = () => { agentSpeaking = false; cb.agentSpeaking(false); };

    const vad = new EnergyVad(stream, {
      startMs: 150, endMs: opts.endOfSpeechMs,
      onStart: () => { if (!muted) cb.candidateSpeaking(true); },
      onEnd: () => { if (!muted) { cb.candidateSpeaking(false); awaitingAt = performance.now(); } },
    });

    const send = (m: unknown) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m)); };

    const flushCandidate = () => {
      const t = inText.trim();
      inText = "";
      if (t) cb.candidateTurn(t, false);
    };

    const connect = () => new Promise<void>((resolve, reject) => {
      const sock = new WebSocket(`${WS}?key=${encodeURIComponent(key)}`);
      ws = sock;
      let settled = false;
      sock.onopen = () => {
        send({
          setup: {
            model: `models/${model}`,
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voice.voiceId || rt.geminiVoice } } } },
            systemInstruction: { parts: [{ text: instructions }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            realtimeInputConfig: { automaticActivityDetection: { silenceDurationMs: opts.endOfSpeechMs, prefixPaddingMs: 200 } },
            contextWindowCompression: { slidingWindow: {} },
            sessionResumption: handle ? { handle } : {},
          },
        });
      };
      sock.onmessage = async (ev) => {
        const raw = typeof ev.data === "string" ? ev.data : await (ev.data as Blob).text();
        let m: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        try { m = JSON.parse(raw); } catch { return; }
        if (m.setupComplete) { ready = true; if (!settled) { settled = true; resolve(); } return; }
        if (m.sessionResumptionUpdate?.resumable && m.sessionResumptionUpdate.newHandle) handle = m.sessionResumptionUpdate.newHandle;
        if (m.goAway) { cb.status("Reconnecting the voice line…"); reconnect(); return; }
        const sc = m.serverContent;
        if (!sc) return;
        if (sc.inputTranscription?.text) { inText += sc.inputTranscription.text; cb.candidatePartial(inText.trim()); }
        if (sc.interrupted) {
          player.stop();
          if (outText.trim()) cb.interviewerTurn(outText.trim(), true);
          outText = "";
        }
        if (sc.modelTurn?.parts) {
          if (inText) flushCandidate();
          for (const p of sc.modelTurn.parts) if (p.inlineData?.data && String(p.inlineData.mimeType).startsWith("audio/")) player.push(bufferFromB64(p.inlineData.data));
        }
        if (sc.outputTranscription?.text) { outText += sc.outputTranscription.text; cb.interviewerPartial(outText.trim()); }
        if (sc.turnComplete || sc.generationComplete) {
          if (inText) flushCandidate();
          if (outText.trim()) cb.interviewerTurn(outText.trim(), false);
          outText = "";
        }
      };
      sock.onerror = () => { if (!settled) { settled = true; reject(new Error("Could not open a Gemini Live session. Check the key and that the model supports Live.")); } };
      sock.onclose = (ev) => {
        ready = false;
        if (!settled) { settled = true; reject(new Error(`Gemini Live closed: ${ev.reason || ev.code}`)); return; }
        if (!closed && !reconnecting) {
          if (handle) reconnect();
          else cb.error(new Error(`The voice session ended (${ev.reason || ev.code}).`), true);
        }
      };
    });

    let reconnecting = false;
    const reconnect = async () => {
      if (reconnecting || closed) return;
      reconnecting = true;
      try { ws?.close(); } catch { /* closing */ }
      try {
        await connect();
        cb.status("");
      } catch (e) {
        cb.error(e instanceof Error ? e : new Error(String(e)), true);
      } finally {
        reconnecting = false;
      }
    };

    await connect();
    stopCapture = await capturePcm16(stream, (pcm) => {
      if (!muted && ready) send({ realtimeInput: { audio: { data: b64FromBuffer(pcm), mimeType: "audio/pcm;rate=16000" } } });
    });

    return {
      id: "realtime",
      kind: "realtime",
      respond(note) {
        awaitingAt = performance.now();
        send({ clientContent: { turns: [{ role: "user", parts: [{ text: note }] }], turnComplete: true } });
      },
      setInstructions(text) {
        // Live sessions fix instructions at setup; the next reconnect picks them up
        instructions = text;
      },
      async sendImage(jpeg) {
        send({ realtimeInput: { video: { data: await blobToB64(jpeg), mimeType: "image/jpeg" } } });
      },
      cancelSpeech() { player.stop(); },
      mute(on) {
        muted = on;
        stream.getAudioTracks().forEach((t) => (t.enabled = !on));
        if (on) send({ realtimeInput: { audioStreamEnd: true } });
      },
      async stop() {
        closed = true;
        stopCapture?.();
        vad.close();
        player.close();
        try { ws?.close(); } catch { /* closing */ }
        stream.getTracks().forEach((t) => t.stop());
        if (agentSpeaking) cb.agentSpeaking(false);
      },
    };
  },
};
