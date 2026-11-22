// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { blank, bug, checkDrill, derange, guess, guessOk, hash, match, odd, order, pick, rng, shuffle, tf } from "./drills.ts";

test("authoring helpers mark the starred answer", () => {
  const p = pick("q", ["a", "*b", "c"], "w");
  assert.equal(p.kind === "pick" && p.answer, 1);
  assert.deepEqual(p.kind === "pick" && p.options, ["a", "b", "c"]);
  const o = odd("q", ["*x", "y", "z"], "w");
  assert.equal(o.kind === "odd" && o.odd, 0);
  const b = bug("q", "\nline one\nline two\nline three\n", 2, "w");
  assert.equal(b.kind === "bug" && b.line, 1);
  assert.equal(b.kind === "bug" && b.code.length, 3);
});

test("checkDrill catches authoring mistakes", () => {
  assert.deepEqual(checkDrill(tf("s", true, "w")), []);
  assert.ok(checkDrill(pick("q", ["a", "b"], "w")).length > 0, "no star");
  assert.ok(checkDrill(blank("no gap", ["*a", "b"], "w")).length > 0, "no ___");
  assert.ok(checkDrill(order("q", ["a", "b"])).length > 0, "too few steps");
  assert.ok(checkDrill(match("q", [["a", "1"], ["b", "1"], ["c", "2"]])).length > 0, "duplicate right side");
  assert.ok(checkDrill(bug("q", "a\nb\nc", 4, "w")).length > 0, "line out of range");
  assert.ok(checkDrill(guess("q", { min: 0, max: 10, answer: 10, tol: 1 }, "w")).length > 0, "answer on the edge");
  assert.ok(checkDrill(guess("q", { min: 0, max: 10, answer: 5, tol: 1, log: true }, "w")).length > 0, "log with min 0");
});

test("guess tolerance: absolute on linear, ratio on log", () => {
  const lin = guess("q", { min: 0, max: 100, answer: 50, tol: 5 }, "w");
  assert.ok(lin.kind === "guess" && guessOk(lin, 54));
  assert.ok(lin.kind === "guess" && !guessOk(lin, 56));
  const lg = guess("q", { min: 1, max: 1e9, answer: 1e6, tol: 1 }, "w");
  const lgl = { ...lg, log: true } as typeof lg;
  assert.ok(lgl.kind === "guess" && guessOk(lgl, 1.9e6) && guessOk(lgl, 5.1e5));
  assert.ok(lgl.kind === "guess" && !guessOk(lgl, 2.1e6));
});

test("seeded shuffles are deterministic and derangements never start solved", () => {
  assert.deepEqual(shuffle([1, 2, 3, 4, 5], rng(42)), shuffle([1, 2, 3, 4, 5], rng(42)));
  assert.equal(hash("daily:2026-11-22"), hash("daily:2026-11-22"));
  for (let s = 0; s < 200; s++) {
    const p = derange(4, rng(s));
    assert.deepEqual([...p].sort(), [0, 1, 2, 3]);
    assert.ok(p.some((x, i) => x !== i));
  }
});
