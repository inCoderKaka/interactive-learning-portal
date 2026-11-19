import { Q, T, type Extra } from "./h";
import type { Topic } from "@/lib/types";

/** Second pass over DSA: variations, deeper analysis and bar-raiser angles per topic. */
export const dsaExtra: Record<string, Extra> = {
  complexity: {
    deep: `- **Master theorem, the three cases you actually use:** T(n) = 2T(n/2) + O(n) → O(n log n); T(n) = T(n/2) + O(1) → O(log n); T(n) = 2T(n/2) + O(1) → O(n). Unbalanced splits (quickselect) are solved by summing the geometric series: n + n/2 + n/4 + … = 2n.
- **Harmonic sums:** a loop of n/1 + n/2 + … + n/n steps is O(n log n). This is why a sieve and "for every multiple" loops are cheap.
- **Operation budget:** about 10⁸ simple operations per second in C++/Java, 10⁷ in Python. Turn the constraint into a number before choosing an algorithm.
- **Amortised analysis out loud:** use the accounting argument ("each element pays for one push and one pop") or the doubling argument (copies cost 1 + 2 + 4 + … + n < 2n).
- **Output-sensitive bounds:** enumerating all subsets or paths is at least the size of the output; say O(2ⁿ · n) including the copy.
- **Bar raiser:** the interviewer asks "can you do better?" Answer with a *lower bound* argument: you must read the input (Ω(n)), comparison sorting is Ω(n log n), the output itself has size k. Knowing when to stop optimising is a senior signal.
- **Hidden costs:** hashing a string key is O(L); sorting strings is O(L · n log n); slicing or concatenating in a loop is quadratic; recursion depth near 10⁵ overflows the stack in Python and often in Java.`,
  },
  "arrays-hashing": {
    pre: ["complexity"],
    deep: `- **Kadane and its family:** best subarray ending here = max(a[i], best + a[i]). Variations: maximum product (track both max and min because a negative flips them), circular (total − minimum subarray, guard the all-negative case), at most one deletion (two states).
- **Prefix ideas beyond sums:** prefix XOR (subarray XOR = K), prefix parity or mod (subarray sum divisible by K: equal remainders, normalise negative mods), prefix balance (+1 / −1 for equal 0s and 1s), prefix counts per character (26 arrays).
- **2D difference array:** add v at (r1,c1), subtract at (r1,c2+1) and (r2+1,c1), add back at (r2+1,c2+1), then 2D prefix once.
- **Cyclic sort / index as hash:** values in 1..n → place a[i] at index a[i]−1, or negate a[a[i]−1] as a visited mark. Finds missing, duplicate and first-missing-positive in O(1) extra space.
- **Boyer–Moore generalised:** elements appearing more than n/k times → keep k−1 candidates with counters, then verify in a second pass.
- **Rotate an array in place:** reverse all, reverse first k, reverse the rest. Next permutation: find the rightmost ascent, swap with the next larger from the right, reverse the suffix.
- **Hash map internals (bar raiser):** load factor and resize, chaining vs open addressing, why adversarial keys make it O(n), why a mutable object must not be a key. For floats or geometry, hash a normalised representation (reduced fraction, sorted tuple).
- **Scale follow-up:** "the array does not fit in memory" → external sort or hash-partition to disk; "it is a stream" → count-min sketch, reservoir sampling, Misra–Gries heavy hitters.`,
  },
  "two-pointers": {
    pre: ["arrays-hashing"],
    deep: `- **Count instead of enumerate:** for "pairs with sum < target" on sorted data, when a[l] + a[r] < target every index in (l, r] pairs with l, so add r − l. Same move counts triangles and 3Sum Smaller.
- **Closest variants:** 3Sum Closest keeps the best absolute difference; "two arrays, closest pair" walks one pointer up in A and one down in B.
- **Two sequences:** merge, intersection, is-subsequence, backspace compare (walk from the end), merging into the tail of an array with spare capacity (fill from the back).
- **Partition schemes:** Lomuto (one writer) vs Hoare (two ends, fewer swaps). Dutch flag is the 3-way partition that makes quicksort safe with many duplicates.
- **Trapping rain water with two pointers:** move the side with the smaller max; the water above it is fixed by that smaller max. O(1) space versus the stack or prefix-max solutions.
- **Bar raiser:** prove correctness with the *discard argument* (what set of candidate pairs is eliminated by each move, and why none of them could be optimal). Follow-ups: input unsorted and indices required (hash instead), stream input (cannot sort), 4Sum → generalise to kSum recursion with complexity O(n^(k−1)).
- **4Sum II (four arrays):** hash all pair sums of A,B then look up −(c+d): meet in the middle, O(n²).`,
  },
  "sliding-window": {
    pre: ["two-pointers", "arrays-hashing"],
    deep: `- **Fixed-size windows:** add the entering element, remove the leaving one. Anagram / permutation-in-string uses a count array plus a "matched characters" counter so each step is O(1), not O(26).
- **Exactly K = atMost(K) − atMost(K−1):** the standard reduction for "subarrays with exactly K distinct / K odd numbers / sum K in a binary array".
- **Count subarrays:** for a valid window [l, r], the number of valid subarrays ending at r is r − l + 1 (at-most conditions) or l (at-least conditions, after shrinking until invalid).
- **When the window fails:** negatives in a sum constraint break monotonicity → prefix sums with a hash map (exact) or a monotonic deque (at least K).
- **Window with an aggregate that cannot be removed:** max/min → monotonic deque; median → two heaps with lazy deletion or an ordered multiset; distinct count → hash map with counts.
- **Minimum Window Substring detail:** keep need counts and a "formed" counter; shrink while formed, record before breaking validity. Complexity O(|s| + |t|).
- **Bar raiser:** state the monotonicity explicitly: "if [l, r] is invalid, any extension to the right is also invalid, so l never moves back". Follow-ups: streaming input (cannot revisit, keep counts only), unicode alphabets (hash map, not array), return all windows rather than the best.`,
  },
  stack: {
    pre: ["arrays-hashing"],
    deep: `- **Four monotonic questions, one loop:** next greater, next smaller, previous greater, previous smaller. Popping answers "next" for the popped item; the item left under the new push answers "previous" for the pushed one.
- **Contribution technique:** for each element count the subarrays where it is the minimum: (i − prevLess) × (nextLessOrEqual − i). Use strict on one side and non-strict on the other so duplicates are not double counted. Drives Sum of Subarray Minimums and Sum of Subarray Ranges.
- **Lexicographic greedy with a stack:** Remove K Digits, Remove Duplicate Letters, Create Maximum Number: pop while the top is worse and you can still afford to drop it.
- **Circular arrays:** iterate 2n indices with i mod n (Next Greater Element II).
- **Expression parsing:** two stacks (values, operators) with precedence, or a single pass keeping the last operator; parentheses → recursion or push the running state. Reverse Polish needs one stack. Know the shunting-yard idea by name.
- **Other classics:** Min Stack (store pairs or a second stack), Asteroid Collision, Online Stock Span, 132 Pattern (scan from the right keeping the best "2"), Simplify Path, Longest Valid Parentheses (stack of indices with a −1 sentinel).
- **Bar raiser:** why O(n)? Each index is pushed once and popped once. Follow-ups: stream version (stock span), 2D extension (Maximal Rectangle = histogram per row), "support unary minus, exponent (right associative) and functions" in the calculator.`,
  },
  "mono-deque": {
    pre: ["stack", "sliding-window"],
    deep: `- **Invariant:** the deque holds *indices* of candidates in window order, values monotonic. Front = the answer for the current window. Pop the back when the newcomer dominates (newer and at least as good); pop the front when it leaves the window.
- **DP optimisation pattern:** dp[i] = a[i] + max(dp[j]) for j in [i−k, i−1] drops from O(nk) to O(n): Jump Game VI, Constrained Subsequence Sum, Max Value of Equation (deque over y − x).
- **Prefix sums + deque:** Shortest Subarray with Sum ≥ K keeps prefix values increasing; pop the front while the condition holds (it can never give a shorter answer later), pop the back while the new prefix is smaller.
- **Two deques** track max and min together for "max − min ≤ limit" windows.
- **Monotonic queue API:** push, pop, getMax all amortised O(1). The same contract can be built from two stacks that each store (value, max so far).
- **Alternatives to mention:** heap with lazy deletion is O(n log n) and simpler; an ordered multiset also works; sparse table answers static range max in O(1) after O(n log n) preprocessing.
- **Bar raiser:** extend to 2D (max of every k×k submatrix: run the deque per row, then per column), or make it a stream with a time-based window instead of count-based.`,
  },
  "binary-search": {
    pre: ["complexity", "two-pointers"],
    deep: `- **Think in predicates:** find the boundary of a monotone true/false function. Everything else (lower bound, upper bound, first bad version, sqrt, answer search) is the same loop with a different predicate.
- **Minimise vs maximise:** "smallest x such that ok(x)" uses mid = lo + (hi − lo) / 2 and hi = mid; "largest x such that ok(x)" uses the upper mid and lo = mid, otherwise the loop never terminates.
- **Answer-search checklist:** (1) what is the answer range, (2) why is feasibility monotone, (3) a greedy O(n) check. Classics: Koko, ship capacity, split array, aggressive cows / magnetic force (maximise the minimum), k-th smallest pair distance, k-th in a multiplication table or sorted matrix (count ≤ mid).
- **Rotated arrays with duplicates:** when a[lo] == a[mid] == a[hi] you cannot decide, shrink both ends; worst case becomes O(n). Find Minimum compares mid against hi, not lo.
- **Unknown size:** gallop (double the bound) then binary search: O(log position).
- **Median of two sorted arrays:** binary search the partition of the shorter array so that left parts hold half the elements and maxLeft ≤ minRight: O(log min(m, n)).
- **Real-valued search:** loop a fixed 60–100 iterations rather than comparing with an epsilon. Unimodal functions → ternary search or binary search on the sign of the slope.
- **Bar raiser:** prove termination (the interval strictly shrinks) and state the loop invariant ("answer is always in [lo, hi]"). Follow-ups: what if ok() is expensive or noisy, what if the data is on disk (B-tree / fractional cascading), interpolation search and why it is O(log log n) only on uniform data.`,
  },
  "linked-list": {
    pre: ["two-pointers"],
    deep: `- **Floyd proof sketch:** when slow has gone k steps and they meet, fast has gone 2k, so k is a multiple of the cycle length. Resetting one pointer to the head and stepping both by one, they meet at the cycle entry.
- **Reversal variants:** whole list (iterative and recursive), between positions m..n, in k-groups, alternate k-groups. Always name the four pointers: node before the segment, segment head, current, next.
- **Palindrome list in O(1) space:** find the middle, reverse the second half, compare, then restore the list (mention restoring: mutating inputs is a design question).
- **Reorder List = middle + reverse + interleave.** Many "hard" list problems are compositions of the same three primitives.
- **Intersection of two lists:** switch heads when a pointer reaches the end; both travel a + b + c.
- **Merge k lists:** heap O(N log k) or pairwise divide and conquer O(N log k) with O(1) extra space; sequential merging is O(Nk).
- **Sort List:** top-down merge sort uses O(log n) stack; bottom-up merge sort achieves O(1) space.
- **Other structures:** doubly linked list with sentinel head and tail (LRU), skip list (expected O(log n), how Redis sorted sets work), flatten a multilevel list, add two numbers stored most-significant-first (stacks or reverse).
- **Bar raiser:** ownership and memory (who frees removed nodes in C++), concurrent modification, why arrays usually beat lists in practice (cache locality), and null-safety on lists of length 0, 1 and 2.`,
  },
  trees: {
    pre: ["stack", "linked-list"],
    deep: `- **Return one thing, update another:** diameter, max path sum, longest univalue path: the recursion returns the best *downward chain* while a global records the best path *through* the node.
- **Iterative traversals:** in-order with an explicit stack (push lefts, pop, go right); post-order with a "last visited" pointer or reversed modified pre-order. **Morris traversal** gives O(1) space by threading predecessor links.
- **Construction:** preorder + inorder or postorder + inorder with a hash map of inorder positions → O(n). Preorder + postorder is ambiguous unless the tree is full.
- **LCA family:** recursive post-order; with parent pointers treat as list intersection; many queries → binary lifting (O(log n) per query after O(n log n)) or Euler tour + RMQ; LCA of deepest leaves; LCA when nodes may be missing (must verify both exist).
- **Views and orders:** right-side view (BFS last of level or DFS right-first), vertical order (column index + BFS, tie rules), boundary, zigzag.
- **Flattening a tree:** Euler tour (tin/tout) turns a subtree into a contiguous range, so subtree queries become range queries on a Fenwick or segment tree.
- **Tree DP and rerooting:** compute an answer for the root, then move the root across an edge in O(1) (sum of distances). Binary Tree Cameras is greedy on post-order states.
- **Bar raiser:** recursion depth on a skewed tree of 10⁵ nodes (convert to iterative), N-ary generalisation, serialisation format trade-offs (preorder with null markers vs level order vs parenthesised), and comparing subtrees by hashing (Merkle style) in O(n) total.`,
  },
  bst: {
    pre: ["trees", "binary-search"],
    deep: `- **Validate with bounds, not neighbours:** pass (low, high) down, or check that in-order is strictly increasing. Use 64-bit bounds or nulls to survive INT_MIN / INT_MAX values.
- **Order statistics:** augment each node with subtree size → k-th smallest and rank in O(h), even under inserts. This is the standard follow-up to Kth Smallest.
- **Balanced trees, conceptually:** AVL (strict balance, faster lookups) vs red-black (fewer rotations, used by TreeMap and std::map) vs B-tree (wide nodes for disks) vs skip list (probabilistic, easy to make concurrent). You will not code rotations, but you should explain why balance gives O(log n).
- **Recover BST (two swapped nodes):** in-order scan, record the first and last inversion, swap values; Morris gives O(1) space.
- **Build and convert:** sorted array → height-balanced BST by picking the middle; sorted list → BST in O(n) by simulating in-order; BST → sorted doubly linked list; BST from preorder with an upper bound in O(n).
- **Range operations:** range sum, trim, split and merge use the ordering to prune whole subtrees.
- **Counting:** the number of BST shapes with n keys is the Catalan number.
- **Bar raiser:** closest value, floor and ceiling, two-sum on a BST with two iterators (forward and reverse) in O(h) space, and "what if there are duplicates?" (count field, or a consistent left/right rule).`,
  },
  tries: {
    pre: ["trees", "arrays-hashing"],
    deep: `- **Node layout trade-off:** array[26] (fast, memory hungry) vs hash map children (sparse or unicode alphabets) vs sorted vector. Store "end of word" and often a pass-through count for prefix counting and safe deletion.
- **Compressed tries:** a radix (Patricia) tree merges single-child chains; a ternary search tree stores one character per node with three links; a DAWG / FST shares suffixes too (how Lucene stores terms).
- **Word Search II pruning:** walk the board and the trie together, remove a word once found, and prune leaf nodes that have no remaining words so dead prefixes stop being explored.
- **Autocomplete:** caching the top-k completions at each node gives O(L) queries at the cost of slower updates; the alternative is a DFS with a heap. This is exactly the typeahead system design in miniature.
- **Binary trie (XOR):** insert numbers bit by bit from the most significant; to maximise XOR greedily take the opposite bit. With counts it supports deletion and "max XOR with an element ≤ limit" (offline, sorted queries).
- **Multi-pattern matching:** Aho–Corasick = trie + failure links (KMP generalised): find all dictionary words in a text in O(text + matches). Stream of Characters can instead use a trie of reversed words.
- **Other uses:** longest prefix match for IP routing, Replace Words, Word Break speed-up, Palindrome Pairs, Concatenated Words.
- **Bar raiser:** memory estimate (nodes × pointers), a hash set of all prefixes as the simple alternative, concurrency (read-mostly → copy-on-write), and deletion that prunes empty branches.`,
  },
  heap: {
    pre: ["trees"],
    deep: `- **Index arithmetic (0-based):** parent (i−1)/2, children 2i+1 and 2i+2. Sift-up for insert, sift-down for pop. Heapify bottom-up is O(n) because most nodes are near the leaves and sink a short distance.
- **Top-k decision table:** k-th largest → min-heap of size k, O(n log k), works on streams; one-off on an array → quickselect, average O(n); bounded integer keys → bucket / counting, O(n).
- **K-way merge and its disguises:** merge k lists, smallest range covering k lists, k pairs with smallest sums, k-th smallest in a sorted matrix, ugly numbers. Push (value, source, index) and advance only the popped source.
- **Greedy with a heap ("regret"):** IPO, Course Schedule III (take the course, drop the longest if over the deadline), Minimum Refuelling Stops, Reorganize String, Furthest Building. The heap lets you undo the worst earlier choice.
- **Two heaps:** running median; sliding-window median needs lazy deletion with balance counters, or an ordered multiset.
- **Missing operations:** binary heaps have no decrease-key or arbitrary delete. Use lazy deletion (skip stale entries on pop), an indexed heap, or a balanced BST.
- **Scheduling:** meeting rooms (min-heap of end times), CPU task scheduler (heap of remaining counts plus a cooldown queue), single-threaded CPU.
- **Bar raiser:** stability and tie-breaking in comparators, heap of size k versus sorting everything, "top-k over a distributed stream" (per-node heaps then merge; approximate with count-min sketch), d-ary heaps and why Dijkstra on dense graphs prefers them.`,
  },
  backtracking: {
    pre: ["trees"],
    deep: `- **Know the counts:** subsets 2ⁿ, permutations n!, combinations C(n, k), balanced parentheses Catalan(n) ≈ 4ⁿ / n^1.5, partitions of a string 2^(n−1). Multiply by the cost of copying each result.
- **Duplicates:** sort, then at each depth skip a value equal to the previous one *if the previous one was not chosen at this depth* (i > start and a[i] == a[i−1]). For permutations with duplicates use a "used" array with the same rule, or count multiplicities.
- **Constraint propagation:** N-Queens with three boolean arrays or bitmasks (columns, both diagonals); Sudoku with row/col/box masks and choosing the most constrained cell first (MRV heuristic).
- **Partition into k equal subsets:** sort descending, fill buckets, skip buckets with the same current sum, stop when an empty bucket fails. Or bitmask DP over used elements in O(2ⁿ · n).
- **Memoise when states repeat:** Word Break II, Target Sum, Palindrome Partitioning (precompute the palindrome table). The line between backtracking and DP is whether subproblems overlap.
- **Meet in the middle:** n ≈ 40 → split into halves of 2²⁰, combine with sorting or hashing.
- **Search shaping:** iterative deepening when the depth is unknown, branch and bound when an optimistic estimate can cut a branch, bidirectional search for puzzles.
- **Bar raiser:** generate lazily (iterator / k-th permutation via factorial number system, next-permutation), restore state exactly on the way back (the classic bug), and estimate the real pruned complexity rather than quoting the worst case.`,
  },
  "graph-traversal": {
    pre: ["trees", "backtracking"],
    deep: `- **Representation choice:** adjacency list (sparse, default), matrix (dense or O(1) edge checks), edge list (Kruskal, Bellman–Ford), implicit graph (grid cells, word neighbours, puzzle states generated on the fly).
- **Mark visited on enqueue, not on dequeue,** otherwise the same node is queued many times and BFS degrades.
- **Colours for directed cycle detection:** white (unseen), grey (on the current path), black (finished). A grey → grey edge is a back edge, hence a cycle. Undirected graphs only need "visited and not the parent".
- **State-space BFS:** the node is (position, extra state): keys held (bitmask), walls broken, steps mod k, direction. Complexity = states × transitions; say the state count out loud.
- **Multi-source BFS** starts with all sources at distance 0 (rotting oranges, 01 matrix, walls and gates, nearest exit). "Distance to the nearest X for every cell" is always this.
- **Bidirectional BFS** cuts b^d to roughly 2·b^(d/2); expand the smaller frontier.
- **Grid islands variants:** count, max area, perimeter, closed islands (flood from the border first), distinct shapes (canonical path signature), surrounded regions.
- **Flood fill at scale:** recursion depth on a 1000×1000 grid overflows; use an explicit stack or BFS, or union-find for online updates.
- **Bar raiser:** huge implicit graphs (generate neighbours lazily, wildcard buckets for Word Ladder), reconstructing all shortest paths (BFS layers + DFS on parent DAG), disconnected graphs (loop over all nodes), and graphs with self-loops or parallel edges.`,
  },
  "topo-sort": {
    pre: ["graph-traversal"],
    deep: `- **Cycle check for free:** in Kahn's algorithm, if fewer than V nodes are output there is a cycle. The nodes left over are exactly those on or downstream of a cycle.
- **Unique order?** The order is unique iff the queue never holds more than one node (equivalently, the DAG has a Hamiltonian path). This is Sequence Reconstruction.
- **Lexicographically smallest order:** replace the queue with a min-heap: O((V + E) log V).
- **Levels = parallel rounds:** processing the queue layer by layer gives the minimum number of semesters / build stages with unlimited parallelism. With at most k per round it becomes NP-hard in general (bitmask DP for small n).
- **Longest path in a DAG** = DP in topological order; this is the critical path of a project and the time to finish all courses.
- **Counting paths / DP on DAGs:** any DP is a topological order over its states; memoised DFS is the DFS-based topological sort in disguise.
- **Find Eventual Safe States:** reverse the graph and run Kahn, or colour DFS.
- **All orders** requires backtracking and is exponential.
- **Bar raiser:** build systems and package managers (incremental rebuild = downstream closure of a changed node), detecting and *reporting* the cycle, online topological order as edges arrive, and SCC condensation when cycles are allowed to exist.`,
  },
  "union-find": {
    pre: ["graph-traversal"],
    deep: `- **Complexity:** path compression + union by size/rank gives O(α(n)) amortised per operation, effectively constant. Either one alone gives O(log n).
- **What DSU cannot do:** delete edges. Work offline in reverse (add edges backwards: bricks falling, removing stones) or use rollback DSU (union by rank, no compression, a stack of changes).
- **Offline queries by threshold:** sort edges and queries by weight, add edges up to each query's limit, then answer connectivity (edge-length-limited paths, swim in rising water, path with minimum effort).
- **Weighted / parity DSU:** store the relation to the parent (a ratio for Evaluate Division, a parity for bipartite or "enemy" constraints) and compose it during find.
- **Component metadata on the root:** size, min/max, edge count (a component is a tree iff edges = nodes − 1), sum. Count components by decrementing on each successful union.
- **Mapping tricks:** 2D cell → r × cols + c; strings/emails → ids via a hash map; a virtual node for "connected to the border"; offset indices for rows versus columns.
- **Kruskal** = sort edges + DSU. Redundant Connection II (directed) combines "node with two parents" with cycle detection.
- **Bar raiser:** DSU versus BFS (dynamic edge additions versus one-shot), connectivity under concurrent updates, "largest component after each query", and proving the inverse-Ackermann bound is not expected but naming it is.`,
  },
  "shortest-paths": {
    pre: ["graph-traversal", "heap"],
    deep: `- **Algorithm choice table:**

| Situation | Algorithm | Cost |
|---|---|---|
| Unweighted | BFS | O(V + E) |
| Weights 0/1 | 0-1 BFS (deque) | O(V + E) |
| Non-negative weights | Dijkstra (binary heap) | O((V + E) log V) |
| Negative edges, or at most K edges | Bellman–Ford | O(V · E) |
| DAG | Relax in topological order | O(V + E) |
| All pairs, V ≤ 400 | Floyd–Warshall | O(V³) |
| Small integer weights | Dial's buckets | O(V·W + E) |

- **Why Dijkstra fails with negative edges:** a node is finalised when popped; a later negative edge could have improved it. Bellman–Ford relaxes every edge V−1 times; an improvement in round V proves a negative cycle. SPFA is the queue-based variant.
- **Floyd–Warshall order:** the intermediate node k is the *outer* loop. It also yields transitive closure and detects negative cycles (dist[i][i] < 0).
- **K stops:** Bellman–Ford with K+1 rounds using a copy of the previous round, or Dijkstra over (node, stops) states.
- **Generalised Dijkstra:** any monotone path cost works: minimise the maximum edge (minimum effort, swim in water), maximise the product of probabilities, widest path.
- **Counting and second-best:** count shortest paths by accumulating on equal distance; second shortest path keeps two best distances per node; K shortest → allow each node to be popped up to K times.
- **A\\*:** Dijkstra ordered by g + h with an admissible, consistent heuristic (Manhattan on grids). Bidirectional Dijkstra and contraction hierarchies are what map routing really uses.
- **Bar raiser:** dense graph → O(V²) array Dijkstra beats the heap; edge weights change over time; path reconstruction via parent pointers; "minimum cost with a discount coupon" → layered graph (state = coupons used).`,
  },
  "advanced-graphs": {
    pre: ["union-find", "shortest-paths", "topo-sort"],
    deep: `- **MST facts:** Kruskal O(E log E) with DSU, Prim O(E log V) with a heap or O(V²) on dense / complete graphs (Min Cost to Connect All Points). *Cut property:* the lightest edge crossing any cut is in some MST. *Cycle property:* the heaviest edge on a cycle is in no MST (if unique). The MST also minimises the maximum edge on every path (minimax path).
- **Critical vs pseudo-critical MST edges:** force-exclude an edge (weight goes up → critical) or force-include it (weight unchanged → pseudo-critical).
- **Tarjan low-link:** low[u] = the smallest discovery time reachable from u's subtree using at most one back edge. Edge (u, v) is a bridge iff low[v] > disc[u]; u is an articulation point iff low[v] ≥ disc[u] for some child (the root needs two children).
- **SCC:** Tarjan (one DFS with a stack) or Kosaraju (DFS finish order, then DFS on the reversed graph). Condensing SCCs gives a DAG; 2-SAT is solved by checking that x and ¬x are in different SCCs.
- **Eulerian paths:** undirected → 0 or 2 odd-degree vertices and connected; directed → in = out everywhere, or exactly one start (out − in = 1) and one end. Hierholzer: DFS consuming edges, append on backtrack, reverse.
- **Bipartite matching and flow (name-level):** Hungarian / Hopcroft–Karp for assignment, max-flow = min-cut (Dinic, Edmonds–Karp O(V·E²)). Recognise the modelling: "assign workers to jobs", "maximum number of disjoint paths", "minimum cut to separate".
- **Other names worth knowing:** functional graphs (each node has one outgoing edge: cycles with trees hanging in), binary lifting for k-th ancestor, travelling salesman by bitmask DP O(2ⁿ · n²), graph colouring is NP-hard beyond 2 colours.
- **Bar raiser:** a network-reliability framing ("which single link failure disconnects the data centre?" = bridges), and choosing between Kruskal and Prim from density.`,
  },
  "dp-1d": {
    pre: ["backtracking", "complexity"],
    deep: `- **Derive, do not recall:** write the brute-force recursion, identify the parameters that change (the state), memoise, then flip to bottom-up and compress space. Narrating this path is the signal.
- **LIS in O(n log n):** tails[k] = smallest tail of an increasing subsequence of length k+1; binary search each element. Reconstruct with parent indices. Disguises: Russian doll envelopes (sort by width asc, height desc), longest chain, minimum deletions to sort, number of LIS (count array or Fenwick).
- **State machines:** stock problems are states {holding, not holding, cooldown} × transactions; House Robber is {took previous, did not}; Paint House carries the last colour.
- **Kadane as DP:** dp[i] = best subarray ending at i. Variants: product, circular, one deletion, k concatenations.
- **Jump / partition DPs:** Word Break dp[i] = any dp[j] and s[j..i) in the dictionary (bound j by the max word length); Decode Ways; Perfect Squares; Minimum Cost for Tickets; Partition Array for Maximum Sum.
- **Weighted interval scheduling:** sort by end, dp[i] = max(skip, profit + dp[last job ending ≤ start]) with binary search.
- **Counting DPs:** watch the modulus and whether order matters.
- **Linear recurrences at scale:** Fibonacci-like recurrences with n up to 10¹⁸ → matrix exponentiation in O(k³ log n).
- **Bar raiser:** reconstruct the actual solution (parent pointers or backward walk), print the lexicographically smallest one, handle the input as a stream (only O(1) previous states kept), and argue why greedy fails with a counterexample.`,
  },
  "dp-2d": {
    pre: ["dp-1d"],
    deep: `- **Prefix × prefix template:** dp[i][j] describes s[0..i) and t[0..j). The off-by-one (i characters, not index i) is the usual bug; an extra row and column for the empty prefix removes special cases.
- **LCS family:** shortest common supersequence = m + n − LCS; minimum deletions to make equal = m + n − 2·LCS; longest palindromic subsequence = LCS(s, reverse(s)); minimum insertions to a palindrome = n − LPS.
- **Subsequence vs substring:** longest common *substring* resets to 0 on mismatch and the answer is the max cell, not the corner.
- **Edit distance details:** insert, delete, replace map to left, up, diagonal. Reconstruct by walking back from the corner. Space O(min(m, n)) with two rows; Hirschberg recovers the alignment in linear space. If the allowed distance k is small, compute only a band: O(k · n).
- **Regex vs wildcard:** in regex, '*' applies to the preceding element (zero copies: dp[i][j−2]; one more: match and dp[i−1][j]); in wildcard, '*' matches any sequence (dp[i−1][j] or dp[i][j−1]).
- **Grid DP:** unique paths (also C(m+n−2, m−1)), minimum path sum, obstacles, Dungeon Game (solve backwards), Cherry Pickup (two walkers at once: state (step, r1, r2)).
- **Square / rectangle DPs:** Maximal Square dp = 1 + min(up, left, diagonal); count square submatrices is the sum of the same table.
- **Bar raiser:** diff tools use Myers' O(ND) algorithm; large inputs need the banded or bit-parallel variants; explain which cells a cell depends on before compressing to one row (and when you must keep the diagonal in a temp).`,
  },
  "dp-knapsack": {
    pre: ["dp-1d"],
    deep: `- **Loop-order rule:** 0/1 knapsack iterates capacity *downwards* (each item used once); unbounded iterates *upwards* (reuse allowed). Getting this wrong silently changes the problem.
- **Combinations vs permutations:** items in the outer loop counts combinations (Coin Change II); amount in the outer loop counts ordered sequences (Combination Sum IV).
- **Recognising a hidden knapsack:** partition into two equal halves (target = sum/2), Target Sum (subset with sum (total + target)/2), Last Stone Weight II (minimise the difference of two piles), "can you pick items to hit exactly X".
- **Bounded multiplicities:** binary splitting (1, 2, 4, …) turns count c into log c items; a monotonic deque gives O(n · W).
- **Bitset speed-up:** reachable-sums as bits: bits |= bits << w, a 64× constant-factor win for subset sum.
- **Two capacities:** Ones and Zeroes, Profitable Schemes: just one more dimension. **Exactly k items:** add a count dimension.
- **Pseudo-polynomial:** O(n · W) is exponential in the *bits* of W. If W is huge but values are small, flip the DP: min weight to achieve value v. If n ≤ 40, meet in the middle.
- **Reconstruction:** keep a "took" table or walk back while dp[w] ≠ dp[w − weight].
- **Bar raiser:** fractional knapsack is greedy by ratio (and why 0/1 is not), fewest coins with canonical vs arbitrary coin systems (greedy counterexample: coins {1, 3, 4}, amount 6), and unreachable-state initialisation (−∞ / +∞, not 0).`,
  },
  "dp-advanced": {
    pre: ["dp-2d", "dp-knapsack", "bits", "trees"],
    deep: `- **Interval DP:** dp[l][r] by increasing length, choose the split point or the *last* operation (Burst Balloons: the last balloon popped in (l, r)). Matrix chain, palindrome partitioning II, strange printer, remove boxes (needs an extra count dimension), stone merging. O(n³) typically.
- **Bitmask DP:** dp[mask] or dp[mask][last]; TSP O(2ⁿ · n²); assignment dp[mask] where popcount(mask) is the index of the next person; iterate submasks with sub = (sub − 1) & mask for O(3ⁿ) total. Broken-profile DP for tiling.
- **Tree DP:** return a small tuple per node (rob / skip; covered / has camera / needs cover); rerooting for "answer for every root"; knapsack on trees merges children in O(n²) total.
- **Digit DP:** state (position, tight, started, extra) counts numbers ≤ N with a digit property; answer for [L, R] = f(R) − f(L − 1).
- **Game DP:** store the *score difference* the player to move can force: dp[i] = max over moves of (gain − dp[next]). Nim and Sprague–Grundy for impartial games (XOR of Grundy numbers).
- **Expectation / probability:** linearity of expectation; solve from the terminal state backwards (Knight Probability, New 21 Game with a sliding window sum, Soup Servings).
- **Optimisations to name:** prefix-sum or monotonic-deque transitions, binary search on monotone DP (egg drop: floors coverable with m moves and k eggs), divide and conquer optimisation, Knuth optimisation, convex hull trick for dp[i] = min(dp[j] + a[j]·b[i]).
- **Counting with DP + combinatorics:** Catalan structures, stars and bars, inclusion–exclusion.
- **Bar raiser:** justify the state is *sufficient* (the future depends on the past only through it) and *minimal*; estimate states × transitions before coding; switch between top-down (sparse reachable states) and bottom-up (tight loops, space compression).`,
  },
  greedy: {
    pre: ["heap", "sorting"],
    deep: `- **Prove or disprove fast:** try 2–3 adversarial cases before committing. If you believe it, name the proof shape: *exchange argument* (swapping any optimal solution toward yours never hurts) or *stays ahead* (after every step your partial solution is at least as good).
- **Sort-key catalogue:** intervals by end (max non-overlapping, arrows for balloons); deadlines ascending (scheduling, Course Schedule III); ratio (fractional knapsack); custom comparator a+b vs b+a (Largest Number); difference of costs (Two City Scheduling); height desc then k asc (Queue Reconstruction).
- **Reachability greedy:** Jump Game tracks the farthest reach; Jump Game II is implicit BFS over ranges; Gas Station restarts after the failure point and uses total ≥ 0 for existence.
- **Regret greedy with a heap:** take optimistically and undo the worst choice when a constraint breaks (refuelling stops, Course Schedule III, IPO, furthest building).
- **Two-pass greedy:** Candy (left-to-right then right-to-left), product except self, trapping water.
- **Lexicographic greedy with a stack:** Remove K Digits, Remove Duplicate Letters, smallest subsequence.
- **Classics to know by name:** Huffman coding (merge the two smallest: connect ropes / sticks), activity selection, minimum platforms, Boats to Save People (pair lightest with heaviest), Partition Labels (last occurrence), Task Scheduler formula, Wiggle subsequence.
- **Bar raiser:** matroid intuition (why MST greedy works), when greedy gives only an approximation (set cover ln n, bin packing), and switching to DP the moment a counterexample appears. Saying "greedy fails here because…" is as strong a signal as a proof.`,
  },
  intervals: {
    pre: ["greedy", "sorting"],
    deep: `- **Closed vs half-open:** decide whether [1, 2] and [2, 3] overlap before coding. With events, half-open intervals mean processing ends before starts at equal times.
- **Insert interval without re-sorting:** copy those ending before, merge the overlapping ones, copy the rest: O(n). On a sorted structure, binary search the affected range.
- **Sweep line / difference map:** +1 at start, −1 at end, sort, prefix sum → maximum overlap (meeting rooms, car pooling, My Calendar III). With bounded coordinates use a difference array.
- **Heap formulation:** sort by start, min-heap of end times; the heap size is the number of rooms in use. Use it when you need *which* room, not just the count.
- **Intersections of two sorted lists:** two pointers; advance the one that ends first.
- **Minimum cover problems:** Video Stitching / minimum taps / Jump Game II are the same greedy: among intervals starting within the current reach, extend the furthest.
- **Point and range stabbing queries:** static → sort + binary search or prefix sums; dynamic → interval tree (BST keyed by start, augmented with max end) or segment tree with coordinate compression; ordered map of disjoint intervals for Range Module (find neighbours with lower/upper bound, merge or split).
- **Skyline:** events (x, height) with a max-heap or multiset of active heights; emit a point when the max changes. Alternative: divide and conquer merge like merge sort.
- **Bar raiser:** calendar design follow-ups (recurring meetings, time zones, find a common free slot for k people = merge all busy lists then scan gaps), streaming intervals (Data Stream as Disjoint Intervals), and weighted interval scheduling → DP.`,
  },
  bits: {
    pre: ["complexity"],
    deep: `- **Identity sheet:** x & (x − 1) clears the lowest set bit; x & −x isolates it; x & (x − 1) == 0 tests power of two (x > 0); x ^ x = 0 and XOR is its own inverse; (x >> k) & 1 reads bit k; x | (1 << k) sets; x & ~(1 << k) clears; x ^ (1 << k) toggles.
- **Counting bits:** Kernighan loop runs once per set bit; dp[i] = dp[i >> 1] + (i & 1) or dp[i & (i − 1)] + 1 gives all counts in O(n).
- **Per-bit decomposition:** for sums over pairs (total Hamming distance, sum of XOR of all pairs) count ones and zeros at each bit independently: ones × zeros × 2^bit.
- **Single Number II:** count each bit mod 3, or the two-variable (ones, twos) state machine.
- **Subarray OR / AND / GCD:** for a fixed right end there are only O(log max) distinct values, so "distinct ORs of all subarrays" is O(n log max).
- **XOR tricks:** prefix XOR for range XOR; missing number = XOR of indices and values; maximum XOR pair via binary trie; swap without a temp; Gray code i ^ (i >> 1); XOR basis (linear algebra over GF(2)) for max subset XOR.
- **Masks as sets:** union |, intersection &, difference a & ~b, membership (m >> i) & 1, iterate submasks, popcount for size. Enables bitmask DP and compact visited states in BFS.
- **Language traps:** signed right shift is arithmetic (Java >>> for logical); Python integers are unbounded so mask with 0xFFFFFFFF when emulating 32-bit; shifting by ≥ width is undefined in C++; 1 << 31 overflows int, use 1LL.
- **Bar raiser:** bitmaps and Bloom filters in systems, packing flags into one word, bit-parallel algorithms (bitset DP), and reversing bits / counting bits for a stream of calls using a 256-entry lookup table.`,
  },
  math: {
    pre: ["complexity"],
    deep: `- **Number theory kit:** gcd by Euclid in O(log min); lcm = a / gcd × b (divide first to avoid overflow); extended Euclid for modular inverses and linear Diophantine equations; sieve of Eratosthenes O(n log log n); trial division to √n; smallest-prime-factor sieve for fast factorisation of many numbers.
- **Modular arithmetic:** reduce after every multiply; subtraction needs (a − b + M) % M; division means multiplying by the inverse, a^(M−2) mod M for prime M (Fermat). Precompute factorials and inverse factorials for nCr mod p.
- **Fast exponentiation:** square-and-multiply in O(log n); negative exponents (and the INT_MIN trap); the same idea powers matrices for linear recurrences.
- **Randomness:** reservoir sampling (keep item i with probability k / i), Fisher–Yates shuffle (swap i with a uniform j in [i, n)), rejection sampling (Rand7 → Rand10, random point in a circle), weighted pick via prefix sums + binary search or the alias method for O(1).
- **Combinatorics:** stars and bars C(n + k − 1, k − 1), Catalan numbers, inclusion–exclusion, pigeonhole, derangements, Pascal's triangle when no modulus inverse is available.
- **Geometry basics:** cross product for orientation and area, avoid floating slopes (use reduced dy/dx pairs with gcd), convex hull (monotone chain O(n log n)), Manhattan-distance median trick (best meeting point), rectangle overlap by interval overlap on each axis.
- **Numeric care:** overflow before the modulus, integer sqrt by binary search or Newton, float comparison with epsilon, and big integers as digit arrays (multiply strings, add binary).
- **Useful facts:** sum 1..n, sum of squares, arithmetic/geometric series, number of trailing zeros in n! = Σ n / 5^i, digital root, base conversion (Excel columns are bijective base 26), Josephus recurrence J(n) = (J(n−1) + k) mod n.
- **Bar raiser:** prove uniformity of a sampler, expected number of trials in rejection sampling, Miller–Rabin for big primality (name only), and probability puzzles framed as expected value with linearity.`,
  },
  strings: {
    pre: ["arrays-hashing", "tries"],
    deep: `- **KMP failure function:** lps[i] = length of the longest proper prefix of p[0..i] that is also a suffix. Uses beyond search: smallest period n − lps[n−1] (repeated substring pattern), shortest palindrome (lps of s + '#' + reverse(s)), counting prefix occurrences.
- **Z-function:** z[i] = longest common prefix of s and s[i..]. Search with p + '$' + t. Often easier to explain than KMP.
- **Rolling hash:** polynomial hash mod a large prime, O(1) substring hashes from prefix hashes. Collisions: use two moduli or verify on match. Pair with binary search on length (longest duplicate substring, longest common substring).
- **Palindromes:** expand around centres O(n²); Manacher O(n); palindromic subsequence is DP; "can it become a palindrome" is a parity count; palindrome pairs via hash map of reversed words.
- **Suffix structures (name and use):** suffix array + LCP array (longest repeated substring, number of distinct substrings = n(n+1)/2 − ΣLCP), suffix automaton, suffix tree. Aho–Corasick for many patterns.
- **Canonical forms:** anagram key (sorted or 26 counts), isomorphic mapping (first-occurrence indices), rotation check (t in s + s), minimal rotation (Booth).
- **Parsing drills:** atoi (whitespace, sign, overflow clamp), valid number (state machine), compare versions, decode/encode with length prefixes, text justification, zigzag, integer ↔ roman / English words.
- **Encoding awareness:** ASCII vs Unicode code points vs UTF-8 bytes; immutable strings make repeated concatenation O(n²) (use a builder); case folding and normalisation are locale-sensitive.
- **Bar raiser:** streaming search over a text too large for memory (KMP needs only the pattern state), fuzzy matching (edit distance, BK-tree, n-gram index), and a diff/“did you mean” framing that connects to trie and DP topics.`,
  },
  "range-queries": {
    pre: ["arrays-hashing", "bst"],
    deep: `- **Pick by update pattern:**

| Need | Structure | Query / update |
|---|---|---|
| Static sum | prefix array | O(1) / none |
| Static min/max/gcd | sparse table | O(1) / none |
| Point update, range sum | Fenwick (BIT) | O(log n) |
| Range update, point query | Fenwick on a difference array | O(log n) |
| Arbitrary monoid, range update | segment tree + lazy | O(log n) |
| Offline, hard to merge | Mo's algorithm / sqrt decomposition | O((n + q)√n) |

- **Fenwick mechanics:** 1-indexed; update i += i & −i, query i −= i & −i. Range update + range sum uses two BITs. Find the k-th element by binary lifting over the tree in O(log n).
- **Segment tree as a design exercise:** what is stored in a node, how two children merge (must be associative), what the identity is. Max subarray sum in a range stores (sum, best prefix, best suffix, best).
- **Lazy propagation:** a pending tag that applies to a whole node; push it down before descending. Tags must compose (add then assign is not the same as assign then add).
- **Order-statistics via BIT:** coordinate-compress values and count how many smaller values were seen: Count of Smaller Numbers After Self, inversions, Reverse Pairs, Count of Range Sum.
- **Sparse table:** overlapping ranges are fine for idempotent functions (min, max, gcd): query = combine two blocks of length 2^k.
- **Offline tricks:** sort queries by right endpoint and sweep with a BIT (distinct count in a range); CDQ divide and conquer; persistent segment tree for k-th smallest in a range.
- **2D:** 2D prefix sums (inclusion–exclusion), 2D BIT O(log² n).
- **Bar raiser:** dynamic / sparse segment trees for coordinates up to 10⁹ (allocate nodes on demand), an ordered map of intervals as the simple alternative (Range Module, Falling Squares), and choosing the cheapest structure that satisfies the operations rather than the fanciest.`,
  },
  "design-ds": {
    pre: ["heap", "linked-list", "arrays-hashing"],
    deep: `- **Start from the operation table:** list every operation with its required complexity, then pick structures whose strengths cover it. Most answers are "hash map for identity + ordered structure for order".
- **LRU:** hash map → doubly linked list node; sentinels remove null checks; get = move to front. **LFU:** key → node, freq → list of keys, plus minFreq; ties broken by recency. Both O(1).
- **Randomised set:** array + map of value → index; delete by swapping with the last element. With duplicates, the map holds a set of indices.
- **Min/max stacks and queues:** pair stacks; a queue from two stacks (amortised O(1)); max queue from a monotonic deque.
- **Ordered designs:** leaderboard / stock price (hash map + ordered multiset or heap with lazy deletion), Time-based KV (per-key sorted list + binary search), Snapshot Array (per-index version list), My Calendar (ordered map).
- **Iterators:** flatten nested list (stack of iterators, keep hasNext idempotent), peeking iterator, zigzag / k-way round-robin, BST iterator, RLE iterator.
- **Classic system-flavoured ones:** hit counter (circular buffer of buckets), rate limiter (sliding window log / token bucket), consistent hashing ring (sorted map + virtual nodes), autocomplete (trie + top-k), in-memory file system (trie of path segments), text editor (two stacks or a gap buffer; rope for huge texts), browser history, Twitter feed (per-user lists + k-way merge), skiplist, circular queue / deque, bitmap and Bloom filter, LRU with TTL.
- **Hash map from scratch:** bucket array, hash + compress, chaining or open addressing (linear probing, tombstones), load factor and resize.
- **Bar raiser:** thread safety (single lock → striped locks → lock-free reads), capacity and memory per entry, persistence and recovery, iterator invalidation, API ergonomics and errors (what does get on a missing key return?), and testing invariants after every operation.`,
  },
  matrix: {
    pre: ["arrays-hashing", "binary-search"],
    deep: `- **Index transforms:** transpose (r, c) → (c, r); rotate clockwise = transpose + reverse each row; anticlockwise = transpose + reverse columns; 180° = reverse rows and columns. Layer-by-layer four-way swap is the alternative.
- **Diagonals:** cells with equal r − c share a main diagonal; equal r + c share an anti-diagonal. Diagonal traverse alternates direction by parity of r + c.
- **Flattening:** id = r × cols + c, r = id / cols, c = id % cols: binary search a fully sorted matrix as one array in O(log(mn)); also the key for union-find and visited sets.
- **Staircase search** from the top-right in a row- and column-sorted matrix eliminates a row or a column per step: O(m + n).
- **In-place state encoding:** Game of Life uses extra bits (or values 2 and 3) for "was alive / will be alive"; Set Matrix Zeroes uses the first row and column as markers plus one flag.
- **Prefix sums in 2D:** submatrix sums in O(1); number of submatrices that sum to target = fix a pair of rows, reduce to 1D subarray-sum-equals-K: O(R² · C). Max sum rectangle = same reduction with Kadane.
- **Rectangles of ones:** maximal rectangle via histogram stack; maximal square via DP; count submatrices with all ones.
- **Spiral and friends:** four boundaries shrinking, or a direction vector with turn-on-block; Spiral Matrix II/III; rotate layers.
- **Graph view:** shortest path in a binary matrix (8-direction BFS), islands, word search, longest increasing path (memoised DFS). Direction arrays dr/dc avoid copy-paste errors.
- **Bar raiser:** huge sparse matrices (store as maps or CSR; multiply only non-zeros), cache behaviour of row-major versus column-major traversal, and a matrix that does not fit in memory (process row streams, e.g. Game of Life with three rows in memory).`,
  },
  sorting: {
    pre: ["two-pointers", "heap"],
    deep: `- **Properties table:**

| Sort | Time | Space | Stable |
|---|---|---|---|
| Merge | O(n log n) | O(n) | yes |
| Quick | O(n log n) avg, O(n²) worst | O(log n) | no |
| Heap | O(n log n) | O(1) | no |
| Insertion | O(n²), O(n) nearly sorted | O(1) | yes |
| Counting / radix | O(n + k) / O(d(n + b)) | O(n + k) | yes |

- **Quicksort details:** random or median-of-three pivot against adversarial input; 3-way partition for duplicates; recurse on the smaller side first to bound the stack at O(log n). Introsort (C++) falls back to heapsort; Timsort (Python, Java objects) exploits existing runs and is stable.
- **Quickselect:** average O(n), worst O(n²); median-of-medians gives worst-case O(n) (name it, do not code it).
- **Non-comparison sorts:** counting sort for small ranges, radix for fixed-width keys, bucket sort for uniform data (Maximum Gap uses buckets + pigeonhole to get O(n)).
- **Custom order problems:** Largest Number, sort by frequency, relative sort, Sort Colors, Wiggle Sort (median + three-way partition), H-Index (sort or counting), pancake sort, meeting points.
- **Merge-sort as a counting tool:** inversions, reverse pairs, count of range sums, smaller-after-self: count during the merge when both halves are sorted.
- **Cyclic sort** places values 1..n at their index in O(n) with O(1) space.
- **External sorting:** sorted runs that fit in memory, then a k-way merge with a heap; minimise passes; this is also how LSM compaction and MapReduce shuffle work.
- **Comparator contracts:** must be a strict weak ordering (irreflexive, transitive); returning a − b can overflow; inconsistent comparators crash or loop.
- **Bar raiser:** stability and why it matters for multi-key sorts, sorting nearly sorted data (k-sorted array with a heap of size k: O(n log k)), top-k without sorting, and sorting 1 TB with 1 GB RAM.`,
  },
  "advanced-techniques": {
    pre: ["range-queries", "dp-advanced", "advanced-graphs"],
  },
};

export const dsaNewTopics: { after: string; topic: Topic }[] = [
  {
    after: "sorting",
    topic: T("dsa", "advanced-techniques", "Stretch toolkit: techniques that separate strong from exceptional", 3, 40, "Meet in the middle, binary lifting, sqrt decomposition, offline queries, flows and recognising NP-hardness.", {
      signals: [
        "n around 40: too big for 2ⁿ, too small to need polynomial",
        "Many queries on static data that can be answered in any order",
        "'k-th ancestor', 'jump 2^k steps', or repeated application of a function",
        "Assignment / matching / 'minimum cut' phrasing",
      ],
      lesson: `These rarely appear as the main idea at L4, but each one turns a "stuck" into a "solved" in a hard round, and naming them correctly is an L5 signal.

**Meet in the middle.** Split the input in two halves, enumerate each half fully (2^(n/2)), then combine with sorting + binary search, two pointers or a hash map. Subset sum with n = 40, closest subsequence sum, 4Sum II, bidirectional BFS are all this idea.

**Binary lifting.** Precompute up[k][v] = the node reached after 2^k steps. Any jump of length d decomposes over the bits of d. Uses: k-th ancestor, LCA, "position after 10⁹ moves" in a functional graph, sparse-table range minimum.

**Sqrt decomposition and Mo's algorithm.** Cut the array into √n blocks; a query touches at most 2 partial blocks and √n whole blocks. Mo's algorithm orders offline queries so a sliding window answers them all in O((n + q)√n). Reach for it when a segment tree merge is hard but add/remove one element is easy.

**Offline processing.** If queries can be reordered, sort them by a parameter and grow a structure monotonically: union-find by edge weight, Fenwick by right endpoint, heap by threshold. Reverse time to turn deletions into insertions.

**Small-to-large merging.** When combining sets up a tree, always pour the smaller into the larger; every element moves O(log n) times.

**Flows and matching (recognition level).** Max-flow = min-cut. Bipartite matching models assignment; a grid coloured like a chessboard is bipartite. You are expected to model the problem and name the algorithm (Hopcroft–Karp, Dinic, Hungarian for min cost), rarely to code it.

**Recognising hardness.** Subset sum, TSP, graph colouring, longest path, set cover, bin packing are NP-hard. The right move: say so, then exploit the small constraint (bitmask DP, meet in the middle), a special structure (tree, DAG, interval), or offer an approximation / heuristic with its guarantee.

**Randomisation.** Random pivots, random hash bases and random sampling defeat adversarial input and give simple expected-time bounds (quickselect, treaps, skip lists, Bloom filters).`,
      pitfalls: [
        "Coding a heavy structure when sorting the queries offline would do",
        "Claiming a polynomial algorithm for an NP-hard problem instead of naming the hardness",
        "Binary lifting table sized by n instead of log(max jump)",
        "Meet in the middle without deduplicating or sorting one side, losing the speed-up",
      ],
      quiz: [
        Q("Subset sum closest to a target with n = 40 and values up to 10⁹. Best approach?", ["Knapsack DP over the sum", "*Meet in the middle", "Greedy by value", "Bitmask DP over 2⁴⁰"], "The sum is too large for DP and 2⁴⁰ is too slow; two halves of 2²⁰ combined with sort + binary search is ~2·10⁷ log."),
        Q("You need the node reached after k ≤ 10¹⁸ steps in a graph where every node has one outgoing edge.", ["Simulate", "Dijkstra", "*Binary lifting (or cycle detection)", "Topological sort"], "Jump tables up[j][v] answer any k in O(log k); alternatively find the cycle and reduce k modulo its length."),
        Q("Queries ask whether u and v are connected using only edges lighter than a per-query limit. Queries can be answered in any order.", ["BFS per query", "*Sort edges and queries, union-find incrementally", "Floyd–Warshall", "Segment tree"], "Offline processing by increasing limit lets a DSU absorb edges once: O((E + Q) log)."),
      ],
    }),
  },
];
