// Which goal commands are proved, admitted, broken or still being checked,
// from current-version facts only. No vscode import: node tests feed it.
export type Span = [number, number, number, number];
export type TheoremState = 'proved' | 'unfinished' | 'error' | 'checking';
export interface TheoremItem { name?: string; command: string; line: number; endLine: number; oops?: boolean }
export interface StatusFacts { known: boolean; errors: Span[]; sorries: Span[]; busy: Span[] }
export interface TheoremStatus { name: string; line: number; status: TheoremState }

const startsInside = (item: TheoremItem, span: Span) => span[0] >= item.line && span[0] <= item.endLine;
// A busy span that stops at column 0 of the item's first line lies before it.
const overlaps = (item: TheoremItem, span: Span) => span[0] <= item.endLine
  && (span[0] >= item.line || span[2] > item.line || (span[2] === item.line && span[3] > 0));

export function classifyTheorems(items: TheoremItem[], facts: StatusFacts): TheoremStatus[] {
  return items.map(item => {
    const status: TheoremState = !facts.known ? 'checking'
      : facts.errors.some(span => startsInside(item, span)) ? 'error'
      : item.oops || facts.sorries.some(span => startsInside(item, span)) ? 'unfinished'
      : facts.busy.some(span => overlaps(item, span)) ? 'checking' : 'proved';
    return { name: item.name ?? item.command, line: item.line, status };
  });
}

export const statusColours: Record<TheoremState, string> =
  { proved: '#2a9d8f', unfinished: '#e0a800', error: '#d7263d', checking: '#8a8a8a' };
const shapes: Record<TheoremState, string> = {
  proved: '<path d="M1.5 8.5l3 3 5-6M6.5 8.5l3 3 5-6" fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  unfinished: '<path d="M8 2.2 14.3 13.6H1.7z" fill="{c}"/><path d="M8 6.2v3.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="12" r="1" fill="#fff"/>',
  error: '<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round"/>',
  checking: '<circle cx="8" cy="8" r="5" fill="none" stroke="{c}" stroke-width="1.6" stroke-dasharray="2 2.3"/>',
};

// A gutter icon as a data: URI, so the extension ships no image files.
export function statusIcon(status: TheoremState): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">${
    shapes[status].replaceAll('{c}', statusColours[status])}</svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}
