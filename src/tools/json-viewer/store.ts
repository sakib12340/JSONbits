import {
  WorkerCancelledError,
  WorkerClient,
  WorkerResponseError,
  WorkerRuntimeError,
  WorkerUnavailableError,
} from '../../workers/client';
import { failure } from '../../workers/protocol';
import type {
  FormatStats,
  JsonPath,
  ProgressUpdate,
  TextPayload,
  TreeLoadResult,
  TreeRow,
  TreeSearchResult,
  TreeValueResult,
} from '../../workers/protocol';
import type { JsonTree } from '../../workers/ops/tree';
import { FALLBACK_LIMIT, TREE_VALUE_LIMIT } from '../limits';

export interface TreeLine {
  kind: 'node' | 'more';
  path: JsonPath;
  level: number;
  row: TreeRow | null;
  expanded: boolean;
  remaining: number;
}

interface NodeState {
  rows: TreeRow[];
  total: number;
  expanded: boolean;
  loading: boolean;
}

interface SearchState {
  rows: TreeRow[];
  total: number;
  truncated: boolean;
}

const PAGE = 100;
const SEARCH_LIMIT = 500;

export function pathKey(path: JsonPath): string {
  return JSON.stringify(path);
}

export function formatPath(path: JsonPath): string {
  let out = '$';

  for (const segment of path) {
    if (typeof segment === 'number') {
      out += `[${segment}]`;
    } else if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)) {
      out += `.${segment}`;
    } else {
      out += `[${JSON.stringify(segment)}]`;
    }
  }

  return out;
}

function decodePayload(payload: TextPayload): string {
  if ('text' in payload) return payload.text;

  if (payload.buffer.byteLength === 0) {
    throw new WorkerRuntimeError('The file buffer is no longer available.');
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(payload.buffer);
  } catch {
    throw new WorkerResponseError(
      failure(
        'This file is not valid UTF-8 text.',
        'Open the file in a text editor and save it as UTF-8, then try again.',
        'encoding',
      ),
    );
  }
}

/** Holds the worker-side tree state and only materializes expanded rows. */
export class TreeStore {
  root: TreeRow | null = null;
  stats: FormatStats | null = null;
  nodeCount = 0;
  searchTotal = 0;
  searchTruncated = false;
  searchTimeMs = 0;

  private readonly client = new WorkerClient();
  private readonly children = new Map<string, NodeState>();
  private searchState: SearchState | null = null;
  private local: JsonTree | null = null;
  private generation = 0;
  private searchToken = 0;

  async load(
    payload: TextPayload,
    onProgress?: (progress: ProgressUpdate) => void,
  ): Promise<{ usedFallback: boolean }> {
    const generation = ++this.generation;
    this.client.cancelAll();
    this.local = null;

    let result: TreeLoadResult;
    let usedFallback = false;

    try {
      result = await this.client.run('tree', payload, {}, onProgress);
    } catch (error) {
      if (generation !== this.generation) throw new WorkerCancelledError();
      if (error instanceof WorkerCancelledError) throw error;
      if (!(error instanceof WorkerUnavailableError) && !(error instanceof WorkerRuntimeError)) {
        throw error;
      }

      const text = decodePayload(payload);
      if (text.length > FALLBACK_LIMIT) throw error;

      const { JsonTree: LocalTree } = await import('../../workers/ops/tree');
      const tree = new LocalTree();
      result = tree.load(text);
      this.local = tree;
      usedFallback = true;
    }

    if (generation !== this.generation) throw new WorkerCancelledError();

    this.root = result.row;
    this.stats = result.stats;
    this.nodeCount = result.nodes;
    this.children.clear();
    this.searchState = null;
    this.searchTotal = 0;
    this.searchTruncated = false;
    this.searchTimeMs = 0;
    this.searchToken += 1;

    return { usedFallback };
  }

  async expand(path: JsonPath): Promise<void> {
    const key = pathKey(path);
    const state = this.children.get(key);

    if (state?.expanded) return;
    if (state) {
      state.expanded = true;
      return;
    }

    await this.fetch(path, 0);
    const created = this.children.get(key);
    if (created) created.expanded = true;
  }

  collapse(path: JsonPath): void {
    const state = this.children.get(pathKey(path));
    if (state) state.expanded = false;
  }

  isExpanded(path: JsonPath): boolean {
    return this.children.get(pathKey(path))?.expanded ?? false;
  }

  async loadMore(path: JsonPath): Promise<void> {
    const state = this.children.get(pathKey(path));
    if (!state || state.loading || state.rows.length >= state.total) return;
    await this.fetch(path, state.rows.length);
  }

  collapseAll(): void {
    this.children.clear();
    this.searchToken += 1;
    this.searchState = null;
    this.searchTotal = 0;
    this.searchTruncated = false;
    this.searchTimeMs = 0;
  }

  /** Expands the tree breadth-first, stopping at a node budget to stay responsive. */
  async expandToDepth(
    depth: number,
    budget = 200,
  ): Promise<{ expanded: number; truncated: boolean }> {
    this.collapseAll();

    const root = this.root;
    if (!root || depth <= 1 || !root.hasChildren) {
      return { expanded: 0, truncated: false };
    }

    const queue: Array<{ path: JsonPath; level: number }> = [{ path: root.path, level: 1 }];
    let cursor = 0;
    let expanded = 0;
    let truncated = false;

    while (cursor < queue.length) {
      const item = queue[cursor];
      cursor += 1;

      if (item.level >= depth) continue;

      if (expanded >= budget) {
        truncated = true;
        break;
      }

      await this.fetch(item.path, 0);
      expanded += 1;

      const state = this.children.get(pathKey(item.path));
      if (!state) continue;

      for (const child of state.rows) {
        if (child.hasChildren && item.level + 1 < depth) {
          queue.push({ path: child.path, level: item.level + 1 });
        }
      }
    }

    return { expanded, truncated };
  }

  async value(path: JsonPath): Promise<TreeValueResult> {
    if (this.local) return this.local.value(path, TREE_VALUE_LIMIT);
    return this.client.run('treeValue', { path }, { limit: TREE_VALUE_LIMIT });
  }

  visible(): TreeLine[] {
    if (this.searchState) {
      return this.searchState.rows.map((row) => ({
        kind: 'node' as const,
        path: row.path,
        level: 1,
        row,
        expanded: false,
        remaining: 0,
      }));
    }

    const root = this.root;
    if (!root) return [];

    const lines: TreeLine[] = [];

    const walk = (row: TreeRow, level: number): void => {
      const state = this.children.get(pathKey(row.path));
      const expanded = state?.expanded ?? false;
      lines.push({ kind: 'node', path: row.path, level, row, expanded, remaining: 0 });

      if (!expanded || !state) return;

      for (const child of state.rows) walk(child, level + 1);

      const remaining = state.total - state.rows.length;
      if (remaining > 0) {
        lines.push({
          kind: 'more',
          path: row.path,
          level: level + 1,
          row: null,
          expanded: false,
          remaining,
        });
      }
    };

    walk(root, 1);
    return lines;
  }

  async search(query: string): Promise<void> {
    if (!this.root) return;

    const token = ++this.searchToken;
    const started = performance.now();

    if (this.local) {
      const result = this.local.search(query, SEARCH_LIMIT);
      if (token !== this.searchToken) return;
      this.applySearch(result, 0);
      return;
    }

    const result = await this.client.run(
      'treeSearch',
      { query },
      { limit: SEARCH_LIMIT },
    );

    if (token !== this.searchToken) return;

    this.applySearch(result, Math.round((performance.now() - started) * 10) / 10);
  }

  clearSearch(): void {
    this.searchToken += 1;
    this.searchState = null;
    this.searchTotal = 0;
    this.searchTruncated = false;
    this.searchTimeMs = 0;
  }

  get isSearching(): boolean {
    return this.searchState !== null;
  }

  reset(): void {
    this.generation += 1;
    this.searchToken += 1;
    this.client.cancelAll();
    this.local = null;
    this.root = null;
    this.stats = null;
    this.nodeCount = 0;
    this.children.clear();
    this.searchState = null;
    this.searchTotal = 0;
    this.searchTruncated = false;
    this.searchTimeMs = 0;
  }

  cancel(): void {
    this.generation += 1;
    this.client.cancelAll();
  }

  dispose(): void {
    this.searchToken += 1;
    this.generation += 1;
    this.local = null;
    this.client.dispose();
  }

  private applySearch(result: TreeSearchResult, fallbackTimeMs: number): void {
    this.searchState = { rows: result.rows, total: result.total, truncated: result.truncated };
    this.searchTotal = result.total;
    this.searchTruncated = result.truncated;
    this.searchTimeMs = result.timeMs || fallbackTimeMs;
  }

  private async fetch(path: JsonPath, start: number): Promise<void> {
    const key = pathKey(path);
    const existing = this.children.get(key);

    if (existing?.loading) return;

    if (existing) existing.loading = true;

    const generation = this.generation;

    try {
      const result = this.local
        ? this.local.children(path, start, PAGE)
        : await this.client.run('treeChildren', { path }, { start, limit: PAGE });

      if (generation !== this.generation) return;

      const state = this.children.get(key);

      if (!state || start === 0) {
        this.children.set(key, {
          rows: result.rows,
          total: result.total,
          expanded: true,
          loading: false,
        });
        return;
      }

      state.rows = state.rows.concat(result.rows);
      state.total = result.total;
      state.loading = false;
    } catch (error) {
      const state = this.children.get(key);
      if (state) state.loading = false;
      throw error;
    }
  }
}
