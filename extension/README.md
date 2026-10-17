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
