// The document-import graph. Pure orchestration: every model call goes through `env.llm` and every
// side effect through `env`, so the whole flow runs in tests with a fake model.
//
//   read → map → skip → estimate → approve ─→ extract ─→ review1 → dedup → verify → review2
//                                     ▲          │ (recover)                              │
//                                     │          ▼                                        ▼
//                    final ← coverage ←──── coverage ← review3 ← enrich ←─────────────────┘
//                      │  (retry / re-run a step) ─→ back to that step
//                      ▼
//                    commit
//
// Approvals (approve, final) and checkpoints (review1-3) are interrupts the learner can switch off,
// so the whole import can run in the background. Optional steps (skip suggestions, AI duplicate
// judging, verification, web enrichment, the AI missing-content check) can be turned off. The
// coverage ledger is never optional: every content block ends up in a note, skipped by the learner,
// or kept verbatim as a last resort.

import type { TaskId } from "@/lib/interview/tasks";
import type { Enrichment, Verification, WebSource } from "../types";
import { StateGraph, type NodeCtx } from "./graph.ts";
import { isContent, type DocBlock, type DocSection, type ParsedDoc } from "./doc.ts";
import { containment, fnv, jaccard, plain, shingles, tokensOf } from "./text.ts";

// ---------- types ----------

export type StepId = "read" | "map" | "skip" | "estimate" | "approve" | "extract" | "review1" | "dedup" | "verify" | "review2" | "enrich" | "review3" | "coverage" | "final" | "commit";
export type AiStep = "map" | "extract" | "dedup" | "verify" | "enrich" | "coverage";

export const STEP_TASK: Record<AiStep, TaskId> = { map: "notes.map", extract: "notes.extract", dedup: "notes.dedup", verify: "notes.verify", enrich: "notes.enrich", coverage: "notes.coverage" };

export const STEPS: { id: StepId; label: string; what: string; optional?: keyof ImportConfig["steps"]; gate?: "plan" | "final"; checkpoint?: keyof ImportConfig["checkpoints"]; ai?: AiStep }[] = [
  { id: "read", label: "Read the structure", what: "Headings, paragraphs, lists, code, tables and images, each numbered so it can be accounted for." },
  { id: "map", label: "Map to topics", what: "Each section is filed under the topic page it belongs to, or General.", ai: "map" },
  { id: "skip", label: "Suggest skips", what: "Tables of contents, boilerplate, empty or already-imported sections.", optional: "skip" },
  { id: "estimate", label: "Estimate time and cost", what: "Tokens, dollars and minutes for each step, before anything is spent." },
  { id: "approve", label: "Approve the plan", what: "Check the mapping, skips and steps, then start.", gate: "plan" },
  { id: "extract", label: "Write notes", what: "Faithful notes from each section, one idea each, code and images kept as they are.", ai: "extract" },
  { id: "review1", label: "Checkpoint: first notes", what: "See the first notes before the rest are written.", checkpoint: "afterExtract" },
  { id: "dedup", label: "Remove duplicates", what: "Within this document and against notes you imported before.", optional: "dedup", ai: "dedup" },
  { id: "verify", label: "Verify every note", what: "Each sentence reads well and says only what the source says.", optional: "verify", ai: "verify" },
  { id: "review2", label: "Checkpoint: verified", what: "Review fixes and flags.", checkpoint: "afterVerify" },
  { id: "enrich", label: "Enrich from the web", what: "Cited, current facts your notes lack; contradictions flagged.", optional: "enrich", ai: "enrich" },
  { id: "review3", label: "Checkpoint: enriched", what: "Review the web additions.", checkpoint: "afterEnrich" },
  { id: "coverage", label: "Check for missing content", what: "Every block of the document is accounted for; anything missed is recovered.", ai: "coverage" },
  { id: "final", label: "Final review", what: "Accept, edit, reassign or drop notes, then add them.", gate: "final" },
  { id: "commit", label: "Add to the portal", what: "Notes appear in an Imported notes section on each topic page." },
];

export interface StepState { status: "pending" | "running" | "done" | "skipped" | "waiting" | "failed"; started?: number; ended?: number; done?: number; total?: number; note?: string }

export interface Tune {
  provider?: "gemini" | "claude" | "openai" | "local" | "";
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  reasoning?: "off" | "low" | "medium" | "high";
  batchChars?: number;
  concurrency?: number;
  prompt?: string; // replaces the system prompt
}

export interface ImportConfig {
  steps: { skip: boolean; dedup: boolean; aiDedup: boolean; verify: boolean; autoFix: boolean; enrich: boolean; deepCoverage: boolean };
  approvals: { plan: boolean; final: boolean };
  checkpoints: { firstBatch: boolean; afterExtract: boolean; afterVerify: boolean; afterEnrich: boolean };
  verifyTopics: "all" | string[];  // topic ids; "general" = unclassified
  enrichTopics: "all" | string[];
  dev: { tune: Partial<Record<AiStep, Tune>>; sections: string[] | null };
}

export const DEFAULT_CONFIG: ImportConfig = {
  steps: { skip: true, dedup: true, aiDedup: true, verify: true, autoFix: true, enrich: false, deepCoverage: true },
  approvals: { plan: true, final: true },
  checkpoints: { firstBatch: true, afterExtract: false, afterVerify: false, afterEnrich: false },
  verifyTopics: "all",
  enrichTopics: "all",
  dev: { tune: {}, sections: null },
};

/** No approvals, no checkpoints: the import runs to the end in the background. */
export const backgroundConfig = (c: ImportConfig): ImportConfig => ({ ...c, approvals: { plan: false, final: false }, checkpoints: { firstBatch: false, afterExtract: false, afterVerify: false, afterEnrich: false } });

export type SkipKind = "empty" | "toc" | "boilerplate" | "offtopic" | "admin" | "duplicate" | "imported" | "user";
export interface SkipMark { kind: SkipKind; why: string; by: "rule" | "ai" | "user" }
export interface SectionPlan { topic: string | null; conf: number; alt: string | null; reason: string; skip: SkipMark | null; edited?: boolean }

export type DraftOrigin = "extract" | "recover" | "deep" | "verbatim";
export interface Draft {
  id: string;
  section: string;
  topic: string | null;
  title: string;
  md: string;            // markdown; [[bN]] tokens stand for code, tables and images kept verbatim
  covers: string[];
  kind?: string;
  origin: DraftOrigin;
  accepted: boolean;
  dupOf?: string | null; // another draft id, or "note:<id>" for a note imported before
  sim?: number;
  verify?: Verification;
  web?: Enrichment;
  edited?: boolean;
}

export type BlockState = "covered" | "weak" | "missing" | "dropped" | "skipped";
export interface Ledger { total: number; covered: number; weak: number; missing: number; dropped: number; skipped: number; byBlock: Record<string, BlockState> }
export interface Failure { step: StepId; ids: string[]; error: string; at: number }
export interface Usage { calls: number; inTok: number; outTok: number; usd: number; searches: number; ms: number }

export interface StepEstimate { step: AiStep; calls: number; inTok: number; outTok: number; searches: number; usd: number; sec: number; provider: string; model: string }
export interface Estimate { steps: StepEstimate[]; usd: [number, number]; sec: [number, number]; tokens: number }

export interface ImportState {
  runId: string;
  doc: ParsedDoc;
  config: ImportConfig;
  steps: Partial<Record<StepId, StepState>>;
  plan: Record<string, SectionPlan>;
  estimate: Estimate | null;
  drafts: Record<string, Draft>;
  dropped: Record<string, string>;  // block → why the model left it out
  extracted: string[];              // sections done
  verified: string[];               // drafts done
  enriched: string[];
  dedupDone: boolean;
  deepChecked: string[];            // sections
  firstReviewed: boolean;
  recover: string[] | null;         // blocks to re-extract
  recovering: boolean;
  recoverRounds: number;
  ledger: Ledger | null;
  failures: Failure[];
  usage: Usage;
  rerun: StepId | null;
  committed: string[] | null;
  seq: number;
}

// ---------- environment ----------

export interface LlmCall { step: AiStep; system: string; user: string; json: boolean; web?: boolean; label: string }
export interface LlmResult { text: string; sources?: WebSource[]; searches?: number; inTok: number; outTok: number; usd: number; ms: number }
export interface CatalogTopic { id: string; area: string; title: string; blurb: string }
export interface PriorNote { id: string; topic: string | null; text: string; hash?: string; at: number }

export interface ImportEnv {
  llm: (c: LlmCall, signal: AbortSignal) => Promise<LlmResult>;
  catalog: CatalogTopic[];
  prior: PriorNote[];
  models: (step: AiStep) => { provider: string; model: string; tier: "small" | "default" | "strong"; webUsd: number; price: (inTok: number, outTok: number) => number; concurrency: number; batchChars: number };
  commit: (s: ImportState) => Promise<string[]>;
  log?: (msg: string) => void;
}

export const emptyUsage = (): Usage => ({ calls: 0, inTok: 0, outTok: 0, usd: 0, searches: 0, ms: 0 });

export function initialState(runId: string, doc: ParsedDoc, config: ImportConfig): ImportState {
  return { runId, doc, config, steps: {}, plan: {}, estimate: null, drafts: {}, dropped: {}, extracted: [], verified: [], enriched: [], dedupDone: false, deepChecked: [], firstReviewed: false, recover: null, recovering: false, recoverRounds: 0, ledger: null, failures: [], usage: emptyUsage(), rerun: null, committed: null, seq: 0 };
}

// ---------- prompts (developer mode can replace each system prompt) ----------

export const PROMPTS: Record<AiStep, string> = {
  map: `You file the sections of a learner's study document under the pages of an interview-preparation portal.
Choose the page by what the section actually teaches, not by a stray keyword. Use null when no page fits well: the section then goes to General.
Never invent a page id. Confidence is your probability that a careful human would choose the same page.`,
  extract: `You turn sections of a learner's own study notes into clean, self-contained notes for a portal page.
Faithfulness beats polish. Keep every fact, number, example, step, caveat, opinion and question the learner wrote. Fix only spelling, grammar and broken formatting. Never add information that is not in the source.
Write one idea per note (a concept, technique, pitfall, example, question or comparison) with a short, specific title. Notes are markdown; keep lists as lists.
Code blocks, tables and images: do not copy them. Write the token [[bN]] (the block's id) on its own line where it belongs.
Every block id you are given must appear in exactly one note's "covers" list, or in "dropped" with a reason. Drop only text with nothing to keep (empty lines, navigation, a heading repeated as text).`,
  dedup: `You decide whether two notes from a learner's study material say the same thing.
"same" means a reader would lose nothing by keeping only one of them. If both hold unique details, they are not the same, unless you can merge them without losing anything: then return the merged markdown, keeping every detail and any [[bN]] tokens.`,
  verify: `You check notes imported from a learner's document against the source text they were written from.
For each note decide:
- coherent: every sentence is complete, makes sense and is not garbled (no broken fragments, dangling references or mangled formulas);
- faithful: it says nothing the source does not say, and drops nothing important from the source blocks it covers.
When something is wrong and you can fix it using only the source, return the corrected markdown in "md", keeping [[bN]] tokens exactly. Otherwise "md" is null. Be strict but do not nitpick style.`,
  enrich: `You enrich a learner's interview-preparation notes using web search.
For each note: add at most three short, high-value facts, clarifications or current details the note lacks (do not restate it), and flag any claim in the note that current authoritative sources contradict.
Search before you write. Every addition must come from a page you found; list those pages' URLs. Prefer official documentation, papers and well-known engineering sources. Skip a note when there is nothing worth adding.`,
  coverage: `You compare a section of a learner's document with the notes written from it.
List every fact, example, number, step, caveat, question or code snippet in the source that none of the notes contains. Ignore differences in wording and order.
For each missing item write a short note in markdown that states it faithfully, using only the source, with a title, and name the block ids it comes from.`,
};

const SHAPES: Record<AiStep, string> = {
  map: `Return ONLY JSON: {"sections":[{"id":"s1","topic":"page id or null","alt":"second-best page id or null","confidence":0.0,"reason":"at most 12 words"SKIP}]}`,
  extract: `Return ONLY JSON: {"notes":[{"section":"s1","title":"...","md":"...","covers":["b3","b4"],"kind":"concept|technique|pitfall|example|question|comparison|reference"}],"dropped":[{"block":"b9","why":"..."}]}`,
  dedup: `Return ONLY JSON: {"pairs":[{"a":"d1","b":"d7","same":true,"keep":"d1","merged":null}]}`,
  verify: `Return ONLY JSON: {"notes":[{"id":"d1","coherent":true,"faithful":true,"issues":["..."],"md":null}]}`,
  enrich: `Reply with ONLY JSON (no prose before or after): {"notes":[{"id":"d1","add":"markdown, or empty","corrections":[{"claim":"...","fix":"...","source":"url"}],"sources":["url"]}]}`,
  coverage: `Return ONLY JSON: {"missing":[{"section":"s1","blocks":["b4"],"title":"...","md":"..."}]}`,
};

export const systemFor = (step: AiStep, cfg: ImportConfig) => {
  const base = cfg.dev.tune[step]?.prompt?.trim() || PROMPTS[step];
  const shape = step === "map" ? SHAPES.map.replace("SKIP", cfg.steps.skip ? `,"skip":null or {"kind":"empty|toc|boilerplate|offtopic|admin","why":"at most 12 words"}` : "") : SHAPES[step];
  const skipRule = step === "map" && cfg.steps.skip ? `\nSuggest "skip" only for sections with nothing worth keeping: a table of contents, a link list, administrative text (dates, to-do lists about the document itself), boilerplate, or content unrelated to software interviews. When unsure, do not skip.` : "";
  return `${base}${skipRule}\n\n${shape}`;
};

// ---------- helpers ----------

export function parseJsonLoose<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();
  const s = body.search(/[[{]/);
  const e = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  if (s < 0 || e < s) throw new Error("The model did not return JSON.");
  return JSON.parse(body.slice(s, e + 1)) as T;
}

async function pool<T>(items: T[], n: number, fn: (x: T, i: number) => Promise<void>, signal: AbortSignal) {
  let i = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
    while (i < items.length) {
      if (signal.aborted) return;
      const k = i++;
      await fn(items[k], k);
    }
  });
  await Promise.all(workers);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
}

const now = () => Date.now();
const live = (s: ImportState) => Object.values(s.drafts).filter((d) => d.accepted && !d.dupOf);
const topicKey = (t: string | null) => t ?? "general";
const sectionOf = (s: ImportState, block: string) => s.doc.sections.find((x) => x.blocks.includes(block));
const activeSections = (s: ImportState) => s.doc.sections.filter((x) => !s.plan[x.id]?.skip && (!s.config.dev.sections || s.config.dev.sections.includes(x.id)));
const inScope = (scope: "all" | string[], t: string | null) => scope === "all" || scope.includes(topicKey(t));
const tokens = (md: string) => [...md.matchAll(/\[\[(b\d+)\]\]/g)].map((m) => m[1]);

function blockForPrompt(b: DocBlock): string {
  if (b.kind === "code") return `[${b.id}] code${b.lang ? ` (${b.lang})` : ""}:\n${b.md}`;
  if (b.kind === "image") return `[${b.id}] image${b.alt ? `: ${b.alt}` : ""} (you cannot see it; place [[${b.id}]] where it belongs)`;
  if (b.kind === "table") return `[${b.id}] table:\n${b.md}`;
  return `[${b.id}] ${b.kind === "list" ? "list item" : b.kind === "quote" ? "quote" : "paragraph"}: ${b.md}`;
}

/** Plain text a note stands for, with its tokens expanded, for coverage and duplicate checks. */
export function expand(s: ImportState, md: string): string {
  return md.replace(/\[\[(b\d+)\]\]/g, (_, id: string) => s.doc.blocks[id]?.md ?? "");
}

function mark(ctx: NodeCtx<ImportState>, step: StepId, p: Partial<StepState>) {
  const st = ctx.state();
  ctx.save({ steps: { ...st.steps, [step]: { ...(st.steps[step] ?? { status: "pending" }), ...p } } });
}

function addUsage(ctx: NodeCtx<ImportState>, r: LlmResult) {
  const u = ctx.state().usage;
  ctx.save({ usage: { calls: u.calls + 1, inTok: u.inTok + r.inTok, outTok: u.outTok + r.outTok, usd: u.usd + r.usd, searches: u.searches + (r.searches ?? 0), ms: u.ms + r.ms } });
}

async function callJson<T>(env: ImportEnv, ctx: NodeCtx<ImportState>, c: LlmCall): Promise<{ data: T; res: LlmResult }> {
  let res = await env.llm(c, ctx.signal);
  addUsage(ctx, res);
  try {
    return { data: parseJsonLoose<T>(res.text), res };
  } catch {
    res = await env.llm({ ...c, user: `${c.user}\n\nYour previous reply could not be parsed as JSON. Reply again with ONLY the JSON object.` }, ctx.signal);
    addUsage(ctx, res);
    return { data: parseJsonLoose<T>(res.text), res };
  }
}

function fail(ctx: NodeCtx<ImportState>, step: StepId, ids: string[], e: unknown) {
  if (e instanceof DOMException && e.name === "AbortError") throw e;
  const st = ctx.state();
  ctx.save({ failures: [...st.failures, { step, ids, error: e instanceof Error ? e.message : String(e), at: now() }] });
}

function newDraft(ctx: NodeCtx<ImportState>, d: Omit<Draft, "id">): Draft {
  const st = ctx.state();
  const id = `d${st.seq + 1}`;
  const draft = { ...d, id, title: d.title.replace(/\*\*|__|`/g, "").replace(/^#+\s*/, "").trim() || d.title };
  ctx.save({ seq: st.seq + 1, drafts: { ...st.drafts, [id]: draft } });
  return draft;
}

function patchDrafts(ctx: NodeCtx<ImportState>, patches: Record<string, Partial<Draft>>) {
  const st = ctx.state();
  const drafts = { ...st.drafts };
  for (const [id, p] of Object.entries(patches)) if (drafts[id]) drafts[id] = { ...drafts[id], ...p };
  ctx.save({ drafts });
}

/** Groups sections into calls of at most `max` chars (a bigger section goes alone). */
export function batchSections(sections: DocSection[], max: number, cap = 6): DocSection[][] {
  const out: DocSection[][] = [];
  let cur: DocSection[] = [], size = 0;
  for (const s of sections) {
    if (cur.length && (size + s.chars > max || cur.length >= cap)) { out.push(cur); cur = []; size = 0; }
    cur.push(s);
    size += s.chars;
  }
  if (cur.length) out.push(cur);
  return out;
}

// ---------- estimate (pure, exported for the plan screen) ----------

const SPEED = { small: 160, default: 85, strong: 45 }; // output tokens per second, rough

export function estimate(s: ImportState, env: ImportEnv): Estimate {
  const secs = activeSections(s);
  const content = secs.reduce((a, x) => a + x.chars, 0);
  const ct = tokensOf(content);
  const catalogTok = tokensOf(env.catalog.reduce((a, t) => a + t.id.length + t.title.length + t.blurb.length + 12, 0));
  const c = s.config;
  const rows: StepEstimate[] = [];
  const add = (step: AiStep, calls: number, inTok: number, outTok: number, searches = 0) => {
    const m = env.models(step);
    const usd = m.price(inTok, outTok) + searches * m.webUsd;
    const sec = calls ? (Math.ceil(calls / m.concurrency) * 2.5) + outTok / SPEED[m.tier] / Math.min(m.concurrency, calls) : 0;
    rows.push({ step, calls, inTok, outTok, searches, usd, sec, provider: m.provider, model: m.model });
  };
  const nSec = s.doc.sections.length;
  const mapCalls = Math.ceil(nSec / 25);
  add("map", mapCalls, mapCalls * (catalogTok + 350) + tokensOf(s.doc.sections.reduce((a, x) => a + Math.min(700, x.chars) + 60, 0)), nSec * 45);
  const xCalls = batchSections(secs, env.models("extract").batchChars).length;
  add("extract", xCalls, xCalls * 450 + Math.round(ct * 1.15), Math.round(ct * 0.9));
  if (c.steps.dedup && c.steps.aiDedup) add("dedup", Math.max(1, Math.ceil(secs.length / 30)), Math.round(ct * 0.08) + 300, Math.round(ct * 0.02) + 60);
  const vShare = c.verifyTopics === "all" ? 1 : secs.filter((x) => inScope(c.verifyTopics, s.plan[x.id]?.topic ?? null)).reduce((a, x) => a + x.chars, 0) / Math.max(1, content);
  if (c.steps.verify) { const v = Math.round(ct * vShare); add("verify", Math.ceil((v * 2) / 4500) || (v ? 1 : 0), Math.round(v * 2.1) + 400, Math.round(v * (c.steps.autoFix ? 0.45 : 0.15))); }
  const eShare = c.enrichTopics === "all" ? 1 : secs.filter((x) => inScope(c.enrichTopics, s.plan[x.id]?.topic ?? null)).reduce((a, x) => a + x.chars, 0) / Math.max(1, content);
  if (c.steps.enrich) { const e = Math.round(ct * eShare); const calls = Math.ceil(e / 2500) || (e ? 1 : 0); add("enrich", calls, e + calls * 6000, calls * 900, calls * 3); }
  if (c.steps.deepCoverage) { const calls = batchSections(secs, 9000).length; add("coverage", calls, Math.round(ct * 2) + calls * 300, Math.round(ct * 0.08)); }
  const usd = rows.reduce((a, r) => a + r.usd, 0), sec = rows.reduce((a, r) => a + r.sec, 0);
  return { steps: rows, usd: [usd * 0.7, usd * 1.5], sec: [sec * 0.7, sec * 1.6], tokens: rows.reduce((a, r) => a + r.inTok + r.outTok, 0) };
}

// ---------- coverage ledger (pure) ----------

const WEAK_AT = 0.5;

export function ledger(s: ImportState): Ledger {
  const byBlock: Record<string, BlockState> = {};
  const kept = Object.values(s.drafts).filter((d) => d.accepted || (d.dupOf && !d.dupOf.startsWith("note:") && s.drafts[d.dupOf]?.accepted) || d.dupOf?.startsWith("note:"));
  const coverText = new Map<string, string[]>();
  for (const d of kept) for (const b of d.covers) coverText.set(b, [...(coverText.get(b) ?? []), expand(s, d.md)]);
  for (const sec of s.doc.sections) {
    const skipped = !!s.plan[sec.id]?.skip || (s.config.dev.sections && !s.config.dev.sections.includes(sec.id));
    for (const id of sec.blocks) {
      const b = s.doc.blocks[id];
      if (skipped) { byBlock[id] = "skipped"; continue; }
      const texts = coverText.get(id);
      if (texts) {
        const tokenUsed = texts.some((t) => t.includes(b.md)) || kept.some((d) => d.covers.includes(id) && tokens(d.md).includes(id));
        const best = b.kind === "image" || b.kind === "code" || b.kind === "table" ? (tokenUsed ? 1 : Math.max(...texts.map((t) => containment(b.text, t)))) : Math.max(...texts.map((t) => containment(b.text, t)));
        byBlock[id] = best >= WEAK_AT || tokenUsed ? "covered" : "weak";
      } else if (s.dropped[id]) byBlock[id] = "dropped";
      else byBlock[id] = "missing";
    }
  }
  const vals = Object.values(byBlock);
  const count = (k: BlockState) => vals.filter((v) => v === k).length;
  return { total: vals.length, covered: count("covered"), weak: count("weak"), missing: count("missing"), dropped: count("dropped"), skipped: count("skipped"), byBlock };
}

// ---------- the graph ----------

export function buildImportGraph(env: ImportEnv) {
  const g = new StateGraph<ImportState>();
  const step = (id: StepId, fn: (s: ImportState, ctx: NodeCtx<ImportState>) => Promise<void> | void, opts: { skipIf?: (s: ImportState) => boolean; note?: (s: ImportState) => string } = {}) => {
    g.addNode(id, async (s, ctx) => {
      if (opts.skipIf?.(s)) { mark(ctx, id, { status: "skipped", ended: now() }); return; }
      const prev = ctx.state().steps[id];
      mark(ctx, id, { status: "running", started: prev?.status === "running" || prev?.status === "waiting" ? prev.started : now() });
      await fn(ctx.state(), ctx);
      mark(ctx, id, { status: "done", ended: now(), note: opts.note?.(ctx.state()) });
    });
  };

  // 1. structure + deterministic skips (already imported, repeated, empty)
  step("read", (s, ctx) => {
    const plan: Record<string, SectionPlan> = { ...s.plan };
    const priorHashes = new Map(env.prior.filter((p) => p.hash).map((p) => [p.hash!, p]));
    const seen = new Map<string, string>();
    for (const sec of s.doc.sections) {
      if (plan[sec.id]) continue;
      let skip: SkipMark | null = null;
      const prior = priorHashes.get(sec.hash);
      if (prior) skip = { kind: "imported", why: `Already imported on ${new Date(prior.at).toLocaleDateString()}`, by: "rule" };
      else if (seen.has(sec.hash)) skip = { kind: "duplicate", why: `Same text as “${s.doc.sections.find((x) => x.id === seen.get(sec.hash))?.title}”`, by: "rule" };
      else if (sec.blocks.every((b) => plain(s.doc.blocks[b].md).length < 3 && s.doc.blocks[b].kind !== "image" && s.doc.blocks[b].kind !== "code")) skip = { kind: "empty", why: "No content", by: "rule" };
      seen.set(sec.hash, sec.id);
      plan[sec.id] = { topic: null, conf: 0, alt: null, reason: "", skip };
    }
    ctx.save({ plan });
  }, { note: (s) => `${s.doc.sections.length} sections · ${s.doc.order.filter((id) => isContent(s.doc.blocks[id])).length} blocks${s.doc.images ? ` · ${s.doc.images} images` : ""}` });

  // 2. map sections to topic pages (and collect skip suggestions in the same pass)
  step("map", async (s, ctx) => {
    const ids = new Set(env.catalog.map((t) => t.id));
    const catalog = env.catalog.map((t) => `${t.id} | ${t.area} | ${t.title} | ${t.blurb.slice(0, 110)}`).join("\n");
    const todo = s.doc.sections.filter((x) => !s.plan[x.id]?.reason && !s.plan[x.id]?.edited);
    const batches: DocSection[][] = [];
    for (let i = 0; i < todo.length; i += 25) batches.push(todo.slice(i, i + 25));
    let done = s.doc.sections.length - todo.length;
    mark(ctx, "map", { done, total: s.doc.sections.length });
    const m = env.models("map");
    await pool(batches, m.concurrency, async (batch) => {
      const body = batch.map((x) => `[${x.id}] ${x.path.join(" › ")}\n${x.blocks.map((b) => ctx.state().doc.blocks[b].md).join("\n").slice(0, 700)}`).join("\n\n---\n\n");
      try {
        const { data } = await callJson<{ sections?: { id: string; topic?: string | null; alt?: string | null; confidence?: number; reason?: string; skip?: { kind?: string; why?: string } | null }[] }>(env, ctx, {
          step: "map", json: true, label: `Map ${batch.length} sections`,
          system: systemFor("map", s.config),
          user: `PORTAL PAGES (id | area | title | what it covers):\n${catalog}\n\nSECTIONS OF THE DOCUMENT "${s.doc.name}":\n\n${body}`,
        });
        const got = new Map((data.sections ?? []).map((r) => [r.id, r]));
        const plan = { ...ctx.state().plan };
        for (const x of batch) {
          const r = got.get(x.id);
          const prev = plan[x.id];
          const topic = r?.topic && ids.has(r.topic) ? r.topic : null;
          const aiSkip = s.config.steps.skip && r?.skip?.why ? { kind: (["empty", "toc", "boilerplate", "offtopic", "admin"].includes(r.skip.kind ?? "") ? r.skip.kind : "boilerplate") as SkipKind, why: r.skip.why, by: "ai" as const } : null;
          plan[x.id] = { ...prev, topic, alt: r?.alt && ids.has(r.alt) && r.alt !== topic ? r.alt : null, conf: Math.max(0, Math.min(1, Number(r?.confidence) || 0)), reason: r?.reason || (r ? "No page fits: General" : "The model skipped this section: General"), skip: prev?.skip ?? aiSkip };
        }
        ctx.save({ plan });
      } catch (e) {
        fail(ctx, "map", batch.map((x) => x.id), e);
        const plan = { ...ctx.state().plan };
        for (const x of batch) plan[x.id] = { ...plan[x.id], reason: "Mapping failed: General until you choose" };
        ctx.save({ plan });
      }
      done += batch.length;
      mark(ctx, "map", { done });
    }, ctx.signal);
  }, { note: (s) => { const p = Object.values(s.plan); return `${p.filter((x) => x.topic).length} to topics · ${p.filter((x) => !x.topic).length} to General`; } });

  // 3. skip suggestions were gathered by read (rules) and map (model); this step reports or clears them
  step("skip", (s, ctx) => {
    if (s.config.steps.skip) return;
    const plan = { ...s.plan };
    for (const [id, p] of Object.entries(plan)) if (p.skip?.by === "ai") plan[id] = { ...p, skip: null };
    ctx.save({ plan });
  }, { note: (s) => { const n = Object.values(s.plan).filter((p) => p.skip).length; return n ? `${n} suggested` : "Nothing to skip"; } });

  // 4. estimate
  step("estimate", (s, ctx) => { ctx.save({ estimate: estimate(s, env) }); }, { note: (s) => (s.estimate ? (s.estimate.usd[1] < 0.01 ? `Under a cent · ${Math.round(s.estimate.tokens / 1000)}k tokens` : `≈ $${s.estimate.usd[0].toFixed(2)}–${s.estimate.usd[1].toFixed(2)}`) : "") });

  // 5. approve the plan (the learner may edit mapping, skips, steps and scopes)
  step("approve", (s, ctx) => {
    mark(ctx, "approve", { status: "waiting" });
    const v = ctx.interrupt<{ plan?: Record<string, SectionPlan>; config?: ImportConfig } | undefined>({ kind: "plan" });
    const patch: Partial<ImportState> = {};
    if (v?.plan) patch.plan = v.plan;
    if (v?.config) patch.config = v.config;
    ctx.save(patch);
    ctx.save({ estimate: estimate(ctx.state(), env) });
  }, { skipIf: (s) => !s.config.approvals.plan });

  // 6. extract notes (also the recovery path for blocks the coverage check found missing)
  step("extract", async (s0, ctx) => {
    const st = ctx.state();
    const m = env.models("extract");
    const recovering = !!st.recover?.length;
    if (recovering) {
      const blocks = new Set(st.recover!);
      const secs = st.doc.sections.filter((x) => x.blocks.some((b) => blocks.has(b)));
      mark(ctx, "extract", { note: `Recovering ${blocks.size} missed block${blocks.size > 1 ? "s" : ""}` });
      await pool(batchSections(secs, m.batchChars), m.concurrency, (batch) => extractBatch(env, ctx, batch, blocks), ctx.signal);
      ctx.save({ recover: null, recovering: true, recoverRounds: ctx.state().recoverRounds + 1 });
      return;
    }
    if (st.config.checkpoints.firstBatch && !st.firstReviewed && st.extracted.length) {
      mark(ctx, "extract", { status: "waiting" });
      applyReview(ctx, ctx.interrupt({ kind: "review", phase: "first" }));
      ctx.save({ firstReviewed: true });
      mark(ctx, "extract", { status: "running" });
    }
    const todo = activeSections(ctx.state()).filter((x) => !ctx.state().extracted.includes(x.id));
    const batches = batchSections(todo, m.batchChars);
    const total = activeSections(ctx.state()).length;
    mark(ctx, "extract", { done: total - todo.length, total });
    const run = async (batch: DocSection[]) => {
      await extractBatch(env, ctx, batch, null);
      mark(ctx, "extract", { done: activeSections(ctx.state()).filter((x) => ctx.state().extracted.includes(x.id)).length });
    };
    if (batches.length && ctx.state().config.checkpoints.firstBatch && !ctx.state().firstReviewed) {
      await run(batches[0]);
      if (batches.length > 1) {
        mark(ctx, "extract", { status: "waiting" });
        applyReview(ctx, ctx.interrupt({ kind: "review", phase: "first" }));
        mark(ctx, "extract", { status: "running" });
      }
      ctx.save({ firstReviewed: true });
      await pool(batches.slice(1), m.concurrency, run, ctx.signal);
    } else await pool(batches, m.concurrency, run, ctx.signal);
  }, { note: (s) => `${Object.values(s.drafts).length} notes from ${s.extracted.length} sections` });
  g.addConditionalEdges("extract", (s) => (s.recovering ? "coverage" : "review1"));

  const review = (id: "review1" | "review2" | "review3", phase: string, on: keyof ImportConfig["checkpoints"]) =>
    step(id, (s, ctx) => {
      mark(ctx, id, { status: "waiting" });
      applyReview(ctx, ctx.interrupt({ kind: "review", phase }));
    }, { skipIf: (s) => !s.config.checkpoints[on] || (id === "review2" && !s.config.steps.verify) || (id === "review3" && !s.config.steps.enrich) });

  review("review1", "extract", "afterExtract");

  // 7. duplicates: exact and near-exact by shingles, borderline pairs judged by the model
  step("dedup", async (s, ctx) => {
    if (ctx.state().dedupDone) return;
    const drafts = live(ctx.state());
    const sh = new Map(drafts.map((d) => [d.id, shingles(expand(s, `${d.title}\n${d.md}`))]));
    const patches: Record<string, Partial<Draft>> = {};
    const borderline: [Draft, Draft, number][] = [];
    const groups = new Map<string, Draft[]>();
    for (const d of drafts) groups.set(topicKey(d.topic), [...(groups.get(topicKey(d.topic)) ?? []), d]);
    for (const ds of groups.values()) {
      for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
        const a = ds[i], b = ds[j];
        if (patches[a.id]?.dupOf || patches[b.id]?.dupOf) continue;
        const sim = jaccard(sh.get(a.id)!, sh.get(b.id)!);
        if (sim >= 0.82) { const [keep, drop] = expand(s, a.md).length >= expand(s, b.md).length ? [a, b] : [b, a]; patches[drop.id] = { dupOf: keep.id, sim, accepted: false }; }
        else if (sim >= 0.45) borderline.push([a, b, sim]);
      }
    }
    // against notes imported before, in the same topic
    for (const d of drafts) {
      if (patches[d.id]?.dupOf) continue;
      const mine = sh.get(d.id)!;
      let best: { id: string; sim: number } | null = null;
      for (const p of env.prior) {
        if (topicKey(p.topic) !== topicKey(d.topic)) continue;
        const sim = jaccard(mine, shingles(p.text));
        if (sim >= 0.82 && (!best || sim > best.sim)) best = { id: p.id, sim };
      }
      if (best) patches[d.id] = { dupOf: `note:${best.id}`, sim: best.sim, accepted: false };
    }
    patchDrafts(ctx, patches);
    const pairs = borderline.filter(([a, b]) => !patches[a.id]?.dupOf && !patches[b.id]?.dupOf).sort((x, y) => y[2] - x[2]).slice(0, 120);
    if (s.config.steps.aiDedup && pairs.length) {
      const chunks: (typeof pairs)[] = [];
      for (let i = 0; i < pairs.length; i += 10) chunks.push(pairs.slice(i, i + 10));
      mark(ctx, "dedup", { done: 0, total: chunks.length });
      let done = 0;
      await pool(chunks, env.models("dedup").concurrency, async (chunk) => {
        try {
          const { data } = await callJson<{ pairs?: { a: string; b: string; same?: boolean; keep?: string; merged?: string | null }[] }>(env, ctx, {
            step: "dedup", json: true, label: `Judge ${chunk.length} similar pairs`, system: systemFor("dedup", s.config),
            user: chunk.map(([a, b]) => `PAIR ${a.id} / ${b.id}\n[${a.id}] ${a.title}\n${expand(s, a.md)}\n\n[${b.id}] ${b.title}\n${expand(s, b.md)}`).join("\n\n=====\n\n"),
          });
          const cur = ctx.state().drafts;
          const p: Record<string, Partial<Draft>> = {};
          for (const r of data.pairs ?? []) {
            if (!r.same || !cur[r.a] || !cur[r.b] || cur[r.a].dupOf || cur[r.b].dupOf || p[r.a]?.dupOf || p[r.b]?.dupOf) continue;
            const keep = r.keep === r.b ? r.b : r.a, drop = keep === r.a ? r.b : r.a;
            const sim = chunk.find(([x, y]) => (x.id === r.a && y.id === r.b) || (x.id === r.b && y.id === r.a))?.[2];
            p[drop] = { dupOf: keep, sim, accepted: false };
            if (r.merged && r.merged.trim()) p[keep] = { md: r.merged, covers: [...new Set([...cur[keep].covers, ...cur[drop].covers])] };
          }
          patchDrafts(ctx, p);
        } catch (e) { fail(ctx, "dedup", chunk.flatMap(([a, b]) => [a.id, b.id]), e); }
        mark(ctx, "dedup", { done: ++done });
      }, ctx.signal);
    }
    ctx.save({ dedupDone: true });
  }, { skipIf: (s) => !s.config.steps.dedup, note: (s) => { const n = Object.values(s.drafts).filter((d) => d.dupOf).length; return n ? `${n} duplicate${n > 1 ? "s" : ""} set aside` : "No duplicates"; } });

  // 8. verify: coherent and faithful, with automatic fixes kept reversible
  step("verify", async (s, ctx) => {
    await verifyDrafts(env, ctx, live(ctx.state()).filter((d) => !ctx.state().verified.includes(d.id) && inScope(s.config.verifyTopics, d.topic)));
  }, { skipIf: (s) => !s.config.steps.verify, note: (s) => { const v = Object.values(s.drafts).filter((d) => d.verify); return `${v.filter((d) => d.verify!.state === "ok").length} ok · ${v.filter((d) => d.verify!.state === "fixed").length} fixed · ${v.filter((d) => d.verify!.state === "flagged").length} flagged`; } });

  review("review2", "verify", "afterVerify");

  // 9. enrich from the web, cited, kept apart from the learner's text
  step("enrich", async (s, ctx) => {
    const todo = live(ctx.state()).filter((d) => !ctx.state().enriched.includes(d.id) && inScope(s.config.enrichTopics, d.topic) && d.origin !== "verbatim");
    const groups = new Map<string, Draft[]>();
    for (const d of todo) groups.set(topicKey(d.topic), [...(groups.get(topicKey(d.topic)) ?? []), d]);
    const chunks: Draft[][] = [];
    for (const ds of groups.values()) for (let i = 0; i < ds.length; i += 6) chunks.push(ds.slice(i, i + 6));
    mark(ctx, "enrich", { done: 0, total: chunks.length });
    let done = 0;
    await pool(chunks, Math.min(2, env.models("enrich").concurrency), async (chunk) => {
      const topic = env.catalog.find((t) => t.id === chunk[0].topic);
      try {
        const { data, res } = await callJson<{ notes?: { id: string; add?: string; corrections?: { claim: string; fix: string; source?: string }[]; sources?: string[] }[] }>(env, ctx, {
          step: "enrich", json: false, web: true, label: `Enrich ${chunk.length} notes`, system: systemFor("enrich", s.config),
          user: `TOPIC: ${topic ? `${topic.title} (${topic.area})` : "General"}\n\n${chunk.map((d) => `[${d.id}] ${d.title}\n${expand(s, d.md).slice(0, 1800)}`).join("\n\n---\n\n")}`,
        });
        const cited = res.sources ?? [];
        const p: Record<string, Partial<Draft>> = {};
        for (const r of data.notes ?? []) {
          const d = chunk.find((x) => x.id === r.id);
          if (!d) continue;
          const named = (r.sources ?? []).map((u) => cited.find((c) => sameUrl(c.url, u)) ?? (cited.length ? null : { url: u, title: hostOf(u) })).filter(Boolean) as WebSource[];
          const sources = named.length ? named : cited.slice(0, 3);
          const add = (r.add ?? "").trim();
          const corrections = (r.corrections ?? []).filter((c) => c.claim && c.fix);
          if ((!add && !corrections.length) || !sources.length) continue; // nothing uncited is ever added
          p[d.id] = { web: { md: add, sources, corrections, at: now() } };
        }
        patchDrafts(ctx, p);
        ctx.save({ enriched: [...ctx.state().enriched, ...chunk.map((d) => d.id)] });
      } catch (e) { fail(ctx, "enrich", chunk.map((d) => d.id), e); }
      mark(ctx, "enrich", { done: ++done });
    }, ctx.signal);
  }, { skipIf: (s) => !s.config.steps.enrich, note: (s) => `${Object.values(s.drafts).filter((d) => d.web).length} notes enriched` });

  review("review3", "enrich", "afterEnrich");

  // 10. coverage: AI comparison once, then the deterministic ledger; missing blocks loop back to extract
  step("coverage", async (s, ctx) => {
    if (s.config.steps.deepCoverage && !ctx.state().recovering) {
      const secs = activeSections(ctx.state()).filter((x) => !ctx.state().deepChecked.includes(x.id) && ctx.state().extracted.includes(x.id));
      const batches = batchSections(secs, 9000, 4);
      mark(ctx, "coverage", { done: 0, total: batches.length, note: "Comparing each section with its notes" });
      let done = 0;
      await pool(batches, env.models("coverage").concurrency, async (batch) => {
        const st = ctx.state();
        const notesOf = (sec: DocSection) => Object.values(st.drafts).filter((d) => d.section === sec.id && (d.accepted || d.dupOf));
        try {
          const { data } = await callJson<{ missing?: { section?: string; blocks?: string[]; title?: string; md?: string }[] }>(env, ctx, {
            step: "coverage", json: true, label: `Check ${batch.length} sections`, system: systemFor("coverage", s.config),
            user: batch.map((sec) => `SECTION ${sec.id}: ${sec.path.join(" › ")}\nSOURCE:\n${sec.blocks.map((b) => blockForPrompt(st.doc.blocks[b])).join("\n")}\n\nNOTES:\n${notesOf(sec).map((d) => `- ${d.title}: ${expand(st, d.md)}`).join("\n") || "(none)"}`).join("\n\n=====\n\n"),
          });
          for (const m of data.missing ?? []) {
            const blocks = (m.blocks ?? []).filter((b) => batch.some((x) => x.blocks.includes(b)));
            const sec = batch.find((x) => x.id === m.section) ?? (blocks[0] ? sectionOf(st, blocks[0]) : undefined);
            if (!sec || !m.md?.trim()) continue;
            newDraft(ctx, { section: sec.id, topic: ctx.state().plan[sec.id]?.topic ?? null, title: m.title?.trim() || sec.title, md: m.md.trim(), covers: blocks, origin: "deep", accepted: true });
          }
        } catch (e) { fail(ctx, "coverage", batch.map((x) => x.id), e); }
        ctx.save({ deepChecked: [...ctx.state().deepChecked, ...batch.map((x) => x.id)] });
        mark(ctx, "coverage", { done: ++done });
      }, ctx.signal);
    }
    let l = ledger(ctx.state());
    const gaps = Object.entries(l.byBlock).filter(([, v]) => v === "missing" || v === "weak").map(([k]) => k);
    if (gaps.length && ctx.state().recoverRounds < 2) { ctx.save({ ledger: l, recover: gaps, recovering: false }); return; }
    // last resort: whatever is still missing is kept exactly as written, so nothing is ever lost
    if (gaps.length) {
      const bySec = new Map<string, string[]>();
      for (const b of gaps) { const sec = sectionOf(ctx.state(), b); if (sec) bySec.set(sec.id, [...(bySec.get(sec.id) ?? []), b]); }
      for (const [sid, bs] of bySec) {
        const sec = ctx.state().doc.sections.find((x) => x.id === sid)!;
        const md = bs.map((b) => { const blk = ctx.state().doc.blocks[b]; return blk.kind === "code" || blk.kind === "table" || blk.kind === "image" ? `[[${b}]]` : blk.md; }).join("\n\n");
        newDraft(ctx, { section: sid, topic: ctx.state().plan[sid]?.topic ?? null, title: `${sec.title} (kept as written)`, md, covers: bs, origin: "verbatim", accepted: true });
      }
      l = ledger(ctx.state());
    }
    ctx.save({ ledger: l, recover: null, recovering: false });
  }, { note: (s) => (s.ledger ? `${s.ledger.covered + s.ledger.skipped}/${s.ledger.total} blocks accounted for` : "") });
  g.addConditionalEdges("coverage", (s) => (s.recover?.length ? "extract" : "final"));

  // 11. final review
  step("final", (s, ctx) => {
    mark(ctx, "final", { status: "waiting" });
    const v = ctx.interrupt<{ drafts?: Record<string, Draft>; rerun?: StepId; sections?: string[] } | undefined>({ kind: "final" });
    if (v?.drafts) ctx.save({ drafts: v.drafts, ledger: ledger({ ...ctx.state(), drafts: v.drafts }) });
    if (v?.rerun) {
      const st = ctx.state();
      const secs = v.sections?.length ? new Set(v.sections) : null;
      const failed = new Set(st.failures.filter((f) => f.step === v.rerun).flatMap((f) => f.ids));
      const touch = (sec: string) => (secs ? secs.has(sec) : true);
      const patch: Partial<ImportState> = { rerun: v.rerun, failures: st.failures.filter((f) => f.step !== v.rerun) };
      if (v.rerun === "extract") patch.extracted = st.extracted.filter((x) => !(secs ? secs.has(x) : failed.has(x)));
      if (v.rerun === "verify") patch.verified = st.verified.filter((d) => !(secs ? touch(st.drafts[d]?.section) : failed.has(d)));
      if (v.rerun === "enrich") patch.enriched = st.enriched.filter((d) => !(secs ? touch(st.drafts[d]?.section) : failed.has(d)));
      if (v.rerun === "coverage") { patch.deepChecked = st.deepChecked.filter((x) => !(secs ? secs.has(x) : failed.has(x))); patch.recoverRounds = 0; }
      if (v.rerun === "map") patch.plan = Object.fromEntries(Object.entries(st.plan).map(([k, p]) => [k, secs?.has(k) || (!secs && failed.has(k)) ? { ...p, reason: "", edited: false } : p]));
      if (v.rerun === "extract" && secs) patch.drafts = Object.fromEntries(Object.entries(st.drafts).filter(([, d]) => !secs.has(d.section) || d.edited));
      if (v.rerun === "dedup") patch.dedupDone = false;
      ctx.save(patch);
    } else ctx.save({ rerun: null });
  }, { skipIf: (s) => !s.config.approvals.final });
  g.addConditionalEdges("final", (s) => s.rerun ?? "commit");

  // 12. commit
  step("commit", async (s, ctx) => {
    ctx.save({ rerun: null });
    if (ctx.state().committed) return;
    ctx.save({ committed: await env.commit(ctx.state()) });
  }, { note: (s) => (s.committed ? `${s.committed.length} note${s.committed.length === 1 ? "" : "s"} added` : "") });

  g.addEdge("read", "map").addEdge("map", "skip").addEdge("skip", "estimate").addEdge("estimate", "approve").addEdge("approve", "extract")
    .addEdge("review1", "dedup").addEdge("dedup", "verify").addEdge("verify", "review2").addEdge("review2", "enrich").addEdge("enrich", "review3").addEdge("review3", "coverage")
    .setEntry("read");
  // a re-run of map has to pass the plan through approval again
  return g;
}

function applyReview(ctx: NodeCtx<ImportState>, v: unknown) {
  const r = v as { drafts?: Record<string, Draft> } | undefined;
  if (r?.drafts) ctx.save({ drafts: r.drafts });
}

const sameUrl = (a: string, b: string) => a.replace(/[#?].*$/, "").replace(/\/$/, "") === b.replace(/[#?].*$/, "").replace(/\/$/, "");
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

async function extractBatch(env: ImportEnv, ctx: NodeCtx<ImportState>, batch: DocSection[], only: Set<string> | null) {
  const s = ctx.state();
  const allowed = new Set(batch.flatMap((x) => x.blocks.filter((b) => !only || only.has(b))));
  const pageOf = (sec: DocSection) => { const t = env.catalog.find((c) => c.id === s.plan[sec.id]?.topic); return t ? `${t.title} (${t.area})` : "General"; };
  const user = batch.map((sec) => {
    const blocks = sec.blocks.filter((b) => allowed.has(b));
    return `### SECTION ${sec.id} · ${sec.path.join(" › ")} · page: ${pageOf(sec)}\n${blocks.map((b) => blockForPrompt(s.doc.blocks[b])).join("\n")}`;
  }).join("\n\n");
  const recoverNote = only ? `\n\nThese blocks were missed or only partly covered by earlier notes. Write notes that carry their content in full.${Object.values(s.drafts).some((d) => batch.some((x) => x.id === d.section)) ? ` Existing note titles for these sections (do not repeat them): ${Object.values(s.drafts).filter((d) => batch.some((x) => x.id === d.section)).map((d) => d.title).join("; ")}.` : ""}` : "";
  try {
    const { data } = await callJson<{ notes?: { section?: string; title?: string; md?: string; covers?: string[]; kind?: string }[]; dropped?: { block: string; why: string }[] }>(env, ctx, {
      step: "extract", json: true, label: `${only ? "Recover" : "Write"} notes for ${batch.map((x) => x.title).join(", ").slice(0, 80)}`,
      system: systemFor("extract", s.config), user: user + recoverNote,
    });
    for (const n of data.notes ?? []) {
      const md = (n.md ?? "").trim();
      if (!md) continue;
      const covers = [...new Set([...(n.covers ?? []), ...tokens(md)])].filter((b) => allowed.has(b));
      const sec = batch.find((x) => x.id === n.section) ?? (covers[0] ? batch.find((x) => x.blocks.includes(covers[0])) : batch[0])!;
      newDraft(ctx, { section: sec.id, topic: ctx.state().plan[sec.id]?.topic ?? null, title: (n.title ?? "").trim() || sec.title, md, covers, kind: n.kind, origin: only ? "recover" : "extract", accepted: true });
    }
    const dropped = { ...ctx.state().dropped };
    for (const d of data.dropped ?? []) if (allowed.has(d.block) && d.why) dropped[d.block] = d.why;
    ctx.save({ dropped, extracted: only ? ctx.state().extracted : [...new Set([...ctx.state().extracted, ...batch.map((x) => x.id)])] });
    if (only && ctx.state().config.steps.verify) {
      const fresh = live(ctx.state()).filter((d) => d.origin === "recover" && !ctx.state().verified.includes(d.id) && batch.some((x) => x.id === d.section));
      await verifyDrafts(env, ctx, fresh, false);
    }
  } catch (e) { fail(ctx, "extract", batch.map((x) => x.id), e); }
}

async function verifyDrafts(env: ImportEnv, ctx: NodeCtx<ImportState>, todo: Draft[], track = true) {
  const s = ctx.state();
  const m = env.models("verify");
  const chunks: Draft[][] = [];
  let cur: Draft[] = [], size = 0;
  for (const d of todo) {
    const len = d.md.length + d.covers.reduce((a, b) => a + (s.doc.blocks[b]?.md.length ?? 0), 0);
    if (cur.length && (size + len > m.batchChars || cur.length >= 8)) { chunks.push(cur); cur = []; size = 0; }
    cur.push(d); size += len;
  }
  if (cur.length) chunks.push(cur);
  if (track) mark(ctx, "verify", { done: 0, total: chunks.length });
  let done = 0;
  await pool(chunks, m.concurrency, async (chunk) => {
    try {
      const { data } = await callJson<{ notes?: { id: string; coherent?: boolean; faithful?: boolean; issues?: string[]; md?: string | null }[] }>(env, ctx, {
        step: "verify", json: true, label: `Verify ${chunk.length} notes`, system: systemFor("verify", s.config),
        user: chunk.map((d) => `NOTE ${d.id}: ${d.title}\n${d.md}\n\nSOURCE BLOCKS:\n${d.covers.map((b) => s.doc.blocks[b] ? blockForPrompt(s.doc.blocks[b]) : "").join("\n") || "(none listed)"}`).join("\n\n=====\n\n"),
      });
      const got = new Map((data.notes ?? []).map((r) => [r.id, r]));
      const p: Record<string, Partial<Draft>> = {};
      for (const d of chunk) {
        const r = got.get(d.id);
        if (!r) continue;
        const ok = r.coherent !== false && r.faithful !== false;
        const issues = (r.issues ?? []).filter(Boolean);
        if (ok && !r.md) { p[d.id] = { verify: { state: "ok", issues } }; continue; }
        if (r.md && r.md.trim() && ctx.state().config.steps.autoFix) {
          let md = r.md.trim();
          for (const t of tokens(d.md)) if (!md.includes(`[[${t}]]`)) md += `\n\n[[${t}]]`; // never lose kept code or images
          p[d.id] = { md, verify: { state: "fixed", issues: issues.length ? issues : ["Wording corrected"], original: d.md } };
        } else p[d.id] = { verify: { state: ok ? "ok" : "flagged", issues: issues.length ? issues : ok ? [] : ["Does not match its source"] } };
      }
      patchDrafts(ctx, p);
      ctx.save({ verified: [...ctx.state().verified, ...chunk.map((d) => d.id)] });
    } catch (e) { fail(ctx, "verify", chunk.map((d) => d.id), e); }
    if (track) mark(ctx, "verify", { done: ++done });
  }, ctx.signal);
}

/** Expand a draft into markdown with code and tables inlined; images are returned separately. */
export function renderDraft(s: Pick<ImportState, "doc">, d: Pick<Draft, "md">): { parts: ({ t: "md"; md: string } | { t: "image"; block: DocBlock })[] } {
  const parts: ({ t: "md"; md: string } | { t: "image"; block: DocBlock })[] = [];
  let buf = "";
  for (const piece of d.md.split(/(\[\[b\d+\]\])/)) {
    const m = piece.match(/^\[\[(b\d+)\]\]$/);
    const b = m ? s.doc.blocks[m[1]] : undefined;
    if (b?.kind === "image") { if (buf.trim()) parts.push({ t: "md", md: buf.trim() }); buf = ""; parts.push({ t: "image", block: b }); }
    else buf += b ? `\n\n${b.md}\n\n` : piece;
  }
  if (buf.trim()) parts.push({ t: "md", md: buf.trim() });
  return { parts };
}

export const draftHash = (s: Pick<ImportState, "doc">, d: Pick<Draft, "covers">) => fnv(d.covers.map((b) => plain(s.doc.blocks[b]?.md ?? "")).join("\n"));
