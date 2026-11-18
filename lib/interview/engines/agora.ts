"use client";
// Optional Agora engine (MI-PLAN-2, architecture §4.4, agora-managed sub-mode). The browser joins an
// Agora RTC channel with Agora's own SDK; Ascent's stateless /api/agora route starts an Agora-managed
// agent (STT → LLM → TTS) with the brain's instructions. Notes and cues go in through "think", workspace
// context through a system-prompt update. Built on Agora's published SDKs (agora-rtc-sdk-ng,
// agora-agents); the approach follows the agent-quickstart-nextjs reference, credited in the README.

import { AgoraTranscripts, readLine, readState } from "../core/agora-transcript";
import { agoraReady, getAgora } from "../providers/keys";
import type { Engine, EngineCallbacks, StartOptions } from "./types";

const AGENT_UID = "100001";

async function call(action: string, body: object): Promise<Record<string, unknown>> {
  const r = await fetch(`/api/agora/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error(String(j.error ?? `Agora ${action} failed (${r.status})`));
  return j;
}

export const agoraEngine: Engine = {
  id: "agora",
  label: "Agora",
  unavailable: () => (typeof window === "undefined" ? "Needs a browser." : agoraReady() ? null : "Needs your Agora App ID and App Certificate (Settings → Voice and AI quality)."),
  async start(opts: StartOptions, cb: EngineCallbacks) {
    const creds = getAgora();
    const channel = `ascent-${crypto.randomUUID().slice(0, 18)}`;
    const userUid = String(200000 + Math.floor(Math.random() * 700000));
    const base = { creds, channel, agentUid: AGENT_UID };
    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
    AgoraRTC.setLogLevel(3);
    const started = await call("start", { ...base, userUid, instructions: opts.instructions, voice: opts.voice.voiceId, endOfSpeechMs: opts.endOfSpeechMs, maxMinutes: 75 });
    const agentId = String(started.agentId);
    const ids = { ...base, agentId };

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    const tx = new AgoraTranscripts();
    let output: MediaStream | undefined, agentSpeaking = false, closed = false, muted = false, awaitingAt = 0;
    let instructions = opts.instructions;
    const notes: string[] = [];
    let updateTimer: ReturnType<typeof setTimeout> | undefined;

    const setSpeaking = (on: boolean) => {
      if (on === agentSpeaking) return;
      agentSpeaking = on;
      cb.agentSpeaking(on);
      if (on && awaitingAt) { cb.latency("first_audio", performance.now() - awaitingAt); awaitingAt = 0; }
    };

    client.on("user-published", async (user, mediaType) => {
      if (String(user.uid) !== AGENT_UID || mediaType !== "audio") return;
      await client.subscribe(user, mediaType);
      user.audioTrack?.play();
      const t = user.audioTrack?.getMediaStreamTrack();
      if (t) output = new MediaStream([t]);
    });
    client.on("user-left", (user) => { if (!closed && String(user.uid) === AGENT_UID) cb.error(new Error("The Agora agent left the call."), true); });
    client.on("stream-message", (_uid: number | string, payload: Uint8Array) => {
      const o = tx.push(new TextDecoder().decode(payload));
      if (!o) return;
      const st = readState(o);
      if (st) { setSpeaking(st === "speaking"); return; }
      const l = readLine(o);
      if (!l || muted && l.role === "user") return;
      if (l.role === "user") {
        if (l.final) { if (l.text.trim()) cb.candidateTurn(l.text.trim(), agentSpeaking); awaitingAt = performance.now(); }
        else cb.candidatePartial(l.text);
      } else if (l.final) { if (l.text.trim()) cb.interviewerTurn(l.text.trim(), l.interrupted); }
      else cb.interviewerPartial(l.text);
    });
    client.enableAudioVolumeIndicator();
    client.on("volume-indicator", (vols: { uid: number | string; level: number }[]) => {
      const me = vols.find((v) => String(v.uid) === userUid || v.uid === 0);
      if (me && !muted) cb.candidateSpeaking(me.level > 8);
      const ag = vols.find((v) => String(v.uid) === AGENT_UID);
      if (ag) setSpeaking(ag.level > 5);
    });
    client.on("connection-state-change", (cur) => { if (!closed && cur === "DISCONNECTED") cb.error(new Error("The Agora connection dropped."), true); });

    await client.join(String(started.appId), channel, String(started.token), Number(userUid));
    const mic = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
    await client.publish([mic]);

    // stop the agent even if the tab closes (the agent's idle timeout is the last line of defence)
    const beacon = () => navigator.sendBeacon("/api/agora/stop", new Blob([JSON.stringify(ids)], { type: "application/json" }));
    window.addEventListener("pagehide", beacon);

    const pushContext = () => {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        void call("update", { ...ids, system: `${instructions}\n\n# What the candidate's workspace shows now (for you only)\n${notes.join("\n\n")}` }).catch((e) => cb.error(e, false));
      }, 4000);
    };

    return {
      id: "agora",
      kind: "realtime",
      get output() { return output; },
      respond(note) {
        awaitingAt = performance.now();
        void call("think", { ...ids, text: note }).catch((e) => cb.error(e, false));
      },
      addContext(text) {
        notes.push(text.slice(0, 2500));
        while (notes.length > 3) notes.shift();
        pushContext();
      },
      setInstructions(text) { instructions = text; pushContext(); },
      cancelSpeech() { /* the agent stops when the candidate talks over it */ },
      mute(on) { muted = on; void mic.setEnabled(!on); },
      async stop() {
        closed = true;
        clearTimeout(updateTimer);
        window.removeEventListener("pagehide", beacon);
        try { await call("stop", ids); } catch { /* the idle timeout ends it */ }
        mic.close();
        await client.leave().catch(() => {});
      },
    };
  },
};
