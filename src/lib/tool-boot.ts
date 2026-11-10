interface ToolModule {
  mount(shell: HTMLElement): Promise<void> | void;
}

const loaders: Record<string, () => Promise<ToolModule>> = {
  'json-formatter': () => import('../tools/json-formatter/ui'),
  'json-validator': () => import('../tools/json-validator/ui'),
  'json-minifier': () => import('../tools/json-minifier/ui'),
  'json-viewer': () => import('../tools/json-viewer/ui'),
  'json-diff': () => import('../tools/json-diff/ui'),
  'json-repair': () => import('../tools/json-repair/ui'),
};

function readStrings(shell: HTMLElement): Record<string, string> {
  try {
    return JSON.parse(shell.dataset.strings ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

const shell = document.querySelector<HTMLElement>('[data-tool-shell]');

if (shell) {
  const loader = loaders[shell.dataset.toolId ?? ''];

  if (loader) {
    loader()
      .then((module) => module.mount(shell))
      .catch((error: unknown) => {
        console.error(error);
        const strings = readStrings(shell);
        const message = strings.loadFailed ?? 'The editor could not load. Reload the page.';

        for (const label of shell.querySelectorAll<HTMLElement>('[data-skeleton-label]')) {
          label.textContent = message;
        }

        const status = shell.querySelector<HTMLElement>('[data-status]');
        if (status) status.textContent = message;
      });
  }
}
