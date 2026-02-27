import { onMount, onCleanup } from 'solid-js'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
}

export interface UseKeyboardOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: () => boolean
}

function matchShortcut(e: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
  const ctrlMatch = !shortcut.ctrl || e.ctrlKey || e.metaKey
  const shiftMatch = !shortcut.shift || e.shiftKey
  const altMatch = !shortcut.alt || e.altKey

  return keyMatch && ctrlMatch && shiftMatch && altMatch
}

export function useKeyboard(options: UseKeyboardOptions): void {
  const { shortcuts, enabled = () => true } = options

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!enabled()) return

    for (const shortcut of shortcuts) {
      if (matchShortcut(e, shortcut)) {
        e.preventDefault()
        shortcut.action()
        return
      }
    }
  }

  onMount(() => window.addEventListener('keydown', handleKeyDown))
  onCleanup(() => window.removeEventListener('keydown', handleKeyDown))
}
