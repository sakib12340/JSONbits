import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLocale, type Locale } from '../i18n/config';
import type { ToolCategory } from '../tools/types';

export type ToolCopy = CollectionEntry<'tools'>;
export type GuideCopy = CollectionEntry<'guides'>;
export type HubCopy = CollectionEntry<'hubs'>;

/** Prefer the requested locale, then fall back to English until Phase 7. */
function pickLocalized<T extends { data: { locale: Locale } }>(
  entries: T[],
  locale: Locale,
): T | undefined {
  return (
    entries.find((entry) => entry.data.locale === locale) ??
    entries.find((entry) => entry.data.locale === defaultLocale)
  );
}

export async function getToolCopy(locale: Locale, toolId: string): Promise<ToolCopy> {
  const entries = await getCollection('tools', (entry) => entry.data.toolId === toolId);
  const copy = pickLocalized(entries, locale);

  if (!copy) throw new Error(`Missing content for tool "${toolId}"`);
  return copy;
}

export async function getHubCopy(locale: Locale, category: ToolCategory): Promise<HubCopy> {
  const entries = await getCollection('hubs', (entry) => entry.data.category === category);
  const copy = pickLocalized(entries, locale);

  if (!copy) throw new Error(`Missing hub content for "${category}"`);
  return copy;
}

export async function getGuideCopy(locale: Locale, slug: string): Promise<GuideCopy> {
  const entries = await getCollection('guides', (entry) => entry.data.slug === slug);
  const copy = pickLocalized(entries, locale);

  if (!copy) throw new Error(`Missing guide "${slug}"`);
  return copy;
}

/** Every guide once, localized where a translation exists. */
export async function listGuides(locale: Locale): Promise<GuideCopy[]> {
  const entries = await getCollection('guides');
  const bySlug = new Map<string, GuideCopy>();

  for (const entry of entries) {
    if (entry.data.locale === defaultLocale) bySlug.set(entry.data.slug, entry);
  }

  for (const entry of entries) {
    if (entry.data.locale === locale) bySlug.set(entry.data.slug, entry);
  }

  return [...bySlug.values()].sort((a, b) => a.data.title.localeCompare(b.data.title));
}
