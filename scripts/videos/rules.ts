/**
 * Where a LeetCode problem lives in the outline, decided from its LeetCode tags and title.
 * Rules run top to bottom; the first that matches wins. A target may be a subtopic id or a chapter id.
 */
export type LcRow = [id: string, slug: string, title: string, diff: "E" | "M" | "H", premium: 0 | 1, tags: string[]];

type Rule = { tags?: string[]; all?: string[]; title?: RegExp; not?: string[]; to: string | null };

const has = (tags: string[], list?: string[]) => !list || list.some((t) => tags.includes(t));
const hasAll = (tags: string[], list?: string[]) => !list || list.every((t) => tags.includes(t));

export const LC_RULES: Rule[] = [
  // not DSA: SQL, shell and the JavaScript 30-day problems (no tags) are skipped
  { tags: ["database", "shell"], to: null },
  { tags: ["concurrency"], to: "concurrency" },

  // advanced graphs, most specific first
  { tags: ["eulerian-circuit", "eulerian-path", "semi-eulerian-graph", "eulerian-graph"], to: "euler" },
  { tags: ["bridge-graph", "articulation-point", "biconnected-component"], to: "bridges-ap" },
  { tags: ["strongly-connected-component", "kosarajus-algorithm", "tarjans-scc-algorithm"], to: "scc" },
  { tags: ["minimum-spanning-tree", "prims-algorithm", "kruskals-algorithm", "boruvkas-algorithm"], to: "mst" },
  { tags: ["flow-network", "maximum-flow", "minimum-cut", "edmonds-karp-algorithm", "dinics-algorithm", "push-relabel-algorithm", "mpm-algorithm", "matching-graph", "maximum-matching", "perfect-matching", "hungarian-algorithm", "minimum-cost-flow", "successive-shortest-path-algorithm"], to: "network-flow" },

  // shortest paths
  { tags: ["0-1-bfs"], to: "zero-one-bfs" },
  { tags: ["bellman-ford-algorithm"], to: "bellman-ford" },
  { tags: ["floyd-warshall-algorithm"], to: "floyd-warshall" },
  { tags: ["a-search", "heuristic-search", "bidirectional-search"], to: "a-star" },
  { tags: ["k-shortest-path"], to: "state-dijkstra" },
  { tags: ["dijkstra", "shortest-path"], title: /\b(stops?|discount|fuel|coupon|time|effort|limit|obstacles?|keys?)\b/i, to: "state-dijkstra" },
  { tags: ["dijkstra", "shortest-path"], to: "dijkstra" },

  { tags: ["topological-sort"], title: /alien|sequence reconstruction|order|sort items/i, to: "order-constraints" },
  { tags: ["topological-sort"], to: "kahn" },
  { tags: ["directed-acyclic-graph"], to: "dag-dp" },
  { tags: ["union-find"], to: "dsu-applications" },
  { tags: ["bipartite-graph", "graph-coloring"], to: "bipartite" },
  { tags: ["lowest-common-ancestor", "binary-lifting"], to: "lca" },

  // advanced structures and techniques
  { tags: ["persistent-data-structure"], to: "persistent" },
  { tags: ["treap", "splay-tree"], to: "randomized-structures" },
  { tags: ["meet-in-the-middle"], to: "meet-in-middle" },
  { tags: ["knuth-morris-pratt-algorithm", "boyer-moore-string-search-algorithm"], to: "kmp" },
  { tags: ["z-algorithm"], to: "z-algorithm" },
  { tags: ["manacher", "palindromic-tree"], to: "manacher" },
  { tags: ["suffix-array", "suffix-automaton", "suffix-tree", "aho-corasick-algorithm", "lyndon-factorization", "lexicographically-minimal-string-rotation"], to: "suffix-structures" },
  { tags: ["rolling-hash"], to: "rolling-hash" },
  { tags: ["string-matching"], to: "kmp" },
  { tags: ["segment-tree"], title: /range (update|add|assign)|lazy/i, to: "lazy-propagation" },
  { tags: ["segment-tree"], to: "segment-tree" },
  { tags: ["binary-indexed-tree"], to: "fenwick" },
  { tags: ["sparse-table", "range-minimum-maximum-query"], to: "sparse-table" },
  { tags: ["sqrt-decomposition"], to: "sqrt-mo" },
  { tags: ["li-chao-tree"], to: "dp-optimizations" },
  { all: ["trie", "bit-manipulation"], to: "bit-trie" },
  { tags: ["trie"], title: /word search|search suggestion|autocomplete|stream|concatenated|replace words|palindrome pairs/i, to: "trie-search" },
  { tags: ["trie"], to: "trie-basics" },

  // games and DP families
  { tags: ["game-theory", "minimax-algorithm", "zero-sum-game", "nim-game", "sprague-grundy-theorem", "impartial-game"], to: "game-dp" },
  { tags: ["dp-on-trees"], to: "tree-dp" },
  { all: ["bitmask", "dynamic-programming"], to: "bitmask-dp" },
  { tags: ["complete-knapsack"], to: "knapsack-unbounded" },
  { tags: ["multiple-knapsack", "mixed-knapsack"], to: "knapsack-variants" },
  { tags: ["0-1-knapsack", "knapsack-problem"], title: /partition|target sum|subset/i, to: "subset-sum" },
  { tags: ["0-1-knapsack", "knapsack-problem"], to: "knapsack-01" },
  { tags: ["longest-increasing-subsequence"], to: "lis" },
  { tags: ["longest-common-subsequence"], to: "two-sequence-dp" },
  { tags: ["monotonic-queue"], all: ["dynamic-programming"], to: "deque-dp" },
  { tags: ["monotonic-queue"], to: "monotonic-deque" },
  { tags: ["monotonic-stack", "cartesian-tree"], title: /rectangle|histogram/i, to: "histogram" },
  { tags: ["monotonic-stack", "cartesian-tree"], to: "monotonic-stack" },

  // maths
  { tags: ["reservoir-sampling", "randomized", "rejection-sampling", "probability-and-statistics"], to: "randomized" },
  { tags: ["geometry", "polygons", "convex-hull", "nearest-pair-of-points", "minimum-enclosing-circle", "triangulation", "k-d-tree", "planar-graph"], to: "geometry" },
  { tags: ["fermats-little-theorem", "eulers-totient-function", "eulers-theorem", "extended-euclidean-algorithm", "bezouts-lemma"], to: "modular" },
  { tags: ["sieve-theory", "prime-number-sieve", "prime-factorization", "primality-test", "number-theory", "greatest-common-divisor", "euclidean-algorithm", "least-common-multiple"], to: "gcd-primes" },
  { tags: ["combinatorics", "inclusion-exclusion-principle"], to: "combinatorics" },

  // sorting and selection
  { tags: ["quickselect"], to: "quickselect" },
  { tags: ["counting-sort", "radix-sort", "bucket-sort"], to: "linear-sorts" },
  { tags: ["merge-sort"], title: /count|reverse pairs|smaller/i, to: "custom-sort" },
  { tags: ["merge-sort", "quicksort", "bubble-sort", "tournament-sort", "timsort", "sort"], to: "comparison-sorts" },

  // design
  { tags: ["design"], title: /\bl[rf]u\b/i, to: "lru-lfu" },
  { tags: ["design", "iterator"], title: /iterator/i, to: "iterators" },
  { tags: ["iterator"], to: "iterators" },
  { tags: ["design"], title: /time|snapshot|version|history|timestamp/i, to: "time-versioned" },
  { tags: ["design"], title: /random/i, to: "randomized-set" },
  { tags: ["design"], title: /hit counter|logger|rate|stream|moving average/i, to: "stream-counters" },
  { tags: ["design"], title: /skiplist/i, to: "skiplist" },
  { tags: ["design"], title: /median/i, to: "two-heaps" },
  { tags: ["design"], title: /stack|queue/i, to: "stack-design" },
  { tags: ["ordered-set"], all: ["design"], to: "balanced-bst" },

  // heaps
  { tags: ["heap-priority-queue"], title: /median/i, to: "two-heaps" },
  { tags: ["heap-priority-queue"], title: /meeting|task|course|schedul|cpu|ipo|project|server|room|event|process/i, to: "heap-scheduling" },
  { tags: ["heap-priority-queue"], all: ["greedy"], to: "greedy-heap" },
  { tags: ["heap-priority-queue"], to: "top-k" },
  { tags: ["design"], to: "design-ds" },
  { tags: ["data-stream"], to: "stream-counters" },
  { tags: ["ordered-set"], to: "balanced-bst" },

  // backtracking
  { tags: ["backtracking"], title: /permutation/i, to: "permutations" },
  { tags: ["backtracking"], title: /queens|sudoku|crossword|expression add|operators/i, to: "constraint-search" },
  { tags: ["backtracking"], title: /partition|palindrom|split|k equal|matchsticks|fair distribution/i, to: "partition-backtracking" },
  { tags: ["backtracking"], all: ["matrix"], to: "grid-backtracking" },
  { tags: ["backtracking"], title: /word search|path/i, to: "grid-backtracking" },
  { tags: ["backtracking"], to: "subsets-combinations" },

  // trees
  { tags: ["binary-search-tree"], title: /valid|kth|k-th|iterator|inorder|recover|closest|mode|minimum (absolute )?difference|successor/i, to: "bst-inorder" },
  { tags: ["binary-search-tree"], to: "bst-ops" },
  { tags: ["tree", "binary-tree"], title: /construct|serialize|deserialize|build|from (pre|in|post)order|recover a tree/i, to: "tree-construct" },
  { tags: ["tree", "binary-tree"], title: /traversal/i, not: ["breadth-first-search"], to: "tree-traversals" },
  { tags: ["tree", "binary-tree"], all: ["breadth-first-search"], not: ["graph"], to: "tree-bfs" },
  { tags: ["tree", "binary-tree"], title: /level|right side|vertical|zigzag|width|view|cousins/i, to: "tree-bfs" },
  { tags: ["binary-tree"], to: "tree-dfs-returns" },
  { tags: ["tree"], all: ["graph"], to: "tree-dp" },
  { tags: ["tree"], to: "tree-dfs-returns" },

  // graphs
  { tags: ["breadth-first-search", "depth-first-search", "graph"], all: ["matrix"], title: /word search/i, to: "grid-backtracking" },
  { tags: ["breadth-first-search", "depth-first-search", "graph"], all: ["matrix"], to: "grid-graphs" },
  { tags: ["breadth-first-search"], title: /lock|ladder|puzzle|jump|minimum (genetic|operations|moves|number of)|sliding|open the/i, to: "state-space-bfs" },
  { tags: ["graph"], title: /cycle|loop|safe/i, to: "cycle-detection" },
  { tags: ["breadth-first-search"], to: "bfs" },
  { tags: ["depth-first-search", "graph"], to: "dfs" },

  // binary search
  { tags: ["binary-search"], all: ["matrix"], to: "bs-2d-median" },
  { tags: ["binary-search"], title: /median of two/i, to: "bs-2d-median" },
  { tags: ["binary-search"], title: /rotated|peak|mountain|unknown size|bitonic/i, to: "bs-rotated" },
  { tags: ["binary-search"], title: /minimi[sz]e|maximi[sz]e|minimum|maximum|smallest|largest|capacity|speed|days|kth|k-th|split|time to/i, to: "bs-answer" },
  { tags: ["binary-search"], to: "bs-boundaries" },

  // windows, pointers, lists, stacks, queues
  { tags: ["sliding-window"], title: /number of|count/i, to: "count-windows" },
  { tags: ["sliding-window"], title: /size k|length k|k consecutive|of size|average/i, to: "fixed-window" },
  { tags: ["sliding-window"], to: "variable-window" },
  { tags: ["linked-list"], title: /reverse|swap|rotate|reorder/i, to: "ll-reversal" },
  { tags: ["linked-list"], title: /cycle|middle|palindrome|intersection|duplicate number|happy/i, to: "fast-slow" },
  { tags: ["linked-list"], title: /merge|sort/i, to: "ll-merge-sort" },
  { tags: ["linked-list"], title: /copy|random|flatten|clone/i, to: "ll-copy-design" },
  { tags: ["linked-list", "doubly-linked-list"], to: "ll-basics" },
  { tags: ["two-pointers"], title: /sort colors|partition|move zeroes|segregat|odd even|by parity/i, to: "partitioning" },
  { tags: ["two-pointers"], title: /merge|intersection/i, to: "merge-pointers" },
  { tags: ["two-pointers"], title: /sum|container|trap|pair|closest|boats|squares|palindrome/i, to: "opposite-pointers" },
  { tags: ["two-pointers"], to: "same-direction-pointers" },
  { tags: ["stack"], title: /min stack|max stack|queue using|stack using|implement|design/i, to: "stack-design" },
  { tags: ["stack"], to: "stack-parsing" },
  { tags: ["queue"], to: "queues-deques" },

  // DP by shape
  { tags: ["dynamic-programming"], title: /stock/i, to: "state-machine-dp" },
  { tags: ["dynamic-programming"], title: /palindrom/i, to: "palindrome-dp" },
  { tags: ["dynamic-programming"], title: /burst|merge stones|cut(ting)? (a|sticks)|triangulation|strange printer|remove boxes|matrix chain|guess number higher/i, to: "interval-dp" },
  { tags: ["dynamic-programming"], title: /digit|numbers with|non-negative integers without|count (special|stepping)/i, to: "digit-dp" },
  { tags: ["dynamic-programming"], title: /common subsequence|edit distance|interleav|wildcard|regular expression|distinct subsequences|delete operation|uncrossed|shortest common supersequence|scramble/i, to: "two-sequence-dp" },
  { tags: ["dynamic-programming"], all: ["matrix"], to: "grid-dp" },
  { tags: ["dynamic-programming"], title: /word break|partition|split|segment/i, to: "partition-dp" },
  { tags: ["dynamic-programming"], title: /number of (ways|music|dice|people)|count|distinct|unique paths|ways to/i, to: "counting-dp" },
  { tags: ["dynamic-programming", "memoization"], to: "linear-dp" },

  // greedy and intervals
  { tags: ["sweep-line"], title: /skyline|rectangle area/i, to: "skyline" },
  { tags: ["sweep-line"], to: "sweep-line" },
  { tags: ["array", "sorting", "greedy"], title: /merge intervals|insert interval|interval list/i, to: "merge-intervals" },
  { tags: ["array", "sorting", "greedy", "prefix-sum"], title: /meeting rooms ii|car pooling|my calendar|corporate flight|population|employee free time|minimum number of platforms/i, to: "sweep-line" },
  { tags: ["array", "sorting", "greedy"], title: /interval|overlap|arrows|meeting|video stitching|taps/i, to: "interval-scheduling" },
  { tags: ["greedy"], title: /jump game|gas station|reach/i, to: "greedy-reach" },
  { tags: ["greedy"], all: ["sorting"], to: "greedy-sorting" },
  { tags: ["greedy"], to: "greedy-proofs" },

  // bits, matrix, maths, prefix sums, hashing, strings
  { tags: ["bit-manipulation"], title: /xor|single number|missing|duplicate/i, to: "xor-tricks" },
  { tags: ["bit-manipulation"], title: /counting bits|number of 1 bits|hamming|set bits|1 bits/i, to: "bit-counting" },
  { tags: ["bitmask"], to: "bitmask-enum" },
  { tags: ["bit-manipulation"], to: "bit-basics" },
  { tags: ["matrix"], title: /spiral|rotate|diagonal|transpose|reshape|flip/i, to: "matrix-traversal" },
  { tags: ["matrix"], title: /search/i, to: "matrix-search" },
  { tags: ["matrix"], to: "matrix-in-place" },
  { tags: ["math"], title: /pow|modul|mod\b|super pow/i, to: "modular" },
  { tags: ["math"], title: /prime|gcd|divis|factor|multiple/i, to: "gcd-primes" },
  { tags: ["prefix-sum"], all: ["hash-table"], to: "prefix-hash" },
  { tags: ["prefix-sum"], to: "prefix-sums" },
  { tags: ["array"], title: /maximum (sum )?subarray|maximum product subarray|circular subarray/i, to: "kadane" },
  { tags: ["hash-table", "counting"], title: /anagram|palindrome/i, all: ["string"], to: "string-basics" },
  { tags: ["hash-table", "counting", "hash-function"], to: "counting-patterns" },
  { tags: ["math"], to: "math" },
  { tags: ["sorting"], to: "custom-sort" },
  { tags: ["string"], to: "string-basics" },
  { tags: ["array", "simulation", "enumeration", "brainteaser", "recursion", "divide-and-conquer", "interactive"], to: "arrays-hashing" },
];

export function homeOf(row: LcRow): string | null {
  const [, , title, , , tags] = row;
  if (!tags.length) return null;
  for (const r of LC_RULES) {
    if (!has(tags, r.tags) || !hasAll(tags, r.all)) continue;
    if (r.not && r.not.some((t) => tags.includes(t))) continue;
    if (r.title && !r.title.test(title)) continue;
    return r.to;
  }
  return null;
}
