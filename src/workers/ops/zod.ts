import type { InferResult, ZodOptions } from '../protocol';
import { parseAst, type JsonNode } from './ast';
import { countLines, utf8Length } from './stats';

type ObjectNode = Extract<JsonNode, { kind: 'object' }>;

interface Context {
  options: ZodOptions;
  properties: number;
  types: number;
}

function pascal(text: string): string {
  const words = text
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  const joined = words.join('');
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(joined) ? joined : 'Root';
}

function propertyName(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function stringSchema(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return 'z.iso.datetime()';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'z.iso.date()';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'z.email()';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return 'z.uuid()';
  if (/^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(value)) return 'z.url()';
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every((n) => Number(n) <= 255)) return 'z.ipv4()';
  return 'z.string()';
}

function emitValue(nodes: JsonNode[], indent: number, ctx: Context): string {
  ctx.types += 1;
  const groups = new Map<string, JsonNode[]>();
  for (const node of nodes) {
    const key = node.kind === 'number' ? (Number.isInteger(Number(node.raw)) ? 'integer' : 'number') : node.kind;
    const list = groups.get(key) ?? [];
    list.push(node);
    groups.set(key, list);
  }

  const parts = [...groups.entries()].map(([kind, list]) => {
    if (kind === 'object') return emitShape(list as ObjectNode[], indent, ctx);
    if (kind === 'array') {
      const items = list.flatMap((node) => (node.kind === 'array' ? node.items : []));
      return `z.array(${emitValue(items, indent + 2, ctx)})`;
    }
    if (kind === 'string') {
      const values = list.filter((node) => node.kind === 'string').map((node) => (node.kind === 'string' ? node.text : ''));
      const formats = new Set(values.map(stringSchema));
      if (formats.size === 1) return [...formats][0];
      return `z.union([${[...formats].sort().join(', ')}])`;
    }
    if (kind === 'integer' || kind === 'number') return 'z.number()';
    if (kind === 'boolean') return 'z.boolean()';
    return 'z.null()';
  });

  const unique = [...new Set(parts)];
  if (unique.length === 1) return unique[0];
  return `z.union([${unique.join(', ')}])`;
}

function emitShape(objects: ObjectNode[], indent: number, ctx: Context): string {
  const keys = [...new Set(objects.flatMap((object) => object.entries.map((entry) => entry.key)))];
  if (keys.length === 0) return ctx.options.strict ? 'z.strictObject({})' : 'z.object({})';
  const pad = ' '.repeat(indent + 2);
  const lines = keys.map((key) => {
    const values = objects
      .map((object) => object.entries.find((entry) => entry.key === key)?.value)
      .filter((value): value is JsonNode => value !== undefined);
    ctx.properties += 1;
    const nulls = values.filter((value) => value.kind === 'null');
    const hasNull = nulls.length > 0;
    const onlyNull = hasNull && nulls.length === values.length;
    const emitValues =
      hasNull && ctx.options.optionalNullable && !onlyNull
        ? values.filter((value) => value.kind !== 'null')
        : values;
    let expr = emitValue(emitValues, indent + 2, ctx);
    if (ctx.options.optionalNullable) {
      if (hasNull && !onlyNull) expr = `z.nullable(${expr})`;
      if (values.length < objects.length) expr = `${expr}.optional()`;
    }
    return `${pad}${propertyName(key)}: ${expr},`;
  });
  const fn = ctx.options.strict ? 'z.strictObject' : 'z.object';
  return `${fn}({\n${lines.join('\n')}\n${' '.repeat(indent)}})`;
}

export function jsonToZod(text: string, options: ZodOptions): InferResult {
  const started = performance.now();
  const { root } = parseAst(text);
  const ctx: Context = { options, properties: 0, types: 0 };
  const name = pascal(options.schemaName.trim() || 'Root');
  const expr = root.kind === 'object'
    ? emitShape([root], 0, ctx)
    : emitValue([root], 0, ctx);

  const keyword = options.exportKeyword ? 'export const' : 'const';
  const lines = [`import { z } from "zod";`, '', `${keyword} ${name} = ${expr};`];
  if (options.inferType) {
    lines.push('', `export type ${name} = z.infer<typeof ${name}>;`);
  }
  const result = `${lines.join('\n')}\n`;

  return {
    output: result,
    blob: null,
    stats: {
      bytes: utf8Length(text),
      outputBytes: utf8Length(result),
      lines: countLines(result),
      properties: ctx.properties,
      types: ctx.types,
      parseTimeMs: Math.round((performance.now() - started) * 10) / 10,
    },
  };
}
