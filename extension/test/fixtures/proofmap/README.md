# ProofMap fixtures

- `dag.apery-mid-session.json`: a hand-derived replay snapshot in the contract C1
  shape (PLAN.md §6.2): the twelve Apéry nodes B1–B12 of PLAN §4 part-way through a
  session. Statuses exercise every legend entry except `oracle` (5 fully proved,
  2 proved, 3 sorry, 1 defined, 1 missing); `statement_sha1` is the SHA-1 of the
  statement text; the `missing` node points at `blueprint.yaml`, as it exists only
  there. Not produced by `revamp map export`: the statements and lines are
  hand-written and will be replaced by a CI `proofmap` artifact once #6 lands.
  The file carries nothing outside the C1 shape, so a strict `dag.schema.json`
  will accept it as is.
- `claims.json`: the advisory sidecar next to it (`contracts/claims.schema.json`):
  one agent claim on the top-ranked hole.
