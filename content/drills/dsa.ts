import type { Drill } from "@/lib/types";
import { blank, bug, guess, match, odd, order, pick, tf } from "@/lib/drills";

/**
 * Quick-play drills for DSA, keyed by topic id. Each is a 10–30 second micro-challenge that tests a different
 * angle from the topic's quiz. Code snippets are Python for brevity; `bug` line numbers are 1-based.
 */
export const dsaDrills: Record<string, Drill[]> = {
  complexity: [
    match("Match each input limit to the complexity it invites.", [["n ≤ 10", "O(n!)"], ["n ≤ 20", "O(2ⁿ)"], ["n ≤ 500", "O(n³)"], ["n ≤ 10⁵", "O(n log n)"], ["n ≤ 10⁸", "O(n)"]], "A judge does roughly 10⁸ simple operations a second; work backwards from n."),
    guess("Roughly how many simple operations does compiled C++ run in one second on a judge?", { min: 1e5, max: 1e11, answer: 1e8, tol: 2, log: true }, "About 10⁸. Python is roughly 50–100× slower, so ~10⁶–10⁷."),
    tf("Amortised O(1) means every single call is O(1).", false, "It means the average over any sequence is O(1). A dynamic array's push occasionally copies everything: that call is O(n)."),
    pick("for i in range(n): j = 1; while j < n: j *= 2. Total time?", ["O(n)", "*O(n log n)", "O(n²)", "O(log n)"], "The inner loop doubles j, so it runs log n times for each of the n outer iterations."),
    odd("Which of these is NOT O(n log n)?", ["Merge sort", "Heap sort", "*Building a heap from an array", "Sorting with Timsort"], "Bottom-up heapify is O(n): most nodes sit near the leaves and sift down only a little."),
  ],
  "arrays-hashing": [
    bug("Count subarrays summing to k. Which line is wrong?", `
def count_k(nums, k):
    seen = {}
    s = ans = 0
    for x in nums:
        s += x
        ans += seen.get(s - k, 0)
        seen[s] = seen.get(s, 0) + 1
    return ans`, 2, "Seed it with {0: 1}, otherwise subarrays that start at index 0 are never counted."),
    tf("A hash map lookup is O(1) in the worst case.", false, "Expected O(1). Adversarial collisions can make it O(n); Java 8+ HashMap degrades to O(log n) per bucket via trees."),
    match("Match the problem to its hashing trick.", [["Group anagrams", "Key = sorted word or 26 letter counts"], ["Two Sum", "Map value → index while scanning"], ["Longest consecutive sequence", "Set; only start counting where x − 1 is absent"], ["Subarray sum equals K", "Map prefix sum → count"]]),
    blank("Many range-add updates followed by one final read: use a ___ array.", ["*difference", "sparse", "suffix-max", "circular"], "Add v at l and subtract at r + 1, then take one prefix sum at the end: O(n + q)."),
    pick("Product of Array Except Self without division, O(1) extra space (output excluded). How?", ["Sort first", "*Left prefix products into the output, then multiply by a running right product", "A hash map of products", "Divide the total by each element"], "Two passes: the output holds products to the left, a single variable carries products to the right."),
  ],
  "two-pointers": [
    order("Put the steps of 3Sum (no duplicate triplets) in order.", ["Sort the array", "Fix index i, skipping a value equal to the previous i", "Set l = i + 1 and r = n − 1", "Move l up if the sum is too small, r down if too large", "On a hit, record it and skip duplicates at l and r"], "Sorting enables both the pointer moves and the duplicate skipping."),
    bug("A palindrome check. Which line is wrong?", `
def is_pal(s):
    l, r = 0, len(s)
    while l < r:
        if s[l] != s[r]: return False
        l += 1; r -= 1
    return True`, 2, "r must start at len(s) − 1; s[len(s)] is out of range."),
    tf("On a sorted array, opposite-end two pointers find a pair with a target sum in O(n).", true, "Each step discards one end for good: if the sum is too small, the left value can't pair with anything."),
    pick("Remove duplicates from a sorted array in place. Which pointer pattern?", ["*Slow writer + fast reader", "Opposite ends", "Binary search", "Three pointers from the end"], "The fast pointer scans; the slow pointer marks where the next unique value goes."),
    odd("Which problem is NOT a natural two-pointer problem?", ["Container With Most Water", "Trapping Rain Water", "Sort Colors", "*Number of Islands"], "Number of Islands is a flood fill (DFS/BFS or union-find)."),
  ],
  "sliding-window": [
    bug("Longest substring without repeating characters. Which line is wrong?", `
def longest(s):
    last, l, best = {}, 0, 0
    for r, c in enumerate(s):
        if c in last:
            l = last[c] + 1
        last[c] = r
        best = max(best, r - l + 1)
    return best`, 5, "It must be l = max(l, last[c] + 1). On \"abba\" the second 'a' would move l backwards to 1."),
    blank("A variable-size window works when validity is ___ as the window grows or shrinks.", ["*monotonic", "random", "symmetric", "constant"], "If growing a valid window can make it invalid and shrinking makes it valid again, two pointers never need to step back."),
    tf("A sliding window handles \"longest subarray with sum ≤ K\" even when values can be negative.", false, "Negatives break monotonicity: adding an element can lower the sum. Use prefix sums with a sorted structure or a deque."),
    match("Match the window problem to how the window is maintained.", [["Max sum of size k", "Fixed size: add the new, subtract the old"], ["At most K distinct", "Shrink while the map holds more than K keys"], ["Minimum window substring", "Grow until valid, then shrink while still valid"], ["Max of each window", "Monotonic deque of indices"]]),
    pick("Permutation in String (is a permutation of s1 inside s2?). Window size?", ["*Fixed at len(s1)", "Grows until a repeat", "Always 26", "len(s2) / 2"], "Slide a window of len(s1) and compare letter counts, updating two counts per step."),
  ],
  stack: [
    bug("A min-stack. Which line is wrong?", `
class MinStack:
    def __init__(self): self.s, self.m = [], []
    def push(self, x):
        self.s.append(x)
        if not self.m or x < self.m[-1]: self.m.append(x)
    def pop(self):
        if self.s.pop() == self.m[-1]: self.m.pop()
    def getMin(self): return self.m[-1]`, 5, "Use <=. Push 1, 1 then pop: the min stack loses its only 1 while a 1 is still on the stack."),
    order("Evaluate the RPN expression 3 4 + 2 * step by step.", ["Push 3", "Push 4", "'+': pop 4 and 3, push 7", "Push 2", "'*': pop 2 and 7, push 14"], "Operators pop their operands; the final stack holds the answer, 14."),
    tf("With three bracket types, Valid Parentheses can be solved with one counter.", false, "A counter can't tell that \"([)]\" is invalid. You need a stack of expected closers."),
    pick("Next Greater Element for every item: what does the stack hold?", ["*Indices still waiting for a greater value (their values decreasing)", "All values seen so far, sorted", "Only the current maximum", "Indices of answers already found"], "When a bigger value arrives it resolves every smaller waiting index on top."),
    odd("Which is NOT a monotonic-stack problem?", ["Daily Temperatures", "Largest Rectangle in Histogram", "Online Stock Span", "*Kth Largest Element in an Array"], "Kth largest is a heap or quickselect problem."),
  ],
  "mono-deque": [
    bug("Sliding-window maximum. Which line is wrong?", `
from collections import deque
def max_window(a, k):
    q, out = deque(), []
    for i, x in enumerate(a):
        while q and a[q[-1]] <= x: q.pop()
        q.append(i)
        if q[0] <= i - k: q.pop()
        if i >= k - 1: out.append(a[q[0]])
    return out`, 7, "The expired index sits at the front: it must be q.popleft()."),
    tf("In sliding-window maximum the deque's values decrease from front to back.", true, "Anything smaller behind a newcomer is popped, so the front is always the window's maximum."),
    pick("Each index enters and leaves the deque at most once. Total cost for n elements?", ["O(n log n)", "*O(n)", "O(nk)", "O(k log n)"], "At most n pushes and n pops overall, however the work is spread across steps."),
    blank("In \"shortest subarray with sum ≥ K\" (negatives allowed) the deque holds indices of ___ prefix sums.", ["*increasing", "decreasing", "equal", "random"], "A later, smaller prefix is a better left end, so larger earlier ones are popped from the back."),
    match("Match each part of the monotonic deque to its role.", [["Front", "The current window's best value"], ["Back", "Where new candidates enter"], ["Dominated element", "Older and smaller: safe to drop"], ["Index ≤ i − k", "Has left the window: pop from the front"]]),
  ],
  "binary-search": [
    bug("Find the first index with a[i] ≥ t. Which line is wrong?", `
def first_ge(a, t):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < t: lo = mid
        else: hi = mid
    return lo`, 5, "lo = mid + 1. With lo = mid the loop never ends once hi = lo + 1."),
    tf("Binary search requires a sorted array.", false, "It requires a monotonic predicate: search on the answer, peak finding and rotated arrays aren't plain sorted searches."),
    guess("About how many steps does binary search need over one billion sorted items?", { min: 1, max: 100, answer: 30, tol: 2 }, "log₂(10⁹) ≈ 30. Doubling the data adds one step."),
    match("Match the problem to what you binary-search over.", [["Koko Eating Bananas", "The eating speed"], ["Ship packages within D days", "The ship's capacity"], ["Find Peak Element", "The index, comparing with its neighbour"], ["Median of Two Sorted Arrays", "The partition point of the shorter array"]]),
    pick("Searching a rotated sorted array (distinct values): at each step you first determine…", ["*Which half is sorted", "Where the rotation point is, by a linear scan", "The maximum element", "Whether the target is even"], "One half is always sorted; check whether the target lies inside its range."),
  ],
  "linked-list": [
    order("Order the four lines inside the loop that reverses a linked list.", ["nxt = cur.next", "cur.next = prev", "prev = cur", "cur = nxt"], "Save the next node before overwriting cur.next, or the rest of the list is lost."),
    bug("Cycle detection. Which line is wrong?", `
def has_cycle(head):
    slow = fast = head
    while fast.next and fast:
        slow = slow.next
        fast = fast.next.next
        if slow is fast: return True
    return False`, 3, "Check fast before fast.next: while fast and fast.next. Otherwise an even-length list raises on None.next."),
    tf("A dummy head node removes the special case of deleting the first node.", true, "Every real node then has a predecessor, so one code path handles all deletions."),
    pick("Remove the n-th node from the end in one pass. The fast pointer starts…", ["*n nodes ahead of slow", "n/2 nodes ahead", "At the tail", "One node ahead"], "When fast reaches the end, slow is n nodes behind it, just before the target if you start from a dummy."),
    match("Match the list problem to its technique.", [["Detect a cycle", "Fast and slow pointers"], ["Merge two sorted lists", "Dummy head and a tail pointer"], ["Copy list with random pointer", "Interleave copies, or map old → new"], ["Reorder list L0 Ln L1 Ln−1…", "Find middle, reverse second half, weave"]]),
  ],
  trees: [
    match("Match the traversal to its visit order.", [["Pre-order", "Node, left, right"], ["In-order", "Left, node, right"], ["Post-order", "Left, right, node"], ["Level-order", "Breadth first, using a queue"]], "In-order on a BST yields sorted keys; post-order suits \"children first\" work like heights."),
    bug("Diameter of a binary tree. Which line is wrong?", `
best = 0
def depth(node):
    global best
    if not node: return 0
    l, r = depth(node.left), depth(node.right)
    best = max(best, l + r)
    return l + r + 1`, 7, "A path to the parent can use only one child: return 1 + max(l, r)."),
    tf("A balanced binary tree with n nodes has height O(log n).", true, "That's the point of balancing; a degenerate tree (a list) has height n."),
    pick("To serialise a binary tree with pre-order and rebuild it exactly, you must also write…", ["*Null markers for missing children", "The tree's height", "In-order as well, always", "Node depths"], "With null markers, pre-order alone is unambiguous."),
    guess("How many nodes does a perfect binary tree with 20 levels have?", { min: 100, max: 1e9, answer: 1048575, tol: 0.5, log: true }, "2²⁰ − 1 ≈ 1 million. Each level doubles; the last level holds about half of all nodes."),
  ],
  bst: [
    bug("Validate a BST with bounds. Which line is wrong?", `
def valid(node, lo=float("-inf"), hi=float("inf")):
    if not node: return True
    if not (lo < node.val < hi): return False
    return valid(node.left, lo, node.val) and valid(node.right, lo, hi)`, 4, "The right subtree's lower bound is node.val: valid(node.right, node.val, hi)."),
    tf("In-order traversal of a BST visits keys in sorted order.", true, "That's why \"k-th smallest\" and \"recover swapped nodes\" use in-order."),
    pick("Deleting a node with two children: replace its value with…", ["*Its in-order successor (or predecessor), then delete that node", "Its left child", "The root", "Any leaf"], "The successor is the leftmost node of the right subtree and has at most one child."),
    odd("Which is NOT a self-balancing search tree?", ["AVL tree", "Red-black tree", "B-tree", "*Binary heap"], "A heap is ordered parent-to-child, not left-to-right; you can't search it in O(log n)."),
    match("Match the BST query to its answer.", [["floor(x)", "Largest key ≤ x"], ["ceiling(x)", "Smallest key ≥ x"], ["Successor of a node with a right child", "Leftmost node of its right subtree"], ["LCA of p and q", "First node whose value lies between p and q"]]),
  ],
  tries: [
    bug("Trie search for a whole word. Which line is wrong?", `
def search(root, word):
    node = root
    for c in word:
        if c not in node.kids: return False
        node = node.kids[c]
    return True`, 6, "Return node.end. Otherwise \"app\" is found in a trie holding only \"apple\"."),
    tf("Inserting a word of length L into a trie costs O(L), however many words it holds.", true, "One step per character; the dictionary size affects memory, not per-word time."),
    blank("startsWith(prefix) differs from search(word) only by not checking the ___ flag.", ["*end-of-word", "visited", "parent", "depth"], "Both walk the characters; only search requires the final node to end a word."),
    match("Match the problem to its trie twist.", [["Word Search II", "Trie of words, pruned during grid DFS"], ["Maximum XOR of two numbers", "Binary trie, take the opposite bit when possible"], ["Replace words with their roots", "Walk until the first end-of-word marker"], ["Search with '.' wildcards", "DFS over all children at a dot"]]),
    pick("Autocomplete must return the top 3 suggestions for any prefix instantly. What do you store at each node?", ["*The top suggestions for that prefix, precomputed", "Nothing extra; DFS each time", "The whole dictionary", "Only a count"], "Precomputing top-k per node trades memory for O(prefix length) queries."),
  ],
  heap: [
    tf("Python's heapq is a max-heap by default.", false, "It's a min-heap. Push negated values (or tuples with negated keys) for max-heap behaviour."),
    pick("Median of a data stream. Which structure?", ["One sorted list", "*A max-heap for the low half and a min-heap for the high half", "A single min-heap", "A hash map"], "Keep the heaps balanced within one element; the median is at one or both tops."),
    guess("About how many sift-up steps does a push into a heap of one million items take, at most?", { min: 1, max: 100, answer: 20, tol: 3 }, "The heap's height: log₂(10⁶) ≈ 20."),
    order("Merge k sorted lists with a min-heap. Order the loop.", ["Push the head of every list", "Pop the smallest node", "Append it to the output", "Push that node's next, if any"], "The heap never holds more than k nodes, so it's O(N log k)."),
    odd("Which is NOT naturally a heap problem?", ["Top K Frequent Elements", "Task Scheduler", "Merge k Sorted Lists", "*Valid Parentheses"], "Valid Parentheses needs a stack."),
  ],
  backtracking: [
    order("Order the parts of a backtracking function.", ["If the state is a complete solution, record it and return", "Loop over the available choices", "Skip choices that break a constraint", "Make the choice", "Recurse", "Undo the choice"], "Choose, explore, un-choose. Pruning before recursing is where speed comes from."),
    bug("Permutations. Which line is wrong?", `
def permute(nums):
    out, path, used = [], [], [False] * len(nums)
    def go():
        if len(path) == len(nums): out.append(path); return
        for i, x in enumerate(nums):
            if used[i]: continue
            used[i] = True; path.append(x)
            go()
            used[i] = False; path.pop()
    go(); return out`, 4, "Append a copy (path[:]). Otherwise every entry is the same list, emptied by the end."),
    guess("How many subsets does a 20-element set have?", { min: 100, max: 1e9, answer: 1048576, tol: 0.3, log: true }, "2²⁰ ≈ 10⁶: each element is in or out."),
    tf("N-Queens can check diagonals in O(1) with sets keyed by r − c and r + c.", true, "Cells on one \"\\\" diagonal share r − c; cells on one \"/\" diagonal share r + c."),
    pick("Combination Sum where a candidate may be reused. The recursive call passes start =", ["*i (the same index)", "i + 1", "0", "start + 1"], "Staying at i allows reuse; never going back below i avoids duplicate orderings."),
  ],
  "graph-traversal": [
    bug("BFS distances. Which line is wrong?", `
def bfs(g, s):
    seen, q = {s}, deque([s])
    dist = {s: 0}
    while q:
        u = q.popleft()
        for v in g[u]:
            if v not in seen:
                q.append(v); dist[v] = dist[u] + 1
    return dist`, 8, "v is never added to seen, so nodes are enqueued repeatedly (and cycles never end). Add seen.add(v) when pushing."),
    tf("DFS finds shortest paths in an unweighted graph.", false, "BFS does: it explores in order of distance. DFS can reach a node by a long path first."),
    match("Match the task to the traversal.", [["Shortest path, unweighted", "BFS"], ["Cycle in a directed graph", "DFS with three colours"], ["Count islands", "Flood fill (DFS/BFS) or union-find"], ["Rotting oranges", "BFS seeded with every source at once"]]),
    pick("Clone Graph: what stops infinite recursion on cycles?", ["*A map from each original node to its clone", "A depth limit", "Sorting the neighbours", "Deleting visited edges"], "Check the map before cloning; it doubles as the visited set."),
    blank("Bipartite check: colour the start node, then give every neighbour the ___ colour.", ["*opposite", "same", "next unused", "random"], "A neighbour already holding the same colour means an odd cycle: not bipartite."),
  ],
  "topo-sort": [
    order("Order the steps of Kahn's algorithm.", ["Compute every node's in-degree", "Queue every node with in-degree 0", "Pop a node and append it to the order", "Decrement each neighbour's in-degree, queueing any that reach 0", "If fewer than n nodes were output, report a cycle"]),
    tf("A DAG can have more than one valid topological order.", true, "Whenever two nodes are available at once, either can go first."),
    pick("Course Schedule: pair [a, b] means take b before a. Which edge do you draw?", ["a → b", "*b → a", "Both directions", "No edge; just count"], "Edges point from prerequisite to dependant, so in-degree counts unmet prerequisites."),
    odd("Which one is NOT a topological-sort problem?", ["Course Schedule II", "Alien Dictionary", "Package build order", "*Number of Islands"], "Islands is connectivity, not ordering."),
    blank("In DFS topological sort you append a node after all its descendants finish, then ___ the list.", ["*reverse", "sort", "deduplicate", "rotate"], "Post-order puts dependants first; reversing gives prerequisites first."),
  ],
  "union-find": [
    bug("Union by size. Which line is wrong?", `
def union(a, b):
    ra, rb = find(a), find(b)
    if ra == rb: return False
    if size[ra] < size[rb]: ra, rb = rb, ra
    parent[ra] = rb
    size[ra] += size[rb]
    return True`, 5, "After the swap ra is the bigger root: attach the smaller one, parent[rb] = ra."),
    tf("With path compression and union by rank, DSU operations are nearly O(1) amortised.", true, "O(α(n)), the inverse Ackermann function, which is at most 4 for any practical n."),
    pick("Components after processing all edges with a DSU on n nodes =", ["Number of edges", "*n minus the number of successful unions", "n / 2", "Number of roots squared"], "Each successful union merges two components into one."),
    match("Match the problem to how DSU solves it.", [["Redundant Connection", "The first union that returns false"], ["Accounts Merge", "Union emails, group by root"], ["Kruskal's MST", "Sorted edges, union when roots differ"], ["Number of Provinces", "Count distinct roots"]]),
    odd("Which operation can a plain DSU NOT do efficiently?", ["Merge two sets", "Check if two items share a set", "Count the components", "*Delete an edge"], "DSU only merges. Handle deletions offline by reversing time."),
  ],
  "shortest-paths": [
    match("Match the graph to its shortest-path algorithm.", [["Non-negative weights", "Dijkstra"], ["Negative edges, detect negative cycles", "Bellman-Ford"], ["All pairs, n ≤ 400", "Floyd–Warshall"], ["Weights only 0 or 1", "0-1 BFS with a deque"], ["Unweighted", "Plain BFS"]]),
    bug("Dijkstra. Which line is wrong?", `
def dijkstra(g, s):
    dist, done, pq = {s: 0}, set(), [(0, s)]
    while pq:
        d, u = heappop(pq)
        if u in done: continue
        done.add(u)
        for v, w in g[u]:
            if v not in dist or d + w < dist[v]:
                dist[v] = d + w
                heappush(pq, (dist[v], v))
                done.add(v)
    return dist`, 11, "A node is final only when popped. Marking it done on push freezes a distance a later, shorter path could improve."),
    tf("Dijkstra with a binary heap runs in O((V + E) log V).", true, "Each edge may push once; each push or pop is O(log V)."),
    pick("Network Delay Time (signal from k to all nodes). The answer is…", ["The sum of all shortest distances", "*The largest shortest distance, or −1 if a node is unreachable", "The smallest edge weight", "The number of edges"], "The signal reaches everyone when the farthest node hears it."),
    blank("Cheapest flight within K stops: Bellman-Ford copies the distance array each round so a round adds at most ___ edge.", ["*one", "two", "K", "zero"], "Relaxing from the previous round's copy keeps the hop count honest."),
  ],
  "advanced-graphs": [
    match("Match the task to the algorithm.", [["Bridges and articulation points", "Tarjan's low-link values"], ["Strongly connected components", "Tarjan or Kosaraju"], ["Use every edge exactly once", "Hierholzer (Euler path)"], ["Cheapest way to connect all nodes", "Kruskal or Prim (MST)"]]),
    tf("A connected undirected graph has an Euler circuit if and only if every vertex has even degree.", true, "You must leave every vertex as often as you enter it. Exactly two odd vertices give an Euler path instead."),
    pick("Kosaraju's second DFS runs on…", ["*The reversed graph, in decreasing finish time", "The same graph, in index order", "The MST", "A BFS tree"], "Reversing edges traps each DFS inside one strongly connected component."),
    pick("How many edges does a spanning tree of 1,000 vertices have?", ["*999", "1,000", "500", "1,998"], "A tree on V vertices always has V − 1 edges."),
    odd("Which algorithm does NOT produce a minimum spanning tree?", ["Kruskal", "Prim", "Borůvka", "*Dijkstra"], "Dijkstra builds a shortest-path tree from one source, which can differ from the MST."),
  ],
  "dp-1d": [
    order("Order the steps for designing a DP solution.", ["Define the state in words", "Write the recurrence", "Set the base cases", "Choose an iteration order so dependencies are ready", "Read the answer from the right state"], "Saying the state in plain words first prevents most off-by-one errors."),
    bug("Climbing stairs (1 or 2 steps). Which line is wrong?", `
def climb(n):
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return b`, 5, "After n iterations a = ways(n); b is ways(n + 1). Return a."),
    tf("House Robber's recurrence is dp[i] = max(dp[i−1], dp[i−2] + nums[i]).", true, "Skip house i, or rob it and add the best up to i − 2."),
    pick("Decode Ways: how many decodings does \"06\" have?", ["*0", "1", "2", "6"], "A leading '0' can't be decoded, and \"06\" isn't \"6\"."),
    guess("Naive recursive fib(30): roughly how many function calls?", { min: 100, max: 1e10, answer: 2692537, tol: 1, log: true }, "About 2.7 million (2·F(31) − 1). Memoisation cuts it to 31."),
  ],
  "dp-2d": [
    match("Match the 2D DP to its transition.", [["Longest common subsequence", "Diagonal + 1 on a match, else max of top and left"], ["Edit distance", "1 + min(insert, delete, replace)"], ["Unique paths", "Top + left"], ["Longest palindromic substring", "s[i] == s[j] and inner range is a palindrome"]]),
    bug("Unique paths in an m×n grid. Which line is wrong?", `
def paths(m, n):
    dp = [[0] * n for _ in range(m)]
    for i in range(m):
        for j in range(n):
            if i == 0 or j == 0: dp[i][j] = 1
            else: dp[i][j] = dp[i-1][j] * dp[i][j-1]
    return dp[-1][-1]`, 6, "Paths add, they don't multiply: dp[i-1][j] + dp[i][j-1]."),
    tf("A 2D DP whose rows depend only on the previous row can run in O(columns) memory.", true, "Keep two rows, or one row updated in the right direction."),
    guess("How many right/down paths cross a 10×10 grid of cells from corner to corner?", { min: 10, max: 1e7, answer: 48620, tol: 0.5, log: true }, "C(18, 9) = 48,620: choose which 9 of the 18 moves go right."),
    pick("Edit distance from \"horse\" to \"ros\"?", ["2", "*3", "4", "5"], "horse → rorse (replace h) → rose (delete r) → ros (delete e)."),
  ],
  "dp-knapsack": [
    match("Match the knapsack variant to its loop rule.", [["0/1 knapsack, 1D array", "Capacity loop runs downward"], ["Unbounded (min coins)", "Capacity loop runs upward"], ["Count combinations (Coin Change II)", "Coins in the outer loop"], ["Count ordered ways (Combination Sum IV)", "Amount in the outer loop"]]),
    bug("Minimum coins for an amount. Which line is wrong?", `
def coin_change(coins, amount):
    dp = [0] + [float("inf")] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a: dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount]`, 6, "An unreachable amount returns inf; the contract is −1."),
    tf("Partition Equal Subset Sum reduces to subset sum with target total / 2.", true, "If the total is odd the answer is immediately false."),
    pick("Target Sum on [1, 1, 1, 1, 1] with target 3: how many sign assignments?", ["3", "*5", "10", "1"], "Exactly one −1 among five ones: 5 ways."),
    odd("Which is NOT a knapsack-style DP?", ["Partition Equal Subset Sum", "Coin Change", "Ones and Zeroes", "*Longest Palindromic Substring"], "Palindromes are interval / expand-around-centre problems."),
  ],
  "dp-advanced": [
    match("Match the problem to its DP family.", [["Burst Balloons", "Interval DP: choose the last balloon"], ["Travelling salesman, n ≤ 16", "Bitmask DP over visited sets"], ["Count numbers ≤ N with a digit rule", "Digit DP with a tight flag"], ["House Robber III", "Tree DP returning two states"]]),
    tf("Bitmask DP over 20 items with an inner loop over the items does about 2·10⁷ transitions.", true, "2²⁰ × 20 ≈ 2.1·10⁷: fine in C++, tight in Python."),
    pick("Matrix-chain multiplication order belongs to which family?", ["*Interval DP", "Knapsack", "Digit DP", "Greedy"], "dp[i][j] tries every split point k between i and j."),
    blank("In House Robber III each node returns two values: the best if robbed and the best if ___.", ["*not robbed", "visited", "balanced", "a leaf"], "Robbed uses children's \"not robbed\"; not robbed takes each child's better option."),
    odd("Which is NOT an interval DP?", ["Burst Balloons", "Matrix-chain multiplication", "Minimum Cost to Merge Stones", "*Longest Increasing Subsequence"], "LIS is 1D DP (or patience sorting)."),
  ],
  greedy: [
    bug("Minimum intervals to remove so the rest don't overlap. Which line is wrong?", `
def erase_overlap(iv):
    iv.sort(key=lambda x: x[0])
    end, keep = float("-inf"), 0
    for s, e in iv:
        if s >= end: keep += 1; end = e
    return len(iv) - keep`, 2, "Sort by end time. Sorting by start lets one long early interval block many short ones."),
    tf("Taking the largest coin first is optimal for US coins {1, 5, 10, 25}.", true, "That system is canonical. {1, 3, 4} with amount 6 is not, which is why you test greedy with counter-examples."),
    pick("Jump Game (can you reach the end?). What do you track while scanning?", ["*The furthest index reachable so far", "Every reachable index in a set", "The number of jumps", "The minimum value"], "If i ever exceeds the furthest reach, you're stuck."),
    order("Order the steps of an exchange-argument proof for a greedy choice.", ["Take an optimal solution that differs from the greedy one", "Find the first place they differ", "Swap in the greedy choice there", "Show the result is no worse", "Repeat until it matches the greedy solution"]),
    match("Match the problem to its greedy rule.", [["Most non-overlapping meetings", "Earliest end time first"], ["Huffman coding", "Merge the two smallest weights"], ["Fractional knapsack", "Best value per kilogram first"], ["Minimum train platforms", "Sort arrivals and departures, sweep"]]),
  ],
  intervals: [
    order("Order the steps for merging intervals.", ["Sort by start", "Put the first interval in the output", "If the next one starts before the last one ends, extend the last end", "Otherwise append it as a new interval"]),
    bug("Merge intervals. Which line is wrong?", `
def merge(iv):
    iv.sort()
    out = [iv[0]]
    for s, e in iv[1:]:
        if s <= out[-1][1]: out[-1][1] = e
        else: out.append([s, e])
    return out`, 5, "Use max(out[-1][1], e). A short interval inside a long one would otherwise shrink it."),
    tf("Closed intervals [1, 3] and [3, 5] overlap.", true, "They share the point 3. Half-open [1, 3) and [3, 5) don't."),
    pick("Minimum meeting rooms. Which structure?", ["*A min-heap of end times (or a sorted start/end sweep)", "A stack", "A trie", "Union-find"], "The heap size is the number of meetings running at once."),
    blank("Insert Interval runs in O(n) without sorting because the input is already ___.", ["*sorted and non-overlapping", "hashed", "balanced", "reversed"], "Copy the ones before, merge the overlapping run, copy the rest."),
  ],
  bits: [
    match("Match the expression to what it does.", [["x & (x − 1)", "Clears the lowest set bit"], ["x & −x", "Isolates the lowest set bit"], ["x ^ x", "Always 0"], ["1 << k", "2 to the power k"]]),
    bug("Count set bits. Which line is wrong?", `
def popcount(x):
    c = 0
    while x:
        x &= x + 1
        c += 1
    return c`, 4, "x &= x − 1 clears the lowest set bit. x + 1 does something else entirely."),
    tf("a ^ b ^ a == b for any integers a and b.", true, "XOR is its own inverse: that's why XOR-ing everything finds the single number."),
    pick("Counting Bits for 0..n in O(n): bits[i] =", ["*bits[i >> 1] + (i & 1)", "bits[i − 1] + 1", "i % 2", "log₂(i)"], "Shifting right drops the last bit; add it back."),
    guess("What is the largest 32-bit signed integer?", { min: 1e6, max: 1e12, answer: 2147483647, tol: 0.2, log: true }, "2³¹ − 1 = 2,147,483,647, about 2.1 billion. Watch for overflow in sums and products."),
  ],
  math: [
    bug("Sieve of Eratosthenes returning primes ≤ n. Which line is wrong?", `
def sieve(n):
    p = [True] * (n + 1); p[0] = p[1] = False
    for i in range(2, int(n ** 0.5) + 1):
        if p[i]:
            for j in range(i * i, n + 1, i): p[j] = False
    return [i for i in range(n) if p[i]]`, 6, "range(n) skips n itself, so sieve(7) misses 7. Use range(n + 1)."),
    tf("gcd(a, b) = gcd(b, a mod b).", true, "Euclid's algorithm: O(log min(a, b)) steps."),
    pick("Fast exponentiation computes xⁿ with how many multiplications?", ["O(n)", "*O(log n)", "O(√n)", "O(1)"], "Square for each bit of n, multiply in when the bit is set."),
    guess("How many primes are there below 1,000?", { min: 0, max: 1000, answer: 168, tol: 20 }, "168. The estimate n / ln n ≈ 145 lands within about 15–20%."),
    match("Match the task to the trick.", [["Modular inverse, prime m", "a^(m−2) mod m (Fermat)"], ["Trailing zeros of n!", "Sum of ⌊n / 5ᵏ⌋"], ["Uniform random point in a circle", "Radius R·√u, angle 2πv"], ["Uniform pick from a stream", "Reservoir sampling"]]),
  ],
  strings: [
    match("Match the string algorithm to its key idea.", [["KMP", "Failure function; never re-reads the text"], ["Rabin–Karp", "Rolling hash"], ["Z-algorithm", "Longest prefix match starting at each index"], ["Manacher", "All longest palindromes in O(n)"]]),
    bug("Longest palindromic substring by expanding around centres. Which line is wrong?", `
def longest_pal(s):
    best = ""
    for c in range(len(s)):
        for l, r in ((c, c), (c, c + 1)):
            while l >= 0 and r < len(s) and s[l] == s[r]:
                l -= 1; r += 1
            best = max(best, s[l:r], key=len)
    return best`, 7, "The loop overshoots by one on the left: the palindrome is s[l + 1:r]."),
    tf("Building a string with += in a loop can be O(n²) in Java or Python.", true, "Each += may copy the whole string. Use StringBuilder or ''.join(parts)."),
    pick("Valid Anagram with only lowercase letters. Leanest structure?", ["*A 26-int count array", "Sort both strings", "A hash map of strings", "A trie"], "O(n) time and O(1) memory."),
    blank("KMP's failure function stores the length of each prefix's longest proper prefix that is also a ___.", ["*suffix", "palindrome", "subsequence", "rotation"], "On a mismatch you fall back to that length instead of restarting."),
  ],
  "range-queries": [
    match("Match the query pattern to its structure.", [["Static range sums", "Prefix sums"], ["Point update + range sum", "Fenwick tree"], ["Range update + range query", "Segment tree with lazy propagation"], ["Static range minimum", "Sparse table"]]),
    bug("Fenwick tree point update (1-indexed). Which line is wrong?", `
def update(i, delta):
    while i <= n:
        tree[i] += delta
        i -= i & -i
def query(i):
    s = 0
    while i > 0: s += tree[i]; i -= i & -i
    return s`, 4, "Updates climb with i += i & −i; only queries step down with −=."),
    tf("A Fenwick tree handles range-minimum with arbitrary point updates as easily as range sums.", false, "Min has no inverse, so prefix differences don't work. Use a segment tree."),
    guess("How many levels deep is a segment tree over one million elements?", { min: 1, max: 64, answer: 20, tol: 2 }, "⌈log₂(10⁶)⌉ = 20, so a query or update touches only O(log n) nodes: a few dozen."),
    pick("With P[0] = 0 and P[i+1] = P[i] + a[i], the inclusive sum a[l..r] is…", ["*P[r + 1] − P[l]", "P[r] − P[l]", "P[r] − P[l − 1]", "P[r + 1] − P[l + 1]"], "The extra leading zero removes every special case at l = 0."),
  ],
  "design-ds": [
    match("Match the design to its structures.", [["LRU cache", "Hash map + doubly linked list"], ["LFU cache", "Frequency buckets of lists + current min frequency"], ["Insert/delete/getRandom in O(1)", "Array + value → index map"], ["Time-based key-value store", "Per-key sorted list + binary search"]]),
    bug("LRU put with eviction. Which line is wrong?", `
def put(self, key, val):
    if key in self.map: self.unlink(self.map[key])
    node = Node(key, val)
    self.push_front(node); self.map[key] = node
    if len(self.map) > self.cap:
        lru = self.tail.prev
        self.unlink(lru)
        del self.map[key]`, 8, "Delete the evicted node's key, lru.key. This deletes the key you just inserted."),
    tf("Python's OrderedDict with move_to_end and popitem(last=False) can implement an LRU cache.", true, "Fine to mention in an interview, but expect to build the linked list yourself too."),
    pick("Hit counter for the last 300 seconds with bursts of hits per second. Best memory use?", ["A list of every timestamp", "*A circular buffer of 300 (second, count) buckets", "A heap", "A trie of timestamps"], "Memory stays constant however many hits arrive."),
    odd("In a hash map + doubly linked list LRU, which is NOT O(1)?", ["get", "put", "evict", "*Listing keys alphabetically"], "Sorting needs O(n log n); the structure only tracks recency."),
  ],
  matrix: [
    order("Order one lap of a spiral traversal.", ["Top row, left → right, then move top down", "Right column, top → bottom, then move right in", "Bottom row, right → left, then move bottom up", "Left column, bottom → top, then move left in"], "Check the bounds after each side so single rows or columns aren't printed twice."),
    bug("In-place transpose of a square matrix. Which line is wrong?", `
def transpose(a):
    n = len(a)
    for i in range(n):
        for j in range(n):
            a[i][j], a[j][i] = a[j][i], a[i][j]
    return a`, 4, "Each pair is swapped twice, undoing the transpose. Loop j from i + 1."),
    tf("Rotating a square matrix 90° clockwise = transpose, then reverse each row.", true, "Reverse each column instead (or reverse rows first, then transpose) for counter-clockwise."),
    pick("Set Matrix Zeroes with O(1) extra space uses…", ["*The first row and first column as markers", "A copy of the matrix", "A hash set of cells", "Recursion"], "Remember separately whether the first row and column themselves need zeroing."),
    match("Match the grid problem to its technique.", [["Number of Islands", "Flood fill"], ["Search a row- and column-sorted matrix", "Start top-right, move left or down"], ["Game of Life in place", "Encode old and new state in spare bits"], ["Word Search", "DFS with backtracking"]]),
  ],
  sorting: [
    match("Match the sort to its profile.", [["Merge sort", "Stable, O(n log n) always, O(n) extra memory"], ["Quick sort", "In place, O(n²) worst case"], ["Heap sort", "In place, O(n log n), not stable"], ["Counting sort", "O(n + k) for small integer keys"]]),
    bug("Lomuto partition. Which line is wrong?", `
def partition(a, lo, hi):
    p, i = a[hi], lo
    for j in range(lo, hi):
        if a[j] < p:
            a[i], a[j] = a[j], a[i]; i += 1
    a[i], a[hi] = a[hi], a[i]
    return hi`, 7, "The pivot now sits at i: return i."),
    tf("Any comparison sort needs Ω(n log n) comparisons in the worst case.", true, "There are n! orderings and each comparison halves the possibilities at best: log₂(n!) ≈ n log n."),
    guess("Roughly how many comparisons does merge sort make on one million items?", { min: 1e5, max: 1e10, answer: 2e7, tol: 1, log: true }, "n log₂ n ≈ 10⁶ × 20 = 2·10⁷."),
    pick("Quickselect finds the k-th smallest in average time…", ["*O(n)", "O(n log n)", "O(log n)", "O(k log n)"], "It recurses into one side only: n + n/2 + n/4 + … ≈ 2n."),
  ],
  "advanced-techniques": [
    match("Match the constraint to the technique.", [["n = 40, subset sums", "Meet in the middle"], ["k-th ancestor queries", "Binary lifting"], ["Offline range queries reordered by blocks", "Mo's algorithm"], ["Connectivity with edges below a limit, offline", "Sort edges and queries + DSU"]]),
    tf("Mo's algorithm answers offline range queries in about O((n + q)·√n).", true, "Sorting queries by block keeps the total pointer movement near that bound."),
    pick("Binary lifting with k up to 10⁹ needs how many jump levels?", ["10", "*30", "1,000", "10⁹"], "2³⁰ > 10⁹, so 30 powers of two cover any k."),
    guess("2⁴⁰ is roughly…", { min: 1e6, max: 1e15, answer: 1.0995e12, tol: 0.5, log: true }, "About 1.1 × 10¹²: why n = 40 forces meet in the middle (2 × 2²⁰ ≈ 2·10⁶)."),
    odd("Which technique works online, answering each query before seeing the next?", ["Mo's algorithm", "Sort queries + DSU", "Reverse-time deletions", "*Fenwick tree with point updates"], "The other three need all the queries up front."),
  ],
};
