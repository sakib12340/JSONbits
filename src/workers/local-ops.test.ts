import { describe, expect, it } from 'vitest';
import { runLocal } from './local-ops';

const fresh = () => ({ tree: null });

describe('local ops', () => {
  it('formats without rounding big integers or decimals', async () => {
    const result = await runLocal(
      'format',
      { text: '{"big":9007199254740993,"dec":0.1000000000000000055511}' },
      { indent: 2 },
      fresh(),
    );

    expect(result.output).toContain('9007199254740993');
    expect(result.output).toContain('0.1000000000000000055511');
    expect(result.stats.depth).toBe(1);
  });

  it('minifies and reports the saved bytes', async () => {
    const result = await runLocal('minify', { text: '{ "a" : [ 1 , 2 ] }' }, {}, fresh());

    expect(result.output).toBe('{"a":[1,2]}');
    expect(result.stats.savedPercent).toBeGreaterThan(0);
  });

  it('reports a syntax error with its position', async () => {
    await expect(runLocal('validate', { text: '{"a":}' }, {}, fresh())).rejects.toMatchObject({
      line: 1,
    });
  });

  it('keeps a tree document across calls so expansion is not rebuilt', async () => {
    const context = fresh();
    const root = await runLocal('tree', { text: '{"rows":[{"id":1},{"id":2}]}' }, {}, context);

    expect(root.row.type).toBe('object');
    expect(context.tree).not.toBeNull();

    const children = await runLocal(
      'treeChildren',
      { path: ['rows'] },
      { start: 0, limit: 10 },
      context,
    );

    expect(children.total).toBe(2);
    expect(children.rows.map((row) => row.type)).toEqual(['object', 'object']);
  });

  it('converts nested JSON to CSV without loading the worker', async () => {
    const result = await runLocal(
      'jsonToCsv',
      { text: '[{"id":1,"user":{"name":"Ada"}}]' },
      { delimiter: ',', flatten: true, header: true, guard: true, arrays: 'json' },
      fresh(),
    );

    expect(result.output?.split('\r\n')[0]).toBe('id,user.name');
    expect(result.stats.rows).toBe(1);
  });

  it('converts YAML into JSON locally', async () => {
    const result = await runLocal(
      'yamlToJson',
      { text: 'name: Ada\nitems:\n  - 1\n  - 2\n' },
      { indent: 2 },
      fresh(),
    );

    expect(JSON.parse(result.output ?? '')).toEqual({ name: 'Ada', items: [1, 2] });
  });

  it('converts JSON into XML locally', async () => {
    const result = await runLocal(
      'jsonToXml',
      { text: '{"user":{"name":"Ada"}}' },
      { rootName: 'root', attributes: false, indent: 2 },
      fresh(),
    );

    expect(result.output).toContain('<root>');
    expect(result.output).toContain('<name>Ada</name>');
  });

  it('diffs two documents structurally', async () => {
    const result = await runLocal(
      'diff',
      { left: '{"a":1,"b":2}', right: '{"a":1,"b":3}' },
      { ignoreArrayOrder: false },
      fresh(),
    );

    expect(result.stats.changed).toBe(1);
    expect(result.entries[0]).toMatchObject({ path: '$.b', type: 'changed' });
  });
});
