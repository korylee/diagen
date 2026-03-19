export type PartialRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type AnyFn = (...args: any[]) => any

export type MaybeArray<T> = T | T[]

export type MaybePromise<T> = T | Promise<T>

export type Awaited<T> = T extends null | undefined
  ? T
  : T extends object & { then: (onfulfilled: infer F, ...args: infer _) => any }
    ? F extends (value: infer V, ...args: infer _) => any
      ? Awaited<V>
      : never
    : T

export type Promisify<T> = Promise<Awaited<T>>

export type PromisifyFn<T extends AnyFn> = (...args: Parameters<T>) => Promisify<ReturnType<T>>

export type KeyOf<T> = number extends keyof T
  ? 0 extends 1 & T
    ? keyof T
    : [T] extends [never]
      ? never
      : [T] extends [readonly unknown[]]
        ? number
        : keyof T
  : keyof T

export type UnionKeyOf<U> = U extends unknown ? KeyOf<U> : never

export type UnionValue<U, K extends UnionKeyOf<U>> = U extends unknown ? (K extends KeyOf<U> ? U[K] : never) : never

export type UnionNestedKeyOf<U, K extends UnionKeyOf<U>> = KeyOf<NonNullable<UnionValue<U, K>>>

export type UnionNestedValue<U, K extends UnionKeyOf<U>, NK extends UnionNestedKeyOf<U, K>> = NonNullable<
  UnionValue<U, K>
>[NK]

export type ValueOf<T> = T[KeyOf<T>]

export type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
}

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
