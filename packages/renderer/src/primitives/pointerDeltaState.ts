import { createSignal } from 'solid-js'
import type { Point } from '@diagen/shared'
import type { EventToCanvas } from './createCoordinateService'
import type { DragMoveState } from './createDragSession'

interface PointerEventLike {
  clientX: number
  clientY: number
}

export interface CreatePointerDeltaStateOptions {
  eventToCanvas?: EventToCanvas
}

export function createPointerDeltaState(options: CreatePointerDeltaStateOptions = {}) {
  const { eventToCanvas } = options
  const [startPointerCanvas, setStartPointerCanvas] = createSignal<Point | null>(null)

  function setStartFromEvent(event: PointerEventLike): void {
    setStartPointerCanvas(eventToCanvas ? eventToCanvas(event) : null)
  }

  function clear(): void {
    setStartPointerCanvas(null)
  }

  function resolveDelta(params: { moveState: DragMoveState; zoom: number; event: PointerEventLike }): Point {
    const { moveState, zoom, event } = params
    const startPoint = startPointerCanvas()
    if (eventToCanvas && startPoint) {
      const current = eventToCanvas(event)
      return {
        x: current.x - startPoint.x,
        y: current.y - startPoint.y,
      }
    }

    return {
      x: moveState.dx / zoom,
      y: moveState.dy / zoom,
    }
  }

  return {
    startPointerCanvas,
    setStartFromEvent,
    clear,
    resolveDelta,
  }
}

export type CreatePointerDeltaState = ReturnType<typeof createPointerDeltaState>
