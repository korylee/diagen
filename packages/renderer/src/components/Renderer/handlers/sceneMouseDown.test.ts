import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createDesigner, createLinker, createShape, type ShapeElement } from '@diagen/core'
import * as rendererUtils from '../../../utils'
import { createSceneDown } from './sceneMouseDown'
import { Interaction } from '../../InteractionProvider'

const designerCtx = vi.hoisted(() => ({
  current: null as ReturnType<typeof createDesigner> | null,
}))

vi.mock('../../DesignerProvider', () => ({
  useDesigner: () => {
    if (!designerCtx.current) {
      throw new Error('designer context is not set in sceneMouseDown test')
    }
    return designerCtx.current
  },
}))

function createRect(id: string, x: number, y: number, w = 100, h = 80): ShapeElement {
  return createShape({
    id,
    name: id,
    group: null,
    props: { x, y, w, h, angle: 0 },
  })
}

function createMouseEvent(x: number, y: number, init: MouseEventInit = {}): MouseEvent {
  return new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: init.button ?? 0,
    buttons: init.buttons ?? 1,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    shiftKey: init.shiftKey ?? false,
    altKey: init.altKey ?? false,
  })
}

function withSceneDown(
  run: (ctx: {
    designer: ReturnType<typeof createDesigner>
    pointer: {
      machine: {
        isIdle: ReturnType<typeof vi.fn>
        beginLinkerCreate: ReturnType<typeof vi.fn>
        beginLinkerEdit: ReturnType<typeof vi.fn>
        startResize: ReturnType<typeof vi.fn>
        startShapeDrag: ReturnType<typeof vi.fn>
        startBoxSelect: ReturnType<typeof vi.fn>
      }
      resize: {
        hitTest: ReturnType<typeof vi.fn>
      }
    }
    onSceneDown: (event: MouseEvent) => boolean
  }) => void,
) {
  createRoot(dispose => {
    const designer = createDesigner({
      autoGrow: { enabled: false },
    })
    designerCtx.current = designer

    const pointer = {
      machine: {
        isIdle: vi.fn(() => true),
        beginLinkerCreate: vi.fn(() => true),
        beginLinkerEdit: vi.fn(() => true),
        startResize: vi.fn(() => true),
        startShapeDrag: vi.fn(() => true),
        startBoxSelect: vi.fn(() => true),
      },
      resize: {
        hitTest: vi.fn(() => null),
      },
    }

    const onSceneDown = createSceneDown({
      pointer: pointer as any,
      coordinate: {
        eventToCanvas: (event: { clientX: number; clientY: number }) => ({
          x: event.clientX,
          y: event.clientY,
        }),
      } as any,
    } as Interaction)

    try {
      run({
        designer,
        pointer,
        onSceneDown,
      })
    } finally {
      designerCtx.current = null
      dispose()
    }
  })
}

describe('createSceneDown', () => {
  it('非左键或交互机非 idle 时应直接返回 false', () => {
    withSceneDown(({ pointer, onSceneDown }) => {
      const rightClick = createMouseEvent(10, 10, { button: 2, buttons: 2 })
      expect(onSceneDown(rightClick)).toBe(false)

      pointer.machine.isIdle.mockReturnValue(false)
      const leftClick = createMouseEvent(10, 10)
      expect(onSceneDown(leftClick)).toBe(false)

      expect(pointer.machine.startBoxSelect).not.toHaveBeenCalled()
      expect(pointer.machine.startShapeDrag).not.toHaveBeenCalled()
    })
  })

  it('点击空白区域时应清空选择并进入框选', () => {
    withSceneDown(({ designer, pointer, onSceneDown }) => {
      const shape = createRect('blank_shape', 100, 100)
      designer.edit.add([shape], { record: false, select: false })
      designer.selection.replace([shape.id])

      const event = createMouseEvent(20, 20)
      expect(onSceneDown(event)).toBe(true)

      expect(designer.selection.selectedIds()).toEqual([])
      expect(pointer.machine.startBoxSelect).toHaveBeenCalledTimes(1)
      expect(pointer.machine.startBoxSelect).toHaveBeenCalledWith(event)
      expect(event.defaultPrevented).toBe(true)
    })
  })

  it('点击图形时应选中图形并进入拖拽', () => {
    withSceneDown(({ designer, pointer, onSceneDown }) => {
      const shape = createRect('shape_down', 100, 100)
      designer.edit.add([shape], { record: false, select: false })

      const event = createMouseEvent(120, 120)
      expect(onSceneDown(event)).toBe(true)

      expect(designer.selection.selectedIds()).toEqual([shape.id])
      expect(pointer.machine.startShapeDrag).toHaveBeenCalledTimes(1)
      expect(pointer.machine.startShapeDrag).toHaveBeenCalledWith(event)
    })
  })

  it('按住 ctrl 点击已选图形时应切换选中状态', () => {
    withSceneDown(({ designer, pointer, onSceneDown }) => {
      const shape = createRect('shape_toggle', 100, 100)
      designer.edit.add([shape], { record: false, select: false })
      designer.selection.replace([shape.id])

      const event = createMouseEvent(120, 120, { ctrlKey: true })
      expect(onSceneDown(event)).toBe(true)

      expect(designer.selection.selectedIds()).toEqual([])
      expect(pointer.machine.startShapeDrag).toHaveBeenCalledTimes(1)
    })
  })

  it('命中 resize handle 时应优先进入 resize 分支', () => {
    withSceneDown(({ designer, pointer, onSceneDown }) => {
      const shape = createRect('shape_resize', 100, 100)
      designer.edit.add([shape], { record: false, select: false })
      designer.selection.replace([shape.id])
      pointer.resize.hitTest.mockReturnValue({ id: shape.id, dir: 'e' })

      const event = createMouseEvent(120, 120)
      expect(onSceneDown(event)).toBe(true)

      expect(pointer.machine.startResize).toHaveBeenCalledTimes(1)
      expect(pointer.machine.startResize).toHaveBeenCalledWith(shape.id, 'e', event)
      expect(pointer.machine.startShapeDrag).not.toHaveBeenCalled()
      expect(designer.selection.selectedIds()).toEqual([shape.id])
    })
  })

  it('create-shape 非连续模式下应创建图形并回到 idle', () => {
    withSceneDown(({ designer, onSceneDown }) => {
      designer.tool.setCreateShape('rectangle', { continuous: false })

      const event = createMouseEvent(240, 180)
      expect(onSceneDown(event)).toBe(true)

      const shapes = designer.element.shapes()
      expect(shapes).toHaveLength(1)
      expect(designer.selection.selectedIds()).toEqual([shapes[0].id])
      expect(designer.tool.toolState()).toEqual({ type: 'idle' })
      expect(event.defaultPrevented).toBe(true)
    })
  })

  it('create-linker 从图形起链时应以 shape 作为 from 并回到 idle', () => {
    withSceneDown(({ designer, pointer, onSceneDown }) => {
      const shape = createRect('shape_linker', 100, 100)
      designer.edit.add([shape], { record: false, select: false })
      designer.tool.setCreateLinker('linker', { continuous: false })

      const event = createMouseEvent(120, 120)
      expect(onSceneDown(event)).toBe(true)

      expect(pointer.machine.beginLinkerCreate).toHaveBeenCalledTimes(1)
      expect(pointer.machine.beginLinkerCreate).toHaveBeenCalledWith(
        event,
        expect.objectContaining({
          linkerId: 'linker',
          from: {
            type: 'shape',
            shapeId: shape.id,
          },
        }),
      )
      expect(designer.tool.toolState()).toEqual({ type: 'idle' })
    })
  })

  it('create-linker 从空白起链时应以 point 作为 from', () => {
    withSceneDown(({ designer, pointer, onSceneDown }) => {
      designer.tool.setCreateLinker('linker', { continuous: true })

      const event = createMouseEvent(260, 210)
      expect(onSceneDown(event)).toBe(true)

      expect(pointer.machine.beginLinkerCreate).toHaveBeenCalledTimes(1)
      expect(pointer.machine.beginLinkerCreate).toHaveBeenCalledWith(
        event,
        expect.objectContaining({
          linkerId: 'linker',
          from: {
            type: 'point',
            point: { x: 260, y: 210 },
          },
        }),
      )
      expect(designer.tool.toolState()).toEqual({
        type: 'create-linker',
        linkerId: 'linker',
        continuous: true,
      })
    })
  })

  it('点击连线时应选中连线并进入编辑', () => {
    withSceneDown(({ designer, pointer, onSceneDown }) => {
      const linker = createLinker({
        id: 'scene_linker',
        name: 'scene_linker',
        linkerType: 'straight',
        from: { id: null, x: 100, y: 100, binding: { type: 'free' } },
        to: { id: null, x: 240, y: 100, binding: { type: 'free' } },
      })
      const route = { points: [{ x: 100, y: 100 }, { x: 240, y: 100 }] }
      const hit = { type: 'path', segmentIndex: 0 }
      designer.edit.add([linker], { record: false, select: false })

      const hitSceneSpy = vi.spyOn(rendererUtils, 'hitTestScene').mockReturnValue({
        type: 'linker',
        element: linker,
        route,
        hit,
      } as any)

      try {
        const event = createMouseEvent(160, 100)
        expect(onSceneDown(event)).toBe(true)

        expect(designer.selection.selectedIds()).toEqual([linker.id])
        expect(pointer.machine.beginLinkerEdit).toHaveBeenCalledTimes(1)
        expect(pointer.machine.beginLinkerEdit).toHaveBeenCalledWith(event, {
          linkerId: linker.id,
          point: { x: 160, y: 100 },
          hit,
          route,
        })
      } finally {
        hitSceneSpy.mockRestore()
      }
    })
  })
})
