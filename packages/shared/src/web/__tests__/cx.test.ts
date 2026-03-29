import { describe, expect, it } from 'vitest'

import { cx } from '../cx'

describe('cx', () => {
  it('应该合并字符串类名并忽略空值', () => {
    expect(cx('panel', false, null, undefined, 'panel--active')).toBe('panel panel--active')
  })

  it('应该支持对象语法', () => {
    expect(cx({ selected: true, disabled: false, compact: 1, hidden: 0 })).toBe('selected compact')
  })

  it('应该支持数组与嵌套结构', () => {
    expect(cx(['root', ['item', { focus: true, blur: false }]], { visible: true })).toBe('root item focus visible')
  })

  it('应该忽略 0 与空字符串，但保留字符串 "0"', () => {
    expect(cx(0, '', '0')).toBe('0')
  })
})
