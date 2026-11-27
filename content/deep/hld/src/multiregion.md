=== region-topologies
blurb: Running one service from several regions of the world: why you'd do it (surviving a region failure, being close to users, keeping data in a country), the main shapes (active-passive and active-active, with read-local or write-local data), what each costs in latency, consistency and money, and how traffic moves when a region dies.
signals: "Make it survive a whole data centre going down" | Global users with low-latency requirements | "What happens if us-east-1 goes down?" | Choosing between async replicas and a globally consistent database
widgets: region-failover

--- lesson
:::words
- **Region**: a geographic area (Iowa, Belgium, Tokyo) with its own data centres, far enough from other regions that one disaster won't hit two.
- **Zone (availability zone)**: one of several separate data centres inside a region, with independent power and networking, a few milliseconds apart.
- **Active-passive**: one region serves all traffic; another stands by with a copy of the data and takes over if the first fails.
- **Active-active**: several regions serve live traffic at the same time.
- **Failover**: moving traffic (and the right to accept writes) from a failed region to a healthy one.
- **Home region**: the one region that owns a piece of data and accepts writes for it.
- **RPO / RTO**: how much recent data you could lose, and how long you could be down, when a disaster happens (covered in depth in the disaster-recovery page).
:::

## The problem in plain words

A single region, even with three zones, is still one place: a regional power or network failure, a bad configuration pushed to the whole region, or a natural disaster can take everything down at once. And a single region is far from most of the world: a user in Sydney talking to a server in Virginia waits about 200 ms for every round trip, before any work is done. Running in several regions fixes both, but creates the hardest problem in distributed systems: **the same data now lives in places 50–200 ms apart**, and the speed of light won't let them agree instantly.

:::eli5
A shop with one branch closes completely if that branch floods. Opening a second branch in another city keeps you open, but now both branches sell from the same stock list. Either one branch keeps the master list and the other phones in every sale (slow for the far branch), or each keeps its own list and they reconcile at night (fast, but two people might buy the last item).
:::

## Why go multi-region (and why not)

Three different reasons, which lead to different designs:
1. **Disaster tolerance**: survive the loss of a whole region. Needs a copy of the data elsewhere and a way to move traffic.
2. **Latency**: serve users from a nearby region. Needs the data users read (and ideally write) to be nearby.
3. **Data residency**: keep some users' data inside a country or region by law or contract (its own page).

Costs to name in an interview: double (or more) infrastructure, cross-region network charges, much harder consistency, more complex deploys and testing. Many systems need only **multi-zone** in one region (survives a data-centre failure with ~1–2 ms between copies, so synchronous replication is cheap) plus backups in another region. Go multi-region when the requirements (an availability target above ~99.95%, global latency targets, regulation) demand it.

## Typical distances

| Path | Round trip |
|---|---|
| Between zones in one region | ~1–2 ms |
| US east ↔ US west | ~60–70 ms |
| US east ↔ Western Europe | ~75–90 ms |
| Europe ↔ Asia, US ↔ Australia | ~150–250 ms |

Any write that must be confirmed by another region pays at least one of these round trips. That single fact drives every choice below.

## Shape 1: active-passive (primary + standby)

All writes (and usually reads) go to the primary region; data is replicated to a standby region.
- **Asynchronous replication**: the primary confirms writes immediately and ships them afterwards. Fast writes, but if the primary dies, the last few seconds of writes that hadn't shipped are **lost** (RPO = replication lag).
- **Synchronous replication**: the primary waits for the standby to confirm each write. No loss, but every write pays the cross-region round trip, and the primary stalls if the standby is unreachable (unless it falls back to async, giving up the guarantee).
- **Failover**: detect the failure, make sure the old primary can no longer accept writes (fencing), promote the standby, move traffic (DNS, global load balancer). Done automatically it takes seconds to minutes; done by people, much longer. The standby must have **enough capacity** to take all the traffic, or be able to scale up quickly.

The danger is **split brain**: if the network between regions breaks but both are alive, an automatic failover can leave two primaries accepting writes. Use a quorum-based arbiter in a third location, or fence the old primary, before promoting.

Variants by how warm the standby is: **cold** (backups only; rebuild everything; hours), **warm / pilot light** (data replicated, minimal servers running, scaled up on failover; minutes to tens of minutes), **hot standby** (fully running; seconds to minutes).

## Shape 2: active-active

Every region serves live traffic. The question is what happens to **writes**:
- **Read-local, write-global (single writer per item)**: reads are served from a local replica; writes go to the item's **home region** (or a global leader). Common and safe: no conflicts, because each item has one writer. Writes from far away are slower. Reads may be slightly stale unless you route read-after-write to the home region.
- **Write-local, async multi-leader**: each region accepts writes and replicates to the others asynchronously. Lowest latency everywhere, but **concurrent writes to the same item conflict** and must be resolved (last-writer-wins, version vectors, CRDTs: next page). Good for data that's naturally per-user or mergeable (likes, carts, presence), risky for money and inventory.
- **Geo-partitioned (home region per user or tenant)**: each user's data lives in, and is written in, their home region; it's the read-local/write-global idea applied by user, and it doubles as a residency tool. Cross-region interactions (a US user messaging an EU user) need care.
- **Globally consistent database (Spanner, CockroachDB)**: writes are committed through a consensus group (Paxos/Raft) spread over regions, e.g. replicas in three regions with a quorum of two. Strong consistency and automatic failover with no data loss, at the price of write latency of at least one round trip to the nearest quorum (often 10–100 ms). Leaders can be placed near the users who write most.

Active-active brings a capacity rule: with N regions each running at full share, losing one sends its traffic to the rest. With 3 regions, each must run at no more than ~66% so the other two can absorb the third's load (**N+1 capacity**).

## Moving traffic

- **DNS-based**: change records to point at the healthy region. Simple, but clients and resolvers cache answers (TTL), so a few minutes of stragglers.
- **Anycast global load balancer** (Google Cloud's global load balancer, Cloudflare): one IP worldwide, traffic enters at the nearest edge and is sent to the nearest healthy backend; failover takes seconds and needs no DNS change.
- **Client-side**: mobile apps with a list of regional endpoints and health checks.
Whatever the method, **practise it**: regular failover drills (Google runs DiRT, its disaster recovery testing) are the only way to know it works.

Fail a region under each topology and compare what's lost:

[[widget:region-failover]]

## How Google-scale systems usually do it

- Stateless serving everywhere, behind a global load balancer.
- User-facing data in a globally replicated, strongly consistent store (Spanner) when correctness matters, with leaders placed near writers; caches and read replicas near readers.
- Mergeable or per-user data (counters, presence, drafts) replicated asynchronously.
- **Static stability**: each region is pre-provisioned to survive a neighbour's loss without needing to create resources during the emergency (the control plane may be the thing that's broken).

## Interview angles

- "What if a region goes down?" Name the topology, the RPO (what's lost: async lag or zero), the RTO (how failover happens and how fast), who decides (automatic with a quorum arbiter, or a human), and whether the survivors have the capacity.
- "Global users, low latency?" Read-local everywhere; for writes, either a home region per user (geo-partitioning), a consistent database with leaders near writers, or mergeable data types. Say which data gets which.
- "Why not just active-active everything?" Conflicts and write latency: decide per data type whether it can be merged.

--- revise
### Shapes
? Active-passive vs active-active? :: One region serves while another stands by with a copy; vs all regions serve live traffic.
? Async vs sync cross-region replication? :: Async: fast writes, last seconds lost on failover. Sync: no loss, every write pays a cross-region round trip and stalls if the replica is unreachable.
? Cold, warm, hot standby? :: Backups only (hours); data replicated with minimal servers to scale up (minutes); fully running (seconds to minutes).
? Write options in active-active? :: Home region per item (no conflicts), multi-leader async (conflicts to resolve), geo-partitioning by user, or a consensus-based global database (Spanner).

### Failover
? What is split brain and how is it prevented? :: Two primaries accepting writes after a network split; use a quorum arbiter in a third location or fence the old primary before promoting.
? N+1 capacity with 3 active regions? :: Each runs at ≤ ~66% so two can absorb the third's load.
? DNS vs anycast failover? :: DNS is limited by cached TTLs (minutes); anycast global load balancing shifts traffic in seconds.
? What is static stability? :: Regions are pre-provisioned to survive a neighbour's failure without creating resources during the emergency.

### Numbers
? Cross-region round trips? :: Zones ~1–2 ms; US coasts ~65 ms; US–Europe ~80 ms; Europe–Asia or US–Australia ~150–250 ms.

--- notes
## Why multi-region
Survive a whole region failing.
Serve users from nearby (latency).
Keep data in a country (residency).
Cost: 2× or more infrastructure, cross-region traffic, harder consistency and deploys.
Often multi-zone in one region plus backups elsewhere is enough.
## Distances
Zones ~1–2 ms; US east–west ~65 ms; US–Europe ~80 ms; Europe–Asia, US–Australia ~150–250 ms.
Every cross-region confirmation costs at least one of these.
## Active-passive
One primary region; standby holds a copy.
Async replication: fast, loses unshipped writes (RPO = lag).
Sync replication: zero loss, slower writes, stalls if the standby is unreachable.
Cold (backups, hours) → warm/pilot light (minutes) → hot (seconds).
Failover: detect, fence old primary, promote, move traffic; standby needs full capacity.
Split brain: prevent with a quorum arbiter in a third place, or fencing.
## Active-active
Read-local, write to the item's home region: no conflicts.
Write-local multi-leader: fastest, needs conflict resolution.
Geo-partitioned: each user's home region; also a residency tool.
Consensus database (Spanner, CockroachDB): strong consistency, zero-loss failover, write latency ≥ nearest quorum round trip.
N+1 capacity: 3 regions each ≤ ~66%.
## Traffic
DNS failover: minutes (TTL caching).
Anycast global load balancer: seconds.
Practise failovers (Google DiRT); static stability.

--- doubts
Q: Isn't three zones in one region already highly available?
A: For most failures, yes: a zone is a separate data centre, and synchronous replication across zones is cheap (1–2 ms). What multi-zone doesn't cover is anything that hits the whole region: a regional network or power problem, a bad config or software push to the region, a natural disaster, or a cloud provider's regional control-plane outage. Whether that risk justifies multi-region depends on the availability target and cost of downtime.

Q: Why not replicate synchronously across regions and never lose data?
A: You can, but every write waits for a round trip of 60–200 ms, and if the other region is unreachable, writes either stop (safe) or continue unreplicated (back to possible loss). Consensus databases soften this by needing only a majority (say 2 of 3 regions, choosing nearby ones), so one distant or failed region doesn't block writes.

Q: Is active-active always better than active-passive?
A: No. Active-active gives lower latency and uses all capacity, but either brings write conflicts (multi-leader) or write latency (global consensus), and makes every deploy and bug global. Active-passive is simpler to reason about. Many systems mix: active-active for stateless serving and reads, a single writer per piece of data.

Q: Who decides to fail over, a machine or a human?
A: Automatic failover is faster, but a false alarm (a slow network mistaken for a dead region) can cause split brain or needless disruption. Systems with consensus (Spanner, Raft-based stores) fail over automatically and safely because a majority must agree. For simpler primary/standby databases, many teams automate detection but keep a human approval step, or use an external arbiter with fencing.

--- exercises
[estimate] A social app has 60% of users in North America, 25% in Europe, 15% in Asia. One region in Virginia serves everyone; a page needs 4 sequential round trips to the backend. Roughly how long does an Asian user wait for the network alone, and what changes with read replicas in Europe and Asia?
A: Asia ↔ Virginia ≈ 200 ms per round trip × 4 = ~800 ms of pure network. With a local read replica (~5–20 ms away) the same reads take well under 100 ms. Writes still travel to Virginia (~200 ms each), so make writes asynchronous to the user where possible (optimistic UI) or move each user's home region closer.

[choose] Pick a multi-region approach for each: (a) bank account balances, (b) a user's "last seen" status, (c) product catalogue edited by staff, read by millions, (d) shopping carts.
A: (a) Strongly consistent global database or single home region per account, never async multi-leader (money can't merge). (b) Write-local, async, last-writer-wins is fine. (c) Single writer region, read replicas and CDN everywhere. (d) Write-local with a mergeable cart (CRDT-style add/remove sets), or home region per user.

[break] A team runs active-passive with async replication and automatic failover triggered when the standby misses 3 heartbeats (3 s). A 10-second network blip between regions happens. What goes wrong, and how do you fix it?
A: The standby promotes itself while the primary is still alive and serving: split brain, with two regions accepting writes that will conflict. Fixes: require a quorum (an arbiter in a third region) to agree the primary is dead; fence the old primary (revoke its lease or write permission) before promoting; use longer, multi-signal detection; or use a consensus-based database that handles this by design.

[design] Design the regional layout for a global video-chat service's signalling and account data, with a 99.99% availability target.
A: Stateless signalling servers in many regions behind an anycast load balancer; calls connect to the nearest region and media flows peer-to-peer or through the nearest relay. Account and contact data in a globally replicated consistent store (or per-user home region with async read replicas); presence data write-local and async. Each region sized for N+1. Regular failover drills; static stability so a region can absorb load without the control plane.

--- pitfalls
- Going multi-region without stating which requirement (disaster, latency, residency) it serves
- Async replication without admitting the data-loss window
- Automatic failover without fencing or a quorum (split brain)
- Survivor regions without spare capacity to absorb a failed region
- Forgetting cross-region write latency when choosing synchronous or consensus replication
- Never testing failover

--- quiz
Q: In active-passive with asynchronous replication, what is lost when the primary region fails?
- Nothing
- *Writes confirmed by the primary but not yet shipped to the standby
- All data since the last backup
- Only reads
W: RPO equals the replication lag at the moment of failure.
Q: Three active regions share load evenly. What's the highest utilisation each should run at to survive losing one?
- 33%
- *About 66%
- 90%
- 100%
W: Two regions must absorb the third's traffic: 3 × u ≤ 2 × 100%.
Q: The main cost of a Spanner-style globally consistent write is…
- Possible data loss
- *At least one round trip to a quorum of replicas in other regions
- Conflicts to resolve later
- No failover
W: Consensus gives consistency and zero-loss failover by waiting for a majority.
Q: What prevents split brain during automatic failover?
- Shorter heartbeats
- *A quorum arbiter or fencing the old primary before promotion
- DNS with a short TTL
- More replicas in the same region
W: Two primaries must never both accept writes.

--- sources
- article :: Disaster recovery planning guide :: Google Cloud Architecture Center :: https://cloud.google.com/architecture/dr-scenarios-planning-guide
- paper :: Spanner: Google's Globally-Distributed Database (OSDI 2012) :: Corbett et al. (Google) :: https://research.google/pubs/spanner-googles-globally-distributed-database-2/
- article :: Static stability using Availability Zones :: AWS Builders' Library :: https://aws.amazon.com/builders-library/static-stability-using-availability-zones/
- book :: Designing Data-Intensive Applications, ch. 5 (Replication) :: Martin Kleppmann :: https://dataintensive.net/
- article :: Disaster recovery options in the cloud :: AWS whitepaper :: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html

=== conflict-resolution
blurb: What to do when two places change the same data at the same time without talking to each other: last-writer-wins and what it silently throws away, version vectors that detect true concurrency, application merges, and CRDTs (counters, sets, registers and text) that merge automatically and always agree in the end.
signals: Multi-region writes to the same data | Offline-first mobile apps | Collaborative editing | Shopping carts in Dynamo-style stores | "Two users edit the same thing at once"
widgets: crdt-lab

--- lesson
:::words
- **Concurrent writes**: two changes made without either knowing about the other, so neither "came after" the other.
- **Conflict**: concurrent writes to the same data that can't both be kept as they are.
- **Last-writer-wins (LWW)**: keep the write with the latest timestamp and discard the others.
- **Version vector**: a small list of counters, one per replica, attached to a value, which tells whether one version includes another or whether they're concurrent.
- **Siblings**: the concurrent versions a database keeps (instead of choosing) so the application can merge them.
- **CRDT (conflict-free replicated data type)**: a data structure designed so that replicas can be changed independently and always merge to the same result.
- **Convergence**: all replicas that have seen the same updates end up with the same value.
:::

## The problem in plain words

When replicas accept writes independently (multi-region active-active, phones editing offline, leaderless databases), two of them can change the same thing before hearing about each other. When they finally sync, the system must decide what the value is now, and every replica must decide **the same way**, or they'll disagree forever. The choices range from "keep one, drop the other" (simple, loses data) to "merge them meaningfully" (needs the data type to support merging).

:::eli5
Two siblings keep the family shopping list on separate notepads while out. One adds milk; the other crosses off bread and adds eggs. At home, "keep the notepad written last" throws away someone's changes. "Combine both notepads" (add everything added, remove what was crossed off) keeps everyone's intent. CRDTs are notepads designed so that combining always works.
:::

## Last-writer-wins: simple, and silently lossy

Each write carries a timestamp; on conflict the larger timestamp wins (ties broken by replica ID). It converges, it's cheap, and Cassandra uses it by default. The problems:
- **Lost updates**: two concurrent increments of a counter from 5 both write 6; one increment vanishes. An item added to a cart in one region and another added elsewhere: one is lost.
- **Clock skew**: "latest" depends on clocks. A replica whose clock runs 2 seconds fast wins every conflict for 2 seconds, even against writes made later in real time.
LWW is right when values are genuinely replaced as a whole and losing a concurrent write is acceptable: a profile photo, "last seen" time, a cache entry. It's wrong for anything that accumulates.

## Detecting concurrency: version vectors

To do better than LWW, the system must know whether two versions are **ordered** (one already includes the other: keep the newer) or **concurrent** (neither saw the other: a real conflict). A **version vector** has one counter per replica: each replica increments its own counter when it accepts a write, and a version carries the vector of everything it has seen.
- `{A:2, B:1}` vs `{A:3, B:1}`: the second includes the first (every counter ≥): keep the second.
- `{A:3, B:1}` vs `{A:2, B:2}`: each has something the other lacks: **concurrent**.

Dynamo (and Riak) keep concurrent versions as **siblings** and return them all on the next read; the application merges them (Amazon's cart took the union of items) and writes back the merged value with a vector that dominates both. This never loses a write silently, but pushes merge logic into the application, and the union approach can resurrect deleted items unless deletions are tracked.

## CRDTs: data types that merge themselves

A CRDT defines, for its data type, a merge that is **commutative, associative and idempotent**: the order, grouping and repetition of syncs don't matter, so any two replicas that have seen the same updates hold the same value, with no coordination. Common ones:
- **G-Counter** (grow-only counter): each replica keeps its own count; the value is the sum; merge takes the max per replica. Concurrent increments are never lost.
- **PN-Counter**: two G-counters, one for increments and one for decrements (likes and unlikes).
- **LWW-Register**: a single value with LWW (yes, LWW is a CRDT; it converges, it just loses concurrent writes).
- **MV-Register (multi-value)**: keeps all concurrent values, like siblings.
- **OR-Set (observed-remove set)**: each add gets a unique tag; a remove deletes only the tags it has seen. So "add milk" concurrent with "remove milk" keeps milk (add wins), and a removed item can't come back through an old copy.
- **Maps, lists and text**: sequence CRDTs (RGA, Logoot, and the ones inside Automerge and Yjs) give every character a unique, ordered identifier so concurrent inserts interleave deterministically.

Costs: metadata (tags, tombstones for deleted items, per-replica counters) that must be garbage-collected; and the merged result is consistent but not always what a human would choose (two people renaming a file concurrently still need a rule). And CRDTs can't enforce **invariants** across replicas: "balance ≥ 0" or "only 1 seat left" can't be guaranteed without coordination.

Edit two replicas while they're disconnected, then sync them with each strategy:

[[widget:crdt-lab]]

## Collaborative editing: OT and CRDTs

Google Docs uses **operational transformation (OT)**: every edit is an operation ("insert 'x' at position 5"); a central server orders operations and transforms concurrent ones against each other (if someone inserted 3 characters before position 5, my insert moves to 8). OT needs a central server to order operations, which Docs has. **CRDT-based** editors (Automerge, Yjs; Figma uses a CRDT-inspired, server-ordered design per property) can merge without a central authority and work well offline and peer-to-peer. Both give everyone the same document in the end; interviewers mainly want to hear that you know these exist and why plain LWW on the whole document would be unacceptable.

## Avoiding conflicts in the first place

Often the best conflict resolution is not having conflicts:
- Give each item a **single home** (one writer region per user, per document, per account).
- Route all writes for an item through one leader (or a consensus group) and accept the latency.
- Make operations **commutative** by design: store "add 5" events instead of overwriting totals; append to logs instead of updating in place.
- Coordinate only for operations that need invariants (reserve the last seat, spend money) and let everything else be eventually consistent.

## Interview angles

- "Two regions update the same record": first ask whether it can have one home region. If not, choose per field: LWW for replaceable values, CRDT counters and sets for accumulating ones, coordination for invariants.
- "How does a cart survive concurrent adds?" Version vectors + sibling merge (Dynamo) or an OR-set CRDT.
- "Why not timestamps?" Clock skew and silent lost updates.

--- revise
### Strategies
? What does last-writer-wins lose? :: Every concurrent write except the one with the highest timestamp; also it trusts possibly skewed clocks.
? When is LWW fine? :: For values replaced as a whole where losing a concurrent write is acceptable (profile photo, last seen).
? What do version vectors tell you? :: Whether one version includes the other (keep the newer) or they're concurrent (a real conflict).
? How did Dynamo's cart handle conflicts? :: Kept concurrent versions as siblings; the app merged them (union) and wrote back.

### CRDTs
? Property that makes CRDT merges safe? :: Merge is commutative, associative and idempotent, so replicas that saw the same updates converge.
? How does a G-counter work? :: Each replica counts its own increments; value = sum; merge = per-replica max.
? OR-set rule for add vs remove? :: Adds get unique tags; a remove deletes only tags it has seen, so a concurrent add survives.
? What can't CRDTs guarantee? :: Cross-replica invariants like "balance ≥ 0" or "last seat sold once": those need coordination.

### Editing and avoidance
? OT vs CRDT for collaborative text? :: OT transforms concurrent operations via a central server (Google Docs); CRDTs merge without one (Automerge, Yjs).
? Best way to avoid conflicts? :: A single home/writer per item, or commutative operations (events, appends).

--- notes
## Why conflicts happen
Replicas accept writes independently: multi-region, offline phones, leaderless stores.
All replicas must resolve the same way, or they never converge.
## Last-writer-wins
Highest timestamp wins; ties by replica ID; Cassandra's default.
Loses concurrent writes silently (two increments → one).
Depends on clocks: a fast clock wins wrongly.
Fine for whole-value replacement (photo, last seen); wrong for accumulating data.
## Version vectors
One counter per replica; increment your own on each write.
All counters ≥ → newer version; otherwise concurrent.
Dynamo/Riak keep concurrent versions as siblings; the app merges and writes back.
Naive union merge can resurrect deleted items.
## CRDTs
Merge is commutative, associative, idempotent → convergence without coordination.
G-counter: per-replica counts, sum, merge by max.
PN-counter: increments and decrements as two G-counters.
LWW-register: converges, loses concurrent writes.
MV-register: keeps all concurrent values.
OR-set: unique tags per add; remove only seen tags; add wins over concurrent remove.
Sequence CRDTs (RGA, Automerge, Yjs) for lists and text.
Costs: metadata and tombstones to garbage-collect; no cross-replica invariants.
## Collaborative editing
OT: server orders and transforms concurrent ops (Google Docs).
CRDTs: merge without a central server; good offline (Automerge, Yjs).
## Avoid conflicts
Single home per item; route writes to one leader.
Commutative operations: events and appends instead of overwrites.
Coordinate only where invariants matter (money, last seat).

--- doubts
Q: If LWW loses data, why do databases use it by default?
A: Because it's simple, needs no extra metadata or application logic, and always converges. For many values (a setting, a status, a cached result) a concurrent write being dropped doesn't matter. The mistake is using it for counters, sets and anything where both writes carry meaning.

Q: What's the difference between a version vector and a vector clock?
A: They have the same shape (one counter per node) and are often confused. Vector clocks order events (every message and event in a system); version vectors track versions of one piece of data across replicas. In databases you almost always mean version vectors.

Q: Why does an OR-set need unique tags? Can't you just remember removed items?
A: If you keep a plain "removed" list, re-adding an item later is impossible (it's removed forever), and you can't tell a new add from an old one. Unique tags let a remove apply only to the specific adds it observed, so a new add after or concurrent with the remove survives, which matches what users expect.

Q: Can CRDTs implement a bank account?
A: Only the bookkeeping part: a PN-counter can track deposits and withdrawals and converge. What it can't do is refuse a withdrawal that would make the balance negative across replicas, because each replica only sees its own operations at decision time. That invariant needs coordination (a single leader or consensus) at the moment of withdrawal.

--- exercises
[choose] For each field of a shared document app, choose LWW, a CRDT, or coordination: (a) document title, (b) view count, (c) list of collaborators, (d) document body text, (e) "only the owner can delete" rule.
A: (a) LWW register is acceptable (concurrent renames are rare; or keep both and show a conflict). (b) G-counter CRDT. (c) OR-set CRDT so concurrent add and remove behave sensibly. (d) Sequence CRDT or OT through a central server. (e) Coordination: permission changes and deletion must be checked against an authoritative source, not merged.

[estimate] Two replicas each accept 100 increments to a like counter while partitioned, starting from 1,000. What value results from (a) LWW on the total, (b) a G-counter?
A: (a) Each replica writes 1,100; LWW keeps one of them: 1,100, losing 100 likes. (b) Replica A's count 100, B's 100, plus the 1,000 base: 1,200, all likes kept.

[break] A Dynamo-style cart merges siblings by taking the union of items. Users complain that items they removed keep coming back. Explain and fix.
A: A removal on one replica is concurrent with an older version still containing the item; the union brings it back because removals aren't represented. Fix with an OR-set (track adds with unique tags and removals of observed tags) or store removals as tombstones that the merge respects.

[design] Design offline editing for a notes app used on phone and laptop, both of which can edit while offline.
A: Represent each note as a CRDT document (Automerge/Yjs-style): text as a sequence CRDT, title as an LWW or MV register, tags as an OR-set. Each device keeps a local copy and an operation log; on reconnect, devices exchange missing operations through the server (which stores and relays them, and can compact history). Show conflicts only where a register kept multiple values. Garbage-collect tombstones once all devices have acknowledged them.

--- pitfalls
- LWW on counters, sets or anything accumulative
- Trusting wall-clock timestamps across machines
- Union merges that resurrect deleted items
- Expecting CRDTs to enforce invariants like non-negative balances
- Not first asking whether the item can simply have a single home

--- quiz
Q: Two replicas both increment a counter from 10 while disconnected; with LWW on the value the result is…
- 12
- *11
- 10
- Undefined forever
W: Both write 11; one write wins.
Q: Version vectors {A:2, B:3} and {A:3, B:2} are…
- Equal
- The second is newer
- *Concurrent
- Invalid
W: Each has a counter the other lacks.
Q: In an OR-set, an add and a remove of the same item happen concurrently. The result is…
- The item is removed
- *The item is present
- A conflict error
- Depends on timestamps
W: The remove only deletes tags it observed; the new add's tag survives.
Q: Which can a CRDT not guarantee on its own?
- Convergence
- Counting concurrent increments
- *That a balance never goes below zero across replicas
- Merging sets
W: Invariants across replicas need coordination.

--- sources
- paper :: Conflict-free Replicated Data Types (SSS 2011) :: Shapiro, Preguiça, Baquero, Zawirski :: https://inria.hal.science/inria-00609399
- paper :: Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007) :: DeCandia et al. :: https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf
- article :: How Figma's multiplayer technology works :: Evan Wallace (Figma) :: https://www.figma.com/blog/how-figmas-multiplayer-technology-works/
- article :: Local-first software :: Kleppmann, Wiggins, van Hardenberg, McGranaghan (Ink & Switch) :: https://www.inkandswitch.com/local-first/
- book :: Designing Data-Intensive Applications, ch. 5 (Handling write conflicts) :: Martin Kleppmann :: https://dataintensive.net/

=== disaster-recovery
blurb: Planning for the day something destroys data or a whole site: RPO and RTO as the two numbers that drive everything, backups versus replicas (replicas copy mistakes too), point-in-time recovery, the 3-2-1 rule, immutable backups against ransomware, and why an untested restore is not a backup.
signals: "How do you recover if the database is deleted?" | Ransomware and accidental deletion | Region-wide outage | Compliance requirements for backups
widgets: rpo-rto

--- lesson
:::words
- **Disaster**: an event that destroys or corrupts data or takes a site down for a long time: a region outage, a bad migration, an accidental `DELETE`, ransomware.
- **RPO (recovery point objective)**: the most recent data you can afford to lose, measured in time ("we may lose up to 5 minutes of writes").
- **RTO (recovery time objective)**: how long you can afford to be down before service is restored ("back within 1 hour").
- **Backup**: a separate, point-in-time copy of data kept so you can restore it later.
- **Snapshot**: a fast, point-in-time image of a disk or database, often stored incrementally.
- **PITR (point-in-time recovery)**: restoring to any moment, by replaying the database's change log on top of a backup.
- **Immutable backup**: a backup that can't be changed or deleted until its retention period ends, even by an administrator.
:::

## The problem in plain words

Replication protects you from a machine or a zone dying. It does **not** protect you from the most common disasters, because replicas faithfully copy whatever happens to the primary: a buggy migration that corrupts a table, an engineer who drops the wrong database, ransomware encrypting files, a bad script deleting objects. Within seconds every replica has the same damage. Disaster recovery is about having **copies from before the damage**, in a place the damage can't reach, and a practised way to bring service back.

:::eli5
A photocopier that copies every page you write instantly is great if your notebook gets lost, but useless if you spill ink on a page: the copy gets the ink too. You also need yesterday's copy, kept in a different drawer, that nobody can scribble on.
:::

## RPO and RTO: the two numbers that decide everything

Every DR design starts by agreeing, per system, with the business:
- **RPO**: how much data may be lost. 24 hours (restore last night's backup) vs 5 minutes vs zero.
- **RTO**: how long service may be down. Days vs 1 hour vs seconds.

Tighter numbers cost much more. A rough ladder:

| Approach | RPO | RTO | Cost |
|---|---|---|---|
| Nightly backup to another region, rebuild on demand | ≤ 24 h | Hours to days | Low |
| Frequent snapshots + continuous log shipping (PITR) | Minutes | ~1 hour | Moderate |
| Warm standby (async replica + scaled-down servers) | Seconds | Minutes | Higher |
| Hot standby / active-active, sync or consensus replication | ~0 | Seconds to minutes | Highest |

Set them per system: the payment ledger may need RPO 0, the analytics warehouse can lose a day.

## Backups done properly

- **3-2-1 rule**: at least **3** copies, on **2** different kinds of storage, **1** of them off-site (another region, another account). Modern additions: 1 copy immutable or offline, and 0 errors in restore tests.
- **Point-in-time recovery**: full backup (weekly or daily) + incremental snapshots + the continuous write-ahead log. You can restore to 14:31:59, one second before the bad migration ran: the RPO for **logical** mistakes becomes seconds.
- **Isolation**: backups in a separate account or project, with separate credentials, so an attacker (or a mistaken script) with production access can't delete them. **Object lock / retention policies** make them immutable for N days.
- **Retention**: keep enough history to notice slow corruption (a bug that subtly damages records for weeks needs backups older than the bug). Typical: daily for 30 days, monthly for a year; plus legal requirements.
- **Encryption**: backups are encrypted, and the keys are backed up separately and recoverably (losing the key loses the backup).
- **Application consistency**: a backup taken mid-transaction across several databases may not be consistent; use database-native backups, or quiesce and snapshot together.

## Testing restores

"No one wants backups; everyone wants restores." Google's SRE book makes this point: a backup that hasn't been restored is a hope, not a plan. Practices:
- **Automated restore tests**: regularly restore backups into a scratch environment and verify data (row counts, checksums, application-level checks).
- **Measure the RTO** during drills: restoring 50 TB at 500 MB/s takes over a day, which may break the RTO even though the backup is fine.
- **Game days / DiRT**: practise full regional failovers and restores, including people (who has access? does the runbook work?).

## Recovering from the most common disasters

| Disaster | What saves you |
|---|---|
| Machine or zone failure | Replication, automatic failover |
| Whole region down | Cross-region replica or standby, global traffic management |
| Bad deploy or config | Rollback, canaries (reliability chapter) |
| Bad migration / logical corruption | PITR to just before the change; delayed replicas |
| Accidental delete of objects | Versioning + soft delete + retention locks |
| Ransomware / malicious admin | Immutable, isolated backups with separate credentials |
| Lost encryption keys | Key backups, KMS with recovery and deletion delays |

A **delayed replica** (one that applies changes 1 hour late) is a neat middle ground: if someone drops a table, you have an hour to stop it applying the drop and copy the table back.

Pick a strategy and a disaster time, and see what's lost and how long you're down:

[[widget:rpo-rto]]

## Real incidents worth knowing

- **GitLab, January 2017**: an engineer deleted a production database directory on the wrong server during an incident. Of five backup and replication mechanisms, several were silently broken; the restore used a 6-hour-old copy taken by chance. Lessons: monitor backups, test restores, separate environments clearly.
- Cloud providers have had region-wide outages (power, networking, control-plane bugs); designs that assumed "the region is always there" went down with them.

## Interview angles

- "How do you protect against data loss?" Separate replication (availability) from backups (recovery): PITR, off-region copies, immutability, tested restores, and RPO/RTO per data store.
- "Someone ran DELETE without WHERE: what now?" PITR to just before the statement into a new instance, extract the rows, reinsert; or use a delayed replica.
- "Region down": failover to the standby (RPO = replication lag) and the capacity plan.

--- revise
### Objectives
? RPO vs RTO? :: How much recent data you may lose (time) vs how long you may be down.
? Why don't replicas replace backups? :: Replicas copy mistakes, corruption and deletions within seconds; backups hold copies from before the damage.
? Cost ladder from cheap to expensive? :: Nightly backup (RPO ≤ 24 h) → snapshots + log shipping/PITR (minutes) → warm standby (seconds) → hot/active-active (≈0).

### Backups
? 3-2-1 rule? :: 3 copies, 2 kinds of storage, 1 off-site (plus 1 immutable, 0 restore errors).
? How does PITR work? :: Base backup plus replay of the write-ahead log up to the chosen moment.
? Why isolate backups in another account with immutability? :: So ransomware, attackers or mistaken scripts with production access can't delete them.
? What's a delayed replica? :: A replica that applies changes late (say 1 hour), giving time to rescue data before a bad change lands.

### Practice
? Why test restores? :: Untested backups are often broken or too slow to meet the RTO.
? Lesson of GitLab 2017? :: Several backup mechanisms had silently failed; monitor backups and test restores.

--- notes
## Objectives
RPO: data you may lose, in time.
RTO: time you may be down.
Set per system with the business; tighter = costlier.
## Ladder
Nightly off-region backup: RPO ≤ 24 h, RTO hours–days.
Snapshots + continuous log shipping (PITR): RPO minutes, RTO ~1 h.
Warm standby: RPO seconds, RTO minutes.
Hot standby / active-active with sync or consensus: RPO ≈ 0, RTO seconds–minutes.
## Replication is not backup
Replicas copy deletes, corruption and ransomware within seconds.
Backups are copies from before the damage, out of its reach.
## Backups
3-2-1: 3 copies, 2 media, 1 off-site; + 1 immutable, 0 restore errors.
PITR: base backup + write-ahead log replay to any second.
Separate account and credentials; object lock / retention for immutability.
Retention long enough to catch slow corruption (daily 30 d, monthly 1 y).
Encrypt backups; back up the keys separately.
Use database-native, consistent backups.
Delayed replica: an hour's grace to undo a bad change.
## Restores
Automate restore tests and verify the data.
Measure restore time: 50 TB at 500 MB/s ≈ 28 h.
Drills and game days (Google DiRT); runbooks and access checked.
## Incidents
GitLab 2017: wrong-server delete; several backups silently broken; restored a 6-hour-old copy.

--- doubts
Q: We have three replicas across zones. Do we still need backups?
A: Yes. Replicas protect availability against hardware failure; they don't protect history. Any logical mistake (bad code, bad migration, accidental delete) or malicious change is replicated to all three almost instantly. Backups, ideally point-in-time, are the only way back to the state before the mistake.

Q: How can RPO be seconds with backups taken only daily?
A: Through point-in-time recovery: the daily backup is the starting point, and the database's write-ahead log is shipped continuously (every few seconds) to backup storage. Restoring means loading the backup and replaying the log up to the chosen moment. For a region loss you'd lose only the log not yet shipped.

Q: Isn't restoring from backup always slow?
A: It depends on size and method. Restoring a few gigabytes takes minutes; tens of terabytes can take a day at realistic throughput. If the RTO is shorter than a full restore, you need a standby (warm or hot) rather than backups alone, or restore in parallel shards, or restore the most important data first.

--- exercises
[estimate] A 20 TB database must meet RTO 2 hours after a region loss. Restores run at 400 MB/s. Can backups alone meet it?
A: 20 TB ÷ 400 MB/s = 50,000 s ≈ 14 hours. No: backups alone give RTO ~14 h plus setup. You need a warm standby in another region (async replica, RTO minutes) and keep backups for logical errors.

[break] A company keeps nightly backups in the same cloud account as production, written by the same service account. Ransomware gets admin credentials. What happens, and how do you fix it?
A: The attacker deletes or encrypts the backups along with production. Fix: write backups to a separate account/project with separate credentials and write-only access from production, enable immutable retention (object lock) so nothing can delete them before N days, keep an additional offline or cross-provider copy, and alert on backup deletion attempts.

[design] Define the DR plan for an online store: orders database, product images, search index, analytics warehouse.
A: Orders: RPO ≈ 0 (sync/consensus replication across zones and an async cross-region standby, RPO seconds for region loss), PITR with 30-day retention, immutable off-account backups, RTO 15 min. Images: object storage with versioning and cross-region replication, soft delete, RTO minutes. Search index: no backup needed, it can be rebuilt from the orders/catalogue database (RTO hours is fine, or keep a replica). Analytics: daily snapshots, RPO 24 h, RTO a day. Quarterly restore drills for all.

[choose] Someone ran `UPDATE users SET email = NULL` without a WHERE clause 10 minutes ago. What do you do?
A: Stop further damage (block the bad job). Restore a copy of the database with PITR to just before the statement into a separate instance, extract the email column for affected users, and write it back to production (rather than rolling back the whole database and losing 10 minutes of other writes). A delayed replica, if you have one, gives the same data faster.

--- pitfalls
- Treating replication as a backup
- Backups in the same account and credentials as production
- Never testing restores, or never timing them against the RTO
- One RPO/RTO for everything instead of per system
- Losing the encryption keys for backups
- Retention shorter than the time it takes to notice corruption

--- quiz
Q: A bad migration corrupted a table 20 minutes ago. Which protects you?
- Synchronous replicas
- *Point-in-time recovery to just before the migration
- A bigger cache
- Multi-zone deployment
W: Replicas already contain the corruption.
Q: RTO is…
- The amount of data lost
- *The maximum acceptable time until service is restored
- How often backups run
- Backup retention time
W: RPO is data, RTO is time to recover.
Q: The "1" in the 3-2-1 rule means…
- One backup per day
- *One copy kept off-site
- One storage type
- One restore test
W: 3 copies, 2 media, 1 off-site.
Q: Why make backups immutable?
- They restore faster
- *Ransomware or mistaken scripts can't delete or alter them
- They're cheaper
- They compress better
W: Retention locks stop even administrators from deleting them early.

--- sources
- book :: Site Reliability Engineering, ch. 26 (Data Integrity: What You Read Is What You Wrote) :: Google :: https://sre.google/sre-book/data-integrity/
- article :: Disaster recovery planning guide :: Google Cloud Architecture Center :: https://cloud.google.com/architecture/dr-scenarios-planning-guide
- article :: Postmortem of database outage of January 31 :: GitLab :: https://about.gitlab.com/blog/2017/02/10/postmortem-of-database-outage-of-january-31/
- article :: Disaster recovery options in the cloud :: AWS whitepaper :: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html

=== data-residency
blurb: Keeping certain data inside a country or region because a law or a customer contract says so: what residency and sovereignty mean, how geo-partitioning gives each user or tenant a home region, what can and can't leave (backups, logs, caches, support access, ML training), and how global features still work.
signals: "European customers' data must stay in the EU" | Enterprise and government customers | Multi-region SaaS | Compliance-driven architecture
widgets: seq-residency

--- lesson
:::words
- **Data residency**: a requirement that data be stored (and often processed) in a specific country or region.
- **Data sovereignty**: the idea that data is subject to the laws of the country where it's stored, so access by foreign governments or staff may be restricted too.
- **GDPR**: the EU's General Data Protection Regulation; among much else, it restricts transferring personal data outside the EU without safeguards.
- **Geo-partitioning**: splitting data by location, so each user's or tenant's rows live in their home region.
- **Home region**: the region that stores and writes a given user's or tenant's data.
- **Personal data (PII)**: information about an identifiable person: name, email, IP address, location.
- **Control plane / data plane**: the management system (accounts, configuration, routing) vs the part that stores and serves customers' actual data.
:::

## The problem in plain words

Laws (the EU's GDPR, Russia's and China's localisation laws, India's rules for payment data, sector rules for health and finance) and big customers (governments, banks, European enterprises) increasingly require that their data **stays in a place**. A design that replicates everything to every region, or ships logs to one central analytics cluster in the US, breaks that rule even if each piece works perfectly. Residency turns "where is this byte?" into a design requirement for every store, cache, log and backup.

:::eli5
A hotel chain promises French guests that their passport copies stay in France. Their rooms can be booked from anywhere, the website can be global, but the drawer with the passport copies is in Paris, and the cleaner in New York isn't allowed to open it.
:::

## Geo-partitioning: a home region per user or tenant

The core pattern: each user or tenant gets a **home region** at sign-up (from their country, or chosen by the enterprise customer). Their data is stored and written only there.
- A small **global directory** maps `tenant → home region`. It must contain no restricted data itself (an ID and a region code).
- Requests arrive at any edge; the edge or API layer looks up the home region and **routes** the request there.
- Databases that support it place rows by a region column: Spanner and CockroachDB can pin partitions of a table to regions; otherwise run one database cluster (cell) per region.
- Moving a tenant between regions is a migration (copy, verify, switch the directory entry, delete the old copy), not a config flag.

This is the same mechanism as active-active with a home region per item (region topologies page), so residency and latency can be solved together: the home region is usually also near the user.

## Everything else that holds data

The database is the easy part. Residency audits fail on the side channels:
- **Backups and disaster recovery copies**: the DR region must also be allowed (for EU data: another EU region).
- **Caches and CDNs**: personal data cached at an edge outside the region; mark responses non-cacheable or restrict edge locations.
- **Logs, traces and metrics**: request logs containing emails, IPs or payloads, shipped to a central cluster. Scrub personal data at the source, or keep per-region logging.
- **Search indexes, analytics warehouses and ML training sets** built from all regions' data.
- **Message queues and event streams** that fan out globally.
- **Support and operations access**: engineers in other countries reading data (sovereignty requirements may require local staff, access approvals, and customer-held encryption keys).
- **Third-party services** (email, payments, analytics SDKs) that process data elsewhere.

## Global features on regional data

Some features need to cross regions: a US user messaging an EU user, a global search, a leaderboard. Approaches:
- Send only what's needed, for the specific interaction (the message itself, to the recipient's region), under the legal basis that allows it.
- Keep global data **non-personal**: aggregate counts, anonymised or pseudonymised IDs.
- Run global queries as **fan-out**: ask each region and combine results, instead of copying data centrally.

## Encryption and key control

Encryption doesn't remove residency rules (encrypted personal data is still personal data), but **customer-managed keys held in-region** (CMEK, external key managers, Google Cloud's sovereign offerings with local partners) give customers control: data stored elsewhere is useless without keys that never leave the region, and revoking the key cuts off all access. It's often part of the answer for sovereignty requirements.

Follow an EU user's request through a geo-partitioned system:

[[widget:seq-residency]]

## Interview angles

- "EU data must stay in the EU": home region per tenant, a global directory with no personal data, region-pinned databases or per-region cells, DR within the EU, and then go through logs, caches, analytics and support access.
- "How do global features work?" Route the specific data for the specific interaction, aggregate or pseudonymise for global views, fan out queries.
- Mention that residency is decided per data category with legal input; not all data (product catalogue, public content) is restricted.

--- revise
### Concepts
? Residency vs sovereignty? :: Where data is stored and processed vs which country's laws and whose access apply to it.
? Core pattern? :: Geo-partitioning: each user or tenant has a home region where their data is stored and written.
? What's in the global directory? :: Only tenant ID → home region; no personal data.
? How do requests reach the right region? :: The edge or API layer looks up the home region and routes there.

### Leaks
? Common residency leaks beyond the database? :: Backups/DR copies, caches and CDNs, logs and traces, analytics and ML datasets, global queues, support access, third-party services.
? Fix for logs? :: Scrub personal data at the source, or keep logging per region.
? Does encryption make cross-border storage fine? :: No, but in-region customer-held keys give control and are part of sovereignty answers.

### Global features
? How to build global features on regional data? :: Send only the needed data per interaction, keep global views aggregated or pseudonymised, fan out queries to regions.

--- notes
## Why
Laws (GDPR, localisation laws, payment and health rules) and contracts (government, banks, EU enterprises).
Residency: where data is stored and processed.
Sovereignty: which laws and whose access apply.
## Geo-partitioning
Home region per user or tenant, chosen at sign-up.
Global directory: tenant → region only, no personal data.
Edge/API routes each request to the home region.
Region-pinned partitions (Spanner, CockroachDB) or one cell per region.
Moving a tenant = copy, verify, switch directory, delete old copy.
Doubles as a latency win: home region near the user.
## Side channels to audit
Backups and DR copies (DR region must also be allowed).
Caches and CDN edges.
Logs, traces, metrics: scrub personal data at source.
Search, analytics, ML training sets.
Global queues and event streams.
Support and operations access from other countries.
Third-party processors.
## Global features
Send only the data needed for that interaction.
Aggregate or pseudonymise global views.
Fan out queries to regions instead of centralising data.
## Keys
Encrypted personal data is still personal data.
In-region customer-held keys (CMEK, external key managers) give control; revoke to cut access.

--- doubts
Q: If all data is encrypted, can it be stored anywhere?
A: Generally no: regulators treat encrypted personal data as personal data, and transfer rules still apply. Encryption with keys held in-region (by the customer or a local partner) is a strong control that's often required alongside residency, especially for sovereignty, but it's not a substitute without legal sign-off.

Q: Does residency mean the whole application must run in-region?
A: Not necessarily. The restricted data must be stored (and often processed) there, so the services that touch it run there too. Stateless global components (edge, static content, routing) and non-personal data (product catalogue, aggregated statistics) can be global. The design question is drawing that line precisely.

Q: How do you handle a user who moves from the EU to the US?
A: Treat it as a tenant migration: decide by policy whether their home changes (often it doesn't automatically for legal reasons), then copy data to the new home, verify, switch the directory entry, and delete the old copy. It's a background workflow with checkpoints, not an instant change.

--- exercises
[design] A B2B note-taking SaaS signs a German bank that requires all its data in the EU, with keys the bank controls. Design the changes.
A: Give the tenant an EU home region (with EU-only DR region); route all its requests there via the global directory; per-region database cell or region-pinned partitions; per-tenant CMEK with the bank's key in an EU KMS or external key manager; EU-only logging with PII scrubbing; disable or regionalise features that copy data elsewhere (global search, analytics, ML training); restrict support access to approved EU staff with access logging and customer approval.

[break] A company geo-partitioned its database by region, but an audit finds EU users' emails in a US data centre. Name three likely places they leaked to.
A: Application or access logs shipped to a central US logging cluster; a global analytics warehouse or event stream fed from all regions; caches or CDN edges outside the EU storing personalised responses; backups/DR copies replicated to a US region; error reports or third-party SDKs.

[choose] Which of these can live in one global store: (a) product catalogue, (b) tenant → region directory, (c) user email addresses, (d) daily active user counts per country?
A: (a) Yes, not personal. (b) Yes, if it holds only IDs and region codes. (c) No, it goes in the home region. (d) Yes, aggregated, non-personal.

--- pitfalls
- Partitioning the database but shipping logs, analytics and backups globally
- A global directory that contains personal data
- DR copies in a region the rules don't allow
- Treating encryption as an exemption from residency
- Assuming a user's home region can change instantly

--- quiz
Q: The global directory in a geo-partitioned design should contain…
- All user profiles
- *Only an ID → home region mapping
- Encrypted copies of all data
- Nothing; regions guess
W: It must not hold restricted data itself.
Q: Which is the most common residency leak?
- The primary database
- *Logs and analytics pipelines that centralise data
- Static images
- DNS records
W: Side channels are where audits fail.
Q: An EU tenant's disaster recovery copy should be…
- In the US for diversity
- *In another region that the residency rules allow, such as another EU region
- Not kept
- On the edge
W: DR copies are data too.

--- sources
- article :: GDPR Chapter 5: Transfers of personal data to third countries :: gdpr-info.eu :: https://gdpr-info.eu/chapter-5/
- article :: Multi-region capabilities overview :: Cockroach Labs :: https://www.cockroachlabs.com/docs/stable/multiregion-overview
- paper :: Spanner: Google's Globally-Distributed Database (OSDI 2012) :: Corbett et al. (Google) :: https://research.google/pubs/spanner-googles-globally-distributed-database-2/
- article :: Disaster recovery planning guide :: Google Cloud Architecture Center :: https://cloud.google.com/architecture/dr-scenarios-planning-guide
