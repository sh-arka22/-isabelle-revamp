# isabelle-revamp

**Keep Isabelle/HOL's logic exactly as it is, and make it pleasant and agent-ready from modern tools.**

Isabelle is excellent at the research and logic level. It integrates poorly with other apps and systems, so it is hard to modify, looks dated, and has little agent support. This hackathon project fixes the integration and leaves the kernel, HOL and Isar untouched.

| What | Status |
|---|---|
| Hover cards with docstrings (stock VS Code, no new syntax) | planned |
| **ProofMap**: a theorem dependency graph with kernel-checked statuses | prototype on `proto/proofmap` |
| **Beam**: speculative `run_at` / `find_theorems_at` agent tools over MCP | prototype on `proto/beam` |
| Claude closes `sorry` holes behind a kernel-checked CI gate | planned |
| CI (`ci-ok` gate, Isabelle build and map audit) | prototype on `proto/ci` |
| Docs and Isar-Ref hover index | prototype on `proto/docs` |

**Start with [PLAN.md](PLAN.md)**: it covers the system design, git workflow, CI, workstreams, the 24-hour timeline and the first issues.

## Team

- Alex Hyman ([@hymanimy](https://github.com/hymanimy)): maths, Isabelle, design, pitch
- ark ([@sh-arka22](https://github.com/sh-arka22)): repo, CI, ProofMap and the editor
- retinapeg ([@retinapeg](https://github.com/retinapeg)): agent endpoints, natural-language tools, onboarding

## Ground rules

- Every change goes through a pull request. Never merge `main` into a branch: rebase instead.
- We integrate every ~45 minutes (the "train", see PLAN.md §8).
- We never change Isabelle's kernel, HOL, Isar syntax or keywords.

## Credits and prior art

- [Prove2Me](https://prove2.me) (Lean) and [leanblueprint](https://github.com/PatrickMassot/leanblueprint) inspired ProofMap's dependency-graph workflow. We have no affiliation with either.
- [PIDE MCP](https://github.com/kappelmann/isabelle-pide-mcp) (LGPL-3.0) is the base for Beam.
- [vscode-isabelle by yfprojects](https://github.com/real-yfprojects/vscode-isabelle) (BSD-3-Clause) is the editor extension we build alongside.
- Lean Beam's `runAt` inspired our `run_at` tool.
