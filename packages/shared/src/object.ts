import { isObject, isPlainObject } from './is'

export function deepClone<T>(obj: T, cache = new WeakMap<object, any>()): T {
  // 1. 基础类型直接返回
  if (obj === null || typeof obj !== 'object') return obj

  // 2. 循环引用检查
  if (cache.has(obj as object)) return cache.get(obj as object)

  // 3. 特殊对象实例化
  if (obj instanceof Date) return new Date(obj) as unknown as T
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags) as unknown as T
  if (obj instanceof Map) {
    const cloned = new Map()
    cache.set(obj as object, cloned)
    obj.forEach((v, k) => cloned.set(deepClone(k, cache), deepClone(v, cache)))
    return cloned as unknown as T
  }
  if (obj instanceof Set) {
    const cloned = new Set()
    cache.set(obj as object, cloned)
    obj.forEach(v => cloned.add(deepClone(v, cache)))
    return cloned as unknown as T
  }
  // 简化：二进制数据直接利用构造函数复制
  if (ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer) {
    return new (obj.constructor as any)(obj) as T
  }

  // 4. 普通对象/数组
  const cloned = Object.create(Object.getPrototypeOf(obj))
  cache.set(obj as object, cloned) // 注意：需在递归前缓存

  // 5. 复制所有属性（统一逻辑）
  Reflect.ownKeys(obj).forEach(key => {
    const desc = Object.getOwnPropertyDescriptor(obj, key)!
    // 如果是数据属性，递归克隆；如果是访问器属性，直接复用描述符
    if ('value' in desc) desc.value = deepClone(desc.value, cache)
    Object.defineProperty(cloned, key, desc)
  })

  return cloned
}

export function deepMerge<T extends object, S extends object>(
  target: T,
  source: S,
  cache = new WeakMap<object, object>(),
): T & S {
  // 类型守卫
  if (!isObject(target) || !isObject(source)) return source as T & S

  // 循环引用检测
  if (cache.has(source)) return cache.get(source) as T & S

  // 创建结果对象（保持原型链）
  const result: any = Array.isArray(source) ? [] : Object.create(Object.getPrototypeOf(target))

  cache.set(source, result)

  // 合并 source 属性（优先）
  Reflect.ownKeys(source).forEach(key => {
    // 原型污染防护
    if (key === '__proto__' || key === 'constructor') return

    const srcVal = (source as any)[key]
    const tgtVal = (target as any)[key]

    // 仅当双方都是纯对象时递归合并，否则取 source 值（克隆）
    result[key] =
      isPlainObject(srcVal) && isPlainObject(tgtVal)
        ? deepMerge(tgtVal, srcVal, cache)
        : isObject(srcVal)
          ? deepClone(srcVal, cache)
          : srcVal
  })

  // 补充 target 独有的属性（克隆）
  Reflect.ownKeys(target).forEach(key => {
    if (!(key in result)) {
      const val = (target as any)[key]
      result[key] = isObject(val) ? deepClone(val, cache) : val
    }
  })

  return result
}

/**
 * Pick properties from object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * Omit properties from object
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

export function get<T extends object, K extends keyof T>(obj: T, path: K): T[K] | undefined {
  const keys = (path as string).split('.')
  let result = obj as T[K]

  for (const key of keys) {
    if (result == null) {
      break
    }
    result = (result as any)[key]
  }

  return result
}

/**
 * Set nested property value
 */
export function set<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.')
  const lastKey = keys.pop()!

  let current: Record<string, unknown> = obj

  for (const key of keys) {
    if (!(key in current) || !isObject(current[key])) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  current[lastKey] = value
  return obj
}

export const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

/**
 * 1. 基本类型/同引用：使用 Object.is（兼容 NaN）
 * 2. 对象类型：比较第一层属性的数量和值
 */
export function shallowEqual(objA: unknown, objB: unknown): boolean {
  // 1. 严格相等或同为 NaN
  if (Object.is(objA, objB)) {
    return true
  }

  // 2. 如果其中一方不是对象（处理 null，因为 typeof null === 'object'），则返回 false
  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false
  }

  // 3. 比较第一层键的数量和值
  const keysA = keys(objA)
  const keysB = keys(objB)

  // 键数量不同，直接返回 false
  if (keysA.length !== keysB.length) {
    return false
  }

  // 4. 遍历检查 key 是否存在且值相等
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i]
    if (
      !hasOwn(objB, key) || // 检查 key 是否存在
      !Object.is(objA[key], objB[key]) // 检查值是否相等
    ) {
      return false
    }
  }

  return true
}

export const keys = <T extends object>(obj: T) => Object.keys(obj) as (keyof T)[]
