import { describe, expect, it } from 'vitest';
import { JsonFormatError } from './errors';
import { jsonToNdjson, ndjsonToCsv, ndjsonToJson, ndjsonValidate } from './ndjson';

const options = {
  skipInvalid: false,
  stopAtFirst: false,
  pretty: false,
  trimBlank: true,
  delimiter: ',' as const,
  flatten: true,
  header: true,
  guard: false,
};

const payload = (text: string) => ({ text });

describe('NDJSON validator', () => {
  it('counts valid, invalid, and blank lines with line numbers', () => {
    const result = ndjsonValidate(
      payload('{"a":1}\n\n{"b":}\n[1,2]'),
      options,
    );
    expect(result.stats).toMatchObject({ lines: 4, valid: 2, invalid: 1, blank: 1 });
    expect(result.issues[0]?.line).toBe(3);
    expect(result.issues[0]?.hint.length).toBeGreaterThan(0);
  });

  it('stops at the first error when asked', () => {
    const result = ndjsonValidate(
      payload('{"a":}\n{"b":}\n{"c":1}'),
      { ...options, stopAtFirst: true },
    );
    expect(result.stats.lines).toBe(1);
    expect(result.stats.invalid).toBe(1);
  });

  it('streams from an ArrayBuffer without a full-string split', () => {
    const text = '{"a":1}\n{"a":2}\n';
    const buffer = new TextEncoder().encode(text).buffer;
    const result = ndjsonValidate({ buffer }, options);
    expect(result.stats.valid).toBe(2);
  });
});

describe('NDJSON conversions', () => {
  it('collects lines into an array and can skip invalid records', () => {
    const result = ndjsonToJson(
      payload('{"a":1}\nbad\n{"a":2}'),
      { ...options, skipInvalid: true },
    );
    expect(JSON.parse(result.output ?? '')).toEqual([{ a: 1 }, { a: 2 }]);
    expect(result.stats.invalid).toBe(1);
  });

  it('stops at an invalid line by default', () => {
    expect(() => ndjsonToJson(payload('{"a":1}\nbad'), options)).toThrow(JsonFormatError);
  });

  it('requires a top-level array for json-to-ndjson', () => {
    expect(() => jsonToNdjson(payload('{"a":1}'), options)).toThrow(/top-level array/i);
    const result = jsonToNdjson(payload('[{"a":1},{"a":2}]'), options);
    expect(result.output).toBe('{"a":1}\n{"a":2}\n');
  });

  it('flattens nested keys and writes RFC 4180 CSV', () => {
    const result = ndjsonToCsv(
      payload('{"name":"Ada","address":{"city":"London"}}\n{"name":"Grace","address":{"city":"New York"}}'),
      options,
    );
    expect(result.output).toBe('name,address.city\r\nAda,London\r\nGrace,New York');
  });
});
