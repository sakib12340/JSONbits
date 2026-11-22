import { copyText } from '../../lib/clipboard';
import { downloadBlob } from '../../lib/download';
import type { EditorHandle } from '../../lib/editor';
import { InvalidFileError, readTextFile } from '../../lib/file-text';
import { formatBytes, formatInteger, formatMilliseconds } from '../../lib/format-bytes';
import { setupFullscreen } from '../../lib/fullscreen';
import { failure } from '../../workers/protocol';
import type { JwtDecodeResult, JsonError, JwtWarningCode, ProgressUpdate } from '../../workers/protocol';
import { RunController } from '../../workers/run-controller';
import { LIVE_LIMIT, MAX_FILE, PREVIEW_LIMIT } from '../limits';
import { failureText } from '../shared/failure';
import { fill, type BaseStrings } from '../shared/strings';

export interface JwtStrings extends BaseStrings {
  decoding: string;
  done: string;
  meta: string;
  placeholder: string;
  outputPlaceholder: string;
  warningAlgNone: string;
  warningMissingSignature: string;
  warningExpired: string;
  claimLabels: Record<string, string>;
  notPresent: string;
  utc: string;
  local: string;
  expiresIn: string;
  expiredAgo: string;
  issuedAgo: string;
  inputLabel: string;
  outputLabel: string;
}

type RunMode = 'live' | 'explicit';

interface Options {
  shell: HTMLElement;
  strings: JwtStrings;
  locale: string;
  input: EditorHandle;
  output: EditorHandle;
  sample: string;
  showView: (view: 'input' | 'output') => void;
}

const TIME_KEYS = ['exp', 'iat', 'nbf'] as const;
const TEXT_KEYS = ['iss', 'sub', 'aud'] as const;
const HEADER_KEYS = ['alg', 'typ', 'kid'] as const;

function el<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing tool element: ${selector}`);
  return found;
}

export class JwtSession {
  private readonly shell: HTMLElement;
  private readonly strings: JwtStrings;
  private readonly locale: string;
  private readonly input: EditorHandle;
  private readonly output: EditorHandle;
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
  private statusToken = 0;
  private lastError: JsonError | null = null;
  private stopFullscreen: (() => void) | null = null;

  constructor(options: Options) {
    this.shell = options.shell;
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

    el<HTMLButtonElement>(this.shell, '[data-action="jwtDecode"]').addEventListener('click', () =>
      void this.run('explicit'),
    );
    el<HTMLButtonElement>(this.shell, '[data-action="jwtDecode-large"]').addEventListener('click', () =>
      void this.run('explicit'),
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
      this.showFailure(this.fileTooBig());
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
      if (loadId !== this.loadId || this.disposed) return;
      this.setInputText(text, false);
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

  private async run(mode: RunMode): Promise<void> {
    if (this.disposed) return;
    if (this.largeMode && this.file) {
      await this.runFile();
      return;
    }
    const text = this.input.getDoc();
    if (text.trim().length === 0) {
      if (mode === 'explicit') {
        this.showFailure(failure(this.strings.emptyInput, this.strings.emptyInputHint, 'syntax'));
      } else {
        this.resetIdle();
      }
      return;
    }
    this.stopDebounce();
    this.cancelActive();
    this.setRunning(true);
    this.hideError();
    const outcome = await this.runs.run('jwtDecode', { text }, {}, {
      onProgress: (progress) => this.onProgress(progress),
    });
    if (this.disposed || outcome.status === 'stale') return;
    this.setRunning(false);
    if (outcome.status === 'failed') {
      this.showFailure(failureText(this.strings, outcome.failure));
      return;
    }
    this.applyResult(outcome.result);
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
    const outcome = await this.runs.runFile('jwtDecode', file, {}, {
      onProgress: (progress) => this.onProgress(progress),
    });
    if (this.disposed || outcome.status === 'stale') return;
    this.setRunning(false);
    if (outcome.status === 'failed') {
      this.showFailure(failureText(this.strings, outcome.failure));
      return;
    }
    this.applyResult(outcome.result);
  }

  private applyResult(result: JwtDecodeResult): void {
    this.outputText = JSON.stringify({ header: result.header, payload: result.payload }, null, 2);
    this.output.setDoc(this.outputText);
    this.input.markError(null);
    this.hideError();
    this.renderClaims(result);
    this.renderWarnings(result.warnings);

    const size = el<HTMLElement>(this.shell, '[data-stat="size"]');
    if (size) size.textContent = formatBytes(result.stats.bytes, this.locale);
    const claims = el<HTMLElement>(this.shell, '[data-stat="claims"]');
    if (claims) {
      claims.textContent = formatInteger(
        Object.keys(result.header).length + Object.keys(result.payload).length,
        this.locale,
      );
    }
    const time = el<HTMLElement>(this.shell, '[data-stat="time"]');
    if (time) time.textContent = `${formatMilliseconds(result.stats.timeMs, this.locale)} ms`;
    this.setMetaText(
      fill(this.strings.meta, {
        count: formatInteger(Object.keys(result.payload).length, this.locale),
      }),
    );
    const status = fill(this.strings.done, {
      time: formatMilliseconds(result.stats.timeMs, this.locale),
    });
    this.setStatus(status);
    this.announce(status);
    this.refreshButtons();
    if (this.maxWidthQuery) this.showView('output');
  }

  private renderClaims(result: JwtDecodeResult): void {
    const host = el<HTMLElement>(this.shell, '[data-jwt-claims]');
    const list = document.createElement('dl');
    list.className = 'grid grid-cols-[minmax(92px,auto)_1fr] gap-x-3 gap-y-1.5';

    const add = (label: string, value: string, detail?: string, warn = false): void => {
      const term = document.createElement('dt');
      term.className = 'font-semibold text-body-mid';
      term.textContent = label;
      const desc = document.createElement('dd');
      desc.className = warn ? 'min-w-0 break-words text-danger' : 'min-w-0 break-words text-ink';
      desc.textContent = detail ? `${value} · ${detail}` : value;
      list.append(term, desc);
    };

    for (const key of TIME_KEYS) {
      const raw = result.payload[key];
      const label = this.strings.claimLabels[key];
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        add(label, this.strings.notPresent);
        continue;
      }
      const date = new Date(raw * 1000);
      const utc = `${this.strings.utc}: ${date.toISOString()}`;
      const local = `${this.strings.local}: ${date.toLocaleString(this.locale)}`;
      const relative = this.relative(raw, key);
      add(label, String(raw), [utc, local, relative].join(' · '), key === 'exp' && raw * 1000 < Date.now());
    }
    for (const key of TEXT_KEYS) {
      const raw = result.payload[key];
      add(this.strings.claimLabels[key], raw === undefined ? this.strings.notPresent : String(raw));
    }
    for (const key of HEADER_KEYS) {
      const raw = result.header[key];
      add(this.strings.claimLabels[key], raw === undefined ? this.strings.notPresent : String(raw));
    }
    host.replaceChildren(list);
    host.hidden = false;
  }

  private relative(epoch: number, key: 'exp' | 'iat' | 'nbf'): string {
    const seconds = epoch - Math.floor(Date.now() / 1000);
    const abs = Math.abs(seconds);
    const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] =
      abs < 60 ? [seconds, 'second']
      : abs < 3600 ? [Math.round(seconds / 60), 'minute']
      : abs < 86400 ? [Math.round(seconds / 3600), 'hour']
      : abs < 2_592_000 ? [Math.round(seconds / 86400), 'day']
      : abs < 31_536_000 ? [Math.round(seconds / 2_592_000), 'month']
      : [Math.round(seconds / 31_536_000), 'year'];
    const formatted = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' }).format(amount, unit);
    const template = key === 'exp'
      ? seconds >= 0 ? this.strings.expiresIn : this.strings.expiredAgo
      : this.strings.issuedAgo;
    return fill(template, { time: formatted });
  }

  private renderWarnings(warnings: JwtWarningCode[]): void {
    const host = el<HTMLElement>(this.shell, '[data-jwt-warnings]');
    const text = {
      algNone: this.strings.warningAlgNone,
      missingSignature: this.strings.warningMissingSignature,
      expired: this.strings.warningExpired,
    };
    host.replaceChildren(
      ...warnings.map((code) => {
        const line = document.createElement('p');
        line.textContent = text[code];
        return line;
      }),
    );
    host.hidden = warnings.length === 0;
  }

  private showFailure(info: JsonError): void {
    this.lastError = info;
    this.outputText = null;
    this.output.setDoc('');
    el<HTMLElement>(this.shell, '[data-jwt-claims]').hidden = true;
    this.renderWarnings([]);
    el<HTMLElement>(this.shell, '[data-error-panel]').hidden = false;
    el<HTMLElement>(this.shell, '[data-error-message]').textContent = info.message;
    el<HTMLElement>(this.shell, '[data-error-hint]').textContent = info.hint;
    el<HTMLElement>(this.shell, '[data-error-location]').hidden = true;
    el<HTMLElement>(this.shell, '[data-error-snippet]').hidden = true;
    el<HTMLElement>(this.shell, '[data-error-goto]').hidden = true;
    this.setStatus(info.message);
    this.announce(info.message);
    this.refreshButtons();
  }

  private fileTooBig(): JsonError {
    return failure(this.strings.fileTooBig, this.strings.chooseSmaller, 'runtime');
  }

  private resetIdle(): void {
    this.stopDebounce();
    this.cancelActive();
    this.resetOutput();
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
  }

  private resetOutput(): void {
    this.outputText = null;
    this.output.setDoc('');
    this.input.markError(null);
    el<HTMLElement>(this.shell, '[data-error-panel]').hidden = true;
    el<HTMLElement>(this.shell, '[data-jwt-warnings]').hidden = true;
    const claims = el<HTMLElement>(this.shell, '[data-jwt-claims]');
    claims.hidden = true;
    claims.replaceChildren();
    for (const key of ['size', 'claims', 'time']) {
      const stat = this.shell.querySelector<HTMLElement>(`[data-stat="${key}"]`);
      if (stat) stat.textContent = '—';
    }
    this.clearMeta();
    this.showOutputDot(false);
    this.refreshButtons();
  }

  private clearMeta(): void {
    const meta = this.shell.querySelector<HTMLElement>('[data-output-meta]');
    if (meta) {
      meta.textContent = '';
      meta.title = '';
      meta.hidden = true;
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

  private setFile(name: string | null): void {
    const chip = el<HTMLElement>(this.shell, '[data-file-chip]');
    chip.hidden = name === null;
    if (name !== null) {
      const label = el<HTMLElement>(chip, '[data-file-name]');
      label.textContent = name;
      label.title = name;
    }
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
    this.hideError();
    this.setStatus(this.strings.waiting);
    this.refreshButtons();
    this.input.focus();
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

  private setRunning(running: boolean): void {
    this.running = running;
    const frame = el<HTMLElement>(this.shell, '[data-tool-frame]');
    if (running) frame.setAttribute('aria-busy', 'true');
    else frame.removeAttribute('aria-busy');
    el<HTMLButtonElement>(this.shell, '[data-action="jwtDecode"]').disabled = running;
    el<HTMLButtonElement>(this.shell, '[data-action="jwtDecode-large"]').disabled = running;
    el<HTMLButtonElement>(this.shell, '[data-action="cancel"]').hidden = !running;
    this.refreshButtons();
  }

  private refreshButtons(): void {
    el<HTMLButtonElement>(this.shell, '[data-action="copy"]').disabled = this.outputText === null;
    el<HTMLButtonElement>(this.shell, '[data-action="download"]').disabled = this.outputText === null;
    el<HTMLButtonElement>(this.shell, '[data-action="clear"]').disabled =
      this.input.getLength() === 0 && !this.file && this.outputText === null;
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

  private showOutputDot(visible: boolean): void {
    el<HTMLElement>(this.shell, '[data-output-dot]').hidden = !visible;
  }

  private openFind(): void {
    const target = this.output.hasFocus() ? this.output : this.input;
    target.openFind();
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
    downloadBlob(new Blob([this.outputText], { type: 'application/json' }), 'decoded-jwt.json');
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
    this.setStatus(progress.phase === 'reading' ? this.strings.reading : this.strings.decoding);
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
