// Runs in stock VS Code against the real Isabelle server: Sledgehammer and
// try0 at the caret, results as CodeLens/hover/view state, insertion through
// the server's sendback, cancellation, and staleness after edits.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const { sledgehammerHtml, sledgehammerStatus, emptySledgehammer } = require('../out/sledgehammerView');
const { try0Methods } = require('../out/sledgehammer');

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const try0Set = new Set(try0Methods.split(' '));

exports.run = async function () {
  const root = path.resolve(__dirname, '../..');
  const original = fs.readFileSync(path.join(root, 'examples/Sqrt2.thy'), 'utf8');
  const source = String.raw`theory Hammer
  imports Main
begin

lemma add_zero: "x + 0 = (x::nat)" sorry

lemma rev_rev: "rev (rev xs) = xs"
  sorry

end
`;
  const directory = path.join(root, '.dev-host/sledgehammer-fixture');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'Hammer.thy');
  fs.writeFileSync(file, source);
  const document = await vscode.workspace.openTextDocument(file);
  let editor = await vscode.window.showTextDocument(document);
  const api = await vscode.extensions.getExtension('hymanimy.isabelle-revamp').activate();
  const receipts = [];
  const state = () => api.getSledgehammerState();

  async function until(label, condition, timeout = 90000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const value = await condition();
      if (value) {
        receipts.push({ check: label, state: state() });
        console.log('PASS: ' + label);
        return value;
      }
      await pause(50);
    }
    throw new Error(label + ': ' + JSON.stringify({ sledgehammer: state(), goals: api.getGoalState() }));
  }
  async function move(line, column = 2) {
    editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(line, column, line, column);
    await pause(30);
  }
  const lenses = async () => (await vscode.commands.executeCommand('vscode.executeCodeLensProvider', document.uri) ?? [])
    .filter(lens => lens.command && /Sledgehammer|try0|Try this/.test(lens.command.title));
  const hovers = async line => (await vscode.commands.executeCommand('vscode.executeHoverProvider', document.uri,
    new vscode.Position(line, 1)) ?? []).flatMap(hover => hover.contents.map(content => content.value ?? String(content)));
  const errors = () => vscode.languages.getDiagnostics(document.uri)
    .filter(d => d.severity === vscode.DiagnosticSeverity.Error);
  const goalReady = () => ['ready', 'unfinished'].includes(api.getGoalState().phase);

  try {
    // View HTML never embeds server text; status labels cover every phase.
    const html = sledgehammerHtml({ ...emptySledgehammer, theory: '<script>alert(1)</script>', line: 3 });
    assert(!html.includes('<script>alert'));
    assert(html.includes("default-src 'none'"));
    assert.equal(sledgehammerStatus({ ...emptySledgehammer, status: 'finished',
      results: [{ text: 'by simp', display: 'by simp', insertable: true, try0: false }] }), '1 proof found');
    assert.equal(sledgehammerStatus({ ...emptySledgehammer, status: 'finished', mode: 'try0', cancelled: true }), 'try0 cancelled');
    assert.equal(sledgehammerStatus({ ...emptySledgehammer, status: 'finished', errors: ['Unknown proof context'] }), 'Unknown proof context');

    await vscode.commands.executeCommand('isabelleRevamp.showSledgehammer');
    await move(4, 6);
    await until('theory processed at the lemma', () => goalReady() && api.getGoalState().text.includes('x + 0 = x'), 180000);
    await until('server prover list received', () => state().provers.includes('cvc5'), 30000);
    assert.equal(state().status, 'idle');
    assert.deepEqual(await lenses(), []);

    // Sledgehammer at the caret: waiting, running (lens + hover), then insertable results.
    await vscode.commands.executeCommand('isabelleRevamp.sledgehammer');
    assert.equal(state().status, 'waiting');
    assert.equal(state().mode, 'sledgehammer');
    let sawRunning = false;
    await until('Sledgehammer runs at the lemma', async () => {
      if (state().status === 'running' && !sawRunning) {
        sawRunning = (await lenses()).some(lens => lens.command.title === 'Sledgehammer: running…' && lens.range.start.line === 4)
          && (await hovers(4)).some(text => text.includes('Sledgehammer: running'));
      }
      return sawRunning || state().results.length > 0;
    });
    assert(sawRunning, 'running lens and hover were visible while the query ran');
    await until('a proof with by arrives', () => state().results.some(r => r.insertable && r.text.startsWith('by ')));
    await until('the run finishes with by simp from try0 preplay', () => state().status === 'finished'
      && state().results.some(r => r.text === 'by simp' && r.insertable));
    assert.equal(state().line, 4);
    assert.equal(state().theory, 'Hammer');
    assert(state().messages.some(m => /found a proof/.test(m.segments.map(s => s.text).join(''))));
    const found = state().results.find(r => r.text === 'by simp');
    assert(found.prover && /ms$/.test(found.time), JSON.stringify(found));
    const resultLenses = (await lenses()).filter(lens => lens.command.command === 'isabelleRevamp.sledgehammerInsert');
    assert(resultLenses.some(lens => lens.command.title === 'Try this: by simp' && lens.range.start.line === 4
      && lens.command.arguments[0] === 'by simp'), JSON.stringify(resultLenses));
    const hover = await hovers(4);
    assert(hover.some(text => text.includes('by simp') && text.includes('command:isabelleRevamp.sledgehammerInsert')), JSON.stringify(hover));
    // Other lines keep only the server's own hovers (keyword help, auto solve_direct).
    assert(!(await hovers(6)).some(text => text.includes('isabelleRevamp.sledgehammerInsert')));
    console.log('PASS: CodeLens and hover expose the results on the command line');

    // Insert through the server: sendback -> PIDE/sledgehammer_insert at the end of the lemma;
    // the `sorry` on that line is replaced, and the results are consumed.
    await vscode.commands.executeCommand('isabelleRevamp.sledgehammerInsert', 'by simp');
    await until('sendback inserts by simp in place of sorry', () =>
      document.lineAt(4).text === 'lemma add_zero: "x + 0 = (x::nat)" by simp');
    assert.equal(state().status, 'idle');
    assert.deepEqual(state().results, []);
    assert.deepEqual(await lenses(), []);

    // try0 only: the tactic provers answer; no ATP or SMT solver is named; the next-line sorry is replaced.
    await move(6, 6);
    await until('rev_rev goal', () => goalReady() && api.getGoalState().text.includes('rev (rev xs) = xs'));
    await vscode.commands.executeCommand('isabelleRevamp.try0');
    assert.equal(state().mode, 'try0');
    await until('try0 finishes with a proof', () => state().status === 'finished' && state().results.some(r => r.insertable));
    const names = state().messages.map(m => /^(\S+) found a proof/.exec(m.segments.map(s => s.text).join(''))?.[1]).filter(Boolean);
    assert(names.length > 0 && names.every(name => try0Set.has(name)), JSON.stringify(names));
    assert(state().results.every(r => r.try0 && try0Set.has(r.prover)), JSON.stringify(state().results));
    assert((await lenses()).some(lens => /^Try this: by /.test(lens.command.title) && lens.range.start.line === 6));
    const proof = state().results.find(r => r.insertable).text;
    await vscode.commands.executeCommand('isabelleRevamp.sledgehammerInsert', proof);
    await until('next-line sorry replaced by the try0 proof', () => document.lineAt(7).text === '  ' + proof);
    assert(!document.getText().includes('sorry'));
    await move(6, 6);
    await until('theory fully checked after both insertions', () =>
      api.getGoalState().checkStatus === 'fully_checked' && errors().length === 0, 120000);

    // Cancel: a goal the provers cannot settle quickly, interrupted while running.
    const hard = document.getText().replace('\nend\n',
      '\nfun tri :: "nat \\<Rightarrow> nat" where "tri 0 = 0" | "tri (Suc n) = Suc n + tri n"\n\nlemma tri_gauss: "2 * tri n = n * (n + 1)"\n  sorry\n\nend\n');
    assert(await editor.edit(edit => edit.replace(new vscode.Range(0, 0, document.lineCount, 0), hard)));
    await move(11, 6);
    await until('hard lemma goal', () => goalReady() && api.getGoalState().text.includes('tri n'), 120000);
    await vscode.commands.executeCommand('isabelleRevamp.sledgehammer');
    await until('hard run is running', () => state().status === 'running');
    await vscode.commands.executeCommand('isabelleRevamp.sledgehammerCancel');
    assert.equal(state().cancelled, true);
    assert((await lenses()).some(lens => lens.command.title === 'Sledgehammer: cancelling…'));
    await until('cancel finishes the run', () => state().status === 'finished' && state().cancelled);
    assert.equal(state().line, 11);
    if (!state().results.some(r => r.insertable)) {
      assert((await lenses()).some(lens => lens.command.title === 'Sledgehammer: cancelled'));
      assert(state().messages.some(m => m.kind === 'error' && /Interrupt/.test(m.segments.map(s => s.text).join(''))),
        JSON.stringify(state().messages));
    }
    receipts.push({ check: 'cancel output', state: state() });

    // Editing the command's line drops its results; an edit above it keeps them on the moved line.
    assert(await editor.edit(edit => edit.insert(new vscode.Position(10, 0), '\n')));
    assert.equal(state().line, 12);
    assert.equal(state().status, 'finished');
    assert(await editor.edit(edit => edit.insert(new vscode.Position(12, 0), ' ')));
    assert.equal(state().status, 'idle');
    assert.equal(state().line, undefined);
    assert.deepEqual(await lenses(), []);
    console.log('PASS: results follow line shifts and clear when the command changes');

    fs.writeFileSync(path.join(root, '.dev-host/sledgehammer-results.json'), JSON.stringify(receipts, null, 2));
    assert.equal(fs.readFileSync(path.join(root, 'examples/Sqrt2.thy'), 'utf8'), original);
    console.log('Sledgehammer integration checks passed. Original example unchanged.');
  } catch (error) {
    fs.writeFileSync(path.join(root, '.dev-host/sledgehammer-results.json'), JSON.stringify({
      error: String(error), state: state(), goals: api.getGoalState(), receipts,
    }, null, 2));
    throw error;
  } finally {
    editor = await vscode.window.showTextDocument(document);
    await editor.edit(edit => edit.replace(new vscode.Range(0, 0, document.lineCount, 0), source));
    await document.save();
  }
};
