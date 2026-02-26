export const ensureArray = <T>(
  value: T,
): T extends any[] ? T : T extends null | undefined ? never[] : [NonNullable<T>] =>
  (Array.isArray(value) ? value : value == null ? [] : [value]) as any
