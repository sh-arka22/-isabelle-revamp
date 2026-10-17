// Use the installed editor's TextMate and Oniguruma, not a second tokenizer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

exports.checkHighlighting = async function (app) {
  const textmate = require(path.join(app, 'node_modules.asar/vscode-textmate'));
  const onig = require(path.join(app, 'node_modules.asar/vscode-oniguruma'));
  const wasm = fs.readFileSync(path.join(app, 'node_modules.asar.unpacked/vscode-oniguruma/release/onig.wasm'));
  await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
  const extension = path.resolve(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'package.json'), 'utf8'));
  const contribution = manifest.contributes.grammars.find(item => item.language === 'isabelle');
  assert(manifest.contributes.languages.find(item => item.id === 'isabelle').extensions.includes('.thy'));
  const registry = new textmate.Registry({
    onigLib: Promise.resolve({ createOnigScanner: onig.createOnigScanner, createOnigString: onig.createOnigString }),
    loadGrammar: async () => JSON.parse(fs.readFileSync(path.join(extension, contribution.path), 'utf8')),
  });
  try {
    const grammar = await registry.loadGrammar(contribution.scopeName);
    const tokenize = (line, state = textmate.INITIAL) => grammar.tokenizeLine(line, state);
    const has = (result, scope) => result.tokens.some(token => token.scopes.includes(scope));
    const scopesOf = (line, word, state = textmate.INITIAL) => {
      const column = line.indexOf(word);
      const token = tokenize(line, state).tokens.find(item => item.startIndex <= column && item.endIndex >= column + word.length);
      assert(token, `No token ${word} in ${line}`);
      return token.scopes;
    };
    const keywordScope = scopes => scopes.some(scope => /^(keyword|storage\.type|support\.function|entity\.name)/.test(scope));
    const classes = {
      'keyword.other.structure.isabelle': 'theory imports begin end',
      'storage.type.isabelle': 'lemma theorem corollary proposition definition abbreviation fun function primrec datatype inductive locale class instantiation type_synonym typedef record declare lemmas axiomatization',
      'keyword.control.proof.isabelle': 'proof qed have show obtain assume fix from then hence thus using unfolding also finally next case with note let moreover ultimately by apply done .. .',
      'keyword.other.unfinished.isabelle': 'sorry oops',
      'keyword.other.document.isabelle': 'text section subsection',
      'keyword.other.quasi.isabelle': 'where and assumes shows',
    };
    let keywords = [];
    for (const [scope, words] of Object.entries(classes)) {
      for (const word of words.split(' ')) assert(has(tokenize(word), scope), `${word} should be ${scope}`);
      keywords = keywords.concat(words.split(' '));
    }
    const methods = 'simp auto blast metis force fastforce arith linarith rule induct induction cases simp_all clarsimp clarify intro elim presburger smt meson unfold subst insert standard this assumption -'.split(' ');
    for (const method of methods) {
      assert(scopesOf('by ' + method, method).includes('support.function.method.isabelle'), method);
      assert(scopesOf('apply (' + method + ')', method).includes('support.function.method.isabelle'), method);
      assert(scopesOf('proof ' + method, method).includes('support.function.method.isabelle'), method);
    }
    assert(!keywordScope(scopesOf('using simp this by blast', 'simp')), 'A fact named like a method stays plain outside method position');
    for (const name of ["theory'", 'proof_lemma', 'Some.proof', "'theory", 'αproof', 'proofβ', 'standby']) {
      assert(!tokenize(name).tokens.some(token => keywordScope(token.scopes)), 'Identifier mistaken for keyword: ' + name);
    }
    for (const symbol of ['\\<notin>', '\\<rat>', '\\<forall>', '\\<Rightarrow>', '\\<^sub>']) {
      for (const line of [symbol, '"' + symbol + '"']) {
        assert(has(tokenize(line), 'constant.character.escape.isabelle'), line);
      }
    }
    for (const symbol of ['∉', '∀', '⇒', '√']) assert(has(tokenize(symbol), 'keyword.operator.isabelle'), symbol);
    assert(has(tokenize('ℚ'), 'constant.language.isabelle'));
    for (const line of ['"show theorem"', String.raw`"escaped \" proof"`,
      '(* proof (* nested *) show *)', '‹show ‹theorem› qed›',
      String.raw`\<open>show \<open>theorem\<close> qed\<close>`, 'text ‹show theorem›', 'text "qed by simp"']) {
      assert(!tokenize(line).tokens.some(token => token.scopes.some(scope => /^keyword\.(control|other\.(structure|unfinished))/.test(scope))), line);
    }
    // Alex's sanity line: inner syntax is mathematics, never a string.
    const lemma = 'lemma foo: "x + 0 = (x::nat)" by simp';
    assert(scopesOf(lemma, 'lemma').includes('storage.type.isabelle'));
    assert(scopesOf(lemma, 'foo').includes('entity.name.function.isabelle'));
    assert(scopesOf(lemma, 'by').includes('keyword.control.proof.isabelle'));
    assert(scopesOf(lemma, 'simp').includes('support.function.method.isabelle'));
    const inner = tokenize(lemma).tokens.filter(token => token.scopes.includes('meta.inner-syntax.isabelle'));
    assert(inner.length > 4 && inner.every(token => !token.scopes.some(scope => scope.startsWith('string'))), 'inner syntax carries no string scope');
    assert(scopesOf(lemma, 'x').includes('variable.other.isabelle'));
    assert(scopesOf(lemma, '+').includes('keyword.operator.isabelle'));
    assert(scopesOf(lemma, '0').includes('constant.numeric.isabelle'));
    assert(scopesOf(lemma, '::').includes('keyword.operator.type.isabelle'));
    assert(scopesOf('datatype \'a tree = Leaf', 'tree').includes('entity.name.function.isabelle'));
    assert(scopesOf('"\'a list"', "'a").includes('storage.type.variable.isabelle'));
    assert(scopesOf('"sqrt (2::real) \\<notin> \\<rat>"', '\\<notin>').includes('constant.character.escape.isabelle'));
    assert(scopesOf('text \\<open>Prose here.\\<close>', 'Prose here.').includes('comment.block.documentation.isabelle'));
    assert(scopesOf('lemma foo [simp]: "x"', 'foo').includes('entity.name.function.isabelle'));
    assert(has(tokenize('‹plain cartouche›'), 'string.quoted.other.isabelle'));
    assert(!has(tokenize('text ‹prose›'), 'string.quoted.other.isabelle'));
    // Multi-line contexts must resume the outer grammar at their closing token.
    for (const [opening, closing] of [['(* nested (*', '*) *)'], ['‹‹', '››'],
      [String.raw`\<open>\<open>`, String.raw`\<close>\<close>`], ['"', '"'], ['text ‹', '›'], ['text \\<open>', '\\<close>']]) {
      let state = tokenize(opening).ruleStack;
      assert(!has(tokenize('show', state), 'keyword.control.proof.isabelle'), opening);
      state = tokenize(closing, state).ruleStack;
      assert(has(tokenize('show', state), 'keyword.control.proof.isabelle'), closing);
    }
    let state = textmate.INITIAL;
    let commands = 0;
    const source = fs.readFileSync(path.join(extension, '../examples/Sqrt2.thy'), 'utf8');
    for (const line of source.split('\n')) {
      const result = tokenize(line, state);
      state = result.ruleStack;
      const firstWord = /^\s*([a-z]+)/.exec(line)?.[1];
      if (keywords.includes(firstWord)) {
        assert(result.tokens.some(token => line.slice(token.startIndex, token.endIndex) === firstWord && keywordScope(token.scopes)), line);
        commands++;
      }
      if (line.trimStart().startsWith('text ')) assert(has(result, 'comment.block.documentation.isabelle'), line);
      if (/^\s+by /.test(line)) assert(has(result, 'support.function.method.isabelle'), line);
    }
    assert(commands > 30);
    assert.equal(state.depth, textmate.INITIAL.depth, 'Highlighting leaked past the final end');

    // Resolve actual built-in theme inheritance and compare token presentation.
    function theme(file) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return { settings: [...(data.include ? theme(path.resolve(path.dirname(file), data.include)).settings : []),
        ...(data.tokenColors ?? [])] };
    }
    for (const name of ['dark_plus', 'light_plus', 'hc_black', 'hc_light']) {
      registry.setTheme(theme(path.join(app, 'extensions/theme-defaults/themes/' + name + '.json')));
      // TextMate's encoded token foreground occupies bits 15–23. Compare the
      // colour of the token at a column, not token-type bits.
      const style = (line, column = 0) => {
        const tokens = grammar.tokenizeLine2(line, textmate.INITIAL).tokens;
        let metadata = tokens[1];
        for (let i = 0; i < tokens.length; i += 2) if (tokens[i] <= column) metadata = tokens[i + 1];
        return (metadata & 16744448) >>> 15;
      };
      const plain = style('sqrt2_irrational');
      assert.notEqual(style('theorem'), plain, name + ': keywords need a distinct style');
      assert.notEqual(style('lemma foo:', 6), style('lemma foo:'), name + ': the declared name differs from its command');
      assert.notEqual(style('"x"', 1), plain, name + ': inner-syntax identifiers differ from plain text');
      assert.notEqual(style('by simp', 3), style('by simp'), name + ': methods differ from proof commands');
      assert.notEqual(style('text ‹prose›', 6), plain, name + ': prose reads as documentation');
      assert.notEqual(style('(* comment *)', 3), plain, name + ': comments are distinct');
    }
    console.log(`PASS: VS Code TextMate grammar, ${keywords.length} keywords, ${methods.length} methods, ${commands} demo command lines, inner syntax, prose, contexts, and four built-in themes`);
  } finally { registry.dispose(); }
};
