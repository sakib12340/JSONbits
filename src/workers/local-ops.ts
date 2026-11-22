/**
 * Main-thread implementations for every stateless op, used only when the
 * worker cannot start or crashes. Libraries stay lazy inside each branch.
 * Stateful tree ops keep their document in the shared context.
 */
import type { OpMap, WorkerOp } from './protocol';
import { decodePayload } from './text';
import { JsonTree } from './ops/tree';

export interface LocalContext {
  tree: JsonTree | null;
}

type Local<K extends WorkerOp> = (
  payload: OpMap[K]['payload'],
  options: OpMap[K]['options'],
  context: LocalContext,
) => OpMap[K]['result'] | Promise<OpMap[K]['result']>;

/** Ops the fallback can run; each branch imports its own module lazily. */
const localOps: { [K in WorkerOp]: Local<K> } = {
  async format(payload, options) {
    const { formatJson } = await import('./ops/format');
    const formatted = formatJson(text(payload), options);
    return { output: formatted.output, blob: null, stats: formatted.stats };
  },

  async minify(payload) {
    const { minifyJson } = await import('./ops/minify');
    return minifyJson(text(payload));
  },

  async repair(payload, options) {
    const { repairJson } = await import('./ops/repair');
    return repairJson(text(payload), options);
  },

  async validate(payload) {
    const { validateJson } = await import('./ops/validate');
    return validateJson(text(payload));
  },

  tree(payload, _options, context) {
    const tree = new JsonTree();
    const result = tree.load(text(payload));
    context.tree = tree;
    return result;
  },

  treeChildren(payload, options, context) {
    const tree = requireTree(context);
    return tree.children(payload.path, options.start, options.limit);
  },

  treeSearch(payload, options, context) {
    return requireTree(context).search(payload.query, options.limit);
  },

  treeValue(payload, options, context) {
    return requireTree(context).value(payload.path, options.limit);
  },

  async diff(payload, options) {
    const { diffJson } = await import('./ops/diff');
    return diffJson(payload.left, payload.right, options);
  },

  async sort(payload, options) {
    const { sortJson } = await import('./ops/sort');
    return sortJson(text(payload), options);
  },

  async escape(payload, options) {
    const { transformEscapes } = await import('./ops/escape');
    return transformEscapes(text(payload), options);
  },

  async jsonpath(payload, options) {
    const { queryJsonPath } = await import('./ops/jsonpath');
    return queryJsonPath(text(payload), options);
  },

  async jsonToTypescript(payload, options) {
    const { jsonToTypescript } = await import('./ops/typescript');
    return jsonToTypescript(text(payload), options);
  },

  async jwtDecode(payload) {
    const { decodeJwt } = await import('./ops/jwt');
    return decodeJwt(text(payload));
  },

  async validateSchema(payload) {
    const { validateSchema } = await import('./ops/schema');
    return validateSchema(payload);
  },

  async jsonToCsv(payload, options) {
    const { jsonToCsv } = await import('./ops/convert/csv');
    return jsonToCsv(text(payload), options);
  },

  async csvToJson(payload, options) {
    const { csvToJson } = await import('./ops/convert/csv');
    return csvToJson(text(payload), options);
  },

  async jsonToYaml(payload, options) {
    const { jsonToYaml } = await import('./ops/convert/yaml');
    return jsonToYaml(text(payload), options);
  },

  async yamlToJson(payload, options) {
    const { yamlToJson } = await import('./ops/convert/yaml');
    return yamlToJson(text(payload), options);
  },

  async jsonToXml(payload, options) {
    const { jsonToXml } = await import('./ops/convert/xml');
    return jsonToXml(text(payload), options);
  },

  async xmlToJson(payload, options) {
    const { xmlToJson } = await import('./ops/convert/xml');
    return xmlToJson(text(payload), options);
  },
};

function text(payload: unknown): string {
  return decodePayload(payload as Parameters<typeof decodePayload>[0]);
}

function requireTree(context: LocalContext): JsonTree {
  if (!context.tree) throw new Error('No tree is loaded.');
  return context.tree;
}

/** Run an op on the main thread. Throws parser errors as-is. */
export function runLocal<K extends WorkerOp>(
  op: K,
  payload: OpMap[K]['payload'],
  options: OpMap[K]['options'],
  context: LocalContext,
): Promise<OpMap[K]['result']> {
  const implementation = localOps[op] as Local<K>;
  return Promise.resolve(implementation(payload, options, context));
}
