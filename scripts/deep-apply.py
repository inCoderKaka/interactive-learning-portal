#!/usr/bin/env python3
"""
Splice rewritten subtopic content into content/deep/<area>/<file>.ts (and its notes file).

Usage: python3 scripts/deep-apply.py dsa/dp staging.md

Staging format (any number of pages):

    === <subtopic id>
    --- lesson          (replaces the whole lesson)
    ...markdown...
    --- revise+         (lines appended to the revise sheet, usually "? prompt :: answer")
    ...
    --- doubts+         (appended doubts: "Q: ..." then "A: ..." lines; an answer may span lines)
    Q: ...
    A: ...
    --- notes           (replaces the cheat-sheet notes)
    ...
    --- notes+          (lines appended to the cheat-sheet notes)
    ...

Lessons go into md`` templates (String.raw), so a backtick is escaped as \\` and "${" must never appear.
Run `npm run deep:meta` and `npm run audit` afterwards.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def parse(text: str):
    pages = {}
    for block in re.split(r"^=== ", text, flags=re.M)[1:]:
        head, _, body = block.partition("\n")
        pid = head.strip()
        parts = {}
        for sec in re.split(r"^--- ", body, flags=re.M)[1:]:
            name, _, content = sec.partition("\n")
            parts[name.strip()] = content.strip("\n")
        pages[pid] = parts
    return pages


def find_key(src: str, pid: str) -> int:
    m = re.search(rf'^  "?{re.escape(pid)}"?: \{{', src, flags=re.M)
    if not m:
        raise SystemExit(f"id {pid} not found")
    return m.end()


def closing_backtick(src: str, start: int) -> int:
    i = start
    while True:
        j = src.index("`", i)
        if src[j - 1] != "\\":
            return j
        i = j + 1


def field_span(src: str, pos: int, field: str):
    """(start, end) of the inside of the field's md template, at or after pos."""
    m = re.compile(rf"\n    {field}: md`").search(src, pos)
    if not m:
        raise SystemExit(f"field {field} not found after {pos}")
    s = m.end()
    return s, closing_backtick(src, s)


def esc_md(s: str) -> str:
    if "${" in s:
        raise SystemExit("lesson text contains ${")
    return s.replace("`", "\\`")


def doubts_entries(text: str):
    out, q, a = [], None, []
    for line in text.splitlines():
        if line.startswith("Q: "):
            if q is not None:
                out.append((q, "\n".join(a).strip()))
            q, a = line[3:].strip(), []
        elif line.startswith("A: "):
            a = [line[3:]]
        elif q is not None:
            a.append(line)
    if q is not None:
        out.append((q, "\n".join(a).strip()))
    return out


def main():
    file, staging = sys.argv[1], sys.argv[2]
    path = ROOT / "content/deep" / f"{file}.ts"
    area, base = file.split("/")
    npath = ROOT / "content/deep" / area / "notes" / f"{base}.ts"
    src, nsrc = path.read_text(), npath.read_text()
    pages = parse(Path(staging).read_text())
    for pid, parts in pages.items():
        k = find_key(src, pid)
        if "lesson" in parts:
            s, e = field_span(src, k, "lesson")
            src = src[:s] + "\n" + esc_md(parts["lesson"]) + "\n" + src[e:]
        if "revise+" in parts:
            k = find_key(src, pid)
            s, e = field_span(src, k, "revise")
            body = src[s:e].rstrip("\n")
            src = src[:s] + body + "\n" + esc_md(parts["revise+"]) + "\n" + src[e:]
        if "doubts+" in parts:
            k = find_key(src, pid)
            m = re.compile(r"\n    doubts: \[\n").search(src, k)
            end = src.index("\n    ],", m.end())
            add = "".join(f"\n      [{json.dumps(q, ensure_ascii=False)}, {json.dumps(a, ensure_ascii=False)}]," for q, a in doubts_entries(parts["doubts+"]))
            src = src[:end] + add + src[end:]
        if "notes" in parts:
            m = re.search(rf'^  "?{re.escape(pid)}"?: `', nsrc, flags=re.M)
            body = parts["notes"].replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
            if m:
                e = closing_backtick(nsrc, m.end())
                nsrc = nsrc[: m.end()] + "\n" + body + "\n" + nsrc[e:]
            else:
                nsrc = nsrc.rstrip().removesuffix("};").rstrip() + f'\n  "{pid}": `\n{body}\n`,\n}};\n'
        if "notes+" in parts:
            m = re.search(rf'^  "?{re.escape(pid)}"?: `', nsrc, flags=re.M)
            e = closing_backtick(nsrc, m.end())
            add = parts["notes+"].replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
            nsrc = nsrc[:e].rstrip("\n") + "\n" + add + "\n" + nsrc[e:]
        print(f"{pid}: " + ", ".join(parts))
    path.write_text(src)
    npath.write_text(nsrc)


if __name__ == "__main__":
    main()
