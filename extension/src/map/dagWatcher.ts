// Watches one JSON file (out/dag.json or out/claims.json) and hands every
// complete rewrite to a callback. `revamp map export` can be mid-write when
// the watcher fires, so a JSON.parse failure is retried shortly instead of
// being reported at once. A slow mtime poll backs up the VS Code watcher for
// directories it does not cover (for example outside the workspace).
import { readFile, stat } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { Disposable, FileSystemWatcher, RelativePattern, Uri, workspace } from 'vscode';

export type WatchResult =
  | { kind: 'json'; value: unknown; text: string }
  | { kind: 'missing' }
  | { kind: 'invalid'; message: string };

export interface DagWatcherOptions {
  debounceMs?: number;   // default 150
  retryMs?: number;      // default 200
  retries?: number;      // default 10 (two seconds of partial writes)
  pollMs?: number;       // default 1000; 0 disables the mtime poll
}

export class DagWatcher implements Disposable {
  private readonly watcher: FileSystemWatcher;
  private readonly subscriptions: Disposable[] = [];
  private timer?: NodeJS.Timeout;
  private retryTimer?: NodeJS.Timeout;
  private poll?: NodeJS.Timeout;
  private lastText?: string;
  private lastStamp?: string;
  private generation = 0;
  private disposed = false;
  private readonly debounceMs: number;
  private readonly retryMs: number;
  private readonly retries: number;

  constructor(readonly path: string, private readonly onResult: (result: WatchResult) => void,
    private readonly log: (text: string) => void, options: DagWatcherOptions = {}) {
    this.debounceMs = options.debounceMs ?? 150;
    this.retryMs = options.retryMs ?? 200;
    this.retries = options.retries ?? 10;
    this.watcher = workspace.createFileSystemWatcher(new RelativePattern(Uri.file(dirname(path)), basename(path)));
    this.subscriptions.push(this.watcher,
      this.watcher.onDidCreate(() => this.schedule()),
      this.watcher.onDidChange(() => this.schedule()),
      this.watcher.onDidDelete(() => this.schedule()));
    const pollMs = options.pollMs ?? 1000;
    if (pollMs > 0) this.poll = setInterval(() => void this.checkStamp(), pollMs);
    this.schedule(0);
  }

  /** Re-read now (after the debounce), even if nothing changed on disk. */
  refresh(): void { this.lastText = undefined; this.schedule(0); }

  private schedule(delay = this.debounceMs): void {
    if (this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = undefined; }
    this.timer = setTimeout(() => { this.timer = undefined; void this.load(0); }, delay);
  }

  private async stamp(): Promise<string> {
    try { const info = await stat(this.path); return `${info.mtimeMs}:${info.size}`; } catch { return 'missing'; }
  }

  /** Poll fallback: compares the file on disk with what the last load saw (including "missing"). */
  private async checkStamp(): Promise<void> {
    if (this.disposed || this.timer || this.retryTimer) return;
    const current = await this.stamp();
    if (this.lastStamp !== undefined && current !== this.lastStamp) {
      this.lastStamp = current;
      this.log(`${basename(this.path)} changed on disk (poll)`);
      this.schedule();
    }
  }

  private async load(attempt: number): Promise<void> {
    if (this.disposed) return;
    const generation = ++this.generation;
    this.lastStamp = await this.stamp();
    let text: string;
    try {
      text = await readFile(this.path, 'utf8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      this.lastText = undefined;
      if (code === 'ENOENT' || code === 'ENOTDIR') this.onResult({ kind: 'missing' });
      else this.onResult({ kind: 'invalid', message: `cannot read ${this.path}: ${String(error)}` });
      return;
    }
    if (text === this.lastText) return;
    let value: unknown;
    try { value = JSON.parse(text) as unknown; } catch (error) {
      if (attempt < this.retries && generation === this.generation && !this.disposed) {
        this.log(`${basename(this.path)} is not complete JSON yet (attempt ${attempt + 1}); retrying in ${this.retryMs} ms`);
        this.retryTimer = setTimeout(() => { this.retryTimer = undefined; void this.load(attempt + 1); }, this.retryMs);
      } else {
        this.onResult({ kind: 'invalid', message: `${basename(this.path)} is not valid JSON: ${error instanceof Error ? error.message : String(error)}` });
      }
      return;
    }
    this.lastText = text;
    this.onResult({ kind: 'json', value, text });
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.poll) clearInterval(this.poll);
    for (const subscription of this.subscriptions) subscription.dispose();
  }
}
