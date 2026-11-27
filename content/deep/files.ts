import type { Deep } from "./types";

type Bodies = Record<string, Deep>;
/** Attach a file's cheat-sheet notes (content/deep/<area>/notes/<file>.ts) to its bodies. */
const withNotes = (bodies: Bodies, notes: Record<string, string>): Bodies =>
  Object.fromEntries(Object.entries(bodies).map(([id, d]) => [id, notes[id] ? { ...d, notes: notes[id] } : d]));

/**
 * Lazy loaders for the subtopic bodies, one per content file. Pages import only the file they need, so the
 * lessons are not part of the bundle every page downloads. meta.json (generated) says which file holds which id.
 */
export const DEEP_FILES: Record<string, () => Promise<Bodies>> = {
  "dsa/complexity": () => Promise.all([import("./dsa/complexity"), import("./dsa/notes/complexity")]).then(([m, n]) => withNotes(m.complexity, n.notes)),
  "dsa/arrays-hashing": () => Promise.all([import("./dsa/arrays-hashing"), import("./dsa/notes/arrays-hashing")]).then(([m, n]) => withNotes(m.arraysHashing, n.notes)),
  "dsa/linear": () => Promise.all([import("./dsa/linear"), import("./dsa/notes/linear")]).then(([m, n]) => withNotes(m.linear, n.notes)),
  "dsa/search-lists": () => Promise.all([import("./dsa/search-lists"), import("./dsa/notes/search-lists")]).then(([m, n]) => withNotes(m.searchLists, n.notes)),
  "dsa/trees-heaps": () => Promise.all([import("./dsa/trees-heaps"), import("./dsa/notes/trees-heaps")]).then(([m, n]) => withNotes(m.treesHeaps, n.notes)),
  "dsa/graphs-core": () => Promise.all([import("./dsa/graphs-core"), import("./dsa/notes/graphs-core")]).then(([m, n]) => withNotes(m.graphsCore, n.notes)),
  "dsa/dp": () => Promise.all([import("./dsa/dp"), import("./dsa/notes/dp")]).then(([m, n]) => withNotes(m.dp, n.notes)),
  "dsa/greedy-math": () => Promise.all([import("./dsa/greedy-math"), import("./dsa/notes/greedy-math")]).then(([m, n]) => withNotes(m.greedyMath, n.notes)),
  "dsa/strings-structures": () => Promise.all([import("./dsa/strings-structures"), import("./dsa/notes/strings-structures")]).then(([m, n]) => withNotes(m.stringsStructures, n.notes)),
  "dsa/advanced-graphs": () => Promise.all([import("./dsa/advanced-graphs"), import("./dsa/notes/advanced-graphs")]).then(([m, n]) => withNotes(m.advancedGraphs, n.notes)),
  "hld/foundations": () => Promise.all([import("./hld/foundations"), import("./hld/notes/foundations")]).then(([m, n]) => withNotes(m.foundations, n.notes)),
  "hld/networking": () => Promise.all([import("./hld/networking"), import("./hld/notes/networking")]).then(([m, n]) => withNotes(m.networking, n.notes)),
  "hld/traffic": () => Promise.all([import("./hld/traffic"), import("./hld/notes/traffic")]).then(([m, n]) => withNotes(m.traffic, n.notes)),
  "hld/caching": () => Promise.all([import("./hld/caching"), import("./hld/notes/caching")]).then(([m, n]) => withNotes(m.caching, n.notes)),
  "hld/databases": () => Promise.all([import("./hld/databases"), import("./hld/notes/databases")]).then(([m, n]) => withNotes(m.databases, n.notes)),
  "hld/replication": () => Promise.all([import("./hld/replication"), import("./hld/notes/replication")]).then(([m, n]) => withNotes(m.replication, n.notes)),
  "hld/partitioning": () => Promise.all([import("./hld/partitioning"), import("./hld/notes/partitioning")]).then(([m, n]) => withNotes(m.partitioning, n.notes)),
  "hld/transactions": () => Promise.all([import("./hld/transactions"), import("./hld/notes/transactions")]).then(([m, n]) => withNotes(m.transactions, n.notes)),
  "hld/messaging": () => Promise.all([import("./hld/messaging"), import("./hld/notes/messaging")]).then(([m, n]) => withNotes(m.messaging, n.notes)),
  "hld/streams": () => Promise.all([import("./hld/streams"), import("./hld/notes/streams")]).then(([m, n]) => withNotes(m.streams, n.notes)),
  "hld/protection": () => Promise.all([import("./hld/protection"), import("./hld/notes/protection")]).then(([m, n]) => withNotes(m.protection, n.notes)),
  "hld/storage": () => Promise.all([import("./hld/storage"), import("./hld/notes/storage")]).then(([m, n]) => withNotes(m.storage, n.notes)),
  "hld/ops": () => Promise.all([import("./hld/ops"), import("./hld/notes/ops")]).then(([m, n]) => withNotes(m.ops, n.notes)),
};
