import { Accessor, getOwner, onCleanup } from 'solid-js'
import { isDev, isServer } from 'solid-js/web'
import { isFunction } from '@diagen/shared'

export type MaybeAccessor<T = any> = Accessor<T> | T

export type MaybeAccessorValue<T extends MaybeAccessor<any>> = T extends () => any ? ReturnType<T> : T

export type MaybeElement = HTMLElement | SVGElement | undefined | null

export const access = <T extends MaybeAccessor<any>>(v: T): MaybeAccessorValue<T> =>
  isFunction(v) && !v.length ? v() : (v as any)

/**
 * 不在组件内运行时会报错
 * */
export const tryOnCleanup: typeof onCleanup = isDev ? fn => (getOwner() ? onCleanup(fn) : fn) : onCleanup
