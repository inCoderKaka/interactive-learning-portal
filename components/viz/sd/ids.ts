/** Widget ids served by components/viz/sd (kept separate so pages can check an id without loading the visuals). */
export const HLD_WIDGET_IDS = new Set<string>([
  "load-balancer", "latency-ladder", "queueing",
  "seq-connection", "seq-dns", "hol-blocking", "push-compare",
  "l4-l7", "health-timeline", "seq-gateway", "seq-global",
  "seq-cache-patterns", "seq-invalidation", "seq-cdn", "eviction-race", "stampede",
  "index-explorer", "btree-lsm", "row-column",
  "seq-failover", "seq-conflict", "seq-linearizable", "seq-session", "partition-sim",
  "partition-load", "rebalance", "snowflake", "seq-partitioned-index",
  "seq-wal", "isolation-lab", "seq-mvcc", "seq-2pc", "seq-saga", "raft", "seq-clocks", "seq-fencing",
  "queue-log", "consumer-groups", "seq-delivery", "seq-events", "seq-dlq", "mapreduce", "watermarks", "seq-checkpoint", "seq-cdc",
  "rl-race", "retry-storm", "seq-rl-distributed",
  "erasure", "abr", "inverted-index", "geohash", "hll",
  "error-budget", "breaker", "gossip", "seq-trace", "seq-canary",
  "jwt", "seq-oauth", "zanzibar", "seq-new-enemy", "seq-envelope", "tenant-queue", "defence-layers",
  "region-failover", "crdt-lab", "rpo-rto", "seq-residency",
  "seq-gfs", "bigtable-keys", "truetime", "seq-chubby", "seq-dynamo", "borg-sched",
  // LLD (same player and kit)
  "noun-verb", "rel-lab", "seq-park", "state-lab", "vending-state",
  "invariant-guard", "combo-explosion", "dispatch-lab", "ocp-lab", "lsp-lab", "di-swap",
  "seq-factory", "seq-singleton", "seq-facade", "seq-proxy", "decorator-onion", "composite-tree",
]);
