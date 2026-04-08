import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createDesigner } from '@diagen/core'
import { createPan } from './createPan'

const testContext = vi.hoisted(() => ({
  designer: null as ReturnType<typeof createDesigner> | null,
}))

vi.mock('../../../..', () => ({
  useDesigner: () => {
    if (!testContext.designer) {
      throw new Error('designer context is not ready')
    }
    return testContext.designer
  },
}))

function withPan(
  options: { button?: number },
  run: (context: {
    designer: ReturnType<typeof createDesigner>
    pan: ReturnType<typeof createPan>
  }) => void | Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    createRoot(dispose => {
      const cleanup = () => {
        testContext.designer = null
        dispose()
      }

      const finish = () => {
        cleanup()
        resolve()
      }

      const fail = (error: unknown) => {
        cleanup()
        reject(error)
      }

      const designer = createDesigner({
        autoGrow: {
          enabled: false,
        },
      })

      testContext.designer = designer
      const pan = createPan(options)

      Promise.resolve(run({ designer, pan })).then(finish, fail)
    })
  })
}

function createMouseEvent(x: number, y: number, button = 0): MouseEvent {
  return {
    clientX: x,
    clientY: y,
    button,
  } as MouseEvent
}

describe('createPan', () => {
  it('不满足触发条件时 start 应返回 false', () => {
    return withPan({ button: 1 }, ({ pan }) => {
      expect(pan.start(createMouseEvent(10, 20, 0))).toBe(false)
      expect(pan.isActive()).toBe(false)
    })
  })

  it('中键拖拽时应返回 true 并更新 transform', () => {
    return withPan({ button: 1 }, ({ designer, pan }) => {
      expect(pan.start(createMouseEvent(10, 20, 1))).toBe(true)
      expect(pan.isActive()).toBe(true)
      expect(pan.start(createMouseEvent(30, 40, 1))).toBe(false)

      pan.move(createMouseEvent(25, 50, 1))

    expect(designer.view.transform().x).toBe(15)
    expect(designer.view.transform().y).toBe(30)

      pan.end()
      expect(pan.isActive()).toBe(false)
    })
  })

  it('按住空格时左键也应允许平移', async () => {
    await withPan({ button: 1 }, async ({ pan }) => {
      await Promise.resolve()
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))

      expect(pan.isSpacePressed()).toBe(true)
      expect(pan.start(createMouseEvent(0, 0, 0))).toBe(true)
      expect(pan.isActive()).toBe(true)

      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
      pan.end()
    })
  })
})
