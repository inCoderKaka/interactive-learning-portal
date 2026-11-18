"use client";
// Local media store for replay (MI-FB-2): recordings and whiteboard frames in IndexedDB, on this device
// only, deleted after the retention period. Cloud backup is a separate opt-in (sync.ts).

import type { Frame } from "./session";

export const MEDIA_RETENTION_DAYS = 30;

export interface RoundMedia {
  id: string;            // session id
  at: number;
  audio?: Blob;
  audioOffsetMs: number; // recording start relative to the round's t = 0
  interviewerAudio: boolean;
  frames: Frame[];
}

const DB = "ascent-interviews", STORE = "media";

function open(): Promise<IDBDatabase> {
  return new Promise((ok, bad) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: "id" }); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => bad(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((ok, bad) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => ok(req.result);
      req.onerror = () => bad(req.error);
    });
  } finally { db.close(); }
}

export const saveMedia = (m: RoundMedia) => tx("readwrite", (s) => s.put(m)).then(() => undefined);
export const loadMedia = (id: string) => tx<RoundMedia | undefined>("readonly", (s) => s.get(id) as IDBRequest<RoundMedia | undefined>).catch(() => undefined);
export const deleteMedia = (id: string) => tx("readwrite", (s) => s.delete(id)).then(() => undefined);

export async function mediaIds(): Promise<Set<string>> {
  try { return new Set((await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys())).map(String)); } catch { return new Set(); }
}

/** Delete recordings older than the retention period. */
export async function pruneMedia(now = Date.now()) {
  try {
    const all = await tx<RoundMedia[]>("readonly", (s) => s.getAll() as IDBRequest<RoundMedia[]>);
    for (const m of all) if (now - m.at > MEDIA_RETENTION_DAYS * 86400000) await deleteMedia(m.id);
  } catch { /* IndexedDB unavailable: nothing stored */ }
}
