import { hasFiles } from './file-text';
import { t } from '../i18n/t';
import type { Locale } from '../i18n/config';

let overlay: HTMLElement | null = null;
let locale: Locale = 'en';
let handler: ((file: File, side?: string) => void) | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let wired = false;

function iconSvg(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="size-7 text-primary" aria-hidden="true" focusable="false"><path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5"/></svg>';
}

function ensureOverlay(): HTMLElement {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.setAttribute('data-drop-overlay', '');
  overlay.className =
    'pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-canvas/95 p-4';
  overlay.hidden = true;
  overlay.innerHTML = `<div class="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-line-strong"><div class="grid place-items-center">${iconSvg()}</div><p class="text-[16px] font-semibold text-ink">${t(locale, 'tool.drop')}</p><p class="text-[13px] text-body-mid">${t(locale, 'tool.dropHint')}</p></div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function showOverlay(): void {
  const node = ensureOverlay();
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  node.hidden = false;
}

function hideOverlay(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (overlay) overlay.hidden = true;
}

function sideFromTarget(target: EventTarget | null): string | undefined {
  const element = target instanceof Element ? target : null;
  if (!element) return undefined;
  if (element.closest('[data-pane="right"], [data-editor-wrap="right"], [data-editor-wrap="output"], [data-editor-wrap="document"]')) {
    return 'right';
  }
  if (element.closest('[data-pane="left"], [data-editor-wrap="left"], [data-editor-wrap="input"], [data-editor-wrap="schema"]')) {
    return 'left';
  }
  return undefined;
}

function wireDocument(): void {
  if (wired) return;
  wired = true;

  document.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    showOverlay();
  });

  document.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    showOverlay();
  });

  document.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    hideTimer = setTimeout(hideOverlay, 50);
  });

  document.addEventListener('drop', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    hideOverlay();
    const file = event.dataTransfer?.files?.[0];
    if (file) handler?.(file, sideFromTarget(event.target));
  });
}

/** Wire a full-window drag-and-drop overlay to a file handler. */
export function setupPageDropzone(
  shell: HTMLElement,
  onFile: (file: File, side?: string) => void,
  localeHint?: string,
): void {
  locale = (localeHint ?? shell.dataset.locale ?? 'en') as Locale;
  handler = onFile;
  ensureOverlay();
  wireDocument();
}

/** Backwards-compatible alias for single-input tools. */
export function setupDropzone(shell: HTMLElement, onFile: (file: File) => void): void {
  setupPageDropzone(shell, (file) => onFile(file));
}

/** Backwards-compatible alias; side is derived from the drop target. */
export function attachDropzone(_wrap: HTMLElement, onFile: (file: File) => void): void {
  const shell = _wrap.closest<HTMLElement>('[data-tool-shell], [data-tool-frame]')?.parentElement ?? document.body;
  setupPageDropzone(shell, (file, side) => onFile(file));
}

/** Stop the browser from navigating when a file is dropped outside an editor. */
export function guardDocumentDrops(): void {
  // Document-level prevention is handled by wireDocument; keep as a no-op for compatibility.
}