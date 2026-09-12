import { defineConfig } from '@playwright/test';

// NOTE: this config was written and syntax-checked in an environment without internet
// access to download browser binaries, so it has not been run end-to-end locally - it will
// get its first real run in the "web-e2e" GitHub Actions job. If anything needs tweaking
// (selectors, timing), check that job's Playwright HTML report artifact first.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5183',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm --prefix apps/web run dev -- --port 5183 --strictPort',
    url: 'http://localhost:5183',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
