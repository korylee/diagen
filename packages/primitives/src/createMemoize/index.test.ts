import { createMemo } from 'solid-js'
import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createMemoize } from './index'

describe('createMemoize', () => {
  it('相同参数重复调用时应复用缓存结果', () => {
    const resolver = vi.fn((value: number) => value * 2)
    const memoized = createMemoize(resolver)

    expect(memoized(2)).toBe(4)
    expect(memoized(2)).toBe(4)
    expect(resolver).toHaveBeenCalledTimes(1)
  })

  it('load 应强制刷新缓存值', () => {
    let callCount = 0
    const resolver = vi.fn((value: number) => value + callCount++)
    const memoized = createMemoize(resolver)

    expect(memoized(1)).toBe(1)
    expect(memoized.load(1)).toBe(2)
    expect(memoized(1)).toBe(2)
    expect(resolver).toHaveBeenCalledTimes(2)
  })

  it('delete 与 clear 应分别移除指定缓存和全部缓存', () => {
    let callCount = 0
    const resolver = vi.fn((value: number) => value * 10 + callCount++)
    const memoized = createMemoize(resolver)

    expect(memoized(1)).toBe(10)
    expect(memoized(2)).toBe(21)

    memoized.delete(1)
    expect(memoized(1)).toBe(12)

    memoized.clear()
    expect(memoized(2)).toBe(23)
    expect(resolver).toHaveBeenCalledTimes(4)
  })

  it('默认 getKey 应基于完整参数列表区分缓存项', () => {
    const resolver = vi.fn((value: number, suffix: string) => `${value}-${suffix}`)
    const memoized = createMemoize(resolver)

    expect(memoized.getKey(1, 'a')).toBe('[1,"a"]')
    expect(memoized(1, 'a')).toBe('1-a')
    expect(memoized(1, 'a')).toBe('1-a')
    expect(memoized(1, 'b')).toBe('1-b')
    expect(resolver).toHaveBeenCalledTimes(2)
  })

  it('自定义 getKey 应允许不同参数命中同一缓存项', () => {
    let callCount = 0
    const resolver = vi.fn((id: number, label: string) => `${id}:${label}:${callCount++}`)
    const getKey = vi.fn((id: number) => id)
    const memoized = createMemoize(resolver, { getKey })

    expect(memoized(1, 'first')).toBe('1:first:0')
    expect(memoized(1, 'second')).toBe('1:first:0')
    expect(memoized(2, 'other')).toBe('2:other:1')

    expect(getKey).toHaveBeenNthCalledWith(1, 1, 'first')
    expect(getKey).toHaveBeenNthCalledWith(2, 1, 'second')
    expect(getKey).toHaveBeenNthCalledWith(3, 2, 'other')
    expect(resolver).toHaveBeenCalledTimes(2)
  })

  it('传入外部 cache 时应复用已有缓存并写回同一个实例', () => {
    const cache = new Map<string, string>([['cached:1', 'from-cache']])
    const resolver = vi.fn((id: number) => `resolved:${id}`)
    const memoized = createMemoize(resolver, {
      cache,
      getKey: id => `cached:${id}`,
    })

    expect(memoized(1)).toBe('from-cache')
    expect(memoized(2)).toBe('resolved:2')
    expect(cache.get('cached:2')).toBe('resolved:2')
    expect(memoized.cache.get('cached:2')).toBe('resolved:2')
    expect(resolver).toHaveBeenCalledTimes(1)
  })

  it('cache.get 与 cache.has 在 reactive scope 中应可追踪缓存变化', () => {
    createRoot(dispose => {
      const memoized = createMemoize((value: number) => value * 2)
      const key = memoized.getKey(1)
      const hasValue = createMemo(() => memoized.cache.has(key))
      const cachedValue = createMemo(() => memoized.cache.get(key))

      expect(hasValue()).toBe(false)
      expect(cachedValue()).toBeUndefined()

      memoized(1)
      expect(hasValue()).toBe(true)
      expect(cachedValue()).toBe(2)

      memoized.delete(1)
      expect(hasValue()).toBe(false)
      expect(cachedValue()).toBeUndefined()

      dispose()
    })
  })
})
