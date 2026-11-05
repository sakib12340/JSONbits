import type { EditorHandle } from '../../lib/editor';
import { createSelectMenu, type SelectMenu } from '../../lib/select-menu';
import { formatBytes, formatInteger, formatMilliseconds } from '../../lib/format-bytes';
import type { FormatResult, FormatStats, JsonError } from '../../workers/protocol';
import type { ToolStrings } from './strings';

interface Ui {
  frame: HTMLElement;
  status: HTMLElement;
  live: HTMLElement;
  engineNote: HTMLElement;
  statSize: HTMLElement;
  statLines: HTMLElement;
  statDepth: HTMLElement;
  statTime: HTMLElement;
  errorPanel: HTMLElement;
  errorMessage: HTMLElement;
  errorLocation: HTMLElement;
  errorHint: HTMLElement;
  errorSnippet: HTMLElement;
  errorSnippetCode: HTMLElement;
  errorGoto: HTMLButtonElement;
  errorDismiss: HTMLButtonElement;
  largeInput: HTMLElement;
  largeName: HTMLElement;
  largeMeta: HTMLElement;
  largeWarning: HTMLElement;
  largeOutput: HTMLElement;
  largeSize: HTMLElement;
  fileChip: HTMLElement;
  fileName: HTMLElement;
  outputMeta: HTMLElement;
  outputDot: HTMLElement;
  format: HTMLButtonElement;
  formatLarge: HTMLButtonElement;
  copy: HTMLButtonElement;
  download: HTMLButtonElement;
  downloadLarge: HTMLButtonElement;
  clear: HTMLButtonElement;
  cancel: HTMLButtonElement;
  sample: HTMLButtonElement;
  paste: HTMLButtonElement;
  open: HTMLButtonElement;
  find: HTMLButtonElement;
  fileInput: HTMLInputElement;
  indent: SelectMenu;
}

function el<T extends Element>(root: HTMLElement, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing tool element: ${selector}`);
  return found;
}

export class ToolView {
  readonly ui: Ui;
  private readonly strings: ToolStrings;
  private readonly locale: string;
  private readonly input: EditorHandle;
  private readonly output: EditorHandle;
  private readonly shell: HTMLElement;
  private statusToken = 0;

  constructor(
    shell: HTMLElement,
    strings: ToolStrings,
    locale: string,
    input: EditorHandle,
    output: EditorHandle,
  ) {
    this.shell = shell;
    this.strings = strings;
    this.locale = locale;
    this.input = input;
    this.output = output;

    const snippet = el<HTMLElement>(shell, '[data-error-snippet]');

    this.ui = {
      frame: el(shell, '[data-tool-frame]'),
      status: el(shell, '[data-status]'),
      live: el(shell, '[data-live]'),
      engineNote: el(shell, '[data-engine-note]'),
      statSize: el(shell, '[data-stat="size"]'),
      statLines: el(shell, '[data-stat="lines"]'),
      statDepth: el(shell, '[data-stat="depth"]'),
      statTime: el(shell, '[data-stat="time"]'),
      errorPanel: el(shell, '[data-error-panel]'),
      errorMessage: el(shell, '[data-error-message]'),
      errorLocation: el(shell, '[data-error-location]'),
      errorHint: el(shell, '[data-error-hint]'),
      errorSnippet: snippet,
      errorSnippetCode: el(snippet, 'code'),
      errorGoto: el(shell, '[data-error-goto]'),
      errorDismiss: el(shell, '[data-error-dismiss]'),
      largeInput: el(shell, '[data-large-input]'),
      largeName: el(shell, '[data-large-name]'),
      largeMeta: el(shell, '[data-large-meta]'),
      largeWarning: el(shell, '[data-large-warning]'),
      largeOutput: el(shell, '[data-large-output]'),
      largeSize: el(shell, '[data-large-size]'),
      fileChip: el(shell, '[data-file-chip]'),
      fileName: el(shell, '[data-file-name]'),
      outputMeta: el(shell, '[data-output-meta]'),
      outputDot: el(shell, '[data-output-dot]'),
      format: el(shell, '[data-action="format"]'),
      formatLarge: el(shell, '[data-action="format-large"]'),
      copy: el(shell, '[data-action="copy"]'),
      download: el(shell, '[data-action="download"]'),
      downloadLarge: el(shell, '[data-action="download-large"]'),
      clear: el(shell, '[data-action="clear"]'),
      cancel: el(shell, '[data-action="cancel"]'),
      sample: el(shell, '[data-action="sample"]'),
      paste: el(shell, '[data-action="paste"]'),
      open: el(shell, '[data-action="open"]'),
      find: el(shell, '[data-action="find"]'),
      fileInput: el(shell, '[data-file-input]'),
      indent: createSelectMenu(el(shell, '[data-select]')),
    };
  }

  setStatus(text: string): void {
    this.statusToken += 1;
    this.ui.status.textContent = text;
  }

  openFind(): void {
    const target = this.output.hasFocus() ? this.output : this.input;
    target.openFind();
  }

  flash(text: string): void {
    this.setStatus(text);
    const token = this.statusToken;
    window.setTimeout(() => {
      if (token !== this.statusToken) return;
      this.setStatus(this.input.getLength() > 0 ? this.strings.ready : this.strings.waiting);
    }, 1800);
  }

  announce(text: string): void {
    this.ui.live.textContent = '';
    window.requestAnimationFrame(() => {
      this.ui.live.textContent = text;
    });
  }

  setRunning(running: boolean): void {
    if (running) {
      this.ui.frame.setAttribute('aria-busy', 'true');
    } else {
      this.ui.frame.removeAttribute('aria-busy');
    }

    this.ui.format.disabled = running;
    this.ui.formatLarge.disabled = running;
    this.ui.cancel.hidden = !running;
  }

  updateButtons(hasOutput: boolean, hasFile: boolean): void {
    this.ui.copy.disabled = !this.outputTextAvailable;
    this.ui.download.disabled = !hasOutput;
    this.ui.downloadLarge.disabled = !hasOutput;
    this.ui.clear.disabled = this.input.getLength() === 0 && !hasFile && !hasOutput;
    this.ui.cancel.hidden = !this.ui.frame.hasAttribute('aria-busy');
  }

  private outputTextAvailable = false;

  setOutputTextAvailable(available: boolean): void {
    this.outputTextAvailable = available;
  }

  setStats(stats: FormatStats | null): void {
    if (!stats) {
      this.ui.statSize.textContent = '—';
      this.ui.statLines.textContent = '—';
      this.ui.statDepth.textContent = '—';
      this.ui.statTime.textContent = '—';
      return;
    }

    this.ui.statSize.textContent = formatBytes(stats.bytes, this.locale);
    this.ui.statLines.textContent = formatInteger(stats.lines, this.locale);
    this.ui.statDepth.textContent = formatInteger(stats.depth, this.locale);
    this.ui.statTime.textContent = `${formatMilliseconds(stats.parseTimeMs, this.locale)} ms`;
  }

  showResult(result: FormatResult): void {
    this.ui.errorPanel.hidden = true;
    this.ui.outputMeta.textContent = this.strings.ready;

    if (result.blob) {
      this.output.setDoc('');
      this.ui.largeOutput.hidden = false;
      this.ui.largeSize.textContent = formatBytes(result.blob.size, this.locale);
    } else {
      this.output.setDoc(result.output ?? '');
      this.ui.largeOutput.hidden = true;
    }

    this.setStats(result.stats);
  }

  clearOutput(): void {
    this.output.setDoc('');
    this.ui.largeOutput.hidden = true;
    this.ui.errorPanel.hidden = true;
    this.ui.outputMeta.textContent = '';
    this.ui.outputDot.hidden = true;
  }

  showError(info: JsonError, snippet: string | null, location: string | null): void {
    this.ui.errorPanel.hidden = false;
    this.ui.errorPanel.scrollTop = 0;
    this.ui.errorMessage.textContent = info.message;
    this.ui.errorHint.textContent = info.hint;
    this.ui.errorLocation.hidden = location === null;
    this.ui.errorLocation.textContent = location ?? '';
    this.ui.errorSnippet.hidden = snippet === null;
    this.ui.errorSnippetCode.textContent = snippet ?? '';
    this.ui.errorGoto.hidden =
      info.line < 1 || this.input.getLength() === 0 || !this.ui.largeInput.hidden;
  }

  hideError(): void {
    this.ui.errorPanel.hidden = true;
  }

  setFile(name: string | null): void {
    this.ui.fileChip.hidden = name === null;
    if (name !== null) {
      this.ui.fileName.textContent = name;
      this.ui.fileName.title = name;
    }
  }

  setLargeInput(file: File, warning: string | null): void {
    this.ui.largeInput.hidden = false;
    this.ui.largeName.textContent = file.name;
    this.ui.largeMeta.textContent = formatBytes(file.size, this.locale);
    this.ui.largeWarning.hidden = warning === null;
    this.ui.largeWarning.textContent = warning ?? '';
    this.ui.statSize.textContent = formatBytes(file.size, this.locale);
  }

  hideLargeInput(): void {
    this.ui.largeInput.hidden = true;
  }

  showEngineNote(text: string): void {
    this.ui.engineNote.hidden = false;
    this.ui.engineNote.textContent = text;
  }

  hideEngineNote(): void {
    this.ui.engineNote.hidden = true;
  }

  setOutputDot(visible: boolean): void {
    this.ui.outputDot.hidden = !visible;
  }

  syncIndent(value: string): void {
    this.ui.indent.value = value;
  }

  get maxWidthQuery(): boolean {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  get mobileView(): string | undefined {
    return this.shell.dataset.mobileView;
  }
}
