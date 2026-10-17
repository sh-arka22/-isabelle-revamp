import sys, json, time
sys.path.insert(0, sys.argv[1])
from mcp_client import start
isabelle, thy = sys.argv[2], sys.argv[3]
c, init = start([isabelle, "pide_mcp", "-l", "HOL"])
print("serverInfo", init["result"]["serverInfo"])
tools = c.request("tools/list")["result"]["tools"]
for t in tools:
    print("TOOL", t["name"], "args:", list(t["inputSchema"]["properties"].keys()), "req:", t["inputSchema"].get("required"))
c.call("list_sessions", {})
c.call("read", {"origin": thy})
for i in range(30):
    st = c.call("get_state", {"origin": thy, "commands_limit": 0})
    if json.dumps(st).find('"running"') < 0 and i > 0: break
    time.sleep(2)
c.call("get_state", {"origin": thy, "start_line": 5, "end_line": 6})
extra = sys.argv[4:] 
if "sledgehammer" in extra:
    c.call("sledgehammer", {"origin": thy, "start_line": 5, "timeout": 60})
c.close()
