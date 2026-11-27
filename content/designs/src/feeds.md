=== d-news-feed
est: 45
--- words
- **Home feed (timeline)**: the scrolling list of recent posts from people you follow.
- **Fan-out on write (push)**: when someone posts, copy the post's ID into every follower's feed list right away.
- **Fan-out on read (pull)**: build the feed when the user opens the app, by fetching recent posts of everyone they follow.
- **Celebrity (hot user)**: an account with millions of followers, where pushing every post to all of them is too expensive.
- **Ranking**: ordering posts by predicted interest instead of by time.
- **Cursor pagination**: "give me the next page after this position", which stays correct while new posts arrive.
- **Hydration**: turning a list of post IDs into full posts (text, author name, counts) just before showing them.
--- flow
1. **0–5, requirements**: post, follow, see a feed of followed accounts (chronological or ranked), infinite scroll. Clarify: ranked? media? how fresh must the feed be (seconds)? celebrities?
2. **5–10, estimates**: 300 M daily users × ~10 feed loads ≈ 35 k feed reads/s (100 k peak); 100 M posts/day ≈ 1,200 posts/s; average 200 followers → 20 B feed insertions/day if pushing.
3. **10–15, API and data**: posts, follow graph, per-user feed lists.
4. **15–25, high level**: post service → fan-out workers → feed caches; feed service reads the cached list, hydrates, ranks.
5. **25–40, deep dives**: push vs pull and the hybrid for celebrities, ranking pipeline, pagination, deletes and privacy.
6. **40–45, wrap**: failures, monitoring (feed latency, freshness), 10× growth.
--- req
**Functional**
- Users create posts (text, photos), follow and unfollow others.
- The home feed shows posts from followed accounts, newest first or ranked, with infinite scroll.
- New posts appear in followers' feeds within seconds to a minute.
- Deleted posts and blocked users disappear from feeds.

**Non-functional**
- **Fast feed loads**: first page in under ~200 ms p99; this is the most frequent request.
- **Very read-heavy**: feeds are read far more often than posts are written.
- **Eventual consistency is fine**: a post appearing 10 seconds late is acceptable; a feed failing to load is not.
- **Skewed graph**: most users have a few hundred followers; a few have tens of millions.

Non-goals: ads, search, comments threads, notifications (mention as neighbouring systems).
--- est
- **Feed reads**: 300 M DAU × 10 = 3 B/day ≈ **35,000/s**, peak ~100,000/s.
- **Posts**: 100 M/day ≈ **1,200/s**.
- **Push fan-out cost**: 100 M posts × 200 followers = **20 B feed inserts/day ≈ 230,000/s**. Heavy but feasible for small IDs in a cache; one celebrity post with 50 M followers alone is 50 M inserts: that's the problem to solve.
- **Feed cache size**: keep the latest ~500 post IDs (8 bytes + score) per active user: 300 M × 500 × ~16 B ≈ **2.4 TB** in a sharded in-memory store (Redis): a few dozen large nodes.
- **Posts storage**: 100 M/day × 1 KB ≈ 100 GB/day of text metadata; media goes to object storage + CDN.

These say: precompute feeds for normal users (reads dominate), but not for celebrities.
--- api
- `POST /v1/posts {text, media_ids}` → `{post_id}`.
- `POST /v1/follow/{user_id}`, `DELETE /v1/follow/{user_id}`.
- `GET /v1/feed?cursor=&limit=20` → `{posts: [...], next_cursor}`. The cursor encodes (score or time, post_id) of the last item, so new posts don't shift pages.

**Data**
- `posts`: key `post_id` (a time-sortable ID like Snowflake), plus an index `author_id, created_at → post_id` for "posts by author".
- `follows`: two tables, `followers(user) → [follower]` and `following(user) → [followee]`, each sharded by its user (a graph store or wide-column table).
- `feed:{user}`: a capped sorted list of post IDs in Redis (score = time or rank), rebuilt from source if lost.
- Counts (likes, comments) in a separate counter service; media in object storage.
--- hl
**Write path**
1. The post service stores the post and publishes `post_created(author, post_id)` to a queue.
2. **Fan-out workers** read the author's follower list in pages and add the post ID to each follower's feed list (only for followers active in the last ~30 days; inactive users get their feed rebuilt when they return).
3. For **celebrity authors** (followers above a threshold, say 1 M), skip the fan-out.

**Read path**
1. The feed service reads the user's precomputed list (push part).
2. It also fetches recent posts from the **celebrities the user follows** (pull part) from a per-author recent-posts cache, and merges.
3. It **ranks** candidates (or sorts by time), **hydrates** the top 20 (post bodies, author info, counts, from caches) and filters deleted or blocked content.
4. Returns the page and a cursor.

This hybrid gives fast reads for everyone while keeping celebrity posts cheap.
--- deep
**1. Push vs pull, and the hybrid**: push makes reads one cache lookup but writes explode for big accounts and wasted work for inactive followers. Pull makes writes free but every feed load must query hundreds of followees and merge (slow, heavy). The hybrid (push for normal authors, pull for celebrities, skip inactive followers) is what Twitter and Instagram describe. Thresholds are tuned by measuring cost.

**2. Ranking**: a ranked feed is a pipeline: **candidate generation** (the merged list, maybe 500 posts) → **feature fetching** (author affinity, post age, engagement so far, media type) → **scoring** with a model → **re-ranking** for diversity (not five posts in a row from one author) → take the top N. Scoring must fit in ~50 ms, so features are precomputed and cached. Ranked results can be cached briefly per user so scrolling stays stable.

**3. Pagination**: offset pagination (page 3 = items 40–60) breaks when new posts arrive (duplicates and gaps). Use a cursor: "items with score below X, after post_id Y". For ranked feeds, snapshot the ranked list for the session.

**4. Deletes, edits, privacy**: feed lists hold IDs only, and hydration fetches current post state, so a deleted post simply fails hydration and is skipped; blocks and privacy changes are filtered at read time. Unfollow can lazily remove items at read.

**5. Hot spots**: a celebrity's recent-posts cache is read by millions: replicate it across many cache nodes and keep a local in-process copy for seconds.

**6. Cold start and rebuilds**: a returning inactive user or a lost cache shard: rebuild the feed by pulling recent posts of followees (slower first load, then cached).
--- wrap
**Failures**: feed cache shard lost → rebuild lazily from posts + follows (pull) while it refills; fan-out queue backlog → feeds are stale but load; ranking service down → fall back to chronological; hydration service slow → return fewer posts with timeouts.

**Monitoring**: feed latency p99, fan-out lag (time from post to appearing in feeds), cache hit rate, empty-feed rate, ranking timeouts.

**At 10×**: shard feed caches further, raise the celebrity threshold dynamically, move ranking to a dedicated serving tier, keep fan-out regional.
--- variants
Q: Strictly chronological feed with no ranking (Mastodon-like)
A: Drop the ranking pipeline; the merged list is sorted by time. Push/pull trade-offs stay the same; pagination uses time-based cursors.
Q: "For You" feed of posts from accounts you don't follow (TikTok, Google Discover)
A: The candidates come from a recommendation system (retrieval by embeddings, trending, topics) instead of the follow graph; fan-out disappears; the hard part becomes ranking, freshness and feedback loops. See the recommendation design.
Q: Facebook Groups or Reddit: posts in communities with comments and votes
A: Feeds are built from subscribed communities; ranking uses votes and time decay (hot score); communities can be huge, so pull is the default with caching of each community's hot list.
Q: Real-time "new posts" banner while the user is on the feed
A: Push a lightweight notification over a WebSocket or poll a cheap endpoint ("3 new posts"), and only load them when tapped, so the visible list doesn't jump.
--- steer
Q: A celebrity with 50 M followers posts.
A: Don't fan out; followers pull celebrity posts at read time and merge with their pushed feed.
Q: Why not just compute the feed on every request?
A: 35 k–100 k feed loads/s × hundreds of followees each would mean millions of queries per second and slow merges; precompute for the common case.
Q: How do you paginate without duplicates as new posts arrive?
A: Cursor pagination keyed on (score/time, post ID), or a per-session snapshot for ranked feeds.
Q: A post is deleted after being fanned out.
A: Feeds store IDs; hydration reads the current state and drops deleted posts; optionally clean lists lazily.
Q: How would you add ranking?
A: Candidate generation → features → model scoring → diversity re-rank, within a latency budget, with chronological fallback.
--- pitfalls
- Choosing pure push and ignoring celebrities, or pure pull and ignoring read latency
- Fanning out to inactive users
- Offset pagination
- Storing full post bodies in every feed list
- No fallback when ranking is slow
--- level
- **L4**: push or pull with a cache, follows and posts tables, basic pagination.
- **L5**: hybrid fan-out with numbers, inactive-user optimisation, ranking pipeline with latency budget, cursor pagination, deletes via hydration, failure fallbacks.
- **L6**: cost and capacity trade-offs of thresholds, experimentation and feedback loops in ranking, multi-region feed generation.

=== d-drive
est: 45
--- words
- **Sync client**: the app on your laptop that watches a folder and keeps it identical to the cloud copy.
- **Chunk (block)**: a piece of a file (say 4 MB); files are uploaded and stored as chunks.
- **Content hash**: a fingerprint of a chunk's bytes (SHA-256); identical chunks have identical hashes.
- **Deduplication**: storing identical chunks only once, even across files or users.
- **Delta sync**: uploading only the chunks that changed instead of the whole file.
- **Metadata**: the file tree (names, folders, versions, which chunks make each file), kept in a database.
- **Change journal**: an ordered log of every change to a user's files, which clients read to catch up.
- **Conflict**: two devices changed the same file while out of touch.
--- flow
1. **0–5, requirements**: upload/download, sync across devices, sharing, version history, offline edits. Clarify file sizes (up to 50 GB?) and how conflicts should appear.
2. **5–10, estimates**: 500 M users, 1 B files changed/day, average 1 MB per change → ~1 PB/day of uploads before dedup.
3. **10–15, API and data**: chunk upload API, metadata (files, versions, chunk lists), per-user change journal.
4. **15–25, high level**: client chunks and hashes → uploads only missing chunks to block storage → commits a new file version in metadata → change notification to other devices → they download missing chunks.
5. **25–40, deep dives**: chunking and dedup, consistency of metadata commits, notifications at scale, conflicts, sharing permissions.
6. **40–45, wrap**: failures, monitoring, cost (storage tiers, dedup).
--- req
**Functional**
- Upload and download files of any size (up to tens of GB), with resumable transfers.
- Automatic sync of a folder across a user's devices; offline edits sync when back online.
- Version history (restore older versions, recover deleted files for 30 days).
- Share files and folders with other users (view or edit).

**Non-functional**
- **Never lose data**: durability of eleven nines for stored bytes; a confirmed save must survive anything.
- **Correct sync**: every device converges to the same tree; conflicts are surfaced, never silently overwritten.
- **Efficient**: changing one line of a 1 GB file must not upload 1 GB.
- **Fast enough**: small file changes appear on other devices within seconds.

Non-goals: real-time co-editing inside documents (that's Google Docs), full-text search (mention as an add-on).
--- est
- **Users**: 500 M, ~100 M active daily, ~2 devices each.
- **Changes**: ~1 B file changes/day ≈ **12,000/s** metadata commits; average changed bytes ~1 MB → ~1 PB/day raw upload, much less after delta sync and dedup (often 50–70% saved).
- **Stored data**: 500 M users × average 10 GB = **5 EB** logical; dedup and compression lower it, erasure coding (~1.5×) raises it: exabyte-scale block storage (like Dropbox's Magic Pocket or Google's Colossus).
- **Metadata**: ~100 B files × ~500 bytes ≈ 50 TB plus chunk lists: a sharded transactional database.
- **Connections**: 200 M devices holding a notification connection (long poll or push).

These say: bytes and metadata are separate systems; metadata needs transactions; storage needs dedup and cheap durability.
--- api
- `POST /blocks/check {hashes}` → which hashes the server doesn't already have.
- `PUT /blocks/{hash}` (chunk upload, directly to block storage via a signed URL; resumable per chunk).
- `POST /files/commit {path or file_id, parent_version, chunk_hashes[], size}` → new version, or `409 conflict` if `parent_version` is not the latest.
- `GET /changes?cursor=` → list of changes after the cursor (long-poll or with a push nudge).
- `GET /files/{id}/versions`, `POST /files/{id}/restore {version}`.
- `POST /share {file_id, user, role}`.

**Data**
- `files(file_id, owner/namespace, parent_id, name, latest_version, is_deleted)`.
- `versions(file_id, version, chunk_hashes[], size, created_by_device, created_at)`.
- `blocks(hash → storage location, refcount)` in the block store's index.
- `journal(namespace_id, seq) → change` (one ordered log per user/shared folder), the source for sync.
- ACLs per file or folder (inherited), for sharing.
--- hl
1. **Detect**: the client watches the folder; on change, it splits the file into chunks (fixed 4 MB, or content-defined chunking for better delta sync) and hashes each.
2. **Upload only what's new**: it asks which hashes the server lacks and uploads those chunks straight to **block storage** (resumable, parallel).
3. **Commit**: it commits the new version to the **metadata service** with the list of chunk hashes and the version it started from. The metadata service checks the parent version (optimistic concurrency), writes the version and appends to the user's **change journal** in one transaction.
4. **Notify**: a **notification service** nudges the user's other devices (open long-poll/WebSocket, or mobile push).
5. **Download**: those devices read the journal from their cursor, see the new version, fetch only chunks they don't already have, and rebuild the file locally.

Components: sync clients, API/metadata service (sharded by namespace), block storage (hash-addressed, erasure-coded), notification service, sharing/ACL service.
--- deep
**1. Chunking and dedup**: fixed-size chunks are simple, but inserting one byte at the start shifts every chunk boundary and defeats delta sync. **Content-defined chunking** (rolling hash picks boundaries where the content matches a pattern) keeps most chunks unchanged after insertions. Dedup across users saves a lot (same installers, attachments) but needs care: hashes of popular files can leak whether someone has a file, so many services dedupe only within one user or company.

**2. Metadata consistency**: two devices committing simultaneously must not overwrite each other. The commit includes `parent_version`; the database does compare-and-set. The loser gets a conflict and creates a "conflicted copy" (Dropbox style) rather than losing either edit. Commits and journal appends happen in one transaction so a device never sees a version without its journal entry.

**3. Garbage collection**: chunks are shared across versions and users. Track reference counts (or mark-and-sweep from live versions) and delete unreferenced chunks after a delay, since versions are kept 30 days for recovery.

**4. Notifications at scale**: hundreds of millions of devices waiting for changes: long-poll or WebSocket connections to notification servers that only say "something changed in namespace X"; devices then fetch from the journal. Lost notifications are harmless because clients also poll occasionally.

**5. Sharing**: shared folders are separate **namespaces** with their own journal, mounted into each member's tree; permission checks happen at commit and download time (a Zanzibar-like ACL service for big systems).

**6. Large files and resumability**: per-chunk uploads with retries; the file only appears after the commit, so partial uploads are never visible.
--- wrap
**Failures**: block storage is erasure-coded across zones (lose a zone, still readable). Metadata DB is replicated with automatic failover; commits are transactional, so a crash mid-commit leaves either the old or the new version. Notification server crash → clients reconnect and catch up from their journal cursor. Client crash mid-upload → resume from uploaded chunks.

**Monitoring**: sync latency (change on device A → visible on device B), commit conflict rate, upload/download error rate, dedup ratio, storage growth, notification fan-out lag.

**Cost**: dedup, compression, cold storage tiers for old versions, erasure coding instead of replication.
--- variants
Q: Google Photos instead (mostly upload, view on any device, search by content)
A: Uploads are one-way and files immutable, so sync conflicts vanish. The hard parts become thumbnails and multiple resolutions, ML processing (faces, objects) for search, sharing albums, and storage cost (compression, deduping identical photos). See the Photos design.
Q: Collaborative editing of the same document by several people at once
A: File-level sync with conflicted copies isn't enough: use a document model with operational transformation or CRDTs (Google Docs design).
Q: Enterprise version with admin controls and audit
A: Add organisation namespaces, retention and legal-hold policies (no deletion), audit logs of every access, data residency per organisation, customer-managed encryption keys.
Q: Mobile app with limited bandwidth and storage
A: On-demand files (placeholders until opened), thumbnails first, uploads only on Wi-Fi by default, background sync scheduled by the OS.
--- steer
Q: A user edits one line in a 2 GB file.
A: Chunk + hash; content-defined chunking keeps unchanged chunks; upload only the changed chunk(s) and commit a new chunk list.
Q: Two laptops edit the same file offline, then reconnect.
A: Commit with parent version; the second commit conflicts; keep both (conflicted copy) and tell the user; never silently overwrite.
Q: How do other devices find out about changes quickly?
A: Per-namespace change journal + notification nudges over long-poll/WebSocket; devices pull changes from their cursor.
Q: How do you avoid storing the same file a million times?
A: Content-addressed chunks with dedup (consider privacy limits on cross-user dedup) and reference counting for deletion.
Q: How is a confirmed upload guaranteed durable?
A: Chunks are written to erasure-coded storage before the commit; the commit is a replicated transaction; only then the client is told "saved".
--- pitfalls
- Uploading whole files on every change
- Keeping file bytes in the metadata database
- Last-writer-wins on file conflicts
- Making the file visible before all chunks are stored
- Pushing full change data in notifications instead of a nudge + journal
--- level
- **L4**: chunked uploads to object storage, a metadata DB, some notion of sync and versions.
- **L5**: hash-based delta sync and dedup, optimistic concurrency with conflicted copies, change journal with cursors, notifications design, garbage collection of chunks, numbers.
- **L6**: content-defined chunking, privacy of dedup, exabyte storage economics (erasure coding, tiers), shared namespaces and permissions at scale.

=== d-rate-limiter
est: 45
--- words
- **Rate limit**: a rule such as "at most 100 requests per minute per API key".
- **Token bucket**: each key has a bucket that refills at a steady rate; every request takes a token; an empty bucket means "slow down".
- **Sliding window**: counting requests over the last N seconds at every moment, not in fixed clock windows.
- **429 Too Many Requests**: the HTTP response telling a client it has been limited, usually with a `Retry-After` header.
- **Atomic operation**: a check-and-update that runs as one step, so two servers can't both take the last token.
- **Fail open / fail closed**: when the limiter itself is broken, either allow all requests (open) or reject them (closed).
--- flow
1. **0–5, requirements**: limit by API key/user/IP per endpoint, configurable rules, accurate enough, tiny latency. Clarify: hard or soft limits? per region or global? what if the limiter fails?
2. **5–10, estimates**: 1 M requests/s at the gateways, 100 M distinct keys/day; state is a few numbers per key.
3. **10–15, API and data**: `allow(key, rule)` decision; rules config; counters in a shared store.
4. **15–25, high level**: gateway middleware → local fast path + shared counter store (Redis) → allow or 429.
5. **25–40, deep dives**: algorithm choice, atomicity, latency (local buckets and leases), multi-region, failure policy.
6. **40–45, wrap**: monitoring, abuse, and weighted costs.
--- req
**Functional**
- Limit requests per key (API key, user ID, IP) per rule (endpoint, plan tier), e.g. "free tier: 60/min, burst 10".
- Return `429` with `Retry-After` and remaining-quota headers.
- Rules change without redeploying (config service).
- Optional: daily/monthly quotas for billing (durable, exact).

**Non-functional**
- **Low overhead**: under ~1–2 ms added per request; it sits on every request.
- **Accurate enough**: small overshoot (a few %) is acceptable for protection limits; billing quotas must be exact.
- **Highly available**: the limiter must not become the reason the API is down.
- **Scales** with the gateway fleet (many gateways must agree on one key's count).
--- est
- **Traffic**: 1 M requests/s across ~200 gateway instances (~5,000/s each).
- **Keys**: 100 M distinct keys/day; active at once maybe 10 M.
- **State per key**: token bucket = tokens + last refill time ≈ 16 bytes, plus key and overhead ≈ 100 B → 10 M × 100 B = **1 GB** hot state: fits easily in a small Redis cluster (a few shards for throughput).
- **Store load**: one atomic operation per request = 1 M ops/s → ~10 Redis shards at ~100 k ops/s each; local batching or leases cut that by 10–100×.
- **Latency budget**: an in-region Redis round trip ≈ 0.3–1 ms: acceptable; a cross-region one (70+ ms) is not.
--- api
- Internal: `allow(key, rule_id, cost=1) → {allowed, remaining, reset_at, retry_after}`.
- Rules: `{id, match: {endpoint, tier}, limit, period, burst}` stored in a config service; gateways cache them and subscribe to updates.
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.

**State**: Redis hash per (key, rule): `{tokens, ts}` with a TTL slightly above the refill time (idle keys vanish). Billing quotas: durable counters in a database, updated in batches.
--- hl
1. A request reaches an **API gateway**; middleware extracts the key (API key, user, IP) and matches **rules** (cached locally).
2. The limiter runs the bucket update in **Redis** atomically (a Lua script: refill based on elapsed time, take `cost` tokens if available, return the result), sharded by key.
3. Allowed → forward to the backend; denied → `429` with headers.
4. Decisions are logged asynchronously for dashboards and abuse detection.
5. The rules service pushes changes to gateways.

Backends still protect themselves (concurrency limits, load shedding): the gateway limiter is per-client fairness, not the last line of defence.
--- deep
**1. Algorithm**: fixed windows allow up to 2× the limit around window boundaries; a sliding log is exact but stores every timestamp; the **sliding window counter** (weighted previous window) is a cheap approximation; the **token bucket** allows controlled bursts and is the usual choice for APIs; a leaky bucket smooths output (good for protecting a fragile backend).

**2. Atomicity**: "read count, compare, write count" from two gateways at once lets both pass. Use one atomic operation: a Lua script, or `INCR` first and compare the returned value. Never let gateways read-modify-write separately.

**3. Latency and load**: a Redis call on every request costs ~1 ms and 1 M ops/s. Options: **local buckets** per gateway with a share of the limit (limit ÷ number of gateways: inaccurate when traffic is uneven); **token leasing** (a gateway takes 50 tokens at once from Redis and spends them locally; lower accuracy, 50× fewer calls); or **asynchronous sync** of local counts every 100 ms. Pick by how exact the limit must be.

**4. Failure policy**: if Redis is down, fail open with conservative local limits (protects availability) for protection limits; fail closed for security-critical limits (login attempts). Always time out the limiter call quickly (a few ms).

**5. Multi-region**: global limits across regions need either a home region per key (route its counting there), approximate global counts (each region syncs counts periodically, CRDT-style counters), or per-region limits that sum to the global limit. Cross-region synchronous checks are too slow.

**6. Weighted costs**: expensive operations (a search, an LLM call measured in tokens) take more tokens; reserve an estimate up front and settle the difference afterwards.
--- wrap
**Monitoring**: allow/deny rates per rule, top limited keys (abuse or a misconfigured client?), limiter latency, Redis saturation, fail-open events.

**Operational**: dry-run mode for new rules (log would-be denials before enforcing), per-customer overrides, clear documentation and headers so clients back off properly (exponential backoff with jitter on 429).

**At 10×**: more shards, more leasing, edge enforcement for IP limits (CDN/WAF).
--- variants
Q: Limit concurrent requests instead of requests per second
A: A concurrency limit counts in-flight requests: increment on start, decrement on finish (with a lease/TTL so crashed requests don't leak slots). Protects slow backends better than rate limits.
Q: Billing quotas: 1 M calls per month, exactly
A: Exactness matters: durable counters in a database, updated in batches from the request log with idempotent processing; the fast limiter enforces approximately and the billing system reconciles; overage handling is a product decision.
Q: Protect against a DDoS from 100,000 IPs
A: Per-key limiting doesn't help much; you need edge defences (anycast, WAF, bot scoring), and adaptive limits on aggregate traffic. See the DDoS page.
Q: Rate-limit LLM usage by tokens per minute
A: Cost unknown until the response ends: reserve the max expected tokens, settle after, and track per-minute token buckets plus concurrent request limits.
--- steer
Q: Why not a simple counter per minute?
A: Boundary bursts allow 2× the limit; show the sliding window counter or token bucket.
Q: Two gateways check the same key at the same moment.
A: Make check-and-update atomic (Lua script / INCR-then-compare); never read-then-write.
Q: Redis adds too much latency.
A: Token leasing or local buckets with periodic sync, trading accuracy for latency.
Q: Redis goes down.
A: Short timeout; fail open with local conservative limits for protection limits, fail closed for security limits; replicas with failover.
Q: The same limit must hold across five regions.
A: Home region per key, or approximate global counters synced periodically, or split the limit per region.
--- pitfalls
- Non-atomic read-then-write counters
- A single Redis with no failure policy
- Using client-supplied time for windows
- Cross-region synchronous checks on every request
- Treating the gateway limiter as the only overload protection
--- level
- **L4**: correct algorithm and a Redis-based implementation with headers.
- **L5**: compares algorithms with boundary behaviour, atomicity, latency budget and leasing, failure policy, multi-region options, weighted costs.
- **L6**: billing vs protection limits as separate systems, dry-run rollouts, adaptive limits tied to backend health, cost of the limiter tier itself.
