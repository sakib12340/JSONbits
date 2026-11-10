import type { BaseStrings } from '../shared/strings';

export interface DiffStrings extends BaseStrings {
  comparing: string;
  left: string;
  right: string;
  changes: string;
  ignoreArrayOrder: string;
  added: string;
  removed: string;
  changed: string;
  all: string;
  filter: string;
  same: string;
  empty: string;
  none: string;
  truncated: string;
  copyPath: string;
  tooLarge: string;
  leftPlaceholder: string;
  rightPlaceholder: string;
  leftLabel: string;
  rightLabel: string;
  found: string;
  needBoth: string;
}
