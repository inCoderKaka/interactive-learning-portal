import type { Deep } from "./types";
import { advancedGraphs } from "./dsa/advanced-graphs";
import { complexity } from "./dsa/complexity";
import { arraysHashing } from "./dsa/arrays-hashing";
import { linear } from "./dsa/linear";
import { searchLists } from "./dsa/search-lists";
import { treesHeaps } from "./dsa/trees-heaps";
import { graphsCore } from "./dsa/graphs-core";

/** Every written subtopic body, keyed by subtopic id. A subtopic without a body is not a page yet. */
export const DEEP: Record<string, Deep> = {
  ...complexity,
  ...arraysHashing,
  ...linear,
  ...searchLists,
  ...treesHeaps,
  ...graphsCore,
  ...advancedGraphs,
};
