import type { EditorHandle } from '../../lib/editor';
import { setupDropzone } from '../../lib/dropzone';
import { setupShortcuts } from '../../lib/tool-shortcuts';
import { setupTabs } from '../../lib/tabs';
import { readStrings } from '../shared/strings';
import { SAMPLE_JWT } from './sample';
import { JwtSession, type JwtStrings } from './session';

export async function mount(shell: HTMLElement): Promise<void> {
  const strings = readStrings<JwtStrings>(shell);
  const locale = shell.dataset.locale ?? 'en';
  const inputMount = shell.querySelector<HTMLElement>('[data-editor-mount="input"]');
  const outputMount = shell.querySelector<HTMLElement>('[data-editor-mount="output"]');

  if (!inputMount || !outputMount) throw new Error('Editor mounts are missing.');

  const { createEditor } = await import('../../lib/editor');
  let session: JwtSession | null = null;

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
    onShow: (view) => (view === 'input' ? input : output).refresh(),
  });

  session = new JwtSession({
    shell,
    strings,
    locale,
    input,
    output,
    sample: SAMPLE_JWT,
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
