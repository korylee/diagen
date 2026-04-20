import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
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

describe('tool manager', () => {
  it('默认应处于 idle 状态', () => {
    withDesigner(designer => {
      expect(designer.tool.toolState()).toEqual({ type: 'idle' })
      expect(designer.tool.isIdle()).toBe(true)
    })
  })

  it('应支持切换到 create-shape 并清空', () => {
    withDesigner(designer => {
      designer.tool.setCreateShape('rectangle')

      expect(designer.tool.toolState()).toEqual({
        type: 'create-shape',
        shapeId: 'rectangle',
        continuous: true,
      })

      designer.tool.setIdle()
      expect(designer.tool.toolState()).toEqual({ type: 'idle' })
    })
  })

  it('应支持切换到 create-linker 并保留连续模式配置', () => {
    withDesigner(designer => {
      designer.tool.setCreateLinker('curve_linker', { continuous: false })

      expect(designer.tool.toolState()).toEqual({
        type: 'create-linker',
        linkerId: 'curve_linker',
        continuous: false,
      })
    })
  })

  it('toggleCreateShape / toggleCreateLinker 应支持开关行为', () => {
    withDesigner(designer => {
      designer.tool.toggleCreateShape('rectangle')
      expect(designer.tool.toolState().type).toBe('create-shape')

      designer.tool.toggleCreateShape('rectangle')
      expect(designer.tool.toolState()).toEqual({ type: 'idle' })

      designer.tool.toggleCreateLinker('linker')
      expect(designer.tool.toolState().type).toBe('create-linker')

      designer.tool.toggleCreateLinker('linker')
      expect(designer.tool.toolState()).toEqual({ type: 'idle' })
    })
  })

  it('setContinuous 应更新当前创建工具的连续模式', () => {
    withDesigner(designer => {
      designer.tool.setCreateShape('rectangle', { continuous: true })
      designer.tool.setContinuous(false)

      expect(designer.tool.toolState()).toEqual({
        type: 'create-shape',
        shapeId: 'rectangle',
        continuous: false,
      })

      designer.tool.setCreateLinker('curve_linker', { continuous: false })
      designer.tool.setContinuous(true)

      expect(designer.tool.toolState()).toEqual({
        type: 'create-linker',
        linkerId: 'curve_linker',
        continuous: true,
      })
    })
  })

  it('setContinuous 在 idle 时应保持无变化', () => {
    withDesigner(designer => {
      designer.tool.setContinuous(false)
      expect(designer.tool.toolState()).toEqual({ type: 'idle' })
    })
  })
})
