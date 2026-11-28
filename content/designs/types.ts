import type { ArchEdge, ArchNode, ClassBox, ClassRel, PathNode, Ref, Tier } from "@/lib/types";

/** A compiled design from content/designs/src: deepens an existing exercise or defines a new one. */
export interface DesignPatch {
  id: string;
  title?: string;
  topic?: string;
  tier?: Tier;
  est?: number;
  prompt?: string;
  words?: string;
  flow?: string;
  models?: Partial<Record<"req" | "est" | "api" | "hl" | "deep" | "wrap" | "model" | "patterns" | "code" | "ext" | "frame" | "data" | "eval" | "serve" | "clarify" | "approach" | "test", string>>;
  variants?: [string, string][];
  steer?: [string, string][];
  pitfalls?: string[];
  level?: string;
  arch?: { nodes: ArchNode[]; edges: ArchEdge[] };
  classes?: { boxes: ClassBox[]; rels: ClassRel[] };
  refs?: Ref[];
  prereqs?: string[];
  paths?: PathNode[];
}
