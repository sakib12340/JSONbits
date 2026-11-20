import { mountPane } from '../shared/mount-pane';
import { SORTER_SAMPLE } from '../shared/pane-samples';

export function mount(shell: HTMLElement): Promise<void> {
  return mountPane(shell, { op: 'sort', sample: SORTER_SAMPLE });
}
