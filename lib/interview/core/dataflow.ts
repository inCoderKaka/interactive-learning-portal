// "What leaves this device" (MI-X-6, architecture §8): for a chosen setup, which services receive the
// learner's voice, transcript and workspace, and recordings. Shown before every round. Pure.

export type SttKind = "webspeech" | "webspeech-local" | "whisper-local" | "openai";
export type TtsKind = "browser" | "browser-local" | "openai";

export interface FlowInput {
  engine: "text" | "ascent-voice" | "realtime" | "agora";
  stt: SttKind;
  tts: TtsKind;
  llm: string[];                 // providers used by the round's tasks, e.g. ["gemini"] or ["local"]
  realtime?: "gemini" | "openai";
  recordAudio: boolean;
  recordCloud: boolean;
  signedIn: boolean;
  peer?: boolean;
}

export interface Flow { data: string; to: string[] } // to: [] = stays on this device

const NAME: Record<string, string> = { gemini: "Google (Gemini API)", claude: "Anthropic (Claude API)", openai: "OpenAI", local: "your local model server" };

export function dataFlow(f: FlowInput): Flow[] {
  const out: Flow[] = [];
  const llm = [...new Set(f.llm.map((p) => NAME[p] ?? p))];
  if (f.engine === "realtime") {
    const p = f.realtime === "openai" ? "OpenAI (Realtime)" : "Google (Gemini Live)";
    out.push({ data: "Your voice", to: [p] });
    out.push({ data: "Transcript, whiteboard and code", to: [...new Set([p, ...llm])] });
  } else if (f.engine === "agora") {
    out.push({ data: "Your voice", to: ["Agora (speech pipeline and its STT, LLM and TTS vendors)"] });
    out.push({ data: "Transcript, whiteboard and code", to: ["Agora", "Ascent's server (relays your Agora credentials per request, stores nothing)", ...llm] });
  } else if (f.engine === "ascent-voice") {
    const stt = f.stt === "openai" ? ["OpenAI (transcription)"] : f.stt === "webspeech" ? ["Google (Chrome speech recognition), unless your browser recognises speech on-device"] : [];
    out.push({ data: "Your voice", to: stt });
    out.push({ data: "Transcript, whiteboard and code", to: llm });
    if (f.tts === "openai") out.push({ data: "The interviewer's lines (for speech)", to: ["OpenAI (text-to-speech)"] });
  } else {
    out.push({ data: "What you type, your whiteboard and code", to: llm });
  }
  if (f.peer) out.push({ data: "Your voice and workspace", to: ["the other learner's browser (direct connection; a TURN relay only if your network needs one)"] });
  if (f.recordAudio) out.push({ data: "Recording", to: f.recordCloud ? ["your private Ascent storage (Supabase)"] : [] });
  out.push({ data: "Round history and scorecard", to: f.signedIn ? ["your Ascent account (Supabase)"] : [] });
  return out;
}

/** True when nothing but the local model server (if any) receives data: privacy mode's promise. */
export function staysLocal(flows: Flow[]): boolean {
  return flows.every((f) => f.to.every((t) => t === NAME.local));
}
