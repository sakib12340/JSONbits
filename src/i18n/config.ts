export const locales = ['en', 'es', 'fr', 'de', 'pt'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleMeta {
  label: string;
  lang: string;
  dir: TextDirection;
}

export const localeMeta = {
  en: { label: 'English', lang: 'en', dir: 'ltr' },
  es: { label: 'Español', lang: 'es', dir: 'ltr' },
  fr: { label: 'Français', lang: 'fr', dir: 'ltr' },
  de: { label: 'Deutsch', lang: 'de', dir: 'ltr' },
  pt: { label: 'Português', lang: 'pt', dir: 'ltr' },
} as const satisfies Record<Locale, LocaleMeta>;
