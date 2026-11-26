/**
 * Generates content/deep/meta.json: the small, always-loaded part of every subtopic body (which file holds it,
 * blurb, featured problems, prerequisites, visuals). Run after editing content/deep: npm run deep:meta
 * The audit fails if meta.json is stale.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEEP_FILES } from "../content/deep/files";

export async function buildMeta() {
  const meta: Record<string, { file: string; blurb: string; problems?: number[]; prereq?: string[]; widgets?: string[] }> = {};
  for (const [file, load] of Object.entries(DEEP_FILES)) {
    const bodies = await load();
    for (const [id, d] of Object.entries(bodies)) meta[id] = { file, blurb: d.blurb, problems: d.problems, prereq: d.prereq, widgets: d.widgets };
  }
  return meta;
}

if (process.argv[2]?.endsWith("deep-meta.ts")) {
  buildMeta().then((m) => {
    writeFileSync(resolve(import.meta.dirname ?? __dirname, "../content/deep/meta.json"), JSON.stringify(m) + "\n");
    console.log(`meta.json: ${Object.keys(m).length} pages`);
  });
}
