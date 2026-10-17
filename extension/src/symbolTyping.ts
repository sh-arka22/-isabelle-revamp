import { commands, CompletionItem, CompletionItemKind, Disposable, languages, Position, Range, SnippetString,
  TextDocument, TextDocumentChangeEvent, window, workspace } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { cartoucheConversions } from './cartouches';
import { completionCandidates, rewriteOnType } from './symbolInput';
import { isSymbolName, symbolEntries } from './symbols';

// Typing symbols in ASCII: `\` completion over the installed table and the
// session's abbreviations, the rewrite on type, Insert Symbol, and the
// quote-to-cartouche converter. The file never receives Unicode.
export class SymbolTyping implements Disposable {
  sessionAbbrevs: [string, string][] = [];
  private busy = false;
  private subscriptions: Disposable[];
  private response?: Disposable;

  constructor(private client: LanguageClient) {
    this.rebind(client);
    this.subscriptions = [
      languages.registerCompletionItemProvider({ language: 'isabelle' },
        { provideCompletionItems: (document, position) => this.complete(document, position) }, '\\'),
      workspace.onDidChangeTextDocument(event => { void this.rewrite(event); }),
      commands.registerCommand('isabelleRevamp.insertSymbol', () => this.insertSymbol()),
      commands.registerCommand('isabelleRevamp.convertQuotesToCartouches', () => this.convertQuotes()),
    ];
  }

  // A restarted server is a new client; the table is requested again when it runs.
  rebind(client: LanguageClient): void {
    this.client = client;
    this.response?.dispose();
    this.sessionAbbrevs = [];
    // PIDE/abbrevs_response: {abbrevs: [[from, to], ...]} from the theory headers of the session.
    this.response = client.onNotification('PIDE/abbrevs_response', (message: { abbrevs?: unknown }) => {
      this.sessionAbbrevs = (Array.isArray(message?.abbrevs) ? message.abbrevs : [])
        .filter((pair): pair is [string, string] => Array.isArray(pair) && pair.length === 2 && pair.every(item => typeof item === 'string'));
    });
  }

  requestAbbrevs(): void {
    void this.client.sendNotification('PIDE/abbrevs_request').catch(() => {});
  }

  private complete(document: TextDocument, position: Position): CompletionItem[] {
    const prefix = document.lineAt(position.line).text.slice(0, position.character);
    const match = /\\([^\s\\]*)$/.exec(prefix);
    // `\<…` spells an escape by hand; the server completes those.
    if (!match || match[1].startsWith('<')) return [];
    const range = new Range(position.translate(0, -match[0].length), position);
    return completionCandidates(symbolEntries(), this.sessionAbbrevs).map(candidate => {
      const item = new CompletionItem(candidate.label, candidate.snippet ? CompletionItemKind.Snippet : CompletionItemKind.Operator);
      item.detail = candidate.detail;
      item.insertText = candidate.snippet ? new SnippetString(candidate.insert) : candidate.insert;
      item.filterText = candidate.filter;
      item.range = range;
      return item;
    });
  }

  private async rewrite(event: TextDocumentChangeEvent): Promise<void> {
    const { document } = event;
    if (this.busy || event.contentChanges.length !== 1 || document.languageId !== 'isabelle') return;
    if (!workspace.getConfiguration('isabelleRevamp', document.uri).get('symbolRewrite', true)) return;
    const change = event.contentChanges[0];
    const editor = window.activeTextEditor;
    if (change.rangeLength !== 0 || !change.text || editor?.document !== document) return;
    const prefix = document.getText(new Range(new Position(0, 0), change.range.start));
    const rewrite = rewriteOnType(prefix, change.text, isSymbolName);
    if (!rewrite) return;
    const target = new Range(document.positionAt(rewrite.start), document.positionAt(rewrite.end));
    if (document.getText(target) !== rewrite.from) return;
    this.busy = true;
    try {
      await editor.edit(edit => edit.replace(target, rewrite.text), { undoStopBefore: false, undoStopAfter: false });
    } finally { this.busy = false; }
  }

  private async insertSymbol(): Promise<void> {
    const editor = window.activeTextEditor;
    if (!editor) { void window.showInformationMessage('Open a theory before inserting a symbol.'); return; }
    const picked = await window.showQuickPick(symbolEntries().map(entry => ({
      label: entry.glyph ? `${entry.glyph}  \\${entry.name}` : `\\${entry.name}`,
      description: `\\<${entry.name}>`,
      detail: [entry.abbrevs.length ? 'abbrev ' + entry.abbrevs.join(' ') : '', entry.group ?? ''].filter(Boolean).join('   '),
      name: entry.name,
    })), { matchOnDescription: true, matchOnDetail: true, placeHolder: 'Symbol name, abbreviation or glyph' });
    if (!picked) return;
    await editor.edit(edit => { for (const selection of editor.selections) edit.replace(selection, `\\<${picked.name}>`); });
  }

  private async convertQuotes(): Promise<number> {
    const editor = window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'isabelle') {
      void window.showInformationMessage('Open a theory before converting its quotes.'); return 0;
    }
    const { document, selection } = editor;
    const source = document.getText();
    const [start, end] = selection.isEmpty ? [0, source.length] : [document.offsetAt(selection.start), document.offsetAt(selection.end)];
    const conversions = cartoucheConversions(source, start, end);
    if (conversions.length) {
      await editor.edit(edit => {
        for (const item of conversions) edit.replace(new Range(document.positionAt(item.start), document.positionAt(item.end)), item.text);
      });
    }
    window.setStatusBarMessage(`Isabelle: converted ${conversions.length} quoted argument${conversions.length === 1 ? '' : 's'} to cartouches`, 5000);
    return conversions.length;
  }

  dispose(): void { this.response?.dispose(); this.subscriptions.forEach(item => item.dispose()); }
}
