import { defineConfig } from 'vitest/config'
import path, { resolve } from 'node:path'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid({ hot: !process.env.VITEST })],
  resolve: {
    alias: {
      '@diagen/core': path.resolve(import.meta.dirname, 'packages/core/src'),
      '@diagen/shared': path.resolve(import.meta.dirname, 'packages/shared/src'),
      '@diagen/primitives': path.resolve(import.meta.dirname, 'packages/primitives/src'),
      '@diagen/renderer': path.resolve(import.meta.dirname, 'packages/renderer/src'),
      '@diagen/components': path.resolve(import.meta.dirname, 'packages/components/src'),
      '@diagen/ui': path.resolve(import.meta.dirname, 'packages/ui/src'),
    },
    dedupe: ['solid-js'],
  },
  cacheDir: resolve(import.meta.dirname, 'node_modules/.vite'),
  test: {
    reporters: 'dot',
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      include: ['packages/**/*.ts'],
      exclude: ['**/.test/**', '**/dist/**', '**/types.ts', '**/*.config.ts'],
    },
    projects: [
      'packages/*/vitest.config.ts',
      {
        extends: './vitest.config.ts',
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['packages/**/*.{test,spec}.ts', 'test/*.{test,spec}.ts'],
          exclude: ['packages/**/*.{browser,server}.{test,spec}.ts'],
          server: {
            deps: {
              inline: ['solid-js'],
            },
          },
        },
      },
    ],
  },
})
