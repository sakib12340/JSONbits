import { copyText } from '../../lib/clipboard';
import { downloadBlob } from '../../lib/download';
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
  EscapeOptions,
  EscapeStats,
  FormatIndent,
  JsonError,
  JsonPathResult,
  JsonPathStats,
  ProgressUpdate,
  SortStats,
  TypescriptStats,
} from '../../workers/protocol';
import { RunController, type RunOutcome } from '../../workers/run-controller';
import { LIVE_LIMIT, MAX_FILE, PREVIEW_LIMIT } from '../limits';
import { slugForOp } from '../registry';
import { failureText } from './failure';
import { repairText } from './in-place-repair';
import {
  paneOutput,
  readPaneOptions,
  type PaneOp,
} from './pane-config';
import { fill, type BaseStrings } from './strings';

export interface PaneStrings extends BaseStrings {
  runVerb: string;
  runDone: string;
  escapeVerb: string;
  escapeDone: string;
  unescapeVerb: string;
  unescapeDone: string;
  escapeLabel: string;
  unescapeLabel: string;
  emptyExpression: string;
  largeRunTemplate: string;
  largeLoadedTemplate: string;
  largeWarningTemplate: string;
  keysMeta: string;
  replacementsMeta: string;
  matchesMeta: string;
  showingMatches: string;
  queryErrorAt: string;
  declarationsMeta: string;
  truncatedSuffix: string;
}

type RunMode = 'live' | 'explicit';
type OpOutcome = RunOutcome<PaneOp>;
type AnyStats = SortStats | EscapeStats | JsonPathStats | TypescriptStats;

interface Options {
  shell: HTMLElement;
  op: PaneOp;
  strings: PaneStrings;
  locale: string;
  input: EditorHandle;
  output: EditorHandle;
  sample: string;
  sampleExpression?: string;
  canRepair: boolean;
  showView: (view: 'input' | 'output') => void;
}

function el<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing tool element: ${selector}`);
  return found;
}

/** Shared session for the single-input Tier 3 tools. */
export class PaneSession {
  private readonly shell: HTMLElement;
  private readonly op: PaneOp;
  private readonly strings: PaneStrings;
  private readonly locale: string;
  private readonly input: EditorHandle;
  private readonly output: EditorHandle;
  private readonly sample: string;
  private readonly sampleExpression: string | undefined;
  private readonly canRepair: boolean;
  private readonly showView: (view: 'input' | 'output') => void;
  private readonly runs = new RunController();
  private readonly statKeys = [
    'size',
    'keys',
    'lines',
    'time',
    'output',
    'matches',
    'declarations',
    'properties',
  ];

  private indentMenu: SelectMenu | null = null;
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
  private revision = 0;
  private statusToken = 0;
  private lastError: JsonError | null = null;
  private stopFullscreen: (() => void) | null = null;
  private allText: string | null = null;
  private allBlob: Blob | null = null;

  constructor(options: Options) {
    this.shell = options.shell;
    this.op = options.op;
    this.strings = options.strings;
    this.locale = options.locale;
    this.input = options.input;
    this.output = options.output;
    this.sample = options.sample;
    this.sampleExpression = options.sampleExpression;
    this.canRepair = options.canRepair;
    this.showView = options.showView;
  }

  start(): void {
    this.initSelects();
    this.restoreIndent();
    this.updateEscapeLabels();
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.stopFullscreen = setupFullscreen(this.shell, this.strings, (message) => {
      this.flash(message);
      this.announce(message);
    });

    el<HTMLButtonElement>(this.shell, `[data-action="${this.op}"]`).addEventListener(
      'click',
      () => void this.run('explicit'),
    );
    el<HTMLButtonElement>(this.shell, `[data-action="${this.op}-large"]`).addEventListener(
      'click',
      () => void this.run('explicit'),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="sample"]').addEventListener('click', () =>
      this.applySample(),
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

    if (this.op === 'jsonpath') {
      this.shell.querySelector('[data-download-all]')?.addEventListener('click', () => {
        this.downloadAll();
      });
      this.shell.querySelector('[data-query-examples]')?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const chip = target.closest<HTMLElement>('[data-example]');
        if (!chip) return;
        const field = this.queryInput();
        if (field) field.value = chip.dataset.example ?? '';
        this.hideQueryError();
        void this.run('explicit');
      });
    }

    setupSend({
      shell: this.shell,
      locale: this.locale,
      getText: () => this.input.getDoc(),
      onError: (message) => {
        this.flash(message);
        this.announce(message);
      },
      emptyMessage: this.strings.sendEmpty,
      tooLargeMessage: this.strings.sendTooLarge,
      side: 'input',
    });

    if (this.op === 'jsonpath') {
      setupSend({
        shell: this.shell,
        locale: this.locale,
        getText: () => this.outputText ?? this.allText ?? '',
        onError: (message) => {
          this.flash(message);
          this.announce(message);
        },
        emptyMessage: this.strings.sendEmpty,
        tooLargeMessage: this.strings.sendTooLarge,
        side: 'output',
      });
    }

    const handoff = takeHandoff(slugForOp(this.op) ?? '');
    if (handoff) this.setInputText(handoff, true);

    const fileInput = el<HTMLInputElement>(this.shell, '[data-file-input]');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) void this.loadFile(file);
    });

    this.shell.querySelector('[data-options]')?.addEventListener('change', () =>
      this.onOptionsChanged(),
    );
    this.indentMenu?.root.addEventListener('change', () => this.changeIndent());
  }

  inputChanged(length: number): void {
    if (this.applying) return;

    this.input.markError(null);
    this.file = null;
    this.setFile(null);
    this.refreshButtons();
    this.revision += 1;

    if (length === 0) {
      this.resetIdle();
      return;
    }

    if (this.op === 'jsonpath' && this.expression.length === 0) {
      this.cancelActive();
      this.resetOutput();
      this.resetStats();
      this.setStatus(this.strings.emptyExpression);
      return;
    }

    if (length > LIVE_LIMIT) {
      this.stopDebounce();
      this.cancelActive();
      this.resetOutput();
      this.resetStats();
      this.setStatus(this.largePrompt('run'));
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
    this.revision += 1;

    if (file.size > PREVIEW_LIMIT) {
      this.largeMode = true;
      this.setLargeInput(file);
      this.applying = true;
      this.input.setDoc('');
      this.applying = false;
      this.input.setReadOnly(true);
      this.setRunning(false);
      this.resetOutput();
      this.resetStats();
      this.stat('size')!.textContent = formatBytes(file.size, this.locale);
      this.setStatus(this.largePrompt('loaded'));
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
      this.setStatus(text.length > LIVE_LIMIT ? this.largePrompt('run') : this.strings.ready);

      if (text.length > LIVE_LIMIT) {
        this.setRunning(false);
        this.refreshButtons();
      } else if (this.op === 'jsonpath' && this.expression.length === 0) {
        this.cancelActive();
        this.setStatus(this.strings.emptyExpression);
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

  copyForShortcut(): boolean {
    if (this.outputText === null) return false;
    void this.copyOutput();
    return true;
  }

  private get expression(): string {
    return (
      this.shell.querySelector<HTMLInputElement>('[data-option="expression"]')?.value.trim() ?? ''
    );
  }

  private applySample(): void {
    if (this.sampleExpression !== undefined) {
      const field = this.shell.querySelector<HTMLInputElement>('[data-option="expression"]');
      if (field) field.value = this.sampleExpression;
    }
    this.setInputText(this.sample, true);
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
    this.revision += 1;
    this.resetOutput();
    this.resetStats();
    this.hideError();

    if (explicit) {
      void this.run('explicit');
    } else if (text.length > LIVE_LIMIT) {
      this.setStatus(this.largePrompt('run'));
    } else {
      this.scheduleLive();
    }

    this.input.focus();
    this.refreshButtons();
  }

  private async run(mode: RunMode): Promise<void> {
    if (this.disposed) return;

    if (this.op === 'jsonpath' && this.expression.length === 0) {
      this.showQueryFailure(this.strings.emptyExpression);
      if (mode === 'explicit') this.focusExpression();
      return;
    }

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
    if (this.running) this.cancelActive();
    const revision = ++this.revision;
    this.setRunning(true);
    this.hideError();

    const outcome = await this.runOp({ text }, (progress) => this.onProgress(progress));

    if (this.disposed || revision !== this.revision) return;

    this.applyOutcome(outcome, mode);
  }

  private async runFile(mode: RunMode): Promise<void> {
    const file = this.file;
    if (!file) return;

    this.stopDebounce();
    if (this.running) this.cancelActive();
    const revision = ++this.revision;
    this.setRunning(true);
    this.hideError();
    this.setStatus(this.strings.reading);

    const outcome = await this.runFileOp(file, (progress) => this.onProgress(progress));

    if (this.disposed || revision !== this.revision) return;

    this.applyOutcome(outcome, mode);
  }

  private applyOutcome(outcome: OpOutcome, mode: RunMode): void {
    this.setRunning(false);

    if (outcome.status === 'stale') return;

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
    const options = readPaneOptions(this.shell, this.op) as never;
    return this.runs.run(this.op, payload, options, { onProgress });
  }

  private runFileOp(
    file: File,
    onProgress: (progress: ProgressUpdate) => void,
  ): Promise<OpOutcome> {
    const options = readPaneOptions(this.shell, this.op) as never;
    return this.runs.runFile(this.op, file, options, { onProgress });
  }

  private applyResult(
    result: { output: string | null; blob: Blob | null; stats: AnyStats },
    mode: RunMode,
  ): void {
    this.outputText = result.output;
    this.outputBlob = result.blob;
    this.hasOutput = true;
    this.input.markError(null);
    this.hideQueryError();

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

    if (this.op === 'jsonpath') {
      const jp = result as unknown as JsonPathResult;
      this.allText = jp.allOutput;
      this.allBlob = jp.allBlob;
      this.renderExamples(jp.keys ?? []);
      const downloadAll = this.shell.querySelector<HTMLElement>('[data-download-all]');
      if (downloadAll) downloadAll.hidden = jp.allOutput === null && jp.allBlob === null;
    }

    this.setStats(result.stats);
    this.setMetaText(this.metaFor(result.stats));

    const status = fill(this.currentDone(), {
      time: formatMilliseconds(result.stats.parseTimeMs, this.locale),
    });
    this.setStatus(status);
    this.announce(status);
    this.refreshButtons();

    if (mode === 'explicit' && this.maxWidthQuery) this.showView('output');
    if (mode === 'live' && this.mobileView === 'input') this.showOutputDot(true);
  }

  private metaFor(stats: AnyStats): string {
    switch (this.op) {
      case 'sort':
        return fill(this.strings.keysMeta, {
          count: formatInteger((stats as SortStats).sortedKeys, this.locale),
        });
      case 'escape':
        return fill(this.strings.replacementsMeta, {
          count: formatInteger((stats as EscapeStats).replacements, this.locale),
        });
      case 'jsonpath': {
        const path = stats as JsonPathStats;
        if (path.truncated) {
          return fill(this.strings.showingMatches, {
            shown: formatInteger(path.matches, this.locale),
            total: formatInteger(path.total, this.locale),
          });
        }
        return fill(this.strings.matchesMeta, {
          count: formatInteger(path.total, this.locale),
        });
      }
      case 'jsonToTypescript':
        return fill(this.strings.declarationsMeta, {
          count: formatInteger((stats as TypescriptStats).declarations, this.locale),
        });
    }
  }

  private showFailure(info: JsonError, mode: RunMode): void {
    if (this.op === 'jsonpath' && info.message.startsWith('Expression: ')) {
      const message = info.message.slice(12);
      const located =
        info.line > 0
          ? fill(this.strings.queryErrorAt, {
              message,
              line: info.line,
              column: info.column,
            })
          : message;
      this.showQueryFailure(located);
      return;
    }

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
    if (repair) {
      repair.hidden = !this.canRepair || this.largeMode || this.input.getLength() === 0;
    }
    this.input.markError(info.line > 0 && !this.largeMode ? info.line : null);

    this.setStatus(location ?? this.strings.error);
    this.announce(
      info.line > 0
        ? fill(this.strings.announceError, { line: info.line, column: info.column })
        : info.message,
    );

    if (mode === 'explicit' && this.maxWidthQuery) this.showView('output');
  }

  private showQueryFailure(message: string): void {
    this.resetOutput();
    this.resetStats();
    this.showQueryError(message);
    this.setStatus(this.strings.error);
    this.announce(message);
  }

  private showQueryError(message: string): void {
    const target = this.shell.querySelector<HTMLElement>('[data-query-error]');
    if (target) {
      target.textContent = message;
      target.hidden = false;
    }
    this.queryInput()?.setAttribute('aria-invalid', 'true');
  }

  private hideQueryError(): void {
    const target = this.shell.querySelector<HTMLElement>('[data-query-error]');
    if (target) {
      target.textContent = '';
      target.hidden = true;
    }
    this.queryInput()?.removeAttribute('aria-invalid');
  }

  private queryInput(): HTMLInputElement | null {
    return this.shell.querySelector<HTMLInputElement>('[data-option="expression"]');
  }

  private focusExpression(): void {
    this.queryInput()?.focus();
  }

  private fileTooBig(): JsonError {
    return failure(this.strings.fileTooBig, this.strings.chooseSmaller, 'runtime');
  }

  private initSelects(): void {
    for (const root of this.shell.querySelectorAll<HTMLElement>('[data-select]')) {
      const menu = createSelectMenu(root);
      if (root.dataset.option === 'indent' || !root.dataset.option) this.indentMenu = menu;
    }
  }

  private restoreIndent(): void {
    const menu = this.indentMenu;
    if (!menu) return;
    const stored = String(this.indent);
    const available = menu.root.querySelector(`[role="option"][data-value="${stored}"]`);
    menu.value = available ? stored : '2';
    this.indent = menu.value === 'tab' ? 'tab' : menu.value === '4' ? 4 : 2;
  }

  private changeIndent(): void {
    if (!this.indentMenu) return;
    const raw = this.indentMenu.value;
    this.indent = raw === 'tab' ? 'tab' : raw === '4' ? 4 : 2;
    writeIndent(this.indent);

    if (this.largeMode) {
      this.setStatus(this.largePrompt('loaded'));
      return;
    }

    const length = this.input.getLength();
    if (length === 0) return;
    if (length > LIVE_LIMIT) {
      this.setStatus(this.largePrompt('run'));
      return;
    }

    void this.run('live');
  }

  private onOptionsChanged(): void {
    if (this.op === 'escape') this.updateEscapeLabels();
    if (this.op === 'jsonpath') this.hideQueryError();

    if (this.largeMode) {
      this.setStatus(this.largePrompt('loaded'));
      return;
    }

    const length = this.input.getLength();
    if (length === 0) return;

    if (length > LIVE_LIMIT) {
      this.setStatus(this.largePrompt('run'));
      return;
    }

    if (this.op === 'jsonpath' && this.expression.length === 0) {
      this.cancelActive();
      this.resetOutput();
      this.resetStats();
      this.setStatus(this.strings.emptyExpression);
      return;
    }

    this.scheduleLive();
  }

  private updateEscapeLabels(): void {
    if (this.op !== 'escape') return;
    const options = readPaneOptions(this.shell, 'escape') as EscapeOptions;
    const label =
      options.mode === 'unescape' ? this.strings.unescapeLabel : this.strings.escapeLabel;
    const button = this.shell.querySelector<HTMLElement>('[data-action="escape"] span');
    if (button) button.textContent = label;
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
    this.revision += 1;
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
    if (!this.canRepair || this.largeMode || this.input.getLength() === 0) return;

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
    const downloadAll = this.shell.querySelector<HTMLElement>('[data-download-all]');
    if (downloadAll) downloadAll.hidden = true;
    this.allText = null;
    this.allBlob = null;
    this.clearMeta();
    this.hideQueryError();
    this.showOutputDot(false);
    this.refreshButtons();
  }

  private clearMeta(): void {
    const meta = this.shell.querySelector<HTMLElement>('[data-output-meta]');
    if (!meta) return;
    meta.textContent = '';
    meta.title = '';
    meta.hidden = true;
  }

  private setMetaText(text: string): void {
    const meta = this.shell.querySelector<HTMLElement>('[data-output-meta]');
    if (!meta) return;
    meta.hidden = false;
    meta.textContent = text;
    meta.title = text;
  }

  private resetStats(): void {
    for (const key of this.statKeys) {
      const stat = this.stat(key);
      if (stat) stat.textContent = '—';
    }
  }

  private setStats(stats: AnyStats): void {
    const size = this.stat('size');
    const time = this.stat('time');
    const output = this.stat('output');
    const lines = this.stat('lines');

    if (size) size.textContent = formatBytes(stats.bytes, this.locale);
    if (time) time.textContent = `${formatMilliseconds(stats.parseTimeMs, this.locale)} ms`;
    if (lines) lines.textContent = formatInteger(stats.lines, this.locale);
    if (output && 'outputBytes' in stats) {
      output.textContent = formatBytes(stats.outputBytes, this.locale);
    }

    if (this.op === 'sort') {
      const keys = this.stat('keys');
      if (keys) {
        keys.textContent = formatInteger((stats as SortStats).sortedKeys, this.locale);
      }
      return;
    }

    if (this.op === 'jsonpath') {
      const matches = this.stat('matches');
      if (matches) {
        matches.textContent = formatInteger((stats as JsonPathStats).matches, this.locale);
      }
      return;
    }

    if (this.op === 'jsonToTypescript') {
      const types = stats as TypescriptStats;
      const declarations = this.stat('declarations');
      const properties = this.stat('properties');
      if (declarations) {
        declarations.textContent = formatInteger(types.declarations, this.locale);
      }
      if (properties) {
        properties.textContent = formatInteger(types.properties, this.locale);
      }
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
    warning.textContent =
      this.op === 'escape'
        ? fill(this.strings.largeWarningTemplate, { action: this.actionLabel() })
        : fill(this.strings.largeWarning, {
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

    el<HTMLButtonElement>(this.shell, `[data-action="${this.op}"]`).disabled = running;
    el<HTMLButtonElement>(this.shell, `[data-action="${this.op}-large"]`).disabled = running;
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
    const info = paneOutput(this.op);
    const base = this.file?.name.replace(/\.[^./\\]+$/, '').trim();
    const name = base ? `${base}.${info.extension}` : this.defaultName();

    if (this.outputBlob) {
      downloadBlob(this.outputBlob, name);
    } else if (this.outputText !== null) {
      downloadBlob(new Blob([this.outputText], { type: info.mime }), name);
    }
  }

  private defaultName(): string {
    switch (this.op) {
      case 'sort':
        return 'sorted.json';
      case 'escape':
        return this.escapeMode() === 'unescape' ? 'unescaped.txt' : 'escaped.txt';
      case 'jsonpath':
        return 'matches.json';
      case 'jsonToTypescript':
        return 'types.ts';
    }
  }

  private escapeMode(): 'escape' | 'unescape' {
    const root = this.shell.querySelector<HTMLElement>('[data-option="mode"]');
    return root?.dataset.value === 'unescape' ? 'unescape' : 'escape';
  }

  private currentDone(): string {
    if (this.op !== 'escape') return this.strings.runDone;
    return this.escapeMode() === 'unescape'
      ? this.strings.unescapeDone
      : this.strings.escapeDone;
  }

  private actionLabel(): string {
    return this.escapeMode() === 'unescape' ? this.strings.unescapeLabel : this.strings.escapeLabel;
  }

  private largePrompt(kind: 'run' | 'loaded'): string {
    if (this.op !== 'escape') {
      return kind === 'run' ? this.strings.largeRun : this.strings.largeLoaded;
    }

    return fill(
      kind === 'run' ? this.strings.largeRunTemplate : this.strings.largeLoadedTemplate,
      { action: this.actionLabel() },
    );
  }

  private cancel(): void {
    if (!this.running) return;
    this.revision += 1;
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
    this.setStatus(progress.phase === 'reading' ? this.strings.reading : this.currentVerb());
  }

  private currentVerb(): string {
    if (this.op !== 'escape') return this.strings.runVerb;
    return this.escapeMode() === 'unescape'
      ? this.strings.unescapeVerb
      : this.strings.escapeVerb;
  }

  private renderExamples(keys: string[]): void {
    const container = this.shell.querySelector<HTMLElement>('[data-query-examples]');
    if (!container) return;
    if (keys.length === 0) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    const label = container.firstElementChild;
    container.replaceChildren(
      ...(label ? [label] : []),
      ...keys.map((key) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'rounded-[8px] border border-line bg-canvas px-2.5 py-1 font-mono text-[12px] text-body-mid hover:border-line-strong hover:text-ink';
        chip.dataset.example = `$.${key}`;
        chip.textContent = key;
        return chip;
      }),
    );
  }

  private downloadAll(): void {
    if (this.allBlob) {
      downloadBlob(this.allBlob, 'matches-all.json');
      return;
    }
    if (this.allText !== null) {
      downloadBlob(new Blob([this.allText], { type: 'application/json' }), 'matches-all.json');
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stopFullscreen?.();
    this.runs.dispose();
  }
}
