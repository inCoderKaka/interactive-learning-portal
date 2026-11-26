import type { Tier } from "@/lib/types";

/**
 * The hierarchy below each chapter (a chapter is one of the original topics: its id, progress, cards and drills stay).
 * Each entry is a subtopic page: [id, title, tier, minutes]. Order is learning order.
 * The tree pane, the Learn/Revise pages and the video pipeline all read this one list.
 */
export type Sub = [id: string, title: string, tier: Tier, est: number];

export const OUTLINE: Record<string, Sub[]> = {
  // ───────────── DSA ─────────────
  complexity: [
    ["big-o", "Big-O, Big-Θ, Big-Ω and growth rates", 1, 25],
    ["amortized", "Amortised analysis", 2, 20],
    ["recurrences", "Recurrences and the Master theorem", 2, 25],
    ["space-recursion", "Space complexity and the recursion stack", 1, 15],
    ["constraints-budget", "From constraints to a complexity budget", 1, 15],
  ],
  "arrays-hashing": [
    ["dynamic-arrays", "Arrays and dynamic arrays", 1, 15],
    ["hash-tables", "Hash tables: hashing, collisions and load factor", 1, 30],
    ["counting-patterns", "Counting and frequency patterns", 1, 20],
    ["prefix-sums", "Prefix sums (1D, 2D) and difference arrays", 1, 25],
    ["prefix-hash", "Prefix sum + hash map: subarray targets", 1, 25],
    ["kadane", "Kadane's algorithm and maximum subarray", 1, 20],
  ],
  "two-pointers": [
    ["opposite-pointers", "Converging pointers on sorted input", 1, 20],
    ["same-direction-pointers", "Same-direction pointers: read/write and dedupe", 1, 15],
    ["array-partition", "Partitioning and the Dutch national flag", 2, 20],
    ["merge-pointers", "Merging two sequences", 1, 15],
  ],
  "sliding-window": [
    ["fixed-window", "Fixed-size windows", 1, 15],
    ["variable-window", "Variable windows: longest and shortest", 1, 25],
    ["count-windows", "Counting subarrays: exactly K = atMost(K) − atMost(K−1)", 2, 20],
    ["window-structures", "Windows with a data structure inside", 2, 20],
  ],
  stack: [
    ["stack-parsing", "Stacks for parsing: brackets and expressions", 1, 25],
    ["monotonic-stack", "Monotonic stack: next greater and smaller", 1, 25],
    ["histogram", "The histogram family: largest rectangle and maximal rectangle", 2, 25],
    ["stack-design", "Stack design: min stack, max stack, stacks from queues", 1, 15],
  ],
  "mono-deque": [
    ["queues-deques", "Queues, deques and circular buffers", 1, 15],
    ["monotonic-deque", "Monotonic deque: sliding-window maximum", 1, 25],
    ["deque-dp", "Deque-optimised DP", 3, 25],
  ],
  "binary-search": [
    ["bs-boundaries", "Binary search invariants: lower and upper bound", 1, 25],
    ["bs-rotated", "Rotated arrays, peaks and unknown sizes", 1, 20],
    ["bs-answer", "Binary search on the answer", 1, 25],
    ["bs-2d-median", "2D matrices and the median of two arrays", 2, 25],
    ["bs-real-ternary", "Real-valued bisection and ternary search", 3, 15],
  ],
  "linked-list": [
    ["ll-basics", "Linked-list basics and the dummy node", 1, 15],
    ["ll-reversal", "Reversal: whole, between, k-group", 1, 25],
    ["fast-slow", "Fast and slow pointers: Floyd's cycle detection", 1, 25],
    ["ll-merge-sort", "Merging and sorting lists", 2, 20],
    ["ll-copy-design", "Copying with random pointers and list-backed designs", 2, 20],
  ],
  trees: [
    ["tree-traversals", "Traversals: recursive, iterative and Morris", 1, 30],
    ["tree-dfs-returns", "DFS return values: height, diameter, path sums", 1, 30],
    ["tree-bfs", "Level-order BFS and tree views", 1, 20],
    ["tree-construct", "Construction and serialisation", 2, 25],
    ["lca", "Lowest common ancestor and binary lifting", 2, 30],
  ],
  bst: [
    ["bst-ops", "BST search, insert and delete", 1, 25],
    ["bst-inorder", "In-order problems: validate, k-th, iterator", 1, 20],
    ["balanced-bst", "Balanced BSTs: AVL, red-black and ordered maps", 2, 30],
  ],
  tries: [
    ["trie-basics", "Trie structure and operations", 1, 20],
    ["trie-search", "Trie-powered search: word search II, autocomplete", 2, 25],
    ["bit-trie", "Binary tries for maximum XOR", 3, 20],
  ],
  heap: [
    ["heap-internals", "Binary heap internals: sift and O(n) heapify", 1, 25],
    ["top-k", "Top-K and K-way merge", 1, 20],
    ["two-heaps", "Two heaps: running median", 1, 20],
    ["heap-scheduling", "Scheduling with heaps", 2, 25],
    ["indexed-pq", "Lazy deletion and indexed priority queues", 3, 20],
  ],
  backtracking: [
    ["subsets-combinations", "Subsets and combinations", 1, 25],
    ["permutations", "Permutations and duplicate handling", 1, 20],
    ["constraint-search", "Constraint search: N-Queens and Sudoku", 2, 25],
    ["grid-backtracking", "Grid search and pruning", 1, 20],
    ["partition-backtracking", "Partitioning problems", 2, 20],
  ],
  "graph-traversal": [
    ["graph-representations", "Graph representations", 1, 20],
    ["bfs", "Breadth-first search", 1, 30],
    ["dfs", "Depth-first search, components and edge types", 1, 30],
    ["cycle-detection", "Cycle detection: undirected and directed", 1, 20],
    ["grid-graphs", "Grids as graphs: flood fill and multi-source BFS", 1, 25],
    ["bipartite", "Bipartite graphs and two-colouring", 2, 20],
    ["state-space-bfs", "Implicit graphs and state-space search", 2, 25],
  ],
  "topo-sort": [
    ["kahn", "Kahn's algorithm", 1, 20],
    ["dfs-topo", "Topological order from DFS finish times", 1, 20],
    ["dag-dp", "DP on DAGs: longest paths and counting", 2, 25],
    ["order-constraints", "Ordering constraints: alien dictionary and friends", 2, 20],
  ],
  "union-find": [
    ["dsu-core", "Disjoint set union: path compression and union by rank", 1, 30],
    ["dsu-applications", "DSU applications: components and redundant edges", 1, 20],
    ["weighted-dsu", "Weighted and parity DSU", 3, 20],
    ["offline-dsu", "Offline queries and reverse-time DSU", 3, 20],
  ],
  "shortest-paths": [
    ["dijkstra", "Dijkstra's algorithm", 1, 35],
    ["zero-one-bfs", "0-1 BFS", 2, 15],
    ["bellman-ford", "Bellman–Ford and negative cycles", 2, 25],
    ["floyd-warshall", "Floyd–Warshall: all pairs", 2, 20],
    ["state-dijkstra", "Dijkstra on state graphs and modified costs", 2, 25],
    ["a-star", "A* and bidirectional search", 3, 20],
  ],
  "advanced-graphs": [
    ["mst", "Minimum spanning trees: Kruskal, Prim and the cut property", 1, 40],
    ["bridges-ap", "Bridges and articulation points (Tarjan's low-link)", 2, 40],
    ["scc", "Strongly connected components: Kosaraju and Tarjan", 2, 40],
    ["euler", "Eulerian paths and circuits: Hierholzer's algorithm", 2, 35],
    ["network-flow", "Maximum flow, minimum cut and bipartite matching", 3, 40],
  ],
  "dp-1d": [
    ["dp-foundations", "DP foundations: recursion → memo → table → space", 1, 30],
    ["linear-dp", "Linear DP: climbing, robbing, decoding", 1, 25],
    ["state-machine-dp", "State-machine DP: the stock problems", 2, 25],
    ["lis", "Longest increasing subsequence", 1, 25],
    ["partition-dp", "Partition DP: word break and splits", 1, 20],
  ],
  "dp-2d": [
    ["grid-dp", "Grid DP", 1, 20],
    ["two-sequence-dp", "Two-sequence DP: LCS and edit distance", 1, 30],
    ["palindrome-dp", "Palindrome DP", 2, 20],
    ["counting-dp", "Counting DP: distinct subsequences and paths", 2, 20],
  ],
  "dp-knapsack": [
    ["knapsack-01", "0/1 knapsack", 1, 30],
    ["knapsack-unbounded", "Unbounded knapsack: coin change", 1, 20],
    ["subset-sum", "Subset sum, partition and target sum", 1, 20],
    ["knapsack-variants", "Bounded and multi-dimensional knapsack", 3, 20],
  ],
  "dp-advanced": [
    ["interval-dp", "Interval DP", 2, 30],
    ["bitmask-dp", "Bitmask DP", 2, 30],
    ["tree-dp", "Tree DP and rerooting", 2, 30],
    ["game-dp", "Game theory: minimax, Nim and Grundy numbers", 3, 25],
    ["digit-dp", "Digit DP", 3, 25],
    ["dp-optimizations", "DP optimisations: monotone queue, convex hull trick, divide and conquer", 3, 25],
  ],
  greedy: [
    ["greedy-proofs", "Greedy choice and exchange arguments", 1, 25],
    ["greedy-reach", "Reachability greedy: jump game and gas station", 1, 20],
    ["greedy-heap", "Greedy with a heap: scheduling and Huffman", 2, 25],
    ["greedy-sorting", "Sort-then-greedy and assignment", 1, 20],
  ],
  intervals: [
    ["merge-intervals", "Merging and inserting intervals", 1, 20],
    ["sweep-line", "Sweep line events", 1, 25],
    ["interval-scheduling", "Interval scheduling and covering", 1, 20],
    ["skyline", "Skyline and multiset sweeps", 2, 20],
  ],
  bits: [
    ["bit-basics", "Bitwise operators and two's complement", 1, 20],
    ["xor-tricks", "XOR tricks", 1, 15],
    ["bitmask-enum", "Bitmask enumeration and submasks", 2, 20],
    ["bit-counting", "Counting bits and bit DP", 2, 15],
  ],
  math: [
    ["gcd-primes", "GCD, primes and the sieve", 1, 25],
    ["modular", "Modular arithmetic, fast power and inverses", 2, 25],
    ["combinatorics", "Combinatorics: nCr, Catalan, inclusion–exclusion", 2, 25],
    ["geometry", "Computational geometry basics", 3, 20],
    ["randomized", "Randomised algorithms: reservoir sampling and shuffles", 2, 20],
  ],
  strings: [
    ["string-basics", "String fundamentals: anagrams, palindromes, builders", 1, 20],
    ["rolling-hash", "Rolling hash (Rabin–Karp)", 2, 25],
    ["kmp", "KMP and the prefix function", 2, 30],
    ["z-algorithm", "The Z-algorithm", 2, 20],
    ["manacher", "Manacher's algorithm", 3, 20],
    ["suffix-structures", "Suffix arrays, automata and Aho–Corasick", 3, 25],
  ],
  "range-queries": [
    ["sparse-table", "Sparse tables and RMQ", 2, 20],
    ["fenwick", "Fenwick trees (binary indexed trees)", 2, 30],
    ["segment-tree", "Segment trees", 2, 35],
    ["lazy-propagation", "Lazy propagation", 3, 25],
    ["sqrt-mo", "Square-root decomposition and Mo's algorithm", 3, 20],
  ],
  "design-ds": [
    ["lru-lfu", "LRU and LFU caches", 1, 30],
    ["iterators", "Iterator design", 1, 15],
    ["time-versioned", "Time-based and versioned stores", 2, 20],
    ["randomized-set", "O(1) randomised sets", 1, 15],
    ["stream-counters", "Stream designs: hit counters and rate limiters", 2, 20],
    ["skiplist", "Skip lists", 3, 20],
  ],
  matrix: [
    ["matrix-traversal", "Matrix traversal: spiral, diagonal, rotation", 1, 20],
    ["matrix-in-place", "In-place marking and simulation", 2, 20],
    ["matrix-search", "Searching sorted matrices", 2, 15],
  ],
  sorting: [
    ["comparison-sorts", "Comparison sorts: merge, quick, heap", 1, 30],
    ["linear-sorts", "Counting, radix and bucket sort", 2, 20],
    ["quickselect", "Quickselect and order statistics", 1, 20],
    ["custom-sort", "Comparators, stability and inversion counting", 2, 20],
  ],
  "advanced-techniques": [
    ["meet-in-middle", "Meet in the middle", 3, 20],
    ["heavy-light", "Heavy-light and centroid decomposition", 3, 25],
    ["persistent", "Persistent data structures", 3, 20],
    ["randomized-structures", "Treaps and randomised structures", 3, 20],
  ],
};

/** Chapter id of each subtopic. */
export const CHAPTER_OF: Record<string, string> = Object.fromEntries(
  Object.entries(OUTLINE).flatMap(([ch, subs]) => subs.map(([id]) => [id, ch])),
);
