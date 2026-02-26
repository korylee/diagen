import path from 'node:path';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@diagen/core': path.resolve(__dirname, '../../packages/core/src'),
      '@diagen/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@diagen/renderer': path.resolve(__dirname, '../../packages/renderer/src'),
    }
  },
});
