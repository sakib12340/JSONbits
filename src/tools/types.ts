export const toolCategories = [
  'format',
  'validate',
  'view',
  'convert',
  'compare',
  'generate',
] as const;

export type ToolCategory = (typeof toolCategories)[number];

export type LazyLibrary = 'yaml' | 'fast-xml-parser' | 'papaparse' | 'jsonc-parser';

/**
 * Selects the interactive surface rendered by ToolLayout.
 * `pending` tools are listed on the home page but are not routable yet.
 */
export type ToolUi =
  | 'formatter'
  | 'minifier'
  | 'repair'
  | 'validator'
  | 'viewer'
  | 'diff'
  | 'pending';

export interface ToolDef {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  workerOp: string;
  ui: ToolUi;
  /** Compact monospace glyph shown on cards, e.g. "{ }" or "CSV". */
  icon: string;
  keywords: readonly string[];
  relatedIds: readonly string[];
  lazyLibs: readonly LazyLibrary[];
  schemaType: 'WebApplication';
  /** Set to true only when the tool page is implemented and routable. */
  available: boolean;
}
