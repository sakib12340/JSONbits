import { copyText } from '../../lib/clipboard';
import { downloadBlob, downloadText, formattedName } from '../../lib/download';
import { formatBytes, formatMilliseconds } from '../../lib/format-bytes';
import { readIndent, writeIndent } from '../../lib/storage';
import type { EditorHandle } from '../../lib/editor';
import {
  WorkerCancelledError,
  WorkerResponseError,
  WorkerRuntimeError,
  WorkerUnavailableError,
} from '../../workers/client';
import { failure } from '../../workers/protocol';
import type {
  FormatIndent,
  FormatResult,
  JsonError,
  ProgressUpdate,
} from '../../workers/protocol';
import { JsonFormatterEngine } from './engine';
import { InvalidFileError, readTextFile } from './files';
import { SAMPLE_JSON } from './sample';
import { fill, type ToolStrings } from './strings';
import { buildSnippet } from './snippet';
import type { ToolView } from './view';
import type { ToolView as ViewKind } from './tabs';
import { LIVE_LIMIT, MAX_FILE, PREVIEW_LIMIT } from '../limits';

type RunMode = 'live' | 'explicit';

interface Options {
  view: ToolView;
  strings: ToolStrings;
  locale: string;
  input: EditorHandle;
  showView: (view: ViewKind) => void;
}

export class FormatterSession {
  private readonly view: ToolView;
  private readonly strings: ToolStrings;
  private readonly locale: string;
  private readonly input: EditorHandle;
  private readonly showView: (view: ViewKind) => void;
  private readonly engine = new JsonFormatterEngine();

  private indent: FormatIndent = readIndent();
  private file: File | null = null;
  private largeMode = false;
  private outputText: string | null = null;
  private outputBlob: Blob | null = null;
  private hasOutput = false;
  private running = false;
  private applying = false;
  private disposed = false;
  private runId = 0;
  private loadId = 0;
  private liveTimer = 0;
  private lastError: JsonError | null = null;

  constructor(options: Options) {
    this.view = options.view;
    this.strings = options.strings;
    this.locale = options.locale;
    this.input = options.input;
    this.showView = options.showView;
  }

  start(): void {
    const ui = this.view.ui;
    this.view.syncIndent(String(this.indent));
    this.view.setStatus(this.strings.waiting);
    this.refreshButtons();

    ui.format.addEventListener('click', () => void this.run('explicit'));
    ui.formatLarge.addEventListener('click', () => void this.run('explicit'));
    ui.sample.addEventListener('click', () => this.setInputText(SAMPLE_JSON, true));
    ui.clear.addEventListener('click', () => this.clear());
    ui.cancel.addEventListener('click', () => this.cancel());
    ui.copy.addEventListener('click', () => void this.copyOutput());
    ui.download.addEventListener('click', () => this.downloadOutput());
    ui.downloadLarge.addEventListener('click', () => this.downloadOutput());
    ui.paste.addEventListener('click', () => void this.paste());
    ui.open.addEventListener('click', () => ui.fileInput.click());
    ui.fileInput.addEventListener('change', () => {
      const file = ui.fileInput.files?.[0];
      ui.fileInput.value = '';
      if (file) void this.loadFile(file);
    });
    ui.indent.root.addEventListener('change', () => this.changeIndent());
    ui.find.addEventListener('click', () => this.view.openFind());
    ui.errorDismiss.addEventListener('click', () => {
      this.view.hideError();
      this.view.setStatus(this.input.getLength() > 0 ? this.strings.ready : this.strings.waiting);
    });
    ui.errorGoto.addEventListener('click', () => this.gotoError());
  }

  inputChanged(length: number): void {
    if (this.applying) return;

    this.file = null;
    this.view.setFile(null);
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
      this.view.setStatus(this.strings.largeRun);
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
    this.view.setFile(file.name);
    this.showView('input');

    if (file.size > PREVIEW_LIMIT) {
      this.largeMode = true;
      this.view.setLargeInput(
        file,
        file.size > 50 * 1024 * 1024
          ? fill(this.strings.largeWarning, { size: formatBytes(file.size, this.locale) })
          : null,
      );
      this.applying = true;
      this.input.setDoc('');
      this.applying = false;
      this.input.setReadOnly(true);
      this.resetOutput();
      this.resetStats();
      this.view.ui.statSize.textContent = formatBytes(file.size, this.locale);
      this.view.setStatus(this.strings.largeLoaded);
      this.refreshButtons();
      return;
    }

    this.largeMode = false;
    this.view.hideLargeInput();
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
      this.view.hideError();
      this.view.setFile(file.name);
      this.view.setStatus(text.length > LIVE_LIMIT ? this.strings.largeRun : this.strings.ready);

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

  setInputText(text: string, explicit: boolean): void {
    this.loadId += 1;
    this.file = null;
    this.largeMode = false;
    this.view.setFile(null);
    this.view.hideLargeInput();
    this.input.setReadOnly(false);
    this.applying = true;
    this.input.setDoc(text);
    this.applying = false;
    this.resetOutput();
    this.resetStats();
    this.view.hideError();

    if (explicit) {
      void this.run('explicit');
    } else if (text.length > LIVE_LIMIT) {
      this.view.setStatus(this.strings.largeRun);
    } else {
      this.scheduleLive();
    }

    this.input.focus();
    this.refreshButtons();
  }

  async run(mode: RunMode): Promise<void> {
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
    const id = ++this.runId;
    this.engine.cancel();
    this.setRunning(true);
    this.view.hideError();

    try {
      const { result, usedFallback } = await this.engine.format(
        { text },
        { indent: this.indent },
        (progress) => this.onProgress(id, progress),
      );

      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      this.applyResult(result, mode);
      if (usedFallback) this.view.showEngineNote(this.strings.workerFallback);
    } catch (error) {
      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      if (error instanceof WorkerCancelledError) return;
      this.showFailure(this.normalize(error), mode);
    }
  }

  cancel(): void {
    if (!this.running) return;
    this.cancelActive();
    this.view.setStatus(this.strings.cancelled);
    this.view.announce(this.strings.cancelled);
  }

  canCopy(): boolean {
    return this.outputText !== null;
  }

  async copyOutput(): Promise<boolean> {
    const text = this.outputText;
    if (text === null) return false;

    const ok = await copyText(text);
    if (this.disposed) return true;
    this.view.flash(ok ? this.strings.copied : this.strings.copyFailed);
    this.view.announce(ok ? this.strings.copied : this.strings.copyFailed);
    return true;
  }

  downloadOutput(): void {
    const name = formattedName(this.file?.name ?? null);

    if (this.outputBlob) {
      downloadBlob(this.outputBlob, name);
    } else if (this.outputText !== null) {
      downloadText(this.outputText, name);
    }
  }

  private async runFile(mode: RunMode): Promise<void> {
    const file = this.file;
    if (!file) return;

    if (file.size > MAX_FILE) {
      this.showFailure(this.fileTooBig(), mode);
      return;
    }

    this.stopDebounce();
    const id = ++this.runId;
    this.engine.cancel();
    this.setRunning(true);
    this.view.hideError();
    this.view.setStatus(this.strings.reading);

    let buffer: ArrayBuffer;

    try {
      buffer = await file.arrayBuffer();
    } catch {
      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      this.showFailure(failure(this.strings.readFailed, this.strings.tryAgain, 'runtime'), mode);
      return;
    }

    if (id !== this.runId || this.disposed) return;

    try {
      const { result, usedFallback } = await this.engine.format(
        { buffer },
        { indent: this.indent },
        (progress) => this.onProgress(id, progress),
      );

      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      this.applyResult(result, mode);
      if (usedFallback) this.view.showEngineNote(this.strings.workerFallback);
    } catch (error) {
      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      if (error instanceof WorkerCancelledError) return;
      this.showFailure(this.normalize(error), mode);
    }
  }

  private applyResult(result: FormatResult, mode: RunMode): void {
    this.outputText = result.output;
    this.outputBlob = result.blob;
    this.hasOutput = true;
    this.view.showResult(result);
    this.refreshButtons();

    const time = formatMilliseconds(result.stats.parseTimeMs, this.locale);
    this.view.setStatus(fill(this.strings.done, { time }));

    if (mode === 'explicit') {
      this.view.announce(this.strings.announceDone);
      if (this.view.maxWidthQuery) this.showView('output');
    } else {
      this.view.setOutputDot(this.view.mobileView === 'input');
    }
  }

  private showFailure(info: JsonError, mode: RunMode): void {
    this.lastError = info;
    this.resetOutput();
    this.resetStats();

    const snippet = info.line > 0 ? buildSnippet(this.input, info, this.largeMode) : null;
    const location = info.line > 0
      ? fill(this.strings.errorAt, { line: info.line, column: info.column })
      : null;

    this.view.showError(info, snippet, location);
    this.view.setStatus(location ?? this.strings.error);
    this.view.announce(
      info.line > 0
        ? fill(this.strings.announceError, { line: info.line, column: info.column })
        : info.message,
    );

    if (mode === 'explicit' && this.view.maxWidthQuery) this.showView('output');
  }

  private normalize(error: unknown): JsonError {
    if (error instanceof WorkerResponseError) {
      const info = error.info;

      if (info.code === 'oom') {
        return { ...info, message: this.strings.oom, hint: this.strings.oomHint };
      }

      if (info.code === 'encoding') {
        return { ...info, message: this.strings.invalidFile, hint: this.strings.encodingHint };
      }

      if (info.code === 'runtime') {
        return { ...info, message: this.strings.workerFailed, hint: this.strings.workerFailedHint };
      }

      return info;
    }

    if (error instanceof InvalidFileError) {
      return failure(this.strings.invalidFile, this.strings.encodingHint, 'encoding');
    }

    if (error instanceof WorkerUnavailableError || error instanceof WorkerRuntimeError) {
      return failure(this.strings.workerFailed, this.strings.workerFailedHint, 'runtime');
    }

    return failure(this.strings.workerFailed, this.strings.workerFailedHint, 'runtime');
  }

  private fileTooBig(): JsonError {
    return failure(this.strings.fileTooBig, this.strings.chooseSmaller, 'runtime');
  }

  private changeIndent(): void {
    const raw = this.view.ui.indent.value;
    this.indent = raw === 'tab' ? 'tab' : raw === '4' ? 4 : 2;
    writeIndent(this.indent);

    if (this.largeMode) {
      this.view.setStatus(this.strings.largeLoaded);
      return;
    }

    const length = this.input.getLength();
    if (length === 0) return;

    if (length > LIVE_LIMIT) {
      this.view.setStatus(this.strings.largeRun);
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
      this.view.flash(this.strings.pasteUnavailable);
      this.view.announce(this.strings.pasteUnavailable);
      this.input.focus();
    }
  }

  private clear(): void {
    this.loadId += 1;
    this.cancelActive();
    this.file = null;
    this.largeMode = false;
    this.view.setFile(null);
    this.view.hideLargeInput();
    this.input.setReadOnly(false);
    this.applying = true;
    this.input.setDoc('');
    this.applying = false;
    this.resetOutput();
    this.resetStats();
    this.view.hideError();
    this.view.hideEngineNote();
    this.view.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.input.focus();
  }

  private gotoError(): void {
    const info = this.lastError;
    if (!info || info.line < 1) return;
    this.showView('input');
    this.input.gotoLine(info.line, info.column);
  }

  private resetIdle(): void {
    this.stopDebounce();
    this.cancelActive();
    this.resetOutput();
    this.resetStats();
    this.view.setStatus(this.strings.waiting);
    this.refreshButtons();
  }

  private resetOutput(): void {
    this.outputText = null;
    this.outputBlob = null;
    this.hasOutput = false;
    this.view.clearOutput();
    this.refreshButtons();
  }

  private resetStats(): void {
    this.view.setStats(null);
  }

  private refreshButtons(): void {
    this.view.setOutputTextAvailable(this.outputText !== null);
    this.view.updateButtons(this.hasOutput, this.file !== null);
  }

  private setRunning(running: boolean): void {
    this.running = running;
    this.view.setRunning(running);
    this.refreshButtons();
  }

  private cancelActive(): void {
    this.runId += 1;
    this.engine.cancel();
    this.setRunning(false);
  }

  private stopDebounce(): void {
    if (this.liveTimer !== 0) {
      window.clearTimeout(this.liveTimer);
      this.liveTimer = 0;
    }
  }

  private scheduleLive(): void {
    this.stopDebounce();
    this.liveTimer = window.setTimeout(() => {
      this.liveTimer = 0;
      void this.run('live');
    }, 250);
  }

  private onProgress(id: number, progress: ProgressUpdate): void {
    if (id !== this.runId) return;
    this.view.setStatus(
      progress.phase === 'reading' ? this.strings.reading : this.strings.formatting,
    );
  }

  dispose(): void {
    this.disposed = true;
    this.stopDebounce();
    this.engine.dispose();
  }
}
