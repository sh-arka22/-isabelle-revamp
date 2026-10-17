// Alex's items 9, 10 and 18 against the real Isabelle server in stock VS Code.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const { checkOutline, checkStatus } = require('./unit_outline.cjs');
const { decorationTypes, renderOptions } = require('../out/decorations');
const { palette } = require('../out/palette');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.run = async function () {
  checkOutline();
  checkStatus();
  assert.equal(renderOptions('dotted_writeln').borderStyle, 'dotted');
  assert.equal(renderOptions('text_free').light.color, palette.free[0]);
  assert.equal(renderOptions('text_overview_error').dark.overviewRulerColor, palette.error[1]);
  assert.equal(renderOptions('background_running1').light.backgroundColor, palette.running1[0]);
  assert(decorationTypes.every(type => Object.values(renderOptions(type).light)[0]));

  const root = path.resolve(__dirname, '../..');
  const original = fs.readFileSync(path.join(root, 'examples/Sqrt2.thy'), 'utf8');
  const placeholder = String.raw`theory Sqrt2
  imports Complex_Main
begin

theorem sqrt2_irrational: "sqrt (2 :: real) \<notin> \<rat>"
proof -
  show ?thesis
    sorry
qed

end
`;
  const structured = String.raw`theory Sqrt2
  imports Complex_Main
begin

section \<open>Structure\<close>

locale shifted =
  fixes x :: nat
begin

lemma inside: "\<forall>y::nat. x \<le> y + x"
  by simp

end

subsection \<open>Output\<close>

thm refl

lemma anonymous_goal: "(2::nat) + 2 = 4"
  by simp

end
`;
  const directory = path.join(root, '.dev-host/decorations-fixture');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'Sqrt2.thy');
  fs.writeFileSync(file, original);
  const document = await vscode.workspace.openTextDocument(file);
  let editor = await vscode.window.showTextDocument(document);
  const api = await vscode.extensions.getExtension('hymanimy.isabelle-revamp').activate();
  const receipts = [];
  const statusOf = name => api.getTheoremStatuses().find(item => item.name === name)?.status;
  const errors = () => vscode.languages.getDiagnostics(document.uri).filter(d => d.severity === vscode.DiagnosticSeverity.Error);
  const snapshot = () => ({ statuses: api.getTheoremStatuses(), decorations: api.getEditorDecorations(), goal: api.getGoalState() });

  async function until(label, condition, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (condition()) {
        receipts.push({ check: label, ...snapshot() });
        console.log('PASS: ' + label);
        return;
      }
      await pause(25);
    }
    throw new Error(label + ': ' + JSON.stringify(snapshot()));
  }
  async function move(line, column = 4) {
    editor.selection = new vscode.Selection(line, column, line, column);
    await pause(30);
  }
  async function replace(text) {
    assert(await editor.edit(edit => edit.replace(new vscode.Range(0, 0, document.lineCount, 0), text)));
  }
  const symbols = () => vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);

  try {
    await vscode.commands.executeCommand('isabelleRevamp.showGoals');
    await vscode.window.showTextDocument(document);

    // Item 10: symbols and folds come from the source alone.
    const qed = original.split('\n').lastIndexOf('qed');
    const theorem = (await symbols()).find(symbol => symbol.name === 'sqrt2_irrational');
    assert(theorem, 'theorem sqrt2_irrational is a document symbol');
    assert.equal(theorem.detail, 'theorem');
    assert.equal(theorem.kind, vscode.SymbolKind.Function);
    assert.deepEqual([theorem.range.start.line, theorem.range.end.line], [6, qed]);
    assert.equal(document.getText(theorem.selectionRange), 'sqrt2_irrational');
    const folds = await vscode.commands.executeCommand('vscode.executeFoldingRangeProvider', document.uri);
    assert(folds.some(fold => fold.start === 6 && fold.end === qed), JSON.stringify(folds));
    assert(folds.some(fold => fold.start === 7 && fold.end === qed - 1));
    console.log('PASS: document symbols and folding ranges on Sqrt2');

    // Item 18: the completed proof.
    await move(6, 8);
    assert.equal(statusOf('sqrt2_irrational'), 'checking', 'unconfirmed version');
    await until('completed theorem is proved', () => statusOf('sqrt2_irrational') === 'proved', 60000);
    assert.deepEqual(api.getTheoremStatuses(), [{ name: 'sqrt2_irrational', line: 6, status: 'proved' }]);
    // Item 9: the server's markup reached the editor. Painting coalesces
    // deltas for 30 ms, so it can trail the verdict by one burst.
    const painted = api.getEditorDecorations;
    await until('keyword and skolem colours painted, nothing bad or busy', () => painted().text_keyword1 > 0
      && painted().text_skolem > 0 && !painted().background_bad && !painted().text_overview_error
      && !painted().background_running1 && !painted().background_unprocessed1 && !painted().text_overview_unprocessed);
    assert(!painted().text_free, 'obtained variables are skolem, not free: ' + JSON.stringify(painted()));

    await replace(placeholder);
    assert.equal(statusOf('sqrt2_irrational'), 'checking', 'an edit clears the old verdict');
    await move(6);
    await until('admitted theorem is unfinished', () => statusOf('sqrt2_irrational') === 'unfinished');
    assert.equal(api.getTheoremStatuses()[0].line, 4);
    await until('admitted command is painted bad', () => painted().background_bad === 1);

    await replace(placeholder.replace('sorry', 'by (rule TrueI)'));
    await move(6);
    await until('failed method marks the theorem as an error', () => statusOf('sqrt2_irrational') === 'error' && errors().length > 0);
    await until('error line reaches the overview ruler', () => painted().text_overview_error > 0);

    await replace(structured);
    await move(10, 8);
    await until('nested lemmas are proved', () => statusOf('inside') === 'proved' && statusOf('anonymous_goal') === 'proved', 40000);
    await until('locale parameter is free, quantified variable bound, thm output underlined', () =>
      painted().text_bound > 0 && painted().text_free > 0 && painted().dotted_writeln > 0 && !painted().background_unprocessed1);
    const markup = painted();
    const tree = await symbols();
    assert.deepEqual(tree.map(symbol => symbol.name), ['Structure']);
    const [locale, output] = tree[0].children;
    assert.deepEqual([locale.name, locale.detail, locale.kind], ['shifted', 'locale', vscode.SymbolKind.Module]);
    assert.deepEqual(locale.children.map(symbol => symbol.name), ['inside']);
    assert.deepEqual([locale.range.start.line, locale.range.end.line], [6, 13]);
    assert.deepEqual(output.children.map(symbol => symbol.name), ['anonymous_goal']);
    const found = await vscode.commands.executeCommand('vscode.executeWorkspaceSymbolProvider', 'sqrt2_irr');
    assert(found.some(symbol => symbol.name === 'sqrt2_irrational' && symbol.location.uri.fsPath.endsWith(path.join('examples', 'Sqrt2.thy'))));
    assert(!found.some(symbol => symbol.location.uri.fsPath.includes('.dev-host')));
    console.log('PASS: heading, locale and lemma nesting, workspace symbols');

    // Decorations follow the document, not the editor: hide and show it again.
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await pause(100);
    assert.deepEqual(api.getEditorDecorations(), {});
    editor = await vscode.window.showTextDocument(document);
    await pause(200);
    assert(api.getEditorDecorations().text_free > 0, 'reopened editor is painted from the stored markup');
    console.log('PASS: decorations survive an editor switch');

    await replace(original);
    await move(6, 8);
    await until('restored proof is proved again', () => statusOf('sqrt2_irrational') === 'proved', 60000);
    fs.writeFileSync(path.join(root, '.dev-host/decorations-results.json'), JSON.stringify(receipts, null, 2));
    assert.equal(fs.readFileSync(path.join(root, 'examples/Sqrt2.thy'), 'utf8'), original);
    console.log('Decoration, outline and theorem-status checks passed. Original example unchanged.');
  } catch (error) {
    fs.writeFileSync(path.join(root, '.dev-host/decorations-results.json'), JSON.stringify({
      error: String(error), ...snapshot(), receipts,
    }, null, 2));
    throw error;
  } finally {
    const last = await vscode.window.showTextDocument(document);
    await last.edit(edit => edit.replace(new vscode.Range(0, 0, document.lineCount, 0), original));
    await document.save();
  }
};
