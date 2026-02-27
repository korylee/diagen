export const isObject = (v: any): v is object => v !== null && typeof v === 'object'

export const isType = <T = any>(val: unknown, key: string): val is T =>
  Object.prototype.toString.call(val) === `[object ${key}]`

export const isPlainObject = (v: any): boolean => isObject(v) && isType<object>(v, 'Object')

export const isNil = (v: unknown) => v == null