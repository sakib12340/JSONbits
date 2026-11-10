import type { Locale } from './config';
import { t } from './t';

/** Strings every editor-backed tool needs on the client. */
export function commonToolStrings(locale: Locale): Record<string, string> {
  return {
    loadingEditor: t(locale, 'tool.loadingEditor'),
    loadingEngine: t(locale, 'tool.loadingEngine'),
    formatting: t(locale, 'tool.formatting'),
    reading: t(locale, 'tool.reading'),
    ready: t(locale, 'tool.ready'),
    waiting: t(locale, 'tool.waiting'),
    done: t(locale, 'tool.done'),
    cancelled: t(locale, 'tool.cancelled'),
    error: t(locale, 'tool.error'),
    errorAt: t(locale, 'tool.errorAt'),
    largeRun: t(locale, 'tool.largeRun'),
    largeLoaded: t(locale, 'tool.largeLoaded'),
    largeWarning: t(locale, 'tool.largeWarning'),
    fileTooBig: t(locale, 'tool.fileTooBig'),
    invalidFile: t(locale, 'tool.invalidFile'),
    readFailed: t(locale, 'tool.readFailed'),
    copied: t(locale, 'tool.copied'),
    copyFailed: t(locale, 'tool.copyFailed'),
    pasteUnavailable: t(locale, 'tool.pasteUnavailable'),
    workerFallback: t(locale, 'tool.workerFallback'),
    workerFailed: t(locale, 'tool.workerFailed'),
    workerFailedHint: t(locale, 'tool.workerFailedHint'),
    oom: t(locale, 'tool.oom'),
    oomHint: t(locale, 'tool.oomHint'),
    emptyInput: t(locale, 'tool.emptyInput'),
    emptyInputHint: t(locale, 'tool.emptyInputHint'),
    chooseSmaller: t(locale, 'tool.chooseSmaller'),
    tryAgain: t(locale, 'tool.tryAgain'),
    encodingHint: t(locale, 'tool.encodingHint'),
    announceDone: t(locale, 'tool.announceDone'),
    announceError: t(locale, 'tool.announceError'),
    inputLabel: t(locale, 'tool.inputLabel'),
    outputLabel: t(locale, 'tool.outputLabel'),
    placeholder: t(locale, 'tool.placeholder'),
    outputPlaceholder: t(locale, 'tool.outputPlaceholder'),
    loadFailed: t(locale, 'tool.loadFailed'),
  };
}
