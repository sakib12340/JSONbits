import { describe, expect, it } from 'vitest';
import { jsonToJsonSchema } from './schema-infer';
import { jsonToZod } from './zod';

const baseOptions = {
  draft: '2020-12' as const,
  additionalProperties: false,
  detectFormats: true,
  detectEnums: false,
  includeSchema: true,
  includeTitle: false,
  title: 'Sample',
};

describe('JSON Schema inference', () => {
  it('infers types, required keys, and formats', () => {
    const result = jsonToJsonSchema(
      '{ "name": "Ada", "age": 36, "email": "ada@example.com" }',
      baseOptions,
    );
    const schema = JSON.parse(result.output ?? '') as {
      $schema: string;
      properties: Record<string, { type: string; format?: string }>;
      required: string[];
    };

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.properties.age.type).toBe('integer');
    expect(schema.properties.email.format).toBe('email');
    expect(schema.required).toEqual(['name', 'age', 'email']);
  });

  it('merges array objects, keeps common keys required, and unions types', () => {
    const result = jsonToJsonSchema(
      '{ "items": [{"a": 1, "b": "x"}, {"a": null, "c": true}] }',
      { ...baseOptions, detectEnums: true },
    );
    const schema = JSON.parse(result.output ?? '') as {
      properties: {
        items: {
          items: {
            properties: Record<string, { type: string | string[]; enum?: string[] }>;
            required: string[];
          };
        };
      };
    };
    const item = schema.properties.items.items;

    expect(item.required).toEqual(['a']);
    expect(item.properties.a.type).toEqual(['integer', 'null']);
    expect(item.properties.b.type).toBe('string');
  });

  it('detects low-cardinality enums in arrays of objects', () => {
    const result = jsonToJsonSchema(
      '{"users":[{"role":"admin"},{"role":"editor"},{"role":"admin"}]}',
      { ...baseOptions, detectEnums: true },
    );
    const schema = JSON.parse(result.output ?? '') as {
      properties: { users: { items: { properties: { role: { enum: string[] } } } } };
    };
    expect(schema.properties.users.items.properties.role.enum).toEqual(['admin', 'editor']);
  });

  it('honours draft-07, additionalProperties, and title options', () => {
    const result = jsonToJsonSchema('{"a":1}', {
      ...baseOptions,
      draft: 'draft-07',
      additionalProperties: true,
      includeTitle: true,
    });
    const schema = JSON.parse(result.output ?? '') as Record<string, unknown>;
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.title).toBe('Sample');
  });
});

describe('Zod generation', () => {
  const zodOptions = {
    schemaName: 'user',
    exportKeyword: true,
    inferType: true,
    optionalNullable: true,
    strict: false,
  };

  it('emits Zod 4 format helpers and an inferred type', () => {
    const result = jsonToZod(
      '{"email":"a@b.com","when":"2024-01-15T10:00:00Z","id":"123e4567-e89b-42d3-a456-426614174000"}',
      zodOptions,
    );
    expect(result.output).toContain('import { z } from "zod";');
    expect(result.output).toContain('export const User');
    expect(result.output).toContain('z.email()');
    expect(result.output).toContain('z.iso.datetime()');
    expect(result.output).toContain('z.uuid()');
    expect(result.output).toContain('export type User = z.infer<typeof User>;');
  });

  it('marks missing and nullable fields in merged array items', () => {
    const result = jsonToZod(
      '{"users":[{"a":1,"b":"x"},{"a":null,"c":true}]}',
      zodOptions,
    );
    expect(result.output).toContain('z.nullable(z.number())');
    expect(result.output).toContain('b: z.string().optional()');
    expect(result.output).toContain('a: z.nullable(z.number())');
  });

  it('emits z.null() for a field that is always null', () => {
    const result = jsonToZod('{"nickname":null}', zodOptions);
    expect(result.output).toContain('nickname: z.null()');
    expect(result.output).not.toContain('z.nullable(z.null())');
  });

  it('supports strict objects without an export', () => {
    const result = jsonToZod('{"a":1}', {
      ...zodOptions,
      exportKeyword: false,
      inferType: false,
      strict: true,
    });
    expect(result.output).toContain('const User = z.strictObject({');
    expect(result.output).not.toContain('z.infer');
  });
});
