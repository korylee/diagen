import { createMemo } from 'solid-js'
import type { Designer } from '@diagen/core'
import type { SidebarSection } from '@diagen/ui'

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
): SidebarSection {
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
        icon: renderDesignerIcon('group', iconRegistry, { size: 16, class: 'sidebar-chip-icon', color: '#be123c' }),
        keywords: ['group', 'arrange', 'selection'],
        disabled: !options.canGroup,
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
        icon: renderDesignerIcon('ungroup', iconRegistry, {
          size: 16,
          class: 'sidebar-chip-icon',
          color: '#475569',
        }),
        keywords: ['ungroup', 'arrange', 'selection'],
        disabled: !options.canUngroup,
        onSelect: () => {
          const groups = designer.group.getGroupsFromElements(designer.selection.selectedIds())
          groups.forEach(groupId => designer.group.ungroup(groupId))
        },
      },
      {
        id: 'action:delete',
        label: 'Delete Selection',
        description: '删除当前选中元素',
        icon: renderDesignerIcon('delete', iconRegistry, { size: 16, class: 'sidebar-chip-icon', color: '#dc2626' }),
        keywords: ['delete', 'remove', 'selection'],
        disabled: !options.canDelete,
        onSelect: () => {
          const ids = designer.selection.selectedIds()
          if (ids.length === 0) return
          designer.removeElements(ids)
        },
      },
    ],
  }
}

function createHistorySection(
  designer: Designer,
  options: {
    canUndo: boolean
    canRedo: boolean
  },
  iconRegistry: DesignerIconRegistry,
): SidebarSection {
  return {
    id: 'actions:history',
    title: '历史与视图',
    meta: '3',
    layout: 'list',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      {
        id: 'action:undo',
        label: 'Undo',
        description: '撤销上一步操作',
        icon: renderDesignerIcon('undo', iconRegistry, { size: 16, class: 'sidebar-chip-icon', color: '#1d4ed8' }),
        keywords: ['undo', 'history'],
        disabled: !options.canUndo,
        onSelect: () => {
          designer.undo()
        },
      },
      {
        id: 'action:redo',
        label: 'Redo',
        description: '重做已撤销操作',
        icon: renderDesignerIcon('redo', iconRegistry, { size: 16, class: 'sidebar-chip-icon', color: '#0369a1' }),
        keywords: ['redo', 'history'],
        disabled: !options.canRedo,
        onSelect: () => {
          designer.redo()
        },
      },
      {
        id: 'action:fit',
        label: 'Fit To Content',
        description: '适配当前内容范围',
        icon: renderDesignerIcon('fit', iconRegistry, { size: 16, class: 'sidebar-chip-icon', color: '#15803d' }),
        keywords: ['fit', 'view', 'zoom'],
        onSelect: () => {
          designer.view.fitToContent()
        },
      },
    ],
  }
}

export function createSidebarActionBridge(designer: Designer, options: CreateSidebarActionBridgeOptions = {}) {
  const iconRegistry = createDesignerIconRegistry(options.iconRegistry)
  const selectionCount = createMemo<number>(() => designer.selection.selectedIds().length)
  const selectedGroupCount = createMemo<number>(() => designer.group.getGroupsFromElements(designer.selection.selectedIds()).size)
  const canGroup = createMemo<boolean>(() => selectionCount() > 1)
  const canUngroup = createMemo<boolean>(() => selectedGroupCount() > 0)
  const canDelete = createMemo<boolean>(() => selectionCount() > 0)
  const canUndo = createMemo<boolean>(() => designer.canUndo())
  const canRedo = createMemo<boolean>(() => designer.canRedo())

  const sections = createMemo<readonly SidebarSection[]>(() => [
    createArrangeSection(
      designer,
      {
        canGroup: canGroup(),
        canUngroup: canUngroup(),
        canDelete: canDelete(),
      },
      iconRegistry,
    ),
    createHistorySection(
      designer,
      {
        canUndo: canUndo(),
        canRedo: canRedo(),
      },
      iconRegistry,
    ),
  ])

  return {
    sections,
  }
}

export type SidebarActionBridge = ReturnType<typeof createSidebarActionBridge>
