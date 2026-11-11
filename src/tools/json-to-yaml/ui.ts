import { mountConverter } from '../shared/mount-converter';
import { JSON_TO_YAML_SAMPLE } from '../shared/converter-samples';

export function mount(shell: HTMLElement): Promise<void> {
  return mountConverter(shell, { op: 'jsonToYaml', sample: JSON_TO_YAML_SAMPLE });
}
