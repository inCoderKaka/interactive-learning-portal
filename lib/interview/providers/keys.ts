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
