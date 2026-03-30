import { describe, expect, it } from 'vitest'
import { createRendererTestHarness } from './rendererTestHarness'

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

      const movedShape = harness.designer.getElementById('shape_drag')
      expect(interaction.pointer.machine.mode()).toBe('idle')
      expect(movedShape?.type).toBe('shape')
      expect(movedShape?.type === 'shape' ? movedShape.props.x : null).toBe(120)
      expect(movedShape?.type === 'shape' ? movedShape.props.y : null).toBe(110)
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      const restoredShape = harness.designer.getElementById('shape_drag')
      expect(restoredShape?.type === 'shape' ? restoredShape.props.x : null).toBe(100)
      expect(restoredShape?.type === 'shape' ? restoredShape.props.y : null).toBe(100)

      harness.designer.redo()
      const redoneShape = harness.designer.getElementById('shape_drag')
      expect(redoneShape?.type === 'shape' ? redoneShape.props.x : null).toBe(120)
      expect(redoneShape?.type === 'shape' ? redoneShape.props.y : null).toBe(110)
    } finally {
      harness.dispose()
    }
  })

  it('ctrl+wheel 缩放应以当前指针位置为中心更新 viewport', async () => {
    const harness = await createRendererTestHarness()

    try {
      await harness.dispatchCtrlWheelAtCanvas({ x: 200, y: 200 }, -100)

      const viewport = harness.designer.view.viewport()

      expect(viewport.zoom).toBeCloseTo(1.1)
      expect(viewport.x).toBeCloseTo(-20)
      expect(viewport.y).toBeCloseTo(-20)
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

      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })
      await harness.dispatchWindowMouseUp()

      await harness.dispatchSceneMouseDownAtCanvas({ x: 200, y: 140 })

      expect(interaction.pointer.machine.mode()).toBe('resizing')

      await harness.dispatchWindowMouseMoveAtCanvas({ x: 230, y: 140 })
      await harness.dispatchWindowMouseUp()

      const resizedShape = harness.designer.getElementById('shape_resize')
      expect(interaction.pointer.machine.mode()).toBe('idle')
      expect(resizedShape?.type === 'shape' ? resizedShape.props.w : null).toBe(130)
      expect(resizedShape?.type === 'shape' ? resizedShape.props.h : null).toBe(80)
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      const restoredShape = harness.designer.getElementById('shape_resize')
      expect(restoredShape?.type === 'shape' ? restoredShape.props.w : null).toBe(100)

      harness.designer.redo()
      const redoneShape = harness.designer.getElementById('shape_resize')
      expect(redoneShape?.type === 'shape' ? redoneShape.props.w : null).toBe(130)
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

      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })
      await harness.dispatchWindowMouseUp()

      const rotateHandle = harness.getOverlayElementsByCursor('grab')[0]
      expect(rotateHandle).toBeTruthy()

      const centerClient = harness.canvasToClient({ x: 150, y: 150 })
      const startClient = harness.canvasToClient({ x: 150, y: 75 })
      const targetClient = rotateVector(startClient, centerClient)

      await harness.dispatchElementMouseDownAtClient(rotateHandle, startClient)

      expect(interaction.pointer.machine.mode()).toBe('rotatingShape')

      await harness.dispatchWindowMouseMoveAtClient(targetClient)
      await harness.dispatchWindowMouseUp()

      const rotatedShape = harness.designer.getElementById('shape_rotate')
      expect(interaction.pointer.machine.mode()).toBe('idle')
      expect(rotatedShape?.type === 'shape' ? rotatedShape.props.angle : null).toBeCloseTo(90)
      expect(harness.designer.history.undoStack()).toHaveLength(1)

      harness.designer.undo()
      const restoredShape = harness.designer.getElementById('shape_rotate')
      expect(restoredShape?.type === 'shape' ? restoredShape.props.angle : null).toBe(0)

      harness.designer.redo()
      const redoneShape = harness.designer.getElementById('shape_rotate')
      expect(redoneShape?.type === 'shape' ? redoneShape.props.angle : null).toBeCloseTo(90)
    } finally {
      harness.dispose()
    }
  })

  it('旋转时按住 shift 应按 snapStep 吸附角度', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_rotate_snap', x: 100, y: 100, w: 100, h: 100 }],
    })

    try {
      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })
      await harness.dispatchWindowMouseUp()

      const rotateHandle = harness.getOverlayElementsByCursor('grab')[0]
      expect(rotateHandle).toBeTruthy()

      const targetCanvas = pointByAngle({ x: 150, y: 150 }, -53, 90)
      const startClient = harness.canvasToClient({ x: 150, y: 75 })

      await harness.dispatchElementMouseDownAtClient(rotateHandle, startClient)
      await harness.dispatchWindowMouseMoveAtClient(harness.canvasToClient(targetCanvas), {
        shiftKey: true,
      })
      await harness.dispatchWindowMouseUp()

      const rotatedShape = harness.designer.getElementById('shape_rotate_snap')
      expect(rotatedShape?.type === 'shape' ? rotatedShape.props.angle : null).toBe(30)
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
      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })
      await harness.dispatchWindowMouseUp()

      expect(harness.designer.selection.selectedIds()).toEqual(['shape_source_panel'])

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
})
