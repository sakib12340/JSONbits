import type { InferResult, JsonToJsonSchemaOptions } from '../protocol';
import { parseAst, type JsonNode } from './ast';
import { countLines, utf8Length } from './stats';

type Schema = Record<string, unknown>;

const FORMATS: Array<{ name: string; test: (value: string) => boolean }> = [
  { name: 'date-time', test: (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) },
  { name: 'date', test: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) },
  { name: 'email', test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
  { name: 'uri', test: (v) => /^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(v) },
  { name: 'uuid', test: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) },
  { name: 'ipv4', test: (v) => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(v) && v.split('.').every((n) => Number(n) <= 255) },
];

function asTypes(schema: Schema): string[] {
  const type = schema.type;
  if (Array.isArray(type)) return type as string[];
  return typeof type === 'string' ? [type] : [];
}

function merge(a: Schema, b: Schema): Schema {
  const types = [...new Set([...asTypes(a), ...asTypes(b)])];
  const merged: Schema = { type: types.length === 1 ? types[0] : types };

  const aProps = a.properties as Record<string, Schema> | undefined;
  const bProps = b.properties as Record<string, Schema> | undefined;
  if (aProps || bProps) {
    const properties: Record<string, Schema> = {};
    const keys = [...new Set([...(aProps ? Object.keys(aProps) : []), ...(bProps ? Object.keys(bProps) : [])])];
    for (const key of keys) {
      properties[key] =
        aProps?.[key] && bProps?.[key]
          ? merge(aProps[key], bProps[key])
          : (aProps?.[key] ?? bProps?.[key] as Schema);
    }
    merged.properties = properties;
    const aRequired = new Set((a.required as string[] | undefined) ?? []);
    const bRequired = new Set((b.required as string[] | undefined) ?? []);
    merged.required = keys.filter((key) => aRequired.has(key) && bRequired.has(key));
    if ((merged.required as string[]).length === 0) delete merged.required;
  }
  if (a.items || b.items) {
    merged.items = a.items && b.items ? merge(a.items as Schema, b.items as Schema) : (a.items ?? b.items);
  }
  const aEnum = a.enum as string[] | undefined;
  const bEnum = b.enum as string[] | undefined;
  if (aEnum && bEnum) {
    const values = [...new Set([...aEnum, ...bEnum])];
    if (values.length <= 12) merged.enum = values;
  } else if (aEnum) merged.enum = aEnum;
  else if (bEnum) merged.enum = bEnum;
  const aFormat = a.format as string | undefined;
  const bFormat = b.format as string | undefined;
  if (aFormat === bFormat && aFormat) merged.format = aFormat;
  return merged;
}

interface Context {
  options: JsonToJsonSchemaOptions;
  properties: number;
  types: number;
}

function infer(node: JsonNode, ctx: Context): Schema {
  ctx.types += 1;
  switch (node.kind) {
    case 'object': {
      const properties: Record<string, Schema> = {};
      const required: string[] = [];
      for (const entry of node.entries) {
        properties[entry.key] = infer(entry.value, ctx);
        ctx.properties += 1;
        required.push(entry.key);
      }
      const schema: Schema = { type: 'object', properties };
      if (required.length > 0) schema.required = required;
      if (ctx.options.additionalProperties) schema.additionalProperties = false;
      return schema;
    }
    case 'array': {
      if (node.items.length === 0) return { type: 'array', items: {} };
      let items = infer(node.items[0], ctx);
      for (let index = 1; index < node.items.length; index += 1) {
        items = merge(items, infer(node.items[index], ctx));
      }
      return { type: 'array', items };
    }
    case 'string': {
      const schema: Schema = { type: 'string' };
      if (ctx.options.detectFormats) {
        const format = FORMATS.find((entry) => entry.test(node.text));
        if (format) schema.format = format.name;
      }
      return schema;
    }
    case 'number':
      return { type: Number.isInteger(Number(node.raw)) ? 'integer' : 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'null':
      return { type: 'null' };
  }
}

/** Adds optional low-cardinality enums to string properties in object arrays. */
function addEnums(schema: Schema, node: JsonNode, options: JsonToJsonSchemaOptions): void {
  if (!options.detectEnums) return;

  if (node.kind === 'object') {
    const props = schema.properties as Record<string, Schema> | undefined;
    if (!props) return;
    for (const entry of node.entries) {
      if (props[entry.key]) addEnums(props[entry.key], entry.value, options);
    }
    return;
  }

  if (node.kind !== 'array') return;
  const items = schema.items as Schema | undefined;
  if (!items) return;
  const props = items.properties as Record<string, Schema> | undefined;
  const objects = node.items.filter((item) => item.kind === 'object') as ObjectNode[];
  if (props && objects.length >= 2) {
    for (const key of Object.keys(props)) {
      const values = objects
        .map((object) => object.entries.find((entry) => entry.key === key)?.value)
        .filter((value): value is JsonNode => value?.kind === 'string')
        .map((value) => (value.kind === 'string' ? value.text : ''));
      const unique = [...new Set(values)];
      if (unique.length >= 2 && unique.length <= 8) props[key] = { ...props[key], enum: unique };
    }
  }
  // The merged items schema is shared; recurse with it for each element.
  for (const item of node.items) addEnums(items, item, options);
}

type ObjectNode = Extract<JsonNode, { kind: 'object' }>;

export function jsonToJsonSchema(text: string, options: JsonToJsonSchemaOptions): InferResult {
  const started = performance.now();
  const { root } = parseAst(text);
  const ctx: Context = { options, properties: 0, types: 0 };
  const body = infer(root, ctx);
  addEnums(body, root, options);

  const output: Record<string, unknown> = {};
  if (options.includeSchema) {
    output.$schema =
      options.draft === '2020-12'
        ? 'https://json-schema.org/draft/2020-12/schema'
        : 'http://json-schema.org/draft-07/schema#';
  }
  if (options.includeTitle && options.title.trim()) output.title = options.title.trim();
  Object.assign(output, body);

  const result = JSON.stringify(output, null, 2);
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
