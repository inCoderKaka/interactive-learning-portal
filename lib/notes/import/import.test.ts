import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown } from "./doc.ts";
import { containment, jaccard, shingles } from "./text.ts";
import { StateGraph, END } from "./graph.ts";
import { DEFAULT_CONFIG, backgroundConfig, buildImportGraph, initialState, ledger, renderDraft, type ImportEnv, type ImportState, type LlmCall } from "./pipeline.ts";

const DOC = `# Sliding window

Keep a window [l, r] and move r forward; shrink from l while the window is invalid.

- Works when the condition is monotonic in window size
- Each index enters and leaves once, so O(n)

\`\`\`python
def longest(s):
    seen = {}
    return 0
\`\`\`

## Pitfalls

Forgetting to update the answer after shrinking.

| case | fix |
| --- | --- |
| empty | return 0 |

# Heaps

A heap gives the min in O(1) and pops in O(log n).

**Top k**

Keep a min-heap of size k.

![diagram][image1]

[image1]: <data:image/png;base64,iVBORw0KGgo=>
`;

test("parses structure into numbered blocks and heading sections", () => {
  const d = parseMarkdown(DOC, "notes");
  const kinds = d.order.map((id) => d.blocks[id].kind);
  assert.deepEqual(kinds.filter((k) => k !== "heading"), ["para", "list", "list", "code", "para", "table", "para", "para", "image"]);
  assert.equal(d.sections.length, 4);
  assert.deepEqual(d.sections.map((s) => s.title), ["Sliding window", "Pitfalls", "Heaps", "Top k"]);
  assert.deepEqual(d.sections[1].path, ["Sliding window", "Pitfalls"]);
  assert.deepEqual(d.sections[3].path, ["Heaps", "Top k"]); // a bold line reads as a heading
  const img = d.blocks[d.sections[3].blocks[1]];
  assert.equal(img.kind, "image");
  assert.ok(img.src?.startsWith("data:image/png"));
  assert.equal(d.images, 1);
  assert.equal(d.weak, false);
});

test("splits big sections and chunks documents without headings", () => {
  const para = "word ".repeat(300).trim();
  const big = parseMarkdown(`# Big\n\n${Array(8).fill(para).join("\n\n")}`);
  assert.ok(big.sections.length > 1);
  assert.ok(big.sections.every((s) => s.chars <= 6000 + para.length));
  assert.match(big.sections[1].title, /part 2/);
  const flat = parseMarkdown(Array(6).fill(para).join("\n\n"), "flat");
  assert.equal(flat.weak, true);
  assert.ok(flat.sections.length >= 3);
});

test("similarity and containment", () => {
  assert.equal(jaccard(shingles("the quick brown fox jumps high"), shingles("the quick brown fox jumps high")), 1);
  assert.ok(jaccard(shingles("binary search halves the range each step"), shingles("heaps keep the minimum on top")) < 0.1);
  assert.ok(containment("Each index enters and leaves once, so O(n)", "every index enters the window once and leaves once: O(n) total") > 0.6);
  assert.ok(containment("Forgetting to update the answer after shrinking", "Use a hash map") < 0.2);
});

test("graph: interrupts pause and resume with a value; conditional edges loop", async () => {
  type S = { n: number; approved?: boolean; log: string[] };
  const g = new StateGraph<S>()
    .addNode("a", (s) => ({ n: s.n + 1, log: [...s.log, "a"] }))
    .addNode("gate", (s, ctx) => { const ok = ctx.interrupt<boolean>({ ask: "approve?" }); return { approved: ok, log: [...s.log, "gate"] }; })
    .addNode("loop", (s) => ({ n: s.n + 1, log: [...s.log, "loop"] }))
    .addEdge("a", "gate").addEdge("gate", "loop")
    .addConditionalEdges("loop", (s) => (s.n < 4 ? "loop" : END))
    .setEntry("a");
  const saved: number[] = [];
  const cp1 = await g.run(g.start({ n: 0, log: [] }), { onCheckpoint: (c) => { saved.push(c.step); } });
  assert.equal(cp1.next, "gate");
  assert.deepEqual(cp1.interrupt?.payload, { ask: "approve?" });
  const cp2 = await g.run(cp1, { resume: true });
  assert.equal(cp2.next, null);
  assert.equal(cp2.state.approved, true);
  assert.equal(cp2.state.n, 4);
  assert.deepEqual(cp2.state.log, ["a", "gate", "loop", "loop", "loop"]);
  assert.ok(saved.length >= 1);
});

// ---- the import pipeline with a scripted model ----

function fakeEnv(opts: { missBlock?: string; neverCover?: boolean; dupe?: boolean; batchChars?: number } = {}) {
  const calls: LlmCall[] = [];
  let committed: ImportState | null = null;
  const env: ImportEnv = {
    catalog: [{ id: "sliding-window", area: "dsa", title: "Sliding window", blurb: "" }, { id: "heap", area: "dsa", title: "Heaps", blurb: "" }],
    prior: [],
    models: () => ({ provider: "gemini", model: "test", tier: "small", webUsd: 0, concurrency: 2, batchChars: opts.batchChars ?? 7000, price: (i, o) => (i + o) / 1e6 }),
    commit: async (s) => { committed = s; return Object.values(s.drafts).filter((d) => d.accepted && !d.dupOf).map((d) => d.id); },
    llm: async (c) => {
      calls.push(c);
      const ids = (re: RegExp) => [...c.user.matchAll(re)].map((m) => m[1]);
      let out: unknown = {};
      if (c.step === "map") out = { sections: ids(/^\[(s\d+)\]/gm).map((id) => ({ id, topic: c.user.includes(`[${id}] Heaps`) || c.user.includes(`[${id}] Heaps › Top k`) ? "heap" : "sliding-window", confidence: 0.9, reason: "fits" })) };
      if (c.step === "extract") {
        const secs = [...c.user.matchAll(/### SECTION (s\d+)[^\n]*\n([\s\S]*?)(?=\n### SECTION|$)/g)];
        out = { notes: secs.flatMap(([, sid, body]) => {
          const blocks = [...body.matchAll(/^\[(b\d+)\] ([^\n]*)/gm)].filter(([, b]) => opts.neverCover ? false : b !== opts.missBlock);
          const n = blocks.map(([, b, rest]) => ({ section: sid, title: `Note ${b}`, md: /^(code|table|image)/.test(rest) ? `[[${b}]]` : rest.replace(/^[a-z ]+: /, ""), covers: [b] }));
          return opts.dupe && sid === "s1" ? [...n, { ...n[0] }] : n;
        }) };
      }
      if (c.step === "verify") out = { notes: [...c.user.matchAll(/^NOTE (d\d+): [^\n]*\n([\s\S]*?)\n\nSOURCE BLOCKS/gm)].map(([, id, md], i) => ({ id, coherent: i !== 0, faithful: true, issues: i === 0 ? ["fragment"] : [], md: i === 0 ? `${md} (corrected)` : null })) };
      if (c.step === "coverage") out = { missing: [] };
      if (c.step === "dedup") out = { pairs: [] };
      return { text: JSON.stringify(out), inTok: 100, outTok: 50, usd: 0.001, ms: 5 };
    },
  };
  return { env, calls, get committed() { return committed; } };
}

test("pipeline: plan approval, first-batch checkpoint and final review, then commit", async () => {
  const f = fakeEnv({ batchChars: 200 });
  const g = buildImportGraph(f.env);
  const doc = parseMarkdown(DOC, "notes");
  let cp = await g.run(g.start(initialState("r1", doc, DEFAULT_CONFIG)));
  assert.equal(cp.interrupt?.node, "approve");
  assert.equal(cp.state.plan["s3"].topic, "heap");
  assert.ok(cp.state.estimate && cp.state.estimate.usd[1] > 0);
  cp = await g.run(cp, { resume: {} });
  assert.equal(cp.interrupt?.node, "extract"); // first-batch checkpoint
  cp = await g.run(cp, { resume: {} });
  assert.equal(cp.interrupt?.node, "final");
  const fixed = Object.values(cp.state.drafts).find((d) => d.verify?.state === "fixed");
  assert.ok(fixed && fixed.verify?.original && fixed.md.endsWith("(corrected)"));
  assert.equal(cp.state.ledger?.missing, 0);
  cp = await g.run(cp, { resume: {} });
  assert.equal(cp.next, null);
  assert.ok(cp.state.committed && cp.state.committed.length > 0);
  assert.equal(cp.state.usage.calls, f.calls.length);
});

test("pipeline: background mode runs end to end; missed blocks are recovered", async () => {
  const doc = parseMarkdown(DOC, "notes");
  const miss = doc.sections[0].blocks[0];
  const f = fakeEnv({ missBlock: miss });
  const g = buildImportGraph(f.env);
  let missedOnce = true;
  const env2 = { ...f.env, llm: async (c: LlmCall, sig: AbortSignal) => {
    // the recovery pass covers the block the first pass missed
    if (c.step === "extract" && c.user.includes("were missed") && missedOnce) { missedOnce = false; return { text: JSON.stringify({ notes: [{ section: "s1", title: "Recovered", md: doc.blocks[miss].md, covers: [miss] }] }), inTok: 1, outTok: 1, usd: 0, ms: 1 }; }
    return f.env.llm(c, sig);
  } };
  const g2 = buildImportGraph(env2);
  void g;
  const cp = await g2.run(g2.start(initialState("r2", doc, backgroundConfig(DEFAULT_CONFIG))));
  assert.equal(cp.next, null);
  assert.ok(Object.values(cp.state.drafts).some((d) => d.origin === "recover" && d.title === "Recovered"));
  assert.equal(cp.state.ledger?.missing, 0);
  assert.equal(cp.state.recoverRounds, 1);
});

test("pipeline: nothing is lost even when the model never covers a block", async () => {
  const doc = parseMarkdown(DOC, "notes");
  const f = fakeEnv({ neverCover: true });
  const g = buildImportGraph(f.env);
  const cfg = backgroundConfig({ ...DEFAULT_CONFIG, steps: { ...DEFAULT_CONFIG.steps, verify: false, deepCoverage: false } });
  const cp = await g.run(g.start(initialState("r3", doc, cfg)));
  const l = ledger(cp.state);
  assert.equal(l.missing, 0);
  assert.equal(l.weak, 0);
  assert.equal(l.covered, l.total);
  const verbatim = Object.values(cp.state.drafts).filter((d) => d.origin === "verbatim");
  assert.equal(verbatim.length, doc.sections.length);
  assert.equal(cp.state.recoverRounds, 2);
  // kept code renders verbatim, images come out as image parts
  const parts = verbatim.flatMap((d) => renderDraft(cp.state, d).parts);
  assert.ok(parts.some((p) => p.t === "md" && p.md.includes("def longest")));
  assert.ok(parts.some((p) => p.t === "image"));
});

test("pipeline: duplicates are set aside, optional steps can be switched off", async () => {
  const doc = parseMarkdown(DOC, "notes");
  const f = fakeEnv({ dupe: true });
  const g = buildImportGraph(f.env);
  const cfg = backgroundConfig({ ...DEFAULT_CONFIG, steps: { ...DEFAULT_CONFIG.steps, verify: false, enrich: false, deepCoverage: false, skip: false } });
  const cp = await g.run(g.start(initialState("r4", doc, cfg)));
  const dups = Object.values(cp.state.drafts).filter((d) => d.dupOf);
  assert.equal(dups.length, 1);
  assert.equal(dups[0].accepted, false);
  assert.equal(cp.state.steps.verify?.status, "skipped");
  assert.equal(cp.state.steps.enrich?.status, "skipped");
  assert.ok(!f.calls.some((c) => c.step === "verify" || c.step === "enrich" || c.step === "coverage"));
});

test("pipeline: an already imported section is skipped by rule", async () => {
  const doc = parseMarkdown(DOC, "notes");
  const f = fakeEnv();
  f.env.prior = [{ id: "n1", topic: "heap", text: "x", hash: doc.sections[2].hash, at: 0 }];
  const g = buildImportGraph(f.env);
  const cp = await g.run(g.start(initialState("r5", doc, DEFAULT_CONFIG)));
  assert.equal(cp.state.plan[doc.sections[2].id].skip?.kind, "imported");
});
