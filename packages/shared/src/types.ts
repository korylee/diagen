export type PartialRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

export type MaybeArray<T> = T extends any[] ? T : T[]

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
