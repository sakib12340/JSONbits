export type ToolView = 'input' | 'output';

interface Options {
  onShow?: (view: ToolView) => void;
}

export interface TabsController {
  show(view: ToolView): void;
}

export function setupTabs(shell: HTMLElement, options: Options = {}): TabsController {
  const tabs = Array.from(shell.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  const panes = Array.from(shell.querySelectorAll<HTMLElement>('[data-pane]'));
  const dot = shell.querySelector<HTMLElement>('[data-output-dot]');
  const root = shell.querySelector<HTMLElement>('[data-mobile-view]');

  const show = (view: ToolView): void => {
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
    show(tab.dataset.tab === 'output' ? 'output' : 'input');
  };

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => {
      show(tab.dataset.tab === 'output' ? 'output' : 'input');
    });

    tab.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        focusTab((index + direction + tabs.length) % tabs.length);
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusTab(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        focusTab(tabs.length - 1);
      }
    });
  }

  show('input');
  return { show };
}
