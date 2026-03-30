import type { Point } from '@diagen/shared'
import type { PointerDragMoveState } from './createPointerDragTracker'
import type { EventToCanvas } from '../../createCoordinateService'

export interface CreatePointerDeltaStateOptions {
  eventToCanvas?: EventToCanvas
}

type PointerEventLike = Parameters<EventToCanvas>[0]

export function createPointerDeltaState(options: CreatePointerDeltaStateOptions = {}) {
  const { eventToCanvas } = options
  let startPointerCanvas: Point | null = null

  function begin(event: PointerEventLike): void {
    startPointerCanvas = eventToCanvas ? eventToCanvas(event) : null
  }

  function reset(): void {
    startPointerCanvas = null
  }

  function resolveDelta(params: { moveState: PointerDragMoveState; zoom: number; event: PointerEventLike }): Point {
    const { moveState, zoom, event } = params
    if (eventToCanvas && startPointerCanvas) {
      const current = eventToCanvas(event)
      return {
        x: current.x - startPointerCanvas.x,
        y: current.y - startPointerCanvas.y,
      }
    }

    return {
      x: moveState.dx / zoom,
      y: moveState.dy / zoom,
    }
  }

  return {
    begin,
    reset,
    resolveDelta,
  }
}

export type CreatePointerDeltaState = ReturnType<typeof createPointerDeltaState>
