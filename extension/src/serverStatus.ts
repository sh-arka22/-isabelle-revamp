import type { StatusBarItem } from 'vscode';

export type ServerPhase = 'starting' | 'ready' | 'checking' | 'stopped';

export function statusText(phase: ServerPhase): string {
  return 'Isabelle: ' + { starting: 'starting…', ready: 'ready', checking: 'checking…', stopped: 'stopped' }[phase];
}

// The item is created by the caller so this module stays free of vscode values.
export class ServerStatus {
  phase: ServerPhase = 'starting';
  constructor(private item: Pick<StatusBarItem, 'text' | 'tooltip' | 'command' | 'show' | 'dispose'>) {
    item.command = 'isabelleRevamp.restartServer';
    this.set('starting');
    item.show();
  }
  set(phase: ServerPhase): void {
    this.phase = phase;
    this.item.text = statusText(phase);
    this.item.tooltip = phase === 'stopped'
      ? 'The Isabelle language server is not running. Click to restart it.'
      : 'Isabelle language server. Click to restart it.';
  }
  dispose(): void { this.item.dispose(); }
}
