import type { ValidateResult } from '../protocol';
import { NullSink, parseJson } from './parser';

/** Validate strict JSON and collect the same stats used by the formatter. */
export function validateJson(text: string): ValidateResult {
  return { stats: parseJson(text, new NullSink()) };
}
