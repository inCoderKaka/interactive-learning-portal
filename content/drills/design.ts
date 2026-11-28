import type { Drill } from "@/lib/types";
import { blank, bug, guess, match, odd, order, pick, tf } from "@/lib/drills";

/** Quick-play drills for system design (HLD), object-oriented design (LLD) and interview craft, keyed by topic id. */
export const designDrills: Record<string, Drill[]> = {
  /* ---------------- HLD ---------------- */
  "hld-framework": [
    order("Order the phases of a system design round.", ["Requirements", "Estimation", "API and data model", "High-level design", "Deep dives", "Wrap-up and bottlenecks"], "Estimation can be brief, but it comes before the boxes: numbers decide the shape."),
    tf("Pick your database first, then clarify the requirements around it.", false, "Requirements first. The read/write ratio, consistency needs and scale decide the store, not habit."),
    pick("In a 45-minute round, roughly how long go to requirements and estimation?", ["About 1 minute", "*About 5–10 minutes", "About 20 minutes", "About 30 minutes"], "Enough to pin scope and numbers, leaving most of the time for design and deep dives."),
    match("Match each requirement to its kind.", [["Users can post a photo", "Functional"], ["p99 feed load under 200 ms", "Non-functional"], ["Ads ranking", "Out of scope (say so)"], ["Data must stay in the EU", "Constraint"]]),
    odd("Which is NOT a non-functional requirement?", ["99.99% availability", "p99 latency under 200 ms", "Uploads are never lost", "*Users can follow other users"], "Following is a feature (functional); the rest are qualities of the system."),
  ],
  estimation: [
    guess("How many seconds are in a day?", { min: 1000, max: 1e7, answer: 86400, tol: 0.2, log: true }, "86,400 ≈ 10⁵: the number behind every QPS estimate."),
    guess("One billion requests a day is roughly how many requests per second on average?", { min: 10, max: 1e7, answer: 11574, tol: 0.3, log: true }, "10⁹ / 86,400 ≈ 11.6 K. Plan for 2–5× that at peak."),
    guess("100 M photo uploads a day at 2 MB each: storage for one year, before replication?", { min: 0.1, max: 10000, answer: 73, tol: 0.4, log: true, unit: "PB" }, "100 M × 2 MB = 200 TB a day; × 365 ≈ 73 PB. Triple it for replication."),
    match("Match the operation to its rough latency.", [["L1 cache reference", "~1 ns"], ["Main memory reference", "~100 ns"], ["SSD random read", "~100 µs"], ["Round trip inside a datacentre", "~0.5 ms"], ["Round trip across continents", "~150 ms"]], "Each step is roughly 100–1,000× the previous: that's why caches and locality matter."),
    tf("Peak traffic is commonly 2–5× the daily average.", true, "Unless the interviewer gives a peak factor, state one and size for peak."),
  ],
  networking: [
    order("Order what happens when a browser opens an HTTPS URL for the first time.", ["DNS lookup", "TCP (or QUIC) handshake", "TLS handshake", "HTTP request sent", "Response returned and rendered"], "HTTP/3 merges the transport and TLS handshakes into fewer round trips."),
    match("Match the need to the protocol.", [["Server pushes live updates only", "Server-Sent Events"], ["Two-way low-latency chat", "WebSocket"], ["Internal calls with strict schemas", "gRPC"], ["Public CRUD API", "REST over HTTPS"]]),
    tf("HTTP/3 runs over QUIC, which is built on UDP.", true, "QUIC avoids TCP head-of-line blocking across streams and resumes connections faster."),
    pick("Which HTTP methods are idempotent by definition?", ["POST and PATCH", "*GET, PUT and DELETE", "Only GET", "All of them"], "Repeating them leaves the same state. POST needs an idempotency key to be retry-safe."),
    odd("Which is NOT something only a layer-7 load balancer can do?", ["Route /api and /img to different pools", "Sticky sessions by cookie", "Rewrite headers", "*Forward packets by IP and port"], "Forwarding by IP and port is layer 4; the rest need to read HTTP."),
  ],
  "load-balancing": [
    match("Match the algorithm to where it fits.", [["Round robin", "Identical servers, similar requests"], ["Least connections", "Request durations vary widely"], ["Consistent hashing", "Cache affinity for a key"], ["Weighted round robin", "Servers of different sizes"]]),
    tf("\"Power of two choices\" (pick two random servers, use the less loaded) gets close to least-connections with little coordination.", true, "It avoids the herd effect of every balancer picking the same globally least-loaded server."),
    blank("A health check that only tests that the port is open misses a server that is up but ___.", ["*returning errors", "encrypted", "idle", "cached"], "Check a real endpoint that touches critical dependencies, with care not to cascade."),
    pick("Which balancer can send /api and /images to different server pools?", ["*Layer 7", "Layer 4", "DNS round robin", "Neither"], "Path routing needs to parse HTTP."),
    odd("Which is NOT a load-balancing algorithm?", ["Round robin", "Least connections", "IP hash", "*Two-phase commit"], "2PC is a distributed transaction protocol."),
  ],
  caching: [
    match("Match the caching pattern to its write path.", [["Cache-aside", "App reads cache; on a miss loads the DB and fills"], ["Write-through", "Write cache and DB together"], ["Write-back", "Write cache now, DB later"], ["Read-through", "The cache loads from the DB itself on a miss"]]),
    guess("90% hit rate, 1 ms cache, 20 ms database. Average read latency?", { min: 0, max: 21, answer: 3, tol: 0.6, unit: "ms" }, "0.9 × 1 + 0.1 × (1 + 20) = 3 ms. Moving to 99% hits brings it near 1.2 ms."),
    tf("Even \"update DB, then delete the cache key\" can leave stale data after a rare race.", true, "A slow reader can fetch the old value before the write and fill the cache after the delete. Short TTLs bound it."),
    pick("Which eviction policy suits \"recently used items are likely reused\"?", ["FIFO", "*LRU", "Random", "Largest first"], "LFU suits stable popularity; LRU suits recency."),
    odd("Which does NOT prevent a cache stampede on a hot key?", ["Request coalescing (single flight)", "Early probabilistic refresh", "Serve stale while revalidating", "*Shorter TTLs on the hot key"], "Shorter TTLs make expiry, and therefore stampedes, more frequent."),
  ],
  databases: [
    match("Match the workload to a good store.", [["Bank ledger with transactions", "Relational (Postgres, Spanner)"], ["Huge write-heavy time series", "Wide-column / LSM (Bigtable, Cassandra)"], ["Session tokens with TTL", "Key-value (Redis)"], ["Friend-of-a-friend queries", "Graph database"], ["Full-text product search", "Search index (Elasticsearch)"]]),
    tf("B-trees usually beat LSM-trees on write-heavy workloads.", false, "LSM-trees turn writes into sequential appends; B-trees update pages in place. B-trees tend to win on reads."),
    pick("What is the main cost of adding an index?", ["*Slower writes and extra storage", "Slower reads", "Lost durability", "Nothing"], "Every insert and update must maintain each index."),
    blank("An index on (user_id, created_at) helps \"WHERE user_id = ? ORDER BY created_at\" but not \"WHERE created_at > ?\" alone, because of the ___ rule.", ["*leftmost-prefix", "ACID", "CAP", "write-ahead"], "A composite index is sorted by its first column first."),
    odd("Which is NOT one of the ACID properties?", ["Atomicity", "Consistency", "Isolation", "*Availability"], "D is Durability. Availability belongs to CAP."),
  ],
  replication: [
    match("Match the replication style to its trait.", [["Single leader", "Simple; all writes go through one node"], ["Multi-leader", "Writes in several regions; conflicts to resolve"], ["Leaderless", "Quorums and read repair"], ["Synchronous follower", "No loss on failover, slower writes"]]),
    tf("With N = 3, W = 2 and R = 1, every read sees the latest acknowledged write.", false, "R + W = 3 is not greater than N = 3, so the read can hit the one replica that missed the write."),
    pick("A Raft cluster must survive 3 simultaneous failures. Minimum nodes?", ["4", "6", "*7", "9"], "2f + 1 = 7: a majority of 4 must remain."),
    order("Order a Raft leader election.", ["A follower's election timeout fires", "It becomes a candidate and increments its term", "It votes for itself and requests votes", "A majority grants their votes", "It becomes leader and sends heartbeats"], "Randomised timeouts make split votes rare."),
    blank("\"Monotonic reads\" stops a user seeing data jump ___ in time when reads hit different replicas.", ["*backwards", "forwards", "sideways", "offline"], "Pin a user's reads to one replica, or track the last version they saw."),
  ],
  partitioning: [
    match("Match the partitioning scheme to its trade-off.", [["Range partitioning", "Fast range scans, hotspot risk"], ["Hash partitioning", "Even spread, no range scans"], ["Consistent hashing", "Adding a node moves about 1/N of keys"], ["Directory-based", "A lookup service maps keys to shards"]]),
    guess("Consistent hashing: going from 10 to 11 equal nodes moves about what share of keys?", { min: 0, max: 100, answer: 9, tol: 3, unit: "%" }, "About 1/11 ≈ 9%. Naive hash mod N would move about 90%."),
    tf("Hash partitioning makes range scans over the key cheap.", false, "Hashing scatters neighbouring keys across shards, so a range scan touches all of them."),
    pick("A celebrity's posts make one partition hot. A common fix?", ["*Split the hot key with a suffix and fan reads across the pieces", "Add more replicas of every shard", "Use a bigger machine for all shards", "Disable caching"], "Salting spreads writes; the read side merges the pieces (or caches heavily)."),
    odd("Three are reasonable shard keys for a chat app's messages. Which is the bad one?", ["chat_id", "hash(chat_id)", "(chat_id, month)", "*Message timestamp"], "A timestamp sends every new write to the newest partition."),
  ],
  transactions: [
    match("Match the isolation level to what it allows or prevents.", [["Read uncommitted", "Dirty reads allowed"], ["Read committed", "No dirty reads"], ["Snapshot isolation", "Consistent snapshot; write skew possible"], ["Serializable", "As if transactions ran one at a time"]]),
    order("Order two-phase commit.", ["Coordinator sends prepare", "Participants make the change durable and vote", "Coordinator logs the decision", "Coordinator sends commit or abort", "Participants apply and acknowledge"]),
    tf("Two-phase commit blocks if the coordinator crashes after participants vote yes.", true, "They can't safely commit or abort on their own and must hold locks until it recovers."),
    pick("A saga replaces one distributed transaction with…", ["*Local transactions plus compensating actions", "A global lock", "Synchronous replication", "A bigger database"], "Each step commits locally; failures trigger compensations in reverse."),
    blank("Write skew: two on-call doctors each see someone else on call, then both go off call. Snapshot isolation misses it because they update ___ rows.", ["*different", "the same", "no", "deleted"], "No write-write conflict occurs. Lock the rows you read, or use serializable isolation."),
  ],
  messaging: [
    match("Match the tool to its delivery model.", [["Kafka", "Partitioned, replayable log"], ["SQS / RabbitMQ", "Work queue; message gone once acked"], ["Pub/sub fan-out", "Every subscriber gets a copy"], ["Dead-letter queue", "Parks poison messages after N retries"]]),
    tf("Kafka guarantees ordering across all partitions of a topic.", false, "Only within a partition. Key by entity (e.g. orderId) to keep each entity's events in order."),
    pick("\"Exactly-once processing\" in practice usually means…", ["*At-least-once delivery plus idempotent processing", "At-most-once delivery", "A single consumer", "Synchronous calls"], "Deduplicate by a message or business key; the effect happens once."),
    pick("A topic has 12 partitions. At most how many consumers in one group do useful work?", ["1", "6", "*12", "Unlimited"], "Each partition goes to one consumer in a group; extra consumers sit idle."),
    blank("When consumers fall behind, consumer ___ grows: it's the queue metric to alert on.", ["*lag", "TTL", "partition count", "replication factor"], "Lag tells you how far behind real time processing is."),
  ],
  "stream-processing": [
    match("Match the window type to its shape.", [["Tumbling", "Fixed size, no overlap"], ["Hopping", "Fixed size, overlapping"], ["Session", "Closed by a gap of inactivity"], ["Global with triggers", "Custom emit rules"]]),
    tf("Processing time is the right basis for hourly click counts when mobile events arrive late.", false, "Use event time with watermarks; processing time puts late clicks in the wrong hour."),
    pick("A watermark at time T says…", ["*Events older than T are probably all in", "The job is T seconds behind", "The system clock reads T", "T events were processed"], "It's a heuristic; allowed lateness handles the stragglers."),
    blank("Kappa architecture drops the batch path: it keeps only the ___ path and replays the log to recompute.", ["*stream", "batch", "cache", "OLAP"], "Lambda runs both and must keep two codebases consistent."),
    odd("Which is NOT a stream processor?", ["Apache Flink", "Kafka Streams", "Google Cloud Dataflow", "*PostgreSQL"], "Postgres is a database; it can feed a stream via change data capture."),
  ],
  "rate-limiting-concept": [
    bug("A token-bucket limiter. Which line is wrong?", `
def allow(self, now):
    elapsed = now - self.last
    self.tokens = self.tokens + elapsed * self.rate
    self.last = now
    if self.tokens >= 1:
        self.tokens -= 1; return True
    return False`, 3, "Cap it: min(self.capacity, …). Otherwise an idle hour lets a huge burst through."),
    match("Match the algorithm to its behaviour.", [["Token bucket", "Bursts up to capacity, steady average"], ["Leaky bucket", "Smooths output to a fixed rate"], ["Fixed window", "Simple counter; double burst at edges"], ["Sliding log", "Exact, stores every timestamp"], ["Sliding window counter", "Weighted blend of two windows"]]),
    pick("Token bucket with capacity 10, refill 1/s, idle for a minute. How many requests pass instantly?", ["1", "*10", "60", "70"], "Tokens stop accumulating at the capacity."),
    tf("A distributed limiter needs an atomic increment (Redis INCR or a Lua script) to avoid over-admitting.", true, "Read-then-write from many servers races; make the check and increment one atomic step."),
    pick("What should a rate-limited API return?", ["*429 Too Many Requests, with Retry-After", "503 Service Unavailable", "401 Unauthorized", "200 with an error message"], "Clients can then back off correctly."),
  ],
  "storage-search": [
    match("Match the storage to its use.", [["Object storage (GCS, S3)", "Blobs: cheap, durable, higher latency"], ["Block storage", "Disks for databases and VMs"], ["Inverted index", "Term → list of documents"], ["CDN", "Cached copies near users"]]),
    tf("A Bloom filter can give false positives but never false negatives.", true, "\"Maybe present\" needs a real lookup; \"absent\" is certain."),
    guess("S3 Standard is designed for how many nines of durability?", { min: 1, max: 20, answer: 11, tol: 1, unit: "nines" }, "99.999999999%: lose one object in 10 million roughly every 10,000 years."),
    pick("Typeahead over 10 M product names with p99 under 50 ms. Core structure?", ["*A prefix trie (or FST) with precomputed top-k per prefix", "SQL LIKE 'abc%' on each keystroke", "A full scan with a regex", "A Bloom filter"], "Precomputing per prefix turns each keystroke into a short walk."),
    odd("Which is NOT a probabilistic data structure?", ["Bloom filter", "HyperLogLog", "Count-min sketch", "*B-tree"], "A B-tree is exact; the others trade accuracy for tiny memory."),
  ],
  reliability: [
    match("Match the resilience pattern to its job.", [["Circuit breaker", "Stop calling a failing dependency"], ["Bulkhead", "Isolate resource pools"], ["Timeout", "Bound how long you wait"], ["Retry with backoff and jitter", "Ride out transient errors"], ["Load shedding", "Reject early when overloaded"]]),
    guess("99.99% availability allows about how many minutes of downtime per 30-day month?", { min: 0, max: 60, answer: 4.32, tol: 1, unit: "min" }, "43,200 minutes × 0.0001 ≈ 4.3 minutes. 99.9% allows about 43."),
    tf("Three layers of calls, each retrying 3 times, can multiply load on the bottom service up to 27×.", true, "3 × 3 × 3. Retry at one layer, with budgets and jitter."),
    order("Order the response to a production incident.", ["Detect: an alert fires", "Mitigate: roll back, fail over or shed load", "Find the root cause", "Write a blameless postmortem with action items"], "Mitigate before diagnosing: stop the bleeding first."),
    pick("SLI, SLO or SLA: which carries contractual penalties?", ["SLI", "SLO", "*SLA", "None of them"], "SLI is the measurement, SLO the internal target, SLA the promise to customers."),
  ],
  security: [
    match("Match the control to what it answers or protects.", [["Authentication", "Who are you?"], ["Authorisation", "What may you do?"], ["TLS", "Data in transit"], ["KMS-managed keys", "Data at rest"], ["Login rate limiting", "Slows credential stuffing"]]),
    tf("Store passwords hashed with SHA-256.", false, "Fast hashes are brute-forced quickly. Use a slow, salted password hash: Argon2, scrypt or bcrypt."),
    pick("Which OAuth 2.0 flow should a mobile or single-page app use?", ["Implicit flow", "*Authorization code with PKCE", "Resource owner password", "Client credentials"], "PKCE protects the code exchange when the app can't keep a secret."),
    blank("An insecure direct object reference is fixed by checking ___ on every request.", ["*that the caller may access that object", "TLS", "CORS headers", "input length"], "Authenticating the user isn't enough; authorise each object."),
    odd("Which does NOT defend against SQL injection?", ["Parameterised queries", "ORM bound parameters", "A least-privilege database user", "*Base64-encoding the query"], "Encoding isn't validation; parameters keep data out of the query's code."),
  ],
  "multi-region": [
    match("Match the term to its meaning.", [["Active-passive", "A standby region takes over on failure"], ["Active-active", "All regions serve traffic"], ["Geo-DNS / anycast", "Send users to a nearby region"], ["CRDT", "Merge concurrent writes without conflicts"]]),
    guess("Round-trip time between New York and London over fibre, roughly?", { min: 0, max: 300, answer: 75, tol: 20, unit: "ms" }, "About 70–80 ms. Light in fibre travels ~200 km per ms, and routes aren't straight."),
    tf("Synchronous cross-region replication adds at least one inter-region round trip to each write.", true, "That's the price of RPO = 0."),
    pick("RTO measures…", ["*How long until service is restored", "How much data may be lost", "Requests per second", "Replication lag"], "RPO is the data-loss window; RTO is the downtime."),
    blank("Last-write-wins conflict resolution can silently ___ concurrent updates.", ["*lose", "duplicate", "encrypt", "merge"], "Clock skew decides the winner; the other write disappears."),
  ],
  "google-papers": [
    match("Match the Google system to what it is.", [["GFS", "Distributed file system with a single master"], ["MapReduce", "Batch jobs as map, shuffle, reduce"], ["Bigtable", "Sparse, sorted wide-column store"], ["Spanner", "Global SQL with TrueTime"], ["Borg", "Cluster scheduler, Kubernetes' ancestor"]]),
    order("Order a MapReduce job.", ["Split the input", "Map tasks emit key-value pairs", "Shuffle and sort by key", "Reduce tasks combine each key's values", "Write the output"]),
    tf("Chubby, Google's lock service, is built on Paxos.", true, "Bigtable and GFS use it for master election and metadata."),
    pick("TrueTime's clock uncertainty is typically…", ["*A few milliseconds", "A few seconds", "A few nanoseconds", "Exactly zero"], "GPS and atomic clocks keep it small; Spanner waits it out at commit."),
    pick("Dremel (BigQuery) made interactive analytics fast with…", ["*Columnar storage of nested records and a serving tree", "Row-oriented B-trees", "A single huge machine", "Full table caching in RAM"], "Reading only the needed columns, in parallel across thousands of leaves."),
  ],

  /* ---------------- LLD ---------------- */
  "oop-solid": [
    match("Match each SOLID letter to its rule.", [["S", "One reason to change"], ["O", "Extend without modifying"], ["L", "Subtypes are substitutable"], ["I", "Small, client-specific interfaces"], ["D", "Depend on abstractions"]]),
    tf("Composition is often preferred to inheritance because it couples classes less.", true, "Behaviour is plugged in and swapped, instead of fixed by a hierarchy."),
    pick("Square extends Rectangle, and setWidth also changes the height. Which principle breaks?", ["SRP", "OCP", "*LSP", "ISP"], "Code expecting a Rectangle is surprised when setting the width changes the area differently."),
    odd("Which is NOT one of the four pillars of OOP?", ["Encapsulation", "Abstraction", "Inheritance", "Polymorphism", "*Recursion"], "Recursion is a programming technique, not an OOP pillar."),
    blank("Depend on interfaces rather than concrete classes so you can ___ them in tests.", ["*substitute fakes for", "compile", "serialise", "inline"], "Dependency inversion is what makes unit tests fast and isolated."),
  ],
  "patterns-creational-structural": [
    match("Match the pattern to the problem it solves.", [["Builder", "Many optional constructor parameters"], ["Factory method", "Choose a concrete class at runtime"], ["Adapter", "Make an incompatible interface fit"], ["Decorator", "Add behaviour by wrapping"], ["Facade", "Simple front for a complex subsystem"]]),
    tf("Decorator and Proxy share a structure but differ in intent.", true, "Decorator adds behaviour; Proxy controls access (lazy loading, caching, remoting)."),
    pick("Thousands of trees in a game share textures and differ only by position. Pattern?", ["Prototype", "*Flyweight", "Singleton", "Bridge"], "Share the heavy intrinsic state; keep position as extrinsic state."),
    odd("Which is NOT a creational pattern?", ["Builder", "Factory method", "Prototype", "*Adapter"], "Adapter is structural."),
    blank("Bridge separates an abstraction from its ___ so both can vary independently.", ["*implementation", "tests", "documentation", "constructor"], "e.g. Shape × Renderer without a class for every combination."),
  ],
  "patterns-behavioral": [
    match("Match the pattern to its idea.", [["Observer", "Notify subscribers on change"], ["Strategy", "Swap an algorithm at runtime"], ["Command", "A request as an object (queue, undo)"], ["State", "Behaviour changes with internal state"], ["Template method", "Fixed skeleton, overridable steps"]]),
    order("Order undo/redo with the Command pattern.", ["An edit creates a Command object", "execute() it, push it on the undo stack and clear the redo stack", "Undo: pop it, call undo(), push it on the redo stack", "Redo: pop from redo, execute() again, push on undo"]),
    tf("In State, the object switches its own state; in Strategy, the client usually chooses.", true, "Same shape in code, different ownership of the decision."),
    pick("Send notifications to email, SMS and push without the publisher knowing them. Pattern?", ["*Observer", "Adapter", "Builder", "Visitor"], "Subscribers register; the publisher only knows an interface."),
    odd("Which is NOT a behavioural pattern?", ["Iterator", "Mediator", "Visitor", "*Singleton"], "Singleton is creational."),
  ],
  concurrency: [
    bug("A blocking queue's take(). Which line is wrong?", `
def take(self):
    with self.cond:
        if not self.items:
            self.cond.wait()
        return self.items.popleft()`, 3, "Use while, not if. A spurious wake-up, or another consumer grabbing the item first, leaves the queue empty."),
    match("Match the primitive to its guarantee.", [["Mutex", "One thread in the critical section"], ["Semaphore(n)", "At most n threads at once"], ["Condition variable", "Wait until a predicate holds"], ["Read-write lock", "Many readers or one writer"], ["Compare-and-swap", "Lock-free update of one value"]]),
    tf("Deadlock requires mutual exclusion, hold-and-wait, no preemption and circular wait.", true, "Break any one (usually circular wait, by lock ordering) and deadlock can't happen."),
    pick("Two threads run count += 1 and updates go missing. Why?", ["*It's a read-modify-write, not atomic", "Integers overflow", "The GIL prevents it", "Threads can't share memory"], "Both read the same old value and both write old + 1. Use a lock or an atomic counter."),
    odd("Which does NOT help prevent deadlock?", ["A global lock order", "tryLock with a timeout", "Acquiring all locks at once", "*Adding more threads"], "More threads add contention, not safety."),
  ],
  "lld-framework": [
    order("Order the steps of an object-oriented design round.", ["Clarify requirements, actors and scope", "Identify the core entities", "Define relationships and the class diagram", "Define the key methods and APIs", "Walk through use cases and edge cases, then extend"]),
    tf("In an LLD round, choose your patterns first and fit the requirements to them.", false, "Requirements first; patterns appear where something varies."),
    match("Match the relationship to an example.", [["Composition", "House and its rooms"], ["Aggregation", "Team and its players"], ["Inheritance", "Car is a Vehicle"], ["Dependency", "Checkout uses a PaymentGateway"]]),
    pick("Parking lot: where should \"find a free spot\" live?", ["*A spot-assignment strategy owned by the lot or floor", "Inside Vehicle", "Inside Ticket", "A global function"], "Isolating the policy lets you swap nearest-first for EV-first without touching other classes."),
    blank("Put what varies (pricing, assignment, notifications) behind ___ so new variants don't edit old code.", ["*interfaces (strategies)", "switch statements", "static methods", "constants"], "Open for extension, closed for modification."),
  ],
  "lld-quality": [
    bug("Which line hides an expected failure from the caller?", `
class Account:
    def __init__(self): self.balance = 0
    def withdraw(self, amount):
        if amount > self.balance: return
        self.balance -= amount`, 4, "A silent return looks like success. Raise InsufficientFunds or return a result the caller must check."),
    match("Match the technique to its payoff.", [["Fake clock", "Deterministic time in tests"], ["Dependency injection", "Swap collaborators"], ["Immutable value objects", "Safe sharing without defensive copies"], ["Explicit result types", "Expected failures visible in the signature"]]),
    tf("Calls like book(true, false, true) are hard to read; prefer named options or enums.", true, "Booleans hide meaning at the call site."),
    pick("Which change breaks existing callers?", ["*Renaming a public method", "Adding a new method", "Adding an overload", "Adding a private helper"], "Additive changes are backward compatible; renames aren't."),
    odd("Which is NOT a code smell?", ["God class", "Long parameter list", "Shotgun surgery", "*Small, focused interfaces"], "Small interfaces are the cure (interface segregation)."),
  ],

  /* ---------------- Interview craft ---------------- */
  "craft-hiring": [
    order("Order the usual big-tech hiring pipeline.", ["Application or referral", "Recruiter call", "Technical screen", "Onsite loop", "Decision (committee or debrief)", "Team match and offer"], "Some companies add an online assessment before the screen; team match happens at Google and Meta."),
    match("Match the company level to its rung.", [["Amazon SDE II", "Mid (Google L4)"], ["Meta E5", "Senior (Google L5)"], ["Goldman Sachs Analyst", "Entry level"], ["Microsoft 65–67", "Principal (above senior)"]]),
    tf("At Google, the interviewers who met you make the final hiring decision.", false, "A hiring committee that didn't interview you decides from the written packet."),
    pick("Which rounds mainly decide whether you're levelled senior?", ["Coding rounds", "*System design and behavioural", "The recruiter call", "The online assessment"], "Uncertain loops are levelled down."),
    guess("In interviewing.io's data, how often did a solid candidate (about 3 of 4 on average) fail a single round?", { min: 0, max: 60, answer: 22, tol: 6, unit: "%" }, "Up to about 22% of the time: one round is one noisy draw."),
  ],
  "craft-search": [
    pick("In Ashby's data, referred applicants were interviewed at about what rate, versus 3% for online applicants?", ["5%", "*40%", "90%", "3%"], "Referrals are about 1% of applications but convert far better."),
    tf("Most applicant tracking systems automatically reject resumes for formatting.", false, "In Enhancv's 2025 recruiter interviews, 23 of 25 said theirs don't; knockout questions and volume do the filtering."),
    order("Order the parallel-search plan.", ["List 8–12 companies in tiers", "Apply to all within a week, referrals first", "Start slow processes and warm-ups first", "Batch phone screens in 2–3 weeks", "Stack onsites so offers land together"]),
    odd("Which does NOT belong on an Indian tech resume for a product company?", ["Impact bullets with numbers", "Company names and titles", "Skills you can be quizzed on", "*Your photo and date of birth"], "Modern Indian tech resumes omit photo, date of birth and CTC."),
    blank("Google's resume formula: accomplished X, as measured by ___, by doing Z.", ["*Y", "salary", "years", "keywords"], "The X-Y-Z formula."),
  ],
  "craft-situations": [
    pick("Your internet drops mid-round. What should you do first?", ["Wait silently", "*Tell the interviewer, switch to a phone or hotspot, and inform the recruiter in writing", "End the interview", "Email next week"], "Google's guide: tell them, camera off, phone as a last resort, reschedule if needed."),
    tf("A humblebrag weakness like 'I'm a perfectionist' scores better than a real weakness.", false, "Sezer, Gino & Norton (2018): raters preferred honest weaknesses."),
    match("Match the situation to the move.", [["Silent interviewer", "Narrate checkpoints, pause a beat"], ["Hint seems wrong", "Test it on your example and ask"], ["Question switched mid-way", "Summarise part one, then ask what changes"], ["Approach breaks", "Name the failing case, pivot out loud"]]),
    odd("Which technique failed replication?", ["Practising with an observer", "Reappraising nerves as excitement", "Slow breathing", "*Power posing"], "Power posing did not replicate on hormones or behaviour."),
    pick("Why is calling a firing a 'layoff' risky in India?", ["It's not risky", "*Background checks compare exit records and provident-fund dates", "Recruiters can't ask", "Layoffs sound worse"], "Discrepancies found later can cost the offer."),
  ],
  "craft-offers": [
    order("Order the safe steps from offer to joining in India.", ["Written offer received", "Buyout or joining date agreed in writing", "Background check started, dates match", "Resign in writing", "Relieving letter", "Join"]),
    pick("Amazon's most flexible offer component is usually…", ["Base salary", "*The sign-on bonus", "The level", "Holidays"], "Base is capped; RSUs vest 5/15/40/40."),
    tf("A ₹30 LPA CTC is always better than a ₹24 LPA CTC.", false, "Split CTC into fixed, variable, one-time and stock; a fixed-heavy lower CTC can win."),
    match("Match the term to its meaning.", [["Cliff", "Nothing vests until a set date"], ["Clawback", "Repay a bonus if you leave early"], ["Buyout", "Pay to shorten your notice period"], ["Refresher", "Extra stock in later years"]]),
    guess("Amazon's RSU vesting in year one is about what percent of the grant?", { min: 0, max: 50, answer: 5, tol: 3, unit: "%" }, "5/15/40/40, offset by a two-year sign-on bonus."),
  ],
  "google-loop": [
    order("Order the usual Google hiring process.", ["Recruiter screen", "Technical screen", "Interview loop (coding, design, Googleyness and leadership)", "Hiring committee review", "Team match and offer"], "Interviewers write feedback; a committee decides. Confirm the exact steps with your recruiter."),
    tf("A single interviewer doesn't make the final hiring decision at Google.", true, "Written feedback from every round goes to a hiring committee."),
    pick("How long is a typical coding interview?", ["15 minutes", "*About 45 minutes", "90 minutes", "2 hours"], "Usually one main problem plus follow-ups."),
    match("Match the signal to what shows it.", [["Algorithms", "A correct, efficient approach"], ["Coding", "Clean code without a compiler"], ["Communication", "Thinking aloud, clarifying questions"], ["Problem solving", "Handling follow-ups and new constraints"]]),
    blank("Googleyness looks at comfort with ambiguity, collaboration and ___.", ["*doing the right thing for users and the team", "typing speed", "brain teasers", "Google trivia"], "It's about how you work, not culture-fit trivia."),
  ],
  "coding-round": [
    order("Order a strong coding-round answer.", ["Clarify and confirm with examples", "State a brute force and its complexity", "Find and agree on the optimal approach", "Write the code", "Dry-run a small case and edge cases", "State the final complexity and trade-offs"]),
    tf("Two silent minutes while you think are fine as long as the code ends up right.", false, "The interviewer can only credit reasoning they hear. Think aloud, even when unsure."),
    pick("Halfway through coding you spot a flaw in your approach. Best move?", ["*Say so, explain the fix and adjust", "Hide it and hope", "Restart silently", "Ask to skip the question"], "Catching your own bug is a positive signal."),
    odd("Which is NOT a useful clarifying question?", ["Can the input be empty?", "Are the values bounded?", "Should I optimise time or memory?", "*What's the LeetCode number?"], "Ask questions whose answers change the solution."),
    match("Match the habit to an example.", [["Edge cases", "Empty, single element, duplicates, negatives"], ["Dry run", "Trace the variables on a tiny input"], ["Follow-up", "What if the data doesn't fit in memory?"], ["Complexity", "O(n log n) time, O(n) space, said unprompted"]]),
  ],
  biases: [
    match("Match the trap to what it looks like.", [["Illusion of competence", "Re-reading feels like knowing"], ["Pattern anchoring from context", "The topic tag hands you the technique"], ["Hindsight bias", "\"I'd have got that\" after seeing the answer"], ["Planning fallacy", "Every study plan runs late"], ["Einstellung", "A known solution blocks a better one"]]),
    tf("Re-reading your notes is one of the most effective ways to study.", false, "Retrieval (testing yourself) and spacing beat re-reading, which mostly builds familiarity."),
    pick("Why does spacing reviews work?", ["*Retrieving right before you'd forget strengthens memory most", "It saves time", "It feels easier", "It avoids hard topics"], "Effortful recall is the workout; easy recall is the warm-up."),
    blank("The ___ effect: testing yourself improves retention more than restudying.", ["*testing", "Zeigarnik", "placebo", "halo"], "Also called retrieval practice. Every quiz and drill here uses it."),
    odd("Which is NOT a desirable difficulty?", ["Spacing", "Interleaving", "Retrieval practice", "*Highlighting the text"], "Highlighting feels productive but does little for recall."),
  ],
  behavioral: [
    order("Order a STAR answer.", ["Situation", "Task", "Action", "Result"], "Spend most of the time on Action; close with a measurable Result and what you learned."),
    tf("Saying \"we\" throughout a behavioural answer is best because it shows teamwork.", false, "The interviewer needs your contribution. Credit the team, then say \"I\" for what you did."),
    pick("\"What's your biggest weakness?\" Strongest answer?", ["*A real weakness, how it hurt, and what you now do about it", "\"I'm a perfectionist\"", "\"I have none\"", "A weakness unrelated to work"], "Self-awareness plus a working fix is the signal."),
    match("Match the question to the competency it probes.", [["Tell me about a conflict", "Collaboration"], ["A time you failed", "Ownership and learning"], ["Leading without authority", "Leadership"], ["A decision with incomplete data", "Handling ambiguity"]]),
    guess("About how long should one STAR answer run?", { min: 0, max: 10, answer: 2.5, tol: 1, unit: "min" }, "Roughly 2–3 minutes, leaving room for follow-up questions."),
  ],
};
