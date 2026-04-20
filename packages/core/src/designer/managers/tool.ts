import { createMemo } from 'solid-js'
import { reconcile } from 'solid-js/store'
import type { DesignerContext } from './types'
import type { DesignerToolState } from '../types'

export interface CreateToolOptions {
  continuous?: boolean
}

export function createToolManager(ctx: DesignerContext) {
  const toolState = createMemo<DesignerToolState>(() => ctx.state.tool)
  const isIdle = createMemo(() => toolState().type === 'idle')

  function setTool(next: DesignerToolState): void {
    ctx.setState('tool', reconcile(next))
  }

  function setIdle(): void {
    setTool({ type: 'idle' })
  }

  function setCreateShape(shapeId: string, options: CreateToolOptions = {}): void {
    setTool({
      type: 'create-shape',
      shapeId,
      continuous: options.continuous ?? true,
    })
  }

  function setCreateLinker(linkerId = 'linker', options: CreateToolOptions = {}): void {
    setTool({
      type: 'create-linker',
      linkerId,
      continuous: options.continuous ?? true,
    })
  }

  function setContinuous(continuous: boolean): void {
    const current = toolState()

    if (current.type === 'idle' || current.continuous === continuous) {
      return
    }

    if (current.type === 'create-shape') {
      setCreateShape(current.shapeId, { continuous })
      return
    }

    setCreateLinker(current.linkerId, { continuous })
  }

  function toggleCreateTool(type: 'create-shape', shapeId: string, options?: CreateToolOptions): void
  function toggleCreateTool(type: 'create-linker', linkerId: string, options?: CreateToolOptions): void
  function toggleCreateTool(type: 'create-shape' | 'create-linker', elId: string, options?: CreateToolOptions): void {
    const current = toolState()

    if (type === 'create-shape') {
      if (current.type === 'create-shape' && current.shapeId === elId) {
        setIdle()
        return
      }

      setCreateShape(elId, options)
      return
    }

    if (current.type === 'create-linker' && current.linkerId === elId) {
      setIdle()
      return
    }

    setCreateLinker(elId, options)
  }

  function toggleCreateShape(shapeId: string, options: CreateToolOptions = {}): void {
    toggleCreateTool('create-shape', shapeId, options)
  }

  function toggleCreateLinker(linkerId = 'linker', options: CreateToolOptions = {}): void {
    toggleCreateTool('create-linker', linkerId, options)
  }

  return {
    toolState,

    isIdle,
    setIdle,
    clear: setIdle,
    setCreateShape,
    setCreateLinker,
    setContinuous,
    toggleCreateShape,
    toggleCreateLinker,
  }
}

export type ToolManager = ReturnType<typeof createToolManager>
