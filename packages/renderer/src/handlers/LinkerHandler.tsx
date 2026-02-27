import { createSignal, For, Show } from 'solid-js'
import type { Viewport, ShapeElement, Anchor, DiagramElement } from '@diagen/core'
import { createLinker, isShape, canvasToScreen } from '@diagen/core'
import type { Point } from '@diagen/shared'
import type { InteractionHandler, HandlerContext, LinkerHandlerOptions } from './types'

export function createLinkerHandler(
  ctx: HandlerContext,
  options: LinkerHandlerOptions = {}
): InteractionHandler {
  const { snapDistance = 15 } = options

  const [isLinking, setIsLinking] = createSignal(false)
  const [linkStart, setLinkStart] = createSignal<{
    elementId: string
    anchorId: string
    point: Point
  } | null>(null)
  const [currentPoint, setCurrentPoint] = createSignal<Point | null>(null)
  const [snapTarget, setSnapTarget] = createSignal<{
    elementId: string
    anchorId: string
    point: Point
  } | null>(null)
  const [hoveredElementId, setHoveredElementId] = createSignal<string | null>(null)

  const getDefaultAnchors = (): Anchor[] => [
    { x: 0.5, y: 0, id: 'top', direction: 'top' },
    { x: 1, y: 0.5, id: 'right', direction: 'right' },
    { x: 0.5, y: 1, id: 'bottom', direction: 'bottom' },
    { x: 0, y: 0.5, id: 'left', direction: 'left' }
  ]

  const getAnchors = (_elementId: string): Anchor[] => getDefaultAnchors()

  const getAnchorPosition = (element: ShapeElement, anchor: Anchor): Point => {
    const w = element.props.w
    const h = element.props.h
    const x = typeof anchor.x === 'number' ? anchor.x : w * 0.5
    const y = typeof anchor.y === 'number' ? anchor.y : h * 0.5

    return {
      x: element.props.x + x,
      y: element.props.y + y
    }
  }

  const isShapeElement = (el: DiagramElement): el is ShapeElement => {
    return isShape(el)
  }

  const findNearestAnchor = (
    point: Point,
    excludeElementId?: string
  ): { elementId: string; anchorId: string; point: Point } | null => {
    let nearest: { elementId: string; anchorId: string; point: Point; distance: number } | null = null

    const elements = Object.values(ctx.store.state.diagram.elements)

    for (const el of elements) {
      if (!isShapeElement(el)) continue
      if (el.id === excludeElementId) continue

      const anchors = getAnchors(el.id)
      for (const anchor of anchors) {
        const anchorPos = getAnchorPosition(el, anchor)
        const distance = Math.sqrt(
          Math.pow(anchorPos.x - point.x, 2) + Math.pow(anchorPos.y - point.y, 2)
        )

        if (distance <= snapDistance && (!nearest || distance < nearest.distance)) {
          nearest = {
            elementId: el.id,
            anchorId: anchor.id || `${anchor.x}-${anchor.y}`,
            point: anchorPos,
            distance
          }
        }
      }
    }

    return nearest ? { elementId: nearest.elementId, anchorId: nearest.anchorId, point: nearest.point } : null
  }

  const findElementAtPoint = (point: Point): ShapeElement | null => {
    const elements = Object.values(ctx.store.state.diagram.elements) as DiagramElement[]

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i]
      if (!isShapeElement(el)) continue

      const { x, y, w, h } = el.props
      if (point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h) {
        return el
      }
    }
    return null
  }

  const startLink = (elementId: string, anchorId: string, point: Point) => {
    setIsLinking(true)
    setLinkStart({ elementId, anchorId, point })
    setCurrentPoint(point)
    ctx.store.history.startTransaction()
  }

  const cancelLink = () => {
    setIsLinking(false)
    setLinkStart(null)
    setCurrentPoint(null)
    setSnapTarget(null)
  }

  const completeLink = () => {
    const start = linkStart()
    const target = snapTarget()

    if (start && target && start.elementId !== target.elementId) {
      const linkerElement = createLinker({
        name: 'default',
        from: { id: start.elementId, x: start.point.x, y: start.point.y },
        to: { id: target.elementId, x: target.point.x, y: target.point.y },
        linkerType: 'orthogonal'
      })
      ctx.store.element.add([linkerElement])
    }

    ctx.store.history.commitTransaction()
    cancelLink()
  }

  return {
    name: 'linker',
    isActive: isLinking,
    onMouseDown: (_e, point) => {
      const target = findNearestAnchor(point)
      if (target) {
        startLink(target.elementId, target.anchorId, target.point)
      }
    },
    onMouseMove: (_e, point) => {
      if (!isLinking()) {
        const element = findElementAtPoint(point)
        setHoveredElementId(element?.id || null)
        return
      }

      setCurrentPoint(point)
      const start = linkStart()
      const nearest = findNearestAnchor(point, start?.elementId)
      setSnapTarget(nearest)
    },
    onMouseUp: () => {
      if (isLinking()) {
        completeLink()
      }
    },
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        cancelLink()
      }
    },
    render: () => (
      <>
        <Show when={hoveredElementId() && !isLinking()}>
          <AnchorPoints
            elementId={hoveredElementId()!}
            getAnchors={getAnchors}
            viewport={ctx.viewport()}
            getElement={(id) => ctx.store.getElementById(id) as ShapeElement}
            getAnchorPosition={getAnchorPosition}
          />
        </Show>

        <Show when={isLinking() && linkStart() && currentPoint()}>
          <LinkerPreview
            from={linkStart()!.point}
            to={snapTarget()?.point || currentPoint()!}
            viewport={ctx.viewport()}
            hasTarget={!!snapTarget()}
          />
        </Show>

        <Show when={isLinking() && snapTarget()}>
          <AnchorHighlight
            point={snapTarget()!.point}
            viewport={ctx.viewport()}
          />
        </Show>
      </>
    )
  }
}

function AnchorPoints(props: {
  elementId: string
  getAnchors: (id: string) => Anchor[]
  viewport: Viewport
  getElement: (id: string) => ShapeElement | undefined
  getAnchorPosition: (el: ShapeElement, anchor: Anchor) => Point
}) {
  const element = () => props.getElement(props.elementId)
  const anchors = () => props.getAnchors(props.elementId)

  return (
    <For each={anchors()}>
      {(anchor) => {
        const el = element()
        if (!el) return null

        const pos = props.getAnchorPosition(el, anchor)
        const screenPos = canvasToScreen(pos, props.viewport)

        return (
          <div
            style={{
              position: 'absolute',
              left: `${screenPos.x - 5}px`,
              top: `${screenPos.y - 5}px`,
              width: '10px',
              height: '10px',
              'border-radius': '50%',
              background: '#fff',
              border: '2px solid #2196f3',
              cursor: 'crosshair',
              'z-index': 9998
            }}
          />
        )
      }}
    </For>
  )
}

function LinkerPreview(props: {
  from: Point
  to: Point
  viewport: Viewport
  hasTarget: boolean
}) {
  const fromScreen = () => canvasToScreen(props.from, props.viewport)
  const toScreen = () => canvasToScreen(props.to, props.viewport)

  return (
    <svg
      style={{
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        'pointer-events': 'none',
        'z-index': 9997
      }}
    >
      <line
        x1={fromScreen().x}
        y1={fromScreen().y}
        x2={toScreen().x}
        y2={toScreen().y}
        stroke={props.hasTarget ? '#2196f3' : '#999'}
        stroke-width={2}
        stroke-dasharray={props.hasTarget ? 'none' : '5,5'}
      />
    </svg>
  )
}

function AnchorHighlight(props: { point: Point; viewport: Viewport }) {
  const screenPos = () => canvasToScreen(props.point, props.viewport)

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenPos().x - 8}px`,
        top: `${screenPos().y - 8}px`,
        width: '16px',
        height: '16px',
        'border-radius': '50%',
        background: 'rgba(33, 150, 243, 0.3)',
        border: '2px solid #2196f3',
        'pointer-events': 'none',
        'z-index': 9999
      }}
    />
  )
}
