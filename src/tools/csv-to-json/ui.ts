import { mountConverter } from '../shared/mount-converter';
import { CSV_TO_JSON_SAMPLE } from '../shared/converter-samples';

export function mount(shell: HTMLElement): Promise<void> {
  return mountConverter(shell, { op: 'csvToJson', sample: CSV_TO_JSON_SAMPLE });
}
