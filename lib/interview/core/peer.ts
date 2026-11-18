// Peer mode (MI-X-2): two learners interview each other over a browser-to-browser call. Pure parts:
// room codes, the data-channel protocol with chunking, and the whiteboard merge.

export type PeerRole = "interviewer" | "candidate";

export type PeerMsg =
  | { k: "hello"; role: PeerRole; name: string; consent: boolean }
  | { k: "start"; minutes: number; kind: string; question: unknown }   // interviewer → candidate (question kept hidden; used for scoring)
  | { k: "present"; statement: string }                                  // interviewer shows the question
  | { k: "line"; role: PeerRole; text: string }                          // a finished transcript line from the speaker's own browser
  | { k: "partial"; role: PeerRole; text: string }
  | { k: "doc"; surface: "code" | "notes"; text: string }                // candidate → interviewer
  | { k: "board"; elements: unknown[] }
  | { k: "think"; on: boolean }
  | { k: "end" }
  | { k: "feedback"; decision: string; notes: string };                  // interviewer → candidate, after the round

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

export function roomCode(random: () => number = Math.random, n = 6): string {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return s;
}
export const normaliseCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const validCode = (s: string) => new RegExp(`^[${ALPHABET}]{6}$`).test(s);
export const signalChannel = (code: string) => `ascent-peer-${code}`;

/** Data channels have per-message size limits; split large messages and put them back together. */
export const CHUNK = 12000;
export function encode(m: PeerMsg, id: string): string[] {
  const body = JSON.stringify(m);
  if (body.length <= CHUNK) return [`1|${body}`];
  const n = Math.ceil(body.length / CHUNK);
  return Array.from({ length: n }, (_, i) => `c|${id}|${i}|${n}|${body.slice(i * CHUNK, (i + 1) * CHUNK)}`);
}

export class Reassembler {
  private parts = new Map<string, string[]>();
  /** Returns the message once complete, else null. */
  push(raw: string): PeerMsg | null {
    if (raw.startsWith("1|")) return JSON.parse(raw.slice(2)) as PeerMsg;
    const m = raw.match(/^c\|([^|]+)\|(\d+)\|(\d+)\|([\s\S]*)$/);
    if (!m) return null;
    const [, id, i, n, body] = m;
    const arr = this.parts.get(id) ?? new Array<string>(+n);
    arr[+i] = body;
    this.parts.set(id, arr);
    if (arr.filter((x) => x !== undefined).length < +n) return null;
    this.parts.delete(id);
    return JSON.parse(arr.join("")) as PeerMsg;
  }
}

interface El { id: string; version: number; versionNonce?: number; isDeleted?: boolean }

/** Merge two whiteboard scenes element by element: the higher version wins, ties broken by nonce. */
export function mergeElements<T extends El>(local: readonly T[], remote: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const e of local) byId.set(e.id, e);
  for (const r of remote) {
    const l = byId.get(r.id);
    if (!l || r.version > l.version || (r.version === l.version && (r.versionNonce ?? 0) < (l.versionNonce ?? 0))) byId.set(r.id, r);
  }
  return [...byId.values()];
}

export const CONSENT_TEXT = "I agree that this call is transcribed in each of our browsers, that an AI observer drafts feedback for the candidate from the transcript and workspace, and that audio is not recorded.";
