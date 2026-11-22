import { mountPane } from '../shared/mount-pane';

const SAMPLE = JSON.stringify(
  {
    title: 'Team',
    count: 2,
    active: true,
    owner: { email: 'ada@example.com', id: '123e4567-e89b-42d3-a456-426614174000' },
    users: [
      { name: 'Ada', role: 'admin', joined: '2024-01-15', score: 9.5 },
      { name: 'Grace', role: 'editor', score: 8 },
    ],
  },
  null,
  2,
);

export function mount(shell: HTMLElement): Promise<void> {
  return mountPane(shell, { op: 'jsonToJsonSchema', sample: SAMPLE });
}
