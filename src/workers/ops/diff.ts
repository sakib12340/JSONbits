import type { DiffEntry, DiffOptions, DiffResult, DiffStats } from '../protocol';
import { JsonFormatError } from './errors';
import {
  canonical,
  nodePreview,
  objectMap,
  parseAst,
  type JsonNode,
} from './ast';

const MAX_ENTRIES = 10_000;

class DiffCollector {
  readonly entries: DiffEntry[] = [];
  readonly counts = { added: 0, removed: 0, changed: 0 };

  add(type: DiffEntry['type'], path: string, before?: JsonNode, after?: JsonNode): void {
    this.counts[type] += 1;

    if (this.entries.length >= MAX_ENTRIES) return;

    this.entries.push({
      type,
      path,
      old: before ? nodePreview(before, 90) : undefined,
      new: after ? nodePreview(after, 90) : undefined,
    });
  }

  get total(): number {
    return this.counts.added + this.counts.removed + this.counts.changed;
  }
}

function joinKey(parent: string, key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `${parent}.${key}`;
  return `${parent}[${JSON.stringify(key)}]`;
}

function compare(
  left: JsonNode,
  right: JsonNode,
  path: string,
  collector: DiffCollector,
  options: DiffOptions,
): void {
  if (left.kind !== right.kind) {
    collector.add('changed', path, left, right);
    return;
  }

  if (left.kind === 'object' && right.kind === 'object') {
    const leftMap = objectMap(left);
    const rightMap = objectMap(right);

    for (const [key, value] of leftMap) {
      const other = rightMap.get(key);

      if (!other) {
        collector.add('removed', joinKey(path, key), value);
      } else {
        compare(value, other, joinKey(path, key), collector, options);
      }
    }

    for (const [key, value] of rightMap) {
      if (!leftMap.has(key)) collector.add('added', joinKey(path, key), undefined, value);
    }

    return;
  }

  if (left.kind === 'array' && right.kind === 'array') {
    if (options.ignoreArrayOrder) {
      compareArrayAsSet(left.items, right.items, path, collector);
      return;
    }

    const shared = Math.min(left.items.length, right.items.length);

    for (let index = 0; index < shared; index += 1) {
      compare(left.items[index], right.items[index], `${path}[${index}]`, collector, options);
    }

    for (let index = shared; index < left.items.length; index += 1) {
      collector.add('removed', `${path}[${index}]`, left.items[index]);
    }

    for (let index = shared; index < right.items.length; index += 1) {
      collector.add('added', `${path}[${index}]`, undefined, right.items[index]);
    }

    return;
  }

  if (left.kind === 'string' && right.kind === 'string') {
    if (left.text !== right.text) collector.add('changed', path, left, right);
    return;
  }

  if (left.kind === 'number' && right.kind === 'number') {
    if (left.raw !== right.raw) collector.add('changed', path, left, right);
    return;
  }

  if (left.kind === 'boolean' && right.kind === 'boolean') {
    if (left.raw !== right.raw) collector.add('changed', path, left, right);
    return;
  }

  if (left.kind === 'null' && right.kind === 'null') return;

  collector.add('changed', path, left, right);
}

function compareArrayAsSet(
  left: JsonNode[],
  right: JsonNode[],
  path: string,
  collector: DiffCollector,
): void {
  const rightCounts = new Map<string, number>();
  const leftCounts = new Map<string, number>();

  for (const item of right) {
    const key = canonical(item);
    rightCounts.set(key, (rightCounts.get(key) ?? 0) + 1);
  }

  for (const item of left) {
    const key = canonical(item);
    const count = rightCounts.get(key) ?? 0;

    if (count > 0) {
      rightCounts.set(key, count - 1);
    } else {
      collector.add('removed', path, item);
    }

    leftCounts.set(key, (leftCounts.get(key) ?? 0) + 1);
  }

  for (const item of right) {
    const key = canonical(item);
    const count = leftCounts.get(key) ?? 0;

    if (count > 0) {
      leftCounts.set(key, count - 1);
    } else {
      collector.add('added', path, undefined, item);
    }
  }
}

function withSide(error: unknown, side: 'Left' | 'Right'): never {
  if (error instanceof JsonFormatError) {
    throw new JsonFormatError(
      `${side} input: ${error.message}`,
      error.hint,
      error.offset,
      error.line,
      error.column,
    );
  }

  throw error;
}

export function diffJson(
  leftText: string,
  rightText: string,
  options: DiffOptions,
): DiffResult {
  const started = performance.now();
  let left;
  let right;

  try {
    left = parseAst(leftText);
  } catch (error) {
    withSide(error, 'Left');
  }

  try {
    right = parseAst(rightText);
  } catch (error) {
    withSide(error, 'Right');
  }

  const collector = new DiffCollector();
  compare(left.root, right.root, '$', collector, options);

  const stats: DiffStats = {
    added: collector.counts.added,
    removed: collector.counts.removed,
    changed: collector.counts.changed,
    total: collector.total,
    leftBytes: left.stats.bytes,
    rightBytes: right.stats.bytes,
    parseTimeMs: Math.round((performance.now() - started) * 10) / 10,
    truncated: collector.entries.length < collector.total,
  };

  return { entries: collector.entries, stats };
}
