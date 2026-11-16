"use client";
import { create } from "zustand";
import type { Attempt, DayLog, Feedback, Item, Note, Problem, Progress, Rating, Settings } from "./types";
import { nextReview, todayISO } from "./srs";
import { supabase } from "./supabase";
import { xpFor, XP } from "./gamify";

export const defaultSettings = (): Settings => ({
  name: "",
  weeks: 8,
  hoursPerDay: 2,
  startDate: todayISO(),
  daysPerWeek: 7,
  lang: "cpp",
  provider: "gemini",
  geminiModel: "gemini-2.5-flash",
  claudeModel: "claude-sonnet-5-5",
  localModel: "",
  localUrl: "http://localhost:8080",
  focusMin: 25,
  breakMin: 5,
  blind: false,
  areas: { dsa: true, hld: true, lld: true, craft: true },
});

interface Core {
  settings: Settings;
  progress: Record<string, Progress>;
  activity: Record<string, DayLog>;
  custom: Problem[];
  attempts: Attempt[];
  settingsUpdated: number;
}
interface State extends Core {
  notes: Record<string, Note>;
  user: { id: string; email: string } | null;
  ready: boolean;
  syncing: boolean;
  syncError: string | null;
  celebrate: { xp: number; title: string; key: number } | null;

  init: () => void;
  setSettings: (p: Partial<Settings>) => void;
  patch: (id: string, p: Partial<Progress>) => void;
  complete: (item: Item, rating: Rating, extra?: Partial<Progress>) => void;
  review: (item: Item, rating: Rating) => void;
  uncomplete: (id: string) => void;
  setNote: (id: string, body: string) => void;
  addAttempt: (item: string, kind: string, input: string, feedback: Feedback | null) => void;
  logMinutes: (min: number) => void;
  addXp: (xp: number, title?: string) => void;
  importPractice: (notes: Record<string, string>, custom: Problem[], known: string[]) => void;
  resetAll: () => void;
  signOut: () => Promise<void>;
}

const CORE_KEY = "ascent:core:v1";
const NOTES_KEY = "ascent:notes:v1";
const emptyCore = (): Core => ({ settings: defaultSettings(), progress: {}, activity: {}, custom: [], attempts: [], settingsUpdated: 0 });

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode: state still lives in memory and the cloud */
  }
}

// ---- cloud helpers (fire-and-forget; local state is always written first) ----
const cloud = {
  err(e: { message: string } | null) {
    if (e) useStore.setState({ syncError: e.message });
  },
  uid: () => useStore.getState().user?.id,
  async progress(id: string, data: Progress) {
    const sb = supabase(), uid = cloud.uid();
    if (!sb || !uid) return;
    const { error } = await sb.from("progress").upsert({ user_id: uid, item_id: id, data, updated_at: new Date(data.updated).toISOString() });
    cloud.err(error);
  },
  async delProgress(id: string) {
    const sb = supabase(), uid = cloud.uid();
    if (!sb || !uid) return;
    cloud.err((await sb.from("progress").delete().eq("user_id", uid).eq("item_id", id)).error);
  },
  async note(id: string, n: Note) {
    const sb = supabase(), uid = cloud.uid();
    if (!sb || !uid) return;
    cloud.err((await sb.from("notes").upsert({ user_id: uid, item_id: id, body: n.body, updated_at: new Date(n.updated).toISOString() })).error);
  },
  async activity(day: string, data: DayLog) {
    const sb = supabase(), uid = cloud.uid();
    if (!sb || !uid) return;
    cloud.err((await sb.from("activity").upsert({ user_id: uid, day, data })).error);
  },
  async profile() {
    const sb = supabase(), uid = cloud.uid();
    if (!sb || !uid) return;
    const { settings, custom, settingsUpdated } = useStore.getState();
    cloud.err((await sb.from("profiles").upsert({ id: uid, settings, custom, updated_at: new Date(settingsUpdated || Date.now()).toISOString() })).error);
  },
  async attempt(a: Attempt) {
    const sb = supabase(), uid = cloud.uid();
    if (!sb || !uid) return;
    cloud.err((await sb.from("attempts").insert({ id: a.id, user_id: uid, item_id: a.item, kind: a.kind, input: a.input, feedback: a.feedback, score: a.score, created_at: new Date(a.at).toISOString() })).error);
  },
};

let profileTimer: ReturnType<typeof setTimeout> | undefined;
const pushProfileSoon = () => {
  clearTimeout(profileTimer);
  profileTimer = setTimeout(() => cloud.profile(), 800);
};

/** Pull everything for the signed-in user, merge with local (newest wins), push what the cloud lacks. */
async function syncDown() {
  const sb = supabase(), uid = cloud.uid();
  if (!sb || !uid) return;
  useStore.setState({ syncing: true, syncError: null });
  try {
    const [prof, prog, notes, act, att] = await Promise.all([
      sb.from("profiles").select("settings, custom, updated_at").eq("id", uid).maybeSingle(),
      sb.from("progress").select("item_id, data").eq("user_id", uid),
      sb.from("notes").select("item_id, body, updated_at").eq("user_id", uid),
      sb.from("activity").select("day, data").eq("user_id", uid),
      sb.from("attempts").select("id, item_id, kind, input, feedback, score, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
    ]);
    const firstError = [prof, prog, notes, act, att].find((r) => r.error)?.error;
    if (firstError) throw new Error(firstError.message);

    const st = useStore.getState();
    const progress = { ...st.progress };
    const pushP: string[] = [];
    const remoteP = new Map((prog.data ?? []).map((r) => [r.item_id as string, r.data as Progress]));
    for (const [id, r] of remoteP) if (!progress[id] || (r.updated ?? 0) >= progress[id].updated) progress[id] = r;
    for (const id of Object.keys(progress)) if (!remoteP.has(id) || (remoteP.get(id)!.updated ?? 0) < progress[id].updated) pushP.push(id);

    const noteMap = { ...st.notes };
    const pushN: string[] = [];
    const remoteN = new Map((notes.data ?? []).map((r) => [r.item_id as string, { body: r.body as string, updated: new Date(r.updated_at as string).getTime() }]));
    for (const [id, r] of remoteN) if (!noteMap[id] || r.updated >= noteMap[id].updated) noteMap[id] = r;
    for (const id of Object.keys(noteMap)) if (!remoteN.has(id) || remoteN.get(id)!.updated < noteMap[id].updated) pushN.push(id);

    const activity = { ...st.activity };
    const pushA: string[] = [];
    const remoteA = new Map((act.data ?? []).map((r) => [r.day as string, r.data as DayLog]));
    for (const [day, r] of remoteA) {
      const l = activity[day];
      activity[day] = l ? { min: Math.max(l.min, r.min), xp: Math.max(l.xp, r.xp), done: Math.max(l.done, r.done) } : r;
    }
    for (const day of Object.keys(activity)) {
      const r = remoteA.get(day), l = activity[day];
      if (!r || r.min !== l.min || r.xp !== l.xp || r.done !== l.done) pushA.push(day);
    }

    let settings = st.settings, custom = st.custom, settingsUpdated = st.settingsUpdated, pushProfile = true;
    if (prof.data) {
      const remoteAt = new Date(prof.data.updated_at as string).getTime();
      if (remoteAt >= st.settingsUpdated) {
        settings = { ...defaultSettings(), ...(prof.data.settings as Settings) };
        const rc = (prof.data.custom as Problem[]) ?? [];
        const ids = new Set(rc.map((p) => p.id));
        custom = [...rc, ...st.custom.filter((p) => !ids.has(p.id))];
        settingsUpdated = remoteAt;
        pushProfile = custom.length !== rc.length;
      }
    }
    const attempts: Attempt[] = (att.data ?? []).map((r) => ({ id: r.id, item: r.item_id, kind: r.kind, input: r.input, feedback: r.feedback, score: r.score, at: new Date(r.created_at).getTime() }));
    const seen = new Set(attempts.map((a) => a.id));
    const localOnly = st.attempts.filter((a) => !seen.has(a.id));

    useStore.setState({ progress, notes: noteMap, activity, settings, custom, settingsUpdated, attempts: [...localOnly, ...attempts].sort((a, b) => b.at - a.at).slice(0, 200) });

    const chunk = <T,>(a: T[], n = 200) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
    for (const ids of chunk(pushP))
      cloud.err((await sb.from("progress").upsert(ids.map((id) => ({ user_id: uid, item_id: id, data: progress[id], updated_at: new Date(progress[id].updated).toISOString() })))).error);
    for (const ids of chunk(pushN, 25))
      cloud.err((await sb.from("notes").upsert(ids.map((id) => ({ user_id: uid, item_id: id, body: noteMap[id].body, updated_at: new Date(noteMap[id].updated).toISOString() })))).error);
    for (const ds of chunk(pushA)) cloud.err((await sb.from("activity").upsert(ds.map((day) => ({ user_id: uid, day, data: activity[day] })))).error);
    for (const a of localOnly) await cloud.attempt(a);
    if (pushProfile) await cloud.profile();
  } catch (e) {
    useStore.setState({ syncError: e instanceof Error ? e.message : String(e) });
  } finally {
    useStore.setState({ syncing: false });
  }
}

let started = false;

export const useStore = create<State>()((set, get) => ({
  ...emptyCore(),
  notes: {},
  user: null,
  ready: false,
  syncing: false,
  syncError: null,
  celebrate: null,

  init() {
    if (started) return;
    started = true;
    const core = load<Core>(CORE_KEY, emptyCore());
    core.settings = { ...defaultSettings(), ...core.settings, areas: { ...defaultSettings().areas, ...core.settings?.areas } };
    set({ ...core, notes: load<Record<string, Note>>(NOTES_KEY, {}), ready: true });

    // persist slices separately so large notes are not rewritten on every tick
    useStore.subscribe((s, prev) => {
      if (s.settings !== prev.settings || s.progress !== prev.progress || s.activity !== prev.activity || s.custom !== prev.custom || s.attempts !== prev.attempts)
        save(CORE_KEY, { settings: s.settings, progress: s.progress, activity: s.activity, custom: s.custom, attempts: s.attempts.slice(0, 60), settingsUpdated: s.settingsUpdated });
      if (s.notes !== prev.notes) save(NOTES_KEY, s.notes);
    });

    const sb = supabase();
    if (!sb) return;
    sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      const prev = get().user?.id;
      if (u && u.id !== prev) {
        set({ user: { id: u.id, email: u.email ?? "" } });
        if (!get().settings.name && u.user_metadata?.full_name) get().setSettings({ name: String(u.user_metadata.full_name).split(" ")[0] });
        setTimeout(syncDown, 0); // never await Supabase calls inside the auth callback
      } else if (!u && prev) set({ user: null });
    });
  },

  setSettings(p) {
    set((s) => ({ settings: { ...s.settings, ...p }, settingsUpdated: Date.now() }));
    pushProfileSoon();
  },

  patch(id, p) {
    const cur = get().progress[id] ?? { status: "todo" as const, updated: 0 };
    const next = { ...cur, ...p, updated: Date.now() };
    set((s) => ({ progress: { ...s.progress, [id]: next } }));
    cloud.progress(id, next);
  },

  complete(item, rating, extra) {
    const cur = get().progress[item.id];
    const first = cur?.status !== "done";
    get().patch(item.id, { ...extra, status: "done", ...nextReview(cur, rating) });
    const day = todayISO();
    const log = get().activity[day] ?? { min: 0, xp: 0, done: 0 };
    const gained = first ? xpFor(item) + rating * 5 : XP.review;
    const nl = { ...log, xp: log.xp + gained, done: log.done + 1 };
    set((s) => ({ activity: { ...s.activity, [day]: nl }, celebrate: { xp: gained, title: item.title, key: Date.now() } }));
    cloud.activity(day, nl);
  },

  review(item, rating) {
    get().complete(item, rating);
  },

  uncomplete(id) {
    set((s) => {
      const progress = { ...s.progress };
      delete progress[id];
      return { progress };
    });
    cloud.delProgress(id);
  },

  setNote(id, body) {
    const n = { body, updated: Date.now() };
    set((s) => ({ notes: { ...s.notes, [id]: n } }));
    cloud.note(id, n);
  },

  addAttempt(item, kind, input, feedback) {
    const a: Attempt = { id: crypto.randomUUID(), item, kind, input, feedback, score: feedback?.score ?? null, at: Date.now() };
    set((s) => ({ attempts: [a, ...s.attempts].slice(0, 200) }));
    cloud.attempt(a);
  },

  logMinutes(min) {
    const day = todayISO();
    const log = get().activity[day] ?? { min: 0, xp: 0, done: 0 };
    const nl = { ...log, min: log.min + min };
    set((s) => ({ activity: { ...s.activity, [day]: nl } }));
    cloud.activity(day, nl);
  },

  addXp(xp, title) {
    const day = todayISO();
    const log = get().activity[day] ?? { min: 0, xp: 0, done: 0 };
    const nl = { ...log, xp: log.xp + xp };
    set((s) => ({ activity: { ...s.activity, [day]: nl }, celebrate: title ? { xp, title, key: Date.now() } : s.celebrate }));
    cloud.activity(day, nl);
  },

  importPractice(noteBodies, custom, known) {
    const now = Date.now();
    const notes = { ...get().notes };
    for (const [id, body] of Object.entries(noteBodies)) notes[id] = { body, updated: now };
    const ids = new Set(custom.map((p) => p.id));
    const progress = { ...get().progress };
    // previously practised ≠ mastered: mark as done but due for review today so recall gets tested
    for (const id of known) if (!progress[id]) progress[id] = { status: "done", due: todayISO(), ivl: 1, ease: 2.3, reps: 1, updated: now };
    set((s) => ({ notes, progress, custom: [...s.custom.filter((p) => !ids.has(p.id)), ...custom], settingsUpdated: now }));
    if (get().user) setTimeout(syncDown, 0);
  },

  resetAll() {
    set({ ...emptyCore(), notes: {} });
  },

  async signOut() {
    await supabase()?.auth.signOut();
    // the next person on this browser must not inherit this account's data
    set({ ...emptyCore(), notes: {}, user: null });
  },
}));

export const selectXp = (s: State) => Object.values(s.activity).reduce((a, d) => a + (d.xp || 0), 0);
