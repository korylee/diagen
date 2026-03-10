import type { Point } from '@diagen/shared'
import type { DragMoveState } from './createDragSession'
import type { EventToCanvas } from '../utils/coordinate'

export type { EventToCanvas } from '../utils/coordinate'

interface ResolveCanvasDeltaOptions {
  moveState: DragMoveState
  zoom: number
  startPointerCanvas: Point | null
  event: { clientX: number; clientY: number }
  eventToCanvas?: EventToCanvas
}

/**
 * 统一拖拽增量计算：
 * - 优先使用画布坐标差值（可覆盖拖拽中滚动导致的坐标系变化）
 * - 兜底使用 client 位移 / zoom（兼容未注入 eventToCanvas 的场景）
 */
export function resolveCanvasDelta(options: ResolveCanvasDeltaOptions): Point {
  const { moveState, zoom, startPointerCanvas, event, eventToCanvas } = options
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
