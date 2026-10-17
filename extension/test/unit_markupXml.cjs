// Pure checks on live-captured PIDE/sledgehammer_output contents; no VS Code.
// Fixtures: scripts/sledgehammer_probe.py against Isabelle2025-2 (2026-10-17).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { decodeEntities, parseMarkup, markupText, outputMessages, sledgehammerResults } = require('../out/markupXml');

const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures/sledgehammer', name + '.xml'), 'utf8');

// Tree and entities.
assert.deepEqual(parseMarkup('a &lt;b&gt; &amp; &quot;c&quot; &#x211A; &#65;'), ['a <b> & "c" ℚ A']);
assert.deepEqual(parseMarkup('<x a="1" b="&quot;q&quot;"><y/>t</x>tail'), [
  { name: 'x', attributes: { a: '1', b: '"q"' }, children: [{ name: 'y', attributes: {}, children: [] }, 't'] }, 'tail']);
assert.equal(markupText(parseMarkup('<xml_elem xml_name="typing"><xml_body>::nat</xml_body>x</xml_elem> + 0')), 'x + 0');
// Tolerance: stray '<', mismatched close tags and unclosed elements never throw.
assert.deepEqual(parseMarkup('1 < 2 </nope> <open>text'), ['1 < 2  ', { name: 'open', attributes: {}, children: ['text'] }]);
assert.deepEqual(parseMarkup('<a><b>x</a>y'), [{ name: 'a', attributes: {}, children: [{ name: 'b', attributes: {}, children: ['x'] }] }, 'y']);
assert.equal(decodeEntities('&#xD800;&#1114112;'), '&#xD800;&#1114112;');

// The first output of a run names a prover without a proof yet.
assert.deepEqual(outputMessages(fixture('add_zero_first')),
  [{ kind: 'writeln', segments: [{ text: 'verit found a proof...' }], text: 'verit found a proof...' }]);
assert.deepEqual(sledgehammerResults(outputMessages(fixture('add_zero_first'))), []);

// A finished run: sendbacks are nested in <block> elements and carry padding="command".
const done = outputMessages(fixture('add_zero_done'));
assert.equal(done.length, 11);
assert.equal(done.at(-1).text, 'Done');
const tried = done.find(message => message.sendback);
assert.equal(tried.text, 'verit: Try this: by simp (4 ms)');
assert.deepEqual(tried.segments, [{ text: 'verit: Try this: ' }, { text: 'by simp', sendback: true }, { text: ' (4 ms)' }]);
assert.deepEqual(sledgehammerResults(done), [
  { text: 'by simp', insertable: true, prover: 'verit', time: '4 ms', message: 'verit: Try this: by simp (4 ms)' },
  { text: 'by auto', insertable: true, prover: 'zipperposition', time: '0.2 ms', message: 'zipperposition: Try this: by auto (0.2 ms)' },
]);
const tree = parseMarkup(fixture('add_zero_done'));
assert.equal(tree[1].children[1].name, 'sendback');
assert.deepEqual(tree[1].children[1].attributes, { padding: 'command', id: '-3' });

// Partial and complete outputs of one run share their prefix; results de-duplicate by text.
const partial = sledgehammerResults(outputMessages(fixture('rev_rev_partial')));
assert.deepEqual(partial.map(result => result.text), ['by simp']);
const complete = sledgehammerResults(outputMessages(fixture('rev_rev_done')));
assert.deepEqual(complete.map(result => [result.prover, result.text]), [['cvc5', 'by simp'], ['verit', 'by auto']]);

// provers "" runs the default list; the try0 methods answer first and their sendbacks are not block-wrapped.
const defaults = sledgehammerResults(outputMessages(fixture('default_provers')));
assert.deepEqual(defaults.map(result => `${result.prover}:${result.text}`),
  ['presburger:by presburger', 'simp:by simp', 'auto:by auto', 'linarith:by linarith']);

// Naming only try0's methods as provers is a try0-only run: every finder is a method.
const try0Only = sledgehammerResults(outputMessages(fixture('try0_only')));
assert.deepEqual(try0Only.map(result => result.prover), ['simp', 'auto', 'fastforce', 'force', 'metis']);
assert.deepEqual(try0Only.map(result => result.text), ['by simp', 'by auto', 'by fastforce', 'by force', 'by (metis rev_rev_ident)']);
assert(try0Only.every(result => result.insertable));

// Cancel: an <error_message>Interrupt</error_message> ends the output; no proof is insertable.
const cancelled = outputMessages(fixture('cancelled'));
assert.deepEqual(cancelled.map(message => message.kind), ['writeln', 'writeln', 'error']);
assert.equal(cancelled[2].text, 'Interrupt');
assert.deepEqual(sledgehammerResults(cancelled), []);

// No proof state at the caret (on `sorry` or outside a proof).
assert.deepEqual(outputMessages(fixture('no_proof_context')),
  [{ kind: 'error', segments: [{ text: 'Unknown proof context' }], text: 'Unknown proof context' }]);

// Synthetic shapes the server can produce: a failed reconstruction is shown but
// not insertable, an Isar proof keeps its newlines, text may contain symbols and entities.
const synthetic = outputMessages(
  '<writeln_message>e: One-line proof reconstruction failed: by (metis rev_rev_ident)</writeln_message>'
  + '<writeln_message>vampire: Try this: <sendback padding="command" id="-9">proof -\n  have "x &lt; y \\&lt;or&gt; True" by simp\n  then show ?thesis by blast\nqed</sendback> (12 ms)</writeln_message>'
  + '<writeln_message>Done</writeln_message>');
assert.deepEqual(sledgehammerResults(synthetic), [
  { text: 'by (metis rev_rev_ident)', insertable: false, prover: 'e',
    message: 'e: One-line proof reconstruction failed: by (metis rev_rev_ident)' },
  { text: 'proof -\n  have "x < y \\<or> True" by simp\n  then show ?thesis by blast\nqed', insertable: true,
    prover: 'vampire', time: '12 ms', message: synthetic[1].text },
]);
assert.deepEqual(outputMessages(''), []);
assert.deepEqual(outputMessages('loose text<unknown>x</unknown>'), []);
console.log('PASS: markupXml parses live Sledgehammer output, sendbacks and tolerant edge cases');
