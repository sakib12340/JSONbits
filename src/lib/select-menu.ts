interface SelectOption {
  el: HTMLElement;
  value: string;
}

export interface SelectMenu {
  readonly root: HTMLElement;
  value: string;
}

function must<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing select element: ${selector}`);
  return found;
}

/**
 * Turns `[data-select]` markup into a small listbox so the popup is drawn with
 * our tokens instead of by the OS. Dispatches a bubbling `change` on the root
 * when the user picks a value; keyboard follows the listbox pattern.
 */
export function createSelectMenu(root: HTMLElement): SelectMenu {
  const trigger = must<HTMLButtonElement>(root, '[data-select-trigger]');
  const list = must<HTMLElement>(root, '[data-select-list]');
  const valueEl = must<HTMLElement>(root, '[data-select-value]');

  const options: SelectOption[] = Array.from(
    list.querySelectorAll<HTMLElement>('[role="option"]'),
    (el, index) => {
      el.id = `${list.id}-opt-${index}`;
      return { el, value: el.dataset.value ?? '' };
    },
  );

  if (options.length === 0) throw new Error('Select menu needs at least one option');

  let current =
    options.find((option) => option.el.getAttribute('aria-selected') === 'true')?.value ??
    options[0].value;
  let active = 0;
  let open = false;

  const labelOf = (option: SelectOption): string =>
    option.el.querySelector('[data-select-label]')?.textContent?.trim() ?? option.value;

  function select(value: string, emit: boolean): void {
    const next = options.find((option) => option.value === value) ?? options[0];
    current = next.value;
    valueEl.textContent = labelOf(next);
    root.dataset.value = current;

    for (const option of options) {
      option.el.setAttribute('aria-selected', String(option.value === current));
    }

    if (emit) root.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setActive(index: number): void {
    active = (index + options.length) % options.length;

    for (const [i, option] of options.entries()) {
      option.el.dataset.active = String(i === active);
    }

    list.setAttribute('aria-activedescendant', options[active].el.id);
  }

  function show(): void {
    if (open) return;
    open = true;
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    setActive(Math.max(0, options.findIndex((option) => option.value === current)));
    list.focus();
    document.addEventListener('pointerdown', onOutside, true);
  }

  function hide(refocus = false): void {
    if (!open) return;
    open = false;
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside, true);
    if (refocus) trigger.focus();
  }

  function onOutside(event: PointerEvent): void {
    if (!root.contains(event.target as Node)) hide();
  }

  trigger.addEventListener('click', () => {
    if (open) hide();
    else show();
  });

  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      show();
    }
  });

  list.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive(active + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive(active - 1);
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        select(options[active].value, true);
        hide(true);
        break;
      case 'Escape':
        event.preventDefault();
        hide(true);
        break;
      case 'Tab':
        hide();
        break;
      default:
        break;
    }
  });

  list.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
    if (!target) return;
    select(target.dataset.value ?? '', true);
    hide(true);
  });

  select(current, false);

  return {
    root,
    get value(): string {
      return current;
    },
    set value(next: string) {
      select(next, false);
    },
  };
}
