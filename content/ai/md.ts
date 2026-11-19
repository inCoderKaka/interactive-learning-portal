/**
 * Template tag for lesson markdown that contains TeX: backslashes are kept as written (String.raw), and \` becomes a
 * plain backtick so inline code still works. Never put "${" in a lesson: it would interpolate.
 */
export const md = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/\\`/g, "`");
