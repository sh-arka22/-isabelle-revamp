import { decodeEntities, escapeText, outputText } from './outputText';
import { unicodeSymbols } from './symbols';

// Isabelle's vscode_server answers with Browser_Info.make_html output: a
// `<pre class="source">` of nested spans whose classes are Rendering.Color
// names or markup names, `<a href="file:/…#line">` entity links, and literal
// control symbols (⇧2). Nothing from the server reaches a webview unparsed:
// this tokenizer rebuilds a fixed element set, keeps only allow-listed class
// names, and escapes every text run.

export interface RenderedOutput { text: string; html: string }
export interface OutputLine { text: string; html: string }
export type MessageKind = 'info' | 'warning' | 'error' | 'state';
export interface OutputMessage { kind: MessageKind; text: string; html: string }

export type Token =
  | { kind: 'text'; value: string }
  | { kind: 'open'; name: string; attributes: Record<string, string>; selfClosing: boolean }
  | { kind: 'close'; name: string };

const elements = new Set(['span', 'a', 'br', 'pre', 'sup', 'sub', 'b', 'i']);

// Rendering.Color names (text, foreground, background, message underline and
// background), the extra classes of etc/isabelle.css, and the active area.
export const allowedClasses = new Set([
  'main', 'keyword1', 'keyword2', 'keyword3', 'quasi_keyword', 'improper', 'operator',
  'tfree', 'tvar', 'free', 'skolem', 'bound', 'var', 'inner_numeral', 'inner_quoted',
  'inner_cartouche', 'inner_comment', 'comment1', 'comment2', 'comment3', 'dynamic',
  'class_parameter', 'antiquote', 'raw_text', 'plain_text',
  'quoted', 'antiquoted', 'bad', 'intensify',
  'writeln', 'information', 'warning', 'legacy', 'error',
  'writeln_message', 'information_message', 'tracing_message', 'warning_message',
  'legacy_message', 'error_message', 'state_message',
  'source', 'name', 'filename', 'control', 'binding', 'tclass', 'tconst', 'const', 'numeral',
  'literal', 'delimiter', 'bold', 'command', 'keyword', 'string', 'alt_string', 'verbatim',
  'cartouche', 'comment', 'entity_def', 'entity_ref', 'sendback',
]);

export const messageKinds: Record<string, MessageKind> = {
  writeln_message: 'info', information_message: 'info', tracing_message: 'info',
  warning_message: 'warning', legacy_message: 'warning', error_message: 'error',
  state_message: 'state',
};

// Observed: make_ref emits `file:` + absolute platform path + `#` + 1-based line.
export function safeLink(href: string): string | undefined {
  return /^file:\/{0,2}\/[^\s"'<>#\\]+(#\d+)?$/.test(href) ? href : undefined;
}

export function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let text = '';
  let i = 0;
  const flush = () => { if (text) { tokens.push({ kind: 'text', value: text }); text = ''; } };
  while (i < html.length) {
    if (html[i] !== '<') { text += html[i++]; continue; }
    const tag = readTag(html, i);
    if (!tag) { text += '<'; i++; continue; }
    flush();
    if (tag.token) tokens.push(tag.token);
    i = tag.end;
  }
  flush();
  return tokens;
}

function readTag(html: string, start: number): { token?: Token; end: number } | undefined {
  if (html.startsWith('<!--', start)) {
    const end = html.indexOf('-->', start + 4);
    return end < 0 ? undefined : { end: end + 3 };
  }
  if (html[start + 1] === '!' || html[start + 1] === '?') {
    const end = html.indexOf('>', start);
    return end < 0 ? undefined : { end: end + 1 };
  }
  let i = start + 1;
  const closing = html[i] === '/';
  if (closing) i++;
  const name = /^[A-Za-z][A-Za-z0-9]*/.exec(html.slice(i, i + 32))?.[0];
  if (!name) return undefined;
  i += name.length;
  const attributes: Record<string, string> = {};
  let selfClosing = false;
  for (;;) {
    while (i < html.length && /\s/.test(html[i])) i++;
    if (i >= html.length) return undefined;
    if (html[i] === '>') { i++; break; }
    if (html[i] === '/') { selfClosing = true; i++; continue; }
    const key = /^[^\s=/>"']+/.exec(html.slice(i, i + 64))?.[0];
    if (!key) { i++; continue; }
    i += key.length;
    while (i < html.length && /\s/.test(html[i])) i++;
    let value = '';
    if (html[i] === '=') {
      i++;
      while (i < html.length && /\s/.test(html[i])) i++;
      const quote = html[i];
      if (quote === '"' || quote === "'") {
        const end = html.indexOf(quote, i + 1);
        if (end < 0) return undefined;
        value = html.slice(i + 1, end);
        i = end + 1;
      } else {
        const match = /^[^\s>]*/.exec(html.slice(i))!;
        value = match[0];
        i += value.length;
      }
    }
    if (!closing && !Object.hasOwn(attributes, key.toLowerCase())) attributes[key.toLowerCase()] = value;
  }
  const lower = name.toLowerCase();
  return { token: closing ? { kind: 'close', name: lower } : { kind: 'open', name: lower, attributes, selfClosing }, end: i };
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;');
}

// A control symbol followed by a single glyph with no Unicode form.
function scripts(escaped: string): string {
  return escaped.replace(/([⇧⇩])(\S)/gu, (_, control: string, char: string) =>
    control === '⇧' ? `<sup>${char}</sup>` : `<sub>${char}</sub>`);
}

interface Open { source: string; tag: string; opener: string }

class Renderer {
  readonly lines: OutputLine[] = [];
  private stack: Open[] = [];
  private html = '';
  private text = '';
  constructor(private byLine: boolean) {}

  private newline(markup: string): void {
    if (!this.byLine) { this.html += markup; this.text += '\n'; return; }
    for (let i = this.stack.length - 1; i >= 0; i--) this.html += this.closer(this.stack[i].tag);
    this.lines.push({ text: this.text, html: this.html });
    this.html = this.stack.map(open => open.opener).join('');
    this.text = '';
  }

  addText(raw: string): void {
    const value = unicodeSymbols(decodeEntities(raw));
    const parts = value.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) this.newline('\n');
      this.text += part;
      this.html += scripts(escapeText(part));
    });
  }

  open(token: Extract<Token, { kind: 'open' }>): void {
    if (!elements.has(token.name)) return;
    if (token.name === 'br') { this.newline('<br>'); return; }
    if (token.name === 'pre' && this.byLine) return;
    const classes = (token.attributes.class ?? '').split(/\s+/).filter(name => allowedClasses.has(name));
    let tag = token.name;
    if (token.name === 'a') {
      tag = 'span';
      const link = safeLink(token.attributes.href ?? '');
      if (link) classes.push('isa-link');
      if (!classes.length) { this.push(token, '', ''); return; }
      const attributes = (classes.length ? ` class="${classes.join(' ')}"` : '')
        + (link ? ` data-link="${escapeAttribute(link)}"` : '');
      this.push(token, tag, `<span${attributes}>`);
      return;
    }
    // A span that lost its classes carries nothing: keep its text only.
    if (token.name === 'span' && !classes.length) { this.push(token, '', ''); return; }
    this.push(token, tag, `<${tag}${classes.length ? ` class="${classes.join(' ')}"` : ''}>`);
  }

  private push(token: Extract<Token, { kind: 'open' }>, tag: string, opener: string): void {
    this.html += opener;
    if (token.selfClosing) this.html += this.closer(tag);
    else this.stack.push({ source: token.name, tag, opener });
  }

  private closer(tag: string): string { return tag ? `</${tag}>` : ''; }

  close(name: string): void {
    if (!elements.has(name) || name === 'br' || (name === 'pre' && this.byLine)) return;
    let index = this.stack.length - 1;
    while (index >= 0 && this.stack[index].source !== name) index--;
    if (index < 0) return;
    while (this.stack.length > index) this.html += this.closer(this.stack.pop()!.tag);
  }

  finish(): string {
    while (this.stack.length) this.html += this.closer(this.stack.pop()!.tag);
    if (this.byLine) this.lines.push({ text: this.text, html: this.html });
    return this.html;
  }
}

export function renderTokens(tokens: Token[], byLine: false): string;
export function renderTokens(tokens: Token[], byLine: true): OutputLine[];
export function renderTokens(tokens: Token[], byLine: boolean): string | OutputLine[] {
  const renderer = new Renderer(byLine);
  for (const token of tokens) {
    if (token.kind === 'text') renderer.addText(token.value);
    else if (token.kind === 'open') renderer.open(token);
    else renderer.close(token.name);
  }
  const html = renderer.finish();
  return byLine ? renderer.lines : html;
}

export function renderOutput(html: string): RenderedOutput {
  return { text: outputText(html), html: renderTokens(tokenize(html), false) };
}

// One entry per line; spans are closed and reopened at line ends, so each
// line's html stands alone. The outer `pre` is dropped.
export function renderLines(html: string): OutputLine[] {
  return renderTokens(tokenize(html), true);
}

// Each message is one `<span class="…_message">` under the server's `pre`.
// Pretty.separate puts a separator span and a newline between messages.
export function splitMessages(html: string): OutputMessage[] {
  const tokens = tokenize(html);
  const messages: OutputMessage[] = [];
  let current: { kind: MessageKind; tokens: Token[]; depth: number } | undefined;
  for (const token of tokens) {
    if (current) {
      if (token.kind === 'open' && !token.selfClosing) current.depth++;
      if (token.kind === 'close') current.depth--;
      if (current.depth === 0) {
        const lines = renderTokens(current.tokens, true);
        messages.push({ kind: current.kind, text: lines.map(line => line.text).join('\n'),
          html: lines.map(line => line.html).join('\n') });
        current = undefined;
      } else current.tokens.push(token);
      continue;
    }
    if (token.kind !== 'open' || token.selfClosing) continue;
    const kind = (token.attributes.class ?? '').split(/\s+/).map(name => messageKinds[name]).find(Boolean);
    if (kind) current = { kind, tokens: [], depth: 1 };
  }
  if (!messages.length) {
    const rendered = renderOutput(html);
    if (rendered.text.trim()) messages.push({ kind: 'info', ...rendered });
  }
  return messages;
}
