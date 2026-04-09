import { createLinker } from '@diagen/core'
import { describe, expect, it } from 'vitest'
import { createRendererTestHarness } from '../../../.test/createRendererTestHarness'

function flushEffects(): Promise<void> {
  return Promise.resolve()
    .then(() => undefined)
    .then(() => undefined)
}

describe('LinkerOverlay', () => {
  it('选中连线时应渲染端点手柄与控制点手柄', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_link_a', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_link_b', x: 320, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      const linker = createLinker({
        id: 'linker_overlay_selected',
        name: 'linker_overlay_selected',
        from: {
          id: 'shape_link_a',
          x: 200,
          y: 140,
          binding: { type: 'free' },
        },
        to: {
          id: 'shape_link_b',
          x: 320,
          y: 140,
          binding: { type: 'free' },
        },
        points: [
          { x: 240, y: 90 },
          { x: 280, y: 190 },
        ],
      })

      harness.designer.edit.add([linker], { record: false, select: false })
      harness.designer.selection.replace([linker.id])
      await flushEffects()

      const storedLinker = harness.designer.element.getElementById(linker.id) as
        | { points?: Array<{ x: number; y: number }> }
        | undefined
      expect(storedLinker?.points ?? []).toHaveLength(2)

      const fromHandle = harness.overlayLayer.querySelector('.dg-linker-overlay__from-endpoint')
      const toHandle = harness.overlayLayer.querySelector('.dg-linker-overlay__to-endpoint')
      const path = harness.overlayLayer.querySelector('path')
      const controlHandles = harness.overlayLayer.querySelectorAll('.dg-linker-overlay__control-point')

      expect(fromHandle).toBeTruthy()
      expect(toHandle).toBeTruthy()
      expect(path).toBeTruthy()
      expect(controlHandles).toHaveLength(2)
    } finally {
      harness.dispose()
    }
  })

  it('选中带文本的连线时应渲染标签框反馈', async () => {
    const harness = await createRendererTestHarness()

    try {
      const linker = createLinker({
        id: 'linker_overlay_text_box',
        name: 'linker_overlay_text_box',
        linkerType: 'straight',
        text: '标签',
        textPosition: {
          dx: 20,
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
          x: 240,
          y: 100,
          binding: { type: 'free' },
        },
      })

      harness.designer.edit.add([linker], { record: false, select: false })
      harness.designer.selection.replace([linker.id])
      await flushEffects()

      const textBox = harness.overlayLayer.querySelector('.dg-linker-overlay__text-box')
      expect(textBox).toBeTruthy()
    } finally {
      harness.dispose()
    }
  })

  it('拖拽端点手柄应进入 draggingLinker 并在结束后返回 idle', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_drag_from', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_drag_to', x: 320, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      const linker = createLinker({
        id: 'linker_overlay_drag',
        name: 'linker_overlay_drag',
        from: {
          id: 'shape_drag_from',
          x: 200,
          y: 140,
          binding: { type: 'free' },
        },
        to: {
          id: 'shape_drag_to',
          x: 320,
          y: 140,
          binding: { type: 'free' },
        },
      })

      harness.designer.edit.add([linker], { record: false, select: false })
      harness.designer.selection.replace([linker.id])
      await flushEffects()

      const interaction = harness.getInteraction()
      const fromHandle = harness.overlayLayer.querySelector('.dg-linker-overlay__from-endpoint') as HTMLElement | null
      expect(fromHandle).toBeTruthy()

      await harness.dispatchElementMouseDownAtClient(fromHandle!, harness.canvasToClient({ x: 200, y: 140 }))
      expect(interaction.pointer.machine.mode()).toBe('draggingLinker')

      await harness.dispatchWindowMouseMoveAtCanvas({ x: 180, y: 120 })
      await harness.dispatchWindowMouseUp()
      expect(interaction.pointer.machine.mode()).toBe('idle')
    } finally {
      harness.dispose()
    }
  })

  it('双击 broken 连线控制点后应删除该点并更新 overlay', async () => {
    const harness = await createRendererTestHarness({
      shapes: [
        { id: 'shape_control_remove_a', x: 100, y: 100, w: 100, h: 80 },
        { id: 'shape_control_remove_b', x: 320, y: 100, w: 100, h: 80 },
      ],
    })

    try {
      const linker = createLinker({
        id: 'linker_overlay_remove_control',
        name: 'linker_overlay_remove_control',
        linkerType: 'broken',
        from: {
          id: 'shape_control_remove_a',
          x: 200,
          y: 140,
          binding: { type: 'free' },
        },
        to: {
          id: 'shape_control_remove_b',
          x: 320,
          y: 140,
          binding: { type: 'free' },
        },
        points: [
          { x: 240, y: 90 },
          { x: 280, y: 190 },
        ],
      })

      harness.designer.edit.add([linker], { record: false, select: false })
      harness.designer.selection.replace([linker.id])
      await flushEffects()

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
      await flushEffects()

      const storedLinker = harness.designer.element.getElementById(linker.id) as
        | { points?: Array<{ x: number; y: number }> }
        | undefined
      expect(storedLinker?.points).toEqual([{ x: 280, y: 190 }])
    } finally {
      harness.dispose()
    }
  })

  it('quick-create 按钮按下后应进入 draggingLinker', async () => {
    const harness = await createRendererTestHarness({
      shapes: [{ id: 'shape_quick_create_overlay', x: 100, y: 100, w: 100, h: 80 }],
    })

    try {
      await harness.dispatchSceneMouseDownAtCanvas({ x: 140, y: 140 })
      await harness.dispatchWindowMouseUp()
      await flushEffects()

      const interaction = harness.getInteraction()
      const panel = harness.overlayLayer.querySelector('[data-linker-create-panel="true"]')
      const button = panel?.querySelector('button') as HTMLElement | null

      expect(panel).toBeTruthy()
      expect(button).toBeTruthy()

      await harness.dispatchElementMouseDown(button!)
      expect(interaction.pointer.machine.mode()).toBe('draggingLinker')
    } finally {
      harness.dispose()
    }
  })
})
