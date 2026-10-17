import { DecorationRenderOptions, Disposable, OverviewRulerLane, Range, TextEditor, TextEditorDecorationType, Uri, window, workspace } from 'vscode';
import { Goals } from './goals';
import { paletteColour } from './palette';

// PIDE/decoration types are "<prefix>_<Rendering.Color>" (vscode_rendering.scala).
// Goals stores every delta per document; this module only draws them, the way
// the official extension's decorations.ts renders each prefix.
const semantic = ['free', 'bound', 'skolem', 'tfree', 'tvar', 'var', 'keyword1', 'keyword2', 'keyword3',
  'quasi_keyword', 'improper', 'operator', 'inner_numeral', 'inner_quoted', 'inner_cartouche',
  'comment1', 'comment2', 'comment3', 'antiquote', 'dynamic', 'class_parameter'].map(name => 'text_' + name);
const processing = ['background_unprocessed1', 'background_running1', 'background_canceled'];
const always = ['background_bad', 'dotted_writeln', 'dotted_information', 'dotted_warning',
  'text_overview_unprocessed', 'text_overview_running', 'text_overview_error', 'text_overview_warning'];
export const decorationTypes = [...semantic, ...processing, ...always];

function themed(key: 'color' | 'backgroundColor' | 'borderColor' | 'overviewRulerColor', colour: string,
  options: DecorationRenderOptions = {}): DecorationRenderOptions {
  return { ...options, light: { [key]: paletteColour(colour, true) }, dark: { [key]: paletteColour(colour, false) } };
}

export function renderOptions(type: string): DecorationRenderOptions {
  const prefix = ['text_overview_', 'background_', 'dotted_', 'text_'].find(name => type.startsWith(name))!;
  const colour = type.slice(prefix.length);
  if (prefix === 'text_overview_') return themed('overviewRulerColor', colour, { overviewRulerLane: OverviewRulerLane.Right });
  if (prefix === 'background_') return themed('backgroundColor', colour);
  if (prefix === 'dotted_') return themed('borderColor', colour, { borderStyle: 'dotted', borderWidth: '0 0 2px 0' });
  return themed('color', colour);
}

export class Decorations implements Disposable {
  private types = new Map<string, TextEditorDecorationType>();
  private applied = new Map<string, Record<string, number>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private subscriptions: Disposable[];

  constructor(private goals: Goals) {
    for (const type of decorationTypes) this.types.set(type, window.createTextEditorDecorationType(renderOptions(type)));
    this.subscriptions = [
      goals.onDidDecorate(uri => this.schedule(uri)),
      window.onDidChangeVisibleTextEditors(editors => editors.forEach(editor => this.apply(editor))),
      workspace.onDidCloseTextDocument(document => {
        goals.forget(document.uri.toString());
        this.applied.delete(document.uri.toString());
      }),
      workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('isabelleRevamp.decorations')) window.visibleTextEditors.forEach(editor => this.apply(editor));
      }),
    ];
    window.visibleTextEditors.forEach(editor => this.apply(editor));
  }

  // Deltas arrive in bursts while the prover runs; one repaint per burst is enough.
  private schedule(uri: string): void {
    clearTimeout(this.timers.get(uri));
    this.timers.set(uri, setTimeout(() => {
      this.timers.delete(uri);
      for (const editor of window.visibleTextEditors) if (editor.document.uri.toString() === uri) this.apply(editor);
    }, 30));
  }

  private enabled(type: string, uri: Uri): boolean {
    if (always.includes(type)) return true;
    const settings = workspace.getConfiguration('isabelleRevamp.decorations', uri);
    return settings.get(type.startsWith('text_') ? 'semanticColours' : 'processingBackground', true);
  }

  apply(editor: TextEditor): void {
    const document = editor.document;
    if (document.languageId !== 'isabelle') return;
    const counts: Record<string, number> = {};
    for (const [type, decoration] of this.types) {
      // Ranges describe the server's copy; an edit it has not seen can make them overshoot.
      const ranges = this.enabled(type, document.uri)
        ? this.goals.decorationRanges(document, type).map(range => document.validateRange(new Range(...range))) : [];
      if (ranges.length) counts[type] = ranges.length;
      editor.setDecorations(decoration, ranges);
    }
    this.applied.set(document.uri.toString(), counts);
  }

  // Counts per decoration type as last painted for this editor's document.
  snapshot(editor?: TextEditor): Record<string, number> {
    return { ...(editor && this.applied.get(editor.document.uri.toString())) };
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    for (const subscription of this.subscriptions) subscription.dispose();
    for (const type of this.types.values()) type.dispose();
  }
}
