import {
  isNonNullable,
  keys,
  type Bounds,
  type UnionKeyOf,
  type UnionNestedKeyOf,
  type UnionNestedValue,
} from '@diagen/shared'
import { batch } from 'solid-js'
import type { StoreSetter } from 'solid-js/store'
import type { DiagramElement, ShapeElement } from '../../../model'
import { unwrapClone } from '../../../_internal'
import {
  resolveParenting,
  type ParentingContainment,
  type ResolveParentingOptions,
  type ResolveParentingResult,
} from '../element/parenting'
import { type Command, createCommand } from '../history'
import {
  type ChangeEntry,
  type EditCreateOptions,
  type EditDeps,
  hasChanged,
  type LayerAction,
  normalizeIds,
  resolveSetter,
} from './shared'

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

function createPatchChangeEntries(
  ids: string[],
  patch: Partial<DiagramElement>,
  deps: EditDeps,
): ChangeEntry<Partial<DiagramElement>>[] {
  const patchKeys = keys(patch)
  if (patchKeys.length === 0) return []

  const entries: ChangeEntry<Partial<DiagramElement>>[] = []

  for (const id of ids) {
    const element = deps.element.getElementById(id)
    if (!element) continue

    const before: Partial<DiagramElement> = {}
    const after: Partial<DiagramElement> = {}
    let changed = false

    for (const key of patchKeys) {
      const prevValue = element[key]
      const nextValue = patch[key]
      if (Object.is(prevValue, nextValue)) continue

      changed = true
      ;(before as Record<string, unknown>)[key] = unwrapClone(prevValue)
      ;(after as Record<string, unknown>)[key] = unwrapClone(nextValue)
    }

    if (!changed) continue
    entries.push({ id, before, after })
  }

  return entries
}

function createSetterChangeEntries<T>(
  ids: string[],
  readValue: (element: DiagramElement) => T,
  setter: StoreSetter<T, any>,
  deps: EditDeps,
): ChangeEntry<T>[] {
  const entries: ChangeEntry<T>[] = []

  for (const id of ids) {
    const element = deps.element.getElementById(id)
    if (!element) continue

    const prev = readValue(element)
    const next = resolveSetter(prev, setter)
    if (!hasChanged(prev, next)) continue

    entries.push({
      id,
      before: unwrapClone(prev),
      after: unwrapClone(next),
    })
  }

  return entries
}

function createSetterChangeCommand<T>(params: {
  name: string
  ids: string[]
  readValue: (element: DiagramElement) => T
  setter: StoreSetter<T, any>
  apply: (id: string, value: T) => void
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
    readValue: element => ((element as any)[k1] as any)?.[k2] as UnionNestedValue<DiagramElement, K1, K2>,
    setter,
    apply: (id, value) => {
      deps.element.update(id, k1 as never, k2 as never, value as never)
    },
    deps,
  })
}

export function createUpdateCommand(deps: EditDeps, ids: string[], args: unknown[]) {
  if (args.length === 1) {
    const updatePayload = args[0]

    if (typeof updatePayload === 'function') {
      return createSetterChangeCommand({
        name: 'update_els_by_setter',
        ids,
        readValue: element => element,
        setter: updatePayload as StoreSetter<DiagramElement>,
        apply: (id, value) => {
          deps.element.update(id, value)
        },
        deps,
      })
    }

    return createChangeCommand(
      'update_els',
      createPatchChangeEntries(ids, updatePayload as Partial<DiagramElement>, deps),
      (id, value) => {
        deps.element.update(id, value)
      },
    )
  }

  if (args.length === 2) {
    const [k1, setter] = args as [UnionKeyOf<DiagramElement>, StoreSetter<unknown, any>]

    return createSetterChangeCommand({
      name: 'update_els_by_path',
      ids,
      readValue: element => (element as any)[k1],
      setter,
      apply: (id, value) => {
        deps.element.update(id, k1 as never, value as never)
      },
      deps,
    })
  }

  if (args.length === 3) {
    return createNestedUpdateCommand(ids, ...(args as [any, any, any]), deps)
  }

  throw new Error('edit.update 参数不合法')
}

function createParentingSnapshot(deps: EditDeps, result: ResolveParentingResult): ResolveParentingResult {
  return {
    parentUpdates: result.parentUpdates
      .map(update => {
        const element = deps.element.getElementById(update.id)
        return element
          ? {
              id: update.id,
              parent: element.parent,
            }
          : null
      })
      .filter(isNonNullable),
    childrenUpdates: result.childrenUpdates
      .map(update => {
        const element = deps.element.getElementById(update.id)
        return element
          ? {
              id: update.id,
              children: [...element.children],
            }
          : null
      })
      .filter(isNonNullable),
  }
}

function applyParenting(deps: EditDeps, result: ResolveParentingResult): void {
  batch(() => {
    for (const parentUpdate of result.parentUpdates) {
      deps.element.update(parentUpdate.id, {
        parent: parentUpdate.parent,
      })
    }

    for (const childrenUpdate of result.childrenUpdates) {
      deps.element.update(childrenUpdate.id, {
        children: childrenUpdate.children,
      })
    }
  })
}

export function createParentingCommand(
  deps: EditDeps,
  options: Pick<ResolveParentingOptions, 'targetIds' | 'containment' | 'canContain' | 'canBeContained'>,
) {
  const result = resolveParenting({
    shapes: deps.element.shapes(),
    targetIds: options.targetIds,
    getBounds: deps.view.getShapeBounds,
    containment: options.containment,
    canContain: options.canContain,
    canBeContained: options.canBeContained,
  })
  const isNoOp = !result.parentUpdates.length && !result.childrenUpdates.length

  if (isNoOp) {
    return createCommand({
      name: 'el_parenting',
      isNoOp: true,
      execute() {},
      undo() {},
    })
  }

  const before = createParentingSnapshot(deps, result)

  return createCommand({
    name: 'el_parenting',
    execute() {
      if (isNoOp) return
      applyParenting(deps, result)
    },
    undo() {
      applyParenting(deps, before)
    },
  })
}

export function createInsertElementsCommand(
  deps: Pick<EditDeps, 'element' | 'selection'>,
  params: {
    name: string
    elements: DiagramElement[]
    options?: Pick<EditCreateOptions, 'assumeCloned' | 'select'>
  },
) {
  const { element, selection } = deps
  const { name, elements, options = {} } = params
  const { assumeCloned = false, select = true } = options
  const snapshots = assumeCloned ? elements : elements.map(current => unwrapClone(current))
  const addedIds = snapshots.map(current => current.id)
  const beforeSelectionIds = selection.selectedIds().slice()

  type InsertCommand = Command & {
    payload: DiagramElement[]
  }

  const command = createCommand({
    name,
    payload: snapshots,
    execute() {
      batch(() => {
        element.add(snapshots.map(current => unwrapClone(current)))
        if (select) {
          selection.replace(addedIds)
        }
      })
    },
    undo() {
      batch(() => {
        element.remove(addedIds)
        if (select) {
          selection.replace(beforeSelectionIds)
        }
      })
    },
    canMergeWith(next: Command): boolean {
      return next.name === name && Date.now() - next.timestamp < 300
    },
    merge<K extends Command>(next: K): K extends null | undefined ? InsertCommand : InsertCommand | null {
      return (
        next.name !== name
          ? null
          : createInsertElementsCommand(deps, {
              name,
              elements: [...snapshots, ...(next as any).payload],
              options: {
                assumeCloned: true,
                select,
              },
            })
      ) as any
    },
  }) as InsertCommand

  return command
}

export function createAddCommand(
  deps: EditDeps,
  elements: DiagramElement[],
  options: Pick<EditCreateOptions, 'assumeCloned' | 'select'> = {},
) {
  return createInsertElementsCommand(deps, {
    name: 'add_els',
    elements,
    options,
  })
}

export function createRemoveCommand(deps: EditDeps, elements: DiagramElement[]) {
  const { element, selection } = deps
  const ids = elements.map(current => current.id)
  const snapshotElements = unwrapClone(element.elementMap())
  const snapshotOrderList = element.orderList().slice()
  const previousSelectionIds = selection.selectedIds().slice()
  const nextSelectionIds = previousSelectionIds.filter(selectedId => !ids.includes(selectedId))
  const name = 'remove_els'
  return createCommand({
    name,
    execute() {
      element.remove(ids)
      selection.replace(nextSelectionIds)
    },
    undo() {
      element.load(unwrapClone(snapshotElements), snapshotOrderList.slice())
      selection.replace(previousSelectionIds)
    },
  })
}

export function createMoveCommand(deps: EditDeps, elements: DiagramElement[], dx: number, dy: number) {
  const name = 'el_move'
  const targetIds = elements.map(element => element.id)

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

export function createClearCommand(deps: EditDeps) {
  const { element, selection } = deps
  const snapshotElements = unwrapClone(element.elementMap())
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

export function createLayerCommand(deps: EditDeps, ids: string[], action: LayerAction) {
  const targetIds = normalizeIds(ids).filter(id => deps.element.getElementById(id))
  if (targetIds.length === 0) {
    return createCommand({
      name: `el_layer_${action}`,
      isNoOp: true,
      execute() {},
      undo() {},
    })
  }

  const before = deps.element.orderList().slice()
  deps.element[action](targetIds)
  const after = deps.element.orderList().slice()
  deps.element.setOrderList(before)

  return createCommand({
    name: `el_layer_${action}`,
    isNoOp: before.length === after.length && before.every((id, index) => id === after[index]),
    execute() {
      deps.element.setOrderList(after)
    },
    undo() {
      deps.element.setOrderList(before)
    },
  })
}
