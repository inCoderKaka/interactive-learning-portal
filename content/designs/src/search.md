=== d-web-crawler
est: 45
--- words
- **Crawler**: a program that downloads web pages, finds the links in them, and downloads those too.
- **Frontier**: the queue of URLs waiting to be fetched, with priorities.
- **Politeness**: not hammering any one website: limiting requests per host and obeying `robots.txt` (the site's rules for crawlers).
- **Deduplication**: recognising a URL or page content you've already seen, so you don't fetch or store it again.
- **URL normalisation**: turning different spellings of the same address into one form (lower-case host, remove `#fragments`, sort query parameters).
- **Recrawl**: fetching a page again later to see if it changed.
- **DNS resolution**: turning a host name into an IP address, which is slow if done for every request.
--- flow
1. **0–5, requirements**: crawl billions of pages for a search index, politely, recrawling changed pages. Clarify scale (pages/month), freshness, whether to render JavaScript, what to store.
2. **5–10, estimates**: 5 B pages/month ≈ 2,000 pages/s; 100 KB average → ~500 TB/month raw.
3. **10–15, data**: frontier (priority + per-host queues), seen-URL set, content store, link graph.
4. **15–25, high level**: frontier → fetchers (DNS cache, robots cache) → parser → link extractor → URL filter/dedupe → back to frontier; content to storage and the indexing pipeline.
5. **25–40, deep dives**: frontier design for politeness and priority, dedup at billions scale, recrawl scheduling, traps and spam.
6. **40–45, wrap**: failures, monitoring, distribution across machines.
--- req
**Functional**
- Start from seed URLs, fetch pages, extract links, keep crawling within scope.
- Store page content and metadata for the indexer; record the link graph.
- Recrawl pages according to how often they change and how important they are.

**Non-functional**
- **Scale**: billions of pages per month, growing.
- **Politeness**: never overload a site; respect robots.txt and crawl-delay.
- **Robustness**: survive malformed HTML, slow servers, spider traps (infinite calendars), huge files.
- **Extensible**: new content types (PDF, images) and processing steps can be added.
- **Prioritised**: important and fast-changing pages first.
--- est
- **Throughput**: 5 B pages/month ÷ 2.6 M s ≈ **2,000 pages/s** (peaks 2–3× higher).
- **Bandwidth**: 2,000 × 100 KB ≈ **200 MB/s ≈ 1.6 Gbit/s**: spread over many fetchers.
- **Storage**: 5 B × 100 KB = **500 TB/month** raw; compressed ~5× → ~100 TB/month.
- **Seen URLs**: tens of billions of URLs × 8-byte hash ≈ hundreds of GB: a distributed key-value store, with a Bloom filter in front to skip most lookups.
- **Fetchers**: each fetcher with async I/O can keep ~500–1,000 connections open; slow sites (~1 s per page) mean ~2,000 concurrent fetches: tens of machines, more for headroom.
--- api
Internal components rather than a public API:
- `frontier.enqueue(url, priority, earliest_time)`, `frontier.next(fetcher_id) → url` (respecting per-host politeness).
- `seen(url_fingerprint) → bool`, `content_seen(simhash) → near_duplicate_of?`.
- Storage: `pages(url_hash) → {url, fetched_at, status, content_ref, content_hash, out_links}`; content blobs in object storage (WARC files); link graph edges `(from, to)` for PageRank-style scoring.
--- hl
1. **Frontier** holds URLs in **priority queues** (by importance) feeding **per-host queues** (one host is served by one queue, with a next-allowed-time for politeness).
2. **Fetchers** pull URLs, resolve DNS through a **local DNS cache**, check the cached **robots.txt** rules, download with timeouts and size limits.
3. **Parsers** extract text and links (optionally render JavaScript in a headless browser pool for important sites).
4. **Content dedupe**: a hash of the content (and a SimHash for near-duplicates) skips mirrors and copies.
5. **Link filter**: normalise URLs, filter by scope and blocklists, check the **seen set**, and enqueue new URLs with a priority.
6. Content and metadata go to **storage** and to the **indexing pipeline**; the link graph feeds importance scores that set future priorities.
7. A **recrawl scheduler** re-enqueues known URLs based on change rate and importance.

Work is partitioned by **host** (hash of hostname → crawler node), so each node owns politeness for its hosts and no cross-node coordination is needed per request.
--- deep
**1. Frontier design**: two levels: front queues by priority decide *what* matters; back queues per host decide *when* each host may be hit (one host per back queue, a heap of next-allowed times). This is the Mercator design. It gives both priority and politeness without global locks.

**2. Dedup at scale**: URL dedup with normalisation + fingerprint (64-bit hash) in a sharded store, with a **Bloom filter** in memory to answer "definitely not seen" quickly. Content dedup with exact hashes catches identical pages; **SimHash** catches near-duplicates (same article, different ads).

**3. Recrawl scheduling**: pages change at very different rates (news front pages hourly, old docs never). Estimate each page's change rate from history and re-fetch more often for important, fast-changing pages; use HTTP `If-Modified-Since`/ETags to make unchanged refetches cheap.

**4. Traps and junk**: infinite URL spaces (calendars, session IDs in URLs) are capped by URL length, depth per site, and per-host page budgets; spam and low-quality sites get low priority; huge files are truncated.

**5. Failures**: fetch timeouts and retries with backoff; a crashed crawler node's hosts are reassigned (frontier state is persisted in a durable queue or checkpointed regularly).
--- wrap
**Monitoring**: pages fetched/s, error rates by type (DNS, timeouts, 5xx), politeness violations (should be zero), frontier size and age, duplicate rate, freshness of important pages.

**At 10×**: more host partitions and fetcher nodes (horizontal), regional fetchers near sites, smarter prioritisation so extra capacity goes to the most valuable pages.
--- variants
Q: A focused crawler for one topic (e.g. job postings)
A: Add a classifier that scores page relevance; prioritise links from relevant pages; structured extraction (titles, salaries) instead of full-text storage.
Q: Crawl only a single large site (an e-commerce catalogue) every day
A: Politeness toward one host dominates: coordinate a global rate for that host, use sitemaps and change feeds, incremental crawls with ETags.
Q: Render JavaScript-heavy pages
A: A pool of headless browsers, much more expensive per page: use it only for important sites, cache rendered results, and schedule rendering asynchronously after the raw fetch.
Q: Make it a distributed system over 100 machines
A: Partition by host hash; each node runs its own frontier, fetchers and seen-set shard; URLs discovered for other hosts are sent to the owning node in batches.
--- steer
Q: How do you avoid overloading a small website?
A: Per-host queues with next-allowed times, robots.txt and crawl-delay, all URLs of a host owned by one node.
Q: How do you know you've seen a URL among 50 billion?
A: Normalise, fingerprint, check a Bloom filter then a sharded seen store.
Q: The same article appears on 200 sites.
A: Content hashes for exact copies, SimHash for near-duplicates; store once, link the rest.
Q: Which pages should be recrawled first?
A: Importance (link-based score, traffic) × estimated change rate; conditional GETs for cheap checks.
Q: A site generates infinite URLs.
A: Depth and per-host budgets, URL length limits, pattern detection; low priority for suspicious URL spaces.
--- pitfalls
- A single global FIFO queue (no politeness, no priority)
- Forgetting robots.txt and DNS caching
- Dedup only by exact URL string without normalisation
- No defence against spider traps
- Ignoring recrawl and freshness
--- level
- **L4**: queue → fetch → parse → enqueue loop, with seen-set and storage.
- **L5**: Mercator-style frontier (priority + per-host politeness), host partitioning, Bloom-filtered dedup, near-duplicate detection, recrawl scheduling, traps.
- **L6**: freshness vs coverage economics, JavaScript rendering budget, feeding indexing and ranking, operating it continuously at web scale.

=== d-typeahead
est: 45
--- words
- **Typeahead (autocomplete)**: the suggestions that appear under a search box as you type.
- **Prefix**: the letters typed so far ("ne" → "netflix", "news").
- **Trie (prefix tree)**: a tree where each step down adds one letter, so all words starting with a prefix sit under one node.
- **Top-K**: the K most popular completions for a prefix, usually 5–10.
- **Debouncing**: waiting a few milliseconds after a keystroke before sending a request, so fast typists don't send one per letter.
- **Personalisation**: adjusting suggestions to the user's own history or location.
--- flow
1. **0–5, requirements**: suggestions for each prefix, top ~10 by popularity, under ~100 ms, updated daily or faster for trends. Clarify languages, personalisation, filtering of offensive terms.
2. **5–10, estimates**: 5 B searches/day, ~20 keystroke requests per search after debouncing ≈ 1 M requests/s.
3. **10–15, API and data**: `GET /suggest?q=`; precomputed prefix → top-K map.
4. **15–25, high level**: offline pipeline aggregates query logs → builds a prefix index → served from memory by suggestion servers behind caches; client caches and debounces.
5. **25–40, deep dives**: trie vs prefix-to-list map, top-K precomputation, sharding, trending updates, personalisation and filtering.
6. **40–45, wrap**: failures, monitoring, freshness.
--- req
**Functional**
- Return up to 10 suggestions for the current prefix, ranked mainly by popularity.
- Update popularity from search logs (daily), and surface trending queries within minutes (stretch).
- Filter offensive or unsafe suggestions; support multiple languages.
- Optional: personalised suggestions (my recent searches) and location-aware ones.

**Non-functional**
- **Very fast**: suggestions must feel instant, under ~100 ms end to end including the network, so the server budget is ~10–20 ms.
- **Very high QPS**: each search generates several keystroke requests.
- **Available**: if suggestions fail, the search box still works (degrade silently).
- **Eventual consistency**: suggestions can lag reality by minutes or hours.
--- est
- **Requests**: 5 B searches/day × ~4 suggestion requests per search after debouncing and client caching ≈ 20 B/day ≈ **230,000/s**, peaks ~1 M/s.
- **Distinct queries**: maybe 1 B distinct queries/day, but only the top ~100 M matter for suggestions.
- **Index size**: prefixes of 100 M queries (average 20 characters) ≈ 2 B prefixes, but most share nodes; storing top-10 IDs per prefix for prefixes up to ~15 characters ≈ tens of GB: fits in memory, sharded and replicated.
- **Log processing**: 5 B log lines/day ≈ 1 TB: a daily batch job, plus a streaming job for trends.
--- api
- `GET /v1/suggest?q=ne&lang=en&loc=IN` → `["netflix", "news", "nearby restaurants", ...]` with cache headers (`max-age` a few minutes).
- Client: debounce ~50–100 ms, cancel in-flight requests when new keys arrive, cache results per prefix in the session ("ne" → reuse for "net" filtering locally while waiting).

**Data**
- `prefix → [top-K query IDs with scores]` built offline, loaded into memory on servers.
- `query_id → text` dictionary.
- Trending overlay: `prefix → recent rising queries` from the stream job.
- Blocklist of unsafe queries applied in the build.
--- hl
**Offline**
1. Search logs stream into storage; a daily **MapReduce/Spark job** counts queries (with time decay so recent popularity counts more), drops rare and unsafe ones, and computes **top-K completions for every prefix**.
2. The result is packaged as an immutable index (a trie or a sorted prefix table) and **shipped to suggestion servers**, which swap it in atomically.

**Online**
1. The client sends the prefix; a **CDN/edge cache** answers popular short prefixes ("a", "fa") directly.
2. Otherwise a **suggestion server** (index in memory) looks up the prefix's precomputed top-K, merges the **trending overlay** and optional **personal** suggestions, filters, and returns.
3. Servers are **sharded by prefix** (or replicated whole if the index fits on one machine) with many replicas for QPS.

**Streaming**: a stream job counts queries in short windows, detects ones rising sharply and updates the trending overlay every minute.
--- deep
**1. Index structure**: a trie walks one node per character and stores the top-K list at each node, so a lookup is O(prefix length) with no search below. Simpler alternative: a hash map from prefix → top-K for all prefixes up to N characters (memory-heavier but trivial and fast). Long prefixes beyond N fall back to a sorted list search.

**2. Precomputing top-K**: computing top-K at query time by traversing a subtree is too slow for popular short prefixes. Compute bottom-up offline: each node's top-K is the merge of its children's top-K lists and its own count.

**3. Sharding**: shard by prefix range or by hash of the first two characters; beware skew (many queries start with "s" or "how"); split hot ranges further or replicate them more.

**4. Freshness**: a daily rebuild misses breaking news. The trending overlay from a streaming job (counts per minute with exponential decay, comparing to a baseline) injects rising queries quickly; it's small and can be updated in place.

**5. Personalisation and safety**: the user's recent queries (stored client-side or in a per-user store) are merged at request time; safety filtering happens offline (blocklists, classifiers) and online (for trending items, which haven't been reviewed).

**6. Latency**: in-memory lookups take microseconds; the budget goes to the network, so serve from regions near users and cache aggressively at the edge and in the browser.
--- wrap
**Failures**: suggestion server down → load balancer routes to replicas; index build fails → keep serving yesterday's index; streaming job lags → trends are stale but suggestions work; whole service down → the search box just shows no suggestions.

**Monitoring**: p99 latency, QPS, suggestion click-through rate, index build success and age, unsafe-suggestion reports.

**At 10×**: more replicas and edge caching (read-only data scales easily), more languages via separate indexes per language/region.
--- variants
Q: Autocomplete for a product catalogue on an e-commerce site
A: Suggestions come from product names, categories and popular searches; stock and personalisation matter; the catalogue changes often, so incremental index updates or an engine like Elasticsearch's completion suggester.
Q: Code completion in an IDE
A: Context matters more than popularity: completions come from symbols in scope and a language model; latency is still critical, so local indexes and small on-device models.
Q: Support typos ("netflx")
A: Fuzzy matching: edit-distance search in the trie with a small budget, or precomputed common misspellings mapped to corrections.
Q: Suggestions in 50 languages and scripts
A: Separate indexes per language/region; Unicode normalisation; for languages without spaces or with input methods (Chinese, Japanese) suggestions work on phonetic input.
--- steer
Q: Why not query the database with LIKE 'ne%' on each keystroke?
A: Far too slow at 1 M QPS and needs ranking; precompute top-K per prefix and serve from memory.
Q: How do you get breaking news into suggestions within minutes?
A: A streaming trend detector producing a small overlay merged at request time.
Q: Short prefixes like "a" are extremely hot.
A: Cache at the edge and client, replicate hot shards.
Q: How do you stop offensive suggestions?
A: Offline filtering with blocklists/classifiers plus online checks for trending items; human review loops.
Q: How does the client avoid hammering the server?
A: Debounce, cancel stale requests, cache per prefix, filter locally from a previous longer list.
--- pitfalls
- Computing completions at query time by scanning
- Ignoring client-side debouncing and caching
- No path for trending queries
- Forgetting content safety
- Hot-shard skew on popular first letters
--- level
- **L4**: trie with counts, precomputed top-K, served from memory with caching.
- **L5**: offline build pipeline with decay, atomic index swaps, sharding with skew, trending overlay, client behaviour, safety, latency budget.
- **L6**: personalisation and experimentation on ranking, multi-language strategy, cost and freshness trade-offs.

=== d-proximity
est: 45
--- words
- **Proximity search**: "find things near me", such as restaurants within 2 km.
- **Geohash**: a code for a rectangle on the map; longer codes are smaller rectangles, and nearby places usually share a prefix.
- **Quadtree**: a map divided into four squares, each split again where there are many places, so busy cities get small cells.
- **S2 cells**: Google's way of dividing the Earth's surface into cells along a space-filling curve, used by Maps.
- **Read-heavy**: places change rarely but are searched constantly.
- **Ranking**: ordering results by distance, rating, open-now and relevance, not distance alone.
--- flow
1. **0–5, requirements**: search places by location and radius (and category), view details, owners add/update places. Clarify: real-time moving objects? (that's ride-hailing) map tiles? reviews?
2. **5–10, estimates**: 200 M places, 100 M searches/day ≈ 1,200/s average, peaks ~5,000/s; writes tiny.
3. **10–15, API and data**: `GET /search?lat&lng&radius&category`; places table; geo index.
4. **15–25, high level**: search service with an in-memory geo index (geohash/quadtree/S2) → candidate places → ranking → details from cache/DB.
5. **25–40, deep dives**: choice of geo index, neighbouring cells and edge cases, density differences, ranking, index updates.
6. **40–45, wrap**: sharding by region, caching, failures.
--- req
**Functional**
- Search places near a point within a radius, optionally filtered (category, open now, price, rating).
- View a place's details; owners add or edit places (changes visible within minutes to a day).
- Results ranked by a mix of distance and quality.

**Non-functional**
- **Low latency**: under ~200 ms p99 for a search.
- **Read-heavy**: searches vastly outnumber edits.
- **Global**: works in dense cities and empty countryside alike.
- **Available**: stale data is acceptable; failures are not.
--- est
- **Places**: 200 M × ~1 KB of metadata ≈ 200 GB (details); the geo index itself is just (id, lat, lng, a few filter fields) ≈ 30 bytes each ≈ **6 GB**: fits in memory on one machine, replicated many times.
- **Searches**: 100 M/day ≈ **1,200/s**, peak ~5,000/s; each touches the index and fetches details for ~20 results.
- **Edits**: ~1 M/day ≈ 12/s: trivial.

So the index can be **replicated rather than sharded** at this scale; sharding by region becomes useful only with much more data or real-time updates.
--- api
- `GET /v1/places/search?lat=&lng=&radius_m=&category=&open_now=&cursor=` → list of places with distance.
- `GET /v1/places/{id}` → details.
- `POST /v1/places`, `PATCH /v1/places/{id}` (owners/moderation).

**Data**
- `places` (relational or document store): id, name, category, lat, lng, hours, rating, address.
- Geo index: geohash (precision ~6 for ~1 km cells) → list of place IDs; or a quadtree built in memory; or S2 cell IDs stored as a sorted column so a range scan returns a cell's places.
- Search may also use a search engine (Elasticsearch has geo queries) when combined with text search ("pizza").
--- hl
1. The client sends location and radius to the **search service** (stateless, many replicas).
2. The service computes the cells covering the circle (the centre cell and its neighbours, at a level matching the radius) and reads their place IDs from the **in-memory geo index**.
3. It filters candidates by exact distance and filters (category, open now), then **ranks** them (distance, rating, popularity, personal signals).
4. It **hydrates** the top results from a **details cache** backed by the places database.
5. Edits go to the places DB; an **index builder** applies changes to the geo index (incrementally, or a rebuild every few minutes/hours) and pushes it to the search replicas.
--- deep
**1. Geohash vs quadtree vs S2**: geohash is simple (string prefixes, works in any key-value store) but cells are fixed-size rectangles that distort near the poles, and neighbours can have very different prefixes at cell borders, so always query the 8 neighbours too. Quadtrees adapt to density (split when a cell has more than N places), giving similar-sized result sets in cities and countryside, but live in memory and are harder to update concurrently. **S2** maps the sphere onto a Hilbert curve with hierarchical cells; a circle is covered by a small set of cells of mixed sizes, and cell IDs are numbers in a sortable range: ideal for range scans in Bigtable or Spanner. Google Maps uses S2.

**2. Choosing the cell level**: pick the cell size from the radius (a 500 m search uses ~600 m cells and neighbours; a 20 km search uses bigger cells). If too few results, expand the radius step by step.

**3. Ranking**: distance alone gives poor results. Combine distance, rating (with confidence: 4.8 from 5 reviews vs 4.5 from 5,000), popularity, open-now, and relevance to the query, computed for the ~200 nearest candidates.

**4. Updates**: places change rarely, so rebuild the index periodically and swap it in, or apply small deltas via a change stream. New places appearing within minutes is usually enough.

**5. Scaling**: replicate the full index per region for reads; if data grows (or includes reviews and photos), shard by geography (S2 cell ranges) with a router; hot cities get more replicas.
--- wrap
**Failures**: a search replica dies → load balancer skips it; index builder fails → serve the previous index; places DB down → serve cached details, block edits.

**Monitoring**: search latency, empty-result rate, result click-through, index age, edit propagation delay.

**At 10×**: more replicas, regional sharding, precomputed results for popular map viewports.
--- variants
Q: Real-time moving objects (drivers, friends' locations)
A: Locations update every few seconds, so the index must take high write rates: in-memory grids per region updated in place (Redis geo sets, or per-cell driver lists), with stale entries expiring. See ride-hailing.
Q: Search "pizza near me" with text and location together
A: Use a search engine with geo filtering (inverted index + geo field), or geo-filter candidates first and rank with text relevance.
Q: Show places inside the visible map window as the user pans
A: Query by bounding box; cluster markers at low zoom (server-side clustering per cell); cache by tile coordinates.
Q: Find friends within 5 km (Nearby Friends)
A: Privacy dominates (opt-in, coarse locations, mutual friends only); locations update often; fan-out updates through pub/sub per cell to subscribed friends.
--- steer
Q: Why not a SQL query with lat BETWEEN and lng BETWEEN?
A: A two-column range doesn't use one index well and scans huge areas; geo indexes turn 2D proximity into 1D cell lookups.
Q: A user stands at the edge of a geohash cell.
A: Always include neighbouring cells, then filter by exact distance.
Q: Manhattan has 50,000 places within 2 km; rural areas have 3.
A: Adaptive cells (quadtree/S2 levels) and expanding radius until enough results; cap and rank.
Q: How often must the index update?
A: Places change rarely: periodic rebuilds or delta streams are enough; contrast with moving drivers.
Q: How do you rank results?
A: Distance plus rating with confidence, popularity, open-now and query relevance, on a few hundred candidates.
--- pitfalls
- Scanning latitude/longitude ranges in a relational table
- Forgetting neighbouring cells
- One fixed cell size for every density
- Sharding before checking that the index fits in memory
- Ranking by distance only
--- level
- **L4**: geohash or quadtree index with neighbour lookup, details from a DB and cache.
- **L5**: compares geohash, quadtree and S2 with their edge cases, sizes the index (replicate vs shard), ranking with confidence, update strategy, radius expansion.
- **L6**: S2-based sharding for global scale, combined text + geo search, map-viewport and clustering design, cost/latency trade-offs per region.
