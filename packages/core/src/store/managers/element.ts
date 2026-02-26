import { batch, createMemo } from 'solid-js'
import { StoreContext } from './types'
import { DiagramElement, isLinker, isShape } from '../../model'
import { deepMerge } from '@diagen/shared'

export const createElementManager = (ctx: StoreContext) => {
  const { state } = ctx
  const elementMap = createMemo(() => state.diagram.elements)
  const orderList = createMemo(() => state.diagram.orderList)
  const elements = createMemo(() =>
    orderList()
      .map(id => elementMap()[id])
      .filter(Boolean),
  )
  const getElementById = (id: string) => elementMap()[id]

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

    ctx.emit('element:removed', ids)
  }

  function update(id: string, patch: Partial<DiagramElement>) {
    ctx.setState('diagram', 'elements', id, el => {
      return deepMerge(el, patch)
    })

    ctx.emit('element:updated', {
      id,
      patch,
    })
  }

  function clear() {
    const list = elements()
    batch(() => {
      ctx.setState('diagram', 'elements', {})
      ctx.setState('diagram', 'orderList', [])
    })
    ctx.emit('element:cleared', list)
  }

  function move(elements: DiagramElement[], dx: number, dy: number) {
    batch(() => {
      for (const element of elements) {
        if (isShape(element)) {
          const updatedShape = {
            ...element,
            props: {
              ...element.props,
              x: element.props.x + dx,
              y: element.props.y + dy,
            },
          }
          ctx.setState('diagram', 'elements', element.id, updatedShape)
          return
        }
        if (isLinker(element)) {
          const isFreeLinker = element.from.id === null && element.to.id === null
          if (isFreeLinker) {
            const updatedLinker = {
              ...element,
              from: {
                ...element.from,
                x: element.from.x + dx,
                y: element.from.y + dy,
              },
              to: {
                ...element.to,
                x: element.to.x + dx,
                y: element.to.y + dy,
              },
              points: element.points.map(p => ({
                x: p.x + dx,
                y: p.y + dy,
              })),
            }
            ctx.setState('diagram', 'elements', element.id, updatedLinker)
          }

          return
        }
      }
    })

    ctx.emit('element:moved', elements)
  }

  return {
    elementMap,
    elements,
    orderList,

    getElementById,

    add,
    remove,
    update,
    clear,
    move,
  }
}

export type ElementManager = ReturnType<typeof createElementManager>
