import type { FormatIndent, JsonError } from '../../workers/protocol';
import type { RunController } from '../../workers/run-controller';

export type RepairAttempt =
  | { status: 'ok'; text: string; fixes: number; timeMs: number }
  | { status: 'failed'; info: JsonError }
  | { status: 'skipped' };

/**
 * Repairs already-loaded input text on the worker. The caller decides where the
 * repaired text goes; nothing is written to the DOM here.
 */
export async function repairText(
  runs: RunController,
  text: string,
  indent: FormatIndent,
): Promise<RepairAttempt> {
  if (text.trim().length === 0) return { status: 'skipped' };

  const outcome = await runs.run('repair', { text }, { indent }, {});
  if (outcome.status === 'stale') return { status: 'skipped' };
  if (outcome.status === 'failed') return { status: 'failed', info: outcome.failure.info };

  const fixes = outcome.result.stats.fixes.length;
  return {
    status: 'ok',
    text: outcome.result.output ?? text,
    fixes,
    timeMs: outcome.result.stats.parseTimeMs,
  };
}
