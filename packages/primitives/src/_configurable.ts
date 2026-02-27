import { isServer } from 'solid-js/web'

export interface ConfigurableWindow {
  window?: Window
}

export const defaultWindow = isServer ? undefined : window
