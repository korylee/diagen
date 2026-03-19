export const isObject = (v: any): v is object => v !== null && typeof v === 'object'

export const toTypeString = (val: unknown) => Object.prototype.toString.call(val)

export const isPlainObject = (v: any): v is Record<string, any> => isObject(v) && toTypeString(v) === '[object Object]'

export const isNil = (v: unknown) => v == null

export const isFunction = (val: unknown): val is Function => typeof val === 'function'

export const isArray: <T = any>(val: unknown) => val is T[] = Array.isArray

export const isString = (val: unknown): val is string => typeof val === 'string'
