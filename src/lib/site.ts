import { localePath } from './paths';
import type { Locale } from '../i18n/config';

/** Canonical host for every absolute URL in metadata, JSON-LD, and the sitemap. */
export const SITE_URL = 'https://jsonbits.com';

export const SITE_NAME = 'JSON Bits';

/** Absolute URL for a locale-less path such as `/json-formatter`. */
export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;

  return normalized === '/' ? `${SITE_URL}/` : `${SITE_URL}${normalized}`;
}

/** Absolute URL for a path inside a locale, e.g. `/es/json-formatter`. */
export function localeUrl(locale: Locale, path = '/'): string {
  return absoluteUrl(localePath(locale, path));
}
