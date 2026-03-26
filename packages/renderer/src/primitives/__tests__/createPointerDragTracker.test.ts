import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { createPointerDragTracker } from '../createPointerDragTracker'

describe('createPointerDragTracker', () => {
  it('未超过阈值时应保持 pending 且不进入 dragging', () => {
    createRoot(dispose => {
      const tracker = createPointerDragTracker({ threshold: 3 })

      tracker.begin({ x: 10, y: 20 })
      const moveState = tracker.update({ x: 12, y: 22 })

      expect(tracker.isPending()).toBe(true)
      expect(tracker.isDragging()).toBe(false)
      expect(moveState).toEqual({
        dx: 2,
        dy: 2,
        shouldUpdate: false,
      })
      expect(tracker.delta()).toEqual({
        x: 2,
        y: 2,
      })
      expect(tracker.finish()).toBe(false)
      expect(tracker.isPending()).toBe(false)
      expect(tracker.delta()).toEqual({
        x: 0,
        y: 0,
      })

      dispose()
    })
  })

  it('超过阈值后应进入 dragging 并在 finish 时返回 true', () => {
    createRoot(dispose => {
      const tracker = createPointerDragTracker({ threshold: 3 })

      tracker.begin({ x: 0, y: 0 })
      const moveState = tracker.update({ x: 4, y: 0 })

      expect(moveState).toEqual({
        dx: 4,
        dy: 0,
        shouldUpdate: true,
      })
      expect(tracker.isPending()).toBe(true)
      expect(tracker.isDragging()).toBe(true)
      expect(tracker.delta()).toEqual({
        x: 4,
        y: 0,
      })
      expect(tracker.finish()).toBe(true)
      expect(tracker.isDragging()).toBe(false)
      expect(tracker.isPending()).toBe(false)

      dispose()
    })
  })

  it('threshold 为 0 时 begin 后应立即处于 dragging 状态，并支持 cancel', () => {
    createRoot(dispose => {
      const tracker = createPointerDragTracker({ threshold: 0 })

      tracker.begin({ x: 5, y: 6 })

      expect(tracker.isPending()).toBe(true)
      expect(tracker.isDragging()).toBe(true)

      tracker.cancel()

      expect(tracker.isPending()).toBe(false)
      expect(tracker.isDragging()).toBe(false)
      expect(tracker.update({ x: 10, y: 10 })).toBeNull()

      dispose()
    })
  })
})
