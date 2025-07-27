import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  prettier,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: await import('@typescript-eslint/parser'),
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // Prefer arrow functions
      'prefer-arrow-callback': 'error',

      // Immutability preferences
      'prefer-const': 'error',
      'no-var': 'error',

      // Code quality
      'no-console': 'off', // Allow console for server logging
      eqeqeq: 'error',
      curly: 'error',

      // Interface parameters shouldn't trigger unused-vars
      'no-unused-vars': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.js'],
  },
];
