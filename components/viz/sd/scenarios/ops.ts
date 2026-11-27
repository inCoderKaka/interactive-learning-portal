import type { Scenario } from "../Seq";

/** Reliability scenarios: one traced request, and a canary rollout catching a bad release. */
export const OPS: Record<string, Scenario> = {
  "seq-trace": {
    title: "Following one request with a trace",
    q: "Checkout took 2.1 seconds. Which service was slow?",
    about: "The gateway starts a trace; every call carries the trace ID and its parent span, so all the pieces can be stitched together afterwards.",
    actors: [{ id: "gw", label: "Gateway" }, { id: "co", label: "Checkout" }, { id: "inv", label: "Inventory" }, { id: "pay", label: "Payments" }, { id: "tr", label: "Trace store" }],
    variants: [
      {
        key: "trace", label: "Traced request", end: "Without the trace, every service's own metrics looked normal on average. The trace pointed straight at a retry inside Payments.",
        steps: [
          { from: "gw", to: "co", label: "POST /checkout · traceparent: 4bf9…-span1", t: 0, say: "The gateway creates trace 4bf9 and span 1, and passes them in the traceparent header." },
          { from: "co", to: "inv", label: "reserve · parent span2", t: 5, say: "Checkout starts span 2 and calls Inventory, which records span 3 as its child." },
          { from: "inv", to: "co", label: "ok (40 ms)", t: 45, kind: "ok", say: "Inventory replies in 40 ms." },
          { from: "co", to: "pay", label: "charge · parent span2", t: 50, say: "Checkout calls Payments (span 4)." },
          { from: "pay", to: "pay", label: "bank API timeout → retry (span 5, 6)", t: 1550, kind: "bad", say: "Inside Payments, the call to the bank timed out after 1.5 s and was retried: two child spans, the first 1.5 s long." },
          { from: "pay", to: "co", label: "ok (1,950 ms)", t: 2000, say: "Payments finally succeeds." },
          { from: "co", to: "gw", label: "200 (2,100 ms)", t: 2100, say: "Checkout returns after 2.1 s." },
          { from: "co", to: "tr", label: "spans 1–6 (async, sampled)", t: 2150, kind: "async", say: "Each service exports its spans asynchronously. Because this request was slow, tail-based sampling keeps it." },
          { from: "tr", to: "tr", label: "waterfall: 71% in bank retry", t: 2200, kind: "ok", say: "The trace view shows the call tree: most of the time went to the first bank attempt in Payments." },
        ],
      },
    ],
  },

  "seq-canary": {
    title: "A canary catches a bad release",
    q: "Version 2.4 has a bug that only shows under real traffic. How many users does it reach before it's stopped?",
    about: "An automated rollout sends 1% of traffic to the new version and compares it with a baseline group on the old version.",
    actors: [{ id: "cd", label: "Rollout system" }, { id: "lb", label: "Load balancer" }, { id: "can", label: "Canary (v2.4)" }, { id: "base", label: "Baseline (v2.3)" }, { id: "mon", label: "Metrics" }],
    variants: [
      {
        key: "bad", label: "Bad release", end: "1% of users saw errors for 15 minutes; 99% never noticed. A global deploy would have hit everyone.",
        steps: [
          { from: "cd", to: "can", label: "deploy v2.4 to 1% of hosts", t: 0, say: "The new version goes to a small canary group, alongside an equal-sized baseline on the old version.", set: { can: "v2.4", base: "v2.3" } },
          { from: "cd", to: "lb", label: "route 1% → canary", t: 60, say: "The load balancer sends 1% of traffic to the canary." },
          { from: "can", to: "mon", label: "errors 2.1%, p99 820 ms", t: 600, kind: "bad", say: "After 10 minutes the canary's error rate is 2.1%…" },
          { from: "base", to: "mon", label: "errors 0.2%, p99 310 ms", t: 600, say: "…while the baseline, under the same traffic mix, shows 0.2%." },
          { from: "mon", to: "cd", label: "canary significantly worse", t: 900, kind: "bad", say: "Automated canary analysis compares the two statistically and flags the release as bad." },
          { from: "cd", to: "lb", label: "route 0% → canary; roll back", t: 905, kind: "ok", say: "The rollout halts and rolls back automatically. Engineers debug later, with no ongoing user impact.", set: { can: "v2.3 (rolled back)" } },
        ],
      },
      {
        key: "good", label: "Good release", end: "Each stage bakes and is checked before widening; a release reaches everyone over hours, region by region.",
        steps: [
          { from: "cd", to: "can", label: "1% of hosts (one zone)", t: 0, say: "Stage 1: canary in one zone.", set: { can: "v2.4 @ 1%" } },
          { from: "mon", to: "cd", label: "no significant difference", t: 900, kind: "ok", say: "Metrics match the baseline." },
          { from: "cd", to: "can", label: "10% (one region)", t: 1000, say: "Stage 2: widen to one region.", set: { can: "v2.4 @ 10%" } },
          { from: "mon", to: "cd", label: "still healthy", t: 4600, kind: "ok", say: "Bake time passes with healthy metrics." },
          { from: "cd", to: "can", label: "50% → 100%, region by region", t: 5000, kind: "ok", say: "The rollout continues across regions, never all at once.", set: { can: "v2.4 @ 100%" } },
        ],
      },
    ],
  },
};
