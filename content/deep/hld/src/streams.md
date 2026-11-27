=== batch-processing
blurb: Processing huge, finished datasets: the MapReduce model (map, shuffle, reduce) that Google introduced, why it scales and tolerates failures, its successor Spark, and how to reason about the shuffle, skew and data locality.
signals: Nightly jobs over terabytes of logs | Building search indexes, reports or ML training data | "How would you count X over all of last year's data?" | Explaining MapReduce or Spark
widgets: mapreduce

--- lesson
:::words
- **Batch processing**: running a job over a bounded, already-collected dataset (yesterday's logs) to produce an output.
- **MapReduce**: a programming model: a *map* function turns input records into key–value pairs, the system groups pairs by key (*shuffle*), and a *reduce* function combines each group.
- **Shuffle**: moving every intermediate pair to the machine responsible for its key. Usually the most expensive step.
- **Data locality**: running work on the machine that already stores the data, instead of moving the data.
- **Straggler**: a slow task that delays the whole job.
- **DAG**: directed acyclic graph: a pipeline of steps where each step's outputs feed later steps.
:::

## The problem in plain words

Some questions need *all* the data: "which search queries were most common last year?", "build tomorrow's recommendation model from 3 years of clicks", "recompute every user's statistics". Terabytes to petabytes are far too much for one machine to read in reasonable time. Batch frameworks split the work across thousands of machines, move the computation to where the data lives, and survive machines failing midway. You write two small functions; the framework does the distribution.

:::eli5
Counting every word in a library. You give each helper a shelf (map: each writes tally slips like "the: 1"). Then you sort the slips into boxes by word (shuffle), so all "the" slips go to one person, all "cat" slips to another. Each person adds up their box (reduce). If a helper falls ill, someone else redoes just that shelf.
:::

## MapReduce, step by step

Google described MapReduce in 2004 (Dean and Ghemawat), and Hadoop made it widespread.

1. **Split** the input (files in a distributed file system like GFS/HDFS) into chunks, typically 64–128 MB.
2. **Map**: run the map function on each chunk, ideally on a machine holding that chunk (data locality). It emits (key, value) pairs: for word count, (word, 1).
3. **Shuffle and sort**: partition the pairs by key (hash of the key mod the number of reducers), send each partition to its reducer, and sort by key. All values for a key end up together.
4. **Reduce**: call the reduce function once per key with all its values: (word, [1,1,1,…]) → (word, count).
5. **Write** the output to the distributed file system.

Step through a word count over three input splits:

[[widget:mapreduce]]

## Why it scales and survives failures

- **Parallelism**: thousands of map tasks and reduce tasks run at once.
- **Fault tolerance by re-execution**: map and reduce functions are deterministic and inputs are immutable, so a failed or slow task is simply run again elsewhere. **Backup tasks** for stragglers near the end of a job cut completion time significantly in Google's paper.
- **Combiners**: a mini-reduce on each mapper's output ("the": 512 instead of 512 × ("the", 1)) cuts shuffle traffic dramatically for associative operations like sums.

## The shuffle and skew

The shuffle moves data across the network and sorts it; it usually dominates job time. Reduce work is only as even as the keys: if one key has a huge share (the word "the", or one celebrity user), its reducer takes far longer than the rest (**skew**). Fixes: combiners, salting hot keys across several reducers and merging, or special-casing known hot keys.

## Spark and beyond

MapReduce writes intermediate results to disk between every stage, which is slow for multi-step pipelines and iterative algorithms (machine learning loops). **Apache Spark** keeps data in memory across steps, represents a job as a DAG of transformations (map, filter, join, groupBy), and recomputes lost partitions from their lineage. Google's internal successor, **Flume** (FlumeJava, 2010), and its open-source descendant **Apache Beam** (run on Cloud Dataflow) let you write pipelines once and run them as batch or streaming jobs. SQL engines (BigQuery, Spark SQL) now express most batch jobs as queries.

## Joins in batch

- **Sort-merge (reduce-side) join**: both datasets mapped to (join key, record), shuffled so matching keys meet at the same reducer.
- **Broadcast (map-side) join**: when one side is small (a table of countries), send a copy to every mapper and join locally, avoiding the shuffle of the big side.

## Interview angles

- "Compute top queries across a year of logs." MapReduce/Spark: map to (query, 1), combine, reduce sums, then a top-k pass.
- "Why is this job slow?" Shuffle volume, skewed keys, stragglers, small files; fixes: combiners, salting, backup tasks, compaction of inputs.
- "Batch or stream?" Batch for complete, recomputable answers over bounded data; streaming for low-latency results on unbounded data.

--- revise
### Model
? MapReduce's three phases? :: Map (records → key–value pairs), shuffle (group by key across machines), reduce (combine each key's values).
? What is data locality? :: Running map tasks on machines that already store the input chunks.
? Usually the most expensive phase? :: The shuffle (network transfer + sort).

### Robustness and speed
? How does MapReduce tolerate failures? :: Deterministic tasks on immutable inputs are simply re-executed elsewhere.
? Backup tasks? :: Duplicate copies of the last slow tasks (stragglers); first to finish wins.
? What does a combiner do? :: A local mini-reduce on map output, cutting shuffle traffic.
? Fixes for key skew? :: Combiners, salting hot keys over several reducers, special-casing hot keys.

### Beyond MapReduce
? Spark's main improvement? :: Keeps data in memory across a DAG of steps; recomputes lost partitions from lineage.
? Broadcast join? :: Copy the small table to every mapper and join locally, avoiding a shuffle.

--- notes
## MapReduce (Dean & Ghemawat 2004)
Split inputs (64–128 MB) → map near the data → partition by hash(key) → shuffle + sort → reduce per key → write to DFS.
## Robustness
Deterministic tasks + immutable inputs → re-execute failures.
Backup tasks for stragglers.
## Performance
Combiner = local pre-aggregation.
Shuffle dominates; skewed keys overload one reducer → salt or special-case.
Avoid many tiny input files.
## Spark, Flume, Beam
Spark: in-memory DAG, lineage recovery, iterative workloads.
FlumeJava (Google 2010) → Apache Beam on Cloud Dataflow: one pipeline API for batch and streaming.
SQL engines (BigQuery, Spark SQL) express most batch jobs.
## Joins
Sort-merge (reduce-side): shuffle both by key.
Broadcast (map-side): small table copied to all mappers.

## Remember
Deterministic map/reduce functions are required for safe re-execution.
Skewed key → one slow reducer: find it, filter junk keys, salt it.
Stragglers near the end → backup tasks.
Batch = complete answers over bounded data; streaming = low-latency answers over unbounded data.
--- doubts
Q: Is MapReduce still used?
A: The original Hadoop MapReduce engine is largely replaced by Spark, Beam/Dataflow and SQL engines, but the model (map, shuffle by key, reduce) is exactly how those systems execute grouping and aggregation under the hood. Understanding it explains where the time goes in any big data job.

Q: Why must map and reduce functions be deterministic?
A: Because the framework re-runs tasks after failures or as backups for stragglers. If a re-run produced different output (using random numbers or the current time), results from the original and the retry could mix inconsistently.

Q: How many reducers should a job use?
A: Enough that each reducer's input fits comfortably and the work spreads across the cluster (often thousands for very large jobs), but not so many that the output is fragmented into tiny files. Skew matters more than count: one giant key defeats any number of reducers.

--- exercises
[design] Using MapReduce, compute for each URL the number of distinct users who visited it yesterday, from logs of (user_id, url, timestamp).
A: Job 1: map each log line to key (url, user_id) with a dummy value; reduce emits each distinct (url, user_id) once (deduplication). Job 2: map to (url, 1); combine and reduce by summing → distinct users per URL. Or one job keyed by url whose reducer builds a set of user IDs (risky for hugely popular URLs: memory; use HyperLogLog for an approximate count instead).

[estimate] A word-count job's mappers emit 10 billion (word, 1) pairs of ~20 bytes. How much data is shuffled without and with a combiner, if each mapper sees ~50,000 distinct words in its 128 MB split and there are 8,000 splits?
A: Without a combiner: 10¹⁰ × 20 B = 200 GB shuffled. With a combiner: at most 50,000 pairs per mapper × 8,000 mappers = 4 × 10⁸ pairs × 20 B ≈ 8 GB: about 25× less network traffic.

[break] A job's 999 reducers finish in 3 minutes; one takes 2 hours. What's likely happening, and how do you fix it?
A: Key skew: one key (e.g. an empty user ID, a bot, or a very popular item) received a huge share of the values, so its reducer does far more work. Fix: find the hot key, filter junk keys, use a combiner, salt the hot key into k sub-keys reduced in parallel and merged in a second pass.

--- pitfalls
- Huge shuffles without combiners
- Skewed keys landing on one reducer
- Non-deterministic map or reduce functions
- Many tiny input files (task overhead dominates)
- Shuffling a big table to join with a small one instead of broadcasting

--- quiz
Q: In MapReduce, what happens between map and reduce?
- Nothing
- *Pairs are partitioned by key, sent to reducers and sorted (shuffle)
- Data is written to a database
- Reducers call mappers
W: All values for a key must meet at one reducer.
Q: Failed tasks are handled by…
- Restarting the whole job
- *Re-running just that task elsewhere
- Skipping its input
- Manual repair
W: Deterministic tasks on immutable inputs make this safe.
Q: A combiner reduces…
- CPU on reducers only
- *The amount of data shuffled across the network
- The number of mappers
- Disk usage on inputs
W: Local pre-aggregation of map output.
Q: Spark improved on MapReduce mainly by…
- Removing the shuffle
- *Keeping intermediate data in memory across a DAG of steps
- Using SQL only
- Avoiding fault tolerance
W: Iterative and multi-stage jobs no longer hit disk between steps.

--- sources
- paper :: MapReduce: Simplified Data Processing on Large Clusters (OSDI 2004) :: Jeffrey Dean, Sanjay Ghemawat :: https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/
- paper :: Resilient Distributed Datasets: A Fault-Tolerant Abstraction for In-Memory Cluster Computing (NSDI 2012) :: Zaharia et al. :: https://www.usenix.org/conference/nsdi12/technical-sessions/presentation/zaharia
- paper :: FlumeJava: Easy, Efficient Data-Parallel Pipelines (PLDI 2010) :: Chambers et al., Google :: https://research.google/pubs/flumejava-easy-efficient-data-parallel-pipelines/
- book :: Designing Data-Intensive Applications, ch. 10 (Batch Processing) :: Martin Kleppmann :: https://dataintensive.net/

=== stream-windows
blurb: Processing data that never ends: event time vs processing time, tumbling, sliding and session windows, why events arrive late and out of order, and how watermarks, triggers and allowed lateness decide when a window's answer is ready.
signals: "Clicks per minute" dashboards | Counting events from phones that go offline | Late or out-of-order data | Explaining Dataflow/Beam or Flink windows
widgets: watermarks
prereq: batch-processing

--- lesson
:::words
- **Stream**: an unbounded flow of events that never "finishes".
- **Event time**: when an event actually happened (on the phone, the sensor). **Processing time**: when the system sees it.
- **Window**: a slice of the stream grouped for computing (each minute, each 5-minute span, each user session).
- **Watermark**: the system's estimate that no more events older than time T will arrive, so windows ending before T can be finalised.
- **Late event**: one that arrives after the watermark has passed its event time.
- **Trigger**: the rule for when a window emits results (at the watermark, every 10 s early, again for late data).
:::

## The problem in plain words

Batch jobs answer questions about data that has finished arriving. Streams never finish: "how many purchases per minute?" has to be answered while purchases keep coming. Worse, events don't arrive in the order they happened: a phone offline in a tunnel sends its 9:01 events at 9:07; network delays reorder things. If you count by arrival time, your numbers are wrong; if you wait for every possible late event, you never answer. Stream processing is the art of choosing **how long to wait** and **what to do with stragglers**.

:::eli5
Counting votes by the hour on election night. Most ballots for the 8 pm hour arrive by 8:05, but some postal ballots trickle in later. You announce the 8 pm count once you're fairly sure nearly everything is in (the watermark), and if a late bag of 8 pm ballots arrives, you publish a correction.
:::

## Event time vs processing time

Grouping by **processing time** is simple (count whatever arrived this minute) but answers the wrong question when there are delays: a burst of buffered events makes a quiet minute look busy. Grouping by **event time** answers the real question ("what happened between 9:00 and 9:01?"), but requires dealing with lateness. Google's Dataflow model (2015) made event-time processing with explicit lateness handling the standard approach.

## Window types

- **Tumbling (fixed)**: non-overlapping, back to back: 9:00–9:01, 9:01–9:02. Dashboards, per-minute billing.
- **Sliding (hopping)**: fixed length, overlapping: a 5-minute window every 1 minute. Moving averages, "errors in the last 5 minutes" alerts.
- **Session**: per key, a window that stays open while events keep coming and closes after a gap of inactivity (30 minutes). User sessions, visits.
- **Global** with custom triggers: e.g. emit every 1,000 events.

## Watermarks, triggers and lateness

Watch events arrive out of order and see when each window fires:

[[widget:watermarks]]

- A **watermark** at time W means "I believe all events with event time < W have arrived". Sources compute it from what they've seen (e.g. the oldest unprocessed event time across partitions, minus a margin, or from known delivery delays).
- When the watermark passes a window's end, the window **fires** its result.
- **Trade-off**: a watermark that waits longer (larger margin) is more complete but later; a hasty one is faster but more events count as late.
- **Allowed lateness**: keep window state for a while after it fires; late events update it and trigger a **corrected result** (downstream must handle updates: upserts, retractions).
- **Early triggers**: emit speculative partial results before the watermark (every 10 s) for low-latency dashboards, then a final result.
- Events later than allowed lateness are **dropped** (or sent to a side output for auditing).

## Practical guidance

- Use event time for anything users or the business will compare to real-world time.
- Choose watermark slack from measured delay distributions (p99 lateness), and allowed lateness from how long corrections remain useful.
- Make outputs **updatable** (keyed upserts) so corrections are possible.
- Separate "fast and approximate now" (early trigger) from "correct later" (final firing + late updates).

## Interview angles

- "Count clicks per minute by event time." Tumbling windows, watermark-driven firing, allowed lateness with upserted corrections.
- "Phones send events hours late." Long allowed lateness (or a batch reconciliation), and decide whether late data corrects past windows.
- "Tumbling vs sliding vs session?" Per-minute counts vs moving averages vs user activity bursts.

--- revise
### Time
? Event time vs processing time? :: When it happened vs when the system saw it.
? Why count by event time? :: Delays and buffering make processing-time counts misrepresent what happened when.

### Windows
? Tumbling, sliding, session? :: Fixed non-overlapping; fixed length overlapping; per-key, closed after an inactivity gap.

### Completeness
? What does a watermark at W claim? :: All events with event time before W have (probably) arrived.
? When does a window fire? :: When the watermark passes its end (or on early/late triggers).
? Trade-off of a conservative watermark? :: More complete results, more latency.
? Allowed lateness? :: Keep window state after firing so late events produce corrected results.
? Events later than allowed lateness? :: Dropped or sent to a side output.

--- notes
## Time domains
Event time (real-world) vs processing time (arrival). Use event time for business answers.
## Windows
Tumbling: fixed, back to back. Sliding: fixed length, overlapping hops. Session: per key, gap-closed. Global + custom triggers.
## Watermarks
W = estimate that events < W have arrived; from source progress + slack.
Window fires when watermark passes its end.
Bigger slack → more complete, later.
## Lateness and triggers
Allowed lateness: keep state; late events → corrected output (upsert/retract).
Early triggers: speculative results before the watermark.
Too late → drop or side output.
## Practice
Pick slack from measured p99 delay; outputs keyed and updatable; fast-approximate + correct-later.
Dataflow model (Google 2015) → Beam, Flink.

--- doubts
Q: Why not just wait a long time before closing every window?
A: Then every result is delayed by that long, even though 99.9% of events arrived quickly. Watermarks let you close windows as soon as the data is very probably complete, and allowed lateness lets the rare stragglers correct results afterwards: fast and eventually correct.

Q: How does the system know the watermark?
A: It estimates it from the inputs: for a log like Kafka or Pub/Sub, it tracks the oldest event time still unprocessed in each partition and takes the minimum, minus some slack; some sources (sensors with known buffering) provide their own. It's a heuristic: occasionally events arrive behind it, which is exactly what allowed lateness handles.

Q: What happens downstream when a window result is corrected?
A: The sink must accept updates for the same window key: overwrite a row (upsert), or emit a retraction of the old value and the new value (accumulating-and-retracting mode in Beam). Append-only sinks (a plain log of results) need consumers that understand "the latest value for this window wins".

--- exercises
[design] A ride-hailing app computes "trips started per city per minute" for an operations dashboard. Phones may send trip-start events up to 30 minutes late (bad network). Design the windowing.
A: Event-time tumbling 1-minute windows keyed by city. Watermark with small slack (e.g. 10 s) so the dashboard shows results ~10 s after each minute; early triggers every few seconds for a live feel. Allowed lateness of 30 minutes: late events update the minute's count and re-emit; the dashboard's store upserts by (city, minute). Events later than 30 minutes go to a side output and a nightly batch reconciliation.

[choose] Alert if more than 100 payment failures happen within any 5-minute period. Which window?
A: A sliding (hopping) window of 5 minutes advancing every 30 or 60 seconds (or a true sliding/rolling count), keyed by service. A tumbling 5-minute window could miss a burst that straddles a boundary (60 failures at 9:04 and 60 at 9:06).

[break] A team counts events per minute by processing time. After a 10-minute consumer outage, the dashboard shows a huge spike at 10:20 and nothing for 10:10–10:20. What's wrong and how do you fix it?
A: Events from 10:10–10:20 were processed after the outage, so processing-time windows put them all into 10:20 and left the earlier minutes empty. Use event-time windows with a watermark (and allowed lateness), so events land in the minutes in which they actually happened.

--- pitfalls
- Processing-time windows for business metrics
- Tumbling windows for "any 5-minute period" alerts
- Watermarks with no slack, or slack never measured
- Append-only sinks that can't take corrections
- Dropping late data silently

--- quiz
Q: Which window type closes after a gap of user inactivity?
- Tumbling
- Sliding
- *Session
- Global
W: Session windows are per key and gap-based.
Q: A watermark at 9:05 means…
- It's 9:05 in processing time
- *The system believes all events with event time before 9:05 have arrived
- Windows after 9:05 are closed
- Events after 9:05 are dropped
W: It is a completeness estimate in event time.
Q: Allowed lateness lets the system…
- Ignore late data
- *Update a window's result when late events arrive after it fired
- Delay all results
- Reorder events
W: Corrections instead of loss.
Q: Why prefer event time for "orders per minute"?
- It's simpler
- *Delays and outages would otherwise put events in the wrong minutes
- Processing time is unavailable
- Event time needs no watermarks
W: Results should reflect when things happened.

--- sources
- paper :: The Dataflow Model: A Practical Approach to Balancing Correctness, Latency, and Cost (VLDB 2015) :: Akidau et al., Google :: https://research.google/pubs/the-dataflow-model-a-practical-approach-to-balancing-correctness-latency-and-cost-in-massive-scale-unbounded-out-of-order-data-processing/
- article :: Streaming 101 and Streaming 102 :: Tyler Akidau (O'Reilly Radar) :: https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/
- book :: Streaming Systems :: Akidau, Chernyak, Lax :: https://www.oreilly.com/library/view/streaming-systems/9781491983867/
- article :: Apache Flink: timely stream processing (event time, watermarks) :: Apache Software Foundation :: https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/

=== stateful-streams
blurb: Streams that remember: keyed state for counts, joins and deduplication, how processors checkpoint that state consistently (Chandy–Lamport-style barriers in Flink, Dataflow's exactly-once), and recovering without losing or double-counting events.
signals: Running counts or joins over streams | "What happens if a stream processor crashes?" | Exactly-once stream processing | Large state per key
widgets: seq-checkpoint
prereq: stream-windows

--- lesson
:::words
- **Stateful processing**: computing results that depend on earlier events (running totals, windows, joins), so the processor must keep state.
- **Keyed state**: state partitioned by key (per user, per order) and stored with the task that handles that key.
- **State backend**: where state lives: memory, or an embedded store like RocksDB on local disk.
- **Checkpoint**: a consistent snapshot of all state plus the input positions it corresponds to.
- **Barrier**: a marker injected into the stream to coordinate a checkpoint across parallel tasks.
- **Exactly-once state**: after recovery, state reflects every event exactly once.
:::

## The problem in plain words

Counting clicks per user, joining an order stream with a payment stream, or removing duplicate events all need **memory**: the processor must remember what it has seen. That memory lives on many machines (one task per partition of keys). When a machine dies, its state must be recovered to exactly match a point in the input, otherwise counts are lost or doubled. Stream processors solve this with periodic consistent checkpoints.

:::eli5
Several cashiers count customers per product. Every so often, a supervisor sends a "photo now" card down every line at once; each cashier photographs their tally when the card reaches them, noting which customer they were at. If a cashier faints, everyone rolls back to the last photos and the queues rewind to the noted customers, so nothing is counted twice or missed.
:::

## Keyed state

The stream is partitioned by key (like Kafka partitions); each key's state lives with the task handling it, so updates are local and fast. Large state (gigabytes per task) is kept in an embedded store like **RocksDB** on local disk, with only hot keys in memory. State needs **expiry** (TTL) or it grows forever (per-user state for users who never return).

## Consistent checkpoints with barriers

Flink's approach (asynchronous barrier snapshotting, based on the Chandy–Lamport snapshot algorithm):

1. The coordinator injects a **barrier** with checkpoint ID n into each source partition, recording the source offsets.
2. When an operator receives barrier n on all its inputs (aligning them), it **snapshots its state** (asynchronously, to durable storage like GCS/S3/HDFS) and forwards the barrier.
3. When every sink has acknowledged barrier n, checkpoint n is **complete**: a consistent picture of all state as of exactly those input offsets.
4. **On failure**: restart all tasks from checkpoint n's state and rewind sources to its offsets. Events after the checkpoint are reprocessed, but because state was restored to *before* them, each event affects state exactly once.

Step through a checkpoint and a crash:

[[widget:seq-checkpoint]]

**End-to-end exactly-once** also needs the sink to cooperate: either idempotent writes (upserts by key) or transactional sinks that commit their output only when the checkpoint completes (two-phase commit with the checkpoint, as Flink's Kafka sink does). Otherwise, output written after the last checkpoint is written again on replay.

Google Cloud Dataflow achieves exactly-once differently: it records which records each step has processed (deduplication with unique IDs) and commits state and outputs atomically per key range, using Bigtable/Spanner-like storage under the hood.

## Stream joins (a quick map)

- **Stream–stream join** within a time window: keep recent events of both sides in state (e.g. ad impressions and clicks within 1 hour).
- **Stream–table join**: enrich each event with the latest table value (user profile), kept as local state fed by the table's change stream (CDC).
- **Table–table join**: maintain a materialised join of two changelog streams.

## Operational realities

- **Checkpoint interval**: shorter = less replay after failure, more overhead.
- **State size** drives checkpoint duration and recovery time; incremental checkpoints upload only changed files.
- **Rescaling** (changing parallelism) requires redistributing keyed state; systems use key groups (a fixed number of shards of key space) so state can move.
- **Backpressure**: slow operators slow sources; barriers can't align until queues drain, so checkpoints take longer under backpressure (unaligned checkpoints help).

## Interview angles

- "How does your stream processor recover without double counting?" Consistent checkpoints of state + source offsets; replay from the checkpoint; idempotent or transactional sinks.
- "Where does state live?" Locally per key partition (memory/RocksDB), checkpointed to durable storage.
- "How do you join a click stream with user profiles?" Stream–table join with the profile table as local state from a CDC stream.

--- revise
### State
? What is keyed state? :: Per-key state stored with the task that processes that key.
? Where does large state live? :: An embedded store (RocksDB) on local disk, checkpointed to durable storage.
? Why state TTLs? :: Otherwise per-key state grows forever.

### Checkpoints
? What is a consistent checkpoint? :: A snapshot of all operators' state plus the exact source offsets it reflects.
? How do barriers create it? :: Injected at sources; operators snapshot when the barrier arrives on all inputs, then forward it.
? Recovery? :: Restore state from the last complete checkpoint and rewind sources to its offsets.
? Why isn't output exactly-once automatically? :: Output written after the checkpoint is rewritten on replay unless sinks are idempotent or transactional.

### Joins and ops
? Stream–table join? :: Enrich events with the latest table value held as local state fed by CDC.
? Checkpoint interval trade-off? :: Short: less replay, more overhead.

--- notes
## Keyed state
Partitioned by key with its task; local reads/writes.
Memory or RocksDB (large); TTL to bound growth.
## Checkpoints (Flink, Chandy–Lamport style)
Coordinator injects barrier n at sources (records offsets).
Operators align barrier n on all inputs → async snapshot to durable storage → forward.
All sinks ack → checkpoint complete.
Failure → restore state n, rewind sources to offsets n → exactly-once state.
## End-to-end
Idempotent upserts or transactional sinks (commit on checkpoint completion).
Dataflow: per-record dedup IDs + atomic per-key commits.
## Joins
Stream–stream (windowed state of both sides) · stream–table (local table from CDC) · table–table (materialised).
## Ops
Interval vs replay · state size vs recovery · incremental checkpoints · key groups for rescaling · backpressure slows alignment (unaligned checkpoints).

--- doubts
Q: Why do all tasks roll back after one fails?
A: Because state across tasks must correspond to the same point in the input. Restoring only the failed task to an old checkpoint while others kept going would mix states from different points, causing double counts or losses for events in flight between them. Rolling all back to one consistent checkpoint keeps it exact.

Q: Doesn't reprocessing after recovery create duplicates?
A: For internal state, no: the state was restored to before those events, so reprocessing applies them once. For external outputs, yes, unless the sink is idempotent or transactional, which is why end-to-end exactly-once needs sink cooperation.

Q: How big can stream state get?
A: Terabytes across a job is common with RocksDB backends; what matters is per-task state (affects checkpoint and recovery time) and whether you have TTLs. Very large reference data (a whole product catalogue) can also be looked up in an external store with caching instead of held as state.

--- exercises
[design] Deduplicate a stream of payment events (at-least-once delivery from the source) so downstream sees each payment once.
A: Key the stream by payment_id; keep keyed state "seen" with a TTL a bit longer than the maximum redelivery window (e.g. 24 h); emit an event only if not seen, then mark it. Checkpoints include the "seen" state, so recovery doesn't re-emit. Use a transactional or idempotent sink so outputs between checkpoints aren't duplicated.

[estimate] A Flink job holds 600 GB of state over 60 tasks and checkpoints every minute with incremental checkpoints uploading ~2% changed per minute. How much is uploaded per checkpoint, and what's the replay cost after a failure at the worst moment?
A: 600 GB × 2% = 12 GB per checkpoint (≈ 200 MB per task). Worst case, a failure just before a checkpoint completes means replaying up to ~1 minute (plus the checkpoint's duration) of input from the sources, and restoring 10 GB of state per task from durable storage (dominating recovery time).

[break] A team's streaming job counts orders per minute with state in memory and no checkpoints, reading from Kafka with auto-committed offsets. After a crash, some minutes are undercounted. Why?
A: Offsets were committed independently of the in-memory counts. After the crash, the counts were lost but the consumer resumed after the committed offsets, so events counted only in memory were never counted again. Use checkpointed state tied to source offsets (and disable independent auto-commit).

--- pitfalls
- In-memory state without checkpoints
- Committing source offsets separately from state
- Unbounded keyed state (no TTL)
- Assuming internal exactly-once covers external sinks
- Huge per-task state with long checkpoint intervals (slow recovery)

--- quiz
Q: A consistent checkpoint records…
- Only operator state
- Only source offsets
- *All operator state together with the source offsets it corresponds to
- The output written so far
W: State and input position must match.
Q: After a failure, a Flink job…
- Restarts only the failed task from scratch
- *Restores all tasks from the last complete checkpoint and rewinds sources
- Skips the lost events
- Waits for manual repair
W: Everything returns to one consistent point.
Q: Barriers are used to…
- Block slow consumers
- *Mark a consistent cut across parallel streams for snapshotting
- Encrypt state
- Drop late events
W: Each operator snapshots when the barrier passes.
Q: End-to-end exactly-once requires sinks that are…
- Fast
- *Idempotent or transactional with checkpoints
- In memory
- Append-only
W: Replayed output must not duplicate.

--- sources
- paper :: Lightweight Asynchronous Snapshots for Distributed Dataflows (2015) :: Carbone et al. :: https://arxiv.org/abs/1506.08603
- paper :: Distributed Snapshots: Determining Global States of Distributed Systems (TOCS 1985) :: Chandy, Lamport :: https://lamport.azurewebsites.net/pubs/chandy.pdf
- paper :: MillWheel: Fault-Tolerant Stream Processing at Internet Scale (VLDB 2013) :: Akidau et al., Google :: https://research.google/pubs/millwheel-fault-tolerant-stream-processing-at-internet-scale/
- article :: Apache Flink: stateful stream processing and checkpointing :: Apache Software Foundation :: https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/stateful-stream-processing/

=== lambda-kappa
blurb: Two architectures for combining fresh and complete results: Lambda (a batch layer for correctness plus a speed layer for freshness) and Kappa (one streaming pipeline, reprocessing by replaying the log), with why the industry moved toward unified streaming.
signals: Real-time and historical views of the same metrics | Recomputing results after a bug fix | Maintaining two codebases for batch and stream | Choosing an analytics architecture
prereq: stream-windows

--- lesson
:::words
- **Lambda architecture**: run a batch pipeline (complete, slow) and a streaming pipeline (fast, approximate) side by side, and merge their outputs at query time.
- **Kappa architecture**: run only a streaming pipeline; to recompute, replay the input log through a new version of it.
- **Serving layer**: the store queries read from, holding pipeline outputs.
- **Reprocessing**: recomputing results from raw input, after a bug fix or logic change.
:::

## The problem in plain words

Businesses want numbers that are both **fresh** (orders in the last minute) and **correct** (exact totals, even after late data and bug fixes). Around 2011, streaming systems couldn't give strong correctness guarantees, so the **Lambda architecture** (Nathan Marz) paired a batch system for correctness with a stream system for speed. Maintaining the same logic twice was painful, which led to **Kappa** (Jay Kreps, 2014): if the stream processor is correct and the input log is retained, you only need one pipeline.

:::eli5
Lambda is keeping a quick tally on a whiteboard during the day and doing careful bookkeeping at night, then using the books for yesterday and the whiteboard for today. Kappa is having one careful clerk who keeps the books live all day, and if a mistake is found, rereads the receipts from the start with the corrected method.
:::

## Lambda

- **Batch layer**: periodically recomputes views from the complete, immutable master dataset (MapReduce/Spark over everything).
- **Speed layer**: a stream processor computes recent results incrementally, covering the gap since the last batch run.
- **Serving layer**: queries merge batch views (older, exact) with real-time views (recent, approximate).

Pros: correctness from batch recomputation; easy reprocessing (rerun batch). Cons: **two implementations** of the same logic in different frameworks that drift apart; complex merging; two systems to run.

## Kappa

- All data flows through a **retained log** (Kafka with long retention or tiered storage).
- One **stream processing** job computes the views.
- **Reprocessing**: start a new version of the job from the beginning of the log, write to a new output table, switch readers when it catches up, delete the old one.

Pros: one codebase, one system. Cons: needs a stream processor with exactly-once state, event-time windows and the ability to replay large histories efficiently (which is now standard), and long log retention.

## Where things are now

Unified models (Google's Dataflow model, Apache Beam, Flink, Spark Structured Streaming) let the **same code** run in batch or streaming mode, and warehouses accept streaming inserts. Most new designs are Kappa-like (stream everything, replay for reprocessing) with periodic batch jobs only where they're simpler or cheaper (large backfills, ML training).

## Interview angles

- "Real-time dashboard plus correct monthly reports?" Kappa-style: one streaming pipeline with event-time windows and late-data handling; replay for fixes; or a warehouse fed by the stream for monthly queries.
- "What's wrong with Lambda?" Two codebases for the same logic that drift; complex merging.
- "How do you recompute after a bug?" Replay the retained log through the fixed job into a new table, then switch.

--- revise
? Lambda architecture? :: Batch layer (complete, recomputed) + speed layer (fresh, incremental) merged at a serving layer.
? Lambda's main drawback? :: The same logic implemented twice in different frameworks, which drift; complex merging.
? Kappa architecture? :: One streaming pipeline over a retained log; reprocess by replaying into a new output.
? What does Kappa require? :: Long log retention and a stream processor with exactly-once state, event time and efficient replay.
? How do you switch after reprocessing in Kappa? :: Run the new job into a new table; when caught up, switch readers; drop the old one.
? Where did the industry go? :: Unified batch/stream APIs (Beam/Dataflow, Flink, Spark): mostly Kappa-like.

--- notes
## Lambda (Marz)
Batch over immutable master data + speed layer for recent data + serving layer merge.
+ correctness via recompute. − two codebases, drift, merge complexity.
## Kappa (Kreps 2014)
Retained log + one stream job; reprocess = replay into a new output, then switch.
+ one codebase. − long retention, capable stream processor.
## Today
Dataflow model / Beam, Flink, Spark Structured Streaming: same code for batch and stream.
Kappa-like by default; batch for big backfills and ML training.

## Remember
Lambda's real cost is two implementations of the same logic drifting apart.
Kappa reprocessing: new job → new output table → switch readers → delete old.
Long retention via tiered storage or a data lake archive.
Nightly reconciliation jobs still exist for financial reporting.
--- doubts
Q: Is Lambda architecture obsolete?
A: Mostly, as a pattern you'd choose for new systems. Its motivation (streams weren't reliable enough) has faded. But the idea of having a correct recomputation path survives: in Kappa it's a replay; in practice many companies still run nightly batch reconciliations next to streams for financial reporting.

Q: Can Kafka really keep years of data for replay?
A: With tiered storage (old segments in object storage) and/or compacted topics, yes. Alternatively, archive raw events to a data lake and replay from there; Beam/Flink can read the lake for the historical part and the log for the recent part with the same code.

--- exercises
[choose] An ad platform needs per-minute spend for advertisers in real time and exact invoices at month end. Lambda or Kappa?
A: Kappa-like: one Beam/Flink pipeline computing spend with event-time windows, exactly-once state and allowed lateness, feeding both the real-time dashboard store and a warehouse. Month-end invoices are queries over the warehouse (and a reconciliation job if contractually required). If a billing bug is found, replay the retained events through the fixed pipeline into a new table.

[break] A company runs Lambda: Spark batch nightly and Storm for real time. Dashboards show different numbers for "yesterday" before and after the nightly job. Why?
A: The two pipelines implement the logic separately and differ (deduplication rules, late-data handling, time zones), so the speed layer's approximate numbers are replaced by the batch layer's numbers each night. Keeping two implementations identical is Lambda's core cost; unifying on one pipeline (Kappa or a unified API) removes the discrepancy.

--- pitfalls
- Two divergent implementations of the same business logic
- Kappa without long enough log retention to replay
- Overwriting the live output table during reprocessing instead of switching
- Assuming streaming can't be exact (modern processors can be)

--- quiz
Q: Lambda architecture combines…
- Two stream processors
- *A batch layer for complete results and a speed layer for fresh ones
- A cache and a database
- Kafka and ZooKeeper
W: Merged at a serving layer.
Q: In Kappa, reprocessing after a bug fix means…
- Editing old results by hand
- *Replaying the retained log through the fixed job into a new output
- Running a batch job
- Ignoring old data
W: One pipeline, replayed.
Q: Kappa's main requirement is…
- Two codebases
- *A retained log and a stream processor with exactly-once state and event time
- No state at all
- A data warehouse
W: Correct streaming plus replayable input.
Q: Lambda's biggest operational cost is…
- Too little storage
- *Maintaining the same logic twice in different systems
- Slow queries
- No fault tolerance
W: The implementations drift.

--- sources
- article :: Questioning the Lambda Architecture :: Jay Kreps (O'Reilly Radar) :: https://www.oreilly.com/radar/questioning-the-lambda-architecture/
- book :: Big Data: Principles and best practices of scalable realtime data systems :: Nathan Marz, James Warren :: https://www.manning.com/books/big-data
- paper :: The Dataflow Model (VLDB 2015) :: Akidau et al., Google :: https://research.google/pubs/the-dataflow-model-a-practical-approach-to-balancing-correctness-latency-and-cost-in-massive-scale-unbounded-out-of-order-data-processing/
- article :: Apache Beam programming guide :: Apache Software Foundation :: https://beam.apache.org/documentation/programming-guide/

=== cdc
blurb: Change data capture: turning a database's own commit log into a stream of row changes so search indexes, caches, warehouses and other services stay in sync without dual writes, with snapshotting, ordering, schema changes and the outbox variant.
signals: Keeping a search index or cache in sync with a database | Feeding a warehouse continuously | Avoiding dual writes | Migrating data between databases with no downtime
widgets: seq-cdc
prereq: queue-vs-log

--- lesson
:::words
- **Change data capture (CDC)**: reading a database's log of committed changes and publishing each insert, update and delete as an event.
- **Binlog / WAL**: the database's own replication log (MySQL binlog, PostgreSQL write-ahead log) that CDC reads.
- **Connector**: the process that reads the log and publishes changes (e.g. Debezium, Google Datastream).
- **Initial snapshot**: a full copy of existing rows taken before streaming ongoing changes.
- **Derived data**: copies built from the source of truth: search indexes, caches, warehouse tables, materialised views.
:::

## The problem in plain words

The same data usually needs to live in several places: the database (source of truth), a search index, a cache, a warehouse, other services. Having the application write to each one (dual writes) eventually makes them disagree, because one write fails or they're applied in different orders. The database already keeps an ordered, durable log of every committed change for its own replication. **CDC** reads that log and turns it into a stream everyone else can follow, so every derived system sees exactly the committed changes, in commit order.

:::eli5
Instead of a shop assistant phoning the warehouse, the website team and the accountant every time a price changes (and sometimes forgetting one), the shop's official ledger is photocopied automatically, line by line, and everyone gets the copies. Nobody can be forgotten, and everyone sees changes in the same order.
:::

## How it works

1. The connector takes an **initial snapshot** of existing rows (consistently, recording the log position at which the snapshot is valid).
2. It then **tails the log** from that position: each committed change becomes an event with the row's key, before/after values (depending on configuration), the operation (insert/update/delete), the transaction, and the log position.
3. Events go to a log (Kafka/Pub/Sub), usually one topic per table, keyed by primary key, so changes to the same row stay ordered.
4. Consumers apply them: upsert documents into the search index, invalidate cache keys, append to the warehouse, update another service's read model.

Step through an update flowing to three derived systems:

[[widget:seq-cdc]]

## Why it beats dual writes

- **No forgotten write paths**: batch jobs, admin scripts and manual fixes all go through the database, so they appear in the log too.
- **Commit order**: consumers see changes in the order they committed, which dual writes can't guarantee.
- **Only committed data**: rolled-back transactions never appear.
- **Decoupling**: the application doesn't know who consumes its data.

## Things to handle

- **At-least-once**: connectors can republish after restarts; consumers must be idempotent (upsert by key, ignore older versions using the log position).
- **Schema changes**: a column added or renamed must flow through consumers; use a schema registry and compatible changes.
- **Deletes**: arrive as delete events (and tombstones in compacted topics); consumers must apply them.
- **Lag**: derived data is slightly behind the source (usually seconds); monitor it.
- **Database settings**: CDC needs row-based logging and enough log retention to recover from connector downtime; on PostgreSQL a replication slot holds WAL until it's consumed (an abandoned slot can fill the disk).
- **Internal vs public events**: raw CDC exposes your table schema to consumers (tight coupling). For events consumed by other teams, the **outbox pattern** (CDC on an outbox table carrying deliberate, versioned events) gives a stable contract.

## Uses

Search indexing (Elasticsearch fed from MySQL), cache invalidation (Facebook's McSqueal), warehouse ingestion (Datastream → BigQuery), microservice data sharing, zero-downtime database migrations (stream changes to the new database, then cut over), and audit trails.

## Interview angles

- "How do you keep the search index in sync with the database?" CDC to a log; an indexer consumer upserts and deletes documents idempotently.
- "Why not have the app write to both?" Dual writes fail partially and reorder; CDC follows the commit log.
- "CDC or outbox?" Raw CDC for internal derived data; outbox for public, versioned domain events.

--- revise
? What does CDC read? :: The database's commit/replication log (MySQL binlog, PostgreSQL WAL).
? Steps of a CDC connector? :: Consistent initial snapshot with a log position, then tail the log, publishing each committed change keyed by primary key.
? Why CDC over dual writes? :: Catches every write path, preserves commit order, only committed changes, decouples consumers.
? CDC delivery guarantee and consumer rule? :: At-least-once; consumers upsert idempotently and ignore older versions.
? PostgreSQL CDC risk? :: An unconsumed replication slot retains WAL and can fill the disk.
? Raw CDC vs outbox? :: Raw CDC exposes table schemas (fine for internal derived data); outbox gives stable, versioned public events.

--- notes
## Mechanism
Initial consistent snapshot + log position → tail binlog/WAL → change events (key, before/after, op, txn, position) → topic per table keyed by PK → consumers.
Tools: Debezium, Google Datastream, Maxwell.
## Why
Every write path captured · commit order · committed data only · decoupled consumers.
## Handle
At-least-once → idempotent upserts with version checks.
Schema evolution via registry.
Deletes/tombstones.
Lag monitoring.
Row-based logging + retention; PG replication slots can fill disks.
## Raw CDC vs outbox
Raw: internal derived data (search, cache, warehouse).
Outbox: deliberate, versioned events for other teams.
## Uses
Search sync · cache invalidation (McSqueal) · warehouse ingestion · data sharing · zero-downtime migrations · audit.

--- doubts
Q: Doesn't reading the database log slow the database down?
A: Very little: the log is written anyway for durability and replication, and the connector reads it like a replica would. The main operational risks are retention (the database must keep the log until the connector consumes it) and the initial snapshot on very large tables.

Q: How fresh is CDC-derived data?
A: Typically sub-second to a few seconds behind the source, depending on the connector and consumers. It's eventually consistent: a user who updates their profile and immediately searches may not see it yet, so combine with read-your-writes tricks where it matters.

Q: Can I use CDC to migrate to a new database with no downtime?
A: Yes, it's a standard technique: snapshot the old database into the new one, stream ongoing changes via CDC until it's caught up, verify, then switch the application to the new database (and possibly reverse-replicate briefly for rollback).

--- exercises
[design] Keep an Elasticsearch product index in sync with a PostgreSQL products table updated by an app, a batch price job and occasional manual SQL fixes.
A: CDC (Debezium) on the products table → Kafka topic keyed by product_id → indexer consumer that upserts documents (including denormalised fields from related tables if needed, via lookups or additional CDC streams) and deletes on delete events, using the log position or a version column to ignore stale updates. Every path (app, batch job, manual SQL) is captured because all go through the database. Monitor connector lag and replication slot size.

[break] After a CDC connector was stopped for a two-week migration, the PostgreSQL primary ran out of disk. Why?
A: The connector's replication slot told PostgreSQL to retain all WAL from the slot's position so the connector could resume. With nobody consuming it, two weeks of WAL piled up and filled the disk. Monitor slot lag, alert on retained WAL size, and drop slots that are no longer used.

[choose] Another team wants to react to "customer upgraded plan". Expose raw CDC of your customers table or publish an outbox event?
A: An outbox event (`CustomerPlanChanged` with a versioned schema): it describes the business fact, hides your table design, and lets you refactor tables without breaking them. Raw CDC would couple them to column names and internal state transitions.

--- pitfalls
- Dual writes to database and search index/cache
- Non-idempotent consumers of CDC events
- Forgotten replication slots filling disks
- Exposing raw table CDC as a public API to other teams
- Ignoring schema evolution in change events

--- quiz
Q: CDC reads changes from…
- Application logs
- *The database's commit/replication log
- Periodic full-table scans
- The cache
W: Binlog or WAL, in commit order.
Q: A key advantage of CDC over dual writes is…
- Lower latency than the database
- *Every write path is captured, in commit order
- Exactly-once delivery by default
- No schema changes ever
W: The database log sees everything that committed.
Q: CDC consumers should be…
- Stateless only
- *Idempotent (upserts, version checks), since delivery is at-least-once
- Run inside the database
- Synchronous with the writer
W: Connectors may republish after restarts.
Q: For events consumed by other teams, prefer…
- Raw table CDC
- *An outbox table with versioned business events
- Dual writes
- Polling their database
W: A stable contract instead of exposing your schema.

--- sources
- article :: Debezium documentation: architecture and connectors :: Debezium (Red Hat) :: https://debezium.io/documentation/reference/stable/architecture.html
- article :: Datastream overview (CDC to BigQuery) :: Google Cloud :: https://cloud.google.com/datastream/docs/overview
- book :: Designing Data-Intensive Applications, ch. 11 (Change data capture) :: Martin Kleppmann :: https://dataintensive.net/
- article :: PostgreSQL: logical decoding and replication slots :: PostgreSQL Global Development Group :: https://www.postgresql.org/docs/current/logicaldecoding-explanation.html
