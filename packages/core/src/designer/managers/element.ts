import { batch, createMemo } from 'solid-js'
import { generateId } from '@diagen/shared'
import { DesignerContext } from './types'
import { BoxProps, DiagramElement, isLinker, isShape, LinkerElement, LinkerEndpoint, ShapeElement } from '../../model'
import { Schema } from '../../schema'
import { produce, SetStoreFunction } from 'solid-js/store'
import { EditorState } from '../index'

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

export const createElementManager = (ctx: DesignerContext) => {
  const { state } = ctx
  const elementMap = createMemo(() => state.diagram.elements)
  const orderList = createMemo(() => state.diagram.orderList)
  const elements = createMemo(() =>
    orderList()
      .map(id => elementMap()[id])
      .filter(Boolean),
  )
  const elementCount = createMemo(() => elements().length)
  const shapes = createMemo(() => elements().filter(el => isShape(el)) as ShapeElement[])
  const linkers = createMemo(() => elements().filter(el => isLinker(el)) as LinkerElement[])

  const getById = (id: string) => elementMap()[id]

  /**
   * Get all linkers connected to a specific shape
   */
  function getRelatedLinkers(shapeId: string) {
    return linkers().filter(linker => linker.from.id === shapeId || linker.to.id === shapeId)
  }

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
      ctx.setState(
        'diagram',
        'elements',
        produce(els => {
          for (const id of ids) {
            delete els[id] // 在 produce 内部直接删除
          }
        }),
      )
      ctx.setState('diagram', 'orderList', list => list.filter(id => !ids.includes(id)))
    })

    ctx.emit('element:removed', { ids })
  }

  const update: SetStoreFunction<EditorState['diagram']['elements']> = (...args: unknown[]) => {
    ctx.setState('diagram', 'elements', ...(args as [any]))
    ctx.emit('element:updated')
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
    if (dx === 0 && dy === 0) return

    batch(() => {
      ctx.setState(
        'diagram',
        'elements',
        produce(els => {
          for (const element of elements) {
            const el = els[element.id]
            if (!el) continue

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
                el.points = el.points.map((p: any) => ({
                  x: p.x + dx,
                  y: p.y + dy,
                }))
              }
            }
          }
        }),
      )
    })

    ctx.emit('element:moved', { elements, dx, dy })
  }

  // ============================================================================
  // Geometry & Layout
  // ============================================================================

  /**
   * Align elements
   */
  function align(ids: string[], type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    if (ids.length < 2) return

    const selectedShapes = ids.map(id => elementMap()[id]).filter(isShape) as ShapeElement[]
    if (selectedShapes.length < 2) return

    // Calculate bounding box of all shapes
    const lefts = selectedShapes.map(s => s.props.x)
    const rights = selectedShapes.map(s => s.props.x + s.props.w)
    const tops = selectedShapes.map(s => s.props.y)
    const bottoms = selectedShapes.map(s => s.props.y + s.props.h)

    const minX = Math.min(...lefts)
    const maxX = Math.max(...rights)
    const minY = Math.min(...tops)
    const maxY = Math.max(...bottoms)

    ctx.setState(
      'diagram',
      'elements',
      produce(els => {
        for (const shape of selectedShapes) {
          const el = els[shape.id] as ShapeElement
          if (!el) continue

          switch (type) {
            case 'left':
              el.props.x = minX
              break
            case 'right':
              el.props.x = maxX - el.props.w
              break
            case 'center':
              el.props.x = minX + (maxX - minX) / 2 - el.props.w / 2
              break
            case 'top':
              el.props.y = minY
              break
            case 'bottom':
              el.props.y = maxY - el.props.h
              break
            case 'middle':
              el.props.y = minY + (maxY - minY) / 2 - el.props.h / 2
              break
          }
        }
      }),
    )
  }

  /**
   * Distribute elements evenly
   */
  function distribute(ids: string[], type: 'horizontal' | 'vertical') {
    if (ids.length < 3) return

    const selectedShapes = ids.map(id => elementMap()[id]).filter(isShape) as ShapeElement[]
    if (selectedShapes.length < 3) return

    if (type === 'horizontal') {
      const sorted = [...selectedShapes].sort((a, b) => a.props.x - b.props.x)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const totalWidth = sorted.reduce((sum, s) => sum + s.props.w, 0)
      const gap = (last.props.x + last.props.w - first.props.x - totalWidth) / (sorted.length - 1)

      let currentX = first.props.x
      ctx.setState(
        'diagram',
        'elements',
        produce(els => {
          for (let i = 0; i < sorted.length; i++) {
            const el = els[sorted[i].id] as ShapeElement
            el.props.x = currentX
            currentX += el.props.w + gap
          }
        }),
      )
    } else {
      const sorted = [...selectedShapes].sort((a, b) => a.props.y - b.props.y)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const totalHeight = sorted.reduce((sum, s) => sum + s.props.h, 0)
      const gap = (last.props.y + last.props.h - first.props.y - totalHeight) / (sorted.length - 1)

      let currentY = first.props.y
      ctx.setState(
        'diagram',
        'elements',
        produce(els => {
          for (let i = 0; i < sorted.length; i++) {
            const el = els[sorted[i].id] as ShapeElement
            el.props.y = currentY
            currentY += el.props.h + gap
          }
        }),
      )
    }
  }

  // ============================================================================
  // Grouping
  // ============================================================================

  /**
   * Group elements together
   */
  function group(ids: string[]): string | null {
    if (ids.length < 2) return null

    const groupId = generateId('group')
    ctx.setState(
      'diagram',
      'elements',
      produce(els => {
        for (const id of ids) {
          const el = els[id]
          if (el) {
            el.group = groupId
          }
        }
      }),
    )
    return groupId
  }

  /**
   * Ungroup elements
   */
  function ungroup(groupId: string) {
    const members = elements().filter(el => el.group === groupId)
    ctx.setState(
      'diagram',
      'elements',
      produce(els => {
        for (const member of members) {
          const el = els[member.id]
          if (el) {
            el.group = null
          }
        }
      }),
    )
  }

  // ============================================================================
  // Layer Management (Z-Index)
  // ============================================================================

  function toFront(ids: string[]) {
    ctx.setState('diagram', 'orderList', list => {
      const remaining = list.filter(id => !ids.includes(id))
      const moving = list.filter(id => ids.includes(id))
      return [...remaining, ...moving]
    })
  }

  function toBack(ids: string[]) {
    ctx.setState('diagram', 'orderList', list => {
      const remaining = list.filter(id => !ids.includes(id))
      const moving = list.filter(id => ids.includes(id))
      return [...moving, ...remaining]
    })
  }

  function bringForward(ids: string[]) {
    ctx.setState('diagram', 'orderList', list => {
      const newList = [...list]
      // 从后往前处理，避免索引偏移
      for (let i = newList.length - 2; i >= 0; i--) {
        if (ids.includes(newList[i]) && !ids.includes(newList[i + 1])) {
          const temp = newList[i]
          newList[i] = newList[i + 1]
          newList[i + 1] = temp
        }
      }
      return newList
    })
  }

  function sendBackward(ids: string[]) {
    ctx.setState('diagram', 'orderList', list => {
      const newList = [...list]
      for (let i = 1; i < newList.length; i++) {
        if (ids.includes(newList[i]) && !ids.includes(newList[i - 1])) {
          const temp = newList[i]
          newList[i] = newList[i - 1]
          newList[i - 1] = temp
        }
      }
      return newList
    })
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
    elementCount,
    orderList,
    shapes,
    linkers,

    getById,
    getRelatedLinkers,

    create,
    add,
    remove,
    update,
    clear,
    move,
    align,
    distribute,
    group,
    ungroup,
    toFront,
    toBack,
    bringForward,
    sendBackward,
  }
}

export type ElementManager = ReturnType<typeof createElementManager>
