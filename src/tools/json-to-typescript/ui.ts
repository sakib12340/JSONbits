import { mountPane } from '../shared/mount-pane';
import { TYPESCRIPT_SAMPLE } from '../shared/pane-samples';

export function mount(shell: HTMLElement): Promise<void> {
  return mountPane(shell, { op: 'jsonToTypescript', sample: TYPESCRIPT_SAMPLE });
}
