import { Q, T, type Extra } from "./h";
import type { Topic } from "@/lib/types";

/** Second pass over HLD, LLD and Craft: deeper analysis, bar-raiser angles and extra flashcards per topic. */
export const designExtra: Record<string, Extra> = {
  // ───────────────────────── HLD ─────────────────────────
  "hld-framework": {
    deep: `- **Requirements that change the design:** read/write ratio, consistency needed per operation, latency target (p99, not average), data size and growth, geography, and what must never be lost. Ask only questions whose answer would change a box on the board.
- **Non-functional numbers to pin down:** availability target (99.9% = 8.8 h/year, 99.99% = 53 min/year), durability, p99 latency, peak-to-average ratio.
- **Depth beats breadth:** after the high-level diagram pick the 1–2 hardest components and go deep: data model with keys, exact read and write paths, failure handling. A wide but shallow diagram reads as L3/L4.
- **Trade-off sentence template:** "I choose X over Y because of requirement R; the cost is C; I would revisit if Z changes."
- **Drive the failure discussion yourself:** for every box ask what happens when it dies, is slow, or is partitioned; for every arrow ask about retries, timeouts, duplicates and ordering.
- **Evolution story:** state what you would build for 1× load, what breaks at 10×, and what changes at 100×. Avoid premature sharding and premature microservices.
- **Bar raiser (L5):** identify the bottleneck with numbers, propose an operational plan (metrics, alerts, rollout, backfill, migration with dual writes), quantify cost, and handle the interviewer's curveball by re-deriving rather than defending the first design.`,
  },
  estimation: {
    pre: ["hld-framework"],
    deep: `- **Useful conversions:** 1 day ≈ 10⁵ seconds (86 400); 1 M requests/day ≈ 12 QPS; 1 B/day ≈ 12 K QPS; peak ≈ 2–10× average. 1 KB × 1 B = 1 TB.
- **Machine rules of thumb:** one app server handles ~1–10 K simple requests/s; a single Postgres/MySQL primary handles a few thousand writes/s and a few TB comfortably; Redis ~100 K ops/s per node; a Kafka partition ~10s of MB/s; one host holds ~10⁵–10⁶ idle connections (memory bound).
- **Latency ladder:** L1 ~1 ns, main memory ~100 ns, SSD random read ~100 µs, same-datacentre round trip ~0.5 ms, disk seek ~10 ms, cross-continent round trip ~100–150 ms.
- **Storage estimate recipe:** objects/day × size × retention × replication factor (3) × overhead (indexes, ~1.3). Separate metadata (small, hot, in a database) from blobs (large, cold, in object storage).
- **Bandwidth and memory:** QPS × payload = bytes/s; cache size = hot fraction (often 20%) × daily unique data.
- **Why estimate at all:** each number must lead to a decision: single node or sharded? cache or not? fan-out on write or read? If a number changes nothing, skip it.
- **Bar raiser:** sanity-check with a second method, state assumptions explicitly, round aggressively, and compute the *bottleneck* resource (IOPS, memory, connections, network) rather than every resource.`,
  },
  networking: {
    pre: ["hld-framework"],
    deep: `- **What happens when you type a URL:** DNS (recursive resolver, TTL caching, anycast / geo-DNS) → TCP handshake → TLS handshake (certificate, key exchange; TLS 1.3 is one round trip) → HTTP request → CDN / load balancer → service.
- **HTTP versions:** 1.1 keep-alive but head-of-line blocking per connection; HTTP/2 multiplexes streams over one TCP connection (still TCP head-of-line on loss); HTTP/3 runs on QUIC over UDP: independent streams, faster handshakes, connection migration.
- **Real-time options:** short polling (wasteful), long polling (simple, works everywhere), Server-Sent Events (one-way, auto-reconnect, HTTP-friendly), WebSocket (bidirectional, stateful, needs sticky routing and a connection registry), WebRTC (peer-to-peer media over UDP).
- **API styles:** REST (resources, cacheable, public APIs), gRPC (HTTP/2, protobuf, streaming, internal services), GraphQL (client-shaped queries; watch N+1 and caching).
- **API hygiene to state:** idempotency keys for POST, cursor pagination (stable under inserts) over offset, versioning, rate-limit headers, consistent error model, field masks for partial updates.
- **Timeouts, retries, backoff:** every call needs a deadline; retry only idempotent calls with exponential backoff + jitter and a retry budget; propagate deadlines downstream.
- **Service-to-service:** service discovery (DNS, registry, or mesh sidecar), connection pooling, mTLS, client-side vs proxy load balancing.
- **Bar raiser:** scaling WebSockets to millions (connection gateways, heartbeat, presence, fan-out via pub/sub by user → gateway mapping), mobile realities (flaky networks, battery, push notifications via APNs/FCM), and TCP tuning words: Nagle, slow start, keep-alive.`,
  },
  "load-balancing": {
    pre: ["networking"],
    deep: `- **Algorithms and when:** round robin (uniform requests), weighted (mixed hardware), least connections (long-lived or uneven requests), least latency / EWMA, **power of two choices** (pick two at random, take the less loaded: near-optimal with tiny state), consistent hashing (cache affinity, sticky state).
- **L4 vs L7:** L4 forwards TCP/UDP by address and is very fast; L7 terminates TLS and routes by path, header or cookie, enabling canaries, retries and auth. Large systems stack them: anycast / ECMP → L4 → L7 → service.
- **Global load balancing:** geo-DNS or anycast to the nearest healthy region; health-based failover; beware DNS TTLs when failing over.
- **Health checks:** active (probe) and passive (observe errors); liveness versus readiness; slow start for new instances; connection draining on removal.
- **Sticky sessions** are a smell: prefer stateless services with session state in a shared store. Where state is inherent (WebSockets, caches) use consistent hashing and plan for rebalancing.
- **Overload control:** admission control and load shedding (drop low-priority first), queue with bounded length and deadlines, concurrency limits, circuit breakers, backpressure. Autoscaling reacts in minutes; shedding reacts in milliseconds.
- **Failure modes:** thundering herd after a restart, retry storms amplifying an outage, uneven load with long-lived HTTP/2 connections (balance per request, not per connection).
- **Bar raiser:** the LB itself as a single point of failure (active–passive pair with a virtual IP, or anycast), zone-aware routing, and deploying with blue-green / canary through LB weights.`,
  },
  caching: {
    pre: ["load-balancing"],
    deep: `- **Patterns:** cache-aside (app reads cache, falls back to DB, populates), read-through (cache loads itself), write-through (write cache + DB synchronously), write-behind (async flush: fast, risks loss), refresh-ahead (renew hot keys before expiry).
- **Invalidation order:** update the database, then *delete* the cache key (not set), to narrow races. Residual race → short TTL, versioned values, or invalidation driven by the change log (CDC). "Delete twice with a delay" is a pragmatic patch.
- **Three classic failures:** *penetration* (keys that do not exist: cache negative results, Bloom filter), *breakdown / stampede* (a hot key expires: per-key lock or single-flight, stale-while-revalidate, probabilistic early refresh), *avalanche* (many keys expire together or the cache dies: jittered TTLs, replicas, warm-up, degrade gracefully).
- **Hot keys and big keys:** replicate hot keys across shards or add a small in-process cache in front; split large values.
- **Eviction:** LRU, LFU (better for skewed popularity, needs ageing), TinyLFU / W-TinyLFU (admission filter), TTL, random. Redis uses approximate LRU/LFU by sampling.
- **Distributed cache topology:** client-side consistent hashing, replicas for availability, no cross-node consistency guarantees. Memcached (simple, multithreaded, LRU) vs Redis (data structures, persistence, replication, scripting).
- **CDN:** cache key design (vary headers), immutable versioned asset URLs, TTL and purge, origin shield, signed URLs for private content, edge compute.
- **Bar raiser:** quantify hit ratio → backend load (95% → 99% hit rate cuts origin traffic 5×), decide what staleness each read can tolerate, and say where *not* to cache (strongly consistent balances, per-request personalised data without a key).`,
  },
  databases: {
    pre: ["estimation"],
    deep: `- **Choosing a store:** relational (joins, transactions, flexible queries), key-value (lookup by key at scale), document (aggregate per entity), wide-column (huge write volume, known query patterns), graph (multi-hop relationships), time-series, search index (text and facets), object store (blobs), warehouse / columnar (analytics). Polyglot persistence is normal: source of truth + derived views.
- **B-tree vs LSM-tree:** B-tree updates pages in place: fast reads, predictable latency, write amplification from random I/O. LSM appends to a memtable + WAL, flushes sorted SSTables and compacts: very fast writes, Bloom filters to skip files on reads, compaction debt and space amplification.
- **Index mechanics:** composite index and the leftmost-prefix rule; covering index (index-only scan); selectivity; every index slows writes. Clustered (rows stored in key order) vs secondary (pointer or key lookup). Read EXPLAIN in terms of scans, seeks and sorts.
- **Row vs column storage:** OLTP reads whole rows; OLAP scans few columns of many rows with compression and vectorised execution.
- **Durability path:** write-ahead log → fsync (group commit) → apply to pages later; crash recovery replays the log.
- **Modelling for NoSQL:** start from queries; denormalise; choose partition key (distribution) and sort key (range within a partition); avoid unbounded partitions; use write-time fan-out or materialised views instead of joins.
- **Operational reality:** connection pooling, N+1 queries, online schema changes (expand → migrate → contract), hot rows, long transactions blocking vacuum, backups you have actually restored.
- **Bar raiser:** NewSQL (Spanner, CockroachDB) gives SQL + horizontal scale with consensus per range; knowing when a single well-indexed Postgres is the right answer is itself a senior signal.`,
  },
  replication: {
    pre: ["databases"],
    deep: `- **Sync vs async vs semi-sync:** synchronous waits for replicas (no loss, slower, less available); asynchronous acknowledges first (fast, may lose the last writes on failover); semi-sync waits for one replica.
- **Quorums:** with N replicas, W write acks and R read acks, R + W > N guarantees a read overlaps the latest write. N=3, W=2, R=2 is the usual choice. Sloppy quorums + hinted handoff trade consistency for availability.
- **Leaderless repair:** read repair on reads, anti-entropy with Merkle trees in the background, vector clocks or last-write-wins to resolve concurrent writes (LWW silently drops data when clocks skew).
- **Consistency models from strong to weak:** linearizable → sequential → causal → read-your-writes / monotonic reads → eventual. Name the weakest model each feature can tolerate.
- **Lag anomalies and fixes:** read-your-writes (read from the leader for a while after writing, or pin by version/LSN), monotonic reads (stick a user to one replica), causal ordering (version vectors).
- **Raft in five facts:** terms, majority vote for leader election with randomised timeouts, the leader appends to a replicated log, an entry is committed once a majority stores it, a candidate must have an up-to-date log to win. Tolerates f failures with 2f + 1 nodes.
- **Failover hazards:** split brain (two leaders: fence the old one with epochs / fencing tokens, require a quorum), lost un-replicated writes, replica promotion with stale data, thundering reconnects.
- **Membership and failure detection:** heartbeats, gossip, phi-accrual detectors; a coordination service (ZooKeeper, etcd, Chubby) holds leader leases and configuration.
- **Multi-leader / multi-region:** write conflicts are inevitable: avoid them (per-user home region), resolve them (LWW, CRDTs, application merge), or use consensus (Spanner) and pay latency.
- **Bar raiser:** CAP is about behaviour *during a partition*; PACELC adds the everyday latency-versus-consistency trade-off. Classify your design: Dynamo/Cassandra are PA/EL, Spanner is PC/EC.`,
  },
  partitioning: {
    pre: ["databases", "replication"],
    deep: `- **Schemes:** range (range scans, risk of hot ranges; needs splitting), hash (even spread, no range scans), directory / lookup (flexible, extra hop), geographic. Compound keys: hash on the partition key + sort within it.
- **Consistent hashing:** keys and nodes on a ring; a node owns the arc before it; adding a node moves only ~1/N of keys. Virtual nodes smooth the load and allow weighting. Alternatives: rendezvous (highest random weight) hashing, jump hash, or a fixed number of logical shards (e.g. 1024) mapped to nodes.
- **Shard key checklist:** high cardinality, even distribution, matches the dominant query (so most requests hit one shard), immutable, not monotonic (timestamps and auto-increment ids create a hot tail: prefix with a hash or bucket).
- **Hot partitions and celebrities:** split the key (user_id + bucket), isolate heavy tenants on dedicated shards, cache, or handle the heavy hitters with a different path (fan-out on read).
- **Cross-shard operations:** scatter-gather queries (tail latency grows with fan-out), global secondary indexes (async, eventually consistent) vs local indexes, joins moved to the application or to a derived store, transactions via 2PC or sagas.
- **Rebalancing:** move logical shards, not rows; throttle; dual-read during the move; automatic split/merge by size or load (Bigtable tablets, DynamoDB).
- **Unique ids without coordination:** Snowflake (timestamp | machine id | sequence: sortable, 64-bit), UUIDv4 (random, index-unfriendly), UUIDv7 / ULID (time-ordered), ticket servers with ranges, database sequences per shard with different offsets.
- **Routing:** client library, a routing proxy, or a coordinator; metadata in a consistent store (ZooKeeper/etcd).
- **Bar raiser:** resharding without downtime (dual write + backfill + verify + cutover), multi-tenant isolation, and proving a key choice with the two or three top queries.`,
  },
  transactions: {
    pre: ["databases", "replication", "concurrency"],
    deep: `- **Isolation levels by the anomaly they allow:** read committed (no dirty reads; non-repeatable reads possible), repeatable read / snapshot (consistent snapshot; write skew possible), serializable (as if one at a time). Know **lost update**, **write skew** (two doctors both go off call), and **phantoms**.
- **Mechanisms:** two-phase locking (shared/exclusive locks, deadlocks), MVCC (readers never block writers; versions + garbage collection), serializable snapshot isolation (optimistic, aborts on dangerous structures).
- **Optimistic vs pessimistic:** version column + compare-and-set when conflicts are rare; SELECT … FOR UPDATE or a lock when they are frequent or retries are costly. For inventory: atomic conditional update (UPDATE … SET stock = stock − 1 WHERE stock > 0).
- **Two-phase commit:** prepare then commit; blocks if the coordinator dies after prepare; needs durable logs on all parties. Used inside databases (Spanner runs 2PC over Paxos groups), avoided across services.
- **Sagas:** a sequence of local transactions with compensating actions; orchestration (central coordinator, easier to reason about) vs choreography (events, loose coupling). Not isolated: design for intermediate states (pending, reserved).
- **Transactional outbox + CDC:** write the business row and an outbox row in one local transaction; a relay publishes it. This solves the dual-write problem between a database and a queue. The consumer side dedupes (inbox table).
- **Idempotency:** client-supplied key, unique constraint, stored response; makes at-least-once delivery behave as exactly-once effect.
- **Distributed locks:** leases with TTL, and *fencing tokens* checked by the resource, because a paused client may believe it still holds the lock.
- **Time:** wall clocks drift; use logical clocks (Lamport, vector), hybrid logical clocks, or bounded uncertainty (Spanner TrueTime: commit wait).
- **Bar raiser:** reservation patterns with expiry (ticketing, hotel), double-entry ledgers for money (append-only, reconciliation), and choosing where strong consistency is truly required versus where eventual is fine.`,
  },
  messaging: {
    pre: ["networking", "transactions"],
    deep: `- **Queue vs log:** a queue (SQS, RabbitMQ) deletes on ack, competing consumers, per-message retries; a log (Kafka, Pub/Sub Lite) retains by time, consumers track offsets, replayable, ordered per partition, consumer groups for scaling.
- **Kafka mechanics to cite:** partition = ordered append-only log; key → partition; replication with a leader and in-sync replicas; acks=all + min.insync.replicas for durability; consumer group rebalancing; offset commit after processing gives at-least-once; idempotent producer + transactions give exactly-once *within Kafka*; log compaction keeps the latest value per key.
- **Ordering:** only within a partition. Need per-entity order → use the entity id as the key. Global order does not scale.
- **Failure handling:** retries with backoff, dead-letter queue after N attempts, poison-message detection, visibility timeout (SQS) longer than processing time, idempotent consumers.
- **Backpressure and lag:** monitor consumer lag; scale consumers up to the partition count; shed or sample when overloaded; bounded queues so failure is visible.
- **Patterns:** fan-out (pub/sub), work queue, event sourcing (state = fold over events) and CQRS (separate read models), outbox + CDC, delay / scheduled queues, priority queues, request–reply with correlation ids, claim check (store the blob, send a pointer).
- **Sizing:** partitions ≥ peak throughput / per-partition throughput, and ≥ max consumer parallelism; retention × write rate × replication = disk.
- **Schema evolution:** Avro/Protobuf with a registry; backward and forward compatibility; never reuse field numbers.
- **Bar raiser:** when *not* to use a queue (synchronous user-facing reads, need for an immediate answer), hot partitions from skewed keys, replaying history safely (idempotent side effects), and end-to-end exactly-once with an external sink.`,
  },
  "rate-limiting-concept": {
    pre: ["caching", "load-balancing", "design-ds"],
    deep: `- **Algorithms compared:** token bucket (rate r, burst b: allows bursts, the common default), leaky bucket (smooths to a constant outflow), fixed window (cheap; 2× burst at the boundary), sliding window log (exact, memory per request), sliding window counter (weighted blend of two windows: small error, tiny memory), GCRA (token bucket as a single timestamp).
- **Distributed enforcement:** central Redis with an atomic Lua script or INCR + EXPIRE; or local token buckets that sync quotas periodically (approximate, no hot path dependency); or per-node limit = global / N behind a balanced LB. State the accuracy-versus-latency trade.
- **Keys and tiers:** per user, API key, IP, endpoint, tenant; hierarchical limits (per second and per day); different costs per endpoint; global protective limits.
- **Client contract:** HTTP 429 with Retry-After and X-RateLimit-Remaining headers; clients back off with jitter.
- **Fail open or closed?** If the limiter store is down: fail open for availability (most APIs), fail closed for security-sensitive actions (login, OTP).
- **Related controls:** concurrency limits (in-flight requests), quotas (billing period), adaptive throttling and load shedding (server-driven, based on latency / CPU), circuit breakers (client-side), priority classes.
- **Race conditions:** read-then-write is not atomic; use atomic increments or scripts; clock skew across nodes matters for windowed schemes.
- **Bar raiser:** hot key on the limiter store, multi-region limits (per-region quotas versus global consistency), abuse evasion (rotating IPs → fingerprinting, CAPTCHAs), and rate limiting async work via queue consumers rather than at the door.`,
  },
  "storage-search": {
    pre: ["databases", "partitioning", "tries"],
    deep: `- **Object storage design:** metadata service (key → chunk locations) separate from data nodes; immutable objects; replication 3× or erasure coding (e.g. 6+3: ~1.5× overhead, survives 3 losses, slower repair); multipart and resumable uploads; pre-signed URLs so clients talk to storage directly; lifecycle tiers (hot → cold → archive).
- **Chunking and dedup:** fixed-size chunks are simple; content-defined chunking (rolling hash) survives insertions; content-addressed storage (hash as key) gives dedup and integrity; delta sync uploads only changed chunks.
- **Inverted index:** term → postings list (doc ids, positions, frequencies), built from analysed text (tokenise, lowercase, stem). Segments are immutable and merged in the background (LSM-like); near-real-time via refresh. Queries intersect postings (skip lists) and rank with TF-IDF / BM25, then re-rank.
- **Search cluster:** documents sharded by id; a query scatters to all shards and gathers the top-k; replicas for read scale. The index is a derived view fed by CDC or a queue from the source of truth.
- **Typeahead:** trie or sorted prefix ranges with precomputed top-k per prefix, served from memory, updated offline from logs; personalise and filter at the edge.
- **Geospatial indexes:** geohash (prefix = cell; query the cell plus 8 neighbours), quadtree (adaptive to density), S2 / H3 cells, R-tree. For moving objects, keep the latest position in memory keyed by cell with a TTL.
- **Probabilistic structures:** Bloom filter (membership, no false negatives; ~10 bits/element for 1% false positives), count-min sketch (frequency, overestimates), HyperLogLog (cardinality, ~1.5 KB for ~2% error), t-digest (percentiles).
- **Media pipeline:** upload → transcode into a bitrate ladder → segment → CDN with adaptive bitrate (HLS/DASH).
- **Bar raiser:** durability maths (eleven nines via replication across failure domains + scrubbing with checksums), consistency of listing versus reading, vector search (embeddings + ANN index such as HNSW) as the modern follow-up.`,
  },
  reliability: {
    pre: ["load-balancing", "replication", "messaging"],
    deep: `- **SLI / SLO / SLA / error budget:** measure (SLI), target (SLO), contract (SLA). Error budget = 1 − SLO; spend it on releases, freeze when it is gone.
- **Availability maths:** serial dependencies multiply (0.999 × 0.999 ≈ 0.998); redundant replicas give 1 − (1 − a)ⁿ. Reduce hard dependencies; make the rest degradable.
- **Resilience patterns:** timeouts everywhere, retries with backoff + jitter + budget, circuit breaker (closed → open → half-open), bulkheads (isolated pools per dependency), fallback / graceful degradation, hedged requests for tail latency, idempotency.
- **Tail latency:** with fan-out, the p99 of each backend becomes the typical user experience; mitigate with hedging, partial results, and tighter per-hop deadlines.
- **Failure domains:** process → host → rack → zone → region. Spread replicas; plan N+1 (or N+2) capacity; avoid correlated failures (same config push, same dependency).
- **Disaster recovery:** RPO (how much data can be lost) and RTO (how long to recover); backup + restore < pilot light < warm standby < active–active. Untested backups do not exist.
- **Safe change:** canary and staged rollouts, feature flags, automatic rollback on SLO burn, backward-compatible schema and API changes, config treated as code.
- **Observability:** metrics (RED: rate, errors, duration; USE: utilisation, saturation, errors), structured logs, distributed traces with propagated ids; alert on symptoms (SLO burn rate), not causes.
- **Operations culture:** blameless postmortems, runbooks, chaos / game days, load tests, capacity planning.
- **Bar raiser:** cascading-failure anatomy (overload → slow → retries → more overload) and how to break the loop (shed load, cap retries, restart gradually); cold-start and cache-warm problems after a full outage; dependency cycles that block recovery.`,
  },
  "google-papers": {
    pre: ["replication", "partitioning", "storage-search"],
    deep: `- **GFS → Colossus:** single master holding metadata in memory, 64 MB chunks, 3 replicas, append-heavy workloads, relaxed consistency. Colossus distributes the metadata and uses erasure coding.
- **MapReduce → Dataflow/Beam:** map, shuffle (sort by key), reduce; fault tolerance by re-executing tasks; stragglers handled by backup tasks. Dataflow unifies batch and streaming with event-time windows and watermarks.
- **Bigtable:** sparse sorted map (row, column family:qualifier, timestamp) → value; tablets split by row range; memtable + SSTables (LSM) on GFS; Chubby for the root and locks; single-row transactions only. Row-key design is the whole art: avoid monotonic keys, put the query prefix first.
- **Spanner:** globally distributed SQL; data split into Paxos groups; TrueTime gives bounded clock uncertainty and commit-wait yields external consistency; 2PC across groups; lock-free snapshot reads at a timestamp.
- **Chubby / ZooKeeper / etcd:** small consistent stores for locks, leases, leader election and configuration; coarse-grained locks with sequencers (fencing).
- **Dynamo (Amazon):** leaderless, consistent hashing with virtual nodes, sloppy quorum + hinted handoff, vector clocks, Merkle anti-entropy, gossip: the AP template behind Cassandra and Riak.
- **Borg → Kubernetes:** declarative desired state, bin-packing scheduler, priorities and preemption, health-driven restarts.
- **Others worth one sentence:** Dremel (columnar, tree-shaped aggregation → BigQuery), Kafka (partitioned replicated log), Raft (understandable consensus), Megastore / F1 (SQL on Bigtable/Spanner), Monarch (in-memory time series), Zanzibar (relationship-based global authorisation with consistent snapshots, "zookies"), Dapper (distributed tracing by sampling), Maglev (consistent-hashing L4 load balancer), MillWheel (streaming with exactly-once and low watermarks), Tail at Scale (hedged requests).
- **Bar raiser:** cite a paper only to justify a decision ("I would use a Bigtable-style store here because the access pattern is a key-range scan on a huge sparse table"), and know the trade each system made.`,
  },
  "stream-processing": {
    pre: ["messaging", "storage-search"],
  },
  security: {
    pre: ["networking", "reliability"],
  },
  "multi-region": {
    pre: ["replication", "reliability", "partitioning"],
  },

  // ───────────────────────── LLD ─────────────────────────
  "oop-solid": {
    deep: `- **SOLID as smells:** S: a class changes for two different reasons; O: adding a type means editing a switch; L: a subclass throws "not supported" or strengthens preconditions (Square/Rectangle, read-only list); I: clients implement methods they do not use; D: business logic constructs its own database or clock.
- **Composition over inheritance:** inherit only for true is-a with shared invariants; otherwise hold a collaborator behind an interface. Inheritance couples to implementation and explodes with combinations (decorator / strategy fix this).
- **Abstract class vs interface:** abstract class for shared state and partial implementation in one hierarchy; interface for a capability many unrelated types can have. Default to interfaces at boundaries.
- **Coupling and cohesion:** high cohesion inside a class, low coupling between classes. Law of Demeter (talk to friends, not friends of friends). Tell, don't ask.
- **Immutability and value objects:** Money, DateRange, Coordinates: equality by value, validated at construction, safe to share across threads. Entities have identity; value objects do not.
- **equals / hashCode contract:** equal objects must have equal hashes; never use mutable fields for hash keys.
- **Polymorphism over conditionals:** replace type switches with dispatch; but a plain enum + switch is fine when the set is closed and behaviour is tiny (do not over-engineer).
- **Dependency injection:** pass collaborators in (constructor) so tests can fake them; inject Clock, Random, id generators.
- **Other heuristics:** DRY (knowledge, not text), YAGNI, KISS, encapsulate what varies, program to an interface, fail fast, make illegal states unrepresentable.
- **Bar raiser:** articulate the *cost* of each abstraction (indirection, more classes) and justify it with a concrete anticipated change; discuss generics / variance (PECS: producer extends, consumer super) and when an anemic model versus a rich domain model fits.`,
  },
  "patterns-creational-structural": {
    pre: ["oop-solid"],
    deep: `- **Choosing a creational pattern:** many optional parameters or stepwise validation → Builder; choose a subtype from input → Factory (method or simple factory); families that must match → Abstract Factory; expensive to create and reusable → Object Pool; copy a configured exemplar → Prototype.
- **Singleton honestly:** global state that hides dependencies and hurts tests. If required: enum singleton (Java), initialisation-on-demand holder, or double-checked locking with volatile. Prefer one instance wired by dependency injection.
- **Structural look-alikes:** Adapter changes an interface to fit a client; Facade simplifies a subsystem; Decorator adds behaviour keeping the same interface (stackable); Proxy controls access keeping the same interface (lazy, caching, auth, remote); Bridge separates an abstraction from its implementation so both vary.
- **Composite:** treat a leaf and a group uniformly (file system, UI tree, org chart, expression tree). Decide where child management lives.
- **Flyweight:** share immutable intrinsic state (glyphs, chess piece types, map tiles); keep extrinsic state outside.
- **Related modern idioms:** dependency injection container, repository (collection-like persistence boundary), DTO / mapper, null object, registry, plugin loading, fluent interfaces.
- **Where they appear in real code:** Java I/O streams (decorator), JDBC drivers (bridge / abstract factory), logging appenders, HTTP middleware (chain + decorator), ORM lazy loading (proxy), thread pools (object pool).
- **Bar raiser:** name the pattern *after* describing the problem it solves, state the alternative you rejected, and avoid pattern stuffing: two classes and a map often beat an abstract factory.`,
  },
  "patterns-behavioral": {
    pre: ["oop-solid", "patterns-creational-structural"],
    deep: `- **Strategy vs State:** same structure, different intent. Strategy: the client picks an interchangeable algorithm (pricing, routing, eviction). State: the object changes its own behaviour as it transitions (vending machine, order lifecycle, elevator); states know the transitions.
- **State machine implementations:** enum + transition table (small, auditable), state classes (rich behaviour per state), or a table of (state, event) → (action, next). Always list illegal transitions and what happens.
- **Observer in practice:** synchronous callbacks vs async event bus; ordering and re-entrancy; unsubscribing to avoid leaks; an exception in one listener must not break others; backpressure for slow subscribers.
- **Command:** an object per action with execute / undo → undo/redo stacks, macro commands, queues, audit logs, retries. Pairs with Memento when undo needs a snapshot rather than an inverse.
- **Chain of responsibility:** handlers in sequence that process or pass on: middleware, validators, approval flows, log-level filters, ATM cash dispensing.
- **Template method vs Strategy:** inheritance with hook methods vs composition with injected steps. Prefer strategy unless the skeleton is truly fixed.
- **Visitor:** add operations over a stable class hierarchy without editing it (AST evaluation, pricing over cart items); double dispatch; painful when types change often.
- **Mediator:** a hub that coordinates colleagues (chat room, air traffic control, UI dialog) so they do not reference each other.
- **Iterator, Interpreter, Null Object, Specification** (composable predicates for filtering/search rules) round out the set.
- **Bar raiser:** rules engines (specification + strategy), plug-in registration instead of if-chains, event-driven designs with idempotent handlers, and showing how a new requirement lands as one new class.`,
  },
  concurrency: {
    pre: ["oop-solid"],
    deep: `- **Race vs data race:** a data race is unsynchronised access with at least one write; a race condition is any timing-dependent bug (check-then-act, read-modify-write) and can exist even with locks.
- **Deadlock needs four conditions (Coffman):** mutual exclusion, hold and wait, no preemption, circular wait. Break one: global lock ordering, tryLock with timeout, acquire all at once, or avoid locks. Also know livelock and starvation.
- **Toolbox and when:** mutex (exclusive), read–write lock (read-heavy; writer starvation), semaphore (N permits: pools, rate), condition variable (wait in a *while* loop: spurious wakeups), latch / barrier (coordination), atomics and CAS (counters, flags; ABA problem), concurrent collections (ConcurrentHashMap, blocking queues), immutable data, thread confinement / actor model, thread-local.
- **Memory visibility:** without volatile / synchronisation another thread may never see a write; happens-before edges come from locks, volatile, thread start/join.
- **Blocking queue (producer–consumer):** lock + two conditions (notFull, notEmpty), or two semaphores + mutex. This is the single most asked coding exercise in concurrency.
- **Thread pools:** size ≈ cores for CPU-bound, cores × (1 + wait/compute) for I/O-bound; bounded queue + rejection policy (caller-runs gives backpressure); never block pool threads on tasks in the same pool.
- **Granularity:** one big lock (simple, slow) → lock striping (per bucket) → lock-free. Optimise only with evidence; hold locks for the shortest time and never across I/O or callbacks.
- **Classic problems:** dining philosophers (ordering or waiter), readers–writers, print in order / FizzBuzz multithreaded (semaphores), bounded buffer, sleeping barber, thread-safe singleton and lazy init, rate limiter, concurrent LRU.
- **Async models:** event loop + non-blocking I/O, futures/promises, coroutines / virtual threads; cancellation and timeouts are part of the API.
- **Bar raiser:** identify the invariant each lock protects, compound actions (putIfAbsent, computeIfAbsent), idempotent retry under CAS failure, false sharing, and testing with stress + deterministic schedulers or injected clocks.`,
  },
  "lld-framework": {
    pre: ["patterns-behavioral", "concurrency"],
    deep: `- **Time budget (45 min):** clarify 3–5, entities and relationships 8–10, core APIs and flows 5, code the heart 15–20, extensions and concurrency 5. Say the plan aloud.
- **Finding classes:** nouns → entities, verbs → methods, adjectives / "types of" → enums or strategies, rules that change → policies behind interfaces. Then delete every class that has no behaviour or state you need now.
- **Layering:** entities (state + invariants) → services / managers (orchestration) → strategies (variation) → repositories (storage). Keep I/O at the edges.
- **Where does this method live?** With the data it needs (information expert). A God "Manager" owning all logic is the most common negative signal.
- **Extensibility test:** for each likely change (new vehicle type, new pricing rule, new notification channel) show it is one new class and zero edits to existing logic.
- **Errors and edge cases:** validate at the boundary, typed exceptions or result objects, define behaviour for invalid transitions, idempotent operations, no silent nulls.
- **Concurrency narrative:** identify shared mutable state, pick the smallest lock that protects the invariant, mention optimistic versioning for bookings, and where a queue would serialise work.
- **Testing narrative:** unit tests per strategy, state-transition tests, fake clock and repositories, concurrency stress tests.
- **Machine-coding variant (90 min, runnable):** working core first, in-memory storage, a driver / tests proving the flows, clean naming; resist frameworks.
- **Bar raiser:** persistence mapping (which entities are tables, what are the keys), scaling the design to a service (what becomes an API, what state moves to a database, which operations need idempotency), and trade-offs you consciously left out.`,
  },
  "lld-quality": {
    pre: ["oop-solid", "lld-framework"],
  },

  // ───────────────────────── Craft ─────────────────────────
  "google-loop": {
    deep: `- **How the decision is made:** each interviewer writes independent feedback with a rating and evidence; a hiring committee that never met you reads the packet. So *evidence on paper* is what counts: stated complexity, tests you ran, trade-offs you named.
- **Rating reality:** one weak round is survivable if others are strong and the weakness is not a pattern; mixed signals on coding fundamentals are not. Consistency across rounds matters more than one brilliant round.
- **L4 vs L5 in each round:** coding (L5: faster to optimal, cleaner code, drives the follow-up), system design (L5 round is weighted heavily and decides the level), behavioural (L5: scope across teams, influence without authority, ambiguity).
- **Down-levelling:** a solid L4 performance in an L5 loop commonly yields an L4 offer; aim for clear L5 signal in design and leadership stories.
- **Team match and timeline:** after the committee comes team matching and compensation; keep the recruiter informed of deadlines and competing offers.
- **What interviewers cannot record:** thoughts you did not say aloud. Narrate decisions, not keystrokes.
- **Follow-ups are the interview:** the first question is a warm-up; the constraints change (scale, streaming, memory, concurrency). Leave time and energy for them.
- **Practical prep:** code in a plain document without autocomplete, practise speaking while typing, prepare a 60–90 second self-introduction, and have real questions for each interviewer.
- **Bar raiser:** show the Googleyness signals naturally: curiosity, comfort with ambiguity, crediting others, changing your mind on evidence, and caring about the user.`,
  },
  "coding-round": {
    pre: ["google-loop", "complexity"],
    deep: `- **A 45-minute budget:** clarify and examples 5, approach discussion 5–8, coding 15–20, testing 5, follow-ups 5–10. If you are still designing at minute 15, code the best known approach.
- **Brute force is a deliverable:** state it with complexity in 30 seconds; it anchors correctness, gives a fallback and shows the optimisation path.
- **Optimisation prompts to ask yourself:** what is repeated work? Can I sort? Hash? Precompute prefix data? Is there monotonicity (two pointers, binary search, stack)? Can I process offline or in reverse? What does the constraint size imply?
- **When stuck:** work a concrete example by hand, simplify the problem (1D, smaller k, sorted input), list the candidate patterns aloud, and take hints gracefully: using a hint well is scored far better than silence.
- **Coding hygiene:** helper functions named for intent, early returns, meaningful names, no magic numbers, consistent style; write the skeleton first, then fill in helpers.
- **Dry run like a debugger:** pick a small non-trivial case, track variables in a table, then probe edges: empty, single, duplicates, negatives, overflow, max size, already sorted.
- **Complexity statement:** time and space, with the variables defined, including the recursion stack and output.
- **If you find a bug:** say what you expected, what happened and the fix. Calm self-correction is a positive signal.
- **Follow-up readiness:** scale (does not fit in memory, streaming), concurrency, API design for reuse, testing strategy, and the trade-off between your solution and an alternative.
- **Bar raiser:** propose the follow-up yourself ("if this were called millions of times I would precompute…"), and discuss how you would test it in production code.`,
  },
  biases: {
    pre: ["coding-round"],
    deep: `- **Testing effect:** retrieving an answer strengthens memory far more than re-reading it. Closed-book recall first, check second. This is why the flashcards say "say the answer out loud".
- **Spacing and interleaving:** spread reviews over days and mix topics. Blocked practice (ten sliding-window problems in a row) feels smooth but hides the hardest skill: recognising *which* pattern applies.
- **Fluency illusion:** reading a solution feels like understanding. Test: can you rewrite it tomorrow on a blank page and explain why each line exists?
- **Dunning–Kruger and impostor swings:** calibrate with data (prediction before each attempt versus outcome), not mood.
- **Availability bias:** the last pattern you studied feels like the answer to everything. Counter by listing two candidate approaches before coding.
- **Functional fixedness:** seeing a structure only in its usual role (a heap only for top-k, binary search only on arrays). Ask "what else could this tool do here?"
- **Stress effects:** working memory shrinks under pressure; externalise state by writing examples, invariants and a plan. Slow, deliberate speech buys thinking time.
- **Interviewer-side biases you can manage:** halo / horn effect (a strong first five minutes colours the rest), recency (finish with a crisp summary and complexity), confirmation (visibly testing your code counters an early doubt).
- **Deliberate practice loop:** attempt under time → compare with a strong solution → write the one-line lesson → schedule the re-attempt. The error log is the most valuable artefact you own.
- **Bar raiser:** do full mock loops, because stamina and context switching across four rounds are skills of their own.`,
  },
  behavioral: {
    pre: ["google-loop"],
    deep: `- **Answer shape:** 2–3 minutes. Situation and task in two sentences, most of the time on *your* actions and reasoning, a quantified result, and a learning you later applied. Say "I" for your contribution and credit the team for theirs.
- **Story bank matrix:** 6–8 stories × themes (conflict, failure, leadership, ambiguity, mentoring, deadline, feedback, biggest impact, disagreeing with a decision, working cross-team). Each story should serve 2–3 themes.
- **Level calibration:** L4 stories show ownership of a well-defined project; L5 stories show ambiguity resolved, a direction set, other people or teams moved, and a lasting improvement (process, tooling, design).
- **Failure and conflict answers:** real stakes, your actual mistake, no blaming, what you changed afterwards. For conflict: understand their goal, bring data, disagree and commit, preserve the relationship.
- **Hypotheticals ("what would you do if…"):** clarify, state principles, lay out options with trade-offs, decide, and say how you would check the outcome.
- **Follow-up drilling:** interviewers probe "why", "what was the alternative", "what would you do differently", "what did your manager think". Prepare the second and third layer of each story.
- **Numbers and specifics:** latency cut from x to y, incidents reduced, hours saved, adoption. Vague impact reads as low impact.
- **Red flags:** taking sole credit, blaming others, no reflection, hypothetical answers to "tell me about a time", rambling context.
- **Closing questions to ask:** how the team decides priorities, what a strong first six months looks like, the hardest technical problem ahead.
- **Bar raiser:** show judgement about *what not to do* (scope you cut, a risk you escalated early) and how you made others better.`,
  },
};

export const designNewTopics: { after: string; topic: Topic }[] = [
  {
    after: "messaging",
    topic: T("hld", "stream-processing", "Batch & stream processing", 2, 35, "Event time, windows, watermarks, exactly-once and the pipelines behind analytics, feeds and billing.", {
      signals: [
        "'Real-time dashboard', 'aggregate clicks per minute', 'trending now', 'fraud detection'",
        "Derived data must stay in sync with a source of truth (search index, cache, warehouse)",
        "Counts must be both fast and eventually exact (billing, ads)",
      ],
      lesson: `**Batch vs stream.** Batch processes bounded data with high throughput and simple retries (MapReduce, Spark, a nightly warehouse job). Streaming processes unbounded data with low latency (Flink, Dataflow/Beam, Kafka Streams). Most real systems need both views of the same events.

**Event time vs processing time.** Events arrive late and out of order (mobile clients, retries, partitions). Correct aggregates group by *event time*. A **watermark** is the pipeline's estimate that everything older than T has arrived; when it passes the end of a window the result is emitted. Late data is handled by allowed lateness (update the result), a side output, or a later batch correction.

**Windows.** Tumbling (fixed, non-overlapping), sliding / hopping (overlapping), session (per-key gap). State is kept per key and per window, so key cardinality × window count is your memory bill.

**Delivery guarantees.** Exactly-once *effect* = replayable source (log offsets) + checkpointed operator state + idempotent or transactional sink. Flink snapshots state with barriers; Kafka Streams uses transactions that commit output and offsets together.

**Architectures.** *Lambda*: a batch layer for accuracy plus a speed layer for freshness, merged when serving; two code paths to keep consistent. *Kappa*: only the stream path; reprocess by replaying the retained log through a new version of the job.

**Change data capture and derived data.** Tail the database log (Debezium, Spanner change streams) into a log; consumers maintain caches, search indexes, materialised views and the warehouse. This replaces fragile dual writes.

**Approximation at scale.** Count-min sketch and Space-Saving for heavy hitters, HyperLogLog for unique counts, t-digest for percentiles, sampling for dashboards.

**Hot keys and skew.** One key (a viral video) overloads one partition: pre-aggregate locally then combine, or salt the key and merge in a second stage.

**Storage for results.** Time-series or OLAP stores (Druid, Pinot, ClickHouse, BigQuery) with roll-ups by time granularity; raw events kept cheaply in object storage for reprocessing.

**Bar raiser.** Reconciliation: a periodic batch job recomputes from raw logs and corrects streaming totals; this is how ad billing gets both speed and accuracy. Also discuss backfills, schema evolution, and how you would detect a silently stuck pipeline (lag and watermark alerts).`,
      pitfalls: [
        "Aggregating by processing time and reporting wrong counts when events are late",
        "Claiming exactly-once without an idempotent or transactional sink",
        "Unbounded state: no window expiry or TTL per key",
        "Ignoring skew: one hot key stalling a partition",
        "No raw-event retention, so bugs cannot be fixed by replay",
      ],
      quiz: [
        Q("Mobile clients upload click events hours late. Hourly counts must be correct. What do you group by?", ["Arrival time at the server", "*Event time, with watermarks and allowed lateness", "Kafka offset", "Processing time with larger windows"], "Only event time reflects when the click happened; watermarks decide when to emit and lateness rules handle stragglers."),
        Q("What makes a streaming pipeline exactly-once end to end?", ["A faster broker", "At-most-once delivery", "*Replayable source, checkpointed state and an idempotent/transactional sink", "Larger batches"], "After a crash the job replays from the last checkpoint; the sink must not double-apply the replayed output."),
        Q("A search index must reflect database changes. Most robust design?", ["Write to both from the application", "Nightly full rebuild only", "*Change data capture from the DB log into a queue that updates the index", "Let the search engine query the DB"], "Dual writes diverge on partial failure; CDC makes the index a derived, replayable view."),
      ],
    }),
  },
  {
    after: "reliability",
    topic: T("hld", "security", "Security, auth & multi-tenancy", 2, 30, "Authentication, authorisation, encryption and abuse resistance: the questions an L5 raises unprompted.", {
      signals: [
        "Any design with user accounts, payments, private content or third-party API access",
        "'How do you make sure only the owner can see this?'",
        "Multiple customers (tenants) sharing one system",
      ],
      lesson: `**Authentication (who are you).** Passwords stored with a slow salted hash (Argon2, bcrypt); MFA; passkeys. After login the client holds either a **session id** (opaque, state on the server, easy to revoke) or a **JWT** (signed, self-contained, verified without a lookup, hard to revoke: keep access tokens short-lived and pair with a refresh token).

**Delegated access.** OAuth 2.0 authorisation-code flow with PKCE lets a user grant an app scoped access without sharing a password; OpenID Connect adds identity on top. Service-to-service calls use mTLS or short-lived signed service tokens.

**Authorisation (what may you do).** RBAC (roles), ABAC (attributes and policies), ReBAC (relationships, as in Google Zanzibar: "user U is a viewer of document D through folder F"). Enforce on the server for every request and every object: missing object-level checks are the most common real-world API vulnerability.

**Encryption.** In transit with TLS everywhere, including internal hops. At rest with envelope encryption: data keys encrypt data, a master key in a KMS/HSM encrypts data keys; rotate keys; never log secrets. End-to-end encryption means the server cannot read content (and cannot index or moderate it).

**Web and API basics.** Parameterised queries against injection; output encoding and CSP against XSS; SameSite cookies and CSRF tokens; input size limits; signed, expiring URLs for private blobs; secrets in a secret manager, not in code.

**Abuse and availability.** Rate limiting and quotas, bot detection and CAPTCHAs, account-takeover protection (credential-stuffing limits, device fingerprinting), DDoS absorption at the edge (anycast, CDN, WAF), fail closed on sensitive paths.

**Multi-tenancy.** Isolation models: shared tables with tenant id (cheap, needs discipline), schema or database per tenant, or dedicated cells for large customers. Per-tenant limits prevent noisy neighbours; per-tenant keys aid compliance.

**Privacy and compliance.** Data minimisation, retention and deletion (right to be forgotten propagating to backups and derived stores), audit logs, data residency.

**Bar raiser.** Do a short threat model: assets, entry points, trust boundaries, what an attacker with a stolen token or a compromised service could do, and the blast-radius limits (least privilege, short-lived credentials, segmentation).`,
      pitfalls: [
        "Checking authentication but not object-level authorisation (insecure direct object reference)",
        "Long-lived JWTs with no revocation story",
        "Storing passwords with a fast hash or reversible encryption",
        "Trusting the client for prices, roles or ownership",
        "Forgetting tenant scoping in one query path",
      ],
      quiz: [
        Q("Why keep JWT access tokens short-lived?", ["They are large", "*They cannot easily be revoked once issued", "They are slow to verify", "They expire in the database"], "Verification is stateless, so a stolen token is valid until expiry; short lifetimes plus refresh tokens bound the damage."),
        Q("A user changes /orders/123 to /orders/124 and sees someone else's order. What was missing?", ["TLS", "Rate limiting", "*Object-level authorisation", "Input encoding"], "The server authenticated the caller but never checked they own order 124."),
        Q("What does envelope encryption achieve?", ["Faster hashing", "*Master keys stay in the KMS while many data keys encrypt the data", "End-to-end encryption", "Compression"], "Only small data keys are sent to the KMS for wrapping, making rotation and access control practical."),
      ],
    }),
  },
  {
    after: "security",
    topic: T("hld", "multi-region", "Multi-region, conflict resolution & disaster recovery", 3, 30, "Serving users worldwide and surviving the loss of a region: topologies, conflicts, CRDTs and failover.", {
      signals: [
        "'Users are global', 'low latency everywhere', 'survive a region outage'",
        "Offline-capable or collaborative clients that edit concurrently",
        "Data-residency requirements",
      ],
      lesson: `**Why multi-region:** latency (get close to users), availability (a region can fail), and law (data must stay in a jurisdiction). Each pulls the design differently, so ask which one drives it.

**Topologies.**
- *Active–passive:* one region takes writes, others replicate asynchronously and serve reads; failover promotes a replica. Simple; RPO > 0 unless replication is synchronous.
- *Active–active with partitioned ownership:* each user or tenant has a home region that takes their writes. Conflicts are avoided rather than resolved. The usual best answer.
- *Active–active multi-leader:* any region accepts any write; conflicts must be resolved.
- *Consensus across regions (Spanner-style):* strong consistency with quorum latency on every write; place a quorum of replicas near the writers.

**Conflict resolution.** Last-write-wins (simple, loses data under clock skew), version vectors to detect concurrency and surface siblings, application-level merge (shopping cart union), or **CRDTs**: counters, sets, registers and sequences whose merge is commutative, associative and idempotent, so replicas converge in any delivery order. For text editing, operational transformation needs a central ordering server; CRDTs work peer-to-peer at the cost of metadata.

**Consistency by data class.** Classify data: global and strongly consistent (usernames, payments), regional and strongly consistent (a user's own data), global and eventually consistent (feeds, counters, catalogues). Only the first class pays the cross-region tax.

**Routing.** Geo-DNS or anycast to the nearest healthy region; a global directory maps user → home region; cross-region calls are asynchronous where possible.

**Disaster recovery.** Define RPO and RTO per data class. Options in rising cost: backup and restore, pilot light, warm standby, active–active. Failover must be automated *and rehearsed*; capacity in the surviving regions must absorb the load (N+1 regions).

**Failure modes.** Split brain between regions (use quorum or an external arbiter and fencing), replication lag exposing stale reads after failover, retry storms on the surviving region, and failback (resynchronising the recovered region) which is often harder than failover.

**Cells.** Partition the whole stack into independent cells per region or per tenant group to cap blast radius and allow gradual rollouts.

**Bar raiser.** Quantify: a synchronous cross-continent write adds ~100 ms; state which operations pay it and why. Discuss residency (EU users' data pinned to EU cells) and how global features such as search or social graphs work across cells.`,
      pitfalls: [
        "Declaring active–active without saying how write conflicts are handled",
        "Relying on wall-clock last-write-wins for data that must not be lost",
        "A standby region that has never taken production traffic",
        "Forgetting the surviving region needs spare capacity for failover load",
        "Making every write globally synchronous when only a few need it",
      ],
      quiz: [
        Q("Simplest way to run active–active without write conflicts?", ["Last-write-wins everywhere", "*Give each user a home region that owns their writes", "Synchronous replication of all data", "Vector clocks on every row"], "Partitioned ownership avoids conflicts by construction; only cross-user data needs more."),
        Q("Which property lets CRDT replicas converge regardless of delivery order?", ["Total ordering by a leader", "*Merge is commutative, associative and idempotent", "Synchronised clocks", "Two-phase commit"], "With those three properties, applying updates in any order, any number of times, yields the same state."),
        Q("RPO = 0 across regions requires…", ["Hourly backups", "Asynchronous replication", "*Synchronous (or quorum) replication before acknowledging", "A CDN"], "Zero data loss means the write must be durable in another region before the client hears success."),
      ],
    }),
  },
  {
    after: "lld-framework",
    topic: T("lld", "lld-quality", "Code quality: errors, testability & API evolution", 2, 25, "The engineering judgement graded alongside the class diagram: failure handling, tests, immutability and contracts.", {
      signals: [
        "Interviewer asks 'how would you test this?' or 'what if this call fails?'",
        "A library or SDK style question where other teams are the users",
        "Any follow-up about adding a feature without breaking callers",
      ],
      lesson: `**Design the contract first.** For each public method state inputs, outputs, errors, side effects, thread-safety and complexity. Small surface, hard to misuse: required arguments in the constructor, builders for optional ones, no boolean flag parameters (use enums or separate methods), return empty collections instead of null.

**Error handling.** Distinguish *expected* failures the caller can act on (insufficient balance, slot taken: explicit result types or checked/domain exceptions) from *bugs* (illegal argument, broken invariant: fail fast). Never swallow exceptions; add context when rethrowing; keep the object valid after a failure (strong exception safety for compound updates: validate, then mutate).

**Invariants and immutability.** State the invariants of each entity (a booked slot has exactly one owner; balances sum to zero) and enforce them inside the class. Prefer immutable value objects; make defensive copies of mutable inputs and outputs; make illegal states unrepresentable with types.

**Testability.** Inject dependencies (clock, id generator, random, repositories, notifier) so tests are deterministic. Use fakes for storage, stubs for queries and mocks sparingly for interactions. Test pyramid: many unit tests on strategies and state transitions, fewer integration tests on flows, a handful end to end. Mention property-style tests for invariants and stress tests for concurrency.

**Idempotency and retries.** Operations that may be retried (payment, booking, enqueue) accept a request id and return the original result on a repeat.

**API evolution.** Additive changes only; version when semantics change; deprecate before removing; keep serialised formats forward and backward compatible; hide implementation types behind interfaces so they can change.

**Resource management.** Deterministic cleanup (try-with-resources / RAII), bounded queues and caches, timeouts on anything that waits.

**Observability in code.** Structured logs with ids at boundaries, metrics on the core operations, no sensitive data in logs.

**Readable code tells.** Intent-revealing names, short functions at one level of abstraction, command–query separation, no duplicated knowledge, comments that explain *why*.

**Bar raiser.** Discuss the trade-off you chose not to make (YAGNI), performance characteristics of the public operations, and how the design would be migrated when requirements change.`,
      pitfalls: [
        "Returning null or magic values for failures the caller must handle",
        "Calling the system clock or random directly, making tests flaky",
        "Mutating state before validation, leaving objects half-updated on error",
        "Exposing internal mutable collections",
        "Boolean flag parameters that hide two different behaviours",
      ],
      quiz: [
        Q("Your cache needs TTL expiry. How do you make it unit-testable?", ["Sleep in the test", "*Inject a Clock and advance a fake one", "Use shorter TTLs", "Skip the test"], "A fake clock makes time deterministic and tests instant."),
        Q("book(slot) can legitimately fail because the slot is taken. Best signalling?", ["Return null", "Throw a generic RuntimeException", "*An explicit result or domain exception the caller must handle", "Log and continue"], "Expected failures are part of the contract; generic or silent failures hide them."),
        Q("Which change is backward compatible for existing callers?", ["Renaming a method", "Changing a return type", "*Adding a new optional parameter via an overload or builder", "Making a field required"], "Additive changes keep old callers compiling and behaving the same."),
      ],
    }),
  },
];
