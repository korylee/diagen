import {
  deepClone,
  ensureArray,
  isObject,
  keys,
  MaybeArray,
  shallowEqual,
  UnionKeyOf,
  UnionNestedKeyOf,
  UnionNestedValue,
  UnionValue,
} from '@diagen/shared'
import { batch } from 'solid-js'
import { createStore, unwrap, type StoreSetter } from 'solid-js/store'
import type { DiagramElement } from '../../model'
import type { CreateMethods, ElementManager } from './element'
import { type Command, createCommand, type HistoryManager } from './history'
import { type SelectionManager } from './selection'
import type { DesignerContext } from './types'

interface EditDeps {
  element: ElementManager
  selection: SelectionManager
  history: HistoryManager
}

export interface EditOptions {
  /**
   * @default true
   */
  record?: boolean
}

type ChangeEntry<T> = {
  id: string
  before: T
  after: T
}

function isEditOptions(value: unknown): value is EditOptions {
  return isObject(value) && 'record' in value
}

function normalizeIds(id: MaybeArray<string>): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const current of ensureArray(id)) {
    if (seen.has(current)) continue
    seen.add(current)
    result.push(current)
  }
  return result
}

function takeEditOptions(args: unknown[]): EditOptions {
  const lastArg = args[args.length - 1]
  if (!isEditOptions(lastArg)) return {}
  args.pop()
  return lastArg
}

function hasChanged(prev: unknown, next: unknown): boolean {
  const prevSnapshot = unwrap(prev as any)
  const nextSnapshot = unwrap(next as any)

  if (shallowEqual(prevSnapshot, nextSnapshot)) return false

  try {
    return JSON.stringify(prevSnapshot) !== JSON.stringify(nextSnapshot)
  } catch {
    return true
  }
}

function snapshotValue<T>(value: T): T {
  return deepClone(unwrap(value))
}

/**
 * 兼容 value/setter/produce 三类写法，且不会污染原始 state。
 */
function resolveSetter<T>(prev: T, setter: StoreSetter<T, any>): T {
  if (typeof setter !== 'function') return setter as T
  const [draft] = createStore<{ value: T }>({
    value: snapshotValue(prev),
  })
  const maybeNext = (setter as (value: T) => T | void)(draft.value)
  return (maybeNext === undefined ? snapshotValue(draft.value) : maybeNext) as T
}

function createChangeCommand<T>(name: string, entries: ChangeEntry<T>[], apply: (id: string, value: T) => void) {
  return createCommand({
    isNoOp: entries.length === 0,
    name,
    execute() {
      batch(() => {
        for (const entry of entries) {
          apply(entry.id, entry.after)
        }
      })
    },
    undo() {
      batch(() => {
        for (const entry of entries) {
          apply(entry.id, entry.before)
        }
      })
    },
  })
}

function createPatchChangeEntries(ids: string[], patch: Partial<DiagramElement>, deps: EditDeps): ChangeEntry<Partial<DiagramElement>>[] {
  const patchKeys = keys(patch)
  if (patchKeys.length === 0) return []

  const entries: ChangeEntry<Partial<DiagramElement>>[] = []

  for (const id of ids) {
    const el = deps.element.getElementById(id)
    if (!el) continue

    const before: Partial<DiagramElement> = {}
    const after: Partial<DiagramElement> = {}
    let changed = false

    for (const key of patchKeys) {
      const prevValue = el[key]
      const nextValue = patch[key]
      if (Object.is(prevValue, nextValue)) continue
      changed = true
      ;(before as any)[key] = snapshotValue(prevValue)
      ;(after as any)[key] = snapshotValue(nextValue)
    }

    if (!changed) continue
    entries.push({ id, before, after })
  }

  return entries
}

function createSetterChangeEntries<T>(
  ids: string[],
  readValue: (el: DiagramElement) => T,
  setter: StoreSetter<T, any>,
  deps: EditDeps,
): ChangeEntry<T>[] {
  const entries: ChangeEntry<T>[] = []
  for (const id of ids) {
    const el = deps.element.getElementById(id)
    if (!el) continue

    const prev = readValue(el)
    const next = resolveSetter(prev, setter)
    if (!hasChanged(prev, next)) continue

    entries.push({
      id,
      before: snapshotValue(prev),
      after: snapshotValue(next),
    })
  }
  return entries
}

function createSetterChangeCommand<T>(params: {
  name: string
  ids: string[]
  readValue: (el: DiagramElement) => T
  setter: StoreSetter<T, any>
  apply:  (id: string, value: T) => void
  deps: EditDeps
}) {
  const { name, ids, readValue, setter, apply, deps } = params
  const entries = createSetterChangeEntries(ids, readValue, setter, deps)
  return createChangeCommand(name, entries, apply)
}

function createNestedUpdateCommand<
  K1 extends UnionKeyOf<DiagramElement>,
  K2 extends UnionNestedKeyOf<DiagramElement, K1>,
>(
  ids: string[],
  k1: K1,
  k2: K2,
  setter: StoreSetter<UnionNestedValue<DiagramElement, K1, K2>, [K2, K1]>,
  deps: EditDeps,
) {
  return createSetterChangeCommand({
    name: 'update_els_by_nested_path',
    ids,
    readValue: el => ((el as any)[k1] as any)?.[k2] as UnionNestedValue<DiagramElement, K1, K2>,
    setter,
    apply: (id, value) => {
      deps.element.update(id, k1 as any, k2 as any, value as any)
    },
    deps,
  })
}

function createUpdateCommand(deps: EditDeps, ids: string[], args: unknown[]) {
  if (args.length === 1) {
    const updatePayload = args[0]
    if (typeof updatePayload === 'function') {
      return createSetterChangeCommand({
        name: 'update_els_by_setter',
        ids,
        readValue: el => el,
        setter: updatePayload as StoreSetter<DiagramElement>,
        apply: (id, value) => {
          deps.element.update(id, value)
        },
        deps,
      })
    }
    return createChangeCommand('update_els', createPatchChangeEntries(ids, updatePayload as Partial<DiagramElement>, deps), (id, value) => {
      deps.element.update(id, value)
    })
  }

  if (args.length === 2) {
    const [k1, setter] = args as [UnionKeyOf<DiagramElement>, StoreSetter<any, any>]
    return createSetterChangeCommand({
      name: 'update_els_by_path',
      ids,
      readValue: el => (el as any)[k1],
      setter,
      apply: (id, value) => {
        deps.element.update(id, k1 as any, value)
      },
      deps,
    })
  }

  if (args.length === 3) {
    return createNestedUpdateCommand(ids, ...(args as [any, any, any]), deps)
  }

  throw new Error('edit.update 参数不合法')
}

function createAddCommand(deps: EditDeps, elements: DiagramElement[]) {
  const { element } = deps
  const name = 'add_els'

  type AddCommand = Command & {
    payload: DiagramElement[]
  }

  return createCommand({
    name,
    payload: elements,
    execute() {
      element.add(elements)
    },
    undo() {
      element.remove(elements)
    },
    canMergeWith(next: Command): boolean {
      return next.name === name && Date.now() - next.timestamp < 300
    },
    merge<K extends Command>(next: K): K extends AddCommand ? AddCommand : null {
      return (next.name !== name ? null : createAddCommand(deps, [...elements, ...(next as any).payload])) as any
    },
  }) as AddCommand
}

function createRemoveCommand(deps: EditDeps, elements: DiagramElement[]) {
  const { element, selection } = deps
  const name = 'remove_els'

  type RemoveCommand = Command & {
    payload: DiagramElement[]
  }

  return createCommand({
    name,
    payload: elements,
    execute() {
      element.remove(elements)
      selection.deselect(elements.map(el => el.id))
    },
    undo() {
      element.add(elements)
    },
    canMergeWith(next: Command): boolean {
      return next.name === name && Date.now() - next.timestamp < 300
    },
    merge<K extends Command>(next: K): K extends RemoveCommand ? RemoveCommand : null {
      return (next.name !== name ? null : createRemoveCommand(deps, [...elements, ...(next as any).payload])) as any
    },
  })
}

function createMoveCommand(deps: EditDeps, elements: DiagramElement[], dx: number, dy: number) {
  const name = 'el_move'
  const targetIds = elements.map(el => el.id)

  type MovePayload = {
    targetIds: string[]
    dx: number
    dy: number
  }

  type MoveCommand = Command & {
    payload: MovePayload
  }

  const payload: MovePayload = {
    targetIds: [...targetIds],
    dx,
    dy,
  }

  const command = createCommand({
    name,
    payload,
    execute() {
      deps.element.move(elements, dx, dy)
    },
    undo() {
      deps.element.move(elements, -dx, -dy)
    },
    canMergeWith(next: Command): boolean {
      if (next.name !== name) return false
      const nextPayload = (next as MoveCommand).payload
      return (
        nextPayload.targetIds.length === targetIds.length &&
        nextPayload.targetIds.every((id, index) => id === targetIds[index])
      )
    },
    merge(next: Command): MoveCommand | null {
      if (!command.canMergeWith?.(next)) return null
      const nextPayload = (next as MoveCommand).payload
      command.payload.dx += nextPayload.dx
      command.payload.dy += nextPayload.dy
      return command
    },
  }) as MoveCommand

  return command
}

function createClearCommand(deps: EditDeps) {
  const { element, selection } = deps
  const snapshotElements = deepClone(element.elementMap())
  const snapshotOrderList = element.orderList().slice()

  return createCommand({
    name: 'clear_els',
    execute() {
      element.clear()
      selection.clear()
    },
    undo() {
      element.load(snapshotElements, snapshotOrderList)
    },
  })
}

export function createEditManager(_ctx: DesignerContext, deps: EditDeps) {
  const { element, selection, history } = deps

  function add(elements: DiagramElement[], options: { select?: boolean; record?: boolean } = {}): void {
    const { record = true, select = true } = options
    if (!record) {
      element.add(elements)
      if (select) selection.select(elements.map(el => el.id))
      return
    }

    history.execute(createAddCommand(deps, elements))
  }

  function create<T extends keyof CreateMethods>(
    type: T,
    ...args: [...Parameters<CreateMethods[T]>, options?: { select?: boolean } & EditOptions]
  ): ReturnType<CreateMethods[T]> {
    const lastArg = args[args.length - 1]
    const hasOptions = typeof lastArg === 'object' && lastArg !== null && ('select' in lastArg || 'record' in lastArg)

    const options = (hasOptions ? lastArg : {}) as { select?: boolean } & EditOptions
    const createArgs = (hasOptions ? args.slice(0, -1) : args) as any

    const createdElement = element.create(type, ...createArgs)
    if (!createdElement) return null as any

    add([createdElement], options)
    return createdElement as any
  }

  function remove(id: string | string[], options: EditOptions = {}): void {
    const ids = ensureArray(id)
    const { record = true } = options
    const elements = element.getElementsByIds(ids)

    if (!record) {
      element.remove(ids)
      selection.deselect(ids)
      return
    }

    history.execute(createRemoveCommand(deps, elements))
  }

  function update<K1 extends UnionKeyOf<DiagramElement>, K2 extends UnionNestedKeyOf<DiagramElement, K1>>(
    id: MaybeArray<string>,
    k1: K1,
    k2: K2,
    setter: StoreSetter<UnionNestedValue<DiagramElement, K1, K2>, [K2, K1]>,
    options?: EditOptions,
  ): void
  function update<K1 extends UnionKeyOf<DiagramElement>>(
    id: MaybeArray<string>,
    k1: K1,
    setter: StoreSetter<UnionValue<DiagramElement, K1>, [K1]>,
    options?: EditOptions,
  ): void
  function update(id: MaybeArray<string>, setter: StoreSetter<DiagramElement>, options?: EditOptions): void
  function update(id: MaybeArray<string>, ...args: unknown[]): void {
    const ids = normalizeIds(id)
    if (ids.length === 0 || args.length === 0) return

    const options = takeEditOptions(args)
    const { record = true } = options
    if (args.length === 0) return

    if (!record) {
      element.update(ids, ...(args as [any]))
      return
    }

    const command = createUpdateCommand(deps, ids, args)

    history.execute(command)
  }

  function clear(options: EditOptions = {}): void {
    const { record = true } = options
    if (!record) {
      element.clear()
      selection.clear()
      return
    }

    history.execute(createClearCommand(deps))
  }

  function move(ids: string[], dx: number, dy: number, options: EditOptions = {}): void {
    const { record = true } = options
    const elements = element.getElementsByIds(ids)
    if (elements.length === 0) return

    if (!record) {
      element.move(elements, dx, dy)
      return
    }

    history.execute(createMoveCommand(deps, elements, dx, dy))
  }

  return {
    add,
    create,
    remove,
    update,
    clear,
    move,
  }
}

export type EditManager = ReturnType<typeof createEditManager>
