// Pure checks for copy-to-editor: sendback detection in sanitised output, the
// ASCII encoding and the edit that puts a suggested proof in. No VS Code:
//   node extension/test/unit_insertProof.cjs   (after npm run compile --prefix extension)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderOutput, splitMessages } = require('../out/outputHtml');
const { proofEdit, sendbackTexts } = require('../out/insertProof');
const { asciiSymbols, unicodeSymbols } = require('../out/symbols');
const { insertButtons, messageHtml, presentation } = require('../out/goalsView');

const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures/output', name), 'utf8');
const doc = lines => ({ lineCount: lines.length, lineAt: line => ({ text: lines[line] }) });
const edit = (lines, line, text) => {
  const result = proofEdit(doc(lines), line, text);
  return result && [result.startLine, result.startCharacter, result.endLine, result.endCharacter, result.text];
};

exports.run = function () {
  // Sendbacks of real try0 output (see docs/PROTOCOL_NOTES.md).
  const try0 = splitMessages(fixture('try0.html'));
  assert.deepEqual(try0.map(message => sendbackTexts(message.html)),
    [[], ['by presburger'], ['by auto'], ['by linarith'], ['by simp'], ['by force'], ['by fastforce'], ['by auto']]);
  assert.deepEqual(sendbackTexts(renderOutput(fixture('goal_facts_using.html')).html), []);
  assert.deepEqual(splitMessages(fixture('value.html')).map(message => sendbackTexts(message.html)), [[]]);
  // Nested markup, entities and scripts inside a sendback; an unclosed one.
  assert.deepEqual(sendbackTexts('<span class="sendback">by (simp add: <span class="free">f</span> x<sup>2</sup> &lt;&amp;&gt; &quot;s&quot;)</span>'
    + ' and <span class="sendback">by auto'), ['by (simp add: f x⇧2 <&> "s")', 'by auto']);
  assert.deepEqual(sendbackTexts('<span class="main sendback">a</span><span class="sendback"/>'), ['a']);
  assert.deepEqual(sendbackTexts('<span class="main">no sendback</span>'), []);

  // Buttons carry the text as data and a short label; attributes are escaped.
  assert.equal(insertButtons(try0[7].html), '<button type="button" class="link insert" data-action="insert" data-text="by auto" '
    + 'title="Insert into the theory at this command">Insert ‹by auto›</button>');
  assert(insertButtons('<span class="sendback">by (metis &quot;a&quot; &lt;b&gt;)</span>').includes('data-text="by (metis &quot;a&quot; &lt;b&gt;)"'));
  const long = insertButtons(`<span class="sendback">${'by (metis '.padEnd(60, 'x')}</span>`);
  assert(long.includes('…›') && !long.includes('x'.repeat(50) + '›'));
  assert.equal(insertButtons('plain'), '');
  assert(messageHtml(try0[7], 7).includes('<div class="message-actions"><button'));
  assert(!messageHtml(try0[0], 0).includes('<button'));
  assert(presentation({ phase: 'ready', text: '', errors: [], messages: try0 }).messagesHtml.includes('data-text="by presburger"'));
  assert.equal(presentation({ phase: 'ready', text: 'g', errors: [], goalHtml: 'g <span class="sendback">by x</span>' }).goalActionsHtml,
    insertButtons('<span class="sendback">by x</span>'));

  // Unicode from the output goes back to Isabelle's ASCII encoding.
  assert.equal(asciiSymbols('by (metis x₁ ∀ (sqrt 2)² ∑ i<n. ⟹ ⟶ ℚ)'),
    String.raw`by (metis x\<^sub>1 \<forall> (sqrt 2)\<^sup>2 \<Sum>i<n. \<Longrightarrow> \<longrightarrow> \<rat>)`);
  const ascii = String.raw`\<lambda>x. x\<^sup>2 \<noteq> y\<^sub>1 \<and> \<not> \<in>`;
  assert.equal(asciiSymbols(unicodeSymbols(ascii)), ascii);
  assert.equal(asciiSymbols('by simp'), 'by simp');

  // The edit: a placeholder at the end of the command line is replaced ...
  assert.deepEqual(edit(['lemma "x" try0 sorry', 'end'], 0, 'by simp'), [0, 15, 0, 20, 'by simp']);
  assert.deepEqual(edit(['  have "p" oops  '], 0, ' by auto '), [0, 11, 0, 17, 'by auto']);
  // ... or alone on the next non-blank line, keeping its indentation ...
  assert.deepEqual(edit(['lemma "x"', '  try0', '', '  sorry', 'end'], 1, 'by simp'), [3, 2, 3, 7, 'by simp']);
  // ... otherwise a new line two deeper than the command, as jEdit indents a `by`.
  assert.deepEqual(edit(['lemma "x"', '  sledgehammer', '  by simp'], 1, 'by (metis a b)'), [1, 14, 1, 14, '\n    by (metis a b)']);
  assert.deepEqual(edit(['lemma "x"'], 0, 'by simp'), [0, 9, 0, 9, '\n  by simp']);
  // Isar proofs are indented line by line; a word ending in sorry is no placeholder.
  assert.deepEqual(edit(['  sledgehammer', '  oops'], 0, 'proof -\n  show ?thesis by simp\nqed'),
    [1, 2, 1, 6, 'proof -\n    show ?thesis by simp\n  qed']);
  assert.equal(edit(['  have "x" using nosorry'], 0, 'by simp')[4], '\n    by simp');
  assert.equal(edit(['a'], 1, 'by simp'), undefined);
  assert.equal(edit(['a'], -1, 'by simp'), undefined);
  assert.equal(edit(['a'], 0, '  '), undefined);
  // Unicode suggestions reach the file as ASCII.
  assert.equal(edit(['lemma "x" sorry'], 0, 'by (simp add: x₁ ∀)')[4], String.raw`by (simp add: x\<^sub>1 \<forall>)`);
  console.log('PASS: sendback detection, insert buttons, ASCII encoding and proof edits');
};

if (require.main === module) exports.run();
