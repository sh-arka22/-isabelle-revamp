// The goal at the caret does not wait for the whole theory: a proved lemma
// shows its goal, its gutter mark and answers MCP goals_at while a later ML
// command is still running. Stock VS Code, real Isabelle server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const vscode = require('vscode');
const { presentation } = require('../out/goalsView');

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// The bridge speaks newline-delimited JSON: {token} once, then {id, method, params}.
async function bridgeClient(portFile) {
  const { port, token } = JSON.parse(fs.readFileSync(portFile, 'utf8'));
  const socket = net.createConnection({ host: '127.0.0.1', port });
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('error', reject); });
  const waiting = [];
  let buffer = '';
  socket.on('data', chunk => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      waiting.shift()?.(JSON.parse(line));
    }
  });
  const send = value => new Promise(resolve => { waiting.push(resolve); socket.write(JSON.stringify(value) + '\n'); });
  assert.deepEqual(await send({ token }), { ok: true });
  let id = 0;
  return { call: (method, params) => send({ id: ++id, method, params, client_name: 'goalsLocal check' }), close: () => socket.destroy() };
}

exports.run = async function () {
  const root = path.resolve(__dirname, '../..');
  const source = `theory Local
  imports Main
begin

lemma first: "x + 0 = (x::nat)"
  by simp

ML \\<open>OS.Process.sleep (seconds 25.0)\\<close>

value "(2::nat) + 2"

lemma second: "(y::nat) * 1 = y"
  by simp

end
`;
  const directory = path.join(root, '.dev-host/goalsLocal-fixture');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'Local.thy');
  fs.writeFileSync(file, source);
  const document = await vscode.workspace.openTextDocument(file);
  const editor = await vscode.window.showTextDocument(document);
  const api = await vscode.extensions.getExtension('hymanimy.isabelle-revamp').activate();
  const lines = source.split('\n');
  const lineOf = text => lines.findIndex(line => line.includes(text));
  const snapshots = [];
  const statusOf = name => api.getTheoremStatuses().find(item => item.name === name)?.status;
  const settled = state => ['ready', 'unfinished'].includes(state.phase);

  async function until(label, condition, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (condition(api.getGoalState())) {
        snapshots.push({ check: label, ...api.getGoalState(), statuses: api.getTheoremStatuses() });
        console.log('PASS: ' + label);
        return;
      }
      await pause(25);
    }
    throw new Error(label + ': ' + JSON.stringify({ ...api.getGoalState(), statuses: api.getTheoremStatuses() }));
  }
  async function move(line, column) {
    editor.selection = new vscode.Selection(line, column, line, column);
    await pause(30);
  }

  let bridge;
  try {
    await vscode.commands.executeCommand('isabelleRevamp.showGoals');
    await vscode.window.showTextDocument(document);
    const first = lineOf('lemma first'), second = lineOf('lemma second');
    await move(first, 6);

    // While the ML command sleeps the theory is not fully checked, yet the
    // goal of the earlier lemma is confirmed and on show, with its gutter mark.
    await until('goal at first shows while the ML command still runs', state => settled(state) && state.text.includes('x + 0 = x')
      && state.checkStatus === 'checking', 240000);
    const shown = presentation(api.getGoalState());
    assert.equal(shown.badge, 'checking');
    assert(shown.goalHtml.includes('<span class="free">x</span>') && shown.text.includes('x + 0 = x') && !shown.empty,
      'the view keeps the goal under the checking badge: ' + JSON.stringify(shown));
    assert(shown.actionsHtml.includes('data-action="pin" title="Keep this goal visible while editing elsewhere">'), 'pinning is possible');
    await until('first is marked proved before second is checked', () => statusOf('first') === 'proved' && statusOf('second') === 'checking', 20000);
    assert.equal(api.getGoalState().checkStatus, 'checking', 'the theory is still being checked');

    // MCP goals_at answers on the same condition, well within its budget.
    bridge = await bridgeClient(process.env.ISABELLE_REVAMP_PORT_FILE ?? path.join(root, '.dev-host/goalsLocal-port'));
    const started = Date.now();
    // Another column of the lemma line: a new query for the statement's goal.
    const answer = await bridge.call('goals_at', { file, line: first, col: 3 });
    const took = Date.now() - started;
    assert(answer.result, JSON.stringify(answer));
    assert(answer.result.text.includes('x + 0 = x'), JSON.stringify(answer.result));
    assert.equal(answer.result.checkStatus, 'checking', 'reported as information, not awaited');
    assert(took < 20000, `goals_at took ${took} ms`);
    snapshots.push({ check: 'goals_at while checking', took, ...answer.result });
    console.log(`PASS: goals_at answered at first in ${took} ms while the ML command ran`);
    // A command after the running one waits for it: either the budget runs
    // out or the answer is the confirmed goal, never an unprocessed state.
    const later = await bridge.call('goals_at', { file, line: second, col: 6 });
    if (later.result) assert(later.result.text.includes('y * 1 = y'), JSON.stringify(later));
    else assert(/still checking/.test(later.error), JSON.stringify(later));
    console.log('PASS: goals_at at second ' + (later.result ? 'waited for the ML command' : 'reported the budget'));

    // The sleep ends: the theory settles and the later lemma answers too.
    await move(second, 6);
    await until('second is proved once the theory is fully checked', state => settled(state) && state.text.includes('y * 1 = y')
      && state.checkStatus === 'fully_checked' && statusOf('second') === 'proved', 120000);
    const done = await bridge.call('goals_at', { file, line: second, col: 6 });
    assert.equal(done.result?.checkStatus, 'fully_checked', JSON.stringify(done));
    console.log('PASS: goals_at at second reports fully_checked afterwards');

    fs.writeFileSync(path.join(root, '.dev-host/goalsLocal-results.json'), JSON.stringify(snapshots, null, 2));
    console.log('Caret-local goal checks passed.');
  } catch (error) {
    fs.writeFileSync(path.join(root, '.dev-host/goalsLocal-results.json'), JSON.stringify({
      error: String(error), state: api.getGoalState(), statuses: api.getTheoremStatuses(), snapshots,
    }, null, 2));
    throw error;
  } finally {
    bridge?.close();
  }
};
