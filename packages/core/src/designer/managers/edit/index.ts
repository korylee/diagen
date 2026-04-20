import {
  ensureArray,
  type MaybeArray,
  type UnionKeyOf,
  type UnionNestedKeyOf,
  type UnionNestedValue,
  type UnionValue,
} from '@diagen/shared'
import { batch } from 'solid-js'
import type { StoreSetter } from 'solid-js/store'
import type { DiagramElement } from '../../../model'
import type { CreateMethods } from '../element'
import {
  resolveParenting,
  resolveParentPreview,
  type ResolveParentingOptions,
  type ResolveParentingResult,
} from '../element/parenting'
import type { DesignerContext } from '../types'
import {
  createAddCommand,
  createClearCommand,
  createLayerCommand,
  createMoveCommand,
  createParentingCommand,
  createRemoveCommand,
  createUpdateCommand,
  EditCreateOptions,
} from './commands'
import { normalizeIds, takeEditOptions, type EditDeps, type EditOptions } from './shared'

export function createEditManager(_ctx: DesignerContext, deps: EditDeps) {
  const { element, selection, history, view } = deps

  function applyParenting(result: ResolveParentingResult): void {
    batch(() => {
      for (const parentUpdate of result.parentUpdates) {
        element.update(parentUpdate.id, {
          parent: parentUpdate.parent,
        })
      }

      for (const childrenUpdate of result.childrenUpdates) {
        element.update(childrenUpdate.id, {
          children: childrenUpdate.children,
        })
      }
    })
  }

  function add(elements: DiagramElement[], options: EditCreateOptions = {}): void {
    const { record = true, select = true, clone = true } = options
    if (!record) {
      element.add(elements)
      if (select) selection.select(elements.map(element => element.id))
      return
    }

    history.execute(createAddCommand(deps, elements, { clone, select }))
  }

  function create<T extends keyof CreateMethods>(
    type: T,
    ...args: [...Parameters<CreateMethods[T]>, options?: EditCreateOptions]
  ): ReturnType<CreateMethods[T]> {
    const lastArg = args[args.length - 1]
    const hasOptions = typeof lastArg === 'object' && lastArg !== null && ('select' in lastArg || 'record' in lastArg)
    const options = (hasOptions ? lastArg : {}) as EditCreateOptions
    const createArgs = (hasOptions ? args.slice(0, -1) : args) as Parameters<CreateMethods[T]>

    const createdElement = element.create(type, ...createArgs)
    if (!createdElement) return null as ReturnType<CreateMethods[T]>

    add([createdElement], options)
    return createdElement as ReturnType<CreateMethods[T]>
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

    if (!record) {
      element.update(ids, ...(args as [any]))
      return
    }

    history.execute(createUpdateCommand(deps, ids, args))
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

    history.execute(createMoveCommand(deps, elements, dx, dy), {
      mergeKey: `el_move:${elements.map(element => element.id).join(',')}`,
    })
  }

  function parenting(
    targetIds: string[],
    options: EditOptions & Pick<ResolveParentingOptions, 'containment' | 'canContain' | 'canBeContained'> = {},
  ): void {
    const { record = true, containment, canContain, canBeContained } = options
    if (targetIds.length === 0) return

    if (!record) {
      const result = resolveParenting({
        shapes: element.shapes(),
        targetIds,
        getBounds: view.getShapeBounds,
        containment,
        canContain,
        canBeContained,
      })
      if (result.parentUpdates.length === 0 && result.childrenUpdates.length === 0) return
      applyParenting(result)
      return
    }

    history.execute(
      createParentingCommand(deps, {
        targetIds,
        containment,
        canContain,
        canBeContained,
      }),
    )
  }

  function previewParenting(
    targetIds: string[],
    options: Pick<ResolveParentingOptions, 'containment' | 'canContain' | 'canBeContained'> = {},
  ): string | null {
    if (targetIds.length === 0) return null

    return resolveParentPreview({
      shapes: element.shapes(),
      targetIds,
      getBounds: view.getShapeBounds,
      containment: options.containment,
      canContain: options.canContain,
      canBeContained: options.canBeContained,
    })
  }

  function toFront(ids: string[], options: EditOptions = {}): void {
    const { record = true } = options
    if (!record) {
      element.toFront(ids)
      return
    }

    history.execute(createLayerCommand(deps, ids, 'toFront'))
  }

  function toBack(ids: string[], options: EditOptions = {}): void {
    const { record = true } = options
    if (!record) {
      element.toBack(ids)
      return
    }

    history.execute(createLayerCommand(deps, ids, 'toBack'))
  }

  function moveForward(ids: string[], options: EditOptions = {}): void {
    const { record = true } = options
    if (!record) {
      element.moveForward(ids)
      return
    }

    history.execute(createLayerCommand(deps, ids, 'moveForward'))
  }

  function moveBackward(ids: string[], options: EditOptions = {}): void {
    const { record = true } = options
    if (!record) {
      element.moveBackward(ids)
      return
    }

    history.execute(createLayerCommand(deps, ids, 'moveBackward'))
  }

  return {
    add,
    create,
    remove,
    update,
    clear,
    move,
    parenting,
    previewParenting,
    toFront,
    toBack,
    moveForward,
    moveBackward,
  }
}

export type EditManager = ReturnType<typeof createEditManager>
export type { EditDeps, EditOptions } from './shared'
