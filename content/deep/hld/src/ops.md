=== slos
blurb: Defining "reliable enough" with numbers, the way Google's SRE practice does: service level indicators, objectives and agreements, error budgets that turn reliability into a resource you spend, and burn-rate alerts that page only when it matters.
signals: "How available should this be?" | Choosing what to alert on | Balancing feature velocity against stability | Writing the non-functional requirements of a design
widgets: error-budget

--- lesson
:::words
- **SLI (service level indicator)**: a measured number about the service: the share of requests that succeed, or that complete under 300 ms.
- **SLO (service level objective)**: the target for an SLI over a time window: 99.9% of requests succeed over 30 days.
- **SLA (service level agreement)**: a promise to customers, with consequences (credits, refunds) if broken; looser than the internal SLO.
- **Error budget**: the amount of failure the SLO allows (100% − SLO), to be spent on releases, experiments and incidents.
- **Burn rate**: how fast the error budget is being used, relative to the rate that would exactly use it up by the end of the window.
:::

## The problem in plain words

"The service must be reliable" is not a requirement; it can't be designed for, measured or traded off. And 100% is the wrong target: users can't tell 99.99% from 100% (their own phone and network fail more often), while chasing the last fractions of a percent freezes all change. Google's SRE approach makes reliability a **number** you choose, measure and **spend** deliberately.

:::eli5
A bus company promises "99 of every 100 buses on time". That leaves 1 late bus in 100 as an allowance. If they've used none of the allowance this month, they can try a new route; if they've used it all, they stop experimenting and fix the buses.
:::

## SLIs: measure what users feel

Good SLIs are ratios of good events to total events, measured as close to the user as possible:
- **Availability**: successful requests / valid requests (5xx counts as bad; client 4xx usually doesn't).
- **Latency**: requests faster than a threshold / all requests (e.g. 95% under 200 ms, 99% under 1 s). Percentile thresholds, not averages.
- **Quality / freshness / correctness** for pipelines: data processed within 10 minutes, results matching a reference.
- Measure at the load balancer or client, not inside one server (a dead server reports nothing).

## SLOs: choose the target per user journey

Pick per critical journey (search, checkout, upload), from what users need and what dependencies allow:
- **99.9%** over 30 days ≈ 43 minutes of "badness" per month; **99.99%** ≈ 4.3 minutes; each extra nine is roughly 10× harder and costlier.
- A service can't be more reliable than the dependencies on its critical path combined (three serial dependencies at 99.9% each give at most ~99.7%), unless it degrades gracefully without them.
- Keep the internal SLO tighter than any external SLA, so you act before customers are owed money.

## Error budgets

If the SLO is 99.9%, the error budget is 0.1% of requests (or of time) per window. It turns reliability arguments into a policy:
- **Budget left**: ship features, run experiments, do risky migrations.
- **Budget exhausted**: freeze risky launches, prioritise reliability work until it recovers.
Product and reliability teams agree on this policy **in advance**, so incidents don't become negotiations.

## Burn-rate alerting

Alerting on every error wakes people for noise; alerting on "the SLO is already broken" is too late. Alert on the **burn rate**: if errors are consuming budget 14.4× faster than sustainable, a 30-day budget would be gone in about 2 days: page someone now. A slow burn (say 1–3×) opens a ticket instead. Google's SRE workbook recommends **multi-window, multi-burn-rate** alerts (e.g. page if the burn rate is above 14.4 over both the last hour and the last 5 minutes), which catch fast outages quickly and slow leaks reliably while avoiding flapping.

Watch a month's budget burn under different incidents:

[[widget:error-budget]]

## Interview angles

- "What availability do you target?" Per journey, with the SLI, the window, the budget in minutes, and why (user need, dependency limits, cost).
- "What do you alert on?" Burn rates of SLOs, not CPU or individual errors.
- "Why not 100%?" Users can't perceive it, it's unachievable with dependencies, and it stops all change.

--- revise
### Definitions
? SLI vs SLO vs SLA? :: Measured indicator; internal target for it over a window; external promise with penalties.
? Good SLI form? :: Good events / valid events, measured close to the user (load balancer or client).
? Why percentiles in latency SLIs? :: Averages hide the slow tail users feel.

### Budgets
? Error budget of 99.9% over 30 days? :: 0.1% of requests/time ≈ 43 minutes.
? Error budget policy? :: Budget left → ship and experiment; exhausted → freeze risky changes, fix reliability.
? Why can't a service beat its dependencies' reliability? :: Serial critical-path dependencies multiply (3 × 99.9% ≈ 99.7%) unless it degrades without them.

### Alerting
? What is burn rate? :: Speed of budget consumption relative to exactly using it up by the window's end.
? Burn rate 14.4 on a 30-day budget means? :: The budget is gone in about 2 days: page.
? Multi-window burn-rate alerts? :: Page only when the burn rate is high over both a long and a short window: fast detection without flapping.

--- notes
## SLIs
good / valid events; availability (non-5xx), latency (share under threshold), freshness, correctness.
Measure at LB or client.
## SLOs
Per user journey; 99.9% ≈ 43 min/month; 99.99% ≈ 4.3 min/month.
Dependencies multiply; degrade gracefully to beat them.
SLO tighter than SLA.
## Error budget
100% − SLO; spend on launches and experiments.
Policy agreed in advance: exhausted → freeze risky changes.
## Alerting
Burn rate = budget consumption speed ÷ sustainable speed.
14.4× over 1 h (and 5 min) → page; ~1–3× over days → ticket.
Multi-window, multi-burn-rate (SRE workbook).
Alert on symptoms (SLOs), not causes (CPU).
## Why not 100%
Imperceptible to users; impossible with dependencies; blocks all change.

--- doubts
Q: Should the SLO be as high as possible?
A: No. It should be as high as users need and no higher, because every extra nine costs a lot of engineering and slows change. If users are happy at 99.9%, spending effort on 99.99% takes it away from features. The SLO is a product decision informed by data.

Q: What counts against the error budget?
A: Whatever the SLI counts as bad: failed requests, requests slower than the threshold, stale data. Planned maintenance counts too, unless explicitly excluded, which is one reason teams invest in zero-downtime deploys.

Q: Why alert on burn rate instead of error rate?
A: An error rate threshold (say 1% errors) means different things for a 99% and a 99.99% service, and fires on short harmless blips. Burn rate ties alerts to the SLO: it asks "at this pace, will we break our promise soon?", so pages correspond to real user impact.

--- exercises
[estimate] An API's SLO is 99.95% of requests successful over 30 days; it serves 2 billion requests per month. How many failed requests can it afford? A bad deploy fails 5% of requests for 20 minutes at 800 req/s; how much budget does that use?
A: Budget = 0.05% × 2 × 10⁹ = 1,000,000 failed requests. The incident: 800 × 1,200 s × 5% = 48,000 failures, about 4.8% of the month's budget.

[design] Define SLIs and SLOs for a photo-sharing app's upload and feed journeys.
A: Upload: SLI = uploads accepted and processed into a viewable photo within 60 s / valid uploads; SLO 99.5% over 28 days (processing can be retried; durability is a separate, stricter objective: no confirmed upload lost). Feed: availability SLI = feed requests returning non-5xx / valid; SLO 99.9%. Latency SLI = feed responses under 400 ms; SLO 95%, plus 99% under 1.5 s. Measured at the load balancer and in the app (client-side timing). Burn-rate alerts per SLO.

[break] A team pages on "CPU > 80%" and "any 500 error". On-call is exhausted, and a real outage was missed because people ignored alerts. Fix the alerting.
A: Replace cause-based alerts with symptom-based SLO burn-rate alerts: page only when the error budget is burning fast over both a long and a short window; send slow burns to tickets; keep CPU and individual errors as dashboards and debugging signals, not pages.

--- pitfalls
- "Five nines" without counting dependencies or cost
- Averages instead of percentile-based latency SLIs
- Measuring SLIs inside servers rather than near users
- Alerting on causes (CPU) instead of symptoms (SLO burn)
- No agreed error-budget policy

--- quiz
Q: The error budget of a 99.9% monthly SLO is about…
- 4 minutes
- *43 minutes
- 8.8 hours
- 7 hours
W: 0.1% of ~43,200 minutes.
Q: Which is a good availability SLI?
- Average CPU usage
- *Successful requests / valid requests at the load balancer
- Number of servers up
- Deploys per day
W: Ratios of good events to total, measured near users.
Q: A burn rate of 1 means…
- The service is down
- *The budget will be used exactly by the end of the window
- No errors
- The SLO is broken
W: Faster than 1 means you'll run out early.
Q: When the error budget is exhausted, the usual policy is…
- Lower the SLO
- *Pause risky launches and prioritise reliability work
- Ignore it until next month
- Add more alerts
W: The budget makes the trade-off explicit.

--- sources
- book :: Site Reliability Engineering, ch. 3 (Embracing Risk) and ch. 4 (Service Level Objectives) :: Google :: https://sre.google/sre-book/service-level-objectives/
- book :: The Site Reliability Workbook, ch. 5 (Alerting on SLOs) :: Google :: https://sre.google/workbook/alerting-on-slos/
- book :: The Site Reliability Workbook, ch. 2 (Implementing SLOs) :: Google :: https://sre.google/workbook/implementing-slos/
- article :: The Calculus of Service Availability (ACM Queue 2017) :: Treynor, Dahlin, Rau, Beyer (Google) :: https://queue.acm.org/detail.cfm?id=3096459

=== resilience-patterns
blurb: The patterns that keep one failing component from taking down everything: timeouts and deadlines, retries done safely, circuit breakers, bulkheads, fallbacks and graceful degradation, and how they combine on a real request path.
signals: A slow dependency makes the whole service slow | Cascading failures | "What happens if service X is down?" | Designing calls between microservices
widgets: breaker

--- lesson
:::words
- **Dependency**: a service, database or API that your service calls.
- **Timeout**: the longest you'll wait for an answer before giving up.
- **Deadline**: an absolute time by which the whole request must finish, passed along to every downstream call.
- **Circuit breaker**: a switch that stops calling a failing dependency for a while, failing fast instead.
- **Bulkhead**: separate pools of resources per dependency so one can't exhaust them all.
- **Fallback**: what to return when a dependency fails (cached data, a default, a reduced response).
- **Cascading failure**: one component's failure overloading others, which then fail too.
:::

## The problem in plain words

A request to a product page might call ten services. If one of them hangs, every request that touches it waits; threads and connections fill up; the page service stops answering anything, including requests that didn't need the broken dependency; then its callers stall. One slow component becomes an outage of everything. Resilience patterns put boundaries around failures so they stay small.

:::eli5
A ship has watertight compartments (bulkheads), so a hole floods one compartment, not the whole ship. Electrical circuits have breakers that cut power when something shorts, rather than letting the house burn. Software borrows both ideas.
:::

## Timeouts and deadlines

- **Every remote call needs a timeout**, set from the latency budget (e.g. the dependency's p99.9 plus margin), never "infinite" (the default in many libraries).
- **Deadlines propagate**: if the user request has 500 ms left, a downstream call shouldn't be given 2 s. gRPC passes deadlines automatically; each hop subtracts what's been used.
- Without them, Little's law says in-flight work grows with latency until pools run out.

## Retries, safely

Retry only **idempotent** operations on **transient** errors, with **exponential backoff and jitter**, a **cap** on attempts, a **retry budget** (≤ ~10% extra load), and at **one layer** only (the load-shedding page shows retry storms). **Hedged requests** (a second request after the p95 delay) cut tail latency for idempotent reads.

## Circuit breakers

A breaker wraps calls to a dependency and tracks failures:
- **Closed**: calls go through; failures are counted.
- **Open**: after too many failures (e.g. 50% of the last 20 calls), calls fail immediately without touching the dependency, for a cool-down period. Callers use a fallback. The dependency gets breathing room to recover.
- **Half-open**: after the cool-down, a few trial calls go through; success closes the breaker, failure opens it again.

Break a dependency and watch the breaker protect the caller:

[[widget:breaker]]

## Bulkheads

Give each dependency its **own** bounded thread pool, connection pool or concurrency limit. If the recommendations service hangs, it can exhaust only its own 20 connections, not the 200 the page needs for everything else. Bulkheads also apply to tenants (one customer can't use all capacity) and to request classes (background jobs vs user traffic).

## Fallbacks and graceful degradation

Decide per dependency what the page does without it: recommendations → a generic popular list from cache; reviews → hide the section; pricing → **no fallback** (never show a wrong price; fail the request). Fallbacks must be **cheap and reliable** themselves (a fallback that calls another remote service can fail too). Static stability: design so the system keeps working in its current state when the control plane or a dependency is down (use the last known good configuration).

## Putting it together on one call

Client request with a 500 ms deadline → page service → for each dependency: bulkhead pool → circuit breaker → timeout (from the remaining deadline) → at most one retry with jitter for idempotent reads → fallback on failure → partial page rendered. Plus load shedding at the entrance and observability on each step.

## Interview angles

- "Service X becomes slow. Walk me through what happens." With timeouts, bulkheads and breakers: degraded feature, healthy service. Without: thread exhaustion, cascading failure.
- "What's a circuit breaker, exactly?" Closed/open/half-open states, thresholds, cool-down, fallback.
- "Which dependencies can fail open?" Classify per dependency: degrade (recommendations) vs fail (payments, pricing).

--- revise
### Timeouts
? Why must every remote call have a timeout? :: Otherwise a slow dependency holds threads/connections until pools run out (Little's law).
? Deadline propagation? :: The remaining time budget is passed to each downstream call so nobody works past the user's deadline.

### Breakers and bulkheads
? Circuit breaker states? :: Closed (counting failures) → open (fail fast for a cool-down) → half-open (trial calls) → closed or open.
? Two benefits of an open breaker? :: Callers fail fast with a fallback; the dependency gets room to recover.
? What is a bulkhead? :: A separate bounded resource pool per dependency (or tenant/class) so one can't exhaust everything.

### Fallbacks
? Good fallback examples? :: Cached/popular lists, hiding a section, defaults.
? When is "no fallback" right? :: When a wrong answer is worse than an error (prices, payments, permissions).
? What is static stability? :: Keep operating in the last known good state when a dependency or control plane is down.

--- notes
## Timeouts/deadlines
Every call has a timeout from the latency budget; never infinite.
Propagate deadlines (gRPC); each hop gets the remaining time.
## Retries
Idempotent + transient only; backoff + jitter; cap; ≤10% budget; one layer; hedge idempotent reads after ~p95.
## Circuit breaker
Closed → (failure ratio over window) → open (fail fast, cool-down) → half-open (trial calls) → closed/open.
Protects caller resources and gives the dependency time.
## Bulkheads
Per-dependency pools/concurrency limits; per-tenant and per-class isolation.
## Fallbacks
Cheap, local, reliable: cached data, defaults, hide feature.
No fallback for correctness-critical data (price, payment, auth).
Static stability: last known good config.
## Composition
Deadline → bulkhead → breaker → timeout → limited retry → fallback → partial response; shed at the door; observe each step.

--- doubts
Q: How do I choose a timeout value?
A: From the dependency's real latency distribution and your budget: a little above its normal p99 or p99.9 so healthy calls succeed, and well within the caller's own deadline. Too long, and slowness spreads; too short, and you create failures (and retries) on healthy but slightly slow calls.

Q: Doesn't a circuit breaker just cause more errors?
A: It turns slow failures into fast ones, which is the point: callers stop wasting threads waiting, they can return a fallback immediately, and the struggling dependency isn't hammered while it recovers. The errors were already happening; the breaker contains their cost.

Q: Where do these patterns live: in code or in the infrastructure?
A: Either. Libraries (resilience4j, Polly, gRPC's built-in deadlines and retries) put them in the application; service meshes (Envoy/Istio) can enforce timeouts, retries, outlier ejection and concurrency limits for every service uniformly. Fallbacks need application knowledge, so they stay in code.

--- exercises
[break] A product page calls pricing, reviews and recommendations. Recommendations starts taking 10 s per call. The page service has one shared pool of 200 threads and no timeouts. Walk through what happens.
A: Each page request now holds a thread for 10 s on the recommendation call; at 100 req/s the 200 threads are exhausted in about 2 seconds (Little's law: 100 × 10 = 1,000 needed). New requests queue and time out at the load balancer; the whole product page is down although pricing and reviews are fine; upstream callers may retry and make it worse. Fix: timeouts from the deadline (e.g. 150 ms), a separate bulkhead pool for recommendations, a circuit breaker, and a cached fallback list.

[design] Specify resilience settings for the call from checkout to the payment provider.
A: Deadline: the user's checkout has ~3 s; payment call timeout ~2 s. Retries: only with the provider's idempotency key, at most one retry with jitter on connection errors or 503s, never on ambiguous timeouts without checking the payment status first. Circuit breaker opens on sustained failures and shows "payments are temporarily unavailable, your cart is saved" (no fallback that fakes success). Separate bulkhead so payment slowness can't starve the rest of checkout. Alert on breaker state.

[choose] For each dependency of a news homepage, choose fallback or fail: headline list, personalised recommendations, weather widget, user login session check.
A: Headlines: fall back to a cached list (seconds-old is fine). Recommendations: fall back to popular stories. Weather: hide the widget. Session check: if the auth service is down, treat the user as logged out for display purposes (static content), but fail any action that needs authentication; never assume someone is logged in.

--- pitfalls
- Default (infinite) timeouts on client libraries
- Timeouts longer than the caller's own deadline
- Retries without backoff, jitter or budgets
- One shared pool for all dependencies
- Fallbacks that call other remote services (and can fail the same way)
- Fallbacks that fake correctness-critical data

--- quiz
Q: A circuit breaker in the open state…
- Retries every call
- *Fails calls immediately without contacting the dependency, until a cool-down ends
- Sends half the calls
- Restarts the dependency
W: Fast failure protects the caller and the dependency.
Q: Bulkheads prevent…
- Data loss
- *One slow dependency from exhausting resources needed by everything else
- Network partitions
- Duplicate messages
W: Separate pools contain the damage.
Q: Why propagate deadlines downstream?
- To speed up networks
- *So downstream services stop work the caller can no longer use
- To encrypt requests
- For logging
W: No one works past the user's patience.
Q: Which dependency should NOT have a "fake" fallback?
- Recommendations
- Weather widget
- *Pricing at checkout
- Trending topics
W: A wrong price is worse than an error.

--- sources
- book :: Release It!, 2nd ed., ch. 5 (Stability patterns) :: Michael T. Nygard :: https://pragprog.com/titles/mnee2/release-it-second-edition/
- book :: Site Reliability Engineering, ch. 22 (Addressing Cascading Failures) :: Google :: https://sre.google/sre-book/addressing-cascading-failures/
- article :: CircuitBreaker :: Martin Fowler :: https://martinfowler.com/bliki/CircuitBreaker.html
- article :: Static stability using Availability Zones :: Amazon Builders' Library :: https://aws.amazon.com/builders-library/static-stability-using-availability-zones/
- article :: gRPC and deadlines :: gRPC Authors :: https://grpc.io/blog/deadlines/

=== observability
blurb: Understanding a running system from the outside: metrics for trends and alerts, logs for events and details, distributed traces for following one request across services, and how to instrument a design so incidents can be debugged quickly.
signals: "How would you monitor this?" | Debugging latency across many microservices | Choosing what to log | An incident nobody can explain
widgets: seq-trace

--- lesson
:::words
- **Observability**: being able to tell what a system is doing, and why, from what it emits.
- **Metric**: a number over time (requests per second, error rate, p99 latency), aggregated and cheap to keep.
- **Log**: a record of a single event, with details (structured as key–value fields).
- **Trace**: the path of one request through every service it touched, with timings.
- **Span**: one operation within a trace (a call to a service, a database query).
- **Golden signals**: latency, traffic, errors, saturation (Google SRE's four key metrics).
:::

## The problem in plain words

When something goes wrong in a system of hundreds of services, you need to answer fast: **is it broken, for whom, where, and why?** Metrics tell you that something changed and roughly where; logs give the details of individual events; traces show the path and timing of a single request across services. Each answers different questions at different costs, and a good design builds all three in from the start.

:::eli5
A car dashboard shows speed and engine temperature (metrics). The mechanic's notebook lists every odd noise and when it happened (logs). A dashcam video of one journey shows exactly where the car slowed down and why (a trace).
:::

## Metrics

- Cheap to store and query (counters and histograms aggregated per interval), ideal for **dashboards and alerting**.
- Start with the **four golden signals** per service: **latency** (as percentiles, separating successful and failed requests), **traffic** (requests/s), **errors** (rate), **saturation** (how full: CPU, memory, queue depth, connection pools). Or RED (rate, errors, duration) for services and USE (utilisation, saturation, errors) for resources.
- Keep labels **bounded** (cardinality: the time-series page).

## Logs

- One record per significant event, **structured** (JSON with fields like `request_id`, `user_id`, `status`, `latency_ms`), so they can be searched and aggregated.
- Include a **correlation ID** (the trace ID) in every log line so logs from all services for one request can be found together.
- Levels and sampling: debug logs off in production or sampled; never log secrets or personal data carelessly.
- Volume is the cost: logging every request of a 100k req/s service is terabytes per day; sample successes, keep errors.

## Distributed traces

A **trace ID** is created at the edge and passed with every downstream call (W3C `traceparent` header, OpenTelemetry). Each service records **spans** (start, end, parent span, attributes). A trace view shows the request's tree of calls and where the time went: which dependency was slow, which calls were sequential that could be parallel, where retries happened. Google's **Dapper** (2010) introduced this approach; OpenTelemetry is today's standard.

Traces are **sampled** (keeping 0.1–1% of requests, or tail-based sampling that keeps slow and failed requests), because recording every request is too expensive.

Step through a traced request:

[[widget:seq-trace]]

## Instrumenting a design (what to say in an interview)

- Golden-signal metrics per service and per critical dependency call; SLO dashboards and burn-rate alerts.
- Structured logs with trace IDs; error logs always kept.
- Tracing across all services, sampled, with tail sampling for errors and slow requests.
- Business metrics too (orders per minute, sign-ups): a drop often reveals problems technical metrics miss.
- **Synthetic probes** (black-box checks that exercise real user journeys) catch problems that internal metrics miss.

## Interview angles

- "How would you monitor this design?" Golden signals + SLO burn alerts, structured logs with trace IDs, distributed tracing, business metrics, synthetic checks.
- "Checkout got slow. How do you find out why?" SLO dashboard shows which journey; metrics per dependency show which call; traces of slow requests show where time went; logs give the error details.
- "What not to put in metric labels?" Unbounded IDs (put them in logs/traces).

--- revise
### Three pillars
? Metrics are best for? :: Cheap trends, dashboards and alerting (aggregated numbers).
? Logs are best for? :: Details of individual events (structured, searchable).
? Traces are best for? :: Following one request across services and seeing where time went.

### Practice
? Four golden signals? :: Latency, traffic, errors, saturation.
? What links logs across services for one request? :: A correlation/trace ID in every log line.
? How is a trace stitched together? :: A trace ID propagated in headers (W3C traceparent); each service records spans with parent IDs.
? Why sample traces, and how to keep the useful ones? :: Full tracing is too costly; tail-based sampling keeps slow and failed requests.
? What are synthetic probes? :: Black-box checks that exercise real user journeys from outside.

--- notes
## Metrics
Counters, gauges, histograms; dashboards and alerts.
Golden signals: latency (percentiles, success vs failure), traffic, errors, saturation.
RED for services, USE for resources; bounded labels.
## Logs
Structured JSON; request/trace IDs; levels; sample successes, keep errors; no secrets/PII carelessly; volume = cost.
## Traces
Trace ID at the edge → propagated (W3C traceparent, OpenTelemetry).
Spans with parent IDs and timings → call tree.
Sampling: head (fixed %) or tail (keep slow/failed).
Origin: Google Dapper (2010).
## Instrument a design
Golden signals per service and dependency · SLO burn alerts · structured logs + trace IDs · tracing everywhere · business metrics · synthetic probes.

--- doubts
Q: If I have logs, why do I need metrics?
A: Logs are per event and expensive to aggregate at query time; answering "what's the error rate over the last hour across 500 servers?" from logs is slow and costly, while a metric answers it instantly. Metrics are for spotting and alerting; logs for investigating specifics.

Q: How does a trace ID get from one service to the next?
A: Through request headers (W3C `traceparent`) or RPC metadata. Every outgoing call copies the current trace ID and the current span ID as the parent; for asynchronous messages, the IDs go into message headers so consumers continue the same trace.

Q: Doesn't tracing slow down requests?
A: Recording spans adds microseconds; exporting them happens asynchronously in batches. Dapper's design goal was negligible overhead with sampling, and modern OpenTelemetry SDKs follow the same approach.

--- exercises
[design] Instrument a checkout flow spanning web → API gateway → orders → payments → inventory.
A: Gateway creates a trace ID and records request metrics (rate, errors, latency per route). Every service: golden-signal metrics per endpoint and per outgoing dependency (latency histograms, error counts, pool saturation), structured logs with trace ID, user ID hash, order ID; spans for each call and DB query. SLOs: checkout success ratio and latency; multi-window burn-rate alerts. Business metric: orders/minute with an anomaly alert. Tail-based trace sampling keeping all failed and slowest 1% of checkouts. Synthetic probe placing a test order every minute in each region.

[break] An outage takes 3 hours to diagnose: each service's logs look fine, metrics show elevated latency everywhere, and nobody can tell which service started it. What was missing?
A: Distributed tracing (to see which dependency in the call tree became slow first) and correlation IDs in logs (to follow one failing request across services). Per-dependency latency metrics would also have shown which outbound call slowed.

[choose] A metric `request_latency_seconds` should be broken down by something to debug slow customers. Label by customer_id, or not?
A: Not as a metric label: customer IDs are unbounded and would explode cardinality. Keep metrics labelled by bounded dimensions (route, region, status class), and put customer IDs in logs and trace attributes, which you can query for a specific customer when needed.

--- pitfalls
- Unstructured logs without request/trace IDs
- Logging every successful request at high volume (cost) or logging secrets
- Averages instead of latency percentiles
- Unbounded metric labels
- No tracing in a microservice architecture

--- quiz
Q: Which signal best answers "where did this one slow request spend its time?"
- A metric
- A log line
- *A distributed trace
- A health check
W: Traces show the call tree with timings.
Q: The four golden signals are…
- CPU, memory, disk, network
- *Latency, traffic, errors, saturation
- Logs, metrics, traces, alerts
- Requests, users, revenue, cost
W: From Google's SRE book.
Q: Tail-based sampling keeps…
- A random 1% of traces
- *Traces of slow or failed requests, decided after they finish
- Only the first span
- Every trace
W: It preserves the interesting ones.
Q: What should NOT be a metric label?
- HTTP status class
- Region
- *Request ID
- Service name
W: Unbounded values explode cardinality.

--- sources
- paper :: Dapper, a Large-Scale Distributed Systems Tracing Infrastructure (2010) :: Sigelman et al., Google :: https://research.google/pubs/dapper-a-large-scale-distributed-systems-tracing-infrastructure/
- book :: Site Reliability Engineering, ch. 6 (Monitoring Distributed Systems: the four golden signals) :: Google :: https://sre.google/sre-book/monitoring-distributed-systems/
- article :: OpenTelemetry documentation: traces, metrics, logs :: OpenTelemetry Authors (CNCF) :: https://opentelemetry.io/docs/concepts/signals/
- article :: W3C Trace Context :: W3C :: https://www.w3.org/TR/trace-context/

=== safe-deploys
blurb: Changing a running system without breaking it: rolling, blue-green and canary deployments, feature flags that separate deploy from release, backward-compatible schema changes, automated rollback, and why most outages start with a change.
signals: "How do you deploy without downtime?" | Database migrations on live systems | Rolling out risky features | Reducing the blast radius of bad changes
widgets: seq-canary

--- lesson
:::words
- **Deploy**: putting new code onto servers. **Release**: exposing a change to users. They don't have to happen together.
- **Rolling deploy**: replacing servers a few at a time with the new version.
- **Blue-green deploy**: running a full new environment beside the old one and switching traffic at once.
- **Canary**: sending a small share of traffic to the new version first and comparing its health with the old.
- **Feature flag**: a configuration switch that turns a code path on or off without deploying.
- **Rollback**: returning to the previous version.
- **Blast radius**: how many users or systems a bad change can affect.
:::

## The problem in plain words

Most production incidents are triggered by a **change**: new code, new configuration, a schema migration. You can't stop changing things, so the goal is to change them in a way that makes problems **small, detected quickly and easy to undo**. That means rolling changes out gradually, watching metrics as you go, and being able to go back in minutes.

:::eli5
A restaurant introducing a new recipe doesn't switch every table at once. It serves it to one table first and watches their faces. If they like it, two more tables, then the whole room. If not, it goes back to the old recipe before most diners notice.
:::

## Deployment strategies

- **Rolling**: replace instances in batches (say 10% at a time) with health checks between batches. No extra capacity needed; old and new versions run **side by side** during the rollout (so they must be compatible); rollback is another rolling deploy.
- **Blue-green**: bring up the full new version (green) beside the old (blue), test it, switch the load balancer in one step; rollback is switching back. Fast rollback, but double capacity during the switch and a big-bang moment for traffic.
- **Canary**: deploy to a small slice (1% of traffic, one zone or one cluster), compare its SLIs (error rate, latency, business metrics) with the old version over a period, then widen in stages (1% → 10% → 50% → 100%), automatically halting and rolling back if the canary is worse. The default for large systems; Google rolls out in stages across zones and regions, never everywhere at once.

Step through a canary that catches a bad release:

[[widget:seq-canary]]

## Feature flags: separate deploy from release

Ship code **dark** (behind a flag, off), deploy it safely, then **release** by turning the flag on for internal users, then 1%, then everyone. If something goes wrong, turn the flag off: seconds, no deploy. Flags also enable A/B experiments and kill switches for expensive features under load. Costs: flag debt (clean up old flags), configuration itself must be rolled out carefully (a bad config push is a classic global outage).

## Backward-compatible changes (expand / contract)

During any rollout, old and new versions coexist, so changes must work with both:
- **Database**: expand, then contract. Add the new column (nullable) → deploy code that writes both and reads old → backfill → switch reads to new → stop writing old → drop old column, each step a separate, safe deploy. Never rename or drop in one step.
- **APIs and messages**: additive changes; new fields optional; readers tolerate unknown fields; version breaking changes.

## Automation and rollback

- **Automated canary analysis** compares canary vs baseline metrics statistically and decides proceed/rollback without a human staring at dashboards.
- **Rollback first, debug later**: when a rollout correlates with a problem, roll back immediately.
- **Progressive delivery across failure domains**: one zone, then one region, then the rest, with bake time between, so a bad change never hits every region at once.
- Configuration and infrastructure changes get the same treatment as code.

## Interview angles

- "How do you deploy without downtime?" Rolling or canary behind load balancers with connection draining; backward-compatible changes.
- "How do you roll out a risky feature?" Deploy dark behind a flag; staged release with metric checks; kill switch.
- "How do you change a database column used by live code?" Expand/contract in several steps.

--- revise
### Strategies
? Deploy vs release? :: Deploy = code on servers; release = users see the change (separable with flags).
? Rolling deploy's key constraint? :: Old and new versions run side by side, so they must be compatible.
? Blue-green trade-off? :: Instant switch and rollback, at the cost of double capacity and a big-bang cutover.
? Canary? :: Small slice first, compare SLIs with the baseline, widen in stages, auto-rollback if worse.

### Flags and compatibility
? What do feature flags buy? :: Release and rollback without deploys; staged exposure; kill switches; experiments.
? Expand/contract for a column change? :: Add new → write both → backfill → read new → stop writing old → drop old, each as a separate deploy.
? First response when a rollout correlates with errors? :: Roll back first, debug later.
? Why stage rollouts by zone and region? :: A bad change never hits every failure domain at once.

--- notes
## Strategies
Rolling: batches + health checks; versions coexist; no extra capacity.
Blue-green: full parallel env; instant switch/rollback; 2× capacity.
Canary: 1% → 10% → 50% → 100%; compare SLIs vs baseline; automated analysis; auto-rollback.
Progressive by failure domain: zone → region → global, with bake time.
## Flags
Deploy dark, release gradually, kill switches, A/B tests.
Flag debt; config changes need staged rollout too.
## Compatibility
DB expand/contract: add → dual-write → backfill → switch reads → stop old writes → drop.
APIs/messages: additive, optional fields, tolerant readers, versions for breaking changes.
## Practice
Most incidents start with a change; rollback first; automate canary analysis.

## Remember
Old and new versions coexist during every rollout: changes must be backward compatible.
Bake time between stages catches slow-building problems.
A baseline group on the old version makes canary comparisons fair.
Clean up flags after full rollout.
--- doubts
Q: If canaries get only 1% of traffic, how can they detect problems?
A: With enough total traffic, 1% is still thousands of requests per minute, enough to see error-rate or latency differences statistically, especially when compared against a baseline group of the same size on the old version. Rare problems may need longer bake times or larger stages, which is why canaries widen gradually.

Q: Are feature flags just "if" statements?
A: In code, yes, but backed by a configuration service that can change values per user, percentage, region or request in seconds without deploys, with audit logs. The discipline is in managing them: owners, expiry dates and cleaning up old flags.

Q: Why can't I just rename a database column in one migration?
A: During the rollout, old instances still read and write the old name while new instances use the new one; one of them will fail. Expand/contract keeps both working at every moment, so the change can be rolled out (and rolled back) safely.

--- exercises
[design] Roll out a rewritten recommendation algorithm to 300M users safely.
A: Deploy the new code dark behind a flag. Enable for employees, then 0.1% of users as an experiment arm with a matched control, comparing latency, errors, CTR and engagement metrics. Widen to 1%, 10%, 50% over days with automated checks and a kill switch (flag off → old algorithm). Roll out per region, starting with a smaller region. Remove the old path and the flag once at 100% for a while.

[break] A configuration change (a bad regex in a request filter) was pushed globally at once and took down every region for 40 minutes. What process changes prevent this?
A: Treat config like code: validate it (tests, linting), roll it out progressively (one canary zone, then region by region, with bake time and automated health checks), make it instantly revertible, and keep data-plane servers statically stable (keep using the last known good config if a new one fails to load or fails health checks).

[estimate] A rolling deploy updates 200 instances in batches of 10, waiting 2 minutes between batches. How long does the deploy take, and how long does a full rollback take the same way? What would blue-green change?
A: 20 batches × 2 min = 40 minutes each way. Blue-green switches traffic in seconds (and back in seconds), at the cost of running 400 instances during the switch. A canary-then-rolling hybrid catches most problems in the first stage, when only one batch is affected.

--- pitfalls
- Global, all-at-once rollouts (code or config)
- Breaking schema or API changes deployed while old versions still run
- Debugging in production instead of rolling back
- Feature flags never removed
- Canary decisions by eyeballing dashboards instead of automated comparison

--- quiz
Q: A canary deployment…
- Replaces all servers at once
- *Sends a small slice of traffic to the new version and compares its health before widening
- Runs only in staging
- Disables monitoring
W: Problems affect few users and are detected early.
Q: Feature flags let you…
- Deploy faster servers
- *Release and roll back changes without deploying
- Avoid testing
- Skip code review
W: Deploy and release become separate steps.
Q: The safe way to rename a column on a live system is…
- One ALTER TABLE RENAME
- *Expand/contract: add, dual-write, backfill, switch reads, then drop the old one
- Drop and recreate the table
- Stop the service for an hour
W: Every intermediate state works for old and new code.
Q: When a rollout correlates with rising errors, first…
- Debug in production
- *Roll back
- Add more logging
- Scale up
W: Restore service, then investigate.

--- sources
- book :: Site Reliability Engineering, ch. 8 (Release Engineering) :: Google :: https://sre.google/sre-book/release-engineering/
- book :: The Site Reliability Workbook, ch. 16 (Canarying Releases) :: Google :: https://sre.google/workbook/canarying-releases/
- article :: Automated canary analysis at Netflix with Kayenta :: Netflix Technology Blog / Google Cloud :: https://netflixtechblog.com/automated-canary-analysis-at-netflix-with-kayenta-3260bc7acc69
- article :: Feature Toggles (aka Feature Flags) :: Pete Hodgson (martinfowler.com) :: https://martinfowler.com/articles/feature-toggles.html
- article :: Parallel Change (expand and contract) :: Danilo Sato (martinfowler.com) :: https://martinfowler.com/bliki/ParallelChange.html

=== failure-detection
blurb: Deciding that a machine is dead when you can't tell dead from slow: heartbeats and timeouts, the impossibility behind it, phi-accrual detectors, gossip-based membership (SWIM), and how detection speed trades against false alarms.
signals: Cluster membership in Cassandra, Consul or a custom system | Tuning failover timeouts | Nodes falsely declared dead under load | "How do nodes know who's alive?"
widgets: gossip

--- lesson
:::words
- **Heartbeat**: a small periodic "I'm alive" message.
- **Failure detector**: the component that decides when a node is presumed dead.
- **False positive**: declaring a healthy (just slow) node dead.
- **Membership list**: each node's view of which nodes are in the cluster and alive.
- **Gossip protocol**: nodes repeatedly share information with a few random peers, so it spreads like a rumour.
- **SWIM**: a scalable membership protocol using random pings, indirect pings and gossip.
:::

## The problem in plain words

In a distributed system you can never be sure another machine has crashed: a missing reply could mean it's dead, overloaded, paused for garbage collection, or the network dropped the message. All you can do is **suspect** after waiting a while. Wait too briefly, and healthy machines are declared dead (triggering needless failovers and data movement); wait too long, and real failures go unhandled. And with thousands of machines, everyone heartbeating everyone else doesn't scale.

:::eli5
You call a friend and they don't pick up. Are they ill, busy, or is their phone off? After a few unanswered calls you start to worry. And to check on a large group of friends, you don't call all of them every minute; you each check on a couple of others and pass on the news.
:::

## Heartbeats and timeouts

The basic detector: every node sends heartbeats every interval; a node not heard from for a timeout (several intervals) is suspected. Detection time ≈ timeout; false-positive risk rises as the timeout approaches normal delays. There's a fundamental limit here: in an asynchronous network (no bound on message delay), no detector can be both always accurate and always fast (related to the FLP impossibility result). Real systems use timeouts and accept occasional mistakes, then make mistakes **safe** (fencing, terms) rather than impossible.

## Adaptive detection: phi accrual

Instead of a fixed timeout, the **phi-accrual** detector (used by Cassandra and Akka) learns the distribution of heartbeat arrival times for each peer and outputs a suspicion level φ: how unlikely the current silence is given past behaviour. Applications pick a threshold (e.g. φ > 8). A peer on a jittery link gets more slack automatically; a normally punctual peer is suspected sooner.

## Gossip-based membership (SWIM)

All-to-all heartbeats cost O(N²) messages. **SWIM** (Das, Gupta, Motivala, 2002) scales to thousands of nodes:
1. Each period, a node pings **one random member**.
2. If no ack, it asks **k other members to ping it indirectly** (to rule out a problem on its own link).
3. Still nothing: mark the member **suspect** (not dead yet), giving it a chance to refute.
4. Membership changes (joins, suspicions, deaths) **piggyback** on ping messages and spread by gossip, reaching everyone in O(log N) rounds.

Used (with extensions) by HashiCorp's Serf/Consul (memberlist), and gossip-style membership in Cassandra and Dynamo. Watch a failure spread through gossip:

[[widget:gossip]]

## Designing with failure detectors

- **Pair detection with safe failover**: leases, terms and fencing so a falsely suspected node can't cause damage when it turns out to be alive.
- **Different timeouts for different actions**: route traffic away quickly (cheap, reversible), but wait longer before expensive actions (re-replicating terabytes of data).
- **Watch for correlated slowness**: under heavy load, many nodes may look dead at once; mass failovers then make overload worse. Rate-limit automated reactions.

## Interview angles

- "How do nodes know who's alive?" Heartbeats with timeouts, or gossip membership (SWIM) at scale; suspicion before declaring dead.
- "Why not a 1-second timeout?" GC pauses and load spikes cause false positives and failover storms.
- "What if a 'dead' node comes back?" Fencing/terms make its stale actions harmless; it rejoins and catches up.

--- revise
? Why can't you be sure a node has crashed? :: Silence could be a crash, overload, a pause or lost messages; you can only suspect.
? Timeout trade-off? :: Short: fast detection, more false positives. Long: fewer mistakes, slower reaction.
? Phi-accrual detector? :: Outputs a suspicion level based on each peer's learned heartbeat timing; adapts to jitter (Cassandra, Akka).
? SWIM's steps? :: Ping a random member → indirect pings via k others → mark suspect → gossip the change.
? Why gossip? :: Membership updates spread in O(log N) rounds without O(N²) heartbeats.
? How to make false positives safe? :: Leases, terms and fencing.
? Different timeouts for different actions? :: Quick traffic rerouting; slower, rate-limited data re-replication.

--- notes
## Basics
Heartbeat interval + timeout; detection ≈ timeout.
Asynchronous networks: perfect detection impossible (FLP-related); accept mistakes, make them safe.
## Phi accrual
Model heartbeat inter-arrival times per peer; φ = suspicion; threshold (e.g. 8); Cassandra, Akka.
## SWIM / gossip
Random ping → indirect ping (k peers) → suspect → confirm dead; piggyback updates; O(log N) spread; O(N) messages per round overall.
Serf/Consul memberlist, Cassandra, Dynamo.
## Design
Fencing/terms/leases for false positives.
Fast cheap reactions; slow expensive ones (re-replication) with delays and rate limits.
Correlated slowness → avoid mass automated failover.

## Remember
Suspect before dead, so a slow node can refute.
Raft groups (3–7 nodes) use simple timeouts; big clusters use gossip.
GC pauses and load spikes are the usual false positives.
Re-replication of a "dead" node's data should wait and be throttled.
--- doubts
Q: Why mark a node "suspect" instead of dead right away?
A: To give it a chance to refute the suspicion (it may just have been slow or its link briefly broken). A suspect node that's actually alive will see the gossip about itself and broadcast that it's alive, avoiding a needless removal and data movement.

Q: How fast does gossip spread news?
A: Like an epidemic: each round, every informed node tells a few random others, so the number of informed nodes roughly multiplies each round. Reaching all N nodes takes O(log N) rounds: a cluster of 1,000 nodes learns of a change within about 10 rounds.

Q: Do Raft clusters use these detectors?
A: Raft's followers use a simple timeout (no heartbeat from the leader within a randomised election timeout). Large membership systems (thousands of nodes) use gossip; consensus groups are small (3–7 nodes), where direct heartbeats are cheap.

--- exercises
[estimate] A cluster of 2,000 nodes uses gossip where each node contacts 3 random others per 200 ms round. Roughly how long until news reaches nearly every node?
A: Informed nodes roughly quadruple per round (each informed node tells 3 more): 4^r ≥ 2,000 → r ≈ 5.5, so about 6–8 rounds with overlap: roughly 1.5 seconds.

[break] During a traffic spike, a storage cluster's nodes start declaring each other dead; data re-replication begins, load climbs further, and more nodes are declared dead. What's happening, and what would you change?
A: Load makes heartbeats late (GC pauses, saturated CPUs), the fixed-timeout detector produces false positives, and the expensive reaction (re-replication) adds more load: a cascade. Use adaptive detection (phi accrual) or longer timeouts under load, suspect-before-dead, delay and rate-limit re-replication (wait to see if nodes come back), and keep cheap actions (routing away) separate from expensive ones.

[choose] For a 5-node database primary failover, choose a failure-detection timeout: 1 s or 15 s?
A: Closer to 10–15 s (or adaptive). A 1-second timeout would trigger failovers on routine GC pauses or brief network blips, each costing seconds of unavailability and risk; 10–15 s detects real failures acceptably fast. Combine with leases/terms so a falsely deposed primary can't keep writing.

--- pitfalls
- Very short timeouts that turn GC pauses into failovers
- All-to-all heartbeats in large clusters
- Expensive automatic reactions (re-replication) without delay or rate limits
- Assuming "no reply" means "dead"
- Failover without fencing the suspected node

--- quiz
Q: A missing heartbeat proves…
- The node crashed
- *Nothing certain: the node could be slow, paused or cut off
- The network is down
- The node is overloaded
W: Detectors can only suspect.
Q: SWIM uses indirect pings to…
- Save bandwidth
- *Rule out a problem on the pinging node's own link before suspecting the target
- Elect a leader
- Encrypt membership
W: Other nodes check the target too.
Q: The phi-accrual detector improves on fixed timeouts by…
- Never making mistakes
- *Adapting to each peer's observed heartbeat timing
- Using GPS clocks
- Removing heartbeats
W: Suspicion is relative to normal behaviour.
Q: Gossip spreads membership updates to N nodes in about…
- N rounds
- *log N rounds
- 1 round
- N² rounds
W: Epidemic spread multiplies informed nodes each round.

--- sources
- paper :: SWIM: Scalable Weakly-consistent Infection-style Process Group Membership Protocol (DSN 2002) :: Das, Gupta, Motivala :: https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf
- paper :: The φ Accrual Failure Detector (SRDS 2004) :: Hayashibara et al. :: https://www.researchgate.net/publication/29682135_The_ph_accrual_failure_detector
- paper :: Impossibility of Distributed Consensus with One Faulty Process (FLP, JACM 1985) :: Fischer, Lynch, Paterson :: https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf
- article :: HashiCorp memberlist (SWIM-based gossip) :: HashiCorp :: https://github.com/hashicorp/memberlist
