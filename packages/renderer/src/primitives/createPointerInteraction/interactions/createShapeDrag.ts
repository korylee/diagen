import { calculateMoveGuideSnap, isShape, type GuideLine, type ShapeElement } from '@diagen/core'
import type { Bounds, Point } from '@diagen/shared'
import { getRotatedBoxBounds, unionBounds } from '@diagen/shared'
import { batch, createSignal, onCleanup } from 'solid-js'
import { useDesigner } from '../../../components'
import { type EventToCanvas } from '../../createCoordinateService'
import { createDragSession } from '../foundation/createDragSession'
import { createPointerDeltaState } from '../foundation/createPointerDeltaState'
import { type CreatePointerDragTrackerOptions } from '../foundation/createPointerDragTracker'


export interface UseShapeDragOptions extends CreatePointerDragTrackerOptions {
  eventToCanvas?: EventToCanvas
  guideTolerance?: number
}

interface DragTarget {
  id: string
  startProps: ShapeElement['props']
}

interface DragStartContext {
  targets: DragTarget[]
  selectionBounds: Bounds | null
  guideCandidates: Bounds[]
}

export function createShapeDrag(options: UseShapeDragOptions = {}) {
  const { threshold = 3, eventToCanvas, guideTolerance } = options
  const { history, view, element, edit, selection } = useDesigner()
  const transaction = history.transaction.createScope('拖拽图形')
  const pointerDelta = createPointerDeltaState({ eventToCanvas })
  const [guides, setGuides] = createSignal<GuideLine[]>([])
  const session = createDragSession<{ event: MouseEvent; ids?: string[] }, DragStartContext>({
    threshold,
    transaction,
    getEvent: input => input.event,
    setup: input => {
      const targetIds = input.ids ?? selection.selectedIds()
      if (targetIds.length === 0) return null

      const context = buildDragStartContext(targetIds)
      if (!context) return null

      setGuides([])
      pointerDelta.begin(input.event)
      return context
    },
    update: ({ state, event, moveState }) => {
      const delta = pointerDelta.resolveDelta({
        moveState,
        zoom: view.zoom(),
        event,
      })
      const snapped = state.selectionBounds
        ? calculateMoveGuideSnap({
            movingBounds: state.selectionBounds,
            delta,
            candidates: state.guideCandidates,
            tolerance: guideTolerance,
          })
        : null
      const appliedDelta = snapped?.delta ?? delta
      setGuides(snapped?.guides ?? [])

      const movedBounds = applyDraggedShapeUpdates(state.targets, appliedDelta)
      view.scheduleAutoGrow(movedBounds ?? undefined)
    },
    reset: () => {
      setGuides([])
      pointerDelta.reset()
    },
    onCommit: () => {
      view.flushAutoGrow()
    },
  })

  const start = (e: MouseEvent, ids?: string[]): boolean => session.begin({ event: e, ids })

  const move = (e: MouseEvent) => {
    session.move(e)
  }

  const end = () => {
    session.end()
  }

  const cancel = () => {
    session.cancel()
  }

  function buildDragStartContext(ids: string[]): DragStartContext | null {
    const targets: DragTarget[] = []
    let selectionBounds: Bounds | null = null

    for (const id of ids) {
      const el = element.getElementById(id)
      if (!el || !isShape(el)) continue

      const startProps = { ...el.props }
      targets.push({
        id,
        startProps,
      })
      const bounds = view.getShapeBounds(el)
      selectionBounds = selectionBounds ? unionBounds(selectionBounds, bounds) : bounds
    }

    if (targets.length === 0) return null

    return {
      targets,
      selectionBounds,
      guideCandidates: buildGuideCandidates(targets),
    }
  }

  function buildGuideCandidates(targets: DragTarget[]): Bounds[] {
    const activeIds = new Set(targets.map(target => target.id))
    return element
      .shapes()
      .filter(shape => !activeIds.has(shape.id))
      .map(shape => view.getShapeBounds(shape))
  }

  function applyDraggedShapeUpdates(targets: DragTarget[], delta: Point): Bounds | null {
    let movedBounds: Bounds | null = null

    batch(() => {
      for (const target of targets) {
        const nextX = target.startProps.x + delta.x
        const nextY = target.startProps.y + delta.y

        edit.update(target.id, {
          props: {
            ...target.startProps,
            x: nextX,
            y: nextY,
          },
        })

        const shapeBounds: Bounds = getRotatedBoxBounds({
          x: nextX,
          y: nextY,
          w: target.startProps.w,
          h: target.startProps.h,
          angle: target.startProps.angle,
        })
        movedBounds = movedBounds ? unionBounds(movedBounds, shapeBounds) : shapeBounds
      }
    })

    return movedBounds
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
