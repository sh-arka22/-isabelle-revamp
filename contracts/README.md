# Contracts

Machine-readable interfaces between the workstreams (PLAN.md §6). Each contract is
a JSON Schema plus golden examples under `examples/`; consumers build against the
examples so they never wait for the producer. C1–C3 freeze at Train 3 and C4 at
Train 4; after that a change needs the `contract-change` label, a `schema_version`
bump and every consumer's approval. Contracts are human-led: agents only type
what a human asked for.

| Contract | File | Producer | Consumers |
|---|---|---|---|
| C1 theorem dependency graph (`out/dag.json`) | `dag.schema.json` (owner: ark, plan item #3/#6; the shape is specified in PLAN.md §6.2 until the schema lands) | `revamp map export [--watch]` | ProofMap viewer (`extension/src/map/`), `revamp` MCP `map_status` / `next_holes`, the CI audit |
| C2 hover and docstring extraction | `docs.schema.json` (PLAN.md §6.3) | `revamp docs index` | hover cards |
| C3 blueprint | `thys/<S>/blueprint.yaml` (PLAN.md §6.2, "declared" edges) | humans | export, viewer |
| C4 MCP tools | `mcp-tools.json` (PLAN.md §6.1) | `revamp` MCP server | agents |
| Claims sidecar (advisory, **not** C1) | `claims.schema.json` · example `examples/claims.json` | `revamp` MCP `claim` | ProofMap viewer |

## C1 in one paragraph

Node ids are `Session.Theory.fact`; `file` is repo-relative and `line` is 1-based;
`status` is one of `missing | defined | sorry | proved | fully_proved | oracle`
with the rules and the leanblueprint legend of PLAN.md §6.2; `statement` is ASCII
with `\<symbols>` and `statement_sha1` is what the audit compares with
`statements.lock`. Edges go **from the dependent to the dependency** with
`kind ∈ {uses, uses_def, declared}`. Generated `dag.json` files are never committed.

## Claims sidecar (`out/claims.json`)

```json
{ "claims": [ { "id": "Apery.Bounds.linear_form_small", "pr": 58,
                "branch": "agent/linear-form-small", "since": "2026-10-17T11:49:12Z" } ] }
```

`claim` writes it next to the export when an agent takes a hole and removes the entry
when the PR is ready or abandoned. The viewer shows the claimed node with a pulsing
badge and, with *Follow agent* on, keeps it centred. Only `id` is required; the file
may be absent, and the viewer must keep working without it. It carries no authority:
the draft PR is the lock (PLAN.md §5 step 4).
