import type { Bounds, Point } from '@diagen/shared'
import { describe, expect, it } from 'vitest'
import { canvasToScreen, screenToCanvas, type Viewport } from '../transform'

describe('transform', () => {
  describe('screenToCanvas', () => {
    it('应正确将屏幕点转换为画布点（含 canvasOffset）', () => {
      const viewport: Viewport = { x: 120, y: 80, zoom: 2 }
      const canvasOffset: Point = { x: 30, y: 10 }
      const point: Point = { x: 250, y: 170 }

      const result = screenToCanvas(point, viewport, canvasOffset)

      expect(result).toEqual({ x: 50, y: 40 })
    })

    it('应正确将屏幕矩形转换为画布矩形（宽高应除以 zoom）', () => {
      const viewport: Viewport = { x: 40, y: 20, zoom: 2.5 }
      const screenBounds: Bounds = { x: 165, y: 95, w: 250, h: 125 }

      const result = screenToCanvas(screenBounds, viewport)

      expect(result.x).toBeCloseTo(50)
      expect(result.y).toBeCloseTo(30)
      expect(result.w).toBeCloseTo(100)
      expect(result.h).toBeCloseTo(50)
    })
  })

  describe('canvasToScreen + screenToCanvas', () => {
    it('点坐标应满足可逆性', () => {
      const viewport: Viewport = { x: -32, y: 145, zoom: 1.75 }
      const canvasOffset: Point = { x: 24, y: -16 }
      const canvasPoint: Point = { x: 81.2, y: -43.6 }

      const screenPoint = canvasToScreen(canvasPoint, viewport, canvasOffset)
      const restoredPoint = screenToCanvas(screenPoint, viewport, canvasOffset)

      expect(restoredPoint.x).toBeCloseTo(canvasPoint.x)
      expect(restoredPoint.y).toBeCloseTo(canvasPoint.y)
    })

    it('矩形坐标应满足可逆性', () => {
      const viewport: Viewport = { x: 220, y: -90, zoom: 0.75 }
      const canvasOffset: Point = { x: -12, y: 36 }
      const canvasBounds: Bounds = { x: -100, y: 50, w: 240, h: 120 }

      const screenBounds = canvasToScreen(canvasBounds, viewport, canvasOffset)
      const restoredBounds = screenToCanvas(screenBounds, viewport, canvasOffset)

      expect(restoredBounds.x).toBeCloseTo(canvasBounds.x)
      expect(restoredBounds.y).toBeCloseTo(canvasBounds.y)
      expect(restoredBounds.w).toBeCloseTo(canvasBounds.w)
      expect(restoredBounds.h).toBeCloseTo(canvasBounds.h)
    })
  })
})

