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
]);
