"""Correct one snapshot's diagram by hand (no model calls, so it can't make things worse).

  python -m pipeline.fix samples/neetcode.mp4 c19 remove "Cluster / Workers" "Object Storage"
  python -m pipeline.fix samples/neetcode.mp4 c16 set "CDN" "Object Storage" both
  python -m pipeline.fix samples/neetcode.mp4 c05 rename "Cashe" "Cache"
  python -m pipeline.fix samples/neetcode.mp4 c01 drop "Create Tweet"

remove A B           delete every arrow between A and B
set A B forward|both|none   replace the arrow between A and B (forward means A -> B)
rename OLD NEW       fix a misread label
drop A               delete a shape and its arrows

Then run s6_curate again. Running s5_diagrams again starts from scratch and loses fixes.
"""
import re
import sys
from pipeline.common import job_dir, load_json, save_json
from pipeline.s5_diagrams import to_mermaid, build_preview


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def find(nodes, label):
    key = norm(label)
    for n in nodes:
        if norm(n.get("label")) == key:
            return str(n["id"])
    names = ", ".join(f"'{n.get('label') or '(unlabeled)'}'" for n in nodes)
    sys.exit(f"No shape labelled '{label}'. Shapes on this board: {names}")


def between(e, a, b):
    ends = {str(e.get("from")), str(e.get("to"))}
    return ends == {a, b}


def main(video, cid, op, args):
    jd = job_dir(video)
    results = load_json(jd / "diagrams.json")
    item = next((r for r in results if f"c{r['n']:02d}" == cid), None)
    if item is None:
        sys.exit(f"No snapshot named {cid}")
    nodes, edges = item["nodes"], item["edges"]

    if op == "remove" and len(args) == 2:
        a, b = find(nodes, args[0]), find(nodes, args[1])
        before = len(edges)
        edges = [e for e in edges if not between(e, a, b)]
        if len(edges) == before:
            sys.exit("There was no arrow between those two shapes.")
    elif op == "set" and len(args) == 3 and args[2] in ("forward", "both", "none"):
        a, b = find(nodes, args[0]), find(nodes, args[1])
        edges = [e for e in edges if not between(e, a, b)]
        edges.append({"from": a, "to": b, "direction": args[2], "label": ""})
    elif op == "rename" and len(args) == 2:
        target = find(nodes, args[0])
        for n in nodes:
            if str(n["id"]) == target:
                n["label"] = args[1]
    elif op == "drop" and len(args) == 1:
        a = find(nodes, args[0])
        nodes = [n for n in nodes if str(n["id"]) != a]
        edges = [e for e in edges if a not in (str(e.get("from")), str(e.get("to")))]
    else:
        sys.exit(__doc__)

    item["nodes"], item["edges"] = nodes, edges
    item["mermaid"] = to_mermaid(nodes, edges)
    item["user_fixed"] = True
    item["unclear"] += f" | Corrected by hand: {op} {' / '.join(args)}"
    save_json(jd / "diagrams.json", results)
    build_preview(jd, results)
    print(item["mermaid"])
    print("\nSaved. Now run: python -m pipeline.s6_curate " + str(video))


if __name__ == "__main__":
    if len(sys.argv) < 5:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:])