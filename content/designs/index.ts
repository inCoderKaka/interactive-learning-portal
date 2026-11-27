import type { Design } from "@/lib/types";
import { H } from "../hld-problems";
import { PATCHES } from "./files";

/** Deepen existing designs and append new ones from the compiled design sources. */
export function applyDesignPatches(base: Design[]): Design[] {
  const byId = new Map(PATCHES.map((p) => [p.id, p]));
  const out = base.map((d) => {
    const p = byId.get(d.id);
    if (!p) return d;
    return {
      ...d,
      title: p.title ?? d.title, prompt: p.prompt ?? d.prompt, est: p.est ?? d.est,
      stages: d.stages.map((s) => ({ ...s, model: p.models?.[s.key as keyof NonNullable<typeof p.models>] ?? s.model })),
      steer: p.steer ?? d.steer, pitfalls: p.pitfalls ?? d.pitfalls, level: p.level ?? d.level, arch: p.arch ?? d.arch,
      words: p.words, flow: p.flow, variants: p.variants, refs: p.refs ?? d.refs,
    };
  });
  const have = new Set(base.map((d) => d.id));
  for (const p of PATCHES) {
    if (have.has(p.id)) continue;
    if (!p.title || !p.topic || !p.tier || !p.prompt || !p.models || !p.arch) throw new Error(`new design ${p.id} is missing fields`);
    const m = p.models;
    const d = H(p.id.replace(/^d-/, ""), p.topic, p.title, p.tier, p.prompt,
      { req: m.req ?? "", est: m.est ?? "", api: m.api ?? "", hl: m.hl ?? "", deep: m.deep ?? "", wrap: m.wrap ?? "" },
      p.steer ?? [], p.pitfalls ?? [], p.level ?? "", p.arch);
    out.push({ ...d, est: p.est ?? d.est, words: p.words, flow: p.flow, variants: p.variants, refs: p.refs });
  }
  return out;
}
