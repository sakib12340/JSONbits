export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadText(text: string, filename: string): void {
  downloadBlob(new Blob([text], { type: 'application/json' }), filename);
}

/** Derive a readable output name without ever uploading the file. */
export function formattedName(filename: string | null): string {
  if (!filename) return 'formatted.json';

  const base = filename.replace(/\.[^./\\]+$/, '').trim();
  return base.length > 0 ? `${base}.formatted.json` : 'formatted.json';
}
