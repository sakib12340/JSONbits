import type { ToolCategory } from '../tools/types';
import type { TranslationKey } from '../i18n/t';

export interface CategoryHubDef {
  category: ToolCategory;
  /** Final English slug, used in every locale: `/converters`, `/es/converters`. */
  slug: string;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  headingKey: TranslationKey;
  metaTitleKey: TranslationKey;
}

export const categoryHubs: readonly CategoryHubDef[] = [
  {
    category: 'format',
    slug: 'formatters',
    nameKey: 'category.format',
    descriptionKey: 'category.format.description',
    headingKey: 'hub.formatters.heading',
    metaTitleKey: 'hub.formatters.metaTitle',
  },
  {
    category: 'validate',
    slug: 'validators',
    nameKey: 'category.validate',
    descriptionKey: 'category.validate.description',
    headingKey: 'hub.validators.heading',
    metaTitleKey: 'hub.validators.metaTitle',
  },
  {
    category: 'view',
    slug: 'viewers',
    nameKey: 'category.view',
    descriptionKey: 'category.view.description',
    headingKey: 'hub.viewers.heading',
    metaTitleKey: 'hub.viewers.metaTitle',
  },
  {
    category: 'convert',
    slug: 'converters',
    nameKey: 'category.convert',
    descriptionKey: 'category.convert.description',
    headingKey: 'hub.converters.heading',
    metaTitleKey: 'hub.converters.metaTitle',
  },
  {
    category: 'compare',
    slug: 'comparisons',
    nameKey: 'category.compare',
    descriptionKey: 'category.compare.description',
    headingKey: 'hub.comparisons.heading',
    metaTitleKey: 'hub.comparisons.metaTitle',
  },
  {
    category: 'generate',
    slug: 'generators',
    nameKey: 'category.generate',
    descriptionKey: 'category.generate.description',
    headingKey: 'hub.generators.heading',
    metaTitleKey: 'hub.generators.metaTitle',
  },
];

export function hubBySlug(slug: string): CategoryHubDef | undefined {
  return categoryHubs.find((hub) => hub.slug === slug);
}

export function hubByCategory(category: ToolCategory): CategoryHubDef {
  const hub = categoryHubs.find((entry) => entry.category === category);

  if (!hub) throw new Error(`No category hub for "${category}"`);
  return hub;
}
