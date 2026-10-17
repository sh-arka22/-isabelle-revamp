import json, subprocess, sys, time, os, threading, queue

class Client:
    def __init__(self, cmd, env=None):
        self.p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                  stderr=open(os.environ.get("MCP_STDERR", "/dev/null"), "w"),
                                  text=True, env=env, bufsize=1)
        self.q = queue.Queue(); self.id = 0
        threading.Thread(target=self._reader, daemon=True).start()
    def _reader(self):
        for line in self.p.stdout: self.q.put(json.loads(line))
    def request(self, method, params=None, timeout=900):
        self.id += 1; rid = self.id
        msg = {"jsonrpc": "2.0", "id": rid, "method": method}
        if params is not None: msg["params"] = params
        self.p.stdin.write(json.dumps(msg) + "\n"); self.p.stdin.flush()
        end = time.time() + timeout
        while True:
            try: m = self.q.get(timeout=1)
            except queue.Empty:
                if self.p.poll() is not None: raise RuntimeError("server exited")
                if time.time() > end: raise TimeoutError(method)
                continue
            if m.get("id") == rid: return m
    def notify(self, method, params=None):
        msg = {"jsonrpc": "2.0", "method": method}
        if params is not None: msg["params"] = params
        self.p.stdin.write(json.dumps(msg) + "\n"); self.p.stdin.flush()
    def call(self, name, args, timeout=900):
        t = time.time()
        r = self.request("tools/call", {"name": name, "arguments": args}, timeout)
        res = r.get("result", r)
        out = res.get("structuredContent", res)
        print(f"--- {name} {json.dumps(args)} ({time.time()-t:.1f}s) isError={res.get('isError')}")
        print(json.dumps(out, indent=1, ensure_ascii=False)[:3500])
        return out
    def close(self):
        self.p.stdin.close(); self.p.wait(timeout=120)

def start(cmd):
    c = Client(cmd)
    r = c.request("initialize", {"protocolVersion": "2025-06-18", "capabilities": {},
                                 "clientInfo": {"name": "beam-test", "version": "0"}})
    c.notify("notifications/initialized")
    return c, r
