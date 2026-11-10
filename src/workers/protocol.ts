/**
 * Typed messages shared by the main thread and the JSON worker.
 * Keep this file free of DOM and worker globals.
 */

export type FormatIndent = 2 | 4 | 'tab';

export interface FormatOptions {
  indent: FormatIndent;
}

export type JsonErrorCode = 'syntax' | 'runtime' | 'oom' | 'encoding';

export interface JsonError {
  code?: JsonErrorCode;
  message: string;
  line: number;
  column: number;
  offset: number;
  hint: string;
}

export interface FormatStats {
  bytes: number;
  lines: number;
  depth: number;
  keys: number;
  values: number;
  arrays: number;
  objects: number;
  parseTimeMs: number;
}

export interface FormatResult {
  /** Null when the output was too large and was returned as a Blob. */
  output: string | null;
  blob: Blob | null;
  stats: FormatStats;
}

export interface MinifyStats extends FormatStats {
  outputBytes: number;
  savedPercent: number;
}

export interface MinifyResult {
  output: string | null;
  blob: Blob | null;
  stats: MinifyStats;
}

export interface ValidateResult {
  stats: FormatStats;
}

export type RepairFixKind =
  | 'comments'
  | 'trailingCommas'
  | 'singleQuotes'
  | 'smartQuotes'
  | 'unquotedKeys'
  | 'pythonLiterals';

export interface RepairFix {
  kind: RepairFixKind;
  count: number;
}

export interface RepairStats extends FormatStats {
  fixes: RepairFix[];
}

export interface RepairResult {
  output: string | null;
  blob: Blob | null;
  stats: RepairStats;
}

export type JsonType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export type JsonPath = (string | number)[];

export interface TreeRow {
  path: JsonPath;
  label: string;
  type: JsonType;
  preview: string;
  hasChildren: boolean;
  childCount: number;
}

export interface TreeLoadResult {
  row: TreeRow;
  stats: FormatStats;
  nodes: number;
}

export interface TreeChildrenResult {
  rows: TreeRow[];
  total: number;
}

export interface TreeSearchResult {
  rows: TreeRow[];
  total: number;
  truncated: boolean;
  timeMs: number;
}

export interface TreeValueResult {
  found: boolean;
  text: string | null;
  size: number;
}

export type DiffType = 'added' | 'removed' | 'changed';

export interface DiffEntry {
  path: string;
  type: DiffType;
  old?: string;
  new?: string;
}

export interface DiffStats {
  added: number;
  removed: number;
  changed: number;
  total: number;
  leftBytes: number;
  rightBytes: number;
  parseTimeMs: number;
  truncated: boolean;
}

export interface DiffResult {
  entries: DiffEntry[];
  stats: DiffStats;
}

export interface DiffOptions {
  ignoreArrayOrder: boolean;
}

export interface DiffPayload {
  left: string;
  right: string;
}

export type TextPayload = { text: string } | { buffer: ArrayBuffer };

export interface TreePageOptions {
  start: number;
  limit: number;
}

export interface OpMap {
  format: {
    payload: TextPayload;
    options: FormatOptions;
    result: FormatResult;
  };
  minify: {
    payload: TextPayload;
    options: Record<string, never>;
    result: MinifyResult;
  };
  validate: {
    payload: TextPayload;
    options: Record<string, never>;
    result: ValidateResult;
  };
  repair: {
    payload: TextPayload;
    options: FormatOptions;
    result: RepairResult;
  };
  tree: {
    payload: TextPayload;
    options: Record<string, never>;
    result: TreeLoadResult;
  };
  treeChildren: {
    payload: { path: JsonPath };
    options: TreePageOptions;
    result: TreeChildrenResult;
  };
  treeSearch: {
    payload: { query: string };
    options: { limit: number };
    result: TreeSearchResult;
  };
  treeValue: {
    payload: { path: JsonPath };
    options: { limit: number };
    result: TreeValueResult;
  };
  diff: {
    payload: DiffPayload;
    options: DiffOptions;
    result: DiffResult;
  };
}

export type WorkerOp = keyof OpMap;

export type WorkerRequest = {
  [K in WorkerOp]: {
    id: number;
    op: K;
    payload: OpMap[K]['payload'];
    options: OpMap[K]['options'];
  };
}[WorkerOp];

export type ProgressPhase =
  | 'reading'
  | 'formatting'
  | 'minifying'
  | 'validating'
  | 'repairing'
  | 'indexing'
  | 'comparing'
  | 'searching';

export interface ProgressUpdate {
  phase: ProgressPhase;
}

export type WorkerResponse<T = unknown> =
  | { id: number; ok: true; result: T }
  | { id: number; ok: false; error: JsonError }
  | { id: number; type: 'progress'; progress: ProgressUpdate };

export function failure(
  message: string,
  hint: string,
  code: JsonErrorCode = 'runtime',
): JsonError {
  return { code, message, line: 0, column: 0, offset: 0, hint };
}
