// Pure text-to-speech shaping for the article reader: no DOM, no browser APIs, so it runs under node --test.
// The reader speaks what a person would say, not the characters on the page: "O(n log n)" becomes
// "O of n log n", "→" becomes "to", a formula is read as maths, a code line as code is read aloud.

/** A spoken string aligned to the source text it came from, so word boundaries can be highlighted on the page. */
export interface Aligned {
  out: string;
  /** For each output piece: [outStart, outEnd, srcStart, srcEnd, fixed]. Unfixed pieces map character by character. */
  pieces: [number, number, number, number, boolean][];
}

type Rule = [RegExp, string | ((m: RegExpExecArray) => string)];

const NUM_WORD: Record<string, string> = { K: "thousand", M: "million", B: "billion", T: "trillion" };
const GREEK: Record<string, string> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", Δ: "delta", ε: "epsilon", η: "eta", θ: "theta", λ: "lambda", μ: "mu",
  π: "pi", σ: "sigma", Σ: "sum", τ: "tau", φ: "phi", ω: "omega", ξ: "xi", ρ: "rho", χ: "chi", ψ: "psi", ℝ: "R",
};
/** Words that text-to-speech engines say badly; mapped to how engineers say them. */
const LEXICON: Record<string, string> = {
  LoRA: "Lora", QLoRA: "Q Lora", ReLU: "relu", GELU: "gelu", SwiGLU: "swiglu", ReAct: "react", "DALL·E": "Dolly", "DALL-E": "Dolly",
  word2vec: "word-to-vec", seq2seq: "seq-to-seq", GloVe: "glove", PyTorch: "pie-torch", NumPy: "num-pie", LangChain: "lang-chain",
  LangGraph: "lang-graph", BERT: "bert", GPT: "G P T", GPU: "G P U", GPUs: "G P Us", TPU: "T P U", TPUs: "T P Us", vLLM: "V L L M",
  JSON: "jason", "JSON-RPC": "jason R P C", YAML: "yamel", SQL: "sequel", CUDA: "cuda", AdaGrad: "ada-grad", RMSprop: "R M S prop",
  "k-NN": "K nearest neighbours", KNN: "K nearest neighbours", "Q/K/V": "Q, K and V", "w.r.t.": "with respect to", OAuth: "oh-auth",
  "AlphaGo": "Alpha Go", "AlphaFold": "Alpha Fold", "DeepMind": "Deep Mind", ChatGPT: "Chat G P T", "GPT-4": "G P T 4", "GPT-3": "G P T 3",
  "GPT-2": "G P T 2", "o1": "oh one", "o3": "oh three", NotebookLM: "Notebook L M", SynthID: "Synth I D",
  "e.g.": "for example", "i.e.": "that is", "etc.": "etcetera", "vs.": "versus", vs: "versus", "approx.": "approximately",
};

function mathWords(s: string): string {
  return s
    .replace(/²/g, " squared").replace(/³/g, " cubed")
    .replace(/\^2\b/g, " squared").replace(/\^3\b/g, " cubed").replace(/\^([a-z0-9]+)/gi, " to the $1")
    .replace(/\*/g, " times ").replace(/·/g, " times ").replace(/\//g, " over ").replace(/\+/g, " plus ")
    .replace(/(?<=\w)\s*-\s*(?=\w)/g, " minus ").replace(/√/g, "root ").replace(/\s+/g, " ").trim();
}

const RULES: Rule[] = [
  // placeholders for atomic pieces (formulas) are handled by the caller; never touch them here
  [/\bO\(([^()]{1,24})\)/g, (m) => `O of ${mathWords(m[1])}`],
  [/\b(Θ|Ω)\(([^()]{1,24})\)/g, (m) => `${m[1] === "Θ" ? "theta" : "omega"} of ${mathWords(m[2])}`],
  [/(\d)²/g, "$1 squared"], [/(\d)³/g, "$1 cubed"], [/([a-z])²/g, "$1 squared"],
  [/\$(\d+(?:\.\d+)?)\s?([KMBT])\b/g, (m) => `${m[1]} ${NUM_WORD[m[2]]} dollars`],
  [/\b(\d+(?:\.\d+)?)([KMBT])\b(?![\w-])/g, (m) => `${m[1]} ${NUM_WORD[m[2]]}`],
  [/(\d)\s?[x×](?=[\s,.;)]|$)/g, "$1 times"],
  [/(\d)[–-](\d)/g, "$1 to $2"],
  [/\s*(?:→|->|⟶)\s*/g, " to "], [/\s*(?:⇒|=>)\s*/g, " implies "], [/\s*←\s*/g, " from "], [/\s*↔\s*/g, " to and from "],
  [/~(?=\d)/g, "about "], [/\s*≈\s*/g, " approximately "], [/\s*(?:≤|<=)\s*/g, " at most "], [/\s*(?:≥|>=)\s*/g, " at least "],
  [/\s*(?:≠|!=)\s*/g, " not equal to "], [/\s*≪\s*/g, " much less than "], [/\s*≫\s*/g, " much greater than "],
  [/\s*×\s*/g, " times "], [/\s*±\s*/g, " plus or minus "], [/√/g, "square root of "], [/∞/g, "infinity"],
  [/\s+[—–]\s+|—/g, ", "], [/\s*[·•]\s*/g, ", "], [/\s&\s/g, " and "], [/#(?=\d)/g, "number "],
  [/([A-Za-z]{3,})\/([A-Za-z]{3,})/g, "$1 or $2"],
  [/\b([a-z]+)_([a-z_]+)\b/g, (m) => m[0].replace(/_/g, " ")],
  [/\b([A-Za-z_][\w]*)\(\)/g, "$1"],
  [/[αβγδΔεηθλμπστφωξρχψℝ]/g, (m) => ` ${GREEK[m[0]]} `],
  [/[`*_]{1,3}/g, ""],
];

const LEX_RE = new RegExp(`(?<![\\w-])(${Object.keys(LEXICON).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\w-])`, "g");

/** Rewrite source text for speech while keeping an alignment back to the source characters. */
export function align(src: string, atoms: Record<string, string> = {}): Aligned {
  // a piece is [text, srcStart, srcEnd, fixed]
  let pieces: [string, number, number, boolean][] = [[src, 0, src.length, false]];
  const apply = (re: RegExp, rep: string | ((m: RegExpExecArray) => string)) => {
    const next: typeof pieces = [];
    for (const p of pieces) {
      if (p[3]) { next.push(p); continue; }
      const [text, s] = p;
      re.lastIndex = 0;
      let last = 0, m: RegExpExecArray | null;
      const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
      while ((m = g.exec(text))) {
        if (m[0] === "") { g.lastIndex++; continue; }
        if (m.index > last) next.push([text.slice(last, m.index), s + last, s + m.index, false]);
        const out = typeof rep === "string" ? m[0].replace(new RegExp(re.source, re.flags.replace("g", "")), rep) : rep(m);
        next.push([out, s + m.index, s + m.index + m[0].length, true]);
        last = m.index + m[0].length;
      }
      if (last < text.length) next.push([text.slice(last), s + last, s + text.length, false]);
    }
    pieces = next;
  };
  const atomKeys = Object.keys(atoms);
  if (atomKeys.length) apply(new RegExp(atomKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g"), (m) => ` ${atoms[m[0]]} `);
  apply(LEX_RE, (m) => LEXICON[m[1]]);
  for (const [re, rep] of RULES) apply(re, rep);
  // collapse whitespace across pieces while keeping offsets
  const outPieces: Aligned["pieces"] = [];
  let out = "";
  for (const [text, s, e, fixed] of pieces) {
    let t = text.replace(/\s+/g, " ");
    if (out.endsWith(" ") && t.startsWith(" ")) t = t.slice(1);
    if (!t) continue;
    outPieces.push([out.length, out.length + t.length, s, e, fixed]);
    out += t;
  }
  return { out, pieces: outPieces };
}

/** Map an output character range back to the source range it was spoken from. */
export function toSource(a: Aligned, outStart: number, outEnd: number): [number, number] {
  const at = (i: number, end: boolean): number => {
    for (const [os, oe, ss, se, fixed] of a.pieces) {
      if (i < os || i > oe || (i === oe && !end)) continue;
      if (fixed) return end ? se : ss;
      return Math.min(se, ss + (i - os));
    }
    return end ? (a.pieces.at(-1)?.[3] ?? 0) : (a.pieces[0]?.[2] ?? 0);
  };
  return [at(outStart, false), at(Math.max(outStart, outEnd), true)];
}

/** Plain speech form with no alignment, for strings that are never highlighted. */
export const speakable = (text: string) => align(text).out.trim();

/** The word at an output offset, as [start, end] in the output string. */
export function wordAt(out: string, i: number): [number, number] {
  let s = Math.max(0, Math.min(i, out.length));
  while (s > 0 && !/\s/.test(out[s - 1])) s--;
  let e = s;
  while (e < out.length && !/\s/.test(out[e])) e++;
  return [s, e];
}

const ABBREV = /(?:\b(?:[Ee]\.[Gg]|[Ii]\.[Ee]|vs|etc|Dr|Mr|Mrs|Ms|St|Fig|approx|al|cf|No|Jr|Sr|Inc|Ltd|U\.S|Ph\.D)\.|\b[A-Z]\.)$/;

/** Split text into sentence spans [start, end). Long sentences are cut at a comma or semicolon so speech engines stay stable. */
export function splitSentences(text: string, max = 260): [number, number][] {
  const out: [number, number][] = [];
  let start = 0;
  const push = (s: number, e: number) => {
    while (s < e && /\s/.test(text[s])) s++;
    while (e > s && /\s/.test(text[e - 1])) e--;
    if (e <= s) return;
    if (e - s <= max) { out.push([s, e]); return; }
    // cut long sentences at the last soft break before the limit
    let cut = -1;
    for (let i = s + max - 1; i > s + max / 3; i--) if (/[;,:)]/.test(text[i]) && /\s/.test(text[i + 1] ?? " ")) { cut = i + 1; break; }
    if (cut < 0) for (let i = s + max; i > s + max / 3; i--) if (/\s/.test(text[i])) { cut = i; break; }
    if (cut < 0) cut = s + max;
    out.push([s, cut]);
    push(cut, e);
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\n") { push(start, i); start = i + 1; continue; }
    if (c !== "." && c !== "!" && c !== "?") continue;
    // keep decimals (3.5), ellipses and abbreviations together
    if (c === "." && /\d/.test(text[i - 1] ?? "") && /\d/.test(text[i + 1] ?? "")) continue;
    if (text[i + 1] === "." || text[i - 1] === ".") continue;
    if (c === "." && ABBREV.test(text.slice(Math.max(0, i - 6), i + 1))) continue;
    let j = i + 1;
    while (j < text.length && /["'”’)\]]/.test(text[j])) j++;
    if (j < text.length && !/\s/.test(text[j])) continue;
    push(start, j);
    start = j;
    i = j - 1;
  }
  push(start, text.length);
  return out;
}

// ---------- maths ----------

const TEX_WORDS: Record<string, string> = {
  cdot: "times", times: "times", div: "divided by", pm: "plus or minus", le: "is at most", leq: "is at most", ge: "is at least", geq: "is at least",
  ne: "is not equal to", neq: "is not equal to", approx: "is approximately", sim: "drawn from", in: "in", notin: "not in", to: "to", rightarrow: "to",
  leftarrow: "becomes", gets: "becomes", Rightarrow: "implies", implies: "implies", infty: "infinity", ll: "much less than", gg: "much greater than",
  propto: "is proportional to", forall: "for all", exists: "there exists", partial: "partial", nabla: "the gradient", log: "log", ln: "natural log",
  exp: "exp", max: "max", min: "min", argmax: "arg max", argmin: "arg min", sin: "sine", cos: "cos", tanh: "tanh", sigma: "sigma", succ: "is preferred to",
  ldots: "and so on", cdots: "and so on", dots: "and so on", quad: ",", qquad: ",", lfloor: "the floor of", rfloor: "", lceil: "the ceiling of", rceil: "",
  mid: "given", vert: "", lvert: "", rvert: "", langle: "", rangle: "", top: "transpose", prime: "prime", star: "star", circ: "composed with", odot: "element-wise times",
  oplus: "plus", otimes: "tensor", cup: "union", cap: "intersect", subset: "subset of", emptyset: "the empty set",
};
const TEX_GREEK = ["alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega", "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi", "Psi", "Omega"];
const TEX_OPS: Record<string, string> = { "=": "equals", "+": "plus", "-": "minus", "<": "is less than", ">": "is greater than", "/": "over", ",": ",", "!": "factorial", "|": "", "'": "prime", ":": "", ";": "," };

/** Read a TeX formula the way a person reads it aloud. Covers what lessons use: fractions, roots, sums, scripts, Greek, accents, norms. */
export function texToSpeech(tex: string): string {
  let i = 0;
  const s = tex.replace(/\\left|\\right|\\big|\\Big|\\bigg|\\Bigg|\\displaystyle|\\,|\\;|\\!|\\:/g, " ");
  const group = (): string => {
    skip();
    if (s[i] === "{") {
      i++;
      const start = i;
      let depth = 1;
      while (i < s.length && depth) { if (s[i] === "{") depth++; else if (s[i] === "}") depth--; i++; }
      return texToSpeech(s.slice(start, i - 1));
    }
    return atom();
  };
  const rawGroup = (): string => {
    skip();
    if (s[i] !== "{") return s[i++] ?? "";
    i++;
    const start = i;
    let depth = 1;
    while (i < s.length && depth) { if (s[i] === "{") depth++; else if (s[i] === "}") depth--; i++; }
    return s.slice(start, i - 1);
  };
  const skip = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  // the argument of ^ or _: a braced group, or one bare token that does not take scripts of its own
  const arg = (): string => {
    skip();
    if (s[i] === "{") return group();
    if (s[i] === "\\") {
      i++;
      const m = /^[A-Za-z]+/.exec(s.slice(i));
      const name = m ? m[0] : s[i];
      i += name.length;
      return TEX_GREEK.includes(name) ? name.toLowerCase().replace(/^var/, "") : TEX_WORDS[name] ?? name;
    }
    if (/\d/.test(s[i] ?? "")) return s[i++];
    const c = s[i++] ?? "";
    return TEX_OPS[c] ?? c;
  };
  const script = (base: string): string => {
    let out = base;
    for (;;) {
      skip();
      if (s[i] === "^") {
        i++;
        const g = arg().trim();
        out += g === "2" ? " squared" : g === "3" ? " cubed" : g === "transpose" || g === "T" ? " transpose" : g === "minus 1" ? " inverse" : g === "prime" ? " prime" : ` to the ${g}`;
      } else if (s[i] === "_") {
        i++;
        const g = arg().trim();
        out += g.split(" ").length === 1 ? ` ${g}` : ` sub ${g}`;
      } else return out;
    }
  };
  const atom = (): string => {
    skip();
    const c = s[i];
    if (c === undefined) return "";
    if (c === "\\") {
      i++;
      if (s[i] === "\\") { i++; return ","; }
      if (s[i] === "|") { i++; return "norm"; }
      if (s[i] === "{" || s[i] === "}") { i++; return ""; }
      const m = /^[A-Za-z]+/.exec(s.slice(i));
      const name = m ? m[0] : s[i];
      i += name.length;
      if (name === "frac" || name === "dfrac" || name === "tfrac") { const a = group(), b = group(); return `${a} over ${b},`; }
      if (name === "sqrt") { return `the square root of ${group()},`; }
      if (name === "sum" || name === "prod" || name === "int") {
        let lo = "", hi = "";
        for (let k = 0; k < 2; k++) { skip(); if (s[i] === "_") { i++; lo = group(); } else if (s[i] === "^") { i++; hi = group(); } }
        const word = name === "sum" ? "the sum" : name === "prod" ? "the product" : "the integral";
        return `${word}${lo ? ` over ${lo}` : ""}${hi ? ` to ${hi}` : ""} of`;
      }
      if (name === "mathbb" && /^\s*\{?E/.test(s.slice(i))) { group(); skip(); let lo = ""; if (s[i] === "_") { i++; lo = group(); } return `the expected value${lo ? ` over ${lo}` : ""} of`; }
      if (["text", "mathrm", "mathbf", "mathit", "operatorname", "mathcal", "mathbb", "boldsymbol", "textbf", "mathsf"].includes(name)) return script(rawGroup().replace(/_/g, " ").replace(/\\/g, ""));
      if (name === "hat" || name === "tilde" || name === "bar" || name === "vec" || name === "dot") return script(`${group()} ${name === "vec" ? "vector" : name}`);
      if (name === "begin") { rawGroup(); return ""; }
      if (name === "end") { rawGroup(); return ""; }
      if (TEX_GREEK.includes(name)) return script(name.toLowerCase().replace(/^var/, ""));
      if (name in TEX_WORDS) return script(TEX_WORDS[name]);
      return script(name);
    }
    if (c === "{") return script(group());
    if (c === "}") { i++; return ""; }
    if (c === "(" || c === ")" || c === "[" || c === "]") { i++; return c === "(" || c === "[" ? script("") : script(""); }
    if (c === "&") { i++; return ","; }
    if (c in TEX_OPS) { i++; return TEX_OPS[c]; }
    if (/\d/.test(c)) { const m = /^\d+(?:\.\d+)?/.exec(s.slice(i))!; i += m[0].length; return script(m[0]); }
    i++;
    return script(c);
  };
  const words: string[] = [];
  while (i < s.length) { const w = atom(); if (w) words.push(w); }
  return words.join(" ").replace(/\s+,/g, ",").replace(/,+/g, ",").replace(/\s+/g, " ").replace(/^,\s*|,\s*$/g, "").trim();
}

// ---------- code ----------

export type Lang = "python" | "javascript" | "typescript" | "cpp" | "java" | "json" | "bash" | "text";

export function guessLang(code: string, hint = ""): Lang {
  const h = hint.toLowerCase().replace(/^language-/, "");
  if (/^(py|python)$/.test(h)) return "python";
  if (/^(ts|tsx|typescript)$/.test(h)) return "typescript";
  if (/^(js|jsx|javascript)$/.test(h)) return "javascript";
  if (/^(c\+\+|cpp|cc|c)$/.test(h)) return "cpp";
  if (h === "java") return "java";
  if (h === "json") return "json";
  if (/^(sh|bash|shell|zsh)$/.test(h)) return "bash";
  if (/^\s*[{[]/.test(code) && /"\w+"\s*:/.test(code)) return "json";
  if (/^\s*(def |class |import |from \w+ import)/m.test(code) || /:\s*$/m.test(code) && !/[;{]\s*$/m.test(code)) return "python";
  if (/#include|std::|->\w|::/.test(code)) return "cpp";
  if (/\b(const|let|function|=>|interface|export)\b/.test(code)) return "typescript";
  if (/\bpublic\s+(class|static)\b/.test(code)) return "java";
  return "text";
}

const LANG_NAME: Record<Lang, string> = { python: "Python", javascript: "JavaScript", typescript: "TypeScript", cpp: "C++", java: "Java", json: "JSON", bash: "shell", text: "" };

const ident = (s: string) => s.replace(/_+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();

/** One line of code, read aloud the way an engineer reads it to a colleague. */
export function codeLineToSpeech(line: string, lang: Lang = "text"): string {
  const t = line.trim();
  if (!t || /^[{}()[\];,]+$/.test(t)) return "";
  const comment = /^(?:#|\/\/|--)\s?(.*)$/.exec(t);
  if (comment) return comment[1].trim() ? `Note: ${speakable(comment[1])}` : "";
  let m: RegExpExecArray | null;
  if ((m = /^(?:async\s+)?def\s+(\w+)\s*\((.*)\)\s*(?:->\s*([^:]+))?:/.exec(t))) {
    const args = m[2].split(",").map((a) => ident(a.split(/[:=]/)[0].trim())).filter((a) => a && a !== "self");
    return `define ${ident(m[1])}${args.length ? `, taking ${args.join(", ")}` : ""}${m[3] ? `, returning ${ident(m[3].trim())}` : ""}`;
  }
  if ((m = /^class\s+(\w+)\s*(?:\((.*)\))?\s*[:{]?/.exec(t))) return `class ${ident(m[1])}${m[2] ? `, built on ${ident(m[2])}` : ""}`;
  if ((m = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\((.*)\)/.exec(t))) {
    const args = m[2].split(",").map((a) => ident(a.split(/[:=]/)[0].trim())).filter(Boolean);
    return `function ${ident(m[1])}${args.length ? `, taking ${args.join(", ")}` : ""}`;
  }
  if ((m = /^(?:from\s+([\w.]+)\s+)?import\s+(.+)$/.exec(t)) && lang === "python") return m[1] ? `from ${ident(m[1].replace(/\./g, " "))}, import ${ident(m[2].replace(/,/g, " and"))}` : `import ${ident(m[2])}`;
  if ((m = /^@(\w+)/.exec(t))) return `decorated with ${ident(m[1])}`;
  if ((m = /^for\s+(.+?)\s+in\s+(.+?):$/.exec(t))) return `for each ${exprToSpeech(m[1])} in ${exprToSpeech(m[2])}`;
  if ((m = /^(if|elif|while)\s+(.+?):$/.exec(t))) return `${m[1] === "elif" ? "else if" : m[1]} ${exprToSpeech(m[2])}`;
  if (/^else\s*:?\s*\{?$/.test(t)) return "otherwise";
  if ((m = /^return\s+(.*)$/.exec(t))) return `return ${exprToSpeech(m[1])}`;
  return exprToSpeech(t.replace(/;$/, "").replace(/\{$/, "").replace(/:$/, ""));
}

function exprToSpeech(e: string): string {
  let s = e;
  const trailing = /\s(?:#|\/\/)\s?(.*)$/.exec(s);
  if (trailing) s = s.slice(0, trailing.index);
  s = s
    .replace(/(["'])(.*?)\1/g, (_, __, str) => ` the text ${str} `)
    .replace(/\bself\./g, "self dot ").replace(/\bthis\./g, "this dot ")
    .replace(/(\w)\.(\w)/g, "$1 dot $2")
    .replace(/\*\*/g, " to the power ").replace(/\/\//g, " integer divided by ")
    .replace(/\+=/g, " plus equals ").replace(/-=/g, " minus equals ").replace(/\*=/g, " times equals ")
    .replace(/===?/g, " equals ").replace(/!==?/g, " is not ").replace(/<=/g, " at most ").replace(/>=/g, " at least ")
    .replace(/->|=>/g, " gives ").replace(/&&|\band\b/g, " and ").replace(/\|\||\bor\b/g, " or ").replace(/(^|[^=!<>])=(?!=)/g, "$1 is ")
    .replace(/</g, " less than ").replace(/>/g, " greater than ").replace(/(\w)\s*\(/g, "$1 of (").replace(/\[/g, " at ").replace(/\]/g, " ")
    .replace(/[(){};]/g, " ").replace(/\*/g, " times ").replace(/\//g, " over ").replace(/\+/g, " plus ").replace(/\s-\s/g, " minus ")
    .replace(/%/g, " mod ").replace(/@/g, " matrix times ").replace(/!/g, " not ").replace(/:/g, " ");
  s = s.split(/\s+/).map((w) => (/^[A-Za-z_]\w*$/.test(w) ? ident(w) : w)).join(" ");
  const out = s.replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").trim();
  return trailing && trailing[1].trim() ? `${out}. ${speakable(trailing[1])}` : out;
}

export interface CodeStep { from: number; to: number; say: string } // 1-based, inclusive line numbers

/** Narration for a code block without an AI model: short snippets line by line, long ones by their definitions and comments. */
export function describeCode(code: string, hint = ""): { lang: Lang; intro: string; steps: CodeStep[] } {
  const lang = guessLang(code, hint);
  const lines = code.replace(/\s+$/, "").split("\n");
  const n = lines.length;
  const defs = lines.map((l, k) => [l, k] as const).filter(([l]) => /^\s*(?:async\s+)?(?:def|class|function|export\s+(?:async\s+)?function|interface)\s+\w+/.test(l));
  const names = defs.map(([l]) => ident(/(?:def|class|function|interface)\s+(\w+)/.exec(l)![1]));
  const what = lang === "json" ? `A JSON object with ${Math.max(1, (code.match(/"\w+"\s*:/g) ?? []).length)} fields` : `A ${n}-line ${LANG_NAME[lang] || "code"} snippet`.replace(/ +/g, " ");
  const intro = `${what}.${names.length ? ` It defines ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`}.` : ""}`;
  const steps: CodeStep[] = [];
  if (n <= 12) {
    lines.forEach((l, k) => { const say = codeLineToSpeech(l, lang); if (say) steps.push({ from: k + 1, to: k + 1, say }); });
  } else {
    lines.forEach((l, k) => {
      const isDef = defs.some(([, d]) => d === k);
      const isComment = /^\s*(#|\/\/)\s?\S/.test(l);
      if (!isDef && !isComment) return;
      const say = codeLineToSpeech(l, lang);
      if (say) steps.push({ from: k + 1, to: k + 1, say });
    });
    if (steps.length > 14) steps.splice(14);
  }
  return { lang, intro, steps };
}

// ---------- tables ----------

/** A table read row by row: "For Adam: idea, momentum plus RMSprop; when, the default." Large tables are cut short. */
export function describeTable(headers: string[], rows: string[][], maxRows = 8): { intro: string; rows: string[]; outro: string } {
  const h = headers.map((x) => speakable(x));
  const cols = Math.max(h.length, ...rows.map((r) => r.length));
  const named = h.filter(Boolean);
  const intro = `A table with ${rows.length} row${rows.length === 1 ? "" : "s"}${named.length ? `, comparing ${named.slice(1).length ? `${named.slice(1).join(", ")} across each ${named[0] || "row"}` : named[0]}` : ` and ${cols} columns`}.`;
  const said = rows.slice(0, maxRows).map((r) => {
    const cells = r.map((c) => speakable(c));
    const head = cells[0] || "";
    const rest = cells.slice(1).map((c, k) => (c ? (h[k + 1] ? `${h[k + 1]}: ${c}` : c) : "")).filter(Boolean);
    return rest.length ? `${head}. ${rest.join("; ")}.` : `${head}.`;
  });
  const outro = rows.length > maxRows ? `And ${rows.length - maxRows} more rows, which you can read on the page.` : "";
  return { intro, rows: said, outro };
}

/** Rough listening time in minutes for a word count at a given rate. */
export const listenMinutes = (words: number, rate = 1) => Math.max(1, Math.round(words / (165 * rate)));

/** Deterministic pick from a list, so the same block always gets the same lead-in. */
export function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(Math.imul(seed + 1, 2654435761)) % list.length];
}
