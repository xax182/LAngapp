import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// W środowisku z gotowym Chromium (np. kontener) używamy go; inaczej Playwright bierze swój.
const preinstalled = '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/',
    launchOptions: {
      ...(existsSync(preinstalled) && !process.env.CI ? { executablePath: preinstalled } : {}),
      // Sztuczny mikrofon: pozwala przetestować nagrywanie bez człowieka.
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
    },
    permissions: ['microphone'],
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
