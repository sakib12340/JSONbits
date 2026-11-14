import { failure } from '../../workers/protocol';
import type { JsonError } from '../../workers/protocol';
import type { RunFailure } from '../../workers/run-controller';

export interface FailureStrings {
  fileTooBig: string;
  chooseSmaller: string;
  readFailed: string;
  tryAgain: string;
  invalidFile: string;
  encodingHint: string;
  oom: string;
  oomHint: string;
  workerFailed: string;
  workerFailedHint: string;
}

/** One presenter for every run failure, so the sessions never map codes again. */
export function failureText(strings: FailureStrings, run: RunFailure): JsonError {
  switch (run.kind) {
    case 'file-too-big':
      return failure(strings.fileTooBig, strings.chooseSmaller);
    case 'read-failed':
      return failure(strings.readFailed, strings.tryAgain);
    case 'encoding':
      return failure(strings.invalidFile, strings.encodingHint, 'encoding');
    case 'oom':
      return failure(strings.oom, strings.oomHint, 'oom');
    case 'runtime':
      return failure(strings.workerFailed, strings.workerFailedHint, 'runtime');
    default:
      return run.info;
  }
}
