import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['packages/scene/tests/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['legacy/**', 'src/**', 'data/**'],
    },
  },
});
