import type { Locale } from './config';
import type { ToolDef } from '../tools/types';
import { t, type TranslationKey } from './t';

/**
 * Tool names stay as product names in every locale, but their one-line
 * descriptions are translated. Registry keywords remain the search fallback.
 */
export function toolDescription(locale: Locale, tool: ToolDef): string {
  return t(locale, `tool.${tool.id}.description` as TranslationKey);
}
