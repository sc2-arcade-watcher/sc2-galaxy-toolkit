import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        include: ['test/**/*.test.ts'],
        testTimeout: 20000,
        globalSetup: ['test/bootstrap.ts'],
        setupFiles: ['test/setup.ts'],
    },
})
