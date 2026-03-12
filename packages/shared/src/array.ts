export function ensureArray<T>(value: null | undefined[]): []
export function ensureArray<T>(value: T | T[]): T[]
export function ensureArray<T>(value: T | readonly T[]): readonly T[]
export function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : value == null ? [] : [value]
}
