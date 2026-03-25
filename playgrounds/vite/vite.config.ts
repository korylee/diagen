import path from 'node:path';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@diagen/core': path.resolve(__dirname, '../../packages/core/src'),
      '@diagen/icons': path.resolve(__dirname, '../../packages/icons/src'),
      '@diagen/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@diagen/primitives': path.resolve(__dirname, '../../packages/primitives/src'),
      '@diagen/renderer': path.resolve(__dirname, '../../packages/renderer/src'),
      '@diagen/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@diagen/components': path.resolve(__dirname, '../../packages/components/src'),
    },
  },
})
