/**
 * Concept (non-problem) videos → outline pages, by title. Every rule that matches adds its target, so a
 * "Dijkstra and Bellman-Ford" video lands on both pages. Applied to every channel; `SKIP` removes off-topic noise first.
 * Manual decisions per video id live in overrides.ts and always win.
 */
export type ConceptRule = [re: RegExp, to: string];

/** Titles that are never study material (career, vlogs, news, other languages' trivia). */
export const SKIP: RegExp[] = [
  /\b(vlog|unboxing|silver play button|weekend getaway|hotel|apartment|salary|layoffs?|resume|hiring|podcast|giveaway|q ?& ?a|ama\b|announcement|live stream|livestream|motivation|roadmap|placement|career|internship|offer letter|my (last|first) day|reaction|rant|interview experience|success stor|launching|course launch)/i,
  /\b(java interview question\?|small java|java awt|kali linux|fractal explorer|jes image|computer graphics|line drawing|circle drawing)/i,
  /#shorts?\b/i,
];

export const DSA_CONCEPTS: ConceptRule[] = [
  // complexity
  [/^(?!.*machine learning).*(big[- ]?o\b|asymptotic|time complexity|space complexity|frequency count|classes of functions|comparison of functions|best,? worst|priori analysis|characteristics of algorithm|introduction to algorithms|how write and analy)/i, "big-o"],
  [/amortized|amortised/i, "amortized"],
  [/recurrence relation|master'?s? theorem|root function/i, "recurrences"],
  [/recursion tree|call stack|tail recursion|recursion and stack|stack vs heap|space complexity/i, "space-recursion"],
  [/constraints? (to|and) (complexity|time)|judge from constraints|guess the complexity/i, "constraints-budget"],

  // arrays and hashing
  [/dynamic (and static )?arrays?|resizable array|abstract data types|data structures introduction/i, "dynamic-arrays"],
  [/^(?!.*(consistent|geo-?hash|secure hash|sha\d|password)).*(hash ?(table|map)s?\b|hashing (technique|in data|- simplified)|hash function|separate chaining|open addressing|linear probing|quadratic probing|double hashing)/i, "hash-tables"],
  [/prefix sum|difference array|2d prefix|range sum query - immutable/i, "prefix-sums"],
  [/kadane/i, "kadane"],

  // windows, pointers, stacks, queues
  [/two pointers?\b(?!.*linked)/i, "opposite-pointers"],
  [/dutch national flag|sort 0s,? 1s/i, "array-partition"],
  [/sliding window(?! (attention|protocol|log|counter))/i, "variable-window"],
  [/^(?!.*rate limit).*(window of size k|fixed (size )?window)/i, "fixed-window"],
  [/monotonic (data structures|stack)|next greater|next smaller|previous (greater|smaller)/i, "monotonic-stack"],
  [/monotonic (queue|deque)/i, "monotonic-deque"],
  [/stack (introduction|implementation|code)|reverse a stack|infix|postfix|prefix expression|balanced paren/i, "stack-parsing"],
  [/queue (introduction|implementation|code)|circular queue|reverse first k elements of queue/i, "queues-deques"],

  // binary search
  [/binary search (iterative|recursive|tutorial|introduction|explained|template)|lower bound|upper bound/i, "bs-boundaries"],
  [/binary search on (the )?answer/i, "bs-answer"],
  [/rotated sorted array|rotation count/i, "bs-rotated"],
  [/ternary search|bisection/i, "bs-real-ternary"],

  // lists
  [/linked lists? (introduction|basics)|doubly linked list|singly linked list/i, "ll-basics"],
  [/floyd'?s? cycle|tortoise and hare|fast (and|&) slow pointers?/i, "fast-slow"],

  // trees
  [/tree traversals?|inorder|preorder|postorder|morris traversal|level order/i, "tree-traversals"],
  [/introduction to tree algorithms|beginner tree algorithms|rooting a tree|tree center|isomorphic trees/i, "tree-dfs-returns"],
  [/lowest common ancestor|\blca\b|binary lifting/i, "lca"],
  [/binary search tree (introduction|insertion|removal|traversals|code)|bst (insert|delete)/i, "bst-ops"],
  [/avl|red[- ]black|balanced binary search tree|tree rotations/i, "balanced-bst"],
  [/b[- ]trees?\b|b\+ ?trees?/i, "databases"],
  [/optimal binary search tree/i, "interval-dp"],
  [/\btrie\b|prefix tree/i, "trie-basics"],

  // heaps
  [/heap ?sort|heapify|priority queue (introduction|code|min heaps|inserting|removing)|binary heap|min heap|max heap/i, "heap-internals"],
  [/^(?!.*(leaderboard|system design)).*(\btop[- ]k\b|k largest|k smallest|kth (largest|smallest))/i, "top-k"],
  [/indexed priority queue/i, "indexed-pq"],
  [/two heaps|running median|median of (a )?stream/i, "two-heaps"],

  // backtracking and recursion
  [/introduction to recursion|recursion (concepts|series|for beginners)|leap of faith|power set|subsets?\b.*recursion|backtracking tutorial: power set/i, "subsets-combinations"],
  [/backtracking (introduction|- brute)|introduction to backtracking|sum of subsets|branch and bound/i, "subsets-combinations"],
  [/n[- ]?queens?|sudoku|graph colou?ring problem|hamiltonian/i, "constraint-search"],
  [/rat in a maze/i, "grid-backtracking"],
  [/^(?!.*combination).*permutations?\b/i, "permutations"],
  [/permutations? (and|&) combinations?/i, "combinatorics"],
  [/tower of hanoi/i, "space-recursion"],

  // graphs
  [/^(?!.*cs224w).*(graph (theory )?introduction|graph representations?|adjacency (list|matrix)|overview of algorithms in graph|graph will no more|graph theory algorithms)/i, "graph-representations"],
  [/breadth first search|\bbfs\b/i, "bfs"],
  [/depth first search|\bdfs\b/i, "dfs"],
  [/detect(ing)? cycle|cycle detection/i, "cycle-detection"],
  [/multi[- ]source bfs|flood fill|grid (shortest|problems)/i, "grid-graphs"],
  [/bipartite (check|graph)|two[- ]colou?ring/i, "bipartite"],
  [/topological sort|kahn'?s/i, "kahn"],
  [/(shortest|longest) path on a directed acyclic|\bdag\b|multistage graph/i, "dag-dp"],
  [/union[- ]find|disjoint set/i, "dsu-core"],
  [/dijkstra/i, "dijkstra"],
  [/0[- ]1 bfs/i, "zero-one-bfs"],
  [/bellman[- ]?ford/i, "bellman-ford"],
  [/floyd[- ]?warshall|all pairs shortest/i, "floyd-warshall"],
  [/^(?!.*transformer).*(\ba\*|a star search|bidirectional search)/i, "a-star"],
  [/minimum spanning tree|prim'?s|kruskal'?s|\bmst\b/i, "mst"],
  [/articulation point|bridges? in (a )?graph|biconnected|critical connections|tarjan'?s? (bridge|articulation)/i, "bridges-ap"],
  [/strongly connected|\bscc\b|kosaraju|tarjan'?s? strongly/i, "scc"],
  [/eule?rian|euler (path|circuit)|hierholzer/i, "euler"],
  [/network flow|max(imum)? flow|ford[- ]fulkerson|edmonds[- ]karp|dinic|capacity scaling|bipartite matching|min(imum)? cut/i, "network-flow"],
  [/travel?ling sales(man|person)/i, "bitmask-dp"],
  [/np[- ]hard|np[- ]complete|clique decision/i, "big-o"],

  // DP
  [/^(?!.*(mlp|deep learning)).*(dynamic programming (introduction|1d|2d)|introduction to dynamic programming|principle of optimality|roadmap for dp|top 5 dynamic programming|memoization|tabulation)/i, "dp-foundations"],
  [/longest increasing subsequence|\blis\b/i, "lis"],
  [/longest common (subsequence|substring)|\blcs\b|edit distance|dp on strings/i, "two-sequence-dp"],
  [/dp on grids|grid dp|\btiling/i, "grid-dp"],
  [/0\/1 knapsack|0-1 knapsack|knapsack (problem|series)|fractional knapsack/i, "knapsack-01"],
  [/subset sum|count subsets with sum|partitions? with given difference|target sum/i, "subset-sum"],
  [/unbounded knapsack|coin change|rod cutting/i, "knapsack-unbounded"],
  [/matrix chain|interval dp|burst balloons|optimal binary search tree/i, "interval-dp"],
  [/bitmask dp|dp with bitmask/i, "bitmask-dp"],
  [/dp on trees|tree dp|rerooting/i, "tree-dp"],
  [/game theory|\bnim (game)?\b(?!.*nvidia)|game of nim|grundy|sprague|minimax(?! m\d)|alpha[- ]beta/i, "game-dp"],
  [/digit dp/i, "digit-dp"],
  [/convex hull trick|knuth optimi[sz]ation|divide and conquer dp|li chao/i, "dp-optimizations"],
  [/reliability design/i, "knapsack-variants"],

  // greedy and intervals
  [/greedy (method|algorithm)s?|exchange argument|job sequencing|optimal merge pattern|activity selection/i, "greedy-proofs"],
  [/huffman (cod|tree|encod)/i, "greedy-heap"],
  [/line sweep|sweep line/i, "sweep-line"],
  [/merge intervals|overlapping intervals/i, "merge-intervals"],

  // bits and maths
  [/bit manipulation|bitwise|two'?s complement/i, "bit-basics"],
  [/\bxor\b/i, "xor-tricks"],
  [/\bsieve\b|\bprime (number|factor)|\bprimes\b|primality|\bgcd\b|euclid'?s (algorithm|theorem)/i, "gcd-primes"],
  [/modular (arithmetic|inverse|exponentiation|ncr)|\bmodulo\b|binary exponentiation|fast (modulo )?exponentiation|fermat|matrix exponentiation/i, "modular"],
  [/\bncr\b|combinatorics|catalan|pascal'?s triangle|inclusion[- ]exclusion/i, "combinatorics"],
  [/convex hull|computational geometry|line intersection|closest pair/i, "geometry"],
  [/reservoir sampling|fisher[- ]yates|random(ized)? algorithm/i, "randomized"],
  [/strassen/i, "recurrences"],

  // strings
  [/rabin[- ]karp|rolling hash|string hashing/i, "rolling-hash"],
  [/\bkmp\b|knuth[- ]morris[- ]pratt|prefix function|lps array/i, "kmp"],
  [/z[- ]algorithm|z[- ]function/i, "z-algorithm"],
  [/manacher/i, "manacher"],
  [/suffix (array|tree|automaton)|aho[- ]corasick|longest repeated substring/i, "suffix-structures"],
  [/anagram|palindrome (check|recursion)|strings? & palindromes/i, "string-basics"],

  // range queries
  [/sparse table|range minimum query/i, "sparse-table"],
  [/fenwick tree|binary indexed tree/i, "fenwick"],
  [/segment tree/i, "segment-tree"],
  [/lazy propagation|range update/i, "lazy-propagation"],
  [/square root decomposition|sqrt decomposition|mo'?s algorithm/i, "sqrt-mo"],

  // design and sorting
  [/\blru\b|\blfu\b/i, "lru-lfu"],
  [/skip ?list/i, "skiplist"],
  [/merge ?sort|quick ?sort|heap ?sort|insertion sort|selection sort|bubble sort|sorting algorithms/i, "comparison-sorts"],
  [/counting sort|radix sort|bucket sort/i, "linear-sorts"],
  [/quickselect|quick select|order statistic/i, "quickselect"],
  [/^(?!.*ramda).*(comparators?|custom sort|stable sort|inversion count)/i, "custom-sort"],
  [/row[- ]major|column[- ]major|spiral (matrix|traversal)|anti diagonal|rotate (matrix|image)/i, "matrix-traversal"],
  [/meet in the middle/i, "meet-in-middle"],
  [/heavy[- ]light|centroid decomposition/i, "heavy-light"],
  [/persistent (segment|data)/i, "persistent"],
  [/\btreap\b|splay tree/i, "randomized-structures"],
];

/** Chapter-level fallbacks, tried only when no rule above matched (multi-problem lecture titles and the like). */
const NOT_DSA = /full course #|spring|javascript|html|kafka|rabbit|sqs|message queue|graphql|knowledge graph|graph neural|neural|computational graph|cs224w|stack overflow|tech stack|full[- ]stack|heap memory|memory management|garbage|system design|database|elastic|search engine|semantic|vector|rag\b|llm|ai\b/i;
export const DSA_FALLBACK: ConceptRule[] = [
  [/binary search tree|\bbst\b/i, "bst"],
  [/binary search/i, "binary-search"],
  [/linked ?lists?/i, "linked-list"],
  [/\bstacks?\b/i, "stack"],
  [/\bqueues?\b|\bdeque\b/i, "mono-deque"],
  [/binary trees?|\btrees?\b.*(problem|interview|traversal|view)|burning tree|introduction to trees/i, "trees"],
  [/\bheaps?\b|priority queue/i, "heap"],
  [/\bgraphs?\b/i, "graph-traversal"],
  [/recursion|subsequences?|generate parentheses/i, "backtracking"],
  [/dynamic programming|\bdp\b/i, "dp-1d"],
  [/greedy/i, "greedy"],
  [/2d arrays?|\bmatrix\b|spiral|wave form/i, "matrix"],
  [/subarray|arrays?\b.*(problem|interview)|introduction to arrays|master arrays/i, "arrays-hashing"],
  [/strings?\b.*(problem|interview|hard|coding round)|introductions? to strings|palindrome/i, "strings"],
  [/bit manipulation|binary numbers/i, "bits"],
  [/sorting|sort a/i, "sorting"],
  [/competitive programming|leetcode|dsa\b|coding interview|interview problems?/i, "complexity"],
].map(([re, to]) => [new RegExp(`^(?!.*(${NOT_DSA.source})).*(${(re as RegExp).source})`, "i"), to] as ConceptRule);

/**
 * HLD concept videos → HLD outline pages. Applied only to channels tagged "hld" (channels.ts). Broad product channels
 * (Google Cloud Tech, Google for Developers) only get the rules marked strict, so product demos don't flood pages.
 */
const H = (re: RegExp, to: string, strict = false) => [re, to, strict] as [RegExp, string, boolean];
export const HLD_CONCEPTS: [RegExp, string, boolean][] = [
  // the interview
  H(/system design (interview|round)s?\b.*(guide|framework|step|tips|mistakes|prepare|approach|delivery)|how to (answer|crack|approach|prepare for) (any )?system design|patterns to pass your system design|delivery framework|system design (mock|interview walkthrough)|why is system design interview important/i, "sd-round"),
  H(/functional (and|&|vs) non[- ]functional|requirements (gathering|clarification)|clarifying requirements/i, "sd-requirements"),
  H(/api design in system design|data model(l)?ing in system design/i, "sd-api-data"),
  H(/trade[- ]offs?\b.*system design|system design.*trade[- ]offs?|deep dives? in system design/i, "sd-deep-dives"),
  // estimation
  H(/latency numbers/i, "latency-numbers"),
  H(/back[- ]of[- ](the[- ])?envelope|capacity estimation|estimation (in|for) system design/i, "capacity-math"),
  H(/capacity planning|scalability (simply )?explained|vertical (and|vs\.?) horizontal scal|horizontal (and|vs\.?) vertical scal|^scalability\b/i, "capacity-planning"),
  H(/queu(e)?ing theory|little'?s law/i, "queueing"),
  // networking
  H(/\btcp\b|\budp\b|osi model|three[- ]way handshake|how the internet works|network protocols|computer networking/i, "tcp-udp"),
  H(/\bhttps?\b|\btls\b|\bssl\b|http ?\/? ?[123]\b|\bquic\b|status codes/i, "http-tls"),
  H(/\bdns\b|domain name system|type a url/i, "dns"),
  H(/\brest(ful)? api|rest vs|graphql|\bgrpc\b|\brpc\b|remote procedure call|api (protocols|architecture styles)|webhooks?|api vs sdk|apis explained/i, "api-styles"),
  H(/api (design|pagination|versioning|security|performance)|good apis|idempoten(t|cy) (api|key)|pagination/i, "api-design"),
  H(/websockets?|long[- ]polling|server[- ]sent events|push vs pull|live comments|real[- ]time (updates|notifications)/i, "realtime-push"),
  // load balancing
  H(/layer ?[47]\b|\bl[47]\b load|reverse proxy|forward proxy|proxy vs/i, "l4-l7"),
  H(/load balanc(er|ing|ers)\b/i, "lb-algorithms"),
  H(/health ?checks?/i, "lb-health"),
  H(/api gateways?/i, "api-gateway"),
  H(/anycast|geo ?dns|global (load balanc|traffic)|edge network/i, "global-lb"),
  // caching
  H(/^(?!.*(stampede|penetration|avalanche|invalidat|eviction|\blru\b|\blfu\b|cache hits)).*(cach(e|ing)\b(?! pitfalls)|write[- ]through|write[- ]back|cache[- ]aside|read[- ]through)/i, "cache-patterns"),
  H(/eviction|\blru\b|\blfu\b/i, "cache-eviction"),
  H(/cache (invalidation|consistency|coherence)|memcache at facebook|cache consistency/i, "cache-invalidation"),
  H(/cache (stampede|penetration|avalanche|pitfalls|breakdown)|thundering herd|caching pitfalls/i, "cache-failures"),
  H(/\bredis\b|memcached?/i, "redis-memcached"),
  H(/\bcdns?\b|content delivery network/i, "cdn", true),
  // databases
  H(/sql vs\.? nosql|nosql vs\.? sql|(choose|choosing|pick) (the right|a) database|which database|database (selection|types)|types of databases/i, "sql-nosql"),
  H(/data model(l)?ing|normali[sz]ation|denormali[sz]/i, "data-modeling"),
  H(/database index|\bindex(es|ing)?\b.*(database|sql|postgres|mysql)|clustered index|composite index|covering index/i, "db-indexes"),
  H(/\blsm\b|lsm[- ]tree|b[- ]?\+?[- ]?trees?|storage engines?|sstables?/i, "btree-lsm"),
  H(/\bolap\b|column(ar)?[- ](store|database|storage)|data warehouse|bigquery|data lake(house)?|clickhouse|parquet/i, "olap-columnar", true),
  H(/cassandra|dynamodb|mongodb|nosql|wide[- ]column|document (database|store)|graph database|key[- ]value (store|database)s?/i, "nosql-families"),
  // replication
  H(/replication(?! factor)|master[- ]slave|leader[- ]follower|primary[- ]backup|read replicas?|failover|split[- ]brain/i, "leader-replication"),
  H(/multi[- ](leader|master)|leaderless/i, "multi-leader-leaderless"),
  H(/quorums?/i, "quorums"),
  H(/consistency (models?|levels|patterns)|linearizab|eventual(ly)? consisten|strong consistency|causal consistency|^consistency\b/i, "consistency-models"),
  H(/read[- ]your[- ](own[- ])?writes|monotonic reads|session guarantees|stale reads|replication lag/i, "session-guarantees"),
  H(/\bcap\b theorem|\bcap\b,|pacelc|base vs acid/i, "cap-pacelc"),
  // partitioning
  H(/shard(ing|s)?\b|database partition|data partition|partitioning (strateg|in)/i, "partition-schemes"),
  H(/consistent hash/i, "consistent-hashing"),
  H(/hot (key|partition|spot|shard)s?|celebrity problem/i, "hot-keys"),
  H(/secondary index(es)?|global index/i, "partitioned-indexes"),
  H(/rebalanc|re-?sharding|dynamic partitioning/i, "rebalancing"),
  H(/unique ids?|snowflake id|id generat|uuids?|ticket server/i, "unique-ids"),
  // transactions
  H(/\bacid\b|write[- ]ahead log|\bwal\b|^atomicity|^durability/i, "acid-wal"),
  H(/isolation levels?|dirty (read|write)|phantom|read committed|serializab|repeatable read|^isolation\b/i, "isolation-anomalies"),
  H(/\bmvcc\b|two[- ]phase locking|\b2pl\b|optimistic (lock|concurrency)|pessimistic lock/i, "mvcc-2pl"),
  H(/two[- ]phase commit|\b2pc\b|distributed transactions?/i, "two-phase-commit"),
  H(/\bsagas?\b(?! of)|outbox|compensating transaction/i, "sagas-outbox"),
  H(/\braft\b|paxos|consensus|leader election|byzantine|two generals|state machine replication/i, "consensus-raft"),
  H(/(vector|logical|physical|lamport|hybrid) (clocks?|time)|happens[- ]before|truetime|clock synchroni[sz]ation|which clock counts|event time/i, "clocks-ordering"),
  H(/distributed locks?|redlock|fencing tokens?/i, "distributed-locks"),
  // messaging
  H(/message (queue|broker)s?|rabbitmq|\bsqs\b|pub[- ]?sub|queue vs|messaging middleware/i, "queue-vs-log"),
  H(/kafka/i, "kafka-internals"),
  H(/exactly[- ]once|at[- ]least[- ]once|at[- ]most[- ]once|delivery (semantics|guarantees)/i, "delivery-semantics"),
  H(/event sourcing|\bcqrs\b|event[- ]driven/i, "event-patterns"),
  H(/dead[- ]letter|\bdlq\b|message ordering|retry (queue|topic)/i, "retries-dlq"),
  // streams
  H(/mapreduce|map[- ]reduce|hadoop|\bspark\b|batch processing|data pipelines?/i, "batch-processing"),
  H(/stream processing|windowing|watermarks?|event vs arrival|\bflink\b|real[- ]time (data )?processing|real[- ]time analytics/i, "stream-windows"),
  H(/stateful (and|vs) stateless processing|stateful stream|checkpointing/i, "stateful-streams"),
  H(/lambda architecture|kappa architecture/i, "lambda-kappa"),
  H(/change data capture|\bcdc\b|debezium/i, "cdc"),
  // protection
  H(/rate[- ]limit|token bucket|leaky bucket|sliding (window )?(log|counter)/i, "rl-algorithms"),
  H(/distributed rate limit/i, "rl-distributed"),
  H(/load shedding|back[- ]?pressure|admission control|fail[- ](open|closed)|millions of checkout/i, "load-shedding"),
  // storage and search
  H(/object storage|blob storage|\bs3\b|erasure cod|where does google store/i, "object-storage", true),
  H(/video (streaming|transcod|encod|processing)|adaptive bit ?rate|\bhls\b|transcod/i, "media-delivery"),
  H(/inverted index|elasticsearch|search engine|full[- ]text search|lucene|how search (really )?works|post search|searches one document/i, "inverted-index"),
  H(/geohash|quad[- ]?trees?|geospatial|proximity search|location[- ]based service/i, "geo-indexes", true),
  H(/bloom filters?|hyperloglog|count[- ]min|probabilistic data structures|data structures for big data/i, "sketches"),
  H(/time[- ]series/i, "time-series"),
  // reliability
  H(/\bsl[aoi]s?\b|service level (agreement|objective|indicator)|error budget/i, "slos", true),
  H(/circuit breaker|bulkhead|resilien(ce|cy)|fault[- ]toleran(t|ce)|cascading failure|single point of failure|\bspof\b|timeouts?,? retries|retries (and|with) backoff|exponential backoff/i, "resilience-patterns"),
  H(/observability|distributed tracing|opentelemetry|why logging|logging (is|in) system design|monitoring (system|and alerting)/i, "observability"),
  H(/canary (release|deploy)|blue[- ]green|feature flags?|deployment strateg|ci ?\/ ?cd|ships code to production|mobile apps are released/i, "safe-deploys"),
  H(/failure detection|heartbeats?|gossip protocol|phi accrual/i, "failure-detection"),
  // security
  H(/authenticat|\bjwt\b|session vs|oauth|openid|\bsso\b|single sign[- ]on|store passwords|passkeys?/i, "authn", true),
  H(/authori[sz]ation|\brbac\b|\babac\b|access control|zanzibar|permissions? system/i, "authz", true),
  H(/encrypt|key management|\bkms\b|ssl, tls|end[- ]to[- ]end/i, "encryption"),
  H(/multi[- ]tenan/i, "multi-tenancy", true),
  H(/\bddos\b|bot detection|captcha|abuse|content moderation/i, "abuse-ddos"),
  // multi-region
  H(/active[- ](passive|active)|multi[- ]region|geo[- ]replication|replication at global scale/i, "region-topologies", true),
  H(/\bcrdts?\b|conflict resolution|automerge|last[- ]write[- ]wins|collaboration software|peritext/i, "conflict-resolution"),
  H(/disaster recovery|backups? (and|&) restore|\brpo\b|\brto\b/i, "disaster-recovery", true),
  H(/data residency|gdpr|data sovereignty/i, "data-residency", true),
  // manual pass over unmatched titles
  H(/\bdapper\b|monitoring basics/i, "observability"),
  H(/\bdremel\b/i, "olap-columnar"),
  H(/merkle trees?/i, "dynamo"),
  H(/\baurora\b/i, "quorums"),
  H(/high availability|99\.9+%|nines of|^reliability\b/i, "slos"),
  H(/power of the log|data structures that power (modern )?databases/i, "btree-lsm"),
  H(/data consistency and trade[- ]?offs/i, "consistency-models"),
  H(/publisher[- ]subscriber|^synchronous vs\.? asynchronous/i, "queue-vs-log"),
  H(/what is an api and how|how do you design (an|the) api/i, "api-design"),
  H(/code search/i, "inverted-index"),
  H(/broadcast (algorithms|ordering)/i, "consensus-raft"),
  H(/system models|faults? (and|&) failures?/i, "resilience-patterns"),
  H(/^proxies\b/i, "l4-l7"),
  H(/service discovery/i, "chubby-zookeeper"),
  H(/side ?car pattern|service mesh/i, "api-gateway"),
  H(/event[- ]based communication|communication (&|and) coupling/i, "event-patterns"),
  H(/performance metrics/i, "capacity-planning"),
  H(/^cap\b/i, "cap-pacelc"),
  H(/^latency\b/i, "latency-numbers"),
  H(/scale (your )?databases?|scaling databases?/i, "partition-schemes"),
  // papers
  H(/\bgfs\b|google file system|colossus|distributed file systems?|\bhdfs\b/i, "gfs-colossus", true),
  H(/bigtable|\bhbase\b/i, "bigtable", true),
  H(/spanner|truetime/i, "spanner", true),
  H(/chubby|zookeeper|\betcd\b/i, "chubby-zookeeper", true),
  H(/\bdynamo\b|dynamodb/i, "dynamo"),
  H(/\bborg\b|why is kubernetes|kubernetes explained|what is kubernetes|k8s architecture/i, "borg-kubernetes", true),
];

/** HLD-only noise: setup tutorials, framework how-tos, contest problems, LLD and AI videos. */
export const HLD_SKIP = /\b(install(ing|ation)?|set ?up\b|setup|spring ?boot|spring (security|data|cloud|propagation|transactions)|\bjpa\b|hibernate|mongotemplate|node ?js|windows 1[01]|ubuntu|kibana console|step[- ]by[- ]step tutorial|\$project|date queries|aktu|blockchain|codeforces|codechef|leetcode|\bdiv ?\d\b|\blld\b|low[- ]level (system )?design|\brag\b|llm|agentic|langchain|chain of responsibility|design patterns?\b)/i;
/** Product channels must also look explanatory, and not be news round-ups or very old talks. */
export const BROAD_OK = /what is|what'?s|how\b|explained|deep dive|internals|architecture|under the hood|introduction|overview|in a minute|at scale|\b101\b|why\b|behind/i;
export const BROAD_NO = /google i\/o 20(0\d|1[0-5])|dev news|, and more|this week|in this episode|gdd-|hackathon|codelab/i;

/** "Design X" videos → HLD design exercises (always shown on the design page). Title must look like a design video. */
const DESIGNISH = /design|architecture|system|how\b|explained|works|working|internals?|breakdown|interview|deep dive|scaled|built/i;
export const HLD_DESIGNS: ConceptRule[] = ([
  [/url shorten|tiny ?url|\bbit\.?ly\b/i, "d-url-shortener"],
  [/rate limiter|rate limiting (system|service)/i, "d-rate-limiter"],
  [/^(?!.*(messenger|whatsapp|search)).*(news ?feed|(twitter|instagram|facebook|fb)\b.*(design|feed|timeline)|design (twitter|instagram)|twitter (system|software))/i, "d-news-feed"],
  [/whatsapp|chat (system|app|application|service)|messenger|discord stores|slack (system|architecture)/i, "d-chat"],
  [/^(?!.*recommend).*((design|rebuilds?) youtube|youtube (system|architecture)|netflix.{0,4}youtube|youtube.{0,4}netflix|netflix (system|api|architecture)|video streaming (system|platform|service)|prime video|live stream(ing)? (platform|events)|video processing at scale)/i, "d-youtube"],
  [/dropbox|google drive|file (sync|sharing|share) (system|service)/i, "d-drive"],
  [/web crawler|crawl(ing|er)? billions/i, "d-web-crawler"],
  [/type[- ]?ahead|auto[- ]?complete|auto[- ]?suggest|search suggestions/i, "d-typeahead"],
  [/design (an? )?(uber|lyft|ola)\b|uber\/lyft|uber\/google maps|(uber|ola|lyft) (system design|architecture)|\buber\b.*\bola\b|ride[- ]hailing|ride[- ]sharing|cab booking/i, "d-ride-hailing"],
  [/^(?!.*\baws\b).*notifications? (system|service|engine)/i, "d-notification"],
  [/ticketmaster|bookmyshow|ticket booking|movie ticket|fandango|seat (booking|reservation)|booking system/i, "d-ticketing"],
  [/key[- ]value stores?|distributed kv/i, "d-kv-store"],
  [/distributed cach(e|ing)|design (a )?(distributed )?cache|redis system design|caching strategies/i, "d-distributed-cache"],
  [/load balancer (system )?design|design (a )?load balancer|load balanc(er|ing) (algorithms|explained)/i, "d-load-balancer"],
  [/api gateway/i, "d-api-gateway"],
  [/what is a cdn|design (a )?cdn|content delivery network|cache purge/i, "d-cdn"],
  [/pastebin/i, "d-pastebin"],
  [/comments? (system|section)|commenting system/i, "d-comments"],
  [/google docs|collaborative (edit|document)|real[- ]time collaboration|operational transformation/i, "d-collab-docs"],
  [/\byelp\b|proximity|nearby (places|friends)|location based service|google maps|places search|tinder/i, "d-proximity"],
  [/job scheduler|task scheduler|\bcron\b|distributed scheduler/i, "d-job-scheduler"],
  [/metrics (and )?monitoring|monitoring system|logging system|time[- ]series database|log collection/i, "d-metrics"],
  [/ad click|click aggregat/i, "d-ad-click"],
  [/^(?!.*crypto).*(payments? (system|gateway|service)|payments at|processing payments|apple ?\/? ?google pay|scan to pay|\bupi\b)/i, "d-payment"],
  [/top[- ]k\b.*(system|leaderboard|design)|trending|heavy hitters|leaderboard|hashtags ordered by count/i, "d-trending"],
  [/fraud|bot detection/i, "d-fraud-detection"],
  [/single sign[- ]on|\bsso\b|oauth/i, "d-auth-sso"],
  [/zanzibar|authori[sz]ation (system|service)|permission(s)? system/i, "d-authz"],
  [/e-?commerce (platform|system|design)|amazon\/flipkart|flipkart like e-?commerce|shopping cart|inventory reservation|checkout requests/i, "d-global-cart"],
  [/\bledger\b|double[- ]entry/i, "d-dr-ledger"],
  [/google maps|navigation system|uber\/google maps|eta (prediction|calculation)/i, "d-google-maps"],
  [/\bgmail\b|email (service|system)|mail server/i, "d-gmail"],
  [/google photos|photo (storage|sharing|backup)/i, "d-google-photos"],
  [/tiktok|youtube shorts|\breels\b|google news|short video/i, "d-news-shorts"],
  [/view count|like (button|count)|youtube views|counting (views|likes)|distributed counter/i, "d-view-counter"],
  [/\bzoom\b|video (call|chat|conferenc)|google meet|webrtc|skype/i, "d-video-call"],
  [/ad serving|contextual advertising|ad auction|google ads|banners are shown/i, "d-ad-serving"],
  [/recommendation (engine|system)s?|recommender/i, "d-news-shorts"],
  [/upgrade .*servers|deployment strateg|rolling (update|deploy)|canary (release|deploy)|ships code to production/i, "d-server-upgrade"],
  [/search engine|google search|searches one document|code search/i, "d-search-engine"],
  [/online judge|leetcode \(online|code editor|coding contests?/i, "d-online-judge"],
  [/live comments?|live chat/i, "d-live-comments"],
  [/stock (exchange|broker|trading)|trading platform|robinhood|zerodha|matching engine/i, "d-stock-exchange"],
  [/distributed messag(e|ing) queue|design kafka|pub-sub model like kafka|message queue system design/i, "d-message-queue"],
  [/calendar|meeting schedul/i, "d-calendar"],
  [/inventory (management|system)/i, "d-inventory"],
] as ConceptRule[]).map(([re, to]) => [new RegExp(`^(?=.*(${DESIGNISH.source}))(?=.*(${re.source}))`, "i"), to] as ConceptRule);

// ───────────────────────── LLD ─────────────────────────
/** Titles on LLD channels that are not LLD study material (frameworks, cloud, tools, other languages' courses). */
export const LLD_SKIP = /spring ?boot|spring (security|data|cloud|ai|bean)|\bjpa\b|hibernate|\baws\b|terraform|\bgit\b|github|kafka|redis|elasticsearch|react(js)?\b|vue\.?js|ramda|\bvim\b|blockchain|leetcode|\bdsa\b|dynamic programming|binary search|\bgraph|linked ?list|\bheap\b|\bbst\b|maven|lombok|devops|docker|kubernetes|forward deployed|genai|\brag\b|\bllm\b|interview experience|cracked|laid ?off|resume|referral|work life|studio tour|kilimanjaro|questions? (&|and) answers/i;

/** Titles that are LLD despite matching LLD_SKIP (e.g. "Pub-Sub like Kafka | LLD + Multithreading"). */
export const LLD_ALLOW = /\blld\b|low[- ]level|multi[- ]?thread|concurrency|threadpoolexecutor/i;
const L = (re: RegExp, to: string) => [re, to] as ConceptRule;
export const LLD_CONCEPTS: ConceptRule[] = [
  // the interview
  L(/lld vs hld|what is (lld|low level design)|introduction to (lld|low level design)|lld (roadmap|crash course|101)|low[- ]level (system )?design (interviews? )?roadmap|approach (to solve )?(lld|low level design)|types of low level designs|machine coding|do we have to create each and every class|chatgpt mock lld|mock low level system design interview/i, "ood-at-google"),
  L(/approach (to solve )?(lld|low level design)|requirements? (gathering|clarif)|use case diagram/i, "ood-requirements"),
  L(/class diagram|\buml\b|association,? aggregation|composition vs aggregation|aggregation vs composition/i, "class-diagrams"),
  L(/sequence diagram|state (machine|diagram)|diagrams every software developer/i, "behaviour-diagrams"),
  L(/remove hardcodings|extensibility in low level design|design choices, solid/i, "ood-core-code"),
  // OOP & SOLID
  L(/encapsulation|oops? concepts?|4 pillars|pillars of (object|oop)|master oops|\boop(s)? in java|object oriented programming|classes,? objects|java classes in depth|immutable class|access modifiers|constructors? in (java|depth)|objects deep dive/i, "encapsulation"),
  L(/inheritance|composition over inheritance|preferring composition/i, "inheritance-composition"),
  L(/polymorphism|abstract class|interfaces? (in depth|deep dive)|java interface|generics|wildcards|always use interfaces|covariance|functional interface|pattern matching for (switch|instanceof)|switch expressions|sealed classes/i, "polymorphism"),
  L(/\bsolid\b|single responsibility|open[- ]closed/i, "srp-ocp"),
  L(/\bsolid\b|liskov|square[- ]rectangle|interface segregation/i, "lsp-isp"),
  L(/\bsolid\b|dependency (inversion|injection)|depend on abstractions|inversion of control|\bioc\b/i, "dip-di"),
  L(/\b(dry|kiss|yagni)\b|design principles|law of demeter/i, "design-heuristics"),
  // patterns I
  L(/factory|creational design patterns?|become a master developer by using creational/i, "factory-patterns"),
  L(/builder (design )?pattern|prototype|creational design patterns?/i, "builder-prototype"),
  L(/singleton|object pool|double[- ]checked locking|creational design patterns?/i, "singleton-pool"),
  L(/adapter|facade|structural design patterns?/i, "adapter-facade"),
  L(/decorator|proxy (design )?pattern|structural design patterns?/i, "decorator-proxy"),
  L(/composite|bridge (design )?pattern|flyweight|structural design patterns?/i, "composite-bridge-flyweight"),
  // patterns II
  L(/strategy (design )?pattern|template (method )?(design )?pattern|behavio(u)?ral design patterns?/i, "strategy-template"),
  L(/observer|behavio(u)?ral design patterns?|cricbuzz|cricinfo/i, "observer-pattern"),
  L(/state (design )?pattern|behavio(u)?ral design patterns?/i, "state-pattern"),
  L(/command (design )?pattern|memento|undo,? redo/i, "command-memento"),
  L(/chain of responsibility/i, "chain-of-responsibility"),
  L(/iterator (design )?pattern|visitor/i, "iterator-visitor"),
  L(/mediator|null object|interpreter (design )?pattern/i, "mediator-null-object"),
  // clean code
  L(/api design|java optional|exception handling|exceptions? vs errors|custom exceptions|idempotent (post )?api/i, "library-api"),
  L(/\benums?\b|pojo|record class|immutable (class|objects)|value objects?|sealed classes/i, "modelling-data"),
  L(/unit test|junit|mockito|mock vs stub|test doubles?|write just enough tests/i, "testability"),
  L(/code smells?|refactor/i, "smells-refactoring"),
  L(/\bmvc\b|layered architecture|hexagonal|clean architecture|repository pattern/i, "code-layers"),
  // concurrency
  L(/multithreading (basics|in java|introduction)|introduction to multithreading|process vs thread|threads?,? process|thread (creation|lifecycle|methods)|thread vs runnable|create threads?|daemon thread|cpu, core, program|how jvm h[a]?ndles multithreading|concurrency (&|and) multithreading/i, "threads-basics"),
  L(/race condition|thread safety|synchroniz(ed|ation)|problems in multithreading|monitor locks/i, "race-conditions"),
  L(/volatile|memory model|visibility, ordering/i, "memory-visibility"),
  L(/reentrant ?lock|read ?write ?lock|stamped ?lock|java locks|locks and condition|lock'?s?'? fairness|monitor locks/i, "locks"),
  L(/wait\(\)|notify|inter[- ]?thread communication|thread communication|locks and condition/i, "condition-variables"),
  L(/deadlock/i, "deadlock"),
  L(/atomic|compare[- ]and[- ]swap|\bcas\b|lock[- ]free/i, "atomics-cas"),
  L(/producer[- ]consumer|blocking ?queue|bounded buffer|multi[- ]threaded message queue|pub[- ]?sub model like kafka/i, "producer-consumer"),
  L(/semaphore|count ?down ?latch|cyclic ?barrier|phaser/i, "sync-primitives"),
  L(/thread ?pools?|executor|threadpoolexecutor|fork ?join|work ?stealing|future and callable|cachedthreadpool|fixedthreadpool/i, "thread-pools"),
  L(/concurrent ?hash ?map|concurrent ?skip ?list|copy ?on ?write|concurrent collections|hashtable explained/i, "concurrent-collections"),
  L(/completable ?future|virtual ?threads?|async(hronous)? (programming|await)|event loop|threadlocal/i, "async-virtual-threads"),
  L(/scheduled ?thread ?pool|scheduled ?executor|\bscheduler\b|cron job|fixed ?rate|fixed ?delay|timing wheel/i, "timers-scheduling"),
  L(/print (n|1 to n) numbers via 2 threads|odd[- ]even (using )?threads|dining philosophers|print in order|\bh2o\b|fizz ?buzz multithreaded/i, "concurrency-puzzles"),
];

/** LLD "design X" videos → LLD design questions (always shown on the design page). */
export const LLD_DESIGNS: ConceptRule[] = ([
  [/parking lot/i, "d-lld-parking-lot"],
  [/elevator/i, "d-lld-elevator"],
  [/vending machine/i, "d-lld-vending-machine"],
  [/splitwise|expense sharing/i, "d-lld-splitwise"],
  [/lru cache|low level design of cache|multi level cache|cache\| low level|design (a )?cache/i, "d-lld-lru-concurrent"],
  [/rate limiter/i, "d-lld-rate-limiter-lld"],
  [/logging (system|framework)|design logging|distributed logging|logger/i, "d-lld-logger"],
  [/file system/i, "d-lld-file-system"],
  [/pub[- ]?sub|message queue like kafka|messaging queue/i, "d-lld-pub-sub"],
  [/tic[- ]?tac[- ]?toe|chess|battleship|board game|snake (and|&) food|snake game/i, "d-lld-board-game"],
  [/text editor|undo,? redo|word processor/i, "d-lld-text-editor"],
  [/key[- ]value store/i, "d-lld-kv-transactions"],
  [/meeting (scheduler|room)|calendar/i, "d-lld-meeting-scheduler"],
  [/task scheduler|job scheduler|distributed scheduler/i, "d-lld-task-scheduler-lld"],
  [/circuit breaker|retry pattern|bulkhead|fault tolerance/i, "d-lld-resilient-client"],
  [/library management/i, "d-lld-library"],
  [/bookmyshow|movie ticket|ticket booking|booking system/i, "d-lld-movie-booking"],
  [/hotel (management|booking|reservation)/i, "d-lld-hotel-booking"],
  [/\batm\b/i, "d-lld-atm"],
  [/snake (and|&|n) ladder/i, "d-lld-snake-ladder"],
  [/car rental|zoomcar/i, "d-lld-car-rental"],
  [/auction/i, "d-lld-auction"],
  [/coupons?.*cart|shopping cart/i, "d-lld-cart-coupons"],
  [/payment gateway|payments app/i, "d-lld-payment-gateway"],
  [/spreadsheet|excel/i, "d-lld-spreadsheet"],
  [/deck of cards|blackjack|card game/i, "d-lld-card-game"],
  [/stack ?overflow|q ?& ?a (site|platform)/i, "d-lld-qa-site"],
  [/(uber|ola|cab|taxi).*(low level|lld)|(low level|lld).*(uber|ola|cab|taxi)/i, "d-lld-ride-matching"],
  [/web crawler/i, "d-lld-web-crawler-mt"],
  [/connection pool/i, "d-lld-connection-pool"],
  [/notify[- ]?me|notification (system|service)/i, "d-lld-notification"],
  [/inventory management|inventory system/i, "d-lld-inventory"],
] as ConceptRule[]);
