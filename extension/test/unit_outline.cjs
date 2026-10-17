// Pure checks for the lexical outline and the theorem-status classifier; no VS Code.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { outline, goalItems, declaredName } = require('../out/outlineModel');
const { classifyTheorems, statusIcon } = require('../out/theoremStatus');

const flat = items => items.flatMap(item => [item, ...flat(item.children)]);
const label = item => item.name ? `${item.command} ${item.name}` : item.command;

exports.checkOutline = function () {
  const source = fs.readFileSync(path.join(__dirname, '../../examples/Sqrt2.thy'), 'utf8');
  const lines = source.split('\n');
  const qed = lines.lastIndexOf('qed');
  const { items, folds } = outline(source);
  assert.deepEqual(items.map(label), ['theorem sqrt2_irrational']);
  assert.equal(items[0].line, 6);
  assert.equal(items[0].endLine, qed, 'item folds to the last line before end, blank lines excluded');
  assert.equal(items[0].kind, 'goal');
  assert.equal(items[0].detail, 'theorem');
  assert.equal(lines[6].slice(items[0].nameStart, items[0].nameEnd), 'sqrt2_irrational');
  assert(!items[0].oops);
  assert(folds.some(([start, end]) => start === 6 && end === qed));
  assert(folds.some(([start, end]) => start === 7 && end === qed - 1), 'proof…qed folds to the line before qed');
  assert(folds.some(([start, end]) => start === 27 && end === 29), 'nested proof folds too');
  assert(!folds.some(([start]) => lines[start].trimStart().startsWith('have')));

  const tricky = String.raw`theory Test imports Main begin

section \<open>Intro \<alpha>\<close>

text \<open>lemma not_an_item: "False"
  section \<open>fake\<close>\<close>

(* lemma also_fake: "False" (* nested
  theorem still_fake *) *)

lemma first: "True"
proof -
  have "True" by simp
  then show ?thesis by simp
qed

subsection \<open>Blocks\<close>

locale shifted =
  fixes x :: nat
begin

lemma inside: "x = x" by simp

definition twice :: "nat \<Rightarrow> nat" where "twice n = 2 * n"

end

locale flat = shifted

datatype 'a tree = Leaf | Node "'a tree" 'a "'a tree"
datatype ('a, 'b) either = L 'a | R 'b
theorem (in shifted) targeted: "x = x" by simp
lemma assumes "P" shows "P" by assumption
definition "anon = (1::nat)"
fun f and g where "f 0 = 0" | "g 0 = 0"
lemma broken: "False" oops
instantiation nat :: finite
begin
instance sorry
end
context shifted
begin
lemma deep: "x = x" by simp
end

section \<open>Second\<close>

lemma last: "True" by simp

end
`;
  const trickyLines = tricky.split('\n');
  const at = text => trickyLines.indexOf(text);
  const model = outline(tricky);
  assert.deepEqual(model.items.map(label), [String.raw`section Intro \<alpha>`, 'section Second']);
  const [intro, second] = model.items;
  assert.equal(intro.name, String.raw`Intro \<alpha>`);
  assert.deepEqual(intro.children.map(label), ['lemma first', 'subsection Blocks']);
  assert.equal(intro.children[0].endLine, at('qed'));
  const blocks = intro.children[1];
  assert.equal(blocks.name, 'Blocks');
  assert.deepEqual(blocks.children.map(label), ['locale shifted', 'locale flat', 'datatype tree', 'datatype either',
    'theorem targeted', 'lemma', 'definition', 'fun f', 'lemma broken', 'instantiation nat', 'context shifted']);
  const [shifted, flatLocale, , , targeted, anonymous, anonymousDefinition, , broken, instantiation, context] = blocks.children;
  assert(shifted.block && !flatLocale.block, 'a locale is a block only when begin follows');
  assert.deepEqual(shifted.children.map(label), ['lemma inside', 'definition twice']);
  assert.equal(shifted.line, at('locale shifted ='));
  assert.equal(shifted.endLine, at('end'), 'a block includes its end');
  assert.equal(shifted.children[1].endLine, at('end') - 2);
  assert.equal(targeted.nameStart, trickyLines[targeted.line].indexOf('targeted'));
  assert.equal(anonymous.name, undefined);
  assert.equal(anonymous.detail, 'assumes "P" shows "P" by assumption');
  assert.equal(anonymousDefinition.detail, '"anon = (1::nat)"');
  assert(broken.oops, 'oops inside a lemma marks it');
  assert(!flat(model.items).some(item => item !== broken && item.oops));
  assert(instantiation.block && instantiation.children.length === 0);
  assert.deepEqual(context.children.map(label), ['lemma deep']);
  assert.equal(context.endLine, context.line + 3);
  assert.equal(second.name, 'Second');
  assert.deepEqual(second.children.map(label), ['lemma last']);
  assert.equal(second.endLine, at('lemma last: "True" by simp'), 'the theory end closes the last heading');
  assert(!flat(model.items).some(item => /fake|not_an_item/.test(item.name ?? '')), 'prose and comments create no entries');
  assert.deepEqual(goalItems(model).map(item => item.name), ['first', 'inside', 'targeted', undefined, 'broken', 'deep', 'last']);
  assert(model.folds.some(([start, end]) => start === at(String.raw`text \<open>lemma not_an_item: "False"`) && end === start + 1),
    'a multi-line cartouche folds');

  assert.deepEqual(declaredName(' foo[simp]: "x"'), { name: 'foo', column: 1 });
  assert.equal(declaredName(' assumes "P"'), undefined);
  assert.equal(declaredName(' "x = x"'), undefined);
  assert.deepEqual(declaredName(" 'a set = \"'a \\<Rightarrow> bool\""), { name: 'set', column: 4 });
  assert.deepEqual(declaredName(' (in loc) thm:'), { name: 'thm', column: 10 });
  assert.deepEqual(outline('lemma unfinished: "x"\n  have').items.map(item => item.endLine), [1]);
  assert.deepEqual(outline('').items, []);
  console.log('PASS: Sqrt2 outline, headings, blocks, names, anonymous goals, oops, opaque prose and folds');
};

exports.checkStatus = function () {
  const items = [
    { name: 'a', command: 'lemma', line: 2, endLine: 5 },
    { name: 'b', command: 'theorem', line: 7, endLine: 12 },
    { command: 'lemma', line: 14, endLine: 14, oops: true },
    { name: 'd', command: 'lemma', line: 16, endLine: 20 },
  ];
  const facts = { known: true, errors: [[8, 2, 8, 6]], sorries: [[4, 4, 4, 9]], busy: [[17, 0, 19, 3]] };
  assert.deepEqual(classifyTheorems(items, facts).map(item => [item.name, item.line, item.status]),
    [['a', 2, 'unfinished'], ['b', 7, 'error'], ['lemma', 14, 'unfinished'], ['d', 16, 'checking']]);
  assert.deepEqual(classifyTheorems(items, { ...facts, known: false }).map(item => item.status),
    ['checking', 'checking', 'checking', 'checking'], 'an unconfirmed version is never proved');
  assert.deepEqual(classifyTheorems(items, { known: true, errors: [], sorries: [], busy: [] }).map(item => item.status),
    ['proved', 'proved', 'unfinished', 'proved']);
  // An error wins over an admission in the same theorem; a busy span touching
  // column 0 of the first line lies before it, one ending inside overlaps.
  assert.equal(classifyTheorems([items[0]], { known: true, errors: [[3, 0, 3, 4]], sorries: [[4, 4, 4, 9]], busy: [] })[0].status, 'error');
  assert.equal(classifyTheorems([items[0]], { known: true, errors: [], sorries: [], busy: [[0, 0, 2, 0]] })[0].status, 'proved');
  assert.equal(classifyTheorems([items[0]], { known: true, errors: [], sorries: [], busy: [[0, 0, 2, 1]] })[0].status, 'checking');
  assert.equal(classifyTheorems([items[0]], { known: true, errors: [[6, 0, 6, 1]], sorries: [], busy: [] })[0].status, 'proved');
  for (const status of ['proved', 'unfinished', 'error', 'checking']) {
    const icon = statusIcon(status);
    assert(icon.startsWith('data:image/svg+xml;base64,'));
    const svg = Buffer.from(icon.slice(icon.indexOf(',') + 1), 'base64').toString();
    assert(svg.startsWith('<svg') && svg.endsWith('</svg>') && !svg.includes('{c}'));
  }
  console.log('PASS: theorem status precedence, unknown versions, overlap edges and icons');
};

if (require.main === module) { exports.checkOutline(); exports.checkStatus(); }
