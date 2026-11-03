import type { FormatIndent } from '../workers/protocol';

const INDENT_KEY = 'jsonbits:indent';

export function readIndent(): FormatIndent {
  try {
    const stored = localStorage.getItem(INDENT_KEY);
    if (stored === '2' || stored === '4' || stored === 'tab') {
      return stored === 'tab' ? 'tab' : (Number(stored) as 2 | 4);
    }
  } catch {
    // Preferences are optional; the default still works.
  }

  return 2;
}

export function writeIndent(indent: FormatIndent): void {
  try {
    localStorage.setItem(INDENT_KEY, String(indent));
  } catch {
    // Storage can be unavailable in private modes.
  }
}
