import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

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
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          es: 'es',
          fr: 'fr',
          de: 'de',
          pt: 'pt',
        },
      },
      serialize(item) {
        const english = item.links?.find((link) => link.lang === 'en');
        const hasDefault = item.links?.some((link) => link.lang === 'x-default');

        if (english && !hasDefault) {
          item.links = [
            ...(item.links ?? []),
            { lang: 'x-default', url: english.url },
          ];
        }

        return item;
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
