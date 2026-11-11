import { JsonFormatError } from './ops/errors';
import { csvToJson, jsonToCsv } from './ops/convert/csv';
import { jsonToXml, xmlToJson } from './ops/convert/xml';
import { jsonToYaml, yamlToJson } from './ops/convert/yaml';
import { formatJson } from './ops/format';
import { minifyJson } from './ops/minify';
import { repairJson } from './ops/repair';
import { validateJson } from './ops/validate';
import { diffJson } from './ops/diff';
import { JsonTree } from './ops/tree';
import { failure } from './protocol';
import type {
  ProgressPhase,
  TextPayload,
  WorkerRequest,
  WorkerResponse,
} from './protocol';

/** Beyond this size the worker returns a Blob instead of cloning a huge string. */
const MAX_TEXT_OUTPUT = 4_000_000;

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const scope = self as unknown as WorkerScope;
let tree: JsonTree | null = null;

function post(message: WorkerResponse): void {
  scope.postMessage(message);
}

function progress(id: number, phase: ProgressPhase): void {
  post({ id, type: 'progress', progress: { phase } });
}

/** Let queued progress messages reach the main thread before heavy work starts. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function readText(
  id: number,
  payload: TextPayload,
  phase: ProgressPhase,
): Promise<string | null> {
  progress(id, 'reading');
  await tick();

  if (!('buffer' in payload)) {
    progress(id, phase);
    await tick();
    return payload.text;
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(payload.buffer);
    progress(id, phase);
    await tick();
    return text;
  } catch {
    post({
      id,
      ok: false,
      error: failure(
        'This file is not valid UTF-8 text.',
        'Open the file in a text editor and save it as UTF-8, then try again.',
        'encoding',
      ),
    });
    return null;
  }
}

function withOutput<T extends { output: string | null; stats: unknown }>(
  id: number,
  result: T,
  mime = 'application/json',
): void {
  if (result.output === null) {
    post({ id, ok: true, result });
    return;
  }

  if (result.output.length > MAX_TEXT_OUTPUT) {
    const blob = new Blob([result.output], { type: mime });
    post({
      id,
      ok: true,
      result: { output: null, blob, stats: result.stats },
    });
    return;
  }

  post({
    id,
    ok: true,
    result: { output: result.output, blob: null, stats: result.stats },
  });
}

async function handle(request: WorkerRequest): Promise<void> {
  const { id, op } = request;

  try {
    switch (op) {
      case 'format': {
        const text = await readText(id, request.payload, 'formatting');
        if (text === null) return;
        const result = formatJson(text, request.options);
        withOutput(id, result);
        return;
      }

      case 'minify': {
        const text = await readText(id, request.payload, 'minifying');
        if (text === null) return;
        const result = minifyJson(text);
        withOutput(id, result);
        return;
      }

      case 'validate': {
        const text = await readText(id, request.payload, 'validating');
        if (text === null) return;
        const result = validateJson(text);
        post({ id, ok: true, result });
        return;
      }

      case 'repair': {
        const text = await readText(id, request.payload, 'repairing');
        if (text === null) return;
        const result = repairJson(text, request.options);
        withOutput(id, result);
        return;
      }

      case 'tree': {
        const text = await readText(id, request.payload, 'indexing');
        if (text === null) return;
        tree = new JsonTree();
        const result = tree.load(text);
        post({ id, ok: true, result });
        return;
      }

      case 'treeChildren': {
        if (!tree) {
          post({
            id,
            ok: false,
            error: failure('No tree is loaded.', 'Load JSON again, then expand the tree.'),
          });
          return;
        }
        post({ id, ok: true, result: tree.children(request.payload.path, request.options.start, request.options.limit) });
        return;
      }

      case 'treeSearch': {
        if (!tree) {
          post({
            id,
            ok: false,
            error: failure('No tree is loaded.', 'Load JSON again, then search the tree.'),
          });
          return;
        }
        progress(id, 'searching');
        await tick();
        post({ id, ok: true, result: tree.search(request.payload.query, request.options.limit) });
        return;
      }

      case 'treeValue': {
        if (!tree) {
          post({
            id,
            ok: false,
            error: failure('No tree is loaded.', 'Load JSON again, then copy the value.'),
          });
          return;
        }
        post({
          id,
          ok: true,
          result: tree.value(request.payload.path, request.options.limit),
        });
        return;
      }

      case 'diff': {
        progress(id, 'comparing');
        await tick();
        const result = diffJson(request.payload.left, request.payload.right, request.options);
        post({ id, ok: true, result });
        return;
      }

      case 'jsonToCsv': {
        const text = await readText(id, request.payload, 'converting');
        if (text === null) return;
        withOutput(id, jsonToCsv(text, request.options), 'text/csv');
        return;
      }

      case 'csvToJson': {
        const text = await readText(id, request.payload, 'converting');
        if (text === null) return;
        withOutput(id, await csvToJson(text, request.options));
        return;
      }

      case 'jsonToYaml': {
        const text = await readText(id, request.payload, 'converting');
        if (text === null) return;
        withOutput(id, await jsonToYaml(text, request.options), 'application/yaml');
        return;
      }

      case 'yamlToJson': {
        const text = await readText(id, request.payload, 'converting');
        if (text === null) return;
        withOutput(id, await yamlToJson(text, request.options));
        return;
      }

      case 'jsonToXml': {
        const text = await readText(id, request.payload, 'converting');
        if (text === null) return;
        withOutput(id, await jsonToXml(text, request.options), 'application/xml');
        return;
      }

      case 'xmlToJson': {
        const text = await readText(id, request.payload, 'converting');
        if (text === null) return;
        withOutput(id, await xmlToJson(text, request.options));
        return;
      }
    }
  } catch (error) {
    if (error instanceof JsonFormatError) {
      post({ id, ok: false, error: error.toJsonError() });
      return;
    }

    if (error instanceof RangeError) {
      post({
        id,
        ok: false,
        error: failure(
          'This input is too large for available memory.',
          'Try a smaller file or close other tabs, then run it again.',
          'oom',
        ),
      });
      return;
    }

    const labels: Partial<Record<WorkerRequest['op'], string>> = {
      format: 'formatter',
      minify: 'minifier',
      validate: 'validator',
      repair: 'repair tool',
      tree: 'tree viewer',
      treeChildren: 'tree viewer',
      treeSearch: 'tree search',
      treeValue: 'tree viewer',
      diff: 'comparison',
      jsonToCsv: 'CSV converter',
      csvToJson: 'CSV converter',
      jsonToYaml: 'YAML converter',
      yamlToJson: 'YAML converter',
      jsonToXml: 'XML converter',
      xmlToJson: 'XML converter',
    };

    post({
      id,
      ok: false,
      error: failure(
        `The ${labels[op] ?? 'tool'} stopped unexpectedly.`,
        'Reload the page and try again. Your data was never uploaded.',
      ),
    });
  }
}

scope.onmessage = (event) => {
  void handle(event.data);
};
