=== d-google-maps
title: Google Maps: directions, ETA and live traffic
topic: storage-search
tier: 3
est: 45
prompt: Design the routing part of Google Maps: given a start and destination, return the fastest route and an accurate arrival time using live traffic, for a billion users.
--- words
- **Road graph**: the road network as a graph: intersections are nodes, road segments are edges with lengths, speed limits and turn rules.
- **Shortest path (Dijkstra, A\*)**: algorithms that find the cheapest route through a graph; plain Dijkstra is far too slow on a continent-sized graph.
- **Contraction hierarchies**: a preprocessing trick that adds "shortcut" edges so queries explore only a few thousand nodes instead of millions.
- **Live traffic**: current speeds on road segments, estimated from phones' anonymised location pings.
- **ETA**: estimated time of arrival, the predicted travel time along the chosen route.
- **Map tiles**: the map image split into small square pieces at each zoom level (a separate system from routing).
--- flow
1. **0–5, requirements**: route between two points (driving first), fastest route with traffic, alternatives, accurate ETA, reroute while driving. Clarify modes (walking, transit), scope (routing only, not tiles or search).
2. **5–10, estimates**: ~1 B monthly users; maybe 100 k route requests/s at peak; the world road graph has ~1 B edges.
3. **10–15, data**: graph partitions in memory, edge weights (static + live), traffic pipeline, ETA model.
4. **15–25, high level**: offline build of the graph + preprocessing → routing servers with the graph in memory; traffic pipeline updates edge speeds every minute; ETA model on top.
5. **25–40, deep dives**: why plain Dijkstra fails and what replaces it, updating weights with traffic without redoing preprocessing, ETA prediction (historical + live), rerouting, partitioning the world.
6. **40–45, wrap**: privacy of location data, failures, monitoring of ETA accuracy.
--- req
**Functional**
- Given origin and destination (and mode: driving first), return the fastest route, 2–3 alternatives and an ETA.
- Use live traffic and known closures; avoid tolls/highways as options.
- During navigation, re-route when traffic changes or the driver leaves the route.

**Non-functional**
- **Fast**: a route in under ~200 ms even across a continent.
- **Accurate ETA**: within a few percent most of the time; users judge the product by it.
- **Fresh traffic**: speeds reflect conditions within a minute or two.
- **Global scale and availability**; graceful fallback to typical (historical) speeds if live data is missing.
- **Privacy**: location data anonymised and aggregated.

Non-goals: map rendering/tiles, place search, Street View.
--- est
- **Users**: ~1 B monthly; route requests maybe **50–100 k/s** at peak; active navigations send position updates every few seconds: tens of millions of phones → **millions of pings/s** for traffic.
- **Graph**: ~1 B road segments worldwide; ~50–100 bytes each with attributes ≈ **100 GB**; plus shortcuts from preprocessing (similar size). Partitioned by region, each partition fits in a server's memory.
- **Traffic**: segment speeds updated every minute: 1 B segments, but only ~100 M with meaningful traffic data.
- **Compute**: with contraction hierarchies a query settles ~1,000s of nodes (sub-millisecond to milliseconds), so a server handles thousands of queries/s.
--- api
- `GET /directions?origin=lat,lng&destination=lat,lng&mode=driving&departure_time=now&alternatives=true` → routes with polylines, steps, distance, ETA, traffic colouring.
- `POST /navigation/{session}/position {lat, lng, speed, heading, ts}` (also feeds traffic, anonymised).

**Data**
- Road graph per region: nodes, edges (length, road class, speed limit, turn restrictions), shortcut edges.
- Edge weights: `segment_id → {historical speed profile by time of week, live speed, closure flag}`.
- ETA model features: route segments, time, weather, events.
--- hl
**Offline**
1. Map data (from imagery, partners, user edits) is compiled into the **road graph** per region.
2. **Preprocessing** (contraction hierarchies or a multi-level partition) adds shortcuts so queries are fast. Weight-independent preprocessing (customisable route planning) lets traffic change weights without rebuilding.

**Live traffic**
3. Phones' anonymised pings stream into a **traffic pipeline**: map-matching snaps them to road segments, speeds are aggregated per segment per minute, combined with historical profiles, and published to routing servers.

**Online**
4. A **routing service** (graph in memory, sharded by region with replicas) snaps origin and destination to the graph, runs the accelerated shortest-path query with current weights, finds alternatives, and returns the path.
5. An **ETA service** predicts the arrival time for the chosen route from live speeds, historical patterns and an ML model (traffic will change during a long trip).
6. **Navigation sessions** re-query periodically or when the driver deviates.
--- deep
**1. Why plain Dijkstra fails**: a cross-country query would explore tens of millions of nodes (seconds). A\* with a distance heuristic helps a little. **Contraction hierarchies** order nodes by importance and add shortcuts, so a bidirectional search only goes "upward" and touches a few thousand nodes: milliseconds. Highway-heavy routes become a handful of shortcut hops.

**2. Live weights vs preprocessing**: classic contraction hierarchies bake weights into shortcuts. **Customisable route planning** (partition the graph into cells; preprocess the topology once; recompute cell-boundary costs quickly when weights change, in seconds) lets traffic updates flow every minute. This is the kind of approach large map services use.

**3. ETA prediction**: the travel time is not today's speeds now; a 2-hour drive meets traffic later. Combine historical speed profiles for the time you'll reach each segment with live conditions near the start, and an ML model trained on actual trip times (Google DeepMind described graph neural networks improving Maps ETAs). Monitor ETA error continuously.

**4. Partitioning the world**: shard by geographic region; long routes crossing regions use a high-level overlay graph (major roads between region borders) to stitch regions, or keep continent graphs on large-memory machines.

**5. Map matching and privacy**: GPS points are noisy; match them to the most likely road path (hidden Markov model). Aggregate across many users, drop the ends of trips (homes), and keep only segment-level speeds.

**6. Rerouting**: the navigation client sends position; the server (or client, with a downloaded corridor of the graph) re-runs routing when the user deviates or a faster route appears beyond a threshold (avoid flip-flopping).
--- wrap
**Failures**: traffic pipeline lags → fall back to historical speeds; a routing shard down → replicas; region-wide outage → serve from another region (graph is read-only and replicated); offline mode on the phone with downloaded maps.

**Monitoring**: ETA accuracy (predicted vs actual), routing latency, traffic freshness, coverage of live data, reroute rates.

**At 10×**: more replicas (read-only graph scales easily), more efficient preprocessing, on-device routing for navigation.
--- variants
Q: Public transit directions
A: Routing is over a timetable graph (stops and scheduled departures), not road speeds: algorithms like RAPTOR or time-expanded graphs; real-time delays from transit agency feeds; walking legs at each end.
Q: Map tiles (rendering the map itself)
A: Vector tiles per zoom level and tile coordinate, generated offline, served from CDN with versioning; clients render styles locally; updates invalidate affected tiles.
Q: Delivery route optimisation for 100 stops
A: A vehicle routing problem (NP-hard): heuristics (savings, local search) on a distance matrix from the routing engine; time windows and capacities.
Q: Place search ("coffee near me")
A: Proximity search with ranking; see the nearby-places design.
--- steer
Q: Why not just run Dijkstra on the road graph?
A: Too many nodes for continental routes; use preprocessing (contraction hierarchies / partition-based) to make queries touch thousands of nodes.
Q: Traffic changes every minute; does preprocessing have to be redone?
A: Use metric-independent preprocessing with fast customisation (CRP) so new weights apply in seconds.
Q: How do you make the ETA accurate for a 3-hour trip?
A: Time-dependent predictions: historical profiles at the time you'll reach each segment, live data near the start, ML corrections trained on real trips.
Q: Where does traffic data come from, and how do you protect privacy?
A: Anonymised phone pings map-matched to segments, aggregated, trip ends trimmed; only speeds are kept.
Q: The traffic pipeline is down.
A: Route on historical speed profiles; flag lower confidence.
--- pitfalls
- Plain Dijkstra over the whole world graph
- ETA as distance ÷ current speed
- Rebuilding all preprocessing on every traffic update
- Ignoring privacy of location pings
- Mixing tiles, search and routing into one system
--- level
- **L4**: road graph, shortest path with some speedup, traffic as edge weights.
- **L5**: contraction hierarchies / partition-based routing with live customisation, traffic pipeline with map matching, time-dependent ETA with ML, regional sharding, fallbacks.
- **L6**: ETA accuracy as the product metric, global data pipeline and privacy design, on-device routing trade-offs.
--- nodes
client|Phone / browser|client|0|160|Requests directions; during navigation sends anonymised positions.
api|Directions API|edge|190|160|Validates and routes the request to the right region's routing shard.
route|Routing service (graph in memory)|service|400|80|Shortest path with preprocessing shortcuts and live weights. Replicated per region.
eta|ETA service + model|service|400|240|Predicts arrival time from historical profiles, live speeds and an ML model.
traffic|Traffic pipeline|worker|620|300|Map-matches pings to segments, aggregates speeds per minute.
weights|Live edge weights|cache|620|160|Current and historical speeds per segment, pushed to routing servers.
graph|Graph build + preprocessing|worker|620|20|Offline: compiles map data, builds shortcuts and partitions.
pings|Location stream|queue|190|320|Anonymised pings from navigating phones.
--- edges
client>api|GET /directions
api>route|shortest path
route>eta|predict ETA
route>weights|current weights
client~pings|positions
pings~traffic|stream
traffic~weights|speeds/minute
graph~route|new graph build
--- refs
- article :: Traffic prediction with advanced Graph Neural Networks :: Google DeepMind :: https://deepmind.google/discover/blog/traffic-prediction-with-advanced-graph-neural-networks/
- paper :: Customizable Route Planning in Road Networks :: Delling, Goldberg, Pajor, Werneck (Microsoft Research) :: https://www.microsoft.com/en-us/research/publication/customizable-route-planning-in-road-networks/

=== d-gmail
title: Email service (Gmail)
topic: storage-search
tier: 3
est: 45
prompt: Design an email service like Gmail for over a billion users: receive and send email, store mailboxes forever, search instantly, and keep spam out.
--- words
- **SMTP**: the protocol mail servers use to send email to each other.
- **MX record**: a DNS entry saying which servers accept email for a domain.
- **Mailbox**: one user's collection of messages, labels and threads.
- **Thread (conversation)**: a reply chain grouped together.
- **Inverted index**: a search structure mapping each word to the messages containing it.
- **Spam filtering**: deciding whether incoming mail is junk, using sender reputation, authentication (SPF, DKIM, DMARC) and models.
- **Attachment deduplication**: storing a file once when many people received the same attachment.
--- flow
1. **0–5**: receive, send, read, organise (labels/threads), search, spam filtering, attachments; IMAP/mobile sync. Clarify storage per user (15 GB) and search latency.
2. **5–10**: 1.8 B users, ~300 B emails/day worldwide (Gmail handles a large share): roughly 1 M incoming messages/s.
3. **10–15**: per-user mailbox storage, message blobs, per-user search index, metadata.
4. **15–25**: inbound SMTP → spam/abuse pipeline → mailbox store (per user) + search indexing → web/mobile APIs; outbound SMTP queue.
5. **25–40**: storage layout per user, search per user, spam, attachments, delivery retries, consistency for labels.
6. **40–45**: durability, abuse, monitoring.
--- req
**Functional**
- Receive email from the internet; send email to any address.
- Read, thread, label, archive, delete; mobile and web clients stay in sync.
- Full-text search across a user's entire mailbox in under a second.
- Spam and phishing filtering; attachments up to 25 MB.

**Non-functional**
- **Durability**: never lose an accepted email; mailboxes kept for decades.
- **Availability**: reading and sending work during partial outages.
- **Per-user consistency**: a label change or deletion is visible on all of a user's devices quickly.
- **Scale and cost**: exabytes of mail; storage efficiency matters.
--- est
- **Users**: ~1.8 B; incoming ~100 B messages/day for the service ≈ **1.2 M/s** (much of it spam, rejected early).
- **Storage**: average message ~75 KB with attachments; 100 B/day × 75 KB ≈ 7.5 PB/day before spam rejection and dedup; stored mail is exabytes (15 GB quota × users, mostly unused).
- **Search**: each user searches occasionally; index per user ≈ 10–20% of text size.
- **Reads**: billions of mailbox opens/day.

These say: partition everything by user (no cross-user queries), keep blobs in cheap storage, keep per-user indexes.
--- api
- Inbound: SMTP servers listed in MX records.
- Client: `GET /threads?label=INBOX&page_token=`, `GET /messages/{id}`, `POST /messages/send`, `POST /messages/{id}/modify {add_labels, remove_labels}`, `GET /search?q=`, `GET /history?start_history_id=` for incremental sync (like Gmail API history IDs).

**Data (per user, sharded by user ID)**
- `messages(user, message_id) → headers, snippet, labels, thread_id, blob_ref, size`.
- `threads(user, thread_id) → message_ids, latest`.
- Message bodies and attachments in blob storage, attachments content-addressed (dedup).
- Per-user **inverted index** for search.
- A per-user **history log** (sequence of changes) for client sync.
--- hl
**Receiving**
1. Sending servers connect to our **SMTP edge** (MX). Connection-level checks: IP reputation, rate limits, SPF/DKIM/DMARC authentication.
2. Accepted mail goes to a durable **inbound queue**, then the **spam/abuse classifier** (rules + ML + reputation).
3. The **delivery service** writes the message into each recipient's mailbox (metadata store + blob store), updates threads and labels, appends to the user's history log, and sends the message to the **indexer**.
4. Clients are notified (push to mobile, push channel to web) and sync via history IDs.

**Sending**
5. The client submits; the message is stored in Sent and put in an **outbound queue**; delivery workers resolve the recipient's MX and deliver via SMTP, retrying with backoff for up to days, generating bounces on failure.

**Reading and search**: APIs read the user's shard (metadata cached); search queries the user's index and fetches matching messages.
--- deep
**1. Partition by user**: almost every operation is within one mailbox, so shard by user ID; each user's metadata, index and history live together (Gmail historically on Bigtable/Spanner-like systems). This avoids cross-shard transactions and makes per-user consistency easy.

**2. Search per user**: a global index over everyone's mail is unnecessary and huge; per-user inverted indexes (built incrementally as mail arrives) keep queries small and private. Large mailboxes split into segments; recent mail indexed first.

**3. Spam**: layered: connection-level reputation and rate limits, authentication (DMARC failing domains), content and link analysis, ML models (Gmail blocks the vast majority of spam), user feedback ("report spam") as training signal. Quarantine rather than drop uncertain mail.

**4. Attachments and dedup**: the same newsletter image or PDF sent to millions: store blobs by content hash once with reference counting (dedup within a user is safe; across users needs privacy care).

**5. Sync**: clients keep a history ID; `history?start=` returns changes since then (labels, deletions), so mobile clients update incrementally; push notifications just say "something changed".

**6. Durability**: accepted mail must not be lost: acknowledge SMTP (250 OK) only after the message is durably queued in replicated storage.
--- wrap
**Failures**: inbound edge overload → SMTP temporary failures (4xx) make senders retry later; index lag → search slightly stale, mail still readable; region issue → users' shards fail over to replicas.

**Monitoring**: inbound acceptance and spam rates, delivery latency (received → visible), outbound queue age and bounce rates, search latency, storage growth.

**Abuse**: account takeover detection, outbound spam from compromised accounts (rate limits on sending, anomaly detection).
--- variants
Q: Design just the search feature
A: Per-user inverted index with incremental updates, query parsing (from:, has:attachment), ranking by recency and relevance, index segments and merges; privacy keeps indexes per user.
Q: Design the spam filter in depth
A: Online scoring within the delivery path (latency budget), features from sender reputation, authentication results, content, links and user feedback; continuous retraining; adversarial adaptation.
Q: Shared team inboxes (Google Groups / collaborative inbox)
A: One mailbox read by many members with per-member state (read/unread), assignment, and permissions.
--- steer
Q: How do you shard 1.8 billion mailboxes?
A: By user: all of a user's data together; no cross-user transactions.
Q: Search must return in under a second over 10 years of mail.
A: Per-user incremental inverted index, segments, recency-first.
Q: When do you tell the sending server "accepted"?
A: Only after durable, replicated storage of the message.
Q: The same 2 MB attachment goes to 5 million users.
A: Content-addressed blob dedup with reference counts (consider privacy for cross-user dedup).
Q: How do phones stay in sync cheaply?
A: Per-user history log with history IDs; push nudges; incremental fetch.
--- pitfalls
- A global search index over all users
- Acknowledging SMTP before durable storage
- Storing attachments in the metadata database
- Spam filtering only on content (ignoring reputation and authentication)
- Full mailbox refetches for sync
--- level
- **L4**: SMTP in/out, mailbox storage, search index, spam filter.
- **L5**: per-user sharding, per-user incremental indexes, durable acknowledgment, layered spam defence, attachment dedup, history-based sync, retries and bounces.
- **L6**: storage economics at exabyte scale, abuse ecosystem, privacy and data residency, multi-region placement of mailboxes.
--- nodes
sender|Other mail servers|ext|0|60|Deliver mail to us over SMTP after looking up our MX records.
smtp|SMTP edge|edge|190|60|Reputation checks, rate limits, SPF/DKIM/DMARC; accepts mail only after durable queueing.
queue|Inbound queue|queue|380|60|Durable buffer between acceptance and processing.
spam|Spam / abuse classifier|service|570|60|Rules, reputation and ML scoring; routes to inbox or spam.
deliver|Delivery service|service|570|200|Writes each recipient's mailbox, threads, labels and history log.
mailbox|Mailbox store (by user)|db|780|200|Per-user metadata, threads, labels, history; sharded by user.
blobs|Blob storage|store|780|330|Bodies and attachments, content-addressed.
index|Per-user search index|store|570|330|Incrementally updated inverted index per mailbox.
client|Web / mobile clients|client|190|300|Read, search, label and send; sync by history ID.
api|Mail API|service|380|300|Reads mailboxes, runs searches, accepts outgoing mail.
out|Outbound queue + SMTP|worker|380|420|Delivers sent mail to other servers with retries and bounces.
--- edges
sender>smtp|SMTP
smtp>queue|accept
queue~spam|classify
spam>deliver|deliver
deliver>mailbox|write
deliver>blobs|bodies
deliver~index|index
client>api|read / search / send
api>mailbox|metadata
api>index|search
api~out|send
--- refs
- article :: Gmail API: Synchronizing clients with history :: Google for Developers :: https://developers.google.com/gmail/api/guides/sync
- article :: Email sender guidelines (SPF, DKIM, DMARC) :: Google Workspace Admin Help :: https://support.google.com/a/answer/81126

=== d-google-photos
title: Photo storage and sharing (Google Photos)
topic: storage-search
tier: 2
est: 45
prompt: Design Google Photos: back up every photo and video from users' phones, show them instantly on any device, search them by what's in them, and share albums.
--- words
- **Backup (upload) client**: the phone app that uploads new photos in the background.
- **Thumbnail**: a small version of a photo for grids; several sizes are generated.
- **Object storage**: a huge, cheap store for files (here, the original photos).
- **Content-based search**: finding photos by what's in them ("beach", "dog") using ML labels and embeddings.
- **Face grouping**: clustering photos of the same person (opt-in, privacy-sensitive).
- **Deduplication**: recognising the same photo uploaded twice.
--- flow
1. **0–5**: background backup, timeline view, albums and sharing, search by content and place, edits. Clarify storage quotas and original vs compressed quality.
2. **5–10**: 1 B users, ~4 B new photos/day (Google has reported billions per week; assume this scale) ≈ 50 k uploads/s.
3. **10–15**: upload API (resumable), media metadata store, blob storage, processing pipeline, search index.
4. **15–25**: phone → upload service → object storage → processing (thumbnails, EXIF, ML labels, embeddings) → metadata + search index; viewing via CDN thumbnails.
5. **25–40**: upload reliability and dedup, thumbnail strategy, ML pipeline and search, sharing permissions, storage cost.
6. **40–45**: failures, privacy, monitoring.
--- req
**Functional**
- Automatic background backup of photos and videos from phones (Wi-Fi by default).
- Timeline of all photos across devices; albums; sharing albums/links with others.
- Search by content ("dog on beach"), place, date, people (opt-in face grouping).
- Basic edits (non-destructive).

**Non-functional**
- **Never lose a backed-up photo** (eleven nines durability).
- **Fast browsing**: grids of thumbnails load instantly while scrolling years of photos.
- **Efficient**: storage cost per user is the main expense.
- **Private by default**; shared items visible only to recipients.
--- est
- **Uploads**: ~4 B photos/day ≈ **46,000/s**, average 3 MB → **~140 GB/s inbound, ~12 PB/day** raw. (Compression options and dedup reduce this.)
- **Storage**: exabytes overall; erasure coding (~1.5×) instead of 3 replicas saves a lot.
- **Thumbnails**: 3–4 sizes per photo × ~30 KB ≈ 100 KB per photo, served constantly; CDN-cached.
- **ML processing**: 46 k photos/s × labels + embeddings: a large GPU/TPU batch pipeline (latency of minutes is fine).
- **Metadata**: trillions of photos × ~1 KB ≈ PB-scale metadata, sharded by user.
--- api
- `POST /uploads` → upload URL (resumable); `PUT` bytes in chunks; `POST /media {upload_token, sha256, exif}` → media item.
- `GET /media?before=&limit=` (timeline, cursor by date), `GET /media/{id}` (thumbnail and original URLs, signed).
- `GET /search?q=` → media IDs; `POST /albums`, `POST /albums/{id}/share`.

**Data**
- `media(user, media_id, taken_at, location, size, blob_ref, thumbnails, labels, hash)` sharded by user, indexed by taken_at.
- Originals in object storage; thumbnails in a separate hot tier + CDN.
- Search: per-user index of labels/places/dates + per-user embedding index for semantic queries.
- `albums`, `shares` with ACLs.
--- hl
1. The phone computes a **hash** of each new photo and asks the server whether it already exists for this user (dedup); if not, it uploads in **resumable chunks** to the upload service, which writes to **object storage**.
2. Creating the media item writes metadata (sharded by user) and enqueues a **processing job**.
3. The **processing pipeline** generates thumbnails at several sizes, extracts EXIF (time, place), runs ML models (labels, faces if enabled, embeddings), and updates the metadata and the user's **search index**.
4. Clients browse the timeline from metadata (cursor by date) and load **thumbnails from the CDN** via signed URLs; originals load on demand.
5. Sharing creates an album ACL; recipients read shared media through permission checks; links use unguessable tokens.
--- deep
**1. Upload reliability**: mobile networks drop; resumable chunked uploads with per-chunk acknowledgement; the client keeps a local queue and retries; the media item is created only after all bytes are stored, so partial uploads are invisible.

**2. Dedup**: hash before upload saves bandwidth when the same photo is re-uploaded (reinstall, multiple apps). Perceptual hashes can also find near-duplicates (burst shots) for "clean up" suggestions.

**3. Thumbnails and browsing**: generate common sizes eagerly (grid and phone-screen sizes) and others on demand; serve from CDN with long cache lifetimes (immutable URLs per version); the timeline API returns metadata pages so the client can lay out the grid before images arrive.

**4. Search**: labels and places go into a per-user inverted index; semantic queries ("kids at a birthday") use **embeddings** (image and text in one vector space) with a per-user vector index (approximate nearest neighbour). Per-user indexes keep queries small and private.

**5. Storage cost**: erasure coding for originals, compression options (high-efficiency formats), cold tiers for old, rarely viewed originals, keep thumbnails hot.

**6. Privacy**: face grouping opt-in and regionally limited; ML runs on server or on device; strict ACLs for shared albums; deletion propagates to all tiers and backups (crypto-shredding helps).
--- wrap
**Failures**: upload service down → phone retries later (backup is asynchronous); processing backlog → photos visible but not yet searchable; CDN miss storm → origin thumbnail tier scales.

**Monitoring**: backup success and lag, processing latency, thumbnail latency, search quality, storage growth per user.

**At 10×**: more storage (dominant cost), more ML capacity, regional processing near users.
--- variants
Q: Instagram (public photo feed)
A: Upload path similar, but the focus moves to feed generation and fan-out, public CDN caching and engagement; see the news-feed design.
Q: Memories ("1 year ago today") and auto-created albums
A: Offline batch jobs per user picking photo sets by date, quality and people; generated daily; push notifications.
Q: End-to-end encrypted photo backup
A: The server can't run ML or make thumbnails: thumbnails and search indexes are computed on device and stored encrypted; sharing needs key exchange.
--- steer
Q: How do you upload 4 GB of videos over a flaky phone connection?
A: Resumable chunked uploads directly to object storage, background queue on the phone, create the item after completion.
Q: Users scroll through 10 years of photos.
A: Metadata pages by date cursor, small thumbnails from CDN, lazy loading, precomputed sizes.
Q: How does "dog on the beach" search work?
A: ML labels + per-user inverted index; embeddings with per-user ANN index for semantic queries.
Q: Storage is too expensive.
A: Erasure coding, compression formats, cold tiers for old originals, dedup.
Q: A user deletes a photo.
A: Soft delete (trash 60 days), then delete from all tiers and indexes; shared copies removed; crypto-shredding for backups.
--- pitfalls
- Uploading through API servers instead of directly to storage
- Generating thumbnails on every request
- A single global search index across users
- 3× replication for exabytes of cold originals
- Forgetting privacy controls on faces and sharing
--- level
- **L4**: upload to object storage, thumbnails, metadata DB, CDN.
- **L5**: resumable uploads and dedup, processing pipeline, thumbnail strategy, per-user search with embeddings, storage tiers and erasure coding, sharing ACLs.
- **L6**: cost per user modelling, ML/privacy trade-offs (on-device vs server), global placement.
--- nodes
phone|Phone app|client|0|160|Hashes new photos, uploads in resumable chunks, browses the timeline.
upload|Upload service|edge|190|80|Issues resumable upload URLs; creates media items after completion.
blob|Object storage (originals)|store|400|20|Erasure-coded originals; cold tiers for old media.
meta|Media metadata (by user)|db|400|160|Media items, dates, places, labels, album membership.
proc|Processing pipeline|worker|610|80|Thumbnails, EXIF, ML labels, embeddings; retries idempotently.
thumbs|Thumbnail store + CDN|cache|190|280|Immutable thumbnail URLs cached at the edge.
search|Per-user search + vector index|store|610|240|Labels, places and embeddings for content search.
api|Photos API|service|400|300|Timeline pages, search, albums and sharing with ACL checks.
--- edges
phone>upload|upload chunks
upload>blob|store original
upload>meta|create item
meta~proc|process job
proc>blob|read original
proc>thumbs|thumbnails
proc>search|labels, embeddings
phone>api|timeline / search
api>meta|pages
api>search|query
phone>thumbs|load thumbnails
--- refs
- article :: A peek behind Colossus, Google's file system :: Google Cloud blog :: https://cloud.google.com/blog/products/storage-data-transfer/a-peek-behind-colossus-googles-file-system
