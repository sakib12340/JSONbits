import { SITE_NAME, SITE_URL } from './site';

interface FaqEntry {
  q: string;
  a: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

const organization = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
};

export function webApplicationSchema(input: {
  name: string;
  description: string;
  url: string;
  features: readonly string[];
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: input.name,
    description: input.description,
    url: input.url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript and a modern browser.',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: input.features,
    provider: organization,
  };
}

export function faqSchema(entries: readonly FaqEntry[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.a,
      },
    })),
  };
}

export function breadcrumbSchema(items: readonly BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function webSiteSchema(locale: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: locale,
    description:
      'Fast, private JSON tools that run entirely in your browser. Format, validate, convert, and compare JSON without uploading it.',
    publisher: organization,
  };
}

export function collectionPageSchema(input: {
  name: string;
  description: string;
  url: string;
  items: { name: string; url: string }[];
  locale: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.locale,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: input.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: item.url,
      })),
    },
  };
}

export function articleSchema(input: {
  headline: string;
  description: string;
  url: string;
  dateModified: string;
  locale: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: input.headline,
    description: input.description,
    url: input.url,
    dateModified: input.dateModified,
    inLanguage: input.locale,
    author: organization,
    publisher: organization,
    isAccessibleForFree: true,
  };
}
