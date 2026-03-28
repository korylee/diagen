import type { Designer } from '@diagen/core'

export type SidebarCreationMode = 'single' | 'batch'

export function resolveCreationContinuous(creationMode: SidebarCreationMode): boolean {
  return creationMode === 'batch'
}

function toggleCreationTool(
  designer: Designer,
  config: {
    type: 'create-shape' | 'create-linker'
    id: string
  },
  creationMode: SidebarCreationMode,
): void {
  const { tool } = designer
  const current = tool.toolState()
  const isSameTool = () => {
    if (config.type !== current.type) return false
    const currentId = current.type === 'create-shape' ? current.shapeId : current.linkerId
    return currentId === config.id
  }

  if (isSameTool()) {
    tool.setIdle()
    return
  }

  const continuous = resolveCreationContinuous(creationMode)
  if (config.type === 'create-shape') {
    tool.setCreateShape(config.id, { continuous })
    return
  }

  tool.setCreateLinker(config.id, { continuous })
}

export function selectShapeCreationTool(designer: Designer, shapeId: string, creationMode: SidebarCreationMode): void {
  toggleCreationTool(designer, { type: 'create-shape', id: shapeId }, creationMode)
}

export function selectLinkerCreationTool(
  designer: Designer,
  linkerId: string,
  creationMode: SidebarCreationMode,
): void {
  toggleCreationTool(designer, { type: 'create-linker', id: linkerId }, creationMode)
}

export function syncCreationModeForActiveTool(designer: Designer, creationMode: SidebarCreationMode): void {
  const { tool } = designer
  const continuous = resolveCreationContinuous(creationMode)
  const current = tool.toolState()

  if (current.type === 'idle' || current.continuous === continuous) {
    return
  }

  if (current.type === 'create-shape') {
    tool.setCreateShape(current.shapeId, { continuous })
    return
  }

  tool.setCreateLinker(current.linkerId, { continuous })
}
