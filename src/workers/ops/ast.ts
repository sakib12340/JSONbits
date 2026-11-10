import type { FormatStats, JsonPath, JsonType } from '../protocol';
import { parseJson, type JsonSink } from './parser';

export type JsonNode =
  | { kind: 'object'; entries: Array<{ key: string; value: JsonNode }> }
  | { kind: 'array'; items: JsonNode[] }
  | { kind: 'string'; raw: string; text: string }
  | { kind: 'number'; raw: string }
  | { kind: 'boolean'; raw: string }
  | { kind: 'null'; raw: 'null' };

type ContainerNode = Extract<JsonNode, { kind: 'object' | 'array' }>;

export interface AstResult {
  root: JsonNode;
  stats: FormatStats;
}

class AstSink implements JsonSink {
  root: JsonNode | null = null;
  private readonly stack: ContainerNode[] = [];
  private pendingKey: string | null = null;

  openObject(): void {
    const node: JsonNode = { kind: 'object', entries: [] };
    this.attach(node);
    this.stack.push(node);
  }

  closeObject(): void {
    this.stack.pop();
  }

  openArray(): void {
    const node: JsonNode = { kind: 'array', items: [] };
    this.attach(node);
    this.stack.push(node);
  }

  closeArray(): void {
    this.stack.pop();
  }

  key(raw: string): void {
    this.pendingKey = decodeJsonString(raw);
  }

  element(): void {}

  value(raw: string): void {
    this.attach(scalarFromRaw(raw));
  }

  colon(): void {}
  comma(): void {}

  private attach(node: JsonNode): void {
    const parent = this.stack[this.stack.length - 1];

    if (!parent) {
      this.root = node;
      return;
    }

    if (parent.kind === 'object') {
      parent.entries.push({ key: this.pendingKey ?? '', value: node });
      this.pendingKey = null;
      return;
    }

    parent.items.push(node);
  }
}

export function parseAst(text: string): AstResult {
  const sink = new AstSink();
  const stats = parseJson(text, sink);

  if (!sink.root) {
    throw new Error('The parser returned no root value.');
  }

  return { root: sink.root, stats };
}

export function decodeJsonString(raw: string): string {
  try {
    return JSON.parse(raw) as string;
  } catch {
    return raw.slice(1, -1);
  }
}

function scalarFromRaw(raw: string): JsonNode {
  const first = raw.charAt(0);

  if (first === '"') return { kind: 'string', raw, text: decodeJsonString(raw) };
  if (raw === 'true' || raw === 'false') return { kind: 'boolean', raw };
  if (raw === 'null') return { kind: 'null', raw: 'null' };
  return { kind: 'number', raw };
}

export function nodeType(node: JsonNode): JsonType {
  return node.kind;
}

export function childCount(node: JsonNode): number {
  if (node.kind === 'object') return node.entries.length;
  if (node.kind === 'array') return node.items.length;
  return 0;
}

export function hasChildren(node: JsonNode): boolean {
  return childCount(node) > 0;
}

export function objectMap(node: Extract<JsonNode, { kind: 'object' }>): Map<string, JsonNode> {
  const map = new Map<string, JsonNode>();
  for (const entry of node.entries) map.set(entry.key, entry.value);
  return map;
}

export function findChild(node: JsonNode, segment: string | number): JsonNode | null {
  if (node.kind === 'object') {
    if (typeof segment !== 'string') return null;
    for (let index = node.entries.length - 1; index >= 0; index -= 1) {
      if (node.entries[index].key === segment) return node.entries[index].value;
    }
    return null;
  }

  if (node.kind === 'array') {
    if (typeof segment !== 'number' || !Number.isInteger(segment)) return null;
    return node.items[segment] ?? null;
  }

  return null;
}

export function findNode(root: JsonNode, path: JsonPath): JsonNode | null {
  let node: JsonNode | null = root;

  for (const segment of path) {
    if (!node) return null;
    node = findChild(node, segment);
  }

  return node;
}

export function nodePreview(node: JsonNode, limit = 72): string {
  if (node.kind === 'object') return `{…} ${node.entries.length} keys`;
  if (node.kind === 'array') return `[…] ${node.items.length} items`;
  if (node.kind === 'string') {
    const text = node.text.length > limit ? `${node.text.slice(0, limit)}…` : node.text;
    return JSON.stringify(text);
  }
  return node.raw;
}

export function formatPath(path: JsonPath): string {
  let out = '$';

  for (const segment of path) {
    if (typeof segment === 'number') {
      out += `[${segment}]`;
    } else if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)) {
      out += `.${segment}`;
    } else {
      out += `[${JSON.stringify(segment)}]`;
    }
  }

  return out;
}

export interface SerializedValue {
  text: string | null;
  size: number;
}

class ValueWriter {
  private readonly parts: string[] = [];
  private length = 0;
  private overflow = false;

  constructor(private readonly limit: number) {}

  get ok(): boolean {
    return !this.overflow;
  }

  get size(): number {
    return this.length;
  }

  write(text: string): void {
    if (this.overflow) return;

    if (this.length + text.length > this.limit) {
      this.overflow = true;
      this.parts.length = 0;
      this.length = this.limit + 1;
      return;
    }

    this.parts.push(text);
    this.length += text.length;
  }

  toString(): string {
    return this.parts.join('');
  }
}

function writeIndent(writer: ValueWriter, depth: number): void {
  writer.write(' '.repeat(depth * 2));
}

function writeNode(writer: ValueWriter, node: JsonNode, depth: number): void {
  if (!writer.ok) return;

  if (node.kind === 'object') {
    if (node.entries.length === 0) {
      writer.write('{}');
      return;
    }

    writer.write('{\n');
    for (let index = 0; index < node.entries.length; index += 1) {
      if (!writer.ok) return;
      const entry = node.entries[index];
      writeIndent(writer, depth + 1);
      writer.write(JSON.stringify(entry.key));
      writer.write(': ');
      writeNode(writer, entry.value, depth + 1);
      if (index < node.entries.length - 1) writer.write(',');
      writer.write('\n');
    }
    writeIndent(writer, depth);
    writer.write('}');
    return;
  }

  if (node.kind === 'array') {
    if (node.items.length === 0) {
      writer.write('[]');
      return;
    }

    writer.write('[\n');
    for (let index = 0; index < node.items.length; index += 1) {
      if (!writer.ok) return;
      writeIndent(writer, depth + 1);
      writeNode(writer, node.items[index], depth + 1);
      if (index < node.items.length - 1) writer.write(',');
      writer.write('\n');
    }
    writeIndent(writer, depth);
    writer.write(']');
    return;
  }

  // The raw token keeps the original number precision and string escapes.
  writer.write(node.raw);
}

/** Serializes one node as pretty JSON without losing big-number precision. */
export function serializeNode(node: JsonNode, limit: number): SerializedValue {
  const writer = new ValueWriter(limit);
  writeNode(writer, node, 0);

  return writer.ok
    ? { text: writer.toString(), size: writer.size }
    : { text: null, size: writer.size };
}

/** Stable text for order-independent array matching. */
export function canonical(node: JsonNode): string {
  if (node.kind === 'object') {
    const map = objectMap(node);
    const keys = [...map.keys()].sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(map.get(key) as JsonNode)}`).join(',')}}`;
  }

  if (node.kind === 'array') {
    return `[${node.items.map(canonical).join(',')}]`;
  }

  if (node.kind === 'string') return JSON.stringify(node.text);
  return node.raw;
}
