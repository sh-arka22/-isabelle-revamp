// Symbol input, scripts and cartouches in stock VS Code with the real server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const { checkSymbols } = require('./unit_symbols.cjs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.run = async function () {
  checkSymbols();
  const root = path.resolve(__dirname, '../..');
  const original = fs.readFileSync(path.join(root, 'examples/Sqrt2.thy'), 'utf8');
  const directory = path.join(root, '.dev-host/symbols-fixture');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'Input.thy');
  const source = [
    'theory Input imports Complex_Main begin',
    'lemma scripts: "(x::real)\\<^sup>2 = x\\<^sup>n \\<and> y\\<^sup>Q = y\\<^sub>i" sorry',
    'lemma fails: "\\<forall>x::nat. x \\<noteq> x \\<longrightarrow> (x::nat)\\<^sup>2 = x * x"',
    '  by (rule TrueI)',
    'lemma "True"',
    '  sorry',
    'end',
    '',
  ].join('\n');
  fs.writeFileSync(file, source);
  const document = await vscode.workspace.openTextDocument(file);
  let editor = await vscode.window.showTextDocument(document);
  const api = await vscode.extensions.getExtension('hymanimy.isabelle-revamp').activate();
  const settings = vscode.workspace.getConfiguration('isabelleRevamp');
  const settingsFile = path.join(root, '.vscode/settings.json');
  const originalSettings = fs.readFileSync(settingsFile, 'utf8');
  const priorPretty = settings.inspect('prettySymbols').workspaceValue;
  const priorRewrite = settings.inspect('symbolRewrite').workspaceValue;
  const results = {};

  async function until(label, condition, timeout = 20000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (condition()) { console.log('PASS: ' + label); return; } await pause(50); }
    throw new Error('timeout: ' + label);
  }
  const line = n => document.lineAt(n).text;
  async function type(text) {
    for (const char of text) {
      // Enter would accept an open suggestion instead of inserting a line break.
      if (char === '\n') await vscode.commands.executeCommand('hideSuggestWidget');
      await vscode.commands.executeCommand('type', { text: char });
      await pause(40);
    }
  }
  async function replace(text) {
    assert(await editor.edit(edit => edit.replace(new vscode.Range(0, 0, document.lineCount, 0), text)));
  }
  async function goto(lineNumber, character) {
    editor.selection = new vscode.Selection(lineNumber, character, lineNumber, character);
    await pause(60);
  }
  const ascii = text => !/[^\x00-\x7f]/.test(text);

  try {
    await settings.update('prettySymbols', true, vscode.ConfigurationTarget.Workspace);
    await settings.update('symbolRewrite', true, vscode.ConfigurationTarget.Workspace);
    await goto(0, 0);
    await pause(200);

    // Item 7: superscripts and subscripts in the editor, as display data over ASCII source.
    const pretty = api.getPrettySymbols();
    const text = item => document.getText(new vscode.Range(document.positionAt(item.start), document.positionAt(item.end)));
    const squared = pretty.find(item => item.text === '²');
    assert(squared && text(squared) === '\\<^sup>2', JSON.stringify(pretty));
    const nth = pretty.find(item => item.text === 'ⁿ');
    assert(nth && text(nth) === '\\<^sup>n');
    const kept = pretty.find(item => item.keep && item.style === 'sup');
    assert(kept && text(kept) === 'Q');
    const hidden = pretty.find(item => item.text === '' && item.end === kept.start);
    assert(hidden && text(hidden) === '\\<^sup>');
    const sub = pretty.find(item => item.text === 'ᵢ');
    assert(sub && text(sub) === '\\<^sub>i');
    assert(pretty.some(item => item.text === '∀') && pretty.some(item => item.text === '‹') === false);
    results.pretty = pretty;
    console.log('PASS: \\<^sup>2 → ², \\<^sup>n → ⁿ, \\<^sup>Q keeps a raised Q, \\<^sub>i → ᵢ');

    // Item 6(b): completion items from the installed table and its abbrevs.
    await replace(source.replace('lemma "True"', 'lemma "\\forall'));
    await goto(4, 14);
    const completions = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', document.uri, new vscode.Position(4, 14));
    const insertOf = item => typeof item.insertText === 'string' ? item.insertText : item.insertText?.value;
    const forall = completions.items.find(item => item.label === '\\forall');
    assert(forall, 'our \\forall item');
    assert.equal(insertOf(forall), '\\<forall>');
    assert.equal(forall.detail, '∀  \\<forall>');
    assert.equal(forall.filterText, '\\forall ∀');
    assert.equal(document.getText(forall.range), '\\forall');
    const bang = completions.items.find(item => item.label === '!' && insertOf(item) === '\\<forall>');
    assert(bang, 'the ! abbrev');
    assert.equal(bang.filterText, '\\!');
    const open = completions.items.find(item => item.label === '\\open');
    assert(open && open.insertText instanceof vscode.SnippetString && open.insertText.value.includes('$0'));
    assert(completions.items.every(item => ascii(insertOf(item) ?? '')), 'every item inserts ASCII');
    results.completion = { count: completions.items.length, forall, bang };
    console.log('PASS: completion offers \\forall, the ! abbrev and the \\open snippet, all inserting ASCII');

    // Item 6(c): rewrite on type at a terminator.
    await goto(4, 14);
    await type(' ');
    await until('\\forall + space → \\<forall>', () => line(4) === 'lemma "\\<forall> ');
    await type('x. x \\noteq');
    assert(line(4).endsWith('\\noteq'), line(4));
    await type(' ');
    await until('\\noteq + space → \\<noteq>', () => line(4) === 'lemma "\\<forall> x. x \\<noteq> ');
    await type('x\\^sub');
    await type('1');
    await until('\\^sub + argument → \\<^sub>1', () => line(4).endsWith('x\\<^sub>1'));

    // Item 11(b): the << and >> shortcuts, but never x >> 2 inside a formula.
    await replace(source.replace('lemma "True"', 'text '));
    await goto(4, 5);
    await type('<<');
    await until('<< → \\<open>', () => line(4) === 'text \\<open>');
    await type('words>>');
    await until('>> after an open cartouche → \\<close>', () => line(4) === 'text \\<open>words\\<close>');
    await type('\nlemma "x >> 2');
    await until('"x >> 2" stays a formula', () => line(5).startsWith('lemma "x >> 2'));
    assert(!document.getText().includes('\\<close>\\<close>'), document.getText());
    await settings.update('symbolRewrite', false, vscode.ConfigurationTarget.Workspace);
    await pause(100);
    await goto(5, line(5).length);
    await type('\n\\forall ');
    await pause(300);
    assert.equal(line(6), '\\forall ', 'the setting turns the rewrite off');
    await settings.update('symbolRewrite', true, vscode.ConfigurationTarget.Workspace);

    // Item 11(c): the converter command on a fixture, whole document then selection.
    const fixture = [
      'theory Input imports Complex_Main "HOL-Library.Multiset" begin',
      'text \\<open>keep "these"\\<close> (* "and these" *)',
      'lemma one: "x = \\"y\\" \\<and> P" by simp',
      'lemma two: "True" by simp',
      'end',
      '',
    ].join('\n');
    await replace(fixture);
    await goto(0, 0);
    const converted = await vscode.commands.executeCommand('isabelleRevamp.convertQuotesToCartouches');
    assert.equal(converted, 2);
    assert.equal(document.getText(), fixture
      .replace('"x = \\"y\\" \\<and> P"', '\\<open>x = "y" \\<and> P\\<close>')
      .replace('"True"', '\\<open>True\\<close>'));
    await replace(fixture);
    editor.selection = new vscode.Selection(3, 0, 4, 0);
    assert.equal(await vscode.commands.executeCommand('isabelleRevamp.convertQuotesToCartouches'), 1);
    assert(line(2).includes('"x = \\"y\\" \\<and> P"') && line(3) === 'lemma two: \\<open>True\\<close> by simp');
    assert(ascii(document.getText()));
    console.log('PASS: Convert Quotes to Cartouches skips imports, cartouches and comments; selection limits it');

    // Item 6(d): Insert Symbol… picks from the table and inserts the escape.
    await replace(source);
    await goto(4, 0);
    const picking = vscode.commands.executeCommand('isabelleRevamp.insertSymbol');
    await pause(500);
    await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
    await picking;
    await until('Insert Symbol inserts the first entry as ASCII', () => /^\\<[A-Za-z]+>lemma "True"$/.test(line(4)));

    // Item 6(a): the live server. Session abbrevs arrive once; diagnostics are Unicode.
    await replace(source);
    await document.save();
    await goto(3, 4);
    await until('PIDE/abbrevs_response received', () => api.getSessionAbbrevs().length > 0, 240000);
    const abbrevs = api.getSessionAbbrevs();
    assert(abbrevs.some(([from]) => from === '?<'), JSON.stringify(abbrevs));
    const errors = () => vscode.languages.getDiagnostics(document.uri).filter(d => d.severity === vscode.DiagnosticSeverity.Error);
    await until('diagnostic arrives decoded', () => errors().some(d => d.message.includes('∀x. x ≠ x ⟶ x² = x * x')), 120000);
    await replace(source.replace('lemma "True"', 'lemma "\\'));
    await goto(4, 8);
    const sessionItems = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', document.uri, new vscode.Position(4, 8));
    const exists = sessionItems.items.find(item => item.label === '?<');
    assert(exists && insertOf(exists) === '\\<exists>\\<^sub>\\<le>\\<^sub>1', JSON.stringify(exists));
    console.log('PASS: session abbrev ?< completes to ASCII \\<exists>\\<^sub>\\<le>\\<^sub>1');
    results.abbrevs = abbrevs;
    results.diagnostics = errors().map(d => d.message);

    assert(ascii(fs.readFileSync(file, 'utf8')), 'the fixture on disk stays ASCII');
    assert.equal(fs.readFileSync(path.join(root, 'examples/Sqrt2.thy'), 'utf8'), original);
    fs.writeFileSync(path.join(root, '.dev-host/symbols-results.json'), JSON.stringify({ ...results, passed: true }, null, 2));
    console.log('Symbols checks passed. Original example unchanged.');
  } finally {
    await settings.update('prettySymbols', priorPretty, vscode.ConfigurationTarget.Workspace);
    await settings.update('symbolRewrite', priorRewrite, vscode.ConfigurationTarget.Workspace);
    // VS Code reformats the preceding setting when removing our temporary keys.
    if (JSON.stringify(JSON.parse(fs.readFileSync(settingsFile, 'utf8'))) === JSON.stringify(JSON.parse(originalSettings))) {
      fs.writeFileSync(settingsFile, originalSettings);
    }
    editor = await vscode.window.showTextDocument(document);
    await replace(source);
    await document.save();
  }
};
