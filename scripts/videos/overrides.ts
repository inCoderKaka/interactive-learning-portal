/**
 * Manual decisions from reading every unmatched title (the "check for missing videos" pass).
 * video id → targets: outline page ids, chapter ids, or LeetCode numbers as strings. [] = reviewed and off-topic.
 * Grouped by channel; titles are kept in comments so a later pass can audit the decision.
 */
export const OVERRIDES: Record<string, string[]> = {
  // ── NeetCode / NeetCodeIO
  "UrcwDOEBzZE": ["complexity"], // Most Common Concepts for Coding Interviews
  "uhYq27iSk9s": ["dynamic-arrays", "complexity"], // Top 8 Data Structures for Coding Interviews
  "ft0owvS5tQA": ["complexity"], // Top 6 Coding Interview Concepts
  "utDu3Q7Flrw": ["graph-traversal"], // Top 5 Most Common Graph Algorithms
  "tohk1ETx3ZM": ["complexity"], // The Best Order to learn Algorithms & Data Structures
  "roanIWKtGMY": ["constraints-budget"], // How I Approach a New Leetcode Problem
  "Rxd3W1wnlEc": ["constraints-budget"], // Making an Algorithm Faster
  "Y6Lo38YPWjY": ["bs-boundaries"], // Brute Force Search on a Sorted List
  "0K_eZGS5NsU": ["coding-round"], // Python for Coding Interviews
  "46dZH7LDbf8": ["coding-round"], // Mock Google Coding Interview
  "rMj6KnxZu5M": ["coding-round"], // Top 5 Coding Interview MISTAKES
  "jbuascMffJk": ["coding-round"], // Common Coding Interview Mistakes
  "4SUJt3dP2Jc": ["google-loop"], // How I Failed the Google Coding Interview
  "T53EyLPj4UM": ["google-loop"], // How I Cracked the Google Coding Interview
  "CqCqX9_86R8": ["google-loop"], // How I Interviewed Candidates at Google
  "tpmdvmcb6zQ": ["coding-round"], // All the Coding Interviews I Failed
  "4vH8fYpkg5I": [], // Program vs Process (OS, not in the curriculum)

  // ── WilliamFiset
  "rGdDSi4S0pY": ["dp-foundations"], // Dynamic Programming 1 [Programming Competition Problems]
  "piKq7gvOPS8": ["graph-traversal"], // Graph Theory 1 [Programming Competition Problems]
  "oQQO_n57SB0": ["grid-dp"], // Narrow Art Gallery
  "pPgBZqY_Xh0": ["counting-dp"], // Mountain Scenes
  "_tur2nPkIKo": ["linear-dp"], // Magic Cows
  "bC7PYm9s1Vc": ["string-basics"], // String Manipulation 2
  "LURXsBIoSqI": ["string-basics"], // String Manipulation 1
  "PQIR2E-xva8": [], // Logic 1
  "UYrYziWSyFE": [], // Introduction [Programming Competition Problems]

  // ── Abdul Bari
  "2Rr2tW9zvRg": ["recurrences"], // Divide And Conquer
  "5v-tKX2uRAk": ["big-o"], // Compare Class of Functions
  "868qXWoGS9E": ["dynamic-arrays"], // Pointer to Array
  "uMGwjNuidZU": [], "OqLt2GfX6jg": [], "h1Sq8p2GL2g": [], "MuALK4KcNMc": [], "On9mzziI2pU": [], "OnbpCg96w0I": [], "1xz7OxASXUc": [], "-JYLuv7mmxM": [], "deXGenXXoaI": [], "oj0SA_AVFNI": [],

  // ── codestorywithMIK (DSA)
  "Lzvqu8WPNh8": ["tree-dfs-returns"], // Count the nodes at distance K from leaf
  "Nrdm2a5gsr8": ["tree-dfs-returns"], // Paths from root with a specified sum
  "_twHfnNwTwE": ["greedy-proofs"], // Water the plants
  "-ZKUZU7s5Kw": ["queues-deques"], // Techfest and the Queue
  "FUPP7bHG9Dw": ["counting-patterns"], // Array Pair Sum Divisibility
  "Q9EhdRmisVU": ["2131"], // Longest Palindrome by Concatenating Two Letter Words
  "O3fwYjcMV_M": ["math"], // Factorial Of Large Numbers
  "gsSLay-wcaw": ["167"], // Two Sum II
  "_Y31ipIHqpo": ["constraints-budget"], // Struggling With Logic in Coding
  "Ip5pGCHCIHk": [], "9UOeG-1t2WM": [], "yGLTVg9U8BA": [], "d-09T3jnbyA": [], "N8XRCIFtROs": [],

  // ── Aryan Mittal (DSA)
  "lQ7z0IMugHU": ["cycle-detection"], // G-14 Detect a Cycle in an Undirected Graph
  "II8rNDCpyLc": ["tree-dfs-returns"], // G-11 Calculate Subtree size
  "tgIRmnRw3LU": ["graph-representations"], // G-02 Conventions in Graph World
  "klSwJQg1aDQ": ["graph-representations"], // G-01 Graph as a Data Structure
  "1EoAb_dFez4": ["complexity"], // Top 10 DSA Concepts with Real Life Examples
  "SGaW2_mxuR8": ["math"], // Top 10 Imp Math Concepts
  "XZeX7zHS3vM": ["constraints-budget"], // Building Intuition & Logic in Programming
  "D0mIwCfgIWw": ["coding-round"], // Crack OA like a PRO
  "GQ30vcIKDuU": ["coding-round"], // NEVER say this in an Interview
  "BiXj87-nUmQ": ["combinatorics"], "XOZvKglvrpg": ["combinatorics"], "SQSTsB39qMs": ["combinatorics"], "ubMmgMT_TUk": ["combinatorics"], "L6EQRyKGMSk": ["combinatorics"], // Pigeonhole principle L-06..L-10
  "NxCDVNECMZI": ["modular"], // L-05 Fast Modulo Exponentiation
  "FuOY-mKg7Sw": ["math"], "cPqzrr1VULU": ["math"], "jNXfSuZKjso": ["math"], // Mathematics for CP L-00..L-02
  "Q3Pq-SM3c-U": ["linear-dp"], "Eb46KE0zwjI": ["linear-dp"], // ZCO-2014 DP
  "7N8stua0bJo": ["counting-dp"], // Count Binary Strings
  "yacYeZYOYPU": ["counting-dp"], // Friends Pairing
  "K3e3e5HsT1g": ["linear-dp"], "Dr_ASsfyxu4": ["linear-dp"], // Staircase + Snake
  "1Ml5SGgwiBs": ["dp-foundations"], "BLY8AK5A07k": ["dp-foundations"], "YJegzsMAURE": ["dp-foundations"], "WydtD66qqq4": ["dp-foundations"], "ucgtJTOkFdc": ["dp-foundations"],
  "vIPuhr2-dhk": ["xor-tricks"], "J-tl7Pcurds": ["xor-tricks"], // UNIQUE NUMBER I/II
  "mEygnAQnTcE": ["bit-counting"], "8FUhGfaB1Kg": ["bit-basics"],
  "Z3Q3DDjULj8": ["bitmask-enum"], // Lucky Numbers (CF)
  "RFlkoVr4Fio": ["xor-tricks"], "tN8wEDNZKF4": ["arrays-hashing"], "tUPRTiWSYFo": ["kadane"], // InterviewBit arrays
  "ls_hXAmOEzU": [], "7kHTR-c1piQ": [], "obxTNTpbPy8": [], "lije16Yo3xA": [], "v-zxOyjsKDs": [], "nFkckyHp4oc": [], "WMuwuw5nRBQ": [], "zPejND_NR-U": [], "-0TVF5VbGMo": [], "p9W7VhhkZag": [], "XKALSqUho7A": ["google-loop"], "OsMdw1GCvK8": [], "moOHfCXDTaI": [],
  "JDqM5x2vduE": ["3409"], "wLfGkk1x-lc": ["3218", "3219"], "_RfJsYC-ScM": ["3181", "3180"], "8d9tOlk7g9w": ["1382", "108"],

  // ── Techdose (DSA)
  "nH-gIu8ZB3g": ["constraints-budget"], "xUxxSqgLxYM": ["constraints-budget"], "_LCsw5J-Mj0": ["constraints-budget"], "8yjxtepvZxM": ["constraints-budget"],
  "Q-YKCjn3mqo": ["complexity"], "6656WJa_HBU": [], "k8RYIs2uwM4": [], "636B9yiMs5s": [], "htrBg9qxUJ8": [], "YVPCV_R5V_Q": [], "ich1jiTywGk": [], "NCQQGoHnx9U": ["coding-round"], "4vLXoTFBB54": ["coding-round"], "Vykg0oU925I": [], "1fay8jN-b1A": [], "rHKwj3DdqLM": [], "gX8ZapEkpUY": [],
  "QbY1ILunh_o": ["gcd-primes"], "BxB_ht8vpUw": ["math"], "bW9EMtTLTgg": ["bit-basics"], "xFWgZ5DTjFo": ["bitmask-enum"],
  "_TCw4LXpKq0": ["bs-2d-median"], "4kAwJkyxG08": ["bs-boundaries"], "sSYQ1H9-Vks": ["bs-boundaries"], "BDVYtuWXgXE": ["bs-boundaries"], "hF9iJEPegNc": ["bs-boundaries"], "wNOoyZ45SmQ": ["bs-boundaries"],
  "2qbZKZfs8aA": ["comparison-sorts"], // External sorting
  "tJK7vjNKdLY": ["top-k"], "TdMAsIIM_n8": ["heap-internals"], "KkeIB6soiVI": ["heap-internals"], "qQkfUKer3LU": ["heap-internals"], "N0Frqx9UlrI": ["heap-internals"], "RU08pp_VPSs": ["heap-internals"], "A1fc2Robnk0": ["stack-design"],
  "tEdsR9_VUQI": ["grid-dp"], "QihB4bI6BJw": ["subset-sum"], "MqYLmIzl8sQ": ["subset-sum"], "mGfK-j9gAQA": ["knapsack-01"], "ReYPIilhrIo": ["knapsack-01"], "CiIa0Wut6dc": ["dp-foundations"], "f19e_ofbydc": ["dp-foundations"],
  "Ub-fJ-KoBQM": ["mst"],
  "Lyay4WJwXyI": ["prefix-hash"], "SiE1XFhYoaA": ["bs-answer"], "Mu4b6dLfCks": ["tree-dfs-returns"], "K2E5fMMAf5U": ["matrix-search"], "-3rVMYGBwO0": ["trie-search"], "zNVT8SnGRig": ["bs-answer"],
  "QMlDCR9xyd8": ["stack-design"], "gd9xEAnxXzc": ["stack-design"], "zcnVaVJkLhY": ["greedy-reach"], "FPvAfpSXjRw": ["stack-parsing"], "qEIGhVtZ-sg": ["179"], "NWMcj5QFW74": ["merge-pointers"],
  "qObJQesvZUU": ["geometry"], "m13Omjv43eM": ["sweep-line"], "bbTqI0oqL5U": ["geometry"], "0NHKfX7hkNA": ["greedy-proofs"], "gCQ0mxl71x0": ["space-recursion"],
  "n5QY3x_GNDg": ["counting-patterns"], "0s3zqYaDInE": ["bit-basics"], "f4jUEEzjEJw": ["interval-dp"], "-IFmgue8sF0": ["monotonic-stack"], "ldhT2uVSdUQ": ["bit-basics"], "9y7bTW90BCo": ["bit-basics"], "OTkoJOP6m6w": ["xor-tricks"],
  "TKvbwPIOGCM": ["bst-inorder"], "AIokcTT0LuE": ["tree-bfs"], "RGE0W2iUkuI": ["xor-tricks"], "caAVlibiTkY": ["graph-representations"], "DFLoQSl50Fk": [], "8TucVj30XbM": ["ll-basics", "dynamic-arrays"], "9uwjGDTHqPY": ["ll-basics"], "RzoG9Io94wQ": ["dynamic-arrays"],
  "Ztt-VtNyqL8": ["bit-basics"], "7IQHYbmuoVU": ["subsets-combinations"], "h6_lIwZYHQw": ["greedy-proofs"], "dgNdDMMb8Rk": ["lis"], "UsWDLWuBUls": ["trie-basics"], "03ZepmoVJGI": ["linear-dp"],
  "2I9XO8jwZCA": ["string-basics"], "9_zh42lp3lk": ["string-basics"], "5e63aHK6Q-E": ["string-basics"], "yJv_ltADGuA": ["stack-parsing"], "38JLfQGVlkw": ["sweep-line"], "SnU0xiQ_jJ0": ["arrays-hashing"], "c9imv2LvgWk": ["prefix-sums"],
  "owZhw-A0yWE": ["custom-sort"], "ZRoVWxBngX0": ["arrays-hashing"], "DeLnQpIxo-A": ["merge-pointers"], "6KHW7ZQwtCA": ["xor-tricks"], "ZD7WxJ3O2XE": ["opposite-pointers"], "Ofl4KgFhLsM": ["variable-window"], "glaVznehaCk": ["space-recursion"],
  "ZNh35dFqklM": ["math"], "8_RFvmok980": [], "eUiLzMPRamM": ["math"], "BoRgi2f_SPU": ["randomized"], "V4vXpmX9OOc": [], "w_XYpRi7YiU": [], "oGYFJ9gSBKw": ["combinatorics"], "0Q_U9_gryRg": ["combinatorics"], "78Yx7oLA43s": ["linear-dp"],
  "PVieySxgEik": ["ll-basics"], "ojMzw2gehaw": ["ll-basics"], "o5ZhdQFnLhA": ["ll-basics"], "0aVmACL_We4": ["fast-slow"], "fz40YQ8Fg_I": ["xor-tricks"], "MTjb-vgjzqs": ["ll-reversal"], "5PLdnPfkO6w": ["ll-reversal"], "0b4u72Kymqw": ["fast-slow"], "2C7WrpgnLDw": ["fast-slow"],
  "usooJa2u72M": ["comparison-sorts"], "SRO5f4qdtQI": ["comparison-sorts"], "t8r6wyG8eAU": ["comparison-sorts"], "aFswaBnWKLk": ["comparison-sorts", "randomized"], "Qg_a1jrIhoc": ["comparison-sorts"], "yAR6rbEZP2k": ["comparison-sorts"], "SCUYnQxZsPE": ["comparison-sorts"], "_6axWtVFPdM": ["big-o"],
  "FEOMmxjuZrY": ["suffix-structures"], "_fbw0N23lDM": ["matrix-in-place"], "blM-m6iMHvM": ["modular"], "Fb62cCPnuY0": ["tree-traversals"], "xSa0sD-RqMg": ["stack-design"], "ww5Ac232WEU": ["stack-design"], "v6GAir9cphk": [],
};
