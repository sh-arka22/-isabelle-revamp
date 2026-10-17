// Where a Sledgehammer proof goes. PIDE/sledgehammer_insert names the end of
// the query command's core text, and padding="command" means the proof is a
// command of its own: a new line unless the line is blank (the official
// client's rule), indented two columns under the statement. A `sorry` or
// `oops` directly after the command is replaced instead, since the proof
// completes what it admitted; otherwise it would follow a finished proof.
export interface Insertion { start: number; end: number; text: string }

export function proofInsertion(source: string, offset: number, proof: string): Insertion {
  const indentOf = (at: number) => /^[ \t]*/.exec(source.slice(source.lastIndexOf('\n', at - 1) + 1))![0];
  const indented = (indent: string) => proof.split('\n').join('\n' + indent);
  const admitted = /^\s*(sorry|oops)(?![\w'])/.exec(source.slice(offset));
  if (admitted) {
    const start = offset + admitted[0].length - admitted[1].length;
    return { start, end: start + admitted[1].length, text: indented(indentOf(start)) };
  }
  const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = source.indexOf('\n', offset);
  const line = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd);
  const indent = indentOf(offset);
  if (!line.trim()) return { start: offset, end: offset, text: indented(indent) };
  return { start: offset, end: offset, text: '\n' + indent + '  ' + indented(indent + '  ') };
}
