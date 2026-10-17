import { OutputLine, renderLines, renderOutput } from './outputHtml';
import { outputText } from './outputText';

// print_state writes chained facts as an indented block before the goal:
//   proof (state)        proof (prove)          proof (chain)
//   this:                using this:            picking this:
//     2 dvd 1                real m = sqrt 2 * real n
//                            (sqrt 2)⇧2 = 2
//   goal (1 subgoal):    goal (1 subgoal):
//    1. False             1. False
// Several facts carry a bullet and share one deeper indentation; a line
// indented further than the first fact continues the fact above it.
const headers = new Set(['this:', 'using this:', 'picking this:', 'calculation:']);

export interface StateParts<T> { facts: T[]; goal: T[] }

const indentation = (line: string) => /^ */.exec(line)![0].length;

// Indexes of the fact lines, grouped per fact, and of every other line.
export function classifyState(lines: string[]): StateParts<number[]> {
  const header = lines.findIndex(line => headers.has(line.trim()));
  const facts: number[][] = [];
  let end = header;
  if (header >= 0) {
    let base = -1;
    for (end = header + 1; end < lines.length; end++) {
      const line = lines[end];
      if (!line.trim() || indentation(line) === 0) break;
      if (base < 0) base = indentation(line);
      if (indentation(line) <= base || !facts.length) facts.push([end]);
      else facts[facts.length - 1].push(end);
    }
    if (end < lines.length && !lines[end].trim()) end++;
  }
  const goal = lines.map((_, index) => index).filter(index => header < 0 || index < header || index >= end);
  return { facts, goal: goal.map(index => [index]) };
}

// Drop up to `columns` leading spaces; in sanitised HTML they follow the
// reopened spans, and every `<…>` there is a tag because text is escaped.
function dedent(line: OutputLine, columns: number): OutputLine {
  const spaces = Math.min(columns, indentation(line.text));
  return { text: line.text.slice(spaces),
    html: line.html.replace(/^((?:<[^>]*>)*) */, (_, tags: string) => tags + ' '.repeat(indentation(line.text) - spaces)) };
}

export function splitState(lines: OutputLine[]): StateParts<OutputLine> {
  const parts = classifyState(lines.map(line => line.text));
  const join = (group: number[], columns = 0) => ({
    text: group.map(index => dedent(lines[index], columns).text).join('\n'),
    html: group.map(index => dedent(lines[index], columns).html).join('\n'),
  });
  return { facts: parts.facts.map(group => join(group, indentation(lines[group[0]].text))), goal: parts.goal.map(group => join(group)) };
}

export function extractFacts(text: string): string[] {
  return splitState(text.split('\n').map(line => ({ text: line, html: '' }))).facts.map(fact => fact.text);
}

export function goalText(text: string): string {
  const lines = text.split('\n');
  return classifyState(lines).goal.map(group => lines[group[0]]).join('\n');
}

// A finished step leaves only the mode line, "goal:" and "No subgoals!".
export function proofComplete(text: string): boolean {
  const lines = goalText(text).split('\n').map(line => line.trim()).filter(Boolean)
    .filter(line => !/^proof \(\w+\)$/.test(line) && line !== 'goal:');
  return lines.length === 1 && lines[0] === 'No subgoals!';
}

export interface StateContent { text: string; html: string; goalHtml: string; facts: OutputLine[] }

// Everything the sidebar shows for one state_output: the plain text (as the
// MCP tools report it), the sanitised HTML, the goal without its facts, and
// the facts.
export function stateContent(html: string): StateContent {
  const parts = splitState(renderLines(html));
  return { text: outputText(html), html: renderOutput(html).html,
    goalHtml: parts.goal.map(line => line.html).join('\n'), facts: parts.facts };
}
