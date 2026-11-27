import type { Deep } from "./types";
import { advancedGraphs } from "./dsa/advanced-graphs";
import { complexity } from "./dsa/complexity";
import { arraysHashing } from "./dsa/arrays-hashing";
import { linear } from "./dsa/linear";
import { searchLists } from "./dsa/search-lists";
import { treesHeaps } from "./dsa/trees-heaps";
import { graphsCore } from "./dsa/graphs-core";
import { dp } from "./dsa/dp";
import { greedyMath } from "./dsa/greedy-math";
import { stringsStructures } from "./dsa/strings-structures";
import { notes as n_advanced_graphs } from "./dsa/notes/advanced-graphs";
import { notes as n_complexity } from "./dsa/notes/complexity";
import { notes as n_arrays_hashing } from "./dsa/notes/arrays-hashing";
import { notes as n_linear } from "./dsa/notes/linear";
import { notes as n_search_lists } from "./dsa/notes/search-lists";
import { notes as n_trees_heaps } from "./dsa/notes/trees-heaps";
import { notes as n_graphs_core } from "./dsa/notes/graphs-core";
import { notes as n_dp } from "./dsa/notes/dp";
import { notes as n_greedy_math } from "./dsa/notes/greedy-math";
import { notes as n_strings_structures } from "./dsa/notes/strings-structures";

import { foundations } from "./hld/foundations";
import { notes as n_hld_foundations } from "./hld/notes/foundations";

import { networking } from "./hld/networking";
import { notes as n_hld_networking } from "./hld/notes/networking";

import { traffic } from "./hld/traffic";
import { notes as n_hld_traffic } from "./hld/notes/traffic";

import { caching } from "./hld/caching";
import { notes as n_hld_caching } from "./hld/notes/caching";

import { databases } from "./hld/databases";
import { notes as n_hld_databases } from "./hld/notes/databases";

import { replication } from "./hld/replication";
import { notes as n_hld_replication } from "./hld/notes/replication";

import { partitioning } from "./hld/partitioning";
import { notes as n_hld_partitioning } from "./hld/notes/partitioning";

import { transactions } from "./hld/transactions";
import { notes as n_hld_transactions } from "./hld/notes/transactions";

import { messaging } from "./hld/messaging";
import { notes as n_hld_messaging } from "./hld/notes/messaging";

import { streams } from "./hld/streams";
import { notes as n_hld_streams } from "./hld/notes/streams";

import { protection } from "./hld/protection";
import { notes as n_hld_protection } from "./hld/notes/protection";

import { storage } from "./hld/storage";
import { notes as n_hld_storage } from "./hld/notes/storage";

import { ops } from "./hld/ops";
import { notes as n_hld_ops } from "./hld/notes/ops";

import { security } from "./hld/security";
import { notes as n_hld_security } from "./hld/notes/security";

import { multiregion } from "./hld/multiregion";
import { notes as n_hld_multiregion } from "./hld/notes/multiregion";

import { papers } from "./hld/papers";
import { notes as n_hld_papers } from "./hld/notes/papers";

const NOTES: Record<string, string> = { ...n_hld_papers, ...n_hld_multiregion, ...n_hld_security, ...n_hld_ops, ...n_hld_storage, ...n_hld_protection, ...n_hld_streams, ...n_hld_messaging, ...n_hld_transactions, ...n_hld_partitioning, ...n_hld_replication, ...n_hld_databases, ...n_hld_caching, ...n_hld_traffic, ...n_hld_networking, ...n_hld_foundations, ...n_advanced_graphs, ...n_complexity, ...n_arrays_hashing, ...n_linear, ...n_search_lists, ...n_trees_heaps, ...n_graphs_core, ...n_dp, ...n_greedy_math, ...n_strings_structures };

const BODIES: Record<string, Deep> = {
  ...papers,
  ...multiregion,
  ...security,
  ...ops,
  ...storage,
  ...protection,
  ...streams,
  ...messaging,
  ...transactions,
  ...partitioning,
  ...replication,
  ...databases,
  ...caching,
  ...traffic,
  ...networking,
  ...foundations,
  ...complexity,
  ...arraysHashing,
  ...linear,
  ...searchLists,
  ...treesHeaps,
  ...graphsCore,
  ...dp,
  ...greedyMath,
  ...stringsStructures,
  ...advancedGraphs,
};

/** Every written subtopic body (with its cheat-sheet notes), keyed by subtopic id. Used by scripts and tests; pages load lazily via files.ts. */
export const DEEP: Record<string, Deep> = Object.fromEntries(Object.entries(BODIES).map(([id, d]) => [id, NOTES[id] ? { ...d, notes: NOTES[id] } : d]));
