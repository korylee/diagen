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

describe('group manager', () => {
  it('group 应过滤无效/重复 ID，并按 orderList 生效', () => {
    withDesigner(designer => {
      const shapeA = createShape({
        id: 'shape_a',
        name: 'shape_a',
        group: null,
        props: { x: 0, y: 0, w: 100, h: 80, angle: 0 },
      })
      const shapeB = createShape({
        id: 'shape_b',
        name: 'shape_b',
        group: null,
        props: { x: 200, y: 0, w: 100, h: 80, angle: 0 },
      })
      designer.edit.add([shapeB, shapeA], { record: false, select: false })

      const groupId = designer.group.group([shapeA.id, 'missing', shapeA.id, shapeB.id], {
        record: false,
        groupId: 'group_1',
      })

      expect(groupId).toBe('group_1')
      expect(designer.getElementById(shapeA.id)?.group).toBe('group_1')
      expect(designer.getElementById(shapeB.id)?.group).toBe('group_1')
      expect(designer.group.getGroupElementIds('group_1')).toEqual([shapeB.id, shapeA.id])
    })
  })

  it('group 在目标分组不变化时不应写入 history', () => {
    withDesigner(designer => {
      const shapeA = createShape({
        id: 'shape_c',
        name: 'shape_c',
        group: 'group_2',
        props: { x: 0, y: 0, w: 100, h: 80, angle: 0 },
      })
      const shapeB = createShape({
        id: 'shape_d',
        name: 'shape_d',
        group: 'group_2',
        props: { x: 200, y: 0, w: 100, h: 80, angle: 0 },
      })
      designer.edit.add([shapeA, shapeB], { record: false, select: false })

      const groupId = designer.group.group([shapeA.id, shapeB.id], { record: true, groupId: 'group_2' })
      expect(groupId).toBe('group_2')
      expect(designer.canUndo()).toBe(false)
    })
  })

  it('group/ungroup 应支持 undo/redo', () => {
    withDesigner(designer => {
      const shapeA = createShape({
        id: 'shape_e',
        name: 'shape_e',
        group: null,
        props: { x: 0, y: 0, w: 100, h: 80, angle: 0 },
      })
      const shapeB = createShape({
        id: 'shape_f',
        name: 'shape_f',
        group: null,
        props: { x: 200, y: 0, w: 100, h: 80, angle: 0 },
      })
      designer.edit.add([shapeA, shapeB], { record: false, select: false })

      const groupId = designer.group.group([shapeA.id, shapeB.id], { groupId: 'group_3' })
      expect(groupId).toBe('group_3')
      expect(designer.getElementById(shapeA.id)?.group).toBe('group_3')
      expect(designer.getElementById(shapeB.id)?.group).toBe('group_3')

      designer.undo()
      expect(designer.getElementById(shapeA.id)?.group).toBeNull()
      expect(designer.getElementById(shapeB.id)?.group).toBeNull()

      designer.redo()
      expect(designer.getElementById(shapeA.id)?.group).toBe('group_3')
      expect(designer.getElementById(shapeB.id)?.group).toBe('group_3')

      designer.group.ungroup('group_3')
      expect(designer.getElementById(shapeA.id)?.group).toBeNull()
      expect(designer.getElementById(shapeB.id)?.group).toBeNull()
    })
  })

  it('ungroupByElements 应展开同组元素', () => {
    withDesigner(designer => {
      const shapeA = createShape({
        id: 'shape_g',
        name: 'shape_g',
        group: 'group_4',
        props: { x: 0, y: 0, w: 100, h: 80, angle: 0 },
      })
      const shapeB = createShape({
        id: 'shape_h',
        name: 'shape_h',
        group: 'group_4',
        props: { x: 200, y: 0, w: 100, h: 80, angle: 0 },
      })
      designer.edit.add([shapeA, shapeB], { record: false, select: false })

      const affected = designer.group.ungroupByElements([shapeA.id], { record: false })

      expect(affected).toEqual([shapeA.id, shapeB.id])
      expect(designer.getElementById(shapeA.id)?.group).toBeNull()
      expect(designer.getElementById(shapeB.id)?.group).toBeNull()
    })
  })
})
