// Host ↔ webview messages for the ProofMap panel. Pure: no vscode import.
// The host validates every message it receives with `parseWebviewMessage`;
// the webview validates with `parseHostMessage`.
import { MapEvent } from './dagDiff';
import { RankedHole } from './dagRank';
import { Claim, Dag, StatusCounts } from './types';
import { SymbolTable } from './symbols';

export const PROTOCOL_VERSION = 1;

export interface MapSource { label: string; path: string; live: boolean }

export interface LayoutReport { ms: number; nodes: number; edges: number; at: string }

/** A map event as it sits in the feed: numbered and timestamped by the host. */
export interface FeedEntry extends MapEvent { seq: number; at: string }

/** Everything the webview needs to render; the host sends the whole state on every change. */
export interface MapViewState {
  version: number;                 // monotonically increasing per host update
  dag?: Dag;
  counts: StatusCounts;
  holes: RankedHole[];
  claims: Claim[];
  events: FeedEntry[];             // the whole feed, newest last (capped by the host)
  warnings: string[];
  source?: MapSource;
  error?: string;                  // e.g. the file is missing: the empty state explains what to run
  followAgent: boolean;
  selected?: string;
  layout?: LayoutReport;           // last report from the webview, kept for the status bar and tests
  budget: number;                  // node budget the status bar mentions (500)
}

export type HostMessage =
  | { type: 'state'; state: MapViewState; changed: string[] }   // changed: node ids to flash
  | { type: 'symbols'; table: SymbolTable }
  | { type: 'select'; id: string }
  | { type: 'fit' }
  | { type: 'relayout' }
  | { type: 'followAgent'; on: boolean };

export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'open'; id: string }
  | { type: 'select'; id: string | null }
  | { type: 'reload' }
  | { type: 'openSnapshot' }
  | { type: 'newWindow' }
  | { type: 'followAgent'; on: boolean }
  | { type: 'layout'; ms: number; nodes: number; edges: number }
  | { type: 'log'; text: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function encodeMessage(message: HostMessage | WebviewMessage): string { return JSON.stringify(message); }

export function parseWebviewMessage(value: unknown): WebviewMessage | undefined {
  const raw = typeof value === 'string' ? safeJson(value) : value;
  if (!isRecord(raw) || typeof raw.type !== 'string') return undefined;
  switch (raw.type) {
    case 'ready': case 'reload': case 'openSnapshot': case 'newWindow': return { type: raw.type };
    case 'open': return typeof raw.id === 'string' ? { type: 'open', id: raw.id } : undefined;
    case 'select': return typeof raw.id === 'string' || raw.id === null ? { type: 'select', id: raw.id } : undefined;
    case 'followAgent': return typeof raw.on === 'boolean' ? { type: 'followAgent', on: raw.on } : undefined;
    case 'layout': return typeof raw.ms === 'number' && typeof raw.nodes === 'number' && typeof raw.edges === 'number'
      ? { type: 'layout', ms: raw.ms, nodes: raw.nodes, edges: raw.edges } : undefined;
    case 'log': return typeof raw.text === 'string' ? { type: 'log', text: raw.text } : undefined;
    default: return undefined;
  }
}

export function parseHostMessage(value: unknown): HostMessage | undefined {
  const raw = typeof value === 'string' ? safeJson(value) : value;
  if (!isRecord(raw) || typeof raw.type !== 'string') return undefined;
  switch (raw.type) {
    case 'state': return isRecord(raw.state) && Array.isArray(raw.changed)
      ? { type: 'state', state: raw.state as unknown as MapViewState, changed: raw.changed.filter((x): x is string => typeof x === 'string') } : undefined;
    case 'symbols': return isRecord(raw.table) ? { type: 'symbols', table: raw.table as SymbolTable } : undefined;
    case 'select': return typeof raw.id === 'string' ? { type: 'select', id: raw.id } : undefined;
    case 'fit': case 'relayout': return { type: raw.type };
    case 'followAgent': return typeof raw.on === 'boolean' ? { type: 'followAgent', on: raw.on } : undefined;
    default: return undefined;
  }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text) as unknown; } catch { return undefined; }
}
