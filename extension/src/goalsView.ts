import { randomBytes } from 'node:crypto';
import { Disposable, Webview, WebviewView, WebviewViewProvider } from 'vscode';
import { AskState } from './ask';
import { sendbackTexts } from './insertProof';
import { MessageKind } from './outputHtml';
import { escapeText } from './outputText';
import { proofComplete } from './stateParts';
import { outputStyles, viewHeader, viewTheme } from './viewTheme';

export interface GoalMessage { kind: MessageKind; text: string; html: string }
export interface GoalFact { text: string; html: string }
// A frozen server state panel (PIDE/state_auto_update enabled=false) and the
// caret it was taken at. Its content never follows the caret or the text;
// `stale` says the theory was edited after pinning.
export interface GoalPin {
  id: number; uri: string; theory: string; position: { line: number; character: number };
  version: number; stale: boolean; text: string; goalHtml: string; facts: GoalFact[];
}
export interface GoalState {
  phase: 'idle' | 'checking' | 'ready' | 'unfinished' | 'error' | 'unavailable';
  text: string;
  errors: string[];
  theory?: string;
  checkStatus?: 'checking' | 'fully_checked' | 'unfinished' | 'error';
  // Sanitised server HTML (see outputHtml.ts): the whole state, the state
  // without its facts block, the facts, and the command's other messages.
  html?: string;
  goalHtml?: string;
  facts?: GoalFact[];
  messages?: GoalMessage[];
  // Zero-based caret the state belongs to, like the MCP coordinates.
  position?: { line: number; character: number };
  pins?: GoalPin[];
  // The view keeps this state while the caret moves.
  paused?: boolean;
}

export const doneBanner = '✓ No goals — this step is complete';
export const notInProof = 'Not in a proof';
export const pinNotice = 'Theory edited since pinned';

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;');
}

// Extension points. Both take trusted markup built by the caller, never
// server content. Clicks on an element with `data-action` reach
// GoalsView.onAction with the element's data-* fields; `insert` buttons
// post their `data-text` to GoalsView.onInsert and `restart` to
// GoalsView.onRestart instead.
export const restartLink = '<button type="button" id="restart" class="link" data-action="restart" '
  + 'title="Stop and start the Isabelle language server">↻ Restart</button>';
export let headerActions = restartLink;
export function setHeaderActions(markup: string): void { headerActions = markup; }
export function insertButtons(html: string): string {
  return sendbackTexts(html).map(text => {
    const label = text.replace(/\s+/g, ' ');
    return `<button type="button" class="link insert" data-action="insert" data-text="${escapeAttribute(text)}" `
      + `title="Insert into the theory at this command">Insert ‹${escapeText(label.length > 40 ? label.slice(0, 39) + '…' : label)}›</button>`;
  }).join(' ');
}
export let messageActions: (message: GoalMessage, index: number) => string = message => insertButtons(message.html);
export function setMessageActions(render: typeof messageActions): void { messageActions = render; }

const messageLabels: Record<MessageKind, string> = { info: 'i', warning: '!', error: '✕', state: '' };

export function messageHtml(message: GoalMessage, index: number): string {
  return `<div class="message kind-${message.kind}" data-index="${index}">`
    + `<span class="message-icon" aria-label="${message.kind}">${messageLabels[message.kind]}</span>`
    + `<pre class="source">${message.html}</pre>`
    + `<div class="message-actions">${messageActions(message, index)}</div></div>`;
}

function factHtml(fact: GoalFact): string {
  return `<pre class="fact source">${fact.html}</pre>`;
}

export function pinTitle(pin: GoalPin): string {
  return `${pin.theory}.thy:${pin.position.line + 1}`;
}

export function pinHtml(pin: GoalPin): string {
  const done = proofComplete(pin.text);
  return `<section class="panel pin" data-pin="${pin.id}" aria-label="Pinned goal">
<h2 class="panel-title"><span class="count pinned">pinned</span><span class="pin-title">${escapeText(pinTitle(pin))}</span>
<span class="pin-actions"><button type="button" class="link" data-action="goto" data-id="${pin.id}" title="Reveal the pinned position">Go to</button>
<button type="button" class="link" data-action="unpin" data-id="${pin.id}">Unpin</button></span></h2>
<p class="muted stale"${pin.stale ? '' : ' hidden'}>${pinNotice}</p>
<div class="panel-body">${pin.facts.map(factHtml).join('')}${done ? `<p class="done" role="status">${doneBanner}</p>`
    : `<pre class="source">${pin.goalHtml}</pre>`}</div></section>`;
}

function headerButtons(canPin: boolean, paused: boolean, pinCount: number): string {
  return `<button type="button" class="link" data-action="pin" title="Keep this goal visible while editing elsewhere"${canPin ? '' : ' disabled'}>Pin</button>`
    + ` <button type="button" class="link" data-action="pause" aria-pressed="${paused}" title="${paused ? 'Follow the cursor again' : 'Stop following the cursor'}">${paused ? 'Resume' : 'Pause'}</button>`
    + (pinCount > 1 ? ` <button type="button" class="link" data-action="unpin-all">Unpin all</button>` : '');
}

export function presentation(state: GoalState) {
  const paused = state.paused === true;
  const checking = state.phase === 'checking';
  // A confirmed goal stays on show while later commands are still checked;
  // only the badge says the theory is not settled yet.
  const pending = checking || state.phase === 'ready' && state.checkStatus === 'checking';
  const status = paused ? 'paused' : pending ? 'checking…' : {
    idle: 'Open a theory and place the cursor in a proof.',
    checking: 'checking…',
    ready: state.checkStatus === 'fully_checked' ? 'fully checked'
      : state.checkStatus === 'unfinished' ? 'unfinished' : 'Goal at cursor',
    unfinished: 'unfinished (sorry)',
    error: 'Proof error — see editor diagnostics.',
    unavailable: 'Goal state unavailable. Move the cursor to retry.',
  }[state.phase];
  const badge = paused ? 'paused' : pending ? 'checking' : state.phase === 'error' ? 'error'
    : state.phase === 'unfinished' || state.checkStatus === 'unfinished' ? 'unfinished'
    : state.checkStatus === 'fully_checked' ? 'fully_checked' : state.phase;
  const settled = !checking && ['ready', 'unfinished', 'error'].includes(state.phase);
  const messages = settled ? (state.messages ?? []) : [];
  const facts = settled ? (state.facts ?? []) : [];
  const text = checking ? '' : state.text;
  const done = settled && state.phase !== 'error' && proofComplete(text);
  const errors = checking ? '' : state.errors.join('\n\n');
  const goalHtml = checking || done ? '' : state.goalHtml ?? escapeText(text);
  const pins = state.pins ?? [];
  return {
    theory: state.theory ?? 'Isabelle Goals', status, badge, phase: state.phase, text, errors, paused,
    position: state.theory && state.position
      ? `${state.theory}.thy:${state.position.line + 1}:${state.position.character + 1}` : '',
    goalHtml,
    goalActionsHtml: insertButtons(goalHtml),
    done,
    empty: settled && state.phase !== 'error' && !text.trim() && !messages.length,
    factsHtml: facts.map(factHtml).join(''),
    factCount: facts.length,
    messagesHtml: messages.map(messageHtml).join(''),
    messageCount: messages.length,
    // Editor diagnostics are repeated only while no message carries them.
    showErrors: errors.length > 0 && !messages.some(message => message.kind === 'error'),
    pinsHtml: pins.map(pinHtml).join(''),
    pinCount: pins.length,
    actionsHtml: headerButtons(settled && text.trim().length > 0, paused, pins.length) + ' ' + headerActions,
  };
}

function section(id: string, title: string, body: string, hidden: boolean, count = ''): string {
  return `<section id="${id}-section" class="panel" data-section="${id}"${hidden ? ' hidden' : ''}>
<h2 class="panel-title"><button type="button" class="disclosure" aria-expanded="true" aria-controls="${id}-body">
<span class="chevron" aria-hidden="true"></span>${title}</button> <span id="${id}-count" class="count">${count}</span></h2>
<div id="${id}-body" class="panel-body">${body}</div></section>`;
}

export function goalsHtml(state: GoalState, nonce = randomBytes(16).toString('hex')): string {
  const goal = presentation(state);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${viewTheme}
${outputStyles}
.meta { margin: 0; display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.position { font-family: var(--vscode-editor-font-family), monospace; color: var(--vscode-descriptionForeground); }
.position:empty { display: none; }
.badge { display: inline-block; padding: 1px 7px; border-radius: 9px; font-size: .85em;
  color: var(--vscode-badge-foreground); background: var(--vscode-badge-background); }
.badge.fully_checked { background: var(--vscode-testing-iconPassed); color: var(--vscode-editor-background); }
.badge.unfinished { background: var(--vscode-editorWarning-foreground); color: var(--vscode-editor-background); }
.badge.error, .error .status { background: var(--vscode-errorForeground); color: var(--vscode-editor-background); }
.badge.paused { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
.actions:empty { display: none; }
.actions { margin-top: 6px; font-size: .9em; }
.panel { margin-top: 10px; }
.panel-title { font-size: 1em; margin: 0 0 4px; display: flex; align-items: center; gap: 6px; }
.disclosure { font: inherit; font-weight: 600; cursor: pointer; margin: 0; padding: 2px 0; border: 0;
  color: var(--vscode-foreground); background: none; display: inline-flex; align-items: center; gap: 4px; }
.chevron::before { content: '▾'; display: inline-block; width: 1em; color: var(--vscode-descriptionForeground); }
.panel.collapsed .chevron::before { content: '▸'; }
.panel.collapsed .panel-body { display: none; }
.count:empty { display: none; }
.count { font-size: .85em; padding: 0 6px; border-radius: 8px;
  color: var(--vscode-badge-foreground); background: var(--vscode-badge-background); }
.pin { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 6px 8px; }
.pin .panel-title { font-weight: 600; flex-wrap: wrap; }
.pin-title { font-family: var(--vscode-editor-font-family), monospace; font-weight: 400; }
.pin-actions { margin-left: auto; font-weight: 400; font-size: .9em; white-space: nowrap; }
.count.pinned { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
.stale { font-size: .9em; }
.done { margin: 4px 0; padding: 6px 10px; border-left: 4px solid var(--vscode-testing-iconPassed);
  color: var(--vscode-testing-iconPassed); font-weight: 600;
  background: color-mix(in srgb, var(--vscode-testing-iconPassed) 12%, transparent); }
.muted { color: var(--vscode-descriptionForeground); margin: 4px 0; }
#goal, .fact, .message pre, .pin pre { margin: 0; }
.fact { padding: 2px 8px; border-left: 2px solid var(--vscode-descriptionForeground); margin: 4px 0; }
.message { display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; align-items: start; margin: 6px 0;
  padding: 6px 8px; border-left: 4px solid var(--vscode-descriptionForeground);
  background: color-mix(in srgb, var(--vscode-descriptionForeground) 8%, transparent); }
.message-icon { font-weight: 700; font-size: .85em; width: 1.3em; height: 1.3em; line-height: 1.3em; text-align: center;
  border-radius: 50%; color: var(--vscode-editor-background); background: var(--vscode-descriptionForeground); margin-top: .25em; }
.message.kind-warning { border-color: var(--vscode-editorWarning-foreground);
  background: color-mix(in srgb, var(--vscode-editorWarning-foreground) 10%, transparent); }
.message.kind-warning .message-icon { background: var(--vscode-editorWarning-foreground); }
.message.kind-error { border-color: var(--vscode-errorForeground);
  background: color-mix(in srgb, var(--vscode-errorForeground) 10%, transparent); }
.message.kind-error .message-icon { background: var(--vscode-errorForeground); }
.message-actions { grid-column: 2; }
.message-actions:empty { display: none; }
#errors { margin: 6px 0 0; }
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
button.link[aria-pressed="true"] { font-weight: 600; }
button.insert { font-family: var(--vscode-editor-font-family), monospace; font-size: .95em; margin-right: 8px; }
#ask-status, .tool { color: var(--vscode-descriptionForeground); }
#transcript { max-height: 40vh; overflow-y: auto; }
#transcript p { white-space: pre-wrap; overflow-wrap: anywhere; margin: 8px 0; }
#transcript .user { font-weight: 600; }
#transcript .tool { font-family: var(--vscode-editor-font-family), monospace; font-size: .9em; }
#transcript .notice { color: var(--vscode-editorWarning-foreground); }
body.vscode-high-contrast .message, body.vscode-high-contrast-light .message, body.vscode-high-contrast .pin, body.vscode-high-contrast-light .pin,
body.vscode-high-contrast .done, body.vscode-high-contrast-light .done { background: none; outline: 1px solid var(--vscode-contrastBorder); }
</style></head><body class="${goal.phase}">
${viewHeader(goal.theory, goal.status, goal.actionsHtml, goal.position)}
<div id="pins">${goal.pinsHtml}</div>
${section('goal', 'Goal', `<p id="done" class="done" role="status"${goal.done ? '' : ' hidden'}>${doneBanner}</p>
<p id="empty" class="muted"${goal.empty ? '' : ' hidden'}>${notInProof}</p>
<pre id="goal" class="source" aria-label="Goal at cursor">${goal.goalHtml}</pre>
<div id="goal-actions" class="actions">${goal.goalActionsHtml}</div>`, false)}
${section('facts', 'Facts', `<div id="facts">${goal.factsHtml}</div>`, goal.factCount === 0, goal.factCount ? String(goal.factCount) : '')}
${section('messages', 'Messages', `<div id="messages">${goal.messagesHtml}</div>
<pre id="errors" class="errors" aria-label="Diagnostics"${goal.showErrors ? '' : ' hidden'}>${escapeText(goal.errors)}</pre>`,
    goal.messageCount === 0 && !goal.showErrors, goal.messageCount ? String(goal.messageCount) : '')}
${section('ask', 'Ask Isabelle', `<div id="ask" aria-label="Ask Isabelle">
<label for="prompt">Ask Isabelle</label>
<textarea id="prompt" placeholder="prove this" aria-describedby="ask-status"></textarea>
<button id="send">Send</button> <button id="stop" disabled>Stop</button>
<p id="ask-status" role="status">Enter sends · Shift+Enter adds a line</p>
<div id="transcript" role="log" aria-label="Ask transcript"></div></div>`, false)}
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const byId = id => document.getElementById(id);
const prompt = byId('prompt');
const send = byId('send'), stop = byId('stop');
const transcript = byId('transcript');
const saved = Object.assign({ draft: '', collapsed: {} }, vscode.getState() || {});
const save = patch => { Object.assign(saved, patch); vscode.setState(saved); };
let active = false;
prompt.value = saved.draft || '';
prompt.addEventListener('input', () => save({ draft: prompt.value }));
function submit() {
  if (active || !prompt.value.trim()) return;
  active = true; prompt.disabled = true; send.disabled = true; stop.disabled = false;
  vscode.postMessage({ type: 'ask', text: prompt.value });
  prompt.value = ''; save({ draft: '' });
}
send.addEventListener('click', submit);
stop.addEventListener('click', () => vscode.postMessage({ type: 'stop' }));
prompt.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); submit(); }
});
function setCollapsed(panel, collapsed) {
  panel.classList.toggle('collapsed', collapsed);
  const button = panel.querySelector('.disclosure');
  if (button) button.setAttribute('aria-expanded', String(!collapsed));
}
for (const panel of document.querySelectorAll('[data-section]')) setCollapsed(panel, !!saved.collapsed[panel.dataset.section]);
document.body.addEventListener('click', event => {
  const target = event.target;
  const link = target.closest('[data-link]');
  if (link) { vscode.postMessage({ type: 'open', link: link.dataset.link }); return; }
  const action = target.closest('[data-action]');
  if (action && action.dataset.action === 'insert') { vscode.postMessage({ type: 'insert', text: action.dataset.text || '' }); return; }
  if (action && action.dataset.action === 'restart') { vscode.postMessage({ type: 'restart' }); return; }
  if (action) { vscode.postMessage({ type: 'action', action: action.dataset.action, data: Object.assign({}, action.dataset) }); return; }
  const disclosure = target.closest('.disclosure');
  if (!disclosure) return;
  const panel = disclosure.closest('.panel');
  const collapsed = !panel.classList.contains('collapsed');
  setCollapsed(panel, collapsed);
  save({ collapsed: Object.assign({}, saved.collapsed, { [panel.dataset.section]: collapsed }) });
});
// The server wraps output at a character margin: report this panel's width in
// editor-font columns, like the official extension's media/main.js.
const probe = document.createElement('span');
probe.className = 'source'; probe.textContent = 'mmmmmmmmmm';
probe.setAttribute('style', 'position:absolute;visibility:hidden;white-space:pre');
function columns() {
  document.body.appendChild(probe);
  const charWidth = probe.getBoundingClientRect().width / 10;
  probe.remove();
  const style = getComputedStyle(document.body);
  // The window width, not the body's: a vertical scrollbar that comes and
  // goes with the content must not re-wrap the goal.
  const width = (window.innerWidth || document.body.clientWidth) - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  return charWidth > 0 ? Math.floor(width / charWidth) : 0;
}
let resizeTimer, lastColumns = 0;
function resize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const count = columns();
    if (count > 0 && count !== lastColumns) { lastColumns = count; vscode.postMessage({ type: 'resize', columns: count }); }
  }, 300);
}
if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(document.body);
window.addEventListener('resize', resize);
window.addEventListener('message', event => {
  const message = event.data;
  if (message.type === 'focus') { prompt.focus(); return; }
  if (message.type === 'goal') {
    const goal = message.goal;
    document.querySelector('h1').textContent = goal.theory;
    byId('position').textContent = goal.position;
    const status = document.querySelector('.status');
    status.textContent = goal.status;
    status.className = 'status badge ' + goal.badge;
    byId('header-actions').innerHTML = goal.actionsHtml;
    document.body.classList.toggle('error', goal.phase === 'error');
    document.body.classList.toggle('paused', goal.paused);
    byId('pins').innerHTML = goal.pinsHtml;
    byId('done').hidden = !goal.done;
    byId('empty').hidden = !goal.empty;
    byId('goal').innerHTML = goal.goalHtml;
    byId('goal-actions').innerHTML = goal.goalActionsHtml;
    byId('facts').innerHTML = goal.factsHtml;
    byId('facts-count').textContent = goal.factCount ? String(goal.factCount) : '';
    byId('facts-section').hidden = goal.factCount === 0;
    byId('messages').innerHTML = goal.messagesHtml;
    byId('messages-count').textContent = goal.messageCount ? String(goal.messageCount) : '';
    const errors = byId('errors');
    errors.textContent = goal.errors;
    errors.hidden = !goal.showErrors;
    byId('messages-section').hidden = goal.messageCount === 0 && !goal.showErrors;
    resize();
  }
  if (message.type === 'askState') {
    const wasActive = active;
    active = message.state.active;
    prompt.disabled = active; send.disabled = active; stop.disabled = !active;
    byId('ask-status').textContent = active ? 'Claude is working…' : 'Enter sends · Shift+Enter adds a line';
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
resize();
</script></body></html>`;
}

// Links are the server's `file:` URIs with a 1-based line fragment.
export function parseLink(link: unknown): { path: string; line: number } | undefined {
  if (typeof link !== 'string') return undefined;
  const match = /^file:\/{0,2}(\/[^#\s"'<>\\]+)(?:#(\d+))?$/.exec(link);
  if (!match) return undefined;
  return { path: decodeURIComponent(match[1]), line: Math.max(0, Number(match[2] ?? 1) - 1) };
}

export class GoalsView implements WebviewViewProvider {
  private webviews = new Set<Webview>();
  private columns = new Map<Webview, number>();
  private reported?: number;
  private focusPending = false;
  private state: GoalState = { phase: 'idle', text: '', errors: [] };
  private askState: AskState = { active: false, entries: [] };
  onAsk?: (text: string) => void;
  onStop?: () => void;
  onRestart?: () => void;
  onOpen?: (link: { path: string; line: number }) => void;
  onResize?: (columns: number) => void;
  onAction?: (action: string, data: Record<string, string>) => void;
  onInsert?: (text: string) => void;

  // One model, several webviews: the Explorer view and the panel beside the editor.
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
      else if (message?.type === 'open') { const link = parseLink(message.link); if (link) this.onOpen?.(link); }
      else if (message?.type === 'resize' && Number.isInteger(message.columns) && message.columns > 0) this.resized(webview, message.columns);
      else if (message?.type === 'insert' && typeof message.text === 'string' && message.text.trim()) this.onInsert?.(message.text);
      else if (message?.type === 'action' && typeof message.action === 'string') {
        const data = Object.fromEntries(Object.entries(message.data ?? {})
          .filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
        this.onAction?.(message.action, data);
      }
    });
    webview.html = goalsHtml(this.state);
    return { dispose: () => { messages.dispose(); this.webviews.delete(webview); this.columns.delete(webview); this.resized(); } };
  }

  // One pretty-print margin for every attached webview: the narrowest one,
  // reported only when it changes.
  private resized(webview?: Webview, columns?: number): void {
    if (webview && columns !== undefined) this.columns.set(webview, columns);
    const narrowest = Math.min(...this.columns.values());
    if (!Number.isFinite(narrowest) || narrowest === this.reported) return;
    this.reported = narrowest;
    this.onResize?.(narrowest);
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
  snapshot(): GoalState {
    return { ...this.state, errors: [...this.state.errors],
      facts: this.state.facts?.map(fact => ({ ...fact })), messages: this.state.messages?.map(message => ({ ...message })),
      pins: this.state.pins?.map(pin => ({ ...pin, position: { ...pin.position }, facts: pin.facts.map(fact => ({ ...fact })) })) };
  }
}
