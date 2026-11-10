interface Options {
  onRun: () => void;
  onCopy: () => boolean;
}

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

export function setupShortcuts(shell: HTMLElement, options: Options): void {
  const doc = shell.ownerDocument;
  const dialog = doc.querySelector<HTMLDialogElement>('[data-shortcuts-dialog]');
  const help = shell.querySelector<HTMLButtonElement>('[data-action="help"]');
  const close = dialog?.querySelector<HTMLButtonElement>('[data-shortcuts-close]') ?? null;

  const open = (): void => {
    if (!dialog || dialog.open) return;
    dialog.showModal();
  };

  const closeDialog = (): void => {
    if (dialog?.open) dialog.close();
  };

  help?.addEventListener('click', open);
  close?.addEventListener('click', closeDialog);

  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });

  document.addEventListener('keydown', (event) => {
    if (dialog?.open) return;

    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && event.key === 'Enter') {
      event.preventDefault();
      options.onRun();
      return;
    }

    if (modifier && event.shiftKey && (event.key === 'c' || event.key === 'C')) {
      if (options.onCopy()) event.preventDefault();
      return;
    }

    if (!modifier && !isEditable(event.target) && event.key === '?') {
      event.preventDefault();
      open();
    }
  });
}
