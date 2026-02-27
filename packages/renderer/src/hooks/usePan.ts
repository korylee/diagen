import { createSignal, createMemo, onCleanup } from 'solid-js'
import type { Point } from '@diagen/shared'

export interface UsePanOptions {
  onStart?: () => void
  onChange?: (delta: Point) => void
  onEnd?: (totalDelta: Point) => void
}

export interface UsePanReturn {
  isPanning: () => boolean
  delta: () => Point
  start: (event: MouseEvent) => void
  cancel: () => void
}

export function usePan(options: UsePanOptions = {}): UsePanReturn {
  const [isPanning, setIsPanning] = createSignal(false)
  const [startPoint, setStartPoint] = createSignal<Point | null>(null)
  const [currentPoint, setCurrentPoint] = createSignal<Point | null>(null)

  const delta = createMemo<Point>(() => {
    const start = startPoint()
    const current = currentPoint()
    if (!start || !current) return { x: 0, y: 0 }
    return { x: current.x - start.x, y: current.y - start.y }
  })

  const handleMouseMove = (e: MouseEvent) => {
    setCurrentPoint({ x: e.clientX, y: e.clientY })
    options.onChange?.(delta())
  }

  const handleMouseUp = () => {
    options.onEnd?.(delta())
    setIsPanning(false)
    setStartPoint(null)
    setCurrentPoint(null)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  const start = (event: MouseEvent) => {
    const point: Point = { x: event.clientX, y: event.clientY }
    setStartPoint(point)
    setCurrentPoint(point)
    setIsPanning(true)
    options.onStart?.()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const cancel = () => {
    setIsPanning(false)
    setStartPoint(null)
    setCurrentPoint(null)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  onCleanup(cancel)

  return {
    isPanning,
    delta,
    start,
    cancel
  }
}
