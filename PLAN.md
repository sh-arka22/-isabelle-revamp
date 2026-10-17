# PLAN.md v1.1: review fixes applied

**isabelle-revamp: system design and 24-hour plan**

> **Changelog.** v1 = the merged plan. v1.1 = the 34 review fixes, the agent architecture (§11A) and the first-hour checklist (§0).

> Commit 0 on `main` of **`sh-arka22/-isabelle-revamp`** is this `PLAN.md` plus a short `README.md`. Both were pushed by the planning session (a Claude Code cloud session), which also pushed the four `proto/*` prototype branches (§8). We recommend renaming the repo to `sh-arka22/isabelle-revamp` (D2). Date: Sat 17 Oct 2026. Times are written T+h:mm from kickoff; §0 turns them into wall-clock times. The hackathon is about 24 h; §12 gives a 36 h variant.
> Team:
> - **Alex** (`hymanimy`): maths, Isabelle, design, pitch.
> - **ark** (`sh-arka22`): repo owner. Algorithms/ML; learning Isabelle.
> - **retinapeg**: agent endpoints, natural-language tools, new-user pain points, setup scripts.
>
> Commands in this plan use `R`: `R=sh-arka22/isabelle-revamp` after the rename, or `R=sh-arka22/-isabelle-revamp` if ark keeps the old name.

---

## 0. First hour checklist

**Already done by the planning session, before kickoff:**
- Commit 0 on `main`: this `PLAN.md` and a short `README.md`. It is the only direct push to `main`.
- Four prototype branches, holding whitelisted files only (no Isabelle or AFP distributions, heaps, logs or third-party sources): `proto/ci`, `proto/proofmap`, `proto/beam` and `proto/docs`. §8 lists their contents and owners. They were pushed before any rename, so D2 cannot strand them.

**T+0:00–0:15, kickoff (everyone):**
- [ ] Check the push: `git ls-remote https://github.com/sh-arka22/-isabelle-revamp.git` lists `main` and the four `proto/*` branches.
- [ ] **Ask ark:** is "ark's existing code" from the chat the same code as these prototypes? If yes, there is no separate `ark/0-initial-import` (§8). If no, it is imported once, and no file goes up twice.
- [ ] Confirm retinapeg's GitHub handle (`retinapeg`) and that retinapeg is a separate person. This picks the 3-person plan or the 2-person variant (§10).
- [ ] Write every T+ time as a wall-clock time with a time zone: trains, M1, M2, the dry run, the cut line, the freeze, rehearsals, the demo. Set the train call link and the captain rota.
- [ ] Choose the demo machine (≥ 16 GB, 32 GB preferred). S2 and S6 must run on it. Also choose the machine that will do the ζ(5) work; S4 runs there.
- [ ] Claude budget: agree a model and a usage cap for the overnight agent waves, and keep quota reserved for the live demo.
- [ ] Hackathon rules: check the submission format, repo visibility, demo length, and whether code written before the hackathon (the `proto/*` prototypes) must be disclosed.
- [ ] Public repo: agree on BSD-3-Clause and on making the repo public (D3). Before anything is published, scrub phone numbers and team-chat excerpts from any research or pain-point notes.
- [ ] Everyone starts the Isabelle2025-2 download (not 2026-RC4).

**T+0:15–0:45:**
- [ ] ark, D2 (recommended): `gh repo rename isabelle-revamp -R sh-arka22/-isabelle-revamp`. Then everyone runs `git remote set-url origin https://github.com/sh-arka22/isabelle-revamp.git`. The planning session's GitHub access may stop at the rename; nothing depends on it any more.
- [ ] ark, **before any PR is opened:** create issues 1–20 from §13, in order, and then the labels. Issues and PRs share one number sequence, so PRs then start at #21 and say "Closes #N". In this plan "the PR for #2" means the PR that closes issue #2, and branch names use issue numbers.
  ```bash
  R=sh-arka22/isabelle-revamp        # or sh-arka22/-isabelle-revamp if not renamed
  titles=( "Bootstrap and canonical repo" "CI gate, setup-isabelle, ruleset" "Contracts v1 and tools/ skeleton"
           "Toolchain on 3 machines and pain-points log" "Demo fixture thys/Demo" "ProofMap export, lock and audit"
           "Beam component" "Docs index and Isar-Ref index" "VS Code companion: hover cards" "ProofMap viewer"
           "Apéry blueprint statements" "revamp MCP server and SKILL.md" "setup.sh, doctor.sh and demo-smoke.sh"
           "agents/run_holes.sh" "ζ(5) skeleton in heavy/" "Demo script, fallback video, demo PR, snapshots"
           "Isar outline and Read as paper (stretch)" "isa2uni textconv (stretch)" "docs_search (stretch)"
           "Isabelle2026-RC4 canary (stretch)" )
  for i in "${!titles[@]}"; do
    url=$(gh issue create -R "$R" --title "${titles[$i]}" --body "PLAN.md §13, item $((i+1))")
    [ "${url##*/}" = "$((i+1))" ] || { echo "numbering is off at $url: stop and fix"; break; }
  done
  for l in agent-generated statement-change contract-change parked needs-human full-ci do-not-merge; do
    gh label create "$l" -R "$R"
  done
  ```
- [ ] ark: make the repo public and invite Alex and retinapeg. **Invites must be accepted** before either of them can push.
- [ ] ark: the PR for #1 (§8) also carries `.claude/settings.json` with the deny rules (§11), `.gitattributes` with `*.thy text eol=lf`, and `thys/ROOTS` plus a tiny `thys/Smoke/` session, so the CI PR has something to build. Merged by T+0:40.
- [ ] Owners open draft PRs from the `proto/*` branches (§8), once the issues exist.
- [ ] Everyone posts the per-machine checklist on #1:
  - RAM, free disk (≥ 15 GB), OS and architecture;
  - the Isabelle2025-2 download started (not RC4 or 2026), and any existing `~/Isabelle20*` installs;
  - `gh auth login` with `repo` scope, git, Node 22, Python ≥ 3.10 with `venv`;
  - Claude Code installed and logged in.

---

## 1. How the three candidate plans scored

Each criterion is scored 1–10:
- (a) demo impact;
- (b) feasibility in 24 h for 3 people;
- (c) collaboration hygiene against our chat rules;
- (d) technical correctness against the scout findings;
- (e) fidelity to Alex's key rule.

| Plan | (a) | (b) | (c) | (d) | (e) | Total | One-line verdict |
|---|---|---|---|---|---|---|---|
| A, demo-first | 9 | 6 | 8 | 7 | 9 | 39 | Its best moment, the shared human+agent session, is yfprojects' work, not ours. It needs the extended jar built on every laptop. |
| B, risk-first | 8 | 7 | 7 | 8 | 9 | 39 | Excellent spikes and fallbacks. But it puts Apéry and the AFP inside the required CI gate (up to 75 min cold). Its "1 required approval" rule deadlocks while only one person is awake. |
| **C, collaboration-first** | 7 | 8 | **10** | 8 | 9 | **42** | Contracts with golden examples, ownership by directory, a review table and the 45-min "train". It is the best way to keep three people out of each other's way. |

**Plan C is the spine.**

**Taken from A:**
- the demo-beat design;
- the Isar-aware UI principles;
- "revert if a fix takes more than 15 min";
- a work-in-progress limit;
- settings flags after the cut line;
- lint bans on keywords;
- the name **ProofMap**.

**Taken from B:**
- spikes with pre-decided fallbacks and a go/no-go checkpoint;
- an ASCII-only `.thy` lint;
- the symbol and offset risks;
- overnight agent waves;
- the textconv idea.

**Problems none of the three plans fixed, fixed here:**
1. **Status classifier bug in the prototype.** At line 69 of `DAG_Export.thy`, a node is `sorry` only if it is tainted and none of its dependencies is. So a lemma with its *own* `sorry` and also a sorry'd dependency is reported `proved`, and its hole vanishes from `next_holes`. The kernel data alone cannot fix this: Pure's `ML_Bootstrap.thy` sets `Proofterm.proofs := 0`, so every `sorry` is recorded as the same `("skip_proof", Position.none, NONE)` and the union collapses them into one entry. Fix: our sessions set `record_proofs = 1`, which records each oracle's position (no proof terms). A node's own holes are then its `skip_proof` oracles minus the union of `all_oracles` over its named dependencies. #6 spikes this for 15 minutes; the fallback is a lexical scan that understands proof ends and `\<proof>` (§6.2). Issue #5 adds a regression fixture for this case.
2. **Naming collision.** "Blueprint" clashes with the existing `isa-blueprint` (PyPI `isabelle-blueprint`). We use **ProofMap**.
3. **AFP outside the required gate.** Anything that needs the AFP lives in `heavy/` and is never a required check. Apéry is built on plain `HOL`.
4. **Approvals.** 0 required approvals in the ruleset, plus a written review table (§8), so nobody is blocked while a teammate sleeps.
5. **One prover session per agent.** Plan C's single shared read-only PIDE MCP session cannot see an agent's worktree edits. Each agent gets its own session, capped by RAM.
6. **No CDN in the viewer.** The ProofMap viewer bundles Cytoscape: VS Code webviews have a content security policy, and the demo must work offline.
7. **No custom build of yfprojects needed.** The demo spine uses the Marketplace yfprojects plus our own headless Beam. Building yfprojects from `main` is optional.
8. **No downloaded baseline in the CI gate.** The gate checks against the committed `statements.lock` and `axioms.allow`, plus an oracle audit. The baseline artifact is used only for warnings about status regressions.

---

## 2. Guiding principle, goal, 3-minute demo

**Alex's key rule, ADR-0004:**

> *Isabelle works extremely well at the research and logic level. Its problem is that it integrates poorly with other apps and systems. That is why it is hard to modify, looks dated, and has little agent support.*

What we build follows from that rule:
- **We never change** the kernel, HOL, Isar syntax or outer keywords, and we never patch Isabelle. Lint enforces this: no `keywords` in theory headers, no `axiomatization` or `oracle` in `thys/` or `heavy/`.
- **We borrow from Lean for tooling only:** hover cards, a dependency DAG, Beam-style `runAt`, elan-style toolchain pinning. We never borrow syntax. retinapeg's overnight Lean/Isabelle research lands as `docs/research/` under that rule.
- **The UI should suit Isar, not copy Lean.** Isar is a structured document, not a stream of tactic states. Show *structure and context*:
  - enclosing proof levels;
  - `fix`/`assume`/`this`/cases;
  - an outline at the level of individual steps;
  - a "Read as paper" mode that folds every proof.

  Do not copy Lean's flat goal list.
- **Modern and clean, even where it is cosmetic:**
  - colours come from the user's VS Code theme;
  - hovers are Markdown cards;
  - no raw `\<forall>` appears in any surface we own;
  - every UI PR includes a screenshot;
  - Alex signs off the look in `docs/design/ui.md`.

**Product goal:** keep Isabelle/HOL's logic exactly as it is, and make it pleasant and agent-ready from modern tools. That means:
- Lean-style hover docs in stock VS Code;
- a theorem dependency map (**ProofMap**) whose edges and statuses come from what the kernel recorded;
- headless agent endpoints that let Claude try proofs speculatively and close holes safely behind a kernel-checked gate.

**Demo, 3 minutes.** Everything runs locally from `main-latest`, the rolling pre-release. A video recorded at T+19:30 is the fallback.

| Time | Beat | On screen | Built by |
|---|---|---|---|
| 0:00–0:20 | The problem | Four measured pain points from retinapeg's fresh install: 1.2–1.7 GB download, unsigned app, the editor lock-in, `\<forall>` in git diffs, no agent API. Alex: *"The logic is world-class. The integration isn't."* | retinapeg |
| 0:20–0:55 | A modern editor built for Isar | Stock VS Code, set up by `scripts/setup.sh`. Hover `geometric_sums`: a Markdown card with the statement, the doc "Sum of a geometric progression." with a badge saying it came from the preceding text, a breadcrumb, and `Series.thy:N`. Hover `append_assoc`: its source has no doc, and the card is still useful (statement, breadcrumb, link). Hover `obtain`: the Isar reference paragraph. Add a description marker to an Apéry lemma and save: the card updates. "No syntax changed." | ark, retinapeg |
| 0:55–1:30 | ProofMap | The Apéry DAG (about 12 nodes). Statuses come from the kernel (`Thm_Deps`; `sorry` is the `skip_proof` oracle, recorded with its position), not from anything we wrote by hand. Click a node to jump to file:line. Then the ζ(5) blueprint: 28 nodes, *n* of them green; the numerics node is labelled "post-hackathon". | ark, Alex |
| 1:30–2:30 | Claude closes a hole | Claude Code in VS Code's terminal: `next_holes` → `claim` in place → `node_context` (natural-language description plus dependency statements) → `run_at` tries 8 candidates in about 1 s without touching the file → Claude writes the winner → VS Code re-checks → `verify` passes → the node turns green. Then a pre-made draft agent PR on `demo/weaken-…` (labelled `agent-generated` and `do-not-merge`) that quietly weakens a statement: the agent lint lets it through, and the audit fails it with "statement_sha1 changed". | retinapeg, ark, Alex (demo PR) |
| 2:30–3:00 | Close | Same kernel, same HOL, same Isar. The honest ζ(5) line (§4). Next steps: Isabelle2026 (24 Oct), and proposing Beam to PIDE MCP upstream. | Alex |

For the live beat, one known-easy leaf (the "golden hole") is re-opened as `sorry` on stage, with `sorry` on its own line, and we say so. The agent takes it with `claim{in_place: true}`, so VS Code reloads the file in front of the audience; the presenter must have no unsaved edits in that file. Parallel agent work is shown as the overnight PR list.

**About "Prove2Me":**
- It is real: prove2.me, from Columbia DAPLab, arXiv 2608.28433.
- It supports Lean only, and its server is closed source.
- Anthropic's Fermat's Last Theorem run worked once its agents worked inside its DAG of theorem statements.
- We build the same idea natively for Isabelle under our own name, **ProofMap**, and credit Prove2Me, leanblueprint and LeanArchitect in the README.
- We never use the Prove2Me name or branding, and never imply any affiliation.

---

## 3. Requirements

### Functional

| ID | Requirement |
|---|---|
| FR1 | **Hover cards** for facts, constants and types from HOL and our sessions, showing: statement, doc with its source labelled, kind and full name, breadcrumb, file:line. Also hover docs for Isar commands, methods and attributes, taken from the Isar reference manual. |
| FR2 | **ProofMap export** of a session's theorem-level DAG, using dependencies recorded by the kernel. Each node has a `Session.Theory.fact` ID, a status, an optional natural-language description (from the preceding `text ‹›`) and a link to its source. |
| FR3 | **ProofMap viewer** inside VS Code: leanblueprint-style legend, click to open file:line, refreshes when the map changes. |
| FR4 | **Integrity gate**, run in CI and by `verify`. It fails on: a changed statement hash, an axiom not in the committed `axioms.allow`, a new oracle, and (in `verify`) hole laundering. A status regression is a warning. |
| FR5 | **Agent endpoints over MCP.** Server `isabelle-beam`: `run_at`, `find_theorems_at` and the built-in PIDE MCP tools. Server `revamp`: `map_status`, `next_holes`, `node_context`, `claim`, `verify`, `docs_lookup`. Stretch: `docs_search`. |
| FR6 | **Agent loop:** one hole → one draft PR (the lock) → one worktree → a human merges. |
| FR7 | **One-command setup:** `scripts/setup.sh` reads the pinned versions, installs the pinned editor extension with auto-update off, registers components, and writes gitignored local settings. `doctor.sh` diagnoses problems. |
| FR8 | **Maths content:** the Apéry series fully proved; the ζ(5) blueprint skeleton. |
| FR9 | **Pain-point log:** `docs/pain-points.md`, with each entry turned into an issue. |

### Non-functional targets

| Area | Target |
|---|---|
| Hover latency | p95 ≤ 150 ms. Served from the index; the definition lookup times out at 100 ms and falls back to looking up the name. **A hover never waits on the prover.** |
| Goal panel | Comes from yfprojects. Must update ≤ 1 s after a caret move on the demo theories. We measure this; we do not engineer it. |
| `run_at` | One simple candidate ≤ 1 s. 16 in parallel ≤ 3 s wall time. File unchanged (md5). Default timeout 10 s per candidate. |
| ProofMap | Save to green node: target ≤ 30 s on Apéry from one batch export build, measured in S5 and #10 (batch builds of analysis proofs may be slower). Viewer renders 500 nodes in ≤ 2 s. |
| Install | `setup.sh` takes ≤ 10 min, not counting the download. It is idempotent and never writes into the Isabelle distribution. |
| CI | `ci-ok`: ≤ 3 min for docs-only PRs; ≤ 5 min warm and ≤ 8 min cold when Isabelle runs. |
| Live demo | The golden path succeeds in 5 of 5 rehearsals. Nothing needs the network except the Claude API. The demo machine has ≥ 16 GB (32 GB preferred; parallel agents need ≥ 32 GB). The fallback video is recorded. |
| Soundness | Nothing an agent writes reaches `main` without a kernel batch build and the gate. Beam verdicts are advisory only. |
| Look | Webviews use `--vscode-*` theme variables and are readable in light and dark themes. The leanblueprint colour legend is used. |
| Platforms | Linux x86_64 and macOS arm64 must work. Windows is best effort (Cygwin). |

### Constraints

- **Time and people:** 24 h, 3 people, one of whom is learning Isabelle.
- **Isabelle2026:** final release is 24 Oct, after the demo; RC4 is out now. We pin **Isabelle2025-2** (ADR-0002, §14).
- **Upstream churn:**
  - The upstream maintainer has called Isabelle's language server "a failure", and its `PIDE/*` messages are unversioned.
  - yfprojects has a single maintainer.
  - Isabelle's ML API changed between 2025-2 and 2026 in four places that Beam uses; PIDE MCP's own Scala compiled unchanged.
- **Licences:** our repo is BSD-3. PIDE MCP is LGPL-3.0, so Beam is a separate component with its own licence. Romik's ζ(5) repo (danromik) has no licence: we cite it and copy nothing, not even its file structure. mo271's ζ(5) repo is Apache-2.0; we use its module list for structure only, with credit. Fauzan's PDF is All Rights Reserved (link to it only).
- **Resources:**
  - About 2.2 GB RSS per HOL prover session, and 2–4 GB (Poly/ML plus JVM) per batch build.
  - 1.2–1.7 GB downloads.
  - Free rulesets and 4-CPU/16 GB runners need a **public** repo.

---

## 4. Scope

### MUST: on `main` by the cut line (T+14, tag `demo-v1`)

1. Repo, the `ci-ok` gate and the ruleset (#1–#3).
2. Hover cards on Demo, Apéry and HOL lemmas (`geometric_sums`, `append_assoc`), plus at least one Isar keyword hover (#8, #9).
3. ProofMap export with correct statuses, the integrity audit, and the viewer in VS Code (#6, #10).
4. Beam `run_at` and `find_theorems_at`, plus the `revamp` MCP server. Claude closes at least one node end to end through a PR and the gate (#7, #12).
5. The planted statement-weakening rejection: a draft PR on `demo/…`, labelled `do-not-merge`, reproducible on demand (#16). The planted-axiom fixture is a CI test (#6).
6. At least 6 of the 12 Apéry nodes green.
7. `setup.sh` v0 (Isabelle already downloaded; #13). `pain-points.md` with at least 10 entries. Fallback video v0.

### SHOULD: T+14 to T+18

- All of Apéry green.
- The ζ(5) skeleton with at least 8 green nodes.
- Full `setup.sh` (download plus sha256 check) and `doctor.sh`.
- 2–3 parallel agents, only on a ≥ 32 GB machine.
- The `main-latest` pre-release published automatically.
- Isar step outline and "Read as paper".

### COULD

- Natural-language `docs_search` (BM25).
- `isa2uni` git textconv, so local `git diff` shows `∀`.
- Isar context pane.
- Isabelle2026-RC4 canary job.
- yfprojects built from `main` for its shared-session `isabelle_try`.
- Drafts of upstream PRs.

### OUT, stated plainly

- **SML→OCaml port.** A real port takes years. Isabelle depends on Poly/ML runtime compilation, saved heaps and asynchronous interrupts. Shibboleth drops infix declarations (Isabelle has 106; `|>` is used about 11k times), sharing, and opaque `:>` signatures. It adds nothing to the demo. At most it gets one roadmap line: a measured experiment on `src/Tools/Metis` after the hackathon.
- **Isar syntax, the kernel, HOL, new keywords, or patches to Isabelle's language server.** Out by rule. A patched server stays a post-hackathon patch series.
- **A Real Analysis library speed-run.** HOL-Analysis plus the AFP already cover it. Apéry and the ζ(5) blueprint replace it.
- **Forking or vendoring** yfprojects, the official Isacode or PIDE MCP. The official extension's Scala.js build cannot run in npm CI.
- **A human and an agent sharing one PIDE session.** That needs changes to Isabelle's source. Here the editor and the agent each run their own prover, and the files on disk are the only state they share.
- **Porting to Isabelle2026** before its release.
- **Using the "Prove2Me" name.**

### The maths target, stated plainly

**Is ζ(5) irrational? It was an open problem until September 2026.** Before that:
- Ball and Rivoal proved that infinitely many odd ζ values are irrational.
- Zudilin proved that at least one of ζ(5), ζ(7), ζ(9), ζ(11) is irrational.

**As of 17 Oct 2026** a proof is *claimed*:
- Fauzan's Zenodo preprint of 17 Sep 2026; **not peer-reviewed**, and its authorship has been questioned.
- It has been **machine-checked twice in Lean 4**:
  - `danromik/zeta5-irrationality` takes the prime number theorem as an axiom;
  - `mo271/zeta5` uses only the standard axioms.
- DeepMind's formal-conjectures repository marks it solved.

So it is not an open problem we could "attack". It is also far beyond 24 hours: the Lean proof is about 29k lines, while the whole AFP ζ(3) entry is 2,079 lines.

**The realistic substitute:**
1. **Apéry's series, the must-finish target:**
   $\zeta(3)=\tfrac52\sum_{n\ge1}\frac{(-1)^{n-1}}{n^3\binom{2n}{n}}$.
   - It is not in AFP snapshot `afp-2026-10-16` (checked by grep; its status in Mathlib is unverified).
   - About 12 nodes (B1–B12), built on plain `HOL`.
   - The main theorem is stated over `suminf (λn. 1/(n+1)^3)`. The bridge to the AFP's `zeta 3` goes in `heavy/` only.
2. **The ζ(5) blueprint skeleton, partial by design:**
   - about 27 statements that follow the preprint's own numbering, organised along mo271's Apache-2.0 module list (structure only, credited), plus `irrationality_criterion`. Romik's formalisation is cited; nothing is taken from it;
   - the top-level assembly is proved;
   - leaves are filled live.

   Slide wording: *"To our knowledge, the first Isabelle blueprint of the September 2026 ζ(5) proof. That proof is a preprint, verified twice in Lean and not yet peer-reviewed. One of the two Lean proofs takes the prime number theorem as an axiom; in Isabelle it is the 2018 AFP theorem `θ_asymptotics`."*

---

## 5. Architecture and data flow

```
 ┌──────────────────────── Demo laptop (>=16 GB) ────────────────────────────────────────────────┐
 │                                                                                               │
 │  Human ─► Stock VS Code                                                                       │
 │           ├─ yfprojects.vscode-isabelle 2026.10.0 (installed by setup.sh; auto-update off)    │
 │           │    syntax · symbols (file stays ASCII) · goal panel · sledgehammer panel          │
 │           │    └─ LSP stdio + PIDE/* ─► isabelle vscode_server ─► Poly/ML prover #1           │
 │           └─ revamp companion extension (OURS, standard VS Code APIs only)                    │
 │                ├─ HoverProvider ─► docs.jsonl + isar-ref.jsonl (+ definition lookup, 100 ms)  │
 │                ├─ ProofMap webview ◄─ out/dag.json (Cytoscape bundled, theme colours)         │
 │                └─ (SHOULD) Isar step outline / Read-as-paper                                  │
 │                         ▲ VS Code auto-reloads files; disk is the only shared state           │
 │  Claude Code ─MCP stdio─► "isabelle-beam" = isabelle pide_mcp + beam component, -l HOL_Beam   │
 │      │                     run_at · find_theorems_at · get_state · edit · sledgehammer        │
 │      │                     └─► one Poly/ML prover per agent  (k<=1 @16 GB, k<=3 @32 GB)       │
 │      └───────MCP stdio─► "revamp" (Python) map_status · next_holes · node_context ·           │
 │                              claim · verify · docs_lookup · (docs_search)                     │
 │                              ├─ revamp map export ─► isabelle build -e: ONE wrapper session   │
 │                              │      (parent HOL, sessions from thys/ROOTS) ─► out/dag.json    │
 │                              ├─ revamp map audit  ─► statements.lock + axioms.allow + oracles │
 │                              └─ claim ─► push agent/<slug> + draft PR (= the lock), then      │
 │                                   ../wt/<slug> with its own .mcp.json and HOME=<wt>/.isahome, │
 │                                   or in_place=true in the main checkout (the live beat)       │
 │  revamp docs index ─► lexical scan of $ISABELLE_HOME/src/HOL + thys/ + Isar-Ref ─► docs.jsonl │
 └───────────────────────────────────────────────────────────────────────────────────────────────┘
 GitHub: PR ─► ci.yml [lint · isabelle (export = build, + map audit) · py · beam smoke · vscode]
                 ─► ci-ok (sole required check)
         main ─► cd-main.yml ─► pre-release main-latest (vsix, dag.json)
         heavy.yml ─► AFP / ζ(5) / strict-status check (never required)
```

**Data flow:**
1. `.thy` files are always ASCII on disk. The editor checks them with prover #1; nothing of ours depends on the editor.
2. When a file is saved, `revamp map export --watch` runs **one** batch build of a generated wrapper session (parent HOL, `sessions` read from `thys/ROOTS`, `options [quick_and_dirty, record_proofs = 1]`). That build both checks the theories and exports: `DAG_Export.thy` reads `Thm_Deps.thm_deps`, the positioned `skip_proof` oracles from `all_oracles`, and `Theory.all_axioms_of`, and writes `out/dag.json`. The watcher pauses while `verify` runs.
3. The viewer re-renders from `dag.json`. `next_holes` ranks open leaves: holes that depend on no other hole first, then by leverage.
4. The agent calls `claim(id)`. It pushes `agent/<slug>` and opens a draft PR at once (the lock), then creates worktree `../wt/<slug>` with its own `.mcp.json` and Isabelle home (or, with `in_place: true`, uses the main checkout). The agent then calls `node_context` and `run_at` (speculative, nothing is written), writes the winning proof, and calls `verify`, which runs export and audit in the worktree with `-o threads=2`. Then it marks the PR ready.
5. CI rebuilds from scratch and audits. A human merges. CD republishes `main-latest`.
6. `docs.jsonl` is built once for HOL and incrementally for repo files on save. Hover only ever reads the index and `data/isar-ref.jsonl`.

**Why there is no shared session:** PIDE MCP runs headless sessions of its own. The preprint says sharing a session with an editor needs changes to Isabelle's sources. For the live beat, the agent claims with `in_place: true` and works in the main checkout, so VS Code reloads the file in front of the audience. Parallel agents use worktrees.

---

## 6. Interfaces and contracts (`contracts/`; C1–C3 frozen as v1 at T+2:15, C4 at T+3:00)

These rules apply to every contract:
- Each contract is a JSON Schema plus golden examples in `contracts/examples/`.
- Each producer has a CI test that validates its real output against the schema.
- Consumers build against the golden examples, so they never wait for the producer.
- C1–C3 freeze at Train 3 (T+2:15). C4 freezes at Train 4 (T+3:00), after the S3 go/no-go has decided whether `run_at` exists.
- After the freeze, a change needs a PR labelled `contract-change`, a bump of `schema_version`, and approval from every consumer.

### 6.1 MCP tools (C4, `contracts/mcp-tools.json`)

**Server `isabelle-beam`** (Scala; PIDE MCP plus our `beam` component, logic `HOL_Beam` or a generated `Beam_<Parent>`; owner retinapeg). It is not called `isabelle`, because a yfprojects build from `main` registers its own `isabelle` server. Lines are 1-based, and `origin` is a session-qualified theory name or a file path.

```jsonc
// run_at — readOnlyHint: true. Runs on the state after the last command ending on start_line
// (or after `prefix` of that line). Never edits. Verdicts are ADVISORY.
{ "name": "run_at",
  "input": { "session": "string?", "origin": "string", "start_line": "int>=1", "prefix": "string?",
             "candidates": "string[1..16]", "timeout": "int>=1 (default 10, seconds per candidate)" },
  "output": { "results": [ { "candidate": "string",
      "verdict": "proved | no_subgoals | goals_left | error | timeout",
      "goals_left": "int?", "goals": "string? (ASCII \\<symbols>)", "message": "string?", "elapsed_ms": "int" } ] } }
// find_theorems_at — readOnlyHint: true
{ "name": "find_theorems_at",
  "input": { "origin": "string", "start_line": "int", "query": "string (find_theorems syntax)", "limit": "int=20" },
  "output": { "results": [ { "name": "string", "statement": "string" } ] } }
// Plus PIDE MCP built-ins, unchanged: get_state, read, edit, find_entities, start_session, stop_session,
// list_sessions, sledgehammer (tool_extensions).
```

- `proved` means a terminal method closed the goal.
- `no_subgoals` means an `apply` script left no subgoals but still needs `done`.
- The two soundness fixes from the prototype are mandatory:
  - **(i)** run under the print's own exec id, not the command's eval id;
  - **(ii)** don't let terminal `by` proofs fork. On 2025-2 this uses the prototype's counted save/restore of the global `parallel_proofs` setting.
- Common errors:
  - "Bad context for command": the tool returns a hint to move to the nearest command line.
  - "No goal" on a one-line stub such as `have "…" sorry` or `lemma x: "…" sorry`: the last command on that line is `sorry`, so `run_at` sees a closed goal. Pass `prefix` (the line up to `sorry`). New stubs always put `sorry` on its own line (§13 #11, #15).

**Server `revamp`** (Python using the official MCP SDK's FastMCP; owner retinapeg; the ProofMap logic is ark's `tools/revamp/map`).

| Tool | Input | Output |
|---|---|---|
| `map_status` | `{session?, target?}` | `{counts:{fully_proved, proved, sorry, oracle, defined, missing}, red:[id], git_sha, generated_at}` |
| `next_holes` | `{target, k=5}` | `[{id, file, line, statement, leverage, rests_on_holes}]`, ranked: fewest other holes first, then highest leverage, then shortest statement |
| `node_context` | `{id}` | `{node, nl?, doc, deps:[{id, statement, status}], used_by:[id]}`. `nl` may be absent in v1. |
| `claim` | `{id, in_place=false}` | `{ok:true, branch:"agent/<slug>", pr, worktree}` (with `in_place`, `worktree` is the main checkout) or `{ok:false, held_by}`. **The lock is the draft PR, opened at claim time** (below). |
| `verify` | `{id, worktree}` | `{ok, status, statement_unchanged, new_axioms:[], new_oracles:[], new_holes:[id], sorry_count:{before, after}, log_tail}`. Passes only if: the node is no longer `sorry`; its hash is unchanged; there is no axiom outside `axioms.allow` and no new oracle; `new_holes` is empty (the node's `rests_on_holes` gained nothing, so a hole cannot be "closed" by citing another `sorry`'d lemma); and `sorry_count.after < sorry_count.before`. Builds with `-o threads=2` and pauses `export --watch`. |
| `docs_lookup` | `{name, kind?}` | one C2 record |
| `docs_search` (stretch) | `{query, k=10}` | `[{…C2 record, score}]`, ranked by BM25 over statement and doc, offline |

**`claim` in detail:**
1. Push an empty commit to `agent/<slug>` with a plain `git push`, never `--force`. If another machine got there first, the push is rejected.
2. Open the draft PR at once (`gh pr create --draft`), then check that `gh pr list --head agent/<slug> --state open` returns exactly this PR. Otherwise back off and return `{ok:false, held_by}`. There is no local lockfile, because other machines cannot see it.
3. Default: `git worktree add ../wt/<slug>`. `.mcp.json` is gitignored, so `claim` writes the worktree's own from `.mcp.json.example` with absolute paths. `isabelle-beam` gets `-d <wt>/beam/session -l HOL_Beam -d <wt>/thys`: only this worktree's `thys/`, so there is no duplicate `Apery` session. `isabelle-beam` gets `HOME=<wt>/.isahome` in its `env`. The `revamp` server keeps the real `HOME`, because it runs `git` and `gh`, whose config and logins live there; it passes `HOME=<wt>/.isahome` only to the Isabelle builds that `verify` starts. `claim` re-runs `isabelle components -u` for Beam and PIDE MCP under that home. It also copies any already-built ancestor heaps the agent needs (for `heavy/`: HOL-Analysis and the AFP chain), with their `log/*.db`, from the real `~/.isabelle/Isabelle2025-2/heaps` into it, so no agent rebuilds them. Every Isabelle subprocess of this agent (its PIDE MCP session and `verify`'s builds) therefore writes its own heaps and `log/*.db`.
4. `in_place: true` (the live beat): no worktree; the main checkout switches to `agent/<slug>`. It refuses if the tree is dirty, and the presenter must have no unsaved edits in that file.

Errors are MCP tool results with `isError: true` and a single-line, actionable message.

### 6.2 Theorem dependency graph (C1, `contracts/dag.schema.json`)

```jsonc
{ "schema_version": 1, "isabelle": "Isabelle2025-2", "session": "Apery",
  "git_sha": "…", "generated_at": "ISO-8601",
  "nodes": [ {
    "id": "Apery.Telescoping.partial_sum_identity",  // Session.Theory.fact, unique across sessions; multi-facts as foo(1)
    "kind": "theorem | definition",
    "theory": "Apery.Telescoping", "file": "thys/Apery/Telescoping.thy", "line": 42,   // repo-relative
    "status": "missing | defined | sorry | proved | fully_proved | oracle",
    "statement": "ASCII with \\<symbols>", "statement_sha1": "hex",
    "nl": "optional in v1: from preceding text ‹›, filled once revamp.docs (#8) is available",
    "doc_source": "marker | preceding_text | comment | none",
    "lib_uses": ["HOL.trans", "…"],                  // filtered: no arity_/classrel_; may be truncated
    "blueprint": { "label": "B3", "paper_ref": "…", "owner": "human:alex | agent" }   // optional join from C3
  } ],
  "edges": [ { "from": "<dependent id>", "to": "<dependency id>", "kind": "uses | uses_def | declared" } ],
  "audit": { "non_definitional_axioms": [ { "name": "…", "theory": "…", "prop": "…" } ],
             "oracles": [ { "node": "…", "oracle": "…" } ] } }
```

Node IDs are `Session.Theory.fact`, because `Thm_Name.print` gives only `Theory.fact` and Demo already has a `Basics.thy`. The lint also rejects duplicate theory base names across `thys/` and `heavy/`.

Edge kinds:
- `uses` comes from `Thm_Deps.thm_deps` (named facts within the session).
- `uses_def` comes from the constants that occur in the statement.
- `declared` comes from `blueprint.yaml`. `revamp map check` warns where declared edges and actual edges differ.

| Status | Rule | Viewer (leanblueprint legend) |
|---|---|---|
| `missing` | Listed in `blueprint.yaml`, with no Isabelle fact yet | blue border |
| `defined` | A constant or definition | box shape |
| `sorry` | The node's **own** proof has a hole. Primary rule (sessions use `record_proofs = 1`, so each `skip_proof` oracle carries its position): the node's `skip_proof` oracles minus the union of `all_oracles` over its named dependencies is non-empty. Fallback, if the #6 spike fails: a lexical scan of the node's proof span, following Isar nesting to its end (`by`, `..`, `.`, `done`, `qed`, `oops`), finds `sorry` or `\<proof>` outside `text` blocks and comments. | red border |
| `proved` | Its own proof has no hole, but it rests on at least one `sorry` somewhere in its dependencies | green fill |
| `fully_proved` | No oracles anywhere in its dependencies | dark-green fill |
| `oracle` | It depends on an oracle other than `skip_proof` | solid red, untrusted |

**Committed files owned by humans:**
- `thys/<S>/statements.lock` holds `{id, statement_sha1}` for each blueprint node.
- `thys/<S>/axioms.allow` lists the session's allowed axioms: definitions, `type_definition_*`, and the overloaded `_def_raw` axioms from `instantiation`. The gate fails on any axiom not on the list.
- Both files are regenerated by `revamp map lock` **only** in human PRs labelled `statement-change`. Agents never touch them, and CI enforces that.
- `thys/<S>/blueprint.yaml` (C3) holds `{label, isabelle, title, nl, paper_ref, owner, declared_uses}`.
- Generated `dag.json` files are never committed.

### 6.3 Hover and docstring extraction (C2, `contracts/docs.schema.json`)

Each line of `docs.jsonl` is one record:

`{name, kind: fact|constant|type|locale|class|method|attribute|command, session, file, line, statement, doc, doc_source: marker|preceding_text|comment|isar_ref|ai_summary|none, breadcrumb: [theory, chapter, section, …], statement_sha1}`

**Where the doc comes from, first match wins.** All of these are constructs Isabelle already has; no new syntax.
1. The description marker inside the command. Editors show it as `\<^marker>‹description ‹…››`; on disk it is ASCII, `\<^marker>\<open>description \<open>…\<close>\<close>`, so the parser must handle the ASCII form with nested cartouches. This marker is built into Pure and is unused in HOL today; S6 checks it in 10 minutes, and the Demo fixture contains one.
2. An *adjacent* preceding `text ‹…›` or `txt ‹…›`: only whitespace or comments may come in between, and the search stops at any heading or other command. The card shows "from preceding text", because a section's intro text can describe several lemmas.
3. A `\<comment> ‹…›` inside the statement.
4. `ai_summary` (stretch). Keyed by `statement_sha1`, and always shown as "AI summary (not in source)".
5. `none`.

Only 2.4–4.7% of HOL lemmas have an adjacent text block, so the card must be useful without a doc: the statement, breadcrumb and link are always shown. `append_assoc` is the demo example of a card with no doc; `geometric_sums` (Series.thy: "Sum of a geometric progression."), `binomial_absorption` and `Cauchy_product_sums` are examples with one.

**Statement:** the command's text, cut before the first of `proof`, `by`, `apply`, `using`, `unfolding`, `including`, `supply`, `sorry`, `\<proof>`, `oops`, `..` or `.`.

**Conversion to Markdown:**
- `\<^item>` becomes `-` and `\<^enum>` becomes `1.`;
- `\<^emph>` becomes `*…*` and `\<^bold>` becomes `**…**`;
- `@{thm}`, `\<^term>`, `\<^const>`, `\<^typ>` and `\<^verbatim>` become inline code;
- `\<^url>` becomes `<url>`;
- symbols are decoded through `$ISABELLE_HOME/etc/symbols`.

**Lookup, in order:**
1. `vscode.executeDefinitionProvider` at the cursor, with a 100 ms budget, gives a (file, line) to look up in the index.
2. Otherwise, the word under the cursor is looked up by name: the same theory first, then its imports.
3. Keywords, methods and attributes come from `data/isar-ref.jsonl`, which retinapeg delivers and ark's extension reads.

The hover never calls the prover and never calls `executeHoverProvider`, which would recurse.

**Card layout (Lean-style):** a fenced `isabelle` code block with the statement, a `---` separator, the doc with its source badge, another `---`, then *kind · full name · breadcrumb · `File.thy:N`* in italics. VS Code shows our card alongside yfprojects' plain-text tooltip.

---

## 7. Repo layout (directory → owner)

```
isabelle-revamp/
├── PLAN.md  README.md (commit 0)  CONTRIBUTING.md  CLAUDE.md  LICENSE (BSD-3-Clause)
├── .isabelle-version          "Isabelle2025-2": the ONLY place the version is written
├── deps.lock                  afp=afp-2026-10-16 + afp_sha256 · pide_mcp=kappelmann/isabelle-pide-mcp@7463338 (branch Isabelle2025-2)
│                              yfprojects=Marketplace 2026.10.0 (optional src: 4961e04 + mirror 51836a987a) · node=22 · typescript=~6.0.3
├── .gitignore  .gitattributes (*.thy text eol=lf)  .mcp.json.example  .vscode/settings.json.example   (real files gitignored)
├── .claude/    settings.json (deny rules, §11)                                                      (ark)
│               skills/isabelle-revamp/SKILL.md                                                      (retinapeg)
├── .github/    workflows/{ci,heavy,cd-main}.yml · actions/setup-isabelle/ · ruleset-main.json
│               CODEOWNERS · pull_request_template.md · ISSUE_TEMPLATE/task.md                       (ark)
├── contracts/  dag/docs/blueprint schemas · mcp-tools.json · examples/                              (all three)
├── thys/       ROOTS · Smoke/ (CI) · Demo/ (fixture) · Apery/ (+ blueprint.yaml, statements.lock, axioms.allow)
│               parent = HOL only · options [quick_and_dirty, record_proofs = 1]
│               directory name = session name · theory base names unique across thys/ and heavy/     (Alex)
├── heavy/      Zeta5_Blueprint/ · Apery_Bridge/ (link to AFP zeta 3)                 (Alex)  heavy.yml only
├── proofmap/   isabelle/{DAG_Export.thy, ROOT.template} · prototypes/                               (ark)
├── tools/      pyproject.toml · revamp/{cli.py (plugin loader only), contracts.py, map/, docs/, mcp_server.py}
│               tests/{fixtures/ax/, …} · prototypes/
│                         (ark: skeleton (#3), map/ · retinapeg: docs/, mcp_server, prototypes/)
├── vscode/     companion extension: package.json · src/{extension, hover/, map/, outline/}.ts · test/ (ark)
├── beam/       LICENSE (LGPL-3.0) · ext/{etc/{build.props,settings}, src/*.scala} · ci/pide-mcp.sh
│               session/{ROOT, ROOT.template, Beam.thy} (2025-2) · session-2026/ (kept for the port)
│               tests/{smoke.py, mcp_client.py, thy/Demo.thy}                                        (retinapeg)
├── agents/     run_holes.sh · prompt.md                                                             (retinapeg)
├── scripts/    ci/lint.sh · isa2uni                                                                 (ark)
│               setup.sh · doctor.sh · demo-smoke.sh                                       (retinapeg, #13)
├── data/       isar-ref.jsonl (generated, small, committed; read by ark's hover)                    (retinapeg)
└── docs/       decisions/ADR-000{1..6} · design/ui.md (Alex) · demo-script.md (Alex) · onboarding.md
                pain-points.md · research/ · agent-eval.md (retinapeg) · DEPENDENCIES.md (licences)
```

`.gitignore` covers: heaps, `*.db`, `*.vsix`, `*.jar`, `beam/lib/`, `beam/ext/lib/`, `vscode/out`, `vscode/dist`, `.vscode-test`, `out/` (including `out/agent-logs/`), `.isahome/`, `.mcp.json`, `.vscode/settings.json`, videos, `.venv`.

CODEOWNERS matches the owners above; `/contracts/` is owned by all three. It is informational and not enforced.

`tools/` has two owners, so the PR for #3 creates its skeleton once: `pyproject.toml` with every dependency both owners need, and a plugin-style CLI in which `revamp/cli.py` only discovers `revamp.map.cli` and `revamp.docs.cli`. After that, ark and retinapeg never edit the same file.

---

## 8. Git workflow

**Decisions, made at kickoff and recorded in ADRs:**
- **D1, canonical repo:** `sh-arka22/…` is the **only** repo. Alex pushes a one-line README to `hymanimy/isabelle-revamp` saying "moved to github.com/sh-arka22/isabelle-revamp" (the final name, after D2) and archives it. Nothing is mirrored, and nobody adds a second push remote.
- **D2, rename to `isabelle-revamp` (recommended; ark executes it in §0).** `gh repo rename isabelle-revamp -R sh-arka22/-isabelle-revamp`; GitHub redirects the old URL. The leading hyphen breaks tools: `cd -isabelle-revamp` fails with "-i: invalid option", and relative paths passed to `isabelle -d` or `components -u` get read as flags.
  - The rename is safe for the prototypes: commit 0 and the `proto/*` branches were pushed before it. The planning session's own access may stop at the rename, and nothing depends on it.
  - After the rename: `git remote set-url origin https://github.com/sh-arka22/isabelle-revamp.git`.
  - Anyone working in a hyphen-named directory always uses absolute paths.
- **D3, public repo.** On a free personal account, rulesets require a public repo, and public runners have 4 CPU/16 GB instead of 2/8. Only the owner (ark) can be admin, so only ark can bypass the ruleset, and only through a PR.

**Bootstrap, in order:**
1. **Commit 0 is this `PLAN.md` plus a short `README.md`, pushed directly by the planning session. It is the only direct push to `main`, ever.** The same session pushed the `proto/*` branches.
2. Issues 1–20 and the labels (§0), before any PR exists, so issue numbers match §13.
3. The PR for #1, the skeleton: a fuller README, CONTRIBUTING, CLAUDE.md, LICENSE, CODEOWNERS, templates, `.gitignore`, `.gitattributes` (`*.thy text eol=lf`), `.isabelle-version`, `deps.lock`, `.claude/settings.json`, `.mcp.json.example`, `thys/ROOTS` and `thys/Smoke/`, ADR-0001 to ADR-0005, and `contracts/README`. Merged by T+0:40.
4. Owners open draft PRs from the `proto/*` branches (table below). Always `git add <paths>` or `git checkout <branch> -- <paths>`, never `git add -A`.
5. Merge the PR for #2 (CI). Run `workflow_dispatch` on `main` once to seed the caches. **Only then** apply the ruleset: a required `ci-ok` that has never reported would block every PR. Run these in your own terminal (`.claude/settings.json` denies `gh api` to Claude):
   ```
   gh api -X POST "repos/$R/rulesets" --input .github/ruleset-main.json
   gh repo edit "$R" --enable-squash-merge --enable-merge-commit=false \
     --enable-rebase-merge=false --delete-branch-on-merge --enable-auto-merge \
     --allow-update-branch=false
   ```
   The ruleset:
   - blocks deletion of `main` and force-pushes to it;
   - requires linear history and a PR;
   - allows squash merges only;
   - requires the `ci-ok` check, with "branch must be up to date" (strict mode) **off**;
   - sets **0** required approvals (the review norm below covers it);
   - lets the admin bypass through a PR only.

   `--allow-update-branch=false` removes GitHub's "Update branch" button, which would merge `main` into the branch.

**Branches:**
- `alex/<issue#>-<slug>`, `ark/<issue#>-<slug>`, `retinapeg/<issue#>-<slug>` for people;
- `agent/<node-slug>` for Claude, labelled `agent-generated`; the branch and its draft PR are the claim lock;
- `demo/<slug>` for planted demo PRs: always draft, labelled `do-not-merge`, and never a claim lock;
- `proto/*`: the four prototype branches, deleted by ark once every import has merged;
- `main` is the only long-lived branch.

**PR rules:**
- One concern per PR, at most about 300 changed lines (lockfiles and golden files excluded). Prototype imports (from `proto/*`, Alex's branches or ark's existing code) are exempt, but keep to one directory per PR where possible.
- Titles are `area: imperative`, with area one of `ci, thys, heavy, proofmap, beam, tools, vscode, contracts, docs`.
- **Open a draft PR within 30 minutes** of starting a task, so everyone can see what you are touching.
- At most 2 non-draft PRs open per person.
- **Never merge `main` into a branch.** Use `git fetch && git rebase origin/main`, and `git push --force-with-lease` to your own branch only. The "Update branch" button is disabled.
- **No stacked PRs:** squash merges break them. If one is unavoidable, rebase it after its base merges with `git rebase --onto origin/main <old-base-sha>`. CONTRIBUTING states both rules.
- The PR template asks for:
  - the issue number ("Closes #N");
  - whether it touches a contract (y/n);
  - `isabelle version` output;
  - whether it is agent-generated, and who launched the agent;
  - a screenshot for UI changes;
  - confirmation that no machine paths are committed.

**Review rule.** This is a norm written in CONTRIBUTING; the ruleset does not enforce it. `ci-ok` must be green in every case.

| PR touches | Who may merge |
|---|---|
| Only your own directory | You, at the next train. A teammate's 👀 is expected within one train but does not block. |
| Someone else's directory, `.github/`, `scripts/` | That directory's owner approves. If they are asleep for more than one train, any awake teammate may approve. |
| `contracts/`, or `statement-change` (lockfiles) | Every affected owner. **Statements always need Alex.** |
| `agent-generated` proofs under `thys/` or `heavy/` | The human who launched the agent, **only if** the map audit is green |
| `agent-generated` code (anything that is not a `.thy`) | A *different* human |
| ML or Scala written by ark | Alex reviews; this doubles as learning. ark reviews Python, TypeScript and CI for the others. |

Agents never merge: `.claude/settings.json` denies `gh pr merge`, `gh api` and pushes to `main` (§11).

**The ~45-minute train.** CI runs on every push and takes minutes. The 45 minutes is the rhythm for **integration**, not a cron job: a `*/45` cron fires at :00 and :45, not every 45 minutes.

Trains run at T+0:45, 1:30, 2:15, 3:00, and so on (wall-clock times in §0). Each is a huddle of at most 5 minutes; longer reviews get their own slot:
1. Each person gives one line: merged / ready / blocked.
2. Merge the cleared green PRs in order: contracts, then producers, then consumers.
3. The rotating captain runs `scripts/demo-smoke.sh` on the demo machine. Its v0 lands by Train 4 (#13); until then the captain checks that `main` is green.
4. **If `main` is red, stop the line.** The next train is fixes only. If a fix would take more than 15 minutes, use GitHub's **revert** button instead.
5. Everyone rebases their branches and says what they are claiming next.

CD: `cd-main.yml` republishes the `main-latest` pre-release after every green push to `main`.

**Getting existing work in without chaos.** Everything is triaged at Train 1 (T+0:45).

*The prototypes, already on `proto/*`.* The planning session pushed them with whitelisted files only. Owners open draft PRs from them once issues 1–20 exist:

| Branch | Contents | Draft PR for | Owner, and what to change |
|---|---|---|---|
| `proto/ci` | `.github/**`: `workflows/{ci,heavy,cd-main}.yml`, `actions/setup-isabelle/`, `ruleset-main.json` | #2 | ark. The files still say `hymanimy`: fix the repo name in the PR. Set the version to 2025-2, use the §9 path filters, and cut `ci.yml` down to `changes`, `lint`, `isabelle` (build only) and `ci-ok`. |
| `proto/proofmap` | `proofmap/isabelle/{DAG_Export.thy, ROOT.template}`, `proofmap/prototypes/{next_sorry.py, server_dag.py}`, `tools/tests/fixtures/ax/{ROOT, Ax_Audit.thy, axioms.txt}` (the axiom-audit fixture: built with an explicit `-d`, never under `thys/`) | #6 | ark. The golden C1 example for #3 is generated from the Demo export, with repo-relative paths and `Session.Theory.fact` IDs. |
| `proto/proofmap` | `thys/Demo/{ROOT, Top.thy, Basics.thy}` | #5 | Alex. Add `record_proofs = 1` and the §13 #5 cases. |
| `proto/beam` | `beam/ext/{etc/*, src/tool_run_at.scala, src/tool_find_theorems_at.scala}`, `beam/session/` (2025-2), `beam/session-2026/`, `beam/tests/{smoke.py, mcp_client.py}`, `beam/tests/thy/Demo.thy` (the Beam smoke theory, kept out of `thys/`) | #7 | retinapeg |
| `proto/docs` | `tools/prototypes/{hover_proto.py, isarref_index.py, docstat.py}` | #8 | retinapeg |

Each owner takes only their issue's paths onto a fresh branch, for example:

```bash
git fetch origin
git switch -c ark/6-proofmap origin/main
git checkout origin/proto/proofmap -- proofmap tools/tests/fixtures     # this issue's paths only
git commit -m "proofmap: import prototype" && git push -u origin HEAD
gh pr create -R "$R" --draft --base main --head ark/6-proofmap --title "proofmap: import prototype" --body "Closes #6"
```

*Alex's 3 local branches.* They have no history in common with our `main`. **Before this, the PR for #1 must be merged and Alex's invite accepted**; both fall in the 0:15–0:45 slot, so Alex rebases locally first and pushes once both are done. For each branch B:

```bash
git remote add canon "https://github.com/$R.git" && git fetch canon
git rebase --onto canon/main --root B       # replay onto main. During a rebase --ours is canon's version,
                                            # so in bootstrap-file conflicts: git checkout --ours <file>
git rev-list --objects canon/main..B \
  | git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' \
  | awk '$1=="blob" && $2>1000000'          # must print nothing: every pushed blob stays on GitHub for good
git push -u canon B:alex/<issue#>-<slug>
gh pr create -R "$R" --draft --base main --head alex/<issue#>-<slug> --fill
```

The size check walks the whole history, not just the tip: pushing uploads every historic blob, GitHub rejects files over 100 MB, and anything pushed stays. If the branches are stacked, note each branch's old tip, rebase the lowest first, and move the others with `git rebase --onto <new-lower> <old-lower-tip> B`.

If a branch is messy, start fresh instead: `git switch -c alex/<slug> canon/main`, then `git checkout B -- <paths>`, then commit once. At the train each draft is either:
- **kept**: split into PRs of at most 300 lines that fit the §7 layout;
- **parked**: labelled `parked`, left as a draft;
- **closed**: its content stays readable in the closed PR.

Branches never merge into each other.

*ark's existing code.* First check the §0 answer: if it is the `proto/*` prototypes, there is nothing more to import. Otherwise it goes up as draft `ark/0-initial-import` and is reviewed together for 20 minutes at **T+1:30–1:50, a separate slot after Train 2** (trains stay at 5 minutes). Then it is split by directory into small PRs, which Claude can do mechanically. ark may simply open the small PRs directly. No file is imported both from here and from `proto/*`.

*retinapeg's overnight research.* One docs-only PR to `docs/research/lean-isabelle-techniques.md`. Their fresh-install notes become `docs/pain-points.md`, scrubbed of phone numbers and chat excerpts. Each entry has: severity, OS, step, time lost, proposed fix, and a link to the issue.

---

## 9. CI design

| Workflow | Required? | Purpose | Target time |
|---|---|---|---|
| `ci.yml` → `ci-ok` | **The only required check** | `lint` (always); `isabelle`: one export build that also checks the theories, plus the map audit; `py`; `beam` smoke test; `vscode`. Each job arrives with the PR that adds its directory. | ≤ 3 min docs-only; ≤ 5 min warm; ≤ 8 min cold |
| `heavy.yml` | Never required | AFP and HOL-Analysis sessions (ζ(5), Apéry bridge, S4's Prime_Number_Theorem chain); the strict-status check on Apéry; export of AFP `Zeta_3_Irrational` as a check at scale; COULD: RC4 canary | ≤ 90 min |
| `cd-main.yml` | No | On a green `ci` run on `main`: replace the `main-latest` pre-release (vsix, dag.json; assets not built yet are skipped) | about 1 min |

`.github/workflows/ci.yml`, adapted from the CI scout's files (`proto/ci`). This is its shape once #9 has merged.
- **The PR for #2 ships only `changes`, `lint`, `isabelle` (build only) and `ci-ok`.** It builds the `thys/Smoke` session from #1, so it goes green on its own PR, and `main` stays green after it merges.
- Each later PR adds its job together with its directory, and appends the job to `ci-ok.needs`: `py` with #3, the export step with #6, `beam` with #7, `vscode` with #9.
- Jobs are also guarded on their inputs existing, through `hashFiles(...) != ''` in the `changes` job. `hashFiles` is not allowed in a job-level `if`, so the `changes` job passes the results on as outputs.
- `shared` is only `ci.yml` and the composite action, so a CODEOWNERS or PR-template edit stays a docs-only run.

```yaml
name: ci
on:
  pull_request:
    types: [opened, synchronize, reopened, labeled]   # labeled: adding `agent-generated` re-runs the agent lint
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pull-requests: read
concurrency:
  group: ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
jobs:
  changes:                                   # the PR for #2
    runs-on: ubuntu-24.04
    outputs:
      isa: ${{ steps.f.outputs.isa }}
      beam: ${{ steps.f.outputs.beam }}
      py: ${{ steps.f.outputs.py }}
      vscode: ${{ steps.f.outputs.vscode }}
      has_map: ${{ steps.has.outputs.map }}
      has_py: ${{ steps.has.outputs.py }}
      has_beam: ${{ steps.has.outputs.beam }}
      has_vscode: ${{ steps.has.outputs.vscode }}
    steps:
      - uses: actions/checkout@v7
      - id: f
        uses: dorny/paths-filter@v4
        with:
          filters: |
            shared: &shared ['.isabelle-version', 'deps.lock', '.github/workflows/ci.yml', '.github/actions/**']
            isa:    [*shared, 'thys/**', 'proofmap/**', 'tools/revamp/map/**', 'tools/revamp/cli.py', 'tools/pyproject.toml', 'tools/tests/fixtures/**', 'contracts/dag.schema.json']
            beam:   [*shared, 'beam/**', 'contracts/mcp-tools.json']
            py:     [*shared, 'tools/**', 'contracts/**']
            vscode: [*shared, 'vscode/**', 'contracts/**']
      - id: has                              # which job inputs exist yet (hashFiles is step-level only)
        run: |
          {
            echo "map=${{ hashFiles('proofmap/isabelle/DAG_Export.thy') != '' }}"
            echo "py=${{ hashFiles('tools/pyproject.toml') != '' }}"
            echo "beam=${{ hashFiles('beam/ext/etc/build.props') != '' }}"
            echo "vscode=${{ hashFiles('vscode/package-lock.json') != '' }}"
          } >> "$GITHUB_OUTPUT"

  lint:                                      # the PR for #2; always runs, under 1 min
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - run: scripts/ci/lint.sh
        env:                                 # passed via env, never interpolated into the script
          HEAD_REF: ${{ github.head_ref }}
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          AGENT_PR: ${{ startsWith(github.head_ref, 'agent/') || contains(github.event.pull_request.labels.*.name, 'agent-generated') }}
  # lint.sh, every PR:
  #  - conflict markers; actionlint 1.7.12; every .thy is ASCII-only
  #  - under thys/ and heavy/ (tools/tests/fixtures/ is excluded): no `axiomatization`; no `oracle` in
  #    command position (the word in prose or comments is fine); no `Thm.add_axiom` / `add_oracle`;
  #    no `keywords` in theory headers ("no Isar syntax change"); theory base names unique across both
  #  - if AGENT_PR (branch agent/* OR label agent-generated): the diff may not add `sorry`, `\<proof>`,
  #    `oops`, `axiomatization`, `oracle`, any ML command (`ML`, `ML_val`, `ML_prf`, `ML_command`,
  #    `ML_file`, ...), `setup`, `declaration`, `*_setup`, the `tactic` / `raw_tactic` methods or
  #    `quick_and_dirty`, nor touch statements.lock, axioms.allow, blueprint.yaml, ROOT, ROOTS,
  #    contracts/, .github/ or .claude/

  isabelle:                                  # the PR for #2 (build only); the PR for #6 makes the export the build
    needs: changes
    if: needs.changes.outputs.isa == 'true' || github.event_name != 'pull_request'
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup-isabelle
        with:
          save-cache: ${{ github.event_name != 'pull_request' && github.ref == 'refs/heads/main' }}
      - if: needs.changes.outputs.has_map != 'true'      # before #6: build every session listed in thys/ROOTS
        run: isabelle build -v -D thys                    # parent = HOL, prebuilt in the bundle: no heap cache needed
      - if: needs.changes.outputs.has_map == 'true'      # from #6: no separate build step; the export build checks everything
        run: |
          python3 -m venv .venv && . .venv/bin/activate && pip install -e 'tools[dev]'
          mapfile -t S < <(grep -Ev '^[[:space:]]*(#|$)' thys/ROOTS)    # directory name = session name
          revamp map export -d thys "${S[@]}" -o out/    # ONE wrapper session: parent HOL, `sessions` = S
          revamp map audit out/ --locks thys --summary "$GITHUB_STEP_SUMMARY"
          pytest -q -m isabelle tools/tests              # tools/tests/fixtures/ (planted axiom, mixed sorry, laundering), explicit -d
      - if: always()
        uses: actions/upload-artifact@v7
        with:
          name: proofmap
          path: out/
          retention-days: 7
          if-no-files-found: ignore

  py:                                        # added by the PR for #3 (tools/ skeleton)
    needs: changes
    if: needs.changes.outputs.has_py == 'true' && (needs.changes.outputs.py == 'true' || github.event_name != 'pull_request')
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - run: |                               # Ubuntu 24.04 system Python is externally managed: always use a venv
          python3 -m venv .venv && . .venv/bin/activate
          pip install -e 'tools[dev]' && ruff check tools && pytest -q -m 'not isabelle' tools/tests
          python -m revamp.contracts validate contracts/examples

  beam:                                      # added by the PR for #7
    needs: changes
    if: needs.changes.outputs.has_beam == 'true' && (needs.changes.outputs.beam == 'true' || github.event_name != 'pull_request')
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup-isabelle
      - run: beam/ci/pide-mcp.sh             # clone the PIDE MCP SHA from deps.lock; components -u (repo + tool_extensions)
      - run: isabelle components -u "$GITHUB_WORKSPACE/beam/ext" && isabelle scala_build
      - run: python3 beam/tests/smoke.py --dir beam/session --logic HOL_Beam --theory beam/tests/thy/Demo.thy

  vscode:                                    # added by the PR for #9
    needs: changes
    if: needs.changes.outputs.has_vscode == 'true' && (needs.changes.outputs.vscode == 'true' || github.event_name != 'pull_request')
    runs-on: ubuntu-24.04
    defaults:
      run:
        working-directory: vscode
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: vscode/package-lock.json
      - run: npm ci && npx tsc -p . --noEmit && npx eslint .   # typescript ~6.0.3; tsconfig types: [node, mocha]
      - run: npm run bundle                                     # esbuild: src/extension.ts -> dist/extension.js (= main), plus the webview
      - run: xvfb-run -a npx vscode-test                        # .vscode-test.mjs sets a short --user-data-dir
      - run: npx vsce package --no-dependencies --skip-license --allow-missing-repository -o "revamp-${GITHUB_SHA::7}.vsix"
      - uses: actions/upload-artifact@v7
        with:
          name: vsix
          path: vscode/*.vsix
          retention-days: 7

  ci-ok:                                     # never rename; never add a second job with this name
    if: always()
    needs: [changes, lint, isabelle, py, beam, vscode]   # the PR for #2 starts with [changes, lint, isabelle]
    runs-on: ubuntu-24.04
    steps:
      - env:
          BAD: ${{ contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled') }}
        run: test "$BAD" = "false"
```

`vsce package` runs unattended only because of `--skip-license --allow-missing-repository` (otherwise it stops at a y/N prompt), and `--no-dependencies` works only because the extension host code is bundled. `package.json` must also have a `publisher` field (#9).

`.github/actions/setup-isabelle/action.yml` (key steps):

```yaml
name: setup-isabelle
description: Restore or download the Isabelle version in .isabelle-version and put it on PATH
inputs:
  save-cache:
    default: 'false'
runs:
  using: composite
  steps:
    - id: ver
      shell: bash
      run: |
        v=$(tr -d '[:space:]' < .isabelle-version)
        echo "v=$v" >> "$GITHUB_OUTPUT"
    - id: cache
      uses: actions/cache/restore@v6
      with:
        path: ~/isabelle-dist/${{ steps.ver.outputs.v }}
        key: isabelle-dist-${{ runner.os }}-${{ runner.arch }}-${{ steps.ver.outputs.v }}
    - if: steps.cache.outputs.cache-hit != 'true'
      shell: bash
      env:
        V: ${{ steps.ver.outputs.v }}
      run: |                  # never use isabelle.in.tum.de/dist/... (it 301-redirects to http and curl stalls)
        mkdir -p ~/isabelle-dist
        for u in "https://dist.isabelle.cit.tum.de/dist/${V}_linux.tar.gz?token=Isabelle" \
                 "https://isabelle.in.tum.de/website-${V}/dist/${V}_linux.tar.gz" \
                 "https://www.cl.cam.ac.uk/research/hvg/Isabelle/dist/${V}_linux.tar.gz"; do
          curl -fL --retry 3 -o "$RUNNER_TEMP/isa.tgz" "$u" && break
        done
        tar -xzf "$RUNNER_TEMP/isa.tgz" -C ~/isabelle-dist
        ls ~/isabelle-dist/"$V"/heaps/*/HOL      # fail loudly if the prebuilt HOL heap is missing
    - if: inputs.save-cache == 'true' && steps.cache.outputs.cache-hit != 'true'
      uses: actions/cache/save@v6
      with:
        path: ~/isabelle-dist/${{ steps.ver.outputs.v }}
        key: isabelle-dist-${{ runner.os }}-${{ runner.arch }}-${{ steps.ver.outputs.v }}
    - shell: bash
      run: echo "$HOME/isabelle-dist/$(tr -d '[:space:]' < .isabelle-version)/bin" >> "$GITHUB_PATH"
```

**`heavy.yml`:**
- Triggers: the `full-ci` label, push to `main`, `workflow_dispatch`, and cron `17 */3 * * *`.
- Fetches the **pinned** AFP tarball named in `deps.lock`, never `afp-current` (which is regenerated daily). It checks the tarball against `afp_sha256` in `deps.lock` and keeps it in `actions/cache`.
- Uses a heap cache keyed `heaps-<isa>-<afp>-hash(heavy/**/ROOT)`, saved from `main` only. These heaps are Linux x86_64 only: they cannot be copied to the Macs, which build their own (S4).
- Runs `isabelle build -b -R -d $AFP/thys -D heavy` (ancestor heaps) and then the sessions themselves. This also validates S4's Prime_Number_Theorem chain.
- It lands with the PR for #2 but, like `ci.yml`, skips every step whose input does not exist yet (`hashFiles` in a step `if`). Until #15 adds `heavy/`, it builds only S4's chain (`isabelle build -b -d $AFP/thys Prime_Number_Theorem`), and the strict-status check waits for `thys/Apery`. So a missing directory never turns `main` red.
- **Strict Apéry** is a status check, not a build option. Session ROOT options take precedence over `build -o`, so `-o quick_and_dirty=false` would do nothing. Instead `revamp map status` must report Apéry's main theorem as `fully_proved`.
- Timeout 90 min.

**Gotchas:**
- Pin `ubuntu-24.04`.
- Caches saved from a PR cannot be shared, so save caches only from `main`.
- If an action major version breaks, drop back one major.
- If Docker is ever needed: `makarius/isabelle:Isabelle2025-2` with `--user root`, plus `docker/login-action`.

---

## 10. Workstreams and how they interlock

| Workstream | Owner (backup) | Delivers | Isabelle depth needed |
|---|---|---|---|
| **WS-0 Repo, CI** | ark (retinapeg) | bootstrap (§0), `ci`/`heavy`/`cd`, ruleset, `.claude/settings.json`, demo machine, acceptance of `setup.sh` on a clean VM | low |
| **WS-M ProofMap and editor** | ark (Alex) | `DAG_Export` port and classifier fix, `revamp map` (export, next, check, lock, audit), hover extension, ProofMap viewer, (SHOULD) Isar outline | medium; Alex reviews the ML |
| **WS-A Agent endpoints, natural language, onboarding** | **retinapeg** (ark) | Beam (`run_at`, `find_theorems_at`, `Beam_<Parent>`), `revamp` MCP server, SKILL.md, `run_holes.sh`, docs index and `data/isar-ref.jsonl`, `docs_lookup`/`docs_search` for physicists and mathematicians, `pain-points.md`, #13 `setup.sh`/`doctor.sh`/`demo-smoke.sh` | medium |
| **WS-X Maths, design, pitch** | Alex (ark) | Demo fixture, Apéry statements and proofs (driving agents), ζ(5) skeleton, `docs/design/ui.md`, demo script, the planted demo PR and replay snapshots, slide claims, review of every statement | high |

**How the workstreams connect** (every connection is a contract, so nobody waits on anybody else):

```
Alex: thys/*.thy + blueprint.yaml + statements.lock + axioms.allow ─► ark: revamp map export ─► dag.json (C1, nl optional)
         │                                                   ├─► ark: viewer (consumes C1 examples first)
         │                                                   └─► retinapeg: revamp MCP next_holes/verify (C4)
         └──► retinapeg: docs index ─► docs.jsonl (C2) + data/isar-ref.jsonl ─► ark: hover   ·   retinapeg: docs_lookup/search
retinapeg: Beam run_at (C4) ─► SKILL.md agent loop ─► PRs ─► ark: CI gate ─► Alex: review statements/merge
```

**If there turn out to be only 2 people** (if `retinapeg` is ark's second account):
- ark keeps WS-0 and WS-M, and #13 comes back to him;
- Alex takes the docs index;
- WS-A shrinks to Beam plus the `revamp` MCP server;
- hover drops to the lexical version only, and the outline moves below the cut line.

---

## 11. How we use AI: policy (ADR-0005)

**Alex's question:** let Claude do everything on its own, or ask it for a plan and do parts with its help?

**Answer: neither extreme.** Claude writes almost all of the code, and writes it fast, but always against contracts and acceptance criteria that humans wrote. Humans decide *what*; Claude decides *how*; humans do the integrating.

The evidence:
- In the Fermat's Last Theorem run, unstructured multi-agent attempts "lost track of the project's state". The run succeeded once agents worked inside a dependency graph shaped by humans, with occasional high-level steering.
- Romik's Lean proof of ζ(5) was likewise "directed by" a human.
- In 24 hours the bottleneck is integration decisions and review, not typing.

| Work | Mode | Human role | Gate |
|---|---|---|---|
| Filling `sorry` leaves in `thys/` and `heavy/` | **Autonomous and parallel:** one hole, one worktree, one PR | The human who launched the agent merges it | kernel batch build + `revamp map audit` + agent lint |
| Prototype ports, CI YAML, schema validators, scaffolds, tests, splitting import PRs | **Plan first:** Claude posts a plan on the issue, a human approves it in ≤ 5 min, then Claude implements a small PR | reviews the PR | `ci-ok` + golden tests |
| UI code | Plan first, then Claude implements | **Alex signs off the look** from screenshots (light and dark) | `ci-ok` |
| Theorem statements, definitions, `blueprint.yaml`, `statements.lock`, `axioms.allow` | **Led by humans.** Claude acts as typist and suggester only. | Alex owns them | `statement-change` label + Alex's approval |
| Contracts, ruleset, `.github/`, `.claude/settings.json`, version pins, CLAUDE.md and SKILL.md | Led by humans | all affected owners | — |
| Merge order, demo script, the claims on slides | Humans only | — | — |

**Guardrails** (§11A has the full design):
- **Agent count:** k ≤ 1 live agent on a 16 GB machine, with `export --watch` paused while `verify` runs; k ≤ 3 on 32 GB. Parallel waves run only on ≥ 32 GB. The budget: the editor's own prover (about 2.2 GB), one prover per agent (about 2.2 GB each), each `verify` or watch batch build (2–4 GB, Poly/ML plus JVM), VS Code and Claude Code. `verify` builds with `-o threads=2`.
- **Per-hole cap:** 20 minutes wall time and a fixed maximum number of turns per hole. Then the hole is labelled `needs-human`.
- **Two strikes:** two gate failures on the same hole also hand it to a human.
- **No laundering:** `verify` rejects a proof that adds holes to the node's `rests_on_holes` or does not lower the session's `sorry` count.
- **No self-merge:** `.claude/settings.json` (committed in the PR for #1) denies `Bash(gh pr merge:*)`, `Bash(gh api:*)` and `Bash(git push origin main*)`. `run_holes.sh` passes the same rules as `--disallowedTools`, and SKILL.md states the rule.
- **Isolation:** one worktree, one `.mcp.json` and one Isabelle home per agent (§6.1 `claim`). `HOME=<wt>/.isahome` is for the Isabelle subprocesses only: it goes in the `env` of the worktree's `isabelle-beam` server and of the Isabelle builds that `verify` starts. Claude Code, the `revamp` server, `git` and `gh` keep the real `HOME`, where their config and logins live. The §11A sketch follows this rule.
- **Kill switch:** stop `run_holes.sh`, then close the `agent/*` PRs.
- **Tagging:** every agent PR is labelled `agent-generated`.

**SKILL.md rules:**
- Try candidates with `run_at` before editing, and write only the winner.
- On a one-line stub (`have "…" sorry`), pass `prefix`, the line up to `sorry`, to `run_at`.
- Write ASCII `\<…>` escapes only.
- Never edit a statement, a ROOT file, a lockfile or `axioms.allow`.
- Never use `sorry`, `\<proof>`, `oops`, ML commands, `tactic`/`raw_tactic`, `axiomatization` or `oracle`.
- Never close a hole by citing another `sorry`'d lemma; `verify` rejects it.
- Never merge, never call `gh api`, never push to `main`.
- One hole per PR. A new top-level lemma is never added; it goes into the PR body as a sketch (§11A).

---

## 11A. Agent architecture: brain, perception, action

The agent work is designed around one question: *what does the agent need to perceive, what actions may it take, and how does the brain choose between them?* This section is the design for WS-A (retinapeg) and for the agent policy in §11.

### Pattern

We use an **orchestrator plus a pool of workers over a shared knowledge graph**. The knowledge graph is the ProofMap (C1). We do *not* use peer-to-peer agent chat.

The Fermat's Last Theorem run with Prove2Me showed why. Unstructured groups of agents lose track of the project's state. A DAG of fixed statements gives each worker a small, well-defined job, and gives the orchestrator a global picture.

```
                   ┌───────────────────────────────────────────────┐
                   │ ORCHESTRATOR (agents/run_holes.sh + a human)  │
                   │ reads map_status / next_holes, assigns holes, │
                   │ enforces caps, labels needs-human             │
                   └───────────────┬───────────────────────────────┘
                     one hole each │ (claim = draft PR = lock)
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │ WORKER 1    │          │ WORKER 2    │   ...    │ WORKER k    │  k ≤ 1 @16 GB, ≤ 3 @32 GB
   │ Claude Code │          │ Claude Code │          │ Claude Code │  (headless, own worktree,
   │ + own prover│          │ + own prover│          │ + own prover│   own ISABELLE_HOME_USER)
   └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
          └──────── PRs ───────────┴──────────────┬─────────┘
                                                  ▼
                         CI: kernel batch build + map audit + agent lint
                                                  ▼
                                  human merge (Alex for statements)
```

### The three capabilities

| Capability | In this project |
|---|---|
| **Brain** | One Claude Code session per hole, run headless (`claude -p`) by `run_holes.sh` with a fixed prompt and SKILL.md. The orchestrator stays simple and deterministic: a shell script plus a human, not an LLM. |
| **Perception** | `node_context` (statement, natural-language description, statements of its dependencies, its dependents). `get_state` (the goal at a line). `run_at` verdicts and error messages. `find_theorems_at`. `docs_lookup` and `docs_search`. `map_status`. Proofs of already-proved sibling nodes, used as worked examples. |
| **Action** | Ranked by risk. **Read-only, unlimited:** `run_at`, `find_theorems_at`, `get_state`, the docs tools. **Write, contained to the worktree:** editing the hole's proof body. **Gated:** `verify`, then opening a PR. **Forbidden to agents:** merging, pushing to `main`, editing statements, ROOT files, lockfiles, contracts or CI. These rules are enforced by `.claude/settings.json` deny rules, the agent lint and CI. |

### The worker loop (ReAct)

Every iteration is **Thought → Action → Observation**, and every observation comes from the prover, never from the model's own belief.

```
claim(id) ─► node_context(id) ─► retrieve premises (see "Retrieval" below)
   │
   ▼
loop r = 1..R (R = 4 rounds):
   Thought:     read the goal and errors; choose a strategy
                (simp/auto with premises, induction, an Isar skeleton, a calculation)
   Action:      run_at(origin, line, candidates[≤16])      # speculative, file untouched
   Observation: verdicts per candidate
   ├─ some verdict == proved     ─► write the winner ─► verify(id)
   │                                  ├─ ok   ─► open a PR (agent-generated) ─► STOP
   │                                  └─ fail ─► record a strike; next round
   ├─ goals_left on a candidate  ─► refine from that partial state (Isar `have` steps)
   └─ all error or timeout       ─► sledgehammer at the line; fold its lemmas into the next round
after R rounds, or 20 min, or 2 strikes ─► label needs-human, post a summary of attempts ─► STOP
```

**Decomposition** follows Prove2Me's "sketch" idea. A worker may break a hard hole into `have` steps *inside* its own proof; that is ordinary proof text and needs no approval. If it believes a new **top-level** lemma is needed, it must **not** add one. It writes the proposed statement into the PR body as a sketch, and Alex decides whether it becomes a node: humans audit a small core of statements, agents fill in proofs.

### Retrieval: hybrid search for premises (GraphRAG over the ProofMap)

What a prover agent perceives matters as much as how it reasons. Premise selection is a retrieval problem, and we treat it like a RAG pipeline:

1. **Query transformation.** The query is the goal at the hole, plus the node's natural-language description. A HyDE-style step (the model drafts a likely proof sketch first) gives extra query terms such as constant names and lemma-name fragments.
2. **Hybrid retrieval with reciprocal-rank fusion (RRF).** We fuse several rankings rather than relying on one:
   - **Structural, exact:** `find_theorems_at` patterns on the goal's head constants. This is Isabelle's equivalent of keyword search and is the most precise.
   - **Lexical:** `docs_search`, BM25 over statements plus documentation in `docs.jsonl`.
   - **Dense** (stretch, after the cut line): embeddings of statement plus description over HOL and the pinned AFP.
   - **The prover's own relevance filter:** Sledgehammer's MePo/MaSh. It comes free and acts as the reranker.
3. **Graph context.** We walk the ProofMap from the hole to its declared and actual dependencies, include their statements, and include the proofs of 1–2 already-proved siblings in the same theory as worked examples. This uses relationships between theorems, which plain text similarity does not.
4. **Context budget.** At most about 30 premises and 2 example proofs per worker, with the most relevant first.

The **natural-language system for physicists and mathematicians** (retinapeg) reuses the same retrieval stack:
- A question in plain language goes through hybrid retrieval over `docs.jsonl`. The answer cites Isabelle facts by name, with statement and file:line.
- "Explain this node" uses `node_context`.
- "Formalise this sentence" produces a **draft** statement, which can only enter the repo through a `statement-change` PR approved by a human.
- Natural-language output never becomes a statement automatically.

### Evaluation: does the agent actually work?

| Level | Measure | How |
|---|---|---|
| End to end | Holes closed (pass@1, pass@k), minutes per hole, tokens per hole | **Held-out set:** re-open 10 already-proved Demo and Apéry lemmas as `sorry` on a scratch branch and run a wave. Report it in `docs/agent-eval.md`. |
| Retrieval | Recall@10 of the premises the reference proof actually used | The reference premises come from `Thm_Deps` on the original proof, a free source of labelled data. |
| Tool use | Share of attempts that used `run_at` before editing; share of edits that passed `verify` the first time | Parsed from the agent logs |
| Safety | Cheats caught by the lint or audit (should equal cheats attempted); holes laundered (should be 0) | The CI audit, plus the planted-cheat and statement-weakening fixtures |
| Regression | The same held-out set, re-run | Run locally after any change to Beam, the `revamp` MCP server or SKILL.md. Kept out of the required check because it costs tokens. |

### Guardrails and circuit breakers

- **The kernel is the final judge.** `run_at` verdicts are advice. Only a batch build plus `revamp map audit` accepts a proof.
- **The statement is fixed:** `statements.lock` with its hash, and an audit that also catches weakened statements.
- **Hole laundering is blocked:** `verify` requires the node's set of remaining holes not to grow and the session's total `sorry` count to fall strictly.
- **No cheats:** the agent lint bans `sorry`, `\<proof>`, `oops`, `axiomatization`, `oracle`, all `ML*` commands, `setup`/`declaration` and `tactic`/`raw_tactic` in agent diffs. Axioms are checked against an `axioms.allow` list.
- **Circuit breakers:** 20 minutes of wall time per hole, a turn cap, two strikes, then `needs-human`. The kill switch is to stop `run_holes.sh` and close the `agent/*` PRs.
- **Isolation:** one worktree, one Isabelle user home and one prover per worker, with a RAM cap on the number of workers.
- **Permissions:** `.claude/settings.json` denies `gh pr merge`, `gh api` and pushes to `main`. Agents cannot merge their own work.

### Observability

- Every tool call is appended to `out/agent-logs/<hole>.jsonl`: tool, argument hash, verdict, `elapsed_ms`, and tokens where available.
- `run_holes.sh` writes a summary table into each PR body: rounds, candidates tried, the winning tactic, time and tokens.
- Each wave reports holes attempted, closed and escalated, plus total tokens, so the Claude budget agreed at kickoff is tracked. Some quota is always kept back for the live demo.
- Stretch: the ProofMap viewer shows an "attempts" badge on each node, read from the logs.

### Sketch of the orchestrator (`agents/run_holes.sh`, retinapeg)

```bash
#!/usr/bin/env bash
# Usage: agents/run_holes.sh <target-node-id> <k-workers>
set -euo pipefail
target="$1"; k="${2:-1}"
revamp map export -d thys "$(revamp session-of "$target")" -o out/      # fresh ProofMap
mapfile -t holes < <(revamp map next "$target" --k "$k" --ids-only)     # ranked open leaves
for id in "${holes[@]}"; do
  wt=$(revamp claim "$id" --json | jq -r .worktree) || continue          # draft PR = lock
  # Per-agent Isabelle home is set ONLY in the isabelle-beam entry of $wt/.mcp.json (written by claim),
  # so git, gh and Claude Code keep the user's normal HOME and logins.
  ( cd "$wt" && timeout 20m \
      claude -p "$(sed "s/{{ID}}/$id/" agents/prompt.md)" \
        --mcp-config .mcp.json \
        --disallowedTools "Bash(gh pr merge:*)" "Bash(gh api:*)" "Bash(git push origin main*)" \
      > "out/agent-logs/$id.transcript" 2>&1 \
    || gh pr edit "$(revamp pr-of "$id")" --add-label needs-human ) &
done
wait
revamp map export -d thys "$(revamp session-of "$target")" -o out/ && revamp map status "$target"
```

`agents/prompt.md` holds the per-hole instructions: the ReAct loop above, the retrieval steps, the stop rules, and "never edit the statement".

---

## 12. 24-hour timeline

**Spikes run T+0:45 to T+3:00. Go/no-go is at Train 4 (T+3:00), and fallbacks taken are recorded in ADR-0006.**

| Spike | Owner | Pass | Fallback, decided now |
|---|---|---|---|
| S0 install on all 3 machines | everyone, starting T+0:00 | `isabelle version` = Isabelle2025-2; checking HOL triggers no rebuild; the §0 per-machine checklist is posted on #1 | A machine under 16 GB does headless and CI work only. Share the tarball by USB. Use a Codespace or VM. |
| S1 Isabelle in CI | ark | `ci-ok` green on the PR for #2 itself; warm run ≤ 5 min | Container job on `makarius/isabelle:Isabelle2025-2` |
| S2 editor | retinapeg, on the demo machine | Marketplace yfprojects on 2025-2 with `isabelle.home` set explicitly: symbols render, goals show, saving `∀` writes `\<forall>` | jEdit for the editing shots; our tools don't depend on the editor |
| S3 Beam on 2025-2 | retinapeg | compiles; a failing `by blast` gives `error`; a loop gives `timeout`; md5 unchanged | PIDE MCP's own `get_state` and `sledgehammer`, plus edit-then-check (slower, but sound) |
| S4 AFP heaps | Alex starts it in the background at T+0:15 on the machine that will do the ζ(5) work (§0), with `threads` at about half its cores | the Prime_Number_Theorem chain (through Zeta_Function and HOL-Analysis/Complex_Analysis; peaks around 5 GB plus the JVM) builds locally in ≤ 60 min, and `heavy.yml` builds it too. Heaps are architecture-specific, so CI heaps cannot replace the local build on a Mac. | ζ(5) skeleton stated over HOL-Analysis `suminf`, with a red bridge node |
| S5 export at scale (after S4) | ark | AFP `Zeta_3_Irrational`: 99 facts `fully_proved` in ≤ 2 min. Save-to-green measured with the single export build: on Demo now, on Apéry in #10 (target ≤ 30 s). | Export our own sessions only; memoise by theorem serial. If save-to-green is over 30 s, the demo script says so and shows a replay snapshot. |
| S6 hover definition lookup | retinapeg, on the demo machine | `executeDefinitionProvider` on `geometric_sums` returns a location under `$ISABELLE_HOME/src`. **Plus a 10-minute check:** the ASCII marker `\<^marker>\<open>description \<open>…\<close>\<close>` in the Demo fixture is accepted by Isabelle and read by the C2 parser. | Look up the name in the index. If the marker is rejected, drop doc source 1 (§6.3). |

**Rest blocks (staggered, so at least 2 people are always awake):**
- retinapeg: T+9:15–12:15 (after M2)
- ark: T+14:30–17:30
- Alex: T+17:30–20:30

All three are awake for the dry run (T+12:30), the cut line (T+14) and the rehearsals, and the Beam and MCP owner is awake from T+18 to T+21.

| T+ | Alex | ark | retinapeg | Gate / milestone |
|---|---|---|---|---|
| 0:00–0:15 | Kickoff: the §0 checklist, D1–D3, ADRs, roles. **Everyone starts the Isabelle2025-2 download.** | | | |
| 0:15–0:45 | Archive his repo; start S4 on the ζ(5) machine; rebase his 3 branches locally, and push them as drafts once the PR for #1 is merged and his invite accepted | D2 rename, make public, invite; issues 1–20 and labels; the PR for #1 merged by 0:40; draft PRs from `proto/ci` and `proto/proofmap` | Accept the invite; draft PRs from `proto/beam` and `proto/docs`; fresh install following the official Isabelle installation instructions (our README is not merged yet), timing every step | **Train 1:** triage drafts, assign #1–#12 |
| 0:45–2:15 | #5 Demo fixture (from `proto/proofmap`); draft C3; `ui.md` v0 | The PR for #2, CI (S1); the PR for #3 (`tools/` skeleton and the `py` job); draft C1 and the `revamp` part of C4; 1:30–1:50 review slot for existing code, if any (§8) | S2, S3; draft C2 and the `isabelle-beam` part of C4 | **Train 2 (1:30).** **Train 3 (2:15): C1–C3 frozen (#3)** |
| 2:15–3:00 | Review the contracts | Ruleset applied; caches seeded | S6 with the 10-minute marker check; `demo-smoke.sh` v0 (#13); finish C4 | **Train 4 (3:00): GO/NO-GO; C4 frozen** |
| 3:00–5:15 | #11 Apéry statements B1–B12 (`sorry` on its own line), `statements.lock`, `axioms.allow` | #6 export: the 15-minute `record_proofs` spike, classifier fix, audit, `Session.Theory.fact` IDs | #7 Beam in the repo and CI, with `ROOT.template`; #8 docs index and `data/isar-ref.jsonl` | **M1 (5:15): vertical slice on `main`.** Demo → `dag.json` (CI artifact); `run_at` works from Claude Code; `revamp docs index` writes `docs.jsonl` |
| 5:15–9:00 | Drive agents on Apéry leaves (one at a time on 16 GB); review | #9 hover; #10 viewer | #12 `revamp` MCP and SKILL.md; #14 agent runner | **M2 (9:00): agent loop end to end, hover card and viewer**; at least 4 Apéry nodes green |
| 9:00–12:30 | Apéry proofs; ζ(5) definitions written by a human; launch the overnight wave (parallel only on a ≥ 32 GB machine) | Hover and viewer polish; review agent-written code | Hand-off 9:00–9:15, then **asleep 9:15–12:15** | **Dry run (12:30)** of all of §2 |
| 12:30–14:00 | Review agent waves; ζ(5) statements; the planted demo PR (#16) | Cut-line fixes only; accept `setup.sh` v0 on a clean VM | #13 `setup.sh` v0 by 13:30; cut-line fixes | **CUT LINE (14:00): full run on `main`, tag `demo-v1`, video v0** |
| 14:00–18:00 | ζ(5) leaves with agents; demo script; replay snapshots (#16) (asleep from 17:30) | (asleep 14:30–17:30) | SHOULD list: full `setup.sh` and `doctor.sh`, `docs_search`, the outline (new files under `vscode/src/outline/` only, ark approves); pain points turned into issues | **FEATURE FREEZE (18:00).** Later merges must be additive and behind a setting (`revamp.outline.enabled`, …). |
| 18:00–21:00 | (asleep until 20:30) | Set up the demo machine from `main-latest`; record the fallback video at 19:30 | Set up a backup machine from `main-latest`; fix what the video run finds | |
| 21:00–24:00 | Rehearsals at 21:00 and 22:30; claims check; pitch | Owns the demo machine; tag `demo-final` | Backup operator; stages the golden hole | Demo at T+24 |

**36-hour variant:** the cut line moves to T+22, the freeze to T+28, and rehearsals to T+31 and T+33. The extra hours go to more green ζ(5) nodes, the Isar outline and "Read as paper", and the RC4 canary.

**Demo-safe rule:** `demo-v1` on its own must be able to give the whole §2 demo using Apéry alone. If anything merged later breaks, turn its setting off or demo from the tag.

---

## 13. The first 12 issues

These are created as GitHub issues 1–20, in this order, right after commit 0 and before any PR (§0), so the numbers below are the real issue numbers. PRs start at #21 and say "Closes #N".

1. **Bootstrap and canonical repo** (ark)
   - Commit 0 (`PLAN.md` and `README.md`, pushed by the planning session) is on `main`, and the four `proto/*` branches exist.
   - Issues 1–20 exist with numbers matching this list, and so do the labels `agent-generated`, `statement-change`, `contract-change`, `parked`, `needs-human`, `full-ci` and `do-not-merge`.
   - The PR for #1 with the §8 skeleton is merged. It includes `.claude/settings.json` (denying `Bash(gh pr merge:*)`, `Bash(gh api:*)` and `Bash(git push origin main*)`), `.gitattributes` (`*.thy text eol=lf`), and `thys/ROOTS` with a tiny `thys/Smoke/` session.
   - The repo is renamed (or the decision not to is recorded in ADR-0001) and public. Both teammates have accepted their invites and posted their handle and the §0 per-machine checklist on #1.
   - The `hymanimy/isabelle-revamp` README points here, and that repo is archived.
   - `--allow-update-branch=false` is set.
   - Nothing large was ever pushed: `git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' | awk '$1=="blob" && $2>1000000'` and `git ls-files | grep -E '\.(vsix|db|jar)$|heaps/'` both print nothing.
2. **CI gate, setup-isabelle, ruleset** (ark; from `proto/ci`)
   - The PR for #2 has only the `changes`, `lint`, `isabelle` (build only, sessions from `thys/ROOTS`) and `ci-ok` jobs, plus `setup-isabelle`, `heavy.yml`, `cd-main.yml` and `ruleset-main.json` with the repo name fixed (no `hymanimy` left). It is green on its own PR, and `main` stays green after it merges.
   - actionlint is clean.
   - A docs-only PR, including a CODEOWNERS or PR-template edit, reaches `ci-ok` in ≤ 3 min. A `thys/` PR takes ≤ 5 min warm and ≤ 8 min cold.
   - CI turns red for each of: a broken theory; a `.thy` with non-ASCII bytes; `keywords` in a theory header; `axiomatization` under `thys/`; `oracle` in command position (but not the word in a `text` block); a second theory with an existing base name.
   - **Agent lint, in place before M2.** On a PR from `agent/*` or labelled `agent-generated` (adding the label re-runs it), CI turns red for an added `sorry`, `\<proof>`, `oops`, `ML`, `ML_val`, `ML_prf`, `ML_command`, `setup`, `declaration`, `tactic`/`raw_tactic` or `quick_and_dirty`, and for any change to `statements.lock`, `axioms.allow`, a ROOT file, `contracts/`, `.github/` or `.claude/`.
   - The cache `isabelle-dist-Linux-X64-Isabelle2025-2` exists after one `workflow_dispatch` on `main`.
   - The ruleset is active: a direct push to `main` is rejected, only squash merge is offered, head branches are deleted after merge, and "Update branch" is not offered.
3. **Contracts v1 and the `tools/` skeleton** (ark leads; all three approve)
   - C1–C4 schemas and golden examples are in `contracts/`, with `schema_version: 1`. The C1 example is generated from the Demo export, with repo-relative paths and `Session.Theory.fact` IDs. `nl` is optional in C1 v1.
   - The `tools/` skeleton: `pyproject.toml` with every dependency both owners need; the plugin-style CLI (`revamp/cli.py` only discovers `revamp.map.cli` and `revamp.docs.cli`); and the `revamp.contracts` validator.
   - This PR adds the `py` CI job, which validates the examples.
   - C1–C3 are frozen at T+2:15; C4 at T+3:00, after the S3 go/no-go.
4. **Toolchain on 3 machines and the pain-points log** (retinapeg; everyone takes part)
   - Each machine reports the §0 checklist, `isabelle version`, and the time for the HOL no-op build.
   - The demo machine was chosen in the first hour, and S2's checklist passes on it.
   - `docs/pain-points.md` has at least 10 entries, each with severity, OS, step, time lost, fix and an issue link, and no phone numbers or chat excerpts.
5. **Demo fixture `thys/Demo`** (Alex; from `proto/proofmap`)
   - Parent is HOL, with `options [quick_and_dirty, record_proofs = 1]`.
   - It contains:
     - a plain `sorry`;
     - an inner `have … sorry`;
     - a lemma that rests only on a hole;
     - **a lemma with its own `sorry` that also uses a sorry'd lemma** (the classifier regression case);
     - a hole written as `\<proof>`;
     - the word `sorry` inside a `text` block and inside a comment (neither is a hole);
     - a fully proved lemma;
     - a definition;
     - a `text ‹›` doc, a description marker in its on-disk ASCII form `\<^marker>\<open>description \<open>…\<close>\<close>`, and a `\<comment>`.
   - No other session reuses its theory names (Apéry gets no second `Basics`).
   - `EXPECTED.json` lists the expected status and `doc_source` for each fact.
   - CI is green. The Beam smoke theory is not here; it is `beam/tests/thy/Demo.thy`.
6. **ProofMap export, lock and audit** (ark; Alex reviews the ML; from `proto/proofmap`)
   - **A 15-minute spike first:** with `record_proofs = 1`, are a node's own holes its `skip_proof` oracles minus the union of `all_oracles` over its named dependencies? If yes, that is the classifier. If no, use the §6.2 lexical fallback. ADR-0006 records which.
   - `revamp map export -d thys Demo` validates against C1 and uses `Session.Theory.fact` IDs, repo-relative paths and an edges array.
   - Statuses equal `EXPECTED.json`, including the mixed case and the `\<proof>` hole.
   - `revamp map next Demo.Top.main_target` ranks `Demo.Basics.dbl_mono_open` first, with leverage 3.
   - The export is the only Isabelle build in the `isabelle` CI job: one generated wrapper session (parent HOL, `sessions` read from `thys/ROOTS`, `options [quick_and_dirty, record_proofs = 1]`). Where separate wrappers are needed (`heavy/`), `revamp` generates a `DAG_Export_<S>.thy` per session, because a theory file can belong to only one session. This PR replaces the build-only step and adds `pytest -m isabelle`.
   - `revamp map lock` writes `statements.lock` and `axioms.allow`. `audit` fails on each of: a changed statement hash; an axiom not in `axioms.allow` (the planted `axiomatization where cheat: False` fixture in `tools/tests/fixtures/ax/`, built with an explicit `-d` and excluded from the lint); a new oracle. It passes on a legitimate proof. `axioms.allow` is unit-tested on Demo and on Apéry.
   - Exporting Demo takes ≤ 60 s in CI.
7. **Beam component** (retinapeg; from `proto/beam`)
   - `beam/` is ported with both soundness fixes, LGPL-3.0 headers and its own `LICENSE`. PIDE MCP is pinned in `deps.lock` and fetched by `beam/ci/pide-mcp.sh`.
   - This PR adds the `beam` CI job; `scala_build` exits 0 in CI.
   - The smoke test (`beam/tests/smoke.py` on `beam/tests/thy/Demo.thy`) on `["by simp","by blast","by foo","apply (induct n)"]` gives the expected verdicts:
     - a failing `by blast` is **not** reported as `proved`;
     - `by foo` gives `error`;
     - `(rule ccontr)+` gives `timeout`;
     - the file's md5 is unchanged;
     - `find_theorems_at` returns at least 1 result;
     - **a one-line stub** `have "…" sorry` gives the "No goal" hint at that line, and works when called with `prefix`.
   - Results carry the normalised `verdict` field. 16 candidates take ≤ 3 s locally.
   - `beam/session/ROOT.template` generates a `Beam_<Parent>` session (for example on top of `Prime_Number_Theorem`), so `run_at` has its ML on AFP-based theories; PIDE MCP's `session_requirements` is the alternative. #15's agent work depends on this.
8. **Docs index and Isar-Ref index** (retinapeg; from `proto/docs`)
   - `revamp docs index $ISABELLE_HOME/src/HOL thys` (registered through `revamp.docs.cli`) validates against C2, runs in ≤ 60 s and prints coverage %.
   - `doc_source` is correct for the fixture's three doc styles, including the ASCII marker with nested cartouches. The adjacency rule stops at headings. The statement cut list includes `\<proof>`.
   - `data/isar-ref.jsonl` has at least 150 entries. It is retinapeg's whole hover deliverable: ark's extension reads it, and retinapeg does not edit `vscode/`.
   - The Markdown conversion has unit tests.
9. **VS Code companion: hover cards** (ark) — implementation plan: `docs/plans/vscode-companion.md`
   - Activates on `onLanguage:isabelle` next to yfprojects, with no hard dependency on it.
   - Uses the §6.3 card layout and badge.
   - p95 ≤ 150 ms on `geometric_sums` (doc from preceding text), on `append_assoc` (no doc; statement, breadcrumb and link still shown) and on an Apéry lemma with a marker.
   - `simp` and `obtain` show the Isar-Ref text from `data/isar-ref.jsonl`.
   - Adding a marker and saving updates the card.
   - A golden-card unit test passes; the PR has light and dark screenshots.
   - This PR adds the `vscode` CI job. `package.json` has `publisher` and `main: dist/extension.js`, with esbuild bundling `src/extension.ts` as well as the webview. `vsce package` runs without a prompt, and CI uploads the vsix. The contributions #10 and #17 need (commands, settings) are declared here up front.
10. **ProofMap viewer** (ark; Alex signs off the look) — implementation plan: `docs/plans/vscode-companion.md`
    - Command "Isabelle Revamp: Show ProofMap".
    - Cytoscape with the dagre layout, bundled by esbuild (no CDN). Colours come from `--vscode-*` theme variables, and the legend follows §6.2.
    - Clicking a node opens file:line; hovering shows the statement and, where present, the natural-language description.
    - With `export --watch`, a save turns the node green. The time on Apéry is measured and recorded (target ≤ 30 s, see S5).
    - A synthetic 500-node graph renders in ≤ 2 s.
11. **Apéry blueprint statements** (Alex)
    - `thys/Apery` has parent HOL, imports `Complex_Main`, and sets `options [quick_and_dirty, record_proofs = 1]`. Its theory names do not repeat Demo's.
    - B1–B12 each have a `text ‹›` description, a paper reference and a marker.
    - **Stub style:** every hole has `sorry` on its own line, never `lemma x: "…" sorry` or `have "…" sorry` on one line, so `run_at` sees an open goal.
    - Natural-number subtraction is avoided (`k < n` assumptions, or `int`/`real`).
    - The main theorem `(λn. (-1)^n / (real (n+1)^3 * real ((2*(n+1)) choose (n+1)))) sums (2/5 * (∑n. 1/real (n+1)^3))` is assembled from its children (Alex fixes the exact indices).
    - `blueprint.yaml`, `statements.lock` and `axioms.allow` are committed. The map shows at least 12 nodes.
12. **`revamp` MCP server and SKILL.md** (retinapeg; the map functions come from #6)
    - It provides the §6.1 tools.
    - `claim` pushes `agent/<slug>`, opens the draft PR at once and checks uniqueness with `gh pr list --head`. Two machines claiming the same hole get one `ok:true` and one `{ok:false, held_by}`. `claim{in_place: true}` works in the main checkout and refuses a dirty tree.
    - A worktree claim writes `.mcp.json` with absolute paths (`-d <wt>/beam/session -l HOL_Beam -d <wt>/thys`) and `HOME=<wt>/.isahome` for `isabelle-beam` and `verify`'s Isabelle builds only (the `revamp` server keeps the real `HOME` for `git` and `gh`). It registers Beam and PIDE MCP in that home and copies in the ancestor heaps already built. Two agents' builds do not clash, and neither rebuilds an AFP heap.
    - `verify` runs export and audit in the worktree with `-o threads=2` and pauses `export --watch`. A test that "closes" a hole by citing another sorry'd lemma is rejected.
    - `.mcp.json.example` registers `isabelle-beam` (logic `HOL_Beam`) and `revamp`, and `/mcp` in Claude Code lists both.
    - Given only "close the highest-leverage hole in Apery", Claude picks `next_holes[0]`, claims it, uses `run_at`, and `verify` passes. Claude then marks its draft PR ready, labelled `agent-generated`.
    - A statement edit or an `axiomatization` is rejected by both `verify` and CI.
    - SKILL.md states the §11 rules, including that agents never merge, never call `gh api` and never push to `main`.

**Next up:**
- #13 `setup.sh`, `doctor.sh` and `demo-smoke.sh` (retinapeg).
  - `scripts/demo-smoke.sh` v0 is due by Train 4 and must be in use by M1 (T+5:15). It grows with each feature, and the captain runs it at every train.
  - `setup.sh` v0 is due by the cut line. It installs the pinned editor extension with `code --install-extension yfprojects.vscode-isabelle@2026.10.0`, and sets the user-level `"extensions.autoUpdate": false` (that setting is application-scoped, so it cannot go in workspace settings). It warns about other `~/Isabelle20*` directories.
  - Accepted when ark runs `setup.sh` verbatim on a clean VM with no "blocker" pain points.
- #14 `agents/run_holes.sh` and `agents/prompt.md` (retinapeg; the design is §11A).
- #15 ζ(5) skeleton in `heavy/` (Alex).
  - Statements follow the preprint's own numbering and mo271's Apache-2.0 module list. Romik's repository is cited; nothing is taken from it.
  - Use the AFP `θ_asymptotics`. Define the Hankel determinant with the Leibniz formula over `{p. p permutes {..<K}}` to avoid building the Jordan_Normal_Form heap.
  - Stubs put `sorry` on its own line.
  - Agent work on it depends on #7's `Beam_<Parent>` template.
- #16 demo script, fallback video, the planted demo PR and the replay snapshots (Alex).
  - The demo PR is a draft on `demo/weaken-<node>`, labelled `agent-generated` and `do-not-merge`, that weakens one Apéry statement. The agent lint lets it through; the `statement_sha1` audit fails it. It exists by the cut line.
  - The `dag.json` replay snapshots come from the CI `proofmap` artifact.
- #17 Isar outline and "Read as paper" (stretch).
- #18 `isa2uni` textconv (stretch).
- #19 `docs_search` (stretch).
- #20 RC4 canary (stretch).

---

## 14. Trade-offs, and what to revisit after the hackathon

| Decision | Alternative | Why this one | Revisit when |
|---|---|---|---|
| Pin **Isabelle2025-2** with the matching AFP | 2026-RC4 | Every dependency has been tested on 2025-2: the AFP release, PIDE MCP's `Isabelle2025-2` branch, both prototypes and yfprojects. A toolchain change in mid-hackathon is a classic way to lose a day. | After the 24 Oct release. Port 4 Beam ML API changes (`Toplevel.command_exception`; `Interactive.setmp_parallel_proofs`; the `parse_text` init record; `print_function`'s `command_kind`) and 2 in `DAG_Export` (`Name_Space.entry_pos`, `Message_Digest.rep (SHA1.digest …)`). Move PIDE MCP to its 2026 branch, reseed the caches, and update every laptop. |
| Headless Beam with a separate prover | Shared editor session (yfprojects' `isabelle_try` on its own fork of the language server) | It is our own work, works with any editor, runs in CI, and suits several agents. A shared session needs changes to Isabelle's sources. | Once upstream offers a way to share a session |
| Client-side hover from a lexical index | Server patch with Markdown `Hover.reply` | No Isabelle patch, works alongside any server, protected from churn upstream | Add a Scala index built from PIDE markup (`Build.read_theory`) and a patch series against Isabelle2026 |
| ProofMap edges = the kernel's *actual* dependencies | Hand-written `\uses` (leanblueprint, isa-blueprint) | Verified, not self-reported. `declared` edges are kept for planning. | Larger sessions: memoise or move to CI |
| Batch export (`isabelle build -e`), one build that checks and exports | Live `isabelle server` with `use_theories` and `export_pattern` | Deterministic and identical to CI | If refreshes of ≤ 30 s feel slow |
| Companion extension | PRs to yfprojects | yfprojects has one maintainer, is 6 weeks old, and has never accepted an outside PR | Offer method docs, RC directory detection and the Isar outline upstream |
| 0 required approvals plus a written norm | 1 required approval | Sleep windows would otherwise deadlock merges | After the hackathon, require 1 approval |
| Pins in `deps.lock`, no submodules | Submodules or vendoring | Avoids traps for a team with mixed experience and avoids mixing licences | — |
| Python MCP server for ProofMap | Scala, inside PIDE MCP | Fastest for ark and retinapeg | Propose Beam upstream on the PIDE MCP Zulip topic (CONTRIBUTING requires that) |

---

## 15. Risks and fallbacks

| Risk | Likelihood / impact | Mitigation → fallback |
|---|---|---|
| A laptop with 8 GB, or a slow download | M / H | Download at T+0 and share by USB. The demo runs on the strongest machine. Weak machines use `-o threads=2` and a single prover. |
| Download mirrors fail (the TUM URL redirects to http, an SSL error on the CIT mirror) | M / M | Three mirrors in the action, the CI cache, a USB copy |
| Auto-detection picks an `Isabelle2026` directory | M / H | `setup.sh` writes `isabelle.home`; `doctor.sh` warns |
| Beam reports `proved` when it is not (the 2025-2 global-ref fix) | L / H | Required smoke test. Acceptance is always the batch build plus the audit, so a false positive wastes time but cannot corrupt `main`. |
| Speculative output leaks into the real document; lines off by one ("Bad context for command"); one-line stubs ("No goal") | M / M | The print-exec-id fix is tested; snap to the nearest command; `prefix` for one-line stubs, and `sorry` on its own line in new stubs; notes in SKILL.md |
| An agent cheats (axioms, statement edits, ML, `tactic`) or launders a hole | M / H | Agent lint, `statements.lock`, `axioms.allow`, the oracle audit, `verify`'s laundering check, and a human merges. The statement-weakening rejection is part of the demo. |
| An agent merges its own PR | L / H | `.claude/settings.json` deny rules, `--disallowedTools` in `run_holes.sh`, SKILL.md |
| The classifier misses holes | M / M | `record_proofs = 1` oracle positions; the lexical fallback, including `\<proof>`; the #5 regression fixture |
| Two machines claim the same hole | M / M | The lock is a draft PR opened at claim time; the losing machine's plain push of `agent/<slug>` is rejected |
| Parallel builds clash on heaps and `log/*.db` | M / M | One Isabelle `HOME` and one `-d <wt>/thys` per agent (§6.1 `claim`) |
| Symbol corruption (Unicode written into a `.thy`; UTF-16 versus symbol offsets) | M / M | Lint for ASCII; agents write escapes; hover looks up by line and name, never by raw offset |
| Memory: about 2.2 GB per prover, 2–4 GB per batch build, plus the PIDE leak in long sessions | M / M | k ≤ 1 at 16 GB with `--watch` paused during `verify`, k ≤ 3 at 32 GB; `-o threads=2`; one fresh session per hole; a restart script |
| Merge conflicts in a single `.thy`, `package.json` or ROOT | M / M | One cluster of holes per theory file; extension contributions declared up front (#9); worktrees; rebasing at trains; no stacked PRs |
| AFP heaps take hours | H / L (they only matter after the cut line) | Background build from T+0:15 on the ζ(5) machine; `heavy.yml` only; the pinned AFP tarball cached and checked against its sha256; S4 fallback |
| yfprojects changes or breaks | M / M | `setup.sh` installs 2026.10.0 and turns auto-update off; our MCP server is named `isabelle-beam`, so a yfprojects `isabelle` server cannot clash with it; our extension uses standard APIs only |
| The live demo is nondeterministic | M / H | Pre-warmed session, a rehearsed golden hole that closes in ≤ 60 s, `dag.json` replay snapshots (#16), fallback video |
| Overclaiming (ζ(5) "proved by us"; "the first" without a hedge; a Prove2Me or Anthropic affiliation) | M / H | Fixed wording in `demo-script.md` ("to our knowledge, the first"); our own name ProofMap; credits in the README |
| Mixed licences | L / M | `beam/` is LGPL-3.0 on its own; the ζ(5) structure comes from the preprint's numbering and mo271's Apache-2.0 module list, with credit; Romik's unlicensed repo is cited only; Fauzan's PDF is linked only |
| The repo stays private or keeps the hyphen | L / M | Rules held by convention plus `ci-ok`; `threads=2` on 2-CPU runners; absolute paths and `$R`. The rename is safe, because commit 0 and `proto/*` are already pushed. |
| `ci-ok` renamed or duplicated | L / H | Comment in the YAML; ark owns `.github/` |
| Scope creep (OCaml, an analysis library, the full ζ(5) proof) | H / H | §4 is binding. At the T+12:30 dry run, anything not on the cut-line list is cut. |

---

## 16. Glossary

- **Isabelle/HOL:** a proof assistant (Isabelle) plus its main logic, Higher-Order Logic.
- **Poly/ML:** the Standard ML runtime that runs the prover: the kernel, HOL and tactics.
- **Isabelle/Scala:** the JVM layer. It holds the document model (PIDE), builds, the server and the editor back ends.
- **PIDE (Prover IDE):** Isabelle's asynchronous document model. It processes theories command by command and reports markup and messages.
- **Session:** a named group of theories, defined in a `ROOT` file; a `ROOTS` file lists session directories. Each session has a parent, for example `HOL`.
- **Heap:** a saved Poly/ML image of a built session. HOL ships prebuilt; building HOL-Analysis or AFP sessions takes minutes to hours. Heaps are architecture-specific.
- **Theory (`.thy`):** a source file, made of a sequence of **commands** such as `lemma`, `definition` or `text`.
- **Isar:** Isabelle's structured proof language (`proof … qed`, `have`, `show`, `obtain`, `case`). An **apply script** is the tactic style (`apply …` then `done`). We never change Isar syntax.
- **Proof method:** a tactic used in a proof, such as `simp`, `auto`, `blast` or `induct`. The `tactic` and `raw_tactic` methods run arbitrary ML, so agents may not use them.
- **`sorry` / `\<proof>` / `oops`:** `sorry` leaves a hole, implemented as the **`skip_proof` oracle**; `\<proof>` is Pure's alias for `sorry`. `oops` abandons a proof.
- **`quick_and_dirty`:** a session option that allows `sorry` in batch builds, which otherwise reject it.
- **`record_proofs`:** a session option for the level of proof recording. Level 1 records each oracle with its position but no proof terms, which lets the ProofMap tell a theorem's own `sorry` from one it inherits.
- **Oracle:** a trusted step outside the kernel. **`axiomatization`** adds axioms; any non-definitional axiom is treated as cheating.
- **`axioms.allow`:** the committed list of a session's allowed axioms; the gate fails on any other.
- **`Thm_Deps`:** the ML module that reads the theorem dependencies recorded by the kernel. `has_skip_proof` detects a `sorry` somewhere below a theorem; `all_oracles` lists the oracles, with positions when `record_proofs = 1`.
- **AFP (Archive of Formal Proofs):** Isabelle's library of contributed developments. For example, `Zeta_Function`, `Prime_Number_Theorem` (which contains `θ_asymptotics`) and `Zeta_3_Irrational`.
- **Cartouche `‹…›` and symbols `\<forall>`:** Isabelle's quoting, and its ASCII escape codes for mathematical symbols. On disk a cartouche is `\<open>…\<close>`. Files stay ASCII; editors render the symbols.
- **Marker:** `\<^marker>‹description ‹…››` (on disk `\<^marker>\<open>description \<open>…\<close>\<close>`) is a built-in metadata annotation inside a command. It is one of our docstring sources.
- **Locale:** Isabelle's module system for parameterised theories.
- **Sledgehammer:** a tool that calls external automated provers and proposes proofs.
- **LSP / `vscode_server`:** the language server protocol, and Isabelle's server that implements it, plus custom `PIDE/*` messages.
- **Infoview / goal panel:** the side panel that shows proof goals at the cursor; yfprojects provides ours.
- **Overlay / query operation:** a PIDE mechanism that runs extra computation on a command's state without editing the document. Beam is built on it.
- **MCP (Model Context Protocol):** the JSON-RPC protocol through which Claude Code calls tools.
- **PIDE MCP:** kappelmann's headless Isabelle MCP server (LGPL-3.0).
- **`isabelle-beam`:** our name for the PIDE MCP server with the Beam component loaded (logic `HOL_Beam`, or a generated `Beam_<Parent>`).
- **Beam / `run_at`:** our speculative "try these candidate proofs here" tools, named after Lean Beam's `runAt`.
- **ProofMap:** our theorem DAG of nodes, edges and statuses, used by the viewer, the agents and the CI gate. Node IDs are `Session.Theory.fact`, for example `Demo.Basics.dbl_mono_open`.
- **Hole laundering:** "closing" a hole by citing another `sorry`'d lemma, which moves the hole instead of closing it. `verify` rejects it.
- **Blueprint (leanblueprint):** a Lean convention of a human-written dependency graph, with a colour legend we reuse.
- **`components -u`:** registers an Isabelle component (such as Beam or PIDE MCP) for the current Isabelle version, in `$ISABELLE_HOME_USER/etc/components`.
- **`ISABELLE_HOME` / `ISABELLE_HOME_USER`:** the installation directory, and the per-user settings and heaps directory (`~/.isabelle/Isabelle2025-2`, which moves with `HOME`).
- **`ci-ok`:** the single required CI check.
- **Train:** our 45-minute integration huddle.
- **Cut line:** T+14. The tag `demo-v1` must be able to give the whole demo on its own.
- **Golden hole:** a pre-rehearsed `sorry` that Claude closes live on stage, claimed with `claim{in_place: true}`.
