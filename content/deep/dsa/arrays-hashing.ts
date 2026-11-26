import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

export const arraysHashing: Record<string, Deep> = {
  "dynamic-arrays": {
    blurb: "Contiguous memory, O(1) indexing, amortised O(1) append and O(n) middle inserts. Why arrays win on real hardware, and the operations that quietly cost linear time.",
    signals: ["Index-based access, iteration, in-place rearrangement", "Choosing between an array, a linked list and a deque", "\"Do it in place\" or \"O(1) extra space\""],
    lesson: md`
## What an array is

An array stores elements of one size **contiguously**. Element i lives at address base + i × size, so reading or writing any index is **O(1)**. A **static array** has a fixed length; a **dynamic array** (C++ \`vector\`, Java \`ArrayList\`, Python \`list\`, Go slices) keeps a capacity larger than its length and reallocates when full.

## Operation costs

| Operation | Cost | Why |
|---|---|---|
| Read / write a[i] | O(1) | address arithmetic |
| Append at end | amortised O(1) | occasional doubling copy |
| Pop from end | O(1) | |
| Insert / delete at index i | O(n − i) | shift the tail |
| Insert / delete at front | O(n) | shift everything (use a deque instead) |
| Search unsorted | O(n) | |
| Search sorted | O(log n) | binary search |

## Why arrays are fast in practice

CPUs load memory in **cache lines** (typically 64 bytes) and prefetch sequential addresses. Scanning an array touches consecutive lines, so it runs near memory bandwidth. A linked list's nodes are scattered, and each hop can be a cache miss costing ~100 CPU cycles. For most workloads an array (or a deque built from array blocks) beats a linked list even for middle inserts up to surprisingly large sizes.

## Language specifics worth knowing

- **Python list**: an array of pointers to objects. \`append\` amortised O(1); \`insert(0, x)\` and \`pop(0)\` O(n) (use \`collections.deque\`). Slicing copies (O(k)). \`x in list\` is O(n).
- **Java**: \`int[]\` holds primitives contiguously; \`ArrayList<Integer>\` holds boxed objects (extra indirection and memory). \`Arrays.asList\` is fixed-size. \`remove(int index)\` vs \`remove(Object o)\` is a classic overload bug with \`List<Integer>\`.
- **C++**: \`vector::push_back\` amortised O(1); \`reserve(n)\` avoids reallocations; **iterators and references are invalidated** on reallocation, a real bug source. \`vector<bool>\` is a bit-packed special case.

## 2D arrays

Stored row-major in C/C++/Python (NumPy default) and as arrays of row arrays in Java/Python lists. Iterate row by row (inner loop over columns) for cache-friendly access; column-major traversal of a large matrix can be several times slower. Flatten (r, c) → r × cols + c when you need one index.

## In-place array techniques

- **Read/write pointers**: compact or filter an array in place (remove duplicates, move zeroes).
- **Reversal tricks**: rotate by k = reverse all, reverse first k, reverse the rest.
- **Index as hash**: for values in [1, n], use a[i] itself as a marker (negate a[v − 1], or swap each value into its home slot: cyclic sort). First Missing Positive and Find All Duplicates use this in O(n) time, O(1) space.
- **Swap-to-end deletion**: if order does not matter, delete i by swapping with the last element and popping: O(1).

## Common interview shapes

- Product of Array Except Self (prefix and suffix products, no division).
- Rotate Array (three reversals).
- First Missing Positive (cyclic placement).
- Merge Sorted Array from the back (fill from the end to avoid overwriting).
`,
    doubts: [
      ["If insertion in the middle is O(n), why not always use a linked list?", "Because the linked list must first find the position (O(n) pointer chasing) and every hop risks a cache miss, while an array shift is one fast memmove. Linked lists only win when you already hold a pointer to the insertion point and do many such edits (LRU cache), or when you must never move elements."],
      ["What does 'iterator invalidation' mean?", "In C++, push_back may reallocate the buffer; pointers, references and iterators into the old buffer then dangle. Classic bug: holding a reference to v[0], pushing back, then using the reference."],
      ["How does rotate-by-three-reversals work?", "Rotating right by k moves the last k elements to the front. Reversing the whole array puts them at the front but backwards; reversing the first k and then the remaining n − k restores both blocks' internal order. Three linear passes, O(1) space."],
      ["Is Python's list really an array?", "Yes: a contiguous array of object pointers with over-allocation (growth factor about 1.125 plus a constant). The objects themselves live elsewhere, so a list of ints is far larger than an int array; use the array module or NumPy for dense numeric data."],
    ],
    revise: md`
? Array index access cost and why? :: O(1): address = base + i × element size.
? Insert at the front of a dynamic array? :: O(n): every element shifts. Use a deque.
? Why do arrays beat linked lists in practice? :: Contiguity: cache lines and prefetching.
? Rotate right by k in O(1) space? :: Reverse all, then reverse the first k, then reverse the rest.
? Values in [1, n], O(1) extra space marking? :: Use the array as a hash: negate a[v−1] or cyclic-sort values into place.
? C++ reallocation hazard? :: Iterators, pointers and references into the vector are invalidated.
? Merge two sorted arrays in place into the first? :: Fill from the back to avoid overwriting.
`,
    pitfalls: ["list.pop(0) or insert(0, x) in a loop (quadratic)", "Holding a reference into a vector across push_back", "Java remove(int) vs remove(Object) on List<Integer>", "Iterating a 2D array column-first on large inputs"],
    quiz: [
      Q("Deleting an element when order does not matter, in O(1)?", ["Shift left", "*Swap with the last element and pop", "Mark it null", "Impossible"], "Order is not preserved, which is the trade."),
      Q("Find the smallest missing positive in O(n) time and O(1) extra space. Key idea?", ["Sort", "Hash set", "*Use indices as markers / cyclic placement", "Binary search"], "Values in [1, n] map to indices."),
    ],
    sources: [
      S.book("Algorithms, 4th ed. §1.3 Bags, Queues and Stacks (resizing arrays)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/13stacks/"),
      S.article("Dynamic array", "Wikipedia", "https://en.wikipedia.org/wiki/Dynamic_array"),
      S.article("TimeComplexity of Python operations", "Python Wiki", "https://wiki.python.org/moin/TimeComplexity"),
      S.article("std::vector (iterator invalidation)", "cppreference", "https://en.cppreference.com/w/cpp/container/vector"),
    ],
    problems: [238, 41, 189, 88, 442, 27, 283],
  },

  "hash-tables": {
    blurb: "How a hash map really works: hash functions, buckets, chaining versus open addressing, load factor and resizing, and the worst cases interviewers like to probe.",
    signals: ["\"Have I seen this before?\" or \"how many times?\" in O(1)", "Lookup by key instead of by position", "Deduplication, grouping, counting, caching (memoisation)"],
    widgets: ["hash-table"],
    lesson: md`
## The idea

A **hash table** maps keys to values with expected O(1) insert, lookup and delete. A **hash function** h turns a key into an integer; the table stores the entry in bucket h(key) mod m, where m is the number of buckets.

Two keys can land in the same bucket: a **collision**. Collisions are unavoidable (pigeonhole: more possible keys than buckets) and the design of a hash table is the design of how it handles them.

[[widget:hash-table]]

## Collision resolution

**Separate chaining.** Each bucket holds a list (or small tree) of entries. Lookup hashes to the bucket and scans it. Expected chain length is the **load factor α = n / m**. Java's \`HashMap\` uses chaining and converts a bucket to a red-black tree once it holds 8 entries (and the table has at least 64 buckets), so worst-case lookup becomes O(log n) instead of O(n).

**Open addressing.** All entries live in the array itself. On collision, **probe** other slots:
- *linear probing*: try h, h+1, h+2, …. Excellent cache behaviour, but clusters form (primary clustering), so keep α below ~0.7.
- *quadratic probing*: h + 1², h + 2², … reduces clustering.
- *double hashing*: step size from a second hash function.

Deletion is subtle with open addressing: you cannot just empty a slot, or later probes stop early. Use **tombstones** (a "deleted" marker) or backward-shift deletion. Python's \`dict\` uses open addressing; so do Google's SwissTable (Abseil \`flat_hash_map\`) and Rust's \`HashMap\`.

## Load factor and resizing

As α grows, chains lengthen or probe sequences lengthen. Tables **resize** (typically double) when α crosses a threshold (Java: 0.75; Python dict: about 2/3) and **rehash** every entry into the new array. Like dynamic arrays, doubling makes insertion amortised O(1).

## What makes a good hash function

- **Deterministic** and fast.
- **Uniform**: spreads keys evenly across buckets.
- Uses all of the key (a string hash that only reads the first 8 characters collides on common prefixes).
- For security-sensitive services, **randomised (seeded)**: Python, Ruby and Rust randomise string hashing (SipHash) per process to defeat **hash-flooding** denial-of-service, where an attacker sends many keys that collide.

**Equality and hashing must agree**: if a.equals(b) then hash(a) == hash(b). In Java, overriding equals without hashCode breaks HashMap. **Mutable keys** are a bug: if a key's hash changes after insertion, the entry becomes unreachable.

## Costs honestly stated

| Operation | Expected | Worst case |
|---|---|---|
| insert / lookup / delete | O(1) | O(n) chaining with lists; O(log n) Java 8+ treeified buckets |
| iterate | O(n + m) | |
| resize | O(n) | amortised O(1) per insert |

Expected O(1) assumes a good hash and bounded load factor. Interviewers ask "what is the worst case?" to see whether you know the difference.

## Hash set vs hash map vs ordered map

- **Hash set**: membership only.
- **Hash map**: key → value.
- **Ordered map** (TreeMap, C++ \`std::map\`, a balanced BST): O(log n) operations but keys stay sorted, so you get floor, ceiling, range queries and in-order iteration. Choose it whenever order matters.

## Keys for compound state

- Tuples (Python), \`pair\` with a custom hash (C++ \`unordered_map\` needs one), or encode as a string or a 64-bit integer (r × cols + c).
- **Sorted-tuple or count-signature keys** group anagrams: sorted string, or a 26-length count tuple (O(k) instead of O(k log k)).
- **Canonical forms**: normalise before hashing (lowercase, sorted, rotated to the smallest representation).

## Bloom filters and friends

When you only need "definitely not present / probably present" in tiny memory, a **Bloom filter** uses k hash functions and a bit array, with false positives but no false negatives. Count-Min sketches estimate frequencies. These appear in system design (cache filters, LSM-tree SSTable lookups).
`,
    doubts: [
      ["Why does the table size often have to be a power of two or a prime?", "Powers of two make 'mod m' a fast bit-mask, but then a weak hash with poor low bits collides badly, so implementations mix the hash (Java's HashMap XORs the high bits into the low bits). Primes make the modulo spread weak hashes better. Both are design choices; good hash mixing matters more."],
      ["Is a C++ unordered_map slow?", "Its standard-mandated design (node-based chaining, stable references) causes many allocations and cache misses. Open-addressing tables like Abseil's flat_hash_map are often 2–5× faster. In competitive programming it can also be attacked with crafted keys; a custom randomised hash fixes that."],
      ["Why can't I use a list as a dict key in Python?", "Lists are mutable, so their hash could change after insertion and the entry would be lost. Use a tuple (immutable) or a frozenset."],
      ["How does deletion work with linear probing?", "Emptying the slot would break the probe chain for keys inserted after it. Mark it as a tombstone (treated as occupied during lookup, free during insertion), or shift later entries of the cluster back. Too many tombstones trigger a rebuild."],
      ["When is a sorted array or BST better than a hash map?", "When you need order (min, max, floor, ceiling, range iteration, k-th element), worst-case guarantees, or a small memory footprint for static data (binary search on a sorted array is cache-friendly and has no overhead)."],
      ["Is hashing a string O(1)?", "No, O(length). A map keyed by strings of length k costs O(k) per operation. Languages often cache a string's hash after the first computation (Java does)."],
    ],
    revise: md`
? Load factor α? :: n / m, entries per bucket; expected chain or probe length grows with it.
? Separate chaining vs open addressing? :: Chaining: a list per bucket. Open addressing: probe other array slots.
? Why tombstones in open addressing? :: Emptying a slot would cut probe chains for later keys.
? Java HashMap resize threshold and treeify rule? :: Load factor 0.75; a bucket becomes a red-black tree at 8 entries (table ≥ 64).
? Expected vs worst-case lookup? :: Expected O(1); worst O(n) with list chaining (O(log n) with treeified buckets).
? equals/hashCode contract? :: Equal objects must have equal hashes.
? Hash flooding defence? :: Seeded / randomised hash functions (e.g. SipHash).
? Need floor/ceiling or sorted iteration? :: Use an ordered map (balanced BST), O(log n).
? Group anagrams key in O(k)? :: A 26-length count tuple.
`,
    pitfalls: ["Calling hash lookups O(1) worst case", "Mutable objects as keys", "Overriding equals without hashCode in Java", "unordered_map<pair<int,int>,…> without a hash function in C++", "Forgetting that hashing a string costs O(length)"],
    quiz: [
      Q("Linear probing at a high load factor mainly suffers from…", ["False positives", "*Primary clustering", "Tombstone overflow", "Hash randomisation"], "Runs of occupied slots grow and merge."),
      Q("In Java, two keys are equal but have different hashCodes. Lookup…", ["works", "*can fail", "throws", "is slower but correct"], "They map to different buckets."),
      Q("Which structure supports 'smallest key ≥ x' in O(log n)?", ["HashMap", "*TreeMap / balanced BST", "Bloom filter", "Array list"], "Hash maps have no order."),
    ],
    sources: [
      S.book("Algorithms, 4th ed. §3.4 Hash Tables", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/34hash/"),
      S.book("Introduction to Algorithms (CLRS), ch. 11: Hash Tables", "Cormen, Leiserson, Rivest, Stein", "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/"),
      S.article("Swiss Tables design notes", "Abseil", "https://abseil.io/about/design/swisstables"),
      S.article("HashMap (Java SE 21)", "Oracle", "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html"),
      S.paper("Space/time trade-offs in hash coding with allowable errors (Bloom, 1970)", "Communications of the ACM", "https://doi.org/10.1145/362686.362692"),
    ],
    problems: [1, 49, 128, 217, 242, 705, 706, 380],
  },

  "counting-patterns": {
    blurb: "Frequency maps, \"seen\" sets, complement lookups and majority voting: the small toolkit behind most easy and medium array problems.",
    signals: ["Pairs that sum to a target (complement lookup)", "Duplicates, anagrams, \"appears more than n/k times\"", "Counting occurrences or comparing two multisets"],
    lesson: md`
## Complement lookup

**Two Sum**: for each x, check whether target − x was seen; then record x. One pass, O(n) time and space. Insert *after* checking, or x pairs with itself. Variants:
- count pairs with difference k (look for x − k and x + k; careful with k = 0);
- pairs divisible by k (bucket by remainder r; pair r with k − r; special-case 0 and k/2);
- Two Sum on a sorted array (two pointers, O(1) space) or a BST (in-order iterators from both ends).

## Frequency maps

A \`Counter\` / \`HashMap<T, Integer>\` / fixed array of 26 or 128 counts. Patterns:
- **anagram check**: equal count vectors;
- **ransom note / can construct**: every needed count ≤ available count;
- **first unique character**: count, then scan in order;
- **top-k frequent**: count, then bucket sort by frequency (O(n)) or a heap of size k (O(n log k));
- **sort by frequency**: count, then sort keys by (−count, key).

Use a fixed-size array when the alphabet is small: faster and allocation-free.

## Seen sets and "is it consecutive?"

**Longest Consecutive Sequence** in O(n): put all values in a set; start counting only from values x where x − 1 is absent (sequence starts), then extend upward. Each value is visited at most twice.

## Majority vote

**Boyer–Moore majority vote** finds an element occurring more than n/2 times in O(n) time and **O(1)** space: keep a candidate and a counter; increment on a match, decrement otherwise, replace the candidate when the counter hits 0. Pairs of different elements cancel, and a true majority cannot be fully cancelled. Verify with a second pass if a majority is not guaranteed. Generalisation: at most k − 1 candidates for "more than n/k" (Majority Element II uses two).

## Counting with transformations

- Map each item to a **signature** first: sorted letters (anagrams), the pattern of first occurrences ("abb" → 0,1,1 for isomorphic strings / word pattern), the gaps between letters (shifted strings), the row/column canonical form.
- Then count or group by signature.

## Prefix counts (bridge to the next pages)

"How many subarrays have property P" usually becomes "for each end, how many earlier prefixes satisfy something", which is a count in a hash map: see prefix sum + hash map.

## Complexity and memory

Hash-based counting is O(n) expected time and O(distinct) space. If the interviewer asks for O(1) space, the options are sorting (O(n log n), destroys order), using the array as its own hash (values in [1, n]), bit tricks (XOR for single-number problems) or voting algorithms.
`,
    doubts: [
      ["Why check before inserting in Two Sum?", "If you insert x first, then x pairs with itself whenever target = 2x, even if x appears once. Checking first means you only pair with earlier elements."],
      ["Why does Boyer–Moore voting work?", "Every decrement cancels one occurrence of the candidate against one different element. A value that occurs more than n/2 times cannot be cancelled by fewer than n/2 others, so it survives as the final candidate."],
      ["Longest Consecutive Sequence: isn't the inner while loop O(n²)?", "Counting only starts at sequence beginnings (x − 1 not in the set), so each number is extended over exactly once across the whole run. Total O(n)."],
      ["Array of 26 counts or a hash map?", "Array when the alphabet is known and small: faster, no hashing, fixed memory. Hash map for arbitrary keys."],
    ],
    revise: md`
? Two Sum one-pass order of operations? :: Check target − x in the map, then insert x.
? Pairs divisible by k? :: Count remainders; pair r with k − r; handle r = 0 and r = k/2 separately.
? Top-k frequent in O(n)? :: Count, then bucket sort by frequency.
? Longest consecutive in O(n)? :: Set of values; extend only from x where x − 1 is absent.
? Majority (> n/2) in O(1) space? :: Boyer–Moore voting: candidate + counter; verify if not guaranteed.
? Majority Element II (> n/3)? :: Two candidates, two counters, then verify.
? Isomorphic strings / word pattern signature? :: Map each item to the index of its first occurrence.
`,
    pitfalls: ["Inserting before checking in Two Sum", "Forgetting to verify the Boyer–Moore candidate when majority is not guaranteed", "Sorting for anagram keys when a count tuple is O(k)", "Off-by-one in remainder pairing (r = 0, r = k/2)"],
    quiz: [
      Q("Majority element in O(n) time, O(1) space:", ["Sort and take middle", "Hash counts", "*Boyer–Moore voting", "Binary search"], "Sorting is O(n log n); hashing uses O(n) space."),
      Q("Longest Consecutive Sequence (unsorted) in O(n):", ["Sort", "*Hash set, extend from sequence starts", "Union-find only", "Heap"], "Each value is touched a constant number of times."),
    ],
    sources: [
      S.paper("MJRTY: a fast majority vote algorithm (Boyer & Moore)", "University of Texas", "https://www.cs.utexas.edu/~moore/best-ideas/mjrty/"),
      S.article("Boyer–Moore majority vote algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_majority_vote_algorithm"),
      S.article("collections.Counter", "Python documentation", "https://docs.python.org/3/library/collections.html#collections.Counter"),
    ],
    problems: [1, 169, 229, 347, 128, 41, 1497, 387, 205, 290, 451],
  },

  "prefix-sums": {
    blurb: "Precompute cumulative sums once and answer any range sum in O(1). The 2D version, difference arrays for range updates, and prefix products.",
    signals: ["Many range-sum queries on a static array", "Range updates applied in bulk, then read once (difference array)", "Sums over rectangles in a grid", "Product of array except self"],
    widgets: ["prefix-sum"],
    lesson: md`
## 1D prefix sums

Define P[0] = 0 and P[i + 1] = P[i] + a[i]. Then the sum of a[l..r] (inclusive) is **P[r + 1] − P[l]**. Building P is O(n); each query is O(1).

The extra leading zero (length n + 1) removes the special case l = 0. Always use it.

Overflow: sums of up to 10⁵ values up to 10⁹ reach 10¹⁴: use 64-bit integers.

## 2D prefix sums

P[i + 1][j + 1] = a[i][j] + P[i][j + 1] + P[i + 1][j] − P[i][j]. The sum over rows r1..r2 and columns c1..c2 is

P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1]

by **inclusion–exclusion**: add the big rectangle, subtract the two strips, add back the corner subtracted twice. Range Sum Query 2D (LC 304), Maximal Square variants, and "count submatrices with sum k" (fix two rows, then run 1D prefix + hash map over columns: O(R² · C)).

## Difference arrays: the inverse

To add v to every element of a[l..r] for many updates, then read the final array once:

D[l] += v; D[r + 1] −= v; at the end, a = prefix sums of D.

Each update is O(1); the final pass is O(n). Corporate Flight Bookings (LC 1109), Car Pooling (LC 1094), "how many intervals cover each point". In 2D, add at four corners. When updates and queries interleave, you need a Fenwick or segment tree instead.

## Prefix products and other prefix operations

Any associative operation with an inverse works the same way (sums, XOR: range XOR = P[r+1] ⊕ P[l]). Without an inverse (min, max, gcd) you cannot subtract, so use a sparse table or a segment tree.

**Product of Array Except Self** without division: prefix products from the left times suffix products from the right; O(1) extra space by reusing the output array.

## Prefix sums on other structures

- **Trees**: root-to-node sums; path sum u–v = S[u] + S[v] − 2·S[lca] + val[lca].
- **Strings**: prefix counts per letter answer "how many 'a's in s[l..r]" in O(1) (26 arrays).
- **Running balance**: treat '(' as +1 and ')' as −1; validity and longest valid substring become prefix-balance questions.

## Interview checklist

- Use length n + 1 with P[0] = 0.
- 64-bit accumulators.
- Inclusive vs exclusive bounds stated out loud.
- Static data → prefix sums; updates interleaved with queries → Fenwick / segment tree.
`,
    doubts: [
      ["Why add a leading zero?", "So that the sum of a[0..r] is P[r+1] − P[0] like every other range, with no branch for l = 0. It also lets 'empty prefix' be a valid prefix, which matters in prefix + hash map counting."],
      ["When do prefix sums stop working?", "When the array changes between queries (rebuilding is O(n) each time) or when the operation has no inverse (min, max). Use a Fenwick tree for point updates with range sums, a segment tree for general operations."],
      ["How does the difference array handle the end of the array?", "Allocate n + 1 slots so D[r + 1] is always valid; the last slot is never read when you rebuild."],
      ["Is 2D prefix sum construction O(R·C)?", "Yes, one pass with the inclusion–exclusion recurrence. Each rectangle query is then O(1)."],
    ],
    revise: md`
? Range sum a[l..r] from prefix array P (P[0] = 0)? :: P[r + 1] − P[l].
? 2D rectangle sum? :: P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1].
? Add v to a[l..r] with a difference array? :: D[l] += v, D[r+1] −= v, then prefix-sum D.
? Range XOR? :: P[r+1] XOR P[l].
? Range min with prefix arrays? :: Not possible (no inverse): use a sparse table or segment tree.
? Product except self without division? :: Prefix products × suffix products.
? Count submatrices with sum k? :: Fix a pair of rows, compress columns, then 1D prefix + hash map.
`,
    pitfalls: ["Off-by-one between inclusive r and P[r+1]", "32-bit overflow of prefix sums", "Using prefix sums when the array is updated between queries", "Trying prefix 'min' (no inverse)"],
    quiz: [
      Q("Sum of a[2..5] with P[0] = 0?", ["P[5] − P[2]", "*P[6] − P[2]", "P[6] − P[1]", "P[5] − P[1]"], "Inclusive r = 5 → P[6]; l = 2 → subtract P[2]."),
      Q("10⁵ range-increment updates then one read of the final array:", ["Segment tree", "*Difference array", "Fenwick per update", "Brute force"], "O(1) per update and one O(n) pass."),
    ],
    sources: [
      S.article("Prefix sum", "Wikipedia", "https://en.wikipedia.org/wiki/Prefix_sum"),
      S.article("Prefix sums (with 2D)", "USACO Guide", "https://usaco.guide/silver/prefix-sums"),
      S.article("Summed-area table", "Wikipedia", "https://en.wikipedia.org/wiki/Summed-area_table"),
    ],
    problems: [303, 304, 238, 1109, 1094, 724, 1074],
  },

  "prefix-hash": {
    blurb: "Count or find subarrays with a target sum (or remainder, or balance) in one pass by storing earlier prefix values in a hash map. Works with negatives, where sliding windows fail.",
    signals: ["\"Number of subarrays with sum k\" (with negatives allowed)", "Longest subarray with sum k / equal 0s and 1s / balanced counts", "Subarray sums divisible by k", "Anything where a window is not monotone"],
    widgets: ["prefix-sum"],
    lesson: md`
## The pattern

A subarray a[l..r] has sum k exactly when **P[r + 1] − P[l] = k**, i.e. P[l] = P[r + 1] − k. So as you scan, keep a hash map of how many times each prefix value has appeared; at each position add count[P − k] to the answer, then record P.

\`\`\`
count = {0: 1}; P = 0; ans = 0
for x in a:
    P += x
    ans += count.get(P - k, 0)
    count[P] = count.get(P, 0) + 1
\`\`\`

The initial {0: 1} represents the empty prefix, so subarrays starting at index 0 are counted.

[[widget:prefix-sum]]

## Why a sliding window does not work here

Sliding windows rely on monotonicity: extending the window never decreases the sum. With **negative numbers** that breaks, so you cannot decide whether to shrink or grow. Prefix + hash map does not care about signs. Conversely, with **non-negative** numbers a sliding window solves "subarray sum = k" in O(1) space.

## Variants

| Problem | Store | Look up |
|---|---|---|
| Count subarrays with sum k (LC 560) | count of each prefix | P − k |
| Longest subarray with sum k (LC 325) | **first index** of each prefix | P − k, length i − first |
| Subarray sums divisible by k (LC 974) | count of each P mod k (normalised to [0, k)) | same remainder |
| Continuous subarray sum, length ≥ 2, multiple of k (LC 523) | first index of each remainder | same remainder with gap ≥ 2 |
| Contiguous array: equal 0s and 1s (LC 525) | map 0 → −1, first index of each prefix | same prefix |
| Count subarrays with exactly k odd numbers (LC 1248) | map odd → 1, even → 0, then sum = k | P − k |
| Binary subarrays with sum (LC 930) | counts | P − goal |
| Count submatrices with sum target (LC 1074) | per pair of rows, columns as a 1D array | P − target |

Key decisions per variant:
- **counts** (number of subarrays) vs **first index** (longest) vs **last index** (shortest);
- normalise remainders in languages where % can be negative (Java/C++): r = ((P % k) + k) % k;
- transform the array (0 → −1, odd → 1) to turn a balance or parity question into a sum question.

## Proof of correctness in one line

Every subarray ending at r corresponds to exactly one earlier prefix P[l] with l ≤ r; the map holds exactly those prefixes, with multiplicities. So the answer increments count every valid (l, r) pair once.

## Complexity

O(n) expected time, O(n) space for the map. The same idea on trees (prefix sums along root-to-node paths, with the map undone on backtracking) solves **Path Sum III** (LC 437) in O(n).
`,
    doubts: [
      ["Why initialise the map with {0: 1}?", "It stands for the empty prefix before index 0. Without it, a subarray starting at index 0 whose sum is exactly k would be missed, because it needs P[l] = 0 with l = 0."],
      ["For the longest subarray, why store the first index and never update it?", "To maximise r − l, you want the earliest l with the needed prefix value. Overwriting with later indices would shorten the result."],
      ["Why normalise the remainder?", "In Java and C++, −3 % 5 is −3, not 2. Prefixes that differ by a multiple of k must land on the same key, so map remainders into [0, k)."],
      ["Can this find the subarray itself, not just count?", "Yes: store indices instead of counts, and when a match is found you know l (from the map) and r (the current position)."],
      ["Path Sum III: why remove the prefix when backtracking?", "The map must contain only prefixes on the current root-to-node path. When DFS leaves a node, its prefix is no longer an ancestor of later nodes, so decrement its count."],
    ],
    revise: md`
? Core identity? :: sum(l..r) = k ⟺ P[l] = P[r+1] − k.
? Map initial value for counting? :: {0: 1}, the empty prefix.
? Count vs longest? :: Count: store counts. Longest: store the first index of each prefix.
? Divisible by k? :: Count prefix remainders (normalised to [0, k)); same remainder ⇒ divisible.
? Equal 0s and 1s? :: Map 0 → −1; longest subarray with sum 0.
? Why not sliding window? :: Negatives break monotonicity.
? Path Sum III? :: Prefix + hash map along the DFS path, decrementing on backtrack.
`,
    pitfalls: ["Forgetting {0: 1}", "Overwriting the first index when you need the longest", "Negative remainders in Java/C++", "Using a sliding window with negative numbers", "Recording P before querying (counts the empty subarray)"],
    quiz: [
      Q("a = [1, −1, 0], k = 0. Number of subarrays with sum 0?", ["1", "2", "*3", "4"], "[1,−1], [0], [1,−1,0]."),
      Q("Longest subarray with sum k: store…", ["the last index of each prefix", "*the first index of each prefix", "counts", "nothing"], "Earliest l maximises length."),
      Q("Subarray Sum Equals K with negatives: best approach?", ["Sliding window", "*Prefix sums + hash map", "Two pointers", "Sorting"], "Signs do not matter for prefix differences."),
    ],
    sources: [
      S.article("Prefix sums (with hash map variants)", "USACO Guide", "https://usaco.guide/silver/prefix-sums"),
      S.article("Subarray sum equals K: editorial discussion", "LeetCode", "https://leetcode.com/problems/subarray-sum-equals-k/editorial/"),
    ],
    problems: [560, 974, 523, 525, 325, 930, 1248, 437, 1074],
  },

  kadane: {
    blurb: "Maximum subarray in one pass: at each position, extend the best run ending here or start fresh. The smallest example of dynamic programming, with circular and product variants.",
    signals: ["Maximum (or minimum) sum of a contiguous subarray", "Best time to buy and sell once (max difference)", "Circular arrays", "Maximum product subarray"],
    lesson: md`
## The recurrence

Let best[i] be the maximum sum of a subarray **ending exactly at i**. Either it extends the best subarray ending at i − 1, or it starts fresh at i:

best[i] = max(a[i], best[i − 1] + a[i])

The answer is max over i of best[i]. Only the previous value is needed, so space is O(1):

\`\`\`
cur = best = a[0]
for x in a[1:]:
    cur = max(x, cur + x)
    best = max(best, cur)
\`\`\`

The intuition: a negative running prefix can never help a future subarray, so drop it.

This is DP in its simplest form: state = "ends at i", transition = extend or restart. Recognising "ending exactly here" as the state is the transferable skill.

## Edge cases

- **All negative**: the answer is the largest single element. Initialising best = 0 is a classic bug (it returns 0, an empty subarray, unless empty is allowed).
- **Return indices**: track the start when you restart (cur = x) and record start/end when best improves.

## Variants

- **Minimum subarray sum**: same with min.
- **Circular maximum subarray** (LC 918): the best either does not wrap (plain Kadane) or wraps, in which case it equals total − (minimum subarray). Special case: if all elements are negative, the wrap formula gives 0 (empty), so return the plain maximum.
- **Maximum product subarray** (LC 152): a negative number flips the largest product into the smallest. Track both max and min ending here: new max = max(x, x·max, x·min), new min = min(x, x·max, x·min). Zeros reset both.
- **Best Time to Buy and Sell Stock** (LC 121): maximum of prices[j] − prices[i] for i < j. Track the minimum price so far; equivalently Kadane on daily differences.
- **Maximum subarray with at most one deletion** (LC 1186): two states, "ending here with no deletion" and "with one deletion".
- **2D maximum sum rectangle**: fix top and bottom rows, compress columns, run Kadane: O(R² · C).
- **Divide and conquer** O(n log n) solution (left, right, crossing): worth naming as the alternative; it is also the basis of the segment-tree version that supports updates (store prefix max, suffix max, total, best per node).

## Why it is correct

By induction: best[i − 1] is optimal among subarrays ending at i − 1. Any subarray ending at i is either [i] alone or (a subarray ending at i − 1) + a[i]; the best of the latter uses best[i − 1]. So best[i] is optimal, and every subarray ends somewhere.
`,
    doubts: [
      ["Why reset when the running sum becomes negative rather than when a[i] is negative?", "A negative element can still be worth including if the run before it is large (5, −1, 5 → 9). Only a negative running total is useless to carry forward, which is exactly what max(x, cur + x) decides."],
      ["Circular version: why total − min subarray?", "A wrapping subarray consists of a prefix and a suffix; what it excludes is a contiguous middle block. Maximising the kept part means minimising the excluded middle block, which is the minimum subarray."],
      ["Why does maximum product need the minimum too?", "Multiplying by a negative number turns the smallest (most negative) product into the largest. Without tracking the minimum you lose that candidate."],
      ["Is Kadane greedy or DP?", "DP: the state is the best sum ending at i and the transition looks one step back. It is often called greedy because the decision rule is so simple."],
    ],
    revise: md`
? Kadane recurrence? :: cur = max(x, cur + x); best = max(best, cur).
? All-negative array answer? :: The largest element (do not initialise best to 0).
? Circular max subarray? :: max(plain Kadane, total − min subarray), unless all negative.
? Max product subarray? :: Track max and min ending here; a negative swaps them; zeros reset.
? Max rectangle sum in a matrix? :: Fix row pairs, compress columns, Kadane: O(R²C).
? With updates? :: Segment tree storing total, best prefix, best suffix, best per node.
`,
    pitfalls: ["Initialising best to 0 with all-negative input", "Circular case with all negatives (returns 0)", "Product: forgetting the min track", "Using int when sums can exceed 2³¹"],
    quiz: [
      Q("Kadane on [−3, −1, −2] (non-empty subarray) returns…", ["0", "*−1", "−6", "−3"], "The best single element."),
      Q("Max product subarray of [2, 3, −2, 4]?", ["48", "*6", "−48", "4"], "[2, 3]: the −2 breaks the run and no second negative fixes it."),
    ],
    sources: [
      S.article("Maximum subarray problem", "Wikipedia", "https://en.wikipedia.org/wiki/Maximum_subarray_problem"),
      S.paper("Programming Pearls: Algorithm Design Techniques (Bentley, 1984), the origin of the Kadane story", "Communications of the ACM", "https://doi.org/10.1145/358234.381162"),
      S.article("Maximum subarray sum (with the segment-tree version)", "cp-algorithms", "https://cp-algorithms.com/others/maximum_average_segment.html"),
    ],
    problems: [53, 918, 152, 121, 1186, 363],
  },
};
