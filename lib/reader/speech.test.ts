// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { align, codeLineToSpeech, describeCode, describeTable, guessLang, listenMinutes, speakable, splitSentences, texToSpeech, toSource, wordAt } from "./speech.ts";

test("sentences: split on terminators, keep decimals, abbreviations and ellipses together", () => {
  const t = "Attention costs O(n²). E.g. a 3.5x jump is big... Really? Yes! Dr. Hinton agreed.";
  const parts = splitSentences(t).map(([s, e]) => t.slice(s, e));
  assert.deepEqual(parts, ["Attention costs O(n²).", "E.g. a 3.5x jump is big... Really?", "Yes!", "Dr. Hinton agreed."]);
});

test("sentences: very long sentences are cut at a soft break", () => {
  const t = Array.from({ length: 40 }, (_, i) => `clause ${i},`).join(" ") + " end.";
  const parts = splitSentences(t, 120);
  assert.ok(parts.length > 2);
  for (const [s, e] of parts) assert.ok(e - s <= 120);
  assert.equal(parts[0][0], 0);
  assert.equal(parts.at(-1)![1], t.length);
});

test("speakable: symbols, Big-O, magnitudes and lexicon", () => {
  assert.equal(speakable("Search is O(n log n) → fast"), "Search is O of n log n to fast");
  assert.equal(speakable("Nvidia lost $590B in a day"), "Nvidia lost 590 billion dollars in a day");
  assert.equal(speakable("a 7B model"), "a 7 billion model");
  assert.equal(speakable("CoT made it 22x slower"), "CoT made it 22 times slower");
  assert.equal(speakable("LoRA vs. full fine-tuning"), "Lora versus full fine-tuning");
  assert.equal(speakable("from 2012–2017"), "from 2012 to 2017");
  assert.equal(speakable("cost ≈ 2·N·D"), "cost approximately 2, N, D");
  assert.equal(speakable("call forward() on top_k"), "call forward on top k");
});

test("align: output offsets map back to the source words", () => {
  const src = "Use LoRA → cheaper.";
  const a = align(src);
  assert.equal(a.out, "Use Lora to cheaper.");
  const i = a.out.indexOf("Lora");
  assert.deepEqual(toSource(a, i, i + 4), [4, 8]);
  const j = a.out.indexOf("cheaper");
  const [s, e] = toSource(a, j, j + 7);
  assert.equal(src.slice(s, e), "cheaper");
});

test("align: atoms (formulas) are spoken in place and map to their placeholder", () => {
  const src = "The score is ⟦0⟧ per pair.";
  const a = align(src, { "⟦0⟧": "Q K transpose" });
  assert.equal(a.out, "The score is Q K transpose per pair.");
  const i = a.out.indexOf("K");
  const [s, e] = toSource(a, i, i + 1);
  assert.equal(src.slice(s, e), "⟦0⟧");
});

test("wordAt finds the word around an offset", () => {
  assert.deepEqual(wordAt("hello big world", 7), [6, 9]);
  assert.deepEqual(wordAt("hello", 0), [0, 5]);
});

test("tex: attention, fractions, sums, expectations and scripts", () => {
  assert.equal(texToSpeech(String.raw`\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{Q K^T}{\sqrt{d_k}}\right) V`),
    "Attention Q, K, V equals softmax Q K transpose over the square root of d k, V");
  assert.equal(texToSpeech(String.raw`\sum_{i=1}^{N} x_i^2`), "the sum over i equals 1 to N of x i squared");
  assert.equal(texToSpeech(String.raw`\mathbb{E}_{x \sim p}[\log D(x)]`), "the expected value over x drawn from p of log D x");
  assert.equal(texToSpeech(String.raw`W_0 + \frac{\alpha}{r} BA`), "W 0 plus alpha over r, B A");
  assert.equal(texToSpeech(String.raw`\hat{m}_t = \beta_1 m_{t-1}`), "m hat t equals beta 1 m sub t minus 1");
  assert.equal(texToSpeech(String.raw`(X^T X)^{-1}`), "X transpose X inverse");
});

test("code: language guess and line reading", () => {
  assert.equal(guessLang("def f(x):\n  return x"), "python");
  assert.equal(guessLang("", "language-ts"), "typescript");
  assert.equal(codeLineToSpeech("def attention(q, k, v, mask=None):", "python"), "define attention, taking q, k, v, mask");
  assert.equal(codeLineToSpeech("    # scale so softmax stays soft"), "Note: scale so softmax stays soft");
  assert.equal(codeLineToSpeech("return weights @ v"), "return weights matrix times v");
  assert.equal(codeLineToSpeech("for i in range(n):"), "for each i in range of n");
  assert.equal(codeLineToSpeech("}"), "");
});

test("code: short snippets go line by line, long ones by definitions and comments", () => {
  const short = describeCode("import torch\nx = torch.randn(2, 3)\nprint(x.shape)", "python");
  assert.equal(short.lang, "python");
  assert.equal(short.steps.length, 3);
  assert.match(short.intro, /3-line Python snippet/);
  const long = describeCode(["class Net:", ...Array.from({ length: 14 }, (_, i) => `    x${i} = ${i}`), "    # the key step", "def train():", "    pass"].join("\n"), "python");
  assert.deepEqual(long.steps.map((s) => s.from), [1, 16, 17]);
  assert.match(long.intro, /defines Net and train/);
});

test("table: rows read with their headers; long tables are cut short", () => {
  const t = describeTable(["Method", "Idea"], [["PPO", "RL with a reward model"], ["DPO", "no reward model"]]);
  assert.equal(t.intro, "A table with 2 rows, comparing Idea across each Method.");
  assert.deepEqual(t.rows, ["PPO. Idea: RL with a reward model.", "DPO. Idea: no reward model."]);
  const big = describeTable(["a"], Array.from({ length: 12 }, (_, i) => [String(i)]), 8);
  assert.equal(big.rows.length, 8);
  assert.match(big.outro, /4 more rows/);
});

test("listen time", () => {
  assert.equal(listenMinutes(1650), 10);
  assert.equal(listenMinutes(1650, 2), 5);
  assert.equal(listenMinutes(10), 1);
});
