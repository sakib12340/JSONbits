import type {
  JsonPath,
  TreeChildrenResult,
  TreeLoadResult,
  TreeRow,
  TreeSearchResult,
  TreeValueResult,
} from '../protocol';
import {
  childCount,
  findNode,
  hasChildren,
  nodePreview,
  nodeType,
  parseAst,
  serializeNode,
  type JsonNode,
} from './ast';

interface SearchItem {
  node: JsonNode;
  path: JsonPath;
  label: string;
}

export class JsonTree {
  private root: JsonNode | null = null;

  load(text: string): TreeLoadResult {
    const { root, stats } = parseAst(text);
    this.root = root;

    return {
      row: toRow(root, [], '$'),
      stats,
      nodes: stats.objects + stats.arrays + stats.values,
    };
  }

  children(path: JsonPath, start: number, limit: number): TreeChildrenResult {
    const node = this.requireRoot();
    const target = findNode(node, path);

    if (!target) return { rows: [], total: 0 };

    if (target.kind === 'object') {
      const total = target.entries.length;
      const rows = target.entries
        .slice(start, start + limit)
        .map((entry) => toRow(entry.value, [...path, entry.key], entry.key));
      return { rows, total };
    }

    if (target.kind === 'array') {
      const total = target.items.length;
      const rows = target.items
        .slice(start, start + limit)
        .map((item, offset) => toRow(item, [...path, start + offset], `[${start + offset}]`));
      return { rows, total };
    }

    return { rows: [], total: 0 };
  }

  value(path: JsonPath, limit: number): TreeValueResult {
    const target = findNode(this.requireRoot(), path);

    if (!target) return { found: false, text: null, size: 0 };

    const { text, size } = serializeNode(target, limit);
    return { found: true, text, size };
  }

  search(query: string, limit: number): TreeSearchResult {
    const root = this.requireRoot();
    const needle = query.toLocaleLowerCase();
    const started = performance.now();
    const rows: TreeRow[] = [];
    let truncated = false;
    let total = 0;

    if (!needle) {
      return { rows, total, truncated, timeMs: 0 };
    }

    const stack: SearchItem[] = [{ node: root, path: [], label: '$' }];

    while (stack.length > 0) {
      const item = stack.pop() as SearchItem;
      const { node, path, label } = item;
      const preview = nodePreview(node);

      if (label.toLocaleLowerCase().includes(needle) || preview.toLocaleLowerCase().includes(needle)) {
        total += 1;

        if (rows.length < limit) {
          rows.push(toRow(node, path, label));
        } else {
          truncated = true;
          break;
        }
      }

      if (node.kind === 'object') {
        for (let index = node.entries.length - 1; index >= 0; index -= 1) {
          const entry = node.entries[index];
          stack.push({
            node: entry.value,
            path: [...path, entry.key],
            label: entry.key,
          });
        }
      } else if (node.kind === 'array') {
        for (let index = node.items.length - 1; index >= 0; index -= 1) {
          stack.push({
            node: node.items[index],
            path: [...path, index],
            label: `[${index}]`,
          });
        }
      }
    }

    return {
      rows,
      total,
      truncated,
      timeMs: Math.round((performance.now() - started) * 10) / 10,
    };
  }

  private requireRoot(): JsonNode {
    if (!this.root) {
      throw new Error('No tree is loaded.');
    }

    return this.root;
  }
}

function toRow(node: JsonNode, path: JsonPath, label: string): TreeRow {
  return {
    path,
    label,
    type: nodeType(node),
    preview: nodePreview(node),
    hasChildren: hasChildren(node),
    childCount: childCount(node),
  };
}
