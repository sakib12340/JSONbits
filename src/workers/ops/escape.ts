import type { EscapeOptions, EscapeResult } from '../protocol';
import { JsonFormatError, positionAt } from './errors';
import { OutputBuilder } from './output';
import { countLines, utf8Length } from './stats';

const QUOTE = 0x22;
const BACKSLASH = 0x5c;

const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

const INVALID_HINT =
  'Only \\, ", /, b, f, n, r, t, and \\uXXXX are valid JSON escapes.';

function unicodeEscape(code: number): string {
  return `\\u${code.toString(16).padStart(4, '0')}`;
}

function escapeText(text: string, options: EscapeOptions): { output: string; count: number } {
  const output = new OutputBuilder();
  let count = 0;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    if (code === QUOTE) {
      output.push('\\"');
      count += 1;
      continue;
    }

    if (code === BACKSLASH) {
      output.push('\\\\');
      count += 1;
      continue;
    }

    if (code === 0x0a) {
      output.push('\\n');
      count += 1;
      continue;
    }

    if (code === 0x0d) {
      output.push('\\r');
      count += 1;
      continue;
    }

    if (code === 0x09) {
      output.push('\\t');
      count += 1;
      continue;
    }

    if (code === 0x08) {
      output.push('\\b');
      count += 1;
      continue;
    }

    if (code === 0x0c) {
      output.push('\\f');
      count += 1;
      continue;
    }

    if (code < 0x20) {
      output.push(unicodeEscape(code));
      count += 1;
      continue;
    }

    if (options.ascii && code > 0x7e) {
      output.push(unicodeEscape(code));
      count += 1;
      continue;
    }

    output.push(text.charAt(index));
  }

  const body = output.toString();
  return { output: options.quotes ? `"${body}"` : body, count };
}

function failAt(text: string, offset: number, message: string): never {
  const { line, column } = positionAt(text, offset);
  throw new JsonFormatError(message, INVALID_HINT, offset, line, column);
}

function unescapeText(text: string): { output: string; count: number } {
  let input = text;

  if (input.length >= 2 && input.charCodeAt(0) === QUOTE && input.charCodeAt(input.length - 1) === QUOTE) {
    input = input.slice(1, -1);
  }

  const output = new OutputBuilder();
  let count = 0;
  let index = 0;

  while (index < input.length) {
    const code = input.charCodeAt(index);

    if (code !== BACKSLASH) {
      output.push(input.charAt(index));
      index += 1;
      continue;
    }

    if (index + 1 >= input.length) {
      failAt(input, index, 'The text ends with a lone backslash');
    }

    const next = input.charAt(index + 1);
    const simple = SIMPLE_ESCAPES[next];

    if (simple !== undefined) {
      output.push(simple);
      count += 1;
      index += 2;
      continue;
    }

    if (next !== 'u') {
      failAt(input, index, `Invalid escape sequence \\${next}`);
    }

    const hex = input.slice(index + 2, index + 6);

    if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
      failAt(input, index, `Incomplete \\u escape sequence "${hex}"`);
    }

    output.push(String.fromCharCode(Number.parseInt(hex, 16)));
    count += 1;
    index += 6;
  }

  return { output: output.toString(), count };
}

/** Escapes arbitrary text as a JSON string body, or reverses JSON escapes. */
export function transformEscapes(text: string, options: EscapeOptions): EscapeResult {
  const started = performance.now();
  const result =
    options.mode === 'escape' ? escapeText(text, options) : unescapeText(text);
  const outputBytes = utf8Length(result.output);

  return {
    output: result.output,
    blob: null,
    stats: {
      bytes: utf8Length(text),
      outputBytes,
      lines: countLines(result.output),
      replacements: result.count,
      parseTimeMs: Math.round((performance.now() - started) * 10) / 10,
    },
  };
}
