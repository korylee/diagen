import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createPointerMachine } from './machine'

function createMouseEvent(x: number, y: number): MouseEvent {
  return {
    clientX: x,
    clientY: y,
    button: 0,
  } as MouseEvent
}

function createMachine() {
  let isPanning = false
  let isSelecting = false

  const pan = {
    canPan: vi.fn((_event: MouseEvent) => false),
    start: vi.fn((event: MouseEvent) => {
      if (!pan.canPan(event)) return false
      isPanning = true
      return true
    }),
    move: vi.fn(),
    end: vi.fn(() => {
      isPanning = false
    }),
    isActive: vi.fn(() => isPanning),
  }
  const shapeDrag = {
    start: vi.fn(() => true),
    move: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
    isPending: vi.fn(() => false),
    isDragging: vi.fn(() => false),
  }
  const linkerDrag = {
    beginEdit: vi.fn(() => true),
    beginCreate: vi.fn(() => true),
    move: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
    isActive: vi.fn(() => false),
    isDragging: vi.fn(() => false),
    state: vi.fn(() => null),
    isShapeLinkable: vi.fn(() => false),
    snapTarget: vi.fn(() => null),
    hitTestWithRoute: vi.fn(() => null),
    hitTest: vi.fn(() => null),
  }
  const resize = {
    start: vi.fn(() => true),
    move: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
    isActive: vi.fn(() => false),
    state: vi.fn(() => null),
    guides: vi.fn(() => []),
    hitTest: vi.fn(() => null),
  }
  const rotate = {
    start: vi.fn(() => true),
    move: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
    isActive: vi.fn(() => false),
    state: vi.fn(() => null),
  }
  const boxSelect = {
    start: vi.fn(() => {
      if (isSelecting) return false
      isSelecting = true
      return true
    }),
    move: vi.fn(),
    end: vi.fn(() => {
      isSelecting = false
    }),
    cancel: vi.fn(() => {
      isSelecting = false
    }),
    isActive: vi.fn(() => isSelecting),
    bounds: vi.fn(() => null),
  }

  const machine = createPointerMachine({
    pan: pan as any,
    shapeDrag: shapeDrag as any,
    linkerDrag: linkerDrag as any,
    resize: resize as any,
    rotate: rotate as any,
    boxSelect: boxSelect as any,
    eventToCanvas: event => ({
      x: event.clientX,
      y: event.clientY,
    }),
  })

  return {
    machine,
    pan,
    shapeDrag,
    linkerDrag,
    resize,
    rotate,
    boxSelect,
  }
}

describe('createPointerMachine', () => {
  it('平移开始成功时应进入 panning 并显示 grabbing 光标', () => {
    createRoot(dispose => {
      const { machine, pan } = createMachine()
      pan.canPan.mockReturnValue(true)

      expect(machine.startPan(createMouseEvent(5, 6))).toBe(true)
      expect(pan.start).toHaveBeenCalledTimes(1)
      expect(machine.mode()).toBe('panning')
      expect(machine.showGrabbingCursor()).toBe(true)
      expect(machine.shouldAutoScroll()).toBe(false)

      machine.end()

      expect(pan.end).toHaveBeenCalledTimes(1)
      expect(machine.mode()).toBe('idle')

      dispose()
    })
  })

  it('拖拽图形时应进入 draggingShape 并显示 grabbing 光标', () => {
    createRoot(dispose => {
      const { machine, shapeDrag } = createMachine()

      expect(machine.startShapeDrag(createMouseEvent(10, 20))).toBe(true)
      expect(shapeDrag.start).toHaveBeenCalledTimes(1)
      expect(machine.mode()).toBe('draggingShape')
      expect(machine.shouldAutoScroll()).toBe(true)
      expect(machine.showGrabbingCursor()).toBe(true)

      machine.end()

      expect(shapeDrag.end).toHaveBeenCalledTimes(1)
      expect(machine.mode()).toBe('idle')
      expect(machine.showGrabbingCursor()).toBe(false)

      dispose()
    })
  })

  it('框选时应允许自动滚动但不显示 grabbing 光标', () => {
    createRoot(dispose => {
      const { machine, boxSelect } = createMachine()

      expect(machine.startBoxSelect(createMouseEvent(30, 40))).toBe(true)
      expect(boxSelect.start).toHaveBeenCalledTimes(1)
      expect(machine.mode()).toBe('boxSelecting')
      expect(machine.shouldAutoScroll()).toBe(true)
      expect(machine.showGrabbingCursor()).toBe(false)

      machine.cancel()

      expect(boxSelect.cancel).toHaveBeenCalledTimes(1)
      expect(machine.mode()).toBe('idle')

      dispose()
    })
  })

  it('启动失败时不应切换模式', () => {
    createRoot(dispose => {
      const { machine, rotate } = createMachine()
      rotate.start.mockReturnValue(false)

      expect(machine.startRotate('shape-id', createMouseEvent(50, 60))).toBe(false)
      expect(machine.mode()).toBe('idle')
      expect(machine.isActive()).toBe(false)
      expect(machine.showGrabbingCursor()).toBe(false)

      dispose()
    })
  })
})
