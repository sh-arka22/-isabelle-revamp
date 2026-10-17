// The goals webview script in a tiny DOM: sections, collapse state, sanitised
// HTML insertion, link clicks and the width report. No VS Code needed:
//   node extension/test/unit_goalsView.cjs   (after npm run compile --prefix extension)
const assert = require('node:assert/strict');
const { goalsHtml, GoalsView, presentation } = require('../out/goalsView');
const { mount } = require('./fakeDom.cjs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
// Values from the script's vm realm have foreign prototypes.
const plain = value => JSON.parse(JSON.stringify(value));

exports.run = async function () {
  const state = { phase: 'ready', text: 'proof (prove)\ngoal (1 subgoal):\n 1. x', errors: [], theory: 'Demo',
    position: { line: 4, character: 2 }, goalHtml: 'goal (1 subgoal):\n 1. <span class="free">x</span>' };
  const html = goalsHtml(state, 'goalnonce');
  const page = mount(html, 'goalnonce', { state: { draft: '', collapsed: { facts: true } } });
  const { document, posted, receive } = page;
  const byId = id => document.getElementById(id);
  const sections = document.querySelectorAll('.panel').map(panel => panel.dataset.section);
  assert.deepEqual(sections, ['goal', 'facts', 'messages', 'ask']);
  assert(byId('facts-section').classList.contains('collapsed'), 'saved collapse state is applied on load');
  assert(!byId('goal-section').classList.contains('collapsed'));
  assert.equal(byId('facts-section').querySelector('.disclosure').getAttribute('aria-expanded'), 'false');
  assert.equal(byId('goal').textContent, 'goal (1 subgoal):\n 1. x', 'the initial page carries the sanitised goal');
  assert.equal(byId('goal').querySelector('.free').textContent, 'x');
  assert.equal(byId('position').textContent, 'Demo.thy:5:3');

  // Collapsing persists through the webview state alongside the draft.
  byId('goal-section').querySelector('.disclosure').dispatch('click');
  assert(byId('goal-section').classList.contains('collapsed'));
  assert.deepEqual(plain(page.state().collapsed), { facts: true, goal: true });
  byId('prompt').value = 'draft'; byId('prompt').dispatch('input');
  assert.deepEqual(plain(page.state()), { draft: 'draft', collapsed: { facts: true, goal: true } });
  byId('goal-section').querySelector('.disclosure').dispatch('click');
  assert(!byId('goal-section').classList.contains('collapsed'));

  // A goal update fills every section from the extension's sanitised HTML.
  const update = presentation({ phase: 'ready', text: 'proof (state)\nthis:\n  2 dvd 1\n\ngoal:\nNo subgoals!', errors: ['diag'],
    theory: 'Sqrt2', checkStatus: 'fully_checked', position: { line: 48, character: 7 },
    goalHtml: 'goal:\nNo subgoals!', facts: [{ text: '2 dvd 1', html: '<span class="inner_numeral">2</span> dvd 1' }],
    messages: [{ kind: 'info', text: 'show False', html: '<span class="keyword1">show</span> False' },
      { kind: 'error', text: 'bad', html: '<span class="error_message">bad</span>' }] });
  receive({ type: 'goal', goal: update });
  assert.equal(document.querySelector('h1').textContent, 'Sqrt2');
  assert.equal(byId('position').textContent, 'Sqrt2.thy:49:8');
  assert.equal(document.querySelector('.status').textContent, 'fully checked');
  assert.equal(document.querySelector('.status').className, 'status badge fully_checked');
  assert(!byId('done').hidden && byId('empty').hidden);
  assert.equal(byId('goal').innerHTML, '', 'the banner replaces "No subgoals!"');
  assert.equal(byId('facts').innerHTML, '<pre class="fact source"><span class="inner_numeral">2</span> dvd 1</pre>');
  assert.equal(byId('facts-count').textContent, '1');
  assert(!byId('facts-section').hidden);
  assert(byId('messages').innerHTML.includes('class="message kind-error"'));
  assert(byId('messages').innerHTML.includes('<span class="keyword1">show</span> False'));
  assert.equal(byId('messages-count').textContent, '2');
  assert(byId('errors').hidden, 'the error message already carries the diagnostic');
  assert(!byId('messages-section').hidden);

  // Not in a proof: empty sections hide, the grey note shows.
  receive({ type: 'goal', goal: presentation({ phase: 'ready', text: '', errors: [], theory: 'Sqrt2', position: { line: 0, character: 0 } }) });
  assert(byId('done').hidden && !byId('empty').hidden);
  assert(byId('facts-section').hidden && byId('messages-section').hidden);
  assert.equal(byId('facts').innerHTML, '');
  receive({ type: 'goal', goal: presentation({ phase: 'error', text: '', errors: ['Failed to apply'], theory: 'Sqrt2', position: { line: 0, character: 0 } }) });
  assert(byId('empty').hidden && !byId('errors').hidden && !byId('messages-section').hidden);
  assert.equal(byId('errors').textContent, 'Failed to apply');
  assert(document.body.classList.contains('error'));

  // Entity links and data-action controls post to the extension; the
  // extension validates the link again before opening it.
  const link = document.createElement('span');
  link.setAttribute('data-link', 'file:/opt/Isabelle2025-2/src/HOL/Nat.thy#32');
  byId('goal').appendChild(link);
  link.dispatch('click');
  assert.deepEqual(plain(posted.at(-1)), { type: 'open', link: 'file:/opt/Isabelle2025-2/src/HOL/Nat.thy#32' });
  const button = document.createElement('button');
  button.setAttribute('data-action', 'insert'); button.setAttribute('data-text', 'by simp');
  byId('messages').appendChild(button);
  button.dispatch('click');
  assert.deepEqual(plain(posted.at(-1)), { type: 'action', action: 'insert', data: { action: 'insert', text: 'by simp' } });

  // The width report is debounced and sent once per distinct column count.
  await pause(400);
  const resizes = posted.filter(message => message.type === 'resize');
  assert.equal(resizes.length, 1, JSON.stringify(resizes));
  assert.equal(resizes[0].columns, Math.floor((300 - 24) / 7));
  page.fire('resize');
  await pause(400);
  assert.equal(posted.filter(message => message.type === 'resize').length, 1, 'same width is not re-sent');

  // Extension side: messages become typed callbacks and bad links are dropped.
  const view = new GoalsView();
  const calls = [];
  view.onOpen = link => calls.push(['open', link]);
  view.onResize = columns => calls.push(['resize', columns]);
  view.onAction = (action, data) => calls.push(['action', action, data]);
  let inbound;
  view.resolveWebviewView({ webview: { onDidReceiveMessage(fn) { inbound = fn; return { dispose() {} }; }, postMessage: () => Promise.resolve(true) }, onDidDispose() {} });
  inbound({ type: 'open', link: 'file:/opt/Isabelle2025-2/src/HOL/Nat.thy#32' });
  inbound({ type: 'open', link: 'javascript:alert(1)' });
  inbound({ type: 'open', link: 'file:/x.thy' });
  inbound({ type: 'resize', columns: 72 });
  inbound({ type: 'resize', columns: -1 });
  inbound({ type: 'resize', columns: '72' });
  inbound({ type: 'action', action: 'insert', data: { text: 'by simp', count: 3 } });
  assert.deepEqual(calls, [['open', { path: '/opt/Isabelle2025-2/src/HOL/Nat.thy', line: 31 }], ['open', { path: '/x.thy', line: 0 }],
    ['resize', 72], ['action', 'insert', { text: 'by simp' }]]);
  console.log('PASS: goals webview sections, persisted collapse, sanitised updates, done/empty states, link and action messages, width report');
};

if (require.main === module) exports.run().catch(error => { console.error(error); process.exit(1); });
