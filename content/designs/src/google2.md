=== d-news-shorts
title: Short-video "For You" feed (TikTok-style Google News / Shorts)
topic: stream-processing
tier: 3
est: 45
prompt: Design a TikTok-style feed of short items (news videos or Shorts) where each user swipes through an endless, personalised stream that adapts to what they watch within a session.
--- words
- **For You feed**: an endless list of items chosen for you by a recommendation system, not by who you follow.
- **Candidate generation (retrieval)**: quickly picking a few thousand possibly-relevant items out of millions.
- **Ranking**: scoring those candidates with a heavier model to pick the best few.
- **Embedding**: a list of numbers describing a user or an item, so similar ones are close together.
- **Watch signals**: watch time, rewatch, skip within a second, likes, shares: how the system learns what you like.
- **Prefetch**: downloading the next videos before the user swipes, so playback starts instantly.
- **Cold start**: recommending to a new user or showing a new item with no history.
--- flow
1. **0–5**: endless personalised feed, instant playback on swipe, adapts within a session, fresh items (news!), creators' uploads reach viewers quickly. Clarify: news freshness, diversity/safety requirements.
2. **5–10**: 500 M daily users × 100 items viewed ≈ 50 B impressions/day ≈ 600 k/s; feed requests in batches of ~10 items → 60 k/s.
3. **10–15**: feed API returning batches; event stream of watch signals; item store; feature store; embedding indexes.
4. **15–25**: client prefetches → feed service → candidate generators (embedding ANN, trending, fresh, follows) → ranking model → re-rank (diversity, safety, freshness) → items + CDN URLs; events stream back to update features in near real time.
5. **25–40**: two-stage recommendation, real-time feedback, freshness for news, prefetch and video delivery, cold start, feedback loops and safety.
6. **40–45**: metrics (watch time vs satisfaction), experiments, failures.
--- req
**Functional**
- An endless feed of short videos/news items per user; swipe to the next; like, share, follow, "not interested".
- Personalised, and adapting within the session to what the user watches or skips.
- New uploads (or breaking news) can appear in feeds within minutes.

**Non-functional**
- **Instant playback** on swipe (< ~200 ms): prefetching is mandatory.
- **Feed batch latency** < ~150 ms server-side.
- **High scale**: hundreds of thousands of impressions per second.
- **Safety and quality**: no harmful or misleading content (critical for news); diversity, not a single topic.
--- est
- **Impressions**: 500 M DAU × 100 = 50 B/day ≈ **600,000/s**; each produces a watch event → the same rate of events into the stream.
- **Feed requests**: batches of 10 → **60,000/s**, each scoring ~500–1,000 candidates → 30–60 M model scores/s: GPU/TPU serving with batching.
- **Catalogue**: maybe 100 M active items; item embeddings (128 floats ≈ 512 B) ≈ 50 GB: fits in an ANN index replicated across serving machines.
- **Video bytes**: 600 k views/s × ~2 MB per short ≈ 1.2 TB/s egress: CDN.
--- api
- `GET /feed?session_id=&cursor=` → 10 items `{item_id, video_manifest_url, caption, author, reason}` + next cursor.
- `POST /events` (batched every few seconds): `{item_id, watch_ms, completed, skipped_at, liked, shared}`.

**Data**
- Item store (metadata, safety labels, freshness), video files on CDN.
- User features: long-term interests (embedding), recent session interactions (last N items), follows, language/region.
- Item features: embedding, engagement stats over windows, creator, topic, age.
- Seen-history per user (Bloom filter or recent list) to avoid repeats.
--- hl
1. The client keeps a buffer of ~5 upcoming items and **prefetches** their first segments; when the buffer runs low it asks for the next batch.
2. The **feed service** gathers the user's context (long-term embedding, the session's recent watches from a fast store) and calls **candidate generators** in parallel: embedding nearest neighbours (two-tower model), trending in region, fresh items (for news), follows, exploration.
3. A **ranking service** scores ~1,000 candidates with a deeper model predicting watch time, completion, like/share and "not interested".
4. A **re-ranker** applies policy: diversity (no 5 items on one topic), safety and authority (news sources), freshness boosts, creator fairness, and removes seen items.
5. Watch events flow into a **stream pipeline** that updates session features within seconds and aggregate stats within minutes; models retrain continuously (online or frequent batch).
6. New uploads go through processing (transcode, safety classification, embedding) and enter the fresh-candidate pool.
--- deep
**1. Two-stage recommendation**: scoring 100 M items per request is impossible; retrieval narrows to ~1,000 cheaply (approximate nearest neighbour on embeddings, plus heuristic sources), ranking spends real compute on those. This is the standard YouTube/TikTok architecture.

**2. Session adaptation**: the most distinctive TikTok property: the next batch reflects what you skipped seconds ago. Keep session features in a low-latency store updated directly from the client's events (not waiting for the batch pipeline), and request small batches so the next one uses new signals.

**3. Freshness (news)**: popularity-based retrieval favours old items; add a fresh-items source with exploration traffic, decay engagement stats by age, and give trusted news sources authority boosts. Breaking news needs ingestion → classification → embedding in minutes.

**4. Video delivery**: shorts are small, so prefetch the first segment of the next few items, use low-latency CDN and a low starting bitrate; the feed response includes CDN URLs signed for the user.

**5. Cold start**: new users get popular-in-region and diverse exploration items, quickly personalised by the first swipes; new items get a small exploration audience whose reactions decide wider distribution.

**6. Feedback loops and safety**: optimising watch time alone promotes clickbait and misinformation; include satisfaction signals (surveys, "not interested"), policy classifiers, and limits for sensitive topics; measure long-term retention, not just session length.
--- wrap
**Failures**: ranking service overloaded → serve from a cached per-user fallback list or popular items; event pipeline lag → session adaptation degrades but feed works; CDN issues → lower bitrate.

**Monitoring**: watch time per session, skip rate, start-up latency, feed latency, diversity metrics, policy violation rates; A/B tests for every model change.

**At 10×**: more serving accelerators, caching of candidate lists, regional model serving.
--- variants
Q: Google News "Top stories" for everyone, lightly personalised
A: Clustering articles into stories, ranking stories by importance and authority, then a light personal layer; freshness and source diversity dominate over watch-time optimisation.
Q: YouTube home page (long videos)
A: Same two-stage pipeline, but objectives weigh satisfaction and long watch time; fewer, bigger items; less session adaptation per swipe.
Q: Following-only feed (no recommendations)
A: Becomes the news-feed design: fan-out of followed creators' posts.
--- steer
Q: How do you pick 10 items out of 100 million in 150 ms?
A: Retrieval via embedding ANN and other sources → ~1,000 candidates → ranking model → policy re-rank.
Q: The user skipped three cooking videos; the next ones must change.
A: Session features updated in real time from client events, small batches, session-aware ranking.
Q: Breaking news must show up within minutes.
A: Fast ingestion and embedding, a fresh-items candidate source, freshness boosts, authority signals.
Q: How do you make swiping feel instant?
A: Client buffer and prefetch of the first segments, CDN, low starting bitrate.
Q: Watch-time optimisation promotes misleading content.
A: Multi-objective ranking with satisfaction and quality, policy classifiers, authority for news, long-term metrics.
--- pitfalls
- Scoring the whole catalogue per request
- Batch-only features (no in-session adaptation)
- No prefetching, so every swipe buffers
- Ignoring freshness and authority for news
- Optimising a single engagement metric
--- level
- **L4**: feed service calling a recommender, events logged, videos on CDN.
- **L5**: two-stage retrieval + ranking with numbers, real-time session features, freshness source, prefetch design, cold start and exploration, re-ranking policies.
- **L6**: objective design and long-term metrics, experimentation platform, safety/integrity systems, serving cost of models.
--- nodes
client|App (buffer + prefetch)|client|0|160|Keeps ~5 items ahead and prefetches their first video segments.
feed|Feed service|service|200|160|Builds each batch: context, candidates, ranking, re-ranking.
cand|Candidate generators|service|420|40|Embedding ANN, trending, fresh, follows, exploration.
rank|Ranking model serving|service|420|160|Scores ~1,000 candidates for watch time, likes, skips.
rerank|Re-ranker (policy)|service|420|280|Diversity, safety, freshness, seen filtering.
session|Session feature store|cache|200|330|Recent interactions, updated within seconds from events.
events|Event stream|queue|0|330|Watch, skip, like events batched from clients.
pipe|Feature + training pipeline|worker|640|330|Aggregates stats, updates features, retrains models.
cdn|Video CDN|edge|640|160|Serves short video segments near users.
--- edges
client>feed|next batch
feed>cand|retrieve
feed>rank|score
feed>rerank|policy
feed>session|session context
client>cdn|prefetch segments
client~events|watch signals
events~session|real-time update
events~pipe|aggregate, retrain
pipe~cand|embeddings
--- refs
- paper :: Deep Neural Networks for YouTube Recommendations (RecSys 2016) :: Covington, Adams, Sargin (Google) :: https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/
- paper :: Monolith: Real Time Recommendation System With Collisionless Embedding Table (2022) :: ByteDance :: https://arxiv.org/abs/2209.07663

=== d-view-counter
title: View and like counter at YouTube scale
topic: stream-processing
tier: 2
est: 45
prompt: Design the system that counts views and likes for every YouTube video, shows a count on every watch page, and stays accurate enough for creators' analytics and payments, even for videos getting millions of views per minute.
--- words
- **Counter**: a stored number that goes up (views) or up and down (likes).
- **Hot key**: one counter updated so often (a viral video) that a single database row can't keep up.
- **Sharded counter**: splitting one counter into many sub-counters on different machines and summing them when read.
- **Deduplication**: making sure one person refreshing the page 20 times doesn't count as 20 views.
- **Eventual consistency**: the displayed count may lag the true count by seconds or minutes.
- **Idempotent like**: a user liking twice still counts once; a like is a per-user state, not an event.
--- flow
1. **0–5**: count views (with validation: real humans, minimum watch time) and likes (per-user toggle); show counts; analytics for creators; monetisation needs accurate views. Clarify freshness and accuracy needs.
2. **5–10**: ~5 B views/day ≈ 60 k/s average, a viral video can take 50 k views/s alone; likes ~10× fewer.
3. **10–15**: view events, validated counts per video per minute, like state per (user, video), count caches.
4. **15–25**: player events → stream → validation/dedupe → windowed aggregation → counter store (sharded) → cache for display; likes as per-user state + counter.
5. **25–40**: hot counters, dedupe and bot filtering, exactly-once aggregation, likes consistency, display freshness.
6. **40–45**: reconciliation for payments, monitoring.
--- req
**Functional**
- Record views; validate them (bots, refresh spam, minimum watch); show a public view count.
- Likes/dislikes as a per-user toggle; show like count; "you liked this" for the viewer.
- Creator analytics: views per day, country, traffic source; monetised views for payments.

**Non-functional**
- **Scale**: tens of thousands of updates per second overall, tens of thousands per second on one viral video.
- **Accuracy**: public counts can lag by minutes; payments and analytics must be exact after validation.
- **Low latency reads**: counts appear on every page view (very read-heavy).
- **Idempotent**: retries and double clicks don't inflate counts.
--- est
- **Views**: 5 B/day ≈ **60,000/s**; viral peak on one video ~**50,000/s**.
- **Likes**: ~500 M/day ≈ 6,000/s.
- **Count reads**: every watch page and thumbnail shows counts: hundreds of thousands per second → served from cache.
- **Storage**: per video per minute aggregates for analytics: 1 B videos, but only ~10 M active per day × 1,440 minutes ≈ 14 B rows/day before rollup to hours.
--- api
- Player: `POST /events/view {video_id, watch_ms, session_id, ...}` (batched, signed).
- `POST /videos/{id}/like`, `DELETE /videos/{id}/like` (idempotent by user).
- `GET /videos/{id}/counts` → `{views, likes}` (cached).

**Data**
- View event log (raw, for audits and recount).
- `video_counts(video_id) → views, likes` (display), sharded counters for hot videos.
- `video_views_by_minute(video_id, minute, country, source) → count` (analytics, columnar store).
- `likes(user_id, video_id) → state, ts` (source of truth for likes).
--- hl
**Views**
1. The player sends view events to an ingestion API, which writes them to a **log** partitioned by video.
2. A **stream processor** validates and dedupes (per session/user/IP within windows, bot signals, minimum watch time), aggregates counts per video per short window (e.g. 10 s), and **adds deltas** to the counter store (one write per video per window, not per view).
3. The **count cache** is refreshed from the counter store; pages read the cache.
4. Analytics aggregates go to a columnar store; nightly **batch reconciliation** recomputes exact validated counts for payments.

**Likes**
5. A like writes the per-user row (idempotent upsert); if the state changed, it emits a +1/−1 delta to the stream, aggregated the same way into the like counter.
--- deep
**1. Hot counters**: 50,000 increments/s on one row is impossible for most databases. Aggregating in the stream processor first turns 50,000 events/s into ~1 write per window. For direct counters, **shard** the counter into N sub-rows (`video#0..63`), increment a random shard, sum on read (cache the sum).

**2. Dedupe and validation**: one viewer refreshing repeatedly, bots, and auto-play loops must not count. Keep recent (session, video) pairs in windowed state; apply rules and models; YouTube historically froze counts (the "301 views" era) while validating. Decide what's public quickly vs what's final later.

**3. Exactly-once aggregation**: checkpoint stream state with offsets; write deltas idempotently (keyed by video + window ID) so a replay doesn't add twice.

**4. Likes consistency**: the per-user row is the truth (exactly one like per user); counters are derived; periodic recount from the likes table fixes drift. The viewer sees their own like immediately (read-your-writes from their row), while the public count lags.

**5. Display**: counts change constantly; cache with short TTL; show rounded numbers ("1.2M") for big videos so exactness isn't expected; small videos show exact counts (cheap to get right).
--- wrap
**Failures**: stream lag → counts freeze briefly, catch up later; counter store shard down → serve cached counts; event API outage → players buffer and resend (dedupe handles duplicates).

**Monitoring**: event-to-count lag, dedupe/invalid rates, stream vs batch differences, hot-key alerts, cache hit rate.

**At 10×**: more stream partitions, pre-aggregation on ingestion servers, more counter shards.
--- variants
Q: Real-time "people watching now" on a live stream
A: A presence count over a sliding window (heartbeats from players every 30 s), per-region counts merged, HyperLogLog for unique viewers, approximate and fast.
Q: Unique viewers per video per day for analytics
A: HyperLogLog sketches per video per day, mergeable across countries and days.
Q: Global count of all likes on the platform shown live
A: Hierarchical aggregation: per-shard partial sums every second, merged centrally; approximate display.
--- steer
Q: A video gets 50,000 views per second.
A: Aggregate in the stream per window and write deltas; sharded counters if writing directly; cache reads.
Q: A user refreshes 100 times.
A: Windowed dedupe by session/user/IP and validation rules before counting.
Q: The processor restarts.
A: Checkpointed state + idempotent delta writes keyed by window; no double counting.
Q: Can a user like twice?
A: Likes are per-user state (idempotent upsert); the counter changes only on state transitions.
Q: Creators get paid per view: is the public count good enough?
A: No: nightly batch reconciliation with full validation produces the billable numbers.
--- pitfalls
- One database row incremented per view
- Counting likes as events instead of per-user state
- No dedupe or bot filtering
- Using the fast public count for payments
- Expecting exact real-time counts for viral videos
--- level
- **L4**: event log → aggregation → counter store → cache.
- **L5**: hot-key strategies (pre-aggregation, sharded counters), dedupe/validation windows, exactly-once deltas, likes as state with derived counters, batch reconciliation.
- **L6**: public vs billable count policy, abuse economics, multi-region aggregation.
--- nodes
player|Player / app|client|0|120|Sends batched view events; like/unlike calls.
ingest|Event API|edge|190|60|Accepts signed view events and writes them to the log.
log|View event log|queue|380|60|Partitioned by video; raw events kept for audits.
stream|Stream processor|worker|570|60|Validates, dedupes, aggregates per window, writes deltas.
counters|Counter store (sharded)|db|570|200|Views and likes per video; hot videos use sub-counters.
cache|Count cache|cache|380|200|Serves counts on every page; short TTL.
likes|Likes table (user, video)|db|190|260|Source of truth for likes; changes emit ±1 deltas.
batch|Batch reconciliation|worker|570|330|Nightly exact recount for analytics and payments.
olap|Analytics store|store|380|330|Views per video per minute/country for creators.
--- edges
player>ingest|view events
ingest>log|append
log~stream|consume
stream>counters|deltas
counters~cache|refresh
player>cache|read counts
player>likes|like / unlike
likes~log|±1 delta
stream~olap|aggregates
log~batch|recount
batch>olap|final numbers

=== d-video-call
title: Video calls (Google Meet / Zoom)
topic: networking
tier: 3
est: 45
prompt: Design a video conferencing service like Google Meet: one-to-one and group calls with up to ~100 participants, screen sharing, good quality on poor networks, and low delay.
--- words
- **WebRTC**: the browser technology for real-time audio/video between endpoints, including encryption and network traversal.
- **Signalling**: the messages that set up a call (who joins, which codecs, network addresses), separate from the media itself.
- **NAT traversal (STUN/TURN)**: getting media through home routers and firewalls; TURN relays media when direct paths fail.
- **SFU (selective forwarding unit)**: a server that receives each participant's video once and forwards copies to the others without decoding it.
- **MCU**: a server that decodes and mixes everyone into one stream (expensive, rarely used now).
- **Simulcast**: each sender uploads several qualities at once, so the SFU can send the right one to each receiver.
- **Jitter buffer**: a small receive buffer that smooths out packets arriving at uneven times.
--- flow
1. **0–5**: 1:1 and group calls (up to 100), audio priority, screen share, chat, join links, recording (stretch). Clarify latency target (< 150–300 ms mouth-to-ear) and max size.
2. **5–10**: 10 M concurrent participants at peak; ~1.5 Mbit/s up and a few Mbit/s down each.
3. **10–15**: signalling API (WebSocket), meeting state, media servers (SFUs) per region, TURN servers.
4. **15–25**: clients join via signalling → assigned an SFU near them → send media (UDP, SRTP) to the SFU → SFU forwards to others; multi-region meetings cascade SFUs.
5. **25–40**: why SFU (vs mesh/MCU), simulcast and bandwidth adaptation, packet loss handling, cascading across regions, large meetings.
6. **40–45**: failures (SFU crash), monitoring call quality, recording.
--- req
**Functional**
- Create/join meetings by link; audio, video, screen share; mute; chat; participant list.
- Calls from 2 to ~100 participants (larger as view-only webinars).
- Works in browsers and mobile apps, across networks and firewalls.

**Non-functional**
- **Low latency**: under ~150–300 ms end to end; delay ruins conversation more than low resolution does.
- **Resilient to bad networks**: packet loss and changing bandwidth degrade quality gracefully; audio stays clear.
- **Scale**: millions of concurrent participants.
- **Secure**: encrypted media (DTLS-SRTP), meeting access control.
--- est
- **Concurrent participants**: 10 M at peak.
- **Media**: each sends ~1.5 Mbit/s (video + audio; simulcast adds layers) and receives a few streams: ~3 Mbit/s → server ingress ~15 Tbit/s and egress ~30 Tbit/s: thousands of SFU servers spread across many regions.
- **SFU capacity**: one server forwards ~1–2 Gbit/s of media → a few hundred participants each.
- **Signalling**: light: joins, leaves, mute events: tens of thousands of messages/s.
--- api
- `POST /meetings` → `{meeting_id, join_url}`; `POST /meetings/{id}/join` → `{token, signalling_url, ice_servers}`.
- Signalling over WebSocket: `offer/answer` SDP exchange with the SFU, ICE candidates, participant events, chat.
- Media: RTP/RTCP over UDP (DTLS-SRTP encrypted), TCP/TLS fallback via TURN.

**Data**: meeting metadata and access rules in a database; live meeting state (participants, which SFU hosts the meeting) in memory with a registry; recordings in object storage.
--- hl
1. The client calls the **meeting service** to join, gets a token and the **signalling server** address.
2. Signalling assigns the participant to an **SFU** close to them (or the meeting's SFU in that region) and negotiates media (SDP offer/answer, codecs, ICE).
3. The client sends its audio and video (simulcast: e.g. 180p/360p/720p layers) over UDP to the SFU; if UDP is blocked, through a **TURN** relay over TCP/TLS 443.
4. The SFU **forwards** each stream to each receiver, choosing the layer that fits the receiver's bandwidth and screen layout (active speaker large, others small).
5. Participants in other regions connect to their nearest SFU; **SFUs cascade** (forward streams between each other) so media crosses the ocean once per stream, not once per receiver.
6. Recording: a recorder bot joins as a participant, composes the layout and stores the result.
--- deep
**1. Mesh vs SFU vs MCU**: in a mesh, each client sends its video to every other client: upload explodes beyond 3–4 people. An MCU mixes everything server-side: one stream down, but heavy CPU and added latency. An **SFU** receives each stream once and forwards without decoding: scalable, low latency, flexible layouts. Modern services use SFUs.

**2. Bandwidth adaptation**: receivers' bandwidth varies; with **simulcast** (or scalable video coding layers) the SFU switches each receiver to the best layer; congestion control (based on RTCP feedback, delay-based estimation) adjusts sender bitrates. Audio gets priority; video degrades first.

**3. Loss and jitter**: UDP, not TCP: retransmitting late video is useless. Use jitter buffers, forward error correction for audio (Opus FEC), selective retransmission (NACK) only when it can arrive in time, and keyframe requests after heavy loss.

**4. Large meetings**: 100 video streams can't all be sent to everyone: send only the active speaker(s) in high quality and a few thumbnails (last-N); webinars of 10,000 become one-to-many with a few presenters, possibly via streaming (HLS) for passive viewers with more delay.

**5. Cascading**: a meeting spread across continents uses one SFU per region, connected to each other; each stream crosses inter-region links once. Placement chooses SFUs that minimise latency for the majority.

**6. Security**: media encrypted hop-by-hop with DTLS-SRTP; end-to-end encryption (insertable streams) is possible but limits server features (recording, transcription).
--- wrap
**Failures**: SFU crash → clients detect within seconds, re-join a new SFU via signalling (meeting continues with a short glitch); TURN overload → more relays; signalling down → existing calls continue (media path independent), new joins fail.

**Monitoring**: per-call quality (round-trip time, packet loss, jitter, freezes, audio concealment), join success rate, SFU load; user ratings.

**At 10×**: more SFU regions and edge locations (latency is physics), better codecs (AV1), server capacity planning for business-hour peaks.
--- variants
Q: Live streaming a talk to 1 M viewers with chat
A: Not interactive: ingest once, transcode, deliver via HLS/CDN with seconds of delay; chat as a separate fan-out system. See the YouTube design's live variant.
Q: One-to-one calls only (like WhatsApp calls)
A: Try peer-to-peer first (direct UDP via STUN), fall back to TURN relays; no SFU needed; end-to-end encryption is natural.
Q: Add live captions and translation
A: Send audio from the SFU (or client) to a streaming speech recognition service; captions travel back as data messages; latency budget ~1 s.
--- steer
Q: Why not have every participant send video directly to everyone?
A: Upload bandwidth grows with participants (mesh); SFU receives once and forwards.
Q: A participant's network drops to 500 kbit/s.
A: Simulcast/SVC layer switching at the SFU, sender congestion control, audio prioritised.
Q: Why UDP instead of TCP?
A: Late packets are useless; TCP retransmission and head-of-line blocking add delay; use jitter buffers, FEC and selective NACK.
Q: Half the participants are in India, half in the US.
A: SFU per region cascaded; each stream crosses the ocean once.
Q: The SFU hosting the meeting crashes.
A: Clients re-join another SFU through signalling within seconds; media servers are stateless enough to recover quickly.
--- pitfalls
- Routing media through the signalling/API servers
- Mesh topology for group calls
- TCP-only media
- Sending every participant's full-quality video to everyone
- Ignoring NAT/firewall traversal (TURN)
--- level
- **L4**: WebRTC with signalling, a media server, STUN/TURN.
- **L5**: SFU vs mesh/MCU reasoning, simulcast and congestion control, loss handling, regional placement and cascading, large-meeting strategies, recovery from SFU failure.
- **L6**: global capacity planning and cost (bandwidth), quality metrics driving product decisions, E2EE trade-offs.
--- nodes
client|Browser / app|client|0|160|Captures and encodes media; receives and renders others' streams.
meet|Meeting service|service|200|40|Creates meetings, checks access, issues join tokens.
signal|Signalling (WebSocket)|service|200|160|SDP offer/answer, ICE candidates, participant events.
sfu1|SFU (region A)|service|420|160|Receives each stream once, forwards the right layer to each receiver.
sfu2|SFU (region B)|service|640|160|Hosts the meeting's participants in another region; cascaded with region A.
turn|TURN relay|edge|200|300|Relays media over TCP/TLS when UDP is blocked.
rec|Recorder|worker|420|300|Joins as a participant, composes and stores recordings.
store|Object storage|store|640|300|Recordings.
--- edges
client>meet|join
client>signal|negotiate
signal>sfu1|assign
client>sfu1|media (UDP/SRTP)
sfu1>sfu2|cascade streams
client>turn|fallback
turn>sfu1|relayed media
sfu1~rec|streams
rec~store|recording
--- refs
- article :: WebRTC: Real-time communication for the web :: webrtc.org :: https://webrtc.org/
- article :: Scalable video coding (SVC) and simulcast in WebRTC :: W3C WebRTC-SVC :: https://www.w3.org/TR/webrtc-svc/
