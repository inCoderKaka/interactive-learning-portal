#!/usr/bin/env python3
"""
Compile deep design exercises from content/designs/src/<file>.md into content/designs/<file>.ts.
A design whose id already exists (content/hld-problems.ts, extra-exercises.ts) is deepened: its stage model
answers, steer, pitfalls and level are replaced and words / flow / variants are added; its diagram is kept unless
the source gives one. A new id needs title, topic, tier, prompt and a diagram.

Usage: python3 scripts/design-build.py <file>       (reads content/designs/src/<file>.md)

Format, any number of designs:

    === d-<id>
    title: ...              (new designs)
    topic: <topic id>       (new designs)
    tier: 1|2|3             (new designs)
    est: 45                 (optional, minutes)
    prompt: ...             (new designs; optional otherwise)
    --- words               markdown: "Words you'll meet" list
    --- flow                markdown: how the 45 minutes go
    --- req | est | api | hl | deep | wrap     markdown model answer per stage (HLD)
    --- req | model | patterns | code | ext    markdown model answer per stage (LLD: ids d-lld-*)
    --- frame | data | model | eval | serve | deep   ML system design (ids d-ml-*)
    --- req | est | api | hl | deep | wrap     GenAI system design (ids d-gen-*, and the d-ai-* ones)
    --- clarify | approach | code | test       ML coding, Python (ids d-mlc-*; no diagram)
    --- boxes               LLD class diagram: "Name:kind|field;field|method;method" per line
    --- rels                LLD relations: "A>B:extends|implements|has|uses:label" per line
    --- variants            Q: the variation / A: what changes (A may continue)
    --- steer               Q: interviewer push / A: what a strong answer covers
    --- pitfalls            - one per line
    --- level               markdown: L4 vs L5 vs L6
    --- nodes               id|label|kind|x|y|note per line
    --- edges               a>b|label (sync) or a~b|label (async) per line
    --- refs                - kind :: title :: by :: url
    --- prereqs             course page ids this interview needs (comma or space separated)
    --- paths               - [deep|variation|failure] what the interviewer asks :: what a strong answer covers
                              (indent two spaces per level for follow-ups; children inherit the kind)
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAGES = ["req", "est", "api", "hl", "deep", "wrap", "model", "patterns", "code", "ext", "frame", "data", "eval", "serve", "clarify", "approach", "test"]

def qa(body):
    out, q, a = [], None, None
    for line in body.split("\n"):
        if line.startswith("Q: "):
            if q is not None: out.append([q, a.strip()])
            q, a = line[3:].strip(), ""
        elif line.startswith("A: "):
            a = line[3:]
        elif q is not None and line.strip():
            a += "\n" + line
    if q is not None: out.append([q, a.strip()])
    return out

def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:40]

def paths(body, did):
    """Nested '- [kind] label :: expect' lines, two spaces per level, into a PathNode tree."""
    roots, stack = [], []
    for line in body.split("\n"):
        if not line.strip(): continue
        m = re.match(r"^( *)- (?:\[(deep|variation|failure)\] )?(.+?) :: (.+)$", line)
        if not m: raise SystemExit(f"{did}: bad path line: {line!r}")
        depth = len(m.group(1)) // 2
        while len(stack) > depth: stack.pop()
        parent = stack[-1] if stack else None
        kind = m.group(2) or (parent["kind"] if parent else None)
        if not kind: raise SystemExit(f"{did}: top-level path needs [deep|variation|failure]: {line!r}")
        node = {"id": (parent["id"] + "/" if parent else "") + slug(m.group(3)), "kind": kind, "label": m.group(3).strip(), "expect": m.group(4).strip()}
        (parent.setdefault("children", []) if parent else roots).append(node)
        stack.append(node)
    return roots

def parse(src):
    designs = []
    for block in re.split(r"^=== ", src, flags=re.M)[1:]:
        head, *rest = re.split(r"^--- ", block, flags=re.M)
        lines = head.strip().split("\n")
        d = {"id": lines[0].strip()}
        for l in lines[1:]:
            if ":" in l:
                k, v = l.split(":", 1); d[k.strip()] = v.strip()
        for sec in rest:
            name, _, body = sec.partition("\n")
            name, body = name.strip(), body.strip()
            if name in STAGES: d.setdefault("models", {})[name] = body
            elif name in ("words", "flow", "level"): d[name] = body
            elif name in ("variants", "steer"): d[name] = qa(body)
            elif name == "pitfalls": d[name] = [l[2:].strip() for l in body.split("\n") if l.startswith("- ")]
            elif name == "nodes": d[name] = [l.strip() for l in body.split("\n") if l.strip()]
            elif name == "edges": d[name] = [l.strip() for l in body.split("\n") if l.strip()]
            elif name == "boxes":
                bx = []
                for l in body.split("\n"):
                    if not l.strip(): continue
                    head, f, m = (l.strip().split("|") + ["", ""])[:3]
                    nm, _, kind = head.partition(":")
                    bx.append({"name": nm.strip(), "kind": (kind.strip() or "class"), "fields": [x.strip() for x in f.split(";") if x.strip()], "methods": [x.strip() for x in m.split(";") if x.strip()]})
                d.setdefault("classes", {"boxes": [], "rels": []})["boxes"] = bx
            elif name == "rels":
                rs = []
                for l in body.split("\n"):
                    if not l.strip(): continue
                    path, typ, *lab = l.strip().split(":")
                    a, b = path.split(">")
                    if typ not in ("extends", "implements", "has", "uses"): raise SystemExit(f"{d['id']}: bad rel type {typ!r}")
                    r = {"a": a.strip(), "b": b.strip(), "type": typ}
                    if lab and lab[0].strip(): r["label"] = ":".join(lab).strip()
                    rs.append(r)
                d.setdefault("classes", {"boxes": [], "rels": []})["rels"] = rs
            elif name == "prereqs":
                d[name] = [x.strip() for x in re.split(r"[,\s]+", body) if x.strip()]
            elif name == "paths":
                d[name] = paths(body, d["id"])
            elif name == "refs":
                d[name] = []
                for l in body.split("\n"):
                    if l.startswith("- "):
                        kind, title, by, url = [x.strip() for x in l[2:].split("::")]
                        d[name].append({"kind": kind, "title": title, "by": by, "url": url})
            else: raise SystemExit(f"{d['id']}: unknown section {name}")
        if "tier" in d: d["tier"] = int(d["tier"])
        if "est" in d: d["est"] = int(d["est"])
        designs.append(d)
    return designs

def main():
    name = sys.argv[1]
    src = (ROOT / "content/designs/src" / f"{name}.md").read_text()
    designs = parse(src)
    uses_arch = any(d.get("nodes") for d in designs)
    out = [f"// Generated by scripts/design-build.py from src/{name}.md. Edit the .md and rebuild."]
    if uses_arch: out.append('import { arch } from "../hld-problems";')
    out += ['import type { DesignPatch } from "./types";', "", "export const designs: DesignPatch[] = ["]
    for d in designs:
        nodes, edges = d.pop("nodes", None), d.pop("edges", None)
        js = json.dumps(d, ensure_ascii=False, indent=2)
        if nodes:
            js = js[:-2] + f',\n  "arch": arch({json.dumps(nodes, ensure_ascii=False)}, {json.dumps(edges or [], ensure_ascii=False)})\n}}'
        out.append(js + ",")
    out.append("];")
    (ROOT / "content/designs" / f"{name}.ts").write_text("\n".join(out) + "\n")
    idx = ROOT / "content/designs/files.ts"
    files = sorted(set(re.findall(r'import \{ designs as \w+ \} from "\./([\w-]+)"', idx.read_text())) | {name}) if idx.exists() else [name]
    imps = "\n".join(f'import {{ designs as {f.replace("-", "_")} }} from "./{f}";' for f in files)
    idx.write_text("// Generated by scripts/design-build.py: every compiled design file.\n" + imps + "\n\n" +
                   'import type { DesignPatch } from "./types";\n' +
                   f"export const PATCHES: DesignPatch[] = [{', '.join('...' + f.replace('-', '_') for f in files)}];\n")
    print(f"content/designs/{name}.ts: {len(designs)} designs")

main()
