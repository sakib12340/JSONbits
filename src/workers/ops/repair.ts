import type { RepairFix, RepairFixKind, RepairResult } from '../protocol';
import { JsonFormatError } from './errors';
import { formatJson } from './format';
import { diffLines } from './textdiff';

function positionAt(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const end = Math.max(0, Math.min(offset, text.length));
  for (let index = 0; index < end; index += 1) {
    if (text[index] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function pushFix(
  fixes: RepairFix[],
  text: string,
  offset: number,
  kind: RepairFixKind,
  before: string,
  after: string,
  description: string,
  ambiguous = false,
): void {
  const { line, column } = positionAt(text, offset);
  fixes.push({ kind, line, column, before, after, description, ambiguous });
}

function descriptionFor(kind: RepairFixKind): string {
  switch (kind) {
    case 'comments':
      return 'Removed a comment.';
    case 'trailingCommas':
      return 'Removed a trailing comma.';
    case 'singleQuotes':
      return 'Converted single quotes to double quotes.';
    case 'smartQuotes':
      return 'Converted smart quotes to straight quotes.';
    case 'unquotedKeys':
      return 'Quoted an unquoted object key.';
    case 'pythonLiterals':
      return 'Converted a Python literal to JSON.';
  }
}

function scanDoubleString(text: string, start: number): number {
  let index = start + 1;
  while (index < text.length) {
    if (text[index] === '\\') {
      index += 2;
      continue;
    }
    if (text[index] === '"') return index + 1;
    index += 1;
  }
  return text.length;
}

function readLooseString(
  text: string,
  start: number,
  closing: string,
): { value: string; end: number } {
  let value = '';
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === closing) return { value, end: index + 1 };
    if (char === '\\') {
      const next = text[index + 1];
      if (next === undefined) {
        value += '\\';
        index += 1;
        continue;
      }
      if (next === 'n') value += '\n';
      else if (next === 'r') value += '\r';
      else if (next === 't') value += '\t';
      else if (next === 'b') value += '\b';
      else if (next === 'f') value += '\f';
      else if (next === 'u') {
        const hex = text.slice(index + 2, index + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          value += String.fromCharCode(Number.parseInt(hex, 16));
          index += 4;
        } else {
          value += '\\u';
        }
      } else if (next === '\\' || next === '/' || next === '"' || next === "'") {
        value += next;
      } else {
        value += `\\${next}`;
      }
      index += 2;
      continue;
    }
    value += char;
    index += 1;
  }
  return { value, end: text.length };
}

function stripComments(text: string, fixes: RepairFix[]): string {
  const out: string[] = [];
  let index = 0;
  let close: string | null = null;

  while (index < text.length) {
    const char = text[index];
    if (close) {
      out.push(char);
      if (char === '\\') {
        if (index + 1 < text.length) out.push(text[index + 1]);
        index += 2;
        continue;
      }
      if (char === close) close = null;
      index += 1;
      continue;
    }
    if (char === '"') {
      close = '"';
      out.push(char);
      index += 1;
      continue;
    }
    if (char === "'") {
      close = "'";
      out.push(char);
      index += 1;
      continue;
    }
    if (char === '“') {
      close = '”';
      out.push(char);
      index += 1;
      continue;
    }
    if (char === '‘') {
      close = '’';
      out.push(char);
      index += 1;
      continue;
    }
    if (char === '/' && text[index + 1] === '/') {
      const start = index;
      index += 2;
      while (index < text.length && text[index] !== '\n') index += 1;
      const before = text.slice(start, index);
      pushFix(fixes, text, start, 'comments', before, '\n', descriptionFor('comments'));
      out.push('\n');
      continue;
    }
    if (char === '/' && text[index + 1] === '*') {
      const start = index;
      index += 2;
      while (index + 1 < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        index += 1;
      }
      index = Math.min(index + 2, text.length);
      const before = text.slice(start, index);
      pushFix(fixes, text, start, 'comments', before, ' ', descriptionFor('comments'));
      out.push(' ');
      continue;
    }
    out.push(char);
    index += 1;
  }
  return out.join('');
}

function convertQuotes(text: string, fixes: RepairFix[]): string {
  const out: string[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '"') {
      const end = scanDoubleString(text, index);
      out.push(text.slice(index, end));
      index = end;
      continue;
    }
    if (char === "'") {
      const start = index;
      const result = readLooseString(text, index, "'");
      const before = text.slice(start, result.end);
      const after = JSON.stringify(result.value);
      pushFix(fixes, text, start, 'singleQuotes', before, after, descriptionFor('singleQuotes'));
      out.push(after);
      index = result.end;
      continue;
    }
    if (char === '‘') {
      const start = index;
      const result = readLooseString(text, index, '’');
      const before = text.slice(start, result.end);
      const after = JSON.stringify(result.value);
      pushFix(fixes, text, start, 'smartQuotes', before, after, descriptionFor('smartQuotes'));
      out.push(after);
      index = result.end;
      continue;
    }
    if (char === '“') {
      const start = index;
      const result = readLooseString(text, index, '”');
      const before = text.slice(start, result.end);
      const after = JSON.stringify(result.value);
      pushFix(fixes, text, start, 'smartQuotes', before, after, descriptionFor('smartQuotes'));
      out.push(after);
      index = result.end;
      continue;
    }
    out.push(char);
    index += 1;
  }
  return out.join('');
}

function quoteUnquotedKeys(text: string, fixes: RepairFix[]): string {
  const out: string[] = [];
  let start = 0;
  let index = 0;
  const regex = /([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g;

  const processGap = (chunk: string, baseOffset: number): void => {
    let lastIndex = 0;
    let newChunk = '';
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(chunk)) !== null) {
      newChunk += chunk.slice(lastIndex, match.index);
      const before = match[0];
      const after = `${match[1]}${JSON.stringify(match[2])}${match[3]}`;
      pushFix(fixes, text, baseOffset + match.index, 'unquotedKeys', before, after, descriptionFor('unquotedKeys'));
      newChunk += after;
      lastIndex = match.index + match[0].length;
    }
    newChunk += chunk.slice(lastIndex);
    out.push(newChunk);
  };

  while (index < text.length) {
    if (text[index] !== '"') {
      index += 1;
      continue;
    }
    if (index > start) processGap(text.slice(start, index), start);
    const end = scanDoubleString(text, index);
    out.push(text.slice(index, end));
    index = end;
    start = end;
  }
  if (start < text.length) processGap(text.slice(start), start);
  return out.join('');
}

function replacePythonLiterals(text: string, fixes: RepairFix[]): string {
  const out: string[] = [];
  let start = 0;
  let index = 0;
  const regex = /\b(None|True|False)\b/g;

  const processGap = (chunk: string, baseOffset: number): void => {
    let lastIndex = 0;
    let newChunk = '';
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(chunk)) !== null) {
      newChunk += chunk.slice(lastIndex, match.index);
      const word = match[0];
      const after = word === 'None' ? 'null' : word === 'True' ? 'true' : 'false';
      const ambiguous = word === 'None';
      pushFix(fixes, text, baseOffset + match.index, 'pythonLiterals', word, after, descriptionFor('pythonLiterals'), ambiguous);
      newChunk += after;
      lastIndex = match.index + match[0].length;
    }
    newChunk += chunk.slice(lastIndex);
    out.push(newChunk);
  };

  while (index < text.length) {
    if (text[index] !== '"') {
      index += 1;
      continue;
    }
    if (index > start) processGap(text.slice(start, index), start);
    const end = scanDoubleString(text, index);
    out.push(text.slice(index, end));
    index = end;
    start = end;
  }
  if (start < text.length) processGap(text.slice(start), start);
  return out.join('');
}

function dropTrailingCommas(text: string, fixes: RepairFix[]): string {
  const regex = /,(\s*[}\]])/g;
  let current = text;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let changed = false;
    // We'll operate on current text
    const working = current;
    let i = 0;
    let s = 0;
    const segments: { chunk: string; base: number; isString: boolean }[] = [];
    while (i < working.length) {
      if (working[i] !== '"') {
        i += 1;
        continue;
      }
      if (i > s) segments.push({ chunk: working.slice(s, i), base: s, isString: false });
      const end = scanDoubleString(working, i);
      segments.push({ chunk: working.slice(i, end), base: i, isString: true });
      i = end;
      s = end;
    }
    if (s < working.length) segments.push({ chunk: working.slice(s), base: s, isString: false });

    let result = '';
    for (const seg of segments) {
      if (seg.isString) {
        result += seg.chunk;
        continue;
      }
      let lastIndex = 0;
      let newChunk = '';
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(seg.chunk)) !== null) {
        changed = true;
        const before = match[0];
        const after = match[1];
        pushFix(fixes, working, seg.base + match.index, 'trailingCommas', before, after, descriptionFor('trailingCommas'));
        newChunk += seg.chunk.slice(lastIndex, match.index) + after;
        lastIndex = match.index + match[0].length;
      }
      newChunk += seg.chunk.slice(lastIndex);
      result += newChunk;
    }
    current = result;
    if (!changed) break;
  }
  return current;
}

export function repairJson(
  text: string,
  options: { indent: 2 | 4 | 'tab' },
): RepairResult {
  const fixes: RepairFix[] = [];
  let repaired = stripComments(text, fixes);
  repaired = convertQuotes(repaired, fixes);
  repaired = quoteUnquotedKeys(repaired, fixes);
  repaired = replacePythonLiterals(repaired, fixes);
  repaired = dropTrailingCommas(repaired, fixes);

  let formatted: ReturnType<typeof formatJson>;
  try {
    formatted = formatJson(repaired, options);
  } catch (error) {
    if (error instanceof JsonFormatError) throw error;
    throw new JsonFormatError(
      'This document could not be repaired automatically.',
      'Fix automatically only handles common mistakes such as trailing commas, comments, and quote styles. Check the error above for the exact problem.',
      0,
      0,
      0,
    );
  }

  // Avoid an O(n*m) LCS on very large documents; the UI falls back to showing
  // the raw original and repaired text side by side when no diff is supplied.
  const repairedText = formatted.output ?? repaired;
  const diff =
    text.length + repairedText.length <= 1_000_000 ? diffLines(text, repairedText) : [];

  return {
    output: formatted.output,
    blob: null,
    stats: { ...formatted.stats, fixes },
    fixes,
    fixCount: fixes.length,
    diff,
  };
}