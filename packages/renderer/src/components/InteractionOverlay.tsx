import { canvasToScreen, isLinker, isShape } from '@diagen/core'
import type { Bounds, Point } from '@diagen/shared'
import { createMemo, For, Show } from 'solid-js'
import { useDesigner } from './DesignerProvider'
import { useInteraction } from './InteractionProvider'

// ============================================================================
// 常量
// ============================================================================

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

// ============================================================================
// 框选层 - 用于显示框选区域
// ============================================================================

export function SelectionLayer(props: { screenBounds: Bounds }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${props.screenBounds.x}px`,
        top: `${props.screenBounds.y}px`,
        width: `${props.screenBounds.w}px`,
        height: `${props.screenBounds.h}px`,
        border: `var(--dg-boxselect-border)`,
        'background-color': `var(--dg-boxselect-background)`,
        'pointer-events': 'none',
        'z-index': 9999,
      }}
    />
  )
}

// ============================================================================
// 选中框 + 调整手柄 + 旋转手柄 - 统一组件
// ============================================================================

export interface SelectionBoxProps {
  /**
   * @default true
   */
  showRotateHandle?: boolean
}

export function SelectionBox(props: SelectionBoxProps) {
  const { selection, view, element } = useDesigner()
  const { pointer } = useInteraction()

  const bounds = createMemo(() => {
    const selectedIds = selection.selectedIds()
    if (selectedIds.length === 0) return null

    const selectedElements = selectedIds.map(id => element.getById(id))
    if (selectedElements.some(el => !el || !isShape(el))) {
      return null
    }

    const b = view.getElementsBounds(selectedElements)
    return b && canvasToScreen(b, view.viewport())
  })

  return (
    <Show when={bounds()}>
      {bounds => (
        <div
          style={{
            position: 'absolute',
            left: `${bounds().x - 1}px`,
            top: `${bounds().y - 1}px`,
            width: `${bounds().w + 2}px`,
            height: `${bounds().h + 2}px`,
            border: `var(--dg-selection-border)`,
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
          <Show when={props.showRotateHandle ?? true}>
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
                  e.stopPropagation()
                  // TODO: 旋转功能待实现
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

// ============================================================================
// 连线选中控制点层
// ============================================================================

export function LinkerSelectionOverlay() {
  const { selection, element, view } = useDesigner()
  const { pointer } = useInteraction()

  const selectedLinker = createMemo(() => {
    const selectedIds = selection.selectedIds()
    if (selectedIds.length !== 1) return null
    const selected = element.getById(selectedIds[0])
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
    const screenPoints = linkerRoute.points.map(point => canvasToScreen(point, view.viewport()))
    return createRoutePath(screenPoints, linker.linkerType)
  })

  const endpointHandles = createMemo(() => {
    const linkerRoute = route()
    if (!linkerRoute || linkerRoute.points.length < 2) return null

    const fromPoint = linkerRoute.points[0]
    const toPoint = linkerRoute.points[linkerRoute.points.length - 1]
    return {
      from: {
        screen: canvasToScreen(fromPoint, view.viewport()),
        canvas: fromPoint,
      },
      to: {
        screen: canvasToScreen(toPoint, view.viewport()),
        canvas: toPoint,
      },
    }
  })

  const controlHandles = createMemo(() => {
    const linker = selectedLinker()
    if (!linker) return []
    return linker.points.map((point, index) => ({
      index,
      screen: canvasToScreen(point, view.viewport()),
      canvas: point,
    }))
  })

  const startEndpointDrag = (e: MouseEvent, type: 'from' | 'to') => {
    const linker = selectedLinker()
    const endpoints = endpointHandles()
    const linkerRoute = route()
    if (!linker || !endpoints) return
    e.stopPropagation()
    e.preventDefault()
    const point = type === 'from' ? endpoints.from.canvas : endpoints.to.canvas
    pointer.machine.startLinkerDrag(e, linker.id, point, { type }, linkerRoute ?? undefined)
  }

  const startControlDrag = (e: MouseEvent, index: number, point: Point) => {
    const linker = selectedLinker()
    const linkerRoute = route()
    if (!linker) return
    e.stopPropagation()
    e.preventDefault()
    pointer.machine.startLinkerDrag(e, linker.id, point, { type: 'control', controlIndex: index }, linkerRoute ?? undefined)
  }

  return (
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
                style={{
                  position: 'absolute',
                  left: `${handles().from.screen.x}px`,
                  top: `${handles().from.screen.y}px`,
                  width: `var(--dg-anchor-size)`,
                  height: `var(--dg-anchor-size)`,
                  transform: 'translate(-50%, -50%)',
                  'border-radius': '50%',
                  background: 'var(--dg-anchor-background)',
                  border: 'var(--dg-anchor-border)',
                  cursor: 'crosshair',
                  'pointer-events': 'auto',
                }}
                onMouseDown={e => startEndpointDrag(e, 'from')}
              />

              <div
                style={{
                  position: 'absolute',
                  left: `${handles().to.screen.x}px`,
                  top: `${handles().to.screen.y}px`,
                  width: `var(--dg-anchor-size)`,
                  height: `var(--dg-anchor-size)`,
                  transform: 'translate(-50%, -50%)',
                  'border-radius': '50%',
                  background: 'var(--dg-anchor-background)',
                  border: 'var(--dg-anchor-border)',
                  cursor: 'crosshair',
                  'pointer-events': 'auto',
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
      </div>
    </Show>
  )
}

// ============================================================================
// 锚点预览 - 连线时显示元素的锚点
// ============================================================================

export function AnchorPreview(props: { elementId: string; highlightAnchor?: string }) {
  const { state, element } = useDesigner()
  const anchors = () => [
    { x: 0.5, y: 0, id: 'top' },
    { x: 1, y: 0.5, id: 'right' },
    { x: 0.5, y: 1, id: 'bottom' },
    { x: 0, y: 0.5, id: 'left' },
  ]

  const getAnchorPosition = (anchor: { x: number; y: number }): Point => {
    const el = element.getById(props.elementId)
    if (!el || !isShape(el)) return { x: 0, y: 0 }
    return {
      x: el.props.x + el.props.w * anchor.x,
      y: el.props.y + el.props.h * anchor.y,
    }
  }

  return (
    <For each={anchors()}>
      {(anchor: { x: number; y: number; id: string }) => {
        const pos = getAnchorPosition(anchor)
        const screenPos = canvasToScreen(pos, state.viewport)
        const isHighlight = anchor.id === props.highlightAnchor

        return (
          <div
            style={{
              position: 'absolute',
              left: `${screenPos.x - 5}px`,
              top: `${screenPos.y - 5}px`,
              width: `var(--dg-anchor-size)`,
              height: `var(--dg-anchor-size)`,
              'border-radius': '50%',
              background: isHighlight ? `var(--dg-anchor-color)` : `var(--dg-anchor-background)`,
              border: `2px solid var(--dg-anchor-color)`,
              cursor: 'crosshair',
              'z-index': 9998,
            }}
          />
        )
      }}
    </For>
  )
}

// ============================================================================
// 连线预览 - 拖动连线时显示预览线
// ============================================================================
export function LinkerPreview(props: { from: Point; to: Point; hasTarget?: boolean }) {
  const designer = useDesigner()
  const fromScreen = () => canvasToScreen(props.from, designer.state.viewport)
  const toScreen = () => canvasToScreen(props.to, designer.state.viewport)

  return (
    <svg
      style={{
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        'pointer-events': 'none',
        'z-index': 9997,
      }}
    >
      <line
        x1={fromScreen().x}
        y1={fromScreen().y}
        x2={toScreen().x}
        y2={toScreen().y}
        stroke={props.hasTarget ? `var(--dg-linker-color)` : `var(--dg-linker-color-inactive)`}
        stroke-width={2}
        stroke-dasharray={props.hasTarget ? 'none' : '5,5'}
      />
    </svg>
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
