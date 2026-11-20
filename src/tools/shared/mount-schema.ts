import type { EditorHandle } from '../../lib/editor';
import { setupTabs } from '../../lib/tabs';
import { setupShortcuts } from '../../lib/tool-shortcuts';
import { SchemaSession, type SchemaStrings } from './schema-session';
import { readStrings } from './strings';

export async function mountSchema(shell: HTMLElement): Promise<void> {
  const strings = readStrings<SchemaStrings>(shell);
  const locale = shell.dataset.locale ?? 'en';
  const schemaMount = shell.querySelector<HTMLElement>('[data-editor-mount="left"]');
  const documentMount = shell.querySelector<HTMLElement>('[data-editor-mount="right"]');

  if (!schemaMount || !documentMount) {
    throw new Error('Editor mounts are missing.');
  }

  let session: SchemaSession | null = null;

  const { createEditor } = await import('../../lib/editor');

  const schema: EditorHandle = createEditor({
    parent: schemaMount,
    doc: '',
    readOnly: false,
    placeholder: strings.schemaPlaceholder,
    label: strings.schemaLabel,
    onChange: () => session?.inputChanged('schema'),
  });

  const documentEditor: EditorHandle = createEditor({
    parent: documentMount,
    doc: '',
    readOnly: false,
    placeholder: strings.documentPlaceholder,
    label: strings.documentLabel,
    onChange: () => session?.inputChanged('document'),
  });

  shell.querySelector('[data-editor-skeleton="left"]')?.remove();
  shell.querySelector('[data-editor-skeleton="right"]')?.remove();

  const tabs = setupTabs<'left' | 'right'>(shell, {
    onShow: (view) => {
      const editor = view === 'left' ? schema : documentEditor;
      editor.refresh();
    },
  });

  session = new SchemaSession({
    shell,
    strings,
    locale,
    schema,
    document: documentEditor,
    showView: tabs.show,
  });
  session.start();

  setupShortcuts(shell, {
    onRun: () => session?.runExplicit(),
    onCopy: () => session?.copyForShortcut() ?? false,
  });

  window.addEventListener(
    'pagehide',
    (event) => {
      if (!event.persisted) session?.dispose();
    },
    { once: true },
  );
}
