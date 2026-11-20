import type { JsonPath, JsonPathOptions, JsonPathResult } from '../protocol';
import { JsonFormatError, positionAt } from './errors';
import {
  formatPath,
  parseAst,
  serializeNode,
  type JsonNode,
} from './ast';
import { OutputBuilder } from './output';
import { countLines, utf8Length } from './stats';

const NAME = /^[A-Za-z_$][A-Za-z0-9_$]*/;
const NUMBER = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const VALUE_LIMIT = 20_000;
const OUTPUT_LIMIT = 2_000_000;

type Comparison = '==' | '!=' | '<' | '<=' | '>' | '>=';

type Selector =
  | { type: 'name'; name: string }
  | { type: 'index'; index: number }
  | { type: 'wildcard' }
  | { type: 'slice'; start?: number; end?: number; step?: number }
  | { type: 'descendant'; name: string | null }
  | { type: 'union'; selectors: Selector[] }
  | { type: 'filter'; condition: Condition };

type Literal =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'null' };

interface Atom {
  negated: boolean;
  path: JsonPath;
  operator?: Comparison;
  literal?: Literal;
}

interface Condition {
  or: Array<{ and: Atom[] }>;
}

interface Match {
  node: JsonNode;
  path: JsonPath;
}

const HINT = 'Examples: $.users[*].name, $..id, $[?(@.price < 10) && @.stock > 0].';

function errorAt(source: string, offset: number, message: string): never {
  const { line, column } = positionAt(source, offset);
  throw new JsonFormatError(message, HINT, offset, line, column);
}

function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let quote: string | null = null;
  let depth = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quote !== null) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (depth === 0 && text.startsWith(separator, index)) {
      parts.push(text.slice(start, index));
      index += separator.length - 1;
      start = index + 1;
    }
  }

  parts.push(text.slice(start));
  return parts.map((part) => part.trim());
}

function parseQuoted(text: string, source: string, offset: number): string {
  if (text.length < 2 || (text[0] !== '"' && text[0] !== "'") || text[text.length - 1] !== text[0]) {
    errorAt(source, offset, `Unterminated string ${text}`);
  }

  const body = text.slice(1, -1);

  if (text[0] === '"') {
    try {
      return JSON.parse(text) as string;
    } catch {
      errorAt(source, offset, `Invalid string ${text}`);
    }
  }

  return body.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

function parseLiteral(raw: string, source: string, offset: number): Literal {
  const text = raw.trim();

  if (text.length === 0) errorAt(source, offset, 'A filter needs a value to compare with');
  if (text === 'true') return { kind: 'boolean', value: true };
  if (text === 'false') return { kind: 'boolean', value: false };
  if (text === 'null') return { kind: 'null' };
  if (NUMBER.test(text)) return { kind: 'number', value: Number(text) };
  if (text[0] === '"' || text[0] === "'") {
    return { kind: 'string', value: parseQuoted(text, source, offset) };
  }

  return errorAt(source, offset, `Unknown filter value "${text}"`);
}

function parseAtom(text: string, source: string, offset: number): Atom {
  let body = text.trim();
  let negated = false;

  if (body.startsWith('!')) {
    negated = true;
    body = body.slice(1).trim();
  }

  if (!body.startsWith('@')) {
    errorAt(source, offset, `A filter condition must start with @, found "${body}"`);
  }

  const path: JsonPath = [];
  let index = 1;

  while (index < body.length) {
    const char = body[index];

    if (char === '.') {
      const match = NAME.exec(body.slice(index + 1));
      if (!match) errorAt(source, offset, 'A dot path needs a property name after it');
      path.push(match[0]);
      index += 1 + match[0].length;
      continue;
    }

    if (char === '[') {
      const close = body.indexOf(']', index);
      if (close < 0) errorAt(source, offset, 'A bracket path is missing its closing ]');
      const inner = body.slice(index + 1, close).trim();

      if (NUMBER.test(inner) && Number.isInteger(Number(inner))) {
        path.push(Number(inner));
      } else if (inner[0] === '"' || inner[0] === "'") {
        path.push(parseQuoted(inner, source, offset));
      } else {
        errorAt(source, offset, `Filter paths accept a property name or an index, found "${inner}"`);
      }

      index = close + 1;
      continue;
    }

    break;
  }

  const rest = body.slice(index).trim();
  if (rest.length === 0) return { negated, path };

  const comparison = /^(==|!=|<=|>=|<|>)\s*(.+)$/.exec(rest);
  if (!comparison) errorAt(source, offset, `Unexpected "${rest}" in a filter condition`);

  return {
    negated,
    path,
    operator: comparison[1] as Comparison,
    literal: parseLiteral(comparison[2], source, offset),
  };
}

function parseCondition(text: string, source: string, offset: number): Condition {
  const groups = splitTop(text, '||');

  return {
    or: groups.map((group) => {
      const atoms = splitTop(group, '&&').filter((atom) => atom.length > 0);
      if (atoms.length === 0) errorAt(source, offset, 'This filter condition is empty');
      return { and: atoms.map((atom) => parseAtom(atom, source, offset)) };
    }),
  };
}

function parseSelector(text: string, source: string, offset: number): Selector {
  const inner = text.trim();

  if (inner === '*') return { type: 'wildcard' };

  if (inner[0] === '"' || inner[0] === "'") {
    return { type: 'name', name: parseQuoted(inner, source, offset) };
  }

  if (NUMBER.test(inner) && Number.isInteger(Number(inner))) {
    return { type: 'index', index: Number(inner) };
  }

  if (inner.includes(':')) {
    const parts = inner.split(':');
    if (parts.length > 3) errorAt(source, offset, `Invalid slice "${inner}"`);

    const numbers = parts.map((part) => {
      const value = part.trim();
      if (value === '') return undefined;
      if (!NUMBER.test(value)) errorAt(source, offset, `Invalid slice number "${value}"`);
      return Number(value);
    });

    if (numbers[2] === 0) errorAt(source, offset, 'A slice step cannot be zero');
    return { type: 'slice', start: numbers[0], end: numbers[1], step: numbers[2] };
  }

  return errorAt(source, offset, `Unknown bracket selector "${inner}"`);
}

class ExpressionParser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(): Selector[] {
    const segments: Selector[] = [];
    this.skipSpace();
    if (this.source[this.index] === '$') this.index += 1;

    while (this.index < this.source.length) {
      this.skipSpace();
      if (this.index >= this.source.length) break;

      const char = this.source[this.index];

      if (char === '.') {
        this.index += 1;
        const descendant = this.source[this.index] === '.';
        if (descendant) this.index += 1;

        if (this.source[this.index] === '*') {
          this.index += 1;
          segments.push(descendant ? { type: 'descendant', name: null } : { type: 'wildcard' });
          continue;
        }

        const match = NAME.exec(this.source.slice(this.index));
        if (!match) errorAt(this.source, this.index, 'Expected a property name after "."');

        if (!descendant) {
          segments.push({ type: 'name', name: match[0] });
        } else {
          segments.push({ type: 'descendant', name: match[0] });
        }
        this.index += match[0].length;
        continue;
      }

      if (char === '[') {
        segments.push(this.bracket());
        continue;
      }

      errorAt(this.source, this.index, `Unexpected "${char}" in the expression`);
    }

    return segments;
  }

  private bracket(): Selector {
    const start = this.index;
    let depth = 0;
    let quote: string | null = null;
    let close = -1;

    for (let index = start; index < this.source.length; index += 1) {
      const char = this.source[index];

      if (quote !== null) {
        if (char === '\\') index += 1;
        else if (char === quote) quote = null;
        continue;
      }

      if (char === '"' || char === "'") quote = char;
      else if (char === '(') depth += 1;
      else if (char === ')') depth -= 1;
      else if (char === ']' && depth === 0) {
        close = index;
        break;
      }
    }

    if (close < 0) errorAt(this.source, start, 'This bracket is missing its closing ]');

    const inner = this.source.slice(start + 1, close).trim();
    this.index = close + 1;

    if (inner.length === 0) errorAt(this.source, start, 'This bracket is empty');

    if (inner === '*') return { type: 'wildcard' };

    if (inner.startsWith('?')) {
      if (!inner.startsWith('?(') || !inner.endsWith(')')) {
        errorAt(this.source, start, 'A filter must look like [?(@.key == value)]');
      }
      return {
        type: 'filter',
        condition: parseCondition(inner.slice(2, -1), this.source, start),
      };
    }

    const selectors = splitTop(inner, ',').map((part) => parseSelector(part, this.source, start));
    return selectors.length === 1 ? selectors[0] : { type: 'union', selectors };
  }

  private skipSpace(): void {
    while (this.index < this.source.length && /\s/.test(this.source[this.index])) {
      this.index += 1;
    }
  }
}

function children(match: Match): Match[] {
  const { node, path } = match;

  if (node.kind === 'object') {
    return node.entries.map((entry) => ({
      node: entry.value,
      path: [...path, entry.key],
    }));
  }

  if (node.kind === 'array') {
    return node.items.map((item, index) => ({
      node: item,
      path: [...path, index],
    }));
  }

  return [];
}

function resolvePath(node: JsonNode, path: JsonPath): JsonNode | null {
  let current: JsonNode | null = node;

  for (const segment of path) {
    if (!current) return null;
    if (current.kind === 'object') {
      if (typeof segment !== 'string') return null;
      let next: JsonNode | null = null;
      for (const entry of current.entries) {
        if (entry.key === segment) next = entry.value;
      }
      current = next;
      continue;
    }

    if (current.kind === 'array') {
      if (typeof segment !== 'number') return null;
      current = current.items[segment] ?? null;
      continue;
    }

    return null;
  }

  return current;
}

function compareNode(node: JsonNode, operator: Comparison, literal: Literal): boolean {
  const equality = operator === '==' || operator === '!=';
  let matched = false;

  if (literal.kind === 'number') {
    if (node.kind === 'number') {
      const value = Number(node.raw);
      matched =
        operator === '=='
          ? value === literal.value
          : operator === '!='
            ? value !== literal.value
            : operator === '<'
              ? value < literal.value
              : operator === '<='
                ? value <= literal.value
                : operator === '>'
                  ? value > literal.value
                  : value >= literal.value;
    } else {
      matched = operator === '!=';
    }
    return matched;
  }

  if (literal.kind === 'string') {
    if (node.kind !== 'string') return operator === '!=';
    const value = node.text;
    if (equality) matched = operator === '==' ? value === literal.value : value !== literal.value;
    else if (operator === '<') matched = value < literal.value;
    else if (operator === '<=') matched = value <= literal.value;
    else if (operator === '>') matched = value > literal.value;
    else matched = value >= literal.value;
    return matched;
  }

  if (literal.kind === 'boolean') {
    if (node.kind !== 'boolean') return operator === '!=';
    const value = node.raw === 'true';
    return operator === '==' ? value === literal.value : value !== literal.value;
  }

  if (node.kind !== 'null') return operator === '!=';
  return equality;
}

function matchesAtom(node: JsonNode, atom: Atom): boolean {
  const value = resolvePath(node, atom.path);

  if (!atom.operator) {
    const exists = value !== null;
    return atom.negated ? !exists : exists;
  }

  const matched = value !== null && compareNode(value, atom.operator, atom.literal as Literal);
  return atom.negated ? !matched : matched;
}

function matchesCondition(node: JsonNode, condition: Condition): boolean {
  return condition.or.some((group) => group.and.every((atom) => matchesAtom(node, atom)));
}

function applySlice(match: Match, selector: Extract<Selector, { type: 'slice' }>): Match[] {
  if (match.node.kind !== 'array') return [];
  const items = match.node.items;
  const length = items.length;
  const step = selector.step ?? 1;
  const out: Match[] = [];

  const normalize = (value: number | undefined, fallback: number): number => {
    if (value === undefined) return fallback;
    return value < 0 ? Math.max(length + value, 0) : value;
  };

  if (step > 0) {
    const start = normalize(selector.start, 0);
    const end = selector.end === undefined ? length : selector.end < 0 ? length + selector.end : selector.end;

    for (let index = start; index < Math.min(end, length); index += step) {
      if (index >= 0) out.push({ node: items[index], path: [...match.path, index] });
    }
    return out;
  }

  const start = selector.start === undefined ? length - 1 : selector.start < 0 ? length + selector.start : selector.start;
  const end = normalize(selector.end, -1);

  for (let index = Math.min(start, length - 1); index > end; index += step) {
    if (index >= 0) out.push({ node: items[index], path: [...match.path, index] });
  }

  return out;
}

function applyOne(match: Match, selector: Selector, limit: number): Match[] {
  switch (selector.type) {
    case 'name': {
      if (match.node.kind !== 'object') return [];
      const out: Match[] = [];
      for (const entry of match.node.entries) {
        if (entry.key !== selector.name) continue;
        out.push({ node: entry.value, path: [...match.path, entry.key] });
        if (out.length >= limit) break;
      }
      return out;
    }

    case 'index': {
      if (match.node.kind !== 'array') return [];
      const index = selector.index < 0 ? match.node.items.length + selector.index : selector.index;
      const node = match.node.items[index];
      return node ? [{ node, path: [...match.path, index] }] : [];
    }

    case 'wildcard':
      return children(match).slice(0, limit);

    case 'slice':
      return applySlice(match, selector);

    case 'union': {
      const out: Match[] = [];
      for (const child of selector.selectors) {
        out.push(...applyOne(match, child, limit - out.length));
        if (out.length >= limit) break;
      }
      return out;
    }

    case 'filter': {
      const out: Match[] = [];
      for (const child of children(match)) {
        if (!matchesCondition(child.node, selector.condition)) continue;
        out.push(child);
        if (out.length >= limit) break;
      }
      return out;
    }

    case 'descendant': {
      const out: Match[] = [];
      const stack: Match[] = [match];

      while (stack.length > 0) {
        const current = stack.pop() as Match;
        const next = children(current);

        for (const child of next) {
          if (selector.name === null || selector.name === '*') {            out.push(child);
            if (out.length >= limit) return out;
          } else if (
            typeof child.path[child.path.length - 1] === 'string' &&
            child.path[child.path.length - 1] === selector.name
          ) {
            out.push(child);
            if (out.length >= limit) return out;
          }
        }

        for (let index = next.length - 1; index >= 0; index -= 1) {
          stack.push(next[index]);
        }
      }

      return out;
    }
  }
}

function applySegment(matches: Match[], selector: Selector, limit: number): Match[] {
  const out: Match[] = [];

  for (const match of matches) {
    out.push(...applyOne(match, selector, limit - out.length));
    if (out.length >= limit) break;
  }

  return out;
}

/** Runs a JSONPath subset and returns every match as a `{ path, value }` object. */
export function queryJsonPath(text: string, options: JsonPathOptions): JsonPathResult {
  const started = performance.now();
  const expression = options.expression.trim();

  if (expression.length === 0) {
    errorAt(expression, 0, 'Expression: Enter a JSONPath expression');
  }

  const { root } = parseAst(text);
  let segments: Selector[];

  try {
    segments = new ExpressionParser(expression).parse();
  } catch (error) {
    if (error instanceof JsonFormatError) {
      throw new JsonFormatError(
        `Expression: ${error.message}`,
        error.hint,
        error.offset,
        error.line,
        error.column,
      );
    }
    throw error;
  }
  const limit = Math.max(1, Math.min(options.limit, 10_000));

  let matches: Match[] = [{ node: root, path: [] }];
  let truncated = false;

  for (const segment of segments) {
    if (matches.length === 0) break;
    matches = applySegment(matches, segment, limit);
    if (matches.length >= limit) {
      truncated = true;
      matches = matches.slice(0, limit);
      break;
    }
  }

  const output = new OutputBuilder();
  output.push('{\n  "expression": ', JSON.stringify(expression), ',\n  "matches": [');

  let outputSize = 0;
  let written = 0;

  for (const match of matches) {
    const serialized = serializeNode(match.node, VALUE_LIMIT);
    const valueText =
      serialized.text === null ? 'null' : serialized.text.replace(/\n/g, '\n      ');
    const size = valueText.length + 120;

    if (outputSize + size > OUTPUT_LIMIT && written > 0) {
      truncated = true;
      break;
    }

    const entry = [
      written === 0 ? '\n' : ',\n',
      '    {\n      "path": ',
      JSON.stringify(formatPath(match.path)),
      ',\n      "type": ',
      JSON.stringify(match.node.kind),
      ',\n      "value": ',
      valueText,
    ];

    if (serialized.text === null) entry.push(',\n      "valueTruncated": true');
    entry.push('\n    }');

    for (const part of entry) output.push(part);
    outputSize += size;
    written += 1;
  }

  if (written > 0) output.push('\n  ');
  output.push(
    '],\n  "total": ',
    String(matches.length),
    ',\n  "truncated": ',
    truncated ? 'true' : 'false',
    ',\n  "timeMs": ',
    String(Math.round((performance.now() - started) * 10) / 10),
    '\n}',
  );

  const result = output.toString();
  const timeMs = Math.round((performance.now() - started) * 10) / 10;

  return {
    output: result,
    blob: null,
    stats: {
      bytes: utf8Length(text),
      outputBytes: utf8Length(result),
      lines: countLines(result),
      matches: written,
      total: matches.length,
      truncated,
      parseTimeMs: timeMs,
    },
  };
}
