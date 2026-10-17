import { basename } from 'node:path';
import { Diagnostic, DiagnosticSeverity, Disposable, EventEmitter, Range, TextDocument, TextEditor } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { GoalMessage, GoalPin, GoalsView, GoalState } from './goalsView';
import { splitMessages } from './outputHtml';
import { StateContent, stateContent } from './stateParts';

interface Caret { uri: string; line: number; character: number; version: number }
export type SourceRange = [number, number, number, number];
interface Decoration { uri: string; entries: { type: string; content: { range: SourceRange }[] }[] }
interface StateOutput { id: number; content: string }
// A pinned goal: a server state panel kept with auto update disabled. It
// then ignores caret moves and edits for good; `live` is false once the
// server that owned it has gone.
interface Pin {
  id: number; uri: string; theory: string; position: { line: number; character: number };
  version: number; stale: boolean; live: boolean; content: StateContent;
}

// PIDE/decoration messages are deltas: omitted entries retain their old value.
const busyTypes = new Set([
  'background_unprocessed1', 'background_running1', 'background_canceled',
  'text_overview_unprocessed', 'text_overview_running',
]);
// background_bad also marks `sorry`; it is not an error diagnostic.
const errorTypes = new Set(['text_overview_error']);

// The server wraps output at this many characters (vscode_message_margin).
const defaultMargin = 80;
const noState: StateContent = { text: '', html: '', goalHtml: '', facts: [] };
const idle: GoalState = { phase: 'idle', text: '', errors: [] };

function pinState(pin: Pin): GoalPin {
  return { id: pin.id, uri: pin.uri, theory: pin.theory, position: { ...pin.position }, version: pin.version,
    stale: pin.stale, text: pin.content.text, goalHtml: pin.content.goalHtml, facts: pin.content.facts };
}

export class Goals implements Disposable {
  private updates = new EventEmitter<void>();
  readonly onDidUpdate = this.updates.event;
  private generation = 0;
  private sent = -1;
  private dynamicState?: boolean;
  private caret?: Caret;
  private document?: TextDocument;
  private timer?: ReturnType<typeof setTimeout>;
  private deadline?: ReturnType<typeof setTimeout>;
  private decorationTimer?: ReturnType<typeof setTimeout>;
  private settled?: ReturnType<typeof setTimeout>;
  private panel?: number;
  private pending = 0;
  private earlyStates = new Map<number, StateContent>();
  private confirmed?: StateContent;
  private messages: GoalMessage[] = [];
  private pins: Pin[] = [];
  private paused = false;
  private editor?: TextEditor;
  private last: GoalState = idle;
  private margin = defaultMargin;
  private available = false;
  private requestedAt = 0;
  private decorations = new Map<string, Map<string, boolean>>();
  private badRanges = new Map<string, SourceRange[]>();
  private diagnostics = new Map<string, string[]>();
  private ranges = new Map<string, Map<string, SourceRange[]>>();
  private versions = new Map<string, number>();
  private confirmedVersions = new Map<string, number>();
  private annotatedVersions = new Map<string, number>();
  private subscriptions: Disposable[] = [];

  constructor(private client: LanguageClient, private view: GoalsView) {
    this.subscriptions.push(
      // With editor_output_state=true the untagged dynamic output carries the
      // command's messages and, for a proof command, its state_message.
      client.onNotification('PIDE/dynamic_output', ({ content }: { content: string }) => {
        if (this.frozen()) return;
        const messages = splitMessages(content);
        this.messages = messages.filter(message => message.kind !== 'state');
        // No state_message after this caret's update: the command has no proof
        // state, so the tagged query would never answer. Only a settled
        // document is conclusive (an unprocessed command prints nothing yet);
        // a later tagged reply still replaces this.
        if (this.sent === this.generation) this.dynamicState = messages.some(message => message.kind === 'state');
        if (this.dynamicState === false && this.confirmed === undefined && !this.busy()) this.acceptState(noState);
        else this.render();
      }),
      client.onNotification('PIDE/state_output', (message: StateOutput) => {
        const content = stateContent(message.content);
        const pin = this.pins.find(pin => pin.live && pin.id === message.id);
        if (pin) { pin.content = content; pin.stale = false; this.republish(); this.updates.fire(); }
        else if (message.id === this.panel) { if (!this.frozen()) this.acceptState(content); }
        else if (this.pending) this.earlyStates.set(message.id, content);
      }),
      client.onNotification('PIDE/decoration', (message: Decoration) => {
        const flags = this.decorations.get(message.uri) ?? new Map<string, boolean>();
        const ranges = this.ranges.get(message.uri) ?? new Map<string, SourceRange[]>();
        for (const entry of message.entries) {
          flags.set(entry.type, entry.content.length > 0);
          ranges.set(entry.type, entry.content.map(item => item.range));
          if (entry.type === 'background_bad') {
            this.badRanges.set(message.uri, entry.content.map(item => item.range));
          }
        }
        this.decorations.set(message.uri, flags);
        this.ranges.set(message.uri, ranges);
        // A full snapshot after a fresh state query confirms annotations for
        // that version. Deltas alone must not certify a newly edited document.
        if ([...busyTypes, 'background_bad', 'text_overview_error'].every(type =>
          message.entries.some(entry => entry.type === type))) {
          const version = this.confirmedVersions.get(message.uri);
          if (version !== undefined && version === this.versions.get(message.uri)) {
            this.annotatedVersions.set(message.uri, version);
          }
        }
        if (message.uri === this.caret?.uri) {
          if (!this.busy() && this.confirmed === undefined && this.panel !== undefined) {
            if (this.dynamicState === false) this.acceptState(noState);
            else this.settleSoon();
          }
          this.render();
          clearTimeout(this.decorationTimer);
          // force_decorations does not advance the server's delta baseline.
          // A transient busy range in a forced snapshot might never be cleared
          // by a normal delta. Refresh while busy so it cannot stick forever.
          if (this.available && [...busyTypes].some(type => flags.get(type))) {
            this.decorationTimer = setTimeout(() => this.refreshDecorations(message.uri), 250);
          }
        }
        this.updates.fire();
      }),
    );
  }

  // A (re)started server: whatever a paused view showed is gone with it.
  ready(editor?: TextEditor): void {
    this.available = true;
    this.caret = undefined;
    this.follow(editor, true);
  }

  // While paused the caret is neither sent to the server nor shown; an MCP
  // query passes `force` because it moved the cursor on purpose.
  follow(editor?: TextEditor, force = false): void {
    this.editor = editor;
    if (this.paused && !force) {
      if (editor?.document) this.observe(editor.document);
      return;
    }
    const document = editor?.document;
    this.document = document;
    if (document) this.observe(document);
    const next = document?.languageId === 'isabelle' && document.uri.scheme === 'file'
      ? { uri: document.uri.toString(), version: document.version,
          line: editor!.selection.active.line, character: editor!.selection.active.character }
      : undefined;
    if (JSON.stringify(next) === JSON.stringify(this.caret)) return;
    this.caret = next;
    const generation = ++this.generation;
    clearTimeout(this.timer);
    clearTimeout(this.deadline);
    this.clearSettled();
    clearTimeout(this.decorationTimer);
    this.releasePanel();
    this.confirmed = undefined;
    this.messages = [];
    this.dynamicState = undefined;
    this.requestedAt = Date.now();
    this.publish({ phase: next ? 'checking' : 'idle', text: '', errors: [] });
    if (!this.available) return;
    if (!next) {
      void this.client.sendNotification('PIDE/caret_update', {}).catch(() => this.unavailable());
      return;
    }
    this.timer = setTimeout(() => { void this.refresh(generation, next); }, 150);
    this.deadline = setTimeout(() => {
      if (generation === this.generation) this.render();
    }, 10000);
  }

  private busy(): boolean {
    const flags = this.caret && this.decorations.get(this.caret.uri);
    return [...busyTypes].some(type => flags?.get(type));
  }

  // Paused with a state on show: live output no longer replaces it.
  private frozen(): boolean {
    return this.paused && this.confirmed !== undefined;
  }

  // Pin the goal on show. The live panel already holds the confirmed state
  // for this caret, so it becomes the pin, frozen with auto update off, and a
  // fresh live panel takes over the caret. Verified on Isabelle2025-2: a
  // frozen panel ignores caret moves and edits, and PIDE/state_update would
  // re-run it at the caret's command, so a pin is a snapshot that is only
  // flagged stale after an edit (docs/PROTOCOL_NOTES.md, "Frozen state panels").
  pinGoal(): GoalPin | undefined {
    if (!this.caret || !this.document || this.panel === undefined || this.confirmed === undefined
      || !this.confirmed.text.trim()) return undefined;
    const id = this.panel;
    this.panel = undefined;
    void this.client.sendNotification('PIDE/state_auto_update', { id, enabled: false }).catch(() => {});
    const pin: Pin = { id, uri: this.caret.uri, theory: basename(this.document.uri.fsPath, '.thy'),
      position: { line: this.caret.line, character: this.caret.character }, version: this.caret.version,
      stale: false, live: true, content: this.confirmed };
    this.pins.push(pin);
    this.requery();
    this.republish();
    this.updates.fire();
    return pinState(pin);
  }

  // A new live panel for the unchanged caret; the confirmed state stays on show.
  private requery(): void {
    if (!this.caret) return;
    const generation = ++this.generation;
    const caret = this.caret;
    clearTimeout(this.timer);
    this.clearSettled();
    this.timer = setTimeout(() => { void this.refresh(generation, caret); }, 0);
  }

  unpin(id: number): void {
    const pin = this.pins.find(pin => pin.id === id);
    if (!pin) return;
    this.pins = this.pins.filter(other => other !== pin);
    if (pin.live) void this.client.sendNotification('PIDE/state_exit', { id }).catch(() => {});
    this.republish();
    this.updates.fire();
  }

  unpinAll(): void {
    for (const pin of [...this.pins]) this.unpin(pin.id);
  }

  pinned(id: number): GoalPin | undefined {
    const pin = this.pins.find(pin => pin.id === id);
    return pin && pinState(pin);
  }

  // Paused: the view keeps what it shows and stops following the caret.
  togglePause(): boolean {
    this.paused = !this.paused;
    if (this.paused) this.republish();
    else {
      this.caret = undefined;
      this.follow(this.editor);
      if (!this.caret) this.publish(idle);
    }
    this.updates.fire();
    return this.paused;
  }

  isPaused(): boolean { return this.paused; }

  // The caret the goals on show belong to (not the editor's while paused).
  currentCaret(): { uri: string; line: number; character: number } | undefined {
    return this.caret && { uri: this.caret.uri, line: this.caret.line, character: this.caret.character };
  }

  // Identical dynamic output is not re-sent, so a second position without a
  // proof state gives no signal at all. Once the document is settled and the
  // query is open, a short wait without a tagged reply means "no state".
  private settleSoon(): void {
    if (this.settled !== undefined) return;
    const generation = this.generation;
    this.settled = setTimeout(() => {
      this.settled = undefined;
      if (generation !== this.generation || this.confirmed !== undefined || this.panel === undefined || this.busy()) return;
      this.acceptState(noState);
    }, 3000);
  }

  private clearSettled(): void {
    clearTimeout(this.settled);
    this.settled = undefined;
  }

  setDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
    this.diagnostics.set(uri, diagnostics.filter(d => d.severity === DiagnosticSeverity.Error)
      .map(d => d.message));
    if (uri === this.caret?.uri) this.render();
    this.updates.fire();
  }

  // Pretty-printing margin in characters, from the panel's width. Both the
  // dynamic output and each state query have their own margin on the server.
  setMargin(columns: number): void {
    const margin = Math.min(200, Math.max(40, Math.floor(columns)));
    if (margin === this.margin) return;
    this.margin = margin;
    if (!this.available) return;
    void this.client.sendNotification('PIDE/output_set_margin', { margin }).catch(() => {});
    if (this.panel !== undefined) {
      void this.client.sendNotification('PIDE/state_set_margin', { id: this.panel, margin }).catch(() => {});
    }
  }

  private async refresh(generation: number, caret: Caret): Promise<void> {
    this.pending++;
    try {
      const { uri, line, character } = caret;
      await this.client.sendNotification('PIDE/caret_update', { uri, line, character });
      if (generation !== this.generation) return;
      this.sent = generation;
      // Dynamic output has no cursor/version ID. A fresh built-in state panel
      // supplies a tagged confirmation and re-emits identical goal text.
      const { state_id } = await this.client.sendRequest<{ state_id: number }>('PIDE/state_init', {});
      if (generation !== this.generation) {
        await this.client.sendNotification('PIDE/state_exit', { id: state_id });
        return;
      }
      this.panel = state_id;
      if (!this.busy()) this.settleSoon();
      if (this.margin !== defaultMargin) {
        void this.client.sendNotification('PIDE/state_set_margin', { id: state_id, margin: this.margin }).catch(() => {});
      }
      const early = this.earlyStates.get(state_id);
      if (early !== undefined) this.acceptState(early);
    } catch {
      if (generation === this.generation) {
        clearTimeout(this.deadline);
        this.publish({ phase: 'unavailable', text: '', errors: [] });
      }
    } finally {
      if (--this.pending === 0) this.earlyStates.clear();
    }
  }

  private acceptState(content: StateContent): void {
    this.confirmed = content;
    if (this.caret) this.confirmedVersions.set(this.caret.uri, this.caret.version);
    clearTimeout(this.deadline);
    this.clearSettled();
    this.render();
    if (this.caret) {
      this.refreshDecorations(this.caret.uri);
    }
    this.updates.fire();
  }

  private refreshDecorations(uri: string): void {
    void this.client.sendNotification('PIDE/decoration_request', { uri })
      .catch(() => this.unavailable());
  }

  private render(): void {
    if (!this.caret || !this.available) return;
    const flags = this.decorations.get(this.caret.uri);
    const busy = [...busyTypes].some(type => flags?.get(type));
    const errors = this.diagnostics.get(this.caret.uri) ?? [];
    const failed = errors.length > 0 || [...errorTypes].some(type => flags?.get(type));
    if (this.confirmed === undefined || busy && !this.paused) {
      const phase = !busy && Date.now() - this.requestedAt >= 10000 ? 'unavailable' : 'checking';
      this.publish({ phase, text: '', errors: [] });
      return;
    }
    const { text, html, goalHtml, facts } = this.confirmed;
    // Isabelle marks an admitted command as background_bad. Match its actual
    // source range: mentions in comments/quoted text are not admissions, and
    // other bad markup must not be mistaken for `sorry`.
    const unfinished = (this.badRanges.get(this.caret.uri) ?? []).some(range =>
      this.document?.getText(new Range(...range)) === 'sorry');
    // A failed method can inherit a parent's "No subgoals!" state. Show its
    // diagnostic instead, never that misleading state under an error banner.
    const phase = failed ? 'error' : unfinished ? 'unfinished' : 'ready';
    this.publish(failed ? { phase, text: '', errors, html: '', goalHtml: '', facts: [], messages: this.messages }
      : { phase, text, errors, html, goalHtml, facts, messages: this.messages });
  }

  private publish(state: GoalState): void {
    this.last = state;
    const document = this.caret ? this.document : undefined;
    this.view.update({ ...state,
      paused: this.paused,
      pins: this.pins.map(pinState),
      // Isabelle theory files are named after their theory; no source parser is needed.
      theory: document ? basename(document.uri.fsPath, '.thy') : undefined,
      checkStatus: document ? this.documentStatus(document).state : undefined,
      position: this.caret ? { line: this.caret.line, character: this.caret.character } : undefined,
    });
  }

  private republish(): void {
    this.publish(this.last);
  }

  unavailable(): void {
    this.available = false;
    ++this.generation;
    clearTimeout(this.timer);
    clearTimeout(this.deadline);
    this.clearSettled();
    clearTimeout(this.decorationTimer);
    this.confirmed = undefined;
    this.messages = [];
    this.confirmedVersions.clear();
    this.annotatedVersions.clear();
    // The server's panels are gone; the pinned snapshots stay readable.
    for (const pin of this.pins) pin.live = false;
    this.publish({ phase: 'unavailable', text: '', errors: [] });
    this.updates.fire();
  }

  observe(document: TextDocument): void {
    if (document.languageId !== 'isabelle') return;
    const uri = document.uri.toString();
    if (this.versions.get(uri) !== document.version) {
      this.versions.set(uri, document.version);
      // Imports may depend on this file, so invalidate their cached completion too.
      this.confirmedVersions.clear();
      this.annotatedVersions.clear();
      const edited = this.pins.filter(pin => pin.uri === uri && pin.version !== document.version && !pin.stale);
      for (const pin of edited) pin.stale = true;
      if (edited.length) this.republish();
      this.updates.fire();
    }
  }

  matches(document: TextDocument, line: number, character: number): boolean {
    return this.caret?.uri === document.uri.toString() && this.caret.version === document.version
      && this.caret.line === line && this.caret.character === character;
  }

  processing(document: TextDocument) {
    const uri = document.uri.toString();
    const ranges = this.ranges.get(uri);
    const known = this.available && this.annotatedVersions.get(uri) === document.version;
    const pending = [...busyTypes].flatMap(type => (ranges?.get(type) ?? []).map(range => ({ type, range })));
    const processed = known && pending.length === 0;
    return { file: document.uri.fsPath, version: document.version, known, processed,
      processing: !processed, pending };
  }

  sorryPositions(document: TextDocument): SourceRange[] {
    return (this.badRanges.get(document.uri.toString()) ?? [])
      .filter(range => document.getText(new Range(...range)) === 'sorry');
  }

  decorationRanges(document: TextDocument, type: string): SourceRange[] {
    return this.ranges.get(document.uri.toString())?.get(type) ?? [];
  }

  documentStatus(document: TextDocument) {
    const processing = this.processing(document);
    const uri = document.uri.toString();
    const ranges = this.ranges.get(uri);
    const keywords = ['text_keyword1', 'text_keyword2', 'text_keyword3', 'text_improper']
      .flatMap(type => ranges?.get(type) ?? [])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .map(range => document.getText(new Range(...range)));
    const theoryClosed = keywords[0] === 'theory' && keywords.at(-1) === 'end'
      && keywords.filter(word => word === 'begin').length === keywords.filter(word => word === 'end').length;
    const errors = this.diagnostics.get(uri) ?? [];
    const failed = errors.length > 0 || this.decorations.get(uri)?.get('text_overview_error') === true;
    const sorry = this.sorryPositions(document);
    const incomplete = sorry.length > 0 || keywords.includes('oops') || !theoryClosed
      || (this.badRanges.get(uri)?.length ?? 0) > 0;
    const state: NonNullable<GoalState['checkStatus']> = !processing.processed ? 'checking'
      : failed ? 'error' : incomplete ? 'unfinished' : 'fully_checked';
    return { ...processing, state, fully_checked: state === 'fully_checked',
      saved: !document.isDirty, theory_closed: theoryClosed, sorry_count: sorry.length, has_errors: failed, errors };
  }

  private releasePanel(): void {
    if (this.panel !== undefined) {
      void this.client.sendNotification('PIDE/state_exit', { id: this.panel }).catch(() => {});
      this.panel = undefined;
    }
  }

  dispose(): void {
    this.releasePanel();
    this.unpinAll();
    this.unavailable();
    for (const subscription of this.subscriptions) subscription.dispose();
    this.updates.dispose();
  }
}
