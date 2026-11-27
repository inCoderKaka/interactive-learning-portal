=== d-message-queue
title: Distributed message queue (design Kafka / Pub/Sub)
topic: messaging
tier: 3
est: 45
prompt: Design a distributed messaging system like Kafka or Google Pub/Sub: producers publish to topics, many consumer groups read independently, messages are durable and ordered per key, at millions of messages per second.
--- words
- **Topic / partition**: a named stream, split into partitions (ordered logs) so it can grow across machines.
- **Offset**: a message's position in a partition; consumers remember the offset they've reached.
- **Broker**: a server storing partitions and serving reads and writes.
- **Consumer group**: a set of consumers sharing a topic's partitions; each group gets every message once.
- **Leader and followers (ISR)**: one replica of a partition takes writes; in-sync followers copy it.
- **Retention**: how long messages are kept (days), independent of whether they were read.
- **Acks**: how many replicas must have a message before the producer is told it's stored.
--- flow
1. **0–5**: publish/subscribe with topics, ordering per key, durability, replay, multiple independent consumers, at-least-once (exactly-once as stretch). Clarify throughput, retention, latency.
2. **5–10**: 2 M messages/s × 1 KB = 2 GB/s in; 3× replication; 7-day retention ≈ 3.6 PB.
3. **10–15**: append-only partition logs as segment files, offset index, metadata (controller), consumer offsets.
4. **15–25**: producers → partition leader (by key hash) → replicate to followers → ack; consumers pull by offset; group coordinator assigns partitions.
5. **25–40**: why a log (sequential I/O, zero-copy), replication and acks, leader election, consumer rebalancing, delivery semantics, retention/compaction.
6. **40–45**: failures, monitoring, scaling partitions.
--- req
**Functional**
- Create topics with N partitions; producers publish messages (optionally with a key).
- Consumers in groups read messages; each group sees every message; within a partition, order is preserved.
- Consumers can rewind (replay) by offset or time; messages retained for a configured time or size; compacted topics keep the latest value per key.

**Non-functional**
- **High throughput** (millions/s) and low latency (ms).
- **Durability**: acknowledged messages survive broker failures.
- **Horizontal scaling** of producers, brokers and consumers.
- **Availability** during broker failures, with clear trade-offs vs durability.
--- est
- **Ingress**: 2 M msgs/s × 1 KB = **2 GB/s**; with replication factor 3, brokers write 6 GB/s total.
- **Retention**: 2 GB/s × 86,400 × 7 days ≈ **1.2 PB**, ×3 replicas ≈ 3.6 PB → tiered storage (old segments in object storage) cuts broker disks.
- **Brokers**: each sustains maybe 200–500 MB/s of writes + reads → **~30–50 brokers**.
- **Partitions**: per-partition throughput ~10 MB/s → a 2 GB/s topic set needs ~200+ partitions.
--- api
- `produce(topic, key, value, acks=all) → (partition, offset)`.
- `consume(group, topics)` → poll batches; `commit(partition, offset)`.
- Admin: create topic (partitions, replication, retention), add partitions.

**Storage per partition**: segment files (e.g. 1 GB), each with an offset index and a time index; messages appended in batches; old segments deleted or uploaded to object storage.

**Metadata**: topics, partitions, leaders, in-sync replica sets, kept by a controller quorum (Raft: KRaft) instead of ZooKeeper.
--- hl
1. The producer hashes the key to a **partition**, sends batches to that partition's **leader broker**.
2. The leader appends to its log; **followers** fetch and append; when all **in-sync replicas** have it (acks=all), the leader advances the **high-water mark** and acks the producer.
3. Consumers in a **group** are assigned partitions by a **group coordinator**; each consumer pulls batches from leaders (or followers in the same zone) by offset and **commits** offsets periodically.
4. The **controller quorum** tracks broker liveness and elects new partition leaders from the ISR when a broker fails.
5. **Retention** deletes old segments by time/size; **compaction** keeps only the last value per key for changelog topics; **tiered storage** moves old segments to object storage.
--- deep
**1. Why a log is fast**: appends are sequential disk writes; reads are sequential and served from the OS page cache; **zero-copy** (sendfile) moves bytes from disk cache to the network without copying through the application; batching and compression amortise overhead. Messages aren't deleted on read, so many groups can read the same data.

**2. Replication and acks**: acks=all with `min.insync.replicas=2` means a write survives one broker loss; acks=1 is faster but loses data if the leader dies before followers copy. Only in-sync followers can become leader (no unclean election), trading availability for durability.

**3. Ordering**: guaranteed only within a partition; choose keys so related messages share a partition; more partitions = more parallelism but ordering only per key.

**4. Consumer groups and rebalancing**: adding a consumer reassigns partitions; cooperative/incremental rebalancing avoids stopping the whole group; consumers > partitions leaves some idle.

**5. Delivery semantics**: commit offsets after processing → at-least-once (duplicates possible after crashes); before → at-most-once; exactly-once within the system via idempotent producers (sequence numbers per producer) and transactions that write outputs and offsets atomically.

**6. Push vs pull**: pull lets consumers go at their own pace and batch; long polling keeps latency low. Google Pub/Sub adds push delivery and per-message acks (queue semantics) on top.
--- wrap
**Failures**: broker crash → controller elects new leaders from ISR in seconds; producers retry (idempotent producer prevents duplicates); consumer crash → partitions reassigned, processing resumes from the last committed offset; disk full → retention and tiered storage.

**Monitoring**: under-replicated partitions, consumer lag per group, request latency, ISR shrinks, disk usage, controller health.

**Scaling**: add brokers and move partitions (throttled), add partitions (changes key-to-partition mapping for new messages: plan it).
--- variants
Q: A work queue (each task processed once by any worker, with per-message acks and retries)
A: Queue semantics (RabbitMQ, SQS, Pub/Sub): messages are leased to a consumer, acked or redelivered after a visibility timeout, dead-lettered after N attempts; no long retention or replay.
Q: Delayed and scheduled messages
A: A delay index (time-bucketed) holding messages until due, then moved into the live topic; see the job scheduler.
Q: Global replication across regions
A: Cross-cluster mirroring (MirrorMaker-like) with offset translation; ordering per key per region; active-active needs conflict handling downstream.
--- steer
Q: Why can a log on disks handle millions of messages per second?
A: Sequential appends, page cache, zero-copy sends, batching and compression.
Q: A broker with partition leaders dies.
A: Controller elects new leaders from the in-sync replicas; acks=all + min ISR ensures acknowledged messages exist on survivors.
Q: Messages for one user must stay in order.
A: Key by user ID: same partition; order holds within a partition only.
Q: A consumer crashes after processing but before committing.
A: The batch is reprocessed: at-least-once; make processing idempotent or use transactions for exactly-once.
Q: Retention must be 90 days at 2 GB/s.
A: Tiered storage: recent segments on broker disks, older in object storage.
--- pitfalls
- Deleting messages when consumed (kills replay and multiple groups)
- Expecting global ordering across partitions
- acks=1 for data that must not be lost
- More consumers than partitions and expecting more throughput
- Ignoring consumer lag monitoring
--- level
- **L4**: topics, partitions, brokers, replication, consumer groups with offsets.
- **L5**: why the log is fast, ISR/acks/high-water mark, leader election, ordering by key, rebalancing, delivery semantics and exactly-once machinery, retention vs compaction vs tiering.
- **L6**: capacity planning and partition strategy, multi-region replication, operating upgrades and rebalances without downtime.
--- nodes
prod|Producers|client|0|160|Publish batches; key chooses the partition.
leader|Partition leaders (brokers)|service|220|100|Append to the log; serve reads; track the high-water mark.
follow|Follower replicas|service|220|260|Fetch from leaders; in-sync replicas.
ctrl|Controller quorum (Raft)|service|440|20|Metadata, broker liveness, leader election.
coord|Group coordinator|service|440|180|Assigns partitions to consumers; stores committed offsets.
cons|Consumer groups|worker|660|160|Pull by offset; commit progress.
tier|Tiered storage|store|440|320|Old segments in object storage.
--- edges
prod>leader|produce (acks=all)
leader~follow|replicate
ctrl~leader|leadership
cons>coord|join group
cons>leader|fetch by offset
leader~tier|old segments
--- refs
- article :: Kafka design documentation :: Apache Kafka :: https://kafka.apache.org/documentation/#design
- paper :: Kafka: a Distributed Messaging System for Log Processing (NetDB 2011) :: Kreps, Narkhede, Rao (LinkedIn) :: https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf

=== d-inventory
title: Inventory management system
topic: transactions
tier: 2
est: 45
prompt: Design the inventory system for a retailer with many warehouses and an online store: track stock per item per warehouse, reserve stock for orders, never oversell, and keep counts accurate as goods arrive, ship and get returned.
--- words
- **SKU**: one sellable item variant (a blue T-shirt, size M).
- **On hand / available / reserved**: units physically present; units free to sell; units promised to orders but not yet shipped.
- **Reservation**: temporarily setting stock aside for an order until it ships or is cancelled.
- **Event log (ledger) of stock movements**: every receipt, reservation, shipment and adjustment recorded as an entry; the count is the sum.
- **Oversell**: promising more units than exist.
- **Cycle count**: physically recounting a shelf to correct drift.
--- flow
1. **0–5**: stock per SKU per warehouse; reserve on order; release on cancel/timeout; decrement on ship; receive goods; returns; accurate availability on the website. Clarify orders/s, number of SKUs and warehouses.
2. **5–10**: 10 M SKUs × 100 warehouses; 2,000 orders/s at peak; flash sales on few SKUs.
3. **10–15**: stock movements ledger + current balances per (SKU, warehouse), reservations with expiry.
4. **15–25**: order service → inventory service (atomic reserve) → balances table sharded by SKU → events to fulfilment and search availability caches.
5. **25–40**: atomic reservation without overselling, hot SKUs, multi-warehouse allocation, consistency with physical reality, availability display.
6. **40–45**: reconciliation, failures.
--- req
**Functional**
- Track on-hand, reserved and available quantities per SKU per warehouse.
- Reserve on order placement; convert to shipped on fulfilment; release on cancel or timeout.
- Receive inbound stock; process returns; manual adjustments (damaged goods, counts).
- Show availability ("in stock", "only 3 left") on product pages; choose which warehouse fulfils an order.

**Non-functional**
- **No overselling** under concurrency (strong consistency per SKU-warehouse).
- **Fast availability reads** (cached, may be seconds stale).
- **Auditable**: every change traceable.
- **High availability** of reservations during peak sales.
--- est
- **Balances**: 10 M SKUs × 100 warehouses = 1 B potential rows, but sparse (~100 M real) × ~100 B ≈ 10 GB: easily sharded.
- **Writes**: 2,000 orders/s × ~3 lines = **6,000 reservations/s**, plus shipments and receipts similar.
- **Reads**: product page views ~100,000/s → availability cache.
- **Hot SKU**: a flash sale item may get 10,000 reservation attempts/s on one SKU.
--- api
- `POST /reservations {order_id, lines: [{sku, qty}], ship_to, idempotency_key}` → allocations per warehouse, or out-of-stock.
- `POST /reservations/{id}/commit` (shipped), `DELETE /reservations/{id}` (release).
- `POST /receipts`, `POST /adjustments`, `GET /availability?sku=&region=`.

**Data**
- `balances(sku, warehouse) → on_hand, reserved, version` (available = on_hand − reserved), sharded by SKU.
- `movements(id, sku, warehouse, delta_on_hand, delta_reserved, reason, ref, ts)` append-only.
- `reservations(id, order_id, lines, expires_at, status)`.
--- hl
1. On checkout, the **order service** calls the **inventory service** with an idempotency key.
2. **Allocation** picks warehouses (nearest with stock, minimise split shipments).
3. For each chosen (SKU, warehouse), an **atomic conditional update** in the balances store: `reserved += qty WHERE on_hand - reserved >= qty`, and a movement row in the same transaction; all lines in one transaction if they're on one shard, otherwise a saga with compensation.
4. Events (reserved, released, shipped) publish via an **outbox** to fulfilment, the **availability cache** (for product pages and search), and analytics.
5. Warehouse systems report receipts, picks and shipments; shipping converts reservations to on-hand decrements.
6. A reaper releases expired reservations (unpaid carts); nightly reconciliation with warehouse counts.
--- deep
**1. No oversell**: the conditional update makes the check and the change one atomic step per row; no read-then-write races. Version columns (optimistic) work too. Distributed locks are unnecessary when the database can do it.

**2. Hot SKUs**: one row taking 10,000 updates/s will bottleneck. Split stock into **buckets** (e.g. 10 sub-rows of 100 units each) and reserve from a random bucket, falling back to others; or put a queue/actor per hot SKU processing reservations serially in memory with durable logging; plus a waiting room for flash sales.

**3. Multi-line orders across shards**: lines for different SKUs may live on different shards: reserve each with its own transaction and compensate (release) if a later line fails: a saga with idempotent steps.

**4. Physical reality drifts**: theft, damage and mis-scans make the system's count wrong. Cycle counts generate adjustment movements; keep a small safety stock not shown as available for fast-moving items.

**5. Availability display**: page views read a cache updated from events; show "in stock" vs "only 3 left" from cached numbers; the real check happens at reservation.

**6. Ledger**: balances are a cache of the movement sums; the movement log enables audits and rebuilding balances if a bug corrupts them.
--- wrap
**Failures**: inventory service down → checkout can't reserve: queue orders and confirm later (risk of oversell) or fail fast: a business decision; event lag → product pages slightly stale; duplicate requests → idempotency keys.

**Monitoring**: reservation failures (out of stock vs errors), expired reservations, oversell incidents (should be zero), reconciliation differences, hot-row contention.

**At 10×**: shard more, bucket hot SKUs, regional inventory services per warehouse group.
--- variants
Q: Multi-region active-active retail (stock shared globally)
A: Home region per warehouse for writes, or quotas per region from a central pool; see the global cart design.
Q: Restaurant or grocery quick commerce (10-minute delivery)
A: Inventory per dark store, very fast-moving; picking accuracy and real-time stock from store devices; substitutions.
Q: Seats or tickets instead of goods
A: Each unit is distinct (seat numbers): see the ticketing design.
--- steer
Q: Two orders take the last unit at the same moment.
A: Atomic conditional update on available quantity; exactly one succeeds.
Q: A flash sale: 10,000 attempts per second on one SKU.
A: Split stock into buckets or a serial in-memory actor per hot SKU; waiting room upstream.
Q: An order has 5 items in different shards.
A: Per-line transactions with a saga: release earlier reservations if a later one fails; idempotent steps.
Q: The website shows in stock but reservation fails.
A: Availability is a cache; the reservation is the truth; show a clear message and alternatives.
Q: How do you know counts are right?
A: Movement ledger, reconciliation with warehouse systems, cycle counts creating adjustments.
--- pitfalls
- Read-then-write stock checks
- One hot row for a flash-sale SKU
- Distributed transactions across all shards for every order
- Serving product-page availability from the primary database
- No ledger of movements
--- level
- **L4**: balances table, reservations, conditional updates.
- **L5**: allocation across warehouses, sagas for multi-shard orders, hot-SKU strategies, outbox events and caches, ledger and reconciliation.
- **L6**: business policies (safety stock, oversell tolerance), multi-region inventory, integration with warehouse systems.
--- nodes
order|Order service|client|0|160|Calls reserve/commit/release with idempotency keys.
inv|Inventory service|service|200|160|Allocation and atomic reservations.
bal|Balances + movements (sharded)|db|420|80|Per SKU per warehouse; append-only movements.
res|Reservations|db|420|240|With expiry; reaper releases.
outbox|Outbox → event stream|queue|640|160|Reserved, released, shipped events.
avail|Availability cache|cache|640|20|Product pages and search read from here.
wms|Warehouse systems|ext|640|300|Receipts, picks, shipments, cycle counts.
--- edges
order>inv|reserve
inv>bal|conditional update
inv>res|reservation
bal~outbox|events
outbox~avail|update
wms>inv|receipts / shipments
outbox~wms|fulfil

=== d-server-upgrade
title: Upgrading 5,000 servers safely (rollout system)
topic: reliability
tier: 2
est: 45
prompt: You run a service on 5,000 servers across several regions. Design the system that upgrades all of them to a new version (binary and config) quickly but safely, without downtime, and stops automatically if the new version is bad.
--- words
- **Rollout**: gradually moving servers from the old version to the new one.
- **Canary**: the first small group of servers to get the new version, watched closely.
- **Wave (stage)**: one step of the rollout (1% → 10% → one region → everywhere).
- **Health check**: a test that says whether a server is working (process up, serving correctly).
- **Drain**: stopping new traffic to a server and letting in-flight requests finish before restarting it.
- **Rollback**: returning to the previous version.
- **Blast radius**: how much can break if the new version is bad.
--- flow
1. **0–5**: upgrade 5,000 servers with zero downtime, staged, automatic health evaluation and rollback, pausable, auditable; config and binary. Clarify: how long can it take? stateful servers?
2. **5–10**: keep ≥ 90% capacity: upgrade ≤ 10% at once; each server takes ~5 min to drain + restart + warm.
3. **10–15**: release record, rollout plan (waves), per-server state, health signals.
4. **15–25**: rollout controller → per-host agents (or orchestrator) → drain, swap version, start, health-check, undrain; analysis compares canary metrics to baseline; waves advance or roll back.
5. **25–40**: wave design and capacity, automated canary analysis, rollback speed, config changes, stuck/failed hosts, the controller itself failing.
6. **40–45**: monitoring, audit, emergency fixes.
--- req
**Functional**
- Define a release (binary/container image + config) and roll it out to a fleet in stages.
- For each server: drain traffic, install, start, verify health, return to service.
- Automatically compare new-version health with old; pause or roll back on regression.
- Manual pause/resume/abort; emergency fast rollout for urgent fixes.
- Full history: who deployed what, where, when.

**Non-functional**
- **No user-visible downtime**: capacity never drops below what traffic needs.
- **Safe**: a bad version reaches few servers and few users before being stopped.
- **Reasonably fast**: whole fleet within hours, not days.
- **The rollout system must not be a single point of failure** (and must be able to roll itself back).
--- est
- **Per-server upgrade**: drain 60 s + install 60 s + start/warm 120 s + verify 60 s ≈ **5 min**.
- **Parallelism**: keep ≥ 90% capacity → at most 500 servers at once (with headroom for traffic peaks, maybe 5% = 250).
- **Duration**: 5,000 / 250 × 5 min ≈ **100 min** of pure upgrade time, plus bake times between waves (e.g. 30–60 min each for 4–5 waves) → **~4–6 hours** end to end.
- **Canary signal**: 1% (50 servers) for 30 minutes gives enough requests to detect a 0.5% error-rate increase statistically on a busy service.
--- api
- `POST /releases {service, artifact_digest, config_version}` → `{release_id}`.
- `POST /rollouts {release_id, plan: waves[], max_unavailable, bake_time, analysis}` → `{rollout_id}`.
- `POST /rollouts/{id}/pause|resume|abort|rollback`; `GET /rollouts/{id}` (status per wave and host).

**Data**: releases (immutable, signed artifacts), rollout plans and state per host (old/new/in progress/failed), event history for audit; desired version per host group in a config store watched by agents.
--- hl
1. A release (artifact + config, signed, immutable) is created and its plan defined: waves like **1 canary zone (1%) → 10% one region → one full region → remaining regions**, each with bake time.
2. The **rollout controller** sets the desired version for the hosts in the current wave (respecting `max_unavailable` per cluster and per zone).
3. **Host agents** (or the orchestrator, e.g. Kubernetes) on each server: ask the load balancer to **drain**, stop, install, start, run **health checks**, then **undrain**.
4. The **analysis service** compares the canary hosts' metrics (errors, latency, crashes, resource use) against a **baseline** group of old-version hosts with the same traffic, using statistical tests.
5. Good result → advance to the next wave; bad result → **automatic rollback** (desired version back to old for affected hosts) and alert.
6. Everything is logged; the dashboard shows progress per region.
--- deep
**1. Waves and blast radius**: the first wave should be small and representative (one zone or one cell), later waves grow; never more than one region at a time so a bad release can't take everything down; respect per-zone capacity so a zone outage during rollout doesn't drop below needs.

**2. Automated canary analysis**: compare canary vs baseline (same version as production, deployed at the same time so both are "fresh") rather than canary vs history; use statistical significance on error rates and latency percentiles; also watch crash loops and logs. Google's SRE practice and tools like Spinnaker's Kayenta do this.

**3. Rollback must be fast and boring**: keep the previous version installed on the host (switch a symlink or container tag); rollback is the same mechanism as rollout, prioritised and faster (no bake). Database schema changes must be backward compatible so old binaries still work (expand/contract migrations).

**4. Config is code**: config changes go through the same staged rollout and analysis; many outages come from config pushes applied everywhere at once.

**5. Stuck and failing hosts**: hosts that fail to upgrade are marked failed and taken out of service, not blocking the wave (up to a threshold, then pause); flaky health checks are distinguished from real failures by retries.

**6. Safety of the controller**: run it replicated with its state in a consistent store; if it dies, the fleet stays in its current state (no half-actions); agents act only on signed desired state; a "big red button" pauses all rollouts globally.
--- wrap
**Monitoring**: rollout progress, hosts failed, canary verdicts and their false-positive rate, time to rollback, deploy frequency and change failure rate (DORA metrics).

**Emergency path**: a hotfix can use a faster plan (smaller bake times) but still with canary and automatic rollback; never skip straight to 100%.

**Audit**: who approved, artifact signatures, which hosts ran which version when (for incident analysis).
--- variants
Q: Stateful servers (databases, Kafka brokers)
A: Upgrade one replica at a time per partition/shard, waiting for it to rejoin and catch up (replication healthy) before the next; transfer leadership away before restarting a leader.
Q: Mobile app release (you can't roll back users' phones)
A: Staged rollout percentages in app stores, feature flags to disable features remotely, server-side compatibility with old app versions for months.
Q: Upgrade the operating system/kernel of all machines
A: Same waves but per machine reboot: drain all workloads (cluster scheduler reschedules them), respect disruption budgets, longer durations, firmware compatibility checks.
--- steer
Q: How many servers do you upgrade at once?
A: Bounded by capacity headroom (max unavailable per cluster and zone, e.g. 5–10%), plus waves for blast radius.
Q: How do you decide the new version is bad?
A: Automated canary analysis vs a fresh baseline with statistical tests on errors, latency, crashes.
Q: The new version corrupts data subtly.
A: Canaries won't always catch it: backward-compatible schemas, data validation checks, feature flags, and backups/PITR.
Q: Rollback takes an hour.
A: Keep previous version on hosts; rollback through the same pipeline without bake; practise it.
Q: The rollout controller crashes halfway.
A: Replicated controller with durable state; fleet stays in its current state; resume from recorded progress.
--- pitfalls
- Upgrading everything at once or by region with no canary
- Comparing canaries to historical metrics instead of a live baseline
- Config pushes outside the staged process
- Schema changes old binaries can't handle (making rollback impossible)
- No capacity accounting during rollout
--- level
- **L4**: rolling update with drain, health checks and rollback.
- **L5**: waves sized by capacity and blast radius, automated canary analysis vs baseline, fast rollback design, config as code, stateful service handling, controller resilience.
- **L6**: organisation-wide release policy, DORA metrics, emergency processes, interaction with feature flags and schema migrations.
--- nodes
eng|Engineer / CI|client|0|160|Creates signed releases and rollout plans.
ctrl|Rollout controller (replicated)|service|220|160|Advances waves, sets desired versions, triggers rollback.
state|Desired state store|db|220|20|Desired version per host group; agents watch it.
agents|Host agents (5,000 servers)|worker|460|160|Drain, install, start, health-check, undrain.
lb|Load balancers|edge|460|20|Drain and undrain hosts.
metrics|Metrics (canary vs baseline)|store|460|300|Errors, latency, crashes per version.
analysis|Canary analysis|service|680|240|Statistical comparison; pass/fail verdicts.
art|Artifact registry|store|680|80|Immutable, signed binaries and configs.
--- edges
eng>ctrl|start rollout
ctrl>state|desired version
state~agents|watch
agents>lb|drain / undrain
agents>art|fetch artifact
agents~metrics|report
metrics~analysis|compare
analysis>ctrl|verdict
--- refs
- book :: Site Reliability Engineering, ch. 8 (Release Engineering) :: Google :: https://sre.google/sre-book/release-engineering/
- book :: The Site Reliability Workbook, ch. 16 (Canarying Releases) :: Google :: https://sre.google/workbook/canarying-releases/
