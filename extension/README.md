# Isabelle Revamp: the VS Code extension

Isabelle/HOL in stock VS Code, using the unmodified `isabelle vscode_server`.
M1 provides a plain-text goal probe; M2 adds Isar highlighting and server startup;
M3 adds the **Isabelle Goals** sidebar and live errors. M4 provides a readable,
fully checked proof that sqrt 2 is irrational in `examples/Sqrt2.thy`, with no
`sorry`. M5 connects AI agents to that same editor through seven MCP tools.
M6 adds a theme-aware sidebar, Unicode output and a theory/check-status header.
M7 adds **Isabelle Swarm**, a live card board for six proof steps filled through MCP.
M8 adds **Ask Isabelle**: streamed Claude Code replies and proof edits through those same tools.

## Try the extension in under five minutes

Requires Isabelle2025-2 with the HOL heap, Node 20+, npm, and stock VS Code 1.104+.

1. From this repository, run `npm ci --prefix extension`.
2. Open the repository root in VS Code: `code .`.
3. Check `.vscode/settings.json`: `isabelleRevamp.executable` points to the
   verified macOS installation under `~/hack/isabelle-env/`. Change this workspace
   setting for another installation, or use `isabelle` if it is on VS Code's PATH.
4. Press **F5**, selecting **Isabelle: Extension Development Host** if asked.
   This compiles the extension and opens a development window with `Sqrt2.thy`.
5. In that window, open the Command Palette and run **Isabelle: Show Goals**.
   Click an intermediate `have` in `Sqrt2.thy` to see its goal, or follow the
   [five-step demo](../docs/DEMO.md) to try unfinished, error, and complete states.
   **View → Output → Isabelle** shows `Isabelle language server ready (HOL).`

If `code` is missing on macOS, open VS Code normally and use **File → Open Folder**,
or invoke `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`.
For a manual build, run `npm run compile --prefix extension`.

## Check the proof and sidebar (M4)

In a fresh F5 development host, run **Isabelle: Show Goals** from the Command
Palette. The view lives in the Explorer sidebar. If reusing an older host, first
compile and run **Developer: Reload Window** there.

The sidebar briefly shows `checking…` during processing. An admitted `sorry`
shows **unfinished (sorry)**; a failed tactic shows **Proof error** and an inline
diagnostic. Each of the demo's 11 `have` commands has a distinct goal.
The header names the active theory and shows **fully checked** once its complete
buffer has passed. Goals and diagnostics display Unicode (including `²`);
the source file keeps its original Isabelle notation. Colours and the goal font
follow your VS Code theme and editor settings.

```sh
isabelle process_theories -D examples -O Sqrt2
bash scripts/check_m4.sh
```

If Isabelle is missing from PATH, use
`"$HOME/hack/isabelle-env/Isabelle2025-2.app/bin/isabelle"` for the first command.
For another VS Code installation, pass its **application executable** as the
first argument to `scripts/check_m4.sh` (from the repository root).
The runner uses a separate host profile and test theory under ignored `.dev-host/`.
It includes M3's cursor/diagnostic regression checks, then checks every demo
`have`, the real completed proof, and editing between unfinished/error/complete
states. It leaves the real example unchanged.

## Connect an AI agent (M5)

Follow [mcp/README.md](../mcp/README.md) to install the Python environment and register
the stdio server with Codex or Claude Code. The tools are `open`, `edit`,
`goals_at`, `errors`, `status`, `sorry_positions`, and `processing_status`.
Up to two agents connect to each extension instance. `goals_at` moves the visible cursor
and returns the sidebar's text; `edit` changes and saves the VS Code buffer.
Read `open` immediately before an edit: another agent's changes invalidate old
coordinates, and stale edits are rejected.

After installing the MCP dependencies, `bash scripts/check_m5.sh` runs the real
stdio-to-editor acceptance check, including the M3/M4 regressions.

## Verify the polished sidebar and highlighting (M6)

Run `bash scripts/check_m6.sh` after installing both extension and MCP dependencies.
It includes the M3–M5 live checks, Unicode goals, theory-header switching, and
the installed VS Code TextMate engine's highlighting across Dark+, Light+, and
both high-contrast themes. The grammar covers the core Isar keywords and the
demo's `text`, `where`, and `and`, with nested comments/cartouches and symbols.
It uses a separate profile under `.dev-host/` and leaves the demo unchanged.

For a visual check, reload the development host, open **Isabelle: Show Goals**,
and click `have root_squared`: the sidebar should show `(sqrt 2)² = 2` below
**Sqrt2 · fully checked**. Use **Preferences: Color Theme** to inspect light,
dark and high-contrast rendering. The automated checks validate token styles
and the view model; they do not replace looking at the rendered window.

## Proof Swarm (M7)

Open `examples/Swarm.thy` in the development host and run **Isabelle: Show Swarm**.
Its six grey cards are the skeleton of the sum-of-odd-numbers proof. Click a card
to see its goal; as its proof is filled, it turns amber while checking, green
when checked, or red on an error. Recent MCP edits show the client name for ten
seconds. The header shows progress, elapsed time, and whole-theory completion.

Follow the [Swarm demo](../docs/DEMO.md#swarm) and [agent prompt](../docs/SWARM_PROMPT.md).
Run `bash scripts/check_m7.sh` for the reference proof, all earlier regression
checks, live card transitions, two named MCP clients, stale-edit rejection and
badge expiry. The reference solution is committed but hidden in the demo's
Explorer/search through workspace settings.

## Ask Isabelle (M8)

With Claude Code installed, signed in and registered using [mcp/README.md](../mcp/README.md),
open `examples/Demo.thy` and run **Isabelle: Ask**. Type **prove this** and press
Enter. Claude fills the three named proof steps through MCP while the Goals and
Swarm panels update. Ask **why does this fail?** to inspect an actual diagnostic.
Shift+Enter adds a line; Stop cancels the child process. The session transcript
appends, and requests stop automatically after ten minutes.

Follow the [Ask demo](../docs/DEMO.md#ask-isabelle). `bash scripts/check_m8.sh` checks
streaming, Stop, missing-tool help, webview behavior and earlier regressions.
`M8_LIVE=1 bash scripts/check_m8.sh` also runs the two real Claude acceptance
requests with your configured account/model, temporarily editing and restoring
`Demo.thy`. Ask uses only the installed Claude Code CLI and the seven MCP tools.

## Quick wins after Alex's first hands-on test

- **Goals beside the editor.** Opening a theory now opens the **Isabelle Goals**
  panel in a column to the right, like Lean's InfoView, without taking focus.
  It shows the same header, goal, diagnostics and Ask transcript as the Explorer
  view; both follow the cursor together. `isabelleRevamp.goalsPanel` chooses
  `beside` (default), `sidebar` or `off`; **Isabelle: Open Goals Beside Editor**
  opens the panel at any time.
- **Restart the language server.** Run **Isabelle: Restart Language Server**,
  click the **Isabelle: ready / checking… / stopped** status bar item, or use
  **↻ Restart** in the goals header. The goal at the cursor returns once the
  new server has checked the theory.
- **Hover.** Hovering a constant, type or operator shows Isabelle's tooltip
  (`constant "NthRoot.sqrt"` and `:: real ⇒ real`) as an Isabelle code block,
  with symbols decoded. Hovering a `value`, `thm` or `term` command shows its
  output; hovering `sorry` shows the admitted goal.
- **Locked library files.** A file under `ISABELLE_HOME` or `ISABELLE_HOME_USER`
  (HOL, HOL-Analysis, ML sources, AFP components) becomes read-only for the
  session when Ctrl-click or Go to Definition opens it, so a stray keystroke
  cannot change the distribution. Turn this off with `isabelleRevamp.lockLibrary`.
  For a permanent lock that survives reloads, add the installation to VS Code's
  own setting instead, for example:

  ```json
  "files.readonlyInclude": {
    "**/Isabelle2025-2/**": true,
    "**/.isabelle/**": true
  }
  ```

- **Colours.** Inner syntax in double quotes is no longer a pink string: names,
  operators, numerals, type variables and `::` each get their own scope, goal
  and definition commands are `storage.type`, declared names are
  `entity.name.function`, proof commands are `keyword.control.proof`, proof
  methods are `support.function.method`, `sorry`/`oops` are
  `keyword.other.unfinished`, and `text ‹…›` reads as documentation. The
  built-in Dark+, Light+ and high-contrast themes pick these up directly;
  `editor.tokenColorCustomizations` can refine any scope.

`bash scripts/check_quickwins.sh` runs the grammar, the pure unit checks and the
live panel, hover, locking and restart checks in stock VS Code with Isabelle.

## Symbols, scripts and cartouches

The file stays ASCII; only the display changes. In the editor, `\<^sup>2` shows
as `²`, `\<^sub>i` as `ᵢ`, and an argument without a Unicode glyph (`\<^sup>Q`,
`\<^bsup>n+1\<^esup>`, `\<^bold>x`) is drawn raised, lowered or bold with its
control symbol hidden. Put the caret inside a range to see its source.

Typing: after `\` the completion list offers every symbol of the installed
table (`\forall` → `\<forall>`, detail `∀`), its abbreviations (`!`, `==>`, `<<`),
the session's own abbreviations from `PIDE/abbrevs_request` (`?<`), and `\open`,
a snippet that places the caret between `\<open>` and `\<close>`. With
**Isabelle Revamp: Symbol Rewrite** on (the default), `\forall` followed by a
space, bracket or quote becomes `\<forall>` as you type, as in Lean; for
`\^sub`, `\^sup` and `\^bold` the argument itself ends the name (`x\^sub1` →
`x\<^sub>1`). jEdit's shortcuts work too: `<<` at the start of a token becomes
`\<open>`, and `>>` becomes `\<close>` when a cartouche is still open on that
line or when it starts a token outside a quoted string, so `"x >> 2"` is left
alone. Nothing is rewritten inside comments. **Isabelle: Insert Symbol…** picks
from the table by name, abbreviation or glyph and inserts the ASCII escape.

**Isabelle: Convert Quotes to Cartouches** rewrites outer-syntax `"…"` arguments
of the selection (or the whole theory) to `\<open>…\<close>`, decoding `\"`,
`\\` and `\ddd`; the theory header, comments, existing cartouches and strings
with unbalanced cartouche delimiters are left as they are. Review the diff: a
few commands only accept quoted strings.

The server now runs with `vscode_unicode_symbols_output=true`, so diagnostics
and hover text arrive in Unicode; the client conversion remains as a fallback.
`bash scripts/check_symbols.sh` runs the unit checks and a live host check of
completion, the rewrite, the shortcuts, scripts, the converter and the session
abbreviations.

## Markup colours, outline and theorem marks

Once Isabelle has checked a command, the editor shows the server's own markup
as jEdit does: free, bound and type variables, keywords, numerals and comments
take Isabelle's colours where the grammar had only guessed (setting
`isabelleRevamp.decorations.semanticColours`), commands still being checked are
shaded (`processingBackground`), a failed or admitted command keeps its red
shade, and a command with output (`value`, `thm`, `try0`, a warning) gets the
dotted underline from jEdit. The overview ruler shows unprocessed, running,
error and warning lines on the right. The colours are the official light and
dark defaults, credited in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The **Outline** view and breadcrumbs list theorems, lemmas, definitions,
datatypes, locales and the other declarations, nested under `section`
headings and `locale … begin … end` blocks; `Ctrl+Shift+O` jumps between them
and `Ctrl+T` searches every `.thy` file in the workspace. Each entry folds to
the line before the next one, and `proof … qed` blocks fold as well. The
outline reads the source only: a `lemma` mentioned inside a `text ‹…›`
cartouche or a comment is never an entry.

Every theorem carries a gutter mark that follows the current buffer: a
double tick once it is proved, an amber warning sign for `sorry` or `oops`, a
red cross on an error and a grey dotted circle while Isabelle is still
checking or has not confirmed this version yet (`theoremMarks`). Marks appear
after the cursor has visited the theory once, because completion is only
known for a confirmed document version.

```sh
bash scripts/check_decorations.sh
```

runs the pure outline/status checks (`node extension/test/unit_outline.cjs`)
and the live host: proved, admitted and failed versions of `Sqrt2.thy`,
document symbols, folding, workspace symbols and painted markup counts.

## Sledgehammer and try0 (Alex's item 17)

Put the cursor on a lemma (or any proof command with a goal) and run
**Isabelle: Sledgehammer** or **Isabelle: try0**. The query runs in the
unmodified server; while it runs the command's line shows a
`Sledgehammer: running…` CodeLens (click cancels, as does **Isabelle: Cancel
Sledgehammer**). Each proof found becomes a `Try this: by simp` CodeLens and a
hover entry with an **Insert** link; the **Isabelle Sledgehammer** view in the
Explorer lists the same proofs as cards with **Insert** buttons, the provers
field (prefilled from the server's `sledgehammer_provers`), Run/try0/Cancel
and a collapsible message log. **try0** names only try0's methods as provers,
so no ATP or SMT solver runs; Sledgehammer results found by one of those
methods are labelled `try0` too.

Insert asks the server where the proof goes (`PIDE/sledgehammer_sendback` →
`PIDE/sledgehammer_insert`): the end of the query command. A `sorry` or `oops`
directly after it is replaced; otherwise the proof starts a new line indented
under the statement. The inserted text is the server's ASCII proof text.
Results belong to that one command and disappear once its line is edited,
inserted into, or the file is closed.

`bash scripts/check_sledgehammer.sh <VS Code executable>` runs the pure parser
and insertion checks, then a live run: Sledgehammer and try0 on a two-lemma
fixture under `.dev-host/`, insertion through the server, the fully checked
theory afterwards, cancellation on a lemma that needs induction, and lens
and hover providers. `python3 scripts/sledgehammer_probe.py --isabelle …`
captures the raw query traffic and fixtures.

## Run the goal probe

```sh
python3 scripts/lsp_probe.py --isabelle "$HOME/hack/isabelle-env/Isabelle2025-2.app/bin/isabelle"
```

It prints every server notification and the goal at the theorem statement:

```text
proof (prove)
goal (1 subgoal):
 1. sqrt 2 ∉ ℚ
```

The approved client workaround requests HTML and extracts text because Isabelle's
plaintext serializer fails. See [protocol notes](../docs/PROTOCOL_NOTES.md),
[pain points](../docs/PAINPOINTS.md), and [milestone progress](../docs/PROGRESS.md).
The extension's minimal startup adaptation is credited in
[third-party notices](extension/THIRD_PARTY_NOTICES.md).
