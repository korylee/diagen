import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createDesigner, createShape, type ShapeElement } from '@diagen/core'
import { createResize } from '../createResize'

const testContext = vi.hoisted(() => ({
  designer: null as ReturnType<typeof createDesigner> | null,
}))

vi.mock('../../components', () => ({
  useDesigner: () => {
    if (!testContext.designer) {
      throw new Error('designer context is not ready')
    }
    return testContext.designer
  },
}))

function withResize(
  options: {
    threshold?: number
    guideTolerance?: number
    minWidth?: number
    minHeight?: number
  },
  run: (context: {
    designer: ReturnType<typeof createDesigner>
    resize: ReturnType<typeof createResize>
  }) => void,
) {
  createRoot(dispose => {
    const designer = createDesigner({
      autoGrow: {
        enabled: false,
      },
    })

    testContext.designer = designer

    const resize = createResize({
      threshold: options.threshold,
      guideTolerance: options.guideTolerance,
      minWidth: options.minWidth,
      minHeight: options.minHeight,
      eventToCanvas: event => ({
        x: event.clientX,
        y: event.clientY,
      }),
    })

    try {
      run({ designer, resize })
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

describe('createResize', () => {
  it('目标无效时 start 应返回 false', () => {
    withResize({ threshold: 0 }, ({ resize }) => {
      expect(resize.start('missing-shape', 'e', createMouseEvent(0, 0))).toBe(false)
      expect(resize.isActive()).toBe(false)
    })
  })

  it('应按拖拽方向更新图形尺寸', () => {
    withResize({ threshold: 0 }, ({ designer, resize }) => {
      const shape = createShapeById('resize_shape', 10, 20, 40, 30)
      designer.edit.add([shape], { record: false, select: false })

      expect(resize.start(shape.id, 'e', createMouseEvent(0, 0))).toBe(true)
      expect(resize.isActive()).toBe(true)
      expect(resize.state()?.targetId).toBe(shape.id)
      expect(resize.state()?.direction).toBe('e')

      resize.move(createMouseEvent(15, 0))
      resize.end()

      const nextShape = designer.element.getElementById<ShapeElement>(shape.id)
      expect(nextShape?.props.x).toBe(10)
      expect(nextShape?.props.y).toBe(20)
      expect(nextShape?.props.w).toBe(55)
      expect(nextShape?.props.h).toBe(30)
      expect(resize.state()).toBeNull()
    })
  })

  it('应在容差内应用参考线吸附结果', () => {
    withResize({ threshold: 0, guideTolerance: 4 }, ({ designer, resize }) => {
      const shape = createShapeById('resize_snap_shape', 10, 10, 40, 30)
      const candidate = createShapeById('resize_candidate', 53, 0, 20, 20)
      designer.edit.add([shape, candidate], { record: false, select: false })

      expect(resize.start(shape.id, 'e', createMouseEvent(0, 0))).toBe(true)
      resize.move(createMouseEvent(2, 0))

      const nextShape = designer.element.getElementById<ShapeElement>(shape.id)
      expect(nextShape?.props.w).toBe(43)
      expect(resize.guides().some(line => line.axis === 'x' && line.pos === 53)).toBe(true)

      resize.end()
    })
  })

  it('未超过阈值时 end 不应提交缩放结果', () => {
    withResize({ threshold: 3 }, ({ designer, resize }) => {
      const shape = createShapeById('resize_threshold_shape', 100, 20, 40, 30)
      designer.edit.add([shape], { record: false, select: false })

      expect(resize.start(shape.id, 'w', createMouseEvent(0, 0))).toBe(true)
      resize.move(createMouseEvent(2, 0))
      resize.end()

      const nextShape = designer.element.getElementById<ShapeElement>(shape.id)
      expect(nextShape?.props.x).toBe(100)
      expect(nextShape?.props.w).toBe(40)
      expect(resize.isActive()).toBe(false)
      expect(resize.guides()).toEqual([])
    })
  })
})
