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
// not yet closed, outside strings and comments.
export interface Context { comment: boolean; string: boolean; opens: number }

export function scanContext(prefix: string): Context {
  let comment = 0, string = false, opens = 0;
  for (let i = 0; i < prefix.length; i++) {
    const char = prefix[i];
    if (comment) {
      if (prefix.startsWith('(*', i)) { comment++; i++; }
      else if (prefix.startsWith('*)', i)) { comment--; i++; }
    } else if (string) {
      if (char === '\\') i++;
      else if (char === '"') string = false;
    } else if (char === '\n') opens = 0;
    else if (prefix.startsWith('(*', i)) { comment = 1; i++; }
    else if (char === '"') string = true;
    else if (char === '‹') opens++;
    else if (char === '›') opens = Math.max(0, opens - 1);
    else if (prefix.startsWith('\\<open>', i)) { opens++; i += 6; }
    else if (prefix.startsWith('\\<close>', i)) { opens = Math.max(0, opens - 1); i += 7; }
  }
  return { comment: comment > 0, string, opens };
}

export interface Rewrite { start: number; end: number; from: string; text: string }

const nameChar = /[A-Za-z0-9_^]/;
// Controls take the next symbol as their argument, so any character ends them.
const controlNames = new Set(['^sub', '^sup', '^bold', '^bsub', '^bsup', '^esub', '^esup']);
// A cartouche shortcut starts a token: nothing, white space, a closing `>` of
// an escape, or an opening bracket precedes it. `x<<y` and `x>>2` stay.
const tokenStart = (text: string) => text === '' || /[\s>(\[{‹]$/.test(text);

// `prefix` is the document before the typed text; `typed` is one keystroke
// (a character, an auto-closed pair, or a line break with its indentation).
// Returns the replacement of the already typed source, if any:
// - `\name` + terminator → `\<name>` when name is exactly a known symbol
//   (for `\^sub`, `\^sup` and `\^bold` the argument itself is the terminator);
// - `<<` → `\<open>` at a token start;
// - `>>` → `\<close>` when a cartouche is still open on the line, or at a
//   token start outside a quoted string (`"x >> 2"` is never converted).
// Nothing is rewritten inside comments.
export function rewriteOnType(prefix: string, typed: string, known: (name: string) => boolean): Rewrite | undefined {
  if (!(typed.length === 1 || /^\r?\n[ \t]*$/.test(typed) || (typed.length === 2 && ')]}"›'.includes(typed[1])))) return;
  const at = prefix.length;
  const name = /\\([A-Za-z0-9_^]+)$/.exec(prefix);
  if (name && (!nameChar.test(typed[0]) || controlNames.has(name[1])) && known(name[1])) {
    if (scanContext(prefix).comment) return;
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
