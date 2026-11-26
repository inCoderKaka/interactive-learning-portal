/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */
export const notes: Record<string, string> = {
  "dynamic-arrays": `
## Structure
Contiguous, fixed-size elements: address of a[i] = base + i × size, so access is O(1).
Dynamic array = capacity ≥ length; when full, allocate a bigger buffer (×1.5 or ×2) and copy.
## Costs
Read/write O(1); append amortised O(1); pop end O(1).
Insert/delete at i: O(n − i) shifting; at the front O(n): use a deque.
Search unsorted O(n); sorted O(log n) by binary search.
## Hardware
Cache lines (64 B) and prefetching make sequential scans fast; linked-list hops are cache misses (~100 cycles).
Arrays usually beat linked lists, even for middle inserts at moderate sizes.
## Language traps
Python list = array of pointers; pop(0)/insert(0) O(n); slicing copies O(k); "x in list" is O(n).
Java int[] is primitives; ArrayList<Integer> boxes; List<Integer>.remove(int) removes by index, remove(Object) by value.
C++ vector: reserve(n) avoids reallocations; reallocation invalidates iterators, pointers and references.
2D: row-major storage; loop rows outside, columns inside; flatten (r, c) → r·cols + c.
## In-place techniques
Read/write pointers compact or filter (remove duplicates, move zeroes).
Rotate right by k: reverse all, reverse first k, reverse rest (k mod n first).
Values in [1, n]: use the array as a hash (negate a[v−1], or cyclic-sort each value into slot v−1).
Order not needed: delete by swapping with the last element and popping (O(1)).
Merge sorted arrays in place: fill from the back.
## Shapes
Product except self: prefix products × suffix products, no division.
First missing positive: cyclic placement, then the first slot i with a[i] ≠ i+1.
`,
  "hash-tables": `
## Idea
Hash function h(key) → integer; bucket = h(key) mod m. Expected O(1) insert, lookup and delete.
Collisions are unavoidable (pigeonhole); the design is how you handle them.
## Chaining vs open addressing
Chaining: each bucket holds a list; expected chain length = load factor α = n/m.
Java HashMap chains and converts a bucket to a red-black tree at 8 entries (table ≥ 64), so the worst case is O(log n).
Open addressing: entries live in the array; probe on collision.
Linear probing: h, h+1, h+2…; cache-friendly but clusters (keep α < ~0.7).
Quadratic probing and double hashing reduce clustering.
Deletion in open addressing needs tombstones or backward-shift deletion, or later probes stop early.
Python dict, Abseil SwissTable and Rust HashMap use open addressing.
## Load factor and resize
Resize (double) when α passes a threshold (Java 0.75, Python ~2/3), then rehash everything: amortised O(1).
## Hash functions
Must be deterministic, fast and spread keys uniformly; equal keys must hash equally (override equals with hashCode).
Mutable keys break maps: never mutate a key after inserting it.
Adversarial inputs can force collisions (hash flooding); languages use randomised seeds (SipHash).
## Honest costs
Expected O(1) per operation, but O(L) to hash a string of length L; worst case O(n) per lookup with bad hashing.
Iteration order: Python dicts keep insertion order; Java HashMap has no order; LinkedHashMap keeps insertion order.
## Set vs map vs ordered map
Set: membership only. Map: key → value. Ordered map (TreeMap, std::map, sortedcontainers): O(log n) with floor/ceiling and range queries.
## Compound keys
Use tuples (Python), a string join with a separator, or r·cols + c for grid cells; sort a word's letters, or use a 26-count tuple, for anagram keys.
## Probabilistic cousins
Bloom filter: k hashes into a bit array; false positives possible, never false negatives; no deletion (counting Bloom adds it).
Count-min sketch estimates frequencies; HyperLogLog estimates distinct counts.
`,
  "counting-patterns": `
## Complement lookup
Two Sum: for each x, check whether target − x was seen; store value → index as you go. O(n).
Check before inserting, so an element does not pair with itself.
## Frequency maps
Counter / int[26] for lowercase letters (a fixed array beats a hash map).
Anagram check: equal counts. Group anagrams: key = sorted word or the count tuple.
Top-k frequent: count, then a heap of size k (O(n log k)) or bucket sort by frequency (O(n)).
## Seen sets
Contains duplicate: a set, O(n).
Longest consecutive sequence: put everything in a set; start counting only at x where x−1 is absent → O(n).
## Majority vote (Boyer–Moore)
Keep a candidate and a count: same → +1, different → −1, zero → adopt the new element.
Works when a majority (> n/2) is guaranteed; otherwise verify with a second pass.
For > n/3, keep two candidates and two counts.
## Transformations
Normalise before counting: lowercase, sort, difference between consecutive items, or a parity/bitmask signature.
Isomorphic strings / word pattern: two maps, one in each direction (a bijection).
## Prefix counts
Count of subarrays with a property = map of prefix state → occurrences (see the prefix-sum + hash page).
## Memory
A hash map uses O(distinct keys) space; with a small fixed alphabet, prefer an array of 26 or 128.
`,
  "prefix-sums": `
## 1D
P[0] = 0, P[i+1] = P[i] + a[i]; sum(l..r) = P[r+1] − P[l]. Build O(n), query O(1).
The extra leading 0 removes the l = 0 special case.
## 2D
P[r+1][c+1] = a[r][c] + P[r][c+1] + P[r+1][c] − P[r][c].
Sum of rectangle (r1,c1)…(r2,c2) = P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1] (inclusion–exclusion).
## Difference arrays
To add v on [l, r]: D[l] += v, D[r+1] −= v; a prefix sum of D rebuilds the array. O(1) per update, O(n) to rebuild.
Car pooling, corporate flight bookings and range-increment problems use this.
2D difference: four corner updates, then 2D prefix sums.
Sweep-line counting ("max overlapping intervals") is a difference array over sorted events.
## Other prefix operations
Prefix products (product except self), prefix XOR (xor(l..r) = X[r+1] ^ X[l]), prefix max/min (not invertible: no range queries).
Prefix counts of a predicate: how many vowels or ones in a range.
## On other structures
Trees: root-to-node path sums; a sum on the path u–v uses LCA.
Strings: rolling hash prefixes give O(1) substring hashes.
Updates plus queries: use a Fenwick or segment tree instead.
## Checklist
Watch off-by-one (inclusive r), overflow (use long), and negative numbers (fine for prefix sums, but they break sliding windows).
`,
  "prefix-hash": `
## Pattern
Subarray (i..j] has sum k ⟺ P[j] − P[i] = k ⟺ P[i] = P[j] − k.
Scan j, look up how many earlier prefixes equal P[j] − k, add that count, then record P[j].
Seed the map with {0: 1} so subarrays starting at index 0 count.
## Why not a sliding window
With negative numbers, the window sum is not monotonic: growing or shrinking gives no reliable signal.
A sliding window works only for non-negative arrays.
## Variants
Count of subarrays with sum k (LC 560): map prefix → count.
Longest subarray with sum k: map prefix → first index seen (never overwrite).
Divisible by k (LC 974): key = P mod k, normalised to be non-negative ((P % k + k) % k).
Continuous subarray sum, multiple of k with length ≥ 2 (LC 523): store the first index of each remainder; check j − i ≥ 2.
Equal 0s and 1s (LC 525): map 0 → −1; find the longest zero-sum subarray.
Count subarrays with an odd count of odds, or k odds: prefix count of odds.
XOR version: subarrays with XOR k → look up X[j] ^ k.
Path sum III on trees: the same map along the root path, with backtracking (decrement on the way out).
Submatrices summing to target: fix a pair of rows, compress columns, run the 1D version: O(r²·c).
## Correctness
Every subarray ending at j corresponds to exactly one earlier prefix i, so counting matching prefixes counts subarrays exactly once.
## Complexity
O(n) time, O(n) space. Insert after the lookup, or k = 0 would count empty subarrays.
`,
  kadane: `
## Recurrence
best_ending_here(i) = max(a[i], best_ending_here(i−1) + a[i]): extend or restart.
Answer = max over i of best_ending_here(i). O(n) time, O(1) space.
Restart exactly when the running sum would be negative: a negative prefix only hurts.
## Edge cases
All negative: the answer is the largest element. Initialise with a[0], not 0, unless empty subarrays are allowed.
Track start and end indices: reset the start when you restart.
## Variants
Maximum product subarray: track both max and min ending here (a negative flips them); zero resets.
Circular (LC 918): max(normal Kadane, total − minimum subarray); if all negative, use the normal answer.
At most one deletion (LC 1186): two states, no-delete and one-delete.
Maximum sum rectangle in a matrix: fix the row pair, compress columns, Kadane: O(r²·c).
Best time to buy and sell stock: Kadane on daily differences, or track the minimum price so far.
Kadane is a 1D DP with an O(1) rolling state; it is also the greedy "drop a negative prefix".
## Why it works
The best subarray ending at i either is a[i] alone or extends the best ending at i−1; any other extension is worse.
Divide and conquer gives O(n log n) (best left, best right, best crossing the middle); it shows up when segment trees answer range max-subarray queries.
`,
};
