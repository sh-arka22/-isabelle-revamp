# Docs and hover prototypes

Research prototypes written during planning. See PLAN.md §6.3 and issue #8.

- `hover_proto.py`: a lexical index of facts, constants and types. It takes the statement, the doc from a `\<^marker>‹description›`, an adjacent `text ‹›` block or a `\<comment>`, the breadcrumb and file:line, and builds a Lean-style Markdown card.
- `isarref_index.py`: indexes `src/Doc/Isar_Ref/*.thy` (`@{command_def}`, `@{method_def}`, `@{attribute_def}`) for hover docs on Isar keywords. A first run pulled about 190 entries in under a second.
- `docstat.py`: measures how many HOL lemmas have an adjacent doc block (roughly 2–5%), which is why the card must be useful without one.

Point them at `$ISABELLE_HOME/src/HOL`.
