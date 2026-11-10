import { copyText } from '../../lib/clipboard';
import { fill } from '../shared/strings';
import { formatPath, type TreeLine, type TreeStore } from './store';
import type { ViewerStrings } from './strings';

const ROW_HEIGHT = 30;
const OVERSCAN = 8;

interface Options {
  shell: HTMLElement;
  store: TreeStore;
  strings: ViewerStrings;
  onStatus: (text: string) => void;
  onAnnounce: (text: string) => void;
}

function el<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing tree element: ${selector}`);
  return found;
}

/** Virtualized ARIA tree that keeps only the visible rows in the DOM. */
export class TreeView {
  private readonly shell: HTMLElement;
  private readonly store: TreeStore;
  private readonly strings: ViewerStrings;
  private readonly onStatus: (text: string) => void;
  private readonly onAnnounce: (text: string) => void;
  private readonly scroll: HTMLElement;
  private readonly spacer: HTMLElement;
  private readonly rows: HTMLElement;
  private readonly empty: HTMLElement;
  private readonly count: HTMLElement;
  private readonly searchInput: HTMLInputElement;
  private readonly pathEl: HTMLElement;
  private readonly copyButton: HTMLButtonElement;
  private readonly valueButton: HTMLButtonElement;
  private readonly menu: HTMLDetailsElement | null;

  private lines: TreeLine[] = [];
  private selected = 0;
  private searchTimer = 0;
  private searchSeq = 0;
  private copyTimer = 0;
  private copyValueTimer = 0;
  private statusToken = 0;

  constructor(options: Options) {
    this.shell = options.shell;
    this.store = options.store;
    this.strings = options.strings;
    this.onStatus = (text) => {
      this.statusToken += 1;
      options.onStatus(text);
    };
    this.onAnnounce = options.onAnnounce;
    this.scroll = el(options.shell, '[data-tree-scroll]');
    this.spacer = el(options.shell, '[data-tree-spacer]');
    this.rows = el(options.shell, '[data-tree-rows]');
    this.empty = el(options.shell, '[data-tree-empty]');
    this.count = el(options.shell, '[data-tree-count]');
    this.searchInput = el(options.shell, '[data-tree-search]');
    this.pathEl = el(options.shell, '[data-tree-path]');
    this.copyButton = el(options.shell, '[data-tree-copy]');
    this.valueButton = el(options.shell, '[data-tree-copy-value]');
    this.menu = options.shell.querySelector<HTMLDetailsElement>('[data-tree-menu]');

    this.scroll.addEventListener('scroll', () => this.renderWindow(), { passive: true });
    this.scroll.addEventListener('keydown', (event) => void this.onKey(event));
    this.scroll.addEventListener('click', (event) => void this.onClick(event));
    this.copyButton.addEventListener('click', () => void this.copyPath());
    this.valueButton.addEventListener('click', () => void this.copyValue());
    this.bindMenu();
    this.searchInput.addEventListener('input', () => this.scheduleSearch());
    this.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.searchInput.value = '';
        this.clearSearch();
        this.scroll.focus();
      }
    });
  }

  refresh(): void {
    this.lines = this.store.visible();

    if (this.lines.length === 0) {
      this.selected = 0;
    } else if (this.selected >= this.lines.length) {
      this.selected = this.lines.length - 1;
    }

    this.spacer.style.height = `${this.lines.length * ROW_HEIGHT}px`;
    this.empty.hidden = this.lines.length > 0;
    this.empty.textContent = this.emptyMessage();

    if (this.store.isSearching) {
      this.count.textContent = this.store.searchTruncated
        ? fill(this.strings.treeTruncated, { count: this.store.searchTotal })
        : fill(this.strings.treeMatches, { count: this.store.searchTotal });
    } else {
      this.count.textContent =
        this.store.root === null ? '' : fill(this.strings.treeNodes, { count: this.store.nodeCount });
    }

    this.updatePath();
    this.updateScrollForSelection();
    this.renderWindow();
  }

  clear(): void {
    this.lines = [];
    this.selected = 0;
    this.spacer.style.height = '0px';
    this.rows.replaceChildren();
    this.empty.hidden = false;
    this.empty.textContent = this.strings.treePlaceholder;
    this.count.textContent = '';
    this.searchInput.value = '';
    this.pathEl.textContent = '—';
    this.copyButton.disabled = true;
    this.valueButton.disabled = true;
    this.scroll.removeAttribute('aria-activedescendant');
  }

  focus(): void {
    this.scroll.focus();
  }

  openSearch(): void {
    this.searchInput.focus();
    this.searchInput.select();
  }

  copySelected(): boolean {
    const line = this.lines[this.selected];
    if (!line?.row) return false;
    void this.copyPath();
    return true;
  }

  async copyPath(): Promise<void> {
    const line = this.lines[this.selected];
    if (!line?.row) return;

    const path = formatPath(line.path);
    const ok = await copyText(path);
    const label = el<HTMLElement>(this.shell, '[data-tree-copy-label]');
    label.textContent = ok ? this.strings.copied : this.strings.copyFailed;
    this.onAnnounce(label.textContent);

    if (this.copyTimer !== 0) window.clearTimeout(this.copyTimer);
    this.copyTimer = window.setTimeout(() => {
      this.copyTimer = 0;
      label.textContent = this.strings.treeCopyPathShort;
    }, 1600);
  }

  async copyValue(): Promise<void> {
    const line = this.lines[this.selected];
    if (!line?.row) return;

    const label = el<HTMLElement>(this.shell, '[data-tree-copy-value-label]');

    try {
      const result = await this.store.value(line.path);

      if (!result.found || result.text === null) {
        const message = result.found
          ? this.strings.treeValueTooLarge
          : this.strings.treeValueMissing;
        this.onStatus(message);
        this.onAnnounce(message);
        return;
      }

      const ok = await copyText(result.text);
      label.textContent = ok ? this.strings.copied : this.strings.copyFailed;
      this.onAnnounce(label.textContent);

      if (this.copyValueTimer !== 0) window.clearTimeout(this.copyValueTimer);
      this.copyValueTimer = window.setTimeout(() => {
        this.copyValueTimer = 0;
        label.textContent = this.strings.treeCopyValueShort;
      }, 1600);
    } catch (error) {
      this.onStatus(this.strings.error);
      this.onAnnounce(this.strings.error);
      console.error(error);
    }
  }

  private bindMenu(): void {
    if (!this.menu) return;

    this.menu.querySelector<HTMLButtonElement>('[data-tree-collapse]')?.addEventListener(
      'click',
      () => {
        this.closeMenu();
        this.collapseAll();
      },
    );

    this.menu.querySelectorAll<HTMLButtonElement>('[data-tree-depth]').forEach((button) => {
      button.addEventListener('click', () => {
        this.closeMenu();
        void this.expandToDepth(Number(button.dataset.treeDepth));
      });
    });

    this.menu.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !this.menu?.open) return;
      event.preventDefault();
      this.closeMenu();
      this.menu.querySelector('summary')?.focus();
    });

    document.addEventListener('pointerdown', this.onDocumentPointerDown);
  }

  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.menu?.open) return;
    if (event.target instanceof Node && this.menu.contains(event.target)) return;
    this.closeMenu();
  };

  private closeMenu(): void {
    this.menu?.removeAttribute('open');
  }

  private collapseAll(): void {
    this.store.collapseAll();
    this.searchInput.value = '';
    this.selected = 0;
    this.scroll.scrollTop = 0;
    this.refresh();
    this.onStatus(this.strings.treeCollapsed);
    this.onAnnounce(this.strings.treeCollapsed);
    this.focus();
  }

  private async expandToDepth(depth: number): Promise<void> {
    if (!Number.isInteger(depth) || depth < 2) return;

    if (!this.store.root) {
      this.onStatus(this.strings.treePressView);
      return;
    }

    this.searchInput.value = '';
    this.onStatus(this.strings.treeExpanding);

    try {
      const result = await this.store.expandToDepth(depth);
      this.selected = 0;
      this.scroll.scrollTop = 0;
      this.refresh();

      const message = fill(
        result.truncated ? this.strings.treeExpandedPartial : this.strings.treeExpanded,
        { depth },
      );
      this.onStatus(message);
      this.onAnnounce(message);
      this.focus();
    } catch (error) {
      this.onStatus(this.strings.error);
      console.error(error);
    }
  }

  dispose(): void {
    if (this.searchTimer !== 0) window.clearTimeout(this.searchTimer);
    if (this.copyTimer !== 0) window.clearTimeout(this.copyTimer);
    if (this.copyValueTimer !== 0) window.clearTimeout(this.copyValueTimer);
    document.removeEventListener('pointerdown', this.onDocumentPointerDown);
  }

  private emptyMessage(): string {
    if (this.store.root === null) return this.strings.treePlaceholder;
    if (this.store.isSearching) return this.strings.treeNoResults;
    if (!this.store.root.hasChildren) return this.strings.treeEmpty;
    return this.strings.treePlaceholder;
  }

  private renderWindow(): void {
    const total = this.lines.length;
    if (total === 0) {
      this.rows.replaceChildren();
      return;
    }

    const height = this.scroll.clientHeight || 420;
    const start = Math.max(0, Math.floor(this.scroll.scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(total, Math.ceil((this.scroll.scrollTop + height) / ROW_HEIGHT) + OVERSCAN);

    this.rows.style.transform = `translateY(${start * ROW_HEIGHT}px)`;
    this.rows.replaceChildren();

    for (let index = start; index < end; index += 1) {
      this.rows.append(this.renderRow(this.lines[index], index));
    }

    if (this.lines[this.selected]) {
      this.scroll.setAttribute('aria-activedescendant', `tree-row-${this.selected}`);
    }
  }

  private renderRow(line: TreeLine, index: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'tree-row';
    row.id = `tree-row-${index}`;
    row.dataset.index = String(index);
    row.setAttribute('role', 'treeitem');
    row.setAttribute('aria-level', String(line.level));
    row.setAttribute('aria-selected', String(index === this.selected));
    if (index === this.selected) row.classList.add('is-selected');

    if (line.kind === 'more') {
      row.dataset.more = 'true';
      row.classList.add('is-more');
      const label = document.createElement('span');
      label.className = 'tree-more-label';
      label.textContent = fill(this.strings.treeLoadMore, { remaining: line.remaining });
      row.append(label);
      return row;
    }

    const node = line.row;
    if (!node) return row;

    const chevron = document.createElement('span');
    chevron.className = 'tree-chevron';
    chevron.setAttribute('aria-hidden', 'true');

    if (node.hasChildren) {
      if (line.expanded) chevron.classList.add('is-expanded');
      chevron.innerHTML =
        '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="m6 4 4 4-4 4"/></svg>';
    }

    row.append(chevron);

    const badge = document.createElement('span');
    badge.className = `tree-badge tree-badge--${node.type}`;
    badge.textContent = node.type;
    row.append(badge);

    const label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = node.label;
    row.append(label);

    const preview = document.createElement('span');
    preview.className = 'tree-preview';
    preview.textContent = node.preview;
    row.append(preview);

    if (node.hasChildren) {
      row.setAttribute('aria-expanded', String(line.expanded));
      const count = document.createElement('span');
      count.className = 'tree-count';
      count.textContent = String(node.childCount);
      row.append(count);
    }

    row.title = formatPath(line.path);
    return row;
  }

  private async onClick(event: MouseEvent): Promise<void> {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-index]');
    if (!target) return;

    const index = Number(target.dataset.index);
    if (!Number.isInteger(index) || !this.lines[index]) return;

    this.select(index, true);
    const line = this.lines[index];

    if (line.kind === 'more') {
      await this.loadMore(line);
      return;
    }

    if (line.row?.hasChildren) await this.toggle(index);
  }

  private async onKey(event: KeyboardEvent): Promise<void> {
    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && (event.key === 'f' || event.key === 'F')) {
      event.preventDefault();
      this.openSearch();
      return;
    }

    if (modifier && event.shiftKey && (event.key === 'c' || event.key === 'C')) {
      if (this.copySelected()) event.preventDefault();
      return;
    }

    const line = this.lines[this.selected];

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.select(Math.min(this.lines.length - 1, this.selected + 1), true);
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
        this.select(this.lines.length - 1, true);
        return;
      case 'ArrowRight':
        event.preventDefault();
        if (line?.row?.hasChildren) {
          if (!line.expanded) await this.expand(line);
          else this.select(Math.min(this.lines.length - 1, this.selected + 1), true);
        }
        return;
      case 'ArrowLeft':
        event.preventDefault();
        if (line?.expanded) {
          await this.collapse(line);
        } else {
          this.selectParent(line);
        }
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (line?.kind === 'more') await this.loadMore(line);
        else if (line?.row?.hasChildren) await this.toggle(this.selected);
        return;
      default:
        return;
    }
  }

  private select(index: number, reveal: boolean): void {
    if (this.lines.length === 0) return;
    this.selected = Math.max(0, Math.min(this.lines.length - 1, index));

    if (reveal) {
      const top = this.selected * ROW_HEIGHT;
      const bottom = top + ROW_HEIGHT;
      const viewTop = this.scroll.scrollTop;
      const viewBottom = viewTop + (this.scroll.clientHeight || 420);

      if (top < viewTop) this.scroll.scrollTop = top;
      else if (bottom > viewBottom) this.scroll.scrollTop = bottom - (this.scroll.clientHeight || 420);
    }

    this.updatePath();
    this.renderWindow();
  }

  private selectParent(line: TreeLine): void {
    for (let index = this.selected - 1; index >= 0; index -= 1) {
      if (this.lines[index].level < line.level) {
        this.select(index, true);
        return;
      }
    }
  }

  private async toggle(index: number): Promise<void> {
    const line = this.lines[index];
    if (!line?.row?.hasChildren) return;

    if (line.expanded) await this.collapse(line);
    else await this.expand(line);
  }

  private async expand(line: TreeLine): Promise<void> {
    if (!line.row) return;

    if (!this.store.isSearching) this.onStatus(this.strings.viewing);
    const token = this.statusToken;

    try {
      await this.store.expand(line.path);
      this.refresh();
      if (!this.store.isSearching && token === this.statusToken) {
        this.onStatus(this.strings.ready);
      }
    } catch (error) {
      this.onStatus(this.strings.error);
      console.error(error);
    }
  }

  private async collapse(line: TreeLine): Promise<void> {
    if (!line.row) return;
    this.store.collapse(line.path);
    this.refresh();
  }

  private async loadMore(line: TreeLine): Promise<void> {
    try {
      await this.store.loadMore(line.path);
      this.refresh();
    } catch (error) {
      this.onStatus(this.strings.error);
      console.error(error);
    }
  }

  private updatePath(): void {
    const line = this.lines[this.selected];
    const hasPath = Boolean(line?.row);
    this.copyButton.disabled = !hasPath;
    this.valueButton.disabled = !hasPath;
    this.pathEl.textContent = line ? formatPath(line.path) : '—';
    if (line) this.pathEl.title = formatPath(line.path);
  }

  private updateScrollForSelection(): void {
    if (this.lines.length === 0) return;

    const top = this.selected * ROW_HEIGHT;
    const viewTop = this.scroll.scrollTop;
    const height = this.scroll.clientHeight || 420;
    const viewBottom = viewTop + height;

    if (top < viewTop) this.scroll.scrollTop = top;
    else if (top + ROW_HEIGHT > viewBottom) this.scroll.scrollTop = top + ROW_HEIGHT - height;
  }

  private scheduleSearch(): void {
    if (this.searchTimer !== 0) window.clearTimeout(this.searchTimer);

    const query = this.searchInput.value.trim();

    if (query.length === 0) {
      this.clearSearch();
      return;
    }

    if (!this.store.root) {
      this.onStatus(this.strings.treePressView);
      return;
    }

    this.searchTimer = window.setTimeout(() => {
      this.searchTimer = 0;
      void this.runSearch(query);
    }, 300);
  }

  private async runSearch(query: string): Promise<void> {
    const seq = ++this.searchSeq;
    this.onStatus(this.strings.searching);

    try {
      await this.store.search(query);
      if (seq !== this.searchSeq) return;
      this.selected = 0;
      this.onStatus(
        fill(this.strings.treeMatches, { count: this.store.searchTotal }),
      );
      this.refresh();
    } catch (error) {
      if (seq !== this.searchSeq) return;
      this.onStatus(this.strings.error);
      console.error(error);
    }
  }

  private clearSearch(): void {
    this.searchSeq += 1;
    this.searchInput.value = '';
    this.store.clearSearch();
    this.selected = 0;
    this.refresh();
    this.onStatus(this.strings.ready);
  }
}
