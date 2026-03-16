import { batch, createSignal, onCleanup } from 'solid-js'
import { calculateMoveGuideSnap, isShape, type GuideLine } from '@diagen/core'
import { getRotatedBoxBounds, unionBounds } from '@diagen/shared'
import type { Bounds, Point } from '@diagen/shared'
import { useDesigner } from '../components'
import { type EventToCanvas } from './createCoordinateService'
import type { CreateDragSessionOptions } from './createDragSession'
import { createPointerDeltaState } from './pointerDeltaState'
import { createTransactionalSession } from './createTransactionalSession'

// ============================================================================
// 图形拖动 Hook - 与 Designer 集成
// ============================================================================

export interface UseShapeDragOptions extends CreateDragSessionOptions {
  eventToCanvas?: EventToCanvas
  guideTolerance?: number
}

export function createShapeDrag(options: UseShapeDragOptions = {}) {
  const { threshold = 3, eventToCanvas, guideTolerance } = options
  const designer = useDesigner()
  const transaction = designer.history.transaction.createScope('拖拽图形')
  const pointerDelta = createPointerDeltaState({ eventToCanvas })
  const session = createTransactionalSession({
    threshold,
    transaction,
    onCommit: () => {
      designer.view.flushAutoGrow()
    },
  })

  const [startPositions, setStartPositions] = createSignal<Record<string, Point>>({})
  const [startSelectionBounds, setStartSelectionBounds] = createSignal<Bounds | null>(null)
  const [guideCandidates, setGuideCandidates] = createSignal<Bounds[]>([])
  const [guides, setGuides] = createSignal<GuideLine[]>([])

  const start = (e: MouseEvent, ids?: string[]) => {
    const targetIds = ids ?? designer.selection.selectedIds()
    if (targetIds.length === 0) return

    const positions: Record<string, Point> = {}
    let selectionBounds: Bounds | null = null
    for (const id of targetIds) {
      const el = designer.element.getById(id)
      if (el && isShape(el)) {
        positions[id] = { x: el.props.x, y: el.props.y }
        const bounds = designer.view.getShapeBounds(el)
        selectionBounds = selectionBounds ? unionBounds(selectionBounds, bounds) : bounds
      }
    }

    if (Object.keys(positions).length === 0) return

    const activeIds = new Set(Object.keys(positions))
    const candidates = designer.element
      .shapes()
      .filter(shape => !activeIds.has(shape.id))
      .map(shape => designer.view.getShapeBounds(shape))

    setStartPositions(positions)
    setStartSelectionBounds(selectionBounds)
    setGuideCandidates(candidates)
    setGuides([])
    pointerDelta.setStartFromEvent(e)
    session.begin({ x: e.clientX, y: e.clientY })
  }

  const move = (e: MouseEvent) => {
    const moveState = session.update({ x: e.clientX, y: e.clientY })
    if (!moveState || !moveState.shouldUpdate) return

    const zoom = designer.state.viewport.zoom
    const positions = startPositions()
    const delta = pointerDelta.resolveDelta({
      moveState,
      zoom,
      event: e,
    })
    const selectionBounds = startSelectionBounds()
    const snapped = selectionBounds
      ? calculateMoveGuideSnap({
          movingBounds: selectionBounds,
          delta,
          candidates: guideCandidates(),
          tolerance: guideTolerance,
        })
      : null
    const appliedDelta = snapped?.delta ?? delta
    setGuides(snapped?.guides ?? [])
    let movedBounds: Bounds | null = null

    batch(() => {
      for (const [id, startPos] of Object.entries(positions)) {
        const el = designer.element.getById(id)
        if (!el || !isShape(el)) continue

        const nextX = startPos.x + appliedDelta.x
        const nextY = startPos.y + appliedDelta.y
        designer.edit.update(id, {
          props: {
            ...el.props,
            x: nextX,
            y: nextY,
          },
        })

        const shapeBounds: Bounds = getRotatedBoxBounds({
          x: nextX,
          y: nextY,
          w: el.props.w,
          h: el.props.h,
          angle: el.props.angle,
        })
        movedBounds = movedBounds ? unionBounds(movedBounds, shapeBounds) : shapeBounds
      }
    })

    designer.view.scheduleAutoGrow(movedBounds ?? undefined)
  }

  const end = () => {
    if (session.isPending()) {
      session.finish()
    }
    setStartPositions({})
    setStartSelectionBounds(null)
    setGuideCandidates([])
    setGuides([])
    pointerDelta.clear()
  }

  const cancel = () => {
    if (session.isPending()) {
      session.cancel()
    }
    setStartPositions({})
    setStartSelectionBounds(null)
    setGuideCandidates([])
    setGuides([])
    pointerDelta.clear()
  }

  onCleanup(() => {
    if (session.isPending()) cancel()
  })

  return {
    isDragging: session.isDragging,
    isPending: session.isPending,
    delta: session.delta,
    guides,
    start,
    move,
    end,
    cancel,
  }
}

export type CreateShapeDrag = ReturnType<typeof createShapeDrag>
