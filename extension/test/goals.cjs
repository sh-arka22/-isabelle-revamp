// Goals sidebar: coloured goals, facts, messages, done state and the
// pretty-print margin, against stock VS Code and the real Isabelle server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const { goalsHtml, presentation } = require('../out/goalsView');

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const longest = text => Math.max(0, ...text.split('\n').map(line => line.length));

exports.run = async function () {
  require('./unit_goals.cjs').run();
  await require('./unit_goalsView.cjs').run();
  const root = path.resolve(__dirname, '../..');
  const sqrt2 = fs.readFileSync(path.join(root, 'examples/Sqrt2.thy'), 'utf8');
  const sides = 'abcdefghijklmnpqrstu'.split('').join(' + ');
  const source = `theory Goals
  imports Complex_Main
begin

value "(1::nat) + 1"

lemma add_zero_try: "x + 0 = (x::nat)"
  try0
  by simp

lemma long: "(${sides} :: nat) = ${sides}"
  by (rule refl)

${sqrt2.slice(sqrt2.indexOf('theorem sqrt2_irrational'))}`;
  const directory = path.join(root, '.dev-host/goals-fixture');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'Goals.thy');
  fs.writeFileSync(file, source);
  const document = await vscode.workspace.openTextDocument(file);
  const editor = await vscode.window.showTextDocument(document);
  const api = await vscode.extensions.getExtension('hymanimy.isabelle-revamp').activate();
  const lines = source.split('\n');
  const lineOf = (text, offset = 0) => lines.findIndex(line => line.includes(text)) + offset;
  const snapshots = [];
  const settled = () => ['ready', 'unfinished'].includes(api.getGoalState().phase);

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

    // Colour: a free variable in a goal.
    await move(lineOf('lemma add_zero_try'), 6);
    // The first answer waits for the whole theory, including try0's provers.
    await until('goal html colours the free variable', state => settled() && state.text.includes('x + 0 = x')
      && /<span class="free">x<\/span>/.test(state.goalHtml) && state.html.startsWith('<pre class="source"><span class="state_message">'), 120000);
    assert(!/<a |href=|onclick|<script/.test(api.getGoalState().html));
    assert.deepEqual(api.getGoalState().position, { line: lineOf('lemma add_zero_try'), character: 6 });

    // Facts at `then show`, extracted from the state and coloured.
    const show = lineOf('  then show False');
    await move(show, 7);
    // Isabelle prints `(2::nat) dvd 1` with its is_unit notation.
    await until('facts extracted at then show', state => settled() && state.facts?.length === 1
      && state.facts[0].text === 'is_unit 2' && /class="const">is_unit</.test(state.facts[0].html)
      && !state.goalHtml.includes('using this') && state.text.includes('using this:'));
    assert.equal(presentation(api.getGoalState()).factCount, 1);
    assert.deepEqual(api.getGoalState().position, { line: show, character: 7 });

    // Messages: a value command's output beside an empty goal.
    await move(lineOf('value "'), 2);
    await until('value output appears in messages', state => state.phase === 'ready' && state.text === ''
      && state.messages?.some(message => message.kind === 'info' && message.text.includes('"2"') && message.text.includes('"nat"')));
    assert(!presentation(api.getGoalState()).empty);
    assert(goalsHtml(api.getGoalState()).includes('class="message kind-info"'));
    // The server does not repeat unchanged output: a move within the command
    // keeps the message once the query settles.
    await move(lineOf('value "'), 4);
    await until('value output survives a caret move within the command', state => state.phase === 'ready' && state.text === ''
      && state.messages?.some(message => message.kind === 'info' && message.text.includes('"2"')) && state.position.character === 4, 15000);
    assert.equal(presentation(api.getGoalState()).messageCount, 1);

    // Done: the last step of the complete proof.
    await move(lines.indexOf('qed') - 1, 5);
    await until('No subgoals! yields the done banner', state => state.phase === 'ready' && state.text.includes('No subgoals!')
      && presentation(state).done);
    assert(/<p id="done" class="done" role="status">/.test(goalsHtml(api.getGoalState())));
    assert(api.getGoalState().messages.some(message => message.text.startsWith('Successful attempt')));

    // try0's suggestions arrive as sendback messages.
    await move(lineOf('  try0'), 2);
    await until('try0 results are messages with sendback markup', state => settled() && state.messages?.some(message =>
      message.text.startsWith('Try this:') && message.html.includes('<span class="sendback">')), 90000);

    // Outside any command: grey note, no sections.
    await move(3, 0);
    await until('blank line is not in a proof', state => state.phase === 'ready' && state.text === '' && state.messages?.length === 0
      && presentation(state).empty);
    assert(goalsHtml(api.getGoalState()).includes('<p id="empty" class="muted">Not in a proof'));

    // The pretty-print margin follows the panel width: the webview has
    // already reported the sidebar's columns, so the long goal is wrapped.
    await move(lineOf('lemma long'), 6);
    await until('long goal wrapped at the panel width', state => settled() && state.text.includes('goal (1 subgoal)')
      && longest(state.text) < 160);
    api.setGoalsMargin(200);
    await until('margin 200 unwraps the goal', state => settled() && state.text.includes('goal (1 subgoal)') && longest(state.text) > 100);
    api.setGoalsMargin(40);
    await until('margin 40 wraps the goal', state => settled() && state.text.includes('goal (1 subgoal)') && longest(state.text) <= 48);
    api.setGoalsMargin(80);

    // A failing method inside the structured proof: its error message joins
    // the Messages section.
    const step = '    have "even (m ^ 2)" using squared by simp';
    assert(source.includes(step));
    const broken = source.replace(step, step.replace('by simp', 'by (rule TrueI)'));
    assert(await editor.edit(edit => edit.replace(new vscode.Range(0, 0, document.lineCount, 0), broken)));
    await move(lineOf(step), step.indexOf('by') + 1);
    await until('failed method error is a message', state => state.phase === 'error' && state.text === ''
      && state.messages?.some(message => message.kind === 'error' && message.text.includes('Failed to apply')), 60000);
    assert(!presentation(api.getGoalState()).showErrors, 'the diagnostics copy is hidden behind the error message');

    fs.writeFileSync(path.join(root, '.dev-host/goals-results.json'), JSON.stringify(snapshots, null, 2));
    assert.equal(fs.readFileSync(path.join(root, 'examples/Sqrt2.thy'), 'utf8'), sqrt2);
    console.log('Goals sidebar checks passed. Original example unchanged.');
  } catch (error) {
    fs.writeFileSync(path.join(root, '.dev-host/goals-results.json'), JSON.stringify({
      error: String(error), state: api.getGoalState(), snapshots,
    }, null, 2));
    throw error;
  } finally {
    await editor.edit(edit => edit.replace(new vscode.Range(0, 0, document.lineCount, 0), source));
    await document.save();
  }
};
