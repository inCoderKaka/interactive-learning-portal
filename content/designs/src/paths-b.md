=== d-ticketing
--- prereqs
cache-patterns, isolation-anomalies, mvcc-2pl, sagas-outbox, distributed-locks, load-shedding
--- paths
- [deep] Two people click the same seat at the same moment :: Conditional update in a transaction on the event's shard; exactly one wins, the other gets 409.
  - Why not Redis locks for seats? :: The database's conditional update already gives atomicity and durability; extra locks add failure modes.
- [deep] A user holds seats and walks away :: Holds with expiry; expired holds count as available in queries; a reaper cleans up.
  - Payment completes just after the hold expired :: Confirm re-checks the hold; if gone, refund (saga compensation).
- [deep] 10 M people arrive for 50,000 seats :: Virtual waiting room with rate-controlled admission tokens; cached browsing; inventory protected.
  - Bots grab all the tickets :: CAPTCHAs/attestation in the waiting room, per-account and per-card limits, verified-fan presales.
- [failure] Payment succeeded but the confirm call timed out :: Idempotent confirm retried with the same key; payment idempotency prevents double charges.
- [variation] General admission (no seat numbers) :: Atomic counter decrement with a guard; split into sub-counters for contention.
- [variation] Airline booking with overbooking :: Inventory as counts per flight and class; deliberate overbooking from no-show predictions.

=== d-kv-store
--- prereqs
btree-lsm, quorums, multi-leader-leaderless, consistent-hashing, rebalancing
--- paths
- [deep] How do you choose which nodes store a key? :: Consistent hashing with virtual nodes; preference list of N distinct physical nodes across zones.
  - A node is added :: It takes virtual nodes from many others; streaming is throttled; ownership switches after copying.
- [deep] Does R + W > N make it strongly consistent? :: Overlap in normal operation only; sloppy quorums, concurrent writes and LWW clocks break it.
  - Two clients write the same key concurrently :: LWW (lossy), vector clocks with siblings, or CRDT values.
- [failure] A node is down for 10 minutes :: Hinted handoff to the next node; hints replayed on return; reads served by other replicas.
  - The node never comes back :: Re-replicate its ranges from remaining replicas.
- [deep] Replicas drifted apart :: Read repair plus Merkle-tree anti-entropy.
- [deep] Deletes come back :: Tombstones kept until every replica has seen them, removed in compaction.
- [variation] Strongly consistent config store (etcd) :: Raft per partition; linearizable reads via the leader with leases.
- [variation] Range scans by prefix :: Range partitioning on sorted keys with splits and merges; key design to avoid hotspots.

=== d-collab-docs
--- prereqs
realtime-push, clocks-ordering, distributed-locks, conflict-resolution
--- paths
- [deep] Alice and Bob type at the same position at the same time :: The document owner orders ops; the later one is transformed against the earlier; deterministic tie-breaks; all converge.
  - Why not lock the paragraph being edited? :: Locks feel terrible in real time and break offline editing.
- [deep] OT or CRDT? :: OT with a central owner (Google Docs); CRDTs for offline/peer-to-peer at the cost of metadata.
  - A user edits offline for two days :: Unsent ops based on an old revision get transformed over everything since; CRDTs handle this more naturally.
- [failure] The server owning a document crashes :: Lease expires; another loads snapshot + op log; clients reconnect and resend unacked ops (deduped).
- [deep] Open a document with a million edits quickly :: Periodic snapshots plus the ops after them.
- [deep] Permissions change while someone is editing :: Checks on session open and per op type; revocation cuts sessions promptly.
- [variation] 1,000 people watching a live doc :: Separate viewers from editors; broadcast servers fan out; presence sampled.
- [variation] Collaborative spreadsheet :: Ops on cells and ranges; formula recalculation; simpler conflicts per cell.

=== d-proximity
--- prereqs
db-indexes, cache-patterns, geo-indexes
--- paths
- [deep] Why not WHERE lat BETWEEN and lng BETWEEN? :: A two-column range scans huge areas; geo indexes turn 2D proximity into 1D cell lookups.
  - The user is at the edge of a geohash cell :: Always include neighbouring cells, then filter by exact distance.
- [deep] Manhattan has 50,000 places in 2 km, rural areas have 3 :: Adaptive cells (quadtree/S2 levels) and radius expansion; cap and rank.
- [deep] Geohash, quadtree or S2? :: Trade-offs of each: string prefixes vs adaptive density vs sphere-aware cells for range scans.
- [deep] How do you rank results? :: Distance plus rating with confidence, popularity, open-now and query relevance on a few hundred candidates.
- [deep] Does it need sharding? :: The index (~6 GB) fits in memory: replicate; shard by region only at much larger scale.
- [variation] Moving objects (friends, drivers) :: High write rates: in-memory grids updated in place, stale entries expire.
- [variation] Text plus location ("pizza near me") :: Search engine with geo filtering, or geo-filter first then text-rank.

=== d-job-scheduler
--- prereqs
distributed-locks, queue-vs-log, delivery-semantics, retries-dlq
--- paths
- [deep] Find jobs due now among 500 M :: Time-bucketed index sharded across schedulers; each reads its current bucket.
  - A scheduler crashes :: Lease on its shard expires; another takes over and catches up from the last committed bucket.
- [deep] Stop a job from running twice :: Lease-owned shards with fencing, unique run records per scheduled time, idempotent jobs downstream.
- [failure] A worker dies halfway through a job :: Run lease expires; reaper re-enqueues; idempotent or checkpointed jobs.
- [deep] 40% of jobs are scheduled at midnight :: Pre-enqueue early, jitter where allowed, pre-scale workers, per-tenant limits.
- [deep] Time zones and daylight saving :: Compute next runs in the job's zone; define behaviour for skipped/repeated hours.
- [variation] Workflows with dependencies (Airflow) :: DAG runs with per-task state machines; backfills.
- [variation] Delayed messages ("remind me in 3 days") :: A delay queue moving due messages to the main queue.

=== d-metrics
--- prereqs
stream-windows, kafka-internals, time-series, observability
--- paths
- [deep] 10 M points per second, cheaply :: Delta-of-delta timestamps and XOR values, 2-hour compressed blocks in object storage, rollups.
- [deep] A team adds user_id as a label :: Cardinality explosion: per-tenant series limits, reject the label, use logs/traces for detail.
- [deep] Dashboards over 90 days are slow :: Downsampled rollups, recording rules, query splitting and caching.
- [deep] p99 latency across 500 hosts :: Sum histogram buckets then compute the percentile; never average percentiles.
- [failure] How do you know the monitoring system works? :: Meta-monitoring, missing-data alerts, dead man's switch, independent watchdog.
  - An ingester dies :: Replicated writes to 2–3 ingesters; WAL replay on restart.
- [variation] Distributed tracing instead of metrics :: Sampled spans by trace ID, indexed by service/duration/errors.
- [variation] Log aggregation :: Label-indexed or full-text chunks in object storage; retention by cost.

=== d-ad-click
--- prereqs
olap-columnar, delivery-semantics, stream-windows, stateful-streams, lambda-kappa
--- paths
- [deep] No double counting when a processor restarts :: Checkpoint state + offsets together, idempotent/transactional sinks, click-ID dedupe.
- [deep] Clicks arrive two hours late :: Event-time windows with watermarks and allowed lateness; batch reconciliation for the rest.
  - Why both streaming and batch? :: Fast dashboards vs exact, audited billing; or a single replayable exactly-once path.
- [deep] One ad gets 30% of the traffic :: Pre-aggregate per worker or salt the key, then merge.
- [deep] Stop billing for bot clicks :: Real-time rules and offline models; bill from reconciled, filtered counts.
- [variation] Budget pacing for advertisers :: Approximate local spend counters synced with a central budget service; small overspend refunded.
- [variation] Unique users reached per ad :: HyperLogLog sketches per window, mergeable.

=== d-payment
--- prereqs
acid-wal, isolation-anomalies, sagas-outbox, delivery-semantics
--- paths
- [deep] The user double-clicks "Pay" :: Idempotency key: one payment; the second call returns the first result.
- [deep] The PSP call times out :: Never retry with a new key; retry the same request or query by reference; mark unknown, resolve via webhook/reconciliation.
  - Tell the user what? :: "Processing", not an error that invites a second purchase.
- [deep] How do you prove the books are right? :: Immutable double-entry ledger, balanced transactions, daily reconciliation with PSP and bank reports.
- [deep] A webhook and an API response update the same payment at once :: State machine with versioned compare-and-set transitions; idempotent handlers.
- [failure] The PSP is down :: Route new payments to a secondary PSP; never re-route in-flight ones; queue and retry.
- [variation] A wallet with internal transfers :: Atomic debit/credit in one ledger transaction with funds checks.
- [variation] Subscriptions :: Billing scheduler, stored tokens, dunning retries, proration.

=== d-trending
--- prereqs
hot-keys, stream-windows, sketches
--- paths
- [deep] Count 500 k events/s by hashtag :: Pre-aggregate per partition, merge, top-K per window.
  - Exact counts use too much memory :: Count-Min sketch + heap for heavy hitters with error bounds.
- [deep] "Last 5 minutes", updated every 30 s :: Sliding windows from bucketed sums.
- [deep] Trending vs merely popular :: Score growth over a baseline (current rate vs expected), with smoothing.
- [deep] Spam pushes a hashtag :: Dedupe per user, account reputation, anomaly filters.
- [variation] Per country and globally :: Regional pipelines; global merge of regional top-Ks (approximate).
- [variation] Game leaderboard :: Sorted sets per region; rank queries for any player.

=== d-fraud-detection
--- prereqs
cache-patterns, stream-windows, stateful-streams
--- paths
- [deep] Score within 100 ms in the authorisation path :: Precomputed features from a feature store, rules + model, strict latency budget.
  - "Transactions by this card in the last hour" must be fresh :: Streaming window aggregates written to the online feature store.
- [deep] Training and serving disagree :: One feature definition for online and offline; logged features for training.
- [failure] The model service is down :: Fail open with rules only (or fail closed above an amount); a business decision.
- [deep] Labels (chargebacks) arrive weeks later :: Delayed labels, careful evaluation windows, human review queues for fresh signal.
- [variation] Account takeover at login :: Device, location and behaviour signals; step-up MFA rather than block.
- [variation] Fake sign-ups :: Graph features, velocity per IP/device, review queues.

=== d-auth-sso
--- prereqs
http-tls, authn, encryption
--- paths
- [deep] How does "Sign in" across many apps work? :: OIDC authorisation code + PKCE; IdP session cookie; tokens per app.
  - A stolen authorisation code :: PKCE verifier makes it useless.
- [deep] Log a user out everywhere :: Revoke refresh tokens and sessions; short access-token lifetimes; denylist for emergencies.
- [deep] Rotate the token signing keys :: Publish new keys in JWKS before signing with them; keep old keys until tokens expire.
- [deep] Brute-force and credential stuffing :: Per-account/IP limits, breached-password checks, MFA, passkeys.
- [failure] The IdP is down :: Everything depends on it: multi-region, static stability, sessions keep working until expiry.
- [variation] Enterprise SSO into your product :: Per-tenant SAML/OIDC federation, SCIM provisioning, domain verification.

=== d-authz
--- prereqs
cache-patterns, consistency-models, authz
--- paths
- [deep] Check "can Bob view doc:plan?" in < 10 ms :: Relation tuples, namespace rewrite rules, cached graph walk.
  - Deeply nested groups :: Precomputed group membership (Leopard-style index).
- [deep] Bob is removed, then secret content is added :: The new enemy problem: zookies so checks are at least as fresh as the content.
- [deep] "Which documents can Bob see?" :: List/reverse lookups: precomputed ACL fields in indexes, or ask for accessible sets, then verify.
- [failure] A hot shared folder gets millions of checks :: Cache sub-results, replicate hot tuples, request coalescing.
- [variation] Simple RBAC for an admin tool :: Roles and permissions in a database; Zanzibar is overkill.
- [variation] Attribute-based rules (business hours, region) :: Policy engine evaluation combined with relationships.

=== d-global-cart
--- prereqs
isolation-anomalies, region-topologies, conflict-resolution
--- paths
- [deep] Carts writable in every region during a region failure :: Active-active carts as OR-set CRDTs, merged on sync.
  - An item removed in one region reappears :: OR-set semantics: removes delete observed tags only.
- [deep] Stock must never be oversold :: Home region per warehouse (or consensus) with reservations at checkout.
  - The warehouse's home region is down :: Pause sales for that stock or use pre-allocated per-region quotas.
- [deep] A hot SKU in a flash sale :: Per-region quotas from a central pool, refilled dynamically.
- [failure] A region is lost mid-checkout :: Idempotent checkout retried in another region; reservation saga compensates.
- [variation] Single-region company wanting DR only :: Active-passive with async replication and tested failover.

=== d-dr-ledger
--- prereqs
consensus-raft, region-topologies, disaster-recovery
--- paths
- [deep] Zero lost transactions on region loss :: Consensus across three regions (or sync replica + arbiter); commit after a majority.
  - What does it cost in latency? :: At least one round trip to the nearest quorum; place regions close enough.
- [deep] Failover in under five minutes :: Automatic leader election; fencing of the old primary; clients retry idempotently.
- [deep] A bad deploy corrupts balances :: Replication copies it: immutable entries, PITR, delayed replicas, invariant checks.
- [failure] Split brain between regions :: Majority quorum prevents two writers; minority side stops.
- [variation] RPO of one minute is acceptable :: Async warm standby; cheaper, faster writes; documented loss window.
- [variation] Data must stay in one country :: All replicas in-country with a witness in a third location there.
