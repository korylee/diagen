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