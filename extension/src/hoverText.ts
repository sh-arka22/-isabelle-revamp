import { unicodeSymbols } from './symbols';

// The server answers textDocument/hover with MarkedString objects
// {language: "plaintext", value}, one per tooltip line group, keeping
// \<symbol> escapes. The language client wraps each in a fenced block before
// middleware sees it. Unwrap, decode the symbols, and keep the pretty layout.
export function hoverCode(content: string): string {
  const unfenced = content.replace(/^\s*```[^\n]*\n?/, '').replace(/\n?```\s*$/, '');
  return unicodeSymbols(unfenced);
}
