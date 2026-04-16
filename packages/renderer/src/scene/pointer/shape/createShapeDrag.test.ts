import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createDesigner, createLinker, createShape, type LinkerElement, type ShapeElement } from '@diagen/core'
import { createShapeDrag } from './createShapeDrag'

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

function withShapeDrag(
  options: {
    threshold?: number
    guideTolerance?: number
  },
  run: (context: {
    designer: ReturnType<typeof createDesigner>
    shapeDrag: ReturnType<typeof createShapeDrag>
  }) => void,
) {
  createRoot(dispose => {
    const designer = createDesigner({
      autoGrow: {
        enabled: false,
      },
    })

    testContext.designer = designer

    const shapeDrag = createShapeDrag(
      {
        eventToCanvas: event => ({
          x: event.clientX,
          y: event.clientY,
        }),
      },
      {
        threshold: options.threshold,
        guideTolerance: options.guideTolerance,
      },
    )

    try {
      run({ designer, shapeDrag })
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

function createShapeById(
  id: string,
  x: number,
  y: number,
  w = 100,
  h = 80,
  options: {
    parent?: string | null
    children?: string[]
    container?: boolean
  } = {},
) {
  return createShape({
    id,
    name: id,
    group: null,
    parent: options.parent ?? null,
    children: options.children ?? [],
    attribute: {
      ...createShape({}).attribute,
      container: options.container ?? false,
    },
    props: { x, y, w, h, angle: 0 },
  })
}

describe('createShapeDrag', () => {
  it('没有可拖拽图形时 start 应返回 false', () => {
    withShapeDrag({ threshold: 0 }, ({ shapeDrag }) => {
      expect(shapeDrag.start(createMouseEvent(0, 0), ['missing-shape'])).toBe(false)
      expect(shapeDrag.isPending()).toBe(false)
    })
  })

  it('应只移动选中的图形，并忽略非图形 id', () => {
    withShapeDrag({ threshold: 0 }, ({ designer, shapeDrag }) => {
      const shapeA = createShapeById('shape_drag_a', 0, 0)
      const shapeB = createShapeById('shape_drag_b', 100, 80)
      const linker = createLinker({
        id: 'shape_drag_linker',
        name: 'shape_drag_linker',
        from: {
          id: null,
          x: 50,
          y: 40,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 150,
          y: 120,
          binding: { type: 'free' },
        },
      })

      designer.edit.add([shapeA, shapeB, linker], { record: false, select: false })

      expect(shapeDrag.start(createMouseEvent(0, 0), [shapeA.id, linker.id, shapeB.id])).toBe(true)
      shapeDrag.move(createMouseEvent(20, 15))
      shapeDrag.end()

      const nextShapeA = designer.element.getElementById<ShapeElement>(shapeA.id)
      const nextShapeB = designer.element.getElementById<ShapeElement>(shapeB.id)
      const nextLinker = designer.element.getElementById<LinkerElement>(linker.id)

      expect(nextShapeA?.props.x).toBe(20)
      expect(nextShapeA?.props.y).toBe(15)
      expect(nextShapeB?.props.x).toBe(120)
      expect(nextShapeB?.props.y).toBe(95)
      expect(nextLinker?.from.x).toBe(50)
      expect(nextLinker?.to.y).toBe(120)
    })
  })

  it('应在容差内应用参考线吸附结果', () => {
    withShapeDrag({ threshold: 0, guideTolerance: 4 }, ({ designer, shapeDrag }) => {
      const movingShape = createShapeById('moving_shape', 10, 10, 40, 30)
      const candidateShape = createShapeById('candidate_shape', 100, 0, 60, 40)
      designer.edit.add([movingShape, candidateShape], { record: false, select: false })

      expect(shapeDrag.start(createMouseEvent(0, 0), [movingShape.id])).toBe(true)
      shapeDrag.move(createMouseEvent(87, 0))

      const nextShape = designer.element.getElementById<ShapeElement>(movingShape.id)

      expect(nextShape?.props.x).toBe(100)
      expect(nextShape?.props.y).toBe(10)
      expect(shapeDrag.guides().some(line => line.axis === 'x' && line.pos === 100)).toBe(true)
    })
  })

  it('未超过阈值时 end 不应提交拖拽结果', () => {
    withShapeDrag({ threshold: 3 }, ({ designer, shapeDrag }) => {
      const shape = createShapeById('threshold_shape', 30, 40)
      designer.edit.add([shape], { record: false, select: false })
      designer.selection.replace([shape.id])

      expect(shapeDrag.start(createMouseEvent(0, 0))).toBe(true)
      shapeDrag.move(createMouseEvent(2, 2))
      shapeDrag.end()

      const nextShape = designer.element.getElementById<ShapeElement>(shape.id)

      expect(nextShape?.props.x).toBe(30)
      expect(nextShape?.props.y).toBe(40)
      expect(shapeDrag.isPending()).toBe(false)
      expect(shapeDrag.guides()).toEqual([])
    })
  })

  it('拖入容器后应同步更新 parent 与 children，并保持单个 undo 单元', () => {
    withShapeDrag({ threshold: 0 }, ({ designer, shapeDrag }) => {
      const container = createShapeById('drag_container', 0, 0, 320, 240, {
        container: true,
      })
      const shape = createShapeById('drag_into_container', 360, 40, 80, 60)
      designer.edit.add([container, shape], { record: false, select: false })

      expect(shapeDrag.start(createMouseEvent(400, 70), [shape.id])).toBe(true)
      shapeDrag.move(createMouseEvent(140, 110))
      expect(shapeDrag.previewParentId()).toBe(container.id)
      shapeDrag.end()
      expect(shapeDrag.previewParentId()).toBeNull()

      expect(designer.getElementById<ShapeElement>(shape.id)?.parent).toBe(container.id)
      expect(designer.getElementById<ShapeElement>(container.id)?.children).toEqual([shape.id])
      expect(designer.history.undoStack()).toHaveLength(1)

      designer.undo()
      expect(designer.getElementById<ShapeElement>(shape.id)?.parent).toBeNull()
      expect(designer.getElementById<ShapeElement>(container.id)?.children).toEqual([])

      designer.redo()
      expect(designer.getElementById<ShapeElement>(shape.id)?.parent).toBe(container.id)
      expect(designer.getElementById<ShapeElement>(container.id)?.children).toEqual([shape.id])
    })
  })

  it('拖出原容器后应清理旧容器 children', () => {
    withShapeDrag({ threshold: 0 }, ({ designer, shapeDrag }) => {
      const container = createShapeById('drag_out_container', 0, 0, 260, 200, {
        children: ['drag_out_shape'],
        container: true,
      })
      const shape = createShapeById('drag_out_shape', 80, 70, 80, 60, {
        parent: container.id,
      })
      designer.edit.add([container, shape], { record: false, select: false })

      expect(shapeDrag.start(createMouseEvent(120, 100), [shape.id])).toBe(true)
      shapeDrag.move(createMouseEvent(360, 280))
      expect(shapeDrag.previewParentId()).toBeNull()
      shapeDrag.end()

      expect(designer.getElementById<ShapeElement>(shape.id)?.parent).toBeNull()
      expect(designer.getElementById<ShapeElement>(container.id)?.children).toEqual([])
    })
  })

  it('跨容器移动时应一次性修正新旧父容器关系', () => {
    withShapeDrag({ threshold: 0 }, ({ designer, shapeDrag }) => {
      const containerA = createShapeById('container_a', 0, 0, 220, 220, {
        children: ['cross_container_shape'],
        container: true,
      })
      const containerB = createShapeById('container_b', 300, 0, 220, 220, {
        container: true,
      })
      const shape = createShapeById('cross_container_shape', 60, 70, 80, 60, {
        parent: containerA.id,
      })
      designer.edit.add([containerA, containerB, shape], { record: false, select: false })

      expect(shapeDrag.start(createMouseEvent(100, 100), [shape.id])).toBe(true)
      shapeDrag.move(createMouseEvent(380, 100))
      shapeDrag.end()

      expect(designer.getElementById<ShapeElement>(shape.id)?.parent).toBe(containerB.id)
      expect(designer.getElementById<ShapeElement>(containerA.id)?.children).toEqual([])
      expect(designer.getElementById<ShapeElement>(containerB.id)?.children).toEqual([shape.id])
      expect(designer.history.undoStack()).toHaveLength(1)
    })
  })

  it('多选拖入同一容器时，应共享预览父容器并在一次事务内提交', () => {
    withShapeDrag({ threshold: 0 }, ({ designer, shapeDrag }) => {
      const container = createShapeById('batch_container', 0, 0, 320, 240, {
        container: true,
      })
      const shapeA = createShapeById('batch_shape_a', 360, 40, 80, 60)
      const shapeB = createShapeById('batch_shape_b', 470, 40, 80, 60)
      designer.edit.add([container, shapeA, shapeB], { record: false, select: false })

      expect(shapeDrag.start(createMouseEvent(400, 70), [shapeA.id, shapeB.id])).toBe(true)
      shapeDrag.move(createMouseEvent(140, 110))
      expect(shapeDrag.previewParentId()).toBe(container.id)
      shapeDrag.end()

      expect(designer.getElementById<ShapeElement>(shapeA.id)?.parent).toBe(container.id)
      expect(designer.getElementById<ShapeElement>(shapeB.id)?.parent).toBe(container.id)
      expect(designer.getElementById<ShapeElement>(container.id)?.children).toEqual([shapeA.id, shapeB.id])
      expect(designer.history.undoStack()).toHaveLength(1)
    })
  })

  it('多选目标命中不同容器时，预览应返回 null 但提交仍应分别收口', () => {
    withShapeDrag({ threshold: 0 }, ({ designer, shapeDrag }) => {
      const containerA = createShapeById('preview_container_a', 0, 0, 220, 220, {
        container: true,
      })
      const containerB = createShapeById('preview_container_b', 300, 0, 220, 220, {
        container: true,
      })
      const shapeA = createShapeById('preview_shape_a', 260, 40, 80, 60)
      const shapeB = createShapeById('preview_shape_b', 560, 40, 80, 60)
      designer.edit.add([containerA, containerB, shapeA, shapeB], { record: false, select: false })

      expect(shapeDrag.start(createMouseEvent(300, 70), [shapeA.id, shapeB.id])).toBe(true)
      shapeDrag.move(createMouseEvent(100, 70))
      expect(shapeDrag.previewParentId()).toBeNull()
      shapeDrag.end()

      expect(designer.getElementById<ShapeElement>(shapeA.id)?.parent).toBe(containerA.id)
      expect(designer.getElementById<ShapeElement>(shapeB.id)?.parent).toBe(containerB.id)
      expect(designer.getElementById<ShapeElement>(containerA.id)?.children).toEqual([shapeA.id])
      expect(designer.getElementById<ShapeElement>(containerB.id)?.children).toEqual([shapeB.id])
      expect(designer.history.undoStack()).toHaveLength(1)
    })
  })
})
