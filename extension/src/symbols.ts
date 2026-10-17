import codes from './symbolCodes.json';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

// One line of etc/symbols: `\<name>  code: 0x...  group: ...  abbrev: ...`.
export interface SymbolEntry { name: string; glyph?: string; abbrevs: string[]; group?: string }

// Bundled fallback; the installed distribution replaces this at startup.
let symbols: Readonly<Record<string, string>> = codes;
let entries: readonly SymbolEntry[] = Object.entries(codes).map(([name, glyph]) => ({ name, glyph, abbrevs: [] }));
const glyphNames = (table: Readonly<Record<string, string>>) => {
  const result = new Map<string, string>();
  for (const [name, glyph] of Object.entries(table)) if (!result.has(glyph)) result.set(glyph, name);
  return result;
};
let names = glyphNames(symbols);
const superscripts: Readonly<Record<string, string>> = Object.fromEntries(
  [...'0123456789+-=()abcdefghijklmnopqrstuvwxyz'].map((char, i) =>
    [char, [...'⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖ?ʳˢᵗᵘᵛʷˣʸᶻ'][i]])
    .filter(([, value]) => value !== '?'));
const subscripts: Readonly<Record<string, string>> = Object.fromEntries(
  [...'0123456789+-=()aehijklmnoprstuvx'].map((char, i) => [char, [...'₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ'][i]]));

export function parseSymbolEntries(source: string): SymbolEntry[] {
  const result: SymbolEntry[] = [];
  for (const line of source.split('\n')) {
    const match = /^\\<([^>\s]+)>(.*)$/.exec(line);
    if (!match) continue;
    const entry: SymbolEntry = { name: match[1], abbrevs: [] };
    for (const [, key, value] of match[2].matchAll(/(\w+):\s+(\S+)/g)) {
      if (key === 'code') {
        const code = parseInt(value, 16);
        if (code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) entry.glyph = String.fromCodePoint(code);
      } else if (key === 'abbrev') entry.abbrevs.push(value);
      else if (key === 'group') entry.group ??= value;
    }
    result.push(entry);
  }
  return result;
}

function glyphTable(list: readonly SymbolEntry[]): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  for (const entry of list) if (entry.glyph) result[entry.name] = entry.glyph;
  return result;
}

export function parseSymbolTable(source: string): Record<string, string> {
  return glyphTable(parseSymbolEntries(source));
}

export async function loadSymbols(executable: string): Promise<{ path: string; count: number }> {
  const { stdout } = await promisify(execFile)(executable, ['getenv', '-b', 'ISABELLE_HOME'], { timeout: 15000 });
  const path = join(stdout.trim(), 'etc/symbols');
  const loaded = parseSymbolEntries(await readFile(path, 'utf8'));
  const table = glyphTable(loaded);
  if (!Object.keys(table).length) throw new Error('No Unicode assignments in ' + path);
  symbols = table;
  entries = loaded;
  names = glyphNames(table);
  return { path, count: Object.keys(table).length };
}

// The inverse of unicodeSymbols for one code point at a time: what the server
// sends decoded (session abbreviations) must reach the file as ASCII.
export function encodeSymbols(text: string): string {
  return [...text].map(char => { const name = names.get(char); return name ? `\\<${name}>` : char; }).join('');
}

export function symbolEntries(): readonly SymbolEntry[] { return entries; }
export function symbolGlyph(name: string): string | undefined {
  return Object.hasOwn(symbols, name) ? symbols[name] : undefined;
}
export function isSymbolName(name: string): boolean { return entries.some(entry => entry.name === name); }

export function unicodeSymbols(text: string): string {
  return text.replace(/\\<(\^?[A-Za-z][A-Za-z0-9_]*)>/g,
    (encoded, name: string) => Object.hasOwn(symbols, name) ? symbols[name] : encoded)
    .replace(/[⇧⇩](.)/gu, (encoded, char: string) =>
      (encoded[0] === '⇧' ? superscripts : subscripts)[char] ?? encoded)
    .replace(/\^([A-Za-z0-9])(?![\p{L}\p{N}_'])/gu, (encoded, char: string) => superscripts[char] ?? encoded)
    .replace(/∑(?=[\p{L}\\])/gu, '∑ ');
}

// A display item over untouched source. Without `keep`, the source range is
// hidden and `text` shown in its place, raised, lowered or bold for `style`.
// With `keep`, the source text stays visible and only `style` is applied.
export type ScriptStyle = 'sup' | 'sub' | 'bold';
export interface SymbolReplacement { start: number; end: number; text: string; style?: ScriptStyle; keep?: boolean }

const controls: Readonly<Record<string, ScriptStyle>> = { '^sup': 'sup', '^sub': 'sub', '^bold': 'bold' };
const blocks: Readonly<Record<string, { close: string; style: ScriptStyle }>> = {
  '^bsup': { close: '\\<^esup>', style: 'sup' }, '^bsub': { close: '\\<^esub>', style: 'sub' },
};

// A control symbol applies to the next symbol: one character or one `\<name>`,
// never white space or another control. The range rules follow the official
// script_decorations.ts (see ../THIRD_PARTY_NOTICES.md).
function argumentAt(source: string, at: number): { end: number; glyph?: string; text: string } | undefined {
  const escape = /^\\<([^>\n]+)>/.exec(source.slice(at, at + 64));
  if (escape) {
    if (escape[1].startsWith('^')) return undefined;
    return { end: at + escape[0].length, glyph: symbolGlyph(escape[1]), text: escape[0] };
  }
  const code = source.codePointAt(at);
  if (code === undefined) return undefined;
  const text = String.fromCodePoint(code);
  if (/\s/u.test(text) || text === '\\') return undefined;
  return { end: at + text.length, text };
}

function blockClose(source: string, from: number, open: string, close: string): number {
  let depth = 1;
  for (let i = from; i < source.length; i++) {
    if (source.startsWith(open, i)) { depth++; i += open.length - 1; }
    else if (source.startsWith(close, i) && --depth === 0) return i;
  }
  return -1;
}

export function symbolReplacements(source: string): SymbolReplacement[] {
  const result: SymbolReplacement[] = [];
  const closers = new Set<number>();
  const pattern = /\\<([^>\n]+)>|\^([A-Za-z0-9])(?![\p{L}\p{N}_'])/gu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const start = match.index, end = start + match[0].length;
    const name = match[1];
    if (name === undefined) {
      const glyph = superscripts[match[2]];
      if (glyph) result.push({ start, end, text: glyph });
      continue;
    }
    if (closers.has(start)) { result.push({ start, end, text: '' }); continue; }
    const block = blocks[name];
    if (block) {
      const close = blockClose(source, end, match[0], block.close);
      if (close >= 0) {
        result.push({ start, end, text: '' });
        if (close > end) result.push({ start: end, end: close, text: source.slice(end, close), style: block.style, keep: true });
        closers.add(close);
        continue;
      }
    }
    const style = controls[name];
    const argument = style ? argumentAt(source, end) : undefined;
    if (style && argument) {
      const scripts = style === 'sup' ? superscripts : style === 'sub' ? subscripts : {};
      const glyph = argument.glyph ?? scripts[argument.text];
      if (glyph) result.push({ start, end: argument.end, text: glyph, ...(argument.glyph ? { style } : {}) });
      else {
        result.push({ start, end, text: '' });
        result.push({ start: end, end: argument.end, text: argument.text, style, keep: true });
      }
      pattern.lastIndex = argument.end;
      continue;
    }
    const glyph = symbolGlyph(name);
    if (glyph) result.push({ start, end, text: glyph });
  }
  return result;
}
