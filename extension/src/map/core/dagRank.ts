// Local ranking of open holes, mirroring the `next_holes` rule of PLAN.md
// §6.1: fewest other holes underneath first, then highest leverage, then the
// shortest statement (then id, so the order is total). Pure: no vscode import.
import { Dag } from './types';

export interface RankedHole {
  rank: number;              // 1-based position; the "next hole · #k" badge
  id: string;
  file: string;
  line: number;
  statement: string;
  leverage: number;          // distinct nodes that transitively depend on this hole
  rests_on_holes: number;    // other sorry nodes among its transitive dependencies
}

/** Adjacency over all edge kinds; from = dependent, to = dependency. */
export function adjacency(dag: Pick<Dag, 'nodes' | 'edges'>) {
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();
  for (const node of dag.nodes) { dependencies.set(node.id, new Set()); dependents.set(node.id, new Set()); }
  for (const edge of dag.edges) {
    if (edge.from === edge.to) continue;
    dependencies.get(edge.from)?.add(edge.to);
    dependents.get(edge.to)?.add(edge.from);
  }
  return { dependencies, dependents };
}

export function reachable(start: string, next: Map<string, Set<string>>): Set<string> {
  const seen = new Set<string>();
  const stack = [...(next.get(start) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id) || id === start) continue;
    seen.add(id);
    for (const other of next.get(id) ?? []) if (!seen.has(other)) stack.push(other);
  }
  return seen;
}

export function rankHoles(dag: Pick<Dag, 'nodes' | 'edges'>): RankedHole[] {
  const { dependencies, dependents } = adjacency(dag);
  const holes = new Set(dag.nodes.filter(node => node.status === 'sorry').map(node => node.id));
  const ranked = dag.nodes.filter(node => holes.has(node.id)).map(node => {
    let rests = 0;
    for (const id of reachable(node.id, dependencies)) if (holes.has(id)) rests += 1;
    return { rank: 0, id: node.id, file: node.file, line: node.line, statement: node.statement,
      leverage: reachable(node.id, dependents).size, rests_on_holes: rests };
  });
  ranked.sort((a, b) => a.rests_on_holes - b.rests_on_holes || b.leverage - a.leverage
    || a.statement.length - b.statement.length || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  ranked.forEach((hole, index) => { hole.rank = index + 1; });
  return ranked;
}
