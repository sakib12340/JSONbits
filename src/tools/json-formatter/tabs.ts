import { setupTabs as setup, type TabsController } from '../../lib/tabs';

export type ToolView = 'input' | 'output';

interface Options {
  onShow?: (view: ToolView) => void;
}

export function setupTabs(shell: HTMLElement, options: Options = {}): TabsController<ToolView> {
  return setup<ToolView>(shell, options);
}
