import type { MinifyResult } from '../protocol';
import { OutputBuilder } from './output';
import { parseJson, type JsonSink } from './parser';
import { utf8Length } from './stats';

class MinifySink implements JsonSink {
  private readonly output = new OutputBuilder();

  openObject(): void {
    this.output.push('{');
  }

  closeObject(): void {
    this.output.push('}');
  }

  openArray(): void {
    this.output.push('[');
  }

  closeArray(): void {
    this.output.push(']');
  }

  key(raw: string): void {
    this.output.push(raw);
  }

  element(): void {}

  value(raw: string): void {
    this.output.push(raw);
  }

  colon(): void {
    this.output.push(':');
  }

  comma(): void {
    this.output.push(',');
  }

  toString(): string {
    return this.output.toString();
  }
}

/** Remove insignificant whitespace while preserving every scalar token. */
export function minifyJson(text: string): MinifyResult {
  const sink = new MinifySink();
  const stats = parseJson(text, sink);
  const output = sink.toString();
  const outputBytes = utf8Length(output);
  const savedPercent =
    stats.bytes > 0 ? Math.round((1 - outputBytes / stats.bytes) * 100) : 0;

  return {
    output,
    blob: null,
    stats: { ...stats, outputBytes, savedPercent },
  };
}
