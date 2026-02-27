import { createSignal, onCleanup, onMount } from 'solid-js'
import { ConfigurableWindow, defaultWindow } from '../_configurable'

interface CreateDevicePixelRatioOptions extends ConfigurableWindow {}

export function createDevicePixelRatio(options: CreateDevicePixelRatioOptions = {}): () => number {
  const { window = defaultWindow } = options

  if (!window) return () => 1

  const [pixelRatio, setPixelRatio] = createSignal(window.devicePixelRatio || 1)

  onMount(() => {
    let media: MediaQueryList | null = null

    const updatePixelRatio = () => {
      if (!window) return
      const dpr = window.devicePixelRatio || 1
      setPixelRatio(dpr)

      if (media) {
        media.removeEventListener('change', updatePixelRatio)
      }
      media = window.matchMedia(`(resolution: ${dpr}dppx)`)
      media.addEventListener('change', updatePixelRatio)
    }

    updatePixelRatio()

    onCleanup(() => {
      if (media) {
        media.removeEventListener('change', updatePixelRatio)
      }
    })
  })

  return pixelRatio
}
