# PLAN.md v2: re-baselined after Leo's extension and Alex's feedback

**isabelle-revamp: system design and 24-hour plan**

> **Changelog.** v1 = the merged plan. v1.1 = the 34 review fixes, the agent architecture (§11A) and the first-hour checklist (§0). v1.2 = pointers only: `docs/plans/isabelle-mcp.md` (Isabelle-MCP as a prover interface, spike S7) and `docs/plans/vscode-companion.md` (plan items 9 and 10). **v2 = re-baselined at T+4:30** after half a day: the team is four people; Leo's VS Code extension (M1–M9) exists and works on the stock `isabelle vscode_server`, so the yfprojects dependency is dropped and the "companion extension" is folded into `extension/`; Alex's 18 hands-on items are built on five feature branches and merged into `integrate/all` (adversarial review next); the ProofMap viewer is built inside `extension/` on `feat/proofmap`; the agent architecture has two coexisting designs (A, shared session through the MCP bridge; B, headless); `out/claims.json` links agents to the viewer; every T+ time and the rest rota are re-baselined; §0 is now "Status now and the next hour"; §1 is a note.

> **Repo:** `sh-arka22/-isabelle-revamp` (D1: the only repo; D2 rename to `sh-arka22/isabelle-revamp` still recommended, not done). **Kickoff:** 09:39 BST, Sat 17 Oct 2026 (first commit). **Now:** about 14:09 BST = **T+4:30**. **Demo:** assumed at T+24 = about 09:40 BST, Sun 18 Oct. *This is an assumption: confirm the demo slot with the organisers at the next train.* Times are T+h:mm from kickoff; wall clock = 09:39 BST + T. The 36-hour variant is in §12.
> **Team (four):**
> - **Alex Hyman** (`hymanimy`): maths, Isabelle, design, pitch.
> - **ark** (`sh-arka22`, repo owner): repo, CI, ProofMap export and viewer.
> - **retinapeg**: agent endpoints (Beam, Isabelle-MCP), natural-language tools, onboarding, setup scripts.
> - **Leo Aarons-Ditson**: built the VS Code extension M1–M9, the MCP bridge and Ask Isabelle; owns `extension/` UX and `mcp/`.
>
> **Leo pushes to `sh-arka22`'s repo from now on.** His work so far lives on `hymanimy/isabelle-revamp:leo` and is already merged into `integrate/all` (PR #6). Alex's repo gets the one-line pointer README and is archived (D1 stands). Commands use `R`: `R=sh-arka22/isabelle-revamp` after the rename, or `R=sh-arka22/-isabelle-revamp` if ark keeps the old name.

---

## 0. Status now and the next hour

### Where we are at T+4:30

**DONE**
- `main` = PLAN v1.2 + README (facelift) + `tools/prototypes/` (docs index prototype: `hover_proto.py`, `isarref_index.py`, `docstat.py`). PRs **#1** (`proto/docs`), **#2** (plan v1.1) and **#5** (README) are merged.
- **The extension exists and works** (Leo, `extension/`, M1–M9): Isar highlighting; display-only Unicode symbols (ASCII on disk); the **Isabelle Goals** sidebar with goal at caret and *unfinished (sorry)* / *Proof error* / *fully checked* states; `examples/Sqrt2.thy` fully proved; the seven-tool **MCP bridge** (`open`, `edit`, `goals_at`, `errors`, `status`, `sorry_positions`, `processing_status`; `mcp/server.py`, FastMCP, two agents at once, Claude Code or Codex); the **Swarm** board (six-step proof filled live by agents); **Ask Isabelle** (Claude Code streamed inside the sidebar); live acceptance checks `scripts/check_m3.sh` … `check_m9a.sh`. It uses the **unmodified** `isabelle vscode_server` in stock VS Code.
- **Alex's 18 items are built** on five feature branches in the planning container (`feat/quickwins` 1–5, `feat/symbols` 6/7/11, `feat/goals` 8/12–16, `feat/decorations` 9/10/18 plus server semantic colours, `feat/sledgehammer` 17), each with a `scripts/check_<feature>.sh` (six scripts: goals has `check_goals.sh` and `check_goals2.sh`) that passed on the headless rig (§9) and a `docs/PROGRESS.md` entry; items 15 and 16 are committed on `feat/goals` (`cf345d2`, `3de5cd3`). **All five branches are merged into `integrate/all`** (T+4:35, `--no-ff`, in the order quickwins → symbols → decorations → sledgehammer → goals; merge commits `cc53035`…`ce9df04`, fix-ups `c8a6486` and `ea5ac75`). On the merged tree `npm run compile` is clean, every `unit_*.cjs` passes, and the rig passed `check_m3.sh` (12 PASS), `check_quickwins.sh` (24), `check_symbols.sh` (15), `check_decorations.sh` (16), `check_sledgehammer.sh` (17), `check_goals.sh` (14), `check_goals2.sh` (18), `check_m4.sh` (28), `check_m6.sh` (46), `check_m9a.sh` (45) and `check_m8.sh` (66), all exit 0 (`docs/PROGRESS.md`, "Integration of Alex's feedback round").
- Pain points: `docs/PAINPOINTS.md` has 35 entries from Leo's fresh install (plan item 4 wanted 10).
- Plans: `docs/plans/vscode-companion.md` (items 9, 10), `docs/plans/isabelle-mcp.md` (S7), `AGENTS.md`, `CLAUDE.md`.

**IN PROGRESS**
- **Integration:** PR **#6** `integrate/all` is open (Leo's extension + #3 + #4 + the five `feat/*` branches; merges cleanly into `main`). Next: the adversarial review of the 18 items by a human who did not build them (§8), fixes as commits on `integrate/all`, then #6 is merged.
- **ProofMap viewer** (plan item 10) is built on `feat/proofmap` inside `extension/` (commit `8b770e5`: `src/map/`, `webview/map/` bundled by `esbuild.mjs`, `contracts/claims.schema.json` with README and example, `unit_proofmap.cjs` 11 checks, `check_proofmap.sh` passed on the rig, `perf_proofmap.cjs` 500 nodes / 740 edges in 564–623 ms to first paint); not yet on `integrate/all`.
- PRs **#3** (Isabelle-MCP plan) and **#4** (companion plan + `AGENTS.md`/`CLAUDE.md`) are open; both are inside #6.

**NOT STARTED**
- The **skeleton PR** (LICENSE BSD-3, CONTRIBUTING, `.gitignore` additions, `.gitattributes`, `.isabelle-version`, `deps.lock`, `contracts/`, ADRs, `.claude/settings.json`).
- The **20 issues** (0 exist) and the labels. **Issue numbering:** PRs already occupy #1–#6, so plan items are created as issues titled **`P<N>: <title>`** and referenced as **"plan item N"**; never assume issue #N = item N.
- **CI** (`proto/ci` unmerged; no `ci-ok` has ever reported), the ruleset, the squash-only setting, the rename (D2). `proto/{ci,proofmap,beam,docs}` are unchanged since kickoff.
- `thys/` (Demo fixture, Apéry), `contracts/`, ProofMap export (item 6), Beam (item 7), the docs index as a tool (item 8), the `revamp` MCP server (item 12), `setup.sh`/`doctor.sh`/`demo-smoke.sh` (item 13), `run_holes.sh` (item 14), the ζ(5) skeleton (item 15), the demo PR and video (item 16). Spikes S1 and S3–S8 have not run (S2 is retired, S0 is half done); the Train 4 go/no-go is overdue.

### The next hour, T+4:30–5:30 (14:09–15:09 BST)

**Everyone, 5 minutes at T+4:30 (Train 6):**
- [ ] Confirm the demo slot (assumed T+24, about 09:40 BST Sunday) and the demo machine (Leo's Mac, where M1–M9 were accepted, unless someone has 32 GB).
- [ ] Confirm Leo's GitHub handle; ark invites him; **Leo pushes to `$R` from now on** (`git remote set-url origin https://github.com/$R.git` in his checkout; branch `leo/<item>-<slug>`).
- [ ] Agree who runs the skeleton PR (recommended: ark, because it needs the owner for the ruleset and settings; retinapeg as backup if ark is on #6).
- [ ] Claude budget: agree a usage cap for the overnight agent waves and keep quota for the live demo (Ask Isabelle uses the signed-in Claude Code CLI on the demo machine).

**ark, T+4:35–5:30:**
- [ ] Create the 20 issues as `P<N>: <title>` (§13 list) and the eight labels:
  ```bash
  R=sh-arka22/-isabelle-revamp        # or sh-arka22/isabelle-revamp after D2
  titles=( "Bootstrap and canonical repo" "CI gate, setup-isabelle, ruleset" "Contracts v1 and tools/ skeleton"
           "Toolchain on 4 machines and pain-points log" "Demo fixture thys/Demo" "ProofMap export, lock and audit"
           "Beam component" "Docs index and Isar-Ref index" "Hover cards in extension/" "ProofMap viewer in extension/"
           "Apéry blueprint statements" "revamp MCP server, claims.json and SKILL.md" "setup.sh, doctor.sh and demo-smoke.sh"
           "agents/run_holes.sh" "ζ(5) skeleton in heavy/" "Demo script, fallback video, demo PR, snapshots"
           "Isar outline polish and Read as paper (stretch)" "isa2uni textconv (stretch)" "docs_search (stretch)"
           "Isabelle2026-RC4 canary (stretch)" )
  for i in "${!titles[@]}"; do gh issue create -R "$R" --title "P$((i+1)): ${titles[$i]}" --body "PLAN.md §13, plan item $((i+1))"; done
  for l in agent-generated statement-change contract-change parked needs-human full-ci do-not-merge pain-point; do gh label create "$l" -R "$R"; done
  ```
- [ ] Skeleton PR (plan item 1, §8): merged by T+5:30. **Merge PR #6 first, as a merge commit** (the squash-only setting is not applied yet), so Leo's M1–M9 history survives; everything after #6 is squash-merged.
- [ ] D2 rename, make the repo public, invite Leo (and check Alex's and retinapeg's invites are accepted).

**Leo, T+4:30–5:30:** review the merged `integrate/all` (the hand-resolved conflicts in `extension.ts`, `package.json` and `goalsView.ts`: activation order, `rebind(client)` on restart, one pretty-print margin for sidebar and panel); re-run `check_m3.sh` plus the six `check_<feature>.sh` on his Mac with the real VS Code; decide with ark whether `isabelleRevamp.decorations.semanticColours` stays on by default now that the grammar colours inner syntax too (the integration entry's "Next").

**retinapeg, T+4:30–5:30:** S3 and S7 now, in parallel (Beam on 2025-2; `isabelle-mcp` 0.6.0 on Demo); the go/no-go is at **Train 7 (T+5:15)**. Draft the `isabelle-beam` and `isabelle-lsp` parts of C4; note that the bridge's seven tools are C4's server `isabelle` as implemented.

**Alex, T+4:30–5:30:** archive his repo with the pointer README (D1); start S4 (AFP heaps) in the background on the ζ(5) machine; `thys/Demo` from `proto/proofmap` (item 5) and the first Apéry statements B1–B12 with `sorry` on its own line (item 11); the demo-beat order in §2 is his to sign off.

| Train | T+ | BST | Agenda |
|---|---|---|---|
| 6 | 4:30 | 14:09 | this checklist; demo slot; Leo's remote; skeleton owner |
| 7 | 5:15 | 14:54 | #6 merged; five branches on `main`; **S3/S7 go/no-go** (ADR-0006); C1–C3 frozen |
| 8 | 6:00 | 15:39 | CI PR green; C4 frozen (with the `claims.json` addendum) |
| 9 | 6:45 | 16:24 | `thys/Demo` + Apéry statements in; export spike result |

---

## 1. How the plans scored (note)

v1 scored three candidate plans (demo-first A, risk-first B, collaboration-first C) on demo impact, feasibility, collaboration hygiene, technical correctness and fidelity to Alex's rule; **Plan C won (42/50) and is the spine**, with the demo-beat design, the Isar-aware UI principles, "revert if a fix takes more than 15 min", the WIP limit, settings flags after the cut line and the name **ProofMap** taken from A, and the spikes with pre-decided fallbacks, the ASCII-only lint, the overnight waves and the textconv idea from B. The eight fixes none of them had still stand: (1) the status-classifier bug (`record_proofs = 1`, own `skip_proof` oracles minus the dependencies' union; §6.2); (2) **ProofMap**, not "Blueprint"; (3) AFP outside the required gate; (4) 0 required approvals plus a review table; (5) one prover per headless agent; (6) no CDN in the viewer; (7) *superseded:* "no custom yfprojects build" is moot, we ship our own extension; (8) no downloaded baseline in the gate.

---

## 2. Guiding principle, goal, 3-minute demo

**Alex's key rule, ADR-0004:**

> *Isabelle works extremely well at the research and logic level. Its problem is that it integrates poorly with other apps and systems. That is why it is hard to modify, looks dated, and has little agent support.*

What we build follows from that rule:
- **We never change** the kernel, HOL, Isar syntax or outer keywords, and we never patch Isabelle. The extension talks to the **unmodified** `isabelle vscode_server`. Lint enforces the rest: no `keywords` in theory headers, no `axiomatization` or `oracle` in `thys/` or `heavy/`.
- **We borrow from Lean for tooling only:** InfoView-style goals (messages, facts, pin, pause), hover cards, gutter ticks, a dependency DAG, Beam-style `runAt`, elan-style pinning. We never borrow syntax.
- **The UI should suit Isar, not copy Lean.** Isar is a structured document: show enclosing proof levels, `fix`/`assume`/`this`/cases, an outline at the level of steps, and a "Read as paper" mode. The Goals view already shows *Goal / Facts / Messages* with the `this:` facts coloured; the outline and breadcrumbs show theorems and lemmas as document symbols.
- **Modern and clean, even where it is cosmetic:** colours come from the user's VS Code theme and Isabelle's own light/dark palette; hovers are Markdown cards; no raw `\<forall>` appears in any surface we own (ASCII stays on disk); every UI PR includes a screenshot; Alex signs off the look in `docs/design/ui.md`.

**Product goal:** keep Isabelle/HOL's logic exactly as it is, and make it pleasant and agent-ready from modern tools: a modern Isar editor in stock VS Code; Lean-style hover docs; a theorem dependency map (**ProofMap**) whose edges and statuses come from what the kernel recorded; agents that work in the human's editor (Design A) or headless in parallel (Design B), always behind a kernel-checked gate.

**Demo, 3 minutes.** Everything runs locally from `main-latest`. A video recorded at T+19:30 is the fallback.

| Time | Beat | On screen | Built by |
|---|---|---|---|
| 0:00–0:20 | The problem | Four measured pain points from `docs/PAINPOINTS.md` (dead download link, unsigned app, the editor lock-in, `\<forall>` in diffs, no agent API). Alex: *"The logic is world-class. The integration isn't."* | Leo (log), retinapeg |
| 0:20–0:55 | A modern editor built for Isar | Stock VS Code with our extension. Open `Apery/…thy`: Unicode symbols on screen, ASCII in `git diff`; the Goals panel opens beside the editor on its own; click a `have`: coloured goal, facts, messages, the done banner; hover `sqrt`: type and constant; hover `geometric_sums`: the Markdown card with the doc "from preceding text" (item 9); the outline and breadcrumbs; gutter ticks on proved theorems and the marker on the unfinished one; type `\noteq` → ≠. "No syntax changed; the server is Isabelle's own." | Leo, ark (card) |
| 0:55–1:30 | ProofMap | **Isabelle Revamp: Show ProofMap** on the Apéry fixture, live: about 12 nodes; statuses from the kernel (`Thm_Deps`, positioned `skip_proof` oracles), not hand-written; click a node → file:line; the legend. Then the ζ(5) blueprint: 28 nodes, *n* green, the numerics node "post-hackathon". | ark, Alex |
| 1:30–2:30 | Claude closes a hole, live | **Design A:** the golden hole is re-opened as `sorry` on stage; **Isabelle: Ask** → *prove this*; Claude reads and edits the same buffer through the MCP bridge, the goal changes under the caret, Sledgehammer/try0 proposes `by simp`, click-to-insert, the gutter tick turns green, the ProofMap node turns green, *kernel-checked ✓*. **Or** the Swarm board with two agents filling six cards. Then **the gate rejects a cheat:** the pre-made draft PR on `demo/weaken-…` that quietly weakens a statement passes the agent lint and fails the audit with "statement_sha1 changed"; the viewer's events feed shows the same warning. | Leo (A), retinapeg/ark (gate), Alex (demo PR) |
| 2:30–3:00 | Close | Same kernel, same HOL, same Isar. The honest ζ(5) line (§4). Next: Isabelle2026 (24 Oct), the headless waves (Design B), proposing Beam to PIDE MCP upstream and pieces of the extension to Isabelle/VSCode. | Alex |

For the live beat the golden hole has `sorry` on its own line and we say so; the presenter has no unsaved edits in that file. Parallel agent work (Design B) is shown as the overnight PR list and the viewer's events feed, not live.

**About "Prove2Me":** real (prove2.me, Columbia DAPLab, arXiv 2608.28433), **Lean only**, closed-source server. We build the same idea natively for Isabelle under our own name, **ProofMap**, credit Prove2Me, leanblueprint and LeanArchitect in the README, and never use their name or imply affiliation.

---

## 3. Requirements

### Functional

| ID | Requirement | Status |
|---|---|---|
| FR0 | **Modern Isar editor in stock VS Code** on the unmodified server: highlighting, display-only symbols with an input method, Goals sidebar and panel, outline, decorations, gutter ticks, Sledgehammer/try0, restart, library locking (Alex's 18 items, §13.1). | built; merged on `integrate/all`; adversarial review pending |
| FR1 | **Hover:** (a) the server's hover for values, types and constants, decoded and rendered as an `isabelle` code block (item 3, built); (b) **hover cards** for facts, constants and types with statement, doc with its source labelled, kind, full name, breadcrumb, file:line, and Isar-Ref docs for commands, methods and attributes (plan item 9). | (a) built; (b) not started |
| FR2 | **ProofMap export** of a session's theorem-level DAG from kernel-recorded dependencies; `Session.Theory.fact` IDs, status, optional `nl`, source link. | not started (prototype on `proto/proofmap`) |
| FR3 | **ProofMap viewer** inside `extension/`: leanblueprint legend, click → file:line, re-renders on change, agent claims shown from `claims.json`, events feed, replay snapshots. | built on `feat/proofmap`; not yet on `integrate/all` |
| FR4 | **Integrity gate** in CI and `verify`: fails on a changed statement hash, an axiom outside `axioms.allow`, a new oracle and (in `verify`) hole laundering; status regression is a warning. The viewer mirrors the warnings. | not started |
| FR5 | **Agent endpoints over MCP.** Server `isabelle` (**the bridge, Design A**, built): the seven tools. Server `isabelle-beam` (**Design B**): `run_at`, `find_theorems_at`, PIDE MCP built-ins; proposed `isabelle-lsp` (S7). Server `revamp`: `map_status`, `next_holes`, `node_context`, `claim`, `verify`, `docs_lookup`; stretch `docs_search`. | bridge built; the rest not started |
| FR6 | **Agent loop (B):** one hole → one draft PR (the lock) → one worktree → a human merges. **Agent loop (A):** Ask Isabelle or a Swarm client edits the open buffer; completion is kernel-checked by `status()`; nothing reaches `main` without the gate. | A built; B not started |
| FR7 | **One-command setup:** `scripts/setup.sh` reads the pins, installs our vsix from `main-latest` (or `npm ci` + F5 from source), registers the MCP servers, writes gitignored local settings. `doctor.sh` diagnoses. No third-party editor extension is installed. | not started |
| FR8 | **Maths content:** Apéry fully proved; the ζ(5) blueprint skeleton. | not started |
| FR9 | **Pain-point log** with each entry turned into an issue. | 35 entries in `docs/PAINPOINTS.md`; issues not filed |

### Non-functional targets

| Area | Target |
|---|---|
| Hover latency | Card p95 ≤ 150 ms from the index; definition lookup budget 100 ms. **A card never waits on the prover.** The server hover (item 3) is as fast as the server. |
| Goals | Ours. Updates ≤ 1 s after a caret move on the demo theories (150 ms debounce; measured by `check_m3.sh`). Whole open theory is checked (`vscode_caret_perspective=0`). |
| `run_at` | One candidate ≤ 1 s; 16 in parallel ≤ 3 s; file unchanged (md5); 10 s default timeout per candidate. |
| ProofMap | Save to green ≤ 30 s on Apéry from one export build (S5, item 10). Viewer: 500 nodes ≤ 2 s. Watcher: debounced, partial-write retry. |
| Install | `setup.sh` ≤ 10 min excluding the Isabelle download; idempotent; never writes into the Isabelle distribution. |
| CI | `ci-ok` ≤ 3 min docs-only; ≤ 5 min warm, ≤ 8 min cold with Isabelle; the `vscode` job ≤ 4 min (compile + unit tests, no editor). Headless acceptance only in `heavy.yml`. |
| Live demo | Golden path succeeds in 5 of 5 rehearsals; nothing needs the network except Claude Code; demo machine ≥ 16 GB (32 GB preferred); fallback video recorded. |
| Soundness | Nothing an agent writes reaches `main` without a kernel batch build and the gate. Bridge `status()`, Beam and Isabelle-MCP verdicts are advisory for merging. |
| Look | Webviews use `--vscode-*` variables and Isabelle's light/dark palette; readable in light, dark and high contrast; CSP `default-src 'none'`, nonce'd scripts, no `innerHTML` with server content. |
| Platforms | macOS arm64 (demo) and Linux x86_64 (CI, the headless rig) must work. Windows best effort (Cygwin). |

### Constraints

- **Time and people:** about 19.5 h left, four people.
- **Isabelle2026:** final release 24 Oct, after the demo; RC4 is out. We pin **Isabelle2025-2** (ADR-0002, §14).
- **Upstream churn:** the maintainer has called the language server "a failure"; `PIDE/*` messages are unversioned. We depend on them through the extension (M1 found the plaintext serialiser broken; we request HTML and convert) and `docs/PROTOCOL_NOTES.md` records every shape we rely on. No third-party extension is in the path any more.
- **Licences:** our repo is BSD-3. PIDE MCP is LGPL-3.0 (Beam is a separate component with its own licence). Pieces ported from yfprojects (`colors.ts` palette, outline ideas) and from Isabelle's own extension are BSD-3 and credited in `extension/THIRD_PARTY_NOTICES.md`. Romik's ζ(5) repo has no licence (cite only); mo271's is Apache-2.0 (module list, credited); Fauzan's PDF is All Rights Reserved (link only).
- **Resources:** about 2.2 GB RSS per prover; 2–4 GB per batch build; 1.2–1.7 GB downloads; the headless rig needs about 3 GB per acceptance run. Free rulesets and 4-CPU runners need a **public** repo.

---

## 4. Scope

### MUST: on `main` by the cut line (T+15, tag `demo-v1`)

1. Repo, the `ci-ok` gate and the ruleset (plan items 1–3). *(not started)*
2. The extension with Alex's 18 items merged and reviewed; hover cards on Demo, Apéry and HOL lemmas plus one Isar keyword hover (items 8, 9). *(18 items merged on `integrate/all`, review pending; cards not started)*
3. ProofMap export with correct statuses, the audit, and the viewer in `extension/` on the Apéry fixture (items 6, 10). *(viewer built on `feat/proofmap`; export not started)*
4. **Design A end to end:** Ask Isabelle or a Swarm client closes the golden hole live through the bridge, with Sledgehammer/try0 insert. *(built; rehearsal on Apéry pending)* **Design B:** `revamp` server with `claim` writing `claims.json`, and either Beam `run_at` or Isabelle-MCP evaluate; one node closed through a PR and the gate (items 7/S7, 12). *(not started)*
5. The planted statement-weakening rejection (item 16) and the planted-axiom CI fixture (item 6). *(not started)*
6. At least 6 of the 12 Apéry nodes green. *(not started)*
7. `setup.sh` v0 (item 13); pain points turned into issues; fallback video v0. *(not started)*

### SHOULD: T+15 to T+19

- All of Apéry green; the ζ(5) skeleton with ≥ 8 green nodes.
- Full `setup.sh` (download + sha256) and `doctor.sh`.
- 2–3 parallel Design B agents on a ≥ 32 GB machine; `claims.json` badges live in the viewer.
- `main-latest` published automatically; `heavy.yml` running the headless acceptance.
- Items 15 and 16 polish; "Read as paper" (fold every proof) on top of the outline.

### COULD

- Natural-language `docs_search` (BM25); `isa2uni` textconv; Isar context pane; RC4 canary; drafts of upstream PRs (Isabelle/VSCode, PIDE MCP).

### OUT, stated plainly

- **SML→OCaml port.** Years of work; Shibboleth drops infix declarations (Isabelle has 106; `|>` about 11k uses), sharing and opaque signatures. One roadmap line at most (a measured experiment on `src/Tools/Metis` after the hackathon).
- **Isar syntax, the kernel, HOL, new keywords, or patches to Isabelle's language server.** The extension works around server bugs on the client side (HTML→text, `vscode_caret_perspective=0`) and never patches.
- **A Real Analysis speed-run.** Apéry and the ζ(5) blueprint replace it.
- **A third-party editor extension in the demo path.** We used to plan around yfprojects (Marketplace pin, `setup.sh` install); we now ship our own extension, so there is no pin and no companion. Ideas are ported with credit.
- **Forking or vendoring** Isabelle's own extension (its Scala.js build cannot run in npm CI) or PIDE MCP.
- **A human and an agent sharing one *headless* prover.** *Updated:* sharing the **editor's** session is now the live demo (Design A: the bridge drives the extension's own prover through VS Code, Isabelle unchanged). Headless workers (Design B) still each get their own prover, and files on disk are the only state they share.
- **Porting to Isabelle2026** before its release. **Using the "Prove2Me" name.**

### The maths target, stated plainly

**Is ζ(5) irrational? It was an open problem until September 2026.** Before that: Ball and Rivoal (infinitely many odd ζ values irrational), Zudilin (at least one of ζ(5), ζ(7), ζ(9), ζ(11)).

**As of 17 Oct 2026** a proof is *claimed*: Fauzan's Zenodo preprint of 17 Sep 2026, **not peer-reviewed**, authorship questioned; **machine-checked twice in Lean 4** (`danromik/zeta5-irrationality`, taking the prime number theorem as an axiom; `mo271/zeta5`, standard axioms only); DeepMind's formal-conjectures marks it solved. So it is not an open problem we could "attack", and it is far beyond 24 hours (about 29k Lean lines; the AFP ζ(3) entry is 2,079 lines).

**The realistic substitute:**
1. **Apéry's series, the must-finish target:** $\zeta(3)=\tfrac52\sum_{n\ge1}\frac{(-1)^{n-1}}{n^3\binom{2n}{n}}$. Not in `afp-2026-10-16` (grep; its status in Mathlib is unverified); about 12 nodes B1–B12 on plain `HOL`; main theorem over `suminf (λn. 1/(n+1)^3)`; the bridge to the AFP's `zeta 3` in `heavy/` only.
2. **The ζ(5) blueprint skeleton, partial by design:** about 27 statements following the preprint's numbering, organised along mo271's Apache-2.0 module list (structure only, credited), plus `irrationality_criterion`; Romik cited, nothing taken; top-level assembly proved; leaves filled live.

Slide wording: *"To our knowledge, the first Isabelle blueprint of the September 2026 ζ(5) proof. That proof is a preprint, verified twice in Lean and not yet peer-reviewed. One of the two Lean proofs takes the prime number theorem as an axiom; in Isabelle it is the 2018 AFP theorem `θ_asymptotics`."*

---

## 5. Architecture and data flow

```
 ┌──────────────────────── Demo laptop (>=16 GB) ───────────────────────────────────────────────────┐
 │  Human ─► Stock VS Code                                                                           │
 │           └─ extension/ (OURS; standard VS Code APIs; Leo, ark for cards + viewer)               │
 │                syntax · display-only symbols + input (ASCII on disk) · Goals sidebar/panel       │
 │                (goal · facts · messages · pin · pause) · outline/breadcrumbs · decorations        │
 │                · gutter ticks · Sledgehammer/try0 (lens, hover, insert) · restart · lock library  │
 │                ├─ hover: server hover (item 3) + card layer ◄─ docs.jsonl + isar-ref.jsonl (item 9)│
 │                ├─ ProofMap webview ◄─ out/dag.json + out/claims.json (Cytoscape+dagre bundled)    │
 │                ├─ Swarm board · Ask Isabelle (spawns Claude Code with the bridge only)           │
 │                ├─ MCP bridge: loopback TCP, token in ~/.isabelle-revamp/port, <= 2 clients       │
 │                └─ LSP stdio + PIDE/* ─► isabelle vscode_server -l HOL (UNMODIFIED) ─► prover #1  │
 │                                                                                                   │
 │  DESIGN A (shared session, the live beat)                                                         │
 │  Claude Code / Codex ─MCP stdio─► mcp/server.py ("isabelle") ─TCP─► bridge ─► the SAME buffer    │
 │        open · edit · goals_at · errors · status · sorry_positions · processing_status            │
 │                                                                                                   │
 │  DESIGN B (headless, parallel worktree agents)                                                    │
 │  Claude Code (claude -p, one per hole) ─MCP stdio─► "isabelle-beam" = PIDE MCP + beam, -l HOL_Beam│
 │      │                      run_at · find_theorems_at · get_state · sledgehammer ─► own prover    │
 │      ├──MCP stdio─► "isabelle-lsp" = Isabelle-MCP 0.6.0 (proposed, S7) ─► own prover             │
 │      └──MCP stdio─► "revamp" (Python) map_status · next_holes · node_context · claim · verify ·  │
 │                      docs_lookup · (docs_search)                                                  │
 │                      ├─ revamp map export ─► isabelle build -e (ONE wrapper session) ─► out/dag.json
 │                      ├─ revamp map audit  ─► statements.lock + axioms.allow + oracles             │
 │                      └─ claim ─► push agent/<slug> + draft PR (= the lock) + ../wt/<slug>,        │
 │                                  and writes out/claims.json (advisory sidecar ─► the viewer)      │
 │  revamp docs index ─► lexical scan of $ISABELLE_HOME/src/HOL + thys/ + Isar-Ref ─► docs.jsonl     │
 └───────────────────────────────────────────────────────────────────────────────────────────────────┘
 GitHub: PR ─► ci.yml [lint · isabelle (export = build, + map audit) · py · beam smoke · vscode (extension/)]
                 ─► ci-ok (sole required check)
         main ─► cd-main.yml ─► pre-release main-latest (vsix, dag.json)
         heavy.yml ─► AFP / ζ(5) / strict status / headless acceptance under xvfb (never required)
```

**Data flow:**
1. `.thy` files are always ASCII on disk. The extension renders symbols as decorations and every insertion is an escape; the bridge's `edit` saves the buffer; Isabelle-MCP's guard rewrites Unicode to escapes; the lint rejects non-ASCII.
2. The editor checks the open theories with prover #1. In Design A the agent sees exactly what the human sees (`goals_at` returns the sidebar's text; `status()` is the sidebar's completion test) and edits the same buffer with version checks.
3. On save, `revamp map export --watch` runs **one** batch build of a generated wrapper session (parent HOL, `sessions` from `thys/ROOTS`, `options [quick_and_dirty, record_proofs = 1]`), which checks and exports: `DAG_Export.thy` reads `Thm_Deps.thm_deps`, positioned `skip_proof` oracles and `Theory.all_axioms_of`, and writes `out/dag.json`. The watcher pauses while `verify` runs.
4. The viewer re-renders from `dag.json` (debounced, partial-write retry) and overlays `claims.json`; its events feed diffs successive snapshots and warns on status regressions and statement changes (a viewer-side mirror of the FR4 audit; the audit is still the judge).
5. Design B: `claim(id)` pushes `agent/<slug>`, opens the draft PR (the lock), creates `../wt/<slug>` with its own `.mcp.json` and Isabelle home, and adds the entry to `claims.json`. The worker calls `node_context`, `run_at` (or edit-then-evaluate), writes the winner, calls `verify` (export + audit in the worktree, `-o threads=2`), which removes the claim on success; the PR goes ready.
6. CI rebuilds from scratch and audits. A human merges. CD republishes `main-latest`.
7. `docs.jsonl` is built once for HOL and incrementally for repo files on save; the card layer reads only the index and `data/isar-ref.jsonl`.

**Why two designs:** the bridge gives the live, human-in-the-loop beat with no second prover and kernel-checked completion, but it is per window (≤ 2 clients, the discovery file belongs to the most recent window, a reload interrupts the bridge) and it cannot run in CI or in parallel worktrees. Headless workers scale with RAM and run unattended, but cannot share the human's buffer. `claims.json` is how the viewer shows both.

---

## 6. Interfaces and contracts (`contracts/`; C1–C3 frozen at Train 7 (T+5:15), C4 at Train 8 (T+6:00))

- Each contract is a JSON Schema plus golden examples in `contracts/examples/`; each producer has a CI test; consumers build against the goldens so they never wait.
- After the freeze, a change needs a PR labelled `contract-change`, a `schema_version` bump and every consumer's approval.
- **New in v2:** `contracts/claims.schema.json` (the `claims.json` sidecar, §6.2) and server `isabelle` (the bridge) recorded in C4 **as implemented** in `mcp/README.md`, not redesigned.

### 6.1 MCP tools (C4, `contracts/mcp-tools.json`)

**Server `isabelle`** (the MCP bridge, Design A; Python FastMCP, `mcp/server.py`; owner Leo). Registered as `isabelle` with `claude mcp add` / `codex mcp add`; connects to the running extension over loopback with the token from `~/.isabelle-revamp/port`; ≤ 2 clients per window; zero-based lines and UTF-16 columns (unlike the other servers, which are 1-based: SKILL.md says so). Tools, unchanged: `open(file)`, `edit(file, start_line, start_col, end_line, end_col, text)` (version-checked, saves), `goals_at(file, line, col)` (moves the visible caret; returns the sidebar's text, facts, messages, `phase`, `checkStatus`), `errors(file)`, `status()` (per-file and aggregate `fully_checked`), `sorry_positions(file)`, `processing_status()`. Completion is conservative: a fresh goal query and a full decoration snapshot must confirm the current version, with no pending work, errors, `sorry`, `oops` or bad markup, and a closed `begin`/`end`.

> **Proposed, decision at Train 7 (`docs/plans/isabelle-mcp.md`):** server `isabelle-lsp` = Isabelle-MCP 0.6.0 for headless perception and edit-then-check (`isabelle_launch`, `isabelle_evaluate_to`, `isabelle_goal`, `isabelle_find_theorems`, `isabelle_command_output`, …). Beam would keep only `run_at`; `find_theorems_at` drops to SHOULD. S3 and S7 decide.

**Server `isabelle-beam`** (Scala; PIDE MCP plus our `beam` component, logic `HOL_Beam` or a generated `Beam_<Parent>`; owner retinapeg). Not called `isabelle`, because that name is the bridge. Lines are 1-based; `origin` is a session-qualified theory name or a file path.

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

- `proved` means a terminal method closed the goal; `no_subgoals` means an `apply` script still needs `done`.
- The two soundness fixes from the prototype are mandatory: **(i)** run under the print's own exec id, not the command's eval id; **(ii)** don't let terminal `by` proofs fork (counted save/restore of `parallel_proofs` on 2025-2).
- "Bad context for command" → hint to the nearest command line. "No goal" on a one-line stub (`have "…" sorry`) → pass `prefix`; new stubs put `sorry` on its own line (§13 items 11, 15). The bridge's `sorry_positions` and the Sledgehammer insert handle a same-line `sorry` on the editor side.

**Server `revamp`** (Python FastMCP; owner retinapeg; the ProofMap logic is ark's `tools/revamp/map`).

| Tool | Input | Output |
|---|---|---|
| `map_status` | `{session?, target?}` | `{counts:{fully_proved, proved, sorry, oracle, defined, missing}, red:[id], git_sha, generated_at}` |
| `next_holes` | `{target, k=5}` | `[{id, file, line, statement, leverage, rests_on_holes, claimed_by?}]`, ranked: fewest other holes first, then leverage, then shortest statement; claimed holes last |
| `node_context` | `{id}` | `{node, nl?, doc, deps:[{id, statement, status}], used_by:[id]}` |
| `claim` | `{id, in_place=false}` | `{ok:true, branch:"agent/<slug>", pr, worktree}` or `{ok:false, held_by}`. **The lock is the draft PR, opened at claim time.** **New:** on success it appends `{id, pr, branch, since}` to `out/claims.json` (§6.2). |
| `verify` | `{id, worktree}` | `{ok, status, statement_unchanged, new_axioms:[], new_oracles:[], new_holes:[id], sorry_count:{before, after}, log_tail}`. Passes only if: the node is no longer `sorry`; its hash is unchanged; no axiom outside `axioms.allow`, no new oracle; `new_holes` empty (no laundering); `sorry_count.after < before`. `-o threads=2`; pauses `export --watch`. **New:** on `ok` it removes the node's `claims.json` entry. |
| `docs_lookup` | `{name, kind?}` | one C2 record |
| `docs_search` (stretch) | `{query, k=10}` | `[{…C2 record, score}]`, BM25, offline |

**`claim` in detail** (unchanged from v1.2 apart from step 5):
1. Push an empty commit to `agent/<slug>` with a plain `git push`, never `--force`; a rejected push means another machine got there first.
2. `gh pr create --draft`, then check `gh pr list --head agent/<slug> --state open` returns exactly this PR; otherwise `{ok:false, held_by}`. No local lockfile.
3. Default: `git worktree add ../wt/<slug>`; write the worktree's `.mcp.json` from `.mcp.json.example` with absolute paths; `isabelle-beam` (and `isabelle-lsp` if adopted) get `HOME=<wt>/.isahome` in their `env`; the `revamp` server keeps the real `HOME` for `git` and `gh`; re-register the components under that home and copy already-built ancestor heaps with their `log/*.db`.
4. `in_place: true` (a Design B worker on the main checkout): refuses a dirty tree. *The live beat no longer needs it: Design A edits the open buffer directly.*
5. Write `out/claims.json` (create if missing; one entry per node; `since` is UTC ISO-8601). The PR-closed path (`run_holes.sh` on exit, and a `gh` poll in `revamp map status`) removes entries whose PR is closed or merged, so a stale claim never outlives its PR. Task: retinapeg.

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
    "nl": "optional in v1: from preceding text ‹›, filled once revamp.docs (item 8) is available",
    "doc_source": "marker | preceding_text | comment | none",
    "lib_uses": ["HOL.trans", "…"],                  // filtered: no arity_/classrel_; may be truncated
    "blueprint": { "label": "B3", "paper_ref": "…", "owner": "human:alex | agent" }   // optional join from C3
  } ],
  "edges": [ { "from": "<dependent id>", "to": "<dependency id>", "kind": "uses | uses_def | declared" } ],
  "audit": { "non_definitional_axioms": [ { "name": "…", "theory": "…", "prop": "…" } ],
             "oracles": [ { "node": "…", "oracle": "…" } ] } }
```

Node IDs are `Session.Theory.fact` (`Thm_Name.print` gives only `Theory.fact`, and Demo already has a `Basics.thy`). The lint rejects duplicate theory base names across `thys/` and `heavy/` (`examples/` is Leo's extension fixtures, never in a ROOT, and is excluded).

Edge kinds: `uses` from `Thm_Deps.thm_deps`; `uses_def` from constants in the statement; `declared` from `blueprint.yaml` (`revamp map check` warns on differences).

| Status | Rule | Viewer (leanblueprint legend) |
|---|---|---|
| `missing` | In `blueprint.yaml`, no Isabelle fact yet | blue border |
| `defined` | A constant or definition | box shape |
| `sorry` | The node's **own** proof has a hole. Primary rule (`record_proofs = 1`, which records each oracle's position without proof terms; by default Pure's `ML_Bootstrap.thy` sets `Proofterm.proofs := 0`, every `sorry` collapses into one unpositioned `skip_proof` entry, and the kernel data alone cannot tell a node's own hole from an inherited one): its `skip_proof` oracles minus the union of `all_oracles` over its named dependencies is non-empty. Fallback if the item 6 spike fails: a lexical scan of the proof span following Isar nesting, finding `sorry` or `\<proof>` outside `text` and comments. | red border |
| `proved` | No hole of its own, but rests on a `sorry` somewhere below | green fill |
| `fully_proved` | No oracles anywhere below | dark-green fill |
| `oracle` | Depends on an oracle other than `skip_proof` | solid red, untrusted |

**`out/claims.json` (advisory sidecar; schema `contracts/claims.schema.json` with `contracts/README.md` and `contracts/examples/claims.json`, already on `feat/proofmap`; not part of C1; the generated file is never committed):**

```jsonc
{ "claims": [ { "id": "Apery.Bounds.linear_form_small", "pr": 58,
                "branch": "agent/linear-form-small", "since": "2026-10-17T11:49:12Z" } ] }
```

Only `id` is required by the schema (`pr` integer ≥ 1, `branch`, `since` optional; `additionalProperties: false`), and the viewer must work when the file is absent. Written by `claim`; entries removed by `verify` on success and by the PR-closed path (§6.1). The viewer overlays a "claimed" badge with the PR link and `since`; with `isabelleRevamp.proofMap.followAgent` it keeps the claimed node in view and animates the status change. Nothing reads it for decisions: `next_holes` only demotes claimed holes, and the lock is still the draft PR.

**Viewer events feed and replay (item 10):** the viewer keeps the last N `dag.json` snapshots in memory and writes `out/snapshots/<generated_at>.json`; each refresh emits events (node proved, node regressed, statement changed, new claim, claim released). Regression and statement-change events are shown as warnings: the same two conditions the FR4 audit fails on, mirrored on the viewer side so the audience sees them before CI does. `proofMap.openSnapshot` replays a saved snapshot for the demo.

**Committed files owned by humans:** `thys/<S>/statements.lock` (`{id, statement_sha1}` per blueprint node); `thys/<S>/axioms.allow` (the session's allowed axioms: definitions, `type_definition_*`, the overloaded `_def_raw` axioms from `instantiation`; the gate fails on any other); both regenerated by `revamp map lock` only in human PRs labelled `statement-change`, agents never touch them and CI enforces it; `thys/<S>/blueprint.yaml` (C3: `{label, isabelle, title, nl, paper_ref, owner, declared_uses}`). Generated `dag.json`, `claims.json` and snapshots are never committed.

### 6.3 Hover and docstring extraction (C2, `contracts/docs.schema.json`)

Each line of `docs.jsonl` is one record:

`{name, kind: fact|constant|type|locale|class|method|attribute|command, session, file, line, statement, doc, doc_source: marker|preceding_text|comment|isar_ref|ai_summary|none, breadcrumb: [theory, chapter, section, …], statement_sha1}`

**Where the doc comes from, first match wins** (all are constructs Isabelle already has):
1. The description marker inside the command: on disk `\<^marker>\<open>description \<open>…\<close>\<close>` (nested cartouches in ASCII). Built into Pure; S6 checks it in 10 minutes; the Demo fixture contains one.
2. An *adjacent* preceding `text ‹…›`/`txt ‹…›` (only whitespace or comments between; stops at any heading or other command). The card says "from preceding text".
3. A `\<comment> ‹…›` inside the statement.
4. `ai_summary` (stretch), keyed by `statement_sha1`, always labelled "AI summary (not in source)".
5. `none`.

Only 2.4–4.7% of HOL lemmas have an adjacent text block, so the card is useful without a doc: statement, breadcrumb and link always. `append_assoc` is the no-doc example; `geometric_sums` ("Sum of a geometric progression."), `binomial_absorption` and `Cauchy_product_sums` have one.

**Statement:** the command's text cut before the first of `proof`, `by`, `apply`, `using`, `unfolding`, `including`, `supply`, `sorry`, `\<proof>`, `oops`, `..` or `.`.

**Conversion to Markdown:** `\<^item>` → `-`, `\<^enum>` → `1.`, `\<^emph>` → `*…*`, `\<^bold>` → `**…**`, `@{thm}`/`\<^term>`/`\<^const>`/`\<^typ>`/`\<^verbatim>` → inline code, `\<^url>` → `<url>`; symbols decoded through the installed `etc/symbols` (the extension already loads it with `isabelle getenv`).

**Lookup, in order:** (1) `vscode.executeDefinitionProvider` at the cursor with a 100 ms budget → (file, line) in the index; (2) the word under the cursor by name, same theory first, then imports; (3) keywords, methods and attributes from `data/isar-ref.jsonl` (retinapeg delivers; the card layer reads). The card never calls the prover and never calls `executeHoverProvider`.

**Card layout (Lean-style):** a fenced `isabelle` block with the statement, `---`, the doc with its source badge, `---`, then *kind · full name · breadcrumb · `File.thy:N`* in italics (`File.thy:N` is a `command:` link). VS Code shows the card next to the server hover that the extension's middleware already renders (item 3), so the two must not repeat the statement: the card layer skips its statement block when the server hover already carries one for the same word.

---

## 7. Repo layout (directory → owner)

What exists on `integrate/all` today is marked ✓; the rest comes with the PRs named.

```
isabelle-revamp/
├── PLAN.md ✓ README.md ✓ AGENTS.md ✓ CLAUDE.md ✓   CONTRIBUTING.md  LICENSE (BSD-3-Clause)         (skeleton PR, item 1)
├── .isabelle-version          "Isabelle2025-2": the ONLY place the version is written            (item 1)
├── deps.lock                  afp=afp-2026-10-16 + sha256 · pide_mcp=kappelmann/isabelle-pide-mcp@7463338 (branch Isabelle2025-2)
│                              isabelle_mcp=0.6.0 (if S7 passes) · node=22 · typescript=7 (as extension/package.json pins it)
├── .gitignore ✓ (+ heaps, *.db, *.vsix, out/, .isahome/, .mcp.json, snapshots)  .gitattributes (*.thy text eol=lf)
├── .vscode/ ✓  settings.json (isabelleRevamp.executable, Swarm_solution hidden) · launch.json (F5) · tasks.json   (Leo)
├── .claude/    settings.json (deny rules, §11) · skills/isabelle-revamp/SKILL.md            (ark / retinapeg, items 1, 12)
├── .github/    workflows/{ci,heavy,cd-main}.yml · actions/setup-isabelle/ · ruleset-main.json · CODEOWNERS · templates (ark, item 2)
├── contracts/  dag/docs/blueprint/claims schemas · mcp-tools.json · examples/  (all four, item 3; README, claims schema + example on feat/proofmap)
├── extension/ ✓ package.json (publisher hymanimy, main ./out/extension.js) · README.md · src/*.ts · syntaxes/ · language-configuration.json
│               test/*.cjs (VS Code acceptance) · test/unit_*.cjs (no VS Code) · test/fixtures/ · THIRD_PARTY_NOTICES.md
│               ── Leo (UX, bridge, swarm, ask, symbols, goals, decorations, sledgehammer); ark for src/hover/ (item 9) and
│                  src/map/ + webview/map/ + esbuild.mjs (item 10, on feat/proofmap). No vscode/ directory exists or will.
├── mcp/ ✓      server.py (the bridge, FastMCP) · README.md · check_live.py · check_swarm.py · requirements.txt     (Leo)
├── examples/ ✓ Sqrt2.thy · Demo.thy · Swarm.thy · Swarm_solution.thy · Swarm_claude.thy: the extension's demo theories,
│               never in a ROOT; tests compare Sqrt2.thy byte for byte                                            (Leo)
├── scripts/ ✓  check_m3..m9a.sh · check_{quickwins,symbols,goals,goals2,decorations,sledgehammer}.sh · lsp_probe.py ·
│               sledgehammer_probe.py (Leo)  ·  ci/lint.sh · isa2uni (ark)  ·  setup.sh · doctor.sh · demo-smoke.sh (retinapeg, item 13)
├── docs/ ✓     DEMO.md · PROGRESS.md · PAINPOINTS.md · PROTOCOL_NOTES.md · SWARM_PROMPT.md · CODEX_PROMPT.md · plans/ (exist)
│               decisions/ADR-000{1..7} · design/ui.md (Alex) · demo-script.md (Alex) · agent-eval.md (retinapeg) · DEPENDENCIES.md
├── tools/ ✓    prototypes/{hover_proto.py, isarref_index.py, docstat.py, PROTOTYPE.md}
│               pyproject.toml · revamp/{cli.py, contracts.py, map/, docs/, mcp_server.py} · tests/   (ark: map/; retinapeg: docs/, mcp_server)
├── thys/       ROOTS · Smoke/ · Demo/ (fixture) · Apery/ (+ blueprint.yaml, statements.lock, axioms.allow)        (Alex)
├── heavy/      Zeta5_Blueprint/ · Apery_Bridge/                                              (Alex)  heavy.yml only
├── proofmap/   isabelle/{DAG_Export.thy, ROOT.template} · prototypes/                                        (ark, item 6)
├── beam/       LICENSE (LGPL-3.0) · ext/ · session/ · session-2026/ · tests/ · ci/pide-mcp.sh             (retinapeg, item 7)
├── agents/     run_holes.sh · prompt.md                                                                  (retinapeg, item 14)
└── data/       isar-ref.jsonl (generated, small, committed)                                              (retinapeg, item 8)
```

CODEOWNERS matches the owners above; `/contracts/` is owned by all four. Informational, not enforced. `tools/` keeps the plugin-style CLI so ark and retinapeg never edit the same file. The committed `.vscode/settings.json` holds `isabelleRevamp.executable` as a `~/hack/isabelle-env/…` path: `setup.sh` rewrites it locally and `.gitattributes` does not protect it, so **decide at Train 7** whether it becomes `settings.json.example` (the v1 rule) or stays committed with the `~` path (works on Leo's and the headless rig's layout).

---

## 8. Git workflow

**Decisions (ADRs):**
- **D1, canonical repo:** `sh-arka22/…` is the **only** repo. Leo moves his remote now. Alex pushes the one-line pointer README to `hymanimy/isabelle-revamp` and archives it. No second push remote, no mirror.
- **D2, rename to `isabelle-revamp` (recommended, not done):** `gh repo rename isabelle-revamp -R sh-arka22/-isabelle-revamp`; GitHub redirects. The leading hyphen breaks `cd -isabelle-revamp` and relative `-d` paths; until the rename, absolute paths everywhere.
- **D3, public repo:** rulesets and 4-CPU runners need it; only ark is admin.

**Bootstrap, re-baselined:**
1. ✓ Commit 0 (`PLAN.md`, `README.md`) and the four `proto/*` branches. ✓ PRs #1, #2, #5 merged.
2. **Merge PR #6 (`integrate/all`) as a merge commit** once the adversarial review of the five merged feature branches is in; this is the one non-squash merge, done before the squash-only setting is applied. It brings `extension/`, `mcp/`, `examples/`, `scripts/check_*`, the docs, `AGENTS.md`, `CLAUDE.md` and both plans (#3, #4 close with it).
3. Issues `P1`–`P20` and the labels (§0), **before** the skeleton PR.
4. The skeleton PR (plan item 1): CONTRIBUTING, LICENSE, CODEOWNERS, templates, `.gitattributes`, `.isabelle-version`, `deps.lock`, `.claude/settings.json`, `.mcp.json.example`, `thys/ROOTS` + `thys/Smoke/`, ADR-0001–0007, `contracts/README`. Merged by T+5:30.
5. Draft PRs from `proto/*` (table below). Always `git add <paths>` / `git checkout <branch> -- <paths>`, never `git add -A`.
6. Merge the CI PR (item 2); one `workflow_dispatch` on `main` to seed caches; **only then** the ruleset and the squash-only setting (in ark's own terminal, since `.claude/settings.json` denies `gh api` to agents):
   ```
   gh api -X POST "repos/$R/rulesets" --input .github/ruleset-main.json
   gh repo edit "$R" --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false \
     --delete-branch-on-merge --enable-auto-merge --allow-update-branch=false
   ```
   The ruleset: no deletion or force-push of `main`; linear history and a PR required; squash only; required `ci-ok` with strict mode **off**; **0** required approvals; admin bypass through a PR only.

**Branches:** `alex/…`, `ark/…`, `retinapeg/…`, **`leo/<item>-<slug>`** for people (`<item>` = the plan item or the Alex item, e.g. `leo/a15-pin-goal`); `feat/<name>` for the agent-built feature branches from the planning container (`feat/quickwins`, `feat/symbols`, `feat/goals`, `feat/decorations`, `feat/sledgehammer`, `feat/proofmap`), which merge into `integrate/all` and reach `main` through PR #6 or a later `integrate/*` PR; `agent/<node-slug>` for Design B workers (labelled `agent-generated`; branch + draft PR = the lock); `demo/<slug>` for planted demo PRs (draft, `do-not-merge`, never a lock); `proto/*` deleted once imported; `main` the only long-lived branch.

**PR rules** (unchanged): one concern, about ≤ 300 lines (lockfiles, goldens and prototype/feature imports exempt); titles `area: imperative` with area ∈ {ci, thys, heavy, proofmap, beam, tools, **extension, mcp**, contracts, docs} (`vscode` retired); draft within 30 min; ≤ 2 non-draft PRs per person; never merge `main` into a branch (rebase; `--force-with-lease` on your own branch only); no stacked PRs; the PR template asks for the issue ("Closes #M, plan item N"), contract touched y/n, `isabelle version`, agent-generated and who launched it, a screenshot for UI, no machine paths committed.

**Review rule** (a norm in CONTRIBUTING; `ci-ok` green in every case):

| PR touches | Who may merge |
|---|---|
| Only your own directory | You, at the next train. A teammate's 👀 within one train is expected, not blocking. |
| Someone else's directory, `.github/`, `scripts/` | That directory's owner; if asleep for more than one train, any awake teammate. |
| `extension/` UX (anything a user sees) | Leo merges; **Alex signs off the look** from screenshots. ark's `src/hover/` and `src/map/` need Leo's 👀 for conflicts with the goals and symbols code. |
| `contracts/`, or `statement-change` (lockfiles) | Every affected owner. **Statements always need Alex.** |
| `agent-generated` proofs under `thys/` or `heavy/` | The human who launched the agent, **only if** the map audit is green |
| `agent-generated` code (not `.thy`), including the `feat/*` branches | A *different* human (the adversarial review for the 18 items) |
| ML or Scala written by ark | Alex reviews. ark reviews Python, TypeScript and CI for the others. |

Agents never merge: `.claude/settings.json` denies `gh pr merge`, `gh api` and pushes to `main` (§11).

**The ~45-minute train** (a rhythm for integration, not a cron): trains at T+4:30, 5:15, 6:00, 6:45, … (wall clock in §12). Each ≤ 5 minutes: one line each (merged / ready / blocked); merge the green PRs in order contracts → producers → consumers; the rotating captain runs `scripts/demo-smoke.sh` on the demo machine (v0 by Train 8; until then `check_m3.sh` on `main`); **if `main` is red, stop the line** (fixes only; > 15 min → GitHub's revert button); everyone rebases and claims next. CD republishes `main-latest` after every green push to `main`.

**Getting existing work in without chaos.**

| Branch | Contents | Draft PR for | Owner, and what to change |
|---|---|---|---|
| `integrate/all` (PR #6) | Leo's M1–M9 extension, `mcp/`, `examples/`, `scripts/check_*`, docs; #3, #4; the five `feat/*` branches (merged at T+4:35) | plan items 4, 9/10 prerequisites, 13.1 | the integrator (ark); adversarial review fixes as commits on the branch, then the merge commit; anything found later is a follow-up squash PR |
| `feat/proofmap` | `extension/src/map/`, `extension/webview/map/` + `esbuild.mjs`, `media/`, settings, snapshots, `test/{unit_,perf_,}proofmap.cjs`, `scripts/check_proofmap.sh`; `contracts/{README.md, claims.schema.json, examples/claims.json}` | item 10 | ark; committed (`8b770e5`); merged into `integrate/all` while #6 is open, else lands as `extension: ProofMap viewer` after #6 |
| `proto/ci` | `.github/**` | item 2 | ark: repo name (`hymanimy` → `$R`), 2025-2, the §9 filters, `vscode` job → `extension/`, cut `ci.yml` to `changes`, `lint`, `isabelle`, `vscode`, `ci-ok` |
| `proto/proofmap` | `proofmap/isabelle/{DAG_Export.thy, ROOT.template}`, `proofmap/prototypes/`, `tools/tests/fixtures/ax/` | item 6 | ark; golden C1 example from the Demo export |
| `proto/proofmap` | `thys/Demo/{ROOT, Top.thy, Basics.thy}` | item 5 | Alex; add `record_proofs = 1` and the item 5 cases |
| `proto/beam` | `beam/**` | item 7 | retinapeg |
| `proto/docs` | already merged (PR #1) as `tools/prototypes/` | item 8 | retinapeg turns it into `tools/revamp/docs/` |

Each owner takes only their item's paths onto a fresh branch (`git checkout origin/proto/<x> -- <paths>`), commits once, opens a draft PR "Closes #M (plan item N)". *Alex's three local branches* and *ark's existing code* follow the v1.2 recipe (rebase `--onto`, the blob-size check, `parked`/`closed` at the train); nothing is imported twice. *retinapeg's overnight research* is one docs-only PR under `docs/research/`.

---

## 9. CI design

| Workflow | Required? | Purpose | Target time |
|---|---|---|---|
| `ci.yml` → `ci-ok` | **The only required check** | `lint` (always); `isabelle` (one export build + map audit); `py` (`tools/` and an import check of `mcp/`); `beam` smoke; **`vscode`: `extension/` compile + unit tests + vsix**. Each job arrives with the PR that adds its directory; `vscode` arrives with the CI PR because `extension/` already exists. | ≤ 3 min docs-only; ≤ 5 min warm; ≤ 8 min cold |
| `heavy.yml` | Never required | AFP/HOL-Analysis sessions (ζ(5), Apéry bridge, S4's chain); strict Apéry status; AFP `Zeta_3_Irrational` export at scale; **headless acceptance:** stock VS Code + Isabelle under `xvfb-run` running `scripts/check_m3.sh` and the six `check_<feature>.sh`, serialised; COULD: RC4 canary | ≤ 90 min |
| `cd-main.yml` | No | On a green `ci` run on `main`: replace the `main-latest` pre-release (vsix, dag.json) | about 1 min |

**The headless rig is the model for `heavy.yml`.** In the planning session's container, a wrapper (`xvfb` + `--no-sandbox` around a downloaded stock VS Code) behaves like the VS Code application executable that `scripts/check_m*.sh` take as `$1`; with Isabelle2025-2 and the HOL heap it runs every `check_m*.sh` and every `check_<feature>.sh` (each run starts a full Isabelle, about 3 GB and 2–5 min, so runs are serialised with `flock`). **It is not on any team laptop.** Acceptance evidence for the 18 items (§13.1) comes from it: the `PROGRESS.md` entries quote its PASS lines. `heavy.yml` reproduces it with `actions/setup-isabelle` (HOL prebuilt), a cached VS Code tarball and `xvfb-run -a`; never in the required gate (too slow, too much RAM).

`.github/workflows/ci.yml`, adapted from `proto/ci`:
- **The CI PR ships `changes`, `lint`, `isabelle` (build only), `vscode` and `ci-ok`.** It builds `thys/Smoke` from the skeleton PR and compiles `extension/`, so it goes green on its own PR.
- Later PRs append their job to `ci-ok.needs`: `py` with item 3, the export step with item 6, `beam` with item 7.
- Jobs are guarded on their inputs existing (`hashFiles` in the `changes` job, passed on as outputs).

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
  changes:
    runs-on: ubuntu-24.04
    outputs:
      isa: ${{ steps.f.outputs.isa }}
      beam: ${{ steps.f.outputs.beam }}
      py: ${{ steps.f.outputs.py }}
      vscode: ${{ steps.f.outputs.vscode }}
      has_map: ${{ steps.has.outputs.map }}
      has_py: ${{ steps.has.outputs.py }}
      has_beam: ${{ steps.has.outputs.beam }}
    steps:
      - uses: actions/checkout@v7
      - id: f
        uses: dorny/paths-filter@v4
        with:
          filters: |
            shared: &shared ['.isabelle-version', 'deps.lock', '.github/workflows/ci.yml', '.github/actions/**']
            isa:    [*shared, 'thys/**', 'proofmap/**', 'tools/revamp/map/**', 'tools/revamp/cli.py', 'tools/pyproject.toml', 'tools/tests/fixtures/**', 'contracts/dag.schema.json']
            beam:   [*shared, 'beam/**', 'contracts/mcp-tools.json']
            py:     [*shared, 'tools/**', 'mcp/**', 'contracts/**']
            vscode: [*shared, 'extension/**', 'contracts/dag.schema.json', 'contracts/claims.schema.json', 'contracts/docs.schema.json']
      - id: has
        run: |
          {
            echo "map=${{ hashFiles('proofmap/isabelle/DAG_Export.thy') != '' }}"
            echo "py=${{ hashFiles('tools/pyproject.toml') != '' }}"
            echo "beam=${{ hashFiles('beam/ext/etc/build.props') != '' }}"
          } >> "$GITHUB_OUTPUT"

  lint:                                      # always runs, under 1 min
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - run: scripts/ci/lint.sh
        env:
          HEAD_REF: ${{ github.head_ref }}
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          AGENT_PR: ${{ startsWith(github.head_ref, 'agent/') || contains(github.event.pull_request.labels.*.name, 'agent-generated') }}
  # lint.sh, every PR: conflict markers; actionlint; every .thy (examples/ included) is ASCII-only;
  #  under thys/ and heavy/: no `axiomatization`, no `oracle` in command position, no Thm.add_axiom/add_oracle,
  #  no `keywords` in theory headers, theory base names unique across both;
  #  if AGENT_PR: the diff may not add sorry, \<proof>, oops, axiomatization, oracle, ML*, setup, declaration,
  #  *_setup, tactic/raw_tactic or quick_and_dirty, nor touch statements.lock, axioms.allow, blueprint.yaml,
  #  ROOT, ROOTS, contracts/, .github/ or .claude/

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
      - if: needs.changes.outputs.has_map != 'true'      # before item 6: build every session in thys/ROOTS
        run: isabelle build -v -D thys
      - if: needs.changes.outputs.has_map == 'true'      # from item 6: the export build checks everything
        run: |
          python3 -m venv .venv && . .venv/bin/activate && pip install -e 'tools[dev]'
          mapfile -t S < <(grep -Ev '^[[:space:]]*(#|$)' thys/ROOTS)
          revamp map export -d thys "${S[@]}" -o out/
          revamp map audit out/ --locks thys --summary "$GITHUB_STEP_SUMMARY"
          pytest -q -m isabelle tools/tests
      - if: always()
        uses: actions/upload-artifact@v7
        with:
          name: proofmap
          path: out/
          retention-days: 7
          if-no-files-found: ignore

  py:                                        # added by the PR for item 3
    needs: changes
    if: needs.changes.outputs.has_py == 'true' && (needs.changes.outputs.py == 'true' || github.event_name != 'pull_request')
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - run: |
          python3 -m venv .venv && . .venv/bin/activate
          pip install -e 'tools[dev]' -r mcp/requirements.txt
          ruff check tools && pytest -q -m 'not isabelle' tools/tests
          python -m revamp.contracts validate contracts/examples
          python -m py_compile mcp/server.py        # the bridge's live checks need the editor: heavy.yml only

  beam:                                      # added by the PR for item 7
    needs: changes
    if: needs.changes.outputs.has_beam == 'true' && (needs.changes.outputs.beam == 'true' || github.event_name != 'pull_request')
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup-isabelle
      - run: beam/ci/pide-mcp.sh
      - run: isabelle components -u "$GITHUB_WORKSPACE/beam/ext" && isabelle scala_build
      - run: python3 beam/tests/smoke.py --dir beam/session --logic HOL_Beam --theory beam/tests/thy/Demo.thy

  vscode:                                    # in the CI PR: extension/ already exists
    needs: changes
    if: needs.changes.outputs.vscode == 'true' || github.event_name != 'pull_request'
    runs-on: ubuntu-24.04
    defaults:
      run:
        working-directory: extension
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: extension/package-lock.json
      - run: npm ci
      - run: npm run compile                 # tsc -p . (strict, TypeScript 7); feat/proofmap adds the esbuild webview bundle to this script
      - run: for t in test/unit_*.cjs; do node "$t" || exit 1; done     # pure tests: no VS Code, no Isabelle
      - run: npx vsce package --skip-license --allow-missing-repository -o "isabelle-revamp-${GITHUB_SHA::7}.vsix"
                                             # dependencies INCLUDED until the extension host is bundled (vscode-languageclient is a runtime dep)
      - uses: actions/upload-artifact@v7
        with:
          name: vsix
          path: extension/*.vsix
          retention-days: 7

  ci-ok:                                     # never rename; never add a second job with this name
    if: always()
    needs: [changes, lint, isabelle, py, beam, vscode]   # the CI PR starts with [changes, lint, isabelle, vscode]
    runs-on: ubuntu-24.04
    steps:
      - env:
          BAD: ${{ contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled') }}
        run: test "$BAD" = "false"
```

The VS Code acceptance tests (`extension/test/m*.cjs`, `<feature>.cjs`) are **not** in `ci-ok`: they need a display, a VS Code download and a running Isabelle. They run in `heavy.yml`:

```yaml
  acceptance:                                # heavy.yml; model = the planning container's rig
    runs-on: ubuntu-24.04
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup-isabelle
      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm, cache-dependency-path: extension/package-lock.json }
      - run: npm ci --prefix extension && python3 -m venv mcp/.venv && mcp/.venv/bin/pip install -r mcp/requirements.txt
      - run: npx --prefix extension @vscode/test-electron download   # cached stock VS Code; the wrapper adds --no-sandbox
      - run: |
          for s in scripts/check_m3.sh scripts/check_quickwins.sh scripts/check_symbols.sh scripts/check_goals.sh \
                   scripts/check_goals2.sh scripts/check_decorations.sh scripts/check_sledgehammer.sh; do   # + check_proofmap.sh with item 10
            xvfb-run -a timeout 900 bash "$s" "$VSCODE_APP" || exit 1      # one Isabelle each, about 3 GB, 2–5 min
          done
```

`.github/actions/setup-isabelle/action.yml` is unchanged from v1.2 (three mirrors, never the `isabelle.in.tum.de/dist` URL that redirects to http; cache keyed on `.isabelle-version`; fail loudly if the prebuilt HOL heap is missing; save the cache from `main` only). **`heavy.yml`** keeps the v1.2 rules: `full-ci` label, push to `main`, `workflow_dispatch`, cron `17 */3 * * *`; the pinned AFP tarball checked against `afp_sha256`; heap cache keyed `heaps-<isa>-<afp>-hash(heavy/**/ROOT)`; strict Apéry is a status check (`revamp map status` must say `fully_proved`), not a build option; timeout 90 min; a missing directory never turns `main` red.

**Gotchas:** pin `ubuntu-24.04`; caches from PRs cannot be shared; if an action major breaks, drop back one; `vsce package` runs unattended only with `--skip-license --allow-missing-repository`; `package.json` already has `publisher` (`hymanimy`: keep until someone needs a real Marketplace publisher); TypeScript 7 strict must be clean (`npm run compile`).

---

## 10. Workstreams and how they interlock

| Workstream | Owner (backup) | Delivers | Isabelle depth |
|---|---|---|---|
| **WS-0 Repo, CI** | ark (retinapeg) | issues/labels, skeleton, `ci`/`heavy`/`cd`, ruleset, `.claude/settings.json`, PR #6 integration, demo machine from `main-latest` | low |
| **WS-E Editor** | **Leo** (ark) | `extension/` UX: the 18 items merged and reviewed, items 15–16, the MCP bridge, Swarm, Ask Isabelle, `mcp/`, the live beat (Design A), the fallback video | medium (protocol) |
| **WS-M ProofMap** | ark (Alex) | `DAG_Export` port and classifier fix, `revamp map` (export, next, check, lock, audit), **the viewer in `extension/`** with claims, events and snapshots, hover cards (item 9) | medium; Alex reviews the ML |
| **WS-A Agents, natural language, onboarding** | **retinapeg** (ark) | Beam (`run_at`) and/or Isabelle-MCP (S3/S7), the `revamp` server with `claims.json`, SKILL.md, `run_holes.sh` (Design B), docs index + `data/isar-ref.jsonl`, `docs_lookup`/`docs_search`, pain points → issues, `setup.sh`/`doctor.sh`/`demo-smoke.sh` | medium |
| **WS-X Maths, design, pitch** | Alex (ark) | Demo fixture, Apéry statements and proofs (driving agents in both designs), ζ(5) skeleton, `docs/design/ui.md` and the look sign-off, demo script, the planted PR and replay snapshots, slide claims, every statement | high |

**How they connect** (every arrow is a contract):

```
Alex: thys/*.thy + blueprint.yaml + statements.lock + axioms.allow ─► ark: revamp map export ─► dag.json (C1)
         │                                              ├─► ark: ProofMap viewer in extension/ (goldens first)   ◄─ claims.json (retinapeg's claim)
         │                                              └─► retinapeg: revamp next_holes/verify (C4)
         ├──► retinapeg: docs index ─► docs.jsonl (C2) + data/isar-ref.jsonl ─► ark: hover cards in extension/
         └──► Leo: the live beat on Apéry through the bridge (C4 server `isabelle`, as built) + Sledgehammer insert
retinapeg: Beam/Isabelle-MCP (C4) ─► SKILL.md loop ─► agent PRs ─► ark: CI gate ─► Alex: review statements, merge
Leo: extension acceptance (headless rig, heavy.yml) ◄─ ark: CI vscode job ◄─ every extension PR
```

**If someone drops out:** WS-E falls to ark (hover and viewer only; the 18 items are already built); WS-A falls to ark for `revamp`/`run_holes.sh` and Beam is cut in favour of Isabelle-MCP; WS-M falls to Alex for the ML and Leo for the viewer; WS-X has no backup for statements.

---

## 11. How we use AI: policy (ADR-0005)

**Answer: neither extreme.** Claude writes almost all of the code, fast, against contracts and acceptance criteria that humans wrote; humans decide *what*, Claude decides *how*, humans integrate. Half a day in, this is also what happened: M1–M9 and the 18 items were built by Claude Code sessions against Leo's milestones and Alex's list, each with a live acceptance check a human can re-run.

| Work | Mode | Human role | Gate |
|---|---|---|---|
| Filling `sorry` leaves in `thys/` and `heavy/` (Design B) | **Autonomous and parallel:** one hole, one worktree, one PR | The human who launched the agent merges | kernel batch build + `revamp map audit` + agent lint |
| Filling holes in the open buffer (Design A: Ask Isabelle, Swarm clients) | **Interactive:** the human watches the same goals; the editor's completion test is advisory | The human saves and opens the PR | the same gate before `main` |
| Prototype ports, CI YAML, schemas, scaffolds, tests, the extension features | **Plan first:** a plan on the issue, a human approves in ≤ 5 min, then a small PR; a *different* human reviews agent-written code | reviews | `ci-ok` + goldens + the headless acceptance for UX |
| UI code | Plan first; Claude implements | **Alex signs off the look** from light and dark screenshots | `ci-ok` |
| Theorem statements, definitions, `blueprint.yaml`, lockfiles | **Led by humans;** Claude is a typist and suggester | Alex owns them | `statement-change` + Alex |
| Contracts, ruleset, `.github/`, `.claude/`, pins, CLAUDE.md, SKILL.md | Led by humans | all affected owners | — |
| Merge order, demo script, slide claims | Humans only | — | — |

**Guardrails** (§11A has the design): agent count k ≤ 1 at 16 GB (with `export --watch` paused during `verify`), k ≤ 3 at 32 GB, each headless worker about 2.2 GB plus 2–4 GB per batch build; Design A adds no prover but is ≤ 2 clients per window; per-hole cap 20 min and a turn cap, then `needs-human`; two strikes; no laundering (`verify`); no self-merge (`.claude/settings.json` denies `Bash(gh pr merge:*)`, `Bash(gh api:*)`, `Bash(git push origin main*)`; `run_holes.sh` passes the same as `--disallowedTools`; Ask Isabelle allows only the seven bridge tools and disables built-in tools, slash commands and hooks for the child: `--tools ''`, `--allowedTools mcp__isabelle__*`, `--disable-slash-commands`, `disableAllHooks`); isolation (one worktree, one `.mcp.json`, one Isabelle home per headless worker); kill switch (stop `run_holes.sh`, close `agent/*` PRs; **Stop** in Ask Isabelle kills the child and its MCP process group; a ten-minute deadline does the same); tagging (`agent-generated`).

**SKILL.md rules:** try candidates with `run_at` before editing (B) or read `open` immediately before every `edit` (A: stale versions are rejected); on a one-line stub pass `prefix`; write ASCII escapes only; never edit a statement, ROOT, lockfile or `axioms.allow`; never use `sorry`, `\<proof>`, `oops`, ML commands, `tactic`/`raw_tactic`, `axiomatization`, `oracle`; never close a hole by citing another `sorry`'d lemma; never merge, never `gh api`, never push to `main`; one hole per PR; a new top-level lemma goes into the PR body as a sketch. **Coordinates differ:** the bridge is zero-based (lines and UTF-16 columns); Beam, Isabelle-MCP and `revamp` are 1-based.

---

## 11A. Agent architecture: brain, perception, action

The question is unchanged: *what does the agent perceive, what may it do, and how does the brain choose?* What changed is that there are now **two concrete designs that coexist**, and both feed the same ProofMap.

### Pattern

**Orchestrator plus a pool of workers over a shared knowledge graph** (the ProofMap, C1). No peer-to-peer agent chat: the Fermat's Last Theorem run with Prove2Me showed that unstructured groups lose track of the project's state, and a DAG of fixed statements gives each worker a small job and the orchestrator a global picture.

| | **Design A: shared session** | **Design B: headless** |
|---|---|---|
| What | Leo's MCP bridge: the agent is a client of the running extension and edits the **same buffer** the human sees | Beam/PIDE MCP (and the proposed Isabelle-MCP, S7): each worker has its **own prover** in its own worktree |
| Prover | the editor's `vscode_server` (one, shared) | one per worker (k ≤ 1 @16 GB, ≤ 3 @32 GB) |
| Perception | `goals_at` (the sidebar's text, facts, messages), `errors`, `status`, `sorry_positions`, `processing_status`; the human's Sledgehammer/try0 results | `node_context`, `get_state`/`isabelle_goal`, `run_at` verdicts, `find_theorems_at`, `docs_lookup`/`docs_search`, `map_status`, sibling proofs |
| Action | `edit` (version-checked, saved through VS Code, undoable) | `run_at` (speculative, file untouched) then write the winner; `verify`; PR |
| Completion | kernel-checked by the editor's completion test (`status().fully_checked`) | `verify` = export + audit in the worktree, then CI |
| Concurrency | ≤ 2 clients per window, one editor-operation queue | parallel worktrees, one draft PR per hole (the lock) |
| Where it shines | the live demo; pairing; Ask Isabelle; the Swarm board | overnight waves; CI; anything unattended |
| Limits | per window; a reload interrupts the bridge; cannot run headless | cannot share the human's buffer; costs a prover each |
| Status | **built** (M5, M7, M8) | **not started** (items 7, 12, 14; S3/S7 overdue) |

`out/claims.json` links both to the viewer: a Design B `claim` writes it; a Design A session can write it too (`revamp claim --in-place` from Ask Isabelle's preamble, stretch), so the ProofMap shows who is working on what. The orchestrator `run_holes.sh` uses **B**; a worker may use **A** or **B**.

```
                 ┌─────────────────────────────────────────────────────────┐
                 │ ORCHESTRATOR: agents/run_holes.sh + a human             │
                 │ reads map_status / next_holes, assigns holes (Design B),│
                 │ enforces caps, labels needs-human; reads claims.json    │
                 └───────────────┬───────────────────────┬─────────────────┘
       one hole each (claim = draft PR = lock + claims.json entry)         │ the live beat / pairing
          ┌────────────────┼────────────────┐                             ▼
          ▼                ▼                ▼                 ┌──────────────────────────────┐
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ DESIGN A worker              │
   │ B WORKER 1  │  │ B WORKER 2  │  │ B WORKER k  │          │ Claude Code / Codex / Ask    │
   │ claude -p   │  │ claude -p   │  │ claude -p   │          │ ─MCP─► mcp/server.py ─► bridge│
   │ own worktree│  │ own worktree│  │ own worktree│          │ edits the human's buffer;    │
   │ own prover  │  │ own prover  │  │ own prover  │          │ the editor's prover checks   │
   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          └──────────────┬───────────────┘
          └── PRs ─────────┴────────────────┘                   the human saves, opens a PR
                           ▼                                                  │
                 CI: kernel batch build + map audit + agent lint ◄────────────┘
                           ▼
            human merge (Alex for statements) ─► dag.json ─► viewer (claims, events, snapshots)
```

### The three capabilities

| Capability | In this project |
|---|---|
| **Brain** | One Claude Code session per hole. Design B: headless (`claude -p`) from `run_holes.sh` with a fixed prompt and SKILL.md. Design A: Ask Isabelle spawns Claude Code with the bridge as its only tool set, or a user runs Claude Code/Codex with the `isabelle` server. The orchestrator stays a shell script plus a human, not an LLM. |
| **Perception** | Always from the prover, never from the model's belief. A: the sidebar's goal/facts/messages at a position, errors, the whole-theory completion test, `sorry` ranges, processing state. B: `node_context`, the goal at a line, `run_at` verdicts and messages, `find_theorems_at`, docs tools, `map_status`, sibling proofs as examples. |
| **Action** | Ranked by risk. **Read-only, unlimited:** `run_at`, `find_theorems_at`, `get_state`, `goals_at`, `errors`, `status`, docs tools. **Write, contained:** B: the hole's proof body in the worktree; A: the open buffer through `edit` (versioned, saved, undoable, visible to the human). **Gated:** `verify`, then a PR. **Forbidden:** merging, pushing to `main`, editing statements, ROOTs, lockfiles, contracts, CI; enforced by `.claude/settings.json`, the agent lint and CI, and in Ask Isabelle by the allow-list of seven tools. |

### The worker loop (ReAct)

Every iteration is **Thought → Action → Observation**, with every observation from the prover.

```
B: claim(id) ─► node_context(id) ─► retrieve premises          A: open(file) ─► goals_at(hole) ─► sorry_positions(file)
   │                                                               │
   ▼                                                               ▼
loop r = 1..R (R = 4):
   Thought:     read the goal, facts, messages and errors; choose a strategy
                (simp/auto with premises, induction, an Isar skeleton, a calculation)
   Action:      B: run_at(origin, line, candidates[≤16])   # speculative, file untouched
                A: edit(range of the sorry, candidate)      # the buffer changes; the human sees it
   Observation: B: verdicts per candidate                   A: errors(file), status(), goals_at
   ├─ proved / no errors and no sorry ─► B: write the winner ─► verify(id) ─► PR ─► STOP
   │                                      A: status().fully_checked ─► tell the human ─► STOP
   ├─ goals_left / an error at the step ─► refine from that state (Isar `have` steps)
   └─ all error or timeout ─► sledgehammer (B: PIDE MCP tool; A: the human's Isabelle: Sledgehammer, or
                                              write `sledgehammer`, read the Messages, remove it); next round
after R rounds, 20 min, or 2 strikes ─► B: label needs-human and summarise; A: say so in the transcript
```

**Decomposition** follows Prove2Me's "sketch": a worker may add `have` steps inside its proof; it may **not** add a top-level lemma. It writes the proposed statement into the PR body (B) or the transcript (A), and Alex decides whether it becomes a node.

### Retrieval: hybrid search for premises (GraphRAG over the ProofMap)

1. **Query transformation:** the goal at the hole plus the node's `nl`; a HyDE-style sketch adds constant names and lemma-name fragments.
2. **Hybrid retrieval with reciprocal-rank fusion:** structural (`find_theorems_at` / `isabelle_find_theorems` on head constants; in A, Isabelle's own `find_theorems` typed into the buffer and read from Messages), lexical (`docs_search`, BM25 over `docs.jsonl`), dense (stretch, after the cut line: embeddings of statement plus doc over HOL and the pinned AFP), and the prover's own relevance filter (Sledgehammer's MePo/MaSh, free, now one click away in the editor).
3. **Graph context:** walk the ProofMap to declared and actual dependencies; include their statements and 1–2 proved siblings as worked examples.
4. **Budget:** about 30 premises and 2 example proofs per worker.

The **natural-language system for physicists and mathematicians** (retinapeg) reuses the stack: a plain-language question → hybrid retrieval over `docs.jsonl` → an answer citing facts by name with statement and file:line; "explain this node" uses `node_context`; "formalise this sentence" produces a **draft** statement that enters the repo only through a `statement-change` PR. Natural-language output never becomes a statement automatically.

### Evaluation: does the agent actually work?

| Level | Measure | How |
|---|---|---|
| End to end | Holes closed (pass@1, pass@k), minutes and tokens per hole, **per design** | Held-out set: re-open 10 proved Demo/Apéry lemmas as `sorry` on a scratch branch; run a B wave; run A on the same holes with the Swarm prompt. `docs/agent-eval.md`. |
| Retrieval | Recall@10 of the premises the reference proof used | Reference premises from `Thm_Deps` on the original proof |
| Tool use | Share of attempts that used `run_at` (B) or `open` before `edit` (A); first-time `verify`/`fully_checked` rate | Agent logs; the bridge's stale-edit rejections |
| Safety | Cheats caught by lint or audit = cheats attempted; holes laundered = 0 | The CI audit, the planted-cheat and statement-weakening fixtures |
| Regression | The held-out set, re-run | After any change to Beam, `revamp`, the bridge or SKILL.md; not in the required check |

### Guardrails and circuit breakers

- **The kernel is the final judge.** `run_at` verdicts and the editor's completion test are advice; only a batch build plus `revamp map audit` accepts a proof into `main`.
- **The statement is fixed:** `statements.lock` and the audit catch weakened statements; the viewer's events feed shows the same warning.
- **Hole laundering is blocked** by `verify`. **No cheats:** the agent lint bans `sorry`, `\<proof>`, `oops`, `axiomatization`, `oracle`, `ML*`, `setup`/`declaration`, `tactic`/`raw_tactic`; axioms against `axioms.allow`.
- **Circuit breakers:** 20 min per hole, a turn cap, two strikes, `needs-human`; Ask Isabelle's ten-minute deadline and Stop. Kill switch: stop `run_holes.sh`, close `agent/*` PRs.
- **Isolation (B):** one worktree, one Isabelle home, one prover per worker, RAM-capped. **Containment (A):** loopback only, a random token with mode 0600, ≤ 2 clients, version-checked edits, the bridge is "local access under your OS account", not a sandbox for untrusted proof text or ML.
- **Permissions:** `.claude/settings.json` denies `gh pr merge`, `gh api` and pushes to `main`; Ask Isabelle allows only the seven bridge tools.

### Observability

- B: every tool call appended to `out/agent-logs/<hole>.jsonl` (tool, argument hash, verdict, `elapsed_ms`, tokens); `run_holes.sh` writes a summary table into each PR body; each wave reports attempted/closed/escalated and tokens against the kickoff budget.
- A: the Swarm card shows the editing client's name for ten seconds; Ask Isabelle's transcript lists one-line tool calls; receipts land under `.dev-host/`.
- The viewer shows claims from `claims.json` and the events feed; stretch: an "attempts" badge per node from the logs.

### Sketch of the orchestrator (`agents/run_holes.sh`, retinapeg; Design B)

```bash
#!/usr/bin/env bash
# Usage: agents/run_holes.sh <target-node-id> <k-workers>
set -euo pipefail
target="$1"; k="${2:-1}"
revamp map export -d thys "$(revamp session-of "$target")" -o out/      # fresh ProofMap
mapfile -t holes < <(revamp map next "$target" --k "$k" --ids-only)     # ranked open, unclaimed leaves
for id in "${holes[@]}"; do
  wt=$(revamp claim "$id" --json | jq -r .worktree) || continue          # draft PR = lock; claims.json updated
  ( cd "$wt" && timeout 20m \
      claude -p "$(sed "s/{{ID}}/$id/" agents/prompt.md)" \
        --mcp-config .mcp.json \
        --disallowedTools "Bash(gh pr merge:*)" "Bash(gh api:*)" "Bash(git push origin main*)" \
      > "out/agent-logs/$id.transcript" 2>&1 \
    || gh pr edit "$(revamp pr-of "$id")" --add-label needs-human ) &
done
wait
revamp claims prune                                                       # drop entries whose PR is closed or merged
revamp map export -d thys "$(revamp session-of "$target")" -o out/ && revamp map status "$target"
```

`agents/prompt.md` holds the per-hole instructions (the loop, retrieval, stop rules, "never edit the statement"); `docs/SWARM_PROMPT.md` is its Design A counterpart and already exists.

---

## 12. 24-hour timeline (re-baselined at T+4:30)

Wall clock = 09:39 BST + T. **Demo at T+24 (about 09:40 BST Sunday) is an assumption to confirm.**

**Spikes, re-timed.** Go/no-go at **Train 7 (T+5:15)**; fallbacks taken go into ADR-0006.

| Spike | Owner | Pass | Fallback | Status |
|---|---|---|---|---|
| S0 install on all 4 machines | everyone | `isabelle version` = Isabelle2025-2; HOL needs no rebuild; `npm ci --prefix extension` + F5 shows the Goals view | a machine under 16 GB does headless/CI work only; share the tarball; a Codespace or VM | Leo's Mac and the planning container done; others unknown |
| S1 Isabelle in CI | ark | `ci-ok` green on the CI PR; warm ≤ 5 min | container job on `makarius/isabelle:Isabelle2025-2` (`--user root`, `docker/login-action`) | not run |
| S2 editor | *retired:* our extension replaced the Marketplace check | — | — | superseded by M1–M9 |
| S3 Beam on 2025-2 | retinapeg | compiles; failing `by blast` → `error`; loop → `timeout`; md5 unchanged | Isabelle-MCP edit-then-evaluate (S7), else PIDE MCP `get_state` + edit-then-check | not run |
| S4 AFP heaps | Alex, background from T+4:45 | the Prime_Number_Theorem chain (through `Zeta_Function` and HOL-Analysis/`Complex_Analysis`; peaks around 5 GB plus the JVM) builds locally ≤ 60 min and in `heavy.yml`; heaps are architecture-specific, so CI heaps cannot replace the Macs' | ζ(5) skeleton over HOL-Analysis `suminf` with a red bridge node | not started |
| S5 export at scale (after S4) | ark | AFP `Zeta_3_Irrational`: 99 facts `fully_proved` ≤ 2 min; save-to-green measured on Demo now, Apéry in item 10 | own sessions only; memoise by serial; replay snapshots if > 30 s | not run |
| S6 hover definition lookup + marker | ark (the card layer), 10 min | `executeDefinitionProvider` on `geometric_sums` returns a location under `$ISABELLE_HOME/src` (the extension's hover middleware already sees the server's hover); the ASCII marker is accepted and parsed | name lookup only; drop doc source 1 | not run |
| S7 Isabelle-MCP on 2025-2 | retinapeg, 20 min, with S3 | `uv tool install isabelle-mcp==0.6.0`; launch HOL on `thys/`; Demo's `sorry` lines reported; goal at line 12; file stays ASCII | drop Isabelle-MCP | not run |
| **S8 headless acceptance in CI** (new) | ark, after the CI PR | `heavy.yml` runs `check_m3.sh` under `xvfb-run` with a downloaded VS Code and passes once | acceptance evidence stays on the planning container's rig | not run |

**Rest blocks (four people, staggered; at least two awake at all times):**

| Who | Asleep (T+) | BST | Awake for |
|---|---|---|---|
| Leo | 9:30–12:30 | 19:09–22:09 | the dry run (13:00), the cut line, both rehearsals, the demo |
| ark | 15:30–18:30 | 01:09–04:09 | the cut line (tags `demo-v1` before sleeping), the freeze, rehearsals |
| Alex | 18:00–21:00 | 03:39–06:39 | the cut line, rehearsals, the pitch (asleep over the freeze: his ζ(5) merges are in by 18:00) |
| retinapeg | 18:30–21:30 | 04:09–07:09 | the cut line, the SHOULD list (merged by 18:30, before the freeze), the backup machine |

Between 18:30 and 21:00 Leo and ark are the two awake, so they hold the freeze (19:00); the Beam/MCP owner sleeps over it (18:30–21:30) and is back for the rehearsals; the video is recorded by Leo at T+19:30 (05:09), and ark fixes what it finds.

| T+ (BST) | Alex | ark | retinapeg | Leo | Gate / milestone |
|---|---|---|---|---|---|
| **4:30–5:15** (14:09–14:54) | Archive his repo (D1); S4 in the background; `thys/Demo` from `proto/proofmap` (item 5) | Issues `P1`–`P20`, labels; skeleton PR; merge #6 as a merge commit; D2, public, invite Leo | S3 + S7; draft C4 (`isabelle-beam`, `isabelle-lsp`, the bridge as built) | Review the five-branch merge on `integrate/all` (items 15–16 are in); re-run `check_m3` + the six checks on his Mac | **Train 7 (5:15): GO/NO-GO (S3/S7); C1–C3 frozen; the 18 items on `main`** |
| 5:15–6:45 (14:54–16:24) | Item 11: Apéry statements B1–B12 (`sorry` on its own line), `blueprint.yaml`, `statements.lock`, `axioms.allow` | CI PR (item 2) green and merged; caches seeded; ruleset + squash-only; item 3 contracts + `tools/` skeleton with the `claims` schema | Beam in the repo and CI (item 7) **or** Isabelle-MCP smoke; docs index as `tools/revamp/docs/` (item 8) with `data/isar-ref.jsonl` | Adversarial-review fixes for the 18 items (one squash PR per branch); `demo-smoke.sh` v0 with retinapeg (item 13) | **Train 8 (6:00): C4 frozen.** **Train 9 (6:45)** |
| 6:45–9:00 (16:24–18:39) | Review contracts; first Apéry proofs by hand; `ui.md` v0 with the screenshots from the five branches | Item 6 export: the 15-minute `record_proofs` spike, classifier fix, audit, IDs; S5 on Demo | Item 12 `revamp` server with `claim` → `claims.json`, SKILL.md; `run_holes.sh` v0 (item 14) | Reviews and lands ark's item 10 viewer from `feat/proofmap` (as `extension/` owner: conflicts with the goals and symbols code); then item 9 hover cards with ark (ark owns both) | **M1 (9:00 = 18:39): vertical slice on `main`.** Apéry → `dag.json` (CI artifact) → viewer; `run_at`/`evaluate` from Claude Code; `docs.jsonl` written |
| 9:00–12:30 (18:39–22:09) | Drive agents on Apéry leaves: Design A in the editor, Design B one at a time on 16 GB; review proofs | Hover cards (item 9) finished; viewer polish on Apéry; save-to-green measured; S8 | B end to end: one node closed through a PR and the gate; pain points → issues; `setup.sh` v0 by 12:00 | **asleep 9:30–12:30** | **M2 (12:30 = 22:09): both designs end to end; cards and viewer on Apéry; ≥ 4 Apéry nodes green** |
| 12:30–15:00 (22:09–00:39) | Planted demo PR on `demo/weaken-…` (item 16); ζ(5) definitions by hand; review waves | Accept `setup.sh` v0 on a clean machine; cut-line fixes only | Cut-line fixes; launch the overnight B wave (≥ 32 GB only) | **Dry run at 13:00 (22:39)** of all of §2 on the demo machine; golden hole rehearsal | **CUT LINE (15:00 = 00:39): full run on `main`, tag `demo-v1`, video v0** |
| 15:00–19:00 (00:39–04:39) | ζ(5) leaves with agents; demo script; replay snapshots (asleep from 18:00) | (asleep 15:30–18:30) | SHOULD: full `setup.sh` + `doctor.sh`, `docs_search`, `claims.json` prune path, `heavy.yml` acceptance (asleep from 18:30) | Items 15–16 polish, "Read as paper" behind `isabelleRevamp.readAsPaper`; prepare the video run | **FEATURE FREEZE (19:00 = 04:39).** Later merges are additive and behind a setting. |
| 19:00–21:30 (04:39–07:09) | (asleep until 21:00) | From 18:30: demo machine from `main-latest`; fix what the video finds | (asleep until 21:30) | **Record the fallback video at 19:30 (05:09)**; backup machine from `main-latest` | |
| 21:30–24:00 (07:09–09:39) | Rehearsals at 22:00 (07:39) and 23:00 (08:39); claims check; pitch | Owns the demo machine; tag `demo-final` | Backup operator; stages the golden hole; B wave results into the slides | Drives the editor in the demo | **Demo at T+24 (09:39), to confirm** |

**36-hour variant:** the cut line moves to T+23, the freeze to T+29, rehearsals to T+33 and T+35. The extra hours go to more green ζ(5) nodes, Design B waves at scale, the Isar context pane and the RC4 canary.

**Demo-safe rule:** `demo-v1` on its own must give the whole §2 demo on Apéry alone. If anything merged later breaks, turn its setting off (`isabelleRevamp.*`) or demo from the tag.

---

## 13. The plan items (issues `P1`–`P20`)

Issues are created as **`P<N>: <title>`** (PRs occupy #1–#6, so numbers will not match) and referenced as "plan item N"; PRs say "Closes #M (plan item N)". Status at T+4:30 in bold.

1. **Bootstrap and canonical repo** (ark) — **PARTLY DONE** (commit 0, `proto/*` and PRs #1, #2, #5 are in; nothing else)
   - Issues `P1`–`P20` and the eight labels exist. PR #6 is merged as a merge commit; the skeleton PR is merged (CONTRIBUTING, LICENSE, CODEOWNERS, templates, `.gitattributes`, `.isabelle-version`, `deps.lock`, `.claude/settings.json` with the three deny rules, `.mcp.json.example`, `thys/ROOTS` + `thys/Smoke/`, ADR-0001–0007, `contracts/README`).
   - Repo renamed (or ADR-0001 records why not) and public; Leo, Alex and retinapeg have accepted invites and posted the per-machine checklist; Leo's remote points at `$R`; the `hymanimy/isabelle-revamp` README points here and that repo is archived; `--allow-update-branch=false` set; nothing large was ever pushed (the blob-size check prints nothing; GitHub rejects blobs over 100 MB and anything pushed stays in history; `git ls-files | grep -E '\.(vsix|db|jar)$|heaps/'` prints nothing).
2. **CI gate, setup-isabelle, ruleset** (ark; from `proto/ci`) — **NOT STARTED**
   - Ships `changes`, `lint`, `isabelle` (build only), `vscode` (`extension/`: `npm ci`, `npm run compile`, `node test/unit_*.cjs`, vsix) and `ci-ok`, plus `setup-isabelle`, `heavy.yml` (with the `acceptance` job), `cd-main.yml`, `ruleset-main.json`, no `hymanimy` left. Green on its own PR; `main` stays green.
   - actionlint clean; docs-only ≤ 3 min; `thys/` ≤ 5 min warm / ≤ 8 min cold; `vscode` ≤ 4 min.
   - CI turns red for: a broken theory; a non-ASCII `.thy` (including `examples/`); `keywords` in a header; `axiomatization` under `thys/`; `oracle` in command position; a duplicate theory base name; a TypeScript error; a failing `unit_*.cjs`.
   - Agent lint in place before M2 (the list in §9).
   - The `isabelle-dist-Linux-X64-Isabelle2025-2` cache exists after one `workflow_dispatch`; the ruleset is active (direct push rejected, squash only, head branches deleted, no "Update branch").
3. **Contracts v1 and the `tools/` skeleton** (ark leads; all four approve) — **NOT STARTED**
   - C1–C4 schemas and goldens with `schema_version: 1`; **plus `claims.schema.json`** and its golden (already on `feat/proofmap` with `contracts/README.md`: land them with the viewer or here, whichever is first, not twice); C4 records the bridge's seven tools as implemented (zero-based) and `isabelle-beam`/`isabelle-lsp`/`revamp` (1-based). `tools/` skeleton (`pyproject.toml`, plugin CLI, `revamp.contracts`), the `py` job. C1–C3 frozen at Train 7, C4 at Train 8.
4. **Toolchain on 4 machines and the pain-points log** (retinapeg; everyone) — **PARTLY DONE**
   - Each machine reports the checklist (RAM, free disk ≥ 15 GB, OS, architecture), `isabelle version`, the HOL no-op build time and F5 of the extension. The demo machine chosen. `docs/PAINPOINTS.md` (35 entries, done) gets severity/OS/step/time-lost per entry where missing, is scrubbed, and each entry becomes an issue (`pain-point` label).
5. **Demo fixture `thys/Demo`** (Alex; from `proto/proofmap`) — **NOT STARTED**
   - Parent HOL, `options [quick_and_dirty, record_proofs = 1]`; the v1.2 cases (plain `sorry`; inner `have … sorry`; a lemma resting only on a hole; **a lemma with its own `sorry` that also uses a sorry'd lemma**; a `\<proof>` hole; `sorry` in a `text` block and a comment; a proved lemma; a definition; a `text ‹›` doc, an ASCII marker and a `\<comment>`); `EXPECTED.json`; no theory name reused by Apéry; CI green. `examples/Demo.thy` is Leo's and is a different thing (an `examples/` theory named `Demo`, never in a ROOT; the session is `Demo` too, which is confusing but harmless: rename the session to `Fixture` if anyone trips).
6. **ProofMap export, lock and audit** (ark; Alex reviews the ML; from `proto/proofmap`) — **NOT STARTED**
   - The 15-minute `record_proofs = 1` spike first (ADR-0006 records the classifier chosen); `revamp map export -d thys Demo` validates against C1 with `Session.Theory.fact` IDs; statuses equal `EXPECTED.json` including the mixed case and `\<proof>`; `revamp map next Demo.Top.main_target` ranks `Demo.Basics.dbl_mono_open` first with leverage 3; the export is the only build in the `isabelle` job (one wrapper session; per-session `DAG_Export_<S>.thy` for `heavy/`); `lock`, `audit` (changed hash; the planted `axiomatization where cheat: False` fixture; a new oracle); Demo export ≤ 60 s in CI.
7. **Beam component** (retinapeg; from `proto/beam`) — **NOT STARTED; may shrink to `run_at` only or be cut (S3/S7)**
   - Both soundness fixes, LGPL headers, `deps.lock` pin, the `beam` job; the smoke verdicts (`by blast` not `proved`; `by foo` → `error`; `(rule ccontr)+` → `timeout`; md5 unchanged; one-line stub hint and `prefix`); 16 candidates ≤ 3 s; `Beam_<Parent>` template for AFP-based theories (item 15 depends on it, on PIDE MCP's `session_requirements`, or on Isabelle-MCP's `session_dirs`).
8. **Docs index and Isar-Ref index** (retinapeg; from `tools/prototypes/`) — **NOT STARTED** (prototype merged in PR #1)
   - `revamp docs index $ISABELLE_HOME/src/HOL thys` validates against C2, ≤ 60 s, prints coverage; `doc_source` right for the three styles including the ASCII marker; `data/isar-ref.jsonl` ≥ 150 entries (retinapeg's whole hover deliverable; he does not edit `extension/`); Markdown conversion unit-tested.
9. **Hover cards in `extension/`** (ark; Leo reviews) — plan: `docs/plans/vscode-companion.md` §2, with the path change — **NOT STARTED** (the server hover, item 3, is built)
   - A `HoverProvider` next to the existing hover middleware, in `extension/src/hover/`; the §6.3 card and badge; p95 ≤ 150 ms on `geometric_sums`, `append_assoc` and an Apéry lemma with a marker; `simp` and `obtain` show Isar-Ref text; adding a marker and saving updates the card; golden-card unit test in `test/unit_hover.cjs`; light and dark screenshots; no new dependency; settings `isabelleRevamp.hover.{docsIndex,isarRefIndex,definitionTimeoutMs,logTiming}`.
10. **ProofMap viewer in `extension/`** (ark; Alex signs off the look; Leo reviews) — **BUILT on `feat/proofmap`** (commit `8b770e5`; PROGRESS entry "ProofMap viewer (plan item 10)"; not yet on `integrate/all`)
    - Commands `isabelleRevamp.showProofMap`, `showProofMapInNewWindow`, `proofMap.fit`, `proofMap.reload`, `proofMap.openSnapshot`; settings `isabelleRevamp.proofMap.{dagPath,claimsPath,followAgent,autoOpen}`.
    - Cytoscape + dagre bundled by esbuild (no CDN; CSP `default-src 'none'`, nonce'd script, `style-src` limited to the webview's own resources and **no `'unsafe-inline'`**: an inert `<meta id="__________cytoscape_stylesheet">` stops Cytoscape injecting its inline stylesheet); colours from `--vscode-*` variables; the §6.2 leanblueprint legend; click → file:line; hover → statement and `nl`.
    - Watcher on `out/dag.json` with debounce and partial-write retry; `claims.json` overlay (badge, PR link, `followAgent`); events feed with regression and statement-change warnings (the FR4 mirror); snapshots to `out/snapshots/` and replay for the demo.
    - **Done:** `unit_proofmap.cjs` (11 checks: parser tolerance, ranking on the 12-node Apéry fixture with `linear_form_small` first at leverage 3, deterministic diffs, regressions, claims, symbols, protocol, CSP); `check_proofmap.sh` on the rig (five commands registered, snapshot, live rewrite through a truncated file, a late `claims.json`, open file:line, pop-out); `perf_proofmap.cjs` (Playwright: 500 nodes / 740 edges in 564–623 ms to first paint, within the 2 s budget; the adversarial 85-rank chain takes 1.9–2.2 s and the status bar warns above 500 nodes); works offline. **Open:** save-to-green on Apéry once item 6's `--watch` exists (≤ 30 s); Alex's sign-off from `.dev-host/proofmap-{dark,light}.png`; merge into `integrate/all`.
11. **Apéry blueprint statements** (Alex) — **NOT STARTED**
    - `thys/Apery`: parent HOL, imports `Complex_Main`, `options [quick_and_dirty, record_proofs = 1]`; B1–B12 each with a `text ‹›`, a paper reference and a marker; **`sorry` on its own line**; no natural-number subtraction; the main theorem `(λn. (-1)^n / (real (n+1)^3 * real ((2*(n+1)) choose (n+1)))) sums (2/5 * (∑n. 1/real (n+1)^3))` assembled from its children (Alex fixes the indices); `blueprint.yaml`, `statements.lock`, `axioms.allow` committed; ≥ 12 nodes on the map.
12. **`revamp` MCP server, `claims.json` and SKILL.md** (retinapeg; map functions from item 6) — **NOT STARTED**
    - The §6.1 tools; `claim` pushes `agent/<slug>`, opens the draft PR, checks uniqueness, **writes `out/claims.json`**; `verify` removes the entry on `ok`; the PR-closed prune path; two machines claiming the same hole get one `ok:true`; worktree `.mcp.json` and `HOME=<wt>/.isahome` for the Isabelle servers only; `verify` with `-o threads=2` pauses `--watch` and rejects laundering; `.mcp.json.example` registers `isabelle` (the bridge), `isabelle-beam` and/or `isabelle-lsp`, and `revamp`; given "close the highest-leverage hole in Apery", Claude picks `next_holes[0]`, claims, proves, `verify` passes, the PR goes ready with `agent-generated`; a statement edit or `axiomatization` is rejected by `verify` and CI; SKILL.md states the §11 rules and the two coordinate conventions.
13. **`setup.sh`, `doctor.sh` and `demo-smoke.sh`** (retinapeg) — **NOT STARTED**
    - `demo-smoke.sh` v0 by Train 8 and in use by M1: compiles the extension, runs `check_m3.sh` if a VS Code executable is given, exports Demo, validates against C1.
    - `setup.sh` v0 by the cut line: reads `.isabelle-version` and `deps.lock`; checks or downloads Isabelle (sha256); **installs our vsix from `main-latest`** (`code --install-extension isabelle-revamp-*.vsix`) or runs `npm ci --prefix extension` for the F5 path; writes `.vscode/settings.json` (`isabelleRevamp.executable`) locally; creates `mcp/.venv` and prints the `claude mcp add` / `codex mcp add` lines (never registers on its own); registers Beam/Isabelle-MCP components; warns about other `~/Isabelle20*`. No third-party extension is installed; no `extensions.autoUpdate` change is needed.
    - `doctor.sh`: Isabelle version and HOL heap, Node ≥ 20, Python ≥ 3.11 for `mcp/`, the discovery file, `claude mcp get isabelle`, one component line per home. Accepted when ark runs `setup.sh` verbatim on a clean machine with no "blocker" pain points.
14. **`agents/run_holes.sh` and `agents/prompt.md`** (retinapeg; §11A) — **NOT STARTED**
15. **ζ(5) skeleton in `heavy/`** (Alex) — **NOT STARTED**: the preprint's numbering and mo271's module list (credited); Romik cited only; AFP `θ_asymptotics`; the Hankel determinant via the Leibniz formula over `{p. p permutes {..<K}}`; stubs with `sorry` on its own line; agent work depends on `Beam_<Parent>` or Isabelle-MCP `session_dirs`.
16. **Demo script, fallback video, the planted demo PR and replay snapshots** (Alex, with Leo for the video) — **NOT STARTED**: the draft PR on `demo/weaken-<node>` (`agent-generated`, `do-not-merge`) that weakens one Apéry statement, passing the lint and failing the `statement_sha1` audit, by the cut line; snapshots from the CI `proofmap` artifact and the viewer's `out/snapshots/`; `docs/demo-script.md` with the fixed ζ(5) wording.
17. **Isar outline polish and "Read as paper"** (Leo; stretch) — **outline and breadcrumbs BUILT** (item 10 of Alex's list); "Read as paper" (fold every proof body using the existing folding ranges) behind `isabelleRevamp.readAsPaper`, after the freeze only.
18. **`isa2uni` textconv** (ark; stretch) — NOT STARTED.
19. **`docs_search`** (retinapeg; stretch) — NOT STARTED.
20. **Isabelle2026-RC4 canary** (ark; stretch) — NOT STARTED.

### 13.1 Extension UX: Alex's 18 items (owner Leo; ark backup)

Alex's hands-on feedback, verbatim list below, is **built** on five feature branches in the planning container and **merged into `integrate/all`** at T+4:35 (`--no-ff`; the integration entry in `docs/PROGRESS.md` records the conflict resolutions and the PASS counts). The adversarial review and fixes are next; nothing is on `main` yet (PR #6). Each branch has a `docs/PROGRESS.md` entry (Changed / Passed / Discovered / Next) and a `scripts/check_<feature>.sh` (six scripts: `feat/goals` has `check_goals.sh` and `check_goals2.sh`) that passed on the headless rig (§9), with `check_m3.sh` as the regression check; **that rig is the source of acceptance evidence** for these items until `heavy.yml` reproduces it, because no laptop has it. All of them keep ASCII on disk, change no Isabelle file, keep the webview CSP at `default-src 'none'`, and add their settings and commands to `extension/package.json`. Credits for ported pieces are in `extension/THIRD_PARTY_NOTICES.md`.

| # | Item (Alex's words) | Branch · PROGRESS entry | Acceptance (short) | Status |
|---|---|---|---|---|
| 1 | Lock library files (HOL, HOL-Analysis, ML) when reached by Ctrl-click | `feat/quickwins` · "Quick wins 1–5" | A file under `ISABELLE_HOME`/`ISABELLE_HOME_USER` becomes read-only for the session when it becomes the active editor (`isabelleRevamp.lockLibrary`); a workspace symlink into the library locks too; the fixture stays writable. | built |
| 2 | Nicer syntax colours (the current pink and blue) | `feat/quickwins` | Reworked TextMate scopes: inner syntax `meta.inner-syntax` with name/operator/numeral/type-variable scopes, goal commands `storage.type` with the name as `entity.name.function`, proof commands `keyword.control.proof`, methods only in method position, `sorry`/`oops` `keyword.other.unfinished`, document cartouches `comment.block.documentation`; checked across Dark+, Light+ and both high-contrast themes. Alex signs off from screenshots. | built |
| 3 | Check hover on value results, types and constants | `feat/quickwins` | Hover middleware decodes `\<symbol>` escapes and renders each server tooltip as an `isabelle` code block; live: `sqrt` → `constant "NthRoot.sqrt" :: real ⇒ real`, `value` → `"4" :: "nat"`, `\<rat>`. | built |
| 4 | Open the goals view on the right automatically when a .thy file opens | `feat/quickwins` | An **Isabelle Goals** panel opens beside the editor (`ViewColumn.Beside`, no focus steal) once per window when the first theory becomes active (`isabelleRevamp.goalsPanel`: beside / sidebar / off), sharing the model with the sidebar; **Isabelle: Open Goals Beside Editor**. | built |
| 5 | Restart command or button for the language server | `feat/quickwins` | **Isabelle: Restart Language Server** rebuilds the client and rebinds Goals; a status-bar item (`Isabelle: ready / checking… / stopped`) and a ↻ link in the goals header; after a restart the same goal returns at the same caret. | built |
| 6 | Show Unicode symbols (`\<noteq>` → ≠) and add an input method (`\noteq` → ≠). **Decision: ASCII on disk, Unicode displayed.** | `feat/symbols` · "Alex items 6, 7, 11" (display from M9 A) | `\` completion over the installed `etc/symbols` (name, glyph, abbrev) plus session abbreviations (`PIDE/abbrevs_request`); rewrite on type `\name`+terminator → `\<name>` (`isabelleRevamp.symbolRewrite`); **Isabelle: Insert Symbol…**; the file stays ASCII (every insertion is an escape; tests compare bytes). | built |
| 7 | Real superscripts (`m⇧2` → m²) | `feat/symbols` | `\<^sup>`, `\<^sub>`, `\<^bold>` and the block forms render as real super/subscripts in the editor, with glyphs where Unicode has them and raised/lowered source otherwise; columns unchanged. | built |
| 8 | Colour the goal state | `feat/goals` · "Goals sidebar: colour, messages, facts, done state" | The sidebar renders Isabelle's own output markup through a sanitiser (allow-listed elements and classes) with the official light/dark palette; free, bound, skolem and type variables coloured; high contrast falls back to theme variables. | built |
| 9 | Underline lines that have output (jEdit dotted underline / Lean info squiggle) | `feat/decorations` · "Alex's items 9, 10 and 18" | `dotted_writeln/information/warning` ranges painted as a dotted underline; semantic colours for variables, keywords, numerals, comments (`isabelleRevamp.decorations.semanticColours`); processing and error shades; overview-ruler lanes. | built |
| 10 | Outline and breadcrumbs: theorems and lemmas as document symbols | `feat/decorations` | A pure lexical outline: headings nest, `locale`/`class`/`context`/`instantiation` contain their items, every declaration folds, `proof … qed` folds; document symbols (Outline, breadcrumbs, Ctrl+Shift+O), folding and workspace symbols (Ctrl+T) over every `.thy`; `sqrt2_irrational` found from `examples/`. | built |
| 11 | Cartouches ‹…› instead of "…" (auto-close pair and a `<<` shortcut) | `feat/symbols` | Typing `<<` → `\<open>`, `>>` → `\<close>` (shown as ‹ ›) under the documented context rule; `\open` snippet with the caret inside; **Isabelle: Convert Quotes to Cartouches** on a selection or the document. | built |
| 12 | Messages section (value, thm, try0 output beside the goal) | `feat/goals` | A collapsible **Messages** section with the command's writeln/warning/error output, an icon, a left border and a count; `value` output and `try0` sendbacks appear there; `goals_at` returns the texts. | built |
| 13 | Clear "done" state | `feat/goals` | `No subgoals!` shows a green **✓ No goals — this step is complete** banner; a settled position without a state shows **Not in a proof**; the header badge still distinguishes *unfinished (sorry)*, *Proof error* and *fully checked*. | built |
| 14 | Header and structure (file:line:col, collapsible goal/facts/messages, coloured `this:` facts) | `feat/goals` | Header `Sqrt2.thy:12:5` with a coloured status badge; collapsible **Goal**, **Facts** (`this:` / `using this:`), **Messages**, **Ask**, with the collapse state persisted; the panel width is sent as the pretty-print margin; the whole open theory is checked (`vscode_caret_perspective=0`). | built |
| 15 | Pin and pause buttons | `feat/goals` · "Goals sidebar: pin, pause and copy-to-editor" | **Isabelle: Pin Goal** keeps a goal visible while editing elsewhere (Go to / Unpin per pin, Unpin all); **Toggle Pause Goals** stops following the caret and shows Resume; both in the view title and the header; a pin is a frozen snapshot (`PIDE/state_auto_update false`), flagged *Theory edited since pinned* when the version changes. | built |
| 16 | Copy-to-editor button on messages | `feat/goals` (`insertProof.ts`) · same entry | An **Insert** button on sendback messages (e.g. `try0`'s `by simp`) inserts at the end of the command, replacing a following `sorry`; goes through the bridge-safe edit path so versions stay consistent; the suggestion's Unicode is encoded back to ASCII. | built |
| 17 | Inline try0 / sledgehammer with results on hover or in a panel, and click-to-insert | `feat/sledgehammer` · "Alex's item 17" | **Isabelle: Sledgehammer / try0 / Cancel Sledgehammer** at the caret's command through the stock `PIDE/sledgehammer_*` query; an **Isabelle Sledgehammer** view (provers prefilled, Run/try0/Cancel, one card per proof with **Insert**, message log); a CodeLens on the command line (`running…`, then `Try this: by simp`) and a hover with the same Insert links; insert replaces a `sorry`/`oops` after the command or starts an indented line; results shift with edits and clear when the line changes; cancellation works (`Interrupt`). 17 live checks. | built |
| 18 | Margin tick on fully proved theorems (Lean's blue ✓✓) plus a marker for unfinished ones | `feat/decorations` | Per goal command, a gutter mark from current-version facts (error > `sorry`/`oops` > busy > proved; an unconfirmed version is always "checking"), debounced 150 ms, with overview colours (`isabelleRevamp.decorations.theoremMarks`); the completed theorem `proved`, the placeholder `unfinished`, `by (rule TrueI)` `error`. | built |

Dependencies Alex noted hold: 6 landed first (M9 A), and 7, 8 and 11 build on it. The merge into `integrate/all` was done in the order quickwins → symbols → decorations → sledgehammer → goals (`--no-ff`; all five touched `extension.ts` and `package.json`, goals and sledgehammer the views; `package.json` now has one `contributes` block with 3 views, 16 commands and 8 settings). Still to do: one adversarial review pass by a human who did not build them (the §8 rule for agent-written code), the six `check_<feature>.sh` plus `check_m3.sh` re-run after any fix, then PR #6. Screenshots for Alex's sign-off come from the F5 host on Leo's Mac, since the rig has no screen.

---

## 14. Trade-offs, and what to revisit after the hackathon

| Decision | Alternative | Why this one | Revisit when |
|---|---|---|---|
| Pin **Isabelle2025-2** with the matching AFP | 2026-RC4 | Every dependency is tested on 2025-2: the AFP release, PIDE MCP's branch, Isabelle-MCP (2025-2 only), both prototypes, and Leo's extension (M1–M9 and the 18 items were accepted against it). | After 24 Oct: port Beam's 4 ML API changes (`Toplevel.command_exception`; `Interactive.setmp_parallel_proofs`; the `parse_text` init record; `print_function`'s `command_kind`) and `DAG_Export`'s 2 (`Name_Space.entry_pos`, `Message_Digest.rep (SHA1.digest …)`); move PIDE MCP to its 2026 branch; re-check every `PIDE/*` shape in `PROTOCOL_NOTES.md` against the 2026 server; reseed caches. |
| **Our own extension on the unmodified `vscode_server`** | A companion to yfprojects (v1–v1.2) | It exists and works; no Marketplace pin, no `setup.sh` install of a third-party extension, no single-maintainer dependency, one codebase for UX, hover cards and the viewer; ideas are ported with credit instead. | Offer pieces upstream (outline, Sledgehammer view, symbol input) to Isabelle/VSCode after the hackathon. |
| **Two agent designs, A and B** | One of them | A (the bridge) gives the live beat and pairing with no second prover; B gives parallel, unattended, CI-friendly work. Neither covers the other's case. | When upstream offers a shared headless session; then B can show the human's buffer too. |
| **Display-only Unicode, ASCII on disk** (item 6) | Unicode in `.thy` files | Diffs stay readable to Isabelle and git; the lint stays simple; agents write escapes; Isabelle-MCP's guard agrees. | Never, for `thys/`; a textconv (item 18) is the local-diff sugar. |
| Client-side hover from a lexical index (item 9) on top of the server hover (item 3) | Server patch with Markdown `Hover.reply` | No Isabelle patch; the server's own hover is already shown, so the card adds docs, breadcrumb and link. | A Scala index from PIDE markup (`Build.read_theory`) and a patch series against Isabelle2026. |
| ProofMap edges = the kernel's *actual* dependencies | Hand-written `\uses` | Verified, not self-reported; `declared` edges kept for planning. | Larger sessions: memoise or move to CI. |
| Batch export (`isabelle build -e`) | Live `isabelle server` (`use_theories`, `export_pattern`) | Deterministic and identical to CI. | If ≤ 30 s refreshes feel slow. |
| **`claims.json` as an advisory sidecar**, not part of C1 | Claims inside `dag.json` | The export is kernel truth and should not carry GitHub state; the lock is still the draft PR; the viewer merges the two. | If claims need history, move them to the `revamp` server's own store. |
| **`vscode` job = compile + unit tests; acceptance in `heavy.yml`** | Acceptance in the required gate | Each acceptance run needs a display, a VS Code download and a full Isabelle (3 GB, 2–5 min); the gate must stay ≤ 8 min. | When the rig in CI is reliable, make `check_m3.sh` required on `extension/` PRs. |
| 0 required approvals plus a written norm | 1 required approval | Sleep windows would deadlock merges. | After the hackathon, require 1. |
| Merge PR #6 as a merge commit, squash afterwards | Squash #6 too | Leo's M1–M9 history and the five feature branches' commits are worth keeping once. | — |
| Python MCP servers (the bridge, `revamp`) | Scala inside PIDE MCP | Fastest for Leo and retinapeg; FastMCP is already in `mcp/requirements.txt`. | Propose Beam upstream on the PIDE MCP Zulip (CONTRIBUTING asks for it). |
| Pins in `deps.lock`, no submodules | Submodules or vendoring | No traps for a mixed-experience team; no licence mixing. | — |

---

## 15. Risks and fallbacks

| Risk | Likelihood / impact | Mitigation → fallback |
|---|---|---|
| **The five-branch merge hides a regression** (the conflicts in `extension.ts`, `package.json` and `goalsView.ts` were resolved by hand at T+4:35; the first run after it failed `check_goals.sh` and `check_goals2.sh` until the margin flap and an insert-button race were fixed) | M / M | The six checks plus `check_m3.sh` and the M-suites passed on the merged tree; Leo reviews the resolutions and re-runs them on his Mac; the adversarial review pass before #6; a feature that regresses is parked behind its setting. |
| **No CI has ever reported, and the repo has no gate yet** | certain / H | Issues and skeleton in the next hour; CI PR by Train 8; until then the captain runs `check_m3.sh` on `main` at every train. |
| The MCP bridge is per window: the most recent window owns the discovery file; a window reload interrupts the bridge (recorded in M7) | M / H (demo) | One window during the demo; never reload; `ISABELLE_REVAMP_PORT_FILE` for an isolated instance; restart MCP connections after a reload; the fallback video. |
| Ask Isabelle depends on the signed-in Claude Code CLI on VS Code's PATH and on quota | M / H | Checked by `doctor.sh` and the dry run; quota kept back from the overnight waves; the Swarm board with two scripted clients is the no-model fallback (`check_m7.sh` runs it). |
| `PIDE/*` shapes change or misbehave (the plaintext serialiser is broken; `state_output` deduplicates; the server checks only 50 lines around the caret) | M / M | Every shape we rely on is in `PROTOCOL_NOTES.md` with a probe; client-side workarounds (HTML→text, `vscode_caret_perspective=0`, forced snapshots); pinned 2025-2. |
| **Acceptance evidence comes only from the headless rig**, which no laptop has; the demo machine is macOS arm64 | M / M | S8 reproduces it in `heavy.yml`; Leo re-runs `check_m*.sh` on his Mac with the real VS Code (they take the app executable as `$1`); screenshots for Alex come from the F5 host. |
| `vscode_caret_perspective=0` makes the server check the whole open theory: slower on big theories, more memory | L / M | Only the demo theories are open; make it a setting if ζ(5) theories are opened in the editor. |
| `vsce package --no-dependencies` would ship a vsix without `vscode-languageclient` | M / H (setup.sh) | Dependencies included in the package until the host is bundled (§9); `setup.sh` installs the vsix and `doctor.sh` checks activation. |
| A laptop with 8 GB, or a slow download | M / H | The demo runs on the strongest machine; weak machines do docs and review; share the tarball. |
| Download mirrors fail (the TUM URL redirects to http) | M / M | Three mirrors in the action, the CI cache, a USB copy. |
| Beam reports `proved` when it is not (the 2025-2 global-ref fix) | L / H | Required smoke test; acceptance is always the batch build plus the audit. |
| Speculative output leaks; lines off by one; one-line stubs | M / M | The print-exec-id fix; snap to the nearest command; `prefix`; `sorry` on its own line; the bridge's `sorry_positions` for A. |
| An agent cheats or launders a hole | M / H | Agent lint, `statements.lock`, `axioms.allow`, the oracle audit, `verify`'s laundering check, a human merges; the viewer shows the warning; the rejection is a demo beat. |
| An agent merges its own PR | L / H | Deny rules, `--disallowedTools`, SKILL.md, the seven-tool allow-list in Ask. |
| The classifier misses holes | M / M | `record_proofs = 1` positions; the lexical fallback with `\<proof>`; the item 5 fixture; the bridge's server-marked `sorry` ranges as a cross-check. |
| Two machines claim the same hole; stale `claims.json` entries | M / M | The draft PR is the lock; the prune path removes entries whose PR is closed; the viewer never decides from claims. |
| Parallel builds clash on heaps and `log/*.db` | M / M | One Isabelle `HOME` and one `-d <wt>/thys` per worker. |
| Symbol corruption (Unicode written into a `.thy`; UTF-16 versus symbol offsets) | M / M | ASCII lint on every `.thy`; every editor insertion is an escape; the bridge uses UTF-16 columns explicitly; Isabelle-MCP's guard; hover looks up by line and name. |
| Memory: 2.2 GB per prover, 2–4 GB per batch build, PIDE leaks in long sessions | M / M | k caps; `-o threads=2`; one fresh session per hole; **Isabelle: Restart Language Server** (item 5). |
| Merge conflicts in a single `.thy` or ROOT | M / M | One cluster of holes per theory; worktrees; rebasing at trains; no stacked PRs. |
| AFP heaps take hours | H / L | Background build from T+4:45; `heavy.yml` only; S4 fallback. |
| The live demo is nondeterministic | M / H | Pre-warmed window; a rehearsed golden hole that closes in ≤ 60 s through Ask or Sledgehammer insert; replay snapshots; the video. |
| Overclaiming (ζ(5) "proved by us"; "the first" without a hedge; a Prove2Me or Anthropic affiliation) | M / H | Fixed wording in `demo-script.md`; our own name ProofMap; credits in the README. |
| Mixed licences | L / M | `beam/` LGPL-3.0 on its own; Isabelle-MCP used unmodified from PyPI; ported BSD-3 pieces credited in the notices; Romik cited only; Fauzan linked only. |
| The repo stays private or keeps the hyphen | L / M | Rules by convention plus `ci-ok`; absolute paths and `$R`. |
| `ci-ok` renamed or duplicated | L / H | Comment in the YAML; ark owns `.github/`. |
| Scope creep (OCaml, an analysis library, the full ζ(5) proof, item 17's Isar proofs, a per-`sorry` batch run) | H / H | §4 is binding; at the dry run anything not on the cut-line list is cut. |

---

## 16. Glossary

- **Isabelle/HOL:** the proof assistant and its main logic, Higher-Order Logic. **Poly/ML:** the SML runtime that runs the prover. **Isabelle/Scala:** the JVM layer (PIDE, builds, the server). **PIDE:** the asynchronous document model; `PIDE/*` are the server's custom LSP messages.
- **Session, heap, theory, Isar, proof method, `sorry`/`\<proof>`/`oops`, `quick_and_dirty`, `record_proofs`, oracle, `axioms.allow`, `Thm_Deps`, AFP, cartouche, marker, locale, Sledgehammer, overlay:** as in v1.2; unchanged.
- **`vscode_server`:** Isabelle's own language server, which our extension drives **unmodified**; we request HTML output and convert it, because its plaintext serialiser is broken (M1).
- **The extension (`extension/`):** our VS Code extension (Leo, M1–M9 plus Alex's 18 items): highlighting, display-only symbols with input, the Goals sidebar and panel, outline, decorations, gutter ticks, Sledgehammer/try0, Swarm, Ask Isabelle, the MCP bridge, hover cards and the ProofMap viewer.
- **Goals sidebar / panel:** our InfoView-style view (goal, facts, messages, pin, pause); the panel is the same model opened beside the editor.
- **MCP (Model Context Protocol):** the JSON-RPC protocol through which Claude Code and Codex call tools.
- **MCP bridge (server `isabelle`):** the extension's loopback TCP endpoint plus `mcp/server.py`, exposing seven tools (`open`, `edit`, `goals_at`, `errors`, `status`, `sorry_positions`, `processing_status`) over the **editor's own** prover; ≤ 2 clients per window; zero-based coordinates.
- **Design A (shared session):** an agent works as a bridge client in the human's buffer; completion is the editor's kernel-checked test. The live demo.
- **Design B (headless):** an agent works in its own worktree with its own prover (`isabelle-beam` and/or `isabelle-lsp`) and the `revamp` server; one hole, one draft PR, `verify`, then CI. The overnight waves.
- **Swarm board:** the card view of a theorem's depth-one steps, filled live by agents (clients tagged for ten seconds). **Ask Isabelle:** the box above Goals that streams Claude Code, restricted to the seven bridge tools.
- **PIDE MCP:** kappelmann's headless Isabelle MCP server (LGPL-3.0). **`isabelle-beam`:** PIDE MCP with our Beam component. **Beam / `run_at`:** speculative "try these candidates here", named after Lean Beam's `runAt`. **Isabelle-MCP / `isabelle-lsp`:** Qiyuan Xu's headless MCP server (proposed, S7).
- **ProofMap:** our theorem DAG (nodes, edges, statuses) from the kernel, used by the viewer, the agents and the gate. **ProofMap viewer:** the webview in `extension/` (Cytoscape + dagre, bundled) showing it with the leanblueprint legend, claims, an events feed and snapshots.
- **`claims.json`:** the advisory sidecar `out/claims.json` listing which node is claimed by which agent PR since when; written by `claim`, removed by `verify` and the prune path; shown by the viewer, never used for decisions.
- **Replay snapshot:** a saved `dag.json` (`out/snapshots/<generated_at>.json` or the CI `proofmap` artifact) that the viewer can open to replay a status change without running Isabelle; the demo's safety net.
- **Gutter tick:** the per-theorem margin mark (proved / unfinished / error / checking) drawn from current-version facts, Lean's ✓✓ for Isar.
- **Hole laundering:** "closing" a hole by citing another `sorry`'d lemma; `verify` rejects it.
- **Blueprint (leanblueprint):** a Lean convention of a human-written dependency graph, whose colour legend we reuse.
- **`components -u`, `ISABELLE_HOME`/`ISABELLE_HOME_USER`, `ci-ok`, train, cut line (now T+15; `demo-v1`), golden hole:** as in v1.2; the golden hole is now closed through Design A (Ask Isabelle or Sledgehammer insert), not `claim{in_place}`.
- **Headless rig:** the planning container's stock VS Code under xvfb plus Isabelle2025-2, which runs every `check_m*.sh` and `check_<feature>.sh`; the model for `heavy.yml`'s acceptance job; not on any laptop.
