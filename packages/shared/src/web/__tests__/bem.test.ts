import { describe, expect, it } from 'vitest'

import { createBem, createDgBem } from '../bem'

describe('bem', () => {
  describe('createBem', () => {
    it('应该生成 block 类名', () => {
      const bem = createBem('dg', 'toolbar')

      expect(bem()).toBe('dg-toolbar')
    })

    it('应该生成 element 与 modifier 类名', () => {
      const bem = createBem('dg', 'toolbar')

      expect(bem('button', { active: true, disabled: false })).toBe('dg-toolbar__button dg-toolbar__button--active')
    })

    it('应该支持直接传入 modifier 集合', () => {
      const bem = createBem('dg', 'toolbar')

      expect(bem({ readonly: true })).toBe('dg-toolbar dg-toolbar--readonly')
    })

    it('应该忽略数组中的空 modifier', () => {
      const bem = createBem('dg', 'toolbar')

      expect(bem('divider', ['small', undefined, false, null])).toBe('dg-toolbar__divider dg-toolbar__divider--small')
    })

    it('应该保留已带命名空间前缀的 modifier', () => {
      const bem = createBem('dg', 'toolbar')

      expect(bem(['dg--compact', { readonly: true }])).toBe('dg-toolbar dg--compact dg-toolbar--readonly')
    })

    it('name 已包含命名空间时不应重复追加', () => {
      const bem = createBem('dg', 'dg-toolbar')

      expect(bem()).toBe('dg-toolbar')
    })
  })

  describe('createDgBem', () => {
    it('应该使用默认命名空间', () => {
      const bem = createDgBem('sidebar')

      expect(bem('item', { active: true })).toBe('dg-sidebar__item dg-sidebar__item--active')
    })
  })
})
