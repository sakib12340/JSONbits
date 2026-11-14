import { describe, expect, it, vi } from 'vitest';
import { RunController, type OpClient } from './run-controller';
import { WorkerResponseError, WorkerUnavailableError } from './client';
import { failure } from './protocol';
import type { OpMap, ProgressUpdate, WorkerOp } from './protocol';
import { FALLBACK_LIMIT, MAX_FILE } from '../tools/limits';

type Handler = <K extends WorkerOp>(
  op: K,
  payload: OpMap[K]['payload'],
  options: OpMap[K]['options'],
) => Promise<OpMap[K]['result']>;

class FakeClient implements OpClient {
  cancelled = 0;
  progress?: (p: ProgressUpdate) => void;

  constructor(private readonly handler: Handler) {}

  run<K extends WorkerOp>(
    op: K,
    payload: OpMap[K]['payload'],
    options: OpMap[K]['options'],
    onProgress?: (progress: ProgressUpdate) => void,
  ): Promise<OpMap[K]['result']> {
    this.progress = onProgress;
    return this.handler(op, payload, options);
  }

  cancelAll(): void {
    this.cancelled += 1;
  }
}

const unavailable: Handler = async () => {
  throw new WorkerUnavailableError();
};

describe('RunController', () => {
  it('falls back locally and preserves exact number text', async () => {
    const controller = new RunController(new FakeClient(unavailable));

    const outcome = await controller.run(
      'format',
      { text: '{"big":9007199254740993,"dec":1.23456789012345678}' },
      { indent: 2 },
    );

    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;
    expect(outcome.usedFallback).toBe(true);
    expect(outcome.result.output).toContain('9007199254740993');
    expect(outcome.result.output).toContain('1.23456789012345678');
  });

  it('refuses the local fallback above the size cap', async () => {
    const controller = new RunController(new FakeClient(unavailable));
    const text = `{"a":"${'x'.repeat(FALLBACK_LIMIT)}"}`;

    const outcome = await controller.run('format', { text }, { indent: 2 });

    expect(outcome.status).toBe('failed');
    if (outcome.status === 'failed') expect(outcome.failure.kind).toBe('runtime');
  });

  it('reports a parser error as a typed response failure', async () => {
    const client = new FakeClient(async () => {
      throw new WorkerResponseError(failure('Unexpected token }', 'Remove the brace.', 'syntax'));
    });
    const controller = new RunController(client);

    const outcome = await controller.run('validate', { text: '{"a":1,}' }, {});

    expect(outcome.status).toBe('failed');
    if (outcome.status === 'failed') {
      expect(outcome.failure.kind).toBe('response');
      expect(outcome.failure.info.message).toBe('Unexpected token }');
    }
  });

  it('maps out-of-memory and encoding codes', async () => {
    const oom = new RunController(
      new FakeClient(async () => {
        throw new WorkerResponseError(failure('', '', 'oom'));
      }),
    );
    const encoding = new RunController(
      new FakeClient(async () => {
        throw new WorkerResponseError(failure('', '', 'encoding'));
      }),
    );

    expect(await oom.run('validate', { text: '{}' }, {})).toMatchObject({
      failure: { kind: 'oom' },
    });
    expect(await encoding.run('validate', { text: '{}' }, {})).toMatchObject({
      failure: { kind: 'encoding' },
    });
  });

  it('drops a result that a newer run has superseded', async () => {
    const resolvers: Array<() => void> = [];
    const client = new FakeClient(
      <K extends WorkerOp>(): Promise<OpMap[K]['result']> =>
        new Promise((resolve) => {
          resolvers.push(() =>
            resolve({ output: 'x', blob: null, stats: {} as never } as OpMap[K]['result']),
          );
        }),
    );
    const controller = new RunController(client);

    const first = controller.run('format', { text: '{}' }, { indent: 2 });
    controller.cancel();
    const second = controller.run('format', { text: '{}' }, { indent: 2 });
    for (const resolve of resolvers) resolve();

    const [a, b] = await Promise.all([first, second]);
    expect(a.status).toBe('stale');
    expect(b.status).toBe('ok');
  });

  it('lets concurrent ops share a token until a cancel arrives', async () => {
    const client = new FakeClient(
      <K extends WorkerOp>(): Promise<OpMap[K]['result']> =>
        Promise.resolve({ stats: {} as never } as OpMap[K]['result']),
    );
    const controller = new RunController(client);

    const [a, b] = await Promise.all([
      controller.run('validate', { text: '{}' }, {}),
      controller.run('validate', { text: '[]' }, {}),
    ]);

    expect(a.status).toBe('ok');
    expect(b.status).toBe('ok');
  });

  it('keeps serving tree children from the local tree once it exists', async () => {
    const controller = new RunController(new FakeClient(unavailable));

    const loaded = await controller.run('tree', { text: '{"a":1,"b":[true,false]}' }, {});
    expect(loaded.status).toBe('ok');
    expect(loaded.status === 'ok' && loaded.usedFallback).toBe(true);

    const children = await controller.run('treeChildren', { path: [] }, { start: 0, limit: 100 });
    expect(children.status).toBe('ok');
    if (children.status === 'ok') expect(children.result.total).toBe(2);
  });

  it('stops forwarding progress once a run is cancelled', async () => {
    const client = new FakeClient(() => new Promise(() => {}));
    const controller = new RunController(client);
    const seen = vi.fn();

    void controller.run('format', { text: '{}' }, { indent: 2 }, { onProgress: seen });
    client.progress?.({ phase: 'formatting' });
    expect(seen).toHaveBeenCalledTimes(1);

    controller.cancel();
    client.progress?.({ phase: 'formatting' });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('keeps only the latest scheduled task', async () => {
    vi.useFakeTimers();
    const controller = new RunController(new FakeClient(unavailable));
    const first = vi.fn();
    const second = vi.fn();

    controller.schedule(first, 250);
    controller.schedule(second, 250);
    vi.advanceTimersByTime(249);
    expect(second).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    controller.dispose();
    vi.useRealTimers();
  });

  it('reads a dropped file as a buffer and still formats', async () => {
    const controller = new RunController(new FakeClient(unavailable));
    const file = new File(['{"rows":[{"id":9007199254740993}]}'], 'big.json', {
      type: 'application/json',
    });

    const outcome = await controller.runFile('format', file, { indent: 2 });

    expect(outcome.status).toBe('ok');
    if (outcome.status === 'ok') expect(outcome.result.output).toContain('9007199254740993');
  });

  it('rejects a file above the hard limit without reading it', async () => {
    const controller = new RunController(new FakeClient(unavailable));
    const file = { size: MAX_FILE + 1, arrayBuffer: () => Promise.reject(new Error('read')) } as File;

    expect(await controller.runFile('format', file, { indent: 2 })).toMatchObject({
      failure: { kind: 'file-too-big' },
    });
  });

  it('reports a read failure as its own kind', async () => {
    const controller = new RunController(new FakeClient(unavailable));
    const file = { size: 10, arrayBuffer: () => Promise.reject(new Error('gone')) } as File;

    expect(await controller.runFile('format', file, { indent: 2 })).toMatchObject({
      failure: { kind: 'read-failed' },
    });
  });

  it('honours allowLocal for stateful callers', async () => {
    const controller = new RunController(new FakeClient(unavailable));

    expect(await controller.run('tree', { text: '{}' }, {}, { allowLocal: false })).toMatchObject({
      failure: { kind: 'runtime' },
    });
  });
});
