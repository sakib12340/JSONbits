import type { EditorHandle } from '../../lib/editor';
import { InvalidFileError, readTextFile } from '../../lib/file-text';
import { formatBytes, formatInteger, formatMilliseconds } from '../../lib/format-bytes';
import { buildSnippet } from '../../lib/snippet';
import { WorkerCancelledError, WorkerResponseError } from '../../workers/client';
import { failure } from '../../workers/protocol';
import type { JsonError, ProgressUpdate } from '../../workers/protocol';
import { LIVE_LIMIT, MAX_FILE, PREVIEW_LIMIT } from '../limits';
import { fill } from '../shared/strings';
import { SAMPLE_VIEW } from './sample';
import type { TreeStore } from './store';
import type { TreeView } from './view';
import type { ViewerStrings } from './strings';

type RunMode = 'live' | 'explicit';

interface Options {
  shell: HTMLElement;
  strings: ViewerStrings;
  locale: string;
  input: EditorHandle;
  store: TreeStore;
  view: TreeView;
  showView: (view: 'input' | 'tree') => void;
}

function el<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing viewer element: ${selector}`);
  return found;
}

function isFormatError(error: unknown): error is { toJsonError(): JsonError } {
  return (
    error instanceof Error &&
    'toJsonError' in error &&
    typeof (error as { toJsonError?: unknown }).toJsonError === 'function'
  );
}

/** Loads JSON into the worker tree and keeps the virtualized view in sync. */
export class ViewerSession {
  private readonly shell: HTMLElement;
  private readonly strings: ViewerStrings;
  private readonly locale: string;
  private readonly input: EditorHandle;
  private readonly store: TreeStore;
  private readonly view: TreeView;
  private readonly showView: (view: 'input' | 'tree') => void;

  private file: File | null = null;
  private largeMode = false;
  private running = false;
  private applying = false;
  private disposed = false;
  private runId = 0;
  private loadId = 0;
  private statusToken = 0;
  private lastError: JsonError | null = null;
  private frame: HTMLElement | null = null;
  private fullscreenButton: HTMLButtonElement | null = null;

  private readonly handleFullscreenChange = (): void => {
    const button = this.fullscreenButton;
    if (!button) return;

    const active = document.fullscreenElement === this.frame;
    const label = active ? this.strings.exitFullscreen : this.strings.fullscreen;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.setAttribute('aria-pressed', String(active));

    const enter = button.querySelector<HTMLElement>('[data-fullscreen-enter]');
    const exit = button.querySelector<HTMLElement>('[data-fullscreen-exit]');
    if (enter) enter.hidden = active;
    if (exit) exit.hidden = !active;
  };

  constructor(options: Options) {
    this.shell = options.shell;
    this.strings = options.strings;
    this.locale = options.locale;
    this.input = options.input;
    this.store = options.store;
    this.view = options.view;
    this.showView = options.showView;
  }

  start(): void {
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.setupFullscreen();

    el<HTMLButtonElement>(this.shell, '[data-action="view"]').addEventListener('click', () =>
      this.runExplicit(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="view-large"]').addEventListener(
      'click',
      () => this.runExplicit(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="sample"]').addEventListener('click', () =>
      this.setInputText(SAMPLE_VIEW, true),
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
    this.shell
      .querySelector<HTMLButtonElement>('[data-action="find"]')
      ?.addEventListener('click', () => this.input.openFind());
    el<HTMLButtonElement>(this.shell, '[data-error-dismiss]').addEventListener('click', () => {
      this.hideError();
      this.setStatus(this.input.getLength() > 0 ? this.strings.ready : this.strings.waiting);
    });
    el<HTMLButtonElement>(this.shell, '[data-error-goto]').addEventListener('click', () =>
      this.gotoError(),
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

    this.file = null;
    this.setFile(null);
    this.resetTree();
    this.refreshButtons();

    if (length === 0) {
      this.setStatus(this.strings.waiting);
      return;
    }

    this.setStatus(length > LIVE_LIMIT ? this.strings.largeRun : this.strings.treePressView);
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
      this.resetTree();
      this.setStatus(this.strings.treeLargeReady);
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
      this.resetTree();
      this.setFile(file.name);
      this.refreshButtons();
      await this.run('explicit');
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

  showStatus(text: string): void {
    this.setStatus(text);
  }

  announceStatus(text: string): void {
    this.announce(text);
  }

  private setupFullscreen(): void {
    const frame = this.shell.querySelector<HTMLElement>('[data-tool-frame]');
    const button = this.shell.querySelector<HTMLButtonElement>('[data-action="fullscreen"]');

    if (!frame || !button) return;

    if (!document.fullscreenEnabled || typeof frame.requestFullscreen !== 'function') {
      button.hidden = true;
      return;
    }

    this.frame = frame;
    this.fullscreenButton = button;
    button.addEventListener('click', () => void this.toggleFullscreen());
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    this.handleFullscreenChange();
  }

  private async toggleFullscreen(): Promise<void> {
    const frame = this.frame;
    if (!frame) return;

    try {
      if (document.fullscreenElement === frame) {
        await document.exitFullscreen();
      } else {
        await frame.requestFullscreen();
      }
    } catch {
      this.flash(this.strings.fullscreenFailed);
      this.announce(this.strings.fullscreenFailed);
    }
  }

  dispose(): void {
    this.disposed = true;
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    this.view.dispose();
    this.store.dispose();
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
    this.resetTree();

    if (explicit) {
      void this.run('explicit');
    } else {
      this.setStatus(text.length > LIVE_LIMIT ? this.strings.largeRun : this.strings.treePressView);
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
        this.resetTree();
        this.setStatus(this.strings.waiting);
      }
      return;
    }

    const id = ++this.runId;
    this.store.cancel();
    this.setRunning(true);
    this.hideError();
    this.setStatus(this.strings.indexing);

    try {
      const { usedFallback } = await this.store.load({ text }, (progress) =>
        this.onProgress(id, progress),
      );

      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      this.view.refresh();
      this.updateStats();
      const status = fill(this.strings.treeDone, {
        time: formatMilliseconds(this.store.stats?.parseTimeMs ?? 0, this.locale),
      });
      this.setStatus(status);
      this.announce(status);
      if (usedFallback) this.showEngineNote(this.strings.workerFallback);
      this.refreshButtons();
      this.showView('tree');
      this.view.focus();
    } catch (error) {
      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      if (error instanceof WorkerCancelledError) return;
      this.showFailure(this.normalize(error), mode);
    }
  }

  private async runFile(mode: RunMode): Promise<void> {
    const file = this.file;
    if (!file) return;

    if (file.size > MAX_FILE) {
      this.showFailure(this.fileTooBig(), mode);
      return;
    }

    const id = ++this.runId;
    this.store.cancel();
    this.setRunning(true);
    this.hideError();
    this.setStatus(this.strings.reading);

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
      const { usedFallback } = await this.store.load({ buffer }, (progress) =>
        this.onProgress(id, progress),
      );

      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      this.view.refresh();
      this.updateStats();
      const status = fill(this.strings.treeDone, {
        time: formatMilliseconds(this.store.stats?.parseTimeMs ?? 0, this.locale),
      });
      this.setStatus(status);
      this.announce(status);
      if (usedFallback) this.showEngineNote(this.strings.workerFallback);
      this.refreshButtons();
      this.showView('tree');
      this.view.focus();
    } catch (error) {
      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      if (error instanceof WorkerCancelledError) return;
      this.showFailure(this.normalize(error), mode);
    }
  }

  private showFailure(info: JsonError, mode: RunMode): void {
    this.lastError = info;
    this.resetTree();

    const snippet = info.line > 0 ? buildSnippet(this.input, info, this.largeMode) : null;
    const location =
      info.line > 0 ? fill(this.strings.errorAt, { line: info.line, column: info.column }) : null;

    const panel = el<HTMLElement>(this.shell, '[data-tree-error]');
    panel.hidden = false;
    el<HTMLElement>(panel, '[data-error-message]').textContent = info.message;
    el<HTMLElement>(panel, '[data-error-hint]').textContent = info.hint;
    const locationEl = el<HTMLElement>(panel, '[data-error-location]');
    locationEl.hidden = location === null;
    locationEl.textContent = location ?? '';
    const snippetEl = el<HTMLElement>(panel, '[data-error-snippet]');
    snippetEl.hidden = snippet === null;
    el<HTMLElement>(snippetEl, 'code').textContent = snippet ?? '';
    el<HTMLElement>(panel, '[data-error-goto]').hidden =
      info.line < 1 || this.input.getLength() === 0 || this.largeMode;

    this.setStatus(location ?? this.strings.error);
    this.announce(
      info.line > 0
        ? fill(this.strings.announceError, { line: info.line, column: info.column })
        : info.message,
    );
    this.refreshButtons();

    if (mode === 'explicit') this.showView('tree');
  }

  private normalize(error: unknown): JsonError {
    if (error instanceof WorkerResponseError) {
      const info = error.info;

      if (info.code === 'oom') return { ...info, message: this.strings.oom, hint: this.strings.oomHint };
      if (info.code === 'encoding') {
        return { ...info, message: this.strings.invalidFile, hint: this.strings.encodingHint };
      }
      if (info.code === 'runtime') {
        return {
          ...info,
          message: this.strings.workerFailed,
          hint: this.strings.workerFailedHint,
        };
      }

      return info;
    }

    if (isFormatError(error)) return error.toJsonError();

    return failure(this.strings.workerFailed, this.strings.workerFailedHint, 'runtime');
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
    this.runId += 1;
    this.store.reset();
    this.file = null;
    this.largeMode = false;
    this.setFile(null);
    this.hideLargeInput();
    this.input.setReadOnly(false);
    this.applying = true;
    this.input.setDoc('');
    this.applying = false;
    this.view.clear();
    this.resetStats();
    this.hideError();
    el<HTMLElement>(this.shell, '[data-engine-note]').hidden = true;
    this.setRunning(false);
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

  private resetTree(): void {
    this.runId += 1;
    this.store.reset();
    this.view.clear();
    this.resetStats();
    this.hideError();
  }

  private updateStats(): void {
    const stats = this.store.stats;
    this.setStat('nodes', formatInteger(this.store.nodeCount, this.locale));
    this.setStat('keys', stats ? formatInteger(stats.keys, this.locale) : '—');
    this.setStat('depth', stats ? formatInteger(stats.depth, this.locale) : '—');
    this.setStat(
      'time',
      stats ? `${formatMilliseconds(stats.parseTimeMs, this.locale)} ms` : '—',
    );
  }

  private resetStats(): void {
    for (const key of ['nodes', 'keys', 'depth', 'time']) this.setStat(key, '—');
  }

  private setStat(key: string, value: string): void {
    const stat = this.stat(key);
    if (stat) stat.textContent = value;
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
  }

  private hideLargeInput(): void {
    el<HTMLElement>(this.shell, '[data-large-input]').hidden = true;
  }

  private hideError(): void {
    el<HTMLElement>(this.shell, '[data-tree-error]').hidden = true;
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

    el<HTMLButtonElement>(this.shell, '[data-action="view"]').disabled = running;
    el<HTMLButtonElement>(this.shell, '[data-action="view-large"]').disabled = running;
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
    this.runId += 1;
    this.store.cancel();
    this.setRunning(false);
    this.setStatus(this.strings.cancelled);
    this.announce(this.strings.cancelled);
  }

  private onProgress(id: number, progress: ProgressUpdate): void {
    if (id !== this.runId) return;
    this.setStatus(
      progress.phase === 'reading' ? this.strings.reading : this.strings.indexing,
    );
  }
}
