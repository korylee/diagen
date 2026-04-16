import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createDesigner, createShape } from '@diagen/core'
import { createBoxSelection } from './createBoxSelection'

const testContext = vi.hoisted(() => ({
  designer: null as ReturnType<typeof createDesigner> | null,
}))

vi.mock('../../../context', () => ({
  useDesigner: () => {
    if (!testContext.designer) {
      throw new Error('designer context is not ready')
    }
    return testContext.designer
  },
}))

function withSelection(
  options: { minSize?: number },
  run: (context: {
    designer: ReturnType<typeof createDesigner>
    selectionBox: ReturnType<typeof createBoxSelection>
  }) => void,
) {
  createRoot(dispose => {
    const designer = createDesigner({
      autoGrow: {
        enabled: false,
      },
    })

    testContext.designer = designer
    const selectionBox = createBoxSelection({
      minSize: options.minSize,
    })

    try {
      run({ designer, selectionBox })
    } finally {
      testContext.designer = null
      dispose()
    }
  })
}

function createShapeById(
  id: string,
  x: number,
  y: number,
  w = 100,
  h = 80,
  options: {
    parent?: string | null
    children?: string[]
    container?: boolean
  } = {},
) {
  return createShape({
    id,
    name: id,
    group: null,
    parent: options.parent ?? null,
    children: options.children ?? [],
    attribute: {
      ...createShape({}).attribute,
      container: options.container ?? false,
    },
    props: { x, y, w, h, angle: 0 },
  })
}

describe('createBoxSelection', () => {
  it('重复 start 时应返回 false', () => {
    withSelection({}, ({ selectionBox }) => {
      expect(selectionBox.start({ x: 0, y: 0 })).toBe(true)
      expect(selectionBox.start({ x: 10, y: 10 })).toBe(false)
      expect(selectionBox.isActive()).toBe(true)
    })
  })

  it('应在框选结束后选中命中的图形', () => {
    withSelection({ minSize: 5 }, ({ designer, selectionBox }) => {
      const shapeA = createShapeById('shape-a', 10, 10, 40, 30)
      const shapeB = createShapeById('shape-b', 120, 20, 40, 30)
      designer.edit.add([shapeA, shapeB], { record: false, select: false })

      expect(selectionBox.start({ x: 0, y: 0 })).toBe(true)
      selectionBox.move({ x: 80, y: 60 })
      selectionBox.end()

      expect(designer.selection.selectedIds()).toEqual([shapeA.id])
      expect(selectionBox.isActive()).toBe(false)
      expect(selectionBox.bounds()).toBeNull()
    })
  })

  it('框选命中容器与子元素时，应保持实际命中的元素集合', () => {
    withSelection({ minSize: 5 }, ({ designer, selectionBox }) => {
      const container = createShapeById('container_box', 0, 0, 260, 180, {
        container: true,
        children: ['container_box_child'],
      })
      const child = createShapeById('container_box_child', 40, 40, 80, 60, {
        parent: container.id,
      })
      designer.edit.add([container, child], { record: false, select: false })

      expect(selectionBox.start({ x: 20, y: 20 })).toBe(true)
      selectionBox.move({ x: 140, y: 120 })
      selectionBox.end()

      expect(designer.selection.selectedIds()).toEqual([container.id, child.id])
    })
  })

  it('框选仅命中容器时，不应自动补选子元素', () => {
    withSelection({ minSize: 5 }, ({ designer, selectionBox }) => {
      const container = createShapeById('container_only_box', 0, 0, 260, 180, {
        container: true,
        children: ['container_only_box_child'],
      })
      const child = createShapeById('container_only_box_child', 120, 80, 80, 60, {
        parent: container.id,
      })
      designer.edit.add([container, child], { record: false, select: false })

      expect(selectionBox.start({ x: 0, y: 0 })).toBe(true)
      selectionBox.move({ x: 70, y: 50 })
      selectionBox.end()

      expect(designer.selection.selectedIds()).toEqual([container.id])
    })
  })
})
