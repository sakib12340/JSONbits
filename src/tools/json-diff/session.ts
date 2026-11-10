import type { EditorHandle } from '../../lib/editor';
import { InvalidFileError, readTextFile } from '../../lib/file-text';
import { formatBytes, formatInteger, formatMilliseconds } from '../../lib/format-bytes';
import { buildSnippet } from '../../lib/snippet';
import {
  WorkerCancelledError,
  WorkerClient,
  WorkerResponseError,
  WorkerRuntimeError,
  WorkerUnavailableError,
} from '../../workers/client';
import { failure } from '../../workers/protocol';
import type {
  DiffOptions,
  DiffResult,
  DiffStats,
  JsonError,
  ProgressUpdate,
} from '../../workers/protocol';
import { FALLBACK_LIMIT } from '../limits';
import { fill } from '../shared/strings';
import type { DiffList } from './list';
import { SAMPLE_DIFF_LEFT, SAMPLE_DIFF_RIGHT } from './sample';
import type { DiffStrings } from './strings';

type Side = 'left' | 'right';
type RunMode = 'live' | 'explicit';

const DIFF_FILE_LIMIT = 20 * 1024 * 1024;

interface Options {
  shell: HTMLElement;
  strings: DiffStrings;
  locale: string;
  left: EditorHandle;
  right: EditorHandle;
  list: DiffList;
  showView: (view: Side | 'changes') => void;
}

function el<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing diff element: ${selector}`);
  return found;
}

function isFormatError(error: unknown): error is { toJsonError(): JsonError } {
  return (
    error instanceof Error &&
    'toJsonError' in error &&
    typeof (error as { toJsonError?: unknown }).toJsonError === 'function'
  );
}

/** Compares two JSON documents on the worker and drives the change list. */
export class DiffSession {
  private readonly shell: HTMLElement;
  private readonly strings: DiffStrings;
  private readonly locale: string;
  private readonly left: EditorHandle;
  private readonly right: EditorHandle;
  private readonly list: DiffList;
  private readonly showView: (view: Side | 'changes') => void;
  private readonly client = new WorkerClient();
  private readonly ignoreOrder: HTMLInputElement;

  private activeSide: Side = 'left';
  private running = false;
  private applying = false;
  private disposed = false;
  private runId = 0;
  private loadId = 0;
  private statusToken = 0;
  private hasResult = false;
  private lastError: JsonError | null = null;
  private lastSide: Side = 'left';

  constructor(options: Options) {
    this.shell = options.shell;
    this.strings = options.strings;
    this.locale = options.locale;
    this.left = options.left;
    this.right = options.right;
    this.list = options.list;
    this.showView = options.showView;
    this.ignoreOrder = el(options.shell, '[data-diff-ignore-order]');
  }

  start(): void {
    this.setStatus(this.strings.waiting);
    this.refreshButtons();

    el<HTMLButtonElement>(this.shell, '[data-action="compare"]').addEventListener('click', () =>
      this.runExplicit(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="sample"]').addEventListener('click', () =>
      this.loadSample(),
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
      this.pickFile(),
    );
    el<HTMLButtonElement>(this.shell, '[data-error-dismiss]').addEventListener('click', () => {
      this.hideError();
      this.setStatus(this.bothFilled() ? this.strings.ready : this.strings.waiting);
    });
    el<HTMLButtonElement>(this.shell, '[data-error-goto]').addEventListener('click', () =>
      this.gotoError(),
    );

    for (const button of this.shell.querySelectorAll<HTMLElement>('[data-open-side]')) {
      button.addEventListener('click', () => {
        const side = button.dataset.openSide;
        if (side === 'left' || side === 'right') {
          this.setActiveSide(side);
          this.pickFile();
        }
      });
    }

    const fileInput = el<HTMLInputElement>(this.shell, '[data-file-input]');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) void this.loadFile(this.activeSide, file);
    });

    this.ignoreOrder.addEventListener('change', () => {
      if (this.hasResult && this.bothFilled()) this.runExplicit();
    });
  }

  setActiveSide(side: Side): void {
    this.activeSide = side;
    this.shell.dataset.activeSide = side;
  }

  inputChanged(): void {
    if (this.applying) return;

    this.hasResult = false;
    this.list.clear(this.strings.empty);
    this.resetStats();
    this.hideError();
    this.setStatus(this.bothFilled() ? this.strings.ready : this.strings.waiting);
    this.refreshButtons();
  }

  async loadFile(side: Side, file: File): Promise<void> {
    if (file.size > DIFF_FILE_LIMIT) {
      this.showFailure(
        failure(this.strings.tooLarge, this.strings.chooseSmaller, 'runtime'),
        'explicit',
      );
      return;
    }

    const loadId = ++this.loadId;

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

      this.setSideText(side, text);
      this.setFile(side, file.name);
      this.setActiveSide(side);
      if (this.bothFilled()) await this.run('explicit');
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

  announceStatus(text: string): void {
    this.announce(text);
  }

  dispose(): void {
    this.disposed = true;
    this.list.dispose();
    this.client.dispose();
  }

  private loadSample(): void {
    this.applying = true;
    this.left.setDoc(SAMPLE_DIFF_LEFT);
    this.right.setDoc(SAMPLE_DIFF_RIGHT);
    this.applying = false;
    this.setFile('left', null);
    this.setFile('right', null);
    this.hasResult = false;
    this.list.clear(this.strings.empty);
    this.resetStats();
    this.hideError();
    this.setActiveSide('left');
    void this.run('explicit');
  }

  private setSideText(side: Side, text: string): void {
    this.applying = true;
    this.editor(side).setDoc(text);
    this.applying = false;
    this.hasResult = false;
    this.list.clear(this.strings.empty);
    this.resetStats();
    this.hideError();
    this.setStatus(this.bothFilled() ? this.strings.ready : this.strings.waiting);
    this.refreshButtons();
  }

  private async run(mode: RunMode): Promise<void> {
    if (this.disposed) return;

    const left = this.left.getDoc();
    const right = this.right.getDoc();

    if (left.trim().length === 0 || right.trim().length === 0) {
      this.showFailure(
        failure(this.strings.needBoth, this.strings.emptyInputHint, 'syntax'),
        mode,
      );
      return;
    }

    if (left.length > DIFF_FILE_LIMIT || right.length > DIFF_FILE_LIMIT) {
      this.showFailure(
        failure(this.strings.tooLarge, this.strings.chooseSmaller, 'runtime'),
        mode,
      );
      return;
    }

    const id = ++this.runId;
    this.client.cancelAll();
    this.setRunning(true);
    this.hideError();
    this.setStatus(this.strings.comparing);

    try {
      const { result, usedFallback } = await this.execute(left, right, (progress) =>
        this.onProgress(id, progress),
      );

      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      this.applyResult(result);
      if (usedFallback) this.showEngineNote(this.strings.workerFallback);
    } catch (error) {
      if (id !== this.runId || this.disposed) return;
      this.setRunning(false);
      if (error instanceof WorkerCancelledError) return;
      this.showFailure(this.normalize(error), mode);
    }
  }

  private async execute(
    left: string,
    right: string,
    onProgress: (progress: ProgressUpdate) => void,
  ): Promise<{ result: DiffResult; usedFallback: boolean }> {
    const options: DiffOptions = { ignoreArrayOrder: this.ignoreOrder.checked };

    try {
      const result = await this.client.run('diff', { left, right }, options, onProgress);
      return { result, usedFallback: false };
    } catch (error) {
      if (!(error instanceof WorkerUnavailableError) && !(error instanceof WorkerRuntimeError)) {
        throw error;
      }

      if (left.length + right.length > FALLBACK_LIMIT) throw error;

      const { diffJson } = await import('../../workers/ops/diff');
      return { result: diffJson(left, right, options), usedFallback: true };
    }
  }

  private applyResult(result: DiffResult): void {
    this.list.setResult(result);
    this.hasResult = true;
    this.setStats(result.stats);
    const status =
      result.stats.total === 0
        ? this.strings.same
        : fill(this.strings.found, { count: result.stats.total });
    this.setStatus(status);
    this.announce(status);
    this.refreshButtons();
    this.showView('changes');
    this.list.focus();
  }

  private showFailure(info: JsonError, mode: RunMode): void {
    this.lastError = info;
    this.lastSide = info.message.startsWith('Left')
      ? 'left'
      : info.message.startsWith('Right')
        ? 'right'
        : this.activeSide;
    this.hasResult = false;
    this.list.clear(this.strings.empty);
    this.resetStats();

    const editor = this.editor(this.lastSide);
    const snippet = info.line > 0 ? buildSnippet(editor, info, false) : null;
    const location =
      info.line > 0 ? fill(this.strings.errorAt, { line: info.line, column: info.column }) : null;

    const panel = el<HTMLElement>(this.shell, '[data-error-panel]');
    panel.hidden = false;
    el<HTMLElement>(panel, '[data-error-message]').textContent = info.message;
    el<HTMLElement>(panel, '[data-error-hint]').textContent = info.hint;
    const locationEl = el<HTMLElement>(panel, '[data-error-location]');
    locationEl.hidden = location === null;
    locationEl.textContent = location ?? '';
    const snippetEl = el<HTMLElement>(panel, '[data-error-snippet]');
    snippetEl.hidden = snippet === null;
    el<HTMLElement>(snippetEl, 'code').textContent = snippet ?? '';
    el<HTMLElement>(panel, '[data-error-goto]').hidden = info.line < 1 || editor.getLength() === 0;

    this.setStatus(location ?? this.strings.error);
    this.announce(
      info.line > 0
        ? fill(this.strings.announceError, { line: info.line, column: info.column })
        : info.message,
    );
    this.refreshButtons();

    if (mode === 'explicit') this.showView('changes');
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

  private async paste(): Promise<void> {
    try {
      if (!navigator.clipboard?.readText) throw new Error('Clipboard unavailable');
      const text = await navigator.clipboard.readText();
      const editor = this.editor(this.activeSide);
      if (text.length === 0) {
        editor.focus();
        return;
      }
      this.setSideText(this.activeSide, text);
      editor.focus();
    } catch {
      this.flash(this.strings.pasteUnavailable);
      this.announce(this.strings.pasteUnavailable);
      this.editor(this.activeSide).focus();
    }
  }

  private clear(): void {
    this.loadId += 1;
    this.runId += 1;
    this.client.cancelAll();
    this.applying = true;
    this.left.setDoc('');
    this.right.setDoc('');
    this.applying = false;
    this.setFile('left', null);
    this.setFile('right', null);
    this.hasResult = false;
    this.list.clear(this.strings.empty);
    this.resetStats();
    this.hideError();
    el<HTMLElement>(this.shell, '[data-engine-note]').hidden = true;
    this.setRunning(false);
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.left.focus();
  }

  private gotoError(): void {
    const info = this.lastError;
    if (!info || info.line < 1) return;
    this.showView(this.lastSide);
    this.editor(this.lastSide).gotoLine(info.line, info.column);
  }

  private pickFile(): void {
    el<HTMLInputElement>(this.shell, '[data-file-input]').click();
  }

  private editor(side: Side): EditorHandle {
    return side === 'left' ? this.left : this.right;
  }

  private bothFilled(): boolean {
    return this.left.getLength() > 0 && this.right.getLength() > 0;
  }

  private setStats(stats: DiffStats | null): void {
    this.setStat('changes', stats ? formatInteger(stats.total, this.locale) : '—');
    this.setStat(
      'size',
      stats
        ? `${formatBytes(stats.leftBytes, this.locale)} / ${formatBytes(stats.rightBytes, this.locale)}`
        : '—',
    );
    this.setStat(
      'time',
      stats ? `${formatMilliseconds(stats.parseTimeMs, this.locale)} ms` : '—',
    );
  }

  private resetStats(): void {
    this.setStats(null);
  }

  private setStat(key: string, value: string): void {
    const stat = this.shell.querySelector<HTMLElement>(`[data-stat="${key}"]`);
    if (stat) stat.textContent = value;
  }

  private setFile(side: Side, name: string | null): void {
    const chip = this.shell.querySelector<HTMLElement>(`[data-file-chip="${side}"]`);
    if (!chip) return;
    chip.hidden = name === null;
    if (name !== null) {
      const label = chip.querySelector<HTMLElement>('[data-file-name]');
      if (label) {
        label.textContent = name;
        label.title = name;
      }
    }
  }

  private hideError(): void {
    el<HTMLElement>(this.shell, '[data-error-panel]').hidden = true;
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

    el<HTMLButtonElement>(this.shell, '[data-action="compare"]').disabled = running;
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').hidden = !running;
    this.refreshButtons();
  }

  private refreshButtons(): void {
    el<HTMLButtonElement>(this.shell, '[data-action="clear"]').disabled =
      this.left.getLength() === 0 && this.right.getLength() === 0;
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
      this.setStatus(this.bothFilled() ? this.strings.ready : this.strings.waiting);
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
    this.client.cancelAll();
    this.setRunning(false);
    this.setStatus(this.strings.cancelled);
    this.announce(this.strings.cancelled);
  }

  private onProgress(id: number, progress: ProgressUpdate): void {
    if (id !== this.runId) return;
    if (progress.phase === 'comparing') this.setStatus(this.strings.comparing);
  }
}
