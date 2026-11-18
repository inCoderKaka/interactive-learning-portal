// A small built-in reference set for the evaluation runner (MI-DEV-7). Synthetic transcripts written
// for this purpose, each labelled by hand with a decision and per-dimension scores. It is a starting
// point: the design calls for 30–50 labelled logs, which grows from opted-in real rounds.

import type { EvalCase, InterventionCase } from "./evaluation.ts";
import type { InterviewQuestion, LoggedEvent, SessionConfig, SessionEvent } from "./types.ts";

const base = (kind: SessionConfig["kind"], minutes: number): SessionConfig => ({
  kind, selection: { mode: "random-all", preferUnseen: true }, tone: "neutral", level: "L4", minutes,
  arc: { intro: true, aboutYou: false, curveball: false, questionsForMe: false }, pressure: "realistic",
  curveballs: { frequency: "none", disabled: [] }, engine: "text", voice: { rate: 1, captions: true }, mode: "real", plainDoc: true, seed: 1,
});

/** Turn a compact script into a log: lines starting "I:" are the interviewer, "C:" the candidate, "D:" a code/board digest. */
function script(lines: string[], surface: "code" | "whiteboard" = "code"): LoggedEvent[] {
  const log: LoggedEvent[] = [];
  let t = 0, seq = 0;
  const push = (e: SessionEvent) => log.push({ seq: ++seq, t, e });
  push({ type: "phase.changed", from: "lobby", to: "problem" });
  for (const l of lines) {
    t += 25000 + (l.length % 7) * 4000;
    const body = l.slice(2).trim();
    if (l.startsWith("I:")) push({ type: "turn.interviewer", text: body, origin: "reply" });
    else if (l.startsWith("C:")) push({ type: "turn.candidate", text: body });
    else if (l.startsWith("D:")) push({ type: "digest", surface, diff: "updated", full: body.replace(/\\n/g, "\n") });
  }
  return log;
}

const TWO_SUM: InterviewQuestion = {
  id: "eval-pair-sum", kind: "coding", title: "Pair with target sum", statement: "Given an array of integers and a target, return the indices of two numbers that add up to the target.",
  constraints: "", followUps: ["What if the array is sorted?", "What if there can be many pairs?"], redFlags: ["O(n^2) without discussing better"], reference: "Hash map of value to index, one pass, O(n) time and space. Sorted: two pointers, O(1) space.", source: "curriculum",
};
const SHORTENER: InterviewQuestion = {
  id: "eval-shortener", kind: "hld", title: "URL shortener", statement: "Design a service that turns long URLs into short links and redirects them.",
  constraints: "100 M new links a month; reads outnumber writes 100:1; links live 5 years", followUps: ["Custom aliases", "Analytics"], redFlags: ["No cache on redirects", "Single database"], reference: "Base62 IDs from a counter or random with collision check, KV store sharded by code, cache in front of redirects, CDN, async analytics.", source: "curriculum",
};
const CONFLICT: InterviewQuestion = {
  id: "eval-conflict", kind: "behavioral", title: "Disagreement with a teammate", statement: "Tell me about a time you disagreed with a teammate on a technical decision.",
  constraints: "", followUps: ["What did you personally do?", "What would you do differently?"], redFlags: ["Says 'we' throughout"], reference: "A clear situation, own actions, a measurable outcome and real reflection.", source: "curriculum",
};

export const EVAL_CASES: EvalCase[] = [
  {
    id: "coding-strong", title: "Coding: clear, optimal, tested", source: "built-in", cfg: base("coding", 45), question: TWO_SUM, hints: 0,
    label: { decision: "hire", scores: { algorithms: 4, coding: 3, communication: 4, problemSolving: 3 } },
    log: script([
      "I: Given an array of integers and a target, find two numbers that add up to it.",
      "C: Before I start: can there be duplicates, negative numbers, and is there always exactly one answer? And should I return indices or values?",
      "I: Indices. Assume exactly one answer. Duplicates and negatives are possible.",
      "C: The brute force checks every pair, O(n squared). Better: one pass with a hash map from value to index. For each number I look up target minus it; if it's there I return both indices, otherwise I store the current one. O(n) time, O(n) space.",
      "I: Go ahead.",
      "D: def pair(nums, target):\\n    seen = {}\\n    for i, x in enumerate(nums):\\n        if target - x in seen:\\n            return [seen[target - x], i]\\n        seen[x] = i\\n    return []",
      "C: Let me test it on 2, 7, 11, 15 with target 9: i=0 stores 2, i=1 finds 2, returns 0 and 1. With duplicates, 3 and 3 target 6: the first 3 is stored before the second is checked, so it works. Empty array returns an empty list.",
      "I: What if the array is sorted?",
      "C: Then two pointers from both ends: move left up if the sum is small, right down if it's big. O(n) time and O(1) space, which beats the hash map on memory.",
    ]),
  },
  {
    id: "coding-weak", title: "Coding: brute force, wrong complexity, untested", source: "built-in", cfg: base("coding", 45), question: TWO_SUM, hints: 2,
    label: { decision: "no_hire", scores: { algorithms: 1, coding: 2, communication: 2, problemSolving: 1 } },
    log: script([
      "I: Given an array of integers and a target, find two numbers that add up to it.",
      "C: Okay, I'll just loop over everything.",
      "D: for i in range(len(nums)):\\n    for j in range(len(nums)):\\n        if nums[i] + nums[j] == target:\\n            return [i, j]",
      "I: What's the complexity?",
      "C: It's O(n), we go through the array.",
      "I: Are you sure? Look at the loops.",
      "C: Oh, maybe O(n log n). I think it's fine.",
      "I: Can you think of something faster? Hint: what if you remembered what you had seen?",
      "C: I'm not sure, maybe sorting? I'd keep this one.",
      "I: Does your code handle using the same element twice?",
      "C: I think so.",
    ]),
  },
  {
    id: "hld-leaning-hire", title: "System design: solid core, thin on scale", source: "built-in", cfg: base("hld", 45), question: SHORTENER, hints: 0,
    label: { decision: "leaning_hire", scores: { scoping: 3, design: 3, depth: 2, tradeoffs: 2, communication: 3 } },
    log: script([
      "I: Let's design a URL shortener.",
      "C: Functional requirements: shorten a URL, redirect, optional expiry. Non-functional: low-latency redirects, high availability. What scale?",
      "I: About 100 million new links a month, reads are 100 times writes, and links live 5 years.",
      "C: So roughly 40 writes a second and 4000 redirects a second on average, peaks maybe 5 times that. 6 billion links over five years, at about 500 bytes each that's 3 terabytes.",
      "D: Client -> LB -> API x3 -> Cache (Redis) -> DB (KV store)",
      "C: The API generates a 7-character base62 code. Redirects check Redis first and fall back to the key-value store. I'd use a KV store like DynamoDB keyed by code.",
      "I: How do you generate codes without collisions?",
      "C: Random 7 characters and retry on a collision. With 3.5 trillion combinations collisions are rare.",
      "I: What happens if the cache cluster goes down?",
      "C: Reads go to the database, which may struggle at peak. I'd... add more replicas, I suppose.",
      "I: Anything about analytics?",
      "C: We could write click events to a log table.",
    ], "whiteboard"),
  },
  {
    id: "behavioral-we", title: "Googleyness: 'we' and no result", source: "built-in", cfg: base("behavioral", 30), question: CONFLICT, hints: 0,
    label: { decision: "leaning_no_hire", scores: { structure: 2, ownership: 1, impact: 1, reflection: 2 } },
    log: script([
      "I: Tell me about a time you disagreed with a teammate on a technical decision.",
      "C: Sure. On my last team we were choosing between Postgres and Mongo for a new service. We discussed it a lot and we decided on Postgres because we needed transactions.",
      "I: What did you personally do?",
      "C: We wrote a document together and we presented it to the lead. We all agreed in the end.",
      "I: What was the outcome?",
      "C: The service launched and it went well.",
      "I: What would you do differently?",
      "C: Communicate earlier, I think. Communication is important.",
    ]),
  },
];

export const INTERVENTION_CASES: InterventionCase[] = [
  { id: "redirects-to-db", question: SHORTENER, board: "Components: Client, API, Postgres\nConnections: Client -> API, API -> Postgres (redirect lookups)", trigger: "read-path-no-cache: redirects read the database directly; the candidate moved on to analytics", speak: true },
  { id: "early-sketch", question: SHORTENER, board: "Components: Client, API\nConnections: Client -> API", trigger: "the candidate just started drawing", speak: false },
  { id: "cache-present", question: SHORTENER, board: "Components: Client, LB, API x3, Redis cache, KV store\nConnections: Client -> LB -> API, API -> Redis, API -> KV", trigger: "the whiteboard changed", speak: false },
  { id: "single-db-scaling", question: SHORTENER, board: "Components: Client, LB, API x3, MySQL (single instance)\nConnections: API -> MySQL\nNote: scaling: add more API servers", trigger: "single-db-at-scale: one database at 3 TB and 20k reads/s; the candidate is in the scaling discussion", speak: true },
  { id: "lb-missing", question: SHORTENER, board: "Components: Client, API server 1, API server 2, API server 3, Redis, KV\nConnections: Client -> API server 1, Client -> API server 2", trigger: "lb-missing: three app servers and no load balancer", speak: true },
  { id: "labels-only", question: SHORTENER, board: "Notes: Requirements: shorten, redirect, expiry", trigger: "the candidate wrote requirements on the board", speak: false },
];
