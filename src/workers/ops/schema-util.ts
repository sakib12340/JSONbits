import type { JsonType } from '../protocol';
import type { JsonNode } from './ast';
import { canonical } from './ast';

type ObjectNode = Extract<JsonNode, { kind: 'object' }>;
type ArrayNode = Extract<JsonNode, { kind: 'array' }>;

const SUPPORTED = new Set([
  '$ref',
  'type',
  'enum',
  'const',
  'properties',
  'required',
  'additionalProperties',
  'minProperties',
  'maxProperties',
  'items',
  'additionalItems',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minLength',
  'maxLength',
  'pattern',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
]);

const ANNOTATIONS = new Set([
  '$schema',
  '$id',
  '$comment',
  'title',
  'description',
  'default',
  'examples',
  'readOnly',
  'writeOnly',
  'deprecated',
  '$defs',
  'definitions',
  'contentEncoding',
  'contentMediaType',
]);

const MAP_KEYS = new Set(['properties', '$defs', 'definitions']);
const LIST_KEYS = new Set(['allOf', 'anyOf', 'oneOf']);
const SINGLE_KEYS = new Set([
  'additionalProperties',
  'additionalItems',
  'not',
]);

export function field(node: JsonNode, key: string): JsonNode | undefined {
  if (node.kind !== 'object') return undefined;

  let found: JsonNode | undefined;
  for (const entry of node.entries) {
    if (entry.key === key) found = entry.value;
  }
  return found;
}

export function stringField(node: JsonNode, key: string): string | undefined {
  const value = field(node, key);
  return value?.kind === 'string' ? value.text : undefined;
}

export function numberField(node: JsonNode, key: string): number | undefined {
  const value = field(node, key);
  return value?.kind === 'number' ? Number(value.raw) : undefined;
}

export function booleanField(node: JsonNode, key: string): boolean | undefined {
  const value = field(node, key);
  if (value?.kind !== 'boolean') return undefined;
  return value.raw === 'true';
}

export function asObject(node: JsonNode): ObjectNode | null {
  return node.kind === 'object' ? node : null;
}

export function asArray(node: JsonNode): ArrayNode | null {
  return node.kind === 'array' ? node : null;
}

export function sameValue(node: JsonNode, schemaValue: JsonNode): boolean {
  return canonical(node) === canonical(schemaValue);
}

export function describeNode(node: JsonNode): string {
  switch (node.kind) {
    case 'object':
      return 'an object';
    case 'array':
      return 'an array';
    case 'string':
      return 'a string';
    case 'number':
      return Number.isInteger(Number(node.raw)) ? 'an integer' : 'a number';
    case 'boolean':
      return 'a boolean';
    case 'null':
      return 'null';
  }
}

export function typeName(type: string): string {
  switch (type) {
    case 'object':
      return 'an object';
    case 'array':
      return 'an array';
    case 'string':
      return 'a string';
    case 'number':
      return 'a number';
    case 'integer':
      return 'an integer';
    case 'boolean':
      return 'a boolean';
    case 'null':
      return 'null';
    default:
      return type;
  }
}

export function isJsonType(value: string): value is JsonType | 'integer' {
  return (
    value === 'object' ||
    value === 'array' ||
    value === 'string' ||
    value === 'number' ||
    value === 'integer' ||
    value === 'boolean' ||
    value === 'null'
  );
}

export function matchesType(node: JsonNode, type: JsonType | 'integer'): boolean {
  if (type === 'integer') {
    return node.kind === 'number' && Number.isInteger(Number(node.raw));
  }
  return node.kind === type;
}

/** Resolve a local JSON pointer such as `#/$defs/Address`. */
export function resolvePointer(root: JsonNode, ref: string): JsonNode | null {
  if (ref === '#') return root;
  if (!ref.startsWith('#/')) return null;

  const segments = ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  let node: JsonNode = root;

  for (const segment of segments) {
    if (node.kind === 'object') {
      const next = field(node, segment);
      if (next === undefined) return null;
      node = next;
      continue;
    }

    if (node.kind === 'array') {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return null;
      const next = node.items[Number(segment)];
      if (next === undefined) return null;
      node = next;
      continue;
    }

    return null;
  }

  return node;
}

/** Keywords present in the schema that this validator does not evaluate. */
export function scanUnsupported(root: JsonNode): string[] {
  const found = new Set<string>();
  const seen = new Set<JsonNode>();

  const walk = (schema: JsonNode): void => {
    if (schema.kind !== 'object' || seen.has(schema)) return;
    seen.add(schema);

    for (const entry of schema.entries) {
      const key = entry.key;

      if (ANNOTATIONS.has(key)) continue;
      if (!SUPPORTED.has(key)) found.add(key);

      if (key === 'items') {
        if (entry.value.kind === 'array') {
          for (const item of entry.value.items) walk(item);
        } else {
          walk(entry.value);
        }
        continue;
      }

      if (SINGLE_KEYS.has(key)) {
        walk(entry.value);
        continue;
      }

      if (LIST_KEYS.has(key) && entry.value.kind === 'array') {
        for (const item of entry.value.items) walk(item);
        continue;
      }

      if (MAP_KEYS.has(key) && entry.value.kind === 'object') {
        for (const item of entry.value.entries) walk(item.value);
      }
    }
  };

  walk(root);
  return [...found].sort();
}
