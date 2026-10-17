// Pure checks for the goals sidebar's output rendering. No VS Code needed:
//   node extension/test/unit_goals.cjs   (after npm run compile --prefix extension)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderOutput, renderLines, splitMessages, tokenize, safeLink, allowedClasses } = require('../out/outputHtml');
const { outputText } = require('../out/outputText');
const { classifyState, extractFacts, goalText, proofComplete, splitState, stateContent } = require('../out/stateParts');
const { presentation, goalsHtml, parseLink, doneBanner, notInProof } = require('../out/goalsView');

const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures/output', name), 'utf8');
const tags = html => [...html.matchAll(/<\/?([a-z]+)/g)].map(match => match[1]);

exports.run = function () {
  // Real server samples (see docs/PROTOCOL_NOTES.md, goals sidebar).
  const using = renderOutput(fixture('goal_facts_using.html'));
  assert.equal(using.text, 'proof (prove)\nusing this:\n  is_unit 2\n\ngoal (1 subgoal):\n 1. False');
  assert.equal(using.text, outputText(fixture('goal_facts_using.html')));
  assert(using.html.includes('<span class="keyword1">using</span>'));
  assert(using.html.includes('<span class="const">is_unit</span>'));
  assert(using.html.includes('data-link="file:/opt/Isabelle2025-2/src/HOL/Rings.thy#1038"'));
  assert(!using.html.includes('<a '), 'links become spans');
  assert(!using.html.includes('href='));
  assert(!using.html.includes('text_fold') && !using.html.includes('notation') && !using.html.includes('typing'),
    'unknown classes are dropped');
  assert(using.html.startsWith('<pre class="source"><span class="state_message">'));
  for (const tag of tags(using.html)) assert(['pre', 'span', 'sup', 'sub', 'br', 'b', 'i'].includes(tag), tag);

  const free = renderOutput(fixture('goal_free.html'));
  assert(free.html.includes('<span class="free">x</span>'));
  const multi = renderOutput(fixture('goal_facts_multi.html'));
  assert(multi.html.includes('<span class="skolem">m</span>'));
  assert(multi.text.includes('(sqrt 2)²'), 'superscripts with a glyph use it');
  assert(multi.html.includes('²') && !multi.html.includes('⇧'));
  // Lines close and reopen spans so each line stands alone.
  const lines = renderLines(fixture('goal_facts_multi.html'));
  assert.equal(lines.map(line => line.text).join('\n'), multi.text);
  for (const line of lines) {
    const opens = tags(line.html).length;
    assert.equal((line.html.match(/<span/g) || []).length, (line.html.match(/<\/span>/g) || []).length, line.html);
    assert(opens >= 0);
    assert(!line.html.includes('<pre'));
  }
  assert(lines[0].html.includes('class="state_message"'), 'the wrapping span is reopened on later lines: ' + lines[0].html);
  assert(lines[4].html.includes('class="state_message"'), lines[4].html);

  // Facts are split from the goal; multi-fact lists share a bullet indentation.
  assert.deepEqual(extractFacts(using.text), ['is_unit 2']);
  assert.deepEqual(extractFacts(multi.text), ['real m = sqrt 2 * real n', '(sqrt 2)² = 2']);
  assert.deepEqual(extractFacts(renderOutput(fixture('goal_facts_chain.html')).text), ['is_unit 2']);
  assert.deepEqual(extractFacts('proof (prove)\ngoal (1 subgoal):\n 1. x'), []);
  assert.deepEqual(extractFacts('proof (prove)\nusing this:\n  a =\n    b\n  c\n\ngoal (1 subgoal):\n 1. x'), ['a =\n  b', 'c']);
  assert.equal(goalText(multi.text), 'proof (prove)\ngoal (1 subgoal):\n 1. (real m)² = 2 * (real n)²');
  assert.deepEqual(classifyState(['proof (state)', 'this:', '  False', '', 'goal:', 'No subgoals!']),
    { facts: [[2]], goal: [[0], [1 + 3], [5]] });
  const parts = splitState(lines);
  assert.equal(parts.facts.length, 2);
  assert.equal(parts.facts[0].text, 'real m = sqrt 2 * real n');
  assert(parts.facts[0].html.startsWith('<span class="state_message">') && !/^(<[^>]*>)* /.test(parts.facts[0].html), parts.facts[0].html);
  assert(parts.facts[0].html.includes('<span class="skolem">m</span>'));
  assert.equal(splitState([{ text: '  a:', html: '<b>  a:</b>' }, { text: 'this:', html: 'this:' }, { text: '  x =', html: '<i>  x =</i>' },
    { text: '     y', html: '<i>     y</i>' }, { text: '', html: '' }, { text: 'goal:', html: 'goal:' }]).facts[0].html, '<i>x =</i>\n<i>   y</i>');
  assert(!parts.goal.map(line => line.text).join('\n').includes('using this'));
  const content = stateContent(fixture('goal_facts_multi.html'));
  assert.equal(content.text, multi.text);
  assert.equal(content.facts.length, 2);
  assert(!content.goalHtml.includes('using') && content.goalHtml.includes('<span class="skolem">n</span>'));

  // Done state.
  const done = renderOutput(fixture('done_state.html'));
  assert.equal(done.text, 'proof (state)\nthis:\n  False\n\ngoal:\nNo subgoals!');
  assert(proofComplete(done.text));
  assert(proofComplete('No subgoals!'));
  assert(!proofComplete(using.text));
  assert(!proofComplete('Failed to apply initial proof method⌂:\ngoal (1 subgoal):\n 1. False'));
  assert(!proofComplete(''));

  // Messages beside the goal: the dynamic output at a finished step carries two
  // writeln messages and the state; try0 lists sendback proofs.
  const finished = splitMessages(fixture('done_dynamic.html'));
  assert.deepEqual(finished.map(message => message.kind), ['info', 'info', 'state']);
  assert.equal(finished[0].text, 'show False');
  assert(finished[1].text.startsWith('Successful attempt to solve goal by exported rule:\n  (sqrt 2 ∈ ℚ) ⟹ False'));
  assert.equal(finished[2].text, done.text);
  const value = splitMessages(fixture('value.html'));
  assert.deepEqual(value, [{ kind: 'info', text: '"2"\n  :: "nat"',
    html: '"2"\n  :: "<span class="isa-link" data-link="file:/opt/Isabelle2025-2/src/HOL/Nat.thy#32"><span class="tconst">nat</span></span>"' }]);
  const error = splitMessages(fixture('thm_error.html'));
  assert.deepEqual(error.map(message => [message.kind, message.text]), [['error', 'Undefined fact: "add_commute"⌂']]);
  const fail = splitMessages(fixture('fail.html'));
  assert.deepEqual(fail.map(message => message.kind), ['info', 'error']);
  assert(fail[1].text.startsWith('Failed to apply initial proof method'));
  const try0 = splitMessages(fixture('try0.html'));
  assert.equal(try0.length, 8);
  assert(try0.every(message => message.kind === 'info'));
  assert(try0[1].html.includes('Found proof: <span class="sendback">by presburger</span> (8 ms)'));
  assert(try0[7].text.startsWith('Try this: by auto\n(auto: 0 ms;'));
  assert.deepEqual(splitMessages(fixture('empty.html')), []);
  assert.deepEqual(splitMessages('<pre class="source"></pre>'), []);
  assert.deepEqual(splitMessages(fixture('sorry.html')).map(message => message.kind), ['info']);
  // Output without message spans is one plain message.
  assert.deepEqual(splitMessages('<pre>plain</pre>'), [{ kind: 'info', text: 'plain', html: '<pre>plain</pre>' }]);

  // Hostile input: nothing but the allowed elements and classes survive.
  const hostile = renderOutput('<pre class="source" onclick="x()"><script>alert(1)</script><span class="free bogus" style="color:red" id="a">x</span>'
    + '<a href="javascript:alert(1)">j</a><a href="data:text/html,x">d</a><a href="http://example.com/">h</a>'
    + '<a href="file:/tmp/a.thy#3">ok</a><img src=x onerror=alert(1)><span class="\'">q</span><div class="bound">no div</div>'
    + '<span class=free>unquoted</span>&lt;b&gt; &amp;amp; &#x3c; &#60;<br><span>unclosed<sup>2</pre>');
  assert.equal(hostile.text, outputText('<pre class="source" onclick="x()"><script>alert(1)</script><span class="free bogus" style="color:red" id="a">x</span>'
    + '<a href="javascript:alert(1)">j</a><a href="data:text/html,x">d</a><a href="http://example.com/">h</a>'
    + '<a href="file:/tmp/a.thy#3">ok</a><img src=x onerror=alert(1)><span class="\'">q</span><div class="bound">no div</div>'
    + '<span class=free>unquoted</span>&lt;b&gt; &amp;amp; &#x3c; &#60;<br><span>unclosed<sup>2</pre>'));
  assert.equal(hostile.html, '<pre class="source">alert(1)<span class="free">x</span>jdh'
    + '<span class="isa-link" data-link="file:/tmp/a.thy#3">ok</span>qno div'
    + '<span class="free">unquoted</span>&lt;b&gt; &amp;amp; &lt; &lt;<br>unclosed<sup>2</sup></pre>');
  assert(!/on\w+=|javascript:|<script|<img|<div|style=|href=/.test(hostile.html));
  assert.equal(renderOutput('a < b && c > d').html, 'a &lt; b &amp;&amp; c &gt; d');
  assert.equal(renderOutput('<a href="a>b">x &lt; 2</a><br>&#x211A; &amp; y').html, 'x &lt; 2<br>ℚ &amp; y');
  assert.equal(renderOutput('<span class="main">x⇧q y⇩z</span>').html, '<span class="main">x<sup>q</sup> y<sub>z</sub></span>');
  assert.equal(renderOutput('<span title="</span><b>">t</span>').html, 't');
  assert.equal(renderOutput('<span class="free"><span>x</span>y</span>').html, '<span class="free">xy</span>', 'a classless span must not close its parent');
  assert.equal(renderOutput('<!-- <script> -->c<!doctype html>').html, 'c');
  assert.equal(renderOutput('<span class="free">x</pre></span>').html, '<span class="free">x</span>');
  assert.equal(renderOutput('</span></b>stray').html, 'stray');
  assert.equal(renderOutput('<br/><br /><BR>').html, '<br><br><br>');
  assert.equal(renderOutput('<SPAN CLASS="Free">x</SPAN>').html, 'x', 'class names are case-sensitive');
  assert.deepEqual(tokenize('<a href="x>y" class=\'c\'>t</a>'), [
    { kind: 'open', name: 'a', attributes: { href: 'x>y', class: 'c' }, selfClosing: false },
    { kind: 'text', value: 't' }, { kind: 'close', name: 'a' }]);
  assert.equal(safeLink('file:/opt/Isabelle2025-2/src/HOL/Nat.thy#32'), 'file:/opt/Isabelle2025-2/src/HOL/Nat.thy#32');
  assert.equal(safeLink('file:///home/u/A.thy'), 'file:///home/u/A.thy');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'http://x/', 'file:relative#1', 'file:/a b', 'file:/a#x', 'file:/a"', ''])
    assert.equal(safeLink(bad), undefined, bad);
  assert.deepEqual(parseLink('file:/opt/Isabelle2025-2/src/HOL/Nat.thy#32'), { path: '/opt/Isabelle2025-2/src/HOL/Nat.thy', line: 31 });
  assert.deepEqual(parseLink('file:///a/b%20c.thy'), { path: '/a/b c.thy', line: 0 });
  assert.equal(parseLink('javascript:alert(1)'), undefined);
  assert.equal(parseLink(42), undefined);
  assert(allowedClasses.has('free') && allowedClasses.has('error_message') && allowedClasses.has('sendback'));
  assert(!allowedClasses.has('isa-link') && !allowedClasses.has('hidden') && !allowedClasses.has('position'));

  // View model.
  const state = { phase: 'ready', text: done.text, errors: [], theory: 'Sqrt2', checkStatus: 'fully_checked',
    html: done.html, goalHtml: 'goal', facts: content.facts, messages: finished.filter(message => message.kind !== 'state'),
    position: { line: 11, character: 4 } };
  const view = presentation(state);
  assert.equal(view.position, 'Sqrt2.thy:12:5');
  assert.equal(view.status, 'fully checked');
  assert.equal(view.badge, 'fully_checked');
  assert(view.done && !view.empty);
  assert.equal(view.factCount, 2);
  assert.equal(view.messageCount, 2);
  assert(view.messagesHtml.includes('class="message kind-info"'));
  assert(view.messagesHtml.includes('<div class="message-actions"></div>'));
  const html = goalsHtml(state, 'n');
  assert(html.includes('<p id="done" class="done" role="status">' + doneBanner));
  assert(html.includes('<p id="empty" class="muted" hidden>'));
  assert(html.includes('<h1>Sqrt2</h1>'));
  assert(html.includes('id="header-actions"'));
  assert(html.indexOf('id="goal-section"') < html.indexOf('id="facts-section"'));
  assert(html.indexOf('id="messages-section"') < html.indexOf('id="ask-section"'));
  assert(html.includes("default-src 'none'"));
  assert(html.includes('body.vscode-dark .free { color: rgba(86, 156, 214, 1); }'));
  assert(html.includes('body.vscode-light .error_message'));
  const empty = presentation({ phase: 'ready', text: '', errors: [], theory: 'T', messages: [], position: { line: 0, character: 0 } });
  assert(empty.empty && !empty.done);
  assert(goalsHtml({ phase: 'ready', text: '', errors: [] }, 'n').includes('<p id="empty" class="muted">' + notInProof));
  const withMessage = presentation({ phase: 'ready', text: '', errors: [], messages: value });
  assert(!withMessage.empty && withMessage.messageCount === 1);
  const checking = presentation({ phase: 'checking', text: 'STALE', errors: [], messages: value, facts: content.facts });
  assert.equal(checking.goalHtml, '');
  assert.equal(checking.messageCount, 0);
  assert.equal(checking.factCount, 0);
  const failed = presentation({ phase: 'error', text: '', errors: ['boom'], messages: fail });
  assert.equal(failed.badge, 'error');
  assert(!failed.showErrors, 'an error message replaces the diagnostics copy');
  assert(presentation({ phase: 'error', text: '', errors: ['boom'], messages: [] }).showErrors);
  assert(!presentation({ phase: 'error', text: '', errors: ['boom'], messages: [] }).empty);
  assert.equal(presentation({ phase: 'unfinished', text: 'goal', errors: [] }).status, 'unfinished (sorry)');
  assert.equal(presentation({ phase: 'unfinished', text: 'goal', errors: [] }).badge, 'unfinished');
  assert.equal(presentation({ phase: 'ready', text: 'g', errors: [], checkStatus: 'checking' }).badge, 'checking');
  assert(goalsHtml({ phase: 'ready', text: '<script>alert(1)</script>', errors: [] }, 'n').includes('&lt;script&gt;'));
  // Pins and pause in the view model.
  const pin = { id: -3, uri: 'file:///w/Sqrt2.thy', theory: 'Sqrt2', position: { line: 11, character: 4 }, version: 2, stale: false,
    text: done.text, goalHtml: 'goal', facts: content.facts };
  const pinned = presentation({ ...state, pins: [pin, { ...pin, id: -4, stale: true, text: using.text, goalHtml: using.html }], paused: true });
  assert.equal(pinned.status, 'paused');
  assert.equal(pinned.badge, 'paused');
  assert.equal(pinned.pinCount, 2);
  assert(pinned.pinsHtml.includes('data-pin="-3"') && pinned.pinsHtml.includes('Sqrt2.thy:12'));
  assert(pinned.pinsHtml.includes(doneBanner), 'a finished pinned step shows the banner');
  assert(pinned.pinsHtml.includes('<span class="const">is_unit</span>'));
  assert(pinned.actionsHtml.includes('>Resume<') && pinned.actionsHtml.includes('data-action="unpin-all"'));
  assert.equal(presentation(state).status, 'fully checked', 'pins do not change the live status');
  assert(presentation(state).actionsHtml.startsWith('<button type="button" class="link" data-action="pin"'));
  assert(presentation({ phase: 'checking', text: '', errors: [] }).actionsHtml.includes(' disabled>Pin<'));
  assert(presentation({ phase: 'ready', text: '', errors: [] }).actionsHtml.includes(' disabled>Pin<'), 'nothing to pin outside a proof');
  assert(goalsHtml({ ...state, pins: [pin] }, 'n').indexOf('<div id="pins">') < goalsHtml({ ...state, pins: [pin] }, 'n').indexOf('id="goal-section"'));
  assert(!goalsHtml({ ...state, pins: [{ ...pin, text: '<b>x</b>', goalHtml: '&lt;b&gt;x&lt;/b&gt;', theory: '<i>' }] }, 'n').includes('<i>.thy'));
  console.log('PASS: sanitised output, lines, facts, done state, messages, hostile input, links, pins, pause and view model');
};

if (require.main === module) exports.run();
