// Pure checks on where a sendback proof goes, given the server's insertion
// position (the end of the query command); no VS Code.
const assert = require('node:assert/strict');
const { proofInsertion } = require('../out/proofInsert');

const apply = (source, offset, proof) => {
  const edit = proofInsertion(source, offset, proof);
  return source.slice(0, edit.start) + edit.text + source.slice(edit.end);
};
const after = (source, marker) => source.indexOf(marker) + marker.length;

// Live shape: PIDE/sledgehammer_insert pointed at line 4 character 34, the
// closing quote of `lemma add_zero: "x + 0 = (x::nat)"`, with `sorry` below.
const probe = 'theory Hammer\n  imports Main\nbegin\n\nlemma add_zero: "x + 0 = (x::nat)"\n  sorry\n\nend\n';
assert.equal(apply(probe, after(probe, '(x::nat)"'), 'by simp'),
  'theory Hammer\n  imports Main\nbegin\n\nlemma add_zero: "x + 0 = (x::nat)"\n  by simp\n\nend\n');

// A `sorry` on the same line is replaced too; `oops` likewise; `sorry'` is a name, not an admission.
assert.equal(apply('lemma "True" sorry\nend', after('lemma "True"', '"True"'), 'by simp'), 'lemma "True" by simp\nend');
assert.equal(apply('lemma "True"\n  oops', 12, 'by blast'), 'lemma "True"\n  by blast');
assert.equal(apply('lemma "True"\n  sorry\'\n', 12, 'by simp'), 'lemma "True"\n  by simp\n  sorry\'\n');

// Without an admission: a new line indented two columns under the command
// (the official client only breaks the line), or in place on a blank line.
assert.equal(apply('  lemma "True"\n', 14, 'by simp'), '  lemma "True"\n    by simp\n');
assert.equal(apply('lemma "True" (* note *)\n', 12, 'by simp'), 'lemma "True"\n  by simp (* note *)\n');
assert.equal(apply('lemma "True"\n  \nend', 15, 'by simp'), 'lemma "True"\n  by simp\nend');

// Isar proofs keep their own relative layout under the chosen indentation.
const isar = 'proof -\n  show ?thesis by simp\nqed';
assert.equal(apply('  lemma "True"\n    sorry\n', 14, isar), '  lemma "True"\n    proof -\n      show ?thesis by simp\n    qed\n');
assert.equal(apply('lemma "True"\n', 12, isar), 'lemma "True"\n  proof -\n    show ?thesis by simp\n  qed\n');
console.log('PASS: proof insertion replaces an admission or starts an indented command');
