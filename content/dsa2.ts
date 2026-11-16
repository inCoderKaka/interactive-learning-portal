import { P, Q, T } from "./h";
import type { Problem, Topic } from "@/lib/types";

export const topics2: Topic[] = [
  T("dsa", "trees", "Binary trees", 1, 40, "Post-order 'return one thing, update another', LCA, serialisation and rerooting.", {
    viz: "tree-dfs",
    signals: ["Anything hierarchical", "Answer for a node depends on answers of its subtrees", "Path between two nodes (think LCA)"],
    lesson: `**The core pattern:** a post-order DFS that *returns* what the parent needs and *updates a global* with what the answer needs. In Max Path Sum the function returns the best single downward branch, while the answer considers left + node + right.

**Traversal choice:** pre-order to pass information down (paths, depth), post-order to aggregate up (heights, sums), in-order for BST order, BFS for levels / views.

**LCA:** recursive "return the node if found; if both sides return non-null, I am the LCA". Variants: nodes may be absent (count found nodes), parent pointers (two-list intersection), many queries (binary lifting, O(log n) each).

**Distance K / "burning tree":** build a parent map, then BFS as an undirected graph.

**Serialisation:** pre-order with null markers is enough to rebuild uniquely. Pre + in-order (or post + in) rebuild with a value→index map in O(n).

**Rerooting DP:** compute an answer for root 0, then derive each child's answer from its parent's in O(1) (Sum of Distances in Tree: \`ans[c] = ans[p] − size[c] + (n − size[c])\`).

**Subtree identity:** serialise each subtree or assign ids via a map of (leftId, value, rightId) to detect duplicates in O(n).`,
    template: `int best = INT_MIN;
int gain(TreeNode* n) {               // best downward path starting at n
  if (!n) return 0;
  int l = max(0, gain(n->left)), r = max(0, gain(n->right));
  best = max(best, l + n->val + r);   // path bending at n
  return n->val + max(l, r);          // only one branch may continue upward
}`,
    pitfalls: ["Returning the 'answer' value instead of the 'extendable' value", "Recursion depth on skewed trees (10⁵ nodes) → iterative or mention stack limits", "Confusing depth (from root) with height (to leaf)", "Assuming unique values when building maps"],
    quiz: [
      Q("In Max Path Sum, why does the helper return node + max(l, r) rather than node + l + r?", ["To avoid overflow", "*A path continuing to the parent can use only one child branch", "Because the tree is a BST", "It is a bug"], "A path cannot fork twice."),
      Q("Find all nodes at distance K from a target node.", ["In-order traversal", "*Parent map + BFS from target", "Binary lifting", "Sort by depth"], "Treat the tree as an undirected graph once parents are known."),
      Q("Many LCA queries on a static tree of 10⁵ nodes.", ["Recursive LCA per query", "*Binary lifting or Euler tour + sparse table", "BFS per query", "Union-Find only"], "O(n log n) preprocess, O(log n) or O(1) per query."),
    ],
    cards: [["Rerooting formula for sum of distances", "ans[child] = ans[parent] − size[child] + (n − size[child])"]],
  }),
  T("dsa", "bst", "Binary search trees", 2, 30, "In-order is sorted; bounds flow down; successor/predecessor logic.", {
    signals: ["'Sorted' behaviour from a tree", "k-th smallest, successor, range queries", "Need an ordered map: floor/ceil/rank"],
    lesson: `**Invariant:** every node lies in an open interval \`(lo, hi)\` inherited from its ancestors. Validate by passing bounds down (use 64-bit or null bounds), or check in-order is strictly increasing.

**In-order = sorted.** Most BST questions reduce to array questions on the in-order sequence: k-th smallest, min difference, mode, two-sum, recover two swapped nodes (find the two inversions).

**Controlled in-order (iterator):** a stack holding the left spine gives O(h) memory and amortised O(1) \`next()\`.

**Successor:** if a right child exists → leftmost of the right subtree; otherwise the lowest ancestor for which the node is in the left subtree.

**Delete:** 0/1 child → splice; 2 children → replace with successor then delete the successor.

**Ordered containers in interviews:** C++ \`set/map\` (\`lower_bound\`, \`prev(it)\`), Java \`TreeMap\` (\`floorKey\`, \`ceilingKey\`). Python lacks one in the stdlib; say \`SortedList\` or use bisect on a list. Know that balanced BSTs give O(log n) insert/erase/search and that rank queries need an order-statistic tree or a Fenwick tree.

Counting BSTs → Catalan numbers.`,
    template: `bool valid(TreeNode* n, long lo = LONG_MIN, long hi = LONG_MAX) {
  if (!n) return true;
  if (n->val <= lo || n->val >= hi) return false;
  return valid(n->left, lo, n->val) && valid(n->right, n->val, hi);
}`,
    pitfalls: ["Checking only node vs its children instead of full bounds", "INT_MIN / INT_MAX node values with int bounds", "Assuming the BST is balanced: O(h) can be O(n)", "Duplicates policy (left? right? count field?) not clarified"],
    quiz: [
      Q("Two nodes of a BST were swapped. How do you find them in O(n)?", ["Sort the values", "*In-order traversal; record the first and last inversion", "BFS", "Compare each node with its children"], "A swap creates one or two descents in the sorted order."),
      Q("BST iterator with O(h) memory uses…", ["A queue of all nodes", "*A stack of the left spine", "Morris traversal only", "Parent pointers only"], "Push lefts; on next() pop and push the left spine of the right child."),
    ],
    cards: [["In-order successor when no right child", "Lowest ancestor whose left subtree contains the node"]],
  }),
  T("dsa", "tries", "Tries", 2, 30, "Prefix trees for dictionary search, autocomplete and XOR maximisation.", {
    signals: ["Many prefix queries against a dictionary", "Word search on a board with many words", "Maximum XOR pair (binary trie)", "Autocomplete / typeahead"],
    lesson: `A trie stores strings by shared prefixes; operations cost O(L) regardless of dictionary size.

**Node layout:** fixed array of 26 children (fast, memory-heavy) or hash map (flexible). Store \`isEnd\`, and optionally a count, the word itself, or a cached top-k list.

**Board + dictionary (Word Search II):** DFS the board while walking the trie; prune when no child matches; remove found words (and leaf nodes) to avoid repeats.

**Wildcard search:** on '.', branch into all children (worst case exponential in the number of dots).

**Autocomplete:** cache top-k completions per node (fast reads, slower writes) or DFS on demand. This is the bridge to the Typeahead system design question.

**Binary trie:** insert numbers bit by bit from the MSB; for max XOR greedily take the opposite bit. Supports "max XOR with element ≤ m" by offline sorting.

**Alternatives to mention:** sorted array + binary search for prefixes, hash set of all prefixes, ternary search tree, radix/compressed trie for memory.`,
    template: `struct Trie { Trie* ch[26] = {}; bool end = false; };
void insert(Trie* t, const string& w) {
  for (char c : w) { if (!t->ch[c - 'a']) t->ch[c - 'a'] = new Trie(); t = t->ch[c - 'a']; }
  t->end = true;
}`,
    pitfalls: ["Memory blow-up with array children on large alphabets", "Not marking visited cells / restoring them in board DFS", "Returning duplicates in Word Search II", "Forgetting isEnd (prefix ≠ word)"],
    quiz: [
      Q("Word Search II with 3×10⁴ words: why a trie instead of running Word Search per word?", ["Tries use less memory", "*One DFS explores all words sharing prefixes simultaneously and prunes dead prefixes", "Tries avoid recursion", "It is not better"], "Shared prefixes are searched once."),
      Q("Max XOR of two numbers in an array in O(n·32) uses…", ["Sorting", "*Binary trie, choosing the opposite bit greedily", "DP", "Segment tree"], "Higher bits dominate, so greedy from MSB is optimal."),
    ],
    cards: [["Trie operation cost", "O(L) per insert/search, independent of dictionary size"]],
  }),
  T("dsa", "heap", "Heaps & priority queues", 1, 35, "Top-k, k-way merge, two heaps, scheduling and lazy deletion.", {
    viz: "heap",
    signals: ["'K largest / smallest / most frequent'", "Repeatedly take the best available item (scheduling, merging)", "Running median", "Dijkstra / Prim / best-first search"],
    lesson: `**Top-k:** keep a *min*-heap of size k for the k largest → O(n log k). Alternatives: quickselect O(n) average, bucket sort for frequencies O(n).

**Two heaps (median):** max-heap for the lower half, min-heap for the upper; rebalance so sizes differ by ≤ 1.

**K-way merge:** push the head of each list; pop, then push the successor. Same shape solves "k-th smallest in a sorted matrix" and "smallest range covering k lists".

**Scheduling:** sort by start; heap by end time (Meeting Rooms II), or by profit among affordable items (IPO), or by cooldown (Task Scheduler).

**Lazy deletion:** std heaps cannot remove arbitrary elements. Keep a 'deleted' counter map and pop stale tops when they surface (Sliding Window Median), or store (value, index) and discard out-of-window tops. In C++ a \`multiset\` gives true O(log n) erase.

**Build-heap is O(n)**, not O(n log n). Heap sort is O(n log n), in place, not stable.

Language gotchas: C++ \`priority_queue\` is a max-heap (use \`greater<>\`); Python \`heapq\` is a min-heap (negate); Java comparator must not overflow (\`Integer.compare\`).`,
    template: `priority_queue<int, vector<int>, greater<int>> pq;   // min-heap of size k
for (int x : a) { pq.push(x); if ((int)pq.size() > k) pq.pop(); }
return pq.top();                                       // k-th largest`,
    pitfalls: ["Using a max-heap of size n for top-k (O(n log n))", "Comparator a − b overflow in Java", "Stale entries without lazy-deletion checks", "Forgetting to rebalance two heaps after lazy removal"],
    quiz: [
      Q("K-th largest in a stream: which heap and size?", ["Max-heap of size n", "*Min-heap of size k", "Max-heap of size k", "Two heaps"], "The top of a size-k min-heap is the k-th largest so far."),
      Q("Cost of building a heap from n elements (heapify)?", ["O(n log n)", "*O(n)", "O(log n)", "O(n²)"], "Most nodes are near the leaves and sift down a short distance."),
      Q("You need to delete arbitrary elements from a priority queue in Python.", ["Not possible", "*Lazy deletion: mark and skip when popped", "Rebuild the heap each time", "Sort every time"], "Mark deletions and clean the top lazily."),
    ],
    cards: [["Two-heaps invariant for running median", "max-heap(lower) and min-heap(upper), sizes differ by ≤ 1, every lower ≤ every upper"]],
  }),
  T("dsa", "backtracking", "Backtracking", 1, 35, "Systematic search: choose, explore, un-choose, and prune early.", {
    viz: "subsets",
    signals: ["'Generate all …' / 'find any valid arrangement'", "n small (≤ 20) with constraints", "Puzzle boards: N-Queens, Sudoku, word search"],
    lesson: `Every backtracking solution is a DFS over a **decision tree**. Define:
1. **State** (path so far + what is still available),
2. **Choices** at each node,
3. **Goal** test,
4. **Pruning** rule.

Template: for each choice → make it → recurse → undo it.

**Subsets:** include/exclude each element (2ⁿ leaves) or "pick next index ≥ start". **Permutations:** used[] array or swap in place (n! leaves). **Combinations with reuse:** recurse with the same start index.

**Duplicates:** sort, then skip \`a[i] == a[i−1]\` at the *same depth* (\`i > start\`), or for permutations require the previous equal element to be used.

**Pruning is the grade.** N-Queens: column and diagonal sets give O(1) conflict checks. Sudoku: choose the most constrained cell first. Partition problems: sort descending and skip symmetric buckets.

**Complexity:** state it as (number of leaves) × (cost per leaf), e.g. O(n·2ⁿ) for subsets because each is copied.

If sub-states repeat, add memoisation and you have top-down DP (Word Break, Palindrome Partitioning min cuts).`,
    template: `void dfs(int start, vector<int>& path) {
  res.push_back(path);                       // every node is a subset
  for (int i = start; i < n; ++i) {
    if (i > start && a[i] == a[i-1]) continue;   // skip duplicates at this depth
    path.push_back(a[i]);
    dfs(i + 1, path);
    path.pop_back();
  }
}`,
    pitfalls: ["Forgetting to undo the choice", "Appending a reference to the mutable path instead of a copy", "Duplicate results without the same-depth skip", "No pruning: correct but times out"],
    quiz: [
      Q("Subsets II (with duplicates): which skip rule is correct after sorting?", ["Skip if a[i] == a[i−1]", "*Skip if i > start and a[i] == a[i−1]", "Use a set of results only", "No skip needed"], "Only skip equal values among siblings, not along a path."),
      Q("Time complexity of generating all permutations of n distinct items?", ["O(2ⁿ)", "O(n²)", "*O(n · n!)", "O(n!)"], "n! leaves, each copied in O(n)."),
    ],
    cards: [["Backtracking skeleton", "choose → recurse → un-choose, with a pruning check before recursing"]],
  }),
  T("dsa", "graph-traversal", "Graph traversal: BFS & DFS", 1, 45, "Grids, implicit graphs, multi-source BFS and BFS over augmented state.", {
    viz: "bfs-grid",
    signals: ["Shortest path in an unweighted graph / grid → BFS", "Connected components, flood fill, cycle detection → DFS/BFS", "'Minimum steps' where state is more than position (keys, remaining breaks, visited mask)"],
    lesson: `**Model first:** what is a node, what is an edge? Many Google questions hide the graph: words differing by a letter, lock combinations, bus routes, (cell, keys) pairs.

**BFS = shortest path in unweighted graphs.** Mark visited *when enqueuing*, not when dequeuing. Process level by level for distances.

**Multi-source BFS:** enqueue all sources at distance 0 (Rotting Oranges, 01 Matrix, Walls and Gates). Equivalent to a virtual super-source.

**State-augmented BFS:** when extra info changes what you can do later, it is part of the node: \`(r, c, eliminationsLeft)\`, \`(node, visitedMask)\`, \`(r, c, keysMask)\`. Visited must be indexed by the full state. Complexity = number of states × transitions.

**Bidirectional BFS:** search from both ends, expand the smaller frontier (Word Ladder): O(b^(d/2)) instead of O(b^d).

**DFS uses:** components, cycle detection (3 colours for directed), topological order, bridges, flood fill "from the border inward" (Surrounded Regions, Pacific Atlantic: start from the oceans, not from every cell).

**Grid hygiene:** direction array, bounds check before access, mutate the grid as 'visited' only if allowed.`,
    template: `queue<pair<int,int>> q; vector<vector<int>> dist(R, vector<int>(C, -1));
for (auto [r, c] : sources) { dist[r][c] = 0; q.push({r, c}); }
int d[5] = {0, 1, 0, -1, 0};
while (!q.empty()) {
  auto [r, c] = q.front(); q.pop();
  for (int k = 0; k < 4; ++k) {
    int nr = r + d[k], nc = c + d[k+1];
    if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] == WALL || dist[nr][nc] != -1) continue;
    dist[nr][nc] = dist[r][c] + 1; q.push({nr, nc});
  }
}`,
    pitfalls: ["Marking visited on dequeue → duplicates and TLE", "Visited keyed by position only when state has more dimensions", "DFS for shortest path in unweighted graphs", "Recursion depth overflow on large grids", "Starting searches from every cell when a reverse search from targets is linear"],
    quiz: [
      Q("Shortest path in a grid where you may remove up to k obstacles. What is a BFS node?", ["(row, col)", "*(row, col, removals left)", "(row, col, steps)", "(steps)"], "Remaining eliminations change future options, so they belong in the state."),
      Q("Pacific Atlantic Water Flow: the efficient approach starts DFS/BFS from…", ["Every cell", "*The ocean borders, moving uphill", "The highest cell", "Random cells"], "Reverse the flow: two traversals instead of one per cell."),
      Q("When should a node be marked visited in BFS?", ["When popped", "*When pushed", "At the end", "Never"], "Marking on push prevents the same node being enqueued many times."),
    ],
    cards: [["Multi-source BFS", "Push all sources with distance 0 before the loop"], ["Complexity of state-augmented BFS", "O(number of states × out-degree)"]],
  }),
  T("dsa", "topo-sort", "Topological sort", 1, 30, "Order tasks under dependencies; detect cycles; DP on DAGs.", {
    viz: "topo",
    signals: ["Prerequisites / dependencies / build order", "'Is there a valid ordering?' (cycle detection in a directed graph)", "Longest path or counting paths in a DAG"],
    lesson: `**Kahn's algorithm (BFS):** compute in-degrees, queue all zeros, pop → append to order → decrement neighbours. If the order has fewer than n nodes, there is a cycle.

**DFS version:** post-order, then reverse. Three colours (white/grey/black): reaching a grey node means a back edge → cycle.

**Why Kahn is interview-friendly:** it gives cycle detection for free, extends naturally to "process in rounds" (minimum semesters = number of BFS levels), and a min-heap instead of a queue yields the lexicographically smallest order.

**DP on a DAG:** process nodes in topological order: longest path, number of paths, earliest completion time (\`finish[v] = time[v] + max(finish[u])\`).

**Peeling leaves** (Minimum Height Trees) is Kahn on an undirected tree: remove degree-1 nodes layer by layer; the last 1–2 nodes are the centres.

**Alien Dictionary:** edges come only from the *first differing character* of adjacent words; "abc" before "ab" is invalid input. Uniqueness of the order ⇔ the queue never holds more than one node.`,
    template: `vector<int> indeg(n), order; queue<int> q;
for (auto& [u, v] : edges) { adj[u].push_back(v); ++indeg[v]; }
for (int i = 0; i < n; ++i) if (!indeg[i]) q.push(i);
while (!q.empty()) {
  int u = q.front(); q.pop(); order.push_back(u);
  for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
}
bool hasCycle = (int)order.size() < n;`,
    pitfalls: ["Edge direction reversed (prereq → course)", "Duplicate edges inflating in-degree when using sets inconsistently", "Alien Dictionary prefix case and letters with no edges", "Using 2-state visited in DFS cycle detection on directed graphs"],
    quiz: [
      Q("Kahn's algorithm outputs fewer than n nodes. Meaning?", ["Graph is disconnected", "*Graph has a cycle", "Graph is a tree", "Nothing"], "Nodes on a cycle never reach in-degree 0."),
      Q("Lexicographically smallest topological order?", ["DFS with sorting", "*Kahn with a min-heap", "Reverse the order", "Impossible"], "Always pick the smallest available node."),
      Q("How do you know the topological order is unique?", ["Graph is connected", "*The queue size is exactly 1 at every step", "No node has in-degree 0", "It always is"], "Two available nodes can be ordered either way."),
    ],
    cards: [["Minimum semesters with unlimited parallel courses", "Number of BFS levels in Kahn's algorithm (longest path in the DAG)"]],
  }),
  T("dsa", "union-find", "Union-Find (DSU)", 1, 30, "Dynamic connectivity in near-constant time; components that only merge.", {
    viz: "union-find",
    signals: ["Connectivity queries while edges are added", "Grouping by equivalence (accounts, equations, similar strings)", "Kruskal's MST, cycle detection in undirected graphs", "'Process in sorted order and merge' (offline queries, Swim in Rising Water)"],
    lesson: `Two operations: \`find(x)\` (representative) and \`union(a, b)\`. With **path compression** and **union by size/rank** the amortised cost is O(α(n)) ≈ constant.

**Augment the root** with what you need: component size, count of components, max/min, sum, whether it touches a border.

**When DSU beats DFS:** edges arrive online (Number of Islands II), you need to answer connectivity repeatedly, or you process edges in sorted order (Kruskal, "smallest threshold so that A and B connect").

**Tricks:**
- Map arbitrary keys (emails, coordinates) to ids; 2D cell → \`r * C + c\`.
- **Virtual nodes** (a 'border' or 'row r / column c' node) collapse many unions.
- **Weighted DSU** stores a ratio/offset to the parent (Evaluate Division, parity constraints).
- **Reverse time** for deletions: process removals backwards as additions (Bricks Falling When Hit).
- "Making a Large Island": label components, then for each 0 sum sizes of *distinct* neighbouring roots.

DSU cannot split components. If edges are deleted online, think offline reversal or a different structure.`,
    template: `struct DSU {
  vector<int> p, sz; int comps;
  DSU(int n) : p(n), sz(n, 1), comps(n) { iota(p.begin(), p.end(), 0); }
  int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
  bool unite(int a, int b) {
    a = find(a); b = find(b); if (a == b) return false;
    if (sz[a] < sz[b]) swap(a, b);
    p[b] = a; sz[a] += sz[b]; --comps; return true;
  }
};`,
    pitfalls: ["Comparing p[a] == p[b] instead of find(a) == find(b)", "Forgetting union by size or compression (degenerates to O(n))", "Adding the same neighbouring component twice when summing sizes", "Trying to support deletions directly"],
    quiz: [
      Q("Edges are removed over time and you must report connectivity after each removal.", ["DSU directly", "*Process removals in reverse as additions with DSU", "BFS per query only", "Topological sort"], "DSU only merges; reversing time turns deletions into unions."),
      Q("unite(a, b) returns false in Kruskal / Redundant Connection. Meaning?", ["Error", "*a and b were already connected: this edge closes a cycle", "The graph is directed", "Sizes are equal"], "Same root ⇒ adding the edge creates a cycle."),
    ],
    cards: [["DSU complexity with both optimisations", "O(α(n)) amortised per operation, effectively constant"]],
  }),
  T("dsa", "shortest-paths", "Shortest paths", 1, 40, "Dijkstra, 0-1 BFS, Bellman-Ford, Floyd–Warshall, and choosing between them.", {
    viz: "dijkstra",
    signals: ["Weighted graph, minimum cost/time", "'At most K stops/edges' (Bellman-Ford layers or state-augmented Dijkstra)", "Minimise the maximum edge on a path (minimax Dijkstra / binary search + BFS / DSU)", "All-pairs with n ≤ 400 (Floyd–Warshall)"],
    lesson: `| Situation | Algorithm | Cost |
|---|---|---|
| Unweighted | BFS | O(V + E) |
| Weights 0/1 | 0-1 BFS (deque) | O(V + E) |
| Non-negative weights | Dijkstra (min-heap) | O(E log V) |
| Negative edges / ≤ K edges | Bellman-Ford | O(VE) / O(KE) |
| All pairs, small V | Floyd–Warshall | O(V³) |
| DAG | Topological order relaxations | O(V + E) |

**Dijkstra essentials:** pop (dist, node); skip if stale (\`d > dist[u]\`); relax neighbours. The first time a node is popped its distance is final, which is only true without negative edges.

**Generalised Dijkstra:** any path cost that is monotone works: max edge on path (Path With Minimum Effort, Swim in Rising Water), probability product (maximise with a max-heap).

**Extra constraints become state:** Cheapest Flights Within K Stops → \`(node, stops)\`; plain Dijkstra on node alone is wrong because a costlier path with fewer stops may be the only feasible one.

**0-1 BFS:** push front for 0-cost edges, back for 1-cost edges (Min Cost to Make a Valid Path).

**Path reconstruction:** store \`parent[v]\` on each successful relaxation.

**A\\*** = Dijkstra with an admissible heuristic; mention for grids/maps.`,
    template: `vector<long long> dist(n, LLONG_MAX);
priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
dist[src] = 0; pq.push({0, src});
while (!pq.empty()) {
  auto [d, u] = pq.top(); pq.pop();
  if (d > dist[u]) continue;                 // stale entry
  for (auto [v, w] : adj[u])
    if (d + w < dist[v]) { dist[v] = d + w; pq.push({dist[v], v}); }
}`,
    pitfalls: ["Dijkstra with negative edges", "No stale-entry check → O(E²) behaviour", "Using Dijkstra on node alone when there is a hop limit", "Bellman-Ford K-stops without copying the previous layer", "int overflow on INF + w"],
    quiz: [
      Q("Cheapest flight with at most K stops. Which is safest?", ["Plain Dijkstra on nodes", "*Bellman-Ford for K+1 rounds (or Dijkstra on (node, stops))", "Floyd–Warshall", "DFS"], "The hop limit is a constraint on edges used; relax layer by layer."),
      Q("Edges cost 0 or 1 on a 10⁶-cell grid. Best algorithm?", ["Dijkstra with heap", "*0-1 BFS with a deque", "Bellman-Ford", "Floyd–Warshall"], "Deque gives O(V + E) without the log factor."),
      Q("Why does Dijkstra fail with negative edges?", ["Heap cannot store negatives", "*A popped node's distance may later be improved", "It loops forever", "It does not fail"], "Finality on pop relies on non-negative extensions."),
    ],
    cards: [["Dijkstra stale check", "if (d > dist[u]) continue;"], ["Minimax path (minimise the largest edge)", "Dijkstra with cost = max(pathCost, edge), or binary search + BFS, or sort edges + DSU"]],
  }),
  T("dsa", "advanced-graphs", "MST, bridges, SCC & Eulerian paths", 2, 40, "The graph algorithms that separate a strong L4/L5 from a pattern matcher.", {
    signals: ["Connect everything at minimum cost (MST)", "'Critical' edges or nodes whose removal disconnects the graph", "Use every edge exactly once (Eulerian path)", "Two-colouring / conflicts (bipartite)"],
    lesson: `**Minimum spanning tree.** *Kruskal:* sort edges, union if endpoints differ: O(E log E). *Prim:* grow from a node with a heap: O(E log V); for dense complete graphs (points on a plane) the O(V²) array version is best.

**Bridges & articulation points (Tarjan).** DFS timestamps \`disc[u]\` and \`low[u]\` = earliest discovery time reachable from u's subtree via at most one back edge. Edge (u, v) is a bridge iff \`low[v] > disc[u]\`. u is an articulation point iff some child has \`low[v] ≥ disc[u]\` (root: ≥ 2 children).

**Strongly connected components.** Kosaraju (two DFS passes, second on the reversed graph in decreasing finish order) or Tarjan (one pass with a stack). Condensing SCCs yields a DAG, which unlocks topological DP.

**Eulerian path (Hierholzer).** Exists if the graph is connected (on its edges) and degree conditions hold (directed: at most one node with out−in = 1, one with in−out = 1). Algorithm: DFS consuming edges; append the node *after* its edges are exhausted; reverse. Reconstruct Itinerary uses sorted adjacency for the lexicographic order; Cracking the Safe is an Eulerian circuit on a de Bruijn graph.

**Bipartite check:** BFS/DFS 2-colouring; an odd cycle ⇔ not bipartite. DSU with parity also works.`,
    template: `// Tarjan bridges
int timer = 0; vector<int> disc(n, -1), low(n);
void dfs(int u, int parentEdge) {
  disc[u] = low[u] = timer++;
  for (auto [v, id] : adj[u]) {
    if (id == parentEdge) continue;
    if (disc[v] == -1) { dfs(v, id); low[u] = min(low[u], low[v]);
                         if (low[v] > disc[u]) bridges.push_back({u, v}); }
    else low[u] = min(low[u], disc[v]);
  }
}`,
    pitfalls: ["Skipping the parent by node id breaks on multi-edges; skip by edge id", "Hierholzer: adding nodes pre-order instead of post-order", "Prim with a heap on a dense graph (O(V² log V)) when O(V²) is available", "Forgetting disconnected components"],
    quiz: [
      Q("An edge (u, v) with v a DFS child of u is a bridge iff…", ["low[v] ≥ disc[u]", "*low[v] > disc[u]", "low[u] > disc[v]", "disc[v] > disc[u]"], "Nothing in v's subtree reaches u or above without that edge."),
      Q("Reconstruct Itinerary is an instance of…", ["Topological sort", "Shortest path", "*Eulerian path (Hierholzer)", "MST"], "Every ticket (edge) must be used exactly once."),
      Q("MST of n points with Manhattan distances, n = 1000 (complete graph).", ["Kruskal with all edges sorted", "*Prim with an O(n²) array", "Dijkstra", "BFS"], "E = n² edges; array Prim avoids the log factor and the edge list."),
    ],
    cards: [["Bridge condition", "low[child] > disc[parent]"], ["Hierholzer in one line", "DFS consuming edges; push node after all its edges are used; reverse at the end"]],
  }),
];

export const problems2: Problem[] = [
  // trees
  P("trees", 124, "Binary Tree Maximum Path Sum", "H", 1, "Maximum sum over any path (any node to any node) in a binary tree.",
    ["Post-order gain|Return best downward gain; update global with l + val + r|O(n)|O(h)"],
    ["Must the path include the root or a leaf?", "Negative values? Empty path allowed?"],
    ["Return the path itself", "N-ary tree (keep top two child gains)", "Path must go leaf to leaf", "Longest path with a property: diameter, same value, alternating"],
    ["Why clamp child gains at 0?", "How would you do this iteratively for a very deep tree?"],
    ["What does a parent need from a child vs what does the answer need?"]),
  P("trees", 236, "Lowest Common Ancestor of a Binary Tree", "M", 1, "Find the LCA of two nodes in a binary tree.",
    ["Recursive search|Return node if it is p/q; if both sides non-null, current is LCA|O(n)|O(h)", "Parent pointers + ancestor set|Walk up from p marking, then from q|O(h)|O(h)"],
    ["Are both nodes guaranteed to exist?", "Do nodes have parent pointers? Is it a BST?"],
    ["Either node may be absent (LC 1644: count matches)", "Parent pointers, no root (LC 1650: two-pointer intersection)", "LCA of k nodes / deepest leaves", "Many queries (binary lifting)"],
    ["How does the answer change for a BST?", "Path between two nodes (LC 2096) using the LCA"],
    ["If p is in the left subtree and q in the right, where is the LCA?"]),
  P("trees", 297, "Serialize and Deserialize Binary Tree", "H", 1, "Design an encoding of a binary tree to a string and back.",
    ["Pre-order with null markers|DFS write; recursive read with an index/queue|O(n)|O(n)", "Level-order|BFS with null markers (LeetCode format)|O(n)|O(n)"],
    ["Value range and types? Size constraints on the encoding?"],
    ["BST: no null markers needed (bounds reconstruct)", "N-ary tree (store child counts)", "Compact binary format / streaming over the network", "Find duplicate subtrees via serialisation"],
    ["Why is in-order alone insufficient?", "How would you version the format?"],
    ["Null markers make a single traversal unambiguous."]),
  P("trees", 863, "All Nodes Distance K in Binary Tree", "M", 1, "Return values of nodes exactly K edges from a target node.",
    ["Parent map + BFS|Treat as undirected graph|O(n)|O(n)", "Single DFS returning distance to target|Collect downward from ancestors|O(n)|O(h)"],
    ["Is the target a node reference or a value? Unique values?"],
    ["Time to burn / infect the whole tree from a node (LC 2385)", "Closest leaf to a node", "Target given by value only"],
    ["Solve without extra parent storage."],
    ["Children are easy; how do you travel upward?"]),
  P("trees", 987, "Vertical Order Traversal", "H", 2, "Report nodes column by column; ties by row then value.",
    ["DFS/BFS collect (col, row, val) + sort|Sort triples and group by column|O(n log n)|O(n)", "BFS with column map|Level order preserves row order (LC 314 variant)|O(n)|O(n)"],
    ["Tie-breaking for same row and column?", "Output left-to-right columns?"],
    ["Top view / bottom view / right side view", "Diagonal traversal"],
    ["What is the range of columns and can you avoid sorting?"],
    ["Give every node coordinates (row, col)."]),
  P("trees", 105, "Construct Tree from Preorder and Inorder", "M", 2, "Rebuild a binary tree from its preorder and inorder traversals.",
    ["Recursion + index map|Preorder gives root; inorder splits left/right sizes|O(n)|O(n)"],
    ["Unique values guaranteed?"],
    ["Postorder + inorder", "Preorder only for a BST (bounds or stack, LC 1008)", "Preorder + postorder (not unique unless full)"],
    ["Why does slicing arrays make it O(n²)?"],
    ["The first preorder element is the root; find it in inorder."]),
  P("trees", 834, "Sum of Distances in Tree", "H", 2, "For every node, the sum of distances to all other nodes.",
    ["Rerooting DP|Post-order sizes and root answer; pre-order shift formula|O(n)|O(n)"],
    ["Tree given as undirected edges? n up to 10⁵?"],
    ["Weighted edges", "Node maximising/minimising the sum (tree centroid)", "Farthest distance from each node (reroot with top-two heights)"],
    ["Derive ans[child] from ans[parent]."],
    ["Moving the root across an edge brings size[c] nodes closer and n − size[c] farther."]),
  P("trees", 199, "Binary Tree Right Side View", "M", 2, "Values visible when the tree is viewed from the right.",
    ["BFS last of each level|Level-order traversal|O(n)|O(w)", "DFS right-first|Record first node seen at each depth|O(n)|O(h)"],
    ["Order top to bottom?"],
    ["Left view, top view, boundary traversal", "Populate next-right pointers in O(1) space"],
    ["Which is better for a very wide vs very deep tree?"],
    ["One node per depth."]),

  // bst
  P("bst", 98, "Validate Binary Search Tree", "M", 1, "Determine whether a binary tree is a valid BST.",
    ["Bounds recursion|Pass (lo, hi) down|O(n)|O(h)", "In-order strictly increasing|Track previous value|O(n)|O(h)"],
    ["Duplicates allowed? Value range hits INT limits?"],
    ["Largest BST subtree (return min, max, size, isBST)", "Maximum Sum BST in a binary tree (LC 1373)", "Recover a BST with two swapped nodes"],
    ["Why is comparing only with children wrong?"],
    ["A node deep in the left subtree must still be less than the root."]),
  P("bst", 230, "Kth Smallest Element in a BST", "M", 1, "Return the k-th smallest value in a BST.",
    ["Iterative in-order, stop at k|Stack of left spine|O(h + k)|O(h)", "Augment with subtree sizes|Order-statistic tree|O(h)|O(n)"],
    ["Is the tree modified often between queries?"],
    ["Frequent inserts/deletes and queries (maintain sizes)", "K-th largest; closest K values to a target (LC 272)", "Two-sum in a BST with two iterators"],
    ["What changes if the BST is balanced and has 10⁹ nodes on disk?"],
    ["In-order visits nodes in sorted order."]),
  P("bst", 173, "Binary Search Tree Iterator", "M", 2, "Implement next() and hasNext() over a BST in O(h) memory.",
    ["Stack of left spine|Push lefts; on next pop and push right's left spine|O(1) amortised|O(h)"],
    ["Should it support prev() or concurrent modification?"],
    ["Bidirectional iterator (prev/next)", "Merge two BSTs in sorted order using two iterators", "Morris traversal for O(1) space"],
    ["Prove amortised O(1)."],
    ["Simulate the recursion stack lazily."]),
  P("bst", 450, "Delete Node in a BST", "M", 2, "Delete a key from a BST and return the root.",
    ["Recursive delete|0/1 child splice; 2 children replace with successor|O(h)|O(h)"],
    ["Is the key guaranteed present? Balanced afterwards?"],
    ["Trim a BST to [lo, hi]", "Balance a BST (in-order to array, rebuild)", "Insert with duplicates policy"],
    ["Successor vs predecessor replacement: any difference?"],
    ["The in-order successor has no left child."]),
  P("bst", 285, "Inorder Successor in BST", "M", 2, "Find the node with the smallest key greater than a given node.",
    ["Walk from root|If node < cur, cur is a candidate, go left; else go right|O(h)|O(1)"],
    ["Parent pointers available? Root given?"],
    ["Only the node with parent pointers (LC 510)", "Predecessor; floor and ceiling of an arbitrary value"],
    ["Why no need to find the node first?"],
    ["Every time you go left, the current node is a candidate."]),

  // tries
  P("tries", 208, "Implement Trie", "M", 1, "Implement insert, search and startsWith.",
    ["Array-children trie|Walk/create nodes per char|O(L)|O(total chars · Σ)"],
    ["Alphabet? Expected number of words? Deletes needed?"],
    ["Add delete and countWordsWithPrefix", "Wildcard search with '.' (LC 211)", "Memory-constrained: compressed (radix) trie"],
    ["Array vs hash-map children trade-offs?"],
    ["Separate 'path exists' from 'word ends here'."]),
  P("tries", 212, "Word Search II", "H", 1, "Find all dictionary words formed by adjacent cells on a board.",
    ["Trie + board DFS with pruning|Walk trie with DFS; store word at node; null it when found|O(R·C·4·3^(L−1))|O(total chars)"],
    ["Can a cell be reused within a word? Board and dictionary sizes?"],
    ["Return the count / longest word only", "Diagonal moves allowed", "Dictionary is huge and board is tiny (enumerate board paths instead)"],
    ["How do you avoid reporting a word twice?", "Why prune exhausted trie leaves?"],
    ["Search for all words at once: let the trie tell you whether the current path is a dead end."]),
  P("tries", 642, "Design Search Autocomplete System", "H", 2, "Return the top 3 historical sentences for each typed prefix; record new sentences on '#'.",
    ["Trie with counts + DFS/heap per query|Collect completions under the prefix node|O(prefix subtree)|O(total chars)", "Trie with cached top-k per node|Update caches along the path on insert|O(L·k) insert, O(1) read|more memory"],
    ["Tie-breaking (ASCII order)? Read/write ratio?"],
    ["Scale to billions of queries → Typeahead system design", "Fuzzy matching / typo tolerance", "Personalised or time-decayed ranking"],
    ["Where does this design break at web scale?"],
    ["Keep a pointer to the current trie node as the user types."]),
  P("tries", 421, "Maximum XOR of Two Numbers", "M", 2, "Maximise a[i] XOR a[j].",
    ["Binary trie|Insert bits MSB-first; greedily take the opposite bit|O(32n)|O(32n)", "Prefix set greedy|Build answer bit by bit, test with a hash set|O(32n)|O(n)"],
    ["Bit width? Non-negative only?"],
    ["Max XOR with an element ≤ m per query (offline sort + trie)", "Max XOR subarray (prefix XORs)", "Count pairs with XOR in a range"],
    ["Why is greedy from the MSB optimal?"],
    ["A 1 in a higher bit beats everything below it."]),

  // heap
  P("heap", 215, "Kth Largest Element in an Array", "M", 1, "Find the k-th largest element.",
    ["Min-heap of size k|Keep k largest|O(n log k)|O(k)", "Quickselect|Partition around random pivot|O(n) avg, O(n²) worst|O(1)", "Counting sort|When value range is small|O(n + R)|O(R)"],
    ["Distinct or duplicates count? Can I modify the array?", "Is it a stream?"],
    ["Stream version (LC 703)", "K-th largest across many machines (distributed top-k)", "Median → k = n/2; guarantee O(n) worst case (median of medians)"],
    ["Why randomise the pivot? What about many duplicates (3-way partition)?"],
    ["You do not need full sorting."]),
  P("heap", 295, "Find Median from Data Stream", "H", 1, "Support addNum and findMedian on a stream.",
    ["Two heaps|Max-heap low, min-heap high, rebalance|O(log n) add, O(1) median|O(n)"],
    ["Value range bounded (bucket counts)? Memory limits?"],
    ["Values in [0, 100] → counting array", "Sliding window median (lazy deletion / multiset)", "Approximate percentiles at scale (t-digest, reservoir sampling)", "99th percentile instead of median"],
    ["How would you compute p99 latency over a day of traffic?"],
    ["Keep the two middle values at the tops of two heaps."]),
  P("heap", 253, "Meeting Rooms II", "M", 1, "Minimum number of rooms for all meetings.",
    ["Sort by start + min-heap of end times|Reuse room if earliest end ≤ start|O(n log n)|O(n)", "Sweep line|+1 at start, −1 at end, max prefix|O(n log n)|O(n)"],
    ["Is [1,2] and [2,3] a conflict?"],
    ["Assign actual room ids; which room hosts most meetings (LC 2402)", "Meetings arrive online (ordered map / My Calendar III)", "Maximum number of meetings one person can attend (greedy by end)"],
    ["Which approach extends to 'at most k concurrent' queries?"],
    ["Which room frees up first?"]),
  P("heap", 621, "Task Scheduler", "M", 2, "Minimum time to run tasks with a cooldown n between identical tasks.",
    ["Math on the most frequent task|(maxFreq − 1)(n + 1) + countOfMax, at least total|O(n)|O(1)", "Max-heap + cooldown queue|Simulate|O(T log 26)|O(26)"],
    ["Must we output the schedule or only its length?"],
    ["Output an actual order (Rearrange String k Distance Apart / Reorganize String)", "Tasks have fixed order (LC 2365)", "Multiple CPUs"],
    ["Why can idle slots always be filled by remaining tasks?"],
    ["The most frequent task defines a frame."]),
  P("heap", 480, "Sliding Window Median", "H", 2, "Median of each window of size k.",
    ["Two heaps + lazy deletion|Track balance; prune stale tops|O(n log n)|O(n)", "Two multisets / ordered structure|True erase|O(n log k)|O(k)"],
    ["Even k: average? Overflow when adding two ints?"],
    ["Sliding window percentile", "Window by time rather than count"],
    ["Why is balance tracked separately from heap sizes?"],
    ["You cannot remove from the middle of a heap; postpone it."]),
  P("heap", 347, "Top K Frequent Elements", "M", 2, "Return the k most frequent values.",
    ["Count + bucket sort|Buckets indexed by frequency|O(n)|O(n)", "Count + min-heap of size k|Keep top k|O(n log k)|O(n)", "Count + quickselect|Partition by frequency|O(n) avg|O(n)"],
    ["Tie order matters? k valid?"],
    ["Top K frequent words with lexicographic ties", "Streaming heavy hitters (Count-Min Sketch + heap, Misra–Gries)", "Top K over a sliding time window"],
    ["How would you do this on 1 TB of logs?"],
    ["Frequencies are bounded by n."]),

  // backtracking
  P("backtracking", 78, "Subsets", "M", 1, "Return all subsets of distinct integers.",
    ["Backtracking with start index|Each node of the tree is a subset|O(n·2ⁿ)|O(n)", "Bitmask enumeration|For mask in 0..2ⁿ−1|O(n·2ⁿ)|O(1) extra", "Iterative doubling|Append x to all existing subsets|O(n·2ⁿ)|O(1) extra"],
    ["Duplicates in the input? Output order?"],
    ["With duplicates (Subsets II)", "Only subsets of size k (Combinations)", "Subsets with a target sum (count → DP)"],
    ["When would you choose DP over enumeration?"],
    ["Each element is either in or out."]),
  P("backtracking", 46, "Permutations", "M", 1, "Return all permutations of distinct integers.",
    ["Used-array backtracking|Pick any unused element|O(n·n!)|O(n)", "In-place swaps|Swap i with each j ≥ i|O(n·n!)|O(n)"],
    ["Duplicates? Lexicographic order required?"],
    ["With duplicates (Permutations II)", "Next permutation in place (LC 31)", "K-th permutation directly (factorial number system)"],
    ["Find the k-th permutation without generating all."],
    ["Track which elements are already placed."]),
  P("backtracking", 39, "Combination Sum", "M", 1, "All unique combinations (reuse allowed) that sum to a target.",
    ["Backtracking with start index|Recurse with i (reuse) and prune when sum exceeds|exponential|O(target/min)"],
    ["Positive candidates only? Distinct?"],
    ["Each number used once with duplicates (LC 40)", "Count combinations only (Coin Change II DP)", "Count ordered sequences (Combination Sum IV)"],
    ["Why does sorting help pruning?"],
    ["Never go back to earlier candidates: that avoids permutations of the same set."]),
  P("backtracking", 51, "N-Queens", "H", 2, "Place n queens so none attack each other; return all boards.",
    ["Row-by-row with column/diagonal sets|cols, r−c, r+c occupancy|O(n!)|O(n)", "Bitmask|Available = ~(cols | d1 | d2)|O(n!)|O(n)"],
    ["Count only or boards? n range?"],
    ["Count solutions (bitmask)", "Sudoku solver", "Place k knights / rooks with obstacles"],
    ["How do you index diagonals?"],
    ["One queen per row; what identifies a diagonal?"]),
  P("backtracking", 79, "Word Search", "M", 2, "Does a word exist as a path of adjacent cells (no reuse)?",
    ["DFS backtracking|Mark cell, try 4 neighbours, unmark|O(R·C·3^L)|O(L)"],
    ["Diagonals? Cell reuse? Case sensitivity?"],
    ["Many words (Word Search II with a trie)", "Count occurrences", "Longest word from a dictionary on the board"],
    ["Pruning ideas: letter frequency check, start from the rarer end."],
    ["Temporarily mark the cell as used."]),
  P("backtracking", 131, "Palindrome Partitioning", "M", 2, "All ways to cut a string into palindromic substrings.",
    ["Backtracking + palindrome DP table|Precompute isPal[i][j]|O(n·2ⁿ)|O(n²)"],
    ["Return partitions or the minimum cuts?"],
    ["Minimum cuts (LC 132: DP)", "Partition into k palindromes with minimal changes"],
    ["When does memoisation help here?"],
    ["Try every prefix that is a palindrome."]),

  // graph-traversal
  P("graph-traversal", 200, "Number of Islands", "M", 1, "Count connected groups of land cells in a grid.",
    ["DFS/BFS flood fill|Scan; on unvisited land, flood and count|O(RC)|O(RC)", "Union-Find|Union adjacent lands; count roots|O(RC α)|O(RC)"],
    ["Diagonal adjacency? May I mutate the grid?"],
    ["Land added online (Number of Islands II → DSU)", "Distinct island shapes (canonical shape hashing)", "Grid too large for memory: process row by row with DSU", "Max area / perimeter / closed islands"],
    ["How would you parallelise over a huge grid?"],
    ["Each flood fill consumes exactly one island."]),
  P("graph-traversal", 994, "Rotting Oranges", "M", 1, "Minutes until all fresh oranges rot, or −1.",
    ["Multi-source BFS|Enqueue all rotten; process by levels; count fresh|O(RC)|O(RC)"],
    ["4-directional? What if there are no fresh oranges?"],
    ["01 Matrix / Walls and Gates / As Far from Land as Possible", "Different spread speeds (Dijkstra)", "Which single orange to remove to maximise survival"],
    ["Why not BFS from each rotten orange separately?"],
    ["All rotten oranges start spreading at time 0 simultaneously."]),
  P("graph-traversal", 127, "Word Ladder", "H", 1, "Shortest transformation sequence between two words changing one letter at a time.",
    ["BFS with wildcard buckets|Neighbours via patterns like h*t|O(N·L²)|O(N·L²)", "Bidirectional BFS|Expand smaller frontier|much faster in practice|O(N·L)"],
    ["Is endWord guaranteed in the dictionary? Same lengths?"],
    ["Return all shortest ladders (BFS layers + backtracking, LC 126)", "Insert/delete letters allowed", "Minimum Genetic Mutation / Open the Lock"],
    ["Compare generating neighbours (26·L) vs comparing all pairs."],
    ["Words are nodes; an edge joins words differing by one letter."]),
  P("graph-traversal", 1293, "Shortest Path in a Grid with Obstacle Elimination", "H", 1, "Shortest path from corner to corner if you may remove at most k obstacles.",
    ["BFS on (r, c, k left)|Visited per state, or keep best k seen per cell|O(RC·k)|O(RC·k)"],
    ["k bounds? If k ≥ R + C − 2 the Manhattan path is free."],
    ["Minimum obstacles to remove (0-1 BFS, LC 2290)", "Keys and doors (state = keys bitmask, LC 864)", "Weighted removal costs (Dijkstra)"],
    ["How can 'best remaining k per cell' prune states?"],
    ["Position alone is not the whole state."]),
  P("graph-traversal", 847, "Shortest Path Visiting All Nodes", "H", 2, "Shortest walk visiting every node of a small graph (revisits allowed).",
    ["Multi-source BFS on (node, mask)|Start from every node; stop at full mask|O(2ⁿ·n²)|O(2ⁿ·n)", "Bitmask DP (TSP) after all-pairs BFS|dp[mask][last]|O(2ⁿ·n²)|O(2ⁿ·n)"],
    ["n ≤ 12? Graph connected? Start anywhere?"],
    ["Weighted edges (Dijkstra on state / Floyd + TSP DP)", "Must return to the start", "Only a subset of nodes must be visited"],
    ["Why is visited[node][mask] sufficient even though nodes are revisited?"],
    ["A tiny n is an invitation to put a bitmask in the state."]),
  P("graph-traversal", 827, "Making A Large Island", "H", 2, "Flip at most one 0 to 1; return the largest possible island.",
    ["Label islands + neighbour set|Component ids and sizes; for each 0 sum distinct neighbour sizes + 1|O(n²)|O(n²)", "Union-Find|Same idea with DSU roots|O(n² α)|O(n²)"],
    ["What if the grid has no zeros?"],
    ["Flip up to k cells (hard; discuss)", "Remove one cell to split an island (articulation points)"],
    ["How do you avoid double counting the same island on two sides?"],
    ["Pre-compute the size of every island once."]),
  P("graph-traversal", 133, "Clone Graph", "M", 2, "Deep copy a connected undirected graph.",
    ["DFS/BFS + map old→new|Create on first visit, link neighbours|O(V + E)|O(V)"],
    ["Disconnected graph possible? Node identity by value?"],
    ["Clone with random pointers / a tree with parent links", "Serialise a graph to a string"],
    ["Why must the map be filled before recursing into neighbours?"],
    ["The map doubles as the visited set."]),
  P("graph-traversal", 417, "Pacific Atlantic Water Flow", "M", 2, "Cells from which water can reach both oceans.",
    ["Reverse DFS/BFS from each ocean|Climb to ≥ heights; intersect|O(RC)|O(RC)"],
    ["Equal heights flow? Borders belong to which ocean?"],
    ["Surrounded Regions / Number of Enclaves (border flood)", "Rainwater with capacity"],
    ["Why is the forward search quadratic?"],
    ["Start from the destinations."]),

  // topo-sort
  P("topo-sort", 210, "Course Schedule II", "M", 1, "Return an order to take all courses given prerequisites, or empty if impossible.",
    ["Kahn's BFS|In-degree queue|O(V + E)|O(V + E)", "DFS post-order|Three colours, reverse finish order|O(V + E)|O(V + E)"],
    ["Direction of each pair? Duplicate pairs?"],
    ["Minimum semesters with unlimited / at most k courses per term (LC 1136 / 1494)", "Is course A a prerequisite of B (transitive closure)", "Report one cycle if it exists", "Build-system: which targets to rebuild after a change"],
    ["How do you produce the lexicographically smallest valid order?"],
    ["A course is available when all its prerequisites are done."]),
  P("topo-sort", 269, "Alien Dictionary", "H", 1, "Derive a letter order from a sorted list of alien words.",
    ["Build edges from adjacent words + Kahn|First differing char gives an edge|O(total chars)|O(Σ)"],
    ["Is the input always valid? Return any order if several exist?"],
    ["Is the order unique?", "Verify that words are sorted given an order (LC 953)", "Smallest lexicographic valid order"],
    ["What makes the input invalid? (cycle; longer word before its prefix)"],
    ["Only the first mismatch between neighbours carries information."]),
  P("topo-sort", 310, "Minimum Height Trees", "M", 2, "Roots that minimise the height of an undirected tree.",
    ["Peel leaves layer by layer|Last ≤ 2 nodes are centres|O(n)|O(n)", "Two BFS for the diameter|Middle node(s) of the diameter path|O(n)|O(n)"],
    ["n = 1 edge case? Guaranteed a tree?"],
    ["Tree diameter", "Minimise the sum of distances instead (centroid)"],
    ["Why can there be at most two centres?"],
    ["Leaves can never be the best roots (for n > 2)."]),
  P("topo-sort", 329, "Longest Increasing Path in a Matrix", "H", 2, "Longest strictly increasing path moving in 4 directions.",
    ["DFS + memo|dp[cell] = 1 + max over larger neighbours|O(RC)|O(RC)", "Kahn on implicit DAG|Peel cells by out-degree|O(RC)|O(RC)"],
    ["Strictly increasing? Diagonals?"],
    ["Return the path", "Non-strict increases (cycles appear: needs a different approach)", "Count increasing paths (LC 2328)"],
    ["Why is no visited set needed?"],
    ["Strict increase means the graph is a DAG."]),
  P("topo-sort", 2050, "Parallel Courses III", "H", 2, "Minimum time to finish all courses with durations when any number can run in parallel.",
    ["Topological DP|finish[v] = time[v] + max finish of prerequisites|O(V + E)|O(V + E)"],
    ["Is the graph guaranteed acyclic?"],
    ["At most k in parallel (bitmask DP for small n)", "Critical path: which tasks have zero slack"],
    ["How would you list the critical path?"],
    ["Earliest start = latest prerequisite finish."]),

  // union-find
  P("union-find", 721, "Accounts Merge", "M", 1, "Merge accounts that share at least one email.",
    ["DSU on emails|Union each email with the account's first; group by root|O(N α + sort)|O(N)", "Graph DFS|Email graph components|O(N + sort)|O(N)"],
    ["Same name ≠ same person? Output sorted?"],
    ["Stream of accounts with online queries 'are A and B the same user?'", "Merge by multiple keys (phone, device id) → identity resolution at scale"],
    ["How would you run this over billions of records (MapReduce connected components)?"],
    ["Emails are the nodes; an account links its emails."]),
  P("union-find", 684, "Redundant Connection", "M", 1, "Find the edge whose removal makes the graph a tree.",
    ["DSU|First edge whose endpoints already share a root|O(n α)|O(n)"],
    ["Return the last such edge in input order?"],
    ["Directed version (LC 685: node with two parents and/or cycle)", "Graph Valid Tree", "Number of extra cables / operations to connect a network (LC 1319)"],
    ["Why does the directed version need case analysis?"],
    ["An edge inside an existing component creates a cycle."]),
  P("union-find", 305, "Number of Islands II", "H", 1, "Report the number of islands after each land-addition.",
    ["Online DSU|Add cell, ++count, union with land neighbours (−− on success)|O(k α)|O(RC)"],
    ["Repeated positions? Grid size vs number of operations (sparse map)?"],
    ["Also remove land (offline reverse / dynamic connectivity)", "Largest island after each addition"],
    ["Why is BFS per query too slow?"],
    ["Islands only merge over time."]),
  P("union-find", 399, "Evaluate Division", "M", 2, "Given equations a/b = k, answer queries x/y.",
    ["Weighted DSU|Store ratio to parent; compress multiplicatively|O((E+Q) α)|O(V)", "Graph DFS/BFS per query|Multiply along the path|O(Q·(V+E))|O(V+E)", "Floyd–Warshall|All pairs ratios|O(V³)|O(V²)"],
    ["Contradictory equations possible? Unknown variables → −1?"],
    ["Currency conversion with fees; detect arbitrage (negative cycle on −log rates)", "Equations arrive online"],
    ["When is each of the three approaches preferable?"],
    ["A variable is a node; an equation is a weighted edge in both directions."]),
  P("union-find", 778, "Swim in Rising Water", "H", 2, "Earliest time you can swim from top-left to bottom-right as water rises.",
    ["Dijkstra minimax|Cost = max elevation on path|O(n² log n)|O(n²)", "Sort cells + DSU|Activate cells by height until corners connect|O(n² log n)|O(n²)", "Binary search + BFS|Check reachability at level t|O(n² log n)|O(n²)"],
    ["Elevations distinct permutation?"],
    ["Path With Minimum Effort (edge weights = diffs)", "Path with maximum minimum value", "Queries with different thresholds (offline DSU)"],
    ["Three solutions exist: compare them."],
    ["You want the path whose largest cell is smallest."]),
  P("union-find", 947, "Most Stones Removed with Same Row or Column", "M", 2, "Maximum stones removable when a stone needs another in its row or column.",
    ["DSU on rows and columns|Union row r with column c' = c + OFFSET; answer = n − components|O(n α)|O(n)"],
    ["Coordinate bounds? Duplicate stones?"],
    ["Return a valid removal order", "3D version"],
    ["Why is every component reducible to exactly one stone?"],
    ["Stones sharing a row or column form a connected component."]),

  // shortest-paths
  P("shortest-paths", 743, "Network Delay Time", "M", 1, "Time for a signal from node k to reach all nodes in a weighted directed graph.",
    ["Dijkstra|Max of shortest distances|O(E log V)|O(V + E)", "Bellman-Ford|V−1 relaxations|O(VE)|O(V)"],
    ["Negative weights? Disconnected nodes → −1?"],
    ["Return the path to the slowest node", "Edges fail with probability: most reliable path (LC 1514)", "Multiple sources"],
    ["Dense graph: which Dijkstra variant?"],
    ["Answer = the largest of all shortest distances."]),
  P("shortest-paths", 787, "Cheapest Flights Within K Stops", "M", 1, "Cheapest price from src to dst using at most k stops.",
    ["Bellman-Ford, k+1 rounds|Relax from a copy of the previous round|O(k·E)|O(V)", "Dijkstra on (node, stops)|Prune by fewer stops seen|O(E·k log)|O(V·k)", "BFS by levels with cost pruning|Level = stops|O(k·E)|O(V)"],
    ["k stops = k + 1 edges?"],
    ["Exactly k stops", "Also minimise time as a tie-breaker (lexicographic cost)", "Return the itinerary"],
    ["Why is plain Dijkstra on nodes incorrect here?"],
    ["Limit on edges ⇒ think in layers."]),
  P("shortest-paths", 1631, "Path With Minimum Effort", "M", 1, "Minimise the maximum height difference along a path in a grid.",
    ["Dijkstra with max-cost|effort = max(effort, |diff|)|O(RC log RC)|O(RC)", "Binary search + BFS|Is there a path with all diffs ≤ x?|O(RC log H)|O(RC)", "Kruskal-style DSU|Sort edges until corners connect|O(RC log RC)|O(RC)"],
    ["4-directional? Single cell → 0?"],
    ["Swim in Rising Water; path with maximum minimum value", "Sum of efforts instead of max (plain Dijkstra)"],
    ["Why does Dijkstra still work when the path cost is a max, not a sum?"],
    ["The path cost never decreases when extended: that is all Dijkstra needs."]),
  P("shortest-paths", 1368, "Minimum Cost to Make at Least One Valid Path", "H", 2, "Each cell has an arrow; changing an arrow costs 1. Minimum cost for a path to the bottom-right.",
    ["0-1 BFS|Following the arrow costs 0, other directions cost 1|O(RC)|O(RC)", "Dijkstra|Same graph with a heap|O(RC log RC)|O(RC)"],
    ["May a cell's arrow be changed more than once?"],
    ["Minimum obstacle removal to reach corner (LC 2290)", "Costs in {0, 1, 2} (Dial's algorithm / buckets)"],
    ["Why does a deque replace the heap?"],
    ["Edge weights are only 0 and 1."]),
  P("shortest-paths", 815, "Bus Routes", "H", 2, "Minimum number of buses to travel from source stop to target stop.",
    ["BFS over routes|Stop → routes map; visit each route once|O(Σ route sizes)|O(Σ)"],
    ["Counting buses, not stops?"],
    ["Also minimise number of stops as tie-break", "Routes have timetables (time-dependent shortest path)"],
    ["Why must routes, not only stops, be marked visited?"],
    ["Model routes as the nodes."]),
  P("shortest-paths", 1334, "Find the City With the Smallest Number of Reachable Neighbours", "M", 3, "City with the fewest cities within a distance threshold (ties → largest id).",
    ["Floyd–Warshall|All-pairs then count|O(n³)|O(n²)", "Dijkstra from every node|Sparse graphs|O(n·E log n)|O(n + E)"],
    ["n ≤ 100?"],
    ["Transitive closure; graph centre; detect negative cycles with Floyd"],
    ["Loop order in Floyd–Warshall: why must k be outermost?"],
    ["Small n ⇒ all pairs is affordable."]),

  // advanced-graphs
  P("advanced-graphs", 1584, "Min Cost to Connect All Points", "M", 2, "Minimum cost to connect points with Manhattan-distance edges.",
    ["Prim O(n²)|Array of min distances to the tree|O(n²)|O(n)", "Kruskal|Sort all n² edges + DSU|O(n² log n)|O(n²)"],
    ["n ≤ 1000? Duplicate points?"],
    ["Some edges already built / forbidden", "Second-best MST; critical and pseudo-critical edges (LC 1489)", "Maximum spacing k-clustering (stop Kruskal early)"],
    ["Why is array-based Prim preferable here?"],
    ["It is a complete graph: do not materialise the edges."]),
  P("advanced-graphs", 1192, "Critical Connections in a Network", "H", 2, "Find all bridges of an undirected graph.",
    ["Tarjan low-link|Bridge iff low[v] > disc[u]|O(V + E)|O(V + E)"],
    ["Multi-edges possible? Connected?"],
    ["Articulation points (single points of failure)", "Edges to add so no bridge remains (leaf count of bridge tree)", "Online edge insertions"],
    ["Explain low[] in plain words."],
    ["A bridge is an edge not on any cycle."]),
  P("advanced-graphs", 332, "Reconstruct Itinerary", "H", 2, "Use all tickets once starting from JFK; lexicographically smallest itinerary.",
    ["Hierholzer|Sorted adjacency (min-heap / reversed sort); post-order push; reverse|O(E log E)|O(E)", "Backtracking|Try tickets in sorted order with undo|exponential worst case|O(E)"],
    ["Is a valid itinerary guaranteed? Duplicate tickets?"],
    ["No guarantee of validity: detect it", "Any Eulerian path in a general directed graph (find the start node)", "Valid Arrangement of Pairs (LC 2097)"],
    ["Why does greedy-forward fail and post-order succeed?"],
    ["Dead ends must appear at the end of the route: record airports when you get stuck."]),
  P("advanced-graphs", 785, "Is Graph Bipartite?", "M", 2, "Can nodes be split into two groups with every edge crossing groups?",
    ["BFS/DFS 2-colouring|Conflict on equal colours|O(V + E)|O(V)", "DSU|Union all neighbours of u; conflict if u joins them|O(E α)|O(V)"],
    ["Disconnected graph? Self loops?"],
    ["Possible Bipartition (dislikes)", "Minimum removals to make bipartite (hard; discuss)", "Maximum bipartite matching (awareness)"],
    ["What structure makes a graph non-bipartite?"],
    ["Colour a node, force its neighbours to the opposite colour."]),
  P("advanced-graphs", 753, "Cracking the Safe", "H", 3, "Shortest string containing every length-n code over k digits.",
    ["Eulerian circuit on de Bruijn graph|Nodes are (n−1)-length strings; edges are codes; Hierholzer|O(kⁿ)|O(kⁿ)"],
    ["Any shortest string acceptable?"],
    ["Explain why length is kⁿ + n − 1", "Generate a de Bruijn sequence for DNA k-mers"],
    ["Why Eulerian (edges) rather than Hamiltonian (nodes)?"],
    ["Make each code an edge rather than a node."]),
];
