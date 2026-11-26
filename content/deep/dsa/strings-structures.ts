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
## Strings are arrays with rules

A string is a sequence of characters, and most string problems are array problems with three twists: strings are often **immutable**, characters come from a **small alphabet** (which makes counting arrays cheap), and comparisons cost time proportional to length. Getting these three right avoids most performance bugs and many correctness bugs.

## Immutability and building

In Python, Java, JavaScript, Go and C#, strings are immutable: every "modification" creates a new string. So

\`\`\`python
s = ""
for ch in chars:
    s += ch          # may copy the whole string each time: O(n²) total
\`\`\`

can be quadratic. (CPython sometimes optimises in-place appends when the string has a single reference, but you cannot rely on it, and other runtimes do not.) The idioms:

- Python: collect pieces in a list and "".join(parts) once: O(total length).
- Java: StringBuilder (append is amortised O(1)); string + inside a loop allocates a new string per iteration.
- C++: std::string is mutable; += is amortised O(1) like vector::push_back.

Related costs: **slicing copies** (s[i:j] is O(j − i) in Python and Java's substring since Java 7), so passing slices into recursion multiplies work; pass indices instead. **Equality and hashing** are O(L). **Concatenation of two strings** is O(len1 + len2).

## Character tables

Small alphabets turn hash maps into arrays:

- lowercase letters: int[26] indexed by ord(c) − ord('a');
- ASCII: int[128] (or 256 for extended);
- digits: int[10].

Arrays are faster and simpler than hash maps and make "compare two frequency tables" an O(26) operation. For Unicode or unknown alphabets, use a hash map (Counter in Python).

Bitmasks also work: a 26-bit integer records which letters appear, so "do two words share a letter?" is (mask1 & mask2) != 0 (Maximum Product of Word Lengths, LC 318).

## Classic tasks

- **Valid Anagram** (LC 242): equal 26-count arrays. **Group Anagrams** (LC 49): key = sorted word (O(L log L)) or the count tuple (O(L)).
- **Valid Palindrome** (LC 125): two pointers, skipping non-alphanumeric characters, comparing case-insensitively.
- **Reverse Words in a String** (LC 151): split on whitespace, reverse, join. In place (C++ or a char array): reverse the whole string, then reverse each word, then squeeze extra spaces.
- **Longest Common Prefix** (LC 14): vertical scan (compare position i across all words); or sort and compare only the first and last words, since the common prefix of all is the common prefix of the extremes.
- **String to Integer (atoi)** (LC 8): skip leading spaces, read an optional sign, read digits, and clamp to the 32-bit range **before** overflowing: if result > (INT_MAX − digit) / 10, clamp. Stop at the first non-digit.
- **String Compression** (LC 443): read and write pointers in place; write each character followed by its count when the count exceeds 1.
- **Encode and Decode Strings** (LC 271): length-prefix each string ("5#hello3#abc"). A plain delimiter fails because the delimiter may appear inside a string; escaping works but is fiddlier.
- **Zigzag Conversion** (LC 6): simulate rows with a direction flag, or compute the period 2·(rows − 1).
- **Roman to Integer** (LC 13): add each value, but subtract when a smaller value precedes a larger one (IV = 4). **Integer to Roman** (LC 12): greedy over the 13 symbols including the subtractive pairs (CM, CD, XC, XL, IX, IV).
- **Count and Say** (LC 38), **Add Binary / Add Strings** (LC 67, 415): process from the end with a carry, then reverse.
- **Multiply Strings** (LC 43): grade-school multiplication into an array of size m + n: digit i × digit j goes to position i + j + 1, with carries.
- **Isomorphic Strings** (LC 205), **Word Pattern** (LC 290): maps in **both** directions, or the "first occurrence index" signature of both strings must match.

## Unicode

"Character" is ambiguous. Java's char and JavaScript strings are UTF-16 code units, so an emoji outside the Basic Multilingual Plane takes two (a surrogate pair), and "reversing" by code unit corrupts it. Python's str indexes code points. A user-visible character (grapheme cluster) can still be several code points (e plus a combining accent, flags, family emoji). Interviews usually assume ASCII: say so, and mention that real text processing needs code-point or grapheme-aware APIs and Unicode normalisation (NFC/NFD) before comparing.

## Comparing strings

- Lexicographic comparison is O(min(len)) in the worst case. Sorting n strings of length L costs O(n log n · L).
- Many equality checks against the same strings: hash once (or intern) and compare hashes, verifying on a match.
- Substring comparison in O(1) after O(n) preprocessing: rolling hashes (next page) or suffix arrays with LCP.
- Case-insensitive comparison: lowercase both (casefold in Python handles special cases like the German ß).

## Interview angles

- Mention the immutability cost whenever you build strings in a loop, and use join or StringBuilder.
- Pass indices instead of slices into recursion.
- For "valid anagram"-style questions, use fixed arrays and say O(n) time, O(1) space (26 counters).

## Connections

Counting tables lead to sliding windows over strings; rolling hashes, KMP and Z handle pattern matching; tries handle sets of strings.
`,
    doubts: [
      ["Why is s += c in a loop quadratic?", "Each concatenation creates a new string and copies all existing characters: 1 + 2 + … + n = Θ(n²) copies. A builder appends into a growable buffer with amortised O(1) per character."],
      ["Why length-prefix encoding instead of a delimiter?", "Any delimiter can appear inside the strings. A length prefix tells the decoder exactly how many characters to read, regardless of content."],
      ["Is Python's str.join linear?", "Yes: it computes the total length first and copies each piece once."],
      ["Why is slicing inside recursion a hidden cost?", "Each slice copies its characters, so a recursion that slices the remaining string at every level does O(n) extra work per call: O(n²) for a linear recursion, more for branching ones. Passing a start index keeps each call O(1) overhead."],
      ["How do I reverse a string with emoji correctly?", "Reverse by grapheme clusters, not code units: use a library that segments graphemes (Intl.Segmenter in JavaScript, the regex module's \\X in Python, ICU in Java). Reversing UTF-16 code units splits surrogate pairs and produces invalid text."],
      ["Are Python's string methods like replace and find linear?", "find and in use a fast hybrid search (Boyer–Moore–Horspool style; a two-way algorithm since 3.10) that is near-linear in practice; replace builds a new string in O(n). Calling them inside a loop over the string can still make the whole algorithm quadratic."],
    ],
    revise: md`
? Build strings in Java / Python? :: StringBuilder / list + ''.join.
? Anagram check? :: Equal 26-count arrays.
? Encode a list of strings safely? :: Length prefix per string ('5#hello').
? atoi pitfalls? :: Leading spaces, sign, non-digits, overflow clamping.
? Multiply strings result length? :: At most n + m digits.
? Unicode trap? :: Surrogate pairs and grapheme clusters break naive reversal.
? atoi overflow check? :: Before result·10 + d, check result > (INT_MAX − d) / 10, then clamp.
? Multiply Strings index rule? :: digit i × digit j adds to position i + j + 1 (m + n array), then carry.
? Isomorphic strings shortcut? :: Both strings must have the same first-occurrence-index signature.
? Longest common prefix via sorting? :: Compare only the smallest and largest words.
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
## The idea

Comparing two substrings character by character costs O(L). If every substring had a short fingerprint computable in O(1), equality tests would be O(1) (with a tiny chance of a false positive, checked if needed). A **polynomial rolling hash** provides exactly that: after O(n) preprocessing, the hash of any substring is available in O(1), and the hash of a sliding window updates in O(1) as it moves.

## Polynomial hash

Map characters to integers (for example c − 'a' + 1, avoiding 0 so that "a" and "aa" differ), choose a base B larger than the alphabet and a large prime modulus M, and define

H(s) = (s[0]·B^(n−1) + s[1]·B^(n−2) + … + s[n−1]) mod M.

**Prefix hashes**: h[0] = 0, h[i + 1] = (h[i]·B + s[i]) mod M, and powers pw[k] = B^k mod M.

**Substring hash** of s[l..r) (length r − l):

hash(l, r) = (h[r] − h[l]·pw[r − l]) mod M

Why the multiplication: h[r] contains the prefix s[0..l) shifted left by r − l positions; multiplying h[l] by B^(r − l) aligns it so subtraction removes it exactly. In languages where % can return negatives, add M before the final mod.

\`\`\`python
M, B = (1 << 61) - 1, 131
def build(s):
    h, pw = [0], [1]
    for ch in s:
        h.append((h[-1] * B + ord(ch)) % M)
        pw.append(pw[-1] * B % M)
    return h, pw
def sub(h, pw, l, r):
    return (h[r] - h[l] * pw[r - l]) % M
\`\`\`

## Rabin–Karp (1987)

Find a pattern P (length m) in a text T (length n): compute H(P), slide a window of length m over T updating its hash in O(1) (remove the leading character's contribution, multiply by B, add the new character), and compare hashes; on a match, verify characters to rule out collisions. Expected O(n + m). Its strength is **many patterns of the same length**: put all pattern hashes in a set and test each window against the set in O(1).

## Collisions

Two different strings collide with probability about 1/M for a random base. With many comparisons the **birthday bound** matters: comparing all pairs of 10⁵ substrings is ~5·10⁹ pairs, so a modulus around 10⁹ is not safe, while 2⁶¹ − 1 (or two independent moduli, "double hashing") is.

Practical rules:

- Use a 61-bit Mersenne prime (fast multiplication with 128-bit intermediates in C++; Python handles big integers natively), or two 31-bit moduli.
- **Randomise the base** at runtime. Fixed bases with M = 2⁶⁴ (natural overflow) are attackable: Thue–Morse strings make any base collide under 2⁶⁴, which is why competitive-programming hacks target them.
- Verify on match when correctness matters and matches are rare.

## Problems

- **Longest Duplicate Substring** (LC 1044): if a duplicate of length L exists, one of length L − 1 exists too (monotone), so binary search on L; for each L, hash all windows of length L into a set and look for repeats. O(n log n). Suffix arrays give O(n log n) or O(n) deterministically.
- **Repeated DNA Sequences** (LC 187): all length-10 windows; with 2 bits per nucleotide, a window is a 20-bit integer: exact, no collisions.
- **Longest Happy Prefix** (LC 1392): the longest proper prefix equal to a suffix: compare prefix and suffix hashes for each length (or use KMP's π).
- **Distinct Echo Substrings** (LC 1316): count distinct substrings of the form aa: compare hash(i, i + k) with hash(i + k, i + 2k).
- **Shortest Palindrome** (LC 214): keep forward and backward hashes of the prefix; the longest palindromic prefix is where they match.
- **Longest common substring of two strings**: binary search on the length plus hash sets of each string's windows.
- **Lexicographic comparison of two substrings in O(log n)**: binary search the longest common prefix with hashes, then compare the next character.
- **2D hashing** for finding a pattern matrix in a grid: hash rows, then hash the column of row hashes.

## When to prefer exact algorithms

| Task | Hashing | Exact alternative |
|---|---|---|
| one pattern in a text | fine | KMP or Z (deterministic O(n + m)) |
| many patterns, same length | very convenient | Aho–Corasick |
| many substring equality queries | O(1) each | suffix array + LCP + sparse table |
| longest repeated substring | binary search + hash, O(n log n) | suffix array or automaton |

Hashing often gives the shortest code; mention the collision probability and how you would make it safe.

## Interview angles

- Derive the substring formula; explain why h[l] is multiplied by B^(r − l).
- State the collision probability and choose a modulus to match the number of comparisons.
- Prefer exact algorithms when the interviewer wants deterministic guarantees.

## Connections

Rabin–Karp, KMP and Z solve pattern matching; hashing plus binary search solves "longest substring with property X" when the property is monotone; Bloom filters and consistent hashing use the same fingerprint idea elsewhere.
`,
    doubts: [
      ["Why subtract h[l]·pw[r − l]?", "h[r] contains the prefix s[0..l) shifted left by (r − l) positions in base b. Subtracting that shifted prefix leaves exactly the hash of s[l..r)."],
      ["How likely are collisions?", "For one comparison about 1/p. Over many substrings, the chance that some pair collides grows quadratically (birthday problem), so with 10⁵+ hashes and a single 10⁹ modulus, use double hashing or verify matches."],
      ["Why is overflow hashing modulo 2⁶⁴ dangerous?", "For any base, the Thue–Morse construction produces two different strings of length about 2¹¹ with equal hashes modulo 2⁶⁴, because powers of an odd base pick up factors of 2 that vanish under the modulus. A prime modulus with a random base avoids this structured weakness."],
      ["Do I need to verify characters after a hash match?", "If a false positive would give a wrong answer and matches are few, yes: verification is cheap. If you compare millions of hashes and use a 61-bit or double modulus, the collision probability is negligible and many solutions skip verification; say which you chose."],
      ["How do I hash windows in a stream without storing the whole string?", "Keep the current window hash and the characters in a queue: remove the leaving character's contribution (char·B^(m − 1)), multiply by B, add the new character. Each step is O(1) with B^(m − 1) precomputed."],
    ],
    revise: md`
? Substring hash from prefix hashes? :: h[r] − h[l]·b^(r−l) mod p.
? Rabin–Karp expected cost? :: O(n + m) (verify on match).
? Collision defences? :: Two moduli or 2⁶¹ − 1, random base, verify.
? Longest duplicate substring? :: Binary search on length + rolling hash: O(n log n).
? Shortest palindrome by hashing? :: Longest prefix whose forward and reverse hashes match.
? Why map 'a' to 1, not 0? :: With 0, "a" and "aa" (and leading-zero strings) could hash equally.
? Birthday bound consequence? :: ~k² / (2M) expected collisions among k hashes: use a 61-bit or double modulus.
? Longest Duplicate Substring structure? :: Binary search the length (monotone) + set of window hashes.
? Distinct Echo Substrings check? :: hash(i, i+k) == hash(i+k, i+2k).
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
## The problem with naive matching

Searching a pattern P (length m) in a text T (length n) naively restarts at the next text position after every mismatch, re-reading characters already seen: O(n·m) worst case ("aaaa…ab" in "aaaa…a"). Knuth, Morris and Pratt (1977) observed that after a partial match you already know the text characters just read, because they equal a prefix of the pattern. So you can shift the pattern by the right amount without moving backwards in the text: O(n + m).

## The prefix function

For a string s, π[i] = the length of the longest **proper** prefix of s[0..i] that is also a suffix of s[0..i] (a "border").

Example s = "abacaba": π = 0, 0, 1, 0, 1, 2, 3. At i = 6, "aba" is both a prefix and a suffix of "abacaba".

Computing it in O(m):

\`\`\`python
def prefix_function(s):
    pi = [0] * len(s)
    for i in range(1, len(s)):
        k = pi[i - 1]
        while k > 0 and s[i] != s[k]:
            k = pi[k - 1]              # fall back to the next shorter border
        if s[i] == s[k]:
            k += 1
        pi[i] = k
    return pi
\`\`\`

The logic: the longest border of s[0..i] extends some border of s[0..i − 1] by the character s[i]. Try the longest border k = π[i − 1] first; if s[k] matches s[i], extend it. If not, the next candidate is the longest border of that border, π[k − 1], because every border of s[0..i − 1] that is shorter than k is a border of the prefix s[0..k − 1] as well. Fall back until a match or k = 0.

**Why linear**: k increases by at most 1 per i, and each fallback decreases it by at least 1, so the total number of fallbacks is at most the total number of increases: at most m. The inner while loop is amortised O(1).

[[widget:kmp]]

## Matching

Two equivalent ways:

- **Concatenation**: compute π for P + "#" + T, where '#' is a character in neither string. Every position with π = m ends an occurrence of P. The separator stops a border from extending across the boundary.
- **Direct matcher**: walk the text with k = number of pattern characters currently matched; on a mismatch fall back with k = π[k − 1]; on a full match (k == m) report it and set k = π[m − 1] to continue (overlapping matches allowed).

\`\`\`python
def kmp_search(t, p):
    pi, k, out = prefix_function(p), 0, []
    for i, ch in enumerate(t):
        while k > 0 and ch != p[k]: k = pi[k - 1]
        if ch == p[k]: k += 1
        if k == len(p):
            out.append(i - len(p) + 1); k = pi[k - 1]
    return out
\`\`\`

O(n + m) time, O(m) extra space. The text pointer never moves backwards, which also makes KMP usable on streams.

## Periods and repetitions

A string s of length n has period p if s[i] = s[i + p] for all valid i. Borders and periods are dual: a border of length b means a period of n − b. So the **smallest period** is p = n − π[n − 1].

- **Repeated Substring Pattern** (LC 459): s is a repetition of a smaller block iff π[n − 1] > 0 and n % (n − π[n − 1]) == 0. (The alternative trick: s is in (s + s)[1:−1].)
- **Number of occurrences of each prefix**: count π values, then propagate counts down the border chain (cnt[π[i − 1]] += cnt[i] in decreasing i).
- **All borders**: follow n → π[n − 1] → π[π[n − 1] − 1] → … .

## Shortest Palindrome (LC 214)

Add the fewest characters in front of s to make it a palindrome. That equals finding the longest palindromic **prefix** of s; the rest, reversed, goes in front. Compute π of s + "#" + reverse(s): the last value is the length of the longest prefix of s that equals a suffix of reverse(s), which is exactly the longest palindromic prefix. Answer: reverse(s[len:]) + s. O(n).

## Other uses

- **Longest Happy Prefix** (LC 1392): π[n − 1] directly.
- **Strstr / Find the Index of the First Occurrence** (LC 28).
- **Rotation check** (LC 796): b is a rotation of a iff len equal and b occurs in a + a.
- **Minimum characters to append for a palindrome**, **string compression to the smallest period**.
- **KMP automaton**: precompute, for each matched length k and each character c, the next k. Then DP over a text while "avoiding" a pattern (Find All Good Strings, LC 1397: digit-DP style counting of strings that do not contain evil) uses the automaton as its state.
- **Aho–Corasick** generalises the prefix function to a trie of many patterns (failure links).

## KMP vs Z vs hashing

| | KMP | Z | Rolling hash |
|---|---|---|---|
| guarantee | deterministic O(n + m) | deterministic O(n + m) | expected, collision risk |
| streaming text | yes | no (needs the whole text) | yes |
| what it computes | borders of prefixes | prefix matches at each position | substring fingerprints |
| extends to many patterns | Aho–Corasick | no | hash sets (same length) |

## Interview angles

- Explain π with an example before coding; explain the fallback with "borders of borders".
- Justify linear time with the potential argument (k goes up at most m times).
- Mention the period formula; it solves a family of problems in one line.

## Connections

The Z-function encodes the same information differently; Aho–Corasick extends KMP to tries; the KMP automaton powers string DPs.
`,
    doubts: [
      ["Why does falling back to π[k − 1] not miss matches?", "When s[i] ≠ s[k], the next candidate border must be a border of the current border s[0..k). The longest such is π[k − 1]. Shorter candidates are reached by repeated fallbacks, so every possibility is tried in decreasing length."],
      ["Why is the prefix function computation linear despite the inner while?", "k increases by at most 1 per i and each fallback decreases it, so the total number of fallbacks is at most the total increases, ≤ n."],
      ["Why add a separator '#' when concatenating?", "It prevents a border from running across the boundary, capping every π value at the pattern length."],
      ["Why does KMP work on streams while Z does not?", "KMP's matcher only needs the current matched length k and the precomputed π of the pattern; it reads each text character once and never looks back. Z needs comparisons against the start of the combined string at arbitrary positions, which requires the whole text up front."],
      ["What is the failure function in textbooks: π or something shifted?", "Conventions differ: some define fail[i] = π[i − 1] (the fallback used after matching i characters), sometimes with fail[0] = −1. The algorithm is the same; check which indexing the source uses before mixing code from different places."],
      ["How do I count occurrences of every prefix of s inside s?", "Start with cnt[π[i]] += 1 for every i, then for lengths from n down to 1 add cnt[len] to cnt[π[len − 1]] (each occurrence of a border is also an occurrence of its shorter borders), and finally add 1 to every length for the prefix itself."],
    ],
    revise: md`
? π[i] means? :: Longest proper prefix of s[0..i] that is also its suffix.
? Mismatch fallback? :: k = π[k − 1].
? Matching cost? :: O(n + m) worst case.
? Smallest period? :: n − π[n − 1]; repeated block iff it divides n.
? Shortest palindrome? :: π of s + '#' + reverse(s); prepend the rest reversed.
? Longest happy prefix? :: π[n − 1].
? π for "abacaba"? :: 0,0,1,0,1,2,3.
? Smallest period from π? :: n − π[n−1]; a repetition iff it divides n (and π > 0).
? After a full match in the direct matcher? :: Report it and set k = π[m−1] (allows overlaps).
? Rotation check? :: Same length and b occurs in a + a.
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

For a string s of length n, the **Z-array** stores at each position i the length of the longest substring starting at i that matches a prefix of s:

Z[i] = max k such that s[i..i + k) == s[0..k).

Z[0] is undefined (conventionally 0 or n). Example s = "aabxaab": Z = −, 1, 0, 0, 3, 1, 0. At i = 4, "aab" matches the prefix "aab".

The Z-array answers "how far does the prefix match starting here?" for every position at once, which turns pattern matching, period finding and many prefix questions into a single linear pass.

## Linear algorithm

Maintain the **Z-box** [l, r): the rightmost segment found so far that matches a prefix (s[l..r) == s[0..r − l)).

For each i from 1 to n − 1:

1. If i < r, then s[i..r) is a copy of s[i − l..r − l), so Z[i] is at least min(r − i, Z[i − l]). Start from that value.
2. Extend by direct comparison while s[Z[i]] == s[i + Z[i]].
3. If i + Z[i] > r, move the box: l = i, r = i + Z[i].

\`\`\`python
def z_function(s):
    n = len(s); z = [0] * n
    l = r = 0
    for i in range(1, n):
        if i < r:
            z[i] = min(r - i, z[i - l])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] > r:
            l, r = i, i + z[i]
    return z
\`\`\`

**Why linear**: every successful comparison in step 2 pushes r to the right (when the starting value came from inside the box and is less than r − i, the copy is exact and the first comparison fails immediately). r only increases and never exceeds n, so there are at most n successful comparisons plus one failure per i: O(n).

**Why min(r − i, Z[i − l])**: inside the box, s[i..r) equals s[i − l..r − l), so whatever matched the prefix at i − l also matches at i, but only up to the box's edge r; beyond r nothing is known yet and must be compared directly.

## Uses

- **Pattern matching**: compute Z of P + "$" + T (separator in neither string). Positions where Z = |P| are matches. O(n + m).
- **Smallest period**: the smallest p ≥ 1 with p + Z[p] == n (and n % p == 0 if you need a full repetition).
- **Number of distinct substrings** incrementally (classic O(n²) method: add a character, reverse, take the max Z).
- **Sum of Scores of Built Strings** (LC 2223): Σ Z[i] + n, directly.
- **Minimum Time to Revert Word to Initial State** (LC 3029/3031): the first multiple t·k such that s[t·k..] is a prefix of s, i.e. Z[t·k] ≥ n − t·k (or t·k ≥ n).
- **String compression and borders**: a border of length b exists iff Z[n − b] == b.
- **Longest prefix that is also a substring elsewhere**, **matching with one mismatch** (Z of P + T and of reversed strings combined: P matches at i with at most one mismatch iff prefix match + suffix match ≥ m − 1).

## Z vs prefix function

Both encode the same information about the string's self-similarity and convert into each other in O(n). The prefix function looks **backwards** from each end position (borders), the Z-function looks **forwards** from each start position (prefix matches). Choose by the question: "does the prefix appear starting here?" is natural with Z; "what is the longest border ending here?" and streaming text are natural with π.

## Interview angles

- Define Z[i] with an example; describe the Z-box and the min(r − i, Z[i − l]) start.
- Explain linearity by the monotone r.
- Show pattern matching with a separator.

## Connections

KMP's prefix function is the dual; suffix arrays and suffix automata answer more general substring questions; Manacher uses the same "mirror inside a known window" trick for palindromes.
`,
    doubts: [
      ["Can Z and the prefix function solve the same problems?", "Yes. Each can be computed from the other in O(n), so pattern matching, periods and border questions can use either. Pick Z when you think in terms of \"how far does the prefix match starting here\", and KMP when you stream the text or reason about borders."],
      ["Why can Z[i] start from Z[i − l]?", "Inside the box [l, r), s[l..r) equals s[0..r − l). So s[i..] near i mirrors s[i − l..], whose prefix match Z[i − l] is known, capped by the box boundary r − i where knowledge ends."],
      ["What happens if the separator character appears in the pattern or text?", "A match could extend across the boundary, producing Z values larger than the pattern length or false matches. Choose a character outside the alphabet, or work with integer arrays and use −1 as the separator."],
      ["Can the Z-algorithm find the longest palindromic prefix like KMP?", "Yes. Build t = s + \"#\" + reverse(s) and compute its Z-array. A position i inside the reversed part with i + Z[i] == len(t) means the suffix of t starting at i (a suffix of reverse(s)) equals a prefix of s, i.e. that prefix is a palindrome of length len(t) − i. The smallest such i gives the longest palindromic prefix."],
      ["Is Z[0] = n or 0?", "It is a convention. Setting Z[0] = n makes formulas like Σ Z[i] count the whole string; setting 0 avoids accidentally treating position 0 as a match. Pick one and be consistent."],
    ],
    revise: md`
? Z[i] means? :: Longest common prefix of s and s[i..].
? Box reuse? :: Z[i] ≥ min(r − i, Z[i − l]) for i < r.
? Complexity? :: O(n): r only moves right.
? Pattern search? :: Z of pattern + '$' + text; Z = m marks matches.
? Smallest period? :: Smallest p with p + Z[p] = n.
? Z of "aabxaab"? :: −,1,0,0,3,1,0.
? Border of length b via Z? :: Exists iff Z[n − b] == b.
? Matching with one mismatch? :: Z prefix match + reversed Z suffix match ≥ m − 1.
? LC 2223 answer? :: Σ Z[i] + n.
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
## The problem

Find, for every centre of a string, the longest palindrome around it, in O(n) total. Expanding around each of the 2n − 1 centres costs O(n²) on strings like "aaaa…a". Manacher's algorithm (1975) reuses information from palindromes already found, exactly like the Z-algorithm reuses its Z-box.

## The transform

Odd and even palindromes have different kinds of centres (a character or a gap). Insert a separator between characters and at both ends: "abba" becomes "#a#b#b#a#". Now every palindrome in the original string corresponds to an odd-length palindrome in the transformed string t (length 2n + 1), centred on a character or a '#'. One loop handles both kinds.

Let P[i] = the radius of the longest palindrome in t centred at i, not counting the centre (so the palindrome spans t[i − P[i] .. i + P[i]]). A useful fact: P[i] equals the length of the corresponding palindrome in the original string.

## The algorithm

Maintain the palindrome with the rightmost right edge found so far: centre c, right edge r = c + P[c].

For each i:

1. If i < r, let mirror = 2c − i (the reflection of i around c). The palindrome at mirror reflects into the big palindrome, so P[i] ≥ min(r − i, P[mirror]). Start there.
2. Expand while t[i − P[i] − 1] == t[i + P[i] + 1] (within bounds).
3. If i + P[i] > r, set c = i, r = i + P[i].

\`\`\`python
def manacher(s):
    t = "#" + "#".join(s) + "#"
    n, P = len(t), [0] * len(t)
    c = r = 0
    for i in range(n):
        if i < r:
            P[i] = min(r - i, P[2 * c - i])
        while i - P[i] - 1 >= 0 and i + P[i] + 1 < n and t[i - P[i] - 1] == t[i + P[i] + 1]:
            P[i] += 1
        if i + P[i] > r:
            c, r = i, i + P[i]
    return P
\`\`\`

**Why the mirror gives a lower bound**: inside the big palindrome centred at c, the string is symmetric, so the neighbourhood of i is the mirror image of the neighbourhood of mirror. A palindrome around mirror that fits inside the big one reflects into a palindrome around i. Beyond r nothing is known, hence the min with r − i.

**Why linear**: each successful expansion in step 2 pushes r to the right (if P[mirror] fits strictly inside the big palindrome, the first expansion fails immediately), and r never exceeds the length of t. So total expansion work is O(n).

## Reading the results

- The longest palindrome length in the original string is max P[i].
- Its start in the original string is (i − P[i]) // 2 for the maximising i.
- The number of palindromic substrings is Σ (P[i] + 1) // 2 over all i (each centre contributes one palindrome per radius step in the original string).
- "Is s[l..r] a palindrome?" in O(1): check the centre in t corresponding to the middle of s[l..r] has a radius at least the length.

## When to use it

- **Longest Palindromic Substring** (LC 5) and **Palindromic Substrings** (LC 647) with large n (10⁵ or more). For n up to a few thousand, expand around centres (O(n²), simpler) is the expected interview answer; Manacher is the named optimisation.
- **Maximum Product of the Length of Two Palindromic Substrings** (LC 1960): odd palindromes only; from P compute, for every prefix, the longest palindrome ending within it, and for every suffix, the longest starting within it; combine at each split. O(n).
- **Shortest palindrome by adding characters**: the longest palindromic prefix is the largest centre whose palindrome touches index 0.
- **Palindrome partitioning** with many checks: the O(1) palindrome test replaces the O(n²) isPal table.

## Related structures

- **Hashing forward and backward**: O(1) palindrome tests with O(n) preprocessing, simpler to derive, probabilistic.
- **Palindromic tree (eertree)**: one node per distinct palindrome (at most n + 2 nodes), built in O(n); counts distinct palindromic substrings and occurrences of each.
- **Expand around centres**: O(n²) worst case, O(1) space, the baseline.

## Interview angles

- Present centre expansion first; describe Manacher as "reuse the mirror inside the rightmost palindrome" with the transform.
- Know how to convert P back to original indices.
- Linearity argument: the right edge only moves right.

## Connections

The Z-algorithm uses the same "known window plus mirror" trick for prefix matches; palindrome DPs use the results; the eertree counts distinct palindromes.
`,
    doubts: [
      ["Why insert separators?", "Even-length palindromes have no centre character. Separators give every palindrome a centre in the transformed string, so one loop handles both cases."],
      ["Why is the mirror's radius a lower bound?", "Inside the big palindrome [l, r], the string is symmetric, so whatever palindrome surrounds the mirror j also surrounds i, as long as it stays inside [l, r]. Beyond r nothing is known, hence the cap r − i."],
      ["Why does the transformed string need separators at both ends too?", "The end separators give every palindrome, including those touching the string's ends, a symmetric '#'-boundary, so the expansion loop and the index formulas need no special cases. With \"^#a#b#$\" style sentinels (different characters at the ends), you can even drop the bounds checks."],
      ["Is Manacher worth writing in an interview?", "Usually only if asked for O(n). Expand-around-centres is accepted for LC 5. Knowing that Manacher exists, its idea and its linear argument is the expected depth."],
      ["Can Manacher count distinct palindromic substrings?", "Not directly: it counts palindromes by position. Distinct counting needs an eertree, or hashing each palindrome found during expansion (there are at most n distinct ones, a known fact used by the eertree)."],
    ],
    revise: md`
? Manacher complexity? :: O(n).
? Separator trick? :: Unifies odd and even palindromes.
? Mirror bound? :: d[i] ≥ min(d[mirror], r − i).
? Interview default? :: Expand around centres O(n²); Manacher as the follow-up.
? P[i] in t vs original? :: P[i] equals the palindrome's length in the original string.
? Original start index from P? :: (i − P[i]) // 2.
? Count palindromic substrings from P? :: Σ (P[i] + 1) // 2.
? Eertree size? :: At most n + 2 nodes (distinct palindromes).
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
## Why suffix structures

Every substring of s is a prefix of some suffix. A data structure that organises all suffixes therefore answers substring questions: does P occur, how many times, what is the longest repeated substring, how many distinct substrings exist, what is the longest common substring of two strings. Three structures dominate: the suffix array (with LCP), the suffix automaton and the suffix tree. Aho–Corasick, a cousin built on a trie of patterns, handles many patterns at once.

## Suffix array + LCP

The **suffix array** SA lists the starting positions of all suffixes in lexicographic order. For "banana": suffixes sorted are a(5), ana(3), anana(1), banana(0), na(4), nana(2), so SA = [5, 3, 1, 0, 4, 2].

Building it:

- naive: sort n suffixes with O(n) comparisons each: O(n² log n).
- **prefix doubling**: sort by the first 1, 2, 4, … characters, using the ranks of the previous round as keys (rank[i], rank[i + k]); O(n log² n) with comparison sort, O(n log n) with radix sort.
- **SA-IS** or DC3: O(n), used by libraries.

The **LCP array**: LCP[i] = the length of the longest common prefix of the suffixes at SA[i − 1] and SA[i]. **Kasai's algorithm** computes it in O(n): process suffixes in text order, and use the fact that when you move from suffix i to suffix i + 1, the LCP with its predecessor in SA drops by at most one.

What they give:

- **Pattern search**: binary search on SA, comparing P with suffixes: O(m log n) (O(m + log n) with LCP tricks).
- **Distinct substrings**: n(n + 1)/2 − Σ LCP. Each suffix contributes its length minus the part shared with its predecessor.
- **Longest repeated substring**: max LCP.
- **Longest common substring of A and B**: build SA of A + "#" + B; the answer is the max LCP between adjacent suffixes that come from different strings.
- **LCP of any two suffixes**: range minimum over LCP between their SA positions (sparse table): O(1) per query, which gives O(1) lexicographic substring comparisons.
- **k-th smallest distinct substring**: walk SA, each suffix contributing (length − LCP) new substrings.

## Suffix automaton

The minimal deterministic automaton accepting all substrings of s. Remarkably small: at most 2n − 1 states and 3n − 4 transitions, built **online** in O(n) (adding one character at a time). Each state is a class of substrings with the same set of end positions ("endpos"); suffix links form a tree.

Uses: does P occur (walk transitions, O(m)); number of distinct substrings (Σ over states of len(v) − len(link(v))); number of occurrences of each substring (endpos sizes via the suffix-link tree); longest common substring of two strings in O(n + m) (walk B through A's automaton, tracking the current match length); longest common substring of many strings.

## Suffix trees

A compressed trie of all suffixes (edges labelled with substrings): O(n) nodes, built in O(n) by Ukkonen's algorithm (1995). Every substring query is a walk from the root; deepest internal nodes give repeats; generalised suffix trees handle several strings. Powerful but heavy to implement; suffix arrays with LCP do most of the same jobs with less memory, and suffix automata are shorter to code.

## Aho–Corasick (1975)

Many patterns against one text: build a trie of the patterns, then add **failure links** (for each node, the longest proper suffix of its string that is also a trie path, computed by BFS like KMP's prefix function) and **output links** (the next pattern end reachable through failure links). Scanning the text follows trie edges and failure links: O(n + total pattern length + number of matches). Used in grep -F, intrusion detection (Snort), antivirus signatures, and Stream of Characters (LC 1032) style problems.

## Burrows–Wheeler and FM-index (name-level)

The **BWT** sorts all rotations of s and takes the last column; it groups similar contexts, so it compresses well (bzip2). With rank structures over the BWT, the **FM-index** counts occurrences of P in O(m) using space close to the compressed text. DNA read aligners (BWA, Bowtie) index whole genomes this way.

## Interview stance

- You rarely implement these in an interview. Know what each answers and its complexity, and implement hashing, KMP or Z instead.
- Typical "big hammer" mentions: "a suffix array with LCP gives distinct substrings as n(n+1)/2 − ΣLCP", "Aho–Corasick for many patterns", "a suffix automaton gives the longest common substring in linear time".
- If asked to implement, prefix-doubling SA in O(n log² n) with Python sorting is about 15 lines.

\`\`\`python
def suffix_array(s):
    n, k = len(s), 1
    rank = [ord(c) for c in s]; sa = list(range(n))
    while True:
        key = lambda i: (rank[i], rank[i + k] if i + k < n else -1)
        sa.sort(key=key)
        new = [0] * n
        for j in range(1, n):
            new[sa[j]] = new[sa[j - 1]] + (key(sa[j]) != key(sa[j - 1]))
        rank = new
        if rank[sa[-1]] == n - 1: return sa
        k *= 2
\`\`\`

## Connections

Rolling hashes are the lightweight alternative; KMP and Z are the single-pattern special cases; sparse tables turn LCP arrays into O(1) substring comparisons.
`,
    doubts: [
      ["Why is the number of distinct substrings n(n+1)/2 − ΣLCP?", "Each suffix contributes its prefixes as substrings; prefixes shared with the previous suffix in sorted order (exactly LCP of them) were already counted."],
      ["When is Aho–Corasick better than running KMP per pattern?", "With many patterns, KMP per pattern costs O(k·n). Aho–Corasick scans the text once for all patterns: O(n + Σ|pattern| + occurrences)."],
      ["Which suffix structure should I learn first?", "The suffix array with Kasai's LCP: it is a plain array, easy to reason about, and covers distinct substrings, repeats, longest common substrings and pattern search. Add the suffix automaton later for online and many-string problems."],
      ["How does the longest common substring of two strings work with a suffix array?", "Concatenate A + \"#\" + B (with a unique separator), build SA and LCP, and look at adjacent suffix pairs in SA: whenever one starts in A and the other in B, their LCP is a common substring length (the separator stops it crossing). The maximum over such pairs is the answer."],
      ["Why is the suffix tree O(n) nodes when there are n(n+1)/2 substrings?", "Compression: chains of single-child nodes collapse into one edge labelled by a (start, end) pair into the string. A tree with n leaves (one per suffix) and every internal node branching has fewer than n internal nodes."],
    ],
    revise: md`
? Suffix array build costs? :: O(n log n) prefix doubling; O(n) SA-IS.
? LCP array algorithm? :: Kasai, O(n).
? Distinct substrings? :: n(n+1)/2 − Σ LCP.
? Longest repeated substring? :: Maximum LCP.
? Multi-pattern search? :: Aho–Corasick (trie + failure links).
? Suffix automaton size? :: O(n) states.
? SA of "banana"? :: [5, 3, 1, 0, 4, 2].
? Kasai's key fact? :: Moving from suffix i to i+1, its LCP with the SA predecessor drops by at most 1.
? Suffix automaton size? :: ≤ 2n − 1 states, ≤ 3n − 4 transitions, built online in O(n).
? Distinct substrings via automaton? :: Σ over states of len(v) − len(link(v)).
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
## The problem

Answer many range queries on a **static** array (no updates): the minimum, maximum, gcd or bitwise AND of a[l..r]. Scanning costs O(n) per query; a segment tree O(log n). A **sparse table** answers idempotent queries in **O(1)** after O(n log n) preprocessing.

## Construction

st[k][i] = the answer for the range of length 2^k starting at i: [i, i + 2^k).

- st[0][i] = a[i].
- st[k][i] = op(st[k − 1][i], st[k − 1][i + 2^(k − 1)]): a block of length 2^k is two blocks of length 2^(k − 1).

\`\`\`python
def build(a, op=min):
    n = len(a); st = [a[:]]
    k = 1
    while (1 << k) <= n:
        prev, half = st[-1], 1 << (k - 1)
        st.append([op(prev[i], prev[i + half]) for i in range(n - (1 << k) + 1)])
        k += 1
    return st
\`\`\`

O(n log n) time and space (log₂ n levels of up to n entries).

## O(1) query for idempotent operations

For [l, r] (inclusive), let k = ⌊log₂(r − l + 1)⌋. The two blocks [l, l + 2^k) and [r − 2^k + 1, r] together cover [l, r] (they may overlap). So

query(l, r) = op(st[k][l], st[k][r − 2^k + 1]).

The overlap is harmless when op is **idempotent**: op(x, x) = x. min, max, gcd, AND and OR qualify. Sum, product and XOR do not: overlapping elements would be counted twice.

Fast ⌊log₂⌋: precompute lg[1] = 0, lg[i] = lg[i // 2] + 1 for i up to n; or use bit_length() − 1 in Python and __builtin_clz in C++.

## Non-idempotent operations

For sums or XOR, decompose [l, r] into disjoint power-of-two blocks (at most log n of them, following the bits of the length): O(log n) per query. Usually prefix sums are simpler for sums. The **disjoint sparse table** answers any associative operation (including non-idempotent ones such as sums modulo m, matrix products) in O(1) per query after O(n log n) preprocessing, by storing, for each level, prefix and suffix aggregates around block midpoints.

## When to use it

| Situation | Structure |
|---|---|
| static array, many min/max/gcd queries | sparse table (O(1) query) |
| static array, sums | prefix sums |
| point or range updates | segment tree or Fenwick |
| few queries | just scan |
| sliding window min/max (queries move monotonically) | monotonic deque |

## Applications

- **LCA via RMQ**: an Euler tour of the tree with depths; the LCA of u and v is the minimum-depth node between their first occurrences: O(1) per query after O(n log n).
- **Suffix arrays**: LCP of any two suffixes = range minimum over the LCP array.
- **Range gcd queries**: count subarrays with gcd equal to k (binary search on how far each gcd stays the same), or problems like "longest subarray whose gcd is > 1".
- **Range max for binary search**: "the first index to the right of i with a value greater than x" by binary searching with O(1) range max (or using a segment tree descent).
- **Monotone checks**: is a[l..r] sorted? Precompute "descent positions" prefix counts instead; but "max − min ≤ limit in a window" with arbitrary windows uses two sparse tables.

## Memory and cache

The table has log n rows; storing it as st[k][i] (rows contiguous) makes the build sequential and cache-friendly. For n = 10⁶, 20 rows × 10⁶ ints is 80 MB in 4-byte ints: large; then a segment tree (2n entries) may be preferable despite O(log n) queries.

## Interview angles

- Explain the overlap trick and why it requires idempotence.
- Mention O(n log n) memory and the static-only limitation.
- Use it for LCA in O(1) as the "next level" answer.

## Connections

Segment trees handle updates; Fenwick trees handle prefix sums with updates; the Euler tour connects RMQ to LCA; the monotonic deque solves the sliding version in O(n).
`,
    doubts: [
      ["Why can the two blocks overlap for min but not for sum?", "Counting an element twice does not change a minimum (idempotence) but does change a sum."],
      ["How do I compute ⌊log₂ len⌋ quickly?", "Precompute a log table (log[1] = 0, log[i] = log[i / 2] + 1), or use bit-length / count-leading-zeros instructions."],
      ["Why does the sparse table have no update operation?", "Element j belongs to every block st[k][i] with i ≤ j < i + 2^k: up to 2^k blocks on level k, about 2n entries over all levels. Rebuilding those is O(n) per update, so with updates use a segment tree instead."],
      ["How do I return the index of the minimum, not its value?", "Store indices in the table and compare a[i] values when combining (break ties by smaller index). The query then returns an index, which is what LCA via Euler tour needs."],
      ["Is the O(1) query really faster than a segment tree in practice?", "Yes for many queries on large static arrays: two table reads and one comparison versus about 2·log n node visits. The price is O(n log n) memory and preprocessing."],
    ],
    revise: md`
? Sparse table recurrence? :: st[k][i] = min(st[k−1][i], st[k−1][i + 2^(k−1)]).
? Query? :: k = ⌊log₂ len⌋; min(st[k][l], st[k][r − 2^k + 1]).
? Which operations? :: Idempotent ones: min, max, gcd, AND, OR.
? Build cost? :: O(n log n) time and space.
? Updates? :: Not supported: use a segment tree.
? Why can't sum use the overlapping two-block query? :: Overlapping elements would be counted twice (sum is not idempotent).
? Disjoint sparse table? :: O(1) queries for any associative op via prefix/suffix aggregates around midpoints.
? Memory for n = 10⁶? :: ~20 rows × 10⁶: tens of MB; consider a segment tree.
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
## The problem

Maintain an array under two operations: **point update** (add Δ to a[i]) and **prefix query** (sum of a[1..i]). Prefix sums answer queries in O(1) but an update costs O(n); a plain array is the reverse. A **Fenwick tree** (binary indexed tree, Fenwick 1994) does both in O(log n) with an array of n + 1 integers and about ten lines of code. Range sums follow as prefix(r) − prefix(l − 1).

## Structure

Use 1-based indices. Let lowbit(i) = i & −i, the value of the lowest set bit of i (in two's complement, −i flips all bits above the lowest set bit). Then bit[i] stores the sum of the range (i − lowbit(i), i]:

| i (binary) | lowbit | bit[i] covers |
|---|---|---|
| 1 (0001) | 1 | a[1] |
| 2 (0010) | 2 | a[1..2] |
| 3 (0011) | 1 | a[3] |
| 4 (0100) | 4 | a[1..4] |
| 6 (0110) | 2 | a[5..6] |
| 8 (1000) | 8 | a[1..8] |

[[widget:fenwick]]

**Prefix query**: the range [1, i] splits into the blocks of bit[i], bit[i − lowbit(i)], … — one per set bit of i. Strip the lowest set bit each step: at most log₂ n steps.

**Point update**: the positions whose blocks contain i are i, i + lowbit(i), (that) + its lowbit, …, up to n. Add Δ to each.

\`\`\`python
class Fenwick:
    def __init__(self, n): self.n, self.t = n, [0] * (n + 1)
    def add(self, i, d):            # 1-based
        while i <= self.n:
            self.t[i] += d; i += i & -i
    def prefix(self, i):            # sum of a[1..i]
        s = 0
        while i > 0:
            s += self.t[i]; i -= i & -i
        return s
    def range(self, l, r): return self.prefix(r) - self.prefix(l - 1)
\`\`\`

**Why i += lowbit(i) finds the next covering block**: adding the lowest set bit carries into the next higher zero bit, producing the smallest index whose block (which starts just after clearing its own lowest bit) still reaches back past i. Each step increases the lowest set bit's position, so there are at most log n steps.

**Building in O(n)**: copy a into t, then for each i, add t[i] into t[i + lowbit(i)] (if within n). Pushing each partial sum to its parent once builds every block. (n separate adds would be O(n log n).)

**Why 1-indexed**: index 0 has lowbit 0, so i += i & −i would loop forever and i −= i & −i would never reach 0 from 0. Shift 0-based positions by +1.

## Counting with a Fenwick tree over values

Use the tree over **values** instead of positions: bit counts how many elements with each value have been seen.

- **Count of Smaller Numbers After Self** (LC 315): coordinate-compress the values to ranks 1..m; scan from the right; for each x, answer = prefix(rank(x) − 1) (smaller values already seen to the right); then add(rank(x), 1). O(n log n).
- **Inversion count**: the same scan, summing the answers.
- **Count of Range Sum** (LC 327): over prefix sums, count earlier prefixes P[i] in [P[j] − upper, P[j] − lower]: compress all P values, query a value range per j.
- **Reverse Pairs** (LC 493): count i < j with a[i] > 2·a[j]; compress the values and the doubled values together.
- **Create Sorted Array through Instructions** (LC 1649): cost = min(count less, count greater) using prefix queries.
- **Count good triplets / increasing triplets**: two Fenwick passes (count of smaller to the left × count of larger to the right).

## Variants

- **Range update, point query**: store a difference array in the tree. add(l, Δ), add(r + 1, −Δ); the value at i is prefix(i).
- **Range update, range query**: two trees B1 and B2. For an update of Δ on [l, r]: add(B1, l, Δ), add(B1, r + 1, −Δ), add(B2, l, Δ·(l − 1)), add(B2, r + 1, −Δ·r). Then prefix(i) = sum(B1, i)·i − sum(B2, i).
- **2D Fenwick** (Range Sum Query 2D Mutable, LC 308): nested loops over both coordinates: O(log n · log m) per operation.
- **Find the k-th element** (order statistics): with counts over values, descend by powers of two: start at pos = 0 and for step = highest power of two down to 1, if pos + step ≤ n and t[pos + step] < k, then pos += step and k −= t[pos]. Answer pos + 1. O(log n), no binary search over prefix sums needed.
- **Prefix maximum with increasing updates** (values only grow): t[i] = max instead of +; works because max is monotone under such updates. General range max with arbitrary updates needs a segment tree.

## Fenwick vs segment tree

| | Fenwick | Segment tree |
|---|---|---|
| code | ~10 lines | ~30 lines |
| memory | n + 1 | 2n to 4n |
| operations | invertible ones (sum, XOR, count) for ranges | any associative op (min, max, gcd, custom nodes) |
| range updates | sum only (with the two-tree trick) | any, with lazy propagation |
| constant factor | very small | larger |

Rule: prefix sums or counts with point updates → Fenwick; anything else → segment tree.

## Interview angles

- Write add and prefix from memory and explain lowbit.
- Coordinate compression is almost always needed when the tree is over values.
- Know the inversion-counting pattern; it covers several hard LeetCode problems.

## Connections

Merge-sort counting solves the same offline inversion problems; segment trees generalise Fenwick; prefix sums are the static version.
`,
    doubts: [
      ["Why does i += i & −i move to the next responsible node?", "Adding the lowest set bit carries into the next higher bit, landing on the smallest index whose range (i − lowbit, i] contains the current position. All those nodes must include the update."],
      ["Why 1-indexed?", "lowbit(0) = 0, so index 0 would loop forever. Shifting to 1-based avoids it."],
      ["Can Fenwick do range minimum?", "Not with arbitrary updates, because min has no inverse (you cannot subtract an old value). Use a segment tree."],
      ["Why does coordinate compression keep the answers correct?", "Counting queries only compare values, so replacing each value by its rank in the sorted list of distinct values preserves every \"less than\" or \"greater than\" relation. The tree then needs only as many slots as distinct values."],
      ["Can I use a Fenwick tree for range minimum with arbitrary updates?", "Not in general: minimum is not invertible, so prefix(r) and prefix(l − 1) cannot be combined into a range answer, and decreasing an element's value is fine but increasing it would require recomputing blocks. Use a segment tree."],
      ["What about values that are negative or huge?", "Compress them to ranks first. Without compression a Fenwick tree needs one slot per possible value, which is impossible for 10⁹ ranges or negatives."],
    ],
    revise: md`
? tree[i] covers? :: (i − lowbit(i), i], lowbit = i & −i.
? update loop? :: i += i & −i.
? query loop? :: i −= i & −i.
? Range sum? :: query(r) − query(l − 1).
? Count smaller after self? :: Fenwick over compressed values, scan from the right.
? Range update + range query? :: Two Fenwick trees.
? Fenwick limitation? :: Needs invertible operations; no lazy range assignments.
? O(n) Fenwick build? :: t = a copy; for each i, add t[i] into t[i + lowbit(i)].
? Range update + range query formula? :: prefix(i) = sum(B1,i)·i − sum(B2,i), updates to B1 and B2 at l and r+1.
? k-th element by descent? :: Try steps from the highest power of two; move while t[pos+step] < k.
? Count good triplets? :: Smaller-on-the-left × larger-on-the-right via two Fenwick passes.
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
## The problem

Answer range queries (sum, min, max, gcd, or something custom) on an array that also receives **updates**, each in O(log n). Prefix sums and sparse tables cannot handle updates; a Fenwick tree handles only invertible operations. A **segment tree** handles any associative operation, and with lazy propagation, range updates too.

## Structure

A binary tree in which each node covers a segment [l, r] of the array: the root covers [0, n − 1], each internal node's children cover its two halves, and leaves cover single elements. Each node stores the aggregate of its segment.

Store it in an array: root at index 1, children of node v at 2v and 2v + 1. The tree has fewer than 2·(next power of two ≥ n) nodes, so **4n** is a safe array size for arbitrary n.

[[widget:segment-tree]]

## Operations

\`\`\`python
class SegTree:
    def __init__(self, a):
        self.n = len(a); self.t = [0] * (4 * self.n)
        self.build(a, 1, 0, self.n - 1)
    def build(self, a, v, l, r):
        if l == r: self.t[v] = a[l]; return
        m = (l + r) // 2
        self.build(a, 2 * v, l, m); self.build(a, 2 * v + 1, m + 1, r)
        self.t[v] = self.t[2 * v] + self.t[2 * v + 1]
    def update(self, i, x, v=1, l=0, r=None):
        if r is None: r = self.n - 1
        if l == r: self.t[v] = x; return
        m = (l + r) // 2
        if i <= m: self.update(i, x, 2 * v, l, m)
        else: self.update(i, x, 2 * v + 1, m + 1, r)
        self.t[v] = self.t[2 * v] + self.t[2 * v + 1]
    def query(self, ql, qr, v=1, l=0, r=None):
        if r is None: r = self.n - 1
        if qr < l or r < ql: return 0                  # disjoint: identity
        if ql <= l and r <= qr: return self.t[v]       # fully covered
        m = (l + r) // 2
        return self.query(ql, qr, 2 * v, l, m) + self.query(ql, qr, 2 * v + 1, m + 1, r)
\`\`\`

- **Build**: O(n).
- **Point update**: change the leaf, recompute its ancestors: O(log n).
- **Range query**: return fully covered nodes immediately, ignore disjoint ones, recurse into partial overlaps.

**Why a query touches O(log n) nodes**: at each depth, at most two nodes partially overlap the query range (the ones containing its left and right boundaries); every other visited node at that depth is fully inside or fully outside and stops immediately. So at most about 4 nodes per level: O(log n).

## Designing the node

Any operation that combines two adjacent segments associatively works. The node stores whatever the parent needs to compute its own value from its two children.

- **Sum, min, max, gcd, AND, OR, XOR**: one number per node; the identity for disjoint ranges is 0, +∞, −∞, 0, all-ones, 0, 0 respectively.
- **Count of the minimum**: store (min, count); combine by taking the smaller min, adding counts on ties.
- **Maximum subarray sum in a range** (with updates): store (total, best prefix, best suffix, best). Combine: total = L.total + R.total; prefix = max(L.prefix, L.total + R.prefix); suffix = max(R.suffix, R.total + L.suffix); best = max(L.best, R.best, L.suffix + R.prefix). Kadane, made dynamic.
- **Longest run of equal values / balanced brackets in a range**: store lengths at both ends and the best inside.
- **Sorted lists per node** (merge sort tree): count elements ≤ x in a range in O(log² n), static.

## Descending queries

A segment tree can **search**, not just aggregate: "the first index ≥ l with a[i] ≥ x" walks down from the root, entering the left child if its maximum is ≥ x and it overlaps the range, else the right: O(log n). Also "the k-th one" (descend by counts) and "the first position where a prefix sum reaches S". This avoids an extra binary search over queries (which would be O(log² n)).

## Iterative (bottom-up) segment tree

Leaves at positions n..2n − 1 in an array of size 2n; parent of i is i // 2.

- update(i, x): set t[i + n] = x, then for i //= 2 while i ≥ 1: t[i] = t[2i] + t[2i + 1].
- query on [l, r): l += n, r += n; while l < r: if l is odd, add t[l] and l += 1; if r is odd, r −= 1 and add t[r]; then l //= 2, r //= 2.

Shorter, faster, 2n memory. For non-commutative operations, combine the left and right accumulators in order. Lazy propagation is harder in this form, so use the recursive version for range updates.

## Problems

- **Range Sum Query – Mutable** (LC 307): the basic tree (or Fenwick).
- **Count of Smaller Numbers After Self** (LC 315): a tree over compressed values.
- **My Calendar I/II/III** (LC 729, 731, 732): with huge coordinates, a dynamic (implicit) tree with range add and range max; or sorted structures.
- **Falling Squares** (LC 699): range max and range assign over compressed coordinates.
- **Longest Increasing Subsequence II** (LC 2407): max over the value range [x − k, x − 1], then point update at x.
- **Booking Concert Tickets in Groups** (LC 2286): range max and sum with descending queries.
- **Handling Sum Queries After Update** (LC 2569): range flip with lazy propagation.
- **Range frequency / k-th in range**: persistent or merge-sort trees.

## Variants to name

Lazy propagation (range updates), dynamic segment trees (create nodes on demand for coordinates up to 10⁹), persistent segment trees (keep every version), merge sort trees, segment trees on trees (via Euler tour or heavy-light decomposition), segment tree beats (range chmin with sum queries), Li Chao trees (lines, for the convex hull trick).

## Interview angles

- State the node content and the identity element before writing code.
- Explain why a query is O(log n).
- Choose Fenwick if sums with point updates are all you need, and say why.

## Connections

Fenwick trees for invertible prefix operations; sparse tables for static idempotent queries; lazy propagation for range updates; heavy-light decomposition for path queries on trees.
`,
    doubts: [
      ["Why 4n space?", "With n not a power of two, the recursive tree's heap indices can reach just under 4n. 4n is a safe bound without computing the exact size."],
      ["Why does a range query visit only O(log n) nodes?", "At each depth at most two nodes partially overlap the query (the ones containing ql and qr); all others are either fully inside (returned immediately) or disjoint. So the work is a constant times the height."],
      ["Fenwick or segment tree?", "Fenwick for prefix-invertible operations with point updates (sums). Segment tree for min/max, custom merges, or range updates."],
      ["Should I store the segment bounds in each node?", "Not necessary: pass (l, r) down the recursion and compute the middle on the fly. Storing them costs memory and offers little speed. In the iterative version, positions implicitly define the segments."],
      ["Why use 4n and not 2n for the recursive tree?", "With the root at 1 and children at 2v and 2v + 1, an n that is not a power of two leaves gaps in the array, and indices can reach almost 4n. 2n suffices only for the iterative layout or when n is a power of two."],
      ["How do I combine non-commutative operations (like matrix products or string hashes) in the iterative tree?", "Keep two accumulators: resL for the left side (append on the right: resL = resL · t[l]) and resR for the right side (prepend: resR = t[r] · resR), then return resL · resR. The recursive version is naturally ordered."],
    ],
    revise: md`
? Segment tree costs? :: Build O(n); query and point update O(log n).
? Array size (recursive)? :: 4n.
? Partial overlap rule? :: Recurse into both children and merge.
? Max subarray node fields? :: total, best prefix, best suffix, best.
? Iterative layout? :: Leaves at n..2n−1; children 2i, 2i+1.
? Huge coordinate range? :: Compress, or a dynamic segment tree.
? Max subarray node combine? :: prefix = max(L.p, L.t + R.p); suffix = max(R.s, R.t + L.s); best = max(L.b, R.b, L.s + R.p).
? Identity for min queries? :: +∞ (for max −∞, sum 0, gcd 0, AND all-ones).
? First index ≥ l with a[i] ≥ x? :: Descend using child maxima: O(log n).
? Iterative tree size? :: 2n, leaves at n..2n−1.
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
## The problem

A plain segment tree updates one element in O(log n). Updating every element of a range [l, r] that way costs O(len · log n). **Lazy propagation** makes range updates O(log n) too: apply the update only to the O(log n) nodes that exactly cover the range, store a **tag** ("this whole segment still owes its children this update"), and push the tag down only when a later operation needs to look inside.

## The two rules

1. A node's stored aggregate is always **correct for its whole segment**, including its own pending tag. Only the children are out of date.
2. Before descending into a node's children (for a query or an update that partially overlaps), **push** its tag: apply it to both children's aggregates and tags, then clear it.

## Range add + range sum

Each node stores sum and a pending add.

- **Apply Δ to a node covering length len**: sum += Δ·len; lazy += Δ.
- **Push**: apply the node's lazy to each child (with the child's length), set lazy = 0.
- **Update [ql, qr] by Δ**: fully covered → apply and return; disjoint → return; otherwise push, recurse into both children, recompute sum from the children.
- **Query**: fully covered → return sum; disjoint → 0; otherwise push, recurse, add.

\`\`\`python
def apply(v, l, r, d):
    t[v] += d * (r - l + 1); lz[v] += d
def push(v, l, r):
    if lz[v]:
        m = (l + r) // 2
        apply(2 * v, l, m, lz[v]); apply(2 * v + 1, m + 1, r, lz[v]); lz[v] = 0
def update(v, l, r, ql, qr, d):
    if qr < l or r < ql: return
    if ql <= l and r <= qr: apply(v, l, r, d); return
    push(v, l, r); m = (l + r) // 2
    update(2 * v, l, m, ql, qr, d); update(2 * v + 1, m + 1, r, ql, qr, d)
    t[v] = t[2 * v] + t[2 * v + 1]
def query(v, l, r, ql, qr):
    if qr < l or r < ql: return 0
    if ql <= l and r <= qr: return t[v]
    push(v, l, r); m = (l + r) // 2
    return query(2 * v, l, m, ql, qr) + query(2 * v + 1, m + 1, r, ql, qr)
\`\`\`

Both operations visit O(log n) nodes for the same reason as plain queries.

## Range assign + range min

Tag = "the whole segment is set to x" (or none). Applying an assignment: min = x, tag = x. Push gives both children the assignment. An assignment **overrides** any older tag, because after it the old pending changes no longer matter.

## Composing tags

When one tree supports several update types, the tag must represent their **composition**, and applying a new update to an existing tag must produce the correct combined tag.

- **add then add**: add the amounts.
- **assign then add**: assign (x + Δ) — or keep (assign x, add Δ) as a pair.
- **add then assign**: the assign wins; drop the pending add.
- **Affine tags** x → a·x + b unify add (a = 1), multiply (b = 0) and assign (a = 0). Composition: applying (a₂, b₂) after (a₁, b₁) gives (a₂·a₁, a₂·b₁ + b₂), and the segment sum transforms as sum → a·sum + b·len. This is the cleanest general form (used for "range multiply and add, query sum mod p").
- **Flip bits** (LC 2569): tag = flip parity; applying a flip: ones = len − ones; two flips cancel.

Rule of thumb: define the tag as a function, define how a node's aggregate changes under it, and define function composition. If all three are O(1), lazy propagation works.

## Problems

- **Range Module** (LC 715): track covered intervals: assign 1 or 0 on ranges, query "all covered?" (store whether the segment is fully covered). Often solved with an ordered map of intervals instead.
- **Rectangle Area II** (LC 850): sweep x; a tree over compressed y with range "cover count += ±1" and "covered length" per node. A special case: no push needed, because the cover count never goes negative and each node's covered length is computed from its own count and children.
- **Falling Squares** (LC 699): range max query, then range assign of the new height.
- **My Calendar III** (LC 732): range add +1, global max query (dynamic tree for coordinates up to 10⁹).
- **Count of intervals covering points**, **amount of new area painted each day** (LC 2158).

## Dynamic (implicit) segment trees

When coordinates go up to 10⁹ and are not known in advance (online), create nodes only when an update or push reaches them. Each operation creates O(log C) nodes, so q operations use O(q log C) memory. Store children as indices into growing arrays (faster than objects). If all coordinates are known in advance, **coordinate compression** with a normal tree is simpler and faster.

## Interview angles

- State the two invariants: the node is correct for its whole segment; push before descending.
- For combined updates, say how tags compose (affine form if possible).
- Mention coordinate compression versus dynamic nodes for big coordinates.

## Connections

Segment trees without lazy handle point updates; difference arrays handle offline range additions; sweep-line plus lazy trees solve area and coverage problems.
`,
    doubts: [
      ["When must I push a tag?", "Whenever you are about to look at a node's children: before recursing for a partial-overlap query or update. Fully covered nodes do not need it; their value already reflects the tag."],
      ["Why does assign cancel pending adds?", "Assigning a value replaces whatever was there, including the effect of earlier pending additions, so those additions must be discarded rather than applied later."],
      ["Do I need to push during an update that fully covers a node?", "No: apply the update to the node (its aggregate and tag) and stop. Pushing is only needed when you must look at the children, i.e. on partial overlap."],
      ["Why must the parent be recomputed after recursing in an update?", "The children changed, and the parent's aggregate is defined from them. Because the parent's own tag was pushed down before recursing, recomputing from the children gives the correct value."],
      ["Can lazy propagation handle \"set each element to max(a[i], x)\" on a range?", "Not with a simple tag when queries ask for sums: chmax changes elements by different amounts. Segment tree beats handle it by storing the minimum and second minimum and pushing only when the update affects just the minimum elements. For min/max queries alone, a chmax tag composes simply."],
    ],
    revise: md`
? Lazy tag meaning? :: A pending update for the node's whole range, not yet applied to children.
? When to push? :: Before descending into children.
? Range add on a sum node? :: value += v × length; tag += v.
? Assign + add composition? :: Assign clears pending adds; later adds stack on the assigned value.
? Huge coordinates without compression? :: Dynamic segment tree.
? Affine tag composition? :: (a₂, b₂) after (a₁, b₁) = (a₂a₁, a₂b₁ + b₂); sum → a·sum + b·len.
? Range flip tag effect? :: ones = len − ones; two flips cancel.
? Rectangle Area II node? :: Cover count + covered length, no push needed.
? Dynamic tree memory? :: O(q log C) nodes created on demand.
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

Split the array into blocks of size B ≈ √n (about √n blocks). Keep an aggregate per block (sum, min, a sorted copy, counts, whatever the queries need).

- **Range query [l, r]**: walk the partial block at the left end element by element, then use the aggregates of the whole blocks in between, then the partial block at the right end: O(B + n/B) = O(√n).
- **Point update**: change the element and recompute (or adjust) its block's aggregate: O(1) to O(B).
- **Range update**: whole blocks get a lazy value (like a tag); partial blocks are updated element by element.

\`\`\`python
import math
class SqrtSum:
    def __init__(self, a):
        self.a, self.B = a[:], max(1, int(math.isqrt(len(a))))
        self.blk = [0] * ((len(a) + self.B - 1) // self.B)
        for i, x in enumerate(a): self.blk[i // self.B] += x
    def update(self, i, x):
        self.blk[i // self.B] += x - self.a[i]; self.a[i] = x
    def query(self, l, r):
        s, B = 0, self.B
        while l <= r and l % B: s += self.a[l]; l += 1
        while l + B - 1 <= r: s += self.blk[l // B]; l += B
        while l <= r: s += self.a[l]; l += 1
        return s
\`\`\`

Why it is worth knowing when segment trees exist: it is simpler for **operations that do not merge nicely**. Examples: "count elements ≤ x in a range, with updates" (keep each block sorted: O(√n log n) per query, O(√n) per update); "range add and query the number of elements equal to k" (per-block counters with a lazy offset); problems where a block can be rebuilt quickly but no O(1) merge exists. It is also a robust fallback under interview pressure.

**Choosing B**: balance the two costs. If a query costs O(B + (n/B)·c) and an update O(B), pick B to equalise them; √n is right when both parts cost about the same per element.

## Mo's algorithm (offline range queries)

Many queries [l, r] over a static array, where the answer can be maintained while the window grows or shrinks by one element (add(x), remove(x) in O(1)), but there is no fast merge: "number of distinct values in [l, r]", "number of pairs of equal values", "most frequent value count".

Idea: answer queries in an order that keeps the window moving little. Sort queries by (block of l, then r), with block size B ≈ √n, and move two pointers from one query to the next, calling add and remove.

- Within one block of l values, r moves monotonically: O(n) per block, O(n·√n) total.
- l moves at most B per query: O(q·√n) total.

Total O((n + q)·√n) add/remove calls. A common speed-up: alternate the r order (ascending for even blocks, descending for odd) so r does not jump back to the start each block.

\`\`\`python
def mo(a, queries, add, remove, answer):
    B = max(1, int(len(a) ** 0.5))
    order = sorted(range(len(queries)), key=lambda i: (queries[i][0] // B,
                    queries[i][1] if (queries[i][0] // B) % 2 == 0 else -queries[i][1]))
    L, R, res = 0, -1, [None] * len(queries)
    for i in order:
        l, r = queries[i]
        while R < r: R += 1; add(a[R])
        while L > l: L -= 1; add(a[L])
        while R > r: remove(a[R]); R -= 1
        while L < l: remove(a[L]); L += 1
        res[i] = answer()
    return res
\`\`\`

The order of the four loops matters: expand first, then shrink, so the window never becomes "negative" (L > R + 1), which would break counters.

Example: distinct values in a range: keep cnt[value] and distinct; add increments cnt and bumps distinct when it becomes 1; remove decrements and lowers distinct when it reaches 0.

**Mo's with updates**: add a time dimension (queries sorted by (block of l, block of r, time)) with block size n^(2/3): O(n^(5/3)) total. **Mo's on trees**: run it on an Euler tour.

## When to use which

| Situation | Tool |
|---|---|
| mergeable aggregate (sum, min, gcd), updates | segment tree / Fenwick |
| static, idempotent | sparse table |
| static, add/remove in O(1), no merge, offline | Mo's algorithm |
| online, awkward merges, moderate n (10⁵) | square-root decomposition |
| online distinct counts | persistent segment tree, or offline sort by r with a Fenwick tree |

## Interview angles

- Square-root decomposition is a legitimate fallback: explain blocks, partial and full, and O(√n).
- Mo's algorithm is a strong "name it" answer for offline distinct-count style queries.
- State the offline requirement explicitly.

## Connections

Segment trees replace blocks with a hierarchy; Mo's sorting is an instance of "reorder offline queries to share work", like sorting queries by threshold for union-find.
`,
    doubts: [
      ["Why is square-root decomposition worth knowing if segment trees exist?", "It is shorter to write, handles operations whose merge is awkward, and its block idea extends to problems like \"rebuild every √q operations\". With n = 10⁵, √n ≈ 316, so O(q√n) is often fast enough."],
      ["Why sort Mo's queries by l's block and then r?", "Within a block, l moves at most B per query and r moves monotonically (n per block), so total movement is O(q·B + (n/B)·n). Choosing B = √n balances it to O((n + q)√n)."],
      ["Why does Mo's algorithm need queries offline?", "Its speed comes from reordering the queries so consecutive windows overlap a lot. If each query had to be answered before the next arrived, you could not reorder them, and the pointers could jump O(n) per query."],
      ["How do I answer \"distinct values in [l, r]\" online instead?", "A persistent segment tree: for each position i, version i marks only the last occurrence of each value up to i; the answer is the number of marked positions in [l, r] in version r. Offline, sorting queries by r with a Fenwick tree does the same in O((n + q) log n)."],
      ["Is square-root decomposition fast enough in Python?", "For n and q around 10⁵, √n ≈ 316 steps per query gives about 3·10⁷ operations: borderline in Python, comfortable in C++ or Java. Use built-in functions (sum over slices) for the partial blocks to speed it up."],
    ],
    revise: md`
? Sqrt decomposition query cost? :: O(√n): whole blocks plus partial edges.
? Mo's requirement? :: O(1) add/remove of one element; offline queries.
? Mo's sort? :: By block of l, then r (alternating).
? Mo's complexity? :: O((n + q)√n).
? Choosing the block size? :: Balance per-query and per-update costs; √n when both are linear in block size.
? Mo's loop order? :: Expand (R up, L down) before shrinking (R down, L up).
? Mo's with updates block size? :: n^(2/3), total O(n^(5/3)).
? Distinct values add/remove? :: cnt[x] transitions 0↔1 change the distinct counter.
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
## Why caches are a design staple

A cache keeps a small amount of hot data close at hand, and an **eviction policy** decides what to drop when it is full. LRU (least recently used) and LFU (least frequently used) are the two policies interviewers ask you to implement with every operation in O(1). Both are compositions of a hash map with linked lists: the hash map finds an entry by key in O(1); the lists keep the eviction order so the victim is found in O(1) and reordering is O(1).

## LRU Cache (LC 146)

Operations: get(key) returns the value or −1 and marks the key as most recently used; put(key, value) inserts or updates and marks it most recent; if capacity is exceeded, evict the least recently used key.

Design:

- a **doubly linked list** ordered by recency: most recent at the head, least recent at the tail;
- a **hash map** key → list node.

get: look up the node; if found, unlink it and insert it at the head. put: if the key exists, update the value and move it to the head; otherwise create a node at the head, add it to the map, and if the size exceeds capacity, remove the node before the tail sentinel and delete its key from the map (so each node stores its key).

\`\`\`python
class Node:
    __slots__ = ("k", "v", "prev", "next")
    def __init__(self, k=0, v=0): self.k, self.v, self.prev, self.next = k, v, None, None

class LRUCache:
    def __init__(self, cap):
        self.cap, self.map = cap, {}
        self.head, self.tail = Node(), Node()          # sentinels
        self.head.next, self.tail.prev = self.tail, self.head
    def _unlink(self, n): n.prev.next, n.next.prev = n.next, n.prev
    def _push_front(self, n):
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n; self.head.next = n
    def get(self, k):
        n = self.map.get(k)
        if not n: return -1
        self._unlink(n); self._push_front(n); return n.v
    def put(self, k, v):
        n = self.map.get(k)
        if n: n.v = v; self._unlink(n); self._push_front(n); return
        n = Node(k, v); self.map[k] = n; self._push_front(n)
        if len(self.map) > self.cap:
            lru = self.tail.prev; self._unlink(lru); del self.map[lru.k]
\`\`\`

Why doubly linked: unlinking a node in O(1) needs its predecessor; a singly linked list would need an O(n) search. Why sentinels: they remove every null check at the ends (empty list, single node).

Library shortcuts: Python's OrderedDict (move_to_end(key), popitem(last=False)); Java's LinkedHashMap with accessOrder = true and an overridden removeEldestEntry. Interviewers usually want the explicit version, then accept a mention of these.

## LFU Cache (LC 460)

Evict the key with the smallest use count; among ties, the least recently used.

Design (all O(1)):

- key → (value, freq) map, plus key → node;
- freq → a doubly linked list (or an OrderedDict) of keys with that frequency, ordered by recency;
- minFreq, the smallest frequency currently present.

get(key): if absent, −1. Otherwise move the key from list[freq] to list[freq + 1] (at its most recent end); if list[freq] became empty and freq == minFreq, increment minFreq.

put(key, value): if capacity is 0, return. If the key exists, update the value and bump it as in get. Otherwise, if full, evict the least recent key of list[minFreq]; insert the new key with freq 1 into list[1] and set **minFreq = 1** (a new key always has the minimum frequency).

Why minFreq stays correct: it only changes in two ways: a bump can empty the minimum list, and then the bumped key sits at minFreq + 1, which is the new minimum; and a new insertion resets it to 1. Eviction happens only right before an insertion, so minFreq never needs to be searched for.

## Concurrency and production notes

- **Thread safety**: a single global lock serialises every get (because get mutates the order). Production caches shard by key hash (each shard with its own lock and list), or use lock-free approximations.
- **Approximate LRU**: updating a linked list on every read is expensive under contention. Redis samples a few keys and evicts the oldest among them; CLOCK (second-chance) uses a reference bit and a rotating hand, as in operating-system page replacement.
- **Better hit rates**: plain LRU is fooled by scans (a one-time sweep flushes hot data). Alternatives: LRU-K, 2Q, ARC, and W-TinyLFU (Caffeine, Java), which uses a count-min sketch to decide admission.
- **TTL and size**: real caches also expire entries by time and evict by bytes, not entry count.
- **Distributed caches** (Memcached, Redis) shard keys across nodes with consistent hashing.

## Interview angles

- Draw the map + list picture first; explain what each structure is for.
- Use sentinels; store the key in the node so eviction can delete it from the map.
- For LFU, explain the minFreq invariant; it is the part candidates get wrong.

## Connections

Hash map + doubly linked list also powers All O(1) Data Structure (LC 432), Max Stack, and browser history. Cache design leads to system-design topics: eviction policies, consistency and invalidation.
`,
    doubts: [
      ["Why a doubly linked list and not a singly linked one?", "Removing a node from the middle in O(1) needs its predecessor. The doubly linked list gives prev directly; with a singly linked list you would need an O(n) search."],
      ["Why sentinel head and tail?", "They remove all null checks when inserting at the front or removing the last node: every real node always has both neighbours."],
      ["How does LFU keep minFreq correct after eviction?", "A new key always has frequency 1, so after inserting it minFreq = 1. minFreq only increases on access when the old minimum bucket empties, by exactly one step."],
      ["What should put do when capacity is zero?", "Nothing: there is no room for any key, and evicting then inserting would leave the cache over capacity. Check for it explicitly; LC 460 includes this case."],
      ["Can LRU be implemented with a queue and a hash map without a linked list?", "With lazy deletion, yes: push (key, timestamp) on every access and keep the latest timestamp per key; when evicting, pop from the queue until you find an entry whose timestamp is current. Amortised O(1), but memory grows with accesses until cleanup."],
      ["How would you test an LRU cache?", "Capacity 1 and 2 edge cases, updating an existing key (it must become most recent without changing size), get on a missing key, and a sequence where the evicted key is the one accessed longest ago, not the one inserted earliest."],
    ],
    revise: md`
? LRU structures? :: Hash map key → node + doubly linked list by recency.
? LRU eviction? :: Remove the node before the tail sentinel; delete its key.
? LFU structures? :: key → (value, freq); freq → recency-ordered keys; minFreq.
? LFU new key sets minFreq to? :: 1.
? Library shortcuts? :: LinkedHashMap (access order) / OrderedDict.
? Production LRU at scale? :: Approximations (sampling, W-TinyLFU), sharded locks.
? Why store the key inside the LRU node? :: Eviction finds the node via the list and must delete its key from the map.
? LFU minFreq after inserting a new key? :: Always 1.
? CLOCK policy? :: Reference bit per entry + rotating hand: second chance before eviction.
? Why LRU fails on scans? :: A one-time sweep evicts the hot set; TinyLFU/2Q/ARC resist it.
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
## What an iterator promises

An iterator walks a collection one element at a time with two calls: hasNext() (is there another element?) and next() (return it and advance). Iterator design questions test whether you can produce elements **lazily**, keep only O(depth) or O(1) state instead of copying everything, and make hasNext() safe to call any number of times.

## Principles

- **hasNext() must be idempotent**: calling it twice in a row must not skip or change anything. Do any work needed to find the next element inside hasNext() (or a helper it calls), and cache the result until next() consumes it.
- **next() should be cheap** and rely on hasNext() having prepared the element.
- **Keep the minimum state**: indices into the underlying data, a stack of positions, or one look-ahead element. Flattening everything into a list up front works but costs O(total) memory and time before the first element.
- **Specify what happens on misuse**: next() when hasNext() is false (throw, as Java's NoSuchElementException).

## Patterns

**Peeking Iterator** (LC 284): wrap an iterator and add peek(). Keep one cached element and a flag. peek() fills the cache if empty and returns it; next() returns the cache if present (clearing it) or delegates; hasNext() is "cache present or the underlying iterator has more".

**Flatten Nested List Iterator** (LC 341): elements are integers or nested lists. Keep a **stack of iterators** (or of (list, index) pairs). hasNext(): while the stack is not empty, look at the top iterator; if it is exhausted, pop it; if its next element is a list, advance past it and push an iterator over that list; if it is an integer, return true (leave it ready). next() returns the prepared integer. Memory is O(depth), and empty lists like [[], [[]]] are handled because hasNext() keeps unrolling until it finds an integer or the stack empties.

\`\`\`python
class NestedIterator:
    def __init__(self, nested):
        self.stack = [[nested, 0]]
    def _prepare(self):
        while self.stack:
            lst, i = self.stack[-1]
            if i == len(lst): self.stack.pop(); continue
            if lst[i].isInteger(): return True
            self.stack[-1][1] += 1
            self.stack.append([lst[i].getList(), 0])
        return False
    def hasNext(self): return self._prepare()
    def next(self):
        self._prepare()
        lst, i = self.stack[-1]; self.stack[-1][1] += 1
        return lst[i].getInteger()
\`\`\`

**Flatten 2D Vector** (LC 251): two indices (row, col); hasNext() advances row while the current row is exhausted (skipping empty rows).

**Zigzag Iterator** (LC 281) and its k-list generalisation: a queue of non-empty iterators; next() pops one, takes an element, and pushes it back if it still has elements: round robin.

**BST Iterator** (LC 173): a stack holding the left spine; next() pops and pushes the left spine of the popped node's right child. Amortised O(1), O(h) memory.

**RLE Iterator** (LC 900): keep an index into the encoding and how much of the current run remains; next(n) consumes runs without expanding them: O(1) amortised per run.

**Merging iterators**: merge k sorted iterators with a heap of (value, iterator id); interleave by priority; dedupe consecutive equal values by remembering the last output.

**Range and generator iterators**: Python's range, itertools.chain, islice, and generator functions produce elements on demand with O(1) memory.

## Generators

In Python, a generator function turns these designs into a few lines, because the language keeps the traversal state for you:

\`\`\`python
def flatten(nested):
    for x in nested:
        if x.isInteger(): yield x.getInteger()
        else: yield from flatten(x.getList())
\`\`\`

An iterator class can then hold the generator and a one-element look-ahead to implement hasNext(). Interviewers often accept the generator version after you have shown you could write the explicit stack.

## Interview talking points

- **Memory**: lazy iterators need O(depth) or O(1); eager flattening needs O(n) and delays the first element.
- **Modification during iteration**: Java's collections detect it and throw ConcurrentModificationException (fail-fast); concurrent collections offer weakly consistent iterators; say what your design does.
- **Infinite or streaming sources**: only lazy iterators work.
- **Thread safety**: iterators are normally single-consumer; sharing one across threads needs external locking.

## Connections

Iterator stacks are explicit DFS; BST iterators reuse in-order traversal; merging iterators is k-way merge; Python generators are coroutines that suspend and resume.
`,
    doubts: [
      ["Why advance in hasNext instead of next?", "next may be called after a sequence of empty sub-lists; doing the skipping in hasNext ensures it always knows whether a real element exists. next can then simply return it."],
      ["Flatten eagerly into a list instead?", "Correct, simpler, but O(total) memory and time up front. Interviewers usually want the lazy version; mention both."],
      ["Why prepare the next element in hasNext() rather than in next()?", "Callers often call hasNext() before every next(), and sometimes several times. If hasNext() only checked the current position without preparing, nested structures with empty lists would report \"true\" and then next() would have nothing to return. Preparing in hasNext() (idempotently) makes both calls consistent."],
      ["How do I implement remove() on an iterator?", "Track the last returned element (or position) and delete it from the underlying collection, adjusting the internal index so the next element is not skipped. Allow remove() only once per next(), as Java's Iterator contract requires."],
      ["Is a generator always better than an explicit iterator class?", "It is shorter and lazy, but recursive generators add overhead per level (yield from chains), and some interviews or languages (Java before virtual threads, C++) need an explicit state machine. Know both."],
    ],
    revise: md`
? Where should skipping happen? :: In hasNext (idempotent).
? Nested list iterator structure? :: Stack of (list, index) or of iterators.
? Peeking iterator? :: Cache the next element.
? Zigzag over k sources? :: Queue of iterators, requeue if not exhausted.
? BST iterator memory? :: O(h).
? Peeking iterator state? :: One cached element + a flag; peek fills it, next consumes it.
? Nested iterator handles [[], [[]]] how? :: hasNext keeps unrolling until an integer is ready or the stack is empty.
? RLE iterator next(n)? :: Consume runs with an index and remaining count, never expanding.
? Fail-fast iterator? :: Throws on concurrent modification (Java ConcurrentModificationException).
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
## The pattern

Some data structures must answer questions about the **past**: "what was the value at time t?", "what was element i at snapshot s?". Copying the whole structure per version wastes memory. The standard trick is to store, **per key, the history of changes** as a list of (version, value) pairs in increasing version order, and answer a query for version v by binary searching the last change at or before v. Writes append (O(1)); reads binary search (O(log changes)); memory is proportional to the number of changes, not to versions × size.

## Time-Based Key-Value Store (LC 981)

set(key, value, timestamp) with strictly increasing timestamps; get(key, t) returns the value with the largest timestamp ≤ t, or "".

\`\`\`python
import bisect
from collections import defaultdict
class TimeMap:
    def __init__(self):
        self.times, self.vals = defaultdict(list), defaultdict(list)
    def set(self, k, v, t):
        self.times[k].append(t); self.vals[k].append(v)
    def get(self, k, t):
        i = bisect.bisect_right(self.times[k], t) - 1
        return self.vals[k][i] if i >= 0 else ""
\`\`\`

bisect_right finds the first timestamp > t; one step back is the last ≤ t. Separate parallel lists avoid comparing (timestamp, value) tuples. If timestamps could arrive **out of order**, appending breaks the sorted order: use an ordered map per key (TreeMap.floorEntry in Java, SortedDict in Python), or insort (O(n) per insert).

## Snapshot Array (LC 1146)

set(index, val), snap() returns a snapshot id, get(index, snap_id).

Copying the array on every snap is O(n) per snap and O(n · snaps) memory. Instead, keep per index a list of (snap_id, value) recorded only when the index changes; snap() just increments a counter. For get(index, s), binary search the last record with snap_id ≤ s. If several sets happen to the same index within one snapshot, overwrite the last record instead of appending, so each index has at most one record per snapshot.

Initial state: give each index an implicit (0, 0) record (or treat "no record" as 0).

## Stock Price Fluctuation (LC 2034)

Updates (timestamp, price) may **correct** earlier timestamps; queries ask for the latest price, the maximum and the minimum among current prices.

- timestamp → price map, plus the latest timestamp seen.
- Max-heap and min-heap of (price, timestamp) pairs, with **lazy deletion**: when reading the top, discard it if map[timestamp] no longer equals its price.
- Or a sorted multiset of current prices: remove the old price, insert the new one.

## Versioned and persistent structures

When versions branch, or a whole structure (not just individual keys) must be queryable at any version:

- **Fat nodes**: every field stores its history (what Snapshot Array does per index).
- **Path copying**: an update copies only the nodes on the root-to-leaf path it touches, so each version is a new root sharing all unchanged subtrees (persistent segment trees, immutable maps in Clojure and Scala, Git's tree objects).
- **MVCC** in databases (PostgreSQL, InnoDB): each row version carries creation and deletion transaction ids; a transaction reads the versions visible at its snapshot; old versions are vacuumed when no snapshot needs them.
- **Event sourcing**: store the log of changes and rebuild state at any time by replaying (with periodic snapshots to bound replay cost).

## Design discussion points

- **Read/write mix**: appends are cheap; reads pay log(changes). If reads dominate and versions are few, full snapshots may be simpler.
- **Garbage collection**: which old versions can be dropped (retention windows, no live readers).
- **Timestamp source**: client versus server clocks; out-of-order or duplicate timestamps need an ordered structure and a tie rule.
- **Memory per key**: hot keys with long histories may need compaction (keep one value per time bucket).
- **Concurrency**: append-only logs per key are friendly to concurrent readers; writers need ordering.

## Interview angles

- Say "per-key history plus binary search" and the costs.
- Handle the boundary: no value at or before t.
- Mention what changes if timestamps are not monotonic.

## Connections

Binary search on sorted histories; persistent data structures via path copying; MVCC and event sourcing in system design; lazy deletion for corrected values.
`,
    doubts: [
      ["Why does Snapshot Array store per-index change lists?", "Most indices do not change between snapshots. Recording only changes makes snapshot O(1) and keeps memory proportional to the number of set operations."],
      ["How do I handle out-of-order timestamps?", "Use an ordered map per key (TreeMap.floorEntry, or bisect.insort for moderate sizes) instead of appending to a list."],
      ["Why not store a full copy of the array at each snap in Snapshot Array?", "With n = 5·10⁴ and 5·10⁴ snaps, full copies would be 2.5·10⁹ entries. Recording only changes keeps memory proportional to the number of set calls, which the problem bounds."],
      ["How does Git store versions efficiently?", "Content-addressed objects: each file version is a blob identified by its hash, directories are trees of hashes, and a commit points to a root tree. Unchanged files and directories are shared between commits: path copying with hashes as pointers."],
      ["When does event sourcing beat storing current state?", "When the history itself matters (audits, replays, temporal queries) or when many views must be derived from the same events. The cost is rebuild time, mitigated by periodic snapshots, and the complexity of evolving event schemas."],
    ],
    revise: md`
? Time-based get? :: Binary search the last timestamp ≤ t in the key's list.
? Snapshot Array idea? :: Per-index (snap_id, value) change lists + binary search.
? Price corrections with max/min? :: Map of time → price + two heaps with lazy deletion.
? Systems analogue? :: MVCC in databases.
? Snapshot Array: multiple sets in one snapshot? :: Overwrite the last record if its snap_id equals the current one.
? TimeMap lookup? :: bisect_right(times, t) − 1; −1 means "".
? Out-of-order timestamps? :: Ordered map per key (floorEntry / SortedDict).
? MVCC visibility? :: Row versions tagged with transaction ids; read what the snapshot can see.
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
## The problem

Design a set with insert, remove and **getRandom** (return a uniformly random element), each in average O(1) (Insert Delete GetRandom O(1), LC 380). A hash set alone gives O(1) insert and remove, but picking a uniform random element from it needs either O(n) iteration or knowledge of its internal buckets, which are unevenly filled and partly empty. An array alone gives O(1) random access, but removing an arbitrary value needs O(n) to find it and shift. Combining them gives everything.

## RandomizedSet (LC 380)

- **values**: a dynamic array holding the elements in arbitrary order.
- **pos**: a hash map value → its index in values.

insert(x): if present, return false; else append x and set pos[x] = len − 1.

remove(x): if absent, return false. Otherwise, let i = pos[x] and last = values[−1]. Move last into slot i (values[i] = last, pos[last] = i), pop the end of the array, and delete pos[x]. The order of the array does not matter, so filling the hole with the last element avoids shifting.

getRandom(): values[random index].

\`\`\`python
import random
class RandomizedSet:
    def __init__(self): self.vals, self.pos = [], {}
    def insert(self, x):
        if x in self.pos: return False
        self.pos[x] = len(self.vals); self.vals.append(x); return True
    def remove(self, x):
        if x not in self.pos: return False
        i, last = self.pos[x], self.vals[-1]
        self.vals[i], self.pos[last] = last, i       # works even when x is last
        self.vals.pop(); del self.pos[x]
        return True
    def getRandom(self): return random.choice(self.vals)
\`\`\`

The edge case: when x is itself the last element, last == x; the code writes x onto itself, sets pos[x] = i, then pops and deletes pos[x]. The order of operations above (update first, delete pos[x] last) makes it correct without a special case.

All operations are O(1) on average (hash map expected O(1), array append and pop amortised O(1)).

## With duplicates (LC 381)

RandomizedCollection allows repeated values, and getRandom must be weighted by multiplicity (each copy equally likely). Use value → **set of indices**.

remove(x): pick any index i from pos[x] (pop it from the set). Let last = values[−1] at index L = len − 1. Move last into slot i: values[i] = last; in pos[last], remove L and add i. Then pop the array. Order matters when last == x and i == L: remove i from pos[x] first, and only then add/remove for last, guarding the case i == L (no move needed). Delete pos[x] when its set becomes empty.

getRandom stays a uniform index into the array, which is automatically weighted by multiplicity.

## Why not just a hash set?

Picking "a random key" from a hash table by probing random buckets until a non-empty one is found is biased: a value sharing a bucket chain with others is less likely than one alone, and empty buckets waste probes. Languages do not expose buckets anyway; converting to a list costs O(n). The array is what makes uniform sampling O(1).

## Related designs

- **Random Pick with Blacklist** (LC 710): pick uniformly from [0, n) excluding a blacklist without O(n) memory. Let m = n − |blacklist|: sample r in [0, m); if r is blacklisted, map it to a whitelisted number in [m, n) via a precomputed dictionary (pair each blacklisted number below m with a free number at or above m).
- **Random Pick Index** (LC 398): uniform index among occurrences of a target, with reservoir sampling over the array (O(1) extra space) or a precomputed value → indices map.
- **Random Pick with Weight** (LC 528): prefix sums plus binary search.
- **Shuffle an Array** (LC 384): Fisher–Yates.
- **Weighted random with updates**: a Fenwick tree over weights and a descent to the r-th unit of weight: O(log n) per update and pick.
- **Load balancers and sampling services**: "pick a random healthy server" with servers joining and leaving is exactly this structure.

## Interview angles

- Explain why each structure alone fails, then the swap-with-last trick.
- Handle the "removing the last element" case.
- For duplicates, value → set of indices; be careful with the order of updates.

## Connections

Swap-with-last deletion is a general O(1) removal trick for unordered arrays; reservoir sampling and prefix-sum sampling cover the other random-pick problems.
`,
    doubts: [
      ["Why swap with the last element on removal?", "Removing from the middle of an array is O(n). Moving the last element into the hole keeps the array dense, and order does not matter for a set."],
      ["What if the removed value is the last element itself?", "Then the swap is with itself; update the map before popping, or handle the case explicitly so you do not reinsert a deleted index."],
      ["Is getRandom truly uniform with random.choice on the array?", "Yes: every element occupies exactly one slot, and a uniform random index picks each slot with probability 1/len. Removals keep the array dense (no holes), which preserves uniformity."],
      ["Why use a set of indices (not a list) per value in LC 381?", "Removal must delete one specific index (the moved element's old position) from its owner's collection in O(1). A set supports that; a list would need an O(k) search."],
      ["Can this structure also support \"remove a random element\"?", "Yes: pick a random index, take its value, and run the normal remove on it: O(1)."],
    ],
    revise: md`
? Structures? :: Array of values + map value → index.
? Remove in O(1)? :: Swap with the last element, update its index, pop.
? Duplicates? :: Map value → set of indices.
? Why not a hash set alone? :: No O(1) uniform sampling.
? Blacklist pick (LC 710)? :: Sample in [0, m); remap blacklisted values below m to free values ≥ m.
? Weighted pick with updates? :: Fenwick over weights + descent: O(log n).
? Duplicates getRandom weighting? :: Uniform array index is automatically weighted by multiplicity.
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
## Counting over a moving window of time

Many design questions count events in "the last N seconds": hits on a page, requests from a client, log messages, average latency. The data arrives as a stream with timestamps, old events must stop counting, and each operation should be O(1) or amortised O(1) with bounded memory. Three structures cover almost everything: a **queue of timestamps**, **circular buckets**, and **running aggregates**.

## Hit Counter (LC 362)

hit(t) records a hit at time t (seconds, non-decreasing); getHits(t) returns hits in the last 300 seconds, i.e. (t − 300, t].

**Queue**: append t on every hit; in getHits, pop from the front while front ≤ t − 300; return the length. Amortised O(1) (each timestamp is pushed and popped once), but memory grows with the number of hits in the window (millions per window on a busy endpoint).

**Circular buckets** (the follow-up for high rates): 300 slots, each holding (timestamp, count). For hit(t): slot = t % 300; if slot.timestamp ≠ t, reset it to (t, 1); else increment. For getHits(t): sum the counts of slots whose timestamp > t − 300. O(300) per query, O(1) per hit, and **O(window) memory regardless of the hit rate**. Precision is one second; finer resolution needs more buckets.

**Concurrency**: hits from many threads need per-bucket atomic counters, or striped counters merged at read time.

## Logger Rate Limiter (LC 359)

shouldPrintMessage(t, msg): print if the same message was not printed in the last 10 seconds.

Map msg → the next allowed time. If t ≥ next[msg], print and set next[msg] = t + 10. The map grows with distinct messages forever; bound it by also keeping a queue of (time, msg) and removing entries older than 10 seconds (only if the map still holds that same time), or by periodically sweeping.

## Moving Average from Data Stream (LC 346)

A queue of the last k values and a running sum: add the new value, subtract the evicted one. O(1) per value. Variants:

- **Exponential moving average**: avg = α·x + (1 − α)·avg: one number of state, more weight on recent values (used in load estimates and TCP round-trip-time estimates).
- **Moving median**: two heaps with lazy deletion or a sorted multiset.
- **Moving maximum**: monotonic deque.

## Rate limiting algorithms

| Algorithm | Idea | Pros | Cons |
|---|---|---|---|
| Fixed window counter | count per window (e.g. per minute), reset at boundaries | O(1) memory per key | allows up to 2× the limit around a boundary |
| Sliding window log | store every request timestamp, drop old ones | exact | memory per request |
| Sliding window counter | current count + previous count × fraction of the previous window still overlapping | O(1), smooth | approximation (assumes uniform spread) |
| Token bucket | tokens refill at rate r up to capacity b; a request takes a token | allows bursts up to b, smooth average | two parameters to tune |
| Leaky bucket | queue drained at a constant rate | smooth output | adds latency; drops when full |

The fixed-window problem: with a limit of 100 per minute, 100 requests at 12:00:59 and 100 at 12:01:00 are both allowed: 200 in two seconds.

Token bucket in O(1) without a timer: store tokens and the last refill time; on each request, tokens = min(b, tokens + (now − last)·r), last = now; allow if tokens ≥ 1 (then subtract 1).

**Distributed rate limiting**: counters in a shared store (Redis INCR with EXPIRE, or a Lua script to make check-and-increment atomic), or local limits per node with the global limit divided among them; accept small overshoot for lower latency. API gateways (Envoy, NGINX, cloud gateways) implement these.

## Data stream statistics

- **Running median**: two heaps.
- **Top-k frequent** in a huge stream: count-min sketch for approximate counts plus a min-heap of the current top k (heavy hitters); or Misra–Gries / space-saving counters with k slots.
- **Distinct count**: HyperLogLog (about 1.5 KB for ~2% error over billions of items).
- **Percentiles of latency**: t-digest or HDR histograms.
- **Sampling**: reservoir sampling for a uniform sample of unknown-length streams.

## Interview angles

- Start with the queue, then say what breaks at high rates (memory) and move to buckets.
- For rate limiters, name at least fixed window, sliding window and token bucket with their trade-offs.
- Discuss concurrency and distribution once the single-node version works.

## Connections

Sliding windows on arrays, monotonic deques for window maxima, heaps for medians, probabilistic sketches for large-scale counting; rate limiting is a core system-design topic.
`,
    doubts: [
      ["Why are circular buckets better than a queue for the hit counter?", "Memory and work per query depend only on the window size (300), not on traffic. With millions of hits per second, a queue of timestamps would be huge."],
      ["Why does a fixed window allow double the limit?", "A client can send the full limit at the end of one window and again at the start of the next, so a short interval spanning the boundary sees twice the limit."],
      ["What happens to circular buckets if no hits arrive for a long time?", "Stale slots keep old (timestamp, count) pairs, but getHits ignores slots whose timestamp is outside the window, and hit() resets a slot when its timestamp differs. So correctness does not depend on regular traffic."],
      ["How do I make a Redis-based limiter atomic?", "A plain GET then INCR can race between servers. Use INCR first and compare the returned value (with EXPIRE set when the key is created), or a Lua script that reads, checks and updates in one atomic step, or Redis sorted sets for sliding logs inside a MULTI transaction."],
      ["Which limiter should a public API use?", "Token bucket is the common default: it allows short bursts (good user experience) while enforcing an average rate, needs O(1) state per client, and is easy to explain in headers (limit, remaining, reset)."],
    ],
    revise: md`
? Scalable hit counter? :: Circular buckets of size W indexed by t mod W.
? Logger rate limiter? :: Map message → last printed time.
? Token bucket? :: Tokens refill at rate r up to capacity b; each request takes one.
? Fixed window flaw? :: Boundary bursts up to 2× the limit.
? Distinct count at scale? :: HyperLogLog.
? Token bucket refill without a timer? :: tokens = min(b, tokens + (now − last)·r) on each request.
? Sliding window counter estimate? :: current + previous × (fraction of previous window still overlapping).
? Bounded Logger memory? :: Queue of (time, msg) to drop entries older than 10 s.
? Exponential moving average? :: avg = α·x + (1 − α)·avg.
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
## The idea

A sorted linked list has O(n) search because you can only walk one node at a time. A **skip list** (William Pugh, 1990) adds "express lanes": extra linked lists on top, each containing a random subset of the level below. Searching starts on the sparsest top level, moves right while the next key is smaller than the target, and drops a level when it cannot. With each element promoted to the next level with probability p (usually 1/2 or 1/4), the expected number of levels is log_(1/p) n and the expected search path is O(log n): balanced-tree performance from coin flips, without rotations.

## Structure

- Level 0: a sorted linked list of every element.
- Level i: each element of level i − 1 appears here with probability p.
- A head sentinel with the maximum number of levels; each node has an array of forward pointers, one per level it belongs to.
- A cap on levels (about 16 for 2¹⁶ elements with p = 1/2, or 32) bounds memory.

Expected space: n · (1 + p + p² + …) = n / (1 − p) pointers: 2n for p = 1/2, about 1.33n for p = 1/4.

## Operations

**Search(target)**: from the head at the top level, move right while next.key < target, then drop down; at level 0, the next node is the candidate: compare with target.

**Insert(key)**: search as above, recording at each level the last node visited before dropping (the update array). Draw a random height h (flip coins until tails, capped). Create the node and splice it in after update[i] at every level i < h.

**Delete(key)**: search with an update array; if the node exists, unlink it at every level where update[i].next is that node.

\`\`\`python
import random
class Node:
    __slots__ = ("key", "next")
    def __init__(self, key, h): self.key, self.next = key, [None] * h

class Skiplist:
    MAX = 16
    def __init__(self): self.head, self.level = Node(-1, self.MAX), 1
    def _path(self, key):
        update, x = [None] * self.MAX, self.head
        for i in range(self.level - 1, -1, -1):
            while x.next[i] and x.next[i].key < key: x = x.next[i]
            update[i] = x
        return update
    def search(self, key):
        nxt = self._path(key)[0].next[0]
        return nxt is not None and nxt.key == key
    def add(self, key):
        update, h = self._path(key), 1
        while h < self.MAX and random.random() < 0.5: h += 1
        for i in range(self.level, h): update[i] = self.head
        self.level = max(self.level, h)
        n = Node(key, h)
        for i in range(h):
            n.next[i], update[i].next[i] = update[i].next[i], n
    def erase(self, key):
        update = self._path(key); x = update[0].next[0]
        if not x or x.key != key: return False
        for i in range(len(x.next)):
            update[i].next[i] = x.next[i]
        while self.level > 1 and not self.head.next[self.level - 1]: self.level -= 1
        return True
\`\`\`

That is **Design Skiplist** (LC 1206), duplicates allowed.

## Why the expected cost is logarithmic

Trace a search **backwards** from the found node to the head: at each step, the path either came from the left on the same level or from the level above. A node's height is "level i + 1" with probability p, so moving up happens with probability p and moving left with 1 − p. The expected number of left moves per level is (1 − p)/p, and there are log_(1/p) n levels: total O(log n / p · …) = O(log n) for constant p. The probability of a much longer path decays exponentially, so with high probability every operation is O(log n).

## Why use it instead of a balanced tree

- **Simpler code**: no rotations or colour cases; insertion and deletion are local splices.
- **Concurrency**: splicing is local, so lock-free skip lists are practical (Java's ConcurrentSkipListMap); concurrent balanced trees are much harder because rotations touch several nodes.
- **Range scans**: level 0 is a sorted linked list.
- **Ordered iteration and rank**: storing span widths on forward pointers gives rank and index access in O(log n).

Where they are used: **Redis sorted sets** (a skip list with spans plus a hash map from member to score), **LevelDB and RocksDB memtables**, Lucene's posting lists (skip pointers for fast intersections).

Costs: extra pointers per node, worse cache locality than array-based B-trees, and only **expected** (not worst-case) bounds, although bad cases are astronomically unlikely with a decent random source.

## Interview usage

Explain levels, coin flips, the update array, and the expected O(log n). Implement LC 1206 if asked; otherwise mention skip lists as the concurrent ordered map and as the structure behind Redis sorted sets.

## Connections

Balanced BSTs and B-trees give the same operations deterministically; treaps share the "randomness buys balance" idea; skip pointers in inverted indexes speed up list intersections.
`,
    doubts: [
      ["Why is the expected height logarithmic?", "A node reaches level k with probability p^k, so the expected number of nodes at level log_{1/p} n is about 1; beyond that levels are almost surely empty."],
      ["Is the worst case bad?", "Yes, O(n) with tiny probability (all coin flips going badly). Expected bounds hold for every input because the randomness is internal."],
      ["Why cap the maximum level?", "Without a cap, an unlucky run of heads could create a very tall node and waste memory in the head's pointer array. A cap around log_(1/p) of the maximum expected size (16–32) changes the expected cost negligibly."],
      ["Does p = 1/4 make searches slower than p = 1/2?", "Slightly more comparisons per level (about 3 instead of 2 on average) but fewer levels and fewer pointers per node. Redis uses p = 1/4 for memory reasons; the total expected cost stays O(log n) with a similar constant."],
      ["Can a skip list be deterministic?", "Yes: deterministic skip lists (1-2-3 skip lists) maintain gaps between promoted nodes like a B-tree, giving worst-case O(log n), but they lose the simplicity that makes skip lists attractive."],
    ],
    revise: md`
? Promotion probability? :: p, typically 1/2 or 1/4.
? Expected search/insert/delete? :: O(log n).
? Expected space? :: n/(1 − p) nodes.
? Search walk? :: Right while next < x, else down.
? Where used? :: Redis sorted sets, LevelDB memtables, ConcurrentSkipListMap.
? Expected pointers per node? :: 1/(1 − p): 2 for p = 1/2, ~1.33 for p = 1/4.
? Backward-path argument? :: Each step goes up with probability p, so ~1/p steps per level over log_(1/p) n levels.
? Redis sorted set internals? :: Skip list with spans + hash map member → score.
? Rank in a skip list? :: Store span widths on forward pointers.
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
## Traversal is index bookkeeping

Matrix traversal problems (spiral, rotation, diagonals) have no clever algorithm: they are about generating indices in the right order without off-by-one errors. Two techniques keep them reliable: **shrinking boundaries** and **direction vectors with a turn rule**. Doing a small 3 × 4 example by hand before coding catches almost every bug.

## Spiral Matrix (LC 54, 59)

**Boundaries**: top, bottom, left, right. Repeat while top ≤ bottom and left ≤ right:

1. left → right along row top; then top += 1.
2. top → bottom along column right; then right −= 1.
3. if top ≤ bottom: right → left along row bottom; then bottom −= 1.
4. if left ≤ right: bottom → top along column left; then left += 1.

\`\`\`python
def spiral(m):
    out = []
    top, bottom, left, right = 0, len(m) - 1, 0, len(m[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1): out.append(m[top][c])
        top += 1
        for r in range(top, bottom + 1): out.append(m[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1): out.append(m[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1): out.append(m[r][left])
            left += 1
    return out
\`\`\`

The checks before steps 3 and 4 matter when a single row or column remains: without them that row or column would be read twice (forwards and backwards).

**Direction vectors**: dirs = right, down, left, up; move until the next cell is out of bounds or visited, then turn (d = (d + 1) % 4). Needs a visited matrix (or a sentinel value), but generalises to irregular shapes.

**Spiral Matrix II** (LC 59): fill 1..n² in the same order. **Spiral Matrix III** (LC 885): walk an outward spiral from a start cell with step lengths 1, 1, 2, 2, 3, 3, …, recording only cells inside the grid. **Spiral Matrix IV** (LC 2326): fill from a linked list.

## Rotate Image (LC 48)

Rotate an n × n matrix 90° clockwise in place.

**Transpose, then reverse each row.** Transposing swaps a[i][j] with a[j][i] for j > i (the element at (i, j) moves to (j, i)); reversing a row maps column j to n − 1 − j. Together (i, j) → (j, n − 1 − i), which is exactly the clockwise rotation.

- Counter-clockwise: transpose, then reverse each **column** (or reverse each row first, then transpose).
- 180°: reverse each row, then reverse the order of rows.

**Four-way cycles**: for each layer and each offset, rotate the four cells (top, right, bottom, left) at once with one temporary variable. Same O(n²), one pass.

Non-square matrices cannot rotate in place (the shape changes); build a new C × R matrix with result[j][R − 1 − i] = a[i][j].

## Diagonals

- Cells on the same **diagonal** (top-left to bottom-right) share r − c.
- Cells on the same **anti-diagonal** share r + c (from 0 to R + C − 2).

**Diagonal Traverse** (LC 498): iterate s = r + c from 0 to R + C − 2; for even s walk up-right, for odd s down-left (or collect each anti-diagonal and reverse every other one). **Sort the Matrix Diagonally** (LC 1329): group by r − c, sort each group, write back. **Toeplitz Matrix** (LC 766): every cell equals its up-left neighbour. **Anti-diagonal grouping** also gives Diagonal Traverse II (LC 1424, ragged rows): bucket by r + c, append in row order, output each bucket reversed.

## Other traversals

- **Snake (boustrophedon)**: alternate the direction per row (Snakes and Ladders board numbering, LC 909).
- **Layer rotation** (Cyclically Rotating a Grid, LC 1914): extract each layer as a list, rotate it by k mod its length, write it back.
- **Transpose** (LC 867): for non-square matrices, a new matrix.
- **Reshape** (LC 566): index k maps to (k // C, k % C) in both shapes.
- **Game boards**: check rows, columns and both diagonals (Valid Tic-Tac-Toe, Design Tic-Tac-Toe LC 348 with counters per row, column and diagonal for O(1) moves).

## Interview angles

- Use boundaries for spirals and explain the two guard checks.
- Derive the rotation mapping (i, j) → (j, n − 1 − i) and show that transpose plus row reversal produces it.
- Use r − c and r + c keys for anything diagonal.

## Connections

Grid BFS/DFS uses the same direction vectors; in-place matrix updates use encoding tricks; matrix search uses the sorted structure instead of a fixed order.
`,
    doubts: [
      ["Why does transpose + reverse rows rotate clockwise?", "Transpose maps (i, j) → (j, i); reversing each row maps (j, i) → (j, n − 1 − i). Together (i, j) → (j, n − 1 − i), which is exactly the 90° clockwise rotation."],
      ["Why the extra checks in the spiral loop?", "For a single remaining row or column, the 'bottom row' or 'left column' pass would revisit cells already printed by the 'top row' or 'right column' pass."],
      ["How do I rotate a non-square matrix?", "Not in place: an R × C matrix becomes C × R. Allocate result with C rows and R columns and set result[j][R − 1 − i] = a[i][j] for a clockwise turn."],
      ["Why does Spiral Matrix III use step lengths 1, 1, 2, 2, …?", "Walking an outward square spiral, each side length grows by one after every two turns (right 1, down 1, left 2, up 2, right 3, …). Generating positions that way and keeping only those inside the grid visits every cell exactly once."],
      ["Is the direction-vector spiral slower than the boundary version?", "Both are O(R·C). The direction version needs a visited marker (extra memory or mutating the input); the boundary version needs none. Prefer boundaries unless the shape is irregular."],
    ],
    revise: md`
? Spiral boundary updates? :: top++, right−−, bottom−−, left++ with guards top ≤ bottom, left ≤ right.
? Rotate 90° clockwise in place? :: Transpose, then reverse each row.
? Same diagonal key? :: i − j; anti-diagonal: i + j.
? Flat index mapping? :: k → (k / C, k % C).
? Rotation mapping (clockwise)? :: (i, j) → (j, n − 1 − i).
? 180° rotation? :: Reverse each row, then reverse the row order.
? Design Tic-Tac-Toe O(1) move? :: Counters per row, column, diagonal and anti-diagonal (+1/−1 per player).
? Reshape mapping? :: Flat index k → (k // C, k % C).
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
## The difficulty

Many matrix problems compute a new value for every cell from the **old** values of other cells: "zero the whole row and column of every zero", "apply the Game of Life rules to all cells simultaneously". Writing results directly into the matrix destroys information that later cells still need. With O(R·C) extra memory you simply copy. The interview question is usually how to do it in **O(1)** extra space, and the answer is always one of three ideas: use part of the matrix as scratch space, encode old and new values in the same cell, or order the updates so dependencies are read first.

## Set Matrix Zeroes (LC 73)

Every zero must zero its entire row and column, based on the original zeros.

- O(R + C) space: record which rows and which columns contain a zero, then zero them.
- **O(1) space**: use the **first row** to record zero columns and the **first column** to record zero rows. But the first row and column are also data, so first remember separately whether they themselves contain a zero (two booleans).

1. firstRowZero = any zero in row 0; firstColZero = any zero in column 0.
2. For every other cell (r ≥ 1, c ≥ 1) that is zero: set m[r][0] = 0 and m[0][c] = 0.
3. For every other cell: zero it if m[r][0] == 0 or m[0][c] == 0.
4. Finally zero row 0 if firstRowZero and column 0 if firstColZero.

The first row and column are processed **last** because they hold the markers; zeroing them earlier would wipe information that step 3 still needs.

## Game of Life (LC 289)

Every cell's next state depends on its eight neighbours' **current** states. In place with O(1) extra space: store both states in each cell using bits.

- bit 0 = current state, bit 1 = next state.
- For each cell, count live neighbours using (neighbour & 1). If the next state is alive (2 or 3 neighbours for a live cell, exactly 3 for a dead one), set bit 1: cell |= 2.
- After the pass, shift every cell right by one: cell >>= 1.

An equivalent encoding uses extra state values: 2 = alive → dead, 3 = dead → alive, and reading "currently alive" as value in {1, 2}.

**Infinite board follow-up**: store only the coordinates of live cells in a set; count neighbours with a hash map over the eight neighbours of each live cell; the next generation is the cells with count 3, or count 2 and currently alive. Memory is proportional to live cells, and the board can be unbounded. For huge boards processed in chunks, keep only three rows in memory at a time.

## Simulation patterns

- **Candy Crush** (LC 723): mark every cell in a horizontal or vertical run of 3+ (negate its value, so the original value is still readable for overlapping runs), then apply gravity column by column with a write pointer from the bottom, filling the top with zeros. Repeat until stable.
- **Rotating the Box** (LC 1861): in each row, let stones fall to the right with a write pointer that resets at obstacles; then rotate the matrix.
- **Image Smoother** (LC 661): the average of the 3 × 3 neighbourhood; in place by storing the new value in the high bits (values are ≤ 255, so new << 8 | old), then shifting.
- **Flood fill and island marking**: overwrite visited cells with a marker; restore them at the end if the input must be preserved.
- **Transpose in place** (square only), **rotate in place**: swaps along symmetric pairs, which never overwrite something still needed.

## Principle

When an update must not see values already updated in the same pass, choose one of:

1. **Copy** the old state (simple, O(R·C) memory).
2. **Encode** old and new in the same cell (spare bits, negative numbers, extra state codes) and finalise in a second pass.
3. **Use the matrix's own cells as markers**, protecting the cells used as markers with separate flags and processing them last.
4. **Order the updates** so every value is read before it is overwritten (swaps along symmetric pairs, filling from the back).

State which one you use and why it is safe.

## Interview angles

- Give the O(R·C) or O(R + C) solution first, then the O(1) one.
- Explain exactly why the first row and column are handled last in Set Matrix Zeroes.
- For Game of Life, mention the infinite-board follow-up.

## Connections

Merging sorted arrays from the back, cyclic sort and negation marking in arrays use the same "encode in place" ideas; grid graph traversals use cell overwriting as their visited set.
`,
    doubts: [
      ["Why handle the first row and column last in Set Matrix Zeroes?", "They hold the flags for everyone else. Zeroing them early would destroy flags still needed for the inner cells."],
      ["Why does Game of Life need encoded states?", "Updating cells one at a time would let later cells read already-updated neighbours, which is wrong: the rules use the previous generation."],
      ["What goes wrong if I process row 0 before the other cells in Set Matrix Zeroes?", "Zeroing row 0 early writes zeros into every column marker, so step 3 would believe every column contains a zero and wipe the whole matrix."],
      ["Why does Candy Crush negate values instead of setting them to zero immediately?", "A cell can belong to both a horizontal and a vertical run. If you zeroed it during the horizontal scan, the vertical scan could no longer see that the run continues through it. Negation keeps the original value readable (by absolute value) while marking it for removal."],
      ["Is the bit-encoding trick allowed if the input is a list of booleans?", "Not directly: booleans cannot hold two bits. Use integers (most problems give 0/1 ints), or use the extra-state-code method with values like 2 and 3 when the type allows it."],
    ],
    revise: md`
? Set Matrix Zeroes O(1) space? :: First row/column as flags + two booleans; finish them last.
? Game of Life encoding? :: Next state in bit 1, current in bit 0; shift at the end.
? Infinite Game of Life? :: Set of live cells + neighbour counts map.
? Gravity simulation? :: Per column write pointer from the bottom.
? Set Matrix Zeroes markers? :: Row 0 marks zero columns, column 0 marks zero rows; two flags for row 0 and column 0 themselves.
? Game of Life finalise step? :: cell >>= 1 after setting bit 1 for next-alive cells.
? Image Smoother in place? :: Store new << 8 | old, then shift right by 8.
? Infinite Game of Life? :: Set of live cells + neighbour count map.
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
## Sorted matrices come in two kinds

The search strategy depends entirely on how the matrix is sorted:

1. **Fully sorted** (LC 74): each row is sorted, and the first element of each row is greater than the last of the previous row. Reading row by row gives one sorted array.
2. **Row- and column-sorted** (LC 240, Young tableau): each row is sorted left to right and each column top to bottom, but rows overlap in value ranges.

## Fully sorted (LC 74)

Treat the R × C matrix as a virtual sorted array of length R·C and binary search it: index k maps to (k // C, k % C). O(log(R·C)) time, O(1) space.

\`\`\`python
def search_matrix(m, target):
    R, C = len(m), len(m[0])
    lo, hi = 0, R * C
    while lo < hi:
        mid = (lo + hi) // 2
        if m[mid // C][mid % C] < target: lo = mid + 1
        else: hi = mid
    return lo < R * C and m[lo // C][lo % C] == target
\`\`\`

Equivalent: binary search the rows by their first element, then binary search inside the row. Same complexity.

## Rows and columns sorted (LC 240): the staircase

Start at the **top-right** corner. If the value is greater than the target, everything below it in that column is even larger: discard the column (move left). If it is smaller, everything to its left in that row is smaller: discard the row (move down). Each step removes a row or a column: O(R + C).

\`\`\`python
def search_2d(m, target):
    r, c = 0, len(m[0]) - 1
    while r < len(m) and c >= 0:
        if m[r][c] == target: return True
        if m[r][c] > target: c -= 1
        else: r += 1
    return False
\`\`\`

The **bottom-left** corner works symmetrically. The top-left and bottom-right do not: from the top-left, both moves increase the value, so a comparison cannot discard anything.

Lower bound: for this structure, Ω(R + C) comparisons are needed in the worst case when R and C are comparable, so the staircase is optimal there. When R ≪ C, binary searching each of the R rows (O(R log C)) is better; the optimal general bound is O(R log(C/R)) for R ≤ C, achieved by a refined divide-and-conquer.

## Count elements ≤ x in O(R + C)

From the **bottom-left**: if m[r][c] ≤ x, the whole column c from row 0 to r is ≤ x: add r + 1 and move right; otherwise move up. This counting staircase powers:

- **Kth Smallest Element in a Sorted Matrix** (LC 378): binary search on the value range [m[0][0], m[R−1][C−1]], using the count to test "at least k elements ≤ mid". O((R + C) · log(range)). The answer is always an actual element, because the smallest value with count ≥ k must be present.
- **Kth smallest in a multiplication table** (LC 668): the same idea with count(x) = Σ min(x // i, C).
- Alternatively, a min-heap k-way merge of the rows: O(k log R), better when k is small.

## Leftmost Column with at Least a One (LC 1428)

Rows are sorted 0s then 1s, and you may only call get(r, c) (each call is expensive). Staircase from the top-right: on a 1, record the column and move left; on a 0, move down. At most R + C calls. Binary searching each row costs R·log C calls, which wins only when R·log C < R + C (a few very long rows).

## Other variations

- **Count Negative Numbers in a Sorted Matrix** (LC 1351): rows and columns non-increasing; staircase from the bottom-left (or top-right) counting the negatives in O(R + C).
- **Find a Peak Element II** (LC 1901): not sorted, but binary search over columns using each column's maximum gives O(R log C).
- **Search in a row-sorted matrix with unsorted columns**: binary search each row (O(R log C)); no staircase.
- **Median of a row-wise sorted matrix**: binary search on the value with per-row upper bounds: O(R log C log range).

## When to binary search each row

- Only rows are sorted (columns are not): the staircase is invalid.
- R is much smaller than C: O(R log C) beats O(R + C).
- Interviewers sometimes accept it as a first answer for LC 240; then present the staircase.

## Interview angles

- Ask which sortedness holds before choosing an algorithm.
- Explain why the top-right corner is the right starting point (one move decreases, the other increases).
- For k-th smallest, compare value-space binary search with the heap merge.

## Connections

Binary search on the answer (the k-th smallest by counting), k-way merge with heaps, and two-pointer elimination (the staircase is two pointers on a 2D order).
`,
    doubts: [
      ["Should I binary search each row instead of using the staircase?", "If R ≪ C, binary searching each row costs O(R log C), which beats O(R + C). If R and C are similar, the staircase O(R + C) wins. Mention both and choose by the shape."],
      ["Why does counting from the bottom-left work?", "At (r, c), if the value ≤ x, then every value above it in column c is also ≤ x (columns sorted), contributing r + 1, and the next candidates are to the right. Otherwise, the value and everything to its right in row r are > x, so move up."],
      ["In LC 378, why is the binary search result guaranteed to be an element of the matrix?", "The search returns the smallest value v with count(≤ v) ≥ k. If v were not in the matrix, count(≤ v − 1) would equal count(≤ v) ≥ k, contradicting minimality. So v is present."],
      ["Does the staircase work when rows and columns are only non-decreasing (duplicates allowed)?", "Yes: the discard arguments only need \"everything below is ≥\" and \"everything to the left is ≤\", which non-decreasing order still gives. Searching for presence works unchanged."],
      ["How do I find the first occurrence position, not just presence, in LC 74?", "Use the lower-bound form of binary search on the virtual array (as in the code above); lo is the first index with value ≥ target, which maps back to (lo // C, lo % C)."],
    ],
    revise: md`
? Fully sorted matrix? :: Flattened binary search.
? Rows and columns sorted? :: Staircase from top-right or bottom-left: O(R + C).
? Count ≤ x? :: From bottom-left: add r + 1 and move right, or move up.
? k-th smallest? :: Binary search on value + staircase count.
? R ≪ C? :: Binary search each row: O(R log C).
? Why not start the staircase at the top-left? :: Both moves increase the value, so no comparison can discard anything.
? Optimal bound for R ≪ C? :: O(R log(C/R)); binary search per row is O(R log C).
? Multiplication table count(x)? :: Σ min(x // i, C) over rows i.
? Kth smallest with small k? :: Heap merge of rows: O(k log R).
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
## Why sorting matters

Sorting is the most common preprocessing step in algorithms: it enables binary search, two pointers, sweep lines, greedy choices and deduplication. In interviews you mostly call the library sort, but you must know how the main algorithms work, their costs and stability, what libraries actually use, and why O(n log n) is the limit for comparison sorting.

## Merge sort

Split the array in half, sort each half recursively, merge the two sorted halves with two pointers.

\`\`\`python
def merge_sort(a):
    if len(a) <= 1: return a
    m = len(a) // 2
    L, R = merge_sort(a[:m]), merge_sort(a[m:])
    out, i, j = [], 0, 0
    while i < len(L) and j < len(R):
        if L[i] <= R[j]: out.append(L[i]); i += 1      # <= keeps it stable
        else: out.append(R[j]); j += 1
    return out + L[i:] + R[j:]
\`\`\`

- T(n) = 2T(n/2) + O(n) = **O(n log n)** in every case.
- **Stable** (equal elements keep their order, thanks to ≤).
- O(n) extra memory for arrays (in-place merging exists but is complicated and slow); O(1) extra for linked lists (relinking nodes), which is why it is the standard list sort (Sort List, LC 148).
- Natural for **external sorting** (merge sorted runs from disk) and parallel sorting.
- **Counting inversions** and **count of smaller numbers after self** piggyback on the merge step.

## Quicksort

Pick a pivot, partition into "< pivot", "= pivot" (optional) and "> pivot", recurse on the sides.

- Average **O(n log n)**; worst **O(n²)** when partitions are lopsided (sorted input with a first-element pivot). Random pivots or median-of-three make the worst case vanishingly unlikely on ordinary inputs.
- **In place**, O(log n) stack if you recurse on the smaller side and loop on the larger.
- **Not stable**.
- Usually the **fastest in practice**: sequential scans, few moves, good cache behaviour.
- **Three-way partitioning** (Dutch national flag) handles many equal keys in linear time per level; without it, all-equal input degrades to O(n²) with some partition schemes.
- Partition schemes: Lomuto (simple, more swaps) and Hoare (two pointers inward, fewer swaps).

## Heapsort

Build a max-heap in O(n), then repeatedly move the maximum to the end and sift down: **O(n log n) worst case**, **in place**, **not stable**, poor cache locality. Its main role today is the fallback in introsort.

## Simple sorts

- **Insertion sort**: O(n²) worst, but O(n + inversions): very fast for small or nearly sorted arrays. Libraries use it for subarrays below ~16–32 elements. Stable, in place, online.
- **Selection sort**: O(n²) comparisons, but only n − 1 swaps: useful when writes are expensive. Not stable.
- **Bubble sort**: O(n²); only for teaching (and detecting "already sorted" in one pass).
- **Shell sort**: insertion sort over shrinking gaps; sub-quadratic in practice, no strong guarantees.

| Algorithm | Best | Average | Worst | Extra space | Stable |
|---|---|---|---|---|---|
| merge sort | n log n | n log n | n log n | n | yes |
| quicksort | n log n | n log n | n² | log n | no |
| heapsort | n log n | n log n | n log n | 1 | no |
| insertion | n | n² | n² | 1 | yes |
| Timsort | n | n log n | n log n | n | yes |

## What libraries do

- **Python** (sorted, list.sort) and **Java** for objects (Arrays.sort on Object[], Collections.sort): **Timsort** (Tim Peters, 2002): detect natural runs, extend short runs with binary insertion sort to a minimum length, merge runs with a stack invariant and "galloping" when one run dominates. Stable, O(n) on already-sorted or reverse-sorted data, O(n log n) worst. (Recent Python versions use Powersort's merge policy, a refinement of the same idea.)
- **Java primitives** (Arrays.sort on int[]): dual-pivot quicksort (Yaroslavskiy): not stable, which does not matter for primitives.
- **C++ std::sort**: **introsort**: quicksort with median-of-three, switching to heapsort when the recursion depth exceeds about 2·log n (guaranteeing O(n log n)), and insertion sort for small ranges. std::stable_sort is a merge sort; std::partial_sort uses a heap.
- **Rust**: stable sort is a Timsort-like merge sort (driftsort in newer versions); unstable sort is pattern-defeating quicksort (pdqsort).

## Lower bound

Any algorithm that sorts only by comparing elements needs **Ω(n log n)** comparisons in the worst case. Proof by decision tree: each comparison has two outcomes, the algorithm must distinguish all n! orderings, so the tree has at least n! leaves and height at least log₂(n!) ≈ n log₂ n − 1.44n. Non-comparison sorts (counting, radix, bucket) beat this by exploiting the key structure, not by comparing.

## Interview usage

- Sorting first is often the O(n log n) baseline that makes two pointers, greedy choices or binary search possible; say what it enables.
- Know merge sort and quicksort well enough to write them and to adapt them (counting inversions, quickselect, sorting a linked list).
- Mention stability when sorting by multiple keys, and the library algorithm in your language.

## Connections

Quickselect reuses partitioning; merge sort's merge is the two-sequence merge pattern; heapsort uses heap internals; counting and radix sorts sidestep the lower bound.
`,
    doubts: [
      ["Why is quicksort usually faster than merge sort despite the worse worst case?", "In-place partitioning touches memory sequentially with few writes and no auxiliary array, giving excellent cache behaviour and small constants. Randomisation makes the worst case astronomically unlikely."],
      ["What does stability mean and when does it matter?", "Equal keys keep their original relative order. It matters when sorting by multiple keys in passes (sort by secondary key, then stably by primary) and when records carry other data."],
      ["Why does Timsort get O(n) on sorted data?", "It detects existing ascending (or strictly descending) runs and merges them; a fully sorted array is one run, so no merging is needed."],
      ["Why is insertion sort used inside fast library sorts?", "For tiny ranges its overhead is minimal (no recursion, sequential access, few moves), so it beats O(n log n) algorithms below about 16–32 elements. Hybrid sorts switch to it at the leaves of the recursion."],
      ["Can quicksort be made stable?", "Yes, by partitioning into new arrays (or tagging elements with their original index and comparing by (key, index)), but that loses the in-place advantage. When stability matters, use merge sort or Timsort."],
      ["How does Timsort reach O(n) on sorted input?", "It scans for natural runs first. A fully sorted (or reverse-sorted, which it reverses) array is one run, so there is nothing to merge: one pass of n − 1 comparisons."],
    ],
    revise: md`
? Merge sort: time, stable, space? :: Θ(n log n) always; stable; O(n) extra.
? Quicksort worst case and defence? :: Θ(n²); random pivot / median-of-three, 3-way partition.
? Heapsort: time, space, stable? :: Θ(n log n); O(1); not stable.
? Python / Java objects use? :: Timsort (stable).
? C++ std::sort? :: Introsort (not stable).
? Comparison sort lower bound? :: Ω(n log n).
? Insertion sort niche? :: Small or nearly sorted arrays: O(n + inversions).
? Quicksort worst case trigger? :: Lopsided partitions (sorted input with a fixed first/last pivot); avoid with random pivots.
? Introsort switch condition? :: Recursion depth > ~2·log n → heapsort; small ranges → insertion sort.
? Decision-tree bound value? :: log₂(n!) ≈ n log₂ n − 1.44 n.
? Selection sort's niche? :: Only n − 1 swaps (expensive writes).
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
## Beating n log n

The Ω(n log n) lower bound applies only to algorithms that learn about the order by **comparing** elements. If keys are small integers, fixed-length strings, or uniformly spread numbers, you can place elements by their key directly and sort in linear time. Three methods cover it: counting sort, radix sort and bucket sort.

## Counting sort

Keys are integers in a small range [0, k).

1. Count occurrences: cnt[key] += 1.
2. Prefix sums: cnt[v] becomes the number of keys < v, i.e. the first output position for key v.
3. Place each element at out[cnt[key]] and increment cnt[key]. Iterating the input **in order** (or backwards with "number ≤ v" positions) keeps equal keys in their original order: **stable**.

\`\`\`python
def counting_sort(a, key, k):
    cnt = [0] * (k + 1)
    for x in a: cnt[key(x) + 1] += 1
    for v in range(k): cnt[v + 1] += cnt[v]        # cnt[v] = first slot for key v
    out = [None] * len(a)
    for x in a:
        out[cnt[key(x)]] = x; cnt[key(x)] += 1
    return out
\`\`\`

O(n + k) time and space. If only the keys matter (no attached data), skip step 3 and write each value cnt[v] times. Good when k = O(n); wasteful when k ≫ n (sorting 10 numbers up to 10⁹).

## Radix sort

Sort by one digit at a time with a **stable** counting sort.

- **LSD (least significant digit first)**: sort by the last digit, then the second-to-last, …, then the first. Because each pass is stable, ties on the current digit keep the order established by the less significant digits, so after the last pass the order is fully correct. d passes with base b: O(d·(n + b)).
- Typical: 32-bit integers in base 256 = 4 passes of counting sort over 256 buckets. Faster than comparison sorting for large n of fixed-width keys.
- Negative integers: flip the sign bit (or offset) so their bit patterns sort correctly.
- **MSD (most significant digit first)**: bucket by the first digit and recurse into each bucket: natural for strings of varying length (dictionary order), and it can stop early on distinct prefixes.

Why stability is required: if the pass on the tens digit reordered elements with equal tens digits arbitrarily, the ones-digit order established before it would be lost.

## Bucket sort

Values roughly uniform over a range: create n buckets covering equal sub-ranges, drop each value into its bucket, sort each bucket (insertion sort), and concatenate. Expected O(n) for uniform inputs (each bucket has O(1) expected elements); O(n²) or O(n log n) worst case if everything lands in one bucket.

## Problems

- **Sort Colors** (LC 75): counting with 3 values (or the one-pass Dutch flag).
- **Top K Frequent Elements** (LC 347): bucket[f] = values with frequency f; scan from the highest f: O(n).
- **Sort Characters by Frequency** (LC 451): counting over characters, then buckets by frequency.
- **Maximum Gap** (LC 164): the largest difference between sorted neighbours, in O(n). With n values between min and max, the maximum gap is at least ⌈(max − min)/(n − 1)⌉ (pigeonhole). Make buckets of that width; the answer never lies inside a bucket, only between the max of one non-empty bucket and the min of the next. Keep only each bucket's min and max.
- **H-Index** (LC 274): counts of citations capped at n, then a scan from the top.
- **Contains Duplicate III** (LC 220): buckets of width t + 1; equal or adjacent buckets hold candidates.
- **Relative Sort Array** (LC 1122): counting over values ≤ 1000.
- **Height Checker** (LC 1051), **Sort an array of ages**: counting.
- **Suffix arrays** use radix sort on rank pairs to reach O(n log n).

## When not to use them

- Large key ranges with small n (counting array too big).
- Keys that are not integers or fixed-width (arbitrary objects with a comparator).
- When n is moderate: the library comparison sort (highly optimised, cache-friendly) is usually as fast and simpler.
- When memory is tight: counting and radix sorts need O(n + k) extra space.

## Interview angles

- Recognise small key ranges ("values in [0, 100]", "lowercase letters", "frequencies ≤ n").
- Explain why LSD radix needs a stable inner sort.
- Maximum Gap's pigeonhole bucket argument is a favourite.

## Connections

Counting arrays appear in hashing and sliding windows; bucket ideas appear in Contains Duplicate III and top-k frequency; radix sort builds suffix arrays.
`,
    doubts: [
      ["Why must radix sort use a stable sort per digit?", "After sorting by the lower digits, equal higher digits must preserve that order; a stable pass on the next digit keeps ties ordered by the digits already processed."],
      ["How does Maximum Gap avoid sorting?", "The largest gap is at least the average gap (max − min)/(n − 1). Buckets of that width cannot contain the maximum gap inside them, so only gaps between consecutive buckets (max of one, min of the next) matter."],
      ["Is radix sort really faster than quicksort in practice?", "For large arrays of fixed-width integers (millions of 32- or 64-bit keys), yes: a few linear passes beat n log n comparisons. For small arrays, objects with comparators, or variable-length keys, library comparison sorts usually win thanks to tuning and cache behaviour."],
      ["Why does bucket sort need uniformly distributed input?", "Its expected linear time relies on each bucket receiving O(1) elements. Skewed data puts most elements in a few buckets, and sorting those buckets dominates (quadratic with insertion sort)."],
      ["How does counting sort stay stable when filling from the back?", "With cnt[v] = the number of keys ≤ v (one past the last slot for v), iterating the input backwards and placing each element at cnt[key] − 1 (then decrementing) puts later equal keys in later slots, preserving input order."],
    ],
    revise: md`
? Counting sort cost? :: O(n + k).
? Radix sort cost? :: O(d · (n + b)); stable per-digit passes, LSD first.
? Bucket sort expectation? :: O(n) for uniformly distributed data.
? Maximum Gap trick? :: Buckets of width (max − min)/(n − 1); compare adjacent buckets' max/min.
? H-Index in O(n)? :: Counting sort with citations capped at n.
? Maximum Gap bucket width? :: ⌈(max − min)/(n − 1)⌉; answer lies between buckets (prev max to next min).
? Radix sort negative integers? :: Flip the sign bit (or offset) before sorting.
? MSD radix use case? :: Variable-length strings in dictionary order.
? Counting sort when k ≫ n? :: Wasteful: use comparison sort or compress keys.
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
## The problem

Find the k-th smallest element of an unsorted array (or the k-th largest, the median, the top k). Sorting costs O(n log n). A heap costs O(n log k). **Quickselect** (Hoare, 1961) uses quicksort's partition but recurses into **only one side**, giving expected **O(n)** time and O(1) extra space.

## Algorithm

1. Pick a pivot (uniformly at random).
2. Partition the array around it; the pivot lands at its final sorted index p.
3. If p == k, done. If k < p, repeat on the left part; otherwise on the right part.

\`\`\`python
import random
def quickselect(a, k):                      # k is 0-based: the k-th smallest
    lo, hi = 0, len(a) - 1
    while True:
        p = random.randint(lo, hi)
        a[p], a[hi] = a[hi], a[p]
        pivot, store = a[hi], lo
        for i in range(lo, hi):                 # Lomuto partition
            if a[i] < pivot:
                a[i], a[store] = a[store], a[i]; store += 1
        a[store], a[hi] = a[hi], a[store]
        if store == k: return a[store]
        if k < store: hi = store - 1
        else: lo = store + 1
\`\`\`

The k-th largest is index n − k in ascending order (Kth Largest Element in an Array, LC 215).

[[widget:quickselect]]

## Why expected O(n)

Each partition is linear in the current range, and a random pivot lands in the middle half of the range with probability 1/2, shrinking the range to at most 3/4 of its size. So the expected total work is about n + (3/4)n + (3/4)²n + … = 4n, up to constants: O(n). Quicksort recurses into **both** sides, which is why it pays log n levels of O(n) work; quickselect pays a geometric series.

**Worst case** O(n²): pivots that repeatedly land at an end (a fixed first-element pivot on sorted input). Random pivots make this astronomically unlikely, unless an adversary knows your random seed.

## Median of medians (BFPRT, 1973)

A deterministic pivot that guarantees a good split:

1. Split the array into groups of 5; find each group's median (constant work per group).
2. Recursively find the median of those n/5 medians; use it as the pivot.

At least half of the group medians are ≥ the pivot, and each of those groups has 3 elements ≥ it, so at least about 3n/10 elements lie on each side. The recurrence T(n) ≤ T(n/5) + T(7n/10) + O(n) solves to **O(n)** worst case, because 1/5 + 7/10 < 1. Groups of 3 would give T(n/3) + T(2n/3) + O(n) = O(n log n), which is why 5 is the smallest odd group size that works.

In practice the constant is large, so libraries use randomised or introselect variants (quickselect that falls back to median of medians when it recurses badly). C++'s std::nth_element is introselect.

## Duplicates

With many equal keys, a two-way partition can put all equal elements on one side and degrade toward O(n²). Use a **three-way partition** (< pivot, = pivot, > pivot): if k falls in the "equal" band, return the pivot immediately.

## Uses

- **Kth Largest Element** (LC 215), **K Closest Points to Origin** (LC 973: select by squared distance, then return the first k: they are the k smallest, unordered).
- **Top K Frequent Elements** (LC 347): quickselect on (frequency) pairs.
- **Wiggle Sort II** (LC 324): find the median with quickselect, then a three-way partition on virtually re-indexed positions.
- **Minimum Moves to Equal Array Elements II** (LC 462): the optimal meeting point for Σ|x − aᵢ| is the median: quickselect it in O(n).
- **Best meeting point** in 1D or separable 2D (median per axis).
- **Median of a stream**: not quickselect (needs two heaps), since quickselect is offline.

## Heap vs quickselect

| | size-k heap | quickselect |
|---|---|---|
| time | O(n log k) | O(n) expected, O(n²) worst |
| extra space | O(k) | O(1) (in place) |
| modifies input | no | yes (reorders) |
| streaming | yes | no |
| worst-case guarantee | yes | only with median of medians |

## Interview angles

- Explain the one-sided recursion and the geometric series.
- Use a random pivot and mention the worst case; mention three-way partitioning for duplicates.
- Offer the heap as the stable, streaming alternative.

## Connections

Partitioning (Lomuto, Hoare, Dutch national flag) is shared with quicksort; the median minimises absolute deviations; heaps solve the streaming version.
`,
    doubts: [
      ["Why is quickselect O(n) on average but quicksort O(n log n)?", "Quicksort recurses into both sides, doing n work per level of the recursion tree. Quickselect recurses into one side whose size shrinks geometrically, so the total is a geometric series."],
      ["Why groups of 5 in median of medians?", "With 5, the recurrence's two parts (n/5 and 7n/10) sum to less than n (0.9n), which makes the total linear. Groups of 3 fail this; 7 also works."],
      ["Is the expected O(n) bound affected by the input order?", "No, when the pivot is chosen uniformly at random: the expectation is over the algorithm's random choices, so it holds for every input, including sorted or adversarial ones (unless the adversary can predict the random numbers)."],
      ["Does quickselect find the k smallest elements, or just the k-th?", "Both: after it finishes, the k-th smallest is at index k and every element before it is ≤ it (in no particular order). Slicing a[:k] gives the k smallest."],
      ["Can I use Hoare's partition instead of Lomuto in quickselect?", "Yes, it does fewer swaps, but Hoare's partition returns a split point rather than the pivot's final index, so the recursion must check which side contains k using that split (k ≤ split → left side) and continue until the range has one element."],
    ],
    revise: md`
? Quickselect average / worst? :: O(n) / O(n²).
? Median of medians guarantee? :: O(n) worst case with groups of 5.
? C++ library function? :: std::nth_element (introselect).
? Duplicates? :: Three-way partition.
? Heap vs quickselect? :: O(n log k) streaming, non-destructive vs O(n) average in place.
? Median of medians split guarantee? :: At least ~3n/10 elements on each side; T(n/5) + T(7n/10) + O(n) = O(n).
? Why not groups of 3? :: T(n/3) + T(2n/3) + O(n) = O(n log n).
? std::nth_element? :: Introselect: quickselect with a guaranteed fallback.
? K Closest Points output after select? :: The first k elements (unordered).
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
## Sorting by your own rules

Many problems reduce to "sort by the right key, then scan". The work is choosing a key or a comparator that is **correct** (consistent, transitive) and expressing it cleanly in your language. Getting it wrong produces subtle bugs: wrong tie-breaking, overflow in subtraction comparators, or runtime errors from inconsistent comparators.

## Comparators

A comparator cmp(a, b) returns a negative number if a should come first, positive if b should, and zero if they are equivalent. It must define a **strict weak ordering**:

- irreflexive: a is not before a;
- antisymmetric: if a before b then not b before a;
- **transitive**: a before b and b before c imply a before c;
- equivalence (neither before the other) is transitive too.

If these fail, sorting algorithms can loop, crash or return garbage. Java's TimSort even detects some violations and throws "Comparison method violates its general contract!".

Language idioms:

- **Python**: prefer key functions: sorted(xs, key=lambda x: (−x.count, x.name)). For pairwise rules, functools.cmp_to_key(cmp).
- **Java**: Comparator.comparingInt(X::a).thenComparing(X::b).reversed() chains; never (a, b) -> a − b for ints that can overflow (use Integer.compare).
- **C++**: a lambda returning a < b (a strict "less", never ≤: using ≤ breaks irreflexivity and is undefined behaviour in std::sort).

## Multi-key sorting

- Tuples compare lexicographically: key = (primary, secondary, …).
- Descending on a number: negate it. Descending on a string (no negation): sort twice using stability (sort by the secondary key first, then stably by the primary key), or use a comparator.
- **Stability** makes multi-pass sorting work: Python and Java's object sorts are stable; C++ std::sort is not (use std::stable_sort).

## Counting inversions

An inversion is a pair i < j with a[i] > a[j]; their number measures how unsorted an array is (and equals the number of swaps bubble sort makes).

Merge sort counts them while merging: when an element from the **right** half is taken before remaining elements of the left half, it forms an inversion with each of them, so add (number of elements left in the left half).

\`\`\`python
def count_inversions(a):
    if len(a) <= 1: return a, 0
    m = len(a) // 2
    L, x = count_inversions(a[:m]); R, y = count_inversions(a[m:])
    out, i, j, inv = [], 0, 0, x + y
    while i < len(L) and j < len(R):
        if L[i] <= R[j]: out.append(L[i]); i += 1
        else: out.append(R[j]); j += 1; inv += len(L) - i
    return out + L[i:] + R[j:], inv
\`\`\`

O(n log n). A Fenwick tree over compressed values gives the same count.

Related:

- **Count of Smaller Numbers After Self** (LC 315): merge sort on (value, original index) pairs, adding to each left element the number of right elements that moved before it.
- **Reverse Pairs** (LC 493): count i < j with a[i] > 2·a[j]: before merging, count with two pointers over the sorted halves (a condition different from the merge order), then merge normally.
- **Global and Local Inversions** (LC 775): equal iff every element is within one position of its sorted place.
- **Minimum adjacent swaps** to sort = number of inversions.

## Sorting by derived orders

- **Largest Number** (LC 179): concatenate numbers to form the largest string. Compare a and b by a + b versus b + a (as strings). This order is transitive (it compares the numbers as if they were infinite repeating decimals with period of their own length). Edge case: if the result starts with "0", return "0".
- **Reorder Data in Log Files** (LC 937): letter-logs first, sorted by (content, identifier); digit-logs after, in original order: a key (0, content, id) for letter-logs and (1,) for digit-logs with a stable sort.
- **Custom Sort String** (LC 791): rank each character by its position in the order string, or count characters and emit them in that order, then the rest.
- **Sort by frequency, ties by value descending** (LC 1636): key (count, −value).
- **Relative Sort Array** (LC 1122): rank by position in arr2, others by value after.
- **Queue Reconstruction by Height** (LC 406): sort by (height descending, k ascending), then insert each person at index k.
- **Sort intervals by end** for greedy selection; **by start** for merging.
- **Decorate–sort–undecorate**: compute an expensive key once per element (Python's key= does this automatically).

## Interview angles

- Use key functions when possible; justify transitivity when using a pairwise comparator.
- Never write a − b comparators for large integers; never use ≤ in C++ comparators.
- Counting inversions via merge sort is a classic; know the "add len(L) − i" line.

## Connections

Merge sort's merge step powers inversion counting; Fenwick trees answer the same counts online; greedy algorithms depend on choosing the right sort key.
`,
    doubts: [
      ["Why must a comparator be transitive?", "Sorting algorithms assume a consistent order. With a non-transitive comparator (a < b, b < c, c < a) results depend on the algorithm's internal order, and some implementations read out of bounds."],
      ["Why is a + b > b + a transitive for Largest Number?", "It is equivalent to comparing a·10^len(b) + b with b·10^len(a) + a, which reduces to comparing a/(10^len(a) − 1) with b/(10^len(b) − 1): a real-number comparison, hence transitive."],
      ["How exactly does merge sort count inversions?", "When merging sorted halves L and R, if R[j] < L[i], then R[j] is smaller than every remaining element of L (they are sorted), so it forms len(L) − i inversions at once."],
      ["Why is \"a + b > b + a\" transitive for Largest Number?", "Comparing a + b with b + a is equivalent to comparing the fractions a / (10^|a| − 1) and b / (10^|b| − 1), i.e. the infinite repetitions 0.aaaa… and 0.bbbb…. Comparing real numbers is transitive, so the string rule is too."],
      ["How does Reverse Pairs count before merging?", "With both halves sorted, move a pointer j over the right half: for each i in the left half, advance j while L[i] > 2·R[j]; then j is the number of valid partners for L[i]. Because L is sorted, j never moves back, so counting is linear per merge. Then merge normally."],
      ["Is Python's sort stable even with key functions?", "Yes: list.sort and sorted are guaranteed stable, with or without key, which is what makes multi-pass sorting reliable."],
    ],
    revise: md`
? Python custom comparator? :: functools.cmp_to_key.
? Java comparator overflow fix? :: Integer.compare(a, b).
? Multi-key via stability? :: Stable passes from least to most significant key.
? Inversions during merge? :: Taking R[j] before L[i] adds len(L) − i.
? Reverse Pairs? :: Count a[i] > 2a[j] across halves before merging.
? C++ comparator with ≤? :: Undefined behaviour (violates irreflexivity); use strict <.
? Descending string secondary key? :: Two stable sorts (secondary first, then primary) or a comparator.
? Global == local inversions? :: Every element within one position of its sorted place.
? Queue Reconstruction by Height order? :: Height descending, k ascending; insert at index k.
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
## The idea

Brute force over all subsets of n items costs 2ⁿ: hopeless at n = 40 (10¹²). **Meet in the middle** splits the items into two halves of n/2, enumerates all 2^(n/2) partial results of each half (10⁶ each for n = 40), and combines the halves cleverly (sorting plus binary search, two pointers, or hashing) so that combining costs about 2^(n/2) · log instead of 2^(n/2) × 2^(n/2). The total drops from O(2ⁿ) to O(2^(n/2) · n).

The trick works whenever the answer for the whole set is a simple combination (a sum, a XOR, a count) of an answer from each half, and the best partner of a left-half result can be found by searching the right-half results.

## Template: closest subset sum

Closest Subsequence Sum (LC 1755): choose a subset whose sum is closest to a goal, n ≤ 40, values up to 10⁷ (too large for a sum-indexed DP).

\`\`\`python
from bisect import bisect_left
def all_sums(xs):
    sums = [0]
    for x in xs:
        sums += [s + x for s in sums]       # doubles each time: 2^len(xs)
    return sums

def min_abs_difference(nums, goal):
    A, B = all_sums(nums[:len(nums) // 2]), sorted(all_sums(nums[len(nums) // 2:]))
    best = abs(goal)
    for a in A:
        i = bisect_left(B, goal - a)
        for j in (i - 1, i):
            if 0 <= j < len(B): best = min(best, abs(a + B[j] - goal))
    return best
\`\`\`

For each left sum a, the best right sum is the one closest to goal − a, found by binary search in the sorted right sums. O(2^(n/2) · n) overall. Sorting both lists and sweeping with two pointers avoids the log factor.

## Problems

- **Closest Subsequence Sum** (LC 1755): above.
- **Partition Array Into Two Arrays to Minimise Sum Difference** (LC 2035): 2n numbers split into two arrays of n each. Enumerate half-sums **grouped by how many elements were taken**; a left choice with k elements must pair with a right choice with n − k elements. For each k, sort the right group and binary search for the value that brings the total closest to half.
- **Split Array With Same Average** (LC 805): a subset of size k must have sum k·total/n; enumerate (count, sum) pairs per half and look up complements in hash sets.
- **4Sum II** (LC 454): four arrays; store all sums a + b in a hash map of counts, then for each c + d look up −(c + d): O(n²) instead of O(n⁴). Meet in the middle on a fixed structure.
- **Subset sum count with huge values** (n ≤ 40): count pairs with sum = target via a dictionary of the right sums.
- **Bidirectional BFS**: meet in the middle on a search graph (b^(d/2) from each end).
- **Discrete logarithm (baby-step giant-step)**: find x with g^x ≡ h (mod p) in O(√p) by storing g^j for j < m and matching h·g^(−im): a number-theory meet in the middle.
- **Cryptography**: double encryption with two keys (2DES) gives little extra security because a meet-in-the-middle attack costs about 2^(k+1), not 2^(2k), which is why Triple DES exists.

## Generating sums efficiently

- The doubling loop above generates all subset sums of a half in O(2^(n/2)).
- Generating them already **sorted** is possible by merging: when adding element x, merge the current sorted list with the list shifted by x (both sorted) in linear time. This removes the separate sort.
- For counts per subset size, keep a list of sums per count.

## Memory

2^(n/2) values per half: about 10⁶ for n = 40 (8 MB as 64-bit integers): fine. For n = 50, 3·10⁷ per half: heavy in Python. Hash maps cost several times more memory than sorted arrays; prefer arrays when you can search by binary search or two pointers.

## When to think of it

- n is between about 25 and 45 (too big for 2ⁿ, too small for anything polynomial to be needed).
- Values are too large for a DP indexed by sums.
- The objective splits into independent halves combined by addition or XOR.

## Interview angles

- Say the complexity change: 2ⁿ → 2^(n/2) · n, and the n ≈ 40 hint.
- Explain how halves combine (sorted search or hash lookup).
- Mention 4Sum II and bidirectional BFS as everyday relatives.

## Connections

Subset-sum DP is the alternative when values are small; bitmask enumeration generates the half-results; two pointers and binary search combine them; bidirectional BFS is the graph version.
`,
    doubts: [
      ["Why does splitting in half help so much?", "2⁴⁰ ≈ 10¹² is impossible, but 2 × 2²⁰ ≈ 2·10⁶ is easy. The combine step (sorting one side and binary searching the other) costs only a log factor, so the exponent is effectively halved."],
      ["Why not DP over sums?", "Values up to 10⁷–10⁹ make the sum range huge; DP over sums would need too much memory and time. Meet in the middle depends only on n."],
      ["How do I recover which elements were chosen, not just the best sum?", "Store the mask alongside each half-sum (pairs of (sum, mask)), sort by sum, and when the best pair is found, combine the two masks. Memory doubles, which is usually fine at 2^20 entries."],
      ["Is meet in the middle useful for counting subsets with sum ≤ T?", "Yes: sort the right half's sums and, for each left sum a, count right sums ≤ T − a by binary search (or a two-pointer sweep over both sorted lists): O(2^(n/2) · n)."],
      ["Can meet in the middle handle constraints like \"exactly k elements\"?", "Yes, by grouping each half's results by size, as in LC 2035; you then combine only compatible groups (sizes adding to k)."],
    ],
    revise: md`
? Meet in the middle complexity? :: O(2^(n/2) · n).
? Combination step? :: Sort one half's sums; binary search or two pointers for complements.
? 4Sum II? :: Hash pair sums of two arrays, look up negatives of the other two.
? Partition into two equal-size halves? :: Group half-sums by count chosen.
? LC 2035 grouping? :: Half-sums grouped by element count k; pair k with n − k.
? Sorted subset sums without sorting? :: Merge the list with itself shifted by x for each new element.
? Baby-step giant-step? :: Store g^j (j < m), match h·g^(−im): O(√p).
? Why 2DES is weak? :: Meet in the middle costs ~2^(k+1), not 2^(2k).
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
## Why decompose a tree

Arrays have segment trees for range queries with updates. Trees need the same for **paths** ("maximum edge weight on the path from u to v", "add 5 to every node on the path") and **subtrees**. The idea in every technique on this page is to flatten the tree into an array so that the parts you query become a few contiguous ranges, then use an array structure.

## Euler tour flattening (subtrees)

Run a DFS and number nodes by entry time tin. A node's subtree is exactly the contiguous range [tin[v], tout[v]] (tout = the last tin in the subtree). So:

- subtree sum, subtree add, subtree max → range operations on the tin-ordered array (Fenwick or segment tree);
- "is u an ancestor of v" → tin[u] ≤ tin[v] ≤ tout[u].

**Path-to-root sums with point updates**: add +x at tin[v] and −x at tout[v] + 1 in a Fenwick tree; then the prefix sum at tin[u] is the sum of updates on the path from the root to u. Path u–v sums then follow with the LCA.

The Euler tour handles subtrees perfectly but paths only in the "to the root" form.

## Heavy-light decomposition (HLD)

For each node, its **heavy child** is the child with the largest subtree; the edge to it is heavy, all others light. Heavy edges form disjoint **chains**.

**Key fact**: moving down a light edge from v to c means size(c) ≤ size(v)/2 (otherwise c would be heavy). Subtree sizes at least halve each time, so any root-to-node path crosses **O(log n) light edges**, hence touches O(log n) chains.

Implementation:

1. DFS 1: compute sizes, parents, depths and heavy children.
2. DFS 2: assign positions, visiting the heavy child **first** so every chain occupies a contiguous range of positions; record head[v] (the top of v's chain).
3. Build a segment tree over the positions.

Path query (u, v): while head[u] ≠ head[v], take the one whose chain head is deeper, query the range [pos[head], pos[node]], and jump to parent[head]. When they share a chain, query between their positions. O(log n) chain segments × O(log n) per segment = **O(log² n)** per query or update. (Edge values: store each edge at its deeper endpoint and exclude the LCA's position in the last segment.)

Because DFS 2 visits the heavy child first, subtrees are still contiguous: the same layout supports subtree queries too. LCA comes for free: when both are on one chain, the shallower one is the LCA.

Uses: path max/sum with edge or node updates, path assignment with lazy propagation, "number of distinct colours on a path" variants, and many competitive-programming tree problems.

## Centroid decomposition

A **centroid** is a node whose removal leaves components of size at most n/2 (every tree has one; find it by walking toward the heavy subtree). Remove it, recurse on each component. The recursion depth is O(log n), and every path in the tree passes through exactly one centroid as its "highest" centroid.

To count or optimise over **all paths** (number of paths of length k, paths with sum ≤ D, closest marked node), process each centroid: gather distances from it into its components and combine pairs from **different** components. Each node takes part in O(log n) levels: O(n log n) or O(n log² n) total.

Dynamic version: for "colour node v red" and "distance to the nearest red node from u", store per centroid the best distance to a red node in its component; a query walks u's O(log n) centroid ancestors.

## Comparison

| Technique | Answers | Cost |
|---|---|---|
| Euler tour + Fenwick/segment tree | subtree queries and updates; root-path sums | O(log n) |
| binary lifting | LCA, k-th ancestor, path aggregates on a static tree | O(log n) |
| heavy-light decomposition | path and subtree queries with updates | O(log² n) |
| centroid decomposition | counting or optimising over all paths, nearest-marked queries | O(n log n)–O(n log² n) |
| link-cut trees | dynamic trees (edges added and removed) | O(log n) amortised |

## Interview stance

These are rarely required in interviews. Name the right tool when a question escalates: "for path updates and queries I would use heavy-light decomposition with a segment tree: O(log² n)". With no updates, LCA plus prefix sums from the root is enough and much simpler.

## Connections

Segment trees and Fenwick trees do the array work; LCA and binary lifting handle static path queries; DFS entry and exit times are the foundation of all flattening.
`,
    doubts: [
      ["Why does a path cross only O(log n) light edges?", "Moving from a node down a light edge goes to a child whose subtree is at most half the parent's. Halving can happen only log₂ n times."],
      ["When is Euler tour enough?", "When queries are about whole subtrees: subtree = contiguous range in DFS order. Path queries between arbitrary nodes need HLD (or LCA tricks when the operation is invertible)."],
      ["Why visit the heavy child first in the second DFS?", "So that each chain gets consecutive positions: the chain's nodes are visited one after another down the heavy edges. Light children start new chains elsewhere, and subtrees remain contiguous because DFS order still finishes each subtree before leaving it."],
      ["Can HLD be O(log n) per query instead of O(log² n)?", "With a segment tree per chain sized to the chain, or by noting that all but one segment are full chain prefixes (precompute prefix aggregates when there are no updates), queries can approach O(log n). In practice the O(log² n) version is fast enough."],
      ["When should I prefer centroid decomposition over HLD?", "When the question is about all paths at once (counting pairs at distance k, sum over all paths) or about distances to dynamically marked nodes. HLD answers queries about a given path; centroids answer questions about the set of all paths."],
    ],
    revise: md`
? Heavy child? :: Child with the largest subtree.
? Light edges on a path? :: O(log n).
? HLD path query cost? :: O(log² n) with a segment tree.
? Centroid property? :: Removal leaves components ≤ n/2; centroid tree depth O(log n).
? Subtree queries only? :: Euler tour flattening + Fenwick/segment tree.
? Root-path sums with point updates via Euler tour? :: +x at tin[v], −x at tout[v]+1; prefix sum at tin[u].
? HLD query loop? :: While heads differ, query the deeper head's chain segment and jump to parent[head].
? Edge values in HLD? :: Store at the deeper endpoint; skip the LCA position.
? Centroid existence? :: Walk toward any subtree larger than n/2 until none is.
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
## What persistence means

A **persistent** data structure keeps every previous version available after updates, so you can query "the state after the 17th update" at any time. A normal (ephemeral) structure overwrites old state. Persistence powers undo histories, time-travel queries, version control, functional programming languages (where all data is immutable), and offline algorithms that would otherwise sort queries.

Copying the whole structure per update is persistence too, but costs O(n) time and memory per version. The goal is O(log n) or O(1) per update with shared structure.

## Path copying

In a tree-shaped structure, an update changes one root-to-leaf path. Instead of modifying those nodes, **copy them**: create new nodes along the path that point to the new child on the changed side and to the **old, shared** children elsewhere. The new root represents the new version; the old root still represents the old one, untouched.

Cost per update: O(depth) new nodes, O(log n) for balanced trees. Memory: O(n + updates · log n) for all versions.

## Persistent segment tree

Build a segment tree over value ranks (after coordinate compression). Version i is the tree after inserting the first i array elements (count +1 at each element's value).

\`\`\`python
# node arrays: left[], right[], cnt[]; node 0 is the empty tree (its children point to itself)
def insert(prev, l, r, pos):
    node = new_node(cnt[prev] + 1)
    if l < r:
        m = (l + r) // 2
        if pos <= m: left[node], right[node] = insert(left[prev], l, m, pos), right[prev]
        else: left[node], right[node] = left[prev], insert(right[prev], m + 1, r, pos)
    return node
\`\`\`

**K-th smallest in a subarray a[l..r]**: versions r and l − 1 differ exactly by the elements in a[l..r]. Walk both roots down together: the number of subarray elements in the left value half is cnt[left[R]] − cnt[left[L]]. If k is at most that, go left; otherwise subtract and go right. O(log n) per query, online, O(n log n) memory. This is the classic "persistent segment tree" problem (the "Chairman tree").

Other queries with the same version-difference trick: count of values ≤ x in a range, number of distinct values in a range (version i marks only the last occurrence of each value up to i), range mode-style counts with extra care.

## Simpler persistent structures

- **Persistent stack**: a singly linked list where push creates a new head pointing to the old one and pop returns the old next. Every version is O(1) to create; versions share tails. Useful for undo stacks and backtracking without copying.
- **Persistent array**: a persistent segment tree with leaves as array cells: O(log n) get and set per version. (Alternatively, "fat nodes": each cell stores its history and you binary search by version, as in Snapshot Array.)
- **Persistent union-find**: implemented on a persistent array (no path compression, union by rank): O(log² n) per operation.
- **Immutable maps and vectors** in Clojure, Scala, Haskell and Immutable.js: hash array mapped tries (HAMTs) and relaxed radix balanced trees with 32-way branching, giving "effectively O(1)" updates with structural sharing.

## Where it appears

- **Version control**: Git stores content-addressed trees; a commit shares all unchanged subtrees with its parent.
- **Databases**: MVCC keeps row versions so readers see a consistent snapshot; copy-on-write B-trees (LMDB, Btrfs, ZFS) never overwrite pages in place.
- **Editors**: undo histories with structure sharing (piece tables, ropes).
- **Functional programming**: all data structures are persistent by default.
- **Algorithms**: online range k-th smallest, distinct counts, and "for each prefix version" queries that would otherwise need offline sorting.

## Fat nodes vs path copying

- **Fat nodes**: each field keeps a list of (version, value); reads binary search by version. Small memory per change, slower reads, awkward when versions branch.
- **Path copying**: each version has its own root; reads are as fast as the ephemeral structure; memory O(log n) per update.
- **Node copying** (Driscoll, Sarnak, Sleator and Tarjan, 1989) combines them to achieve O(1) amortised extra space per update for bounded-degree structures.

## Interview stance

Rarely implemented in interviews. Recognise when "queries about past versions" or "range k-th smallest online" appear, explain path copying, and give the memory bound. For time-versioned key-value stores, the per-key history with binary search is the practical answer.

## Connections

Segment trees supply the base structure; Snapshot Array and TimeMap are fat-node persistence; Git and MVCC are system-design faces of the same idea.
`,
    doubts: [
      ["Is a persistent structure the same as keeping copies of every version?", "Semantically yes, but copying would cost O(n) per version. Path copying shares all unchanged parts, so each new version costs only O(log n) extra space in a tree-shaped structure."],
      ["How does subtracting versions give counts in a range?", "Version r counts values among a[1..r]; version l − 1 counts values among a[1..l−1]. Their node-wise difference counts values among a[l..r], available at every node without building a new tree."],
      ["How much memory does a persistent segment tree for n = 10⁵ need?", "The initial tree plus about log₂ n ≈ 17 new nodes per insertion: roughly 10⁵ × 18 ≈ 2 million nodes, each with two child indices and a count: tens of megabytes in compact arrays. Use arrays of ints, not node objects, especially in Python or Java."],
      ["Can persistent structures support \"merge two versions\"?", "Some can (confluently persistent structures, such as persistent treaps that support merging), but in general combining two independent histories is much harder than branching. Git solves merges at the content level, not by merging tree structures automatically."],
      ["Does path compression work in persistent union-find?", "Not well: compression modifies many nodes on reads, creating many new versions and destroying the sharing. Persistent union-find uses union by rank only, giving O(log n) finds, each costing O(log n) on the persistent array."],
    ],
    revise: md`
? Path copying cost per update? :: O(log n) new nodes.
? Persistent segment tree k-th in range? :: Descend versions r and l − 1, compare left counts.
? Persistent stack? :: Immutable linked list sharing tails.
? Real systems? :: Functional collections (HAMT), Git trees, copy-on-write B-trees.
? Persistent array options? :: Persistent segment tree (O(log n) get/set) or fat nodes with per-cell histories.
? Distinct values in a range online? :: Version i marks only the last occurrence of each value; count marks in [l, r] of version r.
? HAMT? :: 32-way hash array mapped trie with structural sharing (Clojure, Scala).
? Copy-on-write B-trees? :: Never overwrite pages (LMDB, Btrfs, ZFS).
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
## Randomness as a balancing tool

Balanced BSTs keep O(log n) height with careful rules (AVL heights, red-black colours). Randomised structures get the same expected bounds with much simpler code by making the shape depend on random choices instead of on the insertion order. An adversary who does not know the random bits cannot force a bad shape. The two classics are **treaps** and **skip lists**; **splay trees** reach O(log n) amortised by a different idea, self-adjustment.

## Treap

A treap (Seidel and Aragon, 1989; "tree + heap") stores a key and a random **priority** in each node. It is:

- a BST by key, and
- a heap by priority (each parent's priority is higher than its children's).

For distinct keys and priorities, exactly one tree satisfies both: the one you would get by inserting keys in decreasing priority order into a plain BST. Since priorities are random, that is a **random insertion order**, and random BSTs have expected depth O(log n) (about 2 ln n average node depth). So every operation is expected O(log n), regardless of the actual insertion order.

**Insert with rotations**: insert as a BST leaf, then rotate the new node up while its priority beats its parent's.

**Split and merge** (the elegant formulation):

- split(t, k) → (L, R) with all keys < k in L and ≥ k in R: recurse down one path, O(depth).
- merge(L, R) where all keys of L are < all keys of R: the root with the higher priority becomes the root; recursively merge into its inner side.

\`\`\`python
import random
class T:
    __slots__ = ("k", "p", "l", "r", "size")
    def __init__(self, k): self.k, self.p, self.l, self.r, self.size = k, random.random(), None, None, 1
def sz(t): return t.size if t else 0
def upd(t): t.size = 1 + sz(t.l) + sz(t.r)
def split(t, k):                       # (< k, >= k)
    if not t: return None, None
    if t.k < k:
        a, b = split(t.r, k); t.r = a; upd(t); return t, b
    a, b = split(t.l, k); t.l = b; upd(t); return a, t
def merge(a, b):
    if not a or not b: return a or b
    if a.p > b.p:
        a.r = merge(a.r, b); upd(a); return a
    b.l = merge(a, b.l); upd(b); return b
def insert(t, k):
    a, b = split(t, k); return merge(merge(a, T(k)), b)
\`\`\`

Insert = split + merge twice; delete = split out the key's range and merge the rest. Storing subtree **sizes** gives rank and k-th element in O(log n).

**Implicit treap**: drop the explicit keys and use the in-order **position** (computed from subtree sizes) as the key. The treap then represents a **sequence** supporting insert at any index, delete at any index, split, concatenate, and — with a lazy "reversed" flag — reverse a range, all in expected O(log n). It is a flexible "rope" for problems like "reverse subarrays repeatedly then print" or editor buffers.

## Splay tree

A splay tree (Sleator and Tarjan, 1985) is a plain BST that, after every access, **splays** the accessed node to the root using rotation patterns: zig (parent is the root), zig-zig (node and parent are both left or both right children: rotate the parent first, then the node), and zig-zag (opposite sides: rotate the node twice).

- Amortised O(log n) per operation (by a potential-function argument), with no balance information stored.
- **Adaptive**: frequently or recently accessed keys stay near the root (working-set and static-optimality properties), so skewed access patterns run faster than log n.
- Downsides: a single operation can take O(n); reads modify the tree (bad for concurrency and caches).
- Used in some allocators, caches, and as the building block of **link-cut trees** for dynamic forests.

## Cartesian trees

A Cartesian tree of an array is heap-ordered by value and in-order by index. It is built in O(n) with a monotonic stack. The minimum of a[i..j] is the LCA of i and j in the Cartesian tree, which links range-minimum queries to LCA. A treap is exactly a Cartesian tree on (key, random priority) pairs.

## Expected vs amortised vs worst case

| Structure | Guarantee | Source of the bound |
|---|---|---|
| AVL, red-black | worst case O(log n) | balance invariants |
| treap, skip list | expected O(log n) | random priorities / coin flips |
| splay tree | amortised O(log n) | potential function over sequences |
| plain BST | O(n) worst | none |

## Interview stance

Mention treaps or skip lists when you need an ordered structure with split, merge or rank and the language lacks one; in actual interview code, use the standard library's ordered map (or SortedList). Implicit treaps are the go-to answer for "sequence with insert, delete and reverse at arbitrary positions".

## Connections

Rotations come from balanced BSTs; random BST depth explains quicksort's expected cost (the same recursion); Cartesian trees connect to monotonic stacks and range-minimum queries.
`,
    doubts: [
      ["Why is a treap balanced in expectation?", "Its shape equals a BST built by inserting keys in order of their random priorities, i.e. a random insertion order, whose expected height is O(log n) regardless of the actual key order."],
      ["What does an implicit treap buy?", "Using subtree sizes as implicit keys, the treap represents a sequence; split by position and merge give O(log n) insertions, deletions, concatenations and (with lazy flags) reversals anywhere in the sequence."],
      ["Why does a random BST have expected depth O(log n)?", "The root is a uniformly random key, so it splits the keys like a random quicksort pivot; recursively, each subtree is again a random BST. The expected depth of a node equals the expected number of pivots that \"separate\" it on its way down, which is 2·H_n ≈ 2 ln n."],
      ["How does an implicit treap reverse a range?", "Split out the range [l, r] as a separate treap, toggle a lazy \"reversed\" flag on its root, and merge back. Whenever a node with the flag is visited, swap its children and push the flag down, exactly like lazy propagation."],
      ["Are splay trees used in practice despite O(n) single operations?", "Yes, where access patterns are skewed and amortised cost matters more than per-operation latency: for example in some memory allocators, network routers' caches, and GCC's internal data structures. Latency-sensitive or concurrent systems prefer balanced trees."],
    ],
    revise: md`
? Treap invariants? :: BST by key, heap by random priority.
? Core treap operations? :: Split and merge.
? Implicit treap? :: Positions as keys: sequence edits and reversals in O(log n).
? Splay tree bound? :: Amortised O(log n); recently used near the root.
? Cartesian tree construction? :: O(n) with a monotonic stack.
? Treap uniqueness fact? :: Distinct keys and priorities determine one tree: the BST from inserting by decreasing priority.
? Treap insert via split/merge? :: split(t, k) → (a, b); merge(merge(a, node), b).
? Splay rotation cases? :: Zig, zig-zig (rotate parent first), zig-zag (rotate node twice).
? Cartesian tree RMQ link? :: min of a[i..j] = LCA(i, j).
`,
    pitfalls: ["Forgetting to update subtree sizes after split/merge", "Pushing lazy flags too late"],
    quiz: [Q("A treap is a heap with respect to…", ["keys", "*random priorities", "subtree sizes", "depths"], "And a BST with respect to keys.")],
    sources: [S.paper("Randomized search trees (Seidel & Aragon, 1996)", "Algorithmica", "https://doi.org/10.1007/BF01940876"), S.paper("Self-adjusting binary search trees (Sleator & Tarjan, 1985)", "Journal of the ACM", "https://doi.org/10.1145/3828.3835"), S.article("Treap", "cp-algorithms", "https://cp-algorithms.com/data_structures/treap.html")],
    problems: [1206, 2407],
  },
};
