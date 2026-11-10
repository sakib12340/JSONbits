import { mountOutputTool } from '../shared/mount-output-tool';
import { SAMPLE_REPAIR } from './sample';

export function mount(shell: HTMLElement): Promise<void> {
  return mountOutputTool(shell, { kind: 'repair', sample: SAMPLE_REPAIR });
}
