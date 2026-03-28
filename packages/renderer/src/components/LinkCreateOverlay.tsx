import { createMemo, For, Show } from 'solid-js'
import { isShape, type DiagramElement, type ShapeElement } from '@diagen/core'
import { useDesigner } from './DesignerProvider'
import { useInteraction } from './InteractionProvider'

const QUICK_CREATE_ITEMS = [
  { id: 'linker', label: '折线' },
  { id: 'straight_linker', label: '直线' },
  { id: 'curve_linker', label: '曲线' },
] as const

const PANEL_OFFSET_X = 10
const PANEL_OFFSET_Y = -4

const PANEL_STYLE = {
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
} as const

const BUTTON_STYLE = {
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
} as const

const BADGE_STYLE = {
  width: '16px',
  height: '16px',
  'border-radius': '999px',
  background: 'rgba(14, 116, 144, 0.12)',
  color: '#0f766e',
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  'font-size': '11px',
} as const

function isQuickCreateShape(value: DiagramElement | undefined): value is ShapeElement {
  return !!value && isShape(value) && !value.locked && value.attribute.linkable
}

export function LinkCreateOverlay() {
  const { selection, element, view, tool } = useDesigner()
  const { pointer, coordinate } = useInteraction()

  const selectedShape = createMemo(() => {
    if (!pointer.machine.isIdle() || !tool.isIdle()) return null

    const ids = selection.selectedIds()
    if (ids.length !== 1) return null

    const target = element.getElementById(ids[0])
    return isQuickCreateShape(target) ? target : null
  })

  const panelStyle = createMemo(() => {
    const shape = selectedShape()
    if (!shape) return null

    const bounds = coordinate.canvasToScreen(view.getShapeBounds(shape))
    return {
      ...PANEL_STYLE,
      position: 'absolute',
      left: `${bounds.x + bounds.w + PANEL_OFFSET_X}px`,
      top: `${bounds.y + PANEL_OFFSET_Y}px`,
    } as const
  })

  const startQuickCreate = (e: MouseEvent, linkerId: string) => {
    const shape = selectedShape()
    if (!shape) return

    e.preventDefault()
    e.stopPropagation()
    pointer.machine.beginLinkerCreate(e, {
      linkerId,
      from: {
        type: 'shape',
        shapeId: shape.id,
      },
    })
  }

  return (
    <Show when={panelStyle()}>
      {style => (
        <div style={style()}>
          <For each={QUICK_CREATE_ITEMS}>
            {item => (
              <button
                type="button"
                style={BUTTON_STYLE}
                onMouseDown={e => startQuickCreate(e, item.id)}
              >
                <span>{item.label}</span>
                <span style={BADGE_STYLE}>+</span>
              </button>
            )}
          </For>
        </div>
      )}
    </Show>
  )
}
