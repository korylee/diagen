import { createMemo, For, Show } from 'solid-js'
import { getShapeAnchors, isLinker, isShape, type GuideLine } from '@diagen/core'
import type { Point } from '@diagen/shared'
import { ShapeHighlightOverlay, type ShapeHighlightItem } from './ShapeHighlightOverlay'
import { LinkCreateOverlay } from './LinkCreateOverlay'
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

function GuideOverlay() {
  const { pointer, coordinate } = useInteraction()

  const guides = createMemo<GuideLine[]>(() => {
    if (pointer.resize.isResizing()) {
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

// ============================================================================
// 框选层 - 用于显示框选区域
// ============================================================================

export function SelectionLayer() {
  const { pointer, coordinate } = useInteraction()

  const screenBounds = createMemo(() => {
    const b = pointer.boxSelect.bounds()
    return b ? coordinate.canvasToScreen(b) : null
  })

  return (
    <Show when={pointer.boxSelect.isSelecting() && screenBounds()}>
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

// ============================================================================
// 选中框 + 调整手柄 + 旋转手柄 - 统一组件
// ============================================================================

interface ShapeSelectionLayerProps {
  /**
   * @default true
   */
  showRotateHandle?: boolean
}

function LinkTargetOverlay() {
  const { element, view } = useDesigner()
  const { pointer, coordinate } = useInteraction()

  const isLinkEndDragging = createMemo(() => {
    const mode = pointer.linkerDrag.dragSnapshot()?.mode
    return pointer.linkerDrag.isPending() && (mode === 'from' || mode === 'to')
  })

  const linkTargetItems = createMemo<ShapeHighlightItem[]>(() => {
    if (!isLinkEndDragging()) return []
    const activeId = pointer.linkerDrag.candidateAnchor()?.shapeId ?? null

    return element
      .shapes()
      .filter(shape => pointer.linkerDrag.isShapeLinkable(shape.id))
      .map(shape => ({
        id: shape.id,
        bounds: coordinate.canvasToScreen(view.getShapeBounds(shape)),
        tone: 'connectable',
        active: activeId === shape.id,
      }))
  })

  return <ShapeHighlightOverlay items={linkTargetItems} visible={isLinkEndDragging} zIndex={999} />
}

function LinkerSelectionOverlay() {
  const { selection, element, view, tool } = useDesigner()
  const { pointer, coordinate } = useInteraction()

  const selectedLinker = createMemo(() => {
    if (!tool.isIdle()) return null
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
  const candidateAnchor = createMemo(() => pointer.linkerDrag.candidateAnchor())
  const fixedCandidateAnchor = createMemo(() => {
    const candidate = candidateAnchor()
    return candidate && candidate.binding.type === 'fixed' ? candidate : null
  })

  const startEndpointDrag = (e: MouseEvent, type: 'from' | 'to') => {
    const linker = selectedLinker()
    const endpoints = endpointHandles()
    const linkerRoute = route()
    if (!linker || !endpoints) return
    e.stopPropagation()
    e.preventDefault()
    const point = endpoints[type].canvas
    pointer.machine.startLinkerDrag(e, linker.id, point, { type }, linkerRoute ?? undefined)
  }

  const startControlDrag = (e: MouseEvent, index: number, point: Point) => {
    const linker = selectedLinker()
    const linkerRoute = route()
    if (!linker) return
    e.stopPropagation()
    e.preventDefault()
    pointer.machine.startLinkerDrag(
      e,
      linker.id,
      point,
      { type: 'control', controlIndex: index },
      linkerRoute ?? undefined,
    )
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

        <Show when={fixedCandidateAnchor()}>
          {candidate => <AnchorPreview elementId={candidate().shapeId} highlightAnchor={candidate().anchorId} />}
        </Show>
      </div>
    </Show>
  )
}

function ShapeSelectionOverlay(props: ShapeSelectionLayerProps) {
  const { selection, view, element, tool } = useDesigner()
  const { pointer, coordinate } = useInteraction()

  const selectedShapes = createMemo(() => {
    if (!tool.isIdle()) return null
    const selectedIds = selection.selectedIds()
    if (selectedIds.length === 0) return null

    const selectedElements = selectedIds.map(id => element.getById(id))
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
    if (!props.showRotateHandle) return false
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

export interface SelectionLayerProps extends ShapeSelectionLayerProps {}

export function SelectionOverlay(props: SelectionLayerProps) {
  return (
    <>
      <GuideOverlay />
      <LinkTargetOverlay />
      <LinkCreateOverlay />

      <ShapeSelectionOverlay showRotateHandle={props.showRotateHandle} />
      <LinkerSelectionOverlay />
    </>
  )
}

// ============================================================================
// 锚点预览 - 连线时显示元素的锚点
// ============================================================================

export function AnchorPreview(props: { elementId: string; highlightAnchor?: number | string }) {
  const { element } = useDesigner()
  const { coordinate } = useInteraction()
  const shape = createMemo(() => {
    const el = element.getById(props.elementId)
    return el && isShape(el) ? el : null
  })

  const anchors = createMemo(() => {
    const el = shape()
    if (!el) return []

    const points = getShapeAnchors(el)
    return points.map((point, index) => ({
      point,
      index,
      id: el.anchors[index]?.id ?? String(index),
    }))
  })

  return (
    <For each={anchors()}>
      {anchor => {
        const screenPos = coordinate.canvasToScreen(anchor.point)
        const isHighlight =
          props.highlightAnchor !== undefined &&
          (props.highlightAnchor === anchor.index ||
            props.highlightAnchor === anchor.id ||
            String(props.highlightAnchor) === String(anchor.index))

        return (
          <div
            style={{
              position: 'absolute',
              left: `${screenPos.x}px`,
              top: `${screenPos.y}px`,
              width: `var(--dg-anchor-size)`,
              height: `var(--dg-anchor-size)`,
              transform: 'translate(-50%, -50%)',
              'border-radius': '50%',
              background: isHighlight ? `var(--dg-anchor-color)` : `var(--dg-anchor-background)`,
              border: isHighlight ? `2px solid var(--dg-anchor-color)` : `var(--dg-anchor-border)`,
              cursor: 'crosshair',
              'pointer-events': 'none',
              'z-index': 9998,
            }}
          />
        )
      }}
    </For>
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
