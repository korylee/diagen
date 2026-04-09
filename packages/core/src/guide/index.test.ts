import type { Bounds } from '@diagen/shared'
import { describe, expect, it } from 'vitest'
import { calculateMoveGuideSnap, calculateResizeGuideSnap } from '.'

describe('guide', () => {
  describe('calculateMoveGuideSnap', () => {
    it('应在容差内吸附到候选边线', () => {
      const movingBounds: Bounds = { x: 10, y: 10, w: 40, h: 30 }
      const candidates: Bounds[] = [{ x: 100, y: 0, w: 60, h: 40 }]

      const result = calculateMoveGuideSnap({
        movingBounds,
        delta: { x: 87, y: 0 },
        candidates,
        tolerance: 4,
      })

      expect(result.snappedX).toBe(true)
      expect(result.delta.x).toBe(90)
      expect(result.guides.some(line => line.axis === 'x' && line.pos === 100)).toBe(true)
    })

    it('应支持中心线吸附', () => {
      const movingBounds: Bounds = { x: 0, y: 0, w: 20, h: 20 }
      const candidates: Bounds[] = [{ x: 80, y: 0, w: 40, h: 20 }] // center.x = 100

      const result = calculateMoveGuideSnap({
        movingBounds,
        delta: { x: 89, y: 0 }, // move center = 99
        candidates,
        tolerance: 2,
      })

      expect(result.snappedX).toBe(true)
      expect(result.delta.x).toBe(90)
      expect(result.guides.some(line => line.axis === 'x' && line.pos === 100)).toBe(true)
    })

    it('应为垂直 guide line 计算对象间净间距', () => {
      const movingBounds: Bounds = { x: 10, y: 10, w: 40, h: 30 }
      const candidates: Bounds[] = [{ x: 100, y: 80, w: 60, h: 40 }]

      const result = calculateMoveGuideSnap({
        movingBounds,
        delta: { x: 87, y: 0 },
        candidates,
        tolerance: 4,
      })

      const guide = result.guides.find(line => line.axis === 'x')
      expect(guide?.distance).toBe(40)
      expect(guide?.distanceFrom).toBe(40)
      expect(guide?.distanceTo).toBe(80)
    })

    it('超出容差时不吸附', () => {
      const movingBounds: Bounds = { x: 0, y: 0, w: 20, h: 20 }
      const candidates: Bounds[] = [{ x: 100, y: 100, w: 30, h: 30 }]

      const result = calculateMoveGuideSnap({
        movingBounds,
        delta: { x: 76, y: 0 },
        candidates,
        tolerance: 3,
      })

      expect(result.snappedX).toBe(false)
      expect(result.snappedY).toBe(false)
      expect(result.delta).toEqual({ x: 76, y: 0 })
      expect(result.guides).toHaveLength(0)
    })

    it('应支持双轴同时吸附', () => {
      const movingBounds: Bounds = { x: 10, y: 10, w: 30, h: 30 }
      const candidates: Bounds[] = [{ x: 60, y: 80, w: 50, h: 40 }]

      const result = calculateMoveGuideSnap({
        movingBounds,
        delta: { x: 49, y: 69 },
        candidates,
        tolerance: 2,
      })

      expect(result.snappedX).toBe(true)
      expect(result.snappedY).toBe(true)
      expect(result.delta).toEqual({ x: 50, y: 70 })
      expect(result.guides).toHaveLength(2)
    })
  })

  describe('calculateResizeGuideSnap', () => {
    it('应在向东缩放时吸附右边线', () => {
      const result = calculateResizeGuideSnap({
        draftBounds: { x: 10, y: 10, w: 40, h: 30 },
        direction: 'e',
        candidates: [{ x: 53, y: 0, w: 20, h: 20 }],
        tolerance: 4,
      })

      expect(result.snappedX).toBe(true)
      expect(result.bounds.x).toBe(10)
      expect(result.bounds.w).toBe(43)
      expect(result.guides.some(line => line.axis === 'x' && line.pos === 53)).toBe(true)
    })

    it('应为 resize guide line 计算对象间净间距', () => {
      const result = calculateResizeGuideSnap({
        draftBounds: { x: 100, y: 100, w: 130, h: 80 },
        direction: 'e',
        candidates: [{ x: 230, y: 240, w: 80, h: 80 }],
        tolerance: 4,
      })

      const guide = result.guides.find(line => line.axis === 'x')
      expect(guide?.distance).toBe(60)
      expect(guide?.distanceFrom).toBe(180)
      expect(guide?.distanceTo).toBe(240)
    })

    it('应在向西缩放时吸附左边线并更新宽度', () => {
      const result = calculateResizeGuideSnap({
        draftBounds: { x: 100, y: 10, w: 40, h: 30 },
        direction: 'w',
        candidates: [{ x: 60, y: 0, w: 38, h: 20 }], // right = 98
        tolerance: 3,
      })

      expect(result.snappedX).toBe(true)
      expect(result.bounds.x).toBe(98)
      expect(result.bounds.w).toBe(42)
    })

    it('应在向北缩放时吸附上边线并更新高度', () => {
      const result = calculateResizeGuideSnap({
        draftBounds: { x: 20, y: 50, w: 40, h: 30 },
        direction: 'n',
        candidates: [{ x: 0, y: 10, w: 30, h: 38 }], // bottom = 48
        tolerance: 3,
      })

      expect(result.snappedY).toBe(true)
      expect(result.bounds.y).toBe(48)
      expect(result.bounds.h).toBe(32)
      expect(result.guides.some(line => line.axis === 'y' && line.pos === 48)).toBe(true)
    })

    it('当吸附会突破最小尺寸时应放弃吸附', () => {
      const result = calculateResizeGuideSnap({
        draftBounds: { x: 100, y: 20, w: 20, h: 20 },
        direction: 'w',
        candidates: [{ x: 0, y: 0, w: 105, h: 20 }], // right = 105, delta = +5, width 会变为 15
        tolerance: 6,
        minWidth: 20,
      })

      expect(result.snappedX).toBe(false)
      expect(result.bounds).toEqual({ x: 100, y: 20, w: 20, h: 20 })
      expect(result.guides).toHaveLength(0)
    })
  })
})
