import { test } from "node:test";
import assert from "node:assert/strict";
import { COMPANIES, companyById } from "./companies.ts";
import { dimsFor, DIMENSIONS } from "./scoring.ts";
import { defaultLoop } from "./loop.ts";

test("companies: every company has a rubric, prompts, teams and a loop with a behavioural round at every level", () => {
  const ids = new Set<string>();
  for (const c of COMPANIES) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`); ids.add(c.id);
    assert.ok(c.dims.length >= 4, `${c.id}: rubric too short`);
    assert.equal(new Set(c.dims.map((d) => d.key)).size, c.dims.length, `${c.id}: duplicate rubric keys`);
    assert.ok(c.prompts.length >= 4 && c.teams.length >= 4, `${c.id}: needs prompts and teams`);
    for (const l of ["L3", "L4", "L5", "L6"] as const) assert.ok(c.loop(l).some((r) => r.kind === "behavioral"), `${c.id} ${l}: no behavioural round`);
  }
});

test("companies: behavioural scorecards use the company's rubric; other kinds are unchanged", () => {
  assert.deepEqual(dimsFor("behavioral", "amazon").map((d) => d.key), companyById("amazon").dims.map((d) => d.key));
  assert.deepEqual(dimsFor("coding", "amazon"), DIMENSIONS.coding);
  assert.deepEqual(dimsFor("behavioral"), DIMENSIONS.behavioral);
  assert.equal(companyById("nope").id, "google");
});

test("companies: the loop follows the chosen company", () => {
  assert.equal(defaultLoop("L5", "x", "amazon").rounds.at(-1)?.title, "Bar raiser");
  assert.equal(defaultLoop("L5", "x").rounds.at(-1)?.title, "Googleyness and leadership");
});
