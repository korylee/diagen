import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'solid-js/web'
import { ContextMenu } from './ContextMenu'
import type { ResolvedContextMenuEntry } from './types'

const defaultItems: readonly ResolvedContextMenuEntry[] = [
  {
    key: 'clipboard:copy',
    label: '复制',
    extra: 'Ctrl+C',
  },
]

function flushEffects(): Promise<void> {
  return Promise.resolve()
    .then(() => undefined)
    .then(() => undefined)
}

function mountContextMenu(
  overrides: Partial<{
    open: boolean
    position: { x: number; y: number }
    items: readonly ResolvedContextMenuEntry[]
    onClose: (reason: 'outside' | 'escape' | 'select') => void
    onSelect: (id: string) => void
  }> = {},
) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const onClose = overrides.onClose ?? vi.fn()
  const onSelect = overrides.onSelect ?? vi.fn()
  const dispose = render(
    () => (
      <ContextMenu
        open={overrides.open ?? true}
        position={overrides.position ?? { x: 120, y: 80 }}
        items={overrides.items ?? defaultItems}
        onSelect={onSelect}
        onClose={onClose}
      />
    ),
    host,
  )

  return {
    host,
    onClose,
    onSelect,
    dispose: () => {
      dispose()
      host.remove()
    },
  }
}

const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')
const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')
const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')

afterEach(() => {
  if (originalInnerWidth) {
    Object.defineProperty(window, 'innerWidth', originalInnerWidth)
  }
  if (originalInnerHeight) {
    Object.defineProperty(window, 'innerHeight', originalInnerHeight)
  }
  if (originalClientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth)
  }
  if (originalClientHeight) {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight)
  }
  document.body.innerHTML = ''
})

describe('ContextMenu', () => {
  it('外部 pointerdown 即使阻止冒泡也应关闭菜单', async () => {
    const { dispose, onClose } = mountContextMenu()

    try {
      await flushEffects()

      const outside = document.createElement('button')
      outside.addEventListener('pointerdown', event => {
        event.stopPropagation()
      })
      document.body.appendChild(outside)

      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await flushEffects()

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledWith('outside')
    } finally {
      dispose()
    }
  })

  it('打开时应按视口边界修正位置，并保持高于 renderer overlay 的层级', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 260,
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 180,
    })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return this.classList.contains('dg-context-menu') ? 220 : 0
      },
    })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return this.classList.contains('dg-context-menu') ? 160 : 0
      },
    })

    const { dispose } = mountContextMenu({
      position: { x: 250, y: 170 },
    })

    try {
      await flushEffects()

      const menu = document.body.querySelector('[data-context-menu="true"]') as HTMLDivElement | null
      expect(menu).toBeTruthy()
      expect(menu?.style.left).toBe('32px')
      expect(menu?.style.top).toBe('12px')
      expect(menu?.style.zIndex).toBe('11000')
    } finally {
      dispose()
    }
  })

  it('点击菜单项时应回调 onSelect 并关闭菜单', async () => {
    const { dispose, onClose, onSelect } = mountContextMenu()

    try {
      await flushEffects()

      const menuItem = document.body.querySelector('[data-menu-id="clipboard:copy"] button')
      menuItem?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await flushEffects()

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect).toHaveBeenCalledWith('clipboard:copy')
      expect(onClose).toHaveBeenCalledWith('select')
    } finally {
      dispose()
    }
  })

  it('按 Escape 时应关闭菜单', async () => {
    const { dispose, onClose } = mountContextMenu()

    try {
      await flushEffects()

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      await flushEffects()

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledWith('escape')
    } finally {
      dispose()
    }
  })
})
