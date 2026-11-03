import type { FormatOptions, FormatStats } from '../protocol';
import { JsonFormatError } from './errors';
import { JsonScanner, isDigit, CHARS } from './scanner';
import { OutputBuilder } from './output';
import { countLines, utf8Length } from './stats';

type ObjectState = 'keyOrEnd' | 'key' | 'colon' | 'value' | 'commaOrEnd';
type ArrayState = 'valueOrEnd' | 'value' | 'commaOrEnd';

interface ObjectFrame {
  type: 'object';
  state: ObjectState;
  count: number;
}

interface ArrayFrame {
  type: 'array';
  state: ArrayState;
  count: number;
}

type Frame = ObjectFrame | ArrayFrame;

/**
 * Format JSON without parsing numbers through JavaScript's Number type.
 * The scanner validates the grammar and the formatter writes the original
 * token text, so 9007199254740993 and high-precision decimals stay intact.
 */
export interface FormattedJson {
  output: string;
  stats: FormatStats;
}

export function formatJson(text: string, options: FormatOptions): FormattedJson {
  const started = performance.now();
  const scanner = new JsonScanner(text);
  const output = new OutputBuilder();
  const stack: Frame[] = [];
  const indentUnit = options.indent === 'tab' ? '\t' : ' '.repeat(options.indent);
  const stats: FormatStats = {
    bytes: utf8Length(text),
    lines: countLines(text),
    depth: 0,
    keys: 0,
    values: 0,
    arrays: 0,
    objects: 0,
    parseTimeMs: 0,
  };

  function writeIndent(depth: number): void {
    output.push('\n', indentUnit.repeat(depth));
  }

  function updateDepth(): void {
    if (stack.length > stats.depth) stats.depth = stack.length;
  }

  function closeFrame(frame: Frame, character: string): void {
    scanner.advance();
    stack.pop();

    if (frame.count === 0) {
      output.push(character);
      return;
    }

    output.push('\n', indentUnit.repeat(stack.length), character);
  }

  function parseValue(): void {
    scanner.skipWhitespace();

    if (scanner.eof()) {
      scanner.fail('Unexpected end of JSON input', 'A value is missing.');
    }

    const code = scanner.peek();

    if (code === CHARS.LEFT_BRACE) {
      scanner.advance();
      output.push('{');
      stack.push({ type: 'object', state: 'keyOrEnd', count: 0 });
      stats.objects += 1;
      updateDepth();
      return;
    }

    if (code === CHARS.LEFT_BRACKET) {
      scanner.advance();
      output.push('[');
      stack.push({ type: 'array', state: 'valueOrEnd', count: 0 });
      stats.arrays += 1;
      updateDepth();
      return;
    }

    if (code === CHARS.QUOTE) {
      output.push(scanner.scanString());
      stats.values += 1;
      return;
    }

    if (code === CHARS.MINUS || isDigit(code)) {
      output.push(scanner.scanNumber());
      stats.values += 1;
      return;
    }

    if (code === CHARS.LOWER_T) {
      output.push(scanner.scanLiteral('true'));
      stats.values += 1;
      return;
    }

    if (code === CHARS.LOWER_F) {
      output.push(scanner.scanLiteral('false'));
      stats.values += 1;
      return;
    }

    if (code === CHARS.LOWER_N) {
      output.push(scanner.scanLiteral('null'));
      stats.values += 1;
      return;
    }

    if (code === 0x27) {
      scanner.fail(
        'Strings must use double quotes',
        'Replace the single quotes with double quotes.',
      );
    }

    if (code === CHARS.SLASH) {
      scanner.fail(
        'Comments are not allowed in JSON',
        'Remove the comment or use the JSON Repair tool.',
      );
    }

    if (CHARS.SMART_QUOTES.has(code)) {
      scanner.fail(
        'Smart quotes are not valid JSON',
        'Replace curly quotes with straight double quotes.',
      );
    }

    if (code === CHARS.UPPER_T || code === CHARS.UPPER_F) {
      scanner.fail(
        'Invalid literal',
        'JSON uses lowercase true and false, not Python-style True and False.',
      );
    }

    if (code === CHARS.UPPER_N) {
      scanner.fail(
        'Invalid literal',
        'JSON uses lowercase null, not Python-style None or JavaScript NaN.',
      );
    }

    if (code === 0x49) {
      scanner.fail(
        'Invalid number',
        'JSON does not support Infinity. Use a finite number instead.',
      );
    }

    if (code === 0x2b) {
      scanner.fail(
        'Invalid number',
        'JSON numbers cannot start with a plus sign.',
      );
    }

    scanner.fail(
      'Unexpected character',
      'Expected a JSON value: object, array, string, number, true, false, or null.',
    );
  }

  function handleObject(frame: ObjectFrame): void {
    scanner.skipWhitespace();

    if (frame.state === 'keyOrEnd') {
      if (scanner.eof()) {
        scanner.fail('Unexpected end of JSON input', "A key or '}' is missing.");
      }

      if (scanner.peek() === CHARS.RIGHT_BRACE) {
        closeFrame(frame, '}');
        return;
      }

      writeIndent(stack.length);
      output.push(scanner.scanKey());
      stats.keys += 1;
      frame.count += 1;
      frame.state = 'colon';
      return;
    }

    if (frame.state === 'key') {
      if (scanner.eof()) {
        scanner.fail('Unexpected end of JSON input', "A key or '}' is missing.");
      }

      if (scanner.peek() === CHARS.RIGHT_BRACE) {
        scanner.fail(
          'Trailing comma is not allowed in JSON',
          'Remove the comma before the closing brace.',
        );
      }

      writeIndent(stack.length);
      output.push(scanner.scanKey());
      stats.keys += 1;
      frame.count += 1;
      frame.state = 'colon';
      return;
    }

    if (frame.state === 'colon') {
      if (scanner.eof()) {
        scanner.fail('Unexpected end of JSON input', "A ':' and a value are missing.");
      }

      if (scanner.peek() !== CHARS.COLON) {
        scanner.fail(
          'Expected a colon after the object key',
          'Separate each key and value with a colon, for example "name": "value".',
        );
      }

      scanner.advance();
      output.push(': ');
      frame.state = 'value';
      return;
    }

    if (frame.state === 'value') {
      parseValue();
      frame.state = 'commaOrEnd';
      return;
    }

    if (scanner.eof()) {
      scanner.fail('Unexpected end of JSON input', "A ',' or '}' is missing.");
    }

    const code = scanner.peek();

    if (code === CHARS.COMMA) {
      scanner.advance();
      output.push(',');
      frame.state = 'key';
      return;
    }

    if (code === CHARS.RIGHT_BRACE) {
      closeFrame(frame, '}');
      return;
    }

    if (code === CHARS.RIGHT_BRACKET) {
      scanner.fail(
        'Mismatched closing bracket',
        "Close the object with '}' instead of ']'.",
      );
    }

    if (code === CHARS.SLASH) {
      scanner.fail(
        'Comments are not allowed in JSON',
        'Remove the comment or use the JSON Repair tool.',
      );
    }

    scanner.fail(
      "Expected ',' or '}'",
      'Separate object members with commas and close the object with a brace.',
    );
  }

  function handleArray(frame: ArrayFrame): void {
    scanner.skipWhitespace();

    if (frame.state === 'valueOrEnd') {
      if (scanner.eof()) {
        scanner.fail('Unexpected end of JSON input', "A value or ']' is missing.");
      }

      if (scanner.peek() === CHARS.RIGHT_BRACKET) {
        closeFrame(frame, ']');
        return;
      }

      writeIndent(stack.length);
      parseValue();
      frame.count += 1;
      frame.state = 'commaOrEnd';
      return;
    }

    if (frame.state === 'value') {
      if (scanner.eof()) {
        scanner.fail('Unexpected end of JSON input', "A value or ']' is missing.");
      }

      if (scanner.peek() === CHARS.RIGHT_BRACKET) {
        scanner.fail(
          'Trailing comma is not allowed in JSON',
          'Remove the comma before the closing bracket.',
        );
      }

      writeIndent(stack.length);
      parseValue();
      frame.count += 1;
      frame.state = 'commaOrEnd';
      return;
    }

    if (scanner.eof()) {
      scanner.fail('Unexpected end of JSON input', "A ',' or ']' is missing.");
    }

    const code = scanner.peek();

    if (code === CHARS.COMMA) {
      scanner.advance();
      output.push(',');
      frame.state = 'value';
      return;
    }

    if (code === CHARS.RIGHT_BRACKET) {
      closeFrame(frame, ']');
      return;
    }

    if (code === CHARS.RIGHT_BRACE) {
      scanner.fail(
        'Mismatched closing bracket',
        "Close the array with ']' instead of '}'.",
      );
    }

    if (code === CHARS.SLASH) {
      scanner.fail(
        'Comments are not allowed in JSON',
        'Remove the comment or use the JSON Repair tool.',
      );
    }

    scanner.fail(
      "Expected ',' or ']'",
      'Separate array values with commas and close the array with a bracket.',
    );
  }

  scanner.skipWhitespace();

  if (scanner.eof()) {
    throw new JsonFormatError(
      'JSON input is empty',
      'Paste JSON or open a file to begin.',
      0,
      1,
      1,
    );
  }

  parseValue();

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];

    if (frame.type === 'object') {
      handleObject(frame);
    } else {
      handleArray(frame);
    }
  }

  scanner.skipWhitespace();

  if (!scanner.eof()) {
    const code = scanner.peek();

    if (code === CHARS.RIGHT_BRACE || code === CHARS.RIGHT_BRACKET) {
      scanner.fail(
        'Unexpected closing bracket',
        'This closing bracket has no matching opening bracket.',
      );
    }

    if (code === CHARS.COMMA) {
      scanner.fail('Unexpected comma', 'Remove the extra comma.');
    }

    scanner.fail(
      'Unexpected data after the JSON value',
      'Only one JSON value is allowed. Remove the extra content.',
    );
  }

  stats.parseTimeMs = Math.round((performance.now() - started) * 10) / 10;

  return { output: output.toString(), stats };
}
