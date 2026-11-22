import { copyText } from '../../lib/clipboard';
import { downloadBlob } from '../../lib/download';
import { setupPageDropzone } from '../../lib/dropzone';
import type { EditorHandle } from '../../lib/editor';
import { InvalidFileError, readTextFile } from '../../lib/file-text';
import { formatBytes, formatInteger, formatMilliseconds } from '../../lib/format-bytes';
import { setupFullscreen } from '../../lib/fullscreen';
import { takeHandoff } from '../../lib/handoff';
import { failure } from '../../workers/protocol';
import type { JsonError, ProgressUpdate, SchemaIssue, SchemaResult } from '../../workers/protocol';
import { RunController } from '../../workers/run-controller';
import { MAX_FILE, PREVIEW_LIMIT } from '../limits';
import { failureText } from './failure';
import { fill, type BaseStrings } from './strings';
import { SCHEMA_DOCUMENT_SAMPLE, SCHEMA_SAMPLE } from './pane-samples';

export interface SchemaStrings extends BaseStrings {
  runLabel: string;
  validating: string;
  validTitle: string;
  invalidTitle: string;
  needBoth: string;
  schemaPane: string;
  documentPane: string;
  schemaPlaceholder: string;
  documentPlaceholder: string;
  schemaLabel: string;
  documentLabel: string;
  checks: string;
  errors: string;
  reportTitle: string;
  reportValid: string;
  reportInvalid: string;
  reportChecked: string;
  reportTime: string;
  reportErrors: string;
  reportProblems: string;
  reportUnsupported: string;
  parseSchema: string;
  parseDocument: string;
  parseGeneric: string;
  unsupportedHint: string;
  allSupported: string;
  noErrors: string;
  truncated: string;
  validDone: string;
  invalidDone: string;
  validAnnounce: string;
  invalidAnnounce: string;
}

type Side = 'schema' | 'document';

const ERROR_CAP = 300;

interface Options {
  shell: HTMLElement;
  strings: SchemaStrings;
  locale: string;
  schema: EditorHandle;
  document: EditorHandle;
  showView: (view: 'left' | 'right') => void;
}

function el<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing schema element: ${selector}`);
  return found;
}

/** Explicit validation for the two-pane JSON Schema tool. */
export class SchemaSession {
  private readonly shell: HTMLElement;
  private readonly strings: SchemaStrings;
  private readonly locale: string;
  private readonly schema: EditorHandle;
  private readonly document: EditorHandle;
  private readonly showView: (view: 'left' | 'right') => void;
  private readonly runs = new RunController();
  private readonly statKeys = ['schemaSize', 'documentSize', 'checked', 'errors', 'time'];
  private readonly largeFiles: Record<Side, File | null> = { schema: null, document: null };

  private reportText: string | null = null;
  private parseSide: Side | null = null;
  private lastError: JsonError | null = null;
  private activeSide: Side = 'schema';
  private running = false;
  private applying = false;
  private disposed = false;
  private loadId = 0;
  private revision = 0;
  private statusToken = 0;
  private stopFullscreen: (() => void) | null = null;

  constructor(options: Options) {
    this.shell = options.shell;
    this.strings = options.strings;
    this.locale = options.locale;
    this.schema = options.schema;
    this.document = options.document;
    this.showView = options.showView;
  }

  start(): void {
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.stopFullscreen = setupFullscreen(this.shell, this.strings, (message) => {
      this.flash(message);
      this.announce(message);
    });

    el<HTMLButtonElement>(this.shell, '[data-action="validateSchema"]').addEventListener(
      'click',
      () => void this.run(),
    );
    for (const action of ['schema-large', 'document-large']) {
      this.shell
        .querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
        ?.addEventListener('click', () => void this.run());
    }
    el<HTMLButtonElement>(this.shell, '[data-action="sample"]').addEventListener('click', () =>
      this.loadSample(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="clear"]').addEventListener('click', () =>
      this.clear(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').addEventListener('click', () =>
      this.cancel(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="copy"]').addEventListener('click', () =>
      void this.copyReport(),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="download"]').addEventListener('click', () =>
      this.downloadReport(),
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
    el<HTMLButtonElement>(this.shell, '[data-error-goto]').addEventListener('click', () =>
      this.gotoParseError(),
    );
    el<HTMLButtonElement>(this.shell, '[data-error-dismiss]').addEventListener('click', () =>
      this.dismissReport(),
    );

    for (const button of this.shell.querySelectorAll<HTMLButtonElement>('[data-open-side]')) {
      button.addEventListener('click', () => {
        const side = button.dataset.openSide === 'document' ? 'document' : 'schema';
        this.setActiveSide(side);
        el<HTMLInputElement>(this.shell, '[data-file-input]').click();
      });
    }

    for (const wrap of this.shell.querySelectorAll<HTMLElement>('[data-editor-wrap]')) {
      const side = wrap.dataset.editorWrap === 'right' ? 'document' : 'schema';
      wrap.addEventListener('focusin', () => this.setActiveSide(side));
    }

    setupPageDropzone(this.shell, (file, side) => {
      const target = side === 'right' ? 'document' : 'schema';
      this.setActiveSide(target);
      void this.loadFile(target, file);
    });

    const fileInput = el<HTMLInputElement>(this.shell, '[data-file-input]');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) void this.loadFile(this.activeSide, file);
    });

    const handoff = takeHandoff('json-schema-validator');
    if (handoff) {
      this.applying = true;
      this.document.setDoc(handoff);
      this.applying = false;
      this.activeSide = 'document';
      this.updateReadyStatus();
    }
  }

  inputChanged(side: Side): void {
    if (this.applying) return;

    this.largeFiles[side] = null;
    this.hideLargePanel(side);
    this.editor(side).setReadOnly(false);
    if (this.running) this.cancelActive();
    this.resetReport();
    this.resetStats();
    this.revision += 1;
    this.updateReadyStatus();
    this.refreshButtons();
  }

  async loadFile(side: Side, file: File): Promise<void> {
    const loadId = ++this.loadId;
    this.setActiveSide(side);

    if (file.size > MAX_FILE) {
      this.setStatus(this.strings.fileTooBig);
      this.announce(this.strings.fileTooBig);
      return;
    }

    if (file.size > PREVIEW_LIMIT) {
      this.largeFiles[side] = file;
      this.setLargePanel(side, file);
      this.applying = true;
      this.editor(side).setDoc('');
      this.applying = false;
      this.editor(side).setReadOnly(true);
      this.resetReport();
      this.resetStats();
      this.setStat(
        side === 'schema' ? 'schemaSize' : 'documentSize',
        formatBytes(file.size, this.locale),
      );
      this.setStatus(this.strings.largeLoaded);
      this.refreshButtons();
      return;
    }

    try {
      const text = await readTextFile(file);
      if (loadId !== this.loadId || this.disposed) return;

      if (text.trim().length === 0) {
        this.showParseFailure(
          failure(this.strings.emptyInput, this.strings.emptyInputHint, 'syntax'),
          side,
        );
        return;
      }

      this.largeFiles[side] = null;
      this.hideLargePanel(side);
      this.applying = true;
      this.editor(side).setDoc(text);
      this.applying = false;
      this.editor(side).setReadOnly(false);
      this.resetReport();
      this.resetStats();
      this.updateReadyStatus();
      this.refreshButtons();
    } catch (error) {
      if (loadId !== this.loadId || this.disposed) return;
      this.showParseFailure(
        error instanceof InvalidFileError
          ? failure(this.strings.invalidFile, this.strings.encodingHint, 'encoding')
          : failure(this.strings.readFailed, this.strings.tryAgain, 'runtime'),
        side,
      );
    }
  }

  copyForShortcut(): boolean {
    if (this.reportText === null) return false;
    void this.copyReport();
    return true;
  }

  runExplicit(): void {
    void this.run();
  }

  private editor(side: Side): EditorHandle {
    return side === 'schema' ? this.schema : this.document;
  }

  private hasContent(side: Side): boolean {
    return this.largeFiles[side] !== null || this.editor(side).getLength() > 0;
  }

  private ready(): boolean {
    return this.hasContent('schema') && this.hasContent('document');
  }

  private setActiveSide(side: Side): void {
    this.activeSide = side;
  }

  private async run(): Promise<void> {
    if (this.disposed) return;

    if (!this.hasContent('schema')) {
      this.needBoth('schema');
      return;
    }

    if (!this.hasContent('document')) {
      this.needBoth('document');
      return;
    }

    if (this.running) this.cancelActive();
    const revision = ++this.revision;
    this.setRunning(true);
    this.resetReport();
    this.setStatus(
      this.largeFiles.schema || this.largeFiles.document
        ? this.strings.reading
        : this.strings.validating,
    );

    let schemaText: string;
    let documentText: string;

    try {
      schemaText = await this.readSide('schema');
      documentText = await this.readSide('document');
    } catch (error) {
      if (this.disposed || revision !== this.revision) return;
      this.setRunning(false);
      this.showParseFailure(
        error instanceof InvalidFileError
          ? failure(this.strings.invalidFile, this.strings.encodingHint, 'encoding')
          : failure(this.strings.readFailed, this.strings.tryAgain, 'runtime'),
        null,
      );
      return;
    }

    if (this.disposed || revision !== this.revision) return;

    const outcome = await this.runs.run(
      'validateSchema',
      { schema: schemaText, document: documentText },
      {},
      { onProgress: (progress) => this.onProgress(progress) },
    );

    if (this.disposed || revision !== this.revision) return;

    this.setRunning(false);

    if (outcome.status === 'stale') return;

    if (outcome.status === 'failed') {
      const info = failureText(this.strings, outcome.failure);
      this.showParseFailure(info, this.sideFromMessage(info.message));
      return;
    }

    this.applyResult(outcome.result);
  }

  private async readSide(side: Side): Promise<string> {
    const file = this.largeFiles[side];
    if (file) return readTextFile(file);
    return this.editor(side).getDoc();
  }

  private sideFromMessage(message: string): Side | null {
    if (message.startsWith('Schema: ')) return 'schema';
    if (message.startsWith('Document: ')) return 'document';
    return null;
  }

  private applyResult(result: SchemaResult): void {
    this.parseSide = null;
    this.lastError = null;
    this.clearErrorMarks();
    this.setStats(result);

    const errors = result.errors;
    el<HTMLElement>(this.shell, '[data-parse-error]').hidden = true;
    el<HTMLElement>(this.shell, '[data-report-title]').textContent = result.valid
      ? this.strings.validTitle
      : this.strings.invalidTitle;
    el<HTMLElement>(this.shell, '[data-report-summary]').textContent = `${
      fill(this.strings.reportChecked, {
        count: formatInteger(result.stats.checked, this.locale),
      })
    } · ${fill(this.strings.reportTime, {
      time: formatMilliseconds(result.stats.timeMs, this.locale),
    })}`;

    this.renderIssues(errors);
    el<HTMLElement>(this.shell, '[data-report-errors]').hidden = errors.length === 0;
    el<HTMLElement>(this.shell, '[data-truncated]').hidden = errors.length < ERROR_CAP;

    this.renderMessages(result.schemaErrors);
    el<HTMLElement>(this.shell, '[data-report-problems]').hidden = result.schemaErrors.length === 0;

    this.renderUnsupported(result.unsupported);
    el<HTMLElement>(this.shell, '[data-report-unsupported]').hidden = false;

    this.reportText = this.buildReport(result);
    el<HTMLElement>(this.shell, '[data-report]').hidden = false;

    const status = result.valid
      ? fill(this.strings.validDone, {
          time: formatMilliseconds(result.stats.timeMs, this.locale),
        })
      : fill(this.strings.invalidDone, {
          count: formatInteger(errors.length + result.schemaErrors.length, this.locale),
          time: formatMilliseconds(result.stats.timeMs, this.locale),
        });
    this.setStatus(status);
    this.announce(
      result.valid
        ? fill(this.strings.validAnnounce, {
            checked: formatInteger(result.stats.checked, this.locale),
          })
        : fill(this.strings.invalidAnnounce, {
            count: formatInteger(errors.length + result.schemaErrors.length, this.locale),
          }),
    );
    this.refreshButtons();
    this.scrollToReport();
  }

  private renderIssues(issues: SchemaIssue[]): void {
    const list = el<HTMLElement>(this.shell, '[data-error-list]');
    list.replaceChildren(
      ...issues.map((issue) => {
        const row = document.createElement('li');
        row.className =
          'flex flex-col gap-1 rounded-[8px] border border-line bg-cream/40 p-2.5 sm:flex-row sm:items-baseline sm:gap-3';
        const path = document.createElement('code');
        path.className = 'shrink-0 font-mono text-[12px] leading-5 text-ink';
        path.textContent = issue.path;
        const message = document.createElement('span');
        message.className = 'text-[13px] leading-5 text-body';
        message.textContent = issue.message;
        row.append(path, message);
        return row;
      }),
    );
  }

  private renderMessages(messages: string[]): void {
    const list = el<HTMLElement>(this.shell, '[data-problem-list]');
    list.replaceChildren(
      ...messages.map((text) => {
        const row = document.createElement('li');
        row.className =
          'rounded-[8px] border border-line bg-cream/40 p-2.5 text-[13px] leading-5 text-body';
        row.textContent = text;
        return row;
      }),
    );
  }

  private renderUnsupported(keywords: string[]): void {
    const list = el<HTMLElement>(this.shell, '[data-unsupported-list]');
    const hint = el<HTMLElement>(this.shell, '[data-unsupported-hint]');
    const none = el<HTMLElement>(this.shell, '[data-unsupported-none]');
    hint.textContent = this.strings.unsupportedHint;
    none.hidden = keywords.length > 0;

    list.replaceChildren(
      ...keywords.map((keyword) => {
        const item = document.createElement('li');
        item.className =
          'rounded-full border border-line bg-cream px-2.5 py-1 font-mono text-[12px] leading-5 text-ink';
        item.textContent = keyword;
        return item;
      }),
    );
  }

  private buildReport(result: SchemaResult): string {
    const lines: string[] = [
      `${this.strings.reportTitle}: ${
        result.valid ? this.strings.reportValid : this.strings.reportInvalid
      }`,
      fill(this.strings.reportChecked, {
        count: formatInteger(result.stats.checked, this.locale),
      }),
      fill(this.strings.reportTime, {
        time: formatMilliseconds(result.stats.timeMs, this.locale),
      }),
      '',
    ];

    if (result.errors.length === 0) {
      lines.push(this.strings.noErrors);
    } else {
      lines.push(`${this.strings.reportErrors}:`);
      for (const issue of result.errors) lines.push(`${issue.path}: ${issue.message}`);
    }

    if (result.schemaErrors.length > 0) {
      lines.push('', `${this.strings.reportProblems}:`);
      for (const problem of result.schemaErrors) lines.push(problem);
    }

    if (result.unsupported.length > 0) {
      lines.push('', `${this.strings.reportUnsupported}: ${result.unsupported.join(', ')}`);
    }

    return lines.join('\n');
  }

  private showParseFailure(info: JsonError, side: Side | null): void {
    this.parseSide = side;
    this.lastError = info;
    this.clearErrorMarks();

    const prefix = side === 'schema' ? 'Schema: ' : side === 'document' ? 'Document: ' : '';
    const message = prefix && info.message.startsWith(prefix)
      ? info.message.slice(prefix.length)
      : info.message;
    const location =
      info.line > 0
        ? fill(this.strings.errorAt, { line: info.line, column: info.column })
        : '';

    el<HTMLElement>(this.shell, '[data-report]').hidden = false;
    el<HTMLElement>(this.shell, '[data-report-title]').textContent = this.strings.error;
    el<HTMLElement>(this.shell, '[data-report-summary]').textContent = location;
    el<HTMLElement>(this.shell, '[data-report-errors]').hidden = true;
    el<HTMLElement>(this.shell, '[data-report-problems]').hidden = true;
    el<HTMLElement>(this.shell, '[data-report-unsupported]').hidden = true;
    el<HTMLElement>(this.shell, '[data-parse-error]').hidden = false;
    el<HTMLElement>(this.shell, '[data-parse-title]').textContent =
      side === 'schema'
        ? this.strings.parseSchema
        : side === 'document'
          ? this.strings.parseDocument
          : this.strings.parseGeneric;
    el<HTMLElement>(this.shell, '[data-error-message]').textContent = message;
    el<HTMLElement>(this.shell, '[data-error-hint]').textContent = info.hint;
    const locationEl = el<HTMLElement>(this.shell, '[data-error-location]');
    locationEl.hidden = location.length === 0;
    locationEl.textContent = location;
    el<HTMLElement>(this.shell, '[data-error-goto]').hidden = side === null || info.line < 1;

    if (side !== null && info.line > 0) this.editor(side).markError(info.line);

    this.reportText = `${info.message}\n${info.hint}`.trim();
    this.setStatus(location || this.strings.error);
    this.announce(
      info.line > 0
        ? fill(this.strings.announceError, { line: info.line, column: info.column })
        : info.message,
    );
    this.refreshButtons();
    this.scrollToReport();
  }

  private needBoth(empty: Side): void {
    this.setActiveSide(empty);
    this.editor(empty).focus();
    this.setStatus(this.strings.needBoth);
    this.announce(this.strings.needBoth);
  }

  private gotoParseError(): void {
    const info = this.lastError;
    const side = this.parseSide;
    if (!info || !side || info.line < 1) return;
    this.showView(side === 'schema' ? 'left' : 'right');
    this.editor(side).gotoLine(info.line, info.column);
  }

  private dismissReport(): void {
    this.resetReport();
    this.updateReadyStatus();
    this.refreshButtons();
  }

  private loadSample(): void {
    this.cancelActive();
    this.loadId += 1;
    this.largeFiles.schema = null;
    this.largeFiles.document = null;
    this.hideLargePanel('schema');
    this.hideLargePanel('document');
    this.schema.setReadOnly(false);
    this.document.setReadOnly(false);
    this.applying = true;
    this.schema.setDoc(SCHEMA_SAMPLE);
    this.document.setDoc(SCHEMA_DOCUMENT_SAMPLE);
    this.applying = false;
    this.resetReport();
    this.resetStats();
    this.setStatus(this.strings.ready);
    this.refreshButtons();
    void this.run();
  }

  private clear(): void {
    this.cancelActive();
    this.loadId += 1;
    this.largeFiles.schema = null;
    this.largeFiles.document = null;
    this.hideLargePanel('schema');
    this.hideLargePanel('document');
    this.schema.setReadOnly(false);
    this.document.setReadOnly(false);
    this.applying = true;
    this.schema.setDoc('');
    this.document.setDoc('');
    this.applying = false;
    this.resetReport();
    this.resetStats();
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.schema.focus();
  }

  private async paste(): Promise<void> {
    try {
      if (!navigator.clipboard?.readText) throw new Error('Clipboard unavailable');
      const text = await navigator.clipboard.readText();
      if (text.length === 0) {
        this.editor(this.activeSide).focus();
        return;
      }
      this.largeFiles[this.activeSide] = null;
      this.hideLargePanel(this.activeSide);
      this.applying = true;
      this.editor(this.activeSide).setReadOnly(false);
      this.editor(this.activeSide).setDoc(text);
      this.applying = false;
      this.resetReport();
      this.resetStats();
      this.updateReadyStatus();
      this.refreshButtons();
      this.editor(this.activeSide).focus();
    } catch {
      this.flash(this.strings.pasteUnavailable);
      this.announce(this.strings.pasteUnavailable);
      this.editor(this.activeSide).focus();
    }
  }

  private updateReadyStatus(): void {
    this.setStatus(this.ready() ? this.strings.ready : this.strings.waiting);
  }

  private async copyReport(): Promise<void> {
    const text = this.reportText;
    if (text === null) return;
    const ok = await copyText(text);
    if (this.disposed) return;
    const message = ok ? this.strings.copied : this.strings.copyFailed;
    this.flash(message);
    this.announce(message);
  }

  private downloadReport(): void {
    const text = this.reportText;
    if (text === null) return;
    downloadBlob(new Blob([text], { type: 'text/plain' }), 'schema-report.txt');
  }

  private resetReport(): void {
    this.reportText = null;
    this.parseSide = null;
    this.lastError = null;
    this.clearErrorMarks();
    el<HTMLElement>(this.shell, '[data-report]').hidden = true;
    el<HTMLElement>(this.shell, '[data-parse-error]').hidden = true;
    el<HTMLElement>(this.shell, '[data-report-errors]').hidden = true;
    el<HTMLElement>(this.shell, '[data-report-problems]').hidden = true;
    el<HTMLElement>(this.shell, '[data-report-unsupported]').hidden = true;
    el<HTMLElement>(this.shell, '[data-error-list]').replaceChildren();
    el<HTMLElement>(this.shell, '[data-problem-list]').replaceChildren();
    el<HTMLElement>(this.shell, '[data-unsupported-list]').replaceChildren();
    this.refreshButtons();
  }

  private clearErrorMarks(): void {
    this.schema.markError(null);
    this.document.markError(null);
  }

  private resetStats(): void {
    for (const key of this.statKeys) {
      const stat = this.shell.querySelector<HTMLElement>(`[data-stat="${key}"]`);
      if (stat) stat.textContent = '—';
    }
  }

  private setStats(result: SchemaResult): void {
    this.setStat('schemaSize', formatBytes(result.stats.schemaBytes, this.locale));
    this.setStat('documentSize', formatBytes(result.stats.documentBytes, this.locale));
    this.setStat('checked', formatInteger(result.stats.checked, this.locale));
    this.setStat(
      'errors',
      formatInteger(result.errors.length + result.schemaErrors.length, this.locale),
    );
    this.setStat('time', `${formatMilliseconds(result.stats.timeMs, this.locale)} ms`);
  }

  private setStat(key: string, text: string): void {
    const stat = this.shell.querySelector<HTMLElement>(`[data-stat="${key}"]`);
    if (stat) stat.textContent = text;
  }

  private setLargePanel(side: Side, file: File): void {
    const wrap = this.shell.querySelector<HTMLElement>(
      `[data-editor-wrap="${side === 'schema' ? 'left' : 'right'}"]`,
    );
    if (!wrap) return;
    el<HTMLElement>(wrap, '[data-large-input]').hidden = false;
    el<HTMLElement>(wrap, '[data-large-name]').textContent = file.name;
    el<HTMLElement>(wrap, '[data-large-meta]').textContent = formatBytes(
      file.size,
      this.locale,
    );
    const warning = el<HTMLElement>(wrap, '[data-large-warning]');
    warning.hidden = file.size <= 50 * 1024 * 1024;
    warning.textContent = fill(this.strings.largeWarning, {
      size: formatBytes(file.size, this.locale),
    });
  }

  private hideLargePanel(side: Side): void {
    const wrap = this.shell.querySelector<HTMLElement>(
      `[data-editor-wrap="${side === 'schema' ? 'left' : 'right'}"]`,
    );
    wrap?.querySelector<HTMLElement>('[data-large-input]')?.setAttribute('hidden', '');
  }

  private setRunning(running: boolean): void {
    this.running = running;
    const frame = el<HTMLElement>(this.shell, '[data-tool-frame]');
    if (running) frame.setAttribute('aria-busy', 'true');
    else frame.removeAttribute('aria-busy');

    el<HTMLButtonElement>(this.shell, '[data-action="validateSchema"]').disabled = running;
    for (const action of ['schema-large', 'document-large']) {
      const button = this.shell.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
      if (button) button.disabled = running;
    }
    const cancel = el<HTMLButtonElement>(this.shell, '[data-action="cancel"]');
    cancel.hidden = !running;
    this.refreshButtons();
  }

  private refreshButtons(): void {
    const ready = this.ready();
    if (!this.running) {
      el<HTMLButtonElement>(this.shell, '[data-action="validateSchema"]').disabled = !ready;
      for (const action of ['schema-large', 'document-large']) {
        const button = this.shell.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
        if (button) button.disabled = !ready;
      }
    }
    el<HTMLButtonElement>(this.shell, '[data-action="copy"]').disabled =
      this.reportText === null;
    el<HTMLButtonElement>(this.shell, '[data-action="download"]').disabled =
      this.reportText === null;
    el<HTMLButtonElement>(this.shell, '[data-action="clear"]').disabled =
      !this.hasContent('schema') &&
      !this.hasContent('document') &&
      this.reportText === null;
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
      this.updateReadyStatus();
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
    const target = this.document.hasFocus()
      ? this.document
      : this.schema.hasFocus()
        ? this.schema
        : this.schema;
    target.openFind();
  }

  private onProgress(progress: ProgressUpdate): void {
    this.setStatus(
      progress.phase === 'reading' ? this.strings.reading : this.strings.validating,
    );
  }

  private cancel(): void {
    if (!this.running) return;
    this.cancelActive();
    this.setStatus(this.strings.cancelled);
    this.announce(this.strings.cancelled);
  }

  private cancelActive(): void {
    this.revision += 1;
    this.runs.cancel();
    this.setRunning(false);
  }

  private scrollToReport(): void {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    const report = this.shell.querySelector<HTMLElement>('[data-report]');
    if (!report || report.hidden) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    report.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }

  dispose(): void {
    this.disposed = true;
    this.stopFullscreen?.();
    this.runs.dispose();
  }
}
