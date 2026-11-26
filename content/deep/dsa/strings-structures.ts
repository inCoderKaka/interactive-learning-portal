import { md } from "@/content/ai/md";
import { Q } from "@/content/h";
import { S, type Deep } from "../types";

/** Strings, range queries, data-structure design, matrices, sorting and stretch techniques. */
export const stringsStructures: Record<string, Deep> = {
  // ─────────────── strings ───────────────
  "string-basics": {
    blurb: "Immutability and builders, character counts, anagram and palindrome checks, encoding and parsing: the everyday string skills and the hidden quadratic traps.",
    signals: ["Character frequency or comparison questions", "Build a string incrementally", "Parse or encode/decode strings"],
    lesson: md`
## Immutability and building

Strings are immutable in Java, Python, JavaScript and Go. Repeated \`s += c\` copies the whole string each time: Θ(n²). Use a builder: \`StringBuilder\` (Java), a list then \`"".join\` (Python), \`std::string\` with push_back (C++ strings are mutable). Slicing copies (O(k)); Java's substring copies since 7u6.

## Character tables

Use an int[26] (or [128]) count array for lowercase letters: faster than hash maps. Map with c − 'a'.

## Classic tasks

- **Valid Anagram** (LC 242): equal counts. **Group Anagrams** (LC 49): key by sorted string or count tuple.
- **Valid Palindrome** (LC 125): two pointers skipping non-alphanumerics, case-insensitive.
- **Longest Common Prefix** (LC 14): vertical scan, or sort and compare first and last.
- **String Compression** (LC 443): read/write pointers in place.
- **Encode and Decode Strings** (LC 271): length-prefix each string ("5#hello"), which handles any characters including the delimiter.
- **Reverse Words** (LC 151): split on whitespace, reverse, join (or in place: reverse all, then each word).
- **Text Justification** (LC 68): greedy line packing, distribute spaces left-heavy, last line left-justified.
- **Zigzag Conversion** (LC 6), **Integer to Roman** (LC 12) and **Roman to Integer** (LC 13), **String to Integer (atoi)** (LC 8: whitespace, sign, overflow clamping).
- **Multiply Strings** (LC 43): grade-school multiplication into an array of n + m digits.
- **Add Binary/Strings** (LC 67, 415): right to left with carry.

## Unicode

A "character" can be several bytes (UTF-8) or two UTF-16 code units (Java/JS surrogate pairs), and user-perceived characters (grapheme clusters, e.g. emoji with modifiers) can be several code points. Reversing a Java String naively breaks emoji. Mention it if the input is not ASCII.

## Comparing strings

Lexicographic comparison is O(min length). Sorting n strings of length L is O(n L log n). Hashing a string is O(L); equality checks are O(L) in the worst case.
`,
    doubts: [
      ["Why is s += c in a loop quadratic?", "Each concatenation creates a new string and copies all existing characters: 1 + 2 + … + n = Θ(n²) copies. A builder appends into a growable buffer with amortised O(1) per character."],
      ["Why length-prefix encoding instead of a delimiter?", "Any delimiter can appear inside the strings. A length prefix tells the decoder exactly how many characters to read, regardless of content."],
      ["Is Python's str.join linear?", "Yes: it computes the total length first and copies each piece once."],
    ],
    revise: md`
? Build strings in Java / Python? :: StringBuilder / list + ''.join.
? Anagram check? :: Equal 26-count arrays.
? Encode a list of strings safely? :: Length prefix per string ('5#hello').
? atoi pitfalls? :: Leading spaces, sign, non-digits, overflow clamping.
? Multiply strings result length? :: At most n + m digits.
? Unicode trap? :: Surrogate pairs and grapheme clusters break naive reversal.
`,
    pitfalls: ["Quadratic concatenation", "Delimiter-based encoding", "Overflow in atoi", "Assuming one byte per character"],
    quiz: [Q("Encoding ['a#b', ''] with length prefixes gives…", ["'a#b#'", "*'3#a#b0#'", "'a#b,'", "'2#a#b'"], "Length, '#', then the raw string.")],
    sources: [S.article("StringBuilder (Java SE 21)", "Oracle", "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html"), S.article("Unicode text segmentation (grapheme clusters)", "Unicode Consortium", "https://www.unicode.org/reports/tr29/"), S.book("Algorithms, 4th ed. ch. 5: Strings", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/50strings/")],
    problems: [242, 49, 125, 14, 443, 271, 151, 68, 6, 12, 13, 8, 43, 67, 415],
  },
  "rolling-hash": {
    blurb: "Hash every substring in O(1) after O(n) preprocessing: Rabin–Karp search, repeated substrings with binary search, and the collision risks you must manage.",
    signals: ["Compare many substrings quickly", "Longest duplicate substring", "Pattern search with multiple patterns of equal length"],
    lesson: md`
## Polynomial hash

H(s[0..k)) = s[0]·b^(k−1) + s[1]·b^(k−2) + … + s[k−1] (mod p). With prefix hashes h[i] and powers pw[i]:

hash(l, r) = h[r] − h[l]·pw[r − l] (mod p)

Any substring hash in O(1) after O(n) preprocessing. Rolling a window by one: remove the leading character's contribution, multiply by b, add the new one.

## Rabin–Karp

Compare the pattern's hash with every window's hash; on equal hashes, verify (or accept the tiny collision risk with a strong hash). Expected O(n + m).

## Collisions

With p ≈ 10⁹ and many comparisons, the birthday bound makes collisions plausible (≈ √p ≈ 3·10⁴ distinct hashes). Defences:
- **double hashing** (two moduli) or a 61-bit Mersenne modulus (2⁶¹ − 1);
- a **random base** chosen at runtime (anti-hack);
- verification on match.

## Problems

- **Repeated DNA Sequences** (LC 187): fixed length 10; a 2-bit encoding makes an exact 20-bit hash.
- **Longest Duplicate Substring** (LC 1044): binary search the length L; check for a repeated length-L substring with rolling hashes in O(n). O(n log n) overall. (A suffix array solves it too.)
- **Longest Repeating Substring**, **Distinct Echo Substrings** (LC 1316).
- **Shortest Palindrome** (LC 214): forward and backward hashes of prefixes find the longest palindromic prefix (KMP also works).
- **Find Substring With Given Hash Value** (LC 2156): roll from the right.

## When to prefer exact algorithms

KMP and Z are exact and linear; hashing is simpler for "compare arbitrary substrings" and combines well with binary search. Mention the trade-off.
`,
    doubts: [
      ["Why subtract h[l]·pw[r − l]?", "h[r] contains the prefix s[0..l) shifted left by (r − l) positions in base b. Subtracting that shifted prefix leaves exactly the hash of s[l..r)."],
      ["How likely are collisions?", "For one comparison about 1/p. Over many substrings, the chance that some pair collides grows quadratically (birthday problem), so with 10⁵+ hashes and a single 10⁹ modulus, use double hashing or verify matches."],
    ],
    revise: md`
? Substring hash from prefix hashes? :: h[r] − h[l]·b^(r−l) mod p.
? Rabin–Karp expected cost? :: O(n + m) (verify on match).
? Collision defences? :: Two moduli or 2⁶¹ − 1, random base, verify.
? Longest duplicate substring? :: Binary search on length + rolling hash: O(n log n).
? Shortest palindrome by hashing? :: Longest prefix whose forward and reverse hashes match.
`,
    pitfalls: ["Negative values after modular subtraction", "Single small modulus with many comparisons", "Forgetting to verify in adversarial settings"],
    quiz: [Q("Longest Duplicate Substring is usually solved by…", ["DP O(n²)", "*binary search on length + rolling hash", "two pointers", "greedy"], "Duplicate of length L implies one of length L − 1: monotone.")],
    sources: [S.paper("Efficient randomized pattern-matching algorithms (Karp & Rabin, 1987)", "IBM Journal of Research and Development", "https://doi.org/10.1147/rd.312.0249"), S.article("String hashing", "cp-algorithms", "https://cp-algorithms.com/string/string-hashing.html"), S.article("Rabin–Karp for string matching", "cp-algorithms", "https://cp-algorithms.com/string/rabin-karp.html")],
    problems: [187, 1044, 1062, 1316, 214, 2156, 28],
  },
  kmp: {
    blurb: "The prefix function (failure function) and the Knuth–Morris–Pratt matcher: linear-time search that never re-reads text, plus periods, borders and the shortest palindrome trick.",
    signals: ["Find a pattern in text in O(n + m) worst case", "Smallest period / repeated substring pattern", "Longest prefix that is also a suffix (border)"],
    widgets: ["kmp"],
    lesson: md`
## The prefix function

π[i] = length of the longest proper prefix of s[0..i] that is also a suffix of it (the longest **border**). Computed in O(n):

\`\`\`
pi = [0] * n; k = 0
for i in range(1, n):
    while k and s[i] != s[k]: k = pi[k - 1]
    if s[i] == s[k]: k += 1
    pi[i] = k
\`\`\`

The while loop falls back through shorter borders; k increases at most n times in total, so the total work is O(n) (amortised).

[[widget:kmp]]

## Matching

Run the same loop over the text with the pattern's π: on a mismatch fall back k = π[k − 1]; on a full match (k = m) report and fall back. O(n + m) worst case, and the text pointer never moves backwards (good for streams). Or compute π of pattern + '#' + text and look for values equal to m.

**Find the Index of the First Occurrence** (LC 28).

## Periods and repetitions

- The smallest period of s is p = n − π[n − 1]. s is a repetition of a block iff p divides n and p < n: **Repeated Substring Pattern** (LC 459).
- Number of occurrences of each prefix in the string: counting via π.

## Shortest Palindrome (LC 214)

Compute π of s + '#' + reverse(s); the last value is the longest palindromic prefix length L; prepend reverse(s[L..]).

## Other uses

- **Longest Happy Prefix** (LC 1392): π[n − 1].
- **String rotation check**: is t a substring of s + s (KMP).
- KMP automaton for DP over strings that must avoid a pattern (digit/string DP with a pattern state).

## KMP vs Z vs hashing

All linear. KMP streams the text; Z gives "match length at each position" directly; hashing is simplest for arbitrary substring comparisons but probabilistic.
`,
    doubts: [
      ["Why does falling back to π[k − 1] not miss matches?", "When s[i] ≠ s[k], the next candidate border must be a border of the current border s[0..k). The longest such is π[k − 1]. Shorter candidates are reached by repeated fallbacks, so every possibility is tried in decreasing length."],
      ["Why is the prefix function computation linear despite the inner while?", "k increases by at most 1 per i and each fallback decreases it, so the total number of fallbacks is at most the total increases, ≤ n."],
      ["Why add a separator '#' when concatenating?", "It prevents a border from running across the boundary, capping every π value at the pattern length."],
    ],
    revise: md`
? π[i] means? :: Longest proper prefix of s[0..i] that is also its suffix.
? Mismatch fallback? :: k = π[k − 1].
? Matching cost? :: O(n + m) worst case.
? Smallest period? :: n − π[n − 1]; repeated block iff it divides n.
? Shortest palindrome? :: π of s + '#' + reverse(s); prepend the rest reversed.
? Longest happy prefix? :: π[n − 1].
`,
    pitfalls: ["Proper prefix (π[i] < i + 1)", "Missing separator in concatenation", "O(nm) naive search on adversarial inputs (aaaa…ab)"],
    quiz: [Q("π for 'abab' is…", ["[0,1,2,3]", "*[0,0,1,2]", "[0,0,0,1]", "[1,2,3,4]"], "Borders: '', '', 'a', 'ab'.")],
    sources: [S.paper("Fast pattern matching in strings (Knuth, Morris & Pratt, 1977)", "SIAM Journal on Computing", "https://doi.org/10.1137/0206024"), S.article("Prefix function. Knuth–Morris–Pratt algorithm", "cp-algorithms", "https://cp-algorithms.com/string/prefix-function.html"), S.book("Algorithms, 4th ed. §5.3 Substring Search", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/53substring/")],
    problems: [28, 459, 214, 1392, 796, 1764],
  },
  "z-algorithm": {
    blurb: "Z[i] = length of the longest substring starting at i that matches a prefix. Linear time with a sliding [l, r) box; pattern search, periods and string compression follow.",
    signals: ["Match length of the prefix at every position", "Pattern occurrences via pattern + '$' + text", "Sum of prefix-match lengths (LC 2223)"],
    lesson: md`
## Definition

Z[0] is undefined (or n). For i > 0, Z[i] is the length of the longest common prefix of s and s[i..].

## Linear algorithm

Maintain the rightmost segment [l, r) that matches a prefix. For i < r, Z[i] starts at min(r − i, Z[i − l]) (reuse the mirrored value), then extend by direct comparison; update [l, r) if it grew. Total extensions are O(n) because r only moves right.

## Uses

- **Pattern matching**: Z of pattern + '$' + text; positions with Z = m are matches. O(n + m).
- **Sum of Scores of Built Strings** (LC 2223): sum of all Z values plus n.
- **Minimum time to revert word to initial state** (LC 3031): smallest k multiple of the step with Z[k] ≥ n − k.
- **Periods**: smallest p with p + Z[p] = n.
- **Number of distinct substrings** (O(n²) with Z, better with suffix structures).

## Z vs prefix function

They carry the same information (each can be converted to the other in O(n)). Z is often more direct when the question is about prefix matches at positions; KMP when streaming or when borders are the object.
`,
    doubts: [
      ["Can Z and the prefix function solve the same problems?", "Yes. Each can be computed from the other in O(n), so pattern matching, periods and border questions can use either. Pick Z when you think in terms of \"how far does the prefix match starting here\", and KMP when you stream the text or reason about borders."],
      ["Why can Z[i] start from Z[i − l]?", "Inside the box [l, r), s[l..r) equals s[0..r − l). So s[i..] near i mirrors s[i − l..], whose prefix match Z[i − l] is known, capped by the box boundary r − i where knowledge ends."],
    ],
    revise: md`
? Z[i] means? :: Longest common prefix of s and s[i..].
? Box reuse? :: Z[i] ≥ min(r − i, Z[i − l]) for i < r.
? Complexity? :: O(n): r only moves right.
? Pattern search? :: Z of pattern + '$' + text; Z = m marks matches.
? Smallest period? :: Smallest p with p + Z[p] = n.
`,
    pitfalls: ["Not capping by r − i", "Separator character present in the strings"],
    quiz: [Q("Z array of 'aabxaab' at index 4?", ["2", "*3", "1", "0"], "'aab' matches the prefix.")],
    sources: [S.article("Z-function and its calculation", "cp-algorithms", "https://cp-algorithms.com/string/z-function.html"), S.book("Algorithms on Strings, Trees, and Sequences (ch. 1, the Z algorithm)", "Dan Gusfield", "https://doi.org/10.1017/CBO9780511574931")],
    problems: [2223, 3031, 28, 1392],
  },
  manacher: {
    blurb: "All maximal palindromes in O(n): mirror palindrome radii inside the rightmost known palindrome. The linear answer to longest palindromic substring.",
    signals: ["Longest palindromic substring with n up to 10⁵–10⁶", "Count all palindromic substrings in O(n)", "Palindrome radius at every centre"],
    lesson: md`
## Idea

Insert separators (e.g. "#a#b#a#") so every palindrome has odd length in the transformed string t. Compute d[i] = radius of the longest palindrome centred at i. Keep the palindrome [l, r] with the rightmost end. For i inside it, its mirror j = l + r − i has a known radius, so d[i] ≥ min(d[j], r − i). Then expand naively and update [l, r]. Like the Z-algorithm, r only moves right: **O(n)**.

## Reading results

- Longest palindromic substring: the maximum radius; map back to original indices.
- Count palindromic substrings: Σ ⌈d[i]/2⌉ over the transformed string (or separate odd/even arrays).

## When to use it

Expand-around-centre (O(n²)) is the interview default for n ≤ 1000–5000 (LC 5, 647). Manacher is the expected follow-up answer to "can you do better?". Writing it correctly under pressure is rare; explaining the mirror idea is enough in most rounds.

## Related structures

The **eertree** (palindromic tree) stores all distinct palindromic substrings in O(n) and supports counting occurrences: name-level.
`,
    doubts: [
      ["Why insert separators?", "Even-length palindromes have no centre character. Separators give every palindrome a centre in the transformed string, so one loop handles both cases."],
      ["Why is the mirror's radius a lower bound?", "Inside the big palindrome [l, r], the string is symmetric, so whatever palindrome surrounds the mirror j also surrounds i, as long as it stays inside [l, r]. Beyond r nothing is known, hence the cap r − i."],
    ],
    revise: md`
? Manacher complexity? :: O(n).
? Separator trick? :: Unifies odd and even palindromes.
? Mirror bound? :: d[i] ≥ min(d[mirror], r − i).
? Interview default? :: Expand around centres O(n²); Manacher as the follow-up.
`,
    pitfalls: ["Index mapping back from the transformed string", "Forgetting to update the rightmost palindrome"],
    quiz: [Q("Manacher's algorithm runs in…", ["O(n²)", "O(n log n)", "*O(n)", "O(n√n)"], "The right boundary only advances.")],
    sources: [S.article("Manacher's algorithm: finding all sub-palindromes in O(N)", "cp-algorithms", "https://cp-algorithms.com/string/manacher.html"), S.paper("A new linear-time 'on-line' algorithm for finding the smallest initial palindrome of a string (Manacher, 1975)", "Journal of the ACM", "https://doi.org/10.1145/321892.321896")],
    problems: [5, 647, 214, 1960],
  },
  "suffix-structures": {
    blurb: "Suffix arrays with LCP, suffix automata and Aho–Corasick: the heavy machinery for distinct substrings, longest repeats and multi-pattern matching, and how to talk about them in interviews.",
    signals: ["Many queries about all substrings", "Longest repeated or common substring", "Search for many patterns at once"],
    lesson: md`
## Suffix array + LCP

The suffix array lists suffix start indices in sorted order. Building it: O(n log n) by prefix doubling (sort by first 2ᵏ characters using ranks), O(n) with SA-IS. The **LCP array** (Kasai, O(n)) gives the longest common prefix of adjacent suffixes.

Applications:
- **Longest repeated substring** = max LCP (LC 1044 alternative).
- **Number of distinct substrings** = n(n + 1)/2 − Σ LCP.
- **Longest common substring** of two strings: suffix array of a + '#' + b; max LCP between suffixes from different strings.
- **Substring search**: binary search on the suffix array, O(m log n).

## Suffix automaton

The smallest automaton recognising all substrings: O(n) states and transitions, built online in O(n). Answers distinct substring counts, occurrence counts and longest common substring of many strings. Elegant but long to code.

## Suffix trees

A compressed trie of all suffixes (Ukkonen's algorithm, O(n)). Conceptually the root of these ideas; suffix arrays are the practical replacement.

## Aho–Corasick

A trie of all patterns plus failure links (KMP generalised to a trie). Scans text once and reports every occurrence of every pattern: O(n + total pattern length + matches). Used by grep -F, antivirus signature scanning and intrusion detection. Stream of Characters (LC 1032) is a natural fit.

## Burrows–Wheeler and FM-index (name-level)

BWT (used by bzip2) and the FM-index (used by DNA aligners like Bowtie and BWA) compress text while supporting substring search, built on suffix arrays.

## Interview stance

Rarely coded in a 45-minute round. Recognise when a problem needs them, state complexity, and offer the simpler alternative actually implemented (hashing + binary search, KMP, trie).
`,
    doubts: [
      ["Why is the number of distinct substrings n(n+1)/2 − ΣLCP?", "Each suffix contributes its prefixes as substrings; prefixes shared with the previous suffix in sorted order (exactly LCP of them) were already counted."],
      ["When is Aho–Corasick better than running KMP per pattern?", "With many patterns, KMP per pattern costs O(k·n). Aho–Corasick scans the text once for all patterns: O(n + Σ|pattern| + occurrences)."],
    ],
    revise: md`
? Suffix array build costs? :: O(n log n) prefix doubling; O(n) SA-IS.
? LCP array algorithm? :: Kasai, O(n).
? Distinct substrings? :: n(n+1)/2 − Σ LCP.
? Longest repeated substring? :: Maximum LCP.
? Multi-pattern search? :: Aho–Corasick (trie + failure links).
? Suffix automaton size? :: O(n) states.
`,
    pitfalls: ["Implementing these when hashing suffices", "Separator characters colliding with input characters"],
    quiz: [Q("Searching 1,000 patterns in one long text at once:", ["KMP per pattern", "*Aho–Corasick", "Manacher", "Z per pattern"], "One pass for all patterns.")],
    sources: [S.article("Suffix array", "cp-algorithms", "https://cp-algorithms.com/string/suffix-array.html"), S.article("Suffix automaton", "cp-algorithms", "https://cp-algorithms.com/string/suffix-automaton.html"), S.article("Aho–Corasick algorithm", "cp-algorithms", "https://cp-algorithms.com/string/aho_corasick.html"), S.paper("Efficient string matching: an aid to bibliographic search (Aho & Corasick, 1975)", "Communications of the ACM", "https://doi.org/10.1145/360825.360855")],
    problems: [1044, 1698, 1032, 1923, 3213],
  },

  // ─────────────── range queries ───────────────
  "sparse-table": {
    blurb: "Precompute minimums over power-of-two lengths and answer range-minimum queries in O(1) with two overlapping blocks. Static data only.",
    signals: ["Many range min/max/gcd queries on a static array", "LCA via Euler tour + RMQ", "O(1) query time required"],
    lesson: md`
## Construction

st[k][i] = min of a[i .. i + 2ᵏ − 1]. st[0] = a; st[k][i] = min(st[k − 1][i], st[k − 1][i + 2^(k − 1)]). O(n log n) time and space.

## O(1) query for idempotent operations

For [l, r], let k = ⌊log₂(r − l + 1)⌋. The answer is min(st[k][l], st[k][r − 2ᵏ + 1]): two blocks of length 2ᵏ that cover the range, possibly overlapping. Overlap is fine because min(x, x) = x (**idempotent**). Works for min, max, gcd, AND, OR, not for sum.

For sums, use the same table with O(log n) disjoint blocks, or simply prefix sums.

## When to use it

- Static array, many queries, O(1) per query: sparse table.
- Updates required: segment tree or Fenwick tree.
- One-off queries: a linear scan.

## LCA via RMQ

An Euler tour of a tree (2n − 1 entries of depths) turns LCA(u, v) into the minimum depth between their first occurrences: O(1) LCA after O(n log n) preprocessing.

## Disjoint sparse table (name-level)

Answers any associative operation (including sums and products) in O(1) with O(n log n) preprocessing.
`,
    doubts: [
      ["Why can the two blocks overlap for min but not for sum?", "Counting an element twice does not change a minimum (idempotence) but does change a sum."],
      ["How do I compute ⌊log₂ len⌋ quickly?", "Precompute a log table (log[1] = 0, log[i] = log[i / 2] + 1), or use bit-length / count-leading-zeros instructions."],
    ],
    revise: md`
? Sparse table recurrence? :: st[k][i] = min(st[k−1][i], st[k−1][i + 2^(k−1)]).
? Query? :: k = ⌊log₂ len⌋; min(st[k][l], st[k][r − 2^k + 1]).
? Which operations? :: Idempotent ones: min, max, gcd, AND, OR.
? Build cost? :: O(n log n) time and space.
? Updates? :: Not supported: use a segment tree.
`,
    pitfalls: ["Using it for sums with overlapping blocks", "Using it with updates"],
    quiz: [Q("A sparse table answers range sum in O(1) with overlapping blocks?", ["Yes", "*No: sum is not idempotent", "Only for positive numbers", "Only if n is a power of two"], "Use prefix sums for sums.")],
    sources: [S.article("Sparse table", "cp-algorithms", "https://cp-algorithms.com/data_structures/sparse-table.html"), S.article("Range minimum query", "Wikipedia", "https://en.wikipedia.org/wiki/Range_minimum_query")],
    problems: [239, 1438, 2104],
  },
  fenwick: {
    blurb: "A binary indexed tree: prefix sums with point updates in O(log n) using the lowest set bit, in about ten lines. Inversion counts, counting smaller elements and range-update variants.",
    signals: ["Prefix sums with frequent point updates", "Count elements smaller than x seen so far", "Inversions, rank queries, order statistics on values"],
    widgets: ["fenwick"],
    lesson: md`
## Structure

tree[i] (1-indexed) stores the sum of the range (i − lowbit(i), i], where lowbit(i) = i & (−i).

\`\`\`
def update(i, delta):          # a[i] += delta
    while i <= n: tree[i] += delta; i += i & -i
def query(i):                  # sum of a[1..i]
    s = 0
    while i > 0: s += tree[i]; i -= i & -i
    return s
\`\`\`

Both O(log n). Range sum [l, r] = query(r) − query(l − 1). Build in O(n) by adding each tree[i] into its parent i + lowbit(i).

[[widget:fenwick]]

## Counting with a Fenwick tree over values

Compress values to 1..k. Scanning left to right, query(v − 1) counts earlier elements smaller than v; then update(v, 1).

- **Count of Smaller Numbers After Self** (LC 315): scan from the right.
- **Reverse Pairs** (LC 493), **count inversions**: O(n log n). (Merge sort counting is the alternative.)
- **Create Sorted Array through Instructions** (LC 1649).
- **Range Sum Query - Mutable** (LC 307).

## Variants

- **Range update, point query**: store a difference array in the tree.
- **Range update, range query**: two Fenwick trees (B1 and B2) with the classic formula.
- **2D Fenwick**: O(log² n) per operation (LC 308).
- **k-th smallest (order statistic)**: binary lifting over the tree in O(log n).

## Fenwick vs segment tree

Fenwick: shorter, faster, less memory, but only invertible operations (sum, XOR) for range queries, and no lazy propagation. Segment tree: any associative operation, range updates with lazy propagation, more code.
`,
    doubts: [
      ["Why does i += i & −i move to the next responsible node?", "Adding the lowest set bit carries into the next higher bit, landing on the smallest index whose range (i − lowbit, i] contains the current position. All those nodes must include the update."],
      ["Why 1-indexed?", "lowbit(0) = 0, so index 0 would loop forever. Shifting to 1-based avoids it."],
      ["Can Fenwick do range minimum?", "Not with arbitrary updates, because min has no inverse (you cannot subtract an old value). Use a segment tree."],
    ],
    revise: md`
? tree[i] covers? :: (i − lowbit(i), i], lowbit = i & −i.
? update loop? :: i += i & −i.
? query loop? :: i −= i & −i.
? Range sum? :: query(r) − query(l − 1).
? Count smaller after self? :: Fenwick over compressed values, scan from the right.
? Range update + range query? :: Two Fenwick trees.
? Fenwick limitation? :: Needs invertible operations; no lazy range assignments.
`,
    pitfalls: ["0-indexed Fenwick loops", "Forgetting coordinate compression for large values", "Using it for min/max with updates"],
    quiz: [Q("lowbit(12) =", ["1", "2", "*4", "8"], "1100 → 0100.")],
    sources: [S.paper("A new data structure for cumulative frequency tables (Fenwick, 1994)", "Software: Practice and Experience", "https://doi.org/10.1002/spe.4380240306"), S.article("Fenwick tree", "cp-algorithms", "https://cp-algorithms.com/data_structures/fenwick.html")],
    problems: [307, 315, 493, 1649, 308, 2179],
  },
  "segment-tree": {
    blurb: "A tree over array ranges supporting range queries and point updates in O(log n) for any associative operation, with the recursive and iterative implementations and how to design node merges.",
    signals: ["Range queries (sum, min, max, gcd, custom) with updates", "Queries that need a merge of two halves (max subarray, count of distinct runs)", "Coordinate-compressed ranges over events"],
    widgets: ["segment-tree"],
    lesson: md`
## Structure

Node v covers [l, r]; children cover [l, m] and [m + 1, r]. Leaves are single elements. An array of size 4n is always enough for the recursive layout; the bottom-up (iterative) version needs exactly 2n.

## Operations

- **build**: O(n).
- **point update**: change a leaf, recompute ancestors: O(log n).
- **range query** [ql, qr]: if a node's range is inside the query, return its value; if disjoint, return the identity; otherwise combine both children. Visits O(log n) nodes (at most two partial nodes per level).

[[widget:segment-tree]]

## Designing the node

The node stores whatever lets you **merge two children** in O(1):
- sum, min, max, gcd: trivial.
- count of the minimum: (min, count).
- **maximum subarray sum with updates**: (total, best prefix, best suffix, best). merge: total = L.total + R.total; prefix = max(L.prefix, L.total + R.prefix); suffix = max(R.suffix, R.total + L.suffix); best = max(L.best, R.best, L.suffix + R.prefix).
- longest run of equal values, number of inversions in small value ranges, etc.

If you can write merge, you can segment-tree it.

## Iterative (bottom-up) segment tree

Leaves at positions n..2n − 1, node i has children 2i and 2i + 1. Query [l, r) by moving l and r up and taking boundary nodes. Short and fast; good for sums/mins without lazy updates.

## Problems

- **Range Sum Query - Mutable** (LC 307), **Count of Range Sum** (LC 327, with prefix sums and compressed values), **Falling Squares** (LC 699), **Longest Increasing Subsequence II** (LC 2407: dp with a max segment tree over values), **Booking concert tickets** (LC 2286).

## Variants to name

Lazy propagation (range updates), dynamic / sparse segment trees (allocate nodes on demand for huge ranges), persistent segment trees (versions), merge-sort trees (sorted lists in nodes), segment tree beats.
`,
    doubts: [
      ["Why 4n space?", "With n not a power of two, the recursive tree's heap indices can reach just under 4n. 4n is a safe bound without computing the exact size."],
      ["Why does a range query visit only O(log n) nodes?", "At each depth at most two nodes partially overlap the query (the ones containing ql and qr); all others are either fully inside (returned immediately) or disjoint. So the work is a constant times the height."],
      ["Fenwick or segment tree?", "Fenwick for prefix-invertible operations with point updates (sums). Segment tree for min/max, custom merges, or range updates."],
    ],
    revise: md`
? Segment tree costs? :: Build O(n); query and point update O(log n).
? Array size (recursive)? :: 4n.
? Partial overlap rule? :: Recurse into both children and merge.
? Max subarray node fields? :: total, best prefix, best suffix, best.
? Iterative layout? :: Leaves at n..2n−1; children 2i, 2i+1.
? Huge coordinate range? :: Compress, or a dynamic segment tree.
`,
    pitfalls: ["Wrong identity for disjoint nodes (0 for min is wrong)", "Off-by-one in [l, r] vs [l, r)", "2n array for a recursive tree"],
    quiz: [Q("Identity value for a range-minimum segment tree's disjoint nodes?", ["0", "−∞", "*+∞", "1"], "min(x, +∞) = x.")],
    sources: [S.article("Segment tree", "cp-algorithms", "https://cp-algorithms.com/data_structures/segment_tree.html"), S.article("Efficient and easy segment trees (bottom-up)", "Codeforces blog (Al.Cash)", "https://codeforces.com/blog/entry/18051")],
    problems: [307, 327, 699, 2407, 2286, 732],
  },
  "lazy-propagation": {
    blurb: "Range updates in O(log n): store pending updates on nodes and push them to children only when needed. Range add, range assign, and composing tags correctly.",
    signals: ["Add v to every element in [l, r] and query sums or minimums", "Assign a value to a range", "Many overlapping range updates interleaved with queries"],
    lesson: md`
## The idea

A range update that fully covers a node updates the node's value and records a **tag** ("add 5 to everything below") without visiting children. Before descending into a node (for a query or a partial update), **push** its tag to the children. Each operation stays O(log n).

## Range add + range sum

Node value += v × (length of node range); tag += v. Push: apply the tag to both children (value += tag × child length, child tag += tag), clear the node's tag.

## Range assign + range min

Tag = "assigned value or none". Push sets children's values and tags; assignment overrides any earlier add.

## Composing tags

With both add and assign, define the tag as (assign or none, add) and apply in a fixed order: assign resets pending adds; an add after an assign adds to the assigned value. Getting composition right is the core difficulty.

## Problems

- **Range Module** (LC 715): range assign 0/1 and range query "all ones".
- **My Calendar III** (LC 732): range add + global max (dynamic segment tree over [0, 10⁹]).
- **Falling Squares** (LC 699): range max + range assign.
- **Count Integers in Intervals** (LC 2276): dynamic segment tree with assign.
- **Handling Sum Queries After Update** (LC 2569): range flip with counts.

## Dynamic (implicit) segment trees

For coordinates up to 10⁹ without compression, create child nodes only when an update or query reaches them. O(q log C) nodes.
`,
    doubts: [
      ["When must I push a tag?", "Whenever you are about to look at a node's children: before recursing for a partial-overlap query or update. Fully covered nodes do not need it; their value already reflects the tag."],
      ["Why does assign cancel pending adds?", "Assigning a value replaces whatever was there, including the effect of earlier pending additions, so those additions must be discarded rather than applied later."],
    ],
    revise: md`
? Lazy tag meaning? :: A pending update for the node's whole range, not yet applied to children.
? When to push? :: Before descending into children.
? Range add on a sum node? :: value += v × length; tag += v.
? Assign + add composition? :: Assign clears pending adds; later adds stack on the assigned value.
? Huge coordinates without compression? :: Dynamic segment tree.
`,
    pitfalls: ["Forgetting to push before partial recursion", "Multiplying by the wrong length", "Incorrect tag composition"],
    quiz: [Q("Range add of 3 on a node covering 5 elements changes its sum by…", ["3", "*15", "8", "5"], "3 × 5.")],
    sources: [S.article("Segment tree", "Wikipedia", "https://en.wikipedia.org/wiki/Segment_tree"), S.article("Segment tree: range updates (lazy propagation)", "cp-algorithms", "https://cp-algorithms.com/data_structures/segment_tree.html#range-updates-lazy-propagation")],
    problems: [715, 732, 699, 2276, 2569],
  },
  "sqrt-mo": {
    blurb: "Split the array into √n blocks for O(√n) updates and queries, and Mo's algorithm for offline range queries by sorting them cleverly.",
    signals: ["Range queries where merging halves is hard but adding/removing one element is easy", "Offline queries about distinct counts or frequencies in ranges", "A simpler alternative to segment trees"],
    lesson: md`
## Square-root decomposition

Split n elements into blocks of size B ≈ √n, storing an aggregate per block. A range query combines whole blocks (O(n/B)) and partial blocks element by element (O(B)): O(√n). Point update: O(1) (recompute one block's aggregate, O(B) if it is not invertible). Simple and flexible.

## Mo's algorithm

Answer q offline range queries when you can **add or remove one element** from the current window in O(1) (e.g. number of distinct values, count of pairs with equal values):

1. Sort queries by (block of l, then r), alternating r's direction per block for speed.
2. Move the current window [curL, curR] to each query, adding and removing elements one at a time.

Total pointer movement: O((n + q)√n). Example: distinct elements in ranges, frequency-based queries. Mo's with updates (adding a time dimension) is O(n^(5/3)).

## When to use

When a segment tree's merge is awkward but incremental add/remove is easy, and queries can be answered offline. In interviews, name it as the alternative to complicated tree structures.
`,
    doubts: [
      ["Why is square-root decomposition worth knowing if segment trees exist?", "It is shorter to write, handles operations whose merge is awkward, and its block idea extends to problems like \"rebuild every √q operations\". With n = 10⁵, √n ≈ 316, so O(q√n) is often fast enough."],
      ["Why sort Mo's queries by l's block and then r?", "Within a block, l moves at most B per query and r moves monotonically (n per block), so total movement is O(q·B + (n/B)·n). Choosing B = √n balances it to O((n + q)√n)."],
    ],
    revise: md`
? Sqrt decomposition query cost? :: O(√n): whole blocks plus partial edges.
? Mo's requirement? :: O(1) add/remove of one element; offline queries.
? Mo's sort? :: By block of l, then r (alternating).
? Mo's complexity? :: O((n + q)√n).
`,
    pitfalls: ["Using Mo's when queries must be answered online", "Block size far from √n"],
    quiz: [Q("Mo's algorithm needs queries to be…", ["online", "*offline (reorderable)", "sorted by length", "non-overlapping"], "It reorders queries to minimise pointer moves.")],
    sources: [S.article("Square root decomposition and Mo's algorithm", "USACO Guide", "https://usaco.guide/plat/sqrt"), S.article("Sqrt decomposition (and Mo's algorithm)", "cp-algorithms", "https://cp-algorithms.com/data_structures/sqrt_decomposition.html")],
    problems: [307, 2213],
  },

  // ─────────────── data-structure design ───────────────
  "lru-lfu": {
    blurb: "LRU: hash map + doubly linked list for O(1) get and put. LFU: frequency buckets with a minimum-frequency pointer. The most asked design-a-data-structure questions.",
    signals: ["\"Design a cache with capacity\" and an eviction policy", "O(1) get and put", "Evict least recently or least frequently used"],
    lesson: md`
## LRU Cache (LC 146)

- **Hash map**: key → node, for O(1) lookup.
- **Doubly linked list** ordered by recency, with sentinel head (most recent) and tail (least recent).

get(key): if present, move the node to the front and return its value. put(key, value): update and move to front if present; otherwise insert at the front, and if over capacity remove the node before the tail and delete its key from the map. All O(1).

Shortcuts: Java \`LinkedHashMap(capacity, 0.75f, true)\` with \`removeEldestEntry\`; Python \`OrderedDict\` with move_to_end and popitem(last=False). Interviewers often ask you to implement the list yourself after mentioning these.

## LFU Cache (LC 460)

Evict the least frequently used key, breaking ties by least recent.

- key → (value, freq);
- freq → ordered set of keys (a linked list or an OrderedDict), recency within the frequency;
- minFreq.

get: increase freq (move the key from bucket f to f + 1; if bucket f becomes empty and f == minFreq, minFreq++). put new key: if full, evict the least recent key in bucket minFreq; insert with freq 1 and set minFreq = 1. All O(1).

## Concurrency and production notes

- A single global lock makes the cache correct but contended; production caches shard by key or use lock-free approximations.
- Exact LRU is expensive at scale; Redis samples a few keys and evicts the oldest (approximated LRU), and has an LFU mode using a probabilistic Morris counter.
- **TTL** (expiry) adds a timestamp per entry and lazy or active expiration.
- Caffeine (Java) uses W-TinyLFU: a frequency sketch admission filter in front of an LRU window.

These are perfect bridges into system design follow-ups.
`,
    doubts: [
      ["Why a doubly linked list and not a singly linked one?", "Removing a node from the middle in O(1) needs its predecessor. The doubly linked list gives prev directly; with a singly linked list you would need an O(n) search."],
      ["Why sentinel head and tail?", "They remove all null checks when inserting at the front or removing the last node: every real node always has both neighbours."],
      ["How does LFU keep minFreq correct after eviction?", "A new key always has frequency 1, so after inserting it minFreq = 1. minFreq only increases on access when the old minimum bucket empties, by exactly one step."],
    ],
    revise: md`
? LRU structures? :: Hash map key → node + doubly linked list by recency.
? LRU eviction? :: Remove the node before the tail sentinel; delete its key.
? LFU structures? :: key → (value, freq); freq → recency-ordered keys; minFreq.
? LFU new key sets minFreq to? :: 1.
? Library shortcuts? :: LinkedHashMap (access order) / OrderedDict.
? Production LRU at scale? :: Approximations (sampling, W-TinyLFU), sharded locks.
`,
    pitfalls: ["Forgetting to delete the evicted key from the map", "Updating value without moving to front", "LFU: not handling minFreq when a bucket empties"],
    quiz: [Q("LRU with capacity 2: put(1), put(2), get(1), put(3). Which key is evicted?", ["1", "*2", "3", "none"], "1 was used more recently than 2.")],
    template: `class LRUCache {
  struct Node { int k, v; Node *prev, *next; };
  int cap; unordered_map<int, Node*> m; Node head{0,0,nullptr,nullptr}, tail{0,0,nullptr,nullptr};
  void unlink(Node* n) { n->prev->next = n->next; n->next->prev = n->prev; }
  void front(Node* n) { n->next = head.next; n->prev = &head; head.next->prev = n; head.next = n; }
public:
  LRUCache(int c): cap(c) { head.next = &tail; tail.prev = &head; }
  int get(int k) { auto it = m.find(k); if (it == m.end()) return -1; unlink(it->second); front(it->second); return it->second->v; }
  void put(int k, int v) {
    if (auto it = m.find(k); it != m.end()) { it->second->v = v; unlink(it->second); front(it->second); return; }
    if ((int)m.size() == cap) { Node* lru = tail.prev; unlink(lru); m.erase(lru->k); delete lru; }
    Node* n = new Node{k, v, nullptr, nullptr}; front(n); m[k] = n;
  }
};`,
    sources: [S.article("Cache replacement policies", "Wikipedia", "https://en.wikipedia.org/wiki/Cache_replacement_policies"), S.article("Redis key eviction (approximated LRU and LFU)", "Redis documentation", "https://redis.io/docs/latest/develop/reference/eviction/"), S.paper("TinyLFU: a highly efficient cache admission policy (Einziger, Friedman, Manes)", "ACM Transactions on Storage", "https://doi.org/10.1145/3149371")],
    problems: [146, 460, 1797, 2034],
  },
  iterators: {
    blurb: "Lazy iteration with hasNext/next: flatten nested lists, peeking iterators, zigzag over several sources, and iterators over trees, all with O(1) amortised steps and small memory.",
    signals: ["\"Design an iterator\" over a nested or composite structure", "Stream values lazily without materialising everything", "Peek without consuming"],
    lesson: md`
## Principles

- **Lazy**: compute the next element only when asked, keeping memory proportional to depth or number of sources, not total size.
- **hasNext does the work**: advance to the next real element in hasNext (idempotently), so next just returns it. This handles empty sub-collections cleanly.

## Patterns

- **Flatten Nested List Iterator** (LC 341): a stack of iterators (or of (list, index) pairs). hasNext pops exhausted iterators and descends into lists until an integer is on top.
- **Peeking Iterator** (LC 284): cache the next element.
- **Zigzag Iterator** (LC 281): a queue of iterators; take one element from the front iterator and requeue it if not exhausted (generalises to k sources).
- **BST Iterator** (LC 173): stack of the left spine: amortised O(1), O(h) memory.
- **Flatten 2D Vector** (LC 251): two indices, skipping empty rows in hasNext.
- **Range iterators with step**, **RLE Iterator** (LC 900): keep the current run and remaining count.

## Generators

Python generators (yield) and C# iterators express these naturally; recursion with \`yield from\` flattens nested lists in a few lines, though a deep nesting can hit recursion limits.

## Interview talking points

Ask whether the underlying data may change during iteration (fail-fast iterators throw ConcurrentModificationException in Java), whether remove() is required, and what happens if next is called without hasNext.
`,
    doubts: [
      ["Why advance in hasNext instead of next?", "next may be called after a sequence of empty sub-lists; doing the skipping in hasNext ensures it always knows whether a real element exists. next can then simply return it."],
      ["Flatten eagerly into a list instead?", "Correct, simpler, but O(total) memory and time up front. Interviewers usually want the lazy version; mention both."],
    ],
    revise: md`
? Where should skipping happen? :: In hasNext (idempotent).
? Nested list iterator structure? :: Stack of (list, index) or of iterators.
? Peeking iterator? :: Cache the next element.
? Zigzag over k sources? :: Queue of iterators, requeue if not exhausted.
? BST iterator memory? :: O(h).
`,
    pitfalls: ["Calling next on an exhausted iterator", "Eager flattening when laziness is asked", "Non-idempotent hasNext"],
    quiz: [Q("Flatten [[1,[4,[6]]]] yields…", ["[1,4]", "*[1,4,6]", "[[1],[4],[6]]", "[6,4,1]"], "Depth-first order.")],
    sources: [S.article("Iterator pattern", "Wikipedia", "https://en.wikipedia.org/wiki/Iterator_pattern"), S.article("Generators (PEP 255)", "Python", "https://peps.python.org/pep-0255/")],
    problems: [341, 284, 281, 173, 251, 900],
  },
  "time-versioned": {
    blurb: "Key-value stores with timestamps and snapshots: binary search over per-key histories, snapshot arrays that store only changes, and stock-price style correction streams.",
    signals: ["get(key, timestamp) returning the value at or before a time", "Take snapshots and read old versions cheaply", "Updates that may correct earlier data points"],
    lesson: md`
## Time-Based Key-Value Store (LC 981)

For each key keep a list of (timestamp, value) appended in increasing time. get(key, t): binary search the last timestamp ≤ t. set O(1), get O(log n). If timestamps can arrive out of order, use a TreeMap per key (floorEntry).

## Snapshot Array (LC 1146)

Copying the whole array on every snapshot is O(n) per snapshot. Instead, each index keeps a list of (snap_id, value) recording only changes. get(index, snap) binary searches the last change ≤ snap. Memory proportional to the number of sets.

## Stock Price Fluctuation (LC 2034)

Timestamps may be corrected. Keep a map time → price, the latest time, and two heaps (min and max) of (price, time) with lazy deletion: when the top's price no longer matches the map, pop it.

## Versioned and persistent structures

- **Persistent data structures** keep every version: path copying in trees (O(log n) new nodes per update) and persistent segment trees answer "k-th smallest in range" and versioned queries.
- **Multi-version concurrency control (MVCC)** in databases (PostgreSQL, InnoDB) stores row versions so readers see a consistent snapshot without blocking writers: the systems version of the same idea.

## Design discussion points

Memory growth (compaction of old versions), out-of-order writes, concurrent readers and writers, and how the design changes when data does not fit in memory (log-structured storage).
`,
    doubts: [
      ["Why does Snapshot Array store per-index change lists?", "Most indices do not change between snapshots. Recording only changes makes snapshot O(1) and keeps memory proportional to the number of set operations."],
      ["How do I handle out-of-order timestamps?", "Use an ordered map per key (TreeMap.floorEntry, or bisect.insort for moderate sizes) instead of appending to a list."],
    ],
    revise: md`
? Time-based get? :: Binary search the last timestamp ≤ t in the key's list.
? Snapshot Array idea? :: Per-index (snap_id, value) change lists + binary search.
? Price corrections with max/min? :: Map of time → price + two heaps with lazy deletion.
? Systems analogue? :: MVCC in databases.
`,
    pitfalls: ["Copying the whole array per snapshot", "Off-by-one in 'at or before' binary search"],
    quiz: [Q("TimeMap: set(foo, bar, 1), set(foo, bar2, 4); get(foo, 3) =", ["bar2", "*bar", "''", "error"], "Latest timestamp ≤ 3 is 1.")],
    sources: [S.article("Persistent data structure", "Wikipedia", "https://en.wikipedia.org/wiki/Persistent_data_structure"), S.article("Multiversion concurrency control", "Wikipedia", "https://en.wikipedia.org/wiki/Multiversion_concurrency_control")],
    problems: [981, 1146, 2034, 1912],
  },
  "randomized-set": {
    blurb: "Insert, delete and getRandom in O(1): an array for uniform sampling plus a hash map from value to index, deleting by swapping with the last element.",
    signals: ["O(1) insert, delete and uniform random element", "Duplicates allowed in the random collection"],
    lesson: md`
## RandomizedSet (LC 380)

- **list** of values (uniform random via a random index);
- **map** value → index in the list.

insert: append and record the index. remove(x): look up x's index i, move the last value into position i (update its index in the map), pop the last, delete x from the map. getRandom: random index. All O(1) average.

## With duplicates (LC 381)

Map value → **set of indices**. Removal takes any index of x, swaps the last element into it, and updates that element's index set (remove the old last index, add i). Careful when x is itself the last element.

## Why not just a hash set?

Hash sets do not support uniform random selection in O(1): their buckets have uneven occupancy and empty slots. The array is what makes sampling uniform.

## Related designs

- **Random pick with blacklist** (LC 710): remap blacklisted values in [0, n − b) to whitelisted values in [n − b, n).
- **Shuffle an array**: Fisher–Yates.
- **Weighted random**: prefix sums + binary search.
`,
    doubts: [
      ["Why swap with the last element on removal?", "Removing from the middle of an array is O(n). Moving the last element into the hole keeps the array dense, and order does not matter for a set."],
      ["What if the removed value is the last element itself?", "Then the swap is with itself; update the map before popping, or handle the case explicitly so you do not reinsert a deleted index."],
    ],
    revise: md`
? Structures? :: Array of values + map value → index.
? Remove in O(1)? :: Swap with the last element, update its index, pop.
? Duplicates? :: Map value → set of indices.
? Why not a hash set alone? :: No O(1) uniform sampling.
`,
    pitfalls: ["Not updating the moved element's index", "Removing the last element edge case", "Biased random selection from hash buckets"],
    quiz: [Q("getRandom in RandomizedSet costs…", ["O(log n)", "*O(1)", "O(n)", "O(√n)"], "Random index into the dense array.")],
    sources: [S.article("Dynamic array", "Wikipedia", "https://en.wikipedia.org/wiki/Dynamic_array"), S.article("Hash table", "Wikipedia", "https://en.wikipedia.org/wiki/Hash_table")],
    problems: [380, 381, 710, 384],
  },
  "stream-counters": {
    blurb: "Designs over event streams: hit counters, loggers, moving averages, rate limiters and medians, with queues, circular buckets and the trade-offs systems interviews probe next.",
    signals: ["Count events in the last N seconds", "Allow at most k requests per window", "Running statistics over a stream"],
    lesson: md`
## Hit Counter (LC 362)

- **Queue of timestamps**: push on hit, pop older than t − 300 on query. Memory grows with hits.
- **Circular buckets**: 300 slots indexed by t mod 300, each storing (time, count); overwrite stale slots. O(300) memory regardless of traffic: the scalable answer.

## Logger Rate Limiter (LC 359)

Map message → last printed time; allow if t − last ≥ 10. Memory grows with distinct messages: clean up old entries periodically or keep a queue of recent ones.

## Moving average (LC 346)

Queue plus running sum: O(1) per value.

## Rate limiting algorithms

| Algorithm | Idea | Trade-off |
|---|---|---|
| Fixed window counter | count per window | bursts at window edges (2× limit) |
| Sliding log | timestamps of recent requests | exact, memory-heavy |
| Sliding window counter | weighted mix of current and previous window | approximate, cheap |
| Token bucket | tokens refill at rate r, capacity b | allows bursts up to b |
| Leaky bucket | queue drained at a constant rate | smooths output |

Token bucket is the most common in production (API gateways). In a distributed setting, counters live in Redis with atomic increments or Lua scripts.

## Data stream statistics

- Median: two heaps (see two heaps).
- Distinct counts at scale: HyperLogLog.
- Frequencies at scale: Count-Min sketch; top-k heavy hitters: Misra–Gries or Space-Saving.
- Disjoint intervals from a stream (LC 352): ordered map.
`,
    doubts: [
      ["Why are circular buckets better than a queue for the hit counter?", "Memory and work per query depend only on the window size (300), not on traffic. With millions of hits per second, a queue of timestamps would be huge."],
      ["Why does a fixed window allow double the limit?", "A client can send the full limit at the end of one window and again at the start of the next, so a short interval spanning the boundary sees twice the limit."],
    ],
    revise: md`
? Scalable hit counter? :: Circular buckets of size W indexed by t mod W.
? Logger rate limiter? :: Map message → last printed time.
? Token bucket? :: Tokens refill at rate r up to capacity b; each request takes one.
? Fixed window flaw? :: Boundary bursts up to 2× the limit.
? Distinct count at scale? :: HyperLogLog.
`,
    pitfalls: ["Unbounded memory in queues and maps", "Ignoring concurrency in a rate limiter design"],
    quiz: [Q("Which algorithm allows controlled bursts up to a capacity?", ["Fixed window", "Leaky bucket", "*Token bucket", "Sliding log"], "Tokens accumulate up to b.")],
    sources: [S.article("Token bucket", "Wikipedia", "https://en.wikipedia.org/wiki/Token_bucket"), S.article("Rate limiting strategies and techniques", "Google Cloud Architecture Center", "https://cloud.google.com/architecture/rate-limiting-strategies-techniques"), S.paper("HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm (Flajolet et al., 2007)", "AofA 2007", "https://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf")],
    problems: [362, 359, 346, 933, 352, 295],
  },
  skiplist: {
    blurb: "A probabilistic alternative to balanced trees: layered linked lists with expected O(log n) search, insert and delete. How Redis sorted sets and LevelDB memtables work.",
    signals: ["\"Design a skiplist\" (LC 1206)", "Ordered set with simple concurrent-friendly code", "Discussing Redis ZSET internals"],
    lesson: md`
## Structure

Level 0 is a sorted linked list of all elements. Each element is promoted to the next level with probability p (commonly 1/2 or 1/4), so level i holds about n·pⁱ elements. Search starts at the top level, moves right while the next key is smaller, and drops down a level otherwise.

Expected height O(log n), expected search, insert and delete O(log n), expected space O(n) (n/(1 − p) nodes).

## Operations

- **search(x)**: walk right/down as above.
- **insert(x)**: record the last node visited on each level (the update array), flip coins to choose the new node's height, splice it in on each of those levels.
- **erase(x)**: find the update array, unlink on every level where the node appears.

## Why use it instead of a balanced tree

- Much simpler code (no rotations).
- Range scans are natural (walk level 0).
- **Concurrency**: lock-free skip lists exist (Java's ConcurrentSkipListMap), easier than concurrent balanced trees.
- Used by Redis sorted sets (with a hash map for O(1) score lookup), LevelDB/RocksDB memtables, and Apache Lucene.

## Interview usage

LC 1206 asks you to implement it. More commonly it appears in system design ("how does Redis implement leaderboards?") or as the answer to "an ordered structure that's easy to make concurrent".
`,
    doubts: [
      ["Why is the expected height logarithmic?", "A node reaches level k with probability p^k, so the expected number of nodes at level log_{1/p} n is about 1; beyond that levels are almost surely empty."],
      ["Is the worst case bad?", "Yes, O(n) with tiny probability (all coin flips going badly). Expected bounds hold for every input because the randomness is internal."],
    ],
    revise: md`
? Promotion probability? :: p, typically 1/2 or 1/4.
? Expected search/insert/delete? :: O(log n).
? Expected space? :: n/(1 − p) nodes.
? Search walk? :: Right while next < x, else down.
? Where used? :: Redis sorted sets, LevelDB memtables, ConcurrentSkipListMap.
`,
    pitfalls: ["Forgetting to splice on every level of the update array", "Unbounded max level"],
    quiz: [Q("Java's concurrent ordered map is backed by…", ["red-black tree", "*skip list", "B-tree", "hash table"], "ConcurrentSkipListMap.")],
    sources: [S.paper("Skip lists: a probabilistic alternative to balanced trees (Pugh, 1990)", "Communications of the ACM", "https://doi.org/10.1145/78973.78977"), S.article("Skip list", "Wikipedia", "https://en.wikipedia.org/wiki/Skip_list"), S.article("Redis sorted sets", "Redis documentation", "https://redis.io/docs/latest/develop/data-types/sorted-sets/")],
    problems: [1206],
  },

  // ─────────────── matrix ───────────────
  "matrix-traversal": {
    blurb: "Spiral, diagonal and layer-by-layer traversals, in-place rotation by transpose-and-reverse, and boundary bookkeeping that avoids off-by-one errors.",
    signals: ["Walk a matrix in a non-row-major order", "Rotate or transpose a square matrix in place", "Generate a matrix in spiral order"],
    lesson: md`
## Spiral order (LC 54, 59)

Keep four boundaries top, bottom, left, right. Walk the top row (left → right), top++; right column, right−−; bottom row (if top ≤ bottom), bottom−−; left column (if left ≤ right), left++. The two guards prevent double-visiting the last row or column of a non-square matrix. Alternative: a direction array that turns when the next cell is out of bounds or visited.

## Rotate Image (LC 48)

90° clockwise in place = **transpose** (swap a[i][j] and a[j][i] for j > i), then **reverse each row**. Counter-clockwise = transpose then reverse each column (or reverse rows first). Or rotate layer by layer with four-way swaps.

## Diagonals

- Cells on the same '\\' diagonal share i − j; on the same '/' anti-diagonal share i + j.
- **Diagonal Traverse** (LC 498): iterate s = i + j from 0 to R + C − 2, alternating direction.
- **Sort the Matrix Diagonally** (LC 1329): group by i − j.
- **Toeplitz Matrix** (LC 766): a[i][j] == a[i − 1][j − 1].

## Other traversals

- **Reshape the Matrix** (LC 566): index k → (k / C, k % C).
- **Transpose** of non-square matrices needs a new array.
- **Game of Life** (LC 289) and other simulations: see in-place marking.
`,
    doubts: [
      ["Why does transpose + reverse rows rotate clockwise?", "Transpose maps (i, j) → (j, i); reversing each row maps (j, i) → (j, n − 1 − i). Together (i, j) → (j, n − 1 − i), which is exactly the 90° clockwise rotation."],
      ["Why the extra checks in the spiral loop?", "For a single remaining row or column, the 'bottom row' or 'left column' pass would revisit cells already printed by the 'top row' or 'right column' pass."],
    ],
    revise: md`
? Spiral boundary updates? :: top++, right−−, bottom−−, left++ with guards top ≤ bottom, left ≤ right.
? Rotate 90° clockwise in place? :: Transpose, then reverse each row.
? Same diagonal key? :: i − j; anti-diagonal: i + j.
? Flat index mapping? :: k → (k / C, k % C).
`,
    pitfalls: ["Missing guards in spiral (duplicates)", "Transposing both (i, j) and (j, i) (undoing the swap)", "In-place transpose of non-square matrices"],
    quiz: [Q("Rotating [[1,2],[3,4]] clockwise gives…", ["[[2,4],[1,3]]", "*[[3,1],[4,2]]", "[[4,3],[2,1]]", "[[1,3],[2,4]]"], "Transpose → [[1,3],[2,4]], reverse rows → [[3,1],[4,2]].")],
    sources: [S.article("Rotation matrix", "Wikipedia", "https://en.wikipedia.org/wiki/Rotation_matrix"), S.article("Transpose", "Wikipedia", "https://en.wikipedia.org/wiki/Transpose")],
    problems: [54, 59, 48, 498, 1329, 766, 566],
  },
  "matrix-in-place": {
    blurb: "Mark changes without extra memory: reuse the first row and column as flags (Set Matrix Zeroes), encode old and new states in one cell (Game of Life), and simulate on the grid itself.",
    signals: ["\"In place\" / O(1) extra space on a matrix", "Simultaneous updates where every cell depends on old neighbours", "Simulations (gravity, rotations of boxes)"],
    lesson: md`
## Set Matrix Zeroes (LC 73)

O(R + C) space: row and column flags. **O(1) space**: use the first row and first column as the flags, with two booleans remembering whether the first row and column themselves contained a zero. Mark, then zero the inner cells from the flags, then handle the first row and column last.

## Game of Life (LC 289)

Every cell's next state depends on the old states of its neighbours. Encode transitions in the same cell: 2 = was alive, becomes dead; 3 = was dead, becomes alive (or use the second bit: next state in bit 1, current in bit 0). Count neighbours using the old value (cell & 1), then finalise with a second pass (cell >>= 1).

Follow-ups: an infinite board (store live cells in a set and count neighbours via a map), very large boards (process in chunks, keep three rows in memory).

## Simulation patterns

- **Rotating the Box** (LC 1861): process each row from the right with a "landing position" pointer, then rotate.
- **Candy Crush** (LC 723): mark crushable cells with negative values, then apply gravity per column with a write pointer.
- **Shift 2D Grid** (LC 1260): flatten with modular index arithmetic.

## Principle

When updates must be "simultaneous", either copy the grid (O(R·C) space) or encode both old and new states in each cell so reads still see the old state.
`,
    doubts: [
      ["Why handle the first row and column last in Set Matrix Zeroes?", "They hold the flags for everyone else. Zeroing them early would destroy flags still needed for the inner cells."],
      ["Why does Game of Life need encoded states?", "Updating cells one at a time would let later cells read already-updated neighbours, which is wrong: the rules use the previous generation."],
    ],
    revise: md`
? Set Matrix Zeroes O(1) space? :: First row/column as flags + two booleans; finish them last.
? Game of Life encoding? :: Next state in bit 1, current in bit 0; shift at the end.
? Infinite Game of Life? :: Set of live cells + neighbour counts map.
? Gravity simulation? :: Per column write pointer from the bottom.
`,
    pitfalls: ["Overwriting flags too early", "Reading updated values as old ones"],
    quiz: [Q("In the bit-encoded Game of Life, the current state of a cell is…", ["cell >> 1", "*cell & 1", "cell & 2", "cell"], "Bit 0 holds the old state.")],
    sources: [S.article("In-place algorithm", "Wikipedia", "https://en.wikipedia.org/wiki/In-place_algorithm"), S.article("Conway's Game of Life", "Wikipedia", "https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life")],
    problems: [73, 289, 1861, 723, 1260],
  },
  "matrix-search": {
    blurb: "Searching sorted matrices: flatten for fully sorted, staircase from a corner for row-and-column sorted, and value binary search with counting for k-th smallest.",
    signals: ["Matrix sorted by rows and columns", "Find a target or count elements ≤ x", "k-th smallest in a sorted matrix"],
    lesson: md`
## Fully sorted (LC 74)

Rows continue each other: binary search over index k in [0, R·C) with (k / C, k % C). O(log(RC)).

## Rows and columns sorted (LC 240)

Staircase from the top-right (or bottom-left): too big → move left, too small → move down. O(R + C).

## Count ≤ x in O(R + C)

From the bottom-left: if a[r][c] ≤ x, all cells above in this column are ≤ x, so count += r + 1 and move right; else move up. This powers:

- **Kth Smallest Element in a Sorted Matrix** (LC 378): binary search on the value with the staircase count: O((R + C) log(range)).
- **Count Negative Numbers in a Sorted Matrix** (LC 1351): staircase.
- **Find a Peak Element II** (LC 1901): binary search on rows with the column max.

## Leftmost column with a one (LC 1428)

Rows are sorted 0s then 1s: start at the top-right, move left on 1 and down on 0: O(R + C) API calls.

## When to binary search each row

R ≪ C: binary search every row, O(R log C). Compare with O(R + C) staircase and pick by dimensions.
`,
    doubts: [
      ["Should I binary search each row instead of using the staircase?", "If R ≪ C, binary searching each row costs O(R log C), which beats O(R + C). If R and C are similar, the staircase O(R + C) wins. Mention both and choose by the shape."],
      ["Why does counting from the bottom-left work?", "At (r, c), if the value ≤ x, then every value above it in column c is also ≤ x (columns sorted), contributing r + 1, and the next candidates are to the right. Otherwise, the value and everything to its right in row r are > x, so move up."],
    ],
    revise: md`
? Fully sorted matrix? :: Flattened binary search.
? Rows and columns sorted? :: Staircase from top-right or bottom-left: O(R + C).
? Count ≤ x? :: From bottom-left: add r + 1 and move right, or move up.
? k-th smallest? :: Binary search on value + staircase count.
? R ≪ C? :: Binary search each row: O(R log C).
`,
    pitfalls: ["Starting the staircase at the top-left", "Binary searching the k-th smallest by index instead of value"],
    quiz: [Q("Staircase search complexity in an R × C matrix?", ["O(R·C)", "*O(R + C)", "O(log RC)", "O(R log C)"], "Each step discards a row or column.")],
    sources: [S.article("Binary search", "cp-algorithms", "https://cp-algorithms.com/num_methods/binary_search.html"), S.article("Young tableau (row- and column-sorted matrices)", "Wikipedia", "https://en.wikipedia.org/wiki/Young_tableau")],
    problems: [74, 240, 378, 1351, 1428, 1901],
  },

  // ─────────────── sorting ───────────────
  "comparison-sorts": {
    blurb: "Merge sort, quicksort and heapsort: how they work, their worst cases, stability and memory, and what real libraries (Timsort, introsort, pdqsort) actually do.",
    signals: ["\"Implement a sort\" or analyse one", "Sorting as a preprocessing step (and its cost)", "Questions about stability or worst-case guarantees"],
    widgets: ["quickselect"],
    lesson: md`
## Merge sort

Split in half, sort both, merge. Θ(n log n) always, **stable**, O(n) extra memory (O(1) for linked lists). Natural for external sorting (huge files: sort runs that fit in memory, then k-way merge) and for counting inversions during the merge.

## Quicksort

Pick a pivot, partition into < and >, recurse. Average Θ(n log n) with small constants and in-place partitioning; **worst case Θ(n²)** (sorted input with a first-element pivot). Defences: random pivot or median-of-three; **three-way partitioning** for many duplicates; recurse on the smaller side first for O(log n) stack. Not stable.

## Heapsort

Heapify in O(n), then extract the max n times: Θ(n log n) worst case, O(1) extra memory, not stable, cache-unfriendly (slower in practice than quicksort).

## Simple sorts

Insertion sort is O(n²) but O(n + inversions): very fast for small or nearly sorted arrays, which is why hybrids switch to it below ~16–32 elements. Selection sort does the fewest swaps (n − 1). Bubble sort: teaching only.

## What libraries do

| Language | Algorithm |
|---|---|
| Python sorted / list.sort, Java objects | **Timsort** (merge sort + insertion sort exploiting existing runs; stable; O(n) on sorted input) |
| Java primitives | dual-pivot quicksort |
| C++ std::sort | introsort (quicksort, falls back to heapsort at depth 2 log n, insertion sort for small parts); not stable. std::stable_sort is a merge sort |
| Rust / Go | pdqsort (pattern-defeating quicksort) for unstable sorts |

## Lower bound

Any comparison sort needs Ω(n log n) comparisons in the worst case (a decision tree must distinguish n! orders: log₂ n! ≈ n log₂ n − 1.44n). Beating it requires non-comparison sorts (counting, radix) that use the values' structure.

## Interview usage

Know merge sort and quicksort cold (LC 912 asks you to implement one), the stability and worst-case facts, and that "sort first" costs O(n log n).
`,
    doubts: [
      ["Why is quicksort usually faster than merge sort despite the worse worst case?", "In-place partitioning touches memory sequentially with few writes and no auxiliary array, giving excellent cache behaviour and small constants. Randomisation makes the worst case astronomically unlikely."],
      ["What does stability mean and when does it matter?", "Equal keys keep their original relative order. It matters when sorting by multiple keys in passes (sort by secondary key, then stably by primary) and when records carry other data."],
      ["Why does Timsort get O(n) on sorted data?", "It detects existing ascending (or strictly descending) runs and merges them; a fully sorted array is one run, so no merging is needed."],
    ],
    revise: md`
? Merge sort: time, stable, space? :: Θ(n log n) always; stable; O(n) extra.
? Quicksort worst case and defence? :: Θ(n²); random pivot / median-of-three, 3-way partition.
? Heapsort: time, space, stable? :: Θ(n log n); O(1); not stable.
? Python / Java objects use? :: Timsort (stable).
? C++ std::sort? :: Introsort (not stable).
? Comparison sort lower bound? :: Ω(n log n).
? Insertion sort niche? :: Small or nearly sorted arrays: O(n + inversions).
`,
    pitfalls: ["Claiming quicksort is O(n log n) worst case", "Assuming std::sort is stable", "Forgetting merge sort's O(n) buffer"],
    quiz: [
      Q("Which sort is guaranteed O(n log n) worst case and in place?", ["quicksort", "merge sort", "*heapsort", "insertion sort"], "Merge sort needs O(n) extra memory."),
      Q("Python's sort is…", ["quicksort", "*Timsort (stable)", "heapsort", "radix sort"], "Stable merge-insertion hybrid."),
    ],
    sources: [S.book("Algorithms, 4th ed. §2.2 Mergesort and §2.3 Quicksort", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/22mergesort/"), S.article("Timsort design notes (listsort.txt)", "CPython", "https://github.com/python/cpython/blob/main/Objects/listsort.txt"), S.paper("Pattern-defeating quicksort (Peters, 2021)", "arXiv", "https://arxiv.org/abs/2106.05123"), S.article("Introsort", "Wikipedia", "https://en.wikipedia.org/wiki/Introsort")],
    problems: [912, 148, 75, 315],
  },
  "linear-sorts": {
    blurb: "Beat n log n by not comparing: counting sort for small key ranges, radix sort digit by digit, bucket sort for uniform data, and pigeonhole tricks like Maximum Gap.",
    signals: ["Keys are small integers (ages, scores 0–100, letters)", "Fixed-width keys (32-bit ints, strings of equal length)", "Uniformly distributed reals", "O(n) required"],
    lesson: md`
## Counting sort

Count occurrences of each key in [0, k), compute prefix sums for positions, place elements (iterating from the right for stability). O(n + k) time and space. Ideal when k = O(n).

## Radix sort

Sort by the least significant digit first, using a stable counting sort per digit; after d passes the array is sorted. O(d · (n + b)) for base b. 32-bit integers with base 2¹⁶: two passes. Used for sorting large arrays of integers, suffix array construction, and on GPUs.

## Bucket sort

Distribute values into n buckets by range, sort each bucket (insertion sort), concatenate. Expected O(n) for uniformly distributed input; degrades if data clusters.

## Problems

- **Sort Colors** (3 values): counting or Dutch flag.
- **Top K Frequent Elements**: bucket by frequency (frequencies ≤ n).
- **Maximum Gap** (LC 164, O(n)): pigeonhole: with n numbers between min and max, the maximum gap is at least (max − min)/(n − 1), so it never occurs inside a bucket of that width; keep only min and max per bucket and compare consecutive non-empty buckets.
- **H-Index** (LC 274): counting sort on citations capped at n.
- **Sort an array of strings of equal length**: LSD radix by character.
- **Relative sort array** (LC 1122): counting with a custom order.

## When not to use them

Large key ranges with few elements (k ≫ n) make counting sort wasteful; floating-point or arbitrary objects need comparisons.
`,
    doubts: [
      ["Why must radix sort use a stable sort per digit?", "After sorting by the lower digits, equal higher digits must preserve that order; a stable pass on the next digit keeps ties ordered by the digits already processed."],
      ["How does Maximum Gap avoid sorting?", "The largest gap is at least the average gap (max − min)/(n − 1). Buckets of that width cannot contain the maximum gap inside them, so only gaps between consecutive buckets (max of one, min of the next) matter."],
    ],
    revise: md`
? Counting sort cost? :: O(n + k).
? Radix sort cost? :: O(d · (n + b)); stable per-digit passes, LSD first.
? Bucket sort expectation? :: O(n) for uniformly distributed data.
? Maximum Gap trick? :: Buckets of width (max − min)/(n − 1); compare adjacent buckets' max/min.
? H-Index in O(n)? :: Counting sort with citations capped at n.
`,
    pitfalls: ["Counting sort with a huge key range", "Non-stable digit passes", "Assuming uniform data for bucket sort"],
    quiz: [Q("Sort a million 32-bit ints with radix base 2¹⁶: number of passes?", ["1", "*2", "4", "32"], "32 bits / 16 bits per pass.")],
    sources: [S.book("Introduction to Algorithms (CLRS), ch. 8: Sorting in Linear Time", "Cormen, Leiserson, Rivest, Stein", "https://mitpressbookstore.mit.edu/book/9780262046305"), S.book("Algorithms, 4th ed. §5.1 String Sorts (LSD/MSD radix)", "Sedgewick & Wayne", "https://algs4.cs.princeton.edu/51radix/")],
    problems: [164, 274, 1122, 912, 347],
  },
  quickselect: {
    blurb: "Find the k-th smallest in expected O(n) by partitioning and recursing on one side only. Median-of-medians guarantees O(n) worst case; introselect combines both.",
    signals: ["k-th largest / smallest without full sorting", "Median of an unsorted array", "Top k in place"],
    widgets: ["quickselect"],
    lesson: md`
## Algorithm

Partition around a pivot (Lomuto or Hoare). If the pivot lands at index k, done; otherwise recurse into the side containing k. Expected work n + n/2 + n/4 + … = O(n) with a random pivot. Worst case O(n²).

[[widget:quickselect]]

## Median of medians (BFPRT, 1973)

Choose the pivot as the median of the medians of groups of 5. It guarantees the pivot splits at least 30/70, so T(n) ≤ T(n/5) + T(7n/10) + O(n) = O(n) worst case. Large constants: practical libraries use **introselect** (quickselect that switches to median of medians or heapsort when progress stalls). C++ \`std::nth_element\` is introselect.

## Uses

- **Kth Largest Element** (LC 215): quickselect for index n − k.
- **K Closest Points to Origin** (LC 973): quickselect on distances, return the first k.
- **Wiggle Sort II** (LC 324): median by quickselect, then three-way partition.
- **Top K Frequent** with quickselect on frequencies.

## Duplicates

Many equal elements break two-way partitioning performance; use a three-way partition and check whether k falls in the equal block.

## Heap vs quickselect

Heap of size k: O(n log k), streaming-friendly, does not modify the input. Quickselect: O(n) average, in place, modifies the array.
`,
    doubts: [
      ["Why is quickselect O(n) on average but quicksort O(n log n)?", "Quicksort recurses into both sides, doing n work per level of the recursion tree. Quickselect recurses into one side whose size shrinks geometrically, so the total is a geometric series."],
      ["Why groups of 5 in median of medians?", "With 5, the recurrence's two parts (n/5 and 7n/10) sum to less than n (0.9n), which makes the total linear. Groups of 3 fail this; 7 also works."],
    ],
    revise: md`
? Quickselect average / worst? :: O(n) / O(n²).
? Median of medians guarantee? :: O(n) worst case with groups of 5.
? C++ library function? :: std::nth_element (introselect).
? Duplicates? :: Three-way partition.
? Heap vs quickselect? :: O(n log k) streaming, non-destructive vs O(n) average in place.
`,
    pitfalls: ["Non-random pivot on sorted input", "Index confusion between k-th largest and k-th smallest"],
    quiz: [Q("Quickselect's expected work with halving partitions is about…", ["n log n", "*2n", "n²", "log n"], "n + n/2 + n/4 + …")],
    sources: [S.paper("Time bounds for selection (Blum, Floyd, Pratt, Rivest, Tarjan, 1973)", "Journal of Computer and System Sciences", "https://doi.org/10.1016/S0022-0000(73)80033-9"), S.article("Quickselect", "Wikipedia", "https://en.wikipedia.org/wiki/Quickselect"), S.article("std::nth_element", "cppreference", "https://en.cppreference.com/w/cpp/algorithm/nth_element")],
    problems: [215, 973, 324, 347],
  },
  "custom-sort": {
    blurb: "Comparators that encode the problem (largest number, custom orders), stability for multi-key sorts, and counting inversions during merge sort.",
    signals: ["Sort by a derived key or a pairwise rule", "Sort by several keys", "Count pairs out of order"],
    lesson: md`
## Comparators

- Key functions are simplest: sort(key=lambda p: (−freq[p], p)).
- Pairwise comparators when the order depends on both items: **Largest Number** (LC 179) sorts by a + b > b + a. Such a comparator must be a **strict weak ordering** (irreflexive, transitive) or library sorts can misbehave (C++ may crash with an invalid comparator).
- In Java avoid (a, b) -> a − b (overflow); use Integer.compare.
- Python 3 removed cmp; wrap with functools.cmp_to_key.

## Multi-key sorting

Sort by a tuple key, or do several **stable** passes from the least significant key to the most significant. **Sort Characters by Frequency**, **Reorder Data in Log Files** (LC 937), **Sort the People**, **Rank Teams by Votes** (LC 1366).

## Counting inversions

An inversion is a pair i < j with a[i] > a[j]. During merge sort's merge, when an element from the right half is taken before elements remaining in the left half, it forms inversions with all of them: add (remaining left count). O(n log n). Alternatives: Fenwick tree over compressed values.

- **Count of Smaller Numbers After Self** (LC 315): merge sort with indices.
- **Reverse Pairs** (LC 493): count pairs with a[i] > 2·a[j] before merging.
- **Count of Range Sum** (LC 327): merge sort on prefix sums.
- Kendall tau distance between rankings = number of inversions.

## Sorting objects by derived orders

- **Custom Sort String** (LC 791): counting by the given order.
- **Sort Array by Increasing Frequency** (LC 1636): (freq, −value).
- **Queue Reconstruction by Height**: sort then insert.
`,
    doubts: [
      ["Why must a comparator be transitive?", "Sorting algorithms assume a consistent order. With a non-transitive comparator (a < b, b < c, c < a) results depend on the algorithm's internal order, and some implementations read out of bounds."],
      ["Why is a + b > b + a transitive for Largest Number?", "It is equivalent to comparing a·10^len(b) + b with b·10^len(a) + a, which reduces to comparing a/(10^len(a) − 1) with b/(10^len(b) − 1): a real-number comparison, hence transitive."],
      ["How exactly does merge sort count inversions?", "When merging sorted halves L and R, if R[j] < L[i], then R[j] is smaller than every remaining element of L (they are sorted), so it forms len(L) − i inversions at once."],
    ],
    revise: md`
? Python custom comparator? :: functools.cmp_to_key.
? Java comparator overflow fix? :: Integer.compare(a, b).
? Multi-key via stability? :: Stable passes from least to most significant key.
? Inversions during merge? :: Taking R[j] before L[i] adds len(L) − i.
? Reverse Pairs? :: Count a[i] > 2a[j] across halves before merging.
`,
    pitfalls: ["Non-transitive comparators", "Subtraction comparators overflowing", "Counting inversions in O(n²)"],
    quiz: [Q("Inversions in [2,4,1,3,5]?", ["2", "*3", "4", "5"], "(2,1), (4,1), (4,3).")],
    sources: [S.article("Sorting HOW TO (key functions, cmp_to_key)", "Python documentation", "https://docs.python.org/3/howto/sorting.html"), S.article("Inversion (discrete mathematics)", "Wikipedia", "https://en.wikipedia.org/wiki/Inversion_(discrete_mathematics)"), S.article("Compare requirement (strict weak ordering)", "cppreference", "https://en.cppreference.com/w/cpp/named_req/Compare")],
    problems: [179, 937, 1366, 315, 493, 327, 791, 1636],
  },

  // ─────────────── stretch ───────────────
  "meet-in-middle": {
    blurb: "Split n ≤ 40 items into two halves, enumerate 2^(n/2) subsets of each, and combine with sorting, hashing or two pointers: 2⁴⁰ becomes about 2·10⁶.",
    signals: ["n between ~25 and ~40 with subset choices", "Subset sum or closest subset sum with large values (DP infeasible)", "Bidirectional search in state spaces"],
    lesson: md`
## Idea

Brute force over 2ⁿ subsets is too slow for n = 40 (10¹²). Enumerate all subset sums of each half (2²⁰ ≈ 10⁶ each), sort one list, and for each sum in the other list binary search (or two-pointer) for the best complement. O(2^(n/2) · n).

## Problems

- **Closest Subsequence Sum** (LC 1755): sums of both halves, sort one, binary search target − a for each a.
- **Partition Array Into Two Arrays to Minimise Sum Difference** (LC 2035): enumerate by count of chosen elements per half; for each count k in the left half, match with count n/2 − k in the right half (sorted), binary search toward total/2.
- **4Sum II** (LC 454): pair sums of A+B in a hash map, look up −(C+D): O(n²) instead of O(n⁴), the same principle.
- **Split Array With Same Average** (LC 805).
- **Bidirectional BFS** is meet in the middle for searches.

## Memory

Two lists of 2^(n/2) values: about 8 MB each for n = 40 with 64-bit sums: fine.
`,
    doubts: [
      ["Why does splitting in half help so much?", "2⁴⁰ ≈ 10¹² is impossible, but 2 × 2²⁰ ≈ 2·10⁶ is easy. The combine step (sorting one side and binary searching the other) costs only a log factor, so the exponent is effectively halved."],
      ["Why not DP over sums?", "Values up to 10⁷–10⁹ make the sum range huge; DP over sums would need too much memory and time. Meet in the middle depends only on n."],
    ],
    revise: md`
? Meet in the middle complexity? :: O(2^(n/2) · n).
? Combination step? :: Sort one half's sums; binary search or two pointers for complements.
? 4Sum II? :: Hash pair sums of two arrays, look up negatives of the other two.
? Partition into two equal-size halves? :: Group half-sums by count chosen.
`,
    pitfalls: ["Applying it when n ≤ 20 (plain bitmask is simpler)", "Memory blow-up storing subsets instead of sums"],
    quiz: [Q("n = 40 subset sums by meet in the middle enumerates about…", ["2⁴⁰", "*2·2²⁰", "40²", "2¹⁰"], "Two halves of 2²⁰.")],
    sources: [S.article("Meet in the middle", "USACO Guide", "https://usaco.guide/gold/meet-in-the-middle"), S.article("Meet-in-the-middle attack (origin of the term)", "Wikipedia", "https://en.wikipedia.org/wiki/Meet-in-the-middle_attack")],
    problems: [1755, 2035, 454, 805],
  },
  "heavy-light": {
    blurb: "Decompose a tree into heavy paths so any root-to-node path crosses O(log n) of them; combine with a segment tree for path queries and updates. Centroid decomposition for distance queries.",
    signals: ["Path sums / max on a tree with updates", "Many queries about distances between tree nodes", "\"Count paths of length k\" in a tree"],
    lesson: md`
## Heavy-light decomposition (HLD)

For each node, the child with the largest subtree is **heavy**; other edges are light. Any root-to-node path crosses at most O(log n) light edges (each light edge at least halves the subtree size), so it consists of O(log n) heavy-path segments. Lay heavy paths contiguously in an array (DFS visiting the heavy child first) and build a segment tree over it. A path query u–v becomes O(log n) segment-tree range queries: O(log² n).

## Centroid decomposition

A centroid is a node whose removal leaves components of size ≤ n/2. Recursively decompose: the centroid tree has depth O(log n). Any path passes through exactly one "highest" centroid, so path-counting problems (number of pairs at distance ≤ k) and nearest-marked-node queries become O(n log n) or O(log² n) per query.

## Euler tour flattening

Simpler: subtree queries map to contiguous ranges [tin, tout] of a DFS order, so a Fenwick or segment tree answers "sum of subtree" with point updates. Use it whenever only subtree (not path) queries are needed.

## Interview stance

These are competitive-programming techniques. Know what problem each solves (path queries with updates; distance/pair counting; subtree queries) and the complexities; implement Euler tour flattening if needed.
`,
    doubts: [
      ["Why does a path cross only O(log n) light edges?", "Moving from a node down a light edge goes to a child whose subtree is at most half the parent's. Halving can happen only log₂ n times."],
      ["When is Euler tour enough?", "When queries are about whole subtrees: subtree = contiguous range in DFS order. Path queries between arbitrary nodes need HLD (or LCA tricks when the operation is invertible)."],
    ],
    revise: md`
? Heavy child? :: Child with the largest subtree.
? Light edges on a path? :: O(log n).
? HLD path query cost? :: O(log² n) with a segment tree.
? Centroid property? :: Removal leaves components ≤ n/2; centroid tree depth O(log n).
? Subtree queries only? :: Euler tour flattening + Fenwick/segment tree.
`,
    pitfalls: ["Using HLD when Euler tour suffices", "Recursion depth in decompositions"],
    quiz: [Q("Subtree sum queries with point updates need…", ["HLD", "*Euler tour + Fenwick tree", "centroid decomposition", "sparse table"], "Subtrees are contiguous in DFS order.")],
    sources: [S.article("Heavy-light decomposition", "cp-algorithms", "https://cp-algorithms.com/graph/hld.html"), S.article("Centroid decomposition", "USACO Guide", "https://usaco.guide/plat/centroid"), S.article("Euler tour technique", "USACO Guide", "https://usaco.guide/gold/tree-euler")],
    problems: [2867, 2421, 1483],
  },
  persistent: {
    blurb: "Keep every version of a structure by copying only the changed path: persistent arrays, stacks and segment trees, and the k-th smallest in a range trick.",
    signals: ["Query any past version", "k-th smallest in a subarray range (offline-free)", "Undo / time travel"],
    lesson: md`
## Path copying

When a tree-shaped structure changes, create new nodes only along the path from the root to the change; all other subtrees are shared with the previous version. Each update costs O(log n) time and space and yields a new root; old roots still describe old versions.

## Persistent segment tree

Build version i by inserting a[i] into version i − 1 (counts over compressed values). Then the counts of values in a[l..r] are version r minus version l − 1, node by node. **k-th smallest in a range**: descend both versions simultaneously, choosing left or right by the difference of left counts. O(log n) per query after O(n log n) construction.

## Simpler persistent structures

- **Persistent stack** = immutable linked list (push creates one node; versions share tails).
- **Persistent array**: a persistent segment tree over indices (O(log n) access), or fat nodes with version lists (binary search on versions).

## Where it appears

Functional languages (Clojure, Scala, Haskell) use persistent vectors and maps (hash array mapped tries) for immutability without copying. Git's object model is a persistent tree (content-addressed, shared subtrees). Databases use copy-on-write B-trees (LMDB, Btrfs).
`,
    doubts: [
      ["Is a persistent structure the same as keeping copies of every version?", "Semantically yes, but copying would cost O(n) per version. Path copying shares all unchanged parts, so each new version costs only O(log n) extra space in a tree-shaped structure."],
      ["How does subtracting versions give counts in a range?", "Version r counts values among a[1..r]; version l − 1 counts values among a[1..l−1]. Their node-wise difference counts values among a[l..r], available at every node without building a new tree."],
    ],
    revise: md`
? Path copying cost per update? :: O(log n) new nodes.
? Persistent segment tree k-th in range? :: Descend versions r and l − 1, compare left counts.
? Persistent stack? :: Immutable linked list sharing tails.
? Real systems? :: Functional collections (HAMT), Git trees, copy-on-write B-trees.
`,
    pitfalls: ["Mutating shared nodes", "Memory: O(n log n) nodes for the segment tree"],
    quiz: [Q("A persistent segment tree update creates how many new nodes?", ["1", "*O(log n)", "O(n)", "O(√n)"], "Only the root-to-leaf path is copied.")],
    sources: [S.paper("Making data structures persistent (Driscoll, Sarnak, Sleator, Tarjan, 1989)", "Journal of Computer and System Sciences", "https://doi.org/10.1016/0022-0000(89)90034-2"), S.article("Persistent segment tree (k-th order statistic in a range)", "cp-algorithms", "https://cp-algorithms.com/data_structures/segment_tree.html#preserving-the-history-of-its-values-persistent-segment-tree")],
    problems: [1146, 2276],
  },
  "randomized-structures": {
    blurb: "Treaps (BST by key, heap by random priority) with split and merge, and splay trees: balanced in expectation or amortised, with simple code for ordered sets with extra operations.",
    signals: ["Ordered set with split/merge, range reversal or k-th element", "Implement a balanced BST quickly", "Self-adjusting structures for skewed access"],
    lesson: md`
## Treap

Each node has a key and a random priority. It is a BST by key and a heap by priority, so its shape equals that of a BST built by inserting keys in random priority order: expected height O(log n).

**Split(t, k)** returns trees with keys < k and ≥ k; **merge(a, b)** joins two treaps where all keys of a < all keys of b. Insert and delete become one split and two merges. With subtree sizes stored, you get k-th element, rank, and with an **implicit key** (position instead of key) a sequence structure supporting insert at position, delete range, and reverse range (with a lazy flag): an "array with O(log n) everything".

## Splay tree

After each access, rotate the node to the root (zig, zig-zig, zig-zag). Amortised O(log n) per operation, with excellent behaviour for skewed or repeated accesses (recently used items are near the root). Used in some caches and in the classic analysis of self-adjusting structures.

## Cartesian trees

The deterministic version of the treap idea: build from an array with values as priorities in O(n) using a monotonic stack; RMQ reduces to LCA on it.

## Interview stance

Implementing a treap is feasible in an hour, not in 20 minutes. Know what they enable and why they are balanced; in C++/Java use std::set or TreeMap, and mention policy-based trees (GNU pb_ds order statistics tree) for rank queries.
`,
    doubts: [
      ["Why is a treap balanced in expectation?", "Its shape equals a BST built by inserting keys in order of their random priorities, i.e. a random insertion order, whose expected height is O(log n) regardless of the actual key order."],
      ["What does an implicit treap buy?", "Using subtree sizes as implicit keys, the treap represents a sequence; split by position and merge give O(log n) insertions, deletions, concatenations and (with lazy flags) reversals anywhere in the sequence."],
    ],
    revise: md`
? Treap invariants? :: BST by key, heap by random priority.
? Core treap operations? :: Split and merge.
? Implicit treap? :: Positions as keys: sequence edits and reversals in O(log n).
? Splay tree bound? :: Amortised O(log n); recently used near the root.
? Cartesian tree construction? :: O(n) with a monotonic stack.
`,
    pitfalls: ["Forgetting to update subtree sizes after split/merge", "Pushing lazy flags too late"],
    quiz: [Q("A treap is a heap with respect to…", ["keys", "*random priorities", "subtree sizes", "depths"], "And a BST with respect to keys.")],
    sources: [S.paper("Randomized search trees (Seidel & Aragon, 1996)", "Algorithmica", "https://doi.org/10.1007/BF01940876"), S.paper("Self-adjusting binary search trees (Sleator & Tarjan, 1985)", "Journal of the ACM", "https://doi.org/10.1145/3828.3835"), S.article("Treap", "cp-algorithms", "https://cp-algorithms.com/data_structures/treap.html")],
    problems: [1206, 2407],
  },
};
