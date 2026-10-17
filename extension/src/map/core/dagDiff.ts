// Deterministic diff of two successive C1 exports into "map events".
// Pure: no vscode import; shared by the host (events feed, Output channel)
// and unit-tested in test/unit_proofmap.cjs.
import { Claim, Dag, DagEdge, DagNode, NodeStatus } from './types';

export type MapEventKind =
  'loaded' | 'node_added' | 'node_removed' | 'status_changed' | 'statement_changed'
  | 'edge_added' | 'edge_removed' | 'claim_added' | 'claim_removed' | 'warning';
export type MapEventSeverity = 'info' | 'success' | 'warning';

export interface MapEvent {
  kind: MapEventKind;
  id: string;                 // node id, or "from -> to" for edges, or '' for the whole file
  message: string;
  severity: MapEventSeverity;
  from?: string;              // previous status / sha1
  to?: string;                // new status / sha1
  regression?: boolean;       // a status_changed that moves away from fully_proved, or into oracle
}

// Progress order of statuses for regression detection. `defined` and
// `missing` sit outside the proof ladder; `oracle` is always a warning.
const ladder: Partial<Record<NodeStatus, number>> = { sorry: 1, proved: 2, fully_proved: 3 };

export function isRegression(previous: NodeStatus, next: NodeStatus): boolean {
  if (next === 'oracle') return true;
  if (next === 'missing' && previous !== 'missing') return true;
  const before = ladder[previous], after = ladder[next];
  return before !== undefined && after !== undefined && after < before;
}

const byId = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const edgeKey = (edge: DagEdge) => `${edge.from} -> ${edge.to} (${edge.kind})`;
const compareEdges = (a: DagEdge, b: DagEdge) => edgeKey(a) < edgeKey(b) ? -1 : edgeKey(a) > edgeKey(b) ? 1 : 0;

/**
 * Events describing how `next` differs from `previous`, in a fixed order:
 * removed nodes, added nodes, status changes, statement changes, removed
 * edges, added edges; each group sorted by id. The same two inputs always
 * give the same list.
 */
export function diffDags(previous: Dag | undefined, next: Dag): MapEvent[] {
  if (!previous) {
    return [{ kind: 'loaded', id: '', severity: 'info',
      message: `loaded ${next.nodes.length} nodes and ${next.edges.length} edges` + (next.session ? ` of ${next.session}` : '') }];
  }
  const events: MapEvent[] = [];
  const before = new Map(previous.nodes.map(node => [node.id, node]));
  const after = new Map(next.nodes.map(node => [node.id, node]));
  for (const node of [...previous.nodes].sort(byId)) {
    if (!after.has(node.id)) events.push({ kind: 'node_removed', id: node.id, severity: 'warning', message: `${node.id} removed` });
  }
  for (const node of [...next.nodes].sort(byId)) {
    if (!before.has(node.id)) {
      events.push({ kind: 'node_added', id: node.id, severity: 'info', message: `${node.id} added (${node.status})`, to: node.status });
    }
  }
  for (const node of [...next.nodes].sort(byId)) {
    const old = before.get(node.id);
    if (old && old.status !== node.status) events.push(statusEvent(old, node));
  }
  for (const node of [...next.nodes].sort(byId)) {
    const old = before.get(node.id);
    if (old && old.statement_sha1 !== node.statement_sha1) {
      events.push({ kind: 'statement_changed', id: node.id, severity: 'warning', from: old.statement_sha1, to: node.statement_sha1,
        message: `${node.id} statement changed (sha1 ${old.statement_sha1.slice(0, 7)} -> ${node.statement_sha1.slice(0, 7)}); the audit will reject it unless statements.lock is updated` });
    }
  }
  const oldEdges = new Set(previous.edges.map(edgeKey));
  const newEdges = new Set(next.edges.map(edgeKey));
  for (const edge of [...previous.edges].sort(compareEdges)) {
    if (!newEdges.has(edgeKey(edge))) events.push({ kind: 'edge_removed', id: edgeKey(edge), severity: 'info', message: `edge removed: ${edgeKey(edge)}` });
  }
  for (const edge of [...next.edges].sort(compareEdges)) {
    if (!oldEdges.has(edgeKey(edge))) events.push({ kind: 'edge_added', id: edgeKey(edge), severity: 'info', message: `edge added: ${edgeKey(edge)}` });
  }
  return events;
}

function statusEvent(old: DagNode, node: DagNode): MapEvent {
  const regression = isRegression(old.status, node.status);
  const severity: MapEventSeverity = regression ? 'warning'
    : node.status === 'proved' || node.status === 'fully_proved' ? 'success' : 'info';
  const verb = regression ? 'regressed' : 'now';
  return { kind: 'status_changed', id: node.id, severity, from: old.status, to: node.status,
    regression: regression || undefined, message: `${node.id} ${verb} ${node.status} (was ${old.status})` };
}

/** Events for the claims sidecar: which hole the agent holds now. */
export function diffClaims(previous: Claim[], next: Claim[]): MapEvent[] {
  const events: MapEvent[] = [];
  const before = new Map(previous.map(claim => [claim.id, claim]));
  const after = new Map(next.map(claim => [claim.id, claim]));
  for (const claim of [...previous].sort(byId)) {
    if (!after.has(claim.id)) events.push({ kind: 'claim_removed', id: claim.id, severity: 'info', message: `claim released: ${claim.id}` });
  }
  for (const claim of [...next].sort(byId)) {
    if (!before.has(claim.id)) {
      const detail = [claim.pr !== undefined ? `PR #${claim.pr}` : '', claim.branch ?? ''].filter(Boolean).join(' · ');
      events.push({ kind: 'claim_added', id: claim.id, severity: 'info', message: `agent claimed ${claim.id}` + (detail ? ` (${detail})` : '') });
    }
  }
  return events;
}

/** Node ids a webview should flash after this batch of events. */
export function changedNodeIds(events: MapEvent[]): string[] {
  const ids = new Set<string>();
  for (const event of events) {
    if (event.kind === 'node_added' || event.kind === 'status_changed' || event.kind === 'statement_changed' || event.kind === 'claim_added') ids.add(event.id);
  }
  return [...ids].sort();
}
