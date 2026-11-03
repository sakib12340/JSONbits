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

export interface ProgressUpdate {
  phase: 'reading' | 'formatting';
}

export type WorkerRequest = {
  id: number;
  op: 'format';
  payload: { text: string } | { buffer: ArrayBuffer };
  options: FormatOptions;
};

export type WorkerResponse =
  | { id: number; ok: true; result: FormatResult }
  | { id: number; ok: false; error: JsonError }
  | { id: number; type: 'progress'; progress: ProgressUpdate };

export function failure(
  message: string,
  hint: string,
  code: JsonErrorCode = 'runtime',
): JsonError {
  return { code, message, line: 0, column: 0, offset: 0, hint };
}
