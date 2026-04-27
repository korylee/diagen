import { describe, expect, it } from 'vitest'
import { compileExpression } from './index'

describe('expression', () => {
  describe('compileExpression', () => {
    it('应支持基础四则运算、括号与一元负号', () => {
      const compiled = compileExpression('-(w - 10) + h * 2')
      expect(compiled).not.toBeNull()
      expect(compiled?.({ w: 20, h: 3 })).toBe(-4)
    })

    it('应命中预编译表达式并复用缓存函数', () => {
      const a = compileExpression('w/2')
      const b = compileExpression(' w/2 ')
      expect(a).not.toBeNull()
      expect(a).toBe(b)
      expect(a?.({ w: 120, h: 0 })).toBe(60)
    })

    it('应支持内置函数 min/max/abs/clamp', () => {
      const compiled = compileExpression('max(min(w, 20), abs(-10)) + clamp(h, 0, 8)')
      expect(compiled).not.toBeNull()
      expect(compiled?.({ w: 50, h: 12 })).toBe(28)
    })

    it('应支持自定义函数', () => {
      const compiled = compileExpression('scaleX_1(w, 3) + 1', {
        functions: {
          scaleX_1: (value, ratio) => value * ratio,
        },
      })
      expect(compiled).not.toBeNull()
      expect(compiled?.({ w: 5, h: 0 })).toBe(16)
    })

    it('非法字符应编译失败', () => {
      expect(compileExpression('w + h;')).toBeNull()
    })

    it('超长表达式应编译失败', () => {
      expect(compileExpression(`w${'+w'.repeat(60)}`)).toBeNull()
    })

    it('未知变量应编译失败', () => {
      expect(compileExpression('depth + 1')).toBeNull()
    })

    it('未知函数应编译失败', () => {
      expect(compileExpression('unknownFn_1(w)')).toBeNull()
    })
  })
})
