// ProofMap acceptance test, run inside stock VS Code via --extensionTestsPath
// (scripts/check_proofmap.sh). No Isabelle output is needed by the feature,
// but the extension's activation still starts the language server as usual.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let describe = () => '';
async function until(label, condition, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = condition();
    if (value) return value;
    await pause(100);
  }
  throw new Error('timeout waiting for ' + label + '\n' + describe());
}

exports.run = async function () {
  const root = path.resolve(__dirname, '../..');
  const fixture = path.join(__dirname, 'fixtures/proofmap/dag.apery-mid-session.json');
  const api = await vscode.extensions.getExtension('hymanimy.isabelle-revamp').activate();
  describe = () => { const s = api.getProofMapState(); return s ? JSON.stringify({ source: s.source, claimsPath: s.claimsPath, error: s.error, claims: s.claims, log: s.log.slice(-25) }, null, 1) : 'no panel'; };
  const settings = vscode.workspace.getConfiguration('isabelleRevamp');
  const settingsFile = path.join(root, '.vscode/settings.json');
  const originalSettings = fs.readFileSync(settingsFile, 'utf8');
  const priorDag = settings.inspect('proofMap.dagPath').workspaceValue;
  const priorClaims = settings.inspect('proofMap.claimsPath').workspaceValue;
  const live = path.join(root, '.dev-host/proofmap');
  fs.rmSync(live, { recursive: true, force: true });
  fs.mkdirSync(path.join(live, 'out'), { recursive: true });
  fs.mkdirSync(path.join(live, 'thys/Apery'), { recursive: true });
  // A stand-in theory at the fixture's path, so file:line opens without thys/Apery in the repo.
  const theory = path.join(live, 'thys/Apery/Bounds.thy');
  fs.writeFileSync(theory, ['theory Bounds imports Complex_Main begin', ...Array.from({ length: 60 }, (_, i) =>
    i === 38 ? 'lemma linear_form_small: "True"' : i === 39 ? '  sorry' : `(* line ${i + 2} *)`), 'end', ''].join('\n'));
  const commands = await vscode.commands.getCommands(true);
  for (const name of ['isabelleRevamp.showProofMap', 'isabelleRevamp.showProofMapInNewWindow', 'isabelleRevamp.proofMap.fit',
    'isabelleRevamp.proofMap.reload', 'isabelleRevamp.proofMap.openSnapshot']) assert(commands.includes(name), name);
  console.log('PASS: the five ProofMap commands are registered');
  try {
    // 1. Replay snapshot through the command, with a path argument.
    const opened = await vscode.commands.executeCommand('isabelleRevamp.proofMap.openSnapshot', fixture);
    assert.equal(opened, true);
    let state = await until('snapshot loaded', () => { const s = api.getProofMapState(); return s && s.nodes.length === 12 ? s : undefined; });
    assert.deepEqual(state.counts, { missing: 1, defined: 1, sorry: 3, proved: 2, fully_proved: 5, oracle: 0 });
    assert.equal(state.edges.length, 20);
    assert.equal(state.source.live, false);
    // The claims sidecar is tiny and may be read before the export, so only the presence is fixed.
    assert(state.events.some(e => e.kind === 'loaded' && /12 nodes and 20 edges/.test(e.message)), JSON.stringify(state.events));
    assert.equal(state.holes[0].id, 'Apery.Bounds.linear_form_small');
    state = await until('claims sidecar next to the snapshot', () => { const s = api.getProofMapState(); return s.claims.length === 1 ? s : undefined; });
    assert.equal(state.claims[0].pr, 58);
    assert(state.events.some(e => e.kind === 'claim_added' && e.id === 'Apery.Bounds.linear_form_small'));
    console.log('PASS: openSnapshot loaded 12 Apéry nodes with the expected counts, ranking and claim');

    // 2. The webview ran the bundle under the CSP and laid the graph out.
    state = await until('layout report from the webview', () => { const s = api.getProofMapState(); return s.layout && s.layout.nodes === 12 ? s : undefined; }, 40000);
    assert.equal(state.layout.edges, 20);
    assert(state.layout.ms >= 0 && state.layout.ms < 10000, String(state.layout.ms));
    console.log(`PASS: webview laid out 12 nodes in ${Math.round(state.layout.ms)} ms (bundled Cytoscape under the nonce CSP)`);

    // 3. Live file: point dagPath at a temp out/dag.json, then rewrite it and wait for the watcher.
    const liveDag = path.join(live, 'out/dag.json');
    fs.writeFileSync(liveDag, fs.readFileSync(fixture));
    await settings.update('proofMap.dagPath', '.dev-host/proofmap/out/dag.json', vscode.ConfigurationTarget.Workspace);
    await settings.update('proofMap.claimsPath', '.dev-host/proofmap/out/claims.json', vscode.ConfigurationTarget.Workspace);
    state = await until('live file attached', () => { const s = api.getProofMapState(); return s.source && s.source.live && s.source.path === liveDag ? s : undefined; });
    assert.equal(state.nodes.length, 12);
    // The live claims path has no file yet: the snapshot's claim is released.
    const liveClaims = path.join(live, 'out/claims.json');
    state = await until('claims sidecar path attached', () => { const s = api.getProofMapState(); return s.claimsPath === liveClaims ? s : undefined; });
    state = await until('claim released after switching to the live sidecar path', () => { const s = api.getProofMapState(); return s.claims.length === 0 ? s : undefined; });
    const before = state.events.length;
    const modified = JSON.parse(fs.readFileSync(fixture, 'utf8'));
    modified.nodes.find(n => n.id === 'Apery.Bounds.linear_form_small').status = 'proved';
    modified.nodes.find(n => n.id === 'Apery.Bounds.tail_bound').status = 'proved';
    modified.generated_at = '2026-10-17T12:30:00Z';
    // Simulate the exporter mid-write: a truncated file first, the complete one shortly after.
    const text = JSON.stringify(modified, null, 1);
    fs.writeFileSync(liveDag, text.slice(0, Math.floor(text.length / 2)));
    await pause(120);
    fs.writeFileSync(liveDag, text);
    state = await until("status_changed event from the watcher", () => {
      const s = api.getProofMapState();
      return s.events.slice(before).some(e => e.kind === 'status_changed' && e.id === 'Apery.Bounds.linear_form_small' && e.to === 'proved') ? s : undefined;
    }, 15000);
    const regression = state.events.find(e => e.kind === 'status_changed' && e.id === 'Apery.Bounds.tail_bound');
    assert(regression && regression.regression === true && regression.severity === 'warning', JSON.stringify(regression));
    assert(!state.error, state.error);
    assert.equal(state.counts.sorry, 2);
    assert.equal(state.nodes.find(n => n.id === 'Apery.Bounds.linear_form_small').status, 'proved');
    console.log('PASS: watcher picked up the rewrite (after a partial write), diffed it into status_changed and a flagged regression');

    // Claims sidecar appears later: the viewer worked without it, then shows the claim.
    fs.writeFileSync(path.join(live, 'out/claims.json'), JSON.stringify({ claims: [{ id: 'Apery.Telescoping.double_sum_swap', pr: 61, branch: 'agent/double-sum-swap' }] }));
    state = await until('claim from the live sidecar', () => { const s = api.getProofMapState(); return s.claims.some(c => c.pr === 61) ? s : undefined; }, 15000);
    assert(state.events.some(e => e.kind === 'claim_removed' && e.id === 'Apery.Bounds.linear_form_small'));
    console.log('PASS: claims.json sidecar is optional and live');

    // 4. A synthetic 'open' request from the webview opens file:line.
    await api.proofMapMessage({ type: 'open', id: 'Apery.Bounds.linear_form_small' });
    state = await until('file opened', () => { const s = api.getProofMapState(); return s.lastOpened ? s : undefined; });
    assert.equal(state.lastOpened.line, 40);
    assert(state.lastOpened.file.endsWith(path.join('thys', 'Apery', 'Bounds.thy')), state.lastOpened.file);
    const editor = await until('editor on Bounds.thy', () => {
      const e = vscode.window.activeTextEditor; return e && e.document.uri.fsPath.endsWith('Bounds.thy') ? e : undefined;
    });
    assert.equal(editor.selection.active.line, 39);
    assert.equal(editor.document.lineAt(39).text, 'lemma linear_form_small: "True"');
    assert.equal(editor.document.lineAt(40).text, '  sorry');
    console.log('PASS: open request opened thys/Apery/Bounds.thy at line 40');

    // Selection and malformed messages.
    await api.proofMapMessage({ type: 'select', id: 'Apery.Main.apery_series' });
    assert.equal(api.getProofMapState().selected, 'Apery.Main.apery_series');
    await api.proofMapMessage({ type: 'open', id: 42 });
    await api.proofMapMessage({ type: 'frobnicate' });
    await api.proofMapMessage('garbage');
    assert.equal(api.getProofMapState().lastOpened.id, 'Apery.Bounds.linear_form_small');
    // A missing node explains itself and does not open anything (blueprint.yaml is absent here).
    await api.proofMapMessage({ type: 'open', id: 'Apery.Main.zeta3_bridge' });
    await pause(300);
    assert.equal(api.getProofMapState().lastOpened.id, 'Apery.Bounds.linear_form_small');
    console.log('PASS: select recorded; malformed and missing-node requests are ignored safely');

    // 5. Pop-out command does not throw (headless: the move may be a no-op); fit/reload commands run.
    await vscode.commands.executeCommand('isabelleRevamp.showProofMapInNewWindow');
    await vscode.commands.executeCommand('isabelleRevamp.proofMap.fit');
    await vscode.commands.executeCommand('isabelleRevamp.proofMap.reload');
    state = await until('reload re-read the live file', () => { const s = api.getProofMapState(); return s.source && s.source.live ? s : undefined; });
    assert.equal(state.nodes.length, 12);
    await vscode.commands.executeCommand('isabelleRevamp.showProofMap');
    console.log('PASS: showProofMapInNewWindow, fit, reload and showProofMap ran without throwing');

    // 6. A missing export file is an explained empty state, not an error dialog.
    fs.rmSync(liveDag);
    state = await until('missing file reported', () => { const s = api.getProofMapState(); return s.error && s.error.includes('No dag.json') ? s : undefined; }, 15000);
    console.log('PASS: missing dag.json is reported in the panel state: ' + state.error);
    fs.writeFileSync(path.join(root, '.dev-host/proofmap-results.json'), JSON.stringify({ ...api.getProofMapState(), passed: true }, null, 2));
  } finally {
    await settings.update('proofMap.dagPath', priorDag, vscode.ConfigurationTarget.Workspace);
    await settings.update('proofMap.claimsPath', priorClaims, vscode.ConfigurationTarget.Workspace);
    // VS Code reformats neighbouring settings when removing our temporary keys.
    if (JSON.stringify(JSON.parse(fs.readFileSync(settingsFile, 'utf8'))) === JSON.stringify(JSON.parse(originalSettings))) {
      fs.writeFileSync(settingsFile, originalSettings);
    }
  }
};
