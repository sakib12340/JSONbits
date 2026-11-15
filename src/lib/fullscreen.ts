export interface FullscreenStrings {
  fullscreen: string;
  exitFullscreen: string;
  fullscreenFailed: string;
}

/**
 * Wires the toolbar fullscreen button to the tool frame. Returns a cleanup
 * function; calling it leaves fullscreen alone but detaches every listener.
 */
export function setupFullscreen(
  shell: HTMLElement,
  strings: FullscreenStrings,
  onFailure?: (message: string) => void,
): () => void {
  const frame = shell.querySelector<HTMLElement>('[data-tool-frame]');
  const button = shell.querySelector<HTMLButtonElement>('[data-action="fullscreen"]');

  if (!frame || !button) return () => {};

  if (!document.fullscreenEnabled || typeof frame.requestFullscreen !== 'function') {
    button.hidden = true;
    return () => {};
  }

  const sync = (): void => {
    const active = document.fullscreenElement === frame;
    const label = active ? strings.exitFullscreen : strings.fullscreen;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.setAttribute('aria-pressed', String(active));

    const enter = button.querySelector<HTMLElement>('[data-fullscreen-enter]');
    const exit = button.querySelector<HTMLElement>('[data-fullscreen-exit]');
    if (enter) enter.hidden = active;
    if (exit) exit.hidden = !active;
  };

  const onClick = (): void => {
    void (async () => {
      try {
        if (document.fullscreenElement === frame) await document.exitFullscreen();
        else await frame.requestFullscreen();
      } catch {
        onFailure?.(strings.fullscreenFailed);
      }
    })();
  };

  button.addEventListener('click', onClick);
  document.addEventListener('fullscreenchange', sync);
  sync();

  return () => {
    button.removeEventListener('click', onClick);
    document.removeEventListener('fullscreenchange', sync);
  };
}
