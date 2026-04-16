import { createRoot } from 'solid-js'
import { produce } from 'solid-js/store'
import { describe, expect, it } from 'vitest'
import { createLinker, createShape, type ShapeElement } from '../../../model'
import { createDesigner } from '../../create'

function withDesigner(run: (designer: ReturnType<typeof createDesigner>) => void) {
  createRoot(dispose => {
    const designer = createDesigner()
    try {
      run(designer)
    } finally {
      dispose()
    }
  })
}

function createShapeById(id: string, x: number, y: number, w = 80, h = 60) {
  return createShape({
    id,
    name: id,
    group: null,
    props: { x, y, w, h, angle: 0 },
  })
}

describe('element manager', () => {
  it('getRelatedLinkers/getInternalLinkerIds/getGroupElementIds 应返回稳定结果', () => {
    withDesigner(designer => {
      const a = createShapeById('el_rel_a', 0, 0)
      const b = createShapeById('el_rel_b', 100, 0)
      const c = createShapeById('el_rel_c', 200, 0)
      const linkerInternal = createLinker({
        id: 'el_rel_internal',
        name: 'el_rel_internal',
        group: null,
        from: { id: a.id, x: 80, y: 30, binding: { type: 'free' } },
        to: { id: b.id, x: 100, y: 30, binding: { type: 'free' } },
      })
      const linkerExternal = createLinker({
        id: 'el_rel_external',
        name: 'el_rel_external',
        group: null,
        from: { id: a.id, x: 80, y: 30, binding: { type: 'free' } },
        to: { id: c.id, x: 200, y: 30, binding: { type: 'free' } },
      })

      designer.element.add([
        { ...a, group: 'group_rel' },
        c,
        linkerExternal,
        { ...b, group: 'group_rel' },
        linkerInternal,
      ])

      expect(designer.element.getRelatedLinkers(a.id).map(linker => linker.id)).toEqual([
        linkerExternal.id,
        linkerInternal.id,
      ])
      expect(designer.element.getRelatedLinkers(b.id).map(linker => linker.id)).toEqual([linkerInternal.id])
      expect(designer.element.getInternalLinkerIds([a.id, b.id])).toEqual([linkerInternal.id])
      expect(designer.element.getGroupElementIds('group_rel')).toEqual([a.id, b.id])
    })
  })

  it('add/remove 应维护 elementMap 与 orderList', () => {
    withDesigner(designer => {
      const a = createShapeById('el_a', 0, 0)
      const b = createShapeById('el_b', 100, 0)

      designer.element.add([a, b])
      expect(designer.element.elementCount()).toBe(2)
      expect(designer.element.orderList()).toEqual([a.id, b.id])

      designer.element.remove(a.id)
      expect(designer.element.elementCount()).toBe(1)
      expect(designer.element.getElementById(a.id)).toBeUndefined()

      designer.element.remove(b)
      expect(designer.element.elementCount()).toBe(0)
      expect(designer.element.orderList()).toEqual([])
    })
  })

  it('remove 应同步清理父子层级引用', () => {
    withDesigner(designer => {
      const container = createShape({
        id: 'el_remove_container',
        name: 'el_remove_container',
        group: null,
        children: ['el_remove_child'],
        attribute: {
          ...createShape({}).attribute,
          container: true,
        },
        props: { x: 0, y: 0, w: 220, h: 180, angle: 0 },
      })
      const child = createShape({
        id: 'el_remove_child',
        name: 'el_remove_child',
        group: null,
        parent: container.id,
        props: { x: 40, y: 40, w: 80, h: 60, angle: 0 },
      })

      designer.element.add([container, child])
      designer.element.remove(child.id)
      expect(designer.element.getElementById<ShapeElement>(container.id)?.children).toEqual([])

      designer.element.add(child)
      designer.element.remove(container.id)
      expect(designer.element.getElementById<ShapeElement>(child.id)?.parent).toBeNull()
    })
  })

  it('remove 应忽略重复和不存在的 id', () => {
    withDesigner(designer => {
      const a = createShapeById('el_remove_dedupe_a', 0, 0)
      const b = createShapeById('el_remove_dedupe_b', 100, 0)
      designer.element.add([a, b])

      designer.element.remove([a.id, a.id, 'missing-remove-id'])

      expect(designer.element.getElementById(a.id)).toBeUndefined()
      expect(designer.element.getElementById(b.id)).toBeDefined()
      expect(designer.element.orderList()).toEqual([b.id])
      expect(designer.element.elementCount()).toBe(1)
    })
  })

  it('update 应支持根级/路径/嵌套路径三种写法', () => {
    withDesigner(designer => {
      const a = createShapeById('el_update', 0, 0)
      designer.element.add(a)

      designer.element.update(a.id, 'name', 'el_update_next')
      expect(designer.element.getElementById(a.id)?.name).toBe('el_update_next')

      designer.element.update(a.id, 'props', 'x', 200)
      expect(designer.element.getElementById<ShapeElement>(a.id)?.props.x).toBe(200)

      designer.element.update(
        a.id,
        produce(el => {
          if (!el) return
          el.visible = false
        }),
      )
      expect(designer.element.getElementById(a.id)?.visible).toBe(false)
    })
  })

  it('move 应同步移动 shape 与 linker 控制点', () => {
    withDesigner(designer => {
      const shape = createShapeById('el_move_shape', 10, 20)
      const linker = createLinker({
        id: 'el_move_linker',
        name: 'el_move_linker',
        from: { id: shape.id, x: 20, y: 30, binding: { type: 'free' } },
        to: { id: null, x: 120, y: 130, binding: { type: 'free' } },
        points: [{ x: 40, y: 50 }],
      })

      designer.element.add([shape, linker])
      designer.element.move([shape.id, linker.id], 15, -5)

      expect(designer.element.getElementById<ShapeElement>(shape.id)?.props).toMatchObject({ x: 25, y: 15 })
      const movedLinker = designer.element.getElementById(linker.id)
      expect(movedLinker && 'from' in movedLinker ? movedLinker.from : null).toMatchObject({ x: 35, y: 25 })
      expect(movedLinker && 'to' in movedLinker ? movedLinker.to : null).toMatchObject({ x: 135, y: 125 })
      expect(movedLinker && 'points' in movedLinker ? movedLinker.points[0] : null).toMatchObject({ x: 55, y: 45 })
    })
  })

  it('toFront/toBack/moveForward/moveBackward 应按预期调整顺序', () => {
    withDesigner(designer => {
      const a = createShapeById('el_layer_a', 0, 0)
      const b = createShapeById('el_layer_b', 100, 0)
      const c = createShapeById('el_layer_c', 200, 0)
      designer.element.add([a, b, c])

      designer.element.toFront([a.id])
      expect(designer.element.orderList()).toEqual([b.id, c.id, a.id])

      designer.element.toBack([a.id])
      expect(designer.element.orderList()).toEqual([a.id, b.id, c.id])

      designer.element.moveForward([a.id])
      expect(designer.element.orderList()).toEqual([b.id, a.id, c.id])

      designer.element.moveBackward([a.id])
      expect(designer.element.orderList()).toEqual([a.id, b.id, c.id])
    })
  })

  it('align/distribute 应更新几何位置', () => {
    withDesigner(designer => {
      const a = createShapeById('el_align_a', 0, 0, 50, 40)
      const b = createShapeById('el_align_b', 30, 100, 50, 40)
      const c = createShapeById('el_align_c', 300, 220, 50, 40)
      designer.element.add([a, b, c])

      designer.element.align([a.id, b.id, c.id], 'left')
      const xValues = [a.id, b.id, c.id].map(id => designer.element.getElementById<ShapeElement>(id)?.props.x)
      expect(xValues).toEqual([0, 0, 0])

      designer.element.update(b.id, 'props', 'x', 30)
      designer.element.update(c.id, 'props', 'x', 300)
      designer.element.distribute([a.id, b.id, c.id], 'horizontal')

      expect(designer.element.getElementById<ShapeElement>(a.id)?.props.x).toBe(0)
      expect(designer.element.getElementById<ShapeElement>(b.id)?.props.x).toBe(150)
      expect(designer.element.getElementById<ShapeElement>(c.id)?.props.x).toBe(300)
    })
  })
})
