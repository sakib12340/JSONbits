import type { BaseStrings } from '../shared/strings';

export interface ToolStrings extends BaseStrings {}

export function readToolStrings(shell: HTMLElement): ToolStrings {
  try {
    return JSON.parse(shell.dataset.strings ?? '{}') as ToolStrings;
  } catch {
    return {} as ToolStrings;
  }
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
