import { generateId, type Point } from '@diagen/shared'
import { type DiagramElement, isLinker, isShape, type LinkerEndpoint } from '../../model'
import type { EditManager } from './edit'
import type { ElementManager } from './element'
import type { GroupManager } from './group'
import type { HistoryManager } from './history'
import type { SelectionManager } from './selection'

export interface ClipboardSnapshot {
  elements: DiagramElement[]
  orderedIds: string[]
  copiedAt: number
  sourceSelectionIds: string[]
}

interface ClipboardDeps {
  element: Pick<ElementManager, 'getElementsByIds'>
  selection: Pick<SelectionManager, 'selectedIds' | 'replace'>
  group: Pick<GroupManager, 'resolveSelectionForClipboard'>
  edit: Pick<EditManager, 'add' | 'remove'>
  history: Pick<HistoryManager, 'isInTransaction' | 'transaction'>
}

interface ClipboardPasteOptions {
  offset?: Point
}

const DefaultPasteOffset = { x: 24, y: 24 } as const

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

function offsetPoint(point: Point, delta: Point): Point {
  return {
    x: point.x + delta.x,
    y: point.y + delta.y,
  }
}

function remapLinkerEndpoint(endpoint: LinkerEndpoint, idMap: Map<string, string>, delta: Point): LinkerEndpoint {
  const nextId = endpoint.id ? idMap.get(endpoint.id) : null
  return {
    ...cloneData(endpoint),
    id: nextId ?? null,
    x: endpoint.x + delta.x,
    y: endpoint.y + delta.y,
    binding: nextId ? cloneData(endpoint.binding) : { type: 'free' },
  }
}

function runInTransaction(history: ClipboardDeps['history'], name: string, fn: () => void): void {
  if (history.isInTransaction()) {
    fn()
    return
  }

  const scope = history.transaction.createScope(name)
  if (!scope.begin()) {
    fn()
    return
  }

  try {
    fn()
    scope.commit()
  } catch (error) {
    scope.abort()
    throw error
  }
}

export function createClipboardManager(deps: ClipboardDeps) {
  let snapshot: ClipboardSnapshot | null = null
  let pasteCount = 0

  function resolveSourceSelection(ids?: string[]): string[] {
    return normalizeIds(ids ?? deps.selection.selectedIds())
  }

  function createSnapshot(ids?: string[]): ClipboardSnapshot | null {
    const sourceSelectionIds = resolveSourceSelection(ids)
    if (sourceSelectionIds.length === 0) return null

    const orderedIds = deps.group.resolveSelectionForClipboard(sourceSelectionIds)
    if (orderedIds.length === 0) return null

    const elements = deps.element.getElementsByIds(orderedIds).map(element => cloneData(element))
    if (elements.length === 0) return null

    return {
      elements,
      orderedIds,
      copiedAt: Date.now(),
      sourceSelectionIds,
    }
  }

  function createIdMap(elements: DiagramElement[]): Map<string, string> {
    const idMap = new Map<string, string>()
    for (const element of elements) {
      const prefix = isLinker(element) ? 'linker' : 'shape'
      idMap.set(element.id, generateId(prefix))
    }
    return idMap
  }

  function createGroupMap(elements: DiagramElement[]): Map<string, string> {
    const groupMap = new Map<string, string>()
    for (const element of elements) {
      if (!element.group || groupMap.has(element.group)) continue
      groupMap.set(element.group, generateId('group'))
    }
    return groupMap
  }

  function resolvePasteDelta(offset: Point | undefined, step: number): Point {
    const base = offset ?? DefaultPasteOffset
    return {
      x: base.x * step,
      y: base.y * step,
    }
  }

  function cloneElementsForPaste(source: ClipboardSnapshot, delta: Point): DiagramElement[] {
    const idMap = createIdMap(source.elements)
    const groupMap = createGroupMap(source.elements)

    return source.elements.map(element => {
      const next = cloneData(element)
      next.id = idMap.get(element.id) ?? generateId(next.type)
      next.group = next.group ? (groupMap.get(next.group) ?? null) : null
      next.parent = next.parent ? (idMap.get(next.parent) ?? null) : null
      next.children = next.children.map(childId => idMap.get(childId)).filter(Boolean) as string[]

      if (isShape(next)) {
        next.props.x += delta.x
        next.props.y += delta.y
        return next
      }

      next.from = remapLinkerEndpoint(next.from, idMap, delta)
      next.to = remapLinkerEndpoint(next.to, idMap, delta)
      next.points = next.points.map(point => offsetPoint(point, delta))
      if (next.routePoints) {
        next.routePoints = next.routePoints.map(point => offsetPoint(point, delta))
      }
      return next
    })
  }

  function copy(ids?: string[]): boolean {
    const nextSnapshot = createSnapshot(ids)
    if (!nextSnapshot) return false

    snapshot = nextSnapshot
    pasteCount = 0
    return true
  }

  function cut(ids?: string[]): boolean {
    const nextSnapshot = createSnapshot(ids)
    if (!nextSnapshot) return false

    snapshot = nextSnapshot
    pasteCount = 0

    runInTransaction(deps.history, 'clipboard_cut', () => {
      deps.edit.remove(nextSnapshot.orderedIds)
    })
    return true
  }

  function paste(options: ClipboardPasteOptions = {}): string[] {
    if (!snapshot) return []

    const delta = resolvePasteDelta(options.offset, pasteCount + 1)
    const pastedElements = cloneElementsForPaste(snapshot, delta)
    const pastedIds = pastedElements.map(element => element.id)

    runInTransaction(deps.history, 'clipboard_paste', () => {
      deps.edit.add(pastedElements, { record: true, select: false })
      deps.selection.replace(pastedIds)
    })

    pasteCount += 1
    return pastedIds
  }

  function duplicate(ids?: string[]): string[] {
    const nextSnapshot = createSnapshot(ids)
    if (!nextSnapshot) return []

    const duplicatedElements = cloneElementsForPaste(nextSnapshot, { ...DefaultPasteOffset })
    const duplicatedIds = duplicatedElements.map(element => element.id)

    runInTransaction(deps.history, 'clipboard_duplicate', () => {
      deps.edit.add(duplicatedElements, { record: true, select: false })
      deps.selection.replace(duplicatedIds)
    })

    return duplicatedIds
  }

  function hasContent(): boolean {
    return snapshot !== null
  }

  function canPaste(): boolean {
    return hasContent()
  }

  function peek(): ClipboardSnapshot | null {
    return snapshot ? cloneData(snapshot) : null
  }

  function clear(): void {
    snapshot = null
    pasteCount = 0
  }

  return {
    copy,
    cut,
    paste,
    duplicate,
    hasContent,
    canPaste,
    peek,
    clear,
  }
}

export type ClipboardManager = ReturnType<typeof createClipboardManager>
