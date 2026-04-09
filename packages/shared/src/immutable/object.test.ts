import { describe, expect, it } from 'vitest'

import { deepClone } from './object'

describe('object', () => {
  describe('deepClone', () => {
    it('应该返回真正的数组副本', () => {
      const source = ['a', { label: 'b' }]
      const cloned = deepClone(source)

      expect(Array.isArray(cloned)).toBe(true)
      expect(cloned).toEqual(source)
      expect(cloned).not.toBe(source)
      expect(cloned[1]).not.toBe(source[1])
    })

    it('应该将访问器属性物化为当前值', () => {
      const source = {
        current: 2,
        get doubled() {
          return { value: this.current * 2 }
        },
      }

      const cloned = deepClone(source)
      const desc = Object.getOwnPropertyDescriptor(cloned, 'doubled')

      expect(desc?.get).toBeUndefined()
      expect(desc?.set).toBeUndefined()
      expect(desc?.writable).toBe(true)
      expect(cloned.doubled).toEqual({ value: 4 })

      source.current = 3
      expect(cloned.doubled).toEqual({ value: 4 })
      expect(cloned.doubled).not.toBe(source.doubled)
    })

    it('应该保持循环引用结构', () => {
      const source: { id: string; self?: unknown } = { id: 'node' }
      source.self = source

      const cloned = deepClone(source)

      expect(cloned).not.toBe(source)
      expect(cloned.self).toBe(cloned)
    })
  })
})
