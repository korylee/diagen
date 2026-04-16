import { boundsCenter, isBoundsInBounds, isPointInBounds, shallowEqual, type Bounds, type Point } from '@diagen/shared'
import { isContainerShape, type ShapeElement } from '../../../model'

export interface HierarchyParentUpdate {
  id: string
  parent: string | null
}

export interface HierarchyChildrenUpdate {
  id: string
  children: string[]
}

export interface ResolveParentingResult {
  parentUpdates: HierarchyParentUpdate[]
  childrenUpdates: HierarchyChildrenUpdate[]
}

export type ParentingContainment = 'center' | 'bounds'

export interface ResolveParentingOptions {
  shapes: ShapeElement[]
  targetIds: string[]
  getBounds: (shape: ShapeElement) => Bounds
  containment?: ParentingContainment
  canContain?: (parent: ShapeElement, child: ShapeElement) => boolean
  canBeContained?: (child: ShapeElement, parent: ShapeElement) => boolean
}

interface HierarchyContext {
  shapes: ShapeElement[]
  containers: ShapeElement[]
  shapeMap: Map<string, ShapeElement>
  orderMap: Map<string, number>
  draggedIds: Set<string>
  boundsMap: Map<string, Bounds>
  containment: ParentingContainment
  canContain?: ResolveParentingOptions['canContain']
  canBeContained?: ResolveParentingOptions['canBeContained']
}

function createHierarchyContext(options: ResolveParentingOptions): HierarchyContext {
  const shapeMap = new Map(options.shapes.map(shape => [shape.id, shape]))

  return {
    shapes: options.shapes,
    containers: options.shapes.filter(isContainerShape),
    shapeMap,
    orderMap: new Map(options.shapes.map((shape, index) => [shape.id, index])),
    draggedIds: new Set(options.targetIds.filter(id => shapeMap.has(id))),
    boundsMap: new Map(options.shapes.map(shape => [shape.id, options.getBounds(shape)])),
    containment: options.containment ?? 'center',
    canContain: options.canContain,
    canBeContained: options.canBeContained,
  }
}

function hasAncestor(
  shapeMap: Map<string, ShapeElement>,
  id: string,
  match: (parentId: string) => boolean,
): boolean {
  const visited = new Set<string>()
  let currentParentId = shapeMap.get(id)?.parent ?? null

  while (currentParentId && !visited.has(currentParentId)) {
    if (match(currentParentId)) return true
    visited.add(currentParentId)
    currentParentId = shapeMap.get(currentParentId)?.parent ?? null
  }

  return false
}

function isContainedInParent(
  context: HierarchyContext,
  targetBounds: Bounds,
  parentBounds: Bounds,
  point: Point,
): boolean {
  if (context.containment === 'bounds') {
    return isBoundsInBounds(targetBounds, parentBounds)
  }

  return isPointInBounds(point, parentBounds)
}

function findParentContainer(params: {
  shape: ShapeElement
  context: HierarchyContext
  bounds: Bounds
  point: Point
}): ShapeElement | null {
  const { shape, context, bounds, point } = params
  let matchedContainer: ShapeElement | null = null
  let matchedArea = Number.POSITIVE_INFINITY
  let matchedOrder = -1

  for (const container of context.containers) {
    if (container.id === shape.id) continue
    if (context.draggedIds.has(container.id)) continue
    if (hasAncestor(context.shapeMap, container.id, parentId => parentId === shape.id)) continue
    if (context.canContain && !context.canContain(container, shape)) continue
    if (context.canBeContained && !context.canBeContained(shape, container)) continue

    const parentBounds = context.boundsMap.get(container.id)
    if (!parentBounds || !isContainedInParent(context, bounds, parentBounds, point)) continue

    const area = parentBounds.w * parentBounds.h
    const order = context.orderMap.get(container.id) ?? -1
    if (area > matchedArea) continue
    if (area === matchedArea && order <= matchedOrder) continue

    matchedContainer = container
    matchedArea = area
    matchedOrder = order
  }

  return matchedContainer
}

function isInsideParent(
  context: HierarchyContext,
  parentId: string | null,
  targetBounds: Bounds,
  point: Point,
): boolean {
  if (!parentId) return false

  const parent = context.shapeMap.get(parentId)
  if (!parent || !isContainerShape(parent)) return false

  const bounds = context.boundsMap.get(parentId)
  return bounds ? isContainedInParent(context, targetBounds, bounds, point) : false
}

function resolveNextParentId(
  context: HierarchyContext,
  shape: ShapeElement,
  bounds: Bounds,
): string | null {
  const point = boundsCenter(bounds)
  const nextParent = findParentContainer({
    shape,
    context,
    bounds,
    point,
  })
  const currentParentId = shape.parent

  return nextParent?.id ?? (isInsideParent(context, currentParentId, bounds, point) ? currentParentId : null)
}

export function resolveParentPreview(options: ResolveParentingOptions): string | null {
  const context = createHierarchyContext(options)
  const topLevelTargetIds = options.targetIds.filter(
    id => context.shapeMap.has(id) && !hasAncestor(context.shapeMap, id, parentId => context.draggedIds.has(parentId)),
  )

  let previewParentId: string | null | undefined

  for (const id of topLevelTargetIds) {
    const shape = context.shapeMap.get(id)
    const bounds = context.boundsMap.get(id)
    if (!shape || !bounds) continue

    const nextParentId = resolveNextParentId(context, shape, bounds)
    if (previewParentId === undefined) {
      previewParentId = nextParentId
      continue
    }

    if (previewParentId !== nextParentId) {
      return null
    }
  }

  return previewParentId ?? null
}

function resolveChildrenUpdates(
  context: HierarchyContext,
  parentUpdates: HierarchyParentUpdate[],
): HierarchyChildrenUpdate[] {
  const nextChildrenMap = new Map<string, string[]>()
  const changedParentIds = new Set<string>()

  function getNextChildren(parentId: string): string[] {
    const cached = nextChildrenMap.get(parentId)
    if (cached) return cached

    const parent = context.shapeMap.get(parentId)
    const nextChildren = parent ? [...parent.children] : []
    nextChildrenMap.set(parentId, nextChildren)
    return nextChildren
  }

  for (const update of parentUpdates) {
    const shape = context.shapeMap.get(update.id)
    if (!shape) continue

    if (shape.parent) {
      const currentChildren = getNextChildren(shape.parent)
      const nextChildren = currentChildren.filter(childId => childId !== shape.id)
      nextChildrenMap.set(shape.parent, nextChildren)
      changedParentIds.add(shape.parent)
    }

    if (update.parent) {
      const currentChildren = getNextChildren(update.parent)
      const nextChildren = currentChildren.includes(shape.id) ? currentChildren : [...currentChildren, shape.id]
      nextChildrenMap.set(update.parent, nextChildren)
      changedParentIds.add(update.parent)
    }
  }

  const childrenUpdates: HierarchyChildrenUpdate[] = []

  for (const id of changedParentIds) {
    const shape = context.shapeMap.get(id)
    if (!shape) continue

    const nextChildren = nextChildrenMap.get(id) ?? shape.children
    if (shallowEqual(shape.children, nextChildren)) continue

    childrenUpdates.push({
      id,
      children: nextChildren,
    })
  }

  return childrenUpdates
}

export function resolveParenting(options: ResolveParentingOptions): ResolveParentingResult {
  const context = createHierarchyContext(options)
  const topLevelTargetIds = options.targetIds.filter(
    id => context.shapeMap.has(id) && !hasAncestor(context.shapeMap, id, parentId => context.draggedIds.has(parentId)),
  )
  const parentUpdates: HierarchyParentUpdate[] = []

  for (const id of topLevelTargetIds) {
    const shape = context.shapeMap.get(id)
    const bounds = context.boundsMap.get(id)
    if (!shape || !bounds) continue

    const currentParentId = shape.parent
    const nextParentId = resolveNextParentId(context, shape, bounds)

    if (nextParentId === currentParentId) continue

    parentUpdates.push({
      id,
      parent: nextParentId,
    })
  }

  if (parentUpdates.length === 0) {
    return {
      parentUpdates: [],
      childrenUpdates: [],
    }
  }

  return {
    parentUpdates,
    childrenUpdates: resolveChildrenUpdates(context, parentUpdates),
  }
}
