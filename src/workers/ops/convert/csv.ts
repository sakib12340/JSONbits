import type {
  ConvertResult,
  CsvArrays,
  CsvToJsonOptions,
  JsonToCsvOptions,
} from '../../protocol';
import { JsonFormatError } from '../errors';
import {
  finishStats,
  isPlainObject,
  readJsonValue,
} from './common';

type Cell = unknown;

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function invalid(message: string, hint: string): JsonFormatError {
  return new JsonFormatError(message, hint, 0, 1, 1);
}

function toRow(value: Cell): Record<string, Cell> {
  if (Array.isArray(value)) {
    return Object.fromEntries(value.map((entry, index) => [String(index), entry]));
  }

  if (isPlainObject(value)) return value;

  return { value };
}

function toRows(value: unknown): Record<string, Cell>[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw invalid(
        'This JSON array is empty.',
        'Add at least one object, or convert a single object instead.',
      );
    }

    return value.map(toRow);
  }

  if (isPlainObject(value)) return [value];

  throw invalid(
    'JSON to CSV needs an object or an array of objects.',
    'Use an array such as [{"name": "Ada"}, {"name": "Lin"}], or a single object.',
  );
}

function joinArray(values: unknown[]): string {
  return values
    .map((entry) => {
      if (entry === null || entry === undefined) return '';
      if (typeof entry === 'object') return JSON.stringify(entry);
      return String(entry);
    })
    .filter((entry) => entry.length > 0)
    .join(', ');
}

function flattenInto(
  prefix: string,
  value: unknown,
  out: Record<string, unknown>,
  arrays: CsvArrays,
): void {
  if (value === null || value === undefined) {
    out[prefix] = '';
    return;
  }

  if (Array.isArray(value)) {
    out[prefix] = arrays === 'join' ? joinArray(value) : JSON.stringify(value);
    return;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      out[prefix] = '';
      return;
    }

    for (const [key, child] of entries) {
      flattenInto(prefix.length > 0 ? `${prefix}.${key}` : key, child, out, arrays);
    }
    return;
  }

  out[prefix] = value;
}

function flattenRow(
  row: Record<string, Cell>,
  arrays: CsvArrays,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    flattenInto(key, value, out, arrays);
  }

  return out;
}

function cellText(value: unknown, arrays: CsvArrays): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return arrays === 'join' ? joinArray(value) : JSON.stringify(value);
  }
  if (isPlainObject(value)) return JSON.stringify(value);
  return String(value);
}

function escapeCell(value: string, delimiter: string): string {
  if (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\r') ||
    value.includes('\n') ||
    value.startsWith(' ') ||
    value.endsWith(' ')
  ) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function guardCell(value: string): string {
  return value.length > 0 && FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function jsonToCsv(text: string, options: JsonToCsvOptions): ConvertResult {
  const started = performance.now();
  const rows = toRows(readJsonValue(text));
  const prepared = rows.map((row) =>
    options.flatten ? flattenRow(row, options.arrays) : row,
  );

  const columns: string[] = [];
  const seen = new Set<string>();

  for (const row of prepared) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push(key);
    }
  }

  const lines: string[] = [];
  const write = (values: string[]): void => {
    const cells = values.map((value) => {
      const guarded = options.guard ? guardCell(value) : value;
      return escapeCell(guarded, options.delimiter);
    });
    lines.push(cells.join(options.delimiter));
  };

  if (options.header) write(columns);

  for (const row of prepared) {
    write(columns.map((column) => cellText(row[column], options.arrays)));
  }

  const output = lines.join('\r\n');
  const stats = finishStats(text, output, started, {
    rows: prepared.length,
    columns: columns.length,
  });

  return { output, blob: null, stats };
}

export async function csvToJson(
  text: string,
  options: CsvToJsonOptions,
): Promise<ConvertResult> {
  const Papa = (await import('papaparse')).default;
  const started = performance.now();

  const parsed = Papa.parse(text, {
    delimiter: options.delimiter || undefined,
    header: options.header,
    dynamicTyping: options.inferTypes,
    skipEmptyLines: 'greedy',
  }) as { data: unknown[]; errors: { message: string; row?: number }[] };

  if (parsed.errors.length > 0) {
    const error = parsed.errors[0];
    const line = typeof error.row === 'number' ? error.row + (options.header ? 2 : 1) : 1;

    throw new JsonFormatError(
      error.message,
      'Check this row for unbalanced quotes, an extra delimiter, or a missing column value.',
      0,
      line,
      1,
    );
  }

  if (parsed.data.length === 0) {
    throw new JsonFormatError(
      'This CSV has no data rows.',
      'Add at least one row below the header, then convert again.',
      0,
      1,
      1,
    );
  }

  const output = JSON.stringify(parsed.data, null, 2);
  const columns = options.header ? Object.keys(parsed.data[0] as object).length : 0;
  const stats = finishStats(text, output, started, {
    rows: parsed.data.length,
    columns,
  });

  return { output, blob: null, stats };
}
