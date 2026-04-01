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

      const storedLinker = harness.designer.element.getElementById(linker.id) as { points?: Array<{ x: number; y: number }> } | undefined
      expect(storedLinker?.points ?? []).toHaveLength(2)

      const fromHandle = harness.overlayLayer.querySelector('.dg-linker-overlay__from-endpoint')
      const toHandle = harness.overlayLayer.querySelector('.dg-linker-overlay__to-endpoint')
      const path = harness.overlayLayer.querySelector('path')
      const overlayRoot = path?.closest('div')
      const controlHandles =
        overlayRoot == null
          ? []
          : Array.from(overlayRoot.children).filter((node): node is HTMLElement => {
              if (!(node instanceof HTMLElement) || node.tagName !== 'DIV') return false
              if (node.className.length > 0) return false
              const styleText = (node.getAttribute('style') ?? '').replace(/\s+/g, '')
              return styleText.startsWith('left:') && styleText.includes('top:')
            })

      expect(fromHandle).toBeTruthy()
      expect(toHandle).toBeTruthy()
      expect(path).toBeTruthy()
      expect(controlHandles).toHaveLength(2)
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
