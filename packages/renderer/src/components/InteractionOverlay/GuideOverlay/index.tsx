import { GuideLine } from '@diagen/core'
import { useInteraction } from '../../InteractionProvider'
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
        const distanceStart =
          line.distanceFrom != null ? coordinate.canvasToScreen({ x: line.pos, y: line.distanceFrom }) : null
        const distanceEnd = line.distanceTo != null ? coordinate.canvasToScreen({ x: line.pos, y: line.distanceTo }) : null
        return {
          axis: line.axis,
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
          distance: line.distance ?? null,
          labelX: end.x + 6,
          labelY: distanceStart && distanceEnd ? (distanceStart.y + distanceEnd.y) / 2 : null,
        }
      }

      const start = coordinate.canvasToScreen({ x: line.from, y: line.pos })
      const end = coordinate.canvasToScreen({ x: line.to, y: line.pos })
      const distanceStart =
        line.distanceFrom != null ? coordinate.canvasToScreen({ x: line.distanceFrom, y: line.pos }) : null
      const distanceEnd = line.distanceTo != null ? coordinate.canvasToScreen({ x: line.distanceTo, y: line.pos }) : null
      return {
        axis: line.axis,
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        distance: line.distance ?? null,
        labelX: distanceStart && distanceEnd ? (distanceStart.x + distanceEnd.x) / 2 : null,
        labelY: end.y - 6,
      }
    }),
  )

  return (
    <Show when={guideSegments().length > 0}>
      <svg
        data-guide-overlay="true"
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
          {(segment, index) => (
            <g>
              <line
                data-guide-axis={guides()[index()].axis}
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
              stroke="var(--dg-selection-color)"
              stroke-width="1"
              stroke-dasharray="4 3"
            />
              <Show when={segment.distance != null && segment.distance > 0 && segment.labelX != null && segment.labelY != null}>
                <text
                  data-guide-distance={`${segment.distance}px`}
                  x={segment.labelX!}
                  y={segment.labelY!}
                  fill="var(--dg-selection-color)"
                  font-size="12"
                  text-anchor={segment.axis === 'x' ? 'start' : 'middle'}
                  dominant-baseline="middle"
                >
                  {segment.distance}px
                </text>
              </Show>
            </g>
          )}
        </For>
      </svg>
    </Show>
  )
}
