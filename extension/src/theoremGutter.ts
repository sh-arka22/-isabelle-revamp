import { DiagnosticSeverity, Disposable, languages, OverviewRulerLane, Range, TextEditor, TextEditorDecorationType, Uri, window, workspace } from 'vscode';
import { Goals } from './goals';
import { outlineOf } from './outline';
import { goalItems } from './outlineModel';
import { classifyTheorems, Span, statusColours, statusIcon, TheoremState, TheoremStatus } from './theoremStatus';

const states: TheoremState[] = ['proved', 'unfinished', 'error', 'checking'];

export class TheoremGutter implements Disposable {
  private types = new Map<TheoremState, TextEditorDecorationType>();
  private timer?: ReturnType<typeof setTimeout>;
  private subscriptions: Disposable[];

  constructor(private goals: Goals) {
    for (const state of states) {
      this.types.set(state, window.createTextEditorDecorationType({
        gutterIconPath: Uri.parse(statusIcon(state)), gutterIconSize: 'contain',
        overviewRulerColor: statusColours[state], overviewRulerLane: OverviewRulerLane.Left,
      }));
    }
    this.subscriptions = [
      goals.onDidUpdate(() => this.schedule()),
      languages.onDidChangeDiagnostics(() => this.schedule()),
      workspace.onDidChangeTextDocument(event => { if (event.document.languageId === 'isabelle') this.schedule(); }),
      window.onDidChangeVisibleTextEditors(() => this.schedule()),
      workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('isabelleRevamp.decorations')) this.schedule(); }),
    ];
    this.schedule();
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refresh(), 150);
  }

  // Current-version facts only: an unconfirmed document is still "checking".
  statuses(editor?: TextEditor): TheoremStatus[] {
    const document = editor?.document;
    if (!document || document.isClosed || document.languageId !== 'isabelle') return [];
    const processing = this.goals.processing(document);
    const span = (range: Range): Span => [range.start.line, range.start.character, range.end.line, range.end.character];
    const errors = languages.getDiagnostics(document.uri).filter(d => d.severity === DiagnosticSeverity.Error)
      .map(d => span(d.range)).concat(this.goals.decorationRanges(document, 'text_overview_error'));
    return classifyTheorems(goalItems(outlineOf(document)), { known: processing.known, errors,
      sorries: this.goals.sorryPositions(document), busy: processing.pending.map(item => item.range) });
  }

  private refresh(): void {
    for (const editor of window.visibleTextEditors) {
      if (editor.document.languageId !== 'isabelle') continue;
      const enabled = workspace.getConfiguration('isabelleRevamp.decorations', editor.document.uri).get('theoremMarks', true);
      const statuses = enabled ? this.statuses(editor) : [];
      for (const [state, type] of this.types) {
        editor.setDecorations(type, statuses.filter(item => item.status === state).map(item => new Range(item.line, 0, item.line, 0)));
      }
    }
  }

  dispose(): void {
    clearTimeout(this.timer);
    for (const subscription of this.subscriptions) subscription.dispose();
    for (const type of this.types.values()) type.dispose();
  }
}
