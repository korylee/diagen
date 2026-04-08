import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import {
  createDesigner,
  createLinker,
  createShape,
  getShapeAnchorInfo,
  resolvePreferredCreateAnchor,
  type LinkerElement,
} from '@diagen/core'
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

    const linkerDrag = createLinkerDrag({
      threshold: options.threshold ?? 0,
      allowSelfConnect: options.allowSelfConnect,
      eventToCanvas: event => ({
        x: event.clientX,
        y: event.clientY,
      }),
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

  it('应在从图形创建连线时吸附到目标锚点并选中新建连线', () => {
    withLinkerDrag({}, ({ designer, linkerDrag }) => {
      const sourceShape = createShapeById('source_shape', 0, 0)
      const targetShape = createShapeById('target_shape', 300, 0)
      designer.edit.add([sourceShape, targetShape], { record: false, select: false })

      const sourceAnchor = resolvePreferredCreateAnchor(sourceShape)
      const targetAnchor = getShapeAnchorInfo(targetShape, 3)

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

      const linkerDrag = createLinkerDrag({
        threshold: 0,
        allowSelfConnect: false,
        eventToCanvas: event => ({
          x: event.clientX,
          y: event.clientY,
        }),
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
})
