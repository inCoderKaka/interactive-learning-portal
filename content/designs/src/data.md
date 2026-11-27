=== d-metrics
est: 45
--- words
- **Metric**: a number measured over time, like CPU usage or requests per second, with labels (host, region).
- **Time series**: one metric with one set of labels, as a list of (time, value) points.
- **Cardinality**: how many distinct time series exist; labels like user ID explode it.
- **Scrape vs push**: the monitoring system pulls metrics from services (Prometheus) or services push them.
- **Downsampling (rollup)**: keeping old data at coarser resolution (1-minute averages instead of 10-second points).
- **Alert rule**: a condition checked continuously ("error rate > 1% for 5 minutes") that pages someone.
- **Gorilla compression**: a trick from Facebook that stores consecutive timestamps and values as tiny differences, ~1.4 bytes per point.
--- flow
1. **0–5, requirements**: collect metrics from 100,000 hosts/services, store, query dashboards, alert within a minute. Clarify retention, resolution, label limits.
2. **5–10, estimates**: 100 M active series × 1 point/10 s = 10 M points/s.
3. **10–15, data**: series ID by metric + labels, compressed blocks per series, label index.
4. **15–25, high level**: agents/collectors → ingestion (sharded by series) → in-memory head blocks + write-ahead log → compressed blocks in storage → query layer; alert evaluator; rollups.
5. **25–40, deep dives**: compression, cardinality control, query fan-out, downsampling, alerting reliability.
6. **40–45, wrap**: meta-monitoring, failures.
--- req
**Functional**
- Ingest metrics (counters, gauges, histograms) with labels from all services and hosts.
- Query: graphs over time with aggregation (`sum by region of rate(errors[5m])`), dashboards.
- Alerting rules evaluated continuously; notifications to on-call.
- Retention: raw for ~15 days, rollups for a year or more.

**Non-functional**
- **High write throughput**, mostly appends of recent points.
- **Fast recent queries** (dashboards look at the last hours).
- **Reliable alerting**: the monitoring system must be more available than what it monitors.
- **Cost-efficient storage** through compression and downsampling.
--- est
- **Series**: 100,000 hosts × ~1,000 series each ≈ **100 M active series**.
- **Ingest**: one point every 10 s per series → **10 M points/s**.
- **Storage**: raw ~16 bytes/point uncompressed → 160 MB/s; Gorilla-style compression ~1.4 bytes/point → **~14 MB/s ≈ 1.2 TB/day**; 15 days raw ≈ 18 TB; rollups much smaller.
- **Memory**: recent 2 hours of each series in memory: 100 M × 720 points × 1.4 B ≈ 100 GB, sharded across ingesters.
- **Queries**: dashboards refresh every 30 s; thousands of users → thousands of queries/s, each touching many series.
--- api
- Ingest: Prometheus remote-write or OTLP: batches of `{series labels, [(ts, value)]}`.
- Query: PromQL-like `GET /query_range?query=&start=&end=&step=`.
- Alerts: rules `{expr, for, labels, annotations}` in config; notifications through an alert manager (grouping, silencing, routing).

**Data**
- Series ID = hash(metric name + sorted labels).
- **Inverted index** of labels → series IDs (for queries like `{service="checkout", region="eu"}`).
- Blocks of 2 hours per series, compressed, in object storage after compaction; head block in memory with a WAL.
--- hl
1. **Collection**: agents scrape local services (or apps push via OTLP) and forward batches to the **ingestion tier**, sharded by series ID with replication (write to 2–3 ingesters).
2. **Ingesters** append points to in-memory **head blocks** and a WAL; every ~2 hours, they cut compressed blocks and upload to **object storage**.
3. A **compactor** merges blocks and creates **downsampled** versions (5-minute, 1-hour).
4. The **query layer** finds matching series via the label index, fetches recent data from ingesters and older data from storage (choosing rollups for long ranges), and aggregates, fanning out in parallel.
5. The **alert evaluator** runs rules every ~15–60 s against recent data and sends firing alerts to the **alert manager**, which dedupes, groups and routes pages.
--- deep
**1. Compression**: timestamps arrive at regular intervals, so store delta-of-delta (usually 0 → 1 bit); values change slowly, so XOR with the previous value and store only the meaningful bits. ~12× smaller than raw.

**2. Cardinality**: a label like `user_id` or `request_id` creates millions of series, exhausting memory. Enforce per-tenant series limits, reject high-cardinality labels, and use logs/traces for per-request detail instead of metrics.

**3. Queries at scale**: precompute common aggregations (recording rules), cache query results by step-aligned time ranges, split long queries by time and run in parallel, use rollups for ranges beyond a day.

**4. Histograms and percentiles**: you can't average percentiles across hosts; store histograms (bucket counts) and compute percentiles after summing buckets.

**5. Alerting reliability**: run alert evaluation close to the data with redundancy (two evaluators, deduped by the alert manager); alert on the monitoring pipeline itself (missing data = alert, "dead man's switch"); separate monitoring for the monitoring system.

**6. Multi-tenancy**: per-tenant ingestion limits, query concurrency limits, isolated shards for large tenants.
--- wrap
**Monitoring the monitor**: ingestion lag, dropped samples, series count per tenant, query latency, alert evaluation delays; an independent "watchdog" path.

**Failures**: an ingester dies → replicas hold its series; WAL replay on restart; object storage outage → recent data still in memory; query overload → limits and caching.

**At 10×**: more ingest shards, stronger cardinality governance, tiered storage.
--- variants
Q: Distributed tracing instead of metrics
A: Data is spans per request (much larger), sampled (head or tail-based), stored by trace ID with indexes on service/duration/errors; queries fetch one trace's waterfall. See the observability page.
Q: Log aggregation (search over application logs)
A: Ingest text lines, index by labels only (Loki) or full-text (Elasticsearch); compressed chunks in object storage; retention by cost; queries scan time ranges.
Q: Business analytics dashboards (daily active users)
A: Event data in a columnar warehouse with batch/streaming aggregation; accuracy matters more than latency; distinct counts with HyperLogLog.
--- steer
Q: 10 million points per second: how do you store them cheaply?
A: Delta-of-delta timestamps and XOR values (Gorilla), 2-hour compressed blocks in object storage, rollups for old data.
Q: A team adds user_id as a label.
A: Cardinality explosion: enforce limits, reject the label, use logs/traces for per-user detail.
Q: Dashboards over 90 days are slow.
A: Use downsampled rollups, recording rules, query splitting and caching.
Q: How do you know the monitoring system itself works?
A: Meta-monitoring, missing-data alerts, dead man's switch, independent watchdog.
Q: How do you compute p99 latency across 500 hosts?
A: Sum histogram buckets, then compute the percentile; never average percentiles.
--- pitfalls
- Storing every point as a database row
- Unlimited label cardinality
- Averaging percentiles
- Alerting that shares fate with the systems it monitors
- No downsampling or retention policy
--- level
- **L4**: collectors → time-series storage → dashboards and alerts.
- **L5**: compression numbers, label index and cardinality control, head blocks + object storage, rollups, histogram percentiles, reliable alert evaluation.
- **L6**: multi-tenant governance, cost per series, meta-monitoring strategy, integration with traces and logs.

=== d-ad-click
est: 45
--- words
- **Impression / click**: an ad being shown, and a user clicking it.
- **Aggregation**: counting events per ad per time window (clicks per ad per minute).
- **Event time vs processing time**: when the click happened vs when the system processed it; they differ when events arrive late.
- **Watermark**: the stream processor's estimate that "no more events older than time T will arrive".
- **Exactly-once processing**: each event affects the counts exactly once even if machines fail and retry.
- **Reconciliation**: comparing the fast streaming counts with a slower, exact batch recount and fixing differences.
- **Click fraud**: fake clicks (bots, competitors) that must not be billed.
--- flow
1. **0–5, requirements**: count clicks (and impressions) per ad per minute for billing and dashboards, near real time, accurately, with fraud filtering. Clarify latency needs and query dimensions.
2. **5–10, estimates**: 1 B clicks/day ≈ 12,000/s, peaks 50,000/s; impressions 100× more.
3. **10–15, API and data**: click redirect endpoint, event log, aggregated tables.
4. **15–25, high level**: click service → log (Kafka/Pub/Sub) → stream processor (dedupe, fraud filter, windowed counts) → aggregate store → query API; raw events to storage → batch recount → reconciliation.
5. **25–40, deep dives**: exactly-once, late events and watermarks, hot ads, dedupe, fraud.
6. **40–45, wrap**: monitoring, failures, billing correctness.
--- req
**Functional**
- Record every click (and impression) with ad ID, campaign, user/device, time, country.
- Report counts per ad/campaign per minute (and per country), queryable for the last 90 days.
- Feed billing (advertisers pay per click) and dashboards (minutes of delay).
- Filter invalid traffic (bots, duplicates) before billing.

**Non-functional**
- **Correctness for billing**: no double counting, no lost clicks; small delays acceptable.
- **Freshness**: dashboards within ~1–5 minutes.
- **Scale**: tens of thousands of clicks/s; millions of impressions/s.
- **Auditability**: raw events kept for disputes and recounts.
--- est
- **Clicks**: 1 B/day ≈ **12,000/s**, peaks ~50,000/s; 200 bytes each ≈ 200 GB/day raw.
- **Impressions**: ~100 B/day ≈ 1.2 M/s: the real throughput challenge if counted the same way.
- **Aggregates**: 10 M active ads × 1,440 minutes × a few dimensions ≈ tens of billions of rows/day if stored naively; roll minute data into hours after a few days.
--- api
- `GET /click?ad_id=&...&sig=` → logs the click and redirects (302) to the advertiser; signed parameters prevent tampering.
- Query: `GET /ads/{id}/stats?from=&to=&granularity=minute&group_by=country`.

**Data**
- Raw events in the log and in cold storage (partitioned by hour).
- `ad_minute_counts(ad_id, minute, country) → clicks, impressions` in an OLAP store (Druid, Pinot, BigQuery, Bigtable).
- Dedup state: recent click IDs per window.
--- hl
1. The **click service** writes the event (with a unique click ID) to the **log**, partitioned by ad ID, then redirects the user.
2. A **stream processor** (Flink/Dataflow) reads the log: dedupes by click ID, runs **fraud filters** (rules, rate checks per IP/device, a model score), assigns events to **event-time windows** (1 minute), and emits counts when the watermark passes, plus late-event corrections.
3. Counts go to the **aggregate store**; dashboards query it.
4. Raw events are also written to **cold storage**; a daily **batch job** recomputes exact counts (with heavier fraud analysis) and **reconciles**: billing uses the batch-corrected numbers.
5. Billing reads final daily counts per campaign.
--- deep
**1. Exactly-once**: the stream processor checkpoints its state and input offsets together; sinks write idempotently (upsert by `(ad_id, minute, country)`) or transactionally, so a restart replays from the checkpoint without double counting. Click IDs dedupe repeated client events.

**2. Late events**: phones send clicks late (offline). Use event-time windows with watermarks (e.g. wait 2 minutes), allow lateness up to an hour with updates to already-emitted windows, and let the batch recount handle anything later.

**3. Hot ads**: one viral ad sends most events to one partition. Pre-aggregate in each worker before shuffling by ad, or salt the key (ad_id#0–7) and sum later.

**4. Fraud**: real-time rules (too many clicks per IP per ad per minute, known bot signatures, clicks with no preceding impression) mark events invalid; offline models re-score; billed counts come from the reconciled data.

**5. Storage**: minute-level data in a columnar OLAP store for fast group-bys; roll up to hourly after ~a week; raw events for audits.
--- wrap
**Monitoring**: end-to-end lag (event time → visible in dashboard), stream vs batch difference per day (should be small), dedupe rate, fraud rate, consumer lag.

**Failures**: processor crash → restore from checkpoint; log outage → click service buffers locally then fails open (redirect still works, events retried); OLAP store down → dashboards stale, billing unaffected (batch path).

**At 10×**: more log partitions and processor parallelism, impression sampling for some metrics.
--- variants
Q: Real-time bidding budget pacing (stop showing ads when budget runs out)
A: Needs low-latency spend counters per campaign shared across ad servers: approximate local counters synced frequently with a central budget service; small overspend tolerated and refunded.
Q: Unique users who saw an ad (reach)
A: Distinct counts: HyperLogLog sketches per ad per window, mergeable across time and dimensions.
Q: Top 100 ads by clicks in the last hour
A: Windowed top-K: count per ad, maintain heaps per partition and merge; or Count-Min sketch with a heap for approximate heavy hitters. See the trending design.
--- steer
Q: How do you avoid double counting when a processor restarts?
A: Checkpoint state + offsets together, idempotent/transactional sinks, click-ID dedupe.
Q: A phone sends clicks two hours late.
A: Event-time windows with watermarks and allowed lateness; batch reconciliation corrects the rest.
Q: Why both streaming and batch?
A: Streaming for fast dashboards, batch for exact, audited billing numbers (Lambda-style); or a single exactly-once streaming path with replay (Kappa) if trusted.
Q: One ad gets 30% of traffic.
A: Pre-aggregate or salt the key, merge partial counts.
Q: How do you stop billing for bot clicks?
A: Real-time rules + offline models; bill from reconciled, filtered counts.
--- pitfalls
- Incrementing a database counter per click
- Processing-time windows (late events land in the wrong minute)
- No dedupe or exactly-once story
- Billing from unreconciled streaming counts
- Ignoring fraud
--- level
- **L4**: click log → stream aggregation → store → dashboard.
- **L5**: event time and watermarks, exactly-once with checkpoints and idempotent sinks, dedupe, hot-key handling, fraud filtering, batch reconciliation for billing.
- **L6**: cost/latency trade-offs (Lambda vs Kappa), advertiser-facing SLAs and disputes, pacing integration.

=== d-payment
est: 45
--- words
- **Payment service provider (PSP)**: a company like Stripe, Adyen or a bank gateway that actually moves card money.
- **Authorise / capture**: first reserve the money on the card (authorise), later actually take it (capture).
- **Idempotency key**: a unique ID for one payment attempt, so a retry never charges twice.
- **Ledger**: an append-only record of every money movement, using double-entry bookkeeping (every debit has a matching credit).
- **Reconciliation**: comparing your records with the PSP's and the bank's daily reports to find mismatches.
- **Webhook**: the PSP calling your server later to say what happened to a payment.
- **PCI DSS**: security rules for handling card numbers; most companies avoid storing card numbers at all by using the PSP's tokens.
--- flow
1. **0–5, requirements**: pay for orders with cards/wallets via PSPs, refunds, payouts to sellers (if marketplace), never double charge, full audit trail. Clarify scale and whether we're the PSP or a merchant using one.
2. **5–10, estimates**: 10 M payments/day ≈ 115/s; peaks 10×. Low QPS: correctness dominates, not scale.
3. **10–15, API and data**: payment intents with states, idempotency keys, ledger entries.
4. **15–25, high level**: checkout → payment service (state machine) → PSP; webhooks update state; ledger records money movements; reconciliation jobs.
5. **25–40, deep dives**: idempotency and retries, unknown outcomes (timeouts), the state machine, ledger design, reconciliation.
6. **40–45, wrap**: security, monitoring, failures.
--- req
**Functional**
- Charge a customer for an order using a stored or new payment method (cards via PSP tokens, wallets).
- Support authorise-then-capture, refunds (partial), and failure handling (declines, 3-D Secure challenges).
- Record every movement in a ledger; produce reports; pay out sellers (marketplace).

**Non-functional**
- **Never charge twice; never lose a payment**: correctness over latency.
- **Auditable**: every change explainable from immutable records.
- **Secure**: no raw card numbers in our systems (tokenisation); PCI scope minimised.
- **Available enough**: checkout must work, but a short delay is better than a wrong charge.
--- est
- **Payments**: 10 M/day ≈ **115/s**, peak ~1,000/s on sales days. Each payment ~5–10 state changes and ~4 ledger entries.
- **Ledger**: 40 M entries/day × 200 bytes ≈ 8 GB/day: a relational database handles it, kept for years.
- **PSP latency**: 300 ms–3 s per call; timeouts happen daily at this scale, so unknown outcomes are a normal case.

The numbers say scale is easy; the design is about correctness under retries and failures.
--- api
- `POST /payments {order_id, amount, currency, payment_method_token, idempotency_key}` → `{payment_id, status}` (`requires_action` for 3-D Secure).
- `POST /payments/{id}/capture`, `POST /payments/{id}/refunds {amount, idempotency_key}`.
- `POST /webhooks/psp` (signed) for asynchronous status updates.

**Data**
- `payments(payment_id, order_id, amount, currency, status, psp, psp_reference, idempotency_key UNIQUE, version)`.
- `payment_events(payment_id, seq, from_status, to_status, details, ts)` (history).
- `ledger_entries(entry_id, transaction_id, account, debit, credit, currency, ts)`: each transaction's debits equal its credits; entries are never updated or deleted, only reversed by new entries.
- `outbox` for publishing events reliably.
--- hl
1. Checkout calls the **payment service** with an idempotency key; the service creates a payment in state *created* (or returns the existing one for a repeated key).
2. It calls the **PSP** to authorise with the same idempotency key (PSPs support this), moving to *authorised*, *declined* or *requires_action*.
3. The order service is told (via an event written through an **outbox** in the same transaction as the state change).
4. Capture happens at shipping; refunds later; each step is a state transition with its own idempotency key.
5. **Webhooks** from the PSP update payments asynchronously (some outcomes only arrive this way); handlers are idempotent.
6. Each money movement writes **double-entry ledger entries** (e.g. debit customer-receivable, credit merchant-payable).
7. Nightly **reconciliation** matches our payments and ledger with PSP settlement reports and bank statements; mismatches go to a queue for investigation.
--- deep
**1. Idempotency end to end**: the client's key makes our API idempotent (unique constraint; return the stored result); we pass a key to the PSP so our retries don't double-charge there either; webhook handlers dedupe by event ID. Every hop must be idempotent because every hop will be retried.

**2. Unknown outcomes**: a PSP call times out: did the charge happen? Never retry with a *new* key. Mark the payment *pending/unknown*, retry the same request (same key) or query the PSP by reference, and let webhooks/reconciliation resolve it. Show the customer "processing" rather than an error that invites a second purchase.

**3. State machine**: allowed transitions only (created → authorised → captured → refunded; created → declined), enforced with a version column (compare-and-set) so concurrent webhook and API updates can't corrupt state.

**4. Ledger**: append-only, double-entry, balanced per transaction; balances are sums (or maintained in a separate table updated in the same transaction). Corrections are new reversing entries. This makes the system auditable and catches bugs (unbalanced books).

**5. Reconciliation**: the safety net that finds what code missed: PSP says captured but we say failed, amounts differ, missing settlements. Automated matching with human review for exceptions.

**6. Security**: card data goes straight from the client to the PSP (hosted fields); we store tokens only; secrets in a KMS; strict access and audit logging.
--- wrap
**Monitoring**: payment success rate by PSP and method, unknown-state payments age, webhook lag, reconciliation mismatches, refund rates, latency.

**Failures**: PSP outage → route to a secondary PSP for new payments (never for in-flight ones), or queue and retry; DB failover → synchronous replication within region so no acknowledged state is lost; duplicate webhooks → idempotent handlers.

**At 10×**: still modest QPS; scaling is about more PSPs, currencies, and regions (data residency), not throughput.
--- variants
Q: Wallet with stored balance (send money between users)
A: Balances live in the ledger; a transfer is one transaction debiting one account and crediting another atomically, with checks for sufficient funds (serializable transaction or per-account ordering); no external PSP for internal transfers.
Q: Marketplace payouts to sellers
A: Hold funds in seller-payable accounts in the ledger, release after delivery/refund windows, batch payouts via bank APIs, handle KYC and failed payouts.
Q: Subscriptions and recurring billing
A: A billing scheduler creates invoices and charges stored tokens on renewal dates, retries failed payments with smart schedules (dunning), prorates plan changes.
Q: Multi-currency
A: Store amounts in minor units with currency; FX conversion recorded as ledger entries with the rate used; settlement in different currencies.
--- steer
Q: The user double-clicks "Pay".
A: Same idempotency key → one payment; the second call returns the first result.
Q: The PSP call times out.
A: Don't create a new attempt; retry with the same key or query by reference; mark unknown and resolve via webhook/reconciliation.
Q: How do you prove the books are right?
A: Immutable double-entry ledger, balanced transactions, daily reconciliation with PSP and bank reports.
Q: A webhook and an API response update the same payment at once.
A: State machine with versioned compare-and-set transitions; idempotent handlers.
Q: Should you store card numbers?
A: No: tokenisation through the PSP keeps you out of most PCI scope.
--- pitfalls
- Retrying a timed-out charge with a new idempotency key
- Updating balances in place without a ledger
- Treating a timeout as a failure and telling the user to try again
- Non-idempotent webhook handlers
- Storing raw card data
--- level
- **L4**: payment service calling a PSP, payments table, webhooks.
- **L5**: idempotency at every hop, unknown-outcome handling, explicit state machine with CAS, double-entry ledger, outbox events, reconciliation.
- **L6**: multi-PSP routing and cost, compliance (PCI, data residency), financial reporting and audit processes.
