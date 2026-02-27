import { pick } from '../index'
import { describe, expect, it } from 'vitest'

describe('pick', () => {
  it('应该从对象中选取指定的属性', () => {
    const obj = { a: 1, b: 'hello', c: true }
    const picked = pick(obj, ['a', 'c'])
    expect(picked).toEqual({ a: 1, c: true })
  })

  it('当传入空数组时，应该返回一个空对象', () => {
    const obj = { a: 1, b: 'hello', c: true }
    const picked = pick(obj, [])
    expect(picked).toEqual({})
  })

  it('当传入的键不存在于对象中时，应该忽略这些键', () => {
    const obj = { a: 1, b: 'hello' }
    const picked = pick(obj, ['a', 'c'] as any)
    expect(picked).toEqual({ a: 1 })
  })

  it('当传入 null 或 undefined 对象时，应该返回一个空对象', () => {
    expect(pick(null, ['a'])).toEqual({})
    expect(pick(undefined, ['a'])).toEqual({})
  })

  it('不应该改变原始对象', () => {
    const obj = { a: 1, b: 'hello', c: true }
    const objCopy = { ...obj }
    pick(obj, ['a', 'c'])
    expect(obj).toEqual(objCopy)
  })
});
