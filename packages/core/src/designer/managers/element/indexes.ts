import { createMemo, type Accessor } from 'solid-js'
import { isLinker, isShape, type DiagramElement, type LinkerElement, type ShapeElement } from '../../../model'

interface CreateElementIndexesOptions {
  getElementById: <T extends DiagramElement = DiagramElement>(id: string) => T | undefined
  getElementsByIds: (ids: string[]) => DiagramElement[]
  orderList: Accessor<string[]>
}

export function createElementIndexes(options: CreateElementIndexesOptions) {
  const elements = createMemo(() => options.getElementsByIds(options.orderList()))
  const elementCount = createMemo(() => elements().length)
  const shapes = createMemo(() => elements().filter(isShape) as ShapeElement[])
  const linkers = createMemo(() => elements().filter(isLinker) as LinkerElement[])
  const relatedLinkersByShapeId = createMemo(() => {
    const map = new Map<string, LinkerElement[]>()

    for (const linker of linkers()) {
      appendLinker(map, linker.from.id ?? null, linker)
      if (linker.to.id && linker.to.id !== linker.from.id) {
        appendLinker(map, linker.to.id, linker)
      }
    }

    return map
  })
  const groupElementIdsByGroupId = createMemo(() => {
    const map = new Map<string, string[]>()

    for (const id of options.orderList()) {
      const groupId = options.getElementById(id)?.group
      if (!groupId) continue

      const ids = map.get(groupId)
      if (ids) {
        ids.push(id)
      } else {
        map.set(groupId, [id])
      }
    }

    return map
  })

  function getRelatedLinkers(shapeId: string): LinkerElement[] {
    return relatedLinkersByShapeId().get(shapeId) ?? []
  }

  function getGroupElementIds(groupId: string): string[] {
    return groupId ? (groupElementIdsByGroupId().get(groupId) ?? []) : []
  }

  function orderElementIds(selectedIds: string[]): string[] {
    const selectedSet = new Set(selectedIds)
    const ordered = options.orderList().filter(id => selectedSet.has(id) && options.getElementById(id))
    if (ordered.length === selectedSet.size) return ordered

    const orderedSet = new Set(ordered)
    for (const id of selectedIds) {
      if (!options.getElementById(id) || orderedSet.has(id)) continue
      ordered.push(id)
      orderedSet.add(id)
    }

    return ordered
  }

  function getInternalLinkerIds(ids: string[]): string[] {
    if (ids.length === 0) return []

    const idsSet = new Set(ids)
    const linkerIds = new Set<string>()

    for (const id of idsSet) {
      for (const linker of getRelatedLinkers(id)) {
        const fromId = linker.from.id
        const toId = linker.to.id
        if (!!fromId && !!toId && idsSet.has(fromId) && idsSet.has(toId)) {
          linkerIds.add(linker.id)
        }
      }
    }

    return orderElementIds(Array.from(linkerIds))
  }

  return {
    elements,
    elementCount,
    shapes,
    linkers,
    getRelatedLinkers,
    getGroupElementIds,
    orderElementIds,
    getInternalLinkerIds,
  }
}

function appendLinker(map: Map<string, LinkerElement[]>, shapeId: string | null, linker: LinkerElement): void {
  if (!shapeId) return

  const linkers = map.get(shapeId)
  if (linkers) {
    linkers.push(linker)
  } else {
    map.set(shapeId, [linker])
  }
}
