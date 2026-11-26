/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */
export const notes: Record<string, string> = {
  "opposite-pointers": `
## Pattern
Sorted input, l = 0 and r = n−1; compare a[l] + a[r] with the target: too small → l++, too big → r−−.
Each step discards one element for good, so the scan is O(n).
## Why discarding is safe
If a[l] + a[r] < target, a[l] pairs with nothing remaining (r is already the largest left), so drop l.
The same argument from the other side drops r when the sum is too big.
## 3Sum and k-Sum
Sort, fix i, two-pointer on the rest: O(n²). Skip duplicate values for i, l and r to avoid repeated triplets.
Early exits: break if a[i] > 0 (for target 0); k-Sum recurses down to 2Sum: O(n^(k−1)).
3Sum closest: track the best |sum − target| while moving the pointers.
## Container With Most Water (LC 11)
Area = min(h[l], h[r]) × (r − l). Move the shorter side: keeping it can never give a larger area.
## Trapping Rain Water (LC 42)
Water at i = min(maxLeft, maxRight) − h[i].
Two pointers: move the side with the smaller max; that max bounds its water. O(n) time, O(1) space.
Alternatives: prefix and suffix max arrays (O(n) space) or a monotonic stack (fills by layers).
## Other uses
Valid palindrome (skip non-alphanumerics; LC 680 allows one deletion: try both skips once).
Reverse an array or a string in place. Squares of a sorted array: fill from the back with the bigger |value|.
Two-sum count pairs below target: when a[l] + a[r] < t, add r − l pairs at once.
## Unsorted input
Sort first (O(n log n)) if indices are not needed; otherwise use a hash map (Two Sum, O(n)).
`,
  "same-direction-pointers": `
## Read/write pointers
read scans every element; write marks where the next kept element goes. Kept → a[write++] = a[read].
Remove element, move zeroes (then fill the tail with zeros), remove duplicates from a sorted array.
Keep at most k copies (LC 80): keep a[read] if write < k or a[read] ≠ a[write − k].
Stable and O(1) extra space; returns the new length = write.
## Subsequence check
Is s a subsequence of t: i over s, j over t; advance i on a match; true if i reaches len(s). O(|t|).
Many queries: precompute next-occurrence tables or per-letter index lists plus binary search.
## Different speeds
Fast/slow on arrays: the slow pointer marks a boundary while the fast one explores.
Linked lists use the same idea: middle node, cycle detection, k-th from the end (lead by k).
## Pitfalls
Off-by-one in the returned length; comparing with the wrong neighbour when deduping (compare with a[write−1], not a[read−1]).
Order matters? Read/write preserves order; swap-with-end does not.
`,
  "array-partition": `
## Two-way partition
Lomuto: one boundary i; scan j, swap a[j] into the "≤ pivot" region. Simple, more swaps.
Hoare: two pointers move inward and swap misplaced pairs. Fewer swaps, returns a split point, not the pivot's final index.
Used by quicksort and quickselect (k-th largest in expected O(n)).
Even/odd, negatives before positives: a predicate partition.
## Dutch national flag (three-way)
Three regions: low (< pivot), mid (= pivot), high (> pivot); pointers lo, mid, hi.
a[mid] < p: swap with lo, lo++, mid++. a[mid] = p: mid++. a[mid] > p: swap with hi, hi−− (do not advance mid: the swapped-in value is unchecked).
Sort Colors (LC 75) in one pass, O(1) space.
Three-way partitioning makes quicksort robust when many keys are equal.
## Variants
Quickselect: partition, recurse into the side holding k; randomise the pivot to avoid O(n²).
Wiggle sort II: median by quickselect, then three-way partition on virtual (interleaved) indices.
Stable partition needs O(n) extra space, or O(n log n) time in place.
Partition labels (LC 763) is a different "partition": greedy on last occurrence.
`,
  "merge-pointers": `
## Merge
i over A, j over B; take the smaller head; append the leftover tail. O(n + m).
Take from A on ties (≤) for stability.
In place into A with spare room at its end: fill from the back (LC 88).
## Intersection and union
Sorted inputs: advance the smaller pointer; equal → output (intersection) and advance both.
Unsorted: hash set, or sort first. Duplicates: decide whether to keep multiplicities.
Interval list intersections (LC 986): overlap = [max(starts), min(ends)]; advance the one that ends first.
## Merge k sorted
Min-heap of the k heads: O(N log k). Or merge pairwise in rounds (divide and conquer), also O(N log k).
Merging one by one costs O(N·k).
## Comparing sorted sequences
Backspace string compare: walk both from the end, skipping deleted characters: O(1) space.
Version numbers: split on dots, compare piece by piece, treat missing pieces as 0.
Smallest range covering k lists: heap of heads, track the current max.
`,
  "fixed-window": `
## Loop
Add a[i]; once i ≥ k−1, record the answer; then remove a[i−k+1] before moving on.
O(n) total: each element enters and leaves once.
## What the window maintains
A running sum (maximum average of length k), a count map (anagram / permutation in string), or the number of "good" items.
Permutation in string (LC 567) and find all anagrams (LC 438): compare 26-count arrays, or track how many letters match.
Maximum of each window: needs a monotonic deque (see that page).
## Variants
Sum of window minimums/maximums: deque. Distinct count in a window: count map plus a distinct counter.
Circular windows: iterate i up to n + k − 1 and use i mod n.
Fixed window over a string of words (LC 30): step by word length; run one window per offset.
Pitfalls: decrementing a count to 0 without deleting the key breaks "len(map)" distinct counts.
`,
  "variable-window": `
## Two templates
Longest valid window: expand r; while invalid, shrink l; record r − l + 1 after the shrink.
Shortest valid window: expand r; while valid, record and shrink l.
Each pointer moves at most n times → O(n).
## When the method is correct
Validity must be monotone: if [l, r] is valid, every sub-window is valid (for "longest"), or every super-window is valid (for "shortest").
Negative numbers break "sum ≤ k"-type monotonicity: use prefix sums, a deque, or binary search instead.
## Classic problems
Longest substring without repeats (LC 3): last-seen index map; l = max(l, last[c] + 1).
Longest repeating character replacement (LC 424): valid while (length − maxFreq) ≤ k; maxFreq need not decrease when shrinking.
Minimum size subarray sum ≥ target (LC 209): positive numbers, shortest template.
Max consecutive ones III (LC 1004): at most k zeros in the window.
Fruit into baskets (LC 904): at most 2 distinct.
## Minimum window substring (LC 76)
need = counts of t; "formed" = number of characters whose count is satisfied.
Expand until formed == required, then shrink while still valid, recording the minimum.
O(|s| + |t|) time.
## Details
The stale maxFreq trick (LC 424) works because the answer only grows when maxFreq grows.
Use a fixed array for small alphabets; a hash map otherwise.
`,
  "count-windows": `
## Counting with a window
For "at most k" constraints, each r adds (r − l + 1) new valid subarrays: all those ending at r.
## Exactly k
exactly(k) = atMost(k) − atMost(k − 1).
Subarrays with k distinct (LC 992); binary subarrays with sum (LC 930); count nice subarrays with k odds (LC 1248).
Works because "at most" is monotone, while "exactly" is not.
## At least k
atLeast(k) = total − atMost(k − 1), or: once the window is valid, all extensions to the right count (add n − r).
Number of substrings containing all three characters (LC 1358): for each r, count of valid l is the leftmost valid start + 1.
## Three-pointer alternative
Keep two left pointers: the smallest l with ≤ k distinct and the smallest l with ≤ k−1 distinct; add their difference per r.
## Complexity
O(n) per atMost call, so O(n) overall; space is the count map.
Prefix sum + hash map is the alternative for sums (and the only one with negatives).
`,
  "window-structures": `
## Pairing
When the window must answer max, min, median or "is any value near x", put a structure inside it.
Monotonic deques give max/min in amortised O(1); ordered multisets give everything in O(log k).
## Longest subarray with |max − min| ≤ limit (LC 1438)
Two monotonic deques (decreasing for max, increasing for min); shrink l while max − min > limit.
Pop a deque's front when its index falls out of the window. O(n).
## Sliding window median (LC 480)
Two heaps with lazy deletion (a "to delete" count map, cleaned when the item reaches a top), kept balanced: O(n log k).
Or an ordered multiset / SortedList: insert, remove and index the middle in O(log k).
## Contains duplicate III (LC 220)
Ordered set of the last k values: is there a value in [x − t, x + t]? Use ceiling(x − t).
Bucket trick: bucket width t + 1; check the same and adjacent buckets: O(n).
## Picking
Max/min only → deque. Order statistics or arbitrary deletes → ordered multiset or two heaps. Frequency → count map.
State the structure's per-operation cost and multiply by n.
`,
  "stack-parsing": `
## Matching
Valid parentheses: push openers; on a closer, the top must match; the stack must be empty at the end.
Minimum additions or removals: count unmatched openers and closers (a counter suffices for one bracket type).
Longest valid parentheses (LC 32): push indices with a −1 base; on an unmatched ')', reset the base.
## Expression evaluation
Postfix (RPN): push numbers; an operator pops two (the right operand comes off first).
Infix with + − × ÷: keep the last operator; + / − push ±num; × / ÷ apply to the top (Basic Calculator II).
Parentheses with + − (Basic Calculator I): push (result, sign) on '(', pop and combine on ')'.
Full precedence: shunting-yard (operator stack plus output) or recursive descent.
Integer division truncates toward zero: int(a / b) in Python, not a // b.
## Nested decoding
Decode string "3[a2[c]]": push (current string, repeat count) on '['; on ']' pop and build prev + k × current.
Multi-digit counts: accumulate num = num·10 + d.
## Paths and history
Simplify Unix path: split on '/', skip "" and ".", pop on "..", join.
Browser history, undo stacks and asteroid collision are stacks of pending state.
## Why stacks fit
Nesting is last-opened, first-closed: exactly LIFO. Recursion is an implicit stack; an explicit stack avoids depth limits.
`,
  "monotonic-stack": `
## Next greater element
Keep a stack of indices with decreasing values; when a[i] is bigger than the top, the top's next greater is a[i]; pop and repeat; push i.
Each index is pushed and popped once → O(n).
## Four variants
Next greater → decreasing stack, scan left to right. Next smaller → increasing stack.
Previous greater/smaller: the element left on top after popping is the answer for i.
Strict vs non-strict comparison decides how equal values are treated.
Circular arrays: loop i over 2n and use i mod n.
## Contribution counting
Sum of subarray minimums (LC 907): a[i] is the minimum of left[i] × right[i] subarrays, where left and right are the distances to the previous smaller and next smaller.
Use strict on one side and non-strict on the other so equal values are not counted twice.
Sum of subarray ranges = Σ max-contributions − Σ min-contributions.
## Classic problems
Daily temperatures (LC 739): distance to the next greater.
Online stock span (LC 901): previous greater-or-equal, popping and merging spans.
Remove k digits (LC 402) and smallest subsequence of distinct characters (LC 1081): keep an increasing stack, pop while the top is larger and removals remain.
132 pattern (LC 456): scan from the right with a decreasing stack, tracking the popped "2".
Car fleet, asteroid collision and trapping rain water (layer by layer) use the same machinery.
## Recognising it
"Nearest bigger/smaller to the left or right", or "for each element, how far does it dominate".
`,
  histogram: `
## Largest rectangle in histogram (LC 84)
For each bar, the widest rectangle at its height spans from the previous smaller bar to the next smaller bar.
Increasing stack of indices; when h[i] < h[top], pop top: height = h[top], width = i − newTop − 1 (or i if the stack is empty).
Append a 0-height sentinel at the end to flush the stack. O(n).
## Maximal rectangle (LC 85)
Build heights row by row (height += 1 on a '1', reset to 0 on a '0') and run LC 84 on each row: O(rows × cols).
Maximal square is a different DP: dp = 1 + min(top, left, diagonal).
## Related
Count submatrices of all ones (LC 1504): a per-row monotonic stack, or the O(n·m²) histogram sum.
Trapping rain water with a stack: pop a bottom, water = (min(left, right) − bottom) × width.
Largest rectangle with fixed width k: a sliding-window minimum.
## Divide and conquer alternative
Split at the minimum bar: best = max(min × width, left part, right part). O(n log n) with a segment tree for the minimum; O(n²) worst case on sorted input without one.
`,
  "stack-design": `
## Min stack (LC 155)
Push (value, min so far) pairs, or keep a second stack of minimums (push when ≤ the current minimum).
Every operation O(1). The single-variable encoding (store 2x − min) saves space but risks overflow.
## Max stack with popMax (LC 716)
Doubly linked list plus an ordered map from value → list of nodes: every operation O(log n).
Or two heaps with lazy deletion by id.
## Queue from two stacks (LC 232)
Push onto in; pop/peek from out; when out is empty, move all of in to out.
Each element moves once → amortised O(1).
## Stack from queues (LC 225)
On push, enqueue then rotate the queue n−1 times so the newest is at the front: push O(n), pop O(1).
## Maximum frequency stack (LC 895)
freq map: value → count; group map: count → stack of values; maxFreq.
Push: freq++, push onto group[freq]. Pop: pop group[maxFreq]; if it empties, maxFreq−−. All O(1).
## Persistent stacks
A linked list where push creates a new head sharing the tail: versions cost O(1) each and are immutable.
Undo/redo uses two stacks; a new action clears redo.
`,
  "queues-deques": `
## Queue
FIFO: enqueue at the back, dequeue from the front, both O(1).
BFS, level order, task buffers and producer–consumer pipelines.
## Implementations
Linked list with head and tail; or a circular buffer: head index plus size, positions taken mod capacity.
Circular buffer: full when size == capacity; to grow, copy into a bigger buffer in logical order.
Python: collections.deque (never list.pop(0)). Java: ArrayDeque (faster than LinkedList; does not accept null).
C++: std::deque (blocks of arrays; iterators invalidated on insert).
## Deque
Push and pop at both ends in O(1). Doubles as a stack and a queue.
Monotonic deques, 0-1 BFS, palindrome checks and sliding windows use it.
Design circular deque (LC 641): front and rear indices mod k, plus a count.
## Priority queue is not a queue
It serves by priority, not arrival order, at O(log n) per operation (heap).
## Interview problems
Moving average from a data stream: queue plus running sum.
Number of recent calls: pop timestamps older than t − 3000.
Design hit counter: queue, or a 300-slot circular buffer of (timestamp, count).
Rotting oranges, walls and gates: multi-source BFS seeded with all sources at once.
`,
  "monotonic-deque": `
## Sliding window maximum (LC 239)
Deque of indices with decreasing values.
For each i: pop the back while a[back] ≤ a[i]; push i; pop the front if it left the window (front ≤ i − k); the front is the max.
O(n): each index enters and leaves once.
## Why discarded elements are useless
An element smaller than a newer one can never be the max again: the newer one outlives it in every future window.
Minimum: keep values increasing instead.
## Shortest subarray with sum at least K (LC 862)
Negative numbers allowed, so no plain sliding window. Use prefix sums P and an increasing deque of indices.
For each j: while P[j] − P[front] ≥ K, record j − front and pop the front; while P[back] ≥ P[j], pop the back; push j.
O(n).
## Deque-optimised DP
dp[i] = a[i] + max(dp[i−k..i−1]): the sliding-window max of dp gives O(n) instead of O(nk).
Constrained subsequence sum (LC 1425), jump game VI (LC 1696).
## Related
Longest subarray with |max − min| ≤ limit: two deques.
Max value of yi + yj + |xi − xj| (LC 1499): a deque on yi − xi.
`,
  "deque-dp": `
## Shape
dp[i] = cost(i) + best over j in a sliding range [i − k, i − 1] of dp[j] (or of dp[j] + f(j)).
The range moves forward monotonically, so a monotonic deque gives the best in amortised O(1): O(n) total instead of O(nk).
## Problems
Jump game VI (LC 1696): dp[i] = nums[i] + max(dp[i−k..i−1]).
Constrained subsequence sum (LC 1425): dp[i] = nums[i] + max(0, window max).
Delivering boxes from storage to ports (LC 1687): window plus prefix sums.
Minimum cost to reach the end with window constraints; bounded knapsack by residue classes.
## General family
Works when the candidate value depends only on j (so it can be ranked) and the window boundaries only advance.
When the cost depends on both i and j as a product, use convex hull trick or Li Chao trees instead.
Divide-and-conquer optimisation and Knuth optimisation handle other monotone-argmin structures.
## Heap alternative
Max-heap of (dp[j], j) with lazy removal of indices outside the window: O(n log n). Simpler to get right; slower.
`,
};
