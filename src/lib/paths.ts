import { defaultLocale, locales, type Locale } from '../i18n/config';

const localeCodes = new Set<string>(locales);

export function stripLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length > 0 && localeCodes.has(segments[0])) {
    segments.shift();
  }

  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

export function localePath(locale: Locale, path = '/'): string {
  const normalized = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;

  if (locale === defaultLocale) {
    return normalized || '/';
  }

  return `/${locale}${normalized}`;
}

export function switchLocalePath(pathname: string, locale: Locale): string {
  return localePath(locale, stripLocale(pathname));
}
