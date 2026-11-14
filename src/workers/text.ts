import { WorkerResponseError } from './client';
import { failure } from './protocol';
import type { TextPayload } from './protocol';

/** Decode a text payload once, reporting bad UTF-8 as a typed failure. */
export function decodePayload(payload: TextPayload): string {
  if ('text' in payload) return payload.text;

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(payload.buffer);
  } catch {
    throw new WorkerResponseError(failure('', '', 'encoding'));
  }
}

/** Rough character size of any op payload, for the main-thread fallback cap. */
export function payloadSize(payload: unknown): number {
  if (typeof payload !== 'object' || payload === null) return 0;

  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.text === 'string') return candidate.text.length;
  if (candidate.buffer instanceof ArrayBuffer) return candidate.buffer.byteLength;

  const { left, right } = candidate;
  if (typeof left === 'string' && typeof right === 'string') return left.length + right.length;

  return 0;
}
