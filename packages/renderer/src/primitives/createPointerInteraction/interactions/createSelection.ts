import { batch, createMemo, createSignal } from 'solid-js'
import { type Bounds, isBoundsIntersect, type Point } from '@diagen/shared'
import { useDesigner } from '../../../components'

// ============================================================================
// 框选 Hook - 与 Designer 集成
// ============================================================================

export function createSelection(options: { minSize?: number } = {}) {
  const { minSize = 5 } = options
  const { selection, element } = useDesigner()

  const [isActive, setIsActive] = createSignal(false)
  const [startPoint, setStartPoint] = createSignal<Point | null>(null)
  const [endPoint, setEndPoint] = createSignal<Point | null>(null)

  const bounds = createMemo<Bounds | null>(() => {
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

  const start = (point: Point): boolean => {
    if (isActive()) return false
    batch(() => {
      setStartPoint(point)
      setEndPoint(point)
      setIsActive(true)
    })
    return true
  }

  const move = (point: Point) => {
    if (isActive()) {
      setEndPoint(point)
    }
  }

  const end = () => {
    const r = bounds()
    if (r && r.w >= minSize && r.h >= minSize) {
      selectInBounds(r)
    }
    reset()
  }

  const cancel = () => {
    reset()
  }

  const reset = () => {
    batch(() => {
      setIsActive(false)
      setStartPoint(null)
      setEndPoint(null)
    })
  }

  const selectInBounds = (r: Bounds) => {
    const ids: string[] = []
    for (const el of element.shapes()) {
      const elRect = { x: el.props.x, y: el.props.y, w: el.props.w, h: el.props.h }
      if (isBoundsIntersect(r, elRect)) {
        ids.push(el.id)
      }
    }
    if (ids.length > 0) {
      selection.replace(ids)
    }
  }

  return { isActive, bounds, start, move, end, cancel }
}

export type CreateSelection = ReturnType<typeof createSelection>
