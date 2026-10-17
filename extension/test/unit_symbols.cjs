// Pure checks for symbol input and display: node extension/test/unit_symbols.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parseSymbolEntries, parseSymbolTable, symbolReplacements, unicodeSymbols, encodeSymbols } = require('../out/symbols');
const { completionCandidates, rewriteOnType, scanContext } = require('../out/symbolInput');
const { cartoucheConversions, convertQuotesToCartouches } = require('../out/cartouches');

const sample = String.raw`# comment
\<forall>               code: 0x002200  group: logic  abbrev: !  abbrev: ALL
\<Longrightarrow>       code: 0x0027f9  group: arrow  abbrev: .>  abbrev: ==>
\<open>                 code: 0x002039  group: punctuation  font: Isabelle␣DejaVu␣Sans␣Mono  abbrev: <<
\<^sub>                 code: 0x0021e9  group: control  font: Isabelle␣DejaVu␣Sans␣Mono
\<^latex>                               group: document  argument: cartouche
\<bad>                  code: 0xd800
`;

exports.checkSymbols = function () {
  // etc/symbols: names, glyphs and every abbrev, including symbols without a code.
  const entries = parseSymbolEntries(sample);
  assert.deepEqual(entries.map(e => e.name), ['forall', 'Longrightarrow', 'open', '^sub', '^latex', 'bad']);
  assert.deepEqual(entries[0], { name: 'forall', glyph: '∀', abbrevs: ['!', 'ALL'], group: 'logic' });
  assert.deepEqual(entries[1].abbrevs, ['.>', '==>']);
  assert.deepEqual(entries[2].abbrevs, ['<<']);
  assert.equal(entries[4].glyph, undefined);
  assert.equal(entries[5].glyph, undefined);
  assert.deepEqual({ ...parseSymbolTable(sample) }, { forall: '∀', Longrightarrow: '⟹', open: '‹', '^sub': '⇩' });
  const installed = '/home/user/Isabelle2025-2.app/etc/symbols';
  if (fs.existsSync(installed)) {
    const real = parseSymbolEntries(fs.readFileSync(installed, 'utf8'));
    assert(real.filter(e => e.glyph).length > 400);
    assert.deepEqual(real.find(e => e.name === 'forall').abbrevs, ['!', 'ALL']);
    assert.deepEqual(real.find(e => e.name === 'close').abbrevs, ['>>']);
    assert(real.some(e => e.name === '^latex' && !e.glyph));
  }

  // Completion candidates: symbol, abbrev, the \open snippet, and session abbrevs encoded to ASCII.
  const session = [['?<', '∃⇩≤⇩1'], ['hence', ''], ['===>', '===>'], ['\\tag', '✐‹tag \u0007›'], ['!', '∀']];
  const candidates = completionCandidates(entries, session);
  const forall = candidates.find(c => c.label === '\\forall');
  assert.deepEqual(forall, { label: '\\forall', detail: '∀  \\<forall>', insert: '\\<forall>', filter: '\\forall ∀' });
  const bang = candidates.find(c => c.label === '!');
  assert.deepEqual(bang, { label: '!', detail: '∀  \\<forall>  abbrev', insert: '\\<forall>', filter: '\\!' });
  assert.equal(candidates.filter(c => c.label === '!').length, 1, 'session duplicate of a symbol abbrev is dropped');
  assert.equal(candidates.find(c => c.label === '==>').insert, '\\<Longrightarrow>');
  const open = candidates.find(c => c.label === '\\open');
  assert.equal(open.snippet, true);
  assert.equal(open.insert, '\\\\<open>$0\\\\<close>');
  assert.equal(candidates.find(c => c.label === '?<').insert, '\\<exists>\\<^sub>\\<le>\\<^sub>1');
  assert(!candidates.some(c => c.label === 'hence' || c.label === '===>'));
  const tag = candidates.find(c => c.label === '\\tag');
  assert.equal(tag.snippet, true);
  assert.equal(tag.insert, '\\\\<^marker>\\\\<open>tag $0\\\\<close>');
  assert(!candidates.some(c => /[^\x00-\x7f]/.test(c.insert)), 'no candidate inserts Unicode');
  assert.equal(encodeSymbols('∃x. x ≠ ⇧2'), '\\<exists>x. x \\<noteq> \\<^sup>2');
  assert.equal(unicodeSymbols(encodeSymbols('∀x. x ≠ y')), '∀x. x ≠ y');

  // Context scan.
  assert.deepEqual(scanContext('lemma "x'), { comment: false, string: true, opens: 0 });
  assert.deepEqual(scanContext('(* (* nested *) still'), { comment: true, string: false, opens: 0 });
  assert.deepEqual(scanContext('text \\<open>a \\<open>b\\<close>'), { comment: false, string: false, opens: 1, command: 'text' });
  assert.deepEqual(scanContext('text \\<open>\n  next line'), { comment: false, string: false, opens: 0, command: 'text' });
  assert.deepEqual(scanContext('"\\\\" (* not a comment'), { comment: true, string: false, opens: 0 });
  // The enclosing command is the word before the outermost open cartouche, on any line.
  assert.deepEqual(scanContext('ML \\<open>val s = "a'), { comment: false, string: true, opens: 1, command: 'ML' });
  assert.deepEqual(scanContext('ML ‹\n  val s = "a'), { comment: false, string: true, opens: 0, command: 'ML' });
  assert.deepEqual(scanContext('lemma foo: "x" ‹y ‹z›'), { comment: false, string: false, opens: 1, command: 'foo' });
  assert.deepEqual(scanContext('text ‹a› lemma ‹'), { comment: false, string: false, opens: 1, command: 'lemma' });
  assert.deepEqual(scanContext('‹'), { comment: false, string: false, opens: 1, command: '' });

  // Rewrite on type.
  // The installed table also has the one-letter bold alphabet (\<a>…\<Z>).
  const known = name => name.length === 1 || entries.some(e => e.name === name);
  const at = (prefix, typed) => rewriteOnType(prefix, typed, known);
  assert.deepEqual(at('lemma "\\forall', ' '), { start: 7, end: 14, from: '\\forall', text: '\\<forall>' });
  assert.deepEqual(at('lemma "\\forall', ')'), { start: 7, end: 14, from: '\\forall', text: '\\<forall>' });
  assert.deepEqual(at('lemma "\\forall', '\n  '), { start: 7, end: 14, from: '\\forall', text: '\\<forall>' });
  assert.deepEqual(at('lemma "\\forall', '()'), { start: 7, end: 14, from: '\\forall', text: '\\<forall>' });
  assert.equal(at('lemma "\\forall', 'x'), undefined, 'a name character continues the name');
  assert.equal(at('lemma "\\foral', ' '), undefined, 'not exactly a symbol');
  assert.equal(at('lemma "\\forall', 'xy'), undefined, 'pasted text is not a keystroke');
  assert.equal(at('(* \\forall', ' '), undefined, 'never inside comments');
  // ML strings, prose and the one-letter names stay as typed; inner syntax in a cartouche converts.
  assert.equal(at('ML \\<open>val s = "a\\n', '"'), undefined, 'an ML string escape inside a cartouche');
  assert.equal(at('ML ‹\n  val s = "a\\n', '"'), undefined, 'the same in a multi-line ML block');
  assert.equal(at('setup \\<open>val s = "a\\forall', '"'), undefined, 'a string inside any cartouche is an ML string');
  assert.equal(at('text \\<open>We have $x \\forall', ' '), undefined, 'LaTeX in prose');
  assert.equal(at('section ‹Intro \\forall', ' '), undefined, 'and in headings');
  assert.equal(at('lemma "a\\n', '"'), undefined, 'one-letter names are reached through completion only');
  assert.equal(at('lemma "x\\t', ' '), undefined);
  assert.deepEqual(at('lemma ‹x \\forall', ' '), { start: 9, end: 16, from: '\\forall', text: '\\<forall>' }, 'inner syntax in a cartouche');
  assert.deepEqual(at('text ‹a› lemma ‹\\forall', ' '), { start: 16, end: 23, from: '\\forall', text: '\\<forall>' });
  assert.deepEqual(at('ML ‹x› lemma "\\forall', ' '), { start: 14, end: 21, from: '\\forall', text: '\\<forall>' }, 'a closed ML block before');
  assert.deepEqual(at('x\\^sub', '1'), { start: 1, end: 6, from: '\\^sub', text: '\\<^sub>' });
  assert.equal(at('\\<forall', '>'), undefined);
  assert.deepEqual(at('text <', '<'), { start: 5, end: 7, from: '<<', text: '\\<open>' });
  assert.deepEqual(at('<', '<'), { start: 0, end: 2, from: '<<', text: '\\<open>' });
  assert.deepEqual(at('\\<^emph><', '<'), { start: 8, end: 10, from: '<<', text: '\\<open>' });
  assert.equal(at('x<', '<'), undefined, 'glued to an identifier');
  assert.equal(at('lemma "x <', '<'), undefined, 'inside a quoted string');
  assert.equal(at('(* <', '<'), undefined);
  assert.deepEqual(at('text \\<open>words>', '>'), { start: 17, end: 19, from: '>>', text: '\\<close>' });
  assert.deepEqual(at('text ‹words >', '>'), { start: 12, end: 14, from: '>>', text: '\\<close>' });
  assert.deepEqual(at('  >', '>'), { start: 2, end: 4, from: '>>', text: '\\<close>' });
  assert.equal(at('lemma "x >', '>'), undefined, 'x >> 2 inside a formula stays');
  assert.equal(at('x>', '>'), undefined);
  assert.equal(at('text \\<open>', '>'), undefined, 'the > of an escape is not a >>');
  assert.equal(at('text \\<open>a\\<close>', '>'), undefined);
  assert.equal(at('a >', '='), undefined);

  // Scripts in the editor: glyphs where Unicode has them, styled source otherwise.
  const script = String.raw`x\<^sup>2 y\<^sup>n z\<^sup>Q w\<^sub>i v\<^sup>\<alpha> \<^bold>b q\<^bsup>n+1\<^esup> r\<^bsub>\<close>\<^esub> s\<^sup> t\<^esup> n^2 \<open>x\<close>`;
  const items = symbolReplacements(script);
  const pos = (text, offset = 0) => script.indexOf(text) + offset;
  const over = (text, offset = 0) => items.filter(i => i.start >= pos(text, offset) && i.end <= pos(text, offset) + text.length - offset);
  assert.deepEqual(over(String.raw`\<^sup>2`), [{ start: pos('\\<^sup>2'), end: pos('\\<^sup>2') + 8, text: '²' }]);
  assert.deepEqual(over(String.raw`\<^sup>n`).map(i => i.text), ['ⁿ']);
  assert.deepEqual(over(String.raw`\<^sup>Q`), [{ start: pos('\\<^sup>Q'), end: pos('\\<^sup>Q') + 7, text: '' },
    { start: pos('\\<^sup>Q', 7), end: pos('\\<^sup>Q', 8), text: 'Q', style: 'sup', keep: true }]);
  assert.deepEqual(over(String.raw`\<^sub>i`).map(i => i.text), ['ᵢ']);
  assert.deepEqual(over(String.raw`\<^sup>\<alpha>`), [{ start: pos('\\<^sup>\\<alpha>'), end: pos('\\<^sup>\\<alpha>') + 15, text: 'α', style: 'sup' }]);
  assert.deepEqual(over(String.raw`\<^bold>b`), [{ start: pos('\\<^bold>b'), end: pos('\\<^bold>b') + 8, text: '' },
    { start: pos('\\<^bold>b', 8), end: pos('\\<^bold>b', 9), text: 'b', style: 'bold', keep: true }]);
  const bsup = pos(String.raw`\<^bsup>`);
  assert.deepEqual(over(String.raw`\<^bsup>n+1\<^esup>`), [{ start: bsup, end: bsup + 8, text: '' },
    { start: bsup + 8, end: bsup + 11, text: 'n+1', style: 'sup', keep: true }, { start: bsup + 11, end: bsup + 19, text: '' }]);
  assert.deepEqual(over(String.raw`\<^bsub>\<close>\<^esub>`).map(i => [i.text, i.style, i.keep]),
    [['', undefined, undefined], ['\\<close>', 'sub', true], ['›', undefined, undefined], ['', undefined, undefined]]);
  assert.deepEqual(over(String.raw`\<^sup> t`).map(i => i.text), ['⇧'], 'a control before white space stays visible');
  assert.deepEqual(over(String.raw`\<^esup> n`).map(i => i.text), ['⇖'], 'an unmatched block end stays visible');
  assert.deepEqual(over(String.raw`n^2 \<open>x\<close>`).map(i => i.text), ['²', '‹', '›']);
  assert.equal(unicodeSymbols(String.raw`x\<^sup>2 y⇧Q z\<^sub>i w⇩q`), 'x² y⇧Q zᵢ w⇩q');

  // Cartouches: outer-syntax quotes only, header and opaque regions skipped, escapes decoded.
  const theory = [
    'theory Fix',
    '  imports Main "HOL-Library.Multiset"',
    '  keywords "foo" :: thy_decl',
    'begin',
    'text \\<open>keep "these" quotes\\<close>',
    '(* "comment" *)',
    'lemma name: "x = \\"y\\" \\<and> P \\\\ \\065"  (* "c" *)',
    '  by (simp add: foo [of "z"])',
    'definition "d = \\<open>in\\<close>"',
    'definition bad: "unbalanced \\<close> x"',
    'end', '',
  ].join('\n');
  const converted = convertQuotesToCartouches(theory);
  assert(converted.includes('imports Main "HOL-Library.Multiset"'));
  assert(converted.includes('keywords "foo"'));
  assert(converted.includes('keep "these" quotes'));
  assert(converted.includes('(* "comment" *)') && converted.includes('(* "c" *)'));
  assert(converted.includes('lemma name: \\<open>x = "y" \\<and> P \\ A\\<close>'));
  assert(converted.includes('[of \\<open>z\\<close>]'));
  assert(converted.includes('definition \\<open>d = \\<open>in\\<close>\\<close>'));
  assert(converted.includes('definition bad: "unbalanced \\<close> x"'));
  assert(!/[^\x00-\x7f]/.test(converted), 'the converted theory is still ASCII');
  const from = theory.indexOf('  by (simp'), to = theory.indexOf('definition bad');
  assert.deepEqual(cartoucheConversions(theory, from, to).map(c => c.text), ['\\<open>z\\<close>', '\\<open>d = \\<open>in\\<close>\\<close>']);
  assert.equal(convertQuotesToCartouches('lemma "x"'), 'lemma \\<open>x\\<close>', 'no header: everything converts');
  assert.equal(convertQuotesToCartouches('theory T imports "A" begin lemma "x"'), 'theory T imports "A" begin lemma \\<open>x\\<close>');
  assert.equal(convertQuotesToCartouches('theory T imports "A"'), 'theory T imports "A"', 'an unfinished header converts nothing');
  console.log('PASS: symbol table and abbrevs, completion candidates, rewrite rules, scripts, cartouche conversion');
};

if (require.main === module) exports.checkSymbols();
