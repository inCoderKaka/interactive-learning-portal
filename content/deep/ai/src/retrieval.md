=== ann-indexes
blurb: Finding nearest vectors among millions fast: exact search costs, the recall–latency trade-off, IVF clustering, HNSW graphs, product quantisation and IVF-PQ, ScaNN's anisotropic quantisation, LSH, and how to tune and benchmark ANN indexes.
signals: "How do you search 1 billion embeddings in 20 ms?" | "Explain HNSW / IVF-PQ" | "Recall@10 dropped after changing index parameters" | Vector database choices in RAG and recommendation designs
widgets: hnsw, ivf-pq
prereq: embedding-similarity, clustering-pca

--- lesson
:::words
- **Nearest-neighbour search**: finding the stored vectors closest to a query vector.
- **Exact (brute-force) search**: comparing the query with every vector.
- **ANN** (approximate nearest neighbour): returning *most* of the true nearest neighbours, much faster.
- **Recall@k**: the fraction of the true top-k neighbours the index returns.
- **IVF** (inverted file): cluster the vectors; search only the closest clusters.
- **HNSW** (hierarchical navigable small world): a layered graph you walk greedily toward the query.
- **PQ** (product quantisation): compressing vectors into short codes for fast approximate distances.
:::

## The problem in plain words

Semantic search, RAG, recommendations and deduplication all reduce to "find the vectors closest to this one". Checking every vector is exact but too slow and memory-hungry at hundreds of millions of items. ANN indexes trade a little accuracy (recall) for orders-of-magnitude speed. Knowing how the main index families work, and their knobs, is expected in any retrieval-heavy design interview.

:::eli5
Finding the house most like yours in a country of 100 million homes. Checking every house takes forever. Instead, first go to the right town (clusters), or start at a well-connected hub and keep walking to a neighbour closer to your target until you can't get closer (graphs). You might occasionally miss the very best match, but you're done in seconds.
:::

## Exact search and its cost

Brute force: $N$ distance computations of dimension $d$ per query: $O(Nd)$. For $N = 10^8$, $d = 768$: ~$7.7\times10^{10}$ multiply-adds, about 0.1–1 s on a GPU and much more on a CPU, plus 300 GB of float32 vectors. Fine for up to a few million vectors (especially batched on GPUs), not for billions at low latency.

## IVF: cluster, then search a few clusters

1. **Train**: run k-means on a sample to get $n_{\text{list}}$ centroids (e.g. $\sqrt{N}$ to $16\sqrt{N}$).
2. **Index**: assign each vector to its nearest centroid's list.
3. **Query**: find the $n_{\text{probe}}$ nearest centroids, scan only their lists.

Cost ≈ $n_{\text{list}} + N \cdot n_{\text{probe}}/n_{\text{list}}$ distance computations. $n_{\text{probe}}$ is the recall/speed dial: neighbours near cluster boundaries are missed when too few lists are probed.

## Product quantisation: compress vectors

Split each $d$-dimensional vector into $m$ sub-vectors; run k-means with 256 centroids on each subspace; store each sub-vector as one byte (its centroid ID). A 768-dim float32 vector (3,072 bytes) becomes $m = 96$ bytes: 32× smaller. Distances are approximated with **lookup tables**: precompute the query's distance to all 256 centroids in each subspace, then a vector's distance is the sum of $m$ table lookups (asymmetric distance computation). **IVF-PQ** combines both: IVF to choose lists, PQ codes (of residuals from the centroid) inside them; then optionally **re-rank** the top candidates with full vectors. This is how FAISS searches billions of vectors on one machine. Step through IVF probing and PQ encoding below:

[[widget:ivf-pq]]

## HNSW: navigable graphs

Build a graph where each vector links to $M$ near neighbours, in several layers: the top layers are sparse (few nodes, long links), the bottom layer contains everything (short links), like an express-and-local train map. Search: start at the top entry point, greedily move to the neighbour closest to the query, drop down a layer when stuck, and at the bottom run a best-first search keeping a candidate list of size $ef_{\text{search}}$. Watch a greedy search descend the layers:

[[widget:hnsw]]

- Parameters: $M$ (links per node, 16–64), $ef_{\text{construction}}$ (build quality), $ef_{\text{search}}$ (query-time recall/speed dial).
- Strengths: excellent recall–latency trade-off, incremental inserts, no training step.
- Weaknesses: memory heavy (vectors + graph links, all in RAM), deletes are awkward, build time is significant at billions of vectors. Often combined with quantised vectors.

## ScaNN and others

- **ScaNN** (Google): partitioning + **anisotropic vector quantisation** that preserves the inner-product ranking (penalising quantisation error parallel to the vector more than orthogonal error) + exact re-scoring; state-of-the-art speed on maximum-inner-product search; used in Google products and available in Vertex AI Vector Search (AlloyDB ScaNN index).
- **DiskANN** (Microsoft): graph index stored on SSD with compressed vectors in RAM: billion-scale on one machine.
- **LSH** (locality-sensitive hashing): random projections hash similar vectors into the same buckets; simple, with theoretical guarantees, but usually beaten by IVF/HNSW in practice.
- **Flat on GPU**: for millions of vectors, exact search on GPUs is often good enough and simplest.

## Choosing and tuning

| Situation | Index |
|---|---|
| < ~1M vectors | Flat (exact), maybe on GPU |
| 1M–100M, RAM available, low latency | HNSW (maybe with int8 vectors) |
| 100M–billions, memory-limited | IVF-PQ with re-ranking, ScaNN, DiskANN |
| Frequent inserts/deletes | HNSW or a vector DB with segment merging |

Tune on **your** data: measure recall@k against brute force on a sample of real queries, latency (p50/p99) and memory, then pick the knob settings ($n_{\text{probe}}$, $ef_{\text{search}}$) meeting the recall target (often 0.95+). Benchmarks: ANN-Benchmarks, BigANN.

## Interview angles

- "Search 1B embeddings in 20 ms." IVF-PQ or ScaNN sharded across machines, re-rank top candidates with full vectors, tune nprobe for recall ≥ 0.95, filters handled in the index.
- "Explain HNSW." Layered proximity graph, greedy descent, ef_search controls recall/speed, memory cost.
- "Explain PQ." Split into sub-vectors, k-means codebooks per subspace, 1-byte codes, lookup-table distances.

--- revise
### Basics
? Brute-force cost? :: O(N·d) per query.
? ANN trade-off? :: Lose a little recall for orders-of-magnitude speed and memory savings.
? Recall@k for ANN? :: Fraction of the true top-k neighbours returned.

### IVF and PQ
? IVF steps? :: k-means centroids; assign vectors to lists; at query time scan the n_probe nearest lists.
? IVF recall knob? :: n_probe (more lists = higher recall, slower).
? PQ encoding? :: Split into m sub-vectors; 256-centroid codebook per subspace; 1 byte per sub-vector.
? PQ distance? :: Sum of m lookups in precomputed query-to-centroid tables.
? IVF-PQ + re-ranking? :: Coarse lists, compressed codes, then exact distances for the top candidates.

### HNSW and others
? HNSW structure? :: Multi-layer proximity graph: sparse long links on top, dense local links at the bottom.
? HNSW search? :: Greedy descent through layers, then best-first search with list size ef_search.
? HNSW trade-offs? :: Great recall/latency and inserts; high RAM; deletes awkward.
? ScaNN's key idea? :: Anisotropic quantisation preserving inner-product ranking, plus re-scoring.
? When is flat search fine? :: Up to ~1M vectors (especially on GPU).

--- notes
## Exact
O(Nd). 1e8 × 768 ≈ 7.7e10 MACs/query; 300 GB fp32. OK ≤ ~1M (GPU).
## IVF
k-means n_list (√N–16√N) → inverted lists → probe n_probe nearest centroids. Cost ≈ n_list + N·n_probe/n_list. Boundary misses.
## PQ
d → m sub-vectors; 256 centroids each; 1 byte/sub-vector (768-d fp32 3072 B → 96 B). ADC lookup tables.
IVF-PQ on residuals + re-rank with full vectors. FAISS billions/machine.
## HNSW
Layers (sparse top, dense bottom); M links (16–64); ef_construction; ef_search (recall dial).
Greedy descent + best-first at layer 0. Incremental inserts, no training; RAM heavy; deletes awkward.
## Others
ScaNN (anisotropic quantisation for MIPS + rescoring; Vertex AI, AlloyDB). DiskANN (SSD graph). LSH (random projections). GPU flat.
## Choose/tune
<1M flat · 1M–100M HNSW · 100M+ IVF-PQ/ScaNN/DiskANN. Measure recall@k vs brute force on real queries; p50/p99; memory; pick knobs for recall ≥ 0.95.

--- doubts
Q: Why is "approximate" acceptable for search?
A: Embedding similarity is itself an approximation of relevance, and downstream rerankers fix ordering. Losing a few percent of true nearest neighbours rarely changes final quality noticeably, while the speed-up is often 100–1,000×. Measure end-to-end metrics to confirm.

Q: How do I handle filters (only documents this user can see, only products in stock) with ANN?
A: Options: pre-filter (search only within the allowed subset; slow if the subset is large and unindexed), post-filter (search more candidates, then drop disallowed ones; fails when filters are very selective), or filtered indexes that check filters during graph traversal or per partition. Vector databases implement hybrids (vector-db-production page).

Q: Can I update an IVF index when new vectors arrive?
A: Yes, add them to their nearest lists, but centroids trained on old data become stale as the distribution shifts, lowering recall. Periodically retrain centroids and rebuild; or use HNSW/segment-based systems for heavy write traffic.

--- exercises
[estimate] 500M vectors, IVF with n_list = 65,536 and n_probe = 32. Roughly how many vectors are scanned per query, versus brute force?
A: Average list size ≈ 500M / 65,536 ≈ 7,600; scanning 32 lists ≈ 244,000 vectors plus 65,536 centroid comparisons: about 0.06% of brute force (~1,600× fewer distance computations).

[design] Build a vector index for 2 billion 256-dim image embeddings with p99 < 30 ms and recall@10 ≥ 0.9, on commodity servers with 256 GB RAM each.
A: Raw float32 is 2 TB; PQ with 32 bytes per vector is 64 GB plus IVF overhead. Shard across ~4–8 machines (by ID hash), each holding IVF-PQ (n_list ~ 64k per shard), query all shards in parallel, merge results, re-rank the top ~200 with full-precision vectors stored on SSD (or int8 in RAM). Tune n_probe per shard for recall; replicate shards for throughput and availability; rebuild centroids periodically.

[choose] Your RAG corpus is 3 million chunks with frequent updates and you need filters by tenant. HNSW, IVF-PQ or flat?
A: HNSW in a vector database that supports filtered search and incremental updates: 3M × 768 × 4 bytes ≈ 9 GB of vectors (less with int8) fits in RAM; HNSW handles inserts well; per-tenant filtering via metadata (or per-tenant indexes for large tenants). IVF-PQ is unnecessary at this size; flat is possible on GPU but filters and updates are easier in a vector DB.

--- pitfalls
- Tuning index parameters without measuring recall against brute force
- Using HNSW at billion scale without enough RAM
- Ignoring filters until after choosing an index
- Never retraining IVF centroids as data drifts
- Skipping re-ranking with full vectors after PQ

--- quiz
Q: In IVF, what does n_probe control?
- Embedding dimension
- *How many clusters are searched per query (recall vs speed)
- The number of centroids trained
- Vector compression
W: More probes find more true neighbours but cost more.

Q: Product quantisation stores each sub-vector as?
- A float32
- *A one-byte ID of its nearest centroid in that subspace
- A hash bucket
- A graph link
W: m sub-vectors → m bytes.

Q: HNSW's ef_search parameter mainly trades?
- Memory for build time
- *Recall for query latency
- Dimensions for accuracy
- Inserts for deletes
W: A larger candidate list explores more of the graph.

Q: Below about a million vectors, the simplest good option is often?
- IVF-PQ with 1M lists
- *Exact (flat) search, possibly on a GPU
- LSH
- No index at all, linear scan on CPU per query
W: Exact search is fast enough and has perfect recall.

--- sources
- paper :: Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs :: Malkov, Yashunin (2016) :: https://arxiv.org/abs/1603.09320
- paper :: Product Quantization for Nearest Neighbor Search :: Jégou, Douze, Schmid (2011) :: https://ieeexplore.ieee.org/document/5432202
- paper :: Accelerating Large-Scale Inference with Anisotropic Vector Quantization (ScaNN) :: Guo et al., Google (ICML 2020) :: https://arxiv.org/abs/1908.10396
- paper :: Billion-scale similarity search with GPUs (FAISS) :: Johnson, Douze, Jégou (2017) :: https://arxiv.org/abs/1702.08734

=== vector-db-production
blurb: Running vector search in production: vector databases and their architecture, metadata filtering strategies, hybrid keyword + vector search, multi-tenancy and access control, freshness and updates, sharding and replication, and cost.
signals: "Which vector database and how would you run it?" | Permission-aware RAG | "Search misses product codes and names" | Scaling an embedding index with live updates
widgets: hybrid-search
prereq: ann-indexes

--- lesson
:::words
- **Vector database**: a database that stores vectors with metadata and supports fast similarity search plus filtering.
- **Metadata filter**: restricting results by attributes (tenant, date, language, permissions).
- **Hybrid search**: combining keyword (lexical) search like BM25 with vector (semantic) search.
- **BM25**: a classic keyword-ranking formula based on term frequency and rarity.
- **Reciprocal rank fusion (RRF)**: merging ranked lists by summing 1/(k + rank) from each list.
- **Multi-tenancy**: one system serving many customers whose data must stay separate.
:::

## The problem in plain words

An ANN library finds nearest vectors; a production retrieval system must also handle filters (this user's documents only), keyword matches (product codes, names, error messages that embeddings blur), constant updates and deletions, many tenants, permissions, scaling and failures. Vector databases (or vector features inside existing databases and search engines) package these. In RAG and search interviews, these operational details often separate L4 from L5 answers.

:::eli5
A library catalogue that can find books "about similar ideas" is great, but you also need to find a book by its exact ISBN, show only books in your branch, add new books daily, remove recalled ones, and keep each school's private collection separate.
:::

## Options

- **Dedicated vector databases**: Pinecone, Weaviate, Milvus, Qdrant, Chroma (small scale).
- **Search engines with vectors**: Elasticsearch/OpenSearch, Vespa (strong hybrid ranking).
- **Databases with vector extensions**: Postgres pgvector, AlloyDB (ScaNN), Spanner, MongoDB, Redis.
- **Managed cloud**: Vertex AI Vector Search (ScaNN-based), cloud-native offerings.
- Choose by scale, filtering needs, hybrid search, update rate, operational burden, and whether data already lives in a database (keeping vectors next to the source data simplifies permissions and consistency).

## Filtering

- **Post-filtering**: ANN top-k, then drop disallowed results: fast, but with selective filters you can end up with too few results (search more candidates to compensate).
- **Pre-filtering**: compute the allowed set first, then search only it: accurate, but brute force if the subset isn't indexed.
- **Filtered/in-index search**: the ANN traversal skips disallowed items (filtered HNSW, partitioned IVF): the best general approach in modern vector DBs.
- **Partition by a high-level key** (tenant, language): separate indexes or namespaces make common filters free.

## Hybrid search

Dense embeddings capture meaning but blur exact tokens: product SKUs ("XJ-2049"), error codes, rare names, acronyms. Keyword search (BM25) nails those but misses paraphrases. **Hybrid search** runs both and fuses the results:

- **Reciprocal rank fusion**: $\text{score}(d) = \sum_{\text{lists}} \frac{1}{k + \text{rank}(d)}$, $k \approx 60$: simple, no score calibration needed.
- **Weighted score fusion**: normalise both scores and combine with a tuned weight.
- **Learned sparse retrieval** (SPLADE): a model produces sparse term weights, combining keyword precision with learned expansion.
- Then **rerank** the fused candidates with a cross-encoder (retrieval-quality page).

Try queries below and see which results BM25, vectors and their fusion return:

[[widget:hybrid-search]]

BM25 recap: for each query term $t$, score $= \text{IDF}(t)\cdot\frac{f(t, d)\,(k_1 + 1)}{f(t, d) + k_1(1 - b + b\,|d|/\text{avgdl})}$ ($k_1 \approx 1.2$, $b \approx 0.75$): rewards terms that are frequent in the document and rare in the corpus, with saturation and length normalisation.

## Multi-tenancy and access control

- **Namespace or index per tenant** for large tenants (isolation, easy deletion); shared index with a tenant filter for many small tenants.
- **Document-level permissions**: store ACL groups on every chunk and filter by the user's groups at query time; keep ACLs in sync with the source system (permission changes must propagate fast); never cache results across users with different access.
- **Deletion**: honour deletes and right-to-be-forgotten requests: delete vectors, their metadata, cached results and backups by policy.

## Freshness, updates and scale

- **Ingestion pipeline**: change events → chunk → embed → upsert (idempotent by chunk ID) → searchable within seconds to minutes. Deletions as tombstones, merged in compaction.
- **Segments**: many systems write new vectors to small fresh segments (searched brute-force or with small indexes) and merge them into big optimised indexes in the background, like LSM trees.
- **Sharding** by document ID hash for capacity; **replication** for throughput and availability; scatter-gather queries across shards with top-k merging.
- **Re-embedding** when the model changes: build a new index in parallel (embedding-similarity page).
- **Cost drivers**: RAM for indexes (quantisation helps), embedding compute for ingestion, query volume. Many corpora are smaller than teams think; measure before buying complexity.

## Interview angles

- "Permission-aware enterprise search." ACLs on chunks, filter at query time using cached group memberships, sync permission changes, per-user caches only, audit logs.
- "Users search for part numbers and get nothing useful." Add BM25 and fuse with RRF; maybe exact-match lookup for identifier patterns.
- "Which vector DB?" Scale, filters, hybrid, update rate, existing data stores, ops capacity; often Postgres/pgvector or an existing search engine is enough below tens of millions.

--- revise
### Platform
? Kinds of vector search platforms? :: Dedicated vector DBs, search engines with vectors, databases with vector extensions, managed cloud services.
? Why keep vectors near the source data? :: Simpler permissions, consistency and deletion.

### Filtering
? Post-filtering's risk? :: Too few results when filters are selective.
? Pre-filtering's risk? :: Brute force over the allowed subset if it isn't indexed.
? Best general approach? :: Filtered in-index traversal; partition by common high-level keys.

### Hybrid
? Why hybrid search? :: Dense misses exact tokens (codes, names); BM25 misses paraphrases.
? Reciprocal rank fusion? :: Sum over lists of 1/(k + rank), k ≈ 60.
? BM25 intuition? :: Frequent in the document, rare in the corpus, saturating, length-normalised.

### Operations
? Multi-tenancy options? :: Index/namespace per large tenant; shared index with tenant filter for small ones.
? Permission-aware retrieval? :: ACLs on chunks, filter by user groups, sync changes, no cross-user caching.
? How do systems handle fresh writes? :: Small fresh segments merged into big indexes in the background.

--- notes
## Platforms
Dedicated (Pinecone, Weaviate, Milvus, Qdrant, Chroma) · search engines (Elastic/OpenSearch, Vespa) · DB extensions (pgvector, AlloyDB ScaNN, Spanner, MongoDB, Redis) · managed (Vertex AI Vector Search).
Choose: scale, filters, hybrid, update rate, ops, where data lives.
## Filters
Post-filter (too few results) · pre-filter (unindexed brute force) · in-index filtered traversal (best) · partitions/namespaces.
## Hybrid
Dense blurs SKUs/codes/names; BM25 misses paraphrase. RRF Σ 1/(60 + rank). Weighted fusion. SPLADE learned sparse. Then cross-encoder rerank.
BM25: IDF · f(k₁+1)/(f + k₁(1 − b + b|d|/avgdl)), k₁ 1.2, b 0.75.
## Tenancy & ACL
Per-tenant index for big tenants; shared + filter for small. ACL groups per chunk; query-time filter; sync; per-user caches; deletion across vectors, metadata, caches, backups.
## Freshness & scale
Change events → chunk → embed → idempotent upsert; tombstones; fresh segments + background merge.
Shard by ID hash, replicate, scatter-gather. Re-embed via parallel index. Costs: RAM, embedding compute, queries.

--- doubts
Q: Do I need a dedicated vector database?
A: Not always. For up to tens of millions of vectors, Postgres with pgvector, an existing Elasticsearch/OpenSearch cluster or a managed service often suffices and keeps your stack simple. Dedicated systems help at large scale, high write rates, or with advanced filtering and hybrid needs.

Q: Why does RRF work without normalising scores?
A: It uses only ranks, which are comparable across systems whose raw scores live on different scales (BM25 scores vs cosine similarities). Items ranked well by both lists rise to the top. It's robust and a strong default; learned fusion can beat it with labelled data.

Q: How fast must permission changes propagate?
A: As fast as the source system's own access changes matter: if someone loses access to a document, retrieval should stop returning it within minutes, not after the next nightly rebuild. Event-driven ACL updates and checking permissions again at answer time for sensitive content are common.

--- exercises
[design] Design retrieval for an internal assistant over 20M documents with per-document permissions inherited from Google Drive-like sharing.
A: Ingestion from change events (new, edited, deleted, permission changed) → chunk → embed → upsert with ACL group IDs per chunk. Index: vector DB with filtered HNSW plus BM25 index; hybrid with RRF; cross-encoder rerank. Query: resolve the user's group memberships (cached for minutes), filter at query time, retrieve, rerank; optional final permission check against the source for top results. No cross-user answer caches. Propagate permission changes within minutes; audit logs of which chunks were retrieved for whom.

[estimate] Using RRF with k = 60, document A is rank 1 in BM25 and rank 20 in vector search; document B is rank 5 in both. Which scores higher?
A: A: $1/61 + 1/80 \approx 0.0164 + 0.0125 = 0.0289$. B: $2/65 \approx 0.0308$. B wins slightly: consistent good ranks beat one top rank plus a mediocre one.

[break] After launching vector-only search for an electronics store, searches for exact model numbers ("RTX 4070 Ti Super") return similar but wrong products. Fix?
A: Add a lexical (BM25) index and fuse with RRF; boost exact matches on model-number fields; detect identifier-like queries and run an exact lookup first. Evaluate on a set of identifier queries plus natural-language queries.

--- pitfalls
- Vector-only search for identifier-heavy domains
- Post-filtering with highly selective filters
- Permission filters applied after caching or generation
- Forgetting deletes in indexes, caches and backups
- Choosing a complex vector DB before measuring scale

--- quiz
Q: Why add BM25 to vector search?
- It's faster than ANN
- *Keyword matching catches exact tokens like product codes that embeddings blur
- It removes the need for embeddings
- It handles permissions
W: Hybrid search combines both strengths.

Q: Reciprocal rank fusion scores a document by?
- Its highest raw score
- *Summing 1/(k + rank) across the result lists
- Averaging cosine similarities
- Counting keyword hits
W: Ranks are comparable across systems.

Q: The main risk of post-filtering with a selective filter?
- Too many results
- *Too few results remain after filtering the top-k
- Slower indexing
- Duplicate results
W: Search more candidates or filter in-index.

Q: Permission-aware RAG should filter?
- After the model answers
- *At retrieval time by the user's access groups (and avoid cross-user caches)
- Only in the UI
- Never
W: Otherwise restricted content can reach the prompt.

--- sources
- article :: The Probabilistic Relevance Framework: BM25 and Beyond :: Robertson, Zaragoza (2009) :: https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf
- paper :: Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods :: Cormack, Clarke, Büttcher (SIGIR 2009) :: https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf
- paper :: SPLADE: Sparse Lexical and Expansion Model for First Stage Ranking :: Formal et al. (2021) :: https://arxiv.org/abs/2107.05720
- article :: Vector Search overview :: Google Cloud (Vertex AI) :: https://cloud.google.com/vertex-ai/docs/vector-search/overview

=== rag-pipeline
blurb: Retrieval-augmented generation end to end: why RAG, the offline ingestion pipeline (parsing, chunking strategies, metadata, embedding, indexing), the online query pipeline (retrieve, assemble context, generate with citations), and design choices with numbers.
signals: "Design a RAG system over company documents" | "How would you chunk these documents?" | "How do you get citations?" | Most GenAI system design rounds
widgets: chunking, retrieval
prereq: vector-db-production, context-window

--- lesson
:::words
- **RAG** (retrieval-augmented generation): fetching relevant documents at question time and giving them to the model to answer from.
- **Ingestion**: the offline pipeline that turns source documents into searchable chunks.
- **Chunk**: a passage of a document (often a few hundred tokens) indexed and retrieved as a unit.
- **Grounding**: making the answer rely on retrieved sources rather than the model's memory.
- **Citation**: a reference in the answer to the source chunk that supports it.
:::

## The problem in plain words

Language models know a lot, but not your company's documents, today's prices or last week's policy change, and they can't cite where an answer came from. Retraining for every document change is impossible. **RAG** keeps knowledge outside the model: search a document index for passages relevant to the question, put them in the prompt, and ask the model to answer from them, with citations. It's the most common GenAI architecture in industry and the most common GenAI design question.

:::eli5
An open-book exam: instead of memorising the whole library, the student quickly looks up the right pages, reads them, and writes the answer with page references. The quality depends on finding the right pages, and on answering only from them.
:::

## Offline: the ingestion pipeline

1. **Connectors**: pull documents from sources (wikis, drives, tickets, PDFs, web pages, databases) with change events for freshness and their permissions.
2. **Parsing**: extract clean text preserving structure: headings, lists, tables (as Markdown or row text), code blocks; OCR and layout models for scanned PDFs; captions or descriptions for images and charts.
3. **Chunking**: split into retrievable units (below).
4. **Metadata**: document ID, title, section path, URL, author, date, permissions (ACL groups), language, document type: used for filtering, ranking and citations.
5. **Enrichment** (optional): contextual headers ("This chunk is from the 2025 travel policy, section 4: Hotels"), summaries, generated questions per chunk.
6. **Embedding** with the chosen model (batched on GPUs), plus a **keyword index** for hybrid search.
7. **Indexing** in the vector store; deletions and updates propagate by chunk ID.

## Chunking strategies

| Strategy | How | Good for |
|---|---|---|
| Fixed size + overlap | e.g. 400 tokens with 50 overlap | Simple baseline |
| Recursive / structural | Split by headings → paragraphs → sentences until under the size limit | Most documents |
| Semantic | Split where embedding similarity between sentences drops | Long unstructured text |
| Document-specific | One chunk per FAQ entry, per function, per table row group, per email | Structured sources |
| Small-to-big / parent–child | Retrieve small precise chunks, then pass their larger parent section to the model | Precision + context |

Typical sizes: 200–800 tokens. Smaller chunks give precise matches but lose context; larger ones keep context but dilute the embedding. **Contextual retrieval** (prepending a short document-level context to each chunk before embedding) markedly reduces retrieval failures. Try different splitting strategies on a passage below:

[[widget:chunking]]

## Online: the query pipeline

1. **Gateway**: authenticate; resolve the user's permissions; rate-limit.
2. **Query understanding** (optional): rewrite follow-up questions into standalone queries using chat history; expand or decompose complex questions; classify whether retrieval is needed at all.
3. **Retrieve**: hybrid search (vector + BM25) with permission and metadata filters → ~50–100 candidates.
4. **Rerank** with a cross-encoder → top 5–10.
5. **Assemble context**: dedupe, order by relevance, include titles, dates and source IDs, respect the token budget.
6. **Generate** with instructions: answer only from the sources, cite them as [n], say when the sources don't contain the answer, follow the requested format.
7. **Post-process**: verify citations point to retrieved chunks (and optionally that cited text supports the claim), apply safety filters, stream the answer.
8. **Log** query, retrieved chunk IDs, answer, citations and feedback for evaluation.

Watch a query flow through retrieval to a grounded answer below:

[[widget:retrieval]]

## Numbers for a typical design

A 100k-employee company: 20M documents → ~200M chunks of ~400 tokens. Embeddings at 768 dims: ~600 GB float32 (compress with int8/PQ). Queries: ~15k/day, peak ~5 QPS. Per query ~3–6k input tokens (instructions + 6–8 chunks + history), ~300 output tokens. Retrieval + rerank ~100–200 ms; generation TTFT ~0.5–1 s; full answer 3–6 s streamed.

## Why RAG fails (preview)

Retrieval misses (wrong chunking, vocabulary mismatch, no hybrid), the right chunk isn't ranked high enough, context lacks the surrounding section, conflicting or stale documents, the model ignores or misreads context, or answers from its own memory. Each has fixes on the next pages, and RAG must be evaluated in two parts: retrieval and generation (rag-evaluation page).

## Interview angles

- Draw both pipelines; state chunking choice and why; hybrid + rerank; permission filtering; citations; "don't know" path; freshness via change events; numbers for corpus, QPS, tokens and latency; evaluation plan.
- "RAG or fine-tuning?" Knowledge and citations → RAG; style/format → fine-tuning; often both.
- "How fresh can answers be?" As fresh as ingestion: event-driven pipelines give minutes.

--- revise
### Why
? What problem does RAG solve? :: Private, fresh, citable knowledge without retraining the model.
? Two pipelines? :: Offline ingestion (parse, chunk, embed, index) and online query (retrieve, rerank, assemble, generate, verify).

### Ingestion
? Parsing must preserve? :: Headings, lists, tables, code; OCR/layout for scans; descriptions for images.
? Typical chunk size? :: 200–800 tokens, often with overlap.
? Small-to-big retrieval? :: Retrieve small precise chunks, pass their larger parent sections to the model.
? Contextual retrieval? :: Prepend document-level context to each chunk before embedding.
? Key metadata? :: Doc ID, title, section, URL, date, permissions, language, type.

### Query
? Query rewriting? :: Turn follow-ups into standalone queries; expand or decompose.
? Retrieval stack? :: Hybrid (vector + BM25) with filters → cross-encoder rerank → top 5–10.
? Generation instructions? :: Answer only from sources, cite [n], say when not covered.
? Post-processing? :: Verify citations, safety filters, stream, log.

--- notes
## Ingestion
Connectors (+ change events, ACLs) → parse (structure, tables, OCR, image captions) → chunk → metadata (id, title, section, url, date, ACL, lang, type)
→ enrich (contextual headers, summaries, generated questions) → embed (batched) + BM25 → index (upsert/delete by chunk id).
## Chunking
Fixed+overlap · recursive/structural · semantic · doc-specific (FAQ, function, rows) · small-to-big parent–child. 200–800 tokens. Contextual retrieval.
## Query
Gateway (auth, ACL, rate limit) → rewrite/decompose/route → hybrid retrieve 50–100 (filters) → rerank → top 5–10
→ assemble (dedupe, order, titles/dates/ids, budget) → generate (only sources, cite, don't-know) → verify citations, safety, stream → log.
## Numbers
20M docs → 200M chunks; 768-d fp32 ≈ 600 GB (compress). 15k q/day, ~5 QPS peak. 3–6k in, 300 out. Retrieve+rerank 100–200 ms; TTFT 0.5–1 s.
## Failures
Retrieval miss, ranking, missing context, stale/conflicting docs, ignored context, parametric answers → evaluate retrieval + generation separately.

--- doubts
Q: How many chunks should I put in the prompt?
A: Enough to contain the answer reliably after reranking, few enough to avoid distraction and cost: often 5–10 chunks of a few hundred tokens. Measure answer quality against k on your evaluation set; more isn't automatically better.

Q: Should I always retrieve, even for "hello" or general questions?
A: A cheap router can skip retrieval for chit-chat or general knowledge questions, saving cost and avoiding irrelevant context. For a company assistant, when in doubt retrieve, since most questions are about internal content.

Q: How do I handle tables and spreadsheets?
A: Parse tables into Markdown or row-wise text with headers repeated per row group so each chunk is self-explanatory; for large structured data, prefer text-to-SQL or tool calls over the database rather than embedding rows.

--- exercises
[design] Design a RAG assistant for a hospital's clinical guidelines (5,000 PDFs, updated monthly), used by doctors on phones.
A: Ingestion: PDF parsing with layout and table extraction, section-aware chunking (~400 tokens) with contextual headers (guideline name, version, section), metadata including publication date and status (current/superseded) and specialty. Index: hybrid (drug names and dosages need BM25) + cross-encoder rerank; filter to current versions. Generation: answer only from guidelines, quote dosages exactly with citations and links to the section, refuse to answer outside the guidelines and suggest consulting the source; no patient data in prompts. Evaluation: clinician-labelled question set measuring retrieval recall and answer faithfulness; monitor for questions with no supporting chunk.

[estimate] 2 million chunks of 500 tokens; embedding at 30,000 tokens/s per GPU. How long to embed the corpus on 4 GPUs, and the index size at 1,024 dims in float16?
A: Tokens: $10^9$. Throughput 120,000 tokens/s → ~8,300 s ≈ 2.3 hours. Index: $2\times10^6 \times 1024 \times 2$ bytes ≈ 4 GB: fits in RAM comfortably.

[break] Users ask follow-up questions like "what about for contractors?" and the assistant answers about something unrelated. Why?
A: The follow-up is embedded on its own, so retrieval searches for "contractors" without the earlier topic (say, travel reimbursement). Add a query-rewriting step that uses conversation history to produce a standalone query ("travel reimbursement policy for contractors"), and evaluate on multi-turn conversations.

--- pitfalls
- Naive fixed-size chunks that split tables and sections
- Embedding follow-up questions without rewriting
- Dense-only retrieval in identifier-heavy domains
- No "not found" path, so the model guesses
- Losing permissions or dates in metadata

--- quiz
Q: What's the main advantage of RAG over fine-tuning for company knowledge?
- Lower latency
- *Fresh, citable knowledge without retraining
- No need for prompts
- Smaller models only
W: Update the index, not the model.

Q: Small-to-big retrieval means?
- Retrieving many small documents
- *Matching on small precise chunks but giving the model their larger parent sections
- Using small models first
- Increasing chunk size over time
W: Precision for search, context for generation.

Q: Why rewrite follow-up questions before retrieval?
- To shorten them
- *Follow-ups often lack the context needed to retrieve the right documents
- To remove names
- To translate them
W: "What about contractors?" needs the earlier topic.

Q: The generation prompt in RAG should include?
- "Use your own knowledge freely"
- *Answer only from the provided sources, cite them, and say when they don't cover it
- No instructions
- Random examples
W: Grounding plus an abstain path.

--- sources
- paper :: Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks :: Lewis et al., Facebook AI (2020) :: https://arxiv.org/abs/2005.11401
- paper :: REALM: Retrieval-Augmented Language Model Pre-Training :: Guu et al., Google (2020) :: https://arxiv.org/abs/2002.08909
- article :: Introducing Contextual Retrieval :: Anthropic :: https://www.anthropic.com/news/contextual-retrieval
- paper :: Retrieval-Augmented Generation for Large Language Models: A Survey :: Gao et al. (2023) :: https://arxiv.org/abs/2312.10997

=== retrieval-quality
blurb: Making RAG retrieve the right thing: diagnosing failures, hybrid search, cross-encoder and LLM reranking, query rewriting, expansion and HyDE, multi-query and decomposition, metadata and recency boosts, embedding fine-tuning, and contextual chunk enrichment.
signals: "RAG answers are wrong because retrieval misses" | "How would you improve recall@10?" | "Explain reranking / HyDE" | Retrieval deep dives in GenAI design rounds
widgets: rerank
prereq: rag-pipeline, contrastive-embeddings

--- lesson
:::words
- **Retrieval recall**: whether the passages needed to answer are among those retrieved.
- **Reranking**: re-scoring retrieved candidates with a slower, more accurate model.
- **Query rewriting**: turning the user's question into a better search query.
- **Query expansion**: adding related terms or alternative phrasings.
- **HyDE** (hypothetical document embeddings): searching with the embedding of a model-written fake answer.
- **Query decomposition**: splitting a complex question into sub-questions, retrieving for each.
:::

## The problem in plain words

Most RAG failures are retrieval failures: if the right passage isn't in the context, the best model can't answer (and may make something up). Improving retrieval is usually the highest-leverage work in a RAG system. There's a standard toolbox, and good engineers apply it by first measuring *where* retrieval fails rather than trying everything.

:::eli5
A research assistant who keeps bringing back the wrong books. You can teach them the library's vocabulary (fine-tuning), have them use both the catalogue and their intuition (hybrid), let a senior librarian check the shortlist (reranking), and make them restate vague requests clearly before searching (rewriting).
:::

## Diagnose first

Build a labelled set: questions with the chunk(s) that answer them. Measure **recall@k** of retrieval and **recall after reranking**. Then look at failures and classify them:

- **Vocabulary mismatch** (user says "time off", docs say "annual leave") → expansion, hybrid, fine-tuned embeddings.
- **Exact identifiers missed** → BM25/hybrid, exact-match routes.
- **Answer split across chunks or missing context** → better chunking, parent sections, contextual enrichment.
- **Right chunk retrieved but ranked low** → reranking.
- **Underspecified or multi-part questions** → rewriting, decomposition.
- **Stale or conflicting documents** → metadata filters and recency boosts, deduplication of versions.

## The toolbox

**Hybrid retrieval** (vector-db-production page): BM25 + dense with RRF is usually the single biggest recall gain over dense-only.

**Reranking**: retrieve ~50–100 candidates cheaply, then score each (query, passage) pair with a **cross-encoder** (contrastive-embeddings page) or an LLM, keep the top 5–10. Typical gains in precision@5 are large, at a cost of tens of milliseconds on a GPU for 100 pairs. Options: open cross-encoders (BGE reranker, ms-marco models), API rerankers, LLM listwise reranking (more expensive). See how reranking reorders a candidate list below:

[[widget:rerank]]

**Query rewriting and expansion**:
- Rewrite follow-ups into standalone queries (conversation history).
- Expand with synonyms or LLM-generated alternative phrasings; **multi-query**: retrieve for several phrasings and fuse.
- **HyDE**: ask the model to write a hypothetical answer, embed it, and search with that; answers look more like documents than questions do. Helps zero-shot; risky when the model's guess is wrong in specific ways.
- **Step-back** prompting: also retrieve for a more general version of the question.

**Decomposition**: "Compare the parental leave policies in the UK and India" → retrieve for each country separately, then combine.

**Metadata and structure**:
- Filters from the query (dates, product, region) extracted by an LLM into structured filters ("self-querying").
- Recency boosts for time-sensitive content; prefer current versions over superseded ones.
- Field boosts (titles, headings) in BM25.

**Better representations**:
- **Fine-tune the embedding model** on in-domain pairs (logs, LLM-generated queries): often +10–30% recall@10 in specialised domains.
- **Contextual chunk enrichment**: prepend document title and section summary to chunks before embedding and BM25 indexing.
- **Multi-vector**: embed questions a chunk answers (generated) alongside the chunk.
- **Late interaction** (ColBERT) for fine-grained matching.

## Putting it together, by cost

1. Fix parsing and chunking; add metadata. (Cheap, big wins.)
2. Hybrid search with RRF.
3. Cross-encoder reranking.
4. Query rewriting for conversations; decomposition for complex questions.
5. Contextual enrichment of chunks.
6. Embedding fine-tuning.
7. Agentic retrieval loops (next page) for hard multi-hop questions.

Measure each step's effect on retrieval recall and on final answer quality.

## Interview angles

- "Improve retrieval." Label a set, measure recall@k, categorise failures, then targeted fixes: hybrid, rerank, rewriting, chunking/context, fine-tuning.
- "Explain reranking." Cheap broad retrieval, expensive accurate cross-encoder on the shortlist.
- "Explain HyDE." Embed a hypothetical answer to bridge the question–document gap; risk of misleading guesses.

--- revise
### Diagnosis
? First step to improve retrieval? :: Labelled question → answer-chunk set; measure recall@k; categorise failures.
? Vocabulary mismatch fixes? :: Expansion, hybrid search, fine-tuned embeddings.
? Right chunk ranked low? :: Reranking.

### Toolbox
? Biggest common recall gain over dense-only? :: Hybrid BM25 + dense with RRF.
? Reranking recipe? :: Retrieve 50–100 cheaply, cross-encoder scores pairs, keep top 5–10.
? HyDE? :: Embed a model-written hypothetical answer and search with it.
? Multi-query? :: Retrieve for several phrasings and fuse results.
? Decomposition? :: Split multi-part questions, retrieve for each part.
? Self-querying? :: LLM extracts structured filters (dates, products) from the question.

### Representations
? Embedding fine-tuning gain in specialised domains? :: Often +10–30% recall@10.
? Contextual enrichment? :: Prepend document/section context to chunks before indexing.
? Multi-vector indexing? :: Also index generated questions each chunk answers.

--- notes
## Diagnose
Labelled Q → gold chunks. Recall@k pre/post rerank. Failure types: vocabulary, identifiers, split/missing context, low rank, underspecified/multi-part, stale/conflicting.
## Toolbox
Hybrid (BM25 + dense, RRF): biggest gain.
Rerank: 50–100 → cross-encoder/LLM → 5–10 (BGE reranker, ms-marco, API, listwise LLM).
Rewrite follow-ups; expand; multi-query fusion; HyDE (hypothetical answer embedding); step-back.
Decompose multi-part questions.
Self-querying filters; recency and version preference; field boosts.
Fine-tune embeddings (+10–30% recall@10); contextual enrichment; multi-vector (generated questions); ColBERT.
## Order
Parsing/chunking/metadata → hybrid → rerank → rewriting/decomposition → enrichment → fine-tuning → agentic loops. Measure each step.

--- doubts
Q: If reranking is so good, why not rerank more candidates?
A: Cost and latency grow linearly with candidates (each is a model call over the pair). Beyond the point where the true passages are already in the candidate set, more candidates add cost without gains. Measure recall@N of the first stage to pick N.

Q: Is HyDE safe for factual domains?
A: It can mislead: a confident but wrong hypothetical answer pulls retrieval toward documents matching the wrong claim. It's most useful for exploratory queries and zero-shot settings; combine it with normal query retrieval (fuse both) rather than replacing it.

Q: How do I get training pairs to fine-tune embeddings without labels?
A: Generate synthetic questions for each chunk with an LLM (filtered for quality), use click logs from existing search, or link Q&A forum questions to the docs they cite. Hold out real user questions for evaluation.

--- exercises
[design] A RAG system's recall@10 is 0.62 on a labelled set. Failure analysis: 40% vocabulary mismatch, 25% correct chunk ranked 11–50, 20% answer spans two chunks, 15% missing product codes. Prioritise fixes.
A: (1) Hybrid BM25 + dense with RRF: fixes product codes and some vocabulary mismatch. (2) Retrieve top 50 and add a cross-encoder reranker: rescues the ranked-low cases. (3) Chunking with parent-section expansion or larger structural chunks: fixes split answers. (4) Fine-tune embeddings on synthetic/in-domain pairs for the remaining vocabulary gap. Re-measure after each step.

[estimate] Reranking 100 candidates of 300 tokens with a 300M-parameter cross-encoder on a GPU: rough compute per query?
A: 100 pairs × ~350 tokens × 2 × 3×10⁸ ≈ 2.1×10¹³ FLOPs ≈ 20+ ms at ~1 PFLOP/s effective… more realistically ~40–80 ms on one GPU at moderate utilisation; batching across queries helps.

[break] After adding HyDE, retrieval for policy questions gets worse on specific numeric questions ("how many days of bereavement leave?"). Why?
A: The model's hypothetical answer invents a number ("5 days"), and retrieval favours documents mentioning that number or generic leave text rather than the true policy chunk. Fuse HyDE results with direct-query results, or skip HyDE for specific factual questions.

--- pitfalls
- Tuning retrieval without a labelled evaluation set
- Reranking too few first-stage candidates
- Using HyDE alone for precise factual questions
- Ignoring document versions and dates
- Fine-tuning embeddings and forgetting to re-embed the corpus

--- quiz
Q: The right passage is retrieved at rank 30 but only the top 8 go to the model. Best fix?
- Bigger LLM
- *Retrieve more candidates and rerank with a cross-encoder
- Higher temperature
- Smaller chunks only
W: Reranking promotes the right passage.

Q: HyDE searches using?
- The raw question only
- *An embedding of a hypothetical answer generated by the model
- Keywords only
- The user's history
W: Answers resemble documents more than questions do.

Q: "What's the leave policy in the UK and India?" is best handled by?
- One retrieval for the whole question
- *Decomposing into two sub-queries and retrieving for each
- Ignoring one country
- Increasing temperature
W: Each part needs its own documents.

Q: Before trying fixes, you should?
- Switch vector databases
- *Measure recall@k on labelled questions and categorise failures
- Increase chunk size
- Fine-tune the LLM
W: Targeted fixes beat guesses.

--- sources
- paper :: Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE) :: Gao et al. (2022) :: https://arxiv.org/abs/2212.10496
- paper :: Passage Re-ranking with BERT :: Nogueira, Cho (2019) :: https://arxiv.org/abs/1901.04085
- paper :: ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT :: Khattab, Zaharia (2020) :: https://arxiv.org/abs/2004.12832
- paper :: Take a Step Back: Evoking Reasoning via Abstraction in LLMs :: Zheng et al., Google DeepMind (2023) :: https://arxiv.org/abs/2310.06117

=== advanced-rag
blurb: Beyond single-shot retrieve-then-generate: agentic and iterative retrieval, self-RAG and corrective RAG, routing across sources, text-to-SQL and tools alongside documents, GraphRAG and knowledge graphs, multimodal RAG over PDFs and images, and long-context hybrids.
signals: "Multi-hop questions across many documents" | "Questions need both documents and database numbers" | "What is GraphRAG?" | "RAG over slides and scanned PDFs"
widgets: agentic-rag
prereq: retrieval-quality

--- lesson
:::words
- **Multi-hop question**: one whose answer requires combining facts from several documents ("Who manages the team that owns service X?").
- **Agentic RAG**: an LLM decides when and what to retrieve, possibly over several rounds, using retrieval as a tool.
- **Routing**: choosing which source or tool (document index, database, web, API) to query.
- **Knowledge graph**: entities (people, products) and relations (manages, depends on) stored as a graph.
- **GraphRAG**: building a graph of entities and relations from documents and using it to retrieve and summarise.
- **Multimodal RAG**: retrieving images, slides, charts or page screenshots, not just text.
:::

## The problem in plain words

Basic RAG does one search and one answer. Many real questions need more: following a chain of facts, combining a policy document with numbers from a database, comparing many documents, or understanding a chart in a slide deck. Advanced RAG patterns give the model control over retrieval (search, read, search again), connect other tools, and use richer structures like knowledge graphs. They cost more latency and complexity, so you use them where simple RAG demonstrably fails.

:::eli5
A simple researcher looks something up once. A good investigator reads the first result, notices it mentions another name, looks that up, checks a spreadsheet for the numbers, and keeps going until the whole story fits together.
:::

## Iterative and agentic retrieval

- **Iterative retrieval**: retrieve → generate a partial answer or follow-up query → retrieve again (IRCoT interleaves chain-of-thought steps with retrieval).
- **Agentic RAG**: give the model tools (`search_docs`, `get_document`, `query_database`, `web_search`) and let it plan: decide whether to retrieve, which source, how to phrase queries, when it has enough (agent-loop-tools page). Watch an agent answer a multi-hop question below:

[[widget:agentic-rag]]

- **Self-RAG**: the model is trained to emit special tokens deciding when to retrieve and to critique whether retrieved passages are relevant and whether its answer is supported.
- **Corrective RAG (CRAG)**: a grader evaluates retrieved documents; if they're poor, rewrite the query or fall back to web search; strip irrelevant parts before generation.
- Costs: several model calls per question (latency in seconds), harder evaluation; cap iterations and fall back gracefully.

## Routing and structured data

Not all knowledge is in documents:

- **Router**: classify the question → document RAG, **text-to-SQL** over a warehouse ("revenue by region last quarter"), an API (order status), a calculator, or web search.
- **Text-to-SQL**: give the model the schema (tables, columns, descriptions, example queries), generate SQL, run it with read-only permissions and row limits, and summarise; validate against a semantic layer of approved metrics where possible.
- **Hybrid answers**: "Is our travel spend over the policy limit?" needs the policy (RAG) and the numbers (SQL).

## GraphRAG and knowledge graphs

- **Knowledge-graph RAG**: entities and relations extracted from documents (or an existing enterprise graph) let you answer relational, multi-hop questions by graph traversal ("which services depend on the payments database?") and retrieve the connected neighbourhood as context.
- **Microsoft GraphRAG**: LLMs extract entities and relations from all chunks, build a graph, detect communities (clusters of related entities), and pre-summarise each community; **global questions** ("what are the main themes across these 10,000 reports?") are answered by combining community summaries (map-reduce), which plain top-k retrieval can't do. Expensive to build; good for sense-making over large corpora.
- This portal's KG-RAG case study chapter goes deeper on a legal-compliance example.

## Multimodal RAG

Documents contain tables, charts, diagrams and scanned pages:

- **Parse to text**: OCR, table extraction, and LLM-generated descriptions of figures, indexed as text.
- **Embed images directly** with multimodal embedding models (CLIP/SigLIP-style or vision-language retrievers such as ColPali, which embed page screenshots), retrieve page images, and give them to a vision-capable model.
- Keep the link to the original page for citations.

## Long context as a partner

With million-token models, a hybrid approach often wins: retrieve the most relevant **whole documents** (not tiny chunks) and let the long-context model reason across them; or route "summarise this whole report" requests directly to long context. Caching repeated document sets reduces cost.

## Choosing

| Question type | Approach |
|---|---|
| Single fact in docs | Basic RAG + rerank |
| Follow-ups in chat | Query rewriting |
| Multi-hop / investigative | Agentic or iterative RAG |
| Numbers in databases | Router + text-to-SQL |
| Relationships among entities | Knowledge graph traversal |
| Global themes over a big corpus | GraphRAG / map-reduce summaries |
| Charts, slides, scans | Multimodal RAG |
| Deep reading of a few long docs | Retrieve whole docs + long context |

## Interview angles

- "Multi-hop questions fail." Agentic/iterative retrieval with a cap, decomposition, or a knowledge graph; evaluate multi-hop separately.
- "Some answers need SQL." Router + text-to-SQL with schema context, read-only execution, validation.
- "Explain GraphRAG." Entity/relation extraction → graph → communities → summaries → map-reduce for global questions.

--- revise
### Iterative
? Agentic RAG? :: The model uses retrieval as a tool: decides when, where and what to search, over several rounds.
? IRCoT? :: Interleave chain-of-thought steps with retrieval.
? Self-RAG? :: Model emits tokens to decide retrieval and critique relevance/support.
? Corrective RAG? :: Grade retrieved docs; rewrite query or use web search if poor; strip irrelevant parts.
? Costs of agentic RAG? :: More calls, latency, harder evaluation; cap iterations.

### Other sources
? Router's job? :: Send each question to docs, SQL, APIs, tools or web.
? Text-to-SQL safety? :: Schema context, read-only, row limits, validation against a semantic layer.

### Graphs and modalities
? When knowledge graphs help? :: Relational, multi-hop questions about entities.
? GraphRAG for global questions? :: Community summaries combined map-reduce style.
? Multimodal RAG approaches? :: Parse to text (OCR, captions) or embed page images directly (ColPali) for a vision model.
? Long-context hybrid? :: Retrieve whole relevant documents, reason across them with a long-context model.

--- notes
## Iterative / agentic
IRCoT (CoT + retrieval). Agentic tools: search_docs, get_document, query_db, web_search; plan, stop when enough.
Self-RAG (retrieve/critique tokens). CRAG (grade → rewrite/web fallback → strip). Cap iterations; graceful fallback.
## Routing
Classifier → RAG / text-to-SQL / API / calculator / web. SQL: schema + descriptions + examples, read-only, limits, semantic layer. Hybrid answers.
## Graphs
KG RAG: entity/relation traversal, neighbourhood context.
MS GraphRAG: extract → graph → communities → summaries → map-reduce for global questions. Costly build.
## Multimodal
OCR/tables/figure captions as text · page-image embeddings (ColPali) + VLM · keep page links.
## Long context
Retrieve whole docs → long-context reasoning; route whole-doc summaries; cache.
## Choose
Fact → basic+rerank · follow-ups → rewrite · multi-hop → agentic · numbers → SQL · relations → KG · themes → GraphRAG · charts/scans → multimodal · few long docs → long context.

--- doubts
Q: Should every RAG system be agentic?
A: No. Agentic loops add latency, cost and unpredictability. Start simple, measure which question types fail, and add agentic behaviour (or decomposition) for those, often behind a router that sends simple questions down the fast path.

Q: Is GraphRAG better than normal RAG?
A: For global, corpus-wide questions and relationship-heavy queries, it can be much better. For specific fact lookup, normal hybrid RAG with reranking is usually as good and far cheaper to build and maintain. Graph extraction also introduces its own errors.

Q: How do I evaluate text-to-SQL?
A: Execution accuracy: run the generated query and the reference query on the same database and compare results, on a labelled set of questions; plus checks for unsafe queries. Track common failures (wrong joins, wrong metric definitions) and add schema descriptions or examples.

--- exercises
[design] An analyst assistant must answer "Which of our top 10 customers by revenue have open P1 support tickets, and what does our SLA policy say about P1 response times?" Design the flow.
A: Router/agent plans three steps: (1) text-to-SQL over the warehouse for top 10 customers by revenue (read-only, validated metric definition); (2) query the ticketing API (or SQL) for open P1 tickets for those customers; (3) RAG over the SLA policy for P1 response times. The model combines results into an answer with citations (policy section) and the queries used. Cap tool calls; show intermediate data for verification; log for evaluation.

[break] An agentic RAG system answers well but takes 25 seconds and sometimes loops searching the same query. Fixes?
A: Cap the number of tool calls; detect repeated queries and force a different strategy or stop; parallelise independent searches; use a faster model for query planning; add a basic RAG fast path for simple questions via a router; summarise retrieved results to keep context small; return partial answers with sources if the budget runs out.

[choose] A company wants answers to questions like "what are the recurring root causes across 4 years of incident postmortems?" Basic RAG, GraphRAG, or long context?
A: Basic top-k retrieval can't cover thousands of documents' themes. Options: GraphRAG (entity/community summaries) or a map-reduce pipeline: summarise each postmortem's root causes (cached), cluster them, then summarise clusters. If the corpus fits in a long context after per-document summarisation, a long-context model over the summaries also works. Map-reduce over cached summaries is usually simplest.

--- pitfalls
- Making everything agentic without measuring need
- Uncapped agent loops
- Text-to-SQL with write permissions or no validation
- Building a knowledge graph for simple fact lookup
- Losing page links when parsing multimodal documents

--- quiz
Q: Agentic RAG differs from basic RAG because?
- It uses no retrieval
- *The model decides when, where and how to retrieve, possibly over several rounds
- It's always faster
- It uses only SQL
W: Retrieval becomes a tool in a loop.

Q: Which approach suits "revenue by region last quarter"?
- Vector search over documents
- *Routing to text-to-SQL over the data warehouse
- GraphRAG
- HyDE
W: Numbers live in databases.

Q: GraphRAG is especially useful for?
- Single fact lookup
- *Global questions about themes across a large corpus
- Low latency
- Code completion
W: Community summaries support map-reduce answers.

Q: ColPali-style multimodal retrieval embeds?
- Only OCR text
- *Page images directly, for a vision-language model to read
- Audio
- SQL schemas
W: It avoids lossy parsing of complex layouts.

--- sources
- paper :: Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection :: Asai et al. (2023) :: https://arxiv.org/abs/2310.11511
- paper :: Corrective Retrieval Augmented Generation :: Yan et al. (2024) :: https://arxiv.org/abs/2401.15884
- paper :: From Local to Global: A Graph RAG Approach to Query-Focused Summarization :: Edge et al., Microsoft (2024) :: https://arxiv.org/abs/2404.16130
- paper :: ColPali: Efficient Document Retrieval with Vision Language Models :: Faysse et al. (2024) :: https://arxiv.org/abs/2407.01449
- paper :: Interleaving Retrieval with Chain-of-Thought Reasoning (IRCoT) :: Trivedi et al. (2022) :: https://arxiv.org/abs/2212.10509

=== rag-evaluation
blurb: Evaluating RAG in two halves and end to end: building test sets, retrieval metrics (recall@k, MRR, NDCG), generation metrics (faithfulness, answer relevance, correctness, citation accuracy), LLM judges and frameworks (RAGAS), online signals, and regression testing.
signals: "How would you evaluate this RAG system?" (every GenAI design round) | "Is the problem retrieval or generation?" | "How do you measure hallucination?" | Setting launch criteria
widgets: rag-eval
prereq: rag-pipeline, ranking-metrics

--- lesson
:::words
- **Faithfulness** (groundedness): whether every claim in the answer is supported by the retrieved context.
- **Answer relevance**: whether the answer actually addresses the question.
- **Context precision / recall**: whether retrieved passages are relevant, and whether all needed information was retrieved.
- **Citation accuracy**: whether cited sources support the sentences that cite them.
- **LLM-as-judge**: using a strong model with a rubric to grade outputs.
- **Golden set**: questions with reference answers and the source passages that support them.
:::

## The problem in plain words

A RAG answer can be wrong because retrieval missed the right passage, or because the model misused the right passage, or because the question wasn't answerable. A single "accuracy" number can't tell you which part to fix. Good RAG evaluation measures **retrieval** and **generation** separately, plus end-to-end usefulness, on a realistic test set, and keeps doing it as documents, prompts and models change.

:::eli5
Grading an open-book exam twice: first, did the student open the right pages? Second, did they write an answer that the pages actually support? A wrong answer from the right pages and a wrong answer from the wrong pages need different coaching.
:::

## The test set

- Real user questions (sampled from logs, anonymised) are best; seed with questions written by domain experts and **synthetic** questions generated from documents (with care: they're easier and phrased like the docs).
- For each: a reference answer (or key facts), the supporting document/chunk IDs, and tags (topic, difficulty, multi-hop, unanswerable).
- Include **unanswerable** questions (the right behaviour is "I couldn't find that"), ambiguous ones, time-sensitive ones and adversarial ones (prompt injection in documents).
- 200–1,000 questions, refreshed with production failures.

## Retrieval metrics

With labelled supporting chunks: **recall@k** (did any/all supporting chunks appear in the top k?), **MRR**, **NDCG@k** (ranking-metrics page), measured both before and after reranking. Without labels, an LLM judge can rate each retrieved passage's relevance (context precision).

## Generation metrics

- **Faithfulness**: split the answer into claims; check each against the retrieved context (an NLI model or LLM judge); score = supported claims / total claims. Low faithfulness = hallucination relative to sources.
- **Answer correctness**: compare with the reference answer (semantic match by a judge, or exact match for short factual answers).
- **Answer relevance**: does it address the question (not evasive or off-topic)?
- **Citation precision/recall**: each citation supports its sentence; each claim needing support has a citation.
- **Abstention**: on unanswerable questions, does it decline; on answerable ones, does it avoid needless refusals?
- Style and safety checks as required (length, tone, PII).

## Diagnosing with the two halves

| Retrieval good? | Answer good? | Diagnosis |
|---|---|---|
| Yes | Yes | Working |
| No | No | Fix retrieval |
| Yes | No | Fix generation: prompt, model, context ordering, too many chunks |
| No | Yes | Model answered from its own memory (risky: not grounded, may be stale) |

Explore a small evaluation run below: per-question retrieval and faithfulness scores, and the diagnosis table:

[[widget:rag-eval]]

## LLM judges and frameworks

- Judges scale evaluation but must be **validated**: compare with human ratings on a sample (agreement, correlation), use clear rubrics with examples, ask for a reason before the score, and control for known biases (longer answers rated higher, position bias in pairwise comparisons, preference for their own model family).
- Frameworks: RAGAS (faithfulness, answer relevance, context precision/recall), TruLens, DeepEval, cloud evaluation services; they're helpful scaffolding, but the metric definitions and test set are what matter.

## Online evaluation

- User feedback (thumbs, edits, copy events, follow-up "that's wrong" messages), resolution or deflection rates (support), citation click-through, escalation to humans.
- Sampled human review of production answers with the same rubric.
- Monitoring: "no answer found" rate, retrieval scores, answer length, latency, cost.
- A/B test retrieval or prompt changes on product metrics.

## Regression testing

Run the evaluation suite on every change to chunking, embeddings, index, reranker, prompts or model; compare per-question results with the previous version; block launches that regress key slices (by topic, multi-hop, unanswerable). Track metrics over time as documents change.

## Interview angles

- "Evaluate this RAG system." Golden set (real + expert + synthetic, unanswerables), retrieval recall@k/MRR before and after rerank, faithfulness/correctness/citation accuracy/abstention, validated LLM judge, online feedback, regression gates.
- "Users report hallucinations." Measure faithfulness and retrieval recall on those questions; decide which half is failing.

--- revise
### Test set
? Sources for RAG test questions? :: Real logs (best), expert-written, synthetic from documents.
? What to label per question? :: Reference answer/facts, supporting chunk IDs, tags (topic, difficulty, multi-hop, unanswerable).
? Why include unanswerable questions? :: To test abstention instead of guessing.

### Metrics
? Retrieval metrics? :: Recall@k, MRR, NDCG@k (before and after reranking); context precision.
? Faithfulness? :: Share of answer claims supported by the retrieved context.
? Citation accuracy? :: Citations support their sentences; claims needing support are cited.
? Retrieval good, answer bad? :: Fix generation: prompt, model, context ordering, chunk count.
? Retrieval bad, answer good? :: Model used its own memory: ungrounded, risky.

### Judges and online
? Validating an LLM judge? :: Agreement with human ratings, rubrics with examples, reasons before scores, bias controls.
? Known judge biases? :: Length, position, self-preference.
? Online signals? :: Feedback, resolution/deflection, citation clicks, escalations, no-answer rate.
? Regression testing? :: Run the suite on every change; compare per question; gate on key slices.

--- notes
## Test set
Real logs > expert > synthetic (easier). Per Q: reference, gold chunk IDs, tags (topic, difficulty, multi-hop, unanswerable, adversarial). 200–1000; add prod failures.
## Retrieval
Recall@k (any/all gold), MRR, NDCG@k, pre/post rerank. Unlabelled: judge-rated context precision.
## Generation
Faithfulness = supported claims/claims (NLI/judge). Correctness vs reference. Relevance. Citation precision/recall. Abstention (unanswerable vs over-refusal). Style/safety.
## Diagnose
R✓A✓ fine · R✗A✗ retrieval · R✓A✗ generation · R✗A✓ parametric (ungrounded).
## Judges
Validate vs humans; rubric + examples; reason first; control length/position/self bias. RAGAS, TruLens, DeepEval.
## Online
Thumbs, edits, follow-up corrections, deflection, citation CTR, escalations, sampled review, monitoring, A/B.
## Regression
Every change (chunking, embeddings, index, reranker, prompt, model) → per-question diff → gate on slices.

--- doubts
Q: Can faithfulness be high while the answer is wrong?
A: Yes: if retrieval returned an outdated or wrong document, the answer can faithfully repeat it. That's why you measure correctness against references and retrieval quality too, and why document freshness and version filtering matter.

Q: How many questions do I need?
A: Enough to detect the differences you care about in each important slice: a few hundred overall, with at least 30–50 per key category (multi-hop, unanswerable, each major topic). Track confidence intervals; small sets can't detect small changes.

Q: Are synthetic test questions good enough?
A: They're useful for coverage and bootstrapping, but they tend to be phrased like the documents and to be answerable by a single chunk, so they overestimate quality. Replace or supplement with real user questions as soon as possible.

--- exercises
[design] Write the launch criteria for an internal HR policy assistant.
A: On a 500-question golden set (60% real, 25% expert, 15% unanswerable/adversarial): retrieval recall@8 ≥ 0.9; faithfulness ≥ 0.95 (judge validated against HR raters with ≥ 85% agreement); correctness ≥ 0.85; citation precision ≥ 0.95; correct abstention on ≥ 90% of unanswerable questions with over-refusal ≤ 5% on answerable ones; zero permission leaks on the access-control test suite; p95 latency ≤ 6 s. Then a pilot with thumbs feedback and sampled HR review before wider rollout.

[estimate] An answer has 6 factual claims; 4 are supported by the retrieved context, 1 contradicts it, 1 isn't mentioned. What's the faithfulness score, and what would you investigate?
A: 4/6 ≈ 0.67. Investigate the contradicting claim (misreading of the context or reliance on stale parametric knowledge) and the unsupported one (hallucination or a retrieval miss: check whether the supporting document exists but wasn't retrieved).

[break] A team reports a 20% improvement in their RAG system after switching LLM judges. What's suspicious?
A: The metric changed, not necessarily the system: a different judge has different calibration and biases (e.g. more lenient, prefers longer answers). Compare systems only with the same validated judge; recalibrate the new judge against human ratings before trusting its numbers.

--- pitfalls
- A single end-to-end accuracy number
- Test sets made only of synthetic questions
- No unanswerable questions
- Unvalidated LLM judges, or changing judges between comparisons
- Not re-running evaluation when documents or models change

--- quiz
Q: Retrieval found the right chunk, but the answer is wrong. What should you fix?
- The retriever
- *Generation: prompt, model, context ordering or chunk count
- The embedding model
- The tokenizer
W: Retrieval succeeded; the model misused the context.

Q: Faithfulness measures?
- Answer length
- *Whether the answer's claims are supported by the retrieved context
- Retrieval speed
- User satisfaction
W: Low faithfulness means hallucination relative to sources.

Q: Why include unanswerable questions in the test set?
- To lower scores
- *To check the system declines instead of guessing
- To test latency
- To train the retriever
W: Abstention is a key RAG behaviour.

Q: Before trusting an LLM judge's scores, you should?
- Use the biggest model
- *Check its agreement with human ratings on a sample
- Lower its temperature only
- Ask it twice
W: Judges have biases and calibration differences.

--- sources
- paper :: RAGAS: Automated Evaluation of Retrieval Augmented Generation :: Es et al. (2023) :: https://arxiv.org/abs/2309.15217
- paper :: Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena :: Zheng et al. (2023) :: https://arxiv.org/abs/2306.05685
- paper :: ARES: An Automated Evaluation Framework for RAG Systems :: Saad-Falcon et al. (2023) :: https://arxiv.org/abs/2311.09476
- book :: AI Engineering (chapters 3–4, evaluation) :: Chip Huyen :: https://www.oreilly.com/library/view/ai-engineering/9781098166298/
