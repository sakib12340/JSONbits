import { JsonFormatError } from './ops/errors';
import { formatJson } from './ops/format';
import { failure } from './protocol';
import type { ProgressUpdate, WorkerRequest, WorkerResponse } from './protocol';

/** Beyond this size the worker returns a Blob instead of cloning a huge string. */
const MAX_TEXT_OUTPUT = 4_000_000;

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const scope = self as unknown as WorkerScope;

function post(message: WorkerResponse): void {
  scope.postMessage(message);
}

function progress(id: number, phase: ProgressUpdate['phase']): void {
  post({ id, type: 'progress', progress: { phase } });
}

/** Let queued progress messages reach the main thread before heavy work starts. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function handle(request: WorkerRequest): Promise<void> {
  const { id } = request;

  try {
    let text: string;

    if ('buffer' in request.payload) {
      progress(id, 'reading');
      await tick();

      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(request.payload.buffer);
      } catch {
        post({
          id,
          ok: false,
          error: failure(
            'This file is not valid UTF-8 text.',
            'Open the file in a text editor and save it as UTF-8, then try again.',
            'encoding',
          ),
        });
        return;
      }
    } else {
      text = request.payload.text;
    }

    progress(id, 'formatting');
    await tick();

    const result = formatJson(text, request.options);

    if (result.output.length > MAX_TEXT_OUTPUT) {
      const blob = new Blob([result.output], { type: 'application/json' });
      post({ id, ok: true, result: { output: null, blob, stats: result.stats } });
      return;
    }

    post({ id, ok: true, result: { output: result.output, blob: null, stats: result.stats } });
  } catch (error) {
    if (error instanceof JsonFormatError) {
      post({ id, ok: false, error: error.toJsonError() });
      return;
    }

    if (error instanceof RangeError) {
      post({
        id,
        ok: false,
        error: failure(
          'This input is too large for available memory.',
          'Try a smaller file or close other tabs, then run it again.',
          'oom',
        ),
      });
      return;
    }

    post({
      id,
      ok: false,
      error: failure(
        'The formatter stopped unexpectedly.',
        'Reload the page and try again. Your data was never uploaded.',
      ),
    });
  }
}

scope.onmessage = (event) => {
  void handle(event.data);
};
