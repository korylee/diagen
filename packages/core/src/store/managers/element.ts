import { batch, createMemo } from 'solid-js'
import { StoreContext } from './types'
import {
  BoxProps,
  DiagramElement,
  isLinker,
  isLinkerFree,
  isShape,
  LinkerElement,
  LinkerEndpoint,
  ShapeElement,
} from '../../model'
import { deepMerge } from '@diagen/shared'
import { Schema } from '../../schema'

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

export const createElementManager = (ctx: StoreContext) => {
  const { state } = ctx
  const elementMap = createMemo(() => state.diagram.elements)
  const orderList = createMemo(() => state.diagram.orderList)
  const elements = createMemo(() =>
    orderList()
      .map(id => elementMap()[id])
      .filter(Boolean),
  )
  const shapes = createMemo(() => elements().filter(el => isShape(el)))

  const getById = (id: string) => elementMap()[id]

  function add(elements: DiagramElement[]) {
    const ids: string[] = []
    batch(() => {
      for (const element of elements) {
        ctx.setState('diagram', 'elements', element.id, element)
        ids.push(element.id)
      }
      ctx.setState('diagram', 'orderList', list => [...list, ...ids])
    })
    ctx.emit('element:added', elements)
  }

  function remove(els: (string | DiagramElement)[]) {
    const ids = els.map(el => (typeof el === 'string' ? el : el.id))
    batch(() => {
      ctx.setState('diagram', 'elements', els => {
        const newEls = { ...els }
        for (const id of ids) {
          delete newEls[id]
        }
        return newEls
      })
      ctx.setState('diagram', 'orderList', list => list.filter(id => !ids.includes(id)))
    })

    ctx.emit('element:removed', { ids })
  }

  function update(id: string, overrides: Partial<DiagramElement>) {
    ctx.setState('diagram', 'elements', id, el => {
      return deepMerge(el, overrides)
    })

    ctx.emit('element:updated', {
      id,
      overrides,
    })
  }

  function clear() {
    const list = elements()
    batch(() => {
      ctx.setState('diagram', 'elements', {})
      ctx.setState('diagram', 'orderList', [])
    })
    ctx.emit('element:cleared', { elements: list })
  }

  function move(elements: DiagramElement[], dx: number, dy: number) {
    batch(() => {
      for (const element of elements) {
        if (isShape(element)) {
          ctx.setState('diagram', 'elements', element.id, (el: any) => ({
            ...el,
            props: {
              ...el.props,
              x: el.props.x + dx,
              y: el.props.y + dy,
            },
          }))
        } else if (isLinker(element)) {
          if (isLinkerFree(element)) {
            ctx.setState('diagram', 'elements', element.id, (el: any) => ({
              ...el,
              from: {
                ...el.from,
                x: el.from.x + dx,
                y: el.from.y + dy,
              },
              to: {
                ...el.to,
                x: el.to.x + dx,
                y: el.to.y + dy,
              },
              points: el.points.map((p: any) => ({
                x: p.x + dx,
                y: p.y + dy,
              })),
            }))
          }
        }
      }
    })

    ctx.emit('element:moved', { elements, dx, dy })
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
    elements,
    orderList,
    shapes,

    getById,

    create,
    add,
    remove,
    update,
    clear,
    move,
  }
}

export type ElementManager = ReturnType<typeof createElementManager>
