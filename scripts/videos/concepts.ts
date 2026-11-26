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
