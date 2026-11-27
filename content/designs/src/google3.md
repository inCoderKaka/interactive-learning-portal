=== d-ad-serving
title: Ad serving and auctions (Google Ads)
topic: stream-processing
tier: 3
est: 45
prompt: Design the system that decides which ads to show on a search results page within tens of milliseconds: select eligible ads, run an auction, respect advertisers' budgets, and log everything for billing.
--- words
- **Advertiser, campaign, ad**: who pays; a group of ads with a budget and targeting; the creative shown.
- **Targeting**: who should see an ad (keywords, location, language, audience).
- **Auction**: choosing which ads win the slots, ranked by bid × predicted quality, with prices set by the auction rules.
- **pCTR (predicted click-through rate)**: the model's estimate that this user clicks this ad.
- **Budget pacing**: spreading a daily budget across the day instead of spending it in the first hour.
- **Impression / click logging**: recording what was shown and clicked, the basis of billing.
--- flow
1. **0–5**: for each search, choose up to ~4 ads in < 50 ms; auction with bids and quality; budgets never badly overspent; log for billing; advertiser changes take effect within minutes.
2. **5–10**: ~100 k searches/s with ads; millions of advertisers, billions of keywords.
3. **10–15**: ad index (keyword → candidate ads), campaign/budget state, models for pCTR, auction service, logs.
4. **15–25**: query → ad server → retrieval from in-memory index → filtering (targeting, budget, policy) → scoring (pCTR) → auction → render → log; budget service updates spend from the click/impression stream.
5. **25–40**: retrieval at scale, latency budget, auction mechanics, budget pacing across thousands of servers, logging and billing correctness.
6. **40–45**: experiments, monitoring, failures (fail without ads, never fail the search).
--- req
**Functional**
- For each search query (plus context: location, device, language), select eligible ads and run an auction for a few slots.
- Respect targeting, bids, daily budgets and policy (no prohibited content).
- Log impressions and clicks; charge advertisers per click at the auction price.
- Advertisers edit campaigns; changes are live within minutes.

**Non-functional**
- **Strict latency**: ads must not slow search: ~30–50 ms total budget.
- **Never break search**: if ads fail, show results without ads.
- **Billing correctness**: every charge traceable to a logged, valid click.
- **Budgets**: overspend kept small (e.g. < a few %).
--- est
- **Queries with ad requests**: ~100,000/s.
- **Candidates**: a query may match thousands of keyword-ads; scoring ~1,000 with a model per request → 100 M model evaluations/s: heavy, optimised serving with cheaper first-pass models.
- **Ad index**: billions of (keyword, ad) entries ≈ hundreds of GB, sharded across servers in memory.
- **Logs**: impressions ~400 k/s (several ads per page) and clicks ~ a few thousand/s.
--- api
Internal:
- `select_ads(query, context) → [ad_id, slot, price]` within a deadline.
- Advertiser API: create/update campaigns, keywords, bids, budgets.
- Events: impression and click logs (signed click URLs).

**Data**
- Campaign store (source of truth, transactional): advertisers, campaigns, ads, bids, budgets, targeting.
- **Serving index** derived from it: keyword/topic → ads with bid and targeting summaries, pushed to ad servers incrementally.
- Budget state: spend so far per campaign today, and pacing rate.
- Feature store and models for pCTR.
--- hl
1. The search front end calls the **ad server** in parallel with search, with a deadline.
2. **Retrieval**: the query is normalised and expanded (synonyms, broad match); the sharded in-memory **ad index** returns candidate ads.
3. **Filtering**: targeting (location, language, device), policy, and **budget/pacing** checks (is this campaign allowed to serve now?).
4. **Scoring**: a fast model then a heavier model predict pCTR and quality; ad rank = bid × quality (plus extensions/format effects).
5. **Auction**: rank ads; winners get slots; each pays roughly the minimum needed to keep its position (generalised second-price style; Google moved some products to first-price auctions in 2019); reserve prices apply.
6. **Render** creatives with tracking URLs; **log** impressions; clicks go through a redirect that logs and charges.
7. A **stream pipeline** aggregates spend per campaign and updates budget state and pacing within seconds; billing uses reconciled click logs (see ad-click design).
8. Campaign edits flow from the campaign store to the serving index within minutes.
--- deep
**1. Latency budget**: retrieval ~5 ms, filtering ~5 ms, scoring ~15 ms, auction and rendering ~5 ms. Achieved with in-memory sharded indexes, two-stage models (cheap model prunes to the best few hundred), and fan-out to shards in parallel with timeouts (return partial results rather than miss the deadline).

**2. Auction**: rank by expected value to the user and platform, not bid alone: bid × pCTR × quality. Second-price-style pricing makes truthful bidding a good strategy; reserve prices protect quality; the same model must be calibrated (a 2% pCTR must mean 2%).

**3. Budget pacing**: thousands of ad servers serve the same campaign; spend data lags by seconds. A central budget service computes a **throttle rate** per campaign (serve in X% of eligible auctions) from spend so far vs time of day, pushed to servers; small overspend is refunded. Without pacing, budgets would be exhausted by 9 a.m.

**4. Logging and billing**: impressions and clicks are logged with unique IDs; the billing pipeline dedupes, filters invalid clicks (fraud), and reconciles; advertisers are charged from final numbers.

**5. Index freshness**: advertiser changes (pause campaign, new bid) must reach serving quickly: change stream from the campaign store → index updaters → servers apply deltas; a paused campaign must stop within minutes (budgets and legal reasons).
--- wrap
**Failures**: ad server overloaded or slow → return no ads (search unaffected); budget service lag → conservative throttling; model serving issues → fall back to simpler model.

**Monitoring**: ads latency and timeout rate, revenue per thousand queries, pCTR calibration, budget overspend, click-log lag, policy violations.

**Experiments**: every change (model, auction parameter) is A/B tested on a slice of traffic with careful guardrails.
--- variants
Q: Display ads on websites (real-time bidding exchanges)
A: An ad exchange sends bid requests to many bidders and runs the auction within ~100 ms; bidders must answer in ~10–50 ms; adds user-sync, viewability and fraud concerns.
Q: Sponsored products in a shopping search
A: Ads mix with organic results; relevance to the query and conversion prediction matter more; inventory (in stock) must be checked.
Q: Frequency capping (don't show the same ad more than 3 times a day)
A: Per-user counters with low-latency reads at serving time (approximate, in-memory, with TTL), updated from impression logs.
--- steer
Q: You have 50 ms. Where does the time go?
A: In-memory sharded retrieval, cheap-then-heavy scoring, parallel fan-out with deadlines, partial results.
Q: How do you rank ads?
A: Bid × predicted CTR × quality; second-price-style pricing; calibrated models; reserve prices.
Q: A campaign has a $100 daily budget and is very popular.
A: Pacing: a central service computes throttle rates from spend vs time; servers sample eligibility; small overspend refunded.
Q: The ad system is down.
A: Search returns without ads; never block the search response.
Q: How are advertisers billed correctly?
A: Logged clicks with IDs → dedupe, fraud filtering, reconciliation → billing.
--- pitfalls
- Ranking by bid only
- Checking budgets with synchronous central calls per auction
- Letting ad failures break search
- Billing from raw, unfiltered clicks
- Slow propagation of paused campaigns
--- level
- **L4**: retrieval → filter → score → auction → log, with budgets.
- **L5**: latency budget per stage, two-stage scoring, auction pricing and calibration, distributed pacing, index freshness, billing pipeline.
- **L6**: auction design and incentives, experimentation at scale, marketplace health metrics.
--- nodes
search|Search front end|client|0|160|Calls the ad server in parallel with search, with a deadline.
adsrv|Ad server|service|200|160|Retrieval, filtering, scoring and auction within ~50 ms.
index|Ad index (sharded, in memory)|cache|420|40|Keyword/topic → candidate ads with bids and targeting.
model|pCTR model serving|service|420|160|Two-stage scoring of candidates.
budget|Budget & pacing service|service|420|280|Throttle rates per campaign from live spend.
campaigns|Campaign store|db|640|40|Source of truth for advertisers, bids, budgets.
logs|Impression / click logs|queue|200|320|Every shown ad and click, with IDs.
spend|Spend aggregation + billing|worker|640|280|Aggregates spend for pacing; reconciled billing.
--- edges
search>adsrv|select ads
adsrv>index|retrieve
adsrv>model|score
adsrv>budget|eligible?
campaigns~index|changes
adsrv~logs|impressions
logs~spend|aggregate
spend~budget|spend so far
--- refs
- article :: Google Ads auction overview (Ad Rank) :: Google Ads Help :: https://support.google.com/google-ads/answer/6366577
- paper :: Ad Click Prediction: a View from the Trenches (KDD 2013) :: McMahan et al. (Google) :: https://research.google/pubs/ad-click-prediction-a-view-from-the-trenches/

=== d-search-engine
title: Web search serving (Google Search)
topic: storage-search
tier: 3
est: 45
prompt: Given a crawled and indexed web of tens of billions of pages, design the serving system that answers search queries with the 10 best results in a few hundred milliseconds, at hundreds of thousands of queries per second.
--- words
- **Inverted index**: for each word, the list of documents containing it (a posting list), so a query only reads lists for its words.
- **Document sharding**: splitting the index by documents, so each shard holds a full mini-index of its slice of the web.
- **Fan-out / scatter-gather**: sending a query to all shards and merging their best results.
- **Ranking**: scoring documents by relevance (text match, links/PageRank, freshness, quality, user signals).
- **Tail latency**: the slowest few percent of responses; with hundreds of shards, one slow shard slows the whole query.
- **Result cache**: stored answers for popular queries.
--- flow
1. **0–5**: answer web queries with ranked results + snippets in < ~300 ms; fresh content (news) within minutes; huge QPS. Clarify: serving only (crawling and indexing given), spelling, snippets.
2. **5–10**: ~100 k queries/s; index of ~50 B documents ≈ hundreds of TB of posting lists.
3. **10–15**: index sharded by document, replicated; doc store for snippets; result cache.
4. **15–25**: front end → cache → query understanding → root server fans out to index shards (via intermediate aggregators) → each shard returns top-k → merge → second-phase ranking → snippets from doc servers.
5. **25–40**: sharding choice, tail latency at fan-out, multi-phase ranking, freshness (real-time tier), caching.
6. **40–45**: failures, cost, monitoring.
--- req
**Functional**
- Return the 10 best results for a query, with titles, URLs and snippets; pagination.
- Query understanding: spelling correction, synonyms, language.
- Fresh content (news, trending) searchable within minutes.

**Non-functional**
- **Latency**: p99 under ~300–500 ms worldwide.
- **Throughput**: ~100,000+ queries/s.
- **Availability**: always answer, degrading quality rather than failing.
- **Cost**: the index is enormous; efficiency per query matters.
--- est
- **Index**: 50 B docs × ~5 KB of index data each ≈ **250 TB** (compressed posting lists); doc store for snippets: petabytes.
- **Shards**: at ~100 GB in memory/SSD per shard → **~2,500 shards**, each replicated many times for QPS and availability.
- **Fan-out**: each query touches every shard (document sharding): 100 k QPS × 2,500 shards = huge internal traffic, reduced by caching (~30–50% hit rate for popular queries) and tiering (search a high-quality tier first).
--- api
- `GET /search?q=&start=&hl=&gl=` → `{results: [{title, url, snippet}], spelling_suggestion}`.

Internal: `shard.search(query_plan, k) → [(doc_id, score)]`, `docserver.snippet(doc_id, query_terms) → snippet`.

**Data**
- Index shards: posting lists (term → compressed doc IDs + positions), per-doc static scores (PageRank-like quality), built by the indexing pipeline.
- Doc servers: cached page content for snippets, by doc ID.
- Real-time index for fresh docs (small, frequently updated).
--- hl
1. A query hits a **front end**, then the **result cache** (popular queries).
2. **Query understanding** rewrites it (spelling, synonyms, language, intent).
3. A **root server** sends it to **aggregators**, each covering a group of **index shards** (a tree to keep fan-out manageable).
4. Each shard intersects posting lists, scores documents with a cheap first-phase function, and returns its top ~100.
5. Aggregators merge; the root applies **second-phase ranking** (more features, ML models) to the best few hundred.
6. **Doc servers** produce query-specific **snippets** for the top 10.
7. A **real-time tier** (small index updated within minutes) is searched in parallel and merged, for fresh content.
--- deep
**1. Sharding by document vs by term**: term sharding (each shard owns some words) means a multi-word query must move huge posting lists between machines; **document sharding** keeps each shard self-contained, so queries run locally and only small top-k lists move. Google and most engines shard by document.

**2. Tail latency**: with thousands of shards, the slowest one sets the query time. Use replicas and **hedged requests** (send to a second replica if the first is slow, per Dean & Barroso's "The Tail at Scale"), return partial results when a shard misses its deadline, and keep shards similarly sized.

**3. Multi-phase ranking**: score everything cheaply (BM25-like text match + static quality) on shards, then spend expensive models (learning-to-rank, neural rankers) only on the top few hundred overall.

**4. Tiering**: put the most useful ~10% of documents in a first tier; search lower tiers only when the first tier doesn't return enough good results; most queries never touch the long tail.

**5. Freshness**: the main index is rebuilt in large batches; a separate real-time index absorbs new and changed pages within minutes (Caffeine-era incremental indexing moved Google toward continuous updates).

**6. Caching**: results for popular queries (seconds to minutes TTL), and posting lists for popular terms in memory.
--- wrap
**Failures**: shard replicas down → others serve; a whole shard missing → results from the rest (slight quality loss, never an error); data centre down → global load balancing to others (each holds full index copies).

**Monitoring**: latency percentiles, partial-result rate, cache hit rate, quality metrics from rater evaluations and click signals, index freshness.

**Cost**: tiering, caching, compression of posting lists (variable-byte / PForDelta), efficient hardware use.
--- variants
Q: Site search for one e-commerce company (100 M products)
A: One Elasticsearch/Solr-like cluster, document-sharded with replicas, structured filters and facets, relevance tuned with business signals; far smaller fan-out.
Q: Search inside Gmail/Drive (per-user private corpora)
A: Per-user indexes stored with the user's data; no global fan-out; privacy boundaries.
Q: Semantic search with embeddings
A: Approximate nearest-neighbour indexes (ScaNN, HNSW) sharded by document, combined with keyword retrieval (hybrid) and re-ranking.
--- steer
Q: Why shard by document rather than by term?
A: Queries stay local per shard; only top-k lists move; term sharding ships huge posting lists for multi-word queries.
Q: 2,000 shards: one is slow.
A: Hedged requests to replicas, deadlines with partial results, balanced shard sizes.
Q: How do you afford expensive ranking models?
A: Multi-phase ranking: cheap scoring everywhere, heavy models on the top few hundred.
Q: A news event happened 5 minutes ago.
A: Real-time index tier merged at query time.
Q: How do you cut cost per query?
A: Result and posting caches, tiered indexes, compression.
--- pitfalls
- Term-sharded index for a multi-word query workload
- Waiting for every shard regardless of latency
- Running heavy ranking on every candidate
- Forgetting snippets and the doc store
- No freshness path
--- level
- **L4**: inverted index, sharding, scatter-gather, ranking, cache.
- **L5**: document vs term sharding with reasons, aggregator trees, tail-latency techniques, multi-phase ranking, tiering, real-time tier.
- **L6**: cost and quality trade-offs, evaluation methodology, global replication and capacity planning.
--- nodes
user|User|client|0|160|Types a query.
fe|Front end + result cache|edge|170|160|Serves popular queries from cache; calls query understanding.
qu|Query understanding|service|340|40|Spelling, synonyms, language, intent.
root|Root server|service|340|160|Fans out, merges, runs second-phase ranking.
agg|Aggregators|service|520|160|Merge results from groups of shards.
shards|Index shards (by document)|db|700|160|Posting lists + static scores; return local top-k.
docs|Doc servers|store|520|300|Page content for snippets.
rt|Real-time index|cache|700|300|Fresh documents, updated within minutes.
--- edges
user>fe|query
fe>qu|rewrite
fe>root|search
root>agg|fan out
agg>shards|top-k
root>rt|fresh results
root>docs|snippets
--- refs
- paper :: The Tail at Scale (CACM 2013) :: Jeffrey Dean, Luiz André Barroso (Google) :: https://research.google/pubs/the-tail-at-scale/
- paper :: The Anatomy of a Large-Scale Hypertextual Web Search Engine (1998) :: Sergey Brin, Lawrence Page :: http://infolab.stanford.edu/~backrub/google.html

=== d-calendar
title: Calendar and scheduling (Google Calendar)
topic: databases
tier: 2
est: 45
prompt: Design Google Calendar: create events (including recurring ones), invite people, see free/busy time across a company, get reminders, and keep every device in sync.
--- words
- **Recurring event**: an event that repeats by a rule ("every Tuesday until June"), stored as one rule rather than hundreds of copies.
- **RRULE**: the standard text format for repeat rules (iCalendar, RFC 5545).
- **Exception**: one changed or cancelled occurrence of a recurring event.
- **Free/busy**: whether someone has events at given times, without revealing what they are.
- **Time zone**: events store the zone they were created in, so "9 a.m. every Monday" survives daylight-saving changes.
- **Invite / RSVP**: an event shared with attendees, who answer yes, no or maybe.
--- flow
1. **0–5**: events, recurrence with exceptions, invites and RSVPs, free/busy, reminders, sharing, sync on many devices. Clarify org size and external invites (email/iCal).
2. **5–10**: 500 M users, ~10 events created per user per week; reads (calendar views) dominate.
3. **10–15**: events stored once per organiser with attendee references; per-user calendar index; recurrence rules.
4. **15–25**: API → event service (writes the event, fans out to attendees' calendars) → per-user views computed by expanding recurrences in the requested window → reminder scheduler → sync via change tokens.
5. **25–40**: recurrence storage and expansion, time zones and DST, attendee fan-out and consistency, free/busy at scale, reminders.
6. **40–45**: sync, failures, monitoring.
--- req
**Functional**
- Create, edit, delete events: time, time zone, location, description, video link.
- Recurring events with rules and exceptions ("this event" vs "all events" edits).
- Invite attendees (internal and external), RSVP, see others' free/busy, find a time.
- Reminders (notification/email) before events.
- Multiple calendars per user, sharing with permissions; sync across devices and with standard clients.

**Non-functional**
- **Correct times** across time zones and daylight-saving changes (a meeting must not move by an hour).
- **Consistency for attendees**: all attendees see the same event details soon after a change.
- **Fast views** (week/month) and fast free/busy queries for scheduling.
- **Reminders on time**, at scale.
--- est
- **Users**: 500 M; ~5 B events created/year ≈ 160/s average; edits similar.
- **Reads**: views and syncs: tens of thousands/s.
- **Reminders**: ~10 events per user per week with reminders → ~700 M reminders/day ≈ 8,000/s, peaking just before the hour (many meetings start at :00).
- **Storage**: events ~2 KB → ~10 TB/year: modest; sharded by user/organiser.
--- api
- `POST /calendars/{cal}/events {start, end, tz, rrule?, attendees[], reminders}`; `PATCH /events/{id}?scope=this|following|all`.
- `GET /calendars/{cal}/events?time_min=&time_max=&sync_token=` (expanded occurrences in a window; incremental via sync token).
- `POST /freebusy {users[], time_min, time_max}` → busy intervals per user.
- `POST /events/{id}/rsvp {status}`.

**Data**
- `events(event_id, organiser, start, end, tz, rrule, exdates, attendees, version)`; `event_exceptions(event_id, original_start, overrides)`.
- `attendee_index(user, event_id, rsvp)` so each user's calendar can include events organised by others.
- Per-user change log for sync tokens.
- Reminder schedule (time-bucketed index of upcoming reminders).
--- hl
1. Creating an event stores it once (owner's shard) with its recurrence rule; the **event service** adds rows to each attendee's **attendee index** and sends invitations (email for external attendees, as iCalendar).
2. Viewing a week: the calendar service reads the user's events and attendee-index entries overlapping the window, **expands recurrence rules** into occurrences in the user's display time zone, applies exceptions, and returns them (cached per user/week).
3. **Free/busy**: computed from the same data for each user (only busy intervals returned, respecting privacy), with a cache per user per day.
4. **Reminders**: when events are created/changed, upcoming reminder times are written to a time-bucketed queue; a **reminder scheduler** fires notifications at the right time (like the job scheduler design).
5. **Sync**: every change appends to affected users' change logs; clients call with a sync token to get only changes.
--- deep
**1. Recurrence**: store the rule, not thousands of copies; expand on read for the requested window (bounded); exceptions stored separately keyed by original start time. "Edit this and following" splits the series into two (end the old rule, create a new one).

**2. Time zones**: store the event's local time and IANA time zone, not just UTC, for recurring events: "9:00 Europe/London every Monday" stays 9:00 across DST while its UTC time changes. Expand in the event's zone, then convert to the viewer's zone. Keep time-zone database updates in mind (governments change rules).

**3. Attendee consistency**: one source of truth per event (the organiser's copy) with attendee pointers avoids divergent copies; attendees' RSVP updates the attendee list with versioned writes. External attendees receive iCalendar updates by email, which can't be guaranteed consistent: send sequence numbers.

**4. Free/busy at scale**: "find a time for 12 people" reads 12 users' busy intervals over a range; precompute per-user busy bitmaps (e.g. 15-minute slots per day) updated on changes, so scheduling is a fast bitmap AND.

**5. Reminders peak**: meetings cluster at :00 and :30; pre-load reminder buckets a minute ahead, scale workers, accept a few seconds' spread.
--- wrap
**Failures**: invite email failures → retries; sync conflicts (two devices edit offline) → version checks, last-writer-wins per field with user-visible conflict for major ones; reminder service down → catch up and skip reminders whose event already started.

**Monitoring**: view latency, free/busy latency, reminder delay, sync errors, DST-related bug reports around transitions.

**At 10×**: shard by user, cache expanded views, regional placement.
--- variants
Q: Room booking for an office (resources)
A: Rooms are calendars with capacity and features; booking must not double-book: a conditional write on the room's time slots (like ticketing), with approvals for some rooms.
Q: "Find a time" for 30 people across time zones
A: Busy bitmaps per person, AND them, rank slots by working hours in each zone and number of conflicts; suggest top options.
Q: Public appointment booking pages (Calendly-like)
A: Expose availability windows computed from free/busy, hold a slot briefly during booking, write events to both calendars.
--- steer
Q: How do you store "every weekday at 9:30 forever"?
A: One recurrence rule; expand only the requested window; exceptions stored separately.
Q: A recurring meeting shifts an hour after daylight saving changes.
A: Store local time + IANA zone and expand in that zone; never store only UTC for recurring events.
Q: The organiser changes the time; 50 attendees must see it.
A: Single source of truth with attendee pointers; change logs per attendee for sync; updates to external attendees via iCalendar emails.
Q: Find a slot for 12 people.
A: Precomputed busy bitmaps per user, fast intersection, ranking by working hours.
Q: 10 million reminders fire at 9:00.
A: Time-bucketed reminder queue pre-loaded, scaled workers.
--- pitfalls
- Materialising every occurrence of recurring events
- Storing only UTC for recurring events
- Copying events into each attendee's calendar with no single source of truth
- Computing free/busy by scanning every event for every request
- Polling full calendars for sync
--- level
- **L4**: events table, attendees, reminders, views.
- **L5**: recurrence with exceptions and series splits, time-zone/DST handling, single source of truth with attendee index, busy bitmaps, reminder scheduling, sync tokens.
- **L6**: interoperability (iCalendar, external systems), privacy rules for free/busy, enterprise scale and data residency.
--- nodes
client|Web / mobile / CalDAV|client|0|160|Views, edits, RSVPs; syncs with tokens.
api|Calendar API|service|200|160|Events, views, free/busy, sync.
events|Event store|db|420|60|One source of truth per event: rule, exceptions, attendees.
index|Attendee index + change logs|db|420|200|Each user's events and incremental changes.
busy|Busy bitmaps cache|cache|200|300|Per-user busy slots per day for scheduling.
rem|Reminder scheduler|worker|640|200|Time-bucketed reminders fired on time.
notify|Notifications / email|ext|640|60|Push reminders; iCalendar invites to external guests.
--- edges
client>api|view / edit
api>events|read / write
api>index|user window
api>busy|free/busy
events~index|fan out to attendees
events~rem|schedule reminders
rem>notify|send
events~notify|invites
--- refs
- article :: RFC 5545: Internet Calendaring and Scheduling Core Object Specification (iCalendar) :: IETF :: https://datatracker.ietf.org/doc/html/rfc5545
- article :: Google Calendar API: Synchronize resources efficiently :: Google for Developers :: https://developers.google.com/calendar/api/guides/sync
