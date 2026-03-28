import {
  ensureArray,
  keys,
  type MaybeArray,
  type UnionKeyOf,
  type UnionNestedKeyOf,
  type UnionNestedValue,
  type UnionValue,
} from '@diagen/shared'
import { batch, createMemo } from 'solid-js'
import { produce, type StoreSetter } from 'solid-js/store'
import {
  type BoxProps,
  type DiagramElement,
  isLinker,
  isShape,
  type LinkerElement,
  type LinkerEndpoint,
  type ShapeElement,
} from '../../../model'
import { Schema } from '../../../schema'
import type { DesignerContext } from '../types'
import {
  createElementArrangeActions,
  type ElementAlignType,
  type ElementDistributeType,
} from './arrange'
import { createElementIndexes } from './indexes'

const CreateMethods = {
  shape: (schemaId: string, box: BoxProps, overrides?: Partial<ShapeElement>): ShapeElement | null =>
    Schema.createShape(schemaId, box, overrides),
  linker: (
    schemaId: string,
    from: LinkerEndpoint,
    to: LinkerEndpoint,
    overrides?: Partial<LinkerElement>,
  ): LinkerElement | null => Schema.createLinker(schemaId, from, to, overrides),
  custom: (element: DiagramElement) => element,
} as const

export type CreateMethods = typeof CreateMethods

export interface ElementEvents {
  'element:updated': { elements: DiagramElement[] }
  'element:added': { elements: DiagramElement[] }
  'element:removed': { elements: DiagramElement[] }
  'element:moved': { elements: DiagramElement[]; dx: number; dy: number }
  'element:cleared': { elements: DiagramElement[] }
}

export const createElementManager = (ctx: DesignerContext) => {
  const { state, setState, emitter } = ctx

  const elementMap = createMemo(() => state.diagram.elements)
  const getElementById = <T extends DiagramElement = DiagramElement>(id: string) => elementMap()[id] as T | undefined
  const getElementsByIds = (ids: string[]) => ids.map(id => getElementById(id)).filter(Boolean) as DiagramElement[]
  const orderList = createMemo(() => state.diagram.orderList)
  const indexes = createElementIndexes({
    getElementById,
    getElementsByIds,
    orderList,
  })
  const arrange = createElementArrangeActions({
    setState,
    elementMap,
  })

  function add(els: MaybeArray<DiagramElement>) {
    const elements = ensureArray(els)
    const ids: string[] = []
    batch(() => {
      for (const element of elements) {
        setState('diagram', 'elements', element.id, element)
        ids.push(element.id)
      }
      setState('diagram', 'orderList', list => [...list, ...ids])
    })
    emitter.emit('element:added', { elements })
  }

  function remove(els: MaybeArray<string | DiagramElement>) {
    const ids = ensureArray(els).map(el => (typeof el === 'string' ? el : el.id))
    const idsSet = new Set(ids)
    const elements = getElementsByIds(ids)
    batch(() => {
      setState(
        'diagram',
        'elements',
        produce(els => {
          for (const id of ids) {
            delete els[id] // 在 produce 内部直接删除
          }
        }),
      )
      setState('diagram', 'orderList', list => list.filter(id => !idsSet.has(id)))
    })

    emitter.emit('element:removed', { elements })
  }

  function update<K1 extends UnionKeyOf<DiagramElement>, K2 extends UnionNestedKeyOf<DiagramElement, K1>>(
    id: MaybeArray<string>,
    k1: K1,
    k2: K2,
    setter: StoreSetter<UnionNestedValue<DiagramElement, K1, K2>, [K2, K1]>,
  ): void
  function update<K1 extends UnionKeyOf<DiagramElement>>(
    id: MaybeArray<string>,
    k1: K1,
    setter: StoreSetter<UnionValue<DiagramElement, K1>, [K1]>,
  ): void
  function update(id: MaybeArray<string>, setter: StoreSetter<DiagramElement>): void
  function update(id: MaybeArray<string>, ...args: unknown[]) {
    setState('diagram', 'elements', id, ...(args as [any]))
    const elements = getElementsByIds(ensureArray(id))
    emitter.emit('element:updated', { elements })
  }

  function load(elements: Record<string, DiagramElement>, orderList: string[] = []) {
    batch(() => {
      setState('diagram', 'elements', elements)
      setState('diagram', 'orderList', orderList ?? keys(elements))
    })
  }

  function setOrderList(nextOrderList: string[]) {
    setState('diagram', 'orderList', nextOrderList)
  }

  function clear() {
    const list = indexes.elements()
    batch(() => {
      setState('diagram', 'elements', {})
      setState('diagram', 'orderList', [])
    })
    emitter.emit('element:cleared', { elements: list })
  }

  function move(els: MaybeArray<string | DiagramElement>, dx: number, dy: number) {
    if (dx === 0 && dy === 0) return
    const ids = ensureArray(els).map(el => (typeof el === 'string' ? el : el.id))
    const elements = getElementsByIds(ids)

    update(
      ids,
      produce(el => {
        if (!el) return
        if (isShape(el)) {
          el.props.x += dx
          el.props.y += dy
        } else if (isLinker(el)) {
          // 整体移动连线：只有自由连线或者手动触发的整体移动才更新端点
          // 如果端点绑定了 ID，则由端点跟随 Shape 的逻辑处理（后续扩展）
          el.from.x += dx
          el.from.y += dy
          el.to.x += dx
          el.to.y += dy
          if (el.points) {
            el.points = el.points.map(p => ({
              x: p.x + dx,
              y: p.y + dy,
            }))
          }
        }
      }),
    )
    emitter.emit('element:moved', { elements: elements, dx, dy })
  }

  function create<K extends keyof CreateMethods>(
    type: K,
    ...args: Parameters<CreateMethods[K]>
  ): ReturnType<CreateMethods[K]> {
    const method = CreateMethods[type] as any
    return method(...args)
  }

  return {
    elementMap,
    elements: indexes.elements,
    elementCount: indexes.elementCount,
    orderList,
    shapes: indexes.shapes,
    linkers: indexes.linkers,

    getElementById,
    getElementsByIds,
    getRelatedLinkers: indexes.getRelatedLinkers,
    getGroupElementIds: indexes.getGroupElementIds,

    create,
    add,
    remove,
    update,
    clear,
    load,
    setOrderList,
    move,
    align: arrange.align as (ids: string[], type: ElementAlignType) => void,
    distribute: arrange.distribute as (ids: string[], type: ElementDistributeType) => void,
    orderElementIds: indexes.orderElementIds,
    getInternalLinkerIds: indexes.getInternalLinkerIds,
    toFront: arrange.toFront,
    toBack: arrange.toBack,
    moveForward: arrange.moveForward,
    moveBackward: arrange.moveBackward,
  }
}

export type ElementManager = ReturnType<typeof createElementManager>
