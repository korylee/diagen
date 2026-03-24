import { createMemo } from 'solid-js'
import type { Designer } from '@diagen/core'
import type { SidebarItem } from '@diagen/ui'

import type { DesignerIconRegistryOverrides } from '../designerIconRegistry'
import { createShapeLibraryBridge } from './createShapeLibraryBridge'
import { createSidebarActionBridge } from './createSidebarActionBridge'
import type { SidebarBridge } from './types'

export interface CreateSidebarBridgeOptions {
  iconRegistry?: DesignerIconRegistryOverrides
}

export function createSidebarBridge(designer: Designer, options: CreateSidebarBridgeOptions = {}): SidebarBridge {
  const shapeLibrary = createShapeLibraryBridge(designer)
  const actions = createSidebarActionBridge(designer, {
    iconRegistry: options.iconRegistry,
  })

  const sections = createMemo(() => [...shapeLibrary.sections(), ...actions.sections()])

  function getItemById(id: string): SidebarItem | undefined {
    for (const section of sections()) {
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
    sections,
    activeItemId: shapeLibrary.activeItemId,
    getItemById,
    execute,
  }
}
