// Pure unit tests for the ProofMap core (no VS Code): run with
//   npm run compile --prefix extension && node extension/test/unit_proofmap.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseDag, parseClaims, statusCounts, factName } = require('../out/map/core/types');
const { diffDags, diffClaims, changedNodeIds, isRegression } = require('../out/map/core/dagDiff');
const { rankHoles } = require('../out/map/core/dagRank');
const { mapSymbols, hasRawSymbols, bundledSymbols } = require('../out/map/core/symbols');
const { encodeMessage, parseWebviewMessage, parseHostMessage } = require('../out/map/core/protocol');
const { proofMapHtml, proofMapCsp } = require('../out/map/htmlTemplate');
const { resolveWithin, isInside } = require('../out/map/filePaths');

const fixtureDir = path.join(__dirname, 'fixtures/proofmap');
const fixtureText = fs.readFileSync(path.join(fixtureDir, 'dag.apery-mid-session.json'), 'utf8');
const B = name => `Apery.${name}`;
const clone = value => structuredClone(value);
let passed = 0;
function check(label, fn) { fn(); passed += 1; console.log('PASS: ' + label); }

// ---------- C1 parsing ----------
check('fixture parses: 12 nodes, 20 edges, expected counts, no warnings', () => {
  const { dag, warnings } = parseDag(fixtureText);
  assert.deepEqual(warnings, []);
  assert.equal(dag.nodes.length, 12);
  assert.equal(dag.edges.length, 20);
  assert.equal(dag.session, 'Apery');
  assert.deepEqual(statusCounts(dag), { missing: 1, defined: 1, sorry: 3, proved: 2, fully_proved: 5, oracle: 0 });
  assert.equal(factName(dag.nodes[0]), 'apery_term');
  for (const node of dag.nodes) assert.match(node.statement_sha1, /^[0-9a-f]{40}$/);
});

check('tolerant parser: dangling edge, unknown status, bad line and duplicate id are dropped and reported; schema_version warns', () => {
  const raw = JSON.parse(fixtureText);
  raw.schema_version = 2;
  raw.edges.push({ from: B('Main.apery_series'), to: 'Nowhere.T.x', kind: 'uses' });
  raw.edges.push({ from: B('Main.apery_series'), to: B('Main.zeta3_bridge'), kind: 'teleports' });
  raw.nodes.push({ ...raw.nodes[1], id: 'Apery.Bad.status', status: 'maybe' });
  raw.nodes.push({ ...raw.nodes[1], id: 'Apery.Bad.line', line: 0 });
  raw.nodes.push({ ...raw.nodes[1] });
  raw.nodes.push('not an object');
  const { dag, warnings } = parseDag(raw);
  assert.equal(dag.nodes.length, 12);
  assert.equal(dag.edges.length, 20);
  assert.equal(warnings.length, 7, warnings.join('\n'));
  assert(warnings.some(w => w.includes('schema_version 2')));
  assert(warnings.some(w => w.includes('dangling')));
  assert(warnings.some(w => w.includes('unknown status maybe')));
  assert(warnings.some(w => w.includes('duplicate id')));
  assert.throws(() => parseDag('[]'), /not a JSON object/);
});

check('claims sidecar parses, sorts by id and tolerates junk; absent file is an empty list', () => {
  const { claims, warnings } = parseClaims(fs.readFileSync(path.join(fixtureDir, 'claims.json'), 'utf8'));
  assert.deepEqual(warnings, []);
  assert.deepEqual(claims, [{ id: B('Bounds.linear_form_small'), pr: 58, branch: 'agent/linear-form-small', since: '2026-10-17T11:49:12Z' }]);
  const messy = parseClaims({ claims: [{ id: 'Z.T.b' }, { pr: 3 }, { id: 'A.T.a', pr: '7' }] });
  assert.deepEqual(messy.claims.map(c => c.id), ['A.T.a', 'Z.T.b']);
  assert.equal(messy.claims[0].pr, undefined);
  assert.equal(messy.warnings.length, 1);
  assert.deepEqual(parseClaims({}).claims, []);
});

// ---------- ranking ----------
check('rankHoles follows the next_holes rule on the Apéry fixture', () => {
  const { dag } = parseDag(fixtureText);
  const holes = rankHoles(dag);
  assert.deepEqual(holes.map(h => [h.rank, h.id, h.leverage, h.rests_on_holes]), [
    [1, B('Bounds.linear_form_small'), 3, 0],   // no hole underneath, highest leverage
    [2, B('Telescoping.double_sum_swap'), 2, 0],
    [3, B('Main.apery_series_limit'), 1, 2],     // rests on the two holes above
  ]);
  assert.equal(holes[0].line, 40);
  assert.equal(holes[0].file, 'thys/Apery/Bounds.thy');
  // Tie-break: equal holes and leverage → shortest statement, then id.
  const tie = { nodes: [
    { id: 'S.T.b', theory: 'S.T', file: 'f', line: 1, kind: 'theorem', status: 'sorry', statement: 'longer statement', statement_sha1: '' },
    { id: 'S.T.a', theory: 'S.T', file: 'f', line: 2, kind: 'theorem', status: 'sorry', statement: 'longer statement', statement_sha1: '' },
    { id: 'S.T.c', theory: 'S.T', file: 'f', line: 3, kind: 'theorem', status: 'sorry', statement: 'short', statement_sha1: '' },
  ], edges: [] };
  assert.deepEqual(rankHoles(tie).map(h => h.id), ['S.T.c', 'S.T.a', 'S.T.b']);
  // Shuffled input gives the same ranking.
  const shuffled = { nodes: [...dag.nodes].reverse(), edges: [...dag.edges].reverse() };
  assert.deepEqual(rankHoles(shuffled).map(h => h.id), holes.map(h => h.id));
});

// ---------- diff ----------
check('diffDags: first load is one loaded event; identical exports give no events', () => {
  const { dag } = parseDag(fixtureText);
  const first = diffDags(undefined, dag);
  assert.equal(first.length, 1);
  assert.equal(first[0].kind, 'loaded');
  assert.match(first[0].message, /12 nodes and 20 edges of Apery/);
  assert.deepEqual(diffDags(dag, clone(dag)), []);
});

check('diffDags: added / removed / status changed / regression / statement changed / edges, deterministic and ordered', () => {
  const { dag: before } = parseDag(fixtureText);
  const after = clone(before);
  const node = id => after.nodes.find(n => n.id === id);
  node(B('Bounds.linear_form_small')).status = 'proved';                 // agent closed the hole: success
  node(B('Bounds.tail_bound')).status = 'proved';                         // fully_proved -> proved: regression
  node(B('Telescoping.partial_sum_identity')).statement_sha1 = 'ffff' + 'e'.repeat(36);   // statement edited
  after.nodes = after.nodes.filter(n => n.id !== B('Telescoping.double_sum_swap'));          // removed
  after.edges = after.edges.filter(e => e.to !== B('Telescoping.double_sum_swap'));
  after.nodes.push({ id: 'Apery.Main.new_lemma', kind: 'theorem', theory: 'Apery.Main', file: 'thys/Apery/Main.thy', line: 70,
    status: 'sorry', statement: 'True', statement_sha1: '0'.repeat(40) });                  // added
  after.edges.push({ from: 'Apery.Main.new_lemma', to: B('Main.apery_series'), kind: 'uses' });
  const events = diffDags(before, after);
  assert.deepEqual(events.map(e => e.kind), [
    'node_removed', 'node_added', 'status_changed', 'status_changed', 'statement_changed', 'edge_removed', 'edge_added',
  ]);
  const [removed, added, linear, tail, statement, edgeRemoved, edgeAdded] = events;
  assert.equal(removed.id, B('Telescoping.double_sum_swap'));
  assert.equal(removed.severity, 'warning');
  assert.equal(added.id, 'Apery.Main.new_lemma');
  assert.equal(linear.id, B('Bounds.linear_form_small'));
  assert.deepEqual([linear.from, linear.to, linear.severity, linear.regression], ['sorry', 'proved', 'success', undefined]);
  assert.equal(tail.id, B('Bounds.tail_bound'));
  assert.deepEqual([tail.from, tail.to, tail.severity, tail.regression], ['fully_proved', 'proved', 'warning', true]);
  assert.match(tail.message, /regressed/);
  assert.equal(statement.id, B('Telescoping.partial_sum_identity'));
  assert.equal(statement.severity, 'warning');
  assert.match(statement.message, /statement changed/);
  assert.equal(edgeRemoved.id, `${B('Main.apery_series_limit')} -> ${B('Telescoping.double_sum_swap')} (uses)`);
  assert.equal(edgeAdded.id, `Apery.Main.new_lemma -> ${B('Main.apery_series')} (uses)`);
  // Determinism: shuffling both inputs changes nothing.
  const shuffle = dag => ({ ...dag, nodes: [...dag.nodes].reverse(), edges: [...dag.edges].reverse() });
  assert.deepEqual(diffDags(shuffle(before), shuffle(after)), events);
  assert.deepEqual(changedNodeIds(events), [B('Bounds.linear_form_small'), B('Bounds.tail_bound'), 'Apery.Main.new_lemma', B('Telescoping.partial_sum_identity')]);
  // Status changes are listed in id order.
  assert(linear.id < tail.id);
});

check('isRegression: down the ladder, into oracle or missing', () => {
  assert.equal(isRegression('fully_proved', 'proved'), true);
  assert.equal(isRegression('proved', 'sorry'), true);
  assert.equal(isRegression('proved', 'oracle'), true);
  assert.equal(isRegression('proved', 'missing'), true);
  assert.equal(isRegression('sorry', 'proved'), false);
  assert.equal(isRegression('proved', 'fully_proved'), false);
  assert.equal(isRegression('defined', 'defined'), false);
  assert.equal(isRegression('missing', 'sorry'), false);
});

check('diffClaims reports taken and released holes', () => {
  const events = diffClaims([{ id: 'S.T.old' }], [{ id: 'S.T.new', pr: 9, branch: 'agent/new' }]);
  assert.deepEqual(events.map(e => [e.kind, e.id]), [['claim_removed', 'S.T.old'], ['claim_added', 'S.T.new']]);
  assert.match(events[1].message, /PR #9 · agent\/new/);
  assert.deepEqual(changedNodeIds(events), ['S.T.new']);
});

// ---------- symbols ----------
check('mapSymbols: known names, scripts, cartouches; unknown names render as ⟨name⟩; nothing raw survives', () => {
  assert.equal(mapSymbols(String.raw`\<forall>x. \<lambda>y. x \<le> y \<longrightarrow> \<not> (y < x)`), '∀x. λy. x ≤ y ⟶ ¬ (y < x)');
  assert.equal(mapSymbols(String.raw`\<Sum>k<n. 1 / real (k+1)^3`), '∑k<n. 1 / real (k+1)³');
  assert.equal(mapSymbols(String.raw`x\<^sub>1 + y\<^sup>2 \<open>text\<close>`), 'x₁ + y² ‹text›');
  assert.equal(mapSymbols(String.raw`\<frobnicate> and \<^weird>`), '⟨frobnicate⟩ and ⟨^weird⟩');
  assert.equal(mapSymbols(String.raw`broken \<foo`), 'broken ⟨foo⟩');
  assert.equal(mapSymbols('plain ∀ already converted'), 'plain ∀ already converted');
  assert.equal(mapSymbols(String.raw`\<forall>`, { forall: 'FORALL' }), 'FORALL');
  assert(Object.keys(bundledSymbols).length > 400);
  const { dag } = parseDag(fixtureText);
  for (const node of dag.nodes) {
    const shown = mapSymbols(node.statement);
    assert(!hasRawSymbols(shown) && !shown.includes('\\<'), `${node.id}: ${shown}`);
    assert(!shown.includes('\\'), `${node.id}: backslash survived in ${shown}`);
  }
  assert.equal(hasRawSymbols(String.raw`\<forall>`), true);
  assert.equal(hasRawSymbols('∀'), false);
});

// ---------- protocol ----------
check('protocol round-trips every message kind and rejects malformed ones', () => {
  const webviewMessages = [
    { type: 'ready' }, { type: 'open', id: 'S.T.a' }, { type: 'select', id: 'S.T.a' }, { type: 'select', id: null },
    { type: 'reload' }, { type: 'openSnapshot' }, { type: 'newWindow' }, { type: 'followAgent', on: false },
    { type: 'layout', ms: 123.5, nodes: 12, edges: 20 }, { type: 'log', text: 'hello' },
  ];
  for (const message of webviewMessages) {
    assert.deepEqual(parseWebviewMessage(encodeMessage(message)), message);
    assert.deepEqual(parseWebviewMessage(JSON.parse(encodeMessage(message))), message);
  }
  const state = { version: 1, counts: statusCounts({ nodes: [] }), holes: [], claims: [], events: [], warnings: [], followAgent: true, budget: 500 };
  const hostMessages = [
    { type: 'state', state, changed: ['S.T.a'] }, { type: 'symbols', table: { forall: '∀' } }, { type: 'select', id: 'S.T.a' },
    { type: 'fit' }, { type: 'relayout' }, { type: 'followAgent', on: true },
  ];
  for (const message of hostMessages) assert.deepEqual(parseHostMessage(encodeMessage(message)), message);
  for (const bad of [undefined, null, 'not json', '{"type":"open"}', { type: 'evil' }, { type: 'open', id: 7 },
    { type: 'layout', ms: 'fast' }, { type: 'followAgent', on: 'yes' }, [], 42]) {
    assert.equal(parseWebviewMessage(bad), undefined, JSON.stringify(bad));
    assert.equal(parseHostMessage(bad), undefined, JSON.stringify(bad));
  }
  // Extra fields are dropped, not forwarded.
  assert.deepEqual(parseWebviewMessage({ type: 'open', id: 'x', __proto__: null, extra: 1 }), { type: 'open', id: 'x' });
});

// ---------- opening files ----------
check('resolveWithin: files open only under the workspace, the export root or ISABELLE_HOME; absolute, ../ and symlink escapes are refused', () => {
  const files = new Set(['/ws/thys/Apery/Bounds.thy', '/repo/thys/Apery/Bounds.thy', '/isa/src/HOL/Main.thy', '/etc/passwd', '/ws/link.thy', '/wsx/secret.thy']);
  const lookup = { exists: p => files.has(p), realpath: p => p === '/ws/link.thy' ? '/etc/passwd' : p };
  const roots = ['/ws', '/repo', '/isa'];
  assert.deepEqual(resolveWithin('thys/Apery/Bounds.thy', roots, lookup), { path: '/ws/thys/Apery/Bounds.thy' });
  assert.deepEqual(resolveWithin('thys/Apery/Bounds.thy', ['/nowhere', '/repo'], lookup), { path: '/repo/thys/Apery/Bounds.thy' });
  assert.deepEqual(resolveWithin('/isa/src/HOL/Main.thy', roots, lookup), { path: '/isa/src/HOL/Main.thy' });
  assert.deepEqual(resolveWithin('/etc/passwd', roots, lookup), { refused: '/etc/passwd' });
  assert.deepEqual(resolveWithin('../etc/passwd', roots, lookup), { refused: '/etc/passwd' });
  assert.deepEqual(resolveWithin('/ws/../etc/passwd', roots, lookup), { refused: '/etc/passwd' });
  assert.deepEqual(resolveWithin('link.thy', roots, lookup), { refused: '/ws/link.thy' });
  assert.deepEqual(resolveWithin('/wsx/secret.thy', roots, lookup), { refused: '/wsx/secret.thy' });   // a sibling that shares the prefix
  assert.deepEqual(resolveWithin('missing.thy', roots, lookup), {});
  assert.deepEqual(resolveWithin('thys/Apery/Bounds.thy', [], lookup), {});
  assert(isInside('/ws', '/ws') && isInside('/ws', '/ws/a/b') && !isInside('/ws', '/wsx/a') && !isInside('/ws', '/') && !isInside('/ws', '/ws/../etc'));
});

// ---------- document ----------
check('webview document: nonce CSP without inline styles, static markup only, expected ids', () => {
  const html = proofMapHtml({ nonce: 'abc123', cspSource: 'https://cdn.example', scriptUri: 'https://cdn.example/map.js', styleUri: 'https://cdn.example/map.css' });
  const csp = proofMapCsp({ nonce: 'abc123', cspSource: 'https://cdn.example' });
  assert(html.includes(`content="${csp}"`));
  assert(csp.startsWith("default-src 'none'"));
  assert(csp.includes("script-src 'nonce-abc123'"));
  assert(!csp.includes('unsafe-inline') && !csp.includes('unsafe-eval'));
  assert(!/img-src[^;]*\shttps:(\s|;|$)/.test(csp), 'img-src must not allow the bare https: scheme (any host)');
  assert(!/<style/.test(html) && !/ style="/.test(html) && !/<script(?! nonce=)/.test(html));
  assert(!html.includes('http://') && !/https:\/\/(?!cdn\.example)/.test(html));
  for (const id of ['toolbar', 'fit', 'relayout', 'reload', 'filter', 'follow', 'snapshot', 'newwindow', 'graph', 'tooltip',
    'empty', 'empty-text', 'counts', 'summary', 'next-hole', 'claims', 'details-empty', 'details-body', 'events', 'legend', 'status']) {
    assert(html.includes(`id="${id}"`), id);
  }
  const bundle = path.join(__dirname, '../dist/webview/map.js');
  if (fs.existsSync(bundle)) {
    const js = fs.readFileSync(bundle, 'utf8');
    for (const id of ['graph', 'details-body', 'events', 'status']) assert(js.includes(`"${id}"`), 'bundle uses #' + id);
    assert(!js.includes('innerHTML'), 'bundle must not use innerHTML');
    assert(!/https?:\/\/[a-z]+\.[a-z]+\/[^\s"']*\.js/.test(js), 'bundle must not reference remote scripts');
    assert(js.includes('tight-tree') && js.includes('"BT"'), 'dagre rankDir BT with the tight-tree ranker');
  }
});

console.log(`unit_proofmap: ${passed} checks passed`);
