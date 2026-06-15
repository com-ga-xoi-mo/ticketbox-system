import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    environment: 'node',
    include: ['apps/**/*.spec.ts', 'packages/**/*.spec.ts', 'test/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
  },
});
