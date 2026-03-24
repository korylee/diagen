import { createMemo, For, Show } from 'solid-js'
import { isShape } from '@diagen/core'
import { useDesigner } from './DesignerProvider'
import { useInteraction } from './InteractionProvider'

const QUICK_CREATE_ITEMS = [
  { id: 'linker', label: '折线' },
  { id: 'straight_linker', label: '直线' },
  { id: 'curve_linker', label: '曲线' },
] as const

export function ShapeLinkerQuickCreateOverlay() {
  const { selection, element, view, tool } = useDesigner()
  const { pointer, coordinate } = useInteraction()

  const selectedShape = createMemo(() => {
    if (!pointer.machine.isIdle() || !tool.isIdle()) return null

    const ids = selection.selectedIds()
    if (ids.length !== 1) return null

    const target = element.getById(ids[0])
    if (!target || !isShape(target)) return null
    if (target.locked || target.attribute.linkable === false) return null
    return target
  })

  const bounds = createMemo(() => {
    const shape = selectedShape()
    if (!shape) return null
    return coordinate.canvasToScreen(view.getShapeBounds(shape))
  })

  const startQuickCreate = (e: MouseEvent, linkerId: string) => {
    const shape = selectedShape()
    if (!shape) return

    e.preventDefault()
    e.stopPropagation()
    pointer.machine.startQuickCreateLinker(e, {
      sourceShapeId: shape.id,
      linkerId,
    })
  }

  return (
    <Show when={bounds()}>
      {screenBounds => (
        <div
          style={{
            position: 'absolute',
            left: `${screenBounds().x + screenBounds().w + 10}px`,
            top: `${screenBounds().y - 4}px`,
            display: 'flex',
            'flex-direction': 'column',
            gap: '6px',
            padding: '8px',
            'border-radius': '10px',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            background: 'rgba(255,255,255,0.96)',
            'box-shadow': '0 10px 30px rgba(15, 23, 42, 0.12)',
            'pointer-events': 'auto',
            'z-index': 1002,
          }}
        >
          <For each={QUICK_CREATE_ITEMS}>
            {item => (
              <button
                type="button"
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'space-between',
                  gap: '10px',
                  padding: '6px 10px',
                  'min-width': '88px',
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  'border-radius': '8px',
                  background: '#fff',
                  color: '#0f172a',
                  cursor: 'crosshair',
                  'font-size': '12px',
                  'line-height': '16px',
                }}
                onMouseDown={e => startQuickCreate(e, item.id)}
              >
                <span>{item.label}</span>
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    'border-radius': '999px',
                    background: 'rgba(14, 116, 144, 0.12)',
                    color: '#0f766e',
                    display: 'inline-flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'font-size': '11px',
                  }}
                >
                  +
                </span>
              </button>
            )}
          </For>
        </div>
      )}
    </Show>
  )
}
