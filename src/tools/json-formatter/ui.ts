import type { EditorHandle } from '../../lib/editor';
import { setupDropzone } from '../../lib/dropzone';
import { FormatterSession } from './session';
import { setupShortcuts } from './shortcuts';
import { readToolStrings } from './strings';
import { setupTabs } from './tabs';
import { ToolView } from './view';

export async function mount(shell: HTMLElement): Promise<void> {
  const strings = readToolStrings(shell);
  const locale = shell.dataset.locale ?? 'en';
  const inputMount = shell.querySelector<HTMLElement>('[data-editor-mount="input"]');
  const outputMount = shell.querySelector<HTMLElement>('[data-editor-mount="output"]');

  if (!inputMount || !outputMount) {
    throw new Error('Editor mounts are missing.');
  }

  let session: FormatterSession | null = null;

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

  const tabs = setupTabs(shell, {
    onShow: (view) => {
      const editor = view === 'input' ? input : output;
      editor.refresh();
    },
  });

  const view = new ToolView(shell, strings, locale, input, output);
  session = new FormatterSession({
    view,
    strings,
    locale,
    input,
    showView: tabs.show,
  });
  session.start();

  setupShortcuts(shell, {
    onRun: () => void session?.run('explicit'),
    onCopy: () => {
      if (!session?.canCopy()) return false;
      void session.copyOutput();
      return true;
    },
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
