// @ts-check
const eslint = require('@eslint/js')
const tseslint = require('typescript-eslint')
const prettierConfig = require('eslint-config-prettier')
const prettierPlugin = require('eslint-plugin-prettier')
const vitestPlugin = require('@vitest/eslint-plugin')
const importPlugin = require('eslint-plugin-import')

module.exports = [
  // Global ignores - replaces .eslintignore
  {
    ignores: [
      // Config files
      'eslint.config.js',
      '.eslintrc.js',
      '.prettierrc.js',
      'jest.config.js',
      'jest-unit.config.js',
      'jest-integration.config.js',
      'webpack.config.js',
      'prettierrc.js',

      // Build and config directories
      'coverage/**',
      'coverage-unit/**',
      'coverage-integration/**',
      'deploy-config/**',
      'lib/**',
      'node_modules/**',
      'target/**',
      'test/**',
      'functional-tests/vendor/**',
      'scripts/**',
    ],
  },

  // Recommended configs
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,

  // Base config for all files
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
      globals: {
        // Node.js environment (no browser)
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
        node: {
          extensions: ['.js', '.ts'],
          moduleDirectory: ['node_modules', 'src/'],
          paths: ['node_modules/', 'src', 'node_modules/@types', '.'],
        },
      },
    },
    plugins: {
      prettier: prettierPlugin,
      import: importPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-fallthrough': 'warn',
    },
  },

  // Vitest-specific config for test files
  {
    files: ['**/*.test.{js,ts}', '**/__tests__/**/*.{js,ts}'],
    plugins: {
      prettier: prettierPlugin,
      vitest: vitestPlugin,
      import: importPlugin,
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      'prettier/prettier': 'error',
    },
  },
]
