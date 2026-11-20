import type { JsonError } from '../protocol';

/** A syntax error with a stable location for the error panel. */
export class JsonFormatError extends Error {
  readonly hint: string;
  readonly offset: number;
  readonly line: number;
  readonly column: number;

  constructor(
    message: string,
    hint: string,
    offset: number,
    line: number,
    column: number,
  ) {
    super(message);
    this.name = 'JsonFormatError';
    this.hint = hint;
    this.offset = offset;
    this.line = line;
    this.column = column;
  }

  toJsonError(): JsonError {
    return {
      message: this.message,
      line: this.line,
      column: this.column,
      offset: this.offset,
      hint: this.hint,
    };
  }
}

/** Convert a string offset into a 1-based line and column. */
export function positionAt(text: string, offset: number): { line: number; column: number } {
  const end = Math.min(Math.max(0, offset), text.length);
  let line = 1;
  let column = 1;

  for (let index = 0; index < end; index += 1) {
    if (text.charCodeAt(index) === 0x0a) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}
