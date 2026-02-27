import { ConfigurableWindow, defaultWindow } from '../_configurable'
import { access, MaybeAccessor, MaybeElement, tryOnCleanup } from '../_shared'
import { Accessor, createEffect, createMemo, createRoot, createSignal, onCleanup } from 'solid-js'
import { ensureArray, isNil } from '@diagen/shared'

export interface CreateIntersectionObserverOptions<Controls extends boolean = false> extends ConfigurableWindow {
  /**
   * @default true
   */
  immediate?: boolean

  root?: MaybeAccessor<MaybeElement> | Document

  rootMargin?: MaybeAccessor<string>

  /**
   * @default 0
   */
  threshold?: number | number[]

  controls?: Controls
}

export type CreateIntersectionObserverReturn<Controls extends boolean = false> = Controls extends false
  ? undefined
  : {
      stop: VoidFunction
      isSupported: Accessor<boolean>
      isActive: Accessor<boolean>
    }

export function createIntersectionObserver<T extends CreateIntersectionObserverOptions>(
  target: MaybeAccessor<MaybeElement> | MaybeAccessor<MaybeElement[]> | MaybeElement[],
  callback: IntersectionObserverCallback,
  options?: T,
): undefined
export function createIntersectionObserver<T extends CreateIntersectionObserverOptions<true>>(
  target: MaybeAccessor<MaybeElement> | MaybeAccessor<MaybeElement[]> | MaybeElement[],
  callback: IntersectionObserverCallback,
  options: T,
): {
  stop: VoidFunction
  isSupported: Accessor<boolean>
  isActive: Accessor<boolean>
}
export function createIntersectionObserver(
  target: MaybeAccessor<MaybeElement> | MaybeAccessor<MaybeElement[]> | MaybeElement[],
  callback: IntersectionObserverCallback,
  options: CreateIntersectionObserverOptions<boolean> = {},
) {
  const { window = defaultWindow, root, threshold = 0, immediate = true, rootMargin, controls = false } = options

  const isSupported = createMemo(() => !!window && 'IntersectionObserver' in window)
  const targets = createMemo(() => {
    const t = access(target)
    return ensureArray(t)
      .map(v => access(v))
      .filter(v => !isNil(v))
  })

  const [isActive, setIsAction] = createSignal(immediate)

  const attach = () => {
    if (!isSupported() || !isActive()) return

    const observer = new IntersectionObserver(callback, {
      root: access(root),
      rootMargin: access(rootMargin),
      threshold,
    })

    targets().forEach(el => el && observer.observe(el))
    onCleanup(() => {
      observer.disconnect()
    })
  }

  if (controls) {
    const dispose = createRoot(dispose => {
      createEffect(attach)
      return dispose
    })

    const stop = () => {
      dispose()
      setIsAction(false)
    }

    tryOnCleanup(stop)

    return {
      isSupported,
      isActive,
      stop,
    }
  }

  createEffect(attach)
}
