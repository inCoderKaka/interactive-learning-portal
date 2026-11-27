=== object-storage
blurb: Storing billions of files and petabytes of data cheaply and durably: how object stores like Google Cloud Storage work (flat keys, immutable objects, metadata vs data), replication vs erasure coding, eleven nines of durability, storage classes and direct uploads with signed URLs.
signals: Photos, videos, backups, logs, ML datasets | "Where do uploaded files go?" | Durability requirements | Large uploads from clients
widgets: erasure

--- lesson
:::words
- **Object storage**: a service that stores whole files ("objects") under keys in "buckets", accessed over HTTP (Google Cloud Storage, Amazon S3, Azure Blob).
- **Object**: the file's bytes plus metadata (size, content type, custom tags), usually immutable once written.
- **Erasure coding**: splitting data into k pieces and adding m parity pieces so any k of the k + m pieces can rebuild the original.
- **Durability**: the probability data is not lost, often quoted in "nines" (99.999999999% = eleven nines).
- **Storage class**: a price/access trade-off tier: hot (Standard), cool (Nearline/Coldline), archive.
- **Signed URL**: a time-limited link that lets a client upload or download one object directly.
- **Multipart / resumable upload**: uploading a big file in pieces that can be retried individually.
:::

## The problem in plain words

Databases are built for small records and frequent updates. Photos, videos, backups and datasets are large, written once, read many times, and there are billions of them. Putting them in a database wastes its memory and I/O. Object storage is built for exactly this: virtually unlimited capacity, very high durability, low cost per gigabyte, and simple access by key. In a design, the database stores the object's key and metadata; the bytes live in object storage, usually behind a CDN.

:::eli5
A huge warehouse with a coat-check system. You hand over a box and get a ticket (the key); the warehouse keeps it safe, often splitting it into labelled parts stored in different rooms so that even if a few rooms flood, the box can be reassembled. You never rearrange the inside of a box; you hand in a new box instead.
:::

## How it works inside (simplified)

- **Flat namespace**: bucket + key (`photos/2026/11/abc123.jpg`); the slashes are just characters, not real folders.
- **Metadata service** maps each key to where its data chunks live; it is a highly available, partitioned database (Google's Colossus uses Bigtable-like metadata; Spanner backs Cloud Storage's metadata).
- **Data service** stores chunks across many disks, machines and racks (and zones or regions, depending on the class).
- **Immutability**: an object is replaced as a whole; there is no "update bytes 100–200". This makes caching, replication and consistency simpler. Google Cloud Storage provides strong read-after-write consistency for objects and listings.

## Replication vs erasure coding

**Three full replicas**: simple, fast to read and repair; storage overhead **3×**.

**Erasure coding (Reed–Solomon)**, e.g. k = 6 data + m = 3 parity: any 6 of the 9 pieces rebuild the object. Survives 3 lost pieces with **1.5×** overhead. Costs: reading may need several machines, and **repair** after a disk loss means reading k pieces to rebuild one (network-heavy). Large stores use erasure coding for most data, sometimes with replication for small or hot objects. Erasure-coded pieces are placed in different failure domains (racks, zones) so one failure takes at most one piece.

Lose disks yourself and watch when data becomes unrecoverable:

[[widget:erasure]]

## Durability arithmetic

Eleven nines (99.999999999%) annual durability means: store 10 million objects and expect to lose one every 10,000 years on average. It comes from many pieces across independent failure domains, continuous **scrubbing** (checksums verified in the background to catch silent corruption), and fast repair (the shorter the time a piece is missing, the lower the chance a second and third failure hit the same object first). Durability is not availability: an object can be safe but temporarily unreachable.

## Uploads and downloads

- **Direct uploads**: the client asks your server for a **signed URL**, then uploads straight to object storage; your servers never carry the bytes. A notification (Pub/Sub event) or the client's callback tells your service the upload finished, which triggers processing (thumbnails, virus scan).
- **Resumable / multipart uploads** for large files: retry a failed piece instead of restarting a 2 GB upload.
- **Downloads** through a CDN with signed URLs or signed cookies for private content.

## Storage classes and lifecycle

Hot (Standard) for frequently accessed data; Nearline/Coldline (accessed monthly/quarterly, cheaper storage, retrieval fees, minimum durations); Archive for backups and compliance. **Lifecycle rules** move objects between classes or delete them by age ("move to Coldline after 90 days, delete after 7 years").

## Interview angles

- "Where do user uploads go?" Object storage via signed URLs, metadata in the database, CDN for delivery, events trigger processing.
- "How do you get eleven nines?" Erasure coding or replication across failure domains, checksums and scrubbing, fast repair.
- "Replication or erasure coding?" Erasure coding for big, colder data (1.4–1.5× overhead); replication for small, hot data or simplicity.

--- revise
### Model
? Object storage's data model? :: Buckets of immutable objects addressed by flat keys, with metadata, over HTTP.
? Where do the bytes vs the metadata of a user's photo live in a design? :: Bytes in object storage; key and metadata in the database.

### Durability
? 3 replicas vs erasure coding (6+3)? :: 3× overhead, tolerates 2 losses vs 1.5× overhead, tolerates 3 losses (but costlier reads and repairs).
? What makes eleven nines possible? :: Pieces across independent failure domains, checksums + scrubbing, fast repair.
? Durability vs availability? :: Data not lost vs reachable right now.

### Uploads
? Why upload via signed URLs? :: Clients send bytes directly to storage; your servers never carry them.
? Why resumable/multipart uploads? :: Retry failed pieces instead of restarting large uploads.
? Lifecycle rules? :: Automatically move objects to colder classes or delete them by age.

--- notes
## Model
Bucket + flat key → immutable object + metadata; HTTP API.
Metadata service (partitioned, highly available) + data service (chunks across disks/racks/zones).
GCS: strong read-after-write consistency for objects and listings.
## Redundancy
3× replication: simple, fast repair.
Erasure coding k+m (Reed–Solomon): any k of k+m rebuild; 6+3 → 1.5×, survives 3; costly repair (read k pieces).
Pieces spread over failure domains.
## Durability
11 nines: 10M objects → ~1 loss per 10,000 years.
Scrubbing (checksums), fast repair, independent failures.
## Uploads/downloads
Signed URL direct upload → completion event → processing.
Resumable/multipart for large files.
CDN + signed URLs/cookies for downloads.
## Classes
Standard → Nearline → Coldline → Archive (cheaper storage, retrieval fees, minimum durations); lifecycle rules.

--- doubts
Q: Why can't I update part of an object?
A: Immutability keeps the system simple and scalable: no partial-write coordination across erasure-coded pieces, easy caching (a key's content never changes unless replaced), and safe replication. If you need to change bytes, write a new object (often under a new key, like a version or content hash).

Q: Is object storage a file system?
A: No. There are no real directories, renames of a "folder" mean copying every object, and there's no locking or partial writes. Tools present objects like files for convenience, but designs should treat it as a key–value store for big immutable blobs.

Q: Why does erasure-coded data repair cost so much?
A: To rebuild one lost piece you must read k other pieces (6 in a 6+3 scheme) from different machines and recompute it: 6× the data of the lost piece crosses the network. Large systems use codes designed to reduce repair traffic (local reconstruction codes, as in Azure) and repair in the background at controlled rates.

--- exercises
[estimate] 10 PB of user videos. Storage needed with 3× replication vs a 10+4 erasure code? How many simultaneous piece losses does each tolerate per object?
A: Replication: 30 PB raw, tolerates 2 lost copies. 10+4 erasure coding: 10 × 14/10 = 14 PB raw (1.4×), tolerates any 4 lost pieces. Erasure coding saves 16 PB of disks.

[design] Design photo uploads for a mobile app with 50,000 uploads per minute at peak.
A: App requests an upload slot: the API creates a pending photo record and returns a signed upload URL (valid 15 minutes) for `uploads/{user}/{photo_id}`. The app uploads directly to object storage (resumable for large files). An object-finalized notification (Pub/Sub) triggers workers that validate, virus-scan, create thumbnails into another bucket, and mark the photo ready. Downloads go through a CDN using the thumbnail keys; private photos use signed URLs. Lifecycle rules delete abandoned pending uploads after a day.

[break] A backend accepts uploads through its own API servers and writes them to object storage. During a viral event, API servers run out of memory and network bandwidth and the whole API goes down. Why, and what's the fix?
A: Every upload's bytes pass through the API servers (often buffered in memory), so a surge of large uploads saturates their bandwidth and memory, starving all other API traffic. Fix: signed URLs so clients upload directly to object storage; the API only issues URLs and records metadata.

--- pitfalls
- Storing large files in the database
- Proxying uploads through application servers
- Treating object storage like a file system (renames, partial updates, locking)
- Confusing durability with availability
- No lifecycle rules (cold data on expensive classes forever)

--- quiz
Q: What happens to an object when you "update" it?
- Bytes are modified in place
- *It is replaced as a whole by a new version
- Only metadata changes
- It is appended
W: Objects are immutable.
Q: A 6+3 erasure code tolerates how many lost pieces per object?
- 1
- 2
- *3
- 6
W: Any 6 of the 9 pieces rebuild the data.
Q: The best way for clients to upload large files is…
- Through your API servers
- *Directly to object storage using a signed URL
- By email
- Into the database
W: Your servers never carry the bytes.
Q: Erasure coding's main cost compared with replication is…
- More storage
- *More expensive reads and repairs (reading several pieces)
- Lower durability
- No checksums
W: Rebuilding a piece reads k others.

--- sources
- paper :: The Google File System (SOSP 2003) :: Ghemawat, Gobioff, Leung :: https://research.google/pubs/the-google-file-system/
- article :: A peek behind Colossus, Google's file system :: Google Cloud blog :: https://cloud.google.com/blog/products/storage-data-transfer/a-peek-behind-colossus-googles-file-system
- article :: Cloud Storage: storage classes, consistency, signed URLs :: Google Cloud :: https://cloud.google.com/storage/docs/storage-classes
- paper :: Erasure Coding in Windows Azure Storage (USENIX ATC 2012) :: Huang et al. :: https://www.usenix.org/conference/atc12/technical-sessions/presentation/huang

=== media-delivery
blurb: How video platforms turn an upload into smooth playback anywhere: chunked uploads, transcoding into a ladder of resolutions and bitrates, packaging into short segments (HLS/DASH), adaptive bitrate players, CDN delivery, and the costs that dominate.
signals: Design YouTube or Netflix | Video buffers on slow networks | Transcoding pipelines | Choosing what to store for each video
widgets: abr

--- lesson
:::words
- **Codec**: the algorithm that compresses video (H.264/AVC, VP9, AV1).
- **Transcoding**: converting an uploaded video into other codecs, resolutions and bitrates.
- **Bitrate**: how many bits per second of video; higher means better quality and bigger files.
- **Rendition / bitrate ladder**: the set of versions produced for one video (240p at 300 kbit/s … 4K at 16 Mbit/s).
- **Segment**: a short chunk of video (2–6 s) stored as a small file.
- **HLS / DASH**: the two standard formats for streaming video as segments described by a playlist (manifest).
- **Adaptive bitrate (ABR)**: the player choosing which rendition to fetch for each segment, based on its measured bandwidth and buffer.
:::

## The problem in plain words

An uploaded video is one big file in whatever format the phone recorded. Viewers are on fibre, on 3G in a train, on TVs and on phones; networks speed up and slow down mid-video. Sending everyone the original file would buffer constantly for some and waste bandwidth for others. Video platforms therefore prepare **many versions** of each video, cut into **short segments**, and let each viewer's player switch between versions **segment by segment** as its network changes.

:::eli5
A book published in large print, normal print and pocket size, with chapters you can borrow one at a time. If your bag is small today, you take the next chapter in pocket size; when you have more room, you switch back to large print. You never have to stop reading.
:::

## The pipeline

1. **Upload**: chunked, resumable upload to object storage (big files, unreliable networks).
2. **Validate and inspect**: format, duration, content checks (policy, copyright).
3. **Transcode** into a ladder of renditions. Work is split into chunks (say 10-second pieces) processed in parallel on many machines, then stitched: a 1-hour video finishes in minutes instead of hours. Expensive codecs (AV1) may be produced later and only for popular videos.
4. **Package** each rendition into 2–6 s segments with a manifest (HLS `.m3u8` or DASH `.mpd`) listing the renditions and segment URLs. Encrypt for DRM if needed.
5. **Store** segments in object storage; **distribute** through CDNs (popular videos pushed to the edge; long tail fetched on demand).
6. **Metadata and thumbnails** go to the database and image pipeline; the video becomes watchable.

## Adaptive bitrate playback

The player downloads the manifest, starts with a modest rendition (fast start), and before each segment chooses a rendition based on **measured throughput** and **buffer level**: if the buffer is healthy and bandwidth high, step up; if the buffer drains, step down before it empties (a stall, "rebuffering", is the worst user experience). Watch a player react to the network dropping and recovering:

[[widget:abr]]

Quality metrics platforms track: **startup time**, **rebuffering ratio**, **average bitrate**, and number of quality switches.

## Costs and design decisions

- **Storage**: every video × every rendition × replicas. Long-tail videos (rarely watched) may keep fewer renditions or move to colder storage; popular ones get every codec.
- **Egress / CDN**: video is the overwhelming majority of bytes; CDN hit rate and efficient codecs (VP9/AV1 save 30–50% bandwidth vs H.264 at equal quality) dominate cost. Large platforms place caches inside ISPs (Google Global Cache, Netflix Open Connect).
- **Transcoding compute**: big but one-time per video; prioritise (popular first, fast path for a low-resolution version so videos go live quickly).
- **Live streaming** adds latency constraints: shorter segments or low-latency HLS/DASH, transcoding in real time.

## Interview angles

- "Design YouTube's upload-to-playback path." Resumable upload → object storage → parallel chunked transcoding → segment packaging → CDN → ABR player.
- "Why segments and multiple renditions?" Network variability: the player adapts per segment; segments are cacheable files.
- "Where does the cost go?" Egress/CDN bandwidth first, then storage of renditions, then transcoding.

--- revise
### Pipeline
? Upload-to-playback steps? :: Resumable upload → validate → parallel chunked transcoding into a ladder → package into segments + manifest → object storage → CDN.
? Why transcode in parallel chunks? :: A long video finishes in minutes across many machines instead of hours on one.
? What is a bitrate ladder? :: The set of renditions (resolution + bitrate) produced for a video.

### Playback
? What do HLS/DASH provide? :: Short segments per rendition listed in a manifest the player reads.
? How does ABR choose a rendition? :: From measured throughput and buffer level, per segment.
? Worst playback experience to avoid? :: Rebuffering (stalls); step down before the buffer empties.

### Costs
? Biggest cost in video delivery? :: Egress/CDN bandwidth.
? How do efficient codecs help? :: VP9/AV1 cut bandwidth ~30–50% at equal quality.
? Long-tail optimisation? :: Fewer renditions or colder storage for rarely watched videos.

--- notes
## Pipeline
Resumable chunked upload → object storage → checks → split into chunks → parallel transcode (ladder: 240p…4K; H.264, VP9, AV1) → stitch → package into 2–6 s segments + HLS/DASH manifest (+ DRM) → storage → CDN.
Fast path: low-res first so videos go live quickly; expensive codecs for popular videos later.
## ABR
Start modest; per segment choose rendition from throughput + buffer; step down early to avoid stalls.
Metrics: startup time, rebuffering ratio, average bitrate, switch count.
## Costs
Egress/CDN ≫ storage > transcoding compute.
ISP-embedded caches (Google Global Cache, Netflix Open Connect).
Long tail: fewer renditions, colder classes.
## Live
Real-time transcoding, short/low-latency segments.

## Remember
Keep the original upload (cold) to re-encode with better codecs later.
Segments 2–6 s: shorter adapts faster, longer compresses better.
Track startup time, rebuffering ratio, average bitrate.
Encrypt segments for DRM; sign URLs for private content.
--- doubts
Q: Why not stream one file and let the network figure it out?
A: A single bitrate is either too high for slow connections (constant buffering) or too low for fast ones (poor quality). Segmented, multi-rendition streams let each viewer get the best quality their connection can sustain right now, and segments are ordinary small files that CDNs cache well.

Q: How long should segments be?
A: Shorter segments let players adapt faster and start sooner, but mean more requests and less compression efficiency per segment; longer ones are more efficient but adapt slowly. 2–6 seconds is typical; live low-latency streams go shorter (or use partial segments).

Q: Do platforms keep the original upload?
A: Usually yes, in colder storage, so they can re-transcode with better codecs later (as YouTube did when rolling out VP9 and AV1). Renditions can always be regenerated; the original can't.

--- exercises
[estimate] A platform serves 2 billion video hours per month at an average 3 Mbit/s. What is the average egress bandwidth, and what does a 30% codec saving buy?
A: 2 × 10⁹ hours × 3,600 s × 3 Mbit/s = 2.16 × 10¹⁶ Mbit per month; ÷ 2.6 × 10⁶ s ≈ 8.3 × 10⁹ Mbit/s ≈ 8.3 Tbit/s average (peaks much higher). A 30% codec saving removes ~2.5 Tbit/s of average egress: an enormous cost difference.

[design] Make a newly uploaded 2-hour video watchable within a few minutes.
A: Upload in resumable chunks; as soon as it lands, split the source into ~10 s segments and transcode a 360p/480p H.264 rendition first in parallel across many workers (a few minutes), package and publish it so the video goes live; then queue higher renditions and VP9/AV1 encodes at lower priority, updating the manifest as they complete.

[break] Users on mobile networks report frequent stalls even though average bandwidth is fine. The player picks renditions by average throughput over the last minute. What's wrong?
A: Mobile throughput fluctuates sharply; a one-minute average reacts too slowly, so the player keeps requesting high-bitrate segments after bandwidth drops, draining the buffer until it stalls. Use buffer-based adaptation (step down when the buffer falls below a threshold) combined with recent, conservative throughput estimates.

--- pitfalls
- One rendition for everyone
- Serial transcoding of long videos
- Players that ignore buffer level
- Keeping every rendition of every long-tail video on hot storage
- Ignoring CDN/egress as the dominant cost

--- quiz
Q: Adaptive bitrate streaming means…
- The server compresses on the fly per user
- *The player picks a rendition for each segment based on bandwidth and buffer
- Video is sent at the highest bitrate always
- The CDN changes codecs
W: Decisions are per segment, on the client.
Q: Why are videos cut into 2–6 second segments?
- To save storage
- *So players can switch renditions often and CDNs can cache small files
- For DRM only
- Because codecs require it
W: Segments are the unit of adaptation and caching.
Q: The dominant cost of a video platform is usually…
- Transcoding CPUs
- Metadata databases
- *Delivery bandwidth (egress/CDN)
- Thumbnails
W: Video is most of the bytes on the internet.
Q: To make a new video live quickly, a platform…
- Encodes AV1 4K first
- *Publishes a low-resolution rendition first, adding higher ones later
- Waits for all renditions
- Streams the original file
W: A fast path gets it watchable within minutes.

--- sources
- article :: HTTP Live Streaming (RFC 8216) :: IETF :: https://www.rfc-editor.org/rfc/rfc8216
- article :: Netflix: per-title encode optimization :: Netflix Technology Blog :: https://netflixtechblog.com/per-title-encode-optimization-7e99442b62a2
- article :: Google Global Cache :: Google :: https://support.google.com/interconnect/answer/9058809
- paper :: A Buffer-Based Approach to Rate Adaptation (SIGCOMM 2014) :: Huang et al. (Netflix/Stanford) :: https://dl.acm.org/doi/10.1145/2619239.2626296

=== inverted-index
blurb: How search engines find documents in milliseconds: tokenising text, building posting lists, intersecting them for queries, ranking with TF-IDF/BM25, and sharding an index across machines (by document vs by term), with how updates reach the index.
signals: Full-text search in any product | "Design a search engine" or typeahead | Choosing Elasticsearch | Ranking results by relevance
widgets: inverted-index

--- lesson
:::words
- **Document**: one searchable item (a web page, a product, a message).
- **Token / term**: a normalised word extracted from text ("Running" → "run").
- **Inverted index**: a map from each term to the list of documents containing it.
- **Posting list**: that list of document IDs (often with positions and counts) for one term.
- **Relevance ranking**: ordering matches by how well they answer the query (TF-IDF, BM25, learned models).
- **Shard**: one partition of the index on one machine.
:::

## The problem in plain words

Finding documents that contain the words "red running shoes" by scanning every document is hopeless at millions or billions of documents. Search engines do the work in advance: they build an **inverted index**, like the index at the back of a book, mapping every word to the documents that contain it. A query then becomes a few lookups and an intersection of sorted lists, done in milliseconds, followed by **ranking** the matches.

:::eli5
A cookbook's index lists "garlic: pages 12, 40, 77" and "lemon: pages 40, 90". To find recipes with garlic and lemon, you don't read the whole book: you look up both words and see that page 40 is on both lists.
:::

## Building the index

1. **Tokenise**: split text into words; lower-case; remove punctuation.
2. **Normalise**: stemming or lemmatisation ("running", "ran" → "run"), synonyms, accents; optionally drop stop words ("the").
3. **Build posting lists**: for each term, a **sorted** list of document IDs, often with term frequency and positions (for phrase queries).
4. **Compress**: store gaps between sorted IDs (delta encoding) with variable-length integers; lists shrink dramatically.

Index some documents and run queries:

[[widget:inverted-index]]

## Answering a query

- **AND** ("red AND shoes"): intersect sorted posting lists (walk them together, or skip ahead with skip pointers); start from the shortest list.
- **OR**: merge lists.
- **Phrases** ("running shoes"): intersect, then check positions are adjacent.
- **Prefix / typeahead**: a trie or sorted term dictionary finds all terms with the prefix.

## Ranking

Matching is only half; ordering decides whether search feels good.
- **TF-IDF**: a term matters more if it appears often in this document (term frequency) and rarely across all documents (inverse document frequency): "shoes" in a shoe shop is common, "trail" is informative.
- **BM25**: the standard refinement (diminishing returns for repeated terms, normalising by document length); Elasticsearch's default.
- **Signals beyond text**: popularity, freshness, personalisation, link structure (PageRank), click feedback, and learned ranking models; modern systems add **semantic (vector) retrieval** with embeddings, often combined with keyword search (hybrid search).
- Typical flow: cheap retrieval of thousands of candidates → expensive re-ranking of the top few hundred.

## Sharding the index

- **Document-partitioned** (each shard indexes a subset of documents; every query goes to all shards; merge their top results): simple, balanced, used by most engines (Elasticsearch, web search). Cost: fan-out to every shard and tail latency; replicas of each shard add throughput.
- **Term-partitioned** (each shard holds whole posting lists for some terms): a query touches only the shards of its terms, but multi-term queries need cross-shard intersection, and popular terms make hot shards. Rare in practice.

## Keeping the index fresh

Indexes are built from the source of truth (a database, crawled pages) and updated through a stream (change data capture or events). Engines like Lucene/Elasticsearch write new segments and merge them in the background (an LSM-like design), so new documents become searchable within about a second ("near real-time"). Large web indexes combine big periodic rebuilds with incremental updates.

## Interview angles

- "Design search for an e-commerce site." Inverted index (Elasticsearch) fed by CDC from the product DB; BM25 + popularity + business rules; document-partitioned shards with replicas; typeahead from a prefix index.
- "How is a multi-word query answered fast?" Intersect sorted posting lists starting with the rarest term; skip pointers.
- "Document or term partitioning?" Document: balanced and simple, fan-out to all shards; term: fewer shards per query but hot terms and cross-shard intersections.

--- revise
### Index
? What is an inverted index? :: A map from each term to a sorted posting list of documents containing it.
? Indexing pipeline? :: Tokenise → normalise (lower-case, stem, synonyms) → posting lists (IDs, frequencies, positions) → compress (delta + varint).
? How is an AND query answered? :: Intersect sorted posting lists, starting with the shortest, using skip pointers.
? How are phrase queries answered? :: Intersect, then check term positions are adjacent.

### Ranking
? TF-IDF idea? :: A term counts more if frequent in the document and rare across the collection.
? BM25? :: The standard TF-IDF refinement with saturation and length normalisation (Elasticsearch default).
? Typical two-stage ranking? :: Cheap retrieval of many candidates, expensive re-ranking of the top few hundred.

### Scale
? Document vs term partitioning? :: Document: each shard has some docs; queries fan out to all. Term: shards own terms; fewer shards per query but hot terms and cross-shard intersections.
? How does Elasticsearch make new docs searchable quickly? :: Writes new segments (refresh ~1 s) and merges them in the background.

--- notes
## Build
Tokenise → normalise (case, stemming/lemmas, synonyms, stop words) → posting lists (doc IDs sorted + tf + positions) → delta + varint compression.
Term dictionary (sorted/trie) for lookup and prefixes.
## Query
AND = intersect (shortest list first, skip pointers) · OR = merge · phrase = positions · prefix = term dictionary/trie.
## Rank
TF-IDF; BM25 (default in Elasticsearch/Lucene).
+ popularity, freshness, personalisation, PageRank, clicks, learned rankers.
Hybrid with vector (semantic) retrieval.
Retrieve candidates cheaply → re-rank top N.
## Shard
Document-partitioned (common): fan-out + merge; replicas for throughput; tail latency.
Term-partitioned (rare): hot terms, cross-shard intersections.
## Freshness
Feed from DB via CDC/events; Lucene segments + merges (near real-time ~1 s).

--- doubts
Q: Why is it called "inverted"?
A: A normal (forward) index maps each document to the words it contains. Search needs the opposite direction: from a word to the documents. Turning the mapping around is the "inversion".

Q: Should the search index be the source of truth?
A: No. It's a derived, query-optimised copy that may lag and can be rebuilt. Keep the canonical data in a database and feed the index from it (CDC or events); if the index is corrupted or the schema changes, re-index from the source.

Q: How does Google answer queries over hundreds of billions of pages so fast?
A: Massive document-partitioned sharding (each machine serves a slice of the index, largely from memory), many replicas, tiered indexes (a smaller index of high-quality pages tried first), aggressive caching of popular queries, early termination of posting-list scans, and multi-stage ranking. Jeff Dean's talks describe how the architecture evolved.

Q: Where do vector embeddings fit in?
A: Embedding-based (semantic) retrieval finds documents with similar meaning even without shared words ("cheap flights" vs "budget airfare"), using approximate nearest-neighbour indexes. Many systems combine keyword (BM25) and vector retrieval, then re-rank, because each catches what the other misses.

--- exercises
[estimate] A collection has 100 million documents averaging 500 terms. Roughly how many postings, and how much space at ~1.5 bytes per posting after compression?
A: 100M × 500 = 5 × 10¹⁰ term occurrences; with frequency counts per document (not every occurrence) maybe ~2 × 10¹⁰ postings. At ~1.5 bytes each ≈ 30 GB, plus positions if phrase search is needed (which can multiply it). Sharded across machines, mostly in memory.

[design] Design product search for an online store with 50M products, 5,000 queries per second, results within 100 ms.
A: Elasticsearch-style cluster, document-partitioned into ~20–40 shards with 2–3 replicas each (throughput and availability). Products indexed from the product DB via CDC (near-real-time updates, e.g. price, stock). Query: BM25 on title/description with field boosts, filters (category, price range, in stock), ranking blended with popularity and conversion rate; a re-ranker on the top 200. Typeahead served from a separate prefix index of popular queries. Cache popular query results for seconds.

[break] Search latency p99 is 800 ms although each shard's p99 is 50 ms. The index has 200 shards and every query hits all of them. Why, and what helps?
A: With 200 shards, almost every query hits at least one shard's slow tail (1 − 0.99²⁰⁰ ≈ 87%), plus merge overhead. Reduce fan-out (fewer, larger shards; route by category when filters allow), add replicas and hedged requests to cut tail latency, set per-shard timeouts and return partial results, and cache popular queries.

--- pitfalls
- Scanning documents instead of indexing
- Using the search index as the source of truth
- Intersecting posting lists starting from the longest
- Too many tiny shards (fan-out and tail latency)
- Ranking only by text match, ignoring popularity and freshness

--- quiz
Q: A posting list holds…
- The words of one document
- *The sorted IDs of documents containing one term
- Ranking scores only
- Query logs
W: It's the inverted direction: term → documents.
Q: To answer "cat AND dog" efficiently, intersect starting with…
- The longer posting list
- *The shorter posting list
- A random list
- The document with most terms
W: The rarest term bounds the candidates.
Q: In a document-partitioned index, a query is sent to…
- One shard
- *Every shard, whose top results are merged
- Only shards holding its terms
- The coordinator only
W: Each shard holds whole documents.
Q: BM25 is…
- A storage engine
- *A text relevance scoring function refining TF-IDF
- A sharding scheme
- A compression codec
W: Elasticsearch's default ranking formula.

--- sources
- book :: Introduction to Information Retrieval, ch. 1–2 and 6 (Manning, Raghavan, Schütze) :: Cambridge University Press :: https://nlp.stanford.edu/IR-book/
- paper :: The Anatomy of a Large-Scale Hypertextual Web Search Engine (1998) :: Sergey Brin, Lawrence Page :: http://infolab.stanford.edu/~backrub/google.html
- article :: Challenges in Building Large-Scale Information Retrieval Systems (WSDM 2009 keynote) :: Jeff Dean :: https://static.googleusercontent.com/media/research.google.com/en//people/jeff/WSDM09-keynote.pdf
- article :: Elasticsearch: near real-time search and shard architecture :: Elastic :: https://www.elastic.co/guide/en/elasticsearch/reference/current/near-real-time.html

=== geo-indexes
blurb: Answering "what's near me?" fast: why a normal index can't, geohashes that turn 2D locations into sortable strings, quadtrees that adapt to density, Google's S2 cells, and how ride-hailing and maps systems use them, including the edge cases.
signals: Find nearby drivers, restaurants or friends | "Design Yelp / Uber / Google Maps nearby" | Location updates at high rates | Range queries on latitude and longitude
widgets: geohash

--- lesson
:::words
- **Latitude / longitude**: the two numbers that give a position on Earth.
- **Geospatial index**: an index that makes "points within this area" queries fast.
- **Geohash**: a short string encoding a location, where nearby places usually share a prefix.
- **Quadtree**: a tree that splits a map area into four quadrants, splitting busy quadrants further.
- **S2 cell**: Google's hierarchical cells covering the sphere, each with a 64-bit ID.
- **Bounding box**: a rectangle of latitude/longitude ranges.
:::

## The problem in plain words

"Restaurants within 2 km of me" sounds easy, but a normal index sorts by one value. An index on latitude finds everything in a horizontal band across the whole planet; one on longitude, a vertical band; intersecting those is slow. Geospatial indexes map 2D space onto structures that keep **nearby places close together** in one dimension (or in a tree), so a proximity search becomes a few range lookups.

:::eli5
Divide a map into a grid of squares, label them, then divide each square into smaller labelled squares, and so on. A square's label is its parent's label plus one more letter, so all the little squares inside the "9q8" square start with "9q8". To find things near you, look in your square and the squares around it.
:::

## Geohash

Repeatedly halve the longitude range and the latitude range, recording one bit for each halving (alternating), then write the bits in base 32. Each extra character narrows the cell by a factor of 32:

| Length | Cell size (approx.) |
|---|---|
| 4 | ~39 km × 20 km |
| 5 | ~4.9 km × 4.9 km |
| 6 | ~1.2 km × 0.6 km |
| 7 | ~150 m × 150 m |

Points in the same cell share the prefix, so `WHERE geohash LIKE '9q8yy%'` is a simple **string prefix range** on any sorted index or key-value store. To search near a point, compute its cell at a suitable length and query **that cell plus its 8 neighbours** (because a nearby point may sit just across a cell border, with a different prefix), then filter by exact distance.

Zoom in and out, and see a point's cell and neighbours:

[[widget:geohash]]

Edge cases: cells near the poles are distorted; neighbouring cells across certain boundaries share no prefix at all (the prime meridian, the equator), which is exactly why you always query neighbours.

## Quadtrees

Start with the whole map as one node; when a node holds more than k points (say 100), split it into four quadrants. Dense cities get deep, small cells; oceans stay as huge leaves. Searching walks down to the leaf containing the point and its neighbours. Quadtrees adapt to **uneven density** (great for "nearest 20 restaurants"), usually live in memory, and need rebuilding or careful updates when points move constantly.

## S2 (Google)

S2 projects the sphere onto the six faces of a cube and subdivides each face into a quadtree of cells, ordered along a **Hilbert curve** (which keeps nearby cells close in the ordering better than geohash's curve). Each cell has a 64-bit ID; cells at level 30 are about 1 cm². A region (a circle, a polygon) is approximated by a small set of cells (a "covering"), and queries become a few integer range scans. Used across Google Maps, and by others (Uber's H3 is a similar idea with hexagons, which have uniform neighbour distances).

## Designing "nearby" systems

- **Static places** (restaurants): store geohash/S2 cell ID with each place in an indexed column or key; query the covering cells; filter and rank by distance, rating and open hours. Cache popular areas.
- **Moving objects** (drivers sending a location every 4 s): keep the latest position per driver **in memory**, indexed by cell (e.g. Redis GEO, which stores geohash-based scores in a sorted set, or a sharded in-memory grid keyed by cell). Update by moving the driver between cells; expire stale positions. History goes to a separate stream.
- **Sharding**: by region or cell prefix; beware hot cells (city centres at rush hour), so use finer cells or split shards there.

## Interview angles

- "Find nearby drivers." In-memory geo index keyed by cell (geohash/S2), query cell + neighbours, filter by distance, frequent updates with TTLs; shard by region.
- "Why query neighbouring cells?" Points just across a border have different prefixes.
- "Geohash or quadtree?" Geohash: simple, works on any sorted store, fixed cells. Quadtree: adapts to density, in memory, harder to update at high rates.

--- revise
### Geohash
? How does a geohash encode location? :: Alternately halving longitude and latitude ranges, bits written in base 32; each character narrows the cell ~32×.
? Why do nearby points share a prefix? :: Cells nest: a longer geohash is a sub-cell of its prefix.
? Why query the 8 neighbouring cells? :: A nearby point may lie just across a cell border with a different prefix.
? Geohash length 6 cell size? :: About 1.2 km × 0.6 km.

### Quadtree and S2
? Quadtree's strength? :: Adapts to density: splits busy cells, keeps sparse areas coarse.
? What is S2? :: Google's sphere-to-cube-face hierarchical cells ordered on a Hilbert curve with 64-bit IDs; regions become cell coverings.
? Why hexagons (H3)? :: Uniform distances to all neighbours.

### Systems
? Nearby drivers design? :: Latest positions in memory indexed by cell; query covering cells; filter by distance; TTLs; shard by region.
? Hot cells? :: City centres overload one shard: use finer cells or split shards there.

--- notes
## Geohash
Interleave lon/lat bisection bits → base32; nested cells; prefix = containment.
Length 5 ≈ 5 km, 6 ≈ 1.2 × 0.6 km, 7 ≈ 150 m.
Query: cell + 8 neighbours → exact-distance filter.
Edge effects at poles and across the equator/meridian.
## Quadtree
Split a node into 4 when > k points; dense areas deep; in memory; costly with constant movement.
## S2 / H3
S2: cube faces, Hilbert-curve-ordered quadtree cells, 64-bit IDs, coverings → integer ranges (Google Maps).
H3 (Uber): hexagons, uniform neighbours.
## Systems
Static places: cell ID column/key; covering query; rank by distance + rating.
Moving objects: in-memory latest position by cell (Redis GEO sorted sets, sharded grids); TTL stale; history to a stream.
Shard by region/cell prefix; split hot cells.

## Remember
Choose cell size ≈ search radius; expand rings if too few results.
Composite (lat, lng) B-trees scan whole latitude bands.
Moving objects need TTLs so stale positions vanish.
Databases with geo support: PostGIS, Redis GEO, Elasticsearch, MongoDB 2dsphere, BigQuery GIS (S2).
--- doubts
Q: Why not just use a B-tree on (latitude, longitude)?
A: A composite index is sorted by latitude first, so it finds a latitude band quickly but then has to scan every longitude in that band (worldwide), and the second column only helps within equal latitudes. Geohash/S2 interleave the two dimensions so a single range covers a compact square area.

Q: How precise does the geohash need to be?
A: Choose the cell size close to your search radius: for "within 1 km", length 6 cells (~1 km) plus neighbours cover the area with little waste. Longer geohashes create many tiny cells to query; shorter ones return too many candidates to filter.

Q: Do databases support this directly?
A: Yes: PostGIS (R-tree/GiST indexes) in PostgreSQL, Redis GEO commands, Elasticsearch geo queries, MongoDB 2dsphere indexes, BigQuery GIS (S2-based). In interviews, knowing what they do underneath is the point.

--- exercises
[design] Design "nearby drivers" for a ride-hailing app: 1M active drivers updating location every 4 seconds; riders request the 10 nearest available drivers.
A: Writes: 1M / 4 = 250k location updates/s to an in-memory geo index sharded by city or S2 cell prefix (e.g. Redis GEO per region, or a custom grid service). Each update moves the driver to its current cell (level ~13–14 S2 or geohash 6) with a short TTL so stale drivers disappear. Query: compute the rider's cell and neighbours (expanding rings if too few), fetch available drivers, compute exact distances (or ETAs from a routing service), return the best 10. Location history goes to a stream for analytics. Hot downtown cells are served by more shards.

[break] A "nearby restaurants" feature uses geohash prefix queries but misses obviously close restaurants for some users. Why?
A: It queries only the user's own cell. Users near a cell edge have close restaurants in the neighbouring cell, whose geohash has a different prefix. Query the cell plus its 8 neighbours, then filter by actual distance.

[choose] An app shows restaurants (300k, rarely moving) and also live delivery couriers (50k, moving constantly). One geo index approach for both?
A: Not necessarily. Restaurants: geohash/S2 cell IDs stored in the main database or search index (rarely updated), queried with coverings and ranked. Couriers: an in-memory, frequently updated index keyed by cell with TTLs. Different update rates call for different storage.

--- pitfalls
- Querying only the user's own cell
- A composite (lat, lng) B-tree for proximity search
- Storing high-rate moving positions in the main database
- No TTL for stale positions
- Ignoring hot cells in dense cities

--- quiz
Q: Two points whose geohashes share a 6-character prefix are…
- Always within 100 m
- *In the same ~1.2 km × 0.6 km cell
- On the same latitude
- Unrelated
W: Shared prefix = same containing cell.
Q: Why must a proximity search check neighbouring cells?
- To speed it up
- *Close points across a cell border have different prefixes
- Cells overlap
- Geohashes are random
W: Borders split nearby points.
Q: A quadtree's advantage over a fixed grid is…
- Simpler updates
- *It adapts cell size to point density
- It needs no memory
- Exact distances
W: Dense areas get finer cells.
Q: S2 orders cells along…
- A Z-order curve only
- *A Hilbert curve, keeping nearby cells close in ID order
- Latitude only
- Random order
W: Better locality than geohash's interleaving.

--- sources
- article :: S2 Geometry library: overview and cell hierarchy :: Google :: https://s2geometry.io/devguide/s2cell_hierarchy
- article :: Geohash :: Wikipedia :: https://en.wikipedia.org/wiki/Geohash
- article :: H3: Uber's Hexagonal Hierarchical Spatial Index :: Uber Engineering :: https://www.uber.com/blog/h3/
- article :: Redis geospatial indexes (GEOADD, GEOSEARCH) :: Redis :: https://redis.io/docs/latest/develop/data-types/geospatial/

=== sketches
blurb: Answering "is it in the set?", "how many distinct?" and "how often?" over huge streams with tiny memory and small, known errors: Bloom filters, HyperLogLog and Count-Min sketches, how each works and where large systems use them.
signals: Unique visitors over billions of events | Avoid disk reads for keys that don't exist | Top trending items or heavy hitters | Memory-limited counting at scale
widgets: bloom, hll

--- lesson
:::words
- **Probabilistic data structure (sketch)**: a compact summary that answers questions approximately, with a known error, using far less memory than exact answers.
- **False positive**: saying "yes" when the truth is "no".
- **Cardinality**: the number of distinct items.
- **Heavy hitter**: an item that appears very frequently in a stream.
- **Hash function**: maps an item to a random-looking number; the same item always gives the same number.
:::

## The problem in plain words

Exact answers can be expensive at scale. Counting distinct visitors across a billion page views exactly means remembering every visitor ID seen (gigabytes). Checking whether a username is taken before hitting the database costs a disk read. Finding the most popular search terms exactly means counting every term. **Sketches** trade a small, controlled error for enormous savings in memory and time, and many systems you use every day rely on them.

:::eli5
Instead of a guest book with every visitor's name, the doorman keeps a few tally marks in a clever pattern. He can't tell you exactly who came, but he can estimate how many different people came to within 1%, using a notepad instead of a library.
:::

## Bloom filter: "definitely not" or "probably yes"

A bit array of m bits and k hash functions. Adding an item sets the k bits it hashes to. Checking an item: if any of its k bits is 0, it was **definitely never added**; if all are 1, it was **probably added** (they might have been set by other items).

[[widget:bloom]]

- No false negatives; a tunable false-positive rate: about 10 bits per item with 7 hashes gives ~1%.
- Can't delete items (counting Bloom filters can) and can't list members.
- Uses: LSM-tree databases skip SSTables that can't contain a key (Bigtable, Cassandra, RocksDB); CDNs avoid caching one-hit wonders; malicious-URL checks; "have we crawled this URL?" checks; blocking cache penetration by non-existent IDs.

## HyperLogLog: counting distinct items

Hash each item to a uniformly random-looking bit string. In random bit strings, seeing a string starting with many zeros is rare: a run of r leading zeros is expected about once per 2^r distinct items. HyperLogLog splits items into m buckets by the first bits of their hash, records in each bucket the **longest run of leading zeros** seen, and combines the buckets with a harmonic mean to estimate the count.

[[widget:hll]]

- Error about 1.04 / √m: with m = 16,384 buckets (~12 KB), about 0.8%.
- **Mergeable**: union of two HLLs = bucket-wise maximum, so you can count distinct users per hour and merge into per-day counts without re-reading data.
- Uses: unique visitors/users (Redis `PFADD`/`PFCOUNT`, BigQuery `APPROX_COUNT_DISTINCT`, Google's HyperLogLog++ improvements), distinct-value statistics in query optimisers.

## Count-Min sketch: how often?

A small table of d rows × w counters, each row with its own hash function. Adding an item increments one counter per row; the estimate is the **minimum** of its d counters. Collisions only ever add, so it **never undercounts** and overcounts by a bounded amount (with w = e/ε and d = ln(1/δ), the error is at most ε × total count with probability 1 − δ).

- Pair with a small heap to track **top-k / heavy hitters** (trending hashtags, hot keys, abusive IPs).
- Uses: hot-key detection, rate limiting by approximate counts, network traffic monitoring, TinyLFU cache admission.

## Choosing

| Question | Sketch | Memory | Error |
|---|---|---|---|
| Have I seen X? | Bloom filter | ~10 bits/item for 1% FP | False positives only |
| How many distinct? | HyperLogLog | ~12 KB for ~1% | ± relative error |
| How often is X? Top items? | Count-Min (+ heap) | KBs–MBs | Overcounts only |

## Interview angles

- "Count unique daily users across 10 billion events." HyperLogLog per day (and per hour, merged).
- "Avoid disk lookups for keys that don't exist." Bloom filters (as LSM stores do), or in front of a cache.
- "Find trending hashtags in real time." Count-Min sketch over a sliding window plus a top-k heap.

--- revise
### Bloom
? Bloom filter answers? :: "Definitely not in the set" or "probably in the set" (false positives, no false negatives).
? Bits per item for ~1% false positives? :: About 10 (with ~7 hash functions).
? Where do LSM databases use Bloom filters? :: To skip SSTables that cannot contain the key.

### HyperLogLog
? HLL's core idea? :: Long runs of leading zeros in hashes are rare; the longest run per bucket estimates distinct count.
? HLL error with 16,384 buckets (~12 KB)? :: About 0.8% (1.04/√m).
? Why is HLL mergeability useful? :: Bucket-wise max unions hourly sketches into daily counts without rereading data.

### Count-Min
? How does Count-Min estimate a count? :: Minimum of the item's counters across d hashed rows.
? Count-Min's error direction? :: Only overcounts (collisions add).
? Count-Min + heap gives? :: Approximate top-k / heavy hitters.

--- notes
## Bloom filter
m bits, k hashes; add sets k bits; check: any 0 → definitely not, all 1 → probably.
~10 bits/item + 7 hashes ≈ 1% FP; no deletes (counting variant), no listing.
Uses: LSM SSTable skipping, CDN one-hit-wonder filtering, URL/crawl checks, cache-penetration guards.
## HyperLogLog
Hash → bucket by first bits; store max leading-zero run; harmonic-mean estimate.
Error ≈ 1.04/√m; 16,384 buckets ≈ 12 KB ≈ 0.8%.
Mergeable (bucket-wise max).
Redis PFADD/PFCOUNT, BigQuery APPROX_COUNT_DISTINCT, HLL++ (Google).
## Count-Min
d × w counters; increment one per row; estimate = min; never undercounts; error ≤ εN w.p. 1−δ.
+ heap → top-k / heavy hitters; hot keys, trending, TinyLFU.
## Choose
Membership → Bloom · distinct → HLL · frequency/top-k → Count-Min.

--- doubts
Q: Why are Bloom filter false positives acceptable?
A: Because they're used as a cheap pre-check: a "probably yes" is followed by the real (expensive) lookup, which gives the true answer. The filter only has to make the common "no" case cheap. A 1% false-positive rate means 99% of pointless disk reads are avoided.

Q: How can 12 KB count a billion distinct users?
A: HLL doesn't store users; it stores, per bucket, one small number (the longest leading-zero run seen), which grows only logarithmically with the count. The statistics of random hashes let that summary estimate the count within about 1%, whatever the true number.

Q: Can sketches be combined across servers?
A: Yes, which is a big part of their appeal: Bloom filters of the same size and hashes combine by OR (union), HyperLogLogs by bucket-wise max, Count-Min sketches by adding counters. Each server sketches its own stream and a coordinator merges them.

--- exercises
[estimate] You must check 1 billion usernames for "probably taken" in memory with 1% false positives. How big is the Bloom filter?
A: About 10 bits per item → 10 × 10⁹ bits ≈ 1.25 GB (the exact formula gives ~9.6 bits/item for 1%). Fits on one machine; "maybe taken" answers are confirmed against the database.

[design] Report daily and monthly unique users for each of 10,000 apps from a stream of 50 billion events per day.
A: For each (app, day) keep a HyperLogLog (~12 KB): 10,000 × 12 KB = 120 MB per day. Stream processors update the sketches; monthly uniques = merge (bucket-wise max) of the 30 daily sketches per app, no reprocessing. Store sketches (BigQuery's HLL functions or Redis) for ad-hoc unions such as "unique users of apps A or B".

[choose] An API gateway wants to identify the top 100 clients by request count each minute across 50M distinct clients, with a few MB of memory per node.
A: A Count-Min sketch per node per minute (counts per client) plus a min-heap of the current top 100 candidates; merge sketches across nodes by adding counters; report heavy hitters. Exact counts for 50M clients would need gigabytes.

--- pitfalls
- Using a Bloom filter where false positives can't be tolerated without a follow-up check
- Trying to delete from a plain Bloom filter
- Exact distinct counting over huge streams
- Forgetting sketches must use the same parameters/hashes to merge
- Reporting sketch estimates as exact numbers

--- quiz
Q: A Bloom filter can return…
- False negatives
- *False positives
- Exact counts
- The list of members
W: "Definitely not" is always right; "probably yes" may be wrong.
Q: HyperLogLog estimates…
- Membership
- *The number of distinct items
- Item frequencies
- Sort order
W: Cardinality from leading-zero statistics.
Q: A Count-Min sketch's estimate for an item is…
- The sum of its counters
- The maximum of its counters
- *The minimum of its counters
- The average
W: Collisions only add, so the minimum is closest.
Q: Two servers' HyperLogLogs are merged by…
- Adding buckets
- *Taking the bucket-wise maximum
- Averaging
- They can't be merged
W: Union of sets = max per bucket.

--- sources
- paper :: Space/Time Trade-offs in Hash Coding with Allowable Errors (1970) :: Burton H. Bloom :: https://dl.acm.org/doi/10.1145/362686.362692
- paper :: HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm (2007) :: Flajolet, Fusy, Gandouet, Meunier :: https://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf
- paper :: HyperLogLog in Practice: Algorithmic Engineering of a State of The Art Cardinality Estimation Algorithm (EDBT 2013) :: Heule, Nunkesser, Hall (Google) :: https://research.google/pubs/hyperloglog-in-practice-algorithmic-engineering-of-a-state-of-the-art-cardinality-estimation-algorithm/
- paper :: An Improved Data Stream Summary: The Count-Min Sketch and its Applications (2005) :: Cormode, Muthukrishnan :: https://dimacs.rutgers.edu/~graham/pubs/papers/cm-full.pdf

=== time-series
blurb: Storing metrics and other time-stamped data efficiently: the shape of time-series workloads, compression (delta-of-delta, XOR), downsampling and retention, the cardinality problem, and how systems like Prometheus and Google's Monarch are built.
signals: Metrics and monitoring | IoT sensor data | "Store 10 million data points per second" | High-cardinality labels blowing up storage
prereq: btree-lsm

--- lesson
:::words
- **Time series**: a sequence of (timestamp, value) points for one thing being measured, such as CPU usage of one server.
- **Series identity / labels**: the name and labels that identify a series: `http_requests_total{service="cart", code="500"}`.
- **Cardinality**: the number of distinct series. Each unique label combination is a new series.
- **Downsampling (rollup)**: replacing fine-grained points with coarser summaries (1-minute averages instead of 10-second points).
- **Retention**: how long data is kept at each resolution.
:::

## The problem in plain words

Monitoring and sensor systems write enormous numbers of small data points, almost always appended in time order, and read them as ranges ("this metric over the last 6 hours"), usually aggregated. Old data is rarely needed at full detail. General-purpose databases waste effort on features this workload doesn't need. Time-series databases exploit the pattern: append-only writes, extreme compression of regular timestamps and slowly changing values, and automatic downsampling of old data.

:::eli5
A weather station records the temperature every 10 seconds. Writing "10:00:00 21.5°, 10:00:10 21.5°, 10:00:20 21.6°…" in full wastes paper. Noting "every 10 s, same as before, same, +0.1" is far shorter. And for last year's data, a daily high and low is enough.
:::

## Workload shape

- **Writes**: very high volume, mostly appends at "now", many series in parallel.
- **Reads**: ranges over recent data per series, aggregated across series (sum of requests across 500 servers) and over time (rate per minute).
- **Old data**: queried rarely and coarsely.
- **Updates and deletes**: rare (whole time ranges expire).

## Compression

Facebook's Gorilla paper (2015) showed the classic techniques:
- **Timestamps**: store the delta between consecutive timestamps, then the delta of deltas; for regular intervals that is almost always 0, encoded in one bit.
- **Values**: XOR each floating-point value with the previous one; slowly changing values share most bits, so only the few differing bits are stored.
- Result: ~1.37 bytes per point instead of 16 (8-byte timestamp + 8-byte value), about 12× smaller, letting recent data live in memory.

## Downsampling and retention

Keep raw points for days, 1-minute rollups for weeks, 1-hour rollups for months or years. Store several aggregates per rollup (min, max, sum, count) so averages and spikes both survive: an average alone hides the peak that caused an outage.

## The cardinality problem

Every distinct label combination is a separate series with its own index entry and buffers. Labels like `user_id` or `request_id` explode cardinality into millions of series and can take a metrics system down. Rule: labels must have **bounded** values (service, region, status code); unbounded identifiers belong in logs or traces, not metric labels.

## Systems

- **Prometheus**: pulls (scrapes) metrics from targets every 10–30 s, stores them in a local time-series database with compressed chunks, queries with PromQL; scaled with federation or remote storage (Thanos, Cortex/Mimir).
- **Google Monarch** (2020 paper): Google's planet-scale in-memory time-series database for monitoring, regionalised to keep monitoring working even when other systems fail, with a global query layer.
- **InfluxDB, TimescaleDB** (on PostgreSQL), **Bigtable** for custom time-series (row key = series + reversed time bucket).

## Interview angles

- "Design a metrics system." Agents push or a collector pulls; write path to a time-series store sharded by series; compression; rollups and retention tiers; query layer aggregating across shards; alerting evaluates queries continuously.
- "Why is our metrics bill exploding?" Cardinality: an unbounded label.
- "How do you store a year of per-second data?" You don't keep it raw: downsample with min/max/sum/count.

--- revise
? Time-series workload shape? :: Huge append-mostly writes at "now"; range reads aggregated over series and time; old data coarse and rare.
? Gorilla timestamp compression? :: Delta-of-delta: regular intervals encode as ~1 bit.
? Gorilla value compression? :: XOR with the previous value; store only differing bits (~1.37 bytes/point overall).
? Downsampling rule? :: Keep min, max, sum, count per rollup so peaks and averages survive.
? What is cardinality in metrics? :: The number of distinct label combinations (series).
? Classic cardinality mistake? :: Unbounded labels like user_id or request_id.
? Prometheus model? :: Pull/scrape targets every 10–30 s, local compressed TSDB, PromQL; scale via remote storage.
? Monarch? :: Google's regionalised, in-memory, planet-scale monitoring time-series database.

--- notes
## Workload
Append at now; many series; range + aggregate reads; old data coarse; whole-range expiry.
## Compression (Gorilla, 2015)
Timestamps: delta-of-delta (≈1 bit when regular).
Values: XOR with previous float; store differing bits.
≈1.37 B/point vs 16 B raw (~12×); recent data in memory.
## Rollups and retention
Raw days → 1 min weeks → 1 h years; keep min/max/sum/count.
## Cardinality
Series = unique label set; bounded labels only (service, region, code); IDs go to logs/traces.
## Systems
Prometheus (pull, TSDB, PromQL; Thanos/Mimir for scale).
Monarch (Google, in-memory, regionalised).
InfluxDB, TimescaleDB, Bigtable (series + time-bucket row keys).

--- doubts
Q: Why do metrics systems prefer pull (Prometheus) or push?
A: Pull lets the monitoring system control timing and notice when a target is down (a failed scrape); push suits short-lived jobs and clients behind firewalls. Both work at scale; many setups combine them (a push gateway for batch jobs).

Q: Why keep min and max in rollups, not just the average?
A: Averages smooth away short spikes. A one-minute CPU spike to 100% that caused errors becomes a modest bump in an hourly average. Keeping max (and percentile sketches where possible) preserves the evidence.

Q: Can I store metrics in a normal database?
A: At small scale, yes (TimescaleDB is PostgreSQL). At millions of points per second, you need time-series-specific compression, append-optimised storage and rollups, which is why dedicated systems exist.

--- exercises
[estimate] 2 million series, one point every 10 s. Points per second and raw storage per day at 16 bytes per point, and with Gorilla-style compression (~1.4 bytes)?
A: 200,000 points/s; per day 1.73 × 10¹⁰ points. Raw: ~276 GB/day. Compressed: ~24 GB/day, so recent days fit in memory across a few machines.

[break] After a deploy that added a `customer_id` label to a request-latency metric, the monitoring system ran out of memory. Why?
A: Each customer_id value creates a new series for every combination of the other labels: millions of new series, each with index entries and in-memory buffers. Cardinality exploded. Remove the label (use logs or traces for per-customer analysis), or aggregate before export.

[design] Design storage for 5 years of temperature readings from 1M sensors reporting every minute, with dashboards for the last day and yearly trends.
A: Ingest via a stream into a time-series store sharded by sensor; raw minute data kept 30 days; hourly rollups (min, max, avg/sum, count) kept 1 year; daily rollups kept 5 years. Compression with delta-of-delta and XOR. Dashboards query the appropriate resolution automatically based on the time range.

--- pitfalls
- Unbounded label values (cardinality explosions)
- Keeping all data at full resolution forever
- Rollups that keep only averages
- Using a general-purpose OLTP table for millions of points per second
- Treating metrics as a place for per-request details

--- quiz
Q: Delta-of-delta encoding works well because…
- Values never change
- *Timestamps usually arrive at regular intervals
- It's lossy
- It sorts data
W: The second difference of regular timestamps is zero.
Q: Cardinality in a metrics system is…
- The number of data points
- *The number of distinct series (label combinations)
- Retention length
- Compression ratio
W: Each unique label set is a series.
Q: Which label is dangerous on a metric?
- region
- status_code
- *user_id
- service
W: Unbounded values create millions of series.
Q: When downsampling, keep…
- Only the average
- *Min, max, sum and count
- Only the last value
- Nothing
W: Peaks and averages both survive.

--- sources
- paper :: Gorilla: A Fast, Scalable, In-Memory Time Series Database (VLDB 2015) :: Pelkonen et al. (Facebook) :: https://www.vldb.org/pvldb/vol8/p1816-teller.pdf
- paper :: Monarch: Google's Planet-Scale In-Memory Time Series Database (VLDB 2020) :: Adams et al. :: https://research.google/pubs/monarch-googles-planet-scale-in-memory-time-series-database/
- article :: Prometheus: data model and storage :: Prometheus Authors :: https://prometheus.io/docs/prometheus/latest/storage/
- article :: Bigtable schema design for time series data :: Google Cloud :: https://cloud.google.com/bigtable/docs/schema-design-time-series
