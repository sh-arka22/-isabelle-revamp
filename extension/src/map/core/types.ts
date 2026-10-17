// Contract C1 (PLAN.md §6.2): the theorem dependency graph that
// `revamp map export` writes to out/dag.json. Pure TypeScript: no vscode
// import, shared by the extension host and the webview bundle.

export type NodeKind = 'theorem' | 'definition';
export type NodeStatus = 'missing' | 'defined' | 'sorry' | 'proved' | 'fully_proved' | 'oracle';
export type EdgeKind = 'uses' | 'uses_def' | 'declared';

export const NODE_STATUSES: readonly NodeStatus[] =
  ['missing', 'defined', 'sorry', 'proved', 'fully_proved', 'oracle'];
export const EDGE_KINDS: readonly EdgeKind[] = ['uses', 'uses_def', 'declared'];

export interface Blueprint { label: string; paper_ref?: string; owner?: string }

export interface DagNode {
  id: string;                       // Session.Theory.fact
  kind: NodeKind;
  theory: string;
  file: string;                     // repo-relative
  line: number;                     // 1-based
  status: NodeStatus;
  statement: string;                // ASCII with \<symbols>
  statement_sha1: string;
  nl?: string;
  doc_source?: string;
  lib_uses?: string[];
  blueprint?: Blueprint;
}

export interface DagEdge { from: string; to: string; kind: EdgeKind }   // from = dependent, to = dependency

export interface DagAudit {
  non_definitional_axioms?: { name: string; theory: string; prop: string }[];
  oracles?: { node: string; oracle: string }[];
}

export interface Dag {
  schema_version: number;
  isabelle?: string;
  session?: string;
  git_sha?: string;
  generated_at?: string;
  nodes: DagNode[];
  edges: DagEdge[];
  audit?: DagAudit;
}

// Advisory sidecar (contracts/claims.schema.json), not part of C1.
export interface Claim { id: string; pr?: number; branch?: string; since?: string }

export type StatusCounts = Record<NodeStatus, number>;

export function emptyCounts(): StatusCounts {
  return { missing: 0, defined: 0, sorry: 0, proved: 0, fully_proved: 0, oracle: 0 };
}

export function statusCounts(dag: Pick<Dag, 'nodes'>): StatusCounts {
  const counts = emptyCounts();
  for (const node of dag.nodes) counts[node.status] += 1;
  return counts;
}

/** The fact name without its Session.Theory prefix. */
export function factName(node: Pick<DagNode, 'id' | 'theory'>): string {
  const prefix = node.theory + '.';
  return node.id.startsWith(prefix) ? node.id.slice(prefix.length) : node.id.split('.').pop() ?? node.id;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export interface ParsedDag { dag: Dag; warnings: string[] }

/** Tolerant C1 parser: malformed nodes and dangling edges are dropped and reported. */
export function parseDag(source: unknown): ParsedDag {
  const warnings: string[] = [];
  const raw = typeof source === 'string' ? JSON.parse(source) as unknown : source;
  if (!isRecord(raw)) throw new Error('dag.json is not a JSON object');
  if (raw.schema_version !== 1) warnings.push(`schema_version ${String(raw.schema_version)} is not 1; reading it as v1`);
  const nodes: DagNode[] = [];
  const ids = new Set<string>();
  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  if (!Array.isArray(raw.nodes)) warnings.push('nodes is missing or not an array');
  for (const [index, entry] of rawNodes.entries()) {
    const problem = nodeProblem(entry);
    if (problem) { warnings.push(`node ${index} dropped: ${problem}`); continue; }
    const node = entry as unknown as DagNode;
    if (ids.has(node.id)) { warnings.push(`node ${index} dropped: duplicate id ${node.id}`); continue; }
    ids.add(node.id);
    const copy: DagNode = {
      id: node.id, kind: node.kind, theory: node.theory, file: node.file, line: node.line,
      status: node.status, statement: node.statement, statement_sha1: node.statement_sha1,
    };
    if (typeof node.nl === 'string') copy.nl = node.nl;
    if (typeof node.doc_source === 'string') copy.doc_source = node.doc_source;
    if (Array.isArray(node.lib_uses)) copy.lib_uses = node.lib_uses.filter(x => typeof x === 'string');
    if (isRecord(node.blueprint) && typeof node.blueprint.label === 'string') {
      copy.blueprint = { label: node.blueprint.label };
      if (typeof node.blueprint.paper_ref === 'string') copy.blueprint.paper_ref = node.blueprint.paper_ref;
      if (typeof node.blueprint.owner === 'string') copy.blueprint.owner = node.blueprint.owner;
    }
    nodes.push(copy);
  }
  const edges: DagEdge[] = [];
  const seen = new Set<string>();
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];
  if (!Array.isArray(raw.edges)) warnings.push('edges is missing or not an array');
  for (const [index, entry] of rawEdges.entries()) {
    if (!isRecord(entry) || typeof entry.from !== 'string' || typeof entry.to !== 'string'
      || !EDGE_KINDS.includes(entry.kind as EdgeKind)) { warnings.push(`edge ${index} dropped: malformed`); continue; }
    if (!ids.has(entry.from) || !ids.has(entry.to)) {
      warnings.push(`edge ${index} dropped: dangling ${entry.from} -> ${entry.to}`); continue;
    }
    const key = `${entry.from}\u0000${entry.to}\u0000${entry.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ from: entry.from, to: entry.to, kind: entry.kind as EdgeKind });
  }
  const dag: Dag = { schema_version: typeof raw.schema_version === 'number' ? raw.schema_version : 1, nodes, edges };
  for (const key of ['isabelle', 'session', 'git_sha', 'generated_at'] as const) {
    if (typeof raw[key] === 'string') dag[key] = raw[key] as string;
  }
  if (isRecord(raw.audit)) dag.audit = raw.audit as DagAudit;
  return { dag, warnings };
}

function nodeProblem(entry: unknown): string | undefined {
  if (!isRecord(entry)) return 'not an object';
  if (typeof entry.id !== 'string' || !entry.id) return 'missing id';
  if (entry.kind !== 'theorem' && entry.kind !== 'definition') return `${entry.id}: kind must be theorem or definition`;
  if (!NODE_STATUSES.includes(entry.status as NodeStatus)) return `${entry.id}: unknown status ${String(entry.status)}`;
  if (typeof entry.theory !== 'string') return `${entry.id}: missing theory`;
  if (typeof entry.file !== 'string') return `${entry.id}: missing file`;
  if (typeof entry.line !== 'number' || !Number.isInteger(entry.line) || entry.line < 1) return `${entry.id}: line must be a positive integer`;
  if (typeof entry.statement !== 'string') return `${entry.id}: missing statement`;
  if (typeof entry.statement_sha1 !== 'string') return `${entry.id}: missing statement_sha1`;
  return undefined;
}

export interface ParsedClaims { claims: Claim[]; warnings: string[] }

/** Tolerant claims.json parser; the viewer works without the file. */
export function parseClaims(source: unknown): ParsedClaims {
  const warnings: string[] = [];
  const raw = typeof source === 'string' ? JSON.parse(source) as unknown : source;
  if (!isRecord(raw) || !Array.isArray(raw.claims)) return { claims: [], warnings: ['claims.json has no claims array'] };
  const claims: Claim[] = [];
  for (const [index, entry] of raw.claims.entries()) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id) { warnings.push(`claim ${index} dropped: missing id`); continue; }
    const claim: Claim = { id: entry.id };
    if (typeof entry.pr === 'number' && Number.isInteger(entry.pr)) claim.pr = entry.pr;
    if (typeof entry.branch === 'string') claim.branch = entry.branch;
    if (typeof entry.since === 'string') claim.since = entry.since;
    claims.push(claim);
  }
  claims.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { claims, warnings };
}
