import { batch, createMemo, createSignal } from 'solid-js'
import { isRectIntersect, type Point, type Rect } from '@diagen/shared'
import { useDesigner } from '../components'

// ============================================================================
// 框选 Hook - 与 Designer 集成
// ============================================================================

export function useSelection(options: { minSize?: number } = {}) {
  const { minSize = 5 } = options
  const designer = useDesigner()

  const [isSelecting, setIsSelecting] = createSignal(false)
  const [startPoint, setStartPoint] = createSignal<Point | null>(null)
  const [endPoint, setEndPoint] = createSignal<Point | null>(null)

  const rect = createMemo<Rect | null>(() => {
    const start = startPoint()
    const end = endPoint()
    if (!start || !end) return null
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      w: Math.abs(end.x - start.x),
      h: Math.abs(end.y - start.y),
    }
  })

  const start = (point: Point) => {
    batch(() => {
      setStartPoint(point)
      setEndPoint(point)
      setIsSelecting(true)
    })
  }

  const move = (point: Point) => {
    if (isSelecting()) {
      setEndPoint(point)
    }
  }

  const end = () => {
    const r = rect()
    if (r && r.w >= minSize && r.h >= minSize) {
      selectInRect(r)
    }
    reset()
  }

  const cancel = () => {
    reset()
  }

  const reset = () => {
    batch(() => {
      setIsSelecting(false)
      setStartPoint(null)
      setEndPoint(null)
    })
  }

  const selectInRect = (r: Rect) => {
    const ids: string[] = []
    for (const el of designer.element.shapes()) {
      const elRect = { x: el.props.x, y: el.props.y, w: el.props.w, h: el.props.h }
      if (isRectIntersect(r, elRect)) {
        ids.push(el.id)
      }
    }
    if (ids.length > 0) {
      designer.selection.replace(ids)
    }
  }

  return { isSelecting, rect, start, move, end, cancel }
}
