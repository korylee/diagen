import { describe, expect, it, vi } from 'vitest'
import { createLinker } from '@diagen/core'
import { createRendererTestHarness } from '../../.test/createRendererTestHarness'

type RendererHarness = Awaited<ReturnType<typeof createRendererTestHarness>>

function rotateVector(point: { x: number; y: number }, center: { x: number; y: number }) {
  return {
    x: center.x - (point.y - center.y),
    y: center.y + (point.x - center.x),
  }
}

function pointByAngle(center: { x: number; y: number }, angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180
  return {
    x: center.x + Math.cos(rad) * radius,
    y: center.y + Math.sin(rad) * radius,
  }
}

function isMacPlatform() {
  return /Mac|iPod|iPhone|iPad/.test(window.navigator.platform ?? '')
}

async function dispatchModShortcut(key: string): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    code: `Key${key.toUpperCase()}`,
    ctrlKey: !isMacPlatform(),
    metaKey: isMacPlatform(),
  })
  window.dispatchEvent(event)
  await Promise.resolve()
  return event
}

async function dispatchKeyDown(init: KeyboardEventInit): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  window.dispatchEvent(event)
  await Promise.resolve()
  return event
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function selectSingleShape(
  harness: RendererHarness,
  point: { x: number; y: number },
  expectedId?: string,
): Promise<void> {
  await harness.dispatchSceneMouseDownAtCanvas(point)
  await harness.dispatchWindowMouseUp()

  if (expectedId) {
    expect(harness.designer.selection.selectedIds()).toEqual([expectedId])
  }
}

function getShapeProps(harness: RendererHarness, id: string) {
  const shape = harness.designer.getElementById(id)
  expect(shape?.type).toBe('shape')
  if (!shape || shape.type !== 'shape') {
    throw new Error(`shape ${id} 未找到`)
  }
  return shape.props
}

function expectShapeProps(
  harness: RendererHarness,
  id: string,
  expected: Partial<{
    x: number
    y: number
    w: number
    h: number
    angle: number
  }>,
): void {
  const props = getShapeProps(harness, id)
  for (const [key, value] of Object.entries(expected) as Array<[keyof typeof expected, number]>) {
    expect(props[key]).toBe(value)
  }
}

function getLinkerOrThrow(harness: RendererHarness, id: string) {
  const linker = harness.designer.getElementById(id)
  expect(linker?.type).toBe('linker')
  if (!linker || linker.type !== 'linker') {
    throw new Error(`linker ${id} 未找到`)
  }
  return linker
}

function expectLinkerEndpoint(
  harness: RendererHarness,
  id: string,
  endpoint: 'from' | 'to',
  expected: Partial<{
    id: string | null
    x: number
    y: number
  }>,
): void {
  const target = getLinkerOrThrow(harness, id)[endpoint]
  for (const [key, value] of Object.entries(expected) as Array<[keyof typeof expected, string | number | null]>) {
    expect(target[key]).toBe(value)
  }
}

function getRotateHandle(harness: RendererHarness): HTMLElement {
  const handle = harness.getOverlayElementsByCursor('grab')[0]
  expect(handle).toBeTruthy()
  return handle
}

describe('Renderer', () => {
  it('空白区域框选应选中命中的图形，并在结束后退出框选态', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_a', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_b', x: 260, y: 140, w: 100, h: 80 },
        { id: 'shape_c', x: 520, y: 420, w: 100, h: 80 },
      ],
    })

    try {
      const interaction = harness.getInteraction()

      expect(harness.designer.view.viewportSize()).toEqual({
        width: 900,
        height: 700,
      })
      expect(interaction.pointer.machine.mode()).toBe('idle')

      await harness.dispatchSceneMouseDownAtCanvas({ x: 80, y: 80 })

      expect(interaction.pointer.machine.mode()).toBe('boxSelecting')

      await harness.dispatchWindowMouseMoveAtCanvas({ x: 380, y: 260 })

      expect(interaction.pointer.boxSelect.bounds()).toEqual({
        x: 80,
        y: 80,
        w: 300,
        h: 180,
      })

      await harness.dispatchWindowMouseUp()

      expect(interaction.pointer.machine.mode()).toBe('idle')
      expect(harness.designer.selection.selectedIds()).toEqual(['shape_a', 'shape_b'])
    } finally {
      harness.dispose()
    }
  })

  it('滚动后框选仍应命中正确的图形', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_scroll_a', x: 120, y: 110, w: 100, h: 80 },
        { id: 'shape_scroll_b', x: 280, y: 150, w: 100, h: 80 },
        { id: 'shape_scroll_c', x: 620, y: 460, w: 100, h: 80 },
      ],
    })

    try {
      await harness.setScroll(48, 36)

      await harness.dispatchSceneMouseDownAtCanvas({ x: 90, y: 90 })
      await harness.dispatchWindowMouseMoveAtCanvas({ x: 390, y: 280 })
      await harness.dispatchWindowMouseUp()

      expect(harness.designer.selection.selectedIds()).toEqual(['shape_scroll_a', 'shape_scroll_b'])
      expect(harness.getInteraction().pointer.machine.mode()).toBe('idle')
    } finally {
      harness.dispose()
    }
  })

  it('拖拽触边后即使指针停留，auto-scroll 也应持续推进直到 mouseup', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_auto_scroll', x: 100, y: 100, w: 100, h: 80 }],
    })

    try {
      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })
      expect(harness.getInteraction().pointer.machine.mode()).toBe('draggingShape')

      const stickyEdgeClient = { x: 1018, y: 220 }
      await harness.dispatchWindowMouseMoveAtClient(stickyEdgeClient)
      const afterFirstMove = harness.viewport.scrollLeft
      expect(afterFirstMove).toBeGreaterThan(0)

      await sleep(50)
      const afterHold = harness.viewport.scrollLeft
      expect(afterHold).toBeGreaterThan(afterFirstMove)

      await harness.dispatchWindowMouseUp()
      const afterUp = harness.viewport.scrollLeft
      await sleep(40)
      expect(harness.viewport.scrollLeft).toBe(afterUp)
      expect(harness.getInteraction().pointer.machine.mode()).toBe('idle')
    } finally {
      harness.dispose()
    }
  })

  it('左上自动扩展时应同步补偿滚动位置，保持当前画面稳定', async () => {
    const harness = await createRendererTestHarness({
      pageWidth: 200,
      pageHeight: 200,
      autoGrow: {
        enabled: true,
        growPadding: 40,
        growStep: 50,
      },
    })

    try {
      const watchedCanvasPoint = { x: -200, y: -200 }
      const beforeClient = harness.canvasToClient(watchedCanvasPoint)

      const changed = harness.designer.view.ensureContainerFits({
        // 使用远离 growPadding 的越界输入，避免测试卡在阈值边界
        x: -260,
        y: -260,
        w: 300,
        h: 240,
      })

      expect(changed).toBe(true)

      await Promise.resolve()
      await Promise.resolve()

      const afterClient = harness.canvasToClient(watchedCanvasPoint)

      expect(harness.designer.view.originOffset()).toEqual({
        x: 300,
        y: 300,
      })
      expect(harness.viewport.scrollLeft).toBe(300)
      expect(harness.viewport.scrollTop).toBe(300)
      expect(afterClient.x).toBe(beforeClient.x)
      expect(afterClient.y).toBe(beforeClient.y)
    } finally {
      harness.dispose()
    }
  })

  it('缩放后拖拽图形应按画布坐标归一化位移，并保持单个 undo 单元', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_drag', x: 100, y: 100, w: 100, h: 80 }],
    })

    try {
      const interaction = harness.getInteraction()
      harness.designer.view.setZoom(2)

      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })

      expect(interaction.pointer.machine.mode()).toBe('draggingShape')

      const startClient = harness.canvasToClient({ x: 140, y: 140 })
      await harness.dispatchWindowMouseMoveAtClient({
        x: startClient.x + 40,
        y: startClient.y + 20,
      })
      await harness.dispatchWindowMouseUp()

      expect(interaction.pointer.machine.mode()).toBe('idle')
      expectShapeProps(harness, 'shape_drag', {
        x: 120,
        y: 110,
      })
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      expectShapeProps(harness, 'shape_drag', {
        x: 100,
        y: 100,
      })

      harness.designer.redo()
      expectShapeProps(harness, 'shape_drag', {
        x: 120,
        y: 110,
      })
    } finally {
      harness.dispose()
    }
  })

  it('拖拽图形时应显示 move guide line 并按参考线吸附', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_drag_guide_source', x: 10, y: 10, w: 40, h: 30 },
        { id: 'shape_drag_guide_target', x: 100, y: 80, w: 60, h: 40 },
      ],
    })

    try {
      await harness.dispatchSceneMouseDownAtCanvas({ x: 20, y: 20 })
      await harness.dispatchWindowMouseMoveAtCanvas({ x: 107, y: 20 })

      expectShapeProps(harness, 'shape_drag_guide_source', {
        x: 100,
      })

      const guideOverlay = harness.overlayLayer.querySelector('[data-guide-overlay="true"]')
      expect(guideOverlay).toBeTruthy()

      const xGuide = harness.overlayLayer.querySelector('line[data-guide-axis="x"]')
      expect(xGuide).toBeTruthy()

      const distanceLabel = harness.overlayLayer.querySelector('[data-guide-distance="40px"]')
      expect(distanceLabel?.textContent).toBe('40px')

      await harness.dispatchWindowMouseUp()
      expect(harness.getInteraction().pointer.machine.mode()).toBe('idle')
    } finally {
      harness.dispose()
    }
  })

  it('ctrl+wheel 缩放应以当前指针位置为中心更新 transform', async () => {
    const harness = await createRendererTestHarness()

    try {
      await harness.dispatchCtrlWheelAtCanvas({ x: 200, y: 200 }, -100)

      const transform = harness.designer.view.transform()

      expect(transform.zoom).toBeCloseTo(1.1)
      expect(transform.x).toBeCloseTo(-20)
      expect(transform.y).toBeCloseTo(-20)
    } finally {
      harness.dispose()
    }
  })

  it('选中图形后通过 east 手柄 resize 应更新尺寸并支持 undo/redo', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_resize', x: 100, y: 100, w: 100, h: 80 }],
    })

    try {
      const interaction = harness.getInteraction()

      await selectSingleShape(harness, { x: 140, y: 140 }, 'shape_resize')

      await harness.dispatchSceneMouseDownAtCanvas({ x: 200, y: 140 })

      expect(interaction.pointer.machine.mode()).toBe('resizing')

      await harness.dispatchWindowMouseMoveAtCanvas({ x: 230, y: 140 })
      await harness.dispatchWindowMouseUp()

      expect(interaction.pointer.machine.mode()).toBe('idle')
      expectShapeProps(harness, 'shape_resize', {
        w: 130,
        h: 80,
      })
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      expectShapeProps(harness, 'shape_resize', {
        w: 100,
      })

      harness.designer.redo()
      expectShapeProps(harness, 'shape_resize', {
        w: 130,
      })
    } finally {
      harness.dispose()
    }
  })

  it('resize 时应显示 guide line 并按参考线吸附', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_resize_guide_source', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_resize_guide_target', x: 230, y: 240, w: 80, h: 80 },
      ],
    })

    try {
      await selectSingleShape(harness, { x: 140, y: 140 }, 'shape_resize_guide_source')

      await harness.dispatchSceneMouseDownAtCanvas({ x: 200, y: 140 })
      await harness.dispatchWindowMouseMoveAtCanvas({ x: 227, y: 140 })

      expectShapeProps(harness, 'shape_resize_guide_source', {
        w: 130,
      })

      const guideOverlay = harness.overlayLayer.querySelector('[data-guide-overlay="true"]')
      expect(guideOverlay).toBeTruthy()

      const xGuide = harness.overlayLayer.querySelector('line[data-guide-axis="x"]')
      expect(xGuide).toBeTruthy()

      const distanceLabel = harness.overlayLayer.querySelector('[data-guide-distance="60px"]')
      expect(distanceLabel?.textContent).toBe('60px')

      await harness.dispatchWindowMouseUp()
      expect(harness.getInteraction().pointer.machine.mode()).toBe('idle')
    } finally {
      harness.dispose()
    }
  })

  it('缩放并滚动后 resize 应按画布坐标归一化尺寸，并保持单个 undo 单元', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_resize_zoom_scroll', x: 100, y: 100, w: 100, h: 80 }],
    })

    try {
      const interaction = harness.getInteraction()
      harness.designer.view.setZoom(2)
      await harness.setScroll(48, 36)

      await selectSingleShape(harness, { x: 140, y: 140 }, 'shape_resize_zoom_scroll')

      await harness.dispatchSceneMouseDownAtCanvas({ x: 200, y: 140 })

      expect(interaction.pointer.machine.mode()).toBe('resizing')

      const startClient = harness.canvasToClient({ x: 200, y: 140 })
      await harness.dispatchWindowMouseMoveAtClient({
        x: startClient.x + 60,
        y: startClient.y,
      })
      await harness.dispatchWindowMouseUp()

      expect(interaction.pointer.machine.mode()).toBe('idle')
      expectShapeProps(harness, 'shape_resize_zoom_scroll', {
        w: 130,
        h: 80,
      })
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      expectShapeProps(harness, 'shape_resize_zoom_scroll', {
        w: 100,
      })

      harness.designer.redo()
      expectShapeProps(harness, 'shape_resize_zoom_scroll', {
        w: 130,
      })
    } finally {
      harness.dispose()
    }
  })

  it('选中图形后通过旋转手柄 rotate 应更新角度并支持 undo/redo', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_rotate', x: 100, y: 100, w: 100, h: 100 }],
    })

    try {
      const interaction = harness.getInteraction()

      await selectSingleShape(harness, { x: 140, y: 140 }, 'shape_rotate')

      const rotateHandle = getRotateHandle(harness)

      const centerClient = harness.canvasToClient({ x: 150, y: 150 })
      const startClient = harness.canvasToClient({ x: 150, y: 75 })
      const targetClient = rotateVector(startClient, centerClient)

      await harness.dispatchElementMouseDownAtClient(rotateHandle, startClient)

      expect(interaction.pointer.machine.mode()).toBe('rotatingShape')

      await harness.dispatchWindowMouseMoveAtClient(targetClient)
      await harness.dispatchWindowMouseUp()

      expect(interaction.pointer.machine.mode()).toBe('idle')
      expect(getShapeProps(harness, 'shape_rotate').angle).toBeCloseTo(90)
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      expectShapeProps(harness, 'shape_rotate', {
        angle: 0,
      })

      harness.designer.redo()
      expect(getShapeProps(harness, 'shape_rotate').angle).toBeCloseTo(90)
    } finally {
      harness.dispose()
    }
  })

  it('旋转时按住 shift 应按 snapStep 吸附角度', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_rotate_snap', x: 100, y: 100, w: 100, h: 100 }],
    })

    try {
      await selectSingleShape(harness, { x: 140, y: 140 }, 'shape_rotate_snap')

      const rotateHandle = getRotateHandle(harness)

      const targetCanvas = pointByAngle({ x: 150, y: 150 }, -53, 90)
      const startClient = harness.canvasToClient({ x: 150, y: 75 })

      await harness.dispatchElementMouseDownAtClient(rotateHandle, startClient)
      await harness.dispatchWindowMouseMoveAtClient(harness.canvasToClient(targetCanvas), {
        shiftKey: true,
      })
      await harness.dispatchWindowMouseUp()

      expectShapeProps(harness, 'shape_rotate_snap', {
        angle: 30,
      })
    } finally {
      harness.dispose()
    }
  })

  it('缩放并滚动后 rotate 应按画布坐标计算角度，并保持单个 undo 单元', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_rotate_zoom_scroll', x: 100, y: 100, w: 100, h: 100 }],
    })

    try {
      const interaction = harness.getInteraction()
      harness.designer.view.setZoom(2)
      await harness.setScroll(64, 28)

      await selectSingleShape(harness, { x: 140, y: 140 }, 'shape_rotate_zoom_scroll')

      const rotateHandle = getRotateHandle(harness)

      const centerClient = harness.canvasToClient({ x: 150, y: 150 })
      const startClient = harness.canvasToClient({ x: 150, y: 75 })
      const targetClient = rotateVector(startClient, centerClient)

      await harness.dispatchElementMouseDownAtClient(rotateHandle, startClient)

      expect(interaction.pointer.machine.mode()).toBe('rotatingShape')

      await harness.dispatchWindowMouseMoveAtClient(targetClient)
      await harness.dispatchWindowMouseUp()

      expect(interaction.pointer.machine.mode()).toBe('idle')
      expect(getShapeProps(harness, 'shape_rotate_zoom_scroll').angle).toBeCloseTo(90)
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      expectShapeProps(harness, 'shape_rotate_zoom_scroll', {
        angle: 0,
      })

      harness.designer.redo()
      expect(getShapeProps(harness, 'shape_rotate_zoom_scroll').angle).toBeCloseTo(90)
    } finally {
      harness.dispose()
    }
  })

  it('create-linker 非连续模式下从空白起链后应回到 idle 并提交新连线', async () => {
    const harness = await createRendererTestHarness()

    try {
      const interaction = harness.getInteraction()
      harness.designer.tool.setCreateLinker('linker', { continuous: false })

      expect(harness.designer.tool.toolState()).toEqual({
        type: 'create-linker',
        linkerId: 'linker',
        continuous: false,
      })

      await harness.dispatchSceneMouseDownAtCanvas({ x: 220, y: 180 })

      expect(interaction.pointer.machine.mode()).toBe('draggingLinker')
      expect(harness.designer.tool.toolState().type).toBe('idle')

      await harness.dispatchWindowMouseMoveAtCanvas({ x: 320, y: 240 })
      await harness.dispatchWindowMouseUp()

      const linkers = harness.designer.element.linkers()
      const createdLinker = linkers[0]

      expect(interaction.pointer.machine.mode()).toBe('idle')
      expect(linkers).toHaveLength(1)
      expect(createdLinker.from.id).toBeNull()
      expect(createdLinker.from.binding.type).toBe('free')
      expect(createdLinker.to.binding.type).toBe('free')
      expect(harness.designer.selection.selectedIds()).toEqual([createdLinker.id])
    } finally {
      harness.dispose()
    }
  })

  it('create-linker 连续模式下从图形起链应保持工具态并以图形端点作为 from', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_linker_source', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_linker_target', x: 340, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      const interaction = harness.getInteraction()
      harness.designer.tool.setCreateLinker('linker', { continuous: true })

      expect(harness.designer.tool.toolState()).toEqual({
        type: 'create-linker',
        linkerId: 'linker',
        continuous: true,
      })

      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })

      expect(interaction.pointer.machine.mode()).toBe('draggingLinker')
      expect(harness.designer.tool.toolState()).toEqual({
        type: 'create-linker',
        linkerId: 'linker',
        continuous: true,
      })

      await harness.dispatchWindowMouseMoveAtCanvas({ x: 380, y: 140 })
      await harness.dispatchWindowMouseUp()

      const linkers = harness.designer.element.linkers()
      const createdLinker = linkers[0]

      expect(interaction.pointer.machine.mode()).toBe('idle')
      expect(linkers).toHaveLength(1)
      expect(createdLinker.from.id).toBe('shape_linker_source')
      expect(createdLinker.from.binding.type).not.toBe('free')
      expect(harness.designer.tool.toolState()).toEqual({
        type: 'create-linker',
        linkerId: 'linker',
        continuous: true,
      })
    } finally {
      harness.dispose()
    }
  })

  it('缩放并滚动后 quick-create 发起连线应保持连续，并形成单个 undo 单元', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_quick_create_source', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_quick_create_target', x: 340, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      const interaction = harness.getInteraction()
      harness.designer.view.setZoom(1.5)
      await harness.setScroll(72, 24)

      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })
      await harness.dispatchWindowMouseUp()

      const panel = harness.overlayLayer.querySelector('[data-linker-create-panel="true"]')
      expect(panel).toBeTruthy()

      const button = panel?.querySelector('button') as HTMLElement | null
      expect(button).toBeTruthy()

      await harness.dispatchElementMouseDown(button!)

      expect(interaction.pointer.machine.mode()).toBe('draggingLinker')

      const buttonRect = button!.getBoundingClientRect()
      const buttonCenter = {
        x: buttonRect.left + buttonRect.width / 2,
        y: buttonRect.top + buttonRect.height / 2,
      }
      const draftLinker = harness.designer.element.linkers()[0]
      const zoom = harness.designer.view.transform().zoom

      await harness.dispatchWindowMouseMoveAtClient({
        x: buttonCenter.x + (340 - draftLinker.to.x) * zoom,
        y: buttonCenter.y + (140 - draftLinker.to.y) * zoom,
      })
      await harness.dispatchWindowMouseUp()

      const linkers = harness.designer.element.linkers()
      const createdLinker = linkers[0]

      expect(interaction.pointer.machine.mode()).toBe('idle')
      expect(linkers).toHaveLength(1)
      expect(createdLinker.from.id).toBe('shape_quick_create_source')
      expect(createdLinker.to.id).toBe('shape_quick_create_target')
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      expect(harness.designer.element.linkers()).toHaveLength(0)

      harness.designer.redo()
      const redoneLinker = harness.designer.element.linkers()[0]
      expect(redoneLinker?.from.id).toBe('shape_quick_create_source')
      expect(redoneLinker?.to.id).toBe('shape_quick_create_target')
    } finally {
      harness.dispose()
    }
  })

  it('缩放并滚动后拖拽连线端点应保持吸附结果，并形成单个 undo 单元', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_linker_edit_source', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_linker_edit_target', x: 340, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      harness.designer.edit.add([
        createLinker({
          id: 'linker_edit_zoom_scroll',
          name: 'linker_edit_zoom_scroll',
          from: {
            id: 'shape_linker_edit_source',
            x: 200,
            y: 140,
            binding: { type: 'free' },
          },
          to: {
            id: null,
            x: 260,
            y: 140,
            binding: { type: 'free' },
          },
        }),
      ], {
        record: false,
        select: false,
      })
      harness.designer.selection.replace(['linker_edit_zoom_scroll'])
      await Promise.resolve()

      harness.designer.view.setZoom(2)
      await harness.setScroll(56, 18)

      const endpoint = harness.overlayLayer.querySelector('.dg-linker-overlay__to-endpoint') as HTMLElement | null
      expect(endpoint).toBeTruthy()

      const startClient = harness.canvasToClient({ x: 260, y: 140 })
      await harness.dispatchElementMouseDownAtClient(endpoint!, startClient)
      await harness.dispatchWindowMouseMoveAtCanvas({ x: 340, y: 140 })
      await harness.dispatchWindowMouseUp()

      expectLinkerEndpoint(harness, 'linker_edit_zoom_scroll', 'to', {
        id: 'shape_linker_edit_target',
      })
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      expectLinkerEndpoint(harness, 'linker_edit_zoom_scroll', 'to', {
        id: null,
        x: 260,
      })

      harness.designer.redo()
      expectLinkerEndpoint(harness, 'linker_edit_zoom_scroll', 'to', {
        id: 'shape_linker_edit_target',
      })
    } finally {
      harness.dispose()
    }
  })

  it('连续执行 drag / resize / rotate 后，undo/redo 应按动作粒度逐步回退', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_history_sequence', x: 100, y: 100, w: 100, h: 100 }],
    })

    try {
      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })
      await harness.dispatchWindowMouseMoveAtCanvas({ x: 180, y: 160 })
      await harness.dispatchWindowMouseUp()

      await harness.dispatchSceneMouseDownAtCanvas({ x: 180, y: 160 })
      await harness.dispatchWindowMouseUp()

      await harness.dispatchSceneMouseDownAtCanvas({ x: 240, y: 170 })
      await harness.dispatchWindowMouseMoveAtCanvas({ x: 270, y: 170 })
      await harness.dispatchWindowMouseUp()

      const rotateHandle = getRotateHandle(harness)

      const centerClient = harness.canvasToClient({ x: 205, y: 170 })
      const startClient = harness.canvasToClient({ x: 205, y: 95 })
      const targetClient = rotateVector(startClient, centerClient)

      await harness.dispatchElementMouseDownAtClient(rotateHandle, startClient)
      await harness.dispatchWindowMouseMoveAtClient(targetClient)
      await harness.dispatchWindowMouseUp()

      expectShapeProps(harness, 'shape_history_sequence', {
        x: 140,
        y: 120,
        w: 130,
      })
      expect(getShapeProps(harness, 'shape_history_sequence').angle).toBeCloseTo(90)
      expect(harness.designer.history.undoStack()).toHaveLength(3)

      harness.designer.undo()
      expectShapeProps(harness, 'shape_history_sequence', {
        angle: 0,
        w: 130,
      })

      harness.designer.undo()
      expectShapeProps(harness, 'shape_history_sequence', {
        w: 100,
        x: 140,
      })

      harness.designer.undo()
      expectShapeProps(harness, 'shape_history_sequence', {
        x: 100,
        y: 100,
      })

      harness.designer.redo()
      harness.designer.redo()
      harness.designer.redo()
      expectShapeProps(harness, 'shape_history_sequence', {
        x: 140,
        y: 120,
        w: 130,
      })
      expect(getShapeProps(harness, 'shape_history_sequence').angle).toBeCloseTo(90)
    } finally {
      harness.dispose()
    }
  })

  it('连线拖拽时应按 shape 语义渲染目标高亮', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_source', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_target', x: 320, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      const interaction = harness.getInteraction()
      const startClient = harness.canvasToClient({ x: 150, y: 140 })
      const started = interaction.pointer.machine.beginLinkerCreate(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: startClient.x,
          clientY: startClient.y,
          buttons: 1,
        }),
        {
          linkerId: 'linker',
          from: {
            type: 'shape',
            shapeId: 'shape_source',
          },
        },
      )

      expect(started).toBe(true)
      expect(interaction.pointer.machine.mode()).toBe('draggingLinker')

      await harness.dispatchWindowMouseMoveAtClient({
        x: startClient.x + 120,
        y: startClient.y,
      })

      const highlights = harness.overlayLayer.querySelectorAll('[data-shape-highlight-kind="link-target"]')
      expect(highlights).toHaveLength(2)

      const activeTarget = harness.overlayLayer.querySelector(
        '[data-shape-highlight-kind="link-target"][data-shape-highlight-id="shape_target"][data-shape-highlight-state="active"]',
      )
      expect(activeTarget).toBeTruthy()

      await harness.dispatchWindowMouseUp()
      expect(interaction.pointer.machine.mode()).toBe('idle')
    } finally {
      harness.dispose()
    }
  })

  it('单选可连线图形时应显示 quick-create 面板和源高亮', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_source_panel', x: 100, y: 100, w: 100, h: 80 }],
    })

    try {
      await selectSingleShape(harness, { x: 140, y: 140 }, 'shape_source_panel')

      const panel = harness.overlayLayer.querySelector('[data-linker-create-panel="true"]')
      expect(panel).toBeTruthy()

      const buttons = panel?.querySelectorAll('button')
      expect(buttons).toHaveLength(3)

      const sourceHighlight = harness.overlayLayer.querySelector(
        '[data-shape-highlight-kind="link-source"][data-shape-highlight-id="shape_source_panel"][data-shape-highlight-state="armed"]',
      )
      expect(sourceHighlight).toBeTruthy()
    } finally {
      harness.dispose()
    }
  })

  it('键盘 clipboard 快捷键应调用对应的 clipboard 行为', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_clipboard', x: 100, y: 100, w: 100, h: 80 }],
    })

    const copySpy = vi.spyOn(harness.designer.clipboard, 'copy').mockImplementation(() => undefined)
    const pasteSpy = vi.spyOn(harness.designer.clipboard, 'paste').mockImplementation(() => [])
    const cutSpy = vi.spyOn(harness.designer.clipboard, 'cut').mockImplementation(() => undefined)
    const duplicateSpy = vi.spyOn(harness.designer.clipboard, 'duplicate').mockImplementation(() => [])

    try {
      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })
      await harness.dispatchWindowMouseUp()
      expect(harness.designer.selection.selectedIds()).toEqual(['shape_clipboard'])

      const copyEvent = await dispatchModShortcut('c')
      const pasteEvent = await dispatchModShortcut('v')
      const cutEvent = await dispatchModShortcut('x')
      const duplicateEvent = await dispatchModShortcut('d')

      expect(copyEvent.defaultPrevented).toBe(true)
      expect(pasteEvent.defaultPrevented).toBe(true)
      expect(cutEvent.defaultPrevented).toBe(true)
      expect(duplicateEvent.defaultPrevented).toBe(true)

      expect(copySpy).toHaveBeenCalledTimes(1)
      expect(copySpy).toHaveBeenCalledWith(['shape_clipboard'])

      expect(pasteSpy).toHaveBeenCalledTimes(1)
      expect(pasteSpy).toHaveBeenCalledWith()

      expect(cutSpy).toHaveBeenCalledTimes(1)
      expect(cutSpy).toHaveBeenCalledWith(['shape_clipboard'])

      expect(duplicateSpy).toHaveBeenCalledTimes(1)
      expect(duplicateSpy).toHaveBeenCalledWith(['shape_clipboard'])
    } finally {
      copySpy.mockRestore()
      pasteSpy.mockRestore()
      cutSpy.mockRestore()
      duplicateSpy.mockRestore()
      harness.dispose()
    }
  })

  it('escape 应取消当前交互并退出工具态', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_escape', x: 100, y: 100, w: 100, h: 80 }],
    })

    try {
      await harness.dispatchSceneMouseDownAtCanvas({ x: 80, y: 80 })
      expect(harness.getInteraction().pointer.machine.mode()).toBe('boxSelecting')

      let event = await dispatchKeyDown({
        key: 'Escape',
        code: 'Escape',
      })

      expect(event.defaultPrevented).toBe(true)
      expect(harness.getInteraction().pointer.machine.mode()).toBe('idle')

      harness.designer.tool.setCreateShape('rectangle', { continuous: true })
      expect(harness.designer.tool.toolState()).toEqual({
        type: 'create-shape',
        shapeId: 'rectangle',
        continuous: true,
      })

      event = await dispatchKeyDown({
        key: 'Escape',
        code: 'Escape',
      })

      expect(event.defaultPrevented).toBe(true)
      expect(harness.designer.tool.toolState()).toEqual({ type: 'idle' })
    } finally {
      harness.dispose()
    }
  })

  it('delete 应删除当前选中的图形', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_delete_a', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_delete_b', x: 300, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })
      await harness.dispatchWindowMouseUp()
      expect(harness.designer.selection.selectedIds()).toEqual(['shape_delete_a'])

      const event = await dispatchKeyDown({
        key: 'Delete',
        code: 'Delete',
      })

      expect(event.defaultPrevented).toBe(true)
      expect(harness.designer.getElementById('shape_delete_a')).toBeUndefined()
      expect(harness.designer.getElementById('shape_delete_b')).toBeTruthy()
      expect(harness.designer.selection.selectedIds()).toEqual([])
    } finally {
      harness.dispose()
    }
  })

  it('mod+a 应选中所有图形', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_select_all_a', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_select_all_b', x: 280, y: 160, w: 100, h: 80 },
        { id: 'shape_select_all_c', x: 500, y: 260, w: 100, h: 80 },
      ],
    })

    try {
      expect(harness.designer.selection.selectedIds()).toEqual([])

      const event = await dispatchModShortcut('a')

      expect(event.defaultPrevented).toBe(true)
      expect(harness.designer.selection.selectedIds()).toEqual([
        'shape_select_all_a',
        'shape_select_all_b',
        'shape_select_all_c',
      ])
    } finally {
      harness.dispose()
    }
  })

  it('右键时应根据命中目标输出 context menu 上下文', async () => {
    const requests: Array<{
      targetType: string
      targetId: string | null
      selectionIds: string[]
    }> = []
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_context_a', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_context_b', x: 320, y: 100, w: 100, h: 80 },
      ],
      rendererProps: {
        onContextMenu: request => {
          requests.push({
            targetType: request.targetType,
            targetId: request.targetId,
            selectionIds: request.selectionIds,
          })
        },
      },
    })

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_context',
            name: 'linker_context',
            linkerType: 'straight',
            from: {
              id: 'shape_context_a',
              x: 200,
              y: 140,
              binding: { type: 'free' },
            },
            to: {
              id: 'shape_context_b',
              x: 320,
              y: 140,
              binding: { type: 'free' },
            },
          }),
        ],
        {
          record: false,
          select: false,
        },
      )

      await harness.dispatchSceneContextMenuAtCanvas({ x: 140, y: 140 })
      expect(requests[0]).toEqual({
        targetType: 'shape',
        targetId: 'shape_context_a',
        selectionIds: ['shape_context_a'],
      })

      harness.designer.selection.replace(['shape_context_a', 'shape_context_b'])
      await Promise.resolve()

      await harness.dispatchSceneContextMenuAtCanvas({ x: 140, y: 140 })
      expect(requests[1]).toEqual({
        targetType: 'selection',
        targetId: 'shape_context_a',
        selectionIds: ['shape_context_a', 'shape_context_b'],
      })

      await harness.dispatchSceneContextMenuAtCanvas({ x: 260, y: 140 })
      expect(requests[2]).toEqual({
        targetType: 'linker',
        targetId: 'linker_context',
        selectionIds: ['linker_context'],
      })

      await harness.dispatchSceneContextMenuAtCanvas({ x: 20, y: 20 })
      expect(requests[3]).toEqual({
        targetType: 'canvas',
        targetId: null,
        selectionIds: ['linker_context'],
      })
    } finally {
      harness.dispose()
    }
  })
})
