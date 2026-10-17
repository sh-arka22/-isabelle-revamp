import { Disposable, DocumentSymbol, DocumentSymbolProvider, FoldingRange, FoldingRangeProvider, languages, Location, Range,
  SymbolInformation, SymbolKind, TextDocument, Uri, workspace, WorkspaceSymbolProvider } from 'vscode';
import { Outline, OutlineItem, OutlineKind, outline } from './outlineModel';
import { unicodeSymbols } from './symbols';

// The server advertises no symbol provider, so Outline, breadcrumbs,
// Ctrl+Shift+O and Ctrl+T come from the lexical model instead.
const selector = { language: 'isabelle' };
const cache = new Map<string, { version: number; outline: Outline }>();

export function outlineOf(document: TextDocument): Outline {
  const uri = document.uri.toString();
  let cached = cache.get(uri);
  if (cached?.version !== document.version) {
    cached = { version: document.version, outline: outline(document.getText()) };
    cache.set(uri, cached);
  }
  return cached.outline;
}

const symbolKinds: Record<OutlineKind, SymbolKind> = {
  heading: SymbolKind.Namespace, goal: SymbolKind.Function, definition: SymbolKind.Constant, function: SymbolKind.Function,
  type: SymbolKind.Struct, scope: SymbolKind.Module, facts: SymbolKind.Field,
};

function symbol(document: TextDocument, item: OutlineItem): DocumentSymbol {
  const range = new Range(item.line, 0, item.endLine, document.lineAt(item.endLine).text.length);
  const selection = item.nameStart === undefined ? document.lineAt(item.line).range
    : new Range(item.line, item.nameStart, item.line, item.nameEnd!);
  const result = new DocumentSymbol(unicodeSymbols(item.name ?? item.command), unicodeSymbols(item.detail),
    symbolKinds[item.kind], range, selection);
  result.children = item.children.map(child => symbol(document, child));
  return result;
}

class TheoryOutline implements DocumentSymbolProvider, FoldingRangeProvider {
  provideDocumentSymbols(document: TextDocument): DocumentSymbol[] {
    return outlineOf(document).items.map(item => symbol(document, item));
  }
  provideFoldingRanges(document: TextDocument): FoldingRange[] {
    return outlineOf(document).folds.map(([start, end]) => new FoldingRange(start, end));
  }
}

class TheoryWorkspaceSymbols implements WorkspaceSymbolProvider {
  private index = new Map<string, { mtime: number; symbols: SymbolInformation[] }>();

  async provideWorkspaceSymbols(query: string): Promise<SymbolInformation[]> {
    const needle = query.toLowerCase();
    const result: SymbolInformation[] = [];
    // files.exclude applies; ignored test hosts and dependencies are skipped here.
    for (const uri of await workspace.findFiles('**/*.thy', undefined, 2000)) {
      if (/[\\/](?:\.dev-host|node_modules|\.git)[\\/]/.test(uri.fsPath)) continue;
      for (const item of await this.symbols(uri)) if (!needle || item.name.toLowerCase().includes(needle)) result.push(item);
      if (result.length >= 500) break;
    }
    return result;
  }

  private async symbols(uri: Uri): Promise<SymbolInformation[]> {
    // Read bytes rather than opening documents: an opened theory is sent to the
    // language server, which would start checking every file in the workspace.
    const open = workspace.textDocuments.find(document => document.uri.toString() === uri.toString());
    const { mtime } = await workspace.fs.stat(uri);
    const cached = this.index.get(uri.toString());
    if (!open && cached?.mtime === mtime) return cached.symbols;
    const text = open ? open.getText() : new TextDecoder().decode(await workspace.fs.readFile(uri));
    const symbols: SymbolInformation[] = [];
    const walk = (items: OutlineItem[], container: string) => {
      for (const item of items) {
        if (item.name && item.kind !== 'heading') {
          symbols.push(new SymbolInformation(unicodeSymbols(item.name), symbolKinds[item.kind], container,
            new Location(uri, new Range(item.line, item.nameStart ?? 0, item.line, item.nameEnd ?? 0))));
        }
        walk(item.children, item.kind === 'scope' && item.name ? item.name : container);
      }
    };
    walk(outline(text).items, '');
    if (!open) this.index.set(uri.toString(), { mtime, symbols });
    return symbols;
  }
}

export function registerOutline(): Disposable[] {
  const provider = new TheoryOutline();
  return [
    languages.registerDocumentSymbolProvider(selector, provider, { label: 'Isabelle' }),
    languages.registerFoldingRangeProvider(selector, provider),
    languages.registerWorkspaceSymbolProvider(new TheoryWorkspaceSymbols()),
    workspace.onDidCloseTextDocument(document => cache.delete(document.uri.toString())),
  ];
}
