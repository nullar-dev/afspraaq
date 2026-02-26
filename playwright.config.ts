import { defineConfig, devices } from '@playwright/test';

const config = defineConfig({
  // Test directory - can be overridden with TEST_E2E_DIR env var
  testDir: process.env.TEST_E2E_DIR || './src/__tests__/e2e',

  // Run tests in parallel
  fullyParallel: process.env.PLAYWRIGHT_PARALLEL !== 'false',

  // Fail tests on .only in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI
  retries:
    parseInt(process.env.PLAYWRIGHT_RETRIES || (process.env.CI ? '2' : '0'), 10) ||
    (process.env.CI ? 2 : 0),

  // Limit workers in CI
  workers: process.env.CI ? parseInt(process.env.PLAYWRIGHT_WORKERS || '1', 10) || 1 : undefined,

  // Reporter
  reporter: process.env.PLAYWRIGHT_REPORTER || 'list',

  // Base settings
  use: {
    // Base URL for tests
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',

    // Trace settings
    trace: process.env.PLAYWRIGHT_TRACE || 'on-first-retry',

    // Collect screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Projects (browsers to test)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add more browsers if needed
    ...(process.env.PLAYWRIGHT_TEST_FIREFOX === 'true'
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
        ]
      : []),
    ...(process.env.PLAYWRIGHT_TEST_WEBKIT === 'true'
      ? [
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],

  // Web server configuration
  webServer: {
    // Command to start the production server (build first, then start)
    command: process.env.E2E_START_COMMAND || 'pnpm run build && pnpm run start',

    // URL to check
    url: process.env.E2E_BASE_URL || 'http://localhost:3000',

    // Reuse existing server (useful for local production testing)
    reuseExistingServer: process.env.E2E_REUSE_SERVER !== 'false' && !process.env.CI,

    // Timeout (5 minutes to account for build + test)
    timeout: parseInt(process.env.E2E_TIMEOUT_MS || '300000', 10) || 300000,
  },
});

export default config;
