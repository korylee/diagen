import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { isIntersects } from '@diagen/shared'
import { createLinker, createShape, type ShapeElement } from '../../../../model'
import { createDesigner } from '../../../create'

function withDesigner(run: (designer: ReturnType<typeof createDesigner>) => void) {
  createRoot(dispose => {
    const designer = createDesigner()
    try {
      run(designer)
    } finally {
      dispose()
    }
  })
}

function createShapeById(id: string, x: number, y: number, w = 100, h = 80) {
  return createShape({
    id,
    name: id,
    group: null,
    props: { x, y, w, h, angle: 0 },
  })
}

describe('view manager', () => {
  it('toScreen/toCanvas 应互为逆变换', () => {
    withDesigner(designer => {
      designer.view.setPan(120, -40)
      designer.view.setZoom(2)

      const canvasPoint = { x: 30, y: 50 }
      const screenPoint = designer.view.toScreen(canvasPoint)
      const roundtrip = designer.view.toCanvas(screenPoint)

      expect(roundtrip.x).toBeCloseTo(canvasPoint.x)
      expect(roundtrip.y).toBeCloseTo(canvasPoint.y)
    })
  })

  it('setZoom(center) 应保持中心点视觉位置稳定', () => {
    withDesigner(designer => {
      designer.view.setPan(0, 0)
      designer.view.setZoom(2, { x: 100, y: 100 })

      expect(designer.view.viewport().zoom).toBe(2)
      expect(designer.view.viewport().x).toBe(-100)
      expect(designer.view.viewport().y).toBe(-100)
    })
  })

  it('fitBounds 应根据视口计算缩放与平移', () => {
    withDesigner(designer => {
      designer.view.setViewportSize(1000, 500)
      designer.view.fitBounds({ x: 0, y: 0, w: 200, h: 100 })

      expect(designer.view.viewport().zoom).toBe(5)
      expect(designer.view.viewport().x).toBe(0)
      expect(designer.view.viewport().y).toBe(0)
    })
  })

  it('selectionBounds 应随选择变化', () => {
    withDesigner(designer => {
      const a = createShapeById('view_sel_a', 0, 0, 100, 80)
      const b = createShapeById('view_sel_b', 200, 50, 100, 100)
      designer.edit.add([a, b], { record: false, select: false })

      designer.selection.replace([a.id, b.id])
      expect(designer.view.selectionBounds()).toEqual({ x: 0, y: 0, w: 300, h: 150 })

      designer.selection.replace([b.id])
      expect(designer.view.selectionBounds()).toEqual({ x: 200, y: 50, w: 100, h: 100 })
    })
  })

  it('ensureContainerFits 应在内容越界时扩容', () => {
    withDesigner(designer => {
      const before = designer.view.containerSize()
      const beforeWidth = before.width
      const beforeHeight = before.height
      const changed = designer.view.ensureContainerFits({ x: 0, y: 0, w: 2600, h: 1800 })
      const after = designer.view.containerSize()

      expect(changed).toBe(true)
      expect(after.width).toBeGreaterThan(beforeWidth)
      expect(after.height).toBeGreaterThan(beforeHeight)
    })
  })

  it('新增远端元素后 bounds 应自动扩张', () => {
    withDesigner(designer => {
      const baseBounds = designer.view.bounds()
      const far = createShapeById('view_far', 2400, 1600, 120, 90)
      designer.edit.add([far], { record: false, select: false })

      const nextBounds = designer.view.bounds()
      expect(nextBounds.w).toBeGreaterThan(baseBounds.w)
      expect(nextBounds.h).toBeGreaterThan(baseBounds.h)

      const shapeBounds = designer.view.getShapeBounds(designer.getElementById<ShapeElement>(far.id) as ShapeElement)
      expect(shapeBounds).toEqual({ x: 2400, y: 1600, w: 120, h: 90 })
    })
  })

  it('连线布局接口应返回可用 route/bounds', () => {
    withDesigner(designer => {
      const a = createShapeById('view_link_a', 100, 100, 100, 80)
      const b = createShapeById('view_link_b', 400, 240, 100, 80)
      const linker = createLinker({
        id: 'view_linker',
        name: 'view_linker',
        from: { id: a.id, x: 200, y: 140, binding: { type: 'free' } },
        to: { id: b.id, x: 400, y: 280, binding: { type: 'free' } },
      })
      designer.edit.add([a, b, linker], { record: false, select: false })

      const layout = designer.view.getLinkerLayout(linker)
      expect(layout.route.points.length).toBeGreaterThan(1)
      expect(layout.bounds.w).toBeGreaterThan(0)
      expect(layout.bounds.h).toBeGreaterThan(0)
    })
  })

  it('broken 连线默认应走 obstacle 主链路', () => {
    withDesigner(designer => {
      const a = createShapeById('route_a', 0, 0, 100, 80)
      const blocker = createShapeById('route_blocker', 140, -20, 120, 120)
      const b = createShapeById('route_b', 320, 0, 100, 80)
      const linker = createLinker({
        id: 'route_linker',
        name: 'route_linker',
        linkerType: 'broken',
        from: { id: a.id, x: a.props.x + a.props.w, y: a.props.y + a.props.h / 2, binding: { type: 'free' } },
        to: { id: b.id, x: b.props.x, y: b.props.y + b.props.h / 2, binding: { type: 'free' } },
      })
      designer.edit.add([a, blocker, b, linker], { record: false, select: false })

      const layout = designer.view.getLinkerLayout(linker)
      const blockerBounds = designer.view.getShapeBounds(blocker)
      const intersects = layout.route.points.some((point, index, points) => {
        if (index === points.length - 1) return false
        return isIntersects([point, points[index + 1]], blockerBounds)
      })

      expect(intersects).toBe(false)
    })
  })

  it('新增障碍物后 obstacle 连线布局缓存应自动失效', () => {
    withDesigner(designer => {
      const a = createShapeById('route_dynamic_a', 0, 0, 100, 80)
      const b = createShapeById('route_dynamic_b', 320, 0, 100, 80)
      const linker = createLinker({
        id: 'route_dynamic_linker',
        name: 'route_dynamic_linker',
        linkerType: 'broken',
        from: { id: a.id, x: a.props.x + a.props.w, y: a.props.y + a.props.h / 2, binding: { type: 'free' } },
        to: { id: b.id, x: b.props.x, y: b.props.y + b.props.h / 2, binding: { type: 'free' } },
      })
      designer.edit.add([a, b, linker], { record: false, select: false })

      const initialLayout = designer.view.getLinkerLayout(linker)
      const blocker = createShapeById('route_dynamic_blocker', 140, -20, 120, 120)
      designer.edit.add([blocker], { record: false, select: false })

      const layout = designer.view.getLinkerLayout(linker)
      const blockerBounds = designer.view.getShapeBounds(blocker)
      const intersects = layout.route.points.some((point, index, points) => {
        if (index === points.length - 1) return false
        return isIntersects([point, points[index + 1]], blockerBounds)
      })

      expect(initialLayout.route.points).not.toEqual(layout.route.points)
      expect(intersects).toBe(false)
    })
  })

  it('切回 basic 策略后应保留基础折线行为', () => {
    withDesigner(designer => {
      const a = createShapeById('route_basic_a', 0, 0, 100, 80)
      const blocker = createShapeById('route_basic_blocker', 140, -20, 120, 120)
      const b = createShapeById('route_basic_b', 320, 0, 100, 80)
      const linker = createLinker({
        id: 'route_basic_linker',
        name: 'route_basic_linker',
        linkerType: 'broken',
        from: { id: a.id, x: a.props.x + a.props.w, y: a.props.y + a.props.h / 2, binding: { type: 'free' } },
        to: { id: b.id, x: b.props.x, y: b.props.y + b.props.h / 2, binding: { type: 'free' } },
      })
      designer.edit.add([a, blocker, b, linker], { record: false, select: false })
      designer.view.setLinkerRouteConfig({
        strategies: {
          broken: 'basic',
        },
      })

      const layout = designer.view.getLinkerLayout(linker)
      const blockerBounds = designer.view.getShapeBounds(blocker)
      const intersects = layout.route.points.some((point, index, points) => {
        if (index === points.length - 1) return false
        return isIntersects([point, points[index + 1]], blockerBounds)
      })

      expect(intersects).toBe(true)
    })
  })

  it('setLinkerRouteConfig 应合并局部配置', () => {
    withDesigner(designer => {
      const before = designer.view.linkerRouteConfig()
      designer.view.setLinkerRouteConfig({
        obstacleConfig: {
          padding: 32,
        },
      })

      const next = designer.view.linkerRouteConfig()
      expect(next.obstacleConfig.padding).toBe(32)
      expect(next.obstacleOptions).toEqual(before.obstacleOptions)
      expect(next.lineJumpRadius).toBe(before.lineJumpRadius)
      expect(next.strategies).toEqual(before.strategies)
    })
  })

  it('开启 lineJumps 后绘制连线应生成跳线几何', () => {
    createRoot(dispose => {
      const designer = createDesigner({
        page: {
          lineJumps: true,
        },
      })

      try {
        const horizontal = createLinker({
          id: 'jump_horizontal',
          name: 'jump_horizontal',
          linkerType: 'straight',
          from: { id: null, x: 0, y: 50, binding: { type: 'free' } },
          to: { id: null, x: 100, y: 50, binding: { type: 'free' } },
        })
        const vertical = createLinker({
          id: 'jump_vertical',
          name: 'jump_vertical',
          linkerType: 'straight',
          from: { id: null, x: 50, y: 0, binding: { type: 'free' } },
          to: { id: null, x: 50, y: 100, binding: { type: 'free' } },
        })
        designer.edit.add([horizontal, vertical], { record: false, select: false })

        expect(designer.view.getLinkerLayout(horizontal).route.jumps ?? []).toHaveLength(0)
        expect(designer.view.getLinkerLayout(vertical).route.jumps).toEqual([
          {
            segmentIndex: 0,
            center: { x: 50, y: 50 },
            orientation: 'vertical',
            radius: designer.view.linkerRouteConfig().lineJumpRadius,
          },
        ])
      } finally {
        dispose()
      }
    })
  })
})
