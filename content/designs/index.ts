import type { Design } from "@/lib/types";
import { H } from "../hld-problems";
import { L } from "../lld";
import { PATCHES } from "./files";
import type { DesignPatch } from "./types";

/** Deepen existing designs and append new ones from the compiled design sources. */
export function applyDesignPatches(base: Design[]): Design[] {
  const byId = new Map<string, DesignPatch>();
  for (const p of PATCHES) byId.set(p.id, { ...byId.get(p.id), ...p, models: { ...byId.get(p.id)?.models, ...p.models } });
  const out = base.map((d) => {
    const p = byId.get(d.id);
    if (!p) return d;
    return {
      ...d,
      title: p.title ?? d.title, prompt: p.prompt ?? d.prompt, est: p.est ?? d.est,
      stages: d.stages.map((s) => ({ ...s, model: p.models?.[s.key as keyof NonNullable<typeof p.models>] ?? s.model })),
      steer: p.steer ?? d.steer, pitfalls: p.pitfalls ?? d.pitfalls, level: p.level ?? d.level, arch: p.arch ?? d.arch, classes: p.classes ?? d.classes,
      words: p.words ?? d.words, flow: p.flow ?? d.flow, variants: p.variants ?? d.variants, refs: p.refs ?? d.refs,
      prereqs: p.prereqs ?? d.prereqs, paths: p.paths ?? d.paths,
    };
  });
  const have = new Set(base.map((d) => d.id));
  for (const p of byId.values()) {
    if (have.has(p.id)) continue;
    const m = p.models;
    if (p.id.startsWith("d-lld-")) {
      if (!p.title || !p.topic || !p.tier || !p.prompt || !m || !p.classes) throw new Error(`new design ${p.id} is missing fields`);
      const d = L(p.id.replace(/^d-lld-/, ""), p.title, p.tier, p.prompt,
        { req: m.req ?? "", model: m.model ?? "", patterns: m.patterns ?? "", code: m.code ?? "", ext: m.ext ?? "" },
        p.steer ?? [], p.pitfalls ?? [], [], []);
      out.push({ ...d, topic: p.topic, est: p.est ?? d.est, classes: p.classes, level: p.level, words: p.words, flow: p.flow, variants: p.variants, refs: p.refs, prereqs: p.prereqs, paths: p.paths });
      continue;
    }
    if (!p.title || !p.topic || !p.tier || !p.prompt || !m || !p.arch) throw new Error(`new design ${p.id} is missing fields`);
    const d = H(p.id.replace(/^d-/, ""), p.topic, p.title, p.tier, p.prompt,
      { req: m.req ?? "", est: m.est ?? "", api: m.api ?? "", hl: m.hl ?? "", deep: m.deep ?? "", wrap: m.wrap ?? "" },
      p.steer ?? [], p.pitfalls ?? [], p.level ?? "", p.arch);
    out.push({ ...d, est: p.est ?? d.est, words: p.words, flow: p.flow, variants: p.variants, refs: p.refs, prereqs: p.prereqs, paths: p.paths });
  }
  return out;
}
