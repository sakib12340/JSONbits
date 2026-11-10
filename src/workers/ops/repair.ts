import type { RepairFix, RepairFixKind, RepairResult } from '../protocol';
import { formatJson } from './format';

interface FixCounts {
  comments: number;
  trailingCommas: number;
  singleQuotes: number;
  smartQuotes: number;
  unquotedKeys: number;
  pythonLiterals: number;
}

function emptyCounts(): FixCounts {
  return {
    comments: 0,
    trailingCommas: 0,
    singleQuotes: 0,
    smartQuotes: 0,
    unquotedKeys: 0,
    pythonLiterals: 0,
  };
}

function stripComments(text: string, counts: FixCounts): string {
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
      counts.comments += 1;
      index += 2;
      while (index < text.length && text[index] !== '\n') index += 1;
      out.push('\n');
      continue;
    }

    if (char === '/' && text[index + 1] === '*') {
      counts.comments += 1;
      index += 2;
      while (index + 1 < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        index += 1;
      }
      index = Math.min(index + 2, text.length);
      out.push(' ');
      continue;
    }

    out.push(char);
    index += 1;
  }

  return out.join('');
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

    if (char === closing) {
      return { value, end: index + 1 };
    }

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

function convertQuotes(text: string, counts: FixCounts): string {
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
      const result = readLooseString(text, index, "'");
      counts.singleQuotes += 1;
      out.push(JSON.stringify(result.value));
      index = result.end;
      continue;
    }

    if (char === '‘') {
      const result = readLooseString(text, index, '’');
      counts.smartQuotes += 1;
      out.push(JSON.stringify(result.value));
      index = result.end;
      continue;
    }

    if (char === '“') {
      const result = readLooseString(text, index, '”');
      counts.smartQuotes += 1;
      out.push(JSON.stringify(result.value));
      index = result.end;
      continue;
    }

    out.push(char);
    index += 1;
  }

  return out.join('');
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

/** Apply a transform only to text outside double-quoted strings. */
function outsideStrings(text: string, transform: (chunk: string) => string): string {
  const out: string[] = [];
  let start = 0;
  let index = 0;

  while (index < text.length) {
    if (text[index] !== '"') {
      index += 1;
      continue;
    }

    out.push(transform(text.slice(start, index)));
    const end = scanDoubleString(text, index);
    out.push(text.slice(index, end));
    index = end;
    start = end;
  }

  out.push(transform(text.slice(start)));
  return out.join('');
}

function quoteUnquotedKeys(text: string, counts: FixCounts): string {
  return outsideStrings(text, (chunk) =>
    chunk.replace(
      /([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g,
      (_match, prefix: string, key: string, suffix: string) => {
        counts.unquotedKeys += 1;
        return `${prefix}${JSON.stringify(key)}${suffix}`;
      },
    ),
  );
}

function replacePythonLiterals(text: string, counts: FixCounts): string {
  return outsideStrings(text, (chunk) =>
    chunk.replace(/\b(None|True|False)\b/g, (_match, word: string) => {
      counts.pythonLiterals += 1;
      if (word === 'None') return 'null';
      return word === 'True' ? 'true' : 'false';
    }),
  );
}

function dropTrailingCommas(text: string, counts: FixCounts): string {
  return outsideStrings(text, (chunk) => {
    let current = chunk;
    let next = current.replace(/,(\s*[}\]])/g, (_match, tail: string) => {
      counts.trailingCommas += 1;
      return tail;
    });

    while (next !== current) {
      current = next;
      next = current.replace(/,(\s*[}\]])/g, (_match, tail: string) => {
        counts.trailingCommas += 1;
        return tail;
      });
    }

    return current;
  });
}

function toFixes(counts: FixCounts): RepairFix[] {
  const kinds: RepairFixKind[] = [
    'trailingCommas',
    'singleQuotes',
    'smartQuotes',
    'unquotedKeys',
    'pythonLiterals',
    'comments',
  ];

  return kinds
    .filter((kind) => counts[kind] > 0)
    .map((kind) => ({ kind, count: counts[kind] }));
}

export function repairJson(
  text: string,
  options: { indent: 2 | 4 | 'tab' },
): RepairResult {
  const counts = emptyCounts();
  let repaired = stripComments(text, counts);
  repaired = convertQuotes(repaired, counts);
  repaired = quoteUnquotedKeys(repaired, counts);
  repaired = replacePythonLiterals(repaired, counts);
  repaired = dropTrailingCommas(repaired, counts);

  const formatted = formatJson(repaired, options);
  const fixes = toFixes(counts);

  return {
    output: formatted.output,
    blob: null,
    stats: { ...formatted.stats, fixes },
  };
}
