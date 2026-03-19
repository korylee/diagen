import { createRoot } from 'solid-js'
import { produce } from 'solid-js/store'
import { describe, expect, it } from 'vitest'
import { createShape, ShapeElement } from '../../model'
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

describe('edit manager', () => {
  it('patch 更新应支持 undo/redo', () => {
    withDesigner(designer => {
      const shape = createShape({
        id: 'shape_patch',
        name: 'shape_patch',
        group: null,
        props: { x: 10, y: 20, w: 100, h: 80, angle: 0 },
      })
      designer.edit.add([shape], { record: false, select: false })

      designer.edit.update(shape.id, { name: 'shape_patch_next' })
      expect(designer.getElementById(shape.id)?.name).toBe('shape_patch_next')
      expect(designer.canUndo()).toBe(true)

      designer.undo()
      expect(designer.getElementById(shape.id)?.name).toBe('shape_patch')

      designer.redo()
      expect(designer.getElementById(shape.id)?.name).toBe('shape_patch_next')
    })
  })

  it('k1 更新应支持 undo/redo', () => {
    withDesigner(designer => {
      const shape = createShape({
        id: 'shape_k1',
        name: 'shape_k1',
        group: null,
        props: { x: 0, y: 0, w: 100, h: 80, angle: 0 },
      })
      designer.edit.add([shape], { record: false, select: false })

      designer.edit.update(shape.id, 'name', 'shape_k1_next')
      expect(designer.getElementById(shape.id)?.name).toBe('shape_k1_next')

      designer.undo()
      expect(designer.getElementById(shape.id)?.name).toBe('shape_k1')
    })
  })

  it('k1+k2 更新应支持 undo/redo', () => {
    withDesigner(designer => {
      const shape = createShape({
        id: 'shape_k2',
        name: 'shape_k2',
        group: null,
        props: { x: 15, y: 25, w: 100, h: 80, angle: 0 },
      })
      designer.edit.add([shape], { record: false, select: false })

      designer.edit.update(shape.id, 'props', 'x', 200)
      expect(designer.getElementById<ShapeElement>(shape.id)?.props.x).toBe(200)

      designer.undo()
      expect(designer.getElementById<ShapeElement>(shape.id)?.props.x).toBe(15)

      designer.redo()
      expect(designer.getElementById<ShapeElement>(shape.id)?.props.x).toBe(200)
    })
  })

  it('同值更新不应写入 history', () => {
    withDesigner(designer => {
      const shape = createShape({
        id: 'shape_noop',
        name: 'shape_noop',
        group: null,
        props: { x: 30, y: 40, w: 100, h: 80, angle: 0 },
      })
      designer.edit.add([shape], { record: false, select: false })

      designer.edit.update(shape.id, { name: 'shape_noop' })
      expect(designer.canUndo()).toBe(false)

      designer.edit.update(shape.id, 'name', 'shape_noop')
      expect(designer.canUndo()).toBe(false)

      designer.edit.update(shape.id, 'props', 'x', 30)
      expect(designer.canUndo()).toBe(false)
    })
  })

  it('setter/produce 在无实际改动时不应写入 history', () => {
    withDesigner(designer => {
      const shape = createShape({
        id: 'shape_setter_noop',
        name: 'shape_setter_noop',
        group: null,
        props: { x: 50, y: 60, w: 100, h: 80, angle: 0 },
      })
      designer.edit.add([shape], { record: false, select: false })

      designer.edit.update(shape.id, produce(el => {}))
      expect(designer.canUndo()).toBe(false)

      designer.edit.update(shape.id, 'props', produce(props => {}))
      expect(designer.canUndo()).toBe(false)
    })
  })
})
