import { basename } from 'node:path';
import { CodeLens, CodeLensProvider, Disposable, EventEmitter, Hover, HoverProvider, MarkdownString, Position,
  Range, TextDocument, TextDocumentChangeEvent, TextEditor, Uri, window, workspace, WorkspaceEdit } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { outputMessages, OutputMessage, sledgehammerResults, SledgehammerResult } from './markupXml';
import { proofInsertion } from './proofInsert';
import { SledgehammerSnapshot, SledgehammerView } from './sledgehammerView';
import { unicodeSymbols } from './symbols';

// try0's registered methods (HOL/Try0.thy, HOL/Try0_HOL.thy) double as
// Sledgehammer "tactic provers", so naming only them makes the one query the
// server exposes a try0-only run; provers "" would mean the default list.
export const try0Methods =
  'simp auto blast fast fastforce force meson satx linarith presburger algebra argo order metis';
const try0Set = new Set(try0Methods.split(' '));

interface Insert { uri: string; line: number; character: number; text: string }
interface Anchor { uri: string; line: number }

const commandSelector = ['isabelleRevamp.sledgehammerInsert', 'isabelleRevamp.sledgehammerCancel'];

// One query at a time, as in the server: its results belong to the command
// the caret was on and are dropped once that command's line is edited.
export class Sledgehammer implements Disposable, CodeLensProvider, HoverProvider {
  private lenses = new EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.lenses.event;
  private status: SledgehammerSnapshot['status'] = 'idle';
  private mode: SledgehammerSnapshot['mode'] = 'sledgehammer';
  private cancelled = false;
  private provers = '';
  private anchor?: Anchor;
  private messages: OutputMessage[] = [];
  private results: SledgehammerResult[] = [];
  private editor?: TextEditor;
  private subscriptions: Disposable[];

  constructor(private client: LanguageClient, readonly view: SledgehammerView) {
    view.onRun = (mode, provers) => { void this.run(mode, provers); };
    view.onCancel = () => { void this.cancel(); };
    view.onSendback = text => { void this.insert(text); };
    view.onProvers = provers => { this.provers = provers; };
    if (window.activeTextEditor?.document.languageId === 'isabelle') this.editor = window.activeTextEditor;
    this.subscriptions = [
      client.onNotification('PIDE/sledgehammer_provers_response', ({ provers }: { provers: string }) => {
        if (!this.provers.trim()) { this.provers = provers; this.publish(); }
      }),
      client.onNotification('PIDE/sledgehammer_status', ({ message }: { message: string }) => this.acceptStatus(message)),
      client.onNotification('PIDE/sledgehammer_output', ({ content }: { content: string }) => this.acceptOutput(content)),
      client.onNotification('PIDE/sledgehammer_insert', (message: Insert) => { void this.acceptInsert(message); }),
      window.onDidChangeActiveTextEditor(editor => {
        if (editor?.document.languageId === 'isabelle') this.editor = editor;
      }),
      workspace.onDidChangeTextDocument(event => this.observe(event)),
      workspace.onDidCloseTextDocument(document => {
        if (this.anchor?.uri === document.uri.toString()) this.clear();
      }),
    ];
  }

  ready(): void {
    if (this.status === 'unavailable') { this.status = 'idle'; this.publish(); }
    void this.client.sendNotification('PIDE/sledgehammer_provers_request', {}).catch(() => {});
  }

  unavailable(): void {
    this.anchor = undefined;
    this.messages = [];
    this.results = [];
    this.cancelled = false;
    this.status = 'unavailable';
    this.publish();
  }

  // The editor the request means: focus may be in the view by now.
  private theoryEditor(): TextEditor | undefined {
    const active = window.activeTextEditor;
    if (active?.document.languageId === 'isabelle') return active;
    return this.editor && window.visibleTextEditors.includes(this.editor) ? this.editor : undefined;
  }

  async run(mode: SledgehammerSnapshot['mode'], provers?: string): Promise<boolean> {
    const editor = this.theoryEditor();
    if (!editor || editor.document.uri.scheme !== 'file') {
      void window.showInformationMessage('Open a theory and put the cursor on a lemma to run Sledgehammer.');
      return false;
    }
    if (this.status === 'unavailable') {
      void window.showInformationMessage('Isabelle is not running; Sledgehammer is unavailable.');
      return false;
    }
    if (mode === 'sledgehammer' && provers !== undefined) this.provers = provers;
    const uri = editor.document.uri.toString();
    const { line, character } = editor.selection.active;
    this.anchor = { uri, line };
    this.mode = mode;
    this.cancelled = false;
    this.messages = [];
    this.results = [];
    this.status = 'waiting';
    this.publish();
    this.view.reveal();
    try {
      // The server runs the query at the command under its caret.
      await this.client.sendNotification('PIDE/caret_update', { uri, line, character });
      await this.client.sendNotification('PIDE/sledgehammer_request',
        { provers: mode === 'try0' ? try0Methods : this.provers, isar: false, try0: true });
    } catch { this.unavailable(); return false; }
    return true;
  }

  async cancel(): Promise<void> {
    if (this.status !== 'waiting' && this.status !== 'running') return;
    this.cancelled = true;
    this.publish();
    await this.client.sendNotification('PIDE/sledgehammer_cancel', {}).catch(() => this.unavailable());
  }

  // The server answers a sendback with PIDE/sledgehammer_insert at the end of
  // the query command, so the proof lands after that command, not at the caret.
  async insert(text: string): Promise<void> {
    await this.client.sendNotification('PIDE/sledgehammer_sendback', { text }).catch(() => this.unavailable());
  }

  private async acceptInsert(message: Insert): Promise<void> {
    const path = Uri.parse(message.uri).fsPath;
    const document = workspace.textDocuments.find(candidate => candidate.uri.fsPath === path);
    if (!document) return;
    const offset = document.offsetAt(new Position(message.line, message.character));
    const insertion = proofInsertion(document.getText(), offset, message.text);
    const edit = new WorkspaceEdit();
    edit.replace(document.uri, new Range(document.positionAt(insertion.start), document.positionAt(insertion.end)),
      insertion.text);
    if (await workspace.applyEdit(edit)) this.clear();
  }

  private acceptStatus(message: string): void {
    if (!this.anchor) return;
    if (message === 'Finished') {
      if (this.status === 'waiting' || this.status === 'running') this.status = 'finished';
    } else this.status = message.startsWith('Sledgehammering') ? 'running' : 'waiting';
    this.publish();
  }

  private acceptOutput(content: string): void {
    if (!this.anchor) return;
    this.messages = outputMessages(content);
    this.results = sledgehammerResults(this.messages);
    this.publish();
  }

  private observe(event: TextDocumentChangeEvent): void {
    if (!this.anchor || event.document.uri.toString() !== this.anchor.uri) return;
    for (const change of event.contentChanges) {
      const { start, end } = change.range;
      if (start.line <= this.anchor.line && end.line >= this.anchor.line) { this.clear(); return; }
      if (end.line < this.anchor.line) {
        this.anchor.line += (change.text.match(/\n/g)?.length ?? 0) - (end.line - start.line);
      }
    }
    if (event.contentChanges.length) this.publish();
  }

  private clear(): void {
    this.anchor = undefined;
    this.messages = [];
    this.results = [];
    this.cancelled = false;
    if (this.status !== 'unavailable') this.status = 'idle';
    this.publish();
  }

  private publish(): void {
    this.view.update(this.snapshot());
    this.lenses.fire();
  }

  private get active(): boolean { return this.status === 'waiting' || this.status === 'running'; }

  snapshot(): SledgehammerSnapshot {
    const document = this.anchor && workspace.textDocuments.find(candidate => candidate.uri.toString() === this.anchor!.uri);
    return {
      status: this.status, mode: this.mode, cancelled: this.cancelled, provers: this.provers,
      ...(document ? { theory: basename(document.uri.fsPath, '.thy'), line: this.anchor!.line } : {}),
      messages: this.messages.map(message => ({ kind: message.kind,
        segments: message.segments.map(segment => ({ ...segment, text: unicodeSymbols(segment.text) })) })),
      results: this.results.map(result => ({ ...result, display: unicodeSymbols(result.text),
        try0: this.mode === 'try0' || try0Set.has(result.prover ?? '') })),
      errors: this.messages.filter(message => message.kind === 'error').map(message => unicodeSymbols(message.text)),
    };
  }

  private label(): string {
    const tool = this.mode === 'try0' ? 'try0' : 'Sledgehammer';
    if (this.active) return this.cancelled ? `${tool}: cancelling…` : `${tool}: running…`;
    const errors = this.messages.filter(message => message.kind === 'error');
    return this.cancelled ? `${tool}: cancelled` : errors.length ? `${tool}: ${unicodeSymbols(errors[0].text)}`
      : `${tool}: no proof found`;
  }

  provideCodeLenses(document: TextDocument): CodeLens[] {
    if (!this.anchor || document.uri.toString() !== this.anchor.uri || this.anchor.line >= document.lineCount) return [];
    const range = new Range(this.anchor.line, 0, this.anchor.line, 0);
    if (this.active) {
      return [new CodeLens(range, { title: this.label(), command: 'isabelleRevamp.sledgehammerCancel', tooltip: 'Cancel' })];
    }
    const lenses = this.results.filter(result => result.insertable).map(result => new CodeLens(range, {
      title: `Try this: ${unicodeSymbols(result.text.split('\n')[0])}`,
      command: 'isabelleRevamp.sledgehammerInsert', arguments: [result.text],
      tooltip: `Insert the proof found by ${result.prover ?? 'Sledgehammer'}`,
    }));
    if (!lenses.length && this.status === 'finished') {
      lenses.push(new CodeLens(range, { title: this.label(), command: 'isabelleRevamp.showSledgehammer' }));
    }
    return lenses;
  }

  provideHover(document: TextDocument, position: Position): Hover | undefined {
    if (!this.anchor || document.uri.toString() !== this.anchor.uri || position.line !== this.anchor.line) return undefined;
    if (!this.active && this.status !== 'finished') return undefined;
    const markdown = new MarkdownString(undefined, true);
    markdown.isTrusted = { enabledCommands: commandSelector };
    const tool = this.mode === 'try0' ? 'try0' : 'Sledgehammer';
    if (this.results.length) markdown.appendMarkdown(`**${tool}** found:\n\n`);
    else markdown.appendMarkdown(`**${this.label()}**\n\n`);
    for (const result of this.results) {
      markdown.appendCodeblock(unicodeSymbols(result.text), 'isabelle');
      const insert = result.insertable
        ? `[Insert](command:isabelleRevamp.sledgehammerInsert?${encodeURIComponent(JSON.stringify([result.text]))} "Insert this proof")`
        : 'not reconstructed';
      markdown.appendMarkdown(`${insert} · ${[result.prover, result.time].filter(Boolean).join(' · ')}\n\n`);
    }
    const line = document.lineAt(this.anchor.line);
    return new Hover(markdown, new Range(this.anchor.line, 0, this.anchor.line, line.text.length));
  }

  dispose(): void {
    for (const subscription of this.subscriptions) subscription.dispose();
    this.lenses.dispose();
  }
}
