import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    globalSetup: ['src/testing/global-setup.ts'],
    setupFiles: ['src/testing/setup.ts'],
  },
})

