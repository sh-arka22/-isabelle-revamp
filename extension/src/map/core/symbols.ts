// Display conversion of Isabelle's ASCII symbol notation for the ProofMap
// surfaces (labels, tooltips, side panel). Pure: no vscode or node imports,
// so the same code runs in the webview bundle. The table is the extension's
// bundled copy of etc/symbols (src/symbolCodes.json); the host may pass the
// installed table instead. Unknown names render as ⟨name⟩, so no raw \<…>
// ever reaches a surface. Theory files on disk are never touched.
import codes from '../../symbolCodes.json';

export type SymbolTable = Readonly<Record<string, string>>;
export const bundledSymbols: SymbolTable = codes;

const superscripts: Readonly<Record<string, string>> = Object.fromEntries(
  [...'0123456789+-=()abcdefghijklmnoprstuvwxyz'].map((char, i) =>
    [char, [...'⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ'][i]]));
const subscripts: Readonly<Record<string, string>> = Object.fromEntries(
  [...'0123456789+-=()aehijklmnoprstuvx'].map((char, i) => [char, [...'₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ'][i]]));

/** Convert `\<name>` tokens and script controls; the result never contains `\<`. */
export function mapSymbols(text: string, table: SymbolTable = bundledSymbols): string {
  const converted = text.replace(/\\<(\^?[A-Za-z][A-Za-z0-9_']*)>/g, (encoded, name: string) =>
    Object.hasOwn(table, name) ? table[name] : `⟨${name}⟩`)
    .replace(/[⇧⇩](.)/gu, (encoded, char: string) =>
      (encoded[0] === '⇧' ? superscripts : subscripts)[char] ?? encoded)
    .replace(/\^([A-Za-z0-9])(?![\p{L}\p{N}_'])/gu, (encoded, char: string) => superscripts[char] ?? encoded);
  // Anything left that still looks like a symbol token (odd names, unterminated) is made visible, never raw.
  return converted.replace(/\\<([^>]*)>?/g, (_, body: string) => `⟨${body}⟩`);
}

/** True when text still carries Isabelle's ASCII symbol syntax. */
export function hasRawSymbols(text: string): boolean { return text.includes('\\<'); }
