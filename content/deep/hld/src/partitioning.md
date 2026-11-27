=== partition-schemes
blurb: Splitting data across machines when it no longer fits or no longer keeps up on one: range partitioning, hash partitioning and directory-based placement, what each makes cheap and expensive, and how to pick a partition key.
signals: Data or write rate beyond one machine | Choosing a shard key | Range queries over partitioned data | One shard far busier than the others
widgets: partition-load

--- lesson
:::words
- **Partition (shard)**: one slice of a dataset, stored and served by one machine (and its replicas).
- **Partitioning (sharding)**: splitting a dataset into partitions spread across machines.
- **Partition key**: the field used to decide which partition a record belongs to.
- **Range partitioning**: each partition holds a continuous range of keys (A–F, G–M…).
- **Hash partitioning**: each key's hash decides its partition, scattering neighbouring keys.
- **Directory (lookup) partitioning**: a separate table records which partition holds each key or group.
- **Scatter-gather**: sending a query to every partition and combining the answers.
:::

## The problem in plain words

Replication copies the same data to several machines; it does not help when the data itself is too big for one machine, or there are more writes than one machine can absorb. Then you must **split** the data: each machine owns part of it. The question is how to split, because the split decides which queries touch one machine (fast) and which must ask all of them (slow), and whether load ends up even or piled onto one unlucky machine.

:::eli5
A library too big for one building is split across several. Shelving by surname range (A–F here, G–M there) keeps related books together, so "all authors starting with Sm" is one building; but if everyone suddenly wants authors starting with S, one building is mobbed. Assigning each author to a building by a random-looking code spreads visitors evenly, but "all authors starting with Sm" now means visiting every building.
:::

## Range partitioning

Keys are sorted, and each partition takes a contiguous range: users `a…f`, `g…m`, …; or timestamps by day.

- **Cheap**: range queries (`created_at between X and Y`, all keys with a prefix) touch only the partitions covering that range. Data is kept sorted, so scans are efficient.
- **Risk: hot spots.** If writes concentrate on one end of the key space (timestamps, auto-increment IDs), every new write hits the last partition. Popular ranges (one famous prefix) overload one machine.
- Partition boundaries must be chosen and adjusted as data grows (systems like Bigtable and HBase split ranges automatically when they get too big).
- Used by Bigtable, HBase, Spanner (by key ranges called splits), and MongoDB range sharding.

## Hash partitioning

Compute a hash of the key and assign by hash range (or with consistent hashing, next page).

- **Cheap**: spreading load evenly, even for sequential keys; point lookups by key.
- **Expensive**: range queries, because neighbouring keys are scattered; a range scan must ask every partition.
- Used by Cassandra and DynamoDB (on the partition key), Redis Cluster (hash slots), most key-value stores.

A common compromise is a **compound key**: hash the first part to choose the partition, keep the second part sorted within it. Cassandra's `(partition key, clustering key)` and DynamoDB's `(partition key, sort key)` do exactly this: hash on `user_id` spreads users evenly, and within a user, posts sorted by time allow efficient "latest posts by this user" range scans.

Compare where writes and range queries land under each scheme:

[[widget:partition-load]]

## Directory-based partitioning

A lookup service maps keys (or groups like tenants) to partitions explicitly. Maximum flexibility (move a big customer to their own shard, place data by geography), at the cost of an extra lookup on the path (usually cached) and a critical metadata service to keep available. Large multi-tenant SaaS systems often shard by tenant through a directory.

## Choosing a partition key

Ask, in order:
1. **What is the most frequent query, and does it include the key?** Queries that include the partition key go to one partition; others scatter.
2. **Is the key high-cardinality and evenly used?** User ID: good. Country: bad (a few countries dominate). Date: bad for writes (today is hot).
3. **Does data that is read or updated together share the key?** A conversation's messages under one chat ID; an order and its items under one order ID. Cross-partition transactions are expensive.
4. **Will one key grow huge?** A single celebrity or giant tenant can outgrow a partition (see hot keys).

## Interview angles

- "How do you shard this?" Name the key, the scheme, why it matches the main query, and its hot-spot risk.
- "Range or hash?" Range for range scans and sorted data (watch for hot ends); hash for even load (lose efficient ranges); compound keys for both.
- "How do you query by something other than the shard key?" Secondary indexes (local or global) or a separate copy organised by that field.

--- revise
### Schemes
? Range partitioning's strength and risk? :: Efficient range scans; hot spots when writes hit one end (timestamps, sequential IDs) or a popular range.
? Hash partitioning's strength and cost? :: Even load and fast point lookups; range queries must ask every partition.
? Compound key (hash + sort)? :: Hash the first part to pick the partition; sort by the second part within it (Cassandra, DynamoDB).
? Directory partitioning? :: A lookup service maps keys or tenants to partitions: flexible, but an extra hop and critical metadata.

### Keys
? Four questions for a partition key? :: Is it in the main query? High-cardinality and even? Shared by data read/updated together? Can one key grow huge?
? Why is "country" a bad partition key? :: Low cardinality and skewed: a few countries dominate.
? Why is a timestamp a bad leading key for writes? :: All new writes go to the newest range: one hot partition.

--- notes
## Range
Contiguous sorted key ranges per partition; efficient range scans and prefixes.
Hot spots: monotonic keys (time, auto-increment) and popular ranges.
Boundaries split automatically as data grows (Bigtable tablets, Spanner splits, HBase regions).
## Hash
hash(key) → partition; even load; point lookups.
Range queries scatter to every partition.
Cassandra, DynamoDB, Redis Cluster slots.
## Compound
(partition key, sort key): hash the first, sort by the second.
"Latest posts of user X" = one partition, one range scan.
## Directory
Explicit key/tenant → shard map; flexible placement; extra lookup; must be highly available.
## Picking the key
In the main query · high cardinality, even use · co-locate data read/updated together · beware huge single keys.
Queries without the key → scatter-gather or a secondary index.

--- doubts
Q: When do I actually need to partition?
A: When one machine (with replicas for reads) can no longer hold the data, absorb the write rate, or keep its working set in memory. Estimate first: many products never need it. Partitioning adds real costs (cross-partition queries, transactions, rebalancing), so do it when the numbers demand it and say which number triggered it.

Q: Can I partition and replicate at the same time?
A: Yes, and you always do: each partition is replicated (typically 3 copies) so a machine failure loses no partition. A cluster of 30 machines might hold 100 partitions × 3 replicas, with each machine hosting about 10 partition replicas.

Q: What happens to a query that doesn't include the partition key?
A: It must be sent to every partition and the results combined (scatter-gather). That is fine occasionally, but at high rates it multiplies load by the number of partitions and makes latency depend on the slowest partition. Frequent queries by another field deserve a secondary index or a second copy of the data keyed by that field.

Q: How many partitions should I create?
A: Usually more than machines (say 10–100× or a fixed large number), so you can rebalance by moving whole partitions between machines instead of re-splitting data. Too many tiny partitions add per-partition overhead; too few limit how evenly you can spread load. The rebalancing page covers this.

--- exercises
[choose] A metrics system stores (metric_name, timestamp, value) and queries "metric X over the last hour". Range-partition by timestamp, hash by metric name, or compound?
A: Compound: partition by hash of metric_name (spreads write load across metrics; avoids the "now" hot spot of timestamp partitioning) and sort by timestamp within each partition, so "metric X, last hour" is a single-partition range scan. Pure timestamp ranges would send all current writes to one partition; pure hash would scatter one metric's time range.

[design] Choose a shard key for a multi-tenant SaaS app where tenants range from 5 users to 200,000 users.
A: Shard by tenant_id through a directory: most tenants share shards (packed by size), while the few largest tenants get dedicated shards or are sub-partitioned by (tenant_id, user_id). All of a tenant's data stays together for joins and transactions within the tenant. The directory (cached) tells the app which shard serves each tenant and lets you move tenants without changing keys.

[estimate] Orders are hash-partitioned across 64 partitions by order_id. A support dashboard runs "orders by customer X" 2,000 times per second. How many partition requests per second does that create, and what would you do?
A: Each query scatters to 64 partitions: 2,000 × 64 = 128,000 partition requests per second, most returning nothing. Add a secondary access path: a global index or a separate table partitioned by customer_id (customer → order IDs), so each dashboard query hits one partition.

--- pitfalls
- Partitioning before the numbers require it
- Timestamps or auto-increment IDs as the leading partition key
- Low-cardinality keys (country, status)
- Frequent queries that don't include the partition key
- Splitting data that must be updated together into different partitions

--- quiz
Q: Which scheme makes "all orders from 2026-11-01 to 2026-11-07" cheapest?
- Hash partitioning on order_id
- *Range partitioning on date
- Random placement
- Directory by customer
W: The date range maps to a few contiguous partitions.
Q: Hash partitioning's main cost is…
- Uneven load
- *Range queries must ask every partition
- Slow point lookups
- No replication
W: Neighbouring keys are scattered.
Q: A compound (partition key, sort key) design lets you…
- Avoid replication
- *Spread load by the first part and range-scan by the second within a partition
- Skip indexes entirely
- Use any field in queries
W: Even distribution plus sorted access within each key.
Q: Why is user_id usually a better partition key than country?
- It is shorter
- *Many distinct, evenly used values spread load; a few countries would dominate
- Countries change
- Databases can't hash strings
W: Cardinality and evenness prevent hot partitions.

--- sources
- book :: Designing Data-Intensive Applications, ch. 6 (Partitioning) :: Martin Kleppmann :: https://dataintensive.net/
- paper :: Bigtable: A Distributed Storage System for Structured Data (OSDI 2006) :: Chang et al. :: https://research.google/pubs/bigtable-a-distributed-storage-system-for-structured-data/
- article :: Choosing a partition key (DynamoDB) :: AWS :: https://aws.amazon.com/blogs/database/choosing-the-right-dynamodb-partition-key/
- article :: Sharding (MongoDB manual): ranged and hashed sharding :: MongoDB :: https://www.mongodb.com/docs/manual/sharding/

=== consistent-hashing
blurb: How to assign keys to servers so that adding or removing a server moves only a small share of keys: the hash ring, virtual nodes for balance, rendezvous (highest-random-weight) hashing, Google's jump and Maglev hashing, and bounded loads.
signals: Distributing cache keys across servers | Adding or removing nodes without reshuffling everything | Explaining Dynamo, Cassandra or a CDN's placement | Sticky routing without hot spots
widgets: consistent-hash
prereq: partition-schemes

--- lesson
:::words
- **Hash function**: turns any key into a number that looks random, the same key always giving the same number.
- **Modulo (hash % N)**: the remainder after dividing by N; the naive way to map hashes to N servers.
- **Hash ring**: the range of hash values bent into a circle, with servers placed at points on it.
- **Virtual node (vnode)**: one of many points a single physical server takes on the ring.
- **Rendezvous hashing**: each key picks the server with the highest score for that key.
- **Remapping**: keys moving to a different server after the server set changes.
:::

## The problem in plain words

The simplest way to spread keys over N servers is `server = hash(key) % N`. It balances well until N changes. Add one server to ten, and `% 10` becomes `% 11`: almost every key (about 10/11 of them) now maps to a different server. For a cache, that means nearly every lookup misses at once and the database is hammered. For a stateful store, it means moving almost all the data. **Consistent hashing** keeps assignments stable: when a server is added or removed, only about 1/N of the keys move.

:::eli5
Seats around a round table, with names of guests (keys) and waiters (servers) placed at points around it. Each guest is served by the first waiter clockwise from their seat. A new waiter joining only takes over the guests between themself and the previous waiter; nobody else changes waiter.
:::

## The hash ring

1. Hash each server's name to a point on a circle of hash values (say 0 to 2³²).
2. Hash each key to a point on the same circle.
3. A key belongs to the **first server clockwise** from it.

Adding a server: it takes over only the keys between its point and the previous server's point. Removing one: its keys pass to the next server clockwise. Either way, about **1/N** of keys move, instead of almost all.

Try it: add and remove servers, and compare the keys moved with `hash % N`:

[[widget:consistent-hash]]

## Virtual nodes

With one point per server, the arcs between servers are uneven (random placement), so some servers own far more keys than others, and when a server leaves, its whole load lands on a single neighbour. Giving each server **many points** (virtual nodes, often 100–256) evens out ownership and spreads a departing server's keys across many others. Virtual nodes also allow **weighting**: a bigger machine takes more points. Dynamo and Cassandra (older default) use vnodes.

## Alternatives worth knowing

- **Rendezvous (highest random weight) hashing.** For each key, compute `score(key, server)` for every server and pick the highest. Adding or removing a server only moves keys whose top choice changed (about 1/N). No ring to maintain; computing N scores per key is fine for tens or hundreds of servers. Easy to get the "top k" servers for replication.
- **Jump consistent hash** (Google, 2014). A few lines of arithmetic map a key to one of N buckets with perfect balance and minimal movement, using no memory, but buckets can only be added or removed at the end (good for numbered shards, not arbitrary server names).
- **Maglev hashing** (Google's load balancer, 2016). Builds a lookup table so each backend gets an almost equal share and few connections move when backends change; designed for packet-rate speed.
- **Consistent hashing with bounded loads** (Google, 2017). Caps each server at, say, 1.25× the average load; keys that would exceed it go to the next server. Keeps the stability of consistent hashing without hot spots from popular keys.

## Where it is used

Distributed caches (clients choosing a Memcached server), Dynamo-style databases (choosing replicas: the next N distinct servers clockwise), CDNs and load balancers (sticky routing of a URL or connection to a server), and request routing to stateful services.

## Interview angles

- "Why not hash % N?" Changing N remaps almost every key: mass cache misses or mass data movement.
- "What do virtual nodes solve?" Uneven arcs and lumpy redistribution; they also allow weights.
- "How are replicas chosen in Dynamo/Cassandra?" Walk clockwise from the key and take the next N distinct physical servers.

--- revise
### Core
? What goes wrong with hash % N when N changes? :: Almost every key maps to a different server (about N/(N+1) move).
? Consistent hashing in one sentence? :: Servers and keys on a hash ring; each key goes to the next server clockwise, so a server change moves ~1/N of keys.
? What do virtual nodes fix? :: Uneven arcs between servers, and a departing server dumping its load on one neighbour; also allow weights.

### Variants
? Rendezvous hashing? :: Each key picks the server with the highest score(key, server); minimal movement, no ring.
? Jump consistent hash's limitation? :: Buckets can only be added or removed at the end (numbered shards).
? Bounded-load consistent hashing? :: Caps each server at ~1.25× average, spilling extra keys to the next server.
? How does Dynamo pick replicas? :: The next N distinct physical servers clockwise from the key.

--- notes
## Problem
hash % N: changing N remaps ~N/(N+1) of keys → cache stampede or mass data movement.
## Ring
Hash servers and keys onto a circle; key → first server clockwise.
Add/remove one server → ~1/N of keys move.
## Virtual nodes
100–256 points per server; even ownership; departing load spreads to many; weights by point count.
## Variants
Rendezvous / HRW: max score(key, server); simple; O(N) per lookup; easy top-k for replicas.
Jump hash (Google 2014): no memory, perfect balance, buckets only at the end.
Maglev hashing (Google 2016): lookup table; near-equal shares; minimal disruption at packet speed.
Bounded loads (Google 2017): cap ~1.25× average.
## Uses
Cache client sharding · Dynamo/Cassandra replica placement · CDN/LB sticky routing · stateful service routing.

--- doubts
Q: Does consistent hashing guarantee even load?
A: No. It guarantees that few keys move when servers change. Balance depends on how evenly the points land (virtual nodes help a lot) and on key popularity: one extremely hot key still lives on one server, whatever the hashing scheme. Bounded loads and hot-key techniques handle the latter.

Q: Why exactly do about 1/N of the keys move?
A: A new server lands on the ring and takes over only the arc between itself and its predecessor. With N servers spread evenly, each arc holds about 1/N of the keys, so that is what moves; every other key keeps its server.

Q: Which should I mention in an interview, ring or rendezvous?
A: The ring with virtual nodes is the classic expected answer. Mentioning rendezvous hashing (simpler, no ring) or bounded loads (no hot spots) as refinements shows depth. Jump hash and Maglev are bonus points for Google-specific context.

Q: How do clients learn about the ring?
A: Either every client has the server list and computes the ring itself (common for cache clients, configured or discovered via a registry), or the servers share ring membership via gossip and route requests to the right owner (Cassandra, Dynamo), or a proxy/coordinator does the routing.

--- exercises
[estimate] A cache cluster of 20 servers uses hash % N. You add 1 server. What fraction of keys move, and what happens at 100k reads/s with a 98% hit rate before the change?
A: With % 21 instead of % 20, a key keeps its server only if hash % 20 == hash % 21, about 1 in 21: so ~95% of keys move. Nearly every read misses for a while: the database goes from ~2,000 reads/s (2% misses) to up to ~95,000/s. With consistent hashing, only ~1/21 ≈ 5% move: misses rise to roughly 7,000/s briefly.

[design] Three cache servers have very different memory: 64, 64 and 128 GB. How would consistent hashing reflect that?
A: Give each server virtual nodes in proportion to capacity: e.g. 100, 100 and 200 points. The large server then owns about half the ring (200 of 400 points) and receives about half the keys, while additions or removals still move a minimal share.

[choose] You route user sessions to stateful game servers and want stability on scale-up, but one streamer's lobby gets 50× normal traffic. Plain ring, ring with bounded loads, or rendezvous?
A: Consistent hashing with bounded loads: stable placement for most users, and when the popular server exceeds its cap (e.g. 1.25× average), new sessions spill to the next server instead of overloading it. Plain ring or rendezvous alone would pile the hot lobby's traffic onto one server.

--- pitfalls
- hash % N for caches or shards that will change size
- One point per server (uneven load, lumpy failover)
- Assuming consistent hashing fixes single hot keys
- Forgetting replicas must be distinct physical servers when walking the ring
- Clients with inconsistent server lists (different rings)

--- quiz
Q: Adding one server to 10 with hash % N moves roughly…
- 10% of keys
- 50% of keys
- *About 90% of keys
- No keys
W: Only keys with equal hash % 10 and hash % 11 stay (about 1 in 11).
Q: With consistent hashing, adding one server to N moves about…
- *1/N of the keys
- Half the keys
- All keys
- No keys
W: Only the new server's arc changes owner.
Q: Virtual nodes mainly help…
- Encrypt keys
- *Balance ownership and spread a departing server's load across many servers
- Make lookups faster
- Avoid replication
W: Many points per server smooth out the random arcs.
Q: Rendezvous hashing assigns a key to…
- The next server clockwise
- *The server with the highest score for that key
- A random server
- The least loaded server
W: Highest random weight; minimal movement on changes.

--- sources
- paper :: Consistent Hashing and Random Trees (STOC 1997) :: Karger et al. :: https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/chash.pdf
- paper :: A Fast, Minimal Memory, Consistent Hash Algorithm (jump hash, 2014) :: Lamping, Veach (Google) :: https://arxiv.org/abs/1406.2294
- paper :: Maglev: A Fast and Reliable Software Network Load Balancer (NSDI 2016) :: Eisenbud et al. :: https://research.google/pubs/maglev-a-fast-and-reliable-software-network-load-balancer/
- article :: Consistent Hashing with Bounded Loads :: Google Research :: https://research.google/blog/consistent-hashing-with-bounded-loads/
- paper :: A Name-Based Mapping Scheme for Rendezvous (1996) :: Thaler, Ravishankar :: https://www.eecs.umich.edu/techreports/cse/96/CSE-TR-316-96.pdf

=== hot-keys
blurb: When one key, one partition or one user gets a huge share of traffic: detecting skew, the celebrity problem in feeds and counters, and the toolbox of salting, splitting, local caching, write batching and special-casing big accounts.
signals: One shard or cache server at 100% while others idle | Celebrity users, viral posts, flash sales | Counters receiving thousands of increments per second | "What if Taylor Swift posts?"
widgets: partition-load
prereq: consistent-hashing

--- lesson
:::words
- **Skew**: uneven distribution of data or traffic across partitions.
- **Hot key**: a single key with far more traffic than others.
- **Hot partition**: a partition overloaded because of hot keys or a bad partition key.
- **Salting (key splitting)**: appending a small random or computed suffix to a key so its traffic spreads over several partitions.
- **Fan-out**: one event (a post) causing work for many others (delivering to every follower's feed).
- **Celebrity problem**: users with enormous follower counts break designs that treat every user the same.
:::

## The problem in plain words

Hashing spreads *keys* evenly, but real traffic is not spread evenly over keys. One viral video, one celebrity, one flash-sale product or one giant customer can receive more requests than an entire machine can serve, and no amount of re-hashing helps, because a single key always lands on a single partition. Senior designs anticipate this skew and handle the hot minority differently from the ordinary majority.

:::eli5
A post office sorts mail into boxes by surname, and it works well, until a celebrity moves to town and receives a hundred thousand letters a day. Their box overflows however you sort the others. You need special handling just for them: several boxes, extra staff, or a different process entirely.
:::

## Detecting hot keys

- Per-partition metrics (requests, CPU) reveal hot partitions; per-key sampling or a Count-Min sketch over requests reveals which keys.
- Many systems publish this: Bigtable's Key Visualizer heat maps, Redis's hot-key reporting, DynamoDB's contributor insights.
- Design-time detection: ask "what is the largest single key?" (the biggest follower count, the biggest tenant, the busiest product) during estimation.

## Hot reads

- **Cache with local copies**: a short-lived in-process cache on each app server absorbs most reads of a hot item.
- **Replicate the key**: store copies under `key#1 … key#k` on different partitions; readers pick one at random; writers update all (or invalidate all).
- **Read replicas** for the hot partition, or a CDN for hot static content.

## Hot writes

- **Salting / split counters**: a like counter for a viral post becomes 50 sub-counters `likes:post42:0 … :49`; each like increments a random one; reading sums them (and caches the sum briefly). Write capacity grows 50×.
- **Batch in memory**: app servers aggregate increments for a second and write one combined update.
- **Append, aggregate later**: write each event to a log or stream (cheap, spreads easily), and compute totals asynchronously.

Watch a celebrity key overload one partition, then split it:

[[widget:partition-load]]

## The celebrity problem in feeds

With **fan-out on write** (when someone posts, push the post ID into every follower's precomputed feed), a user with 100M followers turns one post into 100M writes: minutes of work and a backlog for everyone. With **fan-out on read** (build the feed at read time from followees' recent posts), a user following 2,000 accounts makes every feed load query 2,000 timelines.

The standard answer is **hybrid**: fan out on write for ordinary users (fast reads, bounded write cost), and for celebrities (above a follower threshold) skip the fan-out; at read time, merge the few celebrities a user follows into their precomputed feed. Twitter described exactly this approach.

## Big tenants and huge partitions

A partition key that is fine on average can still have one enormous value (one customer with 100× the data of others). Options: give that tenant its own shard (directory-based placement), sub-partition its data by a second field ((tenant, user), (tenant, month)), or cap and archive.

## Interview angles

- "What if a celebrity posts?" Hybrid fan-out; never deliver to 100M feeds synchronously.
- "A product's page gets 500k reads/s in a flash sale." Local caching, key replication, CDN; inventory as a separate sharded counter.
- "A counter gets 50k increments/s." Split counters or in-memory aggregation; reads sum and cache.

--- revise
### Why it happens
? Why can't better hashing fix a hot key? :: A single key always maps to a single partition.
? How do you find hot keys? :: Per-partition metrics plus per-key sampling or a Count-Min sketch (and tools like Bigtable Key Visualizer).

### Fixes
? Hot read fixes? :: Short local in-process caches, replicate the key under several names, read replicas/CDN.
? Hot write counter fixes? :: Split into sub-counters (salting) and sum on read; batch increments in memory; append events and aggregate later.
? Celebrity feed solution? :: Hybrid: fan-out on write for normal users, merge celebrity posts at read time.
? A giant tenant? :: Its own shard via a directory, or sub-partition by a second field.

--- notes
## Detect
Per-partition load metrics · per-key sampling / Count-Min sketch · Bigtable Key Visualizer, Redis hot keys, DynamoDB contributor insights.
Ask "largest single key?" during estimation.
## Hot reads
Local in-process cache (seconds) · key#1..key#k replicas · read replicas · CDN.
## Hot writes
Split counters: key:0..k-1; random shard per increment; sum (cached) on read.
In-memory batching per server; flush every second.
Log events; aggregate asynchronously.
## Celebrity fan-out
Fan-out on write: post → every follower's feed (100M writes for a celebrity).
Fan-out on read: merge followees at read time (expensive for heavy followers).
Hybrid: write fan-out for normal users; read-time merge for celebrities above a threshold (Twitter).
## Giant keys/tenants
Dedicated shard (directory) · sub-partition by (tenant, user|month) · archive.

--- doubts
Q: How many sub-counters should a split counter use?
A: Enough that each sub-counter's write rate is comfortably within one partition's capacity: if a key can take ~1,000 writes/s and you expect 50,000, use at least 50 (with headroom, 100). The cost is on reads (summing more keys), which is why the sum is cached for a second or two.

Q: Where is the celebrity threshold?
A: Wherever fan-out on write becomes too slow or too costly: often tens or hundreds of thousands of followers. It doesn't need to be exact; the point is that a tiny fraction of accounts get special handling and the vast majority get the cheap common path.

Q: Isn't key replication just caching?
A: It's a form of it, applied inside the store: the same value is stored under several keys that hash to different partitions, so reads can be spread. The cost is that writes must update (or invalidate) every copy, so it suits hot keys that are read far more than they are written.

Q: Do hot keys matter for small systems?
A: Less, because one machine has room to spare. They appear as a system grows and a single key's traffic exceeds what one partition can handle, typically at hundreds of thousands of requests per second for one key. In an interview at Google scale, assume they will happen and say how you'd handle them.

--- exercises
[estimate] A viral post gets 80,000 likes per second. One partition sustains 2,000 writes per second for a single key. How many sub-counters do you need, and how do you read the total?
A: 80,000 / 2,000 = 40 sub-counters minimum; use ~80 for headroom. Each like increments a random sub-counter. Reading the total sums 80 keys, cached for 1–2 seconds so the sum is computed at most once or twice per second regardless of read traffic.

[design] Design feed delivery for a social app where most users have under 1,000 followers but 0.01% have over 1 million.
A: Hybrid fan-out. For ordinary authors, on post: a worker pushes the post ID into each follower's feed list (in a cache/KV store) asynchronously via a queue. For authors above a threshold (say 100k followers): don't fan out; store their posts in their own timeline. On feed read: take the precomputed feed, fetch the recent posts of the few celebrities the user follows, merge by time and rank. Writes stay bounded; reads add a handful of lookups.

[break] A Bigtable table keyed by (product_id) holds a "views" column incremented on every page view. During a flash sale the product's tablet server pegs at 100% and requests time out. Why, and what fix?
A: Every view of the hot product increments the same row, which lives on one tablet server: a hot key on writes. Fix: stop incrementing per view: aggregate views in app memory or a stream and write totals periodically, or split the counter across several rows (product_id#0..k) and sum on read.

--- pitfalls
- Assuming hashing removes hot spots
- Synchronous fan-out of a celebrity's post to every follower
- Single counter rows for very hot items
- No plan for the biggest tenant or user
- Not measuring per-key traffic

--- quiz
Q: A single key gets more traffic than one partition can handle. Which helps?
- Rehashing with a better hash function
- *Splitting the key into sub-keys (salting) or replicating it
- Adding more partitions
- Range partitioning
W: A key lives in one place; you must make it several keys.
Q: The usual fix for the celebrity feed problem is…
- Fan-out on write for everyone
- Fan-out on read for everyone
- *Hybrid: fan-out on write for normal users, merge celebrity posts at read time
- No feed
W: Special-case the tiny hot minority.
Q: A split counter's read cost is…
- Nothing extra
- *Summing all sub-counters (usually cached briefly)
- A full table scan
- A distributed transaction
W: Write capacity is bought with slightly costlier reads.
Q: Which tool finds hot keys cheaply in a request stream?
- Bloom filter
- *Count-Min sketch / top-k sampling
- B-tree
- Consistent hashing
W: Approximate per-key counts in small memory.

--- sources
- article :: Timelines at Scale (Twitter fan-out, QCon 2013) :: Raffi Krikorian :: https://www.infoq.com/presentations/Twitter-Timeline-Scalability/
- article :: Key Visualizer for Bigtable :: Google Cloud :: https://cloud.google.com/bigtable/docs/keyvis-overview
- article :: Sharding counters (App Engine) :: Google Cloud :: https://cloud.google.com/appengine/articles/sharding_counters
- book :: Designing Data-Intensive Applications, ch. 1 (Twitter example) and ch. 6 (skewed workloads) :: Martin Kleppmann :: https://dataintensive.net/

=== partitioned-indexes
blurb: Querying partitioned data by something other than its key: local (document-partitioned) indexes that need scatter-gather reads, global (term-partitioned) indexes that need cross-partition writes, and how real systems keep them in sync.
signals: "Find orders by customer" when orders are sharded by order ID | Search and filter on partitioned data | DynamoDB or Cassandra secondary indexes | Choosing between fan-out reads and extra writes
widgets: seq-partitioned-index
prereq: partition-schemes

--- lesson
:::words
- **Secondary index**: an index on a field other than the partition (primary) key.
- **Local index (document-partitioned)**: each partition indexes only its own records.
- **Global index (term-partitioned)**: the index is partitioned by the indexed value itself, independent of where records live.
- **Scatter-gather**: asking every partition and merging their answers.
- **Index lag**: the delay between a record changing and its index entry reflecting that.
:::

## The problem in plain words

Partitioning by one key makes queries by that key fast and everything else slow. Orders sharded by `order_id` answer "get order 98231" from one partition, but "all orders of customer 42" could be on any partition. A secondary index helps, but in a partitioned system the index itself must be partitioned somehow, and there are only two ways: **next to the data** (each partition indexes its own records) or **by the indexed value** (all of customer 42's entries in one index partition). One makes reads expensive, the other makes writes expensive.

:::eli5
A shoe company has warehouses organised by order number. To find every order for one customer, you can phone every warehouse and ask each to check its own customer list (local index), or keep a central book, split alphabetically by customer name, that lists where each customer's orders are (global index), which you must update every time anyone orders anything.
:::

## Local (document-partitioned) indexes

Each partition maintains an index of its own records only. Writes are simple: the record and its index entry live on the same partition, updated together (often in one local transaction).

Reads by the indexed field must **scatter to all partitions** and gather results. With 100 partitions, every "orders by customer" query costs 100 partition requests, and its latency is set by the slowest of them (the tail-at-scale problem).

Used by: MongoDB secondary indexes on sharded collections, Cassandra secondary indexes, Elasticsearch (each shard indexes its documents; queries go to all shards).

## Global (term-partitioned) indexes

The index is its own partitioned dataset, keyed by the indexed value: all entries for `customer_id = 42` live in one index partition, which lists the order IDs. Reads go to **one** index partition, then fetch the orders (possibly from several data partitions).

Writes are the cost: inserting one order updates its data partition **and** the index partition for its customer, usually a different machine. Doing that atomically needs a distributed transaction; most systems instead update global indexes **asynchronously**, so the index can briefly lag behind the data.

Used by: DynamoDB global secondary indexes (asynchronous), Spanner secondary indexes (synchronous, transactional, at higher write cost), many search systems.

Step through a write and a read with each kind of index:

[[widget:seq-partitioned-index]]

## Choosing

| | Local index | Global index |
|---|---|---|
| Write cost | Low (same partition) | Higher (another partition; async or distributed transaction) |
| Read by indexed field | All partitions (scatter-gather) | One index partition (+ fetches) |
| Freshness | Immediate | Often slightly behind (async) |
| Good when | Indexed queries are rare, or partitions are few | Indexed queries are frequent and must be fast |

A third option is to **denormalise into a second table** partitioned by the other field (an `orders_by_customer` table keyed by (customer_id, created_at, order_id)), written alongside the main one (synchronously or via a stream). It is a hand-built global index, often the most practical in key-value stores.

## Interview angles

- "Orders are sharded by order ID; how do you list a customer's orders?" A global index or a second table keyed by customer_id, updated asynchronously; or shard by customer in the first place if that is the main access path.
- "Why are search queries sent to every shard?" Search engines partition by document (local indexes), so every shard must be asked; that is why they keep shard counts moderate and use replicas for throughput.

--- revise
### Two kinds
? Local (document-partitioned) index? :: Each partition indexes its own records; writes local, reads scatter to all partitions.
? Global (term-partitioned) index? :: Partitioned by the indexed value; reads hit one index partition, writes touch another partition.
? Why are global indexes often asynchronous? :: Updating the data and a remote index partition atomically needs a distributed transaction.

### Choosing
? When is a local index fine? :: Indexed queries are rare or partitions are few.
? Hand-built alternative to a global index? :: A second table partitioned by the other field, written alongside (sync or via a stream).
? Which uses local indexes per shard? :: Elasticsearch (queries go to every shard).
? Spanner's secondary indexes? :: Global and synchronous (transactional), at higher write cost.

--- notes
## Local (document-partitioned)
Index lives with the data; one-partition writes.
Reads by indexed value: scatter-gather to every partition; latency = slowest.
MongoDB sharded indexes, Cassandra 2i, Elasticsearch shards.
## Global (term-partitioned)
Index partitioned by indexed value; one-partition reads (+ record fetches).
Writes hit a second partition: async (DynamoDB GSI, lag) or transactional (Spanner, slower).
## Second table
orders_by_customer(customer_id, created_at, order_id): hand-built global index; dual writes or stream.
## Choose
Rare indexed reads / few partitions → local. Frequent indexed reads → global or second table.
Main access path → make it the partition key.

## Remember
Global index lag → show the user's own new item from the client until the index catches up.
Scatter-gather over 64 partitions at 1% tail each → ~47% of queries hit a slow partition.
Search engines are document-partitioned, so they keep shard counts moderate and add replicas for throughput.
If one query dominates, make its field the partition key instead of indexing it.
--- doubts
Q: Why not just make every index global?
A: Because every write then becomes a multi-partition operation: either a slower distributed transaction or an asynchronous update that leaves the index briefly stale. For write-heavy data with rarely used indexes, that cost buys little. Use global indexes for frequent queries that must be fast.

Q: What does "the index lags" mean for users?
A: Immediately after creating an order, "my orders" (served from an asynchronous global index) might not show it for a moment. Combine with read-your-writes tricks: show the just-created item from the client or from the primary record until the index catches up.

Q: Is scatter-gather always bad?
A: It's fine for occasional queries over a moderate number of partitions, especially when each partition answers quickly. It hurts when the query is frequent (load multiplies by the partition count) or latency-sensitive (you wait for the slowest partition).

--- exercises
[choose] A chat app shards messages by chat_id. It needs (a) full-text search of a user's messages, used occasionally, and (b) "unread count across all chats" on every app open. Local or global indexing for each?
A: (a) A separate search index (document-partitioned by user or message, queried by scatter-gather across a moderate number of shards) fed asynchronously: occasional queries tolerate fan-out and slight lag. (b) Don't scan chats at all: maintain a per-user inbox table keyed by user_id (a global, denormalised index) with per-chat unread counters updated on each message, so app open reads one partition.

[estimate] 64 partitions; a local-index query is sent to all, each partition answering within 10 ms at p99 independently. What fraction of queries exceed 10 ms?
A: 1 − 0.99⁶⁴ ≈ 1 − 0.53 = 47%. Nearly half the queries are slowed by at least one partition's tail. A global index (one partition) would see about 1%.

[design] Orders are partitioned by order_id. Add "orders by customer, newest first" without slowing order creation.
A: Create an orders_by_customer table partitioned by customer_id with sort key (created_at DESC, order_id). The order service writes the order, and a change stream (CDC) asynchronously inserts the index row, keeping creation fast. Reads query one partition of orders_by_customer for the IDs (or store a summary in the row to avoid fetches). For read-your-writes, the client also shows its just-created order locally until the index catches up.

--- pitfalls
- Frequent queries on local indexes across many partitions
- Assuming global secondary indexes are always up to date
- Synchronous cross-partition index updates on a hot write path without need
- Forgetting the tail-latency cost of scatter-gather
- Not making the dominant access path the partition key

--- quiz
Q: A local secondary index makes which operation expensive?
- Writes
- *Reads by the indexed field (they go to every partition)
- Reads by the partition key
- Replication
W: Each partition only knows its own records.
Q: A global secondary index makes which operation more expensive?
- *Writes, which must also update an index partition elsewhere
- Reads by the indexed field
- Point lookups by key
- Backups
W: The index entry usually lives on a different partition.
Q: DynamoDB global secondary indexes are updated…
- Synchronously in the same transaction
- *Asynchronously, so they can briefly lag
- Only nightly
- Never
W: Eventually consistent index reads.
Q: Why does Elasticsearch send each query to every shard?
- It has no indexes
- *Each shard indexes only its own documents (document-partitioned)
- Shards are replicas
- To balance load
W: Local indexes require scatter-gather.

--- sources
- book :: Designing Data-Intensive Applications, ch. 6 (Partitioning and secondary indexes) :: Martin Kleppmann :: https://dataintensive.net/
- article :: Using global secondary indexes in DynamoDB :: AWS :: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- article :: Secondary indexes (Spanner) :: Google Cloud :: https://cloud.google.com/spanner/docs/secondary-indexes
- article :: Elasticsearch: search shard routing (query then fetch) :: Elastic :: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-shard-routing.html

=== rebalancing
blurb: Moving data when machines are added, removed or overloaded, without downtime: fixed numbers of partitions, dynamic splitting and merging, how a partition is moved safely while it keeps serving, and who decides (automatic vs operator-driven).
signals: Adding capacity to a partitioned store | One machine holds too much data or traffic | Resharding from 4 to 64 shards | "How do you migrate without downtime?"
widgets: rebalance
prereq: consistent-hashing

--- lesson
:::words
- **Rebalancing**: moving partitions (or keys) between machines so data and load stay even.
- **Fixed partitions**: creating many more partitions than machines at the start and only moving whole partitions later.
- **Dynamic partitioning**: splitting partitions when they grow too big (and merging small ones).
- **Resharding**: changing the number of shards and redistributing data.
- **Dual writes**: writing to both the old and new location during a migration.
- **Cutover**: the moment traffic switches to the new location.
:::

## The problem in plain words

Data grows, traffic grows, machines fail and are replaced. A partitioned system must keep moving data around to stay balanced, and it must do it **while serving traffic**, without losing writes and without moving more data than necessary (moving data costs network, disk and time). The design choice made on day one (how many partitions, and how keys map to them) decides how painful this is later.

:::eli5
A school with 1,000 lockers shared among 4 caretakers (each looks after 250). When a 5th caretaker joins, you don't renumber every locker; you just hand the new caretaker 200 lockers taken from the others. That only works because there were many more lockers than caretakers from the start.
:::

## Strategies

**Don't use hash % N.** Changing N moves almost every key (the consistent hashing page explains why).

**Fixed number of partitions.** Create, say, 1,024 partitions up front for 8 machines (128 each). When a 9th machine joins, it takes about 113 partitions from the others; **whole partitions move**, keys never change partition. Simple and predictable; used by Riak, Elasticsearch (shards per index fixed at creation), Couchbase, and Redis Cluster (16,384 slots). The catch: choose the count well, because changing it later is a full reshard; too few limit growth, too many add overhead.

**Dynamic partitioning.** Start with few partitions; **split** one when it exceeds a size (Bigtable/HBase split tablets/regions at a few GB), **merge** when small. Partition count follows data size automatically; good for range-partitioned data whose distribution is unknown in advance.

**Proportional to nodes.** A fixed number of partitions per node (Cassandra's vnodes): adding a node splits some existing partitions and takes half of each.

Watch partitions move when a node joins, and compare with naive rehashing:

[[widget:rebalance]]

## Moving a partition safely

The standard sequence for moving partition P from node A to node B while it serves traffic:
1. **Copy a snapshot** of P to B in the background (rate-limited so it doesn't starve live traffic).
2. **Stream ongoing changes** from A to B (via the replication log) until B is nearly caught up.
3. **Cutover**: briefly pause writes to P (milliseconds to seconds), let B apply the last changes, then switch the routing table so P points to B.
4. **Clients follow**: they learn the new location from the routing service (or get "moved" redirects, as Redis Cluster's `MOVED` response does).
5. **Clean up** P's data on A after a safe delay.

With replication, a common trick is to add B as a **new replica** of P, let it catch up through normal replication, then remove the replica on A: rebalancing becomes membership change.

## Resharding a sharded SQL database (the hard case)

When an application shards manually (say 4 MySQL shards by `user_id % 4`) and must go to 64: create the new shards, **dual-write** to old and new locations (or stream changes via CDC), **backfill** historical data, **verify** both sides match, switch reads to the new shards, then stop writing to the old ones. Plan this so the mapping becomes a directory or a large fixed slot count, so it never has to happen again. Vitess (from YouTube) automates this for MySQL.

## Automatic or operator-driven?

Fully automatic rebalancing is convenient but dangerous: a node that is merely slow can be declared dead, triggering a large data move that adds load to an already struggling cluster, causing more nodes to look slow: a cascading failure. Many systems therefore **propose** moves automatically but require operator approval, or throttle moves heavily.

## Interview angles

- "How do you add capacity to your sharded store?" Many fixed partitions or dynamic splits; move whole partitions; snapshot + log catch-up + brief cutover.
- "Resharding from 4 to 64 shards with zero downtime?" Dual writes or CDC, backfill, verify, cut reads, cut writes, then a directory/slot map so it never happens again.
- "What could go wrong with automatic rebalancing?" Cascades from false failure detection; throttle and gate moves.

--- revise
### Strategies
? Fixed partitions strategy? :: Many more partitions than nodes at the start; move whole partitions when nodes change; keys never change partition.
? Its catch? :: The partition count is hard to change later; too few limits growth, too many adds overhead.
? Dynamic partitioning? :: Split partitions when too big, merge when small (Bigtable tablets, HBase regions).
? Redis Cluster's version? :: 16,384 fixed hash slots moved between nodes.

### Moving safely
? Steps to move a partition live? :: Snapshot copy → stream changes until caught up → brief write pause and routing switch → clients follow → clean up.
? Rebalancing via replication? :: Add the target as a replica, let it catch up, remove the old replica.
? Zero-downtime manual reshard? :: Dual writes or CDC, backfill, verify, switch reads, switch writes, retire old shards.
? Danger of fully automatic rebalancing? :: False failure detection triggers big moves that overload the cluster further (cascade).

--- notes
## Avoid
hash % N (moves almost every key).
## Strategies
Fixed partitions (≫ nodes): move whole partitions; Riak, Elasticsearch shards, Couchbase, Redis Cluster 16,384 slots. Pick the count carefully.
Dynamic: split at a size threshold, merge small (Bigtable, HBase).
Per-node partitions: Cassandra vnodes.
## Live move
Snapshot (throttled) → log catch-up → brief pause + routing switch → clients redirected (Redis MOVED) → delayed cleanup.
Or: add as replica, catch up, drop old replica.
## Manual reshard (SQL)
New shards → dual writes or CDC → backfill → verify → reads → writes → retire; end with a directory/slot map. Vitess automates for MySQL.
## Control
Automatic moves can cascade under false failure detection: throttle, require approval.

## Remember
Pick fixed partition counts ~10–100× the maximum machine count you expect.
Throttle data movement so live traffic keeps its I/O.
Pre-split new tables before bulk loads (dynamic partitioning starts with one partition).
Verify (counts, checksums) before cutting over a migration.
--- doubts
Q: How do I pick the number of fixed partitions?
A: Estimate the maximum number of machines you might ever need and multiply by roughly 10–100, so each machine always holds enough partitions to balance finely; then check per-partition overhead (each partition has metadata, files, replication streams). Thousands of partitions is common; Redis Cluster fixes 16,384 slots for exactly this reason.

Q: What happens to requests during the cutover?
A: Writes to the moving partition pause briefly (or are buffered) while the target applies the final changes; reads may continue from the source. Clients that hit the old node afterwards are redirected or refresh their routing table. Done well, users see a few milliseconds to seconds of extra latency on that partition only.

Q: Why is dual writing risky?
A: The two writes can partially fail (one succeeds, one doesn't), leaving the copies inconsistent, and ordering between them can differ. That's why migrations add verification (compare and repair) before cutting over, and why streaming changes from the source's log (CDC) is often preferred to application-level dual writes.

Q: Does dynamic splitting cause hot spots?
A: It can relieve them (a hot, large tablet splits and the halves move to different servers), but a single hot key cannot be split. Also, a brand-new empty table starts as one partition, so systems often let you pre-split before a big load.

--- exercises
[estimate] A store has 1,024 fixed partitions over 8 nodes, 2 TB per node. You add 2 nodes. How many partitions and how much data move?
A: Target: 1,024 / 10 ≈ 102 partitions per node. The 2 new nodes take ~205 partitions in total, about 1/5 of the data: 16 TB × 0.2 ≈ 3.2 TB moved (each old node gives ~26 partitions). With hash % N going from 8 to 10, about 80% of all data (~13 TB) would have moved.

[design] Migrate a user table from 4 MySQL shards (user_id % 4) to 64 shards with no downtime.
A: Introduce a slot map: 4,096 slots, slot = hash(user_id) % 4,096, slot → shard directory (initially mapping onto the 4 old shards). Provision 64 new shards. For batches of slots: copy existing rows to the new shard, stream ongoing changes via CDC from the old shard, verify row counts and checksums, briefly block writes for those slots, apply the remaining changes, update the directory, resume. Repeat until all slots live on new shards; retire old ones. Future growth only changes the directory.

[break] A node in an auto-rebalancing cluster has a long garbage-collection pause and is marked dead. Within minutes, three more nodes are marked dead and the cluster is unavailable. What happened?
A: The false "dead" triggered re-replication of all its partitions onto the remaining nodes, adding heavy copy traffic and load. Under that load, more nodes slowed down, missed heartbeats and were declared dead, triggering more moves: a cascade. Fixes: longer or adaptive failure detection, delaying re-replication (wait to see if the node returns), throttling data movement, and operator gating of large moves.

--- pitfalls
- hash % N partition mapping
- Too few fixed partitions to scale later
- Unthrottled data movement competing with live traffic
- Dual writes without verification before cutover
- Fully automatic rebalancing triggered by flaky failure detection

--- quiz
Q: Why create many more partitions than nodes?
- To use more disk
- *So adding nodes means moving whole partitions, never re-keying data
- To make queries faster
- To avoid replication
W: Partition membership of keys never changes; only partition placement does.
Q: Bigtable handles growth by…
- A fixed slot count
- *Splitting tablets that grow too big and moving them
- hash % N
- Manual resharding only
W: Dynamic partitioning by key range.
Q: The usual way to move a live partition is…
- Stop the service, copy, restart
- *Snapshot copy, stream changes until caught up, brief pause, switch routing
- Delete and rebuild from backups
- Dual-read forever
W: Only the final cutover pauses writes, briefly.
Q: A risk of fully automatic rebalancing is…
- Too little data movement
- *Cascading failures when slow nodes are falsely declared dead
- Losing the routing table
- Slower point lookups
W: Data movement adds load exactly when the cluster is struggling.

--- sources
- book :: Designing Data-Intensive Applications, ch. 6 (Rebalancing partitions) :: Martin Kleppmann :: https://dataintensive.net/
- article :: Redis Cluster specification: hash slots and resharding :: Redis :: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- article :: Vitess: resharding :: Vitess Authors (CNCF) :: https://vitess.io/docs/user-guides/configuration-advanced/resharding/
- paper :: Bigtable: A Distributed Storage System for Structured Data (tablet splitting) :: Chang et al. :: https://research.google/pubs/bigtable-a-distributed-storage-system-for-structured-data/

=== unique-ids
blurb: Generating unique identifiers across many machines without a central bottleneck: auto-increment and its limits, UUIDs (v4 and time-ordered v7), Twitter's Snowflake layout, ticket servers and ID ranges, and choosing by ordering, size and guessability.
signals: IDs for posts, messages, orders at high write rates | Sharded databases that can't share an auto-increment | IDs that should sort by time | URL shorteners and public IDs
widgets: snowflake

--- lesson
:::words
- **Auto-increment**: a database counter that gives each new row the next number.
- **UUID**: a 128-bit identifier generated anywhere with negligible chance of collision.
- **Snowflake ID**: Twitter's 64-bit ID made of a timestamp, a machine number and a sequence number.
- **Epoch**: the starting moment from which a timestamp counts (Snowflake uses a custom one).
- **Monotonic**: always increasing.
- **Ticket server**: a dedicated service that hands out numbers or ranges of numbers.
:::

## The problem in plain words

A single database can number rows 1, 2, 3 with an auto-increment counter. Once data is spread over many machines, there is no single counter: two shards would both hand out 1, 2, 3. Asking one central counter for every new ID creates a bottleneck and a single point of failure. You need IDs that can be generated **independently on any machine**, never collide, and ideally sort by creation time (which makes "newest first" queries and storage much nicer).

:::eli5
Several ticket booths sell tickets for the same concert. If each prints numbers starting at 1, tickets clash. Fix: each ticket shows the time it was sold, the booth number, and the booth's own counter for that second. No two can ever match, and sorting tickets by number roughly sorts them by time.
:::

## Options

**Auto-increment in one database.** Simple, compact, ordered. Fails across shards. A partial fix is giving each of k shards a different offset and step (shard 1: 1, 4, 7…; shard 2: 2, 5, 8…), but adding shards later is awkward.

**UUID v4 (random).** 128 bits, generated anywhere, collision probability negligible. Downsides: 16 bytes (twice a 64-bit integer), **not ordered**, so inserts land at random positions in B-tree indexes (worse caching and page splits), and they are not human-friendly.

**UUID v7 (time-ordered, RFC 9562, 2024).** A 48-bit millisecond timestamp followed by random bits: generated anywhere, collision-safe, and roughly time-sorted, fixing v4's index problem. A good default today when 128 bits are acceptable.

**Snowflake (Twitter, 2010).** A 64-bit integer:

| Bits | Field | Gives |
|---|---|---|
| 1 | Sign (unused, 0) | Positive integers |
| 41 | Milliseconds since a custom epoch | ~69 years of range |
| 10 | Machine (worker) ID | 1,024 generators |
| 12 | Sequence within the millisecond | 4,096 IDs per ms per machine (≈ 4M/s each) |

IDs are unique without coordination (as long as machine IDs are unique), fit in a 64-bit integer, and sort by time. Assigning machine IDs needs a small coordination step at startup (from a config or a coordination service). Variants (Instagram's, Discord's, Sonyflake) shift the bit budget.

Build an ID and see how the bits combine:

[[widget:snowflake]]

**Ticket servers / range allocation.** A small service hands out *blocks* of IDs (e.g. 10,000 at a time) that each server uses locally (Flickr's ticket servers used MySQL auto-increment in two servers with different offsets). Compact sequential IDs with coordination only once per block; IDs are roughly but not strictly time-ordered across servers.

## Choosing

| Need | Choose |
|---|---|
| 64-bit, time-sortable, high rate, no per-ID coordination | Snowflake-style |
| No coordination at all, 128 bits fine, time-sortable | UUIDv7 |
| No coordination, order irrelevant | UUIDv4 |
| Short, dense numbers (e.g. for base-62 short codes) | Range allocation from a ticket service |
| Public IDs that must not reveal volume or be guessable | Random IDs, or encrypt/shuffle sequential ones |

## Pitfalls that come up

- **Clock going backwards** (NTP corrections): a Snowflake generator could issue a duplicate or out-of-order ID. Generators detect it and wait (or refuse) until the clock passes the last timestamp used.
- **Sequence exhaustion**: more than 4,096 IDs in one millisecond on one machine: wait for the next millisecond.
- **Leaking information**: sequential or time-based IDs reveal creation time and volume (competitors can estimate your order count). Use random public IDs where that matters.
- **JavaScript numbers** only represent integers exactly up to 2⁵³; 64-bit IDs must be sent to browsers as strings.

## Interview angles

- "How do you generate IDs for 500k messages/s across many servers?" Snowflake-style: timestamp + machine + sequence; no per-ID coordination; sortable.
- "Why not UUIDv4 as the primary key?" Random inserts hurt B-tree indexes and they're 128 bits; prefer time-ordered IDs.
- "What if the clock goes backwards?" Detect and wait; never reuse a timestamp-sequence pair.

--- revise
### Options
? Why does auto-increment fail across shards? :: There is no single counter; shards would issue the same numbers (or a central counter becomes a bottleneck).
? UUIDv4 downsides? :: 128 bits, unordered (random B-tree inserts), not human-friendly.
? What does UUIDv7 add? :: A millisecond timestamp prefix: time-sortable while still coordination-free.
? Snowflake layout? :: 1 sign + 41-bit ms timestamp + 10-bit machine ID + 12-bit sequence.
? Snowflake capacity? :: ~69 years, 1,024 machines, 4,096 IDs per ms per machine.
? Ticket server / ranges? :: A service hands out blocks of numbers; servers use them locally.

### Pitfalls
? Clock goes backwards in a Snowflake generator? :: Detect it and wait until time passes the last used timestamp.
? Why send 64-bit IDs to browsers as strings? :: JavaScript numbers are exact only up to 2⁵³.
? Risk of sequential public IDs? :: They leak volume and creation time and are guessable.

--- notes
## Options
Auto-increment: simple, ordered; single DB only (offset/step hack across shards).
UUIDv4: 128-bit random; no coordination; unordered → index churn.
UUIDv7 (RFC 9562): 48-bit ms timestamp + random; time-ordered; no coordination.
Snowflake (Twitter 2010): 1 | 41 ms (~69 y) | 10 machine (1,024) | 12 seq (4,096/ms) = 64 bits; sortable; machine IDs assigned at startup.
Variants: Instagram, Discord, Sonyflake.
Ranges / ticket servers (Flickr): blocks of IDs; dense numbers; coordination per block.
## Choose
64-bit sortable high-rate → Snowflake · zero coordination sortable → UUIDv7 · order irrelevant → UUIDv4 · short codes → ranges · public/unguessable → random or shuffled.
## Pitfalls
Clock regression → wait · sequence overflow → next ms · info leakage · JS 2⁵³ limit → strings.

--- doubts
Q: Can two Snowflake generators ever produce the same ID?
A: Only if two generators share a machine ID, or a generator's clock goes backwards and it reuses a (timestamp, sequence) pair. Unique machine-ID assignment (from configuration or a coordination service) and refusing to issue IDs while the clock is behind the last used timestamp prevent both.

Q: Are UUIDs really unique?
A: For practical purposes. A v4 UUID has 122 random bits; you would need to generate about 2.7 × 10¹⁸ of them before a 50% chance of any single collision. The real risk is bad randomness (a poorly seeded generator), not the maths.

Q: Why does time-ordering help databases?
A: New rows get the largest keys, so inserts append to the right edge of the B-tree index: the same few pages stay in memory, and pages fill neatly. Random keys insert all over the index, touching many pages and causing splits, which slows writes and wastes cache.

Q: How do URL shorteners get short codes?
A: Usually from dense numbers (a counter or ID ranges) converted to base 62 (a–z, A–Z, 0–9): 7 characters cover 62⁷ ≈ 3.5 trillion codes. If codes must not be guessable in sequence, the number is scrambled with a reversible permutation before encoding.

--- exercises
[estimate] A Snowflake-style service must generate 2 million IDs per second at peak. How many generator machines (at the 4,096-per-ms limit) do you need, and is the 10-bit machine field enough?
A: One machine: 4,096 per ms = ~4.1 million per second, so in theory one suffices; for redundancy and to avoid exhausting the sequence in bursts, run several (say 4–8, one per zone and service instance). The 10-bit field allows 1,024 generators, plenty.

[design] Design ID generation for orders in a sharded system where IDs must be unique, roughly time-ordered, 64-bit, and must not reveal how many orders you get per day.
A: Snowflake-style internal IDs (timestamp + worker + sequence) for storage and sorting. Externally expose a different ID: encrypt or permute the 64-bit internal ID with a secret key (a format-preserving cipher or a keyed bijection), so public IDs look random but map one-to-one to internal ones. Volume and creation time are no longer guessable.

[break] After a datacentre's NTP servers stepped clocks back by 2 seconds, a payments system recorded duplicate primary-key errors. What happened, and the fix?
A: The Snowflake generators' clocks jumped back 2 s, so they produced timestamps already used, and with sequences restarting at 0, some IDs duplicated earlier ones. Fix: generators remember the last timestamp used and refuse (or wait) while the clock is behind it; configure NTP to slew (adjust gradually) instead of stepping; alert on clock regression.

--- pitfalls
- A central counter queried for every ID
- UUIDv4 as a clustered primary key at high insert rates
- Ignoring clock regression in time-based generators
- Sending 64-bit IDs to JavaScript as numbers
- Exposing sequential IDs publicly when volume is sensitive

--- quiz
Q: In a Snowflake ID, how many bits hold the timestamp?
- 32
- *41
- 48
- 64
W: 41 bits of milliseconds give about 69 years.
Q: Why are UUIDv7 IDs better database keys than UUIDv4?
- They are shorter
- *They start with a timestamp, so inserts are roughly time-ordered
- They are guaranteed unique without randomness
- They are human-readable
W: Ordered inserts keep B-tree writes local.
Q: A Snowflake machine can generate at most how many IDs per millisecond?
- 1,024
- *4,096
- 65,536
- Unlimited
W: 12 sequence bits.
Q: What should a time-based ID generator do if its clock goes backwards?
- Keep going
- *Wait (or refuse) until the clock passes the last timestamp it used
- Reset the sequence to 0
- Switch to UUIDv4 permanently
W: Reusing a timestamp risks duplicate IDs.

--- sources
- article :: Announcing Snowflake :: Twitter Engineering :: https://blog.x.com/engineering/en_us/a/2010/announcing-snowflake
- paper :: RFC 9562: Universally Unique IDentifiers (UUIDs), including v7 :: IETF :: https://www.rfc-editor.org/rfc/rfc9562
- article :: Ticket Servers: Distributed Unique Primary Keys on the Cheap :: Flickr (Kay Kremerskothen) :: https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap/
- article :: Sharding & IDs at Instagram :: Instagram Engineering :: https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c
