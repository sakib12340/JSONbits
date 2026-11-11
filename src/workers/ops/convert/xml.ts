import type {
  ConvertResult,
  JsonToXmlOptions,
  XmlToJsonOptions,
} from '../../protocol';
import { JsonFormatError } from '../errors';
import { finishStats, indentUnit, isPlainObject, readJsonValue } from './common';

const XML_NAME = /^[A-Za-z_][A-Za-z0-9._-]*$/;

function invalid(message: string, hint: string, line = 1, column = 1): JsonFormatError {
  return new JsonFormatError(message, hint, 0, line, column);
}

function nameHint(name: string): string {
  if (name.startsWith('@')) {
    return 'Turn on "Read @ keys as attributes", or rename this key before converting.';
  }

  return 'Use letters, digits, hyphens, underscores, or dots, and do not start with a digit.';
}

function assertName(name: string, path: string): void {
  if (XML_NAME.test(name)) return;

  throw invalid(
    `"${name}" at ${path} is not a valid XML element name.`,
    nameHint(name),
  );
}

function attributeValue(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function prepare(value: unknown, path: string, attributes: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((entry, index) => prepare(entry, `${path}[${index}]`, attributes));
  }

  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(value)) {
    if (key === '#text') {
      if (typeof child === 'object' && child !== null) {
        throw invalid(
          `The #text value at ${path} must be text, not an object or array.`,
          'Replace it with a string, number, or boolean.',
        );
      }

      out['#text'] = child;
      continue;
    }

    if (attributes && key.startsWith('@')) {
      const name = key.slice(1);
      assertName(name, `${path}.${key}`);
      out[`@_${name}`] = attributeValue(child);
      continue;
    }

    assertName(key, `${path}.${key}`);
    out[key] = prepare(child, `${path}.${key}`, attributes);
  }

  return out;
}

function xmlHint(message: string): string {
  const text = message.toLowerCase();

  if (text.includes('tag name')) {
    return 'XML element names cannot start with a number or contain spaces.';
  }

  if (text.includes('closing tag') || text.includes('unclosed') || text.includes('close tag')) {
    return 'Check that every opening tag has a matching closing tag.';
  }

  if (text.includes('attribute')) {
    return 'Attributes need a name and a value, for example id="7".';
  }

  if (text.includes('entity')) {
    return 'Replace this entity with plain text or a standard entity such as &amp;.';
  }

  return 'Check the tags, quotes, and nesting near this position.';
}

export async function jsonToXml(
  text: string,
  options: JsonToXmlOptions,
): Promise<ConvertResult> {
  const { XMLBuilder } = await import('fast-xml-parser');
  const started = performance.now();
  const root = options.rootName.trim() || 'root';

  if (!XML_NAME.test(root)) {
    throw invalid(
      `"${root}" is not a valid XML root name.`,
      'Use letters, digits, hyphens, underscores, or dots, and do not start with a digit.',
    );
  }

  const value = prepare(readJsonValue(text), '$', options.attributes);
  const wrapped = Array.isArray(value)
    ? { [root]: { item: value } }
    : { [root]: value };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    indentBy: indentUnit(options.indent),
    suppressEmptyNode: true,
    processEntities: true,
  });

  let output: string;

  try {
    output = builder.build(wrapped) as string;
  } catch (error) {
    throw invalid(
      error instanceof Error ? error.message : 'This JSON could not be converted to XML.',
      'Check the key names and values, then try again.',
    );
  }

  const stats = finishStats(text, output, started);
  return { output, blob: null, stats };
}

export async function xmlToJson(
  text: string,
  options: XmlToJsonOptions,
): Promise<ConvertResult> {
  const { XMLParser, XMLValidator } = await import('fast-xml-parser');
  const started = performance.now();
  const validation = XMLValidator.validate(text);

  if (validation !== true) {
    const detail = validation.err;
    throw invalid(
      detail.msg,
      xmlHint(detail.msg),
      detail.line,
      detail.col,
    );
  }

  const parser = new XMLParser({
    ignoreAttributes: !options.attributes,
    attributeNamePrefix: '@',
    textNodeName: '#text',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    allowBooleanAttributes: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    processEntities: true,
  });

  let value: unknown;

  try {
    value = parser.parse(text);
  } catch (error) {
    throw invalid(
      error instanceof Error ? error.message : 'This XML could not be converted.',
      'Check the structure and try again.',
    );
  }

  const output =
    JSON.stringify(value ?? null, null, indentUnit(options.indent)) || 'null';
  const stats = finishStats(text, output, started);

  return { output, blob: null, stats };
}
