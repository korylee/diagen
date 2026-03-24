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

function createTestShape(id: string, x: number, group: string | null = null) {
  return createShape({
    id,
    name: id,
    group,
    props: { x, y: 0, w: 120, h: 80, angle: 0 },
  })
}

describe('clipboard manager', () => {
  it('copy 应展开 group 并补齐内部连线', () => {
    withDesigner(designer => {
      const shapeA = createTestShape('shape_a', 0, 'group_1')
      const shapeB = createTestShape('shape_b', 200, 'group_1')
      const shapeC = createTestShape('shape_c', 400)
      const internalLinker = createLinker({
        id: 'linker_internal',
        name: 'linker_internal',
        from: { id: shapeA.id, x: 120, y: 40, binding: { type: 'fixed', anchorId: 'right' } },
        to: { id: shapeB.id, x: 200, y: 40, binding: { type: 'perimeter', pathIndex: 0, segmentIndex: 3, t: 0.5 } },
      })
      const externalLinker = createLinker({
        id: 'linker_external',
        name: 'linker_external',
        from: { id: shapeA.id, x: 120, y: 40, binding: { type: 'fixed', anchorId: 'right' } },
        to: { id: shapeC.id, x: 400, y: 40, binding: { type: 'free' } },
      })

      designer.edit.add([shapeB, shapeC, externalLinker, shapeA, internalLinker], { record: false, select: false })

      const copied = designer.clipboard.copy([shapeA.id])
      const snapshot = designer.clipboard.peek()

      expect(copied).toBe(true)
      expect(snapshot?.orderedIds).toEqual([shapeB.id, shapeA.id, internalLinker.id])
      expect(snapshot?.sourceSelectionIds).toEqual([shapeA.id])
      expect(snapshot?.orderedIds.includes(externalLinker.id)).toBe(false)
    })
  })

  it('paste 应重映射 element/group/linker 引用，并保持内部绑定类型', () => {
    withDesigner(designer => {
      const shapeA = createTestShape('shape_d', 0, 'group_2')
      const shapeB = createTestShape('shape_e', 200, 'group_2')
      const internalLinker = createLinker({
        id: 'linker_grouped',
        name: 'linker_grouped',
        group: 'group_2',
        from: { id: shapeA.id, x: 120, y: 40, binding: { type: 'fixed', anchorId: 'right' } },
        to: { id: shapeB.id, x: 200, y: 40, binding: { type: 'perimeter', pathIndex: 0, segmentIndex: 3, t: 0.25 } },
        points: [{ x: 160, y: 40 }],
      })

      designer.edit.add([shapeA, shapeB, internalLinker], { record: false, select: false })
      designer.clipboard.copy([shapeA.id])

      const pastedIds = designer.clipboard.paste()
      const pastedElements = pastedIds.map(id => designer.getElementById(id))
      const pastedShapes = pastedElements.filter(element => element?.type === 'shape')
      const pastedLinker = pastedElements.find(element => element?.type === 'linker')

      expect(pastedIds).toHaveLength(3)
      expect(pastedShapes).toHaveLength(2)
      expect(pastedLinker?.id).not.toBe(internalLinker.id)

      const pastedGroupIds = new Set(pastedShapes.map(shape => shape?.group))
      expect(pastedGroupIds.size).toBe(1)
      expect(Array.from(pastedGroupIds)[0]).not.toBe('group_2')

      const pastedShapeIds = new Set(pastedShapes.map(shape => shape?.id))
      expect(pastedLinker?.from.id && pastedShapeIds.has(pastedLinker.from.id)).toBe(true)
      expect(pastedLinker?.to.id && pastedShapeIds.has(pastedLinker.to.id)).toBe(true)
      expect(pastedLinker?.from.binding.type).toBe('fixed')
      expect(pastedLinker?.to.binding.type).toBe('perimeter')
      expect(pastedLinker?.points[0]).toEqual({ x: 184, y: 64 })
    })
  })

  it('paste 对外部端点应降级为 free 绑定', () => {
    withDesigner(designer => {
      const shapeA = createTestShape('shape_f', 0)
      const shapeB = createTestShape('shape_g', 300)
      const externalLinker = createLinker({
        id: 'linker_external_endpoint',
        name: 'linker_external_endpoint',
        from: { id: shapeA.id, x: 120, y: 40, binding: { type: 'fixed', anchorId: 'right' } },
        to: { id: shapeB.id, x: 300, y: 40, binding: { type: 'perimeter', pathIndex: 0, segmentIndex: 1, t: 0.5 } },
      })

      designer.edit.add([shapeA, shapeB, externalLinker], { record: false, select: false })

      designer.clipboard.copy([shapeA.id, externalLinker.id])
      const pastedIds = designer.clipboard.paste()
      const pastedLinker = pastedIds
        .map(id => designer.getElementById(id))
        .find(element => element?.type === 'linker')

      expect(pastedLinker?.from.id).not.toBeNull()
      expect(pastedLinker?.from.binding.type).toBe('fixed')
      expect(pastedLinker?.to.id).toBeNull()
      expect(pastedLinker?.to.binding.type).toBe('free')
      expect(pastedLinker?.to.x).toBe(324)
      expect(pastedLinker?.to.y).toBe(64)
    })
  })

  it('duplicate 不应覆盖现有 clipboard snapshot', () => {
    withDesigner(designer => {
      const shapeA = createTestShape('shape_h', 0)
      const shapeB = createTestShape('shape_i', 200)
      designer.edit.add([shapeA, shapeB], { record: false, select: false })

      designer.clipboard.copy([shapeA.id])
      const before = designer.clipboard.peek()
      const duplicatedIds = designer.clipboard.duplicate([shapeB.id])
      const after = designer.clipboard.peek()

      expect(duplicatedIds).toHaveLength(1)
      expect(before).toEqual(after)
      expect(after?.orderedIds).toEqual([shapeA.id])
    })
  })

  it('cut 应删除元素且 undo 后可恢复', () => {
    withDesigner(designer => {
      const shape = createTestShape('shape_j', 0)
      designer.edit.add([shape], { record: false, select: false })

      const cut = designer.clipboard.cut([shape.id])

      expect(cut).toBe(true)
      expect(designer.getElementById(shape.id)).toBeUndefined()
      expect(designer.history.undoStack()).toHaveLength(1)

      designer.undo()
      expect(designer.getElementById(shape.id)?.id).toBe(shape.id)
    })
  })

  it('paste 应作为单个 undo 单元写入历史', () => {
    withDesigner(designer => {
      const shape = createTestShape('shape_k', 0)
      designer.edit.add([shape], { record: false, select: false })

      designer.clipboard.copy([shape.id])
      const pastedIds = designer.clipboard.paste()

      expect(designer.history.undoStack()).toHaveLength(1)
      expect(pastedIds.every(id => designer.getElementById(id))).toBe(true)

      designer.undo()
      expect(pastedIds.every(id => designer.getElementById(id) === undefined)).toBe(true)
      expect(designer.getElementById(shape.id)?.id).toBe(shape.id)
    })
  })
})
