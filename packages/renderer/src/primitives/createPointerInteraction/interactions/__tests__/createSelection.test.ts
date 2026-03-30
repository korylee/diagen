import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createDesigner, createShape } from '@diagen/core'
import { createSelection } from '../createSelection'

const testContext = vi.hoisted(() => ({
  designer: null as ReturnType<typeof createDesigner> | null,
}))

vi.mock('../../../../components', () => ({
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
    selectionBox: ReturnType<typeof createSelection>
  }) => void,
) {
  createRoot(dispose => {
    const designer = createDesigner({
      autoGrow: {
        enabled: false,
      },
    })

    testContext.designer = designer
    const selectionBox = createSelection({
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

function createShapeById(id: string, x: number, y: number, w = 100, h = 80) {
  return createShape({
    id,
    name: id,
    group: null,
    props: { x, y, w, h, angle: 0 },
  })
}

describe('createSelection', () => {
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
})
