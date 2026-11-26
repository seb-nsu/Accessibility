import { defineConfig, devices } from '@playwright/test';
import { config } from './a11y.config';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  // GitHub-Runner haben 4 Kerne; jede Seite ist ein eigener Test
  workers: process.env.CI ? 4 : undefined,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './tests/helpers/global-setup.ts',
  // ARIA-Snapshots je Zielsystem getrennt ablegen (Host ohne Port-Doppelpunkt)
  snapshotPathTemplate: `{testDir}/__snapshots__/${new URL(config.baseURL).host.replace(':', '_')}/{arg}{ext}`,
  use: {
    baseURL: config.baseURL,
    locale: 'de-DE',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Mobil (Touch, schmaler Viewport): axe-Regeln wie Zielgröße 2.5.8 greifen hier anders
    { name: 'mobil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: config.demo
    ? {
        command: 'node scripts/serve-demo.mjs',
        url: config.baseURL,
        reuseExistingServer: true,
      }
    : undefined,
});
