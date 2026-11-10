import type { EditorHandle } from '../../lib/editor';
import { setupDropzone } from '../../lib/dropzone';
import { setupTabs } from '../../lib/tabs';
import { setupShortcuts } from '../../lib/tool-shortcuts';
import { OutputToolSession, type OutputToolKind } from './output-tool';
import { readStrings, type OutputToolStrings } from './strings';

interface Options {
  kind: OutputToolKind;
  sample: string;
}

export async function mountOutputTool(shell: HTMLElement, options: Options): Promise<void> {
  const strings = readStrings<OutputToolStrings>(shell);
  const locale = shell.dataset.locale ?? 'en';
  const inputMount = shell.querySelector<HTMLElement>('[data-editor-mount="input"]');
  const outputMount = shell.querySelector<HTMLElement>('[data-editor-mount="output"]');

  if (!inputMount || !outputMount) {
    throw new Error('Editor mounts are missing.');
  }

  let session: OutputToolSession | null = null;

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

  session = new OutputToolSession({
    shell,
    kind: options.kind,
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
