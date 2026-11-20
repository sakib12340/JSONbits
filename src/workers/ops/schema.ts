import type {
  JsonPath,
  JsonType,
  SchemaIssue,
  SchemaPayload,
  SchemaResult,
} from '../protocol';
import { formatPath, parseAst, type JsonNode } from './ast';
import { JsonFormatError } from './errors';
import { utf8Length } from './stats';
import {
  asArray,
  asObject,
  booleanField,
  describeNode,
  field,
  isJsonType,
  matchesType,
  resolvePointer,
  sameValue,
  scanUnsupported,
  stringField,
  typeName,
} from './schema-util';

type ObjectNode = Extract<JsonNode, { kind: 'object' }>;

const MAX_ERRORS = 300;
const MAX_SCHEMA_ERRORS = 20;
const MAX_DEPTH = 400;

class SchemaValidator {
  private readonly errors: SchemaIssue[] = [];
  private readonly schemaErrors: string[] = [];
  private readonly patterns = new Map<string, RegExp | null>();
  private checked = 0;
  private probe = 0;

  constructor(private readonly root: JsonNode) {}

  run(document: JsonNode): SchemaResult {
    const started = performance.now();
    this.validate(document, this.root, [], new Set(), false);

    return {
      valid: this.errors.length === 0 && this.schemaErrors.length === 0,
      errors: this.errors,
      schemaErrors: this.schemaErrors,
      unsupported: scanUnsupported(this.root),
      stats: {
        checked: this.checked,
        errors: this.errors.length,
        timeMs: Math.round((performance.now() - started) * 10) / 10,
        schemaBytes: 0,
        documentBytes: 0,
      },
    };
  }

  private validate(
    node: JsonNode,
    schema: JsonNode,
    path: JsonPath,
    refs: Set<string>,
    silent: boolean,
  ): boolean {
    if ((this.errors.length >= MAX_ERRORS && !silent) || path.length > MAX_DEPTH) {
      return true;
    }

    const before = silent ? this.probe : this.errors.length;
    this.checked += 1;

    if (schema.kind === 'boolean') {
      if (schema.raw === 'false') {
        this.report(path, 'false', 'No value is allowed here.', silent);
      }
      return this.unchanged(before, silent);
    }

    if (schema.kind !== 'object') {
      this.schemaError('A schema must be an object or a boolean.');
      return this.unchanged(before, silent);
    }

    const ref = stringField(schema, '$ref');

    if (ref !== undefined) {
      if (!ref.startsWith('#')) {
        this.schemaError(`Only local references are supported; "${ref}" was not followed.`);
        return this.unchanged(before, silent);
      }

      if (refs.has(ref)) return true;

      const target = resolvePointer(this.root, ref);

      if (target === null) {
        this.schemaError(`Reference "${ref}" does not point to a definition in this schema.`);
        return this.unchanged(before, silent);
      }

      const next = new Set(refs);
      next.add(ref);
      return this.validate(node, target, path, next, silent);
    }

    this.checkType(node, schema, path, silent);
    this.checkEnum(node, schema, path, silent);
    this.checkNumbers(node, schema, path, silent);
    this.checkString(node, schema, path, silent);
    this.checkArray(node, schema, path, refs, silent);
    this.checkObject(node, schema, path, refs, silent);
    this.checkCombinators(node, schema, path, refs, silent);

    return this.unchanged(before, silent);
  }

  private checkType(node: JsonNode, schema: ObjectNode, path: JsonPath, silent: boolean): void {
    const value = field(schema, 'type');
    if (value === undefined) return;

    const types =
      value.kind === 'string'
        ? [value.text]
        : value.kind === 'array'
          ? value.items.filter((item) => item.kind === 'string').map((item) => item.text)
          : null;

    if (types === null || types.length === 0 || types.some((type) => !isJsonType(type))) {
      this.schemaError('"type" must be a type name or an array of type names.');
      return;
    }

    if (types.some((type) => matchesType(node, type as JsonType | 'integer'))) return;

    const expected =
      types.length === 1 ? typeName(types[0]) : `one of ${types.map(typeName).join(', ')}`;
    this.report(path, 'type', `Expected ${expected} but found ${describeNode(node)}.`, silent);
  }

  private checkEnum(node: JsonNode, schema: ObjectNode, path: JsonPath, silent: boolean): void {
    const enumNode = field(schema, 'enum');

    if (enumNode !== undefined) {
      if (enumNode.kind !== 'array' || enumNode.items.length === 0) {
        this.schemaError('"enum" must be a non-empty array.');
      } else if (!enumNode.items.some((value) => sameValue(node, value))) {
        this.report(path, 'enum', 'Value is not one of the allowed values.', silent);
      }
    }

    const constNode = field(schema, 'const');
    if (constNode !== undefined && !sameValue(node, constNode)) {
      this.report(path, 'const', 'Value does not match the required constant.', silent);
    }
  }

  private checkNumbers(node: JsonNode, schema: ObjectNode, path: JsonPath, silent: boolean): void {
    if (node.kind !== 'number') return;
    const value = Number(node.raw);

    const minimum = this.numberKeyword(schema, 'minimum');
    const maximum = this.numberKeyword(schema, 'maximum');
    const exclusiveMinimum = this.numberKeyword(schema, 'exclusiveMinimum');
    const exclusiveMaximum = this.numberKeyword(schema, 'exclusiveMaximum');
    const multipleOf = this.numberKeyword(schema, 'multipleOf');

    if (minimum !== null && minimum !== undefined && value < minimum) {
      this.report(path, 'minimum', `Must be greater than or equal to ${minimum}.`, silent);
    }

    if (maximum !== null && maximum !== undefined && value > maximum) {
      this.report(path, 'maximum', `Must be less than or equal to ${maximum}.`, silent);
    }

    if (exclusiveMinimum !== null && exclusiveMinimum !== undefined && value <= exclusiveMinimum) {
      this.report(path, 'exclusiveMinimum', `Must be greater than ${exclusiveMinimum}.`, silent);
    }

    if (exclusiveMaximum !== null && exclusiveMaximum !== undefined && value >= exclusiveMaximum) {
      this.report(path, 'exclusiveMaximum', `Must be less than ${exclusiveMaximum}.`, silent);
    }

    if (multipleOf !== null && multipleOf !== undefined) {
      if (multipleOf <= 0) {
        this.schemaError('"multipleOf" must be greater than zero.');
      } else {
        const quotient = value / multipleOf;
        if (Math.abs(quotient - Math.round(quotient)) > 1e-9) {
          this.report(path, 'multipleOf', `Must be a multiple of ${multipleOf}.`, silent);
        }
      }
    }
  }

  private checkString(node: JsonNode, schema: ObjectNode, path: JsonPath, silent: boolean): void {
    if (node.kind !== 'string') return;

    const length = Array.from(node.text).length;
    const minLength = this.integerKeyword(schema, 'minLength');
    const maxLength = this.integerKeyword(schema, 'maxLength');
    const pattern = field(schema, 'pattern');

    if (minLength !== null && minLength !== undefined && length < minLength) {
      this.report(path, 'minLength', `String is shorter than ${minLength} characters.`, silent);
    }

    if (maxLength !== null && maxLength !== undefined && length > maxLength) {
      this.report(path, 'maxLength', `String is longer than ${maxLength} characters.`, silent);
    }

    if (pattern === undefined) return;

    if (pattern.kind !== 'string') {
      this.schemaError('"pattern" must be a string.');
      return;
    }

    const regex = this.regex(pattern.text);
    if (regex === null) return;
    if (!regex.test(node.text)) {
      this.report(path, 'pattern', `String does not match the pattern ${pattern.text}.`, silent);
    }
  }

  private checkArray(
    node: JsonNode,
    schema: ObjectNode,
    path: JsonPath,
    refs: Set<string>,
    silent: boolean,
  ): void {
    if (node.kind !== 'array') return;

    const minItems = this.integerKeyword(schema, 'minItems');
    const maxItems = this.integerKeyword(schema, 'maxItems');

    if (minItems !== null && minItems !== undefined && node.items.length < minItems) {
      this.report(path, 'minItems', `Array must have at least ${minItems} items.`, silent);
    }

    if (maxItems !== null && maxItems !== undefined && node.items.length > maxItems) {
      this.report(path, 'maxItems', `Array must have at most ${maxItems} items.`, silent);
    }

    if (booleanField(schema, 'uniqueItems') === true) {
      const seen = new Set<string>();
      let duplicate = false;
      for (const item of node.items) {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          duplicate = true;
          break;
        }
        seen.add(key);
      }
      if (duplicate) this.report(path, 'uniqueItems', 'Array items must be unique.', silent);
    }

    const items = field(schema, 'items');
    if (items === undefined) return;

    if (items.kind === 'array') {
      const size = Math.min(items.items.length, node.items.length);
      for (let index = 0; index < size; index += 1) {
        this.validate(node.items[index], items.items[index], [...path, index], refs, silent);
      }

      if (node.items.length > items.items.length) {
        const extra = field(schema, 'additionalItems');
        if (extra !== undefined && extra.kind === 'boolean' && extra.raw === 'false') {
          this.report(
            path,
            'additionalItems',
            'Array has more items than the schema allows.',
            silent,
          );
        } else if (extra !== undefined && extra.kind !== 'boolean') {
          for (let index = items.items.length; index < node.items.length; index += 1) {
            this.validate(node.items[index], extra, [...path, index], refs, silent);
          }
        }
      }
      return;
    }

    if (items.kind === 'object' || items.kind === 'boolean') {
      for (let index = 0; index < node.items.length; index += 1) {
        this.validate(node.items[index], items, [...path, index], refs, silent);
      }
      return;
    }

    this.schemaError('"items" must be a schema or an array of schemas.');
  }

  private checkObject(
    node: JsonNode,
    schema: ObjectNode,
    path: JsonPath,
    refs: Set<string>,
    silent: boolean,
  ): void {
    if (node.kind !== 'object') return;

    const values = new Map<string, JsonNode>();
    for (const entry of node.entries) values.set(entry.key, entry.value);

    const minProperties = this.integerKeyword(schema, 'minProperties');
    const maxProperties = this.integerKeyword(schema, 'maxProperties');

    if (minProperties !== null && minProperties !== undefined && values.size < minProperties) {
      this.report(
        path,
        'minProperties',
        `Object must have at least ${minProperties} properties.`,
        silent,
      );
    }

    if (maxProperties !== null && maxProperties !== undefined && values.size > maxProperties) {
      this.report(
        path,
        'maxProperties',
        `Object must have at most ${maxProperties} properties.`,
        silent,
      );
    }

    const required = field(schema, 'required');
    if (required !== undefined) {
      if (required.kind !== 'array' || required.items.some((item) => item.kind !== 'string')) {
        this.schemaError('"required" must be an array of property names.');
      } else {
        for (const item of required.items) {
          if (item.kind !== 'string') continue;
          if (!values.has(item.text)) {
            this.report(
              path,
              'required',
              `Missing required property "${item.text}".`,
              silent,
            );
          }
        }
      }
    }

    const properties = asObject(field(schema, 'properties') ?? { kind: 'null', raw: 'null' });
    const known = new Set<string>();

    if (properties) {
      for (const entry of properties.entries) {
        known.add(entry.key);
        const current = values.get(entry.key);
        if (current !== undefined) {
          this.validate(current, entry.value, [...path, entry.key], refs, silent);
        }
      }
    } else if (field(schema, 'properties') !== undefined) {
      this.schemaError('"properties" must be an object.');
    }

    const additional = field(schema, 'additionalProperties');
    if (additional !== undefined) {
      for (const [key, value] of values) {
        if (known.has(key)) continue;

        if (additional.kind === 'boolean') {
          if (additional.raw === 'false') {
            this.report(
              [...path, key],
              'additionalProperties',
              `Property "${key}" is not allowed by the schema.`,
              silent,
            );
          }
          continue;
        }

        if (additional.kind === 'object') {
          this.validate(value, additional, [...path, key], refs, silent);
        } else {
          this.schemaError('"additionalProperties" must be a boolean or a schema.');
        }
      }
    }
  }

  private checkCombinators(
    node: JsonNode,
    schema: ObjectNode,
    path: JsonPath,
    refs: Set<string>,
    silent: boolean,
  ): void {
    const allOf = asArray(field(schema, 'allOf') ?? { kind: 'null', raw: 'null' });
    if (allOf) {
      for (const item of allOf.items) this.validate(node, item, path, refs, silent);
    } else if (field(schema, 'allOf') !== undefined) {
      this.schemaError('"allOf" must be an array of schemas.');
    }

    this.checkAnyOf(node, schema, 'anyOf', path, refs, silent);
    this.checkOneOf(node, schema, path, refs, silent);

    const not = field(schema, 'not');
    if (not !== undefined) {
      if (this.test(node, not, path, refs)) {
        this.report(path, 'not', 'Value matches a schema it must not match.', silent);
      }
    }
  }

  private checkAnyOf(
    node: JsonNode,
    schema: ObjectNode,
    key: 'anyOf',
    path: JsonPath,
    refs: Set<string>,
    silent: boolean,
  ): void {
    const list = asArray(field(schema, key) ?? { kind: 'null', raw: 'null' });
    if (!list) {
      if (field(schema, key) !== undefined) this.schemaError(`"${key}" must be an array of schemas.`);
      return;
    }

    if (list.items.length === 0) {
      this.schemaError(`"${key}" must contain at least one schema.`);
      return;
    }

    if (list.items.some((item) => this.test(node, item, path, refs))) return;
    this.report(path, key, 'Value does not match any of the allowed schemas.', silent);
  }

  private checkOneOf(
    node: JsonNode,
    schema: ObjectNode,
    path: JsonPath,
    refs: Set<string>,
    silent: boolean,
  ): void {
    const list = asArray(field(schema, 'oneOf') ?? { kind: 'null', raw: 'null' });
    if (!list) {
      if (field(schema, 'oneOf') !== undefined) {
        this.schemaError('"oneOf" must be an array of schemas.');
      }
      return;
    }

    if (list.items.length === 0) {
      this.schemaError('"oneOf" must contain at least one schema.');
      return;
    }

    const matches = list.items.filter((item) => this.test(node, item, path, refs)).length;
    if (matches !== 1) {
      this.report(
        path,
        'oneOf',
        `Value must match exactly one schema, but matched ${matches}.`,
        silent,
      );
    }
  }

  private test(node: JsonNode, schema: JsonNode, path: JsonPath, refs: Set<string>): boolean {
    const before = this.probe;
    this.validate(node, schema, path, refs, true);
    const changed = this.probe !== before;
    this.probe = before;
    return !changed;
  }

  private numberKeyword(
    schema: ObjectNode,
    key: string,
  ): number | null | undefined {
    const value = field(schema, key);
    if (value === undefined) return undefined;

    if (value.kind !== 'number') {
      this.schemaError(`"${key}" must be a number.`);
      return null;
    }

    return Number(value.raw);
  }

  private integerKeyword(
    schema: ObjectNode,
    key: string,
  ): number | null | undefined {
    const value = field(schema, key);
    if (value === undefined) return undefined;

    if (value.kind !== 'number' || !Number.isInteger(Number(value.raw)) || Number(value.raw) < 0) {
      this.schemaError(`"${key}" must be a non-negative integer.`);
      return null;
    }

    return Number(value.raw);
  }

  private regex(source: string): RegExp | null {
    if (this.patterns.has(source)) return this.patterns.get(source) ?? null;

    try {
      const regex = new RegExp(source);
      this.patterns.set(source, regex);
      return regex;
    } catch {
      this.patterns.set(source, null);
      this.schemaError(`"pattern" is not a valid regular expression: ${source}`);
      return null;
    }
  }

  private report(path: JsonPath, keyword: string, message: string, silent: boolean): void {
    if (silent) {
      this.probe += 1;
      return;
    }

    if (this.errors.length >= MAX_ERRORS) return;
    this.errors.push({ path: formatPath(path), keyword, message });
  }

  private schemaError(message: string): void {
    if (this.schemaErrors.length >= MAX_SCHEMA_ERRORS) return;
    if (this.schemaErrors.includes(message)) return;
    this.schemaErrors.push(message);
  }

  private unchanged(before: number, silent: boolean): boolean {
    return (silent ? this.probe : this.errors.length) === before;
  }
}

function parseSchemaText(text: string, label: string): JsonNode {
  try {
    return parseAst(text).root;
  } catch (error) {
    if (error instanceof JsonFormatError) {
      throw new JsonFormatError(
        `${label}: ${error.message}`,
        error.hint,
        error.offset,
        error.line,
        error.column,
      );
    }
    throw error;
  }
}

/** Validate a document against a JSON Schema subset with local references. */
export function validateSchema(payload: SchemaPayload): SchemaResult {
  const schemaRoot = parseSchemaText(payload.schema, 'Schema');
  const documentRoot = parseSchemaText(payload.document, 'Document');
  const result = new SchemaValidator(schemaRoot).run(documentRoot);

  result.stats.schemaBytes = utf8Length(payload.schema);
  result.stats.documentBytes = utf8Length(payload.document);
  return result;
}
