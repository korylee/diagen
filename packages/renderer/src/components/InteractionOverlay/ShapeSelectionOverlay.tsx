import { createMemo, For, Show } from 'solid-js'
import { useDesigner } from '../DesignerProvider'
import { useInteraction } from '../InteractionProvider'
import { isShape } from '@diagen/core'

export interface ShapeSelectionLayerProps {
  /**
   * @default true
   */
  showRotateHandle?: boolean
}

const HANDLE_POSITIONS = [
  { dir: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { dir: 'n', x: 0.5, y: 0, cursor: 'ns-resize' },
  { dir: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { dir: 'w', x: 0, y: 0.5, cursor: 'ew-resize' },
  { dir: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
  { dir: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { dir: 's', x: 0.5, y: 1, cursor: 'ns-resize' },
  { dir: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
] as const

export function ShapeSelectionOverlay(props: ShapeSelectionLayerProps) {
  const { selection, view, element, tool } = useDesigner()
  const { pointer, coordinate } = useInteraction()

  const selectedShapes = createMemo(() => {
    if (!tool.isIdle()) return null
    const selectedIds = selection.selectedIds()
    if (selectedIds.length === 0) return null

    const selectedElements = element.getElementsByIds(selectedIds)
    return selectedElements.every(el => !!el && isShape(el)) ? selectedElements : null
  })

  const frame = createMemo(() => {
    const shapes = selectedShapes()
    if (!shapes || shapes.length === 0) return null

    if (shapes.length === 1) {
      const shape = shapes[0]
      const bounds = coordinate.canvasToScreen(view.getShapeBounds(shape))
      return {
        bounds,
        angle: shape.props.angle ?? 0,
      }
    }

    const bounds = view.getElementsBounds(shapes)
    return bounds
      ? {
          bounds: coordinate.canvasToScreen(bounds),
          angle: 0,
        }
      : null
  })

  const canRotate = createMemo(() => {
    const showRotateHandle = props.showRotateHandle ?? true
    if (!showRotateHandle) return false
    const shapes = selectedShapes()
    if (!shapes || shapes.length !== 1) return false
    const target = shapes[0]
    return target.attribute.rotatable && !target.locked
  })

  return (
    <Show when={frame()}>
      {frame => (
        <div
          style={{
            position: 'absolute',
            left: `${frame().bounds.x - 1}px`,
            top: `${frame().bounds.y - 1}px`,
            width: `${frame().bounds.w + 2}px`,
            height: `${frame().bounds.h + 2}px`,
            border: `var(--dg-selection-border)`,
            transform: frame().angle ? `rotate(${frame().angle}deg)` : undefined,
            'transform-origin': 'center center',
            'pointer-events': 'none',
            'z-index': 1000,
          }}
        >
          {/* 调整大小手柄 */}
          <For each={HANDLE_POSITIONS}>
            {handle => (
              <div
                style={{
                  position: 'absolute',
                  left: `${handle.x * 100}%`,
                  top: `${handle.y * 100}%`,
                  width: `var(--dg-handle-size)`,
                  height: `var(--dg-handle-size)`,
                  'background-color': `var(--dg-handle-background)`,
                  border: `var(--dg-handle-border)`,
                  'border-radius': `var(--dg-anchor-radius)`,
                  transform: 'translate(-50%, -50%)',
                  cursor: handle.cursor,
                  'pointer-events': 'auto',
                }}
                onMouseDown={e => {
                  e.stopPropagation()
                  e.preventDefault()
                  const selectedIds = selection.selectedIds()
                  if (selectedIds.length === 1) {
                    pointer.machine.startResize(selectedIds[0], handle.dir, e)
                  }
                }}
              />
            )}
          </For>

          {/* 旋转手柄 */}
          <Show when={canRotate()}>
            <>
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '-25px',
                  width: `var(--dg-rotate-size)`,
                  height: `var(--dg-rotate-size)`,
                  'background-color': `var(--dg-rotate-background)`,
                  border: `var(--dg-rotate-border)`,
                  'border-radius': '50%',
                  transform: 'translateX(-50%)',
                  cursor: 'grab',
                  'pointer-events': 'auto',
                }}
                onMouseDown={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  const selectedIds = selection.selectedIds()
                  if (selectedIds.length === 1) {
                    pointer.machine.startRotate(selectedIds[0], e)
                  }
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '-20px',
                  width: '1px',
                  height: '15px',
                  'background-color': `var(--dg-rotate-color)`,
                  transform: 'translateX(-50%)',
                }}
              />
            </>
          </Show>
        </div>
      )}
    </Show>
  )
}
