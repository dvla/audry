import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['junit', 'default'],
    outputFile: {
      junit: './test/junit-report.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'cobertura', 'html'],
      include: ['src/**/*.{js,ts}'],
      exclude: [
        ...configDefaults.exclude,
        'lib/',
        'src/adaptiveCards/*',
        'src/**/*.{test,spec}.{js,ts}',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
      ],
    },

    setupFiles: ['./vitest.setup.ts'],
  },
})
