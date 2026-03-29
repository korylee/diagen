import { createMemo, Show } from 'solid-js'
import { useInteraction } from '../InteractionProvider'

export function SelectionLayer() {
  const { pointer, coordinate } = useInteraction()

  const screenBounds = createMemo(() => {
    const b = pointer.boxSelect.bounds()
    return b ? coordinate.canvasToScreen(b) : null
  })

  return (
    <Show when={pointer.boxSelect.isActive() && screenBounds()}>
      {bounds => (
        <div
          style={{
            position: 'absolute',
            left: `${bounds().x}px`,
            top: `${bounds().y}px`,
            width: `${bounds().w}px`,
            height: `${bounds().h}px`,
            border: `var(--dg-boxselect-border)`,
            'background-color': `var(--dg-boxselect-background)`,
            'pointer-events': 'none',
            'z-index': 9999,
          }}
        />
      )}
    </Show>
  )
}
