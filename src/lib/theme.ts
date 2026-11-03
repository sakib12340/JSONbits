const STORAGE_KEY = 'theme';

type ThemeMode = 'light' | 'dark' | 'system';

const modes: readonly ThemeMode[] = ['light', 'dark', 'system'];

const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');
const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const liveStatus = document.querySelector<HTMLElement>('[data-theme-status]');

let memoryMode: ThemeMode = 'system';

function isMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isMode(stored)) return stored;
  } catch {
    // Storage can be unavailable in private modes.
  }

  return memoryMode;
}

function writeMode(mode: ThemeMode): void {
  memoryMode = mode;

  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // The in-memory mode still works for this page.
  }
}

function effective(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return media.matches ? 'dark' : 'light';
  }

  return mode;
}

function modeLabel(mode: ThemeMode): string {
  if (!button) return mode;

  if (mode === 'light') return button.dataset.labelLight ?? mode;
  if (mode === 'dark') return button.dataset.labelDark ?? mode;
  return button.dataset.labelSystem ?? mode;
}

function apply(mode: ThemeMode, announce = false): void {
  root.dataset.theme = effective(mode);
  root.dataset.themeMode = mode;

  if (!button) return;

  const label = modeLabel(mode);
  const template = button.dataset.labelTemplate ?? 'Theme: {mode}';
  button.setAttribute('aria-label', template.replace('{mode}', label));

  for (const icon of button.querySelectorAll<HTMLElement>('[data-theme-icon]')) {
    icon.hidden = icon.dataset.themeIcon !== mode;
  }

  if (announce && liveStatus) {
    const templateText = button.dataset.announceTemplate ?? 'Theme set to {mode}.';
    liveStatus.textContent = templateText.replace('{mode}', label);
  }
}

if (button) {
  button.hidden = false;
  apply(readMode());

  button.addEventListener('click', () => {
    const current = readMode();
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    writeMode(next);
    apply(next, true);
  });

  media.addEventListener('change', () => {
    if (readMode() === 'system') {
      apply('system');
    }
  });
}
