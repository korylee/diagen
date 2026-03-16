import { describe, expect, it } from 'vitest'
import {
  expandBounds,
  getAngle,
  getBoundsCenter,
  getBoundsIntersection,
  getDistance,
  getDistanceSquared,
  getRotatedBoxBounds,
  isBoundsIntersect,
  isPointInBounds,
  isPointInRotatedBounds,
  isPointNearLine,
  lineIntersectsBounds,
  manhattanDistance,
  normalizeBounds,
  rotatePoint,
  scalePoint,
  snapToGrid,
  unionBounds,
} from '../index'

describe('geometry', () => {
  describe('getDistance / getDistanceSquared', () => {
    it('应该正确计算两点距离', () => {
      expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    })

    it('应该正确计算两点距离平方', () => {
      expect(getDistanceSquared({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25)
    })

    it('distance 的平方应等于 distanceSquared', () => {
      const p1 = { x: -2, y: 7 }
      const p2 = { x: 5, y: -1 }
      expect(getDistance(p1, p2) ** 2).toBeCloseTo(getDistanceSquared(p1, p2), 8)
    })
  })

  describe('isPointInBounds', () => {
    const bounds = { x: 10, y: 20, w: 100, h: 80 }

    it('应该判断矩形内部点为 true', () => {
      expect(isPointInBounds({ x: 30, y: 40 }, bounds)).toBe(true)
    })

    it('应该将边界点视为 true', () => {
      expect(isPointInBounds({ x: 10, y: 20 }, bounds)).toBe(true)
      expect(isPointInBounds({ x: 110, y: 100 }, bounds)).toBe(true)
    })

    it('应该判断矩形外部点为 false', () => {
      expect(isPointInBounds({ x: 9, y: 20 }, bounds)).toBe(false)
      expect(isPointInBounds({ x: 111, y: 100 }, bounds)).toBe(false)
    })
  })

  describe('isPointInRotatedBounds', () => {
    const bounds = { x: 0, y: 0, w: 100, h: 50 }

    it('angle=0 时应退化为普通矩形判断', () => {
      expect(isPointInRotatedBounds({ x: 10, y: 10 }, bounds, 0)).toBe(true)
      expect(isPointInRotatedBounds({ x: 200, y: 10 }, bounds, 0)).toBe(false)
    })

    it('旋转后应能正确判断内部和外部点', () => {
      expect(isPointInRotatedBounds({ x: 50, y: 25 }, bounds, 90)).toBe(true)
      expect(isPointInRotatedBounds({ x: 0, y: 0 }, bounds, 90)).toBe(false)
    })
  })

  describe('getRotatedBoxBounds', () => {
    it('angle 缺省或 0 时应返回原 bounds', () => {
      const b = { x: 10, y: 20, w: 40, h: 30 }
      expect(getRotatedBoxBounds(b)).toEqual(b)
      expect(getRotatedBoxBounds({ ...b, angle: 0 })).toEqual(b)
    })

    it('90 度旋转后宽高应互换且中心不变', () => {
      const src = { x: 10, y: 20, w: 100, h: 50, angle: 90 }
      const result = getRotatedBoxBounds(src)
      const srcCenter = { x: src.x + src.w / 2, y: src.y + src.h / 2 }
      const dstCenter = { x: result.x + result.w / 2, y: result.y + result.h / 2 }

      expect(result.w).toBeCloseTo(50, 8)
      expect(result.h).toBeCloseTo(100, 8)
      expect(dstCenter.x).toBeCloseTo(srcCenter.x, 8)
      expect(dstCenter.y).toBeCloseTo(srcCenter.y, 8)
    })
  })

  describe('bounds 相关函数', () => {
    it('getBoundsCenter 应返回中心点', () => {
      expect(getBoundsCenter({ x: 10, y: 20, w: 40, h: 60 })).toEqual({ x: 30, y: 50 })
    })

    it('normalizeBounds 应将负宽高规范化', () => {
      expect(normalizeBounds({ x: 10, y: 20, w: -30, h: -40 })).toEqual({ x: -20, y: -20, w: 30, h: 40 })
    })

    it('unionBounds 应返回最小并集矩形', () => {
      const b1 = { x: 0, y: 0, w: 10, h: 20 }
      const b2 = { x: 5, y: 10, w: 20, h: 10 }
      expect(unionBounds(b1, b2)).toEqual({ x: 0, y: 0, w: 25, h: 20 })
    })

    it('isBoundsIntersect 应判断相交和分离', () => {
      expect(isBoundsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 10, w: 5, h: 5 })).toBe(true)
      expect(isBoundsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 11, y: 0, w: 5, h: 5 })).toBe(false)
    })

    it('getBoundsIntersection 应返回相交区域', () => {
      expect(getBoundsIntersection({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 6, w: 10, h: 10 })).toEqual({
        x: 5,
        y: 6,
        w: 5,
        h: 4,
      })
    })

    it('getBoundsIntersection 无重叠时应返回 null', () => {
      expect(getBoundsIntersection({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 5, h: 5 })).toBeNull()
    })
  })

  describe('isPointNearLine', () => {
    it('应判断点是否在阈值附近', () => {
      const line = { x1: 0, y1: 0, x2: 10, y2: 0 }
      expect(isPointNearLine({ x: 5, y: 2 }, line, 2)).toBe(true)
      expect(isPointNearLine({ x: 5, y: 3 }, line, 2)).toBe(false)
    })

    it('零长度线段应退化为点距离判断', () => {
      const line = { x1: 3, y1: 4, x2: 3, y2: 4 }
      expect(isPointNearLine({ x: 4, y: 4 }, line, 1)).toBe(true)
      expect(isPointNearLine({ x: 6, y: 4 }, line, 1)).toBe(false)
    })
  })

  describe('角度与点变换', () => {
    it('getAngle 应返回度数角度', () => {
      expect(getAngle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90, 8)
      expect(getAngle({ x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180, 8)
    })

    it('rotatePoint 应正确绕中心旋转', () => {
      const result = rotatePoint({ x: 2, y: 1 }, { x: 1, y: 1 }, 90)
      expect(result.x).toBeCloseTo(1, 8)
      expect(result.y).toBeCloseTo(2, 8)
    })

    it('scalePoint 应相对中心缩放', () => {
      expect(scalePoint({ x: 3, y: 5 }, { x: 1, y: 1 }, 2)).toEqual({ x: 5, y: 9 })
      expect(scalePoint({ x: 3, y: 5 }, { x: 1, y: 1 }, 0.5)).toEqual({ x: 2, y: 3 })
    })
  })

  describe('其他工具函数', () => {
    it('manhattanDistance 应返回曼哈顿距离', () => {
      expect(manhattanDistance({ x: 0, y: 0 }, { x: -3, y: 4 })).toBe(7)
    })

    it('expandBounds 应按 padding 扩展', () => {
      expect(expandBounds({ x: 10, y: 20, w: 30, h: 40 }, 5)).toEqual({ x: 5, y: 15, w: 40, h: 50 })
    })

    it('snapToGrid 应按网格吸附（含负数）', () => {
      expect(snapToGrid(13, 5)).toBe(15)
      expect(snapToGrid(-12, 5)).toBe(-10)
    })
  })

  describe('lineIntersectsBounds', () => {
    const bounds = { x: 0, y: 0, w: 10, h: 10 }

    it('端点在矩形内时应返回 true', () => {
      expect(lineIntersectsBounds({ x: 5, y: 5 }, { x: 20, y: 20 }, bounds)).toBe(true)
    })

    it('穿过矩形时应返回 true', () => {
      expect(lineIntersectsBounds({ x: -5, y: 5 }, { x: 15, y: 5 }, bounds)).toBe(true)
    })

    it('仅与边界相切时应返回 true', () => {
      expect(lineIntersectsBounds({ x: -5, y: 0 }, { x: 15, y: 0 }, bounds)).toBe(true)
    })

    it('完全在外部且不相交时应返回 false', () => {
      expect(lineIntersectsBounds({ x: -5, y: -5 }, { x: -1, y: -1 }, bounds)).toBe(false)
    })
  })
})
