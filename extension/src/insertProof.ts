import { decodeEntities } from './outputText';
import { tokenize } from './outputHtml';
import { asciiSymbols } from './symbols';

// Isabelle marks a suggested proof as an active "sendback" area (try0's
// `Try this: by simp`, Sledgehammer's `by (metis …)`). jEdit's Active.action
// inserts the text after the command on a new line and re-indents it
// (Isabelle.edit_command with padding_command). Here the caret line stands
// for the command: a `sorry`/`oops` at its end, or alone on the next line,
// is the placeholder the suggestion replaces; otherwise the text goes on a
// new line indented two deeper, as Isabelle indents a `by` under its goal.

// The sendback texts of sanitised output (see outputHtml.ts), as displayed.
export function sendbackTexts(html: string): string[] {
  const texts: string[] = [];
  let depth = 0;
  let current = '';
  for (const token of tokenize(html)) {
    if (depth === 0) {
      if (token.kind === 'open' && !token.selfClosing
        && (token.attributes.class ?? '').split(/\s+/).includes('sendback')) { depth = 1; current = ''; }
      continue;
    }
    if (token.kind === 'text') current += decodeEntities(token.value);
    else if (token.kind === 'open') {
      if (token.name === 'sup' || token.name === 'sub') current += token.name === 'sup' ? '⇧' : '⇩';
      if (!token.selfClosing) depth++;
    } else if (--depth === 0) texts.push(current);
  }
  if (depth > 0 && current.trim()) texts.push(current);
  return texts;
}

export interface Lines { lineCount: number; lineAt(line: number): { text: string } }
export interface ProofEdit {
  startLine: number; startCharacter: number; endLine: number; endCharacter: number;
  text: string;
}

const placeholder = /(?<![\p{L}\p{N}_'.])(sorry|oops)[ \t]*$/u;

// The edit that puts `text` in for the command on `line`; the theory keeps
// ASCII symbols, so Unicode in the suggestion is encoded back.
export function proofEdit(document: Lines, line: number, text: string): ProofEdit | undefined {
  if (line < 0 || line >= document.lineCount) return undefined;
  const proof = asciiSymbols(text.trim());
  if (!proof) return undefined;
  const current = document.lineAt(line).text;
  const indentation = /^[ \t]*/.exec(current)![0];
  const indented = (indent: string) => proof.split('\n').join('\n' + indent);
  const atEnd = placeholder.exec(current);
  if (atEnd) {
    return { startLine: line, startCharacter: atEnd.index, endLine: line, endCharacter: current.length,
      text: indented(indentation) };
  }
  let next = line + 1;
  while (next < document.lineCount && !document.lineAt(next).text.trim()) next++;
  const following = next < document.lineCount ? document.lineAt(next).text : '';
  const alone = /^([ \t]*)(sorry|oops)[ \t]*$/.exec(following);
  if (alone) {
    return { startLine: next, startCharacter: alone[1].length, endLine: next, endCharacter: following.length,
      text: indented(alone[1]) };
  }
  const indent = indentation + '  ';
  return { startLine: line, startCharacter: current.length, endLine: line, endCharacter: current.length,
    text: '\n' + indent + indented(indent) };
}
