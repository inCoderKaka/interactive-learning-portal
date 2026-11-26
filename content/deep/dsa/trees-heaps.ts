import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

/** Binary trees, BSTs, tries and heaps. */
export const treesHeaps: Record<string, Deep> = {
  // ─────────────── binary trees ───────────────
  "tree-traversals": {
    blurb: "Pre-, in-, post- and level-order: recursive, iterative with an explicit stack, and Morris traversal in O(1) space. Choosing the order is choosing when you do the work.",
    signals: ["Visit every node in a specific order", "Iterative traversal (stack overflow risk, or an iterator interface)", "O(1) space traversal"],
    widgets: ["tree-dfs"],
    lesson: md`
## The orders

- **Pre-order** (node, left, right): do work before the children. Copying a tree, serialising, printing a directory structure.
- **In-order** (left, node, right): for a BST, visits keys in sorted order.
- **Post-order** (left, right, node): do work after the children. Computing heights, sizes, freeing memory, evaluating expression trees.
- **Level-order** (BFS): by depth, using a queue.

[[widget:tree-dfs]]

Every recursive tree algorithm is one of these with work at the right moment. Asking "do I need the children's answers first?" picks post-order; "do I need to pass something down?" picks pre-order.

## Iterative versions

- **Pre-order**: stack; pop a node, visit, push right then left.
- **In-order**: go left pushing nodes; pop, visit, then move to the right child.
- **Post-order**: either reverse a modified pre-order (node, right, left), or use a single stack with a "last visited" pointer to know whether you are returning from the right child.

These matter when depth can reach 10⁵ (skewed trees) or when you implement an iterator (BST Iterator, LC 173: the in-order stack gives amortised O(1) next() and O(h) space).

## Morris traversal (O(1) space)

For each node with a left subtree, find its in-order predecessor (rightmost node of the left subtree). If the predecessor's right pointer is null, set it to the current node (a temporary thread) and go left; if it already points back, remove the thread, visit the node and go right. Every edge is walked at most a constant number of times: O(n) time, O(1) space, and the tree is restored. Pre-order Morris is a small variation.

## Reconstructing traversals

Pre-order + in-order (or post-order + in-order) determine a tree with distinct values uniquely. Pre-order + post-order does not (for nodes with one child), unless the tree is full. See construction and serialisation.

## Vertical, diagonal and boundary traversals

These are BFS or DFS with extra coordinates: column index for vertical order (LC 987 sorts by (column, row, value)), diagonal index, or boundary = left boundary + leaves + reversed right boundary.

## Complexity

All traversals are O(n) time. Recursive/stack space is O(h): O(log n) for balanced trees, O(n) for skewed ones. Level-order uses O(width), up to n/2 for the last level of a complete tree.
`,
    doubts: [
      ["How do I pick the traversal order for a problem?", "Ask when the node's work can happen. If it needs results from both children (height, diameter, subtree sums), post-order. If it needs information from ancestors (depth, path so far), pre-order with parameters. If the property is about sorted order in a BST, in-order. If it is about levels or shortest depth, BFS."],
      ["Why push right before left in iterative pre-order?", "The stack is LIFO; pushing right first means left is popped (visited) first, matching node-left-right."],
      ["Is Morris traversal safe to use?", "It temporarily modifies the tree, so it is unsafe with concurrent readers and must complete to restore the structure. In interviews, offer it as the O(1)-space follow-up."],
      ["Does level-order need a queue?", "BFS does. You can also do level order with DFS by passing depth and appending to result[depth], which uses O(h) stack instead of O(width) queue."],
    ],
    revise: md`
? Pre / in / post order? :: Node-left-right / left-node-right / left-right-node.
? BST in-order gives? :: Keys in sorted order.
? Iterative in-order? :: Push left chain; pop, visit, go to the right child.
? Iterative post-order trick? :: Reverse of (node, right, left) pre-order.
? Morris traversal space and idea? :: O(1): thread each predecessor's null right pointer back to the node.
? Traversal stack space? :: O(h): O(log n) balanced, O(n) skewed.
? Which pairs reconstruct a tree uniquely (distinct values)? :: Pre + in, or post + in.
`,
    pitfalls: ["Recursive traversal on 10⁵-deep trees in Python", "Pushing left before right in iterative pre-order", "Forgetting to remove Morris threads"],
    quiz: [Q("Computing each node's subtree height requires which order?", ["pre-order", "in-order", "*post-order", "level-order"], "Children's heights are needed first.")],
    sources: [S.article("Tree traversal", "Wikipedia", "https://en.wikipedia.org/wiki/Tree_traversal"), S.article("Threaded binary tree (Morris)", "Wikipedia", "https://en.wikipedia.org/wiki/Threaded_binary_tree"), S.book("Algorithms, 4th ed. §3.2 Binary Search Trees", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/32bst/")],
    problems: [144, 94, 145, 102, 173, 987, 545],
  },
  "tree-dfs-returns": {
    blurb: "The single most useful tree skill: define what a recursive call returns, compute it from the children, and update a global answer on the side. Height, diameter, balanced, max path sum and friends.",
    signals: ["Any property computed from subtrees (height, size, sums, balanced, BST validity)", "Best path through a node (diameter, max path sum, longest univalue path)", "Count nodes / paths satisfying something"],
    widgets: ["tree-dfs"],
    lesson: md`
## The recipe

1. Decide **what the function returns** for a subtree, phrased so a parent can use it. Usually "the best *downward* path starting at this node", or "the height", or "(is valid, min, max)".
2. Compute it from the children's returns.
3. If the overall answer may **bend through** a node (use both children), update a global (or closure) variable at each node, separately from the return value.

The gap between "what I return" and "what I record" is the source of most bugs and most insight.

## Examples

**Height**: return 1 + max(h(left), h(right)); empty = 0.

**Diameter** (LC 543): return height; at each node record left height + right height (edges through the node). The diameter need not pass through the root.

**Balanced** (LC 110): return height or −1 for "unbalanced"; propagate −1 upward. O(n) instead of the O(n log n) or O(n²) naive "height at every node".

**Binary Tree Maximum Path Sum** (LC 124): return the best downward gain from this node, max(0, …) for each child (a negative branch is dropped); record node + leftGain + rightGain. Return node + max(leftGain, rightGain): a path going up to the parent can only use one branch.

**Longest univalue path** (LC 687): return the longest downward path of equal values; extend only through children with the same value.

**Count good nodes** (LC 1448): pass the max so far **down** (pre-order parameter) and count.

**Path sum variants**: root-to-leaf with target (pass remaining sum down); any downward path (prefix sums + hash map along the path: LC 437).

**Distribute coins** (LC 979): return excess coins of the subtree (coins − nodes); moves += |left excess| + |right excess|.

**Binary tree cameras** (LC 968): return one of three states (covered without camera, has camera, needs cover); greedy from the leaves. A good example of a small state machine as the return value.

## Tuples as return values

Return several facts at once: (height, diameter), (isBST, min, max, size) for the "largest BST subtree" (LC 333), (sum, count) for averages. One traversal, O(n).

## Iterative alternative

For very deep trees, simulate post-order with an explicit stack and a map from node to its computed value. Mention it when depth can reach 10⁵.

## Complexity

O(n) time (each node once), O(h) space.
`,
    doubts: [
      ["Why does max path sum return only one branch?", "The returned value will be extended by the parent. A path that comes up from the parent can enter this node and continue down one child only; taking both would make the path fork, which is not a path."],
      ["Why clamp child gains at 0?", "A negative gain would only lower the sum; it is better to stop the path at this node. Clamping implements 'optionally take the branch'."],
      ["Global variable or return a tuple?", "Both are fine. A nonlocal/instance variable is shorter; returning (bestDown, bestAnywhere) is purer and easier to test. Say which you are doing."],
      ["How do I check 'balanced' in O(n)?", "Compute heights bottom-up and return a sentinel (−1) as soon as a subtree is unbalanced, short-circuiting further work."],
    ],
    revise: md`
? The recipe? :: Define the return value for a parent's use; compute from children; record the global answer separately.
? Diameter? :: Return height; record left + right at each node.
? Max path sum return vs record? :: Return node + max(0, best child); record node + max(0, L) + max(0, R).
? Balanced in O(n)? :: Return height or −1 for unbalanced.
? Count good nodes? :: Pass the max-so-far down.
? Distribute coins moves? :: Sum of |excess| over all edges, with excess = coins − nodes per subtree.
`,
    pitfalls: ["Returning the bent path instead of a single branch", "Forgetting negative values (initialise the global to −∞, not 0)", "Recomputing height inside a height loop (O(n²))"],
    quiz: [
      Q("Diameter of a tree with root having only a long left chain of 4 nodes below it (5 nodes in a line):", ["5", "*4", "3", "2"], "Counted in edges: 4."),
      Q("In max path sum, a node's return value is…", ["left + right + val", "*val + max(0, left gain, right gain)", "max(left, right)", "val"], "Only one branch can continue upward."),
    ],
    sources: [S.article("Tree traversal", "Wikipedia", "https://en.wikipedia.org/wiki/Tree_traversal"), S.book("Algorithms, chapter 1: Recursion", "Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/book/01-recursion.pdf")],
    problems: [104, 543, 110, 124, 687, 1448, 112, 113, 437, 979, 968, 333, 1372],
  },
  "tree-bfs": {
    blurb: "Level-order traversal with a queue: per-level processing, right-side view, zigzag, widths, cousins and distance-K problems (with parent pointers).",
    signals: ["\"Level by level\", minimum depth, nodes at distance k", "Right/left side view, zigzag order", "Width of a level", "Treat the tree as an undirected graph"],
    lesson: md`
## Per-level BFS

\`\`\`
q = deque([root])
while q:
    for _ in range(len(q)):      # exactly this level
        node = q.popleft()
        ... ; push children
\`\`\`

Snapshot len(q) at the start of each level. This yields level order (LC 102), right side view (last node of each level, LC 199), level averages (LC 637), largest value per row (LC 515), zigzag (reverse alternate levels or append left/right into a deque, LC 103).

**Minimum depth** (LC 111): BFS stops at the first leaf, which beats DFS on wide, shallow-leaf trees.

## Width of a binary tree (LC 662)

Index nodes like a heap (left 2i, right 2i + 1); width of a level = last index − first index + 1. Re-base indices per level (subtract the first index) to prevent overflow on deep trees.

## Trees as graphs: distance K (LC 863)

Nodes at distance k from a target can be above it. Build parent pointers (one DFS), then BFS from the target over neighbours (left, right, parent) with a visited set. Same trick for "amount of time to infect the tree" (LC 2385) and "burning tree" problems.

## Vertical order (LC 314, LC 987)

BFS with (node, column); group by column. LC 987 also sorts nodes sharing (row, column) by value, so collect (column, row, value) triples and sort.

## Connect next pointers (LC 116, 117)

Level order without a queue: walk the current level using next pointers already set and wire the children's next pointers. O(1) extra space.

## Complexity

O(n) time, O(width) queue space (up to about n/2).
`,
    doubts: [
      ["Why snapshot the queue size?", "Children appended during the level must not be processed in the same iteration. The size at the start is exactly the number of nodes on the current level."],
      ["BFS or DFS for right side view?", "Both work. BFS: last node per level. DFS: visit right before left and record the first node seen at each depth."],
      ["Why build parent pointers for distance K?", "A binary tree only links downward; distance-k nodes may be reached by going up first. Parent pointers turn it into an undirected graph where BFS works."],
    ],
    revise: md`
? Per-level loop trick? :: Snapshot len(q) before processing the level.
? Right side view? :: Last node of each BFS level.
? Width of a level? :: Heap indices 2i, 2i+1; last − first + 1; re-base per level.
? Nodes at distance k? :: Parent pointers, then BFS from the target with visited.
? Connect next pointers in O(1) space? :: Traverse the current level via next pointers and wire the next level.
`,
    pitfalls: ["Not snapshotting the level size", "Integer overflow of heap indices without re-basing", "Forgetting visited when BFS goes up through parents"],
    quiz: [Q("Minimum depth of a very wide tree whose shallowest leaf is at depth 2: better approach?", ["DFS", "*BFS", "Either is equally fast", "Morris"], "BFS stops at depth 2.")],
    sources: [S.article("Breadth-first search", "cp-algorithms", "https://cp-algorithms.com/graph/breadth-first-search.html"), S.article("Breadth-first search", "Wikipedia", "https://en.wikipedia.org/wiki/Breadth-first_search")],
    problems: [102, 199, 103, 637, 111, 662, 863, 2385, 987, 314, 116, 117],
  },
  "tree-construct": {
    blurb: "Build trees from traversals, serialise and deserialise them, and build balanced trees from sorted input. Index maps and recursion ranges make these O(n).",
    signals: ["Construct from pre/in/post-order", "Serialise / deserialise a tree", "Sorted array or list to a balanced BST", "Verify a serialisation"],
    lesson: md`
## From pre-order and in-order (LC 105)

The first pre-order element is the root. Its position in the in-order sequence splits the left and right subtrees, whose sizes tell you how to split the pre-order. Use a **hash map from value to in-order index** to make each split O(1): total O(n). (Linear search for the root makes it O(n²) on skewed trees.)

Implement with indices (or a global pre-order pointer that advances as nodes are created) rather than slicing arrays, which copies.

Post-order + in-order (LC 106): the root is the **last** post-order element; build the right subtree first if you consume post-order from the end.

Pre-order + post-order (LC 889): ambiguous in general; for full binary trees, the second pre-order element is the left child's root, found in post-order to size the left subtree.

## Serialise and deserialise (LC 297)

Pre-order with null markers: "1,2,#,#,3,4,#,#,5,#,#". Deserialise by consuming tokens recursively (or with an iterator). Level order with nulls (LeetCode's format) also works. A BST (LC 449) needs no null markers: pre-order alone plus value bounds reconstructs it.

Talk about the format: separator choice, escaping if values are strings, size (null markers roughly double the token count), and versioning in real systems.

## Balanced BST from sorted data

- Sorted array → BST (LC 108): middle element as root, recurse on halves. Height ⌈log₂(n + 1)⌉.
- Sorted linked list → BST (LC 109): find the middle with fast/slow (O(n log n)), or build **in-order** while consuming the list in O(n): recurse on size, build left, take the current list node, build right.
- Balance an existing BST (LC 1382): in-order to a sorted array, then rebuild. (The Day–Stout–Warren algorithm does it in place with rotations.)

## Verify pre-order serialisation (LC 331)

Count **slots**: start with 1; each token uses one slot; a non-null token adds two. Valid iff the slot count never goes negative and ends at zero.

## Other constructions

- Maximum binary tree (LC 654): monotonic stack builds it in O(n).
- Cartesian trees: same structure (heap on values, BST on indices); used by RMQ reductions.
`,
    doubts: [
      ["Why do I need distinct values to rebuild from pre/in-order?", "With duplicates, the root's value can appear several times in the in-order sequence, so you cannot tell where the split is."],
      ["Why is a hash map needed for O(n)?", "Finding the root in the in-order array by scanning costs O(size) per node, O(n²) total on a skewed tree. The map makes each lookup O(1)."],
      ["Why does a BST serialise without null markers?", "Pre-order of a BST plus the BST property determines the structure: when reading, a value belongs in the left subtree while it is below the current bound."],
      ["How does the in-order build from a sorted list achieve O(n)?", "In-order position equals list order. Recursing on sizes (left half, root, right half) and consuming the list as you go creates nodes in exactly list order, so each list node is touched once."],
    ],
    revise: md`
? Root in pre-order / post-order? :: First / last element.
? O(n) build from pre+in? :: Hash map value → in-order index; recurse on index ranges.
? Pre + post uniqueness? :: Only for full binary trees.
? Serialise with nulls? :: Pre-order with '#' markers; deserialise by consuming tokens.
? BST serialise compactly? :: Pre-order without nulls + value bounds.
? Sorted array → balanced BST? :: Middle as root, recurse.
? Verify pre-order serialisation? :: Slot counting: start 1, −1 per token, +2 per non-null; never negative, end 0.
`,
    pitfalls: ["Slicing arrays in recursion (O(n²) copying)", "Linear root search", "Building left before right when consuming post-order from the end"],
    quiz: [Q("pre = [3,9,20,15,7], in = [9,3,15,20,7]. Root's right subtree root?", ["9", "15", "*20", "7"], "Left of 3 in in-order is [9]; the next pre-order element after 9 is 20.")],
    sources: [S.article("Tree traversal (reconstruction)", "Wikipedia", "https://en.wikipedia.org/wiki/Tree_traversal"), S.article("Day–Stout–Warren algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Day%E2%80%93Stout%E2%80%93Warren_algorithm")],
    problems: [105, 106, 889, 297, 449, 108, 109, 1382, 331, 654],
  },
  lca: {
    blurb: "Lowest common ancestor by recursion, by parent pointers, in a BST, and with binary lifting for many queries. The building block for distances and path queries on trees.",
    signals: ["Deepest node that is an ancestor of both p and q", "Distance between two tree nodes", "Many ancestor / path queries (k-th ancestor)"],
    widgets: ["binary-lifting"],
    lesson: md`
## Recursive LCA (LC 236)

\`\`\`
def lca(node, p, q):
    if not node or node is p or node is q: return node
    L = lca(node.left, p, q); R = lca(node.right, p, q)
    return node if L and R else (L or R)
\`\`\`

If p and q lie on different sides, the current node is the LCA; otherwise the answer bubbles up from one side. O(n), O(h). It assumes both nodes exist; if not (LC 1644), count how many of p, q were actually found.

## In a BST (LC 235)

Walk from the root: if both values are smaller go left, both larger go right, otherwise this node splits them and is the LCA. O(h), no recursion needed.

## With parent pointers (LC 1650)

Same as intersecting two linked lists: walk up from both, switching to the other start at the root; they meet at the LCA. Or collect p's ancestors in a set.

## Many queries: binary lifting

Precompute up[k][v] = the 2ᵏ-th ancestor of v (up[0] = parent; up[k][v] = up[k − 1][up[k − 1][v]]) and depth[v]. O(n log n) preprocessing.

Query LCA(u, v):
1. Lift the deeper node until both have equal depth (use the binary digits of the depth difference).
2. If equal, done. Otherwise, for k from high to low: if up[k][u] ≠ up[k][v], move both up by 2ᵏ.
3. The answer is parent(u).

O(log n) per query. k-th ancestor (LC 1483) is step 1 alone.

[[widget:binary-lifting]]

Other LCA methods: Euler tour + RMQ with a sparse table (O(1) per query after O(n log n)), Tarjan's offline LCA with union-find, heavy-light decomposition.

## Using the LCA

- **Distance** between u and v: depth[u] + depth[v] − 2·depth[lca].
- **Path sums**: with root-prefix sums S, path sum = S[u] + S[v] − 2·S[lca] + val[lca].
- **Path max** (e.g. the heaviest edge on a tree path, used for second-best MST): store a max alongside each up[k][v] jump.
- **Directions from u to v** (LC 2096): find the LCA, then 'U' for each step up from u and the downward path to v.
`,
    doubts: [
      ["Why does returning the node when it equals p handle the case where p is an ancestor of q?", "If p is an ancestor of q, the recursion returns p as soon as it reaches it and never looks below. The other branch returns null, so p bubbles up as the answer, which is correct."],
      ["Why lift the deeper node first in binary lifting?", "LCA search by synchronous jumps only works when both are at the same depth; then the first ancestor at which they coincide is the LCA."],
      ["Why jump only when up[k][u] ≠ up[k][v]?", "Jumping to a common ancestor might overshoot the lowest one. Jumping only while the ancestors differ keeps u and v just below the LCA; the final answer is their parent."],
      ["Which LCA method should I write in an interview?", "The recursive one for a single query. Binary lifting if many queries or k-th ancestor queries come up. Mention Euler tour + sparse table for O(1) queries."],
    ],
    revise: md`
? Recursive LCA rule? :: Return node if it is p/q or null; if both sides return non-null, node is the LCA; else pass up the non-null side.
? LCA in a BST? :: Go left if both smaller, right if both larger, else here.
? Parent pointers? :: Two-pointer walk-up with switching (like list intersection).
? Binary lifting table? :: up[k][v] = up[k−1][up[k−1][v]]; O(n log n).
? Binary lifting query steps? :: Equalise depths; jump both while ancestors differ (high k to low); answer = parent.
? Distance between u and v? :: depth[u] + depth[v] − 2·depth[lca].
`,
    pitfalls: ["Assuming both nodes exist (LC 1644)", "Jumping to equal ancestors in binary lifting (overshoot)", "Recursion depth on skewed trees"],
    quiz: [Q("depth[u] = 7, depth[v] = 4, depth[lca] = 2. Distance?", ["5", "*7", "9", "11"], "7 + 4 − 4 = 7.")],
    template: `// Binary lifting: O(n log n) build, O(log n) per query
const int LOG = 17; vector<array<int, LOG>> up; vector<int> depth;
int lca(int u, int v) {
  if (depth[u] < depth[v]) swap(u, v);
  for (int k = LOG - 1; k >= 0; k--) if (depth[u] - (1 << k) >= depth[v]) u = up[u][k];
  if (u == v) return u;
  for (int k = LOG - 1; k >= 0; k--) if (up[u][k] != up[v][k]) { u = up[u][k]; v = up[v][k]; }
  return up[u][0];
}`,
    sources: [S.article("Lowest common ancestor: binary lifting", "cp-algorithms", "https://cp-algorithms.com/graph/lca_binary_lifting.html"), S.article("Lowest common ancestor: Euler tour + RMQ", "cp-algorithms", "https://cp-algorithms.com/graph/lca.html"), S.article("Lowest common ancestor", "Wikipedia", "https://en.wikipedia.org/wiki/Lowest_common_ancestor")],
    problems: [236, 235, 1650, 1644, 1483, 2096, 1123],
  },

  // ─────────────── BSTs ───────────────
  "bst-ops": {
    blurb: "Search, insert and delete in a binary search tree, including the three deletion cases and why an unbalanced BST degrades to a linked list.",
    signals: ["Ordered data with frequent inserts and deletes", "Floor / ceiling / range operations", "Implement or modify a BST"],
    lesson: md`
## The BST property

For every node, keys in the left subtree are smaller and keys in the right subtree are larger (decide a convention for duplicates: allow them on one side, or store counts). Search, insert and delete all walk one root-to-leaf path: **O(h)**.

## Search and insert

Compare with the node and go left or right; insert at the null position reached. Iterative versions avoid recursion and are short.

## Delete (LC 450): three cases

1. **Leaf**: remove it.
2. **One child**: replace the node with its child.
3. **Two children**: replace the node's key with its **in-order successor** (the minimum of the right subtree) and delete that successor from the right subtree (it has at most one child). The predecessor works symmetrically.

Deleting with a recursive function that returns the new subtree root keeps the code short: root.left = delete(root.left, key) and so on.

## Floor, ceiling, rank and range

- **floor(x)**: largest key ≤ x. Walk: if key ≤ x, record it and go right; else go left.
- **ceiling(x)**: symmetric.
- **Range sum / range count of [lo, hi]** (LC 938): prune subtrees outside the range.
- **Rank / select** need subtree sizes stored in nodes (order-statistic tree).
- **Closest value** (LC 270): walk recording the best.
- **Trim a BST** to [lo, hi] (LC 669): recursive pruning that returns new roots.

## Height is everything

Inserting sorted keys builds a path: h = n and every operation becomes O(n). Random insertion order is much kinder: the average node depth is about 1.39 log₂ n and the expected height about 4.311 ln n (≈ 2.99 log₂ n). Guarantees need **balanced** trees (AVL, red-black, B-trees, treaps, skip lists as an alternative): see balanced BSTs.

## Standard library ordered sets

C++ \`std::set/map\` (red-black trees, with lower_bound and upper_bound), Java \`TreeMap/TreeSet\` (red-black, with floorKey, ceilingKey, headMap, tailMap), Python: no built-in balanced BST; use \`bisect\` on a sorted list (O(n) inserts) or \`sortedcontainers\`.
`,
    doubts: [
      ["Why the in-order successor for deleting a node with two children?", "It is the smallest key larger than the node, so putting it in the node's place keeps everything on the left smaller and everything on the right larger. It is also easy to remove: it has no left child."],
      ["How are duplicates handled?", "Pick a rule (e.g. equal keys go right) and use it consistently in insert, search and delete, or store a count in each node. Ordered multisets in libraries do the latter or allow equal keys on one side."],
      ["Is a random BST balanced enough?", "On average, yes (expected height O(log n)), but adversarial or sorted inputs destroy that. Libraries use self-balancing trees for guarantees."],
    ],
    revise: md`
? BST operation cost? :: O(h): O(log n) balanced, O(n) degenerate.
? Delete with two children? :: Copy the in-order successor (min of the right subtree) and delete it there.
? floor(x) walk? :: If key ≤ x record and go right, else go left.
? Sorted insertions produce? :: A linked list (h = n).
? Java floor/ceiling? :: TreeMap.floorKey / ceilingKey.
? Python ordered set? :: None built in: bisect on a list, or sortedcontainers.
`,
    pitfalls: ["Forgetting to reattach the returned subtree in recursive delete", "Assuming O(log n) without balancing", "Inconsistent duplicate rules"],
    quiz: [Q("Deleting a node with two children, you replace it with…", ["its left child", "*its in-order successor (or predecessor)", "its parent", "the root"], "Keeps the BST property.")],
    sources: [S.book("Algorithms, 4th ed. §3.2 Binary Search Trees", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/32bst/"), S.book("Introduction to Algorithms (CLRS), ch. 12: Binary Search Trees", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305")],
    problems: [700, 701, 450, 938, 270, 669, 1038],
  },
  "bst-inorder": {
    blurb: "In-order traversal of a BST is sorted, and that single fact solves validation, k-th smallest, recovering swapped nodes, iterators and two-sum on a BST.",
    signals: ["Validate a BST", "k-th smallest / largest", "Two nodes swapped by mistake", "BST iterator or two-sum on a BST"],
    lesson: md`
## Validate (LC 98)

Either pass bounds down (lo < node.val < hi, tightening on each step), or check that the in-order sequence is strictly increasing by remembering the previous value. Checking only node.left.val < node.val < node.right.val is **wrong**: a deeper node can violate an ancestor's bound. Use 64-bit or None sentinels for bounds when values can be the integer extremes.

## k-th smallest (LC 230)

In-order with a counter; stop at k. O(h + k). Follow-up "the tree is modified often and k-th is queried often": store **subtree sizes** in nodes and walk down choosing left/right by size: O(h) per query.

## Recover a BST with two swapped nodes (LC 99)

In the in-order sequence, a swap creates one or two "drops" (a[i] > a[i + 1]). The first wrong node is the larger element at the first drop; the second is the smaller element at the last drop. Swap their values. O(1) extra space with Morris traversal.

## BST iterator (LC 173)

Keep a stack of the left spine; next() pops, then pushes the left spine of the popped node's right child. Amortised O(1) per next, O(h) space.

## Two Sum IV on a BST (LC 653)

A hash set during traversal (O(n) space), or two iterators (ascending and descending) moving like two pointers: O(h) space.

## Other in-order uses

- **Minimum absolute difference** (LC 530): compare consecutive in-order values.
- **Mode in a BST** (LC 501): runs of equal values appear consecutively.
- **Convert BST to greater sum tree** (LC 538): reverse in-order with a running sum.
- **Inorder successor** (LC 285): walk from the root recording the last node where you went left.
`,
    doubts: [
      ["Why is checking each node against its children not enough?", "Example: root 5, left child 3, and 3's right child 6. Each parent-child pair looks fine, but 6 is in the left subtree of 5. You must enforce bounds inherited from all ancestors."],
      ["Recover BST: why first drop's larger and last drop's smaller?", "Swapping two values in a sorted sequence makes the bigger value appear too early (start of the first drop) and the smaller one too late (end of the last drop). If they were adjacent, there is a single drop containing both."],
      ["How does an order-statistic tree answer k-th in O(h)?", "At a node with left subtree size L: if k ≤ L go left; if k = L + 1 it is this node; else go right with k − L − 1."],
    ],
    revise: md`
? BST in-order property? :: Strictly increasing sequence.
? Validate correctly? :: Pass (lo, hi) bounds down, or check the in-order sequence.
? k-th smallest with frequent updates? :: Store subtree sizes; walk by size: O(h).
? Recover two swapped nodes? :: First drop's larger value and last drop's smaller value.
? BST iterator? :: Stack of the left spine; amortised O(1) next.
? Greater sum tree? :: Reverse in-order with a running sum.
`,
    pitfalls: ["Comparing only with direct children in validation", "Integer-extreme bounds (use long or null)", "Only one drop handled in Recover BST"],
    quiz: [Q("In-order of a BST with two swapped nodes is [1,6,3,4,5,2]. Which nodes are wrong?", ["6 and 3", "*6 and 2", "3 and 2", "1 and 6"], "First drop 6>3 → 6; last drop 5>2 → 2.")],
    sources: [S.article("Order statistic tree", "Wikipedia", "https://en.wikipedia.org/wiki/Order_statistic_tree"), S.book("Algorithms, 4th ed. §3.2 (rank and select)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/32bst/")],
    problems: [98, 230, 99, 173, 653, 530, 501, 538, 285],
  },
  "balanced-bst": {
    blurb: "How AVL and red-black trees keep height O(log n) with rotations, why B-trees rule databases, and how to use ordered maps (TreeMap, std::map) in interviews.",
    signals: ["Ordered data with guaranteed O(log n) inserts, deletes and range queries", "Need floor/ceiling/next-greater online", "Interviewer asks \"what if the BST becomes unbalanced?\""],
    widgets: ["avl-rotation"],
    lesson: md`
## Rotations

A **rotation** restructures three nodes locally while preserving in-order order. Right rotation at y (with left child x): x becomes the subtree root, y becomes x's right child, and x's old right subtree becomes y's left subtree. O(1). Every balanced BST is "a BST plus a rule for when to rotate".

[[widget:avl-rotation]]

## AVL trees

Invariant: at every node, the heights of the left and right subtrees differ by at most 1. After an insert or delete, walk up updating heights; at the first unbalanced node apply one of four cases:

- **LL**: single right rotation; **RR**: single left rotation;
- **LR**: left-rotate the left child, then right-rotate; **RL**: symmetric.

Height ≤ 1.44 log₂(n + 2): strictly balanced, so lookups are fast; inserts and deletes may rotate more than red-black trees.

## Red-black trees

Nodes are red or black; the root and null leaves are black; no red node has a red child; every root-to-null path has the same number of black nodes. Height ≤ 2 log₂(n + 1). Insert and delete fix violations with recolouring and at most 2 (insert) or 3 (delete) rotations. Used by Java TreeMap, C++ std::map, the Linux kernel's scheduler (CFS) and memory maps.

A **left-leaning red-black tree** (Sedgewick) corresponds one-to-one with 2-3 trees and has much shorter code: good for understanding.

## B-trees and B+ trees

Nodes hold many keys (hundreds), so the tree is very shallow (3–4 levels for billions of keys) and each node is one disk or SSD page. **B+ trees** keep all values in leaves linked in order, making range scans sequential. They are the index structure of almost every relational database (InnoDB, PostgreSQL) and many file systems. This is the bridge from DSA to system design.

## Other balanced structures

- **Treaps**: BST by key, heap by random priority; expected O(log n); easy split/merge.
- **Splay trees**: move accessed nodes to the root; amortised O(log n); great for skewed access.
- **Skip lists**: probabilistic layers of linked lists; expected O(log n); used by Redis sorted sets and LevelDB memtables.
- **Scapegoat trees**, **AA trees**, **weight-balanced trees**: name-level.

## Using ordered maps in interviews

| Need | Java TreeMap | C++ std::map / set | Python |
|---|---|---|---|
| ≤ x | floorKey | prev(upper_bound(x)) | bisect on sorted list |
| ≥ x | ceilingKey | lower_bound(x) | bisect_left |
| smallest / largest | firstKey / lastKey | begin / rbegin | list[0] / list[-1] |
| remove smallest | pollFirstEntry | erase(begin) | |

Problems: My Calendar (LC 729: floor and ceiling of the new start), Contains Duplicate III, Stock Price Fluctuation (LC 2034), Count of Range Sum (via sorted prefix sums), skyline with a multiset of heights.

You almost never implement AVL or red-black trees in an interview; you must know they exist, their guarantees, and how to use the library versions.
`,
    doubts: [
      ["AVL or red-black: which is better?", "AVL is more strictly balanced (faster lookups); red-black does fewer rotations on updates (faster inserts and deletes). Libraries choose red-black for general-purpose maps because updates are common."],
      ["Why do databases use B-trees instead of red-black trees?", "Disk and SSD reads come in pages of kilobytes. A B-tree node fills a page with hundreds of keys, so a lookup touches only a few pages. A binary tree would need about log₂ n ≈ 30 page reads for a billion keys."],
      ["What does a rotation actually preserve?", "The in-order sequence (so the BST property) and the subtrees' contents. Only three pointers change, plus height or colour bookkeeping."],
      ["Python has no TreeMap. What do I do in an interview?", "Say so. Options: bisect.insort into a list (O(n) insert, often acceptable), a heap when only min/max is needed, or sortedcontainers.SortedList (not standard library, but widely accepted)."],
    ],
    revise: md`
? What does a rotation preserve? :: In-order order (the BST property).
? AVL invariant? :: Child subtree heights differ by at most 1.
? AVL four cases? :: LL, RR (single rotation); LR, RL (double rotation).
? Red-black height bound? :: ≤ 2 log₂(n + 1).
? Red-black rules? :: Root black; no red-red parent/child; equal black height on every path.
? Why B+ trees in databases? :: High fan-out (page-sized nodes), shallow, leaves linked for range scans.
? Java floor / ceiling? :: TreeMap.floorKey / ceilingKey.
? C++ ≥ x? :: lower_bound(x).
`,
    pitfalls: ["Claiming a plain BST is O(log n)", "Implementing a red-black tree from scratch when TreeMap suffices", "Using Python bisect.insort in a 10⁵ loop without noting O(n) inserts"],
    quiz: [
      Q("Which structure backs Java's TreeMap?", ["AVL tree", "*Red-black tree", "B-tree", "Skip list"], "As does C++ std::map in common implementations."),
      Q("An LR imbalance in an AVL tree is fixed by…", ["one right rotation", "*a left rotation on the child, then a right rotation", "recolouring", "two right rotations"], "Double rotation."),
    ],
    sources: [S.book("Algorithms, 4th ed. §3.3 Balanced Search Trees (2-3 and red-black)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/33balanced/"), S.paper("Organization and maintenance of large ordered indices (Bayer & McCreight, 1972): B-trees", "Acta Informatica", "https://doi.org/10.1007/BF00288683"), S.article("AVL tree", "Wikipedia", "https://en.wikipedia.org/wiki/AVL_tree"), S.article("Red–black tree", "Wikipedia", "https://en.wikipedia.org/wiki/Red%E2%80%93black_tree")],
    problems: [729, 731, 2034, 352, 1146, 220],
  },

  // ─────────────── tries ───────────────
  "trie-basics": {
    blurb: "A tree keyed by characters: insert and lookup in O(length), prefix queries for free, and the memory trade-offs between arrays and hash maps per node.",
    signals: ["Many strings and prefix questions (starts with, autocomplete, longest common prefix)", "Dictionary of words with search or replace", "Counting strings with a given prefix"],
    widgets: ["trie"],
    lesson: md`
## Structure

Each node has up to |Σ| children (26 for lowercase letters) and an end-of-word flag. A word is a path from the root. Inserting or searching a word of length L is **O(L)**, independent of how many words are stored.

[[widget:trie]]

## Operations (LC 208)

- insert(word): walk, creating missing nodes; mark the end.
- search(word): walk; true iff the path exists and the last node is marked.
- startsWith(prefix): true iff the path exists.
- count words with a prefix: store a pass-through counter on each node, incremented on insert.
- delete: decrement counters, removing nodes whose counter reaches zero.

## Node representation

| Children as | Memory | Speed | When |
|---|---|---|---|
| fixed array[26] | 26 pointers per node | fastest | small alphabet |
| hash map | proportional to children | slower | large or unknown alphabet (Unicode, words as tokens) |
| sorted list / ternary search tree | compact | O(log σ) per step | memory-tight |

A trie of n words of average length L has up to n·L nodes; with arrays that can be large. **Compressed tries** (radix trees, Patricia tries) merge chains of single-child nodes into one edge labelled with a string, used by routers (longest prefix match on IP addresses) and by Linux's page cache.

## Applications

- **Replace Words** (LC 648): for each word, walk until the first end-of-word (shortest root).
- **Longest common prefix**: walk while the node has exactly one child and is not an end.
- **Map Sum Pairs** (LC 677): prefix sums stored on nodes.
- **Word Dictionary with '.'** (LC 211): DFS over children on wildcards.
- **Autocomplete / search suggestions** (LC 1268): walk to the prefix node, then DFS in lexicographic order (or store the top 3 words on each node at insert time).
- **Longest word built one letter at a time** (LC 720): BFS/DFS through end-marked nodes only.

## Trie vs hash set

A hash set answers "is this exact word present?" in O(L) too, but cannot answer prefix questions without scanning everything. Choose a trie when prefixes matter or when many strings share prefixes (memory sharing).
`,
    doubts: [
      ["Is a trie always better than a hash set for strings?", "No. For exact lookup only, a hash set is simpler and often uses less memory. A trie wins when you need prefix queries, ordered iteration, or wildcard and longest-prefix matching."],
      ["Why store counts on nodes?", "To answer 'how many words start with this prefix' in O(prefix length) and to support deletion (a node can be freed when its count drops to zero)."],
      ["What is a radix tree?", "A trie where chains of single-child nodes are compressed into one edge labelled with a substring. Same operations, far fewer nodes. Used in IP routing tables and HTTP routers."],
    ],
    revise: md`
? Trie insert/search cost? :: O(L), word length, independent of the number of words.
? search vs startsWith? :: search also requires the end-of-word flag.
? Count words with a prefix? :: Pass-through counter per node.
? Array vs map children? :: Array: fast, memory heavy; map: compact, slower.
? Radix tree? :: Compressed trie (single-child chains merged).
? Trie vs hash set? :: Trie when prefixes, ordering or wildcards matter.
`,
    pitfalls: ["Forgetting the end-of-word flag (prefix mistaken for word)", "Array children with a huge alphabet", "Recursion depth for very long words"],
    quiz: [Q("Insert 'app' and 'apple'. search('app') is true only if…", ["the path exists", "*the node for 'p' (3rd) is marked as an end", "'apple' was inserted first", "always"], "Prefix paths exist for both; the end flag decides.")],
    sources: [S.book("Algorithms, 4th ed. §5.2 Tries", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/52trie/"), S.article("Trie", "Wikipedia", "https://en.wikipedia.org/wiki/Trie"), S.article("Radix tree", "Wikipedia", "https://en.wikipedia.org/wiki/Radix_tree")],
    problems: [208, 211, 648, 677, 1268, 720, 14],
  },
  "trie-search": {
    blurb: "Tries as search engines: Word Search II on a board, streaming suffix matches, palindrome pairs and autocomplete with ranking.",
    signals: ["Find many dictionary words on a grid", "Match a stream of characters against many patterns", "Pairs of words with a combined property"],
    lesson: md`
## Word Search II (LC 212)

Searching each word separately with DFS costs (words × board × 4^L). Instead, build a trie of all words and DFS the board once, following trie edges: a path that leaves the trie is pruned immediately.

Key optimisations interviewers look for:
- store the full word on its end node (no string building);
- after finding a word, clear it from the node (no duplicates in the output);
- **prune leaves**: remove trie nodes with no remaining children once their words are found, so later DFS paths die earlier;
- mark visited cells in place ('#') and restore on backtrack.

## Stream of characters (LC 1032)

Query after each new letter: does any word end here? Insert **reversed** words into a trie and walk backwards from the newest letter (keep only the last maxLen letters). Aho–Corasick solves it with one forward automaton.

## Palindrome Pairs (LC 336)

For each word, split it into prefix + suffix; if the prefix is a palindrome, look up reverse(suffix) in the dictionary (and symmetrically). With a hash map this is O(n·L²). A trie of reversed words with "remaining part is a palindrome" lists on nodes reaches O(n·L²) with better constants.

## Search suggestions (LC 1268)

Sort the products and binary search the prefix range (simple and fast), or store the top-3 lexicographic words on each trie node during insertion. For a real search box, rank by popularity: keep top-k by score on each node and update incrementally. A great segue into system design (typeahead).

## Concatenated words (LC 472)

Sort by length; for each word, check whether it can be split into words already inserted (trie walk + DP over positions), then insert it.
`,
    doubts: [
      ["Why is pruning leaves in Word Search II important?", "Once a word is found, its trie path may still attract DFS exploration on the board. Removing empty branches cuts those paths, which matters on large boards with many found words."],
      ["Why reverse the words for the stream problem?", "A query asks whether some word ends at the newest character. Reading the recent characters backwards and matching reversed words checks all suffixes in one trie walk."],
    ],
    revise: md`
? Word Search II core idea? :: One DFS over the board guided by a trie of all words.
? Avoid duplicate results? :: Clear the word at its end node after recording it.
? Stream of characters? :: Trie of reversed words; walk back from the newest letter.
? Palindrome pairs split check? :: prefix palindrome + reverse(suffix) in the dictionary (and the mirror case).
? Search suggestions simplest? :: Sort + binary search on the prefix.
`,
    pitfalls: ["Running a separate DFS per word", "Not restoring visited cells", "Duplicate results in Word Search II"],
    quiz: [Q("Word Search II speed-up versus per-word DFS comes from…", ["sorting words", "*sharing prefixes in a trie and pruning", "BFS", "hashing the board"], "One traversal serves all words.")],
    sources: [S.book("Algorithms, 4th ed. §5.2 Tries", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/52trie/"), S.article("Aho–Corasick algorithm", "cp-algorithms", "https://cp-algorithms.com/string/aho_corasick.html")],
    problems: [212, 1032, 336, 1268, 472, 642],
  },
  "bit-trie": {
    blurb: "Store numbers bit by bit from the most significant bit and answer \"maximum XOR with x\" greedily in O(bits). Offline queries with limits sort first.",
    signals: ["Maximum XOR of two numbers", "Maximum XOR with an element under a limit (queries)", "Count pairs with XOR in a range"],
    lesson: md`
## Maximum XOR of two numbers (LC 421)

Insert each number into a binary trie from bit 31 (or the highest needed) down to bit 0. To find the best partner for x, walk from the top and at each bit **prefer the opposite bit** (it makes this XOR bit 1, which outweighs all lower bits combined). O(n · B) with B = 32.

An alternative without a trie: build the answer bit by bit using prefix sets and the property a ⊕ b = c ⟺ a ⊕ c = b. Also O(n · B).

## Queries with a limit (LC 1707)

"Max of x XOR a over a ≤ m": sort the numbers and the queries by m; insert numbers ≤ m before answering each query (offline processing). Or store the minimum value in each trie node and only enter subtrees whose minimum ≤ m.

## Counting pairs with XOR in [low, high] (LC 1803)

Count pairs with XOR < high + 1 minus pairs with XOR < low, walking the trie with counters on nodes: at each bit, if the limit's bit is 1, add the count of the branch that makes this XOR bit 0, then follow the branch that makes it 1.

## Maximum XOR subarray

Prefix XOR P: subarray XOR = P[r + 1] ⊕ P[l]. Insert prefixes into the trie as you go; for each new prefix query the best partner. O(n · B).

## Why greedy from the top bit is correct

Bit k contributes 2ᵏ, more than all lower bits together (2ᵏ − 1). So maximising the highest bit first, then the next, gives the maximum.
`,
    doubts: [
      ["Why must I insert from the most significant bit?", "The greedy decision is made from the bit that matters most. Inserting from the top makes the trie path order match that decision order."],
      ["How many bits do I need?", "Enough for the largest value: 31 for non-negative 32-bit ints, or floor(log₂ max) + 1 to save time."],
    ],
    revise: md`
? Max XOR partner walk? :: From the top bit, prefer the opposite bit when the child exists.
? Why greedy works? :: 2ᵏ > sum of all lower bits.
? Queries with a value limit? :: Sort offline, insert numbers ≤ limit; or keep subtree minima.
? Maximum XOR subarray? :: Prefix XORs in a trie.
? Complexity? :: O(n · B), B = number of bits.
`,
    pitfalls: ["Inserting from bit 0 upward", "Querying an empty trie", "Negative numbers (decide the bit width and sign handling)"],
    quiz: [Q("Max XOR of [3, 10, 5, 25, 2, 8]?", ["25", "*28", "31", "15"], "5 ⊕ 25 = 28.")],
    sources: [S.article("Trie", "Wikipedia", "https://en.wikipedia.org/wiki/Trie"), S.article("Trie for XOR problems (binary trie)", "USACO Guide", "https://usaco.guide/adv/string-search")],
    problems: [421, 1707, 1803, 1938, 2935],
  },

  // ─────────────── heaps ───────────────
  "heap-internals": {
    blurb: "A complete binary tree in an array: sift up, sift down, why building a heap is O(n) not O(n log n), heap sort, and the API differences across languages.",
    signals: ["Repeatedly take the smallest or largest", "Need a priority queue's guarantees and costs", "Implement a heap or decrease-key"],
    widgets: ["heap"],
    lesson: md`
## Array layout

A binary heap is a **complete** binary tree stored level by level in an array. With 0-based indices: children of i are 2i + 1 and 2i + 2; parent is (i − 1) / 2. No pointers, cache friendly.

**Heap property** (min-heap): every node ≤ its children. The minimum is at index 0.

## Operations

- **push**: append at the end, **sift up** (swap with the parent while smaller). O(log n).
- **pop**: move the last element to the root, **sift down** (swap with the smaller child while larger). O(log n).
- **peek**: O(1).
- **heapify** an array: sift down every non-leaf from the last one (index n/2 − 1) to the root. **O(n)**.

[[widget:heap]]

## Why heapify is O(n)

Most nodes are near the bottom and sift down only a little. About n/2 nodes are leaves (0 work), n/4 sift at most 1 level, n/8 at most 2, and so on: n · Σ k / 2^(k+1) = O(n). Building by n pushes is O(n log n) because each push may sift up the full height.

## Heap sort

Heapify (O(n)), then repeatedly swap the root with the last element and sift down: O(n log n) worst case, O(1) extra space, not stable, and slower in practice than quicksort due to poor cache locality. Its O(n log n) worst case is why introsort falls back to it.

## Language APIs

- **Python** \`heapq\`: min-heap on a list. heappush, heappop, heapify, heapreplace, nlargest/nsmallest. Max-heap: push −x (or tuples with negated keys). Ties compare the next tuple element, so add a counter for incomparable payloads.
- **Java** \`PriorityQueue\`: min-heap by default; \`new PriorityQueue<>(Comparator.reverseOrder())\` for max. remove(Object) is O(n). Comparators like (a, b) -> a - b can overflow: use Integer.compare.
- **C++** \`priority_queue\`: **max-heap** by default; \`priority_queue<int, vector<int>, greater<int>>\` for min. Custom comparators define "less", which is confusing: the element that is "largest" by the comparator comes out first.

## Decrease-key

Binary heaps in standard libraries do not support decrease-key. Options: push a new entry and ignore stale ones when popped (**lazy deletion**, as in Dijkstra), or use an **indexed priority queue** (position map, O(log n) decrease-key). Fibonacci heaps give amortised O(1) decrease-key in theory; in practice binary or d-ary heaps win.

## d-ary heaps

Children per node = d. Shallower (log_d n), cheaper sift-up, costlier sift-down. 4-ary heaps are often fastest in practice for Dijkstra-like workloads.
`,
    doubts: [
      ["Why is heapify O(n) but n pushes O(n log n)?", "Sifting down costs the node's height, and most nodes have small height. Sifting up costs the node's depth, and most nodes are deep. The sum of heights is O(n); the sum of depths is O(n log n)."],
      ["Is a heap sorted?", "No. Only parent ≤ child holds. Siblings and cousins are in no particular order; iterating the array does not give sorted output."],
      ["How do I make a max-heap in Python?", "Push negated keys (−x) and negate on pop, or push (−priority, counter, item) tuples."],
      ["Why can (a, b) -> a - b break a Java comparator?", "For large values of opposite signs, a − b overflows int and flips the sign of the result. Integer.compare(a, b) is always correct."],
    ],
    revise: md`
? Children and parent of index i (0-based)? :: 2i+1, 2i+2; parent (i−1)/2.
? push / pop cost? :: O(log n) each (sift up / sift down).
? Heapify cost and why? :: O(n): sum of node heights is linear.
? Heap sort properties? :: O(n log n) worst case, O(1) space, not stable.
? C++ priority_queue default? :: Max-heap.
? Python max-heap? :: Negate keys.
? Decrease-key without support? :: Lazy deletion (push new, skip stale) or an indexed PQ.
`,
    pitfalls: ["Assuming the heap array is sorted", "Java comparator overflow with subtraction", "C++ default max-heap confusion", "Python heap with incomparable payloads on ties"],
    quiz: [
      Q("Building a heap from n elements with heapify costs…", ["O(n log n)", "*O(n)", "O(log n)", "O(n²)"], "Sum of heights."),
      Q("std::priority_queue<int> pops…", ["the smallest", "*the largest", "in insertion order", "random"], "Max-heap by default."),
    ],
    sources: [S.book("Algorithms, 4th ed. §2.4 Priority Queues", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/24pq/"), S.article("heapq: heap queue algorithm", "Python documentation", "https://docs.python.org/3/library/heapq.html"), S.book("Introduction to Algorithms (CLRS), ch. 6: Heapsort", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305")],
    problems: [1046, 703, 912],
  },
  "top-k": {
    blurb: "k largest, k smallest, k closest, k most frequent and merging k sorted streams: a size-k heap, quickselect, or bucket sort, each with its own trade-off.",
    signals: ["\"k largest / smallest / closest / most frequent\"", "Streaming data where only the best k matter", "Merge k sorted lists, arrays or iterators"],
    lesson: md`
## The size-k heap trick

For the k **largest**, keep a **min-heap of size k**: push each element; if the size exceeds k, pop the smallest. The heap's root is the k-th largest. O(n log k) time, O(k) space, and it works on streams (Kth Largest in a Stream, LC 703).

The counter-intuitive part: largest uses a *min*-heap (to evict the smallest of the current top k), smallest uses a *max*-heap.

## Alternatives

| Method | Time | Notes |
|---|---|---|
| Sort | O(n log n) | simplest; fine for small n |
| Size-k heap | O(n log k) | streaming, k ≪ n |
| Heapify all + pop k | O(n + k log n) | when k is moderate |
| Quickselect | O(n) average, O(n²) worst | in place; median-of-medians for O(n) worst |
| Bucket sort (frequencies) | O(n) | Top K Frequent (counts are ≤ n) |

## Patterns

- **Kth Largest Element** (LC 215): heap or quickselect.
- **K Closest Points to Origin** (LC 973): max-heap of size k by squared distance (avoid sqrt), or quickselect.
- **Top K Frequent Elements / Words** (LC 347, 692): count, then bucket by frequency or heap with a custom comparator (words: frequency desc, then lexicographic asc).
- **Find K Closest Elements** in a sorted array (LC 658): binary search the left boundary of the window: O(log(n − k) + k).
- **Kth smallest in a sorted matrix** (LC 378): heap of row heads, or binary search on values.
- **Find K Pairs with Smallest Sums** (LC 373): heap seeded with (a[i] + b[0]) for i < k; when popping (i, j), push (i, j + 1).

## K-way merge

Merge k sorted sequences (lists, files, iterators): heap of the current head of each; pop the smallest, push its successor. O(N log k). This is how external merge sort combines sorted runs from disk, and how databases merge sorted index scans. **Smallest Range Covering Elements from K Lists** (LC 632): k-way merge while tracking the current max; the range is [heap min, current max].
`,
    doubts: [
      ["Why a min-heap for the k largest?", "You keep the best k seen so far and need to know which of them to evict when a better element arrives: the smallest of the k. A min-heap gives it in O(1) and removes it in O(log k)."],
      ["Quickselect or heap in an interview?", "Heap is simpler and safe (O(n log k) worst case). Quickselect is faster on average and in place; mention randomised pivots to avoid the O(n²) worst case, and introselect / median-of-medians for a guarantee."],
      ["Top K Frequent in O(n)?", "Counts are at most n, so bucket indices 0..n hold elements by frequency; walk buckets from high to low until you have k."],
    ],
    revise: md`
? k largest with a heap? :: Min-heap of size k; root = k-th largest. O(n log k).
? Quickselect average / worst? :: O(n) / O(n²) (randomise the pivot).
? Top K Frequent in O(n)? :: Count, bucket by frequency, read from the top.
? K closest points? :: Max-heap of size k by squared distance.
? K-way merge cost? :: O(N log k) with a heap of heads.
? K pairs with smallest sums? :: Seed (i, 0); on pop push (i, j + 1).
`,
    pitfalls: ["Using a max-heap of all n elements for the k largest (O(n log n) memory and time)", "sqrt for distances", "Word comparator order (frequency desc, word asc)"],
    quiz: [Q("Kth largest in a stream of 10⁹ numbers with k = 100. Memory?", ["O(n)", "*O(k)", "O(log n)", "O(n log k)"], "Keep only the current top k.")],
    sources: [S.article("Quickselect", "Wikipedia", "https://en.wikipedia.org/wiki/Quickselect"), S.article("K-way merge algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/K-way_merge_algorithm"), S.book("Algorithms, 4th ed. §2.4 (TopM)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/24pq/")],
    problems: [215, 703, 973, 347, 692, 658, 378, 373, 632, 23],
  },
  "two-heaps": {
    blurb: "A max-heap for the lower half and a min-heap for the upper half: the running median in O(log n) per insert, sliding medians with lazy deletion, and IPO-style two-pool problems.",
    signals: ["Median of a stream", "Sliding window median", "Two pools: candidates unlocked by a threshold, chosen by best value"],
    lesson: md`
## Median of a data stream (LC 295)

Keep **lo** (max-heap, the smaller half) and **hi** (min-heap, the larger half) with:
- every element of lo ≤ every element of hi;
- sizes equal, or lo has one extra.

Insert: push into lo; move lo's max to hi; if hi became larger, move hi's min back to lo. Median: lo's top (odd total) or the average of both tops (even). O(log n) insert, O(1) median.

## Follow-ups interviewers ask

- **All numbers in [0, 100]**: counts array, median by scanning 101 buckets: O(1).
- **99% in [0, 100]**: counts for the range plus heaps or overflow lists for the outliers.
- **Sliding window median** (LC 480): two heaps with lazy deletion (a map of values to delete when they reach a top), tracking sizes of live elements; or an ordered multiset with a middle iterator.

## Two pools with a threshold: IPO (LC 502)

Projects need capital c to start and give profit p. Sort projects by c; keep a max-heap of profits of currently affordable projects. Repeat k times: move every project with c ≤ current capital into the heap, take the max profit. The first pool is a sorted list (or min-heap by capital), the second a max-heap by profit.

Same shape: **Maximum Performance of a Team** (LC 1383: sort by efficiency descending, keep a min-heap of the k largest speeds), **Minimum Cost to Hire K Workers** (LC 857: sort by wage/quality ratio, keep a max-heap of qualities), **Course Schedule III** (LC 630: sort by deadline, max-heap of durations, drop the longest when over).

## Why two heaps and not one sorted structure

Two heaps give O(log n) insert and O(1) median with only the standard library. A balanced BST or order-statistic tree also works (O(log n) both) and supports deletion directly.
`,
    doubts: [
      ["Why push into lo first and then move its max to hi?", "It routes the new element to the correct side automatically: if it was large, it travels through lo's top into hi. Then a single size check restores the balance."],
      ["How do I handle deletion for sliding median?", "Record the outgoing value in a 'pending deletion' map and adjust the size counter of the heap it belongs to. Whenever a heap's top is pending, pop it. Rebalance using the live sizes."],
      ["Why do IPO-style problems sort by one key and heap by another?", "The threshold (capital, deadline, ratio) decides which items become available, which only grows over time when sorted. Among available items, the heap picks the best by the objective."],
    ],
    revise: md`
? Two-heap invariants? :: max(lo) ≤ min(hi); |lo| = |hi| or |lo| = |hi| + 1.
? Insert routine? :: Push to lo, move lo.top to hi, rebalance if hi is larger.
? Median? :: lo.top, or the average of the tops.
? Values in [0, 100]? :: Counting array.
? Sliding median deletion? :: Lazy deletion map + live-size counters.
? IPO pattern? :: Sort by threshold; max-heap of unlocked values; pick k times.
? Max performance of a team? :: Sort by efficiency desc; min-heap of the k largest speeds.
`,
    pitfalls: ["Unbalanced heaps after insert", "Integer overflow when averaging two ints", "Counting lazily deleted elements in sizes"],
    quiz: [Q("After inserting 5, 15, 1, 3 the two-heap median is…", ["3", "*4", "5", "8"], "Sorted 1, 3, 5, 15 → (3 + 5)/2.")],
    sources: [S.book("Algorithms, 4th ed. §2.4 Priority Queues", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/24pq/"), S.article("Median (streaming / running median)", "Wikipedia", "https://en.wikipedia.org/wiki/Median")],
    problems: [295, 480, 502, 1383, 857, 630, 2402],
  },
  "heap-scheduling": {
    blurb: "Simulate time with heaps: meeting rooms, task schedulers with cooldowns, CPU queues, servers and events processed in order of availability.",
    signals: ["Events with start and end times, resources freed when done", "Pick the next task by priority among those that are ready", "Cooldown between identical tasks"],
    lesson: md`
## Meeting Rooms II (LC 253)

Sort meetings by start; keep a min-heap of end times of rooms in use. For each meeting, if the earliest end ≤ start, reuse that room (pop); push the new end. The heap's maximum size is the answer. O(n log n). Equivalent sweep: +1 at each start, −1 at each end, maximum running sum (sort events with end before start at equal times).

## Simulation with two heaps

Many problems have "who is available" and "who is busy until when":

- **Single-Threaded CPU** (LC 1834): sort tasks by enqueue time; a min-heap of available tasks by (duration, index); if none is available, jump time to the next enqueue time.
- **Process Tasks Using Servers** (LC 1882): free servers by (weight, index); busy servers by (free time, weight, index).
- **Meeting Rooms III** (LC 2402): free rooms by index; busy rooms by (end time, index); delayed meetings keep their duration.
- **Furthest Building You Can Reach** (LC 1642): use ladders for the largest climbs: min-heap of climbs using ladders; when it exceeds the ladder count, pay the smallest with bricks.

**Time jumping**: when nothing is ready, set time to the next event's time instead of incrementing by 1, or you will time out.

## Task Scheduler (LC 621)

Tasks with cooldown n. Closed form: let maxCount be the highest frequency and t the number of tasks with that frequency; the answer is max(len(tasks), (maxCount − 1)(n + 1) + t). The heap simulation (pop up to n + 1 most frequent per cycle) gives the same result and generalises to "reorganise string" variants (LC 767, LC 358: greedy with a max-heap and a cooldown queue).

## Greedy scheduling with deadlines

- **Course Schedule III**: sort by deadline; take courses; if the total time exceeds the deadline, drop the longest taken so far (max-heap).
- **Job sequencing with deadlines** (profit): sort by profit and use a DSU of free slots, or by deadline with a min-heap of profits.
`,
    doubts: [
      ["At equal times, do ends come before starts in Meeting Rooms II?", "If a meeting ends at 10 and another starts at 10, they can share a room under the usual convention. Popping when end ≤ start (or ordering end events first in a sweep) implements that."],
      ["Why does the Task Scheduler formula work?", "The most frequent task forces maxCount − 1 full cycles of length n + 1 followed by a final partial cycle containing every task with maximal frequency. If there are more tasks than idle slots, no idling is needed and the answer is just the task count."],
      ["Why jump time forward?", "Time values can be huge (10⁹). Advancing one unit at a time is far too slow; when nothing is ready, the next interesting moment is the next enqueue or free time."],
    ],
    revise: md`
? Meeting Rooms II heap? :: Min-heap of end times; reuse if earliest end ≤ start; answer = max heap size.
? Equivalent sweep? :: +1 at start, −1 at end, ends first at ties; max running sum.
? CPU / servers pattern? :: Heap of available (by priority) + heap of busy (by free time).
? When idle? :: Jump time to the next event.
? Task Scheduler formula? :: max(n_tasks, (maxCount − 1)(n + 1) + t).
? Course Schedule III? :: Sort by deadline; max-heap of durations; drop the longest when over.
? Furthest building? :: Min-heap of ladder climbs; overflow paid in bricks.
`,
    pitfalls: ["Incrementing time by 1 in simulations", "Wrong tie-breaking order of heap tuples", "Start/end ordering at equal times"],
    quiz: [Q("Meetings [0,30], [5,10], [15,20]: rooms needed?", ["1", "*2", "3", "0"], "[5,10] and [15,20] share a room; [0,30] needs another.")],
    sources: [S.book("Algorithms, 4th ed. §2.4 Priority Queues", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/24pq/"), S.article("Interval scheduling", "Wikipedia", "https://en.wikipedia.org/wiki/Interval_scheduling")],
    problems: [253, 621, 767, 358, 1834, 1882, 2402, 1642, 630],
  },
  "indexed-pq": {
    blurb: "When priorities change: lazy deletion with stale entries, indexed priority queues with decrease-key, and when an ordered set is the simpler tool.",
    signals: ["Update the priority of an element already in the heap", "Delete arbitrary elements from a heap", "Dijkstra/Prim implementations with decrease-key"],
    lesson: md`
## Lazy deletion

Instead of updating or removing an entry, push a new one and remember the current valid value (or a deleted flag/counter). When popping, discard entries that do not match the current value. Each entry is pushed and popped once, so the cost is O(log(total pushes)), and total pushes are bounded by the number of updates.

This is how Dijkstra is usually written: \`if d > dist[u]: continue\`. Stock Price Fluctuation (LC 2034) uses it for min and max prices with corrections.

## Indexed priority queue

Keep a heap of keys plus a **position map** key → index in the heap array (updated on every swap). Then:
- decrease-key/increase-key: change the value and sift up/down from its position: O(log n);
- delete(key): swap with the last, pop, sift: O(log n);
- contains(key): O(1).

Use it when the heap must stay small (memory-bound) or when you need exact deletion. Sedgewick's \`IndexMinPQ\` is the standard reference.

## Ordered set as a priority queue

A balanced BST (TreeSet of (priority, id) pairs, std::set) supports insert, delete-any and min/max in O(log n) with no lazy tricks. In C++ and Java this is often the simplest "updatable priority queue". In Python, use heaps with lazy deletion.

## Which to choose

| Need | Choose |
|---|---|
| Few updates, simplicity | lazy deletion |
| Many updates, bounded memory, exact size | indexed PQ |
| C++/Java, need min and max and deletions | ordered set |
| Theoretical bounds for Dijkstra | Fibonacci heap (name only) |
`,
    doubts: [
      ["Doesn't lazy deletion make the heap grow without bound?", "It grows by one entry per update. In Dijkstra that is O(E) entries, which is fine. If updates vastly outnumber live elements, rebuild the heap occasionally or switch to an indexed PQ."],
      ["How do I know an entry is stale?", "Store enough to compare: for Dijkstra, the distance in the entry versus dist[u]; for keyed items, a version number per key, or a map from key to its current priority."],
    ],
    revise: md`
? Lazy deletion check in Dijkstra? :: if d > dist[u]: continue.
? Indexed PQ extra structure? :: Position map key → heap index, updated on swaps.
? Decrease-key cost? :: O(log n) in an indexed PQ.
? Simplest updatable PQ in Java/C++? :: TreeSet / std::set of (priority, id).
`,
    pitfalls: ["Forgetting to update the position map on swaps", "Not skipping stale entries"],
    quiz: [Q("In lazy Dijkstra, a popped (d, u) with d > dist[u] means…", ["a bug", "*a stale entry: skip it", "a negative cycle", "u is unreachable"], "A shorter distance was already recorded.")],
    sources: [S.book("Algorithms, 4th ed. §2.4 (IndexMinPQ)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/24pq/IndexMinPQ.java.html"), S.article("Priority queue (decrease-key and implementations)", "Wikipedia", "https://en.wikipedia.org/wiki/Priority_queue")],
    problems: [2034, 1845, 2349, 2353],
  },
};
