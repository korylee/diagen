import { describe, expect, it } from 'vitest'
import { createLinker, createShape } from '../model'
import { getAnchorAngle, getAnchorInfo, resolveCreateAnchor } from './index'
import { getBasicLinkerRoute, getLinkerRoute } from '../route'

describe('anchors', () => {
  describe('getAnchorAngle - 路径边界法线', () => {
    it('应在无 direction 时返回边界外法线角', () => {
      const shape = createShape({
        id: 'shape_rect',
        name: 'shape_rect',
        props: { x: 0, y: 0, w: 120, h: 80, angle: 0 },
        anchors: [{ x: 'w/2', y: '0' }],
      })

      const angle = getAnchorAngle(shape, 0)
      expect(angle).not.toBeNull()
      expect(angle ?? 0).toBeCloseTo(-Math.PI / 2, 2)
    })
  })

  describe('getAnchorInfo', () => {
    it('应在 direction 存在时按 direction + 图形旋转角计算锚点角度', () => {
      const shape = createShape({
        id: 'shape_a',
        name: 'shape_a',
        props: { x: 10, y: 20, w: 100, h: 60, angle: 90 },
        anchors: [{ id: 'top', x: 'w/2', y: '0', direction: 'top' }],
      })

      const info = getAnchorInfo(shape, 0)
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

      const angle = getAnchorAngle(shape, 0)
      expect(angle).not.toBeNull()
      // 右侧边界外法线为 0，旋转 90 度后应为 PI/2
      expect(angle ?? 0).toBeCloseTo(Math.PI / 2)
    })
  })

  describe('resolveCreateAnchor', () => {
    it('应优先选择右侧固定锚点', () => {
      const shape = createShape({
        id: 'shape_preferred_right',
        name: 'shape_preferred_right',
        props: { x: 10, y: 20, w: 100, h: 60, angle: 0 },
        anchors: [
          { id: 'top', x: 'w/2', y: '0', direction: 'top' },
          { id: 'right', x: 'w', y: 'h/2', direction: 'right' },
          { id: 'bottom', x: 'w/2', y: 'h', direction: 'bottom' },
          { id: 'left', x: '0', y: 'h/2', direction: 'left' },
        ],
      })

      const anchor = resolveCreateAnchor(shape)
      expect(anchor).not.toBeNull()
      expect(anchor?.type).toBe('anchor')
      if (anchor?.type !== 'anchor') throw new Error('应返回 anchor 锚点')
      expect(anchor.id).toBe('right')
      expect(anchor.direction).toBe('right')
      expect(anchor.point.x).toBeCloseTo(110)
      expect(anchor.point.y).toBeCloseTo(50)
    })

    it('应在缺少右侧锚点时回退到顶部锚点', () => {
      const shape = createShape({
        id: 'shape_preferred_top',
        name: 'shape_preferred_top',
        props: { x: 0, y: 0, w: 120, h: 80, angle: 0 },
        anchors: [
          { id: 'top', x: 'w/2', y: '0', direction: 'top' },
          { id: 'bottom', x: 'w/2', y: 'h', direction: 'bottom' },
        ],
      })

      const anchor = resolveCreateAnchor(shape)
      expect(anchor).not.toBeNull()
      expect(anchor?.type).toBe('anchor')
      if (anchor?.type !== 'anchor') throw new Error('应返回 anchor 锚点')
      expect(anchor.id).toBe('top')
      expect(anchor.direction).toBe('top')
    })

    it('应在无 direction 时稳定选择最接近右上的固定锚点', () => {
      const shape = createShape({
        id: 'shape_quadrant_anchor',
        name: 'shape_quadrant_anchor',
        props: { x: 0, y: 0, w: 100, h: 60, angle: 0 },
        anchors: [
          { id: 'left_top', x: '10', y: '10' },
          { id: 'near_right_top', x: 'w', y: '10' },
          { id: 'bottom_center', x: 'w/2', y: 'h' },
        ],
      })

      const anchor = resolveCreateAnchor(shape)
      expect(anchor).not.toBeNull()
      expect(anchor?.type).toBe('anchor')
      if (anchor?.type !== 'anchor') throw new Error('应返回 anchor 锚点')
      expect(anchor.id).toBe('near_right_top')
      expect(anchor.direction).toBe('center')
      expect(anchor.point.x).toBeCloseTo(100)
      expect(anchor.point.y).toBeCloseTo(10)
    })

    it('应在无固定锚点时回退到 edge 绑定', () => {
      const shape = createShape({
        id: 'shape_edge_fallback',
        name: 'shape_edge_fallback',
        props: { x: 0, y: 0, w: 100, h: 60, angle: 0 },
        anchors: [],
      })

      const anchor = resolveCreateAnchor(shape)
      expect(anchor).not.toBeNull()
      expect(anchor?.type).toBe('edge')
      if (anchor?.type !== 'edge') throw new Error('应返回 edge 绑定')
      expect(anchor.point.x).toBeCloseTo(100)
      expect(anchor.point.y).toBeCloseTo(0)
    })
  })

  describe('getLinkerRoute', () => {
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
        from: {
          target: fromShape.id,
          binding: { type: 'anchor', anchorId: 'top' },
          x: 0,
          y: 0,
        },
        to: {
          target: toShape.id,
          binding: { type: 'anchor', anchorId: 'left' },
          x: 0,
          y: 0,
        },
      })

      const route = getLinkerRoute(linker, id => {
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
        from: {
          target: fromShape.id,
          binding: { type: 'anchor', anchorId: 'right' },
          x: 0,
          y: 0,
        },
        to: {
          target: toShape.id,
          binding: { type: 'anchor', anchorId: 'left' },
          x: 0,
          y: 0,
        },
      })

      const route = getLinkerRoute(
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

  describe('getBasicLinkerRoute', () => {
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
        from: {
          target: fromShape.id,
          binding: { type: 'anchor', anchorId: 'right' },
          x: 0,
          y: 0,
        },
        to: {
          target: toShape.id,
          binding: { type: 'anchor', anchorId: 'left' },
          x: 0,
          y: 0,
        },
      })
      const route = getBasicLinkerRoute(linker, id => {
        if (id === fromShape.id) return fromShape
        if (id === toShape.id) return toShape
        return null
      })
      expect(route.points.length).toBeGreaterThanOrEqual(2)
    })

    it('端点目标不是 shape 时应回退到端点原始坐标', () => {
      const linkerTarget = createLinker({
        id: 'target_linker',
        name: 'target_linker',
        from: { x: 10, y: 10, binding: { type: 'free' } },
        to: { x: 50, y: 10, binding: { type: 'free' } },
      })
      const linker = createLinker({
        id: 'linker_non_shape_target',
        name: 'linker_non_shape_target',
        linkerType: 'straight',
        from: {
          target: linkerTarget.id,
          binding: { type: 'anchor', anchorId: 'right' },
          x: 20,
          y: 30,
          angle: 0.5,
        },
        to: { binding: { type: 'free' }, x: 100, y: 30, angle: 0 },
      })

      const route = getBasicLinkerRoute(linker, id => {
        if (id === linkerTarget.id) return linkerTarget
        return null
      })

      expect(route.points[0]).toEqual({ x: 20, y: 30 })
      expect(route.fromAngle).toBeCloseTo(0.5)
    })
  })
})
