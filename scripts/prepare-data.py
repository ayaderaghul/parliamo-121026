"""Regenerate src/data.json from the content sources. Run this LOCALLY.

    python scripts/prepare-data.py

Reads (all relative to the repo root, works on Windows, macOS and Linux):
    content/italian-skill-graph.ts   nodes, weights, priors, prerequisites
    content/bank.py                  the question bank
    content/lezioni/*.md             one lesson section per node

Writes:
    src/data.json                    commit this; Render only reads this file

    python scripts/prepare-data.py --lessons-only
        refreshes only the lessons inside the existing data.json: no graphviz
        needed, and the map layout stays exactly as it is.

Needs two things CI does not have, which is why this runs on your machine:
    graphviz     the `dot` command must be on PATH
                   Windows: winget install graphviz   (then reopen the terminal)
                   macOS:   brew install graphviz
    markdown     pip install markdown

It refuses to write a data.json that would break the site: every node must
have items and a lesson, and the graph must be acyclic.
"""
import importlib.util
import json
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRAPH = ROOT / "content" / "italian-skill-graph.ts"
BANK = ROOT / "content" / "bank.py"
LESSONS = ROOT / "content" / "lezioni"
OUT = ROOT / "src" / "data.json"


def die(msg):
    print("ERROR:", msg, file=sys.stderr)
    sys.exit(1)


# ── graph ───────────────────────────────────────────────────────────────────
def load_graph():
    body = GRAPH.read_text(encoding="utf-8")
    body = body.split("export const SKILLS", 1)[1].split("// ── Index and queries", 1)[0]
    rx = re.compile(
        r'id:\s*"([^"]+)",\s*label:\s*"([^"]*)",\s*cefr:\s*"([^"]+)",\s*'
        r'weight:\s*([\d.]+),\s*prior:\s*([\d.]+),\s*prereqs:\s*\[([^\]]*)\]',
        re.S,
    )
    skills = []
    for m in rx.finditer(body):
        i, label, cefr, w, pr, pre = m.groups()
        skills.append({
            "id": i, "label": label, "cefr": cefr,
            "prereqs": re.findall(r'"([^"]+)"', pre),
            "weight": float(w), "prior": float(pr),
        })
    if not skills:
        die(f"no nodes parsed from {GRAPH}")
    ids = {s["id"] for s in skills}
    for s in skills:
        for p in s["prereqs"]:
            if p not in ids:
                die(f"{s['id']} depends on unknown node {p}")
    # acyclic
    state, byid = {}, {s["id"]: s for s in skills}
    def visit(i, path):
        if state.get(i) == 2:
            return
        if state.get(i) == 1:
            die("cycle: " + " -> ".join(path + [i]))
        state[i] = 1
        for p in byid[i]["prereqs"]:
            visit(p, path + [i])
        state[i] = 2
    sys.setrecursionlimit(10000)
    for s in skills:
        visit(s["id"], [])
    return skills


# ── bank ────────────────────────────────────────────────────────────────────
def load_bank():
    spec = importlib.util.spec_from_file_location("bank", BANK)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return {n: [{"q": q, "o": o} for q, o in items] for n, items in mod.BANK.items()}


# ── lessons ─────────────────────────────────────────────────────────────────
# Bold is resolved before Markdown runs: Python-Markdown leaves it literal when it
# touches a word (veder**lo**) or sits inside italics (*un amico **vecchio***).
BOLD = re.compile(r"\*\*([^*\n]+?)\*\*")
LIST_ITEM = re.compile(r"^\s*(?:[-*]|\d+\.)\s")


def clean_markdown(body: str) -> str:
    """Fix what Python-Markdown would otherwise render literally."""
    lines = []
    for line in body.splitlines():
        # the prerequisites are shown by the app from the graph itself
        if line.startswith("*Prerequisites:"):
            continue
        line = BOLD.sub(r"<strong>\1</strong>", line)
        # a list must be separated from the paragraph before it
        if LIST_ITEM.match(line) and lines and lines[-1].strip() and not LIST_ITEM.match(lines[-1]):
            lines.append("")
        lines.append(line)
    return "\n".join(lines)


def load_lessons():
    try:
        import markdown
    except ImportError:
        die("python-markdown missing: pip install markdown")
    head = re.compile(r"^### (.+?) · `([^`]+)` · (A1|A2|B1|B2)\s*$", re.M)
    out = {}
    for path in sorted(LESSONS.glob("0[1-9]*.md")):
        text = path.read_text(encoding="utf-8")
        marks = list(head.finditer(text))
        for i, m in enumerate(marks):
            end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
            body = re.sub(r"\n---\s*\n", "\n", text[m.end():end]).strip()
            body = clean_markdown(body)
            out[m.group(2)] = {
                "label": m.group(1),
                "html": markdown.markdown(body, extensions=["tables"]),
            }
    return out


# ── layout ──────────────────────────────────────────────────────────────────
def layout(skills):
    dot_bin = shutil.which("dot")
    if not dot_bin:
        die("graphviz `dot` not on PATH (Windows: winget install graphviz, then reopen the terminal)")
    lines = ['digraph g { rankdir=LR; nodesep=0.20; ranksep=0.80; splines=spline;',
             ' node [shape=box, fontname="Helvetica", fontsize=12, margin="0.16,0.08"];']
    for s in skills:
        lines.append(f'  "{s["id"]}" [label="{s["label"]}"];')
        for p in s["prereqs"]:
            lines.append(f'  "{p}" -> "{s["id"]}";')
    lines.append("}")
    plain = subprocess.run([dot_bin, "-Tplain"], input="\n".join(lines),
                           capture_output=True, text=True, encoding="utf-8", check=True).stdout
    S, pos, edges, gw, gh = 72.0, {}, [], 0.0, 0.0
    for line in plain.splitlines():
        f = shlex.split(line)
        if not f:
            continue
        if f[0] == "graph":
            gw, gh = float(f[2]) * S, float(f[3]) * S
        elif f[0] == "node":
            x, y, w, h = (float(v) for v in f[2:6])
            pos[f[1]] = {"id": f[1], "x": round(x * S - w * S / 2, 1),
                         "y": round(gh - y * S - h * S / 2, 1),
                         "w": round(w * S, 1), "h": round(h * S, 1)}
        elif f[0] == "edge":
            n = int(f[3])
            edges.append({"a": f[1], "b": f[2],
                          "p": [(round(float(f[4 + 2 * k]) * S, 1),
                                 round(gh - float(f[5 + 2 * k]) * S, 1)) for k in range(n)]})
    return [pos[s["id"]] for s in skills], edges, round(gw, 1), round(gh, 1)


def main():
    if "--lessons-only" in sys.argv:
        data = json.loads(OUT.read_text(encoding="utf-8"))
        lessons = load_lessons()
        if missing := sorted({s["id"] for s in data["skills"]} - set(lessons)):
            die(f"nodes with no lesson: {missing}")
        data["lessons"] = lessons
        OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")),
                       encoding="utf-8", newline="\n")
        print(f"refreshed {len(lessons)} lessons in {OUT.relative_to(ROOT)}; layout untouched")
        return
    skills = load_graph()
    bank = load_bank()
    lessons = load_lessons()
    ids = {s["id"] for s in skills}
    if missing := sorted(ids - set(bank)):
        die(f"nodes with no items: {missing}")
    if missing := sorted(ids - set(lessons)):
        die(f"nodes with no lesson: {missing}")
    for n, items in bank.items():
        for it in items:
            if len(it["o"]) != 4 or len(set(it["o"])) != 4:
                die(f"{n}: every item needs 4 distinct options -> {it['q']}")
    lay, edges, W, H = layout(skills)
    data = {"skills": skills, "layout": lay, "edges": edges,
            "items": bank, "lessons": lessons, "W": W, "H": H}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(skills)} nodes, {len(edges)} edges, "
          f"{sum(len(v) for v in bank.values())} items, {len(lessons)} lessons")


if __name__ == "__main__":
    main()
