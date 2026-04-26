import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E test configuration
 *
 * Default usage:
 *   npx playwright test                # full suite
 *   npm run test:e2e:smoke             # production-readiness smoke only
 *
 * Targeting a remote URL (e.g. a Netlify deploy preview):
 *   PLAYWRIGHT_TEST_BASE_URL=https://deploy-preview-123--site.netlify.app \
 *     npm run test:e2e:smoke
 *
 * When PLAYWRIGHT_TEST_BASE_URL is set, the local webServer is skipped and
 * tests run against that URL.
 */

const remoteBaseURL = process.env.PLAYWRIGHT_TEST_BASE_URL?.trim()
const baseURL = remoteBaseURL && remoteBaseURL.length > 0 ? remoteBaseURL : 'http://localhost:3000'
const useRemoteTarget = baseURL !== 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: useRemoteTarget
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      },
})

