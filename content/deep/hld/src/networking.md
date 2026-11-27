=== tcp-udp
blurb: How data actually crosses the internet: packets, the reliable ordered stream TCP builds on top of them, the bare-bones UDP, and QUIC, the modern transport that powers HTTP/3. What each costs in round trips, and when to use which.
signals: Choosing a transport for video, games, chat or an API | Explaining why the first request on a new connection is slow | Deciding whether lost data is acceptable
widgets: seq-connection

--- lesson
:::words
- **Packet**: a small chunk of data (up to about 1,500 bytes on most networks) that travels across the network on its own. A 1 MB image becomes roughly 700 packets.
- **IP address**: the number that identifies a machine on the network, so packets know where to go.
- **Port**: a number that picks which program on that machine receives the data (a web server usually listens on 443).
- **Protocol**: an agreed set of rules for how two programs talk.
- **Transport protocol**: the layer that moves data between two programs: TCP, UDP or QUIC.
- **Round trip (RTT)**: a message going to the other side and the reply coming back.
- **Handshake**: the opening messages exchanged before real data flows.
- **Congestion**: too much traffic for a link, so routers start dropping packets.
:::

## The problem in plain words

The internet only promises one thing: it will *try* to deliver each packet to an IP address. Packets can be lost, duplicated, delayed or arrive out of order, and nobody tells you. Yet when you load a web page, every byte arrives complete and in order. Something between your program and the raw network is doing that work. That something is the **transport protocol**, and choosing one is a trade-off between **reliability** and **speed**.

:::eli5
Sending data over the internet is like posting a book one page per envelope. Envelopes get lost and arrive in any order. TCP is a careful friend who numbers every page, waits for the receiver to say "got pages 1 to 40", resends anything missing, and hands the reader the pages strictly in order. UDP just posts the envelopes and hopes. QUIC is the careful friend again, but faster to get started and able to deliver separate chapters independently.
:::

## UDP: just send it

UDP (User Datagram Protocol) adds almost nothing to raw IP: a source port, a destination port, a length and a checksum. No connection setup, no retries, no ordering, no slowing down when the network is busy. Each message is a single packet that arrives once, or not at all.

Why would anyone want that?

- **When late data is useless.** In a video call, a packet of audio that arrives 300 ms late is worse than one that never arrives; the call should move on. Games and live video work the same way.
- **When the exchange is one tiny question and answer.** A DNS lookup is one small query and one small reply; setting up a connection first would triple the time. If no answer comes, the client just asks again.
- **When you want to build your own rules on top.** QUIC is built on UDP precisely so it can implement better reliability than TCP without waiting for every operating system to change.

## TCP: the reliable, ordered stream

TCP (Transmission Control Protocol) turns unreliable packets into a reliable, ordered **byte stream** between two programs. It does four jobs:

1. **Connection setup: the three-way handshake.** The client sends SYN ("let's talk, my numbering starts at X"), the server replies SYN-ACK ("OK, mine starts at Y"), the client sends ACK. That costs **one round trip** before any request can be sent.
2. **Reliability.** Every byte has a sequence number. The receiver acknowledges what it has received; anything not acknowledged in time is sent again (retransmitted).
3. **Ordering.** If packet 7 is lost and 8, 9, 10 arrive, the receiver holds 8–10 and hands nothing to the application until 7 is retransmitted. This is called **head-of-line blocking**, and it becomes important for HTTP/2.
4. **Flow and congestion control.** TCP starts slowly (initially about 10 packets, roughly 14 KB, before waiting for acknowledgements) and speeds up while all goes well; when packets are lost it assumes the network is congested and backs off. This keeps the internet from collapsing, but means a brand-new connection cannot use the full bandwidth straight away ("slow start").

The consequence for system design: **a new TCP connection is expensive**. It costs a round trip for the handshake (plus one or two more for TLS encryption, next page) and starts slow. That is why every serious system **reuses connections**: browsers keep connections open between requests, services use connection pools to their databases, and load balancers keep warm connections to backends.

Step through a connection being set up, and switch between TCP with TLS 1.2, TLS 1.3 and QUIC to see the round trips disappear:

[[widget:seq-connection]]

## QUIC: TCP's jobs, rebuilt on UDP

QUIC was designed at Google (starting around 2012) and standardised by the IETF in 2021 (RFC 9000). It runs on top of UDP and does everything TCP does (reliability, ordering, congestion control) plus encryption, with three big improvements:

- **Faster setup.** The transport handshake and the encryption handshake are combined into **one round trip**. When reconnecting to a server it has talked to before, a client can even send its request in the very first packet (**0-RTT**).
- **Independent streams.** One QUIC connection carries many streams, and a lost packet only stalls the stream it belongs to. Under TCP, one lost packet stalls everything on the connection.
- **Connection migration.** A QUIC connection is identified by a connection ID, not by the IP address and port, so a phone moving from Wi-Fi to mobile data can keep the same connection instead of starting over.

HTTP/3 is HTTP running over QUIC. A large share of web traffic from big providers (Google, Meta, Cloudflare) already uses it.

## Choosing, in one table

| Need | Use | Why |
|---|---|---|
| Web pages and APIs | TCP (HTTP/1.1, HTTP/2) or QUIC (HTTP/3) | Must be complete and correct |
| Service-to-service calls in a data centre | TCP with long-lived pooled connections (often gRPC over HTTP/2) | Reliable; handshake cost paid once |
| Video and voice calls, live streams, games | UDP (often via WebRTC or custom protocols) | Late data is useless; keep moving |
| DNS lookups | UDP (falls back to TCP for large answers) | One tiny question and answer |
| Mobile apps on unreliable networks | QUIC / HTTP/3 | Fewer round trips, survives network switches |

## What breaks, and what seniors know

- **Connection setup on cold paths.** A request from a phone in another continent on a new connection pays 2–3 long round trips before sending a byte. CDNs and edge servers terminate connections close to users for exactly this reason.
- **Connection limits.** Each open TCP connection costs memory and a file descriptor on the server. Millions of idle phone connections need servers tuned for it.
- **Retransmission timeouts.** If a packet and its retries are lost, TCP waits for a timer that starts around one second and doubles. One unlucky lost packet can turn a 20 ms request into a 1-second one. This is a quiet contributor to tail latency.
- **Middleboxes.** Some corporate firewalls block UDP, so QUIC clients must fall back to TCP.
- **TCP's head-of-line blocking.** One lost packet blocks every stream on the connection, which is why HTTP/2 can be slower than HTTP/1.1 on very lossy networks.

## Interview angles

- "Why is the first request slow?" DNS lookup, TCP handshake, TLS handshake, slow start: several round trips before data.
- "TCP or UDP for a video call?" UDP-based, because freshness beats completeness; explain how the codec tolerates loss.
- "Why does HTTP/3 use UDP?" To fix head-of-line blocking and handshake cost in user space, without waiting for every operating system's TCP to change.

--- revise
### UDP vs TCP
? What does UDP guarantee? :: Almost nothing: no connection, no retries, no ordering, no congestion control. Each message arrives once or not at all.
? When is UDP the right choice? :: When late data is useless (calls, games, live video), for tiny one-shot exchanges (DNS), or to build a new protocol on top (QUIC).
? TCP's four jobs? :: Connection setup, reliability (retransmission), ordering, flow and congestion control.
? Cost of a TCP handshake? :: One round trip (SYN, SYN-ACK, ACK) before the request can be sent.
? What is TCP head-of-line blocking? :: One lost packet holds back all later data on the connection until it is retransmitted.
? Why reuse connections? :: Handshakes cost round trips and new connections start slow (slow start).

### QUIC
? QUIC runs on top of? :: UDP.
? QUIC's three improvements over TCP? :: Combined transport+encryption handshake (1 RTT, 0-RTT on resume), independent streams, connection migration.
? HTTP/3 is? :: HTTP over QUIC.

--- notes
## UDP
Ports + checksum only: no setup, retries, ordering or congestion control.
Use for: voice/video calls, games, live streams, DNS, building new protocols (QUIC).
## TCP
3-way handshake (SYN, SYN-ACK, ACK) = 1 RTT before data.
Sequence numbers + acknowledgements + retransmission = reliable.
In-order delivery causes head-of-line blocking after a loss.
Slow start: begins around 10 packets (~14 KB) and grows; backs off on loss.
Retransmission timeout starts ~1 s and doubles: a tail-latency source.
Reuse connections: keep-alive, pools, warm backend connections.
## QUIC (RFC 9000, 2021)
On UDP; built-in TLS 1.3; 1-RTT setup, 0-RTT on resumption.
Per-stream loss recovery: no cross-stream head-of-line blocking.
Connection ID survives IP changes (Wi-Fi ↔ mobile).
HTTP/3 = HTTP over QUIC; falls back to TCP if UDP is blocked.
## Choosing
APIs/pages: TCP or QUIC · service-to-service: pooled TCP (gRPC/HTTP/2) · real-time media: UDP · DNS: UDP · mobile: QUIC.

--- doubts
Q: If UDP can lose data, how do video calls stay understandable?
A: The audio and video codecs are designed for loss: each packet carries a small slice of time, missing slices are smoothed over (concealment), some streams add redundancy (forward error correction), and the sender adapts its bitrate when it sees loss. Retransmitting would arrive too late to be played, so it is simply not done for most media.

Q: Why does TCP slow down when packets are lost? Isn't that the worst time to slow down?
A: Loss usually means a router's queue is full because too much traffic is trying to cross a link. If every sender kept sending at full speed, the queues would stay full and almost nothing would get through (this "congestion collapse" happened on the early internet in 1986). Backing off on loss lets everyone share the link fairly.

Q: What exactly is a "connection" if packets are independent?
A: It is shared state kept by both ends: the sequence numbers, which bytes were acknowledged, window sizes and timers, stored in the operating system on each side. The network in between knows nothing about it. That is why a server can hold millions of connections only if it has the memory for all that state.

Q: Is 0-RTT always safe?
A: No. Data sent in the very first packet can be captured and **replayed** by an attacker, because the server has not yet confirmed the handshake is fresh. So 0-RTT is only used for requests that are safe to repeat (idempotent ones like a GET); servers refuse it for things like payments.

Q: Do services inside a data centre use QUIC?
A: Mostly not yet. Inside data centres, round trips are short, networks are reliable, and long-lived pooled TCP connections already avoid the handshake cost. QUIC's biggest wins are on the open internet and mobile networks: long round trips, loss and changing networks.

Q: What happens to a TCP connection when my phone switches from Wi-Fi to mobile data?
A: Its IP address changes, and a TCP connection is identified by the two IP addresses and ports, so the connection is dead; the app must reconnect (handshakes again). A QUIC connection is identified by a connection ID, so it can continue after the switch.

--- exercises
[estimate] A user in Sydney opens an HTTPS connection to a server in London (round trip ≈ 280 ms). How long until the first byte of the response arrives with TCP + TLS 1.2, TCP + TLS 1.3, and QUIC, ignoring server time and DNS?
A: TCP handshake 1 RTT, TLS 1.2 2 RTT, then the request/response 1 RTT: 4 × 280 = 1,120 ms. TLS 1.3: 1 + 1 + 1 = 3 RTT = 840 ms. QUIC: 1 (combined) + 1 = 2 RTT = 560 ms; with 0-RTT resumption, 1 RTT = 280 ms. Terminating the connection at a nearby edge server (20 ms away) instead would cut the handshake part to a few tens of milliseconds.

[choose] A multiplayer game sends each player's position 30 times a second. TCP or UDP?
A: UDP. Each update makes the previous one obsolete, so retransmitting a lost update is pointless and TCP's ordering would hold newer positions behind an old lost one (head-of-line blocking), causing visible stutter. Actions that must not be lost (a purchase, a chat message) can go over a separate reliable channel.

[break] A service opens a new TCP connection to its database for every request, at 5,000 requests per second. The database is in the same data centre. What goes wrong?
A: Every request pays a handshake round trip (and often authentication), and the database must create and tear down 5,000 connections per second, each costing CPU and memory; the server also accumulates thousands of sockets in TIME_WAIT. Latency and database CPU rise, and the database may hit its connection limit. Fix: a connection pool that keeps a fixed number of warm connections and reuses them.

[break] A phone app on a train keeps showing "reconnecting…" every few minutes, and each reconnect takes over a second. What is happening and what helps?
A: The phone changes networks or IP addresses (cell towers, Wi-Fi), which kills TCP connections; each reconnect pays DNS, TCP and TLS round trips over a slow mobile link. QUIC (HTTP/3) keeps the connection alive across address changes via its connection ID and resumes with fewer round trips; also keep the app's reconnect logic fast with session resumption.

[design] You are designing live sports score updates to 10 million phones. Which transport and why?
A: Long-lived connections carrying small messages; reliability matters (a missed goal is bad) but freshness matters too. Use a reliable transport (WebSockets or server-sent events over TCP, or HTTP/3 over QUIC on mobile), sending the latest full score in each message so a late message is self-contained. UDP is unnecessary because messages are tiny and infrequent per user; the hard part is the number of connections, not the transport.

--- pitfalls
- Saying UDP is "faster" without saying what is given up (reliability, ordering, congestion control)
- Ignoring connection setup round trips when estimating latency for far-away users
- Opening a new connection per request instead of pooling
- Forgetting that one lost packet stalls everything on a TCP connection
- Using 0-RTT for requests that are not safe to replay

--- quiz
Q: How many round trips does a TCP handshake cost before the client can send its request?
- Zero
- *One
- Two
- Three
W: SYN, SYN-ACK, ACK: the request can go with or right after the final ACK.
Q: Why do video calls usually use UDP-based protocols?
- UDP is encrypted
- *Late media is useless, so retransmission and strict ordering do more harm than good
- TCP cannot carry video
- UDP uses less bandwidth per byte
W: Freshness beats completeness for live media.
Q: What does QUIC fix compared with TCP?
- It removes the need for encryption
- *Head-of-line blocking across streams, and extra handshake round trips
- Packet loss
- The need for IP addresses
W: Streams recover independently and setup takes 1 RTT (0 on resumption).
Q: TCP head-of-line blocking means…
- The first request on a connection is slow
- *A lost packet holds back later data until it is retransmitted
- Only one connection per host is allowed
- Packets are delivered out of order
W: TCP delivers bytes strictly in order.

--- sources
- paper :: RFC 9293: Transmission Control Protocol (TCP) :: IETF :: https://www.rfc-editor.org/rfc/rfc9293
- paper :: RFC 9000: QUIC: A UDP-Based Multiplexed and Secure Transport :: IETF :: https://www.rfc-editor.org/rfc/rfc9000
- paper :: The QUIC Transport Protocol: Design and Internet-Scale Deployment (SIGCOMM 2017) :: Langley et al., Google :: https://research.google/pubs/the-quic-transport-protocol-design-and-internet-scale-deployment/
- book :: High Performance Browser Networking, ch. 2–3 (TCP, UDP) :: Ilya Grigorik :: https://hpbn.co/building-blocks-of-tcp/
- paper :: RFC 6928: Increasing TCP's Initial Window :: IETF :: https://www.rfc-editor.org/rfc/rfc6928

=== http-tls
blurb: The language of the web and how it got faster: HTTP requests and responses, what TLS does to keep them private and authentic, and how HTTP/1.1, HTTP/2 and HTTP/3 differ in connections, multiplexing and head-of-line blocking.
signals: Explaining what happens when you type a URL | Choosing HTTP/2 or HTTP/3 | Deciding where encryption ends (TLS termination) | Debugging slow page loads with many small requests
widgets: hol-blocking
prereq: tcp-udp

--- lesson
:::words
- **HTTP**: the request–response language of the web. The client sends a method (GET, POST…), a path and headers; the server answers with a status code, headers and a body.
- **Header**: a named piece of metadata on a request or response, like `Content-Type: application/json`.
- **Status code**: the three-digit result: 2xx success, 3xx redirect, 4xx the client's fault, 5xx the server's fault.
- **TLS**: Transport Layer Security, the encryption around HTTP that makes it HTTPS.
- **Certificate**: a signed document proving that a public key belongs to a domain name.
- **Multiplexing**: sending several independent conversations over one connection at the same time.
- **Head-of-line blocking**: when one stuck item holds up everything queued behind it.
:::

## The problem in plain words

A web page is not one download. A typical page needs dozens to hundreds of resources: HTML, stylesheets, scripts, images, API calls. How those requests share connections, and how much waiting each causes, decides whether the page appears in half a second or five. Meanwhile, everything must be encrypted so nobody on the coffee-shop Wi-Fi can read or alter it. HTTP is the language of those requests; TLS is the envelope that protects them; the HTTP versions are successive attempts to send many requests faster.

:::eli5
You order food at a counter. HTTP/1.1 is a counter where each cashier takes one order and you must wait for your burger before ordering fries; restaurants open six counters to speed things up. HTTP/2 is one cashier who takes all your orders at once and brings items as they are ready, but if the tray falls, everything waits while it is remade. HTTP/3 brings each item on its own tray, so one dropped tray delays only that item.
:::

## HTTP in one request

```
GET /v1/users/42 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOi...
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=60

{"id": 42, "name": "Ada"}
```

Things worth knowing cold:

- **Methods and their promises.** GET reads and must not change anything (it is *safe*). GET, PUT and DELETE are *idempotent*: repeating them has the same effect as doing them once. POST is neither, which is why retrying a POST needs an idempotency key.
- **Status codes that matter in design**: 200 OK, 201 Created, 204 No Content, 301/302 redirects, 304 Not Modified (your cached copy is still good), 400 bad request, 401 not authenticated, 403 not allowed, 404 not found, 409 conflict, 429 too many requests (rate limited), 500 server error, 502/504 a gateway could not get a good or timely answer from the service behind it, 503 temporarily unavailable.
- **Caching headers.** `Cache-Control: max-age=60` lets browsers and CDNs reuse a response for 60 seconds; `ETag` lets a client ask "has it changed?" and get a tiny 304 if not. Good caching headers are free performance.
- **HTTP is stateless.** Each request stands alone; "being logged in" is carried by a cookie or a token on every request.

## TLS: what it does and what it costs

TLS gives three guarantees: **privacy** (nobody in between can read the data), **integrity** (nobody can change it unnoticed) and **authentication** (you are really talking to example.com, proven by a certificate signed by an authority your device trusts).

How, briefly: during the handshake the client and server use public-key cryptography to agree on a shared secret key that nobody watching can compute; then all data is encrypted with fast symmetric encryption using that key. The server proves its identity by presenting its certificate and signing part of the handshake with the matching private key.

Cost in round trips:

| Version | Handshake | Note |
|---|---|---|
| TLS 1.2 | 2 round trips (after TCP's 1) | Still widely supported |
| TLS 1.3 (2018) | 1 round trip | Faster and removes old weak options |
| TLS 1.3 resumption | 0 round trips (0-RTT data) | Only for requests safe to replay |
| QUIC | TLS 1.3 built into the transport handshake: 1 round trip in total | |

The CPU cost of encryption is small on modern hardware (special processor instructions make it cheap); the round trips are what hurt.

**TLS termination** is the design decision of *where* the encryption ends. Usually at the load balancer or edge proxy: it decrypts, can then read the HTTP request (to route by path, add headers, apply rate limits), and forwards it to backends. Inside the data centre traffic may be re-encrypted (common now, often with mutual TLS where both sides present certificates) or sent plain on a trusted network. Saying where TLS terminates, and why, is a small but real senior signal.

## HTTP/1.1: one request at a time per connection

HTTP/1.1 (1997) can keep a connection open for several requests (keep-alive), but on each connection a response must finish before the next one starts. A slow response blocks everything behind it: **head-of-line blocking at the HTTP level**. Browsers work around it by opening **about six connections per host** and sites used to work around *that* by spreading resources across several domains and bundling files together. Every extra connection costs a handshake and its own slow start.

## HTTP/2: many streams over one connection

HTTP/2 (2015) changed the wire format to binary **frames**, tagged with a stream number. Many requests and responses travel **interleaved over a single TCP connection**, so one slow response no longer blocks the others at the HTTP level. It also compresses headers (HPACK), which matters because the same cookies and headers are sent with every request.

But HTTP/2 inherits TCP's rule that bytes are delivered strictly in order. If one TCP packet is lost, **every stream on the connection waits** for its retransmission, even streams whose data already arrived. On a clean network this rarely matters; on a lossy mobile network it can make HTTP/2 slower than HTTP/1.1's six separate connections.

## HTTP/3: streams that do not wait for each other

HTTP/3 (2022) keeps HTTP/2's ideas but runs on QUIC instead of TCP. QUIC knows about streams, so a lost packet only blocks the stream it belonged to. Add QUIC's faster handshake and connection migration, and HTTP/3 helps most exactly where users suffer most: long distances and lossy mobile networks.

Drop a packet and watch which streams stall in each version:

[[widget:hol-blocking]]

## Design implications

- **Put TLS termination close to users** (CDN or edge) so handshakes are short round trips; carry traffic over warm, long-lived connections from there.
- **Prefer HTTP/2 or HTTP/3 for browsers and apps**; you no longer need to bundle or shard domains for performance.
- **Use gRPC (HTTP/2) for service-to-service** calls: one long-lived multiplexed connection per pair of services.
- **Set caching headers deliberately**; the fastest request is the one never sent.
- **Watch request fan-out on pages**; even with HTTP/2, 300 requests per page means 300 chances for a slow one.

## Interview angles

- "What happens when you type google.com into a browser?" DNS lookup, TCP (or QUIC) handshake, TLS handshake with certificate check, HTTP request, possibly redirects, response, then the browser fetching sub-resources over the same connection.
- "Where do you terminate TLS?" At the edge or load balancer, so it can route on HTTP and keep handshakes short; re-encrypt internally (mTLS) if the threat model needs it.
- "Why HTTP/3?" Faster setup and no cross-stream head-of-line blocking; best on lossy, high-latency networks.

--- revise
### HTTP
? Safe vs idempotent methods? :: Safe (GET) changes nothing; idempotent (GET, PUT, DELETE) can be repeated with the same effect; POST is neither.
? 429, 502, 503, 504? :: Rate limited; bad answer from upstream; temporarily unavailable; upstream timed out.
? What do Cache-Control and ETag give you? :: Reuse without asking (max-age) and cheap revalidation (304 Not Modified).

### TLS
? TLS's three guarantees? :: Privacy, integrity, server authentication (certificate).
? Handshake round trips: TLS 1.2, TLS 1.3, resumption? :: 2, 1, 0 (0-RTT only for replay-safe requests).
? What is TLS termination? :: The point where traffic is decrypted, usually the edge or load balancer, so it can route on HTTP.

### Versions
? HTTP/1.1's limitation? :: One response at a time per connection; browsers open ~6 connections per host.
? What does HTTP/2 add? :: Binary frames, many interleaved streams on one TCP connection, header compression.
? HTTP/2's remaining problem? :: TCP head-of-line blocking: one lost packet stalls all streams.
? HTTP/3 runs on? :: QUIC, so a loss stalls only its own stream.

--- notes
## HTTP basics
Request: method, path, headers, body. Response: status, headers, body.
GET safe; GET/PUT/DELETE idempotent; POST neither (use idempotency keys).
2xx ok · 3xx redirect · 304 not modified · 4xx client · 401 unauthenticated · 403 forbidden · 409 conflict · 429 rate limited · 5xx server · 502/504 upstream bad/slow · 503 unavailable.
Cache-Control max-age, ETag + If-None-Match → 304.
Stateless: login travels with every request (cookie or token).
## TLS
Privacy, integrity, authentication via certificates.
Public-key handshake agrees a symmetric key; bulk data uses fast symmetric crypto.
TLS 1.2: 2 RTT · TLS 1.3: 1 RTT · resumption: 0-RTT (replay risk).
Terminate at the edge/LB to route on HTTP; mTLS inside if needed.
## Versions
HTTP/1.1 (1997): keep-alive, one response at a time, ~6 connections per host.
HTTP/2 (2015): binary frames, multiplexed streams, HPACK; TCP head-of-line blocking remains.
HTTP/3 (2022): over QUIC; per-stream loss recovery; 1-RTT setup; migration.
## Design
Terminate TLS near users · HTTP/2 or 3 for clients · gRPC for services · cache headers · limit per-page fan-out.

--- doubts
Q: If HTTP/2 uses one connection, isn't that a single point of failure?
A: It is a single path, and that is a real trade-off: one lost packet affects every stream, and if the connection drops, all in-flight requests fail together and are retried. In exchange you pay one handshake and one slow start instead of six. HTTP/3 removes the first problem; clients handle the second by reconnecting and retrying idempotent requests.

Q: Why does the browser open six connections for HTTP/1.1 and not 100?
A: Each connection costs a handshake, server memory and its own congestion control; too many from one client is unfair to others and can look like an attack. Six was a compromise browsers settled on. HTTP/2 makes it unnecessary.

Q: Is HTTPS slower than HTTP?
A: Slightly, at connection setup (the TLS round trips), and almost not at all afterwards, since symmetric encryption is cheap on modern CPUs. With TLS 1.3, session resumption and HTTP/2 or 3, the difference is negligible, and browsers only enable HTTP/2 and HTTP/3 over encrypted connections anyway.

Q: What does a certificate actually prove?
A: That whoever controls the matching private key has been verified (by a certificate authority your device trusts) to control that domain name. It does not prove the site is honest, only that you are talking to the real owner of the name, not someone in the middle.

Q: Why would a load balancer decrypt traffic? Isn't that less secure?
A: To read the HTTP request: route by path or header, apply rate limits and authentication, add tracing headers, compress responses. The load balancer is part of your trusted infrastructure, so decrypting there is normal; the private key lives in it (or in a hardware module). If the internal network is not trusted, it re-encrypts to the backends.

Q: What is the difference between 502 and 504?
A: Both come from a proxy or gateway about the service behind it. 502 Bad Gateway: the service answered with something invalid or closed the connection. 504 Gateway Timeout: the service did not answer in time. Seeing which one you get tells you whether to look for crashes or for slowness.

--- exercises
[estimate] A page needs 60 small resources from one host, each 20 ms to serve once requested. The round trip is 100 ms. Roughly compare HTTP/1.1 with 6 connections versus HTTP/2 with one connection, after the connections exist.
A: HTTP/1.1: 60 requests over 6 connections = 10 sequential rounds per connection, each ≈ 100 ms round trip + 20 ms = ~1.2 s. HTTP/2: all 60 requests are sent at once on one connection; responses stream back after about one round trip plus serving time: ~150–200 ms if bandwidth is not the limit. Multiplexing removes the per-request round-trip queue.

[break] A mobile app moved from HTTP/1.1 to HTTP/2 and got slower on poor networks, while faster on Wi-Fi. Why?
A: On lossy networks, one lost TCP packet on the single HTTP/2 connection stalls every stream until it is retransmitted, whereas HTTP/1.1's six connections fail independently. Fix: HTTP/3 (QUIC), where loss stalls only the affected stream.

[choose] Where would you terminate TLS for a public API served from three regions behind a global load balancer, and why?
A: At the edge of the global load balancer, close to users, so the TLS handshake round trips are short and the load balancer can route by path and apply rate limits and authentication. From the edge to each region, traffic travels over long-lived, re-encrypted connections on the provider's backbone (often mutual TLS). Backends never handle public handshakes.

[design] Name the caching headers you would set for (a) a user's profile JSON, (b) a versioned JavaScript bundle `app.3f9c2.js`, (c) a bank balance.
A: (a) `Cache-Control: private, max-age=30` plus an ETag: the browser can reuse it briefly and revalidate cheaply, while shared caches must not store it. (b) `Cache-Control: public, max-age=31536000, immutable`: the file name changes whenever the content does, so it can be cached for a year everywhere. (c) `Cache-Control: no-store`: never cache sensitive, rapidly changing data.

[estimate] A client makes a fresh HTTPS connection with TLS 1.2 over TCP to a server 150 ms away (round trip) and sends one request. How long until the response starts arriving, versus TLS 1.3?
A: TLS 1.2: 1 (TCP) + 2 (TLS) + 1 (request) = 4 × 150 = 600 ms. TLS 1.3: 1 + 1 + 1 = 450 ms. With HTTP/3 over QUIC: 2 × 150 = 300 ms. With 0-RTT resumption: 150 ms.

--- pitfalls
- Retrying POST requests without an idempotency key
- Treating HTTP/2 as strictly better than HTTP/1.1 on lossy networks
- Forgetting the TLS handshake round trips in latency estimates
- Not deciding where TLS terminates (and whether internal traffic is re-encrypted)
- Ignoring cache headers and sending requests that could have been avoided

--- quiz
Q: Which HTTP method is idempotent but not safe?
- GET
- *PUT
- POST
- PATCH (always)
W: PUT changes state, but repeating it gives the same result.
Q: HTTP/2 multiplexes streams over one connection, but still suffers from…
- No header compression
- *TCP head-of-line blocking when a packet is lost
- Six-connection limits
- No support for encryption
W: TCP delivers bytes in order, so all streams wait for a retransmission.
Q: A TLS 1.3 handshake costs how many round trips after TCP's?
- 0
- *1
- 2
- 3
W: TLS 1.3 halved TLS 1.2's two round trips; resumption can send data with 0.
Q: A gateway returns 504. What happened?
- The client sent a bad request
- The client is rate limited
- *The service behind the gateway did not respond in time
- The service returned invalid data
W: 504 is a gateway timeout; 502 is a bad response.

--- sources
- paper :: RFC 9110: HTTP Semantics :: IETF :: https://www.rfc-editor.org/rfc/rfc9110
- paper :: RFC 9113: HTTP/2 :: IETF :: https://www.rfc-editor.org/rfc/rfc9113
- paper :: RFC 9114: HTTP/3 :: IETF :: https://www.rfc-editor.org/rfc/rfc9114
- paper :: RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3 :: IETF :: https://www.rfc-editor.org/rfc/rfc8446
- book :: High Performance Browser Networking, ch. 4 (TLS) and ch. 12 (HTTP/2) :: Ilya Grigorik :: https://hpbn.co/transport-layer-security-tls/

=== dns
blurb: How a name like maps.google.com becomes an IP address: the chain of resolvers and servers involved, caching and TTLs, the record types that matter, and how DNS is used (and limited) for routing users to the nearest data centre and for failover.
signals: Explaining the first step of any request | Routing users to the nearest region | Planning a migration or failover by changing DNS | Debugging "some users still hit the old servers"
widgets: seq-dns
prereq: tcp-udp

--- lesson
:::words
- **Domain name**: a human-readable name such as maps.google.com.
- **DNS**: the Domain Name System, which turns names into IP addresses.
- **Resolver (recursive resolver)**: the server that does the lookup work on your behalf, usually run by your internet provider or a public service like 8.8.8.8.
- **Authoritative server**: the server that holds the official records for a domain.
- **Record**: one entry in DNS, such as "maps.google.com has address 142.250.72.14".
- **TTL (time to live)**: how many seconds a DNS answer may be cached and reused.
- **Anycast**: announcing the same IP address from many places so each user reaches the closest one.
:::

## The problem in plain words

Computers connect to numbers (IP addresses), but people and links use names. Something must translate, billions of times a second, for every website and API in the world, with no single machine that could possibly handle it. DNS does this with a **hierarchy** (nobody knows everything; everyone knows who to ask next) and **caching everywhere** (most answers are reused rather than looked up). Understanding it explains why changing a DNS record does not take effect instantly, and how big services send you to a nearby data centre.

:::eli5
Looking up a name is like asking for a phone number in a giant organisation. You ask the receptionist (your resolver). If she doesn't know, she phones head office (a root server), which says "Engineering handles .com, here's their number". Engineering says "google.com's own office has it", and that office finally gives the number. The receptionist writes it on a sticky note so next time she can answer straight away, until the note's expiry time (the TTL).
:::

## The lookup, step by step

When your browser needs `maps.google.com`:

1. **Local caches.** The browser and the operating system check their own caches. A hit costs nothing.
2. **Recursive resolver.** Otherwise the OS asks the configured resolver. If it has a cached answer, it replies immediately (most lookups end here).
3. **Root servers.** On a full miss, the resolver asks a root server, which does not know the address but replies with the servers responsible for `.com`.
4. **Top-level domain (TLD) servers.** The `.com` servers reply with the servers responsible for `google.com`.
5. **Authoritative servers.** Google's own name servers return the actual record for `maps.google.com`, with a TTL.
6. **Caching on the way back.** The resolver caches every answer (including "who handles .com") for its TTL and returns the address to you.

Step through a cold lookup, then a warm one:

[[widget:seq-dns]]

A cold lookup can take tens to a couple of hundred milliseconds; a cached one at the resolver typically a few milliseconds to tens of milliseconds, and an OS-cached one almost nothing. The root and TLD answers change rarely and have long TTLs, so even "cold" lookups usually skip straight to the authoritative step.

There are only 13 root server *names* (a.root-servers.net to m.root-servers.net), but each is served from many locations using anycast, well over a thousand instances worldwide, so the root is neither a bottleneck nor a single point of failure.

## Records worth knowing

| Type | Meaning | Example use |
|---|---|---|
| A | Name → IPv4 address | `api.example.com → 203.0.113.10` |
| AAAA | Name → IPv6 address | Same, for IPv6 |
| CNAME | Name → another name (an alias) | `www.example.com → example.cdn-provider.net` to hand a site to a CDN |
| NS | Which servers are authoritative for a zone | Delegating `example.com` to your DNS provider |
| MX | Mail servers for a domain | Email delivery |
| TXT | Free text | Domain ownership verification, email security policies |

## TTLs: the knob that trades speed of change for load

Every answer carries a TTL in seconds. While it lasts, resolvers and clients reuse the answer without asking again.

- **Long TTL (hours to a day)**: fewer lookups, faster for users, less load on your DNS; but a change (a new IP, a failover) takes up to the TTL to reach everyone.
- **Short TTL (30–60 s)**: changes spread quickly; more lookups and slightly more latency.

Practical habit for migrations: **lower the TTL a day or two before** the planned change (so old long-TTL answers expire), make the change, then raise it again. And remember the uncomfortable truth: some clients and resolvers **ignore TTLs** and keep old answers longer, so the old servers must keep working for a while after any DNS change.

## DNS as a traffic router

Because the authoritative server chooses the answer, it can give **different answers to different askers**:

- **GeoDNS / latency-based DNS**: answer with the IP of the region closest to the resolver asking. A user in Germany gets the Frankfurt address; a user in Japan gets Tokyo's.
- **Weighted answers**: send 5% of lookups to a new cluster (a crude canary).
- **Health-checked answers**: stop handing out the IP of a region that failed its health checks.

Limits to know: the authoritative server sees the *resolver's* location, not the user's (an extension called EDNS Client Subnet passes part of the user's address to help); and failover is only as fast as TTLs and misbehaving caches allow, so DNS failover takes **minutes**, not seconds.

## Anycast: routing without DNS tricks

With anycast, many sites announce the **same IP address** to the internet's routers, and each user's packets naturally flow to the nearest site (in network terms). There is nothing to cache and no TTL to wait for: if a site goes down, it stops announcing the address and traffic shifts within seconds to tens of seconds as routes update. Big DNS providers, CDNs and global load balancers (such as Google Cloud's global load balancer, which exposes one anycast IP worldwide) rely on it. Most designs combine the two: anycast or GeoDNS to reach a nearby edge, then the provider's own network to the right region.

## What breaks

- **DNS outages are total outages.** If your authoritative DNS is unreachable, nobody can find you once caches expire. Use a provider with anycast and redundancy, or two providers.
- **Slow failover.** A design that says "on failure, switch DNS" must accept minutes of partial outage.
- **Stale answers after migration.** Keep old endpoints alive and redirecting until traffic drains.
- **Lookup latency on cold paths.** Mobile apps and browsers pre-resolve important names; services cache lookups too.

## Interview angles

- "What happens when you type a URL?" Start with DNS: caches, resolver, root, TLD, authoritative, TTL.
- "How do users reach the nearest data centre?" GeoDNS or anycast, and their failover speeds.
- "Why are some users still hitting the old IP an hour later?" TTLs, resolvers and clients that ignore them; keep the old path working.

--- revise
### The chain
? Order of a full DNS lookup? :: Browser/OS cache → recursive resolver → root → TLD (.com) → authoritative → answer cached on the way back.
? What does a root server answer? :: Not the address: a referral to the servers for the TLD.
? How can 13 root names handle the whole internet? :: Each is anycast from many locations (1,000+ instances), and answers are cached heavily.

### Records and TTLs
? A vs CNAME? :: A maps a name to an IPv4 address; CNAME maps a name to another name (alias).
? Trade-off of a long TTL? :: Fewer lookups and faster responses, but changes take up to the TTL to reach everyone.
? Migration habit? :: Lower the TTL a day or two before the change, change, then raise it; keep the old endpoint working.

### Routing
? GeoDNS? :: The authoritative server answers with the IP of the region closest to the asker.
? Why is DNS failover slow? :: Cached answers live until their TTL, and some clients ignore TTLs: minutes, not seconds.
? Anycast? :: The same IP announced from many sites; the network routes each user to the nearest; failover in seconds.

--- notes
## Lookup chain
Browser/OS cache → recursive resolver (ISP or 8.8.8.8) → root → TLD → authoritative.
Root/TLD answers have long TTLs, so cold lookups usually start at the authoritative step.
Cold lookup tens–hundreds of ms; resolver hit a few–tens of ms; OS hit ~0.
13 root names, 1,000+ anycast instances.
## Records
A (IPv4) · AAAA (IPv6) · CNAME (alias, used to hand a site to a CDN) · NS (delegation) · MX (mail) · TXT (verification, policies).
## TTL
Long TTL: fewer lookups, slow changes.
Short TTL (30–60 s): fast changes, more lookups.
Lower before migrations; some clients ignore TTLs, so keep old endpoints alive.
## Routing with DNS
GeoDNS / latency-based answers; weighted answers for canaries; health-checked answers.
The server sees the resolver's location (EDNS Client Subnet helps).
DNS failover takes minutes.
## Anycast
One IP from many sites; nearest wins by routing; failover in seconds; used by DNS providers, CDNs, global LBs.
## Failure
Authoritative DNS down = you vanish once caches expire: use redundant, anycast DNS.

--- doubts
Q: Why doesn't my resolver just ask Google's servers directly?
A: It does not know which servers are Google's until it asks. The hierarchy is how it finds out: the root knows who runs .com, .com knows who runs google.com. In practice the resolver caches those referrals for days, so it does go almost directly to Google's servers after the first time.

Q: Is DNS over UDP or TCP?
A: Mostly UDP on port 53, because a lookup is one small question and one small answer. If an answer is too big for one packet, the server signals truncation and the client retries over TCP. Encrypted variants exist too: DNS over HTTPS and DNS over TLS, which hide lookups from people on the network.

Q: If I set a TTL of 60 seconds, will all traffic move within a minute of a change?
A: Most of it, not all. Some resolvers enforce a minimum TTL, some clients (older Java versions were famous for this) cache answers for the life of the process, and long-lived connections opened before the change keep going to the old address. Plan for a tail of traffic lasting much longer, and keep the old endpoint working.

Q: Can DNS do load balancing?
A: Crudely. Returning several IPs (round-robin DNS) spreads clients across them, but DNS knows nothing about server load or health unless the DNS provider runs health checks, and caching means it cannot react quickly. Use DNS (or anycast) to choose a region or edge, and real load balancers inside it.

Q: What is the difference between GeoDNS and anycast?
A: GeoDNS gives different users different IP addresses, chosen by where their resolver appears to be; changes are limited by TTLs. Anycast gives everyone the same IP address and lets internet routing deliver each user's packets to the nearest site; it reacts in seconds but gives you less control over exactly which site a user reaches.

--- exercises
[design] You are moving api.example.com from an old data centre to the cloud on Saturday. Write the DNS plan.
A: Monday: lower the record's TTL from 1 day to 60 seconds (old cached answers expire within a day). Saturday: bring up the new endpoint, test it directly, then change the A/CNAME record. Keep the old data centre serving (or proxying to the new one) for at least a few days, watching its traffic fall toward zero; clients that ignore TTLs and long-lived connections take a while. After traffic is gone, raise the TTL again.

[estimate] Your authoritative DNS answers with a 300-second TTL. 50M users each resolve your name once per TTL period while active, but resolvers are shared: on average 1,000 users per resolver. Roughly how many queries per second reach your authoritative servers?
A: Distinct resolvers ≈ 50M / 1,000 = 50,000. Each asks once per 300 s: 50,000 / 300 ≈ 170 queries per second. Caching at resolvers cuts authoritative load by roughly the number of users sharing each resolver, which is why DNS scales.

[break] A team's failover plan for a regional outage is "update DNS to point at the other region". During a drill, 20% of users still fail 30 minutes later. Why, and what would make failover faster?
A: Cached DNS answers (TTL longer than expected, resolvers enforcing minimum TTLs, clients caching indefinitely) and long-lived connections still point to the dead region. Faster options: anycast or a global load balancer with one stable IP that shifts traffic in seconds; shorter TTLs with health-checked DNS answers; clients that retry other regions on connection failure.

[choose] A gaming company wants players routed to the nearest of 8 regions and to fail away from a region within 30 seconds. GeoDNS or anycast?
A: Anycast (or a global load balancer built on it). GeoDNS failover is bounded by TTLs and misbehaving caches, often minutes. Anycast withdraws the failed region's route and traffic shifts in seconds. Note: anycast keeps the IP stable, so session state must survive a player being moved to another region (or the game must reconnect gracefully).

--- pitfalls
- Assuming DNS changes take effect immediately everywhere
- Using DNS as the only failover mechanism when seconds matter
- Forgetting that the old endpoint must keep working after a migration
- Running authoritative DNS without redundancy
- Treating round-robin DNS as real load balancing

--- quiz
Q: In a full lookup, what does the .com TLD server return?
- The IP of maps.google.com
- *The name servers responsible for google.com
- The root servers
- A certificate
W: Each level refers you to the next; only the authoritative server holds the final record.
Q: Why lower a record's TTL before a migration?
- To make DNS cheaper
- *So cached copies of the old answer expire quickly once you change it
- Browsers require it
- To increase cache hit rate
W: A long TTL keeps the old answer alive in caches until it expires.
Q: Which reacts fastest when a region fails?
- *Anycast
- GeoDNS with a 1-hour TTL
- Round-robin DNS
- Changing the CNAME
W: Anycast shifts traffic as routes update, in seconds; DNS waits for caches.
Q: A CNAME record maps…
- A name to an IPv4 address
- *A name to another name
- A name to mail servers
- An IP to a name
W: It is an alias, often used to point a domain at a CDN.

--- sources
- paper :: RFC 1034: Domain Names – Concepts and Facilities :: IETF :: https://www.rfc-editor.org/rfc/rfc1034
- paper :: RFC 1035: Domain Names – Implementation and Specification :: IETF :: https://www.rfc-editor.org/rfc/rfc1035
- article :: Root Servers :: IANA :: https://www.iana.org/domains/root/servers
- article :: What is DNS? How DNS works :: Cloudflare Learning Center :: https://www.cloudflare.com/learning/dns/what-is-dns/
- paper :: RFC 7871: Client Subnet in DNS Queries :: IETF :: https://www.rfc-editor.org/rfc/rfc7871

=== api-styles
blurb: REST, gRPC and GraphQL compared the way an interviewer expects: what each one is, how a request looks, where each shines and hurts, and which to choose for public APIs, internal services, mobile apps and streaming.
signals: Choosing how clients and services talk to each other | "Why gRPC internally?" | A mobile screen needs data from many services | You need streaming between services
prereq: http-tls

--- lesson
:::words
- **REST**: a style of HTTP API built around *resources* (things with URLs, like `/users/42`) and the standard HTTP methods.
- **gRPC**: Google's framework for calling a function on another service as if it were local, sending compact binary messages over HTTP/2.
- **Protocol Buffers (protobuf)**: Google's compact binary data format, described by a schema file that both sides compile into code.
- **GraphQL**: an API style where the client sends a query listing exactly the fields it wants and gets just those back.
- **Schema**: the formal description of the data and operations an API offers.
- **Serialisation**: turning in-memory data into bytes to send (JSON text, or protobuf binary).
- **Streaming**: sending a sequence of messages over one call instead of one request and one response.
:::

## The problem in plain words

Every system is many programs talking to each other: phones to your backend, your services to each other, partners to your public API. They need a shared language: how to name an operation, how to pack the data, how to report errors, how to evolve without breaking old clients. REST, gRPC and GraphQL are three popular answers, each tuned for a different situation. Picking one is a design decision you should justify in one sentence.

:::eli5
REST is like a library where every book has an address on a shelf and you can only take, return, replace or remove books. gRPC is like phoning a colleague and asking them to do a specific task, in a compact shorthand you both learned. GraphQL is like handing a librarian a shopping list ("from this book, only chapter 2; from that one, only the index") and getting back exactly that in one bag.
:::

## REST

Resources have URLs; HTTP methods say what to do with them:

```
GET    /v1/users/42            read a user
POST   /v1/users               create a user
PATCH  /v1/users/42            change some fields
DELETE /v1/users/42            delete
GET    /v1/users/42/orders?limit=20&cursor=abc
```

**Strengths.** Universal (every language and tool speaks HTTP and JSON), human-readable, easy to debug with a browser or curl, and it uses the web's built-in machinery: **HTTP caching** (CDNs and browsers can cache GET responses), status codes, and standard authentication headers. Ideal for **public APIs**.

**Weaknesses.** JSON is verbose and slow to parse compared with binary formats. A screen often needs several resources, so a client makes several round trips (**under-fetching**), or the server returns big objects with fields the client does not need (**over-fetching**). There is no enforced schema unless you add one (OpenAPI).

## gRPC

You describe services and messages in a `.proto` file; tools generate client and server code in each language:

```
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc WatchOrders(WatchRequest) returns (stream OrderEvent);   // server streaming
}
message GetUserRequest { int64 user_id = 1; }
```

**Strengths.**
- **Compact and fast**: protobuf messages are typically several times smaller than the same JSON and much cheaper to parse.
- **Strong contracts**: the schema is the source of truth; changing a field type breaks compilation, not production. Field numbers make adding fields backward compatible.
- **Streaming in both directions**: unary (one request, one response), server streaming, client streaming and bidirectional streaming, all over one HTTP/2 connection.
- **Deadlines and cancellation built in**: a caller sets a deadline, and it propagates down the chain of calls, so work stops when nobody is waiting any more.

**Weaknesses.** Binary messages are not human-readable; browsers cannot call gRPC directly (they need gRPC-Web through a proxy); HTTP caching does not apply. That is why gRPC dominates **service-to-service** traffic inside companies (Google's internal RPC system, Stubby, is its ancestor) while public APIs stay mostly REST.

## GraphQL

One endpoint; the client sends a query describing the shape it wants:

```
query {
  user(id: 42) {
    name
    avatarUrl
    orders(first: 3) { id total }
  }
}
```

The server's schema defines types and fields; **resolvers** fetch each field from wherever it lives.

**Strengths.** One round trip per screen, exactly the fields needed, which is valuable for **mobile apps** on slow networks and for front-end teams that iterate quickly without waiting for new endpoints. The schema is typed and self-documenting.

**Weaknesses.**
- **The N+1 problem**: resolving `orders` for each of 50 users can trigger 50 separate database queries. Fix with batching (the DataLoader pattern: collect all IDs requested in one tick and fetch them in one query).
- **Caching is harder**: queries usually go as POST to one URL, so CDNs cannot cache them by URL. Persisted queries (the client sends a hash of a known query) help.
- **Expensive queries**: a client can ask for deeply nested data. Servers limit query depth and cost, and rate limit by cost, not by request count.

## Choosing

| Situation | Choice | One-line reason |
|---|---|---|
| Public API for third parties | REST (with OpenAPI) | Universal, cacheable, easy to adopt |
| Internal service-to-service | gRPC | Fast, typed contracts, streaming, deadlines |
| Mobile or web app aggregating many services | GraphQL (or a per-client "backend for frontend") | One round trip, client-shaped responses |
| Server pushing updates to browsers | WebSockets or server-sent events (see the real-time page) | Request–response styles are not push |
| Bulk data between systems | Files or streams (object storage, a log), not RPC | Throughput, retries and replay |

Mixing is normal: GraphQL or REST at the edge for clients, gRPC between services behind it.

## Evolving an API without breaking clients

Whatever the style, old clients keep running for months or years (nobody updates their phone app on your schedule). Rules that work everywhere:

- **Add, never change or remove**: new optional fields are safe; renaming, retyping or removing fields breaks someone.
- **Protobuf**: never reuse a field number; mark removed fields `reserved`.
- **Version for breaking changes** (`/v2/…` for REST, a new package version for gRPC), and run both versions while clients migrate.
- **Tolerant readers**: clients ignore fields they do not recognise.

## Interview angles

- "Why gRPC between services?" Smaller, faster messages; a compiled contract; streaming; deadlines that propagate.
- "Why not GraphQL everywhere?" Caching, N+1 queries and query-cost control get harder; it pays off at the client edge, not between internal services.
- "How do you change an API used by old mobile clients?" Additive changes, versioning for breaking ones, running versions side by side.

--- revise
### What each is
? REST in one line? :: Resources with URLs plus standard HTTP methods; usually JSON; uses HTTP caching and status codes.
? gRPC in one line? :: Typed remote calls defined in .proto files, protobuf messages over HTTP/2, with streaming and deadlines.
? GraphQL in one line? :: One endpoint; the client queries exactly the fields it needs; resolvers fetch each field.

### Trade-offs
? Why is REST the default for public APIs? :: Universal tooling, human-readable, cacheable by CDNs and browsers.
? Why gRPC internally? :: Compact fast messages, compiled contracts, streaming, propagating deadlines.
? gRPC's limits? :: Not human-readable, no direct browser support (needs gRPC-Web), no HTTP caching.
? GraphQL's N+1 problem and fix? :: Per-item resolvers trigger one query each; batch with DataLoader.
? Why is GraphQL caching hard? :: Queries usually go as POST to one URL; use persisted queries.
? Rules for evolving an API? :: Add, never change or remove; never reuse protobuf field numbers; version breaking changes; tolerant readers.

--- notes
## REST
Resources + methods; JSON; status codes; HTTP caching; OpenAPI for a schema.
Problems: over-fetching, under-fetching (many round trips), verbose JSON.
## gRPC
.proto schema → generated code; protobuf binary; HTTP/2.
Unary, server-streaming, client-streaming, bidirectional.
Deadlines propagate; cancellation.
Not browser-native (gRPC-Web proxy); no HTTP caching; not human-readable.
Descends from Google's internal Stubby.
## GraphQL
One endpoint; client-shaped queries; typed schema; resolvers.
N+1 → DataLoader batching.
Caching → persisted queries.
Expensive queries → depth and cost limits, cost-based rate limits.
## Choose
Public: REST · internal: gRPC · client aggregation: GraphQL or BFF · push: WebSockets/SSE · bulk: files/logs.
## Evolve
Additive changes · reserved protobuf numbers · version breaking changes · run old and new together · ignore unknown fields.

--- doubts
Q: Is REST just "HTTP with JSON"?
A: In everyday use, roughly yes. Strictly, REST is an architectural style (Roy Fielding's 2000 dissertation) with constraints like statelessness and uniform resource interfaces; most "REST APIs" follow only part of it. In interviews, "a resource-oriented HTTP API with JSON" is what people mean.

Q: Why is protobuf smaller than JSON?
A: JSON repeats every field name as text in every message and writes numbers as text. Protobuf sends a small field number instead of the name and encodes numbers in compact binary (small numbers take one byte). Both sides know the schema, so the names never need to travel.

Q: Can I use GraphQL between microservices?
A: You can, but it rarely pays. Internal callers know exactly what they need, benefit from gRPC's speed and contracts, and do not suffer from mobile round trips. GraphQL's flexibility is most valuable where many different clients (screens, app versions) need differently shaped data.

Q: What is a "backend for frontend" (BFF)?
A: A small service per client type (iOS app, web app) that calls the internal services and returns exactly what that client's screens need. It solves the same over/under-fetching problem as GraphQL, with ordinary code instead of a query language, at the cost of maintaining one backend per client.

Q: How do deadlines in gRPC actually help?
A: If a user request has a 300 ms budget and passes through four services, each call carries the remaining time. When the deadline passes, every service down the chain stops working on it, instead of finishing work nobody will use. This prevents slowdowns from piling up work across the system.

--- exercises
[choose] A partner company wants to integrate with your payments platform. They use many different languages. Which API style, and what would you add to it?
A: REST over HTTPS with JSON, described by an OpenAPI spec so partners can generate clients in any language. Add idempotency keys on POST (payments must not double-charge), cursor pagination, clear error codes, rate-limit headers, versioning in the path (/v1/), and webhooks for asynchronous events (payment succeeded).

[break] A GraphQL query lists 100 posts with their authors' names, and the database sees 101 queries per request. Why, and how do you fix it?
A: The N+1 problem: one query fetches the 100 posts, then the author resolver runs once per post and queries the users table each time. Fix with batching: the resolver registers each author ID, and a DataLoader collects all IDs requested in the same tick and loads them with one `WHERE id IN (...)` query (plus per-request caching of duplicates). Two queries instead of 101.

[design] Service A calls B, which calls C and D. A user-facing request has a 200 ms budget. How do you stop B, C and D from doing useless work when the user has already given up?
A: Use deadline propagation (gRPC does this natively): A sets a 200 ms deadline; B's calls to C and D carry the remaining time (minus a safety margin); each service checks the deadline before starting expensive work and gives up when it passes; cancellation propagates when the caller disconnects. Without it, retries and abandoned requests keep consuming capacity during overload.

[choose] A mobile app's home screen needs data from 6 internal services. On a 300 ms-round-trip mobile network it takes 2 seconds to load. What would you change?
A: Stop making 6 round trips from the phone. Add an aggregation layer near the services, either a BFF endpoint for the home screen or a GraphQL layer, which calls the 6 services in parallel inside the data centre (a few ms each) and returns one response. The phone pays one round trip (~300 ms) plus the slowest internal call.

--- pitfalls
- Choosing gRPC for a public API used from browsers without a gRPC-Web plan
- Using GraphQL without batching (N+1 queries) or query-cost limits
- Breaking old clients by renaming or removing fields
- Reusing protobuf field numbers
- Many sequential REST calls from a mobile client over a slow network

--- quiz
Q: Which is the strongest reason to use gRPC between internal services?
- It is human-readable
- Browsers support it natively
- *Compact binary messages, compiled contracts, streaming and propagating deadlines
- It is cacheable by CDNs
W: Those properties matter most for high-volume internal traffic.
Q: The GraphQL N+1 problem is solved by…
- More endpoints
- *Batching resolver lookups (DataLoader)
- Switching to REST
- Caching at the CDN
W: Collect IDs requested together and fetch them in one query.
Q: Which change to a protobuf message is safe for old clients?
- Changing a field's type
- Reusing a removed field's number
- *Adding a new optional field with a new number
- Renaming the message's package
W: Old readers simply ignore the unknown field.
Q: Why is REST usually chosen for public APIs?
- It is the fastest format
- *Universal tooling, readability and HTTP caching
- It supports bidirectional streaming
- It has no versioning problems
W: Ease of adoption by many different clients dominates.

--- sources
- article :: Architectural Styles and the Design of Network-based Software Architectures, ch. 5 (REST) :: Roy T. Fielding :: https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm
- article :: gRPC: Introduction and core concepts :: gRPC Authors :: https://grpc.io/docs/what-is-grpc/core-concepts/
- article :: Protocol Buffers: encoding :: Google :: https://protobuf.dev/programming-guides/encoding/
- article :: GraphQL: Introduction and best practices :: GraphQL Foundation :: https://graphql.org/learn/
- tool :: DataLoader :: GraphQL Foundation :: https://github.com/graphql/dataloader

=== api-design
blurb: The details that separate a toy API from a production one: resource naming, cursor pagination, idempotency keys for safe retries, versioning, consistent errors, rate-limit signals and long-running operations.
signals: Writing the API section of a design | A client retries and creates duplicates | Paginating a feed or list | Exposing an operation that takes minutes
prereq: api-styles

--- lesson
:::words
- **Idempotent**: doing it twice has the same effect as doing it once.
- **Idempotency key**: a unique ID the client sends with a request so the server can recognise a retry and not repeat the work.
- **Pagination**: returning a long list in pages.
- **Cursor**: an opaque bookmark that says where the next page starts.
- **Versioning**: marking incompatible API changes with a new version so old clients keep working.
- **Long-running operation**: a request whose work takes longer than a client should wait, handled by returning a job to check on later.
:::

## The problem in plain words

A real API is used by thousands of clients you do not control, over networks that drop requests, for years. Clients retry when they see a timeout (and the original request may actually have succeeded). Lists change while users page through them. Some operations take minutes. Old app versions never update. API design is the set of habits that keeps all of that correct. Interviewers notice these habits in your API section even when you mention them in one line each.

:::eli5
Ordering from a restaurant over a crackly phone line: if you are not sure they heard you, you call back and say "this is order number 17 again". Because you used the same order number, they don't cook a second meal. That number is an idempotency key.
:::

## Naming resources

- Nouns for resources, plural collections: `/v1/users/42/orders/7`, not `/getOrderForUser?id=…`.
- Standard methods for standard actions; a **custom method** when nothing fits: Google's convention is `POST /v1/orders/7:cancel`.
- Consistent field names and types across the API (`create_time` everywhere, timestamps in one format, IDs as strings so they survive JavaScript's number limits).

## Pagination: cursors, not offsets

`GET /v1/feed?limit=20` returns 20 items and a `next_page_token`. The next call passes it back: `GET /v1/feed?limit=20&page_token=…`.

Why not `?page=7` or `?offset=140`?

- **Correctness**: if 5 new posts arrive while you read page 1, offset 20 now starts 5 items earlier, so you see duplicates; deletions make you skip items.
- **Speed**: `OFFSET 100000` makes the database walk past 100,000 rows; a cursor ("items older than ID X") jumps straight there through an index.

The token encodes the position (for example the last item's sort key and ID). Make it **opaque** (encode it, possibly sign it) so clients cannot build their own and you can change its format later. Cap `limit` on the server.

## Idempotency: safe retries

The network can fail **after** the server did the work but **before** the client saw the answer. The client cannot tell the difference, so it retries. For reads that is harmless; for "charge this card" it is a disaster.

The pattern:

1. The client generates a unique key per logical operation (a UUID) and sends it in a header: `Idempotency-Key: 5b6f…`.
2. The server, inside the same transaction as the work, records the key with the result.
3. A repeat with the same key returns the stored result instead of doing the work again. A repeat with the same key but a **different** body is an error (the client has a bug).
4. Keys expire after a window (Stripe keeps them for 24 hours).

Subtleties a senior mentions: two concurrent requests with the same key (lock or use a unique constraint so only one proceeds); the key must be stored atomically with the effect, or a crash between them breaks the guarantee.

## Versioning

- Put the **major version in the path** (`/v1/`) or the package name (gRPC); bump it only for breaking changes.
- Make **additive** changes freely within a version: new optional fields, new endpoints, new enum values (clients must tolerate unknown values).
- Run old and new versions side by side, publish a deprecation schedule, and watch traffic on the old one before turning it off.

## Errors that clients can act on

- The right HTTP status (400 invalid argument, 401, 403, 404, 409 conflict, 429, 503) plus a **structured body**: a machine-readable code, a human message, and details (which field was invalid; how long to wait).
- Tell clients **whether retrying can help**: 4xx usually no (fix the request), 429 and 503 yes (after waiting), 500 maybe.
- Never leak internals (stack traces, SQL) in errors.

## Telling clients to slow down

When rate limiting, return **429** with `Retry-After` (seconds to wait), and ideally headers showing the limit and what remains (the IETF RateLimit headers draft standardises `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`). Well-behaved clients back off instead of hammering you.

## Long-running operations

If work takes longer than a few seconds (transcoding a video, exporting a report, provisioning a server), do not hold the request open:

1. `POST /v1/exports` returns **202 Accepted** with an operation ID.
2. The client polls `GET /v1/operations/{id}` (status: pending, running, done, failed, with progress), or receives a **webhook** or push notification when done.
3. The operation result links to the output (a signed URL to the file).

This keeps requests short, survives client disconnects, and lets you queue work.

## Partial updates and concurrency

- **PATCH with a field mask** (`update_mask=display_name,photo`) so a client updating one field does not overwrite fields it did not know about.
- **Optimistic concurrency with ETags**: the client sends `If-Match: <etag>`; if someone else changed the resource since, the server returns 412 and the client re-reads. Prevents silent lost updates.

## A checklist for the API section of any design

Resource names and methods · request and response essentials · cursor pagination for lists · idempotency keys on non-idempotent writes · versioning plan · error model · rate-limit signals · async pattern for slow work · auth (who is calling).

## Interview angles

- "The client timed out; did the payment go through?" Idempotency key; the retry returns the original result.
- "How do you paginate a feed?" Opaque cursor on (time, id); why offsets break.
- "How do you change this API without breaking old apps?" Additive changes; versions for breaking ones; tolerant clients.

--- revise
### Pagination
? Why cursors instead of offsets? :: Offsets duplicate/skip items when data changes and get slower with depth; cursors seek directly and stay correct.
? What goes in a page token? :: The last item's sort key and ID, encoded opaquely (and ideally signed).

### Idempotency
? Why are idempotency keys needed? :: A request can succeed on the server while the client sees a timeout; the retry must not repeat the effect.
? How does the server use the key? :: Stores it with the result atomically with the work; a repeat returns the stored result; a different body with the same key is an error.
? Two subtleties? :: Concurrent duplicates (lock or unique constraint) and storing the key atomically with the effect.

### Rest of the checklist
? When do you bump a major version? :: Only for breaking changes; additive changes stay in the version.
? What should a 429 include? :: Retry-After, and ideally limit/remaining/reset headers.
? Pattern for work that takes minutes? :: 202 Accepted with an operation ID; poll or get a webhook; result links to output.
? How to avoid lost updates on concurrent edits? :: ETag with If-Match (optimistic concurrency); 412 on mismatch.
? Why a field mask on PATCH? :: So updating one field doesn't overwrite fields the client didn't send.

--- notes
## Naming
Plural nouns; standard methods; custom verbs as POST /resource:verb; consistent field names; string IDs.
## Pagination
Opaque cursor (last sort key + ID), server-capped limit.
Offsets: duplicates/skips on change, slow at depth.
## Idempotency
Client UUID per operation in a header (Idempotency-Key).
Store key + result in the same transaction as the effect; replay returns stored result.
Same key + different body → error. Expire keys (e.g. 24 h).
Handle concurrent duplicates with a unique constraint or lock.
## Versions and errors
Major version in path or package; additive changes freely; clients tolerate unknown fields and enum values.
Correct status + structured body (code, message, details); say whether retry helps; no internals.
429 + Retry-After (+ RateLimit-Limit/Remaining/Reset).
## Async and concurrency
202 + operation ID; poll or webhook; result as signed URL.
PATCH + field mask; ETag + If-Match → 412 on conflict.
## Checklist
Names · essentials · pagination · idempotency · versioning · errors · rate-limit signals · async · auth.

--- doubts
Q: Isn't PUT already idempotent? Why do I need keys?
A: PUT ("set the resource to exactly this") is idempotent, so retrying it is safe. Keys matter for operations that are naturally not idempotent: create an order, charge a card, send a message, transfer money. Each retry of a plain POST would create another one.

Q: Where do I store idempotency keys?
A: In the same database and transaction as the effect, so they commit together: e.g. a table (key, request hash, response, created_at) with a unique constraint on the key. A separate cache is faster but can disagree with the database after a crash, which is exactly when you need the guarantee.

Q: What if the client generates a new key on retry?
A: Then the server cannot recognise the retry and the work is done twice. The key must be generated once per logical operation (when the user presses "Pay") and reused across every retry of that operation. This is a client-side rule worth stating.

Q: Should the version be in the URL or a header?
A: Both work. The path (`/v1/`) is visible, easy to route and easy to cache; Google's API guidelines use it. A header keeps URLs stable but is easier to forget and harder to test in a browser. Choose one and be consistent.

Q: How long should a page token stay valid?
A: Long enough for a user to scroll (minutes to hours). Tokens based on stable sort keys (time + ID) stay valid indefinitely; tokens pointing to server-side snapshots must expire. Return a clear error for expired tokens so clients restart from the first page.

--- exercises
[design] Design the API for "send money to a friend" including retries, errors and the slow fraud check (up to 30 seconds).
A: `POST /v1/transfers` with header `Idempotency-Key` and body {to_user, amount, currency}. Response `202 Accepted` with {transfer_id, status: pending}, because the fraud check can take 30 s. Client polls `GET /v1/transfers/{id}` or gets a push when status becomes completed or rejected. Errors: 400 invalid amount, 403 not allowed, 409 if the same key is reused with a different body, 429 with Retry-After. The server stores the key with the transfer row in one transaction; a retry returns the same transfer_id.

[break] A feed API uses `?page=N` with 20 items per page sorted newest first. Users complain about seeing the same post twice while scrolling. Explain and fix.
A: New posts are inserted at the top between page loads, shifting everything down: items that were at the end of page 1 are now at the start of page 2, so they appear again. Switch to a cursor: page 2 asks for "posts older than (time, id) of the last post I saw", which is unaffected by inserts at the top.

[design] Two support agents edit the same customer record at the same time; one agent's changes silently disappear. How would the API prevent this?
A: Optimistic concurrency: GET returns an ETag (a version number). Updates must send `If-Match: <etag>`; if the record changed since, the server returns 412 Precondition Failed and the client reloads, shows the other agent's change, and lets the agent re-apply. Also use PATCH with a field mask so editing the phone number does not overwrite the address someone else just changed.

[estimate] Your payments API handles 2,000 POSTs per second and keeps idempotency keys for 24 hours. Each stored key with its response is about 1 KB. How much storage do the keys need?
A: 2,000 × 86,400 ≈ 173M keys per day × 1 KB ≈ 173 GB, held on a rolling 24-hour basis. Small enough for a partitioned table or key-value store with TTL-based expiry; partition by key.

--- pitfalls
- Offset pagination on lists that change
- Non-idempotent writes with no idempotency key
- Clients generating a new idempotency key on each retry
- Breaking changes without a new version
- Errors that don't say whether retrying helps
- Holding an HTTP request open for minutes instead of returning an operation

--- quiz
Q: Why does a payment API need idempotency keys?
- To encrypt the payment
- *A client may retry after a timeout even though the first attempt succeeded
- To sort payments
- To make GET requests faster
W: The key lets the server return the original result instead of charging again.
Q: Which pagination is safe for a feed where new items keep arriving?
- Page numbers
- Offsets
- *An opaque cursor based on the last item's sort key
- Returning everything
W: Cursors are unaffected by inserts before the current position.
Q: An export takes 10 minutes. The best API shape is…
- Hold the HTTP request open
- *Return 202 with an operation ID; poll or get notified; download from a link
- Ask the client to retry until done
- Return 500 and email the file
W: Long work becomes an operation the client checks on.
Q: A client must update one field without overwriting others it didn't see. Use…
- PUT with the full object
- *PATCH with a field mask
- DELETE then POST
- A new version of the API
W: The mask limits the update to the named fields.

--- sources
- article :: Google API Design Guide :: Google :: https://cloud.google.com/apis/design
- article :: AIP-158: Pagination :: Google API Improvement Proposals :: https://google.aip.dev/158
- article :: AIP-151: Long-running operations :: Google API Improvement Proposals :: https://google.aip.dev/151
- article :: Idempotent requests :: Stripe API Reference :: https://docs.stripe.com/api/idempotent_requests
- paper :: RateLimit header fields for HTTP (IETF draft) :: IETF HTTPAPI WG :: https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/

=== realtime-push
blurb: How a server tells clients about new events: short polling, long polling, server-sent events and WebSockets compared on delay, cost and complexity, and how to run millions of persistent connections (routing, presence, heartbeats, reconnect storms).
signals: Chat, notifications, live scores, collaborative editing, ride tracking | "How does the server push to the client?" | Scaling to millions of open connections
widgets: push-compare
prereq: http-tls

--- lesson
:::words
- **Push**: the server sends data to the client without the client asking at that moment.
- **Polling**: the client asks "anything new?" repeatedly on a timer.
- **Long polling**: the client asks, and the server holds the request open until there is news (or a timeout).
- **SSE (server-sent events)**: a long-lived HTTP response through which the server streams events to the browser, one way.
- **WebSocket**: a long-lived two-way connection, started from an HTTP request and then upgraded.
- **Persistent connection**: a connection kept open for minutes or hours rather than one request.
- **Presence**: knowing who is online right now.
- **Heartbeat**: a small periodic message proving a connection is still alive.
:::

## The problem in plain words

HTTP was designed for the client to ask and the server to answer. But chat messages, notifications, live scores and a driver's position on a map originate on the **server side**, at moments the client cannot predict. The client must somehow learn about them quickly, without wasting the battery and the server's capacity on endless "anything new?" requests. There are four standard techniques, and the trade-off is **delay vs cost vs complexity**.

:::eli5
Waiting for a parcel: polling is walking to the door every five minutes to check; long polling is standing at the door until the courier arrives, then going back to wait for the next one; SSE is a courier with a key who drops each parcel inside as it comes; a WebSocket is a phone line that stays open so either of you can talk at any time.
:::

## The four techniques

Run the same stream of server events through each technique and compare the delays and the number of requests:

[[widget:push-compare]]

**Short polling.** `GET /messages?since=X` every N seconds. Dead simple and works through any proxy, but the average delay is half the interval, and most requests return nothing: at 1 million clients polling every 5 seconds, that is 200,000 requests per second, mostly empty. Fine for low-stakes, infrequent updates (an order status page).

**Long polling.** The client sends a request; the server holds it open (say up to 30 s) and answers the moment something arrives; the client immediately sends the next request. Delay is near zero and empty responses are rare, but each event costs a full request–response cycle, and the server holds one waiting request per client. It was how chat worked before WebSockets and remains a robust fallback.

**Server-sent events (SSE).** The client opens `GET /events` with `Accept: text/event-stream`; the server keeps the response open and writes events as lines of text. Built into browsers (`EventSource`), reconnects automatically and resumes from the last event ID it saw. **One direction only** (server to client); the client sends anything else with normal requests. Ideal for feeds, notifications, live dashboards and streaming AI responses.

**WebSockets.** The client sends an HTTP request with `Upgrade: websocket`; the server agrees, and the connection becomes a two-way channel of messages with very low overhead per message. Best when **both sides send often**: chat with typing indicators, multiplayer games, collaborative editing. The cost is that a WebSocket is a long-lived, **stateful** connection your infrastructure must handle specially.

| | Delay | Requests per event | Direction | Infrastructure |
|---|---|---|---|---|
| Short polling | Half the interval on average | Many, mostly empty | Client pulls | Plain HTTP |
| Long polling | Near zero | One full request per event | Client pulls | Plain HTTP, many held requests |
| SSE | Near zero | None (stream) | Server → client | Long-lived HTTP responses |
| WebSocket | Near zero | None (stream) | Both ways | Long-lived stateful connections |

For mobile apps in the background, none of these run: phones kill idle connections to save battery. Use the platform push services (Firebase Cloud Messaging, Apple Push Notification service) to wake the app.

## Running millions of persistent connections

This is where the senior-level depth is. Suppose 50 million users each hold a WebSocket.

**1. Dedicated connection servers (gateways).** Separate the servers that hold connections from the servers with business logic. Connection servers are tuned for many idle connections (memory per connection, file-descriptor limits, event-driven I/O); one can hold hundreds of thousands. They do little work themselves.

**2. Routing a message to the right connection.** User B's connection lives on one specific gateway out of hundreds. When A sends B a message, how does it get there?
- Keep a **connection registry**: user → gateway, updated on connect and disconnect (in a fast key-value store), and send to that gateway directly; or
- Use **pub/sub**: each gateway subscribes to channels for the users (or chat rooms) it holds; publishers send to the channel and whichever gateway holds the user receives it.
Either way, the business logic never needs to know where a user is connected.

**3. Load balancing long-lived connections.** Connections are balanced when they are *opened*, not per message, so a gateway that has just restarted gets few connections while old ones stay loaded. Balance on connection count, and when deploying, drain gateways gradually.

**4. Heartbeats and dead connections.** Mobile networks silently drop connections without either side being told. Send a heartbeat (ping) every 20–60 seconds; if several are missed, close the connection and mark the user offline. Heartbeats also keep intermediaries (NATs, proxies) from timing out an idle connection.

**5. Presence.** "Online" is derived from connections and heartbeats; broadcasting every status change to all of a user's contacts is expensive, so presence is usually updated lazily, batched, or only for contacts currently viewing.

**6. Reconnect storms.** When a gateway (or a whole region) restarts, all its clients reconnect at once: a thundering herd on login, authentication and the registry. Clients must reconnect with **exponential backoff and random jitter**, and servers should accept reconnects at a controlled rate.

**7. Missed messages.** A connection is a delivery path, not storage. Every message is first stored durably; on reconnect the client asks "everything after the last message ID I have", so nothing is lost while it was offline.

## Interview angles

- "How do clients get new messages?" WebSockets for chat (two-way and frequent); SSE for one-way feeds; push notifications when the app is in the background.
- "How do you route a message to the server holding the recipient's connection?" A connection registry or pub/sub between gateways.
- "What happens when a connection server dies?" Clients reconnect with backoff and jitter to another gateway; they fetch missed messages from storage using their last-seen ID.

--- revise
### Techniques
? Short polling's two costs? :: Average delay of half the interval, and mostly empty requests.
? How does long polling work? :: The server holds the request until there is news (or a timeout); the client immediately asks again.
? SSE's direction and strengths? :: Server → client only; built-in browser support, auto-reconnect, resume from last event ID.
? When are WebSockets the right choice? :: Both sides send frequently: chat with typing, games, collaborative editing.
? Background mobile apps? :: Use platform push (FCM, APNs); apps' own connections are killed.

### At scale
? Why separate connection servers? :: They are tuned to hold many idle connections; business logic scales separately.
? Two ways to route a message to the recipient's gateway? :: A user → gateway registry, or pub/sub channels per user or room.
? Purpose of heartbeats? :: Detect silently dead connections and keep NATs/proxies from timing out.
? How to avoid reconnect storms? :: Client exponential backoff with jitter; server-side rate limits on reconnects.
? How are messages not lost while offline? :: Store first; on reconnect the client fetches everything after its last-seen message ID.

--- notes
## Short polling
Delay ≈ interval / 2; mostly empty responses; 1M clients every 5 s = 200k req/s.
## Long polling
Held request until news or timeout; near-zero delay; one request per event; good fallback.
## SSE
GET with text/event-stream; one-way; EventSource auto-reconnects with Last-Event-ID.
Feeds, notifications, dashboards, streaming AI output.
## WebSockets
HTTP Upgrade → two-way message channel; low per-message overhead; stateful.
Chat, games, collaborative editing.
## Background mobile
FCM / APNs push to wake the app.
## Millions of connections
Dedicated gateways tuned for idle connections (100k+ each).
Route via user→gateway registry or pub/sub.
Balance at connect time; drain on deploy.
Heartbeats every 20–60 s; drop after misses.
Presence updated lazily or in batches.
Reconnect with backoff + jitter; server caps reconnect rate.
Store messages durably; clients resume from last-seen ID.

--- doubts
Q: If WebSockets do everything, why would anyone use SSE?
A: SSE is plain HTTP: it works with existing load balancers, proxies, authentication and HTTP/2 multiplexing, reconnects automatically and resumes from the last event ID for free. If the client only needs to receive (notifications, live feeds, token-by-token AI responses), SSE is simpler to build and operate. WebSockets earn their extra complexity when the client also sends frequently.

Q: Do WebSockets work through load balancers?
A: Yes, if the load balancer supports the HTTP Upgrade and long-lived connections (all modern ones do). The catch is that balancing happens only when the connection is opened, and idle timeouts on proxies must be longer than your heartbeat interval or connections will be cut.

Q: How many WebSocket connections can one server hold?
A: Mostly limited by memory (kernel buffers plus your per-connection state) and file descriptors, not CPU, because idle connections cost almost nothing to keep. Hundreds of thousands per server is common; specialised setups have reached a million or more. In an interview, assume 100k–500k and size from that.

Q: Is long polling obsolete?
A: Not entirely. It works everywhere, including restrictive corporate proxies that block WebSockets, which is why libraries like Socket.IO use it as a fallback. For new designs it is rarely the first choice.

Q: What about HTTP/2 or HTTP/3 server push? Isn't that "push"?
A: No. HTTP/2 server push let a server send extra *resources* (like a stylesheet) along with a page the client requested. It was rarely helpful and Chrome removed support in 2022. It never delivered application events; SSE and WebSockets do that.

--- exercises
[estimate] 2 million users keep a dashboard open that polls every 10 seconds. What is the request rate, and what would SSE cost instead?
A: Polling: 2M / 10 s = 200,000 requests/s, nearly all returning "no change", plus an average 5 s delay. SSE: 2M open connections (e.g. 10–20 servers at 100k–200k each) and only actual events are sent. Far less CPU and bandwidth, near-zero delay; the cost moves from request handling to holding connections.

[design] A chat app has 300 WebSocket gateways. User A (on gateway 17) sends a message to user B (on gateway 203). Walk through the delivery.
A: Gateway 17 forwards the message to the chat service, which stores it durably (the message gets an ID) and then needs B's location: it looks up B in the connection registry (user → gateway 203) or publishes to B's channel, which gateway 203 subscribes to. Gateway 203 pushes it down B's WebSocket; B's client acknowledges; the service marks it delivered and notifies A (delivery receipt). If B is offline (no registry entry), a mobile push notification is sent instead, and B fetches messages after its last-seen ID on reconnect.

[break] After a deploy restarts 50 gateways at once, the authentication service falls over and the whole chat system is down for 20 minutes. Explain and fix.
A: Each gateway held ~200k connections, so ~10M clients reconnected at once, each authenticating and updating the registry: a thundering herd. Fixes: roll deploys gradually (drain a few gateways at a time, telling clients to reconnect elsewhere over a spread-out window); clients reconnect with exponential backoff plus random jitter; cache or use resumable session tokens so reconnects avoid the full auth path; rate-limit reconnects at the edge.

[choose] A ride-hailing app shows the driver's car moving on the rider's map, updated every 2 seconds while the trip is active. Which technique?
A: A persistent connection while the app is in the foreground: SSE or WebSocket. Updates only flow server → rider, so SSE is enough on the rider side (the driver's app sends its location with normal requests or its own WebSocket). Polling every 2 s would also work at small scale but wastes requests and battery; push notifications are for when the app is in the background (e.g. "your driver has arrived").

--- pitfalls
- Polling at high frequency for data that changes rarely
- Treating a WebSocket as storage (losing messages sent while the client was offline)
- No heartbeats, so dead mobile connections are never detected
- Clients reconnecting immediately and all at once after a server restart
- Forgetting that background mobile apps need platform push services

--- quiz
Q: Which technique is one-way (server to client) and reconnects automatically in browsers?
- Short polling
- WebSockets
- *Server-sent events
- Long polling
W: EventSource reconnects and resumes from the last event ID.
Q: Average delay of short polling with a 10-second interval is about…
- 0 s
- *5 s
- 10 s
- 20 s
W: An event arrives uniformly within the interval, so on average half of it.
Q: How do you deliver a message to a user whose WebSocket lives on another server?
- Broadcast to every client
- *Look up the user's gateway in a registry, or publish on a channel that gateway subscribes to
- Ask the user to poll
- Use DNS
W: Routing is decoupled from business logic through a registry or pub/sub.
Q: The main defence against reconnect storms is…
- Bigger servers
- *Client backoff with random jitter, plus server-side reconnect rate limits
- Shorter heartbeats
- Disabling TLS
W: Spreading reconnects over time stops a thundering herd.

--- sources
- paper :: RFC 6455: The WebSocket Protocol :: IETF :: https://www.rfc-editor.org/rfc/rfc6455
- article :: HTML Living Standard: Server-sent events :: WHATWG :: https://html.spec.whatwg.org/multipage/server-sent-events.html
- book :: High Performance Browser Networking, ch. 16–17 (Server-Sent Events, WebSocket) :: Ilya Grigorik :: https://hpbn.co/websocket/
- article :: Firebase Cloud Messaging architecture :: Google :: https://firebase.google.com/docs/cloud-messaging/fcm-architecture
- article :: Real-time messaging at Slack :: Slack Engineering :: https://slack.engineering/real-time-messaging/
