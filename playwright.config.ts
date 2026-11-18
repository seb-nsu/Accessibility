import { defineConfig, devices } from '@playwright/test';
import { config } from './a11y.config';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './tests/helpers/global-setup.ts',
  // ARIA-Snapshots je Zielsystem getrennt ablegen (Host ohne Port-Doppelpunkt)
  snapshotPathTemplate: `{testDir}/__snapshots__/${new URL(config.baseURL).host.replace(':', '_')}/{arg}{ext}`,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: config.baseURL,
    locale: 'de-DE',
    reducedMotion: 'reduce',
  },
  webServer: config.demo
    ? {
        command: 'node scripts/serve-demo.mjs',
        url: config.baseURL,
        reuseExistingServer: true,
      }
    : undefined,
});
