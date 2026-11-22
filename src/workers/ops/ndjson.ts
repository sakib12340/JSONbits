import type {
  JsonToCsvOptions,
  NdjsonConvertResult,
  NdjsonIssue,
  NdjsonOptions,
  NdjsonStats,
  NdjsonValidateResult,
  TextPayload,
} from '../protocol';
import { parseAst, serializeNode, type JsonNode } from './ast';
import { rowsToCsv } from './convert/csv';
import { JsonFormatError } from './errors';
import { minifyJson } from './minify';
import { formatJson } from './format';
import { OutputBuilder } from './output';
import { NullSink, parseJson } from './parser';
import { utf8Length } from './stats';

const CHUNK = 64 * 1024;
const MAX_ISSUES = 1_000;
const MAX_ROWS = 200_000;

type Progress = (percent: number) => void;

interface Counters {
  lines: number;
  valid: number;
  invalid: number;
  blank: number;
  issues: NdjsonIssue[];
}

function emptyCounters(): Counters {
  return { lines: 0, valid: 0, invalid: 0, blank: 0, issues: [] };
}

/** Yields one logical line at a time without ever creating a giant string. */
export function* readNdjsonLines(payload: TextPayload, onProgress?: Progress): Generator<string> {
  let carry = '';
  const emit = function* (chunk: string): Generator<string> {
    carry += chunk;
    let index = carry.indexOf('\n');
    while (index >= 0) {
      yield carry.slice(0, index);
      carry = carry.slice(index + 1);
      index = carry.indexOf('\n');
    }
  };

  if ('buffer' in payload) {
    const bytes = new Uint8Array(payload.buffer);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    for (let offset = 0; offset < bytes.length; offset += CHUNK) {
      const end = Math.min(offset + CHUNK, bytes.length);
      try {
        yield* emit(decoder.decode(bytes.subarray(offset, end), { stream: true }));
      } catch {
        throw new JsonFormatError(
          'This file is not valid UTF-8 text.',
          'Save the file as UTF-8 and try again.',
          offset,
          0,
          0,
        );
      }
      onProgress?.(end / bytes.length);
    }
    yield* emit(decoder.decode());
  } else {
    const text = payload.text;
    for (let offset = 0; offset < text.length; offset += CHUNK) {
      yield* emit(text.slice(offset, Math.min(offset + CHUNK, text.length)));
      onProgress?.(Math.min(offset + CHUNK, text.length) / text.length);
    }
  }

  if (carry.length > 0) yield carry;
  onProgress?.(1);
}

function issueFor(lineNo: number, error: JsonFormatError): NdjsonIssue {
  return {
    line: lineNo,
    column: error.column,
    message: error.message,
    hint: error.hint,
  };
}

function validateLine(raw: string, lineNo: number, counters: Counters): boolean {
  const text = raw.replace(/\r$/, '').trim();
  if (text.length === 0) {
    counters.blank += 1;
    return false;
  }
  try {
    parseJson(text, new NullSink());
    counters.valid += 1;
    return true;
  } catch (error) {
    counters.invalid += 1;
    if (counters.issues.length < MAX_ISSUES && error instanceof JsonFormatError) {
      counters.issues.push(issueFor(lineNo, error));
    }
    return false;
  }
}

function finishStats(payload: TextPayload, counters: Counters, started: number): NdjsonStats {
  const bytes = 'buffer' in payload ? payload.buffer.byteLength : utf8Length(payload.text);
  return {
    bytes,
    lines: counters.lines,
    valid: counters.valid,
    invalid: counters.invalid,
    blank: counters.blank,
    errorsShown: counters.issues.length,
    truncated: counters.invalid > counters.issues.length,
    timeMs: Math.round((performance.now() - started) * 10) / 10,
  };
}

export function ndjsonValidate(
  payload: TextPayload,
  options: NdjsonOptions,
  onProgress?: Progress,
): NdjsonValidateResult {
  const started = performance.now();
  const counters = emptyCounters();
  for (const line of readNdjsonLines(payload, onProgress)) {
    counters.lines += 1;
    validateLine(line, counters.lines, counters);
    if (options.stopAtFirst && counters.invalid > 0) break;
  }
  return { stats: finishStats(payload, counters, started), issues: counters.issues };
}

export function ndjsonToJson(
  payload: TextPayload,
  options: NdjsonOptions,
  onProgress?: Progress,
): NdjsonConvertResult {
  const started = performance.now();
  const counters = emptyCounters();
  const out = new OutputBuilder();
  out.push('[');
  let written = 0;
  for (const line of readNdjsonLines(payload, onProgress)) {
    counters.lines += 1;
    const text = line.replace(/\r$/, '').trim();
    if (text.length === 0) {
      counters.blank += 1;
      if (!options.trimBlank) {
        if (written > 0) out.push(',');
        out.push('\n  null');
        written += 1;
      }
      continue;
    }
    try {
      parseJson(text, new NullSink());
      counters.valid += 1;
      const value = options.pretty ? (formatJson(text, { indent: 2 }).output ?? text) : text;
      if (written > 0) out.push(',');
      out.push('\n  ', value.replace(/\n/g, '\n  '));
      written += 1;
    } catch (error) {
      counters.invalid += 1;
      if (error instanceof JsonFormatError && counters.issues.length < MAX_ISSUES) {
        counters.issues.push(issueFor(counters.lines, error));
      }
      if (!options.skipInvalid) {
        throw new JsonFormatError(
          `Line ${counters.lines}: ${error instanceof JsonFormatError ? error.message : 'Invalid JSON'}`,
          error instanceof JsonFormatError ? error.hint : 'Each line must be a complete JSON value.',
          error instanceof JsonFormatError ? error.offset : 0,
          counters.lines,
          error instanceof JsonFormatError ? error.column : 1,
        );
      }
    }
  }
  if (written > 0) out.push('\n');
  out.push(']');
  const output = out.toString();
  return {
    output,
    blob: null,
    stats: finishStats(payload, counters, started),
  };
}

function nodeToValue(node: JsonNode): unknown {
  switch (node.kind) {
    case 'object':
      return Object.fromEntries(node.entries.map((entry) => [entry.key, nodeToValue(entry.value)]));
    case 'array':
      return node.items.map(nodeToValue);
    case 'string':
      return node.text;
    case 'number':
      return Number(node.raw);
    case 'boolean':
      return node.raw === 'true';
    case 'null':
      return null;
  }
}

export function jsonToNdjson(
  payload: TextPayload,
  _options: NdjsonOptions,
  onProgress?: Progress,
): NdjsonConvertResult {
  const started = performance.now();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const text = 'buffer' in payload ? decoder.decode(new Uint8Array(payload.buffer)) : payload.text;
  onProgress?.(0.5);
  const { root } = parseAst(text);
  if (root.kind !== 'array') {
    throw new JsonFormatError(
      'NDJSON needs a top-level array.',
      'Each output line must be one JSON value, so the input must be an array of records.',
      0,
      1,
      1,
    );
  }
  const out = new OutputBuilder();
  for (const [index, item] of root.items.entries()) {
    const serialized = serializeNode(item, 10_000_000);
    const compact = serialized.text === null ? 'null' : (minifyJson(serialized.text).output ?? serialized.text);
    out.push(compact, '\n');
    if (index % 1000 === 0) onProgress?.(0.5 + (0.5 * index) / Math.max(root.items.length, 1));
  }
  const output = out.toString();
  return {
    output,
    blob: null,
    stats: {
      bytes: utf8Length(text),
      lines: root.items.length,
      valid: root.items.length,
      invalid: 0,
      blank: 0,
      errorsShown: 0,
      truncated: false,
      timeMs: Math.round((performance.now() - started) * 10) / 10,
    },
  };
}

export function ndjsonToCsv(
  payload: TextPayload,
  options: NdjsonOptions,
  onProgress?: Progress,
): NdjsonConvertResult {
  const started = performance.now();
  const counters = emptyCounters();
  const rows: Record<string, unknown>[] = [];
  for (const line of readNdjsonLines(payload, onProgress)) {
    counters.lines += 1;
    const text = line.replace(/\r$/, '').trim();
    if (text.length === 0) {
      counters.blank += 1;
      continue;
    }
    try {
      parseJson(text, new NullSink());
      const { root } = parseAst(text);
      const value = nodeToValue(root);
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        counters.invalid += 1;
        if (counters.issues.length < MAX_ISSUES) {
          counters.issues.push({
            line: counters.lines,
            column: 1,
            message: 'A CSV row must be a JSON object.',
            hint: 'Each non-empty line should contain an object such as {"name":"Ada"}.',
          });
        }
        if (!options.skipInvalid) break;
        continue;
      }
      if (rows.length < MAX_ROWS) rows.push(value as Record<string, unknown>);
      counters.valid += 1;
    } catch (error) {
      counters.invalid += 1;
      if (error instanceof JsonFormatError && counters.issues.length < MAX_ISSUES) {
        counters.issues.push(issueFor(counters.lines, error));
      }
      if (!options.skipInvalid) break;
    }
  }

  const csvOptions: JsonToCsvOptions = {
    delimiter: options.delimiter,
    flatten: options.flatten,
    header: options.header,
    guard: options.guard,
    arrays: 'json',
  };
  const output = rowsToCsv(rows, csvOptions);
  return { output, blob: null, stats: finishStats(payload, counters, started) };
}
