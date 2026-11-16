import { P, Q, T } from "./h";
import type { Problem, Topic } from "@/lib/types";

export const topics1: Topic[] = [
  T("dsa", "complexity", "Complexity & problem-solving loop", 1, 25, "Big-O instincts, constraint reading and the 45-minute loop every other topic plugs into.", {
    signals: ["Any problem: constraints tell you the target complexity before you think of an algorithm"],
    lesson: `**Read the constraints first.** They leak the intended solution.

| n up to | Target | Typical tools |
|---|---|---|
| 10–20 | O(2ⁿ·n), O(n!) | bitmask DP, backtracking |
| 100–500 | O(n³) | interval DP, Floyd–Warshall |
| 5 000 | O(n²) | 2D DP, pair enumeration |
| 10⁵–10⁶ | O(n log n) / O(n) | sort, heap, binary search, two pointers, hashing |
| 10⁹–10¹⁸ | O(log n) / O(1) | binary search on answer, math |

**Amortised vs worst case:** a dynamic array push is O(1) amortised; a monotonic stack is O(n) total because each element is pushed and popped once. Say *why*, not just the bound.

**Recursion cost** = (number of distinct states) × (work per state). For memoised DP this is the only formula you need.

**Space** includes the recursion stack. A DFS on a skewed tree is O(n) space, not O(log n).

**The loop Google grades:** clarify → examples → brute force (state it, with complexity) → optimise out loud → code → dry-run a small case → edge cases → complexity. Skipping the dry run is the most common way a correct idea becomes a "lean no hire".`,
    pitfalls: [
      "Quoting hash map operations as O(1) without saying 'average'; worst case is O(n)",
      "Forgetting that string concatenation / substring / hashing a key of length L costs O(L)",
      "Ignoring the recursion stack in space complexity",
      "Sorting inside a loop and still claiming O(n log n)",
    ],
    quiz: [
      Q("n ≤ 20 and you must pick an optimal subset. What does the constraint suggest?", ["Greedy", "*Bitmask / exponential search", "Binary search", "Segment tree"], "2²⁰ ≈ 10⁶ states is affordable; a tiny n is a deliberate hint toward exponential state."),
      Q("A loop pushes each element onto a stack once and may pop many times per iteration. Total cost?", ["O(n²)", "O(n log n)", "*O(n)", "O(1)"], "Each element is pushed once and popped at most once, so total work is bounded by 2n."),
      Q("Memoised recursion with states (i, j), i, j < n, and an inner loop over k < n. Time?", ["O(n²)", "*O(n³)", "O(2ⁿ)", "O(n² log n)"], "States × work per state = n² × n."),
    ],
    cards: [
      ["Formula for memoised recursion time", "number of distinct states × non-recursive work per state"],
      ["n ≤ 10⁵ usually means…", "O(n log n) or O(n): sorting, heaps, binary search, two pointers, hashing"],
    ],
  }),
  T("dsa", "arrays-hashing", "Arrays, hashing & prefix sums", 1, 35, "Trade memory for time: hash lookups, prefix sums and difference arrays.", {
    viz: "prefix-sum",
    signals: [
      "'Find a pair / group / duplicate' in an unsorted collection",
      "'Subarray whose sum / count equals K' (prefix sum + hash map)",
      "Many range updates then one read (difference array)",
    ],
    lesson: `**Hash map as memory of the past.** While scanning, ask: *what would I need to have seen earlier for the current element to complete an answer?* Store exactly that.

**Prefix sums.** \`pre[i] = a[0] + … + a[i-1]\`, so \`sum(l..r) = pre[r+1] − pre[l]\`. A subarray with sum K ending at \`j\` exists iff some earlier prefix equals \`pre[j] − K\`. Count prefixes in a map and seed it with \`{0: 1}\`.

Prefix sums work with negatives. Sliding window does not; that is the usual deciding factor between the two.

**Difference array.** To add \`v\` on \`[l, r]\`: \`d[l] += v; d[r+1] −= v\`. One prefix pass at the end materialises all updates in O(n + q).

**Canonical keys.** Group things by a normal form: sorted string, 26-count tuple, slope as reduced fraction, value modulo k.

**The array as its own hash table.** When values lie in \`1..n\`, index \`v − 1\` is a free slot: swap each value to its home position (cyclic sort) or flip the sign at that index to mark "seen". This is how "find the missing / duplicate number" reaches O(1) extra space.

**Boyer–Moore majority vote.** Keep one candidate and a counter; a matching element increments, a different one decrements, and at zero you adopt the current element. A value occurring more than n/2 times always survives. Verify with a second pass unless a majority is guaranteed. For "more than n/3" keep two candidates.`,
    template: `// count subarrays with sum == k (works with negatives)
int subarraySum(vector<int>& a, int k) {
  unordered_map<long long,int> seen{{0, 1}};
  long long pre = 0; int ans = 0;
  for (int x : a) {
    pre += x;
    if (auto it = seen.find(pre - k); it != seen.end()) ans += it->second;
    ++seen[pre];
  }
  return ans;
}`,
    pitfalls: [
      "Forgetting the empty prefix {0: 1}",
      "Inserting the current prefix before querying (counts the empty subarray when k = 0)",
      "Negative modulo in C++/Java: use ((x % k) + k) % k",
      "Using a vector / unordered key that is not hashable in C++ without a custom hash",
    ],
    quiz: [
      Q("Count subarrays with sum K where values may be negative. Best tool?", ["Sliding window", "*Prefix sum + hash map", "Two pointers on sorted copy", "Binary search"], "A window needs monotonic sums; negatives break that. Prefix + map is O(n) regardless of sign."),
      Q("10⁵ range-add updates, then print the array once.", ["Segment tree with lazy propagation", "*Difference array", "Re-apply each update", "Fenwick tree"], "All reads come after all writes, so a difference array is O(n + q) and far simpler."),
      Q("Why seed the prefix map with {0: 1}?", ["To avoid overflow", "*So subarrays starting at index 0 are counted", "To handle negative numbers", "It is optional"], "A subarray from index 0 corresponds to subtracting the empty prefix."),
    ],
    cards: [
      ["Sum of a[l..r] with prefix sums", "pre[r+1] − pre[l]"],
      ["Range add [l, r] += v in O(1)", "d[l] += v; d[r+1] −= v; prefix-sum at the end"],
    ],
  }),
  T("dsa", "two-pointers", "Two pointers", 1, 30, "Shrink the search space from both ends using sortedness or monotonic structure.", {
    viz: "two-pointers",
    signals: ["Sorted input (or you may sort) and you need pairs / triplets", "In-place partitioning or deduplication", "Fast/slow pointers for cycles or midpoints"],
    lesson: `Three shapes cover almost everything:

1. **Opposite ends** on sorted data. At each step you can *prove* one end can be discarded: if \`a[l] + a[r] > target\`, \`a[r]\` cannot pair with anything left of \`r\` either.
2. **Same direction (reader / writer)** for in-place filtering: the writer marks the end of the valid prefix.
3. **Fast / slow** for cycle detection and middle-of-list.

The interview skill is stating the **invariant** and the **discard argument**. For Container With Most Water: moving the taller side can never help because the width shrinks and height is capped by the shorter side.

**k-Sum** = sort + fix k−2 elements + two pointers. Skip duplicates at every level.

**Dutch national flag:** three regions \`[0,lo) <pivot, [lo,mid) ==pivot, (hi,n) >pivot\`; do not advance \`mid\` after swapping with \`hi\`.`,
    template: `// 3Sum skeleton
sort(a.begin(), a.end());
for (int i = 0; i + 2 < n; ++i) {
  if (i && a[i] == a[i-1]) continue;          // dedupe anchor
  for (int l = i + 1, r = n - 1; l < r; ) {
    long long s = (long long)a[i] + a[l] + a[r];
    if (s < 0) ++l; else if (s > 0) --r;
    else { res.push_back({a[i], a[l], a[r]});
           while (l < r && a[l] == a[l+1]) ++l;
           while (l < r && a[r] == a[r-1]) --r;
           ++l; --r; }
  }
}`,
    pitfalls: ["Sorting when original indices are required", "Duplicate triples: dedupe anchors and both pointers", "Integer overflow when summing three ints", "Advancing mid after swapping with hi in Dutch flag"],
    quiz: [
      Q("In Container With Most Water, why move the shorter line?", ["It is arbitrary", "*Any container using the shorter line with a narrower width is no better", "The taller line is always part of the answer", "To keep the array sorted"], "Area is capped by the shorter line; narrowing while keeping it can only reduce area."),
      Q("Two-sum on an unsorted array where you must return indices. Best?", ["Sort + two pointers", "*Hash map", "Binary search", "Brute force"], "Sorting loses indices (unless you carry them) and costs O(n log n); hashing is O(n)."),
      Q("Counting triangles (a+b>c) in a sorted array: fix which element?", ["Smallest", "*Largest, then two pointers on the rest", "Median", "Any"], "With c fixed as the largest, if a[l]+a[r] > c then every index in [l, r) pairs with r: count r−l at once."),
    ],
    cards: [["Dutch flag regions", "[0,lo) < p · [lo,mid) == p · [mid,hi] unknown · (hi,n) > p"]],
  }),
  T("dsa", "sliding-window", "Sliding window", 1, 35, "Maintain a window whose validity is monotonic in its size.", {
    viz: "sliding-window",
    signals: ["Longest / shortest / count of contiguous subarrays or substrings under a constraint", "Constraint becomes 'more violated' as the window grows (monotonic)", "All values non-negative when sums are involved"],
    lesson: `**Variable window:** expand \`r\`; while the window is invalid, shrink \`l\`. Each index enters and leaves once → O(n).

It only works when validity is **monotonic**: growing never repairs an invalid window, shrinking never breaks a valid one. Negative numbers with sums break this; switch to prefix sums or a monotonic deque.

**Counting trick:** \`exactly(K) = atMost(K) − atMost(K−1)\`. With \`atMost\`, each \`r\` contributes \`r − l + 1\` subarrays.

**Non-shrinking window:** when you only need the *maximum length*, the window never needs to shrink below the best seen; slide it instead (\`if invalid: l++\`). Used in Longest Repeating Character Replacement.

**"At most K changes" problems** (Max Consecutive Ones III, Frequency of the Most Frequent Element): the window is valid while \`cost(window) ≤ K\`; define cost carefully, often \`max·len − sum\` after sorting.`,
    template: `// longest window with at most k distinct
int l = 0, best = 0; unordered_map<int,int> cnt;
for (int r = 0; r < n; ++r) {
  ++cnt[a[r]];
  while ((int)cnt.size() > k)
    if (--cnt[a[l]] == 0) cnt.erase(a[l]), ++l; else ++l;
  best = max(best, r - l + 1);
}`,
    pitfalls: ["Using a window on sums with negative numbers", "Off-by-one: window length is r − l + 1", "Forgetting to erase zero-count keys when the map size is the condition", "Computing 'exactly K' directly instead of atMost(K) − atMost(K−1)"],
    quiz: [
      Q("Shortest subarray with sum ≥ K where values can be negative.", ["Plain sliding window", "*Prefix sums + monotonic deque", "Two pointers after sorting", "Kadane"], "Negatives destroy monotonicity. Keep increasing prefix sums in a deque (LC 862)."),
      Q("Count subarrays with exactly K distinct values.", ["One window with a while loop", "*atMost(K) − atMost(K−1)", "DP", "Sort then scan"], "'Exactly' is not monotonic; 'at most' is."),
      Q("Why is the variable-size window O(n)?", ["The inner loop runs once", "*l and r each only move forward, ≤ 2n moves total", "The map is O(1)", "It is O(n log n)"], "Amortised argument: both pointers are monotone."),
    ],
    cards: [["exactly(K) for windows", "atMost(K) − atMost(K − 1)"], ["When does a sliding window NOT apply to sums?", "When values can be negative (validity is no longer monotonic)"]],
  }),
  T("dsa", "stack", "Stacks & monotonic stack", 1, 35, "Nearest greater/smaller in O(n), expression parsing and nested structure.", {
    viz: "mono-stack",
    signals: ["'Next greater / previous smaller element'", "Span, histogram, 'how far can this bar extend'", "Nested or matched structure: brackets, encoded strings, calculators"],
    lesson: `A **monotonic stack** keeps indices whose values are increasing (or decreasing). When a new element breaks the order, everything it pops has just found its *next greater (or smaller)* element, and what remains on top is the new element's *previous* greater/smaller.

One pass therefore gives, for every index, the nearest boundary on both sides. That is the entire idea behind:
- **Daily Temperatures / Next Greater Element** (decreasing stack),
- **Largest Rectangle in Histogram**: each bar extends until a strictly smaller bar on each side; area = \`h × (right − left − 1)\`. A sentinel 0 at the end flushes the stack.
- **Sum of subarray minimums**: contribution = \`a[i] × left × right\`; use strict on one side and non-strict on the other to avoid double counting duplicates.
- **Trapping Rain Water** (stack variant) and **Maximal Rectangle** (histogram per row).

**Expression evaluation:** keep a stack of values; apply \`*\` and \`/\` immediately, defer \`+ −\`. Parentheses → recursion or push the current context.`,
    template: `// next greater element to the right
vector<int> nge(n, -1); vector<int> st;        // indices, values decreasing
for (int i = 0; i < n; ++i) {
  while (!st.empty() && a[st.back()] < a[i]) { nge[st.back()] = i; st.pop_back(); }
  st.push_back(i);
}`,
    pitfalls: ["Storing values instead of indices (you usually need distances)", "Duplicates: decide strict vs non-strict comparison deliberately", "Forgetting to flush the stack at the end (use a sentinel)", "Unary minus and whitespace in calculator problems"],
    quiz: [
      Q("Largest Rectangle in Histogram: when a bar is popped, its width is…", ["i − top", "*i − newTop − 1", "top − newTop", "i"], "The popped bar extends from just after the new top to just before i."),
      Q("To find the previous smaller element, the stack should be…", ["Decreasing", "*Increasing (pop while top ≥ current)", "Unordered", "A queue"], "After popping everything ≥ current, the top is the nearest smaller to the left."),
      Q("Sum of subarray minimums with duplicates: how do you avoid double counting?", ["Use a set", "*Strict comparison on one side, non-strict on the other", "Sort first", "It cannot happen"], "Asymmetric comparisons assign each subarray's minimum to exactly one index."),
    ],
    cards: [["What does popping an index from a monotonic stack mean?", "The current element is that index's next greater/smaller"]],
  }),
  T("dsa", "mono-deque", "Queues & monotonic deque", 2, 30, "Window max/min in O(1) amortised and DP transitions over a sliding range.", {
    signals: ["Maximum/minimum over every window of size k", "DP where dp[i] depends on best of dp[i−k..i−1]", "Shortest subarray with sum ≥ K with negatives"],
    lesson: `A **monotonic deque** stores indices with decreasing values (for max). Two rules:

1. **Back:** before pushing \`i\`, pop every index with value ≤ \`a[i]\`: they can never be the max again while \`i\` is in the window.
2. **Front:** pop the front if it left the window. The front is always the window maximum.

**DP optimisation:** \`dp[i] = a[i] + max(dp[i−k..i−1])\` goes from O(nk) to O(n) (Jump Game VI, Constrained Subsequence Sum).

**Shortest subarray with sum ≥ K (negatives allowed):** keep prefix sums increasing in the deque. Pop the front while \`pre[i] − pre[front] ≥ K\` (it can never give a shorter answer later); pop the back while \`pre[back] ≥ pre[i]\` (a later, smaller prefix dominates).

**Two deques** (one max, one min) solve "longest subarray with max − min ≤ limit".

A heap also works at O(n log n) with lazy deletion; say so, then give the deque.`,
    template: `deque<int> dq;                       // indices, values decreasing
for (int i = 0; i < n; ++i) {
  while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();
  dq.push_back(i);
  if (dq.front() <= i - k) dq.pop_front();
  if (i >= k - 1) out.push_back(a[dq.front()]);
}`,
    pitfalls: ["Storing values so you cannot tell when the front expires", "Expiring the front before pushing in DP variants (window bounds shift by one)", "Using < vs ≤ inconsistently with duplicates"],
    quiz: [
      Q("Why can smaller elements behind a new larger element be discarded?", ["They are duplicates", "*They leave the window no later and are never the max while it is present", "To save memory only", "They cannot"], "Dominance: older and smaller means useless."),
      Q("dp[i] = a[i] + max(dp[i−k..i−1]) for n = 10⁵, k = 10⁴. Best?", ["Plain loops", "Segment tree only", "*Monotonic deque, O(n)", "Binary search"], "Sliding-window maximum over dp values."),
    ],
    cards: [["Deque front invariant (window max)", "Front index is inside the window and holds the largest value; values decrease toward the back"]],
  }),
  T("dsa", "binary-search", "Binary search (incl. on the answer)", 1, 45, "Any monotonic predicate can be binary searched, not just sorted arrays.", {
    viz: "binary-search",
    signals: ["Sorted or rotated-sorted data", "'Minimise the maximum' / 'maximise the minimum'", "A yes/no feasibility check that flips exactly once as the parameter grows", "Answer space up to 10⁹ with n ≤ 10⁵"],
    lesson: `Think **predicate**, not array. Find the first \`x\` where \`ok(x)\` is true, given \`ok\` is false…false,true…true.

**One template, no off-by-ones:** half-open search for the first true.

**Binary search on the answer.** If you can *check* a candidate answer in O(n) and feasibility is monotonic, search the answer space: Koko (speed), Ship Packages (capacity), Split Array Largest Sum (limit), Cutting Ribbons, Maximise Min Powered City. Bounds: \`lo\` = smallest conceivable answer, \`hi\` = largest.

**Rotated arrays:** one half is always sorted. Decide which, test whether the target is inside its range, discard accordingly. With duplicates (LC 81) \`a[lo] == a[mid] == a[hi]\` forces \`lo++, hi--\` → worst case O(n).

**Peak finding:** move toward the rising neighbour; a peak must exist there.

**Median of two sorted arrays:** binary search the partition of the smaller array so left halves have (m+n+1)/2 elements and \`maxLeft ≤ minRight\`.

**Real answers:** loop a fixed 60–100 iterations or until \`hi − lo < eps\`.

**Lookup structures:** prefix sums + \`upper_bound\` (Random Pick with Weight), per-index version lists (Snapshot Array, Time-Based KV).`,
    template: `// first x in [lo, hi) with ok(x) == true; returns hi if none
long long lo = L, hi = R;
while (lo < hi) {
  long long mid = lo + (hi - lo) / 2;
  if (ok(mid)) hi = mid; else lo = mid + 1;
}
return lo;`,
    pitfalls: ["(lo + hi) / 2 overflow", "Infinite loop from lo = mid without rounding mid up", "Wrong bounds for the answer space (e.g. lo must be max element for Split Array)", "Predicate that is not actually monotonic", "Rotated array with duplicates degrading to O(n) and not saying so"],
    quiz: [
      Q("Split array into k parts minimising the largest part sum. Lower bound of the search?", ["0", "1", "*max element", "sum / k"], "No part can be smaller than the largest single element."),
      Q("Rotated sorted array with duplicates: worst-case search time?", ["O(log n)", "*O(n)", "O(n log n)", "O(1)"], "When a[lo]==a[mid]==a[hi] you cannot tell which half is sorted and must shrink linearly."),
      Q("Which is NOT binary-searchable on the answer?", ["Minimum eating speed to finish in H hours", "Max min distance between placed items", "*Number of subarrays with sum exactly K", "Smallest capacity to ship in D days"], "'Exactly K' has no monotonic feasibility predicate."),
    ],
    cards: [["First-true template update rules", "ok(mid) → hi = mid; else lo = mid + 1; loop while lo < hi"], ["'Minimise the maximum' usually means…", "Binary search on the answer with a greedy O(n) feasibility check"]],
  }),
  T("dsa", "linked-list", "Linked lists", 2, 30, "Pointer surgery: dummy heads, reversal, fast/slow and merging.", {
    viz: "linked-reverse",
    signals: ["Explicit list manipulation", "Cycle detection or 'find the duplicate' in O(1) space", "O(1) insert/delete with a hash map (LRU, LFU)"],
    lesson: `**Four tools:**
- **Dummy head** removes head special cases.
- **Reversal** with \`prev, cur, next\`. Sub-list reversal (LC 92) and k-group reversal (LC 25) are the same loop with careful reconnection.
- **Fast/slow**: middle, cycle detection (Floyd), cycle entry (reset one pointer to head, advance both by one). "Find the Duplicate Number" is cycle entry on \`i → a[i]\`.
- **Merge**: two lists with a tail pointer; k lists with a min-heap (O(N log k)) or divide and conquer.

**Why Floyd's entry trick works:** if the head-to-entry distance is \`a\` and the meeting point is \`b\` into a cycle of length \`c\`, then \`2(a+b) = a+b+kc\` ⇒ \`a = kc − b\`: walking \`a\` from the meeting point lands on the entry.

**Copy with random pointers:** interleave clones (A→A'→B→B') for O(1) extra space, or use a map.

**Sort List:** merge sort; bottom-up for O(1) space.

Draw boxes and arrows before coding. Interviewers watch for null dereferences more than cleverness.`,
    template: `ListNode* reverse(ListNode* head) {
  ListNode *prev = nullptr, *cur = head;
  while (cur) { ListNode* nxt = cur->next; cur->next = prev; prev = cur; cur = nxt; }
  return prev;
}`,
    pitfalls: ["Losing the next pointer before rewiring", "Null dereference on fast->next->next", "Forgetting to terminate the tail (cycles in output)", "Leaking nodes in C++ when deleting"],
    quiz: [
      Q("After fast and slow meet inside a cycle, how do you find the cycle's entry?", ["Count nodes", "*Move one pointer to head; advance both by 1 until they meet", "Reverse the list", "Use a stack"], "a = kc − b, so both arrive at the entry together."),
      Q("Merging k sorted lists of total N nodes with a heap costs…", ["O(Nk)", "*O(N log k)", "O(N log N)", "O(k log N)"], "Each node passes through a heap of size ≤ k."),
    ],
    cards: [["Reverse a list: loop body", "nxt = cur.next; cur.next = prev; prev = cur; cur = nxt"]],
  }),
];

export const problems1: Problem[] = [
  // arrays-hashing
  P("arrays-hashing", 1, "Two Sum", "E", 1, "Return indices of two numbers that add up to a target.",
    ["Hash map|Store value→index; look up target − x before inserting|O(n)|O(n)", "Sort + two pointers|Sort pairs (value, index) and converge|O(n log n)|O(n)"],
    ["Exactly one solution, or could there be none / many?", "Can I reuse the same element twice?", "Is the input sorted or can it be huge (streaming)?"],
    ["Input arrives as a stream; answer 'does a pair exist so far?' after each number", "Return all unique pairs, not indices", "Numbers are in a BST or two different sorted arrays"],
    ["How would you do it if the data does not fit in memory?", "Extend to 3Sum / kSum. What changes?"],
    ["What would you need to have seen before x to finish a pair?", "Check the map before inserting so you do not pair x with itself."]),
  P("arrays-hashing", 128, "Longest Consecutive Sequence", "M", 1, "Length of the longest run of consecutive integers in an unsorted array, in O(n).",
    ["Hash set, start only at run heads|For each x with x−1 absent, walk x+1, x+2…|O(n)|O(n)", "Union-Find|Union x with x+1 if present; track component size|O(n α(n))|O(n)", "Sort|Sort and scan, skipping duplicates|O(n log n)|O(1)"],
    ["Do duplicates count once?", "Value range: could I bucket instead of hash?"],
    ["Numbers arrive online; report the longest run after each insert (interval-merging map / DSU)", "Return the sequence itself, not its length", "2D version: longest path of consecutive values in a grid"],
    ["Why is the nested while loop still O(n)?", "How would you support deletions?"],
    ["Only begin counting at numbers that have no predecessor.", "Each number is visited by the inner loop at most once overall."]),
  P("arrays-hashing", 560, "Subarray Sum Equals K", "M", 1, "Count contiguous subarrays whose sum equals k (negatives allowed).",
    ["Prefix sum + hash map|Count earlier prefixes equal to pre − k|O(n)|O(n)", "Brute force|All (i, j) with running sum|O(n²)|O(1)"],
    ["Can values be negative or zero?", "Do I return the count or the subarrays?"],
    ["Longest subarray with sum k (store first index of each prefix)", "Sum divisible by k (store prefix mod k)", "2D: count submatrices summing to target (fix two rows, reduce to 1D)"],
    ["Why does sliding window fail here?", "What if k = 0 and the array is all zeros?"],
    ["sum(i..j) = pre[j] − pre[i−1].", "Seed the map with prefix 0 seen once."]),
  P("arrays-hashing", 238, "Product of Array Except Self", "M", 1, "For each index return the product of all other elements, without division, in O(n).",
    ["Prefix × suffix products|Left pass stores prefix products; right pass multiplies a running suffix|O(n)|O(1) extra"],
    ["Are zeros allowed? How many?", "Does the output array count as extra space?", "Overflow guarantees?"],
    ["Division is allowed but there may be zeros", "Streaming: product of the last k numbers (LC 1352)"],
    ["How do zeros change a division-based approach?", "Generalise to 'sum of all except self within a window'"],
    ["Answer[i] = (product of everything left) × (product of everything right).", "You can reuse the output array for the left products."]),
  P("arrays-hashing", 41, "First Missing Positive", "H", 2, "Find the smallest positive integer missing from an unsorted array in O(n) time and O(1) extra space.",
    ["Cyclic sort in place|Swap each value v in 1..n to index v-1 until every slot holds its own value or junk; the first index i with a[i] != i+1 gives the answer|O(n)|O(1)", "Sign marking|Replace non-positives with n+1, then negate a[|v|-1] for every |v| <= n; the first positive index is the answer|O(n)|O(1)", "Hash set|Insert everything, then probe 1, 2, 3...|O(n)|O(n)"],
    ["May I modify the input array?", "Are duplicates and negatives present?", "Is the answer bounded by n+1? (Yes: why?)"],
    ["Input is read-only: what is the best you can do now?", "Values arrive as a stream too large for memory", "Find all missing numbers in 1..n (LC 448)", "Find the duplicate and the missing one (LC 645)"],
    ["Why does the swap loop still run in O(n) overall?", "What breaks if you forget the a[a[i]-1] != a[i] check?", "Sharded across machines: how do you find the smallest missing id?"],
    ["The answer is always in 1..n+1, so only values in that range matter.", "You have n slots and n interesting values: let each value live at its own index.", "Swap until the current slot is correct or holds something unplaceable; guard against swapping equal values."]),
  P("arrays-hashing", 169, "Majority Element", "E", 2, "Return the element that appears more than n/2 times.",
    ["Boyer-Moore vote|One candidate and a counter; pair off different elements, the majority survives|O(n)|O(1)", "Hash count|Count frequencies, return the one above n/2|O(n)|O(n)", "Sort|The middle element is the majority|O(n log n)|O(1)"],
    ["Is a majority guaranteed to exist?", "Can I make two passes over the data?"],
    ["No guarantee of a majority: detect and report 'none'", "Elements appearing more than n/3 times (LC 229)", "The data is a stream and you get one pass", "Answer 'is x the majority in subarray [l, r]?' many times (LC 1157)"],
    ["Prove the vote algorithm is correct", "Generalise to more than n/k occurrences: how many candidates?", "How would you parallelise it across shards?"],
    ["Imagine cancelling each majority element against a different one.", "What is left after all cancellations?"]),
  P("arrays-hashing", 49, "Group Anagrams", "M", 2, "Group strings that are anagrams of each other.",
    ["Canonical key: sorted string|Map sorted(s) → group|O(n·L log L)|O(n·L)", "Canonical key: 26 counts|Count letters, serialise counts as key|O(n·L)|O(n·L)"],
    ["Character set: lowercase ASCII or Unicode?", "Is output order important?"],
    ["Group strings that are shifts of each other (key = differences between adjacent chars)", "Strings are huge and do not fit in memory: hash by counts and shard"],
    ["How would you design the key for Unicode?", "How would you distribute this over many machines?"],
    ["Two anagrams must map to an identical key.", "A count vector avoids the L log L sort."]),
  P("arrays-hashing", 1109, "Corporate Flight Bookings (range add)", "M", 2, "Given bookings [first, last, seats], return total seats per flight.",
    ["Difference array|d[first] += s, d[last+1] −= s, then prefix sum|O(n + q)|O(n)"],
    ["Are ranges inclusive and 1-indexed?", "Are queries interleaved with updates?"],
    ["Queries interleaved with updates → Fenwick tree with range-update / point-query", "Coordinates up to 10⁹ → sort events / ordered map (sweep line)"],
    ["What changes if we also need range sums online?", "Relate this to Car Pooling and Meeting Rooms II"],
    ["You only need the final array, not intermediate states.", "Mark where an effect starts and where it stops."]),

  // two-pointers
  P("two-pointers", 15, "3Sum", "M", 1, "Find all unique triplets that sum to zero.",
    ["Sort + two pointers|Fix i, converge l and r; skip duplicates at each level|O(n²)|O(1) + sort", "Hash set per anchor|For each i run two-sum with a set|O(n²)|O(n)"],
    ["Unique triplets by value or by index?", "Size and value bounds (overflow)?"],
    ["3Sum Closest / 3Sum Smaller (count with r − l)", "Target is arbitrary; generalise to kSum", "Input is three separate arrays"],
    ["Can you beat O(n²)? (No known truly subquadratic algorithm: 3SUM-hardness.)", "How do you count triplets instead of listing them?"],
    ["Sorting lets you discard one end with certainty.", "Skip equal neighbours after recording a hit."]),
  P("two-pointers", 11, "Container With Most Water", "M", 1, "Pick two lines forming the container holding the most water.",
    ["Opposite pointers|Compute area, move the shorter side inward|O(n)|O(1)"],
    ["Is line thickness zero? Can heights be 0?"],
    ["Prove correctness, not just state the greedy", "Return the indices; or the top-k containers"],
    ["Why is it safe to discard the shorter line?", "What if lines can be removed at a cost?"],
    ["The shorter line bounds the height; width only shrinks.", "Could the shorter line ever do better with a nearer partner?"]),
  P("two-pointers", 42, "Trapping Rain Water", "H", 1, "Given bar heights, compute how much water is trapped after rain.",
    ["Two pointers with running maxes|Process the side with the smaller max; water = max − height|O(n)|O(1)", "Prefix/suffix max arrays|water[i] = min(leftMax, rightMax) − h[i]|O(n)|O(n)", "Monotonic stack|Fill horizontal layers when a taller bar arrives|O(n)|O(n)"],
    ["Are the edges walls or open?", "Bar width always 1?"],
    ["2D version (Trapping Rain Water II): min-heap from the border inward", "Stream of bars; water after each append", "Where should one bar be added to maximise water?"],
    ["Explain why the smaller-max side can be finalised.", "How does the 2D version generalise this idea?"],
    ["Water above i is determined by the lower of the tallest bars on each side.", "If leftMax < rightMax, the left cell's level is already known."]),
  P("two-pointers", 611, "Valid Triangle Number", "M", 2, "Count triplets that can form a triangle.",
    ["Sort, fix largest, two pointers|If a[l] + a[r] > a[k], add r − l and move r|O(n²)|O(1)", "Sort + binary search|For each pair, binary search the third side|O(n² log n)|O(1)"],
    ["Are zeros present? Degenerate triangles excluded?"],
    ["Count obtuse / right triangles", "Return the triangle with maximum perimeter (greedy on sorted tail)"],
    ["Why fix the largest side rather than the smallest?"],
    ["After sorting only one inequality matters: a + b > c.", "When the sum is big enough, every l' in [l, r) also works."]),
  P("two-pointers", 75, "Sort Colors (Dutch flag)", "M", 2, "Sort an array of 0s, 1s and 2s in place in one pass.",
    ["Three-way partition|lo/mid/hi pointers; swap and advance per value|O(n)|O(1)", "Counting sort|Count then overwrite (two passes)|O(n)|O(1)"],
    ["One pass required? Stable?"],
    ["k colors (bucket sort or repeated partition)", "Partition around a pivot value: the heart of quicksort / quickselect"],
    ["Why not advance mid after swapping with hi?"],
    ["Maintain three regions and one unknown zone.", "The element swapped in from hi is unexamined."]),

  // sliding-window
  P("sliding-window", 3, "Longest Substring Without Repeating Characters", "M", 1, "Length of the longest substring with all distinct characters.",
    ["Window + last-seen index|Jump l to max(l, last[c] + 1)|O(n)|O(Σ)", "Window + set|Shrink while duplicate present|O(n)|O(Σ)"],
    ["Character set (ASCII, Unicode)?", "Return the length or the substring?"],
    ["At most K distinct characters (LC 340)", "At most two repeats of each character", "Input is a stream too large to store"],
    ["Why max(l, last[c] + 1) and not just last[c] + 1?"],
    ["Track where each character was last seen.", "The left pointer must never move backwards."]),
  P("sliding-window", 76, "Minimum Window Substring", "H", 1, "Smallest substring of s containing every character of t (with multiplicity).",
    ["Window with need counts|Expand until 'formed == required', then shrink while valid|O(|s| + |t|)|O(Σ)"],
    ["Do duplicates in t count?", "Tie-breaking: first or any minimum window?"],
    ["t must appear as a subsequence in order (LC 727: DP / two-pointer scan-back)", "Smallest window containing all distinct chars of s itself", "Words instead of characters (Substring with Concatenation of All Words)"],
    ["How do you avoid re-scanning 26 counts on each step?", "What if s is a stream?"],
    ["Keep a counter of how many required characters are satisfied.", "Only shrink while the window stays valid."]),
  P("sliding-window", 1004, "Max Consecutive Ones III", "M", 1, "Longest subarray of 1s if you may flip at most k zeros.",
    ["Window on zero count|Shrink while zeros > k|O(n)|O(1)", "Non-shrinking window|If invalid, slide l by one; answer is n − l|O(n)|O(1)"],
    ["Can k be 0 or ≥ n?"],
    ["Circular array", "Flips have different costs and a budget", "Binary matrix: largest all-ones rectangle after k flips (much harder; discuss)"],
    ["Return the indices to flip", "Solve with binary search on length + prefix sums; compare"],
    ["Rephrase: longest window containing at most k zeros."]),
  P("sliding-window", 424, "Longest Repeating Character Replacement", "M", 2, "Longest substring that can become one repeated letter with at most k replacements.",
    ["Window with max frequency|Valid if len − maxFreq ≤ k; maxFreq need not decrease|O(n)|O(26)"],
    ["Uppercase only? k range?"],
    ["Replacement costs differ per character", "Must name the final letter and positions"],
    ["Why is it safe to never decrement maxFreq?"],
    ["A window is fixable if (length − most common count) ≤ k.", "Only a larger maxFreq can improve the answer."]),
  P("sliding-window", 992, "Subarrays with K Different Integers", "H", 2, "Count subarrays with exactly k distinct values.",
    ["atMost(K) − atMost(K−1)|Each r adds r − l + 1 subarrays|O(n)|O(n)", "Three pointers|Track the leftmost and rightmost valid l for each r|O(n)|O(n)"],
    ["Value range? k ≥ 1?"],
    ["Exactly k odd numbers (Count Nice Subarrays)", "Binary subarrays with sum = goal"],
    ["Why does a single 'exactly' window fail?"],
    ["'Exactly' is hard; 'at most' is easy."]),
  P("sliding-window", 1838, "Frequency of the Most Frequent Element", "M", 2, "With at most k increments, maximise the frequency of some value.",
    ["Sort + window|Valid if a[r]·len − sum ≤ k|O(n log n)|O(1)", "Sort + binary search + prefix sums|For each r binary search the furthest l|O(n log n)|O(n)"],
    ["Only increments, or decrements too?", "Bounds on k (overflow of a[r]·len)?"],
    ["Both increments and decrements allowed (target the median; LC 2968)", "Each element may change by at most k, limited number of operations (LC 3346)"],
    ["Why is the target always an existing element?"],
    ["After sorting, raise a window's elements to its right end.", "Cost = max × length − window sum."]),

  // stack
  P("stack", 20, "Valid Parentheses", "E", 1, "Check whether brackets are balanced and correctly nested.",
    ["Stack of expected closers|Push the matching closer; compare on close|O(n)|O(n)"],
    ["Only brackets, or other characters too?", "Is an empty string valid?"],
    ["Minimum removals to make valid (LC 1249) / minimum additions (LC 921)", "Wildcard '*' (LC 678: track low/high open counts)", "Longest valid parentheses substring (LC 32)"],
    ["With one bracket type, can you do O(1) space?", "How would you report the error position, like a compiler?"],
    ["A closer must match the most recent unmatched opener."]),
  P("stack", 739, "Daily Temperatures", "M", 1, "For each day, how many days until a warmer temperature?",
    ["Monotonic decreasing stack of indices|Pop while current is warmer; distance = i − popped|O(n)|O(n)", "Backward jump using answers|Scan from right, hop by known answers|O(n)|O(1) extra"],
    ["Strictly warmer? Output 0 if none?"],
    ["Circular array (Next Greater Element II: iterate 2n)", "Next greater in a linked list / stream", "Stock span (previous greater)"],
    ["Why is the total work O(n)?"],
    ["Unresolved days wait on a stack until a warmer day arrives."]),
  P("stack", 84, "Largest Rectangle in Histogram", "H", 1, "Largest axis-aligned rectangle under a histogram.",
    ["Monotonic increasing stack|On pop: height × (i − newTop − 1); sentinel 0 at end|O(n)|O(n)", "Left/right smaller arrays|Two passes then area per bar|O(n)|O(n)", "Divide & conquer on minimum|Split at min bar; segment tree for range min|O(n log n)|O(n)"],
    ["Bar width fixed at 1? Heights can be 0?"],
    ["Maximal Rectangle in a binary matrix (histogram per row)", "Largest square instead of rectangle", "Online: bars appended one at a time"],
    ["Why does a sentinel simplify the code?", "How do duplicates affect correctness?"],
    ["Each bar is the limiting height of exactly one maximal rectangle.", "You need the nearest smaller bar on each side."]),
  P("stack", 227, "Basic Calculator II", "M", 2, "Evaluate an expression with + − * / and non-negative integers.",
    ["Stack with deferred addition|Apply * and / immediately to the top; sum the stack|O(n)|O(n)", "O(1) space|Track 'last term' and running total|O(n)|O(1)"],
    ["Whitespace? Division truncation toward zero? Overflow?", "Are parentheses or unary minus possible?"],
    ["Add parentheses (Basic Calculator I/III: recursion or stack of contexts)", "Add variables and substitution (LC 770 style)", "Build an AST and support exponent / right associativity (shunting-yard)"],
    ["How would you structure this for extensibility (new operators)?"],
    ["Remember the previous operator, apply it when the next one arrives."]),
  P("stack", 394, "Decode String", "M", 2, "Decode strings like 3[a2[c]] → accaccacc.",
    ["Two stacks (counts, partial strings)|On '[' push context, on ']' pop and repeat|O(output)|O(output)", "Recursion with index|Parse a sequence until ']'|O(output)|O(depth)"],
    ["Multi-digit counts? Malformed input?", "Output size bound?"],
    ["Return only the k-th character of the decoded string without building it (LC 880)", "Encode: shortest encoding of a string (LC 471, interval DP)"],
    ["What if the decoded string is exabytes long?"],
    ["On '[', save what you have built so far and the repeat count."]),

  // mono-deque
  P("mono-deque", 239, "Sliding Window Maximum", "H", 1, "Maximum of each window of size k.",
    ["Monotonic deque|Pop smaller from back, expire front|O(n)|O(k)", "Heap with lazy deletion|Pop while top index is out of window|O(n log n)|O(n)", "Block prefix/suffix max|Split into blocks of k; max(suffix[i], prefix[i+k−1])|O(n)|O(n)"],
    ["k ≤ n? Output for each of the n−k+1 windows?"],
    ["Window median (two heaps with lazy deletion / ordered multiset)", "Max − min ≤ limit: longest such subarray", "Stream with variable window (time-based expiry)"],
    ["Why not a balanced BST?", "How does this optimise DP transitions?"],
    ["An element smaller than a newer one can never be the maximum again."]),
  P("mono-deque", 862, "Shortest Subarray with Sum at Least K", "H", 2, "Shortest non-empty subarray with sum ≥ K; values may be negative.",
    ["Prefix sums + increasing deque|Pop front while pre[i] − pre[front] ≥ K; pop back while pre[back] ≥ pre[i]|O(n)|O(n)"],
    ["Negatives allowed? Return −1 when impossible?"],
    ["All positives → plain sliding window (explain the difference)", "Longest subarray with sum ≤ K"],
    ["Why can the front be discarded once used?"],
    ["Work on prefix sums: you want the latest earlier prefix that is ≤ pre[i] − K.", "A later, smaller prefix dominates an earlier, larger one."]),
  P("mono-deque", 1438, "Longest Subarray with Absolute Diff ≤ Limit", "M", 2, "Longest subarray where max − min ≤ limit.",
    ["Two monotonic deques|Maintain window max and min; shrink while diff > limit|O(n)|O(n)", "Ordered multiset|Insert/erase with a window|O(n log n)|O(n)"],
    ["Limit can be 0?"],
    ["Count such subarrays rather than the longest", "2D matrix variant"],
    ["Compare deque vs multiset trade-offs."],
    ["You need both the max and min of the current window in O(1)."]),
  P("mono-deque", 1696, "Jump Game VI", "M", 2, "Jump at most k steps forward; maximise the sum of visited values.",
    ["DP + monotonic deque|dp[i] = a[i] + max(dp[i−k..i−1])|O(n)|O(k)", "DP + heap|Lazy-delete stale indices|O(n log n)|O(n)"],
    ["Negative values present (yes; otherwise trivial)?"],
    ["Minimum number of jumps instead of max score", "Jump lengths restricted to a set"],
    ["Derive the recurrence first, then optimise the range max."],
    ["Write the O(nk) DP, then notice the inner loop is a sliding-window maximum."]),

  // binary-search
  P("binary-search", 33, "Search in Rotated Sorted Array", "M", 1, "Find a target in a rotated sorted array of distinct values in O(log n).",
    ["Modified binary search|Identify the sorted half; check if target lies within it|O(log n)|O(1)", "Find pivot then search|Binary search for min, then standard search|O(log n)|O(1)"],
    ["Distinct values? Rotated possibly zero times?"],
    ["Duplicates allowed (LC 81, worst case O(n))", "Find the rotation count / minimum (LC 153/154)", "Array is unbounded or accessed through an API"],
    ["Why do duplicates break the O(log n) bound?"],
    ["At least one half around mid is always sorted.", "Compare a[lo] with a[mid] to decide which."]),
  P("binary-search", 162, "Find Peak Element", "M", 1, "Return any index strictly greater than its neighbours in O(log n).",
    ["Binary search on slope|If a[mid] < a[mid+1], go right; else left|O(log n)|O(1)"],
    ["Adjacent elements distinct? Boundaries count as −∞?"],
    ["2D peak (LC 1901: binary search columns, max per column)", "Peak in a mountain array through a limited-call API", "Find all peaks (must be O(n); explain why)"],
    ["Why is a peak guaranteed on the rising side?"],
    ["Follow the uphill direction; you cannot walk off the edge."]),
  P("binary-search", 34, "First and Last Position in Sorted Array", "M", 1, "Find the range of a target value in a sorted array.",
    ["Two bound searches|lower_bound(t) and lower_bound(t+1) − 1|O(log n)|O(1)"],
    ["Return [−1, −1] if absent?"],
    ["Count occurrences", "Closest element / insertion position", "Sorted array of unknown size (exponential search)"],
    ["Implement lower_bound without library calls."],
    ["Write one 'first index with a[i] ≥ x' helper and reuse it."]),
  P("binary-search", 875, "Koko Eating Bananas", "M", 1, "Minimum eating speed to finish all piles within h hours.",
    ["Binary search on speed|hours(k) = Σ ceil(p/k) is monotone decreasing|O(n log max)|O(1)"],
    ["h ≥ number of piles guaranteed?", "Overflow in the hour sum?"],
    ["Capacity to Ship Packages in D Days (order fixed, lo = max)", "Cutting Ribbons / Maximum Candies (maximise instead)", "Minimise Max Distance to Gas Station (real-valued answer)"],
    ["How do you pick lo and hi? What invalid value must lo avoid?"],
    ["If speed k works, k + 1 works.", "ceil(p / k) = (p + k − 1) / k."]),
  P("binary-search", 410, "Split Array Largest Sum", "H", 1, "Split into k contiguous parts minimising the largest part sum.",
    ["Binary search on the limit|Greedy count of parts needed under a limit|O(n log Σ)|O(1)", "DP|dp[i][j] = min over split of max(dp[p][j−1], sum(p..i))|O(n²k)|O(nk)"],
    ["Non-negative values? k ≤ n?"],
    ["Painters' partition / book allocation (same problem in disguise)", "Maximise the minimum part instead", "Parts need not be contiguous (NP-hard: discuss, do not solve)"],
    ["Prove the greedy feasibility check is optimal.", "When would you prefer the DP?"],
    ["Guess the answer X; can you cut into ≤ k parts with each ≤ X?"]),
  P("binary-search", 4, "Median of Two Sorted Arrays", "H", 1, "Median of two sorted arrays in O(log(min(m, n))).",
    ["Binary search the partition|Cut the smaller array at i, the other at half − i; check cross inequalities|O(log min(m,n))|O(1)", "k-th element by halving|Discard k/2 elements each step|O(log(m+n))|O(1)", "Merge|Two-pointer merge to the middle|O(m+n)|O(1)"],
    ["Can either array be empty?", "Even total: average of the two middles?"],
    ["k-th smallest of two sorted arrays", "Median of k sorted arrays (binary search on value)", "Median of a row-wise sorted matrix"],
    ["Why search the smaller array?", "How do sentinels ±∞ remove edge cases?"],
    ["The median splits the union into equal halves with every left ≤ every right.", "Choosing i fixes j."]),
  P("binary-search", 1146, "Snapshot Array", "M", 2, "Array supporting set, snap() and get(index, snapId).",
    ["Per-index version list + binary search|Append (snapId, value) on change; upper_bound on get|O(log S) get|O(writes)"],
    ["How many snapshots vs writes? Memory limits?"],
    ["Time-Based Key-Value Store (same idea keyed by timestamp)", "Support rollback to a snapshot / delete old snapshots", "Persistent segment tree for range queries per version"],
    ["Why not copy the array on each snap?"],
    ["Most elements do not change between snapshots; store only changes."]),
  P("binary-search", 528, "Random Pick with Weight", "M", 2, "Pick index i with probability w[i] / Σw.",
    ["Prefix sums + binary search|Draw r in [1, total]; lower_bound|O(log n) pick|O(n)", "Alias method|O(n) build, O(1) pick|O(1)|O(n)"],
    ["Weights positive integers? Can weights change?"],
    ["Weights are updated online (Fenwick tree with descent)", "Sample without replacement", "Weighted sampling from a stream (weighted reservoir)"],
    ["How would you test that the distribution is right?"],
    ["Lay the weights end to end on a number line and throw a dart."]),
  P("binary-search", 774, "Minimize Max Distance to Gas Station", "H", 3, "Add k stations on a line to minimise the largest gap.",
    ["Binary search on real answer|Stations needed for gap d = Σ floor(len / d) (minus exact fits)|O(n log(range/eps))|O(1)", "Max-heap greedy|Repeatedly split the largest effective gap|O(k log n)|O(n)"],
    ["Required precision? Can stations coincide?"],
    ["Integer positions only", "Maximise the minimum distance (Aggressive Cows / Magnetic Force)"],
    ["Why iterate a fixed number of times rather than compare floats?"],
    ["Given a maximum gap d, how many stations does each segment need?"]),

  // linked-list
  P("linked-list", 25, "Reverse Nodes in k-Group", "H", 1, "Reverse every consecutive group of k nodes; leave a short tail as is.",
    ["Iterative with group boundaries|Check k nodes exist, reverse, reconnect prev-group tail|O(n)|O(1)", "Recursive|Reverse first k, recurse on the rest|O(n)|O(n/k) stack"],
    ["Leave the remainder unreversed?", "May I change node values (usually no)?"],
    ["Reverse the last partial group too", "Reverse alternate groups", "Reverse between positions m and n (LC 92)"],
    ["Walk through pointer updates on a 5-node example with k = 2."],
    ["Use a dummy head and keep the node before each group."]),
  P("linked-list", 23, "Merge k Sorted Lists", "H", 1, "Merge k sorted linked lists into one.",
    ["Min-heap of heads|Pop smallest, push its next|O(N log k)|O(k)", "Divide & conquer|Pairwise merge in log k rounds|O(N log k)|O(1) iterative"],
    ["k and total size? Empty lists?"],
    ["Merge k sorted arrays / files too large for memory (external merge)", "Smallest range covering one element from each list (LC 632)", "Lists are infinite streams (iterator design)"],
    ["Compare heap vs divide-and-conquer constants and memory."],
    ["At any time you only need the smallest current head."]),
  P("linked-list", 142, "Linked List Cycle II", "M", 1, "Return the node where a cycle begins, O(1) space.",
    ["Floyd's tortoise and hare|Meet, then reset one pointer to head|O(n)|O(1)", "Hash set|First repeated node|O(n)|O(n)"],
    ["May I modify the list?"],
    ["Find the Duplicate Number (array as implicit list)", "Cycle length", "Intersection of two lists (LC 160)"],
    ["Prove why the second phase meets at the entry."],
    ["When they meet, how far has each travelled?"]),
  P("linked-list", 138, "Copy List with Random Pointer", "M", 2, "Deep copy a list whose nodes have next and random pointers.",
    ["Hash map old→new|Two passes|O(n)|O(n)", "Interleave clones|Weave, set randoms, unweave|O(n)|O(1)"],
    ["Random may be null or self?"],
    ["Clone a graph / a tree with random pointers", "Serialise the structure to bytes"],
    ["Why must the original list be restored in the interleaving method?"],
    ["If each clone sits right after its original, original.random.next is the clone's random."]),
  P("linked-list", 2, "Add Two Numbers", "M", 2, "Add two numbers stored as reversed-digit linked lists.",
    ["Single pass with carry|Loop while either list or carry remains|O(max(m,n))|O(1)"],
    ["Digits reversed or forward? Leading zeros?"],
    ["Digits stored most-significant first (LC 445: stacks or reverse)", "Multiply instead of add", "Arbitrary base"],
    ["How do you handle forward order without reversing the inputs?"],
    ["Keep going while there is a carry."]),
];
