import { Q, T } from "./h";
import type { Topic } from "@/lib/types";

export const hldTopics: Topic[] = [
  T("hld", "hld-framework", "The system design interview framework", 1, 30, "A repeatable 45-minute structure, and what Google actually scores.", {
    signals: ["Every system design round"],
    lesson: `**Timeline for 45 minutes**

| Min | Phase | Output |
|---|---|---|
| 0–5 | Requirements | 3–5 functional features, explicit non-goals, non-functional targets (scale, latency, availability, consistency) |
| 5–10 | Estimation | QPS (avg and peak), storage/year, bandwidth; only numbers that drive decisions |
| 10–15 | API + data model | Endpoints, entities, keys, access patterns |
| 15–25 | High-level design | Boxes and arrows that satisfy the functional requirements end to end |
| 25–40 | Deep dives | 2–3 hardest parts: you propose them, the interviewer steers |
| 40–45 | Wrap-up | Bottlenecks, failure modes, monitoring, what you would do next |

**What is scored**
- *Problem navigation:* did you scope and prioritise without being led?
- *Solution design:* does it work, and does it scale to the stated numbers?
- *Technical depth:* can you go two levels down on any box you drew?
- *Trade-offs:* every choice is stated as "X over Y because Z; cost is W".
- *Communication:* the interviewer always knows where you are.

**L4 vs L5:** an L4 produces a working design with prompting on deep dives. An L5 drives the conversation, identifies bottlenecks unprompted, quantifies trade-offs, and discusses operations (rollout, monitoring, failure recovery).

**Rules of thumb**
- Do not name a technology without a reason ("Kafka because we need replayable, ordered, partitioned logs").
- Design for the stated scale, mention the path to 10×.
- Start simple, then evolve; never open with a 20-box diagram.`,
    pitfalls: ["Jumping to components before agreeing on requirements", "Estimating numbers that never influence the design", "Buzzwords without trade-offs", "Ignoring failure modes and data growth", "Running out of time before any deep dive"],
    quiz: [
      Q("What is the first thing to do after hearing 'Design YouTube'?", ["Draw a CDN", "*Clarify scope: which features, what scale, which non-functional goals", "Pick a database", "Estimate storage"], "Scoping decides everything that follows."),
      Q("Which statement best shows senior-level trade-off reasoning?", ["'I'll use Cassandra, it scales'", "*'Writes dominate and we can accept eventual consistency, so a leaderless wide-column store; cost: no multi-row transactions'", "'NoSQL is faster'", "'We'll add caching everywhere'"], "Choice, reason, and cost are all present."),
    ],
    cards: [["Six phases of a design round", "Requirements → Estimation → API & data model → High-level design → Deep dives → Wrap-up"]],
  }),
  T("hld", "estimation", "Back-of-the-envelope estimation", 1, 25, "Powers of ten, latency numbers and capacity math you can do out loud.", {
    viz: "estimator",
    signals: ["Any time a number would change a design decision: sharding, caching, replication, bandwidth"],
    lesson: `**Anchors**
- 1 day ≈ 86 400 s ≈ 10⁵ s. 1 M requests/day ≈ 12 QPS. 1 B/day ≈ 12 k QPS.
- Peak ≈ 2–5× average.
- 1 KB × 1 B = 1 TB. 1 MB × 1 M = 1 TB.
- A single well-tuned server: ~10 k–50 k simple QPS; one SQL node: ~1–10 k writes/s; Redis: ~100 k ops/s.

**Latency numbers (order of magnitude)**

| Operation | Time |
|---|---|
| L1 cache / mutex | ~1–25 ns |
| Main memory reference | 100 ns |
| SSD random read | ~100 µs |
| Datacenter round trip | 0.5 ms |
| Disk seek (HDD) | 10 ms |
| Cross-continent round trip | 100–150 ms |

**Method:** users → actions/day → QPS (avg, peak) → read:write ratio → object size → storage/day and /5 years → bandwidth → cache size (80/20 rule: cache 20% of daily reads).

**Availability:** 99.9% = 8.8 h/yr, 99.99% = 53 min/yr, 99.999% = 5 min/yr. Serial components multiply; redundant components: 1 − (1 − a)ⁿ.

Round aggressively and say the assumptions. The number matters less than the decision it supports ("120 TB/year → we must shard; one node will not hold it").`,
    pitfalls: ["Precise arithmetic instead of powers of ten", "Forgetting peak vs average", "Ignoring replication factor in storage", "Estimating for five minutes without tying to a decision"],
    quiz: [
      Q("500 M daily active users, each reads 20 items/day. Approximate average read QPS?", ["~1 200", "~12 000", "*~120 000", "~1.2 M"], "10¹⁰ reads / 10⁵ s = 10⁵ ≈ 120 k QPS."),
      Q("Two components in series, each 99.9% available. Combined availability?", ["99.99%", "99.9%", "*≈ 99.8%", "99%"], "0.999 × 0.999 ≈ 0.998."),
    ],
    cards: [["Seconds in a day (rounded)", "≈ 10⁵ (86 400)"], ["99.99% availability = downtime per year", "≈ 53 minutes"]],
  }),
  T("hld", "networking", "Networking, APIs & real-time protocols", 1, 35, "DNS to HTTP to WebSockets; REST vs gRPC; idempotency and pagination.", {
    signals: ["Client ↔ server communication choices", "Real-time updates", "Public API design"],
    lesson: `**Request path:** DNS → (Anycast/GeoDNS) → CDN/edge → L4/L7 load balancer → API gateway (auth, rate limit, routing) → service.

**TCP vs UDP:** TCP = reliable, ordered, congestion-controlled; UDP = no guarantees, low latency (media, DNS, QUIC builds reliability on top). HTTP/2 multiplexes streams over one TCP connection; HTTP/3 uses QUIC to avoid head-of-line blocking.

**API styles**
- *REST/JSON:* public APIs, cacheable, human-friendly.
- *gRPC/Protobuf:* internal services, strong schemas, streaming, lower overhead.
- *GraphQL:* client-shaped queries; watch N+1 and caching.

**API hygiene:** resource-oriented names, versioning, **idempotency keys** on writes (safe retries), **cursor pagination** (stable under inserts, unlike offset), consistent errors, auth via OAuth2/JWT, rate-limit headers.

**Server → client updates**

| Technique | Use | Cost |
|---|---|---|
| Polling | Simple, low frequency | Wasteful |
| Long polling | Near real-time without new infra | Held connections |
| SSE | One-way streams (feeds, notifications) | HTTP only, one direction |
| WebSocket | Bidirectional chat, collaboration, games | Stateful connections, sticky routing |

**Stateful connections** need a connection registry (user → gateway server) and a pub/sub backplane so any service can reach any connected user.`,
    pitfalls: ["Offset pagination on large, changing datasets", "Non-idempotent retries creating duplicates", "WebSockets where SSE or polling suffice", "Forgetting TLS termination and auth at the edge"],
    quiz: [
      Q("A payment API must be safely retryable after a timeout. What do you add?", ["Longer timeouts", "*An idempotency key stored with the result", "Exponential backoff only", "A cache"], "The server deduplicates by key and returns the original result."),
      Q("Live comment stream to viewers (server → client only). Simplest fit?", ["WebSocket", "*Server-Sent Events", "gRPC unary", "Polling every 30 s"], "One-directional push over plain HTTP."),
    ],
    cards: [["Why cursor over offset pagination?", "Stable under concurrent inserts/deletes and O(1) seek instead of scanning skipped rows"]],
  }),
  T("hld", "load-balancing", "Load balancing & API gateways", 1, 25, "Spreading traffic, health checks and why stateless services matter.", {
    viz: "load-balancer",
    signals: ["More than one instance of anything", "Uneven load or hot instances", "Zero-downtime deploys"],
    lesson: `**L4 vs L7:** L4 routes by IP/port (fast, protocol-agnostic); L7 understands HTTP (path/header routing, TLS termination, retries, auth).

**Algorithms**
- *Round robin / weighted:* equal or proportional share.
- *Least connections / least response time:* adapts to slow backends and long-lived connections.
- *Power of two choices:* pick two at random, send to the less loaded: near-optimal with stale information.
- *Consistent hashing:* session or cache affinity; minimal reshuffle on membership change.

**Health checks** (active probes + passive outlier detection) remove bad instances; **connection draining** enables rolling deploys.

**Statelessness:** keep session state in a shared store (Redis) or signed tokens so any instance can serve any request. Sticky sessions are a fallback, and required for WebSockets (route by connection id).

**LB redundancy:** active–passive pairs with a virtual IP, or anycast across regions. Global: GeoDNS / anycast → regional LBs.

**API gateway** adds cross-cutting concerns: authentication, rate limiting, request shaping, canary routing, observability.

**Overload protection:** load shedding, queue limits, circuit breakers, retries with jittered exponential backoff and retry budgets (retries amplify outages).`,
    pitfalls: ["Treating the LB as never failing", "Round robin with long-lived connections", "Unbounded retries causing retry storms", "Sticky sessions hiding stateful servers"],
    quiz: [
      Q("Backends have widely varying request durations. Better algorithm than round robin?", ["Random", "*Least connections (or power of two choices)", "IP hash", "DNS round robin"], "It accounts for in-flight work."),
      Q("Why do retries need jitter?", ["Security", "*To avoid synchronised retry waves that re-overload the server", "To reduce latency", "TCP requires it"], "Synchronised clients create thundering herds."),
    ],
    cards: [["Power of two choices", "Sample two backends at random, send to the less loaded one"]],
  }),
  T("hld", "caching", "Caching & CDNs", 1, 35, "Where to cache, how to write, how to invalidate, and how caches fail.", {
    signals: ["Read-heavy workloads", "Expensive computations or slow dependencies", "Static or semi-static content served globally"],
    lesson: `**Layers:** browser → CDN → gateway → application (local in-process) → distributed cache (Redis/Memcached) → database buffer pool.

**Read/write strategies**

| Strategy | How | Trade-off |
|---|---|---|
| Cache-aside | App reads cache, on miss loads DB and fills | Simple; first read slow; stale until TTL/invalidated |
| Read-through | Cache loads on miss itself | Same, logic in cache layer |
| Write-through | Write cache + DB synchronously | Fresh; slower writes |
| Write-behind | Write cache, flush async | Fast; risk of loss |
| Refresh-ahead | Reload hot keys before expiry | Avoids misses; wasted work |

**Invalidation:** TTL (bounded staleness), explicit delete on write (delete, do not update: avoids races), versioned keys, CDC-driven invalidation.

**Failure modes**
- *Stampede / thundering herd:* many misses on one hot key → request coalescing (single-flight), locks, jittered TTLs, stale-while-revalidate.
- *Penetration:* lookups for non-existent keys → cache negatives, Bloom filter.
- *Avalanche:* many keys expire together or the cache dies → TTL jitter, replicas, graceful degradation.
- *Hot key:* one key overloads a shard → local cache in front, key splitting.

**Eviction:** LRU, LFU, TTL; size the cache with the 80/20 rule.

**CDN:** push vs pull, cache-control headers, signed URLs for private content, edge compute. Dynamic content: cache per segment or use short TTLs.

**Consistency:** a cache is a replica; state the acceptable staleness explicitly.`,
    pitfalls: ["Updating the cache then the DB (inconsistent on failure)", "No plan for cache node failure / cold start", "Caching user-specific data under a shared key", "Same TTL on all keys"],
    quiz: [
      Q("A celebrity's profile key expires and 50 k requests miss simultaneously. Fix?", ["Bigger database", "*Request coalescing / lock so one request rebuilds, others wait or get stale", "Disable TTL", "Add more cache nodes"], "Classic stampede; single-flight plus stale-while-revalidate."),
      Q("On a write with cache-aside, the safest order is…", ["Update cache then DB", "*Update DB, then delete the cache key", "Delete cache then update DB", "Update both in parallel"], "Deleting after the DB write minimises stale windows; add a short TTL as a backstop."),
    ],
    cards: [["Three cache failure modes", "Stampede (hot key miss), penetration (missing keys), avalanche (mass expiry/outage)"]],
  }),
  T("hld", "databases", "Databases: SQL, NoSQL, indexes & storage engines", 1, 40, "Choosing a store from access patterns, not fashion.", {
    signals: ["Any persistent state", "Query patterns, consistency needs and write volume differ per entity"],
    lesson: `**Choose by access pattern**

| Need | Fit |
|---|---|
| Relations, joins, transactions, moderate scale | Relational (Postgres, MySQL, Spanner for global) |
| Key lookups at huge scale, simple values | Key-value (DynamoDB, Redis) |
| Wide rows, heavy writes, time-ordered data | Wide-column (Bigtable, Cassandra, HBase) |
| Flexible nested documents | Document (MongoDB, Firestore) |
| Full-text search, facets | Inverted index (Elasticsearch) |
| Relationships traversal | Graph DB |
| Metrics | Time-series DB |
| Large blobs | Object storage (GCS, S3) + metadata in a DB |

**Indexes:** B-tree (range + equality), hash (equality), composite (leftmost prefix rule), covering indexes, secondary indexes cost writes. Geospatial (geohash, R-tree), inverted (text).

**Storage engines**
- *B-tree:* in-place pages, great reads and range scans, write amplification from random I/O.
- *LSM-tree:* memtable + WAL → immutable SSTables → compaction. Great write throughput; reads check multiple levels (Bloom filters help); compaction costs.

**Normalisation vs denormalisation:** normalise for integrity, denormalise for read paths you have measured. In NoSQL you model *queries first*: choose a partition key that spreads load and a sort key that serves range reads.

**Scaling path:** vertical → read replicas → caching → partitioning (sharding) → specialised stores per workload (polyglot persistence).

**Google context:** Bigtable (sorted wide-column on GFS/Colossus), Spanner (globally consistent SQL using TrueTime), Megastore, F1.`,
    pitfalls: ["'NoSQL because scale' without access patterns", "Low-cardinality or monotonically increasing partition keys (hot partitions)", "Unbounded secondary indexes on write-heavy tables", "Storing blobs in the database"],
    quiz: [
      Q("Write-heavy time-series events, queries by (deviceId, time range). Good fit?", ["Single Postgres table", "*Wide-column / LSM store keyed by (deviceId, timestamp)", "Graph DB", "Elasticsearch only"], "Partition by device, sort by time; LSM handles high write rates."),
      Q("Why do LSM-trees use Bloom filters?", ["To compress data", "*To skip SSTables that definitely lack a key", "To order writes", "For transactions"], "They cut read amplification for point lookups."),
    ],
    cards: [["LSM write path", "WAL + memtable → flush to SSTable → background compaction"], ["Composite index rule", "Usable for queries on a leftmost prefix of its columns"]],
  }),
  T("hld", "replication", "Replication & consistency models", 1, 35, "Leader/follower, multi-leader, leaderless quorums and what clients can observe.", {
    viz: "quorum",
    signals: ["High availability, read scaling, geo-distribution", "Questions about stale reads or conflicting writes"],
    lesson: `**Topologies**
- *Single leader:* writes to leader, replicate to followers. Sync (durable, slower) vs async (fast, may lose recent writes on failover). Read replicas introduce **replication lag**.
- *Multi-leader:* writes in several regions; needs conflict resolution (last-write-wins, version vectors, CRDTs, app-level merge).
- *Leaderless (Dynamo-style):* write to N replicas, succeed on W acks, read from R; **R + W > N** gives overlap. Read repair, hinted handoff and anti-entropy (Merkle trees) heal divergence.

**Consistency models (strong → weak):** linearizable → sequential → causal → read-your-writes / monotonic reads → eventual.

**Lag anomalies and fixes:** read-your-writes (read from leader after own write, or track write timestamp), monotonic reads (pin user to a replica), consistent prefix.

**CAP:** under a network partition you choose consistency (reject some requests) or availability (serve possibly stale data). **PACELC:** else, when healthy, you trade latency vs consistency.

**Failover:** detect (heartbeats/timeouts), elect a new leader (consensus), fence the old leader (epoch/fencing tokens) to avoid **split brain**.

**Consensus (Raft/Paxos):** a majority quorum agrees on a replicated log; tolerates ⌊(n−1)/2⌋ failures. Used for metadata, locks and leader election (ZooKeeper, etcd, Chubby), not for bulk data paths.`,
    pitfalls: ["Claiming 'strong consistency' with async replicas", "Last-write-wins silently dropping data (clock skew)", "Ignoring split brain on failover", "Choosing quorum numbers without stating R + W > N"],
    quiz: [
      Q("N = 3. Which configuration guarantees a read sees the latest acknowledged write?", ["W = 1, R = 1", "W = 1, R = 2", "*W = 2, R = 2", "W = 3, R = 0"], "R + W = 4 > 3 so read and write sets overlap."),
      Q("A user updates their profile then sees the old one. Which guarantee is missing?", ["Linearizability for all", "*Read-your-writes", "Durability", "Atomicity"], "Their read hit a lagging replica."),
      Q("A Raft cluster of 5 nodes tolerates how many failures?", ["1", "*2", "3", "4"], "Majority of 5 is 3."),
    ],
    cards: [["Quorum overlap rule", "R + W > N"], ["Fencing token", "Monotonic epoch number that storage checks to reject writes from a deposed leader"]],
  }),
  T("hld", "partitioning", "Partitioning, sharding & consistent hashing", 1, 35, "Splitting data so no node holds everything, without hot spots.", {
    viz: "consistent-hash",
    signals: ["Data or write volume exceeds one machine", "Hot keys / celebrities", "Adding and removing nodes online"],
    lesson: `**Strategies**
- *Range partitioning:* sorted keys, efficient range scans, risk of hot ranges (timestamps). Bigtable/Spanner split and merge tablets automatically.
- *Hash partitioning:* even spread, no range scans across keys.
- *Directory / lookup service:* flexible, the directory must be highly available.

**Consistent hashing:** nodes and keys on a ring; a key belongs to the next node clockwise. Adding/removing a node moves only ~1/N of keys. **Virtual nodes** smooth the distribution and let heterogeneous machines take proportional load. Replicate to the next R distinct nodes.

**Choosing a shard key:** high cardinality, even access, aligned with the dominant query. Examples: \`userId\` for user-owned data, \`(chatId)\` for messages, composite keys for time series (\`deviceId + day\`).

**Hot spots:** celebrities, viral items, sequential ids. Mitigate with key salting, dedicated shards, caching, or splitting hot partitions.

**Cross-shard pain:** joins and transactions (2PC or sagas), secondary indexes (local = scatter-gather reads; global = async, eventually consistent), unique constraints.

**Rebalancing:** fixed number of logical partitions mapped to nodes (move whole partitions), dynamic splitting, or consistent hashing. Never \`hash(key) % N\` with changing N.

**Routing:** client-side (smart client), proxy, or coordinator service with a partition map (ZooKeeper/etcd).`,
    pitfalls: ["hash % N with elastic N", "Shard key that forces scatter-gather for the main query", "Monotonic keys creating a write hot spot", "Forgetting how to resize / rebalance"],
    quiz: [
      Q("Why use virtual nodes in consistent hashing?", ["Encryption", "*Smoother load distribution and proportional capacity", "Faster hashing", "Stronger consistency"], "Many small arcs per physical node average out the variance."),
      Q("Messages table sharded by messageId; the app mostly lists a chat's recent messages. Problem?", ["None", "*Every chat read becomes a scatter-gather across shards", "Too few shards", "Hot keys"], "Shard by chatId so a conversation lives together."),
    ],
    cards: [["Keys moved when a node joins a consistent-hash ring of N nodes", "About 1/N of the keys"]],
  }),
  T("hld", "transactions", "Transactions, isolation & distributed coordination", 2, 35, "ACID, isolation anomalies, 2PC, sagas, and idempotent exactly-once effects.", {
    signals: ["Money, inventory, bookings: anything that must not double-apply", "Operations spanning services or shards"],
    lesson: `**ACID:** atomicity, consistency, isolation, durability (WAL + fsync/replication).

**Isolation levels and anomalies**

| Level | Prevents | Still allows |
|---|---|---|
| Read committed | Dirty reads | Non-repeatable reads, phantoms, lost updates |
| Repeatable read / snapshot | Non-repeatable reads | Write skew, (phantoms) |
| Serializable | Everything | Lower throughput / aborts |

**Concurrency control:** pessimistic locks (\`SELECT … FOR UPDATE\`), optimistic (version column / compare-and-set), MVCC snapshots.

**Distributed transactions**
- *Two-phase commit:* prepare → commit. Atomic but blocking if the coordinator fails; fine inside one database system (Spanner uses 2PC over Paxos groups).
- *Saga:* sequence of local transactions with **compensating actions**; orchestrated or choreographed. No isolation: design for intermediate states.
- *Outbox pattern:* write the business row and an event row in one local transaction; a relay publishes the event → no dual-write inconsistency. CDC is the log-based variant.
- *TCC (try–confirm–cancel)* for reservations.

**Exactly-once is at-least-once + idempotency:** idempotency keys, dedup tables, conditional writes.

**Distributed locks & leases:** via consensus stores; always use **fencing tokens**, because a paused client may believe it still holds the lock.

**Clocks:** wall clocks skew; use logical clocks (Lamport, vector) for ordering; TrueTime gives bounded uncertainty for external consistency.`,
    pitfalls: ["Dual writes (DB + queue) without outbox", "Assuming Redis SETNX lock is safe without fencing", "Read-modify-write without a lock or version check", "Sagas without compensation for each step"],
    quiz: [
      Q("Two users book the last seat concurrently under snapshot isolation. What prevents double booking?", ["Nothing needed", "*A unique constraint / conditional update or row lock on the seat", "Read replicas", "A cache"], "Make the conflict materialise on one row: compare-and-set or FOR UPDATE."),
      Q("Service must update its DB and publish an event reliably. Pattern?", ["Publish then write", "Write then publish", "*Transactional outbox", "2PC with the broker"], "One local transaction, then a relay delivers at-least-once."),
    ],
    cards: [["Exactly-once in practice", "At-least-once delivery + idempotent processing"]],
  }),
  T("hld", "messaging", "Message queues, streams & event-driven design", 1, 35, "Decoupling, backpressure, ordering and delivery semantics.", {
    signals: ["Async work, spikes to smooth, fan-out to many consumers", "Event sourcing, stream processing, CDC"],
    lesson: `**Why queues:** decouple producers from consumers, absorb bursts, retry failures, fan out.

**Queue vs log**
- *Message queue (SQS, RabbitMQ, Pub/Sub):* per-message ack, competing consumers, messages removed after processing.
- *Log / stream (Kafka, Pub/Sub Lite, Kinesis):* append-only partitions, consumers track offsets, replayable, ordering within a partition, consumer groups for scaling.

**Delivery semantics:** at-most-once (may lose), at-least-once (may duplicate → consumers must be idempotent), "exactly-once" = idempotent producer + transactional offset commit, within one system.

**Ordering:** only per partition; choose the partition key (userId, orderId) so related events stay ordered. More partitions = more parallelism, but a hot key bounds throughput.

**Failure handling:** retries with backoff, **dead-letter queues**, poison-message detection, visibility timeouts.

**Backpressure:** bounded queues, consumer lag monitoring and autoscaling, load shedding at the edge.

**Patterns:** fan-out on write, work queues, pub/sub, event sourcing (state = fold over events), CQRS (separate read models), stream processing with windows and watermarks (Flink/Dataflow), Lambda vs Kappa architectures.

**Sizing a Kafka-like topic:** partitions ≈ peak throughput / per-partition throughput; retention by time or size; replication factor 3, \`acks=all\` with min in-sync replicas 2.`,
    pitfalls: ["Assuming global ordering", "Non-idempotent consumers with at-least-once delivery", "Unbounded queues hiding overload", "No DLQ: one bad message blocks a partition"],
    quiz: [
      Q("All events for one order must be processed in order while scaling consumers. How?", ["One partition for everything", "*Partition by orderId", "Random partitioning", "Global lock"], "Order is preserved within a partition; different orders proceed in parallel."),
      Q("At-least-once delivery implies consumers must be…", ["Stateless", "*Idempotent", "Single-threaded", "Synchronous"], "Duplicates will happen."),
    ],
    cards: [["Queue vs log", "Queue: ack-and-delete, competing consumers. Log: retained, offset-based, replayable, ordered per partition"]],
  }),
  T("hld", "rate-limiting-concept", "Rate limiting & overload control", 2, 25, "Token bucket, sliding windows, and distributed counters.", {
    viz: "token-bucket",
    signals: ["Protect services from abuse or bursts", "Fair usage across tenants", "API quotas"],
    lesson: `**Algorithms**

| Algorithm | Behaviour | Notes |
|---|---|---|
| Token bucket | Refill r tokens/s up to capacity b; allows bursts | Most common; two numbers per key |
| Leaky bucket | Constant outflow queue | Smooths traffic |
| Fixed window counter | Count per window | Boundary burst up to 2× |
| Sliding window log | Timestamps of requests | Exact, memory heavy |
| Sliding window counter | Weighted current + previous window | Good approximation, cheap |

**Where:** client (courtesy), edge/API gateway (primary), per service (defence in depth).

**Keys:** user id, API key, IP, endpoint, tenant; often several limits at once.

**Distributed implementation:** Redis with atomic Lua (read–compute–write in one step) or \`INCR + EXPIRE\`; shard by key. To cut latency: local token buckets synced periodically with a central quota (accept small over-admission).

**Race conditions:** check-then-set across instances → use atomic operations.

**Responses:** HTTP 429 with \`Retry-After\` and remaining-quota headers.

**Failure policy:** fail open (availability) or fail closed (protection): decide per endpoint.

**Related controls:** load shedding by priority, circuit breakers, adaptive concurrency limits, backpressure.`,
    pitfalls: ["Fixed windows allowing 2× bursts at boundaries", "Non-atomic counter updates", "One global Redis as a single point of failure / latency", "Limiting only by IP (NAT, proxies)"],
    quiz: [
      Q("Which algorithm naturally allows short bursts while enforcing an average rate?", ["Leaky bucket", "*Token bucket", "Fixed window", "Sliding log"], "Accumulated tokens can be spent at once up to the bucket capacity."),
      Q("Limit: 100/min with fixed windows. Worst-case requests in a 60 s span?", ["100", "150", "*200", "Unlimited"], "100 at the end of one window plus 100 at the start of the next."),
    ],
    cards: [["Token bucket state per key", "tokens, lastRefillTimestamp"]],
  }),
  T("hld", "storage-search", "Blob storage, search & probabilistic structures", 2, 30, "Object stores, inverted indexes, Bloom filters, HyperLogLog and Count-Min Sketch.", {
    viz: "bloom",
    signals: ["Media/files, full-text search, 'have we seen this?', unique counts and top-k at scale"],
    lesson: `**Object storage:** immutable blobs addressed by key; metadata in a database. Large files → **chunking** (4–64 MB), content hashing for dedup, resumable/multipart uploads, **pre-signed URLs** so clients upload directly. Durability via replication or erasure coding (e.g. 6+3: 1.5× overhead vs 3× for triple replication).

**GFS/Colossus & HDFS:** a master holds metadata (namespace, chunk locations); chunk servers hold replicated chunks; clients talk to chunk servers directly for data.

**Search:** inverted index term → posting list (docId, positions). Pipeline: tokenise → normalise → index → shard by document → scatter-gather query → rank (BM25 / learning-to-rank). Near-real-time via segment merges. Typeahead uses tries or prefix indexes with precomputed top-k.

**Probabilistic structures**
- *Bloom filter:* set membership, no false negatives, tunable false positives; k hashes over m bits. Uses: skip disk reads, crawler URL-seen, cache penetration.
- *HyperLogLog:* count distinct in ~12 KB with ~1% error.
- *Count-Min Sketch:* frequency estimates (over-counts); pair with a heap for heavy hitters / top-k.
- *Geohash / quadtree / S2 cells:* map 2D proximity to 1D prefixes for geo queries.

**Deduplication:** content hash (SHA-256) for exact; SimHash/MinHash for near-duplicates.`,
    pitfalls: ["Routing blob bytes through application servers", "Assuming a Bloom filter supports deletion (needs counting variant)", "Exact distinct counts at billion scale", "Search index treated as source of truth"],
    quiz: [
      Q("A Bloom filter says 'not present'. This is…", ["Probably true", "*Definitely true", "Probably false", "Unknown"], "No false negatives."),
      Q("Count unique visitors per day across 1 B events with tiny memory.", ["Hash set", "*HyperLogLog", "Bloom filter", "Sorted list"], "HLL estimates cardinality in kilobytes."),
    ],
    cards: [["Erasure coding 6+3 overhead", "1.5× storage, tolerates any 3 fragment losses"]],
  }),
  T("hld", "reliability", "Reliability, observability & operations", 2, 30, "Failure is normal: design the blast radius, detect fast, recover automatically.", {
    signals: ["Any 'what if X dies?' question", "SLOs, rollouts, multi-region"],
    lesson: `**Vocabulary:** SLI (measurement), SLO (target), SLA (contract), error budget (1 − SLO) to balance velocity and stability.

**Redundancy:** no single point of failure; N+1 or N+2 capacity; zones and regions; active–active vs active–passive; RPO (data you may lose) and RTO (time to recover).

**Resilience patterns**
- Timeouts everywhere; retries with jittered exponential backoff and budgets.
- Circuit breakers; bulkheads (isolate pools); graceful degradation (serve stale / partial).
- Idempotency so retries are safe.
- Backpressure and load shedding; rate limits.
- Health checks, leader election, automatic failover with fencing.

**Deployment safety:** canary → gradual rollout → automatic rollback; feature flags; backward-compatible schema changes (expand → migrate → contract).

**Observability:** metrics (RED: rate, errors, duration; USE: utilisation, saturation, errors), structured logs, distributed traces, alerting on SLO burn rate, dashboards per service.

**Data safety:** backups + tested restores, point-in-time recovery, checksums, multi-region replication.

**Security basics:** TLS in transit, encryption at rest, least privilege, authN (OAuth2/OIDC, JWT) vs authZ (RBAC/ABAC), secrets management, input validation, audit logs, privacy (PII minimisation, deletion).

In the wrap-up phase, proactively walk through: what fails, how you detect it, what the user sees, how it recovers.`,
    pitfalls: ["No timeouts on downstream calls", "Retries without idempotency", "Monitoring infrastructure only, not user-facing SLIs", "Backups never restored in tests"],
    quiz: [
      Q("SLO is 99.9% monthly. The error budget is about…", ["4 minutes", "*43 minutes", "7 hours", "0"], "0.1% of ~30 days ≈ 43 min."),
      Q("A downstream service is failing slowly and threads pile up. Which pattern helps first?", ["More retries", "*Timeouts + circuit breaker", "Bigger thread pool", "Caching writes"], "Fail fast and stop calling the unhealthy dependency."),
    ],
    cards: [["RPO vs RTO", "RPO: how much data may be lost. RTO: how long recovery may take"]],
  }),
  T("hld", "google-papers", "Google-scale building blocks", 3, 30, "GFS, MapReduce, Bigtable, Chubby, Spanner, Borg: ideas worth citing.", {
    signals: ["Google interviews reward understanding the ideas behind their own infrastructure"],
    lesson: `| System | Core idea | Use it to explain |
|---|---|---|
| **GFS / Colossus** | Single master metadata, 64 MB chunks, 3× replication, append-optimised | Large file storage, chunking, metadata/data split |
| **MapReduce / Dataflow** | Map → shuffle by key → reduce; re-execute failed tasks | Batch pipelines, index building, aggregation |
| **Bigtable** | Sparse sorted map (row, column, timestamp); tablets; LSM on GFS; Chubby for coordination | Wide-column modelling, row-key design, range scans |
| **Chubby** | Paxos-backed lock service and small-file store | Leader election, config, service discovery |
| **Spanner** | Paxos groups per shard + 2PC across; TrueTime for external consistency | Global strong consistency, when to pay for it |
| **Borg / Kubernetes** | Cluster scheduling, bin packing, priorities and preemption | Job schedulers, autoscaling |
| **Dremel / BigQuery** | Columnar storage, tree execution | Analytics |
| **Pub/Sub, Kafka** | Durable logs, fan-out | Event pipelines |
| **Dynamo (Amazon)** | Consistent hashing, quorums, vector clocks, gossip | Leaderless KV design |

**Row-key design (Bigtable):** rows are sorted lexicographically; put the most selective prefix first, reverse domains (\`com.google.maps\`), reverse timestamps for "latest first", avoid monotonically increasing keys (hot tablets) by salting or field promotion.

**MapReduce mental model for interview questions:** "top-k words in 1 PB of logs" → map (word, 1) → combine → shuffle → reduce sum → second job for top-k with a heap per reducer.

You are not expected to recite the papers, but naming the right primitive ("this is a leader-election problem; a Chubby/etcd lease with fencing solves it") signals depth.`,
    pitfalls: ["Name-dropping without explaining the mechanism", "Using Spanner-style global transactions where eventual consistency is fine"],
    quiz: [
      Q("What does TrueTime give Spanner?", ["Faster disks", "*Bounded clock uncertainty enabling externally consistent timestamps", "Leader election", "Compression"], "Commit-wait over the uncertainty interval orders transactions globally."),
      Q("Bigtable row key for 'latest events per device first'?", ["timestamp#device", "*device#(MAX − timestamp)", "random UUID", "device only"], "Prefix by device for locality; reversed timestamp sorts newest first."),
    ],
    cards: [["GFS architecture in one line", "One metadata master, many chunk servers, clients read/write chunks directly"]],
  }),
];
