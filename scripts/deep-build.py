#!/usr/bin/env python3
"""
Compile a markdown source of whole subtopic pages into content/deep/<area>/<file>.ts and notes/<file>.ts.
Used for HLD / LLD / AI, where pages are authored from scratch. The .md source is the file to edit.

Usage: python3 scripts/deep-build.py hld/foundations      (reads content/deep/hld/src/foundations.md)

Source format, any number of pages:

    === <subtopic id>
    blurb: one or two sentences
    signals: first | second | third
    widgets: id, id            (optional)
    prereq: id, id             (optional)
    --- lesson
    markdown (:::callouts, [[widget:id]], [[yt:id|title|channel]])
    --- revise
    "? prompt :: answer" lines, ### groups, tables
    --- notes
    cheat-sheet lines, ## groups
    --- doubts
    Q: question
    A: answer (may continue on following lines)
    --- exercises
    [estimate|break|choose|design] prompt (may continue)
    A: model answer (may continue)
    --- pitfalls
    - one per line
    --- quiz
    Q: question
    - wrong option
    - *right option
    W: why
    --- sources
    - paper|book|article|course|tool :: title :: by :: url

Then run: npm run deep:meta && npm run audit
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def camel(name: str) -> str:
    head, *rest = re.split(r"[-_]", name)
    return head + "".join(w.capitalize() for w in rest)


def tpl(s: str) -> str:
    s = s.strip("\n")
    if "${" in s:
        raise SystemExit('"${" is not allowed in page text')
    return "md`\n" + s.replace("\\", "\\\\").replace("`", "\\`") + "\n`"


def js(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def qa_blocks(body: str, q: str, a: str):
    """Pairs of (question, answer) from lines starting with q: and a: (continuations join with newlines)."""
    out, cur_q, cur_a, mode = [], None, None, None
    for line in body.split("\n"):
        if line.startswith(q):
            if cur_q is not None:
                out.append((cur_q.strip(), (cur_a or "").strip()))
            cur_q, cur_a, mode = line[len(q):].strip(), None, "q"
        elif line.startswith(a) and cur_q is not None:
            cur_a, mode = line[len(a):].strip(), "a"
        elif mode == "a":
            cur_a += "\n" + line
        elif mode == "q":
            cur_q += "\n" + line
    if cur_q is not None:
        out.append((cur_q.strip(), (cur_a or "").strip()))
    return out


def parse(text: str):
    pages = []
    for block in re.split(r"^=== ", text, flags=re.M)[1:]:
        head, _, body = block.partition("\n")
        pid = head.strip()
        meta_txt, *secs = re.split(r"^--- ", body, flags=re.M)
        meta = {}
        for line in meta_txt.strip().split("\n"):
            if ":" in line:
                k, _, v = line.partition(":")
                meta[k.strip()] = v.strip()
        parts = {}
        for sec in secs:
            name, _, content = sec.partition("\n")
            parts[name.strip()] = content.rstrip()
        pages.append((pid, meta, parts))
    return pages


def page_ts(pid, meta, parts):
    for need in ("lesson", "revise", "doubts", "quiz", "sources", "pitfalls"):
        if need not in parts:
            raise SystemExit(f"{pid}: missing --- {need}")
    L = [f"  {js(pid)}: {{"]
    L.append(f"    blurb: {js(meta['blurb'])},")
    L.append(f"    signals: {json.dumps([s.strip() for s in meta.get('signals', '').split('|') if s.strip()], ensure_ascii=False)},")
    for k in ("widgets", "prereq"):
        if meta.get(k):
            L.append(f"    {k}: {json.dumps([s.strip() for s in meta[k].split(',') if s.strip()])},")
    L.append(f"    lesson: {tpl(parts['lesson'])},")
    L.append(f"    revise: {tpl(parts['revise'])},")
    L.append("    doubts: [")
    for q, a in qa_blocks(parts["doubts"], "Q:", "A:"):
        L.append(f"      [{js(q)}, {js(a)}],")
    L.append("    ],")
    if parts.get("exercises"):
        L.append("    exercises: [")
        for q, a in qa_blocks(parts["exercises"], "[", "A:"):
            m = re.match(r"(estimate|break|choose|design)\]\s*(.*)", q, re.S)
            if not m:
                raise SystemExit(f"{pid}: exercise needs [kind]: {q[:60]}")
            L.append(f"      [{js(m.group(1))}, {js(m.group(2).strip())}, {js(a)}],")
        L.append("    ],")
    L.append(f"    pitfalls: {json.dumps([l[2:].strip() for l in parts['pitfalls'].split(chr(10)) if l.startswith('- ')], ensure_ascii=False)},")
    L.append("    quiz: [")
    for blk in re.split(r"^Q: ", parts["quiz"], flags=re.M)[1:]:
        lines = blk.strip().split("\n")
        q = lines[0].strip()
        opts = [l[2:].strip() for l in lines[1:] if l.startswith("- ")]
        why = next((l[3:].strip() for l in lines if l.startswith("W: ")), "")
        if sum(o.startswith("*") for o in opts) != 1:
            raise SystemExit(f"{pid}: quiz needs exactly one *answer: {q}")
        L.append(f"      Q({js(q)}, {json.dumps(opts, ensure_ascii=False)}, {js(why)}),")
    L.append("    ],")
    L.append("    sources: [")
    for l in parts["sources"].split("\n"):
        if not l.startswith("- "):
            continue
        kind, title, by, url = [x.strip() for x in l[2:].split("::")]
        L.append(f"      S.{kind}({js(title)}, {js(by)}, {js(url)}),")
    L.append("    ],")
    L.append("  },")
    return "\n".join(L)


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    area, name = sys.argv[1].split("/")
    src = ROOT / "content/deep" / area / "src" / f"{name}.md"
    pages = parse(src.read_text())
    var = camel(name)
    body = "\n".join(page_ts(*p) for p in pages)
    out = ROOT / "content/deep" / area / f"{name}.ts"
    out.write_text(
        f'// Generated by scripts/deep-build.py from src/{name}.md. Edit the .md, then rebuild.\n'
        'import { md } from "@/content/ai/md";\nimport { Q } from "@/content/h";\nimport { S, type Deep } from "../types";\n\n'
        f"export const {var}: Record<string, Deep> = {{\n{body}\n}};\n"
    )
    def one_fact_per_line(t):
        out = []
        for line in t.strip().split("\n"):
            if line.startswith("#"):
                out.append(line)
                continue
            for part in [x.strip() for x in line.split(" · ") if x.strip()]:
                bits = [b.strip() for b in part.split("; ")]
                # split "fact; fact" into lines when every piece is a real statement, not a fragment
                out += bits if len(bits) > 1 and all(len(b) > 18 for b in bits) else [part]
        return "\n".join(out)
    for _, _, parts in pages:
        if parts.get("notes"):
            parts["notes"] = one_fact_per_line(parts["notes"])
    notes = [f"  {js(pid)}: `\n{parts['notes'].strip().replace(chr(92), chr(92) * 2).replace('`', chr(92) + '`')}\n`," for pid, _, parts in pages if parts.get("notes")]
    nd = ROOT / "content/deep" / area / "notes"
    nd.mkdir(exist_ok=True)
    (nd / f"{name}.ts").write_text(
        f'// Generated by scripts/deep-build.py from src/{name}.md.\n/** Cheat-sheet notes: one fact per line, "## " groups. Shown collapsed under the Revise sheet. */\nexport const notes: Record<string, string> = {{\n' + "\n".join(notes) + "\n};\n"
    )
    files = ROOT / "content/deep/files.ts"
    ft = files.read_text()
    key = f'"{area}/{name}"'
    if key not in ft:
        line = f'  {key}: () => Promise.all([import("./{area}/{name}"), import("./{area}/notes/{name}")]).then(([m, n]) => withNotes(m.{var}, n.notes)),\n'
        ft = ft.replace("};\n", line + "};\n", 1) if ft.count("};\n") == 1 else ft[: ft.rindex("};")] + line + ft[ft.rindex("};"):]
        files.write_text(ft)
    idx = ROOT / "content/deep/index.ts"
    it = idx.read_text()
    nvar = "n_" + area + "_" + name.replace("-", "_")
    if f'"./{area}/{name}"' not in it:
        imp = f'import {{ {var} }} from "./{area}/{name}";\nimport {{ notes as {nvar} }} from "./{area}/notes/{name}";\n'
        it = it.replace("const NOTES: Record<string, string> = { ", imp + "\nconst NOTES: Record<string, string> = { ..." + nvar + ", ", 1)
        it = it.replace("const BODIES: Record<string, Deep> = {\n", "const BODIES: Record<string, Deep> = {\n  ..." + var + ",\n", 1)
        idx.write_text(it)
    print(f"{out.relative_to(ROOT)}: {len(pages)} pages")


main()
