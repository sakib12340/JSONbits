import { JSON_ARRAY_SAMPLE } from '../ndjson/samples';
import { mountNdjson } from '../ndjson/mount';

export function mount(shell: HTMLElement): Promise<void> {
  return mountNdjson(shell, { op: 'jsonToNdjson', sample: JSON_ARRAY_SAMPLE });
}
