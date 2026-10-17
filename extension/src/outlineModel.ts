import { isarTokens, Token } from './isarSteps';

// A lexical outline, not an Isar parser. A command counts only at the start of
// a line, and isarTokens skips comments and makes strings and cartouches
// opaque, so prose inside text‹…› never creates an entry. The structure
// (headings nest, begin…end blocks contain, items fold to the next item)
// follows yfprojects' outline.ts (BSD-3; see ../THIRD_PARTY_NOTICES.md).
export type OutlineKind = 'heading' | 'goal' | 'definition' | 'function' | 'type' | 'scope' | 'facts';
export interface OutlineItem {
  command: string; kind: OutlineKind; name?: string; detail: string;
  line: number; endLine: number; nameStart?: number; nameEnd?: number;
  block?: boolean; oops?: boolean; children: OutlineItem[];
}
export interface Outline { items: OutlineItem[]; folds: [number, number][] }

export const headings = ['chapter', 'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];
export const kinds: Readonly<Record<string, OutlineKind>> = {
  theorem: 'goal', lemma: 'goal', corollary: 'goal', proposition: 'goal', schematic_goal: 'goal',
  definition: 'definition', abbreviation: 'definition', consts: 'definition',
  fun: 'function', function: 'function', primrec: 'function', inductive: 'function',
  datatype: 'type', codatatype: 'type', typedef: 'type', type_synonym: 'type', record: 'type',
  locale: 'scope', class: 'scope', context: 'scope', instantiation: 'scope', interpretation: 'scope',
  bundle: 'scope', experiment: 'scope', notepad: 'scope', overloading: 'scope',
  named_theorems: 'facts',
};
// Words that can follow a command but never name it.
const notNames = new Set(['assumes', 'shows', 'fixes', 'obtains', 'where', 'and', 'for', 'if', 'is', 'imports',
  'begin', 'notes', 'defines', 'constrains', 'in', 'includes', 'unfolding', 'using', 'open']);

interface Word extends Token { line: number; column: number; atLineStart: boolean }

function words(source: string): Word[] {
  let line = 0, offset = 0;
  return isarTokens(source).map(token => {
    while (offset < token.start) { if (source[offset] === '\n') line++; offset++; }
    const lineStart = source.lastIndexOf('\n', token.start - 1) + 1;
    return { ...token, line, column: token.start - lineStart, atLineStart: !/\S/.test(source.slice(lineStart, token.start)) };
  });
}

// The declared name after a command, with its column in the rest of the line.
export function declaredName(rest: string): { name: string; column: number } | undefined {
  let offset = 0;
  // Skip a target "(in loc)" and type parameters: datatype 'a tree, ('a, 'b) either.
  for (let match; (match = /^\s*(?:\([^)]*\)|'[\p{L}_][\p{L}\p{N}_']*)/u.exec(rest.slice(offset)));) offset += match[0].length;
  const match = /^(\s*)([\p{L}_][\p{L}\p{N}_'.]*)/u.exec(rest.slice(offset));
  if (!match || notNames.has(match[2])) return undefined;
  return { name: match[2], column: offset + match[1].length };
}

function quotedText(token?: Word): string | undefined {
  if (!token?.quoted) return undefined;
  const text = token.text.startsWith('"') ? token.text.slice(1, token.text.length > 1 && token.text.endsWith('"') ? -1 : undefined)
    : token.text.startsWith('‹') ? token.text.slice(1, token.text.endsWith('›') ? -1 : undefined)
    : token.text.slice(7, token.text.endsWith('\\<close>') ? -8 : undefined);
  return text.trim().split('\n')[0].trim().replace(/\s+/g, ' ') || undefined;
}

// locale and class open a block only when begin follows before the next
// command: a word in column 0, or a known command on an indented line.
function opensBlock(tokens: Word[], index: number): boolean {
  for (const token of tokens.slice(index + 1)) {
    if (token.quoted) continue;
    if (token.text === 'begin') return true;
    if (token.atLineStart && (token.column === 0 && /^[\p{L}_]/u.test(token.text) || isCommand(token.text))) return false;
  }
  return false;
}
const isCommand = (word: string) => word === 'end' || headings.includes(word) || Object.hasOwn(kinds, word);

export function outline(source: string): Outline {
  const lines = source.split('\n');
  const tokens = words(source);
  const items: OutlineItem[] = [];
  const open: OutlineItem[] = [];
  const folds: [number, number][] = [];
  const proofs: number[] = [];
  let leaf: OutlineItem | undefined;
  const lastContent = (from: number, to: number) => {
    let end = Math.min(to, lines.length - 1);
    while (end > from && !/\S/.test(lines[end])) end--;
    return Math.max(end, from);
  };
  const close = (item: OutlineItem, before: number) => { item.endLine = lastContent(item.line, before - 1); };
  const closeLeaf = (line: number) => { if (leaf) { close(leaf, line); leaf = undefined; } };
  const attach = (item: OutlineItem) => { (open.at(-1)?.children ?? items).push(item); };

  for (const [index, token] of tokens.entries()) {
    if (token.quoted) {
      const endLine = token.line + (token.text.match(/\n/g)?.length ?? 0);
      if (endLine > token.line) folds.push([token.line, endLine]);
      continue;
    }
    const word = token.text;
    if (word === 'proof') { proofs.push(token.line); continue; }
    if (word === 'qed') {
      const start = proofs.pop();
      if (start !== undefined && token.line - 1 > start) folds.push([start, token.line - 1]);
      continue;
    }
    if (!token.atLineStart) continue;
    if (word === 'end') {
      closeLeaf(token.line);
      // Closes the innermost block with the headings inside it; the theory's own end closes everything.
      const block = open.map(item => item.block === true).lastIndexOf(true);
      const closed = open.splice(Math.max(block, 0));
      for (const item of closed) close(item, token.line);
      if (block >= 0) closed[0].endLine = token.line;
      continue;
    }
    const heading = headings.indexOf(word);
    if (heading >= 0) {
      closeLeaf(token.line);
      // A heading closes open headings at its level or deeper, never a block.
      while (open.length && !open.at(-1)!.block && headings.indexOf(open.at(-1)!.command) >= heading) close(open.pop()!, token.line);
      const item: OutlineItem = { command: word, kind: 'heading', name: quotedText(tokens[index + 1]), detail: word,
        line: token.line, endLine: token.line, children: [] };
      attach(item);
      open.push(item);
      continue;
    }
    const kind = kinds[word];
    if (!kind) continue;
    closeLeaf(token.line);
    const rest = lines[token.line].slice(token.column + word.length);
    const named = declaredName(rest);
    const item: OutlineItem = { command: word, kind, name: named?.name, line: token.line, endLine: token.line, children: [],
      detail: named ? word : rest.trim().replace(/\s+/g, ' ').slice(0, 60) };
    if (named) {
      item.nameStart = token.column + word.length + named.column;
      item.nameEnd = item.nameStart + named.name.length;
    }
    attach(item);
    if (kind === 'scope' && opensBlock(tokens, index)) { item.block = true; open.push(item); }
    else leaf = item;
  }
  closeLeaf(lines.length);
  for (const item of open) close(item, lines.length);

  const oopsLines = tokens.filter(token => !token.quoted && token.text === 'oops').map(token => token.line);
  const walk = (list: OutlineItem[]) => {
    for (const item of list) {
      if (item.kind === 'goal' && oopsLines.some(line => line >= item.line && line <= item.endLine)) item.oops = true;
      if (item.endLine > item.line) folds.push([item.line, item.endLine]);
      walk(item.children);
    }
  };
  walk(items);
  folds.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  return { items, folds };
}

export function goalItems(outline: Outline): OutlineItem[] {
  const result: OutlineItem[] = [];
  const walk = (list: OutlineItem[]) => {
    for (const item of list) { if (item.kind === 'goal') result.push(item); walk(item.children); }
  };
  walk(outline.items);
  return result;
}
