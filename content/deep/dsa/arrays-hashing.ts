import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

export const arraysHashing: Record<string, Deep> = {
  "dynamic-arrays": {
    blurb: "Contiguous memory, O(1) indexing, amortised O(1) append and O(n) middle inserts. Why arrays win on real hardware, and the operations that quietly cost linear time.",
    signals: ["Index-based access, iteration, in-place rearrangement", "Choosing between an array, a linked list and a deque", "\"Do it in place\" or \"O(1) extra space\""],
    lesson: md`
## What an array is

An array stores elements of one size **contiguously** in memory. Element i lives at address base + i × size, so reading or writing any index is a single address computation: **O(1)**. A **static array** has a fixed length chosen at creation. A **dynamic array** (C++ vector, Java ArrayList, Python list, Go slices, Rust Vec) keeps a **capacity** larger than its length; appending writes into spare capacity, and when it runs out, the array allocates a bigger buffer (typically 1.5× or 2×) and copies everything over.

## Operation costs

| Operation | Cost | Why |
|---|---|---|
| read / write a[i] | O(1) | address arithmetic |
| append at end | amortised O(1) | occasional resize copies everything |
| pop from end | O(1) | |
| insert / delete at index i | O(n − i) | shift the tail by one |
| insert / delete at the front | O(n) | shift everything (use a deque) |
| search unsorted | O(n) | |
| search sorted | O(log n) | binary search |
| slice of length k | O(k) | copies in most languages |

**Why appends are amortised O(1)**: with doubling, the copies over n appends cost 1 + 2 + 4 + … + n < 2n element moves in total, so each append costs O(1) on average over any sequence. A single append that triggers a resize is O(n), which matters for latency-sensitive code (reserve capacity up front if you know the size). Growing by a constant amount instead (+10 each time) makes appends O(n) amortised.

## Why arrays are fast in practice

CPUs read memory in **cache lines** (typically 64 bytes) and prefetch sequential addresses. Scanning an array touches consecutive lines, so it runs near memory bandwidth, and the hardware prefetcher hides latency. A linked list's nodes are scattered; each hop may be a cache miss costing on the order of 100 cycles. Consequences:

- Linear search over a few hundred elements in an array often beats more "clever" pointer structures.
- An array (or a deque built from array blocks) beats a linked list even for middle inserts up to surprisingly large sizes, because memmove of contiguous data is extremely fast.
- Structure of arrays (separate arrays per field) beats array of structures when you scan one field.

## Language specifics worth knowing

- **Python list**: an array of pointers to objects (each int is a separate object). append is amortised O(1); insert(0, x) and pop(0) are O(n): use collections.deque. Slicing copies (O(k)); x in list is O(n); list * k repeats references (the [[0] * m] * n aliasing trap: all rows are the same list; use a comprehension). For dense numbers use array or NumPy.
- **Java**: int[] stores primitives contiguously; ArrayList&lt;Integer&gt; stores boxed Integer objects (extra indirection and ~4× memory). Arrays.asList returns a fixed-size view (add throws). List&lt;Integer&gt;.remove(int index) versus remove(Object o) is a classic overload bug: remove(1) removes index 1, remove(Integer.valueOf(1)) removes the value 1.
- **C++**: vector::push_back amortised O(1); reserve(n) avoids reallocations; **reallocation invalidates iterators, pointers and references** into the vector (holding &v[0] across a push_back is undefined behaviour). vector&lt;bool&gt; is a bit-packed special case whose elements are not real bools. emplace_back constructs in place.
- **Go**: append may or may not reallocate; two slices can share a backing array, so appending to one can overwrite the other's elements.

## 2D arrays

C, C++ and NumPy store 2D arrays **row-major**: a[r][c] at r × cols + c. Java and Python lists store an array of row arrays (each row separate). Iterate rows in the outer loop and columns inside for cache-friendly access; traversing a large matrix column-first can be several times slower. Flatten (r, c) → r × cols + c when you need one index (union-find over cells, visited arrays).

## In-place array techniques

- **Read/write pointers**: compact or filter in place (Remove Duplicates, Move Zeroes): O(n), O(1) extra, stable.
- **Reversal tricks**: rotate right by k = reverse all, reverse the first k, reverse the rest (k mod n first). **Rotate Array** (LC 189). Juggling (gcd cycles) also works.
- **Index as hash**: when values lie in [1, n], the array can mark presence: negate a[v − 1] (Find All Duplicates, LC 442; Find All Numbers Disappeared, LC 448), or **cyclic sort**: swap each value into slot v − 1 until every value sits in its home (First Missing Positive, LC 41: then the first i with a[i] ≠ i + 1 is the answer). O(n) time, O(1) extra space; each swap places one value permanently, so there are at most n swaps.
- **Swap-to-end deletion**: if order does not matter, delete index i by swapping it with the last element and popping: O(1).
- **Fill from the back**: merge sorted arrays in place (LC 88), Duplicate Zeros (LC 1089).
- **Prefix and suffix passes**: Product of Array Except Self (LC 238): output[i] = product of everything left of i times everything right of i, computed with one forward pass into the output and one backward pass with a running product: O(n), O(1) extra besides the output, no division (which would fail with zeros).

## Common interview shapes

- Product of Array Except Self (prefix and suffix products).
- Rotate Array (three reversals).
- First Missing Positive (cyclic placement).
- Merge Sorted Array from the back.
- Game of Life and Set Matrix Zeroes (in-place encodings).
- Next Permutation (scan from the right, swap, reverse the suffix).
- Majority Element (Boyer–Moore voting).
- Pascal's Triangle, Spiral Matrix (index bookkeeping).

## Interview angles

- State costs precisely: amortised O(1) append, O(n) front insert.
- Mention cache locality when comparing arrays with linked lists.
- Know your language's traps (aliasing rows in Python, remove overloads in Java, iterator invalidation in C++).

## Connections

Amortised analysis (doubling), hashing (arrays of buckets), two pointers and windows (in-place scans), and deques (O(1) at both ends).
`,
    doubts: [
      ["If insertion in the middle is O(n), why not always use a linked list?", "Because the linked list must first find the position (O(n) pointer chasing) and every hop risks a cache miss, while an array shift is one fast memmove. Linked lists only win when you already hold a pointer to the insertion point and do many such edits (LRU cache), or when you must never move elements."],
      ["What does 'iterator invalidation' mean?", "In C++, push_back may reallocate the buffer; pointers, references and iterators into the old buffer then dangle. Classic bug: holding a reference to v[0], pushing back, then using the reference."],
      ["How does rotate-by-three-reversals work?", "Rotating right by k moves the last k elements to the front. Reversing the whole array puts them at the front but backwards; reversing the first k and then the remaining n − k restores both blocks' internal order. Three linear passes, O(1) space."],
      ["Is Python's list really an array?", "Yes: a contiguous array of object pointers with over-allocation (growth factor about 1.125 plus a constant). The objects themselves live elsewhere, so a list of ints is far larger than an int array; use the array module or NumPy for dense numeric data."],
      ["Why do 1.5× growth factors exist when 2× copies less often?", "With factor 2, the sum of all previous buffers is always smaller than the next request, so freed memory can never be reused for the new buffer. With a factor below the golden ratio (about 1.618), old blocks can eventually be combined and reused, which reduces fragmentation. It trades a few more copies for better memory reuse."],
      ["How should I shrink a dynamic array?", "Halve the capacity when the size drops to a quarter, not a half. Shrinking at half would make an alternating push/pop at the boundary resize every time (O(n) each); the gap between 1/4 and 1/2 guarantees amortised O(1)."],
      ["Is the three-reversal rotation better than using an extra array?", "Both are O(n). The extra array is simpler and equally fast; three reversals use O(1) extra space, which is the usual follow-up."],
    ],
    revise: md`
? Array index access cost and why? :: O(1): address = base + i × element size.
? Insert at the front of a dynamic array? :: O(n): every element shifts. Use a deque.
? Why do arrays beat linked lists in practice? :: Contiguity: cache lines and prefetching.
? Rotate right by k in O(1) space? :: Reverse all, then reverse the first k, then reverse the rest.
? Values in [1, n], O(1) extra space marking? :: Use the array as a hash: negate a[v−1] or cyclic-sort values into place.
? C++ reallocation hazard? :: Iterators, pointers and references into the vector are invalidated.
? Merge two sorted arrays in place into the first? :: Fill from the back to avoid overwriting.
? Python [[0]*m]*n trap? :: All n rows alias one list; use a comprehension.
? Product except self without division? :: Prefix products forward into output, suffix running product backward.
? Cyclic sort swap bound? :: At most n swaps: each places one value home.
? Go slices sharing? :: Two slices may share a backing array; append can overwrite.
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

A **hash table** maps keys to values with expected O(1) insert, lookup and delete. A **hash function** h turns a key into an integer; the table stores the entry in bucket h(key) mod m, where m is the number of buckets. Lookup recomputes the bucket and checks only the entries there.

Two different keys can land in the same bucket: a **collision**. Collisions are unavoidable (pigeonhole: far more possible keys than buckets), so a hash table's design is mostly the design of how it handles collisions and when it grows.

[[widget:hash-table]]

## Collision resolution

**Separate chaining.** Each bucket holds a list (or small tree) of entries. Lookup hashes to a bucket and scans its chain. The expected chain length is the **load factor α = n / m**, so operations cost O(1 + α). Java's HashMap chains, and converts a bucket into a red-black tree once it holds 8 entries (if the table has at least 64 buckets), so even a flood of collisions costs O(log n) per lookup instead of O(n).

**Open addressing.** All entries live in the array itself. On a collision, **probe** other slots in a fixed sequence:

- **linear probing**: h, h + 1, h + 2, …: excellent cache behaviour, but runs of occupied slots ("primary clustering") grow, so keep α below about 0.7;
- **quadratic probing**: h + 1², h + 2², …: less clustering;
- **double hashing**: step size from a second hash function;
- **Robin Hood hashing**: on insertion, an entry that has travelled farther from its home slot takes the slot from one that travelled less, equalising probe lengths;
- **SwissTable** (Abseil flat_hash_map, Rust's HashMap via hashbrown): groups of 16 slots with a metadata byte each, probed with SIMD instructions.

**Deletion** with open addressing is subtle: emptying a slot would stop later probe sequences early and lose entries that were placed past it. Use **tombstones** (a "deleted" marker that probes skip but insertions may reuse), or **backward-shift deletion** for linear probing (move later entries of the run back). Python's dict uses open addressing with a perturbed probe sequence.

## Load factor and resizing

As α grows, chains or probe sequences lengthen. Tables **resize** (usually double) when α crosses a threshold (Java HashMap 0.75; Python dict about 2/3) and **rehash** every entry into the new array, because each key's bucket depends on m. Like dynamic arrays, doubling makes insertion amortised O(1), but an individual insert can take O(n). Systems that cannot tolerate that pause (Redis) rehash **incrementally**, moving a few buckets on each operation while both tables are live.

Table sizes are often **powers of two** (so mod m becomes a cheap bit mask), which requires the hash's low bits to be well mixed (Java's HashMap XORs the high bits into the low bits); others use **prime** sizes, which tolerate weaker hash functions.

## What makes a good hash function

- **Deterministic**: equal keys always hash equally (so it must use only the fields that equality uses: in Java, override hashCode whenever you override equals).
- **Uniform**: spreads typical keys evenly across buckets.
- **Fast**: hashing is on every operation; for strings it is O(length).
- **Resistant to adversaries** when keys come from untrusted input: with a fixed, known hash function, an attacker can send many keys that collide, degrading the table to O(n) per operation (**hash flooding**, a real denial-of-service attack in 2011 against many web frameworks). Languages now use **randomised seeds** (SipHash in Python, Rust and Ruby) so collisions cannot be predicted.

**Mutable keys break hash tables**: if a key's contents change after insertion, its hash changes and the entry becomes unreachable. That is why Python forbids lists as dict keys (use tuples) and why Java keys should be immutable.

## Costs, honestly stated

- Expected O(1) per operation, assuming a good hash function and bounded load factor.
- Hashing a key of length L costs O(L), so "O(1)" for string keys really means O(L).
- Worst case O(n) per operation (all keys collide) for chaining or probing; O(log n) for Java's treeified buckets.
- Iteration order: Python dicts preserve insertion order (since 3.7); Java's HashMap has no defined order; LinkedHashMap keeps insertion (or access) order; C++ unordered_map has no order.
- Memory: several times the raw data (buckets, pointers, empty slots for a low load factor).

## Hash set vs hash map vs ordered map

- **Set**: membership only (seen-before, deduplication).
- **Map**: key → value (counts, indices, memoisation, grouping).
- **Ordered map** (TreeMap, std::map, SortedDict): O(log n) per operation, but keeps keys sorted, so it answers floor/ceiling, range queries and min/max, which a hash map cannot.

Choose a hash map unless you need ordering.

## Keys for compound state

- Tuples in Python ((r, c), (i, j, mask)); records or Long-encoded pairs in Java (r × cols + c, or (long) a << 32 | b).
- String joins with a separator ("1#2#3"): without a separator, "1,23" and "12,3" collide.
- Canonical forms: sorted letters or a 26-count tuple for anagram groups (LC 49); a normalised shape for islands; sorted tuples for unordered pairs.
- Frozen sets for sets as keys.

## Bloom filters and friends

When you only need "is it **possibly** in the set?" with tiny memory: a **Bloom filter** sets k hash positions in a bit array per inserted key; a query checks those k bits. False positives are possible (all k bits set by other keys), false negatives are not. About 10 bits per element give about a 1% false-positive rate. Used in databases (LSM-tree SSTables skip disk reads), web caches and blockchains. Deletion needs a **counting Bloom filter** (counters instead of bits) or a **cuckoo filter**.

Related probabilistic structures: **count-min sketch** (approximate frequencies), **HyperLogLog** (approximate distinct counts in about 1.5 KB), **consistent hashing** (distributing keys across servers so that adding a server moves only about 1/n of the keys).

## Interview angles

- Say "expected O(1), O(L) for string keys, worst case O(n)".
- Explain one collision strategy and resizing; mention tombstones for open addressing.
- Use immutable, canonical keys for compound state.

## Connections

Counting patterns, prefix sums with hash maps, memoised DP, LRU caches, and system-design topics (sharding with consistent hashing, Bloom filters in storage engines).
`,
    doubts: [
      ["Why does the table size often have to be a power of two or a prime?", "Powers of two make 'mod m' a fast bit-mask, but then a weak hash with poor low bits collides badly, so implementations mix the hash (Java's HashMap XORs the high bits into the low bits). Primes make the modulo spread weak hashes better. Both are design choices; good hash mixing matters more."],
      ["Is a C++ unordered_map slow?", "Its standard-mandated design (node-based chaining, stable references) causes many allocations and cache misses. Open-addressing tables like Abseil's flat_hash_map are often 2–5× faster. In competitive programming it can also be attacked with crafted keys; a custom randomised hash fixes that."],
      ["Why can't I use a list as a dict key in Python?", "Lists are mutable, so their hash could change after insertion and the entry would be lost. Use a tuple (immutable) or a frozenset."],
      ["How does deletion work with linear probing?", "Emptying the slot would break the probe chain for keys inserted after it. Mark it as a tombstone (treated as occupied during lookup, free during insertion), or shift later entries of the cluster back. Too many tombstones trigger a rebuild."],
      ["When is a sorted array or BST better than a hash map?", "When you need order (min, max, floor, ceiling, range iteration, k-th element), worst-case guarantees, or a small memory footprint for static data (binary search on a sorted array is cache-friendly and has no overhead)."],
      ["Is hashing a string O(1)?", "No, O(length). A map keyed by strings of length k costs O(k) per operation. Languages often cache a string's hash after the first computation (Java does)."],
      ["What is consistent hashing and why not just hash mod n servers?", "With key mod n, adding or removing a server changes n and remaps almost every key. Consistent hashing places servers and keys on a ring and assigns each key to the next server clockwise; adding a server moves only the keys between it and its predecessor (about 1/n of them). Virtual nodes smooth out the load."],
      ["Why does Java treeify buckets only at 8 entries?", "With a decent hash function, chains longer than 8 are astronomically rare (Poisson-distributed lengths at load factor 0.75), so tree overhead is only paid in pathological or adversarial cases, where it caps lookups at O(log n)."],
      ["Should I use a hash map or an array for counting small integers?", "An array whenever the key range is small and dense (letters, digits, values up to about 10⁶): faster, less memory, no hashing. A hash map for sparse or unbounded keys."],
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
? Robin Hood hashing? :: Entries far from home steal slots from those closer to home, equalising probes.
? Incremental rehashing? :: Keep both tables and move a few buckets per operation (Redis).
? Separator in string keys? :: Without one, "1,23" and "12,3" collide.
? Bloom filter bits per element for ~1%? :: About 10 bits, with ~7 hash functions.
`,
    pitfalls: ["Calling hash lookups O(1) worst case", "Mutable objects as keys", "Overriding equals without hashCode in Java", "unordered_map<pair<int,int>,…> without a hash function in C++", "Forgetting that hashing a string costs O(length)"],
    quiz: [
      Q("Linear probing at a high load factor mainly suffers from…", ["False positives", "*Primary clustering", "Tombstone overflow", "Hash randomisation"], "Runs of occupied slots grow and merge."),
      Q("In Java, two keys are equal but have different hashCodes. Lookup…", ["works", "*can fail", "throws", "is slower but correct"], "They map to different buckets."),
      Q("Which structure supports 'smallest key ≥ x' in O(log n)?", ["HashMap", "*TreeMap / balanced BST", "Bloom filter", "Array list"], "Hash maps have no order."),
    ],
    sources: [
      S.book("Algorithms, 4th ed. §3.4 Hash Tables", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/34hash/"),
      S.book("Introduction to Algorithms (CLRS), ch. 11: Hash Tables", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305"),
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
## Count instead of compare

A large share of easy and medium problems become linear once you stop comparing elements pairwise and start **counting**: remember what you have seen (a set), how often (a count map), or where (an index map). The hash map turns an O(n²) "for each element, look at all others" into O(n) "for each element, ask the map one question".

## Complement lookup

**Two Sum** (LC 1): for each x at index i, the partner needed is target − x. Keep a map value → index of elements seen so far; if the complement is in the map, return both indices; otherwise insert x.

\`\`\`python
def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen: return [seen[target - x], i]
        seen[x] = i                    # insert after checking
\`\`\`

Checking **before** inserting prevents pairing an element with itself (target = 2x with a single x) while still finding pairs of equal values (the first copy is in the map when the second arrives). O(n) time and space.

Variants:

- **Count pairs with sum k** (Max Number of K-Sum Pairs, LC 1679): count map; pair x with k − x and decrement both counts.
- **Pairs with difference k** (LC 532): set of values; for k = 0 count values appearing at least twice.
- **Count Number of Bad Pairs** (LC 2364): j − i ≠ a[j] − a[i] ⟺ a[i] − i ≠ a[j] − j: count good pairs by the key a[i] − i and subtract from the total.
- **4Sum II** (LC 454): map of sums a + b, look up −(c + d).

## Frequency maps

Counter in Python, int[26] for lowercase letters, HashMap&lt;K, Integer&gt; in Java (merge(k, 1, Integer::sum)).

- **Valid Anagram** (LC 242): equal counts.
- **Group Anagrams** (LC 49): key = sorted word (O(L log L)) or the tuple of 26 counts (O(L)).
- **Ransom Note** (LC 383), **First Unique Character** (LC 387): count, then scan in order.
- **Top K Frequent Elements** (LC 347): count, then a size-k heap (O(n log k)) or bucket sort by frequency (O(n)).
- **Sort Characters by Frequency** (LC 451), **Find Players With Zero or One Losses** (LC 2225), **Unique Number of Occurrences** (LC 1207).
- **Minimum Number of Steps to Make Two Strings Anagram** (LC 1347): Σ max(0, count_s[c] − count_t[c]).

## Seen sets and consecutive runs

- **Contains Duplicate** (LC 217): a set; or sort and compare neighbours with O(1) extra space.
- **Contains Duplicate II** (LC 219): duplicates within distance k: a map of last index, or a set of the last k elements (sliding window).
- **Longest Consecutive Sequence** (LC 128): put all values in a set; start counting a run only at values x whose x − 1 is **absent** (run starts); then count x + 1, x + 2, … while present. Each value is visited at most twice (once as a candidate start, once inside one run), so the total is O(n) even though there is a while inside the for.
- **Happy Number** with a seen set, **Linked List Cycle** with a node set: the "have I been here?" pattern.

## Majority vote (Boyer–Moore, 1981)

Find the element appearing more than n/2 times in O(n) time and O(1) space. Keep a candidate and a counter: if the counter is 0, adopt the current element; if the element equals the candidate, increment; otherwise decrement.

Why it works: think of each decrement as cancelling one occurrence of the candidate against one different element. The majority element has more occurrences than all others combined, so it cannot be fully cancelled and must be the candidate at the end. If a majority is not guaranteed, verify with a second counting pass.

**More than n/3** (LC 229): at most two such elements; keep two candidates and two counters (decrement both when the element matches neither), then verify both. Generally, n/k needs k − 1 candidates (Misra–Gries).

## Counting with transformations

Normalise each item before counting so that "equivalent" items share a key:

- **Group Shifted Strings** (LC 249): key = the differences between consecutive letters mod 26.
- **Isomorphic Strings** (LC 205), **Word Pattern** (LC 290): the first-occurrence index pattern of each string ("paper" → 0,1,0,2,3), or two maps in both directions.
- **Find and Replace Pattern** (LC 890): the same normalisation.
- **Count Nice Pairs** (LC 1814): a[i] − rev(a[i]) as the key.
- **Number of Boomerangs** (LC 447): for each point, count others by squared distance; each group of c gives c·(c − 1) ordered pairs.
- **Tuple with Same Product** (LC 1726): count pair products; each product shared by c pairs gives 8·C(c, 2) tuples.

## Prefix counts

The bridge to the next pages: the number of subarrays with a property often equals the number of pairs of **prefixes** with matching states. Store counts of prefix states (sums, XORs, parity masks, remainders) in a map as you scan, and add the count of the matching state at each step.

## Complexity and memory

O(n) time with O(distinct) space. With a small fixed alphabet, prefer arrays (O(1) space in the alphabet sense). In Python, Counter is convenient but slower than a dict or list in hot loops; in Java, boxing in HashMap&lt;Integer, Integer&gt; dominates the cost for large inputs (int[] when keys are small).

## Interview angles

- Say what the map stores (value → index, value → count) and why one lookup per element suffices.
- Mention the order of check and insert in Two Sum.
- For Longest Consecutive Sequence, explain why it is O(n) despite the nested loop.

## Connections

Prefix sums with hash maps, sliding windows with count maps, bucket sort for frequencies, and Misra–Gries / count-min sketches at scale.
`,
    doubts: [
      ["Why check before inserting in Two Sum?", "If you insert x first, then x pairs with itself whenever target = 2x, even if x appears once. Checking first means you only pair with earlier elements."],
      ["Why does Boyer–Moore voting work?", "Every decrement cancels one occurrence of the candidate against one different element. A value that occurs more than n/2 times cannot be cancelled by fewer than n/2 others, so it survives as the final candidate."],
      ["Longest Consecutive Sequence: isn't the inner while loop O(n²)?", "Counting only starts at sequence beginnings (x − 1 not in the set), so each number is extended over exactly once across the whole run. Total O(n)."],
      ["Array of 26 counts or a hash map?", "Array when the alphabet is known and small: faster, no hashing, fixed memory. Hash map for arbitrary keys."],
      ["Is sorting a valid alternative to hashing for these problems?", "Often yes: sort and scan neighbours (duplicates, anagram grouping by sorted keys, two-pointer pair sums) in O(n log n) time with O(1) extra space. Hashing gives O(n) time with O(n) space. Mention the trade-off."],
      ["How does Group Anagrams with count tuples avoid sorting each word?", "Building a 26-length count tuple is O(L) per word, versus O(L log L) for sorting. The tuple is hashable and identical for anagrams. For very short words, sorting is just as fast in practice."],
      ["Can Boyer–Moore find a plurality (most frequent) element when no majority exists?", "No: without a majority, the final candidate is arbitrary. Use a count map (O(n) space) or sort and count runs."],
    ],
    revise: md`
? Two Sum one-pass order of operations? :: Check target − x in the map, then insert x.
? Pairs divisible by k? :: Count remainders; pair r with k − r; handle r = 0 and r = k/2 separately.
? Top-k frequent in O(n)? :: Count, then bucket sort by frequency.
? Longest consecutive in O(n)? :: Set of values; extend only from x where x − 1 is absent.
? Majority (> n/2) in O(1) space? :: Boyer–Moore voting: candidate + counter; verify if not guaranteed.
? Majority Element II (> n/3)? :: Two candidates, two counters, then verify.
? Isomorphic strings / word pattern signature? :: Map each item to the index of its first occurrence.
? Count Number of Bad Pairs key? :: a[i] − i; bad = total − pairs sharing a key.
? Majority > n/k? :: k − 1 candidates (Misra–Gries), then verify.
? Number of Boomerangs? :: Per point, group by squared distance; add c·(c − 1).
? Tuple with Same Product? :: c pairs with the same product give 8·C(c, 2) tuples.
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

Precompute P[0] = 0 and P[i + 1] = P[i] + a[i]. Then the sum of any range a[l..r] (inclusive) is

sum(l, r) = P[r + 1] − P[l].

Build O(n), each query O(1). The leading 0 removes the special case l = 0 and makes empty ranges natural (P[l] − P[l] = 0).

\`\`\`python
from itertools import accumulate
P = [0, *accumulate(a)]
range_sum = lambda l, r: P[r + 1] - P[l]
\`\`\`

**Range Sum Query – Immutable** (LC 303) is exactly this. Related one-liners:

- **Find Pivot Index** (LC 724): the index where the left sum equals the right sum: left = P[i], right = total − P[i + 1].
- **Running Sum** (LC 1480), **Left and Right Sum Differences** (LC 2574).
- **Minimum Value to Get Positive Step by Step Sum** (LC 1413): 1 − min prefix sum.
- **Number of Ways to Split Array** (LC 2270), **Maximum Score After Splitting a String** (LC 1422): prefix counts on each side.

## 2D prefix sums

P[r + 1][c + 1] = a[r][c] + P[r][c + 1] + P[r + 1][c] − P[r][c].

The sum of the rectangle (r1, c1)…(r2, c2) inclusive:

P[r2 + 1][c2 + 1] − P[r1][c2 + 1] − P[r2 + 1][c1] + P[r1][c1].

Inclusion–exclusion: subtract the strip above and the strip to the left, then add back their overlap, which was subtracted twice. Build O(R·C), query O(1). **Range Sum Query 2D – Immutable** (LC 304), **Matrix Block Sum** (LC 1314), **Count Square Submatrices**, **Maximal Square** checks, **Largest Plus Sign** variants.

Higher dimensions generalise with 2^d terms.

## Difference arrays: the inverse

Prefix sums turn point values into range sums. **Difference arrays** do the reverse: they turn range updates into point updates. To add v to every element of a[l..r]:

D[l] += v; D[r + 1] −= v

(allocate D with one extra slot so r + 1 = n is valid). After all updates, a prefix sum over D reconstructs the array. Each update is O(1); the rebuild is O(n). Ideal for many range additions followed by queries.

- **Corporate Flight Bookings** (LC 1109), **Car Pooling** (LC 1094: check capacity at every stop), **Range Addition** (LC 370).
- **Shifting Letters II** (LC 2381): shifts on ranges, then apply each character's total shift mod 26.
- **Minimum number of platforms**, **maximum population year** (LC 1854): +1 at birth, −1 at death, prefix maximum.
- **2D difference arrays**: four corner updates (+v at (r1, c1), −v at (r1, c2 + 1) and (r2 + 1, c1), +v at (r2 + 1, c2 + 1)), then 2D prefix sums: Stamping the Grid (LC 2132), Increment Submatrices by One (LC 2536).

## Prefix products and other prefix operations

The prefix idea works for any **associative** operation; range queries need it to be **invertible**:

- **Prefix XOR**: xor(l..r) = X[r + 1] ^ X[l] (XOR is its own inverse).
- **Prefix products**: Product of Array Except Self (LC 238) uses prefix and suffix products (division would fail with zeros).
- **Prefix max / min**: not invertible, so no arbitrary range queries (use a sparse table or segment tree), but prefix and suffix maxima solve "best to the left and right of i" problems (Trapping Rain Water, Best Time to Buy and Sell Stock).
- **Prefix counts of a predicate**: vowels in a range (Count Vowel Strings in Ranges, LC 2559), ones in a range, characters per type.
- **Prefix sums of prefix sums**: sums over all subarrays of a range (Sum of Total Strength of Wizards, LC 2281).

## Prefix sums on other structures

- **Trees**: root-to-node prefix sums; the sum on the path u–v = pre[u] + pre[v] − 2·pre[lca] + val[lca].
- **Strings**: rolling-hash prefixes give O(1) substring hashes; prefix letter counts answer "how many of letter c in s[l..r]" (26 prefix arrays).
- **Circular arrays**: double the array, or handle wrap-around as total − (the complement range).
- **Updates mixed with queries**: prefix sums cost O(n) per update; use a Fenwick tree or segment tree (O(log n) each).

## Interview checklist

- Off-by-one: P has n + 1 entries; the sum of a[l..r] is P[r + 1] − P[l].
- Overflow: use 64-bit sums in Java and C++.
- Negative numbers are fine for prefix sums (unlike sliding windows).
- Many queries or many updates? Choose prefix sums (static), difference arrays (offline updates), or Fenwick/segment trees (online).

## Connections

Prefix sum + hash map (subarray targets), Kadane's algorithm (best subarray), Fenwick trees (dynamic prefix sums), and sweep lines (difference arrays over time).
`,
    doubts: [
      ["Why add a leading zero?", "So that the sum of a[0..r] is P[r+1] − P[0] like every other range, with no branch for l = 0. It also lets 'empty prefix' be a valid prefix, which matters in prefix + hash map counting."],
      ["When do prefix sums stop working?", "When the array changes between queries (rebuilding is O(n) each time) or when the operation has no inverse (min, max). Use a Fenwick tree for point updates with range sums, a segment tree for general operations."],
      ["How does the difference array handle the end of the array?", "Allocate n + 1 slots so D[r + 1] is always valid; the last slot is never read when you rebuild."],
      ["Is 2D prefix sum construction O(R·C)?", "Yes, one pass with the inclusion–exclusion recurrence. Each rectangle query is then O(1)."],
      ["Should I build the prefix array in place?", "You can (a[i] += a[i − 1]) to save memory, but you lose the original values and the convenient leading zero; off-by-one bugs become more likely. Use a separate array of length n + 1 unless memory is tight."],
      ["How do prefix sums handle a circular range that wraps around?", "Split it into two ranges (from l to the end and from the start to r) and add them, or double the array and take P over 2n elements. For \"maximum circular subarray\" style questions, use total − (minimum non-wrapping subarray)."],
      ["When is a difference array better than a segment tree with lazy propagation?", "When all updates come before all queries (offline) and the coordinates are small or compressible: O(1) per update and O(n) once, with tiny code. A lazy segment tree is needed when updates and queries interleave."],
    ],
    revise: md`
? Range sum a[l..r] from prefix array P (P[0] = 0)? :: P[r + 1] − P[l].
? 2D rectangle sum? :: P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1].
? Add v to a[l..r] with a difference array? :: D[l] += v, D[r+1] −= v, then prefix-sum D.
? Range XOR? :: P[r+1] XOR P[l].
? Range min with prefix arrays? :: Not possible (no inverse): use a sparse table or segment tree.
? Product except self without division? :: Prefix products × suffix products.
? Count submatrices with sum k? :: Fix a pair of rows, compress columns, then 1D prefix + hash map.
? Maximum Population Year? :: +1 at birth, −1 at death year; prefix maximum.
? Path sum u–v on a tree? :: pre[u] + pre[v] − 2·pre[lca] + val[lca].
? Letter counts in a range? :: 26 prefix arrays (or prefix bitmasks for parity).
? 2D difference corner updates? :: +v (r1,c1), −v (r1,c2+1), −v (r2+1,c1), +v (r2+1,c2+1).
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

Count (or find) subarrays whose sum equals k, when the array may contain **negative** numbers. A subarray (i, j] has sum k exactly when

P[j] − P[i] = k ⟺ P[i] = P[j] − k

where P are prefix sums. So scan j from left to right, and at each step ask a hash map: **how many earlier prefixes equal P[j] − k?** Add that count, then record P[j].

\`\`\`python
def subarray_sum(nums, k):            # LC 560
    count, P, seen = 0, 0, {0: 1}     # the empty prefix P = 0 seen once
    for x in nums:
        P += x
        count += seen.get(P - k, 0)
        seen[P] = seen.get(P, 0) + 1
    return count
\`\`\`

[[widget:prefix-sum]]

O(n) time and space. Seeding the map with {0: 1} counts subarrays that start at index 0 (their "earlier prefix" is the empty one). Looking up **before** inserting the current prefix prevents counting the empty subarray when k = 0.

## Why a sliding window does not work here

A window relies on monotonicity: extending the window increases the sum, shrinking decreases it. With negative numbers, adding an element can decrease the sum and removing one can increase it, so neither pointer move is safe. Prefix sums with a hash map do not need monotonicity: they match exact values.

## Variants

| Problem | Map key → value | Lookup |
|---|---|---|
| Subarray Sum Equals K (LC 560): count | prefix sum → count | P − k |
| Maximum Size Subarray Sum Equals k (LC 325): longest | prefix sum → **first** index | P − k, length j − first |
| Subarray Sums Divisible by K (LC 974) | P mod k → count | same remainder |
| Continuous Subarray Sum (LC 523): multiple of k, length ≥ 2 | P mod k → first index | same remainder with j − i ≥ 2 |
| Contiguous Array (LC 525): equal 0s and 1s | prefix of (0 → −1) → first index | same prefix |
| Count Number of Nice Subarrays (LC 1248): k odd numbers | prefix count of odds → count | P − k |
| Binary Subarrays With Sum (LC 930) | prefix sum → count | P − goal |
| Subarrays with XOR equal to k | prefix XOR → count | P ^ k |
| Longest well-performing interval (LC 1124) | prefix of (+1/−1) → first index | P − 1 when P ≤ 0 |
| Make Sum Divisible by P (LC 1590): remove the shortest subarray | P mod p → last index | (P − total mod p) mod p |
| Count subarrays with equal counts of three letters | (a − b, b − c) → count | same pair |

**Longest**: store only the **first** index of each prefix value (never overwrite), because the earliest start gives the longest subarray ending at j.

**Divisible by k**: two prefixes with the same remainder bound a subarray whose sum is divisible by k. Normalise remainders to be non-negative in languages where % can be negative: ((P % k) + k) % k. For LC 523, seed {0: −1} so a valid subarray starting at index 0 has length j − (−1).

**Balance problems** (equal numbers of two kinds): map one kind to +1 and the other to −1; equal counts ⟺ the subarray sums to 0 ⟺ equal prefixes. With three kinds, use the pair of differences as the key.

## Beyond arrays

- **Path Sum III** (LC 437): count downward paths in a tree with sum k: keep a map of prefix sums along the current root-to-node path; add map[P − k] at each node; **decrement** the current prefix's count when backtracking, so siblings do not see each other's prefixes.
- **Number of Submatrices That Sum to Target** (LC 1074): fix a pair of rows (O(R²)), compress the columns between them into a 1D array of column sums, and run the 1D algorithm (O(C)): O(R²·C).
- **Count substrings with all vowels in even counts** (LC 1371): a 5-bit parity mask instead of a sum.

## Proof of correctness in one line

Every subarray ending at j corresponds to exactly one start i < j, i.e. exactly one earlier prefix P[i]; it has sum k iff P[i] = P[j] − k. So counting earlier prefixes with that value counts exactly the subarrays ending at j with sum k, and summing over j counts each subarray once.

## Finding the subarray itself

Store an index (first or last occurrence) instead of a count; when the lookup succeeds, the subarray is (stored index + 1 .. j). For all such subarrays, store lists of indices (the output may be quadratic).

## Complexity

O(n) time and O(n) space (O(k) for remainders mod k, O(2^bits) for masks). With non-negative numbers and a "sum ≤ k" question, a sliding window uses O(1) space instead; with "sum = k" both work, the window needing non-negativity.

## Interview angles

- Explain P[j] − P[i] = k and the {0: 1} seed.
- Say why a sliding window fails with negatives.
- Know the longest variant (first index only) and the remainder variant (normalise mod).

## Connections

Prefix sums, counting patterns, sliding windows (the non-negative special case), and tree DFS with backtracking (Path Sum III).
`,
    doubts: [
      ["Why initialise the map with {0: 1}?", "It stands for the empty prefix before index 0. Without it, a subarray starting at index 0 whose sum is exactly k would be missed, because it needs P[l] = 0 with l = 0."],
      ["For the longest subarray, why store the first index and never update it?", "To maximise r − l, you want the earliest l with the needed prefix value. Overwriting with later indices would shorten the result."],
      ["Why normalise the remainder?", "In Java and C++, −3 % 5 is −3, not 2. Prefixes that differ by a multiple of k must land on the same key, so map remainders into [0, k)."],
      ["Can this find the subarray itself, not just count?", "Yes: store indices instead of counts, and when a match is found you know l (from the map) and r (the current position)."],
      ["Path Sum III: why remove the prefix when backtracking?", "The map must contain only prefixes on the current root-to-node path. When DFS leaves a node, its prefix is no longer an ancestor of later nodes, so decrement its count."],
      ["Why does the longest-subarray variant look up P − k but store only the first index?", "For a fixed end j, every earlier i with P[i] = P[j] − k gives a valid subarray, and the longest uses the smallest i. Keeping only the first occurrence answers \"the smallest i with this prefix\" in O(1); overwriting would keep the latest and give shorter subarrays."],
      ["Does the algorithm work with a target of 0 and zeros in the array?", "Yes: zeros create repeated prefix values, each repetition giving zero-sum subarrays, and the count map counts them all. Looking up before inserting ensures empty subarrays are not counted."],
      ["How much memory does the map use in the worst case?", "One entry per distinct prefix value: up to n + 1 entries. For remainder versions, at most k entries; for parity masks, at most 2^bits."],
    ],
    revise: md`
? Core identity? :: sum(l..r) = k ⟺ P[l] = P[r+1] − k.
? Map initial value for counting? :: {0: 1}, the empty prefix.
? Count vs longest? :: Count: store counts. Longest: store the first index of each prefix.
? Divisible by k? :: Count prefix remainders (normalised to [0, k)); same remainder ⇒ divisible.
? Equal 0s and 1s? :: Map 0 → −1; longest subarray with sum 0.
? Why not sliding window? :: Negatives break monotonicity.
? Path Sum III? :: Prefix + hash map along the DFS path, decrementing on backtrack.
? Make Sum Divisible by P? :: Need (P − total mod p) mod p from earlier prefixes (last index), minimise length.
? Longest Well-Performing Interval? :: ±1 prefix; if P > 0 whole prefix; else look up first index of P − 1.
? Three-letter equal counts key? :: (count_a − count_b, count_b − count_c).
? LC 523 seed? :: {0: −1} with length ≥ 2 check.
`,
    pitfalls: ["Forgetting {0: 1}", "Overwriting the first index when you need the longest", "Negative remainders in Java/C++", "Using a sliding window with negative numbers", "Recording P before querying (counts the empty subarray)"],
    quiz: [
      Q("a = [1, −1, 0], k = 0. Number of subarrays with sum 0?", ["1", "2", "*3", "4"], "[1,−1], [0], [1,−1,0]."),
      Q("Longest subarray with sum k: store…", ["the last index of each prefix", "*the first index of each prefix", "counts", "nothing"], "Earliest l maximises length."),
      Q("Subarray Sum Equals K with negatives: best approach?", ["Sliding window", "*Prefix sums + hash map", "Two pointers", "Sorting"], "Signs do not matter for prefix differences."),
    ],
    sources: [S.article("Prefix sum", "Wikipedia", "https://en.wikipedia.org/wiki/Prefix_sum"), 
      S.article("Prefix sums (with hash map variants)", "USACO Guide", "https://usaco.guide/silver/prefix-sums"),
      ],
    problems: [560, 974, 523, 525, 325, 930, 1248, 437, 1074],
  },

  kadane: {
    blurb: "Maximum subarray in one pass: at each position, extend the best run ending here or start fresh. The smallest example of dynamic programming, with circular and product variants.",
    signals: ["Maximum (or minimum) sum of a contiguous subarray", "Best time to buy and sell once (max difference)", "Circular arrays", "Maximum product subarray"],
    lesson: md`
## The problem

Maximum Subarray (LC 53): find the contiguous non-empty subarray with the largest sum. Brute force over all subarrays is O(n²) (with running sums) or O(n³). Kadane's algorithm (1984) does it in one pass, O(n) time and O(1) space.

## The recurrence

Let best_end(i) = the largest sum of a subarray **ending exactly at i**. Such a subarray either is a[i] alone, or extends the best subarray ending at i − 1:

best_end(i) = max(a[i], best_end(i − 1) + a[i]).

The answer is the maximum of best_end(i) over all i (the best subarray ends somewhere).

\`\`\`python
def max_subarray(a):
    cur = best = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)          # extend or restart
        best = max(best, cur)
    return best
\`\`\`

Equivalently: restart exactly when the running sum would become worse than starting fresh, i.e. when cur < 0 before adding x. A negative prefix only drags down whatever follows, so dropping it is always right. Note the condition is on the **running sum**, not on a[i]: a negative element inside a good run should be kept if the run's total is still positive.

Dry run on [−2, 1, −3, 4, −1, 2, 1, −5, 4]: cur = −2, 1, −2, 4, 3, 5, 6, 1, 5; best = 6 (subarray [4, −1, 2, 1]).

## Edge cases

- **All negative**: the answer is the largest single element. Initialising cur and best with a[0] (not 0) handles it; initialising with 0 silently returns 0, the empty subarray, which is only correct if empty subarrays are allowed.
- **Returning the indices**: track the start when restarting (start = i when cur = x) and record (start, i) when best improves.
- **Overflow**: use 64-bit sums in Java and C++.

## Variants

- **Maximum Product Subarray** (LC 152): a negative number turns the smallest product into the largest. Track both the maximum and minimum product ending at i: hi, lo = max(x, hi·x, lo·x), min(x, hi·x, lo·x) (computed from the previous values). A zero resets both to 0 (and the next element restarts).
- **Maximum Sum Circular Subarray** (LC 918): the best subarray either does not wrap (normal Kadane) or wraps, in which case the elements **not** chosen form a contiguous middle block with the minimum sum: wrap answer = total − (minimum subarray). Answer = max(normal, total − min), except when all numbers are negative (then total − min = 0 corresponds to the empty set: return the normal answer).
- **Maximum Subarray Sum with One Deletion** (LC 1186): two states per index: best ending here with no deletion, and with one deletion (either delete a[i], taking the no-deletion best ending at i − 1, or extend the one-deletion best with a[i]).
- **Maximum Absolute Sum of Any Subarray** (LC 1749): max(maximum subarray, −minimum subarray), or max prefix − min prefix.
- **K-Concatenation Maximum Sum** (LC 1191): Kadane on two copies, plus (k − 2) × total if the total is positive.
- **Best Time to Buy and Sell Stock** (LC 121): Kadane on daily price differences, or track the minimum price so far.
- **Maximum sum rectangle in a matrix**: fix a pair of rows, compress columns into sums, run Kadane: O(R²·C) (LC 363 adds "no larger than k", which needs a sorted set of prefix sums instead of Kadane).
- **Largest sum of a subarray of length at least k**: Kadane-like DP with prefix sums: best ending at i of length ≥ k = P[i + 1] − min(P[0..i + 1 − k]).
- **Longest Turbulent Subarray** (LC 978), **Maximum Ascending Subarray Sum** (LC 1800): the same extend-or-restart idea with different conditions.

## Why it is correct (and what kind of algorithm it is)

It is a one-dimensional DP with state "best ending here" and an O(1) rolling variable. The extend-or-restart choice is also a greedy statement: a subarray ending at i that does not extend the best ending at i − 1 can be replaced by one that does (or by a[i] alone) without lowering its sum. Both views are correct; the DP view generalises to the variants (product, one deletion), the greedy view explains the "drop negative prefixes" rule.

## Divide and conquer alternative

The best subarray of a range is the best of the left half, the best of the right half, or the best **crossing** the middle (best suffix of the left plus best prefix of the right). O(n log n) directly; but storing (total, best prefix, best suffix, best) per segment makes it combinable in O(1), which is exactly the segment-tree node for **maximum subarray in a range with updates** (O(log n) per query).

## Interview angles

- Write the two-line recurrence; explain "extend or restart" and the all-negative case.
- For products, track both extremes; for circular arrays, total − minimum.
- Mention the segment-tree node when ranges or updates appear.

## Connections

Linear DP, state-machine DP (one-deletion variant), prefix sums (max prefix − min prefix), and segment trees.
`,
    doubts: [
      ["Why reset when the running sum becomes negative rather than when a[i] is negative?", "A negative element can still be worth including if the run before it is large (5, −1, 5 → 9). Only a negative running total is useless to carry forward, which is exactly what max(x, cur + x) decides."],
      ["Circular version: why total − min subarray?", "A wrapping subarray consists of a prefix and a suffix; what it excludes is a contiguous middle block. Maximising the kept part means minimising the excluded middle block, which is the minimum subarray."],
      ["Why does maximum product need the minimum too?", "Multiplying by a negative number turns the smallest (most negative) product into the largest. Without tracking the minimum you lose that candidate."],
      ["Is Kadane greedy or DP?", "DP: the state is the best sum ending at i and the transition looks one step back. It is often called greedy because the decision rule is so simple."],
      ["How do I return the start and end indices of the best subarray?", "Keep start for the current run: when cur restarts at a[i], set start = i. Whenever best improves, record (start, i). Ties can be broken by length or position as the problem requires."],
      ["Does Kadane work if empty subarrays are allowed?", "Yes: initialise cur = best = 0 and use cur = max(0, cur + x). The answer is then never negative (the empty subarray has sum 0)."],
      ["Why does the circular case need the all-negative check?", "If every number is negative, the minimum subarray is the whole array, and total − min = 0, which corresponds to choosing nothing. Since the subarray must be non-empty, return the ordinary Kadane result (the largest element) in that case."],
    ],
    revise: md`
? Kadane recurrence? :: cur = max(x, cur + x); best = max(best, cur).
? All-negative array answer? :: The largest element (do not initialise best to 0).
? Circular max subarray? :: max(plain Kadane, total − min subarray), unless all negative.
? Max product subarray? :: Track max and min ending here; a negative swaps them; zeros reset.
? Max rectangle sum in a matrix? :: Fix row pairs, compress columns, Kadane: O(R²C).
? With updates? :: Segment tree storing total, best prefix, best suffix, best per node.
? Max sum with length ≥ k? :: P[i+1] − min(P[0..i+1−k]).
? K-Concatenation? :: Kadane on two copies + (k − 2)·total if total > 0.
? Max Absolute Sum? :: max prefix − min prefix (with P[0] = 0).
? LC 363 (sum ≤ k rectangle)? :: Row pairs + sorted set of prefix sums, not Kadane.
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
