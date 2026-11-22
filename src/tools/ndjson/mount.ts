import type { EditorHandle } from '../../lib/editor';
import { setupDropzone } from '../../lib/dropzone';
import { setupShortcuts } from '../../lib/tool-shortcuts';
import { setupTabs } from '../../lib/tabs';
import type { WorkerOp } from '../../workers/protocol';
import { readStrings } from '../shared/strings';
import { NdjsonSession, type NdjsonStrings } from './session';

interface Options {
  op: WorkerOp;
  sample: string;
}

export async function mountNdjson(shell: HTMLElement, options: Options): Promise<void> {
  const strings = readStrings<NdjsonStrings>(shell);
  const locale = shell.dataset.locale ?? 'en';
  const inputMount = shell.querySelector<HTMLElement>('[data-editor-mount="input"]');
  const outputMount = shell.querySelector<HTMLElement>('[data-editor-mount="output"]');

  if (!inputMount || (options.op !== 'ndjsonValidate' && !outputMount)) {
    throw new Error('Editor mounts are missing.');
  }

  const { createEditor } = await import('../../lib/editor');
  let session: NdjsonSession | null = null;

  const input: EditorHandle = createEditor({
    parent: inputMount,
    doc: '',
    readOnly: false,
    placeholder: strings.placeholder,
    label: strings.inputLabel,
    onChange: (length) => session?.inputChanged(length),
  });
  const output: EditorHandle | null = outputMount
    ? createEditor({
        parent: outputMount,
        doc: '',
        readOnly: true,
        placeholder: strings.outputPlaceholder,
        label: strings.outputLabel,
      })
    : null;

  shell.querySelector('[data-editor-skeleton="input"]')?.remove();
  shell.querySelector('[data-editor-skeleton="output"]')?.remove();

  const tabs = setupTabs<'input' | 'output'>(shell, {
    onShow: (view) => {
      const editor = view === 'input' ? input : output;
      editor?.refresh();
    },
  });

  session = new NdjsonSession({
    shell,
    op: options.op,
    strings,
    locale,
    input,
    output,
    sample: options.sample,
    showView: tabs.show,
  });
  session.start();

  setupShortcuts(shell, {
    onRun: () => session?.runExplicit(),
    onCopy: () => session?.copyForShortcut() ?? false,
  });
  setupDropzone(shell, (file) => void session?.loadFile(file));

  window.addEventListener(
    'pagehide',
    (event) => {
      if (!event.persisted) session?.dispose();
    },
    { once: true },
  );
}
