import { createSignal, createMemo, onCleanup } from 'solid-js'
import type { Point } from '@diagen/shared'

export interface UseDragOptions {
  onStart?: (startPoint: Point, event: MouseEvent) => void | boolean
  onMove?: (delta: Point, event: MouseEvent) => void
  onEnd?: (endPoint: Point, event: MouseEvent) => void
  threshold?: number
}

export interface UseDragReturn {
  isDragging: () => boolean
  startPoint: () => Point | null
  currentPoint: () => Point | null
  delta: () => Point
  start: (event: MouseEvent) => void
  cancel: () => void
}

export function useDrag(options: UseDragOptions = {}): UseDragReturn {
  const { threshold = 0 } = options

  const [isDragging, setIsDragging] = createSignal(false)
  const [startPoint, setStartPoint] = createSignal<Point | null>(null)
  const [currentPoint, setCurrentPoint] = createSignal<Point | null>(null)
  const [isTriggered, setIsTriggered] = createSignal(false)

  const delta = createMemo<Point>(() => {
    const start = startPoint()
    const current = currentPoint()
    if (!start || !current) return { x: 0, y: 0 }
    return { x: current.x - start.x, y: current.y - start.y }
  })

  const handleMouseMove = (e: MouseEvent) => {
    const point: Point = { x: e.clientX, y: e.clientY }
    setCurrentPoint(point)

    if (!isTriggered()) {
      const d = delta()
      if (Math.abs(d.x) > threshold || Math.abs(d.y) > threshold) {
        setIsTriggered(true)
        setIsDragging(true)
      }
      return
    }

    options.onMove?.(delta(), e)
  }

  const handleMouseUp = (e: MouseEvent) => {
    const point: Point = { x: e.clientX, y: e.clientY }

    if (isDragging()) {
      options.onEnd?.(point, e)
    }

    setIsDragging(false)
    setStartPoint(null)
    setCurrentPoint(null)
    setIsTriggered(false)

    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  const start = (event: MouseEvent) => {
    const point: Point = { x: event.clientX, y: event.clientY }

    const shouldStart = options.onStart?.(point, event)
    if (shouldStart === false) return

    setStartPoint(point)
    setCurrentPoint(point)
    setIsTriggered(threshold === 0)
    setIsDragging(threshold === 0)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const cancel = () => {
    setIsDragging(false)
    setStartPoint(null)
    setCurrentPoint(null)
    setIsTriggered(false)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  onCleanup(cancel)

  return {
    isDragging,
    startPoint,
    currentPoint,
    delta,
    start,
    cancel
  }
}
