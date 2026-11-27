/** Widget ids served by components/viz/sd (kept separate so pages can check an id without loading the visuals). */
export const HLD_WIDGET_IDS = new Set<string>([
  "load-balancer", "latency-ladder", "queueing",
  "seq-connection", "seq-dns", "hol-blocking", "push-compare",
  "l4-l7", "health-timeline", "seq-gateway", "seq-global",
  "seq-cache-patterns", "seq-invalidation", "seq-cdn", "eviction-race", "stampede",
]);
