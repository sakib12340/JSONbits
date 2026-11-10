import { mountOutputTool } from '../shared/mount-output-tool';
import { SAMPLE_MINIFY } from './sample';

export function mount(shell: HTMLElement): Promise<void> {
  return mountOutputTool(shell, { kind: 'minify', sample: SAMPLE_MINIFY });
}
