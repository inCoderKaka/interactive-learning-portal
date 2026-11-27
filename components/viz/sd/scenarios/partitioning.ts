import type { Scenario } from "../Seq";

/** Partitioning scenario: local vs global secondary indexes. */
export const PARTITIONING: Record<string, Scenario> = {
  "seq-partitioned-index": {
    title: "Finding a customer's orders",
    q: "Orders are partitioned by order ID. How does the database find all orders of customer 42?",
    about: "Three data partitions. With a local index, each partition indexes its own orders. With a global index, a separate index partition holds every entry for a range of customers.",
    actors: [{ id: "app", label: "App" }, { id: "p1", label: "Partition 1" }, { id: "p2", label: "Partition 2" }, { id: "p3", label: "Partition 3" }, { id: "ix", label: "Index partition (customers 1–99)" }],
    variants: [
      {
        key: "local-read", label: "Local index: read", end: "Every partition did work for every query, and the answer waited for the slowest one.",
        steps: [
          { from: "app", to: "p1", label: "orders where customer = 42?", t: 0, say: "Customer 42's orders could be on any partition, so the query goes to all of them." },
          { from: "app", to: "p2", label: "orders where customer = 42?", t: 0, say: "Same question to partition 2…" },
          { from: "app", to: "p3", label: "orders where customer = 42?", t: 0, say: "…and partition 3." },
          { from: "p1", to: "app", label: "order 1007", t: 6, say: "Each partition checks its own local index." },
          { from: "p2", to: "app", label: "(none)", t: 7, say: "Partition 2 has none: it worked for nothing." },
          { from: "p3", to: "app", label: "order 3112 (slow: 40 ms)", t: 40, kind: "bad", say: "Partition 3 is busy (compaction). The whole query waits for it." },
          { from: "app", to: "app", label: "merge results", t: 41, say: "With 100 partitions, every query costs 100 requests and inherits the slowest one's latency." },
        ],
      },
      {
        key: "global-write", label: "Global index: write", end: "One extra write on another machine for every order. Done asynchronously, so the index can lag a moment.",
        steps: [
          { from: "app", to: "p2", label: "insert order 2040 (customer 42)", t: 0, say: "A new order is written to its data partition (chosen by order ID).", set: { p2: "has 2040" } },
          { from: "p2", to: "app", label: "ok", t: 5, kind: "ok", say: "The order is saved." },
          { from: "p2", to: "ix", label: "index: 42 → 2040", t: 30, kind: "async", say: "The index entry lives on the index partition for customer 42, a different machine. It is updated asynchronously (via a stream), or synchronously with a distributed transaction at a higher cost.", set: { ix: "42 → 1007, 3112, 2040" } },
        ],
      },
      {
        key: "global-read", label: "Global index: read", end: "Two hops instead of a fan-out to every partition.",
        init: { ix: "42 → 1007, 3112, 2040" },
        steps: [
          { from: "app", to: "ix", label: "customer 42?", t: 0, say: "The query goes to the one index partition that owns customer 42." },
          { from: "ix", to: "app", label: "1007, 3112, 2040", t: 4, say: "It returns the order IDs." },
          { from: "app", to: "p1", label: "get 1007", t: 5, say: "The app fetches the orders by ID, each from its own partition (in parallel)." },
          { from: "app", to: "p3", label: "get 3112", t: 5, say: "Partitions without customer 42's orders are never contacted." },
          { from: "p3", to: "app", label: "order 3112", t: 10, kind: "ok", say: "Results come back. (Storing a summary in the index entry can avoid these fetches entirely.)" },
        ],
      },
    ],
  },
};
