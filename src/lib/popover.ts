export type PopoverAlign = 'start' | 'end';

/**
 * Picks the inline side with enough room for a popover. When both fit, the
 * stylesheet's default side wins so menus do not jump around on wide screens.
 */
export function chooseAlignment(
  startSpace: number,
  endSpace: number,
  width: number,
  prefersEnd: boolean,
): PopoverAlign {
  if (startSpace >= width && endSpace >= width) return prefersEnd ? 'end' : 'start';
  if (startSpace >= width) return 'start';
  if (endSpace >= width) return 'end';
  return startSpace >= endSpace ? 'start' : 'end';
}

interface Bounds {
  left: number;
  right: number;
}

/** The nearest ancestor that can cut the panel off, or the viewport. */
function clippingBounds(trigger: HTMLElement): Bounds {
  const gutter = 8;

  for (
    let node = trigger.parentElement;
    node && node !== document.documentElement;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node);
    if (/(hidden|clip|auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)) {
      const rect = node.getBoundingClientRect();
      return { left: rect.left + gutter, right: rect.right - gutter };
    }
  }

  return { left: gutter, right: window.innerWidth - gutter };
}

/**
 * Flips an absolutely positioned panel to the side of its trigger that has
 * room inside the clipping ancestor. Logical inset properties keep it correct
 * in RTL too. Call after the panel has been made visible.
 */
export function positionPopover(trigger: HTMLElement, panel: HTMLElement): void {
  panel.style.insetInlineStart = '';
  panel.style.insetInlineEnd = '';
  panel.style.maxWidth = '';
  panel.style.minWidth = '';

  const triggerRect = trigger.getBoundingClientRect();
  const width = panel.getBoundingClientRect().width;
  const bounds = clippingBounds(trigger);
  const rtl = getComputedStyle(trigger).direction === 'rtl';

  const startSpace = rtl ? triggerRect.right - bounds.left : bounds.right - triggerRect.left;
  const endSpace = rtl ? bounds.right - triggerRect.left : triggerRect.right - bounds.left;

  const prefersEnd = getComputedStyle(panel).insetInlineEnd !== 'auto';
  const align = chooseAlignment(startSpace, endSpace, width, prefersEnd);
  const space = align === 'start' ? startSpace : endSpace;

  panel.style.insetInlineStart = align === 'start' ? '0' : 'auto';
  panel.style.insetInlineEnd = align === 'end' ? '0' : 'auto';
  if (space < width) {
    panel.style.minWidth = '0';
    panel.style.maxWidth = `${Math.max(0, Math.floor(space))}px`;
  }
}

let outsideCloseBound = false;

/** Closes any open `details[data-popover]` the pointer landed outside of. */
function closeOutsidePopovers(event: PointerEvent): void {
  for (const menu of document.querySelectorAll<HTMLDetailsElement>('details[data-popover][open]')) {
    if (event.target instanceof Node && menu.contains(event.target)) continue;
    menu.removeAttribute('open');
  }
}

/**
 * Wires a `<details>` menu: keeps its panel inside the clipping ancestor, closes
 * on Escape and on an outside pointer press. Used by the fix breakdown popover.
 */
export function setupDetailsPopover(menu: HTMLDetailsElement): void {
  const summary = menu.querySelector<HTMLElement>('summary');
  const panel = menu.querySelector<HTMLElement>('.menu-panel');
  if (!summary || !panel) return;

  const update = (): void => {
    if (menu.open) positionPopover(summary, panel);
  };

  menu.addEventListener('toggle', update);
  window.addEventListener('resize', update);
  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !menu.open) return;
    event.preventDefault();
    menu.removeAttribute('open');
    summary.focus();
  });

  if (!outsideCloseBound) {
    outsideCloseBound = true;
    document.addEventListener('pointerdown', closeOutsidePopovers);
  }
}
