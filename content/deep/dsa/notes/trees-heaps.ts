/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */
export const notes: Record<string, string> = {
  "tree-traversals": `
## Orders
Pre-order: node, left, right (copy a tree, serialise, prefix expressions).
In-order: left, node, right (sorted order in a BST).
Post-order: left, right, node (delete or free a tree, compute heights and subtree answers).
Level order: BFS by depth with a queue.
## Iterative versions
Pre-order: stack; pop, visit, push right then left.
In-order: go left pushing nodes; pop, visit, move to the right child; repeat.
Post-order: reversed "node, right, left" pre-order with two stacks, or one stack plus a last-visited pointer.
Iteration avoids recursion limits on skewed trees (depth n).
## Morris traversal (O(1) space)
For cur with a left child: find its in-order predecessor (rightmost of the left subtree).
Predecessor.right null → thread it to cur, go left. Thread exists → remove it, visit cur, go right.
No left child → visit, go right. Every edge is walked at most about 3 times → O(n). The tree is restored.
## Reconstruction
Pre-order + in-order, or post-order + in-order, give a unique tree (distinct values).
Pre + post alone are ambiguous unless the tree is full (LC 889).
Pre-order with null markers alone is enough (serialisation).
## Special traversals
Vertical order: BFS with column index; sort by (column, row, value) for LC 987.
Diagonal, boundary (left edge + leaves + reversed right edge) and zigzag (alternate the direction per level).
## Complexity
Every traversal is O(n) time; space is O(h) for DFS (h = height: log n balanced, n skewed) and O(width) for BFS.
`,
  "tree-dfs-returns": `
## Recipe
Decide what each call returns about its subtree, combine the children's returns, and update a global answer when the best path bends at this node.
Base case: null returns the neutral value (0 height, −∞ for max path, true for balanced).
## Examples
Max depth: 1 + max(left, right).
Diameter (LC 543): return height; answer = max(answer, left + right) in edges.
Balanced (LC 110): return height or −1 for unbalanced; prune early.
Max path sum (LC 124): return node + max(0, best single branch); answer = max(answer, node + max(0, L) + max(0, R)).
Path sum (LC 112/113): pass the remaining sum down; record the path with backtracking.
Path sum III (LC 437): a prefix-sum map along the root path, decremented on the way back.
Longest univalue path, binary tree cameras (state returns 0/1/2), house robber III (return (rob, skip)).
Count good nodes: pass the max so far down.
Subtree of another tree: compare at every node (O(n·m)) or serialise and string-match (O(n + m)).
## Tuples
Return several facts at once: (height, diameter), (isBST, min, max, sum) for the largest BST subtree (LC 1373).
Top-down parameters (depth, bounds, running sum) go down; bottom-up returns come back up.
## Iterative alternative
Post-order with an explicit stack and a map node → result when depth may hit 10⁵.
## Complexity
O(n) time, O(h) space. A global or nonlocal variable holds the "bent path" answer.
`,
  "tree-bfs": `
## Per-level BFS
Queue; loop: size = len(queue); pop exactly size nodes; push their children. Each loop iteration is one level.
Right side view: last node of each level. Level averages, largest per row, zigzag (reverse alternate levels).
Minimum depth: the first leaf found by BFS (DFS must check every path).
## Width (LC 662)
Index nodes like a heap: left = 2i, right = 2i + 1; width = last − first + 1 per level.
Re-base indices per level (subtract the first) to avoid overflow.
## Distance K (LC 863)
Add parent pointers (a DFS building a parent map), then BFS from the target over three neighbours with a visited set.
Treat a tree as an undirected graph whenever you must move upward.
## Vertical order (LC 314, 987)
BFS carrying the column; group by column. LC 987 sorts ties by row then value.
## Next pointers (LC 116, 117)
Perfect tree: link node.left.next = node.right and node.right.next = node.next.left, level by level, O(1) space.
General tree: walk the current level via next pointers while building the next level with a dummy head.
## Complexity
O(n) time; O(width) space, up to n/2 on the last level of a complete tree.
`,
  "tree-construct": `
## Pre-order + in-order (LC 105)
The first pre-order value is the root; its in-order index splits the left and right subtrees.
Hash map value → in-order index; a pre-order pointer advances globally. O(n).
Post + in (LC 106): take the root from the end of the post-order; build the right subtree first.
## Serialise / deserialise (LC 297)
Pre-order with null markers ("#"), comma-separated; deserialise by consuming tokens recursively.
Level order with nulls (LeetCode style) also works; a BST needs no nulls (bounds decide placement, LC 449).
## Balanced BST from sorted data
Middle element as root, recurse on both halves (LC 108). Linked list (LC 109): in-order simulation with a moving pointer in O(n).
## Verify pre-order serialisation (LC 331)
Slots: start with 1; each node uses one; a non-null adds two. Valid if slots never go negative and end at 0.
## Other constructions
BST from pre-order (LC 1008): bound-based recursion, O(n).
Maximum binary tree (LC 654): a decreasing monotonic stack gives O(n).
Cartesian tree: heap-ordered by value, in-order by index; built with a stack.
Clone a tree with random pointers: hash map old → new.
`,
  lca: `
## Recursive LCA (LC 236)
If node is null, p or q, return node. Recurse left and right.
Both sides non-null → this node is the LCA; otherwise return the non-null side. O(n).
Assumes both nodes exist; if not guaranteed (LC 1644), count how many were found.
## In a BST (LC 235)
Both values smaller → go left; both larger → go right; otherwise this node splits them. O(h), iterative O(1) space.
## With parent pointers (LC 1650)
Like the intersection of two linked lists: walk up, switching to the other's start at the root; they meet at the LCA.
Or record one node's ancestors in a set.
## Binary lifting (many queries)
up[k][v] = 2^k-th ancestor; up[k][v] = up[k−1][up[k−1][v]]. Preprocess O(n log n).
Query: lift the deeper node by the depth difference (by bits), then lift both while their ancestors differ; answer = parent. O(log n).
k-th ancestor (LC 1483) uses the same table.
Alternatives: Euler tour + RMQ (sparse table, O(1) query), Tarjan's offline LCA with DSU.
## Using the LCA
dist(u, v) = depth[u] + depth[v] − 2·depth[lca].
Path sums or maxima via prefix-from-root values; LCA of deepest leaves (LC 1123).
`,
  "bst-ops": `
## BST property
For every node: all left-subtree keys < node < all right-subtree keys (decide how duplicates go and keep it consistent).
## Search and insert
Go left or right by comparison: O(h). Insert at the null position where the search ends.
## Delete (LC 450)
Leaf → remove. One child → replace by the child.
Two children → replace the value by the in-order successor (min of the right subtree), then delete the successor from the right subtree.
## Floor, ceiling, rank and range
Floor: largest ≤ x (go right when node ≤ x and remember it). Ceiling: mirror.
Rank and k-th need subtree sizes stored in nodes (order-statistic tree).
Range sum or range query (LC 938): prune subtrees outside [lo, hi]: O(h + output).
Trim a BST (LC 669): recurse, replacing out-of-range nodes by the trimmed side.
## Height is everything
Every operation is O(h); h = log n when balanced, n when keys arrive sorted (a linked list).
Self-balancing trees (AVL, red-black) guarantee O(log n).
## Library ordered sets
Java TreeMap/TreeSet: floorKey, ceilingKey, headMap, tailMap. C++ std::map/set: lower_bound, upper_bound.
Python has no built-in: sortedcontainers.SortedList, or bisect on a list (O(n) inserts).
`,
  "bst-inorder": `
## Validate (LC 98)
Pass bounds (lo, hi) down, or check that the in-order sequence is strictly increasing.
Checking only node against its children is wrong: the rule covers whole subtrees.
Use null or long bounds when values can equal the integer limits.
## k-th smallest (LC 230)
In-order, stop at the k-th visit: O(h + k).
Frequent queries with updates: store subtree sizes and descend by rank: O(h).
## Recover a BST with two swapped nodes (LC 99)
In-order; find the inversions (prev > cur). Adjacent swap: one inversion; otherwise two.
first = prev at the first inversion; second = cur at the last inversion; swap their values.
Morris traversal makes it O(1) space.
## BST iterator (LC 173)
A stack of the left spine; next() pops, then pushes the left spine of the popped node's right child.
Amortised O(1) per call, O(h) memory.
## Two Sum IV on a BST (LC 653)
Hash set during traversal (O(n)), or two iterators (ascending and descending) as two pointers in O(h) memory.
## Other in-order uses
Minimum absolute difference (adjacent in-order values), mode in a BST, convert a BST to a greater-sum tree (reverse in-order with a running sum), BST to a sorted doubly linked list.
`,
  "balanced-bst": `
## Rotations
Left and right rotations rearrange three nodes in O(1) and preserve in-order order.
## AVL trees
Balance factor = height(left) − height(right) ∈ {−1, 0, 1} at every node.
Four cases after an insert: LL → right rotate; RR → left rotate; LR → left then right; RL → right then left.
Height ≤ ~1.44 log₂ n: faster lookups, more rotations on updates.
## Red-black trees
Rules: nodes are red or black; the root is black; red nodes have black children; every root-to-null path has the same number of black nodes.
Height ≤ 2 log₂(n + 1). Insert: recolour or rotate, at most 2 rotations; delete at most 3.
Used by Java TreeMap, C++ std::map and the Linux scheduler (CFS).
## B-trees and B+ trees
Nodes hold many keys (hundreds), so the tree is shallow: few disk or page reads per lookup.
B+ trees keep all values in the leaves, which are linked for range scans; used by most database indexes (InnoDB, PostgreSQL).
LSM trees (LevelDB, RocksDB, Cassandra) are the write-optimised alternative.
## Other balanced structures
Treaps (random priorities, heap order plus BST order), splay trees (amortised O(log n), recent keys near the root), skip lists (probabilistic, Redis), AA trees.
Order-statistic trees add subtree sizes for rank and select.
## Ordered maps in interviews
Reach for one when you need sorted order plus updates: floor/ceiling, range counts, "closest value", calendar booking (LC 729/731), sliding windows with order statistics.
State O(log n) per operation; in Python say SortedList.
`,
  "trie-basics": `
## Structure
Each node is a prefix; edges are characters; an end flag marks complete words. The root is the empty prefix.
Words sharing prefixes share paths.
## Operations (LC 208)
Insert, search and startsWith all cost O(L) for a word of length L, independent of the number of words.
Delete: unset the end flag, then prune childless nodes on the way back.
Store a count per node for "how many words have this prefix".
## Node representation
Array of 26 children: fastest, but 26 pointers per node. Hash map children: compact for large alphabets.
Space is O(total characters) nodes × the per-node size.
Compressed tries (radix / Patricia trees) merge single-child chains.
## Applications
Autocomplete, spell-check, IP routing (longest prefix match), word games, replace words (LC 648), longest word in a dictionary (LC 720).
Design add and search words with '.' wildcards (LC 211): DFS over all children at a '.'.
Map sum pairs (LC 677): store sums per prefix node.
## Trie vs hash set
A hash set answers whole-word membership in O(L) too, but cannot do prefix queries or ordered enumeration.
A trie avoids rehashing shared prefixes and supports early termination in backtracking.
`,
  "trie-search": `
## Word search II (LC 212)
Build a trie of the words; DFS from each cell, moving down the trie in step with the board.
Stop when no child matches (prefix pruning). Store the full word at its end node; clear it once found to avoid duplicates.
Prune leaf nodes after a match so dead branches shrink. Mark visited cells in place and restore them.
## Stream of characters (LC 1032)
Insert reversed words; keep the last maxLen characters; walk the trie backwards from the newest character.
Aho–Corasick is the general multi-pattern automaton (failure links) for streams.
## Palindrome pairs (LC 336)
For each word, split into prefix and suffix; if one part is a palindrome, look up the reverse of the other part.
A hash map of reversed words gives O(n·L²); a trie of reversed words adds palindromic-suffix lists.
## Search suggestions (LC 1268)
Sort the products; for each typed prefix, binary search the first match and take up to 3.
Or a trie storing the top 3 words at each node.
## Concatenated words (LC 472)
Sort by length; word-break DP for each word against a trie or set of shorter words.
## Complexity
State cost in terms of board cells × 4^L (pruned) or total characters; the trie's value is the pruning.
`,
  "bit-trie": `
## Maximum XOR of two numbers (LC 421)
Insert each number bit by bit from the top bit (e.g. bit 30) into a binary trie.
For each number, walk greedily toward the opposite bit at every level; each success adds that bit to the XOR.
O(n·B) with B = 31 bits.
## Queries with a limit (LC 1707)
Offline: sort queries by limit and numbers ascending; insert numbers ≤ the limit before answering each query.
Online alternative: store the minimum value in each subtree and skip subtrees above the limit.
## Pairs with XOR in [low, high] (LC 1803)
count(< high + 1) − count(< low), using counts stored at trie nodes and walking the bits of the bound.
## Maximum XOR subarray
Prefix XORs: max over j of P[j] XOR P[i] with i < j, so insert prefixes as you go (insert 0 first).
## Why greedy from the top bit works
A higher bit is worth more than all lower bits together (2^k > 2^k − 1), so fixing the top bit first is always optimal.
Linear XOR basis (Gaussian elimination over GF(2)) answers "max XOR of any subset".
`,
  "heap-internals": `
## Array layout
Complete binary tree stored in an array: children of i at 2i + 1 and 2i + 2, parent at (i − 1) / 2 (0-indexed).
Heap property: every parent ≤ its children (min-heap). Only the root is guaranteed to be the minimum.
## Operations
push: append, sift up: O(log n). pop: move the last element to the root, sift down (swap with the smaller child): O(log n).
peek: O(1). Search for an arbitrary value: O(n).
## Why heapify is O(n)
Sift down from the last parent (n/2 − 1) to 0. Most nodes are near the bottom and sift only a little: Σ (nodes at height h) × h = O(n).
Pushing n elements one by one costs O(n log n).
## Heap sort
Heapify (max-heap), then repeatedly swap the root to the end and sift down: O(n log n), in place, not stable, poor cache behaviour.
## Language APIs
Python heapq is a min-heap on a list: heappush, heappop, heapify, nlargest; negate keys for a max-heap; tuples compare element by element.
Java PriorityQueue (min by default; Comparator.reverseOrder() for max); remove(Object) is O(n).
C++ priority_queue is a max-heap; greater<> makes a min-heap.
## Decrease-key
Not supported by the standard heaps: push a new entry and skip stale ones on pop (lazy deletion), or use an indexed heap.
## d-ary heaps
Each node has d children: shallower (faster decrease-key), but sift-down compares d children. 4-ary heaps are often faster in practice.
`,
  "top-k": `
## Size-k heap trick
k largest: keep a min-heap of size k; push each item; pop when the size exceeds k. The root is the k-th largest.
O(n log k) time, O(k) space; works on streams.
## Alternatives
Sort: O(n log n). Quickselect: expected O(n), worst O(n²) (random pivot; median of medians gives a worst-case O(n)).
Bucket sort by frequency (top-k frequent, LC 347): O(n).
Heapify all and pop k: O(n + k log n).
## Patterns
K-th largest element (LC 215), kth largest in a stream (LC 703).
K closest points (LC 973): a max-heap of size k by distance (compare squared distances, no sqrt).
Top-k frequent words (LC 692): order by (−count, word); watch the tie-breaking direction in a size-k heap.
Reorganise string (LC 767): max-heap by count; place the top two alternately.
## K-way merge
Heap of (value, list id, index) holding each list's head: pop the smallest, push its successor. O(N log k).
Merge k sorted lists, smallest range covering k lists (LC 632, track the max), k-th smallest in a sorted matrix, k pairs with smallest sums (LC 373, push (i, 0) and then (i, j + 1)).
`,
  "two-heaps": `
## Median of a data stream (LC 295)
Max-heap "low" holds the smaller half; min-heap "high" holds the larger half.
Add: push into low, move low's max to high, and if high is bigger, move high's min back. Keep |low| ≥ |high|.
Median: top of low (odd count) or the average of both tops. add O(log n), median O(1).
## Follow-ups
All values in [0, 100]: a count array, median by scanning counts in O(100).
99% of values in range: counts plus overflow counters.
Sliding window median: add lazy deletion (LC 480), or use an ordered multiset.
## Two pools with a threshold: IPO (LC 502)
Min-heap of projects by capital; max-heap of profits for the affordable ones.
Each round, move everything affordable into the profit heap, then take the best profit. O(n log n).
Same idea: maximum performance of a team (LC 1383), minimum cost to hire k workers (LC 857).
## Why two heaps
They give O(1) access to the boundary between two halves; a sorted structure gives arbitrary order statistics at O(log n) each but costs more code and memory.
`,
  "heap-scheduling": `
## Meeting rooms II (LC 253)
Sort by start; a min-heap of end times; if the earliest end ≤ the new start, reuse that room (pop); push the new end. Answer = the heap's maximum size.
Sweep alternative: sorted starts and ends with two pointers, or +1/−1 events.
## Simulation with two heaps
Single-threaded CPU (LC 1834): sort tasks by enqueue time; a heap of available tasks by (duration, index); jump time forward when idle.
Process tasks using servers (LC 1882): a free-server heap and a busy-server heap keyed by free time.
Meeting rooms III (LC 2402): free rooms by index, busy rooms by (end, index); delay meetings when none are free.
## Task scheduler (LC 621)
Formula: max(n_tasks, (maxCount − 1) × (cooldown + 1) + numberOfTasksWithMaxCount).
Heap simulation: each cycle of cooldown + 1 slots takes the most frequent tasks.
## Deadlines
Course schedule III (LC 630): sort by deadline; add each course's duration to a max-heap; when the total exceeds the deadline, drop the longest course.
Minimum number of refuelling stops (LC 871): pass stations, keep their fuel in a max-heap, and refuel from the largest only when stuck.
Exchange argument: dropping the longest kept item leaves the most room for the future.
`,
  "indexed-pq": `
## Lazy deletion
Do not remove from the middle of a heap; mark the item deleted (a count map or a version number) and discard it when it surfaces at the top.
Dijkstra's "if d > dist[u]: continue" is lazy deletion of stale entries.
Heap size can grow to O(total pushes); keep a separate count of live items.
## Indexed priority queue
Keeps position[key] → heap index, so decrease-key, increase-key and delete(key) run in O(log n).
Dijkstra and Prim with decrease-key use O(V) heap space instead of O(E).
## Ordered set as a priority queue
TreeSet / std::set of (priority, id): erase any entry in O(log n), access min and max, update by erase plus insert.
Python: SortedList.
## Which to choose
Lazy deletion: simplest, usually fine in interviews.
Indexed heap: the textbook answer for decrease-key; more code.
Ordered set: when you need min and max, or deletions of arbitrary items, with clean code.
Fibonacci heaps give O(1) amortised decrease-key (Dijkstra O(E + V log V)) but are slow in practice.
`,
};
