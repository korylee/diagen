import type { Accessor } from 'solid-js'
import type { SidebarItem, SidebarSection } from '@diagen/ui'

export interface SidebarBridge {
  sections: Accessor<readonly SidebarSection[]>
  activeItemId: Accessor<string | undefined>
  getItemById: (id: string) => SidebarItem | undefined
  execute: (id: string) => boolean
}
