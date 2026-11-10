import type { EditorHandle } from '../../lib/editor';
import { attachDropzone, guardDocumentDrops } from '../../lib/dropzone';
import { setupTabs } from '../../lib/tabs';
import { setupShortcuts } from '../../lib/tool-shortcuts';
import { readStrings } from '../shared/strings';
import { DiffList } from './list';
import { DiffSession } from './session';
import type { DiffStrings } from './strings';

type Side = 'left' | 'right';

export async function mount(shell: HTMLElement): Promise<void> {
  const strings = readStrings<DiffStrings>(shell);
  const locale = shell.dataset.locale ?? 'en';
  const leftMount = shell.querySelector<HTMLElement>('[data-editor-mount="left"]');
  const rightMount = shell.querySelector<HTMLElement>('[data-editor-mount="right"]');

  if (!leftMount || !rightMount) {
    throw new Error('Editor mounts are missing.');
  }

  let session: DiffSession | null = null;

  const { createEditor } = await import('../../lib/editor');

  const left: EditorHandle = createEditor({
    parent: leftMount,
    doc: '',
    readOnly: false,
    placeholder: strings.leftPlaceholder,
    label: strings.leftLabel,
    onChange: () => session?.inputChanged(),
  });

  const right: EditorHandle = createEditor({
    parent: rightMount,
    doc: '',
    readOnly: false,
    placeholder: strings.rightPlaceholder,
    label: strings.rightLabel,
    onChange: () => session?.inputChanged(),
  });

  shell.querySelector('[data-editor-skeleton="left"]')?.remove();
  shell.querySelector('[data-editor-skeleton="right"]')?.remove();

  const list = new DiffList({
    shell,
    strings,
    onAnnounce: (text) => session?.announceStatus(text),
  });

  const tabs = setupTabs<Side | 'changes'>(shell, {
    onShow: (next) => {
      if (next === 'left') left.refresh();
      else if (next === 'right') right.refresh();
    },
  });

  session = new DiffSession({
    shell,
    strings,
    locale,
    left,
    right,
    list,
    showView: tabs.show,
  });
  session.start();

  setupShortcuts(shell, {
    onRun: () => session?.runExplicit(),
    onCopy: () => list.copySelectedPath(),
  });

  for (const side of ['left', 'right'] as const) {
    const wrap = shell.querySelector<HTMLElement>(`[data-editor-wrap="${side}"]`);
    if (!wrap) continue;

    attachDropzone(wrap, (file) => void session?.loadFile(side, file));
    wrap.addEventListener('focusin', () => session?.setActiveSide(side));
  }

  guardDocumentDrops();

  window.addEventListener(
    'pagehide',
    (event) => {
      if (!event.persisted) session?.dispose();
    },
    { once: true },
  );
}
