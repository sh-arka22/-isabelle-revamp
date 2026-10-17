// Alex's quick wins against stock VS Code and the real Isabelle server:
// goals panel beside the editor, hover, library locking and server restart.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.run = async function () {
  await require('./highlighting.cjs').checkHighlighting(vscode.env.appRoot);
  await require('./unit_quickwins.cjs').check();
  const root = path.resolve(__dirname, '../..');
  const original = fs.readFileSync(path.join(root, 'examples/Sqrt2.thy'), 'utf8');
  const fixture = String.raw`theory Sqrt2
  imports Complex_Main
begin

theorem sqrt2_irrational: "sqrt (2 :: real) \<notin> \<rat>"
proof -
  show ?thesis
    sorry
qed

value "(2::nat) + 2"

end
`;
  const directory = path.join(root, '.dev-host/quickwins-fixture');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'Sqrt2.thy');
  fs.writeFileSync(file, fixture);
  assert.equal(vscode.workspace.getConfiguration('isabelleRevamp').get('goalsPanel'), 'beside');
  const document = await vscode.workspace.openTextDocument(file);
  let editor = await vscode.window.showTextDocument(document);
  const api = await vscode.extensions.getExtension('hymanimy.isabelle-revamp').activate();
  const results = {};

  async function until(label, condition, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (condition()) { console.log('PASS: ' + label); return; }
      await pause(25);
    }
    throw new Error(label + ': ' + JSON.stringify({ goal: api.getGoalState(), panel: api.getGoalPanelState(),
      status: api.getServerStatus(), locked: api.getLockedDocuments() }));
  }
  const ready = () => ['ready', 'unfinished'].includes(api.getGoalState().phase);
  async function move(line, column = 4) {
    editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(line, column, line, column);
    await pause(30);
  }

  // Item 4: the goals panel opens beside the editor without taking focus.
  await until('goals panel opened beside the editor', () => api.getGoalPanelState().open && api.getGoalPanelState().autoOpened);
  assert.equal(vscode.window.activeTextEditor?.document.uri.toString(), document.uri.toString(), 'the editor keeps focus');
  await vscode.commands.executeCommand('isabelleRevamp.showGoals');
  await until('sidebar and panel share one goals model', () => api.getGoalPanelState().attached >= 2);
  await vscode.commands.executeCommand('isabelleRevamp.openGoalsPanel');
  assert.equal(api.getGoalPanelState().open, true, 'reopening reveals the existing panel');
  await move(6);
  await until('sqrt 2 goal in the shared model', () => ready() && api.getGoalState().text.includes('sqrt 2 ∉ ℚ'));
  const goal = api.getGoalState().text;
  results.panel = { ...api.getGoalPanelState(), goal };

  // Item 5: the status bar follows the server and the active theory.
  await until('status bar reports the server', () => ['ready', 'checking'].includes(api.getServerStatus()));

  // Item 3: hover shows constants, types and command output with Unicode symbols.
  async function hover(line, character, label) {
    const end = Date.now() + 60000;
    while (Date.now() < end) {
      const hovers = await vscode.commands.executeCommand('vscode.executeHoverProvider', document.uri, new vscode.Position(line, character));
      const values = (hovers ?? []).flatMap(item => item.contents.map(content => typeof content === 'string' ? content : content.value));
      if (values.length) { results['hover ' + label] = values; return values; }
      await pause(500);
    }
    throw new Error('No hover for ' + label);
  }
  const sqrt = await hover(4, 27, 'sqrt');
  assert(sqrt.some(value => value.includes('::') || value.includes('constant')), JSON.stringify(sqrt));
  // appendCodeblock starts its fence on a fresh line.
  assert(sqrt.every(value => /^\s*```isabelle\n/.test(value)), 'hover renders as an Isabelle code block: ' + JSON.stringify(sqrt));
  assert(sqrt.some(value => value.includes('⇒')) && sqrt.every(value => !value.includes('\\<Rightarrow>')), 'hover decodes symbols');
  console.log('PASS: hover on sqrt shows the constant and its type with Unicode arrows');
  const value = await hover(10, 0, 'value');
  assert(value.some(text => text.includes('"4"') || text.includes('command')), JSON.stringify(value));
  console.log('PASS: hover on value shows the evaluated result');
  const rat = await hover(4, 56, 'rat');
  assert(rat.some(text => text.includes('set') || text.includes('Rats')), JSON.stringify(rat));

  // Item 1: library files reached from the editor are read-only for the session.
  const roots = api.getLibraryRoots();
  assert(roots.length >= 1, 'ISABELLE_HOME is known');
  const seq = path.join(roots[0], 'src/HOL/Examples/Seq.thy');
  assert(fs.existsSync(seq), seq);
  const linked = path.join(directory, 'Linked.thy');
  try { fs.unlinkSync(linked); } catch { /* absent */ }
  fs.symlinkSync(seq, linked);
  const library = await vscode.workspace.openTextDocument(seq);
  await vscode.window.showTextDocument(library);
  await until('HOL/Examples/Seq.thy is locked when it becomes active', () => api.getLockedDocuments().includes(library.uri.fsPath));
  const linkedDocument = await vscode.workspace.openTextDocument(linked);
  await vscode.window.showTextDocument(linkedDocument);
  await until('a workspace symlink into the library is locked too', () => api.getLockedDocuments().includes(linkedDocument.uri.fsPath));
  await vscode.window.showTextDocument(document);
  await pause(300);
  assert(!api.getLockedDocuments().includes(document.uri.fsPath), 'workspace theories stay writable');
  results.locked = api.getLockedDocuments();
  await vscode.commands.executeCommand('workbench.action.closeEditorsToTheRight');

  // Item 5: restart the language server and recover the same goal.
  await move(6);
  await until('goal shown before restart', () => ready() && api.getGoalState().text === goal);
  const restarted = vscode.commands.executeCommand('isabelleRevamp.restartServer');
  await until('restart marks the server as starting', () => api.getServerStatus() === 'starting', 5000);
  await restarted;
  await until('server ready after restart', () => ['ready', 'checking'].includes(api.getServerStatus()), 90000);
  await move(6);
  await until('same goal at the same cursor after restart', () => ready() && api.getGoalState().text === goal, 90000);
  await until('status bar ready after checking', () => api.getServerStatus() === 'ready', 30000);
  results.restart = { status: api.getServerStatus(), goal: api.getGoalState() };

  assert.equal(fs.readFileSync(path.join(root, 'examples/Sqrt2.thy'), 'utf8'), original);
  assert.equal(fs.readFileSync(seq, 'utf8').length > 0, true);
  fs.writeFileSync(path.join(root, '.dev-host/quickwins-results.json'), JSON.stringify(results, null, 2));
  console.log('Quick-win checks passed. Original example unchanged.');
};
