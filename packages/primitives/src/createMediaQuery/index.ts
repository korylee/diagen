import { createEffect, createMemo, createSignal } from 'solid-js'
import { ConfigurableWindow, defaultWindow } from '../_configurable'
import { access, MaybeAccessor } from '../_shared'
import { isFunction } from '@diagen/shared'
import { createEventListener } from '../createEventListener'

export function createMediaQuery(query: MaybeAccessor<string>, options: ConfigurableWindow = {}) {
  const { window = defaultWindow } = options
  const isSupported = createMemo(() => window && 'metachMedia' in window && isFunction(window.matchMedia))

  const [mediaQuery, setMediaQuery] = createSignal<MediaQueryList>()
  const [matches, setMatches] = createSignal(false)

  const handler = (event: MediaQueryListEvent) => {
    setMatches(event.matches)
  }

  createEffect(() => {
    if (!isSupported()) return
    setMediaQuery(window?.matchMedia(access(query)))
    setMatches(mediaQuery()!.matches)
  })

  createEventListener(mediaQuery, 'change', handler, { passive: true })

  return matches
}
