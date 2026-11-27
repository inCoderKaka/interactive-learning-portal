=== cache-patterns
blurb: The four ways an application and a cache can share the work of reading and writing (cache-aside, read-through, write-through and write-back), what each guarantees, what each loses when something crashes, and which to pick.
signals: Reads vastly outnumber writes | A database is overloaded by repeated identical reads | Writes must be acknowledged very fast | Deciding where caching logic lives
widgets: seq-cache-patterns

--- lesson
:::words
- **Cache**: a small, fast store (usually in memory) that keeps copies of data so most reads avoid the slower source.
- **Source of truth**: the store whose copy is the real one, usually the database.
- **Cache hit / miss**: the data was / was not in the cache.
- **Hit rate**: the share of reads the cache answers.
- **TTL (time to live)**: how long a cached entry may be used before it expires.
- **Stale data**: a cached copy that no longer matches the source of truth.
- **Write-back (write-behind)**: accepting a write into the cache and saving it to the database later.
:::

## The problem in plain words

A database read might take 1–10 ms and the database can only serve so many per second. A memory read from a cache takes well under a millisecond, and caches handle hundreds of thousands of operations per second per machine. If the same data is read again and again (a celebrity's profile, today's top products), keeping a copy in memory makes reads faster *and* protects the database. The catch is that you now have **two copies**, and the question is how they are kept in step when data changes, and what is lost when something crashes.

:::eli5
A chef keeps the most-used ingredients on the counter (the cache) instead of walking to the storeroom (the database) every time. Simple when only reading. But if the storeroom gets a fresh delivery, the counter still has the old stuff until someone swaps it, and if the chef writes "used 3 eggs" only on a sticky note on the counter, and the note falls in the bin, the storeroom count is wrong forever.
:::

## The four patterns

Step through each pattern, including the crash runs:

[[widget:seq-cache-patterns]]

**1. Cache-aside (lazy loading).** The application owns the logic:
- *Read*: look in the cache; on a miss, read the database, put the result in the cache with a TTL, return it.
- *Write*: write the database, then **delete** the cache entry (so the next read reloads it).

The most common pattern by far (Redis or Memcached plus application code). Only requested data gets cached; a cache failure just means slower reads, not lost data. The first read of anything is a miss, and there are race conditions between concurrent reads and writes that can leave stale data (the invalidation page covers them).

**2. Read-through.** Same as cache-aside for reads, but the *cache* (or a caching library) loads from the database on a miss, so application code just asks the cache. Neater code; same behaviour.

**3. Write-through.** Every write goes to the cache **and** the database before it is acknowledged (the cache layer writes both). The cache is never behind the database for data written this way, so reads right after writes are fresh. Writes are slower (two writes), and you cache data nobody may ever read. Often combined with read-through.

**4. Write-back (write-behind).** A write is acknowledged as soon as it is in the cache; the cache writes it to the database later, often in batches. Writes are very fast and the database sees far fewer, merged writes. But **if the cache node dies before flushing, acknowledged writes are lost**, unless the cache itself is replicated and durable. Used where speed matters more than every single write (counters, view counts, metrics), or inside systems that make the cache durable (a database's own buffer pool with its write-ahead log is a form of write-back).

A fifth term you will hear: **write-around**: writes go only to the database (the cache is not updated); reads fill the cache. Good when written data is rarely read soon after.

## Choosing

| Need | Pattern |
|---|---|
| General read-heavy data, simplest robust option | Cache-aside (+ TTL) |
| Reads must reflect writes immediately (for data you write) | Write-through (+ read-through) |
| Extremely high write rates, some loss acceptable | Write-back |
| Bulk writes that are rarely read back soon | Write-around |

## What to cache

- **Hot, read-mostly data**: profiles, product pages, configuration, rendered fragments, results of expensive queries.
- **Computed results**: a user's feed, a recommendation list, a search result page.
- **Sessions and tokens**: often in a cache like Redis (with persistence or acceptable loss).
- **Not**: data that changes on almost every read, data that must be exactly correct at every moment unless you accept the cost (balances), or huge objects that would evict everything else.

Also decide **the key** (include everything that affects the value: `feed:{user}:{locale}:{version}`) and **the TTL** (how stale can it be? seconds for prices, hours for avatars). A TTL is a safety net: even if invalidation is missed, stale data eventually expires.

## Numbers that justify a cache

With a 95% hit rate, the database sees 5% of reads: a 20× reduction. Going from 95% to 99% cuts database reads by another 5× (5% → 1%). Average latency ≈ hit rate × cache latency + miss rate × (cache + database latency). With 0.5 ms cache, 10 ms database, 95% hits: 0.95 × 0.5 + 0.05 × 10.5 ≈ 1 ms. The **miss path** dominates both latency and database load, which is why small hit-rate gains matter so much.

## What breaks

- **Cold start**: after a deploy or a cache restart, every read misses and the database is hammered. Warm the cache or ramp traffic.
- **The database sized for the hit rate**: if it can only survive with 95% hits, losing a cache node is an outage. Size the database (or limit misses) for degraded cache states.
- **Stale reads** after writes, from races or missed invalidations (next pages).
- **Write-back loss** on cache failure.

## Interview angles

- "How do reads and writes work with your cache?" Name the pattern and walk a read and a write.
- "What happens if the cache dies?" Cache-aside: slower, database load spike, no data loss. Write-back: possible loss of unflushed writes.
- "Why delete on write instead of updating the cache?" Updating risks writing an older value over a newer one under concurrency; deleting lets the next read fetch fresh data.

--- revise
### Patterns
? Cache-aside read and write? :: Read: cache, on miss read DB and fill cache with TTL. Write: write DB, then delete the cache entry.
? Read-through vs cache-aside? :: Same behaviour; in read-through the cache layer loads from the DB on a miss.
? Write-through? :: Write cache and DB before acknowledging; cache stays fresh; writes slower.
? Write-back's risk? :: Writes acknowledged from cache are lost if it dies before flushing.
? Write-around? :: Writes skip the cache; reads fill it. For data rarely read right after writing.

### Judgement
? Why delete instead of update the cache on write? :: Concurrent updates can leave an older value in the cache; delete lets the next read load fresh data.
? Role of a TTL? :: Bounds staleness and is a safety net for missed invalidations.
? Hit rate 95% → 99% reduces DB reads by? :: 5× (5% → 1% of reads).
? Main danger of sizing the DB for the hit rate? :: Losing cache capacity (restart, node loss) overwhelms the DB.

--- notes
## Patterns
Cache-aside: app reads cache → miss → DB → fill with TTL; writes DB then delete key.
Read-through: cache loads on miss; same semantics, cleaner code.
Write-through: write both before ack; fresh reads; slower writes; caches unread data.
Write-back: ack from cache, flush later in batches; fast; loss risk unless cache is durable.
Write-around: writes bypass cache.
## Choosing
Default: cache-aside + TTL · fresh-after-write: write-through · write-heavy and loss-tolerant: write-back · write-once-read-later: write-around.
## Keys and TTLs
Key includes everything that changes the value (user, locale, version).
TTL by tolerable staleness; always set one as a safety net.
## Numbers
Avg latency ≈ hit × cache + miss × (cache + DB).
Misses dominate latency and DB load; 95% → 99% hits = 5× fewer DB reads.
## Breakage
Cold start → warm or ramp.
DB sized only for the happy hit rate → outage on cache loss.
Stale data from races and missed invalidations; write-back loss.

--- doubts
Q: Why would the cache ever disagree with the database in cache-aside?
A: Two concurrent operations can interleave badly: a reader misses, reads the old value from the database, gets delayed; meanwhile a writer updates the database and deletes the cache key; then the delayed reader puts the old value into the cache. It now stays stale until its TTL expires. The invalidation page walks through this race and its fixes (leases, versioned values, short TTLs).

Q: Is write-back ever used for important data?
A: Yes, when the cache layer is itself durable and replicated. A database's buffer pool is write-back (pages change in memory and are written to disk later), made safe by the write-ahead log written first. An in-memory cache like plain Memcached with write-back would lose data on a crash; Redis with replication and an append-only file narrows, but does not fully remove, the window.

Q: Should I cache in the application process or in a separate cache service?
A: Often both. An in-process cache (a map in each server's memory) is fastest (no network) but each server has its own copy, so it is harder to invalidate and wastes memory; good for small, very hot, rarely changing data (configuration, feature flags, a celebrity profile for a few seconds). A shared cache (Redis, Memcached) has one copy for all servers and survives deploys. Hot keys are often handled with a short-lived local cache in front of the shared one.

Q: How do I choose a TTL?
A: From how stale the data may be for users, not from performance alone. A product price: seconds to a minute. A username: minutes. An avatar image: hours or days (with versioned URLs when it changes). Add random jitter so many keys do not expire at the same moment.

Q: Does a cache help with writes?
A: Only write-back (by absorbing and batching writes) or as a buffer in front of slow work. Cache-aside and write-through help reads. For write-heavy systems, logs, queues and write-optimised databases matter more than caches.

--- exercises
[estimate] A product page is read 50,000 times per second. Cache latency 0.5 ms, database read 8 ms, the database can handle 4,000 reads per second. What minimum hit rate keeps the database alive, and what is the average latency at that hit rate?
A: Misses must stay under 4,000/s: miss rate ≤ 4,000 / 50,000 = 8%, so hit rate ≥ 92% (aim for 97–99% with headroom). Average latency at 92%: 0.92 × 0.5 + 0.08 × 8.5 ≈ 0.46 + 0.68 = 1.14 ms.

[choose] A gaming leaderboard records 200,000 score updates per second; losing a few seconds of updates in a rare crash is acceptable; the leaderboard is read constantly. Which write pattern?
A: Write-back into a replicated in-memory store (for example a Redis sorted set), flushing aggregated results to durable storage periodically. The database could not absorb 200k individual writes per second, reads come straight from memory, and the rare loss of seconds of scores is acceptable per the requirement.

[break] After a deploy that restarts all cache servers at once, the database CPU hits 100% and the site is down for 10 minutes. Explain and propose two fixes.
A: All caches started empty, so every read missed and went to the database, far beyond the load it was sized for (it normally sees only the miss fraction). Fixes: restart cache nodes gradually (rolling), so most of the cache stays warm; warm new caches from a snapshot or by replaying popular keys; rate-limit misses to the database (request coalescing so one miss per key reaches it); keep the database sized to survive a partial cache loss.

[design] Design caching for a user profile service: 100M users, 20 reads per user per day, profile edits a few times a month, profile shown to the user right after they edit it.
A: Cache-aside with a shared cache keyed `profile:{user_id}`, TTL of an hour (with jitter). On edit: write the database, then delete the key. To guarantee the editing user sees their change despite races or replica lag, read their own profile from the primary (or bypass cache) for a short window after an edit, or use write-through for profile writes. Reads: 100M × 20 / 10⁵ ≈ 20,000/s; working set fits easily in memory (100M × ~1 KB = 100 GB across a small cluster).

--- pitfalls
- Caching without a TTL (stale forever if an invalidation is missed)
- Updating the cache on write instead of deleting (stale under concurrency)
- Write-back for data that must never be lost, without a durable cache
- Sizing the database only for the steady-state hit rate
- Cache keys missing a dimension that changes the value (locale, version, user)

--- quiz
Q: In cache-aside, what does a write do?
- Writes only the cache
- *Writes the database, then deletes the cache entry
- Writes the cache, then the database later
- Nothing; the TTL handles it
W: Deleting lets the next read load the new value.
Q: Which pattern can lose acknowledged writes if the cache crashes?
- Cache-aside
- Write-through
- *Write-back
- Read-through
W: Writes live only in the cache until flushed.
Q: Going from a 90% to a 99% hit rate reduces database reads by…
- 9%
- 2×
- *10×
- 99×
W: Misses drop from 10% to 1% of reads.
Q: The main benefit of write-through is…
- Faster writes
- *Reads right after writes see fresh data
- Less memory use
- No need for a database
W: Cache and database are updated together.

--- sources
- paper :: Scaling Memcache at Facebook (NSDI 2013) :: Nishtala et al., Facebook :: https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala
- article :: Caching challenges and strategies :: Amazon Builders' Library (Matt Brinkley, Jas Chhabra) :: https://aws.amazon.com/builders-library/caching-challenges-and-strategies/
- article :: Caching patterns (Memorystore for Redis) :: Google Cloud :: https://cloud.google.com/memorystore/docs/redis/caching-strategies
- book :: Designing Data-Intensive Applications, ch. 3 and 11 :: Martin Kleppmann :: https://dataintensive.net/

=== cache-eviction
blurb: When the cache is full, something must go: LRU, LFU, FIFO, random and modern admission policies like TinyLFU, raced on real access patterns, plus how to size a cache from the working set and the hit-rate curve.
signals: Choosing a cache size | Hit rate is lower than expected | A batch job or scan wipes out the cache | Choosing Redis maxmemory policies
widgets: eviction-race
prereq: cache-patterns

--- lesson
:::words
- **Eviction**: removing an entry from a full cache to make room for a new one.
- **Eviction policy**: the rule that picks which entry to remove.
- **Working set**: the data actively used during some period.
- **Skew**: a few items getting most of the requests (the most popular product, the most viewed video).
- **Zipf distribution**: a common popularity shape where the 2nd most popular item gets about half the requests of the 1st, the 3rd a third, and so on.
- **Scan**: reading a long list of items once each (a nightly report), which can push useful items out of a cache.
- **Admission policy**: a rule deciding whether a new item is even worth putting in the cache.
:::

## The problem in plain words

A cache holds a fraction of the data. When it is full and a new item arrives, the cache must decide what to throw away. A good choice keeps the items that will be asked for again soon, so the hit rate stays high; a bad choice throws away tomorrow's popular item to keep yesterday's one-off. No policy can see the future, so each one bets on a different signal from the past: **recency** (used recently, so likely again) or **frequency** (used often, so likely again).

:::eli5
A small bookshelf next to your desk holds 10 books; the rest are in the basement. When you bring a new one up, one must go down. LRU sends down the book you haven't touched for the longest time. LFU sends down the one you have opened the fewest times. FIFO sends down whichever has been on the shelf longest, even if you use it every day.
:::

## The policies

- **FIFO (first in, first out)**: evict the oldest inserted. Simple, ignores use. Usually worse than the others for skewed workloads, but cheap.
- **Random**: evict a random entry. Surprisingly decent, extremely cheap, no bookkeeping.
- **LRU (least recently used)**: evict the entry not used for the longest time. Tracks recency with a linked list plus a hash map (the classic interview data structure). Great for workloads where recent items are hot. Its weakness: **a single large scan** (a batch job reading millions of items once) pushes out the entire hot set, because every scanned item is "recently used".
- **LFU (least frequently used)**: evict the entry with the fewest uses. Holds on to long-term popular items and resists scans. Its weaknesses: items that *were* popular stay forever unless counts decay ("cache pollution"), and new items get evicted before they can prove themselves.
- **Modern hybrids**: **2Q** and **SLRU** keep a small probationary area for new items and promote those used again; **ARC** adapts between recency and frequency; **W-TinyLFU** (used by the Caffeine library and others) keeps a small LRU window plus a compact frequency sketch to decide whether a newcomer deserves to replace an existing item. These get near-optimal hit rates across most real workloads.

Race them on the same stream of requests below. Try the "scan" and "shifting popularity" workloads:

[[widget:eviction-race]]

## What real systems do

- **Redis** samples a few keys (5 by default) and evicts the least recently (or least frequently) used *among the sample*, an approximation that avoids keeping a full linked list for millions of keys. Policies are set with `maxmemory-policy`: `allkeys-lru`, `allkeys-lfu`, `volatile-lru` (only keys with a TTL), `volatile-ttl`, `noeviction` (reject writes when full) and others. LFU in Redis uses a small logarithmic counter that decays over time.
- **Memcached** divides memory into slab classes by item size, each with its own (segmented) LRU, so a size class can run out while others have room: "slab imbalance", which newer versions rebalance automatically.
- **CPU caches, databases' buffer pools and CDNs** all use LRU variants with protection against scans (e.g. inserting new pages into the middle of the list).

## Sizing a cache

Hit rate grows with cache size, but with **diminishing returns**: under a skewed (Zipf-like) workload, the first few percent of items capture most requests. A practical approach:

1. Estimate the **working set**: the items requested in a relevant window (a day of active users' profiles, the last hour of feed entries).
2. Estimate the **skew**: if 20% of items take 80–90% of requests, caching that 20% gets you most of the benefit.
3. Use a **hit-rate curve** (measured by replaying real access logs at different cache sizes, or from your monitoring) to pick the knee of the curve.
4. Add per-entry overhead (keys, pointers, allocator waste: often 50–100% on top of raw values for small items).

## Interview angles

- "Which eviction policy?" LRU as the default; mention scan resistance and LFU/TinyLFU for skewed, stable popularity.
- "How big should the cache be?" Working set × skew → hit-rate target; validate on access logs; include overhead.
- "Hit rate is low; why?" Cache too small for the working set, scans polluting it, keys too fine-grained, TTLs too short, or a workload with little reuse.

--- revise
### Policies
? LRU evicts? :: The entry unused for the longest time.
? LRU's classic weakness? :: A one-off scan flushes the hot set (every scanned item looks recent).
? LFU evicts? :: The entry with the fewest uses; resists scans but keeps once-popular items without decay.
? What does W-TinyLFU add? :: A frequency sketch that decides whether a newcomer deserves to replace an existing entry (admission), plus a small LRU window.
? How does Redis implement LRU cheaply? :: Samples a few keys and evicts the least recently used among them.

### Sizing
? Why diminishing returns from cache size? :: Skewed popularity: a small share of items takes most requests.
? Steps to size a cache? :: Working set → skew → hit-rate curve from real logs → add per-entry overhead.
? Four causes of a low hit rate? :: Too small, scan pollution, keys too fine-grained, TTLs too short (or little reuse).

--- notes
## Policies
FIFO: oldest inserted; ignores use.
Random: cheap, decent.
LRU: hash map + doubly linked list; recency; scan-vulnerable.
LFU: frequency; scan-resistant; needs decay; new items struggle.
2Q / SLRU: probation area, promote on second use.
ARC: adapts recency vs frequency.
W-TinyLFU (Caffeine): admission by frequency sketch + LRU window; near-optimal.
## Real systems
Redis: sampled LRU/LFU (maxmemory-samples 5); policies allkeys-lru, allkeys-lfu, volatile-*, noeviction.
Memcached: slab classes, per-class segmented LRU; slab rebalancing.
Buffer pools and CDNs: LRU variants with scan protection.
## Sizing
Working set × skew → target hit rate → hit-rate curve from replayed logs → + 50–100% overhead for small items.
Diminishing returns past the knee.
## Low hit rate causes
Too small · scans · over-specific keys · short TTLs · low reuse.

--- doubts
Q: Is LRU always the safe default?
A: It is a strong default for most web workloads, where recently used items are likely to be used again. It struggles with scans and with workloads where long-term popularity matters more than recency. If you see the hit rate collapse whenever a batch job runs, that is the scan problem; use scan-resistant variants or keep batch jobs away from the online cache.

Q: Why not use "optimal" eviction?
A: The optimal policy (Bélády's) evicts the item that will be needed furthest in the future, which requires knowing the future. It is used offline to measure how close a real policy gets. Practical policies approximate it from past behaviour.

Q: What does `noeviction` mean in Redis, and when is it right?
A: When memory is full, Redis rejects writes instead of evicting. That is right when Redis holds data you cannot afford to lose silently (a primary store, a queue), and wrong for a pure cache, where you want old entries to make room for new ones.

Q: How does TTL interact with eviction?
A: TTL removes entries when they become too old to use, regardless of space; eviction removes entries when space runs out, regardless of age. A cache usually has both: TTL for correctness (bounding staleness), eviction for capacity. Redis's `volatile-*` policies only evict keys that have a TTL.

--- exercises
[estimate] You have 50M products; 5% of them receive 90% of views. Each cached product page is 8 KB, with ~50% overhead. How much memory to cache the hot 5%, and what hit rate do you expect?
A: 5% × 50M = 2.5M pages × 8 KB × 1.5 ≈ 30 GB. Expected hit rate ≈ 90% (the hot set's share of views), a bit higher with a slightly larger cache since popularity tails off gradually. Roughly one or two cache servers' worth of memory (more for replicas).

[break] Every night at 2 a.m. a reporting job reads every order from the last year through the same LRU cache used by the website. Next morning the website's p99 latency is terrible for an hour. Explain and fix.
A: The scan touched millions of one-off items, each becoming the most recently used, which evicted the website's hot set; in the morning every popular read misses until the cache refills. Fix: keep batch jobs off the online cache (read from a replica or a warehouse directly), or use a scan-resistant policy (2Q, SLRU, TinyLFU) that does not admit one-time items into the protected area.

[choose] A news site: articles are extremely popular for a few hours, then almost never read. LRU or LFU?
A: LRU (or an LRU-leaning hybrid). Popularity is recency-driven and shifts constantly; pure LFU would keep yesterday's big stories because of their high counts and starve today's. With LFU you would need fast count decay.

--- pitfalls
- Sizing a cache to the total dataset instead of the working set
- Letting batch scans run through the online LRU cache
- Pure LFU without decay for shifting popularity
- Redis `noeviction` on a pure cache (writes start failing when full)
- Forgetting per-entry memory overhead

--- quiz
Q: Which policy is most hurt by a single large scan?
- LFU
- *LRU
- W-TinyLFU
- Random
W: Every scanned item becomes "most recently used" and pushes out the hot set.
Q: Why does hit rate show diminishing returns as the cache grows?
- Memory gets slower
- *A small share of items receives most requests (skew)
- Eviction stops working
- TTLs get shorter
W: After the hot set fits, extra space holds rarely used items.
Q: Redis approximates LRU by…
- Keeping a full linked list
- *Sampling a few keys and evicting the least recently used among them
- Evicting randomly
- Never evicting
W: Sampling avoids per-key bookkeeping overhead.
Q: An admission policy decides…
- When to expire an item
- *Whether a new item is worth caching at all
- Which server holds a key
- The TTL of an item
W: TinyLFU-style admission keeps one-off items from displacing popular ones.

--- sources
- paper :: TinyLFU: A Highly Efficient Cache Admission Policy (ACM TOS 2017) :: Einziger, Friedman, Manes :: https://arxiv.org/abs/1512.00727
- paper :: ARC: A Self-Tuning, Low Overhead Replacement Cache (FAST 2003) :: Megiddo, Modha :: https://www.usenix.org/conference/fast-03/arc-self-tuning-low-overhead-replacement-cache
- article :: Key eviction (Redis documentation) :: Redis :: https://redis.io/docs/latest/develop/reference/eviction/
- tool :: Caffeine: efficiency (W-TinyLFU) :: Ben Manes :: https://github.com/ben-manes/caffeine/wiki/Efficiency

=== cache-invalidation
blurb: "There are only two hard things in computer science": why keeping a cache in step with the database is genuinely hard, the race conditions that leave stale data forever, and the fixes used at scale (TTLs, delete-on-write, leases, versioning, change-data-capture invalidation).
signals: Users see old data after an update | Several services or regions cache the same data | Reads must reflect writes | Designing invalidation for a cache in front of a replicated database
widgets: seq-invalidation
prereq: cache-patterns

--- lesson
:::words
- **Invalidation**: removing or marking a cached copy as out of date after the real data changed.
- **Race condition**: a bug where the result depends on the exact timing of two concurrent operations.
- **Stale set**: putting an old value into the cache after a newer one was written to the database.
- **Lease**: a token the cache gives a reader on a miss, which must be presented to store the value; invalidations cancel it.
- **Version**: a number that increases on every change, stored with the value so older copies can be recognised.
- **Change data capture (CDC)**: reading the database's own log of changes and reacting to each one.
:::

## The problem in plain words

The moment you cache something, you have two copies that can disagree. Updating the database is not enough: every cached copy of that data, in every cache, must be removed or updated, and the operations doing that run concurrently with readers who are busy re-filling the cache. Get the ordering wrong and a cache can hold an old value **indefinitely** (until its TTL), with nothing to tell you.

:::eli5
A shop changes a price on its master list and tells the staff to take down the old price tag from the shelf. But a colleague who checked the master list a minute ago, before the change, is walking over with a tag printed with the old price, and pins it up just after the old tag came down. The shelf now shows the old price, and nobody is going to check it again.
:::

## The classic race

Step through it, then try the fixes:

[[widget:seq-invalidation]]

With cache-aside (read: miss → read DB → set cache; write: write DB → delete cache):

1. Reader A misses the cache and reads **v1** from the database.
2. Before A writes it to the cache, writer B updates the database to **v2** and deletes the cache key (nothing to delete yet).
3. A, delayed by a pause or slow network, now sets the cache to **v1**.
4. The cache holds v1, the database v2. Every reader gets v1 until the TTL expires.

Reversing the writer's order (delete cache, then write DB) has its own race: a reader can refill the cache with v1 between the delete and the DB write.

## The fixes, from simplest

1. **TTL everywhere.** Bounds how long any stale value can live. Never skip it; it is your safety net.
2. **Delete, don't update, on write.** Writing the new value into the cache from the writer can also race (two writers' cache updates landing in the wrong order). Deleting is idempotent and lets the next read fetch the truth.
3. **Delayed double delete.** Delete after the write, then delete again a short time later (say 500 ms) to catch a racing reader's stale set. Cheap and pragmatic, but timing-based, so not a guarantee.
4. **Leases (Facebook's memcache).** On a miss, the cache hands the reader a lease token. The reader may only set the value if it presents a valid token; a delete (invalidation) for that key **cancels outstanding leases**. In the race above, B's delete cancels A's lease, so A's stale set is rejected. Leases also stop stampedes: only one reader per key gets a lease at a time; the others wait briefly or get a slightly stale value.
5. **Versioned values / compare-and-set.** Store a version with each value (from the database row). A set only succeeds if its version is newer than what the cache holds. Old data can never overwrite new.
6. **Invalidation from the database's change log (CDC).** Instead of every writer remembering to delete keys, a separate process reads the database's commit log and issues deletes for every changed row, in commit order, with retries until they succeed. Facebook's McSqueal did this from MySQL's binlog. It catches writes from every code path (including manual fixes and batch jobs) and works across regions.

## Invalidation with replicas and regions

Caches in front of **read replicas** add another race: a writer updates the primary and deletes the cache key; a reader misses and reads from a replica that has not yet received the write (replication lag), and caches the old value. Fixes: delay the deletion until replicas have applied the change (CDC on each replica does this naturally), or read from the primary for recently written keys.

With caches in **several regions**, each region's cache must be invalidated. Broadcasting deletes from each region's own replication stream keeps the order right; a write in Europe invalidates US caches only after the US database copy has the new value.

## Reads that must see your own write

A common requirement is weaker than "everyone sees the latest value immediately": **the user who made the change must see it** (you rename your profile and refresh). Options: write-through for that user's own data, bypass or refresh the cache for the writing user for a few seconds, or include a version in the user's session and treat older cached versions as misses.

## Interview angles

- "How do you keep the cache consistent with the database?" Cache-aside with delete-on-write and TTLs; then name the race and a fix (leases, versioning, CDC).
- "What about replicas?" Replication lag can re-cache old data; invalidate from each replica's log or read the primary for recent writes.
- "Does the user see their own update?" Read-your-writes via write-through, cache bypass or versions.

--- revise
### Races
? The classic cache-aside race? :: Reader misses and reads v1; writer writes v2 and deletes the key; reader then sets v1: stale until TTL.
? Why delete instead of update the cache on write? :: Deletes are idempotent; concurrent updates can land in the wrong order.
? Why is "delete cache, then write DB" also racy? :: A reader can refill v1 between the delete and the write.

### Fixes
? How do leases prevent stale sets? :: A miss gets a lease token; invalidation cancels it; sets with a cancelled token are rejected.
? Versioned values? :: Store the row's version; a set only succeeds if newer than the cached version.
? Why invalidate from the change log (CDC)? :: Catches every write path, in commit order, with retries; works per replica and region.
? Cache in front of a lagging replica: problem and fix? :: Reader re-caches old data from the replica; invalidate from each replica's log or read the primary for recent writes.
? Cheapest guarantee that a user sees their own edit? :: Write-through or cache bypass for that user's data for a short window.

--- notes
## The race
Read miss → read DB (v1) → … → set cache v1; meanwhile write DB v2 → delete key. Result: v1 cached until TTL.
Delete-then-write has the mirror race.
## Fixes
Always TTL (bounds staleness).
Delete on write, never update from the writer.
Delayed double delete (pragmatic, timing-based).
Leases (Facebook memcache): miss gets a token; invalidation cancels; also throttles stampedes.
Versions / compare-and-set: older never overwrites newer.
CDC-driven invalidation (McSqueal from the MySQL binlog): every write path, ordered, retried.
## Replicas and regions
Replica lag re-caches old data → invalidate from each replica's stream or read primary for recent writes.
Multi-region: invalidate each region from its own replication stream.
## Read-your-writes
Write-through for own data, bypass cache briefly after a write, or version in the session.

--- doubts
Q: If TTLs bound staleness, why bother with anything else?
A: Because a TTL short enough to make staleness unnoticeable (a few seconds) throws away most of the cache's benefit for data that rarely changes, and a long TTL makes stale data visible for minutes or hours. Explicit invalidation lets you use long TTLs and still reflect changes quickly; the TTL then only covers the rare missed invalidation.

Q: Why not just lock the key while writing?
A: You can (a distributed lock per key), but it adds a network round trip and a failure mode (lock holder dies) to every write and read miss, and does not cover readers that read the database before the lock was taken. Leases and versions achieve the same safety with less coordination, which is why large deployments use them.

Q: Does CDC invalidation make the cache strongly consistent?
A: No. There is always a short window between the database commit and the invalidation reaching the cache (milliseconds to seconds) during which a reader can see the old value. CDC makes invalidation reliable and ordered, not instantaneous. If a read must never be stale, read from the source of truth.

Q: What about caches inside many application servers (local caches)?
A: Each one must be invalidated, which usually means broadcasting changes (pub/sub) to all servers, or giving local caches very short TTLs (seconds) and relying on the shared cache behind them for longer-lived data. Local caches are best for data that is tiny, very hot and tolerant of seconds of staleness.

--- exercises
[break] Users report that after changing their display name, the old name sometimes comes back for about an hour. You use cache-aside with a 1-hour TTL and read replicas. Give two plausible causes and fixes.
A: (1) The classic race: a concurrent reader read the old name from the database before the update and set it into the cache after the writer's delete. Fix: leases or versioned sets. (2) Replica lag: after the delete, a reader missed and read the old name from a replica that had not yet applied the update, then cached it. Fix: trigger invalidation from each replica's replication stream (or delay the delete), or read the user's own profile from the primary for a short window after a write. In both cases a shorter TTL limits the damage.

[design] Ten different services write to the products table (including batch jobs and an admin tool). How do you make sure every write invalidates the product cache?
A: Don't rely on each writer: run a CDC pipeline that tails the database's change log, maps each changed row to the cache keys derived from it (product page, price fragment, search snippet), and issues deletes with retries, in commit order. Keep TTLs as a backstop. Monitor invalidation lag (commit time to delete time).

[choose] Price changes must appear within 5 seconds; there are 20 million products with 500,000 reads per second, and prices change rarely. Short TTL or explicit invalidation?
A: Explicit invalidation (CDC or delete-on-write with leases) plus a moderate TTL (say 10 minutes) as a backstop. A 5-second TTL would expire every hot entry 12 times a minute, multiplying database reads; explicit invalidation keeps the hit rate high and makes changes visible within the invalidation lag, which you keep under 5 s and monitor.

--- pitfalls
- No TTL at all
- Updating the cache from writers instead of deleting
- Ignoring replica lag when re-filling the cache after an invalidation
- Relying on every code path to remember to invalidate
- Promising strong consistency from a cache

--- quiz
Q: In the classic cache-aside race, what ends up in the cache?
- Nothing
- The new value
- *The old value, until its TTL expires
- An error
W: A slow reader sets the old value after the writer's delete.
Q: How do leases stop stale sets?
- They lock the database row
- *An invalidation cancels outstanding lease tokens, so late sets are rejected
- They shorten TTLs
- They replicate the cache
W: Only a reader holding a valid lease may set the key.
Q: Why drive invalidation from the database's change log?
- It removes the need for TTLs
- *It catches every write path, in commit order, with retries
- It makes the cache strongly consistent
- It is faster than any other method
W: Writers cannot forget, and ordering is preserved.
Q: A cache in front of read replicas can re-cache old data because…
- Replicas are slower
- *A reader may fetch from a replica that has not applied the write yet
- Deletes are not idempotent
- TTLs are ignored
W: Replication lag reopens the window after the delete.

--- sources
- paper :: Scaling Memcache at Facebook (NSDI 2013): leases, McSqueal :: Nishtala et al. :: https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala
- article :: Cache made consistent (Meta engineering) :: Lu Pan, Meta :: https://engineering.fb.com/2022/06/08/core-infra/cache-made-consistent/
- article :: Caching challenges and strategies :: Amazon Builders' Library :: https://aws.amazon.com/builders-library/caching-challenges-and-strategies/
- article :: TwoHardThings :: Martin Fowler :: https://martinfowler.com/bliki/TwoHardThings.html

=== cache-failures
blurb: How caches fail under load: stampedes when a hot key expires, penetration by requests for keys that do not exist, avalanches when many keys expire together or a cache node dies, and hot keys too popular for one server, each with the standard defences.
signals: Database spikes right after popular keys expire | Attackers request random non-existent IDs | A cache restart takes the database down | One key gets a huge share of traffic
widgets: stampede
prereq: cache-patterns

--- lesson
:::words
- **Cache stampede (dogpile, thundering herd)**: many requests miss the same key at once and all hit the database together.
- **Request coalescing (single flight)**: letting only one request rebuild a missing value while the others wait for its result.
- **Stale-while-revalidate**: serving the old value while one request fetches a fresh one in the background.
- **Cache penetration**: requests for keys that exist nowhere, so they miss the cache and hit the database every time.
- **Negative caching**: caching the fact that something does not exist.
- **Cache avalanche**: many keys expiring at the same time, or a cache node failing, sending a wave of misses to the database.
- **Hot key**: one key receiving so much traffic that the single server holding it is overloaded.
:::

## The problem in plain words

A cache usually makes the database's life easy. But the database is now sized for the *miss* rate, so any event that suddenly turns many hits into misses becomes a database emergency. Four such events come up again and again, and interviewers expect you to name them and their fixes when you add a cache to a design.

:::eli5
A busy café keeps a jug of iced tea on the counter. When the jug runs out, a hundred customers all walk into the kitchen to make their own at once, and the kitchen grinds to a halt (stampede). Prankster customers keep asking for a drink that does not exist, and each time a cook searches the whole kitchen (penetration). If every jug runs out at exactly 12:00, the kitchen gets flooded (avalanche). And if everyone wants the one celebrity barista, that one person is swamped while the others are idle (hot key).
:::

## 1. Stampedes

A key read 20,000 times per second expires. In the time it takes one request to rebuild it from the database (say 50 ms), about 1,000 other requests also miss and also go to the database, running the same expensive query a thousand times. If the query is expensive, the database slows, rebuilds take longer, and more requests pile up.

Run it and try each defence:

[[widget:stampede]]

Defences:
- **Request coalescing / locking.** The first miss takes a short lock (or lease) for the key and rebuilds; others wait briefly and read the result (or serve stale). Only one database query per key.
- **Stale-while-revalidate.** Keep serving the expired value while one background request refreshes it. Users never wait; data is briefly stale.
- **Early (probabilistic) refresh.** Each read, as the expiry approaches, has a small and growing chance of refreshing early, so one request refreshes before the key ever expires (the "XFetch" algorithm). No locks needed.
- **Never expire hot data, refresh it.** A background job keeps the hottest keys fresh.

## 2. Penetration

Requests for IDs that do not exist (a typo, a scraper, an attacker iterating random IDs) always miss the cache, because there is nothing to cache, and always reach the database.

Defences:
- **Negative caching**: cache "not found" for a short TTL (seconds to minutes).
- **A Bloom filter** of existing IDs in front of the cache: if the filter says "definitely not present", reject immediately. Compact and fast.
- **Validate input** (ID format, ranges) and rate-limit clients that generate many misses.

## 3. Avalanches

Many keys miss at once:

- **Synchronised expiry**: keys loaded together (a warm-up job, a deploy) with the same TTL all expire at the same moment. Fix: **add random jitter to TTLs** (for example 60 minutes ± 10%).
- **Cache node or cluster failure**: everything on it misses. Fixes: replicate cache nodes; use consistent hashing so a lost node affects only its share; a small "gutter" pool to take over a failed node's keys temporarily (Facebook's approach); rate-limit misses reaching the database; size the database for partial cache loss.
- **Cold start after a deploy or restart**: restart gradually and warm caches.

## 4. Hot keys

One key (a celebrity profile, a viral post, a flash-sale product) receives 100,000+ reads per second, more than the one cache server holding it can serve, while other servers are idle. Consistent hashing cannot help: the key lives in one place.

Defences:
- **Local in-process cache** (L1) in each application server for a few seconds: the hottest reads never leave the server.
- **Replicate the key**: store copies under several keys (`post:42#1` … `post:42#8`) on different servers and read a random copy; writes update or delete all copies.
- **Read replicas** of the cache shard holding the hot key.
- **Detect hot keys** automatically (sampling request counts) so these measures switch on when needed.

Hot keys on **writes** (a counter receiving 50,000 increments per second) need a different fix: split the counter into shards and sum on read, or aggregate in memory and flush periodically.

## Interview angles

- "What happens when your hottest cache key expires?" Stampede → coalescing, stale-while-revalidate, early refresh.
- "An attacker requests random user IDs; what happens?" Penetration → negative caching, Bloom filter, validation, rate limits.
- "A cache node dies; what does the database see?" Its share of traffic as misses → replicas, gutter pool, miss rate limits, database headroom.
- "One celebrity's profile gets 200k reads/s." Hot key → local caching, key replication.

--- revise
### Stampede
? What is a cache stampede? :: A hot key expires and many concurrent misses all query the database for it.
? Four defences? :: Request coalescing/locks (single flight), stale-while-revalidate, probabilistic early refresh, background refresh of hot keys.

### Penetration
? Cache penetration? :: Requests for non-existent keys always miss and always reach the database.
? Defences? :: Negative caching, a Bloom filter of existing keys, input validation, rate limits.

### Avalanche
? Two causes of an avalanche? :: Many keys expiring together; a cache node/cluster failing (or cold start).
? Fix for synchronised expiry? :: Random jitter on TTLs.
? What is a gutter pool? :: A small spare cache pool that temporarily serves a failed node's keys.

### Hot keys
? Why can't consistent hashing fix a hot key? :: A single key lives on one server.
? Hot read key defences? :: Short local in-process cache, replicate the key under several names, cache read replicas.
? Hot write counter fix? :: Split into sub-counters and sum on read, or aggregate in memory and flush.

--- notes
## Stampede (dogpile, thundering herd)
Hot key expires → N concurrent misses → N identical DB queries.
Coalescing / lock / lease → one rebuild.
Stale-while-revalidate → serve old, refresh in background.
Probabilistic early refresh (XFetch) → refresh before expiry.
Background refresh for the hottest keys.
## Penetration
Non-existent keys bypass the cache.
Negative cache with short TTL · Bloom filter of existing keys · validate IDs · rate-limit missers.
## Avalanche
Same-TTL keys expire together → add TTL jitter.
Node failure → replicas, consistent hashing, gutter pool, cap misses to DB, DB headroom.
Cold start → gradual restarts, warm-up.
## Hot keys
Local L1 cache for seconds · replicate key as key#1..key#k · shard read replicas · automatic hot-key detection.
Hot write counters → sharded counters or in-memory aggregation.

--- doubts
Q: Doesn't a lock for each key make every miss slower?
A: Only the requests that arrive while the value is being rebuilt wait, and only for about one rebuild time; without the lock they would have waited too (on an overloaded database) and made it slower for everyone. Combined with stale-while-revalidate, nobody waits at all: the old value is served while one request refreshes it.

Q: Is serving stale data acceptable?
A: For most cached data, a few seconds of staleness is invisible and far better than an outage. Where it is not acceptable (a balance, inventory at checkout), that read should not come from a cache in the first place, or it should be validated against the source of truth at the moment it matters.

Q: How does a Bloom filter stop penetration if it can give false positives?
A: A Bloom filter can wrongly say "maybe present" for a few missing keys (say 1%), but never wrongly says "absent" for a key that exists. So it blocks about 99% of bogus requests and lets a few through to the cache and database, which is fine. It must be updated when new keys are created.

Q: How do I find hot keys?
A: Sample requests at the cache client or proxy and count keys over a short window (a Count-Min sketch or a top-k structure makes this cheap), or watch per-shard load. Redis has tools to report hot keys with LFU tracking. Detection lets you switch on local caching or replication only for keys that need it.

--- exercises
[estimate] A key is read 30,000 times/s. Rebuilding it takes a 200 ms database query. Without protection, how many queries hit the database when it expires? With request coalescing?
A: Requests arriving during the 200 ms rebuild: 30,000 × 0.2 = 6,000, each running the same query (and probably slowing the database so the window grows). With coalescing: 1 query; the other 6,000 wait for it or get the stale value.

[break] After a nightly warm-up job loads 10 million keys with a 24-hour TTL, the database falls over every night at the same time. Why, and the one-line fix?
A: All keys were loaded together with the same TTL, so they all expire together 24 hours later, turning into a massive wave of misses (an avalanche). Fix: add random jitter to TTLs (e.g. 24 h ± 2 h) so expiries spread out.

[design] A flash sale makes one product's page receive 300,000 reads per second for an hour. Your cache servers handle 100,000 operations per second each. Design the read path.
A: Cache the page in each application server's memory for 1–2 seconds (local L1), so the vast majority of reads never reach the shared cache; additionally store k copies of the key (e.g. 8) across cache servers and read a random one, spreading the remaining load. Use stale-while-revalidate so expiry never causes a stampede, and serve inventory counts (which change) from a separate, sharded counter rather than the page cache.

[choose] Scrapers are requesting /users/{random id} at 20,000 requests per second, nearly all for IDs that do not exist. Negative caching, a Bloom filter, or rate limiting?
A: All three layers help, but the Bloom filter is the structural fix: it rejects ~99% of non-existent IDs before the cache or database, with no per-ID memory for random IDs (negative caching would fill the cache with junk entries for random IDs). Add per-client rate limits for anyone producing many 404s, and validate the ID format.

--- pitfalls
- No stampede protection on the hottest keys
- Identical TTLs on keys loaded together
- No answer for "the cache node died"
- Caching every random non-existent key (filling the cache with junk)
- Assuming consistent hashing spreads a single hot key

--- quiz
Q: Which defence stops a stampede without making any request wait?
- Shorter TTLs
- *Stale-while-revalidate
- Negative caching
- Bigger cache servers
W: The old value is served while one request refreshes it.
Q: Random jitter on TTLs prevents…
- Penetration
- *Avalanches from synchronised expiry
- Hot keys
- Write-back loss
W: Keys loaded together no longer expire together.
Q: Requests for non-existent IDs overloading the database is called…
- A stampede
- *Cache penetration
- An avalanche
- A hot key
W: There is nothing to cache, so every request reaches the database.
Q: One key gets 200k reads/s. The most effective first step is usually…
- Consistent hashing
- *A short-lived local cache in each application server
- A Bloom filter
- Longer TTLs on other keys
W: Local caching keeps most reads off the shared cache entirely.

--- sources
- paper :: Optimal Probabilistic Cache Stampede Prevention (VLDB 2015) :: Vattani, Chierichetti, Lowenstein :: https://www.vldb.org/pvldb/vol8/p886-vattani.pdf
- paper :: Scaling Memcache at Facebook (NSDI 2013): leases, gutter pools :: Nishtala et al. :: https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala
- paper :: RFC 5861: HTTP Cache-Control Extensions for Stale Content (stale-while-revalidate) :: IETF :: https://www.rfc-editor.org/rfc/rfc5861
- article :: Caching challenges and strategies :: Amazon Builders' Library :: https://aws.amazon.com/builders-library/caching-challenges-and-strategies/

=== redis-memcached
blurb: Inside the two workhorse caches: Memcached's simple multithreaded slab-allocated key-value store, Redis's single-threaded data-structure server with persistence and replication, how each is scaled across many machines, and when to choose which.
signals: Choosing a cache technology | You need sorted sets, counters, queues or pub/sub in memory | Designing a cache cluster | "What happens if a Redis node fails?"
widgets: consistent-hash
prereq: cache-eviction

--- lesson
:::words
- **In-memory store**: a database that keeps all its data in RAM for speed.
- **Single-threaded**: executes one command at a time on one CPU core, so commands never interleave.
- **Slab allocator**: memory divided into fixed-size chunks grouped by size, to avoid fragmentation.
- **Persistence**: saving data to disk so it survives a restart. Redis offers **RDB** snapshots and an **AOF** (append-only file) of commands.
- **Hash slot**: one of the 16,384 buckets Redis Cluster divides keys into; each node owns some slots.
- **Pipelining**: sending many commands without waiting for each reply, to save round trips.
:::

## The problem in plain words

"Add a cache" usually means running Redis or Memcached. They look similar from the outside (put a key, get a key, fast) but are built very differently, and the differences decide how they scale, what happens on failure, and what else you can use them for. A senior engineer should know enough of the inside to predict their behaviour.

:::eli5
Memcached is a huge, simple wall of lockers: put a thing in, take it out, very fast, and many attendants work at once. Redis is a single, extremely quick clerk with a desk full of special organisers (lists, leaderboards, counters, sets) who handles one request at a time, never mixing them up, and can photocopy his notes so nothing is lost if he leaves.
:::

## Memcached

- **Pure key-value cache**: get, set, delete, increment, compare-and-set. Values are opaque bytes (up to 1 MB by default).
- **Multithreaded**: uses all CPU cores; one server can handle a very high operation rate.
- **Slab allocator**: memory is divided into slab classes by item size (64 B, 80 B, …); each class has its own LRU. Efficient, but a workload whose item sizes change can starve one class (newer versions rebalance slabs automatically).
- **No persistence, no replication** built in. A node restart empties it. That is fine for a pure cache.
- **Scaling is done by clients**: each client hashes the key (consistent hashing) to pick a server; servers do not know about each other. Proxies such as Facebook's mcrouter add pooling, replication and failover across servers.

## Redis

- **Data structures**, not just strings: lists, hashes, sets, **sorted sets** (leaderboards, time-ordered feeds), bitmaps, HyperLogLogs, streams, geospatial indexes. Operations on them are atomic, so you get counters, rate limiters, queues, leaderboards and locks "for free".
- **Single-threaded command execution** (an event loop; network I/O can use extra threads since Redis 6). Every command runs alone, which makes each one atomic without locks, and Lua scripts or MULTI/EXEC transactions run several commands as one. The flip side: **one slow command blocks everything** (KEYS on millions of keys, a huge set intersection), and one server uses essentially one core for commands, so you scale by running more instances.
- **Persistence options**: periodic **RDB snapshots** (compact, may lose minutes), an **AOF** that logs every write (configurable fsync, e.g. every second, so at most about a second lost), or both. Or none, as a pure cache.
- **Replication**: a primary with asynchronous replicas. **Sentinel** monitors and fails over; because replication is asynchronous, a failover can lose the last writes.
- **Redis Cluster**: keys map to **16,384 hash slots** (CRC16 of the key mod 16,384); slots are spread across primaries, each with replicas. Clients learn the slot map and talk to the right node directly; moving slots rebalances data. Multi-key operations only work when keys share a slot (use "hash tags": `{user42}:profile` and `{user42}:feed` land together).

## Spreading keys across nodes

Both are scaled by partitioning keys across many servers, and both use hashing so that adding or removing a server moves as few keys as possible:

[[widget:consistent-hash]]

## Choosing

| Need | Choose |
|---|---|
| Plain, very large, high-throughput object cache | Memcached (or Redis) |
| Counters, leaderboards, rate limiters, queues, pub/sub, locks | Redis |
| Data that should survive restarts (sessions, small durable state) | Redis with AOF + replicas (or a real database) |
| Multi-core throughput on one box with simple operations | Memcached |

## Failure behaviour to state in interviews

- **Memcached node dies**: its share of keys misses until refilled; the database absorbs the load (plan for it). No data loss beyond the cache contents, by definition.
- **Redis primary dies**: Sentinel or Cluster promotes a replica in seconds; writes acknowledged by the old primary but not yet replicated are **lost**; clients see errors briefly. If Redis holds rate-limit counters or locks, think about what a lost write or a split brain means (a lock might be granted twice: see fencing tokens in the coordination chapter).
- **Memory full**: depends on the eviction policy (evict vs reject writes).
- **Big keys and slow commands**: a single 100 MB value or an O(N) command over millions of elements stalls a Redis instance for everyone.

## Performance habits

- **Pipelining / batching** (`MGET`, pipelines): 100 gets in one round trip instead of 100.
- **Connection pooling** from application servers; avoid a new connection per request.
- **Keep values small** and keys short; compress large values.
- **Avoid O(N) commands** on large collections in production (use SCAN, not KEYS).

## Interview angles

- "Redis or Memcached?" Memcached for a plain, huge object cache; Redis when you need data structures, atomic operations or persistence.
- "Redis is single-threaded; how does it scale?" Many instances (Cluster with hash slots); one core per instance for commands; pipelining.
- "What happens on Redis failover?" Async replication: possible loss of recent writes; plan for it in locks and counters.

--- revise
### Memcached
? Memcached in one line? :: Multithreaded, slab-allocated, opaque key-value cache with no persistence or replication; clients shard by consistent hashing.
? What is slab imbalance? :: One size class runs out of memory while others have room (newer versions rebalance).

### Redis
? Why is each Redis command atomic? :: Commands execute one at a time on a single thread.
? Downside of single-threaded execution? :: One slow command (KEYS, huge set ops) blocks every client; scale by running more instances.
? RDB vs AOF? :: RDB: periodic snapshots (may lose minutes). AOF: log of every write (e.g. fsync each second, ~1 s loss).
? Redis Cluster key placement? :: CRC16(key) mod 16,384 hash slots, slots spread across primaries.
? How do you keep related keys on one node? :: Hash tags: the part in {braces} decides the slot.
? What can a Redis failover lose? :: Writes acknowledged by the old primary but not yet replicated (replication is async).

### Habits
? Three performance habits? :: Pipeline/batch, pool connections, avoid big keys and O(N) commands.

--- notes
## Memcached
get/set/delete/incr/CAS; opaque values (1 MB default).
Multithreaded; slab classes with per-class LRU; slab rebalancing.
No persistence or replication; client-side consistent hashing; mcrouter for pools and replication.
## Redis
Strings, lists, hashes, sets, sorted sets, bitmaps, HyperLogLog, streams, geo.
Single-threaded command execution (I/O threads since 6.0): atomic commands, Lua, MULTI/EXEC.
One slow command blocks all; scale with more instances.
Persistence: RDB snapshots, AOF (fsync every second typical), both, or none.
Async replicas; Sentinel failover; recent writes can be lost.
Cluster: 16,384 hash slots; CRC16 mod 16384; clients route directly; hash tags {…} co-locate keys.
## Choose
Plain huge cache: Memcached. Structures, counters, leaderboards, limiters, queues, locks: Redis. Some durability: Redis AOF + replicas.
## Habits
Pipelining/MGET · pooling · small values · SCAN not KEYS.

--- doubts
Q: How can a single-threaded Redis be so fast?
A: Each command is a few microseconds of in-memory work, with no locks, no context switching between threads and no disk access on the request path. The bottleneck is usually the network, not the CPU, which is why Redis 6 added threads for network I/O. A single instance commonly handles on the order of 100,000+ simple operations per second; pipelining raises that further.

Q: Can Redis be my primary database?
A: For some data, yes, with AOF persistence and replicas, accepting that a failover can lose the last second or so of writes and that all data must fit in memory (expensive at scale). For data where losing any acknowledged write is unacceptable, or for large datasets, use a real database and keep Redis as a cache or for specialised structures.

Q: Why does Redis Cluster use 16,384 slots instead of consistent hashing?
A: Fixed slots give the same benefit (moving a slot moves only its keys) with simpler bookkeeping: the cluster only needs to track which node owns each of 16,384 slots, and rebalancing means moving whole slots. The number is small enough that the slot map is cheap to exchange between nodes.

Q: Is a Redis lock (SET key value NX PX 30000) safe?
A: Safe enough to reduce duplicate work, not safe for correctness when it matters: an async failover can lose the lock (two holders), and a client paused longer than the expiry can act after losing it. For correctness-critical mutual exclusion, use a consensus-based lock service and fencing tokens (covered in the coordination chapter).

--- exercises
[estimate] A leaderboard of 50 million players stored in one Redis sorted set: each entry ~80 bytes with overhead. Memory? What happens to latency if someone runs ZRANGE 0 -1 on it?
A: 50M × 80 B ≈ 4 GB, which fits in one instance. ZRANGE 0 -1 returns all 50 million entries: an O(N) command taking seconds, during which Redis serves no one else (single-threaded) and the network carries gigabytes. Use paged ranges (ZRANGE with small windows) and ZREVRANK for a player's own position.

[design] Implement a rate limiter of 100 requests per minute per user with Redis, safely under concurrency.
A: Fixed window: `INCR rl:{user}:{minute}` and on the first increment `EXPIRE` 60 s, done atomically with a Lua script or MULTI; reject when the count exceeds 100. Sliding-window or token-bucket variants also run as Lua scripts so the read-modify-write is atomic. Single-threaded execution guarantees no two scripts interleave.

[break] Your Redis primary fails over to a replica. Afterwards, a handful of users can make 2× their rate limit for a minute, and one job ran twice. Explain.
A: Replication is asynchronous: increments and the lock key written to the old primary in the last moments had not reached the replica, so the new primary had lower counters and no lock. Rate limiting tolerates this approximation; the duplicate job does not, so that job needs idempotency (or a fenced lock from a consensus service), not a Redis lock alone.

--- pitfalls
- Running KEYS, huge SMEMBERS/ZRANGE or other O(N) commands on big collections in production
- Treating Redis as durable without configuring persistence and accepting failover loss
- Correctness-critical locks on a single Redis instance
- Multi-key Redis Cluster operations across slots (use hash tags)
- One round trip per key instead of pipelining

--- quiz
Q: Why is every Redis command atomic?
- Redis uses locks on each key
- *Commands execute one at a time on a single thread
- Redis writes every command to disk first
- Clients retry until success
W: No two commands interleave.
Q: Redis Cluster places keys by…
- Random assignment
- *Hashing each key to one of 16,384 slots owned by nodes
- Alphabetical ranges
- The client's IP address
W: CRC16(key) mod 16,384.
Q: Which is a real risk of a Redis primary failover?
- Total data loss
- *Losing writes not yet copied to the replica
- Keys changing type
- Clients reading from the wrong slot forever
W: Replication is asynchronous.
Q: The clearest reason to choose Redis over Memcached is…
- Slightly faster plain gets
- *Atomic data-structure operations (sorted sets, counters, streams) and optional persistence
- Multithreading
- Lower memory use per key
W: Memcached is a simple key-value cache.

--- sources
- article :: Redis documentation: persistence, replication, cluster specification :: Redis :: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- article :: Memcached: how it works (memory allocation, slabs) :: Memcached :: https://github.com/memcached/memcached/wiki/Overview
- paper :: Scaling Memcache at Facebook (NSDI 2013) :: Nishtala et al. :: https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala
- article :: How to do distributed locking :: Martin Kleppmann :: https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html

=== cdn
blurb: Content delivery networks in depth: why serving from the edge matters, how CDN caching is controlled (cache keys, Cache-Control, purges, versioned URLs), origin shields, protecting private content with signed URLs, and what CDNs do for dynamic traffic.
signals: Serving images, video, scripts or downloads worldwide | Origin bandwidth or latency is too high | A deploy must update static files instantly | Private media must not be shareable forever
widgets: seq-cdn
prereq: cache-patterns

--- lesson
:::words
- **CDN (content delivery network)**: a network of servers in many cities that store copies of your content close to users.
- **PoP (point of presence)**: one CDN site, a group of servers in one city.
- **Origin**: your own servers or storage, where the original content lives.
- **Cache key**: what the CDN uses to decide whether two requests want the same object (usually the URL, sometimes plus some headers).
- **Purge (invalidation)**: telling the CDN to drop a cached object before its TTL.
- **Origin shield**: a middle tier of CDN caches that sits between the edges and your origin.
- **Signed URL**: a link that includes an expiry time and a cryptographic signature, so only people you gave it to can use it, and only until it expires.
:::

## The problem in plain words

Images, videos, scripts and downloads are big and requested by people everywhere. Serving them from one data centre means long round trips for distant users and a gigantic outgoing bandwidth bill at the origin. A CDN keeps copies in hundreds of cities, so most requests are answered by a server a few milliseconds from the user, and your origin sees only a trickle. For video and image-heavy products, the CDN is often the single biggest piece of infrastructure.

:::eli5
Instead of one giant bookshop in the capital that ships every book from there, you open small shops in every town stocked with the bestsellers. Most customers buy locally the same day; only an unusual book has to be ordered from the capital, and after that the local shop keeps a copy for the next person who wants it.
:::

## How a request flows

Step through a first request, a repeat, and a purge:

[[widget:seq-cdn]]

1. The user's request reaches the nearest PoP (via DNS mapping or anycast).
2. **Cache hit**: the PoP answers directly. Milliseconds.
3. **Cache miss**: the PoP fetches from the **origin shield** (a regional CDN cache), and only if the shield also misses, from your origin. It stores the object according to its caching headers and serves it.

## Controlling what is cached and for how long

- **`Cache-Control` from the origin decides.** `public, max-age=86400` (anyone may cache for a day), `s-maxage` (a separate TTL for shared caches like CDNs), `private` (browsers only, never CDNs), `no-store` (never cache).
- **Cache key.** By default the URL. Including unnecessary query parameters or headers (a tracking parameter, a random cache-buster) fragments the cache into many copies of the same object and ruins the hit rate; normalise keys.
- **Versioned (fingerprinted) URLs for static assets.** `app.3f9c2.js` instead of `app.js`. Cache them for a year; a deploy changes the file name, so new pages reference new files and nothing needs purging. This is the cleanest invalidation strategy there is.
- **Purges** for things that cannot be versioned (a news article that was corrected): the CDN removes the object from every PoP, typically within seconds. Tag-based purges ("purge everything tagged product-42") help when one change affects many URLs.
- **`stale-while-revalidate` and `stale-if-error`** let the CDN serve slightly old content while refreshing, or when the origin is down, which turns origin outages into invisible events for cached content.

## Origin shield: protecting the origin

With 300 PoPs, a newly popular object could cause 300 separate misses to your origin at once. An **origin shield** (tiered caching) funnels all PoP misses through one or a few regional caches, so the origin sees roughly one request per object per TTL. It also raises the overall hit rate for the long tail of content.

## Private content

- **Signed URLs or signed cookies**: your application generates a URL with an expiry and a signature (for example valid for 10 minutes); the CDN verifies the signature at the edge and serves the cached object. Paid videos, private photos and downloads use this, so the CDN can cache them without making them public.
- Keep personalised responses (`private`) out of shared caches, or vary the cache key carefully.

## Numbers that make the case

A video platform serving 1 Tbit/s of video with a 95% CDN hit rate sends only 50 Gbit/s from its origin (5%). Every percentage point of hit rate is 10 Gbit/s of origin bandwidth here. Latency drops from 100+ ms per round trip to a few ms for most users, which matters doubly because video and image loading involves many round trips.

## CDNs beyond static files

- **Dynamic acceleration**: even uncacheable API requests benefit from TLS termination at the PoP and warm connections over the CDN's backbone (the same idea as the global load-balancing page).
- **Edge compute**: small functions at the PoP (rewrite requests, A/B routing, authentication checks, personalising a cached page).
- **Security**: absorbing DDoS attacks and running a web application firewall at the edge, far from your servers.
- **Video**: segment-based streaming (HLS, DASH) is designed for CDNs: every few seconds of video is a small cacheable file.

## Interview angles

- "How do you serve photos to users worldwide?" Object storage as origin, CDN in front with long-lived versioned URLs, origin shield, signed URLs for private photos.
- "You deployed new CSS but users see the old version." Versioned file names instead of purging; check `Cache-Control`.
- "What's your CDN hit rate and why does it matter?" Origin bandwidth and cost scale with the miss rate; fragmented cache keys and short TTLs are the usual culprits.

--- revise
### Flow
? Path of a CDN miss? :: Edge PoP → origin shield → origin; the object is cached at each tier on the way back.
? What does an origin shield prevent? :: Hundreds of PoPs all missing to the origin for the same object.

### Control
? s-maxage vs max-age? :: s-maxage applies to shared caches (CDNs); max-age to all caches including browsers.
? `private` in Cache-Control? :: Browsers may cache it; CDNs and other shared caches must not.
? Best invalidation strategy for static assets? :: Versioned (fingerprinted) URLs with year-long TTLs; deploys change the names.
? What ruins CDN hit rate through keys? :: Unneeded query parameters or headers in the cache key, fragmenting copies.
? stale-if-error? :: Serve the cached copy when the origin is failing.

### Private and dynamic
? How does a CDN cache private content safely? :: Signed URLs or cookies with expiry, verified at the edge.
? What does a CDN do for uncacheable API traffic? :: Terminates TLS near users and forwards over warm backbone connections.

--- notes
## Flow
User → nearest PoP (DNS or anycast) → hit, or miss → origin shield → origin.
## Control
Cache-Control: public / private / no-store; max-age (all caches) vs s-maxage (shared caches).
Cache key = URL (normalise; drop tracking params; vary only on needed headers).
Versioned asset URLs + 1-year TTL = no purges needed.
Purges (by URL or tag) for unversionable content; seconds to propagate.
stale-while-revalidate, stale-if-error.
## Origin shield
Tiered caching: PoP misses funnel through regional shields; ~1 origin fetch per object per TTL.
## Private content
Signed URLs/cookies with short expiry; personalised responses stay private.
## Numbers
Origin traffic = total × miss rate; at 1 Tbit/s each 1% of hit rate = 10 Gbit/s.
## Beyond static
Dynamic acceleration (edge TLS + backbone) · edge compute · DDoS absorption and WAF · segment-based video (HLS/DASH).

--- doubts
Q: Why not just purge on every deploy instead of versioning file names?
A: Purges take time to reach every PoP, browsers have their own copies (which purges cannot touch), and a page might load new HTML with old CSS during the window. Versioned names avoid all of that: old pages keep loading old files, new pages load new files, and nothing in any cache is ever wrong.

Q: Can a CDN cache API responses?
A: Yes, if they are the same for many users and you mark them cacheable (`public, s-maxage=…`), like a product catalogue or a trending list. Personalised responses should not be cached in shared caches unless the cache key includes the user, which usually defeats the purpose.

Q: What is the difference between a CDN and object storage?
A: Object storage (Google Cloud Storage, S3) is where files durably live, usually in one region: the origin. A CDN is a distributed cache in front of it that serves copies from near users. You almost always use both: storage for durability and as the source, the CDN for delivery.

Q: Does a CDN help users close to my data centre?
A: Less for latency, but still a lot for origin load and bandwidth cost, and for absorbing traffic spikes and attacks. The latency benefit grows with distance.

--- exercises
[estimate] An image service delivers 400 Gbit/s at peak. CDN hit rate is 92%. Origin bandwidth? If cache-key normalisation raises the hit rate to 98%?
A: Origin = 8% × 400 = 32 Gbit/s. At 98%: 2% × 400 = 8 Gbit/s, four times less. Hit-rate improvements at the top end have huge effects on the origin.

[break] You deployed a CSS fix at 10:00, purged `/styles/main.css` from the CDN, but some users still see broken pages at 10:30. Why?
A: Browsers cached `main.css` themselves according to its max-age, and purging the CDN does not touch browser caches; some PoPs may also have taken time to purge. Fix: fingerprinted file names (`main.8c1f.css`) referenced from the HTML, with a short TTL on the HTML and a long one on assets.

[design] A paid course platform serves video lessons only to enrolled users and wants CDN caching. Design the delivery.
A: Store video segments (HLS/DASH) in object storage as the origin behind a CDN with an origin shield. The application checks enrolment and returns a playlist whose segment URLs are signed with an expiry (say 1 hour, or a signed cookie covering the course path). The CDN verifies signatures at the edge and serves cached segments; unsigned or expired requests are rejected. Cache keys exclude the signature so all users share the same cached segments.

--- pitfalls
- Purging instead of using versioned asset URLs
- Cache keys fragmented by tracking parameters or unnecessary headers
- Marking personalised responses as public
- No origin shield in front of an origin that cannot take many simultaneous misses
- Making private media permanently public instead of using signed URLs

--- quiz
Q: The cleanest way to update static JavaScript served through a CDN is…
- Purge after each deploy
- Set max-age=0
- *Fingerprinted file names with long TTLs
- Disable the CDN during deploys
W: New content gets new names; nothing cached is ever wrong.
Q: An origin shield…
- Encrypts the origin
- *Funnels edge misses through a regional cache so the origin sees far fewer requests
- Blocks DDoS attacks only
- Replaces object storage
W: Tiered caching collapses many PoP misses into one origin fetch.
Q: `Cache-Control: private` means…
- Encrypt the response
- *Only the browser may cache it; shared caches like CDNs must not
- Nobody may cache it
- Cache it for one user at the CDN
W: Use no-store to forbid caching entirely.
Q: How can a CDN cache paid videos without making them public?
- It cannot
- *Signed URLs or cookies with expiry, verified at the edge
- By using HTTP/3
- By shortening TTLs
W: The object is cached once; access is checked per request at the edge.

--- sources
- paper :: RFC 9111: HTTP Caching :: IETF :: https://www.rfc-editor.org/rfc/rfc9111
- article :: Cloud CDN overview and caching :: Google Cloud :: https://cloud.google.com/cdn/docs/overview
- article :: Signed URLs and signed cookies (Cloud CDN) :: Google Cloud :: https://cloud.google.com/cdn/docs/using-signed-urls
- paper :: The Akamai Network: A Platform for High-Performance Internet Applications (ACM SIGOPS 2010) :: Nygren, Sitaraman, Sun :: https://dl.acm.org/doi/10.1145/1842733.1842736
- book :: High Performance Browser Networking, ch. 10 (Primer on web performance) :: Ilya Grigorik :: https://hpbn.co/primer-on-web-performance/
