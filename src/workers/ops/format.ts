import type { FormatOptions, FormatStats } from '../protocol';
import { OutputBuilder } from './output';
import { parseJson, type JsonSink } from './parser';

export interface FormattedJson {
  output: string;
  stats: FormatStats;
}

class FormatSink implements JsonSink {
  private readonly output = new OutputBuilder();
  private readonly indentUnit: string;

  constructor(indent: FormatOptions['indent']) {
    this.indentUnit = indent === 'tab' ? '\t' : ' '.repeat(indent);
  }

  openObject(): void {
    this.output.push('{');
  }

  closeObject(depth: number, count: number): void {
    if (count > 0) this.output.push('\n', this.indentUnit.repeat(depth));
    this.output.push('}');
  }

  openArray(): void {
    this.output.push('[');
  }

  closeArray(depth: number, count: number): void {
    if (count > 0) this.output.push('\n', this.indentUnit.repeat(depth));
    this.output.push(']');
  }

  key(raw: string, depth: number): void {
    this.output.push('\n', this.indentUnit.repeat(depth), raw);
  }

  element(depth: number): void {
    this.output.push('\n', this.indentUnit.repeat(depth));
  }

  value(raw: string): void {
    this.output.push(raw);
  }

  colon(): void {
    this.output.push(': ');
  }

  comma(): void {
    this.output.push(',');
  }

  toString(): string {
    return this.output.toString();
  }
}

/**
 * Format JSON without parsing numbers through JavaScript's Number type.
 * The scanner validates the grammar and the sink writes the original token text,
 * so 9007199254740993 and high-precision decimals stay intact.
 */
export function formatJson(text: string, options: FormatOptions): FormattedJson {
  const sink = new FormatSink(options.indent);
  const stats = parseJson(text, sink);

  return { output: sink.toString(), stats };
}
