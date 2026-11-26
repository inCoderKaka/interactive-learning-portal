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
## Why traversal order matters

A binary tree has no single natural order, so "visit every node" comes in several flavours, and choosing the right one is often the whole solution. The rule of thumb: decide **when** the node's own work must happen relative to its children's.

- **Pre-order** (node, left, right): the node's work needs nothing from its children, or must happen before them. Copying a tree, serialising it, passing information **down** (depth, path so far, bounds).
- **In-order** (left, node, right): the node sits between its subtrees. In a BST this visits keys in **sorted order**, which is the basis of validation, k-th smallest and BST iterators.
- **Post-order** (left, right, node): the node needs its children's results first. Heights, diameters, subtree sums, deleting or freeing a tree, evaluating an expression tree.
- **Level order** (BFS): by depth, top to bottom. Anything about levels, widths, nearest leaves or views.

Dry run on the tree 1 (left 2 with children 4, 5; right 3):

| Order | Sequence |
|---|---|
| pre | 1 2 4 5 3 |
| in | 4 2 5 1 3 |
| post | 4 5 2 3 1 |
| level | 1 2 3 4 5 |

[[widget:tree-dfs]]

## Recursive versions

\`\`\`python
def inorder(node, out):
    if not node: return
    inorder(node.left, out)
    out.append(node.val)       # move this line up for pre-order, down for post-order
    inorder(node.right, out)
\`\`\`

O(n) time, O(h) stack space where h is the height: O(log n) for a balanced tree, O(n) for a skewed one (a linked-list-shaped tree of 10⁵ nodes overflows Python's recursion limit).

## Iterative versions

**Pre-order**: a stack; pop a node, visit it, push the right child, then the left child (so the left is popped first).

**In-order**: walk left pushing every node; when you cannot go further, pop, visit, and move to the popped node's right child.

\`\`\`python
def inorder_iter(root):
    out, stack, cur = [], [], root
    while cur or stack:
        while cur:
            stack.append(cur); cur = cur.left
        cur = stack.pop()
        out.append(cur.val)
        cur = cur.right
    return out
\`\`\`

**Post-order**: two easy options. (1) Run a "node, right, left" pre-order and reverse the output (it becomes left, right, node). (2) One stack plus a prev pointer: peek at the top; if it has an unvisited right child that is not prev, go right; otherwise pop, visit, and set prev. Option 2 does the work at the true post-order moment, which matters when the work uses children's results.

**Universal pattern**: push (node, visited flag). On first pop, push it back with the flag set together with its children in the order you need; on the second pop, do the work. One template covers all three orders.

## Morris traversal (O(1) space)

In-order without a stack or recursion, by temporarily threading the tree:

- If cur has no left child: visit cur, go right.
- Otherwise find cur's in-order predecessor pred (the rightmost node of the left subtree).
  - If pred.right is null: set pred.right = cur (a thread back), go left.
  - If pred.right is cur (the thread exists, so the left subtree is done): remove it, visit cur, go right.

Each edge is walked a constant number of times (finding predecessors costs O(n) in total), so it is O(n) time and O(1) extra space, and the tree is restored at the end. Pre-order Morris visits cur when creating the thread instead of when removing it. Use it when the interviewer asks for O(1) space (Recover BST, LC 99, follow-up). Do not use it if other threads read the tree concurrently: it mutates the tree temporarily.

## Reconstructing traversals

- Pre-order + in-order, or post-order + in-order, determine a tree uniquely when values are distinct (the root splits the in-order sequence).
- Pre-order + post-order is ambiguous (a single child could be left or right) unless every node has 0 or 2 children (LC 889).
- Pre-order (or level order) with explicit null markers alone determines the tree: that is serialisation.

## Vertical, diagonal and boundary traversals

- **Vertical order** (LC 314, 987): BFS carrying a column index (left − 1, right + 1); group by column. LC 987 sorts nodes in the same row and column by value, so sort by (column, row, value).
- **Diagonal traversal**: nodes on the same diagonal share (depth − column), i.e. going right keeps the diagonal, going left starts the next one.
- **Boundary of a binary tree** (LC 545): the left boundary (excluding leaves), all leaves from left to right, then the right boundary reversed (excluding leaves). Three separate walks.
- **Zigzag level order** (LC 103): level order, reversing every other level (or a deque appended from alternating ends).
- **Top and bottom views**: the first and last node per column in BFS order.

## Complexity

Every traversal is O(n) time. Space: O(h) for DFS (recursion or stack), O(w) for BFS where w is the maximum width (up to n/2 on the last level of a complete tree), O(1) for Morris.

## Interview angles

- Say which order you need and why ("post-order, because a node's height depends on its children").
- Be ready to write the iterative in-order from memory; it is a frequent follow-up.
- Morris is the expected answer to "can you do it in O(1) space?".

## Connections

DFS return values (heights, path sums) are post-order work; BST problems use in-order; serialisation uses pre-order with null markers; level-order BFS is the tree version of graph BFS.
`,
    doubts: [
      ["How do I pick the traversal order for a problem?", "Ask when the node's work can happen. If it needs results from both children (height, diameter, subtree sums), post-order. If it needs information from ancestors (depth, path so far), pre-order with parameters. If the property is about sorted order in a BST, in-order. If it is about levels or shortest depth, BFS."],
      ["Why push right before left in iterative pre-order?", "The stack is LIFO; pushing right first means left is popped (visited) first, matching node-left-right."],
      ["Is Morris traversal safe to use?", "It temporarily modifies the tree, so it is unsafe with concurrent readers and must complete to restore the structure. In interviews, offer it as the O(1)-space follow-up."],
      ["Does level-order need a queue?", "BFS does. You can also do level order with DFS by passing depth and appending to result[depth], which uses O(h) stack instead of O(width) queue."],
      ["Why does iterative post-order with one stack need a prev pointer?", "When the top node is peeked again, you must know whether you are returning from its right subtree (then it is time to visit it) or have not gone right yet. prev, the last visited node, tells you: if top.right is null or equals prev, the right side is done."],
      ["Which traversal gives the nodes of a BST in descending order?", "Reverse in-order: right, node, left. It is used for \"convert BST to greater sum tree\" (accumulate a running sum while visiting in descending order)."],
      ["Do traversals change for n-ary trees?", "Pre-order and post-order generalise directly (visit before or after all children); in-order is not defined without a left/right split. Level order works unchanged with a queue."],
    ],
    revise: md`
? Pre / in / post order? :: Node-left-right / left-node-right / left-right-node.
? BST in-order gives? :: Keys in sorted order.
? Iterative in-order? :: Push left chain; pop, visit, go to the right child.
? Iterative post-order trick? :: Reverse of (node, right, left) pre-order.
? Morris traversal space and idea? :: O(1): thread each predecessor's null right pointer back to the node.
? Traversal stack space? :: O(h): O(log n) balanced, O(n) skewed.
? Which pairs reconstruct a tree uniquely (distinct values)? :: Pre + in, or post + in.
? Universal iterative traversal template? :: Push (node, visited flag); on the second pop do the work.
? Diagonal traversal key? :: depth − column (going right stays on the diagonal).
? Boundary of a binary tree parts? :: Left boundary (no leaves), leaves left to right, right boundary reversed.
? Why not Morris with concurrent readers? :: It temporarily rewires right pointers.
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

Most binary-tree problems are solved by one recursive function whose return value summarises a subtree. Design it in three steps:

1. **What does the parent need from a child?** That is the return value: a height, a sum, a boolean, a best single-branch path, or a tuple of several facts.
2. **How do two children's returns plus the node combine** into the node's return? That is the recursive case.
3. **Is the answer a different quantity from the return value?** Often the answer is a path that **bends** at some node (uses both children) while the return value is a path that goes **straight up** (uses at most one child). Then update a global (or nonlocal) best at every node, and return the straight version.

The base case is the empty tree: return the neutral value (0 for height or sums, true for "balanced", −∞ for a maximum that must include a node).

## Examples

**Maximum depth** (LC 104): depth(node) = 1 + max(depth(left), depth(right)); depth(None) = 0.

**Diameter** (LC 543): the longest path between any two nodes, in edges. Return the height (longest downward path); at each node the best path bending there has length height(left) + height(right). Update the global maximum with that sum and return 1 + max(height(left), height(right)).

\`\`\`python
def diameter(root):
    best = 0
    def height(node):
        nonlocal best
        if not node: return 0
        l, r = height(node.left), height(node.right)
        best = max(best, l + r)        # path bending at node
        return 1 + max(l, r)           # path going up through node
    height(root)
    return best
\`\`\`

**Maximum path sum** (LC 124): values can be negative and the path can start and end anywhere. Return the best **downward** chain starting at the node: node.val + max(0, left gain, right gain); a negative child chain is better dropped, hence the clamp at 0. The answer at the node is node.val + max(0, left) + max(0, right). Initialise the global answer to −∞ (an all-negative tree must still return its largest single node).

**Balanced** (LC 110): return the height, or −1 as soon as any subtree is unbalanced (|l − r| > 1), and propagate −1 upward. O(n), versus O(n²) if you call a separate height function at every node.

**Path Sum** (LC 112/113): pass the remaining sum **down** (pre-order) and check at leaves; for all paths, keep a path list with append/pop backtracking.

**Path Sum III** (LC 437): paths going downward from any node to any descendant. Use the prefix-sum trick along the current root-to-node path: a dictionary of prefix sums seen on the path; at each node add count[prefix − target]; increment the current prefix before recursing and decrement after (backtracking). O(n).

**Longest Univalue Path** (LC 687): return the longest downward chain of equal values; extend from a child only when its value equals the node's.

**Count Good Nodes** (LC 1448): pass the maximum so far down; a node is good if its value is at least that maximum.

**Lowest common ancestor**, **subtree of another tree** (LC 572: compare at each node, or serialise both and search with KMP for O(m + n)), **sum root to leaf numbers** (LC 129: pass value·10 + digit down), **binary tree tilt** (LC 563: return subtree sums, add |l − r| to a total).

## Tuples as return values

When the parent needs several facts, return them together.

- **House Robber III** (LC 337): (best if this node is robbed, best if not).
- **Largest BST Subtree** (LC 333) and **Maximum Sum BST in Binary Tree** (LC 1373): return (is BST, min, max, sum or size). A node forms a BST if both children are BSTs and left.max < node.val < right.min; use +∞/−∞ for empty subtrees so the comparisons work without special cases.
- **Binary Tree Cameras** (LC 968): a state code (0 uncovered, 1 covered, 2 camera).
- **Distribute Coins** (LC 979): return the subtree's excess coins; add |excess| of each child to the move count.

## Top-down versus bottom-up information

Information that flows **down** (depth, bounds, remaining sum, maximum so far) goes in the parameters. Information that flows **up** (heights, sums, bests) goes in the return value. Many problems use both: Validate BST passes (lo, hi) bounds down; Path Sum III passes the prefix dictionary down and returns counts up.

## Global variable or tuple?

A nonlocal best is the shortest code and perfectly acceptable. Returning (best so far, straight value) avoids shared state and is easier to test; some interviewers prefer it. Either way, say why the bending answer differs from the returned value.

## Iterative alternative

When the depth can reach 10⁵ (a skewed tree), recursion overflows. Do a post-order iteratively: collect nodes in pre-order (node, right, left order not needed — any order where parents come before children), then process the list in reverse, storing each node's result in a dictionary and reading the children's results from it.

## Complexity

Each node is visited once: O(n) time. Space O(h) for the recursion (h = height). Calling a helper that itself walks the subtree (like height) at every node makes it O(n²) on skewed trees: return everything you need in one pass instead.

## Interview angles

- Say the return value in words before writing code.
- For "path anywhere in the tree" problems, explain the bend-versus-straight distinction.
- Clamp negative gains at 0 and initialise maxima to −∞.

## Connections

This is tree DP in its simplest form. Rerooting extends it to answers for every root; binary lifting and LCA answer path queries between arbitrary pairs.
`,
    doubts: [
      ["Why does max path sum return only one branch?", "The returned value will be extended by the parent. A path that comes up from the parent can enter this node and continue down one child only; taking both would make the path fork, which is not a path."],
      ["Why clamp child gains at 0?", "A negative gain would only lower the sum; it is better to stop the path at this node. Clamping implements 'optionally take the branch'."],
      ["Global variable or return a tuple?", "Both are fine. A nonlocal/instance variable is shorter; returning (bestDown, bestAnywhere) is purer and easier to test. Say which you are doing."],
      ["How do I check 'balanced' in O(n)?", "Compute heights bottom-up and return a sentinel (−1) as soon as a subtree is unbalanced, short-circuiting further work."],
      ["How do I return several values cleanly in Java?", "Return a small array (int[] {height, best}) or a tiny record/class. Arrays are fastest to write in an interview; mention that a record is cleaner in production code."],
      ["Why does Path Sum III need the decrement after recursing?", "The dictionary must contain only prefix sums on the current root-to-node path. After finishing a subtree, its node is no longer on the path for its siblings, so its prefix must be removed; otherwise a sibling could match a prefix from a different branch, which is not a downward path."],
      ["Is the diameter always a path through the root?", "No. In a tree whose root has one long subtree with two deep branches, the longest path bends inside that subtree and never touches the root. That is why the best is tracked at every node."],
    ],
    revise: md`
? The recipe? :: Define the return value for a parent's use; compute from children; record the global answer separately.
? Diameter? :: Return height; record left + right at each node.
? Max path sum return vs record? :: Return node + max(0, best child); record node + max(0, L) + max(0, R).
? Balanced in O(n)? :: Return height or −1 for unbalanced.
? Count good nodes? :: Pass the max-so-far down.
? Distribute coins moves? :: Sum of |excess| over all edges, with excess = coins − nodes per subtree.
? Path Sum III (downward paths anywhere)? :: Prefix-sum counts along the root path, increment before recursing, decrement after.
? Largest BST Subtree return tuple? :: (is BST, min, max, size), with ±∞ for empty subtrees.
? Sum Root to Leaf Numbers? :: Pass value·10 + digit down; add at leaves.
? Subtree of Another Tree in O(m + n)? :: Serialise both with null markers and search with KMP.
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
## Level by level

Breadth-first search on a tree visits nodes in order of depth: the root, then its children, then its grandchildren. No visited set is needed (a tree has no cycles and each node has one parent). The key technique is processing **one level at a time**:

\`\`\`python
from collections import deque
def level_order(root):
    if not root: return []
    out, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):            # snapshot: exactly this level's nodes
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        out.append(level)
    return out
\`\`\`

The snapshot of the queue size at the start of each round is what separates levels: children appended during the round belong to the next level. Without it, you would need to store the depth with each node.

## Problems that are one line on top of this

- **Level Order** (LC 102) and **bottom-up** (LC 107: reverse the result).
- **Zigzag** (LC 103): reverse every other level, or fill each level from alternating ends of a deque.
- **Right Side View** (LC 199): the last node of each level. (A DFS that visits right before left and records the first node seen at each depth also works.)
- **Average of Levels** (LC 637), **Largest Value in Each Row** (LC 515), **Maximum Level Sum** (LC 1161).
- **Minimum Depth** (LC 111): return the depth of the first leaf BFS meets. BFS stops early; DFS must explore every path (and must not count a missing child as depth 0, the classic bug).
- **Cousins in Binary Tree** (LC 993): same level, different parents.
- **Even Odd Tree** (LC 1609), **Check Completeness** (LC 958: once a null appears in level order, no non-null node may follow).
- **Find Bottom Left Tree Value** (LC 513): the first node of the last level (or BFS right-to-left and take the last node).

## Width of a binary tree (LC 662)

Width of a level = the distance between its leftmost and rightmost non-null nodes, counting nulls in between. Index nodes as in a heap: root 0 (or 1), left child 2i, right child 2i + 1. Width = last index − first index + 1 per level.

Indices double per level, so a deep skewed tree produces indices up to 2^depth: overflow in 32/64-bit languages. Re-base each level by subtracting the level's first index before computing children (Python's big integers avoid overflow but get slow).

## Trees as graphs: Distance K (LC 863)

Find all nodes at distance K from a target. Distances go up as well as down, but tree nodes have no parent pointer. Build one: a DFS recording parent[node]. Then BFS from the target treating left, right and parent as neighbours, with a visited set (now cycles exist: child → parent → child), stopping at level K. O(n).

The same "add parent pointers and BFS" works for **Amount of Time for Binary Tree to Be Infected** (LC 2385) and **Closest Leaf in a Binary Tree** (LC 742).

## Vertical order (LC 314, LC 987)

BFS carrying (node, column): left child column − 1, right child column + 1. Group values by column, then output columns from min to max.

- LC 314: within a column, order by BFS (top to bottom, left to right).
- LC 987: nodes in the same row and column are sorted by value, so collect (column, row, value) and sort. O(n log n).

Track min and max column during BFS to avoid sorting the column keys.

## Connect next pointers (LC 116, 117)

Point each node's next to its right neighbour on the same level.

- With a queue: link nodes within each level snapshot. O(n) time, O(w) space.
- **O(1) space, perfect tree** (LC 116): walk the current level using next pointers already set, and wire the level below: node.left.next = node.right; node.right.next = node.next.left (if node.next exists).
- **O(1) space, any tree** (LC 117): walk the current level through next pointers while building the next level as a linked list with a dummy head and a tail pointer; then move to dummy.next.

## Serialisation and completeness

Level order with null markers is LeetCode's tree format. A tree is **complete** iff, in level order including nulls, no non-null node appears after the first null. **Count Complete Tree Nodes** (LC 222) does better than O(n): compare the leftmost and rightmost depths; if equal, the subtree is perfect (2^h − 1 nodes); otherwise recurse. O(log² n).

## Complexity

O(n) time. O(w) space where w is the maximum width: up to about n/2 for a complete tree's last level. DFS uses O(h) instead, which is better for wide, shallow trees and worse for deep, narrow ones.

## Interview angles

- Write the snapshot loop from memory; most level problems are one line on top of it.
- For "distance from a node" problems, add parent pointers and treat the tree as a graph.
- Mention index overflow in Width of Binary Tree.

## Connections

Tree BFS is graph BFS without a visited set; vertical order and views add a coordinate; next-pointer wiring is a linked-list technique applied per level.
`,
    doubts: [
      ["Why snapshot the queue size?", "Children appended during the level must not be processed in the same iteration. The size at the start is exactly the number of nodes on the current level."],
      ["BFS or DFS for right side view?", "Both work. BFS: last node per level. DFS: visit right before left and record the first node seen at each depth."],
      ["Why build parent pointers for distance K?", "A binary tree only links downward; distance-k nodes may be reached by going up first. Parent pointers turn it into an undirected graph where BFS works."],
      ["Why is Minimum Depth a common bug with DFS?", "For a node with only one child, min(depth(left), depth(right)) picks the missing child's depth 0, counting a non-leaf as a leaf. The fix: if one child is missing, take the other child's depth. BFS avoids the issue because it stops at the first real leaf."],
      ["Should I store the depth with each node instead of snapshotting the queue size?", "Both work. Storing (node, depth) pairs is useful when nodes of different depths mix (graphs, or when you need the depth for each node anyway). The snapshot loop is shorter when you process complete levels."],
      ["Does BFS on a tree need a visited set?", "Not when you only move from parents to children: each node is reached exactly once. As soon as you also move to parents (distance-K problems), you need one, because child → parent → child would loop."],
    ],
    revise: md`
? Per-level loop trick? :: Snapshot len(q) before processing the level.
? Right side view? :: Last node of each BFS level.
? Width of a level? :: Heap indices 2i, 2i+1; last − first + 1; re-base per level.
? Nodes at distance k? :: Parent pointers, then BFS from the target with visited.
? Connect next pointers in O(1) space? :: Traverse the current level via next pointers and wire the next level.
? Check completeness of a tree? :: Level order with nulls: no non-null after the first null.
? Count Complete Tree Nodes fast? :: Equal left/right depths ⇒ perfect (2^h − 1); else recurse: O(log² n).
? Bottom Left Tree Value? :: First node of the last level (or BFS right-to-left, last node).
? Burning tree (LC 2385)? :: Parent pointers + BFS from the start node.
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
## Rebuilding a tree from traversals

A single traversal does not determine a binary tree: many trees share the same in-order sequence. Two traversals do, if one of them is in-order and values are distinct, because the other one tells you the root and the in-order sequence tells you which values are left and right of it.

## From pre-order and in-order (LC 105)

The first value of the pre-order is the root. Its position m in the in-order splits the in-order into the left subtree (before m) and the right subtree (after m). The left subtree has m − inStart nodes, which also tells you where its pre-order segment ends. Recurse.

\`\`\`python
def build_tree(preorder, inorder):
    pos = {v: i for i, v in enumerate(inorder)}    # O(1) root lookup
    it = iter(preorder)                            # pre-order consumed left to right
    def build(lo, hi):                             # in-order range [lo, hi)
        if lo >= hi: return None
        val = next(it)
        node = TreeNode(val)
        node.left = build(lo, pos[val])            # build left first: pre-order is root, left, right
        node.right = build(pos[val] + 1, hi)
        return node
    return build(0, len(inorder))
\`\`\`

O(n) time with the hash map (O(n²) if you search the in-order linearly each time), O(n) space. The global iterator works because pre-order lists the root, then the whole left subtree, then the whole right subtree: building left before right consumes values in exactly that order.

Dry run: pre = [3, 9, 20, 15, 7], in = [9, 3, 15, 20, 7]. Root 3 (in-order index 1): left = [9], right = [15, 20, 7]. Next pre value 9 is the left leaf. Then 20 is the right root, with left 15 and right 7.

**Post-order + in-order** (LC 106): the **last** post-order value is the root; consume post-order from the end and build the **right** subtree first.

**Pre-order + post-order** (LC 889): ambiguous in general (a single child could be left or right). When every node has 0 or 2 children it is unique: the element after the root in pre-order is the left child's root; find it in post-order to size the left subtree.

## Serialise and deserialise (LC 297)

Turn a tree into a string and back. The simplest complete encoding: **pre-order with null markers**, e.g. "1,2,#,#,3,4,#,#,5,#,#". Deserialise by reading tokens in order with the same recursion: read a token; "#" means None; otherwise create the node, then build its left, then its right.

\`\`\`python
def serialize(root):
    out = []
    def go(n):
        if not n: out.append("#"); return
        out.append(str(n.val)); go(n.left); go(n.right)
    go(root)
    return ",".join(out)

def deserialize(data):
    it = iter(data.split(","))
    def go():
        v = next(it)
        if v == "#": return None
        n = TreeNode(int(v)); n.left = go(); n.right = go()
        return n
    return go()
\`\`\`

The null markers are what make a single traversal sufficient: they record the shape. Level order with nulls (LeetCode's format) works too, with a queue on both sides. Size: 2n + 1 tokens for n nodes (n + 1 nulls).

## BSTs need no null markers

A BST's shape is determined by its values and the insertion order, so its pre-order alone suffices (LC 449, Serialize and Deserialize BST). Rebuild with **bounds**: the next pre-order value belongs to the current subtree only if it lies in (lo, hi); otherwise return None and let an ancestor use it.

**Construct BST from Pre-order** (LC 1008) is exactly that, O(n). A monotonic stack gives the same O(n) iteratively: for each value, pop while the stack top is smaller (the last popped is the parent, attach as right child); otherwise attach as the left child of the top.

## Balanced BST from sorted data

**Sorted array** (LC 108): the middle element is the root; recurse on both halves. Height ⌈log₂(n + 1)⌉, O(n).

**Sorted linked list** (LC 109): finding the middle each time costs O(n log n). The O(n) way simulates an in-order traversal: count the nodes, then build(lo, hi) builds the left subtree of size (mid − lo) recursively, then takes the current list node as the root and advances the list pointer, then builds the right subtree. The list is consumed exactly in in-order, so each node is visited once.

**Balance a BST** (LC 1382): in-order to a sorted array, then build as above. O(n).

## Verify pre-order serialisation (LC 331)

Without building the tree: count **open slots**. Start with 1 slot (for the root). Each token fills one slot; a non-null token creates 2 new slots. The serialisation is valid iff the slot count never drops below 0 before the last token and is exactly 0 at the end. O(n) time, O(1) space.

## Other constructions

- **Maximum Binary Tree** (LC 654): the root is the maximum; recurse left and right. O(n) with a decreasing monotonic stack: each new value pops smaller ones (they become its left subtree) and attaches as the right child of the stack top.
- **Construct String from Binary Tree** (LC 606) and the reverse (LC 536): pre-order with parentheses; omit empty parentheses except for a missing left child when a right child exists.
- **Cartesian tree**: heap-ordered by value, in-order by index; built with the same stack in O(n). Its LCA answers range-minimum queries.
- **Unique BSTs II** (LC 95): generate every BST of 1..n by choosing each root and combining all left and right subtrees (Catalan many).
- **Clone a binary tree with random pointers** (LC 1485): a hash map old → new, like copying a linked list with random pointers.

## Interview angles

- Explain why two traversals (one of them in-order) are needed and why values must be distinct.
- Use a hash map for in-order positions and say why (O(n) versus O(n²)).
- For serialisation, say "pre-order with null markers" and its token count.

## Connections

Pre-order with nulls is the canonical tree encoding (subtree hashing, duplicate subtrees LC 652). Monotonic stacks build Cartesian and maximum trees. In-order consumption builds balanced trees from lists.
`,
    doubts: [
      ["Why do I need distinct values to rebuild from pre/in-order?", "With duplicates, the root's value can appear several times in the in-order sequence, so you cannot tell where the split is."],
      ["Why is a hash map needed for O(n)?", "Finding the root in the in-order array by scanning costs O(size) per node, O(n²) total on a skewed tree. The map makes each lookup O(1)."],
      ["Why does a BST serialise without null markers?", "Pre-order of a BST plus the BST property determines the structure: when reading, a value belongs in the left subtree while it is below the current bound."],
      ["How does the in-order build from a sorted list achieve O(n)?", "In-order position equals list order. Recursing on sizes (left half, root, right half) and consuming the list as you go creates nodes in exactly list order, so each list node is touched once."],
      ["Why must I build the left subtree before the right when consuming pre-order with an iterator?", "Pre-order lists the root, then every node of the left subtree, then every node of the right subtree. The iterator hands out values in that order, so the recursion must ask for the left subtree's values first. With post-order you consume from the end, so the right subtree comes first."],
      ["How do I handle duplicate values when rebuilding from pre-order and in-order?", "The problem becomes ambiguous: the same value could be the root at different in-order positions, giving different trees. LeetCode guarantees distinct values. With duplicates you need extra information (node ids or null markers)."],
      ["Is level order with nulls or pre-order with nulls better for serialisation?", "Both are linear and complete. Pre-order with recursion is shortest to write; level order produces LeetCode's familiar format and avoids recursion depth issues for very deep trees."],
    ],
    revise: md`
? Root in pre-order / post-order? :: First / last element.
? O(n) build from pre+in? :: Hash map value → in-order index; recurse on index ranges.
? Pre + post uniqueness? :: Only for full binary trees.
? Serialise with nulls? :: Pre-order with '#' markers; deserialise by consuming tokens.
? BST serialise compactly? :: Pre-order without nulls + value bounds.
? Sorted array → balanced BST? :: Middle as root, recurse.
? Verify pre-order serialisation? :: Slot counting: start 1, −1 per token, +2 per non-null; never negative, end 0.
? Pre + post unique when? :: Every node has 0 or 2 children (full binary tree).
? BST from pre-order iteratively? :: Monotonic stack: pop smaller (last popped is the parent, attach right) else attach left of the top.
? Balance a BST? :: In-order to a sorted array, then middle-root build.
? Find Duplicate Subtrees (LC 652)? :: Serialise each subtree (post-order with nulls) into a map of counts.
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
## The question

The **lowest common ancestor** of nodes p and q in a rooted tree is the deepest node that has both as descendants (a node counts as its own descendant). It is the point where the paths from the root to p and to q diverge. LCA answers distance queries (dist(u, v) = depth[u] + depth[v] − 2·depth[lca]), path queries, and "which manager is shared" style questions; it is also a building block for many tree algorithms.

## Recursive LCA in a binary tree (LC 236)

\`\`\`python
def lca(root, p, q):
    if root is None or root is p or root is q:
        return root
    left = lca(root.left, p, q)
    right = lca(root.right, p, q)
    if left and right: return root        # p and q are on different sides
    return left or right                  # both on one side (or none found)
\`\`\`

Meaning of the return value: "the LCA if both p and q are in this subtree; otherwise whichever of p or q is in it; otherwise None".

- If p is found in the left subtree and q in the right, the current node is where the paths split: it is the LCA.
- If a node **is** p, returning it immediately is correct even when q lies below p: p is then the LCA, and no other branch can contain q.

O(n) time, O(h) stack. The function assumes both p and q exist in the tree.

**If p or q may be absent** (LC 1644): returning early at p would hide whether q exists. Count how many of p and q were actually seen (do not return early; recurse fully and count), and return the result only if both were found.

**LCA of deepest leaves** (LC 1123, 865): return (depth, lca) from each subtree; if both children have equal depth, the current node is the LCA of the deepest leaves; otherwise pass up the deeper side's answer.

**LCA of many nodes** (LC 1676): the same recursion with "is root in the target set" instead of "is p or q".

## In a BST (LC 235)

Use the ordering: if both values are smaller than the node, the LCA is in the left subtree; if both are larger, in the right; otherwise (they straddle the node, or one equals it) the node is the LCA. Iterative, O(h) time, O(1) space.

## With parent pointers (LC 1650)

Like finding the intersection of two linked lists: walk a from p and b from q toward the root; when a reaches null, restart it at q, and vice versa. Both pointers travel depth(p) + depth(q) steps before meeting at the LCA. Or record p's ancestors in a set and walk up from q until you hit one. Or lift the deeper node by the depth difference and then move both up together.

## Many queries: binary lifting

For Q queries on a static tree, precompute up[k][v] = the 2^k-th ancestor of v:

- up[0][v] = parent[v] (the root's parent is the root itself, or −1 handled carefully);
- up[k][v] = up[k − 1][up[k − 1][v]] (two jumps of 2^(k−1)).

[[widget:binary-lifting]]

Query(u, v):

1. If depth[u] < depth[v], swap. Lift u by the difference d = depth[u] − depth[v], using the binary representation of d (for each set bit k, u = up[k][u]).
2. If u == v, return u (v was an ancestor of u).
3. For k from the highest down to 0: if up[k][u] ≠ up[k][v], set u = up[k][u], v = up[k][v]. This lifts both as high as possible while staying **below** the LCA.
4. Return parent(u) = up[0][u].

Preprocessing O(n log n) time and space; each query O(log n). **Kth Ancestor of a Tree Node** (LC 1483) uses only step 1.

\`\`\`python
LOG = max(1, n.bit_length())
up = [parent[:]] + [[0] * n for _ in range(LOG - 1)]   # parent[root] = root
for k in range(1, LOG):
    for v in range(n):
        up[k][v] = up[k - 1][up[k - 1][v]]
\`\`\`

Why step 3 compares ancestors instead of jumping when they are equal: jumping to a common ancestor might overshoot the lowest one; keeping u and v distinct guarantees they end as the two children of the LCA on their paths.

## Other LCA methods

- **Euler tour + RMQ**: record nodes in DFS order each time you enter or return to them (2n − 1 entries) with their depths. The LCA of u and v is the minimum-depth node between their first occurrences. With a sparse table, O(n log n) preprocessing and **O(1)** per query.
- **Tarjan's offline LCA**: answer all queries in one DFS with union-find: after finishing a child, union it into the parent; when visiting u, for each query (u, v) with v already visited, the answer is find(v)'s current ancestor. O((n + Q)·α).
- **Heavy-light decomposition** also gives O(log n) LCA and supports path queries with updates.

## Using the LCA

- **Distance between nodes**: depth[u] + depth[v] − 2·depth[lca] (with weighted edges, use the root-distance instead of depth).
- **Path sum or path maximum**: prefix values from the root (sum: pre[u] + pre[v] − 2·pre[lca] + val[lca]); maximum on a path: store the maximum along each 2^k jump in the lifting table.
- **Step-By-Step Directions From a Binary Tree Node to Another** (LC 2096): find root-to-node paths for both, strip their common prefix (that is the LCA), then output 'U' for the rest of the start path and the remaining directions of the destination path.
- **Is u on the path from a to b?** dist(a, u) + dist(u, b) == dist(a, b).

## Interview angles

- Explain the return value of the recursive solution, and the case where p is an ancestor of q.
- Use the BST property when the tree is a BST; interviewers check whether you notice.
- For many queries, describe binary lifting and its O(n log n) / O(log n) costs.

## Connections

LCA reduces path problems to two root paths; binary lifting is a form of doubling (like fast exponentiation); Euler tours connect LCA to range-minimum queries; union-find powers Tarjan's offline version.
`,
    doubts: [
      ["Why does returning the node when it equals p handle the case where p is an ancestor of q?", "If p is an ancestor of q, the recursion returns p as soon as it reaches it and never looks below. The other branch returns null, so p bubbles up as the answer, which is correct."],
      ["Why lift the deeper node first in binary lifting?", "LCA search by synchronous jumps only works when both are at the same depth; then the first ancestor at which they coincide is the LCA."],
      ["Why jump only when up[k][u] ≠ up[k][v]?", "Jumping to a common ancestor might overshoot the lowest one. Jumping only while the ancestors differ keeps u and v just below the LCA; the final answer is their parent."],
      ["Which LCA method should I write in an interview?", "The recursive one for a single query. Binary lifting if many queries or k-th ancestor queries come up. Mention Euler tour + sparse table for O(1) queries."],
      ["Why does lifting the deeper node first make the rest of binary lifting work?", "Once both nodes are at the same depth, their ancestors at any height are at the same depth too, so comparing up[k][u] and up[k][v] is meaningful: equal means \"at or above the LCA\", different means \"below it\". Without equal depths those comparisons would mix levels."],
      ["Can binary lifting handle a forest?", "Yes: give each root itself as its parent (or a sentinel), and check at the start whether u and v are in the same tree (same root, via a DSU or a root id from the DFS). Different trees have no LCA."],
      ["How much memory does binary lifting need for n = 10⁵?", "log₂(10⁵) ≈ 17 levels × 10⁵ entries ≈ 1.7 million integers: a few megabytes. In Python, use lists of lists or arrays of ints; in Java, int[17][n]."],
    ],
    revise: md`
? Recursive LCA rule? :: Return node if it is p/q or null; if both sides return non-null, node is the LCA; else pass up the non-null side.
? LCA in a BST? :: Go left if both smaller, right if both larger, else here.
? Parent pointers? :: Two-pointer walk-up with switching (like list intersection).
? Binary lifting table? :: up[k][v] = up[k−1][up[k−1][v]]; O(n log n).
? Binary lifting query steps? :: Equalise depths; jump both while ancestors differ (high k to low); answer = parent.
? Distance between u and v? :: depth[u] + depth[v] − 2·depth[lca].
? LCA when p or q may be missing? :: Recurse fully, count how many were found, return only if both.
? LCA of deepest leaves? :: Return (depth, lca); equal child depths ⇒ current node.
? Euler tour LCA query cost? :: O(1) with a sparse table over 2n − 1 depths.
? Step-by-step directions? :: Root paths to both nodes, drop the common prefix, 'U' × rest of start + rest of destination.
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

A binary search tree stores keys so that for **every** node, all keys in its left subtree are smaller and all keys in its right subtree are larger. The rule is about whole subtrees, not just children: a node's right child's left descendant must still be larger than the node. This single invariant gives three things at once: search by comparison (like binary search on a tree), sorted order by in-order traversal, and order queries (floor, ceiling, rank, range) in O(h).

Duplicates need a convention: forbid them, store a count in the node, or consistently send equal keys to one side (for example, left ≤ node < right). Whatever you choose, every operation must follow it.

## Search and insert

Start at the root; go left if the key is smaller, right if larger, stop when equal (found) or null (absent). Insert walks the same path and attaches a new leaf where the search fell off.

\`\`\`python
def insert(root, key):
    if root is None: return Node(key)
    if key < root.key: root.left = insert(root.left, key)
    elif key > root.key: root.right = insert(root.right, key)
    return root
\`\`\`

O(h) time. Iteratively, keep a parent pointer and attach the new node as its left or right child: O(1) extra space.

## Delete (LC 450): three cases

1. **Leaf**: remove it (return None to the parent).
2. **One child**: replace the node by that child.
3. **Two children**: replace the node's key with its **in-order successor** (the minimum of the right subtree: go right once, then left as far as possible), then delete the successor from the right subtree. The successor has no left child, so its deletion is case 1 or 2.

\`\`\`python
def delete(root, key):
    if not root: return None
    if key < root.key: root.left = delete(root.left, key)
    elif key > root.key: root.right = delete(root.right, key)
    else:
        if not root.left: return root.right
        if not root.right: return root.left
        s = root.right
        while s.left: s = s.left
        root.key = s.key
        root.right = delete(root.right, s.key)
    return root
\`\`\`

Why the successor: it is the smallest key larger than every key in the left subtree and smaller than every other key in the right subtree, so putting it in the node's place preserves the invariant. The in-order **predecessor** (maximum of the left subtree) works equally well. Always using the successor tends to skew trees after many deletions; real implementations alternate or rebalance.

## Floor, ceiling, rank and range

- **Floor(x)** (largest key ≤ x): walk down; when node.key ≤ x, record it and go right (a larger candidate may exist); otherwise go left. **Ceiling** mirrors it. O(h).
- **Successor of a node without parent pointers** (LC 285): walk from the root; whenever you go left, the current node is a candidate.
- **Rank(x)** (number of keys < x) and **select(k)** (the k-th smallest) need a **size** field in each node (an order-statistic tree): select goes left if k ≤ size(left), returns the node if k == size(left) + 1, otherwise goes right with k − size(left) − 1. O(h).
- **Range queries**: Range Sum of BST (LC 938) prunes subtrees outside [lo, hi]: if node.key < lo, only the right subtree can contribute. Cost O(h + number of keys in range).
- **Trim a BST** (LC 669): if the node is below lo, return the trimmed right subtree; above hi, the trimmed left; otherwise trim both children.
- **Closest value** (LC 270): walk down, tracking the closest key seen.

## Height is everything

Every operation costs O(h). If keys arrive in random order, the expected height is about 2.99·ln n ≈ 4.3·log₁₀ n (O(log n)). If they arrive **sorted**, each insert goes to the right of the previous one, and the tree is a linked list: h = n and every operation is O(n). That is why production ordered maps use **self-balancing** BSTs (AVL, red-black, B-trees) that guarantee O(log n).

Interview problems usually give you a BST of unspecified shape; state complexities as O(h) and add "O(log n) if balanced".

## Standard library ordered sets

| Language | Structure | Floor / ceiling | Range |
|---|---|---|---|
| Java | TreeMap / TreeSet (red-black) | floorKey, ceilingKey, lower, higher | subMap, headMap, tailMap |
| C++ | std::map / std::set (red-black) | lower_bound, upper_bound (then step back) | iterate between bounds |
| Python | none built in | sortedcontainers.SortedList: bisect_left, bisect_right | irange, islice |
| Go | none built in | | |

In Python interviews, say "I would use SortedList" or use bisect on a plain list when inserts are rare (insort is O(n)).

## Interview angles

- State the invariant precisely (whole subtrees) and the duplicate convention.
- Write delete with the three cases; explain why the successor keeps the order.
- Mention that a sorted insertion order degrades the tree to O(n) and how balanced trees fix it.

## Connections

In-order traversal gives sorted order (validation, k-th smallest, iterators). Balanced BSTs keep h = O(log n). Order-statistic trees, treaps and skip lists provide the same operations with different guarantees.
`,
    doubts: [
      ["Why the in-order successor for deleting a node with two children?", "It is the smallest key larger than the node, so putting it in the node's place keeps everything on the left smaller and everything on the right larger. It is also easy to remove: it has no left child."],
      ["How are duplicates handled?", "Pick a rule (e.g. equal keys go right) and use it consistently in insert, search and delete, or store a count in each node. Ordered multisets in libraries do the latter or allow equal keys on one side."],
      ["Is a random BST balanced enough?", "On average, yes (expected height O(log n)), but adversarial or sorted inputs destroy that. Libraries use self-balancing trees for guarantees."],
      ["Is deleting with the predecessor instead of the successor ever better?", "Correctness is the same. Always choosing one side gradually unbalances a tree under many deletions (Hibbard deletion makes random BSTs approach √n height). Alternating, choosing randomly, or using a balanced tree avoids that drift."],
      ["How do I insert into a BST iteratively without recursion?", "Walk down keeping the parent; when the next child pointer is null, attach the new node to the parent on the side the comparison chose. Handle the empty tree (the new node becomes the root) separately."],
      ["Why are BSTs rarely implemented from scratch in production?", "Plain BSTs degrade on sorted input, and balancing code (rotations, colour fixes) is subtle. Standard libraries provide well-tested balanced trees, and databases use B-trees tuned for disk pages."],
    ],
    revise: md`
? BST operation cost? :: O(h): O(log n) balanced, O(n) degenerate.
? Delete with two children? :: Copy the in-order successor (min of the right subtree) and delete it there.
? floor(x) walk? :: If key ≤ x record and go right, else go left.
? Sorted insertions produce? :: A linked list (h = n).
? Java floor/ceiling? :: TreeMap.floorKey / ceilingKey.
? Python ordered set? :: None built in: bisect on a list, or sortedcontainers.
? Successor without parent pointers? :: Walk from the root; every time you go left, the node is a candidate.
? Select(k) with sizes? :: k ≤ size(left) → left; k == size(left)+1 → node; else right with k − size(left) − 1.
? Trim a BST? :: Below lo → trimmed right; above hi → trimmed left; else trim both children.
? Expected height of a random BST? :: About 2.99·ln n.
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
## In-order is sorted order

An in-order traversal of a BST visits keys in increasing order. Many BST problems are therefore "array problems on the sorted sequence", solved during a traversal without building the array: compare each key with the previous one, count up to k, find adjacent differences, or walk two iterators towards each other. Keep a **prev** pointer (or value) across the traversal and you have the previous element of the sorted sequence at every step.

## Validate a BST (LC 98)

Checking only node.left.val < node.val < node.right.val is **wrong**: the tree 5 (left 1, right 6 with left child 3) passes every local check, yet 3 is in 5's right subtree. The invariant covers whole subtrees.

Two correct methods:

- **Bounds**: pass (lo, hi) down. The root has (−∞, +∞); going left sets hi = node.val; going right sets lo = node.val. Every node must satisfy lo < val < hi.
- **In-order**: the sequence must be strictly increasing; compare each value with prev.

\`\`\`python
def is_valid_bst(root):
    def ok(node, lo, hi):
        if not node: return True
        if not (lo < node.val < hi): return False
        return ok(node.left, lo, node.val) and ok(node.right, node.val, hi)
    return ok(root, float("-inf"), float("inf"))
\`\`\`

Use ±∞ (or None) as the initial bounds, not INT_MIN and INT_MAX: a node whose value equals the integer limit would wrongly fail.

## k-th smallest (LC 230)

In-order with a counter; stop when the counter reaches k. O(h + k) time with an iterative traversal (no need to finish the walk).

**Follow-up: frequent inserts and deletes with k-th queries.** Store subtree sizes in every node (an order-statistic tree), maintained on insert and delete. Then select(k) descends: if k ≤ size(left), go left; if k = size(left) + 1, it is this node; otherwise go right with k − size(left) − 1. O(h) per query. In Python, SortedList gives the same with an index.

## Recover a BST with two swapped nodes (LC 99)

Two keys were swapped by mistake; fix the tree without changing its shape. In the in-order sequence, a swap creates one or two **drops** (positions where prev > current):

- **Adjacent swap** (e.g. 1 3 2 4): one drop; swap its two elements.
- **Distant swap** (e.g. 1 5 3 4 2 6): two drops; the first misplaced node is the **larger** element of the first drop (5), and the second is the **smaller** element of the last drop (2).

Track first = prev at the first drop, and second = current at every drop (the last assignment wins). Swap their values at the end. O(n) time, O(h) space; with Morris traversal, O(1) space, which is the problem's follow-up.

## BST iterator (LC 173)

Implement next() and hasNext() over the in-order sequence without building it:

- Keep a stack holding the path of "pending" nodes: initialise by pushing the root and all its left descendants.
- next(): pop the top (the smallest remaining key); then push its right child and all of that child's left descendants. Return the popped key.
- hasNext(): the stack is non-empty.

Each node is pushed and popped once, so next() is **amortised O(1)**, with O(h) memory. A reverse iterator (push right spines) yields descending order.

## Two Sum IV on a BST (LC 653)

Is there a pair summing to k?

- Hash set during any traversal: O(n) time, O(n) space.
- **Two iterators**: an ascending one and a descending one, moved like two pointers on a sorted array: O(n) time, **O(h) space**. The elegant answer.
- Search for k − x in the BST for each x: O(n·h).

## Other in-order uses

- **Minimum Absolute Difference in BST** (LC 530/783): minimum difference between consecutive in-order values.
- **Find Mode in BST** (LC 501): equal values are consecutive in in-order; count runs, O(1) extra space besides the output.
- **Convert BST to Greater Sum Tree** (LC 538, 1038): reverse in-order (right, node, left) with a running sum.
- **Inorder Successor in BST** (LC 285): no traversal needed: walk from the root, recording a candidate whenever you go left.
- **Increasing Order Search Tree** (LC 897) and **BST to sorted doubly linked list** (LC 426): in-order with a prev pointer, relinking as you go (prev.right = node, node.left = prev).
- **Merge two BSTs** into a sorted list (LC 1305): two iterators merged like two sorted arrays.
- **Closest k values** (LC 272): two iterators from the split point (predecessors and successors), merged k times.

## Interview angles

- Lead with the bounds method for validation and the counterexample for the local check.
- Know the iterator stack by heart; it is reused in Two Sum IV, merging BSTs and closest-k.
- Mention Morris traversal for O(1) space follow-ups.

## Connections

Everything here is in-order traversal with a prev pointer or an explicit stack. Order-statistic trees and SortedList answer the "with updates" follow-ups.
`,
    doubts: [
      ["Why is checking each node against its children not enough?", "Example: root 5, left child 3, and 3's right child 6. Each parent-child pair looks fine, but 6 is in the left subtree of 5. You must enforce bounds inherited from all ancestors."],
      ["Recover BST: why first drop's larger and last drop's smaller?", "Swapping two values in a sorted sequence makes the bigger value appear too early (start of the first drop) and the smaller one too late (end of the last drop). If they were adjacent, there is a single drop containing both."],
      ["How does an order-statistic tree answer k-th in O(h)?", "At a node with left subtree size L: if k ≤ L go left; if k = L + 1 it is this node; else go right with k − L − 1."],
      ["Why do INT_MIN/INT_MAX bounds fail in Validate BST?", "If the tree contains a node whose value is exactly INT_MAX in a right subtree, the check val < hi with hi = INT_MAX fails although the tree is valid. Using null (no bound) or long ±∞ removes that edge case."],
      ["Is the iterative in-order with an early stop really O(h + k)?", "Yes: to reach the k-th smallest key the iterator first descends the left spine (h nodes) and then pops k nodes, each pop pushing at most a spine that will be popped only if needed. You never touch nodes after the k-th."],
      ["Can I validate a BST with duplicates allowed on one side?", "Yes, with bounds that include equality on the allowed side. For \"left ≤ node < right\", carry an inclusive upper bound into left subtrees (val ≤ hi) and an exclusive lower bound into right subtrees (val > lo). Prefer bounds over the in-order check here: an in-order sequence with equal neighbours cannot tell you which side the equal value came from."],
    ],
    revise: md`
? BST in-order property? :: Strictly increasing sequence.
? Validate correctly? :: Pass (lo, hi) bounds down, or check the in-order sequence.
? k-th smallest with frequent updates? :: Store subtree sizes; walk by size: O(h).
? Recover two swapped nodes? :: First drop's larger value and last drop's smaller value.
? BST iterator? :: Stack of the left spine; amortised O(1) next.
? Greater sum tree? :: Reverse in-order with a running sum.
? Recover BST: adjacent vs distant swap? :: One drop: swap its two elements; two drops: first's larger, last's smaller.
? Find Mode with O(1) extra space? :: Count runs of equal consecutive in-order values.
? Closest k values in a BST? :: Predecessor and successor iterators from the split point, merged k times.
? BST to sorted doubly linked list? :: In-order with prev: prev.right = node, node.left = prev; link the ends.
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
## Why balance

A BST's operations cost O(h), and an unlucky insertion order (sorted keys) makes h = n. **Self-balancing** BSTs restore a height bound of O(log n) after every insert and delete, using local restructurings called rotations. Every ordered map in a standard library is one of them, and database indexes use a disk-oriented relative (the B-tree). You rarely implement one in an interview, but you are expected to know how they work, what they guarantee, and when to reach for the library version.

## Rotations

A rotation changes the shape around one edge while preserving the in-order sequence:

- **Right rotation at y** (y with left child x): x becomes the subtree root, y becomes x's right child, and x's old right subtree (keys between x and y) becomes y's left subtree.
- **Left rotation** is the mirror image.

Before: y(x(A, B), C). After right rotation: x(A, y(B, C)). In-order A x B y C is unchanged, so the BST property holds; the height of A decreases by one level and C's increases by one. Three pointer changes, O(1). Every balancing scheme is a policy for when to rotate.

[[widget:avl-rotation]]

## AVL trees (Adelson-Velsky and Landis, 1962)

Invariant: for every node, the heights of the two subtrees differ by at most 1 (balance factor ∈ {−1, 0, +1}). Each node stores its height.

After an insert, walk back up; at the first node whose balance factor becomes ±2, one of four cases applies:

| Case | Shape | Fix |
|---|---|---|
| LL | heavy left, new key in the left child's left subtree | right rotation |
| RR | heavy right, in the right child's right subtree | left rotation |
| LR | heavy left, in the left child's right subtree | left rotation on the child, then right rotation |
| RL | heavy right, in the right child's left subtree | right rotation on the child, then left rotation |

One (single or double) rotation fixes an insertion. A deletion may need rotations at several ancestors (O(log n) of them).

Height bound: the sparsest AVL tree of height h has N(h) = N(h − 1) + N(h − 2) + 1 nodes (Fibonacci-like), so h ≤ about 1.44·log₂ n. AVL trees are more rigidly balanced than red-black trees: faster lookups, slightly more work on updates.

## Red-black trees (Bayer 1972; Guibas and Sedgewick 1978)

Each node is red or black, with these rules:

1. The root is black.
2. A red node has no red child.
3. Every path from a node down to a null leaf contains the same number of black nodes (the black-height).

Consequence: the longest root-to-leaf path (alternating red and black) is at most twice the shortest (all black), so h ≤ 2·log₂(n + 1).

Insertion adds a red node, then fixes "red parent" violations by **recolouring** (when the uncle is red, push the blackness down from the grandparent and continue upward) or by **one or two rotations** (when the uncle is black, which ends the fix). At most 2 rotations per insert and 3 per delete, plus O(log n) recolourings, which makes red-black trees cheaper to update than AVL trees. That is why Java's TreeMap, C++'s std::map, and the Linux kernel's scheduler and memory maps use them.

**Left-leaning red-black trees** (Sedgewick, 2008) are a simpler variant corresponding exactly to 2-3 trees; they are the version taught in Algorithms, 4th edition.

## B-trees and B+ trees (Bayer and McCreight, 1970)

A B-tree node holds many keys (often hundreds) and has one more child than keys; all leaves are at the same depth. Nodes split when they overflow and merge or borrow when they underflow. Because a node fills a disk page (4–16 KB), the height is tiny: with 500 children per node, 4 levels index 62 billion keys, so a lookup costs about 4 page reads.

A **B+ tree** keeps all records in the leaves, uses internal nodes only for routing, and links the leaves in a list so range scans are sequential reads. It is the standard index structure in relational databases (InnoDB, PostgreSQL) and file systems (NTFS, ext4 directories, Btrfs). Why not red-black trees on disk: each binary node would be a separate page read, making a lookup 30 reads for a billion keys instead of 4.

**LSM trees** (log-structured merge trees: LevelDB, RocksDB, Cassandra) are the write-optimised alternative: buffer writes in memory, flush sorted runs to disk, and merge them in the background.

## Other balanced structures

- **2-3 and 2-3-4 trees**: nodes with 2 to 4 children; red-black trees are their binary encoding.
- **Treaps**: a BST by key and a heap by random priority; expected O(log n), with simple split and merge.
- **Splay trees**: rotate each accessed node to the root; amortised O(log n), excellent locality for skewed access patterns.
- **Skip lists**: probabilistic layered linked lists with expected O(log n); Redis sorted sets.
- **Scapegoat trees**: rebuild a subtree when it gets too unbalanced; no per-node balance data.
- **Weight-balanced trees**: balance by subtree sizes; used in some functional languages' maps.

## Using ordered maps in interviews

Reach for an ordered map or set when you need **sorted order plus updates**:

- floor and ceiling queries ("the closest booked time before t", Contains Duplicate III LC 220, My Calendar I LC 729);
- sliding windows with order statistics or minimum and maximum under deletions (LC 1438, LC 480);
- interval maps that merge and split (Range Module LC 715, Data Stream as Disjoint Intervals LC 352);
- leaderboards and "k-th largest with updates".

Say "a balanced BST such as TreeMap gives O(log n) per operation"; in Python, use sortedcontainers.SortedList or SortedDict, or explain that you would.

## Interview angles

- Draw a rotation and show that the in-order sequence is unchanged.
- Give the height bounds (AVL ~1.44 log n, red-black ≤ 2 log n) and the trade-off (AVL faster reads, red-black cheaper writes).
- Explain why databases use B+ trees (page reads, range scans).

## Connections

Rotations also drive treaps and splay trees; B+ trees connect to system design (database indexes, LSM trees); order-statistic augmentation adds rank queries to any balanced tree.
`,
    doubts: [
      ["AVL or red-black: which is better?", "AVL is more strictly balanced (faster lookups); red-black does fewer rotations on updates (faster inserts and deletes). Libraries choose red-black for general-purpose maps because updates are common."],
      ["Why do databases use B-trees instead of red-black trees?", "Disk and SSD reads come in pages of kilobytes. A B-tree node fills a page with hundreds of keys, so a lookup touches only a few pages. A binary tree would need about log₂ n ≈ 30 page reads for a billion keys."],
      ["What does a rotation actually preserve?", "The in-order sequence (so the BST property) and the subtrees' contents. Only three pointers change, plus height or colour bookkeeping."],
      ["Python has no TreeMap. What do I do in an interview?", "Say so. Options: bisect.insort into a list (O(n) insert, often acceptable), a heap when only min/max is needed, or sortedcontainers.SortedList (not standard library, but widely accepted)."],
      ["How many rotations can a single AVL deletion need?", "Up to O(log n): after fixing one unbalanced node, its subtree may become shorter, unbalancing an ancestor, and the effect can propagate to the root. Insertions need at most one single or double rotation."],
      ["What is a left-leaning red-black tree?", "A red-black tree where red links may only lean left. It is a one-to-one encoding of 2-3 trees, and its insert code fits in a dozen lines (rotate left, rotate right, flip colours), which is why it is taught as the practical version."],
      ["Are hash maps always faster than balanced trees?", "For exact-key lookups, usually (expected O(1) versus O(log n) with pointer chasing). But hash maps cannot answer floor, ceiling, range or order queries, have worst cases under adversarial keys, and need rehashing. Choose by the operations you need."],
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
? Rotation preserves what? :: The in-order sequence (BST order); changes heights locally.
? AVL vs red-black trade-off? :: AVL: stricter balance, faster lookups; red-black: fewer rotations on updates.
? Why B+ trees on disk? :: Hundreds of keys per page ⇒ ~4 page reads per lookup; linked leaves for range scans.
? LSM tree idea? :: Buffer writes in memory, flush sorted runs, merge in the background.
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

A **trie** (prefix tree, from "retrieval") stores a set of strings by sharing their prefixes. Each node represents the prefix spelled by the path from the root; each edge is labelled with one character; a flag marks nodes where a complete word ends. "car", "cart" and "care" share the path c → a → r, which then branches into t and e, with the end flag set on r, t and e.

Two consequences drive every application:

- The cost of an operation depends on the **length of the word** (L), not on how many words are stored.
- All words with a given prefix sit in one subtree, so prefix questions ("does any word start with…", "list all words with…") are natural.

[[widget:trie]]

## Operations (LC 208)

\`\`\`python
class TrieNode:
    __slots__ = ("children", "end", "count")
    def __init__(self):
        self.children = {}      # or [None] * 26
        self.end = False
        self.count = 0          # words passing through (optional)

class Trie:
    def __init__(self): self.root = TrieNode()
    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
            node.count += 1
        node.end = True
    def _walk(self, s):
        node = self.root
        for ch in s:
            node = node.children.get(ch)
            if node is None: return None
        return node
    def search(self, word):
        node = self._walk(word); return node is not None and node.end
    def startsWith(self, prefix):
        return self._walk(prefix) is not None
\`\`\`

insert, search and startsWith are each O(L). **Delete**: walk to the word's end node, clear the end flag (and decrement counts on the way); then, on the way back up, remove nodes that have no children and no end flag. With counts, a node whose count drops to 0 can be removed immediately.

## Node representation

| Representation | Child lookup | Memory per node | When |
|---|---|---|---|
| array of 26 (or 128) pointers | O(1), fastest | 26 pointers even if one is used | small fixed alphabet, speed matters |
| hash map | O(1) expected | proportional to the number of children | large or unknown alphabets (Unicode), sparse tries |
| sorted list / binary search | O(log σ) | compact | memory-critical, static tries |
| ternary search tree | O(log σ) per character | three pointers per node | compromise between the two |

Total memory is O(total characters stored × node size) in the worst case; shared prefixes make it smaller.

## Storing extra data on nodes

- **count** (words passing through the node): "how many words start with this prefix?" in O(L) (LC 1804), and safe deletion.
- **end count** (words ending here): duplicates.
- **the word itself** at its end node: avoids rebuilding strings during DFS (Word Search II).
- **value sums**: Map Sum Pairs (LC 677) stores the sum of values below each node, adjusting by the difference when a key is updated.
- **top-k suggestions** per node: autocomplete in O(L) per keystroke at the cost of memory and update time.
- **minimum index or maximum length**: queries like "longest word with all prefixes present" (LC 720).

## Applications

- **Autocomplete and search suggestions** (LC 1268, LC 642): walk to the prefix, then DFS (or read precomputed top-k).
- **Spell checking and replace words** (LC 648): for each word, walk the trie and stop at the first end flag (the shortest root).
- **Wildcard search** (LC 211, Add and Search Word): '.' branches into every child: worst case O(26^L) but fast in practice.
- **Longest common prefix** (LC 14): insert all words and walk down while a node has exactly one child and is not an end.
- **Word games**: Boggle and Word Search II prune paths by prefix.
- **IP routing**: longest-prefix match on binary tries of address bits (radix trees in routers).
- **Counting distinct substrings**: insert all suffixes (O(n²) nodes); suffix automata do it in O(n).
- **XOR problems**: binary tries over bits (see the bit-trie page).

## Trie vs hash set

| Question | Hash set | Trie |
|---|---|---|
| is the whole word present? | O(L) to hash | O(L) |
| does any word start with p? | must scan everything (or store all prefixes) | O(|p|) |
| list words with prefix p in sorted order | no | DFS of one subtree |
| memory | each word stored separately | shared prefixes |
| cache behaviour | good | pointer chasing |

Use a hash set for pure membership; use a trie when prefixes, ordering or incremental character-by-character search matter.

## Compressed tries

A **radix tree** (Patricia trie) merges chains of single-child nodes into one edge labelled with a string, so the number of nodes is at most 2 × (number of words). It saves memory and pointer hops; Linux's routing tables and many key-value stores use variants.

## Interview angles

- Implement the three operations cleanly; mention arrays vs maps for children.
- Say the complexity in L, independent of the number of words.
- Expect follow-ups: delete, count prefixes, wildcard search.

## Connections

Trie-powered searches (Word Search II, streams), Aho–Corasick (trie plus failure links), binary tries for XOR, and suffix structures all extend this idea.
`,
    doubts: [
      ["Is a trie always better than a hash set for strings?", "No. For exact lookup only, a hash set is simpler and often uses less memory. A trie wins when you need prefix queries, ordered iteration, or wildcard and longest-prefix matching."],
      ["Why store counts on nodes?", "To answer 'how many words start with this prefix' in O(prefix length) and to support deletion (a node can be freed when its count drops to zero)."],
      ["What is a radix tree?", "A trie where chains of single-child nodes are compressed into one edge labelled with a substring. Same operations, far fewer nodes. Used in IP routing tables and HTTP routers."],
      ["How much memory does an array-based trie use for 10⁵ words of length 10?", "Up to 10⁶ nodes in the worst case (no shared prefixes), each with 26 pointers: 26 million pointers, about 200 MB on a 64-bit JVM. Shared prefixes usually cut this a lot, but for large inputs prefer map-based children or a compressed trie."],
      ["Should search and startsWith share code?", "Yes: one helper walks to the node for a string and returns it or null; search additionally checks the end flag. Fewer places for bugs."],
      ["How do I list all words in a trie in sorted order?", "DFS from the root, visiting children in alphabetical order (natural with arrays; sort keys with maps), building the current string with append/pop, and emitting it at every end-flagged node."],
    ],
    revise: md`
? Trie insert/search cost? :: O(L), word length, independent of the number of words.
? search vs startsWith? :: search also requires the end-of-word flag.
? Count words with a prefix? :: Pass-through counter per node.
? Array vs map children? :: Array: fast, memory heavy; map: compact, slower.
? Radix tree? :: Compressed trie (single-child chains merged).
? Trie vs hash set? :: Trie when prefixes, ordering or wildcards matter.
? Map Sum Pairs update? :: Add the difference (new − old value) along the key's path.
? Longest common prefix via a trie? :: Walk while the node has exactly one child and is not an end.
? Ternary search tree? :: Three pointers per node (less, equal, greater): between array and map tries.
? Radix tree node bound? :: At most 2 × number of words (single-child chains merged).
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
## Why a trie speeds up searches

When you must check many candidate strings against a dictionary **character by character** (walking a board, reading a stream, building words), a hash set only helps once a whole candidate is formed. A trie lets you test every **prefix** as you extend it and abandon the search the moment no dictionary word starts that way. That early abandonment is the entire speed-up.

## Word Search II (LC 212)

Find every dictionary word that can be traced on a letter grid (adjacent cells, no reuse within a word).

Running Word Search I once per word costs O(W · R·C · 3^L). With a trie, run one DFS from each cell and move down the trie in step with the board: a cell is entered only if the trie has a child for its letter, so every path that is not a prefix of some word dies immediately.

\`\`\`python
def find_words(board, words):
    root = {}
    for w in words:
        node = root
        for ch in w: node = node.setdefault(ch, {})
        node["$"] = w                          # store the word at its end
    R, C, out = len(board), len(board[0]), []
    def dfs(r, c, parent):
        ch = board[r][c]
        node = parent[ch]
        if "$" in node: out.append(node.pop("$"))     # found; pop to avoid duplicates
        board[r][c] = "#"
        for nr, nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
            if 0 <= nr < R and 0 <= nc < C and board[nr][nc] in node:
                dfs(nr, nc, node)
        board[r][c] = ch
        if not node: parent.pop(ch)            # prune an exhausted branch
    for r in range(R):
        for c in range(C):
            if board[r][c] in root: dfs(r, c, root)
    return out
\`\`\`

Three details matter:

- **Store the word at its end node** so you do not carry a string through the DFS.
- **Remove a word once found** (pop it), so it is reported once even if traceable several ways.
- **Prune exhausted branches**: when a trie node has no children and no word left, delete it from its parent. Later searches stop even earlier. On large boards with many found words this is a several-fold speed-up, and it is what turns time-limit failures into passes.

Complexity: O(R·C · 3^L) in the worst case, where L is the longest word, but in practice proportional to the number of board paths that are prefixes of dictionary words.

## Stream of characters (LC 1032)

After each new character, report whether some word is a suffix of the stream so far. Insert every word **reversed** into a trie, keep the last maxLen characters of the stream, and on each query walk the trie from the newest character backwards. The walk stops at the first missing child or succeeds at an end flag. O(maxLen) per query.

The general solution for many patterns over a text or stream is **Aho–Corasick**: a trie of the patterns plus failure links (like KMP's prefix function generalised to a trie), giving O(n + total pattern length + matches) for the whole stream.

## Palindrome Pairs (LC 336)

Find all pairs (i, j) such that words[i] + words[j] is a palindrome. For a word w split into prefix + suffix:

- if the prefix is a palindrome, then reverse(suffix) + w is a palindrome (put reverse(suffix) in front);
- if the suffix is a palindrome, then w + reverse(prefix) is a palindrome.

So for every split of every word, look up reversed pieces in a hash map of words: O(n · L²). A trie of reversed words can precompute, at each node, the list of words whose remaining part is a palindrome, bringing it closer to O(n · L). Handle the empty string and avoid pairing a word with itself.

## Search suggestions (LC 1268)

After each typed character, return up to three products with that prefix, lexicographically smallest.

- **Sort + binary search**: sort the products; for each prefix, binary search the first product ≥ prefix and take up to three that still start with it. O(n log n + L log n). Short and fast.
- **Trie**: store at each node the (up to) three smallest words passing through it, filled while inserting sorted products. Then each keystroke is O(1) after walking one step. The trie approach scales better when the prefix is typed incrementally against a huge catalogue.

**Design Search Autocomplete System** (LC 642) stores sentence counts; each node keeps candidates ranked by (−count, sentence), updated on each new sentence.

## Concatenated words (LC 472)

Find words that are formed by concatenating at least two shorter words in the list. Sort by length; for each word, run Word Break against a trie (or set) of the shorter words already inserted, requiring at least two pieces; then insert the word. Word Break with a trie walks forward from each valid start index and marks reachable ends, stopping when the trie has no child.

## Word Squares and other trie-guided backtracking

**Word Squares** (LC 425): build squares row by row; the next row must start with the prefix formed by the current column. A trie with, at each node, the list of words having that prefix answers "which words start with this prefix" instantly.

## Interview angles

- Explain why the trie beats repeated single-word searches: shared prefixes and early abandonment.
- Mention the three Word Search II details (store word, remove when found, prune).
- For streams, say "reversed trie" and name Aho–Corasick as the general tool.

## Connections

These are trie basics plus DFS, backtracking or word-break DP. Aho–Corasick extends the trie with KMP-style failure links; suffix automata handle substring questions on one long text.
`,
    doubts: [
      ["Why is pruning leaves in Word Search II important?", "Once a word is found, its trie path may still attract DFS exploration on the board. Removing empty branches cuts those paths, which matters on large boards with many found words."],
      ["Why reverse the words for the stream problem?", "A query asks whether some word ends at the newest character. Reading the recent characters backwards and matching reversed words checks all suffixes in one trie walk."],
      ["Why store the word at its end node in Word Search II instead of building the path string?", "Building and copying a string at each step costs O(L) per step and creates garbage. Storing the word once at insertion time means the DFS only carries a node pointer, and a found word is read in O(1)."],
      ["Is Aho–Corasick needed for LC 1032?", "No: with words up to length 200, walking a reversed trie from the newest character is O(200) per query and fast enough. Aho–Corasick gives O(1) amortised per character and matters when patterns are long or many."],
      ["In Palindrome Pairs, how do I avoid counting a word with itself?", "When the looked-up reversed piece maps to the same index i, skip it. Also handle the empty string: it pairs with every palindrome in both orders, which the split rules produce naturally if splits at both ends are considered once."],
    ],
    revise: md`
? Word Search II core idea? :: One DFS over the board guided by a trie of all words.
? Avoid duplicate results? :: Clear the word at its end node after recording it.
? Stream of characters? :: Trie of reversed words; walk back from the newest letter.
? Palindrome pairs split check? :: prefix palindrome + reverse(suffix) in the dictionary (and the mirror case).
? Search suggestions simplest? :: Sort + binary search on the prefix.
? Palindrome Pairs core rule? :: Split w = prefix + suffix; palindromic prefix → reverse(suffix) in front; palindromic suffix → reverse(prefix) after.
? Word Squares lookup? :: Trie nodes store words with that prefix.
? Autocomplete System ranking? :: Candidates per node by (−count, sentence).
? Concatenated Words order? :: Sort by length; word-break each against shorter words, then insert it.
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
## A trie over bits

Treat every integer as a fixed-length binary string, most significant bit first (31 bits for values below 2³¹, 20 bits for values below 10⁶), and insert it into a trie where every node has at most two children: bit 0 and bit 1. The trie then answers questions about **XOR** efficiently, because XOR is decided bit by bit and the high bits dominate the value.

## Maximum XOR of two numbers (LC 421)

For each number x, we want the y in the set that maximises x XOR y. Walk the trie from the top bit: at each level, prefer the child whose bit is the **opposite** of x's bit (that makes this bit of the XOR equal to 1); if it does not exist, take the same bit (this XOR bit is 0).

\`\`\`python
def find_maximum_xor(nums, B=31):
    root = {}
    best = 0
    for x in nums:
        node = root                                # insert x
        for b in range(B - 1, -1, -1):
            node = node.setdefault((x >> b) & 1, {})
        node, cur = root, 0                        # query best partner for x
        for b in range(B - 1, -1, -1):
            bit = (x >> b) & 1
            if (1 - bit) in node:
                cur |= 1 << b; node = node[1 - bit]
            else:
                node = node[bit]
        best = max(best, cur)
    return best
\`\`\`

Inserting before querying lets x pair with itself (XOR 0), which is harmless. O(n · B) time and memory (each number adds up to B nodes).

## Why greedy from the top bit is correct

A 1 in bit b is worth 2^b, which is more than all lower bits combined (2^b − 1). So any choice that makes the top differing bit 1 beats every choice that makes it 0, regardless of what happens below. Choosing the opposite branch whenever possible, from the most significant bit down, is therefore optimal. This is also why the bits must be inserted from the most significant end: the trie's first decision must be the most valuable one.

## How many bits?

Enough to cover the largest value: B = max(nums).bit_length() (at least 1). Fewer levels make the trie smaller and faster. Every number must use the same B with leading zeros so that bit positions align.

## Maximum XOR with an element from an array, with limits (LC 1707)

Queries (x, m): maximise x XOR y over y ≤ m.

- **Offline**: sort the numbers and the queries by m; insert numbers as long as they are ≤ the current m, then answer the query with the normal greedy (−1 if the trie is empty). O((n + q) · B + sorting).
- **Online**: store at each node the minimum value in its subtree; during the greedy walk, refuse a branch whose minimum exceeds m.

## Counting pairs with XOR in [low, high] (LC 1803)

count(< K) for a bound K: for each number x, walk the trie along K's bits. At bit b, if K's bit is 1, all numbers in the child where x XOR y has bit 0 give XOR < K at this point: add that child's count, then continue into the child where the XOR bit is 1. If K's bit is 0, continue into the child where the XOR bit is 0. Each node stores how many numbers pass through it. The answer is count(< high + 1) − count(< low), accumulating while inserting numbers one by one so each pair is counted once. O(n · B).

## Maximum XOR subarray

Prefix XORs P[0] = 0, P[i] = a[0] ^ … ^ a[i − 1]; the XOR of a[i..j − 1] is P[j] ^ P[i]. So the maximum subarray XOR is the maximum pair XOR among the prefix values: insert P[0] first, then for each prefix query the best partner and insert it. O(n · B). With a length or position constraint, add a sliding window with deletions (counts on nodes) to the trie.

## Related: XOR basis for subsets

"Maximum XOR of **any subset**" is a different problem: it needs a linear basis over GF(2) (Gaussian elimination on bits), which keeps at most B independent vectors and answers by greedily XORing basis elements from the top bit. The trie handles pairs; the basis handles arbitrary subsets.

## Other uses

- **Minimum XOR pair**: sort the numbers; the minimum XOR is between adjacent values. No trie needed.
- **Maximum Genetic Difference Query** (LC 1938): DFS over a tree, inserting a node's value on entry and removing it on exit (counts on trie nodes), answering queries for the current root path.
- **Count pairs with XOR equal to k**: a hash map is simpler (look up x ^ k).
- **Binary tries in networking**: longest-prefix match for IP routing walks bits from the top, the same structure.

## Interview angles

- Explain the "top bit dominates" argument; it is the proof of correctness.
- State the size: n · B nodes, B = bit length of the maximum.
- For queries with limits, offer the offline sort and the online subtree-minimum version.

## Connections

Bit tries are ordinary tries over a two-letter alphabet. XOR tricks, prefix XORs and linear bases are the neighbouring tools for XOR problems.
`,
    doubts: [
      ["Why must I insert from the most significant bit?", "The greedy decision is made from the bit that matters most. Inserting from the top makes the trie path order match that decision order."],
      ["How many bits do I need?", "Enough for the largest value: 31 for non-negative 32-bit ints, or floor(log₂ max) + 1 to save time."],
      ["Why does the pair-count version insert numbers one at a time while querying?", "Querying each number against only the numbers inserted before it counts each unordered pair exactly once and never pairs a number with itself. Inserting everything first would count pairs twice and include self-pairs."],
      ["Is a hash-set-based approach possible for Maximum XOR?", "Yes: build the answer bit by bit from the top; at each step, put all prefixes of length b into a set and check whether (answer with this bit set) XOR prefix is in the set for some prefix. O(n · B) as well, with less memory than a trie but more hashing."],
      ["How do I handle negative numbers?", "Fix a width (for example 32 bits) and use the two's-complement bit pattern, or offset all values to be non-negative. The greedy then maximises the XOR of the bit patterns; interpret the result with the same convention."],
    ],
    revise: md`
? Max XOR partner walk? :: From the top bit, prefer the opposite bit when the child exists.
? Why greedy works? :: 2ᵏ > sum of all lower bits.
? Queries with a value limit? :: Sort offline, insert numbers ≤ limit; or keep subtree minima.
? Maximum XOR subarray? :: Prefix XORs in a trie.
? Complexity? :: O(n · B), B = number of bits.
? Minimum XOR pair? :: Sort; the answer is between adjacent values.
? Online limit queries in a bit trie? :: Store the subtree minimum; skip branches whose minimum exceeds m.
? Max XOR of any subset? :: Linear basis over GF(2), not a trie.
? Deletion support in a bit trie? :: Counts on nodes; decrement on removal (LC 1938 with DFS enter/exit).
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
## What a heap is

A **binary heap** is a complete binary tree (every level full except possibly the last, which fills from the left) with the **heap property**: every parent is ≤ its children (min-heap) or ≥ them (max-heap). It is the standard implementation of a **priority queue**: O(1) to read the minimum, O(log n) to insert or remove it. It is not sorted: only the root is guaranteed to be the extreme, and siblings have no order.

## Array layout

Because the tree is complete, it fits in an array with no pointers. With 0-based indices:

- children of i: 2i + 1 and 2i + 2;
- parent of i: (i − 1) // 2;
- the last internal node: n // 2 − 1.

(1-based layouts use 2i, 2i + 1 and i // 2.) The array is compact and cache-friendly, which is a big reason heaps are fast in practice.

[[widget:heap]]

## Operations

- **push**: append at the end (the next free leaf), then **sift up**: while the new element is smaller than its parent, swap them. O(log n) (the height).
- **pop** (remove the root): move the last element to the root, shrink the array, then **sift down**: swap with the **smaller** child while that child is smaller. Choosing the smaller child keeps the heap property between the two children. O(log n).
- **peek**: the root, O(1).
- **search** for an arbitrary value or remove from the middle: O(n) to find it (no order to exploit), then sift up or down from that position.

\`\`\`python
def sift_down(a, i, n):
    while True:
        l, r, m = 2 * i + 1, 2 * i + 2, i
        if l < n and a[l] < a[m]: m = l
        if r < n and a[r] < a[m]: m = r
        if m == i: return
        a[i], a[m] = a[m], a[i]; i = m

def heapify(a):
    for i in range(len(a) // 2 - 1, -1, -1):
        sift_down(a, i, len(a))
\`\`\`

## Why heapify is O(n)

Building a heap by pushing n elements one at a time costs O(n log n). Floyd's **bottom-up heapify** (1964) sifts down every internal node from the last one to the root, and costs O(n).

The reason: sift-down cost is bounded by a node's **height**, and most nodes are near the bottom. About n/2 nodes are leaves (height 0, no work), n/4 have height 1, n/8 have height 2, and so on. Total work ≤ Σ (n / 2^(h+1)) · h = n · Σ h / 2^(h+1) = n · 1 = O(n). Sift-up from the bottom would be the wrong direction: the many bottom nodes would each travel the full height.

## Heap sort

Heapify into a **max-heap** (O(n)); then repeatedly swap the root (the maximum) with the last element of the heap region, shrink the region by one, and sift the new root down (O(log n) each). The sorted array grows from the end. Total O(n log n) worst case, **in place** (O(1) extra), **not stable**, and slower than quicksort in practice because of scattered memory access. Introsort uses it as a fallback when quicksort's recursion gets too deep, which is what guarantees std::sort's O(n log n) worst case.

## Language APIs

| Language | API | Notes |
|---|---|---|
| Python | heapq on a list: heappush, heappop, heapify, heappushpop, heapreplace, nsmallest, nlargest | min-heap only; for a max-heap push −x or (−priority, item) |
| Java | PriorityQueue&lt;T&gt; (min by default) | max-heap: new PriorityQueue&lt;&gt;(Collections.reverseOrder()); remove(Object) is O(n) |
| C++ | std::priority_queue&lt;T&gt; (**max** by default) | min-heap: priority_queue&lt;T, vector&lt;T&gt;, greater&lt;T&gt;&gt;; make_heap/push_heap/pop_heap on vectors |
| Go | container/heap (implement the interface) | |

Gotchas:

- **Tuples compare element by element** in Python: (priority, item) works, but if priorities tie and items are not comparable (nodes, dicts), Python raises an error. Add a tie-breaker counter: (priority, counter, item).
- **Java comparators**: (a, b) -> a − b overflows for large values of opposite sign and corrupts the order; use Integer.compare(a, b) or Comparator.comparingInt.
- **Mutating an element in the heap** without re-sifting silently breaks the heap property.

## Decrease-key

Standard library heaps do not support changing a priority in place (they cannot find the element). Two remedies:

- **Lazy deletion**: push the element again with its new priority and skip outdated copies when they are popped (compare with the current best value). This is the usual way to write Dijkstra.
- **Indexed heap**: keep pos[element] → index in the array, updated on every swap, so you can sift from the element's position after changing its key. O(log n) decrease-key, heap size bounded by the number of elements.

## d-ary heaps

Each node has d children (index children d·i + 1 … d·i + d). The height drops to log_d n, so sift-up (and decrease-key) is faster, while sift-down compares d children per level. For workloads with many decrease-keys (Dijkstra on dense graphs), d = 4 or 8 is often faster than binary, and 4-ary heaps fit cache lines well. Fibonacci and pairing heaps give O(1) amortised decrease-key in theory but have poor constants.

## Interview angles

- Write sift-down and heapify from memory; explain why heapify is O(n).
- Know your language's heap API and its default (Python min, C++ max).
- Mention lazy deletion versus an indexed heap for priority updates.

## Connections

Top-k selection, k-way merging, running medians, schedulers, Dijkstra, Prim and Huffman coding all sit on top of a heap.
`,
    doubts: [
      ["Why is heapify O(n) but n pushes O(n log n)?", "Sifting down costs the node's height, and most nodes have small height. Sifting up costs the node's depth, and most nodes are deep. The sum of heights is O(n); the sum of depths is O(n log n)."],
      ["Is a heap sorted?", "No. Only parent ≤ child holds. Siblings and cousins are in no particular order; iterating the array does not give sorted output."],
      ["How do I make a max-heap in Python?", "Push negated keys (−x) and negate on pop, or push (−priority, counter, item) tuples."],
      ["Why can (a, b) -> a - b break a Java comparator?", "For large values of opposite signs, a − b overflows int and flips the sign of the result. Integer.compare(a, b) is always correct."],
      ["Why does pop move the last element to the root instead of promoting a child?", "Promoting children would leave a hole that travels down and could break completeness (the hole ends somewhere in the middle of the last level). Moving the last element keeps the tree complete, and one sift-down restores the order."],
      ["How do I remove an arbitrary element from a heap?", "Find its index (O(n), or O(1) with an index map), swap it with the last element, shrink the array, then sift the moved element up or down, whichever direction is needed. With lazy deletion, just mark it and skip it when popped."],
      ["Is heapq.heappushpop different from a push followed by a pop?", "Yes: heappushpop(h, x) returns x immediately if x is smaller than the current root (no heap change), otherwise replaces the root and sifts down. It is faster and is the idiom for maintaining a size-k heap."],
    ],
    revise: md`
? Children and parent of index i (0-based)? :: 2i+1, 2i+2; parent (i−1)/2.
? push / pop cost? :: O(log n) each (sift up / sift down).
? Heapify cost and why? :: O(n): sum of node heights is linear.
? Heap sort properties? :: O(n log n) worst case, O(1) space, not stable.
? C++ priority_queue default? :: Max-heap.
? Python max-heap? :: Negate keys.
? Decrease-key without support? :: Lazy deletion (push new, skip stale) or an indexed PQ.
? Heapify sum argument? :: Σ (n / 2^(h+1)) · h = O(n): most nodes have small height.
? Heap sort properties? :: O(n log n) worst, in place, not stable, poor cache locality.
? Python tie-breaking in heaps? :: (priority, counter, item) so items are never compared.
? d-ary heap trade-off? :: Shallower (faster sift-up/decrease-key) but d comparisons per sift-down level.
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

To find the k largest of n elements (or of a stream), keep a **min-heap of size k**. For each element, push it; if the heap grows beyond k, pop the minimum. The heap always holds the k largest seen so far, and its root is the **k-th largest**.

It sounds backwards: why a min-heap for the largest? Because the element you must evict when a better one arrives is the smallest of the current top k, and a min-heap gives you exactly that in O(log k).

\`\`\`python
import heapq
def kth_largest(nums, k):
    h = []
    for x in nums:
        if len(h) < k: heapq.heappush(h, x)
        elif x > h[0]: heapq.heapreplace(h, x)      # pop the min and push x in one step
    return h[0]
\`\`\`

O(n log k) time and O(k) space, and it works on **streams** (Kth Largest Element in a Stream, LC 703: keep the heap between calls). Symmetrically, the k smallest use a max-heap of size k.

## Alternatives

| Method | Time | Space | Notes |
|---|---|---|---|
| sort and slice | O(n log n) | O(n) or in place | simplest; fine when n is small |
| size-k heap | O(n log k) | O(k) | streaming; best when k ≪ n |
| heapify all, pop k | O(n + k log n) | O(n) | good when k is close to n |
| quickselect | O(n) expected, O(n²) worst | O(1) extra | in place, reorders the array; random pivot |
| median of medians | O(n) worst | O(log n) | theoretical guarantee, large constant |
| bucket / counting | O(n + range) | O(range) | small integer keys or frequencies |

In interviews, give the heap first (robust, simple, streaming), then mention quickselect as the expected-linear in-place option.

## Patterns

- **Kth Largest Element in an Array** (LC 215): heap or quickselect.
- **K Closest Points to Origin** (LC 973): a **max**-heap of size k keyed by squared distance (no square roots needed); evict the farthest.
- **Top K Frequent Elements** (LC 347): count with a hash map, then a size-k min-heap over (count, value); or **bucket sort** by frequency: bucket[f] holds the values with frequency f, scanned from high to low: O(n).
- **Top K Frequent Words** (LC 692): ordering is (higher count first, then lexicographically smaller). In a size-k min-heap the root must be the **worst** candidate: the lowest count, and among equal counts the lexicographically **largest** word. In Python that needs a wrapper class with a custom __lt__, or use nsmallest over (−count, word).
- **Find K Pairs with Smallest Sums** (LC 373): start with (a[i] + b[0], i, 0) for i < k; pop the smallest and push (i, j + 1). O(k log k).
- **Kth Smallest Element in a Sorted Matrix** (LC 378): k-way merge of rows, or binary search on the value.
- **Reorganize String** (LC 767) and **Task Scheduler**: max-heaps by count.
- **Sort Characters by Frequency** (LC 451), **K Closest Elements in a sorted array** (LC 658: binary search the window start instead of a heap).

## K-way merge

Merge k sorted lists (or arrays, or files) with a min-heap holding the current head of each: pop the smallest, append it, push the next element from the same list. The heap never holds more than k entries, so merging N total elements costs O(N log k).

- **Merge k Sorted Lists** (LC 23); store (value, list index, node) so ties never compare nodes.
- **Smallest Range Covering Elements from K Lists** (LC 632): keep one element from each list in the heap and track the current maximum; the range is [heap min, current max]; pop the min and advance its list; stop when any list is exhausted.
- **External sorting**: sort chunks that fit in memory, write them as runs, then k-way merge the runs: how databases and big-data systems sort data larger than RAM.
- **Ugly Number II** (LC 264) and **Super Ugly Number** (LC 313): merge k multiplied sequences (pointers or a heap), skipping duplicates.

Divide-and-conquer merging (merge pairs of lists in rounds) also gives O(N log k) without a heap.

## Interview angles

- Explain why a min-heap keeps the k largest.
- Compare heap, quickselect and bucket approaches with their complexities.
- Get the tie-breaking right for word frequencies; it is a common trap.

## Connections

Heaps underpin top-k and merging; quickselect is partitioning; bucket sort uses counting. Streaming top-k at scale uses count-min sketches plus a heap (heavy hitters).
`,
    doubts: [
      ["Why a min-heap for the k largest?", "You keep the best k seen so far and need to know which of them to evict when a better element arrives: the smallest of the k. A min-heap gives it in O(1) and removes it in O(log k)."],
      ["Quickselect or heap in an interview?", "Heap is simpler and safe (O(n log k) worst case). Quickselect is faster on average and in place; mention randomised pivots to avoid the O(n²) worst case, and introselect / median-of-medians for a guarantee."],
      ["Top K Frequent in O(n)?", "Counts are at most n, so bucket indices 0..n hold elements by frequency; walk buckets from high to low until you have k."],
      ["When should I pick heapify-all-then-pop-k over a size-k heap?", "When k is a large fraction of n (say n/2) and the data is already in memory: heapify is O(n) and k pops are O(k log n), comparable to or better than n pushes into a size-k heap. For streams or small k, the size-k heap wins and uses less memory."],
      ["Can top-k be done exactly on a huge distributed stream?", "Exactly requires counting every distinct key (too much memory for huge cardinalities). In practice systems use approximate heavy-hitter algorithms: count-min sketch with a small heap, Misra–Gries or space-saving counters, accepting small errors for bounded memory."],
      ["Why does K Closest Points avoid square roots?", "Squared distance preserves order (√ is monotone on non-negative numbers), so comparing x² + y² gives the same ranking, avoids floating point, and is faster."],
    ],
    revise: md`
? k largest with a heap? :: Min-heap of size k; root = k-th largest. O(n log k).
? Quickselect average / worst? :: O(n) / O(n²) (randomise the pivot).
? Top K Frequent in O(n)? :: Count, bucket by frequency, read from the top.
? K closest points? :: Max-heap of size k by squared distance.
? K-way merge cost? :: O(N log k) with a heap of heads.
? K pairs with smallest sums? :: Seed (i, 0); on pop push (i, j + 1).
? Top K Frequent Words heap root? :: The worst candidate: lowest count, ties → lexicographically largest word.
? K Pairs with Smallest Sums seeding? :: (a[i] + b[0], i, 0) for i < k; pop and push (i, j+1).
? Smallest Range Covering K Lists? :: Heap of one element per list + current max; advance the min's list.
? External sort? :: Sort memory-sized runs, then k-way merge them.
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
## The idea

Two heaps facing each other keep the **boundary** between the smaller and larger halves of a dynamic set at your fingertips: a **max-heap** holds the lower half (its top is the largest of the small values) and a **min-heap** holds the upper half (its top is the smallest of the large values). The two tops sit on either side of the median, so the median is available in O(1), and inserting keeps everything in O(log n).

## Median of a data stream (LC 295)

Invariants:

1. every value in lo (max-heap) ≤ every value in hi (min-heap);
2. sizes balanced: len(lo) == len(hi) or len(lo) == len(hi) + 1.

\`\`\`python
import heapq
class MedianFinder:
    def __init__(self):
        self.lo, self.hi = [], []          # lo is a max-heap via negation
    def addNum(self, x):
        heapq.heappush(self.lo, -x)                         # 1. into lo
        heapq.heappush(self.hi, -heapq.heappop(self.lo))    # 2. move lo's max to hi
        if len(self.hi) > len(self.lo):                     # 3. rebalance sizes
            heapq.heappush(self.lo, -heapq.heappop(self.hi))
    def findMedian(self):
        if len(self.lo) > len(self.hi): return -self.lo[0]
        return (-self.lo[0] + self.hi[0]) / 2
\`\`\`

Why push into lo and then move lo's maximum to hi: x might belong to either half. Passing it through lo and handing lo's largest to hi guarantees that hi receives the right element (either x or something larger than x in lo), preserving invariant 1 without comparing x to the tops. Step 3 then fixes the sizes. Three heap operations per insert: O(log n); median O(1).

Dry run: add 5 → lo [5]; add 2 → lo [2], hi [5], median 3.5; add 8 → lo [5, 2], hi [8], median 5.

## Follow-ups interviewers ask

- **All values in [0, 100]**: a count array of 101 buckets; the median is found by scanning counts: O(100) per query, O(1) per insert.
- **99% of values in [0, 100]**: count array for the range plus two counters (or small heaps) for the outliers below and above; the median almost always lies inside the range.
- **Sliding window median** (LC 480): values must also leave the window. Use the two heaps with **lazy deletion**: keep a dictionary of "to delete" counts and a separate logical size for each heap; when a value leaves, increment its delete count and adjust the logical size of the heap it belongs to (decide by comparing with lo's top); whenever a heap's top is marked deleted, pop it. Rebalance by logical sizes. O(n log k). Or use an ordered multiset (SortedList): insert, remove and index the middle in O(log k), which is simpler to get right.
- **Percentiles other than the median** (for example the 90th percentile): size the heaps in a 9 : 1 ratio instead of 1 : 1.
- **Very large streams**: approximate quantile sketches (t-digest, KLL) give percentiles in bounded memory; monitoring systems use them for latency percentiles.

## Two pools with a threshold: IPO (LC 502)

You have capital w and may complete at most k projects; each needs capital c_i and adds profit p_i. Greedy: at each step, among the affordable projects, take the most profitable.

- Sort projects by capital (or keep a min-heap by capital): the "locked" pool.
- A max-heap by profit: the "unlocked" pool.
- Each round, move every project with c_i ≤ w from locked to unlocked, then pop the best profit and add it to w. Stop if the unlocked pool is empty.

O(n log n). The two structures are keyed differently because they answer different questions: the locked pool answers "which projects just became affordable?" (by capital) and the unlocked pool answers "which affordable project is best?" (by profit).

Same pattern ("sort by one key, heap by another"):

- **Maximum Performance of a Team** (LC 1383): sort engineers by efficiency descending; each engineer in turn is the minimum efficiency; keep the k largest speeds in a min-heap with their sum.
- **Minimum Cost to Hire K Workers** (LC 857): sort by wage/quality ratio; the current worker sets the ratio; keep the k smallest qualities in a max-heap with their sum; cost = ratio × sum.
- **Maximum Subsequence Score** (LC 2542): sort by the multiplier descending, keep the k largest of the other array.
- **Course Schedule III**, **Minimum Number of Refuelling Stops**: greedy with a heap of choices made so far.

## Why two heaps and not one sorted structure

A balanced BST or SortedList also gives the median in O(log n) and supports deletions directly, plus any order statistic. Two heaps are simpler, use arrays, have smaller constants, and are available in every standard library, but they only expose the two middle elements and need lazy deletion for removals. Pick heaps for insert-only streams, and an ordered multiset when elements leave or other ranks are queried.

## Interview angles

- State the two invariants (order across heaps, sizes) and the push-through-lo trick.
- Expect the follow-ups: bounded ranges, sliding windows, other percentiles.
- For IPO-type problems, explain why the two pools are keyed differently.

## Connections

Two heaps are a special case of maintaining a split point in a dynamic set; ordered multisets, order-statistic trees and quantile sketches generalise it.
`,
    doubts: [
      ["Why push into lo first and then move its max to hi?", "It routes the new element to the correct side automatically: if it was large, it travels through lo's top into hi. Then a single size check restores the balance."],
      ["How do I handle deletion for sliding median?", "Record the outgoing value in a 'pending deletion' map and adjust the size counter of the heap it belongs to. Whenever a heap's top is pending, pop it. Rebalance using the live sizes."],
      ["Why do IPO-style problems sort by one key and heap by another?", "The threshold (capital, deadline, ratio) decides which items become available, which only grows over time when sorted. Among available items, the heap picks the best by the objective."],
      ["Why is the median the top of lo when the count is odd?", "The balancing rule keeps lo one element larger in that case, so lo holds the smaller (n + 1)/2 values and its maximum is exactly the middle element."],
      ["In sliding window median, how do I know which heap a leaving value is in?", "Compare it with lo's current (valid) top: if it is ≤ that top it belongs to lo, otherwise to hi. Equal values can sit in either heap, but since they are interchangeable for the median, decrementing the logical size of lo is consistent."],
      ["Could a single heap find the median?", "Not efficiently: a min-heap gives only the smallest element, so the median would need popping n/2 elements per query. Two heaps keep the middle at the tops."],
    ],
    revise: md`
? Two-heap invariants? :: max(lo) ≤ min(hi); |lo| = |hi| or |lo| = |hi| + 1.
? Insert routine? :: Push to lo, move lo.top to hi, rebalance if hi is larger.
? Median? :: lo.top, or the average of the tops.
? Values in [0, 100]? :: Counting array.
? Sliding median deletion? :: Lazy deletion map + live-size counters.
? IPO pattern? :: Sort by threshold; max-heap of unlocked values; pick k times.
? Max performance of a team? :: Sort by efficiency desc; min-heap of the k largest speeds.
? Two-heap invariants? :: max(lo) ≤ min(hi); len(lo) == len(hi) or len(hi)+1.
? 90th percentile with two heaps? :: Keep sizes in a 9:1 ratio.
? Minimum Cost to Hire K Workers? :: Sort by wage/quality; max-heap of k smallest qualities; cost = ratio × sum.
? Streaming percentiles at scale? :: Quantile sketches (t-digest, KLL).
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
## Heaps as event schedulers

Scheduling problems simulate time: meetings start and end, tasks arrive and run, servers free up. At every moment you need "the next thing to happen" (the earliest end time, the soonest free server) or "the best available choice" (the shortest task, the longest course so far). A min-heap keyed by time gives the next event in O(log n); a second heap keyed by priority gives the best choice. Most problems here are two-heap or heap-plus-sort simulations.

## Meeting Rooms II (LC 253)

Minimum number of rooms so that no two overlapping meetings share one.

Sort meetings by start. Keep a min-heap of end times of meetings currently occupying rooms. For each meeting: if the earliest end ≤ its start, that room is free: pop it (reuse). Push the meeting's end. The heap's maximum size is the answer (equivalently, its size at the end, since we never pop more than we reuse).

\`\`\`python
import heapq
def min_meeting_rooms(intervals):
    intervals.sort()
    ends = []
    for s, e in intervals:
        if ends and ends[0] <= s: heapq.heapreplace(ends, e)
        else: heapq.heappush(ends, e)
    return len(ends)
\`\`\`

Ties: a meeting ending at 10 frees its room for one starting at 10 (half-open intervals), hence ≤. **Sweep alternative**: sort all starts and all ends separately; walk the starts, and for each start advance the end pointer past every end ≤ it; the number of rooms in use is (starts processed − ends passed); the maximum is the answer. Or +1/−1 events sorted with ends before starts at equal times. All O(n log n).

**Car Pooling** (LC 1094) is the capacity version (difference array over positions if they are small). **Meeting Rooms III** (LC 2402) asks which room hosts the most meetings, with delays: free rooms in a min-heap by room number, busy rooms in a min-heap by (end time, room); when no room is free, the meeting waits for the earliest-ending room and its end shifts by the delay.

## Simulation with two heaps

**Single-Threaded CPU** (LC 1834): tasks arrive at enqueue times; when idle, the CPU picks the available task with the shortest processing time (ties by index).

- Sort tasks by enqueue time (keep indices).
- A heap of available tasks keyed by (processing time, index).
- Loop: add every task with enqueue time ≤ current time to the heap; if the heap is empty, **jump time forward** to the next enqueue time; otherwise pop, record the index, and advance time by its processing time.

Jumping avoids simulating idle time unit by unit (times can be 10⁹).

**Process Tasks Using Servers** (LC 1882): free servers keyed by (weight, index); busy servers keyed by (free time, weight, index). At each task's arrival, move servers whose free time ≤ now from busy to free; if none is free, jump to the earliest busy server's free time.

**Furthest Building You Can Reach** (LC 1642): use ladders on the largest climbs. Push each climb into a min-heap; when the heap exceeds the number of ladders, pop the smallest climb and pay for it with bricks; stop when bricks go negative.

**Seat Reservation Manager** (LC 1845), **Exam Room** (LC 855, an ordered set of occupied seats, choosing the largest gap) are reservation variants.

## Task Scheduler (LC 621)

Tasks labelled by letters, each taking one unit; the same letter must be separated by at least n units; minimise total time (idle allowed).

**Formula**: let maxCount be the highest frequency and m the number of letters with that frequency. The most frequent letters force (maxCount − 1) full frames of length n + 1, plus a final partial frame of m tasks:

answer = max(len(tasks), (maxCount − 1) · (n + 1) + m).

Why: the frames are the minimum skeleton imposed by the most frequent letters; all other tasks fit into the idle slots of the frames. If there are more tasks than slots, there is no idle time at all and the answer is simply the number of tasks.

**Heap simulation** (generalises to returning an actual order, and to Reorganize String / Rearrange String k Distance Apart, LC 358): each round of n + 1 slots, pop up to n + 1 most frequent letters from a max-heap, place them, decrement, and push back the non-zero ones (after the round, so a letter is not reused within its cooldown).

## Greedy scheduling with deadlines

**Course Schedule III** (LC 630): courses have durations and deadlines; take as many as possible. Sort by deadline. Take each course (add its duration to a running time and push the duration into a max-heap). If the running time exceeds the current deadline, drop the **longest** course taken so far (pop the max-heap). Exchange argument: replacing a longer course with a shorter one never reduces the count and leaves more time for later courses.

**Minimum Number of Refuelling Stops** (LC 871): drive as far as possible; record the fuel of every station passed in a max-heap; when you cannot reach the next station (or the target), refuel retroactively from the largest station passed. Each refuel is a pop. If the heap is empty when stuck, it is impossible.

**Maximum Number of Events That Can Be Attended** (LC 1353): day by day, add events starting today to a min-heap of end days, drop expired ones, attend the one ending soonest.

**Scheduling with deadlines and profits** (job sequencing): sort by profit descending and place each job in the latest free slot before its deadline (DSU makes finding that slot near O(1)).

## Interview angles

- Say what each heap is keyed by and why.
- Jump time forward when idle; never simulate unit by unit.
- For Task Scheduler, give the formula with its frame argument, and the heap simulation as the general method.

## Connections

Sweep lines and difference arrays solve the counting versions; interval scheduling covers the "select maximum non-overlapping" questions; operating-system and cloud schedulers use the same heap machinery.
`,
    doubts: [
      ["At equal times, do ends come before starts in Meeting Rooms II?", "If a meeting ends at 10 and another starts at 10, they can share a room under the usual convention. Popping when end ≤ start (or ordering end events first in a sweep) implements that."],
      ["Why does the Task Scheduler formula work?", "The most frequent task forces maxCount − 1 full cycles of length n + 1 followed by a final partial cycle containing every task with maximal frequency. If there are more tasks than idle slots, no idling is needed and the answer is just the task count."],
      ["Why jump time forward?", "Time values can be huge (10⁹). Advancing one unit at a time is far too slow; when nothing is ready, the next interesting moment is the next enqueue or free time."],
      ["Why does Course Schedule III drop the longest course rather than the current one?", "After the overflow, removing any one course restores feasibility for the current prefix, and removing the longest frees the most time for future courses while keeping the same count. Removing a shorter course would leave less slack and can only hurt later."],
      ["How do I return the actual order of tasks in Task Scheduler?", "Use the heap simulation: in each frame, pop the most frequent available letters (up to n + 1), append them, decrement, and only push them back after the frame. Fill missing slots with \"idle\" unless no tasks remain."],
      ["Is Meeting Rooms II's heap size at the end really the maximum?", "Yes: in this formulation a pop happens only together with a push (reusing a room), so the heap never shrinks. Its final size equals the largest number of rooms in use at once."],
    ],
    revise: md`
? Meeting Rooms II heap? :: Min-heap of end times; reuse if earliest end ≤ start; answer = max heap size.
? Equivalent sweep? :: +1 at start, −1 at end, ends first at ties; max running sum.
? CPU / servers pattern? :: Heap of available (by priority) + heap of busy (by free time).
? When idle? :: Jump time to the next event.
? Task Scheduler formula? :: max(n_tasks, (maxCount − 1)(n + 1) + t).
? Course Schedule III? :: Sort by deadline; max-heap of durations; drop the longest when over.
? Furthest building? :: Min-heap of ladder climbs; overflow paid in bricks.
? Furthest Building with ladders? :: Min-heap of climbs; when it exceeds ladders, pay the smallest with bricks.
? Meeting Rooms III heaps? :: Free rooms by index; busy rooms by (end, index); delay when none free.
? Job sequencing with deadlines? :: Sort by profit, place each job in the latest free slot (DSU).
? Maximum Events Attended? :: Each day: add starting events, drop expired, attend the earliest-ending.
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
## The problem: changing priorities

Standard heaps support push, pop and peek. Many algorithms also need to **change** an element's priority (Dijkstra's decrease-key, a scheduler bumping a task, a leaderboard updating a score) or **remove** an arbitrary element (a cancelled order, a value leaving a sliding window). A plain heap cannot do either efficiently, because it does not know where an element is stored. There are three standard ways around this.

## Lazy deletion

Do not touch the heap when an element changes or is removed. Instead:

- **Change**: push a new entry with the new priority. The old entry becomes **stale**.
- **Remove**: record the removal (a counter of pending deletions per value, or a "current version" per key).
- **On pop or peek**: while the top is stale, discard it.

How to detect staleness:

- Compare with the authoritative value: in Dijkstra, an entry (d, u) is stale if d > dist[u].
- Version numbers: store (priority, version, key) and keep current_version[key]; an entry is stale if its version is outdated.
- Pending-deletion counts: for values (sliding-window median), delete_count[x] > 0 means the next copy of x at the top should be dropped (decrement the count).

\`\`\`python
import heapq
class LazyHeap:
    def __init__(self): self.h, self.dead, self.size = [], {}, 0
    def push(self, x): heapq.heappush(self.h, x); self.size += 1
    def remove(self, x): self.dead[x] = self.dead.get(x, 0) + 1; self.size -= 1
    def _clean(self):
        while self.h and self.dead.get(self.h[0], 0):
            self.dead[self.h[0]] -= 1; heapq.heappop(self.h)
    def top(self): self._clean(); return self.h[0]
    def pop(self): self._clean(); self.size -= 1; return heapq.heappop(self.h)
\`\`\`

Costs: each push and each discarded entry is O(log N), where N counts stale entries too, so the heap holds O(total pushes) entries. Track the **logical size** separately from len(heap). When stale entries dominate, rebuild the heap from the live ones (O(live)). Lazy deletion is simple, uses standard heaps, and is the default in interviews.

## Indexed priority queue

Keep, alongside the heap array, an index map pos[key] → the key's position in the array, updated on every swap. Then:

- **decrease-key / increase-key**: change the priority at pos[key] and sift up or down: O(log n).
- **delete(key)**: swap the element at pos[key] with the last element, shrink, and sift the moved element: O(log n).
- **contains(key)**: O(1).

The heap never holds stale entries, so its size stays at most the number of keys (V in Dijkstra, instead of E with lazy deletion). Sedgewick's IndexMinPQ is the textbook version. More code and more chances for index-maintenance bugs; worth it when memory matters or priorities change very often.

## Ordered set as a priority queue

A balanced BST of (priority, key) pairs (Java TreeSet, C++ std::set, Python SortedList):

- minimum and maximum: O(log n) (or O(1) via first/last);
- change priority: erase (old priority, key), insert (new priority, key): O(log n);
- remove any element: O(log n);
- also iterate in order and answer rank queries.

Prim's and Dijkstra's algorithms are often written this way in C++ (erase then insert). Use it when you need both ends (min and max), arbitrary removals, or ordered iteration.

## Which to choose

| Need | Choice |
|---|---|
| interview Dijkstra, Prim, simple updates | lazy deletion |
| many priority changes, memory-bounded heap | indexed heap |
| min and max together, arbitrary removals, ordered iteration | ordered set |
| sliding-window medians or extremes | lazy-deletion heaps, ordered multiset, or monotonic deque (extremes only) |

## Problems where this matters

- **Sliding Window Median** (LC 480): two lazy heaps or a SortedList.
- **Stock Price Fluctuation** (LC 2034): latest price per timestamp in a map; max and min heaps of (price, timestamp) with staleness checked against the map.
- **Design a Number Container System** (LC 2349), **Design a Food Rating System** (LC 2353): per-group heaps with lazy deletion against a current-value map.
- **The Skyline Problem** (LC 218): remove buildings when their right edge passes: lazy deletion by end coordinate.
- **Dijkstra and Prim**: lazy deletion with the dist or visited check.
- **Task schedulers with priority boosts**: indexed heaps.

## Interview angles

- Name the staleness test explicitly (compare with dist, version, or delete count).
- Track logical size separately when using lazy deletion.
- Mention the indexed heap and the ordered set as alternatives with their trade-offs.

## Connections

Lazy deletion appears in Dijkstra, sliding windows and design questions; indexed heaps are the textbook decrease-key; ordered sets double as priority queues with extra power.
`,
    doubts: [
      ["Doesn't lazy deletion make the heap grow without bound?", "It grows by one entry per update. In Dijkstra that is O(E) entries, which is fine. If updates vastly outnumber live elements, rebuild the heap occasionally or switch to an indexed PQ."],
      ["How do I know an entry is stale?", "Store enough to compare: for Dijkstra, the distance in the entry versus dist[u]; for keyed items, a version number per key, or a map from key to its current priority."],
      ["Can lazy deletion break the heap's ordering guarantees?", "No: stale entries are ordinary heap entries, so the heap property holds. They only cost space and pops. Correctness depends on skipping them reliably whenever you read the top."],
      ["Why must the index map be updated on every swap in an indexed heap?", "Sift-up and sift-down move elements by swapping; if pos is not updated for both swapped keys, a later decrease-key will sift from the wrong position and corrupt the heap. Wrap swapping in one helper that updates the array and pos together."],
      ["Is a Fibonacci heap ever the right answer in an interview?", "Only as a named fact: it gives O(1) amortised decrease-key and O(E + V log V) Dijkstra in theory, but its constants are large and nobody implements it in interviews. Lazy deletion is the practical answer."],
    ],
    revise: md`
? Lazy deletion check in Dijkstra? :: if d > dist[u]: continue.
? Indexed PQ extra structure? :: Position map key → heap index, updated on swaps.
? Decrease-key cost? :: O(log n) in an indexed PQ.
? Simplest updatable PQ in Java/C++? :: TreeSet / std::set of (priority, id).
? Staleness tests? :: Compare with the authoritative value, a version number, or a pending-delete count.
? Stock Price Fluctuation design? :: Map timestamp→price; max/min heaps validated against the map.
? Indexed heap memory in Dijkstra? :: O(V) entries instead of O(E) with lazy deletion.
? When to rebuild a lazy heap? :: When stale entries dominate: heapify the live ones.
`,
    pitfalls: ["Forgetting to update the position map on swaps", "Not skipping stale entries"],
    quiz: [Q("In lazy Dijkstra, a popped (d, u) with d > dist[u] means…", ["a bug", "*a stale entry: skip it", "a negative cycle", "u is unreachable"], "A shorter distance was already recorded.")],
    sources: [S.book("Algorithms, 4th ed. §2.4 (IndexMinPQ)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/24pq/IndexMinPQ.java.html"), S.article("Priority queue (decrease-key and implementations)", "Wikipedia", "https://en.wikipedia.org/wiki/Priority_queue")],
    problems: [2034, 1845, 2349, 2353],
  },
};
