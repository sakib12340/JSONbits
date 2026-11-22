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
  line: number;
  column: number;
  before: string;
  after: string;
  description: string;
  ambiguous?: boolean;
}

export interface RepairTextDiffLine {
  type: 'equal' | 'removed' | 'added' | 'changed';
  left: string | null;
  right: string | null;
}

export interface RepairStats extends FormatStats {
  fixes: RepairFix[];
}

export interface RepairResult {
  output: string | null;
  blob: Blob | null;
  stats: RepairStats;
  fixes: RepairFix[];
  fixCount: number;
  diff: RepairTextDiffLine[];
}

export interface ConvertStats {
  bytes: number;
  outputBytes: number;
  lines: number;
  parseTimeMs: number;
  rows?: number;
  columns?: number;
}

export interface ConvertResult {
  output: string | null;
  blob: Blob | null;
  stats: ConvertStats;
}

export type CsvDelimiter = ',' | ';' | '\t' | '|';
export type CsvArrays = 'json' | 'join';

export interface JsonToCsvOptions {
  delimiter: CsvDelimiter;
  flatten: boolean;
  header: boolean;
  guard: boolean;
  arrays: CsvArrays;
}

export interface CsvToJsonOptions {
  delimiter: CsvDelimiter | '';
  header: boolean;
  inferTypes: boolean;
}

export interface JsonToYamlOptions {
  indent: 2 | 4;
}

export interface YamlToJsonOptions {
  indent: FormatIndent;
}

export interface JsonToXmlOptions {
  rootName: string;
  indent: 2 | 4;
  attributes: boolean;
}

export interface XmlToJsonOptions {
  indent: FormatIndent;
  attributes: boolean;
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

export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  direction: SortDirection;
  /** Sort every nested object, not just the first level. */
  deep: boolean;
  indent: FormatIndent;
}

export interface SortStats extends FormatStats {
  sortedKeys: number;
}

export interface SortResult {
  output: string | null;
  blob: Blob | null;
  stats: SortStats;
}

export type EscapeMode = 'escape' | 'unescape';

export interface EscapeOptions {
  mode: EscapeMode;
  /** Wrap escaped output in double quotes. */
  quotes: boolean;
  /** Escape every non-ASCII character as \uXXXX. */
  ascii: boolean;
}

export interface EscapeStats {
  bytes: number;
  outputBytes: number;
  lines: number;
  replacements: number;
  parseTimeMs: number;
}

export interface EscapeResult {
  output: string | null;
  blob: Blob | null;
  stats: EscapeStats;
}

export interface JsonPathOptions {
  expression: string;
  /** Maximum matches before the result is truncated. */
  limit: number;
}

export interface JsonPathStats {
  bytes: number;
  outputBytes: number;
  lines: number;
  matches: number;
  total: number;
  truncated: boolean;
  parseTimeMs: number;
}

export interface JsonPathResult {
  output: string | null;
  blob: Blob | null;
  stats: JsonPathStats;
}

export interface TypescriptOptions {
  rootName: string;
  readonly: boolean;
}

export interface TypescriptStats {
  bytes: number;
  outputBytes: number;
  lines: number;
  declarations: number;
  properties: number;
  parseTimeMs: number;
}

export interface TypescriptResult {
  output: string | null;
  blob: Blob | null;
  stats: TypescriptStats;
}

export interface SchemaPayload {
  schema: string;
  document: string;
}

export interface SchemaIssue {
  path: string;
  keyword: string;
  message: string;
}

export interface SchemaStats {
  checked: number;
  errors: number;
  timeMs: number;
  schemaBytes: number;
  documentBytes: number;
}

export interface SchemaResult {
  valid: boolean;
  errors: SchemaIssue[];
  schemaErrors: string[];
  /** Validation keywords present in the schema that this validator skips. */
  unsupported: string[];
  stats: SchemaStats;
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
  sort: {
    payload: TextPayload;
    options: SortOptions;
    result: SortResult;
  };
  escape: {
    payload: TextPayload;
    options: EscapeOptions;
    result: EscapeResult;
  };
  jsonpath: {
    payload: TextPayload;
    options: JsonPathOptions;
    result: JsonPathResult;
  };
  jsonToTypescript: {
    payload: TextPayload;
    options: TypescriptOptions;
    result: TypescriptResult;
  };
  validateSchema: {
    payload: SchemaPayload;
    options: Record<string, never>;
    result: SchemaResult;
  };
  jsonToCsv: {
    payload: TextPayload;
    options: JsonToCsvOptions;
    result: ConvertResult;
  };
  csvToJson: {
    payload: TextPayload;
    options: CsvToJsonOptions;
    result: ConvertResult;
  };
  jsonToYaml: {
    payload: TextPayload;
    options: JsonToYamlOptions;
    result: ConvertResult;
  };
  yamlToJson: {
    payload: TextPayload;
    options: YamlToJsonOptions;
    result: ConvertResult;
  };
  jsonToXml: {
    payload: TextPayload;
    options: JsonToXmlOptions;
    result: ConvertResult;
  };
  xmlToJson: {
    payload: TextPayload;
    options: XmlToJsonOptions;
    result: ConvertResult;
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
  | 'converting'
  | 'sorting'
  | 'escaping'
  | 'querying'
  | 'generating'
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
