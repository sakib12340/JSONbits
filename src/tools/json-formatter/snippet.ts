import type { EditorHandle } from '../../lib/editor';
import type { JsonError } from '../../workers/protocol';

/** Build a small, monospace excerpt with a caret under the reported column. */
export function buildSnippet(
  editor: EditorHandle,
  error: JsonError,
  largeMode: boolean,
): string | null {
  if (largeMode || error.line < 1 || error.column < 1) return null;

  const raw = editor.lineText(error.line);
  if (raw === null) return null;

  const before = raw.slice(0, Math.max(0, error.column - 1));
  let caret = 0;

  for (const character of before) {
    caret += character === '\t' ? 2 : 1;
  }

  let line = raw.replace(/\t/g, '  ');

  if (line.length > 180) {
    const start = Math.max(0, caret - 70);
    const prefix = start > 0 ? '…' : '';
    line = prefix + line.slice(start, start + 150);
    caret = caret - start + prefix.length;
  }

  const number = String(error.line);
  const gutter = `${' '.repeat(number.length)} | `;

  return `${number} | ${line}\n${gutter}${' '.repeat(caret)}^`;
}
