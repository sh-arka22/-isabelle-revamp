"""Drive `isabelle client` to fetch the DAG export via use_theories export_pattern."""
import json, subprocess, sys, base64
isabelle, base = sys.argv[1], sys.argv[2]
p = subprocess.Popen([isabelle, "client", "-n", "dagtest"], stdin=subprocess.PIPE,
                     stdout=subprocess.PIPE, text=True, bufsize=1)
def send(cmd): p.stdin.write(cmd + "\n"); p.stdin.flush()
def until(tag):
    while True:
        line = p.stdout.readline()
        if not line: raise SystemExit("client closed")
        if line.startswith(tag + " ") or line.startswith("FAILED") or line.startswith("ERROR"):
            return line
send('session_start ' + json.dumps({"session": "HOL", "dirs": [base + "/demo", base + "/dag"],
                                    "include_sessions": ["Demo"]}))
r = until("FINISHED"); print(r[:200]); sid = json.loads(r.split(" ", 1)[1])["session_id"]
send('use_theories ' + json.dumps({"session_id": sid, "theories": ["DAG_Export"],
                                   "master_dir": base + "/dag", "export_pattern": "*:dag/**"}))
r = until("FINISHED"); res = json.loads(r.split(" ", 1)[1])
print("ok:", res["ok"], "errors:", res["errors"][:3])
for node in res["nodes"]:
    for e in node.get("exports", []):
        body = base64.b64decode(e["body"]).decode() if e["base64"] else e["body"]
        dag = json.loads(body)
        print(e["name"], [(n["id"], n["status"]) for n in dag["nodes"]])
send('session_stop ' + json.dumps({"session_id": sid})); until("FINISHED")
send('shutdown'); p.stdin.close()
