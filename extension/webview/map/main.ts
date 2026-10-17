// ProofMap webview: Cytoscape + dagre, bundled by esbuild (no CDN; the CSP
// forbids network access). Colours are read from the --vscode-* variables at
// runtime and re-applied when the theme changes. All text is set through
// textContent; nothing from the host is ever inserted as HTML.
import './map.css';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { RankedHole } from '../../src/map/core/dagRank';
import { FeedEntry, MapViewState, parseHostMessage, WebviewMessage } from '../../src/map/core/protocol';
import { bundledSymbols, mapSymbols, SymbolTable } from '../../src/map/core/symbols';
import { Claim, DagNode, EDGE_KINDS, factName, NODE_STATUSES } from '../../src/map/core/types';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void; getState(): unknown; setState(state: unknown): void;
};

cytoscape.use(dagre);
const vscode = acquireVsCodeApi();
const post = (message: WebviewMessage) => vscode.postMessage(message);

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`ProofMap: missing #${id}`);
  return element as T;
};
const text = (tag: string, content: string, className?: string): HTMLElement => {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  return element;
};

// ---------- theme colours ----------
interface Palette {
  bg: string; fg: string; muted: string; nodeFill: string; nodeBorder: string; edge: string; focus: string;
  blue: string; red: string; green: string; darkGreen: string; yellow: string; purple: string; onGreen: string; onRed: string;
  font: string;
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.body).getPropertyValue(name).trim();
  return value || fallback;
}

function parseColour(value: string): [number, number, number] | undefined {
  const hex = /^#([\da-f]{3,8})$/i.exec(value);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3 || digits.length === 4) return [0, 1, 2].map(i => parseInt(digits[i] + digits[i], 16)) as [number, number, number];
    if (digits.length === 6 || digits.length === 8) return [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(value);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return undefined;
}

function darken(value: string, amount: number): string {
  const rgb = parseColour(value);
  if (!rgb) return value;
  return '#' + rgb.map(channel => Math.round(channel * (1 - amount)).toString(16).padStart(2, '0')).join('');
}

function contrastText(value: string, light: string, dark: string): string {
  const rgb = parseColour(value);
  if (!rgb) return light;
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  return luminance > 0.6 ? dark : light;
}

function readPalette(): Palette {
  const fg = cssVar('--vscode-editor-foreground', cssVar('--vscode-foreground', '#cccccc'));
  const bg = cssVar('--vscode-editor-background', '#1e1e1e');
  const green = cssVar('--vscode-charts-green', cssVar('--vscode-testing-iconPassed', '#89d185'));
  const red = cssVar('--vscode-charts-red', cssVar('--vscode-errorForeground', '#f14c4c'));
  const darkGreen = darken(green, 0.42);
  return {
    bg, fg, green, red, darkGreen,
    muted: cssVar('--vscode-descriptionForeground', '#9d9d9d'),
    nodeFill: cssVar('--vscode-editorWidget-background', cssVar('--vscode-sideBar-background', bg)),
    nodeBorder: cssVar('--vscode-widget-border', cssVar('--vscode-panel-border', '#454545')),
    edge: cssVar('--vscode-charts-lines', cssVar('--vscode-descriptionForeground', '#8b8b8b')),
    focus: cssVar('--vscode-focusBorder', '#007fd4'),
    blue: cssVar('--vscode-charts-blue', cssVar('--vscode-textLink-foreground', '#3794ff')),
    yellow: cssVar('--vscode-charts-yellow', cssVar('--vscode-editorWarning-foreground', '#cca700')),
    purple: cssVar('--vscode-charts-purple', cssVar('--vscode-textLink-activeForeground', '#b180d7')),
    onGreen: contrastText(green, '#ffffff', '#1b1b1b'),
    onRed: contrastText(red, '#ffffff', '#1b1b1b'),
    font: cssVar('--vscode-font-family', 'system-ui, sans-serif'),
  };
}

function styleFor(p: Palette): cytoscape.StylesheetJson {
  return [
    { selector: 'node', style: {
      'shape': 'ellipse', 'background-color': p.nodeFill, 'border-width': 2, 'border-color': p.nodeBorder,
      'label': 'data(label)', 'color': p.fg, 'font-family': p.font, 'font-size': 11,
      'text-wrap': 'wrap', 'text-max-width': '170px', 'text-valign': 'center', 'text-halign': 'center',
      'width': 'label', 'height': 'label', 'padding': '9px', 'text-events': 'yes',
      'transition-property': 'border-width, border-color, background-color, opacity', 'transition-duration': 250,
    } },
    { selector: 'node[kind = "definition"]', style: { 'shape': 'round-rectangle' } },
    { selector: 'node[status = "missing"]', style: { 'border-color': p.blue, 'border-width': 3, 'border-style': 'dashed', 'color': p.muted } },
    { selector: 'node[status = "sorry"]', style: { 'border-color': p.red, 'border-width': 3 } },
    { selector: 'node[status = "proved"]', style: { 'background-color': p.green, 'border-color': p.green, 'color': p.onGreen } },
    { selector: 'node[status = "fully_proved"]', style: { 'background-color': p.darkGreen, 'border-color': p.darkGreen, 'color': '#ffffff' } },
    { selector: 'node[status = "oracle"]', style: { 'background-color': p.red, 'border-color': p.red, 'color': p.onRed } },
    { selector: 'node.claimed', style: { 'border-color': p.purple, 'border-width': 4 } },
    { selector: 'node.claimed.pulse', style: { 'border-width': 9 } },
    { selector: 'node.flash', style: { 'border-color': p.yellow, 'border-width': 7 } },
    { selector: 'node.warn', style: { 'border-color': p.yellow } },
    { selector: 'node:selected', style: { 'border-color': p.focus, 'border-width': 5 } },
    { selector: 'node.dim', style: { 'opacity': 0.15 } },
    { selector: 'edge', style: {
      'width': 1.5, 'line-color': p.edge, 'target-arrow-color': p.edge, 'target-arrow-shape': 'triangle', 'arrow-scale': 0.8,
      'curve-style': 'bezier', 'transition-property': 'opacity', 'transition-duration': 250,
    } },
    { selector: 'edge[kind = "uses_def"]', style: { 'line-style': 'dotted' } },
    { selector: 'edge[kind = "declared"]', style: { 'line-style': 'dashed', 'line-color': p.blue, 'target-arrow-color': p.blue } },
    { selector: 'edge.dim', style: { 'opacity': 0.08 } },
    { selector: 'edge.highlight', style: { 'line-color': p.focus, 'target-arrow-color': p.focus, 'width': 2.5 } },
  ];
}

// ---------- state ----------
interface Persisted { filter?: string; follow?: boolean }
const persisted = (vscode.getState() as Persisted | undefined) ?? {};

let symbols: SymbolTable = bundledSymbols;
let state: MapViewState | undefined;
let palette = readPalette();
let hadStructure = false;         // a layout ran at least once
let lastLayoutMs: number | undefined;
let selectedId: string | undefined;
let pulseTimer: number | undefined;

const graphHost = $('graph');
// Cytoscape prepends an inline <style> (".…_container { position: relative }")
// unless an element with this id exists. The CSP has no 'unsafe-inline', so
// satisfy the check with an inert element; map.css positions #graph itself.
if (!document.getElementById('__________cytoscape_stylesheet')) {
  const marker = document.createElement('meta');
  marker.id = '__________cytoscape_stylesheet';
  document.head.append(marker);
}
const cy = cytoscape({
  container: graphHost, style: styleFor(palette), minZoom: 0.05, maxZoom: 4, wheelSensitivity: 0.2,
  boxSelectionEnabled: false, autounselectify: false, textureOnViewport: false,
});

const filterInput = $<HTMLInputElement>('filter');
const followInput = $<HTMLInputElement>('follow');
filterInput.value = persisted.filter ?? '';

// ---------- graph updates ----------
const edgeId = (edge: { from: string; to: string; kind: string }) => `${edge.from}=>${edge.to}:${edge.kind}`;
const compareIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

function labelFor(node: DagNode, hole: RankedHole | undefined, claim: Claim | undefined): string {
  const lines = [node.blueprint ? `${node.blueprint.label} · ${factName(node)}` : factName(node)];
  if (hole) lines.push(`next hole · #${hole.rank}`);
  if (claim) lines.push(claim.pr !== undefined ? `agent · PR #${claim.pr}` : 'agent · claimed');
  if (node.status === 'missing') lines.push('(blueprint only)');
  return lines.join('\n');
}

function applyState(next: MapViewState, changed: string[]): void {
  performance.mark('proofmap:apply');
  state = next;
  followInput.checked = next.followAgent;
  renderProgress(next);
  renderEvents(next.events);
  renderStatus(next);
  const dag = next.dag;
  if (!dag) {
    cy.elements().remove();
    hadStructure = false;
    showEmpty(next);
    renderDetails(undefined);
    return;
  }
  $('empty').hidden = true;
  const holes = new Map(next.holes.map(hole => [hole.id, hole]));
  const claims = new Map(next.claims.map(claim => [claim.id, claim]));
  const wanted = new Set(dag.nodes.map(node => node.id));
  const wantedEdges = new Set(dag.edges.map(edgeId));
  let structural = false;
  cy.startBatch();
  cy.edges().forEach(edge => { if (!wantedEdges.has(edge.id())) { edge.remove(); structural = true; } });
  cy.nodes().forEach(node => { if (!wanted.has(node.id())) { node.remove(); structural = true; } });
  for (const node of [...dag.nodes].sort((a, b) => compareIds(a.id, b.id))) {
    const data = {
      id: node.id, label: labelFor(node, holes.get(node.id), claims.get(node.id)), status: node.status, kind: node.kind,
      theory: node.theory, file: node.file, line: node.line, blueprint: node.blueprint?.label ?? '',
    };
    const existing = cy.getElementById(node.id);
    if (existing.nonempty()) existing.data(data);
    else { cy.add({ group: 'nodes', data }); structural = true; }
    const element = cy.getElementById(node.id);
    element.toggleClass('claimed', claims.has(node.id));
    element.toggleClass('hole', holes.has(node.id));
  }
  const sortedEdges = [...dag.edges].sort((a, b) => compareIds(edgeId(a), edgeId(b)));
  for (const edge of sortedEdges) {
    const id = edgeId(edge);
    if (cy.getElementById(id).empty()) {
      cy.add({ group: 'edges', data: { id, source: edge.from, target: edge.to, kind: edge.kind } });
      structural = true;
    }
  }
  cy.endBatch();
  performance.mark('proofmap:added');
  performance.measure('proofmap:add-elements', 'proofmap:apply', 'proofmap:added');
  applyFilter();
  if (structural || !hadStructure) runLayout(!hadStructure);
  else followClaim(false);
  for (const id of changed) flash(id);
  startPulse(next.claims.length > 0);
  if (selectedId && !wanted.has(selectedId)) select(undefined);
  else if (selectedId) renderDetails(dag.nodes.find(node => node.id === selectedId));
}

function runLayout(fitAfter: boolean): void {
  const started = performance.now();
  performance.mark('proofmap:layout-start');
  const dag = state?.dag;
  const layout = cy.layout({
    name: 'dagre', rankDir: 'BT', ranker: 'tight-tree', nodeSep: 28, rankSep: 64, edgeSep: 12,
    animate: false, fit: fitAfter, padding: 24,
  } as cytoscape.LayoutOptions);
  layout.one('layoutstop', () => {
    performance.mark('proofmap:layout-stop');
    performance.measure('proofmap:dagre', 'proofmap:layout-start', 'proofmap:layout-stop');
    requestAnimationFrame(() => {
      performance.mark('proofmap:painted');
      performance.measure('proofmap:paint', 'proofmap:layout-stop', 'proofmap:painted');
      lastLayoutMs = Math.round(performance.now() - started);
      hadStructure = true;
      post({ type: 'layout', ms: lastLayoutMs, nodes: cy.nodes().length, edges: cy.edges().length });
      if (state) renderStatus(state);
      if (!followClaim(true) && !fitAfter && dag) cy.fit(undefined, 24);
    });
  });
  layout.run();
}

function followClaim(animate: boolean): boolean {
  if (!state?.followAgent || !state.claims.length) return false;
  const claimed = cy.getElementById(state.claims[0].id);
  if (claimed.empty()) return false;
  if (animate) cy.animate({ center: { eles: claimed }, duration: 300 });
  else cy.center(claimed);
  return true;
}

function flash(id: string): void {
  const element = cy.getElementById(id);
  if (element.empty()) return;
  element.addClass('flash');
  window.setTimeout(() => element.removeClass('flash'), 1600);
}

function startPulse(on: boolean): void {
  if (!on) { if (pulseTimer) window.clearInterval(pulseTimer); pulseTimer = undefined; cy.nodes('.pulse').removeClass('pulse'); return; }
  if (pulseTimer) return;
  pulseTimer = window.setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    cy.nodes('.claimed').toggleClass('pulse');
  }, 700);
}

// ---------- filter ----------
interface Filter { status?: string; theory?: string; label?: string; words: string[] }
function parseFilter(source: string): Filter {
  const filter: Filter = { words: [] };
  for (const token of source.trim().split(/\s+/).filter(Boolean)) {
    const [key, ...rest] = token.split(':');
    const value = rest.join(':').toLowerCase();
    if (rest.length && key === 'status') filter.status = value;
    else if (rest.length && key === 'theory') filter.theory = value;
    else if (rest.length && (key === 'label' || key === 'blueprint')) filter.label = value;
    else filter.words.push(token.toLowerCase());
  }
  return filter;
}

function matches(node: DagNode, filter: Filter): boolean {
  if (filter.status && node.status !== filter.status) return false;
  if (filter.theory && !node.theory.toLowerCase().startsWith(filter.theory)) return false;
  if (filter.label && (node.blueprint?.label ?? '').toLowerCase() !== filter.label) return false;
  if (!filter.words.length) return true;
  const haystack = [node.id, node.blueprint?.label ?? '', mapSymbols(node.statement, symbols), node.nl ?? ''].join('\n').toLowerCase();
  return filter.words.every(word => haystack.includes(word));
}

function applyFilter(): void {
  const dag = state?.dag;
  if (!dag) return;
  const filter = parseFilter(filterInput.value);
  const active = Boolean(filter.status || filter.theory || filter.label || filter.words.length);
  const byId = new Map(dag.nodes.map(node => [node.id, node]));
  cy.batch(() => {
    cy.nodes().forEach(element => {
      const node = byId.get(element.id());
      element.toggleClass('dim', active && !!node && !matches(node, filter));
    });
    cy.edges().forEach(edge => { edge.toggleClass('dim', edge.source().hasClass('dim') || edge.target().hasClass('dim')); });
  });
  const shown = cy.nodes().not('.dim').length;
  $('filter-count').textContent = active ? `${shown} of ${cy.nodes().length}` : '';
}

filterInput.addEventListener('input', () => {
  vscode.setState({ ...persisted, filter: filterInput.value } satisfies Persisted);
  persisted.filter = filterInput.value;
  applyFilter();
});
filterInput.addEventListener('keydown', event => {
  if (event.key === 'Escape') { filterInput.value = ''; persisted.filter = ''; vscode.setState({ ...persisted }); applyFilter(); }
});

// ---------- side panel ----------
function select(id: string | undefined): void {
  selectedId = id;
  cy.elements().unselect();
  cy.edges().removeClass('highlight');
  if (id) {
    const element = cy.getElementById(id);
    if (element.nonempty()) { element.select(); element.connectedEdges().addClass('highlight'); }
  }
  post({ type: 'select', id: id ?? null });
  renderDetails(id ? state?.dag?.nodes.find(node => node.id === id) : undefined);
}

function nodeButton(id: string, caption: string): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'link'; button.textContent = caption; button.title = id;
  button.addEventListener('click', () => select(id));
  return button;
}

function renderDetails(node: DagNode | undefined): void {
  const body = $('details-body');
  const empty = $('details-empty');
  body.replaceChildren();
  if (!node || !state?.dag) { body.hidden = true; empty.hidden = false; return; }
  body.hidden = false; empty.hidden = true;
  const dag = state.dag;
  const title = text('h3', factName(node));
  if (node.blueprint) title.prepend(text('span', node.blueprint.label, 'badge'));
  body.append(title, text('p', node.id, 'muted mono'));
  const row = document.createElement('p');
  row.append(text('span', node.status, `status-pill status-${node.status}`), ' ', text('span', node.kind, 'muted'));
  const claim = state.claims.find(entry => entry.id === node.id);
  if (claim) row.append(' ', text('span', claim.pr !== undefined ? `agent · PR #${claim.pr}` : 'agent claim', 'status-pill status-claimed'));
  const hole = state.holes.find(entry => entry.id === node.id);
  if (hole) row.append(' ', text('span', `next hole · #${hole.rank} (leverage ${hole.leverage}, rests on ${hole.rests_on_holes} holes)`, 'muted'));
  body.append(row);
  if (node.status === 'missing') {
    body.append(text('p', 'This node exists only in blueprint.yaml: no Isabelle fact has been written for it yet. Write the statement in the theory to give it a kernel status.', 'note'));
  }
  body.append(text('h4', 'Statement'), text('pre', mapSymbols(node.statement, symbols), 'source'));
  if (node.nl) body.append(text('h4', 'Description'), text('p', mapSymbols(node.nl, symbols)));
  const deps = dag.edges.filter(edge => edge.from === node.id).sort((a, b) => compareIds(a.to, b.to));
  const usedBy = dag.edges.filter(edge => edge.to === node.id).sort((a, b) => compareIds(a.from, b.from));
  for (const [heading, edges, pick] of [['Depends on', deps, (edge: typeof deps[number]) => edge.to], ['Used by', usedBy, (edge: typeof usedBy[number]) => edge.from]] as const) {
    body.append(text('h4', `${heading} (${edges.length})`));
    const list = document.createElement('ul');
    for (const edge of edges) {
      const item = document.createElement('li');
      const other = dag.nodes.find(candidate => candidate.id === pick(edge));
      item.append(nodeButton(pick(edge), other ? factName(other) : pick(edge)), ' ', text('span', edge.kind, 'muted'));
      list.append(item);
    }
    if (!edges.length) list.append(text('li', 'none', 'muted'));
    body.append(list);
  }
  if (node.lib_uses?.length) body.append(text('h4', 'Library facts'), text('p', node.lib_uses.join(', '), 'mono muted'));
  const location = document.createElement('p');
  const open = document.createElement('button');
  open.type = 'button'; open.className = 'link mono'; open.textContent = `${node.file}:${node.line}`;
  open.title = 'Open in the editor (double-click the node does the same)';
  open.addEventListener('click', () => post({ type: 'open', id: node.id }));
  location.append(open);
  if (node.blueprint?.paper_ref) location.append(' ', text('span', `· ${node.blueprint.paper_ref}`, 'muted'));
  if (node.blueprint?.owner) location.append(' ', text('span', `· owner ${node.blueprint.owner}`, 'muted'));
  body.append(text('h4', 'Location'), location);
}

// ---------- progress card, events, status bar ----------
function renderProgress(view: MapViewState): void {
  const counts = $('counts');
  counts.replaceChildren();
  for (const status of NODE_STATUSES) {
    const item = document.createElement('div');
    item.className = 'count';
    item.append(text('i', '', `swatch status-${status}`), text('span', String(view.counts[status]), 'count-value'), text('span', status.replace('_', ' '), 'count-label'));
    counts.append(item);
  }
  const dag = view.dag;
  const theorems = dag ? dag.nodes.filter(node => node.kind === 'theorem' && node.status !== 'missing').length : 0;
  const green = view.counts.proved + view.counts.fully_proved;
  const summary = dag ? `${green} / ${theorems} theorems proved · ${view.counts.sorry} open holes · ${view.counts.missing} missing` : 'No graph loaded.';
  $('summary').textContent = summary;
  const meta = dag ? [dag.session && `session ${dag.session}`, dag.isabelle, dag.git_sha && `git ${dag.git_sha.slice(0, 7)}`, dag.generated_at && `exported ${dag.generated_at}`]
    .filter(Boolean).join(' · ') : '';
  $('meta').textContent = meta;
  const next = $('next-hole');
  next.replaceChildren();
  if (view.holes.length) {
    next.append(text('span', 'Next hole: '), nodeButton(view.holes[0].id, view.holes[0].id));
  } else if (dag) next.append(text('span', 'No open holes.', 'muted'));
  const claims = $('claims');
  claims.replaceChildren();
  for (const claim of view.claims) {
    const line = document.createElement('div');
    line.append(text('span', 'Agent on: '), nodeButton(claim.id, claim.id));
    const detail = [claim.pr !== undefined ? `PR #${claim.pr}` : '', claim.branch ?? '', claim.since ? `since ${claim.since}` : ''].filter(Boolean).join(' · ');
    if (detail) line.append(' ', text('span', detail, 'muted'));
    claims.append(line);
  }
}

let renderedSeq = -1;
function renderEvents(events: FeedEntry[]): void {
  const list = $('events');
  const oldest = events.length ? events[0].seq : 0;
  for (const child of [...list.children]) if (Number((child as HTMLElement).dataset.seq) < oldest) child.remove();
  const follow = list.scrollTop + list.clientHeight >= list.scrollHeight - 30;
  for (const entry of events) {
    if (entry.seq <= renderedSeq) continue;
    const item = document.createElement('li');
    item.dataset.seq = String(entry.seq);
    item.className = `event ${entry.severity}` + (entry.regression ? ' regression' : '');
    item.append(text('time', entry.at.slice(11, 19)), ' ', text('span', entry.message));
    if (entry.kind !== 'loaded' && entry.kind !== 'warning' && !entry.id.includes(' -> ')) {
      item.addEventListener('click', () => select(entry.id));
      item.classList.add('clickable');
    }
    list.append(item);
    renderedSeq = entry.seq;
  }
  if (!events.length) { list.replaceChildren(); renderedSeq = -1; }
  if (follow) list.scrollTop = list.scrollHeight;
}

function renderStatus(view: MapViewState): void {
  const parts: string[] = [];
  if (view.dag) {
    parts.push(`${view.dag.nodes.length} nodes · ${view.dag.edges.length} edges`);
    if (lastLayoutMs !== undefined) parts.push(`layout ${lastLayoutMs} ms`);
    parts.push(view.dag.nodes.length > view.budget
      ? `above the ${view.budget}-node budget: layout may exceed 2 s`
      : `budget ${view.budget} nodes ≤ 2 s`);
  }
  if (view.source) parts.push(`${view.source.live ? 'live' : 'replay'}: ${view.source.path}`);
  if (view.warnings.length) parts.push(`${view.warnings.length} warning${view.warnings.length === 1 ? '' : 's'} (Output › ProofMap)`);
  if (view.error) parts.push(view.error);
  $('status').textContent = parts.join(' · ');
  $('status').classList.toggle('error', Boolean(view.error));
}

function showEmpty(view: MapViewState): void {
  $('empty').hidden = false;
  const lines = [view.error ?? 'No dependency graph loaded.'];
  if (view.source) lines.push(`Looked for ${view.source.path}.`);
  lines.push('Run `revamp map export -d thys Apery -o out/ --watch` next to the theories, or open a replay snapshot (dag.json) from the toolbar.');
  $('empty-text').replaceChildren(...lines.map(line => text('p', line)));
}

// ---------- tooltip ----------
const tooltip = $('tooltip');
function showTooltip(id: string, position: { x: number; y: number }): void {
  const node = state?.dag?.nodes.find(candidate => candidate.id === id);
  if (!node) return;
  tooltip.replaceChildren(text('div', node.id, 'mono muted'), text('pre', mapSymbols(node.statement, symbols), 'source'));
  if (node.nl) tooltip.append(text('p', mapSymbols(node.nl, symbols)));
  tooltip.hidden = false;
  const bounds = graphHost.getBoundingClientRect();
  const x = Math.min(position.x + 14, Math.max(0, bounds.width - tooltip.offsetWidth - 8));
  const y = Math.min(position.y + 14, Math.max(0, bounds.height - tooltip.offsetHeight - 8));
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}
cy.on('mouseover', 'node', event => showTooltip(event.target.id(), event.renderedPosition ?? event.position));
cy.on('mouseout', 'node', () => { tooltip.hidden = true; });
cy.on('pan zoom', () => { tooltip.hidden = true; });
cy.on('tap', 'node', event => select(event.target.id()));
cy.on('tap', event => { if (event.target === cy) select(undefined); });
cy.on('dbltap', 'node', event => post({ type: 'open', id: event.target.id() }));

// ---------- toolbar ----------
$('fit').addEventListener('click', () => cy.fit(undefined, 24));
$('relayout').addEventListener('click', () => runLayout(true));
$('reload').addEventListener('click', () => post({ type: 'reload' }));
$('snapshot').addEventListener('click', () => post({ type: 'openSnapshot' }));
$('newwindow').addEventListener('click', () => post({ type: 'newWindow' }));
followInput.addEventListener('change', () => { post({ type: 'followAgent', on: followInput.checked }); if (state) { state.followAgent = followInput.checked; followClaim(true); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.activeElement !== filterInput) select(undefined); });

// ---------- theme ----------
function reskin(): void {
  palette = readPalette();
  cy.style(styleFor(palette));
  const root = $('app');
  root.style.setProperty('--pm-green', palette.green);
  root.style.setProperty('--pm-dark-green', palette.darkGreen);
  root.style.setProperty('--pm-red', palette.red);
  root.style.setProperty('--pm-blue', palette.blue);
  root.style.setProperty('--pm-yellow', palette.yellow);
  root.style.setProperty('--pm-purple', palette.purple);
  root.style.setProperty('--pm-node-fill', palette.nodeFill);
  root.style.setProperty('--pm-node-border', palette.nodeBorder);
  root.style.setProperty('--pm-edge', palette.edge);
}
reskin();
new MutationObserver(() => reskin()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
new MutationObserver(() => reskin()).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
window.addEventListener('resize', () => cy.resize());

// ---------- legend ----------
for (const status of NODE_STATUSES) {
  const item = document.createElement('span');
  item.className = 'legend-item';
  item.append(text('i', '', `swatch status-${status}`), text('span', status.replace('_', ' ')));
  $('legend').append(item);
}
for (const kind of EDGE_KINDS) {
  const item = document.createElement('span');
  item.className = 'legend-item';
  item.append(text('i', '', `edge-swatch edge-${kind}`), text('span', kind));
  $('legend').append(item);
}

// ---------- host messages ----------
window.addEventListener('message', event => {
  const message = parseHostMessage(event.data);
  if (!message) return;
  switch (message.type) {
    case 'state': applyState(message.state, message.changed); break;
    case 'symbols': symbols = message.table; if (selectedId) renderDetails(state?.dag?.nodes.find(node => node.id === selectedId)); break;
    case 'select': select(message.id); { const element = cy.getElementById(message.id); if (element.nonempty()) cy.animate({ center: { eles: element }, duration: 200 }); } break;
    case 'fit': cy.fit(undefined, 24); break;
    case 'relayout': runLayout(true); break;
    case 'followAgent': followInput.checked = message.on; if (state) { state.followAgent = message.on; followClaim(true); } break;
  }
});
post({ type: 'ready' });
export {};
