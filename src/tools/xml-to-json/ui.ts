import { mountConverter } from '../shared/mount-converter';
import { XML_TO_JSON_SAMPLE } from '../shared/converter-samples';

export function mount(shell: HTMLElement): Promise<void> {
  return mountConverter(shell, { op: 'xmlToJson', sample: XML_TO_JSON_SAMPLE });
}
