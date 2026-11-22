import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const content = join(root, 'src', 'content');
const locales = ['en', 'es', 'fr', 'de', 'pt'];
const defaultLocale = 'en';

function readSlugs(collection) {
  return new Set(
    readdirSync(join(content, collection, defaultLocale))
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.slice(0, -3)),
  );
}

const toolSlugs = readSlugs('tools');
const hubSlugs = readSlugs('hubs');
const guideSlugs = readSlugs('guides');

const collectionByKind = {
  tool: 'tools',
  hub: 'hubs',
  guide: 'guides',
};

function hasCopy(kind, locale, slug) {
  const collection = collectionByKind[kind];
  return Boolean(collection && existsSync(join(content, collection, locale, `${slug}.md`)));
}

function splitPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const locale = locales.includes(parts[0]) ? parts.shift() : defaultLocale;
  const rest = parts.join('/');

  let kind = 'other';
  let slug = rest;
  if (!rest) kind = 'home';
  else if (rest === 'learn') kind = 'learn';
  else if (rest === 'privacy') kind = 'privacy';
  else if (rest.startsWith('learn/')) {
    kind = 'guide';
    slug = rest.slice('learn/'.length);
  } else if (hubSlugs.has(rest)) kind = 'hub';
  else if (toolSlugs.has(rest)) kind = 'tool';

  return { locale, kind, slug, rest };
}

function translatedLocales(kind, slug) {
  if (kind !== 'tool' && kind !== 'hub' && kind !== 'guide') return locales;
  return locales.filter((locale) => hasCopy(kind, locale, slug));
}

function localizedPath(locale, rest) {
  if (!rest) return locale === defaultLocale ? '/' : `/${locale}`;
  return locale === defaultLocale ? `/${rest}` : `/${locale}/${rest}`;
}

/** Rewrite a sitemap entry so hreflang covers only genuine translations; drop fallback pages. */
export function localizeSitemapItem(item) {
  const { origin } = new URL(item.url);
  const { locale, kind, slug, rest } = splitPath(new URL(item.url).pathname);
  const translated = translatedLocales(kind, slug);

  if (locale !== defaultLocale && !translated.includes(locale)) {
    return undefined;
  }

  item.links = translated.map((entry) => ({
    lang: entry,
    url: `${origin}${localizedPath(entry, rest)}`,
  }));
  item.links.push({
    lang: 'x-default',
    url: `${origin}${localizedPath(defaultLocale, rest)}`,
  });
  return item;
}