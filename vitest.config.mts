import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { fileURLToPath } from 'node:url';

const backendEntry = fileURLToPath(new URL('./packages/backend/src/index.ts', import.meta.url));
const backendSrc = fileURLToPath(new URL('./packages/backend/src', import.meta.url));

export default defineConfig({
  plugins: [swc.vite()],
  resolve: {
    alias: [
      { find: '@ticketbox/backend', replacement: backendEntry },
      { find: /^@ticketbox\/backend\/(.*)$/, replacement: `${backendSrc}/$1` },
    ],
  },
  test: {
    environment: 'node',
    hookTimeout: 60_000,
    include: [
      'apps/**/*.spec.ts',
      'packages/**/*.spec.ts',
      'test/**/*.spec.ts',
      'test/**/*.e2e-spec.ts',
    ],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
  },
});
