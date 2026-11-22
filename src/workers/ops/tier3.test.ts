import { describe, expect, it } from 'vitest';
import { transformEscapes } from './escape';
import { queryJsonPath } from './jsonpath';
import { validateSchema } from './schema';
import { sortJson } from './sort';
import { jsonToTypescript } from './typescript';

describe('json sorter', () => {
  it('sorts at every depth and keeps big integers exact', () => {
    const result = sortJson(
      '{"z":1,"a":{"y":2,"b":3},"big":9007199254740993}',
      { direction: 'asc', deep: true, indent: 2 },
    );

    expect(result.output).toBe(
      '{\n  "a": {\n    "b": 3,\n    "y": 2\n  },\n  "big": 9007199254740993,\n  "z": 1\n}',
    );
    expect(result.stats.sortedKeys).toBe(5);
  });

  it('leaves nested objects alone when only the top level is sorted', () => {
    const result = sortJson('{"b":{"z":1,"a":2},"a":0}', {
      direction: 'asc',
      deep: false,
      indent: 2,
    });

    expect(result.output?.indexOf('"a": 0')).toBeLessThan(
      result.output?.indexOf('"b":') ?? 0,
    );
    expect(result.output?.indexOf('"z": 1')).toBeLessThan(
      result.output?.indexOf('"a": 2') ?? 0,
    );
  });
});

describe('json escape tool', () => {
  it('escapes quotes, backslashes, and newlines', () => {
    const result = transformEscapes('He said "hello"\nPath: C:\\temp', {
      mode: 'escape',
      quotes: false,
      ascii: false,
    });

    expect(result.output).toBe('He said \\"hello\\"\\nPath: C:\\\\temp');
  });

  it('round-trips an escaped string', () => {
    const escaped = transformEscapes('line 1\nline 2', {
      mode: 'escape',
      quotes: true,
      ascii: false,
    });

    const restored = transformEscapes(escaped.output ?? '', {
      mode: 'unescape',
      quotes: false,
      ascii: false,
    });

    expect(restored.output).toBe('line 1\nline 2');
  });

  it('reports an invalid escape with its position', () => {
    expect(() =>
      transformEscapes('bad \\q escape', {
        mode: 'unescape',
        quotes: false,
        ascii: false,
      }),
    ).toThrow(/Invalid escape/);
  });
});

describe('jsonpath tester', () => {
  const document = JSON.stringify({
    store: {
      books: [
        { title: 'A', price: 8 },
        { title: 'B', price: 14 },
      ],
    },
  });

  it('returns filtered values in values mode', () => {
    const result = queryJsonPath(document, {
      expression: '$.store.books[?(@.price < 10)]',
      limit: 2000,
      display: 2000,
      mode: 'values',
    });
    expect(JSON.parse(result.output ?? '')).toEqual([{ title: 'A', price: 8 }]);
    expect(result.stats.total).toBe(1);
    expect(result.keys).toContain('store');
  });

  it('returns normalized paths and path+value pairs', () => {
    const paths = queryJsonPath(document, {
      expression: '$.store.books[*].title',
      limit: 2000,
      display: 2000,
      mode: 'paths',
    });
    expect(JSON.parse(paths.output ?? '')).toEqual([
      "$['store']['books'][0]['title']",
      "$['store']['books'][1]['title']",
    ]);

    const pairs = queryJsonPath(document, {
      expression: '$.store.books[0].title',
      limit: 2000,
      display: 2000,
      mode: 'pathValue',
    });
    expect(JSON.parse(pairs.output ?? '')).toEqual([
      { path: "$['store']['books'][0]['title']", value: 'A' },
    ]);
  });

  it('supports flat and first modes and caps the visible output', () => {
    const result = queryJsonPath('{"a":[1,2],"b":[3]}', {
      expression: '$.*',
      limit: 2000,
      display: 1,
      mode: 'flat',
    });
    expect(JSON.parse(result.output ?? '')).toEqual([1, 2]);
    expect(result.stats.truncated).toBe(true);
    expect(result.allOutput).not.toBeNull();

    const first = queryJsonPath('{"a":1}', {
      expression: '$.a',
      limit: 2000,
      display: 2000,
      mode: 'first',
    });
    expect(JSON.parse(first.output ?? '')).toBe(1);
  });

  it('supports recursive descent', () => {
    const result = queryJsonPath('{"a":{"id":1},"b":[{"id":2},{"id":3}]}', {
      expression: '$..id',
      limit: 2000,
      display: 2000,
      mode: 'values',
    });

    expect(result.stats.matches).toBe(3);
  });
});

describe('typescript generator', () => {
  it('merges array items and marks missing properties optional', () => {
    const result = jsonToTypescript(
      '{"users":[{"id":1,"name":"Ada"},{"id":2}]}',
      { rootName: 'Root', readonly: false },
    );

    expect(result.output).toContain('export interface Root {');
    expect(result.output).toContain('users: User[];');
    expect(result.output).toContain('name?: string;');
    expect(result.output).toContain('id: number;');
  });

  it('quotes keys and types empty arrays as unknown[]', () => {
    const result = jsonToTypescript(
      '{"meta-data":{"active":true},"tags":[]}',
      { rootName: 'Root', readonly: true },
    );

    expect(result.output).toContain('readonly "meta-data": MetaData;');
    expect(result.output).toContain('readonly tags: unknown[];');
  });
});

describe('json schema validator', () => {
  const schema = JSON.stringify({
    type: 'object',
    required: ['id', 'email'],
    additionalProperties: false,
    properties: {
      id: { type: 'integer' },
      email: { type: 'string' },
    },
  });

  it('reports type and required failures with paths', () => {
    const result = validateSchema({ schema, document: '{"id":"x"}' });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '$.id', keyword: 'type' }),
        expect.objectContaining({ path: '$', keyword: 'required' }),
      ]),
    );
  });

  it('accepts a valid document', () => {
    const result = validateSchema({ schema, document: '{"id":7,"email":"a@b.c"}' });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('resolves local references', () => {
    const withRef = JSON.stringify({
      $defs: { name: { type: 'string', minLength: 2 } },
      type: 'object',
      properties: { name: { $ref: '#/$defs/name' } },
    });
    const result = validateSchema({ schema: withRef, document: '{"name":"A"}' });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ path: '$.name', keyword: 'minLength' });
  });

  it('lists unsupported keywords honestly', () => {
    const result = validateSchema({
      schema: '{"type":"string","format":"email","if":{"type":"string"}}',
      document: '"a"',
    });

    expect(result.valid).toBe(true);
    expect(result.unsupported).toEqual(['format', 'if']);
  });

  it('names the side that failed to parse', () => {
    expect(() => validateSchema({ schema: '{"a":}', document: '{}' })).toThrow(/^Schema:/);
    expect(() => validateSchema({ schema: '{}', document: '{"a":}' })).toThrow(/^Document:/);
  });
});
