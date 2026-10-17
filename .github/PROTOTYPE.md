# CI prototype

Sketches of `ci.yml` (the `ci-ok` gate), `heavy.yml` (AFP and long builds), `cd-main.yml` (the `main-latest` pre-release), the composite `setup-isabelle` action and `ruleset-main.json`. They pass actionlint.

**Before merging (issue #2, PLAN.md §9):**
- Pin `.isabelle-version` to `Isabelle2025-2`.
- Ship only `changes`, `lint`, `isabelle` (build only) and `ci-ok` at first. Each later PR adds its own job alongside its directory.
- Apply the ruleset only after one green `workflow_dispatch` run on `main`.
