import { defineConfig, devices } from '@playwright/test';

// P24 — Playwright config for the reduced-scope build. Chromium only; WebKit
// is deliberately skipped per the P24 brief's optionality clause. Vitest unit
// tests cover module contracts; these specs cover what a player actually sees.
//
// The config auto-starts the Vite dev server via `webServer`; locally we
// reuse an already-running instance so `npm run e2e` can be fired alongside
// an active dev session.

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
