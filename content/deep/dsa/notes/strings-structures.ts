/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */
export const notes: Record<string, string> = {
  "string-basics": `
## Immutability and building
Python, Java, JS and Go strings are immutable: s += c in a loop is O(n²) in the worst case. Collect pieces in a list and join, or use StringBuilder.
Slicing copies (O(k)); compare indices instead of building substrings when you can.
C++ std::string is mutable; += is amortised O(1).
## Character tables
Lowercase letters → int[26] indexed by c − 'a'; ASCII → int[128]; larger alphabets → a hash map.
ord/chr in Python; char arithmetic in Java and C++.
## Classic tasks
Valid anagram (counts), valid palindrome (two pointers, skip non-alphanumerics), reverse words (split, reverse, join; or reverse all, then each word).
Longest common prefix: vertical scan, or sort and compare the first and last strings.
String to integer (LC 8): whitespace, sign, digits, clamp on overflow before it happens.
Compress (LC 443): read/write pointers in place. Encode and decode strings (LC 271): length-prefix each string ("5#hello").
Zigzag conversion, count and say, roman ↔ integer (subtract when a smaller value precedes a larger one).
## Unicode
A "character" may be several code points (emoji, accents); Java char is UTF-16 (surrogate pairs); Python str indexes code points.
Interviews usually assume ASCII: say so.
## Comparing strings
Lexicographic comparison costs O(min length). Equality is O(n) (hash once to compare many times).
Isomorphism and pattern matching need maps in both directions.
`,
  "rolling-hash": `
## Polynomial hash
H(s) = Σ s[i]·B^(n−1−i) mod M. Prefix hashes: H[i+1] = H[i]·B + s[i].
Substring hash: H(l..r) = H[r+1] − H[l]·B^(r−l+1) (mod M), with powers precomputed. O(1) per substring after O(n).
Pick B > alphabet size (e.g. 131 or random) and a large prime M (10⁹ + 7, 2⁶¹ − 1), or use two moduli.
## Rabin–Karp
Slide a window of length m, updating the hash in O(1); verify on a hash match. Expected O(n + m).
Multi-pattern of equal length: a set of pattern hashes.
## Collisions
The probability of a false match is about 1/M per comparison; with many comparisons (birthday bound), use double hashing or a 64-bit modulus.
Anti-hash tests exist for fixed bases and moduli (especially 2⁶⁴ overflow hashing): randomise the base.
## Problems
Longest duplicate substring (LC 1044): binary search the length plus hashing. O(n log n).
Repeated DNA sequences (LC 187): 10-letter windows, 2-bit encoding.
Longest happy prefix, distinct echo substrings (LC 1316), shortest palindrome (forward and reverse hashes).
Comparing substrings lexicographically: binary search the LCP with hashes.
## When to prefer exact algorithms
KMP or Z for single-pattern matching with worst-case guarantees; suffix arrays for many substring queries; hashing when it makes the code short.
`,
  kmp: `
## Prefix function
π[i] = the length of the longest proper prefix of s[0..i] that is also a suffix of it.
Build: k = π[i−1]; while k > 0 and s[i] ≠ s[k]: k = π[k−1]; if equal, k++; π[i] = k. O(n) amortised (k rises at most n in total).
## Matching
Run the prefix function on pattern + '#' + text; positions where π = m are matches.
Or match directly: on a mismatch, fall back through π instead of restarting. O(n + m).
## Periods and repetitions
The smallest period p = n − π[n−1]; the string is a repetition iff p divides n (repeated substring pattern, LC 459).
Every border length is reachable by following π from the end.
## Shortest palindrome (LC 214)
π of s + '#' + reverse(s): the last value is the longest palindromic prefix; prepend the reverse of the rest.
## Other uses
Longest happy prefix (LC 1392) = π[n−1]. Count occurrences of each prefix. Building a KMP automaton for DP over strings that must avoid a pattern (find all good strings, LC 1397).
## KMP vs Z vs hashing
All O(n + m) for one pattern; KMP and Z are exact and deterministic; hashing is simpler for substring comparisons; Aho–Corasick for many patterns.
`,
  "z-algorithm": `
## Definition
Z[i] = the length of the longest substring starting at i that matches a prefix of s. Z[0] is undefined (or n).
## Linear algorithm
Maintain the rightmost match window [l, r).
For i < r: start from min(r − i, Z[i − l]); then extend by comparing characters; if i + Z[i] > r, move the window.
Each comparison that succeeds moves r forward → O(n).
## Uses
Pattern matching: Z of pattern + '$' + text; Z[i] == m marks a match.
Periods: the smallest p with p + Z[p] == n.
Count distinct substrings incrementally, string compression checks.
Sum of scores of built strings (LC 2223) = Σ Z[i] + n.
Minimum time to revert a word to its initial state (LC 3031): the first k-multiple i with Z[i] ≥ n − i.
## Z vs prefix function
They hold the same information and each converts to the other in O(n); Z is often easier to reason about for "prefix matches at position i".
`,
  manacher: `
## Idea
Transform s into "#a#b#a#" so every palindrome has odd length with one centre.
P[i] = the palindrome radius at centre i. Maintain the rightmost palindrome (centre c, right edge r).
For i < r: start P[i] at min(r − i, P[mirror]) where mirror = 2c − i; then expand; update c and r. O(n).
## Reading results
The longest palindrome length in the original string = max P[i] (with the "#" transform).
Start index = (i − P[i]) / 2.
Count palindromic substrings = Σ (P[i] + 1) / 2.
## When to use it
Longest palindromic substring in O(n) (LC 5) when n is large; expand-around-centre (O(n²)) is fine up to a few thousand.
Maximum product of the lengths of two non-overlapping palindromic substrings (LC 1960).
## Related structures
Palindromic tree (eertree): every distinct palindrome as a node, built in O(n).
Hashing forward and reverse also tests palindromic substrings in O(1) each.
`,
  "suffix-structures": `
## Suffix array + LCP
SA = the starting indices of all suffixes in sorted order. Build O(n log n) by prefix doubling (O(n log² n) with comparison sort), O(n) with SA-IS.
LCP[i] = the longest common prefix of suffixes SA[i] and SA[i−1]; Kasai's algorithm builds it in O(n).
Distinct substrings = n(n+1)/2 − Σ LCP. Longest repeated substring = max LCP.
Longest common substring of two strings: concatenate with a separator; the max LCP between suffixes from different strings.
Pattern search: binary search on SA, O(m log n).
## Suffix automaton
The minimal DFA of all substrings: at most 2n − 1 states and 3n − 4 transitions; built online in O(n).
Counts distinct substrings, occurrences, the longest common substring of many strings.
## Suffix trees
A compressed trie of all suffixes (Ukkonen's O(n) algorithm); powerful but heavy to implement.
## Aho–Corasick
A trie of many patterns plus failure links (KMP generalised); scans a text in O(n + total pattern length + matches).
Stream of characters, word filters, banned-word detection.
## Burrows–Wheeler and FM-index
The BWT (from the suffix array) compresses well (bzip2) and supports substring counting in O(m) — DNA read aligners.
## Interview stance
Know what each structure answers and its complexity; implement hashing or KMP in the interview, and mention the suffix structures as the scalable option.
`,
  "sparse-table": `
## Construction
st[k][i] = the answer for the range [i, i + 2^k); st[k][i] = op(st[k−1][i], st[k−1][i + 2^(k−1)]). O(n log n) time and space.
## O(1) query for idempotent operations
For min, max, gcd, AND, OR (op(x, x) = x): k = floor(log₂(r − l + 1)); answer = op(st[k][l], st[k][r − 2^k + 1]) — the two ranges overlap, which is fine.
Non-idempotent operations (sum): combine O(log n) disjoint blocks instead.
## When to use it
Static arrays (no updates) with many range-min or range-max queries.
Updates → segment tree or Fenwick. Few queries → just scan.
Precompute log₂ for all lengths in a table.
## LCA via RMQ
Euler tour of the tree plus depths; LCA(u, v) = the minimum-depth node between their first occurrences: O(1) per query.
## Disjoint sparse table
Answers non-idempotent associative queries (sum, product mod m) in O(1) after O(n log n) preprocessing.
`,
  fenwick: `
## Structure
Array bit[1..n]; bit[i] covers the range (i − lowbit(i), i] where lowbit(i) = i & −i.
update(i, Δ): while i ≤ n: bit[i] += Δ; i += i & −i.
prefix(i): while i > 0: s += bit[i]; i −= i & −i. Range sum = prefix(r) − prefix(l − 1).
O(log n) each; build in O(n) by pushing each value to its parent once.
1-indexed: convert 0-indexed positions with +1.
## Counting over values
Count inversions / smaller numbers after self (LC 315): scan from the right; query the prefix of smaller values, then add the value.
Coordinate-compress values first.
Count of range sum (LC 327), reverse pairs (LC 493), create sorted array through instructions (LC 1649).
## Variants
Range update + point query: a Fenwick over the difference array.
Range update + range query: two Fenwicks (B1 and B2 with the i·Δ correction).
2D Fenwick: O(log n · log m) for matrix prefix sums with updates (LC 308).
Order statistics: binary-lift over the tree to find the k-th one in O(log n).
## Fenwick vs segment tree
Fenwick: tiny code, small constant, needs an invertible operation for range queries (sum, XOR).
Segment tree: any associative operation (min, max, gcd), lazy range updates, custom nodes.
`,
  "segment-tree": `
## Structure
A binary tree over the array: node covers [l, r]; children cover the halves; leaves are elements.
Array storage of size 4n (recursive) or 2n (iterative); the root is node 1.
## Operations
Build O(n). Point update: change a leaf, recompute ancestors: O(log n).
Range query: if the node is fully inside, return it; if disjoint, return the identity; otherwise combine the children. Visits O(log n) nodes.
## Designing the node
Store what can be merged from two children: sum, min, max, gcd, count, (max subarray: best, prefix, suffix, total).
The identity element for out-of-range: 0 for sum, +∞ for min, −∞ for max.
## Iterative (bottom-up) tree
Leaves at n…2n−1; a query walks l and r upward, combining when l is a right child or r is a left child. Short and fast; harder to add lazy tags.
## Problems
Range sum query mutable (LC 307), count of smaller numbers after self, my calendar (LC 729/731/732), falling squares, longest increasing subsequence II (LC 2407: max over a value range).
Segment tree "descend" queries: the first index with a value ≥ x in O(log n).
## Variants to name
Lazy propagation (range updates), dynamic / implicit segment trees (huge coordinates), persistent segment trees (versions), merge-sort trees (sorted lists per node), segment tree beats.
`,
  "lazy-propagation": `
## Idea
A range update tags the O(log n) covering nodes instead of touching every leaf; the tag is pushed to the children only when a later operation goes deeper.
Each node holds its aggregate already including its own tag.
## Range add + range sum
On a covered node: sum += Δ × length; lazy += Δ.
Push: give both children Δ (their sums += Δ × their length), then clear the parent's tag.
## Range assign + range min
Tag = the assigned value (or "none"); assignment overrides older tags; min = the value.
## Composing tags
Several kinds of update at once (assign and add): define the order, e.g. assign clears pending adds; apply the composition as a function f(g(x)).
Affine tags (x → a·x + b) cover add, multiply and assign together.
## Problems
Range module (LC 715), rectangle area II (coverage counts), falling squares (range assign max), the number of flowers / booking counts with range increments, handling sum queries after updates (LC 2569: flip ranges).
## Dynamic (implicit) segment trees
Create children on demand for coordinates up to 10⁹: O(q log C) nodes. Alternative: coordinate-compress offline.
`,
  "sqrt-mo": `
## Square-root decomposition
Split the array into blocks of size about √n; keep an aggregate per block.
A query touches at most two partial blocks plus O(√n) whole blocks; a point update changes one block. O(√n) per operation.
Range updates: a lazy value per block. Simple and flexible when a segment tree's merge is awkward.
## Mo's algorithm
Answer offline range queries by reordering them: sort by (block of l, then r — alternating direction by block for speed).
Move the window [l, r] by adding and removing one element at a time; total moves O((n + q)·√n).
Needs O(1) add and remove (distinct counts, frequency of frequencies, pairs with equal values).
Mo with updates adds a time dimension (block size ~ n^(2/3)).
## When to use
Offline queries with an add/remove-friendly statistic that has no nice merge (number of distinct values in a range).
Online or mergeable statistics → segment tree, Fenwick or a persistent structure.
`,
  "lru-lfu": `
## LRU cache (LC 146)
Hash map key → node; doubly linked list ordered by recency with head and tail sentinels.
get: if present, move the node to the front, return the value. put: update and move, or insert at the front; over capacity, evict the node before the tail.
Every operation O(1). Python: OrderedDict with move_to_end and popitem(last=False). Java: LinkedHashMap with accessOrder = true and removeEldestEntry.
## LFU cache (LC 460)
key → (value, freq); freq → an ordered set (a linked list or OrderedDict) of keys; minFreq.
get: bump the key from freq f to f + 1; if the list for minFreq empties, minFreq++.
put a new key: if full, evict the least recently used key in minFreq's list; insert with freq 1 and set minFreq = 1.
Every operation O(1).
## Concurrency and production notes
A global lock serialises everything: shard the cache by key hash, or use striped locks.
Approximate LRU (sampling, CLOCK) avoids list updates on every read; Redis samples keys.
TTLs, size-aware eviction (bytes, not entries), and admission policies (TinyLFU in Caffeine) matter in real systems.
`,
  iterators: `
## Principles
hasNext() must be idempotent (calling it twice does not skip anything); next() returns the element and advances.
Do the work lazily and buffer at most one lookahead element.
## Patterns
Peeking iterator (LC 284): cache the next element; peek returns it without advancing.
Flatten nested list iterator (LC 341): a stack of iterators (or reversed lists); hasNext unrolls lists until an integer is on top.
Flatten 2D vector (LC 251): row and column indices; skip empty rows in hasNext.
Zigzag iterator (LC 281): a queue of active iterators, round robin.
BST iterator (LC 173): a stack of the left spine; amortised O(1) and O(h) memory.
RLE iterator (LC 900): consume counts without expanding them.
## Generators
Python yield (and yield from) gives lazy iterators with tiny code; mention that the interviewer may want the explicit class.
## Talking points
Memory: O(depth) rather than O(total). Invalidation when the underlying collection changes (fail-fast iterators in Java throw ConcurrentModificationException).
Thread safety: iterators are usually single-consumer.
`,
  "time-versioned": `
## Time-based key-value store (LC 981)
key → a list of (timestamp, value) appended in increasing time; get(key, t) binary searches the last timestamp ≤ t. set O(1), get O(log n).
If timestamps are not monotonic, use an ordered map per key.
## Snapshot array (LC 1146)
Per index, a list of (snap_id, value) recorded only on change; snap() just increments the id; get binary searches.
Memory is proportional to the number of changes, not snapshots × length.
## Stock price fluctuation (LC 2034)
timestamp → price map; max and min via heaps with lazy deletion (check that the price still matches the timestamp) or a sorted multiset of prices.
## Versioned and persistent structures
Path copying: an update copies only the nodes on the path, so old versions stay readable (persistent segment trees, immutable maps).
Copy-on-write and multi-version concurrency control (MVCC in databases) use the same idea.
## Design points
State the read/write ratio, whether time is monotonic, how to garbage-collect old versions, and the per-key memory.
`,
  "randomized-set": `
## RandomizedSet (LC 380)
Array of values + map value → index.
insert: append and record the index. remove: move the last element into the removed slot, update its index, pop.
getRandom: a uniform random index. All O(1) on average.
## With duplicates (LC 381)
Map value → set of indices. Remove: take any index of the value, move the last element there, fix the last element's index set (careful when it is the same value).
## Why not a hash set
A hash set cannot pick a uniform random element in O(1): its buckets are uneven and partly empty.
## Related designs
Random pick with blacklist (LC 710): remap blacklisted values below the cut to whitelisted values above it.
Random pick index (reservoir sampling), weighted random (prefix sums).
Shuffle (Fisher–Yates).
`,
  "stream-counters": `
## Hit counter (LC 362)
Queue of timestamps; pop those older than t − 300. Or 300 circular buckets of (timestamp, count): O(1) memory regardless of the hit rate.
Out-of-order or concurrent hits: buckets plus locks or atomics.
## Logger rate limiter (LC 359)
Map message → the next allowed time. Memory grows: clean old entries periodically, or keep a queue of recent messages.
## Moving average (LC 346)
A queue of size k plus a running sum. Exponential moving average needs only one value.
## Rate limiting algorithms
Fixed window counter: simple; allows bursts of 2× at window edges.
Sliding window log: exact; stores every timestamp.
Sliding window counter: weighted average of the current and previous windows — a good approximation.
Token bucket: tokens refill at rate r up to capacity b; each request takes one; allows bursts up to b.
Leaky bucket: a queue drained at a constant rate; smooths the output.
Distributed limits: a shared counter (Redis INCR + EXPIRE, Lua scripts for atomicity) or local limits with periodic sync.
## Data stream statistics
Running median (two heaps), top-k frequent (count map + heap, or count-min sketch + heap for huge streams), distinct counts (HyperLogLog), reservoir samples.
`,
  skiplist: `
## Structure
Layered sorted linked lists: level 0 holds every element; each element is promoted to the next level with probability 1/2 (or 1/4).
Expected height O(log n); expected space O(n).
## Operations
Search: start at the top-left; move right while the next key < target; otherwise drop down. Expected O(log n).
Insert: record the predecessor at each level (an "update" array), draw a random height, splice in at each level.
Delete: splice out at every level it appears in.
Design skiplist (LC 1206).
## Why use it instead of a balanced tree
Simpler code (no rotations), easy range scans along level 0, and lock-free concurrent versions exist (Java ConcurrentSkipListMap).
Redis sorted sets use a skip list plus a hash map; LevelDB and RocksDB memtables use skip lists.
Worst case is O(n) with tiny probability; guarantees are expected, not worst-case.
## Interview usage
Explain the levels, the coin flips and the expected O(log n); implement with a max level of about 16–32 and sentinel heads.
`,
  "matrix-traversal": `
## Spiral order (LC 54, 59)
Four bounds: top, bottom, left, right. Walk right along top (top++), down along right (right−−), left along bottom if top ≤ bottom (bottom−−), up along left if left ≤ right (left++).
The checks before the third and fourth legs prevent double-counting a single row or column.
Alternative: direction vectors with a visited matrix, turning when blocked.
Spiral matrix II: fill 1..n² the same way. Spiral III (LC 885): step lengths 1, 1, 2, 2, 3, 3, ….
## Rotate image (LC 48)
90° clockwise in place: transpose (swap a[i][j] with a[j][i] for j > i), then reverse each row.
Counter-clockwise: transpose, then reverse each column (or reverse the rows first).
Or rotate four cells at a time layer by layer.
## Diagonals
Cells on the same diagonal share r − c; on the same anti-diagonal share r + c.
Diagonal traverse (LC 498): iterate s = r + c, alternating direction. Sort the diagonals (LC 1329): group by r − c.
## Other traversals
Snake (boustrophedon) order, layer-by-layer shifting (LC 1914, cyclically rotating a grid), transpose of a non-square matrix (a new array).
`,
  "matrix-in-place": `
## Set matrix zeroes (LC 73)
O(1) space: use the first row and the first column as markers; remember separately whether the first row and column themselves contain a zero.
Pass 1: mark. Pass 2: zero inner cells from the markers. Pass 3: handle the first row and column last.
## Game of life (LC 289)
Encode both states in each cell: bit 0 = current, bit 1 = next. Compute next from neighbours' bit 0, then shift every cell right by 1.
Or use states 2 (alive → dead) and 3 (dead → alive).
Infinite board: store only the live cells in a set and count neighbours with a map.
## Simulation patterns
Candy crush (LC 723): mark crushable cells (negate), then gravity per column with a write pointer.
Rotating the box (LC 1861): gravity per row, then rotate.
Flood fill, the image smoother: separate the read and write states, or encode them in spare bits.
## Principle
When an update must not see the cells already updated in this pass, either copy, or encode old and new in the same cell, or order the updates so dependencies are read first.
`,
  "matrix-search": `
## Fully sorted (LC 74)
One binary search over r·c virtual indices: (mid / c, mid % c). O(log rc).
## Rows and columns sorted (LC 240)
Staircase from the top-right (or bottom-left): greater than the target → move left; smaller → move down. O(r + c).
Binary search in each row: O(r log c), better when r ≪ c.
## Count ≤ x in O(R + C)
Staircase from the bottom-left: if a[r][c] ≤ x, add r + 1 and move right; else move up.
Drives "k-th smallest in a sorted matrix" by binary search on the value (LC 378).
## Leftmost column with a one (LC 1428)
Rows are sorted 0…1: start at the top-right; on a 1 move left, on a 0 move down. O(r + c) API calls.
## When to binary search each row
Rows are sorted but the columns are not; or one dimension is tiny.
Count negatives in a sorted matrix (LC 1351): the staircase is O(r + c).
`,
  "comparison-sorts": `
## Merge sort
Split in halves, sort each, merge: O(n log n) always, stable, O(n) extra memory.
Best for linked lists and external sorting; counts inversions while merging.
## Quicksort
Partition around a pivot, recurse: O(n log n) average, O(n²) worst (sorted input with a naive pivot).
Random pivot or median-of-three; three-way partition for many duplicates.
In place, not stable, cache-friendly: usually the fastest in practice. Recurse on the smaller side for O(log n) stack.
## Heapsort
Heapify, then extract the max repeatedly: O(n log n) worst case, in place, not stable, poor locality.
## Simple sorts
Insertion sort: O(n²) but O(n + inversions), fastest for small or nearly sorted arrays (used inside hybrid sorts below ~16–32 elements).
Selection sort: minimum swaps (n − 1). Bubble sort: teaching only.
## Libraries
Python and Java (objects) use Timsort: merge sort over natural runs + insertion sort; stable; O(n) on sorted input.
Java primitives: dual-pivot quicksort (not stable, stability does not matter for primitives).
C++ std::sort: introsort (quicksort that switches to heapsort at depth 2 log n, plus insertion sort); std::stable_sort is a merge sort.
## Lower bound
Any comparison sort needs Ω(n log n) comparisons in the worst case: a decision tree with n! leaves has height log₂(n!) ≈ n log n.
## Interview usage
Know merge sort and quicksort cold; state stability; sort then scan is often the O(n log n) baseline.
`,
  "linear-sorts": `
## Counting sort
For keys in [0, k): count each key, prefix-sum the counts into positions, place elements (iterate backwards for stability). O(n + k).
## Radix sort
Sort by each digit from least significant to most, using a stable counting sort per digit: O(d·(n + b)).
32-bit ints with base 256: 4 passes. MSD radix sort suits strings.
## Bucket sort
Spread values into n buckets by range, sort each bucket, concatenate: O(n) expected for uniform data.
## Problems
Sort colours (counting with 3 values), top-k frequent elements (buckets indexed by frequency), maximum gap (LC 164: pigeonhole buckets of width (max − min)/(n − 1), the answer lies between buckets), H-index (LC 274: counts capped at n), sort an array of ages or grades.
Contains duplicate III with buckets of width t + 1.
## When not to use them
Large key ranges (k ≫ n) waste memory; floating-point or complex keys need mapping; comparison sorts are simpler and fast enough below about 10⁶ elements.
`,
  quickselect: `
## Algorithm
Partition around a random pivot; if the pivot lands at index k, done; otherwise recurse into the side that contains k only.
Expected O(n) (n + n/2 + n/4 + …); worst case O(n²).
k-th largest = index n − k in ascending order.
## Median of medians (BFPRT, 1973)
Groups of 5, take each group's median, recursively find the median of those as the pivot: guarantees a 30/70 split → worst-case O(n). Large constant; rarely used in practice.
Introselect switches to it when recursion goes badly.
## Uses
K-th largest element (LC 215), k closest points (LC 973), top-k frequent (select on frequencies), wiggle sort II (median), the median for minimising Σ|x − aᵢ| (minimum moves to equal array elements II, LC 462).
C++ std::nth_element; Python has no built-in (heapq.nlargest is O(n log k)).
## Duplicates
Use three-way partitioning, or many equal keys degrade to O(n²).
## Heap vs quickselect
Heap: O(n log k), streaming-friendly, stable worst case. Quickselect: O(n) expected, needs the whole array in memory and reorders it.
`,
  "custom-sort": `
## Comparators
Return negative, zero or positive; must be a strict weak ordering (consistent and transitive), or sorts can misbehave or throw (Java "Comparison method violates its general contract").
Python: key functions (preferred) or functools.cmp_to_key. Java: Comparator.comparing(...).thenComparing(...). C++: a lambda returning a < b.
Avoid subtraction comparators (a − b overflows); use Integer.compare.
## Multi-key sorting
Key tuples: (−count, word) sorts by count descending then word ascending.
Stable sorts allow sorting by the secondary key first and then the primary key.
## Counting inversions
Pairs i < j with a[i] > a[j]: merge sort counts them while merging (add the remaining left-half size when taking from the right). O(n log n). A Fenwick tree also works.
Count of smaller numbers after self, reverse pairs (LC 493: count before merging), global and local inversions.
## Derived orders
Largest number: a + b vs b + a. Reorder log files (LC 937): letter logs by (content, identifier), digit logs keep their order.
Custom sort string (LC 791): rank by the order string, or count and emit.
Sort by frequency, then by value; relative sort array (LC 1122).
Sorting by a key that is expensive to compute: decorate–sort–undecorate (compute each key once).
`,
  "meet-in-middle": `
## Idea
Split the input into two halves of n/2; enumerate all 2^(n/2) partial results of each half; combine them with sorting plus binary search, two pointers or hashing.
Turns O(2ⁿ) into O(2^(n/2) · n); n = 40 becomes about 10⁶ per half.
## Problems
Closest subsequence sum (LC 1755): sums of each half; sort one; for each sum in the other, binary search target − s.
Partition array into two arrays to minimise the sum difference (LC 2035): group half-sums by how many elements were taken.
Split array with the same average (LC 805): per count, sets of sums.
4Sum II (LC 454): pair sums of A + B in a map, look up −(C + D): O(n²).
Bidirectional BFS is meet in the middle on graphs.
## Memory
2^(n/2) values per half (about 10⁶ for n = 40); store compactly, and generate sorted sums by merging to avoid a sort.
`,
  "heavy-light": `
## Heavy-light decomposition
Each node's heavy child is the child with the largest subtree; heavy edges form chains.
Any root-to-node path crosses O(log n) light edges, so a path splits into O(log n) chain segments.
Lay the chains out contiguously (a DFS visiting the heavy child first) and put a segment tree on that order: path queries and updates in O(log² n).
Subtree queries use the same order (each subtree is a contiguous range).
## Centroid decomposition
A centroid's removal leaves components of size ≤ n/2; recursively decompose → depth O(log n).
Counts paths with a property (length k, distance ≤ d) in O(n log n) or O(n log² n); nearest marked node queries.
## Euler tour flattening
tin/tout from a DFS: the subtree of v is the range [tin[v], tout[v]] → subtree sums with a Fenwick tree.
Path-to-root queries: +x at tin and −x at tout.
## Interview stance
Rare in interviews; name them for "many path queries with updates on a tree" and fall back to LCA with prefix sums when there are no updates.
`,
  persistent: `
## Path copying
An update copies only the nodes along the root-to-leaf path (O(log n) new nodes); every old root still describes its old version.
Versions share all unchanged subtrees.
## Persistent segment tree
One version per prefix of the array (insert a[i] into version i − 1).
K-th smallest in a range [l, r]: walk versions r and l − 1 together, comparing counts in the left children. O(log n) per query.
Count of values ≤ x in a range, online.
## Simpler persistent structures
Persistent stack: a linked list with shared tails (push = a new head).
Immutable maps in functional languages (Clojure, Scala) use hash array mapped tries (HAMTs) with path copying.
Git commits and copy-on-write file systems (ZFS, Btrfs) are persistent trees.
## Where it appears
Version history and undo, time-travel queries, MVCC snapshots in databases, offline queries that would otherwise need sorting.
Memory O(n + q log n); fat nodes (store a version list per field) are the alternative.
`,
  "randomized-structures": `
## Treap
A BST by key and a heap by random priority: the expected height is O(log n).
Insert: as a BST leaf, then rotate up while the priority beats the parent's.
Split(t, k) and merge(a, b) give every operation in O(log n) expected; implicit treaps use subtree size as the key → a sequence with O(log n) insert, delete, reverse and concat at any position.
## Splay tree
After every access, splay the node to the root with zig, zig-zig and zig-zag rotations.
Amortised O(log n); recently used keys stay near the top (good for locality). No balance information stored.
Used in some allocators, caches and link-cut trees.
## Cartesian trees
Heap-ordered by value and in-order by index; built in O(n) with a stack. The LCA of i and j = the range minimum between them.
A treap is a Cartesian tree on (key, random priority).
## Interview stance
Mention treaps or skip lists when an ordered structure with split and merge is needed; use the language's ordered map in actual code.
`,
};
