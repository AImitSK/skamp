import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Konfiguration für E2E-Tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test-Verzeichnis
  testDir: './e2e',

  // Test-Matching Pattern
  testMatch: '**/*.spec.ts',

  // Vollständig parallele Ausführung
  fullyParallel: true,

  // Fail bei CI wenn Tests als .only markiert sind
  forbidOnly: !!process.env.CI,

  // Retry nur in CI
  retries: process.env.CI ? 2 : 0,

  // Worker-Threads (parallel)
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html'],
    ['list']
  ],

  // Shared settings für alle Projekte
  use: {
    // Base URL für Navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Screenshots bei Failures
    screenshot: 'only-on-failure',

    // Videos bei Failures
    video: 'retain-on-failure',

    // Trace bei ersten Retry
    trace: 'on-first-retry',
  },

  // Projekte (Browser-Konfigurationen)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Optionale weitere Browser (aktuell deaktiviert)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Webserver starten vor Tests (optional)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 Minuten
  },
});
