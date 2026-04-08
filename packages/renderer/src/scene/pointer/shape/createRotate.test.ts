import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createDesigner, createShape, type ShapeElement } from '@diagen/core'
import { createRotate } from './createRotate'

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

function withRotate(
  options: {
    threshold?: number
    snapStep?: number
  },
  run: (context: { designer: ReturnType<typeof createDesigner>; rotate: ReturnType<typeof createRotate> }) => void,
) {
  createRoot(dispose => {
    const designer = createDesigner({
      autoGrow: {
        enabled: false,
      },
    })

    testContext.designer = designer

    const rotate = createRotate({
      threshold: options.threshold,
      snapStep: options.snapStep,
      eventToCanvas: event => ({
        x: event.clientX,
        y: event.clientY,
      }),
    })

    try {
      run({ designer, rotate })
    } finally {
      testContext.designer = null
      dispose()
    }
  })
}

function createMouseEvent(x: number, y: number, options: { shiftKey?: boolean } = {}): MouseEvent {
  return {
    clientX: x,
    clientY: y,
    shiftKey: options.shiftKey ?? false,
  } as MouseEvent
}

function createShapeById(id: string, x: number, y: number, w = 100, h = 100) {
  return createShape({
    id,
    name: id,
    group: null,
    props: { x, y, w, h, angle: 0 },
  })
}

function createPointByAngle(center: { x: number; y: number }, angle: number, radius = 50) {
  const rad = (angle * Math.PI) / 180
  return {
    x: center.x + Math.cos(rad) * radius,
    y: center.y + Math.sin(rad) * radius,
  }
}

describe('createRotate', () => {
  it('目标不可旋转时 start 应返回 false', () => {
    withRotate({ threshold: 0, snapStep: 15 }, ({ rotate }) => {
      expect(rotate.start('missing-shape', createMouseEvent(100, 50))).toBe(false)
      expect(rotate.state()).toBeNull()
      expect(rotate.isActive()).toBe(false)
    })
  })

  it('应根据指针角度更新图形旋转角度', () => {
    withRotate({ threshold: 0, snapStep: 15 }, ({ designer, rotate }) => {
      const shape = createShapeById('rotate_shape', 0, 0)
      designer.edit.add([shape], { record: false, select: false })

      const started = rotate.start(shape.id, createMouseEvent(100, 50))
      expect(started).toBe(true)
      expect(rotate.isActive()).toBe(true)
      expect(rotate.state()?.targetId).toBe(shape.id)

      rotate.move(createMouseEvent(50, 100))
      rotate.end()

      const nextShape = designer.element.getElementById<ShapeElement>(shape.id)
      expect(nextShape?.props.angle).toBe(90)
      expect(rotate.state()).toBeNull()
    })
  })

  it('按住 shift 时应按 snapStep 吸附旋转角度', () => {
    withRotate({ threshold: 0, snapStep: 15 }, ({ designer, rotate }) => {
      const shape = createShapeById('rotate_snap_shape', 0, 0)
      designer.edit.add([shape], { record: false, select: false })

      const center = { x: 50, y: 50 }
      const targetPoint = createPointByAngle(center, 37)

      expect(rotate.start(shape.id, createMouseEvent(100, 50))).toBe(true)

      rotate.move(createMouseEvent(targetPoint.x, targetPoint.y, { shiftKey: true }))
      rotate.end()

      const nextShape = designer.element.getElementById<ShapeElement>(shape.id)
      expect(nextShape?.props.angle).toBe(30)
    })
  })
})
