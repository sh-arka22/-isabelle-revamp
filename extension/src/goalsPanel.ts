import { Disposable, ViewColumn, WebviewPanel, window } from 'vscode';
import { GoalsView } from './goalsView';

// The goals beside the editor, like Lean's InfoView. It shares the sidebar's
// model and never takes focus away from the editor.
export class GoalsPanel implements Disposable {
  private panel?: WebviewPanel;
  constructor(private view: GoalsView) {}

  get open(): boolean { return this.panel !== undefined; }

  show(): void {
    if (this.panel) { this.panel.reveal(undefined, true); return; }
    const panel = window.createWebviewPanel('isabelleRevamp.goalsPanel', 'Isabelle Goals',
      { viewColumn: ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, localResourceRoots: [], retainContextWhenHidden: true });
    this.panel = panel;
    const attached = this.view.attach(panel.webview);
    panel.onDidDispose(() => { attached.dispose(); if (this.panel === panel) this.panel = undefined; });
  }

  dispose(): void { this.panel?.dispose(); }
}
