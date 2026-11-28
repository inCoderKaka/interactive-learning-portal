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
  "hld/security": () => Promise.all([import("./hld/security"), import("./hld/notes/security")]).then(([m, n]) => withNotes(m.security, n.notes)),
  "hld/multiregion": () => Promise.all([import("./hld/multiregion"), import("./hld/notes/multiregion")]).then(([m, n]) => withNotes(m.multiregion, n.notes)),
  "hld/papers": () => Promise.all([import("./hld/papers"), import("./hld/notes/papers")]).then(([m, n]) => withNotes(m.papers, n.notes)),
  "lld/framework": () => Promise.all([import("./lld/framework"), import("./lld/notes/framework")]).then(([m, n]) => withNotes(m.framework, n.notes)),
  "lld/oop": () => Promise.all([import("./lld/oop"), import("./lld/notes/oop")]).then(([m, n]) => withNotes(m.oop, n.notes)),
  "lld/patterns1": () => Promise.all([import("./lld/patterns1"), import("./lld/notes/patterns1")]).then(([m, n]) => withNotes(m.patterns1, n.notes)),
  "lld/patterns2": () => Promise.all([import("./lld/patterns2"), import("./lld/notes/patterns2")]).then(([m, n]) => withNotes(m.patterns2, n.notes)),
  "lld/quality": () => Promise.all([import("./lld/quality"), import("./lld/notes/quality")]).then(([m, n]) => withNotes(m.quality, n.notes)),
  "lld/concurrency": () => Promise.all([import("./lld/concurrency"), import("./lld/notes/concurrency")]).then(([m, n]) => withNotes(m.concurrency, n.notes)),
  "lld/concurrency2": () => Promise.all([import("./lld/concurrency2"), import("./lld/notes/concurrency2")]).then(([m, n]) => withNotes(m.concurrency2, n.notes)),
  "ai/math": () => Promise.all([import("./ai/math"), import("./ai/notes/math")]).then(([m, n]) => withNotes(m.math, n.notes)),
  "ai/basics": () => Promise.all([import("./ai/basics"), import("./ai/notes/basics")]).then(([m, n]) => withNotes(m.basics, n.notes)),
  "ai/data": () => Promise.all([import("./ai/data"), import("./ai/notes/data")]).then(([m, n]) => withNotes(m.data, n.notes)),
  "ai/classic": () => Promise.all([import("./ai/classic"), import("./ai/notes/classic")]).then(([m, n]) => withNotes(m.classic, n.notes)),
  "ai/metrics": () => Promise.all([import("./ai/metrics"), import("./ai/notes/metrics")]).then(([m, n]) => withNotes(m.metrics, n.notes)),
  "ai/nn": () => Promise.all([import("./ai/nn"), import("./ai/notes/nn")]).then(([m, n]) => withNotes(m.nn, n.notes)),
  "ai/pytorch": () => Promise.all([import("./ai/pytorch"), import("./ai/notes/pytorch")]).then(([m, n]) => withNotes(m.pytorch, n.notes)),
  "ai/cnn": () => Promise.all([import("./ai/cnn"), import("./ai/notes/cnn")]).then(([m, n]) => withNotes(m.cnn, n.notes)),
  "ai/embeddings": () => Promise.all([import("./ai/embeddings"), import("./ai/notes/embeddings")]).then(([m, n]) => withNotes(m.embeddings, n.notes)),
  "ai/recsys": () => Promise.all([import("./ai/recsys"), import("./ai/notes/recsys")]).then(([m, n]) => withNotes(m.recsys, n.notes)),
};
