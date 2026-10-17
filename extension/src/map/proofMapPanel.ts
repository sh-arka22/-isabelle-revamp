// The ProofMap panel: one WebviewPanel (retainContextWhenHidden) that watches
// out/dag.json (contract C1) and the optional out/claims.json sidecar, diffs
// successive exports into a feed of map events, opens file:line on request
// and logs to the "ProofMap" Output channel. Isabelle is never called.
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import {
  commands, Disposable, ExtensionContext, OutputChannel, Range, Selection, TextEditorRevealType, Uri,
  ViewColumn, WebviewPanel, window, workspace,
} from 'vscode';
import { symbolTable } from '../symbols';
import { changedNodeIds, diffClaims, diffDags, MapEvent } from './core/dagDiff';
import { rankHoles, RankedHole } from './core/dagRank';
import { FeedEntry, HostMessage, LayoutReport, MapSource, MapViewState, parseWebviewMessage } from './core/protocol';
import { Claim, Dag, DagEdge, DagNode, emptyCounts, parseClaims, parseDag, StatusCounts, statusCounts } from './core/types';
import { DagWatcher, WatchResult } from './dagWatcher';
import { proofMapHtml } from './htmlTemplate';

export const NODE_BUDGET = 500;
const FEED_LIMIT = 200;
export const VIEW_TYPE = 'isabelleRevamp.proofMap';

/** What the acceptance test reads through the extension API. */
export interface ProofMapState {
  nodes: DagNode[];
  edges: DagEdge[];
  counts: StatusCounts;
  selected?: string;
  claims: Claim[];
  events: FeedEntry[];
  holes: RankedHole[];
  source?: MapSource;
  claimsPath?: string;
  error?: string;
  warnings: string[];
  layout?: LayoutReport;
  followAgent: boolean;
  lastOpened?: { id: string; file: string; line: number };
  version: number;
  log: string[];               // the last Output lines, for tests and bug reports
}

export interface ProofMapConfig { dagPath: string; claimsPath: string; followAgent: boolean; autoOpen: boolean }

export function readConfig(): ProofMapConfig {
  const config = workspace.getConfiguration('isabelleRevamp.proofMap');
  return {
    dagPath: config.get<string>('dagPath', 'out/dag.json'),
    claimsPath: config.get<string>('claimsPath', 'out/claims.json'),
    followAgent: config.get<boolean>('followAgent', true),
    autoOpen: config.get<boolean>('autoOpen', false),
  };
}

/** A setting's path resolved against the first workspace folder. */
export function resolveSettingPath(setting: string): string | undefined {
  if (!setting) return undefined;
  if (isAbsolute(setting)) return setting;
  const folder = workspace.workspaceFolders?.[0];
  return folder ? join(folder.uri.fsPath, setting) : undefined;
}

export class ProofMapPanel implements Disposable {
  private static current?: ProofMapPanel;
  static get instance(): ProofMapPanel | undefined { return ProofMapPanel.current; }

  /** Create the singleton or reveal it. */
  static show(context: ExtensionContext, output: OutputChannel, column: ViewColumn = ViewColumn.Beside): ProofMapPanel {
    if (ProofMapPanel.current) { ProofMapPanel.current.panel.reveal(undefined, false); return ProofMapPanel.current; }
    const panel = window.createWebviewPanel(VIEW_TYPE, 'ProofMap', { viewColumn: column, preserveFocus: false }, {
      enableScripts: true, retainContextWhenHidden: true,
      localResourceRoots: [Uri.joinPath(context.extensionUri, 'dist')],
    });
    ProofMapPanel.current = new ProofMapPanel(context, output, panel);
    return ProofMapPanel.current;
  }

  private readonly subscriptions: Disposable[] = [];
  private dagWatcher?: DagWatcher;
  private claimsWatcher?: DagWatcher;
  private dag?: Dag;
  private claims: Claim[] = [];
  private holes: RankedHole[] = [];
  private counts = emptyCounts();
  private events: FeedEntry[] = [];
  private seq = 0;
  private version = 0;
  private warnings: string[] = [];
  private error?: string;
  private source?: MapSource;
  private claimsPath?: string;
  private selected?: string;
  private layout?: LayoutReport;
  private lastOpened?: { id: string; file: string; line: number };
  private followAgent: boolean;
  private ready = false;
  private readonly log: string[] = [];

  private readonly output: OutputChannel;

  private constructor(private readonly context: ExtensionContext, output: OutputChannel, readonly panel: WebviewPanel) {
    this.followAgent = readConfig().followAgent;
    const appendLine = output.appendLine.bind(output);
    this.output = { appendLine: (text: string) => { this.log.push(text); if (this.log.length > 200) this.log.shift(); appendLine(text); } } as OutputChannel;
    panel.iconPath = {
      light: Uri.joinPath(context.extensionUri, 'media/proofmap-light.svg'),
      dark: Uri.joinPath(context.extensionUri, 'media/proofmap-dark.svg'),
    };
    const nonce = randomBytes(16).toString('hex');
    panel.webview.html = proofMapHtml({
      nonce, cspSource: panel.webview.cspSource,
      scriptUri: panel.webview.asWebviewUri(Uri.joinPath(context.extensionUri, 'dist/webview/map.js')).toString(),
      styleUri: panel.webview.asWebviewUri(Uri.joinPath(context.extensionUri, 'dist/webview/map.css')).toString(),
    });
    this.subscriptions.push(
      panel.webview.onDidReceiveMessage(message => void this.handleMessage(message)),
      panel.onDidDispose(() => this.dispose()),
      workspace.onDidChangeConfiguration(event => {
        if (!event.affectsConfiguration('isabelleRevamp.proofMap')) return;
        const config = readConfig();
        this.followAgent = config.followAgent;
        this.attachConfigured();
      }),
      workspace.onDidChangeWorkspaceFolders(() => this.attachConfigured()));
    this.attachConfigured();
  }

  // ---------- sources ----------

  /** Watch the files named by the settings (the live export). */
  attachConfigured(): void {
    const config = readConfig();
    const dagPath = resolveSettingPath(config.dagPath);
    const claimsPath = resolveSettingPath(config.claimsPath);
    this.attachDag(dagPath, config.dagPath, true);
    this.attachClaims(claimsPath);
  }

  private attachDag(path: string | undefined, label: string, live: boolean): void {
    this.dagWatcher?.dispose();
    this.dagWatcher = undefined;
    if (!path) {
      this.source = undefined;
      this.error = `Open a folder to watch ${label}, or open a replay snapshot.`;
      this.postState([]);
      return;
    }
    this.source = { label, path, live };
    this.output.appendLine(`${live ? 'watching' : 'replaying'} ${path}`);
    this.dagWatcher = new DagWatcher(path, result => this.onDag(result), text => this.output.appendLine(text));
  }

  private attachClaims(path: string | undefined): void {
    this.claimsWatcher?.dispose();
    this.claimsWatcher = undefined;
    this.claimsPath = path;
    if (!path) return;
    this.output.appendLine(`claims sidecar: watching ${path}`);
    this.claimsWatcher = new DagWatcher(path, result => this.onClaims(result), text => this.output.appendLine(text));
  }

  /** Load a replay dag.json (demo) and keep following that file until Reload. */
  async openSnapshot(path?: string): Promise<boolean> {
    if (!path) {
      const picked = await window.showOpenDialog({
        canSelectMany: false, openLabel: 'Open ProofMap snapshot',
        filters: { 'ProofMap export (dag.json)': ['json'] },
        defaultUri: workspace.workspaceFolders?.[0]?.uri,
      });
      path = picked?.[0]?.fsPath;
    }
    if (!path) return false;
    this.panel.reveal(undefined, true);
    this.attachDag(path, path, false);
    const sidecar = join(dirname(path), 'claims.json');
    if (existsSync(sidecar)) this.attachClaims(sidecar);
    else this.attachClaims(resolveSettingPath(readConfig().claimsPath));
    return true;
  }

  /** Back to the configured live file, re-read at once. */
  reload(): void {
    this.attachConfigured();
    this.dagWatcher?.refresh();
    this.claimsWatcher?.refresh();
  }

  // ---------- file results ----------

  private onDag(result: WatchResult): void {
    if (result.kind === 'missing') {
      this.error = `No dag.json at ${this.source?.path ?? '?'}`;
      this.output.appendLine(this.error);
      this.postState([]);
      return;
    }
    if (result.kind === 'invalid') {
      this.error = result.message;
      this.output.appendLine(result.message);
      this.pushEvents([{ kind: 'warning', id: '', severity: 'warning', message: result.message }]);
      this.postState([]);
      return;
    }
    let parsed;
    try { parsed = parseDag(result.value); } catch (error) {
      this.error = `dag.json rejected: ${error instanceof Error ? error.message : String(error)}`;
      this.output.appendLine(this.error);
      this.postState([]);
      return;
    }
    const previous = this.dag;
    this.dag = parsed.dag;
    this.warnings = parsed.warnings;
    for (const warning of parsed.warnings) this.output.appendLine(`warning: ${warning}`);
    this.error = undefined;
    this.counts = statusCounts(parsed.dag);
    this.holes = rankHoles(parsed.dag);
    const events = diffDags(previous, parsed.dag);
    if (parsed.warnings.length) {
      events.push({ kind: 'warning', id: '', severity: 'warning',
        message: `${parsed.warnings.length} entries dropped or flagged while reading dag.json (see Output › ProofMap)` });
    }
    if (parsed.dag.nodes.length > NODE_BUDGET) {
      this.output.appendLine(`${parsed.dag.nodes.length} nodes exceed the ${NODE_BUDGET}-node budget; layout may take longer than 2 s`);
    }
    this.pushEvents(events);
    this.postState(changedNodeIds(events));
  }

  private onClaims(result: WatchResult): void {
    let next: Claim[] = [];
    if (result.kind === 'json') {
      const parsed = parseClaims(result.value);
      for (const warning of parsed.warnings) this.output.appendLine(`claims.json: ${warning}`);
      next = parsed.claims;
    } else if (result.kind === 'invalid') {
      this.output.appendLine(result.message);
      return;      // keep the previous claims until the file is complete again
    }
    const events = diffClaims(this.claims, next);
    this.claims = next;
    if (!events.length && this.ready) return;
    this.pushEvents(events);
    this.postState(changedNodeIds(events));
  }

  private pushEvents(events: MapEvent[]): void {
    const at = new Date().toISOString();
    for (const event of events) {
      this.events.push({ ...event, seq: this.seq++, at });
      this.output.appendLine(`${event.severity === 'warning' ? 'warning: ' : ''}${event.message}`);
    }
    if (this.events.length > FEED_LIMIT) this.events.splice(0, this.events.length - FEED_LIMIT);
  }

  // ---------- webview ----------

  private viewState(): MapViewState {
    return {
      version: this.version, dag: this.dag, counts: this.counts, holes: this.holes, claims: this.claims,
      events: this.events, warnings: this.warnings, source: this.source, error: this.error,
      followAgent: this.followAgent, selected: this.selected, layout: this.layout, budget: NODE_BUDGET,
    };
  }

  private post(message: HostMessage): void {
    void this.panel.webview.postMessage(message);
  }

  private postState(changed: string[]): void {
    this.version += 1;
    this.post({ type: 'state', state: this.viewState(), changed });
  }

  /** Handle a message from the webview; also the test hook for synthetic requests. */
  async handleMessage(raw: unknown): Promise<void> {
    const message = parseWebviewMessage(raw);
    if (!message) { this.output.appendLine(`ignored malformed webview message: ${JSON.stringify(raw).slice(0, 200)}`); return; }
    switch (message.type) {
      case 'ready':
        this.ready = true;
        this.post({ type: 'symbols', table: symbolTable() });
        this.postState([]);
        break;
      case 'open': await this.openNode(message.id); break;
      case 'select': this.selected = message.id ?? undefined; break;
      case 'reload': this.reload(); break;
      case 'openSnapshot': await this.openSnapshot(); break;
      case 'newWindow': await commands.executeCommand('isabelleRevamp.showProofMapInNewWindow'); break;
      case 'followAgent': this.followAgent = message.on; break;
      case 'layout':
        this.layout = { ms: message.ms, nodes: message.nodes, edges: message.edges, at: new Date().toISOString() };
        this.output.appendLine(`layout ${message.ms} ms for ${message.nodes} nodes and ${message.edges} edges`);
        break;
      case 'log': this.output.appendLine(`webview: ${message.text}`); break;
    }
  }

  /** Open the theory at the node's line. Missing nodes exist only in blueprint.yaml. */
  async openNode(id: string): Promise<Uri | undefined> {
    const node = this.dag?.nodes.find(candidate => candidate.id === id);
    if (!node) { this.output.appendLine(`open: unknown node ${id}`); return undefined; }
    const file = this.resolveFile(node.file);
    if (node.status === 'missing') {
      const message = `${id} exists only in blueprint.yaml (no Isabelle fact yet).`;
      this.output.appendLine(message);
      if (!file) { void window.showInformationMessage(message); return undefined; }
    }
    if (!file) {
      const message = `ProofMap: ${node.file} not found under the workspace or next to ${this.source?.path ?? 'the export'}.`;
      this.output.appendLine(message);
      void window.showWarningMessage(message);
      return undefined;
    }
    const uri = Uri.file(file);
    const line = Math.max(0, node.line - 1);
    const editor = await window.showTextDocument(uri, { preview: true, viewColumn: ViewColumn.One, preserveFocus: false });
    const position = editor.document.lineAt(Math.min(line, editor.document.lineCount - 1)).range.start;
    editor.selection = new Selection(position, position);
    editor.revealRange(new Range(position, position), TextEditorRevealType.InCenter);
    this.lastOpened = { id, file, line: node.line };
    this.output.appendLine(`opened ${file}:${node.line} for ${id}`);
    return uri;
  }

  /** Repo-relative paths resolve against the workspace folders, then the export's repo root (parent of out/). */
  private resolveFile(file: string): string | undefined {
    if (isAbsolute(file)) return existsSync(file) ? file : undefined;
    const roots = (workspace.workspaceFolders ?? []).map(folder => folder.uri.fsPath);
    if (this.source) roots.push(dirname(dirname(this.source.path)));
    for (const root of roots) {
      const candidate = join(root, file);
      if (existsSync(candidate)) return candidate;
    }
    return undefined;
  }

  // ---------- commands and API ----------

  fit(): void { this.post({ type: 'fit' }); }
  relayout(): void { this.post({ type: 'relayout' }); }
  select(id: string): void { this.selected = id; this.post({ type: 'select', id }); }

  state(): ProofMapState {
    return structuredClone({
      nodes: this.dag?.nodes ?? [], edges: this.dag?.edges ?? [], counts: this.counts, selected: this.selected,
      claims: this.claims, events: this.events, holes: this.holes, source: this.source, claimsPath: this.claimsPath, error: this.error,
      warnings: this.warnings, layout: this.layout, followAgent: this.followAgent, lastOpened: this.lastOpened,
      version: this.version, log: this.log,
    });
  }

  dispose(): void {
    if (ProofMapPanel.current === this) ProofMapPanel.current = undefined;
    this.dagWatcher?.dispose();
    this.claimsWatcher?.dispose();
    for (const subscription of this.subscriptions.splice(0)) subscription.dispose();
    this.panel.dispose();
  }
}

/** Register the ProofMap commands; safe to call before the language server starts. */
export function registerProofMap(context: ExtensionContext): { output: OutputChannel; show: () => ProofMapPanel } {
  const output = window.createOutputChannel('ProofMap');
  const show = () => ProofMapPanel.show(context, output);
  context.subscriptions.push(output,
    commands.registerCommand('isabelleRevamp.showProofMap', () => { show(); }),
    commands.registerCommand('isabelleRevamp.showProofMapInNewWindow', async () => {
      const panel = show();
      panel.panel.reveal(undefined, false);
      try {
        await commands.executeCommand('workbench.action.moveEditorToNewWindow');
      } catch (error) {
        output.appendLine(`could not move the panel to a new window: ${String(error)}`);
      }
    }),
    commands.registerCommand('isabelleRevamp.proofMap.fit', () => show().fit()),
    commands.registerCommand('isabelleRevamp.proofMap.reload', () => show().reload()),
    commands.registerCommand('isabelleRevamp.proofMap.openSnapshot', (path?: unknown) =>
      show().openSnapshot(typeof path === 'string' ? path : undefined)),
    { dispose: () => ProofMapPanel.instance?.dispose() });
  const config = readConfig();
  if (config.autoOpen) {
    const dagPath = resolveSettingPath(config.dagPath);
    if (dagPath && existsSync(dagPath)) show();
  }
  return { output, show };
}
