import { createDesigner, createLinker, createShape, type LinkerElement } from '@diagen/core'
import { getAnchorInfo, getPerimeterInfo, resolveCreateAnchor } from '@diagen/core/anchors'
import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { CoordinateService } from '../../services/createCoordinateService'
import { createLinkerDrag } from './createLinkerDrag'

const testContext = vi.hoisted(() => ({
  designer: null as ReturnType<typeof createDesigner> | null,
}))

vi.mock('../../../context', () => ({
  useDesigner: () => {
    if (!testContext.designer) {
      throw new Error('designer context is not ready')
    }
    return testContext.designer
  },
}))

function withLinkerDrag(
  options: {
    threshold?: number
    allowSelfConnect?: boolean
  },
  run: (context: {
    designer: ReturnType<typeof createDesigner>
    linkerDrag: ReturnType<typeof createLinkerDrag>
  }) => void,
) {
  createRoot(dispose => {
    const designer = createDesigner({
      autoGrow: {
        enabled: false,
      },
      linkerRoute: {
        strategies: {
          broken: 'basic',
        },
      },
    })

    testContext.designer = designer

    const linkerDrag = createLinkerDrag(coordinate, {
      threshold: options.threshold ?? 0,
      allowSelfConnect: options.allowSelfConnect,
    })

    try {
      run({ designer, linkerDrag })
    } finally {
      testContext.designer = null
      dispose()
    }
  })
}

function createMouseEvent(x: number, y: number): MouseEvent {
  return {
    clientX: x,
    clientY: y,
  } as MouseEvent
}

function createShapeById(id: string, x: number, y: number, w = 100, h = 80) {
  return createShape({
    id,
    name: id,
    group: null,
    props: { x, y, w, h, angle: 0 },
  })
}

function createFreeLinkerById(id: string, from: { x: number; y: number }, to: { x: number; y: number }): LinkerElement {
  return createLinker({
    id,
    name: id,
    from: {
      id: null,
      x: from.x,
      y: from.y,
      binding: { type: 'free' },
    },
    to: {
      id: null,
      x: to.x,
      y: to.y,
      binding: { type: 'free' },
    },
  })
}

const coordinate: Pick<CoordinateService, 'eventToCanvas'> = {
  eventToCanvas: event => ({
    x: event.clientX,
    y: event.clientY,
  }),
}

describe('createLinkerDrag', () => {
  it('应在点击线段中点后插入控制点，并在取消提交时回滚', () => {
    withLinkerDrag({ threshold: 3 }, ({ designer, linkerDrag }) => {
      const linker = createFreeLinkerById('segment_linker', { x: 0, y: 0 }, { x: 100, y: 0 })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(0, 0), {
        linkerId: linker.id,
        point: { x: 50, y: 0 },
        hit: { type: 'segment', segmentIndex: 0 },
        route: {
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          fromAngle: 0,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)
      expect(linkerDrag.state()?.mode).toBe('control')
      expect(Array.from(designer.element.getElementById<LinkerElement>(linker.id)?.points ?? [])).toEqual([
        { x: 50, y: 0 },
      ])

      linkerDrag.end()

      expect(Array.from(designer.element.getElementById<LinkerElement>(linker.id)?.points ?? [])).toEqual([])
      expect(linkerDrag.state()).toBeNull()
    })
  })

  it('broken 连线的控制点在提交后若仍共线，应自动折叠冗余点', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const linker = createLinker({
        id: 'broken_control_normalize',
        name: 'broken_control_normalize',
        linkerType: 'broken',
        from: {
          id: null,
          x: 0,
          y: 0,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 100,
          y: 0,
          binding: { type: 'free' },
        },
        points: [{ x: 50, y: 0 }],
      })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(50, 0), {
        linkerId: linker.id,
        point: { x: 50, y: 0 },
        hit: { type: 'control', controlIndex: 0 },
        route: {
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
            { x: 100, y: 0 },
          ],
          fromAngle: 0,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)

      linkerDrag.move(createMouseEvent(60, 0))
      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([{ x: 60, y: 0 }])

      linkerDrag.end()

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([])
      expect(designer.canUndo()).toBe(true)

      designer.undo()
      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([{ x: 50, y: 0 }])
    })
  })

  it('broken 连线的非共线控制点在提交后应保留', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const linker = createLinker({
        id: 'broken_control_keep_diagonal',
        name: 'broken_control_keep_diagonal',
        linkerType: 'broken',
        from: {
          id: null,
          x: 0,
          y: 0,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 100,
          y: 0,
          binding: { type: 'free' },
        },
        points: [{ x: 50, y: 20 }],
      })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(50, 20), {
        linkerId: linker.id,
        point: { x: 50, y: 20 },
        hit: { type: 'control', controlIndex: 0 },
        route: {
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 20 },
            { x: 100, y: 0 },
          ],
          fromAngle: 0,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)

      linkerDrag.move(createMouseEvent(60, 20))
      linkerDrag.end()

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([{ x: 60, y: 20 }])
      expect(designer.canUndo()).toBe(true)
    })
  })

  it('removeControlPoint 应复用统一的控制点提交语义', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const linker = createLinker({
        id: 'broken_remove_control_action',
        name: 'broken_remove_control_action',
        linkerType: 'broken',
        from: {
          id: null,
          x: 0,
          y: 0,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 100,
          y: 0,
          binding: { type: 'free' },
        },
        points: [
          { x: 40, y: 0 },
          { x: 60, y: 0 },
        ],
      })
      designer.edit.add([linker], { record: false, select: false })

      expect(linkerDrag.removeControlPoint(linker.id, 0)).toBe(true)
      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([])
      expect(designer.canUndo()).toBe(true)

      designer.undo()
      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 40, y: 0 },
        { x: 60, y: 0 },
      ])
    })
  })

  it('拖拽连线标签时，应正式写入 textPosition 并支持回到 auto', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const linker = createLinker({
        id: 'linker_text_drag',
        name: 'linker_text_drag',
        linkerType: 'straight',
        text: '标签',
        from: {
          id: null,
          x: 0,
          y: 0,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 100,
          y: 0,
          binding: { type: 'free' },
        },
      })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(50, 0), {
        linkerId: linker.id,
        point: { x: 50, y: 0 },
        hit: { type: 'text' },
        route: {
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          fromAngle: 0,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)

      linkerDrag.move(createMouseEvent(80, -20))
      expect(designer.element.getElementById<LinkerElement>(linker.id)?.textPosition).toEqual({
        dx: 30,
        dy: -20,
      })

      linkerDrag.end()

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.textPosition).toEqual({
        dx: 30,
        dy: -20,
      })
      expect(designer.canUndo()).toBe(true)

      designer.undo()
      expect(designer.element.getElementById<LinkerElement>(linker.id)?.textPosition).toBeUndefined()

      designer.redo()
      expect(designer.element.getElementById<LinkerElement>(linker.id)?.textPosition).toEqual({
        dx: 30,
        dy: -20,
      })
    })
  })

  it('orthogonal 连线拖拽中间控制点时，应保持横纵段语义并联动相邻点', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const linker = createLinker({
        id: 'orthogonal_control_drag',
        name: 'orthogonal_control_drag',
        linkerType: 'orthogonal',
        from: {
          id: null,
          x: 0,
          y: 0,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 120,
          y: 120,
          binding: { type: 'free' },
        },
        points: [
          { x: 0, y: 60 },
          { x: 80, y: 60 },
          { x: 80, y: 120 },
        ],
      })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(80, 60), {
        linkerId: linker.id,
        point: { x: 80, y: 60 },
        hit: { type: 'control', controlIndex: 1 },
        route: {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 60 },
            { x: 80, y: 60 },
            { x: 80, y: 120 },
            { x: 120, y: 120 },
          ],
          fromAngle: 0,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)

      linkerDrag.move(createMouseEvent(100, 90))

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 0, y: 90 },
        { x: 100, y: 90 },
        { x: 100, y: 120 },
      ])

      linkerDrag.end()

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 0, y: 90 },
        { x: 100, y: 90 },
        { x: 100, y: 120 },
      ])
      expect(designer.canUndo()).toBe(true)
    })
  })

  it('orthogonal 连线拖拽首个控制点时，端点约束轴应保持锁定', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const linker = createLinker({
        id: 'orthogonal_first_control_drag',
        name: 'orthogonal_first_control_drag',
        linkerType: 'orthogonal',
        from: {
          id: null,
          x: 0,
          y: 0,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 80,
          y: 120,
          binding: { type: 'free' },
        },
        points: [
          { x: 0, y: 60 },
          { x: 80, y: 60 },
        ],
      })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(0, 60), {
        linkerId: linker.id,
        point: { x: 0, y: 60 },
        hit: { type: 'control', controlIndex: 0 },
        route: {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 60 },
            { x: 80, y: 60 },
            { x: 80, y: 120 },
          ],
          fromAngle: 0,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)

      linkerDrag.move(createMouseEvent(20, 90))

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 0, y: 90 },
        { x: 80, y: 90 },
      ])
    })
  })

  it('orthogonal 连线点击中间线段后拖拽，应将整段平移并显式写入 points', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const linker = createLinker({
        id: 'orthogonal_segment_insert_drag',
        name: 'orthogonal_segment_insert_drag',
        linkerType: 'orthogonal',
        from: {
          id: null,
          x: 0,
          y: 0,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 100,
          y: 100,
          binding: { type: 'free' },
        },
      })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(50, 50), {
        linkerId: linker.id,
        point: { x: 50, y: 50 },
        hit: { type: 'segment', segmentIndex: 1 },
        route: {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 50 },
            { x: 100, y: 50 },
            { x: 100, y: 100 },
          ],
          fromAngle: 0,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)
      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ])

      linkerDrag.move(createMouseEvent(50, 80))

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 0, y: 80 },
        { x: 100, y: 80 },
      ])

      linkerDrag.end()

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 0, y: 80 },
        { x: 100, y: 80 },
      ])
      expect(designer.canUndo()).toBe(true)
    })
  })

  it('orthogonal 连线点击起始线段后拖拽，应补出新的首段折点', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const linker = createLinker({
        id: 'orthogonal_segment_start_drag',
        name: 'orthogonal_segment_start_drag',
        linkerType: 'orthogonal',
        from: {
          id: null,
          x: 0,
          y: 0,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 100,
          y: 100,
          binding: { type: 'free' },
        },
      })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(0, 25), {
        linkerId: linker.id,
        point: { x: 0, y: 25 },
        hit: { type: 'segment', segmentIndex: 0 },
        route: {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 50 },
            { x: 100, y: 50 },
            { x: 100, y: 100 },
          ],
          fromAngle: 0,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)

      linkerDrag.move(createMouseEvent(20, 25))

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 20, y: 0 },
        { x: 20, y: 50 },
        { x: 100, y: 50 },
      ])
    })
  })

  it('orthogonal 单段直线拖拽 segment 后，应补齐两侧折点并保持正交语义', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const linker = createLinker({
        id: 'orthogonal_single_segment_drag',
        name: 'orthogonal_single_segment_drag',
        linkerType: 'orthogonal',
        from: {
          id: null,
          x: 0,
          y: 0,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 0,
          y: 100,
          binding: { type: 'free' },
        },
      })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(0, 50), {
        linkerId: linker.id,
        point: { x: 0, y: 50 },
        hit: { type: 'segment', segmentIndex: 0 },
        route: {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 100 },
          ],
          fromAngle: 0,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)
      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 100 },
      ])

      linkerDrag.move(createMouseEvent(30, 50))

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 30, y: 0 },
        { x: 30, y: 100 },
      ])

      linkerDrag.end()

      expect(designer.element.getElementById<LinkerElement>(linker.id)?.points).toEqual([
        { x: 30, y: 0 },
        { x: 30, y: 100 },
      ])
      expect(designer.canUndo()).toBe(true)
    })
  })

  it('应在从图形创建连线时吸附到目标锚点并选中新建连线', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const sourceShape = createShapeById('source_shape', 0, 0)
      const targetShape = createShapeById('target_shape', 300, 0)
      designer.edit.add([sourceShape, targetShape], { record: false, select: false })

      const sourceAnchor = resolveCreateAnchor(sourceShape)
      const targetAnchor = getAnchorInfo(targetShape, 3)

      expect(sourceAnchor).not.toBeNull()
      expect(targetAnchor).not.toBeNull()

      const started = linkerDrag.beginCreate(createMouseEvent(0, 0), {
        linkerId: 'linker',
        from: {
          type: 'shape',
          shapeId: sourceShape.id,
        },
      })

      expect(started).toBe(true)

      const moveDelta = {
        x: targetAnchor!.point.x - sourceAnchor!.point.x,
        y: targetAnchor!.point.y - sourceAnchor!.point.y,
      }

      linkerDrag.move(createMouseEvent(moveDelta.x, moveDelta.y))

      expect(linkerDrag.snapTarget()?.shapeId).toBe(targetShape.id)
      expect(linkerDrag.snapTarget()?.anchorId).toBe(targetAnchor!.id)

      linkerDrag.end()

      const createdId = designer.selection.selectedIds()[0]
      const createdLinker = designer.element.getElementById<LinkerElement>(createdId)

      expect(createdLinker?.from.id).toBe(sourceShape.id)
      expect(createdLinker?.to.id).toBe(targetShape.id)
      expect(createdLinker?.to.binding).toEqual({
        type: 'fixed',
        anchorId: targetAnchor!.id,
      })
    })
  })

  it('应在未越过阈值时回滚预创建的连线', () => {
    withLinkerDrag({ threshold: 3 }, ({ designer, linkerDrag }) => {
      const sourceShape = createShapeById('draft_source_shape', 0, 0)
      designer.edit.add([sourceShape], { record: false, select: false })

      const started = linkerDrag.beginCreate(createMouseEvent(10, 20), {
        linkerId: 'linker',
        from: {
          type: 'shape',
          shapeId: sourceShape.id,
        },
      })

      expect(started).toBe(true)

      const pendingLinkerId = linkerDrag.state()?.linkerId
      expect(pendingLinkerId).toBeTruthy()
      expect(designer.element.getElementById<LinkerElement>(pendingLinkerId!)).toBeTruthy()

      linkerDrag.end()

      expect(designer.element.getElementById<LinkerElement>(pendingLinkerId!)).toBeUndefined()
      expect(linkerDrag.state()).toBeNull()
      expect(designer.selection.selectedIds()).toEqual([])
    })
  })

  it('在禁止自连接时，应将对端图形标记为不可连接', () => {
    createRoot(dispose => {
      const designer = createDesigner({
        autoGrow: {
          enabled: false,
        },
        linkerRoute: {
          strategies: {
            broken: 'basic',
          },
        },
      })
      testContext.designer = designer

      const linkerDrag = createLinkerDrag(coordinate, {
        threshold: 0,
        allowSelfConnect: false,
      })

      try {
        const sourceShape = createShapeById('from_shape', 0, 0)
        const targetShape = createShapeById('to_shape', 300, 0)
        const linker = createLinker({
          id: 'self_connect_linker',
          name: 'self_connect_linker',
          from: {
            id: sourceShape.id,
            x: 100,
            y: 40,
            binding: { type: 'free' },
          },
          to: {
            id: targetShape.id,
            x: 300,
            y: 40,
            binding: { type: 'free' },
          },
        })

        designer.edit.add([sourceShape, targetShape, linker], { record: false, select: false })

        const started = linkerDrag.beginEdit(createMouseEvent(0, 0), {
          linkerId: linker.id,
          point: { x: 100, y: 40 },
          hit: { type: 'from' },
          route: {
            points: [
              { x: 100, y: 40 },
              { x: 300, y: 40 },
            ],
            fromAngle: 0,
            toAngle: 0,
          },
        })

        expect(started).toBe(true)
        expect(linkerDrag.isShapeLinkable(targetShape.id)).toBe(false)
        expect(linkerDrag.isShapeLinkable(sourceShape.id)).toBe(true)
      } finally {
        testContext.designer = null
        dispose()
      }
    })
  })

  it('拖拽已绑定 fixed 锚点的端点时，应继承当前 snapTarget', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const sourceShape = createShapeById('fixed_source_shape', 0, 0)
      const targetShape = createShapeById('fixed_target_shape', 300, 0)
      designer.edit.add([sourceShape, targetShape], { record: false, select: false })

      const sourceAnchor = getAnchorInfo(sourceShape, 1)
      expect(sourceAnchor).not.toBeNull()

      const linker = createLinker({
        id: 'fixed_bound_linker',
        name: 'fixed_bound_linker',
        from: {
          id: sourceShape.id,
          x: sourceAnchor!.point.x,
          y: sourceAnchor!.point.y,
          angle: sourceAnchor!.angle,
          binding: {
            type: 'fixed',
            anchorId: sourceAnchor!.id,
          },
        },
        to: {
          id: targetShape.id,
          x: 300,
          y: 40,
          binding: { type: 'free' },
        },
      })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(sourceAnchor!.point.x, sourceAnchor!.point.y), {
        linkerId: linker.id,
        point: sourceAnchor!.point,
        hit: { type: 'from' },
        route: {
          points: [sourceAnchor!.point, { x: 300, y: 40 }],
          fromAngle: sourceAnchor!.angle,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)
      expect(linkerDrag.snapTarget()).toEqual({
        shapeId: sourceShape.id,
        binding: {
          type: 'fixed',
          anchorId: sourceAnchor!.id,
        },
        anchorId: sourceAnchor!.id,
        point: sourceAnchor!.point,
        angle: sourceAnchor!.angle,
      })
    })
  })

  it('拖拽已绑定 perimeter 的端点时，应继承当前 snapTarget', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const sourceShape = createShapeById('perimeter_source_shape', 0, 0)
      const targetShape = createShapeById('perimeter_target_shape', 300, 0)
      designer.edit.add([sourceShape, targetShape], { record: false, select: false })

      const sourcePerimeter = getPerimeterInfo(sourceShape, { x: 20, y: 0 })
      expect(sourcePerimeter).not.toBeNull()

      const linker = createLinker({
        id: 'perimeter_bound_linker',
        name: 'perimeter_bound_linker',
        from: {
          id: sourceShape.id,
          x: sourcePerimeter!.point.x,
          y: sourcePerimeter!.point.y,
          angle: sourcePerimeter!.angle,
          binding: {
            type: 'perimeter',
            pathIndex: sourcePerimeter!.pathIndex,
            segmentIndex: sourcePerimeter!.segmentIndex,
            t: sourcePerimeter!.t,
          },
        },
        to: {
          id: targetShape.id,
          x: 300,
          y: 40,
          binding: { type: 'free' },
        },
      })
      designer.edit.add([linker], { record: false, select: false })

      const started = linkerDrag.beginEdit(createMouseEvent(sourcePerimeter!.point.x, sourcePerimeter!.point.y), {
        linkerId: linker.id,
        point: sourcePerimeter!.point,
        hit: { type: 'from' },
        route: {
          points: [sourcePerimeter!.point, { x: 300, y: 40 }],
          fromAngle: sourcePerimeter!.angle,
          toAngle: 0,
        },
      })

      expect(started).toBe(true)
      expect(linkerDrag.snapTarget()).toEqual({
        shapeId: sourceShape.id,
        binding: {
          type: 'perimeter',
          pathIndex: sourcePerimeter!.pathIndex,
          segmentIndex: sourcePerimeter!.segmentIndex,
          t: sourcePerimeter!.t,
        },
        point: sourcePerimeter!.point,
        angle: sourcePerimeter!.angle,
      })
    })
  })
})
