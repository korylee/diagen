import { getShapeAnchorInfo, isLinker, isShape } from '@diagen/core'
import { createDgBem, type Point } from '@diagen/shared'
import { createMemo, For, Show } from 'solid-js'
import { useDesigner } from '../../DesignerProvider'
import { useInteraction } from '../../InteractionProvider'
import { RectHighlightOverlay, type RectHighlightItem } from '../RectHighlightOverlay'

import './index.scss'

interface QuickCreateAction {
  id: string
  label: string
}

type QuickCreatePlacement = 'left' | 'right' | 'top' | 'bottom'

interface QuickCreatePanel {
  shapeId: string
  actions: ReadonlyArray<QuickCreateAction>
  placement: QuickCreatePlacement
  origin: {
    x: number
    y: number
  }
}

const QUICK_CREATE_ITEMS: ReadonlyArray<QuickCreateAction> = [
  { id: 'linker', label: '折线' },
  { id: 'straight_linker', label: '直线' },
  { id: 'curve_linker', label: '曲线' },
] as const

const QUICK_CREATE_PANEL_OFFSETS: Record<QuickCreatePlacement, { x: number; y: number }> = {
  left: { x: -10, y: -4 },
  right: { x: 10, y: -4 },
  top: { x: 0, y: -10 },
  bottom: { x: 0, y: 10 },
}

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

const bem = createDgBem('linker-overlay')

export function LinkerOverlay() {
  const { selection, element, state, tool, view } = useDesigner()
  const { coordinate, pointer } = useInteraction()

  const isLinkEndDragging = createMemo(() => {
    const mode = pointer.linkerDrag.state()?.mode
    return pointer.linkerDrag.isActive() && (mode === 'from' || mode === 'to')
  })

  const targetItems = createMemo(() => {
    if (!isLinkEndDragging()) return []
    const activeId = pointer.linkerDrag.snapTarget()?.shapeId ?? null

    return element
      .shapes()
      .filter(shape => pointer.linkerDrag.isShapeLinkable(shape.id))
      .map((shape, index) => {
        const itemState = activeId === shape.id ? 'active' : 'candidate'
        const bounds = coordinate.canvasToScreen(view.getShapeBounds(shape))

        return {
          id: `${shape.id}:link-target:${itemState}:frame:${index * 1000}`,
          bounds,
          border: itemState === 'active' ? 'var(--dg-hl-link-outline-active)' : 'var(--dg-hl-link-outline)',
          background: itemState === 'active' ? 'var(--dg-hl-link-bg-active)' : 'var(--dg-hl-link-bg)',
          dataAttrs: {
            'data-shape-highlight-id': shape.id,
            'data-shape-highlight-kind': 'link-target',
            'data-shape-highlight-state': itemState,
          },
        }
      })
  })

  const selectedQuickCreateShape = createMemo(() => {
    if (!pointer.machine.isIdle() || !tool.isIdle()) return null

    const ids = selection.selectedIds()
    if (ids.length !== 1) return null

    const target = element.getElementById(ids[0])
    return target && isShape(target) && !target.locked && target.attribute.linkable ? target : null
  })

  const quickCreatePanel = createMemo<QuickCreatePanel | null>(() => {
    const shape = selectedQuickCreateShape()
    if (!shape) return null

    const placement: QuickCreatePlacement = 'right'
    const offset = QUICK_CREATE_PANEL_OFFSETS[placement]
    const bounds = coordinate.canvasToScreen(view.getShapeBounds(shape))

    return {
      shapeId: shape.id,
      actions: QUICK_CREATE_ITEMS,
      placement,
      origin: {
        x: bounds.x + bounds.w + offset.x,
        y: bounds.y + offset.y,
      },
    }
  })

  const sourceItems = createMemo(() => {
    const shape = selectedQuickCreateShape()
    if (!shape) return []

    const bounds = coordinate.canvasToScreen(view.getShapeBounds(shape))
    return [
      {
        id: `${shape.id}:link-source:armed:frame:0`,
        bounds,
        border: 'var(--dg-hl-custom-outline-active)',
        background: 'var(--dg-hl-custom-bg-active)',
        padding: 2,
        dataAttrs: {
          'data-shape-highlight-id': shape.id,
          'data-shape-highlight-kind': 'link-source',
          'data-shape-highlight-state': 'armed',
        },
      },
    ]
  })

  const startQuickCreate = (e: MouseEvent, shapeId: string, linkerId: string) => {
    e.preventDefault()
    e.stopPropagation()
    pointer.machine.beginLinkerCreate(e, {
      linkerId,
      from: {
        type: 'shape',
        shapeId,
      },
    })
  }

  const selectedLinker = createMemo(() => {
    if (!tool.isIdle()) return null
    const selectedIds = selection.selectedIds()
    if (selectedIds.length !== 1) return null
    const selected = element.getElementById(selectedIds[0])
    return selected && isLinker(selected) ? selected : null
  })

  const layout = createMemo(() => {
    const linker = selectedLinker()
    if (!linker) return null
    return view.getLinkerLayout(linker)
  })
  const route = createMemo(() => layout()?.route ?? null)

  const routePath = createMemo(() => {
    const linker = selectedLinker()
    const linkerRoute = route()
    if (!linker || !linkerRoute || linkerRoute.points.length < 2) return ''
    const screenPoints = linkerRoute.points.map(point => coordinate.canvasToScreen(point))
    return createRoutePath(screenPoints, linker.linkerType)
  })

  const endpointHandles = createMemo(() => {
    const linkerRoute = route()
    if (!linkerRoute || linkerRoute.points.length < 2) return null

    const fromPoint = linkerRoute.points[0]
    const toPoint = linkerRoute.points[linkerRoute.points.length - 1]
    return {
      from: {
        screen: coordinate.canvasToScreen(fromPoint),
        canvas: fromPoint,
      },
      to: {
        screen: coordinate.canvasToScreen(toPoint),
        canvas: toPoint,
      },
    }
  })

  const controlHandles = createMemo(() => {
    const linker = selectedLinker()
    if (!linker) return []
    return linker.points.map((point, index) => ({
      index,
      screen: coordinate.canvasToScreen(point),
      canvas: point,
    }))
  })
  const snapTarget = createMemo(() => pointer.linkerDrag.snapTarget())
  const fixedSnapTarget = createMemo(() => {
    const candidate = snapTarget()
    return candidate && candidate.binding.type === 'fixed' ? candidate : null
  })
  const anchorItems = createMemo(() => {
    const candidate = fixedSnapTarget()
    if (!candidate) return []
    const target = element.getElementById(candidate.shapeId)
    if (!target || !isShape(target)) return []

    const anchorSize = state.config.anchorSize
    const items: RectHighlightItem[] = []

    for (let index = 0; index < target.anchors.length; index++) {
      const anchor = getShapeAnchorInfo(target, index)
      if (!anchor) continue
      const screenPoint = coordinate.canvasToScreen(anchor.point)
      const isActive = candidate.anchorId === anchor.id

      items.push({
        id: `${candidate.shapeId}:anchor-preview:${anchor.id}:${index}`,
        bounds: {
          x: screenPoint.x - anchorSize / 2,
          y: screenPoint.y - anchorSize / 2,
          w: anchorSize,
          h: anchorSize,
        },
        border: isActive ? '2px solid var(--dg-anchor-color)' : 'var(--dg-anchor-border)',
        background: isActive ? 'var(--dg-anchor-color)' : 'var(--dg-anchor-background)',
        radius: anchorSize / 2,
        dataAttrs: {
          'data-shape-highlight-id': candidate.shapeId,
          'data-shape-highlight-kind': 'anchor-preview',
          'data-shape-highlight-state': 'armed',
          'data-shape-highlight-part': 'anchor',
          'data-shape-highlight-anchor-id': anchor.id,
          'data-shape-highlight-anchor-index': String(anchor.index),
          'data-shape-highlight-anchor-active': String(isActive),
        },
      })
    }

    return items
  })

  const startEndpointDrag = (e: MouseEvent, type: 'from' | 'to') => {
    const linker = selectedLinker()
    const endpoints = endpointHandles()
    const linkerRoute = route()
    if (!linker || !endpoints) return
    e.stopPropagation()
    e.preventDefault()
    const point = endpoints[type].canvas
    pointer.machine.beginLinkerEdit(e, {
      linkerId: linker.id,
      point,
      hit: { type },
      route: linkerRoute ?? undefined,
    })
  }

  const startControlDrag = (e: MouseEvent, index: number, point: Point) => {
    const linker = selectedLinker()
    const linkerRoute = route()
    if (!linker) return
    e.stopPropagation()
    e.preventDefault()
    pointer.machine.beginLinkerEdit(e, {
      linkerId: linker.id,
      point,
      hit: { type: 'control', controlIndex: index },
      route: linkerRoute ?? undefined,
    })
  }

  return (
    <>
      <RectHighlightOverlay items={targetItems()} visible={isLinkEndDragging()} zIndex={999} />
      <RectHighlightOverlay items={sourceItems()} visible={sourceItems().length > 0} zIndex={998} />

      <Show when={quickCreatePanel()}>
        {resolvedPanel => {
          const panel = resolvedPanel()
          return (
            <div
              class={bem('panel', { [panel.placement]: true })}
              style={{
                position: 'absolute',
                left: `${panel.origin.x}px`,
                top: `${panel.origin.y}px`,
              }}
              data-linker-create-panel="true"
              data-quick-create-shape-id={panel.shapeId}
              data-quick-create-placement={panel.placement}
            >
              <For each={panel.actions}>
                {action => (
                  <button
                    type="button"
                    class={bem('panel-item')}
                    onMouseDown={e => startQuickCreate(e, panel.shapeId, action.id)}
                  >
                    <span>{action.label}</span>
                    <span style={BADGE_STYLE}>+</span>
                  </button>
                )}
              </For>
            </div>
          )
        }}
      </Show>

      <Show when={selectedLinker() && endpointHandles()}>
        <div
          style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            'pointer-events': 'none',
            'z-index': 1001,
          }}
        >
          <svg
            style={{
              position: 'absolute',
              left: '0',
              top: '0',
              width: '100%',
              height: '100%',
              overflow: 'visible',
              'pointer-events': 'none',
            }}
          >
            <path
              d={routePath()}
              fill="none"
              stroke="var(--dg-selection-color)"
              stroke-width={1.5}
              stroke-dasharray="4,3"
            />
          </svg>

          <Show when={endpointHandles()}>
            {handles => (
              <>
                <div
                  class={bem('from-endpoint')}
                  style={{
                    position: 'absolute',
                    left: `${handles().from.screen.x}px`,
                    top: `${handles().from.screen.y}px`,
                  }}
                  onMouseDown={e => startEndpointDrag(e, 'from')}
                />

                <div
                  class={bem('to-endpoint')}
                  style={{
                    position: 'absolute',
                    left: `${handles().to.screen.x}px`,
                    top: `${handles().to.screen.y}px`,
                  }}
                  onMouseDown={e => startEndpointDrag(e, 'to')}
                />
              </>
            )}
          </Show>

          <For each={controlHandles()}>
            {handle => (
              <div
                style={{
                  position: 'absolute',
                  left: `${handle.screen.x}px`,
                  top: `${handle.screen.y}px`,
                  width: `var(--dg-handle-size)`,
                  height: `var(--dg-handle-size)`,
                  transform: 'translate(-50%, -50%)',
                  'background-color': 'var(--dg-handle-background)',
                  border: 'var(--dg-handle-border)',
                  'border-radius': 'var(--dg-anchor-radius)',
                  cursor: 'move',
                  'pointer-events': 'auto',
                }}
                onMouseDown={e => startControlDrag(e, handle.index, handle.canvas)}
              />
            )}
          </For>

          <RectHighlightOverlay items={anchorItems()} visible={anchorItems().length > 0} zIndex={9998} />
        </div>
      </Show>
    </>
  )
}

function createRoutePath(points: Point[], linkerType: string): string {
  if (points.length < 2) return ''

  if (linkerType === 'curved' && points.length === 4) {
    return `M ${points[0].x} ${points[0].y} C ${points[1].x} ${points[1].y}, ${points[2].x} ${points[2].y}, ${points[3].x} ${points[3].y}`
  }

  const commands = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 1; i < points.length; i++) {
    commands.push(`L ${points[i].x} ${points[i].y}`)
  }
  return commands.join(' ')
}
