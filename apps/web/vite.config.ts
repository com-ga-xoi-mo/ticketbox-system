import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ticketbox/api-types': path.resolve(__dirname, '../../packages/api-types/src/index.ts'),
    },
  },
});
