import { generateId } from '@diagen/shared'
import type { DiagramElement } from '../../model'
import type { EditManager, EditOptions } from './edit'
import type { DesignerContext } from './types'
import type { ElementManager } from './element'
import type { SelectionManager } from './selection'
import { createMemo } from 'solid-js'

interface CreateGroupManagerDeps {
  element: Pick<
    ElementManager,
    | 'orderElementIds'
    | 'getInternalLinkerIds'
    | 'getGroupElementIds'
    | 'getElementById'
    | 'getElementsByIds'
  >
  edit: Pick<EditManager, 'update'>
  selection: Pick<SelectionManager, 'selectedIds'>
}

export interface GroupOptions extends EditOptions {
  groupId?: string
}

export interface ResolveGroupSelectionOptions {
  /** 是否附带内部连线（两端端点都在当前选择集中） */
  includeInternalLinkers?: boolean
}

/**
 * 分组管理器：
 * - 负责 group 语义查询（同组判断、展开、clipboard 选择解析）
 * - 负责分组写操作，并复用 edit 的通用更新能力
 */
export function createGroupManager(_: DesignerContext, deps: CreateGroupManagerDeps) {
  const { edit, element, selection } = deps
  const selectedGroups = createMemo(() => _getGroupsFromElementIds(selection.selectedIds()))

  function getGroupElements(groupId: string): DiagramElement[] {
    const ids = getGroupElementIds(groupId)

    return element.getElementsByIds(ids)
  }

  function getGroupElementIds(groupId: string): string[] {
    return element.getGroupElementIds(groupId)
  }

  /**
   * 判断一组元素是否属于同一分组。
   */
  function isInSameGroup(ids: string[]): boolean {
    if (ids.length < 2) return false

    const first = element.getElementById(ids[0])
    if (!first?.group) return false

    const groupId = first.group
    for (const id of ids) {
      const el = element.getElementById(id)
      if (!el || el.group !== groupId) return false
    }
    return true
  }

  function getGroupsFromElementIds(ids: string[]) {
    const groups = new Set<string>()
    for (const id of ids) {
      const el = element.getElementById(id)
      if (el?.group) {
        groups.add(el.group)
      }
    }
    return groups
  }
  function _getGroupsFromElementIds(ids: string[]) {
    return Array.from(getGroupsFromElementIds(ids))
  }

  /**
   * 按 group 进行选择闭包展开：
   * - 若选中某个组内元素，则自动补齐该组所有成员
   * - 输出顺序稳定为 orderList（便于后续 Clipboard 保持层级）
   */
  function expandElementIdsByGroups(ids: string[]): string[] {
    const selected = new Set<string>()
    for (const id of ids) {
      if (element.getElementById(id)) selected.add(id)
    }

    const groups = getGroupsFromElementIds(Array.from(selected))
    for (const groupId of groups) {
      const members = getGroupElementIds(groupId)
      for (const memberId of members) {
        selected.add(memberId)
      }
    }
    return Array.from(selected)
  }

  function resolveSelection(ids: string[], options: ResolveGroupSelectionOptions = {}): string[] {
    const expanded = expandElementIdsByGroups(ids)
    if (!options.includeInternalLinkers) return element.orderElementIds(expanded)

    const linkerIds = element.getInternalLinkerIds(expanded)
    const merged = new Set(expanded)
    for (const linkerId of linkerIds) {
      merged.add(linkerId)
    }
    return element.orderElementIds(Array.from(merged))
  }

  function group(ids: string[], options: GroupOptions = {}): string | null {
    const { record = true } = options
    const targetIds = element.orderElementIds(ids)
    if (targetIds.length < 2) return null

    const groupId = options.groupId ?? generateId('group')
    const shouldUpdate = targetIds.some(id => element.getElementById(id)?.group !== groupId)
    if (!shouldUpdate) return groupId

    edit.update(targetIds, { group: groupId }, { record })
    return groupId
  }

  function ungroup(groupId: string, options: EditOptions = {}): string[] {
    const { record = true } = options
    const ids = getGroupElementIds(groupId)
    if (ids.length === 0) return []

    edit.update(ids, { group: null }, { record })
    return ids
  }

  function ungroupByElements(ids: string[], options: EditOptions = {}): string[] {
    const { record = true } = options
    const groups = getGroupsFromElementIds(ids)
    if (groups.size === 0) return []

    const affected = new Set<string>()
    for (const groupId of groups) {
      for (const id of getGroupElementIds(groupId)) {
        affected.add(id)
      }
    }

    const targetIds = element.orderElementIds(Array.from(affected))
    if (targetIds.length === 0) return []

    const shouldUpdate = targetIds.some(id => element.getElementById(id)?.group !== null)
    if (!shouldUpdate) return targetIds

    edit.update(targetIds, { group: null }, { record })
    return targetIds
  }

  return {
    selectedGroups,

    getGroupElements,
    getGroupElementIds,
    isInSameGroup,
    getGroupsFromElementIds: _getGroupsFromElementIds,
    resolveSelection,
    group,
    ungroup,
    ungroupByElements,
  }
}

export type GroupManager = ReturnType<typeof createGroupManager>
