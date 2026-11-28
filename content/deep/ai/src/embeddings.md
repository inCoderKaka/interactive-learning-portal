=== word2vec
blurb: Why one-hot vectors fail, the distributional hypothesis, word2vec's skip-gram and CBOW objectives with negative sampling derived, what embedding arithmetic shows, GloVe and fastText, and how the same idea gives item and user embeddings.
signals: "What is an embedding and how is it learned?" | "Explain word2vec / negative sampling" | Item2vec-style recommenders from co-occurrence | Cold-start and embedding-table questions
widgets: embedding-space
prereq: logistic-regression, linear-algebra-ml

--- lesson
:::words
- **Embedding**: a short list of numbers (a vector) learned for each item (a word, a product, a user) so that similar items get nearby vectors.
- **One-hot vector**: a vector as long as the vocabulary with a single 1; it says which word but nothing about meaning.
- **Distributional hypothesis**: words that appear in similar contexts have similar meanings.
- **Context window**: the words within a few positions of a target word.
- **Skip-gram**: predict the surrounding words from the centre word. **CBOW**: predict the centre word from its surroundings.
- **Negative sampling**: training by telling real (word, context) pairs apart from random fake pairs instead of scoring the whole vocabulary.
:::

## The problem in plain words

To compute with words, products or users, a model needs numbers for them. Giving each word its own ID (a one-hot vector) makes "cat" exactly as different from "dog" as from "carburettor": the representation carries no meaning, and nothing learned about one word helps another. An **embedding** is a dense vector of, say, 300 numbers, learned so that items used in similar ways end up close together. Once that works, "similar" becomes "nearby", which powers search, recommendations, clustering and, inside every language model, the first layer.

:::eli5
Describe each word by the company it keeps. "Coffee" and "tea" both appear near "cup", "hot", "morning". If you summarise each word by a short list of how much it hangs around different crowds, coffee and tea get similar lists, and similar lists mean similar words.
:::

## From co-occurrence to vectors

"You shall know a word by the company it keeps" (J. R. Firth, 1957). Count, for every word, which words appear within a few positions of it, and you get a huge, sparse co-occurrence matrix whose rows already capture meaning. Compressing it with an SVD gives dense vectors (latent semantic analysis, 1990). **Word2vec** (Mikolov et al., Google, 2013) learns such vectors directly by prediction, faster and better.

## Skip-gram with negative sampling

Each word $w$ has two vectors: an input (centre) vector $\mathbf{v}_w$ and an output (context) vector $\mathbf{u}_w$. For a real pair (centre $c$, context $o$) taken from a window in the text, and $k$ "negative" words $n_1 \dots n_k$ sampled at random:

$$L = -\log\sigma(\mathbf{u}_o^\top\mathbf{v}_c) - \sum_{i=1}^{k}\log\sigma(-\mathbf{u}_{n_i}^\top\mathbf{v}_c)$$

It's logistic regression: "is this a real neighbour (label 1) or a random word (label 0)?", with the score being a dot product. The gradient pulls $\mathbf{v}_c$ toward the true context's vector and pushes it away from the negatives'. Details that matter:

- The original objective is a softmax over the whole vocabulary, $p(o \mid c) = e^{\mathbf{u}_o^\top\mathbf{v}_c} / \sum_w e^{\mathbf{u}_w^\top\mathbf{v}_c}$; with 1M words that's too expensive per step. Negative sampling (or hierarchical softmax) replaces it.
- Negatives are drawn with probability proportional to frequency$^{3/4}$, which samples rare words a bit more than their raw frequency.
- Very frequent words ("the") are **subsampled** so they don't dominate.
- $k$ = 5–20 negatives; dimension 100–300; window 5–10.
- **CBOW** averages the context vectors to predict the centre: faster, slightly better for frequent words; skip-gram is better for rare words.

Levy and Goldberg showed skip-gram with negative sampling implicitly factorises a matrix of shifted **pointwise mutual information** (how much more often two words co-occur than chance), connecting the prediction view to the counting view.

## What the geometry shows

Explore a small embedding space below: nearest neighbours, and direction arithmetic like *king − man + woman*:

[[widget:embedding-space]]

- **Similarity**: cosine similarity between vectors tracks relatedness.
- **Analogies**: consistent offsets encode relations: $\mathbf{v}_{\text{king}} - \mathbf{v}_{\text{man}} + \mathbf{v}_{\text{woman}} \approx \mathbf{v}_{\text{queen}}$, Paris − France + Italy ≈ Rome. (It works less often than demos suggest, and the evaluation usually excludes the input words.)
- **Bias**: embeddings learn society's associations from text (man : programmer :: woman : homemaker in early news-trained vectors). This matters whenever embeddings feed decisions (fairness page).

## Successors and limits

- **GloVe** (Stanford, 2014): fits vectors directly to log co-occurrence counts with a weighted least-squares objective; similar quality.
- **fastText** (Facebook, 2016): represents a word as the sum of its character n-gram vectors, so it handles misspellings and unseen words, and morphology-rich languages.
- **Static vs contextual**: word2vec gives "bank" one vector whether it's a river bank or a money bank. Contextual models (ELMo, BERT, every transformer) compute a different vector per occurrence. Static embeddings survive where speed and simplicity matter.

## Beyond words: embeddings for anything

The trick generalises to any sequences or co-occurrences:

- **Item2vec / prod2vec**: treat a shopping session or watch history as a "sentence" of item IDs; skip-gram gives item embeddings where co-consumed items are close (Airbnb's listing embeddings from booking sessions; Spotify's song embeddings from playlists).
- **Node2vec / DeepWalk**: random walks on a graph become sentences; you get node embeddings for social graphs.
- **Embedding layers in deep models**: every categorical feature (user ID, ad ID, country) gets a learned vector trained end-to-end with the task (feature-engineering page). Embedding tables for billions of IDs dominate recommender memory.

## Interview angles

- "What is an embedding?" A learned dense vector where geometric closeness reflects similarity of use; trained by predicting context (word2vec), by the task (embedding layers) or contrastively (next page).
- "Explain negative sampling." Replace an expensive softmax over all items with binary classification of the true pair versus a few sampled negatives; the same trick trains two-tower recommenders.
- "How would you embed products?" Sessions as sentences (item2vec), or co-purchase graphs, or a model trained on purchases; evaluate with nearest-neighbour sanity checks and downstream recall.

--- revise
### Basics
? Why not one-hot vectors? :: Every pair is equally different; no shared meaning or generalisation.
? Distributional hypothesis? :: Words in similar contexts have similar meanings.
? Skip-gram vs CBOW? :: Skip-gram predicts context from the centre word (better for rare words); CBOW predicts the centre from averaged context (faster).

### Training
? Negative-sampling loss? :: $-\log\sigma(u_o^\top v_c) - \sum\log\sigma(-u_n^\top v_c)$: real pair vs k random pairs.
? Why not the full softmax? :: Normalising over the whole vocabulary each step is too expensive.
? Negative sampling distribution? :: Frequency to the 3/4 power.
? Why subsample frequent words? :: They add little and would dominate training.
? What does SGNS implicitly factorise? :: A shifted pointwise mutual information matrix.

### Uses and limits
? Analogy example? :: king − man + woman ≈ queen.
? fastText's advantage? :: Character n-grams handle rare, misspelled and unseen words.
? Static vs contextual embeddings? :: One vector per word vs one per occurrence (BERT-style).
? Item2vec? :: Skip-gram over sessions of item IDs to get item embeddings.

--- notes
## Why
One-hot: no similarity, no sharing. Dense learned vectors: nearby = similar.
Distributional hypothesis (Firth). LSA = SVD of co-occurrence.
## Word2vec
Two vectors per word (input v, output u). Skip-gram: centre → context. CBOW: context → centre.
SGNS: −log σ(u_oᵀv_c) − Σ log σ(−u_nᵀv_c). k = 5–20. Negatives ∝ freq^0.75. Subsample frequent words.
Dim 100–300, window 5–10. Implicitly factorises shifted PMI (Levy & Goldberg).
## Geometry
Cosine similarity. Analogies by offsets (fragile). Learned social bias.
## Successors
GloVe (fit log co-occurrence). fastText (char n-grams, OOV). Contextual (ELMo, BERT).
## Beyond words
Item2vec/prod2vec (sessions), Airbnb listings, Spotify playlists. Node2vec/DeepWalk (graph walks).
Embedding layers for IDs trained end-to-end; tables dominate recsys memory.

--- doubts
Q: Why does each word have two vectors in word2vec?
A: If a word used the same vector as centre and context, the model would want each word to be most similar to itself (a high dot product with its own vector), which isn't what co-occurrence says. Separate input and output vectors avoid that. People usually keep the input vectors (or average both) as the final embeddings.

Q: Does king − man + woman = queen really work?
A: Sometimes. With careful evaluation (excluding the three input words from the answer candidates), analogy accuracy on standard tests was 60–75% for good vectors. Many relations aren't consistent offsets at all. It's a vivid illustration that directions carry meaning, not a reliable reasoning tool.

Q: Are word2vec embeddings still used?
A: Rarely for text today: contextual transformer embeddings are much better. But the same skip-gram-with-negative-sampling recipe is still widely used for item, user and graph embeddings, where it's cheap and effective.

Q: How big should an embedding be?
A: Big enough to capture distinctions, small enough to learn from the data per item and fit in memory. Common rules of thumb for categorical features are a few times the fourth root of the number of categories, or 16–128 for recommender IDs; text embeddings are 256–4,096. Tune it by downstream performance.

--- exercises
[estimate] A vocabulary of 1 million words with 300-dimensional input and output vectors in float32: how much memory? How many multiply-adds does one skip-gram step with full softmax take, versus 10 negatives?
A: $2 \times 10^6 \times 300 \times 4 \approx 2.4$ GB. Full softmax: a dot product with every output vector, $10^6 \times 300 = 3\times10^8$ multiply-adds per pair. With 10 negatives plus the positive: $11 \times 300 = 3{,}300$: about 100,000 times cheaper.

[design] Build product embeddings for an online store from 50 million shopping sessions. Describe the data, training and evaluation.
A: Treat each session's ordered sequence of viewed or purchased product IDs as a sentence; drop very short sessions and bot traffic; subsample hugely popular items. Train skip-gram with negative sampling (window ~5, dim 64–128, negatives from the popularity^0.75 distribution, possibly extra negatives from the same category to sharpen distinctions). New products have no vectors: back off to an embedding built from category, brand and text (or fastText-style composition). Evaluate by next-item recall@k on held-out later sessions and by nearest-neighbour inspection.

[break] A team's embeddings show "nurse" much closer to "woman" than to "man", and the embeddings feed a résumé-ranking model. What's the risk and what would you do?
A: The model can rank candidates by gender associations learned from text, which is unfair and possibly illegal. Audit similarity to gendered directions, remove protected attributes and close proxies from features, apply debiasing (projecting out a bias direction is only partial), and above all evaluate the ranking's outcomes by group and use contextual models trained or fine-tuned with fairness constraints.

--- pitfalls
- Representing categories as one-hot vectors when there are millions of them
- Over-trusting analogy demos
- Ignoring social bias baked into text embeddings
- Forgetting cold start for items without training data
- Comparing embeddings from two separately trained models (their spaces aren't aligned)

--- quiz
Q: What does skip-gram predict?
- The next sentence
- The centre word from its context
- *The context words from the centre word
- The part of speech
W: CBOW is the reverse.

Q: Negative sampling replaces the full softmax with?
- A hierarchical clustering
- *Binary classification of the real pair against a few random pairs
- A ranking loss over all words
- Exact matrix factorisation
W: k random "noise" words act as negatives.

Q: Which handles a word never seen in training?
- word2vec
- GloVe
- *fastText
- One-hot
W: It builds vectors from character n-grams.

Q: Item2vec learns product embeddings from?
- Product images
- *Sequences of items in user sessions, treated like sentences
- Prices only
- Manual labels
W: Co-occurrence in sessions plays the role of word context.

--- sources
- paper :: Distributed Representations of Words and Phrases and their Compositionality :: Mikolov et al., Google (2013) :: https://arxiv.org/abs/1310.4546
- paper :: Neural Word Embedding as Implicit Matrix Factorization :: Levy, Goldberg (NeurIPS 2014) :: https://papers.nips.cc/paper/5477-neural-word-embedding-as-implicit-matrix-factorization
- paper :: GloVe: Global Vectors for Word Representation :: Pennington, Socher, Manning (2014) :: https://nlp.stanford.edu/projects/glove/
- article :: Listing Embeddings in Search Ranking :: Airbnb Engineering :: https://medium.com/airbnb-engineering/listing-embeddings-for-similar-listing-recommendations-and-real-time-personalization-in-search-601172f7603e

=== contrastive-embeddings
blurb: How modern embedding models are trained: contrastive learning and the InfoNCE loss derived, in-batch and hard negatives, temperature, bi-encoders versus cross-encoders, sentence-embedding models and benchmarks, and fine-tuning embeddings for your domain.
signals: "How would you train an embedding model for search?" | "Bi-encoder or cross-encoder?" | "Why do bigger batches help contrastive training?" | Two-tower retrieval and RAG retrieval quality
widgets: contrastive-batch
prereq: word2vec, loss-functions

--- lesson
:::words
- **Contrastive learning**: learning embeddings by pulling matching pairs together and pushing non-matching pairs apart.
- **Anchor / positive / negative**: an item, something that should match it, and something that shouldn't.
- **InfoNCE**: the standard contrastive loss: a softmax over similarities where the positive must win.
- **In-batch negatives**: using the other examples in the same batch as negatives for free.
- **Hard negative**: a negative that looks similar to the anchor but is wrong; teaches fine distinctions.
- **Bi-encoder**: encodes query and document separately into vectors, compared with a dot product.
- **Cross-encoder**: reads query and document together and outputs a relevance score.
:::

## The problem in plain words

Search, retrieval-augmented generation, recommendations and duplicate detection all need a function that turns text (or images, or users) into vectors where **closeness means relevance**. Word2vec learned which words appear together; modern embedding models learn which *query* goes with which *answer*, which *caption* goes with which *image*. The training recipe is contrastive: for every true pair, make it score higher than all the wrong pairings in the batch.

:::eli5
A matching game: 64 questions and 64 answers are shuffled on a table. You're scored on how well you pair each question with its own answer rather than any of the other 63. Practise that game millions of times and you learn what makes a question and answer belong together.
:::

## The InfoNCE loss

For a batch of $B$ pairs $(q_i, d_i)$ with embeddings normalised to unit length, compute all $B \times B$ similarities $s_{ij} = \mathbf{q}_i^\top\mathbf{d}_j$. For each query, the correct document is on the diagonal; the other $B - 1$ are **in-batch negatives**:

$$L = -\frac{1}{B}\sum_{i=1}^{B}\log\frac{e^{s_{ii}/\tau}}{\sum_{j=1}^{B}e^{s_{ij}/\tau}}$$

It's cross-entropy where the "class" is the matching document. CLIP and many retrieval models use the **symmetric** version (also documents → queries). The gradient for query $i$ pulls it toward $d_i$ and pushes it away from each $d_j$ in proportion to how much probability that wrong document currently gets, so **confusing negatives get most of the push**. Watch a batch's similarity matrix sharpen onto its diagonal as training proceeds, and see what temperature and hard negatives change:

[[widget:contrastive-batch]]

Key knobs:

- **Batch size**: more in-batch negatives make the task harder and the gradients more informative; CLIP used 32,768. Techniques like gradient caching or sharing negatives across GPUs enlarge effective batches.
- **Temperature τ** (0.01–0.1, often learned): low τ sharpens the softmax so the loss concentrates on the hardest negatives; too low is unstable.
- **Hard negatives**: random negatives get easy quickly. Mine negatives that are similar but wrong (BM25 results that aren't the answer, products in the same category) to teach fine distinctions; beware **false negatives** (unlabelled but actually relevant documents), which can be filtered with a cross-encoder.
- **Normalisation**: with unit vectors, dot product = cosine similarity.

Related losses: **triplet loss** (one positive, one negative, a margin); **multiple negatives ranking loss** (sentence-transformers' name for in-batch InfoNCE); **SimCLR** (two augmentations of the same image are the positive pair: self-supervised).

## Bi-encoders vs cross-encoders

| | Bi-encoder | Cross-encoder |
|---|---|---|
| How | Encode query and document separately; score = dot product | Concatenate query + document, run one model, output a score |
| Speed | Documents pre-encoded offline; query encoded once; search millions with ANN in milliseconds | One model run per (query, document) pair |
| Quality | Good | Better (attends across both texts) |
| Use | **Retrieval** (first stage) | **Reranking** the top 50–100 |

The standard pipeline is retrieve with a bi-encoder (plus BM25), rerank with a cross-encoder (retrieval-quality page). **Late interaction** (ColBERT) keeps one vector per token and scores with max-similarity sums: between the two in cost and quality.

## Sentence and document embedding models

- Built from a pretrained transformer (BERT-style encoder or a decoder LLM), pooled into one vector (mean of token vectors, or the [CLS]/last token), then trained contrastively in stages: weakly supervised pairs mined from the web (title–body, question–answer), then curated labelled pairs with hard negatives, often with instructions ("Represent this query for retrieving supporting documents").
- Examples: Sentence-BERT, E5, GTE, BGE, Google's Gecko and Gemini embeddings, OpenAI and Cohere embedding APIs.
- **Benchmarks**: MTEB (retrieval, clustering, classification and more across many datasets) and BEIR (zero-shot retrieval). Leaderboard rank doesn't guarantee performance on your domain: evaluate on your own queries.
- **Matryoshka representation learning** trains embeddings so prefixes (the first 64, 128, 256 dimensions) are themselves good embeddings, letting you trade quality for memory at query time.

## Fine-tuning for your domain

Off-the-shelf embeddings often miss domain vocabulary (legal clauses, internal product names). Fine-tune with your own pairs: (query, clicked document) from search logs, (question, answer) from support tickets, or synthetic queries generated by an LLM for your documents. Use in-batch plus mined hard negatives, evaluate recall@k on held-out real queries, and remember that **changing the embedding model means re-embedding the whole corpus**.

## Interview angles

- "Train an embedding model for internal search." Pairs from logs or LLM-generated queries, InfoNCE with in-batch + hard negatives, big batches, evaluate recall@k and NDCG on real queries, bi-encoder for retrieval plus cross-encoder rerank.
- "Why do larger batches help?" More negatives per query: a harder, more informative ranking task.
- "Bi- vs cross-encoder?" Precomputable and fast vs joint and accurate; use both in stages.

--- revise
### Contrastive training
? InfoNCE for a batch? :: Cross-entropy over the B×B similarity matrix: each query must pick its own document.
? What are in-batch negatives? :: Other examples' positives in the same batch, used as negatives for free.
? Effect of temperature τ? :: Low τ focuses on the hardest negatives (sharp, possibly unstable); high τ treats negatives evenly.
? Why do larger batches help? :: More negatives make the task harder and gradients more informative.
? Hard negatives and their risk? :: Similar but wrong items teach fine distinctions; risk false negatives.
? SimCLR's positive pair? :: Two augmentations of the same image.

### Encoders
? Bi-encoder? :: Separate encodings compared by dot product; precomputable; for retrieval.
? Cross-encoder? :: Joint encoding of the pair; more accurate; for reranking.
? ColBERT? :: Late interaction: per-token vectors with max-similarity scoring.
? Matryoshka embeddings? :: Prefixes of the vector are usable embeddings at lower dimension.

### Practice
? Benchmarks for embeddings? :: MTEB and BEIR, but evaluate on your own queries.
? Sources of fine-tuning pairs? :: Search logs (query, clicked doc), Q&A pairs, LLM-generated queries.
? Cost of switching embedding models? :: Re-embedding the entire corpus.

--- notes
## InfoNCE
Normalise; S = QDᵀ (B×B); L = −mean log softmax(S/τ) on diagonal. Symmetric version (CLIP).
Gradient pushes hardest negatives most.
Batch size ↑ → more negatives (CLIP 32k; gradient caching, cross-GPU negatives).
τ 0.01–0.1, often learned. Hard negatives (BM25, same category); filter false negatives with cross-encoder.
Triplet; MNRL; SimCLR (augmentations as positives).
## Encoders
Bi-encoder: separate, dot product, precompute + ANN → retrieval.
Cross-encoder: joint, accurate, per pair → rerank top 50–100.
ColBERT late interaction: per-token vectors, MaxSim.
## Models
Pretrained transformer + pooling (mean / CLS / last token) + staged contrastive training (weak web pairs → curated hard negatives), instructions.
SBERT, E5, GTE, BGE, Gecko/Gemini embeddings. MTEB, BEIR. Matryoshka prefixes.
## Domain tuning
Log pairs, Q&A, LLM synthetic queries. In-batch + hard negatives. Recall@k on real queries. Re-embed corpus on change.

--- doubts
Q: Why use other batch items as negatives instead of sampling random documents?
A: They're free: their embeddings are already computed for their own positive pairs, so the $B \times B$ similarity matrix costs one matrix multiply. Random documents would need extra forward passes. The downside: in-batch negatives are as random as the batch, so add mined hard negatives for fine distinctions.

Q: Can I compare embeddings from two different models?
A: No. Each model's vector space has its own axes and scale; a vector from model A means nothing in model B's space. If you upgrade the model, re-embed everything (or learn an alignment mapping, which loses quality).

Q: Should I embed whole documents or chunks?
A: For retrieval, chunks: one vector for a 30-page document averages away the specific passage a query needs, and many models truncate long inputs. Chunk sizes and strategies are on the RAG pipeline page.

Q: Why does a cross-encoder beat a bi-encoder?
A: Attention can compare every query word with every document word directly ("does this passage answer *this* question?"), while a bi-encoder must squeeze each text into one vector before seeing the other. The price is that nothing can be precomputed.

--- exercises
[estimate] A batch of 4,096 query–document pairs with 768-dimensional embeddings: how big is the similarity matrix, and how many FLOPs to compute it?
A: $4096 \times 4096 \approx 16.8$M similarities (67 MB in float32). FLOPs $\approx 2 \times 4096 \times 4096 \times 768 \approx 2.6\times10^{10}$: trivial compared with encoding the texts. That's why in-batch negatives are cheap.

[design] Design the training data for an embedding model that retrieves internal engineering docs from employee questions, starting with no labelled pairs.
A: Generate synthetic questions per document chunk with an LLM (several per chunk, varied styles); mine natural pairs from existing data (Q&A forum questions linked to doc pages, ticket descriptions linked to fix docs). Hard negatives: BM25 and current-embedding top results that aren't the source chunk, filtered by a cross-encoder or LLM judge to remove false negatives. Hold out real employee questions (labelled by a small rater effort) for evaluation of recall@10 and NDCG@10. Fine-tune a strong open model with InfoNCE, and compare against the off-the-shelf version.

[choose] Your RAG system must search 50 million chunks in under 100 ms and answer precise technical questions. Bi-encoder, cross-encoder, or both?
A: Both, in stages: bi-encoder (plus BM25 hybrid) with an ANN index retrieves ~100 candidates in tens of milliseconds; a cross-encoder reranks those 100 (batched on a GPU, ~20–50 ms) to put the precise answer first. A cross-encoder alone over 50M chunks is impossible at that latency.

--- pitfalls
- Training with tiny batches and only random negatives
- Mining "hard negatives" that are actually relevant (false negatives)
- Mixing embeddings from different models in one index
- Trusting leaderboard scores over your own evaluation
- Embedding whole long documents as single vectors

--- quiz
Q: In-batch InfoNCE with batch size B gives each query how many negatives?
- 1
- *B − 1
- B
- B²
W: Every other example's positive document in the batch.

Q: Lowering the contrastive temperature τ does what?
- Treats all negatives equally
- *Focuses the loss on the hardest negatives
- Removes the need for negatives
- Increases embedding dimension
W: A sharper softmax concentrates gradient on the most similar wrong items.

Q: Which model reads the query and document together?
- Bi-encoder
- *Cross-encoder
- word2vec
- BM25
W: Joint encoding allows full attention across both texts.

Q: What is a false negative in contrastive training?
- A positive pair labelled wrongly
- *A sampled "negative" that is actually relevant to the anchor
- A negative similarity score
- A missing embedding
W: Mined hard negatives sometimes contain unlabelled correct answers.

--- sources
- paper :: Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks :: Reimers, Gurevych (2019) :: https://arxiv.org/abs/1908.10084
- paper :: A Simple Framework for Contrastive Learning of Visual Representations (SimCLR) :: Chen et al., Google (2020) :: https://arxiv.org/abs/2002.05709
- paper :: Dense Passage Retrieval for Open-Domain Question Answering :: Karpukhin et al. (2020) :: https://arxiv.org/abs/2004.04906
- paper :: MTEB: Massive Text Embedding Benchmark :: Muennighoff et al. (2022) :: https://arxiv.org/abs/2210.07316

=== embedding-similarity
blurb: Using embeddings well: cosine, dot product and Euclidean distance and when they agree, normalisation and anisotropy, choosing dimensions and compressing (PCA, quantisation, Matryoshka), versioning and drift, and evaluating embeddings.
signals: "Cosine or dot product?" | "Our embeddings take 3 TB, how do we shrink them?" | "We upgraded the embedding model and search broke" | Deduplication thresholds
prereq: contrastive-embeddings

--- lesson
:::words
- **Cosine similarity**: the cosine of the angle between two vectors; ignores their lengths.
- **Dot product**: sums element-wise products; includes the vectors' lengths.
- **Euclidean distance**: straight-line distance between two points.
- **Normalisation**: rescaling a vector to length 1.
- **Anisotropy**: when all embeddings crowd into a narrow cone, so every pair looks similar.
- **Quantisation**: storing numbers with fewer bits (int8, binary) to save memory.
- **Embedding drift**: embeddings changing meaning when the model or data changes.
:::

## The problem in plain words

Having embeddings is only half the job; using them correctly decides whether search returns the right things. Which similarity measure matches how the model was trained? How do you store a billion vectors affordably? What happens when you retrain the model? These are the practical questions in RAG, search and recommendation designs.

:::eli5
Two arrows can point the same way but have different lengths. Cosine similarity only asks "same direction?"; the dot product also rewards length. Which one you want depends on whether length means something, like popularity, or nothing, like how long a document is.
:::

## Choosing the similarity

For vectors $\mathbf{a}, \mathbf{b}$: dot product $\mathbf{a}^\top\mathbf{b}$, cosine $\mathbf{a}^\top\mathbf{b}/(\|\mathbf{a}\|\|\mathbf{b}\|)$, Euclidean $\|\mathbf{a} - \mathbf{b}\|$.

- **Use what the model was trained with.** Most text embedding models are trained with cosine similarity on normalised vectors; some recommenders are trained with raw dot products where the length encodes popularity or confidence.
- For **unit vectors**, all three rank neighbours identically: $\|\mathbf{a} - \mathbf{b}\|^2 = 2 - 2\cos\theta$, and dot = cosine. So normalise once at indexing and use the fastest metric your index supports (inner product).
- **Dot product without normalisation** favours long vectors: in recommenders that can be desirable (popular items get a boost) or a bias you must control.
- **Maximum inner product search** (MIPS) is the ANN problem for unnormalised dot products; some indexes convert it to Euclidean search by adding a dimension.

## Anisotropy and centring

Embeddings from many models occupy a narrow cone: average cosine similarity between random sentences can be 0.6 or higher, so absolute scores mean little ("0.82 similar" might be unrelated). Consequences: use **relative ranking**, not fixed thresholds, unless calibrated on labelled pairs; **mean-centring** (subtract the corpus mean vector) or whitening can spread vectors out; contrastively trained models suffer less.

## Dimensions and compression

Storage $= N \times d \times$ bytes. One billion 768-dimensional float32 vectors take ~3 TB. Options:

| Method | Saving | Cost |
|---|---|---|
| float16 | 2× | negligible quality loss |
| **int8 scalar quantisation** | 4× | small loss; rescore top results with full precision |
| **Binary quantisation** (sign bits) | 32× | bigger loss; fast Hamming distance; rescore |
| **Product quantisation** (PQ) | 8–64× | lossy; used inside ANN indexes (vector-search pages) |
| PCA / random projection to fewer dims | d/k | some loss |
| **Matryoshka** truncation | d/k | small loss if the model was trained for it |

A common pattern: search a compressed index for the top 1,000, then **rescore** those with full-precision vectors.

## Visualising and evaluating

- **Intrinsic checks**: nearest neighbours of sample items ("do these look similar?"), clustering structure, t-SNE/UMAP pictures (look, don't conclude).
- **Extrinsic evaluation** (what matters): recall@k / NDCG@k on real queries, classification accuracy with a linear probe, clustering purity against known labels, deduplication precision.
- **Thresholds** (for deduplication or "is this relevant enough?"): calibrate on a labelled set of pairs, per domain; scores drift between model versions.

## Versioning, drift and operations

- An index is tied to one model version. **Upgrading** means re-embedding the corpus: plan a backfill (can be days of compute for billions of items), dual-write during migration, and A/B test the new index.
- **Data drift**: new slang, products or topics may be poorly represented; monitor retrieval quality on fresh queries; fine-tune periodically.
- **Freshness**: new items must be embedded on ingestion (streaming) to be searchable.
- **Multilingual and multimodal** models put text in different languages (or images and text) into one space; check per-language quality.
- **Privacy**: embeddings can leak information about the text (inversion attacks can partially reconstruct inputs); treat them as sensitive as the source data.

## Interview angles

- "Cosine or dot?" Whatever the model was trained with; normalised vectors make them equivalent; unnormalised dot leaks length (popularity) into rankings.
- "Shrink 3 TB of embeddings." int8 or binary quantisation with full-precision rescoring, PQ inside the ANN index, Matryoshka truncation; measure recall at each step.
- "New model version." Re-embed with dual indexes, compare offline, then A/B; don't mix versions in one index.

--- revise
### Similarity
? Which similarity should you use? :: The one the model was trained with.
? For unit vectors, how do cosine, dot and Euclidean relate? :: Dot = cosine; ‖a−b‖² = 2 − 2cos: same ranking.
? Risk of unnormalised dot products? :: Long vectors (popular, long texts) win regardless of relevance.
? MIPS? :: Maximum inner product search: ANN for raw dot products.

### Geometry
? Anisotropy? :: Embeddings crowd into a narrow cone; absolute similarities are inflated.
? Fix for anisotropy? :: Mean-centring or whitening; rely on ranking; calibrate thresholds on labelled pairs.

### Compression
? Memory of 1B × 768 float32? :: About 3 TB.
? int8 vs binary quantisation? :: 4× vs 32× smaller; binary loses more; rescore top results with full precision.
? Matryoshka truncation? :: Use the first k dimensions of a model trained for nested prefixes.

### Operations
? What does upgrading an embedding model require? :: Re-embedding the whole corpus; dual indexes during migration.
? Why are embeddings sensitive data? :: Inversion attacks can partially reconstruct the input text.

--- notes
## Similarity
Dot aᵀb; cosine aᵀb/(|a||b|); Euclidean |a−b|.
Use the training metric. Unit vectors: all equivalent (|a−b|² = 2 − 2cos). Normalise at index time → inner product.
Unnormalised dot: length (popularity) boosts. MIPS.
## Anisotropy
Narrow cone, high baseline cosine. Rank, don't threshold blindly. Mean-centre/whiten. Calibrate thresholds.
## Compression
N·d·bytes: 1B×768×4 ≈ 3 TB.
fp16 2× · int8 4× · binary 32× (Hamming) · PQ 8–64× · PCA/projection · Matryoshka.
Pattern: compressed search top-1000 → full-precision rescore.
## Evaluate
Intrinsic: neighbours, clusters, t-SNE (look only). Extrinsic: recall/NDCG@k, linear probe, clustering purity, dedupe precision.
Thresholds: labelled pairs, per domain, per version.
## Ops
Index ↔ model version. Upgrade = re-embed (backfill), dual-write, A/B.
Drift: monitor fresh-query retrieval; fine-tune. Freshness: embed on ingest.
Multilingual/multimodal shared spaces; check per language. Embeddings leak → sensitive.

--- doubts
Q: If normalised, why would anyone use Euclidean distance at all?
A: Some ANN libraries or hardware paths are optimised for L2 distance; for unit vectors the ranking is identical, so it doesn't matter. Euclidean matters when lengths carry meaning and you don't want a pure angle.

Q: A similarity of 0.8 between two documents: are they near-duplicates?
A: You can't tell without calibration. Different models (and anisotropic spaces) produce very different score ranges. Label a few hundred pairs as duplicate or not, choose the threshold that gives the precision you need, and redo it whenever the model changes.

Q: Does quantising embeddings hurt RAG quality a lot?
A: int8 usually loses under 1% recall, especially with rescoring. Binary quantisation can lose several percent alone but recovers most of it when the top few hundred candidates are rescored with full vectors. Always measure on your own queries.

--- exercises
[estimate] 200 million chunks, 1,024-dimensional embeddings. Memory in float32, int8 and binary? Which fits on one machine with 256 GB of RAM?
A: float32: $2\times10^8 \times 1024 \times 4 \approx 819$ GB. int8: ~205 GB (fits, barely, without index overhead). Binary: $2\times10^8 \times 1024/8 \approx 25.6$ GB (fits easily). Practical choice: binary or PQ in RAM for candidate search, full vectors on SSD for rescoring.

[design] Plan the migration from embedding model v1 to v2 for a search index of 500 million documents serving live traffic.
A: Build a v2 index in parallel: batch re-embed (estimate GPU hours: e.g. 500M × 512 tokens at 20,000 tokens/s per GPU ≈ 3,500 GPU-hours), while new documents are embedded with both models (dual-write). Evaluate v2 offline on labelled queries (recall@k, NDCG), then shadow and A/B test query traffic against v2. Cut over, keep v1 for rollback for a while, then retire it. Never mix v1 and v2 vectors in one index; update any similarity thresholds.

[break] A deduplication job uses cosine > 0.9 to flag duplicate support tickets. After switching to a new embedding model, it flags 40% of all tickets as duplicates. What happened?
A: The new model's score distribution differs (likely more anisotropic, with higher baseline similarities), so the old threshold is meaningless. Recalibrate the threshold on labelled duplicate pairs for the new model, or mean-centre the vectors; in general, tie thresholds to model versions.

--- pitfalls
- Using a different similarity than the model was trained with
- Fixed similarity thresholds carried across model versions
- Mixing embeddings from two models in one index
- Compressing without measuring recall
- Treating embeddings as non-sensitive data

--- quiz
Q: For unit-length vectors, ranking by Euclidean distance is equivalent to ranking by?
- Manhattan distance
- *Cosine similarity (descending)
- Vector length
- Random order
W: ‖a − b‖² = 2 − 2 cos θ.

Q: Binary quantisation of embeddings saves roughly how much memory versus float32?
- 2×
- 4×
- *32×
- 1,000×
W: One bit per dimension instead of 32.

Q: What must you do when switching to a new embedding model?
- Nothing
- Normalise the old vectors
- *Re-embed the corpus and rebuild the index
- Increase the threshold
W: Vectors from different models are not comparable.

Q: What is anisotropy in embedding spaces?
- Vectors of different lengths
- *Vectors concentrated in a narrow cone, inflating similarities
- Too many dimensions
- Missing embeddings
W: Even unrelated texts look fairly similar.

--- sources
- paper :: Matryoshka Representation Learning :: Kusupati et al. (NeurIPS 2022) :: https://arxiv.org/abs/2205.13147
- paper :: How Contextual are Contextualized Word Representations? (anisotropy) :: Kawin Ethayarajh (2019) :: https://arxiv.org/abs/1909.00512
- article :: Embedding quantization :: Hugging Face blog :: https://huggingface.co/blog/embedding-quantization
- paper :: Product Quantization for Nearest Neighbor Search :: Jégou, Douze, Schmid (2011) :: https://ieeexplore.ieee.org/document/5432202
