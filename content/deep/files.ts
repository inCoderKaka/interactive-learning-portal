import type { Deep } from "./types";

/**
 * Lazy loaders for the subtopic bodies, one per content file. Pages import only the file they need, so the
 * lessons are not part of the bundle every page downloads. meta.json (generated) says which file holds which id.
 */
export const DEEP_FILES: Record<string, () => Promise<Record<string, Deep>>> = {
  "dsa/complexity": () => import("./dsa/complexity").then((m) => m.complexity),
  "dsa/arrays-hashing": () => import("./dsa/arrays-hashing").then((m) => m.arraysHashing),
  "dsa/linear": () => import("./dsa/linear").then((m) => m.linear),
  "dsa/search-lists": () => import("./dsa/search-lists").then((m) => m.searchLists),
  "dsa/trees-heaps": () => import("./dsa/trees-heaps").then((m) => m.treesHeaps),
  "dsa/graphs-core": () => import("./dsa/graphs-core").then((m) => m.graphsCore),
  "dsa/dp": () => import("./dsa/dp").then((m) => m.dp),
  "dsa/greedy-math": () => import("./dsa/greedy-math").then((m) => m.greedyMath),
  "dsa/strings-structures": () => import("./dsa/strings-structures").then((m) => m.stringsStructures),
  "dsa/advanced-graphs": () => import("./dsa/advanced-graphs").then((m) => m.advancedGraphs),
};
