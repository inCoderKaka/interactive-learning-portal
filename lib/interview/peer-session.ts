"use client";
// Peer mode (MI-X-2, architecture §4.5): two learners, one call. Browser-to-browser WebRTC audio and a
// data channel; signalling over a Supabase Realtime broadcast channel named by a room code. Each
// browser transcribes its own microphone and shares finished lines, so both build the same transcript.
// The candidate's browser drafts the AI scorecard with the candidate's own key at the end.

import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Reassembler, encode, mergeElements, signalChannel, type PeerMsg, type PeerRole } from "./core/peer";

type BoardEl = { id: string; version: number; versionNonce?: number };
import { digestText } from "./core/digest";
import type { InterviewQuestion, LoggedEvent, SessionEvent } from "./core/types";
import { getTurn } from "./providers/keys";

type Signal =
  | { type: "join"; from: string }
  | { type: "offer"; from: string; to: string; sdp: string }
  | { type: "answer"; from: string; to: string; sdp: string }
  | { type: "ice"; from: string; to: string; candidate: RTCIceCandidateInit }
  | { type: "bye"; from: string };

export interface PeerView {
  stage: "connecting" | "waiting" | "ready" | "live" | "ended";
  peerName: string; peerRole: PeerRole | null; peerConsent: boolean;
  lines: { seq: number; t: number; role: PeerRole; text: string }[];
  partial: Partial<Record<PeerRole, string>>;
  presented: string; question: InterviewQuestion | null; minutes: number; startedAt: number;
  code: string; notes: string; board: unknown[];
  speaking: boolean; remoteSpeaking: boolean; muted: boolean;
  error: string; status: string; feedback: { decision: string; notes: string } | null;
}

type SR = new () => { continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null; start(): void; abort(): void };

export class PeerSession {
  readonly me = crypto.randomUUID();
  readonly role: PeerRole;
  readonly code: string;
  readonly host: boolean;
  private name: string;
  private ch: RealtimeChannel | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private other = "";
  private mic: MediaStream | null = null;
  private remoteAudio = new Audio();
  private rec: InstanceType<SR> | null = null;
  private recOn = false;
  private reasm = new Reassembler();
  private seq = 0;
  readonly log: LoggedEvent[] = [];
  private prevDoc = { code: "", notes: "" };
  private lang: string;
  private view: PeerView;
  private listeners = new Set<(v: PeerView) => void>();
  private msgId = 0;
  private levelTimer: ReturnType<typeof setInterval> | undefined;
  remoteStream: MediaStream | null = null;

  constructor(opts: { role: PeerRole; code: string; host: boolean; name: string; lang: string; question?: InterviewQuestion; minutes?: number }) {
    this.role = opts.role;
    this.code = opts.code;
    this.host = opts.host;
    this.name = opts.name || (opts.role === "interviewer" ? "Interviewer" : "Candidate");
    this.lang = opts.lang;
    this.remoteAudio.autoplay = true;
    this.view = {
      stage: "connecting", peerName: "", peerRole: null, peerConsent: false, lines: [], partial: {}, presented: "", question: opts.question ?? null,
      minutes: opts.minutes ?? 45, startedAt: 0, code: "", notes: "", board: [], speaking: false, remoteSpeaking: false, muted: false, error: "", status: "", feedback: null,
    };
  }

  subscribe(fn: (v: PeerView) => void) { this.listeners.add(fn); fn(this.view); return () => { this.listeners.delete(fn); }; }
  private emit(p: Partial<PeerView> = {}) { this.view = { ...this.view, ...p }; for (const l of this.listeners) l(this.view); }
  get state() { return this.view; }
  now() { return this.view.startedAt ? Date.now() - this.view.startedAt : 0; }

  private record(e: SessionEvent) { this.log.push({ seq: ++this.seq, t: this.now(), e }); }

  async join() {
    const sb = supabase();
    if (!sb) throw new Error("Peer mode needs Ascent's cloud connection (Supabase) for the call set-up.");
    this.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const ch = sb.channel(signalChannel(this.code), { config: { broadcast: { self: false, ack: false } } });
    this.ch = ch;
    ch.on("broadcast", { event: "sig" }, ({ payload }) => void this.onSignal(payload as Signal));
    await new Promise<void>((ok, bad) => {
      const t = setTimeout(() => bad(new Error("Could not reach the call set-up service.")), 12000);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") { clearTimeout(t); ok(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(t); bad(new Error(`Call set-up failed (${status.toLowerCase()}).`)); }
      });
    });
    this.emit({ stage: "waiting", status: this.host ? `Share the code ${this.code} with your partner.` : "Connecting to your partner…" });
    this.signal({ type: "join", from: this.me });
  }

  private signal(s: Signal) { void this.ch?.send({ type: "broadcast", event: "sig", payload: s }); }

  private makePc() {
    const turn = getTurn();
    const ice: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
    if (turn.urls) ice.push({ urls: turn.urls.split(",").map((u) => u.trim()), username: turn.username, credential: turn.credential });
    const pc = new RTCPeerConnection({ iceServers: ice });
    this.pc = pc;
    for (const t of this.mic!.getAudioTracks()) pc.addTrack(t, this.mic!);
    pc.ontrack = (e) => { this.remoteStream = e.streams[0]; this.remoteAudio.srcObject = e.streams[0]; this.watchLevels(); };
    pc.onicecandidate = (e) => { if (e.candidate && this.other) this.signal({ type: "ice", from: this.me, to: this.other, candidate: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") this.emit({ error: "The direct connection failed. If one of you is on a strict network, add a TURN relay in Settings → Voice and AI quality." });
      if (pc.connectionState === "disconnected" && this.view.stage === "live") this.emit({ status: "Your partner's connection dropped. Waiting…" });
      if (pc.connectionState === "connected") this.emit({ status: "" });
    };
    pc.ondatachannel = (e) => this.useChannel(e.channel);
    return pc;
  }

  private useChannel(dc: RTCDataChannel) {
    this.dc = dc;
    dc.onopen = () => this.send({ k: "hello", role: this.role, name: this.name, consent: true });
    dc.onmessage = (e) => { const m = this.reasm.push(String(e.data)); if (m) this.onMsg(m); };
  }

  private async onSignal(s: Signal) {
    if (s.from === this.me) return;
    if ("to" in s && s.to !== this.me) return;
    try {
      if (s.type === "join") {
        if (this.other && this.other !== s.from) return; // the room is full
        this.other = s.from;
        if (!this.host) { if (!this.pc) this.signal({ type: "join", from: this.me }); return; } // let the host offer
        if (this.pc) return; // already negotiating with this peer
        const pc = this.makePc();
        this.useChannel(pc.createDataChannel("ascent", { ordered: true }));
        await pc.setLocalDescription(await pc.createOffer());
        this.signal({ type: "offer", from: this.me, to: s.from, sdp: pc.localDescription!.sdp });
      } else if (s.type === "offer" && !this.host) {
        this.other = s.from;
        const pc = this.pc ?? this.makePc();
        await pc.setRemoteDescription({ type: "offer", sdp: s.sdp });
        await pc.setLocalDescription(await pc.createAnswer());
        this.signal({ type: "answer", from: this.me, to: s.from, sdp: pc.localDescription!.sdp });
      } else if (s.type === "answer" && this.host) {
        await this.pc?.setRemoteDescription({ type: "answer", sdp: s.sdp });
      } else if (s.type === "ice") {
        await this.pc?.addIceCandidate(s.candidate).catch(() => {});
      } else if (s.type === "bye") {
        this.emit({ status: "Your partner left the call." });
        if (this.view.stage === "live") void this.end(false);
      }
    } catch (e) { this.emit({ error: e instanceof Error ? e.message : String(e) }); }
  }

  send(m: PeerMsg) {
    if (this.dc?.readyState !== "open") return;
    for (const part of encode(m, `${this.me.slice(0, 8)}-${++this.msgId}`)) this.dc.send(part);
  }

  private onMsg(m: PeerMsg) {
    switch (m.k) {
      case "hello":
        if (m.role === this.role) { this.emit({ error: `You both chose to be the ${m.role}. One of you should rejoin with the other role.` }); return; }
        this.emit({ peerName: m.name, peerRole: m.role, peerConsent: m.consent, stage: m.consent ? "ready" : "waiting", status: "" });
        return;
      case "start":
        this.emit({ stage: "live", minutes: m.minutes, startedAt: Date.now(), question: m.question as InterviewQuestion });
        this.startTranscription();
        return;
      case "present": this.emit({ presented: m.statement }); return;
      case "line": this.addLine(m.role, m.text); return;
      case "partial": this.emit({ partial: { ...this.view.partial, [m.role]: m.text } }); return;
      case "doc": this.applyDoc(m.surface, m.text); return;
      case "board": this.emit({ board: mergeElements(this.view.board as BoardEl[], m.elements as BoardEl[]) }); return;
      case "think": this.record({ type: "thinking.pause", on: m.on }); return;
      case "end": void this.end(false); return;
      case "feedback": this.emit({ feedback: { decision: m.decision, notes: m.notes } }); return;
    }
  }

  /** Interviewer: start the round for both. */
  start(question: InterviewQuestion, minutes: number) {
    this.emit({ stage: "live", minutes, startedAt: Date.now(), question });
    this.send({ k: "start", minutes, kind: question.kind, question });
    this.record({ type: "phase.changed", from: "lobby", to: "problem" });
    this.startTranscription();
  }

  present() { const q = this.view.question; if (q) { this.send({ k: "present", statement: q.statement }); this.emit({ presented: q.statement }); } }

  private addLine(role: PeerRole, text: string) {
    const t = text.trim();
    if (!t) return;
    this.record(role === "interviewer" ? { type: "turn.interviewer", text: t, origin: "reply" } : { type: "turn.candidate", text: t });
    this.emit({ lines: [...this.view.lines, { seq: this.seq, t: this.now(), role, text: t }], partial: { ...this.view.partial, [role]: "" } });
  }

  /** Typed lines go through the same path as speech. */
  say(text: string) { this.addLine(this.role, text); this.send({ k: "line", role: this.role, text }); }

  private startTranscription() {
    const w = globalThis as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!C) { this.emit({ status: "This browser cannot transcribe speech: type key points in the chat so the AI observer can follow." }); return; }
    const rec = new C();
    rec.continuous = true; rec.interimResults = true; rec.lang = this.lang;
    let lastPartial = 0;
    rec.onresult = (e) => {
      let fin = "", interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript; }
      if (fin.trim()) { this.addLine(this.role, fin); this.send({ k: "line", role: this.role, text: fin }); }
      if (interim && Date.now() - lastPartial > 300) { lastPartial = Date.now(); this.emit({ partial: { ...this.view.partial, [this.role]: interim } }); this.send({ k: "partial", role: this.role, text: interim }); }
    };
    rec.onend = () => { if (this.recOn && !this.view.muted) setTimeout(() => { try { rec.start(); } catch { /* running */ } }, 150); };
    rec.onerror = (e) => { if (e.error === "not-allowed") this.emit({ error: "Speech recognition was blocked. Allow the microphone for this site." }); };
    this.rec = rec;
    this.recOn = true;
    try { rec.start(); } catch { /* running */ }
  }

  private watchLevels() {
    clearInterval(this.levelTimer);
    const ctx = new AudioContext();
    const meter = (s: MediaStream) => { const a = ctx.createAnalyser(); a.fftSize = 512; ctx.createMediaStreamSource(s).connect(a); return a; };
    const mine = meter(this.mic!), theirs = this.remoteStream ? meter(this.remoteStream) : null;
    const buf = new Float32Array(512);
    const rms = (a: AnalyserNode) => { a.getFloatTimeDomainData(buf); let x = 0; for (const v of buf) x += v * v; return Math.sqrt(x / buf.length); };
    this.levelTimer = setInterval(() => {
      const me = rms(mine) > 0.02 && !this.view.muted, them = theirs ? rms(theirs) > 0.02 : false;
      if (me !== this.view.speaking || them !== this.view.remoteSpeaking) this.emit({ speaking: me, remoteSpeaking: them });
    }, 150);
  }

  /** Candidate: share the workspace with the interviewer. */
  shareDoc(surface: "code" | "notes", text: string) {
    this.send({ k: "doc", surface, text });
    this.applyDoc(surface, text);
  }
  shareBoard(elements: unknown[], digest?: { diff: string; full: string }) {
    this.send({ k: "board", elements });
    this.emit({ board: elements });
    if (digest) this.record({ type: "digest", surface: "whiteboard", diff: digest.diff, full: digest.full });
  }
  private applyDoc(surface: "code" | "notes", text: string) {
    const d = digestText(surface, this.prevDoc[surface], text);
    if (d) { this.prevDoc[surface] = text; this.record({ type: "digest", surface, diff: d.diff, full: d.full }); }
    this.emit(surface === "code" ? { code: text } : { notes: text });
  }

  thinking(on: boolean) { this.send({ k: "think", on }); this.record({ type: "thinking.pause", on }); }

  mute(on: boolean) {
    this.mic?.getAudioTracks().forEach((t) => (t.enabled = !on));
    this.emit({ muted: on });
    if (on) { this.recOn = false; try { this.rec?.abort(); } catch { /* idle */ } }
    else if (this.view.stage === "live" && this.rec) { this.recOn = true; try { this.rec.start(); } catch { /* running */ } }
  }

  sendFeedback(decision: string, notes: string) { this.send({ k: "feedback", decision, notes }); }

  async end(notify = true) {
    if (this.view.stage === "ended") return;
    if (notify) this.send({ k: "end" });
    this.recOn = false;
    try { this.rec?.abort(); } catch { /* idle */ }
    this.record({ type: "session.ended", reason: "candidate" });
    this.emit({ stage: "ended", speaking: false, remoteSpeaking: false });
  }

  /** Leave the call entirely (after feedback has been exchanged). */
  async leave() {
    await this.end();
    clearInterval(this.levelTimer);
    this.signal({ type: "bye", from: this.me });
    setTimeout(() => { this.dc?.close(); this.pc?.close(); this.mic?.getTracks().forEach((t) => t.stop()); this.remoteAudio.srcObject = null; void this.ch?.unsubscribe(); }, 1500);
  }
}
