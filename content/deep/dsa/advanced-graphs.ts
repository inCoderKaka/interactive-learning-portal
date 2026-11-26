import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

export const advancedGraphs: Record<string, Deep> = {
  // ════════════════════════════════════════════════════════════════════════════
  mst: {
    blurb: "Connect every vertex at the least total cost. Two greedy algorithms, one theorem (the cut property) that makes both correct, and a family of disguises from clustering to bottleneck paths.",
    signals: [
      "Connect all points / cities / houses at minimum total cost",
      "\"Every pair must be reachable, minimise the sum of the chosen links\"",
      "Minimise the largest edge on a path (a minimax / bottleneck path lives inside the MST)",
      "Split points into k groups with the largest possible gap between groups",
      "Which edges are mandatory (critical) or optional (pseudo-critical) in every optimal network",
    ],
    widgets: ["kruskal", "prim"],
    lesson: md`
## The problem

You have an undirected, connected graph with a weight on every edge. A **spanning tree** picks some edges so that every vertex is connected and there are no cycles. Any spanning tree of V vertices has exactly **V − 1 edges**: fewer cannot connect everything, more must contain a cycle. Among all spanning trees, a **minimum spanning tree (MST)** has the smallest total weight.

Real instances: laying cable between buildings, the cheapest set of roads that keeps a region connected, the backbone of a network, and as a subroutine in clustering, image segmentation and the 2-approximation for metric travelling salesman.

:::eli5
You must connect every village to the network. Each possible road has a price. You never need a road that closes a loop (the villages on that loop are already connected), and you want the cheapest set of roads that still connects everyone.
:::

If the graph is disconnected there is no spanning tree. The same algorithms then produce a **minimum spanning forest**: one MST per component.

## Two facts that make greed safe

Greedy algorithms usually fail. Here they provably work, and the reason is worth knowing cold because interviewers ask "why is this correct?".

**Cut property.** Split the vertices into any two non-empty groups (a *cut*). Among the edges that cross the cut, the lightest one belongs to some MST. If it is strictly lighter than every other crossing edge, it belongs to *every* MST.

*Why:* take an MST that does not contain that lightest crossing edge e. Adding e creates exactly one cycle, and that cycle must cross the cut a second time through some edge f. Swap f for e: still a spanning tree, and weight did not go up because w(e) ≤ w(f). So a tree containing e is at least as good. This "add one, remove one" move is the **exchange argument**.

**Cycle property.** On any cycle, the heaviest edge (if strictly heaviest) is in no MST. Removing it never disconnects anything (the rest of the cycle is a detour), and keeping it can always be beaten by an exchange.

Every MST algorithm is "repeatedly add an edge that the cut property certifies as safe". They differ only in *which cut* they look at.

## Kruskal: sort the edges, skip cycles

1. Sort all edges by weight.
2. Walk the sorted list. For edge (u, v): if u and v are in different components, take the edge and merge the components. Otherwise skip it (it would close a cycle).
3. Stop after V − 1 edges.

"Are u and v already connected?" is exactly what **union-find (DSU)** answers, in amortised near-constant time with path compression and union by rank or size.

[[widget:kruskal]]

**Why it is correct:** when Kruskal takes (u, v), consider the cut {u's current component} versus everything else. Every lighter edge crossing that cut was already examined and skipped only if it was inside one component, so (u, v) is the lightest crossing edge: safe by the cut property.

**Cost:** sorting dominates, O(E log E). Since E ≤ V², log E ≤ 2 log V, so this is also O(E log V). The DSU work is O(E α(V)), where α is the inverse Ackermann function (at most 4 for any input that fits in the universe).

## Prim: grow one tree

1. Start a tree at any vertex.
2. Repeatedly add the lightest edge with exactly one endpoint in the tree.
3. Stop when every vertex is in the tree.

The cut here is always {tree} versus {rest}, so every chosen edge is safe. A min-heap of crossing edges makes step 2 fast.

[[widget:prim]]

Two implementations, and the difference matters in interviews:

| Version | Heap holds | Cost | Use when |
|---|---|---|---|
| Lazy Prim | edges; stale ones skipped on pop | O(E log E) | the default; simplest correct code |
| Eager Prim | one best-known edge per vertex (decrease-key or an indexed heap) | O(E log V) | you have an indexed priority queue |
| Array Prim | dist[] array, scan for the minimum | **O(V²)**, no heap | dense graphs, especially complete graphs from points |

With a Fibonacci heap Prim is O(E + V log V), a theoretical result that is slower in practice.

:::tip Points on a plane
"Min Cost to Connect All Points" (LeetCode 1584) is a complete graph: E = V². Kruskal must build and sort V² edges: O(V² log V) time and O(V²) memory. Array Prim needs O(V²) time and O(V) memory, with no edge list at all. Saying this unprompted is a strong signal.
:::

## A third algorithm worth naming: Borůvka

Every component simultaneously picks its lightest outgoing edge, all are added, components merge, repeat. Each round at least halves the number of components, so there are O(log V) rounds and O(E log V) total. It was the first MST algorithm (1926, for the electrical network of Moravia) and it parallelises naturally, which is why distributed and GPU MST algorithms build on it.

## Choosing between them

- **Sparse graph given as an edge list** → Kruskal. Short code, and the edge list is already in the right shape.
- **Dense or complete graph** → array Prim in O(V²).
- **Adjacency list, sparse, heap available** → either; Prim with a heap is fine.
- **Edges arrive sorted, or queries are offline by threshold** → Kruskal's "process edges in weight order with a DSU" shape (see disguises below).

## Properties you can use

- **Uniqueness.** If all edge weights are distinct, the MST is unique. With ties there can be several MSTs, all with the same total weight and the same multiset of edge weights.
- **Monotone transforms do not matter.** Any strictly increasing function of the weights (add a constant, square non-negative weights, take logs of positive ones) leaves the MST unchanged, because both algorithms only *compare* weights. Shortest paths do *not* have this property.
- **Negative weights are fine.** Nothing in either algorithm assumes non-negative weights.
- **Maximum spanning tree:** negate the weights, or sort descending.
- **Bottleneck (minimax) paths.** For any two vertices, the path between them *in the MST* minimises the largest edge weight among all paths in the graph. So "the path that minimises its heaviest edge" questions (minimum effort path, swim in rising water) can be solved by Kruskal-style processing: add edges in increasing order until the two endpoints connect; the last edge added is the answer.
- **MST ≠ shortest-path tree.** The MST minimises the *sum over the tree*. A shortest-path tree from s minimises each *distance from s*. They differ even on a triangle (see the doubts below).

## Variants and disguises

- **Virtual source node.** "Each house can build its own well for cost w_i, or pipe from a neighbour" (Optimize Water Distribution, LC 1168): add a vertex 0 connected to every house i with weight w_i and take the MST. The well choice becomes an ordinary edge.
- **Critical and pseudo-critical edges** (LC 1489). Compute the MST weight W. For each edge e: build the MST *without* e. If it is impossible or heavier than W, e is **critical**. Otherwise, build the MST *forcing* e first; if the weight equals W, e is **pseudo-critical**. O(E² α) with Kruskal, fine for E ≈ 200.
- **k-clustering with maximum spacing.** Run Kruskal and stop when exactly k components remain. The next edge Kruskal would add is the maximum possible minimum distance between clusters. This is single-linkage clustering.
- **Offline threshold queries** (Checking Existence of Edge Length Limited Paths, LC 1697). Sort queries by limit and edges by weight; sweep, unioning every edge below the current limit, then answer "connected?" with find. This is Kruskal with queries interleaved.
- **Second-best MST.** For each non-tree edge (u, v), adding it creates a cycle with the tree path u⇝v; removing the heaviest edge on that path gives a candidate. Find the max edge on tree paths with binary lifting: O(E log V).
- **Degree-constrained or Steiner trees** (connect only a subset of terminals, possibly through extra vertices): NP-hard. Recognise and say so rather than trying to force an MST.
- **Directed graphs:** the analogue is a *minimum spanning arborescence* (Chu–Liu/Edmonds algorithm, O(EV)). An undirected MST algorithm on a directed graph is simply wrong.

## Interview angles

- Lead with the cut property when asked why greedy works, and draw the exchange.
- State the complexity of both algorithms and choose by density, out loud.
- Expect: "What if weights are updated?" (Incremental: adding an edge (u, v, w) creates one cycle; drop its heaviest edge, O(V) with a tree path walk. Decreasing a non-tree edge is the same. General dynamic MST is a research topic.)
- Expect: "Can you do it without storing all V² edges?" for points → array Prim.
- Expect: "Is the answer unique?" → only if weights are distinct.

## Connections

- [Union-Find](/learn/dsu-core) is Kruskal's engine; [heaps](/learn/heap-internals) are Prim's.
- Prim and [Dijkstra](/learn/dijkstra) share code: change the heap key from "edge weight" to "distance from the source" and you have Dijkstra.
- Minimax paths reappear in [Dijkstra on modified costs](/learn/state-dijkstra) and [binary search on the answer](/learn/bs-answer).
`,
    doubts: [
      ["Why does greed work for MST when it fails for so many other problems?", "Because of the cut property: whatever partial tree you have, the lightest edge crossing a cut that respects it can always be swapped into an optimal solution (the exchange argument). Formally, the forests of a graph form a **matroid**, and on any matroid the greedy algorithm that adds the cheapest element keeping independence is optimal. Shortest paths, knapsack and most scheduling problems lack this structure."],
      ["Is the MST the same as the shortest-path tree from some vertex?", "No. Triangle A–B (1), B–C (1), A–C (1.5). The MST is {A–B, B–C} with total 2, so A reaches C through B at distance 2. The shortest-path tree from A uses A–C directly (1.5) and A–B: total weight 2.5, but every distance from A is minimal. The MST minimises the *sum*; the shortest-path tree minimises each *distance from one source*."],
      ["Does Kruskal or Prim break with negative edge weights?", "No. Both only compare weights, and the cut property never assumes positivity. (Dijkstra is the one that breaks with negative weights.)"],
      ["Why is O(E log E) the same as O(E log V)?", "A simple graph has E ≤ V², so log E ≤ log V² = 2 log V. Constants disappear in big-O. With parallel edges, keep only the lightest per pair first."],
      ["In lazy Prim, why do I need the `if visited: continue` after popping?", "Several entries for the same vertex can be in the heap (one per crossing edge seen so far). Only the first one popped is the lightest; later ones are stale. Without the check you would add the vertex twice and count extra weight, or create a cycle."],
      ["When should I stop Kruskal?", "After V − 1 accepted edges; nothing later can be accepted. If the edge list runs out first, the graph is disconnected (you have a forest)."],
      ["If two MSTs exist, do they have the same edges?", "Not necessarily the same edges, but always the same total weight and the same sorted list of edge weights. With all weights distinct the MST is unique."],
      ["Can I use BFS or DFS instead?", "Only when all weights are equal: then any spanning tree is minimum, and a BFS or DFS tree is one. With different weights you need the ordering."],
      ["How does union-find get its near-constant time, and do I need both optimisations?", "Path compression flattens trees as you query; union by rank or size keeps them shallow as you merge. Together the amortised cost per operation is O(α(n)). Either alone gives O(log n) amortised, which is also fine for interviews. Mention both."],
      ["Why does the MST contain the minimax path between every pair?", "Suppose the MST path from u to v has a heaviest edge e, and some other path P in the graph uses only edges lighter than e. Removing e splits the tree into two sides; P must cross between them with some edge f lighter than e. Swapping e for f gives a lighter spanning tree: contradiction."],
    ],
    revise: md`
### The core
? What does a spanning tree of V vertices contain? :: Exactly V − 1 edges, connecting all vertices, with no cycle.
? State the cut property. :: For any cut, the lightest edge crossing it belongs to some MST (to every MST if it is strictly lightest).
? State the cycle property. :: The strictly heaviest edge on any cycle is in no MST.
? Kruskal in one line, with its complexity? :: Sort edges; add each unless its endpoints are already connected (DSU). O(E log E) = O(E log V).
? Prim in one line, with its complexity? :: Grow one tree; repeatedly add the lightest edge leaving it. Heap: O(E log V). Array scan: O(V²).
? Which algorithm for a complete graph of n points? :: Array Prim, O(n²) time and O(n) memory, with no edge list.

### Properties
? When is the MST unique? :: When all edge weights are distinct.
? Does adding 5 to every weight change the MST? :: No. Any strictly increasing transform preserves it (unlike shortest paths).
? Negative weights? :: Fine for both Kruskal and Prim.
? Minimax path between u and v? :: The path between them in the MST minimises the maximum edge weight.

### Disguises
? Wells or pipes (each house can build its own well)? :: Add a virtual vertex 0 with an edge of weight wellCost_i to each house, then take the MST.
? Critical vs pseudo-critical edges? :: Critical: excluding it makes the MST heavier or impossible. Pseudo-critical: not critical, and forcing it in still gives the optimal weight.
? Max-spacing k-clustering? :: Run Kruskal until k components remain; the next edge's weight is the spacing.
? Directed graph analogue? :: Minimum spanning arborescence (Chu–Liu/Edmonds), not Kruskal or Prim.

| | Kruskal | Prim (heap) | Prim (array) |
|---|---|---|---|
| Time | O(E log E) | O(E log V) | O(V²) |
| Best for | sparse, edge list | sparse, adjacency list | dense / complete |
`,
    pitfalls: [
      "Using Kruskal on a complete graph of n points: O(n² log n) time and O(n²) memory when array Prim needs neither",
      "Lazy Prim without the visited check on pop: vertices added twice, weight over-counted",
      "Forgetting the graph may be disconnected: check that V − 1 edges were taken",
      "Claiming the MST gives shortest paths between vertices",
      "Running an undirected MST algorithm on a directed graph",
      "Not deduplicating parallel edges (keep the lightest) when the input allows them",
    ],
    quiz: [
      Q("Edge e is the unique lightest edge crossing some cut. What can you conclude?", ["e is in some MST but maybe not all", "*e is in every MST", "e is in no MST", "Nothing without knowing the cut"], "Strictly lightest across a cut means every MST must contain it: otherwise an exchange would make a lighter tree."),
      Q("1,000 points in the plane, edge weight = Manhattan distance. Best MST approach?", ["Kruskal on all pairs", "*Array-based Prim, O(n²)", "Dijkstra from point 0", "BFS"], "The graph is complete. Array Prim avoids generating and sorting a million edges."),
      Q("You square every edge weight (all weights positive). The MST…", ["may change", "*stays the same", "becomes a shortest-path tree", "doubles in weight"], "Squaring preserves order on positives, and MST algorithms only compare weights."),
      Q("Kruskal skips edge (u, v) because find(u) == find(v). Which property justifies the skip?", ["Cut property", "*Cycle property", "Triangle inequality", "Optimal substructure"], "The edge closes a cycle on which it is the heaviest edge so far examined."),
      Q("Minimum effort path in a grid (minimise the maximum step) can be solved by…", ["Plain BFS", "*Adding edges in increasing order with DSU until start and end connect", "Floyd–Warshall only", "Topological sort"], "Minimax paths live in the MST, so Kruskal's order finds the bottleneck directly."),
    ],
    template: `// Kruskal: O(E log E)
struct DSU { vector<int> p, r; DSU(int n): p(n), r(n, 0) { iota(p.begin(), p.end(), 0); }
  int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
  bool unite(int a, int b) { a = find(a); b = find(b); if (a == b) return false;
    if (r[a] < r[b]) swap(a, b); p[b] = a; if (r[a] == r[b]) r[a]++; return true; } };
long long kruskal(int n, vector<array<int,3>>& e /* {w, u, v} */) {
  sort(e.begin(), e.end()); DSU d(n); long long total = 0; int used = 0;
  for (auto [w, u, v] : e) if (d.unite(u, v)) { total += w; if (++used == n - 1) break; }
  return used == n - 1 ? total : -1;   // -1: disconnected
}

// Prim on a complete graph of points: O(n^2), no edge list
int primPoints(vector<vector<int>>& pts) {
  int n = pts.size(), total = 0; vector<int> dist(n, INT_MAX); vector<bool> in(n, false); dist[0] = 0;
  for (int it = 0; it < n; it++) {
    int u = -1; for (int i = 0; i < n; i++) if (!in[i] && (u == -1 || dist[i] < dist[u])) u = i;
    in[u] = true; total += dist[u];
    for (int v = 0; v < n; v++) if (!in[v])
      dist[v] = min(dist[v], abs(pts[u][0] - pts[v][0]) + abs(pts[u][1] - pts[v][1]));
  }
  return total;
}`,
    sources: [
      S.paper("On the shortest spanning subtree of a graph and the traveling salesman problem (Kruskal, 1956)", "Proceedings of the AMS", "https://www.ams.org/journals/proc/1956-007-01/S0002-9939-1956-0078686-7/"),
      S.book("Algorithms, 4th ed. §4.3 Minimum Spanning Trees", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/43mst/"),
      S.book("Algorithms, chapter 7: Minimum Spanning Trees", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/07-mst.pdf"),
      S.article("Minimum spanning tree: Kruskal with DSU", "cp-algorithms", "https://cp-algorithms.com/graph/mst_kruskal_with_dsu.html"),
      S.article("Minimum spanning tree: Prim's algorithm", "cp-algorithms", "https://cp-algorithms.com/graph/mst_prim.html"),
      S.article("Second best minimum spanning tree", "cp-algorithms", "https://cp-algorithms.com/graph/second_best_mst.html"),
    ],
    problems: [1584, 1489, 1168, 1135, 1697, 1724, 3600],
    prereq: ["dsu-core", "heap-internals"],
  },

  // ════════════════════════════════════════════════════════════════════════════
  "bridges-ap": {
    blurb: "Which single link, or single machine, takes the network down? One DFS with two timestamps per vertex answers both, and the same idea underpins biconnected components.",
    signals: [
      "\"Critical connections\": edges whose removal disconnects the graph",
      "A single point of failure: a vertex whose removal splits the network",
      "Minimum number of removals to disconnect something (the answer is often 0, 1 or 2)",
      "Group edges into maximal 2-connected pieces (biconnected components)",
    ],
    widgets: ["tarjan-bridges"],
    lesson: md`
## The questions

In an undirected graph:

- A **bridge** (cut edge) is an edge whose removal increases the number of connected components.
- An **articulation point** (cut vertex) is a vertex whose removal, together with its edges, increases the number of components.

Network engineers ask these questions about redundancy ("which single cable failure partitions the data centre?"). Interviewers ask them because the solution is a beautiful use of DFS that most candidates have only memorised.

The brute force is clear: remove each edge (or vertex), run a BFS, see if the graph is still connected. That is O(E · (V + E)). Tarjan's low-link method does it in a single DFS, **O(V + E)**.

## The two numbers

Run a DFS. For every vertex u record:

- **disc[u]**: the time u was first visited (0, 1, 2, …).
- **low[u]**: the smallest disc value reachable from u's DFS subtree using any number of *tree edges downward* plus **at most one back edge**.

In an undirected DFS every non-tree edge is a **back edge**: it connects a vertex to one of its ancestors. (There are no cross edges in an undirected DFS: if u and v were in different branches, whichever was visited first would have discovered the other through that edge.) A back edge is evidence of a cycle, and cycles are what protect edges from being bridges.

How low is computed, inside the DFS of u:

- for a tree child v, after dfs(v) returns: low[u] = min(low[u], low[v])
- for a back edge u–w to an already visited w (other than through the edge you came in on): low[u] = min(low[u], disc[w])

## The tests

**Bridge:** a tree edge u → v is a bridge exactly when **low[v] > disc[u]**. Nothing in v's subtree can reach u or anything above it except through the edge u–v itself.

**Articulation point:**

- a non-root vertex u is an articulation point when it has some child v with **low[v] ≥ disc[u]**: v's subtree cannot climb above u without going through u;
- the DFS **root** is an articulation point when it has **two or more DFS children** (each child's subtree is reachable only through the root).

Note the strict vs non-strict comparison. For a bridge, the subtree must not even reach u (reaching u by another path means a cycle through u–v). For an articulation point, reaching u itself is not enough, because u is the vertex being removed.

[[widget:tarjan-bridges]]

## Why the tests are right

Take a tree edge u → v. Every path from v's subtree to the rest of the graph leaves the subtree through some edge. In an undirected DFS, edges leaving a subtree go either to an ancestor (back edges) or are the tree edge u–v itself. If some back edge from the subtree lands at u or above (low[v] ≤ disc[u]), removing u–v leaves that detour: not a bridge. If none does (low[v] > disc[u]), u–v was the only connection: a bridge. The articulation-point argument is identical with "above u" in place of "at u or above".

## Implementation traps

**Skip the parent by edge, not by vertex.** If the graph has parallel edges (two cables between the same pair), the second edge u–v is a genuine back edge that saves u–v from being a bridge. Code that skips "neighbour == parent" ignores it and reports a false bridge. Pass the *edge id* you arrived through and skip only that edge.

**Use disc[w] for back edges, not low[w]**, when computing bridges and articulation points. (Using low[w] happens to give correct bridges but wrong articulation points in some graphs; using disc is the standard, provably correct form.)

**Recursion depth.** With 10⁵ vertices in a path-like graph, recursive DFS overflows the default stack in Python and can in Java and C++. Mention an iterative DFS with an explicit stack of (vertex, next-neighbour index), or raising the recursion limit.

**Disconnected graphs:** run the DFS from every unvisited vertex; each start is a root.

## Biconnected and 2-edge-connected components

- **2-edge-connected components**: delete all bridges; the remaining connected components are the pieces that survive any single edge failure. Contracting each into one vertex turns the graph into the **bridge tree**, and many "minimum edges to add to make the network fault-tolerant" problems become questions about that tree's leaves: you need ⌈leaves / 2⌉ new edges.
- **Biconnected components** (blocks): maximal pieces with no articulation point inside. Tarjan computes them by pushing edges on a stack and popping a block whenever low[v] ≥ disc[u]. The block-cut tree joins blocks through articulation points.

## Variants and disguises

- **Critical Connections in a Network** (LC 1192): list the bridges. The canonical problem.
- **Minimum days to disconnect an island** (LC 1568): the answer is always 0, 1 or 2. Already disconnected: 0. Some cell is an articulation point of the land graph: 1. Otherwise 2, because removing the two neighbours of a corner-most cell always isolates it. Brute force over single removals is also fast enough at 30 × 30.
- **Single points of failure** in a service-dependency graph, a power grid or a road map: articulation points.
- **Is the graph 2-edge-connected (robust to any one link failure)?** No bridges.
- **Directed graphs:** the analogous concepts are dominators and strong bridges, a different and harder theory. Undirected low-link reasoning does not transfer; directed reachability uses SCCs.

## Interview angles

- Define disc and low precisely before coding; that alone separates a candidate who understands from one reciting.
- Say why parallel edges force the edge-id parent check.
- State the root special case for articulation points without being asked.
- Expect: "Can you do it iteratively?" and "What if the graph is huge?" (Iterative DFS; the method stays linear.)
- Expect: "Now edges fail one at a time; which removal first disconnects s and t?" Offline: reverse time and add edges with a DSU.

## Connections

- [DFS](/learn/dfs) and its edge classification are the foundation; [SCC](/learn/scc) uses the same low-link idea on directed graphs.
- The bridge tree is a tree: [tree DP](/learn/tree-dp) and [LCA](/learn/lca) then answer path queries about edge-disjoint routes.
`,
    doubts: [
      ["What exactly does low[u] mean? I keep memorising the formula without understanding it.", "low[u] is the earliest (smallest discovery time) vertex that u's subtree can 'reach back to' using tree edges downward and then one back edge upward. If you picture the DFS tree hanging from the root, low[u] tells you how high up the subtree can grab. A bridge is an edge where the subtree below cannot grab anything at or above the edge's top end."],
      ["Why is the bridge test strict (>) but the articulation test non-strict (≥)?", "For edge u–v to be a bridge, v's subtree must not reach u by any other route. Reaching exactly u (low[v] = disc[u]) means a cycle through u–v, so not a bridge. For u to be an articulation point, the subtree must not reach anything *above* u. Reaching u itself does not help once u is removed, so equality still makes u a cut vertex."],
      ["Why does the root need its own rule?", "Nothing is above the root, so low[v] ≥ disc[root] holds for every child trivially. The root is a cut vertex only when removing it separates its DFS children, which happens exactly when it has two or more children: if there were an edge between those subtrees, DFS would have explored it from the first child."],
      ["Why use disc[w] rather than low[w] when I see a back edge to w?", "A back edge gives u's subtree access to w itself, so the earliest vertex it proves reachable is disc[w]. low[w] may describe a route through w's own subtree that u cannot use 'with one back edge'. For bridges either gives the same answer; for articulation points low[w] can mark vertices incorrectly. disc[w] is the definition."],
      ["What goes wrong with multi-edges if I skip the parent vertex?", "Two parallel edges a–b: neither is a bridge (one survives the other's removal). If you skip every edge back to the parent vertex, you never see the second edge as a back edge, so low[b] stays > disc[a] and you report a false bridge. Skip only the specific edge id you arrived through."],
      ["Are there cross edges in an undirected DFS?", "No. If u and v are adjacent and u is visited first, DFS from u will explore v before u finishes (unless v was already reached from inside u's subtree). Either way v ends up a descendant of u. So every non-tree edge joins a vertex to an ancestor."],
      ["Does every bridge's endpoint have to be an articulation point?", "Almost. If u–v is a bridge and u has degree ≥ 2, then u is an articulation point. A degree-1 endpoint (a leaf hanging off the bridge) is not: removing it leaves the rest connected."],
      ["Does BFS work instead of DFS?", "Not for this. The argument relies on the DFS property that every non-tree edge goes to an ancestor. BFS trees have cross edges between branches, so the low-link reasoning breaks."],
    ],
    revise: md`
### Definitions
? Bridge? :: An edge whose removal increases the number of connected components.
? Articulation point? :: A vertex whose removal (with its edges) increases the number of components.
? disc[u]? :: The DFS discovery time of u.
? low[u]? :: The smallest disc reachable from u's subtree via tree edges down plus at most one back edge.

### The rules
? Update low on returning from tree child v? :: low[u] = min(low[u], low[v]).
? Update low on a back edge u–w? :: low[u] = min(low[u], disc[w]).
? Bridge test for tree edge u→v? :: low[v] > disc[u] (strict).
? Articulation test for a non-root u? :: Some child v has low[v] ≥ disc[u].
? Articulation test for the root? :: Two or more DFS children.
? Complexity? :: One DFS: O(V + E).

### Traps
? Graph has parallel edges. What changes? :: Skip the parent by edge id, not by vertex, or you report false bridges.
? Why no cross edges in undirected DFS? :: An edge to a later-discovered vertex is always explored from the earlier one first, making it a descendant.
? Minimum days to disconnect an island (1568) answer range? :: Always 0, 1 or 2.
? What is the bridge tree? :: Contract 2-edge-connected components; bridges become the edges of a tree.
`,
    pitfalls: [
      "Skipping the parent by vertex id: false bridges on graphs with parallel edges",
      "Using ≥ for bridges or > for articulation points (the comparisons are different on purpose)",
      "Forgetting the root rule (two or more DFS children)",
      "Recursive DFS overflowing the stack on 10⁵ vertices",
      "Not restarting the DFS from every unvisited vertex in a disconnected graph",
    ],
    quiz: [
      Q("Tree edge u→v with disc[u] = 4 and low[v] = 4. Is u–v a bridge?", ["Yes", "*No", "Only if u is the root", "Cannot tell"], "low[v] = disc[u] means v's subtree reaches u by another route, so there is a cycle through u–v."),
      Q("Same numbers (disc[u] = 4, low[v] = 4), u not the root. Is u an articulation point?", ["*Yes", "No", "Only if v is a leaf", "Cannot tell"], "low[v] ≥ disc[u]: v's subtree cannot reach above u, so removing u cuts it off."),
      Q("The DFS root has exactly one child. Is it an articulation point?", ["Yes, always", "*No", "Only if the child is a leaf", "Depends on low values"], "Removing the root leaves its single subtree connected."),
      Q("Two parallel edges connect a and b and nothing else touches them. Are they bridges?", ["Both are", "One is", "*Neither is", "Depends on DFS order"], "Removing either leaves the other: no removal disconnects. Correct code must skip the parent by edge id."),
    ],
    template: `// Bridges and articulation points, O(V + E). adj[u] = {v, edgeId}
vector<vector<pair<int,int>>> adj; vector<int> disc, low; vector<bool> isAP;
vector<pair<int,int>> bridges; int timer = 0;
void dfs(int u, int parentEdge) {
  disc[u] = low[u] = timer++; int children = 0;
  for (auto [v, id] : adj[u]) {
    if (id == parentEdge) continue;                 // skip the edge, not the vertex
    if (disc[v] != -1) { low[u] = min(low[u], disc[v]); continue; }   // back edge
    dfs(v, id); children++;
    low[u] = min(low[u], low[v]);
    if (low[v] > disc[u]) bridges.push_back({u, v});
    if (parentEdge != -1 && low[v] >= disc[u]) isAP[u] = true;
  }
  if (parentEdge == -1 && children >= 2) isAP[u] = true;
}
// for (int s = 0; s < n; s++) if (disc[s] == -1) dfs(s, -1);`,
    sources: [
      S.paper("Depth-first search and linear graph algorithms (Tarjan, 1972)", "SIAM Journal on Computing", "https://epubs.siam.org/doi/10.1137/0201010"),
      S.article("Finding bridges in a graph in O(N + M)", "cp-algorithms", "https://cp-algorithms.com/graph/bridge-searching.html"),
      S.article("Finding articulation points in a graph in O(N + M)", "cp-algorithms", "https://cp-algorithms.com/graph/cutpoints.html"),
      S.article("Biconnected component", "Wikipedia", "https://en.wikipedia.org/wiki/Biconnected_component"),
      S.book("Algorithms, chapter 6: Depth-First Search", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/06-dfs.pdf"),
    ],
    problems: [1192, 1568],
    prereq: ["dfs"],
  },

  // ════════════════════════════════════════════════════════════════════════════
  scc: {
    blurb: "In a directed graph, which vertices can all reach each other? Two linear-time algorithms find these components, and contracting them turns any directed graph into a DAG you can sort and run DP on.",
    signals: [
      "Directed graph with cycles, and you need to treat each cycle cluster as one unit",
      "\"Mutually reachable\" groups: friend circles in a directed follow graph, deadlock groups",
      "Minimum edges to add to make a directed graph strongly connected",
      "2-SAT: boolean constraints of the form (a OR b)",
      "DP on a directed graph that is not a DAG (condense first)",
    ],
    widgets: ["kosaraju"],
    lesson: md`
## Definitions

In a directed graph, u and v are **strongly connected** if u can reach v *and* v can reach u. This is an equivalence relation (reflexive, symmetric, transitive), so it splits the vertices into classes: the **strongly connected components (SCCs)**. A single vertex with no cycle through it is an SCC of size one.

Contract each SCC to a single vertex, keeping an edge between components when any original edge joins them. The result, the **condensation**, is always a **DAG**: if two components had a cycle between them, every vertex of both could reach every other, so they would be one component.

That fact is the reason SCCs matter: they let you apply topological order, longest-path DP and reachability counting to any directed graph, cycles included.

## Kosaraju's algorithm: two passes

1. Run DFS over the whole graph and record vertices in order of **finish time** (push a vertex when all its descendants are done).
2. Reverse every edge.
3. Process vertices in **decreasing finish time**. Each unvisited vertex starts a DFS on the reversed graph; everything that DFS reaches is exactly one SCC.

[[widget:kosaraju]]

**Why it works.** The vertex that finishes last in pass 1 belongs to a component C that is a **source** in the condensation: nothing outside C reaches C. (If some other component reached C, DFS would have finished inside C first and returned through that component later.) In the reversed graph, C becomes a **sink**: a DFS started in C cannot leave it. So the first DFS of pass 2 collects exactly C. Remove C and repeat the argument on what remains: the next-latest finisher is a source of the rest, and so on.

Cost: two DFS passes plus building the reversed graph: **O(V + E)**.

## Tarjan's algorithm: one pass with a stack

Tarjan does it in a single DFS using the same low-link idea as bridges, adapted to directed graphs:

- disc[u] as before; low[u] = the smallest disc reachable from u's subtree through tree edges plus at most one edge to a vertex **still on the stack**;
- push every vertex onto a stack when visited, and mark it on-stack;
- after exploring u's neighbours, if **low[u] == disc[u]**, u is the root of an SCC: pop the stack down to u; those vertices are one component.

The on-stack condition is the subtle part. An edge to a vertex already *popped* leads into a finished component that cannot reach back, so it must not lower low[u]. Edges to vertices still on the stack point into the current DFS path's unfinished components, which can.

Tarjan emits SCCs in **reverse topological order** of the condensation (sinks first), which is handy for DP: by the time you finish a component, every component it can reach is already done.

| | Kosaraju | Tarjan |
|---|---|---|
| Passes | 2 DFS + reversed graph | 1 DFS |
| Extra memory | reversed adjacency | stack + on-stack flags |
| Output order | topological (sources first) | reverse topological (sinks first) |
| Easiest to explain | yes | trickier (on-stack rule) |

Both are O(V + E). In an interview, Kosaraju is easier to get right and to justify; Tarjan is worth knowing because it is one pass and shares the low-link idea with bridges.

## What you do with the condensation

- **Count or order**: number of SCCs, size of each, topological order of components.
- **Reachability counting / longest path on a graph with cycles**: compute values per component (sum of sizes, best score), then DP over the condensation DAG.
- **Minimum edges to make the graph strongly connected**: with s source components and t sink components in the condensation (and more than one component overall), the answer is **max(s, t)**. With one component the answer is 0.
- **Find a minimum set of start vertices that reach everything**: pick one vertex from each component with in-degree 0 in the condensation.

## 2-SAT

A classic application. You have boolean variables and clauses of the form (a ∨ b). Each clause is equivalent to two implications: ¬a → b and ¬b → a. Build the **implication graph** with 2n vertices (x and ¬x for every variable). The formula is satisfiable **iff no variable is in the same SCC as its negation**. To read off an assignment, give x the value true when comp[x] comes after comp[¬x] in topological order (with Tarjan's numbering: when comp[x] < comp[¬x]). This solves scheduling-with-constraints puzzles in linear time; general SAT (3 or more literals per clause) is NP-complete.

## Special case: functional graphs

When every vertex has exactly one outgoing edge (a "functional graph": next pointers, permutations, "each person names one other person"), every component is a single cycle with trees feeding into it. You do not need a full SCC algorithm: walk with colouring (white, grey, black), or use in-degree peeling (Kahn-style removal of in-degree-0 vertices) to strip the trees and leave only the cycles. Problems: Longest Cycle in a Graph (LC 2360), Maximum Employees to Be Invited to a Meeting (LC 2127), Count Visited Nodes in a Directed Graph (LC 2876).

## Variants and disguises

- **Find Eventual Safe States** (LC 802): a vertex is safe if it cannot reach a cycle. Reverse the graph and peel with Kahn, or 3-colour DFS. (No full SCC needed, but SCC reasoning explains it.)
- **Course Schedule** with a cycle report: the non-trivial SCCs are exactly the cyclic course groups.
- **Deadlock detection** in wait-for graphs: any SCC of size > 1 (or a self-loop) is a deadlock.
- **Social graphs**: "groups where everyone follows everyone transitively".
- **Compiler and build systems**: mutually recursive functions or modules are SCCs of the call or import graph.

## Interview angles

- Lead with "contract the SCCs and you get a DAG"; then the problem becomes a DAG problem.
- Explain Kosaraju's correctness via "the last finisher is in a source component".
- Mention the on-stack rule if you choose Tarjan, and why edges to finished components do not count.
- Expect: "Recursion depth for 10⁵ vertices?" → iterative DFS.
- Expect: "Minimum edges to add for strong connectivity?" → max(sources, sinks).

## Connections

- [DFS and edge types](/learn/dfs), [topological sort](/learn/kahn) and [DAG DP](/learn/dag-dp) are the before and after.
- [Bridges and articulation points](/learn/bridges-ap) use the same low-link idea on undirected graphs.
`,
    doubts: [
      ["Why must Kosaraju's second pass run on the reversed graph?", "Pass 1's last finisher lies in a source component C: nothing outside reaches C, but C may reach many other components. A DFS on the original graph from C would leak into them. Reversing the edges makes C a sink, so a DFS from it stays inside C. The reversal is what turns 'first in finish order' into 'cannot escape'."],
      ["Why decreasing finish time rather than discovery time?", "Discovery time says nothing about the condensation's structure. Finish time does: if component A can reach component B, the latest finish time in A is greater than the latest in B. That ordering property is what the correctness proof uses."],
      ["In Tarjan, why can't I lower low[u] through an edge to any visited vertex?", "A visited vertex that is no longer on the stack belongs to a component that has already been completed and emitted. It cannot reach back to u (otherwise it would have been part of u's component and still on the stack). Lowering low[u] through it would merge unrelated components."],
      ["Is a single vertex an SCC?", "Yes. A vertex on no cycle forms an SCC by itself. 'Count the cycles' questions usually want SCCs of size > 1 (or vertices with a self-loop)."],
      ["Why is the condensation always acyclic?", "If components A and B had a cycle A → … → B → … → A, every vertex of A could reach every vertex of B and back, so A and B would be one strongly connected component, contradicting their being separate."],
      ["Do I need SCCs for undirected graphs?", "No. In an undirected graph, reachability is already symmetric, so ordinary connected components (BFS, DFS or union-find) are the answer. SCCs are a directed-graph concept."],
      ["Why max(sources, sinks) edges to make it strongly connected?", "Every source needs a new incoming edge and every sink a new outgoing edge, so at least max(s, t) edges are needed. Pairing sinks to sources in a cycle achieves it (Eswaran and Tarjan, 1976). Special case: an already strongly connected graph needs 0."],
      ["How does 2-SAT decide the value of each variable?", "Process components in reverse topological order: a literal whose component comes later in topological order (closer to the sinks) should be true, because true can only imply things, and a sink cannot force anything further. Concretely, x = true if comp(x) is topologically after comp(¬x)."],
    ],
    revise: md`
### Definitions
? Strongly connected component? :: A maximal set of vertices where every vertex reaches every other (directed).
? Condensation? :: Contract each SCC to one vertex: the result is always a DAG.

### Kosaraju
? The three steps? :: DFS recording finish order; reverse all edges; DFS on the reversed graph in decreasing finish time, each tree being one SCC.
? Why does it work? :: The last finisher lies in a source component, which becomes a sink after reversal, so the DFS cannot leave it.
? Complexity? :: O(V + E).

### Tarjan
? When is u the root of an SCC? :: When low[u] == disc[u] after exploring its neighbours; pop the stack down to u.
? Which edges may lower low[u]? :: Tree edges (via low[v]) and edges to vertices still on the stack (via disc[w]).
? Output order? :: Reverse topological (sinks first).

### Uses
? Minimum edges to make a digraph strongly connected? :: max(#source SCCs, #sink SCCs), or 0 if already one SCC.
? 2-SAT satisfiable iff…? :: No variable shares an SCC with its negation.
? Clause (a ∨ b) becomes which implications? :: ¬a → b and ¬b → a.
? Functional graph (out-degree 1 everywhere) shape? :: Cycles with trees feeding into them; peel in-degree-0 vertices to find the cycles.
`,
    pitfalls: [
      "Running pass 2 of Kosaraju on the original graph instead of the reversed one",
      "In Tarjan, lowering low through edges to vertices already popped from the stack",
      "Treating SCCs as relevant to undirected graphs (use plain components)",
      "Forgetting the 'already one SCC → 0' special case in the max(sources, sinks) formula",
      "Deep recursion on large graphs; use an iterative DFS",
    ],
    quiz: [
      Q("After contracting every SCC of a directed graph, the result is…", ["A tree", "*A DAG", "Strongly connected", "Bipartite"], "A cycle between two components would merge them into one."),
      Q("Kosaraju's second pass starts from…", ["The vertex discovered first", "*The vertex that finished last in pass 1", "Any vertex with in-degree 0", "The smallest-numbered vertex"], "The last finisher sits in a source component, a sink after reversal."),
      Q("A condensation has 3 source components and 5 sink components. Minimum edges to make the graph strongly connected?", ["3", "*5", "8", "2"], "max(sources, sinks) = 5."),
      Q("A 2-SAT instance is unsatisfiable exactly when…", ["The implication graph has a cycle", "*Some x and ¬x are in the same SCC", "Some SCC has size > 2", "There are more clauses than variables"], "Then x implies ¬x and ¬x implies x."),
    ],
    template: `// Kosaraju: O(V + E)
vector<vector<int>> g, rg; vector<int> order, comp; vector<bool> seen;
void dfs1(int u) { seen[u] = true; for (int v : g[u]) if (!seen[v]) dfs1(v); order.push_back(u); }
void dfs2(int u, int c) { comp[u] = c; for (int v : rg[u]) if (comp[v] == -1) dfs2(v, c); }
int kosaraju(int n) {
  seen.assign(n, false); comp.assign(n, -1);
  for (int i = 0; i < n; i++) if (!seen[i]) dfs1(i);
  int c = 0;
  for (int i = n - 1; i >= 0; i--) if (comp[order[i]] == -1) dfs2(order[i], c++);
  return c;   // comp[] numbers components in topological order of the condensation
}`,
    sources: [
      S.paper("Depth-first search and linear graph algorithms (Tarjan, 1972)", "SIAM Journal on Computing", "https://epubs.siam.org/doi/10.1137/0201010"),
      S.paper("A strong-connectivity algorithm and its applications in data flow analysis (Sharir, 1981): Kosaraju's algorithm in print", "Computers & Mathematics with Applications", "https://doi.org/10.1016/0898-1221(81)90008-0"),
      S.book("Algorithms, 4th ed. §4.2 Directed graphs (Kosaraju–Sharir)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/42digraph/"),
      S.article("Finding strongly connected components", "cp-algorithms", "https://cp-algorithms.com/graph/strongly-connected-components.html"),
      S.article("2-SAT", "cp-algorithms", "https://cp-algorithms.com/graph/2SAT.html"),
      S.book("Algorithms, chapter 6: Depth-First Search (§6.6 strong components)", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/06-dfs.pdf"),
    ],
    problems: [2360, 2127, 802, 2876, 1059],
    prereq: ["dfs", "kahn"],
  },

  // ════════════════════════════════════════════════════════════════════════════
  euler: {
    blurb: "Walk every edge exactly once. The existence test is pure degree counting, and Hierholzer's algorithm builds the walk in linear time by appending vertices on the way back.",
    signals: [
      "Use every ticket / domino / pair / edge exactly once",
      "Reconstruct a sequence from overlapping pieces (each piece links an end to a start)",
      "Shortest string containing every combination (de Bruijn sequence)",
      "Draw a figure without lifting the pen",
      "Arrange pairs [a, b] so each pair's end equals the next pair's start",
    ],
    widgets: ["hierholzer"],
    lesson: md`
## Paths and circuits

An **Eulerian path** uses every *edge* exactly once (vertices may repeat). An **Eulerian circuit** is an Eulerian path that starts and ends at the same vertex. Do not confuse these with Hamiltonian paths, which visit every *vertex* exactly once: Eulerian paths are decidable and constructible in linear time, while Hamiltonian path is NP-complete. That contrast is a favourite interview question in itself.

The topic began in 1736 when Euler proved that no walk crosses each of Königsberg's seven bridges exactly once, essentially inventing graph theory.

## When does one exist?

Ignore isolated vertices (with no edges). The remaining vertices must be connected. Then:

**Undirected graph**
- Eulerian **circuit** iff every vertex has **even degree**.
- Eulerian **path** (not a circuit) iff **exactly two** vertices have odd degree; the path must start at one and end at the other.

**Directed graph** (connectivity: the edges must lie in one weakly connected piece, and an Euler walk then exists only if the degree condition holds)
- **Circuit** iff in-degree = out-degree for every vertex.
- **Path** iff exactly one vertex has out − in = 1 (the **start**), exactly one has in − out = 1 (the **end**), and every other vertex is balanced.

*Why even degrees:* every time the walk passes through a vertex it uses one edge in and one edge out, consuming degree in pairs. Only the start and end can use an unpaired edge.

:::tip Count, then check, then build
In an interview, first compute degrees and decide existence and the start vertex out loud. Many candidates jump to DFS and start from the wrong vertex.
:::

## Hierholzer's algorithm

The naive idea, "walk until stuck", fails: you can get stuck at the end vertex with unused edges elsewhere. Hierholzer's insight is that whatever you skipped forms closed loops that can be **spliced in**.

The clean implementation is a DFS that deletes each edge as it walks it and **appends a vertex to the answer only when it has no unused edges left** (post-order). The answer comes out reversed.

1. Start at the correct vertex (any vertex for a circuit; the out − in = 1 vertex for a directed path; an odd-degree vertex for an undirected path).
2. stack = [start]. While the stack is not empty: let u be the top. If u has an unused edge u → v, delete it and push v. Otherwise pop u and append it to the answer.
3. Reverse the answer. If its length is not E + 1, some edges were unreachable: no Eulerian path.

[[widget:hierholzer]]

**Why post-order works.** The first vertex to get stuck must be the true end of the path (a vertex can only be stranded with no outgoing edges at the end). It goes into the answer first. Back at an earlier vertex with unused edges, DFS takes a detour that must return to that same vertex (degrees are balanced along it). The detour's vertices are appended before the earlier part, so after reversing they appear in exactly the right place: the cycle gets spliced into the path.

**Cost.** Each edge is pushed and deleted once: **O(E)**. If you must choose neighbours in lexicographic order, sort the adjacency lists first (O(E log E)), or use min-heaps per vertex.

### The lexicographic itinerary

**Reconstruct Itinerary** (LC 332): tickets [from, to], use all of them, start at "JFK", and among valid itineraries return the lexicographically smallest. Sort each adjacency list and always take the smallest unused destination: Hierholzer's post-order guarantees validity even when the smallest choice leads to a dead end early. That is the exact situation in the visual above (the dead end D is taken first, and the post-order answer still uses every ticket).

A plain backtracking search also works for small inputs but is exponential in the worst case. Name both, then implement Hierholzer.

## De Bruijn sequences: Cracking the Safe

**Cracking the Safe** (LC 753): the safe checks the last n digits typed, using digits 0..k−1. Find the shortest string that contains every possible n-digit code as a substring.

Model it as a graph: vertices are all (n − 1)-digit strings, and each n-digit code is an *edge* from its first n − 1 digits to its last n − 1 digits. Every vertex has in-degree = out-degree = k, so an **Eulerian circuit** exists, and it walks every code exactly once. The resulting **de Bruijn sequence** has length kⁿ + n − 1, which is optimal: each new character can introduce at most one new code.

## Valid arrangement of pairs

**Valid Arrangement of Pairs** (LC 2097): order the pairs [start, end] so each pair's end equals the next pair's start. Each pair is a directed edge; find the start vertex with out − in = 1 (or any vertex if all are balanced) and run Hierholzer. Vertices are arbitrary integers, so use hash maps for adjacency and degrees.

## More variants

- **Chinese postman** (route inspection): a closed walk covering every edge *at least* once with minimum total length. If some vertices have odd degree, duplicate a minimum-weight set of paths pairing them up (minimum-weight perfect matching on the odd vertices), then take an Euler circuit. Name-level knowledge is enough.
- **Domino chains**: dominoes are undirected edges between their two numbers; a chain using all is an undirected Eulerian path.
- **Sequence assembly**: DNA assembly from k-mers is an Eulerian path on a de Bruijn graph, which is why genome assemblers use this algorithm.
- **Minimum edges to add so an Euler circuit exists**: in a connected undirected multigraph, odd / 2 new edges, pairing up the odd-degree vertices (there is always an even number of them, since degrees sum to 2E).

## Interview angles

- Separate existence (degree counting plus connectivity) from construction (Hierholzer).
- Explain why the naive "walk until stuck" fails and how post-order fixes it.
- Contrast with Hamiltonian path (NP-complete) when asked "what if each city must be visited exactly once?".
- For the lexicographic version, explain why greedy-smallest plus post-order is still correct.

## Connections

- [DFS](/learn/dfs): Hierholzer is a DFS over edges rather than vertices.
- [Topological sort](/learn/dfs-topo) also appends in post-order and reverses: the same trick in a different setting.
- [Bitmask DP](/learn/bitmask-dp) handles the Hamiltonian (visit every vertex) version for n ≤ 20.
`,
    doubts: [
      ["Why can't I just do a DFS that follows unused edges until it gets stuck?", "You may get stuck at the end vertex while a loop elsewhere is still unused. Example: from JFK the smallest edge leads to A → C → D, a dead end, while JFK → B → JFK is still unused. The walk JFK A C D is valid so far but incomplete. Post-order appending fixes this automatically by splicing the unused loop in before the dead end."],
      ["Why does the answer come out reversed?", "A vertex is appended when it has no unused edges, which happens first at the path's end. The start vertex is appended last. Reversing restores start-to-end order, exactly as in DFS-based topological sorting."],
      ["How do I pick the start vertex?", "Directed: the vertex with out − in = 1, or any vertex with outgoing edges if all are balanced. Undirected: either odd-degree vertex, or any vertex with edges if all degrees are even. In Reconstruct Itinerary the start is given (JFK)."],
      ["Does Hierholzer detect when no Eulerian path exists?", "Check degrees first. Even then, the edges might not all be connected: after running, if the answer has fewer than E + 1 vertices, some edges were unreachable and no Eulerian path exists."],
      ["How do I delete edges efficiently in an undirected graph?", "Store each edge once with an id, put the id in both endpoints' adjacency lists, and keep a used[id] flag. Advance a per-vertex pointer past used edges so each list is scanned once overall: O(E)."],
      ["Why is Eulerian easy but Hamiltonian hard?", "Eulerian existence reduces to local degree conditions plus connectivity, checkable in linear time, and Hierholzer constructs the walk. No such local characterisation exists for Hamiltonian paths; deciding them is NP-complete, so the best general exact algorithms are exponential (Held–Karp bitmask DP is O(2ⁿ n²))."],
      ["Why is the de Bruijn sequence length kⁿ + n − 1?", "There are kⁿ codes. The first code needs n characters, and each additional character can complete at most one new code, so at least kⁿ − 1 more characters are required. The Eulerian circuit achieves that bound exactly."],
      ["Does lexicographic greedy ever pick a wrong edge in Reconstruct Itinerary?", "It can pick an edge that leads to a dead end early, but post-order appending ensures the dead end lands at the end of the itinerary, which is the only place a dead end can be. Among all valid itineraries, this yields the smallest, because at every branch the smallest valid continuation appears first in the final order."],
    ],
    revise: md`
### Existence
? Eulerian path vs Hamiltonian path? :: Euler uses every edge once (linear time); Hamilton visits every vertex once (NP-complete).
? Undirected Euler circuit condition? :: Connected (ignoring isolated vertices) and every degree even.
? Undirected Euler path condition? :: Connected and exactly 0 or 2 odd-degree vertices (start and end are the odd ones).
? Directed Euler path condition? :: One vertex out − in = 1 (start), one in − out = 1 (end), the rest balanced, edges weakly connected.

### Hierholzer
? Core loop? :: Top of the stack u: if it has an unused edge u→v, delete it and push v; else pop u and append it to the answer. Reverse at the end.
? Why append on the way back? :: The first stuck vertex is the true end; detours return to where they began, so post-order splices them in.
? How do you detect failure? :: Answer length ≠ E + 1 means some edges were unreachable.
? Complexity? :: O(E), or O(E log E) when neighbours must be taken in sorted order.

### Disguises
? Reconstruct Itinerary (332)? :: Directed Euler path from JFK with sorted adjacency, Hierholzer.
? Cracking the Safe (753)? :: Euler circuit on the de Bruijn graph: vertices are (n−1)-digit strings, edges are n-digit codes. Length kⁿ + n − 1.
? Valid Arrangement of Pairs (2097)? :: Pairs are directed edges; start at out − in = 1; Hierholzer with hash maps.
? Chinese postman? :: Duplicate a minimum-weight matching of odd vertices, then take an Euler circuit.
`,
    pitfalls: [
      "Appending vertices when first visited (pre-order) instead of when stuck (post-order)",
      "Starting at the wrong vertex: compute out − in first",
      "Forgetting to reverse the collected answer",
      "Not checking that all E edges were used (unreachable components)",
      "Re-scanning adjacency lists from the start each time (quadratic); keep a pointer or pop from the list",
      "Confusing Eulerian with Hamiltonian and reaching for exponential search",
    ],
    quiz: [
      Q("An undirected connected graph has exactly four odd-degree vertices. Does an Eulerian path exist?", ["Yes, starting at any odd vertex", "*No", "Only a circuit exists", "Yes, if the graph is bipartite"], "An Euler path allows 0 or 2 odd-degree vertices."),
      Q("In Hierholzer's algorithm, a vertex is appended to the answer when…", ["it is first visited", "*it has no unused outgoing edges", "it has even degree", "the stack is empty"], "Post-order appending, then reverse."),
      Q("Cracking the Safe with n = 3, k = 2 is an Euler circuit on a graph whose vertices are…", ["all 3-digit codes", "*all 2-digit strings", "digits 0 and 1", "all substrings"], "Vertices are (n−1)-digit strings and each n-digit code is an edge."),
      Q("Directed graph: vertex X has out − in = 1, Y has in − out = 1, all others balanced, edges connected. The Eulerian path…", ["starts at Y", "*starts at X and ends at Y", "is a circuit", "may not exist"], "The surplus out-edge must be the first edge used."),
    ],
    template: `// Reconstruct Itinerary (LC 332): Hierholzer, lexicographically smallest
vector<string> findItinerary(vector<vector<string>>& tickets) {
  unordered_map<string, priority_queue<string, vector<string>, greater<string>>> g;
  for (auto& t : tickets) g[t[0]].push(t[1]);
  vector<string> route, st{"JFK"};
  while (!st.empty()) {
    auto& q = g[st.back()];
    if (!q.empty()) { st.push_back(q.top()); q.pop(); }   // walk and delete the edge
    else { route.push_back(st.back()); st.pop_back(); }    // stuck: append (post-order)
  }
  reverse(route.begin(), route.end());
  return route;   // route.size() == tickets.size() + 1 iff every ticket was used
}`,
    sources: [
      S.article("Finding the Eulerian path in O(M)", "cp-algorithms", "https://cp-algorithms.com/graph/euler_path.html"),
      S.article("Eulerian path (history from Königsberg, Hierholzer's algorithm)", "Wikipedia", "https://en.wikipedia.org/wiki/Eulerian_path"),
      S.article("De Bruijn sequence", "Wikipedia", "https://en.wikipedia.org/wiki/De_Bruijn_sequence"),
      S.paper("Solutio problematis ad geometriam situs pertinentis (Euler, 1736): the Königsberg bridges paper", "Euler Archive", "https://scholarlycommons.pacific.edu/euler-works/53/"),
      S.book("Algorithms, 4th ed. §4.1 Undirected graphs (exercises on Euler cycles)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/41graph/"),
    ],
    problems: [332, 753, 2097],
    prereq: ["dfs"],
  },

  // ════════════════════════════════════════════════════════════════════════════
  "network-flow": {
    blurb: "How much can you push from a source to a sink through capacity-limited pipes? Max-flow equals min-cut, augmenting paths compute it, and bipartite matching, disjoint paths and assignment all reduce to it.",
    signals: [
      "Assign workers to jobs, students to seats, bikes to people, one-to-one, maximising the count",
      "Maximum number of edge- or vertex-disjoint paths between two points",
      "The cheapest set of edges (or vertices) to remove so s and t are separated",
      "Supply and demand through a network with capacities",
      "\"Find a matrix with these row sums and column sums\"",
    ],
    widgets: ["edmonds-karp"],
    lesson: md`
## Flow networks

A **flow network** is a directed graph with a **capacity** c(u, v) ≥ 0 on each edge, a **source** s and a **sink** t. A **flow** assigns f(u, v) to each edge so that:

1. **Capacity:** 0 ≤ f(u, v) ≤ c(u, v);
2. **Conservation:** at every vertex except s and t, flow in = flow out.

The **value** of the flow is the net amount leaving s (equivalently, entering t). The **maximum flow problem** asks for the largest value.

An **s–t cut** splits the vertices into S (containing s) and T (containing t). Its **capacity** is the total capacity of edges from S to T. Any flow must cross every cut, so **flow value ≤ capacity of every cut**.

## Max-flow min-cut theorem

The maximum flow value **equals** the minimum cut capacity (Ford and Fulkerson, 1956). Moreover, when no augmenting path exists, the vertices still reachable from s in the residual graph form the S side of a minimum cut. This is why max-flow algorithms also solve "cheapest way to disconnect" problems.

## Residual graphs and augmenting paths

Given a flow, the **residual graph** has:

- a forward edge u → v with residual capacity c(u, v) − f(u, v) (room left), and
- a **backward edge** v → u with residual capacity f(u, v) (flow you could cancel).

An **augmenting path** is an s → t path in the residual graph with positive capacity on every edge. Push its **bottleneck** (the smallest residual on it) along the path: forward edges gain flow, backward edges cancel flow. The flow value grows by the bottleneck.

Backward edges are the heart of the matter. Without them, an early greedy choice of path can block the optimum forever; with them, a later path can "undo" part of an earlier one and reroute it.

## Algorithms

**Ford–Fulkerson** (the method): repeat "find any augmenting path, push the bottleneck". With integer capacities it terminates, in O(E · F) where F is the max-flow value. That can be slow when F is large, and with irrational capacities it may never terminate.

**Edmonds–Karp**: always pick the **shortest** augmenting path (BFS). This bounds the number of augmentations by O(VE), giving **O(V E²)** regardless of capacities.

[[widget:edmonds-karp]]

**Dinic's algorithm**: build a BFS **level graph**, then push a **blocking flow** with DFS (several paths per phase), repeat. O(V² E) in general, **O(E √V)** on unit-capacity graphs and bipartite matching. This is what competitive programmers and most libraries use.

Others to name: push-relabel (O(V³) or O(V² √E)), and recent near-linear-time algorithms (2022) that are theory rather than practice.

## Bipartite matching

A **matching** pairs vertices with no vertex used twice. In a bipartite graph (left L, right R), maximum matching reduces to flow: add s → every left vertex (capacity 1), every allowed left → right edge (capacity 1), every right vertex → t (capacity 1). The max-flow value is the maximum matching size, and integral capacities guarantee an integral (0/1) flow.

Simpler dedicated algorithms:

- **Kuhn's algorithm** (augmenting paths by DFS from each left vertex): O(V E). Short to write.
- **Hopcroft–Karp**: phases of shortest augmenting paths, O(E √V).

**König's theorem**: in bipartite graphs, maximum matching size = minimum vertex cover size. This explains problems like "minimum number of lines (rows or columns) to cover all marked cells".

**Weighted assignment** (minimum-cost perfect matching, the "assignment problem"): the **Hungarian algorithm**, O(n³), or min-cost max-flow. For n ≤ 20 interview versions, **bitmask DP over assigned right-side vertices** in O(n² 2ⁿ) is usually what the interviewer expects (Campus Bikes II, Minimum XOR Sum of Two Arrays, Maximum Compatibility Score Sum).

## Modelling tricks

- **Vertex capacities:** split v into v_in → v_out with the vertex's capacity on that edge.
- **Edge-disjoint paths s → t:** unit capacities; the max flow counts them (Menger's theorem).
- **Vertex-disjoint paths:** split every vertex with capacity 1.
- **Undirected edges:** two directed edges, each with the full capacity.
- **Multiple sources or sinks:** add a super-source and super-sink.
- **Lower bounds and circulations, project selection (max-weight closure):** advanced, name-level for interviews.
- **Matrix from row and column sums** (LC 1605): it is a flow problem (rows → columns), but a **greedy** fill (put min(rowSum[i], colSum[j]) in cell (i, j) and subtract) always works because there are no upper bounds per cell. Recognising when greedy suffices is part of the skill.

## How flow shows up in interviews

Full max-flow implementations are rare in a 45-minute Google round. What does appear:

- **Recognising** a matching, assignment or min-cut structure and **naming** the right algorithm and complexity;
- **Small-n assignment** solved by bitmask DP or backtracking with pruning;
- **Bipartite checks** (two-colouring) as a first step;
- **Greedy special cases** (Two City Scheduling sorts by cost difference; it is a min-cost assignment with a special structure).

So the bar is: know the theorem, the residual graph idea, the matching reduction, and when a simpler method suffices.

## Connections

- [Bipartite graphs and two-colouring](/learn/bipartite) is the precondition for matching.
- [Bitmask DP](/learn/bitmask-dp) solves small assignment problems exactly.
- [BFS](/learn/bfs) finds the augmenting paths in Edmonds–Karp and the level graph in Dinic.
- Max-flow min-cut is linear-programming duality in disguise; that is why so many optimisation problems reduce to it.
`,
    doubts: [
      ["Why do residual graphs need backward edges?", "Without them, augmenting is pure greed and can get stuck. Example: s→a→b→t and s→b, a→t, where the first path chosen uses a→b. The optimum wants that flow rerouted via a→t. The backward edge b→a lets a later path s→b→a→t cancel the a→b flow, achieving the maximum."],
      ["How does the algorithm find the minimum cut at the end?", "When BFS can no longer reach t, let S be the vertices it did reach. Every edge from S to the rest is saturated (otherwise BFS would cross it) and every edge from the rest into S carries zero flow. So the flow value equals the capacity of the cut (S, V − S), and since no flow can exceed any cut, this cut is minimum."],
      ["Why is Edmonds–Karp polynomial but plain Ford–Fulkerson not?", "Using shortest (BFS) paths makes the distance from s to each vertex non-decreasing over time, and each edge can be the bottleneck only O(V) times. That bounds augmentations by O(VE), independent of capacity values. Arbitrary path choice can need as many augmentations as the flow value itself."],
      ["Why does integral capacity give an integral max flow?", "Every augmentation pushes the bottleneck, a minimum of integers, so all flows stay integers. That is why max-flow gives a 0/1 matching when capacities are 1."],
      ["When should I use bitmask DP instead of flow for an assignment problem?", "When one side has at most about 20 elements and the objective is a sum of pair costs. dp[mask] = best cost after assigning the first popcount(mask) left items to the set mask of right items: O(n · 2ⁿ) states and transitions. It is short and what most interviewers expect for n ≤ 15–20."],
      ["Is a maximum matching the same as a maximal one?", "No. Maximal means you cannot add another edge without removing one; maximum means largest possible. A greedy matching is maximal but can be half the maximum size. Augmenting paths are what get you from maximal to maximum (Berge's theorem)."],
      ["Why is the greedy matrix fill correct for row and column sums?", "There is no per-cell upper bound, so placing min(row_i, col_j) never blocks anything: it exhausts either a row or a column completely, and the remaining instance is again feasible because total row sum equals total column sum. With per-cell bounds you would need flow."],
    ],
    revise: md`
### Definitions
? The two flow constraints? :: Capacity (0 ≤ f ≤ c on every edge) and conservation (in = out at every vertex except s and t).
? Max-flow min-cut theorem? :: The maximum flow value equals the minimum s–t cut capacity.
? Residual graph edges? :: Forward with c − f (room left), backward with f (flow you can cancel).
? Augmenting path? :: An s → t path in the residual graph with positive capacity; push its bottleneck.

### Algorithms
? Ford–Fulkerson complexity (integer capacities)? :: O(E · F), F the max-flow value.
? Edmonds–Karp? :: BFS shortest augmenting paths: O(V E²).
? Dinic? :: Level graph plus blocking flow: O(V² E), O(E √V) for unit capacities and bipartite matching.
? Where is the min cut after the algorithm stops? :: The vertices reachable from s in the final residual graph form the source side.

### Matching
? Bipartite matching as flow? :: s → left (1), left → right (1), right → t (1); max flow = max matching.
? Kuhn vs Hopcroft–Karp? :: O(VE) DFS augmenting vs O(E √V) phases.
? König's theorem? :: In bipartite graphs, max matching = min vertex cover.
? Weighted assignment with n ≤ 20? :: Bitmask DP, O(n · 2ⁿ); in general the Hungarian algorithm, O(n³).

### Modelling
? Vertex capacity? :: Split v into v_in → v_out carrying the capacity.
? Edge-disjoint s–t paths? :: Unit capacities; max flow counts them (Menger).
`,
    pitfalls: [
      "Forgetting backward residual edges: the algorithm becomes a greedy that can be suboptimal",
      "Building a full max-flow when n ≤ 20 and bitmask DP is simpler and expected",
      "Confusing maximal (cannot extend greedily) with maximum matching",
      "Applying bipartite matching algorithms to a non-bipartite graph (that needs Edmonds' blossom algorithm)",
      "Modelling vertex-disjoint paths without splitting vertices",
    ],
    quiz: [
      Q("The maximum s–t flow equals…", ["the sum of all capacities", "*the minimum capacity of an s–t cut", "the longest s–t path", "the number of edges out of s"], "Max-flow min-cut theorem."),
      Q("Edmonds–Karp chooses augmenting paths…", ["by DFS", "*by BFS (fewest edges)", "with the largest bottleneck", "at random"], "Shortest paths bound the number of augmentations by O(VE)."),
      Q("Assign 10 workers to 10 bikes minimising total distance. A good interview approach is…", ["Kruskal", "*Bitmask DP over assigned bikes", "Topological sort", "Union-find"], "n = 10 → 2¹⁰ masks; or name the Hungarian algorithm."),
      Q("In a bipartite graph the maximum matching has size 7. The minimum vertex cover has size…", ["14", "3.5", "*7", "Unknown"], "König's theorem."),
    ],
    template: `// Kuhn's algorithm: maximum bipartite matching, O(V * E)
int nL, nR; vector<vector<int>> adj;  // adj[left] = right vertices
vector<int> matchR; vector<bool> used;
bool tryKuhn(int u) {
  for (int v : adj[u]) if (!used[v]) {
    used[v] = true;
    if (matchR[v] == -1 || tryKuhn(matchR[v])) { matchR[v] = u; return true; }
  }
  return false;
}
int maxMatching() {
  matchR.assign(nR, -1); int res = 0;
  for (int u = 0; u < nL; u++) { used.assign(nR, false); if (tryKuhn(u)) res++; }
  return res;
}`,
    sources: [
      S.paper("Maximal flow through a network (Ford & Fulkerson, 1956)", "Canadian Journal of Mathematics", "https://doi.org/10.4153/CJM-1956-045-5"),
      S.paper("Theoretical improvements in algorithmic efficiency for network flow problems (Edmonds & Karp, 1972)", "Journal of the ACM", "https://doi.org/10.1145/321694.321699"),
      S.book("Algorithms, chapter 10: Maximum Flows and Minimum Cuts", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/10-maxflow.pdf"),
      S.book("Algorithms, chapter 11: Applications of Flows and Cuts", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/11-maxflowapps.pdf"),
      S.article("Maximum flow: Ford–Fulkerson and Edmonds–Karp", "cp-algorithms", "https://cp-algorithms.com/graph/edmonds_karp.html"),
      S.article("Maximum flow: Dinic's algorithm", "cp-algorithms", "https://cp-algorithms.com/graph/dinic.html"),
      S.article("Kuhn's algorithm for maximum bipartite matching", "cp-algorithms", "https://cp-algorithms.com/graph/kuhn_maximum_bipartite_matching.html"),
    ],
    problems: [1605, 1066, 1947, 1879, 1820, 1595, 1349],
    prereq: ["bfs", "bipartite"],
  },
};
