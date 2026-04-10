import { describe, expect, it, vi } from 'vitest'
import { createLinker, createShape } from '@diagen/core'
import { rotatePoint } from '@diagen/shared'
import { createRendererTestHarness } from '../.test/createRendererTestHarness'
import { getPerimeterInfo, getAnchorInfo } from '@diagen/core/anchors'
import { getLinkerTextBox } from '@diagen/core/text'

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

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

function parsePx(value: string): number {
  return Number.parseFloat(value.replace('px', ''))
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
      harness.designer.edit.add(
        [
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
        ],
        {
          record: false,
          select: false,
        },
      )
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

  it('拖拽 fixed 端点到空白区域后应解除绑定，并支持 undo/redo', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_linker_fixed_source', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_linker_fixed_target', x: 340, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      const sourceShape = harness.designer.getElementById('shape_linker_fixed_source')
      expect(sourceShape?.type).toBe('shape')
      if (!sourceShape || sourceShape.type !== 'shape') {
        throw new Error('shape_linker_fixed_source 未找到')
      }

      const sourceAnchor = getAnchorInfo(sourceShape, 1)
      expect(sourceAnchor).toBeTruthy()
      if (!sourceAnchor) {
        throw new Error('shape_linker_fixed_source 锚点未找到')
      }

      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_fixed_to_free',
            name: 'linker_fixed_to_free',
            from: {
              id: sourceShape.id,
              x: sourceAnchor.point.x,
              y: sourceAnchor.point.y,
              angle: sourceAnchor.angle,
              binding: {
                type: 'fixed',
                anchorId: sourceAnchor.id,
              },
            },
            to: {
              id: null,
              x: 260,
              y: 200,
              binding: { type: 'free' },
            },
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      harness.designer.selection.replace(['linker_fixed_to_free'])
      await Promise.resolve()

      const endpoint = harness.overlayLayer.querySelector('.dg-linker-overlay__from-endpoint') as HTMLElement | null
      expect(endpoint).toBeTruthy()

      await harness.dispatchElementMouseDownAtClient(endpoint!, harness.canvasToClient(sourceAnchor.point))
      await harness.dispatchWindowMouseMoveAtCanvas({ x: 40, y: 40 })
      await harness.dispatchWindowMouseUp()

      const moved = harness.designer.getElementById('linker_fixed_to_free')
      expect(moved?.type).toBe('linker')
      if (!moved || moved.type !== 'linker') {
        throw new Error('linker_fixed_to_free 未找到')
      }

      expect(moved.from.id).toBeNull()
      expect(moved.from.binding).toEqual({ type: 'free' })
      expect(moved.from.x).toBe(40)
      expect(moved.from.y).toBe(40)
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      const undone = harness.designer.getElementById('linker_fixed_to_free')
      expect(undone?.type).toBe('linker')
      if (!undone || undone.type !== 'linker') {
        throw new Error('linker_fixed_to_free undo 后未找到')
      }

      expect(undone.from.id).toBe(sourceShape.id)
      expect(undone.from.binding).toEqual({
        type: 'fixed',
        anchorId: sourceAnchor.id,
      })
      expect(undone.from.x).toBe(sourceAnchor.point.x)
      expect(undone.from.y).toBe(sourceAnchor.point.y)

      harness.designer.redo()
      const redone = harness.designer.getElementById('linker_fixed_to_free')
      expect(redone?.type).toBe('linker')
      if (!redone || redone.type !== 'linker') {
        throw new Error('linker_fixed_to_free redo 后未找到')
      }

      expect(redone.from.id).toBeNull()
      expect(redone.from.binding).toEqual({ type: 'free' })
      expect(redone.from.x).toBe(40)
      expect(redone.from.y).toBe(40)
    } finally {
      harness.dispose()
    }
  })

  it('拖拽 perimeter 端点重连后，undo/redo 应恢复原 perimeter 绑定', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_linker_perimeter_source', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_linker_perimeter_target', x: 340, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      const sourceShape = harness.designer.getElementById('shape_linker_perimeter_source')
      const targetShape = harness.designer.getElementById('shape_linker_perimeter_target')
      expect(sourceShape?.type).toBe('shape')
      expect(targetShape?.type).toBe('shape')
      if (!sourceShape || sourceShape.type !== 'shape' || !targetShape || targetShape.type !== 'shape') {
        throw new Error('perimeter 测试图形未找到')
      }

      const sourcePerimeter = getPerimeterInfo(sourceShape, { x: 120, y: 100 })
      const targetAnchor = getAnchorInfo(targetShape, 3)
      expect(sourcePerimeter).toBeTruthy()
      expect(targetAnchor).toBeTruthy()
      if (!sourcePerimeter || !targetAnchor) {
        throw new Error('perimeter 或 target 锚点未找到')
      }

      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_perimeter_reconnect',
            name: 'linker_perimeter_reconnect',
            from: {
              id: sourceShape.id,
              x: sourcePerimeter.point.x,
              y: sourcePerimeter.point.y,
              angle: sourcePerimeter.angle,
              binding: {
                type: 'perimeter',
                pathIndex: sourcePerimeter.pathIndex,
                segmentIndex: sourcePerimeter.segmentIndex,
                t: sourcePerimeter.t,
              },
            },
            to: {
              id: null,
              x: 240,
              y: 240,
              binding: { type: 'free' },
            },
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      harness.designer.selection.replace(['linker_perimeter_reconnect'])
      await Promise.resolve()

      const endpoint = harness.overlayLayer.querySelector('.dg-linker-overlay__from-endpoint') as HTMLElement | null
      expect(endpoint).toBeTruthy()

      await harness.dispatchElementMouseDownAtClient(endpoint!, harness.canvasToClient(sourcePerimeter.point))
      await harness.dispatchWindowMouseMoveAtCanvas(targetAnchor.point)
      await harness.dispatchWindowMouseUp()

      const moved = harness.designer.getElementById('linker_perimeter_reconnect')
      expect(moved?.type).toBe('linker')
      if (!moved || moved.type !== 'linker') {
        throw new Error('linker_perimeter_reconnect 未找到')
      }

      expect(moved.from.id).toBe(targetShape.id)
      expect(moved.from.binding).toEqual({
        type: 'fixed',
        anchorId: targetAnchor.id,
      })
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      const undone = harness.designer.getElementById('linker_perimeter_reconnect')
      expect(undone?.type).toBe('linker')
      if (!undone || undone.type !== 'linker') {
        throw new Error('linker_perimeter_reconnect undo 后未找到')
      }

      expect(undone.from.id).toBe(sourceShape.id)
      expect(undone.from.binding).toEqual({
        type: 'perimeter',
        pathIndex: sourcePerimeter.pathIndex,
        segmentIndex: sourcePerimeter.segmentIndex,
        t: sourcePerimeter.t,
      })

      harness.designer.redo()
      const redone = harness.designer.getElementById('linker_perimeter_reconnect')
      expect(redone?.type).toBe('linker')
      if (!redone || redone.type !== 'linker') {
        throw new Error('linker_perimeter_reconnect redo 后未找到')
      }

      expect(redone.from.id).toBe(targetShape.id)
      expect(redone.from.binding).toEqual({
        type: 'fixed',
        anchorId: targetAnchor.id,
      })
    } finally {
      harness.dispose()
    }
  })

  it('双击删除 broken 控制点后应走点规范化，并支持 undo/redo', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_remove_control_source', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_remove_control_target', x: 320, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_remove_control',
            name: 'linker_remove_control',
            linkerType: 'broken',
            from: {
              id: 'shape_remove_control_source',
              x: 200,
              y: 140,
              binding: { type: 'free' },
            },
            to: {
              id: 'shape_remove_control_target',
              x: 320,
              y: 140,
              binding: { type: 'free' },
            },
            points: [
              { x: 240, y: 140 },
              { x: 280, y: 140 },
            ],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      harness.designer.selection.replace(['linker_remove_control'])
      await flushMicrotasks()

      const controlHandle = harness.overlayLayer.querySelector(
        '.dg-linker-overlay__control-point[data-linker-control-index="0"]',
      ) as HTMLElement | null
      expect(controlHandle).toBeTruthy()

      controlHandle!.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
        }),
      )
      await flushMicrotasks()

      expect(getLinkerOrThrow(harness, 'linker_remove_control').points).toEqual([])
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      await flushMicrotasks()
      expect(getLinkerOrThrow(harness, 'linker_remove_control').points).toEqual([
        { x: 240, y: 140 },
        { x: 280, y: 140 },
      ])

      harness.designer.redo()
      await flushMicrotasks()
      expect(getLinkerOrThrow(harness, 'linker_remove_control').points).toEqual([])
    } finally {
      harness.dispose()
    }
  })

  it('拖拽 orthogonal 控制点后应保持横纵段，并支持 undo/redo', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_orthogonal_control_source', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_orthogonal_control_target', x: 420, y: 260, w: 100, h: 80 },
      ],
    })

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_orthogonal_control_drag',
            name: 'linker_orthogonal_control_drag',
            linkerType: 'orthogonal',
            from: {
              id: null,
              x: 200,
              y: 140,
              binding: { type: 'free' },
            },
            to: {
              id: null,
              x: 420,
              y: 300,
              binding: { type: 'free' },
            },
            points: [
              { x: 200, y: 220 },
              { x: 320, y: 220 },
              { x: 320, y: 300 },
            ],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      harness.designer.selection.replace(['linker_orthogonal_control_drag'])
      await flushMicrotasks()

      const controlHandle = harness.overlayLayer.querySelector(
        '.dg-linker-overlay__control-point[data-linker-control-index="1"]',
      ) as HTMLElement | null
      expect(controlHandle).toBeTruthy()

      await harness.dispatchElementMouseDownAtClient(controlHandle!, harness.canvasToClient({ x: 320, y: 220 }))
      await harness.dispatchWindowMouseMoveAtCanvas({ x: 360, y: 250 })
      await harness.dispatchWindowMouseUp()

      expect(getLinkerOrThrow(harness, 'linker_orthogonal_control_drag').points).toEqual([
        { x: 200, y: 250 },
        { x: 360, y: 250 },
        { x: 360, y: 300 },
      ])
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      expect(getLinkerOrThrow(harness, 'linker_orthogonal_control_drag').points).toEqual([
        { x: 200, y: 220 },
        { x: 320, y: 220 },
        { x: 320, y: 300 },
      ])

      harness.designer.redo()
      expect(getLinkerOrThrow(harness, 'linker_orthogonal_control_drag').points).toEqual([
        { x: 200, y: 250 },
        { x: 360, y: 250 },
        { x: 360, y: 300 },
      ])
    } finally {
      harness.dispose()
    }
  })

  it('拖拽 orthogonal 中间线段后应平移整段，并支持 undo/redo', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_orthogonal_segment_drag',
            name: 'linker_orthogonal_segment_drag',
            linkerType: 'orthogonal',
            from: {
              id: null,
              x: 100,
              y: 100,
              binding: { type: 'free' },
            },
            to: {
              id: null,
              x: 300,
              y: 300,
              binding: { type: 'free' },
            },
            points: [
              { x: 100, y: 200 },
              { x: 300, y: 200 },
            ],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      harness.designer.selection.replace(['linker_orthogonal_segment_drag'])
      await flushMicrotasks()

      await harness.dispatchSceneMouseDownAtCanvas({ x: 200, y: 200 })
      await harness.dispatchWindowMouseMoveAtCanvas({ x: 200, y: 240 })
      await harness.dispatchWindowMouseUp()

      expect(getLinkerOrThrow(harness, 'linker_orthogonal_segment_drag').points).toEqual([
        { x: 100, y: 240 },
        { x: 300, y: 240 },
      ])
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      expect(getLinkerOrThrow(harness, 'linker_orthogonal_segment_drag').points).toEqual([
        { x: 100, y: 200 },
        { x: 300, y: 200 },
      ])

      harness.designer.redo()
      expect(getLinkerOrThrow(harness, 'linker_orthogonal_segment_drag').points).toEqual([
        { x: 100, y: 240 },
        { x: 300, y: 240 },
      ])
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

  it('双击 shape 文本后，Enter 应提交文本并支持 undo/redo', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createShape({
            id: 'shape_text',
            name: 'shape_text',
            props: { x: 100, y: 100, w: 100, h: 80, angle: 0 },
            textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '开始' }],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 140, y: 140 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()
      expect(editor?.value).toBe('开始')

      editor!.value = '已提交'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true }))
      await flushMicrotasks()

      editor!.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
        }),
      )
      await flushMicrotasks()

      const shape = harness.designer.getElementById('shape_text')
      expect(shape?.type).toBe('shape')
      expect(shape && shape.type === 'shape' ? shape.textBlock[0]?.text : null).toBe('已提交')
      expect(harness.designer.canUndo()).toBe(true)

      harness.designer.undo()
      const undone = harness.designer.getElementById('shape_text')
      expect(undone && undone.type === 'shape' ? undone.textBlock[0]?.text : null).toBe('开始')

      harness.designer.redo()
      const redone = harness.designer.getElementById('shape_text')
      expect(redone && redone.type === 'shape' ? redone.textBlock[0]?.text : null).toBe('已提交')
    } finally {
      harness.dispose()
    }
  })

  it('双击 shape 的非文本区域时不应进入编辑态', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createShape({
            id: 'shape_non_text_hit',
            name: 'shape_non_text_hit',
            props: { x: 100, y: 100, w: 160, h: 100, angle: 0 },
            textBlock: [{ position: { x: 50, y: 30, w: 40, h: 20 }, text: '文本' }],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 120, y: 120 })
      await flushMicrotasks()

      expect(harness.overlayLayer.querySelector('textarea[data-text-editor="true"]')).toBeNull()
      expect(harness.designer.selection.selectedIds()).toEqual([])
    } finally {
      harness.dispose()
    }
  })

  it('双击 shape 文本后，Escape 应取消编辑且不写入 history', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createShape({
            id: 'shape_escape_text',
            name: 'shape_escape_text',
            props: { x: 100, y: 100, w: 100, h: 80, angle: 0 },
            textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '原文本' }],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 140, y: 140 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      editor!.value = '已取消'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true }))
      await flushMicrotasks()

      editor!.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Escape',
        }),
      )
      await flushMicrotasks()

      const shape = harness.designer.getElementById('shape_escape_text')
      expect(shape && shape.type === 'shape' ? shape.textBlock[0]?.text : null).toBe('原文本')
      expect(harness.designer.canUndo()).toBe(false)
      expect(harness.overlayLayer.querySelector('textarea[data-text-editor="true"]')).toBeNull()
    } finally {
      harness.dispose()
    }
  })

  it('组合输入期间按 Enter 不应提交，组合结束后才可提交', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createShape({
            id: 'shape_composition_text',
            name: 'shape_composition_text',
            props: { x: 100, y: 100, w: 100, h: 80, angle: 0 },
            textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '原文本' }],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 140, y: 140 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      editor!.value = '组合中'
      editor!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      await flushMicrotasks()

      editor!.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
        }),
      )
      await flushMicrotasks()

      const duringComposition = harness.designer.getElementById('shape_composition_text')
      expect(
        duringComposition && duringComposition.type === 'shape' ? duringComposition.textBlock[0]?.text : null,
      ).toBe('原文本')
      expect(harness.overlayLayer.querySelector('textarea[data-text-editor="true"]')).toBeTruthy()

      editor!.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
      await flushMicrotasks()

      editor!.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
        }),
      )
      await flushMicrotasks()

      const committed = harness.designer.getElementById('shape_composition_text')
      expect(committed && committed.type === 'shape' ? committed.textBlock[0]?.text : null).toBe('组合中')
      expect(harness.overlayLayer.querySelector('textarea[data-text-editor="true"]')).toBeNull()
    } finally {
      harness.dispose()
    }
  })

  it('文本较长时编辑框高度应增长，并在达到上限后启用滚动', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createShape({
            id: 'shape_auto_height',
            name: 'shape_auto_height',
            props: { x: 100, y: 100, w: 120, h: 80, angle: 0 },
            textBlock: [{ position: { x: 10, y: 20, w: 60, h: 20 }, text: '短文本' }],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 140, y: 130 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      Object.defineProperty(editor!, 'scrollHeight', {
        configurable: true,
        get: () => 320,
      })

      editor!.value = '第一行\n第二行\n第三行\n第四行\n第五行\n第六行'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true }))
      await flushMicrotasks()
      await flushMicrotasks()

      expect(parsePx(editor!.style.height)).toBeCloseTo(240)
      expect(editor!.style.overflowY).toBe('auto')
    } finally {
      harness.dispose()
    }
  })

  it('双击旋转 shape 后，编辑框应按旋转文本块定位并继承文字样式', async () => {
    const harness = await createRendererTestHarness()
    const block = {
      x: 0,
      y: 0,
      w: 40,
      h: 40,
    }
    const shape = {
      x: 100,
      y: 100,
      w: 120,
      h: 100,
      angle: 90,
    }

    try {
      const rotatedCenter = rotatePoint({ x: block.x + block.w / 2, y: block.y + block.h / 2 }, shape.angle, {
        x: shape.w / 2,
        y: shape.h / 2,
      })

      harness.designer.edit.add(
        [
          createShape({
            id: 'shape_rotate_text',
            name: 'shape_rotate_text',
            props: shape,
            textBlock: [
              {
                position: block,
                text: '旋转文本',
                fontStyle: {
                  fontFamily: 'Arial, sans-serif',
                  size: 16,
                  lineHeight: 1.5,
                  color: '255,0,0',
                  bold: true,
                  italic: false,
                  underline: false,
                  textAlign: 'right',
                  vAlign: 'bottom',
                  orientation: 'horizontal',
                },
              },
            ],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({
        x: shape.x + rotatedCenter.x,
        y: shape.y + rotatedCenter.y,
      })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      const screenCenter = harness.designer.view.toScreen({
        x: shape.x + rotatedCenter.x,
        y: shape.y + rotatedCenter.y,
      })

      expect(parsePx(editor!.style.left)).toBeCloseTo(screenCenter.x - block.w / 2)
      expect(parsePx(editor!.style.top)).toBeCloseTo(screenCenter.y - block.h / 2)
      expect(parsePx(editor!.style.width)).toBeCloseTo(block.w)
      expect(parsePx(editor!.style.height)).toBeCloseTo(block.h)
      expect(editor!.style.transform).toBe('rotate(90deg)')
      expect(editor!.style.textAlign).toBe('right')
      expect(editor!.style.lineHeight).toBe('1.5')
      expect(editor!.style.fontSize).toBe('16px')
      expect(parsePx(editor!.style.paddingTop)).toBeGreaterThan(4)
    } finally {
      harness.dispose()
    }
  })

  it('双击 linker 文本后，blur 应提交文本', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createShape({
            id: 'shape_linker_source',
            name: 'shape_linker_source',
            props: { x: 100, y: 100, w: 100, h: 80, angle: 0 },
          }),
          createLinker({
            id: 'linker_text',
            name: 'linker_text',
            linkerType: 'straight',
            text: '原连线',
            from: {
              id: 'shape_linker_source',
              x: 200,
              y: 140,
              binding: { type: 'free' },
            },
            to: {
              id: null,
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
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 260, y: 140 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()
      expect(editor?.value).toBe('原连线')

      editor!.value = '已更新连线'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true }))
      await flushMicrotasks()

      editor!.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
      await flushMicrotasks()

      const linker = harness.designer.getElementById('linker_text')
      expect(linker && linker.type === 'linker' ? linker.text : null).toBe('已更新连线')
      expect(harness.designer.canUndo()).toBe(true)
    } finally {
      harness.dispose()
    }
  })

  it('linker 编辑框宽度增长时应围绕标签中心重排', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_resize_text',
            name: 'linker_resize_text',
            linkerType: 'straight',
            text: '短',
            from: {
              id: null,
              x: 200,
              y: 140,
              binding: { type: 'free' },
            },
            to: {
              id: null,
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
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 260, y: 140 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      Object.defineProperty(editor!, 'scrollWidth', {
        configurable: true,
        get: () => 280,
      })
      Object.defineProperty(editor!, 'scrollHeight', {
        configurable: true,
        get: () => 40,
      })

      editor!.value = '一段更长的连线标签文本'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true }))
      await flushMicrotasks()
      await flushMicrotasks()

      expect(parsePx(editor!.style.width)).toBeCloseTo(280)
      expect(parsePx(editor!.style.left)).toBeCloseTo(120)
      expect(parsePx(editor!.style.top)).toBeCloseTo(120)
    } finally {
      harness.dispose()
    }
  })

  it('带正式偏移的 linker 编辑框增长时应围绕正式标签中心重排，且不改 textPosition', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_resize_text_positioned',
            name: 'linker_resize_text_positioned',
            linkerType: 'straight',
            text: '短',
            textPosition: {
              dx: 40,
              dy: -20,
            },
            from: {
              id: null,
              x: 200,
              y: 140,
              binding: { type: 'free' },
            },
            to: {
              id: null,
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
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 300, y: 120 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      Object.defineProperty(editor!, 'scrollWidth', {
        configurable: true,
        get: () => 280,
      })
      Object.defineProperty(editor!, 'scrollHeight', {
        configurable: true,
        get: () => 40,
      })

      editor!.value = '一段更长的正式偏移标签文本'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true }))
      await flushMicrotasks()
      await flushMicrotasks()

      expect(parsePx(editor!.style.width)).toBeCloseTo(280)
      expect(parsePx(editor!.style.left)).toBeCloseTo(160)
      expect(parsePx(editor!.style.top)).toBeCloseTo(100)

      editor!.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
      await flushMicrotasks()

      expect(getLinkerOrThrow(harness, 'linker_resize_text_positioned').text).toBe('一段更长的正式偏移标签文本')
      expect(getLinkerOrThrow(harness, 'linker_resize_text_positioned').textPosition).toEqual({
        dx: 40,
        dy: -20,
      })
    } finally {
      harness.dispose()
    }
  })

  it('双击 linker 的非文本区域时不应进入编辑态', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_non_text_hit',
            name: 'linker_non_text_hit',
            linkerType: 'straight',
            text: '标签',
            from: {
              id: null,
              x: 100,
              y: 100,
              binding: { type: 'free' },
            },
            to: {
              id: null,
              x: 320,
              y: 100,
              binding: { type: 'free' },
            },
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 110, y: 100 })
      await flushMicrotasks()

      expect(harness.overlayLayer.querySelector('textarea[data-text-editor="true"]')).toBeNull()
      expect(harness.designer.selection.selectedIds()).toEqual([])
    } finally {
      harness.dispose()
    }
  })

  it('带正式偏移的 linker 标签应按偏移后位置命中并定位编辑框', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_text_position',
            name: 'linker_text_position',
            linkerType: 'straight',
            text: '偏移标签',
            textPosition: {
              dx: 40,
              dy: -20,
            },
            from: {
              id: null,
              x: 200,
              y: 140,
              binding: { type: 'free' },
            },
            to: {
              id: null,
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
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 260, y: 140 })
      await flushMicrotasks()

      expect(harness.overlayLayer.querySelector('textarea[data-text-editor="true"]')).toBeNull()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 300, y: 120 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      const linker = harness.designer.getElementById('linker_text_position')
      expect(linker?.type).toBe('linker')
      if (!linker || linker.type !== 'linker') {
        throw new Error('linker_text_position 未找到')
      }

      const box = getLinkerTextBox(harness.designer.view.getLinkerRoute(linker), linker.text, linker.fontStyle, {
        curved: false,
        textPosition: linker.textPosition,
      })
      expect(box).toBeTruthy()

      const bounds = harness.designer.view.toScreen({
        x: box!.x,
        y: box!.y,
        w: box!.w,
        h: box!.h,
      })

      expect(parsePx(editor!.style.left)).toBeCloseTo(bounds.x)
      expect(parsePx(editor!.style.top)).toBeCloseTo(bounds.y)
      expect(parsePx(editor!.style.width)).toBeCloseTo(bounds.w)
      expect(parsePx(editor!.style.height)).toBeCloseTo(bounds.h)
    } finally {
      harness.dispose()
    }
  })

  it('鼠标悬停 linker 标签区域时应显示 move 光标', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_hover_text_cursor',
            name: 'linker_hover_text_cursor',
            linkerType: 'straight',
            text: '悬停标签',
            textPosition: {
              dx: 40,
              dy: -20,
            },
            from: {
              id: null,
              x: 200,
              y: 140,
              binding: { type: 'free' },
            },
            to: {
              id: null,
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
      await Promise.resolve()

      await harness.dispatchSceneMouseMoveAtCanvas({ x: 300, y: 120 })

      expect(harness.container.style.cursor).toBe('move')

      await harness.dispatchSceneMouseMoveAtCanvas({ x: 200, y: 200 })

      expect(harness.container.style.cursor).toBe('default')
    } finally {
      harness.dispose()
    }
  })

  it('拖拽 linker 标签后应写入 textPosition，并支持 undo/redo', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_drag_text_position',
            name: 'linker_drag_text_position',
            linkerType: 'straight',
            text: '可拖拽标签',
            from: {
              id: null,
              x: 200,
              y: 140,
              binding: { type: 'free' },
            },
            to: {
              id: null,
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
      await Promise.resolve()

      await harness.dispatchSceneMouseDownAtCanvas({ x: 260, y: 140 })
      await harness.dispatchWindowMouseUp()
      await flushMicrotasks()

      const interaction = harness.getInteraction()
      await harness.dispatchSceneMouseDownAtCanvas({ x: 260, y: 140 })
      expect(interaction.pointer.machine.mode()).toBe('draggingLinker')

      await harness.dispatchWindowMouseMoveAtCanvas({ x: 300, y: 120 })
      await harness.dispatchWindowMouseUp()

      expect(interaction.pointer.machine.mode()).toBe('idle')
      expect(getLinkerOrThrow(harness, 'linker_drag_text_position').textPosition).toEqual({
        dx: 40,
        dy: -20,
      })
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      expect(getLinkerOrThrow(harness, 'linker_drag_text_position').textPosition).toBeUndefined()

      harness.designer.redo()
      expect(getLinkerOrThrow(harness, 'linker_drag_text_position').textPosition).toEqual({
        dx: 40,
        dy: -20,
      })
    } finally {
      harness.dispose()
    }
  })

  it('编辑带正式偏移的 linker 文本时，route 变化后编辑框应保持相对偏移', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_edit_follow_route',
            name: 'linker_edit_follow_route',
            linkerType: 'broken',
            text: '跟随路线',
            textPosition: {
              dx: 30,
              dy: -10,
            },
            from: {
              id: null,
              x: 100,
              y: 100,
              binding: { type: 'free' },
            },
            to: {
              id: null,
              x: 220,
              y: 220,
              binding: { type: 'free' },
            },
            points: [
              { x: 160, y: 100 },
              { x: 160, y: 220 },
            ],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 190, y: 150 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      harness.designer.edit.update('linker_edit_follow_route', {
        points: [
          { x: 200, y: 100 },
          { x: 200, y: 220 },
        ],
      })
      await flushMicrotasks()
      await flushMicrotasks()

      const linker = getLinkerOrThrow(harness, 'linker_edit_follow_route')
      const box = getLinkerTextBox(harness.designer.view.getLinkerRoute(linker), linker.text, linker.fontStyle, {
        curved: false,
        textPosition: linker.textPosition,
      })
      expect(box).toBeTruthy()

      const bounds = harness.designer.view.toScreen({
        x: box!.x,
        y: box!.y,
        w: box!.w,
        h: box!.h,
      })

      expect(parsePx(editor!.style.left)).toBeCloseTo(bounds.x)
      expect(parsePx(editor!.style.top)).toBeCloseTo(bounds.y)
    } finally {
      harness.dispose()
    }
  })

  it('折线 linker 的编辑框应按共享文本布局定位', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createLinker({
            id: 'linker_broken_text',
            name: 'linker_broken_text',
            linkerType: 'broken',
            text: '折线文本',
            from: {
              id: null,
              x: 100,
              y: 100,
              binding: { type: 'free' },
            },
            to: {
              id: null,
              x: 220,
              y: 220,
              binding: { type: 'free' },
            },
            points: [
              { x: 160, y: 100 },
              { x: 160, y: 220 },
            ],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 160, y: 160 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      const linker = harness.designer.getElementById('linker_broken_text')
      expect(linker?.type).toBe('linker')
      if (!linker || linker.type !== 'linker') {
        throw new Error('linker_broken_text 未找到')
      }

      const box = getLinkerTextBox(harness.designer.view.getLinkerRoute(linker), linker.text, linker.fontStyle, {
        curved: false,
        textPosition: linker.textPosition,
      })
      expect(box).toBeTruthy()

      const bounds = harness.designer.view.toScreen({
        x: box!.x,
        y: box!.y,
        w: box!.w,
        h: box!.h,
      })

      expect(parsePx(editor!.style.left)).toBeCloseTo(bounds.x)
      expect(parsePx(editor!.style.top)).toBeCloseTo(bounds.y)
      expect(parsePx(editor!.style.width)).toBeCloseTo(bounds.w)
      expect(parsePx(editor!.style.height)).toBeCloseTo(bounds.h)
    } finally {
      harness.dispose()
    }
  })

  it('编辑 shape 文本时点击空白应提交并退出编辑态', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createShape({
            id: 'shape_click_commit',
            name: 'shape_click_commit',
            props: { x: 100, y: 100, w: 100, h: 80, angle: 0 },
            textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '初始文本' }],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 140, y: 140 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      editor!.value = '点击提交'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true }))
      await flushMicrotasks()

      await harness.dispatchSceneMouseDownAtCanvas({ x: 20, y: 20 })
      await harness.dispatchWindowMouseUp()
      await flushMicrotasks()

      const shape = harness.designer.getElementById('shape_click_commit')
      expect(shape && shape.type === 'shape' ? shape.textBlock[0]?.text : null).toBe('点击提交')
      expect(harness.overlayLayer.querySelector('textarea[data-text-editor="true"]')).toBeNull()
      expect(harness.designer.selection.selectedIds()).toEqual([])
    } finally {
      harness.dispose()
    }
  })

  it('编辑文本时外部切换 tool 应提交并关闭编辑态', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createShape({
            id: 'shape_tool_commit',
            name: 'shape_tool_commit',
            props: { x: 100, y: 100, w: 100, h: 80, angle: 0 },
            textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '原文本' }],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 140, y: 140 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      editor!.value = '切工具提交'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true }))
      await flushMicrotasks()

      harness.designer.tool.setCreateShape('rectangle', { continuous: true })
      await flushMicrotasks()

      const shape = harness.designer.getElementById('shape_tool_commit')
      expect(shape && shape.type === 'shape' ? shape.textBlock[0]?.text : null).toBe('切工具提交')
      expect(harness.overlayLayer.querySelector('textarea[data-text-editor="true"]')).toBeNull()
      expect(harness.designer.tool.toolState()).toEqual({
        type: 'create-shape',
        shapeId: 'rectangle',
        continuous: true,
      })
    } finally {
      harness.dispose()
    }
  })

  it('编辑文本时外部切换选中目标应提交并关闭编辑态', async () => {
    const harness = await createRendererTestHarness()

    try {
      harness.designer.edit.add(
        [
          createShape({
            id: 'shape_selection_commit',
            name: 'shape_selection_commit',
            props: { x: 100, y: 100, w: 100, h: 80, angle: 0 },
            textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '原文本' }],
          }),
          createShape({
            id: 'shape_selection_target',
            name: 'shape_selection_target',
            props: { x: 280, y: 100, w: 100, h: 80, angle: 0 },
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 140, y: 140 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      editor!.value = '切选中提交'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true }))
      await flushMicrotasks()

      harness.designer.selection.replace(['shape_selection_target'])
      await flushMicrotasks()

      const shape = harness.designer.getElementById('shape_selection_commit')
      expect(shape && shape.type === 'shape' ? shape.textBlock[0]?.text : null).toBe('切选中提交')
      expect(harness.overlayLayer.querySelector('textarea[data-text-editor="true"]')).toBeNull()
      expect(harness.designer.selection.selectedIds()).toEqual(['shape_selection_target'])
    } finally {
      harness.dispose()
    }
  })

  it('编辑文本时右键画布应先提交，再继续输出 context menu', async () => {
    const requests: Array<{
      targetType: string
      targetId: string | null
      selectionIds: string[]
    }> = []
    const harness = await createRendererTestHarness({
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
          createShape({
            id: 'shape_context_commit',
            name: 'shape_context_commit',
            props: { x: 100, y: 100, w: 100, h: 80, angle: 0 },
            textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '原文本' }],
          }),
        ],
        {
          record: false,
          select: false,
        },
      )
      await Promise.resolve()

      await harness.dispatchSceneDoubleClickAtCanvas({ x: 140, y: 140 })

      const editor = harness.overlayLayer.querySelector(
        'textarea[data-text-editor="true"]',
      ) as HTMLTextAreaElement | null
      expect(editor).toBeTruthy()

      editor!.value = '右键提交'
      editor!.dispatchEvent(new InputEvent('input', { bubbles: true }))
      await flushMicrotasks()

      await harness.dispatchSceneContextMenuAtCanvas({ x: 20, y: 20 })
      await flushMicrotasks()

      const shape = harness.designer.getElementById('shape_context_commit')
      expect(shape && shape.type === 'shape' ? shape.textBlock[0]?.text : null).toBe('右键提交')
      expect(harness.overlayLayer.querySelector('textarea[data-text-editor="true"]')).toBeNull()
      expect(requests).toEqual([
        {
          targetType: 'canvas',
          targetId: null,
          selectionIds: ['shape_context_commit'],
        },
      ])
    } finally {
      harness.dispose()
    }
  })
})
