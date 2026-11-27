=== l4-l7
blurb: What a load balancer is, why every scalable system has one, and the big fork in the road: balancing at layer 4 (connections, by address and port) or at layer 7 (requests, reading the HTTP inside), with what each can see, do and cost.
signals: Any design with more than one server | Routing /api and /images to different services | Terminating TLS | Very high packet rates or non-HTTP protocols
widgets: l4-l7

--- lesson
:::words
- **Load balancer**: a component in front of a group of identical servers that spreads incoming traffic across them and stops sending to broken ones.
- **Backend (or upstream)**: one of the servers behind the load balancer.
- **Pool**: the group of backends that can serve a given kind of request.
- **Layer 4 (L4)**: the transport layer of the network model: TCP and UDP connections, identified by IP addresses and ports.
- **Layer 7 (L7)**: the application layer: the actual HTTP request, with its path, headers and cookies.
- **TLS termination**: decrypting HTTPS at the load balancer so it can read the request.
- **Proxy**: a server that receives a request and makes a new request on the client's behalf.
:::

## The problem in plain words

One server can only handle so much, and it will eventually crash or need restarting. So you run many identical copies. But clients need **one address** to talk to, and something must decide, for every connection or request, which copy handles it, while quietly avoiding copies that are dead or overloaded. That something is a load balancer. The big design question is **how much of the traffic it looks at**: just the envelope (who is talking to whom) or the letter inside (what is being asked).

:::eli5
A post room in a large office. A layer-4 sorter only reads the outside of each envelope: "for building B, door 3", and drops it in a tray, very fast. A layer-7 sorter opens the envelope, reads the letter ("this is an invoice"), and sends it to accounts, so it can sort far more cleverly, but it takes longer per letter and needs the key to open sealed ones.
:::

## What every load balancer does

- **One stable address** (an IP or a DNS name) in front of a changing set of servers. Servers come and go (deploys, failures, autoscaling) without clients noticing.
- **Distribution** of traffic by some algorithm (next page).
- **Health checking**: probing servers and removing unhealthy ones (the page after).
- **Removing single points of failure**: and therefore it must not become one itself. Load balancers run in redundant pairs or clusters, often behind anycast or a shared virtual IP.

## Layer 4: balancing connections

An L4 load balancer sees each packet's IP addresses and ports (and the protocol), and nothing else. When a new TCP connection arrives, it picks a backend, usually by hashing the connection's **5-tuple** (source IP, source port, destination IP, destination port, protocol), and then sends every packet of that connection to the same backend.

- **Fast and cheap.** Very little work per packet; can run at millions of packets per second per machine, often in software on commodity servers (Google's Maglev, described in a 2016 paper, is a famous example) or in network hardware.
- **Protocol-agnostic.** Works for anything over TCP or UDP: HTTP, gRPC, database protocols, game traffic, video.
- **Does not decrypt.** TLS passes straight through to the backends.
- **Blind to requests.** It cannot route `/api` and `/images` differently, cannot retry a failed HTTP request, and cannot balance individual requests inside one long-lived connection (an HTTP/2 or gRPC connection carrying thousands of requests goes to one backend for its whole life).
- **Direct server return** is a common trick: requests pass through the load balancer, but responses (usually much bigger) go straight from the backend to the client, so the load balancer only carries the small inbound half.

## Layer 7: balancing requests

An L7 load balancer is a full **reverse proxy**: it terminates the client's connection (including TLS), reads each HTTP request, chooses a backend, and sends the request over its own connection to that backend.

Because it can read the request, it can:

- **Route by content**: path (`/api/*` to the API pool, `/static/*` to static servers), host name, header or cookie (send users with `beta=1` to the canary pool).
- **Balance per request**, even within one long-lived HTTP/2 or gRPC connection.
- **Retry** a request on another backend if the first fails (only for idempotent requests).
- **Terminate TLS** once at the edge and keep warm connections to backends.
- **Add features**: compression, caching, authentication checks, rate limiting, request IDs and tracing headers, rewriting paths.

The cost: much more work per request (parsing HTTP, TLS cryptography, holding two connections), so more machines for the same traffic, and the load balancer must hold the TLS private keys. Typical examples are Envoy, NGINX, HAProxy, cloud "application load balancers" and Google's front ends (GFE).

Try routing a few requests through each kind and see what it can and cannot read:

[[widget:l4-l7]]

## Using both

Large systems layer them: an **L4 tier** at the very front spreads raw connections across a fleet of **L7 proxies**, which terminate TLS and route requests to services. L4 handles enormous packet rates and absorbs some attacks cheaply; L7 does the intelligent routing. Inside the system, service-to-service calls are often balanced at L7 by a sidecar proxy or by the client library itself (gRPC does client-side balancing).

## Choosing

| Need | Choose |
|---|---|
| Route by path, host, header or cookie | L7 |
| Per-request balancing of gRPC / HTTP/2 | L7 (or client-side balancing) |
| Retries, canaries, authentication, rate limiting at the edge | L7 |
| Non-HTTP protocols (database, MQTT, game UDP) | L4 |
| Millions of packets per second at the very front, cheap | L4 |
| End-to-end encryption to the backend without the LB holding keys | L4 (TLS passthrough) |

## What breaks

- **Long-lived connections pin load.** With L4 (or L7 per-connection), a client holding one HTTP/2 connection for hours sends everything to one backend; new backends get no traffic until clients reconnect. Fix: per-request L7 balancing, or periodically recycling connections (a maximum connection age).
- **The load balancer as a bottleneck.** L7 proxies doing TLS for huge traffic need many machines; size them like any other tier.
- **Losing the client's address.** A proxy makes a new connection, so backends see the proxy's IP. L7 adds `X-Forwarded-For`; L4 setups use the PROXY protocol or direct routing.
- **Single load balancer.** One instance is a single point of failure; run several, behind anycast or a floating IP with failover.

## Interview angles

- "L4 or L7 here?" Reason from what routing you need and the protocol.
- "Where does TLS terminate?" At the L7 tier near users, typically.
- "Why are new servers getting no traffic after a scale-up?" Long-lived connections pinned at L4; balance per request or cap connection age.

--- revise
### Basics
? Four jobs of every load balancer? :: One stable address, distribution, health checking, no single point of failure (run it redundantly).
? What does an L4 load balancer look at? :: IP addresses, ports and protocol only: it balances connections (often by hashing the 5-tuple).
? What does an L7 load balancer look at? :: The HTTP request itself (path, host, headers, cookies), after terminating TLS.

### Trade-offs
? Three things only L7 can do? :: Route by content, balance per request inside a long-lived connection, retry failed requests (also auth, rate limits, canaries).
? Three strengths of L4? :: Very fast and cheap, protocol-agnostic, no decryption needed.
? What is direct server return? :: Responses go straight from backend to client, bypassing the L4 balancer.
? Why do new backends get no gRPC traffic behind an L4 balancer? :: Existing long-lived connections stay pinned; balance per request or cap connection age.
? How do backends learn the client's IP behind a proxy? :: X-Forwarded-For (L7) or the PROXY protocol (L4).

--- notes
## Every load balancer
Stable address in front of changing servers.
Distributes traffic; health-checks backends.
Must itself be redundant (pairs, clusters, anycast, floating IP).
## L4
Sees IPs, ports, protocol; balances connections by 5-tuple hash.
Millions of packets/s; any TCP/UDP protocol; TLS passes through.
Cannot route by path, retry requests, or balance within one connection.
Direct server return: replies bypass the balancer. Example: Google Maglev (2016).
## L7
Reverse proxy: terminates client connection and TLS, reads HTTP.
Routes by path/host/header/cookie; per-request balancing; retries (idempotent only).
Adds compression, caching, auth, rate limits, tracing headers.
Costlier per request; holds TLS keys. Examples: Envoy, NGINX, HAProxy, GFE.
## Layering
L4 at the front → fleet of L7 proxies → services; sidecars or client-side balancing inside.
## Breakage
Long-lived connections pin load → per-request L7 or max connection age.
Client IP lost → X-Forwarded-For / PROXY protocol.

--- doubts
Q: Is a load balancer the same thing as a reverse proxy?
A: An L7 load balancer is a reverse proxy whose main job is spreading load. "Reverse proxy" is the broader term: any server that accepts requests on behalf of your servers (to add TLS, caching, compression, routing). Nginx, for example, is used as both. An L4 load balancer is usually not a proxy in this sense: it forwards packets rather than making new requests.

Q: If an L4 balancer can't see requests, how does it pick a server?
A: From the connection's addressing information: usually a hash of the source and destination IPs and ports, so all packets of one connection reach the same server, sometimes combined with simple weights or connection counts. Consistent-hashing variants (like Maglev hashing) keep most connections on the same backend when the set of backends changes.

Q: Doesn't decrypting at the load balancer make things less secure?
A: It moves where the plaintext exists, from the backend to the load balancer, which is part of your trusted infrastructure. The real requirements are that the private keys are protected (often in hardware security modules) and that internal traffic is re-encrypted if the internal network is not trusted. Most large companies encrypt internal traffic too.

Q: Can the client do load balancing itself?
A: Yes, and inside data centres it is common: a gRPC client gets the list of backends from a service registry and balances requests across them directly, with no proxy hop. It saves latency and a tier of machines, at the cost of putting balancing logic (and updates to it) into every client. Public clients on the internet go through a load balancer.

Q: What happens to in-flight requests when the load balancer itself fails?
A: Connections through that instance break and clients reconnect (to a surviving instance, via the shared IP or anycast). Idempotent requests can be retried. This is why load balancers run as redundant clusters and why clients need retry logic.

--- exercises
[choose] You run a PostgreSQL read-replica pool, a public website, and a multiplayer game using UDP. For each, L4 or L7?
A: PostgreSQL: L4 (its own protocol over TCP; an L7 HTTP proxy cannot read it, although specialised database proxies exist). Website: L7 (TLS termination, path routing, caching, retries). Game over UDP: L4 (UDP, latency-sensitive, no HTTP to read).

[break] A team scales its gRPC service from 10 to 20 servers behind an L4 load balancer. CPU on the original 10 stays at 90%, the new 10 sit idle. Why, and how do you fix it?
A: gRPC clients open a few long-lived HTTP/2 connections and send all requests over them; an L4 balancer assigns backends per connection, so existing connections stay on the original servers. Fixes: switch to an L7 proxy (or client-side balancing) that balances each request; or set a maximum connection age on the servers so clients periodically reconnect and spread out.

[design] Route requests for `example.com/api/*` to the API service, `example.com/static/*` to a static-file pool, and send 5% of API traffic to a new version. Which load balancer, and what rules?
A: An L7 load balancer terminating TLS for example.com. Rules: path prefix /static/ → static pool (with caching headers, ideally behind a CDN); path prefix /api/ → API pool, split by weight 95% to the stable version and 5% to the canary (optionally sticky per user via a cookie so a user does not flip between versions). Health checks per pool; retries only on idempotent API methods.

[estimate] An L7 proxy fleet terminates TLS for 400,000 requests per second. One proxy handles about 20,000 requests per second with TLS at 60% CPU. How many proxies, keeping one zone of three as spare?
A: 400,000 / 20,000 = 20 proxies of capacity. Two zones must carry everything: 10 per zone × 3 zones = 30 proxies. (Connection reuse matters: with TLS sessions resumed and keep-alive, per-request TLS cost drops a lot.)

--- pitfalls
- Drawing a single load balancer (a new single point of failure)
- Expecting an L4 balancer to route by URL path or retry requests
- Balancing long-lived gRPC connections at L4 and wondering why load is uneven
- Forgetting that backends behind a proxy see the proxy's IP
- Retrying non-idempotent requests at the load balancer

--- quiz
Q: Which can an L4 load balancer do?
- Route /api and /images to different pools
- Retry a failed HTTP request on another server
- *Balance TCP connections for any protocol at very high packet rates
- Read cookies to pick a canary
W: L4 sees addresses and ports, not requests.
Q: Why might new servers get no traffic from gRPC clients behind an L4 balancer?
- gRPC does not support load balancing
- *Clients keep long-lived connections, which stay pinned to the old servers
- The new servers fail health checks
- L4 balancers only support HTTP/1.1
W: L4 balances per connection; each HTTP/2 connection carries many requests.
Q: What does TLS termination at the load balancer enable?
- Faster DNS
- *Reading the HTTP request to route, retry and apply policies
- Removing the need for certificates
- Direct server return
W: Once decrypted, the request's path and headers are visible.
Q: Direct server return means…
- The client connects directly to backends
- *Responses go from the backend straight to the client, bypassing the balancer
- The balancer caches responses
- Requests skip health checks
W: The balancer only carries the (smaller) inbound traffic.

--- sources
- paper :: Maglev: A Fast and Reliable Software Network Load Balancer (NSDI 2016) :: Eisenbud et al., Google :: https://research.google/pubs/maglev-a-fast-and-reliable-software-network-load-balancer/
- article :: Introduction to modern network load balancing and proxying :: Matt Klein (Envoy) :: https://blog.envoyproxy.io/introduction-to-modern-network-load-balancing-and-proxying-a57f6ff80236
- article :: Cloud Load Balancing overview :: Google Cloud :: https://cloud.google.com/load-balancing/docs/load-balancing-overview
- article :: Load balancing in gRPC :: gRPC Authors :: https://grpc.io/blog/grpc-load-balancing/

=== lb-algorithms
blurb: How a load balancer picks a server: round robin, weighted, random, least connections, least response time and the power of two choices, with a live race showing why load-blind strategies wreck tail latency and why "pick the least loaded" can stampede.
signals: Servers have uneven speed or request costs | Tail latency is bad although average load is fine | Several load balancers share the same backends | Requests need to stick to one server (caches, sessions)
widgets: load-balancer
prereq: l4-l7

--- lesson
:::words
- **Round robin**: give requests to servers in turn: 1, 2, 3, 1, 2, 3…
- **Weighted**: a server with weight 2 gets twice the share of a server with weight 1.
- **In flight**: requests a server has started but not finished.
- **Least connections**: send each request to the server with the fewest requests in flight.
- **Power of two choices**: pick two servers at random and send to the less busy of the two.
- **Affinity (stickiness)**: sending the same client or key to the same server every time.
- **Stale information**: load numbers that were true a moment ago but may not be now.
:::

## The problem in plain words

If every request took the same time and every server were identical, handing requests out in turn would be perfect. Reality is messier: some requests take 100× longer than others, one server is slower (a noisy neighbour, a long garbage-collection pause, older hardware), and you may have several load balancers that each see only part of the picture. A good algorithm keeps queues short **everywhere**, because a long queue on even one server shows up as terrible tail latency for the users unlucky enough to land there.

:::eli5
Supermarket checkouts. Round robin is sending shoppers to tills 1, 2, 3, 1, 2, 3 regardless of queues, even if till 2's cashier is new and slow. Least connections is everyone joining the shortest queue, which works if everyone can see all the queues, but if they only see a photo taken a minute ago, everyone rushes the same "shortest" queue. Power of two choices is: glance at two random tills and join the shorter one. Surprisingly, that is almost as good as checking every till, and it never causes a stampede.
:::

## The strategies

**Round robin.** Next server in order. Stateless and fair in *count* of requests, but blind to how busy anyone is. Works well when servers are identical and requests are uniform and short.

**Weighted round robin.** Same, with shares proportional to capacity (a big machine gets weight 4). Useful for mixed hardware or gradual canaries (weight 1 of 100). Still blind to actual load.

**Random.** Statistically similar to round robin, with no shared counter, so it works across many balancers without coordination. Also load-blind, and random clustering makes queues a little more uneven.

**Least connections (least outstanding requests).** Pick the server with the fewest requests in flight. It **adapts** to slow servers and expensive requests automatically, because a slow server accumulates in-flight requests and stops being chosen. The catch: it needs accurate, current numbers. One balancer knows exactly what it has sent; several balancers each know only their own share, and if load is reported periodically, all of them pick the same "least loaded" server until the next report: a **herd**.

**Least response time / latency-weighted (EWMA).** Prefer servers whose recent responses were fast (an exponentially weighted moving average of latency, often multiplied by in-flight count). Reacts to slowness even before queues build. Used by Twitter's Finagle and Envoy's options.

**Power of two choices (P2C).** Choose two servers at random; send to the one with fewer in flight. A classic result in randomised load balancing (Mitzenmacher; Azar et al.) shows that checking just two random choices instead of one makes the most loaded server dramatically less loaded, exponentially better than pure random, and close to checking all of them. And because the two candidates are random, many balancers with stale information do not all converge on the same server. It is the default in several modern proxies and in gRPC and Finagle clients.

## Watch them race

Both panels below receive **exactly the same requests**. Make one server slow, add expensive requests, raise the load, or turn on "stale load info" (several balancers that only see a report every 250 ms), and compare the queues and the p99.

[[widget:load-balancer]]

What you should be able to see:

1. **Round robin and random keep feeding the slow server its full share.** If it can only handle half of that, its queue grows without limit; every request landing there waits seconds. The p99 explodes even though the other four servers are mostly idle.
2. **Least connections and P2C route around the slow server** because its in-flight count rises.
3. **With stale information, least connections stampedes**: everyone sends to whichever server looked emptiest at the last report, overloading it, then the next one. P2C stays calm.

## Sticky routing: when the same key should hit the same server

Sometimes you *want* the same client or key on the same server: its cache holds that user's data, or a game session lives in its memory.

- **Session affinity by cookie** at L7: simple, but uneven if some users are heavy, and a failed server loses its sessions. Prefer keeping state outside the server so affinity is an optimisation, not a requirement.
- **Hash-based routing**: hash a key (user ID, cache key) to pick the server. With plain `hash % N`, adding a server reshuffles almost every key; **consistent hashing** (or rendezvous hashing, or Maglev hashing) moves only about 1/N of keys. The partitioning chapter covers these.
- **Bounded-load consistent hashing**: consistent hashing that refuses to put more than, say, 1.25× the average load on any server, spilling to the next one. Google described it in 2017 for exactly this "affinity without hot spots" problem.

## Slow start and warm-up

A brand-new server (cold caches, a JIT compiler not yet warmed up) given its full share immediately may respond slowly, and least-connections may even flood it because it looks idle. Many balancers ramp new servers up over 30–60 seconds ("slow start").

## Choosing, in practice

- Default for HTTP and gRPC services: **least outstanding requests or P2C**, which handles heterogeneity and stale information.
- Identical servers, tiny uniform requests: **round robin** is fine and simplest.
- Mixed hardware or canaries: **weights** on top of whichever algorithm.
- Per-key locality (caches, sharded state): **consistent hashing with bounded load**.

## Interview angles

- "Why not round robin?" Requests and servers are not uniform; a slow server's queue grows without bound and ruins the tail.
- "Why not always pick the least loaded server?" With several balancers or delayed information, everyone picks the same one; P2C avoids the herd.
- "How do you keep a user's requests on the same cache server without hot spots?" Consistent hashing with bounded load.

--- revise
### Strategies
? Round robin's weakness? :: Load-blind: a slow server keeps getting its full share and its queue grows without bound.
? Least connections in one line? :: Send to the server with the fewest requests in flight; adapts to slow servers and costly requests.
? Least connections' failure mode? :: With several balancers or stale load reports, everyone picks the same "least loaded" server: a herd.
? Power of two choices? :: Pick two random servers, send to the less loaded; near-optimal and robust to stale information.
? Least response time (EWMA)? :: Prefer servers with fast recent responses, often weighted by in-flight count.

### Affinity and warm-up
? Why consistent hashing instead of hash % N? :: Adding or removing a server moves only ~1/N of keys instead of nearly all.
? Bounded-load consistent hashing? :: Consistent hashing that caps each server at ~1.25× average, spilling extra keys onward.
? Why slow start for new servers? :: Cold caches and JIT; least-connections would flood an "idle-looking" newcomer.

--- notes
## Load-blind
Round robin: in turn; fair by count; blind to speed.
Weighted RR: shares by capacity; canaries.
Random: no shared state; similar to RR; slightly lumpier.
A slow server under load-blind strategies builds an unbounded queue → p99 explodes.
## Load-aware
Least connections / outstanding requests: adapts to slowness and heavy requests.
Needs fresh numbers; stale or partial views cause herding.
EWMA / least response time: reacts to slowness before queues grow (Finagle, Envoy).
Power of two choices: two random picks, lighter wins; exponentially better max load than random; herd-proof. Default in modern proxies and gRPC clients.
## Affinity
Cookie stickiness: simple, uneven, sessions die with the server; keep state external.
Hash routing: hash % N reshuffles everything; consistent/rendezvous/Maglev hashing moves ~1/N.
Bounded-load consistent hashing (Google, 2017): cap ~1.25× average.
## Warm-up
Slow start ramps new servers over 30–60 s.
## Defaults
P2C or least outstanding requests; weights for mixed hardware; consistent hashing with bounded load for locality.

--- doubts
Q: Why is checking two random servers so much better than checking one?
A: With one random choice, the busiest server's load grows noticeably as the system grows, because random clumps are unavoidable. With two choices, a server only receives a request if it beats another random server, so busy servers are avoided most of the time and the maximum load stays very close to the average. Most of the benefit comes from the jump from one choice to two; checking three or more improves things only a little.

Q: If least connections is so good, why not use it everywhere?
A: Inside a single balancer with accurate counts, it is excellent. The trouble starts with many independent balancers (each sees only its own connections) or with load information that arrives late: everyone chooses the same server at the same moment. P2C gets almost the same quality and is robust to both problems, which is why many systems prefer it.

Q: Does round robin ever make sense?
A: Yes: when servers are identical, requests are small and similar, and you want the simplest possible thing (for example, spreading connections across a pool of identical L7 proxies). It is also predictable, which helps debugging. It fails when costs or server speeds vary.

Q: What counts as "load" for these algorithms?
A: Usually in-flight requests (cheap to track and reacts quickly). Alternatives include recent latency (EWMA), CPU utilisation reported by servers (more accurate but delayed), or queue length. In-flight count is the common default because it naturally rises on slow servers.

Q: Isn't sticky routing bad for balance?
A: It trades balance for locality. If one user (or key) is very heavy, its server gets hot. That is why bounded-load variants exist, and why state that matters should live outside the server so you can drop stickiness when a server is overloaded or fails.

--- exercises
[estimate] Five servers each handle 100 requests/s. One becomes 4× slower (25 requests/s). Total traffic is 300 requests/s. With round robin, what happens to the slow server?
A: Round robin gives each server 300 / 5 = 60 requests/s. The slow server can only finish 25/s, so its queue grows by 35 requests every second, indefinitely, until requests time out. Every request landing there (1 in 5) gets worse and worse latency, so the p99 is ruined although total capacity (4 × 100 + 25 = 425/s) is ample. Least connections or P2C would shift its excess to the healthy servers.

[break] Ten L7 proxies each use "least loaded" based on CPU numbers that backends report every 5 seconds. Every 5 seconds, a different backend's CPU spikes to 100%. Explain.
A: After each report, all ten proxies agree on the same least-loaded backend and send it everything for the next 5 seconds, overloading it; the next report names another backend, and the herd moves there. Fix: power of two choices (randomness breaks the herd), or use each proxy's own real-time in-flight counts, or add jitter and smoothing to the reported metric.

[choose] A recommendation service keeps a large per-user model cache in memory (warming it takes seconds). Which balancing strategy?
A: Consistent hashing on user ID, so each user's requests hit the server that already has their data cached, with bounded load (cap per server ~1.25× average) so heavy users do not create hot spots; when a server is added or removed, only ~1/N of users move and re-warm. Fall back to any server if the owner is unhealthy.

[design] You deploy a new version to 2 new servers among 50 old ones. Within seconds the new servers time out. Logs show they received far more requests than others in their first seconds. Which algorithm did this, and how do you prevent it?
A: Least connections (or least-loaded): new servers start with zero in-flight requests, so they look the most attractive and receive a burst while their caches and JIT are cold. Prevent it with slow start (ramp their weight over 30–60 s), readiness checks that only pass once warm, and pre-warming before adding them to the pool.

--- pitfalls
- Using round robin when request costs or server speeds vary
- Using "least loaded" with stale or partial information across many balancers (herding)
- hash % N for sticky routing, reshuffling everything on scale-up
- Sticky sessions holding state that is lost when the server dies
- Sending full traffic to cold new servers

--- quiz
Q: One server is much slower than the rest. Which strategy suffers most?
- Least connections
- Power of two choices
- *Round robin
- Least response time
W: It keeps sending the slow server its equal share regardless of its queue.
Q: Why does power of two choices behave well with many load balancers?
- It uses a central coordinator
- *Random candidate pairs stop all balancers from piling onto the same server
- It ignores load entirely
- It only works with one balancer
W: Randomness breaks the herd even with stale information.
Q: Bounded-load consistent hashing solves…
- Slow DNS
- *Hot spots in sticky/hash routing, by capping each server's share
- TLS termination
- Retry storms
W: Keys spill to the next server once one is above its cap.
Q: Why do many balancers ramp up new servers gradually?
- To save bandwidth
- *Cold caches and warm-up make new servers slow, and "least loaded" would flood them
- DNS needs time to update
- Health checks require it
W: Slow start protects newcomers while they warm up.

--- sources
- paper :: The Power of Two Choices in Randomized Load Balancing (IEEE TPDS 2001) :: Michael Mitzenmacher :: https://www.eecs.harvard.edu/~michaelm/postscripts/tpds2001.pdf
- paper :: Balanced Allocations (STOC 1994 / SIAM J. Computing 1999) :: Azar, Broder, Karlin, Upfal :: https://doi.org/10.1137/S0097539795288490
- article :: Consistent Hashing with Bounded Loads :: Vahab Mirrokni, Mikkel Thorup, Morteza Zadimoghaddam (Google Research blog) :: https://research.google/blog/consistent-hashing-with-bounded-loads/
- article :: NGINX and the "Power of Two Choices" load-balancing algorithm :: NGINX / F5 :: https://www.f5.com/company/blog/nginx/nginx-power-of-two-choices-load-balancing-algorithm
- article :: Supported load balancers (Envoy) :: Envoy Proxy :: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers

=== lb-health
blurb: How load balancers notice broken servers and stop sending them traffic: active and passive health checks, how long detection takes and what users suffer meanwhile, liveness vs readiness, connection draining for safe deploys, and the trap of health checks that take the whole fleet down.
signals: Deploying without dropping requests | A server is broken but still receives traffic | Choosing health-check intervals and thresholds | Designing a /health endpoint
widgets: health-timeline
prereq: lb-algorithms

--- lesson
:::words
- **Health check**: a small test request the load balancer sends to each server regularly ("are you OK?").
- **Active check**: the load balancer probes on a timer. **Passive check (outlier detection)**: it watches real traffic for errors.
- **Threshold**: how many failed (or passed) checks in a row before a server is marked unhealthy (or healthy again).
- **Liveness**: "the process is alive" (if not, restart it). **Readiness**: "it can serve traffic right now" (if not, stop sending it requests).
- **Connection draining**: letting a server finish its in-flight requests before removing it.
- **Fail open**: if every server looks unhealthy, keep sending traffic anyway rather than sending none.
:::

## The problem in plain words

A load balancer is only useful if it stops sending traffic to broken servers, and does so **quickly**, without being fooled into removing healthy ones. Every second between a server dying and the balancer noticing, a share of user requests fails. Every deploy removes servers on purpose, and done carelessly, it cuts off requests mid-flight. This page is about those seconds.

:::eli5
A manager checks on each cashier every 10 seconds with a thumbs-up signal. If a cashier misses three checks in a row, the manager closes their till and redirects customers. Customers who walked up to that till in the 30 seconds before it was closed had a bad time. Check more often and you catch problems sooner, but the manager does nothing but check, and one slow thumbs-up might close a till for nothing.
:::

## Active health checks

The load balancer sends a request (a TCP connect, or `GET /healthz`) to every server every **interval** (say 5 s), with a **timeout** (say 2 s). A server is marked unhealthy after **N consecutive failures** (say 3) and healthy again after **M consecutive successes** (say 2).

**Detection time ≈ interval × unhealthy threshold** (plus up to one interval of bad luck). With 5 s and 3 failures, about 15 seconds. During that window, the dead server keeps receiving its share of new requests. With 20 servers at 10,000 requests/s, that is 500 requests/s × 15 s = **7,500 failed requests** for one dead server.

Shorter intervals detect faster but multiply probe traffic (every balancer probes every server) and raise the chance of removing a server for one slow response. Higher thresholds avoid flapping (servers bouncing in and out) but detect more slowly.

Drag the settings and watch the failed-request count:

[[widget:health-timeline]]

## Passive health checks (outlier detection)

The balancer also watches **real responses**: after, say, 5 consecutive 5xx errors or connection failures from one server, eject it for 30 seconds, then let it back in to be tested again. Passive checks react within a handful of requests, far faster than active probes at high traffic, and catch problems a shallow `/healthz` misses. Envoy's outlier detection is the standard example. Use both: active checks cover idle servers and recovery; passive checks catch failures quickly under load.

## What a health endpoint should check

- **Liveness**: "is the process able to make progress?" Keep it shallow; a failing liveness check means *restart me*.
- **Readiness**: "can I serve requests right now?" Fail it during startup (until caches are warm and connections are open), during shutdown (so the balancer drains you), and when the server is overloaded or cannot reach something it truly cannot work without.

The big trap is the **deep health check that checks shared dependencies**. If every server's readiness check calls the database, a brief database blip makes *every* server fail at once; the balancer removes all of them and the whole site goes down, even for pages that did not need the database. Two defences:

1. Health checks report on **the server itself**, not on shared dependencies (degrade gracefully instead).
2. **Fail open**: if all (or most, say over 50%) of a pool looks unhealthy, the balancer assumes the checks are wrong and keeps sending traffic to everyone. Envoy calls this the panic threshold; cloud load balancers behave similarly.

## Draining: removing servers without dropping requests

To take a server out (deploy, scale-in):

1. Mark it **not ready** (or deregister it). The balancer stops sending *new* requests.
2. Let **in-flight requests finish**, up to a deadline (seconds for APIs; longer for uploads, streams or WebSockets, which may be asked to reconnect elsewhere).
3. Then stop the process.

Without draining, every deploy fails a burst of requests. With rolling deploys of a large fleet, those bursts add up to a constant error rate. Conversely, a new server should be added only when **ready**, and ramped up gradually (slow start).

## Failover of the load balancer itself

Load balancers fail too. Common patterns: an **active–standby pair** sharing a virtual IP (the standby takes over the IP within seconds when heartbeats stop); an **active–active cluster** behind anycast or ECMP routing, where any instance can serve any connection and losing one shifts its share to the others; and DNS listing several balancer addresses as a last resort.

## Interview angles

- "How fast do you detect a dead server, and what does it cost?" Interval × threshold; failed requests = share of traffic × detection time; add passive outlier detection.
- "How do you deploy without errors?" Readiness off → drain → stop; new servers ready → slow start.
- "Should the health check call the database?" No, not as a gate for every server; avoid correlated failure and fail open.

--- revise
### Active checks
? Detection time for active health checks? :: About interval × unhealthy threshold (e.g. 5 s × 3 = 15 s).
? Requests failed while a server is undetected? :: Its share of traffic × detection time (e.g. 500/s × 15 s = 7,500).
? Trade-off of a shorter interval? :: Faster detection, but more probe load and more false removals (flapping).

### Passive checks
? What is outlier detection? :: Ejecting a server after N consecutive real errors, then retesting it later.
? Why use both active and passive? :: Passive reacts in a few requests under load; active covers idle servers and recovery.

### Health endpoints
? Liveness vs readiness? :: Liveness: restart me if failing. Readiness: send me traffic or not (startup, shutdown, overload).
? Danger of a deep health check on a shared database? :: One database blip fails every server at once; the balancer removes the whole fleet.
? What is fail open (panic threshold)? :: If most of the pool looks unhealthy, send traffic to all anyway.

### Draining
? Safe removal sequence? :: Mark not ready → stop new traffic → let in-flight requests finish (deadline) → stop the process.

--- notes
## Active checks
Probe every interval with a timeout; unhealthy after N fails, healthy after M passes.
Detection ≈ interval × N; failed requests ≈ server's traffic share × detection time.
Short intervals: faster, more probes, more flapping.
## Passive / outlier detection
Eject after consecutive 5xx or connection errors; retest after an ejection period.
Fast under load; catches what shallow probes miss.
## Endpoints
Liveness = restart me; readiness = route to me.
Not ready during startup (warm-up), shutdown (drain) and overload.
Don't gate every server on a shared dependency: correlated failure.
Fail open / panic threshold when most of the pool looks unhealthy.
## Draining and adding
Readiness off → no new requests → in-flight finish by a deadline → stop.
Long-lived connections: ask clients to reconnect elsewhere.
Add only when ready; slow start.
## Balancer failover
Active–standby with a virtual IP · active–active behind anycast/ECMP · several DNS addresses as a last resort.

--- doubts
Q: Why not check every 100 ms so failures are caught instantly?
A: Every load balancer instance probes every backend, so 50 balancers × 1,000 backends × 10 probes per second is half a million probe requests per second. Very short timeouts also mark servers unhealthy during brief pauses (a garbage collection), causing flapping. Passive outlier detection gives fast reaction without probe floods, so active checks can stay moderate.

Q: Isn't a TCP connect check enough?
A: It proves the process accepts connections, not that it can serve requests: a server whose request threads are all stuck still accepts TCP connections. An HTTP check against a lightweight endpoint that exercises the request path is better; passive checks on real traffic are better still.

Q: Should a server report "not ready" when it is overloaded?
A: It can, as a form of load shedding, but carefully: if all servers are overloaded and all go not-ready, you get the "whole pool unhealthy" situation. Fail-open logic in the balancer and returning fast errors (503 with Retry-After) for excess requests are usually safer than flipping readiness under load.

Q: How long should draining wait?
A: Longer than your longest normal request (for APIs, the request timeout, often 10–30 s). For WebSockets or streams, waiting hours is impractical; send clients a "please reconnect" message and close gracefully, with reconnection spread over time to avoid a storm.

Q: What is flapping and why is it bad?
A: A server that keeps flipping between healthy and unhealthy, because it is borderline or the thresholds are too sensitive. Each flip moves traffic around, and the server may get a burst every time it returns. Hysteresis (different thresholds for down and up, like 3 failures to remove and 2 successes to return) and ejection back-off reduce it.

--- exercises
[estimate] 40 servers share 20,000 requests/s. Health checks run every 10 s with an unhealthy threshold of 3. One server crashes. Roughly how many requests fail before it is removed, and what if passive checks eject after 5 errors?
A: Per server: 500 requests/s. Detection ≈ 30 s (up to 40 s): about 15,000–20,000 failed requests (fewer if the balancer retries idempotent requests elsewhere). Passive ejection after 5 consecutive errors happens within about 10 ms at that rate: roughly 5 failed requests.

[break] Your readiness check queries the primary database. The database fails over (20 seconds of unavailability). What happens to your website, including pages that only need the cache?
A: Every server's readiness check fails at the same time, the load balancer removes all of them, and the whole site returns errors for the duration (plus the recovery threshold), even for cached pages that could have been served. Fix: readiness reflects the server's own health; handle database unavailability per request (serve cached or degraded responses); enable fail-open in the balancer.

[design] Write the shutdown sequence for an API server in a rolling deploy, with timings.
A: On SIGTERM: (1) flip readiness to failing immediately; (2) keep serving for one or two health-check intervals so every balancer notices and stops sending new requests (e.g. 10 s); (3) stop accepting new connections; let in-flight requests finish up to the request timeout (e.g. 30 s); (4) close idle keep-alive connections, ask streaming clients to reconnect; (5) exit. Total budget, say, 45 s, configured as the platform's termination grace period.

[choose] Active checks every 2 s with threshold 1, or every 5 s with threshold 3 plus passive outlier detection?
A: The second. Threshold 1 at 2 s removes servers on a single slow probe (one GC pause), causing flapping and lost capacity. 5 s × 3 is slow alone (~15 s), but passive outlier detection catches real failures within a few requests, and the active check then handles idle servers and confirms recovery.

--- pitfalls
- Detection windows of 30+ seconds with no passive checks
- Health checks that call shared dependencies (correlated failure of the whole fleet)
- No fail-open, so "all unhealthy" means no traffic at all
- Killing servers without draining in-flight requests
- Adding cold servers at full weight
- A single load balancer instance with no failover

--- quiz
Q: Interval 5 s, unhealthy threshold 4. Roughly how long to detect a dead server?
- 4 s
- 5 s
- *About 20 s
- 1 minute
W: Detection ≈ interval × consecutive failures needed.
Q: Why is a readiness check that queries the shared database dangerous?
- It is slow
- *A database blip makes every server fail together and the balancer removes the whole fleet
- Databases cannot handle checks
- It breaks TLS
W: Correlated health-check failure turns a partial outage into a full one.
Q: Passive health checking means…
- Checking less often
- *Watching real traffic and ejecting servers that return errors
- Letting servers report their own health
- Health checks with no timeout
W: Outlier detection reacts within a few failed requests.
Q: The first step of draining a server is…
- Kill the process
- *Mark it not ready so the balancer stops sending new requests
- Restart the load balancer
- Lower the DNS TTL
W: Then in-flight requests finish before the process stops.

--- sources
- article :: Health checking (Envoy architecture overview) :: Envoy Proxy :: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking
- article :: Outlier detection (Envoy) :: Envoy Proxy :: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- article :: Configure liveness, readiness and startup probes :: Kubernetes :: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- article :: Implementing health checks :: Amazon Builders' Library (David Yanacek) :: https://aws.amazon.com/builders-library/implementing-health-checks/
- book :: Site Reliability Engineering, ch. 20 (Load Balancing in the Datacenter) :: Google :: https://sre.google/sre-book/load-balancing-datacenter/

=== api-gateway
blurb: The front door for many services: what an API gateway does on every request (authentication, rate limiting, routing, transformation, observability), how it differs from a load balancer and a service mesh, and how to keep it from becoming a slow single point of failure.
signals: Many microservices behind one public API | Authentication and rate limits applied consistently | Mobile clients need aggregated responses | Service-to-service traffic needs retries, encryption and routing
widgets: seq-gateway
prereq: l4-l7

--- lesson
:::words
- **Microservices**: an application split into many small services, each owning one capability and its data.
- **API gateway**: the single entry point that sits in front of those services and handles the cross-cutting work every request needs.
- **Cross-cutting concern**: something every service would otherwise implement itself: authentication, rate limiting, logging.
- **Authentication**: checking who the caller is. **Authorisation**: checking what they may do.
- **Backend for frontend (BFF)**: a gateway-like service built for one kind of client (the iOS app, the web app).
- **Service mesh**: a layer of small proxies, one beside every service instance, that handles service-to-service calls.
- **Sidecar**: such a helper proxy running next to each service instance.
:::

## The problem in plain words

Once a product is split into dozens of services, every one of them needs to check tokens, enforce rate limits, log requests, handle CORS for browsers, speak TLS, and expose versioned public routes. Implementing that in every service is duplicated work and an invitation to inconsistency (one team forgets the rate limit). Public clients also should not need to know your internal service map. An API gateway is the **one door** where all of that happens once, before a request reaches any service.

:::eli5
A large office building has one reception desk. Every visitor shows ID there, gets a badge, is told which floor to go to, and is turned away if they have come too many times today. The individual departments never deal with strangers at all; they trust the badge. The API gateway is that reception desk.
:::

## What happens on each request

Step through a request, then try the broken variants:

[[widget:seq-gateway]]

Typical stages, in order:

1. **TLS termination** (often already done by the load balancer in front).
2. **Authentication**: validate the token (a JWT's signature and expiry, or an API key, or a session), reject with **401** if invalid. The gateway passes the verified identity to services in a trusted header, so services do not re-verify.
3. **Coarse authorisation**: is this client allowed to call this route at all? (**403** if not.) Fine-grained "may user 7 edit document 42?" stays in the service, which knows the data.
4. **Rate limiting and quotas** per API key, user or IP; **429** with `Retry-After` when exceeded.
5. **Routing** to the right service and version (`/v1/orders/*` → orders service), including canary splits.
6. **Transformation**: request and response rewriting, protocol translation (JSON over HTTP outside, gRPC inside), adding request IDs.
7. **Resilience**: timeouts, limited retries, circuit breakers so a failing service returns a fast 503 instead of tying up gateway resources.
8. **Observability**: one place to log every request, measure latency per route and start a distributed trace.

Optionally, **aggregation**: one client call fans out to several services in parallel and returns one combined response (a BFF does this per client type).

## Gateway vs load balancer vs service mesh

| | Sits | Main job | Typical features |
|---|---|---|---|
| **L7 load balancer** | In front of a pool of identical servers | Spread load, health-check | Routing, TLS, retries |
| **API gateway** | At the edge, in front of many services | Policy for external (north–south) traffic | Auth, rate limits, quotas, API keys, versioned routes, transformation, developer-facing concerns |
| **Service mesh** | Beside every service instance (sidecars) | Policy for internal (east–west) service-to-service traffic | Mutual TLS, retries, timeouts, traffic splitting, telemetry, without changing service code |

The lines blur: many gateways are built on the same proxies (Envoy) that meshes use. What matters in an interview is placing each function where it belongs: **public-facing policy at the gateway; internal reliability and encryption in the mesh or client libraries; business authorisation in the service.**

## Keeping the gateway from hurting you

Everything goes through it, so it is a candidate for both bottleneck and single point of failure.

- **Stateless and horizontally scaled**, behind an L4 load balancer, across zones. Rate-limit counters live in a shared fast store or are approximated locally (the rate-limiting chapter shows how).
- **Thin**: no business logic. A gateway full of per-team logic becomes a monolith that every team must change and deploy (the "smart gateway" anti-pattern).
- **Fast authentication**: verify signed tokens locally with cached public keys instead of calling an auth service per request; cache API-key lookups.
- **Timeouts per route** and circuit breakers per backend service, so one slow service cannot exhaust the gateway's connections and take down every route.
- **Per-client-type gateways (BFFs)** when the mobile and web apps need very different shapes, so one team's change does not break another's client.

## Interview angles

- "Where do authentication and rate limiting happen?" At the gateway, once, with identity passed downstream; fine-grained authorisation in the service.
- "Isn't the gateway a single point of failure?" Stateless, replicated across zones behind L4; thin; per-backend circuit breakers.
- "Gateway or service mesh?" Gateway for external traffic and API products; mesh for internal service-to-service policy.

--- revise
### What it does
? The API gateway's per-request stages? :: TLS, authentication (401), coarse authorisation (403), rate limits (429), routing, transformation, resilience (timeouts, breakers), observability.
? Where does fine-grained authorisation belong? :: In the service, which knows the data ("may user 7 edit doc 42?").
? How do services learn who the caller is? :: The gateway verifies the token and passes the identity in a trusted header.

### Comparisons
? Gateway vs service mesh? :: Gateway: external north–south traffic and API policy. Mesh: internal east–west traffic via sidecars (mTLS, retries, telemetry).
? What is a BFF? :: A gateway-like service per client type that shapes and aggregates responses for it.

### Pitfalls
? How to keep the gateway from being a bottleneck or SPOF? :: Stateless, replicated across zones behind L4, thin, local token verification, per-route timeouts and per-backend circuit breakers.
? The "smart gateway" anti-pattern? :: Business logic in the gateway, turning it into a shared monolith every team must change.

--- notes
## Stages
TLS → authentication (401) → coarse authorisation (403) → rate limit / quota (429) → routing (versions, canaries) → transformation (JSON↔gRPC, request IDs) → resilience (timeouts, retries, breakers) → observability (logs, metrics, traces).
Optional aggregation / BFF.
## Placement of concerns
Public policy at the gateway · internal mTLS/retries/telemetry in the mesh or client libraries · business authorisation in services.
## Gateway vs LB vs mesh
LB: spread load over identical servers.
Gateway: north–south API policy, keys, quotas, versions.
Mesh: east–west sidecars, mTLS, traffic splitting, without code changes.
## Keep it healthy
Stateless, horizontally scaled, multi-zone, behind L4.
No business logic; per-client BFFs when needs diverge.
Verify JWTs locally with cached keys; cache API-key lookups.
Per-route timeouts; per-backend circuit breakers.
Shared or approximate rate-limit counters.

--- doubts
Q: Do I need an API gateway for a small system?
A: Not as a separate product. A monolith or a handful of services behind one L7 load balancer can do authentication in a middleware layer. The gateway pays off when there are many services, many teams, external API customers (keys, quotas, usage plans) or several client types.

Q: If the gateway authenticates, why should services check anything?
A: Services should still enforce *authorisation* on their own data (only the owner can edit a document), and in a zero-trust setup they verify that the request really came through the gateway (mutual TLS, a signed identity header). The gateway removes the repetitive part (validating tokens), not the responsibility for access decisions.

Q: Doesn't every hop through a gateway add latency?
A: A well-run gateway adds around a millisecond or less inside the same data centre. It usually *saves* latency overall: TLS is terminated once near users, connections to services are kept warm, and aggregation replaces several client round trips with one.

Q: Is a service mesh worth its complexity?
A: For a large number of services where you need uniform mutual TLS, retries, timeouts and telemetry across many languages, yes. For a few services, client libraries or a shared framework do the same with less operational overhead. The mesh's sidecars also add some latency and resource use per instance.

Q: Should the gateway retry failed requests?
A: Only idempotent ones, only a limited number of times, with backoff, and ideally within a retry budget (for example, at most 10% extra traffic). Otherwise a struggling service gets hit by retries from the gateway on top of retries from clients, multiplying load at the worst moment.

--- exercises
[design] Design the gateway behaviour for a public developer API with free and paid plans: 60 requests per minute free, 6,000 paid.
A: Authenticate the API key (cached lookup → plan, owner); rate-limit per key with the plan's limit (token bucket in a shared store or approximate local counters synchronised periodically); return 429 with Retry-After and RateLimit headers; record usage per key for billing asynchronously (to a log, not inline); route by version prefix; per-route timeouts; observability per key and route. Business logic stays in services.

[break] Your gateway calls a user-profile service for every request to enrich headers. The profile service slows to 3 s. Every route of your API starts timing out. Why, and how do you fix it?
A: Every request waits up to 3 s on the profile call, so in-flight requests at the gateway multiply (Little's law) until its worker or connection pool is exhausted, and all routes fail, including ones that did not need the profile. Fixes: remove the per-request dependency (put what you need in the token, or cache it), set a short timeout with a fallback (omit the enrichment), add a circuit breaker per backend, and isolate resources per backend (bulkheads).

[choose] Your company has 300 internal services written in five languages and must encrypt all internal traffic and get uniform retry and timeout policies. Gateway, service mesh, or libraries?
A: A service mesh: sidecar proxies give mutual TLS, retries, timeouts and telemetry uniformly to all 300 services regardless of language, configured centrally, without changing service code. A gateway only sees external traffic; per-language libraries would need five implementations kept in sync.

[estimate] A gateway handles 150,000 requests per second. Verifying a JWT signature locally costs 50 µs of CPU; calling an auth service costs 2 ms of latency and a network call. What does each approach cost?
A: Local verification: 150,000 × 50 µs = 7.5 CPU-seconds per second, so about 8 cores across the fleet, no extra latency, no dependency. Remote: +2 ms per request, 150,000 calls per second to the auth service (which must be scaled and becomes a dependency that can take everything down). Local verification with cached public keys (and short token lifetimes for revocation) is the standard choice.

--- pitfalls
- Business logic in the gateway (the smart-gateway monolith)
- A single gateway instance, or one zone
- Calling remote services on every request without timeouts or breakers
- Retrying non-idempotent requests at the gateway
- Fine-grained authorisation in the gateway instead of the service that owns the data

--- quiz
Q: Which concern belongs in the API gateway rather than the service?
- Deciding whether user 7 may edit document 42
- *Validating the caller's token and applying per-key rate limits
- Writing the order to the database
- Computing recommendations
W: Cross-cutting checks happen once at the edge; data-specific decisions in the service.
Q: A service mesh mainly governs…
- *Internal service-to-service traffic, via sidecar proxies
- DNS resolution
- Browser caching
- External developer API keys
W: East–west traffic: mTLS, retries, timeouts, telemetry.
Q: One slow backend makes every route through the gateway time out. The best structural fix is…
- More gateway memory
- *Per-backend timeouts, circuit breakers and separate resource pools
- Longer timeouts
- Retrying more
W: Isolate failures so one backend cannot exhaust shared resources.
Q: Why verify JWTs locally at the gateway?
- JWTs cannot be verified remotely
- *No per-request network call or dependency; only CPU for the signature check
- It is more secure than any alternative
- It removes the need for expiry
W: Signed tokens are designed for local verification with cached public keys.

--- sources
- article :: Pattern: API Gateway / Backends for Frontends :: Chris Richardson (microservices.io) :: https://microservices.io/patterns/apigateway.html
- article :: Backends for Frontends pattern :: Sam Newman :: https://samnewman.io/patterns/architectural/bff/
- article :: What is a service mesh? (Istio concepts) :: Istio Authors :: https://istio.io/latest/about/service-mesh/
- article :: API gateway pattern vs direct client-to-microservice communication :: Microsoft Learn :: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/architect-microservice-container-applications/direct-client-to-microservice-communication-versus-the-api-gateway-pattern
- book :: Building Microservices, 2nd ed., ch. 5 (Implementing microservice communication) :: Sam Newman :: https://samnewman.io/books/building_microservices_2nd_edition/

=== global-lb
blurb: Getting users worldwide to a nearby, healthy region: GeoDNS and anycast compared, terminating connections at the edge and riding a private backbone, and what happens to traffic and data when a whole region fails.
signals: Users on several continents | Latency targets that one region cannot meet | Surviving a regional outage | "How does a user in Tokyo reach your service?"
widgets: seq-global
prereq: dns

--- lesson
:::words
- **Region**: a geographic group of data centres (for example europe-west).
- **Edge / point of presence (PoP)**: small sites close to users, run by your provider or CDN, that accept connections.
- **Backbone**: a provider's private long-distance network linking its edges and regions.
- **GeoDNS**: DNS that answers with a different address depending on where the asker is.
- **Anycast**: one IP address announced from many sites; the internet routes each user to the nearest.
- **Failover**: moving traffic away from a failed region to others.
:::

## The problem in plain words

A single region can only be close to some of your users. Someone in São Paulo reaching a server in Iowa pays well over 100 ms per round trip, several times over during connection setup. And a single region can fail as a whole (a power event, a bad configuration push). Global load balancing answers two questions: **how does each user reach the nearest healthy place**, and **what happens when a place goes away**?

:::eli5
An international delivery company has drop-off counters in every city (the edge). You hand your parcel to the counter down the road; from there it travels on the company's own fast trucks (the backbone) to the right warehouse (the region). If one warehouse floods, the counters quietly send parcels to another one, and you never notice which warehouse handled your parcel.
:::

## Two ways to steer users

**GeoDNS (or latency-based DNS).** Each region has its own IP addresses; the DNS server answers each lookup with the address of the region closest to the asking resolver. Simple and works anywhere. Weaknesses: it sees the resolver's location, not the user's; and changes (including failover) only take effect as cached answers expire, so failover takes **minutes**.

**Anycast with edge termination.** One global IP is announced from many edge sites. A user's packets reach the nearest edge by normal internet routing. The edge **terminates TCP and TLS right there**, a few milliseconds from the user, then forwards the request over the provider's backbone (on warm, long-lived connections) to the best region with capacity. If an edge or region fails, routing and the global balancer shift traffic in **seconds**, with no DNS change. Google's global load balancer, Cloudflare and other large providers work this way.

Step through a request from Tokyo, then fail a region:

[[widget:seq-global]]

## Why terminating at the edge is so effective

Connection setup costs round trips (TCP, TLS). Done against a server 150 ms away, that is 300–450 ms before the first request byte. Done against an edge 10 ms away, it is 20–30 ms, and the long leg to the region happens once, over connections that are already open and warmed up. Users far from your regions often see their page load time halve.

## Choosing where requests go

The global balancer weighs:

- **Proximity**: the lowest-latency region first.
- **Health**: skip regions failing health checks.
- **Capacity**: spill to the next-nearest region when the nearest is full ("waterfall" or capacity-aware routing), rather than overloading it.
- **Data placement**: a user's data may only live in certain regions (residency laws, or partitioned data), which overrides proximity for some requests.

## When a region fails

Moving *traffic* is the easy part. The hard questions are about **capacity and data**:

- **Capacity**: the surviving regions must absorb the failed region's traffic. With three regions each at 60% load, losing one pushes the others to 90%. Plan for N+1 regional capacity, or shed less important traffic during a regional failure.
- **Stateless tiers** fail over cleanly.
- **Data**: if each region holds a copy, which one accepts writes? With one primary region, its failure means promoting a replica elsewhere and possibly losing the last seconds of asynchronously replicated writes. With multi-region writes, you need conflict resolution. The multi-region chapter covers these choices; for now, the point is that **global load balancing is only as good as the data layer behind it**.
- **Sessions and caches**: users moved to a new region may find cold caches and must not depend on server-local sessions.

## Interview angles

- "How does a user in Tokyo reach your service?" Anycast to the nearest edge, TLS terminated there, backbone to the nearest healthy region with capacity (or GeoDNS to a regional address).
- "A region goes down. What happens?" Traffic shifts in seconds (anycast) or minutes (DNS); survivors need spare capacity; the data layer decides whether writes continue and what may be lost.
- "GeoDNS or anycast?" Anycast for fast failover and edge termination; GeoDNS when you need simple per-region control and can accept slower changes.

--- revise
### Steering
? GeoDNS's two limits? :: It sees the resolver's location, not the user's; failover waits for cached answers to expire (minutes).
? How does anycast steer users? :: One IP from many edges; internet routing delivers each user to the nearest; failover in seconds.
? Why terminate TLS at the edge? :: Handshake round trips become short; the long leg to the region uses warm backbone connections.

### Routing decisions
? Four inputs to choosing a region? :: Proximity, health, capacity (spill over when full), data placement/residency.

### Regional failure
? What must survivors have when a region fails? :: Spare capacity for its traffic (e.g. 3 regions at ≤ 66% load each).
? Why is the data layer the hard part of regional failover? :: Writes need a primary or conflict resolution; async replication can lose recent writes.

--- notes
## Steering users
GeoDNS: per-region IPs, answer by resolver location; minutes to fail over.
Anycast: one global IP; nearest edge by routing; seconds to fail over.
Edge termination: TCP/TLS ends a few ms from the user; backbone with warm connections to the region.
## Choosing a region
Proximity → health → capacity (waterfall spill) → data placement / residency.
## Regional failure
Traffic moves fast; capacity and data are the hard parts.
Plan N+1 regions (3 regions → each ≤ ~66% at peak) or shed low-priority traffic.
Stateless tiers fail over cleanly; caches start cold; no server-local sessions.
Single write region → promote a replica, possibly losing async writes; multi-region writes → conflicts.
## Examples
Google Cloud global external load balancer (anycast IP, GFEs at the edge); Cloudflare; CDNs.

--- doubts
Q: Can I use anycast for my own servers?
A: Anycast requires announcing IP address space through BGP from multiple locations, which is normally done by large networks, CDNs and cloud providers. Most companies get anycast by using a cloud provider's global load balancer or a CDN rather than running it themselves.

Q: Does anycast break TCP connections when routes change?
A: Occasionally: if internet routing shifts mid-connection, packets may start arriving at a different edge that knows nothing about the connection. In practice routes are stable for the duration of typical connections, and providers use techniques to handle the rare shifts. For very long connections, applications should reconnect gracefully anyway.

Q: If the edge is near the user, why not serve everything from the edge?
A: Static and cacheable content often is (that is a CDN). Dynamic requests need your application and data, which live in a few regions; replicating all data to hundreds of edges would be impossibly expensive and hard to keep consistent. The edge's job for dynamic traffic is fast connection setup and smart routing.

Q: Why not run in every region to be close to everyone?
A: Each region costs money and operational effort, and spreading data thin makes consistency harder. Most services pick a few regions (one per major continent) plus edge termination, which captures most of the latency benefit.

--- exercises
[estimate] A user in Sydney opens a fresh HTTPS connection (TCP + TLS 1.3) to a service in Oregon (round trip ≈ 160 ms) and makes one request. Compare with an anycast edge in Sydney (round trip 5 ms) forwarding over a warm backbone connection to Oregon.
A: Direct: TCP 1 RTT + TLS 1 RTT + request 1 RTT = 3 × 160 = 480 ms. Via the edge: handshakes 2 × 5 = 10 ms, then the request goes edge → Oregon → edge over a warm connection (≈ 160 ms) plus 5 ms to the user: ≈ 175 ms. The edge saves roughly 300 ms on the first request.

[design] You run in us-east, europe-west and asia-east, each at 55% peak utilisation. Europe fails at peak. What happens, and what should the plan be?
A: Europe's traffic (≈ a third) spreads to the other two, taking them to about 55% × 1.5 ≈ 83%: survivable, but latency for European users rises (longer distance) and the survivors are near their comfortable limit. The plan: global load balancer shifts traffic in seconds; keep regional utilisation at or below ~60% so two regions can carry everything; shed or degrade low-priority work during the incident; data layer fails writes over according to its replication design.

[choose] A startup with users in the US and India wants low latency and the ability to survive one region failing, on a small budget. What would you recommend?
A: Two regions (one in the US, one in India) behind a cloud global load balancer with anycast and edge TLS termination, stateless application tiers in both, and a database with a primary in one region and a replica in the other (reads served locally, writes going to the primary; promote the replica on failure, accepting a small risk of losing the last seconds of writes). Each region sized to carry all traffic in a failure, or with a documented degradation plan.

--- pitfalls
- Relying on DNS failover when the requirement is seconds
- Failing traffic over to regions that do not have the capacity to take it
- Assuming regional failover is solved once traffic moves, ignoring the data layer
- Server-local sessions that break when users move regions
- Terminating TLS far from users

--- quiz
Q: What makes anycast failover faster than DNS failover?
- Shorter TTLs
- *Routing withdraws the failed site and traffic shifts without waiting for DNS caches
- Anycast uses UDP
- Anycast servers are faster
W: There is no cached DNS answer to expire.
Q: Why does terminating TLS at an edge near the user help?
- It removes encryption
- *Handshake round trips happen over a short distance; the long leg uses warm connections
- It caches all dynamic content
- It avoids DNS
W: Setup cost scales with round-trip time.
Q: Three regions each run at 70% peak load. One fails. The other two run at about…
- 70%
- 85%
- *105% (overloaded)
- 50%
W: 70% × 3 / 2 = 105%; plan regional headroom.
Q: The hardest part of regional failover is usually…
- Moving traffic
- *The data layer: where writes go and what may be lost
- Renewing certificates
- Updating DNS
W: Stateless tiers move easily; data needs a replication and failover design.

--- sources
- article :: External Application Load Balancer overview (global, anycast) :: Google Cloud :: https://cloud.google.com/load-balancing/docs/https
- paper :: Software-Defined Edge: Espresso, Google's peering edge (SIGCOMM 2017) :: Yap et al., Google :: https://research.google/pubs/taking-the-edge-off-with-espresso-scale-reliability-and-programmability-for-global-internet-peering/
- article :: What is anycast? :: Cloudflare Learning Center :: https://www.cloudflare.com/learning/cdn/glossary/anycast-network/
- book :: Site Reliability Engineering, ch. 19 (Load Balancing at the Frontend) :: Google :: https://sre.google/sre-book/load-balancing-frontend/
