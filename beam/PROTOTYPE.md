# Beam prototype: speculative `run_at` / `find_theorems_at` for Isabelle

A research prototype written during planning. It is an Isabelle/Scala component on top of [PIDE MCP](https://github.com/kappelmann/isabelle-pide-mcp) (LGPL-3.0); see PLAN.md §6.1 and issue #7.

**Tested** against live sessions on Isabelle2025-2 and Isabelle2026-RC4:
- 0.2–0.7 s per simple candidate; 16 candidates in parallel in about 1 s wall time.
- Correct verdicts: a failing `by blast` gives `error`, `by foo` gives "Undefined method", and a looping `(rule ccontr)+` gives `timeout`.
- The theory file's md5 is unchanged afterwards.

**Two soundness fixes are already applied** and must be kept:
1. Run under the print's own exec id, not the command's eval id. Otherwise speculative output leaks into the real command.
2. Stop terminal `by` proofs from forking, or a failing `by` is reported as `proved`. On 2025-2 this uses a counted save/restore of the global `Multithreading.parallel_proofs`; on 2026 it uses `Interactive.setmp_parallel_proofs 0`.

Layout:
- `ext/`: the component (`etc/build.props`, `etc/settings`, `src/tool_*.scala`).
- `session/`: the `HOL_Beam` session for Isabelle2025-2.
- `session-2026/`: the same for Isabelle2026, covering four ML API changes.
- `tests/`: a minimal stdio MCP client (`mcp_client.py`), `smoke.py`, and the test theory `thy/Demo.thy`.

Run it once PIDE MCP is registered:

    isabelle components -u beam/ext && isabelle scala_build
    isabelle pide_mcp -d beam/session -l HOL_Beam

Licence: this directory is LGPL-3.0, because it builds on PIDE MCP. Add `beam/LICENSE` in the PR.
