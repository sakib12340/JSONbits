import type { EditorHandle } from '../../lib/editor';
import { setupDropzone } from '../../lib/dropzone';
import { setupTabs } from '../../lib/tabs';
import { setupShortcuts } from '../../lib/tool-shortcuts';
import { readStrings } from '../shared/strings';
import { ViewerSession } from './session';
import { TreeStore } from './store';
import type { ViewerStrings } from './strings';
import { TreeView } from './view';

export async function mount(shell: HTMLElement): Promise<void> {
  const strings = readStrings<ViewerStrings>(shell);
  const locale = shell.dataset.locale ?? 'en';
  const inputMount = shell.querySelector<HTMLElement>('[data-editor-mount="input"]');

  if (!inputMount) {
    throw new Error('Editor mount is missing.');
  }

  let session: ViewerSession | null = null;

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

  const store = new TreeStore();
  const view = new TreeView({
    shell,
    store,
    strings,
    onStatus: (text) => session?.showStatus(text),
    onAnnounce: (text) => session?.announceStatus(text),
  });

  const tabs = setupTabs<'input' | 'tree'>(shell, {
    onShow: (next) => {
      if (next === 'input') input.refresh();
      else view.refresh();
    },
  });

  session = new ViewerSession({
    shell,
    strings,
    locale,
    input,
    store,
    view,
    showView: tabs.show,
  });
  session.start();

  setupShortcuts(shell, {
    onRun: () => session?.runExplicit(),
    onCopy: () => view.copySelected(),
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
