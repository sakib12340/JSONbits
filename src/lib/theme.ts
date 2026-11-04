const STORAGE_KEY = 'theme';

/**
 * The site owns its theme: the operating system preference never changes it.
 * Only light and dark exist, and light is the default.
 */
type ThemeMode = 'light' | 'dark';

const modes: readonly ThemeMode[] = ['light', 'dark'];

const THEME_COLORS: Record<ThemeMode, string> = {
  light: '#fffefb',
  dark: '#0a0f0e',
};

const root = document.documentElement;
const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
const liveStatus = document.querySelector<HTMLElement>('[data-theme-status]');
const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

let memoryMode: ThemeMode = 'light';

function isMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark';
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

function modeLabel(mode: ThemeMode): string {
  if (!button) return mode;

  return mode === 'light'
    ? (button.dataset.labelLight ?? mode)
    : (button.dataset.labelDark ?? mode);
}

function apply(mode: ThemeMode, announce = false): void {
  root.dataset.theme = mode;
  root.dataset.themeMode = mode;

  if (themeColor) themeColor.content = THEME_COLORS[mode];

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
}
