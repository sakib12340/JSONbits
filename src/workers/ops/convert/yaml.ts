import type {
  ConvertResult,
  JsonToYamlOptions,
  YamlToJsonOptions,
} from '../../protocol';
import { JsonFormatError } from '../errors';
import { finishStats, indentUnit, readJsonValue } from './common';

function invalid(message: string, hint: string, line = 1, column = 1): JsonFormatError {
  return new JsonFormatError(message, hint, 0, line, column);
}

function cleanMessage(message: string): string {
  const firstLine = message.split('\n')[0]?.trim() ?? message;
  return (
    firstLine.replace(/\s+at line \d+, column \d+:?$/i, '').trim() || firstLine
  );
}

function yamlHint(message: string): string {
  const text = message.toLowerCase();

  if (text.includes('tab')) {
    return 'YAML indentation must use spaces. Replace the tabs with spaces and try again.';
  }

  if (text.includes('indent')) {
    return 'Align this line with its parent key; each nested block should be indented further.';
  }

  if (text.includes('duplicate') || text.includes('unique')) {
    return 'This key appears twice in the same block. Remove or rename one of them.';
  }

  if (text.includes('multiple document')) {
    return 'Convert one YAML document at a time, without a second --- separator.';
  }

  if (text.includes('alias')) {
    return 'Simplify the anchors and aliases, or reduce how often they are reused.';
  }

  return 'Check the indentation, the key: value syntax, and quotes around this line.';
}

export async function jsonToYaml(
  text: string,
  options: JsonToYamlOptions,
): Promise<ConvertResult> {
  const YAML = await import('yaml');
  const started = performance.now();
  const value = readJsonValue(text);
  const output = YAML.stringify(value, {
    indent: options.indent,
    lineWidth: 0,
  });
  const stats = finishStats(text, output, started);

  return { output, blob: null, stats };
}

export async function yamlToJson(
  text: string,
  options: YamlToJsonOptions,
): Promise<ConvertResult> {
  const YAML = await import('yaml');
  const started = performance.now();

  let document: ReturnType<typeof YAML.parseDocument>;

  try {
    document = YAML.parseDocument(text);
  } catch (error) {
    const position = (error as { linePos?: [{ line: number; col: number }] }).linePos?.[0];
    throw invalid(
      error instanceof Error ? cleanMessage(error.message) : 'This YAML could not be read.',
      'Check the indentation and structure, then try again.',
      position?.line ?? 1,
      position?.col ?? 1,
    );
  }

  const firstError = document.errors[0];

  if (firstError) {
    const position = firstError.linePos?.[0];
    throw invalid(
      cleanMessage(firstError.message),
      yamlHint(firstError.message),
      position?.line,
      position?.col,
    );
  }

  let value: unknown;

  try {
    value = document.toJS({ maxAliasCount: 100 });
  } catch (error) {
    throw invalid(
      error instanceof Error ? error.message : 'This YAML could not be read.',
      'Simplify the document and try again.',
    );
  }

  const output = JSON.stringify(value ?? null, null, indentUnit(options.indent)) || 'null';
  const stats = finishStats(text, output, started);

  return { output, blob: null, stats };
}
