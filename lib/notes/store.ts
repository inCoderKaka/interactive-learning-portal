"use client";
// Portal notes store: IndexedDB first (works signed out), mirrored to Supabase `portal_notes`.
// Newest `updated` wins on merge; deletions are tombstones so they reach other devices.

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { idbAll, idbClear, idbPut, idbPutMany } from "./idb";
import { uploadMedia } from "./media";
import type { NoteBlock, PortalNote } from "./types";
import { uid } from "./types";

interface NotesState {
  notes: Record<string, PortalNote>;
  ready: boolean;
  /** note to open and scroll to on the next page render (from the Notes tab) */
  focus: string | null;
  cloudMissing: boolean; // the portal_notes table is not deployed yet: stay local
  init: () => void;
  upsert: (n: PortalNote) => void;
  upsertMany: (ns: PortalNote[]) => void;
  patch: (id: string, p: Partial<PortalNote>) => void;
  remove: (id: string) => void;
  restore: (id: string) => void;
  setFocus: (id: string | null) => void;
}

const pushQueue = new Map<string, PortalNote>();
let pushTimer: ReturnType<typeof setTimeout> | undefined;

function schedulePush(ns: PortalNote[]) {
  for (const n of ns) pushQueue.set(n.id, n);
  clearTimeout(pushTimer);
  pushTimer = setTimeout(flushPush, 900);
}

async function flushPush() {
  const sb = supabase(), u = useStore.getState().user?.id;
  if (!sb || !u || useNotes.getState().cloudMissing) return;
  const batch = [...pushQueue.values()];
  pushQueue.clear();
  for (let i = 0; i < batch.length; i += 100) {
    const rows = batch.slice(i, i + 100).map((n) => ({ user_id: u, id: n.id, data: n, updated_at: new Date(n.updated).toISOString() }));
    const { error } = await sb.from("portal_notes").upsert(rows);
    if (error) {
      if (/portal_notes|relation|schema cache/i.test(error.message)) useNotes.setState({ cloudMissing: true });
      else useStore.setState({ syncError: error.message });
      return;
    }
  }
  for (const n of batch) for (const b of n.blocks) if (b.t !== "text") void uploadMedia(b.media);
}

async function syncNotes() {
  const sb = supabase(), u = useStore.getState().user?.id;
  if (!sb || !u) return;
  const { data, error } = await sb.from("portal_notes").select("id, data").eq("user_id", u);
  if (error) {
    if (/portal_notes|relation|schema cache/i.test(error.message)) useNotes.setState({ cloudMissing: true });
    return;
  }
  const local = { ...useNotes.getState().notes };
  const remote = new Map((data ?? []).map((r) => [r.id as string, r.data as PortalNote]));
  const toSave: [string, PortalNote][] = [];
  for (const [id, r] of remote) if (!local[id] || r.updated > local[id].updated) { local[id] = r; toSave.push([id, r]); }
  const toPush = Object.values(local).filter((n) => !remote.has(n.id) || remote.get(n.id)!.updated < n.updated);
  useNotes.setState({ notes: local });
  if (toSave.length) await idbPutMany("notes", toSave).catch(() => {});
  if (toPush.length) schedulePush(toPush);
}

let started = false;

export const useNotes = create<NotesState>()((set, get) => ({
  notes: {},
  ready: false,
  focus: null,
  cloudMissing: false,

  init() {
    if (started || typeof window === "undefined") return;
    started = true;
    idbAll<PortalNote>("notes")
      .then((all) => set({ notes: Object.fromEntries(all.map((n) => [n.id, n])), ready: true }))
      .catch(() => set({ ready: true }));
    let prev = useStore.getState().user?.id;
    if (prev) setTimeout(syncNotes, 0);
    useStore.subscribe((s) => {
      const cur = s.user?.id;
      if (cur === prev) return;
      if (cur) setTimeout(syncNotes, 0);
      else if (prev) { set({ notes: {} }); void idbClear("notes"); } // signed out: the next person must not see these
      prev = cur;
    });
  },

  upsert(n) {
    set((s) => ({ notes: { ...s.notes, [n.id]: n } }));
    void idbPut("notes", n.id, n);
    schedulePush([n]);
  },

  upsertMany(ns) {
    if (!ns.length) return;
    set((s) => { const notes = { ...s.notes }; for (const n of ns) notes[n.id] = n; return { notes }; });
    void idbPutMany("notes", ns.map((n) => [n.id, n]));
    schedulePush(ns);
  },

  patch(id, p) {
    const cur = get().notes[id];
    if (!cur) return;
    get().upsert({ ...cur, ...p, updated: Date.now() });
  },

  remove(id) {
    get().patch(id, { deleted: Date.now() });
  },

  restore(id) {
    get().patch(id, { deleted: undefined });
  },

  setFocus(id) { set({ focus: id }); },
}));

export const textBlock = (md = ""): NoteBlock => ({ id: uid(), t: "text", md });

export function useLiveNotes() {
  const notes = useNotes((s) => s.notes);
  return Object.values(notes).filter((n) => !n.deleted);
}
