#!/usr/bin/env python3
"""Drive the stock vscode_server's Sledgehammer query and save its XML output.

Uses only Python's standard library. Prints every message, times each run,
and writes the `PIDE/sledgehammer_output` contents as fixtures for the pure
markupXml unit test. Positions are zero-based.
"""

import argparse
import asyncio
import json
import os
from pathlib import Path
import shlex
import signal
import sys
import time


ROOT = Path(__file__).resolve().parents[1]
TRY0_METHODS = "simp auto blast fast fastforce force meson satx linarith presburger algebra argo order metis"
THEORY = '''theory Hammer
  imports Main
begin

lemma add_zero: "x + 0 = (x::nat)"
  sorry

lemma rev_rev: "rev (rev xs) = xs"
  sorry

end
'''


async def send(process, method, params=None, request_id=None):
    message = {"jsonrpc": "2.0", "method": method}
    if params is not None:
        message["params"] = params
    if request_id is not None:
        message["id"] = request_id
    body = json.dumps(message, ensure_ascii=False).encode("utf-8")
    print("--> " + body.decode("utf-8"), flush=True)
    process.stdin.write(f"Content-Length: {len(body)}\r\n\r\n".encode() + body)
    await process.stdin.drain()


async def receive(process):
    header = await process.stdout.readuntil(b"\r\n\r\n")
    fields = dict(line.split(b":", 1) for line in header.strip().split(b"\r\n"))
    size = int(fields[b"Content-Length"].strip())
    message = json.loads(await process.stdout.readexactly(size))
    text = json.dumps(message, ensure_ascii=False)
    if message.get("method") in ("PIDE/decoration", "textDocument/publishDiagnostics"):
        text = text[:160] + "…"
    print("<-- " + text, flush=True)
    return message


async def wait_for(process, predicate):
    while True:
        message = await receive(process)
        if predicate(message):
            return message


async def response(process, request_id):
    return (await wait_for(process, lambda m: m.get("id") == request_id))["result"]


async def caret(process, uri, line, character=0):
    await send(process, "PIDE/caret_update", {"uri": uri, "line": line, "character": character})
    await wait_for(process, lambda m: m.get("method") == "PIDE/dynamic_output"
                   and "goal" in m["params"]["content"])


async def run_query(process, out, name, provers, cancel_after=None, try0=True, isar=False):
    started = time.monotonic()
    await send(process, "PIDE/sledgehammer_request", {"provers": provers, "isar": isar, "try0": try0})
    outputs, statuses, seen_running, cancelled = [], [], False, False
    while True:
        message = await receive(process)
        method = message.get("method")
        if method == "PIDE/sledgehammer_status":
            status = message["params"]["message"]
            statuses.append((round(time.monotonic() - started, 2), status))
            if status != "Finished":
                seen_running = True
            elif seen_running:
                break
        elif method == "PIDE/sledgehammer_output":
            content = message["params"]["content"]
            outputs.append(content)
            keys = sorted(k for k in message["params"] if k != "content")
            print(f"    output #{len(outputs)} keys besides content: {keys}; {len(content)} chars", flush=True)
            if content:
                (out / f"{name}_{len(outputs)}.xml").write_text(content, encoding="utf-8")
        if cancel_after is not None and seen_running and not cancelled \
                and time.monotonic() - started >= cancel_after:
            cancelled = True
            await send(process, "PIDE/sledgehammer_cancel", {})
    elapsed = round(time.monotonic() - started, 2)
    print(f"=== {name}: {elapsed}s, statuses {statuses}, {len(outputs)} outputs", flush=True)
    return outputs, statuses, elapsed


async def probe(process, args, uri, out):
    await send(process, "initialize", {
        "processId": os.getpid(), "rootUri": ROOT.as_uri(), "capabilities": {},
        "clientInfo": {"name": "isabelle-revamp-sledgehammer-probe", "version": "0.1"},
    }, request_id=1)
    await response(process, 1)
    await send(process, "initialized", {})
    await send(process, "textDocument/didOpen", {"textDocument": {
        "uri": uri, "languageId": "isabelle", "version": 1, "text": THEORY}})
    await caret(process, uri, 4)
    await send(process, "PIDE/sledgehammer_provers_request", {})
    provers = (await wait_for(process, lambda m: m.get("method") == "PIDE/sledgehammer_provers_response"))
    provers = provers["params"]["provers"]
    results = {"provers": provers}

    outputs, statuses, elapsed = await run_query(process, out, "add_zero", provers)
    results["add_zero"] = {"elapsed": elapsed, "statuses": statuses, "outputs": len(outputs)}
    await send(process, "PIDE/sledgehammer_sendback", {"text": "by simp"})
    insert = await wait_for(process, lambda m: m.get("method") == "PIDE/sledgehammer_insert")
    results["insert"] = insert["params"]

    await caret(process, uri, 7)
    outputs, statuses, elapsed = await run_query(process, out, "rev_rev", provers)
    results["rev_rev"] = {"elapsed": elapsed, "statuses": statuses, "outputs": len(outputs)}

    outputs, statuses, elapsed = await run_query(process, out, "cancel", provers, cancel_after=0.5)
    results["cancel"] = {"elapsed": elapsed, "statuses": statuses, "outputs": len(outputs)}

    await caret(process, uri, 4)
    outputs, statuses, elapsed = await run_query(process, out, "default_provers", "")
    results["default_provers"] = {"elapsed": elapsed, "statuses": statuses, "outputs": len(outputs)}

    # Only try0's methods (also Sledgehammer "tactic provers"): a try0-only run.
    await caret(process, uri, 7)
    outputs, statuses, elapsed = await run_query(process, out, "try0_only", TRY0_METHODS)
    results["try0_only"] = {"elapsed": elapsed, "statuses": statuses, "outputs": len(outputs)}

    # The caret on `sorry`: is there a proof state for the query?
    await send(process, "PIDE/caret_update", {"uri": uri, "line": 5, "character": 2})
    await asyncio.sleep(1)
    outputs, statuses, elapsed = await run_query(process, out, "at_sorry", provers)
    results["at_sorry"] = {"elapsed": elapsed, "statuses": statuses, "outputs": len(outputs)}

    # A theory-level caret: no proof state at all.
    await send(process, "PIDE/caret_update", {"uri": uri, "line": 2, "character": 0})
    await asyncio.sleep(1)
    outputs, statuses, elapsed = await run_query(process, out, "at_begin", provers)
    results["at_begin"] = {"elapsed": elapsed, "statuses": statuses, "outputs": len(outputs)}
    (out / "results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(json.dumps(results, indent=2, ensure_ascii=False), flush=True)


async def run(args):
    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    uri = (out / "Hammer.thy").resolve().as_uri()
    (out / "Hammer.thy").write_text(THEORY)
    command = [args.isabelle, "vscode_server", "-n", "-l", "HOL",
               "-o", "vscode_html_output=true", "-o", "editor_output_state=true",
               "-o", "vscode_pide_extensions=true", "-o", "vscode_unicode_symbols_edits=false"]
    print("Starting: " + shlex.join(command), flush=True)
    process = await asyncio.create_subprocess_exec(
        *command, stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
        start_new_session=True)
    try:
        await asyncio.wait_for(probe(process, args, uri, out), args.timeout)
    finally:
        try:
            if process.returncode is None:
                await send(process, "shutdown", request_id=2)
                await asyncio.wait_for(response(process, 2), 10)
                await send(process, "exit")
                await asyncio.wait_for(process.wait(), 10)
        finally:
            if process.returncode is None:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    await asyncio.wait_for(process.wait(), 5)
                except TimeoutError:
                    os.killpg(process.pid, signal.SIGKILL)
                    await process.wait()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--isabelle", default="isabelle")
    parser.add_argument("--out", type=Path, default=ROOT / ".dev-host/sledgehammer-probe")
    parser.add_argument("--timeout", type=float, default=600)
    args = parser.parse_args()
    try:
        asyncio.run(run(args))
    except (OSError, RuntimeError, TimeoutError, asyncio.IncompleteReadError) as error:
        print(f"FAIL: {str(error) or 'timed out'}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
