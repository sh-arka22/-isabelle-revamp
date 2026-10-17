import { ConfigurationTarget, DecorationRangeBehavior, Disposable, Range, TextEditor, TextEditorDecorationType, window, workspace } from 'vscode';
import { ScriptStyle, symbolReplacements, SymbolReplacement } from './symbols';

// Script styles as in the official script_decorations.ts (see ../THIRD_PARTY_NOTICES.md).
const scriptCss: Record<ScriptStyle, string> = {
  sup: 'position: relative; top: -0.5em; font-size: 80%',
  sub: 'position: relative; bottom: -0.5em; font-size: 80%',
  bold: 'font-weight: bold',
};
type Kind = '' | ScriptStyle | `keep-${ScriptStyle}`;
const kindOf = (item: SymbolReplacement): Kind => item.keep ? `keep-${item.style!}` : item.style ?? '';

// Ranges always refer to the untouched source, including search selections.
export class PrettySymbols implements Disposable {
  private decorations = new Map<Kind, TextEditorDecorationType>();
  private subscriptions: Disposable[];
  private cache = new Map<string, { version: number; replacements: SymbolReplacement[] }>();
  constructor() {
    for (const style of ['', 'sup', 'sub', 'bold'] as const) {
      const css = style ? '; ' + scriptCss[style] : '';
      this.decorations.set(style, window.createTextEditorDecorationType({
        textDecoration: 'none; display: none', rangeBehavior: DecorationRangeBehavior.ClosedClosed,
        before: { textDecoration: 'none; display: inline' + css, color: 'inherit' },
      }));
      if (style) this.decorations.set(`keep-${style}`, window.createTextEditorDecorationType({ textDecoration: 'none; ' + scriptCss[style] }));
    }
    this.subscriptions = [
      workspace.onDidChangeTextDocument(event => { this.cache.delete(event.document.uri.toString()); this.refresh(); }),
      workspace.onDidCloseTextDocument(document => this.cache.delete(document.uri.toString())),
      window.onDidChangeVisibleTextEditors(() => this.refresh()),
      window.onDidChangeTextEditorSelection(event => this.refresh(event.textEditor)),
      workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('isabelleRevamp.prettySymbols')) this.refresh(); }),
    ];
    this.refresh();
  }
  snapshot(editor: TextEditor): SymbolReplacement[] {
    const document = editor.document;
    if (document.languageId !== 'isabelle' || !workspace.getConfiguration('isabelleRevamp', document.uri).get('prettySymbols', true)) return [];
    const uri = document.uri.toString();
    let cached = this.cache.get(uri);
    if (cached?.version !== document.version) {
      cached = { version: document.version, replacements: symbolReplacements(document.getText()) };
      this.cache.set(uri, cached);
    }
    return cached.replacements.filter(item => !editor.selections.some(selection => {
      const start = document.offsetAt(selection.start), end = document.offsetAt(selection.end);
      return selection.isEmpty ? start >= item.start && start <= item.end : start < item.end && end > item.start;
    }));
  }
  refresh(editor?: TextEditor): void {
    for (const target of editor ? [editor] : window.visibleTextEditors) {
      const grouped = new Map<Kind, { range: Range; renderOptions?: { before: { contentText: string } } }[]>();
      for (const item of this.snapshot(target)) {
        const range = new Range(target.document.positionAt(item.start), target.document.positionAt(item.end));
        const kind = kindOf(item);
        grouped.set(kind, [...grouped.get(kind) ?? [],
          item.keep ? { range } : { range, renderOptions: { before: { contentText: item.text } } }]);
      }
      for (const [kind, decoration] of this.decorations) target.setDecorations(decoration, grouped.get(kind) ?? []);
    }
  }
  async toggle(): Promise<void> {
    const settings = workspace.getConfiguration('isabelleRevamp', window.activeTextEditor?.document.uri);
    await settings.update('prettySymbols', !settings.get('prettySymbols', true), ConfigurationTarget.Workspace);
  }
  dispose(): void {
    for (const decoration of this.decorations.values()) decoration.dispose();
    this.subscriptions.forEach(item => item.dispose()); this.cache.clear();
  }
}
