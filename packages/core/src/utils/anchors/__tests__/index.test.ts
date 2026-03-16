import { describe, expect, it } from 'vitest'
import { createLinker, createShape } from '../../../model'
import { getShapeAnchorAngle, getShapeAnchorInfo } from '..'
import { calculateBasicLinkerRoute, calculateLinkerRoute } from '../../router'

describe('anchors', () => {
  describe('getShapeAnchorAngle - 路径边界法线', () => {
    it('应在无 direction 时返回边界外法线角', () => {
      const shape = createShape({
        id: 'shape_rect',
        name: 'shape_rect',
        props: { x: 0, y: 0, w: 120, h: 80, angle: 0 },
        anchors: [{ x: 'w/2', y: '0' }],
      })

      const angle = getShapeAnchorAngle(shape, 0)
      expect(angle).not.toBeNull()
      expect(angle ?? 0).toBeCloseTo(-Math.PI / 2, 2)
    })
  })

  describe('getShapeAnchorInfo', () => {
    it('应在 direction 存在时按 direction + 图形旋转角计算锚点角度', () => {
      const shape = createShape({
        id: 'shape_a',
        name: 'shape_a',
        props: { x: 10, y: 20, w: 100, h: 60, angle: 90 },
        anchors: [{ id: 'top', x: 'w/2', y: '0', direction: 'top' }],
      })

      const info = getShapeAnchorInfo(shape, 0)
      expect(info).not.toBeNull()
      expect(info?.id).toBe('top')
      expect(info?.direction).toBe('top')
      expect(info?.point.x).toBeCloseTo(90)
      expect(info?.point.y).toBeCloseTo(50)
      // top(-PI/2) + rotate(PI/2) = 0
      expect(info?.angle).toBeCloseTo(0)
    })

    it('应在无 direction 时按路径边界法线并叠加旋转', () => {
      const shape = createShape({
        id: 'shape_b',
        name: 'shape_b',
        props: { x: 0, y: 0, w: 100, h: 60, angle: 90 },
        anchors: [{ x: 'w', y: 'h/2' }],
      })

      const angle = getShapeAnchorAngle(shape, 0)
      expect(angle).not.toBeNull()
      // 右侧边界外法线为 0，旋转 90 度后应为 PI/2
      expect(angle ?? 0).toBeCloseTo(Math.PI / 2)
    })
  })

  describe('calculateLinkerRoute', () => {
    it('应默认按 basic 策略计算端点角度', () => {
      const fromShape = createShape({
        id: 'from_shape',
        name: 'from_shape',
        props: { x: 0, y: 0, w: 100, h: 60, angle: 90 },
        anchors: [{ id: 'top', x: 'w/2', y: '0', direction: 'top' }],
      })

      const toShape = createShape({
        id: 'to_shape',
        name: 'to_shape',
        props: { x: 220, y: 0, w: 100, h: 60, angle: 0 },
        anchors: [{ id: 'left', x: '0', y: 'h/2', direction: 'left' }],
      })

      const linker = createLinker({
        id: 'linker_1',
        name: 'linker_1',
        linkerType: 'curved',
        from: { id: fromShape.id, binding: { type: 'fixed', anchorId: 'top' }, x: 0, y: 0 },
        to: { id: toShape.id, binding: { type: 'fixed', anchorId: 'left' }, x: 0, y: 0 },
      })

      const route = calculateLinkerRoute(linker, id => {
        if (id === fromShape.id) return fromShape
        if (id === toShape.id) return toShape
        return null
      })

      expect(route.fromAngle).toBeCloseTo(0)
      expect(route.toAngle).toBeCloseTo(Math.PI)
      expect(route.points.length).toBeGreaterThanOrEqual(2)
    })

    it('应支持 obstacle 策略分发', () => {
      const fromShape = createShape({
        id: 'from_shape_2',
        name: 'from_shape_2',
        props: { x: 0, y: 0, w: 100, h: 60, angle: 0 },
        anchors: [{ id: 'right', x: 'w', y: 'h/2', direction: 'right' }],
      })

      const toShape = createShape({
        id: 'to_shape_2',
        name: 'to_shape_2',
        props: { x: 220, y: 0, w: 100, h: 60, angle: 0 },
        anchors: [{ id: 'left', x: '0', y: 'h/2', direction: 'left' }],
      })

      const linker = createLinker({
        id: 'linker_2',
        name: 'linker_2',
        linkerType: 'orthogonal',
        from: { id: fromShape.id, binding: { type: 'fixed', anchorId: 'right' }, x: 0, y: 0 },
        to: { id: toShape.id, binding: { type: 'fixed', anchorId: 'left' }, x: 0, y: 0 },
      })

      const route = calculateLinkerRoute(
        linker,
        id => {
          if (id === fromShape.id) return fromShape
          if (id === toShape.id) return toShape
          return null
        },
        {
          strategy: 'obstacle',
          obstacles: [],
          obstacleOptions: { algorithm: 'orthogonal' },
        },
      )

      expect(route.points.length).toBeGreaterThanOrEqual(2)
      expect(route.fromAngle).toBeCloseTo(0)
      expect(route.toAngle).toBeCloseTo(Math.PI)
    })
  })

  describe('calculateBasicLinkerRoute', () => {
    it('应保留基础路由兼容入口', () => {
      const fromShape = createShape({
        id: 'from_shape_basic',
        name: 'from_shape_basic',
        props: { x: 0, y: 0, w: 80, h: 40, angle: 0 },
        anchors: [{ id: 'right', x: 'w', y: 'h/2', direction: 'right' }],
      })
      const toShape = createShape({
        id: 'to_shape_basic',
        name: 'to_shape_basic',
        props: { x: 160, y: 0, w: 80, h: 40, angle: 0 },
        anchors: [{ id: 'left', x: '0', y: 'h/2', direction: 'left' }],
      })
      const linker = createLinker({
        id: 'linker_basic',
        name: 'linker_basic',
        linkerType: 'straight',
        from: { id: fromShape.id, binding: { type: 'fixed', anchorId: 'right' }, x: 0, y: 0 },
        to: { id: toShape.id, binding: { type: 'fixed', anchorId: 'left' }, x: 0, y: 0 },
      })
      const route = calculateBasicLinkerRoute(linker, id => {
        if (id === fromShape.id) return fromShape
        if (id === toShape.id) return toShape
        return null
      })
      expect(route.points.length).toBeGreaterThanOrEqual(2)
    })
  })
})
