import { isarTokens } from './isarSteps';

// Outer-syntax "…" arguments become \<open>…\<close>. Comments and cartouches
// are opaque to the lexer, so their quotes are untouched; the theory header
// (`theory … begin`, imports and keywords) keeps its quotes too.
export interface Conversion { start: number; end: number; text: string }

// Isabelle's quoted-content rules (Pure/General/scan.scala): \" \\ and \ddd
// are escapes; a symbol `\<name>` is one symbol and stays as it is.
function unescape(body: string): string {
  return body.replace(/\\(?:(")|(\\)|(\d{3})|(<[^>]*>))/g, (whole, quote, backslash, digits, escape) =>
    quote ? '"' : backslash ? '\\' : digits ? String.fromCharCode(parseInt(digits, 10)) : escape ? whole : whole);
}

function balanced(text: string): boolean {
  let depth = 0;
  for (const match of text.matchAll(/‹|›|\\<open>|\\<close>/g)) {
    depth += match[0] === '‹' || match[0] === '\\<open>' ? 1 : -1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

export function cartoucheConversions(source: string, start = 0, end = source.length): Conversion[] {
  const tokens = isarTokens(source);
  let header = -1;
  if (tokens[0]?.text === 'theory') {
    const begin = tokens.find(token => !token.quoted && token.text === 'begin');
    header = begin ? begin.end : source.length;
  }
  const result: Conversion[] = [];
  for (const token of tokens) {
    if (!token.quoted || token.start < header || token.start < start || token.end > end) continue;
    if (!token.text.startsWith('"') || token.text.length < 2 || !token.text.endsWith('"')) continue;
    const body = unescape(token.text.slice(1, -1));
    if (!balanced(body)) continue;
    result.push({ start: token.start, end: token.end, text: `\\<open>${body}\\<close>` });
  }
  return result;
}

export function convertQuotesToCartouches(source: string, start?: number, end?: number): string {
  let result = '';
  let at = 0;
  for (const conversion of cartoucheConversions(source, start, end)) {
    result += source.slice(at, conversion.start) + conversion.text;
    at = conversion.end;
  }
  return result + source.slice(at);
}
