export const isObject = (v: any): v is object => v !== null && typeof v === 'object'

export const toTypeString = (val: unknown) => Object.prototype.toString.call(val)

export const isPlainObject = (v: any): boolean => isObject(v) && toTypeString(v) === '[object Object]'

export const isNil = (v: unknown) => v == null

export const isFunction = (val: unknown): val is Function => typeof val === 'function'
