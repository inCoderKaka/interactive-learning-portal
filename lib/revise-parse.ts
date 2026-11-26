/** Shared with components/Revise.tsx: "? prompt :: answer" lines become recall items (kept React-free for scripts). */
export type ReviseBlock = { kind: "md"; body: string } | { kind: "recall"; items: [q: string, a: string][] };
export function parseRevise(text: string): ReviseBlock[] {
  const out: ReviseBlock[] = [];
  let md: string[] = [];
  const flush = () => { const b = md.join("\n").trim(); if (b) out.push({ kind: "md", body: b }); md = []; };
  for (const line of text.split("\n")) {
    const m = /^\s*\?\s+(.+?)\s+::\s+(.+)$/.exec(line);
    if (m) {
      flush();
      const last = out[out.length - 1];
      if (last?.kind === "recall") last.items.push([m[1], m[2]]); else out.push({ kind: "recall", items: [[m[1], m[2]]] });
    } else md.push(line);
  }
  flush();
  return out;
}
