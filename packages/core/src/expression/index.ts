import { clamp, createLRU, type Axis, type Point } from '@diagen/shared'
import { evaluateExpressionAst, parseExpressionAst } from './parse'

// ============ 类型定义 ============

type CompiledContext = Record<string, number>

type Expression = number | string

/** 编译后的表达式函数类型 */
export type CompiledExpression = <Context extends CompiledContext>(context: Context) => number

const BUILTIN_FUNCTIONS = {
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
  clamp: clamp,
} as const

type ExpressionFunction = (...args: number[]) => number

export interface ExpressionOptions {
  functions?: Record<string, ExpressionFunction>
}

/** 编译后的值类型 */
export interface CompiledValue {
  type: 'number' | 'expression'
  value: number
  compiled?: CompiledExpression
}

// ============ 配置常量 ============

/** 最大表达式长度（防止恶意输入） */
const MAX_EXPRESSION_LENGTH = 100

/** 最大缓存大小 */
const MAX_CACHE_SIZE = 500

/** 有效的表达式字符：字母、数字、空格、运算符、括号、小数点、逗号 */
const VALID_EXPRESSION_REGEX = /^[-+*/\w\s().,]+$/

// ============ 缓存管理 ============

/** 预编译常用表达式 */
const PRECOMPILED_EXPRESSIONS: Record<string, CompiledExpression> = {
  '0': () => 0,
  w: ctx => ctx.w,
  h: ctx => ctx.h,
  'w/2': ctx => ctx.w / 2,
  'h/2': ctx => ctx.h / 2,
  'w-20': ctx => ctx.w - 20,
  'h-20': ctx => ctx.h - 20,
  'w-10': ctx => ctx.w - 10,
  'h-10': ctx => ctx.h - 10,
  'w*0.75': ctx => ctx.w * 0.75,
  'w*0.25': ctx => ctx.w * 0.25,
  'h*0.75': ctx => ctx.h * 0.75,
  'h*0.25': ctx => ctx.h * 0.25,
  'w*0.5': ctx => ctx.w * 0.5,
  'h*0.5': ctx => ctx.h * 0.5,
}

/** 表达式缓存 */
const expressionCache = (() => {
  const cache = createLRU<string, CompiledExpression>(MAX_CACHE_SIZE, new Map(Object.entries(PRECOMPILED_EXPRESSIONS)))

  return {
    ...cache,
    clear(): void {
      expressionCache.clear()
      // 重新初始化预编译表达式
      Object.entries(PRECOMPILED_EXPRESSIONS).forEach(([expr, fn]) => {
        cache.put(expr, fn)
      })
    },
    size(): number {
      return cache.size
    },
    stats(): { size: number; maxSize: number; entries: string[] } {
      return {
        size: cache.size,
        maxSize: MAX_CACHE_SIZE,
        entries: Array.from(cache.keys()),
      }
    },
    has(expr: string): boolean {
      return cache.has(expr.trim())
    },
  }
})()

const isValidNumber = (value: unknown): value is number => typeof value === 'number' && !isNaN(value) && isFinite(value)

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
export function compileExpression<K extends string>(
  expr: string,
  options: ExpressionOptions = {},
): CompiledExpression | null {
  // 去除空白
  const trimmedExpr = (expr && expr.trim()) || '0'

  // 检查缓存
  const cached = expressionCache.get(trimmedExpr)
  if (cached) {
    return cached
  }

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

  const allowedFunctionMap: Record<string, ExpressionFunction> = {
    ...BUILTIN_FUNCTIONS,
    ...(options.functions || {}),
  }

  try {
    const ast = parseExpressionAst(trimmedExpr)
    const fn: CompiledExpression = ctx =>
      evaluateExpressionAst(ast, {
        getVar: name => {
          const value = ctx[name]
          if (!isValidNumber(value)) {
            throw new Error(`Variable "${name}" is not a valid number`)
          }
          return value
        },
        callFunction: (name, args) => {
          const fn = allowedFunctionMap[name]
          if (!fn) throw new Error(`Unknown function "${name}"`)
          return fn(...args)
        },
      })

    // 测试编译结果
    const testResult = fn({ w: 100, h: 100 })
    if (!isValidNumber(testResult)) {
      console.warn(`[Expression] Expression did not return a valid number: ${trimmedExpr}`)
      return null
    }

    // 缓存并返回
    expressionCache.put(trimmedExpr, fn)

    return fn
  } catch (e) {
    if (e instanceof Error) {
      console.warn(`[Expression] ${e.message} in expression: ${trimmedExpr}`)
      return null
    }
    console.warn(`[Expression] Failed to compile: ${trimmedExpr}`, e)
    return null
  }
}

// ============ 执行函数 ============

/**
 * 执行已编译的表达式
 */
export function evaluateCompiled<Context extends CompiledContext>(
  compiled: CompiledExpression | null | undefined,
  ctx: Context,
  defaultValue: number = 0,
): number {
  if (!compiled) return defaultValue

  try {
    const result = compiled(ctx)
    // 检查结果有效性
    if (!isValidNumber(result)) {
      return defaultValue
    }
    return result
  } catch {
    return defaultValue
  }
}

/**
 * 编译并执行表达式（便捷方法）
 */
export function evaluateExpression<Context extends CompiledContext>(
  expr: Expression,
  ctx: Context,
  options?: ExpressionOptions & { defaultValue?: number },
): number {
  if (typeof expr === 'number') return expr
  const compiled = compileExpression(expr, options)
  return evaluateCompiled(compiled, ctx, options?.defaultValue)
}

// ============ 坐标解析 ============

/**
 * 解析点坐标
 */
export function evaluatePoint<Context extends CompiledContext>(
  point: Record<Axis, Expression>,
  ctx: Context,
  options?: ExpressionOptions & { defaultValue?: number },
): Point {
  return {
    x: evaluateExpression(point.x, ctx, options),
    y: evaluateExpression(point.y, ctx, options),
  }
}
