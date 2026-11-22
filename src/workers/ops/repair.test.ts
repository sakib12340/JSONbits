import { describe, expect, it } from 'vitest';
import { repairJson } from './repair';
import { diffLines } from './textdiff';

describe('repair fix details', () => {
  it('reports each fix with a kind, location, and before/after', () => {
    const input = `{\n  // a comment\n  name: 'Ada',\n  active: True,\n  score: 10,\n}`;
    const result = repairJson(input, { indent: 2 });

    expect(result.fixCount).toBeGreaterThanOrEqual(4);
    const kinds = new Set(result.fixes.map((fix) => fix.kind));
    expect(kinds.has('comments')).toBe(true);
    expect(kinds.has('singleQuotes')).toBe(true);
    expect(kinds.has('unquotedKeys')).toBe(true);
    expect(kinds.has('pythonLiterals')).toBe(true);
    expect(kinds.has('trailingCommas')).toBe(true);

    for (const fix of result.fixes) {
      expect(fix.line).toBeGreaterThan(0);
      expect(fix.column).toBeGreaterThan(0);
      expect(fix.before.length).toBeGreaterThan(0);
      expect(fix.description.length).toBeGreaterThan(0);
    }
    expect(JSON.parse(result.output ?? '')).toEqual({
      name: 'Ada',
      active: true,
      score: 10,
    });
  });

  it('flags None → null as ambiguous', () => {
    const result = repairJson('{ "a": None }', { indent: 2 });
    const none = result.fixes.find((fix) => fix.before === 'None');
    expect(none?.ambiguous).toBe(true);
    expect(none?.after).toBe('null');
  });

  it('counts multiple fixes of the same kind individually', () => {
    const result = repairJson('{ "a": 1, }', { indent: 2 });
    expect(result.fixCount).toBe(1);
    expect(result.fixes[0]?.kind).toBe('trailingCommas');
  });
});

describe('text diff', () => {
  it('collapses a removed/added pair into a changed line', () => {
    const diff = diffLines('a\nb\n', 'a\nc\n');
    expect(diff.some((line) => line.type === 'changed' && line.left === 'b' && line.right === 'c')).toBe(true);
  });

  it('marks equal lines', () => {
    const diff = diffLines('a\n', 'a\n');
    expect(diff).toEqual([
      { type: 'equal', left: 'a', right: 'a' },
      { type: 'equal', left: '', right: '' },
    ]);
  });
});
