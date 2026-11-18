import { copyText } from '../../lib/clipboard';
import { downloadBlob, downloadText } from '../../lib/download';
import type { EditorHandle } from '../../lib/editor';
import { InvalidFileError, readTextFile } from '../../lib/file-text';
import { formatBytes, formatInteger, formatMilliseconds } from '../../lib/format-bytes';
import { setupFullscreen } from '../../lib/fullscreen';
import { setupSend, takeHandoff } from '../../lib/handoff';
import { createSelectMenu, type SelectMenu } from '../../lib/select-menu';
import { buildSnippet } from '../../lib/snippet';
import { readIndent, writeIndent } from '../../lib/storage';
import { failure } from '../../workers/protocol';
import type {
  FormatIndent,
  JsonError,
  MinifyResult,
  MinifyStats,
  ProgressUpdate,
  RepairFix,
  RepairResult,
  RepairStats,
} from '../../workers/protocol';
import { RunController, type RunOutcome } from '../../workers/run-controller';
import { LIVE_LIMIT, MAX_FILE, PREVIEW_LIMIT } from '../limits';
import { failureText } from './failure';
import { repairText } from './in-place-repair';
import { fill, type OutputToolStrings } from './strings';

export type OutputToolKind = 'minify' | 'repair';
type RunMode = 'live' | 'explicit';
type Result = MinifyResult | RepairResult;
type OpOutcome = RunOutcome<'minify'> | RunOutcome<'repair'>;

interface Options {
  shell: HTMLElement;
  kind: OutputToolKind;
  strings: OutputToolStrings;
  locale: string;
  input: EditorHandle;
  output: EditorHandle;
  sample: string;
  showView: (view: 'input' | 'output') => void;
}

function el<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing tool element: ${selector}`);
  return found;
}

/** Shared session for tools that turn input text into formatted output text. */
export class OutputToolSession {
  private readonly shell: HTMLElement;
  private readonly kind: OutputToolKind;
  private readonly strings: OutputToolStrings;
  private readonly locale: string;
  private readonly input: EditorHandle;
  private readonly output: EditorHandle;
  private readonly sample: string;
  private readonly showView: (view: 'input' | 'output') => void;
  private readonly runs = new RunController();
  private readonly statKeys = ['size', 'lines', 'depth', 'time', 'output', 'saved', 'fixes'];
  private readonly indentMenu: SelectMenu | null;

  private indent: FormatIndent = readIndent();
  private file: File | null = null;
  private largeMode = false;
  private outputText: string | null = null;
  private outputBlob: Blob | null = null;
  private hasOutput = false;
  private running = false;
  private applying = false;
  private disposed = false;
  private loadId = 0;
  private statusToken = 0;
  private lastError: JsonError | null = null;
  private stopFullscreen: (() => void) | null = null;

  constructor(options: Options) {
    this.shell = options.shell;
    this.kind = options.kind;
    this.strings = options.strings;
    this.locale = options.locale;
    this.input = options.input;
    this.output = options.output;
    this.sample = options.sample;
    this.showView = options.showView;
    this.indentMenu = this.shell.querySelector('[data-select]')
      ? createSelectMenu(el(this.shell, '[data-select]'))
      : null;
  }

  start(): void {
    if (this.indentMenu) this.indentMenu.value = String(this.indent);
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.stopFullscreen = setupFullscreen(this.shell, this.strings, (message) => {
      this.flash(message);
      this.announce(message);
    });

    el<HTMLButtonElement>(this.shell, `[data-action="${this.kind}"]`).addEventListener(
      'click',
      () => void this.run('explicit'),
    );
    el<HTMLButtonElement>(this.shell, `[data-action="${this.kind}-large"]`).addEventListener(
      'click',
      () => void this.run('explicit'),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="sample"]').addEventListener('click', () =>
      this.setInputText(this.sample, true),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="clear"]').addEventListener('click', () =>
      this.clear(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').addEventListener('click', () =>
      this.cancel(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="copy"]').addEventListener('click', () =>
      void this.copyOutput(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="download"]').addEventListener('click', () =>
      this.downloadOutput(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="download-large"]').addEventListener(
      'click',
      () => this.downloadOutput(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="paste"]').addEventListener('click', () =>
      void this.paste(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="open"]').addEventListener('click', () =>
      el<HTMLInputElement>(this.shell, '[data-file-input]').click(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="find"]').addEventListener('click', () =>
      this.openFind(),
    );
    el<HTMLButtonElement>(this.shell, '[data-error-dismiss]').addEventListener('click', () => {
      this.hideError();
      this.setStatus(this.input.getLength() > 0 ? this.strings.ready : this.strings.waiting);
    });
    el<HTMLButtonElement>(this.shell, '[data-error-goto]').addEventListener('click', () =>
      this.gotoError(),
    );
    this.shell
      .querySelector<HTMLButtonElement>('[data-error-repair]')
      ?.addEventListener('click', () => void this.fix());

    setupSend({
      shell: this.shell,
      locale: this.locale,
      getText: () => (this.kind === 'repair' ? (this.outputText ?? '') : this.input.getDoc()),
      onError: (message) => {
        this.flash(message);
        this.announce(message);
      },
      emptyMessage: this.strings.sendEmpty,
      tooLargeMessage: this.strings.sendTooLarge,
    });

    const handoff = takeHandoff(this.kind === 'minify' ? 'json-minifier' : 'json-repair');
    if (handoff) this.setInputText(handoff, true);

    const fileInput = el<HTMLInputElement>(this.shell, '[data-file-input]');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) void this.loadFile(file);
    });

    this.indentMenu?.root.addEventListener('change', () => this.changeIndent());
  }

  inputChanged(length: number): void {
    if (this.applying) return;

    this.input.markError(null);
    this.file = null;
    this.setFile(null);
    this.refreshButtons();

    if (length === 0) {
      this.resetIdle();
      return;
    }

    if (length > LIVE_LIMIT) {
      this.stopDebounce();
      this.cancelActive();
      this.resetOutput();
      this.resetStats();
      this.setStatus(this.strings.largeRun);
      return;
    }

    this.scheduleLive();
  }

  async loadFile(file: File): Promise<void> {
    const loadId = ++this.loadId;

    if (file.size > MAX_FILE) {
      this.showFailure(this.fileTooBig(), 'explicit');
      return;
    }

    this.file = file;
    this.setFile(file.name);
    this.showView('input');

    if (file.size > PREVIEW_LIMIT) {
      this.largeMode = true;
      this.setLargeInput(file);
      this.applying = true;
      this.input.setDoc('');
      this.applying = false;
      this.input.setReadOnly(true);
      this.resetOutput();
      this.resetStats();
      this.stat('size')!.textContent = formatBytes(file.size, this.locale);
      this.setStatus(this.strings.largeLoaded);
      this.refreshButtons();
      return;
    }

    this.largeMode = false;
    this.hideLargeInput();
    this.input.setReadOnly(false);

    try {
      const text = await readTextFile(file);
      if (loadId !== this.loadId || this.disposed) return;

      if (text.trim().length === 0) {
        this.showFailure(
          failure(this.strings.emptyInput, this.strings.emptyInputHint, 'syntax'),
          'explicit',
        );
        return;
      }

      this.applying = true;
      this.input.setDoc(text);
      this.applying = false;
      this.resetOutput();
      this.resetStats();
      this.hideError();
      this.setFile(file.name);
      this.setStatus(text.length > LIVE_LIMIT ? this.strings.largeRun : this.strings.ready);

      if (text.length > LIVE_LIMIT) {
        this.refreshButtons();
      } else {
        this.scheduleLive();
      }

      this.refreshButtons();
    } catch (error) {
      if (loadId !== this.loadId || this.disposed) return;
      this.showFailure(
        error instanceof InvalidFileError
          ? failure(this.strings.invalidFile, this.strings.encodingHint, 'encoding')
          : failure(this.strings.readFailed, this.strings.tryAgain, 'runtime'),
        'explicit',
      );
    }
  }

  /** Public entry points used by the shared shell wiring. */
  runExplicit(): void {
    void this.run('explicit');
  }

  copyForShortcut(): boolean {
    if (this.outputText === null) return false;
    void this.copyOutput();
    return true;
  }

  private setInputText(text: string, explicit: boolean): void {
    this.loadId += 1;
    this.file = null;
    this.largeMode = false;
    this.setFile(null);
    this.hideLargeInput();
    this.input.setReadOnly(false);
    this.applying = true;
    this.input.setDoc(text);
    this.applying = false;
    this.resetOutput();
    this.resetStats();
    this.hideError();

    if (explicit) {
      void this.run('explicit');
    } else if (text.length > LIVE_LIMIT) {
      this.setStatus(this.strings.largeRun);
    } else {
      this.scheduleLive();
    }

    this.input.focus();
    this.refreshButtons();
  }

  private async run(mode: RunMode): Promise<void> {
    if (this.disposed) return;

    if (this.largeMode && this.file) {
      await this.runFile(mode);
      return;
    }

    const text = this.input.getDoc();

    if (text.trim().length === 0) {
      if (mode === 'explicit') {
        this.showFailure(
          failure(this.strings.emptyInput, this.strings.emptyInputHint, 'syntax'),
          mode,
        );
      } else {
        this.resetIdle();
      }
      return;
    }

    this.stopDebounce();
    this.cancelActive();
    this.setRunning(true);
    this.hideError();

    const outcome = await this.runOp({ text }, (progress) => this.onProgress(progress));

    if (outcome.status === 'stale' || this.disposed) return;

    this.setRunning(false);

    if (outcome.status === 'failed') {
      this.showFailure(failureText(this.strings, outcome.failure), mode);
      return;
    }

    this.applyResult(outcome.result, mode);
    if (outcome.usedFallback) this.showEngineNote(this.strings.workerFallback);
  }

  private async runFile(mode: RunMode): Promise<void> {
    const file = this.file;
    if (!file) return;

    this.stopDebounce();
    this.cancelActive();
    this.setRunning(true);
    this.hideError();
    this.setStatus(this.strings.reading);

    const outcome = await this.runFileOp(file, (progress) => this.onProgress(progress));

    if (outcome.status === 'stale' || this.disposed) return;

    this.setRunning(false);

    if (outcome.status === 'failed') {
      this.showFailure(failureText(this.strings, outcome.failure), mode);
      return;
    }

    this.applyResult(outcome.result, mode);
    if (outcome.usedFallback) this.showEngineNote(this.strings.workerFallback);
  }

  private runOp(
    payload: { text: string },
    onProgress: (progress: ProgressUpdate) => void,
  ): Promise<OpOutcome> {
    return this.kind === 'minify'
      ? this.runs.run('minify', payload, {}, { onProgress })
      : this.runs.run('repair', payload, { indent: this.indent }, { onProgress });
  }

  private runFileOp(
    file: File,
    onProgress: (progress: ProgressUpdate) => void,
  ): Promise<OpOutcome> {
    return this.kind === 'minify'
      ? this.runs.runFile('minify', file, {}, { onProgress })
      : this.runs.runFile('repair', file, { indent: this.indent }, { onProgress });
  }

  private applyResult(result: Result, mode: RunMode): void {
    this.outputText = result.output;
    this.outputBlob = result.blob;
    this.hasOutput = true;
    this.input.markError(null);

    if (result.blob) {
      this.output.setDoc('');
      el<HTMLElement>(this.shell, '[data-large-output]').hidden = false;
      el<HTMLElement>(this.shell, '[data-large-size]').textContent = formatBytes(
        result.blob.size,
        this.locale,
      );
    } else {
      this.output.setDoc(result.output ?? '');
      el<HTMLElement>(this.shell, '[data-large-output]').hidden = true;
    }

    let status: string;

    if (this.kind === 'minify') {
      const stats = result.stats as MinifyStats;
      this.setStats(stats);
      this.setMetaText(
        fill(this.strings.minifiedMeta, {
          before: formatBytes(stats.bytes, this.locale),
          after: formatBytes(stats.outputBytes, this.locale),
          percent: formatInteger(stats.savedPercent, this.locale),
        }),
      );
      status = fill(this.strings.minifyDone, {
        time: formatMilliseconds(stats.parseTimeMs, this.locale),
      });
    } else {
      const stats = result.stats as RepairStats;
      this.setStats(stats);
      this.showFixMeta(stats.fixes);
      status = fill(this.strings.repairDone, {
        time: formatMilliseconds(stats.parseTimeMs, this.locale),
      });
    }

    this.setStatus(status);
    this.announce(status);
    this.refreshButtons();

    if (mode === 'explicit' && this.maxWidthQuery) this.showView('output');
    if (mode === 'live' && this.mobileView === 'input') this.showOutputDot(true);
  }

  private showFailure(info: JsonError, mode: RunMode): void {
    this.lastError = info;
    this.resetOutput();
    this.resetStats();

    const snippet = info.line > 0 ? buildSnippet(this.input, info, this.largeMode) : null;
    const location =
      info.line > 0 ? fill(this.strings.errorAt, { line: info.line, column: info.column }) : null;

    el<HTMLElement>(this.shell, '[data-error-panel]').hidden = false;
    el<HTMLElement>(this.shell, '[data-error-message]').textContent = info.message;
    el<HTMLElement>(this.shell, '[data-error-hint]').textContent = info.hint;
    const locationEl = el<HTMLElement>(this.shell, '[data-error-location]');
    locationEl.hidden = location === null;
    locationEl.textContent = location ?? '';
    const snippetEl = el<HTMLElement>(this.shell, '[data-error-snippet]');
    snippetEl.hidden = snippet === null;
    el<HTMLElement>(snippetEl, 'code').textContent = snippet ?? '';
    el<HTMLElement>(this.shell, '[data-error-goto]').hidden =
      info.line < 1 || this.input.getLength() === 0 || this.largeMode;
    const repair = this.shell.querySelector<HTMLButtonElement>('[data-error-repair]');
    if (repair) repair.hidden = this.largeMode || this.input.getLength() === 0;
    this.input.markError(info.line > 0 && !this.largeMode ? info.line : null);

    this.setStatus(location ?? this.strings.error);
    this.announce(
      info.line > 0
        ? fill(this.strings.announceError, { line: info.line, column: info.column })
        : info.message,
    );

    if (mode === 'explicit' && this.maxWidthQuery) this.showView('output');
  }

  private fileTooBig(): JsonError {
    return failure(this.strings.fileTooBig, this.strings.chooseSmaller, 'runtime');
  }

  private changeIndent(): void {
    if (!this.indentMenu) return;
    const raw = this.indentMenu.value;
    this.indent = raw === 'tab' ? 'tab' : raw === '4' ? 4 : 2;
    writeIndent(this.indent);

    if (this.largeMode) {
      this.setStatus(this.strings.largeLoaded);
      return;
    }

    const length = this.input.getLength();
    if (length === 0) return;
    if (length > LIVE_LIMIT) {
      this.setStatus(this.strings.largeRun);
      return;
    }

    void this.run('live');
  }

  private async paste(): Promise<void> {
    try {
      if (!navigator.clipboard?.readText) throw new Error('Clipboard unavailable');
      const text = await navigator.clipboard.readText();
      if (text.length === 0) {
        this.input.focus();
        return;
      }
      this.setInputText(text, true);
    } catch {
      this.flash(this.strings.pasteUnavailable);
      this.announce(this.strings.pasteUnavailable);
      this.input.focus();
    }
  }

  private clear(): void {
    this.loadId += 1;
    this.cancelActive();
    this.file = null;
    this.largeMode = false;
    this.setFile(null);
    this.hideLargeInput();
    this.input.setReadOnly(false);
    this.applying = true;
    this.input.setDoc('');
    this.applying = false;
    this.resetOutput();
    this.resetStats();
    this.hideError();
    el<HTMLElement>(this.shell, '[data-engine-note]').hidden = true;
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.input.focus();
  }

  private gotoError(): void {
    const info = this.lastError;
    if (!info || info.line < 1) return;
    this.showView('input');
    this.input.gotoLine(info.line, info.column);
  }

  /** Repairs the input in place, then runs the tool on the repaired text. */
  private async fix(): Promise<void> {
    if (this.largeMode || this.input.getLength() === 0) return;

    const button = this.shell.querySelector<HTMLButtonElement>('[data-error-repair]');
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    }
    this.stopDebounce();
    this.cancelActive();
    this.setStatus(this.strings.repairing);

    const attempt = await repairText(this.runs, this.input.getDoc(), this.indent);
    if (button) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
    if (this.disposed) return;

    if (attempt.status === 'failed') {
      this.showFailure(attempt.info, 'explicit');
      return;
    }
    if (attempt.status === 'skipped') return;

    this.applying = true;
    this.input.setDoc(attempt.text);
    this.applying = false;
    this.hideError();
    void this.run('explicit');
  }

  private resetIdle(): void {
    this.stopDebounce();
    this.cancelActive();
    this.resetOutput();
    this.resetStats();
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
  }

  private resetOutput(): void {
    this.outputText = null;
    this.outputBlob = null;
    this.hasOutput = false;
    this.output.setDoc('');
    this.input.markError(null);
    el<HTMLElement>(this.shell, '[data-large-output]').hidden = true;
    el<HTMLElement>(this.shell, '[data-error-panel]').hidden = true;
    this.clearMeta();
    this.showOutputDot(false);
    this.refreshButtons();
  }

  /** Writes the short summary that sits in the output pane header. */
  private setMetaText(text: string): void {
    const meta = this.shell.querySelector<HTMLElement>('[data-output-meta]');
    if (!meta) return;
    meta.hidden = false;
    meta.textContent = text;
    meta.title = text;
  }

  /**
   * Repair lists every fix kind. The header shows the total instead, and the
   * full breakdown lives in a popover so long lists never get clipped.
   */
  private showFixMeta(fixes: RepairFix[]): void {
    const menu = this.shell.querySelector<HTMLDetailsElement>('[data-fix-meta]');
    const count = menu?.querySelector<HTMLElement>('[data-fix-count]');
    const list = menu?.querySelector<HTMLElement>('[data-fix-list]');
    if (!menu || !count || !list) return;

    const total = fixes.reduce((sum, fix) => sum + fix.count, 0);
    if (total === 0) {
      menu.hidden = true;
      menu.removeAttribute('open');
      this.setMetaText(this.strings.noFixes);
      return;
    }

    list.replaceChildren(
      ...fixes.map((fix) => {
        const row = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = this.strings.fix[fix.kind];
        const amount = document.createElement('span');
        amount.className = 'fix-count';
        amount.textContent = `×${formatInteger(fix.count, this.locale)}`;
        row.append(label, amount);
        return row;
      }),
    );

    count.textContent =
      total === 1
        ? this.strings.fixesAppliedOne
        : fill(this.strings.fixesApplied, { count: formatInteger(total, this.locale) });

    const meta = this.shell.querySelector<HTMLElement>('[data-output-meta]');
    if (meta) {
      meta.textContent = '';
      meta.title = '';
      meta.hidden = true;
    }
    menu.hidden = false;
  }

  private clearMeta(): void {
    const meta = this.shell.querySelector<HTMLElement>('[data-output-meta]');
    if (meta) {
      meta.textContent = '';
      meta.title = '';
      meta.hidden = true;
    }

    const menu = this.shell.querySelector<HTMLDetailsElement>('[data-fix-meta]');
    if (!menu) return;
    menu.hidden = true;
    menu.removeAttribute('open');
    const count = menu.querySelector<HTMLElement>('[data-fix-count]');
    if (count) count.textContent = '';
    menu.querySelector<HTMLElement>('[data-fix-list]')?.replaceChildren();
  }

  private resetStats(): void {
    for (const key of this.statKeys) {
      const stat = this.stat(key);
      if (stat) stat.textContent = '—';
    }
  }

  private setStats(stats: MinifyStats | RepairStats): void {
    const size = this.stat('size');
    const time = this.stat('time');
    if (size) size.textContent = formatBytes(stats.bytes, this.locale);
    if (time) time.textContent = `${formatMilliseconds(stats.parseTimeMs, this.locale)} ms`;

    if (this.kind === 'minify') {
      const minify = stats as MinifyStats;
      const output = this.stat('output');
      const saved = this.stat('saved');
      if (output) output.textContent = formatBytes(minify.outputBytes, this.locale);
      if (saved) saved.textContent = `${formatInteger(minify.savedPercent, this.locale)}%`;
      return;
    }

    const repair = stats as RepairStats;
    const fixes = this.stat('fixes');
    const lines = this.stat('lines');
    if (fixes) {
      fixes.textContent = formatInteger(
        repair.fixes.reduce((total, fix) => total + fix.count, 0),
        this.locale,
      );
    }
    if (lines) lines.textContent = formatInteger(repair.lines, this.locale);
  }

  private stat(key: string): HTMLElement | null {
    return this.shell.querySelector<HTMLElement>(`[data-stat="${key}"]`);
  }

  private setFile(name: string | null): void {
    const chip = el<HTMLElement>(this.shell, '[data-file-chip]');
    chip.hidden = name === null;
    if (name !== null) {
      const label = el<HTMLElement>(chip, '[data-file-name]');
      label.textContent = name;
      label.title = name;
    }
  }

  private setLargeInput(file: File): void {
    el<HTMLElement>(this.shell, '[data-large-input]').hidden = false;
    el<HTMLElement>(this.shell, '[data-large-name]').textContent = file.name;
    el<HTMLElement>(this.shell, '[data-large-meta]').textContent = formatBytes(
      file.size,
      this.locale,
    );
    const warning = el<HTMLElement>(this.shell, '[data-large-warning]');
    warning.hidden = file.size <= 50 * 1024 * 1024;
    warning.textContent = fill(this.strings.largeWarning, {
      size: formatBytes(file.size, this.locale),
    });
  }

  private hideLargeInput(): void {
    el<HTMLElement>(this.shell, '[data-large-input]').hidden = true;
  }

  private hideError(): void {
    el<HTMLElement>(this.shell, '[data-error-panel]').hidden = true;
    this.input.markError(null);
  }

  private showEngineNote(text: string): void {
    const note = el<HTMLElement>(this.shell, '[data-engine-note]');
    note.hidden = false;
    note.textContent = text;
  }

  private showOutputDot(visible: boolean): void {
    el<HTMLElement>(this.shell, '[data-output-dot]').hidden = !visible;
  }

  private setRunning(running: boolean): void {
    this.running = running;
    const frame = el<HTMLElement>(this.shell, '[data-tool-frame]');

    if (running) frame.setAttribute('aria-busy', 'true');
    else frame.removeAttribute('aria-busy');

    el<HTMLButtonElement>(this.shell, `[data-action="${this.kind}"]`).disabled = running;
    el<HTMLButtonElement>(this.shell, `[data-action="${this.kind}-large"]`).disabled = running;
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').hidden = !running;
    this.refreshButtons();
  }

  private refreshButtons(): void {
    el<HTMLButtonElement>(this.shell, '[data-action="copy"]').disabled = this.outputText === null;
    el<HTMLButtonElement>(this.shell, '[data-action="download"]').disabled = !this.hasOutput;
    el<HTMLButtonElement>(this.shell, '[data-action="download-large"]').disabled = !this.hasOutput;
    el<HTMLButtonElement>(this.shell, '[data-action="clear"]').disabled =
      this.input.getLength() === 0 && !this.file && !this.hasOutput;
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').hidden = !this.running;
  }

  private setStatus(text: string): void {
    this.statusToken += 1;
    el<HTMLElement>(this.shell, '[data-status]').textContent = text;
  }

  private flash(text: string): void {
    this.setStatus(text);
    const token = this.statusToken;
    window.setTimeout(() => {
      if (token !== this.statusToken) return;
      this.setStatus(this.input.getLength() > 0 ? this.strings.ready : this.strings.waiting);
    }, 1800);
  }

  private announce(text: string): void {
    const live = el<HTMLElement>(this.shell, '[data-live]');
    live.textContent = '';
    window.requestAnimationFrame(() => {
      live.textContent = text;
    });
  }

  private openFind(): void {
    const target = this.output.hasFocus() ? this.output : this.input;
    target.openFind();
  }

  private get maxWidthQuery(): boolean {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  private get mobileView(): string | undefined {
    return el<HTMLElement>(this.shell, '[data-mobile-view]').dataset.mobileView;
  }

  private async copyOutput(): Promise<void> {
    const text = this.outputText;
    if (text === null) return;

    const ok = await copyText(text);
    if (this.disposed) return;
    const message = ok ? this.strings.copied : this.strings.copyFailed;
    this.flash(message);
    this.announce(message);
  }

  private downloadOutput(): void {
    const text = this.outputText;
    const base = this.file?.name.replace(/\.[^./\\]+$/, '').trim();
    const name = base
      ? `${base}${this.kind === 'minify' ? '.min' : '.repaired'}.json`
      : `${this.kind === 'minify' ? 'minified' : 'repaired'}.json`;

    if (this.outputBlob) {
      downloadBlob(this.outputBlob, name);
    } else if (text !== null) {
      downloadText(text, name);
    }
  }

  private cancel(): void {
    if (!this.running) return;
    this.cancelActive();
    this.setStatus(this.strings.cancelled);
    this.announce(this.strings.cancelled);
  }

  private cancelActive(): void {
    this.runs.cancel();
    this.setRunning(false);
  }

  private stopDebounce(): void {
    this.runs.cancelScheduled();
  }

  private scheduleLive(): void {
    this.runs.schedule(() => void this.run('live'), 250);
  }

  private onProgress(progress: ProgressUpdate): void {
    if (progress.phase === 'reading') {
      this.setStatus(this.strings.reading);
      return;
    }

    this.setStatus(this.kind === 'minify' ? this.strings.minifying : this.strings.repairing);
  }

  dispose(): void {
    this.disposed = true;
    this.stopFullscreen?.();
    this.runs.dispose();
  }
}
