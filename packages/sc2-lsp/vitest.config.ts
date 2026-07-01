import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        include: ['tests/**/*.ts'],
        exclude: ['tests/helpers.ts'],
        testTimeout: 0,
        env: { PLAXTONY_DEBUG: '1', PLAXTONY_LOG_LEVEL: 'warn' },
    },
})
