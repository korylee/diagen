/**
 * Expression Compiler and Evaluator
 * 用于编译和求值相对坐标表达式（如 'w/2', 'h-20'）
 *
 * 核心功能：
 * - 编译表达式字符串为可复用的函数
 * - 缓存编译结果提升性能
 * - 安全验证表达式格式
 *
 * 设计原则：
 * - 表达式只支持 w（宽度）和 h（高度）两个变量
 * - 所有编译结果会被缓存以提升性能
 * - 安全验证防止注入攻击
 */

// ============ 类型定义 ============

/** 编译后的表达式函数类型 */
export type CompiledExpression = (w: number, h: number) => number

/** 编译后的值类型 */
export interface CompiledValue {
  type: 'number' | 'expression'
  value: number
  compiled?: CompiledExpression
}

// ============ 配置常量 ============

/** 支持的变量名 */
const ALLOWED_VARS = ['w', 'h']

/** 最大表达式长度（防止恶意输入） */
const MAX_EXPRESSION_LENGTH = 100

/** 最大缓存大小 */
const MAX_CACHE_SIZE = 500

/** 有效的表达式字符：字母、数字、空格、运算符、括号、小数点 */
const VALID_EXPRESSION_REGEX = /^[-+*/\w\s().]+$/

/** 变量匹配正则 */
const VAR_PATTERN = /\b([a-zA-Z_]\w*)\b/g

// ============ 缓存管理 ============

/** 表达式缓存 */
const expressionCache = new Map<string, CompiledExpression>()

/** 预编译常用表达式 */
const PRECOMPILED_EXPRESSIONS: Record<string, CompiledExpression> = {
  '0': () => 0,
  'w': (w) => w,
  'h': (w, h) => h,
  'w/2': (w) => w / 2,
  'h/2': (w, h) => h / 2,
  'w-20': (w) => w - 20,
  'h-20': (w, h) => h - 20,
  'w-10': (w) => w - 10,
  'h-10': (w, h) => h - 10,
  'w*0.75': (w) => w * 0.75,
  'w*0.25': (w) => w * 0.25,
  'h*0.75': (w, h) => h * 0.75,
  'h*0.25': (w, h) => h * 0.25,
  'w*0.5': (w) => w * 0.5,
  'h*0.5': (w, h) => h * 0.5,
}

// 初始化预编译表达式到缓存
Object.entries(PRECOMPILED_EXPRESSIONS).forEach(([expr, fn]) => {
  expressionCache.set(expr, fn)
})

/**
 * 检查并清理缓存（LRU 策略简化版）
 */
function ensureCacheSize(): void {
  if (expressionCache.size > MAX_CACHE_SIZE) {
    // 删除最早的一半缓存
    const keys = Array.from(expressionCache.keys())
    const deleteCount = Math.floor(keys.length / 2)
    for (let i = 0; i < deleteCount; i++) {
      expressionCache.delete(keys[i])
    }
  }
}

// ============ 核心编译函数 ============

/**
 * 编译表达式字符串
 * @param expr 表达式字符串，如 'w/2', 'h-20', 'w*0.75'
 * @returns 编译后的函数，编译失败返回 null
 *
 * @example
 * const fn = compileExpression('w/2')
 * const result = fn(100, 50) // 返回 50
 */
export function compileExpression(expr: string): CompiledExpression | null {
  // 空表达式返回 0
  if (!expr || expr.trim() === '') {
    return () => 0
  }

  // 去除空白
  const trimmedExpr = expr.trim()

  // 检查缓存
  const cached = expressionCache.get(trimmedExpr)
  if (cached) return cached

  // 长度检查
  if (trimmedExpr.length > MAX_EXPRESSION_LENGTH) {
    console.warn(`[Expression] Expression too long: ${trimmedExpr.length} > ${MAX_EXPRESSION_LENGTH}`)
    return null
  }

  // 验证表达式格式
  if (!VALID_EXPRESSION_REGEX.test(trimmedExpr)) {
    console.warn(`[Expression] Invalid characters in expression: ${trimmedExpr}`)
    return null
  }

  // 安全检查：确保只使用允许的变量
  let hasInvalidVar = false
  let match: RegExpExecArray | null
  // 重置正则的 lastIndex
  VAR_PATTERN.lastIndex = 0
  while ((match = VAR_PATTERN.exec(trimmedExpr)) !== null) {
    if (!ALLOWED_VARS.includes(match[1])) {
      console.warn(`[Expression] Unknown variable "${match[1]}" in expression: ${trimmedExpr}`)
      hasInvalidVar = true
      break
    }
  }

  if (hasInvalidVar) return null

  try {
    // 编译表达式为函数
    const fn = new Function('w', 'h', `"use strict"; return (${trimmedExpr})`) as CompiledExpression

    // 测试编译结果
    const testResult = fn(100, 100)
    if (typeof testResult !== 'number' || isNaN(testResult)) {
      console.warn(`[Expression] Expression did not return a valid number: ${trimmedExpr}`)
      return null
    }

    // 确保缓存大小
    ensureCacheSize()

    // 缓存并返回
    expressionCache.set(trimmedExpr, fn)
    return fn
  } catch (e) {
    console.warn(`[Expression] Failed to compile: ${trimmedExpr}`, e)
    return null
  }
}

// ============ 执行函数 ============

/**
 * 执行已编译的表达式
 * @param compiled 已编译的表达式函数
 * @param w 宽度值
 * @param h 高度值
 * @param defaultValue 执行失败时的默认值
 * @returns 计算结果
 */
export function evaluateCompiled(
  compiled: CompiledExpression | null | undefined,
  w: number,
  h: number,
  defaultValue: number = 0
): number {
  if (!compiled) return defaultValue

  try {
    const result = compiled(w, h)
    // 检查结果有效性
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      return defaultValue
    }
    return result
  } catch {
    return defaultValue
  }
}

/**
 * 编译并执行表达式（便捷方法）
 * @param expr 表达式字符串或数值
 * @param w 宽度值
 * @param h 高度值
 * @param defaultValue 默认值
 * @returns 计算结果
 *
 * @example
 * evaluateExpression('w/2', 100, 50) // 返回 50
 * evaluateExpression(30, 100, 50)     // 返回 30（数值直接返回）
 */
export function evaluateExpression(
  expr: number | string,
  w: number,
  h: number,
  defaultValue: number = 0
): number {
  // 数值直接返回
  if (typeof expr === 'number') return expr

  // 编译并执行
  const compiled = compileExpression(expr)
  return evaluateCompiled(compiled, w, h, defaultValue)
}

// ============ 批量编译支持 ============

/**
 * 批量编译表达式
 * @param expressions 表达式数组
 * @returns 编译结果数组（失败的为 null）
 */
export function compileExpressions(expressions: string[]): (CompiledExpression | null)[] {
  return expressions.map(expr => compileExpression(expr))
}

/**
 * 批量执行表达式
 * @param expressions 表达式数组
 * @param w 宽度值
 * @param h 高度值
 * @param defaultValue 默认值
 * @returns 计算结果数组
 */
export function evaluateExpressions(
  expressions: (string | number)[],
  w: number,
  h: number,
  defaultValue: number = 0
): number[] {
  return expressions.map(expr => evaluateExpression(expr, w, h, defaultValue))
}

// ============ 值编译 ============

/**
 * 编译值为 CompiledValue 结构（用于需要多次执行的场景）
 * @param val 数值或表达式字符串
 * @returns CompiledValue 对象
 *
 * @example
 * const compiled = compileValue('w/2')
 * // 后续可以多次执行
 * evaluateCompiledValue(compiled, 100, 50) // 50
 * evaluateCompiledValue(compiled, 200, 100) // 100
 */
export function compileValue(val: number | string): CompiledValue {
  if (typeof val === 'number') {
    return { type: 'number', value: val }
  }

  const compiled = compileExpression(val)
  if (!compiled) {
    // 编译失败，返回默认值
    return { type: 'number', value: 0 }
  }

  return {
    type: 'expression',
    value: 0,
    compiled,
  }
}

/**
 * 执行 CompiledValue
 * @param compiled 已编译的值
 * @param w 宽度值
 * @param h 高度值
 * @returns 计算结果
 */
export function evaluateCompiledValue(compiled: CompiledValue, w: number, h: number): number {
  if (compiled.type === 'number') {
    return compiled.value
  }
  return evaluateCompiled(compiled.compiled, w, h, 0)
}

// ============ 坐标解析 ============

/**
 * 解析点坐标
 * @param x x 坐标表达式
 * @param y y 坐标表达式
 * @param w 宽度值
 * @param h 高度值
 * @returns 解析后的坐标点
 */
export function resolvePoint(
  x: number | string,
  y: number | string,
  w: number,
  h: number
): { x: number; y: number } {
  return {
    x: evaluateExpression(x, w, h, 0),
    y: evaluateExpression(y, w, h, 0),
  }
}

/**
 * 批量解析点坐标
 * @param points 点数组
 * @param w 宽度值
 * @param h 高度值
 * @returns 解析后的坐标点数组
 */
export function resolvePoints(
  points: Array<{ x: number | string; y: number | string }>,
  w: number,
  h: number
): Array<{ x: number; y: number }> {
  return points.map(p => resolvePoint(p.x, p.y, w, h))
}

// ============ 缓存管理 API ============

/** 清空表达式缓存 */
export function clearExpressionCache(): void {
  expressionCache.clear()
  // 重新初始化预编译表达式
  Object.entries(PRECOMPILED_EXPRESSIONS).forEach(([expr, fn]) => {
    expressionCache.set(expr, fn)
  })
}

/** 获取缓存大小 */
export function getExpressionCacheSize(): number {
  return expressionCache.size
}

/** 获取缓存统计信息 */
export function getExpressionCacheStats(): {
  size: number
  maxSize: number
  entries: string[]
  hitRate?: number
} {
  return {
    size: expressionCache.size,
    maxSize: MAX_CACHE_SIZE,
    entries: Array.from(expressionCache.keys()),
  }
}

/** 检查表达式是否已缓存 */
export function isExpressionCached(expr: string): boolean {
  return expressionCache.has(expr.trim())
}

// ============ 类型守卫 ============

/** 检查值是否为表达式字符串 */
export function isExpressionString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/** 检查 CompiledValue 是否为表达式类型 */
export function isCompiledExpression(value: CompiledValue): value is CompiledValue & { type: 'expression' } {
  return value.type === 'expression' && value.compiled !== undefined
}
