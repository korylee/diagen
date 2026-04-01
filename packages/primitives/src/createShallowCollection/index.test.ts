import { createMemo, createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createShallowCollection } from './index'

function withRoot(run: () => void) {
  createRoot(dispose => {
    try {
      run()
    } finally {
      dispose()
    }
  })
}

describe('createShallowCollection', () => {
  it('应对已代理对象保持幂等，并跳过不可扩展集合', () => {
    const target = new Map<string, number>()
    const wrapped = createShallowCollection(target)
    const sealed = Object.preventExtensions(new Map<string, number>())

    expect(createShallowCollection(wrapped)).toBe(wrapped)
    expect(createShallowCollection(sealed)).toBe(sealed)
  })

  it('Map 的 get/has/size 应按键和值分别追踪', () => {
    withRoot(() => {
      const map = createShallowCollection(new Map([['a', 1]]))
      const getA = vi.fn(() => map.get('a'))
      const hasA = vi.fn(() => map.has('a'))
      const size = vi.fn(() => map.size)

      const memoGetA = createMemo(getA)
      const memoHasA = createMemo(hasA)
      const memoSize = createMemo(size)

      expect(memoGetA()).toBe(1)
      expect(memoHasA()).toBe(true)
      expect(memoSize()).toBe(1)

      map.set('a', 2)
      expect(memoGetA()).toBe(2)
      expect(memoHasA()).toBe(true)
      expect(memoSize()).toBe(1)
      expect(getA).toHaveBeenCalledTimes(2)
      expect(hasA).toHaveBeenCalledTimes(1)
      expect(size).toHaveBeenCalledTimes(1)

      map.set('b', 3)
      expect(memoGetA()).toBe(2)
      expect(memoHasA()).toBe(true)
      expect(memoSize()).toBe(2)
      expect(getA).toHaveBeenCalledTimes(2)
      expect(hasA).toHaveBeenCalledTimes(1)
      expect(size).toHaveBeenCalledTimes(2)

      map.delete('a')
      expect(memoGetA()).toBeUndefined()
      expect(memoHasA()).toBe(false)
      expect(memoSize()).toBe(1)
      expect(getA).toHaveBeenCalledTimes(3)
      expect(hasA).toHaveBeenCalledTimes(2)
      expect(size).toHaveBeenCalledTimes(3)
    })
  })

  it('Map 的 keys/values/entries/forEach 应响应集合级变化', () => {
    withRoot(() => {
      const map = createShallowCollection(new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]))

      const keys = vi.fn(() => Array.from(map.keys()))
      const values = vi.fn(() => Array.from(map.values()))
      const entries = vi.fn(() => Array.from(map.entries()))
      const iterated = vi.fn(() => Array.from(map))
      const traversed = vi.fn(() => {
        const snapshot: Array<[string, number]> = []

        map.forEach((value, key) => {
          snapshot.push([key, value])
        })

        return snapshot
      })

      const memoKeys = createMemo(keys)
      const memoValues = createMemo(values)
      const memoEntries = createMemo(entries)
      const memoIterated = createMemo(iterated)
      const memoTraversed = createMemo(traversed)

      expect(memoKeys()).toEqual(['a', 'b'])
      expect(memoValues()).toEqual([1, 2])
      expect(memoEntries()).toEqual([
        ['a', 1],
        ['b', 2],
      ])
      expect(memoIterated()).toEqual([
        ['a', 1],
        ['b', 2],
      ])
      expect(memoTraversed()).toEqual([
        ['a', 1],
        ['b', 2],
      ])

      map.set('a', 10)
      expect(memoKeys()).toEqual(['a', 'b'])
      expect(memoValues()).toEqual([10, 2])
      expect(memoEntries()).toEqual([
        ['a', 10],
        ['b', 2],
      ])
      expect(memoIterated()).toEqual([
        ['a', 10],
        ['b', 2],
      ])
      expect(memoTraversed()).toEqual([
        ['a', 10],
        ['b', 2],
      ])
      expect(keys).toHaveBeenCalledTimes(1)
      expect(values).toHaveBeenCalledTimes(2)
      expect(entries).toHaveBeenCalledTimes(2)
      expect(iterated).toHaveBeenCalledTimes(2)
      expect(traversed).toHaveBeenCalledTimes(2)

      map.clear()
      expect(memoKeys()).toEqual([])
      expect(memoValues()).toEqual([])
      expect(memoEntries()).toEqual([])
      expect(memoIterated()).toEqual([])
      expect(memoTraversed()).toEqual([])
      expect(keys).toHaveBeenCalledTimes(2)
      expect(values).toHaveBeenCalledTimes(3)
      expect(entries).toHaveBeenCalledTimes(3)
      expect(iterated).toHaveBeenCalledTimes(3)
      expect(traversed).toHaveBeenCalledTimes(3)
    })
  })

  it('Map clear 后应使已追踪键的 get/has 结果失效', () => {
    withRoot(() => {
      const map = createShallowCollection(new Map([['a', 1]]))
      const getA = vi.fn(() => map.get('a'))
      const hasA = vi.fn(() => map.has('a'))

      const memoGetA = createMemo(getA)
      const memoHasA = createMemo(hasA)

      expect(memoGetA()).toBe(1)
      expect(memoHasA()).toBe(true)

      map.clear()

      expect(memoGetA()).toBeUndefined()
      expect(memoHasA()).toBe(false)
      expect(getA).toHaveBeenCalledTimes(2)
      expect(hasA).toHaveBeenCalledTimes(2)
    })
  })

  it('Set 的 has/size/values 应随 add 与 clear 更新', () => {
    withRoot(() => {
      const set = createShallowCollection(new Set(['a']))
      const hasA = vi.fn(() => set.has('a'))
      const hasB = vi.fn(() => set.has('b'))
      const size = vi.fn(() => set.size)
      const values = vi.fn(() => Array.from(set.values()))

      const memoHasA = createMemo(hasA)
      const memoHasB = createMemo(hasB)
      const memoSize = createMemo(size)
      const memoValues = createMemo(values)

      expect(memoHasA()).toBe(true)
      expect(memoHasB()).toBe(false)
      expect(memoSize()).toBe(1)
      expect(memoValues()).toEqual(['a'])

      set.add('b')
      expect(memoHasA()).toBe(true)
      expect(memoHasB()).toBe(true)
      expect(memoSize()).toBe(2)
      expect(memoValues()).toEqual(['a', 'b'])
      expect(hasA).toHaveBeenCalledTimes(1)
      expect(hasB).toHaveBeenCalledTimes(2)
      expect(size).toHaveBeenCalledTimes(2)
      expect(values).toHaveBeenCalledTimes(2)

      set.clear()
      expect(memoHasA()).toBe(false)
      expect(memoHasB()).toBe(false)
      expect(memoSize()).toBe(0)
      expect(memoValues()).toEqual([])
      expect(hasA).toHaveBeenCalledTimes(2)
      expect(hasB).toHaveBeenCalledTimes(3)
      expect(size).toHaveBeenCalledTimes(3)
      expect(values).toHaveBeenCalledTimes(3)
    })
  })

  it('WeakMap 应仅对对应键的读取产生响应', () => {
    withRoot(() => {
      const keyA = {}
      const keyB = {}
      const map = createShallowCollection(new WeakMap<object, number>([[keyA, 1]]))
      const getA = vi.fn(() => map.get(keyA))
      const hasA = vi.fn(() => map.has(keyA))
      const hasB = vi.fn(() => map.has(keyB))

      const memoGetA = createMemo(getA)
      const memoHasA = createMemo(hasA)
      const memoHasB = createMemo(hasB)

      expect(memoGetA()).toBe(1)
      expect(memoHasA()).toBe(true)
      expect(memoHasB()).toBe(false)

      map.set(keyA, 2)
      expect(memoGetA()).toBe(2)
      expect(memoHasA()).toBe(true)
      expect(memoHasB()).toBe(false)
      expect(getA).toHaveBeenCalledTimes(2)
      expect(hasA).toHaveBeenCalledTimes(1)
      expect(hasB).toHaveBeenCalledTimes(1)

      map.set(keyB, 3)
      expect(memoGetA()).toBe(2)
      expect(memoHasA()).toBe(true)
      expect(memoHasB()).toBe(true)
      expect(getA).toHaveBeenCalledTimes(2)
      expect(hasA).toHaveBeenCalledTimes(1)
      expect(hasB).toHaveBeenCalledTimes(2)

      map.delete(keyA)
      expect(memoGetA()).toBeUndefined()
      expect(memoHasA()).toBe(false)
      expect(memoHasB()).toBe(true)
      expect(getA).toHaveBeenCalledTimes(3)
      expect(hasA).toHaveBeenCalledTimes(2)
      expect(hasB).toHaveBeenCalledTimes(2)
    })
  })
})
