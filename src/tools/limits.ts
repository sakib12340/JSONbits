/** Shared size tiers for the tool UI and the server-rendered shell. */
export const LIVE_LIMIT = 1_000_000;
export const PREVIEW_LIMIT = 4 * 1024 * 1024;
export const MAX_FILE = 100 * 1024 * 1024;
export const FALLBACK_LIMIT = 2_000_000;

/** Maximum serialized size for copying a single tree node. */
export const TREE_VALUE_LIMIT = 1_000_000;
