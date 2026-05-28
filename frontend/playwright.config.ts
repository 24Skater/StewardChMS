import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '../e2e',
  timeout: 30_000,
  globalSetup: './global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 900 },
    headless: true,
    storageState: 'e2e/.auth/admin.json',
  },
  snapshotDir: '../e2e/screenshots',
  webServer: {
    command: 'npm run dev:frontend',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
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
  ],
})
