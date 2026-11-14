import type {
  FormatStats,
  JsonPath,
  OpMap,
  ProgressUpdate,
  TreeRow,
  TreeSearchResult,
  TreeValueResult,
  WorkerOp,
} from '../../workers/protocol';
import { RunController, type RunOutcome } from '../../workers/run-controller';
import { TREE_VALUE_LIMIT } from '../limits';

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

/** Holds the worker-side tree state and only materializes expanded rows. */
export class TreeStore {
  root: TreeRow | null = null;
  stats: FormatStats | null = null;
  nodeCount = 0;
  searchTotal = 0;
  searchTruncated = false;
  searchTimeMs = 0;

  private readonly runs = new RunController();
  private readonly children = new Map<string, NodeState>();
  private searchState: SearchState | null = null;
  private generation = 0;
  private searchToken = 0;

  async load(
    payload: OpMap['tree']['payload'],
    onProgress?: (progress: ProgressUpdate) => void,
  ): Promise<RunOutcome<'tree'>> {
    const generation = ++this.generation;
    return this.applyLoad(await this.runs.run('tree', payload, {}, { onProgress }), generation);
  }

  async loadFile(
    file: File,
    onProgress?: (progress: ProgressUpdate) => void,
  ): Promise<RunOutcome<'tree'>> {
    const generation = ++this.generation;
    return this.applyLoad(await this.runs.runFile('tree', file, {}, { onProgress }), generation);
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
    return this.op('treeValue', { path }, { limit: TREE_VALUE_LIMIT });
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

    const result = await this.op('treeSearch', { query }, { limit: SEARCH_LIMIT });

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
    this.runs.cancel();
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
    this.runs.cancel();
  }

  dispose(): void {
    this.searchToken += 1;
    this.generation += 1;
    this.runs.dispose();
  }

  private applyLoad(
    outcome: RunOutcome<'tree'>,
    generation: number,
  ): RunOutcome<'tree'> {
    if (outcome.status !== 'ok' || generation !== this.generation) return outcome;

    this.root = outcome.result.row;
    this.stats = outcome.result.stats;
    this.nodeCount = outcome.result.nodes;
    this.children.clear();
    this.searchState = null;
    this.searchTotal = 0;
    this.searchTruncated = false;
    this.searchTimeMs = 0;
    this.searchToken += 1;

    return outcome;
  }

  private applySearch(result: TreeSearchResult, fallbackTimeMs: number): void {
    this.searchState = { rows: result.rows, total: result.total, truncated: result.truncated };
    this.searchTotal = result.total;
    this.searchTruncated = result.truncated;
    this.searchTimeMs = result.timeMs || fallbackTimeMs;
  }

  /** Unwrap an outcome for the UI, which reports failures through its own status line. */
  private async op<K extends WorkerOp>(
    op: K,
    payload: OpMap[K]['payload'],
    options: OpMap[K]['options'],
  ): Promise<OpMap[K]['result']> {
    const outcome = await this.runs.run(op, payload, options);

    if (outcome.status === 'ok') return outcome.result;
    if (outcome.status === 'stale') throw new Error('The run was cancelled.');
    throw new Error(outcome.failure.info.message || 'The private engine failed.');
  }

  private async fetch(path: JsonPath, start: number): Promise<void> {
    const key = pathKey(path);
    const existing = this.children.get(key);

    if (existing?.loading) return;

    if (existing) existing.loading = true;

    const generation = this.generation;

    try {
      const result = await this.op('treeChildren', { path }, { start, limit: PAGE });

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
