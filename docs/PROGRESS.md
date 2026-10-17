# Progress

## 2026-10-17 — M1 initial attempt: blocked by plaintext serialization

- **Passed:** repository and branch verified (`hymanimy/isabelle-revamp`, `leo`,
  initially clean). Added a standard-library Python stdio probe and a `Complex_Main`
  theory with one `sorry`. Live initialize / initialized / didOpen / caret_update
  works. The HTML control returns the expected `sqrt 2 ∉ ℚ` goal through
  `PIDE/dynamic_output`, and clean shutdown returns `"OK"` with server exit 0.
- **Did not pass:** plaintext goal output. With `vscode_html_output=false` and
  `editor_output_state=true`, the server reports `Bad JSON value` in its dynamic
  output consumer. The strict probe exits 1 on timeout. M1 remains incomplete;
  M2–M6 have not started. The theorem still contains the intentional M1 `sorry`.
- **Discovered:** goal output needs `editor_output_state=true`; the plaintext
  decoration serializer appears to pass a function into JSON. Exact messages,
  reproduction commands, control output, and source references are in
  [PROTOCOL_NOTES.md](PROTOCOL_NOTES.md). No Isabelle files were modified.
- **Tooling:** Node v26.8.2 and Python 3.13.15 are available. Stock VS Code 1.138.0
  arm64 is installed, but `code` and `isabelle` are absent from this tool shell's
  PATH. Explicit executable paths work. Isabelle required approved execution
  outside the sandbox because its runtime directory and `sysctl` were blocked.
- **Would do differently:** make the proof-state option explicit from the first
  run and compare HTML/plaintext early, so a server serialization failure is not
  confused with document-loading delay.
- **Next decision:** allow a client HTML-to-text adapter while keeping Isabelle
  unchanged, or retain the strict server-plaintext requirement and remain blocked.
  The HTML control is diagnostic evidence, not a replacement acceptance check.

## 2026-10-17 — M1 passed with approved client conversion

- **Passed:** the live probe requested `vscode_html_output=true`, received
  `PIDE/dynamic_output`, and printed `proof (prove)`, `goal (1 subgoal):`, and
  `1. sqrt 2 ∉ ℚ` as plain text. Shutdown returned `"OK"`; the probe exited 0.
- **Discovered:** the HTML contains nested inline markup but already preserves
  proof whitespace. A small standard-library `HTMLParser` adapter is sufficient;
  Isabelle remains unchanged. Leo explicitly approved this replacement for the
  original server-plaintext requirement. `--server-plaintext` retains the bug
  reproduction, and PAINPOINTS entry 9 records the exact option and error.
- **Would do differently:** separate the wire format from the displayed text in
  the initial acceptance criterion. Keep the raw protocol transcript alongside
  converted output so the distinction stays observable.
- **Next:** M2, the stock VS Code extension skeleton and its live host check.

## 2026-10-17 — M2 implemented; visual acceptance pending

- **Changed:** added the TypeScript extension, the `isabelle` language for `.thy`,
  a TextMate grammar covering all 24 requested keywords and common escaped/Unicode
  symbols, and a stdio LanguageClient using M1's verified options. Added workspace
  executable configuration, an F5 launch task, a lockfile, and a short root README.
  Minimal startup is adapted from the official extension and cited in
  `extension/THIRD_PARTY_NOTICES.md`. No goals sidebar or MCP work has started.
- **Passed:** `npm run compile --prefix extension`; installed dependencies report
  no vulnerabilities. Stock VS Code's bundled TextMate/Oniguruma engine tokenized
  `Sqrt2.thy` and passed checks for every requested keyword, escaped symbols inside
  quoted terms, Unicode symbols, and nested comments/cartouches. The live stock
  VS Code 1.138.0 Extension Development Host activated the extension on
  `onLanguage:isabelle`. Its actual Isabelle Output log contains:

  ```text
  2026-10-17 09:20:17.886 [info] Starting /Users/leo/hack/isabelle-env/Isabelle2025-2.app/bin/isabelle vscode_server -n -l HOL -o vscode_html_output=true -o editor_output_state=true
  2026-10-17 09:20:23.776 [info] Welcome to Isabelle/HOL (Isabelle2025-2)
  2026-10-17 09:20:23.916 [info] Isabelle language server ready (HOL).
  ```

  No Isabelle-channel or extension activation errors were recorded. Test-host
  state and logs live under ignored `.dev-host/`, not global VS Code settings.
- **Discovered:** current `vscode-languageclient` 10.1.2 expects a
  `LogOutputChannel`; TypeScript 7 needs explicit `node`/`vscode` type inclusion.
  Both were fixed before the live run. The installed distribution's original
  extension uses an older client API and a custom encoding; this skeleton uses
  current `await client.start()` and ordinary UTF-8 in stock VS Code.
- **Still pending:** direct visual confirmation of colored syntax and the Output
  panel. Computer Use twice returned `Computer Use was not approved to use Code`.
  The host is open with `Sqrt2.thy`; logs and token tests do not substitute for the
  requested visual check. M2 is not yet marked passed, and M3 has not started.
- **Would do differently:** check app-access availability before scheduling visual
  acceptance; compile against the selected client version before launching a host.
- **Next:** enable Code access for the visual check, or have Leo confirm that the
  open development window shows colored Isar and the ready line in **Output →
  Isabelle**. Then record M2 as passed and commit that milestone result.

## 2026-10-17 — M2 visual retry: access still blocked

- **Checked:** branch remains `leo`; retried the screen tool as requested. App
  inventory confirms Code is running, but selecting it immediately returns
  `Computer Use was not approved to use Code`. No visual acceptance evidence was
  obtained, and no extension code changed.
- **Discovered:** the tool explicitly forbids observing the Codex and Terminal
  apps for safety reasons, so the agent cannot watch their approval dialogs.
- **Would do differently:** distinguish an immediate access denial from a pending
  approval; repeating the call does not establish that a prompt reached the user.
- **Next:** ask Leo whether a Code approval prompt appeared on his side. M2's
  visual check remains pending; M3 has not started.

## 2026-10-17 — M2 passed with Leo's visual confirmation

- **Passed:** Leo confirmed that the visual check passed in the development host.
  Together with the recorded compile, grammar, and live startup checks, this
  satisfies M2's stopping condition.
- **Discovered:** user-observed visual evidence resolved the screen-tool access
  blocker; no new code changes were needed.
- **Would do differently:** use a short manual acceptance check when app access
  is unavailable, clearly attributing the result to the person who observed it.
- **Next:** M3, the goals sidebar with cursor updates, checking state, and errors.

## 2026-10-17 — M3 implemented; live automated checks passed

- **Changed:** added the **Isabelle Goals** WebviewView in the Explorer sidebar,
  **Isabelle: Show Goals**, 150 ms caret debounce, client HTML-to-text conversion,
  immediate hiding of old text on edits/moves, and checking/error states. Standard
  LanguageClient diagnostics appear in the editor. New code uses only VS Code,
  the existing LanguageClient, and standard libraries; Isabelle is unchanged.
- **Passed:** `bash scripts/check_m3.sh` compiled and ran the real stock VS Code
  host against Isabelle, exiting 0. It verified different cursor states,
  identical-state refresh, rapid cursor changes, a failed `by simp` diagnostic at
  the correct range, error precedence, and empty old output during a deliberately
  slow command. A temporary `(2 :: real) = 2` / `by simp` control showed
  `No subgoals!` and cleared diagnostics. The original `examples/Sqrt2.thy` was
  verified unchanged and still contains its M1 `sorry`; its complete proof is M4.
- **Also verified:** injected out-of-order and early state replies, changed
  document versions, decoration deltas, and a busy command beyond the waiting
  deadline. HTML conversion preserves whitespace/entities; the webview escapes
  markup and disables scripts. The test reads the same model rendered by the view.
- **Discovered:** dynamic output is untagged and deduplicated. Built-in state
  query IDs confirm the cursor and permit identical goal refreshes. Busy ranges
  require `vscode_pide_extensions=true` and arrive as deltas. `background_bad`
  includes `sorry`, and a failed method can still return an enclosing
  `No subgoals!` state. Diagnostics therefore take precedence. Exact shapes and
  reference source paths are in [PROTOCOL_NOTES.md](PROTOCOL_NOTES.md).
- **Would do differently:** probe duplicate output and error/busy semantics before
  wiring the UI; these are protocol correctness concerns, not rendering details.
  Use the VS Code app executable for integration tests so test failures propagate
  to the shell rather than relying on the early-returning `code` launcher.
- **Visual check pending:** the screen tool still returns `Computer Use was not
  approved to use Code`. An updated development window is open at `show ?thesis`,
  and its Isabelle log confirms startup. Leo has been asked to check cursor
  movement and the wrong-tactic error using **Isabelle: Show Goals**. M4 has not
  started; record M3 as fully passed after that confirmation.

## 2026-10-17 — M3 passed with Leo's visual confirmation

- **Passed:** Leo confirmed the sidebar visual check passed. Together with the
  live integration checks above, this satisfies M3's stopping condition.
- **Discovered:** unfinished proofs need an explicit `unfinished (sorry)` label;
  Leo requested this distinction for M4 onward, with real errors still reported.
- **Would do differently:** distinguish unfinished work from failed commands in
  the first sidebar design rather than relying on the absence of an error banner.
- **Next:** M4, the readable sqrt-2 proof and five-step demo, including that label.

## 2026-10-17 — M4 passed: readable proof and unfinished status

- **Changed:** completed `examples/Sqrt2.thy` with a reduced-fraction/parity proof
  importing only `Complex_Main`. Its 11 intermediate `have` commands expose
  distinct goals. Added the five-step click path in [DEMO.md](DEMO.md), updated
  the README and probe for the completed example, and added **unfinished (sorry)**
  to the sidebar as requested. No prover or distribution files were modified.
- **Passed:** `isabelle process_theories -D examples -O Sqrt2` (using the installed
  absolute executable path) exited 0. The source contains zero `sorry` and zero
  `oops`. `bash scripts/check_m4.sh` compiled and ran a real stock VS Code host,
  exiting 0: all 11 goal texts were distinct, the actual completed proof showed
  `No subgoals!`, admitting the last step showed **unfinished (sorry)**, and a
  separate failed tactic still took precedence as an error. Comments and text
  mentioning `sorry` stayed ready; restoring the proof cleared errors/admissions.
  The suite also passed M3's cursor-race, diagnostics, and slow-command checks.
  The updated stdio probe exited 0 at the theorem statement. Temporary test edits
  stayed under `.dev-host/`; the actual example was verified unchanged by them.
- **Discovered:** the server's `background_bad` range identifies the literal
  `sorry` command, so the client can distinguish it from comments and genuine
  errors without inventing a source parser. Exact observed shape is recorded in
  [PROTOCOL_NOTES.md](PROTOCOL_NOTES.md). Real-to-natural-number transfer needs
  Isabelle's coercion lemmas; reversing `of_nat_mult` and `of_nat_power` lets
  `simp` check the square equation. PAINPOINTS entries 15–16 record both issues.
- **Would do differently:** use a fixed placeholder fixture for M3 regression
  tests from the start, and check number-type transfer separately before building
  the parity argument. In the new goal test, match actual `have` commands rather
  than the word inside prose; the initial test mistakenly selected a text block.
- **Next:** M5, the local socket and MCP tools. M5 has not started.

## 2026-10-17 — M5 passed: seven-tool MCP bridge

- **Changed:** added the loopback TCP bridge in the extension and a FastMCP 4.1.0
  stdio server in `mcp/server.py`. The tool list is exactly `open`, `edit`,
  `goals_at`, `errors`, `status`, `sorry_positions`, and `processing_status`.
  Leo explicitly added the last two to M5; the stopping condition in
  `CODEX_PROMPT.md` is unchanged. Read the requested
  [AutoCorrode I/Q tool list](https://github.com/awslabs/AutoCorrode/blob/main/iq/README.md#mcp-tools)
  before writing the tools and followed the purposes of its processing/admission
  queries. No I/Q plugin or Isabelle modifications are involved.
- **Passed:** `bash scripts/check_m5.sh` compiled TypeScript and ran the installed
  stock VS Code/Isabelle host, exiting 0. A real FastMCP stdio client discovered
  exactly seven tools, opened a disposable Sqrt2 copy with `sorry`, received goal
  text and phase equal to the sidebar model, and obtained the exact admission
  range. Through `edit` it submitted the full M4 proof; `status` reported both the
  file and aggregate `fully_checked: true`, saved, zero admissions and no errors.
  The completed proof's `No subgoals!` output also matched the sidebar. These are
  live protocol checks, not simulated prover results or a trivial solved control.
- **Also passed:** wrong-tactic error messages/ranges; pending status during a
  two-second proof command; restoring the complete proof after removing `end`;
  invalid-range and symlink escape rejection; invalid-token rejection; refusal
  of a second connection; successful reconnect after the first agent disconnected.
  M3/M4 regression checks passed in the same run. Python dependency validation
  reported no broken requirements. The real `examples/Sqrt2.thy` was verified
  unchanged. Receipts are in ignored `.dev-host/m5-results.json`.
- **Discovered:** fresh goal output can precede status annotations, and error
  decorations can precede diagnostic text. Cached closed documents are not open
  tabs. Forced decoration snapshots do not advance the server's delta baseline,
  so transient running ranges can remain stuck without another snapshot. The
  client now waits for current annotations, marks incomplete error lists, uses
  actual tabs for aggregation, and refreshes snapshots only while busy. Exact
  observations and message shapes are in `PROTOCOL_NOTES.md`; PAINPOINTS entries
  17–19 record the user impact. A slow-command fixture also needed `ML_prf`
  inside a proof; plain `ML` produced `Bad context for command "ML"` and correctly
  remained an error.
- **Delivery:** `mcp/README.md` documents coordinates, result fields, limits,
  lifecycle, and one-line Codex/Claude Code registration commands, checked against
  installed CLI help and official documentation. No client registration or global
  configuration was changed. Test profiles, fixtures and discovery files stayed
  under `.dev-host/`; the runtime default remains `~/.isabelle-revamp/port`.
- **Would do differently:** probe repeated edits and forced-snapshot/delta
  interaction before designing completion reporting. Keep processing, error-list
  completeness, admissions and saved state separate from the start; no single
  goal string or empty diagnostic list can establish completion.
- **Next:** M6's limited sidebar polish. M6 has not started.

## 2026-10-17 — M6 implemented; automated acceptance passed

- **Changed:** the sidebar now uses VS Code theme colours, the editor's font,
  and explicit high-contrast borders. Its header shows the active theory's name
  and current check status, using M5's completion evidence. **unfinished (sorry)**
  remains separate from genuine proof errors; pending output stays hidden.
  Goal text and diagnostic messages decode Isabelle's default symbols to Unicode,
  including `⇧2` → `²`. The sidebar and MCP share that text and header metadata.
  The copied symbol assignments are attributed in `THIRD_PARTY_NOTICES.md`.
- **Highlighting:** added the demo's missing `text`, `where`, and `and` keywords
  and corrected identifier boundaries for apostrophes, qualified names, and
  Unicode letters. The committed test uses the installed VS Code TextMate and
  Oniguruma engines, checks all 27 keywords and 46 command lines in Sqrt2, escaped
  and Unicode symbols, nested comments/cartouches, and quoted strings. Keyword
  and string foreground colours are distinct from ordinary identifiers in
  Dark+, Light+, High Contrast, and High Contrast Light.
- **Passed:** `bash scripts/check_m6.sh` compiled and exited 0 in stock VS Code
  with live Isabelle. It includes all M3–M5 checks: distinct goals, cursor races,
  errors and admissions, real MCP proof edits, completion, and connection rules.
  It additionally verified the live `(sqrt 2)² = 2` goal, Unicode diagnostics,
  fully checked headers, and switching to another theory. The real demo remained
  unchanged. Receipts are in `.dev-host/m6-results.json`; the final compile and
  targeted Unicode checks also passed after guarding unknown symbol names
  against inherited object properties. `git diff --check` passed.
- **Discovered:** HTML output can contain literal Isabelle formatting controls,
  and diagnostic text can retain named source escapes. The initial second-theory
  test selected a completed top-level tactic without a printable proof state;
  selecting its lemma statement promptly supplied a goal and completion status.
  `process_theories` independently checked that fixture. PAINPOINTS entries
  20–23 and the M6 protocol notes record the observations and remaining limits.
- **Visual limitation:** the screen tool again returned **Computer Use was not
  approved to use Code**. No direct M6 screenshot inspection is claimed. The
  real editor/tokenizer tests above passed; the README gives the remaining
  manual light/dark/high-contrast check. No global settings were changed.
- **Would do differently:** make the tokenizer check reproducible in the
  repository from M2, test the actual demo vocabulary, and distinguish goal
  availability from theory completion when choosing cursor fixtures.
- **Next:** reload the development host and visually review the polished sidebar
  and highlighting. M6's requested implementation scope is complete; no further
  features or milestones were started.

## 2026-10-17 — M7 passed: Proof Swarm board

- **Changed:** added the **Isabelle Swarm** WebviewView and **Isabelle: Show
  Swarm** command. A structural lexer finds the requested depth-one proof steps
  in the current theorem, ignoring comments, strings, cartouches and nested
  proofs. The six-card demo proves the sum of the first n odd numbers is n².
  `Swarm.thy` keeps six `sorry` bodies; `Swarm_solution.thy` is the committed
  checked reference, hidden from Explorer/search by workspace settings.
- **Board:** grey admissions, amber processing/unknown completion, green local
  proofs and red errors reuse the existing current-version decorations and
  diagnostics. Updates are coalesced over 150 ms. Card buttons select the source
  step and update cursor goals. The M6 header/theme code is shared; the board
  shows N/M, seconds since the first document edit, and **kernel-checked ✓** only
  when the whole theory satisfies the same completion test as MCP `status()`.
  Retained DOM nodes allow 300 ms CSS status transitions; labels/status text use
  `textContent`, with keyboard-accessible buttons and a restricted script nonce.
- **Agents:** M7 supersedes the single-client limit with two authenticated
  sockets and one editor-operation queue. Actual MCP initialization names pass
  through the bridge and tag successfully edited cards for ten seconds. A
  client's stale read version prevents its edit from applying; the client must
  read and recompute its range. The seven tool signatures remain unchanged.
- **Passed:** `bash scripts/check_m7.sh` exited 0. It independently kernel-checked
  `Swarm_solution` with no admissions, compiled TypeScript, and passed all M3–M6
  regressions plus M7. Opening the skeleton at line zero produced six grey cards;
  a selected hand-edited `sorry` became green within the required two seconds,
  and a wrong tactic became red. A slow nested proof showed amber then green.
  Card selection updated cursor goals; an old-version card click was ignored.
- **MCP acceptance:** two live FastMCP stdio clients, identifying as Claude and
  Codex, filled different cards. Both tags appeared, a stale second-client edit
  was rejected, and fresh reads allowed subsequent edits. The board reached
  **6/6 proved** with **kernel-checked ✓**, matching `status()`. Tags expired
  after ten seconds. The third connection was refused, and the existing path,
  authentication, processing, diagnostic and goal-equality checks still passed.
  The clients submitted fixed proofs; no language-model session was invoked.
- **Additional checks:** lexer fixtures cover current-theorem selection, nested
  proof exclusion, multiline comments/cartouches, anonymous labels and incomplete
  steps. The actual webview script was tested with a small DOM harness for safe
  labels, preserved nodes, status classes, header updates and click messages.
  Live assertions require the board's document version to match the editor,
  so an old green snapshot cannot satisfy them. Receipts are in
  `.dev-host/m7-results.json`; the committed skeleton remained unchanged.
- **Discovered:** the stock server has no explicit finished flag; green requires
  positive command/ending annotations plus settled current-version status.
  Python's MCP initialization field is `client_info`, despite its JSON alias
  `clientInfo`. Two agents require version checks as well as serialization.
  PAINPOINTS entries 24–28 and `PROTOCOL_NOTES.md` record these details.
- **Visual limitation:** the screen tool again returned **Computer Use was not
  approved to use Code**. Real stock-editor tests and webview-script checks
  passed, but no direct M7 screenshot review is claimed.
- **Would do differently:** inspect initialization metadata and multi-client
  version safety before adding ownership badges. Test opening at the theory
  header, not only at an existing proof cursor, and require the current document
  version in every live board assertion.
- **Next:** reload the development host and run the Swarm demo with
  `docs/SWARM_PROMPT.md`. The requested M7 implementation and automated stopping
  conditions are complete; no later milestone was started.

## 2026-10-17 — M8 passed: Ask Isabelle

- **Changed:** added the Ask box above Goals and **Isabelle: Ask** to focus it.
  Enter sends, Shift+Enter inserts a line, and streamed text/tool-call summaries
  append to the session transcript. The box disables during a request. Stop
  terminates Claude and its MCP process group; a ten-minute deadline does the
  same. Existing submitted edits remain in the editor.
- **Backend:** uses installed Claude Code 2.1.236 only, with verified print/JSON
  streaming flags, stdin prompts, the requested fixed preamble, and explicit
  coordinate/current-buffer guidance. Built-in tools, skills and hooks are
  disabled for the child. Exactly the seven Isabelle MCP tools are allowed;
  an explicit configuration selects this extension's bridge after checking the
  existing registration. No model HTTP API, new prover, dependency, automatic
  registration or global configuration change was introduced.
- **View:** Goals now keeps its webview DOM and receives goal/transcript messages
  separately, so live checking preserves the draft, focus and conversation.
  A script nonce and text-only rendering keep proof/model output inert. The
  active visible theory is retained when focus moves into the Ask box. Every
  Ask proof edit goes through MCP, retaining the existing version checks,
  diagnostics, save/undo behavior and Claude Swarm tags.
- **Passed:** `bash scripts/check_m8.sh` exited 0. The final
  `M8_LIVE=1 bash scripts/check_m8.sh` also exited 0 with the final parser fix.
  It checked the reference theory, TypeScript, spawn/flags, split UTF-8/JSON,
  partial text, tool summaries, session history, concurrent-send refusal,
  Stop/escalation/descendant cleanup, timeout, malformed/error output, and both
  exact one-line help messages. Webview-script checks cover Enter/newline/IME,
  focus, disabled controls, Stop messages, draft/transcript retention and safe
  rendering. All M3–M7 live editor, highlighting and MCP regressions passed.
- **Real Claude acceptance:** with `examples/Demo.thy` open, `prove this` replaced
  the admitted arithmetic proof through MCP. Goals changed during the run,
  Claude tags appeared, and all three cards reached kernel-checked completion.
  A deliberately inserted `by (rule TrueI)` then produced a real inline error;
  `why does this fail?` named **Failed to apply initial proof method**, explained
  the mismatched `True` conclusion, and made no edit. The final run also checked
  that the streamed explanation appears only once. The test restored the three
  original `sorry` bodies afterward. Receipts and the generated complete theory
  are under `.dev-host/m8-results.json`, `m8-live-stream.json`, and `m8-checked/`.
  Independently, `isabelle process_theories -D .dev-host/m8-checked -O Demo`
  exited 0 on the generated proof, which contains zero admissions.
- **Discovered:** `stream-json` requires `--verbose`; variadic CLI arguments can
  consume a positional prompt; registration and connection health are separate.
  A complete assistant event can contain just one content block, whose array
  index differs from its stream index after a thinking block. A real captured
  stream exposed the duplicate-answer bug and now replays as one answer. The
  live harness also needed fresh editor handles after MCP navigation. Protocol
  notes and PAINPOINTS entries 29–33 record these findings and fixes.
- **Visual limitation:** the screen tool again returned **Computer Use was not
  approved to use Code**. Actual host/model and webview-script checks passed;
  no direct screenshot or physical typing acceptance is claimed.
- **Would do differently:** capture a thinking-plus-text stream at the start,
  test retained DOM/focus before connecting the backend, and reacquire editor
  handles after agent navigation. Keep deterministic checks separate from the
  opt-in signed-in Claude acceptance so ordinary verification spends no model
  requests.
- **Next:** reload the development host and follow **Ask Isabelle** in
  `docs/DEMO.md` with `examples/Demo.thy`. M8 implementation and automated/live
  backend checks are complete; no later milestone was started.

## M9 A — mathematical display (implementation and host checks passed)

- **Changed:** installed Isabelle symbol-table loading, source-preserving editor
  decorations with cursor/selection reveal, workspace toggle, single-token
  superscripts, thin-spaced sum binders in output, theme-font `.source` styling,
  and Isabelle-only completion defaults. Existing `Swarm.thy` user edits were
  preserved byte for byte and excluded from this commit.
- **Passed:** `scripts/check_m9a.sh` exited 0, including the complete M3–M5 live
  host/MCP suite. Source ranges, search-selection reveal, toggling, source-byte
  preservation and actual stock-client/server completion acceptance passed.
  The server returned and inserted ASCII `\<Sum>` at the original columns.
  Runtime receipts are `.dev-host/m9a-results.json` and `m9a-completion.json`.
- **Discovered:** string quick suggestions need a language override for Isar
  formulae; the installed table can be located with `isabelle getenv` without
  assuming a distribution path. No new dependencies or distribution edits.
- **Visual stop condition pending:** the screen tool returned **Computer Use
  was not approved to use Code**. Source/range checks are not a screenshot or
  physical Cmd-F/Tab check. A separate development window opens the unchanged
  current `examples/Swarm.thy` for user inspection. Part B/C must wait for this
  check under the requested sequential stopping rule.
- **Would do differently:** enable formula completions at language registration
  time and separate source representation from display from the first editor
  milestone.

## 2026-10-17 — Quick wins 1–5 from Alex's hands-on feedback

- **Changed:** library files under `ISABELLE_HOME`/`ISABELLE_HOME_USER` become
  read-only for the session when they become the active editor (built-in
  `setActiveEditorReadonlyInSession`, once per document, setting
  `isabelleRevamp.lockLibrary`); both roots come from one `isabelle getenv -b`
  call shared with the symbol table. The TextMate grammar was reworked: inner
  syntax is `meta.inner-syntax` with nested name/operator/numeral/type-variable
  scopes, goal and definition commands are `storage.type` with the declared
  name as `entity.name.function`, proof commands `keyword.control.proof`,
  methods `support.function.method` in method position only, `sorry`/`oops`
  `keyword.other.unfinished`, and document cartouches
  `comment.block.documentation`. Hover replies pass through a middleware that
  decodes `\<symbol>` escapes and renders each tooltip as an `isabelle` code
  block. The goals model now drives several webviews: the Explorer view and a
  new **Isabelle Goals** panel beside the editor (`ViewColumn.Beside`,
  `preserveFocus`, `retainContextWhenHidden`), opened once per window when the
  first theory becomes active (`isabelleRevamp.goalsPanel`: beside | sidebar |
  off) or by **Isabelle: Open Goals Beside Editor**. **Isabelle: Restart
  Language Server** rebuilds the client (`startClient()`), rebinds Goals to it
  (`Goals.rebind`), and is reachable from a status bar item
  (`Isabelle: ready | checking… | stopped`) and a **↻ Restart** link in the
  goals header.
- **Passed:** `bash scripts/check_quickwins.sh` in headless stock VS Code with
  the real server: grammar scopes across four built-in themes, pure unit
  checks (`extension/test/unit_quickwins.cjs`), the panel opening beside the
  fixture without stealing focus and sharing the model with the sidebar, live
  hover on `sqrt` (`constant "NthRoot.sqrt"`, `:: real ⇒ real`), on `value`
  (`"4" :: "nat"`) and on `\<rat>`, locking of `HOL/Examples/Seq.thy` and of
  a workspace symlink into the library while the fixture stays writable, and
  a restart that recovers the same `sqrt 2 ∉ ℚ` goal at the same cursor.
  `check_m3.sh` and `check_m6.sh` still pass; `highlighting.cjs` expectations
  were updated to the new scopes on purpose, and `askView.cjs` learnt the new
  restart button.
- **Discovered:** `textDocument/hover` returns MarkedString objects
  `{language: "plaintext", value}` (one or a list), with escapes left as
  `\<Rightarrow>`; the language client wraps each in a fenced block before
  middleware sees it, so the middleware unwraps, decodes and re-fences. The
  server advertises no `documentSymbolProvider` (item 10 needs a client-side
  outline). `dotted_writeln` decoration ranges mark commands with output
  (`sorry`, `qed`, `value`), the hook for item 9. A nested lookbehind inside a
  TextMate lookbehind compiles in Oniguruma but matches empty text, silently
  breaking the whole grammar; `\b` inside a lookbehind works. Details are in
  [PROTOCOL_NOTES.md](PROTOCOL_NOTES.md).
- **Next:** items 6–18 (Unicode input, superscripts, coloured goals, output
  underlines, outline, cartouches, the InfoView-style sidebar sections,
  Sledgehammer and per-theorem gutter ticks).

## Alex items 6, 7, 11 — symbol input, scripts and cartouches

- **Changed:** `\` completion over the installed symbol table (name, glyph and
  `abbrev:` fields of `etc/symbols`) plus the session abbreviations requested
  once with `PIDE/abbrevs_request`; a Lean-style rewrite on type
  (`isabelleRevamp.symbolRewrite`, default on): `\name` + terminator →
  `\<name>`, `<<` → `\<open>`, `>>` → `\<close>` under the documented rule;
  **Isabelle: Insert Symbol…**; `\open` snippet with the caret inside; real
  super/subscripts in the editor for `\<^sup>`, `\<^sub>`, `\<^bold>` and the
  block forms, with glyphs where Unicode has them and raised/lowered source
  otherwise; **Isabelle: Convert Quotes to Cartouches** (pure `cartouches.ts`);
  the server option `vscode_unicode_symbols_output=true`. ASCII stays on disk:
  every insertion is an escape, and session templates are encoded back from
  the decoded Unicode the server sends.
- **Passed:** `node extension/test/unit_symbols.cjs` (table and abbrev parsing,
  candidates, context scan, rewrite rules, script ranges, converter) and
  `scripts/check_symbols.sh` in headless stock VS Code with the real server:
  completion items for `\forall`, `!`, `\open`; typed `\forall `, `\noteq `,
  `x\^sub1`, `<<`, `words>>`, `"x >> 2"`; the setting off; the converter on a
  fixture (whole document and selection); Insert Symbol; `PIDE/abbrevs_response`
  with `?<` → `\<exists>\<^sub>\<le>\<^sub>1`; decoded diagnostics.
  `check_m9a.sh` (which chains M3–M5) and `check_m3.sh` still pass; the server's
  `\Sum` completion is accepted unchanged.
- **Discovered:** the HTML goal output is independent of
  `vscode_unicode_symbols_output`; the option only changes diagnostics, hover
  and the log. `PIDE/abbrevs_response` carries decoded Unicode templates with
  `\u0007` marking the caret, and pairs with an empty or identical replacement.
  Details in [PROTOCOL_NOTES.md](PROTOCOL_NOTES.md).
- **Next:** visual check of the raised scripts in the development host; the
  sidebar's `⇧x` rendering belongs to the goals work.

## 2026-10-17 — Alex's items 9, 10 and 18: markup decorations, outline, theorem marks

- **Changed:** `extension/src/decorations.ts` paints the `PIDE/decoration`
  ranges that `Goals` already stores: jEdit's dotted underline under commands
  with output (`dotted_writeln/information/warning`), Isabelle's own text
  colours for free, bound, skolem and type variables, keywords, numerals and
  comments (`isabelleRevamp.decorations.semanticColours`), a shade on
  unprocessed, running and cancelled commands (`processingBackground`), the
  red shade on bad commands, and overview-ruler lanes for unprocessed, running,
  error and warning lines. The colours are the official light/dark defaults in
  `palette.ts`. `Goals` gained `onDidDecorate(uri)` and `forget(uri)`; paints
  survive editor switches and a closed document's markup is dropped.
  `outlineModel.ts` is a pure lexical outline on `isarTokens`: headings nest,
  `locale`/`class`/`context`/`instantiation` blocks contain their items, every
  declaration folds to the line before the next one, `proof … qed` and
  multi-line cartouches fold too; `outline.ts` registers document symbols
  (Outline, breadcrumbs, `Ctrl+Shift+O`), folding and workspace symbols
  (`Ctrl+T`) over every `.thy` in the workspace without opening the documents.
  `theoremStatus.ts` classifies each goal command from current-version facts
  (error > `sorry`/`oops` > busy > proved; an unconfirmed version is always
  "checking") and `theoremGutter.ts` draws SVG gutter marks and overview
  colours, debounced 150 ms. The activation API exposes `getTheoremStatuses()`
  and `getEditorDecorations()`.
- **Passed:** `node extension/test/unit_outline.cjs` (Sqrt2 outline, a tricky
  theory with prose, nested comments, blocks, anonymous goals and `oops`, the
  classifier's precedence and overlap edges, the icons).
  `bash scripts/check_decorations.sh` in headless stock VS Code with the real
  server: document symbols and folds for `Sqrt2.thy`; the completed theorem
  `proved`, the M3 placeholder `unfinished` with one bad range, `by (rule TrueI)`
  `error` with an overview-ruler error; a `section`/`locale` fixture nested
  correctly with `text_free`, `text_bound` and `dotted_writeln` ranges painted;
  workspace symbols found `sqrt2_irrational` in `examples/`; decorations
  returned after closing and reopening the editor. `check_m3.sh` and
  `check_m4.sh` still pass.
- **Discovered:** variables introduced by `obtain` are marked `skolem`, not
  `free`: the completed `Sqrt2.thy` paints 11 `text_skolem` ranges and no
  `text_free`; a locale's `fixes x` is `free` and a quantified `y` is `bound`.
  The dotted underline marks the keyword of a command with a message, as in
  jEdit: in `Sqrt2.thy` all 17 `dotted_writeln` ranges are the `by` and `qed`
  tokens, because a terminal proof step reports the fact it proved, and this
  does not depend on `editor_output_state`. The server sends the whole file's
  markup on every delta, so painting is coalesced for 30 ms and can trail the
  sidebar's verdict by one burst; the live test waits for both.
  Details in [PROTOCOL_NOTES.md](PROTOCOL_NOTES.md).
- **Next:** hover text for the dotted ranges (the server's `hover_message` is
  not stored yet), viewport slicing for very large theories, and the
  outline/marks for theories never visited by the cursor (their completion is
  unknown until a goal query confirms the version).

## 2026-10-17 — Alex's item 17: inline Sledgehammer and try0

- **Changed:** added **Isabelle: Sledgehammer**, **Isabelle: try0** and
  **Isabelle: Cancel Sledgehammer**, all at the caret's command through the
  stock server's `PIDE/sledgehammer_*` query, plus the **Isabelle
  Sledgehammer** view (provers field prefilled from the server, Run / try0 /
  Cancel, status line, one card per proof with **Insert**, a collapsible
  message log). The command's line carries a CodeLens (`Sledgehammer:
  running…`, then `Try this: by simp` per proof; click inserts) and a hover
  with the same proofs and Insert links, as Alex asked. Insert goes through
  `PIDE/sledgehammer_sendback` → `PIDE/sledgehammer_insert`, so the proof
  lands at the end of the query command: a `sorry`/`oops` directly after it is
  replaced, otherwise the proof starts an indented new line (the official
  client only breaks the line). Results belong to one document+command, shift
  with edits above and clear when that line changes. New pure modules
  `markupXml.ts` (Isabelle XML markup → tree, text, messages, sendbacks) and
  `proofInsert.ts`; `sledgehammer.ts` and `sledgehammerView.ts` (CSP
  `default-src 'none'`, DOM built with `textContent`, never `innerHTML`);
  `scripts/sledgehammer_probe.py` captured the fixtures in
  `extension/test/fixtures/sledgehammer/`. **try0** names only try0's
  registered methods as provers, which Isabelle2025-2 also treats as
  Sledgehammer tactic provers. No Isabelle changes; `.thy` files stay ASCII.
- **Passed:** `node extension/test/unit_markupXml.cjs` and
  `unit_proofInsert.cjs` on the live fixtures; `bash
  scripts/check_sledgehammer.sh` exited 0 in headless stock VS Code with the
  real server (17 live checks): running lens and hover, `by simp` from
  try0 preplay, lens/hover results on the lemma line only, sendback insertion
  replacing a same-line `sorry`, a try0-only run (only simp/auto/force/
  fastforce/metis reported) replacing a next-line `sorry`, the theory then
  **fully checked** with no diagnostics, cancellation of a lemma needing
  induction (`Interrupt`), and anchor shifting/clearing on edits.
  `bash scripts/check_m3.sh` still passes (12 PASS, exit 0).
- **Discovered:** `PIDE/sledgehammer_output` carries only `content` (XML
  markup, cumulative, first one empty), not the `position`/`sendback_id`
  fields in the official `lsp.ts`; `provers: ""` means the default list
  (installed solvers plus try0 methods), not a try0-only run; the insert
  position is after the statement, so an existing `sorry` must be handled by
  the client; on `sorry` or outside a proof the server answers
  `Unknown proof context`. Timings and shapes are in `PROTOCOL_NOTES.md`.
- **Next:** reload the development host, open `examples/Swarm.thy`, put the
  cursor on a `have` and run **Isabelle: Sledgehammer** to see the lens,
  hover and view; Isar proofs (`isar: true`) and a per-`sorry` batch run are
  not exposed yet.

## 2026-10-17 — Goals sidebar: colour, messages, facts, done state (Alex's 8, 12, 13, 14)

- **Changed:** the sidebar now renders Isabelle's own output markup instead of
  stripping it. `outputHtml.ts` is a tokenizer-based sanitiser (allow-listed
  elements and class names, entity links as `data-link` spans, `⇧c`/`⇩c` as
  `sup`/`sub` when no glyph exists); `viewTheme.ts` colours every allowed class
  with the official light/dark palette (ported from yfprojects' `colors.ts`,
  credited in the notices) and falls back to theme variables in high contrast.
  The view has a header line `Sqrt2.thy:12:5` with a coloured status badge,
  then collapsible **Goal**, **Facts** (`this:` / `using this:` lines, split by
  the pure `stateParts.ts`), **Messages** (writeln/warning/error output of the
  command, with an icon, a left border and a count) and **Ask** sections, with
  the collapse state persisted in the webview state. `No subgoals!` shows a
  green **✓ No goals — this step is complete** banner; a settled position
  without a state shows **Not in a proof**. The panel width is reported to the
  server as the pretty-print margin (`PIDE/output_set_margin`,
  `PIDE/state_set_margin`). `getGoalState()` keeps `phase/text/errors/theory/
  checkStatus` and adds `html`, `goalHtml`, `facts`, `messages`, `position`;
  `goals_at` returns the facts and message texts without HTML. Extension
  points for the next steps: `setHeaderActions()` for header buttons,
  `setMessageActions()` for per-message controls, and `GoalsView.onAction`
  for their `data-action` clicks.
- **Passed:** `node extension/test/unit_goals.cjs` (real server fixtures,
  hostile input, facts, done detection, view model) and
  `node extension/test/unit_goalsView.cjs` (the webview script in a small DOM:
  sections, persisted collapse, sanitised updates, link/action messages, width
  report). `bash scripts/check_goals.sh` ran stock VS Code against the real
  server: coloured free variable, facts at `then show`, `value` output in
  Messages, the done banner, `try0` sendback messages, the blank-line note,
  margin 40/200 re-wrapping, and a failed method's error message. The existing
  M3 suite passes unchanged.
- **Discovered:** `PIDE/state_output` never answers at a command without a
  proof state, and identical dynamic output is deduplicated; with
  `editor_output_state=true` the presence of a `state_message` in the dynamic
  output tells the two cases apart, so that option stays on and the output is
  split textually. Links are `file:/path#line` with one slash. Details and the
  `editor_output_state=false` comparison are in `PROTOCOL_NOTES.md`. The
  server only executes commands within `vscode_caret_perspective` (50) lines
  of the caret, so a theory's `end` beyond that stayed unprocessed and the
  badge stuck at `checking…` until the caret moved; the launch options now
  add `-o vscode_caret_perspective=0` so the whole open theory is checked.
- **Test expectations changed on purpose:** `askView.cjs` now asserts that the
  Ask section comes after the header (it was first), and runs the webview
  script in the shared `fakeDom.cjs` tree instead of a flat element map.
- **Next:** pin/pause buttons in the header area and copy-to-editor on
  messages (Alex's 15 and 16) through the hooks above; a `sendback` click
  could then insert `by simp` directly.

## 2026-10-17 — Goals sidebar: pin, pause and copy-to-editor (Alex's 15 and 16)

- **Changed:** the header gained **Pin** and **Pause** buttons (also icons in
  the view's title bar and the commands `isabelleRevamp.pinGoal`,
  `isabelleRevamp.togglePauseGoals`, `isabelleRevamp.unpinAll`). Pin adopts
  the live server state panel, which already holds the confirmed state for the
  caret, freezes it with `PIDE/state_auto_update {enabled: false}` and opens a
  fresh live panel; the pin is a card above the live goal titled
  `Sqrt2.thy:12`, with its facts, **Go to** and **Unpin**, and a *Theory
  edited since pinned* note once the document version changes. Pause keeps
  the state on show and stops sending the caret (badge *paused*); Resume
  re-follows at once, and MCP `goals_at` forces a query while paused. Messages
  (and a goal) with a `sendback` span get an **Insert ‹by simp›** button; the
  webview posts `{type: 'insert', text}` and the pure `insertProof.ts` turns
  it into an edit: replace a `sorry`/`oops` ending the command's line or alone
  on the next line, else a new line indented two deeper, as jEdit's
  `Active.action` does with `padding_command`. The suggestion's Unicode is
  encoded back to ASCII with the new `asciiSymbols()` so theories stay ASCII.
  `getGoalState()` adds `pins` (`{id, uri, theory, position, version, stale,
  text, goalHtml, facts}`) and `paused`; the API adds `insertProofText(text)`.
- **Passed:** `node extension/test/unit_insertProof.cjs` (sendbacks of the
  real `try0` output, button markup, ASCII round trip, every edit rule),
  `unit_goals.cjs` and `unit_goalsView.cjs` (pins, pause and insert in the
  view model and the webview script). `bash scripts/check_goals2.sh` ran stock
  VS Code against the real server: `try0`'s suggestion replaced `sorry` and
  the theory checked clean with the caret after the proof; a pin kept its
  goal through cursor moves, was flagged stale by an edit and removed by
  **Unpin all**; paused goals ignored the cursor and resumed at once. The
  M3 and M4 suites and `check_goals.sh` pass unchanged.
- **Discovered (live, Isabelle2025-2):** a state panel with auto update off
  keeps its content through caret moves, edits elsewhere and edits of its own
  command; `PIDE/state_update` and `PIDE/state_auto_update true` both re-run
  `print_state` at the *caret's* command, so neither can refresh a pin in
  place — the pin stays a snapshot. State ids are negative (`-1`, `-2`, …).
  Details in `PROTOCOL_NOTES.md`, "Frozen state panels".
- **Test expectations changed on purpose:** `unit_goalsView.cjs` expects an
  insert button to post `{type: 'insert', text}` rather than a generic
  `action` message.
- **Next:** Sledgehammer results as messages with the same Insert button
  (Alex's 17), and a refresh of a pin when the caret returns to its command.

## 2026-10-17 — Integration of Alex's feedback round on `integrate/all`

- **Changed:** merged `feat/quickwins` (items 1–5), `feat/symbols` (6, 7, 11),
  `feat/decorations` (9, 10, 18), `feat/sledgehammer` (17) and `feat/goals`
  (8, 12–16) with `--no-ff`, in that order. Conflicts were resolved by hand so
  that every feature keeps its registrations: `extension.ts` activates in the
  order symbols table → client (`startClient()` with the hover and diagnostics
  middleware) → goals → symbol typing, decorations, outline and theorem marks
  → swarm → Sledgehammer → restart command → panels; the server runs with both
  `vscode_unicode_symbols_output=true` and `vscode_caret_perspective=0`.
  `SymbolTyping` and `Sledgehammer` gained `rebind(client)` next to
  `Goals.rebind`, so **Isabelle: Restart Language Server** re-requests the
  session abbreviations and keeps receiving `PIDE/sledgehammer_*`;
  `Goals.rebind` fires `onDidDecorate` for every painted document so the
  editor painters drop the old server's markup. `goalsView.ts` keeps the
  InfoView sections, pins, pause and insert buttons on top of the
  multi-webview `attach()` model (sidebar and panel beside the editor), with
  the **↻ Restart** link as the default header action posting its own
  message. With two webviews each reporting its width, the server margin
  flapped and a scrollbar re-wrapped the goal after a programmatic margin:
  `GoalsView` now passes on the narrowest reported width only when it
  changes, and the webview measures `window.innerWidth`.
  `package.json` has one `contributes` block (3 views, 16 commands,
  `view/title` and `commandPalette` menus, 8 settings); the README gained a
  commands, views and settings table and the notices one heading level.
- **Passed:** `npm run compile --prefix extension` clean (TypeScript 7,
  strict) and every pure check (`unit_quickwins`, `unit_symbols`,
  `unit_outline`, `unit_markupXml`, `unit_proofInsert`, `unit_goals`,
  `unit_goalsView`, `unit_insertProof`, the `askView` harness). In headless
  stock VS Code with the real server, serialised under one lock, on the
  final tree: `check_m3.sh` (12 PASS), `check_quickwins.sh` (24),
  `check_symbols.sh` (15), `check_decorations.sh` (16),
  `check_sledgehammer.sh` (17), `check_goals.sh` (14), `check_goals2.sh`
  (18), `check_m4.sh` (28), `check_m6.sh` (46, chains M3–M5 and the
  grammar), `check_m9a.sh` (45, chains M3–M5) and `check_m8.sh` (66,
  chains M3–M7 with the fake Claude); all exit 0 and leave the examples
  unchanged. The first run after the merges failed `check_goals.sh` (the
  margin flap above) and `check_goals2.sh` (a timing race on the insert
  button); both pass after the fix in the same run order.
- **Discovered:** the merge needed no test expectation changes beyond the two
  the feature branches had already made (`highlighting.cjs` for the new
  grammar scopes, `unit_goalsView.cjs` for the `insert` message);
  `askView.cjs` now runs the restart click before the first goal update,
  because the fake DOM does not rebuild `#header-actions` from `innerHTML`.
- **Next:** decide whether `isabelleRevamp.decorations.semanticColours`
  should stay on by default now that the grammar colours inner syntax too
  (the markup colours override the grammar wherever the server has checked
  the text); a pin refresh when the caret returns to its command; hover text
  for the dotted output underlines.
