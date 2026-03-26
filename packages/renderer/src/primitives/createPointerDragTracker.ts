import type { Point } from '@diagen/shared'
import { batch, createMemo, createSignal } from 'solid-js'

export interface CreatePointerDragTrackerOptions {
  threshold?: number
}

export interface PointerDragMoveState {
  dx: number
  dy: number
  shouldUpdate: boolean
}

export function createPointerDragTracker(options: CreatePointerDragTrackerOptions = {}) {
  const { threshold = 3 } = options

  const [isDragging, setIsDragging] = createSignal<boolean>(false)
  const [isPending, setIsPending] = createSignal<boolean>(false)
  const [startMouse, setStartMouse] = createSignal<Point | null>(null)
  const [lastMouse, setLastMouse] = createSignal<Point | null>(null)

  const delta = createMemo<Point>(() => {
    const start = startMouse()
    const last = lastMouse()
    if (!start || !last) return { x: 0, y: 0 }
    return { x: last.x - start.x, y: last.y - start.y }
  })

  function begin(point: Point): void {
    batch(() => {
      setStartMouse(point)
      setLastMouse(point)
      setIsPending(true)
      setIsDragging(threshold === 0)
    })
  }

  function update(point: Point): PointerDragMoveState | null {
    if (!isPending()) return null
    const start = startMouse()
    if (!start) return null

    const dx = point.x - start.x
    const dy = point.y - start.y

    if (!isDragging()) {
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        setLastMouse(point)
        return { dx, dy, shouldUpdate: false }
      }
      setIsDragging(true)
    }

    setLastMouse(point)
    return { dx, dy, shouldUpdate: true }
  }

  function finish(): boolean {
    const dragged = isDragging()
    reset()
    return dragged
  }

  function cancel(): void {
    reset()
  }

  function reset(): void {
    batch(() => {
      setIsDragging(false)
      setIsPending(false)
      setStartMouse(null)
      setLastMouse(null)
    })
  }

  return {
    isDragging,
    isPending,
    delta,
    begin,
    update,
    finish,
    cancel,
    reset,
  }
}

export type CreatePointerDragTracker = ReturnType<typeof createPointerDragTracker>
