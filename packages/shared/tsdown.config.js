import { defineConfig } from 'tsdown'

export default defineConfig(() => {
  const configs = []
  const baseConfig = {
    entry: ['./src/index.ts'],
    target: 'es2015',
    platform: 'browser',
  }
  const formats = ['cjs', 'esm']
  formats.forEach(format => {
    const config = {
      ...baseConfig,
      format,
      dts: format === 'cjs',
    }
    configs.push(config)
    configs.push({
      ...config,
      dts: false,
      minify: true,
      outExtensions: context => ({
        js: `.min.${context.format === 'es' ? 'mjs' : 'js'}`,
      }),
    })
  })

  return configs
})
