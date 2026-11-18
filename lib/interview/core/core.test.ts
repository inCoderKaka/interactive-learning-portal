// Run with: npm test   (node --test, no extra dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { initBrain, reduce } from "./brain.ts";
import { scheduleCurveballs } from "./curveballs.ts";
import { constraintFlags, diagramRules, digestScene, digestText, snapshotScene, tagFor, type SceneElement } from "./digest.ts";
import { aggregateScorecards, parseScorecard } from "./scoring.ts";
import { buildTurn, transcript } from "./prompts.ts";
import { deliveryStats } from "./analytics.ts";
import { mockDays } from "./recommender.ts";
import { resolveTone } from "./persona.ts";
import type { BrainState, InterviewQuestion, LoggedEvent, SessionConfig, SessionEvent } from "./types.ts";

const Q: InterviewQuestion = {
  id: "d-url-shortener", kind: "hld", title: "URL shortener", statement: "Design a service that creates short links and redirects them.",
  constraints: "100 M new links/month; 100:1 read-heavy; 600 GB/yr", followUps: ["Make codes unguessable"], redFlags: ["No cache on redirects"],
  reference: "redirects, reads ≫ writes", source: "curriculum",
};

const cfg = (p: Partial<SessionConfig> = {}): SessionConfig => ({
  kind: "hld", selection: { mode: "random-all", preferUnseen: true }, tone: "neutral", level: "L4", minutes: 45,
  arc: { intro: true, aboutYou: true, curveball: true, questionsForMe: true }, pressure: "realistic",
  curveballs: { frequency: "occasional", disabled: [] }, engine: "ascent-voice", voice: { rate: 1, captions: true },
  mode: "real", plainDoc: false, seed: 42, ...p,
});

function run(c: SessionConfig, events: [number, SessionEvent][]) {
  let s: BrainState = initBrain(c, Q, 0);
  const all: { t: number; actions: ReturnType<typeof reduce>["actions"] }[] = [];
  for (const [t, e] of events) {
    const r = reduce(c, s, e, t);
    s = r.state;
    all.push({ t, actions: r.actions });
  }
  return { s, all };
}

test("start greets and moves to about_you when both are on", () => {
  const { s, all } = run(cfg(), [[0, { type: "session.started", question: Q.id, tone: "neutral", engine: "ascent-voice" }]]);
  assert.equal(s.phase, "about_you");
  assert.equal(all[0].actions[0].type, "say");
});

test("a long introduction moves to the problem", () => {
  const intro = "Hi, I am a backend engineer with five years of experience building payment systems, mostly in Java and Go, and recently I led a migration of our ledger service to an event-sourced design which cut reconciliation time a lot.";
  const { s, all } = run(cfg(), [
    [0, { type: "session.started", question: Q.id, tone: "neutral", engine: "ascent-voice" }],
    [60_000, { type: "turn.candidate", text: intro }],
  ]);
  assert.equal(s.phase, "problem");
  const a = all[1].actions[0];
  assert.ok(a.type === "say" && a.origin === "phase");
});

test("asking for a minute to think holds interventions", () => {
  const { s, all } = run(cfg({ arc: { intro: false, aboutYou: false, curveball: false, questionsForMe: false } }), [
    [0, { type: "session.started", question: Q.id, tone: "neutral", engine: "ascent-voice" }],
    [10_000, { type: "turn.candidate", text: "Can I take a minute to think?" }],
    [70_000, { type: "tick" }],
  ]);
  assert.ok(s.thinkingUntil > 70_000);
  assert.deepEqual(all[2].actions, []);
});

test("silence triggers a nudge after the threshold, but not while speaking", () => {
  const c = cfg({ arc: { intro: false, aboutYou: false, curveball: false, questionsForMe: false } });
  const quiet = run(c, [[0, { type: "session.started", question: Q.id, tone: "neutral", engine: "ascent-voice" }], [60_000, { type: "tick" }]]);
  assert.equal(quiet.all[1].actions[0]?.type, "say");
  const talking = run(c, [[0, { type: "session.started", question: Q.id, tone: "neutral", engine: "ascent-voice" }], [1000, { type: "candidate.speaking", on: true }], [60_000, { type: "tick" }]]);
  assert.deepEqual(talking.all[2].actions, []);
});

test("note-taker tone never nudges on silence or rule hits", () => {
  const c = cfg({ tone: "notetaker", arc: { intro: false, aboutYou: false, curveball: false, questionsForMe: false } });
  const r = run(c, [
    [0, { type: "session.started", question: Q.id, tone: "notetaker", engine: "ascent-voice" }],
    [90_000, { type: "tick" }],
    [91_000, { type: "rule.hit", rule: "read-path-no-cache", detail: "x" }],
  ]);
  assert.deepEqual(r.all[1].actions, []);
  assert.deepEqual(r.all[2].actions, []);
});

test("a rule hit is raised once, then respects the minimum gap", () => {
  const c = cfg({ arc: { intro: false, aboutYou: false, curveball: false, questionsForMe: false } });
  const r = run(c, [
    [0, { type: "session.started", question: Q.id, tone: "neutral", engine: "ascent-voice" }],
    [120_000, { type: "rule.hit", rule: "read-path-no-cache", detail: "x" }],
    [125_000, { type: "rule.hit", rule: "read-path-no-cache", detail: "x" }],
    [130_000, { type: "rule.hit", rule: "lb-missing", detail: "y" }],
  ]);
  assert.equal(r.all[1].actions.length, 1);
  assert.deepEqual(r.all[2].actions, []);
  assert.deepEqual(r.all[3].actions, []); // within 45 s of the previous intervention
});

test("time runs out and the round ends", () => {
  const r = run(cfg(), [[0, { type: "session.started", question: Q.id, tone: "neutral", engine: "ascent-voice" }], [45 * 60_000, { type: "tick" }]]);
  assert.ok(r.all[1].actions.some((a) => a.type === "end"));
});

test("questions for me starts near the end and 'no questions' closes", () => {
  const c = cfg({ arc: { intro: false, aboutYou: false, curveball: false, questionsForMe: true } });
  const r = run(c, [
    [0, { type: "session.started", question: Q.id, tone: "neutral", engine: "ascent-voice" }],
    [41 * 60_000, { type: "tick" }],
    [42 * 60_000, { type: "turn.candidate", text: "No, I think that's all, thank you." }],
  ]);
  assert.equal(r.s.phase, "wrap");
  assert.ok(r.all[2].actions.some((a) => a.type === "end"));
});

test("curveball schedule is reproducible and respects frequency", () => {
  assert.deepEqual(scheduleCurveballs(cfg()), scheduleCurveballs(cfg()));
  assert.equal(scheduleCurveballs(cfg({ curveballs: { frequency: "none", disabled: [] } })).length, 0);
  assert.equal(scheduleCurveballs(cfg({ curveballs: { frequency: "frequent", disabled: [] } })).length, 2);
  assert.equal(scheduleCurveballs(cfg({ kind: "behavioral" })).length, 0);
});

test("surprise tone resolves deterministically", () => {
  assert.equal(resolveTone("surprise", 7), resolveTone("surprise", 7));
  assert.equal(resolveTone("tough", 7), "tough");
});

const el = (id: string, type: string, extra: Partial<SceneElement> = {}): SceneElement => ({ id, type, ...extra });

test("whiteboard snapshot: labelled shapes, arrows, notes, tags", () => {
  const scene = [
    el("c", "rectangle"), el("ct", "text", { text: "Client", containerId: "c" }),
    el("a", "rectangle"), el("at", "text", { text: "API server", containerId: "a" }),
    el("d", "rectangle"), el("dt", "text", { text: "Postgres", containerId: "d" }),
    el("e1", "arrow", { startBinding: { elementId: "c" }, endBinding: { elementId: "a" } }),
    el("e2", "arrow", { startBinding: { elementId: "a" }, endBinding: { elementId: "d" } }), el("e2t", "text", { text: "reads", containerId: "e2" }),
    el("n", "text", { text: "10k QPS" }),
    el("gone", "rectangle", { isDeleted: true }),
  ];
  const s = snapshotScene(scene);
  assert.deepEqual(s.nodes.map((n) => [n.label, n.tag]), [["Client", "client"], ["API server", "service"], ["Postgres", "database"]]);
  assert.deepEqual(s.edges.map((e) => [e.from, e.to, e.label]), [["Client", "API server", ""], ["API server", "Postgres", "reads"]]);
  assert.deepEqual(s.notes, ["10k QPS"]);
  const d = digestScene(null, s)!;
  assert.match(d.diff, /added "Client"/);
  assert.equal(digestScene(s, s), null);
  // read-heavy question, four components, no cache → suspicion
  const s2 = snapshotScene([...scene, el("w", "rectangle"), el("wt", "text", { text: "Redirect service", containerId: "w" })]);
  assert.ok(diagramRules(s2, constraintFlags(Q)).some((h) => h.rule === "read-path-no-cache"));
  const s3 = snapshotScene([...scene, el("r", "rectangle"), el("rt", "text", { text: "Redis cache", containerId: "r" })]);
  assert.ok(!diagramRules(s3, constraintFlags(Q)).some((h) => h.rule === "read-path-no-cache"));
});

test("class sketches are parsed from LLD boxes", () => {
  const s = snapshotScene([el("b", "rectangle"), el("bt", "text", { text: "ParkingLot\nlevels: List<Level>\npark(v: Vehicle): Ticket", containerId: "b" })]);
  assert.deepEqual(s.classes, [{ name: "ParkingLot", fields: ["levels: List<Level>"], methods: ["park(v: Vehicle): Ticket"] }]);
});

test("tags", () => {
  assert.equal(tagFor("Kafka"), "queue");
  assert.equal(tagFor("S3 bucket"), "object-store");
  assert.equal(tagFor("Load Balancer"), "lb");
  assert.equal(tagFor("Thing"), "unknown");
});

test("text digest reports the changed block only", () => {
  const d = digestText("code", "a\nb\nc", "a\nB\nc")!;
  assert.match(d.diff, /lines 2-2 now read:\nB/);
  assert.equal(digestText("code", "x", "x "), null);
});

test("transcript merges roles and buildTurn ends on a user message", () => {
  const log: LoggedEvent[] = [
    { seq: 1, t: 0, e: { type: "turn.interviewer", text: "Hi", origin: "phase" } },
    { seq: 2, t: 1, e: { type: "turn.candidate", text: "Hello" } },
    { seq: 3, t: 2, e: { type: "turn.candidate", text: "Ready" } },
  ];
  const m = transcript(log);
  assert.deepEqual(m.map((x) => x.role), ["user", "assistant", "user"]);
  assert.equal(m[2].content, "Hello\nReady");
  const c = cfg();
  const s = initBrain(c, Q, 0);
  const t = buildTurn(c, s, [...log, { seq: 4, t: 3, e: { type: "turn.interviewer", text: "Go on", origin: "reply" } }], 1000, "nudge", true);
  assert.equal(t[t.length - 1].role, "user");
  assert.match(t[t.length - 1].content, /\[silence\]/);
});

test("scorecard parse clamps and aggregates by median", () => {
  const mk = (d: string, s: number) => parseScorecard("hld", JSON.stringify({ decision: d, ratings: [{ dimension: "scoping", score: s, evidence: [{ seq: 3, quote: "x" }] }] }));
  const a = mk("hire", 4), b = mk("leaning_hire", 2), c = mk("hire", 9);
  assert.equal(c.ratings[0].score, 4);
  assert.equal(a.ratings.length, 5);
  const agg = aggregateScorecards([a, b, c]);
  assert.equal(agg.decision, "hire");
  assert.equal(agg.ratings[0].score, 4);
  assert.equal(agg.samples, 3);
});

test("delivery stats", () => {
  const log: LoggedEvent[] = [
    { seq: 1, t: 0, e: { type: "phase.changed", from: "lobby", to: "problem" } },
    { seq: 2, t: 1000, e: { type: "turn.interviewer", text: "Design a cache", origin: "phase" } },
    { seq: 3, t: 31_000, e: { type: "turn.candidate", text: "Um, what is the read to write ratio?" } },
    { seq: 4, t: 60_000, e: { type: "turn.interviewer", text: "Ten to one", origin: "reply" } },
  ];
  const st = deliveryStats(log);
  assert.equal(st.longestSilenceS, 30);
  assert.equal(st.firstClarifyS, 31);
  assert.ok(st.talkShare > 0.5);
});

test("mock days get denser toward the end and stay in range", () => {
  const d = mockDays(56, 8);
  assert.equal(d.length, 8);
  assert.ok(d.every((x, i) => x >= 0 && x < 56 && (i === 0 || x > d[i - 1])));
  assert.ok(d[1] - d[0] > d[7] - d[6]);
});
