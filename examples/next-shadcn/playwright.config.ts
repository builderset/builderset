import { defineConfig, devices } from '@playwright/test';

/**
 * The browser tests run against the built example (`next start`). Locally,
 * PW_CHROMIUM_PATH can point at a Chromium already on the machine; CI installs
 * Playwright's own browsers.
 */
const chromium = process.env.PW_CHROMIUM_PATH
  ? {
      ...devices['Desktop Chrome'],
      launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH },
    }
  : devices['Desktop Chrome'];

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:5299', viewport: { width: 1440, height: 900 } },
  webServer: {
    command: 'npm run start -- -H 127.0.0.1',
    url: 'http://127.0.0.1:5299',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: chromium },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
});
