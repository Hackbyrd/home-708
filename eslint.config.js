import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'legacy/**', 'src/**', 'data/**', 'tmp/**', 'docs/*-assets/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: Object.fromEntries(['Buffer', 'console', 'process', 'structuredClone', 'fetch', 'URL'].map(name => [name, 'readonly'])),
    },
  },
  {
    files: ['scripts/design-library/*.js'],
    languageOptions: {
      globals: Object.fromEntries(['document', 'window', 'location', 'history', 'localStorage', 'URL', 'Blob', 'Option', 'setTimeout'].map(name => [name, 'readonly'])),
    },
  },
  {
    files: ['scripts/validate-*.mjs'],
    // These names are used inside Playwright page.evaluate callbacks.
    languageOptions: { globals: { document: 'readonly', innerWidth: 'readonly' } },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
  prettier,
);
