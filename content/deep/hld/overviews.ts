import { md } from "@/content/ai/md";

/**
 * Chapter overview pages for HLD, rewritten for first-time learners. They replace the old terse chapter lessons
 * (content/hld-concepts.ts) once a chapter's pages are written: a plain-words map of the chapter, not a summary in jargon.
 */
export const HLD_OVERVIEWS: Record<string, string> = {
  "hld-framework": md`
## What this chapter is about

In a system design interview you are asked to design something huge (YouTube, a chat app, a payment system) in about 45 minutes. Nobody expects a finished design. The interviewer is watching **how you think**: whether you narrow a vague question into a clear problem, build something that works, find its weak points yourself, and explain your choices.

This chapter is the playbook for those 45 minutes, in four pages:

1. **How the round runs and how it is scored.** The six phases and their timings, the five things interviewers write down, and what changes between a mid-level (L4), senior (L5) and staff (L6) answer.
2. **Requirements.** Turning "design Instagram" into 3–5 core features, explicit non-goals, and targets for scale, speed, availability and correctness, stated per feature.
3. **API and data model.** Writing the main operations and records first, because how data is looked up decides the database, the keys and how data is split across machines.
4. **Deep dives and failure.** Finding the genuinely hard parts yourself, going two levels below the boxes, and explaining what users see when each part fails or traffic spikes.

:::tip The one idea to keep
Every box you draw must solve a problem you named, and every choice is stated as "X instead of Y, because Z, at the cost of W".
:::

The chapters after this one teach the building blocks (networks, load balancers, caches, databases, queues) that you combine inside this framework.
`,
  estimation: md`
## What this chapter is about

Before choosing a design you need to know **how big the problem is**. Ten thousand users and one billion users need completely different systems. Estimation is the quick arithmetic that tells you which one you are building, and it rests on a few numbers about how fast computers, disks and networks are.

Four pages:

1. **Latency and throughput numbers.** How long memory, SSDs, disks and network trips take, shown on a ladder scaled to human time, and how much one machine can do per second. The gaps between them (1,000× and more) explain why caches, CDNs and precomputation exist.
2. **QPS, storage and bandwidth.** The recipe from daily users to requests per second, bytes per year and network traffic, with a full worked example and the habit of stopping once the numbers have made a decision for you.
3. **Capacity planning.** Turning those numbers into machines: which resource runs out first, how full machines should run, and the spare capacity needed to survive a failed machine or a whole data-centre zone.
4. **Queueing and tail latency.** Why a server gets slow long before it is "full", Little's law, and why the slowest 1% of requests dominates large systems. A live simulation lets you push a server toward 100% and watch.

:::tip The one idea to keep
Use round numbers, say every assumption out loud, and only compute numbers that change a decision.
:::
`,
  networking: md`
## What this chapter is about

Every system design starts with a user's device sending a request across the internet to your servers. This chapter follows that journey and explains each step in plain terms, because each step costs time and can fail.

1. **TCP, UDP and QUIC.** How data is chopped into packets, how TCP makes delivery reliable and ordered (at the cost of a handshake and waiting on lost packets), when UDP's "just send it" is better, and how QUIC rebuilds TCP's job faster on top of UDP.
2. **HTTP and TLS.** The request–response language of the web, how encryption keeps it private and proves who you are talking to, and how HTTP/1.1, HTTP/2 and HTTP/3 send many requests at once.
3. **DNS.** How a name becomes an IP address through a chain of servers and caches, why changes take time to spread, and how DNS steers users to nearby data centres.
4. **REST, gRPC and GraphQL.** Three ways programs talk to each other, and which fits public APIs, internal services and mobile apps.
5. **API design.** The habits that make an API safe in the real world: pagination that does not skip items, idempotency keys so retries never charge twice, versioning, clear errors, and handling slow operations.
6. **Real-time push.** How a server tells clients about new events (polling, long polling, server-sent events, WebSockets), and how to run millions of open connections.

:::tip The one idea to keep
Every network round trip costs time set by distance, so good designs reuse connections, set them up close to users, and avoid making requests one after another.
:::
`,
  "load-balancing": md`
## What this chapter is about

One server is never enough: it has limited capacity and it will eventually fail. So you run many identical copies, and you need something in front of them that gives clients one address, spreads requests across the copies, and quietly stops using broken ones. This chapter covers that layer, from one data centre up to the whole planet.

1. **L4 vs L7 load balancing.** Balancing whole connections by looking only at addresses and ports (fast, works for any protocol) versus reading each HTTP request to route by path or cookie (smarter, costlier). An explorer shows what each can see.
2. **Balancing algorithms.** Round robin, least connections and the power of two choices, raced on identical traffic, so you can watch why a slow server ruins round robin and why "always pick the least busy" can cause a stampede.
3. **Health checks and draining.** How quickly a dead server is noticed and how many requests fail meanwhile, why health checks must not depend on shared services, and how to remove servers without dropping requests.
4. **API gateways and service meshes.** The single front door that checks identity, applies rate limits and routes requests for many services, and how it differs from a mesh of proxies that handles traffic between services.
5. **Global traffic.** Getting users to the nearest healthy region with GeoDNS or anycast, setting up connections at the edge, and what happens when a whole region fails.

:::tip The one idea to keep
A load balancer must itself never be the single point of failure, and the strategy it uses decides whether one slow server becomes everyone's problem.
:::
`,
  caching: md`
## What this chapter is about

Reading from memory is about a thousand times faster than reading from disk, and a database can only answer so many questions per second. A **cache** keeps copies of frequently used data in memory so most reads never reach the database. It is the most common way to make a system both faster and able to serve far more users, and also a reliable source of subtle bugs, because you now have two copies of the same data.

1. **Cache patterns.** The four ways an application and a cache share reads and writes (cache-aside, read-through, write-through, write-back), and what each loses when something crashes.
2. **Eviction and sizing.** What to throw out when the cache is full (LRU, LFU, modern admission policies), raced on the same traffic, and how big a cache needs to be.
3. **Invalidation.** Why caches end up holding old data even when every rule is followed, and the fixes used at scale: TTLs, leases, versions and invalidation from the database's change log.
4. **Failure modes.** Stampedes when a popular entry expires, requests for things that do not exist, mass expiry, and single keys too popular for one server.
5. **Redis and Memcached.** How the two common caches work inside, how they are spread across machines, and what happens when one fails.
6. **CDNs.** Caches in hundreds of cities that serve images, video and files near users, and how to control and update what they hold.

:::tip The one idea to keep
A cache makes the database depend on the hit rate, so design for the moments when the hit rate drops: expiry, restarts and failures.
:::
`,
  databases: md`
## What this chapter is about

Almost every design question comes down to "where does the data live, and how is it found again?" This chapter builds that judgement from the ground up: how databases store data on disk, how they find it quickly, and how to choose and shape a database for each kind of data in a design.

1. **Choosing a database by access pattern.** Relational, key-value, document, wide-column, graph, search, time-series and object storage: what each is good and bad at, and a step-by-step way to choose per kind of data.
2. **Data modelling.** Tables, keys and relationships; when to store a fact once and when to copy it on purpose; how to design keys for stores without joins.
3. **Indexes.** How a B-tree finds one row among billions in a few reads, why the order of columns in an index matters, and what every index costs on writes. An explorer shows which rows each query reads.
4. **B-trees vs LSM trees.** The two storage-engine designs behind nearly every database: update in place, or append and merge later. Step through both with the same writes.
5. **Column stores and analytics.** Why reports over billions of rows need a separate, column-oriented copy of the data, and how data flows there.
6. **Inside the NoSQL families.** Partition keys, sort keys, documents, wide-column rows and graphs, with the design rules for each.

:::tip The one idea to keep
Start from how the data is read and written, how much of it there is and what must never go wrong; the database follows from those answers.
:::
`,
  replication: md`
## What this chapter is about

Keeping copies of your data on several machines protects you from failures and lets more users read at once. But copies take time to update, machines fail at awkward moments, and networks break between data centres. This chapter explains, step by step, what each way of copying data guarantees, what users might see, and what can be lost.

1. **Single-leader replication.** One machine takes all writes and streams them to the others; the difference between waiting for copies and not waiting; what happens, and what can be lost, when the leader dies.
2. **Multi-leader and leaderless replication.** Letting several machines accept writes (for several regions, offline apps or maximum availability), and how the resulting conflicts are detected and resolved.
3. **Quorums.** The simple arithmetic of how many copies must confirm a write and answer a read so that reads see the latest data, and what that arithmetic does not guarantee.
4. **Consistency models.** Precisely what "strongly consistent", "causal" and "eventually consistent" promise, with examples of reads that each one allows or forbids.
5. **Session guarantees.** Cheap promises that make eventual consistency feel right to each user: seeing your own changes, and never seeing data go backwards.
6. **CAP and PACELC.** What really has to be given up when data centres lose contact, and the latency cost of consistency even when nothing is broken. A simulator lets you cut the link yourself.

:::tip The one idea to keep
Choose guarantees per operation: strong ones for money, uniqueness and locks; cheaper ones, plus "users see their own changes", for everything else.
:::
`,
  partitioning: md`
## What this chapter is about

When data grows too big, or writes too many, for one machine, you split it: each machine owns part of the data. How you split decides which questions can be answered by one machine and which must ask all of them, whether the load is even or one machine melts, and how painful growth will be later.

1. **Range, hash and directory partitioning.** Three ways to decide which machine owns which data, what each makes fast and slow, and how to choose the key you split by.
2. **Consistent hashing.** How to place keys on servers so that adding or removing a server moves only a small share of the data, with virtual nodes, rendezvous hashing and Google's variants.
3. **Hot keys.** When one celebrity, one viral post or one huge customer overwhelms a single machine, and the techniques for spreading it out.
4. **Secondary indexes on partitioned data.** Finding records by something other than the key they were split by: asking every machine, or maintaining a separate index.
5. **Rebalancing.** Moving data between machines as the system grows, without downtime and without moving more than necessary.
6. **Unique IDs.** Generating IDs on many machines at once without collisions, including the Snowflake layout and time-ordered UUIDs.

:::tip The one idea to keep
Choose the split key from your most frequent query, check it spreads load evenly, and plan from day one for the one key that will be far hotter than the rest.
:::
`,
  transactions: md`
## What this chapter is about

Whenever several changes must happen together (move money, book the last seat, place an order across services), you need guarantees about what happens when things run at the same time or crash halfway. This chapter goes from a single database's transactions to agreement among many machines.

1. **ACID and the write-ahead log.** What a transaction promises, and how logging every change before making it lets a database survive a power cut mid-transaction. Crash one yourself and watch recovery.
2. **Isolation anomalies.** What goes wrong when transactions overlap (lost updates, dirty reads, write skew, phantoms), which isolation level stops which, and the practical fixes. A lab lets you run each anomaly at each level.
3. **MVCC and locking.** How databases implement isolation: making transactions wait (locks), or giving each a snapshot of versions so readers never block writers.
4. **Two-phase commit.** Committing one transaction across several machines, and why it can get stuck if the coordinator fails.
5. **Sagas and the outbox.** Keeping several services correct without one big transaction: step-by-step processes with undo actions, and publishing events reliably.
6. **Consensus with Raft.** How a group of machines agrees on one leader and one ordered log despite crashes and network splits. A live simulator lets you kill leaders and partition the cluster.
7. **Clocks and ordering.** Why timestamps from different machines can't be trusted to order events, and the alternatives: logical clocks, vector clocks and Google's TrueTime.
8. **Leases and fencing.** Making sure only one worker acts at a time, even when a worker freezes and wakes up after losing its lock.

:::tip The one idea to keep
Atomicity, isolation and agreement all cost coordination; use them where a mistake would be expensive, and make everything else idempotent.
:::
`,
  messaging: md`
## What this chapter is about

Not every piece of work should happen while the user waits. Sending emails, resizing photos, updating search indexes and notifying other services can happen a moment later, elsewhere. Message systems carry that work and those events between services, absorb traffic bursts, and keep services independent of each other. This chapter explains how they behave and how to use them without losing or duplicating anything.

1. **Queues vs logs.** Task queues hand each job to one worker and forget it; logs like Kafka keep an ordered history that many systems read at their own pace and can replay.
2. **Kafka internals.** Partitions and keys, why appending to files is fast, replication settings that prevent data loss, consumer groups, and keeping only the latest value per key.
3. **Delivery guarantees.** Why messages are either sometimes lost or sometimes duplicated, and how "exactly once" is really built from duplicates made harmless.
4. **Event patterns.** Publishing business events, storing every change as an event (event sourcing), and separating write and read models (CQRS).
5. **Retries and dead-letter queues.** Handling messages that keep failing, consumers that fall behind, and events that arrive out of order.

:::tip The one idea to keep
Assume every message can arrive twice and late; make consumers idempotent and decide what happens to messages that keep failing.
:::
`,
  "stream-processing": md`
## What this chapter is about

Some questions need all of the data (last year's logs); others need answers continuously as data arrives (orders per minute, right now). This chapter covers both: processing huge finished datasets across many machines, and processing never-ending streams where events arrive late and out of order.

1. **Batch processing.** Google's MapReduce model (map, shuffle, reduce), why it scales and survives failures, and its successors Spark and Beam.
2. **Windows and watermarks.** Grouping a stream by time, the difference between when something happened and when you heard about it, and deciding when a window's answer is ready.
3. **Stateful streams.** Keeping counts and joins in a stream processor, and recovering after a crash without losing or double-counting events.
4. **Lambda vs Kappa.** Two architectures for combining fresh and complete answers, and why the industry moved to a single streaming pipeline.
5. **Change data capture.** Streaming a database's own log of changes so search indexes, caches and warehouses stay in sync without fragile dual writes.

:::tip The one idea to keep
Process by when things happened, not when you saw them, and design outputs that can be corrected when late data arrives.
:::
`,
  "rate-limiting-concept": md`
## What this chapter is about

Every service has a limit on how much work it can do. Rate limiting stops any single client from using more than its fair share; overload protection keeps the service working when total demand exceeds capacity. Without both, one buggy client or one traffic spike can take everything down.

1. **Rate-limiting algorithms.** Fixed windows, sliding windows, token buckets and leaky buckets, raced on the same bursty traffic so you can see which let a burst slip through at a window boundary.
2. **Distributed rate limiting.** Enforcing a per-user limit when that user's requests land on hundreds of servers: a shared atomic counter, or local counts synced periodically.
3. **Load shedding and backpressure.** Why overloaded systems collapse instead of slowing down, how naive retries keep them collapsed, and how rejecting early, retrying carefully and dropping low-priority work keeps the important things running.

:::tip The one idea to keep
Under overload, rejecting some requests quickly serves more users than trying to serve everyone slowly.
:::
`,
  "storage-search": md`
## What this chapter is about

Beyond tables of records, large systems store files, video, text to search, locations, and endless streams of measurements, each with its own specialised storage. This chapter covers the ones that appear in design interviews again and again.

1. **Object storage.** Where photos, videos and backups live: how services like Google Cloud Storage keep billions of files safe with far less than three full copies, and how clients upload directly.
2. **Media pipelines.** Turning an uploaded video into many sizes and short segments so every viewer gets smooth playback on any network.
3. **Search.** How an inverted index finds documents containing your words in milliseconds, how results are ranked, and how the index is split across machines.
4. **Geospatial indexes.** Answering "what's near me?" with geohashes, quadtrees and Google's S2 cells.
5. **Sketches.** Bloom filters, HyperLogLog and Count-Min: tiny structures that answer "seen it?", "how many distinct?" and "how often?" approximately, at huge scale.
6. **Time-series storage.** Storing millions of metric points per second with heavy compression and automatic summarising of old data.

:::tip The one idea to keep
Match the storage to the shape of the data and its queries: immutable blobs, text, places, approximate counts and time series each have a structure built for them.
:::
`,
  reliability: md`
## What this chapter is about

Everything fails eventually: machines, networks, dependencies and, most often, our own changes. Reliability engineering is about deciding how reliable a service needs to be, keeping one failure from spreading, seeing what's happening inside the system, changing it safely, and noticing quickly when parts die.

1. **SLOs and error budgets.** Turning "reliable" into a number users care about, and treating the allowed failure as a budget you spend on change. A chart shows which incidents should wake someone up.
2. **Resilience patterns.** Timeouts, careful retries, circuit breakers, bulkheads and fallbacks that keep a slow dependency from taking down everything. Watch a breaker protect its caller.
3. **Observability.** Metrics, logs and traces: which question each answers, and how to follow one request across many services.
4. **Safe deploys.** Canary releases, feature flags and backward-compatible changes, so a bad release reaches few users and is rolled back in minutes.
5. **Failure detection.** Deciding that a machine is dead when dead and slow look the same, and spreading that news through thousands of machines with gossip.

:::tip The one idea to keep
Expect every part to fail; design so each failure stays small, is noticed quickly, and can be undone.
:::
`,
  security: md`
## What this chapter is about

Every request a system receives raises two questions: **who is this?** and **are they allowed to do this?** Around those sit two more: how do we keep data secret even if someone steals a disk or listens on the wire, and how do we keep working when someone attacks on purpose? Interviewers rarely want cryptography maths; they want to see that you put the right protection in the right place.

1. **Authentication.** Proving who a user or service is: sessions versus signed tokens (JWTs), and how "Sign in with Google" works (OAuth with PKCE, OpenID Connect) without the app ever seeing your password. Tamper with a real token and watch it fail.
2. **Authorisation.** Deciding what someone may do: roles (RBAC), rules over attributes (ABAC), and relationships, as in Google's Zanzibar, which answers "can Bob view this doc?" by following who-belongs-to-what. Run checks yourself.
3. **Encryption and keys.** Encrypting everything in transit and at rest, and the trick (envelope encryption) that lets a key service protect petabytes while the master key never leaves its vault.
4. **Multi-tenancy.** Serving many customers on shared machines without one seeing another's data or slowing everyone down. Watch one customer's import swamp a shared queue, then fix it.
5. **Abuse and DDoS.** Floods of junk traffic, bot armies and stolen-password attacks, and the layers of defence that stop each one.

:::tip The one idea to keep
Never trust where a request comes from: check identity and permission on every call, deny by default, and give every secret a short life and an owner who can revoke it.
:::
`,
};
