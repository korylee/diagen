import type { Designer } from '@diagen/core'
import type { PanelItemData } from '@diagen/components'

import { createShapeLibraryBridge } from './createShapeLibraryBridge'
import type { SidebarBridge } from './types'

export function createSidebarBridge(designer: Designer): SidebarBridge {
  const shapeLibrary = createShapeLibraryBridge(designer)

  function getItemById(id: string): PanelItemData | undefined {
    for (const section of shapeLibrary.sections()) {
      const matched = section.items.find(item => item.id === id)
      if (matched) return matched
    }
    return undefined
  }

  function execute(id: string): boolean {
    const item = getItemById(id)
    if (!item || item.disabled || !item.onSelect) return false
    item.onSelect()
    return true
  }

  return {
    sections: shapeLibrary.sections,
    activeItemId: shapeLibrary.activeItemId,
    getItemById,
    execute,
  }
}
