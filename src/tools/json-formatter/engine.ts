import {
  WorkerCancelledError,
  WorkerClient,
  WorkerResponseError,
  WorkerRuntimeError,
  WorkerUnavailableError,
} from '../../workers/client';
import { failure } from '../../workers/protocol';
import type {
  FormatOptions,
  FormatResult,
  ProgressUpdate,
  TextPayload,
} from '../../workers/protocol';
import { JsonFormatError } from '../../workers/ops/errors';
import { FALLBACK_LIMIT } from '../limits';

export interface EngineResult {
  result: FormatResult;
  usedFallback: boolean;
}

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function decode(payload: TextPayload): string {
  if ('text' in payload) return payload.text;

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

/**
 * Prefers the worker. If it cannot start (or crashes on a small document),
 * runs the same pure formatter on the main thread with a strict size cap.
 */
export class JsonFormatterEngine {
  private client = new WorkerClient();

  async format(
    payload: TextPayload,
    options: FormatOptions,
    onProgress?: (progress: ProgressUpdate) => void,
  ): Promise<EngineResult> {
    try {
      const result = await this.client.run('format', payload, options, onProgress);
      return { result, usedFallback: false };
    } catch (error) {
      if (error instanceof WorkerCancelledError) throw error;
      if (!(error instanceof WorkerUnavailableError || error instanceof WorkerRuntimeError)) {
        throw error;
      }

      if ('buffer' in payload && payload.buffer.byteLength === 0) throw error;

      const text = decode(payload);
      if (text.length > FALLBACK_LIMIT) throw error;

      onProgress?.({ phase: 'formatting' });
      await tick();

      try {
        const { formatJson } = await import('../../workers/ops/format');
        const formatted = formatJson(text, options);
        return {
          result: { output: formatted.output, blob: null, stats: formatted.stats },
          usedFallback: true,
        };
      } catch (fallbackError) {
        if (fallbackError instanceof JsonFormatError) {
          throw new WorkerResponseError(fallbackError.toJsonError());
        }

        if (fallbackError instanceof RangeError) {
          throw new WorkerResponseError(
            failure(
              'This input is too large for available memory.',
              'Try a smaller file or close other tabs, then run it again.',
              'oom',
            ),
          );
        }

        throw error;
      }
    }
  }

  cancel(): void {
    this.client.cancelAll();
  }

  dispose(): void {
    this.client.dispose();
  }
}
