import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],

    // Keep `npm test` focused on unit + integration tests.
    // Playwright specs live under `e2e/` and are run via `npm run test:e2e:*`.
    // Also exclude legacy test scaffolding that targets modules not present in the repo.
    include: [
      '__tests__/unit/components/**/*.test.tsx',
      '__tests__/unit/utils/portfolioUtils.test.ts',
      '__tests__/unit/utils/inventoryReference.test.ts',
      '__tests__/integration/**/*.test.ts',
    ],

    exclude: ['node_modules/**', 'e2e/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.*',
        '.next/',
        'coverage/',
        'app/**',
        'middleware.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})

