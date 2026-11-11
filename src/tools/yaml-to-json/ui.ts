import { mountConverter } from '../shared/mount-converter';
import { YAML_TO_JSON_SAMPLE } from '../shared/converter-samples';

export function mount(shell: HTMLElement): Promise<void> {
  return mountConverter(shell, { op: 'yamlToJson', sample: YAML_TO_JSON_SAMPLE });
}
