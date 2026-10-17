# AGENTS.md — isabelle-revamp

**Project:** isabelle-revamp, a ~24-hour hackathon project (Sat 17 Oct 2026). Keep Isabelle/HOL's logic exactly as it is; make it pleasant and agent-ready from modern tools (hover cards, ProofMap, Beam, agent endpoints, CI gate).
**Repo:** https://github.com/sh-arka22/-isabelle-revamp (rename to `sh-arka22/isabelle-revamp` is planned, PLAN.md D2). It is the only repo (D1): Leo pushes here from now on, not to `hymanimy/isabelle-revamp:leo`, which gets a pointer README and is archived. The local checkout this file lives in is the project; nothing from any other project or folder applies here.
**Team (four):** Alex Hyman (`hymanimy`): maths, Isabelle, design, pitch · ark (`sh-arka22`, repo owner): repo, CI, ProofMap export and viewer · retinapeg: agent endpoints (Beam, Isabelle-MCP), natural-language tools, onboarding, setup scripts · Leo Aarons-Ditson: the VS Code extension (M1–M9), the MCP bridge and Ask Isabelle; owns `extension/` UX and `mcp/`.

## Read first, in this order

1. `PLAN.md` (v2) — the authoritative system design, contracts, git workflow, CI, timeline (times are T+h:mm from kickoff at 09:39 BST Sat 17 Oct 2026; §12 maps them to wall clock), the plan items (§13) and Alex's 18 extension items (§13.1).
2. `README.md` — status table and ground rules.
3. `docs/plans/*.md` — proposed or approved plans for individual workstreams (`vscode-companion.md` for plan items #9/#10, `isabelle-mcp.md` for the agent prover interface).
4. `docs/decisions/ADR-*.md` — decisions once recorded.

## Hard rules (from PLAN.md §2, §8, §11; the CI lint enforces most of them)

- **Never** change Isabelle's kernel, HOL, Isar syntax or outer keywords; no `keywords` in theory headers; no `axiomatization` or `oracle` under `thys/` or `heavy/`; never patch Isabelle.
- `.thy` files are **ASCII only** (`\<forall>`, `\<open>…\<close>`); never write Unicode into one.
- Every change goes through a pull request. Never push to `main`, never merge, never call `gh api`. Rebase (`git fetch && git rebase origin/main`); never merge `main` into a branch; no stacked PRs.
- One concern per PR, about ≤ 300 changed lines (lockfiles and golden files excluded). Title `area: imperative` with area ∈ {ci, thys, heavy, proofmap, beam, tools, vscode, contracts, docs}. Open a draft PR within 30 minutes of starting.
- **Mode by kind of work (PLAN §11):** scaffolds, prototype ports, CI YAML, schemas, tests → *plan first*: post the plan on the issue, a human approves (≤ 5 min), then implement a small PR. Theorem statements, `blueprint.yaml`, `statements.lock`, `axioms.allow`, contracts, `.github/`, `.claude/`, version pins → *humans lead*; agents are typists only. Merge order, demo script and slide claims → humans only.
- Agents never add `sorry`, `\<proof>`, `oops`, ML commands, `setup`/`declaration`, `tactic`/`raw_tactic`, `axiomatization` or `oracle`, and never close a hole by citing another `sorry`'d lemma.
- Contracts (`contracts/`) are frozen after Train 3/4; a change needs the `contract-change` label, a `schema_version` bump and every consumer's approval.

## Where things go (directory → owner; PLAN.md §7 has the full tree)

| Directory | Owner | Contents |
|---|---|---|
| `.github/`, `scripts/ci/`, `.claude/settings.json` | ark | CI gate, ruleset, agent deny rules |
| `contracts/` | all four | C1 dag, C2 docs, C3 blueprint, C4 MCP tools (the bridge's seven tools recorded as built), `claims.json` sidecar schema; golden examples |
| `thys/`, `heavy/` | Alex | sessions (parent HOL; `heavy/` for AFP-based work, never in the required gate) |
| `proofmap/`, `tools/revamp/map/` | ark | kernel DAG export, lock, audit |
| `tools/revamp/docs/`, `tools/revamp/mcp_server.py`, `data/` | retinapeg | docs index, Isar-Ref index, `revamp` MCP server |
| `extension/` | Leo (ark for hover/ProofMap) | **the** VS Code extension: goals sidebar, swarm board, ask, pretty symbols, MCP bridge (`src/*.ts`, `test/*.cjs`). The companion plan's hover cards and ProofMap viewer are added here, not in a new `vscode/` directory |
| `mcp/`, `examples/`, `scripts/check_m*.sh`, `scripts/lsp_probe.py` | Leo | the Python MCP server for the extension's bridge, the demo theories, the live acceptance checks |
| `beam/` | retinapeg | PIDE MCP + `run_at` component (LGPL-3.0, its own LICENSE) |
| `agents/`, `scripts/{setup,doctor,demo-smoke}.sh` | retinapeg | agent runner, setup scripts |
| `docs/` | shared | ADRs, `design/ui.md` (Alex), demo script, pain points, research, plans |

Generated files (`out/`, `*.vsix`, heaps, `*.db`, `.mcp.json`, `.vscode/settings.json`, `.isahome/`) are never committed.

## Conventions and known wrinkles

- Pins: **Isabelle2025-2** (`.isabelle-version`), AFP `afp-2026-10-16`, PIDE MCP `7463338`, Node 22 (CI), TypeScript as `extension/package.json` pins it (7, strict); everything else in `deps.lock`. No third-party editor extension is pinned or installed: `extension/` is the editor.
- **Issue numbering:** PRs occupy #1–#6, so plan items are created as issues titled `P<N>: <title>` and referred to as "plan item N"; quote the real issue in "Closes #M (plan item N)". Never assume issue #N = item N.
- Branches: `alex/<issue#>-<slug>`, `ark/<issue#>-<slug>`, `retinapeg/<issue#>-<slug>`, `leo/<item>-<slug>`; `feat/<name>` for the agent-built feature branches that merge into `integrate/all` (PR #6); `agent/<node-slug>` for Claude's headless proof PRs (labelled `agent-generated`); `demo/<slug>` for planted demo PRs (draft, `do-not-merge`); `proto/*` are the four prototype branches (`proto/ci`, `proto/proofmap`, `proto/beam`, `proto/docs`).
- Node IDs are `Session.Theory.fact`; paths in contracts are repo-relative; lines are 1-based.
- The hover card never waits on the prover; the bridge's `status()`, Beam and Isabelle-MCP verdicts are advisory; only the kernel batch build plus `revamp map audit` accepts a proof into `main`. Two agent designs coexist (PLAN §11A): A = the MCP bridge in the human's editor (zero-based coordinates), B = headless workers in worktrees (1-based).
