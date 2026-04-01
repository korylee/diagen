import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createDesigner, createLinker, createShape, type LinkerElement, type ShapeElement } from '@diagen/core'
import { createShapeDrag } from './createShapeDrag'

const testContext = vi.hoisted(() => ({
  designer: null as ReturnType<typeof createDesigner> | null,
}))

vi.mock('../../../..', () => ({
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

    const shapeDrag = createShapeDrag({
      threshold: options.threshold,
      guideTolerance: options.guideTolerance,
      eventToCanvas: event => ({
        x: event.clientX,
        y: event.clientY,
      }),
    })

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

function createShapeById(id: string, x: number, y: number, w = 100, h = 80) {
  return createShape({
    id,
    name: id,
    group: null,
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
})
