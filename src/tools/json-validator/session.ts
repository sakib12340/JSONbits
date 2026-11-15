import type { EditorHandle } from '../../lib/editor';
import { InvalidFileError, readTextFile } from '../../lib/file-text';
import { formatBytes, formatInteger, formatMilliseconds } from '../../lib/format-bytes';
import { setupFullscreen } from '../../lib/fullscreen';
import { readIndent } from '../../lib/storage';
import { buildSnippet } from '../../lib/snippet';
import { failure } from '../../workers/protocol';
import type {
  FormatIndent,
  FormatStats,
  JsonError,
  ProgressUpdate,
  ValidateResult,
} from '../../workers/protocol';
import { RunController } from '../../workers/run-controller';
import { LIVE_LIMIT, MAX_FILE, PREVIEW_LIMIT } from '../limits';
import { failureText } from '../shared/failure';
import { repairText } from '../shared/in-place-repair';
import { fill } from '../shared/strings';
import type { ValidatorStrings } from './strings';

type RunMode = 'live' | 'explicit';

interface Options {
  shell: HTMLElement;
  strings: ValidatorStrings;
  locale: string;
  input: EditorHandle;
}

function el<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing tool element: ${selector}`);
  return found;
}

/** Validates strict JSON on the worker and reports a verdict plus exact error context. */
export class ValidatorSession {
  private readonly shell: HTMLElement;
  private readonly strings: ValidatorStrings;
  private readonly locale: string;
  private readonly input: EditorHandle;
  private readonly runs = new RunController();

  private file: File | null = null;
  private largeMode = false;
  private running = false;
  private applying = false;
  private disposed = false;
  private loadId = 0;
  private statusToken = 0;
  private lastError: JsonError | null = null;
  private readonly indent: FormatIndent = readIndent();
  private stopFullscreen: (() => void) | null = null;

  constructor(options: Options) {
    this.shell = options.shell;
    this.strings = options.strings;
    this.locale = options.locale;
    this.input = options.input;
  }

  start(): void {
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.stopFullscreen = setupFullscreen(this.shell, this.strings, (message) => {
      this.flash(message);
      this.announce(message);
    });

    el<HTMLButtonElement>(this.shell, '[data-action="validate"]').addEventListener('click', () =>
      this.runExplicit(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="validate-large"]').addEventListener(
      'click',
      () => this.runExplicit(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="sample"]').addEventListener('click', () =>
      this.setInputText(SAMPLE_JSON, true),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="clear"]').addEventListener('click', () =>
      this.clear(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').addEventListener('click', () =>
      this.cancel(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="paste"]').addEventListener('click', () =>
      void this.paste(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="open"]').addEventListener('click', () =>
      el<HTMLInputElement>(this.shell, '[data-file-input]').click(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="find"]').addEventListener('click', () =>
      this.input.openFind(),
    );
    el<HTMLButtonElement>(this.shell, '[data-error-dismiss]').addEventListener('click', () => {
      this.hideResult();
      this.resetStats();
      this.setStatus(this.input.getLength() > 0 ? this.strings.ready : this.strings.waiting);
    });
    el<HTMLButtonElement>(this.shell, '[data-error-goto]').addEventListener('click', () =>
      this.gotoError(),
    );
    el<HTMLButtonElement>(this.shell, '[data-error-repair]').addEventListener('click', () =>
      void this.fix(),
    );

    const fileInput = el<HTMLInputElement>(this.shell, '[data-file-input]');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) void this.loadFile(file);
    });
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

    this.hideResult();
    this.resetStats();

    if (length > LIVE_LIMIT) {
      this.stopDebounce();
      this.cancelActive();
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

    if (file.size > PREVIEW_LIMIT) {
      this.largeMode = true;
      this.setLargeInput(file);
      this.applying = true;
      this.input.setDoc('');
      this.applying = false;
      this.input.setReadOnly(true);
      this.hideResult();
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
      this.hideResult();
      this.resetStats();
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

  runExplicit(): void {
    void this.run('explicit');
  }

  dispose(): void {
    this.disposed = true;
    this.stopFullscreen?.();
    this.runs.dispose();
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
    this.hideResult();
    this.resetStats();

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
    this.setStatus(this.strings.reading);

    const outcome = await this.runs.run(
      'validate',
      { text },
      {},
      { onProgress: (progress) => this.onProgress(progress) },
    );

    if (outcome.status === 'stale' || this.disposed) return;

    this.setRunning(false);

    if (outcome.status === 'failed') {
      this.showFailure(failureText(this.strings, outcome.failure), mode);
      return;
    }

    this.applyValid(outcome.result);
    if (outcome.usedFallback) this.showEngineNote(this.strings.workerFallback);
  }

  private async runFile(mode: RunMode): Promise<void> {
    const file = this.file;
    if (!file) return;

    this.stopDebounce();
    this.cancelActive();
    this.setRunning(true);
    this.setStatus(this.strings.reading);

    const outcome = await this.runs.runFile(
      'validate',
      file,
      {},
      { onProgress: (progress) => this.onProgress(progress) },
    );

    if (outcome.status === 'stale' || this.disposed) return;

    this.setRunning(false);

    if (outcome.status === 'failed') {
      this.showFailure(failureText(this.strings, outcome.failure), mode);
      return;
    }

    this.applyValid(outcome.result);
    if (outcome.usedFallback) this.showEngineNote(this.strings.workerFallback);
  }

  private applyValid(result: ValidateResult): void {
    const stats = result.stats;
    this.input.markError(null);
    el<HTMLElement>(this.shell, '[data-result]').hidden = false;
    el<HTMLElement>(this.shell, '[data-result-valid]').hidden = false;
    el<HTMLElement>(this.shell, '[data-result-invalid]').hidden = true;
    el<HTMLElement>(this.shell, '[data-valid-detail]').textContent = fill(
      this.strings.validDetail,
      {
        objects: formatInteger(stats.objects, this.locale),
        arrays: formatInteger(stats.arrays, this.locale),
        values: formatInteger(stats.values, this.locale),
        keys: formatInteger(stats.keys, this.locale),
      },
    );
    this.setStats(stats);
    const status = fill(this.strings.validDone, {
      time: formatMilliseconds(stats.parseTimeMs, this.locale),
    });
    this.setStatus(status);
    this.announce(this.strings.validAnnounce);
    this.refreshButtons();
  }

  private showFailure(info: JsonError, mode: RunMode): void {
    this.lastError = info;
    this.resetStats();

    const snippet = info.line > 0 ? buildSnippet(this.input, info, this.largeMode) : null;
    const location =
      info.line > 0 ? fill(this.strings.errorAt, { line: info.line, column: info.column }) : null;

    el<HTMLElement>(this.shell, '[data-result]').hidden = false;
    el<HTMLElement>(this.shell, '[data-result-valid]').hidden = true;
    const invalid = el<HTMLElement>(this.shell, '[data-result-invalid]');
    invalid.hidden = false;
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
    const repair = el<HTMLButtonElement>(this.shell, '[data-error-repair]');
    repair.hidden = this.largeMode || this.input.getLength() === 0;
    this.input.markError(info.line > 0 && !this.largeMode ? info.line : null);

    const status =
      info.line > 0
        ? fill(this.strings.invalidDone, { line: info.line, column: info.column })
        : this.strings.error;
    this.setStatus(status);
    this.announce(
      info.line > 0
        ? fill(this.strings.announceError, { line: info.line, column: info.column })
        : info.message,
    );
    this.refreshButtons();

    if (mode === 'explicit' && window.matchMedia('(max-width: 767px)').matches) {
      invalid.scrollIntoView({ block: 'nearest' });
    }
  }

  private fileTooBig(): JsonError {
    return failure(this.strings.fileTooBig, this.strings.chooseSmaller, 'runtime');
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
    this.hideResult();
    this.resetStats();
    el<HTMLElement>(this.shell, '[data-engine-note]').hidden = true;
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.input.focus();
  }

  private gotoError(): void {
    const info = this.lastError;
    if (!info || info.line < 1) return;
    this.input.gotoLine(info.line, info.column);
  }

  /** Repairs the current document in place, then validates it again. */
  private async fix(): Promise<void> {
    if (this.largeMode || this.input.getLength() === 0) return;

    const button = el<HTMLButtonElement>(this.shell, '[data-error-repair]');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    this.stopDebounce();
    this.cancelActive();
    this.setStatus(this.strings.repairing);

    const attempt = await repairText(this.runs, this.input.getDoc(), this.indent);
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (this.disposed) return;

    if (attempt.status === 'failed') {
      this.showFailure(attempt.info, 'explicit');
      return;
    }
    if (attempt.status === 'skipped') return;

    this.applying = true;
    this.input.setDoc(attempt.text);
    this.applying = false;
    this.hideResult();
    this.resetStats();
    void this.run('explicit');
  }

  private resetIdle(): void {
    this.stopDebounce();
    this.cancelActive();
    this.hideResult();
    this.resetStats();
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
  }

  private hideResult(): void {
    el<HTMLElement>(this.shell, '[data-result]').hidden = true;
    el<HTMLElement>(this.shell, '[data-result-valid]').hidden = true;
    el<HTMLElement>(this.shell, '[data-result-invalid]').hidden = true;
    this.input.markError(null);
  }

  private resetStats(): void {
    this.setStats(null);
  }

  private setStats(stats: FormatStats | null): void {
    const values: Record<string, string> = stats
      ? {
          size: formatBytes(stats.bytes, this.locale),
          lines: formatInteger(stats.lines, this.locale),
          depth: formatInteger(stats.depth, this.locale),
          time: `${formatMilliseconds(stats.parseTimeMs, this.locale)} ms`,
        }
      : { size: '—', lines: '—', depth: '—', time: '—' };

    for (const [key, value] of Object.entries(values)) {
      const stat = this.shell.querySelector<HTMLElement>(`[data-stat="${key}"]`);
      if (stat) stat.textContent = value;
    }
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

  private showEngineNote(text: string): void {
    const note = el<HTMLElement>(this.shell, '[data-engine-note]');
    note.hidden = false;
    note.textContent = text;
  }

  private setRunning(running: boolean): void {
    this.running = running;
    const frame = el<HTMLElement>(this.shell, '[data-tool-frame]');

    if (running) frame.setAttribute('aria-busy', 'true');
    else frame.removeAttribute('aria-busy');

    el<HTMLButtonElement>(this.shell, '[data-action="validate"]').disabled = running;
    el<HTMLButtonElement>(this.shell, '[data-action="validate-large"]').disabled = running;
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').hidden = !running;
    this.refreshButtons();
  }

  private refreshButtons(): void {
    el<HTMLButtonElement>(this.shell, '[data-action="clear"]').disabled =
      this.input.getLength() === 0 && !this.file;
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
    this.setStatus(
      progress.phase === 'reading' ? this.strings.reading : this.strings.validating,
    );
  }
}

const SAMPLE_JSON = `{
  "project": "JSON Bits",
  "private": true,
  "downloads": 9007199254740993,
  "tags": ["json", "validator", "browser"],
  "limits": { "live": "1 MB", "maxFile": "100 MB" },
  "owner": null
}`;
