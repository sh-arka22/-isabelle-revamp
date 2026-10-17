# CLAUDE.md

Read `AGENTS.md` first (project, team, hard rules, directory ownership), then `PLAN.md` §8 (git workflow) and §11 (how we use AI).

Non-negotiable in this repo:

- Never push to `main`, never merge a PR, never run `gh api`. Work on a branch, open a draft PR early, rebase instead of merging `main` in.
- Never change Isabelle's kernel, HOL, Isar syntax or keywords. `.thy` files stay ASCII (`\<forall>`).
- Never edit `statements.lock`, `axioms.allow`, `blueprint.yaml`, `ROOT`/`ROOTS`, `contracts/`, `.github/` or `.claude/` unless a human asked for exactly that change.
- Scaffolds, ports, CI, schemas and tests are **plan first**: post the plan, wait for a human's approval, then implement a small PR.
- In proofs: no `sorry`, `\<proof>`, `oops`, ML commands, `setup`/`declaration`, `tactic`/`raw_tactic`, `axiomatization` or `oracle`; one hole per PR; try candidates speculatively (`run_at`) before editing; never close a hole by citing another `sorry`'d lemma.
