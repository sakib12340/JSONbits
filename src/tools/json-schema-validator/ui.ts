import { mountSchema } from '../shared/mount-schema';

export function mount(shell: HTMLElement): Promise<void> {
  return mountSchema(shell);
}
