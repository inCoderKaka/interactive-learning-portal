=== d-online-judge
title: Online judge / coding contest platform (LeetCode)
topic: messaging
tier: 2
est: 45
prompt: Design an online judge like LeetCode: users submit code in many languages, it runs safely against hidden tests, and results come back in seconds, including during contests with 100,000 participants and a live leaderboard.
--- words
- **Submission**: a user's code sent to be judged.
- **Sandbox**: an isolated environment (container, gVisor, Firecracker microVM) where untrusted code runs with strict limits.
- **Test cases**: hidden inputs with expected outputs; a solution passes if every output matches within time and memory limits.
- **Worker pool**: the machines that compile and run submissions.
- **Queue**: where submissions wait for a free worker.
- **Leaderboard**: contest ranking by problems solved and time penalties.
--- flow
1. **0–5**: submit code (many languages), run against tests with limits, verdicts in seconds, contests with leaderboards, problem pages. Clarify scale of contests and language list.
2. **5–10**: normal ~1,000 submissions/s peak; contest start: 100,000 users, bursts of ~5,000/s.
3. **10–15**: submission API, queue, sandboxed workers, results store, leaderboard.
4. **15–25**: API → queue (priority: contest vs practice) → workers pull, sandbox, compile, run tests → result store → client polls/WebSocket; leaderboard updates.
5. **25–40**: sandbox security and limits, fair and fast scheduling under contest bursts, test data distribution, leaderboard at scale, cheating.
6. **40–45**: failures, monitoring.
--- req
**Functional**
- Browse problems; submit code in ~20 languages; get a verdict (Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error, Compile Error) with runtime and memory.
- "Run" against sample tests while editing.
- Contests: fixed time window, scoring with penalties, real-time leaderboard, frozen leaderboard in the last hour (optional).

**Non-functional**
- **Security**: untrusted code must never escape the sandbox, read test data, or attack the network.
- **Fair and consistent timing**: the same code gets the same verdict; limits are enforced precisely.
- **Fast feedback**: verdict in a few seconds normally, under ~30 s during contest peaks.
- **Contest bursts**: 10–50× normal load at contest start and end.
--- est
- **Practice**: ~10 M submissions/day ≈ 120/s average, ~1,000/s peak.
- **Contest**: 100 k users, many submitting in the first minutes: ~5,000/s bursts.
- **Cost per submission**: compile (~1–5 s for C++/Java) + run tests (~0.5–5 s) ≈ ~5 CPU-seconds → 5,000/s × 5 s = **25,000 cores** busy at contest peaks: autoscaling and pre-warming before contests, plus queuing.
- **Test data**: per problem a few MB to GB; cached on workers.
--- api
- `POST /submissions {problem_id, language, code, contest_id?}` → `{submission_id}`.
- `GET /submissions/{id}` (or WebSocket push) → `{status, verdict, runtime_ms, memory_kb, failed_test?}`.
- `GET /contests/{id}/leaderboard?page=`.

**Data**
- `submissions(id, user, problem, language, code_ref, status, verdict, timings)`; code in object storage.
- `problems(id, statement, limits, test_set_version)`, test files in object storage (never served to users).
- Leaderboard: sorted set per contest (score, penalty) in Redis, persisted periodically.
--- hl
1. The **submission API** stores the code, creates a submission (status *queued*) and pushes a job to the **queue** (contest jobs on a higher-priority queue).
2. **Judge workers** pull jobs; each runs the code in a fresh **sandbox** (container/microVM with no network, read-only filesystem, cgroup CPU and memory limits, seccomp system-call filters, wall-clock timeouts).
3. The worker compiles, then runs each test case (inputs mounted from a local cache of the problem's tests), compares outputs (exact or with a checker program), stops at the first failure.
4. Results go to the **result store**; the client is notified via WebSocket or polling.
5. For contests, accepted results update the **leaderboard** (atomic score + penalty update in a sorted set); the contest page reads it with caching.
--- deep
**1. Sandbox security**: defence in depth: microVMs (Firecracker) or gVisor for kernel isolation, no network, unprivileged user, read-only root, per-run temp directory, resource limits (CPU time, memory, processes, file size), seccomp profile; destroy after each run. Test data never inside the user's reach (outputs compared outside the sandbox).

**2. Timing fairness**: measure CPU time, not wall time; pin runs to dedicated cores; avoid noisy neighbours (one run per core); calibrate limits per language (Python gets multipliers); rerun borderline TLEs.

**3. Contest bursts**: scale the worker pool before the contest starts (known schedule), separate queues so practice traffic can't delay contest submissions, cap concurrent submissions per user, show queue position.

**4. Test data distribution**: problems' tests cached on workers (content-addressed, versioned); first use downloads from object storage; contests pre-warm caches.

**5. Leaderboard**: sorted set by (solved desc, penalty asc); 100 k users with frequent reads: cache top pages for a few seconds; each user's rank via `ZRANK`; persist snapshots; freeze in the final hour by serving a stored snapshot.

**6. Cheating**: plagiarism detection after contests (code similarity, MOSS-like), rate limits, account verification.
--- wrap
**Failures**: worker crash mid-run → the job's lease expires and it's re-queued (judging is idempotent); queue backlog → show position, scale out; result store down → workers retry writes.

**Monitoring**: queue wait time by priority, judge time per language, sandbox escape attempts/violations, verdict distribution changes after test updates, leaderboard latency.

**At 10×**: more workers (horizontal), regional judge pools, smarter caching of compiled artifacts for repeated submissions.
--- variants
Q: Online code editor / playground (run arbitrary programs interactively)
A: Long-lived sandboxes with a terminal (WebSocket), stricter time/CPU quotas, network rules; session affinity to a sandbox; cleanup on idle.
Q: Interview platform with a shared live editor
A: Collaborative editing (OT/CRDT) plus the judge for runs; recordings of sessions.
Q: Judge machine-learning notebook submissions (Kaggle)
A: Long jobs (hours) on GPUs, scheduled batch queue, private test scoring, leaderboard from scores.
--- steer
Q: How do you run untrusted code safely?
A: MicroVM/gVisor sandboxes, no network, limits via cgroups and seccomp, fresh environment each run, tests outside the sandbox.
Q: Contest starts: 5,000 submissions per second.
A: Pre-scaled worker pool, separate high-priority contest queue, per-user caps, queue position feedback.
Q: The same code gets TLE once and passes once.
A: CPU-time measurement on dedicated cores, isolation from noisy neighbours, reruns for borderline cases.
Q: How does the leaderboard stay fast for 100 k users?
A: Redis sorted set with composite score, cached top pages, rank queries, snapshots, freeze by snapshot.
Q: A worker dies while judging.
A: Lease-based job ownership; job re-queued; judging is idempotent.
--- pitfalls
- Running user code in plain containers with network access
- Measuring wall-clock time on shared cores
- One queue for practice and contests
- Computing the leaderboard with SQL on every request
- Shipping test data to the client or into readable paths
--- level
- **L4**: API → queue → workers in containers → results; leaderboard.
- **L5**: layered sandboxing, fair timing, priority queues and pre-scaling for contests, test-data caching, leaderboard design, idempotent re-queueing.
- **L6**: cost of the judge fleet, multi-region contests, anti-cheating systems.
--- nodes
user|Browser|client|0|160|Writes code, submits, watches the verdict and leaderboard.
api|Submission API|service|200|160|Stores code, creates submissions, returns status.
q|Priority queues|queue|400|80|Contest and practice queues.
workers|Judge workers (sandboxes)|worker|600|80|Compile and run in microVMs with strict limits.
tests|Test data (object storage)|store|600|240|Hidden tests, cached on workers.
results|Result store|db|400|240|Verdicts, timings; pushed to clients.
board|Leaderboard (sorted sets)|cache|200|300|Contest rankings, cached pages.
--- edges
user>api|submit
api~q|enqueue
q~workers|pull job
workers>tests|load tests
workers>results|verdict
results~board|update score
user>board|view ranking
api>results|status
--- refs
- article :: Firecracker: Lightweight Virtualization for Serverless Applications (NSDI 2020) :: Agache et al. (AWS) :: https://www.usenix.org/conference/nsdi20/presentation/agache
- article :: gVisor: application kernel for containers :: Google :: https://gvisor.dev/docs/

=== d-live-comments
title: Live comments on a live stream (YouTube Live chat)
topic: messaging
tier: 2
est: 45
prompt: Design live chat for live streams: viewers post comments that appear for everyone watching within a second or two, even when a single stream has a million viewers.
--- words
- **Fan-out**: delivering each comment to every viewer of the stream.
- **Pub/sub**: publishers send messages to a topic; every subscriber of that topic receives them.
- **Edge (connection) servers**: servers that hold viewers' open connections (WebSocket/SSE) and push comments to them.
- **Sampling / slow mode**: showing only some comments, or limiting how often each viewer can post, when traffic is huge.
- **Moderation**: removing spam and abuse, automatically and by human moderators.
--- flow
1. **0–5**: post and see comments in near real time per stream, moderation, slow mode, pinned messages, replay with the recording. Clarify max viewers per stream (1 M) and latency (~1–2 s).
2. **5–10**: 1 M viewers on the biggest stream, maybe 2,000 comments/s posted → 2 B deliveries/s if every viewer gets every comment (impossible to read anyway).
3. **10–15**: post API, per-stream topic, edge servers subscribed per stream, comment store for replay.
4. **15–25**: post → validation/moderation → per-stream log → edge servers subscribed to streams their viewers watch → batch push every ~1 s to viewers.
5. **25–40**: fan-out math and batching, hot streams, sampling, moderation latency, ordering, replay.
6. **40–45**: failures, monitoring.
--- req
**Functional**
- Viewers post short comments on a live stream; all viewers see recent comments in near real time.
- Moderation: automatic filters, moderator deletes and bans, slow mode, subscribers-only mode.
- Super chats / pinned messages (highlighted).
- Replay: chat shown in sync with the recorded video later.

**Non-functional**
- **Latency**: 1–2 s from post to display.
- **Huge fan-out** for popular streams; tiny streams must stay cheap.
- **Best effort is acceptable for display** (a viewer missing a comment during a 2,000/s flood is fine); posting must be acknowledged reliably.
- Abuse resistance.
--- est
- **Biggest stream**: 1 M viewers; posts up to ~2,000/s; naive fan-out = **2 B messages/s**.
- **Readable rate**: a human reads maybe 5–10 comments/s; so show a **sample** at high volume: e.g. 20 comments/s → 20 M deliveries/s, batched into 1 push per second per viewer → **1 M pushes/s** of small batches.
- **Edge servers**: ~100 k connections each → ~10 servers for this stream (many more across all streams).
- **Storage**: comments for replay: 2,000/s × 200 B = 400 KB/s per hot stream; small.
--- api
- `POST /streams/{id}/comments {text, client_id}` → `{comment_id, ts}` (after checks).
- `GET /streams/{id}/chat` (WebSocket/SSE): server pushes batches `{comments: [...], deletions: [...]}` every ~1 s.
- Moderation: `DELETE /comments/{id}`, `POST /streams/{id}/bans`.

**Data**: per-stream append-only log (Kafka/Pub/Sub topic or partition), comment store keyed by (stream, ts) for replay, user state (bans, slow-mode timers) in a fast store.
--- hl
1. A viewer opens the stream; the client connects to an **edge server** (WebSocket/SSE), which **subscribes** to that stream's topic if it isn't already (one subscription per edge server per stream, not per viewer).
2. Posting: the **chat API** checks rate limits/slow mode, bans, runs fast **automatic moderation**, assigns a timestamp, appends to the stream's **log**, and acks.
3. **Fan-out**: each subscribed edge server receives the stream's comments once and pushes them to its local viewers in **batches** every ~1 s.
4. For hot streams, a **sampler** reduces the published flow to a readable rate (prioritising highlighted messages, diverse users, moderators) while all comments are still stored.
5. Deletions are published as events so clients remove them.
6. Replay: comments are stored with stream time offsets and fetched in chunks during playback.
--- deep
**1. Two-level fan-out**: publishing to ~edge servers (tens) instead of viewers (millions) is the key: each edge server multiplies locally. Hierarchical relays across regions keep cross-region traffic to one copy per region.

**2. Batching**: pushing every comment individually means millions of tiny writes; batch per second per connection: same latency perception, 10–100× less overhead.

**3. Sampling and slow mode**: above a threshold, show a representative subset; slow mode limits each viewer to one comment per N seconds; subscriber-only mode cuts volume. Product choices that are also capacity tools.

**4. Moderation**: automatic filters must be fast (in the post path, tens of ms) and conservative; heavier models run asynchronously and can retract (publish delete events); human moderators get tools with low-latency effect.

**5. Ordering**: exact global order doesn't matter much; order by server timestamp within the stream's partition; clients display in received order.

**6. Small streams**: most streams have a handful of viewers: the same system with tiny topics; topic creation must be cheap (or multiplex many small streams per partition).
--- wrap
**Failures**: edge server crash → viewers reconnect elsewhere and fetch the last few seconds from the log; log partition failover → short gap; moderation service slow → fall back to stricter simple filters.

**Monitoring**: post-to-display latency, delivered batch sizes, drop/sample rates, moderation latency and false positives, connection counts per edge.

**At 10×**: more edge servers and relay tiers; adaptive sampling.
--- variants
Q: Live reactions (hearts, emojis) at 1 M viewers
A: Don't deliver individual reactions: aggregate counts per second per stream and broadcast totals; clients animate locally.
Q: Comments on a normal video (not live)
A: Threaded, ranked, persistent comments with pagination and votes: a database-backed feature, no real-time fan-out needed.
Q: Group chat (WhatsApp) instead
A: Every message must reach every member reliably and in order: see the chat design.
--- steer
Q: One stream, 1 M viewers, 2,000 comments/s.
A: Edge servers subscribe once per stream; batch pushes per second; sample to a readable rate.
Q: Why not store and query comments from a database per viewer?
A: Polling by a million viewers would crush it; push from a log via pub/sub.
Q: A spam bot floods the chat.
A: Per-user rate limits/slow mode, fast filters in the post path, async models with retraction, bans.
Q: An edge server crashes.
A: Clients reconnect and backfill a few seconds from the log; display is best-effort.
Q: How does replay show chat in sync?
A: Store comments with stream time offsets; fetch in chunks matching the playback position.
--- pitfalls
- One delivery per comment per viewer with no batching
- Subscribing per viewer instead of per edge server
- Trying to show every comment in a huge stream
- Moderation only after the fact
- Treating it like reliable group chat
--- level
- **L4**: WebSocket edges, pub/sub per stream, comment store.
- **L5**: fan-out arithmetic, edge-level subscriptions, batching, sampling/slow mode, moderation in and after the post path, replay.
- **L6**: global relay topology and cost, product levers vs capacity, abuse ecosystem.
--- nodes
viewer|Viewers (apps)|client|0|160|Post comments; receive batches over WebSocket/SSE.
edge|Edge connection servers|edge|220|160|Hold viewer connections; one subscription per stream; batch pushes.
api|Chat API|service|220|20|Rate limits, bans, fast moderation, append to the log.
mod|Moderation (async models)|worker|440|20|Heavier classifiers; publishes deletions.
log|Per-stream log / pub-sub|queue|440|160|Ordered comments per stream; fans out to edge servers.
sampler|Sampler (hot streams)|service|660|160|Reduces flow to a readable rate.
store|Comment store (replay)|db|440|300|Comments with stream offsets for replay.
--- edges
viewer>api|post
api>log|append
log~mod|scan
mod~log|delete events
log~sampler|hot streams
sampler~edge|sampled comments
log~edge|comments
edge~viewer|batched push
log~store|persist

=== d-stock-exchange
title: Stock exchange matching engine
topic: transactions
tier: 3
est: 45
prompt: Design a stock exchange: brokers send buy and sell orders, the exchange matches them fairly in strict order with microsecond latency, publishes market data, and never loses or reorders a trade.
--- words
- **Order**: an instruction to buy or sell a quantity at a price (limit order) or at the best available price (market order).
- **Order book**: per stock, the list of waiting buy orders (bids) and sell orders (asks), sorted by price then time.
- **Matching engine**: the program that matches incoming orders against the book, creating trades.
- **Price-time priority**: better prices first; among equal prices, earlier orders first.
- **Market data feed**: the stream of book updates and trades sent to everyone.
- **Sequencer**: the component that gives every incoming message a single, total order before matching.
- **Deterministic replay**: rebuilding the exact state by replaying the ordered input log.
--- flow
1. **0–5**: order entry (limit, market, cancel), matching with price-time priority, trade confirmations, market data, risk checks. Clarify latency (microseconds), symbols (~10 k), and whether to include clearing (usually no).
2. **5–10**: ~100 M orders/day, peaks of ~1 M messages/s across all symbols; a hot symbol at ~100 k/s.
3. **10–15**: FIX/binary gateway protocol, per-symbol order books in memory, sequenced input log, trade log.
4. **15–25**: gateways → risk checks → sequencer → single-threaded matching engine per symbol group (in memory) → execution reports + market data multicast; replicated via the sequenced log.
5. **25–40**: single-threaded determinism vs parallelism, the order book data structure, fault tolerance by replication of the input log, fairness and latency, market data distribution.
6. **40–45**: recovery, audit, monitoring.
--- req
**Functional**
- Accept new orders, cancels and modifications from brokers; validate and risk-check them.
- Match by price-time priority; produce trades and execution reports.
- Publish market data (order book depth, trades) to all participants.
- Market open/close auctions and trading halts (stretch).

**Non-functional**
- **Ultra-low, predictable latency**: tens of microseconds inside the exchange; jitter matters as much as average.
- **Fairness**: strict ordering; no participant can jump the queue.
- **Never lose or reorder** an accepted order or trade; full audit trail.
- **High availability** with near-instant failover during trading hours.
--- est
- **Messages**: 100 M orders/day + cancels (often 10× orders) → peaks ~**1 M messages/s** overall.
- **Per symbol**: a hot symbol may see 100 k messages/s → a single thread handles ~1–5 M simple matching operations/s, so one core per symbol group works.
- **Order books**: 10 k symbols × thousands of resting orders × ~100 B → a few GB in memory.
- **Logs**: every message persisted: 1 M/s × 100 B = 100 MB/s, sequential writes.
--- api
- Gateway protocol (FIX or binary, over TCP): `NewOrder {client_order_id, symbol, side, type, price, qty}`, `Cancel {client_order_id}`; responses `Ack`, `Fill {qty, price}`, `Reject`.
- Market data: UDP multicast feed of book updates and trades with sequence numbers; snapshot + retransmission services.

**Data**
- In memory per symbol: bids and asks as price levels (sorted), each a FIFO queue of orders; an index order_id → order for cancels.
- Durable: the **sequenced input log** (every accepted message in order) and the trade log; end-of-day reports.
--- hl
1. Brokers connect to **gateways**, which authenticate, validate and apply **pre-trade risk checks** (limits per account).
2. Messages go to the **sequencer**, which assigns a global sequence number and writes them to the replicated **input log**.
3. The **matching engine** for that symbol group (single-threaded, all state in memory) processes messages strictly in sequence: match against the book, update it, emit trades.
4. Outputs: **execution reports** back to the brokers via gateways, and **market data** updates multicast to subscribers (with sequence numbers so receivers detect gaps).
5. **Replicas** of the matching engine consume the same input log and compute the same state (deterministic), ready to take over instantly.
6. Downstream: trades to clearing and settlement systems, audit storage.
--- deep
**1. Single-threaded and deterministic**: locks and thread scheduling create jitter and make ordering hard to prove. One thread per symbol group processing an ordered log gives total order, no locks, and **deterministic replay**: the same input log always produces the same trades (the LMAX architecture idea).

**2. Order book structure**: price levels in a sorted structure (array indexed by price ticks for dense ranges, or a balanced tree), each level a FIFO linked list; a hash map from order ID to node for O(1) cancels. Matching walks the best levels.

**3. Fault tolerance**: durability comes from the sequenced input log (replicated before acknowledging), not from writing the book state. Hot standbys replay the log in lockstep; failover = promote the standby (it has identical state). Periodic snapshots shorten recovery.

**4. Latency**: kernel-bypass networking, pinned cores, no garbage collection pauses (or careful Java with pre-allocated objects), co-located racks for participants with equal cable lengths for fairness.

**5. Market data fan-out**: UDP multicast with sequence numbers; receivers detect gaps and request retransmits or a snapshot; separate feeds per symbol group.

**6. Risk and halts**: pre-trade checks in gateways (fat-finger limits, credit); circuit breakers halt trading on extreme moves.
--- wrap
**Failures**: engine crash → standby with identical state takes over within milliseconds; sequencer failover via consensus among sequencer replicas; gateway failure → brokers reconnect to another gateway and resend with client order IDs (dedupe).

**Monitoring**: end-to-end latency percentiles (including jitter), sequence gaps, rejected orders, book integrity checks, market data lag.

**Audit**: the input log is the legal record; regulators can replay the day.
--- variants
Q: Retail trading app (Robinhood) rather than the exchange
A: The app is a broker: accounts, buying power checks, order routing to exchanges/market makers, portfolio and real-time quotes (fan-out of market data to millions of phones), and ledger-backed balances.
Q: Crypto exchange
A: Same matching core, plus custody of assets (hot/cold wallets), deposits/withdrawals with blockchain confirmations, 24/7 operation.
Q: Auction for ad slots or online auctions (eBay)
A: Not continuous matching: bids collected over time and resolved at close; consistency of the highest bid per item and sniping protection.
--- steer
Q: Why one thread per symbol group?
A: Total ordering, no locks, low jitter, deterministic replay for recovery and audit.
Q: How do you make it fault tolerant without slowing it down?
A: Replicate the sequenced input log; standbys replay deterministically; failover promotes a standby.
Q: How is fairness guaranteed?
A: A single sequencer orders all messages; price-time priority; equal network paths for co-located participants.
Q: How is market data sent to thousands of participants?
A: UDP multicast with sequence numbers, gap detection, retransmission and snapshots.
Q: What data structure is the order book?
A: Sorted price levels with FIFO queues, plus an order-ID index for O(1) cancels.
--- pitfalls
- A database transaction per order in the matching path
- Multi-threaded matching on the same book with locks
- Persisting book state instead of the input log
- Ignoring jitter and garbage-collection pauses
- TCP fan-out of market data to every participant
--- level
- **L4**: order book, matching rules, persistence of trades.
- **L5**: sequencer + single-threaded deterministic engine, log replication and hot standby, book data structures, market data multicast, risk checks.
- **L6**: latency engineering (kernel bypass, co-location), regulatory audit and replay, auctions and halts.
--- nodes
broker|Brokers|client|0|160|Send orders and cancels over FIX/binary TCP.
gw|Gateways + risk checks|edge|200|160|Authenticate, validate, pre-trade risk limits.
seq|Sequencer (replicated)|service|400|160|Assigns the total order; writes the input log.
log|Sequenced input log|queue|400|300|Durable, replicated record of every accepted message.
engine|Matching engine (primary)|service|600|80|Single-threaded per symbol group; in-memory books.
standby|Matching engine (standby)|service|600|240|Replays the same log; identical state for failover.
md|Market data multicast|edge|800|80|Book updates and trades with sequence numbers.
clear|Clearing / audit|ext|800|240|Trades for settlement; logs for regulators.
--- edges
broker>gw|orders
gw>seq|validated
seq>log|append
seq>engine|ordered stream
log~standby|replay
engine>gw|execution reports
engine~md|market data
engine~clear|trades
--- refs
- article :: The LMAX Architecture :: Martin Fowler :: https://martinfowler.com/articles/lmax.html
