import { generateId, type Point } from '@diagen/shared'
import { batch } from 'solid-js'
import { unwrapClone } from '../../_internal'
import { type DiagramElement, isLinker, isShape, type LinkerEndpoint, type EndpointTarget } from '../../model'
import type { EditManager } from './edit'
import { createInsertElementsCommand } from './edit/commands'
import type { ElementManager } from './element'
import type { GroupManager } from './group'
import { createCommand, type HistoryManager } from './history'
import type { SelectionManager } from './selection'

export interface ClipboardSnapshot {
  elements: DiagramElement[]
  orderedIds: string[]
  copiedAt: number
  sourceSelectionIds: string[]
}

interface ClipboardDeps {
  element: ElementManager
  selection: SelectionManager
  group: Pick<GroupManager, 'resolveSelection'>
  edit: Pick<EditManager, 'remove'>
  history: Pick<HistoryManager, 'execute'>
}

const DefaultPasteOffset = { x: 24, y: 24 } as const

interface ClipboardSource {
  elements: DiagramElement[]
  orderedIds: string[]
  sourceSelectionIds: string[]
}

function remapLinkerEndpoint(
  endpoint: LinkerEndpoint,
  sourceElementMap: Map<string, DiagramElement>,
  idMap: Map<string, string>,
  delta: Point,
): LinkerEndpoint {
  const binding = remapLinkerEndpointBinding(endpoint.binding, sourceElementMap, idMap)

  return {
    ...unwrapClone(endpoint),
    x: endpoint.x + delta.x,
    y: endpoint.y + delta.y,
    binding,
  }
}

function remapEndpointTarget(
  target: EndpointTarget,
  sourceElementMap: Map<string, DiagramElement>,
  idMap: Map<string, string>,
): EndpointTarget | null {
  if (target.kind === 'port') {
    const nextOwnerId = idMap.get(target.ownerId)
    if (!nextOwnerId) return null
    return {
      kind: 'port',
      ownerId: nextOwnerId,
      portId: target.portId,
    }
  }

  const sourceTarget = sourceElementMap.get(target.id)
  const nextId = idMap.get(target.id)
  if (!nextId || !sourceTarget || !isShape(sourceTarget)) return null

  return {
    kind: 'element',
    id: nextId,
  }
}

function remapLinkerEndpointBinding(
  binding: LinkerEndpoint['binding'],
  sourceElementMap: Map<string, DiagramElement>,
  idMap: Map<string, string>,
): LinkerEndpoint['binding'] {
  if (binding.type === 'free') return { type: 'free' }

  const nextTarget = remapEndpointTarget(binding.target, sourceElementMap, idMap)
  if (!nextTarget) return { type: 'free' }

  if (binding.type === 'fixed') {
    return {
      type: 'fixed',
      target: nextTarget,
      anchorId: binding.anchorId,
    }
  }

  return {
    type: 'perimeter',
    target: nextTarget,
    pathIndex: binding.pathIndex,
    segmentIndex: binding.segmentIndex,
    t: binding.t,
  }
}

function createClipboardCutCommand(deps: ClipboardDeps, ids: string[]) {
  const { edit, element, selection } = deps
  const snapshotElements = unwrapClone(element.elementMap())
  const snapshotOrderList = element.orderList().slice()
  const previousSelectionIds = selection.selectedIds().slice()

  return createCommand({
    name: 'clipboard_cut',
    execute() {
      edit.remove(ids, { record: false })
    },
    undo() {
      batch(() => {
        element.load(unwrapClone(snapshotElements), snapshotOrderList.slice())
        selection.replace(previousSelectionIds)
      })
    },
  })
}

export function createClipboardManager(deps: ClipboardDeps) {
  const { element, selection, group, edit, history } = deps
  let snapshot: ClipboardSnapshot | null = null
  let pasteCount = 0

  function resolveClipboardSource(ids?: string[]): ClipboardSource | null {
    const sourceSelectionIds = ids ?? selection.selectedIds()
    if (sourceSelectionIds.length === 0) return null

    const orderedIds = group.resolveSelection(sourceSelectionIds, { includeInternalLinkers: true })
    if (orderedIds.length === 0) return null

    const elements = element.getElementsByIds(orderedIds)
    if (elements.length === 0) return null

    return {
      elements,
      orderedIds,
      sourceSelectionIds,
    }
  }

  function createSnapshot(ids?: string[]): ClipboardSnapshot | null {
    const source = resolveClipboardSource(ids)
    if (!source) return null

    const elements = source.elements.map(element => unwrapClone(element))

    return {
      elements,
      orderedIds: source.orderedIds,
      copiedAt: Date.now(),
      sourceSelectionIds: source.sourceSelectionIds,
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

  function cloneElementsForPaste(sourceElements: DiagramElement[], delta: Point): DiagramElement[] {
    const idMap = createIdMap(sourceElements)
    const groupMap = createGroupMap(sourceElements)
    const sourceElementMap = new Map(sourceElements.map(element => [element.id, element] as const))

    return sourceElements.map(element => {
      const next = unwrapClone(element)
      next.id = idMap.get(element.id) ?? generateId(next.type)
      next.group = next.group ? (groupMap.get(next.group) ?? null) : null
      next.parent = next.parent ? (idMap.get(next.parent) ?? null) : null
      next.children = next.children.map(childId => idMap.get(childId)).filter(Boolean) as string[]

      if (isShape(next)) {
        next.props.x += delta.x
        next.props.y += delta.y
        return next
      }

      next.from = remapLinkerEndpoint(next.from, sourceElementMap, idMap, delta)
      next.to = remapLinkerEndpoint(next.to, sourceElementMap, idMap, delta)
      next.points = next.points.map(point => ({
        x: point.x + delta.x,
        y: point.y + delta.y,
      }))
      if (next.routePoints) {
        next.routePoints = next.routePoints.map(point => ({
          x: point.x + delta.x,
          y: point.y + delta.y,
        }))
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

    history.execute(createClipboardCutCommand(deps, nextSnapshot.orderedIds))
    return true
  }

  function paste(options: { offset?: Point } = {}): string[] {
    if (!snapshot) return []

    const delta = resolvePasteDelta(options.offset, pasteCount + 1)
    const pastedElements = cloneElementsForPaste(snapshot.elements, delta)
    const pastedIds = pastedElements.map(element => element.id)

    history.execute(
      createInsertElementsCommand(
        {
          element,
          selection,
        },
        {
          name: 'clipboard_paste',
          elements: pastedElements,
          options: {
            clone: false,
            select: true,
          },
        },
      ),
    )

    pasteCount += 1
    return pastedIds
  }

  function duplicate(ids?: string[]): string[] {
    const source = resolveClipboardSource(ids)
    if (!source) return []

    const duplicatedElements = cloneElementsForPaste(source.elements, { ...DefaultPasteOffset })
    const duplicatedIds = duplicatedElements.map(element => element.id)

    history.execute(
      createInsertElementsCommand(
        {
          element,
          selection,
        },
        {
          name: 'clipboard_duplicate',
          elements: duplicatedElements,
          options: {
            clone: false,
            select: true,
          },
        },
      ),
    )

    return duplicatedIds
  }

  function hasContent(): boolean {
    return snapshot !== null
  }

  function canPaste(): boolean {
    return hasContent()
  }

  function peek(): ClipboardSnapshot | null {
    return snapshot ? unwrapClone(snapshot) : null
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
