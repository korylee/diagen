import { AnyFn, PromisifyFn, debounce, DebounceOptions } from '@diagen/shared'
import { access, MaybeAccessor, tryOnCleanup } from '../helper'
import { isServer } from 'solid-js/web'

export function createDebounce<T extends AnyFn>(
  fn: T,
  ms: MaybeAccessor<number> = 200,
  options: DebounceOptions = {},
): PromisifyFn<T> {
  if (isServer) {
    return Object.assign(() => Promise.resolve() as Promise<Awaited<ReturnType<T>>>, { clear: () => void 0 })
  }

  const debounced = debounce(fn, access(ms), options)
  tryOnCleanup(() => debounced.clear())
  return debounced
}
