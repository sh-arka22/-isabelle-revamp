# isabelle-revamp: system design and 24-hour plan (PLAN.md v1)

> **Status:** v1, the merged plan. A review found 34 fixable problems; **v1.1 with every fix applied, plus an agent-architecture section (§11A) and a first-hour checklist (§0), follows as a pull request.** Prefer v1.1 wherever the two differ.

> Commit 0 on `main` of **`sh-arka22/-isabelle-revamp`**, which we will rename to `sh-arka22/isabelle-revamp` (see D2). Date: Sat 17 Oct 2026. Times are written T+h:mm from kickoff. The hackathon is about 24 h; §12 gives a 36 h variant.
> Team:
> - **Alex** (`hymanimy`): maths, Isabelle, design, pitch.
> - **ark** (`sh-arka22`): repo owner. Algorithms/ML; learning Isabelle.
> - **retinapeg** (`retinapeg`): agent endpoints, natural-language tools, new-user pain points.

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
1. **Status classifier bug in the prototype.** At line 69 of `DAG_Export.thy`, a node is `sorry` only if it is tainted and none of its dependencies is. So a lemma with its *own* `sorry` and also a sorry'd dependency is reported `proved`, and its hole vanishes from `next_holes`. Fix: also scan the node's own proof text for `sorry`. Issue #5 adds a regression fixture for this case.
2. **Naming collision.** "Blueprint" clashes with the existing `isa-blueprint` (PyPI `isabelle-blueprint`). We use **ProofMap**.
3. **AFP outside the required gate.** Anything that needs the AFP lives in `heavy/` and is never a required check. Apéry is built on plain `HOL`.
4. **Approvals.** 0 required approvals in the ruleset, plus a written review table (§8), so nobody is blocked while a teammate sleeps.
5. **One prover session per agent.** Plan C's single shared read-only PIDE MCP session cannot see an agent's worktree edits. Each agent gets its own session, capped by RAM.
6. **No CDN in the viewer.** The ProofMap viewer bundles Cytoscape: VS Code webviews have a content security policy, and the demo must work offline.
7. **No custom build of yfprojects needed.** The demo spine uses the Marketplace yfprojects plus our own headless Beam. Building yfprojects from `main` is optional.
8. **No downloaded baseline in the CI gate.** The gate checks against the committed `statements.lock` plus an axiom audit. The baseline artifact is used only for warnings about status regressions.

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
| 0:20–0:55 | A modern editor built for Isar | Stock VS Code, set up by `scripts/setup.sh`. Hover `append_assoc`: a Markdown card with the statement, the doc and a badge saying where it came from, a breadcrumb, and `List.thy:N`. Hover `obtain`: the Isar reference paragraph. Add `\<^marker>‹description ‹…››` to an Apéry lemma and save: the card updates. "No syntax changed." | ark, retinapeg |
| 0:55–1:30 | ProofMap | The Apéry DAG (about 12 nodes). Statuses come from the kernel (`Thm_Deps`; `sorry` is the `skip_proof` oracle), not from anything we wrote by hand. Click a node to jump to file:line. Then the ζ(5) blueprint: 28 nodes, *n* of them green; the numerics node is labelled "post-hackathon". | ark, Alex |
| 1:30–2:30 | Claude closes a hole | Claude Code in VS Code's terminal: `next_holes` → `node_context` (natural-language description plus dependency statements) → `run_at` tries 8 candidates in about 1 s without touching the file → Claude writes the winner → VS Code re-checks → `verify` passes → the node turns green. Then a pre-made agent PR that adds `axiomatization where cheat: False` fails CI with "new non-definitional axiom". | retinapeg, ark |
| 2:30–3:00 | Close | Same kernel, same HOL, same Isar. The honest ζ(5) line (§4). Next steps: Isabelle2026 (24 Oct), and proposing Beam to PIDE MCP upstream. | Alex |

For the live beat, one known-easy leaf (the "golden hole") is re-opened as `sorry` on stage, and we say so. Parallel agent work is shown as the overnight PR list.

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
| FR2 | **ProofMap export** of a session's theorem-level DAG, using dependencies recorded by the kernel. Each node has a status, a natural-language description (from the preceding `text ‹›`) and a link to its source. |
| FR3 | **ProofMap viewer** inside VS Code: leanblueprint-style legend, click to open file:line, refreshes when the map changes. |
| FR4 | **Integrity gate**, run in CI and by `verify`. It fails on: a changed statement hash, a new non-definitional axiom, a new oracle, or (as a warning) a status regression. |
| FR5 | **Agent endpoints over MCP:** `run_at`, `find_theorems_at` and the built-in PIDE MCP tools; plus `map_status`, `next_holes`, `node_context`, `claim`, `verify`, `docs_lookup`. Stretch: `docs_search`. |
| FR6 | **Agent loop:** one hole → one worktree → one PR → a human merges. |
| FR7 | **One-command setup:** `scripts/setup.sh` reads the pinned versions, registers components, and writes gitignored local settings. `doctor.sh` diagnoses problems. |
| FR8 | **Maths content:** the Apéry series fully proved; the ζ(5) blueprint skeleton. |
| FR9 | **Pain-point log:** `docs/pain-points.md`, with each entry turned into an issue. |

### Non-functional targets

| Area | Target |
|---|---|
| Hover latency | p95 ≤ 150 ms. Served from the index; the definition lookup times out at 100 ms and falls back to looking up the name. **A hover never waits on the prover.** |
| Goal panel | Comes from yfprojects. Must update ≤ 1 s after a caret move on the demo theories. We measure this; we do not engineer it. |
| `run_at` | One simple candidate ≤ 1 s. 16 in parallel ≤ 3 s wall time. File unchanged (md5). Default timeout 10 s per candidate. |
| ProofMap | Save to green node ≤ 30 s on Apéry (batch export). Viewer renders 500 nodes in ≤ 2 s. |
| Install | `setup.sh` takes ≤ 10 min, not counting the download. It is idempotent and never writes into the Isabelle distribution. |
| CI | `ci-ok`: ≤ 3 min for docs-only PRs; ≤ 5 min warm and ≤ 8 min cold when Isabelle runs. |
| Live demo | The golden path succeeds in 5 of 5 rehearsals. Nothing needs the network except the Claude API. The demo machine has ≥ 16 GB (32 GB preferred). The fallback video is recorded. |
| Soundness | Nothing an agent writes reaches `main` without a kernel batch build and the gate. Beam verdicts are advisory only. |
| Look | Webviews use `--vscode-*` theme variables and are readable in light and dark themes. The leanblueprint colour legend is used. |
| Platforms | Linux x86_64 and macOS arm64 must work. Windows is best effort (Cygwin). |

### Constraints

- **Time and people:** 24 h, 3 people, one of whom is learning Isabelle.
- **Isabelle2026:** final release is 24 Oct, after the demo; RC4 is out now. We pin **Isabelle2025-2** (ADR-0002, §14).
- **Upstream churn:**
  - The upstream maintainer has called Isabelle's language server "a failure", and its `PIDE/*` messages are unversioned.
  - yfprojects has a single maintainer.
  - PIDE MCP's ML API changed in four places between 2025-2 and 2026.
- **Licences:** our repo is BSD-3. PIDE MCP is LGPL-3.0, so Beam is a separate component with its own licence. danromik's ζ(5) repo has no licence (cite it, copy nothing). Fauzan's PDF is All Rights Reserved (link to it only).
- **Resources:**
  - About 2.2 GB RSS per HOL prover session.
  - 1.2–1.7 GB downloads.
  - Free rulesets and 4-CPU/16 GB runners need a **public** repo.

---

## 4. Scope

### MUST: on `main` by the cut line (T+14, tag `demo-v1`)

1. Repo, the `ci-ok` gate and the ruleset (#1–#3).
2. Hover cards on Demo, Apéry and HOL lemmas, plus at least one Isar keyword hover (#8, #9).
3. ProofMap export with correct statuses, the integrity audit, and the viewer in VS Code (#6, #10).
4. Beam `run_at` and `find_theorems_at`, plus the `revamp` MCP server. Claude closes at least one node end to end through a PR and the gate (#7, #12).
5. The planted-axiom rejection, reproducible on demand.
6. At least 6 of the 12 Apéry nodes green.
7. `setup.sh` v0 (Isabelle already downloaded). `pain-points.md` with at least 10 entries. Fallback video v0.

### SHOULD: T+14 to T+18

- All of Apéry green.
- The ζ(5) skeleton with at least 8 green nodes.
- Full `setup.sh` (download plus sha256 check) and `doctor.sh`.
- 2–3 parallel agents.
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
   - 27 statements taken from the structure of Romik's `Interface.lean`, used for structure only and credited, plus `irrationality_criterion`;
   - the top-level assembly is proved;
   - leaves are filled live.

   Slide wording: *"The first Isabelle blueprint of the September 2026 ζ(5) proof. That proof is a preprint, verified twice in Lean and not yet peer-reviewed. One of the two Lean proofs takes the prime number theorem as an axiom; in Isabelle it is the 2018 AFP theorem `θ_asymptotics`."*

---

## 5. Architecture and data flow

```
 ┌──────────────────────── Demo laptop (>=16 GB) ────────────────────────────────────────────────┐
 │                                                                                               │
 │  Human ─► Stock VS Code                                                                       │
 │           ├─ yfprojects.vscode-isabelle (Marketplace 2026.10.0, pinned)                       │
 │           │    syntax · symbols (file stays ASCII) · goal panel · sledgehammer panel          │
 │           │    └─ LSP stdio + PIDE/* ─► isabelle vscode_server ─► Poly/ML prover #1           │
 │           └─ revamp companion extension (OURS, standard VS Code APIs only)                    │
 │                ├─ HoverProvider ─► docs.jsonl (+ executeDefinitionProvider, 100 ms budget)    │
 │                ├─ ProofMap webview ◄─ out/dag.json (Cytoscape bundled, theme colours)         │
 │                └─ (SHOULD) Isar step outline / Read-as-paper                                  │
 │                         ▲ VS Code auto-reloads files; disk is the only shared state           │
 │  Claude Code ─MCP stdio─► "isabelle" = isabelle pide_mcp + beam component                     │
 │      │                     run_at · find_theorems_at · get_state · edit · sledgehammer        │
 │      │                     └─► Poly/ML prover #2..k   (one per agent; k<=2 @16 GB, k<=4 @32 GB) │
 │      └───────MCP stdio─► "revamp" (Python) map_status · next_holes · node_context ·           │
 │                              claim · verify · docs_lookup · (docs_search)                     │
 │                              ├─ revamp map export ─► isabelle build -e (wrapper session       │
 │                              │                       + DAG_Export.thy) ─► out/dag.json        │
 │                              ├─ revamp map audit  ─► statements.lock + axiom/oracle diff      │
 │                              └─ gh (claim = open PR from agent/<slug>)                        │
 │  revamp docs index ─► lexical scan of $ISABELLE_HOME/src/HOL + thys/ + Isar-Ref ─► docs.jsonl │
 └───────────────────────────────────────────────────────────────────────────────────────────────┘
 GitHub: PR ─► ci.yml [lint · py · vscode · isabelle(build + map audit) · beam smoke] ─► ci-ok (sole required check)
         main ─► cd-main.yml ─► pre-release main-latest (vsix, dag.json)     heavy.yml ─► AFP / ζ(5) / strict builds
```

**Data flow:**
1. `.thy` files are always ASCII on disk. The editor checks them with prover #1; nothing of ours depends on the editor.
2. When a file is saved, `revamp map export --watch` runs a batch build of a generated wrapper session. `DAG_Export.thy` reads `Thm_Deps.thm_deps`, `has_skip_proof`, `all_oracles` and `Theory.all_axioms_of`, and the build writes `out/dag.json`.
3. The viewer re-renders from `dag.json`. `next_holes` ranks open leaves: holes that depend on no other hole first, then by leverage.
4. The agent calls `claim(id)`, which creates branch `agent/<slug>` and worktree `../wt/<slug>`. It then calls `node_context` and `run_at` (speculative, nothing is written), writes the winning proof, and calls `verify`, which runs export and audit in the worktree. Then it opens a PR.
5. CI rebuilds from scratch and audits. A human merges. CD republishes `main-latest`.
6. `docs.jsonl` is built once for HOL and incrementally for repo files on save. Hover only ever reads the index.

**Why there is no shared session:** PIDE MCP runs headless sessions of its own. The preprint says sharing a session with an editor needs changes to Isabelle's sources. For the live beat, the agent works in the main checkout, so VS Code reloads the file in front of the audience. Parallel agents use worktrees.

---

## 6. Interfaces and contracts (`contracts/`, frozen as v1 at T+2:15)

These rules apply to every contract:
- Each contract is a JSON Schema plus golden examples in `contracts/examples/`.
- Each producer has a CI test that validates its real output against the schema.
- Consumers build against the golden examples, so they never wait for the producer.
- After the freeze, a change needs a PR labelled `contract-change`, a bump of `schema_version`, and approval from every consumer.

### 6.1 MCP tools (C4, `contracts/mcp-tools.json`)

**Server `isabelle`** (Scala; PIDE MCP plus our `beam` component; owner retinapeg). Lines are 1-based, and `origin` is a session-qualified theory name or a file path.

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
- Common error: "Bad context for command". The tool returns a hint to move to the nearest command line.

**Server `revamp`** (Python using the official MCP SDK's FastMCP; owner retinapeg; the ProofMap logic is ark's `tools/revamp/map`).

| Tool | Input | Output |
|---|---|---|
| `map_status` | `{session?, target?}` | `{counts:{fully_proved, proved, sorry, oracle, defined, missing}, red:[id], git_sha, generated_at}` |
| `next_holes` | `{target, k=5}` | `[{id, file, line, statement, leverage, rests_on_holes}]`, ranked: fewest other holes first, then highest leverage, then shortest statement |
| `node_context` | `{id}` | `{node, nl, doc, deps:[{id, statement, status}], used_by:[id]}` |
| `claim` | `{id}` | `{ok:true, branch:"agent/<slug>", worktree}` or `{ok:false, held_by}`. **The lock is an open PR from `agent/<slug>`** (`gh pr list --head`), plus a local lockfile covering the gap before the PR exists. |
| `verify` | `{id, worktree}` | `{ok, status, statement_unchanged, new_axioms:[], new_oracles:[], log_tail}`. Passes only if the node is no longer `sorry`, its hash is unchanged, and there are no new axioms or oracles. |
| `docs_lookup` | `{name, kind?}` | one C2 record |
| `docs_search` (stretch) | `{query, k=10}` | `[{…C2 record, score}]`, ranked by BM25 over statement and doc, offline |

Errors are MCP tool results with `isError: true` and a single-line, actionable message.

### 6.2 Theorem dependency graph (C1, `contracts/dag.schema.json`)

```jsonc
{ "schema_version": 1, "isabelle": "Isabelle2025-2", "session": "Apery",
  "git_sha": "…", "generated_at": "ISO-8601",
  "nodes": [ {
    "id": "Telescoping.partial_sum_identity",       // theory-qualified fact name; multi-facts as foo(1)
    "kind": "theorem | definition",
    "theory": "Apery.Telescoping", "file": "thys/Apery/Telescoping.thy", "line": 42,   // repo-relative
    "status": "missing | defined | sorry | proved | fully_proved | oracle",
    "statement": "ASCII with \\<symbols>", "statement_sha1": "hex",
    "nl": "from preceding text ‹›, optional", "doc_source": "marker | preceding_text | comment | none",
    "lib_uses": ["HOL.trans", "…"],                  // filtered: no arity_/classrel_; may be truncated
    "blueprint": { "label": "B3", "paper_ref": "…", "owner": "human:alex | agent" }   // optional join from C3
  } ],
  "edges": [ { "from": "<dependent id>", "to": "<dependency id>", "kind": "uses | uses_def | declared" } ],
  "audit": { "non_definitional_axioms": [ { "name": "…", "theory": "…", "prop": "…" } ],
             "oracles": [ { "node": "…", "oracle": "…" } ] } }
```

Edge kinds:
- `uses` comes from `Thm_Deps.thm_deps` (named facts within the session).
- `uses_def` comes from the constants that occur in the statement.
- `declared` comes from `blueprint.yaml`. `revamp map check` warns where declared edges and actual edges differ.

| Status | Rule | Viewer (leanblueprint legend) |
|---|---|---|
| `missing` | Listed in `blueprint.yaml`, with no Isabelle fact yet | blue border |
| `defined` | A constant or definition | box shape |
| `sorry` | The node's **own** proof has a hole: a lexical `sorry` in its proof span, OR it is tainted and none of its named dependencies is | red border |
| `proved` | Its own proof has no hole, but it rests on at least one `sorry` somewhere in its dependencies | green fill |
| `fully_proved` | No oracles anywhere in its dependencies | dark-green fill |
| `oracle` | It depends on an oracle other than `skip_proof` | solid red, untrusted |

**Committed files owned by humans:**
- `thys/<S>/statements.lock` holds `{id, statement_sha1}` for each blueprint node. It is regenerated by `revamp map lock` **only** in human PRs labelled `statement-change`. Agents never touch it, and CI enforces that.
- `thys/<S>/blueprint.yaml` (C3) holds `{label, isabelle, title, nl, paper_ref, owner, declared_uses}`.
- Generated `dag.json` files are never committed.

### 6.3 Hover and docstring extraction (C2, `contracts/docs.schema.json`)

Each line of `docs.jsonl` is one record:

`{name, kind: fact|constant|type|locale|class|method|attribute|command, session, file, line, statement, doc, doc_source: marker|preceding_text|comment|isar_ref|ai_summary|none, breadcrumb: [theory, chapter, section, …], statement_sha1}`

**Where the doc comes from, first match wins.** All of these are constructs Isabelle already has; no new syntax.
1. `\<^marker>‹description ‹…››` inside the command. This marker is built into Pure and is unused in HOL today.
2. An *adjacent* preceding `text ‹…›` or `txt ‹…›`: only whitespace or comments may come in between, and the search stops at any heading or other command. The card shows "from preceding text", because a section's intro text can describe several lemmas.
3. A `\<comment> ‹…›` inside the statement.
4. `ai_summary` (stretch). Keyed by `statement_sha1`, and always shown as "AI summary (not in source)".
5. `none`.

Only 2.4–4.7% of HOL lemmas have an adjacent text block, so the card must be useful without a doc: the statement, breadcrumb and link are always shown.

**Statement:** the command's text, cut before the first of `proof`, `by`, `apply`, `using`, `unfolding`, `including`, `supply`, `sorry`, `oops`, `..` or `.`.

**Conversion to Markdown:**
- `\<^item>` becomes `-` and `\<^enum>` becomes `1.`;
- `\<^emph>` becomes `*…*` and `\<^bold>` becomes `**…**`;
- `@{thm}`, `\<^term>`, `\<^const>`, `\<^typ>` and `\<^verbatim>` become inline code;
- `\<^url>` becomes `<url>`;
- symbols are decoded through `$ISABELLE_HOME/etc/symbols`.

**Lookup, in order:**
1. `vscode.executeDefinitionProvider` at the cursor, with a 100 ms budget, gives a (file, line) to look up in the index.
2. Otherwise, the word under the cursor is looked up by name: the same theory first, then its imports.
3. Keywords, methods and attributes come from `data/isar-ref.jsonl`.

The hover never calls the prover and never calls `executeHoverProvider`, which would recurse.

**Card layout (Lean-style):** a fenced `isabelle` code block with the statement, a `---` separator, the doc with its source badge, another `---`, then *kind · full name · breadcrumb · `File.thy:N`* in italics. VS Code shows our card alongside yfprojects' plain-text tooltip.

---

## 7. Repo layout (directory → owner)

```
isabelle-revamp/
├── PLAN.md  README.md  CONTRIBUTING.md  CLAUDE.md  LICENSE (BSD-3-Clause)
├── .isabelle-version          "Isabelle2025-2": the ONLY place the version is written
├── deps.lock                  afp=afp-2026-10-16 · pide_mcp=kappelmann/isabelle-pide-mcp@7463338 (branch Isabelle2025-2)
│                              yfprojects=Marketplace 2026.10.0 (optional src: 4961e04 + mirror 51836a987a) · node=22 · typescript=~6.0.3
├── .gitignore  .gitattributes  .mcp.json.example  .vscode/settings.json.example   (real files gitignored)
├── .claude/skills/isabelle-revamp/SKILL.md                                           (retinapeg)
├── .github/  workflows/{ci,heavy,cd-main}.yml · actions/setup-isabelle/ · ruleset-main.json
│             CODEOWNERS · pull_request_template.md · ISSUE_TEMPLATE/task.md         (ark)
├── contracts/  dag/docs/blueprint schemas · mcp-tools.json · examples/              (all three)
├── thys/       ROOTS · Demo/ (fixture) · Apery/ (+ blueprint.yaml, statements.lock)  (Alex)   parent = HOL only
├── heavy/      Zeta5_Blueprint/ · Apery_Bridge/ (link to AFP zeta 3)                 (Alex)   heavy.yml only
├── proofmap/   isabelle/{DAG_Export.thy, ROOT.template}                               (ark)
├── tools/      pyproject.toml · revamp/{cli, map/, docs/, mcp_server, doctor}.py · tests/
│                                                         (ark: map/ · retinapeg: docs/, mcp_server)
├── vscode/     companion extension: src/{extension, hover/, map/, outline/}.ts · test/  (ark)
├── beam/       LICENSE (LGPL-3.0) · etc/{build.props,settings} · src/*.scala
│               session/{ROOT,Beam.thy} (2025-2) · session-2026/ (kept for the port) · tests/   (retinapeg)
├── agents/     run_holes.sh                                                           (retinapeg)
├── scripts/    setup.sh · doctor.sh · isa2uni · ci/{lint.sh, pide-mcp.sh}             (ark)
├── data/       isar-ref.jsonl (generated, small, committed)                           (retinapeg)
└── docs/       decisions/ADR-000{1..6} · design/ui.md (Alex) · demo-script.md (Alex) · onboarding.md
                pain-points.md (retinapeg) · research/ (retinapeg) · DEPENDENCIES.md (licences)
```

`.gitignore` covers: heaps, `*.db`, `*.vsix`, `*.jar`, `beam/lib/`, `vscode/out`, `.vscode-test`, `out/`, `.mcp.json`, `.vscode/settings.json`, videos, `.venv`.

CODEOWNERS matches the owners above; `/contracts/` is owned by all three. It is informational and not enforced.

---

## 8. Git workflow

**Decisions, made at kickoff and recorded in ADRs:**
- **D1, canonical repo:** `sh-arka22/…` is the **only** repo. Alex pushes a one-line README to `hymanimy/isabelle-revamp` saying "moved to sh-arka22/isabelle-revamp" and archives it. Nothing is mirrored, and nobody adds a second push remote.
- **D2, rename to `isabelle-revamp`** (`gh repo rename isabelle-revamp -R sh-arka22/-isabelle-revamp`; GitHub redirects the old URL). The leading hyphen breaks tools: `cd -isabelle-revamp` fails with "-i: invalid option", and relative paths passed to `isabelle -d` or `components -u` get read as flags.
  - After the rename: `git remote set-url origin https://github.com/sh-arka22/isabelle-revamp.git`.
  - Anyone working in a hyphen-named directory always uses absolute paths.
- **D3, public repo.** On a free personal account, rulesets require a public repo, and public runners have 4 CPU/16 GB instead of 2/8. Only the owner (ark) can be admin, so only ark can bypass the ruleset, and only through a PR.

**Bootstrap, in order:**
1. **Commit 0 is this `PLAN.md`, pushed directly. It is the only direct push to `main`, ever.**
2. PR #1, the skeleton: README, CONTRIBUTING, CLAUDE.md, LICENSE, CODEOWNERS, templates, `.gitignore`, `.gitattributes`, `.isabelle-version`, `deps.lock`, ADR-0001 to ADR-0005, and `contracts/README`. Merged by T+0:40.
3. Open draft PRs from the `proto/*` branches (table below), **after #1** so `.gitignore` is in place. Always `git add <paths>`, never `git add -A`.
4. Merge PR #2 (CI). Run `workflow_dispatch` on `main` once to seed the caches. **Only then** apply the ruleset: a required `ci-ok` that has never reported would block every PR.
   ```
   gh api -X POST repos/sh-arka22/isabelle-revamp/rulesets --input .github/ruleset-main.json
   gh repo edit sh-arka22/isabelle-revamp --enable-squash-merge --enable-merge-commit=false \
     --enable-rebase-merge=false --delete-branch-on-merge --enable-auto-merge
   ```
   The ruleset:
   - blocks deletion of `main` and force-pushes to it;
   - requires linear history and a PR;
   - allows squash merges only;
   - requires the `ci-ok` check, with "branch must be up to date" (strict mode) **off**;
   - sets **0** required approvals (the review norm below covers it);
   - lets the admin bypass through a PR only.

**Branches:**
- `alex/<issue#>-<slug>`, `ark/<issue#>-<slug>`, `retinapeg/<issue#>-<slug>` for people;
- `agent/<node-slug>` for Claude, labelled `agent-generated`;
- `main` is the only long-lived branch.

**PR rules:**
- One concern per PR, at most about 300 changed lines (lockfiles and golden files excluded).
- Titles are `area: imperative`, with area one of `ci, thys, heavy, proofmap, beam, tools, vscode, contracts, docs`.
- **Open a draft PR within 30 minutes** of starting a task, so everyone can see what you are touching.
- At most 2 non-draft PRs open per person.
- **Never merge `main` into a branch.** Use `git fetch && git rebase origin/main`, and `git push --force-with-lease` to your own branch only.
- The PR template asks for:
  - the issue number;
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

**The ~45-minute train.** CI runs on every push and takes minutes. The 45 minutes is the rhythm for **integration**, not a cron job: a `*/45` cron fires at :00 and :45, not every 45 minutes.

Trains run at T+0:45, 1:30, 2:15, 3:00, and so on. Each is a huddle of at most 5 minutes:
1. Each person gives one line: merged / ready / blocked.
2. Merge the cleared green PRs in order: contracts, then producers, then consumers.
3. The rotating captain runs `scripts/demo-smoke.sh` on the demo machine.
4. **If `main` is red, stop the line.** The next train is fixes only. If a fix would take more than 15 minutes, use GitHub's **revert** button instead.
5. Everyone rebases their branches and says what they are claiming next.

CD: `cd-main.yml` republishes the `main-latest` pre-release after every green push to `main`.

**Getting existing work in without chaos.** Everything is triaged at Train 1 (T+0:45).

*Alex's 3 local branches.* They have no history in common with our `main`. For each branch B:

```
git remote add canon https://github.com/sh-arka22/isabelle-revamp.git && git fetch canon
git rebase --onto canon/main --root B          # replay onto main; in bootstrap-file conflicts, keep canon's version
git ls-files | grep -E '\.(vsix|db|jar)$|heaps/' && echo "STOP: binaries"   # must print nothing
git push canon B:alex/<slug> && gh pr create --draft -R sh-arka22/isabelle-revamp
```

If a branch is messy, start fresh instead: `git switch -c alex/<slug> canon/main`, then `git checkout B -- <paths>`, then commit once. At the train each draft is either:
- **kept**: split into PRs of at most 300 lines that fit the §7 layout;
- **parked**: labelled `parked`, left as a draft;
- **closed**: its content stays readable in the closed PR.

Branches never merge into each other.

*ark's existing code.* It goes up as draft `ark/0-initial-import` and is reviewed together in 20 minutes at Train 2. Then it is split by directory into small PRs, which Claude can do mechanically. ark may simply open the small PRs directly.

*retinapeg's overnight research.* One docs-only PR to `docs/research/lean-isabelle-techniques.md`. Their fresh-install notes become `docs/pain-points.md`. Each entry has: severity, OS, step, time lost, proposed fix, and a link to the issue.

*The research prototypes.* These are already pushed as branches, each with a `PROTOTYPE.md`. The owner opens a draft PR from each one:

| Branch | Contents | Issue, owner |
|---|---|---|
| `proto/ci` | `.github/` workflows, the setup-isabelle action, ruleset | #2, ark |
| `proto/proofmap` | `proofmap/isabelle/{DAG_Export.thy, ROOT.template}`, `proofmap/prototypes/{next_sorry,server_dag}.py`, `thys/Demo/`, `tools/tests/fixtures/ax/` | #5 (Demo, Alex) and #6 (ark) |
| `proto/beam` | `beam/ext/`, `beam/session/` (2025-2), `beam/session-2026/`, `beam/tests/` | #7, retinapeg |
| `proto/docs` | `tools/prototypes/{hover_proto,isarref_index,docstat}.py` | #8, retinapeg |

---

## 9. CI design

| Workflow | Required? | Purpose | Target time |
|---|---|---|---|
| `ci.yml` → `ci-ok` | **The only required check** | lint, Python, VS Code, Isabelle build plus map audit for `thys/`, Beam smoke test | ≤ 3 min docs-only; ≤ 5 min warm; ≤ 8 min cold |
| `heavy.yml` | Never required | AFP and HOL-Analysis sessions (ζ(5), Apéry bridge); strict Apéry build without `quick_and_dirty`; export of AFP `Zeta_3_Irrational` as a check at scale; COULD: RC4 canary | ≤ 90 min |
| `cd-main.yml` | No | On a green `ci` run on `main`: replace the `main-latest` pre-release (vsix, dag.json) | about 1 min |

`.github/workflows/ci.yml` (sketch, adapted from the CI scout's files, which passed actionlint):

```yaml
name: ci
on:
  pull_request:
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
  changes:
    runs-on: ubuntu-24.04
    outputs:
      isa: ${{ steps.f.outputs.isa }}
      beam: ${{ steps.f.outputs.beam }}
      py: ${{ steps.f.outputs.py }}
      vscode: ${{ steps.f.outputs.vscode }}
    steps:
      - uses: actions/checkout@v7
      - id: f
        uses: dorny/paths-filter@v4
        with:
          filters: |
            shared: &shared ['.isabelle-version', 'deps.lock', '.github/**']
            isa:    [*shared, 'thys/**', 'proofmap/**', 'tools/revamp/map/**']
            beam:   [*shared, 'beam/**']
            py:     [*shared, 'tools/**', 'contracts/**']
            vscode: [*shared, 'vscode/**', 'contracts/**']

  lint:            # always runs, under 1 min
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - run: scripts/ci/lint.sh
        env:
          HEAD_REF: ${{ github.head_ref }}   # passed via env, never interpolated into the script
  # lint.sh checks:
  #  - conflict markers
  #  - actionlint 1.7.12
  #  - every .thy is ASCII-only
  #  - under thys/ and heavy/: no `axiomatization` / `oracle` / `Thm.add_axiom` / `add_oracle`,
  #    and no `keywords` in theory headers (enforces "no Isar syntax change")
  #  - if HEAD_REF is agent/*: the diff may not add `ML*`, `setup`, `declaration`, `*_setup`,
  #    `sorry`, `oops`, `quick_and_dirty`, nor touch statements.lock, ROOT, contracts/, .github/

  py:
    needs: changes
    if: needs.changes.outputs.py == 'true' || github.event_name != 'pull_request'
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - run: |                     # Ubuntu 24.04 system Python is externally managed: always use a venv
          python3 -m venv .venv && . .venv/bin/activate
          pip install -e 'tools[dev]' && ruff check tools && pytest -q tools/tests
          python -m revamp.contracts validate contracts/examples

  vscode:
    needs: changes
    if: needs.changes.outputs.vscode == 'true' || github.event_name != 'pull_request'
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
      - run: xvfb-run -a npx vscode-test                        # .vscode-test.mjs sets a short --user-data-dir
      - run: npx vsce package --no-dependencies -o "revamp-${GITHUB_SHA::7}.vsix"
      - uses: actions/upload-artifact@v7
        with:
          name: vsix
          path: vscode/*.vsix
          retention-days: 7

  isabelle:
    needs: changes
    if: needs.changes.outputs.isa == 'true' || github.event_name != 'pull_request'
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup-isabelle
        with:
          save-cache: ${{ github.event_name != 'pull_request' && github.ref == 'refs/heads/main' }}
      - run: isabelle build -v -D thys        # parent = HOL, prebuilt in the bundle: no heap cache needed
      - run: |
          python3 -m venv .venv && . .venv/bin/activate && pip install -e tools
          revamp map export -d thys Demo Apery -o out/
          revamp map audit out/ --locks thys --summary "$GITHUB_STEP_SUMMARY"
      - if: always()
        uses: actions/upload-artifact@v7
        with:
          name: proofmap
          path: out/
          retention-days: 7

  beam:
    needs: changes
    if: needs.changes.outputs.beam == 'true' || github.event_name != 'pull_request'
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup-isabelle
      - run: scripts/ci/pide-mcp.sh            # clone the PIDE MCP SHA from deps.lock; components -u (repo + tool_extensions)
      - run: isabelle components -u "$GITHUB_WORKSPACE/beam" && isabelle scala_build
      - run: python3 beam/tests/smoke_test.py --dir beam/session --logic HOL_Beam --theory thys/Demo/Beam_Demo.thy

  ci-ok:                                       # never rename; never add a second job with this name
    if: always()
    needs: [changes, lint, py, vscode, isabelle, beam]
    runs-on: ubuntu-24.04
    steps:
      - env:
          BAD: ${{ contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled') }}
        run: test "$BAD" = "false"
```

`.github/actions/setup-isabelle/action.yml` (key steps):

```yaml
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
- Fetches the AFP tarball named in `deps.lock` into `actions/cache`.
- Uses a heap cache keyed `heaps-<isa>-<afp>-hash(heavy/**/ROOT)`, saved from `main` only.
- Runs `isabelle build -b -R -d $AFP/thys -D heavy` (ancestor heaps) and then the sessions themselves.
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
| **WS-0 Repo, CI, setup** | ark (retinapeg) | bootstrap, `ci`/`heavy`/`cd`, ruleset, `setup.sh`/`doctor.sh`, demo machine | low |
| **WS-M ProofMap and editor** | ark (Alex) | `DAG_Export` port and classifier fix, `revamp map` (export, next, check, lock, audit), hover extension, ProofMap viewer, (SHOULD) Isar outline | medium; Alex reviews the ML |
| **WS-A Agent endpoints, natural language, onboarding** | **retinapeg** (ark) | Beam (`run_at`, `find_theorems_at`), `revamp` MCP server, SKILL.md, `run_holes.sh`, docs index and Isar-Ref index, `docs_lookup`/`docs_search` for physicists and mathematicians, `pain-points.md`, the clean-machine acceptance test of `setup.sh` | medium |
| **WS-X Maths, design, pitch** | Alex (ark) | Demo fixture, Apéry statements and proofs (driving agents), ζ(5) skeleton, `docs/design/ui.md`, demo script, slide claims, review of every statement | high |

**How the workstreams connect** (every connection is a contract, so nobody waits on anybody else):

```
Alex: thys/*.thy + blueprint.yaml + statements.lock ─► ark: revamp map export ─► dag.json (C1)
         │                                                   ├─► ark: viewer (consumes C1 examples first)
         │                                                   └─► retinapeg: revamp MCP next_holes/verify (C4)
         └──► retinapeg: docs index ─► docs.jsonl (C2) ─► ark: hover   ·   retinapeg: docs_lookup/search
retinapeg: Beam run_at (C4) ─► SKILL.md agent loop ─► PRs ─► ark: CI gate ─► Alex: review statements/merge
```

**If there turn out to be only 2 people** (if `retinapeg` is ark's second account):
- ark keeps WS-0 and WS-M;
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
| Theorem statements, definitions, `blueprint.yaml`, `statements.lock` | **Led by humans.** Claude acts as typist and suggester only. | Alex owns them | `statement-change` label + Alex's approval |
| Contracts, ruleset, `.github/`, version pins, CLAUDE.md and SKILL.md | Led by humans | all affected owners | — |
| Merge order, demo script, the claims on slides | Humans only | — | — |

**Guardrails:**
- **Agent count:** at most 2 agents on a 16 GB machine, at most 4 on 32 GB.
- **Per-hole cap:** 20 minutes wall time and a fixed maximum number of turns per hole. Then the hole is labelled `needs-human`.
- **Two strikes:** two gate failures on the same hole also hand it to a human.
- **Kill switch:** stop `run_holes.sh`, then close the `agent/*` PRs.
- **Tagging:** every agent PR is labelled `agent-generated`.

**SKILL.md rules:**
- Try candidates with `run_at` before editing, and write only the winner.
- Write ASCII `\<…>` escapes only.
- Never edit a statement, a ROOT file or a lockfile.
- Never use ML, `axiomatization` or `oracle`.
- One hole per PR.

---

## 12. 24-hour timeline

**Spikes run T+0:45 to T+3:00. Go/no-go is at Train 4 (T+3:00), and fallbacks taken are recorded in ADR-0006.**

| Spike | Owner | Pass | Fallback, decided now |
|---|---|---|---|
| S0 install on all 3 machines | everyone, starting T+0:00 | `isabelle version` = Isabelle2025-2; checking HOL triggers no rebuild | A machine under 16 GB does headless and CI work only. Share the tarball by USB. Use a Codespace or VM. |
| S1 Isabelle in CI | ark | `ci-ok` green, warm run ≤ 5 min | Container job on `makarius/isabelle:Isabelle2025-2` |
| S2 editor | retinapeg | Marketplace yfprojects on 2025-2 with `isabelle.home` set explicitly: symbols render, goals show, saving `∀` writes `\<forall>` | jEdit for the editing shots; our tools don't depend on the editor |
| S3 Beam on 2025-2 | retinapeg | compiles; a failing `by blast` gives `error`; a loop gives `timeout`; md5 unchanged | PIDE MCP's own `get_state` and `sledgehammer`, plus edit-then-check (slower, but sound) |
| S4 AFP heaps | Alex, in the background from T+0:15 | the Prime_Number_Theorem chain builds in ≤ 60 min | ζ(5) skeleton stated over HOL-Analysis `suminf`, with a red bridge node |
| S5 export at scale (after S4) | ark | AFP `Zeta_3_Irrational`: 99 facts `fully_proved` in ≤ 2 min | Export our own sessions only; memoise by theorem serial |
| S6 hover definition lookup | retinapeg | `executeDefinitionProvider` on `append_assoc` returns a location under `$ISABELLE_HOME/src` | Look up the name in the index |

**Rest blocks (staggered, so at least 2 people are always awake):**
- retinapeg: T+11:00–14:00
- ark: T+14:30–17:30
- Alex: T+17:30–20:30

| T+ | Alex | ark | retinapeg | Gate / milestone |
|---|---|---|---|---|
| 0:00–0:15 | Kickoff: D1–D3, ADRs, roles. **Everyone starts the Isabelle2025-2 download.** | | | |
| 0:15–0:45 | Archive his repo; rebase his 3 branches into draft PRs; start S4 | Rename, make public, invite; PR #1 merged; push the prototype drafts | Fresh install by the README, timing every step | **Train 1:** triage drafts, assign #1–#12 |
| 0:45–2:15 | #5 Demo fixture; draft C3; `ui.md` v0 | #2 CI (S1); draft C1 and the `revamp` part of C4 | S2, S3; draft C2 and the `isabelle` part of C4 | **Train 3 (2:15): contracts frozen (#3)** |
| 2:15–3:00 | Review the contracts | Ruleset applied; caches seeded | S6 | **Train 4 (3:00): GO/NO-GO** |
| 3:00–5:15 | #11 Apéry statements B1–B12 and lockfile | #6 export, classifier fix, audit | #7 Beam in the repo and CI; #8 docs index | **M1 (5:15): vertical slice on `main`.** Demo → dag.json → viewer; `run_at` works from Claude Code; hover card on a Demo lemma |
| 5:15–9:00 | Drive agents on Apéry leaves; review | #9 hover; #10 viewer | #12 `revamp` MCP and SKILL.md; #14 agent runner | **M2 (9:00): agent loop end to end**, at least 4 Apéry nodes green |
| 9:00–12:00 | Apéry proofs; ζ(5) definitions written by a human | #13 `setup.sh`/`doctor.sh`; viewer polish | Isar-Ref hovers; 2–3 parallel agents; pain points turned into issues (asleep from 11:00) | **Dry run (12:00)** of all of §2 |
| 12:00–14:00 | Review agent waves; ζ(5) statements | Cut-line fixes only | (asleep) | **CUT LINE (14:00): full run on `main`, tag `demo-v1`, video v0** |
| 14:00–18:00 | ζ(5) leaves with agents; demo script (asleep from 17:30) | (asleep 14:30–17:30) | SHOULD list: parallel agents, outline, `docs_search` | **FEATURE FREEZE (18:00).** Later merges must be additive and behind a setting (`revamp.outline.enabled`, …). |
| 18:00–21:00 | (asleep until 20:30) | Set up the demo machine from `main-latest`; record the fallback video at 19:30 | (asleep from 18:00) | |
| 21:00–24:00 | Rehearsals at 21:00 and 22:30; claims check; pitch | Owns the demo machine; tag `demo-final` | Backup operator; stages the golden hole | Demo at T+24 |

**36-hour variant:** the cut line moves to T+22, the freeze to T+28, and rehearsals to T+31 and T+33. The extra hours go to more green ζ(5) nodes, the Isar outline and "Read as paper", and the RC4 canary.

**Demo-safe rule:** `demo-v1` on its own must be able to give the whole §2 demo using Apéry alone. If anything merged later breaks, turn its setting off or demo from the tag.

---

## 13. The first 12 issues

1. **Bootstrap and canonical repo** (ark)
   - Commit 0 (`PLAN.md`) is on `main`; PR #1 with the §8 skeleton is merged.
   - The repo is renamed (or the decision not to is recorded) and public. Both teammates have write access and have posted their handle, OS and RAM on #1.
   - The `hymanimy/isabelle-revamp` README points here, and that repo is archived.
   - `git ls-files | grep -E '\.(vsix|db|jar)$|heaps/'` prints nothing.
2. **CI gate, setup-isabelle, ruleset** (ark)
   - actionlint is clean.
   - A docs-only PR reaches `ci-ok` in ≤ 3 min. A `thys/` PR takes ≤ 5 min warm and ≤ 8 min cold.
   - CI turns red for each of: a broken theory, a `.thy` with non-ASCII bytes, `keywords` in a theory header, and `axiomatization` under `thys/`.
   - The cache `isabelle-dist-Linux-X64-Isabelle2025-2` exists after one `workflow_dispatch` on `main`.
   - The ruleset is active: a direct push to `main` is rejected, only squash merge is offered, and head branches are deleted after merge.
3. **Contracts v1** (ark leads; all three approve)
   - C1–C4 schemas and golden examples are in `contracts/`, with `schema_version: 1`.
   - CI validates the examples.
   - Frozen at T+2:15.
4. **Toolchain on 3 machines and the pain-points log** (retinapeg; everyone takes part)
   - Each machine reports: `isabelle version`, the time for the HOL no-op build, RAM and OS.
   - S2's checklist passes on the demo machine.
   - `docs/pain-points.md` has at least 10 entries, each with severity, OS, step, time lost, fix and an issue link.
   - The demo machine is chosen (≥ 16 GB).
5. **Demo fixture `thys/Demo`** (Alex)
   - Parent is HOL, with `quick_and_dirty`.
   - It contains:
     - a plain `sorry`;
     - an inner `have … sorry`;
     - a lemma that rests only on a hole;
     - **a lemma with its own `sorry` that also uses a sorry'd lemma** (the classifier regression case);
     - a fully proved lemma;
     - a definition;
     - a `text ‹›` doc, a `\<^marker>‹description ‹…››` and a `\<comment>`;
     - `Beam_Demo.thy`.
   - `EXPECTED.json` lists the expected status and `doc_source` for each fact.
   - CI is green.
6. **ProofMap export, lock and audit** (ark; Alex reviews the ML)
   - `revamp map export -d thys Demo` validates against C1 and uses repo-relative paths and an edges array.
   - Statuses equal `EXPECTED.json`, including the mixed case.
   - `revamp map next Top.main_target` ranks `dbl_mono_open` first, with leverage 3.
   - `audit` fails on each of: a changed statement hash, the `axiomatization where cheat: False` fixture, and a new oracle. It passes on a legitimate proof.
   - Exporting Demo takes ≤ 60 s in CI.
7. **Beam component** (retinapeg)
   - `beam/` is ported with both soundness fixes, LGPL-3.0 headers and its own `LICENSE`. PIDE MCP is pinned in `deps.lock`.
   - `scala_build` exits 0 in CI.
   - The smoke test on `["by simp","by blast","by foo","apply (induct n)"]` gives the expected verdicts:
     - a failing `by blast` is **not** reported as `proved`;
     - `by foo` gives `error`;
     - `(rule ccontr)+` gives `timeout`;
     - the file's md5 is unchanged;
     - `find_theorems_at` returns at least 1 result.
   - Results carry the normalised `verdict` field. 16 candidates take ≤ 3 s locally.
8. **Docs index and Isar-Ref index** (retinapeg)
   - `revamp docs index $ISABELLE_HOME/src/HOL thys` validates against C2, runs in ≤ 60 s and prints coverage %.
   - `doc_source` is correct for the fixture's three doc styles, and the adjacency rule stops at headings.
   - `data/isar-ref.jsonl` has at least 150 entries.
   - The Markdown conversion has unit tests.
9. **VS Code companion: hover cards** (ark)
   - Activates on `onLanguage:isabelle` next to yfprojects, with no hard dependency on it.
   - Uses the §6.3 card layout and badge.
   - p95 ≤ 150 ms on `append_assoc` and on an Apéry lemma.
   - `simp` and `obtain` show the Isar-Ref text.
   - Adding a marker and saving updates the card.
   - A golden-card unit test passes; the PR has light and dark screenshots; CI uploads the vsix.
10. **ProofMap viewer** (ark; Alex signs off the look)
    - Command "Isabelle Revamp: Show ProofMap".
    - Cytoscape with the dagre layout, bundled by esbuild (no CDN). Colours come from `--vscode-*` theme variables, and the legend follows §6.2.
    - Clicking a node opens file:line; hovering shows the statement and natural-language description.
    - With `export --watch`, a save turns the node green in ≤ 30 s.
    - A synthetic 500-node graph renders in ≤ 2 s.
11. **Apéry blueprint statements** (Alex)
    - `thys/Apery` has parent HOL and imports `Complex_Main`.
    - B1–B12 each have a `text ‹›` description, a paper reference and a marker.
    - Natural-number subtraction is avoided (`k < n` assumptions, or `int`/`real`).
    - The main theorem `(λn. (-1)^n / (real (n+1)^3 * real ((2*(n+1)) choose (n+1)))) sums (2/5 * (∑n. 1/real (n+1)^3))` is assembled from its children (Alex fixes the exact indices).
    - `blueprint.yaml` and `statements.lock` are committed. The map shows at least 12 nodes.
12. **`revamp` MCP server and SKILL.md** (retinapeg; the map functions come from #6)
    - It provides the §6.1 tools. `claim` uses the PR-existence lock; `verify` runs export and audit in the worktree.
    - `.mcp.json.example` registers `isabelle` and `revamp`, and `/mcp` in Claude Code lists both.
    - Given only "close the highest-leverage hole in Apery", Claude picks `next_holes[0]`, uses `run_at`, and `verify` passes. Claude then opens a PR labelled `agent-generated`.
    - A statement edit or an `axiomatization` is rejected by both `verify` and CI.

**Next up:**
- #13 `setup.sh`/`doctor.sh` (ark). Accepted when retinapeg runs it verbatim on a clean machine with no "blocker" pain points. It also warns about other `~/Isabelle20*` directories.
- #14 `agents/run_holes.sh` (retinapeg).
- #15 ζ(5) skeleton in `heavy/` (Alex). Use the AFP `θ_asymptotics`. Define the Hankel determinant with the Leibniz formula over `{p. p permutes {..<K}}` to avoid building the Jordan_Normal_Form heap.
- #16 demo script and fallback video (Alex).
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
| Batch export (`isabelle build -e`) | Live `isabelle server` with `use_theories` and `export_pattern` | Deterministic and identical to CI | If refreshes of ≤ 30 s feel slow |
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
| Speculative output leaks into the real document; lines off by one ("Bad context for command") | M / M | The print-exec-id fix is tested; snap to the nearest command; note in SKILL.md |
| An agent cheats (axioms, statement edits, ML) | M / H | Agent lint, `statements.lock`, axiom/oracle audit, a human merges. The rejection is part of the demo. |
| The classifier misses holes | M / M | The #5 regression fixture plus the lexical `sorry` scan |
| Symbol corruption (Unicode written into a `.thy`; UTF-16 versus symbol offsets) | M / M | Lint for ASCII; agents write escapes; hover looks up by line and name, never by raw offset |
| Memory: about 2.2 GB per session, plus the PIDE leak in long sessions | M / M | Agent cap; one fresh session per hole; a restart script |
| Merge conflicts in a single `.thy`, `package.json` or ROOT | M / M | One cluster of holes per theory file; extension contributions declared up front; worktrees; rebasing at trains |
| AFP heaps take hours | H / L (they only matter after the cut line) | Background build at T+0; `heavy.yml` only; S4 fallback |
| yfprojects changes or breaks | M / M | Pinned Marketplace version; our extension uses standard APIs only |
| The live demo is nondeterministic | M / H | Pre-warmed session, a rehearsed golden hole that closes in ≤ 60 s, `dag.json` snapshots to replay, fallback video |
| Overclaiming (ζ(5) "proved by us"; a Prove2Me or Anthropic affiliation) | M / H | Fixed wording in `demo-script.md`; our own name ProofMap; credits in the README |
| Mixed licences | L / M | `beam/` is LGPL-3.0 on its own; mo271's code is used for structure only, with credit; nothing copied from danromik; Fauzan's PDF linked only |
| The repo stays private or keeps the hyphen | L / M | Rules held by convention plus `ci-ok`; `threads=2` on 2-CPU runners; use absolute paths |
| `ci-ok` renamed or duplicated | L / H | Comment in the YAML; ark owns `.github/` |
| Scope creep (OCaml, an analysis library, the full ζ(5) proof) | H / H | §4 is binding. At the T+12 dry run, anything not on the cut-line list is cut. |

---

## 16. Glossary

- **Isabelle/HOL:** a proof assistant (Isabelle) plus its main logic, Higher-Order Logic.
- **Poly/ML:** the Standard ML runtime that runs the prover: the kernel, HOL and tactics.
- **Isabelle/Scala:** the JVM layer. It holds the document model (PIDE), builds, the server and the editor back ends.
- **PIDE (Prover IDE):** Isabelle's asynchronous document model. It processes theories command by command and reports markup and messages.
- **Session:** a named group of theories, defined in a `ROOT` file; a `ROOTS` file lists session directories. Each session has a parent, for example `HOL`.
- **Heap:** a saved Poly/ML image of a built session. HOL ships prebuilt; building HOL-Analysis or AFP sessions takes minutes to hours.
- **Theory (`.thy`):** a source file, made of a sequence of **commands** such as `lemma`, `definition` or `text`.
- **Isar:** Isabelle's structured proof language (`proof … qed`, `have`, `show`, `obtain`, `case`). An **apply script** is the tactic style (`apply …` then `done`). We never change Isar syntax.
- **Proof method:** a tactic used in a proof, such as `simp`, `auto`, `blast` or `induct`.
- **`sorry` / `oops`:** `sorry` leaves a hole, implemented as the **`skip_proof` oracle`. `oops` abandons a proof.
- **`quick_and_dirty`:** a session option that allows `sorry` in batch builds, which otherwise reject it.
- **Oracle:** a trusted step outside the kernel. **`axiomatization`** adds axioms; any non-definitional axiom is treated as cheating.
- **`Thm_Deps`:** the ML module that reads the theorem dependencies recorded by the kernel. `has_skip_proof` detects `sorry`.
- **AFP (Archive of Formal Proofs):** Isabelle's library of contributed developments. For example, `Zeta_Function`, `Prime_Number_Theorem` (which contains `θ_asymptotics`) and `Zeta_3_Irrational`.
- **Cartouche `‹…›` and symbols `\<forall>`:** Isabelle's quoting, and its ASCII escape codes for mathematical symbols. Files stay ASCII; editors render the symbols.
- **Marker:** `\<^marker>‹description ‹…››` is a built-in metadata annotation inside a command. It is one of our docstring sources.
- **Locale:** Isabelle's module system for parameterised theories.
- **Sledgehammer:** a tool that calls external automated provers and proposes proofs.
- **LSP / `vscode_server`:** the language server protocol, and Isabelle's server that implements it, plus custom `PIDE/*` messages.
- **Infoview / goal panel:** the side panel that shows proof goals at the cursor; yfprojects provides ours.
- **Overlay / query operation:** a PIDE mechanism that runs extra computation on a command's state without editing the document. Beam is built on it.
- **MCP (Model Context Protocol):** the JSON-RPC protocol through which Claude Code calls tools.
- **PIDE MCP:** kappelmann's headless Isabelle MCP server (LGPL-3.0).
- **Beam / `run_at`:** our speculative "try these candidate proofs here" tools, named after Lean Beam's `runAt`.
- **ProofMap:** our theorem DAG of nodes, edges and statuses, used by the viewer, the agents and the CI gate.
- **Blueprint (leanblueprint):** a Lean convention of a human-written dependency graph, with a colour legend we reuse.
- **`components -u`:** registers an Isabelle component (such as Beam or PIDE MCP) for the current Isabelle version, in `$ISABELLE_HOME_USER/etc/components`.
- **`ISABELLE_HOME` / `ISABELLE_HOME_USER`:** the installation directory, and the per-user settings and heaps directory (`~/.isabelle/Isabelle2025-2`).
- **`ci-ok`:** the single required CI check.
- **Train:** our 45-minute integration huddle.
- **Cut line:** T+14. The tag `demo-v1` must be able to give the whole demo on its own.
- **Golden hole:** a pre-rehearsed `sorry` that Claude closes live on stage.