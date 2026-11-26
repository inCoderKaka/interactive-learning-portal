import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

/** Backtracking, traversal, topological sort, union-find and shortest paths. */
export const graphsCore: Record<string, Deep> = {
  // ─────────────── backtracking ───────────────
  "subsets-combinations": {
    blurb: "Enumerate choices with a recursion tree: choose, explore, un-choose. Subsets, combinations and combination sums, with the duplicate-handling and pruning rules that keep them correct and fast.",
    signals: ["\"All subsets / combinations / ways\" with small n", "Choose k of n, sum to target", "Generate all valid strings (parentheses, IP addresses)"],
    widgets: ["subsets"],
    lesson: md`
## The template

\`\`\`
def backtrack(start, path):
    record(path)                       # for subsets: every node is an answer
    for i in range(start, n):
        if should_skip(i): continue
        path.append(a[i])              # choose
        backtrack(i + 1, path)         # explore (i, not i + 1, if reuse is allowed)
        path.pop()                     # un-choose
\`\`\`

The recursion tree has one node per partial choice. **start** prevents generating the same set in different orders: combinations are built in increasing index order only.

[[widget:subsets]]

## Subsets (LC 78)

2ⁿ subsets, each copied when recorded: **O(n · 2ⁿ)**. Two equivalent views: "for each element, take it or not" (binary tree of depth n) or the loop template above. Iterative alternatives: bitmask enumeration (for mask in 0..2ⁿ − 1) or cascading (start with [[]], for each x append x to copies of all existing subsets).

## Duplicates (LC 90, 40)

Sort first. At each level skip a[i] if i > start and a[i] == a[i − 1]: the same value was already tried in this position. This prunes duplicate branches without a set of results.

## Combinations and sums

- **Combinations** (LC 77): stop when the path has k elements; prune when not enough elements remain (n − i + 1 < k − len(path)).
- **Combination Sum** (LC 39): reuse allowed → recurse with i (not i + 1); sort and break when a[i] exceeds the remaining target.
- **Combination Sum II** (LC 40): no reuse, duplicates in input → sort + skip rule + recurse with i + 1.
- **Combination Sum III** (LC 216): numbers 1..9, k of them.
- **Letter Combinations of a Phone Number** (LC 17): one level per digit.
- **Generate Parentheses** (LC 22): add '(' while open < n, add ')' while close < open. The count is the Catalan number C(n).
- **Restore IP Addresses** (LC 93): four segments, each 1–3 digits, no leading zeros, ≤ 255.

## Complexity talk

State it in terms of the output: subsets O(n · 2ⁿ), combinations O(k · C(n, k)), permutations O(n · n!). Pruning improves practice but rarely the worst case; say what it cuts.

## Backtracking vs DP

If the question asks for the **number** of ways or the **best** value and subproblems overlap, DP (often a knapsack) is exponentially faster. If it asks to **list** all solutions, the output size forces exponential time and backtracking is right.
`,
    doubts: [
      ["Why does 'i > start' (not i > 0) appear in the duplicate skip?", "At a given recursion level, the first copy of a value must be allowed; only later copies at the same level are duplicates. i > start means 'not the first candidate at this level'. Using i > 0 would forbid using equal values in the same combination at different depths, e.g. [1, 1]."],
      ["Combination Sum: recurse with i or i + 1?", "With i when an element may be reused (LC 39), with i + 1 when each element is used at most once (LC 40)."],
      ["Why copy the path when recording?", "path is mutated as recursion continues. Appending the same list object would leave every recorded answer pointing to the final (empty) path."],
      ["How many valid parentheses strings of n pairs exist?", "The n-th Catalan number, C(n) = (2n choose n)/(n + 1), about 4ⁿ/(n^1.5 √π)."],
    ],
    revise: md`
? Template steps? :: Choose, explore, un-choose; loop from start to avoid reordered duplicates.
? Subsets complexity? :: O(n · 2ⁿ).
? Skip duplicates rule? :: Sort; skip if i > start and a[i] == a[i−1].
? Reuse allowed? :: Recurse with i instead of i + 1.
? Prune in Combination Sum? :: Sort and break when a[i] > remaining.
? Generate Parentheses rules? :: '(' if open < n; ')' if close < open.
? List vs count? :: Listing → backtracking; counting/optimising with overlap → DP.
`,
    pitfalls: ["Appending path without copying", "i > 0 instead of i > start in the skip rule", "Forgetting to pop after recursion", "Generating then deduplicating with a set (slow and inelegant)"],
    quiz: [
      Q("Subsets of [1,2,2] without duplicates: count?", ["8", "*6", "4", "7"], "[], [1], [2], [1,2], [2,2], [1,2,2]."),
      Q("Combination Sum (reuse allowed) recurses with…", ["i + 1", "*i", "0", "start + 1"], "The same element may be taken again."),
    ],
    sources: [S.book("Algorithms, chapter 2: Backtracking", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/02-backtracking.pdf"), S.article("Catalan number", "Wikipedia", "https://en.wikipedia.org/wiki/Catalan_number"), S.article("Generating all subsets / combinations", "cp-algorithms", "https://cp-algorithms.com/combinatorics/generating_combinations.html")],
    problems: [78, 90, 77, 39, 40, 216, 17, 22, 93],
  },
  permutations: {
    blurb: "Arrange all elements: used-flags or in-place swapping, duplicate handling with a sorted skip rule, and next_permutation for lexicographic order without recursion.",
    signals: ["All orderings of a small set (n ≤ 8–10)", "Permutations with duplicates", "Next lexicographic arrangement", "k-th permutation"],
    lesson: md`
## Two ways to generate

**Used flags**: at each depth, try every unused element; mark, recurse, unmark. Output order is lexicographic if the input is sorted.

**In-place swapping**: at depth d, swap a[d] with each a[i] (i ≥ d), recurse on d + 1, swap back. No extra array, but output is not lexicographic.

Both are O(n · n!).

## Duplicates (LC 47)

Sort; with used flags, skip a[i] if i > 0, a[i] == a[i − 1] and **a[i − 1] is not used**. This forces equal values to be used in their original order, so each distinct permutation is produced once. (With swapping, keep a per-level set of values already placed at position d.)

## next_permutation (LC 31)

Lexicographic successor in O(n), O(1) space:
1. From the right, find the first i with a[i] < a[i + 1] (the pivot). If none, the array is the last permutation: reverse it.
2. From the right, find the first j with a[j] > a[i]; swap a[i], a[j].
3. Reverse a[i + 1 ..].

C++ has std::next_permutation; looping it from the sorted array enumerates all distinct permutations, duplicates included only once.

## k-th permutation (LC 60)

Use the factorial number system: the first element's index is (k − 1) / (n − 1)!, remove it, recurse with the remainder. O(n²) (or O(n log n) with a Fenwick tree for removals).

## Related

- **Permutation in String / Find All Anagrams**: not generation; a fixed window with counts.
- **Beautiful Arrangement** (LC 526): permutations with a per-position constraint; prune early, or bitmask DP.
- **Letter Case Permutation** (LC 784): 2^(letters) branching.
`,
    doubts: [
      ["Why 'a[i − 1] is not used' in the duplicate rule?", "If the previous equal value is not used, choosing a[i] now would place the second copy before the first, producing a permutation that the branch using the first copy will also produce. Requiring copies in order removes exactly those repeats."],
      ["Why does next_permutation reverse the suffix?", "After the swap, the suffix is still in decreasing order (the largest arrangement of those values). The next permutation needs the smallest arrangement of the suffix, which is increasing order: a reversal."],
    ],
    revise: md`
? Permutations complexity? :: O(n · n!).
? Duplicate skip with used flags? :: Skip if a[i] == a[i−1] and a[i−1] not used (after sorting).
? next_permutation steps? :: Find the pivot from the right; swap with the rightmost larger; reverse the suffix.
? Last permutation? :: No pivot: reverse to the first.
? k-th permutation? :: Factorial number system digit by digit.
`,
    pitfalls: ["Duplicates handled with a result set", "Forgetting to swap back in the swapping method", "Reversing the wrong range in next_permutation"],
    quiz: [Q("next_permutation of [1,3,2]?", ["[3,1,2]", "*[2,1,3]", "[2,3,1]", "[1,2,3]"], "Pivot 1; swap with 2; reverse [3,1] → [1,3].")],
    sources: [S.article("Permutation (lexicographic order generation)", "Wikipedia", "https://en.wikipedia.org/wiki/Permutation#Generation_in_lexicographic_order"), S.article("std::next_permutation", "cppreference", "https://en.cppreference.com/w/cpp/algorithm/next_permutation"), S.article("Factorial number system", "Wikipedia", "https://en.wikipedia.org/wiki/Factorial_number_system")],
    problems: [46, 47, 31, 60, 526, 784],
  },
  "constraint-search": {
    blurb: "N-Queens, Sudoku and other constraint puzzles: place, check constraints in O(1) with bookkeeping, and prune early. The craft is in the bookkeeping and the order of choices.",
    signals: ["Fill a board so constraints hold (queens, Sudoku, crosswords)", "Insert operators to reach a target", "Small search space with strong constraints"],
    lesson: md`
## N-Queens (LC 51, 52)

Place one queen per row. Keep three sets (or boolean arrays): **columns**, **diagonals** (r − c is constant) and **anti-diagonals** (r + c is constant). Checking and updating are O(1). Search space is far below n! because attacks prune early. With bitmasks (cols, diag, anti as integers, shifted per row), N-Queens II counts solutions very fast: available = ~(cols | diag | anti) & full; iterate set bits with p = available & −available.

## Sudoku Solver (LC 37)

Maintain row, column and box sets (box index = (r / 3) · 3 + c / 3). Backtrack over empty cells. Big speed-ups:
- **most constrained cell first** (fewest candidates: the MRV heuristic);
- bitmask candidates per row, column and box;
- constraint propagation (naked singles) before guessing.

**Valid Sudoku** (LC 36) is just the bookkeeping without search.

## Expression Add Operators (LC 282)

Insert +, −, * between digits to reach a target. Track the running value and the **last operand** so multiplication can undo it: value − last + last × next. Watch for leading zeros ("05" is not a number).

## Exact cover and Dancing Links

N-Queens and Sudoku are exact-cover problems; Knuth's Algorithm X with Dancing Links (DLX) solves them generically and efficiently. Name-level knowledge signals depth.

## General pruning ideas

- **Feasibility bounds**: stop if the remaining budget cannot reach the target.
- **Ordering**: try the most constrained choices first (fail fast) and the most promising values first (succeed fast).
- **Symmetry breaking**: for N-Queens count, place the first queen only in the left half and double (handling the middle column for odd n).
- **Memoise** when the same sub-state recurs (then it is DP).
`,
    doubts: [
      ["Why r − c and r + c for diagonals?", "Along a '\\' diagonal both r and c increase by 1, so r − c stays constant; along a '/' diagonal r increases while c decreases, so r + c stays constant. Each diagonal gets a unique id."],
      ["How do I track the last operand in Expression Add Operators?", "For '+x' last = x; for '−x' last = −x; for '*x' the new value is value − last + last·x and the new last is last·x. That is what lets multiplication bind tighter than addition."],
    ],
    revise: md`
? N-Queens O(1) check? :: Sets for columns, r − c and r + c.
? Bitmask N-Queens step? :: available = ~(cols|diag|anti) & full; take p = available & −available.
? Sudoku box index? :: (r/3)·3 + c/3.
? Sudoku speed-up? :: Fill the most constrained cell first (MRV) with bitmask candidates.
? Expression Add Operators multiplication? :: value − last + last·x; new last = last·x.
? Generic exact cover solver? :: Knuth's Algorithm X with Dancing Links.
`,
    pitfalls: ["O(n) attack checks per placement", "Leading zeros in operator insertion", "Mutating board state without restoring it"],
    quiz: [Q("Two queens at (2,5) and (4,3) attack each other because…", ["same column", "same r − c", "*same r + c", "they don't"], "2 + 5 = 4 + 3 = 7: same anti-diagonal.")],
    sources: [S.paper("Dancing Links (Knuth, 2000)", "arXiv", "https://arxiv.org/abs/cs/0011047"), S.article("Eight queens puzzle", "Wikipedia", "https://en.wikipedia.org/wiki/Eight_queens_puzzle"), S.book("Algorithms, chapter 2: Backtracking", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/02-backtracking.pdf")],
    problems: [51, 52, 37, 36, 282, 1240],
  },
  "grid-backtracking": {
    blurb: "DFS over a grid that marks cells on the path and unmarks them on return: word search, unique paths through obstacles, gold collection, with pruning that makes it pass.",
    signals: ["Find a word or path in a grid without reusing cells", "Visit every empty cell exactly once", "Maximum collected along a self-avoiding path"],
    lesson: md`
## Word Search (LC 79)

From each cell matching word[0], DFS in four directions with index k, marking the cell visited (overwrite with '#') and restoring it on return. O(R · C · 3^L): after the first step, each move has at most 3 new directions.

Pruning that interviewers like:
- **character counts**: if the board lacks enough of some letter, return false immediately;
- **search from the rarer end**: if the last letter is rarer than the first, reverse the word;
- early return as soon as one path succeeds.

## The difference from flood fill

Flood fill (number of islands) marks cells **permanently**: each cell is processed once, O(R·C). Path backtracking **unmarks** cells on return because a cell can belong to different paths: exponential. Know which one the problem needs.

## Other problems

- **Path with Maximum Gold** (LC 1219): DFS from every gold cell, unmarking on return.
- **Unique Paths III** (LC 980): count paths that visit every empty cell exactly once; carry the number of remaining cells.
- **Rat in a maze** (classic): list all paths; lexicographic order by trying directions D, L, R, U in order.
- **Word Search II**: many words, use a trie (see trie-powered search).

## Making it iterative

Possible with an explicit stack of (cell, direction index), but recursion depth is at most the path length (≤ R·C), usually fine. Mention it if the grid is huge.
`,
    doubts: [
      ["Why 3^L and not 4^L?", "After entering a cell you never immediately go back to the cell you came from (it is marked), so at most three directions remain at each step after the first."],
      ["Mark in place or use a visited set?", "In place ('#') is faster and needs no extra memory; restore the original character on return. A visited array is cleaner if you must not mutate input."],
    ],
    revise: md`
? Word Search complexity? :: O(R · C · 3^L).
? Flood fill vs path backtracking? :: Flood fill marks permanently (linear); path backtracking unmarks on return (exponential).
? Cheap pruning for Word Search? :: Letter-count check; start from the rarer end.
? Unique Paths III state? :: Position + remaining empty cells.
`,
    pitfalls: ["Forgetting to restore the cell", "Permanently marking in a path problem", "Not returning early on success"],
    quiz: [Q("Number of Islands marks visited cells…", ["and unmarks them", "*permanently", "never", "only at the start"], "Each cell is explored once.")],
    sources: [S.article("Word search: editorial", "LeetCode", "https://leetcode.com/problems/word-search/editorial/")],
    problems: [79, 1219, 980, 212],
  },
  "partition-backtracking": {
    blurb: "Split a string or array into pieces that each satisfy a rule: palindrome partitioning, k equal-sum subsets and matchsticks, with memoisation and ordering tricks.",
    signals: ["Partition a string into valid pieces (palindromes, dictionary words)", "Split an array into k groups with equal sum", "Assign items to buckets with capacity"],
    lesson: md`
## Palindrome Partitioning (LC 131)

At each start index, try every end where s[start..end] is a palindrome, recurse on end + 1. Precompute isPal[i][j] with DP (isPal[i][j] = s[i] == s[j] and isPal[i+1][j−1]) to make each check O(1). Output can be exponential (2^(n−1) partitions of "aaaa…"). The minimum number of cuts (LC 132) is a DP, not backtracking.

## Partition to K Equal Sum Subsets (LC 698)

Target = total / k (must be an integer, and no element may exceed it). Two formulations:

- **Bucket filling**: place each number (sorted descending) into one of k buckets; prune with: skip a bucket whose current sum equals a previous bucket's sum (symmetry), stop if a number does not fit, and if placing into an **empty** bucket fails, every empty bucket fails, so break.
- **Bitmask DP** (n ≤ 16): dp[mask] = sum of the current partial bucket (mod target) reachable using elements in mask; O(n · 2ⁿ).

**Matchsticks to Square** (LC 473) is k = 4.

## Word Break II (LC 140)

List all sentences: backtracking with memoisation on the start index (map start → list of sentences). The count of sentences can be exponential, so the output dominates.

## Fair Distribution of Cookies (LC 2305)

Assign bags to k children minimising the maximum: backtracking with pruning (stop when the current max exceeds the best), symmetry pruning (skip children with equal current sums), or bitmask DP.

## Choosing DP vs backtracking

Counting or optimising with overlapping subproblems → DP. Listing all partitions → backtracking (possibly memoised).
`,
    doubts: [
      ["Why sort descending in k-subsets?", "Large numbers have the fewest valid placements, so failures appear near the root of the search tree, pruning the most."],
      ["Why can I break after failing to place into an empty bucket?", "All empty buckets are interchangeable. If the number cannot start an empty bucket successfully, trying another empty bucket would repeat the same search."],
    ],
    revise: md`
? Palindrome check speed-up? :: Precompute isPal[i][j] by DP.
? Minimum palindrome cuts? :: DP, not backtracking.
? k equal subsets prerequisites? :: total % k == 0 and max ≤ target.
? k-subset prunings? :: Sort descending; skip buckets with equal sums; break after an empty-bucket failure.
? Small n alternative? :: Bitmask DP over used elements.
? Word Break II? :: Backtracking memoised by start index.
`,
    pitfalls: ["Rechecking palindromes from scratch", "Missing the empty-bucket symmetry break (TLE)", "Not checking divisibility first"],
    quiz: [Q("[4,3,2,3,5,2,1], k = 4: target sum per subset?", ["4", "*5", "6", "20"], "Total 20 / 4.")],
    sources: [S.article("Partition to k equal sum subsets: editorial", "LeetCode", "https://leetcode.com/problems/partition-to-k-equal-sum-subsets/editorial/")],
    problems: [131, 132, 698, 473, 140, 2305],
  },

  // ─────────────── graph traversal ───────────────
  "graph-representations": {
    blurb: "Adjacency lists, adjacency matrices and edge lists: what each costs, when to use which, and how to build graphs from the messy inputs interviews give you.",
    signals: ["Any problem with entities and relationships", "Input given as edges, prerequisites, equations, words or grids", "Choosing a structure before running an algorithm"],
    lesson: md`
## The three representations

| | Space | Edge check u–v | Iterate neighbours of u | Best for |
|---|---|---|---|---|
| Adjacency list | O(V + E) | O(deg u) | O(deg u) | sparse graphs, most algorithms |
| Adjacency matrix | O(V²) | O(1) | O(V) | dense graphs, V ≤ ~2000, Floyd–Warshall |
| Edge list | O(E) | O(E) | O(E) | Kruskal, Bellman–Ford |

Most interview graphs are sparse (E ≈ V to 10V): use adjacency lists.

## Vocabulary

Directed / undirected, weighted / unweighted, simple / multigraph (parallel edges, self-loops), connected components, degree (in/out), DAG, tree (connected, V − 1 edges, acyclic), bipartite, dense (E ≈ V²) vs sparse.

## Building graphs from inputs

- **Edge list** [[u, v], …] → adjacency list; add both directions if undirected.
- **Prerequisites** [course, prereq] → edge prereq → course (be explicit about direction).
- **Equations** a / b = k → weighted edges a → b (k) and b → a (1/k) (LC 399).
- **Words** differing by one letter (Word Ladder) → use wildcard buckets ("h*t") instead of comparing all pairs: O(n · L²) instead of O(n² L).
- **Grids** → implicit graph: neighbours are the four (or eight) adjacent cells; never build an explicit list.
- **Strings or states** → implicit graph explored on demand (state-space search).
- Map arbitrary labels to 0..V − 1 with a hash map when arrays are faster.

## Complexity conventions

Graph algorithms are stated in V and E: BFS/DFS O(V + E), Dijkstra O((V + E) log V), Floyd O(V³). Saying "O(n)" for a graph is ambiguous: name both.

## Isomorphism and degree facts

- Handshake lemma: Σ deg = 2E, so the number of odd-degree vertices is even.
- A tree has exactly V − 1 edges; a connected graph with V − 1 edges is a tree (Graph Valid Tree, LC 261: also check connectivity).
- Center of a tree (Minimum Height Trees, LC 310): peel leaves layer by layer.
`,
    doubts: [
      ["When is an adjacency matrix the right choice?", "When the graph is dense, V is small (a matrix of 10⁴ × 10⁴ booleans is 100 MB), you need O(1) edge queries, or the algorithm is naturally matrix based (Floyd–Warshall, transitive closure, matrix-power path counting)."],
      ["How should I build the graph for Word Ladder?", "For each word and each position, create the pattern with that letter replaced by '*' and bucket words by pattern. Words in the same bucket are neighbours. This avoids O(n²) pairwise comparisons."],
      ["Is a graph with V − 1 edges always a tree?", "Only if it is also connected (equivalently, acyclic). V − 1 edges plus either property implies the other."],
    ],
    revise: md`
? Adjacency list space? :: O(V + E).
? Adjacency matrix edge check and space? :: O(1) check, O(V²) space.
? Edge list best for? :: Kruskal, Bellman–Ford.
? Handshake lemma? :: Σ degrees = 2E.
? Tree characterisation? :: Connected with V − 1 edges (or acyclic with V − 1 edges).
? Word Ladder neighbours efficiently? :: Wildcard buckets ('h*t').
? Equation a/b = k as a graph? :: a→b weight k, b→a weight 1/k.
`,
    pitfalls: ["Adding only one direction for undirected edges", "Reversing prerequisite direction", "Building an explicit graph for a grid", "Quadratic neighbour discovery for word graphs"],
    quiz: [Q("A graph with 10⁵ vertices and 2·10⁵ edges should be stored as…", ["adjacency matrix", "*adjacency list", "edge list only", "a tree"], "A matrix would need 10¹⁰ entries.")],
    sources: [S.book("Algorithms, 4th ed. §4.1 Undirected Graphs", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/41graph/"), S.book("Algorithms, chapter 5: Basic Graph Algorithms", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/05-graphs.pdf")],
    problems: [1971, 997, 1557, 261, 310, 399],
  },
  bfs: {
    blurb: "Breadth-first search explores in waves of increasing distance, so the first time it reaches a vertex is along a shortest path (in edges). The workhorse for unweighted shortest paths.",
    signals: ["Minimum number of steps / moves / transformations", "Unweighted shortest path", "Level-by-level spread (infection, rotting, propagation)"],
    widgets: ["bfs-grid"],
    lesson: md`
## The algorithm

\`\`\`
dist = {s: 0}; q = deque([s])
while q:
    u = q.popleft()
    for v in adj[u]:
        if v not in dist:
            dist[v] = dist[u] + 1
            q.append(v)
\`\`\`

O(V + E) time and O(V) space.

**Mark visited when enqueuing**, not when dequeuing: otherwise a vertex can be enqueued many times (once per incoming edge), blowing up time and memory.

## Why BFS gives shortest paths

The queue holds vertices in non-decreasing order of distance, with at most two consecutive distance values at any time. When v is first discovered from u, no shorter path exists, because any shorter path would have been discovered from a vertex dequeued earlier. Formally: by induction on distance, all vertices at distance d are dequeued before any at distance d + 1.

This only holds when **all edges have equal weight**. With 0/1 weights use 0-1 BFS; with general non-negative weights use Dijkstra.

## Reconstructing the path

Store parent[v] = u when discovering v; walk back from the target. For "all shortest paths" (Word Ladder II), store all parents on the same level (a DAG of shortest paths), then DFS from the target.

## Multi-source and bidirectional BFS

- **Multi-source**: enqueue every source with distance 0 (rotting oranges, walls and gates, distance to the nearest 0). One BFS, O(V + E).
- **Bidirectional**: alternate expanding from source and target (expand the smaller frontier); stop when they meet. For branching factor b and distance d it explores about 2·b^(d/2) instead of b^d: the standard optimisation for Word Ladder.

## Typical problems

- Word Ladder (LC 127), Open the Lock (LC 752), Minimum Genetic Mutation (LC 433): state-space BFS.
- Rotting Oranges (LC 994), 01 Matrix (LC 542), Walls and Gates (LC 286): multi-source grid BFS.
- Shortest Path in Binary Matrix (LC 1091): 8-directional grid BFS.
- Clone Graph (LC 133): BFS with a map from originals to clones.
`,
    doubts: [
      ["Why mark visited when pushing rather than when popping?", "If you mark on pop, the same vertex can be pushed by each of its neighbours before it is popped, so the queue can hold O(E) entries and the same work repeats. Marking on push guarantees each vertex enters the queue once."],
      ["Does BFS work on weighted graphs?", "Only if all weights are equal (then it is just scaling). For 0/1 weights use 0-1 BFS with a deque; for other non-negative weights use Dijkstra."],
      ["BFS or DFS to check reachability?", "Either: both are O(V + E). Use BFS when you also want distances, DFS when you want structure (cycles, topological order, low-link values) or simpler recursive code."],
      ["How much does bidirectional BFS save?", "If each level multiplies the frontier by b and the answer is at depth d, one-directional BFS visits about b^d vertices and bidirectional about 2·b^(d/2). For b = 10, d = 6 that is 10⁶ versus 2,000."],
    ],
    revise: md`
? BFS complexity? :: O(V + E).
? Mark visited when? :: When enqueuing.
? Why shortest paths? :: Vertices are dequeued in non-decreasing distance order (equal edge weights).
? Path reconstruction? :: parent[v] on discovery; walk back.
? Multi-source BFS? :: Enqueue all sources with distance 0.
? Bidirectional BFS gain? :: About 2·b^(d/2) instead of b^d.
? Weighted edges? :: 0/1 → 0-1 BFS; non-negative → Dijkstra.
`,
    pitfalls: ["Marking visited on pop", "Using BFS on weighted graphs", "list.pop(0) in Python (use deque)", "Running a BFS per source instead of multi-source"],
    quiz: [
      Q("Rotting Oranges: start the BFS from…", ["one rotten orange", "*all rotten oranges at once", "each fresh orange", "the top-left cell"], "Multi-source BFS gives the simultaneous spread."),
      Q("BFS finds shortest paths when…", ["weights are positive", "*all edges have the same weight", "the graph is a DAG", "always"], "Otherwise use Dijkstra or 0-1 BFS."),
    ],
    sources: [S.book("Algorithms, 4th ed. §4.1 (breadth-first search)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/41graph/"), S.article("Breadth-first search", "cp-algorithms", "https://cp-algorithms.com/graph/breadth-first-search.html"), S.book("Introduction to Algorithms (CLRS), ch. 20.2: Breadth-first search", "Cormen, Leiserson, Rivest, Stein", "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/")],
    problems: [127, 126, 752, 433, 994, 542, 286, 1091, 133],
  },
  dfs: {
    blurb: "Depth-first search goes deep before wide. Discovery and finish times, the four edge types, connected components, and why DFS (not BFS) is the engine behind cycles, topological order, bridges and SCCs.",
    signals: ["Explore all reachable vertices, count components", "Anything about structure: cycles, ancestors, topological order, low-link", "Path existence and enumeration"],
    widgets: ["dfs-edges"],
    lesson: md`
## The algorithm

\`\`\`
def dfs(u):
    visited[u] = True; tin[u] = timer; timer += 1
    for v in adj[u]:
        if not visited[v]: parent[v] = u; dfs(v)
    tout[u] = timer; timer += 1
\`\`\`

O(V + E). Recursion depth can reach V: use an explicit stack for large inputs.

## Discovery and finish times

Every vertex gets a discovery time **tin** and a finish time **tout**. The intervals [tin, tout] are properly nested (the **parenthesis theorem**): v is a descendant of u exactly when tin[u] < tin[v] and tout[v] < tout[u]. This gives O(1) ancestor queries on a tree after one DFS (Euler tour), and finish times are what topological sort and Kosaraju use.

## Edge types (directed graphs)

When DFS at u looks at edge u → v:

| Type | Condition | Meaning |
|---|---|---|
| tree | v unvisited | DFS goes to v |
| back | v is an ancestor still on the stack (grey) | **cycle** |
| forward | v is a finished descendant | shortcut down the tree |
| cross | v is finished and not a descendant | edge to another branch |

Use three colours: white (unvisited), grey (on the current path), black (finished). A **back edge exists iff the graph has a cycle**. Undirected DFS has only tree and back edges.

[[widget:dfs-edges]]

## Connected components

Run DFS (or BFS, or union-find) from every unvisited vertex; each run is one component. **Number of Islands** (LC 200), **Number of Provinces** (LC 547), **Count Components** (LC 323), **Max Area of Island** (LC 695), **Surrounded Regions** (LC 130: DFS from border 'O's, keep those, flip the rest), **Pacific Atlantic Water Flow** (LC 417: reverse DFS from each ocean, intersect).

## DFS vs BFS

| | DFS | BFS |
|---|---|---|
| Memory | O(depth) | O(width) |
| Shortest unweighted path | no | yes |
| Cycles, topological order, low-link, SCC | yes | not directly |
| Recursion risk | yes | no |

## Iterative DFS

Push (u, iterator index) so you can resume u's neighbour list and do post-order work when it finishes. The simple "pop, push all neighbours" version visits vertices in a valid DFS-like order but does not give correct finish times.
`,
    doubts: [
      ["Why do I need three colours for cycle detection in directed graphs?", "A visited vertex might be finished (black) and reached via a cross or forward edge, which is not a cycle. Only an edge to a grey vertex (on the current recursion path) closes a cycle. Two colours cannot tell those apart."],
      ["Can I detect cycles in undirected graphs with visited alone?", "Yes, if you ignore the edge back to the parent: any visited neighbour other than the parent closes a cycle. With parallel edges, skip by edge id."],
      ["What is the parenthesis theorem good for?", "Ancestor checks in O(1) (tin/tout nesting), subtree ranges for segment-tree queries on trees (Euler tour flattening), and the correctness proofs of topological sort and SCC algorithms."],
      ["Why doesn't 'pop and push all neighbours' give true DFS finish times?", "It marks vertices finished as soon as they are expanded, before their descendants are explored. Post-order work needs to know when all descendants are done, which requires resuming the neighbour iteration."],
    ],
    revise: md`
? DFS complexity? :: O(V + E); recursion depth up to V.
? Parenthesis theorem? :: [tin, tout] intervals nest exactly along ancestor relationships.
? Four edge types? :: Tree, back (to grey ancestor), forward (to black descendant), cross (to black non-descendant).
? Cycle in a directed graph iff? :: A back edge (edge to a grey vertex).
? Undirected cycle check? :: A visited neighbour that is not the parent (edge id with multi-edges).
? Surrounded Regions trick? :: DFS from border cells; flip only unreached regions.
? Pacific Atlantic? :: Reverse-flow DFS from each ocean, intersect.
`,
    pitfalls: ["Two-colour cycle detection on directed graphs", "Deep recursion on large graphs", "Forgetting to restart DFS from every unvisited vertex"],
    quiz: [
      Q("Directed DFS meets an edge to a grey vertex. The graph…", ["is a DAG", "*has a cycle", "is disconnected", "is bipartite"], "Grey means on the current path."),
      Q("Which edge types can an undirected DFS produce?", ["all four", "*tree and back only", "tree and cross only", "back only"], "Cross and forward edges cannot occur."),
    ],
    sources: [S.book("Algorithms, chapter 6: Depth-First Search", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/06-dfs.pdf"), S.article("Depth-first search", "cp-algorithms", "https://cp-algorithms.com/graph/depth-first-search.html"), S.book("Introduction to Algorithms (CLRS), ch. 20.3: Depth-first search", "Cormen, Leiserson, Rivest, Stein", "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/")],
    problems: [200, 547, 323, 695, 130, 417, 797, 841],
  },
  "cycle-detection": {
    blurb: "Undirected: a visited neighbour that is not your parent, or a union-find merge that fails. Directed: a back edge to a grey vertex, or Kahn's algorithm leaving vertices behind.",
    signals: ["Can all courses be finished? (cycle in prerequisites)", "Is this graph a tree?", "Redundant connection", "Deadlock or circular dependency detection", "Safe states that cannot reach a cycle"],
    lesson: md`
## Undirected graphs

- **DFS**: a cycle exists iff DFS finds a visited neighbour other than the parent (skip by edge id with parallel edges).
- **Union-find**: process edges; if both endpoints are already connected, this edge closes a cycle. **Redundant Connection** (LC 684) returns that edge.
- **Counting**: a connected graph with V vertices and E edges has a cycle iff E ≥ V.

## Directed graphs

- **DFS three colours**: an edge to a grey (in-progress) vertex is a back edge: cycle. Recover the cycle by walking parent pointers from u back to v.
- **Kahn's algorithm**: repeatedly remove in-degree-0 vertices. If some vertices are never removed, they are on or downstream of a cycle. **Course Schedule** (LC 207) is exactly this.
- Undirected tricks fail on directed graphs: a visited vertex may be in a finished branch (cross edge), not a cycle.

## Eventual safe states (LC 802)

A vertex is safe if every path from it ends at a terminal vertex. Equivalently, it cannot reach a cycle. Solutions: three-colour DFS (a vertex is safe if DFS finishes it black without meeting grey), or Kahn on the **reversed** graph starting from terminal vertices.

## Functional graphs (out-degree exactly 1)

Every component is one cycle with trees hanging into it. Find cycles by walking with colours, or by peeling in-degree-0 vertices (what remains is exactly the cycles). Longest Cycle in a Graph (LC 2360), Maximum Employees (LC 2127), Find the Duplicate (LC 287 as an implicit functional graph).

## Redundant Connection II (directed, LC 685)

Rooted tree plus one extra edge: either some vertex has two parents (remove one of the two candidate edges, choosing the one that leaves no cycle) or there is a cycle with no double parent (remove the last edge on the cycle). A favourite hard follow-up.

## Negative cycles

In weighted graphs, a cycle whose total weight is negative makes shortest paths undefined. Bellman–Ford detects it with a V-th relaxation round; Floyd–Warshall with a negative diagonal entry.
`,
    doubts: [
      ["Why doesn't 'visited neighbour = cycle' work for directed graphs?", "In a directed graph, DFS can reach a vertex finished in an earlier branch via a cross edge (A → B, A → C → B). B is visited, but there is no cycle. Only a vertex still on the recursion stack (grey) indicates a cycle."],
      ["How do I output the actual cycle?", "Record parent pointers. When the back edge u → v is found, walk from u through parents back to v, then reverse."],
      ["Kahn or DFS for Course Schedule?", "Both are O(V + E). Kahn's is iterative (no recursion depth issues) and directly yields a valid order for Course Schedule II; DFS needs post-order reversal."],
    ],
    revise: md`
? Undirected cycle via DFS? :: A visited neighbour other than the parent.
? Undirected cycle via DSU? :: An edge whose endpoints are already connected.
? Directed cycle via DFS? :: An edge to a grey vertex.
? Directed cycle via Kahn? :: Vertices remain after removing all in-degree-0 vertices.
? Safe states? :: Cannot reach a cycle: colour DFS, or Kahn on the reversed graph.
? Functional graph structure? :: One cycle per component with trees feeding in.
`,
    pitfalls: ["Undirected logic on directed graphs", "Forgetting the parent exception in undirected DFS", "Recursion depth on large dependency graphs"],
    quiz: [Q("Kahn's algorithm processes 8 of 10 vertices. Conclusion?", ["The graph is a DAG", "*There is a cycle among the remaining vertices (or they depend on one)", "Two components", "The order is unique"], "Vertices on a cycle never reach in-degree 0.")],
    sources: [S.book("Algorithms, 4th ed. §4.2 Directed Graphs (cycle detection)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/42digraph/"), S.article("Finding a negative cycle", "cp-algorithms", "https://cp-algorithms.com/graph/finding-negative-cycle-in-graph.html"), S.article("Checking a graph for acyclicity and finding a cycle", "cp-algorithms", "https://cp-algorithms.com/graph/finding-cycle.html")],
    problems: [207, 684, 685, 802, 2360, 261],
  },
  "grid-graphs": {
    blurb: "Grids are graphs with implicit edges: direction arrays, bounds checks, flood fill, multi-source BFS for nearest distances, and when to mark cells in place.",
    signals: ["2D board of cells with connections to neighbours", "Islands, regions, enclosed areas", "Nearest distance to some cell type, simultaneous spread"],
    widgets: ["bfs-grid"],
    lesson: md`
## Mechanics

- Directions: \`DIRS = [(1,0),(-1,0),(0,1),(0,-1)]\` (add diagonals for 8-connectivity).
- Bounds: 0 ≤ r < R and 0 ≤ c < C, checked before reading the cell.
- Visited: overwrite the cell (e.g. '1' → '0' for islands) or keep a boolean matrix if the input must stay intact.
- Encode (r, c) as r·C + c when you need a single integer key (union-find, hash sets).

O(R·C) for one traversal over the grid.

## Flood fill family

- **Number of Islands** (LC 200), **Max Area of Island** (LC 695), **Flood Fill** (LC 733): DFS or BFS from each unvisited land cell.
- **Number of Closed Islands** (LC 1254) and **Surrounded Regions** (LC 130): first flood from the border to eliminate regions touching it.
- **Number of Distinct Islands** (LC 694): canonical shape signature (relative coordinates or the DFS path string including backtrack markers).
- **Making a Large Island** (LC 827): label each island with an id and size, then for each water cell sum the distinct neighbouring islands' sizes + 1.

## Multi-source BFS for nearest distances

- **01 Matrix** (LC 542): BFS from all zeros at once; first arrival is the nearest zero.
- **Rotting Oranges** (LC 994): BFS from all rotten oranges; answer = levels until no fresh orange remains (or −1).
- **As Far from Land as Possible** (LC 1162): BFS from all land.
- **Walls and Gates** (LC 286): BFS from all gates.

Running one BFS per source would be O((R·C)²).

## Shortest paths in grids

- Unweighted moves: BFS (Shortest Path in Binary Matrix, LC 1091, with 8 directions).
- Obstacle elimination (LC 1293): BFS over states (r, c, eliminations left).
- Cost 0 for following an arrow and 1 for changing it (LC 1368): 0-1 BFS.
- Minimise the maximum step (LC 1631): Dijkstra on max-edge cost, binary search + BFS, or union-find.

## Union-find on grids

For dynamic problems (Number of Islands II, LC 305: land is added over time), union-find with r·C + c ids answers each addition in near-constant time, where re-running BFS would be O(R·C) each time.
`,
    doubts: [
      ["DFS or BFS for flood fill?", "Both are O(R·C). DFS is shorter but recursion can overflow on a 1000 × 1000 grid (10⁶ cells in one region); BFS or an explicit stack avoids that."],
      ["Mutating the grid as visited: acceptable?", "Usually yes and it saves memory; say so and offer a visited matrix if the caller needs the grid unchanged."],
      ["How do I recognise distinct island shapes?", "Translate each island so its first-visited cell is the origin and store the sorted relative coordinates, or record the DFS move sequence including a 'back' marker. Equal signatures mean equal shapes."],
    ],
    revise: md`
? Grid traversal cost? :: O(R·C).
? Nearest distance to any zero? :: Multi-source BFS from all zeros.
? Closed islands? :: Flood from the border first, then count.
? Making a large island? :: Label islands with sizes; for each water cell sum distinct neighbouring sizes + 1.
? Islands added over time? :: Union-find on r·C + c.
? Eliminate up to k obstacles? :: BFS over (r, c, k left).
`,
    pitfalls: ["Recursive DFS on 10⁶-cell regions", "Bounds checked after indexing", "One BFS per source"],
    quiz: [Q("Distance from every cell to the nearest 0 in a 1000 × 1000 grid:", ["BFS from each cell", "*One multi-source BFS from all zeros", "Floyd–Warshall", "DFS"], "O(R·C) total.")],
    sources: [S.article("Flood fill", "Wikipedia", "https://en.wikipedia.org/wiki/Flood_fill"), S.article("Flood fill (graph traversal on grids)", "USACO Guide", "https://usaco.guide/silver/flood-fill")],
    problems: [200, 695, 733, 1254, 130, 694, 827, 542, 994, 1162, 286, 417],
  },
  bipartite: {
    blurb: "Can vertices be split into two sides with every edge crossing? Two-colour with BFS or DFS; an odd cycle is the only obstacle. The gateway to matching.",
    signals: ["Split people into two groups where enemies are separated", "Two-colourability, odd cycles", "Graphs whose edges always go between two kinds of things"],
    lesson: md`
## Definition and test

A graph is **bipartite** if its vertices can be coloured with two colours so every edge joins different colours. Test: BFS or DFS colouring each newly discovered vertex with the opposite colour; a conflict (an edge between equal colours) means not bipartite. Run from every uncoloured vertex (the graph may be disconnected). O(V + E).

**Theorem (König, 1936):** a graph is bipartite **iff it has no odd-length cycle**. The colouring conflict you detect is exactly an odd cycle.

## Problems

- **Is Graph Bipartite?** (LC 785), **Possible Bipartition** (LC 886: dislikes as edges).
- **Union-find with parity**: for each vertex, all its neighbours must be in the same set, which must differ from the vertex's set. Union all neighbours of u together; if u ends up with them, not bipartite.

## Why it matters

- **Matching**: bipartite graphs admit efficient maximum matching (Hopcroft–Karp) and König's theorem (max matching = min vertex cover). See flow and matching.
- **Scheduling with two time slots**, two-team assignments, 2-colouring maps.
- 3-colouring is NP-complete: the jump from 2 to 3 colours is from linear to NP-complete, a nice fact to mention.

## Related tricks

- **Is a grid bipartite?** Always: colour by (r + c) mod 2. This underlies domino tiling parity arguments.
- **Trees are bipartite** (no cycles at all).
`,
    doubts: [
      ["Why is an odd cycle the only obstacle?", "Colours must alternate along any path. Going around a cycle of odd length returns to the start with the opposite colour: contradiction. Conversely, if there is no odd cycle, BFS layers coloured by parity of distance never conflict."],
      ["Do I need to handle disconnected graphs?", "Yes. Start a colouring from every uncoloured vertex, otherwise components not reachable from vertex 0 are never checked."],
    ],
    revise: md`
? Bipartite test? :: BFS/DFS two-colouring; conflict means not bipartite.
? Characterisation? :: No odd-length cycle.
? Complexity? :: O(V + E).
? Disconnected graphs? :: Restart from every uncoloured vertex.
? 2-colouring vs 3-colouring? :: Linear vs NP-complete.
`,
    pitfalls: ["Starting only from vertex 0", "Directed-edge confusion: bipartiteness ignores direction", "Not handling self-loops (a self-loop makes it non-bipartite)"],
    quiz: [Q("A cycle of length 5 is…", ["bipartite", "*not bipartite", "a tree", "a DAG"], "Odd cycle.")],
    sources: [S.article("Bipartite graph", "Wikipedia", "https://en.wikipedia.org/wiki/Bipartite_graph"), S.article("Checking whether a graph is bipartite", "cp-algorithms", "https://cp-algorithms.com/graph/bipartite-check.html")],
    problems: [785, 886, 1042],
  },
  "state-space-bfs": {
    blurb: "When vertices are configurations (lock codes, board states, (cell, keys) pairs), BFS over the implicit graph finds the minimum number of moves. Design the state, then run plain BFS.",
    signals: ["Minimum moves to transform one configuration into another", "Puzzles: sliding tiles, locks, jugs", "Grid search where extra information matters (keys collected, obstacles removed)"],
    lesson: md`
## Design the state

The state must contain **everything that affects future moves**, and nothing more (every extra field multiplies the state space).

| Problem | State | State count |
|---|---|---|
| Open the Lock (LC 752) | 4-digit string | 10⁴ |
| Sliding Puzzle (LC 773) | board as a string | 6! = 720 |
| Shortest Path with Obstacle Elimination (LC 1293) | (r, c, k left) | R·C·(k+1) |
| Shortest Path to Get All Keys (LC 864) | (r, c, keys bitmask) | R·C·2⁶ |
| Shortest Path Visiting All Nodes (LC 847) | (node, visited bitmask) | n·2ⁿ |
| Bus Routes (LC 815) | route (not stop) | number of routes |
| Jump Game IV (LC 1345) | index, with "same value" edges consumed once | n |

Then BFS from the start state(s), generating neighbours on the fly and storing visited states in a set.

## Common optimisations

- **Bidirectional BFS** when the target is known (Word Ladder, Open the Lock).
- **Delete used edge groups**: in Jump Game IV, after using the "jump to equal value" edges of a value, clear that list; otherwise the algorithm is O(n²).
- **Change the vertex**: in Bus Routes, BFS over routes (or over stops but expanding whole routes once) avoids revisiting long routes.
- **Prune impossible states**: in obstacle elimination, if k ≥ R + C − 2 the answer is the Manhattan distance.

## Weighted moves

If moves have different costs, the same state design goes into Dijkstra or 0-1 BFS instead of BFS.

## Solvability checks

Sliding puzzles have parity invariants (inversion count) that decide reachability without search; mention them as an optimisation.
`,
    doubts: [
      ["How do I decide what goes into the state?", "Ask: if two situations have the same position but different values of X, can their futures differ? If yes, X belongs in the state (keys held, remaining eliminations, visited set). If not, leave it out."],
      ["Why does Jump Game IV need edge deletion?", "All indices with the same value are mutually connected. Without clearing the list after the first use, every index of a frequent value re-scans the whole list: O(n²)."],
    ],
    revise: md`
? State design rule? :: Include exactly what affects future moves.
? Keys collected? :: Add a bitmask of keys to the state.
? Obstacles you may remove? :: (r, c, eliminations left).
? Visit all nodes shortest path? :: BFS over (node, visited mask).
? Bus Routes trick? :: BFS over routes, not stops.
? Jump Game IV trick? :: Clear same-value edge lists after use.
`,
    pitfalls: ["Missing a state component (wrong answers)", "Including redundant components (TLE/MLE)", "Rebuilding neighbour lists repeatedly"],
    quiz: [Q("Shortest path collecting all of up to 6 keys in a grid: state size factor for keys?", ["6", "36", "*64", "720"], "2⁶ subsets of keys.")],
    sources: [S.article("State space search", "Wikipedia", "https://en.wikipedia.org/wiki/State_space_search"), S.article("15 puzzle (solvability parity)", "Wikipedia", "https://en.wikipedia.org/wiki/15_puzzle#Solvability")],
    problems: [752, 773, 1293, 864, 847, 815, 1345, 127],
  },

  // ─────────────── topological sort ───────────────
  kahn: {
    blurb: "Repeatedly take a vertex with no remaining prerequisites. Kahn's algorithm orders a DAG in O(V + E), detects cycles for free, and adapts to \"minimum semesters\" and \"lexicographically smallest order\".",
    signals: ["Prerequisites, dependencies, build order", "Can everything be scheduled? (cycle detection)", "Minimum number of rounds when independent tasks run in parallel"],
    widgets: ["topo"],
    lesson: md`
## The algorithm

1. Compute in-degrees.
2. Queue every vertex with in-degree 0.
3. Pop u, append it to the order, and decrement the in-degree of each successor; enqueue any that drop to 0.
4. If the order has fewer than V vertices, the graph has a cycle.

O(V + E).

[[widget:topo]]

## Why it works

A DAG always has a vertex with in-degree 0 (otherwise following incoming edges backwards forever would revisit a vertex: a cycle). Removing it leaves a DAG. Induction gives a full order. If at some point no in-degree-0 vertex exists but vertices remain, every remaining vertex has a predecessor among the remaining ones, which forces a cycle.

## Variants

- **Course Schedule I/II** (LC 207, 210): feasibility and an order.
- **Parallel Courses** (LC 1136): process level by level (snapshot queue size); the number of levels is the minimum number of semesters. **Parallel Courses III** (LC 2050): longest path with durations, DP along the order.
- **Lexicographically smallest order**: use a min-heap instead of a queue (O(V log V + E)).
- **Is the order unique?** (Sequence Reconstruction, LC 444): unique iff the queue never holds more than one vertex.
- **Minimum height trees** (LC 310): Kahn-like leaf peeling on an undirected tree; the last 1 or 2 vertices are the centres.
- **Find eventual safe states** (LC 802): Kahn on the reversed graph.
- **Sort items by groups respecting dependencies** (LC 1203): two-level topological sort (groups, then items within groups).

## Kahn vs DFS ordering

Both produce valid topological orders, often different ones. Kahn's is iterative and naturally level-aware; DFS uses reversed finish times and fits algorithms that already run DFS. See DFS ordering.
`,
    doubts: [
      ["Which direction should prerequisite edges point?", "From prerequisite to dependent (prereq → course), so in-degree counts unmet prerequisites. Reversing it gives a reversed order: decide and say it out loud."],
      ["How do I get the minimum number of semesters?", "Process the queue level by level: every vertex whose prerequisites are all done can be taken in the same semester. The number of levels is the answer (or −1 if a cycle prevents finishing)."],
      ["When is the topological order unique?", "Exactly when, at every step, there is only one in-degree-0 vertex available, which means consecutive vertices in the order are joined by edges (there is a Hamiltonian path)."],
    ],
    revise: md`
? Kahn's steps? :: In-degrees; queue zeros; pop, append, decrement successors; enqueue new zeros.
? Cycle detection? :: Fewer than V vertices output.
? Complexity? :: O(V + E).
? Minimum semesters? :: Level-by-level Kahn; count levels.
? Lexicographically smallest order? :: Min-heap instead of a queue.
? Unique order? :: The queue never holds more than one vertex.
? Minimum height trees? :: Peel leaves layer by layer; 1 or 2 centres remain.
`,
    pitfalls: ["Edge direction reversed", "Forgetting vertices with no edges (they still need in-degree 0 entries)", "Not checking the output length for cycles"],
    quiz: [Q("Kahn's algorithm on a graph with a cycle outputs…", ["all vertices", "*fewer than V vertices", "an error", "a reversed order"], "Cycle vertices never reach in-degree 0.")],
    sources: [S.paper("Topological sorting of large networks (Kahn, 1962)", "Communications of the ACM", "https://doi.org/10.1145/368996.369025"), S.article("Topological sorting", "cp-algorithms", "https://cp-algorithms.com/graph/topological-sort.html"), S.book("Algorithms, 4th ed. §4.2 (topological sort)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/42digraph/")],
    problems: [207, 210, 1136, 2050, 444, 310, 1203, 2115],
  },
  "dfs-topo": {
    blurb: "Topological order as reversed DFS finish times: a vertex finishes only after everything it points to, so reversing finish order puts every edge left to right.",
    signals: ["You are already running DFS (and want an order or cycle check)", "Recursive dependency resolution", "Ordering for DP on a DAG"],
    lesson: md`
## The algorithm

Run DFS on every unvisited vertex; when a vertex **finishes**, push it onto a list. Reverse the list. Use three colours to detect cycles at the same time (an edge to a grey vertex means no topological order exists).

## Why reversed finish time works

For any edge u → v in a DAG, v finishes before u: either DFS reaches v from u (v is a descendant and finishes first), or v was already finished (it cannot be grey, since that would be a cycle). So in decreasing finish order u comes before v. The same argument with the parenthesis theorem is the standard proof.

## Kahn or DFS?

| | Kahn | DFS |
|---|---|---|
| Style | iterative, queue | recursive (or explicit stack) |
| Cycle detection | output size < V | grey edge |
| Level structure | natural | not directly |
| Lexicographic order | min-heap | awkward |
| Already doing DFS | | natural |

## Uses

- Dependency resolution (package managers, build systems like Make and Bazel compute topological orders of their target graphs).
- Spreadsheet recalculation order.
- Ordering states for **DP on DAGs** (see the next page).
- **Alien Dictionary** (LC 269) is commonly written with DFS colouring.
`,
    doubts: [
      ["Why reverse the finish order instead of using discovery order?", "Discovery order can place a vertex before one of its prerequisites that was discovered later from another branch. Finish order guarantees each vertex finishes after all of its successors."],
      ["Do I need to reverse if I build the graph with reversed edges?", "If edges point from a vertex to its prerequisites, finish order is already a valid build order (prerequisites first). Be explicit about direction."],
    ],
    revise: md`
? DFS topological order? :: Reverse of finish order.
? Why valid? :: For every edge u → v, v finishes before u.
? Cycle detection in the same pass? :: An edge to a grey vertex.
? Edges pointing to prerequisites? :: Finish order itself is a valid build order.
`,
    pitfalls: ["Using discovery order", "Two-colour visited (misses cycles)", "Recursion depth for long dependency chains"],
    quiz: [Q("Edges a→b, b→c. DFS from a finishes in order…", ["a, b, c", "*c, b, a", "b, c, a", "a, c, b"], "Reversed it gives a, b, c.")],
    sources: [S.book("Algorithms, chapter 6: Depth-First Search (§6.3 topological sort)", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/06-dfs.pdf"), S.article("Topological sorting", "Wikipedia", "https://en.wikipedia.org/wiki/Topological_sorting")],
    problems: [210, 269, 1462],
  },
  "dag-dp": {
    blurb: "On a DAG, process vertices in topological order and every DP over paths becomes one linear pass: longest path, number of paths, critical path scheduling.",
    signals: ["Longest path (only tractable on DAGs)", "Count paths between two vertices", "Project scheduling with durations (critical path)", "DP whose dependencies form a DAG"],
    lesson: md`
## The principle

In topological order, all predecessors of v are processed before v, so a DP like

best[v] = max over edges u → v of best[u] + w(u, v)

is computed in one pass: O(V + E). Every DP is DP on a DAG of subproblems; here the DAG is explicit.

## Classic uses

- **Longest path in a DAG**: the recurrence above. On general graphs longest simple path is NP-hard; on DAGs it is linear. Negate weights to turn it into a shortest path (shortest paths in DAGs also work with negative weights, no Dijkstra needed).
- **Number of paths** from s to t: ways[v] = Σ ways[u].
- **Critical path method (project scheduling)**: earliest finish = max over prerequisites + duration (Parallel Courses III, LC 2050).
- **Longest Increasing Path in a Matrix** (LC 329): cells with edges to larger neighbours form a DAG; memoised DFS (or topological peeling) gives O(R·C).
- **Largest Color Value in a Directed Graph** (LC 1857): Kahn's order plus a count[v][colour] DP; a cycle means −1.
- **All Ancestors of a Node** (LC 2192): propagate sets along the order.

## Memoised DFS = DP on a DAG

Writing dfs(v) = combine(dfs(children)) with memoisation computes the same thing in reverse topological order implicitly. That is why "memoised recursion" works exactly when the dependency graph has no cycles.

## Shortest paths with negative weights on a DAG

Relax edges in topological order: O(V + E), and negative weights are fine (there can be no negative cycles in a DAG). Faster than Bellman–Ford.
`,
    doubts: [
      ["Why is longest path easy on DAGs but hard in general?", "With cycles, a longest simple path must avoid revisiting vertices, which encodes Hamiltonian path (NP-hard). A DAG has no cycles, so every path is simple and DP in topological order works."],
      ["Why does memoised DFS work on Longest Increasing Path in a Matrix?", "Edges go only to strictly larger values, so no cycle can form. The memo is filled in reverse topological order automatically."],
    ],
    revise: md`
? DAG DP pass order? :: Topological order: predecessors first.
? Longest path on a DAG complexity? :: O(V + E) (NP-hard on general graphs).
? Count paths? :: ways[v] = Σ ways[u] over incoming edges.
? Shortest path with negative weights on a DAG? :: Relax in topological order: O(V + E).
? Longest Increasing Path in a Matrix? :: Memoised DFS on the implicit DAG: O(R·C).
`,
    pitfalls: ["Applying DAG DP to graphs with cycles", "Forgetting modulo for path counts", "Recursion depth in memoised DFS on large grids"],
    quiz: [Q("Longest path in a general directed graph with cycles is…", ["O(V + E)", "O(V log V)", "*NP-hard (simple paths)", "solvable by Dijkstra"], "Only DAGs make it easy.")],
    sources: [S.book("Algorithms, chapter 6 (§6.4 dynamic programming in DAGs)", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/06-dfs.pdf"), S.article("Critical path method", "Wikipedia", "https://en.wikipedia.org/wiki/Critical_path_method"), S.book("Algorithms, 4th ed. §4.4 (acyclic shortest and longest paths)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/44sp/")],
    problems: [329, 2050, 1857, 2192, 1976, 851],
  },
  "order-constraints": {
    blurb: "Infer a hidden order from evidence (sorted alien words, sequences, pairwise rules) by building a precedence graph and topologically sorting it, with the edge cases that make these problems hard.",
    signals: ["Recover an alphabet or ranking from sorted examples", "Is a given order consistent with constraints?", "Arrange items satisfying \"x before y\" rules"],
    lesson: md`
## Alien Dictionary (LC 269)

Words are sorted in an unknown alphabet. For each adjacent pair, the **first differing character** gives an edge a → b (a comes before b). Then topologically sort all characters that appear.

Edge cases that interviewers check:
- **Prefix rule**: if word1 is longer than word2 and word2 is a prefix of word1 ("abc" before "ab"), the input is invalid: return "".
- Only the first difference matters; later characters give no information.
- Characters with no constraints must still appear in the output.
- A cycle means no valid alphabet.
- Do not add duplicate edges to in-degree counts (or use sets).

## Sequence Reconstruction (LC 444)

Is org the unique shortest common supersequence of the given sequences? Build edges from consecutive elements; the topological order must be unique (queue size always 1) and equal to org.

## Verifying an order

**Verifying an Alien Dictionary** (LC 953): map each letter to its rank and compare adjacent words: O(total length). No sort needed.

## Other constraint graphs

- **Course Schedule IV** (LC 1462): transitive prerequisite queries; propagate ancestor sets in topological order, or Floyd–Warshall on reachability for small n.
- **Sort Items by Groups** (LC 1203): two topological sorts.
- **Build a Matrix With Conditions** (LC 2392): independent topological orders for rows and columns.
- **Smallest String With Swaps** uses union-find, not ordering, despite similar wording.
`,
    doubts: [
      ["Why only the first differing character?", "Lexicographic comparison stops there. The characters after it are unconstrained by this pair."],
      ["Why is 'abc' before 'ab' invalid?", "In any alphabet, a proper prefix sorts before the longer word. Seeing the longer word first contradicts every possible order."],
    ],
    revise: md`
? Alien Dictionary edge? :: First differing character of adjacent words: a → b.
? Invalid prefix case? :: A word followed by its own proper prefix → return "".
? Unconstrained characters? :: Include them (in-degree 0).
? Unique reconstruction test? :: Topological order with a queue size of 1 at every step.
? Verify an order quickly? :: Rank map + adjacent comparisons.
`,
    pitfalls: ["Missing the prefix case", "Comparing beyond the first difference", "Omitting isolated characters", "Duplicate edges double-counting in-degrees"],
    quiz: [Q("Words ['wrt','wrf','er','ett','rftt']: the first edge derived is…", ["w → e", "*t → f", "r → t", "e → r"], "'wrt' vs 'wrf' differ first at t/f.")],
    sources: [S.article("Alien dictionary discussion", "LeetCode", "https://leetcode.com/problems/alien-dictionary/"), S.article("Topological sorting", "cp-algorithms", "https://cp-algorithms.com/graph/topological-sort.html")],
    problems: [269, 444, 953, 1462, 2392],
  },

  // ─────────────── union-find ───────────────
  "dsu-core": {
    blurb: "Disjoint set union: find with path compression, union by rank or size, near-constant amortised time, and the inverse-Ackermann bound behind it.",
    signals: ["Merge groups and ask \"same group?\" repeatedly", "Connectivity under edge additions (online)", "Kruskal's MST"],
    widgets: ["union-find"],
    lesson: md`
## Operations

- **find(x)**: the representative (root) of x's set.
- **union(a, b)**: merge the sets containing a and b.

Each set is a tree of parent pointers; the root represents the set.

\`\`\`
parent = list(range(n)); size = [1] * n
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # path halving
        x = parent[x]
    return x
def union(a, b):
    a, b = find(a), find(b)
    if a == b: return False
    if size[a] < size[b]: a, b = b, a
    parent[b] = a; size[a] += size[b]
    return True
\`\`\`

[[widget:union-find]]

## The two optimisations

- **Union by rank or size**: attach the smaller tree under the larger. Alone, it keeps height O(log n).
- **Path compression**: during find, point nodes on the path directly (or every other node: path halving) to the root.

Together: amortised **O(α(n))** per operation, where α is the inverse Ackermann function: α(n) ≤ 4 for any n up to 2^(2^(2^65536)). Tarjan proved this bound (1975) and that it is optimal for this class of algorithms.

## Useful extras

- **Component count**: start at n, decrement on every successful union.
- **Set size**: maintained at the root.
- **Return value of union**: False means already connected, which is how Kruskal and cycle detection use it.
- **Recursive find** is concise (parent[x] = find(parent[x])) but can hit recursion limits before compression kicks in; iterative halving avoids that.

## What DSU cannot do

- **Split** sets (deletion of edges): not supported. Process offline in reverse (add edges in reverse time) when possible.
- Path queries or shortest paths: no.
- Undo: possible with **rollback DSU** (union by rank, no path compression, keep a change stack): O(log n) per operation, used in offline dynamic connectivity.
`,
    doubts: [
      ["Do I need both optimisations?", "Either alone gives O(log n) amortised, which passes almost every interview problem. Both together give O(α(n)). Mention both; implement at least path compression plus union by size."],
      ["What is α(n) intuitively?", "The inverse of a function that grows absurdly fast (Ackermann's). For every input size that will ever exist, α(n) ≤ 4, so it is constant in practice, but not in theory."],
      ["Union by rank or by size?", "Both give the same bounds. Size is often more useful because you also need component sizes."],
      ["Can union-find handle edge deletions?", "Not directly. If all operations are known in advance, reverse time (deletions become additions), or use a rollback DSU in divide and conquer over time."],
    ],
    revise: md`
? Path compression? :: During find, point nodes toward the root.
? Union by size? :: Attach the smaller tree under the larger.
? Amortised cost with both? :: O(α(n)), effectively constant.
? Either alone? :: O(log n).
? Count components? :: Start at n; decrement on each successful union.
? Deletions? :: Not supported: reverse time offline, or rollback DSU.
`,
    pitfalls: ["Comparing x and y instead of find(x) and find(y)", "Recursive find on deep chains before compression", "Forgetting to update size at the new root"],
    quiz: [Q("union returns False when…", ["sizes are equal", "*both elements already share a root", "the graph is a tree", "rank is zero"], "That is how cycles are detected.")],
    template: `struct DSU {
  vector<int> p, sz; int comps;
  DSU(int n): p(n), sz(n, 1), comps(n) { iota(p.begin(), p.end(), 0); }
  int find(int x) { while (p[x] != x) { p[x] = p[p[x]]; x = p[x]; } return x; }
  bool unite(int a, int b) {
    a = find(a); b = find(b); if (a == b) return false;
    if (sz[a] < sz[b]) swap(a, b); p[b] = a; sz[a] += sz[b]; comps--; return true;
  }
};`,
    sources: [S.paper("Efficiency of a good but not linear set union algorithm (Tarjan, 1975)", "Journal of the ACM", "https://doi.org/10.1145/321879.321884"), S.article("Disjoint set union", "cp-algorithms", "https://cp-algorithms.com/data_structures/disjoint_set_union.html"), S.book("Algorithms, 4th ed. §1.5 Case Study: Union-Find", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/15uf/")],
    problems: [547, 323, 684, 990],
  },
  "dsu-applications": {
    blurb: "Union-find in the wild: merging accounts, equations, similar strings, stones and islands added over time. The trick is choosing what to union.",
    signals: ["Group items that are transitively equivalent", "Connectivity questions while edges are added", "Count groups after merging rules"],
    lesson: md`
## Choose the elements and the unions

The art is modelling: what are the elements, and which pairs get merged?

| Problem | Elements | Union |
|---|---|---|
| Accounts Merge (LC 721) | emails | all emails of one account (to the first) |
| Number of Provinces (LC 547) | cities | connected pairs |
| Redundant Connection (LC 684) | vertices | edges; the failing union is the answer |
| Satisfiability of Equality Equations (LC 990) | letters | all '=='; then check '!=' pairs |
| Most Stones Removed (LC 947) | rows and columns (as separate ids) | each stone unions its row with its column; answer = stones − components |
| Similar String Groups (LC 839) | strings | pairs that are similar |
| Smallest String With Swaps (LC 1202) | indices | swap pairs; sort characters within each component |
| Number of Islands II (LC 305) | cells r·C + c | new land with adjacent land |
| Lexicographically Smallest Equivalent String (LC 1061) | letters | union toward the smaller letter |
| Making a Network Connected (LC 1319) | computers | cables; answer = components − 1 if enough cables |

## Patterns

- **Union everything, then answer queries**: the two-phase structure (equality equations, swaps).
- **Answer = items − components** whenever each union removes exactly one "unit" (stones).
- **Map arbitrary keys to ids** with a dictionary (emails, coordinates) or use a dict-based DSU directly.
- **Separate id spaces**: rows as 0..R−1 and columns as R..R+C−1 so they cannot collide.

## DSU vs BFS/DFS

For a static graph, BFS/DFS components are just as good. DSU shines when edges arrive over time (online), when you need to merge sets with extra data (sizes, minima), or when the graph is implicit in rules rather than given as adjacency.
`,
    doubts: [
      ["Why is Most Stones Removed equal to stones − components?", "Within a connected group of stones (sharing rows or columns transitively), you can always remove stones one by one until a single stone remains. Each component keeps one stone."],
      ["Why check '!=' after all '=='?", "Equalities are transitive and must all be applied before a disequality can be checked; checking early could miss an equality that arrives later in the list."],
    ],
    revise: md`
? Modelling question? :: What are the elements, and which pairs are merged?
? Accounts Merge? :: Union emails within each account; group by root; sort.
? Most Stones Removed? :: Union row id with column id per stone; answer = stones − components.
? Equality equations? :: Union all ==, then verify every != has different roots.
? Smallest String With Swaps? :: Union swappable indices; sort characters per component.
? Network connected? :: Need ≥ n − 1 cables; answer = components − 1.
`,
    pitfalls: ["Row and column ids colliding", "Checking disequalities before all unions", "Forgetting to map keys to ids"],
    quiz: [Q("Stones at (0,0),(0,1),(1,0),(1,2),(2,1),(2,2): maximum removable?", ["3", "4", "*5", "6"], "All stones form one component: 6 − 1.")],
    sources: [S.article("Disjoint set union (applications)", "cp-algorithms", "https://cp-algorithms.com/data_structures/disjoint_set_union.html"), S.article("Union-find applications", "USACO Guide", "https://usaco.guide/gold/dsu")],
    problems: [721, 547, 684, 990, 947, 839, 1202, 305, 1061, 1319, 399],
  },
  "weighted-dsu": {
    blurb: "Union-find that also stores a relation to the parent (a ratio, an offset, a parity), so it can answer \"what is a/b?\" or \"same or opposite team?\" while merging.",
    signals: ["Ratios between variables (a / b = k)", "Parity or opposition constraints (enemies, bipartiteness online)", "Relative positions or offsets that must stay consistent"],
    lesson: md`
## The idea

Store weight[x] = the relation between x and parent[x]. During find, compose relations along the path while compressing, so weight[x] becomes the relation between x and its root.

## Evaluate Division (LC 399)

weight[x] = x / parent[x]. find(x) returns the root and multiplies weights along the path. union(a, b, k) meaning a / b = k: with roots ra, rb and wa = a / ra, wb = b / rb, set parent[ra] = rb and weight[ra] = k · wb / wa. Query a / b: if roots differ, −1; else wa / wb. (A BFS/DFS over a weighted graph also works for small inputs.)

## Parity DSU

weight[x] ∈ {0, 1} = whether x is on the same side as its parent. Composition is XOR. Uses: online bipartiteness (adding an edge u–v requires parity(u) ≠ parity(v); if they share a root with equal parity, an odd cycle appears), "is A friends or enemies with B" puzzles, 2-colouring constraints arriving over time.

## Offsets

weight[x] = position[x] − position[parent[x]]: check consistency of difference constraints like "x is 3 units right of y" as they arrive (classic in competitive programming).

## Implementation detail

Write find recursively, or iteratively with a stack, so weights are updated from the root down: weight[x] = weight[x] ∘ weight[parent[x]] after parent[x] has been compressed.
`,
    doubts: [
      ["Why must weights be composed during path compression?", "Compression changes x's parent to the root. weight[x] must then describe x relative to the root, which is the composition of the relations along the old path."],
      ["Evaluate Division with BFS instead?", "Fine for the LeetCode limits: build a graph with edges a→b (k) and b→a (1/k) and multiply along a BFS path per query. Weighted DSU answers each query in near-constant time."],
    ],
    revise: md`
? Weighted DSU stores? :: The relation of each node to its parent, composed to the root on find.
? Ratio union formula? :: weight[ra] = k · wb / wa (with a/b = k, wa = a/ra, wb = b/rb).
? Parity composition? :: XOR.
? Online bipartiteness? :: Parity DSU: an edge between equal-parity nodes with the same root = odd cycle.
`,
    pitfalls: ["Updating weights in the wrong order during compression", "Division by zero / unknown variables in queries"],
    quiz: [Q("Parity DSU: u and v share a root with parities 1 and 1. Adding edge u–v…", ["is fine", "*creates an odd cycle (not bipartite)", "creates an even cycle", "merges two components"], "Same parity means same side.")],
    sources: [S.article("Disjoint set union: supporting the parity / distance to the representative", "cp-algorithms", "https://cp-algorithms.com/data_structures/disjoint_set_union.html#support-the-parity-of-the-path-length-checking-bipartiteness-online")],
    problems: [399, 785, 886],
  },
  "offline-dsu": {
    blurb: "Sort queries and edges together, or run time backwards, so a structure that only supports merging can answer threshold and deletion problems.",
    signals: ["Queries with a limit (\"using edges < limit, connected?\")", "Edges or cells removed over time", "Answer many queries that can be reordered"],
    lesson: md`
## Sort and sweep

**Checking Existence of Edge Length Limited Paths** (LC 1697): sort edges by weight and queries by limit. Sweep limits upward, unioning every edge below the current limit, then answer "connected?" with find. O((E + Q) log + α). This is Kruskal with queries interleaved.

Same idea: **Number of Good Paths** (LC 2421: process nodes in increasing value, union with smaller-or-equal neighbours, count same-value nodes per component), **Minimum Effort Path** with DSU, **Swim in Rising Water** (process cells by elevation).

## Reverse time for deletions

Union-find cannot split, but if the full list of deletions is known, start from the final graph (all deletions applied) and add edges back in reverse order, recording answers backwards. **Bricks Falling When Hit** (LC 803): remove all hit bricks, union the rest (with a virtual "roof" node), then add hits back in reverse and measure how much the roof component grows.

## Rollback DSU and divide and conquer over time

When edges are both added and removed and queries interleave, keep union by rank **without** path compression and a stack of changes; undo by popping. Combined with a segment tree over time (each edge lives on an interval), this answers offline dynamic connectivity in O(log² n) per operation. Name-level for interviews.

## Kruskal reconstruction tree

Kruskal's process can be recorded as a tree where each merge creates a new parent node weighted by the edge. Queries like "minimum maximum edge between u and v" become LCA queries on that tree. Advanced, but a great "next level" remark.
`,
    doubts: [
      ["Why does sorting queries make DSU applicable?", "Each query asks about a graph restricted to edges below a limit. As the limit grows, the graph only gains edges, which DSU handles. Sorting puts queries in exactly that growing order."],
      ["Why a virtual roof node in Bricks Falling?", "Stable means connected to the top row. Uniting every top-row brick with one virtual node turns 'connected to the roof' into 'same component as the roof node', and component sizes answer how many bricks a hit drops."],
    ],
    revise: md`
? Threshold queries recipe? :: Sort edges and queries by weight/limit; union edges below each limit; answer with find.
? Deletions known in advance? :: Reverse time: start from the end state and add back.
? Bricks Falling trick? :: Virtual roof node; add hits back in reverse; measure roof-component growth.
? Interleaved adds and deletes? :: Rollback DSU (no compression) + segment tree over time.
`,
    pitfalls: ["Losing original query order (store indices)", "Path compression in a rollback DSU (breaks undo)"],
    quiz: [Q("Queries 'connected using edges with weight < L' are answered offline by…", ["Dijkstra per query", "*sorting edges and queries, sweeping with DSU", "Floyd–Warshall", "BFS per query"], "Kruskal-style sweep.")],
    sources: [S.article("Deleting from a data structure in O(T(n) log n) (offline dynamic connectivity)", "cp-algorithms", "https://cp-algorithms.com/data_structures/deleting_in_log_n.html"), S.article("Disjoint set union", "cp-algorithms", "https://cp-algorithms.com/data_structures/disjoint_set_union.html")],
    problems: [1697, 2421, 803, 1724],
  },

  // ─────────────── shortest paths ───────────────
  dijkstra: {
    blurb: "Shortest paths from one source with non-negative weights: always settle the closest unsettled vertex. Heap implementation, correctness argument, and why negative edges break it.",
    signals: ["Weighted graph, non-negative weights, minimum total cost", "Network delay, cheapest route, minimum time", "Grid with varying move costs"],
    widgets: ["dijkstra"],
    lesson: md`
## The algorithm

\`\`\`
dist = [inf] * n; dist[s] = 0
pq = [(0, s)]
while pq:
    d, u = heappop(pq)
    if d > dist[u]: continue           # stale entry
    for v, w in adj[u]:
        if d + w < dist[v]:
            dist[v] = d + w
            heappush(pq, (dist[v], v))
\`\`\`

O((V + E) log V) with a binary heap (lazy version: O(E log E), same thing).

[[widget:dijkstra]]

## Why it is correct

Invariant: when u is popped with d = dist[u], that distance is final. Suppose a shorter path to u existed; it leaves the set of settled vertices at some edge x → y with y unsettled. Since all weights are ≥ 0, dist(y) ≤ length of that path < d, so y would have been popped before u: contradiction. The argument fails if a later edge could be negative, which is why **Dijkstra requires non-negative weights**.

## Negative weights

Even one negative edge can make Dijkstra wrong: a vertex can be settled before a cheaper path through a negative edge is found. Use Bellman–Ford (or SPFA), or on DAGs relax in topological order. With negative cycles, shortest paths are undefined.

## Variants and details

- **Early exit**: stop when the target is popped (single-pair queries).
- **Path reconstruction**: parent[v] = u on relaxation.
- **Dense graphs**: the O(V²) array version (scan for the minimum) beats the heap when E ≈ V².
- **Many sources**: push all sources with distance 0 (nearest facility).
- **Counting shortest paths** (LC 1976): ways[v] += ways[u] when d + w == dist[v]; reset when strictly smaller. Use mod.
- **Second shortest** or K shortest (LC 2045 variants): allow each vertex to be popped up to K times.
- **Network Delay Time** (LC 743): max of all distances.
- **Path with Maximum Probability** (LC 1514): maximise products; use a max-heap (or minimise −log p).

## Dijkstra vs BFS vs Bellman–Ford vs Floyd

| Weights | Single source | All pairs |
|---|---|---|
| unweighted | BFS O(V + E) | BFS from each vertex |
| 0/1 | 0-1 BFS O(V + E) | |
| non-negative | Dijkstra O(E log V) | Dijkstra from each vertex |
| negative, no negative cycles | Bellman–Ford O(VE) | Floyd–Warshall O(V³), Johnson |
| DAG, any weights | topological relaxation O(V + E) | |
`,
    doubts: [
      ["Why is the lazy 'if d > dist[u]: continue' needed?", "A vertex can be pushed several times as its distance improves. Older entries are stale: processing them would relax edges with outdated distances, wasting time (and in some variants causing wrong counts)."],
      ["Why does a single negative edge break Dijkstra?", "Dijkstra finalises a vertex when popped. A cheaper route that goes through a negative edge discovered later cannot correct a finalised vertex's descendants. Example: s→a (2), s→b (5), b→a (−4): Dijkstra settles a at 2, but the true distance is 1."],
      ["Can I add a constant to make weights non-negative?", "No. Paths with more edges get penalised more, changing which path is shortest. Johnson's algorithm instead reweights with potentials from Bellman–Ford, which preserves shortest paths."],
      ["Is Dijkstra the same as Prim?", "Same skeleton, different key: Prim keys a vertex by the single cheapest edge connecting it to the tree; Dijkstra keys it by the total distance from the source."],
    ],
    revise: md`
? Dijkstra complexity (binary heap)? :: O((V + E) log V).
? Stale entry check? :: if d > dist[u]: continue.
? Why correct? :: Popped distances are final because remaining weights are non-negative.
? Negative edges? :: Not allowed: use Bellman–Ford or DAG relaxation.
? Dense graph version? :: O(V²) array scan.
? Count shortest paths? :: Add ways on ties, reset on strict improvement.
? Max probability path? :: Max-heap on probability (or Dijkstra on −log p).
`,
    pitfalls: ["Using Dijkstra with negative weights", "Not skipping stale entries", "Marking vertices visited when pushed (wrong for Dijkstra)", "Overflow when distances exceed 32 bits"],
    quiz: [
      Q("s→a (2), s→b (5), b→a (−4). Dijkstra reports dist(a) =", ["1", "*2", "5", "−4"], "a is settled at 2 before b is processed; the true distance is 1."),
      Q("Dijkstra on a complete graph with 5000 vertices: better implementation?", ["Binary heap", "*O(V²) array scan", "Fibonacci heap always", "BFS"], "E ≈ V², so the heap adds a log factor."),
    ],
    sources: [S.paper("A note on two problems in connexion with graphs (Dijkstra, 1959)", "Numerische Mathematik", "https://doi.org/10.1007/BF01386390"), S.article("Dijkstra algorithm (dense and sparse)", "cp-algorithms", "https://cp-algorithms.com/graph/dijkstra.html"), S.book("Algorithms, 4th ed. §4.4 Shortest Paths", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/44sp/"), S.book("Algorithms, chapter 8: Shortest Paths", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/08-sssp.pdf")],
    problems: [743, 1514, 1976, 2045, 1786, 882, 1631],
  },
  "zero-one-bfs": {
    blurb: "Edge weights only 0 or 1: a deque replaces Dijkstra's heap. Push 0-edges to the front and 1-edges to the back for O(V + E) shortest paths.",
    signals: ["Moves that are free versus moves that cost one (follow an arrow vs change it)", "Minimum number of obstacles to remove, walls to break, flips to make", "Grid with two kinds of steps"],
    lesson: md`
## The algorithm

\`\`\`
dist = [inf] * n; dist[s] = 0; dq = deque([s])
while dq:
    u = dq.popleft()
    for v, w in adj[u]:          # w in {0, 1}
        if dist[u] + w < dist[v]:
            dist[v] = dist[u] + w
            if w == 0: dq.appendleft(v)
            else:      dq.append(v)
\`\`\`

The deque always holds vertices with distances d and d + 1 only, with all d's in front, which is exactly the order Dijkstra would pop them. O(V + E).

## Problems

- **Minimum Cost to Make at Least One Valid Path in a Grid** (LC 1368): following a cell's arrow costs 0, any other direction costs 1.
- **Minimum Obstacle Removal to Reach Corner** (LC 2290): entering an obstacle costs 1, empty costs 0.
- **Shortest path where some edges are free**: tolls, teleports.
- **Minimum number of reversals to make a path from 1 to n**: add every edge forward with 0 and backward with 1.

## Generalisations

- Weights in a small range [0, k]: **Dial's algorithm** (an array of k + 1 buckets used circularly): O(V·k + E).
- General non-negative weights: Dijkstra.

## Correctness note

As with Dijkstra, a vertex may be pushed more than once; process it again only if its distance improved (or skip stale pops by checking the distance).
`,
    doubts: [
      ["Why does pushing to the front for 0-edges keep the order correct?", "A 0-edge gives v the same distance as u, which is the smallest distance currently in the deque, so v belongs at the front. A 1-edge gives distance + 1, the largest value the deque can hold, so v belongs at the back."],
      ["Can a vertex be processed twice?", "It can be pushed twice if its distance improves; when popped again with the improved value, it is processed correctly. Either allow it or skip pops whose stored distance is stale."],
    ],
    revise: md`
? 0-1 BFS rule? :: 0-edge → push front; 1-edge → push back.
? Complexity? :: O(V + E).
? Edge reversal cost model? :: Forward edge 0, reversed edge 1.
? Weights in [0, k]? :: Dial's algorithm with k + 1 buckets.
`,
    pitfalls: ["Using a plain queue (wrong with 0-edges)", "Using Dijkstra's heap (works but O(E log V))"],
    quiz: [Q("Minimum reversals to connect 1 to n in a directed graph: model?", ["BFS on original edges", "*0-1 BFS with reversed edges costing 1", "Dijkstra with all weights 1", "Topological sort"], "Original direction is free, reversing costs one.")],
    sources: [S.article("0-1 BFS", "cp-algorithms", "https://cp-algorithms.com/graph/01_bfs.html"), S.article("Dial's algorithm (bucket queue)", "Wikipedia", "https://en.wikipedia.org/wiki/Bucket_queue")],
    problems: [1368, 2290, 1466],
  },
  "bellman-ford": {
    blurb: "Relax every edge V − 1 times: handles negative weights, detects negative cycles, and with a round limit solves \"cheapest flight within K stops\".",
    signals: ["Negative edge weights", "Detect a negative cycle (arbitrage)", "At most K edges / stops on the path"],
    widgets: ["bellman-ford"],
    lesson: md`
## The algorithm

dist[s] = 0. Repeat V − 1 times: for every edge (u, v, w), if dist[u] + w < dist[v], update it. O(V · E).

[[widget:bellman-ford]]

**Why V − 1 rounds:** a shortest path without cycles has at most V − 1 edges. After round i, every vertex whose shortest path uses at most i edges has its correct distance (induction). So after V − 1 rounds all distances are correct, if no negative cycle is reachable.

**Negative cycle detection:** run one more round; if any distance still decreases, a negative cycle is reachable from s. To find it, follow parent pointers V times from the updated vertex (to land inside the cycle), then walk the cycle.

## Cheapest Flights Within K Stops (LC 787)

At most k stops = at most k + 1 edges. Run exactly k + 1 rounds, and in each round relax from a **copy of the previous round's distances**, so a single round cannot chain several edges. O(k · E). (A Dijkstra over states (city, stops) also works.)

## SPFA (queue-based Bellman–Ford)

Only relax edges out of vertices whose distance changed, using a queue. Often much faster in practice, still O(VE) worst case (adversarial inputs exist). Detect negative cycles by counting how many times a vertex is enqueued (≥ V).

## Applications

- **Currency arbitrage**: edge weight −log(rate); a negative cycle is an arbitrage opportunity.
- **Difference constraints** (x_j − x_i ≤ c): edges i → j with weight c; a feasible assignment exists iff no negative cycle (used in scheduling and timing analysis).
- **Distance-vector routing** (RIP) is a distributed Bellman–Ford, with the famous count-to-infinity problem.
- **Johnson's algorithm** uses one Bellman–Ford to reweight edges, then Dijkstra from every vertex: all-pairs in O(VE log V) with negative weights.
`,
    doubts: [
      ["Why must K-stops use a copy of the previous round?", "Relaxing in place lets an edge use a distance improved earlier in the same round, effectively chaining two edges in one round and exceeding the stop limit."],
      ["Does Bellman–Ford work on undirected graphs with negative edges?", "An undirected negative edge is a negative cycle of length 2 (go back and forth), so shortest paths are undefined. Negative weights only make sense on directed graphs."],
      ["How do I report vertices whose distance is −∞?", "After detecting updates in round V, every vertex reachable from a vertex on a negative cycle has distance −∞. Mark the updated vertices and propagate with BFS/DFS."],
    ],
    revise: md`
? Rounds needed? :: V − 1 (shortest simple paths have ≤ V − 1 edges).
? Complexity? :: O(V·E).
? Negative cycle detection? :: Any update in a V-th round.
? K stops? :: k + 1 rounds relaxing from the previous round's copy.
? Arbitrage? :: Weights −log(rate); negative cycle = arbitrage.
? SPFA? :: Queue of changed vertices; fast on average, O(VE) worst case.
? Johnson's algorithm? :: Bellman–Ford potentials, then Dijkstra from every vertex.
`,
    pitfalls: ["In-place relaxation for the K-stops limit", "Overflow when adding to infinity (check dist[u] != inf first)", "Calling Bellman–Ford on undirected graphs with negative edges"],
    quiz: [Q("Bellman–Ford on V = 5 still updates in round 5. Conclusion?", ["Normal", "*A negative cycle is reachable", "Graph disconnected", "Needs 10 rounds"], "Distances are final after V − 1 rounds otherwise.")],
    sources: [S.article("Bellman–Ford algorithm", "cp-algorithms", "https://cp-algorithms.com/graph/bellman_ford.html"), S.article("Finding a negative cycle in the graph", "cp-algorithms", "https://cp-algorithms.com/graph/finding-negative-cycle-in-graph.html"), S.book("Algorithms, chapter 8: Shortest Paths (§8.7 Bellman–Ford)", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/08-sssp.pdf")],
    problems: [787, 743, 1334],
  },
  "floyd-warshall": {
    blurb: "All-pairs shortest paths in three nested loops: allow intermediate vertices one at a time. O(V³), handles negative edges, and doubles as transitive closure.",
    signals: ["Distances between all pairs, V ≤ ~400", "Transitive relationships (reachability, prerequisites) for many queries", "City with the fewest reachable neighbours within a threshold"],
    widgets: ["floyd-warshall"],
    lesson: md`
## The algorithm

\`\`\`
for k in range(V):
    for i in range(V):
        for j in range(V):
            dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
\`\`\`

Initialise dist[i][i] = 0, dist[i][j] = w(i, j) for edges, ∞ otherwise. O(V³) time, O(V²) space.

[[widget:floyd-warshall]]

## Why k must be the outer loop

It is DP over a growing set of allowed intermediate vertices: after iteration k, dist[i][j] is the shortest path using only intermediates from {0, …, k}. A path through k splits into i ⇝ k and k ⇝ j, both using intermediates < k, which were final after the previous iteration. Putting k inside breaks this order and gives wrong answers.

## Properties

- **Negative edges** are fine; a **negative cycle** shows up as dist[i][i] < 0.
- **Path reconstruction**: keep next[i][j] (the first hop), updated when dist improves via k: next[i][j] = next[i][k].
- In place is safe: row k and column k do not change during iteration k (dist[i][k] + dist[k][k] = dist[i][k] when dist[k][k] = 0).

## Transitive closure (Warshall)

reach[i][j] |= reach[i][k] and reach[k][j]. With bitsets, O(V³ / 64). **Course Schedule IV** (LC 1462) answers many "is a a prerequisite of b?" queries this way.

## Problems

- **Find the City With the Smallest Number of Neighbours at a Threshold Distance** (LC 1334).
- **Evaluate Division** (LC 399) with products instead of sums (small graphs).
- **Minimum cost to convert strings** (LC 2976): Floyd on 26 letters, then sum per position.

## When not to use it

V = 10⁴ means 10¹² operations. For sparse graphs and all pairs, run Dijkstra from every vertex (O(V E log V)); with negative edges, Johnson's algorithm.
`,
    doubts: [
      ["Why must k be the outermost loop?", "The DP state is 'shortest path using intermediates from the first k vertices'. All pairs must be updated for a given k before moving to k + 1. With k inside, dist[i][k] and dist[k][j] may not yet account for the intermediates they need."],
      ["How is a negative cycle detected?", "If after the algorithm dist[i][i] < 0 for some i, i lies on (or can reach and return through) a negative cycle. Distances involving such vertices are not meaningful."],
      ["Floyd or Dijkstra from every vertex?", "Floyd for dense graphs, small V (≤ 400–500) or negative edges; Dijkstra from each vertex for sparse graphs with non-negative weights."],
    ],
    revise: md`
? Floyd–Warshall loop order? :: k outermost, then i, then j.
? Complexity? :: O(V³) time, O(V²) space.
? DP meaning after iteration k? :: Shortest paths using intermediates in {0..k}.
? Negative cycle check? :: dist[i][i] < 0.
? Transitive closure? :: reach[i][j] |= reach[i][k] & reach[k][j].
? Practical V limit? :: About 400–500.
`,
    pitfalls: ["k as an inner loop", "Overflow adding two infinities (use a large but safe sentinel or check)", "Forgetting dist[i][i] = 0"],
    quiz: [Q("Floyd–Warshall with V = 300 does about how many relaxations?", ["9·10⁴", "*2.7·10⁷", "2.7·10⁹", "300"], "300³.")],
    sources: [S.paper("Algorithm 97: Shortest path (Floyd, 1962)", "Communications of the ACM", "https://doi.org/10.1145/367766.368168"), S.article("Floyd–Warshall algorithm", "cp-algorithms", "https://cp-algorithms.com/graph/all-pair-shortest-path-floyd-warshall.html"), S.book("Algorithms, chapter 9: All-Pairs Shortest Paths", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/09-apsp.pdf")],
    problems: [1334, 1462, 399, 2976],
  },
  "state-dijkstra": {
    blurb: "Dijkstra where a vertex is a richer state (city + stops used, cell + coupons left) or the cost is not a plain sum (maximum edge, probability). The most common way shortest paths appear in Google interviews.",
    signals: ["Shortest path with an extra resource (stops, fuel, discounts, keys)", "Minimise the maximum step (effort, time to swim)", "Edge cost depends on time or state"],
    lesson: md`
## Expand the state

If the cost of future moves depends on something besides the vertex, put it in the state: (vertex, stops used), (cell, coupons left), (node, time mod k). Run Dijkstra on the product graph. Size: V × (state values).

- **Cheapest Flights Within K Stops** (LC 787): state (city, stops). With Dijkstra keyed on cost, keep the best stops count seen per city to prune: a state with more stops and higher cost is dominated.
- **Minimum cost to reach destination in time** (LC 1928): state (city, time) or Dijkstra on cost with a time check.
- **Shortest path with k discounts / free edges**: state (vertex, discounts left), edges of weight w or w/2 (or 0) consuming one.
- **Electric car with charging**: (city, battery level).

## Change the cost function

Dijkstra works for any **monotone** path cost (extending a path never makes it cheaper), not only sums:

- **Path With Minimum Effort** (LC 1631): cost = max of steps along the path; relax with max(d, |h[u] − h[v]|).
- **Swim in Rising Water** (LC 778): cost = max elevation along the path.
- **Path with Maximum Probability** (LC 1514): maximise products (all ≤ 1), with a max-heap.
- **Minimum time with waiting** (LC 2045 second minimum, LC 2577 minimum time to visit a cell): edge availability depends on arrival time; wait in place when needed.

## Dominance pruning

When the state space is large, prune states that are dominated (more cost and less resource left than a state already seen). This keeps state Dijkstra practical.

## Alternatives

Minimax problems also yield to binary search + BFS and to union-find (Kruskal order). Present one and name the others.
`,
    doubts: [
      ["Why can Dijkstra minimise the maximum edge?", "Its correctness needs only that extending a path never decreases its cost and that costs are compared consistently. max(d, w) ≥ d holds, so the same 'settled distances are final' argument goes through."],
      ["Why does K-stops need the stops in the state for Dijkstra?", "A cheaper path that used more stops may be unable to continue, while a more expensive path with fewer stops can. Keeping only the cheapest cost per city would discard the one that can still reach the destination."],
    ],
    revise: md`
? When to expand the state? :: When future costs depend on something besides the vertex (stops, coupons, time, battery).
? State graph size? :: V × number of extra values.
? Minimax path relaxation? :: new = max(d, w).
? Monotone cost requirement? :: Extending a path never lowers its cost.
? K stops with Dijkstra? :: State (city, stops); prune dominated states.
`,
    pitfalls: ["Dropping a state dimension that matters", "Non-monotone costs (Dijkstra breaks)", "Huge state spaces without dominance pruning"],
    quiz: [Q("Minimum effort path relaxation uses…", ["d + w", "*max(d, w)", "min(d, w)", "d · w"], "Effort is the maximum step on the path.")],
    sources: [S.article("Dijkstra on sparse graphs", "cp-algorithms", "https://cp-algorithms.com/graph/dijkstra_sparse.html"), S.book("Algorithms, chapter 8: Shortest Paths", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/08-sssp.pdf")],
    problems: [787, 1631, 778, 1514, 1928, 2577, 2045, 2093],
  },
  "a-star": {
    blurb: "Dijkstra guided by a heuristic estimate of the remaining distance. Admissible and consistent heuristics keep it optimal; bidirectional search and contraction hierarchies are how real map routing scales.",
    signals: ["Point-to-point shortest path with a known geometry (grids, maps)", "Large search spaces where Dijkstra explores too much", "Puzzle solving (8-puzzle) with a distance estimate"],
    lesson: md`
## A*

Order the priority queue by **f(v) = g(v) + h(v)**: g is the known distance from the start, h an estimate of the distance to the goal. With h = 0 it is Dijkstra.

- **Admissible** h never overestimates the true remaining distance: A* returns an optimal path.
- **Consistent** (monotone) h: h(u) ≤ w(u, v) + h(v). Then each vertex is settled once, like Dijkstra. Consistent implies admissible.

Grid heuristics: **Manhattan** distance for 4-directional moves, **Chebyshev** or octile for 8 directions, Euclidean for any-angle movement. A better (larger but still admissible) heuristic explores fewer nodes.

## Bidirectional search

Run searches from both ends and stop when they meet (with a correct stopping rule for weighted graphs: when the sum of the two frontiers' minima reaches the best meeting cost). Roughly square-roots the explored region.

## How Google Maps-style routing scales

Plain Dijkstra on a continental road graph (hundreds of millions of edges) is too slow per query. Production systems preprocess: **contraction hierarchies** (add shortcut edges by contracting unimportant vertices, then run a bidirectional search upward only), **ALT** (A* with landmark-based lower bounds), arc flags and transit-node routing. Queries drop to milliseconds. Great to mention when an interview drifts into maps or system design.

## Interview usage

You will rarely be asked to code A*. Know: definition of f, admissible vs consistent, that it reduces to Dijkstra with h = 0, and when it helps.
`,
    doubts: [
      ["What happens with an inadmissible heuristic?", "A* may return a suboptimal path faster. That trade-off (weighted A*, f = g + ε·h) is deliberate in games and robotics where speed beats optimality."],
      ["Is Manhattan distance admissible for 8-directional movement?", "No: a diagonal step covers Manhattan distance 2 for cost 1 (or √2), so Manhattan can overestimate. Use Chebyshev (max(|dx|, |dy|)) or octile distance."],
    ],
    revise: md`
? A* priority? :: f = g + h.
? Admissible? :: h never overestimates: optimal paths.
? Consistent? :: h(u) ≤ w(u,v) + h(v): vertices settled once.
? h = 0? :: Dijkstra.
? 4-direction grid heuristic? :: Manhattan.
? 8-direction grid heuristic? :: Chebyshev / octile.
? Production road routing? :: Contraction hierarchies, ALT, bidirectional search.
`,
    pitfalls: ["Overestimating heuristics while claiming optimality", "Manhattan on 8-directional grids"],
    quiz: [Q("A* with h ≡ 0 behaves like…", ["BFS", "*Dijkstra", "DFS", "Bellman–Ford"], "Only g remains.")],
    sources: [S.paper("A formal basis for the heuristic determination of minimum cost paths (Hart, Nilsson, Raphael, 1968)", "IEEE Transactions on Systems Science and Cybernetics", "https://doi.org/10.1109/TSSC.1968.300136"), S.paper("Contraction hierarchies: faster and simpler hierarchical routing in road networks (Geisberger et al., 2008)", "WEA 2008", "https://doi.org/10.1007/978-3-540-68552-4_24"), S.article("A* search algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/A*_search_algorithm")],
    problems: [1091, 773, 752],
  },
};
