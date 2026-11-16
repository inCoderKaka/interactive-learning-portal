import { Q, T, type Extra } from "./h";
import type { Topic } from "@/lib/types";

/** Second pass over DSA: variations, deeper analysis, bar-raiser angles and extra flashcards per topic. */
export const dsaExtra: Record<string, Extra> = {
  complexity: {
    deep: `- **Master theorem, the three cases you actually use:** T(n) = 2T(n/2) + O(n) → O(n log n); T(n) = T(n/2) + O(1) → O(log n); T(n) = 2T(n/2) + O(1) → O(n). Unbalanced splits (quickselect) are solved by summing the geometric series: n + n/2 + n/4 + … = 2n.
- **Harmonic sums:** a loop of n/1 + n/2 + … + n/n steps is O(n log n). This is why a sieve and "for every multiple" loops are cheap.
- **Operation budget:** about 10⁸ simple operations per second in C++/Java, 10⁷ in Python. Turn the constraint into a number before choosing an algorithm.
- **Amortised analysis out loud:** use the accounting argument ("each element pays for one push and one pop") or the doubling argument (copies cost 1 + 2 + 4 + … + n < 2n).
- **Output-sensitive bounds:** enumerating all subsets or paths is at least the size of the output; say O(2ⁿ · n) including the copy.
- **Bar raiser:** the interviewer asks "can you do better?" Answer with a *lower bound* argument: you must read the input (Ω(n)), comparison sorting is Ω(n log n), the output itself has size k. Knowing when to stop optimising is a senior signal.
- **Hidden costs:** hashing a string key is O(L); sorting strings is O(L · n log n); slicing or concatenating in a loop is quadratic; recursion depth near 10⁵ overflows the stack in Python and often in Java.`,
    cards: [
      ["T(n) = 2T(n/2) + O(n)", "O(n log n) (merge sort)"],
      ["T(n) = T(n/2) + O(n)", "O(n): geometric series n + n/2 + n/4 + … (quickselect average)"],
      ["n/1 + n/2 + … + n/n", "O(n log n), the harmonic sum (sieve, multiples loops)"],
      ["Rough operations per second to budget for", "~10⁸ simple ops in C++/Java, ~10⁷ in Python"],
      ["Why is a dynamic array push O(1) amortised?", "Doubling copies 1 + 2 + 4 + … + n < 2n elements in total across n pushes"],
      ["Lower bound for comparison sorting, and why", "Ω(n log n): a decision tree needs n! leaves, so height ≥ log₂(n!)"],
      ["n ≤ 20 hints at… / n ≤ 500 hints at… / n ≤ 5000 hints at…", "bitmask or backtracking / O(n³) / O(n²)"],
      ["What does space complexity always include?", "The recursion stack and the output you build, not just explicit structures"],
    ],
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
    cards: [
      ["Kadane recurrence", "cur = max(a[i], cur + a[i]); best = max(best, cur)"],
      ["Maximum product subarray: what state?", "Both max and min product ending here; a negative swaps them"],
      ["Maximum circular subarray sum", "max(Kadane max, total − Kadane min); if all negative return the max element"],
      ["Count subarrays with sum divisible by K", "Count equal prefix remainders: for each remainder with c occurrences add c(c−1)/2; normalise negatives"],
      ["Longest subarray with equal 0s and 1s", "Map 0 → −1, store first index of each prefix sum; equal prefix sums bound a balanced subarray"],
      ["Subarray Sum Equals K: why not a sliding window?", "Negatives break monotonicity; use prefix sum counts in a hash map (seed {0: 1})"],
      ["Elements appearing more than n/3 times", "Boyer–Moore with 2 candidates and counters, then a verification pass"],
      ["Next permutation in three steps", "Find rightmost i with a[i] < a[i+1]; swap a[i] with the rightmost larger element; reverse the suffix"],
      ["Rotate an array right by k in O(1) space", "Reverse whole array, reverse first k, reverse remaining n−k"],
      ["Find the duplicate in [1..n] with n+1 slots, O(1) space, no mutation", "Treat values as next pointers and run Floyd cycle detection"],
      ["Product of array except self without division", "Prefix products left-to-right into the answer, then multiply by a running suffix product right-to-left"],
    ],
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
    cards: [
      ["Dutch flag regions", "[0,lo) < p · [lo,mid) == p · [mid,hi] unknown · (hi,n) > p"],
      ["Count pairs with sum < target in a sorted array", "If a[l] + a[r] < target add (r − l) and l++; else r−−"],
      ["kSum complexity with sort + two pointers", "O(n^(k−1)) time, e.g. 3Sum O(n²), 4Sum O(n³)"],
      ["Container With Most Water: discard argument", "Every container that keeps the shorter line and is narrower is no better, so drop the shorter line"],
      ["Trapping rain water, O(1) space", "Two pointers with leftMax / rightMax; advance the side with the smaller max and add max − height"],
      ["Remove duplicates in place allowing at most 2 copies", "Writer w; copy a[i] if w < 2 or a[i] != a[w−2]"],
      ["Merge sorted B into A which has trailing space", "Fill from the back with three pointers to avoid overwriting"],
      ["4Sum II (four separate arrays)", "Hash counts of a+b, then for each c+d add count[−(c+d)]: O(n²)"],
      ["When does opposite-ends two pointers NOT apply?", "No monotonic structure: unsorted data needing indices, or negatives in a sum window; use hashing or prefix sums"],
    ],
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
    cards: [
      ["Count subarrays with exactly K distinct values", "atMost(K) − atMost(K−1)"],
      ["Number of valid subarrays ending at r for an at-most window [l, r]", "r − l + 1"],
      ["Longest Repeating Character Replacement: validity test", "window length − max frequency in window ≤ k"],
      ["Why can the max-frequency in character replacement stay stale?", "The answer only grows when a larger max frequency appears, so a non-shrinking window is still correct"],
      ["Sliding window precondition", "Monotonic validity: extending keeps (in)validity in one direction; typically non-negative values or count constraints"],
      ["Subarray sum ≥ K with negatives allowed", "Prefix sums + monotonic increasing deque, not a plain window"],
      ["Permutation in string in O(n)", "Fixed window of |p| with a count array and a matched-letters counter updated on enter and leave"],
      ["Max Consecutive Ones III in one line", "Longest window containing at most k zeros"],
      ["Frequency of the Most Frequent Element", "Sort; window valid when a[r] · len − windowSum ≤ k"],
      ["Minimum Window Substring complexity", "O(|s| + |t|) time, O(alphabet) space: each pointer moves at most |s| times"],
    ],
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
    cards: [
      ["Why is a monotonic stack O(n)?", "Every index is pushed once and popped at most once"],
      ["Sum of subarray minimums: contribution of a[i]", "a[i] × (i − prevLess) × (nextLessOrEqual − i); strict one side, non-strict the other"],
      ["Largest Rectangle in Histogram: when a bar is popped", "Height = popped bar, width = i − (new top index) − 1; add a 0 sentinel to flush"],
      ["Maximal Rectangle in a binary matrix", "Build a histogram of consecutive 1s per row and run largest-rectangle on each: O(R·C)"],
      ["Next greater element in a circular array", "Loop i from 0 to 2n−1 using i mod n, push indices only in the first pass"],
      ["Remove K Digits strategy", "Monotonic increasing stack: pop larger tops while k > 0; trim leftover k from the end; strip leading zeros"],
      ["Longest Valid Parentheses with a stack", "Stack of indices seeded with −1; on ')' pop, if empty push i, else len = i − top"],
      ["Min Stack in O(1)", "Store (value, min so far) pairs, or a second stack that pushes on new minimums (≤)"],
      ["132 pattern scan", "Right to left with a decreasing stack; popped values become the best '2'; return true if a[i] < that value"],
      ["Basic Calculator II without a full parser", "Keep last operator; on + / − push ±num, on × / ÷ combine with the stack top; sum at the end"],
    ],
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
    cards: [
      ["Monotonic deque invariant for sliding window maximum", "Indices in increasing order with decreasing values; front is the max; pop front when index ≤ i − k"],
      ["Why pop smaller elements from the back?", "A newer, larger element outlives them, so they can never be the maximum again"],
      ["dp[i] = a[i] + max(dp[i−k..i−1]) in O(n)", "Keep a decreasing deque of dp values over the last k indices"],
      ["Shortest subarray with sum ≥ K (negatives)", "Increasing deque of prefix sums: pop front while pre[i] − pre[front] ≥ K, pop back while pre[back] ≥ pre[i]"],
      ["Longest subarray with max − min ≤ limit", "Two deques (max and min); shrink left while the difference exceeds the limit"],
      ["Queue with getMax in amortised O(1) using stacks", "Two stacks storing (value, max so far); move in-stack to out-stack when out is empty"],
      ["Max of every k×k submatrix", "Sliding max along each row, then along each column of the result"],
      ["Deque vs heap for window max", "Deque O(n) total; heap with lazy deletion O(n log n) but trivial to write"],
    ],
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
    cards: [
      ["Lower bound template", "lo = 0, hi = n; while lo < hi: mid = lo + (hi − lo)/2; if a[mid] < x: lo = mid + 1 else hi = mid; return lo"],
      ["Searching for the LAST true: which mid?", "Upper mid = lo + (hi − lo + 1)/2 with lo = mid, otherwise infinite loop"],
      ["Three things to state for binary search on the answer", "The range of answers, why feasibility is monotone, and the O(n) greedy check"],
      ["Find minimum in rotated sorted array: compare mid with…", "a[hi]: if a[mid] > a[hi] the minimum is right of mid, else hi = mid"],
      ["Rotated search with duplicates: worst case", "O(n), because a[lo] == a[mid] == a[hi] forces shrinking one step"],
      ["Median of two sorted arrays complexity and idea", "O(log min(m,n)): binary search a partition of the shorter array with maxLeft ≤ minRight"],
      ["K-th smallest in a sorted matrix by value search", "Binary search the value; count elements ≤ mid with a staircase walk in O(n)"],
      ["Aggressive cows / maximise the minimum distance", "Binary search the distance d; greedily place the next item at the first position ≥ last + d"],
      ["Search in an array of unknown length", "Double hi until a[hi] ≥ target, then binary search in [hi/2, hi]"],
      ["Overflow-safe midpoint", "lo + (hi − lo) / 2"],
      ["Random pick with weights", "Prefix sums of weights, draw r in [1, total], lower bound r"],
    ],
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
    cards: [
      ["Floyd cycle entry trick", "After slow and fast meet, move one to the head; step both by 1; they meet at the cycle start"],
      ["Middle of a list for even length: which middle?", "fast = head gives the second middle; start fast = head.next to get the first middle"],
      ["Remove N-th node from the end in one pass", "Dummy head; advance fast n steps, then move both until fast.next is null; unlink slow.next"],
      ["Reorder List L0→Ln→L1→Ln−1…", "Find middle, reverse second half, interleave the two halves"],
      ["Intersection of two lists in O(1) space", "Two pointers that switch to the other list's head at the end; they meet at the intersection or null"],
      ["Merge k sorted lists complexity", "O(N log k) with a min-heap of k heads or pairwise divide and conquer"],
      ["Sort a linked list in O(1) extra space", "Bottom-up merge sort with doubling run lengths"],
      ["Copy list with random pointers in O(1) space", "Interleave clones after originals, set clone.random = orig.random.next, then split"],
      ["Why use a dummy head?", "Removes special cases for inserting or deleting at the head"],
      ["Reverse a list iteratively", "prev = null; while cur: next = cur.next; cur.next = prev; prev = cur; cur = next"],
    ],
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
    cards: [
      ["Rerooting formula for sum of distances", "ans[child] = ans[parent] − size[child] + (n − size[child])"],
      ["Max path sum: what does the recursion return vs update?", "Returns node + max(0, best child chain); updates global with node + left gain + right gain"],
      ["Diameter of a binary tree", "At each node update best with leftHeight + rightHeight; return 1 + max of the two"],
      ["Morris traversal idea and cost", "Thread each node's in-order predecessor to it; O(n) time, O(1) space, tree restored"],
      ["Build tree from preorder + inorder in O(n)", "Root = next preorder value; hash map gives its inorder index; recurse left then right"],
      ["LCA in a binary tree (single query)", "Post-order: return node if it is p or q; if both sides return non-null, this node is the LCA"],
      ["Many LCA queries on a static tree", "Binary lifting: up[k][v] ancestors, O(n log n) build, O(log n) per query"],
      ["How does an Euler tour help subtree queries?", "Subtree of v becomes the contiguous range [tin[v], tout[v]], enabling Fenwick / segment tree"],
      ["Which traversal pairs reconstruct a unique binary tree?", "Inorder + preorder, or inorder + postorder; pre + post only if the tree is full"],
      ["Serialize a binary tree robustly", "Preorder with explicit null markers (or level order); length-prefix values if they contain delimiters"],
      ["All nodes at distance K from a target", "Build parent pointers (or a graph) and BFS outward K levels from the target"],
    ],
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
    cards: [
      ["In-order successor when no right child", "Lowest ancestor whose left subtree contains the node"],
      ["K-th smallest in a BST with frequent inserts", "Augment nodes with subtree size and descend: O(h) per query"],
      ["Delete a node with two children", "Replace its value with the in-order successor (min of right subtree), then delete that successor"],
      ["Validate BST: the robust method", "Recurse with (low, high) bounds, or check in-order is strictly increasing"],
      ["Recover a BST with two swapped nodes", "In-order: first = prev at the first inversion, second = current at the last inversion; swap values"],
      ["Sorted array to balanced BST", "Middle element as root, recurse on halves: O(n)"],
      ["Number of structurally unique BSTs with n keys", "Catalan(n) = C(2n, n) / (n + 1)"],
      ["Red-black vs AVL in one line", "AVL is more strictly balanced (faster reads); red-black does fewer rotations (faster writes), used by TreeMap / std::map"],
      ["BST iterator cost", "next() amortised O(1), O(h) memory, using a stack of the left spine"],
      ["Two-sum in a BST with O(h) space", "Forward and reverse in-order iterators used as two pointers"],
    ],
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
    cards: [
      ["Trie operation cost", "O(L) per insert/search, independent of dictionary size"],
      ["Max XOR of two numbers with a binary trie", "Insert bits MSB-first; for each number greedily follow the opposite bit when it exists: O(32n)"],
      ["Word Search II: the key prunings", "Traverse board and trie together; remove found words; delete exhausted leaf nodes"],
      ["Autocomplete top-k in O(L) per keystroke", "Cache the top-k list at every trie node; pay on update instead of on query"],
      ["Aho–Corasick in one sentence", "A trie with KMP-style failure links that finds all dictionary matches in O(text + total matches)"],
      ["Radix / Patricia tree", "Trie with single-child chains merged into one edge: fewer nodes, same lookups"],
      ["Trie vs hash set of words", "Trie supports prefix queries, ordered traversal and shared prefixes; hash set is simpler and faster for exact lookups"],
      ["Wildcard search ('.') cost", "Branches into all children at each dot: worst case O(26^dots × L)"],
      ["Stream of characters: does any suffix match a word?", "Build the trie on reversed words and walk backwards through the recent characters"],
      ["Longest prefix match is used in…", "IP routing tables, and resolved with a binary trie"],
    ],
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
    cards: [
      ["Why is build-heap O(n)?", "Sift-down from the bottom: half the nodes move 0 levels, a quarter 1 level… the sum converges to O(n)"],
      ["K-th largest in a stream", "Min-heap of size k; the top is the answer; O(log k) per element"],
      ["Heap index arithmetic (0-based)", "parent = (i−1)/2, children = 2i+1 and 2i+2"],
      ["Running median with two heaps", "Max-heap for the lower half, min-heap for the upper; keep sizes within 1; median from the tops"],
      ["Delete an arbitrary element from a heap", "Lazy deletion: mark it in a hash map and discard when it reaches the top (or use an ordered set)"],
      ["Merge k sorted lists of total size N", "Min-heap of k heads: O(N log k)"],
      ["Top K Frequent in O(n)", "Count, then bucket by frequency (index = count) and read buckets from high to low"],
      ["Course Schedule III greedy", "Sort by deadline; take each course; if total time exceeds the deadline pop the longest taken"],
      ["Task Scheduler lower bound formula", "max(n_tasks, (maxFreq − 1) × (cooldown + 1) + numberOfTasksWithMaxFreq)"],
      ["Smallest range covering elements from k lists", "Heap of one element per list tracking current max; pop min, advance that list, update best range"],
      ["Quickselect vs heap for k-th largest", "Quickselect O(n) average, O(n²) worst, needs the whole array; heap O(n log k), works online"],
    ],
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
    cards: [
      ["Skip-duplicates rule for combinations / subsets", "After sorting: if i > start and a[i] == a[i−1], continue"],
      ["Counts: subsets, permutations, valid parenthesis strings", "2ⁿ, n!, Catalan(n)"],
      ["N-Queens diagonal indices", "Main diagonal r − c (+ n − 1), anti-diagonal r + c"],
      ["K-th permutation without generating all", "Factorial number system: digit = k / (n−1)!, pick that unused element, k %= (n−1)!"],
      ["Combination Sum: reuse allowed vs not", "Recurse with i (reuse) or i + 1 (no reuse); never restart from 0 or you get permutations"],
      ["n ≈ 40 subset-sum style problem", "Meet in the middle: enumerate 2²⁰ sums per half, sort one half, binary search / two pointers"],
      ["Partition to K equal subsets: the key prunings", "Sort descending; skip buckets with equal current sum; break if placing in an empty bucket fails"],
      ["When does backtracking become DP?", "When the same state is reached by many paths: memoise it"],
      ["Sudoku speed-up heuristic", "Pick the empty cell with the fewest candidates first (most constrained variable)"],
      ["Classic backtracking bug", "Not undoing the choice (or storing a reference to the mutable path instead of a copy)"],
    ],
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
    cards: [
      ["When to mark a node visited in BFS", "When it is enqueued, not when it is dequeued"],
      ["Directed cycle detection with DFS", "Three colours: an edge to a grey (in-stack) node is a back edge, so there is a cycle"],
      ["Multi-source BFS", "Enqueue every source at distance 0; computes distance to the nearest source in O(V + E)"],
      ["Complexity of state-augmented BFS", "(number of positions × number of extra states) × transitions per state"],
      ["Shortest path visiting all nodes (n ≤ 12)", "BFS over (mask of visited, current node): O(2ⁿ · n²)"],
      ["Bidirectional BFS benefit", "Explores about 2·b^(d/2) nodes instead of b^d; always expand the smaller frontier"],
      ["Word Ladder neighbour generation", "Wildcard buckets (h*t) or try 26 letters per position; do not compare all word pairs"],
      ["Count distinct island shapes", "Record each island as cell offsets from its first cell, or as a DFS direction string with backtrack markers"],
      ["Clone a graph", "DFS/BFS with a hash map from original node to its copy, created before recursing into neighbours"],
      ["Pacific Atlantic trick", "Search backwards from each ocean's border going uphill; answer is the intersection"],
      ["BFS vs DFS memory", "BFS holds a whole frontier (wide graphs hurt); DFS holds one path (deep graphs hurt)"],
    ],
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
    cards: [
      ["How does Kahn's algorithm detect a cycle?", "Fewer than V nodes are emitted; the remainder have in-degree > 0 forever"],
      ["When is a topological order unique?", "When the queue never contains more than one node at any step"],
      ["Lexicographically smallest topological order", "Kahn with a min-heap instead of a queue"],
      ["Minimum semesters with unlimited parallel courses", "Number of BFS layers in Kahn = longest path in the DAG (in nodes)"],
      ["Longest path in a DAG", "Relax edges in topological order: dist[v] = max(dist[v], dist[u] + w); O(V + E)"],
      ["Alien Dictionary: the two edge cases", "A longer word before its own prefix is invalid; letters with no edges still must appear"],
      ["DFS-based topological order", "Append a node after all its descendants finish, then reverse the list"],
      ["Eventual safe states", "Nodes not on or leading to a cycle: reverse edges and Kahn from terminal nodes, or DFS colouring"],
      ["Minimum Height Trees approach", "Peel leaves layer by layer until 1 or 2 nodes remain (the tree centres)"],
    ],
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
    cards: [
      ["DSU complexity with both optimisations", "O(α(n)) amortised per operation (inverse Ackermann, effectively constant)"],
      ["How do you handle edge deletions with DSU?", "Process offline in reverse so deletions become unions, or use rollback DSU without path compression"],
      ["Detect a cycle in an undirected graph with DSU", "An edge whose endpoints already share a root closes a cycle"],
      ["Component is a tree iff…", "It is connected and edges = nodes − 1"],
      ["Weighted DSU for Evaluate Division", "Store ratio to parent; find multiplies ratios along the path; union sets the root ratio from the equation"],
      ["Offline 'path with all edges < limit' queries", "Sort edges and queries by weight; union edges below each limit, then check find(u) == find(v)"],
      ["Bipartite / enemy constraints with DSU", "Parity DSU, or union each node with the 'opposite' copy of its neighbour (2n nodes)"],
      ["Number of Islands II (online land additions)", "DSU over cells: count += 1 on new land, −1 for each successful union with a land neighbour"],
      ["Most Stones Removed answer", "stones − number of connected components (union rows with columns)"],
      ["Union by size vs rank", "Attach the smaller tree under the larger; size is also useful metadata, rank is an upper bound on height"],
    ],
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
    cards: [
      ["Dijkstra complexity with a binary heap", "O((V + E) log V); skip stale heap entries where d > dist[u]"],
      ["Why does Dijkstra break with negative edges?", "It finalises a node when popped; a negative edge later could still lower that distance"],
      ["Bellman–Ford: rounds and negative cycle test", "V − 1 rounds of relaxing all edges; any improvement in round V means a negative cycle"],
      ["Floyd–Warshall loop order", "k (intermediate) outermost, then i, then j: d[i][j] = min(d[i][j], d[i][k] + d[k][j])"],
      ["0-1 BFS", "Deque: push front for weight-0 edges, push back for weight-1 edges; O(V + E)"],
      ["Cheapest flight with at most K stops", "Bellman–Ford for K + 1 rounds using the previous round's array, or Dijkstra on (node, stops)"],
      ["Path that minimises the maximum edge", "Dijkstra with cost = max(soFar, edge), or binary search + BFS, or Kruskal until connected"],
      ["Shortest path in a DAG", "Relax edges in topological order: O(V + E), negative weights allowed"],
      ["A* requirement for optimality", "An admissible heuristic (never overestimates); consistent heuristics avoid re-expansions"],
      ["Count the number of shortest paths", "On strict improvement set ways[v] = ways[u]; on equal distance add ways[u]"],
      ["Dense graph Dijkstra", "O(V²) with an array scan for the minimum beats the heap when E ≈ V²"],
      ["'One free discount' shortest path", "Layered graph: state (node, discounts used); run Dijkstra over the expanded states"],
    ],
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
    cards: [
      ["Bridge condition in Tarjan's algorithm", "Tree edge (u, v) is a bridge iff low[v] > disc[u]"],
      ["Articulation point condition", "Non-root u with a child v where low[v] ≥ disc[u]; the root if it has 2+ DFS children"],
      ["MST cut property", "The minimum-weight edge crossing any cut belongs to some MST"],
      ["Kruskal vs Prim", "Kruskal: sort edges + DSU, O(E log E), good for sparse; Prim: grow from a node, O(V²) wins on dense graphs"],
      ["Eulerian path exists in a directed graph when…", "Connected on used edges, and all in = out, or one node has out − in = 1 and one has in − out = 1"],
      ["Hierholzer's algorithm", "DFS that consumes edges; append a node when it has no edges left; reverse the result: O(E)"],
      ["Kosaraju in two passes", "DFS to get finish order; DFS on the reversed graph in decreasing finish order; each tree is an SCC"],
      ["Bipartite check", "BFS/DFS 2-colouring; an edge with equal colours means an odd cycle"],
      ["2-SAT solvable iff…", "No variable shares an SCC with its negation in the implication graph"],
      ["Max-flow min-cut theorem", "The maximum flow value equals the minimum capacity of a cut separating source and sink"],
      ["TSP exact complexity", "Bitmask DP dp[mask][last]: O(2ⁿ · n²)"],
    ],
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
    cards: [
      ["LIS in O(n log n)", "tails[] of smallest tail per length; for each x replace lower_bound(x) (strict) or append"],
      ["Russian Doll Envelopes reduction", "Sort by width ascending and height descending, then LIS on heights"],
      ["House Robber on a circle", "max(rob(0..n−2), rob(1..n−1)): break the circle by excluding one end"],
      ["Stock with cooldown: states", "hold, sold (just sold), rest; hold = max(hold, rest − p); sold = hold + p; rest = max(rest, sold)"],
      ["Stock with at most k transactions", "dp[t][i] with running best of dp[t−1][j] − price[j]: O(n·k); if k ≥ n/2 it is unlimited"],
      ["Word Break recurrence", "dp[i] = OR over j of dp[j] and s[j..i) in dict; limit i − j to the longest word"],
      ["Weighted job scheduling", "Sort by end; dp[i] = max(dp[i−1], profit[i] + dp[p(i)]) where p(i) is found by binary search"],
      ["The four DP questions", "State? Transition? Base cases? Evaluation order (and what is the answer cell)?"],
      ["Decode Ways transitions", "dp[i] += dp[i−1] if s[i−1] ≠ '0'; dp[i] += dp[i−2] if 10 ≤ two-digit ≤ 26"],
      ["Linear recurrence with n up to 10¹⁸", "Matrix exponentiation: O(k³ log n)"],
      ["Number of LIS", "Track len[i] and cnt[i]; on equal length add counts, on longer length replace"],
    ],
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
    cards: [
      ["LCS recurrence", "match: dp[i−1][j−1] + 1; else max(dp[i−1][j], dp[i][j−1])"],
      ["Edit distance recurrence", "same char: dp[i−1][j−1]; else 1 + min(dp[i−1][j] delete, dp[i][j−1] insert, dp[i−1][j−1] replace)"],
      ["Shortest common supersequence length", "m + n − LCS(s, t)"],
      ["Longest palindromic subsequence via LCS", "LCS(s, reverse(s)); min insertions to make a palindrome = n − LPS"],
      ["Regex '*' transitions", "Zero copies: dp[i][j−2]; one more copy: s[i−1] matches p[j−2] and dp[i−1][j]"],
      ["Wildcard '*' transitions", "dp[i][j] = dp[i][j−1] (match empty) or dp[i−1][j] (consume one char)"],
      ["Maximal Square recurrence", "If cell is 1: dp = 1 + min(top, left, top-left)"],
      ["Distinct Subsequences recurrence", "dp[i][j] = dp[i−1][j] + (s[i−1] == t[j−1] ? dp[i−1][j−1] : 0)"],
      ["Longest palindromic substring options", "Expand around 2n−1 centres O(n²) / O(1) space; Manacher O(n)"],
      ["Cherry Pickup state", "Two walkers moving simultaneously: (steps, r1, r2), columns derived; O(n³)"],
      ["Dungeon Game: why solve backwards?", "Required health depends on the future path; dp from the bottom-right gives min health needed"],
      ["Unique paths closed form", "C(m + n − 2, m − 1)"],
    ],
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
    cards: [
      ["0/1 knapsack inner loop direction", "Capacity from high to low, so each item is used at most once"],
      ["Unbounded knapsack inner loop direction", "Capacity from low to high, so an item can be reused"],
      ["Count combinations vs permutations of coins", "Coins outer loop → combinations; amount outer loop → permutations"],
      ["Target Sum reduction", "Find subsets with sum (total + target) / 2; impossible if that is negative or not an integer"],
      ["Why is knapsack 'pseudo-polynomial'?", "O(n·W) depends on the numeric value W, which is exponential in its bit length"],
      ["Bitset subset-sum", "reach |= reach << w for each item; bit s is set iff sum s is reachable"],
      ["Greedy fails for coin change: example", "Coins {1, 3, 4}, amount 6: greedy gives 4+1+1 (3 coins), optimal is 3+3"],
      ["Last Stone Weight II", "Partition into two piles minimising the difference: subset sum closest to total/2"],
      ["Bounded knapsack with count c", "Binary splitting into bundles 1, 2, 4, … (log c items) then 0/1 knapsack"],
      ["Huge capacity but small values", "Swap the roles: dp[v] = minimum weight to reach value v"],
      ["Initialising 'exactly fill' vs 'at most' knapsack", "Exactly: dp[0] = 0, others −∞ (or ∞ for min); at most: all 0"],
    ],
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
    cards: [
      ["Burst Balloons insight", "Choose the LAST balloon k burst in (l, r): dp[l][r] = max(dp[l][k] + a[l]·a[k]·a[r] + dp[k][r])"],
      ["Enumerate all submasks of a mask", "for (sub = mask; sub; sub = (sub − 1) & mask); total over all masks is O(3ⁿ)"],
      ["Game DP state for two optimal players", "Best score difference for the player to move: dp[state] = max(gain − dp[next])"],
      ["Digit DP state", "(position, tight flag, leading-zero flag, problem-specific info); count for [L, R] = f(R) − f(L−1)"],
      ["Super Egg Drop reformulation", "f(m, k) = f(m−1, k−1) + f(m−1, k) + 1 floors coverable with m moves and k eggs; find smallest m"],
      ["House Robber III return value", "A pair per node: (best if robbed, best if skipped)"],
      ["Sprague–Grundy theorem", "A sum of impartial games is losing iff the XOR of their Grundy numbers is 0"],
      ["Assignment problem with bitmask DP", "dp[mask] where popcount(mask) is the next worker; O(2ⁿ · n)"],
      ["Matrix chain multiplication recurrence", "dp[i][j] = min over k of dp[i][k] + dp[k+1][j] + p[i−1]·p[k]·p[j]; O(n³)"],
      ["Convex hull trick applies when…", "dp[i] = min_j(dp[j] + m_j · x_i): a minimum over lines evaluated at x_i"],
      ["What makes a DP state valid?", "Sufficiency: the optimal future depends on the past only through the state"],
      ["Linearity of expectation", "E[X + Y] = E[X] + E[Y] even when X and Y are dependent"],
    ],
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
    cards: [
      ["Maximum number of non-overlapping intervals", "Sort by END time; take an interval whenever its start ≥ last taken end"],
      ["Exchange argument in one sentence", "Show any optimal solution can be transformed into the greedy one by swaps that never make it worse"],
      ["Gas Station rule", "If total gas ≥ total cost a solution exists; whenever the tank goes negative, restart from the next station"],
      ["Jump Game II", "Greedy BFS: track current range end and farthest reach; increment jumps when i hits the range end"],
      ["Candy", "Two passes: left-to-right for increasing left neighbours, right-to-left taking the max"],
      ["Largest Number comparator", "Order a before b if a + b > b + a as strings"],
      ["Queue Reconstruction by Height", "Sort by height descending, k ascending; insert each person at index k"],
      ["Huffman / connect sticks greedy", "Repeatedly merge the two smallest with a min-heap"],
      ["Two City Scheduling", "Sort by costA − costB; first half to A, second half to B"],
      ["Minimum arrows to burst balloons", "Sort by end; shoot at the end of the first balloon; skip all balloons that start ≤ that point"],
      ["Partition Labels", "Record last occurrence of each char; extend the current part to the max last index; cut when i reaches it"],
      ["Greedy approximation for set cover", "Pick the set covering the most uncovered elements: ln n approximation"],
    ],
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
    cards: [
      ["Overlap test for [a, b] and [c, d] (closed)", "a ≤ d and c ≤ b"],
      ["Minimum meeting rooms via sweep", "+1 at each start, −1 at each end, sort (ends first on ties for half-open), max running sum"],
      ["Minimum intervals to remove for no overlaps", "n − (max non-overlapping set), found by sorting on end time"],
      ["Interval list intersections", "Two pointers: intersection is [max starts, min ends] if valid; advance the one with the smaller end"],
      ["Insert an interval into a sorted disjoint list", "Copy intervals ending before it, merge all that overlap, copy the rest: O(n)"],
      ["Skyline key idea", "Sweep x-events with a max-multiset of active heights; output when the current max changes"],
      ["Range Module data structure", "Ordered map of disjoint intervals; add/remove by finding overlapping neighbours and merging or splitting"],
      ["Interval tree augmentation", "BST keyed by start storing the max end in each subtree, for O(log n) overlap queries"],
      ["Employee Free Time", "Merge all busy intervals (sort or k-way heap), then report gaps between consecutive merged intervals"],
      ["Video stitching / minimum taps greedy", "Among intervals starting within the covered prefix choose the one reaching furthest; count picks"],
      ["My Calendar II (no triple booking)", "Keep a list of bookings and a list of double-booked overlaps; reject if the new event hits an overlap"],
    ],
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
    cards: [
      ["Clear the lowest set bit / isolate it", "x & (x − 1) / x & −x"],
      ["Power of two test", "x > 0 and (x & (x − 1)) == 0"],
      ["Single Number II (others appear three times)", "Sum each bit mod 3, or ones = (ones ^ x) & ~twos; twos = (twos ^ x) & ~ones"],
      ["Single Number III (two uniques)", "XOR all, pick a set bit of the result, split numbers by that bit and XOR each group"],
      ["Counting bits for 0..n in O(n)", "dp[i] = dp[i >> 1] + (i & 1)"],
      ["Total Hamming distance of all pairs", "For each bit: (count of ones) × (count of zeros), summed over bits"],
      ["Add two integers without +", "sum = a ^ b, carry = (a & b) << 1; repeat until carry is 0 (mask to 32 bits in Python)"],
      ["Bitwise AND of range [m, n]", "Common binary prefix: shift both right until equal, then shift back"],
      ["Gray code of i", "i ^ (i >> 1)"],
      ["Distinct values of OR over subarrays ending at i", "At most ~log(max) of them, since OR only gains bits"],
      ["Set operations with masks", "Union a | b, intersection a & b, difference a & ~b, membership (a >> i) & 1"],
      ["Missing number in 0..n", "XOR of all indices 0..n with all values (or n(n+1)/2 − sum, watching overflow)"],
    ],
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
    cards: [
      ["Reservoir sampling of 1 item from a stream", "Replace the kept item with the i-th item with probability 1/i"],
      ["Fisher–Yates shuffle", "For i from 0 to n−1 swap a[i] with a[j], j uniform in [i, n−1]"],
      ["Modular inverse for prime M", "a^(M−2) mod M by Fermat's little theorem"],
      ["Rand10 from Rand7", "v = (rand7 − 1) × 7 + rand7 in 1..49; accept v ≤ 40 and return 1 + (v − 1) % 10; else retry"],
      ["Sieve of Eratosthenes complexity", "O(n log log n); start crossing out at p²"],
      ["Trailing zeros of n!", "n/5 + n/25 + n/125 + …"],
      ["Stars and bars", "Ways to put n identical items into k bins: C(n + k − 1, k − 1)"],
      ["gcd complexity and lcm formula", "O(log min(a, b)); lcm = a / gcd(a, b) × b"],
      ["Orientation of three points", "Sign of cross product (b − a) × (c − a): > 0 counter-clockwise, < 0 clockwise, 0 collinear"],
      ["Max Points on a Line without floats", "For each anchor hash slopes as (dy/g, dx/g) reduced by gcd with a normalised sign"],
      ["Best meeting point under Manhattan distance", "The median of x coordinates and the median of y coordinates, independently"],
      ["Pow(x, n) edge case", "n = INT_MIN: negating overflows; use a 64-bit exponent"],
      ["Josephus recurrence", "J(1) = 0; J(n) = (J(n−1) + k) mod n"],
    ],
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
    cards: [
      ["KMP lps[i] definition", "Length of the longest proper prefix of p[0..i] that is also a suffix of it"],
      ["Smallest period of a string from KMP", "n − lps[n−1]; the string is a repetition iff that divides n and lps[n−1] > 0"],
      ["Z-function definition and search use", "z[i] = LCP of s and s[i..]; compute on p + '$' + t and look for z[i] == |p|"],
      ["Rolling hash update", "h = (h × base + c) mod M; remove the leading char by subtracting c × base^(L−1)"],
      ["Longest duplicate substring", "Binary search the length; check with a rolling-hash set: O(n log n)"],
      ["Shortest Palindrome (add characters in front)", "Longest palindromic prefix = last lps value of s + '#' + reverse(s)"],
      ["Is t a rotation of s?", "Same length and t is a substring of s + s"],
      ["Manacher's algorithm", "All longest palindromes around every centre in O(n) by mirroring within the rightmost palindrome"],
      ["Number of distinct substrings with a suffix array", "n(n + 1)/2 − sum of the LCP array"],
      ["Encode a list of strings safely", "Length prefix + delimiter (e.g. 5#hello) so any character may appear in the payload"],
      ["Rabin–Karp complexity", "O(n + m) expected; O(n·m) worst case if every window collides and is verified"],
      ["Why is += in a loop quadratic for strings?", "Strings are immutable: each concatenation copies the whole prefix; use a builder / join"],
    ],
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
    cards: [
      ["Fenwick update and query steps", "Update: i += i & −i; prefix query: i −= i & −i (1-indexed)"],
      ["Fenwick vs segment tree", "Fenwick: prefix-invertible ops (sum), tiny code; segment tree: any associative merge, range updates with lazy tags"],
      ["Sparse table: build, query, limitation", "O(n log n) build, O(1) query for idempotent ops (min/max/gcd); no updates"],
      ["Count of smaller numbers after self", "Scan right to left; BIT over compressed values; query prefix count then add (or merge-sort counting)"],
      ["2D prefix sum query", "S(r2,c2) − S(r1−1,c2) − S(r2,c1−1) + S(r1−1,c1−1)"],
      ["What is lazy propagation?", "A pending update stored at a node covering a whole range, pushed to children only when needed"],
      ["Segment tree node for max-subarray queries", "(total sum, best prefix, best suffix, best subarray) with a 4-way merge"],
      ["Mo's algorithm complexity and requirement", "O((n + q)√n); offline queries with O(1) add/remove at window ends"],
      ["Coordinate compression", "Sort and deduplicate values, replace each by its rank so structures index 0..k−1"],
      ["Range add + point query with a BIT", "Store the difference array: add v at l, −v at r + 1; point value = prefix sum"],
      ["K-th smallest in a range (static array)", "Persistent segment tree over values, or merge-sort tree with binary search"],
    ],
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
    cards: [
      ["LRU cache structures", "Hash map key → node + doubly linked list ordered by recency; all ops O(1)"],
      ["LFU cache structures", "key → (value, freq); freq → ordered list of keys; minFreq pointer; evict oldest in minFreq list"],
      ["O(1) getRandom with delete", "Array + map value → index; swap the victim with the last element, pop"],
      ["Queue from two stacks", "Push to in-stack; pop from out-stack, refilling it from in-stack when empty: amortised O(1)"],
      ["Time-based key-value store", "Per key an append-only list of (timestamp, value); binary search the floor timestamp"],
      ["Snapshot Array efficiently", "Per index a list of (snapId, value) changes; get = binary search the last change ≤ snapId"],
      ["Hit counter for the last 300 seconds", "Circular array of 300 (timestamp, count) buckets; reset a bucket when its timestamp is stale"],
      ["All O(1) inc/dec/getMax/getMin", "Doubly linked list of count buckets, each holding a set of keys, plus key → bucket map"],
      ["Max Stack with popMax", "Doubly linked list + ordered map from value to list of nodes: O(log n); or two heaps with lazy deletion"],
      ["Open addressing vs chaining", "Probing: cache friendly, needs tombstones and low load; chaining: simple deletes, extra pointers"],
      ["Flatten nested list iterator", "Stack of iterators (or reversed lists); hasNext drills down until the top is an integer"],
      ["First step in any design-a-structure question", "Write the operation table with target complexities before choosing structures"],
    ],
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
    cards: [
      ["Rotate a matrix 90° clockwise in place", "Transpose, then reverse each row"],
      ["Diagonal identifiers", "Main diagonal: r − c constant; anti-diagonal: r + c constant"],
      ["Search a row- and column-sorted matrix", "Start top-right: move left if too big, down if too small: O(m + n)"],
      ["Set Matrix Zeroes in O(1) space", "Use first row and column as markers plus a flag for the first column; fill from the bottom-right"],
      ["Flatten (r, c) to 1D and back", "id = r × cols + c; r = id / cols; c = id % cols"],
      ["Count submatrices summing to target", "Fix a pair of rows, compress columns to 1D, apply subarray-sum-equals-K: O(R²·C)"],
      ["Game of Life in place", "Encode old and new state in two bits (or use 2 = was alive now dead, 3 = was dead now alive)"],
      ["Spiral traversal bookkeeping", "Four bounds top/bottom/left/right; shrink after each side; re-check bounds before the last two sides"],
      ["K-th smallest in a sorted matrix", "Min-heap k-way merge O(k log n), or binary search on value with staircase counting O(n log range)"],
      ["Sparse matrix multiplication", "Iterate only non-zero entries of A's rows and matching non-zeros of B: skip zeros entirely"],
    ],
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
    cards: [
      ["Which common sorts are stable?", "Merge, insertion, counting/radix, Timsort; quicksort and heapsort are not"],
      ["Quicksort worst case and the fix", "O(n²) on bad pivots; randomise the pivot and use 3-way partitioning for duplicates"],
      ["Quickselect complexity", "O(n) average, O(n²) worst; median-of-medians guarantees O(n)"],
      ["Sort a k-sorted (nearly sorted) array", "Min-heap of size k + 1: O(n log k)"],
      ["Count inversions", "Merge sort: when taking from the right half, add the number of remaining left elements"],
      ["Maximum Gap in O(n)", "n − 1 buckets by (max − min)/(n − 1); the answer spans adjacent non-empty buckets (pigeonhole)"],
      ["External sort of data larger than memory", "Sort memory-sized runs to disk, then k-way merge with a min-heap"],
      ["What do library sorts use?", "C++ std::sort: introsort; Python and Java objects: Timsort; Java primitives: dual-pivot quicksort"],
      ["Comparator requirement", "Strict weak ordering: irreflexive, antisymmetric, transitive; avoid a − b overflow"],
      ["Radix sort complexity", "O(d · (n + b)) for d digits in base b"],
      ["Reverse Pairs (i < j, a[i] > 2·a[j])", "Merge sort: count with a two-pointer pass across sorted halves before merging"],
      ["Bound quicksort's stack to O(log n)", "Recurse into the smaller partition, loop on the larger"],
    ],
  },
  "advanced-techniques": {
    pre: ["range-queries", "dp-advanced", "advanced-graphs"],
    cards: [
      ["Meet in the middle", "Split n ≈ 40 into halves, enumerate 2²⁰ each, combine by sorting / hashing: O(2^(n/2) · n)"],
      ["Binary lifting table", "up[k][v] = up[k−1][up[k−1][v]]; k-th ancestor by the bits of k; LCA in O(log n)"],
      ["Sqrt decomposition", "Blocks of size √n: partial blocks element-wise, full blocks from a summary; O(√n) per op"],
      ["Mo's algorithm ordering", "Sort queries by (block of l, r); move the window ends; O((n + q)√n)"],
      ["Sweep line with events", "Sort events by coordinate with a tie-break rule; maintain an active set (heap / BIT / multiset)"],
      ["Max bipartite matching: where it hides", "Assign workers to jobs, tile with dominoes, minimum vertex cover = max matching (König)"],
      ["Monotone-predicate + offline queries", "Sort queries by the parameter and add elements incrementally (DSU / BIT / heap)"],
      ["Small-to-large merging", "Always merge the smaller set into the larger: each element moves O(log n) times"],
      ["Randomisation uses", "Random pivot, random hashing base, random sampling to defeat adversarial inputs"],
      ["When is an approximate / heuristic answer acceptable?", "NP-hard problems at scale: state the hardness, then give greedy, DP on small n, or an approximation bound"],
    ],
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
