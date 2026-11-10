import { copyText } from '../../lib/clipboard';
import type { DiffEntry, DiffResult, DiffStats, DiffType } from '../../workers/protocol';
import { fill } from '../shared/strings';
import type { DiffStrings } from './strings';

export type DiffFilter = 'all' | DiffType;

const ROW_HEIGHT = 44;
const OVERSCAN = 6;

interface Options {
  shell: HTMLElement;
  strings: DiffStrings;
  onAnnounce: (text: string) => void;
}

function el<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing diff element: ${selector}`);
  return found;
}

/** Virtualized, filterable list of structural JSON differences. */
export class DiffList {
  private readonly strings: DiffStrings;
  private readonly onAnnounce: (text: string) => void;
  private readonly scroll: HTMLElement;
  private readonly spacer: HTMLElement;
  private readonly rows: HTMLElement;
  private readonly empty: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly truncated: HTMLElement;
  private readonly filterButtons: HTMLButtonElement[];

  private entries: DiffEntry[] = [];
  private filtered: DiffEntry[] = [];
  private stats: DiffStats | null = null;
  private filter: DiffFilter = 'all';
  private selected = 0;

  constructor(options: Options) {
    this.strings = options.strings;
    this.onAnnounce = options.onAnnounce;
    this.scroll = el(options.shell, '[data-diff-scroll]');
    this.spacer = el(options.shell, '[data-diff-spacer]');
    this.rows = el(options.shell, '[data-diff-rows]');
    this.empty = el(options.shell, '[data-diff-empty]');
    this.summary = el(options.shell, '[data-diff-summary]');
    this.truncated = el(options.shell, '[data-diff-truncated]');
    this.filterButtons = Array.from(
      options.shell.querySelectorAll<HTMLButtonElement>('[data-filter]'),
    );

    this.scroll.addEventListener('scroll', () => this.renderWindow(), { passive: true });
    this.scroll.addEventListener('keydown', (event) => void this.onKey(event));
    this.scroll.addEventListener('click', (event) => void this.onClick(event));

    for (const button of this.filterButtons) {
      button.addEventListener('click', () => this.setFilter(button.dataset.filter as DiffFilter));
    }

    this.clear(this.strings.empty);
  }

  get hasResult(): boolean {
    return this.stats !== null;
  }

  setResult(result: DiffResult): void {
    this.entries = result.entries;
    this.stats = result.stats;
    this.filter = 'all';
    this.selected = 0;
    this.truncated.hidden = !result.stats.truncated;
    this.truncated.textContent = fill(this.strings.truncated, {
      count: result.entries.length,
    });
    this.updateFilterState();
    this.updateCounts();
    this.summary.textContent =
      result.stats.total === 0
        ? this.strings.same
        : fill(this.strings.found, { count: result.stats.total });
    this.applyFilter();
    this.scroll.scrollTop = 0;
  }

  clear(message: string): void {
    this.entries = [];
    this.filtered = [];
    this.stats = null;
    this.filter = 'all';
    this.selected = 0;
    this.spacer.style.height = '0px';
    this.rows.replaceChildren();
    this.empty.hidden = false;
    this.empty.textContent = message;
    this.summary.textContent = '';
    this.truncated.hidden = true;
    this.scroll.removeAttribute('aria-activedescendant');
    this.updateFilterState();
    this.updateCounts();
  }

  focus(): void {
    this.scroll.focus();
  }

  copySelectedPath(): boolean {
    const entry = this.filtered[this.selected];
    if (!entry) return false;
    void this.copyPath(entry.path);
    return true;
  }

  dispose(): void {
    // No timers or observers to release; listeners live with the shell.
  }

  private setFilter(filter: DiffFilter): void {
    if (this.filter === filter) return;
    this.filter = filter;
    this.selected = 0;
    this.updateFilterState();
    this.applyFilter();
    this.scroll.scrollTop = 0;
  }

  private updateFilterState(): void {
    for (const button of this.filterButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.filter === this.filter));
    }
  }

  private updateCounts(): void {
    for (const button of this.filterButtons) {
      const filter = button.dataset.filter as DiffFilter;
      const count = el<HTMLElement>(button, '[data-filter-count]');
      count.textContent = String(this.countFor(filter));
    }
  }

  private countFor(filter: DiffFilter): number {
    if (!this.stats) return 0;
    if (filter === 'all') return this.stats.total;
    return this.stats[filter];
  }

  private applyFilter(): void {
    this.filtered =
      this.filter === 'all'
        ? this.entries
        : this.entries.filter((entry) => entry.type === this.filter);

    this.selected = 0;
    this.spacer.style.height = `${this.filtered.length * ROW_HEIGHT}px`;
    this.rows.replaceChildren();
    this.updateEmpty();
    this.renderWindow();
  }

  private updateEmpty(): void {
    if (!this.stats) {
      this.empty.hidden = false;
      this.empty.textContent = this.strings.empty;
      return;
    }

    if (this.stats.total === 0) {
      this.empty.hidden = false;
      this.empty.textContent = this.strings.same;
      return;
    }

    if (this.filtered.length === 0) {
      this.empty.hidden = false;
      this.empty.textContent = this.strings.none;
      return;
    }

    this.empty.hidden = true;
  }

  private renderWindow(): void {
    const total = this.filtered.length;

    if (total === 0) {
      this.rows.replaceChildren();
      return;
    }

    const height = this.scroll.clientHeight || 320;
    const start = Math.max(0, Math.floor(this.scroll.scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(total, Math.ceil((this.scroll.scrollTop + height) / ROW_HEIGHT) + OVERSCAN);

    this.rows.style.transform = `translateY(${start * ROW_HEIGHT}px)`;
    this.rows.replaceChildren();

    for (let index = start; index < end; index += 1) {
      this.rows.append(this.renderRow(this.filtered[index], index));
    }

    if (this.filtered[this.selected]) {
      this.scroll.setAttribute('aria-activedescendant', `diff-row-${this.selected}`);
    } else {
      this.scroll.removeAttribute('aria-activedescendant');
    }
  }

  private renderRow(entry: DiffEntry, index: number): HTMLElement {
    const row = document.createElement('div');
    row.className = `diff-row diff-row--${entry.type}`;
    row.id = `diff-row-${index}`;
    row.dataset.index = String(index);
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(index === this.selected));
    if (index === this.selected) row.classList.add('is-selected');

    const badge = document.createElement('span');
    badge.className = `diff-badge diff-badge--${entry.type}`;
    badge.textContent = this.typeLabel(entry.type);
    row.append(badge);

    const path = document.createElement('code');
    path.className = 'diff-path';
    path.textContent = entry.path;
    row.append(path);

    const values = document.createElement('span');
    values.className = 'diff-values';

    if (entry.type === 'removed') {
      values.append(this.valueNode(entry.old, 'old'));
    } else if (entry.type === 'added') {
      values.append(this.valueNode(entry.new, 'new'));
    } else {
      values.append(this.valueNode(entry.old, 'old'));
      const arrow = document.createElement('span');
      arrow.className = 'diff-arrow';
      arrow.textContent = '→';
      values.append(arrow);
      values.append(this.valueNode(entry.new, 'new'));
    }

    row.append(values);

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'diff-copy';
    copy.dataset.copyPath = entry.path;
    copy.setAttribute('aria-label', this.strings.copyPath);
    copy.title = this.strings.copyPath;
    copy.textContent = '⧉';
    row.append(copy);

    return row;
  }

  private valueNode(value: string | undefined, kind: 'old' | 'new'): HTMLElement {
    const node = document.createElement('code');
    node.className = kind === 'old' ? 'diff-old' : 'diff-new';
    node.textContent = value ?? '';
    return node;
  }

  private typeLabel(type: DiffType): string {
    if (type === 'added') return this.strings.added;
    if (type === 'removed') return this.strings.removed;
    return this.strings.changed;
  }

  private async onClick(event: MouseEvent): Promise<void> {
    const target = event.target as HTMLElement;
    const copy = target.closest<HTMLElement>('[data-copy-path]');

    if (copy) {
      event.preventDefault();
      await this.copyPath(copy.dataset.copyPath ?? '');
      return;
    }

    const row = target.closest<HTMLElement>('[data-index]');
    if (!row) return;

    const index = Number(row.dataset.index);
    if (!Number.isInteger(index)) return;
    this.select(index, false);
  }

  private async onKey(event: KeyboardEvent): Promise<void> {
    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && event.shiftKey && (event.key === 'c' || event.key === 'C')) {
      if (this.filtered.length > 0) {
        event.preventDefault();
        await this.copyPath(this.filtered[this.selected].path);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.select(Math.min(this.filtered.length - 1, this.selected + 1), true);
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.select(Math.max(0, this.selected - 1), true);
        return;
      case 'Home':
        event.preventDefault();
        this.select(0, true);
        return;
      case 'End':
        event.preventDefault();
        this.select(this.filtered.length - 1, true);
        return;
      case 'Enter':
        event.preventDefault();
        if (this.filtered[this.selected]) await this.copyPath(this.filtered[this.selected].path);
        return;
      default:
        return;
    }
  }

  private select(index: number, reveal: boolean): void {
    if (this.filtered.length === 0) return;

    this.selected = Math.max(0, Math.min(this.filtered.length - 1, index));

    if (reveal) {
      const top = this.selected * ROW_HEIGHT;
      const height = this.scroll.clientHeight || 320;
      const bottom = top + ROW_HEIGHT;

      if (top < this.scroll.scrollTop) this.scroll.scrollTop = top;
      else if (bottom > this.scroll.scrollTop + height) {
        this.scroll.scrollTop = bottom - height;
      }
    }

    this.renderWindow();
  }

  private async copyPath(path: string): Promise<void> {
    if (!path) return;
    const ok = await copyText(path);
    this.onAnnounce(ok ? this.strings.copied : this.strings.copyFailed);
  }
}
