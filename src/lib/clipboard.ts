/**
 * Copy plain text without a network round-trip. The Clipboard API needs a
 * secure context; the textarea fallback covers older and locked-down browsers.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();

  let copied = false;

  try {
    const legacy = document as unknown as { execCommand: (command: string) => boolean };
    copied = legacy.execCommand('copy');
  } catch {
    copied = false;
  }

  area.remove();
  return copied;
}
