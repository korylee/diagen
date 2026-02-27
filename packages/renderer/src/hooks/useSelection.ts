import { createSignal, createMemo, onCleanup } from 'solid-js'
import type { Point, Rect } from '@diagen/shared'

export interface UseSelectionOptions {
  onStart?: (startPoint: Point) => void
  onChange?: (rect: Rect) => void
  onEnd?: (rect: Rect) => void
  minSize?: number
}

export interface UseSelectionReturn {
  isSelecting: () => boolean
  selectionRect: () => Rect | null
  start: (point: Point) => void
  update: (point: Point) => void
  end: () => void
  cancel: () => void
}

export function useSelection(options: UseSelectionOptions = {}): UseSelectionReturn {
  const { minSize = 5 } = options

  const [isSelecting, setIsSelecting] = createSignal(false)
  const [startPoint, setStartPoint] = createSignal<Point | null>(null)
  const [endPoint, setEndPoint] = createSignal<Point | null>(null)

  const selectionRect = createMemo<Rect | null>(() => {
    const start = startPoint()
    const end = endPoint()
    if (!start || !end) return null
    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    return {
      x,
      y,
      w: Math.abs(end.x - start.x),
      h: Math.abs(end.y - start.y)
    }
  })

  const isValidSelection = () => {
    const rect = selectionRect()
    return rect && (rect.w >= minSize || rect.h >= minSize)
  }

  const start = (point: Point) => {
    setStartPoint(point)
    setEndPoint(point)
    setIsSelecting(true)
    options.onStart?.(point)
  }

  const update = (point: Point) => {
    if (!isSelecting()) return
    setEndPoint(point)
    const rect = selectionRect()
    if (rect) options.onChange?.(rect)
  }

  const end = () => {
    if (!isSelecting()) return
    const rect = selectionRect()
    if (rect && isValidSelection()) {
      options.onEnd?.(rect)
    }
    setIsSelecting(false)
    setStartPoint(null)
    setEndPoint(null)
  }

  const cancel = () => {
    setIsSelecting(false)
    setStartPoint(null)
    setEndPoint(null)
  }

  return {
    isSelecting,
    selectionRect,
    start,
    update,
    end,
    cancel
  }
}
