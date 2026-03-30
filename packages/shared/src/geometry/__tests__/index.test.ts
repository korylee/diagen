import { describe, expect, it } from 'vitest'
import {
  expandBounds,
  getAngle,
  boundsCenter,
  getDistance,
  getRotatedBounds,
  isIntersects,
  isPointInBounds,
  isPointInRotatedBounds,
  normalizeBounds,
  rotatePoint,
  unionBounds,
} from '../index'

describe('geometry', () => {
  describe('getDistance', () => {
    it('应该正确计算两点距离', () => {
      expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
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

  describe('getRotatedBounds', () => {
    it('angle 缺省或 0 时应返回原 bounds', () => {
      const b = { x: 10, y: 20, w: 40, h: 30 }
      expect(getRotatedBounds(b)).toEqual(b)
      expect(getRotatedBounds({ ...b, angle: 0 })).toEqual(b)
    })

    it('90 度旋转后宽高应互换且中心不变', () => {
      const src = { x: 10, y: 20, w: 100, h: 50, angle: 90 }
      const result = getRotatedBounds(src)
      const srcCenter = { x: src.x + src.w / 2, y: src.y + src.h / 2 }
      const dstCenter = { x: result.x + result.w / 2, y: result.y + result.h / 2 }

      expect(result.w).toBeCloseTo(50, 8)
      expect(result.h).toBeCloseTo(100, 8)
      expect(dstCenter.x).toBeCloseTo(srcCenter.x, 8)
      expect(dstCenter.y).toBeCloseTo(srcCenter.y, 8)
    })
  })

  describe('bounds 相关函数', () => {
    it('boundsCenter 应返回中心点', () => {
      expect(boundsCenter({ x: 10, y: 20, w: 40, h: 60 })).toEqual({ x: 30, y: 50 })
    })

    it('normalizeBounds 应将负宽高规范化', () => {
      expect(normalizeBounds({ x: 10, y: 20, w: -30, h: -40 })).toEqual({ x: -20, y: -20, w: 30, h: 40 })
    })

    it('unionBounds 应返回最小并集矩形', () => {
      const b1 = { x: 0, y: 0, w: 10, h: 20 }
      const b2 = { x: 5, y: 10, w: 20, h: 10 }
      expect(unionBounds(b1, b2)).toEqual({ x: 0, y: 0, w: 25, h: 20 })
    })
  })

  describe('角度与点变换', () => {
    it('getAngle 应返回度数角度', () => {
      expect(getAngle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90, 8)
      expect(getAngle({ x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180, 8)
    })

    it('rotatePoint 应正确绕中心旋转', () => {
      const result = rotatePoint({ x: 2, y: 1 }, 90, { x: 1, y: 1 })
      expect(result.x).toBeCloseTo(1, 8)
      expect(result.y).toBeCloseTo(2, 8)
    })
  })

  describe('其他工具函数', () => {
    it('expandBounds 应按 padding 扩展', () => {
      expect(expandBounds({ x: 10, y: 20, w: 30, h: 40 }, 5)).toEqual({ x: 5, y: 15, w: 40, h: 50 })
    })
  })

  describe('isIntersects', () => {
    describe('bounds vs bounds', () => {
      it('重叠的矩形应返回 true', () => {
        expect(isIntersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true)
      })

      it('相邻（边界相接）的矩形应返回 true', () => {
        expect(isIntersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(true)
      })

      it('不相交的矩形应返回 false', () => {
        expect(isIntersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 })).toBe(false)
      })

      it('一个矩形完全包含另一个应返回 true', () => {
        expect(isIntersects({ x: 0, y: 0, w: 100, h: 100 }, { x: 10, y: 10, w: 20, h: 20 })).toBe(true)
      })
    })

    describe('line vs line', () => {
      it('交叉线段应返回 true', () => {
        expect(
          isIntersects(
            [
              { x: 0, y: 0 },
              { x: 10, y: 10 },
            ],
            [
              { x: 0, y: 10 },
              { x: 10, y: 0 },
            ],
          ),
        ).toBe(true)
      })

      it('平行线段应返回 false', () => {
        expect(
          isIntersects(
            [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
            ],
            [
              { x: 0, y: 5 },
              { x: 10, y: 5 },
            ],
          ),
        ).toBe(false)
      })

      it('不相交的线段应返回 false', () => {
        expect(
          isIntersects(
            [
              { x: 0, y: 0 },
              { x: 5, y: 0 },
            ],
            [
              { x: 6, y: 0 },
              { x: 10, y: 0 },
            ],
          ),
        ).toBe(false)
      })
    })

    describe('line vs bounds', () => {
      const bounds = { x: 0, y: 0, w: 10, h: 10 }

      it('穿过矩形的线段应返回 true', () => {
        expect(
          isIntersects(
            [
              { x: -5, y: 5 },
              { x: 15, y: 5 },
            ],
            bounds,
          ),
        ).toBe(true)
      })

      it('端点在矩形内的线段应返回 true', () => {
        expect(
          isIntersects(
            [
              { x: 5, y: 5 },
              { x: 20, y: 5 },
            ],
            bounds,
          ),
        ).toBe(true)
      })

      it('完全在矩形外且不穿过的线段应返回 false', () => {
        expect(
          isIntersects(
            [
              { x: -10, y: -5 },
              { x: 20, y: -5 },
            ],
            bounds,
          ),
        ).toBe(false)
      })

      it('bounds 在前、line 在后顺序应与反转一致', () => {
        const line: [{ x: number; y: number }, { x: number; y: number }] = [
          { x: -5, y: 5 },
          { x: 15, y: 5 },
        ]
        expect(isIntersects(line, bounds)).toBe(isIntersects(bounds, line))
      })
    })
  })
})
