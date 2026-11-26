/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */
export const notes: Record<string, string> = {
  "bs-boundaries": `
## Predicates
Phrase every search as "find the first index where P(i) is true", where P is false…false true…true (monotone).
Lower bound = first i with a[i] ≥ x; upper bound = first i with a[i] > x.
Exact-match search is lower bound plus a check that a[lo] == x.
Last index with a[i] ≤ x = upper bound − 1. Count of x = upper − lower.
## One template (half-open)
lo = 0, hi = n; while lo < hi: mid = lo + (hi − lo) / 2; if P(mid) then hi = mid else lo = mid + 1. Answer lo (n means "none").
Invariant: everything before lo is false, everything from hi on is true.
The loop always shrinks the range because mid < hi.
## Other styles
Closed [lo, hi] with lo ≤ hi and hi = mid − 1: fine, but do not mix conventions.
"Last true" searches need mid rounded up (lo + (hi − lo + 1) / 2) with lo = mid, or they loop forever.
## Overflow and rounding
(lo + hi) / 2 overflows in 32-bit languages: use lo + (hi − lo) / 2.
With negative ranges, floor division differs between languages: keep bounds non-negative or use shifts carefully.
## Library functions
Python bisect_left / bisect_right; C++ lower_bound / upper_bound; Java Arrays.binarySearch returns −(insertion point) − 1 when missing.
Java Collections.binarySearch needs a sorted list; on duplicates the returned index is arbitrary.
## Complexity and beyond arrays
O(log n) probes. Works on any monotone function: answers, time, real numbers, implicit arrays.
## Extras
Java's binarySearch overflow bug lasted ~9 years.
Python bisect key= (3.10+).
Linked lists: binary search is O(n log n): worse than scanning.
Descending arrays: flip the predicate or negate values.
`,
  "bs-rotated": `
## Search in rotated sorted array (LC 33)
At least one half around mid is sorted: if a[lo] ≤ a[mid], the left half is sorted.
If the target lies within the sorted half's range, go there; otherwise go to the other half.
With duplicates (LC 81): when a[lo] == a[mid] == a[hi], shrink both ends; the worst case becomes O(n).
## Find the minimum (LC 153)
Compare a[mid] with a[hi]: a[mid] > a[hi] → the minimum is right of mid (lo = mid + 1); else hi = mid.
Compare with hi, not lo: comparing with lo fails when the array is not rotated.
Duplicates (LC 154): a[mid] == a[hi] → hi−−.
The minimum's index is the rotation count.
## Peaks (LC 162)
If a[mid] < a[mid + 1], a peak exists to the right (it is uphill); else to the left including mid.
Works on unsorted arrays because the predicate "a[i] > a[i+1]" has a true somewhere and the slope guarantees a peak.
2D peak (LC 1901): binary search over columns using each column's maximum row.
Mountain array search (LC 1095): find the peak, then binary search each side (the right side is descending).
## Unknown size (LC 702)
Double hi (1, 2, 4, …) until a[hi] ≥ target or out of range, then binary search in [hi/2, hi]: O(log n).
## Rotated variants
Check whether an array is a rotation of a sorted one: at most one descent, counting the wrap-around.
## Extras
Duplicates: shrink both ends (search) or hi −= 1 (minimum): O(n) worst.
Exponential search: double hi until get(hi) ≥ target.
Rotations = index of the minimum.
≤ in a[lo] ≤ a[mid] handles the two-element case.
`,
  "bs-answer": `
## Pattern
The answer x lies in [lo, hi], and feasible(x) is monotone (once true, stays true).
Binary search for the smallest feasible x (or the largest, mirrored). Cost = O(log range × cost of feasible).
## Koko eating bananas (LC 875)
Speed k feasible if Σ ceil(p / k) ≤ h. Range [1, max(p)]. ceil(p / k) = (p + k − 1) / k.
## Family
Capacity to ship packages in D days (LC 1011): range [max(w), sum(w)]; greedy fill per day.
Split array largest sum (LC 410): the same greedy count of pieces, minimise the max piece.
Minimum days to make m bouquets (LC 1482); magnetic force between balls (LC 1552) maximises the minimum gap.
Minimise the maximum or maximise the minimum: almost always this pattern.
Aggressive cows, painters partition and book allocation are the classic textbook names.
## K-th smallest via counting
Binary search on the value v: count(elements ≤ v) ≥ k.
K-th smallest in a sorted matrix (LC 378): a staircase count is O(n) per guess.
K-th smallest pair distance (LC 719): sort plus a two-pointer count.
K-th smallest in a multiplication table (LC 668): Σ min(v / i, n).
The final lo is always an actual element because it is the smallest value with count ≥ k.
## Real-valued answers
Loop a fixed number of times (about 60–100) or until hi − lo < ε; do not test equality on doubles.
## Proving the check
Feasibility checks are greedy; argue that greedy packing is optimal for a fixed limit (an exchange argument).
## Alternatives to name
Sometimes a heap, parametric search or a direct formula is faster; mention it when the range is huge.
## Extras
Hints: "minimise the maximum", "maximise the minimum", "at least k by day/time".
LC 2187: Σ floor(t / time_i) ≥ total trips.
LC 2226: Σ floor(c / x) ≥ k, maximise x.
Greedy check proof: exchange (moving a cut later never hurts).
`,
  "bs-2d-median": `
## Fully sorted matrix (LC 74)
Rows sorted and each row starts after the previous ends: treat it as one array of r·c, index i → (i / c, i % c). O(log rc).
## Row- and column-sorted matrix (LC 240)
Staircase: start top-right; bigger than target → move left; smaller → move down. O(r + c).
Counting elements ≤ v the same way powers "k-th smallest in a sorted matrix".
## Median of two sorted arrays (LC 4)
Binary search the partition i in the shorter array A; j = (m + n + 1) / 2 − i in B.
Valid when A[i−1] ≤ B[j] and B[j−1] ≤ A[i]; use −∞ / +∞ past the ends.
Odd total: median = max(A[i−1], B[j−1]); even: average with min(A[i], B[j]).
Too far right (A[i−1] > B[j]) → hi = i − 1; else lo = i + 1. O(log min(m, n)).
## K-th smallest of two arrays
Compare A[k/2 − 1] and B[k/2 − 1]; discard the smaller side's first k/2 elements; recurse with k − k/2. O(log k).
## Linear alternative
Merge with two pointers until the middle: O(m + n). Say it first, then improve.
## Extras
Sentinels ±∞ for i = 0, i = m, j = 0, j = n.
Fully sorted matrix: virtual index (k // C, k % C).
Linear baseline: merge until the middle.
Odd total → max(aL, bL).
`,
  "bs-real-ternary": `
## Bisection
Root of a continuous monotone function: keep f(lo) and f(hi) of opposite signs; halve.
Fixed iterations (~100) beat ε checks; precision doubles every iteration.
Square root to a tolerance, minimum speed or time as a real number, or the maximum average subarray (binary search on the average, LC 644).
## Ternary search
Finds the maximum of a unimodal function (strictly increasing, then strictly decreasing).
m1 = lo + (hi − lo)/3, m2 = hi − (hi − lo)/3; if f(m1) < f(m2) drop [lo, m1], else drop [m2, hi].
O(log₁.₅ n) evaluations; plateaus (equal values) break it.
On integers, binary search on f(m) < f(m + 1) is simpler and safer.
## Golden-section search
Places probes at the golden ratio so one evaluation is reused per step: fewer function calls than ternary.
## Convexity in interviews
Convex cost (e.g. Σ|x − aᵢ|, sum of distances): the minimum is at the median (1D) — no search needed.
Minimising a sum of squared distances → the mean.
Convex functions of an integer: binary search on the discrete derivative.
## Extras
Tolerance loops can stall with large magnitudes: use fixed iterations.
Sqrt(x): last m with m ≤ x // m.
Newton for roots: x = (x + n/x)/2.
Plateaus break ternary search.
`,
  "ll-basics": `
## Structure
Node = value + next (+ prev for doubly linked). Access by index O(n); insert/delete after a known node O(1).
No random access; poor cache locality; extra pointer memory per node.
## Dummy (sentinel) node
dummy.next = head removes the special case for the head changing (deletes, merges, partitions). Return dummy.next.
## Core operations
Traverse: while cur. Insert after p: n.next = p.next; p.next = n.
Delete after p: p.next = p.next.next. Delete a given node without its predecessor (LC 237): copy the next value in, skip the next.
Remove the n-th from the end (LC 19): lead one pointer n steps, then move both; dummy handles removing the head.
Length, k-th node, intersection of two lists (LC 160): switch heads at the ends; they meet at the junction or both hit null.
## Add two numbers (LC 2)
Digits stored in reverse: add with carry, node by node; append a final carry. Forward order (LC 445): stacks or reverse first.
## Doubly linked lists in design
LRU cache: hash map → node plus a doubly linked list ordered by recency; move-to-front and evict-tail in O(1).
Sentinels at both ends (head and tail dummies) remove all null checks.
## Practical note
Draw boxes and arrows; update pointers in a safe order (save next before overwriting).
Most bugs: losing the rest of the list, or not handling the 0- and 1-node lists.
## Extras
Intersect iff same tail node.
Remove elements: dummy + prev loop.
Test lengths 0, 1, 2 and head/tail cases.
Arrays usually beat lists in practice (cache).
`,
  "ll-reversal": `
## Iterative reversal
prev = null, cur = head; loop: nxt = cur.next; cur.next = prev; prev = cur; cur = nxt. Return prev. O(n), O(1).
Recursive: reverse the rest, then head.next.next = head; head.next = null. O(n) stack.
## Reverse between m and n (LC 92)
Walk to the node before m (use a dummy); then repeatedly move the node after the sublist's first node to the front of the sublist (n − m times).
## Reverse in k-groups (LC 25)
Check that k nodes remain; reverse those k; connect the previous group's tail to the new head; the old head becomes the tail.
A shorter final group stays as is.
Swap nodes in pairs (LC 24) is the k = 2 case.
## Reorder list (LC 143)
Find the middle (fast/slow), reverse the second half, merge alternately. O(n), O(1).
## Palindrome linked list (LC 234)
Find the middle, reverse the second half, compare, then reverse it back to restore the list.
## Rotate list (LC 61)
Get length L and the tail; k mod L; make it circular; break after L − k steps.
## Habits
Always say what prev, cur and nxt point to after each step; test with lengths 0, 1, 2 and k = length.
## Extras
Invariant: prev = reversed prefix head, cur = remaining suffix head.
k-groups: check k nodes remain first; connect prevTail → newHead, oldHead → next start.
Swap Nodes in Pairs = k = 2 by rewiring.
Restore the list after a palindrome check.
`,
  "fast-slow": `
## Middle
slow += 1, fast += 2; when fast reaches the end, slow is the middle (second middle for even lengths with while fast and fast.next).
For the first middle, start fast at head.next.
## Cycle detection (Floyd)
If there is a cycle, fast gains one step per move and must land on slow within one loop length. O(n) time, O(1) space.
## Cycle entrance (LC 142)
After they meet, reset one pointer to head; move both one step at a time; they meet at the entrance.
Why: if a = distance to the entrance and they meet b into the cycle of length c, then a ≡ c − b (mod c).
Cycle length: from the meeting point, count steps until returning.
## Functional graphs
Find the duplicate number (LC 287): treat i → nums[i] as a linked list; the duplicate is the cycle entrance. O(1) space, no modification.
Happy number (LC 202): iterate the digit-square map; Floyd detects the loop.
Any f: S → S on a finite set eventually cycles (rho shape).
## Brent's algorithm
Teleport slow to fast at powers of two; finds the cycle length directly with fewer function evaluations.
## Other uses
k-th from the end: lead by k. Split a list in half for merge sort. Detecting circular array loops (LC 457).
## Extras
Gap shrinks by 1 per step ⇒ meet within one lap.
Happy Number: Floyd on the digit-square map.
Pollard's rho uses Floyd/Brent.
Break a cycle: walk from the entrance to its predecessor.
`,
  "ll-merge-sort": `
## Merge two sorted lists (LC 21)
Dummy plus tail; attach the smaller head each step; attach the remainder. O(n + m), O(1) extra.
## Merge k sorted lists (LC 23)
Min-heap of (value, index, node): push each head; pop, attach, push its next. O(N log k).
Add a tiebreaker (index) so the heap never compares nodes.
Divide and conquer pairwise merging: also O(N log k), no heap.
## Sort list (LC 148)
Merge sort: split at the middle (fast/slow, cut the link), sort both halves, merge. O(n log n) time.
Recursive version uses O(log n) stack; the bottom-up version (merge runs of 1, 2, 4…) is O(1) extra space.
Merge sort suits lists: no random access needed, stable, and merging needs no extra array.
## Partition list (LC 86)
Two dummy lists (< x and ≥ x); append nodes in order; join; terminate the second list's tail with null.
## Insertion sort list (LC 147)
Dummy-headed sorted list; insert each node at its spot. O(n²). Skip the scan when the node belongs at the end.
## Odd even linked list (LC 328)
Two chains (odd and even positions), then link odd's tail to even's head. O(n), O(1).
## Extras
Bottom-up merge sort: runs of 1, 2, 4… with a tail pointer.
Insertion sort list: extend the tail when already in order.
Odd Even List: alternate odd/even pointer advances.
Merging one by one: O(N·k).
`,
  "ll-copy-design": `
## Copy list with random pointer (LC 138)
Hash map old → new: two passes (create nodes, then wire next and random). O(n) space.
Interleaving trick: insert each copy right after its original; set copy.random = orig.random.next; then unweave. O(1) extra.
## Flatten a multilevel doubly linked list (LC 430)
DFS: when a node has a child, splice the flattened child list between the node and its next; clear child pointers; fix prev links.
An explicit stack of "next" pointers avoids recursion.
## Designs that are lists underneath
LRU cache (LC 146): hash map + doubly linked list; get moves to front; put evicts the tail when full.
LFU cache (LC 460): key → node, frequency → doubly linked list, and minFreq; all O(1).
All O(1) data structure (LC 432): a list of count buckets, each with a key set.
Design browser history: a doubly linked list or an array with a cursor.
Skip lists: layered linked lists with expected O(log n) search (Redis sorted sets).
## Intrusive lists
The next/prev pointers live inside the object itself (Linux kernel list_head): no extra allocation, and O(1) removal given the object.
## Extras
Recursive memoised copy works like Clone Graph.
LC 430 iterative: stack of saved next pointers.
Browser History visit truncates forward history.
container_of recovers the object from its link field.
`,
};
