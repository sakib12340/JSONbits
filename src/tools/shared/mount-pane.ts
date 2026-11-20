import type { EditorHandle } from '../../lib/editor';
import { setupDropzone } from '../../lib/dropzone';
import { setupTabs } from '../../lib/tabs';
import { setupShortcuts } from '../../lib/tool-shortcuts';
import type { PaneOp } from './pane-config';
import { PaneSession, type PaneStrings } from './pane-session';
import { readStrings } from './strings';

interface Options {
  op: PaneOp;
  sample: string;
  sampleExpression?: string;
  canRepair?: boolean;
}

export async function mountPane(shell: HTMLElement, options: Options): Promise<void> {
  const strings = readStrings<PaneStrings>(shell);
  const locale = shell.dataset.locale ?? 'en';
  const inputMount = shell.querySelector<HTMLElement>('[data-editor-mount="input"]');
  const outputMount = shell.querySelector<HTMLElement>('[data-editor-mount="output"]');

  if (!inputMount || !outputMount) {
    throw new Error('Editor mounts are missing.');
  }

  let session: PaneSession | null = null;

  const { createEditor } = await import('../../lib/editor');

  const input: EditorHandle = createEditor({
    parent: inputMount,
    doc: '',
    readOnly: false,
    placeholder: strings.placeholder,
    label: strings.inputLabel,
    onChange: (length) => session?.inputChanged(length),
  });

  const output: EditorHandle = createEditor({
    parent: outputMount,
    doc: '',
    readOnly: true,
    placeholder: strings.outputPlaceholder,
    label: strings.outputLabel,
  });

  shell.querySelector('[data-editor-skeleton="input"]')?.remove();
  shell.querySelector('[data-editor-skeleton="output"]')?.remove();

  const tabs = setupTabs<'input' | 'output'>(shell, {
    onShow: (view) => {
      const editor = view === 'input' ? input : output;
      editor.refresh();
    },
  });

  session = new PaneSession({
    shell,
    op: options.op,
    strings,
    locale,
    input,
    output,
    sample: options.sample,
    sampleExpression: options.sampleExpression,
    canRepair: options.canRepair ?? options.op !== 'escape',
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
