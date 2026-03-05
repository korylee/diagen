import type { UserConfig } from 'tsdown'
import solid from '@rolldown-plugin/solid'

const externals = ['solid-js', /@diagen\/.*/]

export function createTsDownConfig() {
  const baseConfig: UserConfig = {
    target: 'es2015',
    plugins: [solid()],
    dts: true,
    platform: 'browser',
    external: [...externals],
  }

  const configs: UserConfig[] = []

  const formats = ['cjs', 'esm'] as const
  formats.forEach(format => {
    const isEs = format === 'esm'
    const ext = isEs ? 'mjs' : 'js'
    configs.push({
      ...baseConfig,
      format,
      dts: !isEs,
      outExtensions: () => ({
        js: `.${ext}`,
      }),
    })
    configs.push({
      ...baseConfig,
      format,
      dts: false,
      minify: true,
      outExtensions: () => ({
        js: `.min.${ext}`,
      }),
    })
  })

  return configs
}
