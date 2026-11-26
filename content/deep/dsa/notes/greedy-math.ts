/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */
export const notes: Record<string, string> = {
  "greedy-proofs": `
## Greedy needs a proof
Greedy = commit to the locally best choice and never revisit it. It is right only when that choice is part of some optimal solution.
## Exchange argument
Take any optimal solution that differs from greedy at the first point; swap in greedy's choice; show the result is no worse. Repeat → greedy is optimal.
Example: sorting by deadline minimises maximum lateness (swap adjacent inversions).
## Greedy stays ahead
Show that after every step, greedy's partial solution is at least as good as any other's (interval scheduling by earliest end: greedy's k-th end ≤ optimal's k-th end).
## Counterexamples
Before committing, test small cases: coin change with {1, 3, 4} and 6, 0/1 knapsack by ratio, activity selection by shortest duration or earliest start.
If a counterexample exists → DP.
## Classic greedy problems
Activity selection, Huffman coding, fractional knapsack, minimum spanning trees (Kruskal, Prim), Dijkstra, scheduling by deadline, gas station, jump game, assign cookies, minimum arrows.
## Matroids (name-level)
When the feasible sets form a matroid (independent sets with the exchange property), the greedy by weight is optimal. Graphic matroids give Kruskal.
## Interview habit
State the greedy rule, the proof sketch (exchange or stays-ahead), and the complexity (usually sorting, O(n log n)).
## Extras
Greedy-choice property + optimal substructure.
Candy: left pass, right pass, take the max.
Remove K Digits: monotonic stack (pop larger previous digits).
Brute-force small cases to validate a greedy.
`,
  "greedy-reach": `
## Jump game (LC 55)
Track the farthest reachable index; if i > farthest, you are stuck. O(n).
Or scan from the right: lastGood = i whenever i + nums[i] ≥ lastGood.
## Jump game II (LC 45): minimum jumps
BFS by levels on the array: curEnd = the end of the current jump's range, farthest = the best next range.
When i reaches curEnd, jumps++ and curEnd = farthest. O(n).
## Gas station (LC 134)
If the total gas < total cost → −1. Otherwise scan: when the running tank < 0, the next index becomes the start and the tank resets.
Proof: no station between the old start and the failure point can be a valid start.
## Covering a range with intervals
Video stitching (LC 1024), minimum taps to water a garden (LC 1326): convert to max reach per start, then the jump game II scan.
Minimum number of refuelling stops: greedy with a max-heap of passed stations.
## Variants needing more than greedy
Jump game III (LC 1306, both directions): BFS/DFS. Jump game IV (LC 1345): BFS with value buckets.
Jump game V and VI: DP (VI with a monotonic deque). Frog jump (LC 403): DP over (stone, last jump).
## Extras
Backward Jump Game: lastGood scan from the right.
Gas Station: total check + reset start after a negative tank.
Jump Game VII: BFS with a sliding pointer / prefix sums.
Frog Jump: DP over (stone, last jump).
`,
  "greedy-heap": `
## Huffman coding
Repeatedly merge the two smallest frequencies (min-heap) into a new node; the codes are root-to-leaf paths. Optimal prefix code. O(n log n).
Minimum cost to connect sticks (LC 1167) is the same algorithm.
## Reorganise string (LC 767)
Impossible if the max count > (n + 1) / 2.
Max-heap by count: take the top two different characters each round, re-push with decremented counts.
Or fill even indices with the most frequent character first, then the rest.
Distance-k version (LC 358): a heap plus a cooldown queue.
## Unlock then choose
IPO (LC 502): sort by capital, push profits that become affordable into a max-heap, take the best k times.
Maximum performance of a team (LC 1383): sort by efficiency descending; keep the top-k speeds in a min-heap.
Minimum cost to hire k workers (LC 857): sort by wage/quality ratio; keep the k smallest qualities.
## Last stone weight (LC 1046)
Max-heap simulation: smash the two heaviest; push the difference.
Last stone weight II is a subset-sum DP, not greedy.
## Proof habit
The heap greedy is right when the best available choice now never hurts later choices (an exchange argument on the order of picks).
## Extras
Connect Sticks = Huffman cost.
k distance apart: heap + cooldown queue.
Maximum Score From Removing Stones: min(sum/2, sum − max).
Last Stone Weight II is DP, not a heap greedy.
Arithmetic coding / ANS beat Huffman's whole-bit codes.
`,
  "greedy-sorting": `
## Pairing
Array partition (LC 561): sort, sum every other element.
Boats to save people (LC 881): sort; pair the heaviest with the lightest if they fit; two pointers.
Assign cookies (LC 455): sort both; give each child the smallest cookie that satisfies them.
## Assignment by capability
Most profit assigning work (LC 826): sort jobs by difficulty and workers by ability; sweep with the best profit so far.
Advantage shuffle (LC 870): sort both; beat each opponent value with the smallest larger card, otherwise sacrifice the smallest.
Bag of tokens (LC 948): face-up with the smallest, face-down with the largest.
## Fractional and ratio choices
Fractional knapsack: by value/weight. Two city scheduling (LC 1029): sort by cost_a − cost_b; the first half go to A.
Minimum initial energy (LC 1665): sort by (minimum − actual) descending.
## Reduction to sorting
Largest number (LC 179): sort strings by the comparator a + b > b + a; an all-zero result is "0".
Queue reconstruction by height (LC 406): sort by height descending and k ascending, then insert at index k.
Custom comparators must be transitive and consistent.
## Proving it
Adjacent-swap exchange: show that swapping two neighbours that violate the order never improves the answer.
## Extras
Minimize Maximum Pair Sum: sort, pair smallest with largest.
Most Profit Assigning Work: sort both, sweep with the best profit so far.
Exchange derivation: compare i-then-j vs j-then-i.
Best Meeting Point: medians per coordinate.
`,
  "merge-intervals": `
## Merge intervals (LC 56)
Sort by start; if the next start ≤ the last end (overlap), extend the end to the max; else start a new interval. O(n log n).
Decide whether touching intervals ([1,2], [2,3]) merge.
## Insert interval (LC 57)
Three phases: add intervals ending before the new one; merge all that overlap; add the rest. O(n) on sorted input.
## Related
Non-overlapping intervals (LC 435): the minimum removals = n − (the max number kept by earliest end).
Interval list intersections (LC 986): two pointers.
Meeting rooms (LC 252): sort and check adjacent overlaps. Meeting rooms II: a heap or a sweep.
Employee free time (LC 759): merge everything, then report the gaps.
Summary ranges, range module (LC 715: ordered map of intervals), data stream as disjoint intervals (LC 352).
## Coordinate thinking
Intervals overlap iff a.start < b.end and b.start < a.end (half-open).
Sorting by start is for merging; sorting by end is for selecting the maximum number of disjoint intervals.
## Extras
Touching: s ≤ last end merges closed intervals.
Employee Free Time: merge all, report gaps.
Count Integers in Intervals: dynamic map + running count.
Intersection [max starts, min ends]; union [min starts, max ends].
`,
  "sweep-line": `
## Events
Turn each interval into (start, +1) and (end, −1); sort; scan, keeping a running count.
Tie order matters: for half-open intervals process ends before starts at the same coordinate.
Maximum overlap = the peak running count (meeting rooms II, car pooling, my calendar III).
## Points and intervals
Count points in intervals or intervals covering each point: sort points and events together, or binary search on sorted starts and ends.
Number of flowers in full bloom (LC 2251): bisect_right(starts, t) − bisect_left(ends, t).
Minimum arrows to burst balloons (LC 452): sort by end; shoot at the first end; skip balloons it bursts.
## Sweeps with a structure
Keep the active set in a heap or ordered map: skyline (max height), rectangle area union (segment tree over y), closest pair of points (ordered by y within a strip).
Line segment intersection (Bentley–Ottmann) uses an ordered status structure.
## Coordinate compression
Map large coordinates to ranks 0…k−1 (sort the unique values); then use arrays, difference arrays or Fenwick trees.
Keep the original coordinates to compute lengths or areas between compressed points.
## Extras
Car Pooling with small positions: difference array.
Rectangle Area II: compressed y segment tree with cover counts.
Bentley–Ottmann: all segment intersections in O((n + k) log n).
Heap of ends also assigns rooms; sweep gives the profile.
`,
  "interval-scheduling": `
## Earliest end first
Maximum number of non-overlapping intervals: sort by end; take each interval that starts after the last taken end. Optimal by "stays ahead".
Minimum removals = n − kept (LC 435). Maximum length of a pair chain (LC 646).
Sorting by start or by length is wrong (counterexamples exist).
## Weighted interval scheduling
Sort by end; dp[i] = max(dp[i−1], w[i] + dp[p(i)]), where p(i) = the last interval ending ≤ start[i], found by binary search. O(n log n).
Maximum profit in job scheduling (LC 1235). Maximum events attended with values (LC 1751) adds a count dimension.
## Interval partitioning
Minimum number of rooms / colours = the maximum overlap (meeting rooms II). Greedy by start with a min-heap of ends.
## Covering
Cover [0, T] with the fewest intervals: sort by start; repeatedly pick the farthest end among those starting ≤ the current reach (video stitching).
Set cover in general is NP-hard; the 1D interval version is greedy.
## Maximum events attended (LC 1353)
Day by day: add events starting today to a min-heap of end days, drop expired ones, attend the one ending soonest.
## Summary
Max disjoint → end-sort greedy. Weighted → DP + binary search. Rooms → heap or sweep. Cover → farthest-reach greedy.
## Extras
Wrong rules: shortest first, earliest start, fewest conflicts.
Covering: replace any chosen interval with the farthest-reaching one (exchange).
Stabbing points = max disjoint intervals.
Set cover in general is NP-hard; intervals make greedy optimal.
`,
  skyline: `
## Skyline problem (LC 218)
Events: (x, −h) for starts and (x, +h) for ends (or another tie-break scheme); sort by x.
Keep the active heights in a max-heap (lazy removal) or a multiset; after each x, if the max height changed, output (x, max).
Tie-breaking: at the same x, process starts before ends and taller starts first, so you do not emit spurious points.
O(n log n). Divide and conquer (merge two skylines like merge sort) also works.
## Falling squares (LC 699)
Each square lands on the max height over its range: a segment tree with range max and range assign over compressed coordinates (or O(n²) by checking earlier squares).
## Related sweeps with active sets
Rectangle area II (LC 850): sweep x; a segment tree over compressed y stores the covered length.
Perfect rectangle (LC 391): area sum plus corner parity (every inner corner appears an even number of times).
Number of visible people, the maximum building height with restrictions (two passes).
## Interview strategy
Explain the event representation and tie rules first; then the active-set structure; then the output rule ("emit when the max changes").
## Extras
Tie rules: starts first, taller starts first, shorter ends first.
Emit when the max changes after processing an x.
Test: equal adjacent heights, nesting, single building.
Buildings With an Ocean View: 1D monotonic scan.
`,
  "bit-basics": `
## Operators
& and, | or, ^ xor, ~ not, << shift left (×2), >> arithmetic shift right (÷2, sign-extending); Java >>> is the logical shift.
Precedence trap: == binds tighter than & in C/Java: write (x & 1) == 0.
## Two's complement
−x = ~x + 1. The range of n-bit signed integers is [−2^(n−1), 2^(n−1) − 1].
Python ints are unbounded: mask with & 0xFFFFFFFF to emulate 32 bits and convert back for negatives.
## Idioms
Test bit i: (x >> i) & 1. Set: x | (1 << i). Clear: x & ~(1 << i). Toggle: x ^ (1 << i).
Lowest set bit: x & −x. Clear the lowest set bit: x & (x − 1).
Power of two: x > 0 and x & (x − 1) == 0. Power of four: also (x & 0x55555555) ≠ 0.
Count bits (Kernighan): repeat x &= x − 1. Iterate set bits with the same loop.
Even/odd: x & 1. Swap without a temp: a ^= b; b ^= a; a ^= b (cute, not faster).
## Classic problems
Number of 1 bits (LC 191), reverse bits (LC 190), sum of two integers without + (LC 371: xor is the sum without carry, (a & b) << 1 is the carry; mask in Python).
Divide two integers (LC 29): subtract shifted divisors, handle overflow at INT_MIN / −1.
Bitwise AND of a range (LC 201): the common prefix of left and right.
## Built-ins
Python bin(x).count("1") or int.bit_count(); Java Integer.bitCount, numberOfTrailingZeros, highestOneBit; C++ __builtin_popcount, __builtin_ctz, std::popcount.
## Extras
Java >>> logical shift.
Python ~x = −x − 1; emulate 32 bits with & 0xFFFFFFFF.
Reverse bits: swap halves, quarters, … with masks.
UTF-8 validation: leading-bit masks.
Complement: XOR with the same-length all-ones mask.
`,
  "xor-tricks": `
## Properties
x ^ x = 0, x ^ 0 = x; commutative and associative; self-inverse (if a ^ b = c then a ^ c = b).
XOR is addition mod 2 per bit (no carries).
## Problems
Single number (LC 136): XOR everything; pairs cancel.
Missing number (LC 268): XOR all indices and values.
Single number III (LC 260): XOR all = a ^ b; split by its lowest set bit; XOR each group.
Find the duplicate and missing (set mismatch): the same split trick.
Decode XORed array (LC 1720): a[i+1] = a[i] ^ encoded[i]. Decode XORed permutation (LC 1734): use the XOR of 1..n and the odd-indexed encodings.
XOR queries of a subarray (LC 1310): prefix XORs.
Count triplets with equal XOR (LC 1442): prefix X[i] == X[k + 1].
XOR of 1..n has a period of 4: n, 1, n + 1, 0 for n mod 4 = 0, 1, 2, 3.
## Gray code (LC 89)
g(i) = i ^ (i >> 1): consecutive codes differ in exactly one bit. Inverse: XOR all right shifts.
## Maximum XOR
Pairs: a binary trie, greedy from the top bit. Subsets: a linear XOR basis (Gaussian elimination over GF(2)).
## Extras
Missing Number via XOR avoids overflow.
Set Mismatch: split dup ^ missing by a set bit.
Subarrays with XOR k: prefix XOR + count map.
Gray inverse: XOR of all right shifts.
XOR swap fails on aliased locations.
`,
  "bitmask-enum": `
## Enumerating subsets
for mask in 0 … 2ⁿ − 1: element i is in the subset iff (mask >> i) & 1. O(n·2ⁿ).
Practical up to n ≈ 20–25.
## Submasks of a mask
for (sub = mask; sub; sub = (sub − 1) & mask) — remember to also handle sub = 0.
Over all masks the total is 3ⁿ (each element: out, in mask only, in both).
## Masks as sets
Union |, intersection &, difference a & ~b, complement full ^ a, size popcount, membership test.
Compress a word's letters into a 26-bit mask: maximum product of word lengths (LC 318) checks a & b == 0.
Number of valid words for each puzzle (LC 1178): enumerate the submasks of each puzzle's mask.
## Gosper's hack
Next mask with the same popcount: c = x & −x; r = x + c; x = (((r ^ x) >> 2) / c) | r. Enumerates the k-subsets in order.
## Meet in the middle
Split n ≤ 40 items into two halves; enumerate 2^(n/2) sums of each; sort one and binary search or two-pointer the other. O(2^(n/2)·n).
Closest subsequence sum (LC 1755), partition array into two arrays to minimise the sum difference (LC 2035: group by count).
## Extras
Subset check: a & ~b == 0.
LC 1177: popcount(XOR of prefix masks) // 2 replacements.
Increasing submasks: sub = (sub − m) & m.
SOS DP when 3ⁿ is too slow.
`,
  "bit-counting": `
## Single numbers
Every element thrice except one (LC 137): count each bit mod 3, or the ones/twos state machine: ones = (ones ^ x) & ~twos; twos = (twos ^ x) & ~ones.
## Counting bits for 0..n (LC 338)
bits[i] = bits[i >> 1] + (i & 1), or bits[i] = bits[i & (i − 1)] + 1. O(n).
## Per-bit contributions
Sum of XOR over all pairs or Hamming distances (LC 477): for each bit, ones × zeros pairs differ there.
Sum of subarray ORs or ANDs: per bit, count the subarrays that have (or lack) the bit.
## Total set bits in 1..n
Per bit b: full cycles of length 2^(b+1) contribute 2^b each, plus the partial remainder max(0, (n mod 2^(b+1)) − 2^b + 1).
## Minimum flips
Minimum bit flips to convert a to b (LC 2220): popcount(a ^ b).
Minimum flips so that a OR b == c (LC 1318): per bit, compare c's bit with a's and b's bits (two flips when c is 0 and both are 1).
## Extras
SWAR popcount: masks 0x5555…, 0x3333…, 0x0F0F…, multiply 0x01010101.
Sum of subarray ORs: total − subarrays without the bit (runs).
LC 2411: nearest index to the right per bit.
Majority by bits: majority holder of each bit.
`,
  "gcd-primes": `
## GCD
Euclid: gcd(a, b) = gcd(b, a mod b), gcd(a, 0) = a. O(log min(a, b)).
lcm(a, b) = a / gcd(a, b) × b (divide first to avoid overflow).
Extended Euclid finds x, y with ax + by = gcd(a, b): modular inverses and Bézout.
gcd of an array: fold; the gcd of a subarray only decreases as the subarray grows (at most log distinct values).
## Primality
Trial division up to √n: O(√n). Miller–Rabin for large n (deterministic bases for 64-bit).
## Sieve of Eratosthenes
Mark multiples of each prime p starting at p²: O(n log log n). Count primes (LC 204).
The smallest-prime-factor sieve gives O(log n) factorisation of every number ≤ n.
Linear sieve: O(n), each composite marked once.
## Factorisation and divisors
Trial division up to √n; the remaining n > 1 is a prime factor.
Number of divisors from the exponents: Π (eᵢ + 1). Divisors come in pairs (d, n/d) up to √n.
## Interview problems
Greatest common divisor of strings (LC 1071): str1 + str2 == str2 + str1, then the prefix of length gcd.
Water jug (LC 365): target must be a multiple of gcd(x, y) and ≤ x + y.
Ugly numbers (LC 264): three pointers over multiples of 2, 3, 5.
Count primes, the closest prime pair in a range, and the number of subarrays with gcd k.
## Extras
Lamé: worst case is consecutive Fibonacci numbers.
Linear sieve: each composite crossed once (O(n)).
Totient φ(n) = n·Π(1 − 1/p).
Divisor lists for all numbers ≤ n: harmonic loop, O(n log n).
X of a Kind: gcd of counts ≥ 2.
`,
  modular: `
## Rules
(a + b) mod m and (a × b) mod m can be reduced at every step; subtraction: (a − b + m) mod m.
Division: multiply by the inverse; it exists iff gcd(b, m) = 1.
Use 64-bit intermediates (10⁹ × 10⁹ fits in a signed 64-bit integer); Python does not overflow.
Python's % is always non-negative; Java and C++ can return negatives.
## Fast exponentiation
Square and multiply: while e: if e & 1: r = r·b mod m; b = b·b mod m; e >>= 1. O(log e).
Pow(x, n) (LC 50): handle negative n with 1/x and the INT_MIN edge case.
Super pow (LC 372): an exponent given as an array of digits.
## Modular inverse
Prime m: inv(a) = a^(m−2) mod m (Fermat). General m: extended Euclid.
Batch inverses of 1..n: inv[i] = −(m / i) × inv[m mod i] mod m.
## Combinations mod p
Precompute factorials and inverse factorials up to n: C(n, k) = n! · inv(k!) · inv((n−k)!).
Pascal's triangle for small n (n ≤ ~5000) avoids inverses.
Lucas's theorem when n ≥ p.
## Matrix exponentiation
Linear recurrences mod m: raise the transition matrix to n in O(k³ log n).
## Extras
pow(b, −1, M) in Python 3.8+.
inv(2) = (M + 1)/2 for odd prime M.
998244353 = 119·2²³ + 1 (NTT-friendly).
CRT combines answers modulo coprime moduli.
Max/min on true values before reducing.
`,
  combinatorics: `
## Basics
Permutations n!/(n − k)!; combinations C(n, k) = n!/(k!(n − k)!); C(n, k) = C(n−1, k−1) + C(n−1, k).
Stars and bars: distribute n identical items into k bins: C(n + k − 1, k − 1) (C(n − 1, k − 1) if every bin is non-empty).
Multinomial: arrangements of a multiset = n!/(n₁!·n₂!·…).
Grid paths from (0,0) to (r,c) = C(r + c, r).
## Catalan numbers
Cₙ = C(2n, n)/(n + 1): 1, 1, 2, 5, 14, 42, 132.
Counts balanced parentheses, BST shapes with n keys (LC 96), triangulations, Dyck paths, non-crossing handshakes.
## Inclusion–exclusion
|A ∪ B| = |A| + |B| − |A ∩ B|; in general alternate signs over the intersections.
Derangements: D(n) = (n − 1)(D(n−1) + D(n−2)), about n!/e.
Count numbers ≤ n divisible by any of a set: alternate over the LCMs of subsets.
## Pigeonhole
n + 1 items in n boxes → some box holds two. Find the duplicate number, a subarray sum divisible by n (prefix remainders).
## Probability and expectation
Linearity of expectation needs no independence: expected fixed points of a random permutation = 1.
Geometric distribution: the expected number of trials until success = 1/p (coupon collector ≈ n·Hₙ).
## Large values
Use the modulus, logarithms for comparisons, or Python big integers; check for overflow in factorials quickly (20! fits in 64 bits, 21! does not).
## Extras
Count Sorted Vowel Strings = C(n + 4, 4).
Pigeonhole: a subarray sum divisible by n always exists.
Birthday paradox: collision around √M.
20! < 2⁶³ < 21!.
Upper limits: inclusion–exclusion over violating bins.
`,
  geometry: `
## Cross product orientation
cross(o, a, b) = (a.x − o.x)(b.y − o.y) − (a.y − o.y)(b.x − o.x).
> 0 counter-clockwise (left turn), < 0 clockwise, = 0 collinear. Exact with integers.
## Uses
Segment intersection: endpoints straddle each other (orientation signs differ), plus collinear special cases.
Polygon area (shoelace): |Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)| / 2.
Convex hull: Andrew's monotone chain (sort points, build lower and upper hulls with cross ≤ 0 pops), O(n log n). Erect the fence (LC 587).
Point in polygon: ray casting (count crossings) or winding number.
## Interview problems
Max points on a line (LC 149): for each point, count slopes as reduced (dy, dx) pairs with a normalised sign; avoid floats.
Valid square (LC 593): the six pairwise squared distances give 4 equal sides and 2 equal diagonals.
Minimum area rectangle (LC 939): pairs of diagonal points plus a set lookup.
Rectangle overlap (LC 836): overlap in both x and y. Rectangle area (LC 223): sum minus the intersection.
K closest points: squared distances, a heap or quickselect.
## Floating point
Compare with ε; prefer integer arithmetic (squared distances, cross products, reduced fractions).
atan2 for angles (visible points, LC 1610: sort the angles, duplicate them +360°, sliding window).
## Extras
Dot product sign: acute / right / obtuse.
Convex polygon: all turns have the same sign.
Detect Squares: same-x partner as a side, check two corners.
Minimum Time Visiting All Points: Chebyshev distance.
Floats: ε comparisons, atan2, compare squared distances.
`,
  randomized: `
## Fisher–Yates shuffle (LC 384)
For i from n − 1 down to 1: j = random in [0, i]; swap a[i], a[j]. Every permutation is equally likely. O(n).
Picking j from [0, n − 1] every time is biased.
## Reservoir sampling (LC 382, 398)
Stream of unknown length: keep the i-th item with probability 1/i (replace the current choice). Each item ends up chosen with probability 1/n.
k items: keep the first k; item i replaces a random slot with probability k/i.
## Weighted random pick (LC 528)
Prefix sums of the weights; draw r in [1, total]; binary search the first prefix ≥ r. O(log n) per pick.
Alias method: O(1) per pick after O(n) setup.
Random point in non-overlapping rectangles (LC 497): weight by the number of integer points.
## Rejection sampling (LC 470)
rand10 from rand7: generate a uniform number in 1..49 with two calls; reject above 40; return (x − 1) mod 10 + 1. Expected calls ≈ 2.45.
Random point in a circle: sample the square and reject outside, or r = R·√u with a random angle.
## Randomised algorithms
Quickselect and quicksort with random pivots: expected O(n) and O(n log n). Treaps, skip lists, randomised hashing.
Las Vegas (always correct, random time) vs Monte Carlo (fixed time, possibly wrong, e.g. Miller–Rabin).
## Insert Delete GetRandom O(1) (LC 380)
Array plus value → index map; delete by swapping with the last element and popping; getRandom picks a random index.
With duplicates (LC 381): value → set of indices.
## Extras
rand10 from rand7: 2.45 expected calls; reuse rejected values to reduce.
Random point in a circle: radius R·√u.
Las Vegas (always correct) vs Monte Carlo (probably correct).
Zobrist hashing: XOR random labels.
Test shuffles with frequency counts.
`,
};
