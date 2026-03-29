import { GuideLine } from '@diagen/core'
import { useInteraction } from '../InteractionProvider'
import { For, Show, createMemo } from 'solid-js'

export function GuideOverlay() {
  const { pointer, coordinate } = useInteraction()

  const guides = createMemo<GuideLine[]>(() => {
    if (pointer.resize.isActive()) {
      return pointer.resize.guides()
    }

    if (pointer.shapeDrag.isDragging()) {
      return pointer.shapeDrag.guides()
    }

    return []
  })

  const guideSegments = createMemo(() =>
    guides().map(line => {
      if (line.axis === 'x') {
        const start = coordinate.canvasToScreen({ x: line.pos, y: line.from })
        const end = coordinate.canvasToScreen({ x: line.pos, y: line.to })
        return {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
        }
      }

      const start = coordinate.canvasToScreen({ x: line.from, y: line.pos })
      const end = coordinate.canvasToScreen({ x: line.to, y: line.pos })
      return {
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
      }
    }),
  )

  return (
    <Show when={guideSegments().length > 0}>
      <svg
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '100%',
          height: '100%',
          overflow: 'visible',
          'pointer-events': 'none',
          'z-index': 950,
        }}
      >
        <For each={guideSegments()}>
          {segment => (
            <line
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke="var(--dg-selection-color)"
              stroke-width="1"
              stroke-dasharray="4 3"
            />
          )}
        </For>
      </svg>
    </Show>
  )
}
