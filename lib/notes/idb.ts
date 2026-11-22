"use client";
// A tiny IndexedDB wrapper. Notes, media blobs and import runs are too large for localStorage.

const DB = "ascent-notes";
const VERSION = 1;
export type StoreName = "notes" | "media" | "runs";

let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((ok, fail) => {
    if (typeof indexedDB === "undefined") return fail(new Error("IndexedDB is not available in this browser."));
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      for (const s of ["notes", "media", "runs"]) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
  dbp.catch(() => { dbp = null; });
  return dbp;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then((d) => new Promise<T | undefined>((ok, fail) => {
    const t = d.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => ok(r ? (r.result as T) : undefined);
    t.onerror = () => fail(t.error);
    t.onabort = () => fail(t.error);
  }));
}

export const idbGet = <T>(store: StoreName, key: string) => tx<T>(store, "readonly", (s) => s.get(key) as IDBRequest<T>);
export const idbPut = (store: StoreName, key: string, value: unknown) => tx(store, "readwrite", (s) => { s.put(value, key); });
export const idbDel = (store: StoreName, key: string) => tx(store, "readwrite", (s) => { s.delete(key); });
export const idbAll = <T>(store: StoreName) => tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>).then((x) => x ?? []);
export const idbKeys = (store: StoreName) => tx<IDBValidKey[]>(store, "readonly", (s) => s.getAllKeys()).then((x) => (x ?? []).map(String));
export const idbClear = (store: StoreName) => tx(store, "readwrite", (s) => { s.clear(); });

/** Write many entries in one transaction. */
export function idbPutMany(store: StoreName, entries: [string, unknown][]) {
  return tx(store, "readwrite", (s) => { for (const [k, v] of entries) s.put(v, k); });
}
