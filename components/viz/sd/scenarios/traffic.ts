import type { Scenario } from "../Seq";

/** Load-balancing scenarios: the API gateway pipeline, and global routing through an anycast edge. */
export const TRAFFIC: Record<string, Scenario> = {
  "seq-gateway": {
    title: "A request through the API gateway",
    q: "Where is a bad request stopped, and how much work does it cost before it is?",
    about: "The gateway checks the token, the rate limit and the route before any service sees the request. Try the broken runs.",
    actors: [{ id: "c", label: "Mobile app" }, { id: "g", label: "API gateway" }, { id: "rl", label: "Rate-limit store" }, { id: "svc", label: "Orders service" }],
    variants: [
      {
        key: "ok", label: "Valid request", end: "The service received an authenticated, rate-checked request with the caller's identity attached: it never touched a raw token.",
        steps: [
          { from: "c", to: "g", label: "GET /v1/orders · Bearer eyJ…", t: 0, say: "The app calls the public API with its access token (a JWT)." },
          { from: "g", to: "g", label: "verify JWT signature + expiry", t: 1, say: "The gateway checks the token's signature with a cached public key and its expiry time. No network call needed.", set: { g: "user 42 ✓" } },
          { from: "g", to: "rl", label: "INCR user42:minute", t: 2, say: "It increments this user's request counter for the current minute in a shared fast store." },
          { from: "rl", to: "g", label: "37 / 600", t: 3, say: "37 requests so far this minute, well under the limit of 600.", set: { rl: "user42 = 37" } },
          { from: "g", to: "svc", label: "GET /orders · X-User: 42", t: 4, say: "Route /v1/orders → orders service. The verified identity travels in a trusted header; the service does not re-check the token." },
          { from: "svc", to: "g", label: "200 · 3 orders", t: 30, say: "The service queries its own data (it alone decides which orders user 42 may see) and answers." },
          { from: "g", to: "c", label: "200 OK + RateLimit-Remaining: 563", t: 31, kind: "ok", say: "The gateway adds rate-limit headers, logs the request with its latency, and returns it." },
        ],
      },
      {
        key: "expired", label: "Expired token", end: "Rejected in about a millisecond at the edge; no service spent any work on it.",
        steps: [
          { from: "c", to: "g", label: "GET /v1/orders · Bearer eyJ… (expired)", t: 0, say: "The app's token expired 10 minutes ago." },
          { from: "g", to: "g", label: "signature ok, exp < now ✗", t: 1, kind: "bad", say: "The signature is valid but the expiry time has passed.", set: { g: "rejected" } },
          { from: "g", to: "c", label: "401 Unauthorized", t: 1, kind: "bad", say: "401 tells the app to refresh its token (using its refresh token) and try again. The orders service never saw this request." },
        ],
      },
      {
        key: "limit", label: "Over the rate limit", end: "The client is told exactly how long to wait, so a well-behaved app backs off instead of hammering the API.",
        init: { rl: "user42 = 600" },
        steps: [
          { from: "c", to: "g", label: "GET /v1/orders · Bearer eyJ…", t: 0, say: "A buggy app version is calling the API in a tight loop." },
          { from: "g", to: "g", label: "verify JWT ✓", t: 1, say: "The token is fine.", set: { g: "user 42 ✓" } },
          { from: "g", to: "rl", label: "INCR user42:minute", t: 2, say: "The counter is checked." },
          { from: "rl", to: "g", label: "601 / 600", t: 3, kind: "bad", say: "Over the limit for this minute.", set: { rl: "user42 = 601" } },
          { from: "g", to: "c", label: "429 Too Many Requests · Retry-After: 23", t: 4, kind: "bad", say: "429 with Retry-After: the window resets in 23 seconds. The service is protected from the flood." },
        ],
      },
      {
        key: "down", label: "Orders service is down", end: "After the circuit opens, failures cost a millisecond instead of tying up the gateway for seconds each, so other routes stay healthy.",
        steps: [
          { from: "c", to: "g", label: "GET /v1/orders", t: 0, say: "A normal request, but the orders service has crashed." },
          { from: "g", to: "svc", label: "GET /orders · X-User: 42", t: 4, kind: "drop", say: "The gateway forwards it. No answer comes back." },
          { from: "g", to: "g", label: "timeout after 1 s", t: 1004, kind: "bad", say: "The per-route timeout fires after 1 second. Without it, this request would hold a gateway connection indefinitely." },
          { from: "g", to: "c", label: "504 Gateway Timeout", t: 1005, kind: "bad", say: "The client gets a clear error. Several of these in a row trip the circuit breaker for the orders service.", set: { g: "breaker: OPEN" } },
          { from: "c", to: "g", label: "GET /v1/orders (another user)", t: 1200, say: "The next request for this route arrives." },
          { from: "g", to: "c", label: "503 · Retry-After: 10 (fast fail)", t: 1201, kind: "bad", say: "With the breaker open, the gateway fails it immediately without calling the dead service. Every 10 s it lets one trial request through to see if the service is back." },
        ],
      },
    ],
  },

  "seq-global": {
    title: "From Tokyo to a healthy region",
    q: "A user in Tokyo opens the app. Where is the connection set up, and what happens when the nearest region fails?",
    about: "One anycast IP is served by edges worldwide. The edge terminates TCP and TLS near the user and forwards over the provider's backbone.",
    actors: [{ id: "u", label: "User in Tokyo" }, { id: "e", label: "Edge (Tokyo)" }, { id: "asia", label: "Region asia-east" }, { id: "us", label: "Region us-west" }],
    variants: [
      {
        key: "ok", label: "Normal", end: "The handshakes cost ~10 ms instead of ~300 ms, because they happened at an edge 5 ms away.",
        steps: [
          { from: "u", to: "e", label: "SYN → 34.120.0.1 (anycast)", t: 2, say: "The app connects to the one global IP. Internet routing delivers the packets to the nearest edge that announces it: Tokyo." },
          { from: "e", to: "u", label: "SYN-ACK", t: 5, say: "The edge answers the TCP handshake itself, 5 ms round trip." },
          { from: "u", to: "e", label: "TLS ClientHello", t: 7, say: "TLS is also terminated at the edge." },
          { from: "e", to: "u", label: "TLS done", t: 10, say: "The encrypted connection is ready after about 10 ms.", set: { u: "connected" } },
          { from: "u", to: "e", label: "GET /feed", t: 12, say: "The request goes to the edge." },
          { from: "e", to: "asia", label: "GET /feed (warm backbone conn.)", t: 20, say: "The global balancer picks the nearest healthy region with capacity, asia-east, and forwards over an already-open connection on the private backbone." },
          { from: "asia", to: "e", label: "200 feed", t: 60, say: "The region serves the request." },
          { from: "e", to: "u", label: "200 feed", t: 63, kind: "ok", say: "Total about 63 ms for a fresh connection and a request." },
        ],
      },
      {
        key: "fail", label: "asia-east fails", end: "Traffic moved within seconds with no DNS change. Users get slower responses from farther away, and us-west must have spare capacity for them.",
        init: { u: "connected" },
        steps: [
          { from: "asia", to: "asia", label: "region down", t: 0, kind: "bad", say: "asia-east fails (a power event or a bad configuration push).", set: { asia: "DOWN" } },
          { from: "e", to: "asia", label: "health check", t: 1000, kind: "drop", say: "The global balancer's health checks to asia-east fail; within seconds it stops sending traffic there." },
          { from: "u", to: "e", label: "GET /feed", t: 5000, say: "The user's next request still goes to the Tokyo edge: same IP, same warm connection." },
          { from: "e", to: "us", label: "GET /feed (backbone)", t: 5055, say: "The edge forwards to the next-nearest healthy region, us-west, about 55 ms away over the backbone." },
          { from: "us", to: "e", label: "200 feed", t: 5140, say: "us-west serves it (it must have spare capacity for Asia's traffic)." },
          { from: "e", to: "u", label: "200 feed (slower)", t: 5143, kind: "ok", say: "Around 140 ms instead of 60: slower, but working, and nobody waited for DNS caches to expire." },
        ],
      },
      {
        key: "geodns", label: "Same failure with GeoDNS", end: "With DNS-based steering, users stay pointed at the dead region until their cached answer expires. Minutes of outage instead of seconds.",
        init: { u: "cached: asia IP (TTL 300 s)" },
        steps: [
          { from: "asia", to: "asia", label: "region down", t: 0, kind: "bad", say: "asia-east fails. DNS is updated to hand out us-west's address instead.", set: { asia: "DOWN" } },
          { from: "u", to: "asia", label: "GET /feed → cached asia IP", t: 5000, kind: "drop", say: "But this user's resolver cached asia-east's address a minute ago, for 300 seconds. Requests go straight to the dead region." },
          { from: "u", to: "u", label: "error, retry… still asia IP", t: 15000, kind: "bad", say: "Retries hit the same address. The app is down for this user." },
          { from: "u", to: "us", label: "GET /feed (after TTL expiry)", t: 240000, say: "Four minutes later the cached answer expires and a fresh lookup returns us-west's address." },
          { from: "us", to: "u", label: "200 feed", t: 240150, kind: "ok", say: "Service resumes, minutes later than with anycast." },
        ],
      },
    ],
  },
};
