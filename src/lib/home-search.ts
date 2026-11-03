const form = document.querySelector<HTMLFormElement>('[data-tool-search]');

if (form) {
  const input = form.querySelector<HTMLInputElement>('input[type="search"]');
  const status = document.querySelector<HTMLElement>('[data-search-status]');
  const empty = document.querySelector<HTMLElement>('[data-search-empty]');
  const clear = document.querySelector<HTMLButtonElement>('[data-search-clear]');
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-tool-section]'));
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-tool-card]'));

  if (input) {
    const total = cards.length;
    const template = form.dataset.resultsTemplate ?? 'Showing {count} of {total} tools';

    const update = (): void => {
      const query = input.value.trim().toLowerCase();
      let visible = 0;

      for (const card of cards) {
        const matches = query.length === 0 || (card.dataset.search ?? '').includes(query);
        card.hidden = !matches;

        if (matches) {
          visible += 1;
        }
      }

      for (const section of sections) {
        const hasVisibleCard = Array.from(
          section.querySelectorAll<HTMLElement>('[data-tool-card]'),
        ).some((card) => !card.hidden);

        section.hidden = !hasVisibleCard;
      }

      if (status) {
        status.textContent = template
          .replace('{count}', String(visible))
          .replace('{total}', String(total));
      }

      if (empty) empty.hidden = visible > 0;
      if (clear) clear.hidden = query.length === 0;
    };

    form.addEventListener('submit', (event) => event.preventDefault());
    input.addEventListener('input', update);

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        input.value = '';
        update();
        input.blur();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== '/' || event.defaultPrevented) return;

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      event.preventDefault();
      input.focus();
      input.select();
    });

    clear?.addEventListener('click', () => {
      input.value = '';
      update();
      input.focus();
    });

    update();
  }
}
