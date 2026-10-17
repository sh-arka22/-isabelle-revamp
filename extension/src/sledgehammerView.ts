import { randomBytes } from 'node:crypto';
import { WebviewView, WebviewViewProvider } from 'vscode';
import { MessageSegment } from './markupXml';
import { viewHeader, viewTheme } from './viewTheme';

export interface SledgehammerSnapshot {
  status: 'idle' | 'waiting' | 'running' | 'finished' | 'unavailable';
  mode: 'sledgehammer' | 'try0';
  cancelled: boolean;
  provers: string;
  theory?: string;
  line?: number;
  messages: { kind: string; segments: MessageSegment[] }[];
  results: { text: string; display: string; insertable: boolean; prover?: string; time?: string; try0: boolean }[];
  errors: string[];
}

export const emptySledgehammer: SledgehammerSnapshot =
  { status: 'idle', mode: 'sledgehammer', cancelled: false, provers: '', messages: [], results: [], errors: [] };

const isActive = (state: SledgehammerSnapshot) => state.status === 'waiting' || state.status === 'running';

export function sledgehammerStatus(state: SledgehammerSnapshot): string {
  const tool = state.mode === 'try0' ? 'try0' : 'Sledgehammer';
  const proofs = state.results.filter(result => result.insertable).length;
  switch (state.status) {
    case 'idle': return 'Place the cursor on a lemma and run.';
    case 'waiting': return 'waiting for the proof context…';
    case 'running': return state.cancelled ? 'cancelling…' : `${tool} running…`;
    case 'finished': return state.cancelled ? `${tool} cancelled`
      : proofs ? `${proofs} proof${proofs === 1 ? '' : 's'} found` : state.errors[0] ?? `${tool}: no proof found`;
    case 'unavailable': return 'Isabelle is not running.';
  }
}

function presentation(state: SledgehammerSnapshot) {
  return { ...state, active: isActive(state), status: sledgehammerStatus(state), phase: state.status,
    theory: state.theory !== undefined ? `${state.theory}:${(state.line ?? 0) + 1}` : 'Isabelle Sledgehammer' };
}

export function sledgehammerHtml(state: SledgehammerSnapshot, nonce = randomBytes(16).toString('hex')): string {
  const view = presentation(state);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${viewTheme}
label { display: block; font-weight: 600; margin: 12px 0 6px; }
input { box-sizing: border-box; width: 100%; font: inherit; padding: 6px 8px;
  color: var(--vscode-input-foreground); background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); }
input:focus, button:focus-visible { outline: 1px solid var(--vscode-focusBorder); }
button { font: inherit; cursor: pointer; padding: 4px 10px; margin: 8px 4px 0 0;
  color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; }
button:disabled { opacity: .5; cursor: default; }
.result { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 6px 10px; margin: 10px 0; }
.result pre { margin: 0; }
.result .meta { margin: 4px 0 0; color: var(--vscode-descriptionForeground); }
.result .meta button { margin: 0 8px 0 0; }
.result.failed { opacity: .7; }
details { margin-top: 12px; color: var(--vscode-descriptionForeground); }
#log p { margin: 4px 0; white-space: pre-wrap; overflow-wrap: anywhere;
  font-family: var(--vscode-editor-font-family), monospace; font-size: .9em; }
#log .error { color: var(--vscode-errorForeground); }
#log code { color: var(--vscode-foreground); }
body.vscode-high-contrast .result, body.vscode-high-contrast-light .result { border-color: var(--vscode-contrastBorder); }
</style></head><body class="${view.phase}">
${viewHeader(view.theory, view.status)}
<label for="provers">Provers</label>
<input id="provers" type="text" spellcheck="false" autocomplete="off" aria-describedby="status">
<div><button id="run">Sledgehammer</button><button id="try0">try0</button><button id="cancel" disabled>Cancel</button></div>
<section id="results" aria-label="Proofs"></section>
<details id="messages"><summary>Messages</summary><div id="log" role="log"></div></details>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const provers = document.getElementById('provers');
const run = document.getElementById('run'), try0 = document.getElementById('try0'), cancel = document.getElementById('cancel');
const results = document.getElementById('results'), log = document.getElementById('log');
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
provers.addEventListener('input', () => vscode.postMessage({ type: 'provers', provers: provers.value }));
provers.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.isComposing) vscode.postMessage({ type: 'run', mode: 'sledgehammer', provers: provers.value });
});
run.addEventListener('click', () => vscode.postMessage({ type: 'run', mode: 'sledgehammer', provers: provers.value }));
try0.addEventListener('click', () => vscode.postMessage({ type: 'run', mode: 'try0' }));
cancel.addEventListener('click', () => vscode.postMessage({ type: 'cancel' }));
// Everything from the server is text: nodes are created and filled with
// textContent, so proof output can never run as markup here.
function card(result) {
  const node = element('article', result.insertable ? 'result' : 'result failed');
  node.append(element('pre', 'source', result.display));
  const meta = element('p', 'meta');
  if (result.insertable) {
    const insert = element('button', '', 'Insert');
    insert.addEventListener('click', () => vscode.postMessage({ type: 'sendback', text: result.text }));
    meta.append(insert);
  }
  meta.append(document.createTextNode([result.prover, result.try0 ? 'try0' : '', result.time,
    result.insertable ? '' : 'reconstruction failed'].filter(Boolean).join(' · ')));
  node.append(meta);
  return node;
}
function line(message) {
  const node = element('p', message.kind);
  for (const segment of message.segments) {
    node.append(segment.sendback ? element('code', '', segment.text) : document.createTextNode(segment.text));
  }
  return node;
}
window.addEventListener('message', event => {
  const message = event.data;
  if (message.type !== 'state') return;
  const state = message.state;
  document.querySelector('h1').textContent = state.theory;
  document.querySelector('.status').textContent = state.status;
  document.body.classList.toggle('error', state.errors.length > 0);
  if (document.activeElement !== provers) provers.value = state.provers;
  run.disabled = try0.disabled = state.active; cancel.disabled = !state.active;
  results.replaceChildren(...state.results.map(card));
  log.replaceChildren(...state.messages.map(line));
});
vscode.postMessage({ type: 'ready' });
</script></body></html>`;
}

export class SledgehammerView implements WebviewViewProvider {
  private view?: WebviewView;
  private state = emptySledgehammer;
  onRun?: (mode: SledgehammerSnapshot['mode'], provers?: string) => void;
  onCancel?: () => void;
  onSendback?: (text: string) => void;
  onProvers?: (provers: string) => void;

  resolveWebviewView(view: WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [] };
    const messages = view.webview.onDidReceiveMessage(message => {
      if (message?.type === 'ready') this.update(this.state);
      else if (message?.type === 'run') this.onRun?.(message.mode === 'try0' ? 'try0' : 'sledgehammer',
        typeof message.provers === 'string' ? message.provers : undefined);
      else if (message?.type === 'cancel') this.onCancel?.();
      else if (message?.type === 'sendback' && typeof message.text === 'string') this.onSendback?.(message.text);
      else if (message?.type === 'provers' && typeof message.provers === 'string') this.onProvers?.(message.provers);
    });
    view.onDidDispose(() => { messages.dispose(); this.view = undefined; });
    view.webview.html = sledgehammerHtml(this.state);
  }

  // Shows the view without taking focus from the editor; false until resolved.
  reveal(): boolean {
    if (!this.view) return false;
    this.view.show(true);
    return true;
  }
  update(state: SledgehammerSnapshot): void {
    this.state = state;
    void this.view?.webview.postMessage({ type: 'state', state: presentation(state) });
  }
  snapshot(): SledgehammerSnapshot { return this.state; }
}
