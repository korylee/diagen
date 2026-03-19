import { createMemo } from 'solid-js'
import { reconcile } from 'solid-js/store'
import type { DesignerContext } from './types'
import type { DesignerToolState } from '../types'

export interface SetShapeToolOptions {
  continuous?: boolean
}

export interface SetLinkerToolOptions {
  continuous?: boolean
}

export function createToolManager(ctx: DesignerContext) {
  const tool = createMemo<DesignerToolState>(() => ctx.state.tool)

  function setIdle(): void {
    ctx.setState('tool', reconcile({ type: 'idle' }))
  }

  function setCreateShape(shapeId: string, options: SetShapeToolOptions = {}): void {
    ctx.setState(
      'tool',
      reconcile({
        type: 'create-shape',
        shapeId,
        continuous: options.continuous ?? true,
      }),
    )
  }

  function setCreateLinker(linkerId = 'linker', options: SetLinkerToolOptions = {}): void {
    ctx.setState(
      'tool',
      reconcile({
        type: 'create-linker',
        linkerId,
        continuous: options.continuous ?? true,
      }),
    )
  }

  function toggleCreateShape(shapeId: string, options: SetShapeToolOptions = {}): void {
    const current = tool()
    if (current.type === 'create-shape' && current.shapeId === shapeId) {
      setIdle()
      return
    }
    setCreateShape(shapeId, options)
  }

  function toggleCreateLinker(linkerId = 'linker', options: SetLinkerToolOptions = {}): void {
    const current = tool()
    if (current.type === 'create-linker' && current.linkerId === linkerId) {
      setIdle()
      return
    }
    setCreateLinker(linkerId, options)
  }

  function isIdle(): boolean {
    return tool().type === 'idle'
  }

  return {
    tool,
    isIdle,
    setIdle,
    clear: setIdle,
    setCreateShape,
    setCreateLinker,
    toggleCreateShape,
    toggleCreateLinker,
  }
}

export type ToolManager = ReturnType<typeof createToolManager>
