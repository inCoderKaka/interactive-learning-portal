# HLD, LLD and AI: depth for a Google senior engineer, visuals that teach, exercises, videos

Follows `00-research-and-plan.md`. Decisions taken with the user on 2026-11-27.

## 1. Decisions (2026-11-27)

| # | Question | Answer |
|---|---|---|
| 1 | How deep | What a Google senior (L5) engineer is expected to know. ~10k characters is not a quota; go there when the intuition needs it |
| 2 | Pages | Keep the 17 HLD chapters; add pages wherever a topic deserves its own |
| 3 | Exercises | Many, big and small, for every topic that matters |
| 4 | Videos | A video library for HLD, LLD and AI pages too. "Design WhatsApp"-type videos go on the matching design page and are **always visible** (no gate) |
| 5 | Scope of this pass | Deepen every page, design exercises included |
| 6 | HLD visuals | The key to retention. Genuine, reliable, intuitive; zero, one or several per page. Review the existing ones (the load-balancing demo is "random", not intuitive) |
| 7 | Writing level | Understandable to a **first-time learner** (the user is one for HLD). Plain words and an analogy first, a "Words you'll meet" box, no acronym before it is explained; then the depth. Revise sheets use only terms the page defined. Chapter overviews are rewritten the same way |
| 8 | Order and shipping | Chapter by chapter in learning order, visuals built alongside; deploy midway and at the end |

## 2. What a Google L5 is expected to show (research)

Google does not publish its rubric; these points are where third-party guides and candidate reports agree.

- **Ownership, not difficulty.** "An L4 candidate can design a working system. An L5 candidate is expected to design it, defend it, and explain how it degrades when a part fails." ([DesignGurus](https://www.designgurus.io/answers/detail/what-does-a-google-l5-system-design-interview-cover))
- **Drives the session.** At L4 the interviewer co-designs; at L5 the candidate runs it, finds bottlenecks unprompted and proposes the deep dives ([Hello Interview: Google L5](https://www.hellointerview.com/guides/google/l5), [Exponent](https://www.tryexponent.com/blog/google-system-design-interview)).
- **Normal load, peak load, partial failure.** Behaviour under all three, and adapting when the interviewer changes a constraint mid-way ("traffic doubles overnight") ([System Design Handbook: Google L5](https://www.systemdesignhandbook.com/guides/google-l5-system-design/)).
- **Depth two levels down on any box**: a 15–20 minute deep dive, usually on a component the interviewer picks.
- **Trade-offs stated as decisions**: "X over Y because Z; it costs W".
- **LLD** at Google shows up as object modelling inside coding or design rounds (interfaces, extensibility, concurrency, testability) rather than as pattern trivia ([Educative](https://www.educative.io/blog/interview-guide-low-level-object-oriented-advanced-system-design)).
- **AI/ML** senior loops weight production systems over model tuning: serving, evaluation, safety, cost and latency; implementing attention from scratch is fair game ([1point3acres reports](https://www.1point3acres.com/interview/company/google/machine-learning-engineer)).

Consequence for content: every page answers (1) the mechanism, precisely; (2) the numbers that make it matter; (3) what breaks and how it degrades; (4) the trade-off against its neighbours, phrased as an interview decision; (5) what the follow-up question will be. Trivia that never changes a design decision is cut.

## 3. How the visuals teach (research)

| Principle | Source | Rule we apply |
|---|---|---|
| Explorables guide attention to a phenomenon; a bare sandbox is not an explanation | Bret Victor, [Explorable Explanations](https://worrydream.com/ExplorableExplanations/) | Every visual opens on a **scenario** with one question ("why does round robin hurt here?") and a narration line that says what just happened |
| Engagement beats passive viewing | Hundhausen et al. 2002; Naps et al. 2002 | Step, change inputs, **break things**, and answer a "predict what happens" prompt before the reveal |
| Animate only what changes state | Höffler & Leutner 2007 | Requests, queues, logs, replicas and votes move; nothing decorative |
| Real-time simulation with parameters and no setup is where interactive articles shine | Distill, [Communicating with interactive articles](https://distill.pub/2020/communicating-with-interactive-articles/) | Deterministic, seeded simulations, so the same run replays and two strategies can race on **the same traffic** |
| Guided vs open: guided suits first contact, open suits mastery | The Secret Lives of Data vs RaftScope | Each sim has a guided script (steps with narration) and a free mode |

Three reusable building blocks (all in `components/viz/hld/`):

1. **Sequence player**: lanes for actors, arrows for messages, a packet log (time, from, to, message), a narration line and "what changed". Scenarios are data, with **break-it branches** (drop a packet, crash the coordinator, let a lease expire). Used for protocols and races: TCP/TLS, DNS, OAuth/PKCE, 2PC, sagas, outbox, cache races, isolation anomalies, delivery semantics, clocks.
2. **Simulation kit**: seeded tick engine with play / pause / step / speed, a metrics strip (p50, p99, errors, hit rate, queue depth), sparklines, and side-by-side A/B runs on identical traffic. Used for load balancing, queueing, stampedes, retry storms, rate limiters, eviction, load shedding.
3. **Structure views** where the data structure is the lesson: LSM tree, B-tree pages, Kafka partitions and consumer groups, Raft cluster, geohash and quadtree, inverted index, HyperLogLog, erasure coding.

### Review of the existing six HLD widgets

| Widget | Verdict |
|---|---|
| Load balancing | **Replace.** Bars jitter with no visible requests, no latency figure, strategies cannot be compared on the same traffic, and the "slow server" effect is barely visible. The new one shows queued requests per server, heterogeneous request costs, p50/p99 and error counts, races two strategies on the same seeded stream, and adds "several load balancers" so least-connections' herd effect and power-of-two's fix are visible |
| Consistent hashing | Keep; it shows the right thing (keys moved vs `hash % N`). Add a "hot node" readout and a step to remove a node |
| Token bucket | Keep, and move it into the rate-limiter comparison where fixed-window's boundary burst is shown next to it |
| Quorum | Keep; add a read that actually returns a stale version when R + W ≤ N, and sloppy-quorum hints |
| Bloom filter | Keep; good |
| Estimator | Keep; add the latency ladder and the queueing curve on their own pages |

## 4. Exercises

- **Small, on every page** (`exercises` in each body): 4–8 prompts of four kinds, each with a model answer behind a reveal: *estimate* (numbers), *what breaks* (a failure or bug scenario), *choose* (a trade-off decision with a constraint), *mini design* (a 5-minute component design). Write the answer first, then reveal.
- **Quiz** stays (objective checks).
- **Big**: more full design exercises (staged, with steering and model answers), so each chapter has at least one design that exercises it.

## 5. Videos

- Concept rules for HLD, LLD and AI pages in `scripts/videos/concepts.ts`, then the manual pass over every unmatched title (as for DSA).
- Design videos ("Design WhatsApp", "YouTube system design") map to design pages (`d-…`), shown in a video library on the design page, always visible.

## 6. HLD outline (90 pages)

In `content/outline.ts`. Visual plan per chapter (new ones in bold):

| Chapter | Visuals |
|---|---|
| Framework | none (a page that is a process, not a mechanism) |
| Estimation | estimator · **latency ladder** (scaled to human time) · **queueing curve** (utilisation vs wait, live M/M/1) |
| Networking | **connection setup** (TCP + TLS 1.2/1.3 + QUIC 0-RTT, RTT slider) · **head-of-line blocking** (HTTP/1.1 vs 2 vs 3 under loss) · **DNS resolution** · **push compared** (polling / long-poll / SSE / WebSocket) |
| Load balancing | **LB race** (replaces the old one) · **L4 vs L7** (what each layer can see and route on) · **gateway pipeline** (filters, break each) · **health-check timeline** |
| Caching | **cache patterns** · **eviction race** (LRU / LFU / FIFO on one workload) · **invalidation race** · **stampede** (TTL expiry, coalescing, jitter) · **CDN** |
| Databases | **index seek vs scan** · **B-tree vs LSM write path** · **row vs column scan** |
| Replication | **leader failover** (lag, lost writes, fencing) · quorum (upgraded) · **session-guarantee violations** · **partition: CP vs AP** |
| Partitioning | consistent hashing · **hash vs range hot spots** · **Snowflake bit layout** |
| Transactions | **isolation anomalies** · **2PC** · **saga** · **Raft** · **clocks** · **fencing tokens** |
| Messaging | **queue vs log** · **consumer-group rebalance** · **delivery semantics** |
| Streams | **windows and watermarks** · **MapReduce flow** |
| Rate limiting | **limiter race** (fixed / sliding / token / leaky on the same traffic) · token bucket · **retry amplification and shedding** |
| Storage and search | **erasure coding** · **inverted index** · **geohash / quadtree** · bloom · **HyperLogLog** · **Count-Min** |
| Reliability | **retry storm + circuit breaker** · **error-budget burn** · **gossip** |
| Security | **OAuth code + PKCE** · **JWT tamper** · **Zanzibar check** |
| Multi-region | **LWW vs CRDT merge** |
| Google papers | **Spanner commit wait** · Bigtable / GFS flows as sequence scenarios |
