// Live transcripts from an Agora conversational agent arrive as RTC stream messages, split into parts
// ("messageId|partIndex|partCount|base64 JSON"). This reassembles them and reads the few fields we need,
// tolerating missing ones, since the payload is not under our control. Pure.

export interface AgoraLine { role: "user" | "agent"; text: string; final: boolean; interrupted: boolean; turn: number }
export type AgoraState = "idle" | "listening" | "thinking" | "speaking" | "silent";

const b64 = (s: string): string => {
  const bin = typeof atob === "function" ? atob(s) : Buffer.from(s, "base64").toString("binary");
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export class AgoraTranscripts {
  private parts = new Map<string, { n: number; got: Map<number, string>; at: number }>();

  /** Feed one stream message; returns the decoded JSON object once all its parts are in. */
  push(raw: string, now = Date.now()): Record<string, unknown> | null {
    const m = raw.match(/^([^|]+)\|(\d+)\|(\d+)\|([\s\S]*)$/);
    if (!m) { try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; } }
    const [, id, idx, count, data] = m;
    const p = this.parts.get(id) ?? { n: +count, got: new Map(), at: now };
    p.got.set(+idx, data);
    this.parts.set(id, p);
    for (const [k, v] of this.parts) if (now - v.at > 30000) this.parts.delete(k); // drop stragglers
    if (p.got.size < p.n) return null;
    this.parts.delete(id);
    const joined = [...p.got.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v).join("");
    try { return JSON.parse(b64(joined)) as Record<string, unknown>; } catch { return null; }
  }
}

/** A transcript line, if the object is one. */
export function readLine(o: Record<string, unknown>): AgoraLine | null {
  const kind = String(o.object ?? "");
  const text = typeof o.text === "string" ? o.text : "";
  const turn = Number(o.turn_id ?? 0);
  const status = Number(o.turn_status ?? -1);
  if (kind === "user.transcription") return { role: "user", text, final: o.final === true || status === 1, interrupted: false, turn };
  if (kind === "assistant.transcription") return { role: "agent", text, final: status === 1 || status === 2, interrupted: status === 2, turn };
  return null;
}

/** The agent's state, if the object is a state message. */
export function readState(o: Record<string, unknown>): AgoraState | null {
  if (String(o.object ?? "") !== "message.state") return null;
  const s = String(o.state ?? "");
  return (["idle", "listening", "thinking", "speaking", "silent"] as const).find((x) => x === s) ?? null;
}
