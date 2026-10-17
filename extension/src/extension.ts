import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { commands, Disposable, ExtensionContext, Hover, MarkdownString, StatusBarAlignment, TextEditor, window, workspace } from 'vscode';
import { LanguageClient, ServerOptions, State } from 'vscode-languageclient/node';
import { Goals } from './goals';
import { GoalsView } from './goalsView';
import { GoalsPanel } from './goalsPanel';
import { Bridge } from './bridge';
import { BridgeTools } from './bridgeTools';
import { hoverCode } from './hoverText';
import { isabelleRoots, isLibraryFile, libraryRoots } from './library';
import { Decorations } from './decorations';
import { registerOutline } from './outline';
import { TheoremGutter } from './theoremGutter';
import { loadSymbols, unicodeSymbols } from './symbols';
import { PrettySymbols } from './prettySymbols';
import { ServerStatus } from './serverStatus';
import { SymbolTyping } from './symbolTyping';
import { Swarm } from './swarm';
import { Ask } from './ask';

// Minimal startup adapted from Isabelle2025-2:
// src/Tools/VSCode/extension/src/extension.ts:97–128.
// See ../THIRD_PARTY_NOTICES.md for attribution and the distribution license.
let client: LanguageClient | undefined;
let goals: Goals | undefined;
let bridge: Bridge | undefined;
let ask: Ask | undefined;

const settings = () => workspace.getConfiguration('isabelleRevamp');

export async function activate(context: ExtensionContext) {
  const output = window.createOutputChannel('Isabelle', { log: true });
  const view = new GoalsView();
  const panel = new GoalsPanel(view);
  let theoryEditor = window.activeTextEditor;
  const visibleTheory = () => theoryEditor && window.visibleTextEditors.includes(theoryEditor) ? theoryEditor : undefined;
  ask = new Ask(resolve(context.extensionPath, '..'), state => view.updateAsk(state));
  const sendAsk = async (text: string) => {
    const editor = visibleTheory();
    const folder = editor && workspace.getWorkspaceFolder(editor.document.uri);
    if (!editor || editor.document.isClosed || editor.document.languageId !== 'isabelle' || !folder) {
      ask?.notice('Open a theory in this workspace before asking Isabelle.');
      view.updateAsk(ask!.snapshot()); return false;
    }
    if (!bridge) { ask?.notice('The Isabelle MCP bridge is unavailable. See Output → Isabelle.'); return false; }
    return ask!.send({ file: editor.document.uri.fsPath, line: editor.selection.active.line + 1,
      cwd: folder.uri.fsPath, portFile: bridge.portFile }, text);
  };
  view.onAsk = text => { void sendAsk(text); };
  view.onStop = () => ask?.stop();
  view.onRestart = () => { void commands.executeCommand('isabelleRevamp.restartServer'); };
  // The panel opens once per window, when the first theory becomes active.
  let autoOpened = false;
  const openPanel = async (editor?: TextEditor) => {
    if (autoOpened || editor?.document.languageId !== 'isabelle') return;
    const mode = settings().get<string>('goalsPanel', 'beside');
    if (mode === 'off') return;
    autoOpened = true;
    if (mode === 'beside') { panel.show(); return; }
    await commands.executeCommand('isabelleRevamp.goals.focus');
    await commands.executeCommand('workbench.action.focusActiveEditorGroup');
  };
  context.subscriptions.push(output, panel,
    window.registerWebviewViewProvider('isabelleRevamp.goals', view),
    commands.registerCommand('isabelleRevamp.showGoals', () =>
      commands.executeCommand('isabelleRevamp.goals.focus')),
    commands.registerCommand('isabelleRevamp.openGoalsPanel', () => panel.show()),
    commands.registerCommand('isabelleRevamp.ask', async () => {
      view.focusAsk();
      await commands.executeCommand('isabelleRevamp.goals.focus');
      view.focusAsk();
    }));

  const configured = settings().get<string>('executable', 'isabelle');
  const executable = configured.startsWith('~/')
    ? homedir() + configured.slice(1) : configured;
  let roots: string[] = [];
  try {
    const env = await isabelleRoots(executable);
    roots = await libraryRoots(env);
    const table = await loadSymbols(executable, env.home);
    output.info(`Loaded ${table.count} Unicode symbols from ${table.path}`);
  } catch (error) { output.warn(`Could not load installed symbols; using bundled fallback: ${String(error)}`); }
  const prettySymbols = new PrettySymbols();
  context.subscriptions.push(prettySymbols,
    commands.registerCommand('isabelleRevamp.togglePrettySymbols', () => prettySymbols.toggle()));

  // Library sources are read-only for this session; the file itself is untouched.
  const locked = new Set<string>();
  const lockLibrary = async (editor?: TextEditor) => {
    const document = editor?.document;
    if (!document || document.uri.scheme !== 'file' || locked.has(document.uri.fsPath)) return;
    if (!settings().get<boolean>('lockLibrary', true) || !(await isLibraryFile(document.uri.fsPath, roots))) return;
    // The built-in command acts on whichever editor is active now.
    if (window.activeTextEditor?.document !== document) return;
    locked.add(document.uri.fsPath);
    await commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession');
    output.info(`Locked library file ${document.uri.fsPath}`);
  };

  const status = new ServerStatus(window.createStatusBarItem('isabelleRevamp.server', StatusBarAlignment.Left, 50));
  const refreshStatus = () => {
    if (status.phase === 'starting' || status.phase === 'stopped') return;
    const document = window.activeTextEditor?.document;
    status.set(document?.languageId === 'isabelle' && goals?.processing(document).processing ? 'checking' : 'ready');
  };
  const args = [
    'vscode_server', '-n', '-l', 'HOL',
    '-o', 'vscode_html_output=true',
    '-o', 'editor_output_state=true',
    '-o', 'vscode_pide_extensions=true',
    // Diagnostics and hover text arrive decoded; edits (completions) stay ASCII.
    '-o', 'vscode_unicode_symbols_output=true',
    '-o', 'vscode_unicode_symbols_edits=false',
  ];
  const server: ServerOptions = { command: executable, args };
  let clientSubscriptions: Disposable[] = [];
  const startClient = () => {
    output.info(`Starting ${executable} ${args.join(' ')}`);
    const started = new LanguageClient('isabelleRevamp', 'Isabelle', server, {
      documentSelector: [{ scheme: 'file', language: 'isabelle' }],
      outputChannel: output,
      middleware: {
        handleDiagnostics: (uri, diagnostics, next) => {
          for (const diagnostic of diagnostics) diagnostic.message = unicodeSymbols(diagnostic.message);
          next(uri, diagnostics);
          goals?.setDiagnostics(uri.toString(), diagnostics);
        },
        provideHover: async (document, position, token, next) => {
          const hover = await next(document, position, token);
          if (!hover) return hover;
          const contents = hover.contents.map(content => new MarkdownString().appendCodeblock(
            hoverCode(typeof content === 'string' ? content : content.value), 'isabelle'));
          return new Hover(contents, hover.range);
        },
      },
    });
    for (const subscription of clientSubscriptions) subscription.dispose();
    clientSubscriptions = [started.onDidChangeState(event => {
      if (event.newState === State.Running) {
        status.set('ready');
        goals?.ready(window.activeTextEditor ?? visibleTheory());
        typing.requestAbbrevs();
        refreshStatus();
      } else {
        status.set(event.newState === State.Starting ? 'starting' : 'stopped');
        goals?.unavailable();
      }
    })];
    return started;
  };
  client = startClient();
  goals = new Goals(client, view);
  const typing = new SymbolTyping(client);
  const decorations = new Decorations(goals);
  const theoremGutter = new TheoremGutter(goals);
  context.subscriptions.push(typing, decorations, theoremGutter, ...registerOutline());
  const swarm = new Swarm(goals);
  context.subscriptions.push(swarm, status,
    window.registerWebviewViewProvider('isabelleRevamp.swarm', swarm.view),
    commands.registerCommand('isabelleRevamp.showSwarm', () => commands.executeCommand('isabelleRevamp.swarm.focus')));
  swarm.follow(window.activeTextEditor);
  let restarting: Promise<void> | undefined;
  const restart = async () => {
    status.set('starting');
    goals?.unavailable();
    try { await client?.dispose(); } catch (error) { output.warn(`Stopping the old server: ${String(error)}`); }
    client = startClient();
    goals?.rebind(client);
    typing.rebind(client);
    try {
      await client.start();
      output.info('Isabelle language server restarted (HOL).');
    } catch (error) {
      status.set('stopped');
      output.error(`Restart failed: ${error instanceof Error ? error.message : String(error)}`);
      void window.showErrorMessage('Isabelle could not restart. See the Isabelle Output channel.');
    }
  };
  context.subscriptions.push(goals, goals.onDidUpdate(refreshStatus),
    commands.registerCommand('isabelleRevamp.restartServer', () => {
      restarting ??= restart().finally(() => { restarting = undefined; });
      return restarting;
    }),
    window.onDidChangeTextEditorSelection(event => {
      if (event.textEditor === window.activeTextEditor) { goals?.follow(event.textEditor); swarm.follow(event.textEditor); }
    }),
    window.onDidChangeActiveTextEditor(editor => {
      if (editor) theoryEditor = editor;
      goals?.follow(editor ?? visibleTheory()); swarm.follow(editor);
      refreshStatus();
      void lockLibrary(editor);
      void openPanel(editor);
    }),
    workspace.onDidChangeTextDocument(event => {
      goals?.observe(event.document);
      if (event.contentChanges.length) swarm.changed(event.document);
      if (event.document === window.activeTextEditor?.document) goals?.follow(window.activeTextEditor);
    }));
  void lockLibrary(window.activeTextEditor);
  void openPanel(window.activeTextEditor);

  try {
    output.show(true);
    await client.start();
    output.info('Isabelle language server ready (HOL).');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.error(`Startup failed: ${message}`);
    status.set('stopped');
    goals.unavailable();
    await window.showErrorMessage(
      'Isabelle could not start. Check Isabelle Revamp: Executable in workspace settings and the Isabelle Output channel.',
    );
    throw error;
  }
  bridge = new Bridge(new BridgeTools(goals, view, swarm));
  try {
    await bridge.start();
    output.info(`MCP bridge ready; discovery file: ${bridge.portFile}`);
  } catch (error) {
    await bridge.close();
    bridge = undefined;
    output.error(`MCP bridge failed: ${String(error)}`);
    await window.showErrorMessage('The MCP bridge could not start. See Output → Isabelle.');
  }
  // The integration check reads the same model that the webview renders.
  return { getGoalState: () => view.snapshot(), getSwarmState: () => swarm.view.snapshot(),
    getPrettySymbols: () => window.activeTextEditor ? prettySymbols.snapshot(window.activeTextEditor) : [],
    getSessionAbbrevs: () => typing.sessionAbbrevs,
    getAskState: () => ask!.snapshot(), sendAsk, stopAsk: () => ask?.stop(),
    getEditorDecorations: () => decorations.snapshot(window.activeTextEditor),
    getTheoremStatuses: () => theoremGutter.statuses(window.activeTextEditor),
    selectSwarmStep: (uri: string, version: number, id: string) => swarm.select(uri, version, id),
    getLockedDocuments: () => [...locked], getLibraryRoots: () => [...roots],
    getGoalPanelState: () => ({ open: panel.open, autoOpened, attached: view.attached }),
    getServerStatus: () => status.phase };
}

export async function deactivate(): Promise<void> {
  ask?.dispose();
  ask = undefined;
  await bridge?.close();
  bridge = undefined;
  goals?.dispose();
  goals = undefined;
  await client?.dispose();
  client = undefined;
}
