// Pure checks for the quick-win modules; no VS Code host is needed.
const assert = require('node:assert/strict');
const { isLibraryPath } = require('../out/library');
const { hoverCode } = require('../out/hoverText');
const { statusText, ServerStatus } = require('../out/serverStatus');
const { GoalsView, goalsHtml } = require('../out/goalsView');

exports.check = async function () {
  const home = '/opt/Isabelle2025-2', user = '/home/me/.isabelle/Isabelle2025-2';
  assert(isLibraryPath(home + '/src/HOL/Analysis/Measure_Space.thy', home, user));
  assert(isLibraryPath(home + '/src/Pure/General/symbol.ML', home, user));
  assert(isLibraryPath(user + '/afp/thys/Foo/Foo.thy', home, user));
  assert(isLibraryPath(home, home, user), 'the root itself counts');
  assert(!isLibraryPath('/home/me/proj/Sqrt2.thy', home, user));
  assert(!isLibraryPath('/opt/Isabelle2025-2-other/x.thy', home, user), 'a sibling prefix is not inside');
  assert(!isLibraryPath(home + '/../elsewhere/x.thy', home, user), 'dot-dot segments escape');
  assert(!isLibraryPath(home + '/src/HOL/Main.thy', '', ''), 'unknown roots lock nothing');
  assert(!isLibraryPath('/x', 'relative/root'), 'relative roots are ignored');
  console.log('PASS: isLibraryPath accepts both Isabelle roots and rejects workspace, sibling and relative paths');

  assert.equal(hoverCode('```plaintext\nconstant "NthRoot.sqrt"\n```'), 'constant "NthRoot.sqrt"');
  assert.equal(hoverCode('\n```plaintext\n:: real \\<Rightarrow> real\n```\n'), ':: real ⇒ real');
  assert.equal(hoverCode('"4"\n  :: "nat"'), '"4"\n  :: "nat"', 'unfenced text passes through');
  assert.equal(hoverCode('```\nx\\<^sup>2 \\<notin> \\<rat>\n```'), 'x² ∉ ℚ');
  console.log('PASS: hover text unwraps the client code fence and decodes symbols');

  assert.equal(statusText('ready'), 'Isabelle: ready');
  assert.equal(statusText('checking'), 'Isabelle: checking…');
  assert.equal(statusText('stopped'), 'Isabelle: stopped');
  const item = { shown: 0, show() { this.shown++; }, dispose() { this.disposed = true; } };
  const status = new ServerStatus(item);
  assert.equal(item.command, 'isabelleRevamp.restartServer');
  assert.equal(item.text, 'Isabelle: starting…');
  status.set('checking');
  assert.equal(item.text, 'Isabelle: checking…');
  assert.equal(item.shown, 1);
  status.dispose();
  assert(item.disposed);
  console.log('PASS: status bar text and restart command');

  const view = new GoalsView();
  const fake = () => {
    const posted = [];
    const webview = { posted, onDidReceiveMessage(fn) { webview.inbound = fn; return { dispose() { webview.inbound = undefined; } }; },
      postMessage(message) { posted.push(message); return Promise.resolve(true); } };
    return webview;
  };
  const sidebar = fake(), panel = fake();
  let restarts = 0;
  view.onRestart = () => { restarts++; };
  const first = view.attach(sidebar);
  const second = view.attach(panel);
  assert.equal(view.attached, 2);
  assert.equal(sidebar.options.enableScripts, true);
  assert(panel.html.includes('id="restart"') && panel.html.includes('↻ Restart'));
  assert(panel.html.includes("default-src 'none'"));
  view.update({ phase: 'ready', text: 'goal (1 subgoal):\n 1. sqrt 2 ∉ ℚ', errors: [], theory: 'Sqrt2' });
  await new Promise(resolve => setImmediate(resolve));
  for (const webview of [sidebar, panel]) {
    const goal = webview.posted.findLast(message => message.type === 'goal').goal;
    assert.equal(goal.theory, 'Sqrt2');
    assert(goal.text.includes('sqrt 2 ∉ ℚ'));
  }
  assert.deepEqual(sidebar.posted.at(-1), panel.posted.at(-1), 'both webviews receive the same message');
  panel.inbound({ type: 'restart' });
  assert.equal(restarts, 1);
  sidebar.inbound({ type: 'ready' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sidebar.posted.filter(message => message.type === 'goal').length, 2, 'ready replays the current goal');
  second.dispose();
  assert.equal(view.attached, 1);
  view.update({ phase: 'idle', text: '', errors: [] });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(panel.posted.filter(message => message.type === 'goal').length, 1, 'a detached webview receives nothing');
  assert.equal(sidebar.posted.filter(message => message.type === 'goal').length, 3);
  first.dispose();
  assert.equal(view.attached, 0);
  assert(goalsHtml({ phase: 'idle', text: '', errors: [] }).includes("postMessage({ type: 'restart' })"));
  console.log('PASS: one goals model drives several webviews with attach/detach and a restart message');
  await require('./askView.cjs').checkAskView();
};
if (require.main === module) exports.check().catch(error => { console.error(error); process.exit(1); });
