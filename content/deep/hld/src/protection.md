=== rl-algorithms
blurb: The five classic rate-limiting algorithms (fixed window, sliding log, sliding window counter, token bucket, leaky bucket), raced on the same bursty traffic so you can see who lets a boundary burst through, who smooths, and what each costs in memory.
signals: "Design a rate limiter" | Per-user or per-API-key quotas | Protecting a backend from bursts | Choosing between token bucket and sliding windows
widgets: rl-race, token-bucket

--- lesson
:::words
- **Rate limit**: the maximum number of requests a client may make in a time period, such as 100 per minute.
- **Burst**: many requests arriving close together.
- **Window**: the time period over which requests are counted.
- **Token bucket**: a bucket that refills with tokens at a steady rate; each request spends one; an empty bucket means "wait".
- **Leaky bucket**: a queue that releases requests at a fixed rate, smoothing bursts.
- **429 Too Many Requests**: the HTTP status returned when a client is over its limit.
:::

## The problem in plain words

Without limits, one buggy client, scraper or attacker can use up a service's capacity and hurt everyone else. A rate limiter decides, for every request, "has this client used up its allowance?". The algorithms differ in how they count time, which decides whether they let a sudden burst through, whether they smooth traffic, and how much memory they need per client.

:::eli5
An arcade gives each child 10 tokens per hour. The fixed-window rule resets the count on the hour, so a child can play 10 games at 1:59 and 10 more at 2:00. A token bucket drips one token into each child's cup every 6 minutes, up to 10, so they can save up a small burst but never exceed the average rate for long.
:::

## The five algorithms

**1. Fixed window counter.** Count requests per client per window (e.g. per calendar minute); reject once the count exceeds the limit; reset at the window boundary. One counter per client: tiny memory, trivial in Redis (`INCR` + `EXPIRE`). Flaw: **boundary bursts**: 100 requests at 0:59 and 100 at 1:00 are 200 in two seconds, both windows "within limits".

**2. Sliding window log.** Keep a timestamp for every accepted request; on each request, drop timestamps older than the window and count the rest. Exact (no boundary burst), but memory grows with the limit (a timestamp per request per client).

**3. Sliding window counter.** Keep counts for the current and previous fixed windows and estimate the sliding count as `current + previous × (fraction of the previous window still inside the sliding window)`. Two counters per client, nearly exact; the common production compromise (used by Cloudflare).

**4. Token bucket.** Each client has a bucket of capacity B that refills at rate r tokens per second; each request takes a token or is rejected. Allows bursts up to B, then limits to r on average. Two numbers per client (tokens, last refill time); refill is computed lazily on each request. Very common: cloud APIs, Nginx, Envoy and Stripe use token-bucket variants.

**5. Leaky bucket (as a queue).** Requests enter a queue that drains at a fixed rate r; if the queue is full, new requests are rejected. Output is perfectly smooth; bursts wait (adding latency) rather than being served immediately. Good in front of a fragile downstream that needs an even rate.

Race them on the same traffic, including a burst exactly at a window boundary:

[[widget:rl-race]]

And try the token bucket on its own:

[[widget:token-bucket]]

## Choosing

| Need | Choose |
|---|---|
| Simplest, cheap, approximate | Fixed window (accept boundary bursts) |
| Accurate, no boundary burst, low memory | Sliding window counter |
| Allow short bursts, cap the average | Token bucket |
| Smooth, steady output to a fragile backend | Leaky bucket (queue) |
| Exact per-request accounting, low limits | Sliding window log |

## Design details interviewers probe

- **What is limited**: per user, per API key, per IP, per endpoint, per tenant; often several layers (a global limit plus per-user limits).
- **What the client sees**: 429 with `Retry-After` and rate-limit headers (limit, remaining, reset) so well-behaved clients back off.
- **Where it runs**: at the API gateway or edge for coarse limits (cheap, early), in services for business limits (e.g. 5 password attempts per account).
- **Fail open or closed** when the limiter's own store is unavailable: usually open for general APIs (don't take the product down because the limiter is down), closed for security-sensitive limits (login attempts).
- **Cost-based limits**: count expensive requests (a search, a GraphQL query) as more than one unit.

## Interview angles

- "Design a rate limiter." Requirements (per what, limits, accuracy, latency budget ~1 ms), algorithm choice (token bucket or sliding window counter), storage (local + Redis), response headers, fail-open policy.
- "What's wrong with fixed windows?" Boundary bursts of up to 2× the limit.
- "Token bucket vs leaky bucket?" Token bucket admits bursts immediately up to capacity; leaky bucket smooths by queueing.

--- revise
### Algorithms
? Fixed window's flaw? :: Boundary bursts: up to 2× the limit across the end of one window and the start of the next.
? Sliding window log's cost? :: A timestamp per accepted request per client: memory grows with the limit.
? Sliding window counter estimate? :: current + previous × (overlap fraction of the previous window).
? Token bucket behaviour? :: Bursts up to capacity B, then an average rate r; two numbers per client, refilled lazily.
? Leaky bucket behaviour? :: Queue drained at a fixed rate: smooth output, bursts wait or are rejected when full.

### Design
? What should a 429 carry? :: Retry-After and limit/remaining/reset headers.
? Fail open or closed when the limiter store is down? :: Open for general APIs; closed for security limits (logins).
? Where to enforce? :: Gateway/edge for coarse limits; services for business limits.
? Cost-based limiting? :: Expensive requests consume more units.

--- notes
## Algorithms
Fixed window: INCR + EXPIRE; tiny; boundary bursts up to 2×.
Sliding log: timestamps per request; exact; memory ∝ limit.
Sliding window counter: 2 counters, weighted estimate; near-exact (Cloudflare).
Token bucket: capacity B, refill r; bursts ≤ B; lazy refill; Envoy, Nginx, Stripe, cloud APIs.
Leaky bucket: fixed-rate queue; smooth; adds latency.
## Choose
Cheap → fixed · accurate + cheap → sliding counter · bursts OK → token bucket · smooth downstream → leaky · exact low limits → log.
## Design
Key: user, API key, IP, endpoint, tenant; layered limits.
429 + Retry-After + RateLimit headers.
Gateway for coarse, service for business rules.
Fail open (general) vs closed (security).
Cost-weighted units for expensive requests.

--- doubts
Q: Why not just use fixed windows everywhere? They're so simple.
A: For many internal limits the 2× boundary burst doesn't matter, and fixed windows are fine. Where the limit protects a fragile backend or enforces a contract (an API plan), a client gaming the boundary can double its rate; sliding window counters fix that at almost the same cost.

Q: Isn't a token bucket the same as a leaky bucket?
A: They're mathematically related (both cap the long-run rate), but behave differently for bursts: a token bucket lets a burst through immediately (up to its capacity) and then throttles; a leaky bucket queues the burst and releases it at the steady rate, adding delay. Use token buckets for user-facing APIs and leaky buckets to protect something that can't handle bursts.

Q: How do you refill a token bucket without a timer per client?
A: Lazily: store tokens and last_refill_time. On each request, add rate × (now − last_refill_time) tokens (capped at capacity), update the time, then try to take one. Nothing runs between requests.

Q: How precise does a rate limiter need to be?
A: Usually not very: letting through a few percent extra during a burst is fine for protecting capacity, and approximate distributed counting is much cheaper than exact. Security limits (login attempts) and billing limits need more care.

--- exercises
[estimate] A fixed-window limiter allows 100 requests per minute. What's the most a client can send in any 60-second period?
A: Up to 200: 100 in the last second of one window and 100 in the first second of the next. A sliding window counter or token bucket (capacity 100, refill 100/min) caps it close to 100 in any 60 s (the token bucket allows ~100 + refill during the period).

[design] Design rate limits for a public API: free plan 60 requests/minute, paid 6,000/minute, plus protection against one user hammering the expensive search endpoint.
A: Token bucket per API key at the gateway: free capacity 60, refill 1/s; paid capacity 6,000, refill 100/s. A separate, stricter cost-weighted bucket for /search (each search costs 10 units). 429 responses with Retry-After and RateLimit headers. Counters in a fast shared store (Redis) with local caching; fail open for general limits if the store is unavailable.

[choose] A payment processor's downstream bank API accepts at most 50 requests/s and errors under bursts. Which algorithm in front of it?
A: A leaky bucket (a queue drained at a steady ≤ 50/s), so bursts from your side are smoothed into an even rate the bank tolerates, with a bounded queue and timeouts so requests don't wait forever.

--- pitfalls
- Fixed windows where boundary bursts matter
- Sliding logs with high limits (memory explodes)
- No Retry-After, so clients retry immediately
- Failing closed on a general API when the limiter store is down
- Counting all requests equally when costs differ by 100×

--- quiz
Q: Which algorithm allows up to 2× the limit around a window boundary?
- Token bucket
- Sliding window log
- *Fixed window counter
- Leaky bucket
W: Each window is counted independently.
Q: A token bucket with capacity 10 and refill 1/s allows…
- Exactly 1 request per second, never more
- *A burst of up to 10, then about 1 per second on average
- 10 per second forever
- No bursts
W: Capacity sets the burst; refill sets the average.
Q: Which algorithm smooths output to a steady rate by queueing?
- Fixed window
- Token bucket
- *Leaky bucket
- Sliding window counter
W: Bursts wait instead of passing through.
Q: The sliding window counter estimates the count using…
- Every request's timestamp
- *The current window's count plus a weighted share of the previous window's
- A random sample
- Only the current window
W: Two counters per client, near-exact.

--- sources
- article :: How we built rate limiting capable of scaling to millions of domains :: Cloudflare :: https://blog.cloudflare.com/counting-things-a-lot-of-different-things/
- article :: Scaling your API with rate limiters :: Stripe :: https://stripe.com/blog/rate-limiters
- book :: System Design Interview, vol. 1, ch. 4 (Design a rate limiter) :: Alex Xu :: https://bytebytego.com/courses/system-design-interview/design-a-rate-limiter
- article :: Envoy: local and global rate limiting :: Envoy Proxy :: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting

=== rl-distributed
blurb: Rate limiting when requests for the same client hit many servers: a central store with atomic operations, local counters synchronised periodically, sticky routing, and the accuracy-versus-latency trade-off, plus multi-region limits.
signals: The API runs on hundreds of gateway instances | A per-user limit must hold across the fleet | The limiter adds too much latency | Global limits across regions
widgets: seq-rl-distributed
prereq: rl-algorithms

--- lesson
:::words
- **Central counter**: one shared store (often Redis) holding each client's count, updated by every server.
- **Local counter**: a count kept in each server's own memory.
- **Atomic operation**: a read-modify-write the store performs as one indivisible step (INCR, a Lua script).
- **Race condition**: two servers reading the same old count and both allowing a request.
- **Sync interval**: how often local counters report to and learn from the shared total.
:::

## The problem in plain words

A rate limiter on one server is easy. But an API runs on many servers behind a load balancer, and one user's requests land on all of them. If each server counts only what it sees, a user limited to 100 per minute could make 100 per minute *per server*. The servers have to share counts, and every way of sharing trades accuracy against latency and against what happens when the shared store is slow or down.

:::eli5
Ten ticket booths sell tickets for one concert with a limit of 2 per person. If each booth only remembers its own sales, a person can buy 2 at every booth. The booths can phone a central desk for every sale (accurate but slow), or each keep a tally and compare notes every few minutes (fast, but someone could slip a few extra tickets in between).
:::

## Approaches

**1. Central store with atomic operations.** Every gateway asks Redis (or a dedicated rate-limit service) on every request: `INCR`/token-bucket update in a Lua script, so the check-and-update is atomic (no races). Accurate; costs a network round trip (~0.5–1 ms) per request and makes the store a dependency on the hot path. Shard by client key to scale the store; keep a local cache of "this client is over the limit" to avoid asking again during the block.

**2. Local counters with periodic sync.** Each gateway counts locally and every second or so pushes its deltas to the shared store and pulls the global total. Decisions are made locally (no extra latency); the limit can be exceeded by up to (number of servers × requests in one sync interval) during bursts. Good enough for most API protection.

**3. Split the budget.** Give each of N servers a slice of the limit (limit / N). No coordination at all; unfair and inaccurate when traffic is uneven across servers, and awkward when N changes.

**4. Sticky routing.** Route each client (by API key hash) to the same limiter instance, so one machine sees all its requests and counts locally. Accurate and fast, but needs consistent-hashing routing and handling of instance failures.

Step through the central and local approaches:

[[widget:seq-rl-distributed]]

## Failure behaviour

If the rate-limit store is slow or down, the gateway must not wait: use a tight timeout (a few ms) and **fail open** (allow) for general limits, so a limiter outage doesn't become a product outage; **fail closed** for security limits. Keep a local fallback limit (generous) so a total store outage still bounds abuse.

## Multiple regions

A global limit across regions faces cross-region latency on every check. Common answers: per-region limits (split the budget by region's traffic share), or local enforcement with asynchronous global reconciliation, accepting overshoot during bursts.

## Interview angles

- "Hundreds of gateways, 100 requests/min per user: how?" Redis with an atomic Lua token bucket keyed by user, sharded; or local counters synced every second if a little overshoot is fine.
- "How much latency does the limiter add?" A round trip to the store; reduce with local caching of blocked clients and pipelining, or local-first counting.
- "What if Redis is down?" Short timeout, fail open (with a local fallback cap) for general limits.

--- revise
? Why does per-server counting fail? :: A user's requests are spread across servers, each allowing the full limit.
? Central store approach and cost? :: Atomic INCR/Lua token bucket in Redis per request: accurate, +1 round trip, a hot-path dependency.
? Why must the central update be atomic? :: Otherwise two servers read the same count and both allow (race).
? Local counters + sync trade-off? :: No added latency; overshoot up to servers × requests per sync interval.
? Sticky routing? :: Hash each client to one limiter instance so counting is local and exact.
? Limiter store down? :: Short timeout; fail open (with a generous local cap) for general limits, closed for security limits.
? Global multi-region limit? :: Split budget per region or enforce locally with async reconciliation.

--- notes
## Options
Central atomic store (Redis INCR/Lua, sharded by key): accurate, +RTT, dependency; cache "blocked" locally.
Local counters + periodic sync: zero added latency; bounded overshoot.
Split budget limit/N: no coordination; unfair under uneven traffic.
Sticky routing by key hash: exact local counting; needs consistent routing and failover.
## Failure
Few-ms timeouts; fail open + local fallback cap (general); fail closed (security).
## Multi-region
Per-region budgets or local enforcement + async global reconciliation.
## Latency
Pipelining, local caching of decisions, local-first counting.

## Remember
Atomicity: INCR returns the new value; Lua scripts make token buckets atomic.
Cache "blocked until T" locally after a rejection.
Hot keys: borrow tokens from the store in batches.
Overshoot of local counting ≈ servers × requests per sync interval.
--- doubts
Q: Is Redis fast enough to sit on every request?
A: Usually: a single Redis instance handles 100k+ simple operations per second with sub-millisecond latency in the same data centre, and you can shard by client key. The concern is less speed than dependency: if Redis is slow, every request is slow, which is why timeouts and fail-open behaviour matter.

Q: How much can local counters overshoot?
A: At most roughly (number of servers × the requests each can accept for that client during one sync interval). With 50 servers, a 1-second sync and a client spreading a burst evenly, the overshoot could be large for a strict limit; for coarse protection limits it's usually acceptable. Shorter sync intervals or sticky routing reduce it.

Q: Do big companies build their own distributed rate limiters?
A: Many use the gateway's built-in support (Envoy's global rate-limit service backed by Redis, cloud API gateways), and large ones build dedicated services with sharded counters and local caches. The interview point is the trade-off, not a product name.

--- exercises
[design] 200 gateway instances, per-API-key limit of 1,000 requests/minute, latency budget for the check under 1 ms at p99. Design it.
A: Redis cluster sharded by API key holding a token bucket per key, updated by an atomic Lua script; gateways pipeline the call and use a 2 ms timeout. To keep p99 under budget and protect Redis: cache "key is blocked until T" locally after a rejection, and for very hot keys use local token buckets that borrow tokens from Redis in batches (e.g. take 50 tokens at a time). Fail open with a local fallback limit if Redis times out.

[estimate] 100 servers count locally and sync every 2 s. A client with a 600/min limit sends 30 requests/s spread evenly across all servers. How much can it exceed the limit before the sync catches it?
A: In one 2-second sync interval the client sends 60 requests total, which each server sees as 0.6 requests: no server notices anything. After syncing, the global count reflects reality, so overshoot is bounded by about one interval's worth of traffic (~60 requests) beyond the limit per sync period, if the limit was already exhausted. Small here; it grows with burst size and sync interval.

[break] A team's rate limiter reads the count from Redis, compares it in application code, then writes count + 1. Under load, clients exceed their limits. Why?
A: The read-compare-write is not atomic: concurrent requests on different gateways read the same count and all decide to allow. Use an atomic operation (INCR and compare the returned value, or a Lua script implementing the token bucket).

--- pitfalls
- Per-server limits for per-user quotas
- Non-atomic read-then-write against the shared store
- No timeout on the limiter call (its slowness becomes yours)
- Failing closed on general traffic when the store is down
- Strict global limits across regions without accepting latency

--- quiz
Q: Why must a central rate-limit update be atomic?
- For encryption
- *Otherwise concurrent servers read the same count and all allow requests
- To save memory
- To support 429 responses
W: Races let clients exceed limits.
Q: Local counters with periodic sync trade…
- Memory for CPU
- *A bounded overshoot for zero added latency
- Accuracy for higher latency
- Nothing
W: Decisions are local; the global view lags.
Q: When the limiter's store is down, a general API should usually…
- Reject everything
- *Fail open, with a generous local fallback cap
- Wait for the store
- Restart
W: Don't turn a limiter outage into a product outage.
Q: Sticky routing helps rate limiting because…
- It encrypts keys
- *All of a client's requests reach one instance, which can count exactly
- It removes the need for limits
- It caches responses
W: Local counting becomes accurate.

--- sources
- article :: Envoy global rate limiting :: Envoy Proxy :: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting
- article :: Rate limiting with Redis (patterns) :: Redis :: https://redis.io/glossary/rate-limiting/
- article :: How we built rate limiting capable of scaling to millions of domains :: Cloudflare :: https://blog.cloudflare.com/counting-things-a-lot-of-different-things/
- article :: Scaling your API with rate limiters :: Stripe :: https://stripe.com/blog/rate-limiters

=== load-shedding
blurb: What to do when demand exceeds capacity: why overloaded systems collapse rather than slow down, retry storms and how retry budgets prevent them, load shedding and prioritisation, admission control, backpressure, and graceful degradation.
signals: Traffic spikes beyond capacity | Latency explodes and error rates climb during an incident | Retries make an outage worse | Deciding what to drop first
widgets: retry-storm
prereq: queueing

--- lesson
:::words
- **Overload**: more work arriving than a system can complete.
- **Goodput**: useful work completed (requests that succeed in time), as opposed to raw throughput.
- **Load shedding**: deliberately rejecting some requests early so the rest succeed.
- **Admission control**: deciding at the door whether to accept a request.
- **Retry budget**: a cap on retries as a share of normal traffic (for example 10%).
- **Graceful degradation**: turning off non-essential features to keep the core working.
- **Brownout**: deliberately reducing quality (fewer results, no recommendations) to save capacity.
:::

## The problem in plain words

A system at 120% of capacity doesn't serve 100% and turn away 20%. Without protection, queues grow, every request waits longer, clients time out and **retry**, which adds even more load, and soon almost nothing succeeds: **congestion collapse**. Goodput falls to near zero while servers are busier than ever. Protecting against overload means rejecting work **early and cheaply**, retrying **carefully**, and choosing **what** to drop.

:::eli5
A restaurant with 50 seats and 80 people queueing. If the staff try to serve everyone at once, every meal is late, people walk out after ordering (wasted cooking), and their friends come in to try again. Better: tell 30 people at the door "sorry, full tonight, try at 9", and serve the other 50 well.
:::

## How retries turn overload into collapse

Run the simulation: push load past capacity, then compare naive retries, retries with backoff and a budget, and load shedding:

[[widget:retry-storm]]

- Every timed-out request that is retried counts again. With 3 retries per request, a backend at its limit can see up to 4× the traffic exactly when it is least able to handle it.
- Retries at **every layer** multiply: 3 retries at the client × 3 at the gateway × 3 at the service = up to 27 attempts for one user action.
- Fixes: retry only **idempotent** operations on **retryable** errors; **exponential backoff with jitter**; a **retry budget** (retries ≤ ~10% of requests per client, as Google's SRE book recommends; stop retrying when the budget is spent); retry at **one layer** only; honour `Retry-After`.

## Load shedding

When a server is near capacity, reject excess requests **immediately** with a cheap error (503 or 429 with Retry-After) instead of queueing them to time out later. Signals to shed on: concurrency (in-flight requests above a limit), queue length or queue wait time, CPU. Techniques:
- **Bounded queues** with short maximum wait; drop requests that have waited too long (their clients have given up).
- **Deadline propagation**: don't start work whose deadline has already passed.
- **LIFO under overload** (serving the newest requests first) can beat FIFO, because old requests' clients have likely timed out.
- **Adaptive concurrency limits** (like TCP congestion control for servers, e.g. Netflix's concurrency-limits) find the limit automatically from latency.

## Prioritisation and degradation

Not all requests are equal. Classify by criticality (Google uses classes like CRITICAL_PLUS, CRITICAL, SHEDDABLE_PLUS, SHEDDABLE) and shed the least critical first: drop background syncs and prefetches before user-facing reads, reads before checkouts. Degrade features: serve cached or stale results, skip personalisation, return fewer results, disable expensive features (a brownout), rather than failing the whole page.

## Backpressure

In pipelines and service chains, a slow downstream should push back on its upstream (bounded queues that block or reject, reduced concurrency, 429s) so work doesn't pile up in memory somewhere in the middle. Backpressure propagates overload information toward the edge, where shedding is cheapest.

## Interview angles

- "Traffic doubles suddenly. What happens?" Without protection: queueing, timeouts, retry storm, collapse. With: admission control and shedding at the edge, prioritisation, degradation, autoscaling behind it.
- "How do you stop retry storms?" Backoff + jitter, retry budgets, one retrying layer, idempotency, Retry-After.
- "What do you drop first?" Sheddable background and low-priority traffic; degrade non-core features; protect critical user paths.

--- revise
### Collapse
? Congestion collapse? :: Under overload, queueing, timeouts and retries drive goodput toward zero while servers stay busy.
? How do retries amplify overload? :: Each timeout re-adds load; retries at several layers multiply (3×3×3 = 27 attempts).
? Retry hygiene? :: Idempotent + retryable errors only; exponential backoff with jitter; retry budget (~10%); one layer; honour Retry-After.

### Shedding
? Load shedding? :: Rejecting excess requests early and cheaply so the rest succeed.
? Shedding signals? :: In-flight concurrency, queue length or wait time, CPU.
? Why drop requests that waited too long? :: Their clients have probably given up; serving them wastes capacity.
? Deadline propagation's role? :: Don't start work whose deadline has passed.

### Priorities
? What to shed first? :: Least critical classes: background, prefetch, sheddable work before user-critical paths.
? Graceful degradation examples? :: Stale/cached results, no personalisation, fewer results, disable expensive features (brownout).
? Backpressure? :: Slow downstreams push back (bounded queues, 429s) so overload surfaces at the edge.

--- notes
## Collapse
Overload → queues → timeouts → retries → more load → goodput ≈ 0.
Layered retries multiply (3³ = 27).
## Retries
Idempotent ops, retryable errors only.
Exponential backoff + full jitter.
Retry budget ≈ 10% of requests (Google SRE); circuit-break when exceeded.
Retry at one layer; honour Retry-After.
## Shedding
Reject early with 503/429 + Retry-After.
Signals: concurrency, queue wait, CPU.
Bounded queues; drop stale requests; deadlines; LIFO under overload; adaptive concurrency limits.
## Priorities
Criticality classes (Google: CRITICAL_PLUS … SHEDDABLE); shed lowest first.
Degrade: cached/stale, no personalisation, fewer results, brownouts.
## Backpressure
Bounded queues block/reject; reduce concurrency; push overload to the edge.
Autoscaling helps over minutes, not seconds.

--- doubts
Q: Isn't rejecting requests always worse than serving them slowly?
A: Not under overload. Serving everything slowly means most requests exceed their clients' timeouts, so the work is wasted and clients retry. Rejecting a fraction quickly keeps latency low for the rest, so more requests succeed in total (higher goodput), and rejected clients get a clear signal to back off.

Q: Why does jitter matter for retries?
A: Without it, clients that failed at the same moment retry at the same moments (after exactly 1 s, 2 s, 4 s), creating synchronised waves that hit the recovering service together. Random jitter spreads retries out, turning spikes into a smooth trickle.

Q: Can autoscaling replace load shedding?
A: No. Adding capacity takes minutes (and stateful tiers barely scale quickly), while overload can arrive in seconds. Shedding protects the system during the gap and against demand beyond any reasonable capacity; autoscaling raises capacity behind it.

Q: Where should shedding happen?
A: As early as possible: at the load balancer or gateway (cheapest to reject there), and again inside each service for its own protection. Rejecting after doing half the work wastes capacity.

--- exercises
[estimate] A service handles 10,000 req/s at capacity. Traffic jumps to 12,000 req/s; requests that time out are retried up to 3 times immediately. Roughly what load can the service see, and what happens?
A: Initially 12,000 req/s; 2,000/s can't be served in time and time out; each retries up to 3 times, so offered load can climb toward 12,000 + 3 × (all failing requests), easily 20,000–40,000 req/s as more requests time out under the growing queue. Goodput collapses. With backoff, a 10% retry budget and shedding the excess 2,000 req/s early, the service keeps serving ~10,000 req/s successfully.

[design] During a spike, a shopping site must keep checkout working. Write the degradation plan.
A: Classify traffic: checkout and payment = critical; product pages and search = important; recommendations, reviews widgets, analytics beacons, prefetching = sheddable. Under pressure: first disable recommendations and personalisation (serve a cached generic list), drop analytics beacons, reduce search result counts; then shed a share of anonymous browsing with a "busy, try again" page; keep reserved capacity (separate pools or priority queues) for checkout. Edge load shedding uses concurrency limits per class.

[break] Three layers (mobile app, API gateway, service) each retry failed calls 3 times. The database has a 30-second blip. Afterwards, the service is down for 20 minutes. Explain.
A: Each failing user action generates up to 4 × 4 × 4 = 64 attempts at the database layer. When the database recovers, it's hit by a flood of retries (plus normal traffic), overloads again, causes more timeouts and retries: a self-sustaining retry storm. Fix: retry at one layer with backoff and jitter, retry budgets, circuit breakers, and load shedding at the service.

--- pitfalls
- Unbounded queues in front of overloaded services
- Immediate retries without backoff or jitter
- Retries at every layer
- Treating all traffic as equally important
- Relying on autoscaling to absorb second-scale spikes

--- quiz
Q: Under overload, why is serving everything slowly worse than rejecting some?
- Rejections are free
- *Slow responses exceed client timeouts, wasting work and triggering retries
- Servers stop working
- It isn't worse
W: Goodput collapses when work finishes too late to matter.
Q: A retry budget limits…
- Requests per user
- *Retries to a small fraction (≈10%) of normal requests
- The number of servers
- Response size
W: It prevents retries from amplifying overload.
Q: Jitter in retry delays prevents…
- Duplicates
- *Synchronised waves of retries hitting at the same moments
- Timeouts
- Rate limiting
W: Randomness spreads retries out.
Q: What should be shed first?
- Checkout requests
- Login
- *Background and sheddable traffic like prefetches and analytics
- Health checks
W: Protect critical user paths by dropping low-priority work.

--- sources
- book :: Site Reliability Engineering, ch. 21 (Handling Overload) and ch. 22 (Addressing Cascading Failures) :: Google :: https://sre.google/sre-book/handling-overload/
- article :: Using load shedding to avoid overload :: Amazon Builders' Library (David Yanacek) :: https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/
- article :: Timeouts, retries and backoff with jitter :: Amazon Builders' Library (Marc Brooker) :: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- article :: Performance Under Load (adaptive concurrency limits) :: Netflix Technology Blog :: https://netflixtechblog.medium.com/performance-under-load-3e6fa9a60581
