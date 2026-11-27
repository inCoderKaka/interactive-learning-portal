=== d-google-maps
--- prereqs
cache-patterns, partition-schemes, stream-windows, geo-indexes
--- paths
- [deep] Why not Dijkstra on the whole road graph? :: Too many nodes; preprocessing (contraction hierarchies / partition-based) makes queries touch thousands of nodes.
  - Traffic changes every minute :: Metric-independent preprocessing with fast customisation (CRP-style) applies new weights in seconds.
- [deep] Make the ETA accurate for a 3-hour trip :: Time-dependent prediction: historical profiles at arrival time per segment, live data near the start, ML corrections.
- [deep] Where does traffic data come from? :: Anonymised pings map-matched to segments and aggregated.
  - Privacy of location pings :: Aggregate, trim trip ends, keep only segment speeds.
- [failure] The traffic pipeline is down :: Route on historical speeds; lower confidence.
- [deep] The driver leaves the route :: Re-route on deviation or faster alternatives beyond a threshold; avoid flip-flopping.
- [variation] Public transit :: Timetable graph routing (RAPTOR), real-time delay feeds, walking legs.
- [variation] Map tiles :: Vector tiles per zoom/coordinate from CDN, versioned invalidation.

=== d-gmail
--- prereqs
partition-schemes, object-storage, inverted-index
--- paths
- [deep] Shard 1.8 billion mailboxes :: By user: all of a user's data together; no cross-user transactions.
- [deep] Search 10 years of mail in under a second :: Per-user incremental inverted index, segments, recency first.
- [deep] When do you tell the sending server "accepted"? :: Only after durable, replicated storage.
  - The inbound pipeline is overloaded :: SMTP temporary failures (4xx) make senders retry.
- [deep] Keep spam out :: Reputation, SPF/DKIM/DMARC, content and link models, user feedback.
- [deep] The same attachment to 5 million users :: Content-addressed blobs with dedup and reference counts.
- [deep] Phones stay in sync cheaply :: Per-user history log with history IDs; push nudges.
- [variation] Shared team inboxes :: One mailbox, per-member read state, assignment.

=== d-google-photos
--- prereqs
cdn, batch-processing, object-storage, inverted-index
--- paths
- [deep] Upload 4 GB of videos over a flaky phone network :: Resumable chunked uploads direct to object storage; background queue; create item after completion.
  - The same photo is uploaded twice :: Hash before upload; skip existing.
- [deep] Scroll through 10 years of photos :: Metadata pages by date cursor, CDN thumbnails at fixed sizes, lazy loading.
- [deep] Search "dog on the beach" :: ML labels in a per-user index; embeddings with a per-user ANN index.
- [deep] Storage is too expensive :: Erasure coding, efficient formats, cold tiers, dedup.
- [deep] Delete a photo :: Soft delete, then all tiers and indexes; crypto-shredding for backups.
- [variation] End-to-end encrypted backup :: Thumbnails and indexes computed on device and stored encrypted.

=== d-news-shorts
--- prereqs
cache-patterns, cdn, stream-windows, stateful-streams, media-delivery
--- paths
- [deep] Pick 10 items out of 100 M in 150 ms :: Retrieval (embedding ANN and other sources) → ranking model → policy re-rank.
  - Scoring cost :: Batched accelerator serving; cheap first-stage model.
- [deep] The user skipped three cooking videos :: Session features updated in real time from client events; small batches.
- [deep] Breaking news in minutes :: Fast ingestion and embedding; a fresh-items source; freshness and authority boosts.
- [deep] Make swiping instant :: Client buffer and prefetch of first segments, CDN, low starting bitrate.
- [deep] Watch time promotes misleading content :: Multi-objective ranking, satisfaction signals, policy classifiers, long-term metrics.
- [deep] A brand-new user :: Popular-in-region and diverse exploration, personalised from the first swipes.
- [variation] YouTube home page (long videos) :: Same two stages; satisfaction and watch time; less per-swipe adaptation.

=== d-view-counter
--- prereqs
hot-keys, delivery-semantics, stream-windows, sketches
--- paths
- [deep] A video gets 50,000 views a second :: Aggregate per window in the stream and write deltas; sharded counters if writing directly; cache reads.
- [deep] One person refreshes 100 times :: Windowed dedupe by session/user/IP and validation before counting.
- [failure] The stream processor restarts :: Checkpointed state, idempotent delta writes keyed by window.
- [deep] Can a user like twice? :: Likes are per-user state; counters change only on state transitions.
- [deep] Creators are paid per view :: Nightly batch reconciliation produces billable numbers.
- [variation] "Watching now" on a live stream :: Heartbeat presence over a sliding window; HyperLogLog for unique viewers.

=== d-video-call
--- prereqs
tcp-udp, realtime-push, l4-l7, global-lb
--- paths
- [deep] Why not send video directly to everyone? :: Mesh upload grows with participants; an SFU receives once and forwards.
  - Why not mix everything on the server (MCU)? :: CPU-heavy and adds latency; SFUs scale better.
- [deep] A participant drops to 500 kbit/s :: Simulcast/SVC layers chosen per receiver; congestion control; audio first.
- [deep] Why UDP and not TCP? :: Late packets are useless; jitter buffers, FEC, selective NACK.
- [deep] Half in India, half in the US :: SFU per region, cascaded; each stream crosses the ocean once.
- [failure] The SFU hosting the meeting crashes :: Clients re-join another SFU via signalling within seconds.
- [deep] Corporate firewall blocks UDP :: TURN relays over TCP/TLS 443.
- [variation] 1:1 calls only :: Peer-to-peer first, TURN fallback, natural end-to-end encryption.
- [variation] Live captions :: Streaming speech recognition fed from the SFU; captions as data messages.

=== d-ad-serving
--- prereqs
cache-patterns, partition-schemes, stream-windows
--- paths
- [deep] You have 50 ms: where does the time go? :: In-memory sharded retrieval, cheap-then-heavy scoring, parallel fan-out with deadlines, partial results.
- [deep] How do you rank ads? :: Bid × predicted CTR × quality; second-price-style pricing; calibrated models.
- [deep] A $100 daily budget on a popular campaign :: Central pacing service with throttle rates; servers sample eligibility; small overspend refunded.
- [failure] The ad system is slow :: Return search results without ads; never block search.
- [deep] Paused campaigns must stop quickly :: Change stream to index updaters; minutes-level propagation.
- [variation] Frequency capping :: Low-latency per-user impression counters with TTL.
- [variation] Real-time bidding exchange :: Many external bidders within ~100 ms.

=== d-search-engine
--- prereqs
cache-patterns, partition-schemes, inverted-index, resilience-patterns
--- paths
- [deep] Shard by document or by term? :: Document sharding keeps queries local; only top-k lists move.
- [deep] 2,000 shards and one is slow :: Hedged requests, deadlines with partial results, balanced shards.
- [deep] Afford expensive ranking models :: Multi-phase ranking: cheap scoring on shards, heavy models on the top few hundred.
- [deep] News from five minutes ago :: A real-time index tier merged at query time.
- [deep] Cut cost per query :: Result caching, posting-list caching, tiered indexes, compression.
- [variation] Site search for an e-commerce company :: A single Elasticsearch-style cluster with facets and business signals.
- [variation] Semantic search :: ANN vector indexes combined with keyword retrieval and re-ranking.

=== d-calendar
--- prereqs
data-modeling, db-indexes, isolation-anomalies
--- paths
- [deep] Store "every weekday at 9:30 forever" :: One recurrence rule, expanded per requested window; exceptions stored separately.
  - "Edit this and following events" :: Split the series: end the old rule, start a new one.
- [deep] Meetings move an hour after daylight saving :: Store local time + IANA zone; expand in that zone.
- [deep] The organiser changes the time for 50 attendees :: Single source of truth with attendee pointers; change logs; iCalendar updates for external guests.
- [deep] Find a slot for 12 people :: Precomputed busy bitmaps per user; intersection; rank by working hours.
- [deep] 10 M reminders fire at 9:00 :: Time-bucketed reminder queue pre-loaded; scaled workers.
- [variation] Room booking :: Rooms as calendars with conditional writes to prevent double booking.

=== d-online-judge
--- prereqs
redis-memcached, queue-vs-log, retries-dlq
--- paths
- [deep] Run untrusted code safely :: MicroVM/gVisor sandboxes, no network, cgroups and seccomp limits, fresh environment per run.
- [deep] Contest start: 5,000 submissions per second :: Pre-scaled workers, separate contest queue, per-user caps, queue position feedback.
- [deep] The same code gets TLE once and passes once :: CPU-time measurement on dedicated cores, isolation, reruns for borderline cases.
- [deep] A live leaderboard for 100 k users :: Sorted sets with composite scores, cached pages, snapshots, freeze by snapshot.
- [failure] A worker dies while judging :: Lease-based ownership, re-queue, idempotent judging.
- [variation] Interactive code playground :: Long-lived sandboxes with a terminal over WebSocket and idle cleanup.

=== d-live-comments
--- prereqs
realtime-push, rl-algorithms, queue-vs-log, kafka-internals
--- paths
- [deep] One stream, 1 M viewers, 2,000 comments a second :: Edge servers subscribe once per stream; batched pushes; sampling to a readable rate.
- [deep] Why not poll a database? :: A million pollers crush it; push from a log via pub/sub.
- [deep] A spam bot floods the chat :: Slow mode and per-user limits, fast filters in the post path, async models with retraction.
- [failure] An edge server crashes :: Clients reconnect and backfill a few seconds from the log.
- [deep] Chat replay with the recording :: Comments stored with stream offsets, fetched in chunks.
- [variation] Live reactions (hearts) :: Aggregate counts per second; clients animate locally.

=== d-stock-exchange
--- prereqs
tcp-udp, acid-wal, consensus-raft
--- paths
- [deep] Why one thread per symbol group? :: Total order, no locks, low jitter, deterministic replay.
- [deep] Fault tolerance without slowing down :: Replicate the sequenced input log; standbys replay deterministically; promote on failure.
- [deep] Fairness :: A single sequencer and price-time priority; equal network paths for co-located participants.
- [deep] Market data to thousands of participants :: UDP multicast with sequence numbers, gap detection, retransmission, snapshots.
- [deep] The order book data structure :: Sorted price levels with FIFO queues plus an order-ID index for cancels.
- [variation] A retail trading app :: Broker concerns: buying power, routing to exchanges, quote fan-out to phones, ledger balances.

=== d-message-queue
--- prereqs
queue-vs-log, consensus-raft, kafka-internals, delivery-semantics
--- paths
- [deep] Why can a disk log do millions of messages a second? :: Sequential appends, page cache, zero-copy, batching and compression.
- [failure] A broker with partition leaders dies :: Leaders re-elected from in-sync replicas; acks=all with min ISR protects acknowledged messages.
- [deep] Messages for one user must stay in order :: Key by user; order holds within a partition only.
- [deep] A consumer crashes after processing, before committing :: At-least-once reprocessing; idempotent consumers or transactions for exactly-once.
- [deep] 90 days retention at 2 GB/s :: Tiered storage: recent segments on brokers, older in object storage.
- [variation] A work queue with per-message acks :: Leases, visibility timeouts, redelivery, dead letters.

=== d-inventory
--- prereqs
cache-patterns, hot-keys, isolation-anomalies, mvcc-2pl, sagas-outbox
--- paths
- [deep] Two orders take the last unit at once :: Atomic conditional update on available quantity.
- [deep] A flash sale: 10,000 attempts a second on one SKU :: Stock buckets or a serial in-memory actor per hot SKU; a waiting room upstream.
- [deep] An order's 5 items live on different shards :: Per-line transactions in a saga; release earlier reservations on failure.
- [deep] Product pages say in stock but reservation fails :: Availability is a cache; the reservation is the truth.
- [deep] Counts drift from reality :: Movement ledger, reconciliation, cycle counts as adjustments.
- [variation] Inventory per dark store (10-minute delivery) :: Very fast-moving stock, real-time picking updates, substitutions.

=== d-server-upgrade
--- prereqs
lb-health, slos, observability, safe-deploys
--- paths
- [deep] How many servers at once? :: Bounded by capacity headroom per cluster and zone; waves for blast radius.
- [deep] How do you decide the new version is bad? :: Automated canary analysis against a fresh baseline with statistical tests.
  - The bug only corrupts data subtly :: Backward-compatible schemas, validation checks, feature flags, backups.
- [deep] Rollback takes an hour :: Keep the previous version installed; roll back through the same pipeline without bake.
- [failure] The rollout controller crashes halfway :: Replicated controller with durable state; fleet stays put; resume.
- [variation] Stateful servers (database replicas) :: One replica per shard at a time, leadership transfer, wait for catch-up.
- [variation] A mobile app release :: Staged store rollout, feature flags, long server-side compatibility.
