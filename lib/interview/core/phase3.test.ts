// Phase 3: reverse, loop day, bookings, evaluation, peer protocol, data-flow disclosure. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { MISTAKES, candidatePrompt, expectedDecision, gradeOffline, parseGrade, plantMistakes, splitWork } from "./reverse.ts";
import { committeeDecision, defaultLoop, parseCommittee, roundConfig } from "./loop.ts";
import { LATE_MS, LOBBY_MS, icsFor, icsTime, lobbyOpen, missed, upcoming, type Booking } from "./booking.ts";
import { interventionMetrics, scoreCase, summarise } from "./evaluation.ts";
import { EVAL_CASES, INTERVENTION_CASES } from "./eval-cases.ts";
import { Reassembler, encode, mergeElements, roomCode, validCode, type PeerMsg } from "./peer.ts";
import { dataFlow, staysLocal } from "./dataflow.ts";
import { DIMENSIONS, type Scorecard } from "./scoring.ts";
import type { InterviewQuestion, SessionConfig } from "./types.ts";

const cfg = (p: Partial<SessionConfig> = {}): SessionConfig => ({
  kind: "coding", selection: { mode: "random-all", preferUnseen: true }, tone: "neutral", level: "L4", minutes: 45,
  arc: { intro: true, aboutYou: true, curveball: true, questionsForMe: true }, pressure: "realistic",
  curveballs: { frequency: "none", disabled: [] }, engine: "text", voice: { rate: 1, captions: true }, mode: "real", plainDoc: true, seed: 3, ...p,
});
const Q: InterviewQuestion = { id: "q", kind: "coding", title: "T", statement: "Find two numbers that sum to a target.", constraints: "", followUps: [], redFlags: [], reference: "", source: "curriculum" };
const card = (decision: Scorecard["decision"], scores: Record<string, number> = {}): Scorecard => ({
  decision, level: "L4", summary: "", strengths: [], improvements: [], curveballs: [], hintsNote: "", samples: 1,
  ratings: Object.entries(scores).map(([dimension, score]) => ({ dimension, score, evidence: [], note: "" })),
});

test("reverse: planted mistakes are per kind, distinct and reproducible", () => {
  for (const kind of ["coding", "hld", "lld", "behavioral"] as const) {
    const a = plantMistakes(kind, 11), b = plantMistakes(kind, 11);
    assert.deepEqual(a.map((m) => m.id), b.map((m) => m.id));
    assert.equal(new Set(a.map((m) => m.id)).size, 3);
    assert.ok(a.every((m) => m.kinds.includes(kind) && DIMENSIONS[kind].some((d) => d.key === m.dimension)), kind);
  }
  assert.equal(new Set(MISTAKES.map((m) => m.id)).size, MISTAKES.length);
  assert.equal(expectedDecision(3), "leaning_no_hire");
  assert.equal(expectedDecision(0), "hire");
});

test("reverse: the candidate prompt carries the mistakes; work is split from speech", () => {
  const ms = plantMistakes("coding", 2);
  const p = candidatePrompt("coding", "L4", Q, ms, 2, true);
  for (const m of ms) assert.ok(p.includes(m.act));
  assert.ok(p.includes("<doc>") && p.includes("not read aloud"));
  const w = splitWork("Let me write it.\n<doc>\ndef f():\n  return 1\n</doc>\nThat's O(n).");
  assert.equal(w.doc, "def f():\n  return 1");
  assert.equal(w.speech, "Let me write it.\n\nThat's O(n).");
  assert.equal(splitWork("<board>A -> B</board>").board, "A -> B");
  assert.equal(splitWork("half <doc>x = 1").doc, "x = 1"); // unterminated block still goes to the doc
});

test("reverse: grading offline and from model JSON", () => {
  const planted = MISTAKES.filter((m) => ["wrong-complexity", "off-by-one", "no-clarify"].includes(m.id));
  const fb = { decision: "leaning_no_hire" as const, scores: {}, notes: "They said O(n) but it is a nested loop. Never tested it." };
  const g = gradeOffline(fb, planted);
  assert.equal(g.caught.filter((c) => c.caught).length, 1);
  assert.ok(g.caught.find((c) => c.id === "wrong-complexity")!.caught);
  assert.equal(g.ai, false);
  const j = parseGrade('```json\n{"caught":[{"id":"off-by-one","caught":true,"evidence":"bound"}],"decisionNote":"ok"}\n```', fb, planted);
  assert.equal(j.caught.filter((c) => c.caught).length, 1);
  assert.equal(j.decisionNote, "ok");
  assert.ok(j.score > 0 && j.score <= 100);
});

test("loop: plans by level, independent rounds, committee rule", () => {
  assert.deepEqual(defaultLoop("L5", "x").rounds.map((r) => r.kind), ["coding", "coding", "hld", "behavioral"]);
  assert.equal(defaultLoop("L6", "x").rounds.length, 5);
  const plan = defaultLoop("L4", "loop1");
  const rs = plan.rounds.map((_, i) => roundConfig(cfg({ tone: "surprise" }), plan, i, 99, "gemini"));
  assert.equal(new Set(rs.map((r) => r.seed)).size, rs.length);
  assert.equal(new Set(rs.map((r) => r.voice.voiceId)).size, rs.length);
  assert.ok(rs.every((r, i) => r.loop?.index === i && r.loop.total === 4 && r.tone !== "surprise"));
  assert.equal(rs[3].kind, "behavioral");
  assert.equal(committeeDecision([]), null);
  assert.equal(committeeDecision([{ title: "a", kind: "coding", card: card("hire") }, { title: "b", kind: "coding", card: card("hire") }, { title: "c", kind: "hld", card: card("strong_no_hire") }]), "no_hire");
  assert.equal(committeeDecision([{ title: "a", kind: "coding", card: card("hire") }, { title: "b", kind: "coding", card: card("leaning_no_hire") }, { title: "c", kind: "hld", card: card("no_hire") }, { title: "d", kind: "behavioral", card: card("strong_hire") }]), "leaning_no_hire");
  assert.equal(committeeDecision([{ title: "a", kind: "coding", card: card("hire") }, { title: "b", kind: "coding", card: card("strong_hire") }, { title: "c", kind: "coding", card: card("leaning_hire") }]), "hire");
  assert.equal(parseCommittee("nope", "hire").decision, "hire");
  assert.equal(parseCommittee('{"decision":"no_hire","summary":"s"}', "hire").decision, "no_hire");
});

test("booking: lobby window, missed slots and a valid .ics", () => {
  const b: Booking = { id: "b1", at: 1_000_000_000_000, title: "Mock, interview; L5", cfg: cfg({ minutes: 45 }), createdAt: 0 };
  assert.equal(lobbyOpen([b], b.at - LOBBY_MS - 1), null);
  assert.equal(lobbyOpen([b], b.at - LOBBY_MS + 1)?.id, "b1");
  assert.equal(upcoming([b], b.at + LATE_MS + 1).length, 0);
  assert.equal(missed([b], b.at + LATE_MS + 1).length, 1);
  assert.equal(lobbyOpen([{ ...b, startedAt: 1 }], b.at), null);
  assert.equal(icsTime(Date.UTC(2026, 10, 19, 9, 5, 0)), "20261119T090500Z");
  const ics = icsFor(b, "https://ascent.example/mock?booking=b1", 0);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(ics.includes("SUMMARY:Mock\\, interview\\; L5"));
  assert.ok(ics.includes(`DTEND:${icsTime(b.at + 45 * 60000)}`));
  assert.ok(ics.split("\r\n").every((l) => l.length <= 75));
});

test("evaluation: case scoring, summary and the built-in set", () => {
  const s = scoreCase({ decision: "hire", scores: { algorithms: 4, coding: 3 } }, card("leaning_hire", { algorithms: 3, coding: 3 }));
  assert.equal(s.decisionDelta, -1);
  assert.ok(s.withinOne && !s.exact);
  assert.equal(s.mae, 0.5);
  const sum = summarise([
    { id: "a", title: "", expected: { decision: "hire", scores: {} }, got: card("hire"), ms: 100, costUsd: 0.01 },
    { id: "b", title: "", expected: { decision: "hire", scores: {} }, error: "x", ms: 50, costUsd: 0 },
  ]);
  assert.deepEqual([sum.n, sum.failed, sum.exact], [2, 1, 1]);
  for (const c of EVAL_CASES) {
    assert.ok(c.log.some((e) => e.e.type === "turn.candidate"), c.id);
    assert.deepEqual(Object.keys(c.label.scores).sort(), DIMENSIONS[c.cfg.kind].map((d) => d.key).sort(), c.id);
  }
  assert.ok(INTERVENTION_CASES.some((c) => c.speak) && INTERVENTION_CASES.some((c) => !c.speak));
  const im = interventionMetrics([{ id: "1", expected: true, got: true }, { id: "2", expected: false, got: true }, { id: "3", expected: true, got: false }, { id: "4", expected: false, got: null }]);
  assert.deepEqual([im.precision, im.recall, im.failed], [0.5, 0.5, 1]);
});

test("peer: room codes, chunked messages and whiteboard merge", () => {
  let i = 0;
  const code = roomCode(() => (i++ * 0.13) % 1);
  assert.ok(validCode(code), code);
  assert.ok(!validCode("ABC0O1"));
  const big: PeerMsg = { k: "doc", surface: "code", text: "x".repeat(30000) };
  const parts = encode(big, "m1");
  assert.ok(parts.length === 3);
  const r = new Reassembler();
  assert.equal(r.push(parts[2]), null);
  assert.equal(r.push(parts[0]), null);
  assert.deepEqual(r.push(parts[1]), big);
  assert.deepEqual(r.push(encode({ k: "end" }, "m2")[0]), { k: "end" });
  const merged = mergeElements([{ id: "a", version: 2 }, { id: "b", version: 5 }], [{ id: "a", version: 3, isDeleted: true }, { id: "b", version: 4 }, { id: "c", version: 1 }]);
  assert.deepEqual(merged.map((e) => `${e.id}${e.version}`).sort(), ["a3", "b5", "c1"]);
});

test("dataflow: privacy mode stays local, realtime and webspeech do not", () => {
  const local = dataFlow({ engine: "ascent-voice", stt: "whisper-local", tts: "browser-local", llm: ["local"], recordAudio: true, recordCloud: false, signedIn: false });
  assert.ok(staysLocal(local));
  assert.ok(!staysLocal(dataFlow({ engine: "ascent-voice", stt: "webspeech", tts: "browser", llm: ["local"], recordAudio: false, recordCloud: false, signedIn: false })));
  const rt = dataFlow({ engine: "realtime", realtime: "openai", stt: "webspeech", tts: "browser", llm: ["claude"], recordAudio: false, recordCloud: false, signedIn: true });
  assert.deepEqual(rt[0], { data: "Your voice", to: ["OpenAI (Realtime)"] });
  assert.ok(rt.some((f) => f.to.includes("your Ascent account (Supabase)")));
});

import { AgoraTranscripts, readLine, readState } from "./agora-transcript.ts";

test("agora: stream messages reassemble across parts and read as transcript lines", () => {
  const json = JSON.stringify({ object: "assistant.transcription", text: "Hi, I'm Sam. Let's begin.", turn_id: 2, turn_status: 1 });
  const b64 = Buffer.from(json, "utf8").toString("base64");
  const half = Math.ceil(b64.length / 2);
  const t = new AgoraTranscripts();
  assert.equal(t.push(`m1|1|2|${b64.slice(half)}`), null);
  const o = t.push(`m1|0|2|${b64.slice(0, half)}`)!;
  assert.deepEqual(readLine(o), { role: "agent", text: "Hi, I'm Sam. Let's begin.", final: true, interrupted: false, turn: 2 });
  const u = t.push(`m2|0|1|${Buffer.from(JSON.stringify({ object: "user.transcription", text: "hello", final: false })).toString("base64")}`)!;
  assert.equal(readLine(u)!.final, false);
  assert.equal(readLine({ object: "assistant.transcription", text: "cut", turn_status: 2 })!.interrupted, true);
  assert.equal(readState({ object: "message.state", state: "speaking" }), "speaking");
  assert.equal(readLine({ object: "message.metrics" }), null);
  assert.equal(t.push("not a message"), null);
});
