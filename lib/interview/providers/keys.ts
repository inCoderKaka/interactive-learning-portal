"use client";
// BYOK credential source: keys live only in this browser and go only to their own provider.

const KEYS = "ascent:keys:v1";
export interface Keys { gemini: string; claude: string; openai: string; local: string }
const EMPTY: Keys = { gemini: "", claude: "", openai: "", local: "" };

export function getKeys(): Keys {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEYS) || "{}") };
  } catch {
    return { ...EMPTY };
  }
}

export function setKeys(k: Keys) {
  try {
    localStorage.setItem(KEYS, JSON.stringify(k));
  } catch {
    /* private mode: the key lasts for this page only */
  }
}

/**
 * Which credential pays for a call. Today only "byok"; a "platform" source (Ascent-paid plans) will
 * plug in here without feature code changing (ADR 0004).
 */
export type CredentialSource = "byok";
export function credentialSource(): CredentialSource {
  return "byok";
}

// ---- optional engines and transports (Phase 3) ----

/** BYO Agora project (MI-PLAN-2): sent per request to Ascent's stateless /api/agora route, never stored there. */
export interface AgoraCreds { appId: string; appCertificate: string; area: "US" | "EU" | "AP" }
const AGORA = "ascent:agora:v1";
export function getAgora(): AgoraCreds {
  try { return { appId: "", appCertificate: "", area: "US", ...JSON.parse(localStorage.getItem(AGORA) || "{}") }; } catch { return { appId: "", appCertificate: "", area: "US" }; }
}
export function setAgora(c: AgoraCreds) { try { localStorage.setItem(AGORA, JSON.stringify(c)); } catch { /* private mode */ } }
export const agoraReady = (c = getAgora()) => /^[0-9a-f]{32}$/i.test(c.appId) && /^[0-9a-f]{32}$/i.test(c.appCertificate);

/** Optional TURN relay for peer mode (MI-X-2), for networks where a direct connection fails. */
export interface TurnServer { urls: string; username: string; credential: string }
const TURN = "ascent:turn:v1";
export function getTurn(): TurnServer {
  try { return { urls: "", username: "", credential: "", ...JSON.parse(localStorage.getItem(TURN) || "{}") }; } catch { return { urls: "", username: "", credential: "" }; }
}
export function setTurn(t: TurnServer) { try { localStorage.setItem(TURN, JSON.stringify(t)); } catch { /* private mode */ } }
