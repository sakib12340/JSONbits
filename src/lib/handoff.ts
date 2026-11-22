import { defaultLocale } from '../i18n/config';

const HANDOFF_KEY = 'jsonbits:handoff';
const SCHEMA_HANDOFF_KEY = 'jsonbits:schema-handoff';
const MAX_HANDOFF_CHARS = 1_000_000;

interface HandoffPayload {
  slug: string;
  text: string;
}

export interface SendOptions {
  shell: HTMLElement;
  locale: string;
  /** The JSON that should travel to the next tool. */
  getText: () => string;
  onError: (message: string) => void;
  emptyMessage: string;
  tooLargeMessage: string;
  /** Only answer menus from this side; omitted means any menu. */
  side?: 'input' | 'output';
}

/** Stores the JSON for the next tool page. Nothing leaves the browser. */
export function writeHandoff(slug: string, text: string): boolean {
  if (text.length > MAX_HANDOFF_CHARS) return false;

  try {
    const payload: HandoffPayload = { slug, text };
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/** Returns the pending JSON when it was addressed to this tool, then clears it. */
export function takeHandoff(slug: string): string | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;

    sessionStorage.removeItem(HANDOFF_KEY);

    const payload = JSON.parse(raw) as HandoffPayload;
    if (payload.slug !== slug || typeof payload.text !== 'string') return null;
    return payload.text;
  } catch {
    return null;
  }
}

/** Sends an inferred schema and the sample document to the schema validator. */
export function writeSchemaHandoff(schema: string, document: string): boolean {
  if (schema.length + document.length > MAX_HANDOFF_CHARS) return false;
  try {
    sessionStorage.setItem(
      SCHEMA_HANDOFF_KEY,
      JSON.stringify({ schema, document } satisfies SchemaHandoff),
    );
    sessionStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({ slug: 'json-schema-validator', text: document } satisfies HandoffPayload),
    );
    return true;
  } catch {
    return false;
  }
}

interface SchemaHandoff {
  schema: string;
  document: string;
}

/** Reads the schema handoff once, then clears it. */
export function takeSchemaHandoff(): SchemaHandoff | null {
  try {
    const raw = sessionStorage.getItem(SCHEMA_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SCHEMA_HANDOFF_KEY);
    const payload = JSON.parse(raw) as SchemaHandoff;
    if (typeof payload.schema !== 'string' || typeof payload.document !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}

/** Target URL of a tool page in the current locale. */
export function toolUrl(locale: string, slug: string): string {
  return locale === defaultLocale ? `/${slug}` : `/${locale}/${slug}`;
}

/** Wires the "Send to…" menu of a tool page to its own JSON. */
export function setupSend(options: SendOptions): void {
  options.shell.addEventListener('jsonbits:send', (event) => {
    const detail = (event as CustomEvent<{ tool?: string; side?: string }>).detail;
    const slug = detail?.tool;
    if (!slug) return;
    if (options.side && detail?.side !== options.side) return;

    const text = options.getText();

    if (text.trim().length === 0) {
      options.onError(options.emptyMessage);
      return;
    }

    if (!writeHandoff(slug, text)) {
      options.onError(options.tooLargeMessage);
      return;
    }

    window.location.href = toolUrl(options.locale, slug);
  });
}
