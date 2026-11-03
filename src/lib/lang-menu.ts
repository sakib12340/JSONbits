const menu = document.querySelector<HTMLDetailsElement>('[data-lang-switcher]');

if (menu) {
  const summary = menu.querySelector('summary');

  document.addEventListener('click', (event) => {
    if (!menu.open) return;

    const target = event.target;

    if (target instanceof Node && !menu.contains(target)) {
      menu.open = false;
    }
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      event.preventDefault();
      menu.open = false;
      summary?.focus();
    }
  });

  menu.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) {
      menu.open = false;
    }
  });
}
