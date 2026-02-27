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
    const isEs = format === 'esm'
    const ext = isEs ? 'mjs' : 'js'
    const config = {
      ...baseConfig,
      format,
      dts: !isEs,
      outExtensions: () => ({
        js: `.${ext}`,
      }),
    }
    configs.push(config)
    configs.push({
      ...config,
      dts: false,
      minify: true,
      outExtensions: () => ({
        js: `.min.${ext}`,
      }),
    })
  })

  return configs
})
