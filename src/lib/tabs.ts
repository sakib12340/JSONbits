export interface TabsController<T extends string> {
  show(view: T): void;
}

interface Options<T extends string> {
  onShow?: (view: T) => void;
}

/** Generic mobile tab switcher driven by `data-tab` and `data-pane` attributes. */
export function setupTabs<T extends string>(
  shell: HTMLElement,
  options: Options<T> = {},
): TabsController<T> {
  const tabs = Array.from(shell.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const panes = Array.from(shell.querySelectorAll<HTMLElement>('[data-pane]'));
  const dot = shell.querySelector<HTMLElement>('[data-output-dot]');
  const root = shell.querySelector<HTMLElement>('[data-mobile-view]');

  const show = (view: T): void => {
    if (root) root.dataset.mobileView = view;

    for (const tab of tabs) {
      const active = tab.dataset.tab === view;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }

    for (const pane of panes) {
      pane.classList.toggle('is-active', pane.dataset.pane === view);
    }

    if (dot) dot.hidden = true;
    options.onShow?.(view);
  };

  const focusTab = (index: number): void => {
    const tab = tabs[index];
    if (!tab) return;
    tab.focus();
    show(tab.dataset.tab as T);
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => show(tab.dataset.tab as T));

    tab.addEventListener('keydown', (event) => {
      const index = tabs.indexOf(tab);

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusTab((index + 1) % tabs.length);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusTab((index - 1 + tabs.length) % tabs.length);
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusTab(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        focusTab(tabs.length - 1);
      }
    });
  }

  return { show };
}
