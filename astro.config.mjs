import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { localizeSitemapItem } from './scripts/sitemap-routes.mjs';

export default defineConfig({
  site: 'https://jsonbits.com',
  output: 'static',
  trailingSlash: 'never',
  i18n: {
    locales: ['en', 'es', 'fr', 'de', 'pt'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      serialize(item) {
        return localizeSitemapItem(item);
      },
    }),
  ],
  build: {
    inlineStylesheets: 'never',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      assetsInlineLimit: 0,
    },
  },
});
