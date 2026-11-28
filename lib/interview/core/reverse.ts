// Reverse mode (MI-X-1): the learner interviews an AI candidate who makes planted mistakes, writes the
// feedback, and sees which mistakes they caught. Pure: the planted set, prompts and grading parse.

import type { InterviewQuestion, Kind, Level } from "./types.ts";
import type { Decision } from "./scoring.ts";
import { DECISIONS } from "./scoring.ts";
import { KIND_NAME } from "./prompts.ts";
import { fragment, type Overrides } from "./templates.ts";
import { rng, shuffle } from "./rng.ts";

export interface PlantedMistake {
  id: string;
  kinds: Kind[];
  label: string;        // what a good interviewer should notice, shown after grading
  act: string;          // how the AI candidate behaves
  keywords: RegExp;     // offline fallback: does the feedback mention it?
  dimension: string;    // rubric dimension it costs
}

const M = (id: string, kinds: Kind[], dimension: string, label: string, act: string, keywords: RegExp): PlantedMistake => ({ id, kinds, dimension, label, act, keywords });

export const MISTAKES: PlantedMistake[] = [
  M("no-clarify", ["coding"], "communication", "Started coding without clarifying the input (size, duplicates, empty input).", "Do not ask any clarifying question; assume the input is non-empty and sorted without saying you assumed it.", /clarif|assum|sorted|empty input|ask(ed)? (about|question)/i),
  M("wrong-complexity", ["coding"], "algorithms", "Stated the wrong time complexity for their own solution.", "When you state the complexity of your solution, under-state it by one class (for example call a nested loop O(n)).", /complexit|big.?o|o\(n|quadratic|nested loop/i),
  M("off-by-one", ["coding"], "coding", "An off-by-one error in a loop bound or index.", "Write one loop with an off-by-one bound (for example i <= n on a 0-indexed array) and do not notice it.", /off.?by.?one|bound|index|<=|out of range/i),
  M("no-edge-cases", ["coding"], "problemSolving", "Never considered edge cases or tested the code.", "Never walk through a test case or mention edge cases unless asked twice.", /edge case|test(ed|ing)?|walk ?through|dry.?run|corner/i),
  M("brute-force-claim", ["coding"], "algorithms", "Presented a brute-force solution as optimal.", "Propose a brute-force approach and claim it cannot be improved, even though it can.", /brute|optimal|better approach|improv|faster/i),
  M("mutate-input", ["coding"], "coding", "Mutated the input without asking whether that is allowed.", "Sort or modify the input in place without asking if that is allowed.", /mutat|in.?place|modif(y|ies|ied) the input|side effect/i),
  M("no-baseline", ["ml"], "modeling", "Jumped to a complex model without a simple baseline.", "Propose a large deep model straight away and never mention a simple baseline or heuristic to beat.", /baseline|heuristic|simple(r)? model|logistic|start simple/i),
  M("leaky-split", ["ml"], "data", "A random split on time-ordered data, leaking the future into training.", "Split the data randomly into train and test even though it is time-ordered, and use a feature computed after the label time.", /leak|time.?based|temporal|split by time|future|point.?in.?time/i),
  M("wrong-metric", ["ml"], "framing", "Optimised a metric that does not match the product goal.", "Choose accuracy as the main metric even though positives are rare, and never connect it to an online metric.", /precision|recall|auc|imbalanc|online metric|business metric|accuracy/i),
  M("no-monitoring", ["ml"], "production", "No plan for drift, monitoring or retraining.", "Say the model is done once deployed; never mention monitoring, drift or retraining.", /monitor|drift|retrain|freshness|stale|alert/i),
  M("unstable-softmax", ["mlcode"], "testing", "A softmax or log that overflows on large inputs.", "Write softmax as exp(x) / sum(exp(x)) without subtracting the max, and take log of probabilities directly.", /overflow|stab|subtract.{0,10}max|log.?sum.?exp|nan|inf/i),
  M("shape-bug", ["mlcode"], "coding", "A broadcasting or shape mistake.", "Make one broadcasting mistake (for example sum over the wrong axis) and do not check shapes.", /shape|axis|broadcast|dimension|transpose/i),
  M("wrong-gradient", ["mlcode"], "ml", "A gradient with a wrong sign or a missing term.", "Derive the gradient with one error (a wrong sign or a missing 1/n) and do not check it numerically.", /gradient|sign|derivat|numerical check|finite difference|1\/n/i),
  M("no-estimates", ["hld"], "scoping", "Skipped capacity estimates and never pinned the scale.", "Skip capacity estimates entirely; say 'it should scale' without numbers.", /estimat|capacity|qps|numbers|scale|back.of/i),
  M("single-db", ["hld"], "design", "One database with no replication or sharding at a scale that needs it.", "Put everything in a single relational database with no replicas or sharding, and say it will be fine.", /single (db|database)|shard|replica|partition|single point/i),
  M("no-cache", ["hld"], "design", "No cache on a read-heavy path.", "Serve every read straight from the database; do not mention caching unless asked.", /cach|redis|memcache|read.heavy/i),
  M("sync-fanout", ["hld"], "tradeoffs", "Synchronous fan-out where a queue is needed.", "Do slow or fan-out work synchronously inside the request; do not use a queue.", /queue|async|kafka|synchron|fan.?out|background/i),
  M("no-failure", ["hld"], "tradeoffs", "Never discussed failures, retries or availability.", "Never talk about what happens when a component fails.", /fail|retry|availab|redundan|outage|fault/i),
  M("hand-wavy-api", ["hld"], "depth", "A vague API: no pagination, idempotency or error cases.", "Describe the API vaguely (\"a POST endpoint\") with no pagination, idempotency or error handling.", /api|pagina|idempot|endpoint|contract/i),
  M("god-class", ["lld"], "modeling", "A god class that owns most of the behaviour.", "Put most responsibilities into one big Manager class.", /god class|manager class|single responsib|too (many|much)|cohesion/i),
  M("inheritance-abuse", ["lld"], "principles", "Inheritance where composition fits.", "Use deep inheritance for variation that should be composition or a strategy.", /inherit|composition|strategy|subclass/i),
  M("no-abstraction", ["lld"], "principles", "No interface at the point most likely to change.", "Hard-code the part most likely to change (payment types, pricing rules) with if/else chains.", /interface|abstract|if.?else|extensib|open.?closed|switch/i),
  M("no-concurrency", ["lld"], "behaviour", "Ignored concurrency on shared state.", "Ignore concurrent access to shared state (two users booking the same slot).", /concurren|thread|lock|race|atomic|simultaneous/i),
  M("we-not-i", ["behavioral"], "ownership", "Said \"we\" throughout and never their own contribution.", "Describe what 'we' did throughout; never say what you personally did or decided.", /\bwe\b|own contribution|personally|ownership|\bi\b did/i),
  M("no-result", ["behavioral"], "impact", "No concrete, measurable result.", "End the story without any measurable result or outcome.", /result|impact|measur|metric|outcome|number/i),
  M("blame", ["behavioral"], "reflection", "Blamed others for the problem.", "Blame another team or person for the problem and take no responsibility.", /blam|responsib|accountab|fault/i),
  M("no-reflection", ["behavioral"], "reflection", "No reflection on what they would do differently.", "If asked what you learned, give a generic answer like 'communication is important'.", /reflect|learn|differently|lesson|generic/i),
];

/** Pick `n` planted mistakes for a kind, reproducibly from the seed. */
export function plantMistakes(kind: Kind, seed: number, n = 3): PlantedMistake[] {
  return shuffle(rng(seed ^ 0x5eed), MISTAKES.filter((m) => m.kinds.includes(kind))).slice(0, n);
}

/** The fair decision for a candidate who made `n` planted mistakes and nothing else. */
export function expectedDecision(n: number): Decision {
  return n >= 4 ? "no_hire" : n === 3 ? "leaning_no_hire" : n === 2 ? "leaning_no_hire" : n === 1 ? "leaning_hire" : "hire";
}

const CANDIDATE_NAMES = ["Alex", "Sam", "Jordan", "Priya", "Wei", "Maya", "Diego", "Noor"];
export const candidateName = (seed: number) => CANDIDATE_NAMES[Math.abs(seed) % CANDIDATE_NAMES.length];

/** System prompt for the AI candidate. `voice`: spoken engines, so code goes to the doc, not the speech. */
export function candidatePrompt(kind: Kind, level: Level, q: InterviewQuestion, mistakes: PlantedMistake[], seed: number, voice: boolean, overrides?: Overrides): string {
  return `${fragment("reverse.candidate", overrides, { kind: KIND_NAME[kind], level, mistakes: mistakes.map((m, i) => `${i + 1}. ${m.act}`).join("\n") })}

Your name is ${candidateName(seed)}. You do not know the question until the interviewer asks it. For your own reference, the question will be close to: ${q.statement}

${kind === "coding" || kind === "lld" || kind === "mlcode"
    ? `When you write ${kind === "lld" ? "classes" : "code"}, put them between <doc> and </doc>. That text appears in the shared doc the interviewer sees${voice ? " and is not read aloud; say what you are writing in one short sentence instead" : ""}. Each <doc> block replaces the doc's whole content, so always include the full current version.`
    : kind === "hld" || kind === "ml" ? `When you sketch your design, put the components and connections between <board> and </board>, one per line like "Client -> API -> DB". That appears on the shared whiteboard${voice ? " and is not read aloud" : ""}. Each block replaces the whole board.` : ""}
${voice ? "This is spoken: reply in one to four short sentences, no lists or markdown outside the blocks." : "Keep each message under 150 words outside the blocks."}`;
}

/** Separate what the AI candidate says from what it writes in the shared doc or on the board. */
export function splitWork(text: string): { speech: string; doc?: string; board?: string } {
  let doc: string | undefined, board: string | undefined;
  const speech = text
    .replace(/<doc>([\s\S]*?)(?:<\/doc>|$)/gi, (_, d: string) => { doc = d.replace(/^\n+|\n+$/g, ""); return ""; })
    .replace(/<board>([\s\S]*?)(?:<\/board>|$)/gi, (_, b: string) => { board = b.trim(); return ""; })
    .replace(/\n{3,}/g, "\n\n").trim();
  return { speech, doc, board };
}

export interface ReverseFeedback {
  decision: Decision;
  scores: Record<string, number>; // per rubric dimension, 1-4
  notes: string;
}

export interface ReverseGrade {
  caught: { id: string; caught: boolean; evidence: string }[];
  decisionNote: string;
  evidenceNote: string;
  score: number; // 0-100
  ai: boolean;   // false when graded offline by keywords
}

/** Offline grading by keyword match, used when no AI provider is connected or the AI grader fails. */
export function gradeOffline(fb: ReverseFeedback, planted: PlantedMistake[]): ReverseGrade {
  const caught = planted.map((m) => {
    const hit = fb.notes.split(/(?<=[.!?\n])\s*/).find((s) => m.keywords.test(s));
    return { id: m.id, caught: !!hit, evidence: hit?.trim() ?? "" };
  });
  return finish(caught, fb, planted, false, "", "");
}

function finish(caught: ReverseGrade["caught"], fb: ReverseFeedback, planted: PlantedMistake[], ai: boolean, decisionNote: string, evidenceNote: string): ReverseGrade {
  const share = planted.length ? caught.filter((c) => c.caught).length / planted.length : 1;
  const gap = Math.abs(DECISIONS.indexOf(fb.decision) - DECISIONS.indexOf(expectedDecision(planted.length)));
  const decisionScore = gap === 0 ? 1 : gap === 1 ? 0.7 : gap === 2 ? 0.3 : 0;
  const auto = gap === 0 ? "Your decision matches what these mistakes warrant." : `For ${planted.length} mistake${planted.length === 1 ? "" : "s"} like these, a calibrated interviewer would lean towards "${expectedDecision(planted.length).replace(/_/g, " ")}".`;
  return { caught, decisionNote: decisionNote || auto, evidenceNote, score: Math.round(100 * (0.75 * share + 0.25 * decisionScore)), ai };
}

export function gradePrompt(fb: ReverseFeedback, planted: PlantedMistake[], transcript: string, overrides?: Overrides): { system: string; user: string } {
  return {
    system: fragment("reverse.grade", overrides),
    user: `PLANTED MISTAKES:\n${planted.map((m) => `- ${m.id}: ${m.label}`).join("\n")}\n\nTRANSCRIPT:\n${transcript}\n\nTHE INTERVIEWER'S FEEDBACK:\nDecision: ${fb.decision}\nScores: ${JSON.stringify(fb.scores)}\nNotes:\n<<<\n${fb.notes}\n>>>\n\nReturn ONLY JSON: {"caught":[{"id":"mistake id","caught":true|false,"evidence":"the words in the feedback that caught it, or empty"}],"decisionNote":"one or two sentences on the decision","evidenceNote":"one or two sentences on how specific the feedback was"}`,
  };
}

export function parseGrade(text: string, fb: ReverseFeedback, planted: PlantedMistake[]): ReverseGrade {
  const a = text.indexOf("{"), z = text.lastIndexOf("}");
  if (a < 0 || z < 0) throw new Error("The grader did not return JSON.");
  const j = JSON.parse(text.slice(a, z + 1)) as { caught?: { id?: string; caught?: boolean; evidence?: string }[]; decisionNote?: string; evidenceNote?: string };
  const caught = planted.map((m) => {
    const c = (j.caught ?? []).find((x) => x?.id === m.id);
    return { id: m.id, caught: !!c?.caught, evidence: String(c?.evidence ?? "") };
  });
  return finish(caught, fb, planted, true, String(j.decisionNote ?? ""), String(j.evidenceNote ?? ""));
}
