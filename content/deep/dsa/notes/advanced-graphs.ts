/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */
export const notes: Record<string, string> = {
  mst: `
## Problem
Minimum spanning tree: connect all V vertices of a connected, undirected, weighted graph with V − 1 edges of minimum total weight.
Disconnected graph → a minimum spanning forest (one tree per component).
## Two facts that make greed safe
Cut property: for any cut, the lightest edge crossing it belongs to some MST (to every MST if it is the unique lightest).
Cycle property: the heaviest edge on any cycle belongs to no MST (if it is the unique heaviest).
Distinct weights → the MST is unique.
## Kruskal
Sort the edges by weight; add each edge whose endpoints are in different DSU sets; stop at V − 1 edges.
O(E log E) for sorting + O(E·α(V)) for the DSU. Best for sparse graphs and edge lists.
## Prim
Grow one tree from any vertex; repeatedly add the cheapest edge leaving the tree (min-heap of (weight, vertex), lazy skip of visited vertices).
O(E log V) with a binary heap; O(V²) with an array — the best choice for dense graphs and complete point sets.
Min cost to connect all points (LC 1584): the O(V²) array Prim on Manhattan distances, no edge list.
## Borůvka
Each round, every component picks its cheapest outgoing edge; at least half the components merge per round → O(E log V). Parallel-friendly.
## Properties you can use
The MST minimises the maximum edge on the path between any two vertices (minimax / bottleneck paths).
Second-best MST: add one non-tree edge and remove the heaviest edge on the cycle it closes (with LCA or by brute force).
Critical edge: removing it raises the MST weight. Pseudo-critical: some MST contains it (LC 1489: force it in, or skip it, and compare).
Adding a constant to every weight does not change the MST; the maximum spanning tree = Kruskal in descending order.
## Disguises
Optimise water distribution (LC 1168): a virtual node 0 with well-cost edges.
Connecting cities with minimum cost (LC 1135), the minimum effort path (minimax), clustering (stop Kruskal at k components).
Steiner tree (connect only some vertices) is NP-hard: not an MST problem.
`,
  "bridges-ap": `
## Questions
Bridge: an edge whose removal disconnects the graph. Articulation point (cut vertex): a vertex whose removal does.
Critical connections in a network (LC 1192) = bridges.
## Two numbers
tin[v]: the DFS discovery time. low[v]: the smallest tin reachable from v's subtree using at most one back edge.
low[v] = min(tin[v], tin[w] for back edges v–w, low[c] for children c).
## Tests
Bridge (v, c) for a tree edge: low[c] > tin[v] (the child's subtree cannot reach v or above without this edge).
Articulation point, non-root v: some child c with low[c] ≥ tin[v].
Root: an articulation point iff it has ≥ 2 DFS children.
## Why the tests are right
A subtree that cannot climb above v except through v (or the edge v–c) is cut off when v (or that edge) is removed.
## Traps
Skip the edge back to the parent by edge id, not by parent vertex, or parallel edges are missed (a doubled edge is never a bridge).
Use ≥ for articulation points and > for bridges.
Run from every unvisited vertex for disconnected graphs.
Recursion depth up to V: use an iterative DFS for large inputs.
## Components
2-edge-connected components: remove all bridges; the remaining components; contracting them gives the bridge tree.
Biconnected components (blocks): pop edges from a stack when low[c] ≥ tin[v]; the block-cut tree links blocks and cut vertices.
## Disguises
Minimum days to disconnect an island (LC 1568): the answer is 0, 1 (an articulation cell) or 2.
Network reliability, single points of failure, and roads that must stay open.
## Complexity
One DFS: O(V + E).
`,
  scc: `
## Definitions
Strongly connected component: a maximal set where every vertex reaches every other along directed edges.
Condensation: contract each SCC to one node → always a DAG.
## Kosaraju (two passes)
Pass 1: DFS on G and push vertices by finish time.
Pass 2: on the reversed graph Gᵀ, DFS in decreasing finish time; each tree found is one SCC.
Why: the vertex finishing last lies in a source SCC of G, which is a sink in Gᵀ, so its DFS there cannot leak out.
O(V + E); needs the reversed graph.
## Tarjan (one pass)
DFS with tin, low and a stack of the vertices in the current DFS path's components.
low[v] = min over tree children (low[c]) and edges to vertices still on the stack (tin[w]).
When low[v] == tin[v], v is the root of an SCC: pop the stack down to v.
SCCs come out in reverse topological order of the condensation.
Only consider edges to vertices still on the stack (not ones already assigned to an SCC).
## Using the condensation
DP on the DAG: the largest reachable sum, sources and sinks.
Minimum edges to make the graph strongly connected = max(#sources, #sinks) of the condensation (0 if it is already one SCC).
Reachability questions collapse to questions about DAG nodes.
## 2-SAT
Each clause (a ∨ b) gives implications ¬a → b and ¬b → a. Unsatisfiable iff some x and ¬x share an SCC.
Assignment: x = true iff comp(x) comes after comp(¬x) in topological order (in Tarjan's numbering, comp(x) < comp(¬x)).
## Functional graphs
Out-degree 1: every SCC of size > 1 is a cycle; find them with colouring (longest cycle, LC 2360).
## Disguises
Course dependencies with cycles grouped, mutual-reachability friend circles in directed graphs, the minimum set of vertices to reach all nodes (LC 1557: the in-degree-0 vertices of a DAG).
`,
  euler: `
## Paths and circuits
Eulerian path: uses every edge exactly once. Eulerian circuit: an Eulerian path that starts and ends at the same vertex.
(Hamiltonian = every vertex once: NP-hard, a different problem.)
## When one exists
Undirected: all edges in one connected component; circuit iff every degree is even; path iff exactly 0 or 2 vertices have odd degree (start at an odd one).
Directed: edges in one weakly connected component; circuit iff in = out everywhere; path iff exactly one vertex has out − in = 1 (the start), one has in − out = 1 (the end), and the rest are balanced.
## Hierholzer
Start at the start vertex; follow unused edges until stuck; append the stuck vertex to the answer and backtrack; reverse at the end.
Iterative: a stack; while the top has unused edges, push a neighbour (consume the edge); otherwise pop it into the path. O(E).
Consume edges by popping from adjacency lists (keep a pointer per vertex) so each edge is used once.
Check the result has E + 1 vertices; otherwise the graph was disconnected.
## Lexicographic itinerary (LC 332)
Sort each adjacency list (or use a min-heap) and always take the smallest unused edge; Hierholzer's post-order handles dead ends correctly.
Plain greedy without the post-order fails when the smallest choice leads into a dead end early.
## De Bruijn sequences: cracking the safe (LC 753)
Nodes = the (n − 1)-length strings; edges = n-length strings; an Eulerian circuit visits every password once.
Length kⁿ + n − 1.
## Valid arrangement of pairs (LC 2097)
Pairs are directed edges; find the start by degrees; run Hierholzer.
## More variants
Chinese postman (route inspection): duplicate edges to fix odd-degree vertices with a minimum-weight matching.
Domino chains, word chains (first letter → last letter), drawing a figure without lifting the pen.
`,
  "network-flow": `
## Flow networks
A directed graph with capacities c(u, v), a source s and a sink t.
A flow obeys capacity (0 ≤ f ≤ c) and conservation (in = out at every vertex other than s and t). Its value = the net flow out of s.
## Max-flow min-cut
The maximum flow value = the minimum capacity of an s–t cut (a set S containing s and not t; capacity = Σ c over edges from S to the rest).
After max-flow, the vertices reachable from s in the residual graph form a minimum cut.
## Residual graphs and augmenting paths
Residual capacity = c − f forward, plus f backward (undoing flow).
Ford–Fulkerson: augment along any s–t path in the residual graph until none exists.
Integer capacities → an integral max flow exists (it is what makes matching work).
## Algorithms
Edmonds–Karp: BFS shortest augmenting paths: O(V·E²).
Dinic: a BFS level graph plus blocking flows with DFS: O(V²·E) in general; O(E·√V) on unit-capacity bipartite graphs.
Push–relabel: O(V³) or better; strong in practice.
Min-cost max-flow: augment along shortest paths by cost (Bellman–Ford or SPFA, or Dijkstra with potentials).
## Bipartite matching
Source → left side (capacity 1), left → right for allowed pairs, right → sink (capacity 1); the max flow = the maximum matching.
Hopcroft–Karp: O(E·√V). Simple augmenting paths (Kuhn's algorithm): O(V·E).
König: in bipartite graphs, maximum matching = minimum vertex cover; maximum independent set = V − maximum matching.
Hall's theorem: a perfect matching of the left side exists iff every subset S has |N(S)| ≥ |S|.
Assignment with weights: the Hungarian algorithm, O(n³), or min-cost flow.
## Modelling tricks
Vertex capacities: split v into v_in → v_out with the capacity on that edge.
Multiple sources or sinks: add a super-source and a super-sink.
Undirected edges: two directed edges with the same capacity.
Edge-disjoint paths = max flow with unit capacities; vertex-disjoint paths = split vertices.
Project selection (profit and prerequisites) = a minimum cut.
## In interviews
Rare to implement; recognise matching (maximum students taking exam, LC 1349, via bipartite matching on seats) and say "maximum flow / minimum cut" with the complexity.
`,
};
