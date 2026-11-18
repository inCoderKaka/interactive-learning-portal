// Phase 2: prompt overrides, cost guard, replay. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, checkOverride, fill, fragment, promptVersion } from "./templates.ts";
import { addSpend, affordableEngine, checkBudget, llmCostUsd, monthKey, NO_BUDGETS, totalOf } from "./usage.ts";
import { answerAfter, duration, lastAt, markers, redoFrom, stateAt } from "./replay.ts";
import { judgePrompt, systemPrompt } from "./prompts.ts";
import { scorecardPrompt } from "./scoring.ts";
import { initBrain, reduce } from "./brain.ts";
import type { InterviewQuestion, LoggedEvent, SessionConfig } from "./types.ts";

const Q: InterviewQuestion = {
  id: "q1", kind: "hld", title: "URL shortener", statement: "Design a URL shortener.", constraints: "100 M links/month",
  followUps: [], redFlags: [], reference: "cache redirects", source: "curriculum",
};
const cfg = (p: Partial<SessionConfig> = {}): SessionConfig => ({
  kind: "hld", selection: { mode: "random-all", preferUnseen: true }, tone: "neutral", level: "L4", minutes: 45,
  arc: { intro: true, aboutYou: true, curveball: true, questionsForMe: true }, pressure: "realistic",
  curveballs: { frequency: "none", disabled: [] }, engine: "text", voice: { rate: 1, captions: true }, mode: "real", plainDoc: false, seed: 7, ...p,
});

test("templates: ids are unique and every default uses only declared placeholders", () => {
  assert.equal(new Set(TEMPLATES.map((t) => t.id)).size, TEMPLATES.length);
  for (const t of TEMPLATES) assert.deepEqual(checkOverride(t.id, t.text).unknown, [], t.id);
});

test("templates: an override replaces one fragment and keeps the rest", () => {
  const s = initBrain(cfg(), Q, 0);
  const base = systemPrompt(cfg(), s, false);
  const o = { "interviewer.tone.neutral": { text: "TONE-OVERRIDE", version: 2, at: 0 } };
  const over = systemPrompt(cfg({ prompts: o }), s, false);
  assert.ok(over.includes("TONE-OVERRIDE"));
  assert.ok(!base.includes("TONE-OVERRIDE"));
  assert.ok(over.includes(fragment("interviewer.rules", undefined, { silence: "[silence]" })), "other fragments unchanged");
  assert.equal(promptVersion("interviewer@1", o), "interviewer@1+interviewer.tone.neutral.v2");
  assert.equal(promptVersion("interviewer@1", {}), "interviewer@1");
});

test("templates: placeholders fill, unknown ones are reported and left as typed", () => {
  assert.equal(fill("a {{x}} {{y}}", { x: 1 }), "a 1 {{y}}");
  assert.deepEqual(checkOverride("judge.system", "Interrupt a {{kind}} {{nope}}"), { unknown: ["nope"], missing: [] });
  assert.deepEqual(checkOverride("judge.system", "no vars"), { unknown: [], missing: ["kind"] });
  assert.ok(judgePrompt(cfg({ prompts: { "judge.system": { text: "J {{kind}}", version: 1, at: 0 } } }), initBrain(cfg(), Q, 0), 0, "x").system === "J system design");
});

test("scorecard: peer rounds add the observer fragment", () => {
  const s = initBrain(cfg(), Q, 0);
  assert.ok(!scorecardPrompt(cfg(), s, []).system.includes("another learner"));
  assert.ok(scorecardPrompt(cfg({ format: "peer" }), s, []).system.includes("another learner"));
});

test("usage: prices, months and spend buckets", () => {
  assert.equal(llmCostUsd("local", "x", 1e6, 1e6), 0);
  assert.ok(Math.abs(llmCostUsd("openai", "gpt-5-nano", 1e6, 1e6) - 0.45) < 1e-9);
  assert.ok(llmCostUsd("claude", "claude-opus-5-5", 1e6, 0) > llmCostUsd("claude", "claude-haiku-5-5", 1e6, 0));
  assert.equal(monthKey(Date.UTC(2026, 10, 19, 12)), "2026-11");
  const l = addSpend(addSpend({}, "2026-11", "realtime", 1.5), "2026-11", "text", 0.25);
  assert.equal(totalOf(l["2026-11"]), 1.75);
  assert.equal(addSpend(l, "2026-11", "text", 0), l);
});

test("usage: budget checks take the tighter of engine and total", () => {
  const b = { ...NO_BUDGETS, total: 10, realtime: 2 };
  assert.equal(checkBudget(NO_BUDGETS, { realtime: 100 }, "realtime").level, "ok");
  assert.deepEqual(checkBudget(b, { realtime: 1 }, "realtime").level, "ok");
  assert.equal(checkBudget(b, { realtime: 1.7 }, "realtime").level, "warn");
  const over = checkBudget(b, { realtime: 1.7 }, "realtime", 0.5);
  assert.equal(over.level, "over");
  assert.equal(over.scope, "realtime");
  assert.equal(checkBudget(b, { text: 9.9 }, "text", 0.2).scope, "total");
});

test("usage: the fallback order skips engines that would exceed a budget", () => {
  const b = { ...NO_BUDGETS, realtime: 1 };
  const est = (e: string) => (e === "realtime" ? 2 : 0.1);
  const r = affordableEngine(["realtime", "ascent-voice", "text"], b, {}, est);
  assert.equal(r.engine, "ascent-voice");
  assert.equal(r.skipped[0].engine, "realtime");
  assert.equal(affordableEngine(["text"], { ...NO_BUDGETS, total: 1 }, { text: 5 }, () => 0).engine, null);
});

const L: LoggedEvent[] = [
  { seq: 1, t: 0, e: { type: "session.started", question: "q1", tone: "neutral", engine: "text" } },
  { seq: 2, t: 10, e: { type: "phase.changed", from: "lobby", to: "problem" } },
  { seq: 3, t: 1000, e: { type: "turn.interviewer", text: "How many links a day?", origin: "phase" } },
  { seq: 4, t: 5000, e: { type: "turn.candidate", text: "About three million." } },
  { seq: 5, t: 9000, e: { type: "digest", surface: "whiteboard", diff: "added API", full: "API → DB" } },
  { seq: 6, t: 12000, e: { type: "turn.interviewer", text: "Where do redirects read from?", origin: "intervention" } },
  { seq: 7, t: 15000, e: { type: "turn.candidate", text: "The database." } },
  { seq: 8, t: 16000, e: { type: "turn.candidate", text: "Maybe a cache." } },
  { seq: 9, t: 20000, e: { type: "hint.requested" } },
];

test("replay: duration, markers and workspace state at a time", () => {
  assert.equal(duration(L), 20000);
  assert.equal(duration(L, 30000), 30000);
  const m = markers(L);
  assert.deepEqual(m.map((x) => x.kind), ["phase", "intervention", "hint"]);
  assert.equal(stateAt(L, 8000).board, "");
  assert.equal(stateAt(L, 9000).board, "API → DB");
  assert.equal(stateAt(L, 13000).lastTurnSeq, 6);
  assert.equal(lastAt([{ t: 0 }, { t: 5 }, { t: 9 }], 6), 1);
  assert.equal(lastAt([{ t: 3 }], 1), -1);
});

test("replay: redo carries the context up to an interviewer turn and the answer that followed", () => {
  const r = redoFrom(L, 6)!;
  assert.equal(r.prompt, "Where do redirects read from?");
  assert.equal(r.atMs, 12000);
  assert.ok(r.context.includes("CANDIDATE: About three million.") && r.context.includes("Whiteboard then:\nAPI → DB"));
  assert.ok(!r.context.includes("The database."));
  assert.equal(redoFrom(L, 4), null);
  assert.equal(answerAfter(L, 6), "The database. Maybe a cache.");
});

test("brain: a redo drill opens on the replayed question, not the intro", () => {
  const c = cfg({ redo: { atMs: 12000, prompt: "Where do redirects read from?", context: "…" }, minutes: 5 });
  const r = reduce(c, initBrain(c, Q, 0), { type: "session.started", question: "q1", tone: "neutral", engine: "text" }, 0);
  assert.equal(r.state.phase, "problem");
  const a = r.actions[0];
  assert.ok(a.type === "say" && a.instruction.includes("Where do redirects read from?"));
  assert.ok(systemPrompt(c, r.state, false).includes("This is a drill"));
});
