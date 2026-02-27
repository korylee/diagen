import { createSignal, createMemo, onCleanup } from 'solid-js'
import type { Point, Rect } from '@diagen/shared'

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface UseResizeOptions {
  onStart?: (direction: ResizeDirection, startBounds: Rect) => void
  onChange?: (newBounds: Rect) => void
  onEnd?: (newBounds: Rect) => void
  minWidth?: number
  minHeight?: number
}

export interface UseResizeReturn {
  isResizing: () => boolean
  direction: () => ResizeDirection | null
  start: (direction: ResizeDirection, startBounds: Rect, startPoint: Point) => void
  update: (currentPoint: Point, modifiers?: { shift?: boolean; alt?: boolean }) => void
  end: () => void
  cancel: () => void
}

export function useResize(options: UseResizeOptions = {}): UseResizeReturn {
  const { minWidth = 20, minHeight = 20 } = options

  const [isResizing, setIsResizing] = createSignal(false)
  const [direction, setDirection] = createSignal<ResizeDirection | null>(null)
  const [startBounds, setStartBounds] = createSignal<Rect | null>(null)
  const [startPoint, setStartPoint] = createSignal<Point | null>(null)
  const [currentBounds, setCurrentBounds] = createSignal<Rect | null>(null)

  const calculateNewBounds = (
    dir: ResizeDirection,
    bounds: Rect,
    start: Point,
    current: Point,
    modifiers: { shift?: boolean; alt?: boolean } = {}
  ): Rect => {
    const { shift = false, alt = false } = modifiers
    const dx = current.x - start.x
    const dy = current.y - start.y

    let newBounds = { ...bounds }

    if (dir.includes('n')) {
      newBounds.y = bounds.y + dy
      newBounds.h = bounds.h - dy
    }
    if (dir.includes('s')) {
      newBounds.h = bounds.h + dy
    }
    if (dir.includes('w')) {
      newBounds.x = bounds.x + dx
      newBounds.w = bounds.w - dx
    }
    if (dir.includes('e')) {
      newBounds.w = bounds.w + dx
    }

    if (shift) {
      const ratio = bounds.w / bounds.h
      if (['n', 's'].includes(dir)) {
        newBounds.w = newBounds.h * ratio
      } else if (['e', 'w'].includes(dir)) {
        newBounds.h = newBounds.w / ratio
      } else {
        if (Math.abs(dx) > Math.abs(dy)) {
          newBounds.h = newBounds.w / ratio
        } else {
          newBounds.w = newBounds.h * ratio
        }
      }
    }

    if (alt) {
      const cx = bounds.x + bounds.w / 2
      const cy = bounds.y + bounds.h / 2
      newBounds.x = cx - newBounds.w / 2
      newBounds.y = cy - newBounds.h / 2
    }

    newBounds.w = Math.max(minWidth, newBounds.w)
    newBounds.h = Math.max(minHeight, newBounds.h)

    return newBounds
  }

  const handleMouseMove = (e: MouseEvent) => {
    const dir = direction()
    const bounds = startBounds()
    const start = startPoint()
    if (!dir || !bounds || !start) return

    const current: Point = { x: e.clientX, y: e.clientY }
    const newBounds = calculateNewBounds(dir, bounds, start, current, {
      shift: e.shiftKey,
      alt: e.altKey
    })
    setCurrentBounds(newBounds)
    options.onChange?.(newBounds)
  }

  const handleMouseUp = () => {
    const bounds = currentBounds()
    if (bounds) options.onEnd?.(bounds)
    setIsResizing(false)
    setDirection(null)
    setStartBounds(null)
    setStartPoint(null)
    setCurrentBounds(null)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  const start = (dir: ResizeDirection, bounds: Rect, point: Point) => {
    setDirection(dir)
    setStartBounds(bounds)
    setStartPoint(point)
    setCurrentBounds(bounds)
    setIsResizing(true)
    options.onStart?.(dir, bounds)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const update = (currentPoint: Point, modifiers = {}) => {
    const dir = direction()
    const bounds = startBounds()
    const start = startPoint()
    if (!dir || !bounds || !start) return

    const newBounds = calculateNewBounds(dir, bounds, start, currentPoint, modifiers)
    setCurrentBounds(newBounds)
    options.onChange?.(newBounds)
  }

  const end = () => {
    const bounds = currentBounds()
    if (bounds) options.onEnd?.(bounds)
    setIsResizing(false)
    setDirection(null)
    setStartBounds(null)
    setStartPoint(null)
    setCurrentBounds(null)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  const cancel = () => {
    setIsResizing(false)
    setDirection(null)
    setStartBounds(null)
    setStartPoint(null)
    setCurrentBounds(null)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  onCleanup(cancel)

  return {
    isResizing,
    direction,
    start,
    update,
    end,
    cancel
  }
}
