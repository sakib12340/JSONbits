import { JsonFormatError } from './errors';

const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;
const SPACE = 0x20;
const QUOTE = 0x22;
const PLUS = 0x2b;
const COMMA = 0x2c;
const MINUS = 0x2d;
const DOT = 0x2e;
const SLASH = 0x2f;
const ZERO = 0x30;
const NINE = 0x39;
const COLON = 0x3a;
const UPPER_E = 0x45;
const LOWER_B = 0x62;
const LOWER_E = 0x65;
const LOWER_F = 0x66;
const LOWER_N = 0x6e;
const LOWER_R = 0x72;
const LOWER_T = 0x74;
const LOWER_U = 0x75;
const BACKSLASH = 0x5c;
const LOWER_A = 0x61;
const LOWER_Z = 0x7a;
const UPPER_A = 0x41;
const UPPER_Z = 0x5a;
const UNDERSCORE = 0x5f;
const DOLLAR = 0x24;

const WHITESPACE = new Set([SPACE, TAB, LF, CR]);

export class JsonScanner {
  readonly text: string;
  index = 0;
  line = 1;
  column = 1;

  constructor(text: string) {
    this.text = text;

    // A byte-order mark is common at the start of downloaded files.
    if (text.charCodeAt(0) === 0xfeff) {
      this.index = 1;
      this.column = 2;
    }
  }

  get length(): number {
    return this.text.length;
  }

  eof(): boolean {
    return this.index >= this.text.length;
  }

  peek(offset = 0): number {
    return this.text.charCodeAt(this.index + offset);
  }

  advance(count = 1): void {
    for (let step = 0; step < count; step += 1) {
      const code = this.text.charCodeAt(this.index);

      if (Number.isNaN(code)) return;

      this.index += 1;

      if (code === LF) {
        this.line += 1;
        this.column = 1;
      } else {
        this.column += 1;
      }
    }
  }

  skipWhitespace(): void {
    while (!this.eof() && WHITESPACE.has(this.peek())) this.advance();
  }

  fail(
    message: string,
    hint: string,
    at?: { offset: number; line: number; column: number },
  ): never {
    throw new JsonFormatError(
      message,
      hint,
      at?.offset ?? this.index,
      at?.line ?? this.line,
      at?.column ?? this.column,
    );
  }

  scanKey(): string {
    if (this.peek() === QUOTE) return this.scanString();

    const code = this.peek();

    if (Number.isNaN(code)) {
      this.fail('Unexpected end of JSON input', 'A key or a closing brace is missing.');
    }

    if (code === 0x27) {
      this.fail(
        'Strings must use double quotes',
        'Replace the single quotes with double quotes.',
      );
    }

    if (code === SLASH) {
      this.fail(
        'Comments are not allowed in JSON',
        'Remove the comment or use the JSON Repair tool.',
      );
    }

    if (isIdentifierStart(code)) {
      this.fail(
        'Object keys must be double-quoted strings',
        'Wrap the key in double quotes, for example "name":.',
      );
    }

    this.fail(
      'Expected an object key',
      'Object keys must be double-quoted strings followed by a colon.',
    );
  }

  scanString(): string {
    if (this.peek() !== QUOTE) {
      this.fail('Expected a string', 'JSON strings must start with a double quote.');
    }

    const start = this.index;
    const startLine = this.line;
    const startColumn = this.column;

    this.advance();

    while (!this.eof()) {
      const code = this.peek();

      if (code === QUOTE) {
        this.advance();
        return this.text.slice(start, this.index);
      }

      if (code === BACKSLASH) {
        this.advance();

        if (this.eof()) {
          this.fail('Unterminated string', 'Add a closing double quote.');
        }

        const escape = this.peek();

        if (
          escape === QUOTE ||
          escape === BACKSLASH ||
          escape === SLASH ||
          escape === LOWER_B ||
          escape === LOWER_F ||
          escape === LOWER_N ||
          escape === LOWER_R ||
          escape === LOWER_T
        ) {
          this.advance();
          continue;
        }

        if (escape === LOWER_U) {
          this.advance();

          for (let digit = 0; digit < 4; digit += 1) {
            if (this.eof() || !isHex(this.peek())) {
              this.fail(
                'Invalid Unicode escape',
                'Use four hex digits after \\u, for example \\u00e9.',
              );
            }

            this.advance();
          }

          continue;
        }

        this.fail(
          'Invalid escape sequence',
          'Valid escapes are \\" \\\\ \\/ \\b \\f \\n \\r \\t and \\uXXXX.',
        );
      }

      if (code < 0x20) {
        this.fail(
          'Unescaped control character in string',
          'Use an escape such as \\n or \\t inside the string.',
        );
      }

      this.advance();
    }

    this.fail(
      'Unterminated string',
      'Add a closing double quote.',
      { offset: start, line: startLine, column: startColumn },
    );
  }

  scanNumber(): string {
    const start = this.index;
    const startLine = this.line;
    const startColumn = this.column;
    const at = { offset: start, line: startLine, column: startColumn };

    if (this.peek() === MINUS) this.advance();

    if (this.eof()) {
      this.fail('Invalid number', 'A minus sign must be followed by digits.', at);
    }

    const first = this.peek();

    if (first === ZERO) {
      this.advance();

      if (isDigit(this.peek())) {
        this.fail(
          'Invalid number',
          'JSON numbers cannot have leading zeros.',
          at,
        );
      }
    } else if (first >= 0x31 && first <= NINE) {
      while (isDigit(this.peek())) this.advance();
    } else {
      this.fail(
        'Invalid number',
        'A JSON number must start with a digit or a minus sign.',
        at,
      );
    }

    if (this.peek() === DOT) {
      this.advance();

      if (!isDigit(this.peek())) {
        this.fail(
          'Invalid number',
          'A decimal point must be followed by at least one digit.',
          at,
        );
      }

      while (isDigit(this.peek())) this.advance();
    }

    if (this.peek() === LOWER_E || this.peek() === UPPER_E) {
      this.advance();

      if (this.peek() === PLUS || this.peek() === MINUS) this.advance();

      if (!isDigit(this.peek())) {
        this.fail(
          'Invalid number',
          'An exponent must contain at least one digit.',
          at,
        );
      }

      while (isDigit(this.peek())) this.advance();
    }

    if (isIdentifierStart(this.peek())) {
      this.fail(
        'Invalid number',
        'Remove the extra characters after the number.',
        at,
      );
    }

    return this.text.slice(start, this.index);
  }

  scanLiteral(literal: string): string {
    for (let index = 0; index < literal.length; index += 1) {
      if (this.eof()) {
        this.fail(
          'Unexpected end of JSON input',
          `Complete the ${literal} value.`,
        );
      }

      if (this.peek() !== literal.charCodeAt(index)) {
        this.fail('Invalid literal', `JSON literals are lowercase: ${literal}.`);
      }

      this.advance();
    }

    if (isIdentifierStart(this.peek())) {
      this.fail('Invalid literal', `JSON literals are lowercase: ${literal}.`);
    }

    return literal;
  }
}

export function isDigit(code: number): boolean {
  return code >= ZERO && code <= NINE;
}

function isHex(code: number): boolean {
  return (
    (code >= ZERO && code <= NINE) ||
    (code >= LOWER_A && code <= LOWER_F) ||
    (code >= UPPER_A && code <= 0x46)
  );
}

export function isIdentifierStart(code: number): boolean {
  return (
    (code >= LOWER_A && code <= LOWER_Z) ||
    (code >= UPPER_A && code <= UPPER_Z) ||
    code === UNDERSCORE ||
    code === DOLLAR
  );
}

export const CHARS = {
  TAB,
  LF,
  CR,
  SPACE,
  QUOTE,
  COMMA,
  COLON,
  MINUS,
  DOT,
  SLASH,
  LOWER_T,
  LOWER_F,
  LOWER_N,
  UPPER_T: 0x54,
  UPPER_F: 0x46,
  UPPER_N: 0x4e,
  LEFT_BRACE: 0x7b,
  RIGHT_BRACE: 0x7d,
  LEFT_BRACKET: 0x5b,
  RIGHT_BRACKET: 0x5d,
  SMART_QUOTES: new Set([0x2018, 0x2019, 0x201c, 0x201d]),
} as const;
