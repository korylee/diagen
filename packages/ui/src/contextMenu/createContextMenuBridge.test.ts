import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { createDesigner, createShape } from '@diagen/core'
import { createContextMenuBridge } from './createContextMenuBridge'
import { vi } from 'vitest'
import type { ContextMenuItem } from './types'

const testContext = vi.hoisted(() => ({
  designer: null as ReturnType<typeof createDesigner> | null,
}))

vi.mock('@diagen/renderer', () => ({
  useDesigner: () => {
    if (!testContext.designer) {
      throw new Error('designer context is not ready')
    }
    return testContext.designer
  },
}))

function createShapeById(id: string, x: number, y: number) {
  return createShape({
    id,
    name: id,
    group: null,
    props: { x, y, w: 100, h: 80, angle: 0 },
  })
}

function getMenuItem(items: readonly (ContextMenuItem | '|')[], id: string) {
  return items.find(item => item !== '|' && item.id === id)
}

describe('createContextMenuBridge', () => {
  it('空选择时应禁用 copy/cut/delete/duplicate，且 paste 初始不可用', () => {
    createRoot(dispose => {
      try {
        const designer = createDesigner()
        testContext.designer = designer
        const bridge = createContextMenuBridge()
        const items = bridge.items()

        expect(getMenuItem(items, 'clipboard:copy')?.isDisabled?.()).toBe(true)
        expect(getMenuItem(items, 'clipboard:cut')?.isDisabled?.()).toBe(true)
        expect(getMenuItem(items, 'clipboard:duplicate')?.isDisabled?.()).toBe(true)
        expect(getMenuItem(items, 'edit:delete')?.isDisabled?.()).toBe(true)
        expect(getMenuItem(items, 'clipboard:paste')?.isDisabled?.()).toBe(true)
      } finally {
        testContext.designer = null
        dispose()
      }
    })
  })

  it('有选择且 clipboard 有内容时应允许执行 copy/paste/delete', () => {
    createRoot(dispose => {
      try {
        const designer = createDesigner()
        testContext.designer = designer
        const shape = createShapeById('context_shape', 100, 100)
        designer.edit.add([shape], { record: false, select: false })
        designer.selection.replace([shape.id])

        const bridge = createContextMenuBridge()

        expect(bridge.execute('clipboard:copy')).toBe(true)
        expect(designer.clipboard.canPaste()).toBe(true)
        expect(bridge.execute('clipboard:paste')).toBe(true)
        expect(bridge.execute('edit:delete')).toBe(true)
      } finally {
        testContext.designer = null
        dispose()
      }
    })
  })

  it('entries 应支持 "|" divider 与函数自定义', () => {
    createRoot(dispose => {
      try {
        const designer = createDesigner()
        testContext.designer = designer
        const bridge = createContextMenuBridge(() => ['history:undo', '|', 'clipboard:copy'])
        const items = bridge.items()

        expect(getMenuItem(items, 'history:undo')).toBeTruthy()
        expect(items[1]).toBe('|')
        expect(getMenuItem(items, 'clipboard:copy')).toBeTruthy()
      } finally {
        testContext.designer = null
        dispose()
      }
    })
  })
})
