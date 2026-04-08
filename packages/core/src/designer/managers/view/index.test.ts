import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { isIntersects } from '@diagen/shared'
import { createLinker, createShape, type ShapeElement } from '../../../model'
import { createDesigner } from '../../create'
import * as routerUtils from '../../../utils/router'

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

function createStraightLinkerById(id: string, from: { x: number; y: number }, to: { x: number; y: number }) {
  return createLinker({
    id,
    name: id,
    linkerType: 'straight',
    from: { id: null, x: from.x, y: from.y, binding: { type: 'free' } },
    to: { id: null, x: to.x, y: to.y, binding: { type: 'free' } },
  })
}

function createDenseJumpLinkers(crossXs: number[]) {
  return {
    verticals: crossXs.map((x, index) => createStraightLinkerById(`jump_vertical_${index}`, { x, y: 0 }, { x, y: 100 })),
    horizontal: createStraightLinkerById('jump_horizontal', { x: 0, y: 50 }, { x: 100, y: 50 }),
  }
}

function withLineJumpDesigner(run: (designer: ReturnType<typeof createDesigner>) => void) {
  createRoot(dispose => {
    const designer = createDesigner({
      page: {
        lineJumps: true,
      },
    })

    try {
      run(designer)
    } finally {
      dispose()
    }
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

  it('存在 originOffset 时 toScreen/toCanvas 仍应互为逆变换', () => {
    withDesigner(designer => {
      designer.view.setPan(120, -40)
      designer.view.setZoom(2)
      designer.view.setOriginOffset({ x: 80, y: 60 })

      const canvasPoint = { x: -30, y: 50 }
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

      expect(designer.view.transform().zoom).toBe(2)
      expect(designer.view.transform().x).toBe(-100)
      expect(designer.view.transform().y).toBe(-100)
    })
  })

  it('setZoom(center) 在非 1 倍缩放且存在 originOffset 时仍应保持指定画布点视觉位置稳定', () => {
    withDesigner(designer => {
      designer.view.setPan(10, -20)
      designer.view.setZoom(2)
      designer.view.setOriginOffset({ x: 80, y: 60 })

      const focusPoint = { x: 100, y: 120 }
      const before = designer.view.toScreen(focusPoint)

      designer.view.setZoom(3, focusPoint)

      const after = designer.view.toScreen(focusPoint)

      expect(after.x).toBeCloseTo(before.x)
      expect(after.y).toBeCloseTo(before.y)
      expect(designer.view.transform().zoom).toBe(3)
    })
  })

  it('fitBounds 应根据视口计算缩放与平移', () => {
    withDesigner(designer => {
      designer.view.setViewportSize(1000, 500)
      designer.view.fitBounds({ x: 0, y: 0, w: 200, h: 100 })

      expect(designer.view.transform().zoom).toBe(5)
      expect(designer.view.transform().x).toBe(0)
      expect(designer.view.transform().y).toBe(0)
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
      const before = designer.view.worldSize()
      const beforeWidth = before.width
      const beforeHeight = before.height
      const changed = designer.view.ensureContainerFits({ x: 0, y: 0, w: 2600, h: 1800 })
      const after = designer.view.worldSize()

      expect(changed).toBe(true)
      expect(after.width).toBeGreaterThan(beforeWidth)
      expect(after.height).toBeGreaterThan(beforeHeight)
    })
  })

  it('ensureContainerFits 应在内容向左上越界时同步扩容并更新 originOffset', () => {
    withDesigner(designer => {
      const changed = designer.view.ensureContainerFits({ x: -260, y: -260, w: 300, h: 240 })

      expect(changed).toBe(true)
      expect(designer.view.originOffset()).toEqual({
        x: 600,
        y: 600,
      })
      // ensureContainerFits 会把页面 bounds 与越界内容一起合并后再计算容器尺寸，
      // 因此最终宽高需要覆盖“补偿后的整页内容”，而不是仅覆盖传入的 extraBounds。
      expect(designer.view.worldSize()).toEqual({
        width: 2000,
        height: 2000,
      })
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

  it('fitToContent 应基于当前内容边界，而不是历史扩张后的缓存 bounds', () => {
    withDesigner(designer => {
      designer.view.setViewportSize(800, 600)

      designer.view.fitToContent()
      const pageTransform = designer.view.transform()

      const far = createShapeById('view_fit_far', 2400, 1600, 120, 90)
      designer.edit.add([far], { record: false, select: false })

      designer.view.fitToContent()
      const zoomWithFar = designer.view.transform().zoom
      expect(zoomWithFar).toBeLessThan(1)

      designer.edit.remove([far.id], { record: false })

      designer.view.fitToContent()
      const transform = designer.view.transform()

      expect(transform.zoom).toBe(pageTransform.zoom)
      expect(transform.x).toBe(pageTransform.x)
      expect(transform.y).toBe(pageTransform.y)
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
    withLineJumpDesigner(designer => {
      try {
        const { verticals, horizontal } = createDenseJumpLinkers([50])
        const vertical = verticals[0]
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
      } finally {}
    })
  })

  it('重复读取同一连线布局时应复用跳线缓存', () => {
    withLineJumpDesigner(designer => {
      const jumpsSpy = vi.spyOn(routerUtils, 'calculateLineJumps')

      try {
        const { verticals, horizontal } = createDenseJumpLinkers([50])
        const vertical = verticals[0]
        designer.edit.add([horizontal, vertical], { record: false, select: false })

        designer.view.getLinkerLayout(vertical)
        designer.view.getLinkerLayout(vertical)

        expect(jumpsSpy).toHaveBeenCalledTimes(1)
      } finally {
        jumpsSpy.mockRestore()
      }
    })
  })

  it('同一 segment 上交叉点过近时应输出收敛后的 jump 半径', () => {
    withLineJumpDesigner(designer => {
      try {
        const { verticals, horizontal } = createDenseJumpLinkers([40, 52])
        designer.edit.add([...verticals, horizontal], { record: false, select: false })

        expect(designer.view.getLinkerLayout(horizontal).route.jumps).toEqual([
          {
            segmentIndex: 0,
            center: { x: 40, y: 50 },
            orientation: 'horizontal',
            radius: 4,
          },
          {
            segmentIndex: 0,
            center: { x: 52, y: 50 },
            orientation: 'horizontal',
            radius: 4,
          },
        ])
      } finally {}
    })
  })

  it('同一 segment 上交叉点过密时应跳过不可稳定绘制的 jump', () => {
    withLineJumpDesigner(designer => {
      try {
        const { verticals, horizontal } = createDenseJumpLinkers([40, 45])
        designer.edit.add([...verticals, horizontal], { record: false, select: false })

        expect(designer.view.getLinkerLayout(horizontal).route.jumps ?? []).toEqual([])
      } finally {}
    })
  })
})
