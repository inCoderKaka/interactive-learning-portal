/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */
export const notes: Record<string, string> = {
  "subsets-combinations": `
## Template
choose → recurse → un-choose. State: start index, current path, remaining target.
Record the path at every node (subsets) or only at the leaves that meet the goal (combination sum).
Copy the path when recording (path[:] or new ArrayList(path)).
## Subsets (LC 78)
2ⁿ subsets; O(n·2ⁿ) including copying. Alternatives: include/exclude recursion, or bitmasks 0…2ⁿ−1.
## Duplicates (LC 90, 40)
Sort first; at the same depth skip a[i] when i > start and a[i] == a[i−1].
This skips duplicate branches, not duplicate values within one path.
## Combinations and sums
Combinations (LC 77): C(n, k) leaves; prune when the remaining elements are too few (n − i + 1 < k − len).
Combination sum (LC 39): reuse allowed → recurse with i, not i + 1; stop when the remainder < 0 (break early on sorted input).
Combination sum II (LC 40): each item once plus duplicate skipping.
Combination sum III (LC 216): digits 1–9, k numbers.
Letter combinations of a phone number (LC 17): product of choices, 4ⁿ worst case.
Generate parentheses (LC 22): add '(' while open < n, ')' while close < open; Catalan(n) results.
## Complexity talk
Count leaves × the cost to build each; pruning lowers the constant, rarely the bound.
## Backtracking vs DP
Enumerate every solution → backtracking. Count them or optimise over them → DP is usually polynomial.
`,
  permutations: `
## Two ways to generate
Used array: at each depth try every unused element; mark, recurse, unmark.
Swap-in-place: swap a[start] with each a[i ≥ start], recurse on start + 1, swap back.
n! permutations; O(n·n!) to output.
## Duplicates (LC 47)
Sort; skip a[i] if a[i] == a[i−1] and a[i−1] is not used (so equal values are placed in order).
For the swap method, keep a set of values already tried at this depth.
## next_permutation (LC 31)
From the right, find the first i with a[i] < a[i + 1] (the pivot); none → reverse everything.
Find the rightmost j > i with a[j] > a[i]; swap; reverse the suffix after i. O(n), in place.
Previous permutation mirrors the comparisons.
## k-th permutation (LC 60)
Factorial number system: digit = (k − 1) / (n − 1)!, take that unused number, reduce k, repeat. O(n²) or O(n log n) with a Fenwick tree.
## Related
Permutation in string is a sliding window, not backtracking.
Letter case permutation: branch only on letters. Beautiful arrangement: prune by divisibility at each position.
Heap's algorithm generates each permutation from the previous by one swap.
`,
  "constraint-search": `
## N-Queens (LC 51, 52)
Place row by row; track used columns, diagonals (r − c) and anti-diagonals (r + c) in sets or bitmasks.
Bitmask version: available = ~(cols | d1 | d2) & full; take the lowest bit with p & −p. Fast enough for n ≈ 15.
Count only (LC 52): no board building.
## Sudoku solver (LC 37)
Row, column and box sets (box index = (r / 3)·3 + c / 3).
Try 1–9 in each empty cell; undo on failure.
Pick the cell with the fewest candidates first (MRV): massive pruning.
Constraint propagation (naked singles) before searching.
## Expression add operators (LC 282)
Track the current value and the last operand; for '*': value − last + last × cur.
Skip numbers with leading zeros; use 64-bit values.
## Exact cover and Dancing Links
Sudoku, N-Queens and pentomino tiling reduce to exact cover; Knuth's Algorithm X with Dancing Links undoes choices in O(1).
## Pruning ideas
Most-constrained variable first; least-constraining value first.
Forward checking: fail as soon as a variable has no candidates.
Symmetry breaking (N-Queens: only the left half of the first row, then mirror).
Bounds: stop when the best possible result cannot beat the current best (branch and bound).
`,
  "grid-backtracking": `
## Word search (LC 79)
DFS from each cell matching word[0]; mark the cell visited (overwrite with '#'), recurse to 4 neighbours, restore.
O(r·c·3^L): after the first step there are at most 3 new directions.
Prune: count letters first (the board must contain enough of each); start from the rarer end of the word.
## Difference from flood fill
Flood fill marks cells permanently (each cell once, O(r·c)).
Backtracking unmarks on return, because a cell may belong to a different path later: exponential.
## Other problems
Path with maximum gold (LC 1219): try every start, backtrack over non-zero cells.
Unique paths III (LC 980): must visit every empty cell exactly once; count cells first and check at the end.
Robot room cleaner (LC 489): backtracking with relative directions and a "go back" move.
Rat in a maze, knight's tour (Warnsdorff's rule: move to the square with the fewest onward moves).
## Making it iterative
Explicit stack of (cell, direction index, path state); restoration happens when a frame pops.
`,
  "partition-backtracking": `
## Palindrome partitioning (LC 131)
At position i, try every end j where s[i..j] is a palindrome; recurse at j + 1.
Precompute isPal[i][j] by DP (O(n²)) so each check is O(1). Output is up to 2^(n−1) partitions.
Minimum cuts (LC 132) is DP, not backtracking.
## Partition to k equal sum subsets (LC 698)
Target = sum / k (must divide). Sort descending (big items fail fast).
Fill one bucket at a time; when it hits the target, start the next bucket from index 0.
Skip equal values after a failure; if an empty bucket fails, stop (symmetry).
Bitmask DP alternative: dp[mask] = filled amount mod target, O(n·2ⁿ).
Matchsticks to square (LC 473) is k = 4.
## Word break II (LC 140)
Backtrack over dictionary prefixes; memoise suffix → list of sentences.
Check word break I (LC 139) first: if no break exists, return early.
## Fair distribution of cookies (LC 2305)
Assign each bag to a child; prune when a child's sum ≥ the current best; skip children with identical totals.
## DP vs backtracking
Need every partition → backtracking. Need a count, a minimum or a yes/no → DP over (index, state) or bitmask DP.
`,
  "graph-representations": `
## Three representations
Adjacency list: O(V + E) space; iterate neighbours in O(deg). The default.
Adjacency matrix: O(V²) space; O(1) edge test; fine for dense graphs or V ≤ ~2000 (Floyd–Warshall).
Edge list: (u, v, w) triples; for Kruskal and Bellman–Ford.
Implicit graphs: neighbours generated on the fly (grids, word ladders, puzzle states).
## Vocabulary
Directed / undirected; weighted; simple (no self-loops or multi-edges); connected; strongly connected; DAG; tree = connected and acyclic with V − 1 edges.
Degree (in/out); path; cycle; component; dense (E ≈ V²) vs sparse (E ≈ V).
## Building from inputs
Edges list → defaultdict(list); add both directions when undirected.
Prerequisites [a, b] mean b → a: get the direction right.
Map string ids to integers when convenient. Grids: neighbours by direction vectors.
Word ladder: bucket words by wildcard patterns ("h*t") to avoid O(N²) pair checks.
## Conventions
BFS/DFS O(V + E). Dijkstra O((V + E) log V). Floyd O(V³). Say V and E, not n.
## Degree facts
Σ degrees = 2E (handshake lemma), so the number of odd-degree vertices is even.
A tree has V − 1 edges; E > V − 1 in a connected undirected graph means a cycle exists.
Isomorphism has no known polynomial algorithm in general; trees can be compared by canonical hashing.
`,
  bfs: `
## Algorithm
Queue with the source; mark visited when enqueuing (not when dequeuing), or nodes are queued many times.
Pop u; for each unvisited neighbour v: dist[v] = dist[u] + 1, parent[v] = u, enqueue. O(V + E).
## Why shortest paths
BFS processes nodes in non-decreasing distance order (the queue holds at most two distance levels), so the first visit is via a shortest path, in unweighted graphs only.
## Path reconstruction
Keep parent[]; walk back from the target and reverse.
All shortest paths (word ladder II): BFS layer by layer building a parent list, then DFS back.
## Multi-source and bidirectional
Multi-source: enqueue all sources at distance 0 (rotting oranges, 01 matrix, walls and gates). Equivalent to a virtual super-source.
Bidirectional: expand the smaller frontier from both ends; stop when they meet. Explores about 2·b^(d/2) instead of b^d nodes.
## Typical problems
Word ladder (LC 127), open the lock (LC 752), shortest path in a binary matrix (LC 1091, 8 directions), knight moves, minimum genetic mutation, snakes and ladders (LC 909).
Level-by-level processing when the answer is a level count.
Weighted edges → Dijkstra; 0/1 weights → 0-1 BFS.
`,
  dfs: `
## Algorithm
Visit u, mark it, recurse into unvisited neighbours. O(V + E). Recursive or with an explicit stack.
## Discovery and finish times
tin[u] when first visited, tout[u] when all descendants are done.
v is a descendant of u ⟺ tin[u] < tin[v] and tout[v] < tout[u] (parenthesis theorem).
Reverse finish order gives a topological order (DAG) and drives Kosaraju's SCC.
## Edge types (directed)
Tree edge: to an unvisited node. Back edge: to an ancestor still on the stack (gray) → a cycle.
Forward edge: to a finished descendant. Cross edge: to a finished node in another branch.
Undirected graphs have only tree and back edges.
## Connected components
Run DFS from each unvisited node; count the starts. Number of provinces (LC 547), number of islands.
Clone graph (LC 133): DFS with a map old → copy.
## DFS vs BFS
DFS: less memory on wide graphs, natural for cycles, ordering, components, backtracking, bridges.
BFS: shortest paths in unweighted graphs, level structure.
## Iterative DFS
Stack; mark when pushing (gives a valid traversal, but a different order from recursion).
For finish times, push (node, iterator index) frames, or push a node twice (enter and exit markers).
Recursion depth V = 10⁵ overflows Python and sometimes Java: convert.
`,
  "cycle-detection": `
## Undirected
DFS: a visited neighbour that is not the parent → a cycle. Watch parallel edges (compare edge ids, not node ids).
Union-find: an edge whose endpoints are already connected closes a cycle (redundant connection, LC 684).
Counting: a connected graph with E ≥ V has a cycle.
## Directed
Three colours: white (unvisited), gray (on the recursion stack), black (done). An edge to a gray node → a cycle.
"Visited" alone is not enough: reaching a black node is not a cycle.
Kahn's algorithm: if fewer than V nodes are output, a cycle exists (course schedule, LC 207).
## Eventual safe states (LC 802)
Safe = no path reaches a cycle. Colour-DFS: a node is safe iff it finishes black without hitting gray.
Or reverse the graph and run Kahn from the terminal nodes.
## Functional graphs (out-degree 1)
Every component is one cycle with trees hanging into it. Find cycles by walking with colouring or with Floyd.
Longest cycle in a graph (LC 2360), maximum employees at a meeting (LC 2127: cycles of length 2 plus chains).
## Redundant connection II (directed, LC 685)
Cases: a node with two parents (candidate edges), a cycle, or both; remove the edge that resolves both.
## Negative cycles
Bellman–Ford: a relaxation still possible in round V. Floyd: dist[i][i] < 0.
`,
  "grid-graphs": `
## Mechanics
Cell (r, c), neighbours by DIRS = [(1,0),(−1,0),(0,1),(0,−1)]; bounds check 0 ≤ nr < R and 0 ≤ nc < C.
Mark visited in place (overwrite) when allowed, else a visited set or matrix. Id = r·C + c.
## Flood fill family
Number of islands (LC 200): DFS or BFS from each unvisited '1'.
Max area, perimeter (count water or border edges), distinct islands (canonical shape signature of relative coordinates).
Surrounded regions (LC 130) and Pacific Atlantic (LC 417): start from the border and flood inward.
Number of closed islands, enclaves: remove border-connected land first.
## Multi-source BFS
Seed every source at distance 0: 01 matrix (LC 542), rotting oranges (LC 994), walls and gates, as far from land as possible (LC 1162).
Counts levels, so it gives the minimum time or distance to the nearest source.
## Shortest paths in grids
Unweighted → BFS. Weighted cells → Dijkstra. 0/1 costs (break a wall or not) → 0-1 BFS.
With extra state (keys collected, obstacles removed): BFS over (r, c, state) — see state-space search.
Path with minimum effort (LC 1631): Dijkstra on max-edge, or binary search plus BFS, or union-find by edge weight.
## Union-find on grids
Number of islands II (LC 305): add land online and union with neighbours; count components.
Swim in rising water (LC 778): union cells in order of height until the corners connect.
`,
  bipartite: `
## Definition and test
Bipartite = vertices split into two sides with every edge crossing ⟺ no odd-length cycle.
BFS/DFS two-colouring: colour neighbours with the opposite colour; a same-coloured neighbour → not bipartite.
Run from every uncoloured node (the graph may be disconnected). O(V + E).
Union-find version: union all neighbours of u together; u in the same set as a neighbour → not bipartite.
## Problems
Is graph bipartite (LC 785); possible bipartition (LC 886, dislikes as edges).
Divide nodes into the maximum number of groups (LC 2493): bipartite check, then BFS depth per component.
## Why it matters
Bipartite matching (Hopcroft–Karp, Hungarian algorithm), König's theorem (max matching = min vertex cover in bipartite graphs).
Two-colouring is easy; three-colouring is NP-complete.
## Related tricks
Grids are bipartite (chessboard colouring by (r + c) mod 2): domino tiling arguments.
Trees are always bipartite. Parity DSU handles "same/different side" constraints online.
`,
  "state-space-bfs": `
## Design the state
State = everything that affects future moves: position plus keys held, remaining breaks, direction, time mod k, mask of visited nodes.
Visited is keyed on the full state, not just the position.
Count states first: R·C·2^K must fit in time and memory.
## Examples
Open the lock (LC 752): 10⁴ states, 8 neighbours each, deadends as blocked states.
Sliding puzzle (LC 773): the board serialised as a string; 6!/2 reachable states.
Shortest path visiting all nodes (LC 847): (node, mask) BFS from all nodes at once.
Shortest path to get all keys (LC 864): (r, c, keymask).
Shortest path with obstacle elimination (LC 1293): (r, c, k left); prune when k ≥ the Manhattan distance.
Minimum knight moves, jump game IV (LC 1345: clear the value bucket after its first use).
## Optimisations
Bidirectional BFS when the target state is known.
Encode states as integers (bitmasks) instead of tuples or strings for speed.
Prune dominated states (same position with fewer resources and more steps).
## Weighted moves
Unequal move costs → Dijkstra over states; 0/1 costs → 0-1 BFS.
## Solvability checks
8-puzzle and 15-puzzle: inversion parity decides solvability before searching.
`,
  kahn: `
## Algorithm
Compute in-degrees; queue all nodes with in-degree 0.
Pop u, append it to the order, decrement each neighbour's in-degree, and enqueue those that reach 0. O(V + E).
Output size < V → a cycle exists (no valid order).
## Why it works
A DAG always has a source; removing it leaves a DAG; repeat. Nodes on a cycle never reach in-degree 0.
## Variants
Lexicographically smallest order: a min-heap instead of a queue (O(E + V log V)).
Unique order (sequence reconstruction, LC 444): the queue never holds more than one node.
Minimum number of semesters / parallel courses (LC 1136): process level by level; the answer is the number of levels.
Parallel courses III (LC 2050): longest path with durations, DP while popping.
Course schedule I/II (LC 207/210), find all recipes (LC 2115), minimum height trees (LC 310: peel leaves of an undirected tree).
## Kahn vs DFS
Kahn: iterative, detects cycles by count, naturally gives levels.
DFS: reverse post-order; detects cycles with colours; recursion depth limits.
`,
  "dfs-topo": `
## Algorithm
DFS every unvisited node; append a node to the list when it finishes (post-order); reverse the list.
Use three colours to detect cycles (an edge to a gray node).
## Why reversed finish time works
For an edge u → v in a DAG, v finishes before u (either v is explored inside u's call or it was already done).
So u comes before v in the reversed list.
## Kahn or DFS?
Both are O(V + E). Kahn gives levels and a cycle check by count; DFS is short to write and reuses the graph's DFS.
For huge depths, prefer Kahn (no recursion).
## Uses
Build order, course schedule II, compile dependencies, spreadsheet evaluation order.
Kosaraju's SCC algorithm uses the finish order on the reversed graph.
Longest path in a DAG processes nodes in topological order.
`,
  "dag-dp": `
## Principle
In a DAG, process nodes in topological order: every predecessor is finished before a node, so dp[v] = best over edges u → v of combine(dp[u], w).
Longest path, shortest path with negative weights, counting paths: all O(V + E).
## Classic uses
Longest increasing path in a matrix (LC 329): cells with edges to larger neighbours form a DAG; memoised DFS.
Number of ways to arrive at the destination (LC 1976): Dijkstra order, then count shortest paths.
Largest colour value in a directed graph (LC 1857): Kahn with a 26-colour count per node; a cycle → −1.
Parallel courses III: the longest path weighted by course durations.
Critical path method in project scheduling.
## Memoised DFS = DP on a DAG
Recursion on states where each state depends on "smaller" states is DP over the DAG of states.
If the states can form a cycle, memoisation is wrong: you need shortest paths or fixed-point iteration.
## Shortest paths with negative weights on a DAG
Relax edges in topological order: O(V + E), and negative weights are fine (no cycles to exploit).
Longest path in a general graph is NP-hard; in a DAG it is linear.
`,
  "order-constraints": `
## Alien dictionary (LC 269)
Compare adjacent words: the first differing character gives an edge c1 → c2.
If a word is longer than the next and the shorter is its prefix (e.g. "abc" before "ab"), the input is invalid.
Include every character as a node; topologically sort; a cycle → "".
## Sequence reconstruction (LC 444)
Edges from consecutive elements of each sequence; the order is unique iff Kahn's queue always has exactly one node and all nodes are output.
## Verifying an order
Verifying an alien dictionary (LC 953): map the order to ranks and compare adjacent words.
Check a topological order: every edge u → v has pos[u] < pos[v].
## Other constraint graphs
Build a matrix given row and column conditions (LC 2392): two independent topological sorts.
Sort items by groups respecting dependencies (LC 1203): topo sort the groups, then the items within each group.
Difference constraints (xⱼ − xᵢ ≤ w) become shortest paths with Bellman–Ford.
Loud and rich (LC 851): DFS along "richer" edges with memoisation.
`,
  "dsu-core": `
## Operations
make(x): parent[x] = x. find(x): follow parents to the root. union(a, b): link one root under the other.
connected(a, b) ⟺ find(a) == find(b).
## Optimisations
Path compression: point every node on the find path straight at the root (parent[x] = find(parent[x])).
Union by rank or size: attach the smaller tree under the larger.
Together: O(α(n)) amortised per operation, where α (inverse Ackermann) ≤ 4 for any practical n.
Either one alone gives O(log n).
Path halving (parent[x] = parent[parent[x]]) is the iterative alternative to full compression.
## Extras
Track component count (decrement on a successful union), size per root, and the min/max per root.
union returns false when already connected: that is the redundant-edge signal.
Map arbitrary keys (strings, coordinates) to ids with a dictionary, or use a dict-based parent.
## What DSU cannot do
No splits or edge deletions (use offline reverse time or rollback DSU).
No paths, no distances (except relative offsets in weighted DSU), no directed reachability.
`,
  "dsu-applications": `
## Choose elements and unions
Decide what the elements are (cells, accounts, characters, indices) and what makes two of them "the same group".
## Patterns
Number of provinces / connected components: count successful unions.
Redundant connection (LC 684): the first edge whose endpoints are already connected.
Accounts merge (LC 721): union the emails within each account; group by root; sort.
Graph valid tree (LC 261): exactly n − 1 edges and no redundant edge.
Satisfiability of equality equations (LC 990): union all "==", then check every "!=".
Smallest string with swaps (LC 1202): indices connected by swaps form groups; sort each group's characters.
Longest consecutive sequence: union x with x + 1.
Number of islands II (LC 305): online land additions.
Most stones removed (LC 947): union a stone's row with its column (offset the column ids); answer = stones − components.
Making a large island (LC 827): label components with sizes, then try each water cell's distinct neighbours.
Kruskal's MST: sort edges, add those that join different sets.
## DSU vs BFS/DFS
Static graph, one-off question → BFS/DFS is fine.
Edges arrive online, queries interleave, or edges are processed in sorted order → DSU.
`,
  "weighted-dsu": `
## Idea
Store weight[x] = the relation from x to its parent (a ratio, an offset or a parity).
find composes relations along the path while compressing, so weight[x] becomes the relation from x to the root.
## Evaluate division (LC 399)
weight[x] = x / parent(x). Union a / b = k: roots ra and rb; set parent[ra] = rb with weight[ra] = k · weight[b] / weight[a].
Query a / b = weight[a] / weight[b] if they share a root; else −1.
## Parity DSU
weight = 0 (same side) or 1 (opposite); combine with XOR.
Bipartite checking online; "A says B is a liar" puzzles; possible bipartition.
Contradiction: a and b already share a root and their parities disagree with the new statement.
## Offsets
Relative positions or differences: weight = value[x] − value[root]; combine by addition (food chain, mod 3 relations).
Checking consistency of "x − y = d" constraints online.
## Implementation detail
The recursive find must update weight[x] using the parent's weight after the parent itself has been compressed.
Iterative find: collect the path, then fix weights from the root downward.
`,
  "offline-dsu": `
## Sort and sweep
Sort edges and queries by a threshold; add edges up to each query's limit; answer with find.
Checking existence of edge-length-limited paths (LC 1697); number of good paths (LC 2421: add nodes in value order, count per component).
Swim in rising water, minimum effort path, and Kruskal itself are threshold sweeps.
## Reverse time for deletions
DSU cannot delete; process the events backwards so deletions become additions.
Bricks falling when hit (LC 803): remove all hit bricks, then add them back in reverse, counting newly attached bricks via the roof node's size.
## Rollback DSU and divide and conquer over time
Union by size without path compression; keep a stack of changes to undo.
Offline dynamic connectivity: a segment tree over time, adding each edge on the intervals where it lives, DFS with rollback. O((n + q) log² n).
## Kruskal reconstruction tree
When Kruskal unions two components, create a new node with the edge weight as its value and both roots as its children.
The LCA's value of u and v is the minimax edge on their path; subtrees answer "which nodes are reachable with edges ≤ w".
`,
  dijkstra: `
## Algorithm
dist[src] = 0; min-heap of (dist, node). Pop (d, u); skip if d > dist[u] (stale entry).
For each edge u → v with weight w: if d + w < dist[v], update and push. O((V + E) log V) with a binary heap.
## Correctness
Non-negative weights: when u is popped with the smallest tentative distance, no other path can later beat it (any detour adds ≥ 0).
Each node is finalised once (the greedy choice is safe).
## Negative weights
One negative edge breaks it: a finalised node could later improve. Use Bellman–Ford, or Johnson's reweighting for all pairs.
## Variants and details
Early exit when the target is popped. Store parents for the path.
Network delay time (LC 743): max of the distances. Path with maximum probability (LC 1514): max-heap of products (or −log weights).
Minimum effort path: cost = max edge (minimax), still Dijkstra.
Second shortest path: keep the two best distances per node.
Dense graph (E ≈ V²): the O(V²) array version beats the heap.
Count shortest paths: when d + w == dist[v], add ways[u] to ways[v].
## Choosing
Unweighted → BFS. 0/1 weights → 0-1 BFS. Non-negative → Dijkstra. Negative edges → Bellman–Ford/SPFA. All pairs and small V → Floyd–Warshall. DAG → topological relaxation.
`,
  "zero-one-bfs": `
## Algorithm
Deque instead of a heap: relaxing across a 0-weight edge pushes to the front, across a 1-weight edge to the back.
Pop from the front; skip stale entries (or check dist on pop). O(V + E).
## Problems
Minimum cost to make at least one valid path in a grid (LC 1368): following the arrow costs 0, changing it costs 1.
Minimum obstacle removal to reach the corner (LC 2290): obstacle 1, empty 0.
Minimum flips, reversing edges to reach a node (add reversed edges with weight 1).
## Generalisations
Weights in {0, 1, …, k}: Dial's algorithm with k + 1 buckets (a circular bucket queue): O(V·k + E).
Small integer weights: bucket queues beat heaps.
## Correctness
The deque holds at most two distinct distance values (d and d + 1) with the smaller ones at the front, so it behaves like Dijkstra's heap.
`,
  "bellman-ford": `
## Algorithm
dist[src] = 0; repeat V − 1 times: relax every edge (u, v, w). O(V·E).
A shortest simple path has at most V − 1 edges; after round i, every path with ≤ i edges is correct.
Round V still relaxes something → a negative cycle reachable from the source.
Stop early when a round changes nothing.
## Cheapest flights within K stops (LC 787)
Exactly K + 1 rounds, and relax from a copy of the previous round's distances, so each round adds at most one edge.
Without the copy, one round can chain several edges.
Alternative: Dijkstra or BFS over (node, stops) states.
## SPFA
Queue of nodes whose distance changed; relax only their edges. Average fast, worst case O(V·E).
Negative cycle: a node enqueued V times (or its path length reaches V).
## Applications
Graphs with negative weights (no negative cycles reachable).
Difference constraints: xⱼ − xᵢ ≤ w becomes an edge i → j with weight w, plus a super-source; a negative cycle means infeasible.
Currency arbitrage: weights −log(rate); a negative cycle = an arbitrage opportunity.
Johnson's algorithm uses one Bellman–Ford run to reweight edges for V Dijkstras.
`,
  "floyd-warshall": `
## Algorithm
dist[i][j] = edge weight (∞ if none; 0 on the diagonal).
for k, for i, for j: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]). O(V³) time, O(V²) space.
## Why k is the outer loop
After iteration k, dist[i][j] is the shortest path using only intermediate nodes {0…k}. The DP is over k.
Putting k inside gives wrong answers.
## Properties
Handles negative edges; dist[i][i] < 0 after the run → i is on a negative cycle.
Path reconstruction: next[i][j] = next[i][k] when updating.
V ≤ ~400–500 in practice.
## Transitive closure (Warshall)
reach[i][j] |= reach[i][k] && reach[k][j]. Course schedule IV (LC 1462). Bitsets speed it up by 64×.
## Problems
Find the city with the smallest number of neighbours within a distance threshold (LC 1334).
Minimum cost to convert a string (LC 2976): Floyd on the 26 letters, then sum per position.
Minimax and maximin paths: replace + with max/min.
## When not to use it
Sparse graphs with many vertices: V runs of Dijkstra cost O(V·E log V), much less than V³.
Single source: Dijkstra or Bellman–Ford.
`,
  "state-dijkstra": `
## Expand the state
Dijkstra over (node, extra) when the cost or legality depends on more than the node: stops used, fuel left, discounts left, parity, time mod k.
Number of states = V × |extra|; edges multiply the same way.
## Examples
Cheapest flights with K stops: (node, stops).
Minimum cost to reach the destination in time (LC 1928): (node, time) with a time budget.
Shortest path with alternating colours (LC 1129): (node, last colour), BFS.
Electric car / fuel problems: (city, fuel), with refuelling edges.
Using k coupons (halve an edge): (node, coupons used); layered graph.
## Changing the cost function
Minimax (minimise the maximum edge): combine with max instead of +; Dijkstra still works for monotone combiners.
Maximum probability: multiply (or add −log).
Lexicographic costs: compare tuples (primary cost, secondary cost).
## Dominance pruning
Skip state (v, extra) if another popped state at v has a better or equal cost and better or equal resources.
## Alternatives
Bellman–Ford rounds when the extra is "number of edges"; DP over a DAG when time only increases.
`,
  "a-star": `
## A*
Dijkstra ordered by f = g + h, where g = cost so far and h = an estimate of the remaining cost.
Admissible h (never overestimates) → optimal. Consistent h (h(u) ≤ w(u, v) + h(v)) → nodes never need reopening.
h = 0 gives Dijkstra; a perfect h walks straight to the goal.
Grid heuristics: Manhattan (4 directions), Chebyshev or octile (8 directions), Euclidean (any angle).
## Bidirectional search
Dijkstra from both ends; stop when the sum of the top keys ≥ the best meeting distance found.
Roughly halves the explored radius: about 2·r² instead of 4·r² nodes in 2D.
## Road-network routing at scale
Contraction hierarchies: preprocess by contracting nodes and adding shortcuts; a query is a bidirectional search upward: milliseconds on continental graphs.
ALT: A* with landmark-based triangle-inequality heuristics.
Hub labels and transit-node routing are faster still, with more preprocessing.
## Interview usage
Mention A* for single-pair queries on large implicit graphs (puzzles, grids, maps).
Sliding puzzle with Manhattan distance; IDA* (iterative deepening) saves memory.
`,
};
