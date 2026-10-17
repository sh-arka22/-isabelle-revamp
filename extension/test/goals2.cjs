// Goals sidebar: pins, pause and copy-to-editor (Alex's 15 and 16), against
// stock VS Code and the real Isabelle server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const { goalsHtml, pinNotice, presentation } = require('../out/goalsView');
const { sendbackTexts } = require('../out/insertProof');

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.run = async function () {
  require('./unit_insertProof.cjs').run();
  await require('./unit_goalsView.cjs').run();
  const root = path.resolve(__dirname, '../..');
  const source = `theory Goals2
  imports Main
begin

lemma add_zero: "x + 0 = (x::nat)"
  try0
  sorry

lemma mult_one: "(y::nat) * 1 = y"
  by simp

end
`;
  const directory = path.join(root, '.dev-host/goals2-fixture');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'Goals2.thy');
  fs.writeFileSync(file, source);
  const document = await vscode.workspace.openTextDocument(file);
  const editor = await vscode.window.showTextDocument(document);
  const api = await vscode.extensions.getExtension('hymanimy.isabelle-revamp').activate();
  const lines = source.split('\n');
  const lineOf = text => lines.findIndex(line => line.includes(text));
  const snapshots = [];
  const settled = state => ['ready', 'unfinished'].includes(state.phase);
  const errors = () => vscode.languages.getDiagnostics(document.uri)
    .filter(d => d.severity === vscode.DiagnosticSeverity.Error);

  async function until(label, condition, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (condition(api.getGoalState())) {
        snapshots.push({ check: label, ...api.getGoalState() });
        console.log('PASS: ' + label);
        return;
      }
      await pause(25);
    }
    throw new Error(label + ': ' + JSON.stringify(api.getGoalState()));
  }
  async function move(line, column) {
    editor.selection = new vscode.Selection(line, column, line, column);
    await pause(30);
  }

  try {
    await vscode.commands.executeCommand('isabelleRevamp.showGoals');
    await vscode.window.showTextDocument(document);

    // 16: try0's suggestion replaces the placeholder sorry after the command.
    await move(lineOf('  try0'), 3);
    // The first answer waits for the whole theory, including try0's provers.
    await until('try0 suggests a proof with a sendback', state => settled(state) && state.messages?.some(message =>
      message.text.startsWith('Try this:') && message.html.includes('<span class="sendback">')), 180000);
    const suggestion = api.getGoalState().messages.find(message => message.text.startsWith('Try this:'));
    const [proof] = sendbackTexts(suggestion.html);
    assert.match(proof, /^by /);
    assert(presentation(api.getGoalState()).messagesHtml.includes(`data-action="insert" data-text="${proof}"`));
    assert(await api.insertProofText(proof), 'insertProofText applies the edit');
    const sorryLine = lineOf('  sorry');
    assert.equal(document.lineAt(sorryLine).text, '  ' + proof);
    assert(!document.getText().includes('sorry'));
    assert.equal(document.lineCount, lines.length, 'the placeholder line was replaced, not padded');
    assert.deepEqual([editor.selection.active.line, editor.selection.active.character], [sorryLine, 2 + proof.length]);
    console.log('PASS: the suggested proof replaced sorry');
    await until('the inserted proof checks without errors', state => state.phase === 'ready' && state.checkStatus === 'fully_checked'
      && errors().length === 0, 120000);

    // 15: pin the goal of mult_one, move away, edit elsewhere.
    const multOne = lineOf('lemma mult_one');
    await move(multOne, 6);
    await until('goal at mult_one', state => settled(state) && state.text.includes('y * 1 = y'));
    await vscode.commands.executeCommand('isabelleRevamp.pinGoal');
    await until('pinGoal keeps the goal as a pin', state => state.pins?.length === 1 && state.pins[0].text.includes('y * 1 = y')
      && state.pins[0].position.line === multOne && state.pins[0].position.character === 6 && !state.pins[0].stale);
    const pin = api.getGoalState().pins[0];
    assert.equal(pin.theory, 'Goals2');
    assert(pin.goalHtml.includes('<span class="free">y</span>'));
    assert(goalsHtml(api.getGoalState()).includes(`Goals2.thy:${multOne + 1}`));
    // The live goal takes a fresh server panel and confirms the same state.
    await until('live goal re-confirmed after pinning', state => settled(state) && state.text.includes('y * 1 = y') && state.pins.length === 1);
    await move(3, 0);
    await until('pin stays while the live goal moves on', state => state.phase === 'ready' && state.text === ''
      && state.pins?.length === 1 && state.pins[0].text.includes('y * 1 = y') && state.pins[0].id === pin.id);
    assert(await editor.edit(edit => edit.insert(new vscode.Position(3, 0), '(* note *)')));
    await until('an edit flags the pin stale but keeps its content', state => state.pins?.[0]?.stale === true
      && state.pins[0].text.includes('y * 1 = y'));
    assert(goalsHtml(api.getGoalState()).includes(`<p class="muted stale">${pinNotice}`));

    // Pause: the view keeps the state at add_zero while the caret moves.
    const addZero = lineOf('lemma add_zero');
    await move(addZero, 6);
    await until('goal at add_zero', state => settled(state) && state.text.includes('x + 0 = x') && !state.paused);
    await vscode.commands.executeCommand('isabelleRevamp.togglePauseGoals');
    await until('pause keeps the goal and shows the badge', state => state.paused === true && presentation(state).badge === 'paused'
      && state.text.includes('x + 0 = x'));
    await move(multOne, 6);
    await pause(2000);
    const frozen = api.getGoalState();
    assert(frozen.paused && frozen.text.includes('x + 0 = x') && frozen.position.line === addZero, JSON.stringify(frozen.position));
    assert.equal(presentation(frozen).status, 'paused');
    console.log('PASS: paused goals ignore the caret');
    await vscode.commands.executeCommand('isabelleRevamp.togglePauseGoals');
    await until('unpausing follows the caret at once', state => !state.paused && settled(state) && state.text.includes('y * 1 = y')
      && state.position.line === multOne);

    // A second pin, then unpin all through the command.
    await vscode.commands.executeCommand('isabelleRevamp.pinGoal');
    await until('a second pin', state => state.pins?.length === 2 && state.pins[1].position.line === multOne);
    assert(presentation(api.getGoalState()).actionsHtml.includes('data-action="unpin-all"'));
    await vscode.commands.executeCommand('isabelleRevamp.unpinAll');
    await until('unpinAll clears the pins', state => state.pins?.length === 0 && settled(state) && state.text.includes('y * 1 = y'));

    fs.writeFileSync(path.join(root, '.dev-host/goals2-results.json'), JSON.stringify(snapshots, null, 2));
    console.log('Goals pins, pause and insert checks passed.');
  } catch (error) {
    fs.writeFileSync(path.join(root, '.dev-host/goals2-results.json'), JSON.stringify({
      error: String(error), state: api.getGoalState(), snapshots,
    }, null, 2));
    throw error;
  } finally {
    await editor.edit(edit => edit.replace(new vscode.Range(0, 0, document.lineCount, 0), source));
    await document.save();
  }
};
