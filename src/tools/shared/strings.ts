import type { RepairFixKind } from '../../workers/protocol';

/** Strings serialized into `data-strings` for every editor-backed tool. */
export interface BaseStrings {
  loadingEditor: string;
  loadingEngine: string;
  formatting: string;
  reading: string;
  ready: string;
  waiting: string;
  done: string;
  cancelled: string;
  error: string;
  errorAt: string;
  largeRun: string;
  largeLoaded: string;
  largeWarning: string;
  fileTooBig: string;
  invalidFile: string;
  readFailed: string;
  copied: string;
  copyFailed: string;
  pasteUnavailable: string;
  workerFallback: string;
  workerFailed: string;
  workerFailedHint: string;
  oom: string;
  oomHint: string;
  emptyInput: string;
  emptyInputHint: string;
  chooseSmaller: string;
  tryAgain: string;
  encodingHint: string;
  announceDone: string;
  announceError: string;
  inputLabel: string;
  outputLabel: string;
  placeholder: string;
  outputPlaceholder: string;
  loadFailed: string;
}

export interface OutputToolStrings extends BaseStrings {
  minifying: string;
  repairing: string;
  minifyDone: string;
  repairDone: string;
  minifiedMeta: string;
  noFixes: string;
  fixesApplied: string;
  fix: Record<RepairFixKind, string>;
}

export function readStrings<T>(shell: HTMLElement): T {
  try {
    return JSON.parse(shell.dataset.strings ?? '{}') as T;
  } catch {
    return {} as T;
  }
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
