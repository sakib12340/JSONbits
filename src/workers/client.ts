import type {
  FormatOptions,
  FormatResult,
  JsonError,
  ProgressUpdate,
  WorkerRequest,
  WorkerResponse,
} from './protocol';

export class WorkerCancelledError extends Error {
  constructor() {
    super('Formatting cancelled.');
    this.name = 'WorkerCancelledError';
  }
}

export class WorkerUnavailableError extends Error {
  constructor(message = 'Web Workers are not available in this browser.') {
    super(message);
    this.name = 'WorkerUnavailableError';
  }
}

export class WorkerRuntimeError extends Error {
  constructor(message = 'The private engine stopped unexpectedly.') {
    super(message);
    this.name = 'WorkerRuntimeError';
  }
}

export class WorkerResponseError extends Error {
  readonly info: JsonError;

  constructor(info: JsonError) {
    super(info.message);
    this.name = 'WorkerResponseError';
    this.info = info;
  }
}

interface Pending {
  resolve: (result: FormatResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: ProgressUpdate) => void;
}

export class WorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  run(
    payload: WorkerRequest['payload'],
    options: FormatOptions,
    onProgress?: (progress: ProgressUpdate) => void,
  ): Promise<FormatResult> {
    const worker = this.ensureWorker();
    const id = this.nextId;
    this.nextId += 1;

    return new Promise<FormatResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });

      const request: WorkerRequest = { id, op: 'format', payload, options };

      try {
        if ('buffer' in payload) {
          worker.postMessage(request, [payload.buffer]);
        } else {
          worker.postMessage(request);
        }
      } catch {
        this.pending.delete(id);
        this.failAll(new WorkerRuntimeError('The formatter could not start.'));
      }
    });
  }

  /** Terminate and respawn on the next run. Used for stale requests and Cancel. */
  cancelAll(): void {
    if (this.pending.size === 0 && !this.worker) return;

    const error = new WorkerCancelledError();
    const pending = [...this.pending.values()];
    this.pending.clear();
    this.stop();
    for (const entry of pending) entry.reject(error);
  }

  dispose(): void {
    this.cancelAll();
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    if (typeof Worker === 'undefined') {
      throw new WorkerUnavailableError();
    }

    let worker: Worker;

    try {
      worker = new Worker(new URL('./json.worker.ts', import.meta.url), {
        type: 'module',
        name: 'jsonbits-engine',
      });
    } catch {
      throw new WorkerUnavailableError('The private engine could not start.');
    }

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.receive(event.data);
    };

    worker.onerror = (event) => {
      event.preventDefault();
      this.failAll(new WorkerRuntimeError(event.message || undefined));
    };

    worker.onmessageerror = () => {
      this.failAll(new WorkerRuntimeError('The private engine returned unreadable data.'));
    };

    this.worker = worker;
    return worker;
  }

  private receive(message: WorkerResponse): void {
    const entry = this.pending.get(message.id);
    if (!entry) return;

    if ('type' in message) {
      entry.onProgress?.(message.progress);
      return;
    }

    this.pending.delete(message.id);

    if (message.ok) {
      entry.resolve(message.result);
    } else {
      entry.reject(new WorkerResponseError(message.error));
    }
  }

  private failAll(error: Error): void {
    const pending = [...this.pending.values()];
    this.pending.clear();
    this.stop();
    for (const entry of pending) entry.reject(error);
  }

  private stop(): void {
    if (!this.worker) return;
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.onmessageerror = null;
    this.worker.terminate();
    this.worker = null;
  }
}
