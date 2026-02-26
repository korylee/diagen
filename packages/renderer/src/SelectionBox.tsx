import { createMemo, For } from 'solid-js'
import type { DiagramElement, ShapeElement } from '@diagen/core'
import type { Rect, Viewport } from '@diagen/shared'
import { canvasToScreen } from '@diagen/shared'

export interface SelectionBoxProps {
  selectedIds: readonly string[]
  elements: Record<string, DiagramElement>
  viewport: Viewport
  onResizeStart?: (direction: string, event: MouseEvent) => void
  onRotateStart?: (event: MouseEvent) => void
}

const RESIZE_HANDLES = [
  { dir: 'nw', cursor: 'nwse-resize', x: 0, y: 0 },
  { dir: 'n', cursor: 'ns-resize', x: 0.5, y: 0 },
  { dir: 'ne', cursor: 'nesw-resize', x: 1, y: 0 },
  { dir: 'w', cursor: 'ew-resize', x: 0, y: 0.5 },
  { dir: 'e', cursor: 'ew-resize', x: 1, y: 0.5 },
  { dir: 'sw', cursor: 'nesw-resize', x: 0, y: 1 },
  { dir: 's', cursor: 'ns-resize', x: 0.5, y: 1 },
  { dir: 'se', cursor: 'nwse-resize', x: 1, y: 1 },
]

export function SelectionBox(props: SelectionBoxProps) {
  const getSelectionBounds = createMemo((): Rect | null => {
    const { selectedIds, elements } = props
    if (selectedIds.length === 0) return null

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    for (const id of selectedIds) {
      const el = elements[id]
      if (!el) continue

      if (el.type === 'shape') {
        const shape = el as ShapeElement
        minX = Math.min(minX, shape.props.x)
        minY = Math.min(minY, shape.props.y)
        maxX = Math.max(maxX, shape.props.x + shape.props.w)
        maxY = Math.max(maxY, shape.props.y + shape.props.h)
      }
    }

    if (minX === Infinity) return null
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  })

  const getScreenBounds = createMemo(() => {
    const bounds = getSelectionBounds()
    if (!bounds) return null

    const topLeft = canvasToScreen({ x: bounds.x, y: bounds.y }, props.viewport)
    return {
      x: topLeft.x,
      y: topLeft.y,
      w: bounds.w * props.viewport.zoom,
      h: bounds.h * props.viewport.zoom,
    }
  })

  const handleResizeMouseDown = (dir: string, e: MouseEvent) => {
    e.stopPropagation()
    props.onResizeStart?.(dir, e)
  }

  const handleRotateMouseDown = (e: MouseEvent) => {
    e.stopPropagation()
    props.onRotateStart?.(e)
  }

  const bounds = () => getScreenBounds()

  return (
    <>
      {bounds() && (
        <div
          style={{
            position: 'absolute',
            left: `${bounds()!.x - 1}px`,
            top: `${bounds()!.y - 1}px`,
            width: `${bounds()!.w + 2}px`,
            height: `${bounds()!.h + 2}px`,
            border: '2px solid #2196f3',
            'pointer-events': 'none',
            'z-index': 1000,
          }}
        >
          <For each={RESIZE_HANDLES}>
            {handle => (
              <div
                style={{
                  position: 'absolute',
                  left: `${handle.x * 100}%`,
                  top: `${handle.y * 100}%`,
                  width: '8px',
                  height: '8px',
                  'background-color': 'white',
                  border: '1px solid #2196f3',
                  'border-radius': '1px',
                  transform: 'translate(-50%, -50%)',
                  cursor: handle.cursor,
                  'pointer-events': 'auto',
                }}
                onMouseDown={e => handleResizeMouseDown(handle.dir, e)}
              />
            )}
          </For>

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '-25px',
              width: '12px',
              height: '12px',
              'background-color': 'white',
              border: '1px solid #2196f3',
              'border-radius': '50%',
              transform: 'translateX(-50%)',
              cursor: 'grab',
              'pointer-events': 'auto',
            }}
            onMouseDown={handleRotateMouseDown}
          />

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '-20px',
              width: '1px',
              height: '15px',
              'background-color': '#2196f3',
              transform: 'translateX(-50%)',
            }}
          />
        </div>
      )}
    </>
  )
}
