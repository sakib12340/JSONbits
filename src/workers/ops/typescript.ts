import type { TypescriptOptions, TypescriptResult } from '../protocol';
import { parseAst, type JsonNode } from './ast';
import { JsonFormatError } from './errors';
import { countLines, utf8Length } from './stats';

interface Field {
  name: string;
  type: string;
  optional: boolean;
}

interface Declaration {
  name: string;
  fields?: Field[];
  alias?: string;
}

type ObjectNode = Extract<JsonNode, { kind: 'object' }>;
type ArrayNode = Extract<JsonNode, { kind: 'array' }>;

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const MAX_VALUES = 500_000;
const MAX_UNION = 8;

function pascal(text: string): string {
  const words = text
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const joined = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return IDENTIFIER.test(joined) ? joined : 'Item';
}

function singular(text: string): string {
  if (/ies$/i.test(text)) return `${text.slice(0, -3)}y`;
  if (/(ses|xes|zes|ches|shes)$/i.test(text)) return text.slice(0, -2);
  if (/s$/i.test(text) && !/ss$/i.test(text)) return text.slice(0, -1);
  return text;
}

function propertyName(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

function fieldsSignature(fields: Field[]): string {
  const body = fields
    .map((field) => `${field.name}${field.optional ? '?' : ''}:${field.type}`)
    .sort()
    .join(',');
  return `object:{${body}}`;
}

/** Turns a JSON sample into named TypeScript declarations. */
class TypeGenerator {
  private readonly declarations: Declaration[] = [];
  private readonly byNode = new WeakMap<JsonNode, string>();
  private readonly bySignature = new Map<string, string>();
  private readonly byName = new Map<string, Declaration>();
  private readonly used = new Set<string>();
  private propertyCount = 0;

  constructor(private readonly root: JsonNode) {}

  get properties(): number {
    return this.propertyCount;
  }

  generate(options: TypescriptOptions): string {
    const rootHint = pascal(options.rootName.trim() || 'Root');
    const rootDeclaration =
      this.root.kind === 'object'
        ? this.declarationForRootObject(this.root, rootHint)
        : this.declarationForAlias(this.root, rootHint);

    const ordered = [
      rootDeclaration,
      ...this.declarations.filter((entry) => entry !== rootDeclaration),
    ];
    const lines: string[] = [];

    for (const declaration of ordered) {
      if (declaration.alias !== undefined) {
        lines.push(`export type ${declaration.name} = ${declaration.alias};`);
      } else {
        lines.push(`export interface ${declaration.name} {`);
        for (const field of declaration.fields ?? []) {
          const readonly = options.readonly ? 'readonly ' : '';
          const optional = field.optional ? '?' : '';
          lines.push(`  ${readonly}${field.name}${optional}: ${field.type};`);
        }
        lines.push('}');
      }
      lines.push('');
    }

    return lines.join('\n').trimEnd() + '\n';
  }

  private declarationForAlias(node: JsonNode, hint: string): Declaration {
    const name = this.reserveName(hint, `root:alias:${hint}`);
    const declaration = this.byName.get(name) as Declaration;
    declaration.alias =
      node.kind === 'array' ? this.arrayType(node, `${hint}Item`) : this.typeOf(node, hint);
    this.byNode.set(node, name);
    return declaration;
  }

  private declarationForRootObject(node: ObjectNode, hint: string): Declaration {
    const cached = this.byNode.get(node);
    if (cached) return this.byName.get(cached) as Declaration;

    const name = this.reserveName(hint, 'root:object');
    const declaration = this.byName.get(name) as Declaration;
    const fields = this.fieldsOf(node);
    declaration.fields = fields;
    this.propertyCount += fields.length;
    this.bySignature.set(fieldsSignature(fields), name);
    this.byNode.set(node, name);
    return declaration;
  }

  private interfaceFor(node: ObjectNode, hint: string): string {
    const cached = this.byNode.get(node);
    if (cached) return cached;

    const fields = this.fieldsOf(node);
    const signature = fieldsSignature(fields);
    const existing = this.bySignature.get(signature);

    if (existing) {
      this.byNode.set(node, existing);
      return existing;
    }

    const name = this.reserveName(hint, signature);
    const declaration = this.byName.get(name) as Declaration;
    declaration.fields = fields;
    this.propertyCount += fields.length;
    this.byNode.set(node, name);
    return name;
  }

  private mergedInterface(items: ObjectNode[], hint: string): string {
    const types = new Map<string, { types: Set<string>; present: number }>();

    for (const item of items) {
      for (const entry of item.entries) {
        const record = types.get(entry.key) ?? { types: new Set<string>(), present: 0 };
        record.types.add(this.typeOf(entry.value, entry.key || hint));
        record.present += 1;
        types.set(entry.key, record);
      }
    }

    const fields: Field[] = [...types.entries()].map(([key, record]) => {
      const union = [...record.types];
      return {
        name: propertyName(key),
        type: union.length === 1 ? union[0] : union.join(' | '),
        optional: record.present < items.length,
      };
    });

    const signature = fieldsSignature(fields);
    const existing = this.bySignature.get(signature);
    if (existing) return existing;

    const name = this.reserveName(hint, signature);
    const declaration = this.byName.get(name) as Declaration;
    declaration.fields = fields;
    this.propertyCount += fields.length;
    return name;
  }

  private fieldsOf(node: ObjectNode): Field[] {
    const byKey = new Map<string, JsonNode>();
    for (const entry of node.entries) byKey.set(entry.key, entry.value);

    return [...byKey.entries()].map(([key, value]) => ({
      name: propertyName(key),
      type: this.typeOf(value, key || 'Item'),
      optional: false,
    }));
  }

  private reserveName(hint: string, signature: string): string {
    const existing = this.bySignature.get(signature);
    if (existing) return existing;

    const base = pascal(hint);
    let name = base;
    let counter = 2;

    while (this.used.has(name)) {
      name = `${base}${counter}`;
      counter += 1;
    }

    this.used.add(name);
    this.bySignature.set(signature, name);
    const declaration: Declaration = { name, fields: [] };
    this.declarations.push(declaration);
    this.byName.set(name, declaration);
    return name;
  }

  private typeOf(node: JsonNode, hint: string): string {
    if (node.kind === 'object') return this.interfaceFor(node, hint);
    if (node.kind === 'array') return this.arrayType(node, hint);
    return node.kind;
  }

  private arrayType(node: ArrayNode, hint: string): string {
    const cached = this.byNode.get(node);
    if (cached) return cached;

    const result = this.arrayTypeOf(node.items, hint);
    this.byNode.set(node, result);
    return result;
  }

  private arrayTypeOf(items: JsonNode[], hint: string): string {
    if (items.length === 0) return 'unknown[]';

    const objects = items.filter((item): item is ObjectNode => item.kind === 'object');
    const types = new Set<string>();

    if (objects.length === items.length) {
      return `${this.mergedInterface(objects, singular(hint))}[]`;
    }

    if (objects.length > 0) types.add(this.mergedInterface(objects, singular(hint)));

    for (const item of items) {
      if (item.kind === 'object') continue;
      types.add(this.typeOf(item, singular(hint)));
    }

    if (types.size > MAX_UNION) return 'unknown[]';
    return types.size === 1 ? `${[...types][0]}[]` : `(${[...types].join(' | ')})[]`;
  }
}

/** Infers TypeScript interfaces and type aliases from a JSON sample. */
export function jsonToTypescript(text: string, options: TypescriptOptions): TypescriptResult {
  const started = performance.now();
  const { root, stats } = parseAst(text);

  if (stats.values > MAX_VALUES) {
    throw new JsonFormatError(
      'This sample is too large to turn into types',
      'Use a sample with fewer than 500,000 values. The first few records are usually enough.',
      0,
      0,
      0,
    );
  }

  const generator = new TypeGenerator(root);
  const output = generator.generate(options);

  return {
    output,
    blob: null,
    stats: {
      bytes: stats.bytes,
      outputBytes: utf8Length(output),
      lines: countLines(output),
      declarations: (output.match(/^export /gm) ?? []).length,
      properties: generator.properties,
      parseTimeMs: Math.round((performance.now() - started) * 10) / 10,
    },
  };
}
