import { ensureArray, isObject, shallowEqual, type MaybeArray } from '@diagen/shared'
import { createStore, unwrap, type StoreSetter } from 'solid-js/store'
import { unwrapClone } from '../../../_internal'
import type { ElementManager } from '../element'
import type { HistoryManager } from '../history'
import type { SelectionManager } from '../selection'
import { ViewManager } from '../view'

export interface EditDeps {
  element: ElementManager
  selection: SelectionManager
  history: HistoryManager
  view: ViewManager
}

export interface EditOptions {
  /**
   * @default true
   */
  record?: boolean
}

export interface EditCreateOptions extends EditOptions {
  /**
   * 新增后是否替换为当前新增元素选区。
   * @default true
   */
  select?: boolean
  /**
   * 内部优化：调用方已提供稳定快照时，可跳过命令创建阶段的额外 clone。
   */
  assumeCloned?: boolean
}

export interface ChangeEntry<T> {
  id: string
  before: T
  after: T
}

export type LayerAction = 'toFront' | 'toBack' | 'moveForward' | 'moveBackward'

export function isEditOptions(value: unknown): value is EditOptions {
  return isObject(value) && 'record' in value
}

export function normalizeIds(id: MaybeArray<string>): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const current of ensureArray(id)) {
    if (seen.has(current)) continue
    seen.add(current)
    result.push(current)
  }

  return result
}

export function takeEditOptions(args: unknown[]): EditOptions {
  const lastArg = args[args.length - 1]
  if (!isEditOptions(lastArg)) return {}
  args.pop()
  return lastArg
}

export function hasChanged(prev: unknown, next: unknown): boolean {
  const prevSnapshot = unwrap(prev as never)
  const nextSnapshot = unwrap(next as never)

  if (shallowEqual(prevSnapshot, nextSnapshot)) return false

  try {
    return JSON.stringify(prevSnapshot) !== JSON.stringify(nextSnapshot)
  } catch {
    return true
  }
}

/**
 * 兼容 value/setter/produce 三类写法，且不会污染原始 state。
 */
export function resolveSetter<T>(prev: T, setter: StoreSetter<T, any>): T {
  if (typeof setter !== 'function') return setter as T

  const [draft] = createStore<{ value: T }>({
    value: unwrapClone(prev),
  })
  const maybeNext = (setter as (value: T) => T | void)(draft.value)

  return (maybeNext === undefined ? unwrapClone(draft.value) : maybeNext) as T
}
