import { hasFiles } from './file-text';

/** Wire one editor wrapper and its overlay to a file handler. */
export function attachDropzone(wrap: HTMLElement, onFile: (file: File) => void): void {
  const overlay = wrap.querySelector<HTMLElement>('[data-drop-overlay]');
  if (!overlay) return;

  let depth = 0;

  wrap.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth += 1;
    overlay.hidden = false;
  });

  wrap.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });

  wrap.addEventListener('dragleave', () => {
    if (depth === 0) return;
    depth -= 1;
    if (depth === 0) overlay.hidden = true;
  });

  wrap.addEventListener('drop', (event) => {
    event.preventDefault();
    depth = 0;
    overlay.hidden = true;
    const file = event.dataTransfer?.files?.[0];
    if (file) onFile(file);
  });
}

/** Stop the browser from navigating when a file is dropped outside an editor. */
export function guardDocumentDrops(): void {
  document.addEventListener('dragover', (event) => {
    if (hasFiles(event)) event.preventDefault();
  });

  document.addEventListener('drop', (event) => {
    if (hasFiles(event)) event.preventDefault();
  });
}

/** Wire the standard single-input tool shell. */
export function setupDropzone(shell: HTMLElement, onFile: (file: File) => void): void {
  const wrap = shell.querySelector<HTMLElement>('[data-editor-wrap="input"]');
  if (wrap) attachDropzone(wrap, onFile);
  guardDocumentDrops();
}
