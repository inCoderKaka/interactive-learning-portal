=== d-load-balancer
title: Design a load balancer
topic: load-balancing
tier: 2
est: 45
prompt: Design a load balancer that sits in front of a pool of web servers, spreads traffic well, survives its own failures, and stops sending traffic to servers that break.
--- words
- **Load balancer**: the front door that receives every request and picks a server to handle it.
- **L4 vs L7**: balancing by network connection only (fast, can't see URLs) vs by HTTP request (can route by path, header, cookie).
- **Health check**: a regular test request to each server; failing servers are taken out of rotation.
- **Session affinity (sticky sessions)**: sending one user's requests to the same server.
- **Virtual IP / anycast**: one address that can move between load balancer machines, or be announced from many places.
- **Connection draining**: letting in-flight requests finish before removing a server.
--- flow
1. **0–5**: L4 or L7? traffic volume, protocols (HTTP, WebSocket, gRPC), TLS termination, sticky sessions, how fast unhealthy servers must be removed.
2. **5–10**: e.g. 1 M requests/s, 50 k new connections/s, 500 backend servers.
3. **10–15**: configuration API (pools, rules, health checks), data plane vs control plane.
4. **15–25**: anycast/VIP → L4 tier (ECMP, consistent hashing) → L7 proxies → backends; health checker; config service.
5. **25–40**: algorithms (round robin, least connections, power of two choices), health checking without flapping, the LB's own high availability, connection draining, sticky sessions.
6. **40–45**: monitoring, failure modes, global extension.
--- req
**Functional**: spread HTTP(S) traffic across a pool; route by path/host (L7); terminate TLS; health-check backends and remove bad ones; support WebSockets and long requests; drain servers for deploys.

**Non-functional**: adds under ~1 ms; survives the loss of any LB machine without dropping much traffic; scales to millions of requests per second; config changes apply in seconds.
--- est
- **Traffic**: 1 M requests/s, 50 k new TLS connections/s (TLS handshakes are the CPU cost: maybe 5–10 k/s per core with modern hardware → ~10 cores just for handshakes, plus headroom).
- **L7 proxies**: one proxy handles ~50–100 k requests/s → ~20 proxies + spare for failure.
- **Backends**: 500 servers; health checks every 2 s from each proxy = 20 × 500 / 2 = 5,000 checks/s on the backends: use a shared health-check service or randomised subsets.
--- api
- Control plane: `PUT /pools/{id} {backends[], algorithm, health_check: {path, interval, unhealthy_after, healthy_after}}`, `PUT /routes {host, path_prefix → pool}`, `POST /pools/{id}/drain {backend}`.
- Data plane: the proxies pull configuration (versioned) and apply it without restarts.
--- hl
1. Clients resolve the service name to a **virtual IP** announced by several L4 machines (anycast/ECMP), so any of them can take a connection.
2. The **L4 tier** forwards each connection to an L7 proxy using consistent hashing on the connection tuple (so connections survive L4 machine changes).
3. **L7 proxies** terminate TLS, match routes, pick a backend with the pool's algorithm, and forward (keeping connection pools to backends).
4. A **health checker** (active probes + passive signals from real traffic errors) marks backends up/down; proxies get updates within seconds.
5. A **config service** stores pools and routes; proxies watch it and hot-reload.
--- deep
**1. Algorithms**: round robin is fine for uniform requests; least connections or least-outstanding-requests handle uneven request costs; **power of two choices** (pick two at random, send to the less loaded) gets near-optimal balance with stale information and no herding.

**2. Health checking without flapping**: require several consecutive failures before removal and several successes before return; combine active checks with passive outlier detection (5xx/timeout rates); never remove more than a safe fraction of the pool at once (panic threshold: if most servers look unhealthy, the checker is probably wrong).

**3. The LB's own availability**: no single machine: many L4 machines share the VIP via ECMP/anycast; L7 proxies are stateless and replaceable; consistent hashing at L4 keeps most connections on the same proxy when one is added or removed.

**4. Draining**: on deploy, mark a backend draining: no new requests, existing ones finish (with a timeout); WebSockets get a close message to reconnect elsewhere.

**5. Sticky sessions**: cookie- or hash-based affinity when servers keep local state; better to make servers stateless and keep sessions in a shared store.
--- wrap
**Failures**: a proxy dies → L4 hashing moves its connections to others; health checker wrong → panic threshold keeps serving; config bad → versioned config with canary rollout and rollback.

**Monitoring**: requests/s, latency added, backend error rates, health state changes, connection counts, TLS handshake rate.

**Global**: the same pattern per region behind GeoDNS/anycast (global load balancing page).
--- variants
Q: Only TCP traffic (a database proxy)
A: L4 only: connection-level balancing, no request routing; long-lived connections make least-connections and connection draining important.
Q: gRPC with long-lived HTTP/2 connections
A: One connection carries many requests, so L4 balancing makes load uneven: balance per request at L7, or client-side load balancing with periodic reconnection.
Q: Global users in five regions
A: GeoDNS or anycast to the nearest healthy region, then this design inside each region.
--- steer
Q: Which algorithm and why?
A: Depends on request cost variance: round robin, least outstanding requests, or power of two choices; explain herding with stale data.
Q: A backend is slow but not dead.
A: Passive outlier detection on latency/errors, ejection with backoff, panic threshold.
Q: The load balancer itself is a single point of failure.
A: VIP/anycast across many L4 machines, stateless L7 proxies, consistent hashing for connection stability.
Q: How do you deploy backends without dropping requests?
A: Draining with timeouts, readiness checks before adding back.
--- pitfalls
- One load balancer machine with no failover
- Removing servers after a single failed check
- Round robin for wildly uneven request costs
- Sticky sessions instead of stateless servers
- Ignoring TLS handshake cost in capacity
--- level
- **L4**: algorithms, health checks, redundancy of the LB.
- **L5**: L4/L7 layering with ECMP and consistent hashing, power of two choices, anti-flapping and panic thresholds, draining, config control plane.
- **L6**: global traffic management, capacity planning for TLS, multi-tenant LB as a platform.
--- nodes
client|Clients|client|0|160|Resolve the service name and connect to the virtual IP.
l4|L4 tier (ECMP / anycast)|edge|200|160|Many machines share the VIP; consistent hashing picks an L7 proxy.
l7|L7 proxies|service|400|160|Terminate TLS, route by host/path, pick a backend.
pool|Backend pool|service|620|160|Application servers.
hc|Health checker|worker|400|300|Active probes + passive signals; marks backends up/down.
cfg|Config service|db|400|20|Pools, routes, health settings; proxies watch it.
--- edges
client>l4|connect
l4>l7|forward connection
l7>pool|request
hc>pool|probe
hc~l7|health updates
cfg~l7|config
--- prereqs
l4-l7, lb-algorithms, lb-health
--- paths
- [deep] Which balancing algorithm? :: Round robin vs least outstanding requests vs power of two choices; herding with stale data.
  - Requests vary from 1 ms to 2 s :: Least outstanding requests or power of two choices.
- [deep] A backend is slow but passes health checks :: Passive outlier detection on latency/errors; ejection with backoff.
  - Half the backends fail checks at once :: Panic threshold: the checker is probably wrong; keep serving all.
- [failure] A load balancer machine dies :: VIP/anycast across many L4 machines; consistent hashing keeps most connections.
- [deep] Deploy backends without dropping requests :: Draining with timeouts; readiness before re-adding.
- [variation] gRPC with long-lived connections :: Per-request L7 balancing or client-side balancing with reconnection.
- [variation] Users in five regions :: GeoDNS/anycast to the nearest healthy region, then this design per region.

=== d-api-gateway
title: Design an API gateway
topic: load-balancing
tier: 2
est: 45
prompt: Design the API gateway in front of a company's microservices: one public entry point that routes requests, authenticates callers, applies rate limits, and protects services, for millions of requests per second.
--- words
- **API gateway**: the single front door for external API calls that routes each request to the right internal service.
- **Cross-cutting concerns**: things every API needs (authentication, rate limiting, logging) that the gateway does once instead of each service.
- **Routing table**: rules mapping paths/hosts/versions to services.
- **Token validation**: checking a request's credential (a JWT or API key) before letting it in.
- **Circuit breaker**: stopping calls to a failing service for a while so it can recover.
- **BFF (backend for frontend)**: a gateway layer tailored to one client type (mobile vs web).
--- flow
1. **0–5**: which concerns live in the gateway (routing, auth, rate limits, quotas, transformations, logging)? Public only or internal too? Latency budget?
2. **5–10**: 1 M requests/s, 300 services, < 5 ms added p99.
3. **10–15**: route config, API keys/clients, policies per route.
4. **15–25**: L4/L7 load balancers → stateless gateway fleet (plugin chain) → services; control plane distributing config; side stores for keys and rate limits.
5. **25–40**: auth without a database hit per request, rate limiting, protecting services (timeouts, retries, breakers), config rollout, avoiding the gateway becoming a monolith.
6. **40–45**: failures, observability, multi-region.
--- req
**Functional**: route by host/path/version; authenticate (OAuth tokens, API keys) and pass identity downstream; per-client rate limits and quotas; request/response transformations (small); TLS termination; logging and metrics per route.

**Non-functional**: < ~5 ms added p99; highly available (the gateway down = everything down); config changes live in seconds without restarts; one misbehaving service must not take others down.
--- est
- 1 M requests/s at ~50 k per gateway instance → ~20 instances + spare.
- Token validation: JWT signature checks are CPU work (~10–50 µs each); fine. API-key lookups: cache keys in memory (10 M keys × 200 B = 2 GB, sharded or partially cached).
- Rate-limit state: see the rate limiter design: a Redis cluster or local buckets with leasing.
--- api
- Control plane: `PUT /routes {match: {host, path, method}, service, timeouts, retries, auth: required|optional, rate_limit_policy}`; `POST /clients` (API keys, quotas).
- Data plane: gateways pull versioned config and swap atomically.
--- hl
1. Requests arrive via the load balancers to a **stateless gateway fleet**.
2. Each request runs a **filter chain**: TLS → route match → authentication (validate JWT with cached public keys, or look up API key in a local cache backed by a key store) → rate limiting → request transformation → proxy to the service (with timeout, retry policy and circuit breaker) → response filters → logging/metrics (async).
3. Identity and request IDs are passed downstream in headers; services trust only headers set by the gateway (stripped from external input).
4. A **control plane** validates and distributes config; changes roll out gradually to gateway instances.
--- deep
**1. Auth without a lookup per request**: JWTs validated locally with cached signing keys (JWKS refreshed periodically); API keys cached in memory with short TTLs and revocation pushes.

**2. Protecting services**: per-route timeouts and retry budgets (retry only idempotent calls), circuit breakers per service, concurrency limits so one slow service can't exhaust gateway resources (bulkheads), load shedding by priority.

**3. Config safety**: config is code: validated, versioned, rolled out to a canary subset of gateways first; instant rollback. A bad route config is a common outage cause.

**4. Not becoming a monolith**: keep business logic out; plugins limited to cross-cutting concerns; aggregation endpoints belong in BFF services owned by product teams.

**5. Observability**: request IDs, distributed tracing headers started at the gateway, per-route metrics.
--- wrap
**Failures**: gateway instance dies → LB removes it; key store down → cached keys keep working; rate-limit store down → fail open with local limits; bad config → canary catches it, rollback.

**Multi-region**: gateways in every region; global LB in front; config replicated.
--- variants
Q: A service mesh instead of a central gateway
A: Sidecar proxies handle service-to-service concerns (mTLS, retries, metrics) internally; an edge gateway still handles external traffic.
Q: GraphQL gateway aggregating many services
A: The gateway resolves queries by calling several services: query cost limits, batching (dataloader), caching per field.
Q: Internal-only gateway for partner APIs with SLAs
A: Per-partner quotas and SLAs, contract versioning, usage metering for billing.
--- steer
Q: How do you authenticate a million requests a second?
A: Local JWT validation with cached keys; cached API keys with revocation pushes.
Q: One backend service becomes slow.
A: Timeouts, retry budgets, circuit breakers, per-service concurrency limits (bulkheads).
Q: A config change breaks routing.
A: Versioned config, validation, canary rollout to a subset of gateways, rollback.
Q: Should the gateway combine data from five services for the mobile app?
A: Prefer a BFF service owned by the app team; keep the gateway to cross-cutting concerns.
--- pitfalls
- A database lookup per request for auth
- Retrying non-idempotent calls
- No isolation between services in the gateway
- Business logic piling into the gateway
- Global config pushes without canaries
--- level
- **L4**: routing, auth, rate limiting, logging in a gateway behind load balancers.
- **L5**: filter chain with latency budget, local token validation, timeouts/retries/breakers/bulkheads, safe config rollout, BFF boundary.
- **L6**: platform ownership model, mesh vs gateway strategy, multi-region policy and quotas as a product.
--- nodes
client|API clients|client|0|160|Mobile apps, web, partners.
lb|Load balancers|edge|180|160|Spread traffic across gateway instances.
gw|Gateway fleet (filter chain)|service|380|160|Auth, rate limits, routing, timeouts, breakers.
keys|Key / token store|db|380|20|API keys and signing keys, cached in gateways.
rl|Rate-limit store|cache|380|300|Shared counters (see rate limiter).
svc|Microservices|service|600|160|Receive identity and request IDs in headers.
cp|Control plane|service|600|20|Validates and rolls out route config.
--- edges
client>lb|HTTPS
lb>gw|request
gw>keys|cached lookups
gw>rl|allow?
gw>svc|proxy
cp~gw|config
--- prereqs
api-design, l4-l7, lb-health, api-gateway
--- paths
- [deep] Authenticate a million requests a second :: Local JWT validation with cached keys; cached API keys with revocation pushes.
  - A key is revoked :: Push revocations to gateways; short cache TTLs.
- [deep] One backend service gets slow :: Timeouts, retry budgets, circuit breakers, per-service concurrency limits.
  - Retries make it worse :: Retry only idempotent calls, with budgets and jittered backoff.
- [failure] A config change breaks routing :: Validated, versioned config; canary subset; rollback.
- [deep] Combine five services for the mobile home screen :: A BFF service owned by the app team; keep the gateway thin.
- [variation] Service mesh instead :: Sidecars for internal concerns; the edge gateway remains.
- [variation] GraphQL gateway :: Query cost limits, batching, per-field caching.

=== d-distributed-cache
title: Design a distributed cache (like Memcached / Redis Cluster)
topic: caching
tier: 2
est: 45
prompt: Design a distributed in-memory cache that many services use to keep hot data, handling millions of reads per second with sub-millisecond latency, and growing by adding machines.
--- words
- **Cache hit / miss**: the data was in the cache / had to be fetched from the database.
- **Eviction (LRU, LFU)**: removing entries when memory is full: least recently used, or least frequently used.
- **TTL**: how long an entry lives before it expires.
- **Sharding by key**: spreading keys across cache machines, usually with consistent hashing.
- **Hot key**: one key read so often that its single machine is overwhelmed.
- **Cache stampede**: many requests missing the same key at once and all hitting the database.
--- flow
1. **0–5**: get/set/delete with TTL, size limits, eviction; cache-aside usage; how consistent with the DB? replication needed?
2. **5–10**: 2 M reads/s, 200 k writes/s, 2 TB of hot data.
3. **10–15**: client library API, server data structures.
4. **15–25**: client-side consistent hashing → cache nodes (hash table + LRU) → optional replicas; config/membership service.
5. **25–40**: eviction internals, consistent hashing and adding nodes, hot keys, stampedes, replication and failover, consistency with the database.
6. **40–45**: monitoring, failures.
--- req
**Functional**: `get`, `set(key, value, ttl)`, `delete`, optional atomic increment; values up to ~1 MB; eviction when full.

**Non-functional**: sub-millisecond p99 in the same data centre; millions of ops/s; scale by adding nodes with minimal disruption; a node loss must not overload the database.
--- est
- 2 TB hot data ÷ ~64 GB usable per node ≈ **32 nodes**, plus headroom ≈ 40.
- 2 M reads/s ÷ 40 ≈ 50 k/s per node: comfortable (a node can do several hundred thousand simple ops/s).
- Network: 2 M × 1 KB = 2 GB/s across the fleet.
- Losing one node = 2.5% of keys miss → the database must absorb ~50 k extra reads/s briefly: decide whether that's survivable or replicas are needed.
--- api
- Client: `get(key)`, `mget(keys)`, `set(key, value, ttl)`, `delete(key)`, `incr(key)`.
- Node protocol: simple text/binary commands over persistent TCP connections; clients pool connections.
--- hl
1. Services use a **client library** that maps each key to a node with **consistent hashing** (virtual nodes) using the current membership list.
2. Each **cache node** keeps a hash table in memory plus an eviction structure (LRU list or approximate LRU/LFU), with a memory limit and per-entry TTL.
3. Optional **replica** per shard for high availability: writes go to the primary and are copied asynchronously.
4. A **membership/config service** (or gossip) tells clients which nodes exist; clients refresh and rehash.
5. Applications use **cache-aside**: read cache → on miss read DB → set cache with TTL; writes update the DB then delete the cache key.
--- deep
**1. Eviction internals**: an LRU needs a hash map plus a doubly linked list (O(1) moves); at scale approximate LRU (sample a few keys, evict the oldest: Redis) saves memory. Memory fragmentation matters: slab allocators (Memcached) group values by size class.

**2. Adding nodes**: consistent hashing moves only ~1/N of keys; they become misses, not errors. Warm up new nodes gradually, or add capacity at quiet times.

**3. Hot keys**: one celebrity key at 500 k reads/s overloads its node: replicate hot keys to several nodes (key#1..#8 picked randomly), or keep a tiny in-process cache in clients for seconds.

**4. Stampedes**: when a popular key expires, thousands miss together: request coalescing (one fetch per key, others wait), probabilistic early refresh, jittered TTLs.

**5. Consistency with the DB**: delete-on-write can race with a concurrent read that refills a stale value; use short TTLs, versioned values, or lease tokens (Facebook's memcache leases).

**6. Availability**: without replicas, a node loss sends its keys to the database; with replicas, promote the replica (async copy may miss recent sets: acceptable for a cache).
--- wrap
**Failures**: node down → clients route around (rehash or replica), DB absorbs misses with load shedding; network partition → clients may see different membership briefly (stale reads acceptable).

**Monitoring**: hit rate, evictions, memory use, latency, hot keys, connection counts.
--- variants
Q: A cache with persistence and rich data types (Redis)
A: Snapshots and append-only logs for persistence, data structures (lists, sorted sets), single-threaded event loop per shard; replication and cluster mode with hash slots.
Q: Cross-region cache
A: Caches are local per region; invalidations propagate via a change stream; never rely on cross-region cache consistency.
Q: Cache for a read-after-write user profile
A: After a user's own write, read from the DB (or a version check) so they see their change.
--- steer
Q: How do clients find the right node?
A: Consistent hashing with virtual nodes in the client library, using membership from a config service or gossip.
Q: A node dies.
A: Its keys miss to the DB (or replicas take over); size the DB or use replicas and shedding.
Q: One key gets 500 k reads a second.
A: Replicate hot keys across nodes or in-process caches with short TTLs.
Q: A popular key expires.
A: Request coalescing, early refresh, TTL jitter.
Q: Stale data after a write.
A: Delete-on-write races; TTLs, versions or leases.
--- pitfalls
- Modulo hashing (almost all keys move when a node is added)
- No plan for the DB load when a node fails
- Identical TTLs that expire together
- Updating the cache instead of deleting on write (race conditions)
- Ignoring hot keys
--- level
- **L4**: consistent hashing, LRU, TTL, cache-aside.
- **L5**: eviction internals and memory, hot keys, stampedes, delete-on-write races and leases, availability trade-offs with numbers.
- **L6**: multi-tenant cache platform, cost per GB vs DB load, cross-region invalidation.
--- nodes
app|Services (client library)|client|0|160|Consistent hashing over the current node list; cache-aside.
cfg|Membership / config|service|200|20|Tells clients which nodes exist.
n1|Cache node A|cache|420|80|Hash table + LRU + TTL.
n2|Cache node B|cache|420|240|Another shard.
rep|Replica (optional)|cache|640|80|Async copy for failover.
db|Database|db|200|320|Source of truth on misses.
--- edges
app>n1|get / set
app>n2|get / set
n1~rep|replicate
app>db|on miss
cfg~app|membership
--- prereqs
capacity-math, cache-patterns, cache-eviction, cache-failures, redis-memcached
--- paths
- [deep] How do clients find the right node? :: Consistent hashing with virtual nodes; membership from config or gossip.
  - Add five nodes during peak :: Only ~1/N keys move and miss; warm up gradually.
- [failure] A node dies :: Keys miss to the DB or replicas take over; size the DB or shed load.
- [deep] One key gets 500 k reads a second :: Replicate hot keys across nodes or keep in-process copies briefly.
- [deep] A popular key expires :: Request coalescing, early refresh, TTL jitter.
- [deep] Users see stale data after a write :: Delete-on-write races; TTLs, versioned values or leases.
- [variation] Persistence and data types (Redis) :: Snapshots and AOF, single-threaded shards, hash slots.

=== d-cdn
title: Design a content delivery network (CDN)
topic: caching
tier: 2
est: 45
prompt: Design a CDN that serves images, scripts and video segments for thousands of websites from servers close to users around the world, with fast cache hits, quick purges, and protection of the origin servers.
--- words
- **Edge (PoP)**: a point of presence: a group of cache servers in a city, close to users.
- **Origin**: the customer's own server that holds the original content.
- **Cache key**: what identifies a cached object (usually host + path + some headers).
- **TTL / Cache-Control**: how long an object may be served from cache, set by the origin's headers.
- **Purge (invalidation)**: removing an object from caches before its TTL expires.
- **Tiered caching (shield)**: a middle cache layer between edges and origin, so the origin sees one miss instead of one per edge.
--- flow
1. **0–5**: static content and video, many customers, global; purge speed; HTTPS for customer domains; DDoS.
2. **5–10**: 200 PoPs, 50 Tbit/s peak egress, billions of objects.
3. **10–15**: customer config (domains, origins, rules), cache key rules, purge API.
4. **15–25**: DNS/anycast routes users to nearest PoP → edge cache (memory + SSD) → regional shield → origin; control plane distributes config and purges.
5. **25–40**: routing users to the right PoP, cache hierarchy, cache keys and variants, purges at global scale, origin protection, TLS certificates.
6. **40–45**: failures, monitoring, cost.
--- req
**Functional**: serve customers' content via their domains (HTTPS); respect Cache-Control; purge by URL, prefix or tag within seconds; custom rules (cache keys, headers); logs and analytics per customer.

**Non-functional**: low latency (most users within ~20–30 ms of a PoP); high cache hit ratio; origin protection (few requests reach origins); highly available; DDoS resilient.
--- est
- 50 Tbit/s egress ÷ 200 PoPs ≈ 250 Gbit/s per PoP average (big cities more): dozens of servers per PoP with 25–100 Gbit NICs.
- Storage per PoP: hot set in RAM (hundreds of GB), long tail on SSD (hundreds of TB).
- Purges: thousands per second, each fanned out to 200 PoPs.
--- api
- `PUT /services/{id} {domains, origin, rules: [{match, cache_key, ttl_override}]}`; `POST /purge {urls|prefix|tags}` → `{purge_id, status}`; certificate management for customer domains (ACME).
--- hl
1. **Routing**: the customer domain points (CNAME) to the CDN; **anycast** or GeoDNS sends each user to a nearby healthy PoP.
2. In the PoP, a **load balancer** hashes the cache key to a specific cache server (so each object is stored once per PoP), which serves from RAM/SSD.
3. On a miss, the edge asks a **regional shield** cache; on a shield miss, the shield fetches from the **origin** with request coalescing.
4. A **control plane** distributes service configs and certificates to all PoPs, and fans purges out (pub/sub) with acknowledgements.
5. Logs stream back for analytics and billing.
--- deep
**1. Routing users**: anycast gives automatic nearest-PoP routing and DDoS spreading; GeoDNS allows finer steering (load, cost). Health and capacity feed both.

**2. Cache hierarchy**: edge → shield → origin turns N edge misses into 1 origin request; consistent hashing inside a PoP avoids duplicating objects across servers.

**3. Cache keys and variants**: normalise query strings, include only needed headers (Accept-Encoding, device class) via Vary; too many variants destroy hit ratio.

**4. Purges**: tag-based purges (surrogate keys) so a product update purges all its images; fast fan-out to PoPs (seconds); soft purge (mark stale, revalidate) protects the origin from a miss storm.

**5. Origin protection**: request coalescing, stale-while-revalidate, stale-if-error, rate limits to origins.

**6. Video**: segments are large and sequential; prefetch the next segments; range requests.
--- wrap
**Failures**: PoP down → anycast/DNS route to the next PoP; shield down → edges go to another shield or origin with limits; origin down → serve stale-if-error.

**Monitoring**: hit ratio per customer, latency, origin request rate, purge latency, egress per PoP.

**Cost**: bandwidth contracts and peering; place PoPs where traffic and peering are cheap; ISP-embedded caches for huge customers.
--- variants
Q: Dynamic, personalised pages
A: Cache only the shared parts (edge-side includes, or cache API responses with short TTLs); terminate TLS and keep warm connections to origin to cut latency even without caching.
Q: Video streaming for one huge customer
A: ISP-embedded appliances pre-filled overnight (like Netflix Open Connect).
Q: Run customer code at the edge
A: Sandboxed edge functions (isolates) with limits; deployment and state are the hard parts.
--- steer
Q: How does a user reach the nearest PoP?
A: Anycast or GeoDNS with health and capacity awareness.
Q: A new viral image: a million requests in a minute.
A: Coalescing at edge and shield; one origin fetch.
Q: A customer must remove an image everywhere now.
A: Purge fan-out via pub/sub with acknowledgements; tags for groups; soft purge to protect origin.
Q: The origin is down.
A: Serve stale-if-error; rate-limit retries to origin.
--- pitfalls
- Each edge server caching everything separately (no consistent hashing in the PoP)
- No shield tier, so origins get a miss per PoP
- Cache keys with every header or query parameter
- Hard purges that trigger miss storms
- Forgetting TLS for customer domains
--- level
- **L4**: edges near users, caching with TTLs, origin fallback, purge.
- **L5**: anycast vs GeoDNS, PoP-internal hashing, shield tier, cache keys and variants, tag purges, origin protection patterns.
- **L6**: peering and bandwidth economics, edge compute, multi-tenant isolation and DDoS absorption.
--- nodes
user|Users|client|0|160|Resolve the customer's domain; reach the nearest PoP.
pop|Edge PoP (LB + caches)|edge|200|160|Consistent hashing to one cache server; RAM + SSD.
shield|Regional shield|cache|420|160|One miss per region to the origin.
origin|Customer origin|ext|640|160|Original content and Cache-Control headers.
cp|Control plane|service|200|20|Configs, certificates, purge fan-out.
logs|Logs & analytics|store|200|320|Per-customer usage, billing.
--- edges
user>pop|GET (anycast)
pop>shield|miss
shield>origin|miss (coalesced)
cp~pop|config, purges
pop~logs|logs
--- prereqs
dns, global-lb, cache-patterns, cache-invalidation, cdn
--- paths
- [deep] Reach the nearest PoP :: Anycast or GeoDNS with health and capacity awareness.
- [deep] A viral image gets a million requests a minute :: Coalescing at edge and shield; one origin fetch.
  - Hit ratio is low :: Fix cache keys and variants; consistent hashing within PoPs; shield tier.
- [deep] Remove an image everywhere now :: Pub/sub purge fan-out with acknowledgements; tags; soft purge.
- [failure] The origin is down :: Serve stale-if-error; limit origin retries.
- [failure] A PoP goes dark :: Anycast/DNS reroute to the next PoP; capacity headroom.
- [variation] Dynamic personalised pages :: Cache shared fragments or short-TTL API responses; warm origin connections.

=== d-pastebin
title: Design Pastebin
topic: databases
tier: 1
est: 45
prompt: Design Pastebin: users paste text (code, logs), get a short link, and anyone with the link can read it; pastes can expire and can be private.
--- words
- **Paste**: a piece of text stored and shared by a link.
- **Metadata vs content**: small facts about the paste (owner, expiry, size) vs the text itself.
- **Object storage**: a cheap store for blobs such as the paste text.
- **Expiry**: automatic deletion after a time.
- **Read-heavy**: far more reads than writes.
--- flow
1. **0–5**: create, read, expire, private/unlisted, size limit (e.g. 10 MB), syntax highlighting. Accounts optional.
2. **5–10**: 1 M pastes/day ≈ 12/s, 100 reads per paste ≈ 1,200 reads/s; average 10 KB → 10 GB/day.
3. **10–15**: `POST /pastes`, `GET /{key}`; metadata table + content storage.
4. **15–25**: API → key generator → metadata DB + content in object storage (or the DB for small ones) → CDN/cache for reads → expiry cleanup.
5. **25–40**: where content lives, key generation, caching, expiry at scale, abuse.
6. **40–45**: failures, growth.
--- req
**Functional**: create a paste (text, optional title, language, expiry, visibility); read by link; delete by owner; raw view.

**Non-functional**: reads fast (< 100 ms); durable until expiry; read-heavy; links unguessable for private/unlisted pastes.
--- est
- Writes: 1 M/day ≈ **12/s** (peaks 10×).
- Reads: 100 M/day ≈ **1,200/s**.
- Storage: 10 KB average × 1 M/day = **10 GB/day ≈ 3.6 TB/year** of content; metadata ~500 B each ≈ 0.2 TB/year.
- These say: a single relational DB holds metadata for years; content belongs in object storage; caching handles reads.
--- api
- `POST /pastes {content, language?, expires_in?, visibility}` → `{key, url}`.
- `GET /{key}` → rendered page; `GET /raw/{key}` → text.
- `DELETE /pastes/{key}` (owner).

**Data**
- `pastes(key PK, owner_id, created_at, expires_at, visibility, size, content_ref, language)` in a relational DB, index on `expires_at`.
- Content in object storage at `pastes/{key}` (small pastes could live inline in the DB).
--- hl
1. Create: the API validates size, generates a **random key** (8 base62 chars), writes content to **object storage**, then the metadata row (insert-if-absent on the key).
2. Read: a CDN/edge cache handles popular public pastes; the API checks metadata (expired? visibility?), fetches content (cached in Redis/CDN), renders.
3. Expiry: an index on `expires_at` lets a cleanup job delete expired rows and objects in batches; reads also check expiry so cleanup lag doesn't leak content.
--- deep
**1. Content placement**: storing 10 MB texts in DB rows bloats the database and backups; object storage is cheap and durable; keep tiny pastes inline if it simplifies reads.

**2. Keys**: random 8-char base62 (2 × 10¹⁴ keys) with insert-if-absent; unguessable for unlisted pastes.

**3. Caching**: immutable content caches perfectly (long TTL keyed by key); metadata checks (expiry, deletion) need short TTLs or explicit invalidation on delete.

**4. Expiry at scale**: batch deletes via the expires_at index; object storage lifecycle rules as a backstop.

**5. Abuse**: rate limits per IP/account, malware/secret scanning (leaked API keys), takedown flow.
--- wrap
**Failures**: object storage is highly durable; DB replicated with failover; cache down → more DB/storage load, fine at this scale.

**Growth**: shard metadata by key when the DB grows; CDN for global reads.
--- variants
Q: GitHub Gist with versions and forks
A: Content-addressed versions (like git objects) with a version list per gist; forks copy references, not content.
Q: Shared clipboard that syncs instantly between a user's devices
A: Per-user channel with push (WebSocket) and short-lived entries.
--- steer
Q: Where does the paste text live?
A: Object storage (or inline when tiny); metadata in a relational DB.
Q: How are links generated?
A: Random base62 with insert-if-absent; long enough to be unguessable.
Q: Millions of pastes expire every day.
A: expires_at index with batched cleanup, lifecycle rules, and expiry checks on read.
Q: A paste goes viral.
A: CDN/edge cache for immutable content; short-TTL metadata.
--- pitfalls
- Large blobs in database rows
- Sequential, guessable keys for private pastes
- Relying only on a cleanup job to enforce expiry
- Over-engineering for 12 writes per second
--- level
- **L4**: metadata DB, content storage, key generation, cache.
- **L5**: justified placement with numbers, expiry design, cache invalidation on delete, abuse handling.
- **L6**: versioning/forking variants, cost and retention policy.
--- nodes
client|Browser / CLI|client|0|160|Creates and reads pastes.
cdn|CDN / cache|edge|200|160|Caches popular public pastes.
api|Paste API|service|400|160|Validation, keys, visibility and expiry checks.
db|Metadata DB|db|620|80|Keys, owners, expiry, visibility.
obj|Object storage|store|620|240|Paste content.
job|Expiry cleanup|worker|400|320|Batched deletes by expires_at.
--- edges
client>cdn|GET /key
cdn>api|miss
client>api|POST paste
api>db|metadata
api>obj|content
job>db|expired rows
job>obj|delete objects
--- prereqs
capacity-math, api-design, cache-patterns, sql-nosql, data-modeling
--- paths
- [deep] Where does the paste text live? :: Object storage (or inline when tiny); metadata in a relational DB; justify with numbers.
- [deep] How are links generated? :: Random base62 with insert-if-absent; unguessable length.
- [deep] Millions of pastes expire daily :: expires_at index with batched cleanup, lifecycle rules, expiry checks on read.
- [deep] A paste goes viral :: CDN/edge caching of immutable content; short-TTL metadata; purge on delete.
- [variation] Versions and forks (Gist) :: Content-addressed versions; forks reference content.
- [deep] People paste leaked API keys :: Secret scanning, rate limits, takedown flow.

=== d-comments
title: Design a comments system for a news site
topic: replication
tier: 2
est: 45
prompt: Design the comments section for a large news site: readers post comments and replies under articles, comments appear quickly, popular articles get huge read traffic, and people always see their own comment right after posting.
--- words
- **Read replica**: a copy of the database that serves reads, updated from the primary with a small delay.
- **Replication lag**: how far behind a replica is.
- **Read-your-writes**: a guarantee that you see your own write immediately, even if others see it a bit later.
- **Thread**: a comment with its replies (a tree).
- **Pagination**: loading comments a page at a time.
- **Moderation**: hiding spam and abuse.
--- flow
1. **0–5**: post, reply (nesting depth?), sort (newest, top), likes, moderation, real-time updates? Read-your-writes.
2. **5–10**: 50 M reads/day of comment sections, 500 k comments/day; popular articles get 10 k reads/s.
3. **10–15**: comments table keyed by article, thread structure, counters.
4. **15–25**: API → primary DB for writes, read replicas + cache for reads; moderation queue; counts asynchronous.
5. **25–40**: replication lag and read-your-writes, hot articles, threading and pagination, counts, moderation.
6. **40–45**: failures and growth.
--- req
**Functional**: post comments and replies (2–3 levels), sort by newest or top, like, report; moderators hide/remove; comment counts on article pages.

**Non-functional**: read-heavy; a user sees their own comment immediately; others within seconds; popular articles must not overload the database.
--- est
- Writes: 500 k/day ≈ 6/s (peaks on breaking news ~100/s).
- Reads: 50 M/day ≈ 600/s average, a hot article 10 k/s.
- Storage: 500 k × 1 KB ≈ 0.5 GB/day: a single relational primary with replicas suffices for years.
--- api
- `GET /articles/{id}/comments?sort=top&cursor=` → threads page.
- `POST /articles/{id}/comments {body, parent_id?}` → comment (with `version`/timestamp token).
- `POST /comments/{id}/like`, `POST /comments/{id}/report`.

**Data**: `comments(id, article_id, parent_id, root_id, author_id, body, created_at, score, status)`, index `(article_id, root_id, created_at)` and `(article_id, score)`; likes per (user, comment).
--- hl
1. Writes go to the **primary** DB; the response includes the new comment and a write timestamp/LSN.
2. Reads go to **read replicas** behind a **cache** (per article, first page cached for seconds).
3. Read-your-writes: the client keeps the last write token; reads include it, and the API routes to the primary (or a replica caught up to that LSN) for that user for a short time, or merges the user's own recent comments into the response.
4. A **moderation pipeline** (classifier + human queue) updates status; hidden comments are filtered at read.
5. Counts and scores update asynchronously (stream aggregation) to avoid hot-row contention.
--- deep
**1. Replication lag**: replicas may be 100 ms–seconds behind; a user posting then reloading must see their comment: route their reads to the primary or a sufficiently fresh replica using the write's LSN, or merge locally.

**2. Hot articles**: cache the first page per article and sort for a few seconds; coalesce misses; serve deeper pages from replicas.

**3. Threading**: store parent and root IDs; fetch top-level comments by page, then replies for those roots (limited, "show more replies").

**4. Top sort**: a score (likes with time decay) updated asynchronously; cursor pagination on (score, id).

**5. Counts**: per-article comment counts maintained asynchronously (or approximate) to avoid locking a hot row.
--- wrap
**Failures**: primary failover (replicas promoted; async replication may lose the last moments: acceptable or use semi-sync); replica lag spikes → route more reads to fresh replicas or primary with limits; cache down → replicas take load.

**Growth**: shard by article ID if write volume grows; regional read replicas.
--- variants
Q: Real-time comments while reading (live updates)
A: Push new comments over SSE/WebSocket per article (fan-out like live comments), batched.
Q: Reddit-style deep threads with voting
A: Deeper trees with collapse, vote-based hot ranking, materialised paths or closure tables for subtrees.
--- steer
Q: A user posts and reloads but can't see their comment.
A: Replication lag: read-your-writes via LSN-aware routing, primary reads for a short window, or merging own recent comments.
Q: A breaking-news article gets 10 k reads a second.
A: Short-TTL cache of the first page per sort, coalescing, replicas.
Q: How do you store and load reply threads?
A: parent and root IDs; page top-level, then replies per root.
Q: The comment count row is a bottleneck.
A: Asynchronous or approximate counts.
--- pitfalls
- Reading your own write from a lagging replica
- Locking a counter row on every comment
- Loading entire threads at once
- Offset pagination on a changing list
--- level
- **L4**: primary + replicas, cache, comments table, pagination.
- **L5**: read-your-writes strategies with LSNs, hot article caching, threading model, async counters and scores, moderation flow.
- **L6**: multi-region readers, live updates, moderation at scale with ML and human review.
--- nodes
reader|Readers|client|0|160|Read and post comments.
api|Comments API|service|200|160|Routes writes to primary, reads to cache/replicas.
cache|Per-article cache|cache|420|40|First page per sort, short TTL.
primary|Primary DB|db|420|160|All writes; returns LSN tokens.
replica|Read replicas|db|640|160|Lagging copies for reads.
mod|Moderation pipeline|worker|420|300|Classifier + human queue.
--- edges
reader>api|read / post
api>cache|first page
api>primary|writes, own-writes reads
api>replica|reads
primary~replica|replicate
primary~mod|new comments
--- prereqs
data-modeling, db-indexes, cache-patterns, leader-replication, session-guarantees
--- paths
- [deep] A user posts and reloads but can't see the comment :: Replication lag: LSN-aware routing, primary reads for a window, or merging own comments.
  - Which replica is fresh enough? :: Compare replica LSN with the user's write token.
- [deep] Breaking news: 10 k reads a second on one article :: Short-TTL cache per sort, coalescing, replicas.
- [deep] Store and load reply threads :: parent/root IDs; page top-level then replies.
- [deep] Sort by top without hot rows :: Async scores and counts; cursor pagination on (score, id).
- [failure] The primary fails :: Promote a replica; possible loss of the last moments with async replication; semi-sync if needed.
- [variation] Live comment updates while reading :: Push per article over SSE/WebSocket, batched.
