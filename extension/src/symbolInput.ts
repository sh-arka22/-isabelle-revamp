import { encodeSymbols, SymbolEntry, unicodeSymbols } from './symbols';

// Symbol input that never writes Unicode into the file: completion candidates
// for `\name`, and the Lean-style rewrite of `\name` into `\<name>` on typing.
// The rewrite idea is yfprojects' abbrev.ts (see ../THIRD_PARTY_NOTICES.md).
export interface Candidate { label: string; detail: string; insert: string; filter: string; snippet?: boolean }

// Snippet syntax gives `\`, `$` and `}` a meaning; \u0007 is Isabelle's caret
// marker inside an abbreviation template (Pure/General/completion.scala).
const snippet = (text: string) => text.replace(/[\\$}]/g, '\\$&').replace(/\u0007/g, '$0');

export function completionCandidates(entries: readonly SymbolEntry[], session: [string, string][] = []): Candidate[] {
  const result: Candidate[] = [];
  for (const { name, glyph, abbrevs } of entries) {
    const escape = `\\<${name}>`;
    const shown = glyph ? `${glyph}  ` : '';
    if (name === 'open') {
      result.push({ label: '\\open', detail: '‹…›  \\<open>…\\<close>', insert: snippet('\\<open>\u0007\\<close>'),
        filter: '\\open ‹', snippet: true });
    } else result.push({ label: `\\${name}`, detail: shown + escape, insert: escape, filter: `\\${name} ${glyph ?? ''}`.trim() });
    for (const abbrev of abbrevs) {
      result.push({ label: abbrev, detail: `${shown}${escape}  abbrev`, insert: escape, filter: `\\${abbrev}` });
    }
  }
  const known = new Set(result.map(candidate => `${candidate.label}\u0000${candidate.insert}`));
  for (const [from, to] of session) {
    const insert = encodeSymbols(to.replace(/\u0007/g, ''));
    if (!from || !to || from === to || known.has(`${from}\u0000${insert}`)) continue;
    const shown = unicodeSymbols(insert);
    result.push({ label: from, detail: `${shown === insert ? '' : shown + '  '}${insert}  session abbrev`, filter: `\\${from}`,
      ...(to.includes('\u0007') ? { insert: snippet(encodeSymbols(to)), snippet: true } : { insert }) });
  }
  return result;
}

// Where the caret is: `opens` counts cartouches opened on the current line and
// not yet closed, outside strings and comments; `command` is the word before
// the outermost cartouche that is still open, on any line, when there is one.
export interface Context { comment: boolean; string: boolean; opens: number; command?: string }

const wordChar = /[A-Za-z0-9_'.]/;

export function scanContext(prefix: string): Context {
  let comment = 0, string = false, opens = 0, depth = 0, command = '', word = '', wordStart = -1;
  for (let i = 0; i < prefix.length; i++) {
    const char = prefix[i];
    if (!comment && !string) {
      if (wordChar.test(char)) { if (wordStart < 0) wordStart = i; continue; }
      if (wordStart >= 0) { if (depth === 0) word = prefix.slice(wordStart, i); wordStart = -1; }
    }
    if (comment) {
      if (prefix.startsWith('(*', i)) { comment++; i++; }
      else if (prefix.startsWith('*)', i)) { comment--; i++; }
    } else if (string) {
      if (char === '\\') i++;
      else if (char === '"') string = false;
    } else if (char === '\n') opens = 0;
    else if (prefix.startsWith('(*', i)) { comment = 1; i++; }
    else if (char === '"') string = true;
    else if (char === '‹' || prefix.startsWith('\\<open>', i)) {
      if (depth++ === 0) command = word;
      opens++;
      if (char !== '‹') i += 6;
    } else if (char === '›' || prefix.startsWith('\\<close>', i)) {
      depth = Math.max(0, depth - 1);
      opens = Math.max(0, opens - 1);
      if (char !== '›') i += 7;
    }
  }
  return { comment: comment > 0, string, opens, ...(depth > 0 ? { command } : {}) };
}

export interface Rewrite { start: number; end: number; from: string; text: string }

const nameChar = /[A-Za-z0-9_^]/;
// Controls take the next symbol as their argument, so any character ends them.
const controlNames = new Set(['^sub', '^sup', '^bold', '^bsub', '^bsup', '^esub', '^esup']);
// Commands whose cartouche holds ML or document text, where `\n` is an ML
// escape and `\in` a LaTeX macro, never a symbol.
const foreignCommands = new Set(['ML', 'ML_val', 'ML_prf', 'ML_command', 'ML_export', 'SML_file',
  'text', 'txt', 'text_raw', 'chapter', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph']);
// A cartouche shortcut starts a token: nothing, white space, a closing `>` of
// an escape, or an opening bracket precedes it. `x<<y` and `x>>2` stay.
const tokenStart = (text: string) => text === '' || /[\s>(\[{‹]$/.test(text);

// `prefix` is the document before the typed text; `typed` is one keystroke
// (a character, an auto-closed pair, or a line break with its indentation).
// Returns the replacement of the already typed source, if any:
// - `\name` + terminator → `\<name>` when name is exactly a known symbol
//   (for `\^sub`, `\^sup` and `\^bold` the argument itself is the terminator),
//   except for the one-letter bold alphabet (`\n`, `\t` are escapes), inside
//   a string within a cartouche (an ML string) and inside the cartouche of an
//   ML or document command (`\in` is LaTeX there);
// - `<<` → `\<open>` at a token start;
// - `>>` → `\<close>` when a cartouche is still open on the line, or at a
//   token start outside a quoted string (`"x >> 2"` is never converted).
// Nothing is rewritten inside comments.
export function rewriteOnType(prefix: string, typed: string, known: (name: string) => boolean): Rewrite | undefined {
  if (!(typed.length === 1 || /^\r?\n[ \t]*$/.test(typed) || (typed.length === 2 && ')]}"›'.includes(typed[1])))) return;
  const at = prefix.length;
  const name = /\\([A-Za-z0-9_^]+)$/.exec(prefix);
  if (name && (!nameChar.test(typed[0]) || controlNames.has(name[1])) && known(name[1])) {
    const context = scanContext(prefix);
    if (context.comment || name[1].length === 1) return;
    if (context.command !== undefined && (context.string || foreignCommands.has(context.command))) return;
    return { start: at - name[0].length, end: at, from: name[0], text: `\\<${name[1]}>` };
  }
  const last = prefix.at(-1), before = prefix.slice(0, -1);
  if (typed !== last || (last !== '<' && last !== '>') || /\\<[^>\s]*$/.test(before)) return;
  const context = scanContext(before);
  if (context.comment || context.string) return;
  if (last === '<' && tokenStart(before)) return { start: at - 1, end: at + 1, from: '<<', text: '\\<open>' };
  if (last === '>' && (context.opens > 0 || tokenStart(before))) return { start: at - 1, end: at + 1, from: '>>', text: '\\<close>' };
  return;
}
