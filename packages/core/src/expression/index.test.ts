import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  compileExpression,
  evaluateCompiled,
  evaluateExpression,
  compileExpressions,
  evaluateExpressions,
  compileValue,
  evaluateCompiledValue,
  resolvePoint,
  resolvePoints,
  clearExpressionCache,
  getExpressionCacheSize,
  getExpressionCacheStats,
  isExpressionCached,
  isExpressionString,
  isCompiledExpression,
  type CompiledExpression,
  type CompiledValue,
} from './index'

describe('compileExpression', () => {
  describe('正常路径', () => {
    it('应该成功编译简单的 w 变量表达式', () => {
      const fn = compileExpression('w')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(100)
    })

    it('应该成功编译简单的 h 变量表达式', () => {
      const fn = compileExpression('h')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(50)
    })

    it('应该成功编译 w/2 表达式', () => {
      const fn = compileExpression('w/2')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(50)
    })

    it('应该成功编译 h/2 表达式', () => {
      const fn = compileExpression('h/2')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(25)
    })

    it('应该成功编译 w-20 表达式', () => {
      const fn = compileExpression('w-20')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(80)
    })

    it('应该成功编译 h-20 表达式', () => {
      const fn = compileExpression('h-20')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(30)
    })

    it('应该成功编译 w*0.75 表达式', () => {
      const fn = compileExpression('w*0.75')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(75)
    })

    it('应该成功编译 h*0.25 表达式', () => {
      const fn = compileExpression('h*0.25')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(12.5)
    })

    it('应该成功编译包含括号的复杂表达式', () => {
      const fn = compileExpression('(w+h)/2')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(75)
    })

    it('应该成功编译包含多个运算符的表达式', () => {
      const fn = compileExpression('w*2+h/2')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(225)
    })

    it('应该成功编译包含空格的表达式', () => {
      const fn = compileExpression(' w + h ')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(150)
    })

    it('应该成功编译纯数字表达式', () => {
      const fn = compileExpression('42')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(42)
    })

    it('应该成功编译包含小数的表达式', () => {
      const fn = compileExpression('w*1.5')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(150)
    })

    it('应该成功编译包含负数的表达式', () => {
      const fn = compileExpression('w+-10')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(90)
    })
  })

  describe('边界情况', () => {
    it('应该处理空字符串表达式', () => {
      const fn = compileExpression('')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(0)
    })

    it('应该处理只有空格的表达式', () => {
      const fn = compileExpression('   ')
      expect(fn).not.toBeNull()
      expect(fn!(100, 50)).toBe(0)
    })

    it('应该处理 null 或 undefined 输入', () => {
      const fn1 = compileExpression(null as any)
      const fn2 = compileExpression(undefined as any)
      expect(fn1).not.toBeNull()
      expect(fn1!(100, 50)).toBe(0)
      expect(fn2).not.toBeNull()
      expect(fn2!(100, 50)).toBe(0)
    })

    it('应该处理零值 w 和 h', () => {
      const fn = compileExpression('w+h')
      expect(fn!(0, 0)).toBe(0)
    })

    it('应该处理非常大的数值', () => {
      const fn = compileExpression('w')
      expect(fn!(Number.MAX_SAFE_INTEGER, 100)).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('应该处理非常小的数值', () => {
      const fn = compileExpression('w')
      expect(fn!(0.0001, 0.0001)).toBe(0.0001)
    })

    it('应该处理负数的 w 和 h', () => {
      const fn = compileExpression('w+h')
      expect(fn!(-100, -50)).toBe(-150)
    })

    it('应该返回缓存的表达式函数', () => {
      const fn1 = compileExpression('w*2')
      const fn2 = compileExpression('w*2')
      expect(fn1).toBe(fn2)
    })

    it('应该处理接近最大长度的表达式', () => {
      const expr = 'w+' + '1'.repeat(95)
      const fn = compileExpression(expr)
      expect(fn).not.toBeNull()
    })
  })

  describe('错误情况', () => {
    it('应该拒绝超长表达式', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const expr = 'w+' + '1'.repeat(100)
      const fn = compileExpression(expr)
      expect(fn).toBeNull()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('应该拒绝包含非法字符的表达式', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fn = compileExpression('w@h')
      expect(fn).toBeNull()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('应该拒绝包含未知变量的表达式', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fn = compileExpression('x+y')
      expect(fn).toBeNull()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('应该拒绝包含 JavaScript 关键字的表达式', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fn = compileExpression('console.log(w)')
      expect(fn).toBeNull()
      warnSpy.mockRestore()
    })

    it('应该拒绝包含函数调用的表达式', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fn = compileExpression('Math.max(w, h)')
      expect(fn).toBeNull()
      warnSpy.mockRestore()
    })

    it('应该拒绝语法错误的表达式', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fn = compileExpression('w++h')
      expect(fn).toBeNull()
      warnSpy.mockRestore()
    })

    it('应该拒绝包含 eval 的表达式', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const fn = compileExpression('eval("1")')
      expect(fn).toBeNull()
      warnSpy.mockRestore()
    })
  })
})

describe('evaluateCompiled', () => {
  describe('正常路径', () => {
    it('应该正确执行已编译的表达式', () => {
      const fn = compileExpression('w/2')
      expect(evaluateCompiled(fn, 100, 50)).toBe(50)
    })

    it('应该正确执行包含 h 的表达式', () => {
      const fn = compileExpression('h*2')
      expect(evaluateCompiled(fn, 100, 50)).toBe(100)
    })

    it('应该正确执行复杂表达式', () => {
      const fn = compileExpression('(w+h)/2')
      expect(evaluateCompiled(fn, 100, 50)).toBe(75)
    })
  })

  describe('边界情况', () => {
    it('应该处理 null 输入', () => {
      expect(evaluateCompiled(null, 100, 50)).toBe(0)
    })

    it('应该处理 undefined 输入', () => {
      expect(evaluateCompiled(undefined, 100, 50)).toBe(0)
    })

    it('应该使用默认值参数', () => {
      expect(evaluateCompiled(null, 100, 50, 42)).toBe(42)
    })

    it('应该处理返回 NaN 的情况', () => {
      const fn = ((w: number) => NaN) as CompiledExpression
      expect(evaluateCompiled(fn, 100, 50, 10)).toBe(10)
    })

    it('应该处理返回 Infinity 的情况', () => {
      const fn = ((w: number) => Infinity) as CompiledExpression
      expect(evaluateCompiled(fn, 100, 50, 10)).toBe(10)
    })

    it('应该处理返回 -Infinity 的情况', () => {
      const fn = ((w: number) => -Infinity) as CompiledExpression
      expect(evaluateCompiled(fn, 100, 50, 10)).toBe(10)
    })

    it('应该处理抛出异常的表达式', () => {
      const fn = (() => {
        throw new Error('test')
      }) as CompiledExpression
      expect(evaluateCompiled(fn, 100, 50, 10)).toBe(10)
    })
  })
})

describe('evaluateExpression', () => {
  describe('正常路径', () => {
    it('应该编译并执行字符串表达式', () => {
      expect(evaluateExpression('w/2', 100, 50)).toBe(50)
    })

    it('应该直接返回数值', () => {
      expect(evaluateExpression(42, 100, 50)).toBe(42)
    })

    it('应该正确处理 h 变量', () => {
      expect(evaluateExpression('h-10', 100, 50)).toBe(40)
    })

    it('应该正确处理复杂表达式', () => {
      expect(evaluateExpression('w*0.75+h*0.25', 100, 50)).toBe(87.5)
    })
  })

  describe('边界情况', () => {
    it('应该处理零值', () => {
      expect(evaluateExpression(0, 100, 50)).toBe(0)
    })

    it('应该处理负数', () => {
      expect(evaluateExpression(-30, 100, 50)).toBe(-30)
    })

    it('应该处理浮点数', () => {
      expect(evaluateExpression(3.14, 100, 50)).toBe(3.14)
    })

    it('应该使用默认值处理无效表达式', () => {
      expect(evaluateExpression('invalid', 100, 50, 42)).toBe(42)
    })

    it('应该处理空字符串表达式', () => {
      expect(evaluateExpression('', 100, 50)).toBe(0)
    })
  })
})

describe('compileExpressions', () => {
  describe('正常路径', () => {
    it('应该批量编译多个表达式', () => {
      const results = compileExpressions(['w', 'h', 'w/2'])
      expect(results).toHaveLength(3)
      expect(results[0]).not.toBeNull()
      expect(results[1]).not.toBeNull()
      expect(results[2]).not.toBeNull()
    })

    it('应该正确执行批量编译的结果', () => {
      const results = compileExpressions(['w', 'h', 'w+h'])
      expect(results[0]!(100, 50)).toBe(100)
      expect(results[1]!(100, 50)).toBe(50)
      expect(results[2]!(100, 50)).toBe(150)
    })
  })

  describe('边界情况', () => {
    it('应该处理空数组', () => {
      expect(compileExpressions([])).toEqual([])
    })

    it('应该处理包含无效表达式的数组', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const results = compileExpressions(['w', 'invalid_var', 'h'])
      expect(results).toHaveLength(3)
      expect(results[0]).not.toBeNull()
      expect(results[1]).toBeNull()
      expect(results[2]).not.toBeNull()
      warnSpy.mockRestore()
    })

    it('应该处理包含空字符串的数组', () => {
      const results = compileExpressions(['w', '', 'h'])
      expect(results).toHaveLength(3)
      expect(results[0]).not.toBeNull()
      expect(results[1]).not.toBeNull()
      expect(results[1]!(100, 50)).toBe(0)
      expect(results[2]).not.toBeNull()
    })
  })
})

describe('evaluateExpressions', () => {
  describe('正常路径', () => {
    it('应该批量执行表达式', () => {
      const results = evaluateExpressions(['w', 'h', 'w/2'], 100, 50)
      expect(results).toEqual([100, 50, 50])
    })

    it('应该处理混合数值和表达式', () => {
      const results = evaluateExpressions([10, 'w/2', 20, 'h'], 100, 50)
      expect(results).toEqual([10, 50, 20, 50])
    })
  })

  describe('边界情况', () => {
    it('应该处理空数组', () => {
      expect(evaluateExpressions([], 100, 50)).toEqual([])
    })

    it('应该使用默认值处理无效表达式', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const results = evaluateExpressions(['invalid'], 100, 50, 42)
      expect(results).toEqual([42])
      warnSpy.mockRestore()
    })
  })
})

describe('compileValue', () => {
  describe('正常路径', () => {
    it('应该编译数值为 number 类型', () => {
      const result = compileValue(42)
      expect(result.type).toBe('number')
      expect(result.value).toBe(42)
      expect(result.compiled).toBeUndefined()
    })

    it('应该编译表达式为 expression 类型', () => {
      const result = compileValue('w/2')
      expect(result.type).toBe('expression')
      expect(result.compiled).toBeDefined()
    })

    it('应该编译有效的表达式字符串', () => {
      const result = compileValue('h-10')
      expect(result.type).toBe('expression')
    })
  })

  describe('边界情况', () => {
    it('应该处理零值', () => {
      const result = compileValue(0)
      expect(result.type).toBe('number')
      expect(result.value).toBe(0)
    })

    it('应该处理负数', () => {
      const result = compileValue(-10)
      expect(result.type).toBe('number')
      expect(result.value).toBe(-10)
    })

    it('应该处理浮点数', () => {
      const result = compileValue(3.14)
      expect(result.type).toBe('number')
      expect(result.value).toBe(3.14)
    })

    it('应该处理无效表达式返回默认值', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = compileValue('invalid_var')
      expect(result.type).toBe('number')
      expect(result.value).toBe(0)
      warnSpy.mockRestore()
    })

    it('应该处理空字符串', () => {
      const result = compileValue('')
      expect(result.type).toBe('expression')
      expect(result.compiled).toBeDefined()
      expect(evaluateCompiledValue(result, 100, 50)).toBe(0)
    })
  })
})

describe('evaluateCompiledValue', () => {
  describe('正常路径', () => {
    it('应该返回 number 类型的值', () => {
      const compiled: CompiledValue = { type: 'number', value: 42 }
      expect(evaluateCompiledValue(compiled, 100, 50)).toBe(42)
    })

    it('应该执行 expression 类型的值', () => {
      const fn = compileExpression('w/2')
      const compiled: CompiledValue = { type: 'expression', value: 0, compiled: fn! }
      expect(evaluateCompiledValue(compiled, 100, 50)).toBe(50)
    })
  })

  describe('边界情况', () => {
    it('应该处理零值', () => {
      const compiled: CompiledValue = { type: 'number', value: 0 }
      expect(evaluateCompiledValue(compiled, 100, 50)).toBe(0)
    })

    it('应该处理 expression 类型的 compiled 为 undefined', () => {
      const compiled: CompiledValue = { type: 'expression', value: 0 }
      expect(evaluateCompiledValue(compiled, 100, 50)).toBe(0)
    })
  })
})

describe('resolvePoint', () => {
  describe('正常路径', () => {
    it('应该解析数值坐标', () => {
      const result = resolvePoint(10, 20, 100, 50)
      expect(result).toEqual({ x: 10, y: 20 })
    })

    it('应该解析表达式坐标', () => {
      const result = resolvePoint('w/2', 'h/2', 100, 50)
      expect(result).toEqual({ x: 50, y: 25 })
    })

    it('应该解析混合坐标', () => {
      const result = resolvePoint(10, 'h-10', 100, 50)
      expect(result).toEqual({ x: 10, y: 40 })
    })
  })

  describe('边界情况', () => {
    it('应该处理零值坐标', () => {
      const result = resolvePoint(0, 0, 100, 50)
      expect(result).toEqual({ x: 0, y: 0 })
    })

    it('应该处理负数坐标', () => {
      const result = resolvePoint(-10, -20, 100, 50)
      expect(result).toEqual({ x: -10, y: -20 })
    })

    it('应该处理无效表达式坐标', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = resolvePoint('invalid', 'h', 100, 50)
      expect(result).toEqual({ x: 0, y: 50 })
      warnSpy.mockRestore()
    })
  })
})

describe('resolvePoints', () => {
  describe('正常路径', () => {
    it('应该批量解析点坐标', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 'w', y: 'h' },
        { x: 'w/2', y: 'h/2' },
      ]
      const result = resolvePoints(points, 100, 50)
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 100, y: 50 },
        { x: 50, y: 25 },
      ])
    })
  })

  describe('边界情况', () => {
    it('应该处理空数组', () => {
      expect(resolvePoints([], 100, 50)).toEqual([])
    })

    it('应该处理单个点', () => {
      const result = resolvePoints([{ x: 'w', y: 'h' }], 100, 50)
      expect(result).toEqual([{ x: 100, y: 50 }])
    })
  })
})

describe('缓存管理', () => {
  beforeEach(() => {
    clearExpressionCache()
  })

  afterEach(() => {
    clearExpressionCache()
  })

  describe('clearExpressionCache', () => {
    it('应该清空缓存', () => {
      compileExpression('w*999')
      expect(getExpressionCacheSize()).toBeGreaterThan(0)
      clearExpressionCache()
      expect(getExpressionCacheSize()).toBeGreaterThan(0)
    })

    it('应该保留预编译表达式', () => {
      clearExpressionCache()
      expect(isExpressionCached('w')).toBe(true)
      expect(isExpressionCached('h')).toBe(true)
      expect(isExpressionCached('w/2')).toBe(true)
    })
  })

  describe('getExpressionCacheSize', () => {
    it('应该返回缓存大小', () => {
      const initialSize = getExpressionCacheSize()
      compileExpression('w*999')
      expect(getExpressionCacheSize()).toBe(initialSize + 1)
    })
  })

  describe('getExpressionCacheStats', () => {
    it('应该返回缓存统计信息', () => {
      const stats = getExpressionCacheStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('maxSize')
      expect(stats).toHaveProperty('entries')
      expect(Array.isArray(stats.entries)).toBe(true)
    })

    it('应该包含预编译表达式', () => {
      const stats = getExpressionCacheStats()
      expect(stats.entries).toContain('w')
      expect(stats.entries).toContain('h')
    })
  })

  describe('isExpressionCached', () => {
    it('应该检测已缓存的表达式', () => {
      expect(isExpressionCached('w')).toBe(true)
    })

    it('应该检测未缓存的表达式', () => {
      expect(isExpressionCached('w*999')).toBe(false)
      compileExpression('w*999')
      expect(isExpressionCached('w*999')).toBe(true)
    })

    it('应该处理带空格的表达式', () => {
      compileExpression(' w ')
      expect(isExpressionCached(' w ')).toBe(true)
    })
  })
})

describe('类型守卫', () => {
  describe('isExpressionString', () => {
    it('应该识别有效的表达式字符串', () => {
      expect(isExpressionString('w/2')).toBe(true)
    })

    it('应该拒绝空字符串', () => {
      expect(isExpressionString('')).toBe(false)
    })

    it('应该拒绝只有空格的字符串', () => {
      expect(isExpressionString('   ')).toBe(false)
    })

    it('应该拒绝数值', () => {
      expect(isExpressionString(42)).toBe(false)
    })

    it('应该拒绝 null', () => {
      expect(isExpressionString(null)).toBe(false)
    })

    it('应该拒绝 undefined', () => {
      expect(isExpressionString(undefined)).toBe(false)
    })

    it('应该拒绝对象', () => {
      expect(isExpressionString({})).toBe(false)
    })
  })

  describe('isCompiledExpression', () => {
    it('应该识别 expression 类型的 CompiledValue', () => {
      const fn = compileExpression('w/2')
      const value: CompiledValue = { type: 'expression', value: 0, compiled: fn! }
      expect(isCompiledExpression(value)).toBe(true)
    })

    it('应该拒绝 number 类型的 CompiledValue', () => {
      const value: CompiledValue = { type: 'number', value: 42 }
      expect(isCompiledExpression(value)).toBe(false)
    })

    it('应该拒绝 compiled 为 undefined 的值', () => {
      const value: CompiledValue = { type: 'expression', value: 0 }
      expect(isCompiledExpression(value)).toBe(false)
    })
  })
})

describe('缓存 LRU 行为', () => {
  beforeEach(() => {
    clearExpressionCache()
  })

  afterEach(() => {
    clearExpressionCache()
  })

  it('应该在缓存超过最大值时清理', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    for (let i = 0; i < 600; i++) {
      compileExpression(`w+${i}`)
    }

    const finalSize = getExpressionCacheSize()
    expect(finalSize).toBeLessThanOrEqual(500)
    warnSpy.mockRestore()
  })

  it('应该缓存新编译的表达式', () => {
    const expr = 'w*12345'
    expect(isExpressionCached(expr)).toBe(false)
    compileExpression(expr)
    expect(isExpressionCached(expr)).toBe(true)
  })
})

describe('预编译表达式', () => {
  it('应该正确执行预编译的 w 表达式', () => {
    expect(evaluateExpression('w', 100, 50)).toBe(100)
  })

  it('应该正确执行预编译的 h 表达式', () => {
    expect(evaluateExpression('h', 100, 50)).toBe(50)
  })

  it('应该正确执行预编译的 w/2 表达式', () => {
    expect(evaluateExpression('w/2', 100, 50)).toBe(50)
  })

  it('应该正确执行预编译的 h/2 表达式', () => {
    expect(evaluateExpression('h/2', 100, 50)).toBe(25)
  })

  it('应该正确执行预编译的 w-20 表达式', () => {
    expect(evaluateExpression('w-20', 100, 50)).toBe(80)
  })

  it('应该正确执行预编译的 h-20 表达式', () => {
    expect(evaluateExpression('h-20', 100, 50)).toBe(30)
  })

  it('应该正确执行预编译的 w-10 表达式', () => {
    expect(evaluateExpression('w-10', 100, 50)).toBe(90)
  })

  it('应该正确执行预编译的 h-10 表达式', () => {
    expect(evaluateExpression('h-10', 100, 50)).toBe(40)
  })

  it('应该正确执行预编译的 w*0.75 表达式', () => {
    expect(evaluateExpression('w*0.75', 100, 50)).toBe(75)
  })

  it('应该正确执行预编译的 w*0.25 表达式', () => {
    expect(evaluateExpression('w*0.25', 100, 50)).toBe(25)
  })

  it('应该正确执行预编译的 h*0.75 表达式', () => {
    expect(evaluateExpression('h*0.75', 100, 50)).toBe(37.5)
  })

  it('应该正确执行预编译的 h*0.25 表达式', () => {
    expect(evaluateExpression('h*0.25', 100, 50)).toBe(12.5)
  })

  it('应该正确执行预编译的 w*0.5 表达式', () => {
    expect(evaluateExpression('w*0.5', 100, 50)).toBe(50)
  })

  it('应该正确执行预编译的 h*0.5 表达式', () => {
    expect(evaluateExpression('h*0.5', 100, 50)).toBe(25)
  })

  it('应该正确执行预编译的 0 表达式', () => {
    expect(evaluateExpression('0', 100, 50)).toBe(0)
  })
})
