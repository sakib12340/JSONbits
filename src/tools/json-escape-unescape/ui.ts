import { mountPane } from '../shared/mount-pane';
import { ESCAPE_SAMPLE } from '../shared/pane-samples';

export function mount(shell: HTMLElement): Promise<void> {
  return mountPane(shell, { op: 'escape', sample: ESCAPE_SAMPLE, canRepair: false });
}
