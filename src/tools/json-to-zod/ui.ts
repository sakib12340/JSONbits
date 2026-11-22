import { mountPane } from '../shared/mount-pane';

const SAMPLE = JSON.stringify(
  {
    id: 7,
    email: 'ada@example.com',
    website: 'https://example.com',
    tags: ['admin', 'editor'],
    profile: { name: 'Ada', active: true, nickname: null },
  },
  null,
  2,
);

export function mount(shell: HTMLElement): Promise<void> {
  return mountPane(shell, { op: 'jsonToZod', sample: SAMPLE });
}
