# ProofMap prototype: theorem dependency graph from the kernel

A research prototype written during planning. See PLAN.md §6.2 and issue #6.

- `isabelle/DAG_Export.thy`: ML that reads `Thm_Deps.thm_deps`, oracles (`sorry` is the `skip_proof` oracle) and axioms for a session, and exports `dag/dag.json` (nodes, statuses, statement hashes, uses).
- `isabelle/ROOT.template`: a wrapper session (`Demo_DAG = Demo +`) that runs the export through `isabelle build -e`.
- `prototypes/next_sorry.py`: ranks open holes. Holes resting on no other hole come first, then those with the highest leverage.
- `prototypes/server_dag.py`: the same export through `isabelle client`.
- `../thys/Demo/`: a tiny fixture with definitions, proved lemmas and `sorry` holes.
- `../tools/tests/fixtures/ax/`: the axiom-audit fixture. **Never** move it under `thys/`.

Tested on Isabelle2025-2 with the Demo session:

    isabelle build -e -d thys -d proofmap/isabelle Demo_DAG

**Known bugs to fix in #6** (from the PLAN review):
- The status classifier misses a lemma that has its own `sorry` *and* a sorry'd dependency.
- `sorry` must also match `\<proof>`.
- Node IDs need the session prefix.
- Generated `dag.json` contains absolute paths: make them repo-relative.
