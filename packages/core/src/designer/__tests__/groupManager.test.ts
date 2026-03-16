import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { createLinker, createShape } from '../../model'
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
      expect(designer.group.getGroupMemberIds('group_1')).toEqual([shapeB.id, shapeA.id])
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

  it('resolveSelectionForClipboard 应分组展开并补齐内部连线，且顺序稳定', () => {
    withDesigner(designer => {
      const shapeA = createShape({
        id: 'shape_e',
        name: 'shape_e',
        group: 'group_3',
        props: { x: 0, y: 0, w: 100, h: 80, angle: 0 },
      })
      const shapeB = createShape({
        id: 'shape_f',
        name: 'shape_f',
        group: 'group_3',
        props: { x: 200, y: 0, w: 100, h: 80, angle: 0 },
      })
      const shapeC = createShape({
        id: 'shape_g',
        name: 'shape_g',
        group: null,
        props: { x: 400, y: 0, w: 100, h: 80, angle: 0 },
      })
      const internalLinker = createLinker({
        id: 'linker_internal',
        name: 'linker_internal',
        from: { id: shapeA.id, x: 0, y: 0, binding: { type: 'free' } },
        to: { id: shapeB.id, x: 0, y: 0, binding: { type: 'free' } },
      })
      const externalLinker = createLinker({
        id: 'linker_external',
        name: 'linker_external',
        from: { id: shapeA.id, x: 0, y: 0, binding: { type: 'free' } },
        to: { id: shapeC.id, x: 0, y: 0, binding: { type: 'free' } },
      })

      designer.edit.add([shapeB, shapeC, externalLinker, shapeA, internalLinker], {
        record: false,
        select: false,
      })

      const fromManager = designer.group.resolveSelectionForClipboard([shapeA.id])
      const fromShortcut = designer.resolveSelectionForClipboard([shapeA.id])

      expect(fromManager).toEqual([shapeB.id, shapeA.id, internalLinker.id])
      expect(fromShortcut).toEqual(fromManager)
      expect(fromManager.includes(externalLinker.id)).toBe(false)
    })
  })
})
