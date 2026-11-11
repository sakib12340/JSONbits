import { locales, type Locale } from './config';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';

export type TranslationKey = keyof typeof en;

type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = { en, es, fr, de, pt };

const missing = locales
  .map((locale) => ({
    locale,
    count: Object.keys(en).filter((key) => !(key in dictionaries[locale])).length,
  }))
  .filter((entry) => entry.count > 0);

if (missing.length > 0) {
  console.warn(
    `[i18n] Falling back to English for: ${missing
      .map((entry) => `${entry.locale} (${entry.count} keys)`)
      .join(', ')}`,
  );
}

export function t(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const template = dictionaries[locale][key] ?? en[key];

  if (!template) {
    console.warn(`[i18n] Missing key "${key}" for locale "${locale}"`);
    return key;
  }

  if (!vars) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}
