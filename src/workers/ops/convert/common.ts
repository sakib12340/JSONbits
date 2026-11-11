import type { ConvertStats, FormatIndent } from '../../protocol';
import { JsonFormatError } from '../errors';
import { NullSink, parseJson } from '../parser';
import { countLines, utf8Length } from '../stats';

/** Parse JSON after the strict scanner has produced a precise error. */
export function readJsonValue(text: string): unknown {
  parseJson(text, new NullSink());

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new JsonFormatError(
      'This JSON could not be read.',
      'Check the value for a missing comma, quote, or bracket.',
      0,
      1,
      1,
    );
  }
}

export function indentUnit(indent: FormatIndent | 2 | 4): string {
  return indent === 'tab' ? '\t' : ' '.repeat(indent);
}

export function finishStats(
  text: string,
  output: string,
  started: number,
  extra: { rows?: number; columns?: number } = {},
): ConvertStats {
  return {
    bytes: utf8Length(text),
    outputBytes: utf8Length(output),
    lines: countLines(output),
    parseTimeMs: Math.round((performance.now() - started) * 10) / 10,
    ...extra,
  };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
