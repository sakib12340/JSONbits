import type { SortOptions, SortResult } from '../protocol';
import { parseAst, serializeAst, type JsonNode } from './ast';

/** Sorts object keys without touching values or number tokens. */
export function sortJson(text: string, options: SortOptions): SortResult {
  const { root, stats } = parseAst(text);
  const rootIsArray = root.kind === 'array';
  let sortedKeys = 0;

  const allowed = (depth: number): boolean =>
    options.deep || depth === 0 || (rootIsArray && depth === 1);

  const visit = (node: JsonNode, depth: number): void => {
    if (node.kind === 'object') {
      if (allowed(depth)) {
        node.entries.sort((left, right) => {
          if (left.key === right.key) return 0;
          const order = left.key < right.key ? -1 : 1;
          return options.direction === 'asc' ? order : -order;
        });
        sortedKeys += node.entries.length;
      }

      for (const entry of node.entries) visit(entry.value, depth + 1);
      return;
    }

    if (node.kind === 'array') {
      for (const item of node.items) visit(item, depth + 1);
    }
  };

  visit(root, 0);

  return {
    output: serializeAst(root, options.indent),
    blob: null,
    stats: { ...stats, sortedKeys },
  };
}
