import { copyText } from '../../lib/clipboard';
import { downloadText } from '../../lib/download';
import type { EditorHandle } from '../../lib/editor';
import { InvalidFileError, readTextFile } from '../../lib/file-text';
import { formatBytes, formatInteger, formatMilliseconds } from '../../lib/format-bytes';
import { setupFullscreen } from '../../lib/fullscreen';
import type {
  CsvDelimiter,
  JsonError,
  NdjsonConvertResult,
  NdjsonIssue,
  NdjsonOptions,
  NdjsonStats,
  NdjsonValidateResult,
  ProgressUpdate,
  WorkerOp,
} from '../../workers/protocol';
import { failure } from '../../workers/protocol';
import { RunController } from '../../workers/run-controller';
import { LIVE_LIMIT, MAX_FILE, PREVIEW_LIMIT } from '../limits';
import { failureText } from '../shared/failure';
import { fill, type BaseStrings } from '../shared/strings';

export interface NdjsonStrings extends BaseStrings {
  placeholder: string;
  outputPlaceholder: string;
  summary: string;
  noIssues: string;
  issues: string;
  showingIssues: string;
  done: string;
  meta: string;
  goto: string;
  inputLabel: string;
  outputLabel: string;
}

interface Options {
  shell: HTMLElement;
  op: WorkerOp;
  strings: NdjsonStrings;
  locale: string;
  input: EditorHandle;
  output: EditorHandle | null;
  sample: string;
  showView: (view: 'input' | 'output') => void;
}

const ROW = 44;

function el<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing tool element: ${selector}`);
  return found;
}

export class NdjsonSession {
  private readonly shell: HTMLElement;
  private readonly op: WorkerOp;
  private readonly strings: NdjsonStrings;
  private readonly locale: string;
  private readonly input: EditorHandle;
  private readonly output: EditorHandle | null;
  private readonly sample: string;
  private readonly showView: (view: 'input' | 'output') => void;
  private readonly runs = new RunController();
  private file: File | null = null;
  private largeMode = false;
  private outputText: string | null = null;
  private running = false;
  private applying = false;
  private disposed = false;
  private loadId = 0;
  private issues: NdjsonIssue[] = [];
  private lastError: JsonError | null = null;
  private stopFullscreen: (() => void) | null = null;

  constructor(options: Options) {
    this.shell = options.shell;
    this.op = options.op;
    this.strings = options.strings;
    this.locale = options.locale;
    this.input = options.input;
    this.output = options.output;
    this.sample = options.sample;
    this.showView = options.showView;
  }

  start(): void {
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.stopFullscreen = setupFullscreen(this.shell, this.strings, (message) => {
      this.flash(message);
      this.announce(message);
    });
    el<HTMLButtonElement>(this.shell, `[data-action="${this.op}"]`).addEventListener('click', () => void this.run('explicit'));
    el<HTMLButtonElement>(this.shell, `[data-action="${this.op}-large"]`).addEventListener('click', () => void this.run('explicit'));
    el<HTMLButtonElement>(this.shell, '[data-action="sample"]').addEventListener('click', () => this.setInputText(this.sample, true));
    el<HTMLButtonElement>(this.shell, '[data-action="clear"]').addEventListener('click', () => this.clear());
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').addEventListener('click', () => this.cancel());
    el<HTMLButtonElement>(this.shell, '[data-action="copy"]').addEventListener('click', () => void this.copyOutput());
    el<HTMLButtonElement>(this.shell, '[data-action="download"]').addEventListener('click', () => this.downloadOutput());
    el<HTMLButtonElement>(this.shell, '[data-action="paste"]').addEventListener('click', () => void this.paste());
    el<HTMLButtonElement>(this.shell, '[data-action="open"]').addEventListener('click', () => el<HTMLInputElement>(this.shell, '[data-file-input]').click());
    el<HTMLButtonElement>(this.shell, '[data-action="find"]').addEventListener('click', () => this.openFind());
    el<HTMLButtonElement>(this.shell, '[data-error-dismiss]').addEventListener('click', () => this.hideError());
    el<HTMLButtonElement>(this.shell, '[data-error-goto]').addEventListener('click', () => this.gotoError());

    const fileInput = el<HTMLInputElement>(this.shell, '[data-file-input]');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) void this.loadFile(file);
    });
    this.shell.querySelector<HTMLElement>('[data-ndjson-rows]')?.addEventListener('click', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-line]');
      if (!row) return;
      this.showView('input');
      this.input.gotoLine(Number(row.dataset.line), 1);
    });
    this.shell.querySelector<HTMLElement>('[data-ndjson-issues]')?.addEventListener('scroll', () => this.renderIssues());
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
      this.setStatus(this.strings.largeRun);
      return;
    }
    this.scheduleLive();
  }

  async loadFile(file: File): Promise<void> {
    const loadId = ++this.loadId;
    if (file.size > MAX_FILE) {
      this.showFailure(failure(this.strings.fileTooBig, this.strings.chooseSmaller, 'runtime'));
      return;
    }
    this.file = file;
    this.setFile(file.name);
    this.showView('input');
    if (file.size > PREVIEW_LIMIT) {
      this.largeMode = true;
      el<HTMLElement>(this.shell, '[data-large-input]').hidden = false;
      el<HTMLElement>(this.shell, '[data-large-name]').textContent = file.name;
      el<HTMLElement>(this.shell, '[data-large-meta]').textContent = formatBytes(file.size, this.locale);
      this.applying = true;
      this.input.setDoc('');
      this.applying = false;
      this.input.setReadOnly(true);
      this.resetOutput();
      this.setStatus(this.strings.largeLoaded);
      return;
    }
    this.largeMode = false;
    el<HTMLElement>(this.shell, '[data-large-input]').hidden = true;
    this.input.setReadOnly(false);
    try {
      const text = await readTextFile(file);
      if (loadId === this.loadId && !this.disposed) this.setInputText(text, false);
    } catch (error) {
      if (loadId !== this.loadId || this.disposed) return;
      this.showFailure(
        error instanceof InvalidFileError
          ? failure(this.strings.invalidFile, this.strings.encodingHint, 'encoding')
          : failure(this.strings.readFailed, this.strings.tryAgain, 'runtime'),
      );
    }
  }

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
    el<HTMLElement>(this.shell, '[data-large-input]').hidden = true;
    this.input.setReadOnly(false);
    this.applying = true;
    this.input.setDoc(text);
    this.applying = false;
    this.resetOutput();
    if (explicit || text.length <= LIVE_LIMIT) void this.run(explicit ? 'explicit' : 'live');
    else this.setStatus(this.strings.largeRun);
    this.input.focus();
    this.refreshButtons();
  }

  private options(): NdjsonOptions {
    const value = (name: string, fallback: string): string =>
      this.shell.querySelector<HTMLElement>(`[data-option="${name}"]`)?.dataset.value ??
      (this.shell.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-option="${name}"]`)?.value ?? fallback);
    const checked = (name: string, fallback: boolean): boolean =>
      this.shell.querySelector<HTMLInputElement>(`[data-option="${name}"]`)?.checked ?? fallback;
    return {
      skipInvalid: checked('skipInvalid', false),
      stopAtFirst: checked('stopAtFirst', false),
      pretty: checked('pretty', false),
      trimBlank: checked('trimBlank', true),
      delimiter: (value('delimiter', ',') || ',') as CsvDelimiter,
      flatten: checked('flatten', true),
      header: checked('header', true),
      guard: checked('guard', false),
    };
  }

  private async run(mode: 'live' | 'explicit'): Promise<void> {
    if (this.disposed) return;
    if (this.largeMode && this.file) {
      await this.runFile();
      return;
    }
    const text = this.input.getDoc();
    if (text.trim().length === 0) {
      if (mode === 'explicit') this.showFailure(failure(this.strings.emptyInput, this.strings.emptyInputHint, 'syntax'));
      else this.resetIdle();
      return;
    }
    this.stopDebounce();
    this.cancelActive();
    this.setRunning(true);
    this.hideError();
    const outcome = await this.runs.run(this.op, { text }, this.options() as never, {
      onProgress: (progress) => this.onProgress(progress),
    });
    if (this.disposed || outcome.status === 'stale') return;
    this.setRunning(false);
    if (outcome.status === 'failed') {
      this.showFailure(failureText(this.strings, outcome.failure));
      return;
    }
    const result = outcome.result;
    if (this.op === 'ndjsonValidate') this.applyValidate(result as unknown as NdjsonValidateResult);
    else this.applyConvert(result as unknown as NdjsonConvertResult);
    if (outcome.usedFallback) this.showEngineNote(this.strings.workerFallback);
  }

  private async runFile(): Promise<void> {
    const file = this.file;
    if (!file) return;
    this.stopDebounce();
    this.cancelActive();
    this.setRunning(true);
    this.hideError();
    this.setStatus(this.strings.reading);
    const outcome = await this.runs.runFile(this.op, file, this.options() as never, {
      onProgress: (progress) => this.onProgress(progress),
    });
    if (this.disposed || outcome.status === 'stale') return;
    this.setRunning(false);
    if (outcome.status === 'failed') {
      this.showFailure(failureText(this.strings, outcome.failure));
      return;
    }
    const result = outcome.result;
    if (this.op === 'ndjsonValidate') this.applyValidate(result as unknown as NdjsonValidateResult);
    else this.applyConvert(result as unknown as NdjsonConvertResult);
  }

  private setStats(stats: NdjsonStats): void {
    for (const [key, value] of [
      ['lines', stats.lines],
      ['valid', stats.valid],
      ['invalid', stats.invalid],
      ['blank', stats.blank],
    ] as const) {
      const node = this.shell.querySelector<HTMLElement>(`[data-stat="${key}"]`);
      if (node) node.textContent = formatInteger(value, this.locale);
    }
    const time = this.shell.querySelector<HTMLElement>('[data-stat="time"]');
    if (time) time.textContent = `${formatMilliseconds(stats.timeMs, this.locale)} ms`;
    this.setMetaText(fill(this.strings.meta, { count: formatInteger(stats.lines, this.locale) }));
  }

  private applyValidate(result: NdjsonValidateResult): void {
    this.issues = result.issues;
    this.setStats(result.stats);
    const summary = el<HTMLElement>(this.shell, '[data-ndjson-summary]');
    summary.textContent = fill(this.strings.summary, {
      lines: formatInteger(result.stats.lines, this.locale),
      valid: formatInteger(result.stats.valid, this.locale),
      invalid: formatInteger(result.stats.invalid, this.locale),
      blank: formatInteger(result.stats.blank, this.locale),
    });
    this.renderIssues();
    const status = fill(this.strings.done, { time: formatMilliseconds(result.stats.timeMs, this.locale) });
    this.setStatus(status);
    this.announce(status);
    if (this.maxWidthQuery) this.showView('output');
  }

  private renderIssues(): void {
    const host = this.shell.querySelector<HTMLElement>('[data-ndjson-issues]');
    const spacer = this.shell.querySelector<HTMLElement>('[data-ndjson-spacer]');
    const rows = this.shell.querySelector<HTMLElement>('[data-ndjson-rows]');
    if (!host || !spacer || !rows) return;
    spacer.style.height = `${this.issues.length * ROW}px`;
    if (this.issues.length === 0) {
      rows.replaceChildren();
      const empty = document.createElement('p');
      empty.className = 'px-3 py-4 text-[13px] text-body-mid';
      empty.textContent = this.strings.noIssues;
      rows.append(empty);
      return;
    }
    const start = Math.max(0, Math.floor(host.scrollTop / ROW) - 4);
    const end = Math.min(this.issues.length, start + Math.ceil(host.clientHeight / ROW) + 8);
    const nodes: HTMLElement[] = [];
    for (let index = start; index < end; index += 1) {
      const issue = this.issues[index];
      const row = document.createElement('div');
      row.className = 'flex items-center gap-3 border-b border-line px-3 text-[13px]';
      row.style.height = `${ROW}px`;
      row.style.position = 'absolute';
      row.style.top = `${index * ROW}px`;
      row.style.insetInline = '0';
      row.dataset.line = String(issue.line);
      row.tabIndex = 0;
      const line = document.createElement('span');
      line.className = 'w-14 shrink-0 font-mono text-[11px] text-body-mid';
      line.textContent = `L${issue.line}:${issue.column}`;
      const message = document.createElement('span');
      message.className = 'min-w-0 flex-1 truncate text-ink';
      message.textContent = issue.message;
      const hint = document.createElement('span');
      hint.className = 'hidden shrink-0 text-[11px] text-body-mid sm:inline';
      hint.textContent = this.strings.goto;
      row.append(line, message, hint);
      nodes.push(row);
    }
    rows.replaceChildren(...nodes);
  }

  private applyConvert(result: NdjsonConvertResult): void {
    this.outputText = result.output;
    this.output?.setDoc(result.output ?? '');
    if (result.output === null) {
      const large = this.shell.querySelector<HTMLElement>('[data-large-output]');
      if (large) {
        large.hidden = false;
        const size = this.shell.querySelector<HTMLElement>('[data-large-size]');
        if (size) size.textContent = formatBytes(result.blob?.size ?? 0, this.locale);
      }
    }
    this.setStats(result.stats);
    const status = fill(this.strings.done, { time: formatMilliseconds(result.stats.timeMs, this.locale) });
    this.setStatus(status);
    this.announce(status);
    this.refreshButtons();
    if (this.maxWidthQuery) this.showView('output');
  }

  private showFailure(info: JsonError): void {
    this.lastError = info;
    this.outputText = null;
    this.output?.setDoc('');
    el<HTMLElement>(this.shell, '[data-error-panel]').hidden = false;
    el<HTMLElement>(this.shell, '[data-error-message]').textContent = info.message;
    el<HTMLElement>(this.shell, '[data-error-hint]').textContent = info.hint;
    el<HTMLElement>(this.shell, '[data-error-location]').hidden = info.line < 1;
    el<HTMLElement>(this.shell, '[data-error-snippet]').hidden = true;
    el<HTMLElement>(this.shell, '[data-error-goto]').hidden = info.line < 1;
    this.setStatus(info.message);
    this.announce(info.message);
    this.refreshButtons();
  }

  private clear(): void {
    this.loadId += 1;
    this.cancelActive();
    this.file = null;
    this.largeMode = false;
    this.setFile(null);
    el<HTMLElement>(this.shell, '[data-large-input]').hidden = true;
    this.input.setReadOnly(false);
    this.applying = true;
    this.input.setDoc('');
    this.applying = false;
    this.resetOutput();
    this.setStatus(this.strings.waiting);
    this.input.focus();
    this.refreshButtons();
  }

  private resetOutput(): void {
    this.outputText = null;
    this.output?.setDoc('');
    this.issues = [];
    this.renderIssues();
    this.input.markError(null);
    el<HTMLElement>(this.shell, '[data-error-panel]').hidden = true;
    this.shell.querySelector<HTMLElement>('[data-large-output]')?.setAttribute('hidden', '');
    for (const key of ['lines', 'valid', 'invalid', 'blank', 'time']) {
      const stat = this.shell.querySelector<HTMLElement>(`[data-stat="${key}"]`);
      if (stat) stat.textContent = '—';
    }
    const summary = this.shell.querySelector<HTMLElement>('[data-ndjson-summary]');
    if (summary) summary.textContent = '';
    const meta = this.shell.querySelector<HTMLElement>('[data-output-meta]');
    if (meta) {
      meta.hidden = true;
      meta.textContent = '';
    }
    this.refreshButtons();
  }

  private resetIdle(): void {
    this.stopDebounce();
    this.cancelActive();
    this.resetOutput();
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
  }

  private gotoError(): void {
    if (!this.lastError || this.lastError.line < 1) return;
    this.showView('input');
    this.input.gotoLine(this.lastError.line, this.lastError.column);
  }

  private async paste(): Promise<void> {
    try {
      if (!navigator.clipboard?.readText) throw new Error('Clipboard unavailable');
      const text = await navigator.clipboard.readText();
      if (text.length > 0) this.setInputText(text, true);
      else this.input.focus();
    } catch {
      this.flash(this.strings.pasteUnavailable);
      this.announce(this.strings.pasteUnavailable);
      this.input.focus();
    }
  }

  private setRunning(running: boolean): void {
    this.running = running;
    const frame = el<HTMLElement>(this.shell, '[data-tool-frame]');
    if (running) frame.setAttribute('aria-busy', 'true');
    else frame.removeAttribute('aria-busy');
    el<HTMLButtonElement>(this.shell, `[data-action="${this.op}"]`).disabled = running;
    el<HTMLButtonElement>(this.shell, `[data-action="${this.op}-large"]`).disabled = running;
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').hidden = !running;
    this.refreshButtons();
  }

  private refreshButtons(): void {
    el<HTMLButtonElement>(this.shell, '[data-action="copy"]').disabled = this.outputText === null;
    el<HTMLButtonElement>(this.shell, '[data-action="download"]').disabled = this.outputText === null;
    el<HTMLButtonElement>(this.shell, '[data-action="clear"]').disabled =
      this.input.getLength() === 0 && !this.file && this.outputText === null && this.issues.length === 0;
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').hidden = !this.running;
  }

  private setStatus(text: string): void {
    el<HTMLElement>(this.shell, '[data-status]').textContent = text;
  }

  private flash(text: string): void {
    this.setStatus(text);
    window.setTimeout(() => {
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

  private hideError(): void {
    el<HTMLElement>(this.shell, '[data-error-panel]').hidden = true;
    this.input.markError(null);
  }

  private showEngineNote(text: string): void {
    const note = this.shell.querySelector<HTMLElement>('[data-engine-note]');
    if (note) {
      note.hidden = false;
      note.textContent = text;
    }
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

  private setMetaText(text: string): void {
    const meta = this.shell.querySelector<HTMLElement>('[data-output-meta]');
    if (meta) {
      meta.hidden = false;
      meta.textContent = text;
      meta.title = text;
    }
  }

  private openFind(): void {
    if (this.output?.hasFocus()) this.output.openFind();
    else this.input.openFind();
  }

  private async copyOutput(): Promise<void> {
    if (this.outputText === null) return;
    const ok = await copyText(this.outputText);
    if (this.disposed) return;
    const message = ok ? this.strings.copied : this.strings.copyFailed;
    this.flash(message);
    this.announce(message);
  }

  private downloadOutput(): void {
    if (this.outputText === null) return;
    downloadText(this.outputText, 'result.txt');
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
    const pct = progress.percent === undefined ? '' : ` ${Math.round(progress.percent * 100)}%`;
    this.setStatus((progress.phase === 'reading' ? this.strings.reading : this.strings.done).replace('{time}', '') + pct);
  }

  private get maxWidthQuery(): boolean {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  dispose(): void {
    this.disposed = true;
    this.stopFullscreen?.();
    this.runs.dispose();
  }
}
