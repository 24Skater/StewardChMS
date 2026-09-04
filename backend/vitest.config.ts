import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    globalSetup: ['src/testing/global-setup.ts'],
    setupFiles: ['src/testing/setup.ts'],
    // These are integration tests against one shared database, and running the
    // files in parallel makes them lie to each other. The provisioning suite
    // creates a second organization for a few hundred milliseconds; a
    // self-hosted install resolves its organization by there being exactly one,
    // so during that window every other suite's requests resolve to none and
    // fail for a reason that has nothing to do with what they were testing.
    //
    // The honest fix is one at a time. It costs a few seconds and removes a
    // whole class of failure that only ever appears in CI.
    fileParallelism: false,
  },
})

