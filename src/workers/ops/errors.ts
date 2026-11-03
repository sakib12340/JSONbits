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
