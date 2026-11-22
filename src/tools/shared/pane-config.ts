import type {
  EscapeOptions,
  FormatIndent,
  JsonPathOptions,
  JsonToJsonSchemaOptions,
  SortOptions,
  TypescriptOptions,
  ZodOptions,
} from '../../workers/protocol';

export type PaneOp =
  | 'sort'
  | 'escape'
  | 'jsonpath'
  | 'jsonToTypescript'
  | 'jsonToJsonSchema'
  | 'jsonToZod';
export type PaneOptions =
  | SortOptions
  | EscapeOptions
  | JsonPathOptions
  | TypescriptOptions
  | JsonToJsonSchemaOptions
  | ZodOptions;

export interface PaneStats {
  bytes: number;
  outputBytes?: number;
  lines: number;
  parseTimeMs: number;
  [key: string]: number | string | boolean | undefined;
}

export interface PaneOutputInfo {
  extension: string;
  mime: string;
}

const outputInfo: Record<PaneOp, PaneOutputInfo> = {
  sort: { extension: 'json', mime: 'application/json' },
  escape: { extension: 'txt', mime: 'text/plain' },
  jsonpath: { extension: 'json', mime: 'application/json' },
  jsonToTypescript: { extension: 'ts', mime: 'text/plain' },
  jsonToJsonSchema: { extension: 'schema.json', mime: 'application/schema+json' },
  jsonToZod: { extension: 'ts', mime: 'text/plain' },
};

export function paneOutput(op: PaneOp): PaneOutputInfo {
  return outputInfo[op];
}

function field(shell: HTMLElement, name: string): HTMLElement | null {
  return shell.querySelector<HTMLElement>(`[data-option="${name}"]`);
}

function text(shell: HTMLElement, name: string, fallback: string): string {
  const input = field(shell, name);

  if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
    return input.value;
  }

  return input?.dataset.value ?? fallback;
}

function checked(shell: HTMLElement, name: string, fallback: boolean): boolean {
  const input = field(shell, name);
  return input instanceof HTMLInputElement ? input.checked : fallback;
}

function indent(value: string): FormatIndent {
  return value === 'tab' ? 'tab' : value === '4' ? 4 : 2;
}

export function readPaneOptions(shell: HTMLElement, op: PaneOp): PaneOptions {
  switch (op) {
    case 'sort':
      return {
        direction: text(shell, 'direction', 'asc') === 'desc' ? 'desc' : 'asc',
        deep: checked(shell, 'deep', true),
        indent: indent(text(shell, 'indent', '2')),
      };

    case 'escape':
      return {
        mode: text(shell, 'mode', 'escape') === 'unescape' ? 'unescape' : 'escape',
        quotes: checked(shell, 'quotes', true),
        ascii: checked(shell, 'ascii', false),
      };

    case 'jsonpath': {
      const modes = ['values', 'flat', 'first', 'paths', 'pathValue'] as const;
      const raw = text(shell, 'mode', 'values');
      const mode = modes.includes(raw as (typeof modes)[number])
        ? (raw as (typeof modes)[number])
        : 'values';
      return {
        expression: text(shell, 'expression', '').trim(),
        limit: 20_000,
        display: 2_000,
        mode,
      };
    }

    case 'jsonToJsonSchema':
      return {
        draft: text(shell, 'draft', '2020-12') === 'draft-07' ? 'draft-07' : '2020-12',
        additionalProperties: checked(shell, 'additionalProperties', false),
        detectFormats: checked(shell, 'detectFormats', true),
        detectEnums: checked(shell, 'detectEnums', false),
        includeSchema: checked(shell, 'includeSchema', true),
        includeTitle: checked(shell, 'includeTitle', false),
        title: text(shell, 'title', 'Sample').trim() || 'Sample',
      };

    case 'jsonToZod':
      return {
        schemaName: text(shell, 'schemaName', 'Root').trim() || 'Root',
        exportKeyword: checked(shell, 'exportKeyword', true),
        inferType: checked(shell, 'inferType', true),
        optionalNullable: checked(shell, 'optionalNullable', true),
        strict: checked(shell, 'strict', false),
      };

    case 'jsonToTypescript':
      return {
        rootName: text(shell, 'root', 'Root').trim() || 'Root',
        readonly: checked(shell, 'readonly', false),
      };
  }
}
