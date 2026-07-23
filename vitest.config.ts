import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    environment: 'node'
  },
  resolve: {
    alias: {
      '@codedoctor/shared': new URL('./packages/shared/src/index.ts', import.meta.url).pathname,
      '@codedoctor/detectors': new URL('./packages/detectors/src/index.ts', import.meta.url).pathname,
      '@codedoctor/analyzers': new URL('./packages/analyzers/src/index.ts', import.meta.url).pathname,
      '@codedoctor/core': new URL('./packages/core/src/index.ts', import.meta.url).pathname,
      '@codedoctor/scoring': new URL('./packages/scoring/src/index.ts', import.meta.url).pathname,
      '@codedoctor/report': new URL('./packages/report/src/index.ts', import.meta.url).pathname,
      '@codedoctor/ai': new URL('./packages/ai/src/index.ts', import.meta.url).pathname
    }
  }
});
