// ProofMap performance harness: lays out a synthetic 500-node / 740-edge graph
// in the real webview bundle (dist/webview/map.js) inside Playwright's
// Chromium, under the same CSP the VS Code webview uses, and reports the time
// from posting the state to the first paint after the dagre layout.
//
//   npm run compile --prefix extension && node extension/test/perf_proofmap.cjs [--nodes 500 --edges 740] [--write out.json]
//
// Playwright is looked up in node_modules, then in PLAYWRIGHT_MODULE, then in
// /opt/node-tools/node_modules/playwright; the browsers in PLAYWRIGHT_BROWSERS_PATH
// (default /opt/pw-browsers when it exists). Without Playwright the script prints
// "measurement not done" and exits 0 (exit 3 with --require).
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { proofMapHtml } = require('../out/map/htmlTemplate');
const { parseDag, statusCounts } = require('../out/map/core/types');
const { rankHoles } = require('../out/map/core/dagRank');

function argument(name, fallback) {
  const index = process.argv.indexOf('--' + name);
  return index >= 0 && process.argv[index + 1] !== undefined ? process.argv[index + 1] : fallback;
}

/**
 * Deterministic synthetic export in the C1 shape (mulberry32 PRNG).
 * Default shape: blueprint-like, about 14 layers (ranks) with edges mostly to
 * the previous layer and a few spanning up to three, like a theorem map.
 * `deep: true` builds a chain-like graph (about 80 ranks, thousands of dagre
 * dummy nodes), the adversarial case recorded in docs/PROGRESS.md.
 */
function generateDag(nodeCount, edgeCount, seed = 20261017, deep = false) {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const statuses = ['fully_proved', 'fully_proved', 'fully_proved', 'proved', 'proved', 'sorry', 'missing', 'oracle'];
  const theories = Array.from({ length: 10 }, (_, i) => `Synth.T${i}`);
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const theory = theories[i % theories.length];
    const definition = i % 17 === 0;
    const status = definition ? 'defined' : statuses[Math.floor(random() * statuses.length)];
    nodes.push({
      id: `${theory}.fact_${i}`, kind: definition ? 'definition' : 'theorem', theory,
      file: `thys/Synth/${theory.slice(6)}.thy`, line: 10 + (i % 90) * 3, status,
      statement: definition ? `c_${i} x = x + ${i}` : `\\<forall>x. f_${i} x \\<le> g_${i % 7} (x + ${i})`,
      statement_sha1: (i * 2654435761 >>> 0).toString(16).padStart(8, '0').repeat(5),
      nl: i % 3 === 0 ? `Synthetic statement number ${i}.` : undefined,
      blueprint: i % 25 === 0 ? { label: `S${i / 25}` } : undefined,
    });
  }
  const edges = [];
  const seen = new Set();
  const addEdge = (from, to, kind) => {
    const key = `${from}>${to}`;
    if (from === to || to >= from || seen.has(key)) return false;
    seen.add(key);
    edges.push({ from: nodes[from].id, to: nodes[to].id, kind });
    return true;
  };
  const kindFor = to => (random() < 0.08 ? 'declared' : nodes[to].kind === 'definition' ? 'uses_def' : 'uses');
  if (deep) {
    for (let i = 1; i < nodeCount && edges.length < edgeCount; i++) {
      const target = Math.max(0, i - 1 - Math.floor(random() * Math.min(i, 12)));   // a long chain
      addEdge(i, target, kindFor(target));
    }
    let guard = 0;
    while (edges.length < edgeCount && guard++ < edgeCount * 50) {
      const from = 1 + Math.floor(random() * (nodeCount - 1));
      addEdge(from, Math.floor(random() * from), kindFor(Math.floor(random() * from)));
    }
  } else {
    // Layers of ~36 nodes; node i sits in layer floor(i / layerSize). Each node
    // depends on one node of the previous layer, then extra edges span 1–3 layers.
    const layerSize = Math.max(2, Math.ceil(nodeCount / 14));
    const layerOf = i => Math.floor(i / layerSize);
    const pick = layer => Math.min(nodeCount - 1, layer * layerSize + Math.floor(random() * layerSize));
    for (let i = layerSize; i < nodeCount && edges.length < edgeCount; i++) addEdge(i, pick(layerOf(i) - 1), 'uses');
    let guard = 0;
    while (edges.length < edgeCount && guard++ < edgeCount * 50) {
      const from = layerSize + Math.floor(random() * (nodeCount - layerSize));
      const span = random() < 0.7 ? 1 : random() < 0.7 ? 2 : 3;
      const to = pick(Math.max(0, layerOf(from) - span));
      addEdge(from, to, kindFor(to));
    }
  }
  return {
    schema_version: 1, isabelle: 'Isabelle2025-2', session: 'Synth', git_sha: '0'.repeat(40), generated_at: '2026-10-17T12:00:00Z',
    nodes, edges, audit: { non_definitional_axioms: [], oracles: [] },
  };
}

function loadPlaywright() {
  const candidates = ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node-tools/node_modules/playwright', 'playwright-core',
    '/opt/node-tools/node_modules/playwright-core'].filter(Boolean);
  for (const candidate of candidates) {
    try { return { playwright: require(candidate), from: candidate }; } catch { /* try the next one */ }
  }
  return undefined;
}

function viewState(dag) {
  return {
    version: 1, dag, counts: statusCounts(dag), holes: rankHoles(dag), claims: [], events: [], warnings: [],
    source: { label: 'perf', path: 'perf', live: false }, followAgent: false, budget: 500,
  };
}

async function serve(directory) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((request, response) => {
    const file = path.join(directory, request.url === '/' ? 'index.html' : request.url.split('?')[0]);
    if (!file.startsWith(directory) || !fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

const themes = {
  dark: { '--vscode-editor-background': '#1f1f1f', '--vscode-editor-foreground': '#cccccc', '--vscode-foreground': '#cccccc',
    '--vscode-descriptionForeground': '#9d9d9d', '--vscode-editorWidget-background': '#202020', '--vscode-sideBar-background': '#181818',
    '--vscode-widget-border': '#313131', '--vscode-panel-border': '#2b2b2b', '--vscode-focusBorder': '#0078d4',
    '--vscode-charts-red': '#f14c4c', '--vscode-charts-blue': '#3794ff', '--vscode-charts-green': '#89d185', '--vscode-charts-yellow': '#cca700',
    '--vscode-charts-purple': '#b180d7', '--vscode-charts-lines': '#cccccc80', '--vscode-button-background': '#0078d4', '--vscode-button-foreground': '#ffffff',
    '--vscode-input-background': '#313131', '--vscode-input-foreground': '#cccccc', '--vscode-font-family': 'system-ui, sans-serif', '--vscode-font-size': '13px',
    '--vscode-editor-font-family': 'monospace', '--vscode-editor-font-size': '12px', '--vscode-textLink-foreground': '#4daafc', '--vscode-badge-background': '#616161', '--vscode-badge-foreground': '#f8f8f8' },
  light: { '--vscode-editor-background': '#ffffff', '--vscode-editor-foreground': '#3b3b3b', '--vscode-foreground': '#3b3b3b',
    '--vscode-descriptionForeground': '#3b3b3bb3', '--vscode-editorWidget-background': '#f8f8f8', '--vscode-sideBar-background': '#f8f8f8',
    '--vscode-widget-border': '#e5e5e5', '--vscode-panel-border': '#e5e5e5', '--vscode-focusBorder': '#005fb8',
    '--vscode-charts-red': '#e51400', '--vscode-charts-blue': '#007acc', '--vscode-charts-green': '#388a34', '--vscode-charts-yellow': '#bf8803',
    '--vscode-charts-purple': '#652d90', '--vscode-charts-lines': '#3b3b3b80', '--vscode-button-background': '#005fb8', '--vscode-button-foreground': '#ffffff',
    '--vscode-input-background': '#ffffff', '--vscode-input-foreground': '#3b3b3b', '--vscode-font-family': 'system-ui, sans-serif', '--vscode-font-size': '13px',
    '--vscode-editor-font-family': 'monospace', '--vscode-editor-font-size': '12px', '--vscode-textLink-foreground': '#005fb8', '--vscode-badge-background': '#cccccc', '--vscode-badge-foreground': '#3b3b3b' },
};

async function measure(page, dag, label, message) {
  const state = dag ? viewState(dag) : undefined;
  const result = await page.evaluate(async ({ state, message }) => {
    window.__messages.length = 0;
    performance.clearMeasures();
    const started = performance.now();
    window.postMessage(message ?? { type: 'state', state, changed: [] }, '*');
    const layout = await new Promise((resolve, reject) => {
      const deadline = Date.now() + 60000;
      const poll = () => {
        const report = window.__messages.find(m => m.type === 'layout');
        if (report) resolve({ ...report, wallMs: performance.now() - started });
        else if (Date.now() > deadline) reject(new Error('no layout report within 60 s'));
        else setTimeout(poll, 5);
      };
      poll();
    });
    const phases = Object.fromEntries(performance.getEntriesByType('measure').map(m => [m.name.replace('proofmap:', ''), Math.round(m.duration)]));
    return { ...layout, phases, status: document.getElementById('status').textContent, csp: window.__csp.slice(), errors: window.__errors.slice() };
  }, { state, message });
  console.log(`${label}: ${result.nodes} nodes / ${result.edges} edges — layout+paint ${Math.round(result.ms)} ms (webview clock), ${Math.round(result.wallMs)} ms wall; phases ${JSON.stringify(result.phases)}`);
  if (result.csp.length) throw new Error('CSP violations: ' + result.csp.join('; '));
  if (result.errors.length) throw new Error('console errors: ' + result.errors.join('; '));
  return result;
}

async function main() {
  const nodeCount = Number(argument('nodes', 500));
  const edgeCount = Number(argument('edges', 740));
  const deep = process.argv.includes('--deep');
  const dag = generateDag(nodeCount, edgeCount, 20261017, deep);
  const parsed = parseDag(dag);
  if (parsed.warnings.length) throw new Error('synthetic dag is not valid C1: ' + parsed.warnings.join('; '));
  const output = argument('write');
  if (output) { fs.writeFileSync(output, JSON.stringify(dag, null, 1)); console.log(`wrote ${output}`); }
  const rank = new Map();
  const deps = new Map(dag.nodes.map(n => [n.id, []]));
  for (const edge of dag.edges) deps.get(edge.from).push(edge.to);
  const rankOf = id => { if (!rank.has(id)) rank.set(id, deps.get(id).length ? 1 + Math.max(...deps.get(id).map(rankOf)) : 0); return rank.get(id); };
  const ranks = 1 + Math.max(...dag.nodes.map(n => rankOf(n.id)));
  const dummies = dag.edges.reduce((sum, e) => sum + rank.get(e.from) - rank.get(e.to) - 1, 0);
  console.log(`synthetic graph (${deep ? 'deep chain' : 'blueprint-like'}): ${dag.nodes.length} nodes, ${dag.edges.length} edges, ${ranks} ranks, about ${dummies} dagre dummy nodes`);

  const found = loadPlaywright();
  if (!found) {
    console.log('perf: Playwright is not available; layout measurement not done (install playwright or set PLAYWRIGHT_MODULE).');
    process.exit(process.argv.includes('--require') ? 3 : 0);
  }
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
  const dist = path.resolve(__dirname, '../dist/webview');
  for (const file of ['map.js', 'map.css']) if (!fs.existsSync(path.join(dist, file))) throw new Error(`missing ${file}: run npm run bundle`);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'proofmap-perf-'));
  fs.copyFileSync(path.join(dist, 'map.js'), path.join(directory, 'map.js'));
  fs.copyFileSync(path.join(dist, 'map.css'), path.join(directory, 'map.css'));
  fs.writeFileSync(path.join(directory, 'index.html'),
    proofMapHtml({ nonce: 'perf0123456789', cspSource: "'self'", scriptUri: 'map.js', styleUri: 'map.css' }));
  const { server, url } = await serve(directory);
  const browser = await found.playwright.chromium.launch({ args: ['--no-sandbox'] });
  const resultsDir = path.resolve(__dirname, '../../.dev-host');
  fs.mkdirSync(resultsDir, { recursive: true });
  const results = { playwright: found.from, nodes: dag.nodes.length, edges: dag.edges.length, runs: {} };
  try {
    for (const [theme, variables] of Object.entries(themes)) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      await page.addInitScript(({ variables, theme }) => {
        window.__messages = []; window.__csp = []; window.__errors = [];
        window.acquireVsCodeApi = () => ({ postMessage: m => window.__messages.push(m), getState: () => undefined, setState: () => {} });
        document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} blocked ${e.blockedURI || 'inline'}`));
        window.addEventListener('error', e => window.__errors.push(String(e.message)));
        document.addEventListener('DOMContentLoaded', () => {
          for (const [name, value] of Object.entries(variables)) document.documentElement.style.setProperty(name, value);
          document.body.classList.add(theme === 'dark' ? 'vscode-dark' : 'vscode-light');
        });
      }, { variables, theme });
      page.on('console', message => { if (message.type() === 'error') console.log('console error:', message.text()); });
      await page.goto(url);
      await page.waitForFunction(() => window.__messages.some(m => m.type === 'ready'));
      const fixture = parseDag(fs.readFileSync(path.join(__dirname, 'fixtures/proofmap/dag.apery-mid-session.json'), 'utf8')).dag;
      const small = await measure(page, fixture, `${theme} · Apéry fixture`);
      await page.evaluate(() => { const node = document.querySelector('#graph'); node && node.dispatchEvent(new Event('mousemove')); });
      await page.screenshot({ path: path.join(resultsDir, `proofmap-${theme}.png`) });
      const big = await measure(page, dag, `${theme} · synthetic`);
      // An unchanged export does not re-run the layout, so the warm run asks for one explicitly.
      const again = await measure(page, undefined, `${theme} · synthetic (re-layout, warm)`, { type: 'relayout' });
      await page.screenshot({ path: path.join(resultsDir, `proofmap-${theme}-500${deep ? '-deep' : ''}.png`) });
      results.runs[theme] = { fixtureMs: small.ms, syntheticMs: big.ms, syntheticWallMs: big.wallMs, syntheticWarmMs: again.ms, status: big.status };
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(resultsDir, `proofmap-perf${deep ? '-deep' : ''}.json`), JSON.stringify(results, null, 2));
  const worst = Math.max(...Object.values(results.runs).map(run => run.syntheticMs));
  console.log(`perf: worst first-paint layout for ${dag.nodes.length} nodes / ${dag.edges.length} edges = ${Math.round(worst)} ms (target ≤ 2000 ms); screenshots in .dev-host/proofmap-*.png`);
  if (worst > 2000) { console.log('FAIL: above the 2 s budget'); process.exit(1); }
  console.log('PASS: 500-node layout within the 2 s budget, no CSP violations, no console errors');
}

module.exports = { generateDag };
if (require.main === module) main().catch(error => { console.error(error); process.exit(1); });
