=== d-url-shortener
--- prereqs
capacity-math, api-design, cache-patterns, nosql-families, partition-schemes, unique-ids
--- paths
- [deep] How do you generate unique codes across many servers? :: Compare hashing (collisions, same URL same code), a global counter (bottleneck) and range allocation or random codes with insert-if-absent; pick one with reasons.
  - The ID coordinator goes down :: Servers keep using their current blocks; alert before blocks run out; the coordinator is replicated (a DB sequence or etcd).
  - Codes must not be guessable :: Random codes in a large space, or scramble sequential IDs with a reversible cipher; watch 404 scanning.
    - Codes must be at most 5 characters :: 916 M codes: reuse expired codes after a long cool-off or push back on the requirement; guessing becomes easy, so abuse controls matter more.
- [deep] One link gets a million clicks a second :: Edge/CDN caching of the redirect, in-process caches, Redis replicas, request coalescing; the store barely notices.
  - Should the redirect be 301 or 302? :: 301 is cached by browsers (less load, no analytics, can't change); 302/307 keeps control and counts.
- [deep] Click analytics per link per day :: Events to a log, stream aggregation, an analytics store; never a write per click on the link row.
  - Unique visitors per day :: HyperLogLog sketches per link per day.
- [variation] Pastebin instead of URLs :: Content goes to object storage, metadata in the DB, CDN for reads, size limits, optional content-hash dedup.
- [variation] Branded domains for enterprise customers :: Key becomes (domain, code), routing by Host header, automated TLS certificates, per-customer quotas.
- [failure] A whole region goes down :: Links are immutable, so async cross-region replication is safe; route creates to a home region or accept brief 404s for brand-new links.
- [deep] Phishing links are being created :: Safe-browsing checks at creation and periodically, per-user rate limits, takedown with cache invalidation, warning interstitials.

=== d-rate-limiter
--- prereqs
api-gateway, redis-memcached, rl-algorithms, rl-distributed
--- paths
- [deep] Why not a simple counter per minute? :: Fixed windows allow 2× bursts at boundaries; show sliding window counter or token bucket and their trade-offs.
  - Clients burst legitimately :: Token bucket with a burst capacity separate from the average rate.
- [deep] Two gateways check the same key at the same moment :: Atomic check-and-update (Lua script or INCR-then-compare); never read-then-write.
  - The Redis round trip is too slow :: Token leasing or local buckets synced periodically; accuracy vs latency trade-off.
    - How much can it overshoot? :: Bound overshoot by lease size × number of gateways; pick lease size from the accuracy you need.
- [failure] Redis goes down :: Short timeouts; fail open with conservative local limits for protection limits, fail closed for security limits (logins).
- [variation] The limit must hold across five regions :: Home region per key, approximate global counters synced periodically, or split the limit per region.
- [variation] Limit by cost (LLM tokens, search complexity) not request count :: Weighted tokens: reserve an estimate, settle the difference afterwards.
- [variation] Billing quotas: exactly 1 M calls a month :: A durable, exact counter from the request log with idempotent processing; the fast limiter only approximates.

=== d-news-feed
--- prereqs
api-design, cache-patterns, redis-memcached, nosql-families, partition-schemes, hot-keys, queue-vs-log
--- paths
- [deep] Push or pull when someone posts? :: Fan-out on write makes reads one cache lookup but explodes for big accounts; fan-out on read is slow to read; the hybrid is standard.
  - A celebrity with 50 M followers posts :: Don't fan out; followers pull celebrity posts at read time and merge.
    - Where is the threshold? :: Measured by cost: follower count and posting rate; tuned and dynamic.
  - Most followers are inactive :: Skip fan-out to inactive users; rebuild their feed on return.
- [deep] How would you rank the feed? :: Candidate generation → features → model scoring → diversity re-rank within a latency budget, chronological fallback.
  - Ranking is slow today :: Time out and fall back to chronological; cache ranked pages per session.
- [deep] Paginate without duplicates as new posts arrive :: Cursor pagination on (score/time, post ID), or a per-session snapshot for ranked feeds.
- [deep] A post is deleted after fan-out :: Feeds hold IDs; hydration reads current state and drops deleted or blocked posts.
- [failure] A feed cache shard is lost :: Rebuild lazily by pulling followees' recent posts; slower first loads until warm.
- [variation] A "For You" feed from accounts you don't follow :: Candidates come from a recommender (embeddings, trending), not the follow graph; fan-out disappears.

=== d-chat
--- prereqs
realtime-push, nosql-families, partition-schemes, unique-ids, queue-vs-log, delivery-semantics
--- paths
- [deep] How do messages stay in order? :: Per-conversation sequence numbers from a single writer; clients sort by sequence and fetch gaps; never phone clocks.
  - Two people send at the same instant :: The conversation's owner orders them; both clients converge on the server order.
  - The phone reconnects with a gap :: Sync from the last sequence number it has.
- [deep] The ack is lost and the phone retries :: client_msg_id makes sends idempotent: the server returns the existing sequence.
  - The recipient receives it twice :: At-least-once delivery, dedupe by server message ID on the device.
- [deep] How do you know which server the recipient is on? :: A connection registry (user/device → gateway) with TTLs from heartbeats, or a pub/sub topic per user.
  - A gateway with 500,000 users crashes :: Clients reconnect with jittered backoff, re-register and resync; acks only after durable writes, so nothing is lost.
    - Reconnect storm takes down the next gateway :: Jitter, admission control, spare capacity, connection rate limits.
- [deep] The recipient is offline for a week :: Messages wait in the inbox; push notification via APNs/FCM; sync on open.
- [variation] Groups of 1,000 members :: Store once, fan out deliveries asynchronously, batch per gateway.
  - A broadcast channel with 1 M subscribers :: Switch to pull: members fetch when they open the channel.
- [deep] Online status and last seen :: In-memory presence with TTLs, push changes only to subscribers with the chat open, throttled.
- [variation] End-to-end encryption :: Keys on devices (Signal protocol), server relays ciphertext; no server search or moderation; per-device keys for multi-device.
- [failure] A region goes down :: Users reconnect to another region; messages replicated across regions asynchronously; per-region routing for local conversations.

=== d-youtube
--- prereqs
cdn, batch-processing, queue-vs-log, object-storage, media-delivery
--- paths
- [deep] Make a 2-hour 4K upload watchable quickly :: Split at keyframes, transcode chunks in parallel across renditions, publish low resolutions first, prioritise big channels.
  - A transcoding worker dies mid-task :: Idempotent tasks keyed by chunk and rendition, retried elsewhere.
  - Which codecs and why? :: AV1/VP9 save bandwidth but cost CPU; use them for popular videos where savings repay compute.
- [deep] The viewer's network drops from 20 to 2 Mbit/s :: Segments at every quality, manifest, adaptive bitrate per segment based on throughput and buffer.
- [deep] Where does the cost go, and how do you cut it? :: Egress and storage: ISP-embedded caches, efficient codecs, cold tiers and erasure coding for the long tail.
  - Most videos are rarely watched :: Long tail served from regional caches/origin; drop rarely used renditions, re-transcode on demand.
- [deep] A video goes viral in minutes :: Per-segment CDN caching with request coalescing, pre-warming, view counts via stream aggregation.
- [failure] An upload fails at 90% on a train :: Resumable chunked uploads directly to object storage.
- [variation] Live streaming :: Real-time ingest and transcode, 1–2 s segments, low-latency HLS/CMAF, chat as a separate system.
- [variation] Netflix (fixed catalogue) :: Encode each title once very well and pre-position in ISP appliances overnight.

=== d-drive
--- prereqs
data-modeling, isolation-anomalies, realtime-push, consistency-models, object-storage
--- paths
- [deep] A user edits one line of a 2 GB file :: Chunk + hash; upload only changed chunks; commit a new chunk list.
  - Inserting a byte at the start shifts every chunk :: Content-defined chunking keeps most chunk boundaries stable.
- [deep] Two laptops edit the same file offline :: Commit with parent version (compare-and-set); the loser gets a conflicted copy; never silently overwrite.
- [deep] How do other devices learn about changes fast? :: Per-namespace change journal + notification nudges over long-poll/WebSocket; devices pull from their cursor.
  - 200 M devices waiting for changes :: Notification servers holding connections; nudges only say "something changed"; occasional polling as a backstop.
- [deep] Never store the same file a million times :: Content-addressed chunks, dedup (privacy limits across users), reference counts and delayed garbage collection.
- [deep] When is an upload safely "saved"? :: Chunks durable in erasure-coded storage before the metadata commit; the commit is a replicated transaction.
- [variation] Shared folders between users :: Shared namespaces with their own journal mounted into members' trees; ACL checks at commit and download.
- [variation] Mobile app with little storage :: On-demand placeholders, thumbnails first, Wi-Fi-only uploads, OS background scheduling.

=== d-web-crawler
--- prereqs
dns, consistent-hashing, queue-vs-log, retries-dlq, sketches
--- paths
- [deep] How do you avoid overloading a small website? :: Per-host queues with next-allowed times, robots.txt and crawl-delay, each host owned by one node.
  - Priority and politeness together :: Mercator frontier: priority front queues feeding per-host back queues with a heap of next times.
- [deep] Have we seen this URL among 50 billion? :: Normalise, fingerprint, Bloom filter then a sharded seen store.
  - The same article on 200 sites :: Exact content hashes plus SimHash for near-duplicates.
- [deep] Which pages should be recrawled first? :: Importance × estimated change rate; conditional GETs make unchanged checks cheap.
- [failure] A site generates infinite URLs :: Depth and per-host page budgets, URL length limits, pattern detection.
- [failure] A crawler node crashes :: Frontier persisted/checkpointed; its hosts reassigned via the partitioning scheme.
- [variation] JavaScript-heavy sites :: Headless browser pool for important sites only, rendering scheduled after the raw fetch.
- [variation] Distribute it over 100 machines :: Partition by host hash; nodes forward discovered URLs to the owning node in batches.

=== d-typeahead
--- prereqs
cache-patterns, cdn, batch-processing, stream-windows
--- paths
- [deep] Why not LIKE 'ne%' on each keystroke? :: Too slow and unranked; precompute top-K per prefix offline and serve from memory.
  - How is top-K precomputed? :: Bottom-up merge of children's top-K in the trie, with time-decayed counts.
- [deep] Short prefixes like "a" are extremely hot :: Edge and client caching, replicated hot shards.
  - Shards are skewed by first letter :: Split hot ranges further or replicate them more.
- [deep] Breaking news must appear within minutes :: A streaming trend detector producing an overlay merged at request time.
  - The trending item is offensive :: Online safety checks for unreviewed trending items; blocklists and classifiers offline.
- [deep] How does the client avoid hammering the server? :: Debounce, cancel stale requests, cache per prefix, filter locally.
- [variation] Typo tolerance :: Bounded edit-distance search or precomputed misspelling maps.
- [variation] Personalised suggestions :: Merge the user's recent queries at request time, stored client-side or per user.

=== d-ride-hailing
--- prereqs
realtime-push, partition-schemes, queue-vs-log, distributed-locks, geo-indexes
--- paths
- [deep] 1.25 M location updates per second: where do they go? :: In-memory geo index sharded by city/cell, overwritten in place, no durable write per update.
  - Stale drivers on the map :: Expire entries without an update for ~30 s.
- [deep] Find drivers near the pickup :: Cells around the pickup with expanding rings, ranked by road-network ETA.
  - Straight-line distance misleads :: Routing service on the road graph with live traffic; cached cell-to-cell ETAs.
- [deep] Two riders get the same driver :: Atomic status change (available → offered) with a single owner or compare-and-set; offer timeouts.
  - The driver doesn't respond :: Offer times out, driver returns to available, next candidate is offered.
- [deep] How does surge pricing work? :: Supply and demand per cell per minute, multipliers, price locked at request time.
- [failure] A city's dispatch service crashes :: Stateless replicas; state rebuilt from driver updates and the rides DB; per-city isolation.
- [variation] Food delivery :: Three parties; courier dispatched timed to predicted prep; batching orders per courier.
- [variation] Shared rides :: Route insertion with detour limits for every rider.

=== d-notification
--- prereqs
queue-vs-log, delivery-semantics, retries-dlq, rl-algorithms
--- paths
- [deep] A service retries the notify call after a timeout :: Idempotency key returns the existing notification; per-device send records before calling providers.
  - The provider delivers twice anyway :: At-least-once is the realistic guarantee; dedupe what you control.
- [deep] A 100 M-user campaign runs while someone resets a password :: Separate priority queues and worker pools; reserved provider capacity for transactional traffic.
  - How do you send to 100 M users without melting? :: Stream the segment in batches, pace sends, respect provider limits.
- [failure] APNs starts returning errors :: Backoff with jitter, circuit breaker, queued retries, alerting; invalid tokens removed.
- [deep] Users get annoyed :: Preferences, per-user caps, collapsing similar notifications, quiet hours by time zone, opt-out monitoring.
- [variation] In-app notifications only :: Per-user inbox store + WebSocket/SSE, unread counts synced across devices.
- [variation] Daily digest emails :: Accumulate events per user and send scheduled digests by time zone.
