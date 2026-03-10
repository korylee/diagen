import { batch, createSignal, onCleanup } from 'solid-js'
import { isShape } from '@diagen/core'
import { unionBounds } from '@diagen/shared'
import type { Bounds, Point } from '@diagen/shared'
import { useDesigner } from '../components'
import { createDragSession, type CreateDragSessionOptions } from './createDragSession'
import { resolveCanvasDelta, type EventToCanvas } from './resolveCanvasDelta'

// ============================================================================
// 图形拖动 Hook - 与 Designer 集成
// ============================================================================

export interface UseShapeDragOptions extends CreateDragSessionOptions {
  eventToCanvas?: EventToCanvas
}

export function createShapeDrag(options: UseShapeDragOptions = {}) {
  const { threshold = 3, eventToCanvas } = options
  const designer = useDesigner()
  const session = createDragSession({ threshold })
  const transaction = designer.history.transaction.createScope('拖拽图形')

  const [startPositions, setStartPositions] = createSignal<Record<string, Point>>({})
  const [startPointerCanvas, setStartPointerCanvas] = createSignal<Point | null>(null)

  const start = (e: MouseEvent, ids?: string[]) => {
    const targetIds = ids ?? designer.selection.selectedIds()
    if (targetIds.length === 0) return

    const positions: Record<string, Point> = {}
    for (const id of targetIds) {
      const el = designer.element.getById(id)
      if (el && isShape(el)) {
        positions[id] = { x: el.props.x, y: el.props.y }
      }
    }

    if (Object.keys(positions).length === 0) return

    if (!transaction.begin()) return

    setStartPositions(positions)
    setStartPointerCanvas(eventToCanvas ? eventToCanvas(e) : null)
    session.begin({ x: e.clientX, y: e.clientY })
  }

  const move = (e: MouseEvent) => {
    const moveState = session.update({ x: e.clientX, y: e.clientY })
    if (!moveState || !moveState.shouldUpdate) return

    const zoom = designer.state.viewport.zoom
    const positions = startPositions()
    const delta = resolveCanvasDelta({
      moveState,
      zoom,
      startPointerCanvas: startPointerCanvas(),
      event: e,
      eventToCanvas,
    })
    let movedBounds: Bounds | null = null

    batch(() => {
      for (const [id, startPos] of Object.entries(positions)) {
        const el = designer.element.getById(id)
        if (!el || !isShape(el)) continue

        const nextX = startPos.x + delta.x
        const nextY = startPos.y + delta.y
        designer.edit.update(id, {
          props: {
            ...el.props,
            x: nextX,
            y: nextY,
          },
        })

        const shapeBounds: Bounds = { x: nextX, y: nextY, w: el.props.w, h: el.props.h }
        movedBounds = movedBounds ? unionBounds(movedBounds, shapeBounds) : shapeBounds
      }
    })

    designer.view.scheduleAutoGrow(movedBounds ?? undefined)
  }

  const end = () => {
    if (!session.isPending()) return

    const dragged = session.finish()
    if (dragged) {
      designer.view.flushAutoGrow()
      transaction.commit()
    } else {
      transaction.abort()
    }
    setStartPositions({})
    setStartPointerCanvas(null)
  }

  const cancel = () => {
    if (!session.isPending()) return
    transaction.abort()
    session.cancel()
    setStartPositions({})
    setStartPointerCanvas(null)
  }

  onCleanup(() => {
    if (session.isPending()) cancel()
  })

  return {
    isDragging: session.isDragging,
    isPending: session.isPending,
    delta: session.delta,
    start,
    move,
    end,
    cancel,
  }
}

export type CreateShapeDrag = ReturnType<typeof createShapeDrag>
