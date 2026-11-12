import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { locales } from './i18n/config';
import { toolCategories } from './tools/types';

const locale = z.enum(locales);

// 140–155 characters keeps meta descriptions inside the range search engines
// display without truncation.
const metaDescription = z.string().min(140).max(155);

const faqEntry = z.object({
  q: z.string().min(8),
  a: z.string().min(40),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tools' }),
  schema: z.object({
    locale,
    toolId: z.string(),
    title: z.string(),
    description: metaDescription,
    summary: z.string().min(80),
    steps: z.array(z.string().min(20)).length(3),
    example: z.object({
      caption: z.string(),
      input: z.string(),
      output: z.string(),
    }),
    mistakes: z.array(z.string().min(30)).min(2).max(5),
    faq: z.array(faqEntry).min(4).max(6),
    related: z.array(z.string()).optional(),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    locale,
    slug: z.string().min(3),
    title: z.string(),
    description: metaDescription,
    updated: z.coerce.date(),
    toolIds: z.array(z.string()).min(1),
    faq: z.array(faqEntry).min(0).max(6).optional(),
  }),
});

const hubs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/hubs' }),
  schema: z.object({
    locale,
    category: z.enum(toolCategories),
    description: metaDescription,
    faq: z.array(faqEntry).min(2).max(4),
  }),
});

export const collections = { tools, guides, hubs };
