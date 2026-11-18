"use client";
// Opt-in round recording (MI-FB-2). Mixes the candidate's microphone with the interviewer's audio when
// the engine exposes it, and records in the browser with MediaRecorder: no server cost.

export class RoundRecorder {
  private ctx: AudioContext;
  private dest: MediaStreamAudioDestinationNode;
  private rec: MediaRecorder;
  private chunks: Blob[] = [];
  private mic: MediaStream;
  private sources: MediaStreamAudioSourceNode[] = [];
  readonly startedAt = Date.now();
  /** True once an interviewer audio stream has been mixed in. */
  interviewerAudio = false;

  private constructor(mic: MediaStream) {
    this.mic = mic;
    this.ctx = new AudioContext();
    this.dest = this.ctx.createMediaStreamDestination();
    this.add(mic);
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
    this.rec = new MediaRecorder(this.dest.stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.start(5000);
  }

  static supported() { return typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia; }

  static async start(): Promise<RoundRecorder> {
    const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    return new RoundRecorder(mic);
  }

  private add(stream: MediaStream) {
    if (!stream.getAudioTracks().length) return;
    const src = this.ctx.createMediaStreamSource(stream);
    src.connect(this.dest);
    this.sources.push(src);
  }

  /** Mix in the interviewer's voice (called again after an engine fallback). */
  addOutput(stream: MediaStream) {
    this.add(stream);
    this.interviewerAudio = true;
  }

  async stop(): Promise<Blob | null> {
    if (this.rec.state !== "inactive") {
      await new Promise<void>((ok) => { this.rec.onstop = () => ok(); this.rec.stop(); });
    }
    for (const s of this.sources) s.disconnect();
    this.mic.getTracks().forEach((t) => t.stop());
    this.ctx.close().catch(() => {});
    return this.chunks.length ? new Blob(this.chunks, { type: this.rec.mimeType || "audio/webm" }) : null;
  }
}
