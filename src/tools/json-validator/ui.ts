import type { EditorHandle } from '../../lib/editor';
import { setupDropzone } from '../../lib/dropzone';
import { setupShortcuts } from '../../lib/tool-shortcuts';
import { readStrings } from '../shared/strings';
import { ValidatorSession } from './session';
import type { ValidatorStrings } from './strings';

export async function mount(shell: HTMLElement): Promise<void> {
  const strings = readStrings<ValidatorStrings>(shell);
  const locale = shell.dataset.locale ?? 'en';
  const inputMount = shell.querySelector<HTMLElement>('[data-editor-mount="input"]');

  if (!inputMount) {
    throw new Error('Editor mount is missing.');
  }

  let session: ValidatorSession | null = null;

  const { createEditor } = await import('../../lib/editor');

  const input: EditorHandle = createEditor({
    parent: inputMount,
    doc: '',
    readOnly: false,
    placeholder: strings.placeholder,
    label: strings.inputLabel,
    onChange: (length) => session?.inputChanged(length),
  });

  shell.querySelector('[data-editor-skeleton="input"]')?.remove();

  session = new ValidatorSession({ shell, strings, locale, input });
  session.start();

  setupShortcuts(shell, {
    onRun: () => session?.runExplicit(),
    onCopy: () => false,
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
