"use client";
// OpenAI Realtime (speech-to-speech) over WebRTC, from the browser with the learner's own key.
// The key mints a short-lived client secret; only that secret is used for the call itself.

import { getKeys } from "../providers/keys";
import { getAi } from "../tasks";
import { blobToB64, openMic } from "./audio";
import type { Engine, EngineCallbacks, StartOptions } from "./types";

export const openAiRealtimeEngine: Engine = {
  id: "realtime",
  label: "Realtime voice (OpenAI)",
  unavailable: () => (getKeys().openai ? null : "Needs an OpenAI API key (Settings → AI reviewer)."),
  async start(opts: StartOptions, cb: EngineCallbacks) {
    const key = getKeys().openai;
    const rt = getAi(opts.settings).realtime;
    const session = {
      type: "realtime",
      model: rt.openaiModel,
      instructions: opts.instructions,
      audio: {
        input: {
          transcription: { model: "gpt-4o-mini-transcribe", prompt: `Technical interview. Terms: ${opts.keyterms.slice(0, 40).join(", ")}` },
          turn_detection: rt.vad === "semantic" ? { type: "semantic_vad", eagerness: "low" } : { type: "server_vad", silence_duration_ms: opts.endOfSpeechMs, prefix_padding_ms: 300 },
        },
        output: { voice: opts.voice.voiceId || rt.openaiVoice, speed: opts.voice.rate },
      },
    };
    const sec = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: 120 }, session }),
    });
    if (!sec.ok) throw new Error(`OpenAI Realtime: ${sec.status} ${(await sec.text().catch(() => "")).slice(0, 300)}`);
    const ephemeral = (await sec.json()).value as string;

    const stream = await openMic();
    const pc = new RTCPeerConnection();
    const audio = new Audio();
    audio.autoplay = true;
    pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };
    stream.getAudioTracks().forEach((t) => pc.addTrack(t, stream));
    const dc = pc.createDataChannel("oai-events");
    let outText = "", agentSpeaking = false, awaitingAt = 0, closed = false;
    const send = (m: unknown) => { if (dc.readyState === "open") dc.send(JSON.stringify(m)); };

    dc.onmessage = (ev) => {
      let m: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      try { m = JSON.parse(ev.data); } catch { return; }
      switch (m.type) {
        case "input_audio_buffer.speech_started": cb.candidateSpeaking(true); break;
        case "input_audio_buffer.speech_stopped": cb.candidateSpeaking(false); awaitingAt = performance.now(); break;
        case "conversation.item.input_audio_transcription.delta": cb.candidatePartial(String(m.delta ?? "")); break;
        case "conversation.item.input_audio_transcription.completed": if (m.transcript?.trim()) cb.candidateTurn(m.transcript.trim(), agentSpeaking); break;
        case "response.output_audio_transcript.delta": outText += m.delta ?? ""; cb.interviewerPartial(outText); break;
        case "response.output_audio_transcript.done": if ((m.transcript ?? outText).trim()) cb.interviewerTurn(String(m.transcript ?? outText).trim(), false); outText = ""; break;
        case "output_audio_buffer.started": agentSpeaking = true; cb.agentSpeaking(true); if (awaitingAt) { cb.latency("first_audio", performance.now() - awaitingAt); awaitingAt = 0; } break;
        case "output_audio_buffer.stopped": case "output_audio_buffer.cleared": agentSpeaking = false; cb.agentSpeaking(false); break;
        case "error": cb.error(new Error(String(m.error?.message ?? "OpenAI Realtime error")), false); break;
      }
    };
    pc.onconnectionstatechange = () => {
      if (!closed && (pc.connectionState === "failed" || pc.connectionState === "disconnected")) cb.error(new Error("The OpenAI voice connection dropped."), true);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const ans = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp, headers: { authorization: `Bearer ${ephemeral}`, "content-type": "application/sdp" } });
    if (!ans.ok) throw new Error(`OpenAI Realtime call failed: ${ans.status} ${(await ans.text().catch(() => "")).slice(0, 300)}`);
    await pc.setRemoteDescription({ type: "answer", sdp: await ans.text() });
    await new Promise<void>((ok, bad) => {
      const t = setTimeout(() => bad(new Error("OpenAI Realtime data channel did not open.")), 15000);
      dc.onopen = () => { clearTimeout(t); ok(); };
    });

    return {
      id: "realtime",
      kind: "realtime",
      respond(note) {
        awaitingAt = performance.now();
        send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: note }] } });
        send({ type: "response.create" });
      },
      addContext(text) {
        send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text }] } });
      },
      setInstructions(text) { send({ type: "session.update", session: { type: "realtime", instructions: text } }); },
      async sendImage(jpeg) {
        send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_image", image_url: `data:image/jpeg;base64,${await blobToB64(jpeg)}` }] } });
      },
      cancelSpeech() { send({ type: "response.cancel" }); send({ type: "output_audio_buffer.clear" }); },
      mute(on) { stream.getAudioTracks().forEach((t) => (t.enabled = !on)); },
      async stop() {
        closed = true;
        try { dc.close(); } catch { /* closed */ }
        pc.close();
        audio.srcObject = null;
        stream.getTracks().forEach((t) => t.stop());
      },
    };
  },
};
