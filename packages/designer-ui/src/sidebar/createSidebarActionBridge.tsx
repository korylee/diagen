import { createMemo } from 'solid-js'
import type { Designer } from '@diagen/core'
import type { PanelSectionData } from '@diagen/ui'

import {
  createDesignerIconRegistry,
  renderDesignerIcon,
  type DesignerIconRegistry,
  type DesignerIconRegistryOverrides,
} from '../designerIconRegistry'

export interface CreateSidebarActionBridgeOptions {
  iconRegistry?: DesignerIconRegistryOverrides
}

function createArrangeSection(
  designer: Designer,
  options: {
    canGroup: boolean
    canUngroup: boolean
    canDelete: boolean
  },
  iconRegistry: DesignerIconRegistry,
): PanelSectionData {
  return {
    id: 'actions:arrange',
    title: '排列与选择',
    meta: '3',
    layout: 'list',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      {
        id: 'action:group',
        label: 'Group',
        description: '对当前选择创建分组',
        leading: renderDesignerIcon('group', iconRegistry, { size: 16, class: 'sidebar-chip-icon', color: '#be123c' }),
        disabled: !options.canGroup,
        keywords: ['group', 'arrange', 'selection'],
        onSelect: () => {
          const ids = designer.selection.selectedIds()
          if (ids.length < 2) return
          designer.group.group(ids)
        },
      },
      {
        id: 'action:ungroup',
        label: 'Ungroup',
        description: '解散当前选中分组',
        leading: renderDesignerIcon('ungroup', iconRegistry, {
          size: 16,
          class: 'sidebar-chip-icon',
          color: '#475569',
        }),
        disabled: !options.canUngroup,
        keywords: ['ungroup', 'arrange', 'selection'],
        onSelect: () => {
          const groups = designer.group.getGroupsFromElements(designer.selection.selectedIds())
          groups.forEach(groupId => designer.group.ungroup(groupId))
        },
      },
      {
        id: 'action:delete',
        label: 'Delete Selection',
        description: '删除当前选中元素',
        leading: renderDesignerIcon('delete', iconRegistry, { size: 16, class: 'sidebar-chip-icon', color: '#dc2626' }),
        disabled: !options.canDelete,
        keywords: ['delete', 'remove', 'selection'],
        onSelect: () => {
          const ids = designer.selection.selectedIds()
          if (ids.length === 0) return
          designer.removeElements(ids)
        },
      },
    ],
  }
}

export function createSidebarActionBridge(designer: Designer, options: CreateSidebarActionBridgeOptions = {}) {
  const iconRegistry = createDesignerIconRegistry(options.iconRegistry)
  const selectionCount = createMemo<number>(() => designer.selection.selectedIds().length)
  const selectedGroupCount = createMemo<number>(
    () => designer.group.getGroupsFromElements(designer.selection.selectedIds()).size,
  )
  const canGroup = createMemo<boolean>(() => selectionCount() > 1)
  const canUngroup = createMemo<boolean>(() => selectedGroupCount() > 0)
  const canDelete = createMemo<boolean>(() => selectionCount() > 0)
  const canUndo = createMemo<boolean>(() => designer.canUndo())
  const canRedo = createMemo<boolean>(() => designer.canRedo())

  const sections = createMemo<readonly PanelSectionData[]>(() => [
    createArrangeSection(
      designer,
      {
        canGroup: canGroup(),
        canUngroup: canUngroup(),
        canDelete: canDelete(),
      },
      iconRegistry,
    ),
  ])

  return {
    sections,
  }
}

export type SidebarActionBridge = ReturnType<typeof createSidebarActionBridge>
