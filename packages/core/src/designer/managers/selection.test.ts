import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { createShape } from '../../model'
import { createDesigner } from '../create'

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

function createThreeShapes() {
  return [
    createShape({ id: 'sel_a', name: 'sel_a', props: { x: 0, y: 0, w: 80, h: 60, angle: 0 }, group: null }),
    createShape({ id: 'sel_b', name: 'sel_b', props: { x: 120, y: 0, w: 80, h: 60, angle: 0 }, group: null }),
    createShape({ id: 'sel_c', name: 'sel_c', props: { x: 240, y: 0, w: 80, h: 60, angle: 0 }, group: null }),
  ]
}

describe('selection manager', () => {
  it('select 应去重并维护选中状态', () => {
    withDesigner(designer => {
      const [a] = createThreeShapes()
      designer.edit.add([a], { record: false, select: false })

      designer.selection.select(a.id)
      designer.selection.select(a.id)

      expect(designer.selection.selectedIds()).toEqual([a.id])
      expect(designer.selection.isSelected(a.id)).toBe(true)
    })
  })

  it('replace 应完全替换选区', () => {
    withDesigner(designer => {
      const [a, b, c] = createThreeShapes()
      designer.edit.add([a, b, c], { record: false, select: false })

      designer.selection.select([a.id, b.id])
      expect(designer.selection.hasMultiple()).toBe(true)

      designer.selection.replace([c.id])
      expect(designer.selection.selectedIds()).toEqual([c.id])
      expect(designer.selection.hasMultiple()).toBe(false)
    })
  })

  it('deselect 仅移除指定元素', () => {
    withDesigner(designer => {
      const [a, b] = createThreeShapes()
      designer.edit.add([a, b], { record: false, select: false })

      designer.selection.select([a.id, b.id])
      designer.selection.deselect(a.id)

      expect(designer.selection.selectedIds()).toEqual([b.id])
      expect(designer.selection.isSelected(a.id)).toBeFalsy()
      expect(designer.selection.isSelected(b.id)).toBe(true)
    })
  })

  it('selectAll 应选中当前所有元素', () => {
    withDesigner(designer => {
      const shapes = createThreeShapes()
      designer.edit.add(shapes, { record: false, select: false })

      designer.selection.selectAll()

      expect(new Set(designer.selection.selectedIds())).toEqual(new Set(shapes.map(shape => shape.id)))
      expect(designer.selection.hasMultiple()).toBe(true)
    })
  })

  it('clear 在非空选区下应清空选中项', () => {
    withDesigner(designer => {
      const [a, b] = createThreeShapes()
      designer.edit.add([a, b], { record: false, select: false })

      designer.selection.select([a.id, b.id])
      designer.selection.clear()

      expect(designer.selection.selectedIds()).toEqual([])
      expect(designer.selection.isEmpty()).toBe(true)
    })
  })

  it('clear 在空选区下应保持 no-op', () => {
    withDesigner(designer => {
      expect(designer.selection.isEmpty()).toBe(true)
      designer.selection.clear()
      expect(designer.selection.selectedIds()).toEqual([])
    })
  })

  it('选中容器时不应自动补齐子元素', () => {
    withDesigner(designer => {
      const container = createShape({
        id: 'sel_container',
        name: 'sel_container',
        parent: null,
        children: ['sel_child'],
        attribute: {
          ...createShape({}).attribute,
          container: true,
        },
        props: { x: 0, y: 0, w: 260, h: 180, angle: 0 },
        group: null,
      })
      const child = createShape({
        id: 'sel_child',
        name: 'sel_child',
        parent: container.id,
        props: { x: 40, y: 40, w: 80, h: 60, angle: 0 },
        group: null,
      })

      designer.edit.add([container, child], { record: false, select: false })
      designer.selection.replace([container.id])

      expect(designer.selection.selectedIds()).toEqual([container.id])
      expect(designer.selection.isSelected(child.id)).toBe(false)
    })
  })
})
