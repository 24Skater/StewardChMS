import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '../e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 900 },
    headless: true,
  },
  snapshotDir: '../e2e/screenshots',
})
