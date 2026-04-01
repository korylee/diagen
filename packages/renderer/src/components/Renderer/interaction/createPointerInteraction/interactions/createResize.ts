import { createSignal, onCleanup } from 'solid-js'
import { calculateResizeGuideSnap, isShape, type GuideLine, type ShapeElement } from '@diagen/core'
import { getRotatedBounds } from '@diagen/shared'
import type { Bounds, Point } from '@diagen/shared'
import { useDesigner } from '../../../..'
import { type EventToCanvas } from '../../../primitives/createCoordinateService'
import { createDragSession } from '../foundation/createDragSession'
import type { CreatePointerDragTrackerOptions } from '../foundation/createPointerDragTracker'
import { createPointerDeltaState } from '../foundation/createPointerDeltaState'

// ============================================================================
// 调整大小 Hook - 与 Designer 集成
// ============================================================================

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const HANDLE_SIZE = 8

export interface ResizeDragState {
  targetId: string
  direction: ResizeDirection
  startBounds: Bounds
  guideCandidates: Bounds[]
  ratio: number
  startProps: ShapeElement['props']
}

export function createResize(
  options: CreatePointerDragTrackerOptions & {
    minWidth?: number
    minHeight?: number
    eventToCanvas?: EventToCanvas
    guideTolerance?: number
  } = {},
) {
  const { threshold = 0, minWidth = 20, minHeight = 20, eventToCanvas, guideTolerance } = options
  const { element, history, selection, view, edit } = useDesigner()
  const transaction = history.transaction.createScope('调整尺寸')
  const pointerDelta = createPointerDeltaState({ eventToCanvas })
  const [guides, setGuides] = createSignal<GuideLine[]>([])
  const session = createDragSession<{ id: string; dir: ResizeDirection; event: MouseEvent }, ResizeDragState>({
    threshold,
    transaction,
    getEvent: input => input.event,
    setup: input => {
      const el = element.getElementById(input.id)
      if (!el || !isShape(el)) return null

      const bounds = view.getElementBounds(el)
      if (!bounds) return null

      setGuides([])
      pointerDelta.begin(input.event)

      return {
        targetId: input.id,
        direction: input.dir,
        startBounds: bounds,
        guideCandidates: element
          .shapes()
          .filter(shape => shape.id !== input.id)
          .map(shape => view.getShapeBounds(shape)),
        ratio: bounds.w / bounds.h,
        startProps: { ...el.props },
      }
    },
    update: ({ state, event, moveState }) => {
      const delta = pointerDelta.resolveDelta({
        moveState,
        zoom: view.viewport().zoom,
        event,
      })
      const nextBounds = resolveResizeBounds({
        state,
        delta,
        keepRatio: event.shiftKey,
        center: event.altKey,
        minWidth,
        minHeight,
      })
      const snapped = calculateResizeGuideSnap({
        draftBounds: nextBounds,
        direction: state.direction,
        candidates: state.guideCandidates,
        tolerance: guideTolerance,
        minWidth,
        minHeight,
      })
      const snappedBounds = snapped.bounds
      setGuides(snapped.guides)

      edit.update(state.targetId, {
        props: {
          ...state.startProps,
          x: snappedBounds.x,
          y: snappedBounds.y,
          w: snappedBounds.w,
          h: snappedBounds.h,
        },
      })
      view.scheduleAutoGrow(
        getRotatedBounds({
          x: snappedBounds.x,
          y: snappedBounds.y,
          w: snappedBounds.w,
          h: snappedBounds.h,
          angle: state.startProps.angle,
        }),
      )
    },
    reset: () => {
      setGuides([])
      pointerDelta.reset()
    },
    onCommit: () => {
      view.flushAutoGrow()
    },
  })

  const start = (id: string, dir: ResizeDirection, e: MouseEvent): boolean => session.begin({ id, dir, event: e })

  const move = (e: MouseEvent) => {
    session.move(e)
  }

  const end = () => {
    session.end()
  }

  const cancel = () => {
    session.cancel()
  }

  const hitTest = (point: Point): { id: string; dir: ResizeDirection } | null => {
    const selected = selection.selectedIds()
    if (selected.length !== 1) return null

    const id = selected[0]
    const el = element.getElementById(id)
    if (!el || !isShape(el)) return null

    const { x, y, w, h } = el.props
    const size = HANDLE_SIZE / view.viewport().zoom

    const handles = [
      { dir: 'nw', px: x, py: y },
      { dir: 'n', px: x + w / 2, py: y },
      { dir: 'ne', px: x + w, py: y },
      { dir: 'w', px: x, py: y + h / 2 },
      { dir: 'e', px: x + w, py: y + h / 2 },
      { dir: 'sw', px: x, py: y + h },
      { dir: 's', px: x + w / 2, py: y + h },
      { dir: 'se', px: x + w, py: y + h },
    ] as const

    for (const h of handles) {
      if (Math.abs(point.x - h.px) <= size && Math.abs(point.y - h.py) <= size) {
        return { id, dir: h.dir }
      }
    }
    return null
  }

  onCleanup(() => {
    if (session.isActive()) cancel()
  })

  return {
    isActive: session.isActive,
    state: session.state,
    guides,
    start,
    move,
    end,
    cancel,
    hitTest,
  }
}

function resolveResizeBounds(params: {
  state: ResizeDragState
  delta: Point
  keepRatio: boolean
  center: boolean
  minWidth: number
  minHeight: number
}): Bounds {
  const { state, delta, keepRatio, center, minWidth, minHeight } = params
  const bounds = state.startBounds
  const dx = delta.x
  const dy = delta.y

  let { x, y, w, h } = bounds

  if (state.direction.includes('n')) {
    y = bounds.y + dy
    h = bounds.h - dy
  }
  if (state.direction.includes('s')) {
    h = bounds.h + dy
  }
  if (state.direction.includes('w')) {
    x = bounds.x + dx
    w = bounds.w - dx
  }
  if (state.direction.includes('e')) {
    w = bounds.w + dx
  }

  if (keepRatio) {
    if (['n', 's'].includes(state.direction)) w = h * state.ratio
    else if (['e', 'w'].includes(state.direction)) h = w / state.ratio
    else if (Math.abs(dx) > Math.abs(dy)) h = w / state.ratio
    else w = h * state.ratio
  }

  if (center) {
    const cx = bounds.x + bounds.w / 2
    const cy = bounds.y + bounds.h / 2
    x = cx - w / 2
    y = cy - h / 2
  }

  return {
    x,
    y,
    w: Math.max(minWidth, w),
    h: Math.max(minHeight, h),
  }
}

export type CreateResize = ReturnType<typeof createResize>
