"""Rank 'sorry' holes in an Isabelle theorem DAG (dag.json from DAG_Export.thy)."""
import json, sys
from functools import lru_cache
dag = json.load(open(sys.argv[1])); target = sys.argv[2] if len(sys.argv) > 2 else None
nodes = {n["id"]: n for n in dag["nodes"]}
uses = {i: [u for u in n["uses"] if u in nodes] for i, n in nodes.items()}

@lru_cache(None)
def holes(i):                      # set of local-sorry nodes this node (transitively) rests on
    h = frozenset([i]) if nodes[i]["status"] == "sorry" else frozenset()
    for u in uses[i]: h |= holes(u)
    return h

scope = holes(target) if target else frozenset(i for i in nodes if nodes[i]["status"] == "sorry")
def leverage(h):                   # nodes that become fully proved once h alone is closed
    return sum(1 for i in nodes if holes(i) == frozenset([h]))
def blocked_by(h):                 # other holes h itself rests on (prefer leaves first)
    return len(holes(h) - {h})
ranked = sorted(scope, key=lambda h: (blocked_by(h), -leverage(h), len(nodes[h]["statement"])))
for h in ranked:
    n = nodes[h]
    print(json.dumps({"id": h, "file": n["file"], "line": n["line"], "statement": n["statement"],
                      "leverage": leverage(h), "rests_on_other_holes": blocked_by(h)}))
