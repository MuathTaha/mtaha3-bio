import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    setupFiles: ['tests/unit/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@sanity/ui': path.resolve(__dirname, 'node_modules/sanity/node_modules/@sanity/ui/dist/index.js'),
    },
  },
});
