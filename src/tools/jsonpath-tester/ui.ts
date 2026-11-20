import { mountPane } from '../shared/mount-pane';
import {
  JSONPATH_SAMPLE,
  JSONPATH_SAMPLE_EXPRESSION,
} from '../shared/pane-samples';

export function mount(shell: HTMLElement): Promise<void> {
  return mountPane(shell, {
    op: 'jsonpath',
    sample: JSONPATH_SAMPLE,
    sampleExpression: JSONPATH_SAMPLE_EXPRESSION,
  });
}
