import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// base './' = działa pod dowolnym adresem (np. GitHub Pages: uzytkownik.github.io/poliglota/).
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Poliglota – nauka mówienia',
        short_name: 'Poliglota',
        lang: 'pl',
        start_url: './',
        display: 'standalone',
        background_color: '#f6f5f1',
        theme_color: '#2f5bd3',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
      },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
