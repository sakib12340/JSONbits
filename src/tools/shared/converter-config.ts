import type {
  ConvertResult,
  CsvDelimiter,
  CsvToJsonOptions,
  FormatIndent,
  JsonToCsvOptions,
  JsonToXmlOptions,
  JsonToYamlOptions,
  XmlToJsonOptions,
  YamlToJsonOptions,
} from '../../workers/protocol';

export type ConverterOp =
  | 'jsonToCsv'
  | 'csvToJson'
  | 'jsonToYaml'
  | 'yamlToJson'
  | 'jsonToXml'
  | 'xmlToJson';

export type ConverterOptions =
  | JsonToCsvOptions
  | CsvToJsonOptions
  | JsonToYamlOptions
  | YamlToJsonOptions
  | JsonToXmlOptions
  | XmlToJsonOptions;

export interface OutputInfo {
  extension: string;
  mime: string;
}

const outputInfo: Record<ConverterOp, OutputInfo> = {
  jsonToCsv: { extension: 'csv', mime: 'text/csv' },
  csvToJson: { extension: 'json', mime: 'application/json' },
  jsonToYaml: { extension: 'yaml', mime: 'application/yaml' },
  yamlToJson: { extension: 'json', mime: 'application/json' },
  jsonToXml: { extension: 'xml', mime: 'application/xml' },
  xmlToJson: { extension: 'json', mime: 'application/json' },
};

export function converterOutput(op: ConverterOp): OutputInfo {
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

function delimiter(value: string): CsvDelimiter {
  return value === ';' || value === '\t' || value === '|' ? value : ',';
}

function indent(value: string): FormatIndent {
  return value === 'tab' ? 'tab' : value === '4' ? 4 : 2;
}

export function readConverterOptions(
  shell: HTMLElement,
  op: ConverterOp,
): ConverterOptions {
  switch (op) {
    case 'jsonToCsv':
      return {
        delimiter: delimiter(text(shell, 'delimiter', ',')),
        flatten: checked(shell, 'flatten', true),
        header: checked(shell, 'header', true),
        guard: checked(shell, 'guard', false),
        arrays: text(shell, 'arrays', 'join') === 'json' ? 'json' : 'join',
      };

    case 'csvToJson': {
      const raw = text(shell, 'delimiter', '');
      return {
        delimiter: raw === '' ? '' : delimiter(raw),
        header: checked(shell, 'header', true),
        inferTypes: checked(shell, 'infer', false),
      };
    }

    case 'jsonToYaml':
      return { indent: text(shell, 'indent', '2') === '4' ? 4 : 2 };

    case 'yamlToJson':
      return { indent: indent(text(shell, 'indent', '2')) };

    case 'jsonToXml':
      return {
        rootName: text(shell, 'root', 'root'),
        indent: text(shell, 'indent', '2') === '4' ? 4 : 2,
        attributes: checked(shell, 'attributes', true),
      };

    case 'xmlToJson':
      return {
        indent: indent(text(shell, 'indent', '2')),
        attributes: checked(shell, 'attributes', true),
      };
  }
}

/** Main-thread fallback when workers are blocked; libs stay lazy in each branch. */
export async function fallbackConvert(
  op: ConverterOp,
  text: string,
  options: ConverterOptions,
): Promise<ConvertResult> {
  switch (op) {
    case 'jsonToCsv': {
      const { jsonToCsv } = await import('../../workers/ops/convert/csv');
      return jsonToCsv(text, options as JsonToCsvOptions);
    }
    case 'csvToJson': {
      const { csvToJson } = await import('../../workers/ops/convert/csv');
      return csvToJson(text, options as CsvToJsonOptions);
    }
    case 'jsonToYaml': {
      const { jsonToYaml } = await import('../../workers/ops/convert/yaml');
      return jsonToYaml(text, options as JsonToYamlOptions);
    }
    case 'yamlToJson': {
      const { yamlToJson } = await import('../../workers/ops/convert/yaml');
      return yamlToJson(text, options as YamlToJsonOptions);
    }
    case 'jsonToXml': {
      const { jsonToXml } = await import('../../workers/ops/convert/xml');
      return jsonToXml(text, options as JsonToXmlOptions);
    }
    case 'xmlToJson': {
      const { xmlToJson } = await import('../../workers/ops/convert/xml');
      return xmlToJson(text, options as XmlToJsonOptions);
    }
  }
}
