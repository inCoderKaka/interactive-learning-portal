"use client";
// After a design mock: which interview-path nodes did the round cover? (req3 checkpoints)

import type { Design, Settings } from "@/lib/types";
import { allNodes, pathsCatalogue } from "@/lib/interviews";
import type { LoggedEvent } from "./core/types";
import { runTask } from "./tasks";
import { transcriptText } from "./results";

const SYSTEM = `You read the transcript of a system design mock interview and decide which of the listed interview-path nodes the round genuinely covered.
A node is covered only if the interviewer raised that direction (or the candidate brought it up) AND the candidate gave a substantive answer to it, right or wrong. Merely naming a topic in passing does not count.
A follow-up node can only be covered if its parent is covered.
Reply with JSON only: {"covered": ["node id", ...]} using the exact ids from the list.`;

export async function tagPaths(s: Settings, d: Design, log: LoggedEvent[]): Promise<string[]> {
  const user = `Question: ${d.title}\n\nPath nodes (id :: what the interviewer asks):\n${pathsCatalogue(d)}\n\nTranscript:\n${transcriptText(log).slice(-60000)}`;
  const out = await runTask(s, "paths.tag", SYSTEM, [{ role: "user", content: user }]);
  const json = out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1);
  const ids = new Set(allNodes(d.paths).map((n) => n.id));
  const parsed = JSON.parse(json) as { covered?: unknown };
  const covered = Array.isArray(parsed.covered) ? parsed.covered.filter((x): x is string => typeof x === "string" && ids.has(x)) : [];
  // enforce "a child needs its parent"
  const set = new Set(covered);
  return covered.filter((id) => { const parts = id.split("/"); return parts.every((_, i) => i === 0 || set.has(parts.slice(0, i).join("/"))); });
}
