"use client";
// The article reader's controller. It walks the page block by block, turns each block into spoken steps
// (sentences, code walkthroughs, table rows, widget interactions), speaks them, and moves a spotlight and
// word highlight along. UI state lives in a small store; the reading loop itself is plain async code.

import { create } from "zustand";
import { type Block, clearHighlights, collectBlocks, highlight, lineRange, rangeOf, tableData, textMap, wordCount } from "./dom";
import { adapterFor, sleep, type Focus, type ReadCtx, type ReadStep } from "./registry";
import { align, describeCode, describeTable, guessLang, pick, speakable, splitSentences, texToSpeech, toSource, wordAt } from "./speech";
import { explainAvailable, explainCode, explainMath, explainTable } from "./explain";
import { cancelAll, prefetch, speak, type Speaking, type VoicePrefs } from "./voice";

export interface Prefs extends VoicePrefs {
  explain: boolean;   // AI narration for code, tables and formulas
  interact: boolean;  // operate widgets, flip cards, reveal code
  quiz: "wait" | "tell";
  follow: boolean;    // auto-scroll
  words: boolean;     // word-level highlight
}
export const DEFAULT_PREFS: Prefs = { engine: "browser", voice: "", openaiVoice: "marin", rate: 1, pitch: 1, explain: true, interact: true, quiz: "wait", follow: true, words: true };
const PREFS_KEY = "ascent:reader:v1";

function loadPrefs(): Prefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }; } catch { return { ...DEFAULT_PREFS }; }
}

export type Status = "idle" | "loading" | "playing" | "paused" | "waiting" | "done";
interface UI {
  status: Status;
  block: number;
  total: number;
  caption: string;
  section: string;
  waitLabel: string;
  thinking: boolean;
  following: boolean;
  focus: Focus;
  notice: string;
  prefs: Prefs;
  prefsLoaded: boolean;
}

export const useReader = create<UI>(() => ({
  status: "idle", block: 0, total: 0, caption: "", section: "", waitLabel: "", thinking: false, following: true, focus: null, notice: "",
  prefs: DEFAULT_PREFS, prefsLoaded: false,
}));
const set = (p: Partial<UI>) => useReader.setState(p);

export function initPrefs() {
  if (!useReader.getState().prefsLoaded) set({ prefs: loadPrefs(), prefsLoaded: true });
}
export function setPrefs(p: Partial<Prefs>) {
  const prefs = { ...useReader.getState().prefs, ...p };
  set({ prefs });
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
  // voice changes apply from the current sentence
  if (("rate" in p || "pitch" in p || "voice" in p || "engine" in p || "openaiVoice" in p) && useReader.getState().status === "playing") restartStep();
}

// ---------- state of the reading loop ----------

let scope: Element | null = null;
let blocks: Block[] = [];
let gen = 0;                                      // bumps on every jump; stale loops exit
let current: Speaking | null = null;
let pos = { block: 0, step: 0, wordOut: 0 };      // where we are, for resume and skips
let pausedAt: (() => void) | null = null;          // resolves the pause
let skipStep = false;
let waitCtrl: AbortController | null = null;
const stepCache = new Map<Element, Promise<ReadStep[]>>();

const prefs = () => useReader.getState().prefs;

// ---------- turning blocks into steps ----------

const LEAD = {
  code: ["Let's walk through this code.", "Here's the code. I'll talk you through it.", "Now some code."],
  table: ["Here's a table.", "Let's read this table together.", "A quick table."],
  math: ["Here's the formula.", "In symbols:", "The maths reads like this."],
};

/** Sentence steps with word highlighting for any element's prose. */
function proseSteps(el: Element, lead = "", pause = 260): ReadStep[] {
  const map = textMap(el);
  const spans = splitSentences(map.text);
  const steps: ReadStep[] = spans.map(([s, e], k) => {
    const a = align(map.text.slice(s, e), map.atoms);
    const say = (k === 0 && lead ? `${lead} ` : "") + a.out;
    const offset = k === 0 && lead ? lead.length + 1 : 0;
    return {
      say, spoken: true,
      focus: () => el,
      words: (os, oe) => {
        if (os < offset) return null;
        const [ss, se] = toSource(a, os - offset, oe - offset);
        return rangeOf(map, s + ss, s + se);
      },
      sentence: () => rangeOf(map, s, e),
      pause: k === spans.length - 1 ? pause : 60,
    };
  });
  if (!steps.length && lead) steps.push({ say: lead, spoken: true, focus: () => el });
  return steps;
}

function contextFor(el: Element): string {
  // the nearest heading and paragraph before this block, so explanations know what the lesson is saying
  const out: string[] = [];
  let i = blocks.findIndex((b) => b.el === el) - 1;
  while (i >= 0 && out.length < 2) {
    const b = blocks[i];
    if (b.kind === "prose" || b.kind === "heading" || b.kind === "item") out.unshift((b.el.textContent ?? "").trim());
    i--;
  }
  return out.join("\n");
}

async function codeSteps(code: string, hint: string, pre: () => Element | null, seed: number, withLead = true): Promise<ReadStep[]> {
  const lang = guessLang(code, hint);
  const lines = code.replace(/\s+$/, "").split("\n").length;
  const out: ReadStep[] = [];
  const lineFocus = (from: number, to: number) => () => { const p = pre(); return p ? lineRange(p, from, to) ?? p : null; };
  const ai = prefs().explain && explainAvailable() ? await thinking(explainCode(code, lang, pre() ? contextFor(pre()!) : "")) : null;
  if (ai) {
    out.push({ say: `${withLead ? pick(LEAD.code, seed) + " " : ""}${ai.intro}`, spoken: true, focus: pre });
    for (const st of ai.steps) out.push({ say: st.say, spoken: true, focus: lineFocus(Math.max(1, st.from), Math.min(lines, st.to)), pause: 120 });
    if (ai.outro) out.push({ say: ai.outro, spoken: true, focus: pre });
    return out;
  }
  const d = describeCode(code, hint);
  out.push({ say: `${withLead ? pick(LEAD.code, seed) + " " : ""}${d.intro}`, spoken: true, focus: pre });
  for (const st of d.steps) out.push({ say: st.say, spoken: true, focus: lineFocus(st.from, st.to), pause: 80 });
  return out;
}

async function thinking<T>(p: Promise<T>): Promise<T> {
  set({ thinking: true });
  try { return await p; } finally { set({ thinking: false }); }
}

const ctx = (): ReadCtx => ({
  interact: prefs().interact,
  quiz: prefs().quiz,
  code: (code, lang, pre) => codeSteps(code, lang, pre, code.length, true),
  prose: (el, lead) => proseSteps(el, lead),
});

async function stepsFor(b: Block, idx: number): Promise<ReadStep[]> {
  const el = b.el;
  const adapter = adapterFor(el);
  if (adapter) return adapter(ctx());
  switch (b.kind) {
    case "heading": return proseSteps(el, "", 520);
    case "item": {
      const list = el.parentElement;
      const n = list ? Array.from(list.children).indexOf(el) + 1 : 0;
      return proseSteps(el, list?.tagName === "OL" ? `${n}.` : "", 200);
    }
    case "quote": return proseSteps(el, "", 320);
    case "image": {
      const alt = (el as HTMLImageElement).alt || el.getAttribute("aria-label") || "";
      return alt ? [{ say: `An image: ${speakable(alt)}`, spoken: true, focus: () => el, pause: 300 }] : [];
    }
    case "math": {
      const tex = el.querySelector("annotation")?.textContent ?? "";
      const plain = texToSpeech(tex);
      const ai = prefs().explain && explainAvailable() ? await thinking(explainMath(tex, contextFor(el))) : null;
      return [{ say: ai ? ai.say : `${pick(LEAD.math, idx)} ${plain}.`, spoken: true, focus: () => el, pause: 420 }];
    }
    case "code": {
      const code = el.textContent ?? "";
      const hint = el.querySelector("code")?.className ?? "";
      return codeSteps(code, hint, () => el, idx);
    }
    case "table": {
      const { headers, rows, rowEls } = tableData(el);
      const ai = prefs().explain && explainAvailable() ? await thinking(explainTable(headers, rows, contextFor(el))) : null;
      if (ai) {
        return [
          { say: `${pick(LEAD.table, idx)} ${ai.intro}`, spoken: true, focus: () => el },
          ...ai.rows.map((r) => ({ say: r.say, spoken: true, focus: () => rowEls[r.row - 1] ?? el, pause: 120 })),
          ...(ai.outro ? [{ say: ai.outro, spoken: true, focus: () => el, pause: 300 }] : []),
        ];
      }
      const d = describeTable(headers, rows);
      return [
        { say: `${pick(LEAD.table, idx)} ${d.intro}`, spoken: true, focus: () => el },
        ...d.rows.map((say, k) => ({ say, spoken: true, focus: () => rowEls[k] ?? el, pause: 120 })),
        ...(d.outro ? [{ say: d.outro, spoken: true, focus: () => el, pause: 300 }] : []),
      ];
    }
    case "custom": {
      const text = (el as HTMLElement).dataset.readText;
      const intro = (el as HTMLElement).dataset.readIntro ?? "";
      if (text) return [{ say: `${intro ? intro + " " : ""}${speakable(text)}`, spoken: true, focus: () => el, pause: 300 }];
      return proseSteps(el, intro, 320);
    }
    default: return proseSteps(el);
  }
}

function stepsCached(i: number): Promise<ReadStep[]> {
  const b = blocks[i];
  if (!b) return Promise.resolve([]);
  // adapters reflect live component state, so they are never cached
  if (adapterFor(b.el)) return stepsFor(b, i);
  let p = stepCache.get(b.el);
  if (!p) { p = stepsFor(b, i).catch(() => []); stepCache.set(b.el, p); }
  return p;
}

// ---------- the loop ----------

function sectionOf(i: number): string {
  for (let k = i; k >= 0; k--) if (blocks[k].kind === "heading") return (blocks[k].el.textContent ?? "").trim();
  return document.querySelector("[data-read-title]")?.textContent?.trim() ?? "";
}

function refreshBlocks() {
  if (!scope?.isConnected) scope = document.querySelector("[data-read-scope]");
  blocks = scope ? collectBlocks(scope) : [];
  set({ total: blocks.length });
}

async function run(startBlock: number, startStep = 0, startWord = 0) {
  const my = ++gen;
  const alive = () => my === gen;
  set({ status: "loading" });
  for (let i = startBlock; i < blocks.length; i++) {
    if (!alive()) return;
    if (!blocks[i].el.isConnected) { refreshBlocks(); i = Math.min(i, blocks.length - 1); if (i < 0) break; }
    pos = { block: i, step: 0, wordOut: 0 };
    set({ block: i, section: sectionOf(i) });
    const steps = await stepsCached(i);
    if (!alive()) return;
    // warm the next blocks (AI explanations, audio) while this one is read
    for (const k of [i + 1, i + 2]) if (blocks[k] && !adapterFor(blocks[k].el)) void stepsCached(k).then((st) => st[0] && prefetch(st[0].say, prefs()));
    for (let s = i === startBlock ? startStep : 0; s < steps.length; s++) {
      if (!alive()) return;
      pos = { block: i, step: s, wordOut: 0 };
      const ok = await perform(steps[s], my, i === startBlock && s === startStep ? startWord : 0, steps[s + 1]);
      if (!ok) return;
    }
    if (!alive()) return;
  }
  if (!alive()) return;
  clearHighlights();
  set({ status: "done", caption: "That's the end of this page.", focus: null, waitLabel: "" });
}

/** Perform one step: act, focus, speak (resuming after pauses), wait. Returns false when the loop was superseded. */
async function perform(step: ReadStep, my: number, fromWord: number, next?: ReadStep): Promise<boolean> {
  const alive = () => my === gen;
  if (step.act && prefs().interact) {
    await step.act();
    await sleep(step.settle ?? 380);
    if (!alive()) return false;
  }
  const focus = step.focus?.() ?? null;
  set({ focus });
  follow(focus);
  highlight("read-sentence", step.sentence?.() ?? null);
  highlight("read-word", null);
  if (next) prefetch(next.say, prefs());

  const text = step.spoken ? step.say : speakable(step.say);
  let start = fromWord;
  const holdWhilePaused = async () => {
    if (useReader.getState().status !== "paused") return;
    await new Promise<void>((ok) => { pausedAt = ok; });
    pausedAt = null;
  };
  await holdWhilePaused();
  while (alive()) {
    const chunk = text.slice(start);
    if (!chunk.trim()) break;
    set({ status: "playing", caption: text, waitLabel: "" });
    const base = start;
    skipStep = false;
    current = speak(chunk, prefs(), (ci) => {
      const [ws, we] = wordAt(text, base + ci);
      pos.wordOut = ws;
      if (prefs().words && step.words) highlight("read-word", step.words(ws, we));
    }, (e) => set({ notice: `${e.message}. Using the browser voice for now.` }));
    const outcome = await current.done;
    current = null;
    if (!alive()) return false;
    if (outcome === "end" || skipStep) break;
    // stopped without a jump: a pause, or a voice change that restarts from the current word
    await holdWhilePaused();
    if (!alive()) return false;
    if (skipStep) break;
    start = pos.wordOut;
  }
  highlight("read-word", null);
  if (step.waitFor && alive()) {
    waitCtrl = new AbortController();
    set({ status: "waiting", waitLabel: step.waitLabel ?? "Your turn" });
    await step.waitFor(waitCtrl.signal);
    waitCtrl = null;
    if (!alive()) return false;
    set({ status: "playing", waitLabel: "" });
  }
  if (step.pause) await sleep(step.pause / Math.max(0.6, prefs().rate));
  return alive();
}

// ---------- following the reading position ----------

let programmatic = 0;
function follow(t: Focus) {
  if (!t || !prefs().follow || !useReader.getState().following) return;
  const r = t instanceof Range ? t.getBoundingClientRect() : (t as Element).isConnected ? (t as Element).getBoundingClientRect() : null;
  if (!r || (r.width === 0 && r.height === 0)) return;
  const top = 76, bottom = window.innerHeight - 170;
  if (r.top >= top && r.bottom <= bottom) return;
  const target = r.height > bottom - top ? r.top - top : r.top - (window.innerHeight - r.height) * 0.36;
  programmatic = Date.now();
  window.scrollBy({ top: target, behavior: "smooth" });
}

function onManualScroll() {
  if (Date.now() - programmatic < 900) return;
  const st = useReader.getState();
  if (st.following && (st.status === "playing" || st.status === "waiting" || st.status === "loading")) set({ following: false });
}

let listening = false;
const scrollKeys = (e: KeyboardEvent) => { if (["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End", " "].includes(e.key) && !(e.target as Element)?.closest?.("input, textarea, [contenteditable]")) onManualScroll(); };
function listen(on: boolean) {
  if (on === listening || typeof window === "undefined") return;
  listening = on;
  if (on) {
    window.addEventListener("wheel", onManualScroll, { passive: true });
    window.addEventListener("touchmove", onManualScroll, { passive: true });
    window.addEventListener("keydown", scrollKeys);
  } else {
    window.removeEventListener("wheel", onManualScroll);
    window.removeEventListener("touchmove", onManualScroll);
    window.removeEventListener("keydown", scrollKeys);
  }
}

// ---------- public controls ----------

/** Start reading the page, from the block containing `from` (and the sentence at `offset` within it) or from the top. */
export function start(from?: Element | null, offset?: number) {
  initPrefs();
  stopSpeech();
  scope = (from?.closest("[data-read-scope]") as Element | null) ?? document.querySelector("[data-read-scope]");
  stepCache.clear();
  refreshBlocks();
  if (!blocks.length) return;
  let i = 0;
  if (from) {
    const k = blocks.findIndex((b) => b.el === from || b.el.contains(from));
    if (k >= 0) i = k;
    else {
      // a point between blocks: start at the first block after it
      const after = blocks.findIndex((b) => !!(from.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING));
      if (after >= 0) i = after;
    }
  }
  let step = 0;
  if (offset !== undefined && blocks[i] && ["prose", "item", "heading", "quote"].includes(blocks[i].kind)) {
    const spans = splitSentences(textMap(blocks[i].el).text);
    step = Math.max(0, spans.findIndex(([, e]) => e > offset));
  }
  listen(true);
  set({ following: true, notice: "", status: "loading", caption: "" });
  void run(i, step);
}

function stopSpeech() {
  current?.stop();
  current = null;
  cancelAll();
  waitCtrl?.abort();
}

export function pause() {
  const st = useReader.getState().status;
  if (st !== "playing" && st !== "loading") return;
  set({ status: "paused" });
  current?.stop();
}

export function resume() {
  const st = useReader.getState().status;
  if (st === "paused") { set({ status: "playing" }); if (pausedAt) pausedAt(); else void run(pos.block, pos.step, pos.wordOut); }
  else if (st === "done" || st === "idle") start();
}

export function toggle() {
  const st = useReader.getState().status;
  if (st === "playing" || st === "loading" || st === "waiting") pause();
  else resume();
}

/** Re-speak the current step from the current word (after a voice or speed change). */
function restartStep() {
  current?.stop();
}

export function skipWait() {
  waitCtrl?.abort();
}

export function nextStep() {
  if (useReader.getState().status === "waiting") return skipWait();
  skipStep = true;
  if (useReader.getState().status === "paused") { set({ status: "playing" }); pausedAt?.(); }
  current?.stop();
}

export function prevStep() {
  stopSpeech();
  if (pos.step > 0) void run(pos.block, pos.step - 1);
  else void run(Math.max(0, pos.block - 1));
}

export function jumpBlock(delta: number) {
  stopSpeech();
  refreshBlocks();
  // jump by sections when a heading is near, otherwise by one block; "back" first restarts the current block
  let i: number;
  if (delta > 0) {
    const h = blocks.findIndex((b, k) => k > pos.block && b.kind === "heading");
    i = h > 0 && h - pos.block <= 12 ? h : pos.block + 1;
  } else if (pos.step > 1) {
    i = pos.block;
  } else {
    i = pos.block - 1;
    for (let k = pos.block - 1; k >= 0 && pos.block - k <= 12; k--) if (blocks[k].kind === "heading") { i = k; break; }
  }
  i = Math.max(0, Math.min(blocks.length - 1, i));
  set({ following: true });
  void run(i);
}

export function recenter() {
  set({ following: true });
  follow(useReader.getState().focus);
}

export function stop() {
  gen++;
  stopSpeech();
  pausedAt = null;
  clearHighlights();
  listen(false);
  set({ status: "idle", caption: "", focus: null, waitLabel: "", thinking: false, block: 0, total: 0, notice: "" });
}

/** Words and blocks on the current page, for the "Listen · 12 min" estimate. */
export function pageStats(root: Element | null): { words: number; blocks: number } {
  if (!root) return { words: 0, blocks: 0 };
  const b = collectBlocks(root);
  return { words: wordCount(b), blocks: b.length };
}

/** A short spoken sample of the chosen voice. */
export function preview() {
  stopSpeech();
  current = speak("Hi! I'll read this lesson with you, and talk through the code, tables and diagrams as we go.", prefs(), () => {});
}
