/**
 * Deep module for running one JSON op: picks the worker or the main-thread
 * fallback, owns request identity, and turns every failure into a typed
 * `RunFailure` the UI can translate. No DOM, no strings, no status text.
 */
import {
  WorkerCancelledError,
  WorkerClient,
  WorkerResponseError,
  WorkerRuntimeError,
  WorkerUnavailableError,
} from './client';
import { failure } from './protocol';
import type { JsonError, OpMap, ProgressUpdate, WorkerOp } from './protocol';
import { runLocal, type LocalContext } from './local-ops';
import { payloadSize } from './text';
import { FALLBACK_LIMIT, MAX_FILE } from '../tools/limits';

export type FailureKind =
  | 'response'
  | 'oom'
  | 'encoding'
  | 'runtime'
  | 'file-too-big'
  | 'read-failed';

export interface RunFailure {
  kind: FailureKind;
  /** Parser detail for `response`; a placeholder for the other kinds. */
  info: JsonError;
}

export type RunOutcome<K extends WorkerOp> =
  | { status: 'ok'; result: OpMap[K]['result']; usedFallback: boolean }
  | { status: 'failed'; failure: RunFailure }
  | { status: 'stale' };

export interface RunHooks {
  onProgress?: (progress: ProgressUpdate) => void;
  /** Local fallback is on by default; stateful callers can opt out. */
  allowLocal?: boolean;
}

/** The worker seam. `WorkerClient` is the only production adapter. */
export interface OpClient {
  run<K extends WorkerOp>(
    op: K,
    payload: OpMap[K]['payload'],
    options: OpMap[K]['options'],
    onProgress?: (progress: ProgressUpdate) => void,
  ): Promise<OpMap[K]['result']>;
  cancelAll(): void;
}

function isRecoverable(error: unknown): boolean {
  return error instanceof WorkerUnavailableError || error instanceof WorkerRuntimeError;
}

export class RunController {
  private readonly client: OpClient;
  private readonly local: LocalContext = { tree: null };
  private token = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(client: OpClient = new WorkerClient()) {
    this.client = client;
  }

  /** Run one op. Never throws; stale results are reported, not applied. */
  async run<K extends WorkerOp>(
    op: K,
    payload: OpMap[K]['payload'],
    options: OpMap[K]['options'],
    hooks: RunHooks = {},
  ): Promise<RunOutcome<K>> {
    const token = this.token;

    // A fresh tree load always tries the worker first; earlier fallback state goes away.
    if (op === 'tree') this.local.tree = null;

    // Once a tree was built on the main thread, keep answering from it so row
    // paths stay consistent even if the worker respawns without the document.
    if (op !== 'tree' && this.local.tree !== null) {
      return this.runLocalOnly(op, payload, options, token);
    }

    try {
      const onProgress = hooks.onProgress
        ? (progress: ProgressUpdate): void => {
            if (token === this.token) hooks.onProgress?.(progress);
          }
        : undefined;
      const result = await this.client.run(op, payload, options, onProgress);
      return token === this.token ? { status: 'ok', result, usedFallback: false } : { status: 'stale' };
    } catch (error) {
      if (error instanceof WorkerCancelledError) return { status: 'stale' };
      if (token !== this.token) return { status: 'stale' };
      if (!isRecoverable(error) || hooks.allowLocal === false) {
        return { status: 'failed', failure: this.describe(error) };
      }
      return this.runFallback(op, payload, options, token);
    }
  }

  /** A file read is its own async step, so the caller keeps the same token across it. */
  async runFile<K extends WorkerOp>(
    op: K,
    file: File,
    options: OpMap[K]['options'],
    hooks: RunHooks = {},
  ): Promise<RunOutcome<K>> {
    if (file.size > MAX_FILE) {
      return { status: 'failed', failure: { kind: 'file-too-big', info: failure('', '') } };
    }

    const token = this.token;
    let buffer: ArrayBuffer;

    try {
      buffer = await file.arrayBuffer();
    } catch {
      return token === this.token
        ? { status: 'failed', failure: { kind: 'read-failed', info: failure('', '') } }
        : { status: 'stale' };
    }

    if (token !== this.token || this.disposed) return { status: 'stale' };

    return this.run(op, { buffer }, options, hooks);
  }

  /** Debounce live typing; the latest scheduled task wins. */
  schedule(task: () => void, delayMs = 250): void {
    this.cancelScheduled();
    this.timer = setTimeout(() => {
      this.timer = null;
      task();
    }, delayMs);
  }

  cancelScheduled(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  /** Cancel in-flight work: pending outcomes become `stale`. */
  cancel(): void {
    this.token += 1;
    this.client.cancelAll();
  }

  dispose(): void {
    this.disposed = true;
    this.cancelScheduled();
    this.cancel();
  }

  private async runFallback<K extends WorkerOp>(
    op: K,
    payload: OpMap[K]['payload'],
    options: OpMap[K]['options'],
    token: number,
  ): Promise<RunOutcome<K>> {
    if (payloadSize(payload) > FALLBACK_LIMIT) {
      return { status: 'failed', failure: { kind: 'runtime', info: failure('', '') } };
    }

    try {
      const result = await runLocal(op, payload, options, this.local);
      return token === this.token
        ? { status: 'ok', result, usedFallback: true }
        : { status: 'stale' };
    } catch (error) {
      return { status: 'failed', failure: this.describe(error) };
    }
  }

  private async runLocalOnly<K extends WorkerOp>(
    op: K,
    payload: OpMap[K]['payload'],
    options: OpMap[K]['options'],
    token: number,
  ): Promise<RunOutcome<K>> {
    try {
      const result = await runLocal(op, payload, options, this.local);
      return token === this.token
        ? { status: 'ok', result, usedFallback: true }
        : { status: 'stale' };
    } catch (error) {
      return { status: 'failed', failure: this.describe(error) };
    }
  }

  private describe(error: unknown): RunFailure {
    if (error instanceof WorkerResponseError) {
      const code = error.info.code;
      const kind = code === 'oom' ? 'oom' : code === 'encoding' ? 'encoding' : code === 'runtime' ? 'runtime' : 'response';
      return { kind, info: error.info };
    }

    if (error instanceof RangeError) return { kind: 'oom', info: failure('', '') };
    if (error instanceof WorkerUnavailableError) return { kind: 'runtime', info: failure('', '') };
    if (error instanceof WorkerRuntimeError) return { kind: 'runtime', info: failure('', '') };

    const info = toJsonError(error);
    return info ? { kind: 'response', info } : { kind: 'runtime', info: failure('', '') };
  }
}

interface JsonErrorLike {
  toJsonError(): JsonError;
}

function toJsonError(error: unknown): JsonError | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as Partial<JsonErrorLike>;
  return typeof candidate.toJsonError === 'function' ? candidate.toJsonError() : null;
}
