import type { Scenario } from "../Seq";

/** Distributed rate limiting: a central atomic store vs local counters with periodic sync. */
export const PROTECTION: Record<string, Scenario> = {
  "seq-rl-distributed": {
    title: "One user, many gateways",
    q: "A user limited to 10 requests per minute sends requests that land on two different gateways. How do the gateways agree?",
    about: "Two gateway instances behind a load balancer and a shared Redis. The user has already made 9 requests this minute.",
    actors: [{ id: "u", label: "User" }, { id: "g1", label: "Gateway 1" }, { id: "g2", label: "Gateway 2" }, { id: "r", label: "Redis (shared)" }],
    init: { r: "user7: 9 / 10" },
    variants: [
      {
        key: "central", label: "Central atomic counter", end: "Exact, at the cost of a Redis round trip on every request (keep it fast, with a short timeout and fail-open).",
        steps: [
          { from: "u", to: "g1", label: "request A", say: "Request A reaches gateway 1." },
          { from: "u", to: "g2", label: "request B (same moment)", say: "Request B reaches gateway 2 at the same moment." },
          { from: "g1", to: "r", label: "EVAL token_bucket(user7)", say: "Gateway 1 runs an atomic script in Redis: check and update in one step." },
          { from: "g2", to: "r", label: "EVAL token_bucket(user7)", say: "Gateway 2 does the same. Redis runs the two scripts one after the other, never interleaved." },
          { from: "r", to: "g1", label: "allowed (10 / 10)", kind: "ok", say: "The first script takes the last slot.", set: { r: "user7: 10 / 10" } },
          { from: "r", to: "g2", label: "denied", say: "The second sees the limit reached." },
          { from: "g2", to: "u", label: "429 · Retry-After: 41", kind: "bad", say: "Exactly 10 allowed, never 11." },
        ],
      },
      {
        key: "race", label: "Non-atomic read-then-write", end: "Both gateways allowed: an 11th request slipped through. Check and update must be one atomic step.",
        steps: [
          { from: "g1", to: "r", label: "GET user7 → 9", say: "Gateway 1 reads the count: 9." },
          { from: "g2", to: "r", label: "GET user7 → 9", say: "Gateway 2 reads it too, before gateway 1 writes: also 9." },
          { from: "g1", to: "r", label: "SET user7 = 10 (allow)", say: "Both decide 9 < 10 and allow.", set: { r: "user7: 10" } },
          { from: "g2", to: "r", label: "SET user7 = 10 (allow)", kind: "bad", say: "The second write overwrites the first. 11 requests were allowed, and the counter says 10." },
        ],
      },
      {
        key: "local", label: "Local counters + sync", end: "No per-request round trip, but the limit was briefly exceeded: overshoot is bounded by the sync interval.",
        init: { g1: "local: 0", g2: "local: 0", r: "global: 9" },
        steps: [
          { from: "u", to: "g1", label: "request A", say: "Each gateway counts locally and believes the global count is 9 (from the last sync).", set: { g1: "local: 1" } },
          { from: "u", to: "g2", label: "request B", say: "Gateway 2 also allows: 9 + its own 1 = 10.", set: { g2: "local: 1" } },
          { from: "g1", to: "r", label: "sync: +1", say: "Every second, gateways push their local counts…" },
          { from: "g2", to: "r", label: "sync: +1", say: "…and learn the new global total.", set: { r: "global: 11" } },
          { from: "r", to: "g1", label: "global 11 ≥ 10: block user7", kind: "ok", say: "From now on both gateways deny. The user got 11 in this minute: a small, bounded overshoot in exchange for no extra latency." },
        ],
      },
    ],
  },
};
