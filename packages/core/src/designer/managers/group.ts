import { generateId } from '@diagen/shared'
import { isLinker, type DiagramElement } from '../../model'
import type { EditManager, EditOptions } from './edit'
import type { DesignerContext } from './types'

interface CreateGroupManagerDeps {
  edit: Pick<EditManager, 'update'>
}

export interface GroupOptions extends EditOptions {
  groupId?: string
}

interface GroupContext {
  elements: Record<string, DiagramElement>
  orderList: string[]
}

export interface ResolveGroupSelectionOptions {
  /** 是否附带内部连线（两端端点都在当前选择集中） */
  includeInternalLinkers?: boolean
}

/**
 * 获取元素集合中出现过的分组 ID。
 */
function getGroupsFromElementIds(ids: string[], ctx: GroupContext): Set<string> {
  const groups = new Set<string>()
  for (const id of ids) {
    const el = ctx.elements[id]
    if (el?.group) {
      groups.add(el.group)
    }
  }
  return groups
}

/**
 * 以 diagram 的 orderList 为基准输出稳定顺序，并过滤无效元素。
 */
function orderIdsByDiagram(selectedIds: Set<string>, ctx: GroupContext): string[] {
  const ordered = ctx.orderList.filter(id => selectedIds.has(id) && !!ctx.elements[id])
  if (ordered.length === selectedIds.size) return ordered

  const orderedSet = new Set(ordered)
  for (const id of selectedIds) {
    if (!ctx.elements[id] || orderedSet.has(id)) continue
    ordered.push(id)
  }
  return ordered
}

/**
 * 归一化输入 ID：
 * - 去重
 * - 仅保留存在元素
 * - 顺序与 orderList 对齐
 */
function normalizeExistingIds(ids: string[], ctx: GroupContext): string[] {
  const selected = new Set<string>()
  for (const id of ids) {
    if (ctx.elements[id]) {
      selected.add(id)
    }
  }
  return orderIdsByDiagram(selected, ctx)
}

/**
 * 判断一组元素是否属于同一分组。
 */
function areElementsInSameGroup(ids: string[], ctx: GroupContext): boolean {
  if (ids.length < 2) return false

  const first = ctx.elements[ids[0]]
  if (!first?.group) return false

  const groupId = first.group
  for (const id of ids) {
    const el = ctx.elements[id]
    if (!el || el.group !== groupId) return false
  }
  return true
}

/**
 * 获取分组成员 ID（按 orderList 顺序）。
 */
function getGroupMemberIds(groupId: string, ctx: GroupContext): string[] {
  if (!groupId) return []
  return ctx.orderList.filter(id => ctx.elements[id]?.group === groupId)
}

/**
 * 获取分组成员元素（按 orderList 顺序）。
 */
function getGroupMembers(groupId: string, ctx: GroupContext): DiagramElement[] {
  return getGroupMemberIds(groupId, ctx)
    .map(id => ctx.elements[id])
    .filter(Boolean)
}

/**
 * 按 group 进行选择闭包展开：
 * - 若选中某个组内元素，则自动补齐该组所有成员
 * - 输出顺序稳定为 orderList（便于后续 Clipboard 保持层级）
 */
function expandElementIdsByGroups(ids: string[], ctx: GroupContext): string[] {
  const selected = new Set<string>()
  for (const id of ids) {
    if (ctx.elements[id]) selected.add(id)
  }

  const groups = getGroupsFromElementIds(Array.from(selected), ctx)
  for (const groupId of groups) {
    const members = getGroupMemberIds(groupId, ctx)
    for (const memberId of members) {
      selected.add(memberId)
    }
  }
  return orderIdsByDiagram(selected, ctx)
}

/**
 * 收集内部连线：
 * - 仅返回 linker
 * - from.id / to.id 都在选中集合中
 * - 按 orderList 顺序输出
 */
function collectInternalLinkerIds(selectedIds: string[], ctx: GroupContext): string[] {
  const selectedSet = new Set(selectedIds)
  return ctx.orderList.filter(id => {
    const el = ctx.elements[id]
    if (!el || !isLinker(el)) return false
    const fromId = el.from.id
    const toId = el.to.id
    return !!fromId && !!toId && selectedSet.has(fromId) && selectedSet.has(toId)
  })
}

/**
 * 为 Clipboard 准备的 group-aware 选择解析：
 * 1. 先按 group 展开
 * 2. 可选追加内部连线
 */
function resolveGroupSelection(ids: string[], ctx: GroupContext, options: ResolveGroupSelectionOptions = {}): string[] {
  const expanded = expandElementIdsByGroups(ids, ctx)
  if (!options.includeInternalLinkers) return expanded

  const merged = new Set(expanded)
  const linkerIds = collectInternalLinkerIds(expanded, ctx)
  for (const linkerId of linkerIds) {
    merged.add(linkerId)
  }
  return orderIdsByDiagram(merged, ctx)
}

/**
 * 分组管理器：
 * - 负责 group 语义查询（同组判断、展开、clipboard 选择解析）
 * - 负责 group 写操作（group/ungroup），并统一走 edit/history 机制
 */
export function createGroupManager(ctx: DesignerContext, deps: CreateGroupManagerDeps) {
  const { state } = ctx
  const { edit } = deps

  const context = (): GroupContext => ({
    elements: state.diagram.elements,
    orderList: state.diagram.orderList,
  })

  function getGroupShapes(groupId: string): DiagramElement[] {
    return getGroupMembers(groupId, context())
  }

  function getMemberIds(groupId: string): string[] {
    return getGroupMemberIds(groupId, context())
  }

  function isInSameGroup(ids: string[]): boolean {
    return areElementsInSameGroup(ids, context())
  }

  function getGroupsFromElements(ids: string[]): Set<string> {
    return getGroupsFromElementIds(ids, context())
  }

  function expandSelectionToGroups(ids: string[]): string[] {
    return expandElementIdsByGroups(ids, context())
  }

  function resolveSelection(ids: string[], options: ResolveGroupSelectionOptions = {}): string[] {
    return resolveGroupSelection(ids, context(), options)
  }

  function resolveSelectionForClipboard(ids: string[]): string[] {
    return resolveSelection(ids, { includeInternalLinkers: true })
  }

  function group(ids: string[], options: GroupOptions = {}): string | null {
    const { record = true } = options
    const current = context()
    const targetIds = normalizeExistingIds(ids, current)
    if (targetIds.length < 2) return null

    const groupId = options.groupId ?? generateId('group')
    const shouldUpdate = targetIds.some(id => current.elements[id]?.group !== groupId)
    if (!shouldUpdate) return groupId

    edit.update(targetIds, { group: groupId }, { record })
    return groupId
  }

  function ungroup(groupId: string, options: EditOptions = {}): string[] {
    const { record = true } = options
    const ids = getMemberIds(groupId)
    if (ids.length === 0) return []

    edit.update(ids, { group: null }, { record })
    return ids
  }

  function ungroupByElements(ids: string[], options: EditOptions = {}): string[] {
    const { record = true } = options
    const current = context()
    const groups = getGroupsFromElements(ids)
    if (groups.size === 0) return []

    const affected = new Set<string>()
    for (const groupId of groups) {
      for (const id of getMemberIds(groupId)) {
        affected.add(id)
      }
    }

    const targetIds = orderIdsByDiagram(affected, current)
    if (targetIds.length === 0) return []

    const shouldUpdate = targetIds.some(id => current.elements[id]?.group !== null)
    if (!shouldUpdate) return targetIds

    edit.update(targetIds, { group: null }, { record })
    return targetIds
  }

  return {
    getGroupShapes,
    getGroupMemberIds: getMemberIds,
    isInSameGroup,
    getGroupsFromElements,
    expandSelectionToGroups,
    resolveSelection,
    resolveSelectionForClipboard,
    group,
    ungroup,
    ungroupByElements,
  }
}

export type GroupManager = ReturnType<typeof createGroupManager>
