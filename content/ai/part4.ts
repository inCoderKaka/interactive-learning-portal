import { Q, T } from "../h";
import type { Topic } from "@/lib/types";
import { md } from "./md";

export const aiTopics4: Topic[] = [
  T("ai", "ai-rag", "Retrieval-augmented generation (RAG)", 1, 45, "Ground answers in your own documents: indexing, chunking, embeddings, hybrid search, reranking, prompt assembly, evaluation and the ways RAG fails.", {
    signals: ["“Build a chatbot over our docs / tickets / policies”", "The model needs private, fresh or citable knowledge", "Hallucinations on factual questions"],
    prereq: ["ai-embeddings", "ai-prompting"],
    viz: "retrieval",
    lesson: md`LLMs have four knowledge problems: a **training cutoff**, **hallucination**, **no access to private data**, and a **finite context window**. RAG addresses all four by **retrieving relevant text at query time and putting it in the prompt**. It is the most common LLM architecture in industry, and the most common LLM system-design question.

## The pipeline

**Offline (indexing):**
1. **Load** documents (PDFs, wikis, tickets, code) and extract clean text plus metadata (source, date, author, permissions).
2. **Chunk** them into retrievable units.
3. **Embed** each chunk and store vectors (and the text and metadata) in a **vector index**; also build a keyword index.

**Online (per query):**
4. **Retrieve:** embed the query, find the most similar chunks (plus keyword matches), filter by metadata and permissions.
5. **Rerank** the candidates with a more precise model.
6. **Generate:** assemble a prompt with instructions, the top chunks and the question; the LLM answers with citations.

\`\`\`python
# LangChain-style: load → split → embed/store → retrieve → prompt → model → parse
vectorstore = FAISS.from_documents(splits, OpenAIEmbeddings())
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
rag_chain = {"context": retriever, "question": RunnablePassthrough()} | prompt | llm
answer = rag_chain.invoke("What is our parental leave policy?")
\`\`\`

## Chunking: the most underrated decision

Never embed a long document as one vector: it averages unrelated topics, wastes context and kills specificity. Options:

- **Fixed size** (by tokens or characters, say 500 characters or 512 tokens) with **overlap** (often 10 to 20%) so sentences on a boundary survive. Simple and a good start.
- **Structure-aware / recursive:** split on headings, then paragraphs, then sentences, so chunks follow the document's shape.
- **Semantic chunking:** embed sentences and cut where the topic shifts.
- **Contextual chunking** (Anthropic, 2024): have an LLM prepend a sentence of context to each chunk ("This chunk is from the 2024 travel policy, section on per-diem rates") before embedding; it reduced retrieval failures substantially in their tests.
- **Chunk expansion:** retrieve small chunks for precision, then pass their neighbours (or the parent section) to the LLM for context.

[[widget:chunking]]

## Retrieval: sparse, dense and hybrid

**Sparse (lexical)** search scores exact term overlap. TF-IDF weights a term by how often it appears in the document and how rare it is overall:

$$
\text{TF}(t, d) = \frac{\text{count}(t, d)}{|d|}, \qquad \text{IDF}(t) = \log \frac{N}{1 + \text{df}(t)}
$$

**BM25** refines this with term-frequency saturation and length normalisation and is still a superb baseline. Sparse search is fast, exact, great for names, codes and rare terms, and blind to synonyms.

**Dense (semantic)** search compares embeddings with cosine similarity or dot product. It handles paraphrases ("money back" ↔ "refund") but fumbles exact identifiers and negation. Dense vectors come from **contrastive training**: positive pairs pulled together, negatives pushed apart.

**Hybrid** search runs both and merges the lists, commonly with **reciprocal rank fusion** ($\sum 1/(60 + \text{rank})$), plus **metadata filters** (date, product, language, access rights).

[[widget:retrieval]]

## Reranking

Retrieval uses **bi-encoders**: query and documents are embedded separately, which makes it fast enough to search millions of chunks. A **cross-encoder reranker** reads the query and each candidate *together*, so it can model their interaction precisely, but it's too slow for the whole corpus. Standard pattern: retrieve the top 50 to 100 quickly, rerank to the top 5 to 10. An LLM can also score relevance, but limit it to a small candidate set.

## Better queries

- **Query rewriting:** turn a chatty follow-up ("what about for contractors?") into a standalone query using the conversation.
- **Multi-query / query fusion:** generate several phrasings and merge results.
- **HyDE:** have the LLM write a hypothetical answer and embed *that*, since answers look more like documents than questions do.
- **Routing:** decide which index (or a SQL database, or no retrieval at all) a question needs.

## Prompt assembly

Separate **system instructions, retrieved context, the question, the output format and constraints**. Tell the model to answer only from the context, cite sources, and say when the answer isn't there. Mark retrieved text as data, not instructions. Put the best chunks first or last, not buried in the middle.

## Evaluating RAG: retrieval and generation separately

**Retrieval metrics** (on a labelled set of questions with known relevant chunks):
- $P@k$ = relevant results in the top $k$ / $k$.
- $R@k$ = relevant results in the top $k$ / all relevant results.
- **MRR** = mean over queries of $1/r$, where $r$ is the rank of the first relevant result.
- nDCG when relevance is graded.

**Generation metrics:**
- **Faithfulness / groundedness:** is every claim supported by the retrieved context?
- **Answer relevancy:** does it address the question?
- **Correctness** against a reference answer, often judged by an LLM with a rubric, spot-checked by humans.

:::warn How RAG fails
- The answer isn't in the corpus (or the document wasn't parsed: tables and scanned PDFs are common culprits).
- The answer is split across chunks, or the key exception clause is far from the main rule.
- Retrieval finds the topic but not the specific fact; keyword-heavy queries need hybrid search.
- Stale or conflicting documents; no dates or versioning.
- The model ignores the context and answers from memory, or merges two sources wrongly.
- Permissions: retrieving a document the user isn't allowed to see is a **security bug**, so filter by access rights at retrieval time.
:::

:::story Glue on pizza
In May 2024 Google's AI Overviews told users to add about an eighth of a cup of non-toxic glue to pizza sauce so the cheese wouldn't slide off. The source was an 11-year-old joke comment on Reddit. Another answer recommended eating at least one small rock a day, from a satirical article. The generation step did its job; **retrieval and source quality** failed. Google responded with better detection of satire and nonsensical queries and limits on user-generated content for some answers.
:::

## Beyond basic RAG

- **Agentic RAG:** the model decides when and what to search, possibly several times, and checks whether it has enough evidence.
- **GraphRAG / KG-RAG:** build a knowledge graph of entities and relations to answer multi-hop or "summarise themes across the corpus" questions (see the case-study topic).
- **Long context instead of RAG?** With million-token windows you can sometimes skip retrieval for a few documents. For large, changing, permissioned corpora, RAG still wins on cost, latency and freshness, and the two combine well.

:::tip The RAG interview checklist
Ingestion and parsing → chunking strategy → embedding model choice → hybrid retrieval with metadata and permission filters → reranking → prompt with citations and an "I don't know" path → evaluation (retrieval and generation) → caching and latency → freshness (incremental re-indexing) → monitoring (no-answer rate, citation clicks, thumbs down).
:::`,
    pitfalls: [
      "One vector per whole document",
      "Dense-only retrieval for queries full of identifiers, names or codes",
      "No permission filtering at retrieval time",
      "Evaluating only final answers, so retrieval failures look like model failures",
      "No “I don't know” path, so the model improvises when context is missing",
      "Forgetting re-embedding cost and versioning when changing the embedding model",
    ],
    quiz: [
      Q("Which step comes first in a typical RAG query?", ["Generation", "*Retrieval of relevant chunks", "Fine-tuning", "Reranking the answer"], "Retrieve, (rerank), then generate with the retrieved context."),
      Q("Why use a cross-encoder reranker after vector search?", ["It is faster than vector search", "*It reads the query and document together for more precise relevance, on a small candidate set", "It replaces the LLM", "It compresses embeddings"], "Bi-encoders are fast; cross-encoders are accurate; combine them."),
      Q("A query for “invoice INV-20931” returns unrelated invoices. Best fix?", ["Larger chunks", "*Hybrid search with BM25 for exact identifiers", "Higher temperature", "A bigger LLM"], "Lexical search excels at exact tokens."),
      Q("MRR for two queries whose first relevant results are at ranks 1 and 4?", ["0.5", "*0.625", "0.25", "2.5"], "(1/1 + 1/4) / 2 = 0.625."),
      Q("A query has 4 relevant chunks in the corpus; 2 of them appear in your top 5. What are precision@5 and recall@5?", ["2/5 and 2/5", "*2/5 and 2/4", "2/4 and 2/5", "4/5 and 2/4"], "Precision@5 = relevant in the top 5 / 5 = 0.4; recall@5 = relevant in the top 5 / all relevant = 0.5."),
    ],
  }),

  T("ai", "ai-vector-search", "Vector databases and approximate nearest neighbours", 2, 30, "Exact vs approximate search, HNSW, IVF, product quantisation, ScaNN, filtering, and the recall-latency-memory triangle.", {
    signals: ["Semantic search over millions to billions of items", "Sizing memory for an embedding index", "Recall drops when you add metadata filters"],
    prereq: ["ai-embeddings"],
    viz: "hnsw",
    lesson: md`Exact nearest-neighbour search compares the query with **every** vector: $O(N \cdot d)$ per query. For 100 million 768-dimensional vectors that's about 77 billion multiply-adds per query. **Approximate nearest neighbour (ANN)** indexes trade a little accuracy for orders-of-magnitude speed.

## The triangle

Every ANN index balances **recall** (how often you find the true neighbours), **latency/throughput**, and **memory**. You tune parameters to pick a point; you never get all three for free.

## HNSW: hierarchical navigable small worlds

The most popular index in vector databases.

- Vectors are nodes in a graph, each linked to a few close neighbours.
- The graph has **layers**: every node lives in the bottom layer, and exponentially fewer in each layer above, like motorways above side streets.
- **Search:** start at an entry point in the top layer, greedily hop to the neighbour closest to the query until nothing is closer, drop a layer, repeat; on the bottom layer do a slightly wider (beam) search.

[[widget:hnsw]]

Knobs: **M** (links per node: more = better recall, more memory), **efConstruction** (build-time beam width), **efSearch** (query-time beam width: the main recall/latency dial). Strengths: excellent recall and speed, supports inserts. Weaknesses: memory-hungry (vectors plus graph in RAM), deletes are awkward.

## IVF: inverted file index

Cluster the vectors with k-means into, say, 4,096 cells. At query time, search only the **nprobe** cells whose centroids are nearest. Cheaper to build and smaller than HNSW; recall depends on nprobe.

## Compression: product quantisation

Split each vector into, say, 8 sub-vectors and replace each with the id of its nearest centroid in a small codebook. A 768-float vector (3 KB) becomes 8 bytes. Distances are computed from lookup tables. **IVF-PQ** combines both and is how billion-scale search fits in memory, usually followed by **re-scoring** the top candidates with full-precision vectors.

:::dyk
Google's **ScaNN** (2020) introduced *anisotropic vector quantisation*: it quantises vectors so the error matters least for the dot products that decide the ranking. It powers vector search in Google Cloud products, and Google's search, YouTube and Play recommendations have relied on large-scale nearest-neighbour retrieval for years.
:::

## Sizing back-of-envelope

Raw vectors: $N \times d \times 4$ bytes for float32. 10M × 768 × 4 ≈ **31 GB**, plus HNSW links (roughly $N \times M \times 2 \times 4$ bytes ≈ 2.5 GB for M = 32). Options when that's too much: fewer dimensions (many models support truncated "Matryoshka" embeddings), float16 or int8 vectors, PQ, or disk-based indexes (DiskANN).

## Filters are harder than they look

"Nearest documents *where tenant = 42 and date > 2024*":
- **Post-filtering** (search, then filter) can return nothing when the filter is selective.
- **Pre-filtering** (filter, then search the subset) breaks HNSW's graph navigation or degenerates to brute force.
- Real systems use filter-aware graph traversal, per-tenant indexes or partitions, or hybrid strategies chosen by filter selectivity. Mention this in a design and you'll stand out.

## Vector database vs vector index

A library (FAISS, ScaNN, hnswlib) gives you the index. A **vector database** (Pinecone, Weaviate, Milvus, Qdrant, pgvector in Postgres, Vertex AI Vector Search, AlloyDB) adds what systems need: persistence, replication, sharding, metadata filtering, hybrid search, access control, upserts and deletes, backups and monitoring. For under a few million vectors, **pgvector** in an existing Postgres is often the pragmatic choice.

:::tip Interview checklist
Corpus size and dimension → memory estimate → index type (HNSW for low latency in RAM; IVF-PQ for billions) → recall target measured against exact search on a sample → filters and multi-tenancy → update pattern (streaming inserts, deletes, re-embedding on model change) → sharding and replication.
:::`,
    pitfalls: [
      "Assuming ANN results are exact; always measure recall against brute force on a sample",
      "Ignoring the memory cost of HNSW graphs",
      "Post-filtering a highly selective filter and returning empty results",
      "Forgetting that a new embedding model requires rebuilding the whole index",
    ],
    quiz: [
      Q("In HNSW, what do the upper layers provide?", ["Exact search", "*Long-range links for fast coarse navigation", "Compression", "Metadata filtering"], "Like motorways, they get you close quickly; lower layers refine."),
      Q("Which parameter is the main recall/latency dial at query time in HNSW?", ["M", "*efSearch", "Vector dimension", "Number of shards"], "A wider search beam finds better neighbours but takes longer."),
      Q("10M vectors × 768 dims × float32 is roughly how much raw memory?", ["3 GB", "*About 31 GB", "300 GB", "768 MB"], "10⁷ × 768 × 4 bytes ≈ 3.1 × 10¹⁰ bytes."),
      Q("What does product quantisation do?", ["Speeds up training", "*Compresses vectors into short codes using small codebooks per sub-vector", "Adds metadata", "Removes duplicates"], "It cuts memory dramatically at some cost in accuracy."),
    ],
  }),

  T("ai", "ai-kg-rag-case", "Case study: agentic KG-RAG for legal compliance", 3, 30, "A real project checking contracts against 17 claims: zero-shot vs chain-of-thought vs TF-IDF RAG vs a knowledge-graph agent, with every number, and what it teaches about engineering judgement.", {
    signals: ["Someone proposes an agent where a pipeline might do", "Long documents where an exception clause is far from the rule", "Comparing systems on imbalanced labels"],
    prereq: ["ai-rag", "ai-metrics", "ai-agents"],
    lesson: md`This is a write-up of a real course project. It is worth studying because it is **honest**: the fancy system won on the metric that mattered, lost on almost everything else, and the numbers say exactly why.

## The task

**ContractNLI** (Koreeda and Manning, 2021) is document-level natural language inference on non-disclosure agreements: 607 annotated NDAs, each checked against **17 standard hypotheses** such as "Some obligations of the agreement may survive termination." For each, the system answers:

- **Entailment:** the contract supports it (compliant),
- **Contradiction:** the contract rules it out (non-compliant),
- **Neutral:** the contract doesn't say.

Contradictions are the rare, valuable class: they are the problems a lawyer is paid to find.

## Four systems, same 50 examples

All ran on a small local model (**Gemma, about 4B parameters, quantised, served by Ollama**) on a fixed 50-example slice (seed 42).

- **B1, zero-shot:** the claim and the contract, no reasoning, no retrieval.
- **B2, zero-shot chain-of-thought:** the same, plus "reason step by step".
- **B3, basic RAG:** retrieve relevant chunks with sparse TF-IDF, no chain-of-thought.
- **S4, agentic KG-RAG:** an LLM builds a **knowledge graph** of parties, duties and exceptions from the contract; a 5-stage hybrid retriever (cosine index, graph walks, LLM re-rank); a bounded reasoning loop (up to 3 tries) that can **repair the graph** when confidence is low.

| Component | Planned | Built |
|---|---|---|
| Document parsing | spaCy with modal-verb and dependency rules | LLM-built knowledge graph, regex fallback |
| Retrieval | FAISS dense + NetworkX graph walks | Cosine store + graph neighbour walks + LLM re-rank |
| Reasoner | Single CoT pass with a "need more evidence" flag | Loop with up to 3 retries + a graph-rebuild path |
| LLM | Llama-3.1-8B / Mistral-7B on Ollama | Gemma ~4B on Ollama, quantised |
| Data | ContractNLI + a GDPR policy slice | ContractNLI only, 50 fixed examples |
| Metrics | Accuracy, macro F1, faithfulness, retrieval hops | Accuracy, macro/micro/weighted F1, per-class P/R/F1, latency |

## Results

| System | Macro F1 | Accuracy (micro F1) | Weighted F1 | F1 entail / contradict / neutral | Latency per example |
|---|---|---|---|---|---|
| B1 zero-shot | 0.474 | 0.680 | 0.671 | 0.77 / **0.00** / 0.65 | 0.6 s |
| B2 zero-shot CoT | 0.489 | 0.660 | 0.693 | 0.80 / **0.00** / 0.67 | 13.2 s |
| B3 TF-IDF RAG | 0.528 | **0.760** | **0.745** | 0.80 / **0.00** / 0.78 | 4.7 s |
| S4 agentic KG-RAG | **0.537** | 0.600 | 0.589 | 0.55 / **0.40** / 0.67 | **208.7 s** |

The 50 examples had 25 entailments, 22 neutrals and only **3 contradictions**.

## What the numbers say

1. **Chain-of-thought barely helped** (macro F1 0.474 → 0.489) and made each answer **22 times slower**. On a small model, "think step by step" bought little.
2. **Plain TF-IDF RAG was the best value**: accuracy up to 76% *and* faster than CoT (4.7 s), because the model saw the relevant clauses instead of a truncated contract.
3. **Only the agent found any contradiction**: 1 of 3, with 1 false alarm, giving contradiction F1 of 0.40. Every other system scored **zero** on the class that mattered most, which accuracy completely hid.
4. **The agent paid heavily**: about **209 seconds per example**, and entailment recall fell (a strict 0.75 confidence threshold made it answer "neutral" when unsure).

:::story The one contradiction that justified the agent
The contradiction S4 caught was an NDA where the **exception clause sat six paragraphs away** from the duty it modified. TF-IDF retrieval never fetched the exception because it shared no keywords with the claim. The knowledge graph linked the duty to its exception explicitly, so a graph walk found it. That is precisely the multi-hop case graphs are good at, and it matches the design that inspired the project (an event-graph RAG framework for compliance checking, COLING 2025).
:::

## Where the latency went

| Stage | Worst-case LLM calls |
|---|---|
| Build document knowledge graph | 1 (long prompt with truncated NDA) |
| Build case graph | 1 |
| Claim expansion | ≤ 3 (one per loop) |
| Query fusion | ≤ 3 |
| Evidence re-rank | ≤ 6 (top-40 batch × 2 phases) |
| Verdict with CoT | ≤ 3 |
| Graph repair | ≤ 9 (if triggered) |
| **Total** | **up to ~25 sequential calls** |

Twenty-five sequential calls to a local model, each seconds long, is how you get 209 seconds. In production you would cache the document graph per contract (built once, reused for all 17 claims), run independent stages in parallel, use a smaller model for re-ranking, and only escalate to the full loop when cheap retrieval is uncertain.

:::tip The engineering lessons, in interview language
- **Pick the metric from the cost of errors.** Accuracy said B3 was best and S4 worst; per-class F1 showed S4 was the only one doing the actual job.
- **Measure latency and cost next to quality.** A 0.009 macro-F1 gain for 44× the latency of RAG is not automatically worth it.
- **Agents earn their keep on specific failure modes** (here: multi-hop exceptions). Route to them selectively instead of using them for everything.
- **Small evaluation sets need humility:** with 3 contradictions, one more catch changes F1 a lot. Report support and confidence intervals.
- **Plan vs built drifts;** document it. The model, data and retriever all changed, and the write-up says so.
:::

## Testing an LLM pipeline like software

The codebase is a good template: separate modules for builders (document and case graphs), retrieval (dynamic retriever, graph search, active node set), reasoning (verdict agent, retry loop, repair loop, fallback controllers), evidence packs with citations, typed models for traces and verdicts, and a **stub LLM client** so unit and integration tests run without a model. An evaluation harness reruns every baseline on the same seeded slice. A planned stress test (concatenating Indian legal judgements past the context limit, in the style of needle-in-a-haystack tests) shows the next question: what happens when the document no longer fits?`,
    pitfalls: [
      "Declaring a winner from accuracy alone on imbalanced labels",
      "Ignoring latency and number of sequential LLM calls when proposing agents",
      "Rebuilding expensive per-document structures for every query instead of caching them",
      "Over-reading results from a 50-example slice with 3 positives",
    ],
    quiz: [
      Q("Which system had the best accuracy?", ["Zero-shot", "Zero-shot CoT", "*TF-IDF RAG", "Agentic KG-RAG"], "B3 reached 0.76 accuracy at 4.7 s per example."),
      Q("Why did only the KG agent catch a contradiction?", ["It used a bigger model", "*Its graph linked a duty to an exception clause six paragraphs away that keyword retrieval missed", "It used higher temperature", "It had more training data"], "Multi-hop links are exactly what knowledge graphs add."),
      Q("What is the best production lesson from the latency table?", ["Always use agents", "*Cache per-document work, parallelise independent calls, and route to the expensive loop only when needed", "Never use RAG", "Use CoT everywhere"], "Up to ~25 sequential calls is the latency driver."),
    ],
  }),

  T("ai", "ai-agents", "AI agents: tools, loops, memory and multi-agent systems", 1, 45, "From augmented LLMs to autonomous agents: tool calling, ReAct, workflow patterns, memory types, human-in-the-loop, LangGraph, multi-agent orchestration, evaluation and failure controls.", {
    signals: ["A task needs actions, not just text (book, refund, query, deploy)", "Multi-step problems where the path isn't known in advance", "Designing coding assistants, support bots or research agents"],
    prereq: ["ai-prompting", "ai-context-engineering"],
    viz: "react-agent",
    lesson: md`A **chatbot** answers a turn. **Deterministic automation** follows a fixed script. An **agent** pursues a goal: it chooses actions and tools, observes what happened, and adapts its next step. Add autonomy only when the task needs it: every extra decision the model makes is another place it can go wrong.

## The building block: an augmented LLM

An LLM plus **tools** (search, APIs, databases, code execution), **retrieval** and **memory**. Its four parts:

- **LLM:** the reasoning engine.
- **Tools:** capabilities beyond text.
- **Planning:** breaking a task into steps (chain-of-thought, ReAct, plan-and-execute).
- **Memory:** what persists between steps and sessions.

## Tool calling, step by step

1. Define each tool with a **name, a description and a JSON Schema** for its parameters.
2. Send the tool definitions with the conversation.
3. The model replies with a structured **tool call** (name + arguments) instead of text when it decides a tool is needed.
4. **Your code** executes the function, with validation and permissions, and returns the result.
5. The model uses the result to continue or answer.

\`\`\`python
@tool
def get_weather(city: str) -> str:
    """Fetch the current weather for a city."""   # the model reads this docstring
    return weather_api.lookup(city)
\`\`\`

The model never executes anything itself: it *asks*, and your code decides. That boundary is where security lives.

## Workflows vs agents

Anthropic's widely cited guide, *Building Effective Agents*, distinguishes **workflows** (LLM calls orchestrated through predefined code paths) from **agents** (the LLM directs its own process). Five workflow patterns cover most products:

| Pattern | How it works | Use it for |
|---|---|---|
| **Prompt chaining** | A fixed sequence of calls, each building on the last, with checks between | Outline → draft → edit; extract → validate → format |
| **Routing** | Classify the input, send it to a specialised prompt, model or tool | Support triage; cheap model for easy, strong model for hard |
| **Parallelisation** | Independent calls run at once; results merged or voted on | Several reviewers checking different aspects; self-consistency |
| **Orchestrator-workers** | A coordinator decomposes the task dynamically and delegates to workers | Code changes across many files; research across sources |
| **Evaluator-optimiser** | One call generates, another critiques, loop until good enough | Translation polishing; code that must pass tests |

And the **single-agent loop**: the model acts, observes the environment, updates its reasoning, and continues or stops, with a hard limit on steps.

## Single-agent designs

- **ReAct** (Reason + Act, Google and Princeton, 2022): interleave a thought, an action and an observation until done.
- **Plan-and-execute:** a planner writes the whole plan up front; an executor runs the steps and replans on surprises. More predictable, fewer tokens.
- **Reflexion:** after a failure the agent critiques itself, stores the lesson in memory, and retries with a revised strategy.

[[widget:react-agent]]

## Memory

| Memory | What it holds | Typical implementation |
|---|---|---|
| Working (short-term) | The current context window: task state, recent tool results, reasoning | The prompt itself |
| Session | This conversation's history | A window buffer plus summarisation |
| **Episodic** (long-term) | Specific past episodes: "last time I deployed this service, step 3 failed" | Logged traces retrieved by similarity |
| **Semantic** (long-term) | Distilled facts: "the user prefers metric units" | A vector store or key-value profile |
| **Procedural** (long-term) | Learned skills and strategies for recurring task types | Saved plans, prompts, "skills" files |

## Human in the loop

Pause before consequential actions (refunds, emails to customers, production changes) and ask a person. With LangGraph, a node calls \`interrupt()\`, the graph's state is **checkpointed** (for example to Postgres), and execution resumes later with the human's decision:

\`\`\`python
def approve_refund(state):
    decision = interrupt({"question": f"Approve refund of {state['refund_amount']}?"})
    return {"approved": decision["ok"]}

graph = builder.compile(checkpointer=PostgresSaver.from_conn_string(conn))
graph.invoke(Command(resume={"ok": True}), config={"configurable": {"thread_id": "user_42"}})
\`\`\`

**Which framework?** A raw LLM call for one-shot responses; **LangChain** (composable "runnables" with \`invoke\`, \`stream\`, \`batch\`) for linear chains and simple RAG; **LangGraph** (nodes transforming typed shared state, edges for sequential, conditional, cyclic or parallel flow, checkpointing) for durable, stateful, branching flows with approval gates. Google's **Agent Development Kit**, OpenAI's Agents SDK and others fill similar roles.

## When one agent isn't enough

As tasks grow, a single agent accumulates too much context, too many tools and too many responsibilities in one loop: accuracy drops and failures are hard to isolate. **Multi-agent systems** give each agent a bounded sub-domain: a central orchestrator delegating to specialists, or peer-to-peer handoffs. Agents exchange task descriptions and results, not their whole contexts. The cost: more tokens (often several times more), more latency, and coordination bugs. Use it when work is genuinely parallel or needs very different tools and context.

:::dyk
In 2024 a startup's "AI software engineer" demo went viral by claiming to solve real GitHub issues end to end. Within a year, coding agents were routine: by 2025 benchmarks like **SWE-bench Verified** (fixing real issues from open-source repositories, judged by their tests) went from low double digits to well above 70% solved by top systems, and terminal-based agents such as Claude Code and Gemini CLI became daily tools for many engineers.
:::

## Evaluating agents

Single-turn quality isn't enough. Measure **task success rate**, **steps and tokens per task**, **tool-call correctness** (right tool, valid arguments), **robustness** to tool failures and bad inputs, **cost and latency**, and safety violations, on a suite of realistic tasks with automatic checks. Benchmarks: SWE-bench (coding), τ-bench (customer-service tool use), WebArena (browsing), GAIA (general assistants).

## How agents fail, and the controls

| Failure | Control |
|---|---|
| Hallucinated tool calls or arguments | Strict schemas, argument validation, typed parsers, clear error messages back to the model |
| Infinite loops, repeating the same action | Step and budget limits, repeated-state detection, explicit "done" conditions |
| Token blow-ups from huge tool outputs | Summarise or truncate results, cap payloads, compaction |
| **Prompt injection** via web pages, emails, documents | Treat tool and retrieved text as untrusted data; isolate it from instructions; least-privilege tools; human approval for side effects |
| Compounding errors over many steps | Checkpoints, verification steps, smaller sub-tasks, plan review |
| Goal drift over long horizons | Restate the goal, keep a task list, sub-agents with fresh context |
| Silent tool failures | Represent every failure explicitly and handle it before anything downstream runs |

:::warn The lethal trifecta
An agent that has **access to private data**, **reads untrusted content** (web, email, shared docs) and **can communicate externally** (send email, make web requests) can be tricked by injected text into exfiltrating that data. If a design has all three, remove one or put a human approval on the outbound action.
:::

:::tip Designing an agent in an interview
Start with the simplest thing: can a workflow (chain or router) do it? If not, define tools with schemas and permissions, the loop and its stop conditions, memory, human-approval points, budgets, observability (trace every step: prompt, tool call, result, tokens), and an evaluation suite. Name the failure modes above and your control for each.
:::`,
    pitfalls: [
      "Building an autonomous agent where a fixed workflow would be cheaper and more reliable",
      "No step or budget limit on the loop",
      "Letting the model execute side effects without validation, permissions or approval",
      "Feeding raw tool output back unbounded",
      "Treating retrieved web or email text as trusted instructions",
      "Evaluating agents on single-turn quality instead of task success",
    ],
    quiz: [
      Q("In tool calling, who actually executes the tool?", ["The LLM", "*Your application code, after the model returns a structured tool call", "The user", "The tokenizer"], "The model only proposes calls; your code validates and executes."),
      Q("Which pattern fits “generate a translation, critique it, revise until good”?", ["Routing", "Parallelisation", "*Evaluator-optimiser", "Prompt chaining only"], "One call generates, another evaluates, in a loop."),
      Q("“Last time I ran this migration, step 3 failed” is an example of which memory?", ["Working", "Semantic", "*Episodic", "Procedural"], "Episodic memory records specific past episodes."),
      Q("An email-reading agent can also send emails and read your files. What's the main risk?", ["High latency", "*Prompt injection in an incoming email causing data exfiltration", "Overfitting", "Tokenisation errors"], "Private data + untrusted input + external communication is the dangerous combination."),
      Q("Why might a single agent stop scaling as tasks grow?", ["LLMs can't call tools", "*Too much context, too many tools and responsibilities in one loop degrade accuracy", "Agents can't use memory", "It is always cheaper to use more agents"], "Decomposing into bounded agents isolates context and failures."),
    ],
  }),

  T("ai", "ai-mcp", "Model Context Protocol (MCP)", 1, 30, "The “USB-C for AI tools”: hosts, clients and servers; tools, resources and prompts; JSON-RPC, transports, auth, security risks, and how MCP relates to A2A.", {
    signals: ["Connecting an assistant or agent to many tools and data sources", "Building an integration once that works across AI apps", "Security review of an agent's tool access"],
    prereq: ["ai-agents"],
    viz: "mcp-handshake",
    lesson: md`Before MCP, every AI app needed custom code for every tool: **N apps × M tools = N×M integrations**. The **Model Context Protocol**, open-sourced by Anthropic in November 2024, defines one protocol both sides can speak, so the problem becomes **N + M**. The usual analogy: MCP is to AI tools what **USB-C** is to peripherals.

:::news From one company's spec to industry standard
Within months, OpenAI (March 2025), Google DeepMind, Microsoft and most developer tools adopted MCP, and thousands of community servers appeared for GitHub, Slack, databases, browsers and design tools. In December 2025 Anthropic donated MCP to the new **Agentic AI Foundation** under the Linux Foundation, alongside other agent standards.
:::

## The roles

- **Host:** the AI application the user interacts with (a chat app, an IDE, a coding agent).
- **Client:** a connector inside the host, one per server, that speaks MCP.
- **Server:** a program exposing capabilities, local (a process on your machine) or remote (a web service).

## What servers offer

| Primitive | Controlled by | What it is | Example |
|---|---|---|---|
| **Tools** | The model | Functions the model can call, with JSON Schema inputs | \`create_event\`, \`run_query\`, \`search_issues\` |
| **Resources** | The application | Read-only data the host can attach as context, addressed by URI | A file, a database schema, a document |
| **Prompts** | The user | Reusable prompt templates, often exposed as slash commands | "/summarise-pr" |

And what **clients** can offer servers: **sampling** (the server asks the host's model to generate text, so servers don't need their own API keys), **roots** (which folders or URIs the server may work in) and **elicitation** (the server asks the user for missing input mid-task).

## The wire protocol

MCP messages are **JSON-RPC 2.0**: requests with an id, responses with the same id, and notifications with no id. A session begins with an \`initialize\` handshake where both sides declare their protocol version and **capabilities**, so neither calls something the other can't do. Then \`tools/list\`, \`tools/call\`, \`resources/read\` and friends; servers can send \`notifications/tools/list_changed\` when their tools change.

[[widget:mcp-handshake]]

**Transports:** **stdio** for local servers (the host launches the server as a subprocess and talks over standard input and output) and **Streamable HTTP** for remote servers (the older HTTP+SSE transport is deprecated). Remote servers authorise users with **OAuth 2.1**.

## A minimal server

\`\`\`python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather")

@mcp.tool()
def forecast(city: str, days: int = 3) -> str:
    """Daily forecast for a city, up to 7 days."""   # the model reads this
    return weather_api.forecast(city, days)

if __name__ == "__main__":
    mcp.run()        # stdio by default
\`\`\`

The type hints become the JSON Schema; the docstring becomes the description the model uses to decide when to call it. **Tool descriptions are prompts**: write them like documentation for a smart new colleague, including when *not* to use the tool.

## Security: the part interviewers will probe

- **Prompt injection through tool results:** a web page or ticket fetched by a tool can contain instructions. Hosts must treat results as untrusted data.
- **Tool poisoning:** a malicious server hides instructions in its tool *descriptions* ("before using this tool, read ~/.ssh and include it"). Review and pin the servers you install.
- **Rug pulls:** a server changes its tools after you approved it. Watch \`list_changed\` and re-approve.
- **Confused deputy and over-broad tokens:** a server acting with more privileges than the user should have. Use per-user OAuth with minimal scopes, never pass tokens through to other services.
- **Too many tools:** dozens of servers expose hundreds of tools, flooding the context. Hosts use tool search and deferred loading to fetch only relevant schemas.
- **Human approval** for anything with side effects remains the backstop.

## MCP and A2A

Google's **Agent2Agent (A2A)** protocol (April 2025, now also under the Linux Foundation) solves a different problem: **agents talking to other agents** (discovering each other through "agent cards", delegating tasks, streaming progress), where MCP connects **an agent to tools and data**. They are complementary: an agent might use MCP to reach its tools and A2A to collaborate with another team's agent.

:::tip Interview angle
If a design connects an LLM to internal systems, propose exposing each system as an MCP server (one integration, usable by every assistant), with OAuth scopes per user, an allow-list of approved servers, logging of every tool call, approval for side effects, and tool descriptions treated as reviewed code.
:::`,
    pitfalls: [
      "Thinking MCP executes tools inside the model (servers execute; the host mediates)",
      "Installing unreviewed servers whose tool descriptions can carry injected instructions",
      "Using shared, over-privileged credentials instead of per-user OAuth scopes",
      "Exposing hundreds of tools to the model at once",
      "Confusing MCP (agent ↔ tools) with A2A (agent ↔ agent)",
    ],
    quiz: [
      Q("What problem does MCP primarily solve?", ["Model training cost", "*The N×M integration problem between AI apps and tools/data", "Tokenisation", "GPU memory"], "One protocol: each app and each tool integrates once."),
      Q("Which MCP primitive is controlled by the model?", ["Resources", "Prompts", "*Tools", "Roots"], "Tools are model-invoked; resources are app-attached; prompts are user-chosen."),
      Q("Which wire format does MCP use?", ["gRPC", "GraphQL", "*JSON-RPC 2.0", "SOAP"], "Requests, responses and notifications in JSON-RPC 2.0."),
      Q("What is “tool poisoning”?", ["A tool that crashes", "*Malicious instructions hidden in a server's tool descriptions", "Too many tools", "Slow tools"], "Descriptions enter the model's context, so they can carry injections."),
    ],
  }),

  T("ai", "ai-multimodal", "Multimodal models: seeing, hearing and speaking", 2, 30, "CLIP and contrastive learning, vision Transformers, how images and audio become tokens, vision-language models, native multimodality, and what to watch out for.", {
    signals: ["Inputs or outputs beyond text: images, screenshots, documents, audio, video", "Image search or zero-shot image classification", "Voice assistants and real-time conversation"],
    prereq: ["ai-transformers", "ai-cnn"],
    viz: "clip",
    lesson: md`Humans don't learn from text alone, and neither do the best models anymore. **Multimodal** models take (and increasingly produce) images, audio, video and text in one system.

## CLIP: connecting pictures and words

OpenAI's **CLIP** (2021) trained an image encoder (a ViT or ResNet) and a text encoder together on **400 million image-caption pairs** from the web. In each batch of $N$ pairs, it computes the $N \times N$ matrix of similarities between every image and every caption and applies a **contrastive loss**: maximise the diagonal (true pairs), minimise everything else.

[[widget:clip]]

The result is a **shared embedding space** for images and text, which enables:

- **Zero-shot classification:** embed the captions "a photo of a {dog, cat, car…}" and pick the one closest to the image. No task-specific training.
- **Text-to-image search** and image-to-image similarity.
- **Conditioning for image generators:** early diffusion models used CLIP's text encoder to understand prompts.

The course implementation shows the moving parts: an image "tokenizer" that turns the picture into patches, a text tokenizer, learned **position embeddings** for each, two Transformer encoders, a projection into a common dimension, and a temperature-scaled softmax over the similarity matrix in both directions.

## How images become tokens

A **vision Transformer** cuts an image into patches (say 16×16 pixels), flattens each and projects it with a linear layer (the same as a convolution with kernel = stride = 16), adds position embeddings, and treats the patches like word tokens. A 224×224 image becomes 196 patch tokens. Higher resolutions mean more tokens, which is why images cost real context in multimodal LLMs.

## Vision-language models

Two main designs:

- **Adapter style** (LLaVA, early open models): a pretrained vision encoder → a small **projector** that maps image features into the LLM's embedding space → a pretrained LLM. Cheap to build from existing parts.
- **Natively multimodal** (Gemini, GPT-4o): trained from the start on interleaved text, images, audio and video. Better at fine-grained understanding (reading charts, small text, spatial reasoning) and at mixing modalities in one conversation.

:::dyk
Gemini was designed to be multimodal from the start. Its long context means a single prompt can hold **about an hour of video**: you can ask where in a lecture recording a concept was explained and get a timestamp.
:::

## Audio and speech

- **Speech-to-text:** OpenAI's **Whisper** (2022), trained on 680,000 hours of web audio, made robust multilingual transcription free and open. Google's speech models power YouTube captions and Recorder.
- **Text-to-speech:** neural voices (Google's **WaveNet**, 2016, was a landmark) now sound nearly human.
- **Speech-to-speech:** realtime models (Gemini Live, GPT-4o's voice mode) take audio tokens in and produce audio tokens out, so they can be interrupted, hear tone and respond in a few hundred milliseconds, instead of chaining speech recognition, an LLM and a TTS engine.

:::story NotebookLM's surprise hit
In September 2024 Google's NotebookLM added **Audio Overviews**: upload your documents and two AI hosts discuss them like a podcast, complete with "ums", jokes and interruptions. It went viral; people fed it everything from research papers to their own CVs. It's a good example of a product insight beating a model insight: the same knowledge, delivered in a format people enjoy.
:::

## Generation across modalities

Text-to-image (Imagen, Midjourney, DALL·E, Stable Diffusion; covered in the next topic), image editing in conversation (Gemini 2.5 Flash Image, nicknamed "Nano Banana", which went viral in 2025), text-to-video with sound (Veo 3), and interactive **world models** (Genie 3) that generate explorable environments in real time.

:::warn Multimodal failure modes
- **Hallucinated details:** reading text that isn't there, miscounting objects, confident wrong chart values.
- **Prompt injection via images:** instructions hidden in a screenshot or a web page image.
- **Privacy:** faces, licence plates, documents in the background of a photo.
- **Cost:** high-resolution images and long audio consume many tokens; downsample when you can.
- **Evaluation** is harder: build test sets with the real images your users send (blurry phone photos, not stock photos).
:::

:::tip Interview angle
For "design photo search" or "moderate uploaded images": CLIP-style embeddings for retrieval and zero-shot labels, a fine-tuned classifier for high-precision policy categories, human review for borderline cases, and per-category precision and recall evaluation. For voice products: latency budgets per hop (speech recognition, model, speech synthesis) versus a single realtime speech-to-speech model.
:::`,
    pitfalls: [
      "Assuming a multimodal model reads small text or counts objects reliably",
      "Forgetting that images and audio consume many tokens",
      "Ignoring prompt injection hidden in images",
      "Evaluating on clean stock images instead of real user uploads",
    ],
    quiz: [
      Q("What does CLIP's contrastive loss do within a batch?", ["Reconstructs images from text", "*Pulls each image toward its own caption and pushes it away from the other captions", "Classifies 1,000 ImageNet classes", "Generates captions"], "The diagonal of the similarity matrix is maximised."),
      Q("How does CLIP do zero-shot classification?", ["It is fine-tuned per class", "*It compares the image embedding with embeddings of prompts like “a photo of a {label}”", "It uses a decision tree", "It counts pixels"], "The label whose text embedding is closest wins."),
      Q("A 224×224 image with 16×16 patches becomes how many ViT tokens?", ["16", "*196", "224", "50,176"], "(224/16)² = 14² = 196."),
    ],
  }),
];
