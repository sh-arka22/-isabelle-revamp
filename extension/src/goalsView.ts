import { randomBytes } from 'node:crypto';
import { Disposable, Webview, WebviewView, WebviewViewProvider } from 'vscode';
import { AskState } from './ask';
import { escapeText } from './outputText';
import { viewHeader, viewTheme } from './viewTheme';

export interface GoalState {
  phase: 'idle' | 'checking' | 'ready' | 'unfinished' | 'error' | 'unavailable';
  text: string;
  errors: string[];
  theory?: string;
  checkStatus?: 'checking' | 'fully_checked' | 'unfinished' | 'error';
}

function presentation(state: GoalState) {
  const checking = state.phase === 'checking' || state.phase === 'ready' && state.checkStatus === 'checking';
  const status = checking ? 'checking…' : {
    idle: 'Open a theory and place the cursor in a proof.',
    checking: 'checking…',
    ready: state.checkStatus === 'fully_checked' ? 'fully checked'
      : state.checkStatus === 'unfinished' ? 'unfinished' : 'Goal at cursor',
    unfinished: 'unfinished (sorry)',
    error: 'Proof error — see editor diagnostics.',
    unavailable: 'Goal state unavailable. Move the cursor to retry.',
  }[state.phase];
  return { theory: state.theory ?? 'Isabelle Goals', status, phase: state.phase,
    text: checking ? '' : state.text, errors: checking ? '' : state.errors.join('\n\n') };
}

const restartLink = '<nav class="actions"><button id="restart" class="link" type="button" '
  + 'title="Stop and start the Isabelle language server">↻ Restart</button></nav>';

export function goalsHtml(state: GoalState, nonce = randomBytes(16).toString('hex')): string {
  const goal = presentation(state);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${viewTheme}
#ask { margin-bottom: 16px; }
label { display: block; font-weight: 600; margin-bottom: 6px; }
textarea { box-sizing: border-box; width: 100%; min-height: 65px; resize: vertical; font: inherit;
  color: var(--vscode-input-foreground); background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); padding: 8px; }
textarea:focus, button:focus-visible { outline: 1px solid var(--vscode-focusBorder); }
button { font: inherit; cursor: pointer; padding: 4px 10px; margin-top: 6px;
  color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; }
button:disabled { opacity: .5; cursor: default; }
button.link { padding: 0; margin: 0; background: none; color: var(--vscode-textLink-foreground); }
button.link:hover { text-decoration: underline; }
.actions { margin-top: 6px; font-size: .9em; }
#ask-status, .tool { color: var(--vscode-descriptionForeground); }
#transcript { max-height: 40vh; overflow-y: auto; }
#transcript p { white-space: pre-wrap; overflow-wrap: anywhere; margin: 8px 0; }
#transcript .user { font-weight: 600; }
#transcript .tool { font-family: var(--vscode-editor-font-family), monospace; font-size: .9em; }
#transcript .notice { color: var(--vscode-editorWarning-foreground); }
</style></head><body class="${goal.phase}">
<section id="ask" aria-label="Ask Isabelle">
<label for="prompt">Ask Isabelle</label>
<textarea id="prompt" placeholder="prove this" aria-describedby="ask-status"></textarea>
<button id="send">Send</button> <button id="stop" disabled>Stop</button>
<p id="ask-status" role="status">Enter sends · Shift+Enter adds a line</p>
<div id="transcript" role="log" aria-label="Ask transcript"></div>
</section>
${viewHeader(goal.theory, goal.status, restartLink)}
<pre id="goal" class="source" aria-label="Goal at cursor">${escapeText(goal.text)}</pre>
<pre id="errors" class="errors" aria-label="Diagnostics">${escapeText(goal.errors)}</pre>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const prompt = document.getElementById('prompt');
const send = document.getElementById('send'), stop = document.getElementById('stop');
const transcript = document.getElementById('transcript');
let active = false;
prompt.value = vscode.getState()?.draft || '';
prompt.addEventListener('input', () => vscode.setState({ draft: prompt.value }));
function submit() {
  if (active || !prompt.value.trim()) return;
  active = true; prompt.disabled = true; send.disabled = true; stop.disabled = false;
  vscode.postMessage({ type: 'ask', text: prompt.value });
  prompt.value = ''; vscode.setState({ draft: '' });
}
send.addEventListener('click', submit);
stop.addEventListener('click', () => vscode.postMessage({ type: 'stop' }));
document.getElementById('restart').addEventListener('click', () => vscode.postMessage({ type: 'restart' }));
prompt.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); submit(); }
});
window.addEventListener('message', event => {
  const message = event.data;
  if (message.type === 'focus') { prompt.focus(); return; }
  if (message.type === 'goal') {
    const goal = message.goal;
    document.querySelector('h1').textContent = goal.theory;
    document.querySelector('.status').textContent = goal.status;
    document.body.classList.toggle('error', goal.phase === 'error');
    document.getElementById('goal').textContent = goal.text;
    document.getElementById('errors').textContent = goal.errors;
  }
  if (message.type === 'askState') {
    const wasActive = active;
    active = message.state.active;
    prompt.disabled = active; send.disabled = active; stop.disabled = !active;
    document.getElementById('ask-status').textContent = active ? 'Claude is working…' : 'Enter sends · Shift+Enter adds a line';
    const follow = transcript.scrollTop + transcript.clientHeight >= transcript.scrollHeight - 40;
    for (const entry of message.state.entries) {
      let node = [...transcript.children].find(child => child.dataset.id === String(entry.id));
      if (!node) { node = document.createElement('p'); node.dataset.id = String(entry.id); transcript.append(node); }
      node.className = entry.kind;
      node.textContent = entry.kind === 'user' ? 'You: ' + entry.text : entry.text;
    }
    if (follow) transcript.scrollTop = transcript.scrollHeight;
    if (wasActive && !active) prompt.focus();
  }
});
vscode.postMessage({ type: 'ready' });
</script></body></html>`;
}

// One model, several webviews: the sidebar view and any panel beside the
// editor show the same goal, transcript and header.
export class GoalsView implements WebviewViewProvider {
  private webviews = new Set<Webview>();
  private focusPending = false;
  private state: GoalState = { phase: 'idle', text: '', errors: [] };
  private askState: AskState = { active: false, entries: [] };
  onAsk?: (text: string) => void;
  onStop?: () => void;
  onRestart?: () => void;

  attach(webview: Webview): Disposable {
    this.webviews.add(webview);
    webview.options = { enableScripts: true, localResourceRoots: [] };
    const messages = webview.onDidReceiveMessage(message => {
      if (message?.type === 'ready') {
        void this.post(webview, { type: 'goal', goal: presentation(this.state) });
        void this.post(webview, { type: 'askState', state: this.askState });
        if (this.focusPending) this.focusAsk();
      } else if (message?.type === 'ask' && typeof message.text === 'string') this.onAsk?.(message.text);
      else if (message?.type === 'stop') this.onStop?.();
      else if (message?.type === 'restart') this.onRestart?.();
    });
    webview.html = goalsHtml(this.state);
    return { dispose: () => { messages.dispose(); this.webviews.delete(webview); } };
  }

  resolveWebviewView(view: WebviewView): void {
    const attached = this.attach(view.webview);
    view.onDidDispose(() => attached.dispose());
  }

  get attached(): number { return this.webviews.size; }

  // Test doubles may return nothing from postMessage.
  private post(webview: Webview, message: unknown): Promise<boolean> {
    return Promise.resolve(webview.postMessage(message)).then(delivered => delivered === true, () => false);
  }
  private broadcast(message: unknown): void {
    for (const webview of this.webviews) void this.post(webview, message);
  }

  focusAsk(): void {
    this.focusPending = true;
    for (const webview of this.webviews) {
      void this.post(webview, { type: 'focus' }).then(delivered => { if (delivered) this.focusPending = false; });
    }
  }
  update(state: GoalState): void {
    this.state = state;
    this.broadcast({ type: 'goal', goal: presentation(state) });
  }
  updateAsk(state: AskState): void {
    this.askState = state;
    this.broadcast({ type: 'askState', state });
  }
  snapshot(): GoalState { return { ...this.state, errors: [...this.state.errors] }; }
}
