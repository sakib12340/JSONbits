import { NDJSON_SAMPLE } from '../ndjson/samples';
import { mountNdjson } from '../ndjson/mount';

export function mount(shell: HTMLElement): Promise<void> {
  return mountNdjson(shell, { op: 'ndjsonValidate', sample: NDJSON_SAMPLE });
}
