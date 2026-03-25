import type { Accessor } from 'solid-js'
import type { PanelItemData, PanelSectionData } from '@diagen/components'

export interface SidebarBridge {
  sections: Accessor<readonly PanelSectionData[]>
  activeItemId: Accessor<string | undefined>
  getItemById: (id: string) => PanelItemData | undefined
  execute: (id: string) => boolean
}
